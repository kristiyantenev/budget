# js-hoist-regexp

Reports a static, stateless regular expression created inside a recognized
component function when every use is a direct `.test(value)` or `.exec(value)`
call. It accepts regex literals and the unshadowed `RegExp` constructor or factory
with locally resolvable string patterns and flags.

```tsx
// Reported
function EmailStatus({ text }) {
  const pattern = /@example\.com$/i;
  return <span>{pattern.test(text) ? "Match" : "No match"}</span>;
}

// Allowed
const pattern = /@example\.com$/i;
function EmailStatus({ text }) {
  return <span>{pattern.test(text) ? "Match" : "No match"}</span>;
}
```

Component recognition follows uppercase function or variable names, anonymous
default exports, and inline React `memo` or `forwardRef` callbacks. Nested callbacks
have their own boundary, so expressions inside `useMemo`, lazy initializers, or
event handlers are not treated as component render work.

Global and sticky flags are excluded because they change `lastIndex`. The rule
also skips dynamic patterns or flags, mutable bindings, unused regexes, property
reads or writes, aliases, and any escaping reference. Passing a regex to another
function, including string `.split()` or `.match()`, is outside this check.
Direct `/pattern/.test(value)` expressions are supported.

No options or automatic fixes. This covers static hoisting only; dynamic patterns
may need memoization, which remains guidance. It assumes standard RegExp methods
and does not validate constructor pattern syntax or infer custom prototype changes.
