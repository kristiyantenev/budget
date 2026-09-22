# bundle-analyzable-paths

Requires string literals or template literals without interpolation in
`import()` and unshadowed global `require()` calls. For a dynamic module choice,
put each literal import in an explicit loader map.

```ts
// Reported
const page = await import(paths[name]);

// Allowed
const pages = {
  home: () => import("./home"),
  settings: () => import("./settings"),
};
const page = await pages[name]();
```

It also checks `join` imported from `node:path` or `path` when the first argument
is a direct call to the unshadowed global `process.cwd()`. Every following segment
must be literal:

```ts
import path from "node:path";

// Reported
path.join(process.cwd(), "content/" + kind);

// Allowed
kind === "blog"
  ? path.join(process.cwd(), "content/blog")
  : path.join(process.cwd(), "content/docs");
```

The check deliberately requires literals at these callsites, even when a variable
holds a constant string. It does not attempt to reproduce a bundler's constant
evaluation. Named import aliases and default/namespace path imports are supported.
Shadowed globals and unrelated `join` functions are skipped. Other filesystem
calls, path roots, `require.resolve`, and aliased `process` imports are outside
this first version.

No options or automatic fixes. Intentional runtime module loading can use an
Oxlint suppression with an explanation. This is a bundling convention, not a
claim that every dynamic import is invalid JavaScript.

References: [Next.js output tracing](https://nextjs.org/docs/app/api-reference/config/next-config-js/output),
[Next.js lazy loading](https://nextjs.org/docs/app/guides/lazy-loading).
