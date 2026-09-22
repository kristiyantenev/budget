# js-batch-dom-css

Reports a direct layout read between style assignments to the same recognizable
DOM target in one block. Consecutive style writes and a final layout read are
allowed.

```ts
function resize(element: HTMLElement) {
  element.style.width = "100px";
  const width = element.offsetWidth; // Reported
  element.style.height = "200px";
}
```

Group the writes before the read when that preserves the measurements needed:

```ts
function resize(element: HTMLElement) {
  element.style.width = "100px";
  element.style.height = "200px";
  const width = element.offsetWidth;
}
```

Recognized reads are `offsetWidth`, `offsetHeight`, `offsetTop`, `offsetLeft`,
`clientWidth`, `clientHeight`, `scrollWidth`, `scrollHeight`,
`getBoundingClientRect()`, `getClientRects()`, and global `getComputedStyle()`.
Receivers need DOM evidence from browser globals, explicit DOM annotations,
DOM query/factory results, or typed React refs. Shadowed globals and local types
with DOM names do not count as evidence.

The first version checks one intervening read, the initializer of a single
variable declaration. A read whose value is discarded, such as `el.offsetHeight;`,
is treated as a deliberate reflow, for example to restart a CSS animation, and
breaks the sequence. Other statements, multiple intervening reads, and
control-flow boundaries also break the sequence. It skips a
match if the later write directly uses a binding created by the layout read.
Target aliases, cross-element layout dependencies, class changes, style methods,
and interleaving across loop iterations are not analyzed.

No options or automatic fixes. Some intermediate measurements are intentional;
review their purpose before reordering them.

[web.dev explains forced layout and batching](https://web.dev/articles/avoid-large-complex-layouts-and-layout-thrashing).
