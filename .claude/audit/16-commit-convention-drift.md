# 16. Commits without the body and trailer CONTRIBUTING.md requires

**Severity:** Low. Process hygiene.

## What

CONTRIBUTING.md: bodies list 2 to 5 highlights, and a commit implementing an ADR closes with a
`Refs:` trailer. On `main`:

- `26c3847` "fix: pin the token clock skew as a constant per ADR-25" has no body and no
  `Refs: ADR-25`, though it implements that ADR.
- `33817e7`, `440dc6e`, `76eda69`, `8414056`, `2ffded9`, `f33b603`, `a4c1046` have no body.

## Where

- `CONTRIBUTING.md` (Commits), `git log` on `main`

## Proposal

Nothing to rewrite in history. Add a `commit-msg` check for a body on non-trivial subjects, or
accept docs-only one-liners explicitly in CONTRIBUTING.md so the rule matches practice.
