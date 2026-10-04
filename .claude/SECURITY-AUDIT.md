# Security review: authentication and authorization

Date: 2026-10-04. Scope: everything that decides who a request acts for and what it may do, in
`apps/resourceserver` (the B1 Budget API) and `apps/web` (the backend for frontend), plus the
Better Auth 1.7.5 code paths the web app depends on. The ADR index in `docs/DECISIONS.md` was used
as the statement of intent; the ADR texts themselves live in Jira and were not reachable from the
sandbox, so intent is taken from the index titles and the code comments that cite them.

## Verdict

No exploitable break was found in the authentication or authorization path as it exists today. The
design is sound and the code follows it: audience is the API's gate, roles come from
`resource_access.b1-budget-api` only, the browser never sees a token, the Better Auth HTTP surface is
cut down to one GET callback, the OIDC state is bound to a signed cookie, and the one open-redirect
check held against every hostile input tried.

The weaknesses are in what is missing or deferred rather than in what is written: there is no way
to end a session, tokens sit in Postgres in plaintext, API authorization is opt-in per method, and
nothing logs a refused login. Each is fixable without contradicting an ADR.

## Method

- Read every source file in both apps and the Better Auth 1.7.5 modules they call: the social
  callback, state generation and parsing, the generic OAuth provider, account linking, the origin
  check middleware, cookie defaults, and `getSession`.
- Ran the web unit tests that need no container: 41 passed. The Postgres suite
  (`session-adapter.test.ts`) could not run because the sandbox has a Docker client but no daemon.
  The Java tests could not run because the toolchain pins JDK 25 and only 21 is installed.
- Fuzzed `resolveReturnTo` with 29 hostile destinations (see "Attacks tried").
- Ran `pnpm audit --prod` against the lockfile.
- No live environment, Keycloak realm, or client secret was available, so Keycloak configuration
  is listed as "verify", not asserted.

## Attacks tried

| # | Attack | Result | Where the control lives |
|---|--------|--------|-------------------------|
| 1 | Forge a bearer token: `alg: none`, HS256 key confusion, self-signed RS256 | Refused. The decoder is built from issuer discovery and accepts RS256 against the realm JWKS only. | `ResourceServerSecurityConfig.jwtDecoder` |
| 2 | Replay a valid realm `b1` token minted for another product (`aud: openbao`) | Refused by `JwtAudienceValidator`. A test pins this. | `jwtValidator`, `JwtValidatorTests.rejectsOpenbaoAudience` |
| 3 | Present a Keycloak ID token or refresh token as a bearer | Refused twice: `typ` is `ID` or `Refresh`, not `JWT`, and `aud` is the web client, not the API. | Spring's default `JwtTypeValidator`, kept via `createDefaultWithValidators` |
| 4 | Token without `exp`, without `sub`, or 61 s past expiry | Refused. `setAllowEmptyExpiryClaim(false)`, a `sub` claim validator, 60 s skew. | `jwtValidator` |
| 5 | Escalate with realm roles, groups, or another client's roles in `resource_access` | Ignored. Only `resource_access.<audience>.roles` becomes authority. A test pins this. | `ClientRoleAuthoritiesConverter` |
| 6 | Call `/me` with the right audience and scope but no `budget-user` role | 403 from the service-layer `hasRole`. | `PrincipalService.subjectOf` |
| 7 | Reach Better Auth's own HTTP endpoints: `get-session`, `sign-out`, `refresh-token`, `get-access-token`, `sign-in/social`, `revoke-*`, `list-*` | 404 for everything but `GET /api/auth/callback/keycloak`. Tests pin this. | `createAuth` handler wrapper |
| 8 | Login CSRF: start a login, capture the callback URL with my `code` and `state`, hand it to a victim | Blocked. Better Auth 1.7.5 writes a signed `better-auth.state` cookie at sign-in and refuses a callback whose state is not in the caller's cookie (`skipStateCookieCheck` defaults to off). The DB record is single-use and expires in 10 minutes. | Better Auth `state.mjs` `parseGenericState` |
| 9 | Open redirect through `returnTo`: `//evil`, `/\evil`, `/%2F%2Fevil`, `/..//evil`, CRLF, `//budget.booleanone.com@evil`, control characters, 29 variants | Every input resolved to the app origin or fell back to `/`. | `resolveReturnTo`, `return-to.test.ts` |
| 10 | Open redirect through Better Auth's own `callbackURL` validation | Not applicable, and worth knowing: the origin-check middleware only runs when `ctx.request` is set, and server-side `auth.api.*` calls leave it unset. `resolveReturnTo` is therefore the only control. Both call sites use it. | `session-proxy.ts`, `sign-in.ts` |
| 11 | Forge or replay a session cookie | Refused. The cookie is an HMAC-signed opaque reference; the session is read from Postgres on every request with no cookie cache. | Better Auth signed cookies, `session.cookieCache.enabled: false` |
| 12 | Smuggle `x-budget-return-to` from the browser to the render | Overwritten by the Proxy on every non-public path. Public paths never read it. | `session-proxy.ts` |
| 13 | Bypass the Proxy via matcher exclusions (`_next/static`, `favicon.ico`, ...) | Those paths carry no product data, and the data access layer verifies the session again before any API call. | `proxy.ts`, `dal.ts` |
| 14 | Account takeover by email: a new Keycloak `sub` whose email matches an existing B1 user | Refused. Identity is keyed on `sub`; `accountLinking.enabled: false` makes an email match a hard "account not linked". | Better Auth `link-account.mjs`, `create-auth.ts` |
| 15 | Hijack another user's session row by colliding on `sid` during the upsert | Needs a Keycloak-signed ID token carrying the victim's `sid`. Even then the upsert's `setWhere userId = ...` refuses to move a row to another user. | `session-adapter.ts` |
| 16 | Spend a rotated refresh token twice through concurrent requests | Serialised under `SELECT ... FOR UPDATE`; a rotation followed by a failed commit ends the session rather than retrying. Tests pin this. | `refresh-session.ts` |
| 17 | Cross-site POST to a Server Action with the victim's cookie | Blocked by Next's Origin/Host check on Server Actions, and the session cookie is `SameSite=Lax`. | Next.js, Better Auth cookie defaults |
| 18 | CSRF or cross-origin read against the API | Not applicable: no cookies, no CORS headers, bearer only. | ADR-39, `csrf.disable()` |
| 19 | Pull tokens out of logs or error pages | Nothing surfaces: Better Auth logging is disabled, provider and DB errors are collapsed to `SessionUnavailable`, API network errors to `BudgetApiUnavailable`. | `create-auth.ts`, `refresh-session.ts`, `budgeting-api.ts` |
| 20 | Exhaust API worker threads by holding JWKS or discovery connections open | Plausible. See finding 4. | `jwtDecoder` |
| 21 | Flood the sign-in Server Action or the silent-recovery path to amplify database writes | Plausible. See finding 5. | `sign-in.ts`, `session-proxy.ts` |

