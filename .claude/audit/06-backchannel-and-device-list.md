# 06. Device list and backchannel logout (ADR-21) are unbuilt; ADR-26 says the endpoint exists

**Severity:** High. Half of ADR-21 is untracked, and one ADR asserts code that is not there.

## What

ADR-21 decides two things: a device list with revoke, served by Keycloak's Account API, and a
backchannel logout endpoint. BUD-23 (To Do) covers the endpoint and lists "the device list and
the revoke button" as out of scope. No ticket covers them.

ADR-26 says "The backchannel logout endpoint already exists, so the events do too." It does not.
ADR-22 states correctly that "nothing receives Keycloak's logout token yet". The glossary's
Backchannel logout entry says in the present tense that it "is how B1 Budget learns that a
session it holds a row for is gone."

## Where

- https://booleanone.atlassian.net/browse/ADR-21, https://booleanone.atlassian.net/browse/ADR-26 (option "A shared revocation list"), https://booleanone.atlassian.net/browse/ADR-22 (consequences), https://booleanone.atlassian.net/browse/BUD-23
- `docs/GLOSSARY.md:156` (Backchannel logout, present tense)
- `apps/web/lib/auth/create-auth.ts:245` (every `/api/auth/*` route but the callback answers 404)

## Proposal

Open a BUD task for the device screen under BUD-19, or note in ADR-21 that it waits on a later
map. Propose a one-word edit to ADR-26: "already exists" to "is decided in ADR-21". Reword the
glossary entry to future tense or name BUD-23.
