import { RuleTester } from "oxlint/plugins-dev";
import { describe, it } from "node:test";
import { rerenderFunctionalSetstateRule } from "../src/rules/rerender-functional-setstate.ts";

RuleTester.describe = describe;
RuleTester.it = it;
const tester = new RuleTester({ languageOptions: { parserOptions: { lang: "tsx" } } });

tester.run("rerender-functional-setstate", rerenderFunctionalSetstateRule, {
  valid: [
    'import { useState } from "react"; function Counter() { const [count, setCount] = useState(0); setCount(1); }',
    'import { useState } from "react"; function Counter() { const [count, setCount] = useState(0); setCount(count); }',
    'import { useState } from "react"; function Counter() { const [count, setCount] = useState(0); setCount(previous => previous + 1); }',
    'import { useState } from "react"; function Counter() { const [count, setCount] = useState(0); setCount(() => count + 1); }',
    'import { useState } from "react"; function Counter() { const [count, setCount] = useState(0); setCount({ read: () => count }); }',
    'import { useState } from "react"; function Counter() { const [count, setCount] = useState(0); function f(count) { setCount(count + 1); } }',
    'import { useState } from "react"; function Counter() { const [count, setCount] = useState(0); function f(setCount) { setCount(count + 1); } }',
    'import { useState } from "react"; function Counter() { const [count, setCount] = useState(0); const previous = count; setCount(previous + 1); }',
    'import { useState } from "react"; function Counter() { const [count, setCount] = useState(0); setCount(...args); }',
    'import { useState } from "react"; function Counter() { const [count, setCount] = useState(0); setCount?.(count + 1); }',
    'import { useState } from "react"; function Counter() { const [count, setCount] = useState(0); const a = b; const b = a; a(count + 1); }',
    'import { useState } from "other"; const [count, setCount] = useState(0); setCount(count + 1);',
    'import { useState } from "react"; function F(useState) { const [count, setCount] = useState(0); setCount(count + 1); }',
    'import { useState } from "react"; let [count, setCount] = useState(0); setCount(count + 1);',
    'import { useReducer } from "react"; const [count, dispatch] = useReducer(reducer, 0); dispatch(count + 1);',
    'import { useState } from "react"; const [, setCount] = useState(0); setCount(count + 1);',
    'import { useState } from "react"; function Counter() { const [count, setCount] = useState(0); let update = setCount; update = other; update(count + 1); }',
  ],
  invalid: [
    'import { useState } from "react"; function Counter() { const [count, setCount] = useState(0); setCount(count + 1); }',
    'import { useState } from "react"; function Counter() { const [count, setCount] = useState(0); setCount(!count); }',
    'import { useState } from "react"; function Counter() { const [count, setCount] = useState(0); const onClick = () => setCount(count + 1); }',
    'import { useState } from "react"; function Counter() { const [count, setCount] = useState(0); const update = setCount; update(count + 1); }',
    'import { useState } from "react"; function Counter() { const [count, setCount] = useState(0); const update = setCount; const alias = update; alias(count + 1); }',
    'import { useState } from "react"; function Counter() { const [count, setCount] = useState(0); setCount((count + 1) as number); }',
    'import { useState } from "react"; const [items, setItems] = useState([]); setItems([...items, item]);',
    'import { useState } from "react"; const [items, setItems] = useState([]); setItems(items.filter(item => item.id !== id));',
    'import { useState } from "react"; const [user, setUser] = useState({}); setUser({ ...user, name });',
    'import { useState as state } from "react"; const [count, setCount] = state(0); setCount(count + 1);',
    'import * as R from "react"; const [count, setCount] = R.useState(0); setCount(count + 1);',
    'import React from "react"; const [count, setCount] = React["useState"](0); setCount(count + 1);',
    'import { useState, useCallback } from "react"; function F() { const [count, setCount] = useState(0); return useCallback(() => setCount(count + 1), [count]); }',
  ].map((code) => ({ code, errors: [{ messageId: "functional" }], output: null })),
});
