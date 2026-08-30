# T-07 tasks capability implementation plan

> AgentForge plan. Use `task-breakdown` after this plan is accepted.

**Status:** Accepted

**Goal:** Implement the framework-independent task domain/application boundary and ownership-aware PostgreSQL repository for task lifecycle, filtering, pagination, and concurrent edits.

**Spec and decisions:** [Agent SPEC §3.2, §4.2–4.5, §5 Tasks, and §14.9](../../.dwf/output/agent/SPEC.md#32-tasks), [Task Lifecycle](../../docs/domain/task-lifecycle.md), [D-004](../../.dwf/decisions/PRODUCT.md#d-004), [D-007](../../.dwf/decisions/PRODUCT.md#d-007), [TD-005](../../.dwf/decisions/TECHNICAL.md#td-005), [TD-006](../../.dwf/decisions/TECHNICAL.md#td-006), [TD-008](../../.dwf/decisions/TECHNICAL.md#td-008), [TD-010](../../.dwf/decisions/TECHNICAL.md#td-010), [TST-TASKS-001](../../.dwf/decisions/TESTING.md#tst-tasks-001), [TST-TASKS-002](../../.dwf/decisions/TESTING.md#tst-tasks-002), [TST-TASKS-003](../../.dwf/decisions/TESTING.md#tst-tasks-003), and [TST-CONCURRENCY-001](../../.dwf/decisions/TESTING.md#tst-concurrency-001).

**Architecture:** Keep task business rules independent of Next.js and Drizzle. The task domain owns the plain `Task` model, `TaskStatus`, title/notes/status normalization, and task outcomes. The application layer owns the `TaskRepository` port and use cases (`listTasks`, `createTask`, `updateTask`, and `deleteTask`), validates every input, preserves omitted-versus-explicit patch fields, and maps an unavailable or foreign-owned list/task to one privacy-preserving not-found outcome. The infrastructure adapter owns Drizzle row mapping, owner/list predicates, the newest-first cursor SQL, completed-task filtering, unique-conflict translation, and database-generated UUID inserts. Its list insert path must verify that `listId` belongs to `userId` and map a concurrent list-removal foreign-key failure to not-found. No Route Handlers, Server Actions, UI, migration, or task-to-list movement belongs in T-07.

**Global constraints:** Preserve PostgreSQL native UUID/`uuidv7()` task IDs, text Better Auth owner FKs, the existing `tasks` schema, native `task_status` enum, case-insensitive per-list title uniqueness, and list-delete cascade. Use the existing pooled node-postgres/Drizzle runtime and one repository implementation for local PostgreSQL and Neon. Task reads are scoped by both `userId` and `listId`, include completed tasks by default, optionally exclude `done` without changing relative order, order by `createdAt DESC` then `id DESC`, fetch at most `limit + 1`, and use context-bound opaque cursors. Follow the accepted TD-024 database-generated-ID decision and the established T-06 port convention; the generated SPEC boundary sketch's explicit `id` insert field is not added to the application input.

## Current state and file map

- `db/schema/tasks.ts` already defines native UUID task IDs, the `task_status` enum, nullable notes, owner/list FKs, the case-insensitive title index, and the equality-scope/newest-first cursor index.
- `db/schema/lists.ts`, `src/modules/lists/application/list-cursor.ts`, and `src/modules/lists/infrastructure/drizzle-list-repository.ts` establish list ownership, cursor, row-mapping, and integration-test conventions to mirror without importing list infrastructure into task domain/application code.
- `db/db.ts` and `db/pool.ts` provide the shared node-postgres/Drizzle runtime. The existing local integration suites apply the complete consolidated migration chain to a unique schema and clean up only their disposable schema.
- New `src/modules/tasks/domain/` files own the task model, status, normalization, and errors. New `src/modules/tasks/application/` files own the repository port, cursor codec, and use cases. New `src/modules/tasks/infrastructure/` files implement the Drizzle repository and migration-backed integration tests. `src/modules/tasks/index.ts` exports only the application-facing surface.

## Dependencies and work order

1. Confirm the local PostgreSQL prerequisite and reconcile TST-TASKS-001/002/003 plus the task-side portion of TST-CONCURRENCY-001 with `testing-first-class`.
2. Write database-free domain/application tests first for title and notes normalization, status validity and direct transitions, omitted-versus-cleared notes, owner/list forwarding, not-found and conflict outcomes, completed filtering defaults, and patch semantics; observe intended failures.
3. Implement the smallest task domain/application port and use cases until the fake-repository suite is green.
4. Add cursor encoding/decoding and the Drizzle adapter with owner/list membership predicates, database-generated IDs, unique/FK error mapping, newest-first bounded pages, completed filtering, and partial update SQL that changes only submitted fields.
5. Add local PostgreSQL integration coverage for ownership/privacy, list membership, duplicate titles, notes/status mappings, same-timestamp cursor tie-breaking and filtering, list cascade deletion, and controlled same-field/disjoint-field concurrent edits. Keep list behavior as an existing dependency; do not add routes or UI.
6. Reconcile evidence, run project gates, update the PR metadata, and send the complete task through the required fresh GPT-5.6-Sol pragmatic review loop.

## Verification strategy

- `TST-TASKS-001`: unit/application tests prove title and notes normalization, status domain, direct/repeated transitions, and patch semantics; boundary evidence remains with T-09.
- `TST-TASKS-002`: PostgreSQL tests prove owner/list membership, privacy-preserving not-found results, per-list case-insensitive uniqueness, row mappings, and list-to-task cascade; boundary and reusable-harness evidence remain with T-09/T-14.
- `TST-TASKS-003`: application/repository tests prove default `includeCompleted: true`, explicit filtering with stable relative order, newest-first `createdAt`/`id` pages, opaque context-bound cursors, malformed/foreign-context rejection, terminal cursors, and `limit + 1` bounds; shared boundary/UI/harness evidence remains with T-08/T-10/T-14.
- `TST-CONCURRENCY-001`: unit tests exercise concurrent task patch calls where useful; PostgreSQL tests control commit order for same-field last-successful-write behavior and verify disjoint submitted fields remain intact. The reusable T-14 harness retains its lifecycle evidence.
- Focused commands: the task unit files and `TEST_DATABASE_URL=<local PostgreSQL URL> pnpm test:integration -- <task integration file>`. Completion gates are `pnpm test`, `TEST_DATABASE_URL=<local PostgreSQL URL> pnpm test:integration`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm exec drizzle-kit check --config drizzle.config.ts`, `pnpm exec drizzle-kit generate --config drizzle.config.ts --explain --output text`, and `git diff --check`. Report the existing `app/layout.tsx` Geist warning separately.

## Risks and assumptions

- Task creation must never accept a `listId` owned by another user. Use an ownership-aware list predicate at the repository boundary, not a caller-provided owner check alone; map missing/foreign lists to `list_not_found`/the application not-found outcome.
- Update SQL must distinguish omitted properties from explicit `null` notes and must not overwrite unrelated fields. Use a dynamic Drizzle update set containing only supplied fields plus `updatedAt`.
- The task cursor carries only settled position, user/list scope, and the completed-filter context; the authenticated `userId`, `listId`, and `includeCompleted` remain independent query predicates. Reject malformed, wrong-scope, wrong-filter, and invalid-position cursors before SQL.
- PostgreSQL's row lock on same-task updates provides last-commit ordering. Integration tests must control commit order rather than accept either final value.
- The current integration lane is disposable local PostgreSQL 18, not the future T-14 Testcontainers harness. Preserve honest `partial` contract status and do not add migrations because T-07 consumes the existing schema.

## Handoff to task breakdown

This plan maps to one vertical delivery task, T-07. Task breakdown should preserve the three task contracts and the task-side concurrency obligation, identify domain/application, cursor, repository, unit, and integration files, require the existing local PostgreSQL prerequisite, keep T-08/T-09/UI/T-14 explicitly out of scope, and include the AgentForge sequence `testing-first-class` → `test-driven-development` → incremental implementation → verification/review.
