import { afterAll, afterEach, beforeAll, expect, test, vi } from "vitest";
import { z } from "zod";
import { once } from "node:events";
import { createServer, type IncomingHttpHeaders } from "node:http";
import { createBudgetingApi } from "./budgeting-api";

let apiURL = "";

let apiStatus = 200;

type ApiBody = { subject: string } | { unexpected: boolean };

let apiBody: ApiBody = { subject: "principal-1" };

let received: { method?: string; url?: string; headers: IncomingHttpHeaders }[] = [];

const api = createServer((request, response) => {
  received.push({ method: request.method, url: request.url, headers: request.headers });
  response.statusCode = apiStatus;
  response.setHeader("content-type", "application/json");
  response.end(apiStatus === 200 ? JSON.stringify(apiBody) : "");
});

const stored = {
  token: "opaque-session-reference",
  subject: "principal-1",
  accessToken: "access-token-for-principal-1",
};

type Refresh = (token: string) => Promise<typeof stored>;

beforeAll(async () => {
  api.listen(0, "127.0.0.1");
  await once(api, "listening");
  const address = z.object({ port: z.number() }).parse(api.address());
  apiURL = `http://127.0.0.1:${address.port}`;
});

afterEach(() => {
  apiStatus = 200;
  apiBody = { subject: "principal-1" };
  received = [];
});

afterAll(async () => {
  api.closeAllConnections();
  await new Promise<void>((resolve) => api.close(() => resolve()));
});

test("the API is called with the session's access token and never sees the cookie reference", async () => {
  const refresh = vi.fn<Refresh>(async () => stored);
  const budgetApi = createBudgetingApi({ baseURL: apiURL, refresh });

  await budgetApi.whoAmI(stored.token);

  expect(refresh).toHaveBeenCalledExactlyOnceWith(stored.token);
  expect(received).toHaveLength(1);
  expect(received[0]?.method).toBe("GET");
  expect(received[0]?.url).toBe("/me");
  expect(received[0]?.headers.authorization).toBe(`Bearer ${stored.accessToken}`);
  expect(received[0]?.headers.cookie).toBeUndefined();
});

test("a subject matching the session's is recognised without returning either value", async () => {
  const budgetApi = createBudgetingApi({ baseURL: apiURL, refresh: async () => stored });

  const outcome = await budgetApi.whoAmI(stored.token);

  expect(outcome).toEqual({ status: "ok", matches: true });

  const serialised = JSON.stringify(outcome);

  expect(serialised).not.toContain(stored.accessToken);
  expect(serialised).not.toContain(stored.subject);
  expect(serialised).not.toContain(stored.token);
});

test("a subject differing from the session's is reported as a mismatch", async () => {
  apiBody = { subject: "someone-else" };
  const budgetApi = createBudgetingApi({ baseURL: apiURL, refresh: async () => stored });

  expect(await budgetApi.whoAmI(stored.token)).toEqual({ status: "ok", matches: false });
});

test("a 401 and a 403 are distinct outcomes, and neither refreshes or retries", async () => {
  const refresh = vi.fn<Refresh>(async () => stored);
  const budgetApi = createBudgetingApi({ baseURL: apiURL, refresh });

  apiStatus = 401;
  const unauthorized = await budgetApi.whoAmI(stored.token);
  apiStatus = 403;
  const forbidden = await budgetApi.whoAmI(stored.token);

  expect(unauthorized).toEqual({ status: "unauthorized" });
  expect(forbidden).toEqual({ status: "forbidden" });
  expect(refresh).toHaveBeenCalledTimes(2);
  expect(received).toHaveLength(2);
});

test("any other failure throws an error that carries no token", async () => {
  const budgetApi = createBudgetingApi({ baseURL: apiURL, refresh: async () => stored });

  for (const status of [500, 503]) {
    apiStatus = status;
    const failure = await budgetApi.whoAmI(stored.token).then(() => "resolved", String);

    expect(failure).toMatch(/^Error: /);
    expect(failure).not.toContain(stored.accessToken);
  }

  apiStatus = 200;
  apiBody = { unexpected: true };
  await expect(budgetApi.whoAmI(stored.token)).rejects.toThrow();
});

test("a session that ends during refresh propagates instead of calling the API", async () => {
  const ended = new Error("The session has ended");
  const budgetApi = createBudgetingApi({
    baseURL: apiURL,
    refresh: async () => {
      throw ended;
    },
  });

  await expect(budgetApi.whoAmI(stored.token)).rejects.toBe(ended);
  expect(received).toHaveLength(0);
});
