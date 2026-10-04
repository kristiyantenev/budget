# 19. DECISIONS.md omits two platform ADRs the web and API decisions lean on

**Severity:** Low. The index promises a `grep` finds every binding decision.

## What

The inherited-platform table lists ADR-9 and ADR-12. ADR-28 rests on the cluster Postgres having
no public route, which is ADR-18 (default-deny ingress), and that is why local development needs
Docker. ADR-30 pins the resource identifier because Traefik and Cloudflare front the API, which
is ADR-6. Neither appears in the index, so a `grep` for what constrains those two choices misses
them.

## Where

- `docs/DECISIONS.md` (Platform decisions this repo inherits)
- https://booleanone.atlassian.net/browse/ADR-6, https://booleanone.atlassian.net/browse/ADR-18, https://booleanone.atlassian.net/browse/ADR-28 (consequences), https://booleanone.atlassian.net/browse/ADR-30

## Proposal

Add rows for ADR-6 (platform / routing) and ADR-18 (platform / network) to the inherited table.
