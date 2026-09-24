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
7. Include the contract IDs and verification evidence in the delivery task or its linked evidence record. A PR is not required.

The `testing-first-class` project skill operationalizes this protocol. The skill improves agent reliability through explicit instructions and traceability; it is not a mechanical guarantee that an agent can never omit work. The ledger and task evidence reconciliation make an omission visible to the next agent and human reviewer.

## Test contract index

| ID                                          | Contract                                                                             | Primary evidence                                                     | Owner                                                              | Status     |
| ------------------------------------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------- | ------------------------------------------------------------------ | ---------- |
| [TST-FOUNDATION-001](#tst-foundation-001)   | Shared database runtime works across local PostgreSQL and Neon                       | Unit, local integration, hosted smoke                                | T-03                                                               | `verified` |
| [TST-MIGRATION-001](#tst-migration-001)     | The versioned migration chain upgrades the intended databases                        | PostgreSQL migration integration, Neon migration smoke               | T-01, T-04, T-14, T-20                                             | `verified` |
| [TST-HARNESS-001](#tst-harness-001)         | Database-backed test infrastructure is isolated and fails safely                     | Testcontainers integration and harness checks                        | T-14, T-15, T-21                                                   | `partial`  |
| [TST-PERSISTENCE-001](#tst-persistence-001) | PostgreSQL enforces persistence invariants and repository mappings                   | PostgreSQL integration and hosted query-plan evidence                | T-04, T-06, T-07, T-14, T-16                                       | `verified` |
| [TST-AUTH-001](#tst-auth-001)               | Email/password sessions can be created, used, and ended                              | Boundary integration, end-to-end                                     | T-05, T-15                                                         | `verified` |
| [TST-AUTH-002](#tst-auth-002)               | Magic-link request and consumption work in local/test mode                           | Mailbox integration, end-to-end                                      | T-05, T-15                                                         | `verified` |
| [TST-AUTH-003](#tst-auth-003)               | Private operations require the real session owner                                    | Application, boundary, end-to-end                                    | T-05, T-09, T-15                                                   | `verified` |
| [TST-AUTH-004](#tst-auth-004)               | Password recovery revokes all sessions only after successful reset                   | Auth boundary, PostgreSQL, browser                                   | T-27                                                               | `partial`  |
| [TST-AUTH-005](#tst-auth-005)               | Verification resend and invalid-link recovery preserve normal auth                   | Auth boundary, PostgreSQL, browser                                   | T-27                                                               | `partial`  |
| [TST-AUTH-006](#tst-auth-006)               | Shared IP and recipient limits bound all auth-email paths                            | HTTP/mail boundaries, PostgreSQL concurrency, browser                | T-27                                                               | `partial`  |
| [TST-LISTS-001](#tst-lists-001)             | Inbox creation and list lifecycle remain correct                                     | Domain, application, PostgreSQL integration, browser                 | T-06, T-10, T-14                                                   | `verified` |
| [TST-LISTS-002](#tst-lists-002)             | List validation, CRUD, uniqueness, and deletion behavior are correct                 | Domain, application, PostgreSQL, boundary                            | T-04, T-06, T-09, T-14                                             | `verified` |
| [TST-LISTS-003](#tst-lists-003)             | List pagination is bounded, deterministic, and context-safe                          | Application, PostgreSQL, boundary, UI                                | T-06, T-08, T-10, T-14                                             | `verified` |
| [TST-TASKS-001](#tst-tasks-001)             | Task lifecycle, status, title, and notes rules are correct                           | Domain, application, boundary                                        | T-07, T-09, T-14                                                   | `verified` |
| [TST-TASKS-002](#tst-tasks-002)             | Task ownership, list relationships, uniqueness, and cascade behavior are correct     | Application, PostgreSQL, boundary                                    | T-04, T-07, T-09, T-14                                             | `verified` |
| [TST-TASKS-003](#tst-tasks-003)             | Task pagination and completed filtering preserve the contract                        | Application, PostgreSQL, boundary, UI                                | T-07, T-08, T-10, T-14                                             | `verified` |
| [TST-CONCURRENCY-001](#tst-concurrency-001) | Concurrent accepted writes follow last-successful-write semantics                    | Application and PostgreSQL integration                               | T-06, T-07, T-14                                                   | `verified` |
| [TST-BOUNDARY-001](#tst-boundary-001)       | JSON routes and Server Actions map auth, validation, and outcomes consistently       | Request-level boundary tests                                         | T-08, T-09                                                         | `verified` |
| [TST-LANDING-001](#tst-landing-001)         | Sanity payloads are validated and mapped without leaking provider records            | Fixture integration                                                  | T-12                                                               | `verified` |
| [TST-LANDING-002](#tst-landing-002)         | The published Sanity singleton can be fetched, validated, and mapped                 | Read-only live smoke                                                 | T-02, T-12                                                         | `verified` |
| [TST-LANDING-003](#tst-landing-003)         | Sanity publishing and recovery invalidate content safely                             | Boundary integration, deployed webhook evidence                      | T-13                                                               | `verified` |
| [TST-LANDING-004](#tst-landing-004)         | Authorized editorial preview isolates drafts and supports live field editing         | Boundary, fixture, browser and real Studio/provider evidence         | T-28                                                               | `partial`  |
| [TST-UI-001](#tst-ui-001)                   | The selected UI direction materializes usable product states                         | Browser/runtime inspection, UI acceptance                            | T-09A, T-09B, T-10, T-11, T-12A, T-15                              | `verified` |
| [TST-E2E-001](#tst-e2e-001)                 | The core authenticated todo journey works in a real browser                          | Playwright Chromium                                                  | T-15                                                               | `verified` |
| [TST-E2E-002](#tst-e2e-002)                 | The magic-link journey works in a real browser                                       | Playwright Chromium                                                  | T-15                                                               | `verified` |
| [TST-E2E-003](#tst-e2e-003)                 | Browser-visible privacy, pagination, filtering, and mutation feedback work together  | Playwright Chromium, on-demand cross-browser                         | T-10, T-12A, T-15                                                  | `verified` |
| [TST-PERFORMANCE-001](#tst-performance-001) | Representative Neon queries use the intended indexes and meet the agreed warm target | Query plans and controlled performance evidence                      | T-16                                                               | `verified` |
| [TST-ENV-001](#tst-env-001)                 | Environment profiles select safe, intended targets and reject unsafe combinations    | Configuration, unit/static guard, local and hosted target inspection | T-18.2, T-18.3, T-18.4, T-19, T-20, T-21, T-21.5, T-22, T-23, T-24 | `verified` |
| [TST-PIPELINE-001](#tst-pipeline-001)       | Preview and release orchestration preserves ref, target, and failure boundaries      | Workflow/static, orchestration, controlled hosted                    | T-21, T-21.5, T-22, T-23, T-24                                     | `verified` |
| [TST-PREVIEW-001](#tst-preview-001)         | A requested Preview is isolated, seeded, functional, and traceable                   | Controlled Neon/Vercel/browser Preview                               | T-22, T-24                                                         | `verified` |
| [TST-RELEASE-001](#tst-release-001)         | An approved exact-ref release is migrated, deployed, smoked, and recorded            | Protected release rehearsal and Production evidence                  | T-21.5, T-23, T-24                                                 | `verified` |
| [TST-LOGGING-001](#tst-logging-001)         | Backend events preserve context, privacy and application outcomes                    | Unit, boundary, Node/Next output lifecycle                           | T-26.1, T-26.3                                                     | `verified` |
| [TST-LOGGING-002](#tst-logging-002)         | Shared policy refresh and protected edits preserve environment isolation             | Unit, PostgreSQL integration, operator refusal checks                | T-26.2, T-26.3                                                     | `verified` |
| [TST-DIAGNOSTICS-001](#tst-diagnostics-001) | Safe diagnostics preserve routing, privacy and lifecycle                             | Unit, PostgreSQL policy, isolated Next runtime                       | T-26.4–T-26.6                                                      | `verified` |
| [TST-DIAGNOSTICS-002](#tst-diagnostics-002) | Both providers receive useful safe logs and grouped errors                           | Local wire and real hosted ingestion/grouping                        | T-26.5–T-26.7                                                      | `partial`  |
| [TST-ALERTS-001](#tst-alerts-001)           | Operational alerts stay independent of app outage and have one delivery owner        | Contract, adapter, external outage and Email evidence                | T-26.11–T-26.14                                                    | `partial`  |
| [TST-RUNTIME-001](#tst-runtime-001)         | Runtime targets, health and deployed identity are safe and verifiable                | Configuration, local database/Next, pipeline and hosted smoke        | T-26.8–T-26.10, T-26.12                                            | `partial`  |

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

- **Status:** `verified`
- **Capability:** Database migration foundation
- **Evidence layers/modes:** Infrastructure / migration integration, hosted smoke
- **Verifies product decisions:** D-003, D-004, D-009
- **Verifies technical decisions:** TD-013, TD-014, TD-019, TD-026
- **Edge cases:** [EC-020](EDGE-CASES.md#ec-020), [EC-021](EDGE-CASES.md#ec-021)
- **SPEC:** [3.3 Migration workflow](../output/agent/SPEC.md#33-migration-workflow), [10.2 PostgreSQL integration](../output/agent/SPEC.md#102-postgresql-integration)
- **Owners:** T-01, T-04, T-14, T-20, T-26.2
- **Contract:** The complete versioned Drizzle migration chain applies to an empty PostgreSQL 18 Testcontainer and the reviewed migration applies successfully to the non-default Neon development branch before promotion.
- **Required evidence:** Harness-owned empty-database migration run and non-destructive Neon development-branch migration smoke.
- **Dependencies:** T-04 schema work, T-14 Testcontainers harness, and a durable non-default Neon development branch.
- **Current evidence:** T-04's `pnpm test:integration` applied the complete consolidated versioned chain to an isolated schema in a fresh disposable local `postgres:18-alpine` container. The T-14 harness now applies that same chain to the empty database of one harness-owned PostgreSQL 18 Testcontainer per integration suite. T-20 provisioned durable Neon branch `development` (`br-super-leaf-axfwoi2e`) in project `curly-dust-60603928` from default `main` without expiration. `pnpm neon:development -- migrate` applied the second committed migration through the direct endpoint. Catalog inspection showed `lists`/`tasks` with native UUID keys and `uuidv7()` defaults, both committed hashes, and no `posts_table`. Read-only inspection of `main` still showed the scaffold-only catalog (`posts_table`, one migration hash). Redacted evidence: [`docs/agentforge/evidence/t20-neon-development.json`](../../docs/agentforge/evidence/t20-neon-development.json).
- **Follow-up:** None for this contract. Production remains a separately provisioned protected project/branch and was not used.

T-26.2 adds [logging-settings migration evidence](../../docs/agentforge/evidence/2026-09-19-logger-settings.md).
The full three-migration chain and a prior-schema upgrade pass on disposable
PostgreSQL 18. The direct non-default Neon Development smoke applied the additive
settings table, retained both earlier journal hashes and left settings empty.
This supplements the existing contract; no Production migration is claimed.

<a id="tst-harness-001"></a>

### TST-HARNESS-001 — Safe database-backed test harness

- **Status:** `partial`
- **Capability:** Test infrastructure
- **Evidence layers/modes:** Infrastructure / integration harness, orchestration checks
- **Verifies product decisions:** D-009
- **Verifies technical decisions:** TD-013, TD-014, TD-017
- **Edge cases:** [EC-020](EDGE-CASES.md#ec-020), [EC-021](EDGE-CASES.md#ec-021), [EC-024](EDGE-CASES.md#ec-024)
- **SPEC:** [10.2 PostgreSQL integration](../output/agent/SPEC.md#102-postgresql-integration), [10.3 Playwright](../output/agent/SPEC.md#103-playwright)
- **Owners:** T-14, T-15, T-21
- **Contract:** Database-backed tests use one harness-owned PostgreSQL 18 container per suite, run serially while sharing it, create unique users and mutable records, remain order-independent, clean up after failures, and refuse destructive cleanup against external URLs.
- **Required evidence:** Docker-unavailable failure, state-isolation test, failure cleanup, external-URL refusal, and the equivalent Playwright lifecycle check.
- **Dependencies:** T-14 harness orchestration and T-15 browser orchestration.
- **Current evidence:** `pnpm test:integration` starts one disposable `postgres:18-alpine` container in global setup, applies the complete migration chain, injects its local URI into the existing integration seam, runs six files serially, and tears the container down. Harness unit tests cover loopback URL refusal, migration statement splitting, injected startup failure reporting, migration-failure cleanup, and normal teardown; a harness integration test confirms PostgreSQL 18 catalog visibility and isolated schemas. The dedicated Playwright lifecycle starts the same harness-owned local container, applies the committed migrations, seeds deterministic records, starts a fixed loopback Next.js server, and cleans up the server process tree, temporary mailbox, and container on success; the run leaves no port or test container behind. T-21's Harness job runs those same commands on GitHub-hosted Ubuntu without setting `TEST_DATABASE_URL`. A live Docker-daemon outage remains unobserved.
- **Follow-up:** Retain the live-daemon outage check as release evidence if the environment supports it; no other T-15 lifecycle evidence remains outstanding.

<a id="tst-persistence-001"></a>

### TST-PERSISTENCE-001 — Relational invariants and repository mappings

- **Status:** `verified`
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
- **Follow-up:** No remaining evidence is required for the accepted baseline.

<a id="tst-auth-001"></a>

### TST-AUTH-001 — Email/password session lifecycle

T-27 adds verified local browser evidence on 2026-09-09:
`e2e/email-verification.spec.ts` proves fresh UI signup, verification pending,
dashboard refusal before verification, same-context captured-link consumption,
automatic Inbox access, and password sign-in after sign-out. The focused
Chromium journey passes, as do all 8 Chromium journeys and 23 integration tests.
This evidence uses the disposable local database and mailbox, not remote email.

On 2026-09-16, T-21.5 added [controlled real delivery evidence](../../docs/agentforge/evidence/2026-09-16-resend-domain-delivery.md)
for a synthetic verification message through the existing Resend adapter.
The owner domain was verified and Gmail receipt was observed in Spam, followed
by an approved manual move to Inbox. No real token or deployed signup/session
was exercised. The accepted local lifecycle status below is unchanged.

- **Status:** `verified`
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
- **Current evidence:** `src/modules/auth/auth.integration.test.ts` passes against a disposable local PostgreSQL 18 database for email/password sign-up, local email verification, sign-in, current-user resolution, sign-out, the resulting unauthenticated state, and preservation of the password credential when the same verified account later uses a magic link. T-11 adds the server-rendered sign-up/sign-in surfaces, safe `/dashboard` callback handling, stable invalid-credential feedback, and labelled keyboard-reachable controls. The deterministic Playwright seed signs up and verifies six scenario users through the real Better Auth handler while leaving the core workspace listless; the Chromium core journey signs in that user, observes application-provisioned `Inbox`, creates a list and task, changes status, signs out, and confirms the private dashboard redirects to sign-in. The full local Chromium run passes 7/7 journeys against the harness-owned database and dedicated Next.js server.
- **Follow-up:** None for the accepted local/test session contract; remote email delivery and production deployment remain outside this task.

<a id="tst-auth-002"></a>

### TST-AUTH-002 — Magic-link local/test lifecycle

- **Status:** `verified`
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
- **Current evidence:** `src/modules/auth/auth.integration.test.ts` passes the request/read/consume/replay flow against disposable local PostgreSQL 18, and `src/modules/auth/infrastructure/local-mailbox.test.ts` proves explicit test-mode gating and safe cleanup. T-11 adds the `/magic-link` request surface, Better Auth plugin callback wiring, and stable invalid-token error handoff. The deterministic Chromium journey requests a link through the UI, reads only the temporary local mailbox, visits the captured URL, reaches the seeded Magic Inbox, and clears the mailbox in cleanup; the full 7/7 local browser run passes.
- **Follow-up:** None for the accepted local/test mailbox contract; production/shared email delivery remains outside T-05.
- **Remote evidence boundary, 2026-09-16:** The [T-21.5 provider smoke](../../docs/agentforge/evidence/2026-09-16-resend-domain-delivery.md) used verification-message metadata and a synthetic URL. It did not send or consume a remote magic link; this local/test contract remains `verified` on its existing evidence.

<a id="tst-auth-003"></a>

### TST-AUTH-003 — Private authorization and owner identity

- **Status:** `verified`
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
- **Current evidence:** `src/modules/auth/auth.integration.test.ts` proves the current-user boundary fails closed without a session and rejects bearer-only access even when paired with a client-supplied `x-user-id`. The T-09 list/task request and action suites prove session-derived owner propagation, anonymous `401` outcomes, privacy-preserving `404` outcomes, rejection of spoofed body fields, and rejection of foreign-origin mutations. The deterministic Chromium privacy journey signs in two seeded users, confirms each sees only its own list/task, and confirms a private task endpoint for the other user returns the ordinary `404` outcome; the full local browser run passes 7/7 journeys.
- **Follow-up:** None for the accepted local/test ownership contract; broader authorization models remain outside the baseline.

<a id="tst-auth-004"></a>

### TST-AUTH-004 — Password recovery and automatic session revocation

- **Status:** `partial`
- **Capability:** Account recovery
- **Evidence layers/modes:** Auth boundary, PostgreSQL integration, browser
- **Verifies product decisions:** D-002, D-011
- **Verifies technical decisions:** TD-004, TD-026, TD-027, TD-032
- **SPEC:** [Account recovery and abuse resistance](../output/agent/SPEC.md#account-recovery-and-abuse)
- **Owners:** T-27.2–T-27.4 under [T-27](../../TODO.md#t-27-complete-authentication-product-flows-and-abuse-resistance)
- **Contract:** Recovery requests remain neutral regardless of account existence. An expiring, single-use link permits a new password; successful reset revokes every existing session and requires ordinary sign-in. Requesting mail, invalid/expired/replayed links and throttled requests do not revoke sessions, lock the account or change credentials.
- **Required evidence:** Focused boundary checks for neutral responses and timing-safe mail scheduling; real PostgreSQL checks for expiry, malformed/reused links, concurrent consumption without two successful resets, and revocation of at least two prior sessions only after a successful reset. A real browser journey requests/captures/consumes the reset link through the existing local mailbox, rejects old session cookies and the old password, and signs in normally with the new password. Logs and browser artifacts exclude reset credentials and URLs.
- **Dependencies:** The existing Better Auth/mail seam, database and browser harnesses; implementation planning supplies exact lifetime and ordinary password-policy cases. Hosted delivery requires separately authorized evidence under the existing environment policy.
- **Current evidence:** Partial, 2026-09-25 ([T-27.2 evidence](../../docs/agentforge/evidence/2026-09-25-native-recovery.md)). Backend verified on real PostgreSQL through the Better Auth handler: neutral known/unknown requests, 30-minute single-use tokens, one success under concurrent consumption, revocation of two prior sessions only after a successful reset without auto sign-in, old password refused, and invalid/expired/throttled requests leaving sessions and credentials unchanged; responses do not wait for scheduled mail. T-27.3 ([evidence](../../docs/agentforge/evidence/2026-09-25-recovery-screens.md)) adds the real browser journey: request, capture and consume a reset through the UI, token removed from the address bar, the pre-reset session and old password refused, ordinary sign-in with the new password, a replayed link refused; reports contain no reset token. All local evidence is recorded; hosted proof remains T-27.4. Existing TST-AUTH-001–003 evidence remains valid only for its original scope.
- **Follow-up:** Implement and reconcile under T-27 after consolidated planning; do not infer completion from this decision record.

<a id="tst-auth-005"></a>

### TST-AUTH-005 — Verification resend and invalid-link recovery

- **Status:** `partial`
- **Capability:** Account recovery
- **Evidence layers/modes:** Auth boundary, PostgreSQL integration, browser
- **Verifies product decisions:** D-002, D-011
- **Verifies technical decisions:** TD-004, TD-026, TD-027, TD-032
- **SPEC:** [Account recovery and abuse resistance](../output/agent/SPEC.md#account-recovery-and-abuse)
- **Owners:** T-27.2–T-27.4 under [T-27](../../TODO.md#t-27-complete-authentication-product-flows-and-abuse-resistance)
- **Contract:** Pending verification offers explicit resend; expired/invalid links have clear guidance and a fresh-link path. Resend is bounded, account existence remains private, and normal Better Auth verification/session behavior is preserved.
- **Required evidence:** Boundary/database checks for pending, absent and already-verified recipients, invalid/expired links and resend throttling; browser journeys exercise resend and recovery through the local mailbox and prove private access only after normal successful verification. Preserve the existing fresh-signup verification journey and redact link-bearing diagnostics/artifacts. Do not impose password-reset single-use semantics on native verification tokens.
- **Dependencies:** Existing verification UI/mail seam and database/browser harnesses, plus the shared controls in TST-AUTH-006. Hosted mail evidence remains separate.
- **Current evidence:** Partial, 2026-09-25 ([T-27.2 evidence](../../docs/agentforge/evidence/2026-09-25-native-recovery.md)). Backend verified: resend answers identically for pending, absent and verified recipients and mails only the pending one, repeat requests are throttled, invalid links report `INVALID_TOKEN`, an expired link reports `TOKEN_EXPIRED` without verifying, and the unexpired link then verifies normally. T-27.3 ([evidence](../../docs/agentforge/evidence/2026-09-25-recovery-screens.md)) adds browser journeys: resend from the pending screen with a bounded repeat and private access only after the link, invalid-link and unverified sign-in recovery with a fresh link, and the expired-link page. All local evidence is recorded; hosted mail evidence remains T-27.4. The completed local signup/verification slice remains the baseline.
- **Follow-up:** Implement and reconcile under T-27 after consolidated planning.

<a id="tst-auth-006"></a>

### TST-AUTH-006 — Shared authentication and recipient mail limits

- **Status:** `partial`
- **Capability:** Authentication abuse resistance
- **Evidence layers/modes:** HTTP/auth-mail boundaries, real PostgreSQL concurrency, browser feedback
- **Verifies product decisions:** D-011
- **Verifies technical decisions:** TD-026, TD-027, TD-032
- **SPEC:** [Account recovery and abuse resistance](../output/agent/SPEC.md#account-recovery-and-abuse)
- **Owners:** T-27.1–T-27.4 under [T-27](../../TODO.md#t-27-complete-authentication-product-flows-and-abuse-resistance)
- **Contract:** Supported per-IP limits protect relevant sign-up, sign-in and auth-email paths. A shared per-recipient budget bounds verification, reset and magic-link mail, including automatic and server-side sends. Environment-scoped PostgreSQL counters admit requests atomically across instances. Excess requests produce a safe temporary wait, no account lockout or enumeration signal, and no sensitive logging.
- **Required evidence:** Real database concurrency across independent limiter instances at first use, limit exhaustion and window expiry; prove IP rotation cannot bypass the recipient bound and independent environments do not share budgets. Exercise automatic signup/sign-in, explicit resend/reset/magic-link and relevant `auth.api` send paths, accounting for the HTTP limiter's server-call bypass and development defaults. Check common counter failures do not silently allow unbounded mail, recipient cooldown responses do not distinguish absent accounts, and retry feedback allows recovery without changing credentials or active sessions. Retain the existing migration and environment safety obligations for any new schema; in-memory mocks alone cannot verify shared atomicity.
- **Dependencies:** Existing environment-selected PostgreSQL and Better Auth/Drizzle integration; planning specifies supported integration, concrete windows/counts and trusted IP handling. No new service is required.
- **Current evidence:** Partial, 2026-09-24 ([T-27.1 evidence](../../docs/agentforge/evidence/2026-09-24-auth-admission.md)). The storage portion is verified on disposable PostgreSQL 18 with independent pools: exactly the maximum admitted under simultaneous first use and after window expiry, rejection without counting or extending the window, bounded expired-row cleanup, a recipient send budget that holds across independent instances, separate request/send namespaces and environments, opaque HMAC keys only, denial when the database is unreachable, and the forward migration's prior-schema upgrade. T-27.2 ([evidence](../../docs/agentforge/evidence/2026-09-25-native-recovery.md)) adds the wiring: limits on in every environment, recipient request cooldown before account lookup for HTTP and `auth.api` calls, an actual-send cap that holds across rotating client addresses for automatic sends, per-address reset-submission limits, fail-closed admission and opaque stored keys. T-27.3 ([evidence](../../docs/agentforge/evidence/2026-09-25-recovery-screens.md)) adds the browser feedback: neutral answers, cooldown messages on reset and verification repeats, all with real limits on. All local evidence is recorded; hosted proof is T-27.4.
- **Follow-up:** Implement and reconcile under T-27 after consolidated planning, together with TST-AUTH-004/005.

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

- **Status:** `verified`
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
- **Follow-up:** No remaining evidence is required for the accepted baseline. The application patch tests and harness-backed PostgreSQL commit-ordering/disjoint-field tests cover the required concurrent-write behavior.

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
- **Follow-up:** No remaining evidence is required for the accepted baseline. The dedicated T-15 Playwright lifecycle separately records the dashboard browser/runtime journeys.

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

- **Status:** `verified`
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
- **Evidence:** Local boundary tests pass in `pnpm test` (6 files, 32 tests at the implementation checkpoint) and cover generated valid/invalid Sanity signatures, malformed payloads, irrelevant and draft events, duplicate deliveries, the stable tag with immediate-expiration profile `{ expire: 0 }`, manual authorization, and shared invalidation routing. The deployed webhook-delivery clause passed on 2026-09-16 through Sanity attempts `atm-3JPmRI2RJHyFNpC93aLuz4p6vMT` and `atm-3JPoK9DYctGZPssOOuAIotTmau8`, both HTTP 200 after identical-content publishes. See [live release evidence](../../docs/agentforge/evidence/2026-09-16-production-release-live.md).

<a id="tst-landing-004"></a>

### TST-LANDING-004 — Authenticated editorial preview and live editing

- **Status:** `partial`
- **Capability:** Editorial landing preview
- **Evidence layers/modes:** Infrastructure and HTTP boundary / fixture and refusal tests; browser / real Sanity Studio and provider integration
- **Verifies product decisions:** D-005, D-008, D-013
- **Verifies technical decisions:** TD-018, TD-023, TD-026, TD-034
- **Edge cases:** Existing [EC-007](EDGE-CASES.md#ec-007) and [EC-025](EDGE-CASES.md#ec-025) content failures; preview authorization, credential and cache boundaries below
- **SPEC:** [6.4 Editorial draft preview](../output/agent/SPEC.md#editorial-draft-preview), [10.4 Sanity verification](../output/agent/SPEC.md#104-sanity-verification), [11 Environment and delivery](../output/agent/SPEC.md#11-environment-and-delivery-contract)
- **Owner:** T-28.1–T-28.3
- **Contract:** Existing authorized Sanity editors can activate draft preview, see unpublished landing changes update live, click rendered fields to their Studio source and exit to published content. Ordinary visitors retain published content and existing freshness/recovery behavior. Local, Development and Production editorial sessions use the existing `production` dataset; deployment Preview refuses the capability and remains read-only on `preview`.
- **Required evidence:**
  - Boundary tests reject missing, invalid and expired private preview secrets and disallowed environment/configuration, and prove redirects remain within the application. Before delegating, reject missing secrets and malformed redirect syntax without exposing a present synthetic secret through the helper's development parse-error log. Ordinary application authentication alone cannot activate preview. Tests follow the installed helper's supported authorization and cookie/redirect lifecycle rather than replacing it.
  - Prove that draft reads, subscriptions, controls and the read-only Viewer browser token require an allowed Draft Mode session; public responses and deployment Preview contain none of them. Verify no write-capable editor credential reaches the application frontend and preview secrets are absent from logs/evidence.
  - Fixture tests retain unknown-payload validation, required/optional field behavior and plain-content mapping. Verify draft data cannot populate the published cache or an unauthenticated fallback, and the existing webhook/manual recovery service is preserved.
  - Real browser evidence uses separate editor and public contexts: an explicitly authorized Studio draft edit updates the editor preview without publishing; the ordinary visitor remains on published content; click-to-edit opens the correct singleton field; exiting removes controls and returns to published content.
  - Hosted preflight records the intended dataset/origins, Viewer permissions and disabled shared access, including absence of a previously active shared secret. Evidence distinguishes private-secret validity, Draft Mode session lifetime and membership/token revocation limits; it must not claim immediate per-editor revocation unsupported by the integration.
- **Dependencies:** Accepted D-013/TD-034 scope, the T-12/T-13 published baseline and T-22/T-24 delivery boundaries. Real proof additionally requires configured read credentials, existing editor access, allowed origins/CORS, a running allowed target and explicit authorization for the demonstrated provider actions.
- **Evidence:** Partial, 2026-09-25 ([T-28.1 evidence](../../docs/agentforge/evidence/2026-09-25-preview-authorization.md)): the configuration and entry/exit boundary. Preview capability parsing refuses disallowed profiles, datasets, missing tokens and any Preview flag or token; missing/blank secrets and malformed redirects are refused before the helper can log them; the real helper refuses unknown/expired secrets (TTL-bound lookup) and keeps redirects relative; the running server refuses entry while disabled and exits to published content; Preview delivery never receives the token and Production forwards it only from protected settings. Draft reads, Live, overlays and real Studio proof remain T-28.2/T-28.3. Local fixtures and the routine Playwright landing fixture cannot establish real Sanity authorization, live updates or field navigation. Keep missing hosted evidence visible. This contract neither changes the verified statuses/history of `TST-LANDING-001`–`003` nor substitutes for `TST-LANDING-002`'s read-only smoke or `TST-LANDING-003`'s real deployed webhook clause.

<a id="tst-ui-001"></a>

### TST-UI-001 — Selected UI direction and usable states

- **Status:** `verified`
- **Capability:** Product UI
- **Evidence layers/modes:** UI / prototype inspection, runtime inspection, browser acceptance
- **Verifies product decisions:** D-001, D-002, D-003, D-004, D-009
- **Verifies technical decisions:** TD-009, TD-020
- **SPEC:** [9 UI](../output/agent/SPEC.md#9-ui), [14.6 Presentation boundary](../output/agent/SPEC.md#146-presentation-boundary)
- **Owners:** T-09A, T-09B, T-10, T-11, T-12A, T-15
- **Contract:** The selected UI direction remains recognizable in the materialized landing, auth, and dashboard surfaces, and the critical controls and states remain usable at the agreed viewports with keyboard reachability, visible focus, loading, empty, error, disabled, selected, long-content, and overflow behavior.
- **Required evidence:** Fair prototype inspection during exploration, browser/runtime inspection during materialization, and focused browser acceptance for critical interactions. This is not a requirement for a complete React component unit-test matrix.
- **Dependencies:** T-09A/T-09B design work and the implemented surfaces in T-10/T-11. T-12A's dashboard skip-target activation and next-Tab check are complete through the T-15 browser harness.
- **Evidence:** T-09A's isolated static prototype uses one fixture and three materially different directions. Structural validation passes with exactly three manifests; Chromium Playwright inspection covers all directions at 1440x900, 1024x768, 768x1024, and 320x800 with zero console errors and no document overflow. Prototype evidence covers task/list capture, status changes, completed filtering, list switching, bounded continuation, keyboard-visible focus and search shortcuts, explicit final-list reload/Inbox recreation, loading/disabled, empty, validation-error, selected, and long-content states. T-09B selects Focus Rail based on the locked list-sidebar/task-panel contract, first-open comprehension, narrow-viewport evidence, and lower implementation complexity; [`handoff.md`](../../.ui-explorations/t09a-dashboard/handoff.md) records the rejected alternatives, reusable primitives, responsive/accessibility rules, and required state matrix. T-10 materializes the selected dashboard direction and its state matrix in Next.js: authenticated browser coverage exercised create/select/rename/delete, task capture/edit/status/delete, completed filtering, both cursor continuations, validation/conflict/recoverable states, final-list reload/Inbox recreation, keyboard focus return, and long-content wrapping. Axe reported zero violations at the authenticated dashboard route and the four agreed viewports had no horizontal overflow. T-11 materializes the server-owned landing and three auth routes with labelled controls, explicit error/pending/success states, safe callback handling, and the Focus Rail public/auth shell. T-12A adds one shared focus-visible skip link wired to the landing, auth, and dashboard content targets and hides the decorative landing preview from the accessibility tree; Chromium inspection of `/`, `/sign-up`, `/sign-in`, and `/magic-link` confirms the skip link is first in the accessibility tree, activation focuses the target, axe reports zero violations, browser errors are absent, and `scrollWidth` equals `innerWidth` at 320x800, 768x1024, 1024x768, and 1440x900. The unauthenticated dashboard check remains session-gated to `/sign-in`; source/build inspection and T-10's earlier authenticated runtime evidence cover the existing dashboard behavior, while T-15's deterministic Chromium suite exercises the authenticated dashboard skip-link activation and next logical Tab stop and confirms the deterministic landing content. Together these checks cover the selected direction's required critical controls, states, keyboard behavior, and overflow requirements; the separate TST-E2E-* contracts record the other T-15 journeys.

<a id="tst-e2e-001"></a>

### TST-E2E-001 — Core authenticated todo journey

T-27 extends the verified browser evidence on 2026-09-09 with
`e2e/email-verification.spec.ts`: a fresh signup and verification journey,
including denial of private access before verification and preservation of the
password credential. The focused journey and complete 8-test Chromium suite
pass. This local mailbox evidence does not establish remote mail delivery.

- **Status:** `verified`
- **Capability:** Core todo journey
- **Evidence layers/modes:** End-to-end / Playwright Chromium
- **Verifies product decisions:** D-001, D-002, D-003, D-004, D-009
- **Verifies technical decisions:** TD-009, TD-014, TD-016, TD-017, TD-018, TD-022
- **SPEC:** [7 Starter baseline acceptance](../output/agent/PRD.md#7-starter-baseline-complete-acceptance), [10.3 Playwright](../output/agent/SPEC.md#103-playwright)
- **Owner:** T-15
- **Contract:** In a real Chromium browser, a user can sign up or sign in, obtain the Inbox, create a list, create a task, change its status, and sign out; private data remains protected after sign-out.
- **Required evidence:** Playwright run against the harness-owned PostgreSQL 18 database, deterministic behavior seed, and dedicated Next.js test server.
- **Dependencies:** T-05, T-09, T-10, T-11, T-14, and the T-15 orchestration.
- **Evidence:** `e2e/core-journey.spec.ts` passes in the serial Chromium run against the harness-owned PostgreSQL 18 container and dedicated loopback Next.js server. The listless seeded user signs in, observes the application-provisioned `Inbox`, creates a project-qualified list and task, changes the task to completed, signs out, and is redirected from `/dashboard` to `/sign-in`; the full local run passes 7/7 journeys with browser diagnostics clean.

<a id="tst-e2e-002"></a>

### TST-E2E-002 — Magic-link browser journey

- **Status:** `verified`
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
- **Evidence:** `e2e/magic-link.spec.ts` passes in Chromium: the seeded magic-link user requests a link through the UI, the test reads only the temporary local mailbox, visits the captured URL, reaches the Magic Inbox, and clears the mailbox in cleanup. The full local run passes 7/7 journeys without remote email delivery.

<a id="tst-e2e-003"></a>

### TST-E2E-003 — Browser-visible capability behavior

- **Status:** `verified`
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
- **Evidence:** T-10's authenticated Next.js browser loop covers the dashboard portion of this contract with private-session gating, mutation feedback, completed filtering, visible list/task cursor pagination, duplicate-safe continuation, and final-list reset behavior. T-12A audits the materialized Focus Rail composition, shared skip-link wiring, public/auth accessibility tree, responsive overflow, and unchanged state/interaction boundaries. T-15's deterministic Chromium suite adds repeatable local-harness evidence for the landing fixture, two-user privacy isolation, list/task pagination, completed filtering, status mutation feedback, and dashboard keyboard skip-link behavior; the full local run passes 7/7 journeys with browser diagnostics clean. The opt-in runner's project list selects the same seven journeys for Firefox and WebKit when `PLAYWRIGHT_CROSS_BROWSER=true`; those optional engines were not executed in this routine gate.

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

<a id="tst-env-001"></a>

### TST-ENV-001 — Environment profile and target safety

- **Status:** `verified`
- **Capability:** Environment contract and target guardrails
- **Evidence layers/modes:** Configuration / unit, static guard, local target checks, and hosted target inspection when available
- **Verifies product decisions:** D-009, D-010
- **Verifies technical decisions:** TD-009, TD-011, TD-014, TD-019, TD-025, TD-026, TD-027
- **Edge cases:** [EC-020](EDGE-CASES.md#ec-020), [EC-021](EDGE-CASES.md#ec-021), [EC-025](EDGE-CASES.md#ec-025)
- **SPEC:** [3.3 Migration workflow](../output/agent/SPEC.md#33-migration-workflow), [10.2 PostgreSQL integration](../output/agent/SPEC.md#102-postgresql-integration), [10.3 Playwright](../output/agent/SPEC.md#103-playwright), [10.4 Sanity verification](../output/agent/SPEC.md#104-sanity-verification), [11 Environment and delivery contract](../output/agent/SPEC.md#11-environment-and-delivery-contract), [10.7 Environment and delivery evidence](../output/agent/SPEC.md#107-environment-and-delivery-evidence)
- **Owners:** T-18.2, T-18.3, T-18.4, T-19, T-20, T-21, T-21.5, T-22, T-23, T-24
- **Contract:** An explicit `APP_ENV` profile selects a matching application origin, Better Auth configuration, database provider/project/branch identity, pooled runtime and direct migration roles, Sanity dataset/policy, mail policy, secret namespace, and permitted operations. Profile parsing and target guards reject missing, conflicting, cross-environment, remote-reset, pooled-migration, local-mailbox-in-deployment, invalid-origin, and ambiguous-target combinations before mutation. Diagnostics expose only redacted target names and safe metadata.
- **Required evidence:** A deterministic profile matrix for valid Local, Development, Preview, and Production configurations; negative tests for missing/conflicting variables, wrong project/branch identity, invalid origins, pooled/direct role inversion, local mailbox use in deployed contexts, missing Production mail transport, and secret-bearing output; plus local/CI command tests proving refusal before destructive or deployment mutation. Hosted Neon/Vercel/Sanity identity, protected-secret, and Production mail-transport evidence remains boundary evidence for T-20/T-21.5/T-22/T-23/T-24 and cannot be replaced by local tests.
- **Dependencies:** T-18.1's accepted TD-026 contract, followed by the profile implementation in T-18.2 and target guards in T-18.3. The local, hosted-target, and Production-mail prerequisites are owned by T-19/T-20/T-21.5/T-22/T-23.
- **Current evidence:** T-18.2 adds the typed profile parser, validated sensitive configuration result, redacted inspection projection, and exact-ref argument parser in `scripts/environment/`, with 20 focused tests covering valid Local/Development/Preview/Production profiles, required/conflicting variables, profile origins, provider/role mismatches, read-only Sanity secret rejection, deployed local-mailbox rejection, safe redaction, unsafe delivery identifiers, and Preview/Production argument shapes. T-18.3 adds `scripts/environment/guards.ts` and 37 focused tests covering supplied provider/project/branch/endpoint correlation, Local loopback reset refusal with selected/connection harness ownership, direct-versus-pooled migration selection, explicit-port/database and endpoint-override query rejection, Production migration approval, non-Production seed restrictions, identity-matched Preview cleanup/deployment, requested/provider Preview ID correlation, resolved ref kind/SHA checks, Production approval correlation, redacted evidence, localhost/loopback equivalence, and refusal before mutation. T-18.4 adds `src/test/environment/contract.test.ts` with 36 cross-boundary tests for the four-profile matrix, missing/conflicting configuration, all profile origin modes, mutable and ambiguous delivery refs, every guarded mutation refusal path, pre-parse and guard-level Development/Preview default-branch rejection, separately identified Production `main` acceptance, and redacted guard evidence. T-19 adds `scripts/local-postgres/` with a persistent loopback `postgres:18-alpine` Compose project, guarded migrate/seed/reset adapters, and 14 focused tests that refuse Neon and mismatched local URLs before mutation. A real Compose start/migrate/seed/reset/stop run applied the committed chain on `127.0.0.1:5432`, signed in the synthetic local user, and left Testcontainers on their own disposable container. T-21's Quality job uses loopback compile-time placeholders and never a Neon or Production URL. T-20 adds `scripts/neon-development/` with 11 focused tests for command parsing, durable-branch identity, expiry/main/project refusal, pooled-migration refusal, and redacted inspect output. Hosted provision created durable `development` (`br-super-leaf-axfwoi2e`) with no expiration; inspect correlated CLI-observed project/branch/hosts; migrate and ordinary seed ran through the T-18.3 guards; `main` was not mutated. `pnpm exec vitest run src/test/environment` passes 3 files and 93 tests; typecheck, changed-file lint, formatting, and diff checks pass. T-22 adds Preview adapter refusal for non-Preview profiles, durable `development` as a mutation target, missing expiry, pooled migration URLs, and local-mailbox settings, plus redacted inspect output. Preview/Vercel hosted identity, Production-mail, and protected-secret evidence remain T-21.5/T-22/T-23/T-24 boundaries, so this contract is `partial`.
- **T-21.5 local adapter evidence, 2026-09-09:** Resend configuration and mail tests cover explicit Production selection, original verification/magic-link URL delivery, HTTP/network/malformed-response failures without sensitive diagnostics, non-Production remote refusal, deployed local-mailbox refusal, missing sender/key rejection and safe inspection output. A synthetic test-domain send through the adapter was accepted. At that checkpoint no owner domain or protected Production sender configuration had been verified. See [auth-mail runbook](../../docs/runbooks/auth-mail.md) and the subsequent provider evidence below.
- **T-21.5 provider evidence, 2026-09-16:** The owner-controlled sending subdomain passed Namecheap public-DNS and Resend verification, and one real adapter send reached the owner's Gmail. Initial placement was Spam, followed by an owner-approved manual move to Inbox. That invocation validated an isolated local configuration object; it did not configure or inspect GitHub/Vercel Production secret scope or a deployed process. The later protected run below completes the mail foundation. This contract remains `partial` for the outstanding release evidence. See [redacted provider evidence](../../docs/agentforge/evidence/2026-09-16-resend-domain-delivery.md).

T-21.5 protection update, 2026-09-16: [configuration evidence](../../docs/agentforge/evidence/2026-09-16-production-mail-protection.md)
records the actual GitHub Production reviewer, disabled administrator bypass,
main-only branch policy, scoped key metadata and mail variables. Seven new
CLI/workflow tests pass, alongside the existing mail/profile guards. The
first approved protected execution passed in run `35103297897`; TST-ENV-001 stays `partial` because T-23/T-24 release evidence remains pending.

<a id="tst-pipeline-001"></a>

### TST-PIPELINE-001 — Environment and delivery pipeline orchestration

- **Status:** `verified`
- **Capability:** Delivery pipeline
- **Evidence layers/modes:** Workflow/static validation, orchestration tests, controlled disposable/hosted boundary evidence
- **Verifies product decisions:** D-009, D-010
- **Verifies technical decisions:** TD-019, TD-025, TD-026, TD-027
- **SPEC:** [11 Environment and delivery contract](../output/agent/SPEC.md#11-environment-and-delivery-contract), [10.7 Environment and delivery evidence](../output/agent/SPEC.md#107-environment-and-delivery-evidence), [14.8 Delivery boundary](../output/agent/SPEC.md#148-delivery-boundary)
- **Owners:** T-21, T-21.5, T-22, T-23, T-24
- **Contract:** Delivery workflows resolve the requested ref to one immutable commit, select the intended non-production or Production target, keep direct migration separate from application boot, run only permitted seed/cleanup operations, preserve isolation, and report success or partial failure with redacted evidence. CI has no deployment side effect; Preview and Production are manual workflows; Production release waits for the minimum configured mail transport; non-production work cannot reach Production data or secrets.
- **Required evidence:** Static workflow checks for trigger and permission boundaries; deterministic orchestration tests for ref resolution, target selection, sequencing, cleanup, expiry, and failure state; a controlled Preview lifecycle; and a controlled exact-ref release rehearsal plus protected Production evidence where authorized. Mocks may prove orchestration decisions but not Neon/Vercel/browser/Production claims.
- **Dependencies:** T-18.1–T-18.4 environment contract and guards, T-19/T-20 stable local and Development targets, T-21 CI, T-21.5 Production mail foundation, and owner-authorized T-22/T-23 hosted prerequisites.
- **Current evidence:** T-21 adds `.github/workflows/ci.yml` with `push`/`pull_request` triggers on `main`, `contents: read` default permissions, concurrency cancellation, and SHA-pinned `actions/checkout`, `pnpm/setup`, and `actions/upload-artifact`. The Quality job runs `pnpm typecheck`, `pnpm lint`, `pnpm test`, `drizzle-kit check`, and `pnpm build` with loopback compile-time placeholders. The Harness job runs `pnpm test:integration` and Chromium `pnpm test:e2e` against disposable local PostgreSQL. `src/test/pipeline/ci-workflow.test.ts` proves those trigger, permission, pin, and no-deploy boundaries. The workflow does not deploy, create Preview branches, mutate Sanity, or read `secrets.*`. GitHub Actions run [33746137734](https://github.com/michi-guns/nextjs-todo-list-example/actions/runs/33746137734) on `e50a641` succeeded (Quality 1m25s, Harness 2m0s) with no hosted mutation. T-22 adds `.github/workflows/deploy-preview.yml` as `workflow_dispatch` only, GitHub Environment `preview`, and `src/test/pipeline/preview-workflow.test.ts` proving CI remains the only automatic workflow and that checkout and the adapter receive the same requested ref. `scripts/deploy/preview/` proves exact-ref parsing, Preview-id isolation, expiry, identity-checked cleanup, and refusal before mutation. Its exact-revision regression tests prove that a different checkout or local edits stop before any Neon, migration, seed, deployment, or smoke operation, while a clean checkout at the resolved SHA continues. The owner subsequently provisioned the Preview prerequisites. The 2026-09-09 hosted attempt failed to establish Preview identity because Vercel assigned Production to the first deployment. The deployment was deleted and guarded Neon cleanup succeeded. The first-deployment and adapter-lookup blockers were resolved on 2026-09-14 and the hosted Preview stage now has real evidence under TST-PREVIEW-001; this contract stays `partial` until T-23 adds the protected release path and T-24 rehearses it. See [Preview runbook](../../docs/runbooks/preview-delivery.md).
- **T-24 local slice, 2026-09-09:** `pnpm test:pipeline` groups the environment matrix, static workflow checks and Preview orchestration tests, passing 124 cases. Added evidence proves migration/seed/deploy/smoke ordering, stopping after each stage failure without success output, explicit matching cleanup after failure, and refusal of Development or another Preview identity during cleanup. Hosted lifecycle and protected release evidence remain unavailable; the parent task stays incomplete.
- **Readiness update, 2026-09-16:** T-22's completed hosted Preview lifecycle remains available evidence. T-21.5 has verified owner-domain, [controlled real delivery evidence](../../docs/agentforge/evidence/2026-09-16-resend-domain-delivery.md), and the approved protected mail configuration run recorded below. T-23 release orchestration and T-24 release rehearsal remain pending. The mail checks do not prove an application release. Status remains `partial`.

T-21.5 protection update, 2026-09-16: the manual mail inspection workflow
adds a main-only protected path with secrets supplied only to validation.
Local tests prove the workflow contract, not a hosted approval. The
[configuration record](../../docs/agentforge/evidence/2026-09-16-production-mail-protection.md)
records successful approved execution in run `35103297897`. TST-PIPELINE-001 stays `partial` until T-23/T-24 release evidence is complete.

<a id="tst-preview-001"></a>

### TST-PREVIEW-001 — Isolated functional Preview

- **Status:** `verified`
- **Capability:** Preview delivery
- **Evidence layers/modes:** Controlled Neon branch, Vercel Preview, application/browser smoke, and redacted workflow artifact
- **Verifies product decisions:** D-001, D-002, D-003, D-004, D-005, D-009, D-010
- **Verifies technical decisions:** TD-005, TD-018, TD-019, TD-023, TD-026
- **SPEC:** [2 Auth](../output/agent/SPEC.md#2-auth-better-auth), [6 Sanity](../output/agent/SPEC.md#6-sanity-landing-only), [11 Environment and delivery contract](../output/agent/SPEC.md#11-environment-and-delivery-contract), [10.7 Environment and delivery evidence](../output/agent/SPEC.md#107-environment-and-delivery-evidence)
- **Owners:** T-22, T-24
- **Contract:** A manually requested Preview resolves and displays the selected commit SHA, creates a temporary Neon branch from durable Development, applies reviewed migrations through its direct URL, loads deterministic or sanitized non-production data, deploys that SHA to Vercel Preview with its deployment origin, and supports password authentication through a controlled pre-seeded verified account, list/task mutation, and the landing read path. Preview writes are isolated from Development and Production, the local mailbox is rejected, and cleanup/expiry is identity-checked and repeatable.
- **Required evidence:** Real disposable Neon/Vercel/browser evidence for branch isolation, migration, seed, deployment configuration, functional smoke, traceability, cleanup, and expiry. Local orchestration tests may cover refusal and failure paths but do not establish a deployed Preview or remote Sanity claim.
- **Dependencies:** TD-026, T-18 guard implementation, an owner-authorized durable Development target from T-20, CI evidence from T-21, and Vercel/Neon credentials plus the dedicated Preview Sanity dataset. Remote email delivery is not required for this contract because the controlled-account strategy is the accepted T-18.1 choice; arbitrary Preview sign-up/magic-link delivery remains outside this contract until T-27.
- **Current evidence:** T-22 adds `scripts/deploy/preview/` and `.github/workflows/deploy-preview.yml`. `pnpm exec vitest run scripts/deploy/preview/core.test.ts src/test/pipeline/preview-workflow.test.ts src/modules/auth/infrastructure/auth-mail.test.ts` passes 21 tests for command parsing, `preview-<id>` naming, exact clean revision acceptance, different-checkout and local-edit refusal before provider or database operations, the real Git commit-peel subprocess on Windows, non-Preview profile refusal, development/main/non-expiring refusal, create-from-development with expiry, reuse, pooled-migration refusal, identity-checked cleanup, missing-branch no-op, redacted inspect, manual `workflow_dispatch`, requested-ref checkout/pass-through, SHA pins, Environment `preview`, and Preview mail no-op. The dedicated Sanity `preview` dataset exists with published `landingPage`. The owner later supplied Preview secrets and authorized the 2026-09-09 attempt. The isolated Neon branch was created, migrated and seeded, but Vercel assigned Production to its first deployment. The task-created deployment was deleted and Neon cleanup succeeded. No valid Preview smoke was completed. Both blockers were resolved on 2026-09-14; see the dated entries below and the [Preview runbook](../../docs/runbooks/preview-delivery.md).
- **2026-09-09 hosted update:** Resources and secrets were provisioned and the owner authorized the run. The isolated Neon branch was created, migrated and seeded. Vercel assigned Production to the first deployment; it was deleted and guarded Neon cleanup succeeded. No valid Preview smoke was completed. The first-deployment prerequisite contradicts the original plan and needs an owner decision before retry; team-scoped lookup also needs repair. See [redacted attempt evidence](../../docs/agentforge/evidence/2026-09-09-preview-attempt.md). Earlier missing-secret statements above describe the initial local checkpoint, not current readiness.
- **2026-09-14 identity repairs:** The owner resolved the first-deployment prerequisite with a placeholder Production deployment (see the evidence resolution section). `scripts/deploy/preview/vercel.test.ts` and the extended `core.test.ts` prove, against recorded CLI/API shapes, that `deploy` refuses before any Neon call when `VERCEL_ORG_ID` is not a team id, the project id differs, or the project has no Production deployment; that the deployment uses `--target=preview --json` and a `production` or non-`READY` result is refused; and that the team-scoped deployment lookup must match project, target, commit and Preview id. This was local orchestration evidence only; the owner-authorized hosted run and cleanup recorded below completed the contract the same day.
- **2026-09-14 hosted run:** Owner-authorized [run 34840457016](../../docs/agentforge/evidence/2026-09-14-preview-run.md) at `1c8c38c` with Preview id `t22-20260914` passed the project preflight, created `preview-t22-20260914` from durable Development with a 7-day expiry, migrated and seeded it, deployed a `target=null` Preview whose team-scoped lookup matched project, commit and Preview id, and passed the HTTP smoke. Independent verification outside the run: Neon branch identity and expiry, Vercel deployment metadata, untouched Production placeholder, landing and controlled-account sign-in over HTTP, and a real Chromium journey (landing, sign-in, dashboard, list creation). The owner then checked the Preview manually and reported it working.
- **2026-09-14 cleanup and status:** [Run 34845688852](../../docs/agentforge/evidence/2026-09-14-preview-run.md) with `action=cleanup` deleted `preview-t22-20260914` through the identity guard; `development` and `main` were untouched, and the orphaned Vercel Preview deployment was removed. Every required evidence item (isolation, migration, seed, deployment configuration, functional smoke, traceability, cleanup, expiry) now has real Neon/Vercel/browser evidence, so the contract is `verified`. A failed first cleanup dispatch that passed an abbreviated SHA to checkout is recorded as operator error; it touched nothing.

<a id="tst-release-001"></a>

### TST-RELEASE-001 — Protected exact-ref Production release

- **Status:** `verified`
- **Capability:** Production release
- **Evidence layers/modes:** Ref-resolution tests, protected workflow rehearsal, direct migration/deployment evidence, post-deploy smoke
- **Verifies product decisions:** D-009, D-010
- **Verifies technical decisions:** TD-019, TD-025, TD-026, TD-027
- **SPEC:** [3.3 Migration workflow](../output/agent/SPEC.md#33-migration-workflow), [11 Environment and delivery contract](../output/agent/SPEC.md#11-environment-and-delivery-contract), [10.7 Environment and delivery evidence](../output/agent/SPEC.md#107-environment-and-delivery-evidence), [14.8 Delivery boundary](../output/agent/SPEC.md#148-delivery-boundary)
- **Owners:** T-21.5, T-23, T-24
- **Contract:** A manually approved Production workflow accepts a tag or full commit SHA, resolves and records one immutable commit, verifies required CI evidence and the minimum configured Production mail transport for that commit, waits for protected Production approval, runs a reviewed forward migration through the direct Production URL separately from application boot, deploys the same commit, runs post-deployment smoke, and records the migration result, deployment identity, rollback reference, and operator/time metadata without secrets. Production cannot be reset by routine commands, and application rollback never assumes a database down-migration is safe.
- **Required evidence:** Ref-resolution and refusal tests; minimum Production mail adapter/configuration and redacted delivery/health evidence; protected Environment and secret-scope configuration evidence; a controlled non-Production rehearsal where possible; and real Production migration/deployment/smoke evidence only after owner authorization. A rehearsal cannot be presented as Production proof.
- **Dependencies:** TD-026 and TD-027, T-18 guards, durable Development/CI evidence from T-20/T-21, the minimum Production mail foundation from T-21.5, an owner-approved protected Production Neon project/branch, Vercel Production access, and the forward-only migration policy in TD-025.
- **Mail-closeout evidence, 2026-09-16:** The owner-authorized separate Neon Production project was provisioned on 2026-09-14, as recorded in [Production readiness](../../docs/runbooks/production-readiness.md); the protected release workflow is not implemented. T-21.5 has a verified owner domain, [controlled real adapter delivery](../../docs/agentforge/evidence/2026-09-16-resend-domain-delivery.md), and approved protected sender-configuration run `35103297897`. No protected release rehearsal, Production migration/deployment or deployed auth journey was performed. This contract was `specified` at mail closeout and must not be marked `verified` from local, Preview or mail-foundation evidence. The later T-23 preflight below records its current blocker.

T-21.5 protection update, 2026-09-16: [actual GitHub protection and mail configuration](../../docs/agentforge/evidence/2026-09-16-production-mail-protection.md)
now exists and the first approved protected check passed in run `35103297897`. T-21.5 is complete; T-23 release work remains pending.
At that checkpoint TST-RELEASE-001 remained `specified`; TST-AUTH-001/002 retain their existing
verified local lifecycle evidence. No deployed auth or release proof is added.

**T-23 preflight, 2026-09-16 (supersedes the release status above):**
The accepted Neon/Vercel identities and real Sanity read smoke are confirmed.
The authenticated Vercel CLI refused token creation, but the owner subsequently
confirmed browser creation of the project-only token and protected storage.
The distinct Production credentials/settings and signed Sanity webhook are
configured; the complete profile passed validation in the provisioning process.
Status became `in_progress` at prerequisite completion. Actual protected-run validation, executable release
orchestration, migration, deployment and webhook delivery remain outstanding.
See the [preflight evidence](../../docs/agentforge/evidence/2026-09-16-production-release-preflight.md)
and [implementation plan](../../docs/agentforge/plans/2026-09-16-t-23-production-release.md).

**T-23.2 ref/CI evidence, 2026-09-16:** `scripts/deploy/production/ref.ts`
resolves tags through the explicit tag namespace or accepts full SHAs, checks
main ancestry and clean exact checkout, and requires successful main-push
`ci.yml` evidence plus successful Quality/Harness jobs from that run attempt.
The subprocess helper uses no shell and hides raw failure output. The focused
suite passes 29 tests across two files, including a real Git subprocess,
refusal cases and safe process failures; typecheck and changed-file lint pass.
A real read-only Git/GitHub check resolved `ad16b60209863ad36dfcecbb3be6de1fc7569bb8`
and confirmed CI run `35105163127`, attempt 1. Status is now `partial`;
workflow wiring, protected validation, migration/deployment and hosted
browser/webhook evidence remain outstanding. This also adds local ref/CI
boundary evidence to TST-PIPELINE-001 without completing that contract.

The independent ref review found that an `origin/main` tag could shadow the
remote-tracking reference. The resolver now uses `refs/remotes/origin/main`;
a regression test failed before the fix and passes afterward. The initial
T-23.3 core adds 16 tests for guard refusal, observed database correlation,
stage ordering, safe partial failure and preservation of recovery evidence.
That unit did not yet include the provider adapter or protected workflow.

**T-23 implementation/rehearsal evidence, 2026-09-16:** The provider adapter,
CLI, manual protected workflow and recovery runbook now implement the complete
release sequence. The Production suite passes 62 tests and the pipeline suite
passes 235. The real read-only resolver selected `e3ee5c0c63d34f81358243496cafe8777db5f785`
with CI `35107944387`, attempt 1. The installed `drizzle-kit migrate` applied
both committed migrations to disposable local PostgreSQL and produced two
journal entries. Integration passed 23 tests; Chromium, Firefox and WebKit
passed all 24 journeys. A pre-existing Firefox chunk-cancellation diagnostic
was corrected narrowly, with regression coverage retaining API/network failures.
See [implementation evidence](../../docs/agentforge/evidence/2026-09-16-production-release-implementation.md).
TST-RELEASE-001, TST-PIPELINE-001 and TST-ENV-001 remain `partial`: protected
Production profile validation, actual migration/deployment, deployed browser
and real Sanity webhook evidence are still required. This local rehearsal
supplements TST-MIGRATION-001 and browser evidence without changing unrelated
hosted obligations or claiming Production success.

**T-23 live release closeout, 2026-09-16 (supersedes earlier pending-release statements):**
The owner explicitly approved commit `d639dfeeeca2932606c652cf5305ca3e0cd87a89`,
its reviewed forward migrations, protected-job approval and live checks.
Protected runs `35112456687` and `35114013699` passed all release stages.
The first deployed magic-link request failed despite valid configuration shape;
updating the existing protected Resend key and redeploying the same SHA resolved
it. A real message arrived in Gmail Inbox, its original link opened the owner's
private dashboard/Inbox, and sign-out restored the private-route redirect.
The final deployment is `dpl_ERxkjWHpMbQakgKTVM81rPT5KuWf`, READY Production with
matching SHA/project and canonical alias. Read-only catalog inspection confirms
six expected tables and two migration journal entries. The actual signed Sanity
webhook returned HTTP 200 on both deployments after identical-content publishes.
See [live evidence and safe artifacts](../../docs/agentforge/evidence/2026-09-16-production-release-live.md).

`TST-RELEASE-001` is now `verified`. `TST-LANDING-003` is also `verified`: its
existing signature/relevance/authorization/duplicate/service-routing tests are
supplemented by actual deployed delivery, including final attempt
`atm-3JPoK9DYctGZPssOOuAIotTmau8`. Local evidence remains the proof for invalid and
manual-recovery requests; no Production failure injection is claimed.
`TST-MIGRATION-001`, `TST-AUTH-002` and the existing browser contracts retain
their verified status with the additional real boundary evidence above.
`TST-ENV-001` and `TST-PIPELINE-001` remain `partial` pending T-24's final matrix
and evidence reconciliation. T-24 may reuse these runs and T-22's controlled
Preview lifecycle; no additional Production mutation is authorized by this ledger.

**T-24 final reconciliation, 2026-09-16 (supersedes the two partial statuses above):**
The [complete pipeline evidence matrix](../../docs/agentforge/evidence/2026-09-16-pipeline-closeout.md)
maps every SPEC 10.7/11 baseline requirement to its executable and real hosted
proof. The focused `pnpm test:pipeline` run passed 235 tests across 14 files.
PR #39 CI `35115190232` reran the full Quality/Harness gates successfully;
T-23's same-code 24 cross-browser journeys remain applicable. Read-only
provider metadata confirms Production main-only required approval with admin
bypass disabled, separate Environment secret entries, absence of the cleaned-up
Preview branch, matching final Production identity and no Vercel Git link.
The controlled T-22 lifecycle and T-23 releases provide the hosted proof;
injected local failures establish stop/cleanup/partial-record decisions.
No additional hosted mutation, Production failure injection or destructive test
was performed. `TST-ENV-001` and `TST-PIPELINE-001` are now `verified`.
This is checkpoint evidence, not continuous monitoring or a claim about future
provider/configuration changes. All original evidence limits remain intact.

<a id="tst-logging-001"></a>

### TST-LOGGING-001 - Backend event safety and context

- **Status:** `verified`
- **Capability:** Shared backend logging
- **Evidence layers/modes:** Unit, application boundary, local Node/Next output lifecycle
- **Verifies product decisions:** D-009
- **Verifies technical decisions:** TD-015, TD-029
- **Edge cases:** Privacy, concurrent request isolation, repeated failure propagation and output-writer outage are defined in the linked SPEC
- **SPEC:** [Shared backend logging](../output/agent/SPEC.md#shared-backend-logging)
- **Owners:** [T-26.1](../../TODO.md#t-261), [T-26.3](../../TODO.md#t-263)
- **Contract:** Meaningful facade events retain trusted fields, isolated request/job context and safe metadata. Filtering follows the accepted precedence before expensive debug data is constructed. Unexpected propagated failures are reported once; expected auth/validation/domain refusals and generic client results retain their existing meaning. Logging failure never changes the application outcome or replaces its original error.
- **Required evidence:** Focused tests for global off, default/module thresholds, module off and exact event suppression; stable fields and metadata override refusal; concurrent context isolation; privacy sentinels in nested data and error message/cause/stack strings before serialization; serializer/output-writer failure containment; and lazy debug filtering. Adopted boundaries must prove safe failure/outcome events and no duplicate reports. Local Node/Next runtime checks cover JSON/readable output, stdout/stderr severity, request completion and process exit, reconciled with official Vercel lifecycle/severity documentation. This is not deployed-provider delivery proof.
- **Dependencies:** T-26.1 core and T-26.3 adoption; installed Pino/Next documentation and a local runtime for the named lifecycle checks. Actual deployed delivery checks require separate release authorization.
- **Current evidence:** [T-26.1 core evidence, 2026-09-19](../../docs/agentforge/evidence/2026-09-19-logger-core.md) records 30 focused tests for policy precedence, lazy metadata, trusted fields, isolated context, privacy projection and failure containment, including real Node processes for both output formats and console stream failure. [T-26.3 adoption evidence](../../docs/agentforge/evidence/2026-09-19-logger-adoption.md) adds safe caught/rethrown boundary diagnostics, provider-error ownership, expected refusal preservation, idle pool projection and bounded settings transitions. Fresh tests cover 118 focused cases and 479 total unit tests, with passing integration, Chromium, typecheck, lint and build. Two independent local Next processes prove real Pino JSON channels, concurrent server-owned IDs, induced local failure and request completion; the local browser runtime also records readable mailbox outcomes. This completes local obligations, not deployed delivery proof.

<a id="tst-logging-002"></a>

### TST-LOGGING-002 - Shared settings consistency and protected updates

- **Status:** `verified`
- **Capability:** Environment-local logging policy
- **Evidence layers/modes:** Unit, disposable PostgreSQL integration, operator authorization/target refusal checks
- **Verifies product decisions:** D-009
- **Verifies technical decisions:** TD-025, TD-026, TD-029, TD-031
- **Edge cases:** Invalid snapshots, database outage, concurrent refresh/edit races and wrong-environment writes are defined in the linked SPEC and TD-031
- **SPEC:** [Shared backend logging](../output/agent/SPEC.md#shared-backend-logging)
- **Owners:** [T-26.2](../../TODO.md#t-262), [T-26.3](../../TODO.md#t-263)
- **Contract:** Each selected environment owns its settings in its existing application database. Every instance replaces policy only with a fully validated snapshot; existing contextual loggers see current policy. Elapsed-time boundary refresh coalesces concurrent reads and bounds retries, with no log-write queries or reliance on idle background timers. Outage/invalid data preserves last valid policy, or enabled `info` cold-start defaults. The protected TypeScript CLI inspects policy/revision and publishes validated full-policy edits atomically, rejecting stale expected revisions under existing operator access and environment/target guards.
- **Required evidence:** Policy/cache tests with controlled time for freshness, read coalescing, bounded failure retries, cold start, last-valid fallback, old contextual objects, no recursive refresh/logging and no reads from emission. Disposable PostgreSQL tests prove full snapshot persistence, convergence across independent caches, invalid-update refusal, atomicity and concurrent stale-edit rejection. Focused TypeScript CLI/core tests prove inspection, valid updates, invalid-input refusal, unauthorized/wrong-profile/wrong-target refusal before mutation, environment isolation and output without credentials. Include those tests in the existing Vitest discovery and confirm a nonzero test count. The forward migration retains all TST-MIGRATION-001 local and branch-first Neon obligations; local tests do not substitute for that proof.
- **Dependencies:** T-26.1; disposable local PostgreSQL for integration; existing operator credentials and target guards under [TD-031](TECHNICAL.md#td-031); authorized non-default Neon branch for migration proof. CLI implementation and operation still require their named execution prerequisites and authorization.
- **Current evidence:** T-26.2 provides the settings store/cache, runtime composition and protected TypeScript CLI. [Settings evidence](../../docs/agentforge/evidence/2026-09-19-logger-settings.md) records focused cache/CLI checks and real disposable PostgreSQL persistence, independent-instance convergence, revision conflicts, target isolation and timeout cleanup, plus the authorized non-default Neon migration smoke. [T-26.3 adoption evidence](../../docs/agentforge/evidence/2026-09-19-logger-adoption.md) adds real boundary refresh and two separate Next processes adopting global off, re-enabling and exact-event suppression through the same disposable database without restart. All 28 integration tests pass again. Operator inspection still reports persisted state, not universal instance adoption; no hosted settings update was performed by T-26.3.

These original logger contracts retain their stage-specific meaning.
[TD-030](TECHNICAL.md#td-030)'s optional follow-on has separate contracts below.

<a id="tst-diagnostics-001"></a>

### TST-DIAGNOSTICS-001 - Diagnostics routing, privacy and lifecycle

- **Status:** `verified`
- **Capability:** Optional backend application diagnostics
- **Evidence layers/modes:** Unit, disposable PostgreSQL compatibility where needed, local Node/Next lifecycle and application boundaries
- **Verifies product decisions:** D-009
- **Verifies technical decisions:** TD-029, TD-030
- **Edge cases:** Independent destination filtering, settings transition/outage, SDK enrichment, duplicate failures and serverless completion
- **SPEC:** [Diagnostics provider adapters](../output/agent/SPEC.md#diagnostics-provider-adapters)
- **Owners:** [T-26.4](../../TODO.md#t-264), [T-26.6](../../TODO.md#t-266)
- **Contract:** Shared vetoes govern both destinations and explicit reports; console thresholds cannot gate diagnostics. Explicit reports require diagnostics/report enablement independently of log thresholds. Live policy uses the existing environment cache, with conservative legacy/cold defaults and no emission reads. Sanitized log and error payloads retain safe context/grouping without private data. Each unexpected failure has one reporting owner; diagnostics failure cannot alter application results.
- **Required evidence:** Routing matrix covers global/module/event vetoes, each destination's off/default/module log thresholds and explicit report controls independent of log thresholds. Controlled refresh tests cover old contextual objects, no per-event queries, legacy numeric thresholds becoming console-only, disabled remote cold fallback and invalid credential refusal without provider fallback. Privacy sentinels cover nested message/cause/frame inputs, correlation isolation, grouping without occurrence IDs and payload re-allowlisting after SDK enrichment. Boundary tests cover caught/mapped, swallowed, unhandled and reported/rethrown failures, including Next error transformation and expected control-flow exclusions. Local runtime tests prove startup selection, no browser imports/recapture, bounded awaited flush, failure/timeout/quota/overflow containment, unsent-policy drops and no suppressed replay.
- **Dependencies:** Planned logger/settings foundation; installed Next/provider documentation; local Node runtime; disposable PostgreSQL and TST-MIGRATION-001 obligations if snapshot compatibility requires persistence changes. Writer work uses the accepted protected TypeScript CLI in [TD-031](TECHNICAL.md#td-031).
- **Current evidence:** Partial, 2026-09-24 ([T-26.4 evidence](../../docs/agentforge/evidence/2026-09-24-diagnostics-routing.md)). Unit tests prove the routing matrix, legacy/cold transition, old contextual objects without emission reads, startup selection with invalid-credential refusal and no fallback, privacy sentinels for message/cause/frame input including accessor-backed and rewritten messages that imitate frames (residual limit: a message or name changed after the first stack read can go undetected; see the evidence), grouping without occurrence IDs, and dispatcher failure, timeout, oversize and unsent-policy drop containment. Real PostgreSQL proves a legacy row upgrade and atomic destination switching across two cache instances. [T-26.5 evidence](../../docs/agentforge/evidence/2026-09-24-diagnostics-adapters.md) adds payload re-allowlisting after real SDK enrichment and send-time drops of SDK-buffered records. [T-26.6 evidence](../../docs/agentforge/evidence/2026-09-24-diagnostics-adoption.md) completes the local obligations: boundary tests for caught, swallowed, unhandled and reported/rethrown failures (including Next's digest) and control-flow exclusions, plus a two-process local Next runtime proof of startup selection, awaited bounded flush, one report per occurrence, isolated correlations and no client bundle code. Hosted provider behavior belongs to TST-DIAGNOSTICS-002.

<a id="tst-diagnostics-002"></a>

### TST-DIAGNOSTICS-002 - Provider fidelity and hosted diagnostics proof

- **Status:** `partial`
- **Capability:** Sentry and Better Stack adapters
- **Evidence layers/modes:** Local actual-SDK/HTTP wire tests and separately authorized real provider smoke
- **Verifies product decisions:** D-009
- **Verifies technical decisions:** TD-030
- **Edge cases:** Logs versus error-ingestion compatibility, provider payload enrichment, rejection and grouping
- **SPEC:** [Diagnostics provider adapters](../output/agent/SPEC.md#diagnostics-provider-adapters)
- **Owners:** [T-26.5](../../TODO.md#t-265), [T-26.7](../../TODO.md#t-267)
- **Contract:** Each fixed adapter preserves the accepted safe log/error semantics through documented supported interfaces. Only the startup-selected provider exports. Local fidelity and hosted ingestion are separate claims; neither adapter's success proves the other's readiness.
- **Required evidence:** Actual selected SDKs and HTTP adapters send to a controlled local receiver through supported transport configuration. Inspect final wire payloads after enrichment for privacy, severity/event/context mapping, no automatic capture or recapture, independent log/report handling and bounded rejection/timeout/flush behavior. Better Stack evidence exercises its distinct log-ingestion and Sentry-compatible error paths. Separately authorized synthetic hosted smoke for each provider proves searchable logs, safe context, repeated occurrences grouped into one issue and a distinct failure grouped separately, with safe evidence of request completion. Reconcile missing hosted evidence explicitly rather than treating a local receiver as provider proof.
- **Dependencies:** T-26.4 core; installed compatible SDKs and documented transports; T-26.6 runtime adoption before hosted proof; separately authorized provider resources/configuration and any protected deployment needed for T-26.7. No provider provisioning or hosted send is authorized by this ledger.
- **Current evidence:** Partial, 2026-09-24 ([T-26.5 evidence](../../docs/agentforge/evidence/2026-09-24-diagnostics-adapters.md)). Local wire tests run the real `@sentry/core` 11.0.0 client and Better Stack HTTP ingestion against a local collector: final payloads after enrichment carry only allowlisted fields with sensitive sentinels absent, logs and reports travel separately, Better Stack uses distinct log and Sentry-compatible error paths, SDK-buffered records disallowed by refreshed policy are dropped at send time, and 401/402/403/413/429/5xx, hanging requests and overflow are bounded and contained. Hosted ingestion, searchable logs and issue grouping on each real provider remain T-26.7.

<a id="tst-alerts-001"></a>

### TST-ALERTS-001 — Independent operational notification boundary

- **Status:** `partial`
- **Capability:** Operational alerts
- **Evidence layers/modes:** Port/adapter contract, integration, controlled external outage evidence
- **Verifies product decisions:** D-012
- **Verifies technical decisions:** TD-030, TD-033
- **SPEC:** [Operational alert delivery boundary](../output/agent/SPEC.md#operational-alerts)
- **Owners:** T-26.11–T-26.14 under [T-26](../../TODO.md#t-26-add-runtime-safety-and-observability-hardening)
- **Contract:** [TD-033](TECHNICAL.md#td-033) and SPEC own the accepted three-path arrangement: Better Stack native Production uptime Email, Sentry Free native new/regressed-group Email, and a reusable NotificationPort with a workflow-side Resend Email adapter for failed Production releases. The two native paths stay outside the port. Preserve the complete native timing/component policy, provider-neutral health logic, safe payloads and one incident/notification owner. Keep both diagnostics adapters/startup selection. Release delivery has no app/database/auth-mail-admission dependency, no custom incident queue/state machine, and cannot hide the original release failure.
- **Required evidence:** Prove the Production-only native policy with real authorized external evidence: distinguish app/database/CMS failure, record detection/confirmation/recovery and Email timestamps, reset unstable recovery, and verify one opening/recovery Email with no repeats or duplicate application alerts. A CMS failure is not total downtime and confirmation is not an onset-to-alert deadline. Prove Sentry new-group and resolved-then-regressed Email, no per-occurrence repeats or expected-error/warning alerts, and no overlapping Issue Workflow/issue-alert notifications. Local mocks/log ingestion cannot establish native delivery or free-account entitlement.
- **Release port/adapter evidence:** Exercise migration, deployment and final-verification failures from trusted workflow outcomes and sanitized release records, including missing-record fallback. Inspect actual Resend HTTP payloads against a local collector, same-key/same-payload retries, distinct workflow attempts, the 24-hour idempotency limit, timeout/refusal/invalid responses, secret/recipient redaction and preservation of the original nonzero release result. Prove no database/auth imports or live-app calls are required. Separately authorized real Resend acceptance and receipt, using the protected runner, remain required; HTTP acceptance alone is not mailbox proof.
- **Dependencies:** Accepted plans and task breakdown; installed dependencies and local harness where named; protected account/project access, sender/recipient/secret configuration and explicit hosted verification authorization. Recipient configuration is not an open product decision. Recheck current free-tier eligibility/quotas at setup; no paid upgrade is authorized.
- **Current evidence:** T-26.11 [release-failure Email evidence](../../docs/agentforge/evidence/2026-09-24-release-failure-email.md) covers the local release path: trusted-record decisions for migration/deployment/smoke failures, no alert on success or preflight-only refusal, unknown-stage fallback for absent/invalid/foreign records, actual Resend-compatible HTTP against a local collector (payload, stable idempotency key and identical retries, new key per attempt, 409/429/500/502/503/504/timeout retries, refusals, invalid responses), secret/recipient redaction, the runner command's exit behavior, no app/database/auth imports and the workflow's release-step-only condition. No real mail was sent; native uptime/Sentry paths and real receipt remain for T-26.12–T-26.14.
- **Follow-up:** Implement T-26.11's local release path, then T-26.12 uptime, T-26.13 Sentry and T-26.14 protected release-Email evidence. Reconcile partial versus complete proof without reopening accepted policy or claiming hosted readiness from local tests.

<a id="tst-runtime-001"></a>

### TST-RUNTIME-001 — Runtime target, health and release identity

- **Status:** `partial`
- **Capability:** Runtime safety and operational readiness
- **Evidence layers/modes:** Configuration/unit, real local PostgreSQL integration, isolated Next runtime, pipeline adapter and authorized deployed smoke
- **Verifies product decisions:** D-012
- **Verifies technical decisions:** TD-026, TD-033, TD-035
- **SPEC:** [Runtime target safety and dependency health](../output/agent/SPEC.md#runtime-health-safety)
- **Owners:** T-26.8–T-26.10, with deployed evidence reconciled in T-26.12
- **Contract:** Runtime validation refuses unsafe target/profile/origin/dataset/mail combinations before client creation while accepting runtime-only Production configuration without migration/admin credentials. No network work occurs at import/build. Provider-neutral bounded app/database/CMS health distinguishes failures, checks fresh published CMS content, protects remote dependency probes and exposes only safe status/release identity. Delivery compares actual runtime SHA/readiness with the intended deployment while retaining provider project/ref/alias guards.
- **Required evidence:** Pure rule/input-boundary tests; real local PostgreSQL success/failure/acquisition/query timeout and connection-release evidence; controlled HTTP CMS success/failure/timeout and cache-bypass checks; real isolated Next endpoint/refusal behavior; sanitized mismatch/secret sentinels; adapter tests for wrong SHA and failed readiness; authorized deployed target/probe evidence. A timeout must bound actual work and resources. Missing monitor settings are not successful readiness. CMS-only degradation is not total-app failure.
- **Dependencies:** Accepted runtime plan and task prerequisites; Docker/browser prerequisites for named local checks; explicit target/configuration/release authorization for hosted evidence.
- **Current evidence:** T-26.8 [runtime validation evidence](../../docs/agentforge/evidence/2026-09-24-runtime-target-validation.md) covers the local configuration portion: shared pure rules, runtime-only Production inputs, Preview-assigned origin, refusal codes and secret sentinels, refusal before client construction and a real `next start` refusal. T-26.9 [health evidence](../../docs/agentforge/evidence/2026-09-24-dependency-health.md) covers bounded real-PostgreSQL success/failure/acquisition/query-timeout with connection release and server-side cancellation, controlled-HTTP CMS success/invalid/failure/timeout with request abort and cache bypass, and real `next start` refusal/unconfigured/unreachable responses without leaks. T-26.10 [release smoke evidence](../../docs/agentforge/evidence/2026-09-24-release-smoke.md) covers delivery-supplied release/endpoint/monitor identity, wrong-SHA and failed/refused/timed-out readiness refusal over controlled HTTP, and fail-closed secret checks for both adapters. Deployed evidence remains outstanding (T-26.12). Existing `TST-ENV-001`, pipeline/release and published CMS evidence do not verify the new runtime extension.
- **Follow-up:** T-26.8–T-26.10 are implemented locally; reconcile separately authorized deployed evidence without changing historical verified statuses.

## SPEC traceability map

The Agent SPEC remains the technical contract and this ledger owns the individual test obligations. The current mapping is:

| SPEC area                                              | Test contracts                                                                                          |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| Auth and session rules                                 | `TST-AUTH-001`–`TST-AUTH-006`                                                                           |
| Data model, migrations, indexes, and connections       | `TST-FOUNDATION-001`, `TST-MIGRATION-001`, `TST-HARNESS-001`, `TST-PERSISTENCE-001`                     |
| Domain rules and application use cases                 | `TST-LISTS-001`–`TST-LISTS-003`, `TST-TASKS-001`–`TST-TASKS-003`, `TST-CONCURRENCY-001`                 |
| Sanity landing and editorial preview                   | `TST-LANDING-001`–`TST-LANDING-004`                                                                     |
| HTTP, Server Actions, and Zod validation               | `TST-BOUNDARY-001`, with capability contracts below it                                                  |
| UI and presentation boundary                           | `TST-UI-001`, `TST-E2E-001`–`TST-E2E-003`                                                               |
| Testing, migration, and performance requirements       | `TST-MIGRATION-001`, `TST-HARNESS-001`, `TST-PERFORMANCE-001`, plus the applicable capability contracts |
| Environment profiles and target safety                 | `TST-ENV-001`                                                                                           |
| CI, Preview, and Production delivery                   | `TST-PIPELINE-001`, `TST-PREVIEW-001`, `TST-RELEASE-001`                                                |
| Shared backend logging and settings                    | `TST-LOGGING-001`, `TST-LOGGING-002`                                                                    |
| Optional application diagnostics                       | `TST-DIAGNOSTICS-001`, `TST-DIAGNOSTICS-002`                                                            |
| Runtime target, dependency health and release identity | `TST-RUNTIME-001`, preserving `TST-ENV-001` and delivery baseline evidence                              |
| Operational notification ownership and delivery        | `TST-ALERTS-001`                                                                                        |

When a SPEC behavior changes, update the owning Product or Technical Decision first when necessary, then update its linked `TST-*` contract and affected delivery tasks. Do not silently alter a contract only in `TODO.md` or in a test file.

SPEC sections 11.3 and 11.4 distinguish operational alerts from runtime health;
their extension contracts remain `specified` until the required evidence exists.
