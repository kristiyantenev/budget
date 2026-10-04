# B1 Budget

A personal budgeting application built on one idea: you decide where your money goes before you
spend it. Money you have gets assigned to categories that represent an intention, like rent,
groceries, or a holiday fund. Spending draws down those assignments. It never quietly redefines
them.

That constraint drives the product. When a category runs dry, B1 Budget will not paper over it by
borrowing from somewhere else. You are asked to move the money yourself, so the budget always
reflects a decision you made rather than an average the software inferred.

## Getting started

You need these installed:

| Tool   | Version     | Notes                                                                  |
| ------ | ----------- | ---------------------------------------------------------------------- |
| Node   | 24 or newer | `.node-version` pins it for nvm and fnm                                |
| pnpm   | 12.5.1      | `corepack enable` will install the pinned version                      |
| JDK    | 25          | Any distribution. SDKMAN and Homebrew both work                        |
| Docker | Any recent  | Runs the local Postgres and the Testcontainers database in `pnpm test` |

`JAVA_HOME` must point at your JDK. Turbo runs tasks with a scrubbed environment and passes
`JAVA_HOME` through explicitly, so a JDK that is only reachable through your shell's `PATH` will
work at the terminal and fail under `pnpm build`.

You do not need Gradle installed. The repo ships the Gradle wrapper, and `pnpm` drives it for you.

### Configure the web app

1. Create `apps/web/.env` with the variables below. Next reads the file on its own, and so do the
   migrations and the tests.

   | Variable                    | Purpose                                     | Where the value comes from                                        |
   | --------------------------- | ------------------------------------------- | ----------------------------------------------------------------- |
   | `BETTER_AUTH_URL`           | Public base URL of the web app              | `http://localhost:3000`                                           |
   | `BETTER_AUTH_SECRET`        | Signs and encrypts session cookies          | Generate one: `openssl rand -hex 32`                              |
   | `BUDGET_OIDC_ISSUER`        | Keycloak issuer the web app signs in with   | `https://accounts.booleanone.com/realms/b1` (ADR-28)              |
   | `BUDGET_OIDC_CLIENT_ID`     | OIDC client the web app signs in as         | `b1-budget-web`                                                   |
   | `BUDGET_OIDC_CLIENT_SECRET` | Secret for that client                      | Keycloak admin console, client `b1-budget-web`, Credentials tab   |
   | `BUDGET_DATABASE_URL`       | Postgres for sessions, and for `db:migrate` | `postgresql://b1_budget:<your password>@localhost:5432/b1_budget` |
   | `BUDGET_API_URL`            | Base URL of the B1 Budget API               | `http://localhost:8080`                                           |

   Only `BUDGET_OIDC_CLIENT_SECRET` is a real secret you have to find. The tests run their own OIDC
   provider and their own database, so for `pnpm test` every variable only has to be present, and
   placeholder values pass.

2. Then install the dependencies:

   ```bash
   pnpm install
   ```

### Start the database

The web app keeps its sessions in Postgres. There is no compose file yet, so you start the
container by hand. Use the password you put in `BUDGET_DATABASE_URL`, then apply the migrations:

```bash
docker run -d --name b1-budget-postgres -p 5432:5432 \
  -e POSTGRES_USER=b1_budget -e POSTGRES_PASSWORD=<your password> -e POSTGRES_DB=b1_budget \
  postgres:17-alpine
pnpm --filter @booleanone/web db:migrate
```

### Run it

`pnpm dev` starts the web app and the API together. The API takes its settings from your shell
rather than from a file. Local development uses the live realm `b1` and audience `b1-budget-api`,
which are the defaults, so the only thing to set is the API's own public address. Public metadata
and authentication challenges then use the local API address instead of the production one:

```bash
export BUDGET_RESOURCE_URI=http://localhost:8080
pnpm dev
```

The web app comes up on http://localhost:3000 and the API on http://localhost:8080. The API is
bearer-only, so `/me` answers 401 until you send it a token that realm `b1` minted for
`b1-budget-api`, and 403 if that token lacks the `budget-user` role or the `budget` scope. Spring
also publishes public protected resource metadata at `/.well-known/oauth-protected-resource`. The
API discovers Keycloak's signing keys on the first request carrying a bearer token rather than at
startup, which means it comes up whether or not `accounts.booleanone.com` is reachable.

## Working in the repo

| Command          | What it does                                          |
| ---------------- | ----------------------------------------------------- |
| `pnpm dev`       | Runs the web app and the API together                 |
| `pnpm build`     | Builds every package, both languages                  |
| `pnpm test`      | Runs every test suite                                 |
| `pnpm lint`      | Oxlint for JavaScript/TypeScript, Checkstyle for Java |
| `pnpm format`    | Formats files with Oxfmt                              |
| `pnpm typecheck` | Type-checks the TypeScript packages                   |

`pnpm test` needs Docker running, because the web session tests start their own Postgres through
Testcontainers.

One command covers both languages because Turbo drives the whole repo. The Java service is a
regular Gradle project with a small `package.json` that lets Turbo see it, so you can also drop
into `apps/resourceserver` and run `./gradlew` directly when you want a task Turbo does not expose.

The commit hook runs Oxlint fixes followed by Oxfmt on staged JavaScript and TypeScript, Oxfmt on other supported staged files, and Checkstyle on the whole Java source sets whenever a `.java` or `.kts` file is staged. Lint violations block the commit. A second hook scans the commit message for secrets with TruffleHog when it is installed, and warns when it is not.

## Layout

- `apps/resourceserver` - B1 Budget API, served at `api.budget.booleanone.com`.
- `apps/web` - B1 Budget web client, served at `budget.booleanone.com`.
- `packages/*` - Libraries and configuration shared across apps.

Authentication comes from Keycloak at `accounts.booleanone.com`, which is shared across all
BooleanOne products rather than owned by B1 Budget.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) for branch and commit conventions, and for where
architecture decisions are recorded.

Coding agents should read [AGENTS.md](AGENTS.md), which carries the rules that are easy to get
wrong and hard to infer from the code.

## License

Proprietary. Copyright BooleanOne B.V. All rights reserved.
