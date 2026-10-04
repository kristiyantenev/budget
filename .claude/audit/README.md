# Documentation audit, 2026-10-04

Deviations between the repo (code, README, AGENTS.md, CONTRIBUTING.md, docs/), the ADR project
(ADR-1 to ADR-40, with ADR-19 to ADR-40 read in full), and the BUD project (BUD-1 to BUD-23).
Jira was read only. Nothing there was changed.

One file per finding. Each names what is out of sync, where, and a way to close it.

| #   | Severity | Finding                                                                                   |
| --- | -------- | ----------------------------------------------------------------------------------------- |
| 01  | High     | Sign-out (ADR-33) is not implemented and has no ticket; the glossary describes it as live |
| 02  | High     | 401 refresh-and-retry (ADR-31, ADR-40) is not built; the hook for it is dead code        |
| 03  | High     | No-access page (ADR-35) is a one-line placeholder without sign-out, and has no ticket    |
| 04  | High     | Sign-in page deviates from ADR-37 on reason set, copy, and signed-in arrivals            |
| 05  | High     | Data access layer verifies the session only, not the role (ADR-32, ADR-35, BUD-9)        |
| 06  | High     | Device list and backchannel logout (ADR-21) are unbuilt; ADR-26 says the endpoint exists |
| 07  | High     | Request-level refusal tests promised by ADR-29 do not exist; BUD-20 closed with a gap    |
| 08  | Medium   | ADR-24 and BUD-6 say Better Auth sign-out reaches Keycloak; ADR-33 says it does not      |
| 09  | Medium   | ADR-31 deletes the session row after a failed retry; ADR-22, ADR-40 and code keep it     |
| 10  | Medium   | Revocation window is five minutes in ADR-33 and six in ADR-26; BUD-23 misapplies skew    |
| 11  | Medium   | ADR-28 and BUD-8 describe a dev compose file that the README says does not exist         |
| 12  | Medium   | CI guarantees in AGENTS.md and README hold on Bitbucket only; the GitHub remote has none  |
| 13  | Medium   | AGENTS.md forbids hard-coded production domains; application.yaml defaults to two        |
| 14  | Low      | Better Auth is pinned at 1.7.5; comments and ADR-24 still speak of 1.7.1                  |
| 15  | Low      | The "account row holds identity only" rule cites different ADRs in three places          |
| 16  | Low      | Commits without the body and trailer CONTRIBUTING.md requires                             |
| 17  | Low      | Done tickets with unchecked acceptance criteria                                           |
| 18  | Low      | Wording defects in ADRs, tickets and the glossary                                         |
| 19  | Low      | DECISIONS.md omits two platform ADRs the web and API decisions lean on                    |
