# 13. AGENTS.md forbids hard-coded production domains; application.yaml defaults to two

**Severity:** Medium. The rule and the config read against each other.

## What

AGENTS.md: "Never hard-code a production domain in application logic. Domains reach the code
through environment variables and typed configuration." `application.yaml` defaults
`budget.resource.uri` to `https://api.budget.booleanone.com` and `budget.token.issuer-uri` to
`https://accounts.booleanone.com/realms/b1`. ADR-28 justifies the issuer default (local dev uses
the live realm). Nothing justifies the resource default: a developer who forgets
`BUDGET_RESOURCE_URI` publishes production metadata and challenges from a laptop, which ADR-30
exists to prevent. ADR-30 says the value "arrives as typed configuration"; a default is a literal
with an override.

## Where

- `AGENTS.md:38`, `apps/resourceserver/src/main/resources/application.yaml:10` to `:15`
- https://booleanone.atlassian.net/browse/ADR-28 (issuer default), https://booleanone.atlassian.net/browse/ADR-30 (resource identifier)

## Proposal

Drop the `budget.resource.uri` default so the API fails at boot without it, and keep the issuer
and audience defaults under ADR-28. Sharpen the AGENTS.md rule to say which defaults are allowed
and why, so the next reader does not file the yaml as a violation.
