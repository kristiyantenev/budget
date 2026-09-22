import { RuleTester } from "oxlint/plugins-dev";
import { describe, it } from "node:test";
import { advancedEventHandlerRefsRule } from "../src/rules/advanced-event-handler-refs.ts";

RuleTester.describe = describe;
RuleTester.it = it;
const tester = new RuleTester({ languageOptions: { parserOptions: { lang: "tsx" } } });

tester.run("advanced-event-handler-refs", advancedEventHandlerRefsRule, {
  valid: [
    'import { useEffect } from "react"; function external(e) {} function useEvent(event) { const handler = external; useEffect(() => { window.addEventListener(event, handler); return () => window.removeEventListener(event, handler); }, [event, handler]); }',
    'import { useEffect } from "react"; function useEvent(handler: (e: Event) => void, window) { useEffect(() => { window.addEventListener("click", handler); return () => window.removeEventListener("click", handler); }, [handler]); }',
    'import { useEffect } from "react"; function useEvent(handler: (e: Event) => void) { useEffect(() => { window.addEventListener("click", handler); return () => { window.removeEventListener("click", handler); track(); }; }, [handler]); }',

    'import { useEffect } from "react"; function useEvent(event: string, handler: (e: Event) => void) { useEffect(() => { window.addEventListener(event, handler); return () => window.removeEventListener(event, handler); }, [event]); }',
    'import { useEffect } from "react"; function useEvent(event: string, handler: (e: Event) => void) { useEffect(() => { window.addEventListener(event, handler); return () => document.removeEventListener(event, handler); }, [event, handler]); }',
    'import { useEffect } from "react"; function useEvent(event: string, handler: (e: Event) => void) { useEffect(() => { window.addEventListener(event, handler); return () => window.removeEventListener("other", handler); }, [event, handler]); }',
    'import { useEffect } from "react"; function useEvent(event: string, handler: (e: Event) => void) { useEffect(() => { window.addEventListener(event, handler); return () => window.removeEventListener(event, other); }, [event, handler]); }',
    'import { useEffect } from "react"; function useEvent(event: string, handler: (e: Event) => void) { useEffect(() => { window.addEventListener(event, handler, true); return () => window.removeEventListener(event, handler); }, [event, handler]); }',
    'import { useEffect } from "react"; function useEvent(event: string, handler: (e: Event) => void) { useEffect(() => { window.addEventListener(event, handler, { once: true }); return () => window.removeEventListener(event, handler); }, [event, handler]); }',
    'import { useEffect } from "react"; function useEvent(event: string, handler: (e: Event) => void) { useEffect(() => { window.addEventListener(event, handler, { signal }); return () => window.removeEventListener(event, handler); }, [event, handler]); }',
    'import { useEffect } from "react"; function useEvent(event: string, handler: (e: Event) => void) { useEffect(() => { window.addEventListener(event, handler, options); return () => window.removeEventListener(event, handler); }, [event, handler]); }',
    'import { useEffect } from "react"; function useEvent(event: string, handler: (e: Event) => void) { useEffect(() => { window.addEventListener(event, handler, { ...options }); return () => window.removeEventListener(event, handler); }, [event, handler]); }',
    'import { useEffect } from "react"; function useEvent(event: string, handler: (e: Event) => void) { useEffect(() => { window?.addEventListener(event, handler); return () => window.removeEventListener(event, handler); }, [event, handler]); }',
    'import { useEffect } from "react"; function useEvent(event: string, handler: (e: Event) => void) { useEffect(() => { window.addEventListener(event, handler); track(); return () => window.removeEventListener(event, handler); }, [event, handler]); }',
    'import { useEffect } from "react"; function useEvent(event: string, handler: (e: Event) => void) { useEffect(async () => { window.addEventListener(event, handler); return () => window.removeEventListener(event, handler); }, [event, handler]); }',
    'import { useEffect } from "react"; function useEvent(event: string, handler: (e: Event) => void) { useEffect(() => { window.addEventListener(event, handler); return () => window.removeEventListener(event, handler); }, [...deps]); }',
    'import { useEffect } from "react"; function useEvent(event: string, handler: (e: Event) => void) { useEffect(() => { ref.current.addEventListener(event, handler); return () => ref.current.removeEventListener(event, handler); }, [event, handler]); }',
    'import { useEffect } from "other"; function useEvent(event: string, handler: (e: Event) => void) { useEffect(() => { window.addEventListener(event, handler); return () => window.removeEventListener(event, handler); }, [event, handler]); }',
    'import { useEffect } from "react"; function useEvent(event: string, handler: (e: Event) => void, useEffect) { useEffect(() => { window.addEventListener(event, handler); return () => window.removeEventListener(event, handler); }, [event, handler]); }',
    'import { useEffect } from "react"; function handler(e) {} function useEvent(event) { useEffect(() => { window.addEventListener(event, handler); return () => window.removeEventListener(event, handler); }, [event, handler]); }',
    'import { useEffect } from "react"; function useEvent(event, handler: { handleEvent(e: Event): void }) { useEffect(() => { window.addEventListener(event, handler); return () => window.removeEventListener(event, handler); }, [event, handler]); }',
    'import { useEffect } from "react"; function useEvent(event, handler) { useEffect(() => { window.addEventListener(event, handler); return () => window.removeEventListener(event, handler); }, [event, handler]); }',
    'import { useEffect, useCallback } from "react"; function useEvent(event) { const handler = useCallback(() => {}, []); useEffect(() => { window.addEventListener(event, handler); return () => window.removeEventListener(event, handler); }, [event, handler]); }',
    'import { useEffect } from "react"; function C({ onScroll }: Props) { useEffect(() => { window.addEventListener("scroll", onScroll); return () => window.removeEventListener("scroll", onScroll); }, [onScroll]); }',
    'import { useEffect } from "react"; function C({ onScroll }: { onScroll: { handleEvent(e: Event): void } }) { useEffect(() => { window.addEventListener("scroll", onScroll); return () => window.removeEventListener("scroll", onScroll); }, [onScroll]); }',
  ],
  invalid: [
    'import { useEffect } from "react"; function useEvent(target: HTMLElement, handler: (e: Event) => void) { useEffect(() => { target.addEventListener("click", handler); return () => target.removeEventListener("click", handler); }, [target, handler]); }',
    'import { useEffect } from "react"; function useEvent(handler: (e: Event) => void) { useEffect(() => { window.addEventListener("click", handler, { capture: true, passive: true }); return () => window.removeEventListener("click", handler, true); }, [handler]); }',

    'import { useEffect } from "react"; function useEvent(event: string, handler: (e: Event) => void) { useEffect(() => { window.addEventListener(event, handler); return () => window.removeEventListener(event, handler); }, [event, handler]); }',
    'import { useEffect } from "react"; function useEvent(event: string, handler: (e: Event) => void) { useEffect(() => { window.addEventListener(event, handler, true); return () => window.removeEventListener(event, handler, true); }, [event, handler]); }',
    'import { useEffect } from "react"; function useEvent(event: string, handler: (e: Event) => void) { useEffect(() => { window.addEventListener(event, handler, { passive: true }); return () => window.removeEventListener(event, handler); }, [event, handler]); }',
    'import { useEffect } from "react"; function useEvent(event: string, handler: (e: Event) => void) { useEffect(() => { window.addEventListener(event, handler); return () => { window.removeEventListener(event, handler); }; }, [event, handler]); }',
    'import { useEffect } from "react"; function useEvent(event: string, handler: (e: Event) => void) { useEffect(() => { window.addEventListener("keydown", handler); return () => window.removeEventListener("keydown", handler); }, [event, handler]); }',
    'import { useEffect } from "react"; function useEvent(event, onEvent) { const handler = e => onEvent(e); useEffect(() => { window.addEventListener(event, handler); return () => window.removeEventListener(event, handler); }, [event, handler]); }',
    'import { useEffect } from "react"; function useEvent(event, onEvent) { function handler(e) { onEvent(e); } useEffect(() => { window.addEventListener(event, handler); return () => window.removeEventListener(event, handler); }, [event, handler]); }',
    'import { useEffect, useCallback } from "react"; function useEvent(event, onEvent) { const handler = useCallback(e => onEvent(e), [onEvent]); useEffect(() => { window.addEventListener(event, handler); return () => window.removeEventListener(event, handler); }, [event, handler]); }',
    'import { useEffect as effect } from "react"; function useEvent(event: string, handler: (e: Event) => void) { effect(() => { window.addEventListener(event, handler); return () => window.removeEventListener(event, handler); }, [event, handler]); }',
    'import * as R from "react"; function useEvent(event: string, handler: (e: Event) => void) { R.useEffect(() => { window.addEventListener(event, handler); return () => window.removeEventListener(event, handler); }, [event, handler]); }',
    'import { useEffect } from "react"; function C({ onScroll }: { onScroll: () => void }) { useEffect(() => { window.addEventListener("scroll", onScroll); return () => window.removeEventListener("scroll", onScroll); }, [onScroll]); }',
    'import { useEffect } from "react"; function C({ scroll: onScroll = noop }: { scroll?: (e: Event) => void }) { useEffect(() => { window.addEventListener("scroll", onScroll); return () => window.removeEventListener("scroll", onScroll); }, [onScroll]); }',
    'import React from "react"; function useEvent(event: string, handler: (e: Event) => void) { React.useLayoutEffect(() => { window.addEventListener(event, handler); return () => window.removeEventListener(event, handler); }, [event, handler]); }',
  ].map((code) => ({ code, errors: [{ messageId: "stable" }], output: null })),
});
