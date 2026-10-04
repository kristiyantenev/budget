import "server-only";
import { eq } from "drizzle-orm";
import { decodeJwt } from "jose";
import { z } from "zod";
import { session } from "@/drizzle/schema";
import type { AuthConfig } from "./create-auth";
import type { sessionAdapter } from "./session-adapter";

const discovery = z.object({ issuer: z.string(), token_endpoint: z.url() });

const tokenResponse = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1),
  expires_in: z.number().positive(),
  refresh_expires_in: z.number().positive(),
  token_type: z.string().refine((value) => value.toLowerCase() === "bearer"),
  id_token: z.string().optional(),
});

const idClaims = z.object({
  sub: z.string(),
  sid: z.string(),
  exp: z.number(),
});

export class SessionEnded extends Error {
  constructor() {
    super("The session has ended");
  }
}

export class SessionUnavailable extends Error {
  constructor() {
    super("Session maintenance is temporarily unavailable");
  }
}

export function createSessionRefresher(
  database: Parameters<typeof sessionAdapter>[0],
  config: AuthConfig,
) {
  let tokenEndpoint: string | undefined;

  async function discoverTokenEndpoint() {
    if (tokenEndpoint) return tokenEndpoint;

    const response = await fetch(`${config.issuer}/.well-known/openid-configuration`, {
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
      redirect: "error",
    });

    if (!response.ok) throw new SessionUnavailable();

    const metadata = discovery.parse(await response.json());

    if (metadata.issuer !== config.issuer) throw new SessionUnavailable();

    tokenEndpoint = metadata.token_endpoint;

    return tokenEndpoint;
  }

  // ADR-40: one routine refreshes for the proxy and the API module. refusedAccessToken carries the
  // API's 401 retry (ADR-31).
  return async function refreshSession(token: string, refusedAccessToken?: string) {
    let rotated = false;

    function isCurrent(stored: typeof session.$inferSelect) {
      const now = Date.now();

      if (stored.expiresAt.getTime() <= now || stored.refreshTokenExpiresAt.getTime() <= now) {
        throw new SessionEnded();
      }

      return (
        stored.accessTokenExpiresAt.getTime() > now + 30_000 &&
        stored.accessToken !== refusedAccessToken
      );
    }

    try {
      const [current] = await database.select().from(session).where(eq(session.token, token));

      if (!current) throw new SessionEnded();

      if (isCurrent(current)) return current;

      return await database.transaction(async (transaction) => {
        // ADR-20: reread under the lock so concurrent requests share one refresh.
        const [stored] = await transaction
          .select()
          .from(session)
          .where(eq(session.token, token))
          .for("update");

        if (!stored) throw new SessionEnded();

        if (isCurrent(stored)) return stored;

        const endpoint = await discoverTokenEndpoint();

        const requestedAt = Date.now();

        const response = await fetch(endpoint, {
          method: "POST",
          cache: "no-store",
          redirect: "error",
          signal: AbortSignal.timeout(10_000),
          headers: { "content-type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: stored.refreshToken,
            client_id: config.clientId,
            client_secret: config.clientSecret,
          }),
        });

        if (!response.ok) {
          const failure = z.object({ error: z.string() }).safeParse(await response.json());

          if (failure.success && failure.data.error === "invalid_grant") throw new SessionEnded();

          throw new SessionUnavailable();
        }

        // A successful response may already have retired the stored refresh token.
        rotated = true;
        const tokens = tokenResponse.parse(await response.json());

        const claims = tokens.id_token ? idClaims.parse(decodeJwt(tokens.id_token)) : null;

        // These claims arrive directly from the trusted token endpoint over TLS.
        if (claims && (claims.sub !== stored.subject || claims.sid !== stored.id))
          throw new SessionEnded();

        const expiresAt = new Date(
          requestedAt + Math.min(tokens.refresh_expires_in, 30 * 24 * 60 * 60) * 1000,
        );

        const [updated] = await transaction
          .update(session)
          .set({
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            accessTokenExpiresAt: new Date(requestedAt + tokens.expires_in * 1000),
            refreshTokenExpiresAt: new Date(requestedAt + tokens.refresh_expires_in * 1000),
            idToken: tokens.id_token ?? stored.idToken,
            idTokenExpiresAt: claims ? new Date(claims.exp * 1000) : stored.idTokenExpiresAt,
            expiresAt,
            updatedAt: new Date(),
          })
          .where(eq(session.token, token))
          .returning();

        if (!updated) throw new SessionEnded();

        return updated;
      });
    } catch (error) {
      // ADR-40: never retry a token retired before a failed database commit.
      // Keep the row for replacement by a fresh authorization-code exchange.
      if (rotated || error instanceof SessionEnded) throw new SessionEnded();

      // Provider and database errors can contain credentials. Do not propagate them.
      throw new SessionUnavailable();
    }
  };
}
