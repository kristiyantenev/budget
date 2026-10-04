# 04. Sign-in page deviates from ADR-37 on reason set, copy, and signed-in arrivals

**Severity:** High. ADR-37 calls the reason set "a contract rather than page copy".

## What

ADR-37 fixes two reason values and their copy:

| Reason       | ADR-37 copy                               | Code                                          |
| ------------ | ----------------------------------------- | --------------------------------------------- |
| `signed-out` | "You're signed out of BooleanOne."        | not handled, renders the default              |
| `expired`    | "Your session ended. Sign in to continue." | "Your session has ended. Please sign in again." |

ADR-37 also says "Somebody who arrives already holding a session cookie goes to the app root
instead." The page never checks for a session; the proxy skips `/sign-in`, so a signed-in person
sees the button and can start a second authorization round trip.

## Where

- https://booleanone.atlassian.net/browse/ADR-37 (copy, the signed-in redirect, "the reason set is a contract")
- `apps/web/app/sign-in/page.tsx:16` (only `expired`, different wording)
- `apps/web/lib/auth/session-proxy.ts:27` (public list leaves `/sign-in` unchecked by design)

## Proposal

Add the `signed-out` branch and align both strings with ADR-37 verbatim, or amend ADR-37 if the
current wording is preferred. Add a session check to the page that redirects to `/` when a live
session exists, with a test that the `signed-out` arrival (cookie already gone) is not caught.
