# T-16 Neon performance evidence implementation plan

> AgentForge plan. Use `task-breakdown` after this plan is accepted.

**Status:** Completed

**Goal:** Produce repeatable, repository-safe evidence that the representative Neon development-branch list/task reads use their intended composite indexes, preserve cursor behavior at the maximum page size, and meet the agreed warm database-execution target.

**Spec and decisions:** [Agent SPEC §3.4](../../../.dwf/output/agent/SPEC.md#34-required-indexes-and-constraints), [Agent SPEC §10.5](../../../.dwf/output/agent/SPEC.md#105-performance-evidence), [TD-010](../../../.dwf/decisions/TECHNICAL.md#td-010), [TD-011](../../../.dwf/decisions/TECHNICAL.md#td-011), [TD-012](../../../.dwf/decisions/TECHNICAL.md#td-012), [OD-017](../../../.dwf/decisions/OPEN-DECISIONS.md#od-017), [OD-018](../../../.dwf/decisions/OPEN-DECISIONS.md#od-018), [OD-019](../../../.dwf/decisions/OPEN-DECISIONS.md#od-019), and [TST-PERFORMANCE-001](../../../.dwf/decisions/TESTING.md#tst-performance-001).

**Global constraints:** Use only the non-default Neon `development` branch for this task; never point the seed or benchmark at the default branch or a production target. Obtain the direct connection string ephemerally from `neonctl`; do not write credentials, connection strings, or environment changes to the repository. Use `node-postgres`, matching the application driver, and measure server-reported PostgreSQL execution time separately from network/auth/rendering/CMS/compute startup. Keep the performance seed separate from local Testcontainers behavior data. Do not change application routes, schema, migrations, or dependencies. If hosted evidence exposes a query/index ordering mismatch, allow only the smallest semantic-preserving repository query correction needed to make the already-accepted index usable; document and verify that correction in the same task. Synthetic seed identities must be uniquely prefixed and scoped so reruns replace only their own records; do not perform broad table truncation or database resets.

## Current state and file map

- `db/schema/lists.ts` and `db/schema/tasks.ts` define native UUID keys, ownership predicates, cursor ordering, and the required `lists_user_created_at_id_idx` and `tasks_user_list_created_at_id_idx` indexes.
- `src/modules/lists/infrastructure/drizzle-list-repository.ts` and `src/modules/tasks/infrastructure/drizzle-task-repository.ts` are the query-shape authorities. The benchmark must mirror their equality scopes, cursor predicates, projections, ordering, and `limit + 1` behavior, including the completed-task filter. Hosted preflight exposed that the task index's `DESC NULLS LAST` ordering was not expressed by Drizzle's default `desc()` SQL; the task repository and benchmark now state `NULLS LAST` explicitly, which is equivalent because both ordered columns are `NOT NULL` and lets PostgreSQL use the accepted index path.
- `scripts/README.md` requires a self-contained script directory with a thin CLI, reusable core, one package command, and focused tests where reusable logic warrants them. Existing `scripts/verify-neon.mjs` is a read-only connection smoke and remains unchanged.
- `TODO.md` owns the T-16 delivery contract. `.dwf/decisions/TESTING.md` owns `TST-PERFORMANCE-001`; its status becomes `verified` only after all required hosted evidence is captured and reconciled.
- The agent-owned Neon `development` branch is ready and has a known expiration date. Preflight must verify its identity and readiness before any mutation; the script must fail closed when its expected host/branch guard is absent.

## Architecture and implementation slices

1. Add `scripts/verify-neon-performance/` with a thin `cli.mjs`, reusable `core.mjs`, and focused core tests if parsing/plan assertions are factored into testable functions. Add exactly one `pnpm neon:performance` command. The CLI accepts an ephemeral `DATABASE_URL`, an expected development-branch host/label, and an optional output path; it never reads or persists `.env.local` secrets by default.
2. In one transaction, verify the connection is PostgreSQL and the expected development target, then replace only deterministic synthetic users (one primary owner and one secondary owner) and their cascaded lists/tasks. Seed approximately 100 lists for the primary owner, one 10,000-task list with mixed statuses, and a second owner's list with enough records to keep the owner/list predicate selective while still exercising privacy. Use parameterized inserts, deterministic timestamps, generated UUIDs, and the existing table constraints. Refresh PostgreSQL statistics before planning. Leave the scoped seed available for repeatable manual reruns; do not clean up unrelated data.
3. Run parameterized `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` for first-page and next-page list queries, first-page and next-page task queries, and the distinct `status <> 'done'` task shape. Parse plans recursively and assert the expected composite index appears in an index scan path with no sequential scan of `lists` or `tasks`. Record concise plan summaries plus the SQL-shape label, not secrets or full connection strings.
4. Exercise both list and task cursor reads with `limit = 100`, checking page length, deterministic ordering, no duplicates across the boundary, owner isolation, continuation, and final termination. Measure a warmed 20-record task query after compute is active using repeated server-reported execution times; record sample count, min/median/max, and whether the `< 50 ms` target passed. Explicitly label this as database execution evidence and record that network, authentication, rendering, CMS, and compute startup are outside the measurement.
5. Write a redacted, deterministic evidence artifact under `docs/agentforge/evidence/` (JSON plus a short Markdown summary if needed) containing run timestamp, branch label, PostgreSQL major/version, seed counts, plan assertions, cursor assertions, timings, command/commit context, and any prerequisite warnings. Never include URLs, passwords, tokens, or user content. Update `TST-PERFORMANCE-001`, T-16 in `TODO.md`, and the temporary implementation checkpoint only after the evidence and focused/project checks pass.

## Safety and failure behavior

- The CLI refuses missing URLs, non-PostgreSQL targets, a host that does not match the ephemeral development-branch preflight, unexpected database identity, or an unrecognized synthetic-prefix configuration before mutating data.
- All SQL values are parameterized. The only replacement operation targets the two exact synthetic user IDs, relying on their foreign-key cascade; no `TRUNCATE`, wildcard deletion, migration, or default-branch operation is allowed.
- A failed assertion exits non-zero and still closes the pool. Evidence is written only after the run has enough structured context to explain the failure; secrets are redacted before serialization.
- The warm threshold is evidence, not a flaky CI gate. A real failure is reported honestly and investigated against the plan/index/query shape rather than hidden by disabling sequential scans or inflating the sample.

## Verification strategy

- Run the script against the ephemeral direct URL obtained from `neon connection-string development` and verify the branch guard, seed counts, plan/index assertions, cursor checks, and timing report.
- Run focused script/core tests (if present), `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, changed-file Prettier checks, and `git diff --check`. Re-run the hosted evidence after any query or seed change.
- Review the evidence for the required separation between database execution and excluded layers; ensure no credentials appear in the artifact or logs.
- Use the required fresh GPT-5.6-Sol reviewer at medium reasoning after the focused/project gates. Prompt for reasonable, proportional, pragmatic, actionable-only findings. Fix every actionable finding, rerun affected checks, and obtain a fresh review for each changed tip until the reviewer reports no actionable findings.
- After reviewer acceptance, reconcile `TST-PERFORMANCE-001`, `TODO.md`, and the temporary checkpoint, recompute the dependency graph, and continue with any safely unblocked task.

## Scope exclusions and risks

- No migration or schema change is warranted: T-16 measures the already-accepted native-UUID schema and indexes. The only application correction is the semantic-preserving explicit `NULLS LAST` ordering needed to align the task repository with its existing index.
- No application-level benchmark, production SLA, load test, network latency claim, compute-startup claim, or CI timing gate is added.
- The development branch expires soon; capture the evidence artifact promptly, but do not extend or delete the branch as part of this task. If the branch becomes unavailable, report the exact prerequisite and stop the hosted slice rather than switching targets.

## Handoff to task breakdown

Turn this plan into one fresh-review task, T-16, with coherent slices for the guarded repeatable seed, representative query-plan checks, cursor and warm-query evidence, redacted artifact, contract/TODO/checkpoint reconciliation, and the required review loop. Keep all mutations scoped to the named development branch and synthetic identities; keep production and default-branch behavior out of scope.
