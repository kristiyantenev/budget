import "server-only";
import type { BetterAuthPlugin } from "better-auth";
import { type BetterAuthOptions, betterAuth } from "better-auth/minimal";
import { nextCookies } from "better-auth/next-js";
import { genericOAuth } from "better-auth/plugins";
import { decodeJwt } from "jose";
import { z } from "zod";
import { AsyncLocalStorage } from "node:async_hooks";
import { createSessionRefresher } from "./refresh-session";
import { sessionAdapter } from "./session-adapter";
import { sessionMaintenance } from "./session-maintenance";

const keycloakSessionClaims = z.object({
  sid: z.string().regex(/\S/),
  sub: z.string().min(1),
  exp: z.number(),
});

const refreshLifetime = z.number().positive();

const hidden = {
  type: "string",
  input: false,
  returned: false,
  required: true,
} as const;

const hiddenDate = { ...hidden, type: "date" } as const;

const discoveryRetryInterval = 30_000;

// ADR-21, ADR-24: accounts link identities; each sid owns its credentials.
const accountWithoutCredentials = {
  accessToken: null,
  refreshToken: null,
  idToken: null,
  accessTokenExpiresAt: null,
  refreshTokenExpiresAt: null,
  scope: null,
  password: null,
};

export type AuthConfig = {
  baseURL: string;
  secret: string;
  issuer: string;
  clientId: string;
  clientSecret: string;
};

type AuthOptions<Plugins extends BetterAuthPlugin[]> = Omit<BetterAuthOptions, "plugins"> & {
  plugins:
    | [...Plugins, ReturnType<typeof sessionMaintenance>, ReturnType<typeof nextCookies>]
    | [
        ReturnType<typeof genericOAuth>,
        ReturnType<typeof sessionMaintenance>,
        ReturnType<typeof nextCookies>,
      ];
};

