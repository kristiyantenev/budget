import { memoryAdapter } from "better-auth/adapters/memory";
import { type TestHelpers, testUtils } from "better-auth/plugins";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { afterAll, afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { randomUUID } from "node:crypto";
import * as schema from "../../drizzle/schema";
import { createAuth } from "./create-auth";

const {
  BETTER_AUTH_URL: baseURL,
  BETTER_AUTH_SECRET: secret,
  BUDGET_OIDC_ISSUER: issuer,
  BUDGET_OIDC_CLIENT_ID: clientId,
  BUDGET_OIDC_CLIENT_SECRET: clientSecret,
} = process.env;

if (!baseURL) throw new Error("Missing test environment variable: BETTER_AUTH_URL");

if (!secret) throw new Error("Missing test environment variable: BETTER_AUTH_SECRET");

if (!issuer) throw new Error("Missing test environment variable: BUDGET_OIDC_ISSUER");

if (!clientId) throw new Error("Missing test environment variable: BUDGET_OIDC_CLIENT_ID");

if (!clientSecret) throw new Error("Missing test environment variable: BUDGET_OIDC_CLIENT_SECRET");

const config = { baseURL, secret, issuer, clientId, clientSecret };

const pool = new Pool();

const db = drizzle({ client: pool, schema });

afterAll(() => pool.end());

afterEach(() => vi.useRealTimers());

describe("createAuth", () => {
  test("configuration overrides preserve the verified-login guard by default", async () => {
    const auth = createAuth(config, db, {
      plugins: [],
      database: memoryAdapter({
        user: [],
        session: [],
        account: [],
        verification: [],
      }),
    });

    const context = await auth.$context;

    expect(context).not.toHaveProperty("test");

    const user = await context.internalAdapter.createUser(
      { name: "Test person", email: "person@example.test" },
      { method: "test" },
    );

    await expect(context.internalAdapter.createSession(user.id)).rejects.toThrow(
      "A verified Keycloak login is required",
    );
  });

  test("options create usable sessions through the same restricted handler", async () => {
    const auth = createAuth(config, db, {
      plugins: [testUtils()],
      // Factory behavior needs only a standard Better Auth session.
      session: { updateAge: 0, cookieCache: { enabled: false } },
      databaseHooks: {},
      database: memoryAdapter({
        user: [],
        session: [],
        account: [],
        verification: [],
      }),
    });

    const { test: helpers } = await auth.$context;

    const user = await helpers.saveUser(helpers.createUser());

    try {
      const { session, headers } = await helpers.login({ userId: user.id });

      const result = await auth.api.getSession({ headers });

      expect(result?.session.id).toBe(session.id);
      expect(result?.user.name).toBe(user.name);

      const blocked = await auth.handler(
        new Request(`${config.baseURL}/api/auth/get-access-token`, {
          method: "POST",
          headers,
        }),
      );

      expect(blocked.status).toBe(404);
    } finally {
      await helpers.deleteUser(user.id);
    }
  });
});

describe("createAuth.handler", () => {
  const oauthTokens = {
    accessToken: randomUUID(),
    refreshToken: randomUUID(),
    idToken: randomUUID(),
  };

  let auth: ReturnType<typeof createAuth<[ReturnType<typeof testUtils>]>>;

  let helpers: TestHelpers;

  beforeEach(async () => {
    auth = createAuth(config, db, {
      plugins: [testUtils()],
      database: memoryAdapter({
        user: [],
        session: [],
        account: [],
        verification: [],
      }),
      // Better Auth 1.7.1 helpers cannot supply additional session fields.
      // Only this fixture replaces the verified-login hook with synthetic SSO data.
      databaseHooks: {
        session: {
          create: {
            before: async (session) => {
              const expiresAt = new Date(Date.now() + 300_000);

              return {
                data: {
                  ...session,
                  id: randomUUID(),
                  subject: `test-principal-${session.userId}`,
                  ...oauthTokens,
                  accessTokenExpiresAt: expiresAt,
                  refreshTokenExpiresAt: expiresAt,
                  idTokenExpiresAt: expiresAt,
                },
              };
            },
          },
        },
      },
    });

    helpers = (await auth.$context).test;
  });

  async function createSession() {
    const user = await helpers.saveUser(helpers.createUser());

    return helpers.login({ userId: user.id });
  }

  test("browser callers cannot read tokens or use Better Auth's local revocation endpoints", async () => {
    const { headers } = await createSession();

    for (const path of [
      "get-session",
      "maintain-session",
      "get-access-token",
      "refresh-token",
      "revoke-session",
      "revoke-sessions",
      "revoke-other-sessions",
      "sign-out",
      "list-sessions",
      "list-accounts",
    ]) {
      const response = await auth.handler(
        new Request(`${baseURL}/api/auth/${path}`, {
          method: path.startsWith("list-") || path.endsWith("session") ? "GET" : "POST",
          headers: {
            cookie: headers.get("cookie") ?? "",
            origin: baseURL,
            "content-type": "application/json",
          },
          body:
            path.startsWith("list-") || path.endsWith("session")
              ? undefined
              : JSON.stringify({ providerId: "keycloak" }),
        }),
      );

      expect(response.status, path).toBe(404);
    }
  });

  test.each([baseURL, "https://elsewhere.example"])(
    "the removed HTTP sign-in entry refuses requests from %s",
    async (origin) => {
      const response = await auth.handler(
        new Request(`${baseURL}/api/auth/sign-in/social`, {
          method: "POST",
          headers: { "content-type": "application/json", origin },
          body: JSON.stringify({ provider: "keycloak", callbackURL: "/" }),
        }),
      );

      expect(response.status).toBe(404);
      expect(response.headers.getSetCookie()).toHaveLength(0);
    },
  );

  test("server session reads do not independently slide the expiry", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const startedAt = Date.now();
    const { session, headers, token } = await createSession();
    vi.setSystemTime(startedAt + 24 * 60 * 60 * 1000);

    const result = await auth.api.getSession({ headers, returnHeaders: true });

    expect(result.response?.session.expiresAt).toEqual(session.expiresAt);
    expect(result.headers.getSetCookie()).toHaveLength(0);

    const stored = await (await auth.$context).internalAdapter.findSession(token);

    expect(stored?.session.expiresAt).toEqual(session.expiresAt);
  });

  test.each(["", "better-auth.session_token=forged-session-reference"])(
    "server reads reject a missing or forged cookie: %s",
    async (cookie) => {
      const result = await auth.api.getSession({
        headers: new Headers({ cookie }),
      });

      expect(result).toBeNull();
    },
  );
});
