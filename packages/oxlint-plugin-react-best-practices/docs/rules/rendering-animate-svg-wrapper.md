# rendering-animate-svg-wrapper

Reports a lowercase JSX `<svg>` root with an inline style object declaring a
nonempty static CSS `animation`, `animationName`, or `transition` value. Disabled
values such as `none`, `initial`, and `unset` are excluded.

```tsx
// Reported
<svg style={{ animation: "spin 1s linear infinite" }} />;

// Allowed
<div style={{ animation: "spin 1s linear infinite" }}>
  <svg />
</div>;
```

String constants are resolved locally. The rule skips spread props, spread or
computed style properties, getters, dynamic values, and style objects stored in
variables. Duplicate style attributes and duplicate property names use the last
value. A static transform or opacity value alone is not an animation.

Class names are not interpreted. In particular, `animate-spin` only has meaning
with the corresponding stylesheet or framework configuration, so the guide's
class-name example remains outside this configuration-free check. Custom SVG
components and nested SVG elements are also outside its scope.

No options or automatic fixes. CSS declarations identify a candidate, not a
measured performance problem. Review CSS overrides, transform origins, SVG
coordinates, and layout before moving an animation onto an HTML wrapper. The rule
does not promise that a particular browser will use hardware acceleration.
