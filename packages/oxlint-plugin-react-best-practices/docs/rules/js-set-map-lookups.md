# js-set-map-lookups

Reports `.includes(value)` on an array binding from outside an enclosing loop or
inline array callback. The array must have a local literal initializer, a const
alias to one, or an explicit array or tuple annotation. This avoids treating
string substring searches as array membership checks.

```ts
function pick(items: Item[], allowedIds: string[]) {
  // Reported
  return items.filter((item) => allowedIds.includes(item.id));
}

function pick(items: Item[], allowedIds: string[]) {
  // Allowed
  const allowed = new Set(allowedIds);
  return items.filter((item) => allowed.has(item.id));
}
```

The iteration boundaries are the same as [js-index-maps](js-index-maps.md).
Array evidence includes `T[]`, tuples, readonly arrays, unshadowed `Array<T>` and
`ReadonlyArray<T>`, and inline destructured parameter annotations. It does not
resolve imported type aliases or infer function return types.

The searched value must read a binding that the iteration declares or reassigns,
as in [js-index-maps](js-index-maps.md). A loop-invariant value gives the same
answer on every pass, so hoisting the check fits better than a Set.

Literal arrays with fewer than eight elements are skipped. At that size a linear
scan is about as fast as a Set lookup. Annotated arrays and literals containing a
spread have no visible size and are still checked.

The rule skips reassigned bindings, arrays created inside the iteration, optional
calls, spread arguments, and the `fromIndex` argument. That argument changes the
membership question and cannot be replaced by a Set lookup.

No options or automatic fixes. The diagnostic does not prove that building a Set
is worthwhile for a small collection. Review array mutations, including mutations
through aliases, before constructing a snapshot outside the iteration.
