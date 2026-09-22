# js-index-maps

Reports `.find()` by strict property equality inside an inline array callback or
loop body, when the searched collection is an unmodified binding declared outside
that iteration. The predicate must take one identifier parameter and consist of
one comparison, such as `user.id === order.userId`.

```ts
// Reported
function attachUsers(users, orders) {
  return orders.map((order) => users.find((user) => user.id === order.userId));
}

// Allowed, preserving the first matching user for duplicate ids
function attachUsers(users, orders) {
  const userById = new Map();
  for (const user of users) {
    if (!userById.has(user.id)) userById.set(user.id, user);
  }
  return orders.map((order) => userById.get(order.userId));
}
```

The rule recognizes loop bodies and inline callbacks to `map`, `flatMap`,
`filter`, `forEach`, `some`, `every`, `find`, and `findIndex`. It stops at other
function boundaries. It skips optional calls, additional callback parameters,
loose equality, compound predicates, computed dynamic keys, reassigned collections,
and receivers derived from the current item. A key comparison that also reads
the searched item on the other side is not a simple index lookup.

The compared value must read a binding that the iteration declares or reassigns,
such as the callback parameter, the loop variable, or a const in the loop body.
A loop-invariant key, such as `user.role === "admin"` or an outer `id`, returns
the same match on every pass, so hoisting the `find` out of the iteration
fits better than an index and the rule does not report it.

Collection methods are recognized by name, without proving their runtime type.
A custom collection with these names may need a suppression. The rule does not
prove collection immutability, predicate purity, key uniqueness, or repeated key
values. Map key equality also differs from strict equality for `NaN`.

No options or automatic fixes. Review mutations and callback effects before
rewriting. Index construction must preserve the required duplicate-key behavior.
