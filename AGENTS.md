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
pnpm test    # test every package, both languages
pnpm dev     # run the web dev server and the API together
pnpm lint    # lint every package, both languages

# JVM tasks Turbo does not expose, via the Gradle wrapper
./gradlew :apps:resourceserver:test --tests "BudgetApplicationTests"   # run a single test
```

## Monorepo map

- `apps/resourceserver` - B1 Budget API, served at `api.budget.booleanone.com`.
- `apps/web` - B1 Budget web client, served at `budget.booleanone.com`.
- `packages/*` - Libraries and configuration shared across apps.

## Conventions

- **Dependency versions.** Every JVM version lives in `gradle/libs.versions.toml`, reached through a
`libs.` accessor. A version string in a `build.gradle.kts` is a bug.

- **Secrets.** Development secrets live in OpenBao at `vault.booleanone.com` and reach the app as
environment variables. The repo holds references, never values, and that includes commit messages.

- **Auth.** Keycloak at `accounts.booleanone.com` is the identity provider for every BooleanOne
product, so keep B1 Budget assumptions out of it. Never store OAuth tokens in browser local
storage.

## Git

Read `CONTRIBUTING.md` before committing. It carries the branch, subject, and body rules.