## Findings

Severity is the impact if the weakness were exploited in production, weighed against how much
must already have gone wrong for that to happen.

### 1. Medium: access, refresh and ID tokens are stored in plaintext

`betterauth.session` holds `access_token`, `refresh_token` and `id_token` as plain `text`
(`drizzle/schemas/auth-schema.ts`, migration `0000_auth.sql`). Anyone who can read the table, a
backup, a replica, or a query log holds a spendable access token for every signed-in person for up
to six minutes, and an ID token that can end their SSO session. The refresh token needs the client
secret to be spent, which limits but does not remove the exposure, because the secret is an
environment variable on the same host.

The migration test shows the runtime role is confined to the `betterauth` schema, which is good, but
the role that runs the app is exactly the one that must read these columns.

The README's connection string example carries no `sslmode`, and `pg` defaults to no TLS, so the
same tokens also cross the network to Postgres in clear unless the platform forces TLS.

What to do:

- Encrypt the three token columns at the application layer before they reach Drizzle, and decrypt in
  `refreshSession` and the session `create` hook. Use AES-GCM with a key separate from
  `BETTER_AUTH_SECRET` and delivered through OpenBao like the others. The `session-adapter.ts`
  upsert and the `refresh-session.ts` update are the only two writers.
- Require `sslmode=verify-full` in the production `BUDGET_DATABASE_URL` and say so in the README.
- Keep this inside ADR-20. The row stays in Postgres; only its contents change shape.

### 2. Medium: there is no way to end a session

ADR-33 says sign-out ends the BooleanOne session through RP-initiated logout, and the glossary
describes backchannel logout, but neither exists. The handler returns 404 for `sign-out`, no Server
Action deletes a row, and no endpoint accepts a logout token from Keycloak. The session cookie is
reissued with an absolute expiry of up to 30 days (`maintainSession`), bounded only by the Keycloak
refresh lifetime.

Consequences:

- A person on a shared or lost device cannot end their B1 Budget session from B1 Budget.
- When another BooleanOne product ends the SSO session, B1 Budget learns of it only on the next
  refresh. Refresh is attempted only inside the 30 second window before the access token expires, so
  a page view inside the remaining access-token lifetime still renders with product data. ADR-26
  accepts a six minute window at the API; a backchannel endpoint would close it at the web app.

What to do:

