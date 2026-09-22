import { RuleTester } from "oxlint/plugins-dev";
import { describe, it } from "node:test";
import { jsCombineIterationsRule } from "../src/rules/js-combine-iterations.ts";

RuleTester.describe = describe;
RuleTester.it = it;
const tester = new RuleTester({ languageOptions: { parserOptions: { lang: "tsx" } } });

tester.run("js-combine-iterations", jsCombineIterationsRule, {
  valid: [
    "function Lists(users) { const active = users.filter(u => u.active); }",
    "function Lists(users) { const active = users.filter(u => u.active); const admins = other.filter(u => u.admin); }",
    "function Lists(users) { const active = users.filter(u => u.active); log(active); const admins = users.filter(u => u.admin); }",
    "function Lists(users) { const active = users.filter(u => u.active); const admins = users.filter(u => active.length > 0 && u.admin); }",
    "function Lists(users) { const active = users.filter(u => admins.length > 0 && u.active); const admins = users.filter(u => u.admin); }",
    "function Lists(users) { const active = users.filter(check); const admins = users.filter(u => u.admin); }",
    "function Lists(users) { const active = users.filter(u => check(u)); const admins = users.filter(u => u.admin); }",
    "function Lists(users) { const active = users.filter(u => u.active++); const admins = users.filter(u => u.admin); }",
    "function Lists(users) { const active = users.filter(async u => u.active); const admins = users.filter(u => u.admin); }",
    "function Lists(users) { const active = users.filter(u => { log(u); return u.active; }); const admins = users.filter(u => u.admin); }",
    "function Lists(users) { const active = users.filter(u => u.active, receiver); const admins = users.filter(u => u.admin); }",
    "function Lists(users) { const active = users.filter(...callbacks); const admins = users.filter(u => u.admin); }",
    "function Lists(users) { const active = users?.filter(u => u.active); const admins = users.filter(u => u.admin); }",
    "function Lists(users) { let active = users.filter(u => u.active); const admins = users.filter(u => u.admin); }",
    "function Lists(users) { users = other; const active = users.filter(u => u.active); const admins = users.filter(u => u.admin); }",
    "function Lists(users) { const active = users.filter(u => u.active); function inner(users) { const admins = users.filter(u => u.admin); } }",
  ],
  invalid: [
    "function Lists(users) { const active = users.filter(u => u.active); const admins = users.filter(u => u.admin); }",
    "function Lists(users) { const active = users.filter(u => u.active); const admins = users.filter(u => u.admin); const inactive = users.filter(u => !u.active); }",
    "function Lists(users) { const names = users.map(u => u.name); const admins = users.filter(u => u.admin); }",
    "function Lists(users) { const active = users.filter(u => { return u.active; }); const admins = users.filter(u => u.admin); }",
    'function Lists(users) { const active = users["filter"](u => u.active); const admins = users.filter(u => u.admin); }',
    "function Lists(users) { const active = users.map(u => ({ name: u.name })); const admins = users.filter(u => u.admin); }",
    "const users = []; const active = users.filter(u => u.active); const admins = users.filter(u => u.admin);",
  ].map((code) => ({ code, errors: [{ messageId: "combine" }], output: null })),
});
