# 15. The "account row holds identity only" rule cites different ADRs in three places

**Severity:** Low. CONTRIBUTING.md asks for the key at the seam; three seams name three sets.

## What

The same constraint, that the account row keeps no credentials and each `sid` owns its pair, is
cited as ADR-21 and ADR-24 in the migration, as ADR-20 and ADR-40 in the schema and in
`create-auth.ts`. ADR-20 is the record that states "The account row holds identity only"; ADR-24
mentions the row in passing; ADR-21 and ADR-40 do not decide it.

## Where

- `apps/web/drizzle/migrations/0001_account_identity_only.sql:1` (ADR-21, ADR-24)
- `apps/web/drizzle/schemas/auth-schema.ts:80` and `apps/web/lib/auth/create-auth.ts:32` (ADR-20, ADR-40)
- https://booleanone.atlassian.net/browse/ADR-20, https://booleanone.atlassian.net/browse/ADR-24

## Proposal

Cite ADR-20 at all three seams, with ADR-24 where the Better Auth account row is the subject.
