import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { genericOAuth, type TestHelpers, testUtils } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { exportJWK, generateKeyPair, SignJWT } from "jose";
import { NextRequest } from "next/server";
import { Pool } from "pg";
import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import { z } from "zod";
import { randomBytes, randomUUID } from "node:crypto";
import { once } from "node:events";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import drizzleConfig from "../../drizzle.config";
import * as schema from "../../drizzle/schema";
import { createBudgetingApi } from "../api/budgeting-api";
import { createAuth } from "./create-auth";
import { createSessionRefresher, SessionEnded } from "./refresh-session";
import { createSessionProxy } from "./session-proxy";

let container: Awaited<ReturnType<PostgreSqlContainer["start"]>>;

let pool: Pool;

let db: Parameters<typeof createAuth>[1];

let migrationPool: Pool;

let auth: ReturnType<typeof createAuth<[ReturnType<typeof testUtils>]>>;

let helpers: TestHelpers;

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

let providerIssuer = "";

let refreshRequests = 0;

let providerStatus = 200;

let refreshLifetime = 2_592_000;

let signingKey: Awaited<ReturnType<typeof generateKeyPair>>;

const authorizationCodes = new Map<string, { sid: string; subject: string; nonce: string }>();
const accessTokenSubjects = new Map<string, string>();

const provider = createServer(async (request, response) => {
  response.setHeader("content-type", "application/json");

  if (request.url === "/.well-known/openid-configuration") {
    response.end(
      JSON.stringify({
        issuer: providerIssuer,
        authorization_endpoint: `${providerIssuer}/authorize`,
        token_endpoint: `${providerIssuer}/token`,
        userinfo_endpoint: `${providerIssuer}/userinfo`,
        jwks_uri: `${providerIssuer}/jwks`,
        id_token_signing_alg_values_supported: ["RS256"],
      }),
    );

    return;
  }

  if (request.url === "/jwks") {
    response.end(
      JSON.stringify({
        keys: [
          { ...(await exportJWK(signingKey.publicKey)), kid: "test", alg: "RS256", use: "sig" },
        ],
      }),
    );
    return;
  }

  if (request.url === "/userinfo") {
    const subject = accessTokenSubjects.get(
      request.headers.authorization?.replace("Bearer ", "") ?? "",
    );
    response.end(
      JSON.stringify({
        sub: subject,
        name: "Test person",
        email: `${subject}@example.test`,
        email_verified: true,
      }),
    );
    return;
  }

  let body = "";

  for await (const chunk of request) body += chunk;
  const parameters = new URLSearchParams(body);

  if (parameters.get("grant_type") === "authorization_code") {
    const code = parameters.get("code") ?? "";
    const claims = authorizationCodes.get(code);
    authorizationCodes.delete(code);
    if (!claims) {
      response.statusCode = 400;
      response.end(JSON.stringify({ error: "invalid_grant" }));
      return;
    }
    const idToken = await new SignJWT({ sid: claims.sid, nonce: claims.nonce })
      .setProtectedHeader({ alg: "RS256", kid: "test" })
      .setIssuer(providerIssuer)
      .setAudience(config.clientId)
      .setSubject(claims.subject)
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(signingKey.privateKey);
    const accessToken = randomUUID();
    accessTokenSubjects.set(accessToken, claims.subject);
    response.end(
      JSON.stringify({
        access_token: accessToken,
        refresh_token: randomUUID(),
        id_token: idToken,
        token_type: "Bearer",
        expires_in: 300,
        refresh_expires_in: refreshLifetime,
      }),
    );
    return;
  }

  refreshRequests++;
  if (
    request.method !== "POST" ||
    parameters.get("grant_type") !== "refresh_token" ||
    !parameters.get("refresh_token")
  ) {
    response.statusCode = 400;
    response.end(JSON.stringify({ error: "invalid_request" }));

    return;
  }

  response.statusCode = providerStatus;
  response.end(
    JSON.stringify(
      providerStatus === 200
        ? {
            access_token: randomUUID(),
            refresh_token: randomUUID(),
            token_type: "Bearer",
            expires_in: 300,
            refresh_expires_in: refreshLifetime,
          }
        : {
            error: providerStatus === 400 ? "invalid_grant" : "temporarily_unavailable",
          },
    ),
  );
});

let apiURL = "";

