# advanced-event-handler-refs

Reports a React `useEffect` or `useLayoutEffect` whose entire body registers one
browser event listener and returns a matching cleanup, when its handler is also
in the literal dependency array.

```tsx
import { useEffect, useRef } from "react";

// Reported
function useWindowEvent(event: string, handler: (event: Event) => void) {
  useEffect(() => {
    window.addEventListener(event, handler);
    return () => window.removeEventListener(event, handler);
  }, [event, handler]);
}

// Allowed, if changing handlers should preserve the subscription
function useWindowEvent(event: string, handler: (event: Event) => void) {
  const latest = useRef(handler);
  useEffect(() => {
    latest.current = handler;
  }, [handler]);
  useEffect(() => {
    function listener(this: Window, event: Event) {
      latest.current.call(this, event);
    }
    window.addEventListener(event, listener);
    return () => window.removeEventListener(event, listener);
  }, [event]);
}
```

The target must be a locally recognized DOM identifier, such as unshadowed
`window`, `document`, or an explicitly typed DOM parameter. Registration and
cleanup must use the same target and event, the same handler binding, and matching
capture settings. Event names may be static strings or unmodified bindings.

Handlers require local evidence that they are functions: a local function,
explicit function annotation, or React `useCallback` with a nonempty literal
dependency array. Annotations include inline destructured parameter types, such
as `{ onScroll }: { onScroll: () => void }`. Named prop types such as `Props`
are not resolved. Module-level handlers, untyped parameters, listener objects,
and callbacks with an empty dependency array are skipped.

Only omitted options, boolean capture options, or literal objects containing
boolean `capture` and `passive` values are supported. `once`, abort signals,
dynamic options, spread props, optional calls, member-expression targets such as
`ref.current`, additional effect work, and extra cleanup work are skipped. React
import aliases and shadowing are handled by binding.

No options or automatic fixes. Re-registration may intentionally change listener
ordering or other behavior. A ref-backed listener also needs to preserve the
handler's receiver and the timing at which it sees updates. Use the diagnostic as
a subscription review, not proof that re-registering is wrong.
