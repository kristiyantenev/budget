import { RuleTester } from "oxlint/plugins-dev";
import { describe, it } from "node:test";
import { rerenderDependenciesRule } from "../src/rules/rerender-dependencies.ts";

RuleTester.describe = describe;
RuleTester.it = it;
const tester = new RuleTester({ languageOptions: { parserOptions: { lang: "tsx" } } });

tester.run("rerender-dependencies", rerenderDependenciesRule, {
  valid: [
    'import { useEffect } from "react"; function F(user, other) { useEffect(() => log(user.id), [user.id]); }',
    'import { useEffect } from "react"; function F(user, other) { useEffect(() => log(user), [user]); }',
    'import { useEffect } from "react"; function F(user, other) { useEffect(() => { log(user.id); consume(user); }, [user]); }',
    'import { useEffect } from "react"; function F(user, other) { useEffect(() => log(user[other]), [user]); }',
    'import { useEffect } from "react"; function F(user, other) { useEffect(() => log(user?.id), [user]); }',
    'import { useEffect } from "react"; function F(user, other) { useEffect(() => user.refresh(), [user]); }',
    'import { useEffect } from "react"; function F(user, other) { useEffect(() => user.profile.refresh(), [user]); }',
    'import { useEffect } from "react"; function F(user, other) { useEffect(() => { user.id = 1; }, [user]); }',
    'import { useEffect } from "react"; function F(user, other) { useEffect(() => { user.id++; }, [user]); }',
    'import { useEffect } from "react"; function F(user, other) { useEffect(() => { delete user.id; }, [user]); }',
    'import { useEffect } from "react"; function F(user, other) { useEffect(() => { ({ value: user.id } = other); }, [user]); }',
    'import { useEffect } from "react"; function F(user, other) { useEffect(() => { log(user.current); }, [user]); }',
    'import { useEffect } from "react"; function F(user, other) { useEffect(() => { return () => log(user.id); }, [user]); }',
    'import { useEffect } from "react"; function F(user, other) { useEffect(() => { setTimeout(() => log(user.id), 0); }, [user]); }',
    'import { useEffect } from "react"; function F(user, other) { useEffect(() => log(user.id), [...other, user]); }',
    'import { useEffect } from "react"; function F(user, other) { useEffect(() => log(user.id), deps); }',
    'import { useEffect } from "react"; function F(user, other) { useEffect(() => log(user.id)); }',
    'import { useEffect } from "react"; function F(user, other) { useEffect(() => log(other.id), [user]); }',
    'import { useEffect } from "react"; function F(user, other) { user = other; useEffect(() => log(user.id), [user]); }',
    'import { useEffect } from "react"; function F(user, other) { function inner(user) { log(user.id); } useEffect(() => inner(other), [user]); }',
    'import { useEffect } from "other"; function F(user) { useEffect(() => log(user.id), [user]); }',
    'import { useEffect } from "react"; function F(user, useEffect) { useEffect(() => log(user.id), [user]); }',
    'import { useEffect } from "react"; function F(user, other) { useEffect(() => new user.Factory(), [user]); }',
    'import { useEffect } from "react"; function F(user, other) { useEffect(() => user.tag`text`, [user]); }',
    'import { useEffect } from "react"; function F(user, other) { useEffect(async () => log(user.id), [user]); }',
  ],
  invalid: [
    'import { useEffect } from "react"; function F(user, other) { useEffect(() => log(user.id), [user]); }',
    'import { useEffect } from "react"; function F(user, other) { useEffect(() => { log(user.id); log(user.name); }, [user]); }',
    'import { useEffect } from "react"; function F(user, other) { useEffect(() => log(user.profile.name), [user]); }',
    'import { useEffect } from "react"; function F(user, other) { useEffect(() => log(user["id"]), [user]); }',
    'import { useEffect } from "react"; function F(user, other) { useEffect(() => log((user as User).id), [user]); }',
    'import { useEffect } from "react"; function F(user, other) { useEffect(() => { const id = user.id; log(id); }, [user]); }',
    'import { useEffect as effect } from "react"; function F(user) { effect(() => log(user.id), [user]); }',
    'import * as R from "react"; function F(user) { R.useLayoutEffect(() => log(user.id), [user]); }',
    'import React from "react"; function F(user) { React["useInsertionEffect"](() => log(user.id), [user]); }',
  ].map((code) => ({ code, errors: [{ messageId: "narrow" }], output: null })),
});
