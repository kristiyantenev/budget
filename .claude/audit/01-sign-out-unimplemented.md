# 01. Sign-out (ADR-33) is not implemented and has no ticket

**Severity:** High. An accepted, indexed decision with no code and no tracking.

## What

ADR-33 decides that sign-out builds the `end_session_endpoint` URL from the session's ID token,
deletes the row, and lands on `/sign-in?reason=signed-out`. ADR-31 and ADR-35 rely on sign-out
being reachable. The web app has no sign-out button, action, or route. Better Auth's own
`/sign-out` is closed on purpose, so nothing performs the flow.

The glossary states in the present tense that RP-initiated logout "is what B1 Budget's sign-out
performs". BUD-22 and BUD-23 both list sign-out as out of scope, and no BUD task picks it up.

## Where

- https://booleanone.atlassian.net/browse/ADR-33, https://booleanone.atlassian.net/browse/ADR-31 (403 branch), https://booleanone.atlassian.net/browse/ADR-35 (sign-out button), https://booleanone.atlassian.net/browse/ADR-37 (`signed-out`)
- `apps/web/lib/auth/create-auth.ts:245` closes every route except the callback
- `docs/GLOSSARY.md:150` (RP-initiated logout, present tense)
- https://booleanone.atlassian.net/browse/BUD-22 and https://booleanone.atlassian.net/browse/BUD-23 list it as out of scope; https://booleanone.atlassian.net/browse/BUD-19 has no child for it

## Proposal

Open a BUD task under BUD-19 for sign-out with ADR-33's acceptance criteria (ID token hint,
row deletion, `reason=signed-out`, `Refs: ADR-33`). Until it lands, change the glossary entry
to say what sign-out will perform, or add a line naming the ticket.
