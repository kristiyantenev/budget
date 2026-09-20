import { defineConfig } from "oxlint";

export default defineConfig({
  categories: {
    correctness: "error",
    nursery: "off",
    pedantic: "off",
    perf: "off",
    restriction: "off",
    style: "off",
    suspicious: "error",
  },
  plugins: ["typescript", "unicorn", "oxc"],
  jsPlugins: [
    {
      name: "workspace-specific",
      specifier: import.meta.resolve("./plugins/workspace-specific/index.ts"),
    },
  ],
  rules: {
    "unicorn/no-array-sort": "off",
    "unicorn/no-array-reverse": "off",
    "oxc/no-accumulating-spread": "error",
  },
  overrides: [
    {
      files: ["**/*"],
      excludeFiles: ["**/plugins/workspace-specific/**"],
      rules: {
        "workspace-specific/no-array-filter-map": "error",
        "workspace-specific/no-reduce-accumulator-copy": "error",
        "workspace-specific/no-chained-type-assertions": "error",
        "workspace-specific/no-known-value-widening": "error",
        "workspace-specific/no-module-mocking": "error",
        "workspace-specific/no-object-parameters": "error",
        "workspace-specific/no-reflect-apply": "error",
        "workspace-specific/no-reflect-get": "error",
        "workspace-specific/no-shape-in-symbol-names": "error",
        "workspace-specific/no-unknown-parameters": "error",
        "workspace-specific/no-unknown-returns": "error",
        "workspace-specific/no-unknown-type-aliases": "error",
        "workspace-specific/no-unsafe-dictionary-type": "error",
        "workspace-specific/no-widen-then-assert": "error",
        "workspace-specific/require-safety-comment-for-type-assertion": "error",
      },
    },
  ],
});
