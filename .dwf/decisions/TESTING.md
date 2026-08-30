# Testing Decisions and Test Contracts

This is the canonical testing design ledger for the starter baseline. It gives important product and technical behavior durable test contracts that agents can discover before implementation and reconcile before task completion.

This ledger does not override Product Decisions or Technical Decisions, and it is not a second generic ADR system. Product behavior remains owned by [`PRODUCT.md`](PRODUCT.md); implementation mechanisms remain owned by [`TECHNICAL.md`](TECHNICAL.md). This file owns the testing policy, test-contract identity, evidence obligations, and dependency-aware status of those obligations.

## Relationship to the design system

- Product Decisions explain what the product should do and why.
- Technical Decisions explain how the accepted product is built.
- Testing Decisions explain how the project preserves and proves important behavior as implementation grows.
- `TST-*` contracts describe the behavior or risk that must be proven. One contract may require evidence at several layers.
- The Agent SPEC references `TST-*` contracts for implementation-facing traceability.
- `TODO.md` assigns implementation and evidence work to delivery tasks. It references contracts but does not redefine them.
- Test files, commands, screenshots, logs, and PRs are evidence for contracts. They are not the source of the contract itself.

The intended chain is:

```text
Product / technical decision
            ↓
      TST-* contract
            ↓
       TODO task
            ↓
  test implementation and run evidence
```

## Testing decisions

<a id="tsd-001"></a>

### TSD-001 — Test obligations are first-class design artifacts

- **Status:** ACCEPTED
- **Related product decisions:** D-009
- **Related technical decisions:** TD-009, TD-021

Important behavior and high-impact risks receive a stable `TST-*` contract during design, even when the required integration or end-to-end dependency is not available yet. A task may implement only the evidence made possible by its current slice, but it must leave the remaining obligation visible with its dependency and follow-up task.

<a id="tsd-002"></a>

### TSD-002 — Evidence is progressive and behavior based

- **Status:** ACCEPTED
- **Related product decisions:** D-001, D-002, D-003, D-004, D-005, D-009
- **Related technical decisions:** TD-009, TD-013, TD-014, TD-018, TD-020, TD-021

Evidence is selected by behavior and risk, not by a target percentage or a uniform test count. A contract may require domain, application, infrastructure, boundary, UI, end-to-end, live-smoke, or performance evidence. `verified` means all evidence required for the current baseline has passed; a passing lower-level test never silently satisfies an unimplemented higher-level obligation.

<a id="tsd-003"></a>

### TSD-003 — Test contract IDs are stable behavior anchors

- **Status:** ACCEPTED
- **Related product decisions:** D-009
- **Related technical decisions:** TD-009, TD-021

`TST-*` IDs identify durable behavior and risk, not test filenames, functions, frameworks, or current source locations. Refactoring a test or replacing a test runner does not retire a contract. IDs are never reused after retirement.

## Identifiers

### Testing policy decisions: `TSD-*`

Use `TSD-NNN` for an accepted testing policy or lifecycle choice. These records explain how the project decides what evidence is required and how that evidence is managed. Mechanism choices such as PostgreSQL Testcontainers, Playwright browser selection, and Neon verification remain `TD-*` decisions.

### Test contracts: `TST-*`

Use `TST-<CAPABILITY>-NNN` for a durable test contract. The capability segment is a discovery aid, not an architectural layer. Examples include `TST-AUTH-001`, `TST-LISTS-001`, and `TST-E2E-001`.

A contract may map to more than one executable test. Keep one ID when those tests prove one coherent behavior or risk at different evidence layers. Split the contract when the behavior, risk, owner, or completion condition is meaningfully different.

Evidence does not receive a separate ID in this first version. Record the test path, command, commit, PR, or external evidence link under the contract. Introduce an evidence ID only if the project later needs durable cross-run evidence records.

## Contract lifecycle

The status vocabulary is deliberately small:

| Status        | Meaning                                                                                                                                                    |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `specified`   | The obligation is designed and has no verified evidence recorded yet. Normal future work starts here.                                                      |
| `in_progress` | Evidence implementation or verification is actively being performed.                                                                                       |
| `partial`     | Some required evidence is verified, but the contract is not complete.                                                                                      |
| `verified`    | All required evidence for the accepted baseline has passed and is recorded.                                                                                |
| `blocked`     | The next required evidence cannot be implemented or run because a named prerequisite is unavailable. Link the blocker and the task that unblocks it.       |
| `deferred`    | The evidence is intentionally outside the current baseline or slice. Record the reason and future scope; do not use this to hide unfinished baseline work. |
| `retired`     | The contract no longer applies because its owning behavior or decision was superseded. Never reuse its ID.                                                 |

Normal task dependencies do not automatically mean `blocked`. Use `specified` while a future task is simply expected to implement the contract. Use `blocked` when the current task has reached the obligation but an external prerequisite or missing capability prevents progress.

## Required contract shape

Every active `TST-*` record should state:

- the behavior or risk in observable terms;
- the Product Decisions, Technical Decisions, Edge Cases, and SPEC area it verifies;
- the capability, evidence layers, and test modes involved;
- the required evidence, including evidence that is intentionally future-facing;
- the owning delivery task or tasks;
- dependencies and the condition that makes blocked evidence runnable;
- current status and concrete evidence or follow-up.

Do not replace a contract with a test filename. Do not mark a contract `verified` because a weaker substitute, a manual glance, or a skipped integration suite passed.

## Agent execution protocol

For any implementation or behavior-changing task:

1. Read the relevant `TST-*` contracts before writing implementation code.
2. Add the affected contract IDs to the delivery task and identify which evidence is possible in the current slice.
3. If the task introduces an important behavior without a contract, create or update the contract before implementation. Do not invent a competing product or technical requirement.
4. Use the repository's TDD workflow for executable behavior: write a focused failing test where the required dependency is available, implement the smallest behavior, and verify it.
5. If an integration or E2E test cannot yet be written or run, preserve its contract, state the exact dependency, and link the task that will resume it. Do not replace it with a misleading unit test and do not silently omit it.
6. Before task completion, reconcile every affected contract as `verified`, `partial`, `blocked`, `deferred`, or `retired`, with commands/results or a concrete follow-up.
7. Include the contract IDs and verification evidence in the PR description.

The `testing-first-class` project skill operationalizes this protocol. The skill improves agent reliability through explicit instructions and traceability; it is not a mechanical guarantee that an agent can never omit work. The ledger and task/PR reconciliation make an omission visible to the next agent and human reviewer.

## Test contract index

