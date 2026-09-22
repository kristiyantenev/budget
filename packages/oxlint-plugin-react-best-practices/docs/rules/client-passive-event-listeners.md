# client-passive-event-listeners

Reports `addEventListener` calls for `touchstart`, `touchmove`, `wheel`, and
`mousewheel` when the DOM target and callback are locally recognizable, the
callback does not cancel or forward the event through its parameter, and the
options do not specify `passive`.

```ts
// Reported
document.addEventListener("wheel", (event) => console.log(event.deltaY));

// Allowed
document.addEventListener("wheel", (event) => console.log(event.deltaY), {
  passive: true,
});
```

Recognized targets include unshadowed browser globals, explicit DOM type
annotations, DOM factory/query results, and typed React `useRef` values. The
callback can be inline, a local `const` function, or an unmodified function
declaration. The event name can be a literal or a local string constant.

The rule skips handlers using `preventDefault`, `returnValue`, argument spreading,
destructured event parameters, the legacy global event, event aliases, dynamic
event members, or calls that receive the event itself. It also skips imported or
unknown callbacks, listener objects, unknown options, spreads in options, and
unrecognized targets. A provided `passive` option is respected, including an
intentional `passive: false`.

The diagnostic names the edit for the options form in use, so capture is kept:

| Third argument           | Suggested edit                                      |
| ------------------------ | --------------------------------------------------- |
| Omitted or `false`       | Pass `{ passive: true }`.                           |
| `true` (capture)         | Replace it with `{ capture: true, passive: true }`. |
| Object without `passive` | Add `passive: true` to that object.                 |

This is local syntax analysis. It does not inspect called functions or prove the
absence of cancellation through arbitrary global state. No options or automatic
fixes are provided because changing passive behavior can change interaction.

[MDN describes passive listeners and cancellation](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener#using_passive_listeners).
