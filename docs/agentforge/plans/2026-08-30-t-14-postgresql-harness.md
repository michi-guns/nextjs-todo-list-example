# T-14 PostgreSQL integration harness implementation plan

> AgentForge plan. Use `task-breakdown` after this plan is accepted.

**Status:** Accepted

**Goal:** Make `pnpm test:integration` own one disposable PostgreSQL 18 Testcontainer per suite, apply the committed migration chain, expose its local connection only to integration tests, and tear it down safely.

**Spec and decisions:** [Agent SPEC §10.2 PostgreSQL integration](../../.dwf/output/agent/SPEC.md#102-postgresql-integration) and [§10.6 local quality](../../.dwf/output/agent/SPEC.md#106-local-quality); [TD-013](../../.dwf/decisions/TECHNICAL.md#td-013), [TD-014](../../.dwf/decisions/TECHNICAL.md#td-014), and [TD-019](../../.dwf/decisions/TECHNICAL.md#td-019); [TST-HARNESS-001](../../.dwf/decisions/TESTING.md#tst-harness-001), [TST-MIGRATION-001](../../.dwf/decisions/TESTING.md#tst-migration-001), and [TST-PERSISTENCE-001](../../.dwf/decisions/TESTING.md#tst-persistence-001); [PostgreSQL and Drizzle](../../docs/data/postgresql.md) and [Testing Strategy](../../docs/architecture/testing-strategy.md).

**Architecture:** Add the official `@testcontainers/postgresql` dev dependency at the current compatible major and use `postgres:18-alpine`. A Vitest `globalSetup` starts one `PostgreSqlContainer`, applies every versioned `migration.sql` to its empty database, provides the generated local URI through Vitest's serializable injection context, and stops the container from both migration-failure and suite-teardown paths. A setup file places the injected URI in the existing `TEST_DATABASE_URL` seam so current integration files can retain their isolated-schema behavior while moving off developer- or Neon-provided databases. Keep the local URL guard and migration loader in a small reusable harness module; do not put container imports in application code.

**Global constraints:** Routine unit tests remain Docker-free. Integration tests run serially with `fileParallelism: false` and no external database credentials. The harness must reject non-local or non-PostgreSQL URLs before destructive schema cleanup, create no production or Neon state, preserve the committed migration chain unchanged, and avoid logging connection credentials. Existing test files continue to own unique users/data and may create isolated schemas on the one harness container; no behavior assertions or product code are broadened.

## Current state and file map

- `vitest.integration.config.ts` only selects `*.integration.test.ts`; no global setup or Docker lifecycle exists.
- Every integration file requires an externally supplied `TEST_DATABASE_URL`, creates a unique schema, applies the migration SQL, and drops that schema in `afterAll`.
- The local disposable PostgreSQL 18 container is available for preflight, but `@testcontainers/postgresql` is not installed yet.
- `migrations/` contains the consolidated two-directory chain consumed by T-04/T-06/T-07/T-08 and must remain unchanged.
- Planned ownership: `src/test/postgres-harness.ts` owns local-URL validation, migration loading/application, and container startup; `src/test/postgres-global-setup.ts` owns Vitest lifecycle/provisioning; `src/test/postgres-test-setup.ts` bridges the injected URI to existing tests; `vitest.integration.config.ts` wires serial execution; harness unit/integration tests prove guards, migration visibility, and isolation.

## Dependencies and work order

1. Add the dev dependency and confirm its PostgreSQL 18 API against the installed package/source and Docker daemon.
2. Add pure harness helpers and failing tests for local URL refusal, migration statement loading, injected connection setup, and safe cleanup boundaries.
3. Wire global setup/teardown and serial Vitest execution; run the existing suite without `TEST_DATABASE_URL` to prove the harness owns the database.
4. Add a small harness-owned integration check for migration visibility and isolated schema state, then keep existing repository/auth/schema suites green against the same container.
5. Reconcile the harness, migration, persistence, and affected list/task test contracts; update README/TODO evidence and the temporary run checkpoint after fresh review.

## Verification strategy

- `TST-HARNESS-001`: unit tests reject external URLs and validate deterministic harness boundaries; the integration run proves Docker-backed startup, one shared suite container, migration application, serial execution, isolated schema behavior, and teardown code paths. Full failure-injection coverage remains partial if it requires stopping a live container mid-suite; record that honestly.
- `TST-MIGRATION-001`: the global setup applies the complete versioned chain to an empty PostgreSQL 18 container, and the harness integration check inspects the expected migrated catalog without changing Neon.
- `TST-PERSISTENCE-001`, `TST-LISTS-*`, `TST-TASKS-*`, and `TST-CONCURRENCY-001`: rerun the complete existing integration suite through the harness; preserve unique test data and serial ordering.
- Focused commands: harness unit tests and `pnpm test:integration` without `TEST_DATABASE_URL`. Completion gates: `pnpm test`, `pnpm test:integration`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, both Drizzle checks, changed-file Prettier checks, and `git diff --check`.

## Risks and assumptions

- Vitest `globalSetup` runs in a separate scope, so the URI is passed with `project.provide`/`inject` rather than relying on a process-environment mutation in global setup.
- Existing files' per-file schemas are retained for low-risk isolation; the single Testcontainer is the shared process boundary, while each schema remains independently migrated and cleaned up.
- Testcontainers startup failures should preserve a concise Docker prerequisite message and stop any partially started container. No retry loop or remote fallback is added.
- The official module's `getConnectionUri()` is used rather than reconstructing credentials or mapped ports; the test URI is never committed or printed.

## Handoff to task breakdown

This plan maps to one vertical delivery task, T-14. Task breakdown should preserve the global setup/injected URI bridge, local URL guard, migration application, serial configuration, harness guard/isolation tests, existing suite compatibility, exact gates, and explicit scope exclusions for Playwright orchestration (T-15), Neon performance (T-16), application code, and migrations.