| ID                                          | Contract                                                                             | Primary evidence                                       | Owner                           | Status      |
| ------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------ | ------------------------------- | ----------- |
| [TST-FOUNDATION-001](#tst-foundation-001)   | Shared database runtime works across local PostgreSQL and Neon                       | Unit, local integration, hosted smoke                  | T-03                            | `verified`  |
| [TST-MIGRATION-001](#tst-migration-001)     | The versioned migration chain upgrades the intended databases                        | PostgreSQL migration integration, Neon migration smoke | T-01, T-04, T-14                | `partial`   |
| [TST-HARNESS-001](#tst-harness-001)         | Database-backed test infrastructure is isolated and fails safely                     | Testcontainers integration and harness checks          | T-14, T-15                      | `partial`   |
| [TST-PERSISTENCE-001](#tst-persistence-001) | PostgreSQL enforces persistence invariants and repository mappings                   | PostgreSQL integration and hosted query-plan evidence  | T-04, T-06, T-07, T-14, T-16    | `verified`  |
| [TST-AUTH-001](#tst-auth-001)               | Email/password sessions can be created, used, and ended                              | Boundary integration, end-to-end                       | T-05, T-15                      | `partial`   |
| [TST-AUTH-002](#tst-auth-002)               | Magic-link request and consumption work in local/test mode                           | Mailbox integration, end-to-end                        | T-05, T-15                      | `partial`   |
| [TST-AUTH-003](#tst-auth-003)               | Private operations require the real session owner                                    | Application, boundary, end-to-end                      | T-05, T-09, T-15                | `partial`   |
| [TST-LISTS-001](#tst-lists-001)             | Inbox creation and list lifecycle remain correct                                     | Domain, application, PostgreSQL integration, browser   | T-06, T-10, T-14                | `verified`  |
| [TST-LISTS-002](#tst-lists-002)             | List validation, CRUD, uniqueness, and deletion behavior are correct                 | Domain, application, PostgreSQL, boundary              | T-04, T-06, T-09, T-14          | `verified`  |
| [TST-LISTS-003](#tst-lists-003)             | List pagination is bounded, deterministic, and context-safe                          | Application, PostgreSQL, boundary, UI                  | T-06, T-08, T-10, T-14          | `verified`  |
| [TST-TASKS-001](#tst-tasks-001)             | Task lifecycle, status, title, and notes rules are correct                           | Domain, application, boundary                          | T-07, T-09, T-14                | `verified`  |
| [TST-TASKS-002](#tst-tasks-002)             | Task ownership, list relationships, uniqueness, and cascade behavior are correct     | Application, PostgreSQL, boundary                      | T-04, T-07, T-09, T-14          | `verified`  |
| [TST-TASKS-003](#tst-tasks-003)             | Task pagination and completed filtering preserve the contract                        | Application, PostgreSQL, boundary, UI                  | T-07, T-08, T-10, T-14          | `verified`  |
| [TST-CONCURRENCY-001](#tst-concurrency-001) | Concurrent accepted writes follow last-successful-write semantics                    | Application and PostgreSQL integration                 | T-06, T-07, T-14                | `partial`   |
| [TST-BOUNDARY-001](#tst-boundary-001)       | JSON routes and Server Actions map auth, validation, and outcomes consistently       | Request-level boundary tests                           | T-08, T-09                      | `verified`  |
| [TST-LANDING-001](#tst-landing-001)         | Sanity payloads are validated and mapped without leaking provider records            | Fixture integration                                    | T-12                            | `verified`  |
| [TST-LANDING-002](#tst-landing-002)         | The published Sanity singleton can be fetched, validated, and mapped                 | Read-only live smoke                                   | T-02, T-12                      | `verified`  |
| [TST-LANDING-003](#tst-landing-003)         | Sanity publishing and recovery invalidate content safely                             | Boundary integration, deployed webhook evidence        | T-13                            | `partial`   |
| [TST-UI-001](#tst-ui-001)                   | The selected UI direction materializes usable product states                         | Browser/runtime inspection, UI acceptance              | T-09A, T-09B, T-10, T-11, T-12A | `partial`   |
| [TST-E2E-001](#tst-e2e-001)                 | The core authenticated todo journey works in a real browser                          | Playwright Chromium                                    | T-15                            | `specified` |
| [TST-E2E-002](#tst-e2e-002)                 | The magic-link journey works in a real browser                                       | Playwright Chromium                                    | T-15                            | `specified` |
| [TST-E2E-003](#tst-e2e-003)                 | Browser-visible privacy, pagination, filtering, and mutation feedback work together  | Playwright Chromium, on-demand cross-browser           | T-10, T-12A, T-15               | `partial`   |
| [TST-PERFORMANCE-001](#tst-performance-001) | Representative Neon queries use the intended indexes and meet the agreed warm target | Query plans and controlled performance evidence        | T-16                            | `verified`  |

## Test contracts

<a id="tst-foundation-001"></a>

### TST-FOUNDATION-001 — Shared database runtime

- **Status:** `verified`
- **Capability:** Database runtime foundation
- **Evidence layers/modes:** Infrastructure / unit, local integration, hosted smoke
- **Verifies product decisions:** D-001, D-002, D-003, D-004, D-009
- **Verifies technical decisions:** TD-011, TD-015
- **Edge cases:** [EC-022](EDGE-CASES.md#ec-022)
- **SPEC:** [3.5 Query and connection baseline](../output/agent/SPEC.md#35-query-and-connection-baseline), [10.6 Local quality](../output/agent/SPEC.md#106-local-quality)
- **Owner:** T-03
- **Contract:** The shared node-postgres/Drizzle runtime can connect to the repository's local PostgreSQL test target and pooled Neon runtime, and Better Auth can use the same application database boundary.
- **Required evidence:** Pool configuration unit tests, a local runtime integration test, and the hosted compatibility smoke.
- **Current evidence:** T-03 recorded passing `pnpm test`, `pnpm test:integration` against a disposable local PostgreSQL database, and the pooled Neon verification. This contract does not prove migrations, list/task repositories, or browser behavior.

<a id="tst-migration-001"></a>

### TST-MIGRATION-001 — Versioned migration chain

- **Status:** `partial`
- **Capability:** Database migration foundation
- **Evidence layers/modes:** Infrastructure / migration integration, hosted smoke
- **Verifies product decisions:** D-003, D-004, D-009
- **Verifies technical decisions:** TD-013, TD-014, TD-019
- **Edge cases:** [EC-020](EDGE-CASES.md#ec-020), [EC-021](EDGE-CASES.md#ec-021)
- **SPEC:** [3.3 Migration workflow](../output/agent/SPEC.md#33-migration-workflow), [10.2 PostgreSQL integration](../output/agent/SPEC.md#102-postgresql-integration)
- **Owners:** T-01, T-04, T-14
- **Contract:** The complete versioned Drizzle migration chain applies to an empty PostgreSQL 18 Testcontainer and the reviewed migration applies successfully to the non-default Neon development branch before promotion.
- **Required evidence:** Harness-owned empty-database migration run and non-destructive Neon development-branch migration smoke.
- **Dependencies:** T-04 schema work, T-14 Testcontainers harness, and the existing T-01 Neon development branch.
- **Current evidence:** T-04's `pnpm test:integration` applied the complete consolidated versioned chain to an isolated schema in a fresh disposable local `postgres:18-alpine` container. The T-14 harness now applies that same chain to the empty database of one harness-owned PostgreSQL 18 Testcontainer per integration suite. `pnpm exec drizzle-kit migrate` applied the chain to a fresh local migration database, and catalog inspection confirmed native UUID list/task keys with `uuidv7()` defaults, text owner FKs, the `task_status` enum, cursor/unique indexes, and cascading foreign keys. The agent-owned Neon `development` branch still records the pre-consolidation two-step chain and was not destructively reset in this slice.
- **Follow-up:** T-01 must separately realign and smoke-test the reviewed consolidated chain on the non-default Neon development branch before this contract can be `verified`.

<a id="tst-harness-001"></a>

### TST-HARNESS-001 — Safe database-backed test harness

- **Status:** `partial`
- **Capability:** Test infrastructure
- **Evidence layers/modes:** Infrastructure / integration harness, orchestration checks
- **Verifies product decisions:** D-009
- **Verifies technical decisions:** TD-013, TD-014, TD-017
- **Edge cases:** [EC-020](EDGE-CASES.md#ec-020), [EC-021](EDGE-CASES.md#ec-021), [EC-024](EDGE-CASES.md#ec-024)
- **SPEC:** [10.2 PostgreSQL integration](../output/agent/SPEC.md#102-postgresql-integration), [10.3 Playwright](../output/agent/SPEC.md#103-playwright)
- **Owners:** T-14, T-15
- **Contract:** Database-backed tests use one harness-owned PostgreSQL 18 container per suite, run serially while sharing it, create unique users and mutable records, remain order-independent, clean up after failures, and refuse destructive cleanup against external URLs.
- **Required evidence:** Docker-unavailable failure, state-isolation test, failure cleanup, external-URL refusal, and the equivalent Playwright lifecycle check.
- **Dependencies:** T-14 harness orchestration and T-15 browser orchestration.
- **Current evidence:** `pnpm test:integration` starts one disposable `postgres:18-alpine` container in global setup, applies the complete migration chain, injects its local URI into the existing integration seam, runs six files serially, and tears the container down. Harness unit tests cover loopback URL refusal, migration statement splitting, injected startup failure reporting, migration-failure cleanup, and normal teardown; a harness integration test confirms PostgreSQL 18 catalog visibility and isolated schemas. A live Docker-daemon outage and the equivalent Playwright lifecycle remain unobserved.
- **Follow-up:** T-15 must reuse the lifecycle for the dedicated Next.js/Playwright run; retain the live-daemon outage check as release evidence if the environment supports it.

<a id="tst-persistence-001"></a>

### TST-PERSISTENCE-001 — Relational invariants and repository mappings

- **Status:** `partial`
- **Capability:** Persistence
- **Evidence layers/modes:** Domain, application, infrastructure / unit, integration
- **Verifies product decisions:** D-001, D-003, D-004, D-009
- **Verifies technical decisions:** TD-005, TD-006, TD-010, TD-013
- **Edge cases:** [EC-005](EDGE-CASES.md#ec-005), [EC-006](EDGE-CASES.md#ec-006), [EC-014](EDGE-CASES.md#ec-014), [EC-017](EDGE-CASES.md#ec-017), [EC-018](EDGE-CASES.md#ec-018)
- **SPEC:** [3 Data model](../output/agent/SPEC.md#3-data-model-postgres), [4 Domain rules](../output/agent/SPEC.md#4-domain-rules), [5 Application use cases](../output/agent/SPEC.md#5-application-use-cases-minimum)
- **Owners:** T-04, T-06, T-07, T-14, T-16
- **Contract:** Real PostgreSQL behavior preserves ownership, case-insensitive uniqueness, list-to-task cascade deletion, repository field mappings, bounded cursor reads, required indexes, and the absence of N+1 or unbounded page work.
- **Required evidence:** PostgreSQL integration cases against the real migrations, including concurrent uniqueness and cascade behavior, plus query-shape assertions where the contract requires them.
- **Dependencies:** T-04 schema, T-14 harness, and T-16 hosted query-plan evidence.
- **Current evidence:** T-04's focused integration suite passed three real-database cases covering database-generated native UUID IDs, Drizzle `Date` mappings, nullable notes and native status values, owner-scoped case-insensitive list/task uniqueness, list-to-task cascade deletion, cascading foreign keys, and the required cursor-index column order/direction. The complete T-06/T-07 repository suite runs through the T-14 harness and covers ownership, concurrent uniqueness, bounded cursor reads, cascade behavior, repository mappings, and query-shape guards. T-16's redacted Neon development-branch evidence confirms both composite indexes on representative owner/list data, no lists/tasks sequential scans, and cursor/warm-query behavior. The task repository states explicit `NULLS LAST` ordering so the task index ordering is usable without changing result semantics for the `NOT NULL` columns.

<a id="tst-auth-001"></a>

### TST-AUTH-001 — Email/password session lifecycle

- **Status:** `partial`
- **Capability:** Authentication
- **Evidence layers/modes:** Application, boundary, end-to-end / integration, browser
- **Verifies product decisions:** D-001, D-002
- **Verifies technical decisions:** TD-004, TD-008
- **Edge cases:** [EC-008](EDGE-CASES.md#ec-008)
- **SPEC:** [2 Auth](../output/agent/SPEC.md#2-auth-better-auth), [7 HTTP / Action API contract](../output/agent/SPEC.md#7-http--action-api-contract)
- **Owners:** T-05, T-15
- **Contract:** A user can sign up, sign in, retain a valid session for private operations, and sign out so later private operations are unauthenticated.
- **Required evidence:** Auth boundary tests for session outcomes and a Chromium browser journey using the real local database.
- **Dependencies:** T-05 Better Auth boundary and T-15 browser harness.
- **Current evidence:** `src/modules/auth/auth.integration.test.ts` passes against a disposable local PostgreSQL 18 database for email/password sign-up, local email verification, sign-in, current-user resolution, sign-out, the resulting unauthenticated state, and preservation of the password credential when the same verified account later uses a magic link. T-11 adds the server-rendered sign-up/sign-in surfaces, safe `/dashboard` callback handling, stable invalid-credential feedback, and labelled keyboard-reachable controls. The verified browser lifecycle remains outstanding.
- **Follow-up:** T-15 must run the Chromium journey through the Next.js route and record the real-browser evidence before this contract can be `verified`.

<a id="tst-auth-002"></a>

### TST-AUTH-002 — Magic-link local/test lifecycle

- **Status:** `partial`
- **Capability:** Authentication
- **Evidence layers/modes:** Infrastructure, boundary, end-to-end / mailbox integration, browser
- **Verifies product decisions:** D-002
- **Verifies technical decisions:** TD-004, TD-014
- **Edge cases:** [EC-009](EDGE-CASES.md#ec-009)
- **SPEC:** [2.1 Methods](../output/agent/SPEC.md#21-methods), [10.3 Playwright](../output/agent/SPEC.md#103-playwright)
- **Owners:** T-05, T-15
- **Contract:** In explicitly enabled local/test mode, a requested magic link is captured in the temporary mailbox, can be read deterministically, and can be consumed once to establish the expected session.
- **Required evidence:** Mailbox integration test and a real browser request/read/consume journey. The mailbox must be unavailable outside local/test mode.
- **Dependencies:** T-05 mailbox boundary and T-15 browser harness.
- **Current evidence:** `src/modules/auth/auth.integration.test.ts` passes the request/read/consume/replay flow against disposable local PostgreSQL 18, and `src/modules/auth/infrastructure/local-mailbox.test.ts` proves explicit test-mode gating and safe cleanup. T-11 adds the `/magic-link` request surface, Better Auth plugin callback wiring, and stable invalid-token error handoff; the deterministic browser request/read/consume journey remains outstanding.
- **Follow-up:** T-15 must run the Chromium mailbox journey with cleanup before execution; production/shared email delivery remains outside T-05.

<a id="tst-auth-003"></a>

### TST-AUTH-003 — Private authorization and owner identity

- **Status:** `partial`
- **Capability:** Authentication and authorization
- **Evidence layers/modes:** Application, boundary, end-to-end / contract, integration, browser
- **Verifies product decisions:** D-001, D-002
- **Verifies technical decisions:** TD-004, TD-006, TD-008, TD-022
- **Edge cases:** [EC-004](EDGE-CASES.md#ec-004), [EC-006](EDGE-CASES.md#ec-006), [EC-008](EDGE-CASES.md#ec-008), [EC-026](EDGE-CASES.md#ec-026)
- **SPEC:** [2.2 Session rules](../output/agent/SPEC.md#22-session-rules), [7 HTTP / Action API contract](../output/agent/SPEC.md#7-http--action-api-contract), [14.3 Authentication boundary](../output/agent/SPEC.md#143-authentication-boundary)
- **Owners:** T-05, T-09, T-15
- **Contract:** Anonymous requests cannot read or mutate private data; authenticated operations derive the owner from the Better Auth session; another user's identifiers produce the ordinary privacy-preserving not-found outcome; bearer tokens and cross-origin credentials do not broaden the baseline API.
- **Required evidence:** Application and request-boundary tests, plus a browser scenario proving that private data remains isolated between users.
- **Dependencies:** T-05 session helpers, T-09 entry paths, and T-15 browser harness.
- **Current evidence:** `src/modules/auth/auth.integration.test.ts` proves the current-user boundary fails closed without a session and rejects bearer-only access even when paired with a client-supplied `x-user-id`. The T-09 list/task request and action suites prove session-derived owner propagation, anonymous `401` outcomes, privacy-preserving `404` outcomes, rejection of spoofed body fields, and rejection of foreign-origin mutations. T-11's framework-independent redirect tests reject external, protocol-relative, encoded, malformed, and non-string `next` values, defaulting safely to `/dashboard`; browser isolation remains outstanding.
- **Follow-up:** T-15 must add the multi-user Chromium scenario before this contract can be `verified`.

<a id="tst-lists-001"></a>

### TST-LISTS-001 — Inbox and list lifecycle

- **Status:** `verified`
- **Capability:** Lists
- **Evidence layers/modes:** Domain, application, infrastructure / unit, integration, browser
- **Verifies product decisions:** D-003
- **Verifies technical decisions:** TD-005, TD-006, TD-013, TD-017
- **Edge cases:** [EC-001](EDGE-CASES.md#ec-001)
- **SPEC:** [2.3 Listless private workspace side effect](../output/agent/SPEC.md#23-listless-private-workspace-side-effect), [4.1 List](../output/agent/SPEC.md#41-list), [5 Lists](../output/agent/SPEC.md#lists)
- **Owners:** T-06, T-10, T-14
- **Contract:** A listless private workspace creates exactly one ordinary `Inbox` atomically and idempotently, including after final-list deletion; any existing list prevents automatic creation; Inbox can later be renamed or deleted.
- **Required evidence:** Database-free application tests for lifecycle outcomes, PostgreSQL integration for atomic/concurrent creation, and the relevant authenticated journey when the UI exists.
- **Dependencies:** T-04 schema, T-05 auth boundary, and T-14 real database harness.
- **Current evidence:** `src/modules/lists/application/list-use-cases.test.ts` and the local PostgreSQL repository suite cover Inbox normalization and lifecycle outcomes. The harness-backed integration suite proves eight concurrent listless calls converge to one Inbox, an existing list prevents automatic creation, final-list deletion permits recreation, and a controlled conflict/read-back interleaving does not create a duplicate after the winner is renamed. T-10's authenticated Next runtime check exercised a listless workspace, Inbox provisioning, final-list deletion, the explicit reload state, and Inbox recreation on the next private-workspace load without exposing credentials.
- **Follow-up:** None for the accepted baseline; T-15's separate Playwright lifecycle remains tracked by `TST-E2E-001` and does not replace this contract's verified lifecycle evidence.

<a id="tst-lists-002"></a>

### TST-LISTS-002 — List validation, CRUD, uniqueness, and cascade

- **Status:** `verified`
- **Capability:** Lists
- **Evidence layers/modes:** Domain, application, infrastructure, boundary / unit, integration, contract
- **Verifies product decisions:** D-003, D-004
- **Verifies technical decisions:** TD-005, TD-006, TD-008, TD-010
- **Edge cases:** [EC-002](EDGE-CASES.md#ec-002), [EC-005](EDGE-CASES.md#ec-005), [EC-014](EDGE-CASES.md#ec-014)
- **SPEC:** [4.1 List](../output/agent/SPEC.md#41-list), [5 Lists](../output/agent/SPEC.md#lists), [8 Validation](../output/agent/SPEC.md#8-validation-zod)
- **Owners:** T-04, T-06, T-09, T-14
- **Contract:** List names are trimmed and limited to 1–80 characters, list CRUD is owner-scoped, duplicate names conflict case-insensitively after trimming, and deleting a list removes its tasks through the relational cascade.
- **Required evidence:** Domain/application validation tests, PostgreSQL constraint and cascade tests, and request-boundary conflict/invalid-input tests.
- **Dependencies:** T-04 schema, T-06 use cases, and T-09 entry paths.
- **Current evidence:** The application suite proves trimming, 1–80 validation, owner forwarding, privacy-preserving not-found mapping, and conflict preservation. The harness-backed PostgreSQL suite proves owner-scoped CRUD, case-insensitive uniqueness, cross-owner privacy, and list-to-task cascade deletion. `src/modules/lists/presentation/list-entry.test.ts` proves request-boundary success, `409`, `422`, privacy-preserving `404`, authentication, safe mapping, and same-origin mutation behavior.
- **Follow-up:** No remaining evidence is required for the accepted baseline.

<a id="tst-lists-003"></a>

### TST-LISTS-003 — Bounded and context-safe list pagination

- **Status:** `verified`
- **Capability:** Lists
- **Evidence layers/modes:** Application, infrastructure, boundary, UI / integration, contract, browser
- **Verifies product decisions:** D-001, D-003
- **Verifies technical decisions:** TD-006, TD-008, TD-010, TD-011
- **Edge cases:** [EC-013](EDGE-CASES.md#ec-013), [EC-015](EDGE-CASES.md#ec-015), [EC-016](EDGE-CASES.md#ec-016), [EC-017](EDGE-CASES.md#ec-017), [EC-018](EDGE-CASES.md#ec-018)
- **SPEC:** [4.4 Cursor pagination](../output/agent/SPEC.md#44-cursor-pagination), [10.1 Vitest](../output/agent/SPEC.md#101-vitest)
- **Owners:** T-06, T-08, T-10, T-14
- **Contract:** List reads default to 20, accept 1–100, return oldest-first deterministic pages with opaque context-bound cursors, fetch at most `limit + 1` rows, and expose a next page only when one exists.
- **Required evidence:** Application and PostgreSQL pagination tests, malformed/cross-context cursor and limit boundary tests, and a browser-visible `Load more` check.
- **Dependencies:** T-04 indexes, T-06 repository/use case, T-08 shared pagination contract, and T-14 harness.
- **Current evidence:** Application and cursor tests cover default and boundary limits, opaque cursor validation, malformed values, and scope context. T-08 shared pagination tests cover default 20, accepted 1/100, invalid limits, blank and repeated URL parameters, and the stable page shape. The harness-backed PostgreSQL suite proves oldest-first continuation, the `createdAt`/`id` tie-breaker when timestamps match, cross-owner cursor rejection, terminal cursors, bounded `limit + 1` repository reads, and maximum-page continuation from 100 records to the 101st record. `src/modules/lists/presentation/list-entry.test.ts` proves the request-level paginated response shape and invalid-input mapping. T-10's authenticated browser loop seeded disposable rows, observed a visible `Load more lists`, appended the remaining records without duplicate IDs, and preserved server order.
- **Follow-up:** No remaining evidence is required for this baseline contract; reusable harness evidence remains owned by T-14 as recorded in the task ledger.

<a id="tst-tasks-001"></a>

### TST-TASKS-001 — Task lifecycle, statuses, titles, and notes

- **Status:** `verified`
- **Capability:** Tasks
- **Evidence layers/modes:** Domain, application, boundary / unit, integration, contract
- **Verifies product decisions:** D-004
- **Verifies technical decisions:** TD-006, TD-008
- **Edge cases:** [EC-002](EDGE-CASES.md#ec-002), [EC-003](EDGE-CASES.md#ec-003), [EC-010](EDGE-CASES.md#ec-010), [EC-011](EDGE-CASES.md#ec-011), [EC-012](EDGE-CASES.md#ec-012)
- **SPEC:** [4.2 Task](../output/agent/SPEC.md#42-task), [5 Tasks](../output/agent/SPEC.md#tasks), [8 Validation](../output/agent/SPEC.md#8-validation-zod)
- **Owners:** T-07, T-09
- **Contract:** Tasks validate trimmed titles and optional notes, start as `todo`, support direct transitions among valid statuses, treat repeated status as a no-op, preserve or clear notes according to patch semantics, and keep completed tasks stored and visible by default.
- **Required evidence:** Domain/application tests for status, trimming, note, and patch rules, plus boundary tests for invalid inputs and expected outcomes.
- **Dependencies:** T-06 list use cases, T-07 task use cases, and T-09 entry paths.
- **Current evidence:** `pnpm test` covers task title and notes normalization, all three valid statuses, direct and repeated status application, default creation status, explicit note clearing, page validation, and privacy/conflict outcome mapping. The harness-backed PostgreSQL suite proves status transitions, repeated-status `updatedAt` preservation, and completed-task storage/filter behavior. `src/modules/tasks/presentation/task-entry.test.ts` proves authenticated request/action validation and outcome mapping, including safe task view models and same-origin mutation rejection.
- **Follow-up:** No remaining evidence is required for the accepted baseline.

<a id="tst-tasks-002"></a>

### TST-TASKS-002 — Task ownership, relationships, uniqueness, and cascade

- **Status:** `verified`
- **Capability:** Tasks and persistence
- **Evidence layers/modes:** Application, infrastructure, boundary / integration, contract
- **Verifies product decisions:** D-001, D-003, D-004
- **Verifies technical decisions:** TD-005, TD-006, TD-008, TD-010
- **Edge cases:** [EC-005](EDGE-CASES.md#ec-005), [EC-006](EDGE-CASES.md#ec-006), [EC-014](EDGE-CASES.md#ec-014)
- **SPEC:** [3.2 `tasks`](../output/agent/SPEC.md#32-tasks), [4.1–4.2 Domain rules](../output/agent/SPEC.md#4-domain-rules), [14.4 Lists and tasks application boundary](../output/agent/SPEC.md#144-lists-and-tasks-application-boundary)
- **Owners:** T-04, T-07, T-09, T-14
- **Contract:** A task can be created or changed only within an owned list, task titles are unique case-insensitively within one list but may repeat in another, and deleting the parent list cascades to its tasks.
- **Required evidence:** Application ownership tests, PostgreSQL foreign-key/unique/cascade tests, and boundary not-found/conflict tests.
- **Dependencies:** T-04 schema, T-07 use cases, and T-14 harness.
- **Current evidence:** The task unit suite covers application mapping for missing task lists and conflict/not-found outcomes. The harness-backed PostgreSQL suite proves owned-list membership on insert and reads, privacy-preserving `list_not_found` for missing or foreign-owned lists, owner-scoped task reads and mutations, case-insensitive per-list title uniqueness, same-title isolation across lists, and list-to-task cascade deletion. `src/modules/tasks/presentation/task-entry.test.ts` proves boundary `404`/`409` mappings, owner propagation, and safe action/route responses.
- **Follow-up:** No remaining evidence is required for the accepted baseline.

<a id="tst-tasks-003"></a>

### TST-TASKS-003 — Bounded task pagination and completed filtering

- **Status:** `verified`
- **Capability:** Tasks
- **Evidence layers/modes:** Application, infrastructure, boundary, UI / integration, contract, browser
- **Verifies product decisions:** D-004
- **Verifies technical decisions:** TD-006, TD-008, TD-010, TD-011
- **Edge cases:** [EC-003](EDGE-CASES.md#ec-003), [EC-013](EDGE-CASES.md#ec-013), [EC-015](EDGE-CASES.md#ec-015), [EC-016](EDGE-CASES.md#ec-016), [EC-018](EDGE-CASES.md#ec-018)
- **SPEC:** [4.3 Visibility filter](../output/agent/SPEC.md#43-visibility-filter), [4.4 Cursor pagination](../output/agent/SPEC.md#44-cursor-pagination), [9 UI](../output/agent/SPEC.md#9-ui)
- **Owners:** T-07, T-08, T-10, T-14
- **Contract:** Task reads default to completed tasks included, support explicit hiding without changing stored state or the relative order of visible tasks, return newest-first deterministic bounded pages, and restart pagination when list or filter context changes.
- **Required evidence:** Application and PostgreSQL filter/order/cursor tests, boundary validation tests, and a browser check for filtering and `Load more`.
- **Dependencies:** T-07 task repository/use case, T-08 pagination contract, T-10 UI, and T-14 harness.
- **Current evidence:** Task application/cursor tests cover default completed-task visibility, explicit filter validation, page limits, opaque cursor validation, and context mismatches. T-08 shared pagination tests cover the common default/maximum/invalid URL limit and cursor contract. The harness-backed PostgreSQL suite proves newest-first ordering, same-timestamp `createdAt`/`id` tie-breaking, continuation and terminal cursors, stable relative order after hiding `done`, cross-context cursor rejection, bounded `limit + 1` reads, and maximum-page continuation from 100 records to the 101st record. `src/modules/tasks/presentation/task-entry.test.ts` proves request-level filter/pagination validation and response mapping. T-10's authenticated browser loop exercised completed-task hiding/showing, reset on list/filter context changes, a visible `Load more tasks`, and ordered continuation through the remaining seeded tasks.
- **Follow-up:** No remaining evidence is required for this baseline contract; reusable harness evidence remains owned by T-14 as recorded in the task ledger.

<a id="tst-concurrency-001"></a>

### TST-CONCURRENCY-001 — Last-successful-write behavior

- **Status:** `partial`
- **Capability:** Concurrent mutations
- **Evidence layers/modes:** Application, infrastructure / integration
- **Verifies product decisions:** D-007
- **Verifies technical decisions:** TD-005, TD-006, TD-008
- **Edge cases:** [EC-027](EDGE-CASES.md#ec-027)
- **SPEC:** [4.5 Concurrent writes](../output/agent/SPEC.md#45-concurrent-writes), [14.4 Lists and tasks application boundary](../output/agent/SPEC.md#144-lists-and-tasks-application-boundary)
- **Owners:** T-06, T-07, T-14
- **Contract:** Concurrent accepted mutations do not require version tokens; each patch changes only submitted fields; same-field writes expose the last successfully committed value; disjoint-field writes may both persist; ordinary ownership, validation, and uniqueness outcomes remain intact.
- **Required evidence:** Application tests using realistic concurrent operations and PostgreSQL integration tests for commit ordering and disjoint-field preservation.
- **Dependencies:** T-06/T-07 mutation paths and T-14 real database harness.
- **Current evidence:** The harness-backed PostgreSQL suite proves controlled same-row list rename commit ordering (the later committed write is retained), concurrent Inbox uniqueness and its conflict/read-back race, task same-field commit ordering, task disjoint-field preservation, and repeated status timestamp idempotence. The task application suite proves that patch inputs preserve omitted-versus-submitted fields.
- **Follow-up:** Keep this contract `partial` until the full concurrency acceptance evidence is reconciled; the reusable harness prerequisite is satisfied.

<a id="tst-boundary-001"></a>

### TST-BOUNDARY-001 — Server entry-path contracts

- **Status:** `verified`
- **Capability:** Server boundaries
- **Evidence layers/modes:** Boundary / request contract, integration
- **Verifies product decisions:** D-001, D-003, D-004, D-009
- **Verifies technical decisions:** TD-008, TD-020, TD-022
- **Edge cases:** [EC-004](EDGE-CASES.md#ec-004), [EC-008](EDGE-CASES.md#ec-008), [EC-014](EDGE-CASES.md#ec-014), [EC-015](EDGE-CASES.md#ec-015), [EC-016](EDGE-CASES.md#ec-016), [EC-026](EDGE-CASES.md#ec-026)
- **SPEC:** [7 HTTP / Action API contract](../output/agent/SPEC.md#7-http--action-api-contract), [8 Validation](../output/agent/SPEC.md#8-validation-zod), [10.1 Vitest](../output/agent/SPEC.md#101-vitest)
- **Owners:** T-08, T-09
- **Contract:** JSON Route Handlers and Server Actions authenticate, authorize, validate with shared Zod rules, call shared use cases, and map success, pagination, unauthenticated, privacy-preserving not-found, conflict, and invalid-input outcomes consistently.
- **Required evidence:** Request-level JSON contract tests and a smaller Server Action adapter suite. Business rules remain primarily covered below the entry path.
- **Dependencies:** T-05 auth, T-06/T-07 use cases, and T-08 shared contracts.
- **Current evidence:** T-08 shared error-contract tests cover the accepted 401/404/409/422 mappings, canonical `{ error: { code, message } }` envelopes, safe handling of unknown errors, and non-leaking canonical messages when an arbitrary error spoofs a known code. `src/modules/lists/presentation/list-entry.test.ts` and `src/modules/tasks/presentation/task-entry.test.ts` add authenticated request/action coverage for success, pagination/filtering, privacy-preserving `404`, conflict `409`, invalid-input `422`, authentication outcomes, safe view models, revalidation, same-origin mutation rejection, and expected task action errors. The focused suites contain 19 tests; the full unit suite and disposable PostgreSQL integration suite also pass.
- **Follow-up:** No remaining evidence is required for the accepted baseline. Next.js browser/runtime journey checks remain with T-15 because the dashboard UI is not yet implemented.

<a id="tst-landing-001"></a>

### TST-LANDING-001 — Sanity payload validation and mapping

- **Status:** `verified`
- **Capability:** Landing content
- **Evidence layers/modes:** Infrastructure / fixture integration
- **Verifies product decisions:** D-005, D-008
- **Verifies technical decisions:** TD-007, TD-018, TD-023
- **Edge cases:** [EC-007](EDGE-CASES.md#ec-007), [EC-025](EDGE-CASES.md#ec-025)
- **SPEC:** [6 Sanity](../output/agent/SPEC.md#6-sanity-landing-only), [10.4 Sanity verification](../output/agent/SPEC.md#104-sanity-verification), [14.5 Landing/Sanity boundary](../output/agent/SPEC.md#145-landingsanity-boundary)
- **Owner:** T-12
- **Contract:** Unknown Sanity payloads are validated and mapped into a plain landing view model; optional fields remain optional; missing or invalid required content fails explicitly; raw provider records do not cross the infrastructure boundary.
- **Required evidence:** Local fixture tests for valid, optional, malformed, and incomplete payloads and mapping failures.
- **Dependencies:** T-02 Sanity resource and T-12 landing read path.
- **Evidence:** `pnpm test` passed with 4 test files and 19 tests, including `src/modules/landing/infrastructure/sanity-landing-repository.test.ts` and `src/sanity/config.test.ts`. The fixtures cover valid unknown payloads, optional omission/null, malformed required/optional fields, missing payload, incomplete required content, identity mismatch, provider-field isolation, and the stable query/cache-tag boundary.

<a id="tst-landing-002"></a>

### TST-LANDING-002 — Published Sanity read smoke

- **Status:** `verified`
- **Capability:** Landing content
- **Evidence layers/modes:** Infrastructure / live smoke
- **Verifies product decisions:** D-005, D-008, D-009
- **Verifies technical decisions:** TD-018, TD-023
- **Edge cases:** [EC-007](EDGE-CASES.md#ec-007), [EC-025](EDGE-CASES.md#ec-025)
- **SPEC:** [6.2 Runtime](../output/agent/SPEC.md#62-runtime), [10.4 Sanity verification](../output/agent/SPEC.md#104-sanity-verification)
- **Owners:** T-02, T-12
- **Contract:** The dedicated published landing singleton can be fetched through the real Sanity client and query, validated as unknown input, and mapped into the application view model without mutation.
- **Required evidence:** A separate read-only live smoke with clear failures for missing configuration, missing content, query failure, validation failure, or mapping failure.
- **Dependencies:** T-02 dedicated Sanity project/dataset and T-12 application mapping.
- **Evidence:** `pnpm sanity:smoke` passed against the configured published singleton and reported the mapped fields `blurb`, `headline`, `primaryCtaLabel`, and `secondaryCtaLabel`. The TypeScript smoke composes the Node-safe Sanity client factory, shared Sanity source adapter, and landing application use case, and performs no mutations.

<a id="tst-landing-003"></a>

### TST-LANDING-003 — Sanity freshness and recovery

- **Status:** `partial`
- **Capability:** Landing content freshness
- **Evidence layers/modes:** Infrastructure, boundary / contract, deployed smoke
- **Verifies product decisions:** D-005, D-008
- **Verifies technical decisions:** TD-023
- **Edge cases:** [EC-028](EDGE-CASES.md#ec-028)
- **SPEC:** [6.3 Seat](../output/agent/SPEC.md#63-seat), [10.4 Sanity verification](../output/agent/SPEC.md#104-sanity-verification), [14.5 Landing/Sanity boundary](../output/agent/SPEC.md#145-landingsanity-boundary)
- **Owner:** T-13
- **Contract:** A trusted relevant Sanity publish event and an authorized manual recovery request reach one server-only idempotent invalidation service; invalid signatures, irrelevant events, unauthorized recovery, and duplicate delivery do not cause unsafe invalidation.
- **Required evidence:** Boundary tests for signatures, relevance, authorization, duplication, and shared service routing, plus one real deployed webhook delivery for release evidence.
- **Dependencies:** T-12 cache identity/read path and the deployed webhook prerequisite.
- **Evidence:** Local boundary tests pass in `pnpm test` (6 files, 32 tests at the implementation checkpoint) and cover generated valid/invalid Sanity signatures, malformed payloads, irrelevant and draft events, duplicate deliveries, the stable tag with immediate-expiration profile `{ expire: 0 }`, manual authorization, and shared invalidation routing. The deployed webhook-delivery clause remains deferred because this repository has no deployed release candidate; local direct-handler evidence does not replace it.

<a id="tst-ui-001"></a>

### TST-UI-001 — Selected UI direction and usable states

- **Status:** `partial`
- **Capability:** Product UI
- **Evidence layers/modes:** UI / prototype inspection, runtime inspection, browser acceptance
- **Verifies product decisions:** D-001, D-002, D-003, D-004, D-009
- **Verifies technical decisions:** TD-009, TD-020
- **SPEC:** [9 UI](../output/agent/SPEC.md#9-ui), [14.6 Presentation boundary](../output/agent/SPEC.md#146-presentation-boundary)
- **Owners:** T-09A, T-09B, T-10, T-11, T-12A
- **Contract:** The selected UI direction remains recognizable in the materialized landing, auth, and dashboard surfaces, and the critical controls and states remain usable at the agreed viewports with keyboard reachability, visible focus, loading, empty, error, disabled, selected, long-content, and overflow behavior.
- **Required evidence:** Fair prototype inspection during exploration, browser/runtime inspection during materialization, and focused browser acceptance for critical interactions. This is not a requirement for a complete React component unit-test matrix.
- **Dependencies:** T-09A/T-09B design work and the implemented surfaces in T-10/T-11.
- **Evidence:** T-09A's isolated static prototype uses one fixture and three materially different directions. Structural validation passes with exactly three manifests; Chromium Playwright inspection covers all directions at 1440x900, 1024x768, 768x1024, and 320x800 with zero console errors and no document overflow. Prototype evidence covers task/list capture, status changes, completed filtering, list switching, bounded continuation, keyboard-visible focus and search shortcuts, explicit final-list reload/Inbox recreation, loading/disabled, empty, validation-error, selected, and long-content states. T-09B selects Focus Rail based on the locked list-sidebar/task-panel contract, first-open comprehension, narrow-viewport evidence, and lower implementation complexity; [`handoff.md`](../../.ui-explorations/t09a-dashboard/handoff.md) records the rejected alternatives, reusable primitives, responsive/accessibility rules, and required state matrix. T-10 materializes the selected dashboard direction and its state matrix in Next.js: authenticated browser coverage exercised create/select/rename/delete, task capture/edit/status/delete, completed filtering, both cursor continuations, validation/conflict/recoverable states, final-list reload/Inbox recreation, keyboard focus return, and long-content wrapping. Axe reported zero violations at the authenticated dashboard route and the four agreed viewports had no horizontal overflow. T-11 materializes the server-owned landing and three auth routes with labelled controls, explicit error/pending/success states, safe callback handling, and the Focus Rail public/auth shell. Chromium inspection covers `/`, `/sign-up`, `/sign-in`, and `/magic-link` at 1440x900, 1024x768, 768x1024, and 320x800 with zero axe violations on the audited routes, zero browser errors, and no horizontal overflow; a synthetic long-content assertion confirms the landing remains bounded at 320px. T-15's end-to-end browser journeys remain under the separate `TST-E2E-*` contracts.

<a id="tst-e2e-001"></a>

### TST-E2E-001 — Core authenticated todo journey

- **Status:** `specified`
- **Capability:** Core todo journey
- **Evidence layers/modes:** End-to-end / Playwright Chromium
- **Verifies product decisions:** D-001, D-002, D-003, D-004, D-009
- **Verifies technical decisions:** TD-009, TD-014, TD-016, TD-017, TD-018, TD-022
- **SPEC:** [7 Starter baseline acceptance](../output/agent/PRD.md#7-starter-baseline-complete-acceptance), [10.3 Playwright](../output/agent/SPEC.md#103-playwright)
- **Owner:** T-15
- **Contract:** In a real Chromium browser, a user can sign up or sign in, obtain the Inbox, create a list, create a task, change its status, and sign out; private data remains protected after sign-out.
- **Required evidence:** Playwright run against the harness-owned PostgreSQL 18 database, deterministic behavior seed, and dedicated Next.js test server.
- **Dependencies:** T-05, T-09, T-10, T-11, T-14, and the T-15 orchestration.

<a id="tst-e2e-002"></a>

### TST-E2E-002 — Magic-link browser journey

- **Status:** `specified`
- **Capability:** Authentication
- **Evidence layers/modes:** End-to-end / Playwright Chromium
- **Verifies product decisions:** D-002
- **Verifies technical decisions:** TD-014, TD-016, TD-017
- **Edge cases:** [EC-009](EDGE-CASES.md#ec-009)
- **SPEC:** [2.1 Methods](../output/agent/SPEC.md#21-methods), [10.3 Playwright](../output/agent/SPEC.md#103-playwright)
- **Owner:** T-15
- **Contract:** The browser can request a magic link, read the deterministic local/test mailbox, visit the captured URL, and continue as the authenticated user.
- **Required evidence:** Playwright Chromium scenario with mailbox cleanup before execution and no dependency on remote email delivery.
- **Dependencies:** T-05 mailbox flow and T-15 browser orchestration.

<a id="tst-e2e-003"></a>

### TST-E2E-003 — Browser-visible capability behavior

- **Status:** `partial`
- **Capability:** Authenticated product UI
- **Evidence layers/modes:** UI, end-to-end / Playwright Chromium, on-demand cross-browser
- **Verifies product decisions:** D-001, D-003, D-004, D-009
- **Verifies technical decisions:** TD-009, TD-014, TD-016, TD-017, TD-018, TD-022
- **Edge cases:** [EC-003](EDGE-CASES.md#ec-003), [EC-004](EDGE-CASES.md#ec-004), [EC-013](EDGE-CASES.md#ec-013), [EC-015](EDGE-CASES.md#ec-015), [EC-016](EDGE-CASES.md#ec-016), [EC-025](EDGE-CASES.md#ec-025)
- **SPEC:** [5 Product shape](../output/agent/PRD.md#5-product-shape), [9 UI](../output/agent/SPEC.md#9-ui), [10.3 Playwright](../output/agent/SPEC.md#103-playwright)
- **Owners:** T-10, T-12A, T-15
- **Contract:** The browser-visible dashboard preserves private ownership, list/task creation and mutation feedback, completed-task filtering, and visible cursor pagination with deterministic landing content.
- **Required evidence:** Chromium Playwright scenarios against the local harness; Firefox and WebKit remain explicit on-demand compatibility evidence, not routine database-backed duplication.
- **Dependencies:** T-10 dashboard, T-12A UI audit, and T-15 Playwright harness.
- **Evidence:** T-10's authenticated Next.js browser loop covers the dashboard portion of this contract with private-session gating, mutation feedback, completed filtering, visible list/task cursor pagination, duplicate-safe continuation, and final-list reset behavior. Full contract status remains `partial` until T-12A's UI audit and T-15's reusable Playwright harness provide the required repeatable end-to-end evidence.

<a id="tst-performance-001"></a>

### TST-PERFORMANCE-001 — Representative Neon query evidence

- **Status:** `verified`
- **Capability:** Database performance
- **Evidence layers/modes:** Infrastructure / query plan and controlled performance evidence
- **Verifies product decisions:** D-003, D-004, D-009
- **Verifies technical decisions:** TD-010, TD-011, TD-012
- **Edge cases:** [EC-017](EDGE-CASES.md#ec-017), [EC-018](EDGE-CASES.md#ec-018), [EC-019](EDGE-CASES.md#ec-019)
- **SPEC:** [3.4 Required indexes and constraints](../output/agent/SPEC.md#34-required-indexes-and-constraints), [10.5 Performance evidence](../output/agent/SPEC.md#105-performance-evidence)
- **Owner:** T-16
- **Contract:** Representative list/task first-page and next-page queries use the intended composite indexes, preserve cursor correctness at page size 100, and meet the agreed warm 20-record database execution target with compute active.
- **Required evidence:** The separate Neon development-branch performance seed, `EXPLAIN ANALYZE`, cursor checks, and measurements that distinguish database execution from network, auth, rendering, CMS, and compute startup.
- **Dependencies:** T-01 development branch, T-04 schema/indexes, T-08 query paths, and the completed application repositories.
- **Current evidence:** T-16's `pnpm neon:performance` run against the direct, agent-owned Neon `development` branch seeded 101 primary lists, 10,000 primary tasks in one list, and 10,000 secondary-owner tasks. Six representative first/next-page plans (including the completed-task filter) used `lists_user_created_at_id_idx` or `tasks_user_list_created_at_id_idx` with no `lists`/`tasks` sequential scan. Maximum-page-size cursor checks returned all 101 lists in two pages and all 10,000 tasks in 100 pages without duplicates or ordering violations; owner isolation checks passed. After three warmups, ten server-reported PostgreSQL execution samples for the 20-record task query had a maximum of 0.086 ms, below the 50 ms target. The CLI obtains the development endpoint independently through `neon connection-string development` and rejects a supplied default-branch URL before mutation. The artifact records the command, commit `7837a69cf8cacaa01825e324d305d799e42fce07`, and ref `task/t-16-neon-performance-evidence`; network latency, authentication, rendering, CMS access, and compute startup are explicitly excluded.

## SPEC traceability map

The Agent SPEC remains the technical contract and this ledger owns the individual test obligations. The current mapping is:

| SPEC area                                        | Test contracts                                                                                          |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| Auth and session rules                           | `TST-AUTH-001`, `TST-AUTH-002`, `TST-AUTH-003`                                                          |
| Data model, migrations, indexes, and connections | `TST-FOUNDATION-001`, `TST-MIGRATION-001`, `TST-HARNESS-001`, `TST-PERSISTENCE-001`                     |
| Domain rules and application use cases           | `TST-LISTS-001`–`TST-LISTS-003`, `TST-TASKS-001`–`TST-TASKS-003`, `TST-CONCURRENCY-001`                 |
| Sanity landing boundary                          | `TST-LANDING-001`–`TST-LANDING-003`                                                                     |
| HTTP, Server Actions, and Zod validation         | `TST-BOUNDARY-001`, with capability contracts below it                                                  |
| UI and presentation boundary                     | `TST-UI-001`, `TST-E2E-001`–`TST-E2E-003`                                                               |
| Testing, migration, and performance requirements | `TST-MIGRATION-001`, `TST-HARNESS-001`, `TST-PERFORMANCE-001`, plus the applicable capability contracts |

When a SPEC behavior changes, update the owning Product or Technical Decision first when necessary, then update its linked `TST-*` contract and affected delivery tasks. Do not silently alter a contract only in `TODO.md` or in a test file.
