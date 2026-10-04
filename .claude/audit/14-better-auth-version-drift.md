# 14. Better Auth is pinned at 1.7.5; comments and ADR-24 still speak of 1.7.1

**Severity:** Low. Wording, with one process point.

## What

`apps/web/package.json` pins `better-auth` and its Drizzle adapter at 1.7.5. Two test comments
say "Better Auth 1.7.1 helpers cannot supply additional session fields", which may no longer be
true. ADR-24 evaluated 1.7.1 and says "every bump means reading its release notes for changes to
the flow, the session, or the schema, and that review is part of the cost." No commit or ticket
records that review for 1.7.2 to 1.7.5.

## Where

- `apps/web/lib/auth/create-auth.test.ts:214`, `apps/web/lib/auth/session-adapter.test.ts:278`
- `apps/web/package.json`, https://booleanone.atlassian.net/browse/ADR-24 (consequences)

## Proposal

Re-check the helper limitation on 1.7.5 and update or remove the comments. Record the release
note review in the bump commit body from now on, as ADR-24 asks.