let apiStatus = 200;

let apiAuthorization: string | undefined;

// Stands in for the resource server, echoing the stored subject the fixture assigns.
const api = createServer(async (request, response) => {
  apiAuthorization = request.headers.authorization;
  const token = apiAuthorization?.replace(/^Bearer /, "") ?? "";
  const { rows } = await pool.query<{ subject: string }>(
    "SELECT subject FROM betterauth.session WHERE access_token = $1",
    [token],
  );
  response.statusCode = apiStatus;
  response.setHeader("content-type", "application/json");
  response.end(apiStatus === 200 ? JSON.stringify({ subject: rows[0]?.subject }) : "");
});

const migrationConfig = {
  migrationsFolder: fileURLToPath(
    new URL(drizzleConfig.out ?? "./drizzle", new URL("../../", import.meta.url)),
  ),
  migrationsSchema: drizzleConfig.migrations?.schema,
  migrationsTable: drizzleConfig.migrations?.table,
};

beforeAll(async () => {
  signingKey = await generateKeyPair("RS256");
  provider.listen(0, "127.0.0.1");
  await once(provider, "listening");
  const address = z.object({ port: z.number() }).parse(provider.address());
  providerIssuer = `http://127.0.0.1:${address.port}`;
  api.listen(0, "127.0.0.1");
  await once(api, "listening");
  apiURL = `http://127.0.0.1:${z.object({ port: z.number() }).parse(api.address()).port}`;
  const password = randomBytes(24).toString("hex");
  const migrationPassword = randomBytes(24).toString("hex");
  container = await new PostgreSqlContainer("postgres:17-alpine").start();

  const administrator = new Pool({
    connectionString: container.getConnectionUri(),
  });

  try {
    // Production roles come from infrastructure. This fixture verifies their permissions.
    for (const [name, rolePassword] of [
      ["b1-budget-web", password],
      ["b1-budget-web-migrator", migrationPassword],
    ]) {
      const { rows } = await administrator.query<{ statement: string }>(
        "SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', $1::text, $2::text) AS statement",
        [name, rolePassword],
      );

      const statement = rows[0]?.statement;

      if (!statement) throw new Error("Expected a role creation statement");

      await administrator.query(statement);
    }

    const { rows } = await administrator.query<{ statement: string }>(
      `SELECT format('GRANT CREATE ON DATABASE %I TO "b1-budget-web-migrator"', current_database()) AS statement`,
    );

    const statement = rows[0]?.statement;

    if (!statement) throw new Error("Expected a database grant statement");

    await administrator.query(statement);
  } finally {
    await administrator.end();
  }

  const url = new URL(container.getConnectionUri());
  url.username = "b1-budget-web";
  url.password = password;
  pool = new Pool({
    connectionString: url.toString(),
    options: "-c search_path=betterauth",
  });
  db = drizzle({ client: pool, schema });
  url.username = "b1-budget-web-migrator";
  url.password = migrationPassword;
  migrationPool = new Pool({ connectionString: url.toString() });
  await migrate(drizzle(migrationPool), migrationConfig);
  await migrationPool.query(`
    GRANT USAGE ON SCHEMA betterauth TO "b1-budget-web";
    GRANT SELECT, INSERT, UPDATE, DELETE ON
      betterauth."user", betterauth.session, betterauth.account, betterauth.verification
      TO "b1-budget-web";
    ALTER DEFAULT PRIVILEGES IN SCHEMA betterauth
      GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO "b1-budget-web";
  `);
  auth = createAuth({ ...config, issuer: providerIssuer }, db, {
    plugins: [testUtils()],
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
                accessToken: randomUUID(),
                refreshToken: randomUUID(),
                idToken: randomUUID(),
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

afterEach(async () => {
  authorizationCodes.clear();
  accessTokenSubjects.clear();
  refreshRequests = 0;
  providerStatus = 200;
  refreshLifetime = 2_592_000;
  apiStatus = 200;
  apiAuthorization = undefined;

  if (!helpers) return;

  const database = drizzle(pool);
  const users = await database.select({ id: schema.user.id }).from(schema.user);

  for (const user of users) await helpers.deleteUser(user.id);
  await database.delete(schema.verification);
});

async function createSession() {
  const user = await helpers.saveUser(helpers.createUser());

  return helpers.login({ userId: user.id });
}

afterAll(async () => {
  provider.closeAllConnections();
  await new Promise<void>((resolve) => provider.close(() => resolve()));
  api.closeAllConnections();
  await new Promise<void>((resolve) => api.close(() => resolve()));
  await pool?.end();
  await migrationPool?.end();
  await container?.stop();
});

test("a normal page response renews the cookie after one refresh shared by concurrent requests", async () => {
  const first = await createSession();
  const before = await storedSession(first.session.id);
  await pool.query("UPDATE betterauth.session SET access_token_expires_at = now() WHERE id = $1", [
    first.session.id,
  ]);
  const proxy = createSessionProxy(auth, config.baseURL);
  const startedAt = Date.now();

  const responses = await Promise.all(
    Array.from({ length: 6 }, () =>
      proxy(new NextRequest(`${baseURL}/budgets`, { headers: first.headers })),
    ),
  );

  const stored = await storedSession(first.session.id);

  expect(refreshRequests).toBe(1);
  expect(stored.accessToken).not.toBe(before.accessToken);
  expect(stored.refreshToken).not.toBe(before.refreshToken);
  expect(stored.token).toBe(before.token);
  expect(stored.expiresAt.getTime()).toBeGreaterThanOrEqual(startedAt + refreshLifetime * 1000);

  for (const response of responses) {
    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(response.headers.get("location")).toBeNull();

    const cookie = response.cookies.get((await auth.$context).authCookies.sessionToken.name);

    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.maxAge).toBeGreaterThan(refreshLifetime - 5);
    expect(
      Math.abs(new Date(cookie?.expires ?? 0).getTime() - stored.expiresAt.getTime()),
    ).toBeLessThan(1000);
    expect(await response.text()).not.toContain(stored.accessToken);
  }

  const repeated = await proxy(new NextRequest(`${baseURL}/budgets`, { headers: first.headers }));

  expect(repeated.status).toBe(200);
  expect(refreshRequests).toBe(1);
  expect((await storedSession(first.session.id)).expiresAt).toEqual(stored.expiresAt);
});

test("a shorter remaining Keycloak lifetime bounds both session and cookie", async () => {
  const first = await createSession();
  refreshLifetime = 120;
  await pool.query("UPDATE betterauth.session SET access_token_expires_at = now() WHERE id = $1", [
    first.session.id,
  ]);

  const response = await auth.api.maintainSession({
    headers: first.headers,
    asResponse: true,
  });

  const stored = await storedSession(first.session.id);

  expect(response.status).toBe(200);
  expect(stored.expiresAt).toEqual(stored.refreshTokenExpiresAt);
  expect(stored.expiresAt.getTime() - Date.now()).toBeLessThanOrEqual(120_000);
  expect(response.headers.getSetCookie()[0]).toMatch(/Max-Age=1[12][0-9]/);
});

test("reading a page with current tokens makes no provider request and does not slide expiry", async () => {
  const first = await createSession();
  const before = await storedSession(first.session.id);
  const proxy = createSessionProxy(auth, config.baseURL);

  const response = await proxy(new NextRequest(`${baseURL}/budgets`, { headers: first.headers }));

  expect(response.status).toBe(200);
  expect(refreshRequests).toBe(0);
  expect(await storedSession(first.session.id)).toEqual(before);
});

test("an ended session starts one silent authorization-code exchange on the page response", async () => {
  const first = await createSession();
  providerStatus = 400;
  await pool.query("UPDATE betterauth.session SET access_token_expires_at = now() WHERE id = $1", [
    first.session.id,
  ]);

  const recoveryAuth = createAuth({ ...config, issuer: providerIssuer }, db, {
    plugins: [
      genericOAuth({
        config: [
          {
            providerId: "keycloak",
            clientId: config.clientId,
            clientSecret: config.clientSecret,
            authorizationUrl: `${providerIssuer}/authorize`,
            tokenUrl: `${providerIssuer}/token`,
            userInfoUrl: `${providerIssuer}/userinfo`,
            pkce: true,
          },
        ],
      }),
    ],
  });

  const proxy = createSessionProxy(recoveryAuth, config.baseURL);

  const response = await proxy(new NextRequest(`${baseURL}/budgets`, { headers: first.headers }));

  const destination = new URL(response.headers.get("location") ?? "");

  expect(response.status).toBe(303);
  expect(destination.origin).toBe(providerIssuer);
  expect(destination.pathname).toBe("/authorize");
  expect(destination.searchParams.get("prompt")).toBe("none");
  expect(destination.searchParams.get("state")).toBeTruthy();
  expect(destination.searchParams.get("code_challenge")).toBeTruthy();
  expect(response.cookies.get("budget.session-recovery")?.maxAge).toBe(60);
  expect(response.cookies.get((await auth.$context).authCookies.sessionToken.name)?.maxAge).toBe(0);
});

test("anonymous requests redirect to sign-in while public routes remain accessible", async () => {
  const proxy = createSessionProxy(auth, config.baseURL);

  const response = await proxy(new NextRequest(`${baseURL}/budgets?month=2026-09`));

  const destination = new URL(response.headers.get("location") ?? "");

  expect(response.status).toBe(303);
  expect(destination.pathname).toBe("/sign-in");
  expect(destination.searchParams.get("returnTo")).toBe("/budgets?month=2026-09");
  expect(refreshRequests).toBe(0);

  for (const path of ["/sign-in", "/api/auth/callback/keycloak", "/healthz"]) {
    const publicResponse = await proxy(new NextRequest(`${baseURL}${path}`));
    expect(publicResponse.headers.get("x-middleware-next")).toBe("1");
  }
});

test("an early token refusal uses the same refresh lock and does not spend a rotated token twice", async () => {
  const first = await createSession();
  const stored = await storedSession(first.session.id);

  const refresh = createSessionRefresher(db, {
    ...config,
    issuer: providerIssuer,
  });

  const renewed = await Promise.all(
    Array.from({ length: 3 }, () => refresh(first.token, stored.accessToken)),
  );

  expect(refreshRequests).toBe(1);
  expect(new Set(renewed.map((result) => result.accessToken)).size).toBe(1);
});

test("an access token near expiry is refreshed and committed before the API sees it", async () => {
  const first = await createSession();
  await pool.query("UPDATE betterauth.session SET access_token_expires_at = now() WHERE id = $1", [
    first.session.id,
  ]);
  const before = await storedSession(first.session.id);
  const budgetApi = createBudgetingApi({
    baseURL: apiURL,
    refresh: createSessionRefresher(db, { ...config, issuer: providerIssuer }),
  });

  const outcome = await budgetApi.whoAmI(first.token);

  const stored = await storedSession(first.session.id);

  expect(outcome).toEqual({ status: "ok", matches: true });
  expect(refreshRequests).toBe(1);
  expect(stored.accessToken).not.toBe(before.accessToken);
  expect(apiAuthorization).toBe(`Bearer ${stored.accessToken}`);
});

test("a 401 and a 403 from the API reach the caller as distinct outcomes and leave the session row unchanged", async () => {
  const first = await createSession();
  const before = await storedSession(first.session.id);
  const budgetApi = createBudgetingApi({
    baseURL: apiURL,
    refresh: createSessionRefresher(db, { ...config, issuer: providerIssuer }),
  });

  apiStatus = 401;
  const unauthorized = await budgetApi.whoAmI(first.token);
  apiStatus = 403;
  const forbidden = await budgetApi.whoAmI(first.token);

  expect(unauthorized).toEqual({ status: "unauthorized" });
  expect(forbidden).toEqual({ status: "forbidden" });
  expect(apiAuthorization).toBe(`Bearer ${before.accessToken}`);
  expect(refreshRequests).toBe(0);
  expect(await storedSession(first.session.id)).toEqual(before);
});

test("a temporary provider failure returns 503 without extending or clearing the session", async () => {
  const first = await createSession();
  providerStatus = 503;
  await pool.query("UPDATE betterauth.session SET access_token_expires_at = now() WHERE id = $1", [
    first.session.id,
  ]);
  const before = await storedSession(first.session.id);
  const proxy = createSessionProxy(auth, config.baseURL);

  const response = await proxy(new NextRequest(`${baseURL}/budgets`, { headers: first.headers }));

  expect(response.status).toBe(503);
  expect(response.headers.getSetCookie()).toHaveLength(0);
  expect(await storedSession(first.session.id)).toEqual(before);
});

test("an invalid grant clears the cookie and a recent recovery prevents another SSO redirect", async () => {
  const first = await createSession();
  providerStatus = 400;
  await pool.query("UPDATE betterauth.session SET access_token_expires_at = now() WHERE id = $1", [
    first.session.id,
  ]);
  const headers = new Headers(first.headers);
  headers.set("cookie", `${headers.get("cookie")}; budget.session-recovery=1`);
  const proxy = createSessionProxy(auth, config.baseURL);

  const response = await proxy(
    new NextRequest(`${baseURL}/budgets?month=2026-09`, {
      headers,
      method: "POST",
    }),
  );

  expect(response.status).toBe(303);
  const location = new URL(response.headers.get("location") ?? "");
  expect(location.pathname).toBe("/sign-in");
  expect(location.searchParams.get("reason")).toBe("expired");
  expect(location.searchParams.get("returnTo")).toBe("/budgets?month=2026-09");
  expect(response.cookies.get((await auth.$context).authCookies.sessionToken.name)?.maxAge).toBe(0);
});

test("a failed database write after rotation ends the session while preserving its row", async () => {
  const first = await createSession();
  await pool.query("UPDATE betterauth.session SET access_token_expires_at = now() WHERE id = $1", [
    first.session.id,
  ]);
  const before = await storedSession(first.session.id);
  await migrationPool.query(`CREATE FUNCTION betterauth.reject_refresh() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fixture write failure'; END $$;
    CREATE TRIGGER reject_refresh BEFORE UPDATE ON betterauth.session FOR EACH ROW EXECUTE FUNCTION betterauth.reject_refresh()`);

  try {
    const refresh = createSessionRefresher(db, {
      ...config,
      issuer: providerIssuer,
    });

    await expect(refresh(first.token)).rejects.toBeInstanceOf(SessionEnded);
    expect(refreshRequests).toBe(1);
    expect(await storedSession(first.session.id)).toEqual(before);
  } finally {
    await migrationPool.query(
      "DROP TRIGGER reject_refresh ON betterauth.session; DROP FUNCTION betterauth.reject_refresh()",
    );
  }
});

test("replacing a stored session invalidates its old credential and preserves another device", async () => {
  const first = await createSession();
  const other = await helpers.login({ userId: first.user.id });
  const before = await storedSession(first.session.id);

  const replacement = {
    ...before,
    token: randomUUID(),
    accessToken: randomUUID(),
  };

  const { adapter } = await auth.$context;

  await adapter.create({
    model: "session",
    forceAllowId: true,
    data: replacement,
  });
  expect(await storedSession(first.session.id)).toEqual(replacement);

  expect(await auth.api.getSession({ headers: first.headers })).toBeNull();

  const unaffected = await auth.api.getSession({ headers: other.headers });

  expect(unaffected?.session.id).toBe(other.session.id);
});

test("a new auth instance reads the session from Postgres", async () => {
  const { session, headers } = await createSession();
  const restarted = createAuth(config, db, { plugins: [] });

  const restored = await restarted.api.getSession({ headers });

  expect(restored?.session.id).toBe(session.id);
});

async function storedSession(id: string) {
  const [row] = await drizzle(pool).select().from(schema.session).where(eq(schema.session.id, id));

  if (!row) throw new Error("Expected a persisted session");

  return row;
}

test("verified logins keep credentials on each sid and share only the account identity", async () => {
  const loginAuth = createAuth({ ...config, issuer: providerIssuer }, db);
  const subject = randomUUID();

  async function signIn(sid: string) {
    const start = await loginAuth.api.signInSocial({
      body: { provider: "keycloak", callbackURL: `${baseURL}/budgets` },
      asResponse: true,
    });
    const { url } = await start.json();
    const authorization = new URL(url);
    const code = randomUUID();
    authorizationCodes.set(code, {
      sid,
      subject,
      nonce: authorization.searchParams.get("nonce") ?? "",
    });
    const callback = new URL("/api/auth/callback/keycloak", baseURL);
    callback.searchParams.set("code", code);
    callback.searchParams.set("state", authorization.searchParams.get("state") ?? "");
    const response = await loginAuth.handler(
      new Request(callback, {
        headers: {
          cookie: start.headers
            .getSetCookie()
            .map((cookie) => cookie.split(";")[0])
            .join("; "),
        },
      }),
    );
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(`${baseURL}/budgets`);
    return storedSession(sid);
  }

  const first = await signIn(randomUUID());
  const second = await signIn(randomUUID());
  expect(second.userId).toBe(first.userId);
  expect(second.accessToken).not.toBe(first.accessToken);
  expect(second.refreshToken).not.toBe(first.refreshToken);
  expect(second.idToken).not.toBe(first.idToken);
  expect(await storedSession(first.id)).toEqual(first);

  const replacement = await signIn(first.id);
  expect(replacement.refreshToken).not.toBe(first.refreshToken);
  expect(replacement.token).not.toBe(first.token);
  expect(await storedSession(second.id)).toEqual(second);
  expect(replacement.refreshTokenExpiresAt.getTime()).toBeGreaterThan(Date.now() + 2_591_000_000);

  const refresh = createSessionRefresher(db, { ...config, issuer: providerIssuer });
  const refreshed = await refresh(replacement.token, replacement.accessToken);
  expect(refreshed.refreshToken).not.toBe(replacement.refreshToken);
  expect(await storedSession(second.id)).toEqual(second);

  const accounts = await db
    .select()
    .from(schema.account)
    .where(eq(schema.account.userId, first.userId));
  expect(accounts).toHaveLength(1);
  expect(accounts[0]).toMatchObject({
    issuer: providerIssuer,
    accountId: subject,
    providerId: "keycloak",
    userId: first.userId,
    accessToken: null,
    refreshToken: null,
    idToken: null,
    accessTokenExpiresAt: null,
    refreshTokenExpiresAt: null,
    scope: null,
    password: null,
  });

  // Direct writes must not bypass the account hooks and retain credentials.
  await expect(
    db
      .update(schema.account)
      .set({ refreshToken: randomUUID() })
      .where(eq(schema.account.userId, first.userId)),
  ).rejects.toMatchObject({ cause: { code: "23514", constraint: "account_no_credentials" } });

  await db.delete(schema.session).where(eq(schema.session.id, first.id));
  expect(await storedSession(second.id)).toEqual(second);
  expect(
    await db.select().from(schema.account).where(eq(schema.account.userId, first.userId)),
  ).toEqual(accounts);
});

test("the account cleanup migration preserves identity links and session credentials", async () => {
  const first = await createSession();
  const session = await storedSession(first.session.id);
  const [user] = await db.select().from(schema.user).where(eq(schema.user.id, first.user.id));
  if (!user) throw new Error("Expected a persisted user");
  const administrator = new Pool({ connectionString: container.getConnectionUri() });
  const directory = await mkdtemp(join(tmpdir(), "budget-upgrade-"));
  let upgradePool: Pool | undefined;

  try {
    await administrator.query("CREATE DATABASE account_upgrade_test");
    const url = new URL(container.getConnectionUri());
    url.pathname = "/account_upgrade_test";
    upgradePool = new Pool({ connectionString: url.toString() });
    const upgradeDb = drizzle({ client: upgradePool, schema });
    await cp(migrationConfig.migrationsFolder, directory, { recursive: true });
    const journalPath = join(directory, "meta/_journal.json");
    const journal = JSON.parse(await readFile(journalPath, "utf8"));
    journal.entries = journal.entries.slice(0, 1);
    await writeFile(journalPath, JSON.stringify(journal));
    await migrate(upgradeDb, { ...migrationConfig, migrationsFolder: directory });
    await upgradeDb.insert(schema.user).values(user);
    await upgradeDb.insert(schema.session).values(session);
    const [before] = await upgradeDb
      .insert(schema.account)
      .values({
        id: randomUUID(),
        issuer: providerIssuer,
        accountId: session.subject,
        providerId: "keycloak",
        userId: user.id,
        accessToken: randomUUID(),
        refreshToken: randomUUID(),
        idToken: randomUUID(),
        accessTokenExpiresAt: new Date(),
        refreshTokenExpiresAt: new Date(),
        scope: "openid",
        password: randomUUID(),
      })
      .returning();
    await migrate(upgradeDb, migrationConfig);
    expect(await upgradeDb.select().from(schema.account)).toEqual([
      {
        ...before,
        accessToken: null,
        refreshToken: null,
        idToken: null,
        accessTokenExpiresAt: null,
        refreshTokenExpiresAt: null,
        scope: null,
        password: null,
      },
    ]);
    expect(await upgradeDb.select().from(schema.session)).toEqual([session]);
    expect(await upgradeDb.select().from(schema.user)).toEqual([user]);
  } finally {
    await upgradePool?.end();
    await administrator.query("DROP DATABASE IF EXISTS account_upgrade_test");
    await administrator.end();
    await rm(directory, { recursive: true, force: true });
  }
});

test("a failed replacement and a rolled-back transaction retain the previous session", async () => {
  const first = await createSession();
  const second = await createSession();
  const before = await storedSession(first.session.id);
  const conflict = await storedSession(second.session.id);
  const { adapter } = await auth.$context;
  await expect(
    adapter.create({
      model: "session",
      forceAllowId: true,
      data: { ...before, token: conflict.token },
    }),
  ).rejects.toThrow();
  expect(await storedSession(first.session.id)).toEqual(before);
  await expect(
    adapter.transaction(async (transaction) => {
      await transaction.create({
        model: "session",
        forceAllowId: true,
        data: { ...before, token: "rolled-back-cookie-reference" },
      });
      throw new Error("Abort replacement");
    }),
  ).rejects.toThrow("Abort replacement");
  expect(await storedSession(first.session.id)).toEqual(before);
});

test("runtime cannot change schema or migration history, and neither auth role can access product data", async () => {
  const administrator = new Pool({
    connectionString: container.getConnectionUri(),
  });

  try {
    await administrator.query(
      "CREATE SCHEMA b1_budget; CREATE TABLE b1_budget.product_fixture (id integer)",
    );
    await expect(
      pool.query("CREATE TABLE betterauth.forbidden (id integer)"),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(pool.query("SELECT * FROM betterauth.__drizzle_migrations")).rejects.toMatchObject(
      { code: "42501" },
    );

    for (const client of [pool, migrationPool]) {
      await expect(client.query("SELECT * FROM b1_budget.product_fixture")).rejects.toMatchObject({
        code: "42501",
      });
      await expect(
        client.query("CREATE TABLE b1_budget.forbidden (id integer)"),
      ).rejects.toMatchObject({ code: "42501" });
    }
  } finally {
    await administrator.end();
  }
});

test("replaying committed migrations preserves expired session tokens without repeating migrations", async () => {
  const { session } = await createSession();
  await pool.query(
    `UPDATE betterauth.session SET
    access_token_expires_at = '2000-01-01T00:00:00Z',
    refresh_token_expires_at = '2000-01-01T00:00:00Z',
    id_token_expires_at = '2000-01-01T00:00:00Z'
    WHERE id = $1`,
    [session.id],
  );
  const before = await storedSession(session.id);
  await migrate(drizzle(migrationPool), migrationConfig);
  expect(await storedSession(session.id)).toEqual(before);

  const history = await migrationPool.query("SELECT id FROM betterauth.__drizzle_migrations");

  expect(history.rowCount).toBe(2);
});

test("an additive migration preserves sessions while the previous application is still running", async () => {
  const { session, headers } = await createSession();
  const before = await storedSession(session.id);
  const directory = await mkdtemp(join(tmpdir(), "budget-drizzle-"));

  try {
    const migrations = join(directory, "migrations");
    await cp(migrationConfig.migrationsFolder, migrations, { recursive: true });
    const journalPath = join(migrations, "meta/_journal.json");
    const journal = JSON.parse(await readFile(journalPath, "utf8"));
    const last = journal.entries.at(-1);
    journal.entries.push({
      ...last,
      idx: last.idx + 1,
      when: last.when + 1,
      tag: "test_additive",
    });
    await writeFile(journalPath, JSON.stringify(journal));
    await writeFile(
      join(migrations, "test_additive.sql"),
      "ALTER TABLE betterauth.session ADD COLUMN migration_test_note text;",
    );
    await migrate(drizzle(migrationPool), {
      ...migrationConfig,
      migrationsFolder: migrations,
    });
    expect(await storedSession(session.id)).toEqual(before);

    const addedColumn = await pool.query(
      "SELECT migration_test_note FROM betterauth.session WHERE id = $1",
      [session.id],
    );

    expect(addedColumn.rows).toEqual([{ migration_test_note: null }]);

    const restored = await auth.api.getSession({ headers });

    expect(restored?.session.id).toBe(session.id);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
