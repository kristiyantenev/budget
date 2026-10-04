# 05. Data access layer verifies the session only, not the role (ADR-32, ADR-35, BUD-9)

**Severity:** High. Docs and tickets state a control the code does not have.

## What

BUD-9's resolution: the data access layer "requires a live session row and a `budget-user`
claim". BUD-1's summary repeats it. ADR-35: "The data access layer renders it [the no-access page]
from the missing claim." The glossary calls the DAL "the only code in the web app that decides
whether a caller is allowed."

`verifiedSession` checks that a session row exists and nothing more. The web app never reads
roles from the stored access token. Access is decided only by the API's 403, so a page that
renders no API data is reachable by any `b1` account.

## Where

- https://booleanone.atlassian.net/browse/BUD-9 (resolution), https://booleanone.atlassian.net/browse/BUD-1 ("Decisions so far", BUD-9 line), https://booleanone.atlassian.net/browse/ADR-35, https://booleanone.atlassian.net/browse/ADR-32
- `apps/web/lib/dal.ts:15` to `:31` (session check only)
- `docs/GLOSSARY.md:22` (DAL entry)

## Proposal

Either implement the claim check in the DAL (decode the stored access token's
`resource_access.b1-budget-api.roles` and route a missing role to the no-access page), or
correct BUD-9, BUD-1, ADR-35 and the glossary to say the API alone decides the role today. The
first keeps the "protected on creation" argument of BUD-9 intact.
