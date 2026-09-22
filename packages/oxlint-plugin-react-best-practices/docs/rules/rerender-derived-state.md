# rerender-derived-state

Reports a React `useSyncExternalStore` result whose only read computes a boolean
comparison against a primitive literal. Both the snapshot binding and derived
boolean must be const declarations directly in the same function body. The
comparison must be the derived variable's whole initializer.

```tsx
import { useSyncExternalStore } from "react";

function Sidebar() {
  // Reported
  const width = useSyncExternalStore(subscribe, getWidth, getServerWidth);
  const isMobile = width < 768;
  return <nav className={isMobile ? "mobile" : "desktop"} />;
}

function Sidebar() {
  // Allowed
  const isMobile = useSyncExternalStore(
    subscribe,
    () => getWidth() < 768,
    () => getServerWidth() < 768,
  );
  return <nav className={isMobile ? "mobile" : "desktop"} />;
}
```

Supported comparisons are `<`, `<=`, `>`, `>=`, `===`, and `!==`, with the snapshot
on either side. The rule follows React imports by binding and supports aliases
and namespace imports. It requires one snapshot read, skips property selection,
mutable declarations, nested or conditional calculations, spreads, and comparisons
against other variables. Arbitrary custom hooks, including the guide's
`useWindowWidth`, are not inferred from their names.

No options or automatic fixes. This detects an opportunity, not measured render
frequency. Review snapshot purity and value types before moving the comparison.
Both client and server snapshots must derive the same kind of value. The rule
does not rewrite subscriptions or invent a media-query API.

[React compares snapshot results before rerendering](https://react.dev/reference/react/useSyncExternalStore).
