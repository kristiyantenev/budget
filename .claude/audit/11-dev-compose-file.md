# 11. ADR-28 and BUD-8 describe a dev compose file that the README says does not exist

**Severity:** Medium. A consequence of an accepted ADR is deferred without saying so there.

## What

ADR-28 consequences: "A compose file runs one Postgres service, the same migrations production
runs build its schema" and "The README is what stops `.env` drifting ... added when the compose
file lands." BUD-8's resolution: "Session rows go to a Postgres container in a dev compose file."
The README says "There is no compose file yet, so you start the container by hand." BUD-1 and
BUD-19 list the compose file as out of scope, returning as its own effort. The README table
exists already, without the compose file.

## Where

- https://booleanone.atlassian.net/browse/ADR-28 (consequences), https://booleanone.atlassian.net/browse/BUD-8 (resolution), https://booleanone.atlassian.net/browse/BUD-1 and https://booleanone.atlassian.net/browse/BUD-19 (out of scope)
- `README.md:56`

## Proposal

Either open a small BUD task for `compose.yaml` with the Postgres service and `db:migrate`, or
propose a note on ADR-28 that the compose file is deferred and the README table shipped first.
