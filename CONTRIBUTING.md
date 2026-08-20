# Contributing to B1 Budget

## Commits

- **NEVER** put secrets, keys, or certificates in a commit, in files or in the message itself.
- Branch off `main` unless told not to. Commit subjects follow
  [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/). When a ticket exists, its
  number is the scope.
- Commit bodies list 2-5 highlights as bullet points of what the commit changed, not how it was
  built. Keep each under 30 words. Two sharp highlights beat five vague ones, so cut anything that
  does not earn its line.

A well-formed commit that adheres to these rules:

```text
feat(BUD-123): carry unspent category funds into next month

- Unspent funds in a category now roll into next month instead of returning to the pool.
- Rollover is opt-in per category and stays off for existing budgets.
- Reallocating a rolled-over amount sends it back to the month it came from.
```
