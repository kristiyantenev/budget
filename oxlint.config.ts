import sharedConfig from "@workspace/oxlint-config";
import { defineConfig } from "oxlint";

export default defineConfig({
  extends: [sharedConfig],
  ignorePatterns: [
    ".agents/**",
    ".claude/**",
    "**/.turbo/**",
    "**/build/**",
    "**/dist/**",
    "**/.gradle/**",
    "gradle/**",
  ],
});
