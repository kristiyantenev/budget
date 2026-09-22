# rerender-functional-setstate

Reports a call to a React `useState` setter when its next-value expression reads
the paired state binding. The tuple must be a const declaration with two
identifier bindings. React imports and setter aliases are resolved by binding.

```tsx
import { useState } from "react";

function Counter() {
  const [count, setCount] = useState(0);

  // Reported
  const increment = () => setCount(count + 1);

  // Allowed
  const incrementPending = () => setCount((previous) => previous + 1);
}
```

The check also covers array and object updates such as `setItems([...items, item])`
and `setUser({ ...user, name })`. It applies when callback dependencies are
complete; exhaustive-deps does not replace this check.

It skips functional updaters, bare identifier arguments, references occurring only
inside nested functions, optional calls, spread arguments, mutable bindings,
custom hooks, and `useReducer`. It follows immutable local setter aliases but does
not track aliases of the state value or values computed in earlier statements.

No options or automatic fixes. An update may intentionally use the render's state
snapshot. Moving calculations into an updater changes when they run; React may
also invoke an updater more than once in development. Keep side effects and
asynchronous work outside the updater, and preserve any other captured values.

[React documents functional updates](https://react.dev/reference/react/useState#updating-state-based-on-the-previous-state).
