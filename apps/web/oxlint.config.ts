import sharedConfig from "@workspace/oxlint-config";
import { defineConfig } from "oxlint";

export default defineConfig({
  extends: [sharedConfig],
  jsPlugins: [
    import.meta.resolve("@shadcn/lint"),
    import.meta.resolve("@workspace/oxlint-plugin-react-best-practices"),
  ],
  plugins: ["react", "nextjs", "jsx-a11y", "vitest"],
  rules: {
    "react/react-in-jsx-scope": "off",
    "react-best-practices/advanced-event-handler-refs": "error",
    "react-best-practices/bundle-analyzable-paths": "error",
    "react-best-practices/client-localstorage-schema": "error",
    "react-best-practices/client-passive-event-listeners": "error",
    "react-best-practices/js-batch-dom-css": "warn",
    "react-best-practices/js-combine-iterations": "warn",
    "react-best-practices/js-hoist-regexp": "error",
    "react-best-practices/js-index-maps": "error",
    "react-best-practices/js-min-max-loop": "error",
    "react-best-practices/js-set-map-lookups": "error",
    "react-best-practices/rendering-animate-svg-wrapper": "error",
    "react-best-practices/rendering-conditional-render": "error",
    "react-best-practices/rerender-dependencies": "error",
    "react-best-practices/rerender-derived-state": "error",
    "react-best-practices/rerender-functional-setstate": "error",
    "react-best-practices/rerender-lazy-state-init": "warn",
    "react-best-practices/rerender-simple-expression-in-memo": "error",
    "react-best-practices/rerender-split-combined-hooks": "error",
    "react-best-practices/server-cache-react": "error",
    "shadcn/no-restyle": ["error", { allow: ["layout"] }],
    "vitest/valid-expect": ["error", { maxArgs: 2 }],
    "vitest/require-to-throw-message": "off",
  },
  ignorePatterns: ["**/.next/**", "**/.turbo/**", "**/build/**", "**/dist/**"],
  settings: {
    next: { rootDir: [import.meta.dirname] },
  },
});
