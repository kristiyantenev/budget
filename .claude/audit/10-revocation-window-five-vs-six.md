# 10. Revocation window is five minutes in ADR-33 and six in ADR-26; BUD-23 misapplies skew

**Severity:** Medium. The same number appears three ways.

## What

ADR-26 bounds the window at "that lifespan plus the 60 seconds of clock skew, so six minutes",
and the API Javadoc agrees. ADR-33 says "an access token stays valid for up to five minutes after
the session ends". BUD-6's resolution says "up to five minutes after the revoke".

BUD-23 says a stale row survives "up to one access-token lifetime (5 minutes + 60 seconds clock
skew)". The skew is the API's tolerance on `exp`. The web app refreshes 30 seconds before
expiry, so it learns of the revocation within the lifespan, not after the skew.

## Where

- https://booleanone.atlassian.net/browse/ADR-26, https://booleanone.atlassian.net/browse/ADR-33 ("What sign-out does not do"), https://booleanone.atlassian.net/browse/BUD-6, https://booleanone.atlassian.net/browse/BUD-23 (first paragraph)
- `apps/resourceserver/src/main/java/com/booleanone/budget/security/ResourceServerSecurityConfig.java:135`

## Proposal

Propose "six minutes" with a link to ADR-26 in ADR-33, and "within one access-token lifespan"
in BUD-23. BUD-6's "five minutes" can stay if read as the BFF-side bound, but a link helps.
