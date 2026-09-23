import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

loadEnvConfig(process.cwd());

export default defineConfig({
  dialect: "postgresql",
  schema: "./drizzle/schema.ts",
  out: "./drizzle/migrations",
  schemaFilter: ["betterauth"],
  migrations: {
    schema: "betterauth",
    table: "__drizzle_migrations",
  },
  dbCredentials: {
    url:
      process.env.BUDGET_DATABASE_URL ??
      (() => {
        throw new Error("Set BUDGET_DATABASE_URL to run migrations");
      })(),
  },
});
