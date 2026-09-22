# rendering-conditional-render

Reports numeric conditions in `&&` expressions rendered as JSX children. Numeric
evidence comes from number literals, the unshadowed global `NaN`, explicit local
number annotations, const aliases, or `.length` on a locally recognized array or
string. Known nonzero numeric literals and their const aliases are skipped.

```tsx
function Badge({ count }: { count: number }) {
  // Reported
  return <div>{count && <span>{count}</span>}</div>;
}

function Badge({ count }: { count: number }) {
  // Allowed
  return <div>{count !== 0 ? <span>{count}</span> : null}</div>;
}
```

The check follows logical chains and ternary result branches. It distinguishes
`||`, which filters numeric falsy values, from `??`, which preserves them. A `??`
expression with a numeric side is reported once, as a whole, because either side
can become the condition. It does not inspect ternary tests as rendered values.

Local number evidence includes inline destructured parameter annotations.
Unknown identifiers, imported types, arbitrary property reads, JSX props, calls,
and expressions outside JSX children are skipped. A `.length` name alone is not
proof that a value is numeric. The rule does not use a TypeScript type checker or
perform control-flow narrowing, so a guarded number can still need an explicit
boolean condition or suppression.

No options or automatic fixes. Choose a condition that preserves the intended
behavior for negative numbers and `NaN`; `count > 0` is not equivalent to every
numeric truthiness check.
