# React best practices plugin

Private workspace plugin for converting some well known React pitfalls into Oxlint checks.

Consumers should register the plugin and choose rules explicitly, following [Oxlint's plugin configuration](https://oxc.rs/docs/guide/usage/linter/js-plugins.html).
It is independent of `@workspace/oxlint-config` and is not enabled by the base config.

Add `@workspace/oxlint-plugin-react-best-practices` as a `workspace:*` development
dependency, then configure it:

```ts
import { defineConfig } from "oxlint";

export default defineConfig({
  jsPlugins: [import.meta.resolve("@workspace/oxlint-plugin-react-best-practices")],
  rules: {
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
  },
});
```

## Rules

| Rule                                                                                   | Pattern checked                                                                |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| [advanced-event-handler-refs](docs/rules/advanced-event-handler-refs.md)               | A matching browser subscription effect depends on its handler.                 |
| [bundle-analyzable-paths](docs/rules/bundle-analyzable-paths.md)                       | Non-literal module paths and dynamic segments joined to `process.cwd()`.       |
| [client-localstorage-schema](docs/rules/client-localstorage-schema.md)                 | Uncaught storage calls and unversioned static write keys.                      |
| [client-passive-event-listeners](docs/rules/client-passive-event-listeners.md)         | A scrolling listener with a locally inspectable handler and no passive option. |
| [js-batch-dom-css](docs/rules/js-batch-dom-css.md)                                     | A layout read between style writes to the same DOM target.                     |
| [js-combine-iterations](docs/rules/js-combine-iterations.md)                           | Consecutive independent map/filter passes over the same collection.            |
| [js-hoist-regexp](docs/rules/js-hoist-regexp.md)                                       | Static stateless RegExp creation during render, used only by test/exec.        |
| [js-index-maps](docs/rules/js-index-maps.md)                                           | A property-equality find inside iteration over another collection.             |
| [js-min-max-loop](docs/rules/js-min-max-loop.md)                                       | A fresh sorted array used only to read its endpoints.                          |
| [js-set-map-lookups](docs/rules/js-set-map-lookups.md)                                 | Per-item includes calls on a locally recognized array.                         |
| [rendering-animate-svg-wrapper](docs/rules/rendering-animate-svg-wrapper.md)           | Explicit inline CSS animation or transition on an SVG root.                    |
| [rendering-conditional-render](docs/rules/rendering-conditional-render.md)             | Numeric JSX conditions that can render through &&.                             |
| [rerender-dependencies](docs/rules/rerender-dependencies.md)                           | An effect depends on an object but only reads its static properties.           |
| [rerender-derived-state](docs/rules/rerender-derived-state.md)                         | An external-store snapshot is used only for a boolean comparison.              |
| [rerender-functional-setstate](docs/rules/rerender-functional-setstate.md)             | A direct update expression reads its paired React state binding.               |
| [rerender-lazy-state-init](docs/rules/rerender-lazy-state-init.md)                     | A direct call or construction passed to React useState.                        |
| [rerender-simple-expression-in-memo](docs/rules/rerender-simple-expression-in-memo.md) | React useMemo around a small, syntactically primitive expression.              |
| [rerender-split-combined-hooks](docs/rules/rerender-split-combined-hooks.md)           | Two memoized array stages with different reactive inputs.                      |
| [server-cache-react](docs/rules/server-cache-react.md)                                 | Fresh reference literals passed to a locally resolved React-cached function.   |

## Adding a rule

1. Define the enforceable behavior and its limits in `docs/rules/<name>.md`.
2. Implement `src/rules/<name>.ts` and export it from `src/index.ts`.
3. Add valid and invalid cases in `tests/<name>.test.ts`, using `oxlint/plugins-dev`.
4. Enable it in the appropriate consuming configs.

Shared syntax helpers belong in `src/shared/`. Tests use Node's test runner and
Oxlint's own parser and rule execution. No build step is needed with Node.js 24.

```sh
pnpm --filter @workspace/oxlint-plugin-react-best-practices test
pnpm --filter @workspace/oxlint-plugin-react-best-practices typecheck
pnpm --filter @workspace/oxlint-plugin-react-best-practices lint
```

Turbo includes this package in `pnpm test`, `pnpm typecheck`, and `pnpm lint`.
Its source files also participate in the consumers' lint cache inputs.
