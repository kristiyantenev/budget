import { RuleTester } from "oxlint/plugins-dev";
import { describe, it } from "node:test";
import { jsBatchDomCssRule } from "../src/rules/js-batch-dom-css.ts";

RuleTester.describe = describe;
RuleTester.it = it;
const tester = new RuleTester({ languageOptions: { parserOptions: { lang: "tsx" } } });

tester.run("js-batch-dom-css", jsBatchDomCssRule, {
  valid: [
    'function f(el: HTMLElement) { el.style.width = "1px"; el.style.height = "2px"; const width = el.offsetWidth; }',
    'function f(el: HTMLElement) { const width = el.offsetWidth; el.style.width = "1px"; el.style.height = "2px"; }',
    'function f(el: HTMLElement) { el.style.width = "1px"; el.style.height = "2px"; }',
    'function f(el: HTMLElement) { el.style.width = "1px"; const width = el.offsetWidth; }',
    'function f(el: HTMLElement) { el.style.width = "1px"; const width = el.offsetWidth; el.style.height = `${width}px`; }',
    'function f(el: HTMLElement) { el.style.width = "1px"; const { width } = el.getBoundingClientRect(); el.style.height = `${width}px`; }',
    'function f(a: HTMLElement, b: HTMLElement) { a.style.width = "1px"; const width = a.offsetWidth; b.style.height = "2px"; }',
    'function f(el) { el.style.width = "1px"; const width = el.offsetWidth; el.style.height = "2px"; }',
    'const el = { style: {}, offsetWidth: 1 }; function f() { el.style.width = "1px"; const width = el.offsetWidth; el.style.height = "2px"; }',
    'function f(el: HTMLElement) { el.style.width = "1px"; doWork(); const width = el.offsetWidth; el.style.height = "2px"; }',
    'function f(el: HTMLElement) { el.style.width = "1px"; const width = el.offsetWidth; if (flag) { el.style.height = "2px"; } }',
    'function f(el: HTMLElement) { el.style.width = "1px"; const read = () => el.offsetWidth; el.style.height = "2px"; }',
    'function f(el: HTMLElement) { el.style.width = "1px"; const width = el.id; el.style.height = "2px"; }',
    'type HTMLElement = { style: any; offsetWidth: number }; function f(el: HTMLElement) { el.style.width = "1px"; const width = el.offsetWidth; el.style.height = "2px"; }',
    'function f(el: HTMLElement, getComputedStyle) { el.style.width = "1px"; const style = getComputedStyle(el); el.style.height = "2px"; }',
    'function restart(el: HTMLElement) { el.style.animation = "none"; el.offsetHeight; el.style.animation = ""; }',
    'function restart(el: HTMLElement) { el.style.transition = "none"; void el.offsetWidth; el.style.transition = ""; }',
    'function restart(el: HTMLElement) { el.style.transition = "none"; el.getBoundingClientRect(); el.style.transition = ""; }',
  ],
  invalid: [
    'function f(el: HTMLElement) { el.style.width = "1px"; const width = el.offsetWidth; el.style.height = "2px"; const height = el.offsetHeight; }',
    'function f(el: HTMLElement) { el.style.width = "1px"; const rect = el.getBoundingClientRect(); el.style.height = "2px"; }',
    'function f(el: HTMLElement) { el.style.width = "1px"; const style = getComputedStyle(el); el.style.height = "2px"; }',
    'function f(el: HTMLDivElement) { el.style.width = "1px"; const width = el.clientWidth; el.style.height = "2px"; }',
    'const el = document.getElementById("box"); function f() { el.style.width = "1px"; const width = el.offsetWidth; el.style.height = "2px"; }',
    'function f() { document.body.style.width = "1px"; const width = document.body.offsetWidth; document.body.style.height = "2px"; }',
    'function f(el: HTMLElement) { el["style"]["width"] = "1px"; const width = el["offsetWidth"]; el.style.height = "2px"; }',
    'import { useRef, useEffect } from "react"; function Box() { const ref = useRef<HTMLDivElement>(null); useEffect(() => { if (ref.current) { ref.current.style.width = "1px"; const width = ref.current.offsetWidth; ref.current.style.height = "2px"; } }, []); }',
    'function f(el: HTMLElement) { el!.style.width = "1px"; const width = el!.offsetWidth; el!.style.height = "2px"; }',
  ].map((code) => ({ code, errors: [{ messageId: "interleaved" }], output: null })),
});
