# rerender-lazy-state-init

Reports a direct call or constructor expression passed as React `useState`'s
initial value. The expression runs whenever the component renders, even though
React ignores subsequent initial values.

```tsx
import { useState } from "react";

// Reported
const [index] = useState(buildIndex(items));

// Allowed
const [index] = useState(() => buildIndex(items));
const [count] = useState(0);
```

React imports are resolved by binding, including named aliases, namespace imports,
and the default import. Shadowed names and imports from other libraries are skipped.
Functions, references, literals, object and array literals, and calls nested inside
other initializer expressions are outside this check. Calls named `use` or starting
with `use` followed by an uppercase letter or digit are skipped, including resolved
import aliases, because hooks cannot be moved into initializer callbacks. Calls to
the unshadowed global `Boolean`, `Number`, and `String` are skipped as too cheap to
defer; constructing them with `new` is still reported.

No options or automatic fixes. Syntax does not establish cost or purity. Cheap
calls may not benefit, and changing when side effects run can change behavior.
If a call returns a function, review React's function-as-initializer semantics
before rewriting it.

[React documents lazy initialization and its purity requirement](https://react.dev/reference/react/useState#avoiding-recreating-the-initial-state).