- Add a sign-out Server Action: read the row through the data access layer, delete it, expire the
  cookie, then redirect to Keycloak's `end_session_endpoint` with `id_token_hint` and a
  `post_logout_redirect_uri` on the app origin. `idToken` is already stored for exactly this.
- Add a backchannel logout Route Handler under `/api/auth/` (on the public list by necessity).
  Verify the logout token against the realm JWKS, require `events` to contain
  `http://schemas.openid.net/event/backchannel-logout` and `sid` to be present, then delete the row
  whose `id` equals `sid`. Keying sessions on `sid` (ADR-20, ADR-21) makes this a one-line delete.
- Register the backchannel URL on the `b1-budget-web` client in Keycloak.

### 3. Medium: API authorization is opt-in per method

The HTTP layer requires only `authenticated()`. Every method-level check is an annotation:
`@PreAuthorize("@oauth2.hasScope('budget')")` on the controller and `hasRole('budget-user')` on the
service. Nothing fails if a future handler or service method omits them. A BooleanOne user with a
valid token for `b1-budget-api` but without the `budget-user` role (the README confirms such tokens
exist: they get 403 today) would reach any unannotated endpoint.

This is not a vulnerability now, with one endpoint, but it is the regression most likely to ship
unnoticed as the API grows.

What to do, without contradicting ADR-27 (authority stays in client roles):

- Raise the HTTP floor: `anyRequest().hasAuthority("SCOPE_budget")` or `hasRole("budget-user")`,
  so an unannotated endpoint denies by default. Keep method-level annotations for finer rules.
- Or, if the team prefers method security as the single home for authorization, add an ArchUnit test
  that fails the build when a `@RestController` handler or a public `@Service` method carries no
  `@PreAuthorize`.
- Document which one was chosen in the ADR-27 row or a new ADR.

### 4. Low: outbound calls to Keycloak from the API have no timeouts

`JwtDecoders.fromIssuerLocation` and the Nimbus JWKS source it builds use a default `RestTemplate`
with no connect or read timeout. Discovery runs on the first bearer request; the JWKS is fetched again
when the five minute cache expires or a token names an unknown `kid`. If Keycloak accepts the
connection and stalls, every request thread that triggers a fetch blocks indefinitely, and the API
becomes unavailable while its health looks fine. The web app's own fetches to Keycloak already set
`AbortSignal.timeout(10_000)`; the API should match.

What to do:

- Build the decoder with `NimbusJwtDecoder.withIssuerLocation(issuer).restOperations(rest)` where
  `rest` has explicit connect and read timeouts, and keep the `SupplierJwtDecoder` wrapper so boot
  still does not depend on Keycloak. The validator and converter beans stay as they are.
- Consider `.jwtProcessorCustomizer` to set the JWKS cache and outage tolerance explicitly rather
  than inheriting Nimbus defaults.

### 5. Low: unauthenticated write amplification on the sign-in path

Two paths let an anonymous caller create a `betterauth.verification` row and a Keycloak redirect per
request with no throttle:

- POST to the `signIn` Server Action. Better Auth's built-in rate limiter guards only its HTTP
  handler, which this app bypasses by calling `auth.api.signInSocial` in-process.
- Any request carrying a `better-auth.session_token` cookie with a garbage value and no
  `budget.session-recovery` cookie makes the Proxy start a silent login (`session-proxy.ts`). The
  recovery cookie is the only brake, and the attacker simply does not send it back.

The cost is one insert, one select and one redirect per request, so it is a cheap way to grow the
verification table and to make Keycloak the next hop for a flood.

What to do:

- Rate limit `/sign-in` and the silent-recovery branch at the edge or in the Proxy, keyed by IP.
- Make sure expired verification rows are purged. Better Auth deletes a row when the state is
  consumed; rows for flows that never return need a periodic cleanup.

### 6. Low: refused logins leave no trace

`logger: { disabled: true }` and a one-line `onError` mean a state mismatch, a failed code exchange,
a nonce or issuer mismatch, a forged cookie, and a 403 from the API all vanish. ADR-20's concern is
sound: Better Auth's error objects can carry tokens. But the cure removed detection along with the
leak. Today nobody would notice attack 8 or attack 14 being attempted.

What to do:

- Supply a Better Auth `logger.log` that records only the error code, the path and a request id,
  never the message or payload, at `warn` and above.
- Log `SessionEnded` from `invalid_grant`, `SessionUnavailable`, and the API's 401 and 403 outcomes
  in the data access layer with the same discipline.

### 7. Low: the web app sets no browser security headers

`next.config.ts` adds none. Unless the edge adds them, pages ship without `Content-Security-Policy`
(so no `frame-ancestors`), `Referrer-Policy`, `X-Content-Type-Options` or HSTS. Clickjacking becomes
relevant the moment a page carries a mutation, and a `returnTo` path in `/sign-in?returnTo=...` is
sent to Keycloak in the Referer on the redirect. The API inherits Spring Security's default headers
and is fine.

