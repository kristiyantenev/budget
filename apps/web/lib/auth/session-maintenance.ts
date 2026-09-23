import "server-only";
import { type AuthEndpoint, createAuthEndpoint } from "better-auth/api";
import { expireCookie } from "better-auth/cookies";
import { type createSessionRefresher, SessionEnded } from "./refresh-session";

type SessionMaintenance = {
  id: "session-maintenance";
  endpoints: {
    maintainSession: AuthEndpoint<
      "/maintain-session",
      { method: "GET"; requireHeaders: true },
      Response | { active: boolean } | null
    >;
  };
};

export function sessionMaintenance(
  refresh: ReturnType<typeof createSessionRefresher>,
): SessionMaintenance {
  return {
    id: "session-maintenance",
    endpoints: {
      maintainSession: createAuthEndpoint(
        "/maintain-session",
        {
          method: "GET",
          requireHeaders: true,
        },
        async (ctx) => {
          const cookie = ctx.context.authCookies.sessionToken;

          const token = await ctx.getSignedCookie(cookie.name, ctx.context.secret);

          ctx.setHeader("cache-control", "private, no-store");

          if (!token) return ctx.json(null);

          try {
            const stored = await refresh(token);

            // Reissue the opaque reference with the persisted absolute expiry.
            // Reading a page does not independently extend the Keycloak idle window.
            await ctx.setSignedCookie(cookie.name, stored.token, ctx.context.secret, {
              ...cookie.attributes,
              expires: stored.expiresAt,
              maxAge: Math.max(0, Math.floor((stored.expiresAt.getTime() - Date.now()) / 1000)),
            });

            return ctx.json({ active: true });
          } catch (error) {
            if (error instanceof SessionEnded) {
              expireCookie(ctx, cookie);

              return ctx.json(null);
            }

            return new Response(null, {
              status: 503,
              headers: { "cache-control": "private, no-store" },
            });
          }
        },
      ),
    },
  };
}
