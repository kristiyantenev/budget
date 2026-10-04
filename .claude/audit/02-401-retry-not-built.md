# 02. 401 refresh-and-retry (ADR-31, ADR-40) is not built; the hook for it is dead code

**Severity:** High. Both ADRs describe the policy as the module's behaviour.

## What

ADR-31: "On 401: refresh once, retry once, then end the session." ADR-40: "After a 401 it passes
the refused token back to the routine and retries once the new pair is committed." BUD-10's
resolution repeats both. The API module returns `{ status: "unauthorized" }` on 401 and does
nothing else, and its own comment says the retry "is not built yet".

`refreshSession` accepts `refusedAccessToken` for that retry, but production code never passes
it. Only tests do. BUD-22 scoped the retry out, and no later ticket scopes it in.

## Where

- https://booleanone.atlassian.net/browse/ADR-31, https://booleanone.atlassian.net/browse/ADR-40, https://booleanone.atlassian.net/browse/BUD-10 (resolution comment), https://booleanone.atlassian.net/browse/BUD-22 (out of scope)
- `apps/web/lib/api/budgeting-api.ts:61` ("Refresh-and-retry on 401 is not built yet")
- `apps/web/lib/auth/refresh-session.ts:64` and `:66` (`refusedAccessToken`, unused in production)

## Proposal

Open a BUD task for the 401 path: pass the refused token to `refreshSession`, retry once, raise
`SessionEnded` on a second 401, `Refs: ADR-31` and `Refs: ADR-40`. Until then, the comment in
`budgeting-api.ts` should name the ticket so the gap is tracked rather than noted.
