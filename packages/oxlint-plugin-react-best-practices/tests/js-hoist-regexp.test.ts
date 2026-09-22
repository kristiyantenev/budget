import { RuleTester } from "oxlint/plugins-dev";
import { describe, it } from "node:test";
import { jsHoistRegexpRule } from "../src/rules/js-hoist-regexp.ts";

RuleTester.describe = describe;
RuleTester.it = it;
const tester = new RuleTester({ languageOptions: { parserOptions: { lang: "tsx" } } });

tester.run("js-hoist-regexp", jsHoistRegexpRule, {
  valid: [
    'import { memo } from "other"; const Search = memo(({ text }) => /hello/.test(text));',
    'import { memo } from "react"; function wrap(memo) { return memo(({ text }) => /hello/.test(text)); }',

    "const regex = /hello/i; function Search({ text }) { return regex.test(text); }",
    "function Search({ text }) { const regex = /hello/g; return regex.test(text); }",
    "function Search({ text }) { const regex = /hello/y; return regex.exec(text); }",
    'function Search({ text }) { const regex = new RegExp("hello", "gi"); return regex.test(text); }',
    "function Search({ text }) { const regex = new RegExp(query); return regex.test(text); }",
    'function Search({ text }) { const regex = new RegExp("hello", flags); return regex.test(text); }',
    "function Search({ text }) { const regex = /hello/; regex.lastIndex = 0; return regex.test(text); }",
    "function Search({ text }) { const regex = /hello/; log(regex.lastIndex); return regex.test(text); }",
    "function Search({ text }) { const regex = /hello/; return regex; }",
    "function Search({ text }) { const regex = /hello/; return text.split(regex); }",
    "function Search({ text }) { const regex = /hello/; const alias = regex; return alias.test(text); }",
    'function Search({ text }) { const regex = /hello/; regex.compile("other"); return regex.test(text); }',
    "function Search({ text }) { const regex = /hello/; regex.test = custom; return regex.test(text); }",
    "function Search({ text }) { return useMemo(() => /hello/.test(text), [text]); }",
    "function Search({ text }) { const onClick = () => /hello/.test(text); return onClick; }",
    "function search(text) { return /hello/.test(text); }",
    'function Search(RegExp) { const regex = new RegExp("hello"); return regex.test(text); }',
    "function Search({ text }) { const regex = /hello/; return regex.test?.(text); }",
    "function Search({ text }) { const regex = /hello/; return regex.test(...args); }",
    "function Search({ text }) { let regex = /hello/; return regex.test(text); }",
    "function Search({ text }) { const regex = /hello/; }",
    'function Search({ text }) { const regex = new RegExp("hello", "ii"); return regex.test(text); }',
    'function Search({ text }) { const regex = new RegExp("hello", "uv"); return regex.test(text); }',
  ],
  invalid: [
    "function Search({ text }) { const regex = /hello/i; return regex.test(text); }",
    "function Search({ text }) { const regex = /hello/; return regex.exec(text); }",
    "function Search({ text }) { return /hello/i.test(text); }",
    'function Search({ text }) { const regex = new RegExp("hello", "i"); return regex.test(text); }',
    'function Search({ text }) { const regex = RegExp("hello"); return regex.test(text); }',
    'function Search({ text }) { const pattern = "hello"; const regex = new RegExp(pattern); return regex.test(text); }',
    'function Search({ text }) { const regex = /hello/ as RegExp; return regex["test"](text); }',
    "const Search = ({ text }) => /hello/.test(text);",
    "export default function ({ text }) { return /hello/.test(text); }",
    'import { memo } from "react"; const Search = memo(({ text }) => /hello/.test(text));',
    'import { forwardRef as wrap } from "react"; const Search = wrap(({ text }) => /hello/.test(text));',
  ].map((code) => ({ code, errors: [{ messageId: "hoist" }], output: null })),
});
