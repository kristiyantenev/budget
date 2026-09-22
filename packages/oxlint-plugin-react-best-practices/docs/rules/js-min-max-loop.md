# js-min-max-loop

Reports a fresh sorted array used only for endpoint reads. Fresh arrays are
recognized as `.toSorted()` results or `.sort()` called directly on an array
literal, including a spread copy. In-place sorting of an existing binding is
excluded because sorting may be its intended effect.

```ts
// Reported
const sorted = [...projects].sort((a, b) => a.updatedAt - b.updatedAt);
const oldest = sorted[0];
const newest = sorted[sorted.length - 1];

// Allowed
let newest = projects[0];
for (const project of projects) {
  if (newest === undefined || project.updatedAt > newest.updatedAt) newest = project;
}
```

Recognized endpoints are `[0]`, `.at(0)`, `.at(-1)`, and
`sorted[sorted.length - 1]` using the same lexical binding. Direct chained endpoint
reads and local const bindings are supported. For a binding, every read must be
an endpoint access or the length expression within that access. There is one
diagnostic at the sort call, even when both endpoints are used.

The rule skips optional calls, exported arrays, mutation targets, other indexes,
arrays passed elsewhere, and other uses of the sorted result. It does not follow
aliases of the sorted array or prove that a custom `.toSorted()` is an array method.

No options or automatic fixes. A rewrite must preserve comparator semantics,
stable tie selection, empty arrays, sparse arrays, and any relevant side effects.
Sorting without a comparator uses string ordering; replacing it with numeric
comparison can change results.
