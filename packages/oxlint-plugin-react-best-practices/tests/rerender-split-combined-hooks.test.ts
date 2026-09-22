import { RuleTester } from "oxlint/plugins-dev";
import { describe, it } from "node:test";
import { rerenderSplitCombinedHooksRule } from "../src/rules/rerender-split-combined-hooks.ts";

RuleTester.describe = describe;
RuleTester.it = it;
const tester = new RuleTester({ languageOptions: { parserOptions: { lang: "tsx" } } });

tester.run("rerender-split-combined-hooks", rerenderSplitCombinedHooksRule, {
  valid: [
    'import { useMemo } from "react"; function F(items, category, order) { useMemo(() => items.filter(p => p.category === category), [items, category]); }',
    'import { useMemo } from "react"; function F(items, category, order) { useMemo(() => { const filtered = items.filter(p => p.category === category); return filtered.toSorted((a, b) => category === "asc" ? a.price - b.price : b.price - a.price); }, [items, category]); }',
    'import { useMemo } from "react"; function F(items, category, order) { useMemo(() => { const filtered = items.filter(p => p.category === category); return filtered.toSorted((a, b) => order === "asc" ? a.price - b.price : b.price - a.price); }, [items, category]); }',
    'import { useMemo } from "react"; function F(items, category, order) { useMemo(() => { const filtered = items.filter(p => p.category === category); return filtered.toSorted((a, b) => order === "asc" ? a.price - b.price : b.price - a.price); }, [items, category, order, extra]); }',
    'import { useMemo } from "react"; function F(items, category, order) { useMemo(() => { const filtered = items.filter(p => p.category === category); return filtered.toSorted((a, b) => order === "asc" ? a.price - b.price : b.price - a.price); }, [...deps]); }',
    'import { useMemo } from "react"; function F(items, category, order) { useMemo(() => { const filtered = items.filter(p => p.category === category); return filtered.toSorted((a, b) => order === "asc" ? a.price - b.price : b.price - a.price); }, dependencies); }',
    'import { useMemo } from "react"; function F(items, category, order) { useMemo(() => { let filtered = items.filter(p => p.category === category); return filtered.toSorted((a, b) => order === "asc" ? a.price - b.price : b.price - a.price); }, [items, category, order]); }',
    'import { useMemo } from "react"; function F(items, category, order) { useMemo(() => { const filtered = items.filter(p => p.category === category); track(); return filtered.toSorted((a, b) => order === "asc" ? a.price - b.price : b.price - a.price); }, [items, category, order]); }',
    'import { useMemo } from "react"; function F(items, category, order) { useMemo(() => { const filtered = items.filter(p => p.category === category); return filtered.sort((a, b) => order === "asc" ? a.price - b.price : b.price - a.price); }, [items, category, order]); }',
    'import { useMemo } from "react"; function F(items, category, order) { useMemo(() => { const filtered = items.filter(p => check(p, category)); return filtered.toSorted((a, b) => order === "asc" ? a.price - b.price : b.price - a.price); }, [items, category, order]); }',
    'import { useMemo } from "react"; function F(items, category, order) { useMemo(() => { const filtered = items.filter(async p => p.category === category); return filtered.toSorted((a, b) => order === "asc" ? a.price - b.price : b.price - a.price); }, [items, category, order]); }',
    'import { useMemo } from "react"; function F(items, category, order) { useMemo(() => { const filtered = items.filter(p => { track(); return p.category === category; }); return filtered.toSorted((a, b) => order === "asc" ? a.price - b.price : b.price - a.price); }, [items, category, order]); }',
    'import { useMemo } from "react"; function F(items, category, order) { useMemo(() => { const filtered = items.filter(p => p.category === category); return items.toSorted((a, b) => order === "asc" ? a.price - b.price : b.price - a.price); }, [items, category, order]); }',
    'import { useMemo } from "react"; function F(items, category, order) { useMemo(async () => { const filtered = items.filter(p => p.category === category); return filtered.toSorted((a, b) => order === "asc" ? a.price - b.price : b.price - a.price); }, [items, category, order]); }',
    'import { useMemo } from "react"; function F(items, category, order) { useMemo((x = sideEffect()) => { const filtered = items.filter(p => p.category === category); return filtered.toSorted((a, b) => order === "asc" ? a.price - b.price : b.price - a.price); }, [items, category, order]); }',
    'import { useMemo } from "react"; function F(items, category, order) { useMemo(() => { const filtered = items.filter(p => p.category === category); return filtered.toSorted((a, b) => order === "asc" ? a.price - b.price : b.price - a.price); }, [items, category, order, order]); }',
    'import { useMemo } from "react"; function F(items, category, order) { useMemo(() => { const filtered = items?.filter(p => p.category === category); return filtered.toSorted((a, b) => order === "asc" ? a.price - b.price : b.price - a.price); }, [items, category, order]); }',
    'import { useMemo } from "react"; function F(items, category, order) { useMemo(() => { const filtered = items.filter(predicate); return filtered.toSorted((a, b) => order === "asc" ? a.price - b.price : b.price - a.price); }, [items, category, order]); }',
    'import { useMemo } from "other"; function F(items, category, order) { useMemo(() => { const filtered = items.filter(p => p.category === category); return filtered.toSorted((a, b) => order === "asc" ? a.price - b.price : b.price - a.price); }, [items, category, order]); }',
    'import { useMemo } from "react"; function F(items, category, order, useMemo) { useMemo(() => { const filtered = items.filter(p => p.category === category); return filtered.toSorted((a, b) => order === "asc" ? a.price - b.price : b.price - a.price); }, [items, category, order]); }',
    'import { useMemo } from "react"; function F(items, category, order) { useMemo(() => { const filtered = items.filter(p => p.category === category); const sorted = filtered.toSorted((a, b) => order === "asc" ? a.price - b.price : b.price - a.price); return filtered; }, [items, category, order]); }',
  ],
  invalid: [
    'import { useMemo } from "react"; function F(items, category, order) { useMemo(() => { const filtered = items.filter(p => p.category === category); return filtered.toSorted((a, b) => order === "asc" ? a.price - b.price : b.price - a.price); }, [items, category, order]); }',
    'import { useMemo } from "react"; function F(items, category, order) { useMemo(() => { const filtered = items.filter(p => p.category === category); const sorted = filtered.toSorted((a, b) => order === "asc" ? a.price - b.price : b.price - a.price); return sorted; }, [items, category, order]); }',
    'import { useMemo } from "react"; function F(items, category, order) { useMemo(() => { const filtered = items.filter(p => { return p.category === category; }); return filtered.toSorted((a, b) => order === "asc" ? a.price - b.price : b.price - a.price); }, [items, category, order]); }',
    'import { useMemo } from "react"; function F(items, category, order) { useMemo(() => { const mapped = items.map(p => p.price * category); return mapped.filter(price => price > order); }, [items, category, order]); }',
    'import { useMemo as memo } from "react"; function F(items, category, order) { memo(() => { const filtered = items.filter(p => p.category === category); return filtered.toSorted((a, b) => order === "asc" ? a.price - b.price : b.price - a.price); }, [items, category, order]); }',
    'import * as R from "react"; function F(items, category, order) { R.useMemo(() => { const filtered = items.filter(p => p.category === category); return filtered.toSorted((a, b) => order === "asc" ? a.price - b.price : b.price - a.price); }, [items, category, order]); }',
    'import React from "react"; function F(items, category, order) { React["useMemo"](() => { const filtered = items.filter(p => p.category === category); return filtered.toSorted((a, b) => order === "asc" ? a.price - b.price : b.price - a.price); }, [items, category, order]); }',
  ].map((code) => ({ code, errors: [{ messageId: "split" }], output: null })),
});
