# js-combine-iterations

Reports consecutive const declarations that each run `.map()` or `.filter()` on
the same lexical collection binding. Each callback must be inline, synchronous,
and contain one inspectable expression or one return statement. A group of three
or more consecutive passes produces one diagnostic at its second pass.

```ts
// Reported
const admins = users.filter((user) => user.isAdmin);
const testers = users.filter((user) => user.isTester);

// Allowed, for a dense array and predicates whose evaluation order does not matter
const admins = [];
const testers = [];
for (const user of users) {
  if (user.isAdmin) admins.push(user);
  if (user.isTester) testers.push(user);
}
```

The check runs in program and block bodies. It recognizes static computed method
names and TypeScript expression wrappers. It skips reassigned collection bindings,
optional calls, named callbacks, spread or `thisArg` arguments, and callbacks with
calls, writes, await, destructured parameters, or extra statements. A later pass
cannot capture an earlier pass's result, and an earlier callback cannot capture a
later result. Any intervening statement ends the group.

Method names assume standard array behavior. The check does not prove callback
purity: getters, coercion, and custom methods can still have effects. It does not
infer collection size or whether another loop is worth the complexity.

No options or automatic fixes. Combining passes changes callback ordering. Preserve
sparse-array behavior as well; array methods skip holes, whereas a plain `for...of`
loop visits them as undefined values.
