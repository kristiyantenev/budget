# B1 Budget Glossary

## Architecture

### Backend for frontend (BFF)

A server that fronts one client and holds its OAuth session. In B1 Budget it is the Next server in
`apps/web`, which runs the code flow, keeps the session, and calls the API with a bearer token the
browser never sees.

### Resource server

The OAuth 2.0 role `apps/resourceserver` holds behind `api.budget.booleanone.com`. Stateless and
bearer-only: it validates a token per request, keeps no session, and asks Keycloak nothing at
request time.

### Data access layer (DAL)

The single module in `apps/web` that every server component, Server Action and Route Handler passes
through to reach product data. The only code in the web app that decides whether a caller is
allowed.

## Identity

### Realm `b1`

The single BooleanOne identity realm at `https://accounts.booleanone.com/realms/b1`, shared by
every product. A valid `b1` token is not by itself a B1 Budget token.

### `b1-budget-web`

The confidential Keycloak client the Next backend for frontend drives. The only client that
performs a login on a person's behalf.

### `b1-budget-api`

The Keycloak client that owns B1 Budget's audience value and its role vocabulary. Nothing logs in
as it.

### Principal

The person a request acts for, identified by the token's `sub` claim and by nothing else. Email
and username identify the same person and may not stand in for them.

### Relying party (RP)

The OIDC role `apps/web` holds against Keycloak, implemented by Better Auth. A relying party
consumes identity and never owns it.

### Authorization Code with PKCE

The OAuth 2.0 flow every BooleanOne client runs. Proof Key for Code Exchange binds the
authorization code to the client that began the flow, which is what lets a public client such as a
native mobile app run it without a secret.

## Authority

### Role

A named permission grant defined as a client role on `b1-budget-api`. Roles attach to what a
person may do, never to who they are.

### Scope

What Keycloak permits a client to ask for on a person's behalf. Distinct from a role, which is what
the person may do.

### Audience (`aud`)

The claim naming the client a token may be spent at, `b1-budget-api` for B1 Budget. Realm `b1` is
shared, so signature and issuer prove nothing about which product a token targets and the audience
is the only claim that does.

### Protected resource metadata

The RFC 9728 document the resource server publishes at `/.well-known/oauth-protected-resource`,
describing itself and naming realm `b1` as its authorization server. Public by design.

## Session

### B1 Budget session

The session the backend for frontend owns, as a row in Postgres keyed by the Keycloak user session
id. It refers to an SSO session and never replaces one.

### SSO session

The session Keycloak owns in realm `b1`, shared across every BooleanOne product. Keycloak also
calls this a user session, and its `sid` is what a B1 Budget session keys on.

### Refresh token rotation

Keycloak retiring a refresh token as it is spent and issuing a new one, making each refresh token
single-use. It is why the refresh path serialises instead of letting two requests race for the same
token.

### RP-initiated logout

The OIDC flow where the relying party ends a session by redirecting the browser to Keycloak's
`end_session_endpoint` with an `id_token_hint`. This is what B1 Budget's sign-out performs, so it
ends the SSO session rather than only the local one.

### Backchannel logout

The OIDC flow where Keycloak posts a signed logout token straight to a registered client endpoint
when a session ends anywhere. It is how B1 Budget learns that a session it holds a row for is gone.
