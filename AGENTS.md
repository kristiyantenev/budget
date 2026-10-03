# B1 Budget

> **Note:** `CLAUDE.md` is a symlink to `AGENTS.md`. They are the same file.

B1 Budget is a personal budgeting application. Users assign available funds to categories that
represent intent, so allocation defines the budget, not spending.

This repo is a multi-language monorepo. Turbo runs the tasks, so one `pnpm` command covers every
language.

## Build & test

```bash
# From the repo root
pnpm build   # build every package, both languages
pnpm test    # run every test suite
pnpm dev     # run the web dev server and the API together
pnpm lint    # lint every package, both languages

# JVM tasks Turbo does not expose, via the Gradle wrapper
./gradlew :apps:resourceserver:test --tests "JwtValidatorTests"   # run a single test
```

## Monorepo map

- `apps/resourceserver` - B1 Budget API, served at `api.budget.booleanone.com`.
- `apps/web` - B1 Budget web client, served at `budget.booleanone.com`.
- `packages/*` - Libraries and configuration shared across apps.

## Conventions

- **Vocabulary.** [`docs/GLOSSARY.md`](docs/GLOSSARY.md) defines the terms this repo uses. Use them
  in everything you write, and read the entry before touching what it names.

- **Dependency versions.** Every JVM version lives in `gradle/libs.versions.toml`, reached through a
  `libs.` accessor. A version string in a `build.gradle.kts` is a bug.

- **Secrets.** Development secrets live in OpenBao at `vault.booleanone.com` and reach the app as
  environment variables. The repo holds references, never values, and that includes commit messages.
  TruffleHog scans commit messages in the `commit-msg` hook and again in CI, alongside every committed file.

- **Auth.** Keycloak at `accounts.booleanone.com` is the identity provider for every BooleanOne
  product, so keep B1 Budget assumptions out of it. Never store OAuth tokens in browser local
  storage. Most of this area is settled by an ADR.

## Load-bearing product decisions

Auth, session handling, routing, data ownership, etc. in this repo are constrained by decisions
taken outside it. **Before changing any of them, read** [`docs/DECISIONS.md`](docs/DECISIONS.md).
It indexes every ADR that binds this repo by key, title, and area, so a `grep` tells you what
constrains the thing you are about to touch without a network call. The index carries no reasoning.
To understand more about ADRs, refer to
[CONTRIBUTING.md, Architecture decisions](CONTRIBUTING.md#architecture-decisions).

Do not work around a decision, and say so if the task requires contradicting it. If you take a new
decision that belongs there, add the row when the ADR is written, not later.

## Git

Read [CONTRIBUTING.md, Commits](CONTRIBUTING.md#commits) before committing. It carries the branch,
subject, and body rules.
