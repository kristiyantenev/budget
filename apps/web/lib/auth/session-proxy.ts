import "server-only";
import { parseSetCookieHeader, toCookieOptions } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";
import type { createAuth } from "./create-auth";

type SessionAuth = {
  api: Pick<ReturnType<typeof createAuth<[]>>["api"], "maintainSession" | "signInSocial">;
  $context: Promise<Pick<Awaited<ReturnType<typeof createAuth<[]>>["$context"]>, "authCookies">>;
};

function copyCookies(source: Headers, response: NextResponse) {
  for (const header of source.getSetCookie()) {
    for (const [name, cookie] of parseSetCookieHeader(header)) {
      response.cookies.set(name, cookie.value, toCookieOptions(cookie));
    }
  }
}

export function createSessionProxy(auth: SessionAuth, baseURL: string) {
  return async function sessionProxy(request: NextRequest) {
    const path = request.nextUrl.pathname;

    if (path === "/sign-in" || path.startsWith("/api/auth/")) {
      return NextResponse.next();
    }

    // The proxy maintains sessions before rendering; the data layer still
    // verifies access. See the proxy-session-maintenance draft in docs/DECISIONS.md.
    const maintenance = await auth.api.maintainSession({
      headers: request.headers,
      asResponse: true,
    });

    if (!maintenance.ok) {
      return new NextResponse("Please try again shortly.", {
        status: 503,
        headers: { "cache-control": "private, no-store" },
      });
    }

    const active = await maintenance.json();
    let response: NextResponse;

    if (active) {
      response = NextResponse.next();
    } else {
      const returnTo = `${path}${request.nextUrl.search}`;
      const callback = new URL(baseURL);
      callback.pathname = path;
      callback.search = request.nextUrl.search;
      const signIn = new URL("/sign-in", baseURL);
      signIn.searchParams.set("returnTo", returnTo);

      // ADR-34: recover once through SSO, and never replay a failed mutation.
      const hadSession = request.cookies.has((await auth.$context).authCookies.sessionToken.name);

      if (hadSession) signIn.searchParams.set("reason", "expired");

      if (hadSession && !request.cookies.has("budget.session-recovery")) {
        const login = await auth.api.signInSocial({
          headers: request.headers,
          returnHeaders: true,
          body: {
            provider: "keycloak",
            callbackURL: callback.toString(),
            errorCallbackURL: signIn.toString(),
            additionalParams: { prompt: "none" },
          },
        });

        response = NextResponse.redirect(login.response.url ?? signIn, 303);
        copyCookies(login.headers, response);
        response.cookies.set("budget.session-recovery", "1", {
          httpOnly: true,
          secure: new URL(baseURL).protocol === "https:",
          sameSite: "lax",
          path: "/",
          maxAge: 60,
        });
      } else {
        response = NextResponse.redirect(signIn, 303);
      }
    }

    copyCookies(maintenance.headers, response);
    response.headers.set("cache-control", "private, no-store");

    return response;
  };
}
