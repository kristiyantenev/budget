import { RuleTester } from "oxlint/plugins-dev";
import { describe, it } from "node:test";
import { jsIndexMapsRule } from "../src/rules/js-index-maps.ts";

RuleTester.describe = describe;
RuleTester.it = it;
const tester = new RuleTester({ languageOptions: { parserOptions: { lang: "tsx" } } });

tester.run("js-index-maps", jsIndexMapsRule, {
  valid: [
    "function f(users, orders) { return users.find(u => u.id === 1); }",
    "function f(users, orders) { return orders.map(o => users.find(u => u.active)); }",
    "function f(users, orders) { return orders.map(o => users.find(u => u.id == o.id)); }",
    "function f(users, orders) { return orders.map(o => users.find(u => u.id === u.otherId)); }",
    "function f(users, orders) { return orders.map(o => users.find(u => u.id === getId(u))); }",
    "function f(users, orders) { return orders.map(o => users.find(async u => u.id === o.id)); }",
    "function f(users, orders) { return orders.map(o => users.find((u, i) => u.id === i)); }",
    "function f(users, orders) { return orders.map(o => users.find(u => { track(); return u.id === o.id; })); }",
    "function f(users, orders) { return orders.map(o => () => users.find(u => u.id === o.id)); }",
    "function f(orders) { return orders.map(o => { const users = getUsers(o); return users.find(u => u.id === o.id); }); }",
    "function f(users, orders) { return orders.map(o => o.users.find(u => u.id === o.id)); }",
    "function f(users, orders) { users = other; return orders.map(o => users.find(u => u.id === o.id)); }",
    "function f(users, orders) { return orders.map(o => users.find(u => u.id === o.id, context)); }",
    "function f(users, orders) { return orders.map(o => users?.find(u => u.id === o.id)); }",
    "function f(users) { for (const user of users.find(u => u.id === 1)) {} }",
    'function f(users, orders) { return orders.map(o => users.find(u => u.role === "admin")); }',
    "function f(users, orders, id) { return orders.map(o => users.find(u => u.id === id)); }",
    "function f(users, orders) { const id = pick(); for (const o of orders) { consume(users.find(u => u.id === id.value)); } }",
    "function f(users, orders) { return orders.map(o => users.find(u => u.id === CURRENT_ID)); }",
  ],
  invalid: [
    "function f(users, orders) { return orders.map(o => users.find(u => u.id === o.id)); }",
    "function f(users, orders) { return orders.map(o => users.find(u => o.id === u.id)); }",
    "function f(users, orders) { return orders.map(o => users.find(u => { return u.id === o.id; })); }",
    "function f(users, orders) { for (const o of orders) { consume(users.find(u => u.id === o.id)); } }",
    'function f(users, orders) { return orders.filter(o => users["find"](u => u["id"] === o.id)); }',
    "function f(users, orders) { return orders.map(o => users.find(u => (u.id === o.id) as boolean)); }",
    "function f(users, orders) { for (const o of orders) { const id = o.userId; consume(users.find(u => u.id === id)); } }",
    "function f(users, orders) { let id; for (const o of orders) { id = o.userId; consume(users.find(u => u.id === id)); } }",
    "function f(users, ids) { for (let i = 0; i < ids.length; i++) { consume(users.find(u => u.id === ids[i])); } }",
  ].map((code) => ({ code, errors: [{ messageId: "index" }], output: null })),
});
