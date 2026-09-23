import { auth } from "@/lib/auth";
import { createSessionProxy } from "@/lib/auth/session-proxy";

const { BETTER_AUTH_URL } = process.env;

if (!BETTER_AUTH_URL) throw new Error("Missing environment variable: BETTER_AUTH_URL");

export const proxy = createSessionProxy(auth, BETTER_AUTH_URL);

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};
