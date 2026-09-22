# rerender-dependencies

Reports an identifier in a literal dependency array passed to React's
`useEffect`, `useLayoutEffect`, or `useInsertionEffect` when every use of that
binding inside the callback is a static property read. The message lists the
property expressions the callback actually reads.

```tsx
import { useEffect } from "react";

// Reported
useEffect(() => console.log(user.id), [user]);

// Allowed
useEffect(() => console.log(user.id), [user.id]);
```

The callback must be inline, synchronous, and parameterless. Named import aliases,
namespace imports, default React imports, and static computed property names are
supported. Matching follows lexical bindings, so shadowed variables and imports
from other packages do not match.

The rule skips whole-object uses, dynamic keys, optional property access, mutable
bindings, method calls using the object as a receiver, construction and tagged
calls, property writes, and `.current` reads. References inside cleanup functions
or other nested callbacks make that dependency ineligible. Dependency arrays with
spreads or holes are skipped. It does not infer primitive property types or assess
the guide's separate example about extracting a boolean from an effect.

No options or automatic fixes. Object identity may intentionally trigger
synchronization. Moving a property read to render can also change getter timing
or evaluate a property earlier than a guard inside the effect. Review those
semantics before narrowing dependencies. This check complements exhaustive-deps;
it does not replace dependency completeness checks.
