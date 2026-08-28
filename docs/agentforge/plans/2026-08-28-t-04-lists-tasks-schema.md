# T-04 lists and tasks schema implementation plan

> AgentForge plan. This plan is accepted for the resumed T-04 task; `task-breakdown` reconciles its delivery metadata before implementation.

**Status:** Accepted

**Goal:** Add the PostgreSQL/Drizzle lists and tasks persistence schema, a reviewed versioned migration, and honest real-database evidence for the required constraints and query-shaped indexes without changing the applied scaffold migration.

**Spec and decisions:** [Agent SPEC, data model and migration workflow](../../.dwf/output/agent/SPEC.md#3-data-model-postgres), [required indexes and constraints](../../.dwf/output/agent/SPEC.md#34-required-indexes-and-constraints), [TD-005](../../.dwf/decisions/TECHNICAL.md#td-005), [TD-010](../../.dwf/decisions/TECHNICAL.md#td-010), [TD-013](../../.dwf/decisions/TECHNICAL.md#td-013), [TD-014](../../.dwf/decisions/TECHNICAL.md#td-014), [TST-MIGRATION-001](../../.dwf/decisions/TESTING.md#tst-migration-001), and [TST-PERSISTENCE-001](../../.dwf/decisions/TESTING.md#tst-persistence-001).

**Architecture:** Keep the root `db/` and `migrations/` seats authoritative for persistence. Define `listsTable` and `tasksTable` in separate schema modules, with text identifiers compatible with Better Auth's existing text user IDs, PostgreSQL timestamp-with-time-zone columns mapped to JavaScript `Date`, a native `task_status` enum defaulting to `todo`, and nullable task notes. Lists reference `users` with cascade deletion; tasks reference both `users` and `lists`, with the list foreign key cascading to tasks. Use functional PostgreSQL B-tree unique indexes on `(user_id, lower(name))` and `(list_id, lower(title))` so display text is preserved while uniqueness is enforced after case folding. Add explicit B-tree cursor indexes on `(user_id, created_at ASC, id ASC)` for lists and `(user_id, list_id, created_at DESC, id DESC)` for tasks. Export the active schema through `db/schema/index.ts` and `db/index.ts`; point Drizzle Kit at that explicit entry so the dormant historical `db/schema/test.ts` posts example is not part of newly generated migrations.

**Global constraints:** Do not edit `migrations/20260807190126_silly_vivisector/`. Do not add list/task use cases, repositories, actions, routes, UI, or the T-14 Testcontainers harness in this task. Keep the legacy `test.ts` file present but inactive rather than deleting it. Use one schema source for Neon and local PostgreSQL. Keep secrets out of source, logs, migration evidence, and commits.

## Current state and file map

- `db/schema/auth.ts` owns the Better Auth tables and remains unchanged except where an explicit schema barrel must re-export it.
- `db/schema/test.ts` contains the scaffold `postsTable`; it is not an active export target after this task and its historical table remains in the applied migration.
- `db/index.ts` currently exports the scaffold schema and must switch to the active schema barrel.
- `drizzle.config.ts` currently scans the whole schema directory; it must target `db/schema/index.ts` so inactive examples cannot enter future migrations.
- `migrations/20260807190126_silly_vivisector/` is the applied baseline and is immutable for this task.
- `migrations/<new-version>/migration.sql` and its Drizzle snapshot are the reviewed transition adding the enum, tables, foreign keys, unique functional indexes, and cursor indexes.
- `src/db/schema.integration.test.ts` will use the existing local-only `TEST_DATABASE_URL` contract and an isolated temporary PostgreSQL schema to apply the complete migration chain and prove table shape, foreign keys, uniqueness, cascade deletion, and index definitions. It must refuse non-local URLs before any setup or cleanup. Full PostgreSQL 18 Testcontainers lifecycle evidence remains owned by T-14 and is recorded as deferred/blocked rather than represented by this local-schema test.

## Dependencies and work order

1. Confirm the synchronized `main` branch, the existing non-default Neon `development` branch, Docker availability, and the local-only integration URL boundary (complete during preflight).
2. Add the active schema modules/barrel and Drizzle config boundary; run typecheck and schema generation to expose API or naming mistakes.
3. Generate and inspect the new versioned migration. Verify it contains no edits to the existing migration and no `posts_table` recreation in the new transition.
4. Add the focused local PostgreSQL integration test first for the available evidence, then run it against a disposable local database/schema. Keep the test serial and isolated; do not add a second application pool.
5. Apply the complete migration chain plus the new migration to the Neon `development` branch using the direct migration URL, inspect the resulting table/index/constraint catalog, and record hosted evidence without touching the default branch.
6. Reconcile the two affected `TST-*` contracts and T-04 metadata, run the proportionate quality gates, review the diff, commit, push, and open the PR.

## Verification strategy

- **TST-MIGRATION-001:** Run the complete migration chain against a disposable local PostgreSQL database/schema and the reviewed migration against the non-default Neon `development` branch. Mark the locally available migration evidence `partial` until T-14 supplies the required PostgreSQL 18 Testcontainers harness; record the exact unblock condition and follow-up instead of claiming Testcontainer coverage.
- **TST-PERSISTENCE-001:** The focused integration test asserts the real PostgreSQL table columns/types/nullability/defaults, native status values, owner/list foreign keys, `ON DELETE CASCADE`, case-insensitive unique indexes, and required cursor-index column order/direction. Repository mapping, bounded cursor query behavior, and concurrent application operations remain partial/future evidence for T-06, T-07, and T-14.
- Focused commands: `pnpm exec drizzle-kit generate --name lists-tasks-schema` (or the repository-equivalent name), `pnpm test:integration -- ...` with a local `TEST_DATABASE_URL`, `pnpm exec drizzle-kit migrate` against the Neon development branch, `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `git diff --check`.
- Catalog checks use PostgreSQL system catalogs (`pg_constraint`, `pg_indexes`, `information_schema`) and behavior probes rather than Drizzle implementation-detail assertions. No test cleanup may accept a Neon or other external URL.
- Docker is available, but the repository has no `@testcontainers/postgresql` dependency or T-14 harness yet. The plan deliberately preserves that required future evidence rather than silently substituting a weaker test.

## Risks and assumptions

- **Identifiers:** text primary/foreign keys are chosen because Better Auth's current `users.id` is text and the SPEC permits uuid/text; application tasks can still use UUID-formatted strings.
- **Time:** timestamp-with-time-zone columns honor the SPEC's `timestamptz` model and Drizzle's `Date` mapping; this is equivalent at the application boundary even though existing Better Auth tables use the older timestamp form.
- **Status:** a native PostgreSQL enum gives the database a durable allowed-value constraint; the application still owns transition semantics in later tasks.
- **Case folding:** `lower(...)` functional unique indexes are the documented PostgreSQL/Drizzle mechanism and preserve the original display value. The application must trim before insert/update in later tasks.
- **Migration generation:** Drizzle Kit may produce a snapshot representation that includes the explicit barrel's exports; inspect and adjust only generated new files if necessary. Never hand-edit the applied baseline migration.
- **Open evidence boundary:** T-04 can prove real PostgreSQL behavior now only through the existing local integration URL and Neon development branch. PostgreSQL 18 Testcontainers proof, full repository mappings, concurrent Inbox behavior, and bounded query execution resume in T-14/T-06/T-07.

## Handoff to task breakdown

Turn this plan into one T-04 delivery task with the following independently verifiable slices: (a) active schema/config barrel, (b) generated migration review, and (c) focused real-PostgreSQL constraint/index evidence. Keep the task's acceptance criteria and verification explicit, add the missing **Recommended AgentForge skills** subsection, and reference `TST-MIGRATION-001` and `TST-PERSISTENCE-001` with their partial/future evidence boundaries. Do not add implementation tasks for T-14's reusable Testcontainers harness or later list/task application behavior.
