import { RuleTester } from "oxlint/plugins-dev";
import { describe, it } from "node:test";
import { bundleAnalyzablePathsRule } from "../src/rules/bundle-analyzable-paths.ts";

RuleTester.describe = describe;
RuleTester.it = it;
const tester = new RuleTester({ languageOptions: { parserOptions: { lang: "ts" } } });

tester.run("bundle-analyzable-paths", bundleAnalyzablePathsRule, {
  valid: [
    'import("./page");',
    "import(`./page`);",
    'const pages = { home: () => import("./home"), settings: () => import("./settings") }; pages[name]();',
    'require("node:fs");',
    "function load(require, path) { return require(path); }",
    'import path from "node:path"; path.join(process.cwd(), "content", "blog");',
    'import { join } from "node:path"; const dir = flag ? join(process.cwd(), "content/blog") : join(process.cwd(), "content/docs");',
    'import path from "node:path"; path.join(otherRoot, variable);',
    'import path from "node:path"; function f(process) { path.join(process.cwd(), variable); }',
    'import { join } from "node:path"; function f(join) { join(process.cwd(), variable); }',
    'import { join } from "other"; join(process.cwd(), variable);',
    'import path from "node:path"; path.join(process.cwd());',
  ],
  invalid: [
    { code: 'const paths = { home: "./home" }; import(paths[name]);', messageId: "modulePath" },
    { code: 'const path = "./home"; import(path);', messageId: "modulePath" },
    { code: "import(`./pages/${name}`);", messageId: "modulePath" },
    { code: 'import("./pages/" + name);', messageId: "modulePath" },
    { code: "require(path);", messageId: "modulePath" },
    {
      code: 'import { join } from "node:path"; join(process.cwd(), "content/" + kind);',
      messageId: "filePath",
    },
    { code: 'import path from "path"; path.join(process.cwd(), folder);', messageId: "filePath" },
    {
      code: 'import * as path from "node:path"; path["join"](process.cwd(), folder);',
      messageId: "filePath",
    },
    {
      code: 'import { join as combine } from "node:path"; combine(process.cwd(), `content/${kind}`);',
      messageId: "filePath",
    },
    {
      code: 'import path from "node:path"; path.join(process.cwd(), ...segments);',
      messageId: "filePath",
    },
  ].map(({ code, messageId }) => ({ code, errors: [{ messageId }], output: null })),
});
