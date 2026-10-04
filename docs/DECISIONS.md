# Decisions binding this repo

Full text lives in the shared ADR project. This table is the index, so a `grep` answers
"what constrains the thing I am about to touch" without a network call.

| ADR    | Title                                                                                 | Area                   |
| ------ | ------------------------------------------------------------------------------------- | ---------------------- |
| ADR-19 | Next is the backend for frontend for B1 Budget                                        | web / architecture     |
| ADR-20 | The B1 Budget web session lives in Postgres, not in a cookie                          | web / session          |
| ADR-21 | Keycloak owns sessions, and we render them in our own UI                              | web / session          |
| ADR-22 | The B1 Budget session cookie is an opaque reference and caches nothing                | web / session          |
| ADR-24 | Better Auth is the OIDC relying party in B1 Budget webapp                             | web / auth             |
| ADR-25 | The B1 Budget API trusts the audience, not the caller                                 | api / token validation |
| ADR-26 | A revoked session reaches the API for up to six minutes                               | api / token validation |
| ADR-27 | Authority comes from client roles, with scopes mapped alongside                       | api / authorization    |
| ADR-28 | Local development logs into the POC b1 realm                                          | dev environment        |
| ADR-29 | The B1 Budget API refuses with Spring's bearer token challenges                       | api / refusals         |
| ADR-30 | Protected resource metadata is corrected, not suppressed                              | api / refusals         |
| ADR-31 | A 403 is not a session's concern                                                      | web / refusals         |
| ADR-32 | The B1 Budget proxy maintains the session and the data access layer verifies          | web / routing          |
| ADR-33 | The B1 Budget sign out ends the BooleanOne session                                    | web / sign-out         |
| ADR-34 | An ended session retries before it interrupts                                         | web / session          |
| ADR-35 | B1 Budget shows a no-access page to BooleanOne users without the role                 | web / refusals         |
| ADR-36 | The B1 Budget sign-in returns you where you were interrupted                          | web / sign-in          |
| ADR-37 | The B1 Budget sign-in page always renders and names why you are there                 | web / sign-in          |
| ADR-38 | B1 Budget calls its API from the server render and from Server Actions                | web / api access       |
| ADR-39 | The B1 Budget API serves no browser origin                                            | api / api access       |
| ADR-40 | B1 Budget refreshes tokens in one shared routine and calls its API through one module | web / api access       |

## Platform decisions this repo inherits

Owned by the Platform team and settled outside this repo. Listed because product code depends on
what they guarantee.

| ADR    | Title                                                | Area                |
| ------ | ---------------------------------------------------- | ------------------- |
| ADR-9  | Define human and workload identity and authorization | platform / identity |
| ADR-12 | OpenBao to deliver runtime secrets                   | platform / secrets  |
