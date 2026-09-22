import { RuleTester } from "oxlint/plugins-dev";
import { describe, it } from "node:test";
import { renderingConditionalRenderRule } from "../src/rules/rendering-conditional-render.ts";

RuleTester.describe = describe;
RuleTester.it = it;
const tester = new RuleTester({ languageOptions: { parserOptions: { lang: "tsx" } } });

tester.run("rendering-conditional-render", renderingConditionalRenderRule, {
  valid: [
    "<div>{5 && <b />}</div>;",
    "const count = 1; <div>{count && <b />}</div>;",
    "const count = 0; <div>{(count || false) && <b />}</div>;",
    "function Badge({ visible }: { visible: boolean }) { return <div>{visible && <b />}</div>; }",
    "function Badge({ count }: { count: number }) { return <div>{count > 0 && <b />}</div>; }",
    "function Badge({ count }: { count: number }) { return <div>{!!count && <b />}</div>; }",
    "function Badge({ count }: { count: number }) { return <div>{count ? <b /> : null}</div>; }",
    "function Badge({ count }: { count: number }) { return <C value={count && <b />} />; }",
    "function Badge(count) { return <div>{count && <b />}</div>; }",
    "const count = false; <div>{count && <b />}</div>;",
    "const items = { length: false }; <div>{items.length && <b />}</div>;",
    "const count = 0; <div>{(count && <b />) || null}</div>;",
    "const count = 0; <div>{Boolean(count && <b />)}</div>;",
    "const count = 0; function F(count: boolean) { return <div>{count && <b />}</div>; }",
    "const one = 1; <div>{(flag ?? one) && <b />}</div>;",
  ],
  invalid: [
    "const count = 0; <div>{(count && <b />) ?? null}</div>;",
    "const count = 0; <div>{(flag || count) && <b />}</div>;",
    "const count = 0; <div>{(flag ? count : false) && <b />}</div>;",
    "function Badge({ count }: { count: number }) { return <div>{count && <b />}</div>; }",
    "function Badge({ count: n = 0 }: { count?: number }) { return <div>{n && <b />}</div>; }",
    "function Badge(count: number) { return <>{count && <b />}</>; }",
    "const count = 0; <div>{count && <b />}</div>;",
    "const count = 0; const alias = count; <div>{alias && <b />}</div>;",
    "const items = []; <div>{items.length && <b />}</div>;",
    "function F(items: string[]) { return <div>{items.length && <b />}</div>; }",
    'const text = "hello"; <div>{text.length && <b />}</div>;',
    "<div>{NaN && <b />}</div>;",
    "const count = 0; <div>{flag ? count && <b /> : null}</div>;",
    "const count = 0; <div>{visible && count && <b />}</div>;",
    "function F({ n }: { n?: number }) { return <div>{(n ?? 0) && <b />}</div>; }",
    "<div>{(flag ?? 0) && <b />}</div>;",
  ].map((code) => ({ code, errors: [{ messageId: "numeric" }], output: null })),
});
