# client-localstorage-schema

Checks two concrete parts of the guidance:

- Calls to `localStorage.getItem` and `localStorage.setItem` need an enclosing
  `try` block with a `catch` in the same function, or around a callback that
  runs before its call returns.
- Statically known `setItem` keys need a version segment such as `prefs:v1` or
  `v2:prefs`. Accepted separators are `:`, `/`, `.`, `_`, and `-`; the version is
  `v` followed by digits.

```ts
// Reported: no catch and no version in the write key
localStorage.setItem("prefs", JSON.stringify(preferences));

// Allowed
try {
  localStorage.setItem("prefs:v1", JSON.stringify(preferences));
} catch {
  // Choose the application's fallback for unavailable storage.
}
```

The rule recognizes the unshadowed `localStorage`, `window.localStorage`, and
`globalThis.localStorage` forms, including static computed method names. String
literals, templates, string concatenation, and immutable local string constants
are evaluated for key checks. Unknown keys are skipped, so wrapper functions can
accept keys from callers. Calls through storage aliases are not traced.

Unversioned reads and `removeItem` are allowed for migrations. Calls inside a
catch or finally block are not protected by that same try statement. The rule
requires a local catch even if a caller might catch the exception.

A surrounding catch protects a callback only when the callback runs before its
call returns. The rule accepts an immediately invoked function and a non-async
callback passed first to `every`, `filter`, `find`, `findIndex`, `findLast`,
`findLastIndex`, `flatMap`, `forEach`, `map`, `reduce`, `reduceRight`, or `some`:

```ts
// Allowed
try {
  keys.forEach((key) => localStorage.getItem(key));
} catch {}
```

Any other function stops the search, because a catch outside its declaration
does not protect its eventual execution. Timers, promise callbacks, event
handlers, and stored functions still need their own catch. Methods are recognized
by name, as in [js-index-maps](js-index-maps.md), so the rule cannot tell an
array from an iterator. Iterator helpers `map`, `filter`, and `flatMap` share
those names but are lazy. Their callbacks run when the iterator is consumed,
possibly after the try block has ended, and the rule does not report them.

No options or automatic fixes. This does not validate stored fields, data
minimization, schema contents, or whether a fallback is appropriate.

[MDN documents storage access exceptions](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage#exceptions).
