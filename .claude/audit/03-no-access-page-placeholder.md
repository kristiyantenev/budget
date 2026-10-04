# 03. No-access page (ADR-35) is a one-line placeholder without sign-out, and has no ticket

**Severity:** High. The decision fixes the copy and the control; neither is there.

## What

ADR-35 specifies a page with a heading, the person's display name, the "sign out and back in"
remedy, and a sign-out button. ADR-31 requires sign-out to stay reachable on a 403. The home page
renders one sentence for the `forbidden` outcome and offers nothing else. The comment admits it
"stands in for the no-access page until it is built". ADR-35 also says the page is rendered by
the data access layer; today a page component chooses the copy.

## Where

- https://booleanone.atlassian.net/browse/ADR-35, https://booleanone.atlassian.net/browse/ADR-31 (403 branch), https://booleanone.atlassian.net/browse/ADR-33 ("Sign-out stays reachable from the no-access page")
- `apps/web/app/(authenticated)/page.tsx:3` to `:9`
- https://booleanone.atlassian.net/browse/BUD-22 lists the page as out of scope; no BUD task picks it up

## Proposal

Open a BUD task for the no-access page with ADR-35's copy as the acceptance criterion, rendered
from one component that both the API 403 and the role check (finding 05) reach. Depends on
finding 01 for the button.
