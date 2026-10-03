import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createBudgetingApi } from "./api/budgeting-api";
import { auth, refreshSession } from "./auth";
import { RETURN_TO_HEADER } from "./auth/session-proxy";

const { BUDGET_API_URL } = process.env;

if (!BUDGET_API_URL) throw new Error("Missing environment variable: BUDGET_API_URL");

const budgetingApi = createBudgetingApi({ baseURL: BUDGET_API_URL, refresh: refreshSession });

// ADR-32: the proxy maintains the session, and the data access layer still verifies it.
const verifiedSession = cache(async () => {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });

  // ADR-36: reached only when the session ends between the proxy and the render, which is
  // still an interruption. The sign-in page checks returnTo, so this does not.
  if (!session) {
    const signIn = new URLSearchParams({ reason: "expired" });
    signIn.set("returnTo", requestHeaders.get(RETURN_TO_HEADER) ?? "/");
    redirect(`/sign-in?${signIn}`);
  }

  return session;
});

// Only what a page may render. The session token and the stored tokens stay here.
export async function signedInPerson() {
  const { user } = await verifiedSession();

  return { name: user.name };
}

// ADR-38: reads reach the API from the server render, through this layer.
export async function whoAmI() {
  const { session } = await verifiedSession();

  // ADR-34, ADR-40: a SessionEnded thrown here propagates on purpose. Do not catch it to
  // redirect. A render cannot clear the cookie, and the proxy ends the session on the next
  // request, silent Keycloak retry and returnTo included.
  return budgetingApi.whoAmI(session.token);
}
