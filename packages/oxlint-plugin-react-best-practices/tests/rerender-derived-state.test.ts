import { RuleTester } from "oxlint/plugins-dev";
import { describe, it } from "node:test";
import { rerenderDerivedStateRule } from "../src/rules/rerender-derived-state.ts";

RuleTester.describe = describe;
RuleTester.it = it;
const tester = new RuleTester({ languageOptions: { parserOptions: { lang: "tsx" } } });

tester.run("rerender-derived-state", rerenderDerivedStateRule, {
  valid: [
    'import { useSyncExternalStore } from "react"; function F(subscribe, getWidth) { const width = useSyncExternalStore(subscribe, getWidth); return width; }',
    'import { useSyncExternalStore } from "react"; function F(subscribe, getWidth) { const width = useSyncExternalStore(subscribe, getWidth); const mobile = width < 768; return [mobile, width]; }',
    'import { useSyncExternalStore } from "react"; function F(subscribe, getWidth) { const width = useSyncExternalStore(subscribe, getWidth); const mobile = width < 768; const tiny = width < 400; return [mobile, tiny]; }',
    'import { useSyncExternalStore } from "react"; function F(subscribe, getWidth) { let width = useSyncExternalStore(subscribe, getWidth); const mobile = width < 768; return mobile; }',
    'import { useSyncExternalStore } from "react"; function F(subscribe, getWidth) { const width = useSyncExternalStore(subscribe, getWidth); const mobile = width < breakpoint; return mobile; }',
    'import { useSyncExternalStore } from "react"; function F(subscribe, getWidth) { const width = useSyncExternalStore(subscribe, getWidth); const mobile = width == 768; return mobile; }',
    'import { useSyncExternalStore } from "react"; function F(subscribe, getWidth) { const width = useSyncExternalStore(subscribe, getWidth); const mobile = () => width < 768; return mobile; }',
    'import { useSyncExternalStore } from "react"; function F(subscribe, getWidth) { const width = useSyncExternalStore(subscribe, getWidth); if (flag) { const mobile = width < 768; return mobile; } }',
    'import { useSyncExternalStore } from "react"; function F(subscribe, getWidth) { const width = useSyncExternalStore(subscribe, getWidth); const mobile = flag && width < 768; return mobile; }',
    'import { useSyncExternalStore } from "react"; function F(subscribe, getWidth) { const width = useSyncExternalStore(...args); const mobile = width < 768; return mobile; }',
    'import { useSyncExternalStore } from "react"; function F(subscribe, getWidth) { const width = useSyncExternalStore(subscribe); const mobile = width < 768; return mobile; }',
    'import { useSyncExternalStore } from "react"; function F(subscribe, getWidth) { const size = useSyncExternalStore(subscribe, getWidth); const mobile = size.width < 768; return mobile; }',
    'import { useSyncExternalStore } from "react"; function F(subscribe, getWidth) { const width = useSyncExternalStore(subscribe, () => getWidth() < 768); return width; }',
    'import { useSyncExternalStore } from "other"; function F() { const width = useSyncExternalStore(subscribe, getWidth); const mobile = width < 768; return mobile; }',
    'import { useSyncExternalStore } from "react"; function F(useSyncExternalStore) { const width = useSyncExternalStore(subscribe, getWidth); const mobile = width < 768; return mobile; }',
    'import { useSyncExternalStore } from "react"; const width = useSyncExternalStore(subscribe, getWidth); const mobile = width < 768;',
    "function F() { const width = useWindowWidth(); const mobile = width < 768; return mobile; }",
  ],
  invalid: [
    'import { useSyncExternalStore } from "react"; function F(subscribe, getWidth) { const width = useSyncExternalStore(subscribe, getWidth); const mobile = width < 768; return mobile; }',
    'import { useSyncExternalStore } from "react"; function F(subscribe, getWidth) { const width = useSyncExternalStore(subscribe, getWidth, () => 1024); const mobile = width < 768; return mobile; }',
    'import { useSyncExternalStore } from "react"; function F(subscribe, getWidth) { const width = useSyncExternalStore(subscribe, getWidth); const mobile = 768 > width; return mobile; }',
    'import { useSyncExternalStore } from "react"; function F(subscribe, getWidth) { const status = useSyncExternalStore(subscribe, getWidth); const active = status === "active"; return active; }',
    'import { useSyncExternalStore } from "react"; function F(subscribe, getWidth) { const width = useSyncExternalStore(subscribe, getWidth) as number; const mobile = (width as number) < 768; return mobile; }',
    'import { useSyncExternalStore as store } from "react"; function F() { const width = store(subscribe, getWidth); const mobile = width < 768; return mobile; }',
    'import * as R from "react"; function F() { const width = R.useSyncExternalStore(subscribe, getWidth); const mobile = width < 768; return mobile; }',
    'import React from "react"; function F() { const width = React["useSyncExternalStore"](subscribe, getWidth); const mobile = width < 768; return mobile; }',
  ].map((code) => ({ code, errors: [{ messageId: "snapshot" }], output: null })),
});
