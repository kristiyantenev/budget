# server-cache-react

Reports fresh object, array, function, or regular-expression literals passed
directly to a function created by React `cache`. Each literal creates a new
reference, so repeating the call cannot reuse the cached entry for that argument.

```tsx
import { cache } from "react";
const getUser = cache(loadUser);

// Reported
getUser({ id: 1 });

// Allowed, when loadUser accepts an id
getUser(1);

// Also allowed, reusing one reference
const params = { id: 1 };
getUser(params);
getUser(params);
```

The rule resolves React imports by binding, supports aliases and namespace or
default imports, and follows immutable local `const` aliases of cached functions.
It skips mutable bindings, shadowed names, re-exported or imported cached functions,
and objects passed through variables. Factory calls, constructors, and spread
arguments remain unchecked; syntax alone does not establish whether they return
a fresh reference. Constructors can explicitly return an existing object.

No options or automatic fixes. This check covers cache arguments only. It does
not choose which operations to cache or establish that a caller runs within a
React Server Component cache context.

[React documents reference equality for cache arguments](https://react.dev/reference/react/cache#my-memoized-function-still-runs-even-though-ive-called-it-with-the-same-arguments).
