# 09. ADR-31 deletes the session row after a failed retry; ADR-22, ADR-40 and code keep it

**Severity:** Medium. The ADRs disagree on what an ended session leaves behind.

## What

ADR-31: "If the retry also returns 401, the local session row goes and the browser goes to
Keycloak." ADR-22: "The row stays with its dead tokens until a new login for the same `sid`
replaces it." ADR-40: "The row keeps its dead token, and the silent recovery ... overwrites it on
the next request." BUD-21 adds that nothing "may treat that row as corrupt and delete it." The
refresh routine keeps the row, and the session adapter replaces it in place on the next login.

## Where

- https://booleanone.atlassian.net/browse/ADR-31 (first bold paragraph), https://booleanone.atlassian.net/browse/ADR-22, https://booleanone.atlassian.net/browse/ADR-40, https://booleanone.atlassian.net/browse/BUD-21
- `apps/web/lib/auth/refresh-session.ts:161` (keeps the row on purpose)
- `apps/web/lib/auth/session-adapter.ts:47` (upsert on `sid`)

## Proposal

Propose an edit to ADR-31 so the 401 branch ends the session (cookie cleared, `SessionEnded`)
and leaves the row for replacement, matching ADR-22 and ADR-40.
