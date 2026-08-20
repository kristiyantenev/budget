# B1 Budget

A personal budgeting application built on one idea: you decide where your money goes before you
spend it. Money you have gets assigned to categories that represent an intention, like rent,
groceries, or a holiday fund. Spending draws down those assignments. It never quietly redefines
them.

That constraint drives the product. When a category runs dry, B1 Budget will not paper over it by
borrowing from somewhere else. You are asked to move the money yourself, so the budget always
reflects a decision you made rather than an average the software inferred.

## Getting started

You need three things installed:

| Tool | Version | Notes |
| --- | --- | --- |
| Node | 24 or newer | `.node-version` pins it for nvm and fnm |
| pnpm | 11.11.0 | `corepack enable` will install the pinned version |
| JDK | 25 | Any distribution. SDKMAN and Homebrew both work |

`JAVA_HOME` must point at your JDK. Turbo runs tasks with a scrubbed environment and passes
`JAVA_HOME` through explicitly, so a JDK that is only reachable through your shell's `PATH` will
work at the terminal and fail under `pnpm build`.

```bash
pnpm install
pnpm dev
```

The web app comes up on http://localhost:3000. The API starts alongside it, though it exits
immediately until a web starter is added to `apps/resourceserver`.

You do not need Gradle installed. The repo ships the Gradle wrapper, and `pnpm` drives it for you.

## Working in the repo

| Command | What it does |
| --- | --- |
| `pnpm dev` | Runs the web app and the API together |
| `pnpm build` | Builds every package, both languages |
| `pnpm test` | Runs every test suite |
| `pnpm lint` | Biome for TypeScript, Checkstyle for Java |
| `pnpm typecheck` | Type-checks the TypeScript packages |

One command covers both languages because Turbo drives the whole repo. The Java service is a
regular Gradle project with a small `package.json` that lets Turbo see it, so you can also drop
into `apps/resourceserver` and run `./gradlew` directly when you want a task Turbo does not expose.

Commits are checked before they land. A Checkstyle violation blocks the commit rather than
surfacing later in CI.

## Layout

- `apps/resourceserver` - Budget API, served at `api.budget.booleanone.com`.
- `apps/web` - Budget web client, served at `budget.booleanone.com`.
- `packages/*` - Libraries and configuration shared across apps.

Authentication comes from Keycloak at `accounts.booleanone.com`, which is shared across all
BooleanOne products rather than owned by B1 Budget.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) for branch and commit conventions.

Coding agents should read [AGENTS.md](AGENTS.md), which carries the rules that are easy to get
wrong and hard to infer from the code.

## License

Proprietary. Copyright BooleanOne B.V. All rights reserved.
