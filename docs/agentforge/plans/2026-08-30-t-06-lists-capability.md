# T-06 lists capability implementation plan

> AgentForge plan. Use `task-breakdown` after this plan is accepted.

**Status:** Accepted

**Goal:** Implement the framework-independent lists domain, application use cases, and ownership-aware PostgreSQL repository with an atomic default Inbox and deterministic cursor reads.

**Spec and decisions:** [Agent SPEC §4.1 and §4.4](../../.dwf/output/agent/SPEC.md#4-domain-rules), [Agent SPEC §5 Lists](../../.dwf/output/agent/SPEC.md#lists), [Agent SPEC §14.2 and §14.4](../../.dwf/output/agent/SPEC.md#142-persistence-boundary), [List Lifecycle](../../docs/domain/list-lifecycle.md), [D-003](../../.dwf/decisions/PRODUCT.md#d-003), [TD-005](../../.dwf/decisions/TECHNICAL.md#td-005), [TD-006](../../.dwf/decisions/TECHNICAL.md#td-006), [TD-008](../../.dwf/decisions/TECHNICAL.md#td-008), [TD-010](../../.dwf/decisions/TECHNICAL.md#td-010), [TST-LISTS-001](../../.dwf/decisions/TESTING.md#tst-lists-001), [TST-LISTS-002](../../.dwf/decisions/TESTING.md#tst-lists-002), [TST-LISTS-003](../../.dwf/decisions/TESTING.md#tst-lists-003), and [TST-CONCURRENCY-001](../../.dwf/decisions/TESTING.md#tst-concurrency-001).

**Architecture:** Keep list business rules independent of Next.js and Drizzle. The lists domain owns the plain `List` model, name normalization, and page/outcome types. The application layer owns repository ports and use cases (`ensureDefaultInbox`, `listLists`, `createList`, `renameList`, and `deleteList`) and validates names/page requests before calling a port. The infrastructure adapter owns Drizzle row mapping, owner-scoped predicates, the query-shaped cursor SQL, unique-conflict translation, and the atomic `INSERT ... ON CONFLICT DO NOTHING` Inbox race. A small opaque cursor codec carries only the settled list position and an authenticated read scope; every repository query still supplies the server-provided user id independently. No Route Handlers, Server Actions, UI, task behavior, or schema migration changes belong in T-06.

**Global constraints:** Preserve native PostgreSQL UUID/`uuidv7()` database defaults and text Better Auth owner foreign keys. Use the existing `lists` schema and current pooled Drizzle runtime; do not add a second database implementation or migration. Names are trimmed and 1–80 characters, uniqueness remains database-enforced case-insensitively, list reads are oldest-first with `createdAt`/`id` tie-breaking, pages fetch at most `limit + 1`, limits default to 20 and cap at 100, and private missing/other-owned resources produce one application-level not-found outcome. Integration setup may use the existing disposable local PostgreSQL lane; the reusable Testcontainers evidence remains owned by T-14.

## Current state and file map

- `db/schema/lists.ts` already defines native UUID list ids, owner FKs, the case-insensitive name index, and the oldest-first cursor index. `db/schema/tasks.ts` provides the cascade relationship that list deletion must exercise.
- `db/db.ts` and `db/pool.ts` provide the shared node-postgres/Drizzle runtime. `src/db/schema.integration.test.ts` provides the current local migration/schema setup pattern and existing cascade/index evidence.
- `src/modules/landing` demonstrates the repository-port/application/infrastructure separation, but no list capability exists yet.
- New `src/modules/lists/domain/` files will own the list model and normalization/page primitives.
- New `src/modules/lists/application/` files will own `ListRepository`, use cases, validation/outcome errors, and the list cursor contract consumed by the repository.
- New `src/modules/lists/infrastructure/` files will implement the Drizzle repository and focused unit/integration tests without leaking row types to application code.

## Dependencies and work order

1. Add T-06 plan/task metadata and mark the task in progress after confirming the local PostgreSQL prerequisite.
2. Use `testing-first-class` to reconcile the four affected contracts, then write database-free domain/application tests for normalization, page validation, ownership outcomes, Inbox lifecycle, and cursor context rules; confirm the intended failures.
3. Implement the smallest domain/application ports and use cases until the fake-repository suite is green.
4. Implement the Drizzle adapter, including generated UUID inserts, owner predicates, case-insensitive conflict mapping, bounded cursor queries, and an `ON CONFLICT DO NOTHING`/read-back Inbox path that is safe under concurrent listless loads.
5. Add local PostgreSQL integration coverage for migration-backed repository mappings, duplicate names, owner isolation, oldest-first cursor pages, final-list deletion/cascade, and concurrent Inbox creation. Keep task tables as fixture data only; do not implement T-07.
6. Reconcile evidence, run project gates, update the PR metadata, and send the complete task through the required fresh GPT-5.6-Sol pragmatic review loop.

## Verification strategy

- `TST-LISTS-001`: unit/application tests prove exactly one ordinary Inbox outcome, rename/delete behavior, and repeated listless loads; local PostgreSQL tests run concurrent `ensureDefaultInbox` calls and verify one row, with T-14 retaining the reusable-harness obligation.
- `TST-LISTS-002`: domain/application tests prove trimming and 1–80 validation, owner-scoped not-found behavior, and conflict outcomes; PostgreSQL tests prove the real unique index and list deletion cascade to tasks.
- `TST-LISTS-003`: application/repository tests prove default and boundary limits, oldest-first deterministic pages, opaque context-bound cursors, `limit + 1` bounded reads, malformed/cross-user cursor rejection, and null terminal cursors. Boundary/UI evidence remains with T-08/T-10.
- `TST-CONCURRENCY-001`: application tests use realistic concurrent fake operations where useful; PostgreSQL tests prove concurrent Inbox creation does not duplicate and that accepted list writes retain last-successful-write semantics. Task-side evidence remains with T-07/T-14.
- Focused commands: the relevant Vitest unit file and `TEST_DATABASE_URL=<local PostgreSQL URL> pnpm test:integration -- <lists integration file>` during the loop. Completion gates: `pnpm test`, `TEST_DATABASE_URL=<local PostgreSQL URL> pnpm test:integration`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm exec drizzle-kit check --config drizzle.config.ts`, `pnpm exec drizzle-kit generate --config drizzle.config.ts --explain --output text`, and `git diff --check`. Report the existing `app/layout.tsx` Geist warning separately.

## Risks and assumptions

- A conflict-free Inbox insert must not rely on catching a Postgres unique exception inside an aborted transaction. Use `ON CONFLICT DO NOTHING` and read back the committed Inbox; retry a narrowly scoped read-back race if a concurrent final-list deletion leaves no row.
- Cursor bytes are opaque to callers, but decoding must reject malformed data, wrong version, wrong scope, invalid UUID/position values, and non-finite timestamps before constructing SQL predicates. The authenticated `userId` remains an independent equality predicate.
- The current integration lane is a disposable local PostgreSQL 18 container, not the future T-14 Testcontainers harness. Preserve `TST-MIGRATION-001`, `TST-HARNESS-001`, and hosted evidence limits instead of overstating T-06 coverage.
- Unique-conflict and not-found mappings must remain stable for the later T-08/T-09 adapters; do not add HTTP response or UI abstractions here.

## Handoff to task breakdown

This plan maps to one vertical delivery task, T-06. Task breakdown should preserve the four affected contracts, identify the domain/application and repository test files, require the existing local PostgreSQL prerequisite, keep T-07/T-08/T-09/UI explicitly out of scope, and include the AgentForge sequence `testing-first-class` → `test-driven-development` → incremental implementation → verification/review.
