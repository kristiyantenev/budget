import "server-only";
import { db } from "@/drizzle/db";
import { createAuth } from "./auth/create-auth";

const {
  BETTER_AUTH_URL,
  BETTER_AUTH_SECRET,
  BUDGET_OIDC_ISSUER,
  BUDGET_OIDC_CLIENT_ID,
  BUDGET_OIDC_CLIENT_SECRET,
} = process.env;

if (!BETTER_AUTH_URL) throw new Error("Missing environment variable: BETTER_AUTH_URL");

if (!BETTER_AUTH_SECRET) throw new Error("Missing environment variable: BETTER_AUTH_SECRET");

if (!BUDGET_OIDC_ISSUER) throw new Error("Missing environment variable: BUDGET_OIDC_ISSUER");

if (!BUDGET_OIDC_CLIENT_ID) throw new Error("Missing environment variable: BUDGET_OIDC_CLIENT_ID");

if (!BUDGET_OIDC_CLIENT_SECRET)
  throw new Error("Missing environment variable: BUDGET_OIDC_CLIENT_SECRET");

export const auth: ReturnType<typeof createAuth<[]>> = createAuth(
  {
    baseURL: BETTER_AUTH_URL,
    secret: BETTER_AUTH_SECRET,
    issuer: BUDGET_OIDC_ISSUER,
    clientId: BUDGET_OIDC_CLIENT_ID,
    clientSecret: BUDGET_OIDC_CLIENT_SECRET,
  },
  db,
);
