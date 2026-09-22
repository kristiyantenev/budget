import { RuleTester } from "oxlint/plugins-dev";
import { describe, it } from "node:test";
import { clientPassiveEventListenersRule } from "../src/rules/client-passive-event-listeners.ts";

RuleTester.describe = describe;
RuleTester.it = it;
const tester = new RuleTester({ languageOptions: { parserOptions: { lang: "tsx" } } });

tester.run("client-passive-event-listeners", clientPassiveEventListenersRule, {
  valid: [
    'document.addEventListener("wheel", (e) => console.log(e.deltaY), { passive: true });',
    'document.addEventListener("wheel", (e) => console.log(e.deltaY), { passive: false });',
    'document.addEventListener("wheel", (e) => e.preventDefault());',
    'document.addEventListener("wheel", (e) => { e.returnValue = false; });',
    'document.addEventListener("wheel", (e) => cancel(e));',
    'document.addEventListener("wheel", (e) => { const alias = e; alias.preventDefault(); });',
    'document.addEventListener("wheel", ({ preventDefault }) => preventDefault());',
    'document.addEventListener("wheel", (...args) => args[0].preventDefault());',
    'document.addEventListener("wheel", function () { arguments[0].preventDefault(); });',
    'document.addEventListener("wheel", () => window.event.preventDefault());',
    'document.addEventListener("wheel", () => event.preventDefault());',
    'document.addEventListener("wheel", (e) => e[method]());',
    'document.addEventListener("wheel", handler);',
    'import handler from "./handler"; document.addEventListener("wheel", handler);',
    'document.addEventListener("wheel", { handleEvent(e) { e.preventDefault(); } });',
    'document.addEventListener("wheel", () => work(), options);',
    'document.addEventListener("wheel", () => work(), { ...options });',
    'document.addEventListener("click", () => work());',
    'function f(document) { document.addEventListener("wheel", () => work()); }',
    'const bus = { addEventListener() {} }; bus.addEventListener("wheel", () => work());',
    'document.removeEventListener("wheel", handler);',
    'const a = b; const b = a; document.addEventListener("wheel", a);',
    'let handler = () => work(); handler = cancel; document.addEventListener("wheel", handler);',
    "document.addEventListener(eventName, () => work());",
    'type HTMLElement = { addEventListener: Function }; function f(el: HTMLElement) { el.addEventListener("wheel", () => work()); }',
  ],
  invalid: [
    ...[
      ['document.addEventListener("mousewheel", () => work(), false);', "passive"],
      ['document.addEventListener("wheel", () => work(), true);', "passiveCapture"],
      ['document.addEventListener("wheel", () => work(), (true));', "passiveCapture"],
      ['document.addEventListener("wheel", () => work(), { capture: true });', "passiveProperty"],
      ['document.addEventListener("wheel", () => work(), { once: true });', "passiveProperty"],
      ['document.addEventListener("wheel", () => work(), {});', "passiveProperty"],
    ].map(([code, messageId]) => ({ code: code!, errors: [{ messageId: messageId! }] })),
    ...[
      'document.addEventListener("wheel", (e) => console.log(e.deltaY));',
      'window.addEventListener("touchstart", (e) => console.log(e.touches[0].clientX));',
      'document.addEventListener("touchmove", () => work());',
      'const handler = (e: WheelEvent) => console.log(e.deltaY); document.addEventListener("wheel", handler);',
      'function handler(e: WheelEvent) { console.log(e.deltaY); } document.addEventListener("wheel", handler);',
      'const handler = (e) => console.log(e.deltaY); const alias = handler; document.addEventListener("wheel", alias);',
      'function attach(el: HTMLElement) { el.addEventListener("wheel", () => work()); }',
      'const el = document.querySelector(".box"); el?.addEventListener("wheel", () => work());',
      'const el = document.createElement("div"); el.addEventListener("wheel", () => work());',
      'import { useRef } from "react"; function Box() { const ref = useRef<HTMLDivElement>(null); ref.current?.addEventListener("wheel", () => work()); }',
      'document["addEventListener"]("wheel", () => work());',
      'const EVENT = "wheel"; document.addEventListener(EVENT, () => work());',
    ].map((code) => ({ code, errors: [{ messageId: "passive" }] })),
  ].map((testCase) => ({ ...testCase, output: null })),
});
