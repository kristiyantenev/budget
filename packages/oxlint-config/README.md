# Shared Oxlint config

Add `@workspace/oxlint-config` as a `workspace:*` development dependency and
`oxlint` as a development dependency in the consuming package. Create
`oxlint.config.ts` there:

```typescript
import sharedConfig from "@workspace/oxlint-config";
import { defineConfig } from "oxlint";

export default defineConfig({
  extends: [sharedConfig],
});
```

Run `oxlint .` from the package directory. Avoid `--config`, which disables
[nested config discovery](https://oxc.rs/docs/guide/usage/linter/nested-config.html).

The shared config supplies rule categories, TypeScript, Unicorn, Oxc, and the custom
code-standards plugin and rules. The plugin lives in `plugins/code-standards`
inside this package. The root, web, and UI configs extend `@workspace/oxlint-config`
directly. Web and UI add React and JSX accessibility plugins, plus the shadcn
JavaScript plugin and enable `no-restyle`,
allowing layout classes. UI disables that rule in `src/components/**` for component
authoring. The plugin discovers component aliases and themes from each package's
`components.json`. Web also enables the built-in Next.js and Vitest plugins. Keep
project-specific `settings` and `overrides` in the consuming config.

Ignore patterns are not inherited through `extends`. Set `ignorePatterns` in the
consuming config to skip generated output and agent directories. Patterns are
relative to that config's directory.

The optional Effect plugin is available through `@workspace/oxlint-config/effect`.
Add `import.meta.resolve("@workspace/oxlint-config/effect")` to `jsPlugins` and
enable the desired `code-standards-effect/*` rules to use it.

This is a private workspace package. It requires Node.js 24 or newer, as the
repository does, and Oxlint 1.82 or newer within version 1.
