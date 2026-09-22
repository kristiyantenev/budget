import { RuleTester } from "oxlint/plugins-dev";
import { describe, it } from "node:test";
import { rerenderLazyStateInitRule } from "../src/rules/rerender-lazy-state-init.ts";

RuleTester.describe = describe;
RuleTester.it = it;
const tester = new RuleTester({ languageOptions: { parserOptions: { lang: "tsx" } } });
const imports = 'import { useState } from "react";';

tester.run("rerender-lazy-state-init", rerenderLazyStateInitRule, {
  valid: [
    `${imports} useState(() => buildIndex(items));`,
    `${imports} useState(function () { return buildIndex(items); });`,
    `${imports} useState(initializer);`,
    `${imports} useState(props.value);`,
    `${imports} useState(0); useState({}); useState([]); useState();`,
    `${imports} useState(flag ? build() : fallback);`,
    `${imports} useState(useValue()); useState(React.use(context));`,
    'import { useState, use as read } from "react"; useState(read(context));',
    'import { useState, useContext as read } from "react"; useState(read(context));',
    `${imports} function f(useState) { useState(build()); }`,
    'import { useState } from "other"; useState(build());',
    'import React from "react"; function f(React) { React.useState(build()); }',
    `${imports} useState(...args);`,
    `${imports} useState(Boolean(value)); useState(Number(value)); useState(String(value));`,
  ],
  invalid: [
    `${imports} useState(buildIndex(items));`,
    `${imports} useState(new Map());`,
    `${imports} useState(JSON.parse(text));`,
    `${imports} useState(build?.());`,
    `${imports} useState(build() as Value);`,
    'import { useState as state } from "react"; state(build());',
    'import * as R from "react"; R.useState(build());',
    'import React from "react"; React["useState"](build());',
    `${imports} function f(Boolean) { useState(Boolean(value)); }`,
    `${imports} useState(new String(value));`,
  ].map((code) => ({ code, errors: [{ messageId: "lazy" }], output: null })),
});
