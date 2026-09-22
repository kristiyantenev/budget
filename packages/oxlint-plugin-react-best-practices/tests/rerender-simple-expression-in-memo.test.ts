import { RuleTester } from "oxlint/plugins-dev";
import { describe, it } from "node:test";
import { rerenderSimpleExpressionInMemoRule } from "../src/rules/rerender-simple-expression-in-memo.ts";

RuleTester.describe = describe;
RuleTester.it = it;
const tester = new RuleTester({ languageOptions: { parserOptions: { lang: "tsx" } } });
const imports = 'import { useMemo } from "react";';

tester.run("rerender-simple-expression-in-memo", rerenderSimpleExpressionInMemoRule, {
  valid: [
    `${imports} useMemo(() => compute(value), [value]);`,
    `${imports} useMemo(() => ({ value }), [value]);`,
    `${imports} useMemo(() => [value], [value]);`,
    `${imports} useMemo(() => value, [value]);`,
    `${imports} useMemo(() => a || b, [a, b]);`,
    `${imports} useMemo(() => user.enabled || other.enabled, [user, other]);`,
    `${imports} useMemo(() => obj.value === 0, [obj]);`,
    `${imports} useMemo(() => a + b, [a, b]);`,
    `${imports} useMemo(() => a == b, [a, b]);`,
    `${imports} useMemo(() => /foo/, []);`,
    `${imports} useMemo(() => !read(), [value]);`,
    `${imports} useMemo(() => { track(); return true; }, []);`,
    `${imports} useMemo(async () => true, []);`,
    `${imports} useMemo(function* () { return true; }, []);`,
    `${imports} useMemo((value = compute()) => !value, []);`,
    `${imports} useMemo(() => !value, dependencies);`,
    `${imports} useMemo(() => !value, [...dependencies]);`,
    `${imports} useMemo(() => !value);`,
    `${imports} useMemo(() => !!!!!value, [value]);`,
    imports + " useMemo(() => `value: ${value}`, [value]);",
    `${imports} function f(useMemo) { useMemo(() => true, []); }`,
    'import { useMemo } from "other"; useMemo(() => true, []);',
  ],
  invalid: [
    `${imports} useMemo(() => true, []);`,
    `${imports} useMemo(() => null, []);`,
    `${imports} useMemo(() => 42, []);`,
    `${imports} useMemo(() => "ready", []);`,
    imports + " useMemo(() => `ready`, []);",
    `${imports} useMemo(() => !value, [value]);`,
    `${imports} useMemo(() => typeof value, [value]);`,
    `${imports} useMemo(() => a === b, [a, b]);`,
    `${imports} useMemo(() => a !== b && !loading, [a, b, loading]);`,
    `${imports} useMemo(() => flag ? "yes" : "no", [flag]);`,
    `${imports} useMemo(() => { return !value; }, [value]);`,
    `${imports} useMemo(() => (!value as boolean), [value]);`,
    'import { useMemo as memo } from "react"; memo(() => !value, [value]);',
    'import * as R from "react"; R.useMemo(() => !value, [value]);',
    'import React from "react"; React["useMemo"](() => !value, [value]);',
  ].map((code) => ({ code, errors: [{ messageId: "simple" }], output: null })),
});
