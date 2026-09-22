import { RuleTester } from "oxlint/plugins-dev";
import { describe, it } from "node:test";
import { serverCacheReactRule } from "../src/rules/server-cache-react.ts";

RuleTester.describe = describe;
RuleTester.it = it;
const tester = new RuleTester({ languageOptions: { parserOptions: { lang: "tsx" } } });
const imports = 'import { cache } from "react"; const get = cache(fetchData);';

tester.run("server-cache-react", serverCacheReactRule, {
  valid: [
    `${imports} get(1, "a", true, null);`,
    `${imports} const params = { id: 1 }; get(params);`,
    `${imports} get(...args);`,
    `${imports} get(buildParams());`,
    `${imports} get(new CustomClass());`,
    `${imports} function f(get) { get({}); }`,
    'import { cache } from "other"; const get = cache(fn); get({});',
    'import { cache } from "react"; function f(cache) { const get = cache(fn); get({}); }',
    'import { cache } from "react"; let get = cache(fn); get = other; get({});',
    'import React from "react"; function f(React) { const get = React.cache(fn); get({}); }',
    "const a = b; const b = a; a({});",
    "unknown({});",
  ],
  invalid: [
    `${imports} get({ id: 1 });`,
    `${imports} get([1]);`,
    `${imports} get(() => value);`,
    `${imports} get(function () {});`,
    `${imports} get(/foo/);`,
    `${imports} get({ id: 1 } as Params);`,
    `${imports} const alias = get; const second = alias; second({});`,
    'import { cache as memoize } from "react"; const get = memoize(fn); get({});',
    'import * as R from "react"; const get = R.cache(fn); get({});',
    'import React from "react"; const get = React["cache"](fn); get({});',
    'import { cache } from "react"; cache(fn)({});',
  ]
    .map((code) => ({ code, errors: [{ messageId: "fresh" }], output: null }))
    .concat([
      {
        code: `${imports} get({}, []);`,
        errors: [{ messageId: "fresh" }, { messageId: "fresh" }],
        output: null,
      },
    ]),
});
