# rerender-split-combined-hooks

Reports two consecutive array transformations in one React `useMemo` when the
second stage reads reactive inputs absent from the first. The first stage must be
a local const, and the second must use that const as its array receiver. The
callback returns the second stage directly or through one more local const.

```tsx
import { useMemo } from "react";

// Reported
const sorted = useMemo(() => {
  const filtered = products.filter((p) => p.category === category);
  return filtered.toSorted((a, b) => (order === "asc" ? a.price - b.price : b.price - a.price));
}, [products, category, order]);

// Allowed
const filtered = useMemo(
  () => products.filter((p) => p.category === category),
  [products, category],
);
const sorted = useMemo(
  () => filtered.toSorted((a, b) => (order === "asc" ? a.price - b.price : b.price - a.price)),
  [filtered, order],
);
```

The recognized methods are `map`, `filter`, and `toSorted`. Array callbacks must
be inline and synchronous, with identifier parameters and one expression or a
single return. Expressions may read properties and build literals but cannot
contain calls, writes, await, or nested functions. The intermediate array and any
final local binding must each have exactly one read in the expected position.

Dependencies must be a literal array of unique identifiers. The rule resolves
bindings and checks that every captured value is listed, every listed dependency
is used, and the second stage adds at least one input. Unknown captures, mutable
bindings, additional statements, spreads, optional calls, other array methods,
and more than two stages are skipped. Import aliases are supported.

No options or automatic fixes. Method names assume standard array behavior;
getters, coercion, and custom implementations can still have effects. Review
purity and whether avoiding the first calculation justifies another memo. React
Compiler may already perform this optimization. This rule does not split effects,
where different variable references do not establish independent side effects.
