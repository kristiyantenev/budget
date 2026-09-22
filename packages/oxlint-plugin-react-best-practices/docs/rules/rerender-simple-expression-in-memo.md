# rerender-simple-expression-in-memo

Reports React `useMemo` around a small expression with a syntactically primitive
result. Accepted expressions are primitive literals, constant template strings,
`!` and `typeof`, strict equality comparisons between identifiers or literals,
and small logical or conditional combinations of those expressions. Recursion
is limited to three levels below the result expression.

```tsx
import { useMemo } from "react";

// Reported
const selected = useMemo(() => selectedId === id, [selectedId, id]);

// Allowed
const selected = selectedId === id;
const index = useMemo(() => buildIndex(items), [items]);
```

The callback must be inline, synchronous, have no parameters, and contain only
the result expression or a single return statement. Dependencies must be a
literal array without holes or spreads. React import aliases are supported;
shadowed bindings and imports from other libraries are skipped.

The rule skips calls, member access that could invoke getters, arithmetic and
loose comparisons that could invoke coercion, and expressions whose results
might be objects. For example, `a || b` is not assumed to return a boolean.
This deliberately leaves the guide's untyped property-access example unchecked.

No options or automatic fixes. Review dependencies before removing a memo;
this check does not replace exhaustive dependency checking.
