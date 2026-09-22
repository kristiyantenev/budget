import { RuleTester } from "oxlint/plugins-dev";
import { describe, it } from "node:test";
import { jsMinMaxLoopRule } from "../src/rules/js-min-max-loop.ts";

RuleTester.describe = describe;
RuleTester.it = it;
const tester = new RuleTester({ languageOptions: { parserOptions: { lang: "tsx" } } });

tester.run("js-min-max-loop", jsMinMaxLoopRule, {
  valid: [
    "const sorted = items.toSorted(compare); ({ value: sorted[0] } = data);",
    "const sorted = items.toSorted(compare); (sorted[0] as number) = other;",
    "items.sort(compare)[0];",
    "const sorted = items.sort(compare); sorted[0];",
    "const sorted = [...items].sort(compare); consume(sorted);",
    "const sorted = items.toSorted(compare); sorted[1];",
    "const sorted = items.toSorted(compare); sorted.map(render);",
    "const sorted = items.toSorted(compare); sorted[0] = other;",
    "const sorted = items.toSorted(compare); sorted[0]++;",
    "const sorted = items.toSorted(compare); delete sorted[0];",
    "const sorted = items.toSorted(compare); sorted.at(2);",
    "const sorted = items.toSorted(compare); sorted.length;",
    "const sorted = items.toSorted(compare); sorted[other.length - 1];",
    "const sorted = items.toSorted(compare); sorted[0]; function f(sorted) { sorted[1]; } consume(sorted);",
    "export const sorted = items.toSorted(compare); sorted[0];",
    "items.toSorted(compare)?.[0];",
    "items.toSorted(compare).at(...args);",
    "items.toSorted(compare).at(-2);",
  ],
  invalid: [
    "[...items].sort(compare)[0];",
    "items.toSorted(compare)[0];",
    "items.toSorted(compare).at(-1);",
    "items.toSorted(compare).at(0);",
    "const sorted = [...items].sort(compare); sorted[0];",
    "const sorted = items.toSorted(compare); sorted[sorted.length - 1];",
    "const sorted = items.toSorted(compare); consume(sorted[0], sorted[sorted.length - 1]);",
    "const sorted = items.toSorted(compare); sorted.at(-1);",
    "const sorted = items.toSorted(compare); sorted[0]; function f(sorted) { return sorted[1]; }",
    "(items.toSorted(compare) as number[])[0];",
    "const sorted = items.toSorted(compare) as number[]; sorted[0];",
    "((items.toSorted(compare) as number[])!)[0];",
    "const sorted = items.toSorted(compare); (sorted as number[])![0];",
    "const sorted = items.toSorted(compare); sorted[(sorted as number[])!.length - 1];",
  ].map((code) => ({ code, errors: [{ messageId: "extrema" }], output: null })),
});
