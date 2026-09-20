import sharedConfig from "@workspace/oxlint-config";
import { defineConfig } from "oxlint";

export default defineConfig({
  extends: [sharedConfig],
  plugins: ["react", "jsx-a11y"],
  jsPlugins: [import.meta.resolve("@shadcn/lint")],
  rules: {
    "react/react-in-jsx-scope": "off",
    "shadcn/no-restyle": ["error", { allow: ["layout"] }],
  },
  overrides: [{ files: ["src/components/**"], rules: { "shadcn/no-restyle": "off" } }],
  ignorePatterns: ["**/.turbo/**", "**/build/**", "**/dist/**"],
});
