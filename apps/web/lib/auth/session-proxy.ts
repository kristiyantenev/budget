import "server-only";
import { parseSetCookieHeader, toCookieOptions } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";
import type { createAuth } from "./create-auth";

type SessionAuth = {
  api: Pick<ReturnType<typeof createAuth<[]>>["api"], "maintainSession" | "signInSocial">;
  $context: Promise<Pick<Awaited<ReturnType<typeof createAuth<[]>>["$context"]>, "authCookies">>;
};

// ADR-36: the destination the render redirects to if the session ends after the proxy saw it.
export const RETURN_TO_HEADER = "x-budget-return-to";

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

    // ADR-32: the public list is the security control. A path added here skips the session.
    if (path === "/sign-in" || path.startsWith("/api/auth/")) {
      return NextResponse.next();
    }

    // ADR-32: the proxy maintains sessions before rendering; the data layer still verifies access.
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
    const returnTo = `${path}${request.nextUrl.search}`;
    let response: NextResponse;

    if (active) {
      // Set on every request, so a value the browser sent never reaches the render.
      const forwarded = new Headers(request.headers);
      forwarded.set(RETURN_TO_HEADER, returnTo);
      response = NextResponse.next({ request: { headers: forwarded } });
    } else {
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
