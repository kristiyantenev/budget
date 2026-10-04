# 12. CI guarantees in AGENTS.md and README hold on Bitbucket only; the GitHub remote has none

**Severity:** Medium. A stated security control may not run where the code lives.

## What

AGENTS.md: "CI scans every commit message and committed file on pull requests and on `main`."
The only pipeline is `bitbucket-pipelines.yml`. The checkout's remote is
`github.com/kristiyantenev/budget`, and the repo has no `.github/` directory. BUD-2, BUD-3 and
BUD-5 link commits on `bitbucket.org/booleanone/b1-budget`. If GitHub is a mirror, the claim is
true at the source and misleading at the mirror. If GitHub is now canonical, the claim is false.

## Where

- `AGENTS.md:44`, `README.md:103`, `CONTRIBUTING.md` (Commits), `bitbucket-pipelines.yml`
- https://booleanone.atlassian.net/browse/BUD-2, https://booleanone.atlassian.net/browse/BUD-3, https://booleanone.atlassian.net/browse/BUD-5 (Bitbucket commit links)

## Proposal

State the canonical host in README and AGENTS.md. If pull requests can be opened on GitHub, add
an equivalent workflow (TruffleHog on history and commit messages, Semgrep advisory) so the
guarantee holds on both.