What to do: add a `headers()` block to `next.config.ts` with at least
`Content-Security-Policy: frame-ancestors 'none'`, `Referrer-Policy: strict-origin-when-cross-origin`
and `X-Content-Type-Options: nosniff`, and HSTS if the edge does not already send it.

### 8. Low: failed callbacks land on a page that does not exist

When the state cannot be parsed, Better Auth redirects to `${baseURL}/error?error=...`. The app has no
`/error` route, so the person sees Next's 404. Two concurrent sign-ins in one browser cause exactly
this: the second overwrites the single `better-auth.state` cookie, so the first callback fails with
`state_mismatch`. It is a usability issue that also buries the signal from finding 6.

What to do: set `onAPIError.errorURL` to `/sign-in` and let the sign-in page keep its fixed reasons
(ADR-37). Do not echo the `error` query parameter.

### 9. Low: dependency advisories, dev tooling only

`pnpm audit --prod` reports two advisories, neither in the runtime bundle:

| Package | Via | Severity | Note |
|---------|-----|----------|------|
| `braces` <= 3.0.3 | `packages/ui` > `shadcn` CLI | high | Build-time CLI, not shipped |
| `esbuild` <= 0.24.2 | `drizzle-kit` bundled loader | moderate | Dev server advisory; `drizzle-kit` runs migrations only |

Also: the Semgrep step in `bitbucket-pipelines.yml` swallows its exit code, so SAST never blocks a
merge. TruffleHog does block, which is the right priority, but a high-severity Semgrep finding should
at least fail the pull-request pipeline.

### 10. Informational: Keycloak configuration the code assumes

These cannot be checked from the repository and the whole gate rests on them.

- The audience mapper that adds `b1-budget-api` must live only on the `budget` client scope, and that
  scope must be assignable only to clients meant to call the API. A default realm scope carrying the
  mapper would give every `b1` token the audience and reduce ADR-25 to the role check.
- `b1-budget-web` must be confidential, PKCE S256 required, and its redirect URIs exact
  (`https://budget.booleanone.com/api/auth/callback/keycloak`, no wildcard).
- Access token lifespan 5 minutes, as ADR-26 assumes; "Revoke Refresh Token" on, as the rotation
  handling assumes; refresh token max reuse 0.
- `budget-user` is a client role on `b1-budget-api`, and nobody holds it by default.

### 11. Informational: fragile seams worth a guard

- `resolveReturnTo` is the only open-redirect control, because Better Auth's origin check does not
  run on in-process `auth.api` calls (attack 10). A lint rule or a wrapper around `signInSocial` that
  takes a resolved URL type would stop a third call site from bypassing it.
- `(authenticated)/layout.tsx` does not verify the session; each page does. That is Next's
  recommendation, but a page that renders without calling the data access layer relies on the Proxy
  alone. A test that every page under `(authenticated)` imports from `lib/dal` is cheap.
- `createBudgetingApi.get` takes a path argument. It is a constant today; the glossary already warns
  that a caller-supplied path is an open proxy holding the user's token. Keep the path a literal
  union type rather than `string`.

## What held up well

Worth recording so nobody "simplifies" it away:

- Audience is the gate and is tested; `azp` is deliberately not pinned (ADR-25).
- `typ`, `cnf` thumbprint, `exp`, `sub`, issuer and 60 second skew are all enforced and tested.
- Authority is `resource_access.<audience>.roles` only; realm roles, groups, email and username grant
  nothing, and the principal is `sub` (ADR-27).
- The Better Auth HTTP surface is one GET route; every other endpoint is 404 and tested.
- Tokens never reach the browser or the `account` table (a CHECK constraint enforces the latter).
- The OIDC state is random, stored once, bound to a signed cookie, single-use and short-lived; PKCE is
  S256; the ID token is verified for signature, issuer, audience and nonce before `accountSubject`
  decodes it; the callback `iss` parameter is checked.
- Session creation is impossible outside a verified callback (the `AsyncLocalStorage` guard, tested).
- Refresh is serialised, rotation-aware and fails closed.
- Secrets never reach commits (TruffleHog on history and messages), and database roles are separated
  and tested.

## Suggested order of work

1. Finding 2, sign-out and backchannel logout. It is the only item a user would notice is missing.
2. Finding 1, encrypt stored tokens and require TLS to Postgres.
3. Finding 3, a default-deny floor on the API before the second endpoint lands.
4. Findings 4 to 8 together as a hardening pass; each is under a day.
5. Confirm finding 10 against the realm and record the answers in the ADR-25 and ADR-26 texts.
