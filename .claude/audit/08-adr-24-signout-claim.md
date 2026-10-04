# 08. ADR-24 and BUD-6 say Better Auth sign-out reaches Keycloak; ADR-33 says it does not

**Severity:** Medium. Two accepted ADRs contradict each other on a fact the code settled.

## What

ADR-24 lists among Better Auth's reasons for selection "a `signOut` that already reaches the
realm". BUD-6's resolution repeats "a `signOut` that already reaches `end_session_endpoint`".
ADR-33 found that Better Auth's `signOut` reads `id_token_hint` from the account row, which holds
no tokens, so "Keycloak gets no hint at all", and rejects the stock sign-out.

## Where

- https://booleanone.atlassian.net/browse/ADR-24 (second paragraph), https://booleanone.atlassian.net/browse/BUD-6 (resolution comment), https://booleanone.atlassian.net/browse/ADR-33 (second paragraph)

## Proposal

Propose an edit to ADR-24: strike the sign-out reason or qualify it ("reaches the realm only
when the account row holds the ID token, which ADR-20 forbids; see ADR-33"). Add a one-line
comment on BUD-6 pointing to ADR-33, as was done for BUD-9 and BUD-10.
