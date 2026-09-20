import { defineConfig } from "oxfmt";

export default defineConfig({
  printWidth: 100,
  useTabs: false,
  singleQuote: false,
  jsxSingleQuote: false,
  quoteProps: "as-needed",
  trailingComma: "all",
  semi: true,
  arrowParens: "always",
  sortImports: {
    newlinesBetween: false,
    groups: [
      ["type-external", "value-external"],
      ["type-builtin", "value-builtin"],
      ["type-internal", "value-internal"],
      ["type-parent", "type-sibling", "type-index"],
      ["value-parent", "value-sibling", "value-index"],
      "side_effect_style",
      "unknown",
    ],
  },
  sortPackageJson: {
    sortScripts: true,
  },
  ignorePatterns: [
    ".agents/**",
    ".claude/**",
    "**/.next/**",
    "**/.turbo/**",
    "**/build/**",
    "**/dist/**",
    "gradle/**",
    "**/.gradle/**",
  ],
});
