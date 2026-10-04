# 07. Request-level refusal tests promised by ADR-29 do not exist; BUD-20 closed with a gap

**Severity:** High. The contract has no test, and a Done ticket says so itself.

## What

ADR-29 consequences: "Request-level tests assert the status, the `error` code, the absence of
`error` on the no-token call, the empty body, and the `resource_metadata` address. They also
assert that no header carries the token or any fragment of it, `preferred_username`, the email,
the display name, or the session identifier."

The API has two unit test classes, for the validator and the converter. Nothing exercises the
filter chain, the entry point, the metadata document (ADR-30), or the 403. BUD-20 is Done with
"An authenticated caller without `budget-user` gets a 403" unchecked.

## Where

- https://booleanone.atlassian.net/browse/ADR-29 (consequences), https://booleanone.atlassian.net/browse/ADR-30 (four customizer lines, untested), https://booleanone.atlassian.net/browse/BUD-20 (unchecked box)
- `apps/resourceserver/src/test/java/com/booleanone/budget/security/` (two classes, no MockMvc)

## Proposal

Add a `@WebMvcTest` or `MockMvcTester` suite with `jwt()` post-processors covering the four
ADR-29 rows, the header-leak assertions, and the ADR-30 document. Reopen or annotate BUD-20 until
the 403 criterion is checked.
