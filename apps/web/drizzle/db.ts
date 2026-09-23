import "server-only";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// One pool per process. Next re-evaluates server modules on hot reload, so the
// pool is cached on globalThis to avoid leaking connections in development.
declare global {
  var budgetPool: Pool | undefined;
}

const connectionString = process.env.BUDGET_DATABASE_URL;

if (!connectionString) {
  throw new Error("Missing environment variable: BUDGET_DATABASE_URL");
}

const pool = globalThis.budgetPool ?? new Pool({ connectionString });

if (process.env.NODE_ENV !== "production") globalThis.budgetPool = pool;

export const db = drizzle({ client: pool, schema });
