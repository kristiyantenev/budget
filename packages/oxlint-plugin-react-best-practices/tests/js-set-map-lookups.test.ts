import { RuleTester } from "oxlint/plugins-dev";
import { describe, it } from "node:test";
import { jsSetMapLookupsRule } from "../src/rules/js-set-map-lookups.ts";

RuleTester.describe = describe;
RuleTester.it = it;
const tester = new RuleTester({ languageOptions: { parserOptions: { lang: "tsx" } } });

tester.run("js-set-map-lookups", jsSetMapLookupsRule, {
  valid: [
    "const ids = [1, 2]; ids.includes(1);",
    'const text = "abc"; items.filter(item => text.includes(item));',
    "function f(ids: string, items) { return items.filter(item => ids.includes(item.id)); }",
    "function f(ids, items) { return items.filter(item => ids.includes(item.id)); }",
    "const ids = new Set([1]); items.filter(item => ids.has(item.id));",
    "const ids = [1]; items.filter(item => ids.includes(item.id, 1));",
    "const ids = [1]; items.filter(item => ids.includes(...args));",
    "const ids = [1]; items.filter(item => ids?.includes(item.id));",
    "const ids = [1]; items.map(item => () => ids.includes(item.id));",
    "items.filter(item => { const ids = [item.id]; return ids.includes(item.id); });",
    "let ids = [1]; ids = other; items.filter(item => ids.includes(item.id));",
    "type Array<T> = string; function f(ids: Array<number>, items) { return items.filter(item => ids.includes(item.id)); }",
    "const a = b; const b = a; items.filter(item => a.includes(item.id));",
    'const kinds = ["a", "b"]; items.filter(item => kinds.includes(item.kind));',
    'const kinds = ["a", "b", "c", "d", "e", "f", "g"]; const alias = kinds; items.filter(item => alias.includes(item.kind));',
    "function f(ids: string[], items, id) { return items.filter(item => ids.includes(id)); }",
    "function f(ids: string[], items, id) { for (const item of items) { consume(item, ids.includes(id)); } }",
    "function f(ids: string[], items) { return items.filter(item => ids.includes(pick(x => x))); }",
  ],
  invalid: [
    "const ids = [1, 2, 3, 4, 5, 6, 7, 8]; items.filter(item => ids.includes(item.id));",
    "const ids = [1, ...more]; items.filter(item => ids.includes(item.id));",
    "function f(ids: string[], items) { for (let i = 0; i < items.length; i++) { consume(ids.includes(items[i])); } }",
    "function f(ids: string[], items) { return items.filter(item => ids.includes(pick(x => x + item.id))); }",
    "function f(ids: string[], items) { return items.filter(item => ids.includes(item.id)); }",
    "function f(ids: ReadonlyArray<string>, items) { return items.filter(item => ids.includes(item.id)); }",
    "function f(ids: readonly number[], items) { for (const item of items) { consume(ids.includes(item.id)); } }",
    'const ids = [1, 2, 3, 4, 5, 6, 7, 8]; const allowed = ids; items.filter(item => allowed["includes"](item.id));',
    "function f({ ids }: { ids: string[] }, items) { return items.filter(item => ids.includes(item.id)); }",
  ].map((code) => ({ code, errors: [{ messageId: "lookup" }], output: null })),
});
