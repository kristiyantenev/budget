import sharedConfig from "@workspace/oxlint-config";
import { defineConfig } from "oxlint";

export default defineConfig({
  extends: [sharedConfig],
  jsPlugins: [import.meta.resolve("@shadcn/lint")],
  plugins: ["react", "nextjs", "jsx-a11y", "vitest"],
  rules: {
    "react/react-in-jsx-scope": "off",
    "shadcn/no-restyle": ["error", { allow: ["layout"] }],
    "vitest/valid-expect": ["error", { maxArgs: 2 }],
    "vitest/require-to-throw-message": "off",
  },
  ignorePatterns: ["**/.next/**", "**/.turbo/**", "**/build/**", "**/dist/**"],
  settings: {
    next: { rootDir: [import.meta.dirname] },
  },
});
