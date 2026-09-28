# Contributing to B1 Budget

## Architecture decisions

Architecture decisions do not live in this repo. They live in the company-managed ADR project at
<https://booleanone.atlassian.net/jira/core/projects/ADR>, next to the decisions from every other
BooleanOne product, because most of them outlive the repo that provoked them.

- **Write the ADR there before the change lands,** not after. A decision recorded once the code is
  merged is a description, and it will read like one.
- **Give it a title that survives out of context.** It sits in a list beside decisions about
  identity, infrastructure, and other products, so name the product and the subject. A reader
  scanning that list has no idea which repo the decision came from.
- **Name the ADR key in the code it constrains.** A commit message is found by archaeology, so put
  the key in a comment at the seam a future reader would otherwise undo:
  `// ADR-20, ADR-21: each SSO session holds its own token pair, keyed by sid.` The commit trailer
  is the audit trail, not the way anybody discovers the decision exists.

## Commits

- **NEVER** put secrets, keys, or certificates in a commit, in files or in the message itself.
- Branch off `main` unless told not to. Commit subjects follow
  [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/). When a ticket exists, its
  number is the scope.
- Commit bodies list 2-5 highlights as bullet points of what the commit changed, not how it was
  built. Keep each under 30 words. Two sharp highlights beat five vague ones, so cut anything that
  does not earn its line.
- When a commit implements an ADR, close the body with a `Refs: ADR-20` trailer.
  One trailer per decision. Carry it into the squash message, or the link is lost.

A well-formed commit that adheres to these rules:

```text
feat(BUD-21): add the Postgres auth schema and its first migration

- Adds the betterauth schema with user, account, session, and verification tables.
- The session table is keyed by the Keycloak sid and holds that session's own token pair.
- Adds db:generate, db:migrate, and db:push scripts.
- Adds pg and Drizzle ORM for the connection, and Drizzle Kit for migrations.

Refs: ADR-20
Refs: ADR-21
```
