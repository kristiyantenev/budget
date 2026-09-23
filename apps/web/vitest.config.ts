import { configDefaults, defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    alias: {
      "server-only": fileURLToPath(new URL("./empty.js", import.meta.resolve("server-only"))),
    },
    include: ["**/*.test.{ts,tsx}"],
    exclude: [...configDefaults.exclude, "**/.next/**"],
    hookTimeout: 120_000,
    testTimeout: 15_000,
  },
});