export function createAuth<const Plugins extends BetterAuthPlugin[] = []>(
  config: AuthConfig,
  database: Parameters<typeof sessionAdapter>[0],
  options: Omit<BetterAuthOptions, "plugins"> & { plugins?: Plugins } = {},
): ReturnType<typeof betterAuth<AuthOptions<Plugins>>> {
  const login = new AsyncLocalStorage<{
    session?: {
      id: string;
      subject: string;
      accessToken: string;
      refreshToken: string;
      idToken: string;
      accessTokenExpiresAt: Date;
      refreshTokenExpiresAt: Date;
      idTokenExpiresAt: Date;
    };
  }>();

  let discovery: "pending" | "succeeded" | "failed" = "pending";
  let retryAt = 0;

  // ADR-24: Better Auth checks the ID token issuer against discovery, so discovery must name ours.
  function keycloakProvider() {
    const plugin = genericOAuth({
      config: [
        {
          providerId: "keycloak",
          discoveryUrl: `${config.issuer}/.well-known/openid-configuration`,
          clientId: config.clientId,
          clientSecret: config.clientSecret,
          pkce: true,
          requireIdTokenVerification: true,
          scopes: ["openid", "profile", "email", "budget"],
          accountSubject: ({ tokens }) => {
            // Better Auth verifies signature, issuer, audience and nonce before calling this hook.
            if (
              !tokens.idToken ||
              !tokens.accessToken ||
              !tokens.refreshToken ||
              !tokens.accessTokenExpiresAt
            ) {
              throw new Error("Incomplete Keycloak token response");
            }

            const claims = keycloakSessionClaims.parse(decodeJwt(tokens.idToken));

            const refreshExpiresIn = refreshLifetime.parse(tokens.raw?.refresh_expires_in);

            const refreshTokenExpiresAt = new Date(Date.now() + refreshExpiresIn * 1000);

            const context = login.getStore();

            if (!context) {
              throw new Error("Incomplete Keycloak session claims");
            }

            // ADR-20, ADR-21: each SSO session holds its own token pair, keyed by sid.
            context.session = {
              id: claims.sid,
              subject: claims.sub,
              accessToken: tokens.accessToken,
              refreshToken: tokens.refreshToken,
              idToken: tokens.idToken,
              accessTokenExpiresAt: tokens.accessTokenExpiresAt,
              refreshTokenExpiresAt,
              idTokenExpiresAt: new Date(claims.exp * 1000),
            };

            return claims.sub;
          },
        },
      ],
    });

    return {
      ...plugin,
      init: async (ctx: Parameters<typeof plugin.init>[0]) => {
        const result = await plugin.init(ctx);
        const providers = result.context.socialProviders.filter(
          (provider) => provider.id !== "keycloak" || provider.issuer === config.issuer,
        );

        if (providers.some((provider) => provider.id === "keycloak")) {
          discovery = "succeeded";
        } else {
          discovery = "failed";
          retryAt = Date.now() + discoveryRetryInterval;
          console.error("Keycloak discovery failed; sign-in is unavailable until it succeeds");
        }

        return { context: { socialProviders: providers } };
      },
    };
  }

  // ADR-19, ADR-24: Next is the relying party; Keycloak owns identity.
  const authOptions: AuthOptions<Plugins> = {
    database: sessionAdapter(database),
    baseURL: config.baseURL,
    secret: config.secret,
    // ADR-20: provider and database errors can contain tokens or session identifiers.
    logger: { disabled: true },
    onAPIError: {
      onError: () => {
        console.error("Authentication request failed");
      },
    },
    // ADR-20, ADR-22: every read goes to Postgres. The proxy owns renewal.
    session: {
      expiresIn: 30 * 24 * 60 * 60,
      disableSessionRefresh: true,
      cookieCache: { enabled: false },
      additionalFields: {
        subject: hidden,
        accessToken: hidden,
        refreshToken: hidden,
        idToken: hidden,
        accessTokenExpiresAt: hiddenDate,
        refreshTokenExpiresAt: hiddenDate,
        idTokenExpiresAt: hiddenDate,
      },
    },
    account: {
      accountLinking: { enabled: false },
      additionalFields: {
        issuer: { ...hidden, defaultValue: config.issuer },
      },
    },
    databaseHooks: {
      account: {
        create: {
          before: async (account) => ({
            data: { ...account, ...accountWithoutCredentials, issuer: config.issuer },
          }),
        },
        update: {
          before: async (account) => ({ data: { ...account, ...accountWithoutCredentials } }),
        },
      },
      session: {
        create: {
          before: async (session) => {
            const tokens = login.getStore()?.session;

            if (!tokens) throw new Error("A verified Keycloak login is required");

            return {
              data: {
                ...session,
                ...tokens,
                expiresAt: new Date(
                  Math.min(session.expiresAt.getTime(), tokens.refreshTokenExpiresAt.getTime()),
                ),
              },
            };
          },
        },
      },
    },
    // Options replace top-level defaults, including the provider plugins.
    ...options,
    plugins: [
      ...(options.plugins ?? [keycloakProvider()]),
      sessionMaintenance(createSessionRefresher(database, config)),
      nextCookies(),
    ] as const,
  };

  let auth: ReturnType<typeof betterAuth<typeof authOptions>> = betterAuth(authOptions);

  // ADR-32: Better Auth discovers once per instance and drops a provider it could not discover,
  // so a Keycloak outage at start would break sign-in until restart. Rebuild until it succeeds.
  function current() {
    if (discovery === "failed" && Date.now() >= retryAt) {
      discovery = "pending";
      auth = betterAuth(authOptions);
    }

    return auth;
  }

  const handler = async (request: Request) => {
    const path = new URL(request.url).pathname;

    // ADR-21, ADR-40: no local revocation, token reads, or library-driven refresh over HTTP.
    if (request.method !== "GET" || path !== "/api/auth/callback/keycloak") {
      return new Response(null, { status: 404 });
    }

    const response = await login.run({}, () => current().handler(request));
    response.headers.set("cache-control", "no-store");

    return response;
  };

  const instance: typeof auth = {
    ...auth,
    get api() {
      return current().api;
    },
    get $context() {
      return current().$context;
    },
    handler,
    fetch: handler,
  };

  return instance;
}
