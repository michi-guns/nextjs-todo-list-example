# Delivery TODO

This file tracks implementation delivery for the starter baseline and the post-baseline environment and delivery workstream. The [DWF README](.dwf/README.md), [Agent PRD](.dwf/output/agent/PRD.md), [Agent SPEC](.dwf/output/agent/SPEC.md), and decision ledgers remain authoritative.

The [Testing Decisions and Test Contracts ledger](.dwf/decisions/TESTING.md) owns test policy, `TST-*` obligations, statuses, dependencies, and evidence expectations. This file assigns those contracts to delivery tasks; it does not redefine them.

Historical task sections preserve the status and dependency snapshot recorded when each task closed. They are not current contract statuses; use the current baseline, the T-17 closeout section, and [`TESTING.md`](.dwf/decisions/TESTING.md) for present-day reconciliation.

Deferred experiments without a delivery commitment live in [FUTURE.md](FUTURE.md), outside this roadmap and the canonical DWF contracts.

Status markers:

- `[ ]` Not started
- `[~]` In progress
- `[x]` Complete
- `[!]` Blocked

## Task branch and merge protocol

This protocol applies to delivery tasks in this file. [AGENTS.md](AGENTS.md)
owns repository-wide authorization, safety, and independent review. Historical
PR references below record earlier deliveries; they do not require new PRs.

1. Select an authorized unchecked task with satisfied dependencies. Read its
   plan and affected `TST-*` contracts, then run the required preflight.
2. Fetch current remote state, bring clean `main` forward without rewriting
   history, and create `codex/<task-id>-<short-slug>` from it. Preserve any
   unrelated local work and check active worktrees before switching branches.
3. Mark the task `[~]`, implement its accepted scope, and record checks and
   documentation changes here or in a linked evidence file. Commit coherent
   increments. No permission is needed for commits or ordinary pushes.
4. Complete the independent review/fix/retest loop required by `AGENTS.md`.
   Record task completion and evidence, then review the final commit including
   that metadata. Every changed tip requires a fresh independent review.
5. Refresh remote state before integration. When `main` is still the branch
   ancestor, prefer a fast-forward merge so the reviewed commit is the result.
   If `main` advanced independently, merge it into the task branch without
   rewriting history, resolve conflicts, rerun affected checks and obtain a
   fresh review of the combined tip before integration.
6. Merge directly into `main` and push it. Do not open a PR. Check the
   main-push CI result for that exact commit; investigate failures rather than
   treating local checks as hosted evidence. No deployment is implied.
7. Confirm each finished branch's current tip is contained in `main`, and
   that no agent/worktree is using it. Delete eligible local and remote task
   branches under the pre-authorization in `AGENTS.md`. Finish on clean
   `main`; active parallel-work branches may remain. Preserve stashes and
   unrelated files, and report any housekeeping that needs separate approval.
8. Report the task ID, final commit, checks/results, and remaining blockers.
   Recompute dependencies and continue only within the owner's authorized scope.

## Current baseline

- [x] DWF product and technical contracts reviewed.
- [x] The runnable authenticated todo reference and reusable foundations are implemented across the capability modules, database, UI, and test harness.
- [x] `pnpm typecheck` passes.
- [x] `pnpm lint` exits successfully, with one existing unused-`Geist` warning in `app/layout.tsx`.
- [x] `pnpm test` passes 72 files and 694 tests (T-27.2 native recovery, 2026-09-25).
- [x] Meaningful migration, Sanity, integration, browser, and performance evidence is recorded. Remaining partial or blocked obligations stay visible in [`TESTING.md`](.dwf/decisions/TESTING.md).

## Phase 0: prerequisites

### T-01: Create the Neon development branch

- [x] Create the non-default Neon `development` branch from `main` before any schema-changing work. The branch is ready and expires on 2026-09-02.
- [x] Point development migration verification at that branch through an ephemeral CLI-derived `DATABASE_URL`; no credential is stored in the repository.
- [x] Record the branch and migration verification result in this delivery tracker.

Verification:

- [x] The complete existing migration chain applied successfully to the Neon `development` branch with `pnpm exec drizzle-kit migrate`.
- [x] The default branch was not changed; future schema migrations must still pass on `development` before promotion.

Test contracts: `TST-MIGRATION-001`, `TST-PERFORMANCE-001`.

Dependencies: none.

### T-02: Provision the dedicated Sanity resource

- [x] Create the dedicated Sanity project and `production` dataset.
- [x] Create and publish the fixed `landingPage` singleton with the required headline, blurb, primary CTA, and optional secondary CTA fields.
- [x] Configure local Sanity project/dataset settings without committing secrets.

Verification:

- [x] `pnpm sanity:smoke` fetches the published singleton through the real `next-sanity` client and fixed-ID GROQ query.
- [x] Missing project/dataset configuration and missing required singleton content fail clearly; the full landing payload validation and application mapping remain in T-12.

Test contracts: `TST-LANDING-002` (the live application mapping remains owned by T-12).

Dependencies: none.

## Phase 1: shared foundations

### T-03: Replace the database runtime boundary

- [x] Replace the Neon HTTP adapter with `node-postgres` through `drizzle-orm/node-postgres`.
- [x] Create one bounded, module-scoped `pg.Pool` shared by Better Auth and list/task repositories.
- [x] Register the pool with Vercel `attachDatabasePool` when running on Vercel Fluid Compute.
- [x] Use pooled Neon connections for application traffic, direct connections for migrations, and the harness URL for local tests.

Verification:

- [x] `pnpm test`, `pnpm typecheck`, and `pnpm lint` pass with no task-caused errors; lint retains one pre-existing unused `Geist` warning.
- [x] `pnpm test:integration` passes against a disposable local PostgreSQL database, and the same repository implementation connected successfully to pooled Neon.

Test contracts: `TST-FOUNDATION-001`.

Dependencies: T-01.

### T-03A: Establish first-class testing design and agent workflow

- [x] Create the canonical testing decision ledger with stable `TSD-*` policy IDs and `TST-*` behavior contracts.
- [x] Record the current baseline's important unit, application, infrastructure, boundary, UI, Sanity, integration, performance, and end-to-end obligations, including dependencies that are not ready yet.
- [x] Add the thin project-local `testing-first-class` skill and route it before TDD for implementation and behavior-changing test work.
- [x] Propagate test-contract references into the Agent SPEC, delivery tracker, DWF navigation, and supporting agent guidance.

Recommended agent skills:

- `skill-creator` for the project-local skill shape and scope.
- `documentation-and-adrs` for DWF ownership, traceability, and projection updates.
- `planning` and `task-breakdown` for a reviewed approach and small, verifiable work items.

Verification:

- [x] Every active baseline test obligation has a stable `TST-*` record, an owning task, required evidence, and a status.
- [x] The skill and documentation explain how to reconcile partial, blocked, deferred, and verified evidence without silently weakening the obligation.
- [x] The skill validator, DWF checks if available, and repository quality gates pass without task-caused failures.

Testing contracts: This task establishes the `TSD-*` policy and `TST-*` contract system in [`.dwf/decisions/TESTING.md`](.dwf/decisions/TESTING.md); it does not implement product behavior.

Dependencies: T-03.

### T-04: Add the lists and tasks schema

- [x] Add `lists` and `tasks` Drizzle tables with ownership, timestamps, statuses, and nullable notes as defined by the SPEC.
- [x] Add the list-to-task foreign key with database-level cascade deletion.
- [x] Add database-enforced case-insensitive uniqueness for list names per user and task titles per list.
- [x] Add the required composite cursor indexes aligned with the authenticated equality scopes and ordering.
- [x] Retire the scaffold `posts` schema from active application code without editing the already-applied scaffold migration in place.

Design amendment — native UUID identifiers:

- [x] Use native PostgreSQL `uuid` IDs for lists and tasks, native UUID `listId` task FKs, and database-generated UUIDv7 defaults while preserving text Better Auth owner FKs.
- [x] Consolidate the native UUID key columns and UUIDv7 defaults into the pre-release T-04 migration; do not retain a separate conversion migration before shared environments exist.
- [x] Extend integration and local catalog evidence to prove native UUID types, UUIDv7 defaults, generated IDs, and preserved constraints/indexes; retain the prior Neon smoke result as historical evidence for the pre-consolidation chain only.

Recommended AgentForge skills:

- `using-agent-skills` to route the task through the repository-local workflow.
- `planning` to preserve the accepted schema, migration, and evidence approach in `docs/agentforge/plans/`.
- `task-breakdown` to keep this task's acceptance and evidence metadata complete.
- `testing-first-class` to reconcile `TST-MIGRATION-001` and `TST-PERSISTENCE-001`.
- `test-driven-development` to add focused failing persistence checks before implementation.
- `source-driven-development` to verify the installed Drizzle v1 RC index, enum, and timestamp APIs.
- `incremental-implementation` to land schema, migration, and evidence in reviewable slices.
- `neon-postgres` and `neon-postgres-branches` for pooled/direct connection boundaries and non-default migration verification.
- `migration-history-workflow` to classify the environment before consolidating or appending migration history.
- `documentation-and-adrs` and `deprecation-and-migration` to record the reopened key-type decision and migration-history policy.
- `git-workflow-and-versioning` and `code-review-and-quality` for the task branch, commit, and final review.

Verification:

- [x] A new versioned migration applies to an empty local PostgreSQL database/schema through the available integration lane.
- [!] Historical T-04 closeout: PostgreSQL 18 Testcontainers migration evidence was blocked until the reusable T-14 harness existed; the local integration check did not replace that obligation.
- [!] Historical T-04 closeout: the prior two-step migration chain remained recorded on the agent-owned Neon development branch; the consolidated files were verified on a fresh local PostgreSQL database, and the cloud branch was not destructively reset.
- [x] Integration coverage proves uniqueness, cascade deletion, and required indexes/constraints.
- [!] Historical T-04 closeout: the consolidated migration's final catalog exposed UUIDv7 defaults on the fresh local PostgreSQL database; applying this rewritten history to Neon required a separately approved branch realignment.
- [x] Integration coverage proves database-generated native UUID IDs while preserving uniqueness, cascade deletion, and required indexes/constraints.

Test contracts: `TST-MIGRATION-001`, `TST-PERSISTENCE-001`.

Dependencies: T-01, T-03, T-03A.

### T-04A: Generalize the migration-history AgentForge skill

- [x] Add a database-agnostic `migration-history-workflow` skill that owns only the evidence-based consolidation-versus-append-only decision.
- [x] Keep PostgreSQL/Drizzle/Neon/Testcontainers mechanics in project documentation rather than the reusable skill.
- [x] Preserve the old PostgreSQL-named paths as deprecated compatibility aliases while updating active routing and links to the generic name.
- [x] Add the generic-artifact/reuse principle to `AGENTS.md` with a clear no-overengineering boundary.

Recommended AgentForge skills:

- `using-agent-skills` to route the renamed project-local skill.
- `planning` and `task-breakdown` to preserve a small, repository-grounded delivery record.
- `documentation-and-adrs` to keep generic policy and project-specific mechanics in their owning documents.
- `code-review-and-quality` and `git-workflow-and-versioning` for scope review, commit, and PR update.

Verification:

- [x] The canonical skill, compatibility aliases, Claude bridges, and router pass the available skill-format validation.
- [x] Active references resolve to `migration-history-workflow`; the canonical skill contains no repository- or database-vendor-specific coupling.
- [x] `git diff --check`, `pnpm test`, `pnpm typecheck`, and `pnpm lint` pass without task-caused failures.
- [x] The PR describes the generic workflow and the compatibility/deprecation boundary.

Testing contracts: None. This is a prose and agent-workflow change; application behavior and `TST-*` obligations are unchanged.

Dependencies: T-04.

### T-05: Complete the Better Auth boundary

- [x] Complete T-05 on `task/t-05-better-auth-boundary` using the accepted plan in [`docs/agentforge/plans/2026-08-30-t-05-better-auth-boundary.md`](docs/agentforge/plans/2026-08-30-t-05-better-auth-boundary.md).
- [x] Keep Better Auth configuration and raw records behind the auth infrastructure boundary.
- [x] Expose server-only current-user helpers equivalent to `getCurrentUser()` and `requireUser()`.
- [x] Support email/password sign-up, sign-in, and sign-out.
- [x] Require local email verification before a password session; preserve the credential when verification comes first and retain Better Auth's unproven-account revocation when a magic link comes first.
- [x] Support magic-link request and consumption.
- [x] In explicit local/test mode only, capture authentication links in a temporary gitignored mailbox.

Verification:

- [!] Historical T-05 closeout: private list/task reads and mutations were deferred to T-09; the `requireUser()` boundary already failed closed for unauthenticated requests.
- [x] The local/test mailbox flow can request, read, and consume email-verification and magic links; both same-account lifecycle orders are covered.
- [x] Authenticated code never accepts a client-provided owner id.

Test contracts: `TST-AUTH-001`, `TST-AUTH-002`, `TST-AUTH-003`.

Evidence at T-05 closeout: `pnpm test` (6 unit tests), `pnpm test:integration` against disposable local PostgreSQL 18 (8 tests), and `pnpm exec drizzle-kit migrate` plus catalog inspection all passed. The auth contracts were `partial` until T-09 added private entry paths and T-15 recorded the required Chromium journeys; current statuses are reconciled in `TESTING.md`.

PR: [#7](https://github.com/michi-guns/nextjs-todo-list-example/pull/7) | final task commit `d241a75` | merged as `2935283`

Dependencies: T-03, T-03A.

## Checkpoint: foundations

- [x] `pnpm typecheck` passes.
- [x] `pnpm lint` passes without new warnings.
- [x] PostgreSQL 18 integration setup applies the complete migration chain.
- [x] Password and magic-link authentication work against the local test database.

## Phase 2: domain and application behavior

### T-06: Implement the lists capability

- [x] Implement T-06 from the accepted plan in [`docs/agentforge/plans/2026-08-30-t-06-lists-capability.md`](docs/agentforge/plans/2026-08-30-t-06-lists-capability.md).
- [x] Add framework-independent list rules and repository ports under `src/modules/lists`.
- [x] Implement `ensureDefaultInbox`, list reads, create, rename, and delete use cases.
- [x] Make Inbox creation atomic and idempotent, including after final-list deletion.
- [x] Enforce trimming, 1–80 character names, ownership, privacy-preserving not-found results, and last-successful-write behavior.

Verification:

- [x] Unit tests cover normalization, ownership, Inbox lifecycle, and expected application outcomes.
- [x] Integration tests cover concurrent Inbox creation, duplicate names, cursor ordering, and cascade behavior.

Test contracts: `TST-LISTS-001`, `TST-LISTS-002`, `TST-LISTS-003`, `TST-CONCURRENCY-001`.

Recommended AgentForge skills: `using-agent-skills`, `planning`, `task-breakdown`, `testing-first-class`, `test-driven-development`, `incremental-implementation`, `source-driven-development`, `security-and-hardening`, `api-and-interface-design`, `git-workflow-and-versioning`, and `code-review-and-quality`.

Verification commands: focused unit and local PostgreSQL integration tests during implementation; completion gates are `pnpm test`, `TEST_DATABASE_URL=<local PostgreSQL URL> pnpm test:integration`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm exec drizzle-kit check --config drizzle.config.ts`, `pnpm exec drizzle-kit generate --config drizzle.config.ts --explain --output text`, and `git diff --check`. Reusable Testcontainers evidence remains with T-14.

Evidence: `pnpm test` (10 files, 46 tests), `TEST_DATABASE_URL=postgresql://postgres@127.0.0.1:55432/todo_test pnpm test:integration` (4 files, 15 tests against disposable `postgres:18-alpine`), `pnpm typecheck`, `pnpm lint` (one pre-existing `Geist` warning), `pnpm build`, both Drizzle checks, and `git diff --check` all pass. The affected contracts are `partial` with local unit/integration evidence; T-09 boundary, T-10/T-15 browser, and T-14 reusable-harness evidence remain deferred.

PR: [#10](https://github.com/michi-guns/nextjs-todo-list-example/pull/10) | final reviewed tip `2eccfcc` | merged as `1c1b355`.

Dependencies: T-04, T-05.

### T-07: Implement the tasks capability

- [x] Implement T-07 from the accepted plan in [`docs/agentforge/plans/2026-08-30-t-07-tasks-capability.md`](docs/agentforge/plans/2026-08-30-t-07-tasks-capability.md).
- [x] Add framework-independent task rules and repository ports under `src/modules/tasks`.
- [x] Implement task reads, create, update, status changes, and delete use cases.
- [x] Enforce title and notes normalization, status rules, list ownership, per-list case-insensitive title uniqueness, and patch semantics.
- [x] Implement newest-first cursor reads and the `includeCompleted` filter, defaulting to `true`.

Verification:

- [x] Unit tests cover status transitions, trimming, note clearing, validation, and patch-field semantics.
- [x] Integration tests cover ownership, duplicate titles, pagination, completed filtering, cascade deletion, and last-successful-write behavior.

Test contracts: `TST-TASKS-001`, `TST-TASKS-002`, `TST-TASKS-003`, `TST-CONCURRENCY-001`.

Recommended AgentForge skills: `using-agent-skills`, `planning`, `task-breakdown`, `testing-first-class`, `test-driven-development`, `incremental-implementation`, `source-driven-development`, `security-and-hardening`, `api-and-interface-design`, `git-workflow-and-versioning`, and `code-review-and-quality`.

Verification commands: focused unit and local PostgreSQL integration tests during implementation; completion gates are `pnpm test`, `TEST_DATABASE_URL=<local PostgreSQL URL> pnpm test:integration`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm exec drizzle-kit check --config drizzle.config.ts`, `pnpm exec drizzle-kit generate --config drizzle.config.ts --explain --output text`, and `git diff --check`. Reusable Testcontainers evidence remains with T-14.

Dependencies: T-04, T-05, T-06.

Evidence: `pnpm test` (12 files, 57 tests), `TEST_DATABASE_URL=postgresql://postgres@127.0.0.1:55432/todo_test pnpm test:integration` (5 files, 19 tests against disposable `postgres:18-alpine`), `pnpm typecheck`, `pnpm lint` (zero errors and the one pre-existing `Geist` warning), `pnpm build`, both Drizzle checks, and `git diff --check` all pass. The task tests prove framework-independent normalization, status transitions including repeated-status timestamp idempotence, privacy-preserving list reads, ownership, uniqueness, pagination/filtering, cascade, and controlled concurrent writes. No migration was needed because T-07 consumes the existing schema. `TST-TASKS-001`, `TST-TASKS-002`, `TST-TASKS-003`, and `TST-CONCURRENCY-001` are `partial`; T-08/T-09 boundary evidence, T-10/T-15 browser evidence, and T-14 reusable-harness evidence remain deferred.

PR: [#11](https://github.com/michi-guns/nextjs-todo-list-example/pull/11) | implementation tip `2253724` received no actionable findings; closeout metadata is maintained on the current PR tip.

### T-08: Add shared pagination and error contracts

- [x] Implement T-08 from the accepted plan in [`docs/agentforge/plans/2026-08-30-t-08-pagination-errors.md`](docs/agentforge/plans/2026-08-30-t-08-pagination-errors.md).
- [x] Add framework-independent shared pagination types, constants, and Zod query parsing without importing modules or app routes.
- [x] Add the shared error envelope/status mapper for unauthenticated, not-found, conflict, invalid-input, and safe internal failures.
- [x] Refactor list/task ports and limit consumers to use the shared page contract while preserving module-specific cursor and domain-error behavior.
- [x] Prove maximum-size list/task pagination continues correctly from 100 to the 101st record without changing migrations or query bounds.

Verification:

- [x] Shared unit tests cover default/maximum limits, invalid pagination inputs, stable page shape, known error mappings, and safe unknown-error fallback.
- [x] PostgreSQL integration tests cover list/task ordering and continuation at the maximum page size; existing cursor/filter/privacy tests remain green.

Test contracts: `TST-LISTS-003`, `TST-TASKS-003`, `TST-BOUNDARY-001`.

Recommended AgentForge skills: `using-agent-skills`, `planning`, `task-breakdown`, `testing-first-class`, `test-driven-development`, `incremental-implementation`, `source-driven-development`, `security-and-hardening`, `api-and-interface-design`, `git-workflow-and-versioning`, and `code-review-and-quality`.

Verification commands: focused shared/list/task unit tests and local PostgreSQL integration tests during implementation; completion gates are `pnpm test`, `TEST_DATABASE_URL=<local PostgreSQL URL> pnpm test:integration`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm exec drizzle-kit check --config drizzle.config.ts`, `pnpm exec drizzle-kit generate --config drizzle.config.ts --explain --output text`, `pnpm exec prettier --check` for changed Markdown, and `git diff --check`. Testcontainers lifecycle evidence remains with T-14; authenticated boundary request tests remain with T-09.

Dependencies: T-06, T-07.

Evidence: `pnpm test` (14 files, 62 tests), `TEST_DATABASE_URL=postgresql://postgres@127.0.0.1:55432/todo_test pnpm test:integration` (5 files, 21 tests against disposable `postgres:18-alpine`), `pnpm typecheck`, `pnpm lint` (zero errors and the one pre-existing `Geist` warning), `pnpm build`, both Drizzle checks, changed-file Prettier checks, and `git diff --check` all pass. Shared pagination tests cover default/maximum limits, invalid URL values, blank cursors, duplicate parameters, and the stable page shape. Shared error-contract tests cover 401/404/409/422 mappings, canonical non-leaking messages, and the generic 500 fallback. List/task integration tests prove maximum-page continuation from 100 records to the 101st record. No migration was needed. `TST-LISTS-003`, `TST-TASKS-003`, and `TST-BOUNDARY-001` remain `partial` because authenticated request/action, browser, and reusable-harness evidence belong to T-09/T-10/T-14.

PR: [#12](https://github.com/michi-guns/nextjs-todo-list-example/pull/12) | implementation tip `c3044b5` received no actionable findings; the closeout metadata tip is reviewed before merge.

## Phase 3: application surfaces

### T-09: Add Server Actions and JSON Route Handlers

- [x] Implement the accepted plan in [`docs/agentforge/plans/2026-08-30-t-09-server-entry-paths.md`](docs/agentforge/plans/2026-08-30-t-09-server-entry-paths.md).
- [x] Add the stable list/task routes from the SPEC: `/api/lists`, `/api/lists/:listId`, `/api/lists/:listId/tasks`, and `/api/tasks/:taskId`.
- [x] Make actions and handlers follow authenticate, authorize, validate, use case, map, and revalidate/respond.
- [x] Share Zod schemas and application use cases between actions and handlers.
- [x] Keep the private JSON API same-origin and session-authenticated. Do not add bearer-token or machine authentication.

Verification:

- [x] Route Handler contract tests cover success, pagination, `401`, privacy-preserving `404`, `409`, and `422` responses.
- [x] Server Action tests cover authentication, validation, successful mapping, and expected errors.

Test contracts: `TST-AUTH-003`, `TST-BOUNDARY-001`.

Dependencies: T-05, T-06, T-07, T-08.

Implementation scope: capability-owned schemas, view models, JSON Route Handler adapters, and Server Action adapters under `src/modules/lists/presentation` and `src/modules/tasks/presentation`; thin composition wrappers under `app/api/` and `app/actions/`; request/action contract tests. Existing application, infrastructure, auth, schema, migration, snapshot, and UI files remain unchanged unless a type-only composition adjustment is required.

Recommended AgentForge skills: `using-agent-skills`, `planning`, `task-breakdown`, `testing-first-class`, `test-driven-development`, `incremental-implementation`, `source-driven-development`, `api-and-interface-design`, `security-and-hardening`, `git-workflow-and-versioning`, `code-review-and-quality`, and `verification-before-completion`.

Verification commands: focused list/task presentation tests during implementation; completion gates are `pnpm test`, `pnpm test:integration`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, both Drizzle checks, changed-file Prettier checks, and `git diff --check`. Next.js browser/runtime journey evidence remains with T-15 because the dashboard UI is not yet implemented.

Evidence: `pnpm test` (17 files, 86 tests), `pnpm test:integration` (6 files, 23 tests against one disposable PostgreSQL 18 Testcontainer), `pnpm typecheck`, `pnpm lint` (zero errors and one pre-existing `Geist` warning), `pnpm build`, `pnpm exec drizzle-kit check --config drizzle.config.ts`, `pnpm exec drizzle-kit generate --config drizzle.config.ts --explain --output text`, changed-file Prettier checks, and `git diff --check main..853fedd` all pass. Focused list/task boundary tests cover authenticated success and owner propagation, pagination/filtering, `401`, privacy-preserving `404`, `409`, `422`, safe view models, Server Action mapping/revalidation, expected action errors, and same-origin mutation rejection. No schema, migration, snapshot, or dependency changes were made. Implementation commits `b4292b5` and `6604141`, closeout metadata `da40794`, and code/test tip `853fedd` are covered by the fresh review loop; the additional task-action regression is included in the code/test tip. Next.js browser/runtime evidence remains with T-15 because the dashboard UI is not yet implemented.

PR: [#14](https://github.com/michi-guns/nextjs-todo-list-example/pull/14) | reviewed code/test tip `853fedd` and metadata tip `5e45396` received fresh GPT-5.6-Sol reviews with no actionable findings | merged as `17c0799`.

### T-09A: Explore and prototype UI directions

- [x] Implement the accepted plan in [`docs/agentforge/plans/2026-08-30-t-09a-ui-direction-exploration.md`](docs/agentforge/plans/2026-08-30-t-09a-ui-direction-exploration.md).
- [x] Define the locked product constraints, critical user scenarios, representative data, target viewports, and free UI dimensions for the dashboard, with landing/auth extension notes and locked journeys.
- [x] Produce three materially different UI directions based on different information-architecture or interaction hypotheses, not cosmetic variations.
- [x] Prototype the critical scenario with the same realistic fixture data while keeping each direction isolated, removable, and independent of backend or schema changes.
- [x] Render and inspect each direction for hierarchy, density, overflow, focus, selected, disabled, error, empty, and responsive states where relevant.

Recommended agent skills:

- `ui-direction-explorer` for repository reconnaissance, divergent direction briefs, fair comparison fixtures, isolated prototypes, visual inspection, and evidence-based evaluation.
- `frontend-ui-engineering` for semantic controls, keyboard reachability, meaningful states, design-system tokens, and responsive prototype structure.

Verification:

- [x] Each direction has a distinct hypothesis, optimization target, and trade-off.
- [x] All directions use the same primary scenario, data burden, required capabilities, and target viewport.
- [x] The exploration handoff states any visual-inspection limitation instead of claiming unperformed validation.

Test contracts: `TST-UI-001`.

Dependencies: T-08.

Plan: [`docs/agentforge/plans/2026-08-30-t-09a-ui-direction-exploration.md`](docs/agentforge/plans/2026-08-30-t-09a-ui-direction-exploration.md).

Implementation scope: isolated static prototypes and exploration metadata under `.ui-explorations/t09a-dashboard/`; no production routes, backend, schema, migrations, snapshots, dependencies, or business-rule changes.

Verification commands: `python .agents/skills/ui-direction-explorer/scripts/validate-directions.py .ui-explorations/t09a-dashboard`, Vite static preview with Playwright inspection at the agreed viewports, `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, changed-file formatting checks, and `git diff --check`.

Evidence: [`report.md`](.ui-explorations/t09a-dashboard/report.md) records the shared fixture, research ledger, three direction hypotheses, explicit dashboard-only prototype scope, landing/auth extension notes, and the comparison criteria. `python .agents/skills/ui-direction-explorer/scripts/validate-directions.py .ui-explorations/t09a-dashboard` passes with exactly three directions. The static preview served successfully through Vite; Chromium Playwright inspection covered the launcher and all directions at 1440x900, 1024x768, 768x1024, and 320x800 with zero console errors and no document overflow. Focus Rail task/list capture, Status Board status movement and pagination, Command Inspector search/inspector note editing, `/` and Cmd/Ctrl-K search focus, final-list reload/Inbox recreation, empty/loading/disabled/error/selected/long-content states, and keyboard-visible focus were exercised. `TST-UI-001` is `partial` for this prototype layer; materialized UI runtime/state evidence remains with T-10/T-11/T-12A, while T-15's browser journeys remain under the separate `TST-E2E-*` contracts. Fresh GPT-5.6-Sol reviews through closeout tip `23d27e9` returned no actionable findings. [PR #15](https://github.com/michi-guns/nextjs-todo-list-example/pull/15) merged as `b88f377`.

### T-09B: Select and hand off the UI direction

- [x] Compare Focus Rail, Status Board, and Command Inspector against explicit criteria derived from the product goal and accepted todo workflow, then record the winning trade-off.
- [x] Select one direction and record its information architecture, interaction model, visual hierarchy, component composition, responsive behavior, accessibility requirements, and important states.
- [x] Keep the exploration record and prototype links outside `.dwf`; update the DWF only if the selected direction changes product behavior or an accepted technical boundary.
- [x] Identify the reusable tokens and primitives that the production implementation should preserve for T-10 and T-11.

Recommended agent skills:

- `ui-direction-explorer` for the divergence gate, side-by-side evaluation, trade-off analysis, and decision-oriented handoff.
- `frontend-ui-engineering` for translating the selected direction into an implementation-ready component and accessibility brief.

Verification:

- [x] The chosen direction has a clear reason for winning and a documented trade-off.
- [x] T-10 and T-11 can be implemented from the handoff without inventing a competing UI direction.
- [x] The handoff includes the empty, loading, error, focus, narrow-viewport, and long-content states needed by the product.
- [x] `python .agents/skills/ui-direction-explorer/scripts/validate-directions.py .ui-explorations/t09a-dashboard` reports exactly three directions and zero errors.
- [x] Changed JSON/Markdown files pass Prettier, `git diff --check`, `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build`; no production source or dependency files change.

Test contracts: `TST-UI-001`.

Dependencies: T-09A.

Plan: [`2026-08-30-t-09b-ui-direction-handoff.md`](docs/agentforge/plans/2026-08-30-t-09b-ui-direction-handoff.md).

Implementation scope: update `.ui-explorations/t09a-dashboard/exploration.json` and `report.md`, add `.ui-explorations/t09a-dashboard/handoff.md`, and reconcile this task plus `TST-UI-001` evidence. Do not change `app/`, `components/`, `src/`, `db/`, `migrations/`, package manifests, or DWF product/technical authority.

Handoff interface: T-10 and T-11 consume the selected direction id (`focus-rail`), its dashboard information architecture, shared semantic tokens/primitives, responsive breakpoints, accessibility/state matrix, and explicit extension notes. The handoff produces no runtime API or component contract.

Evidence: Focus Rail is selected in `.ui-explorations/t09a-dashboard/exploration.json`; `report.md` records the explicit accessibility comparison and rejected alternatives; `handoff.md` provides the production composition, responsive/accessibility rules, state matrix, and landing/auth extensions. The validator reports exactly 3 directions, 0 errors, and 0 warnings; local Markdown links resolve; changed-file Prettier and `git diff --check` pass. `pnpm test` passes (17 files, 86 tests), `pnpm typecheck` passes, `pnpm lint` passes with one pre-existing `app/layout.tsx:1:10` `Geist` warning, and `pnpm build` passes. Fresh GPT-5.6-Sol medium reviews of `1ccf044` and `5472805` produced actionable documentation findings that were fixed in `5472805` and `88e184e`; fresh reviews of `88e184e`, `d15f25e`, and the corrected closeout tip `994bca0` returned **No actionable findings**. `TST-UI-001` remains `partial` because materialized runtime/state evidence belongs to T-10/T-11/T-12A; T-15's end-to-end browser evidence remains under the separate `TST-E2E-*` contracts.

PR: No PR branch was needed; the repository's `AGENTS.md` permits direct, coherent pushes to `main`. Reviewed T-09B closeout commit: `994bca0`, pushed to `origin/main`; checkpoint-only update follows in `1a15750`.

### T-10: Build the authenticated dashboard

- [x] Implement the accepted plan in [`docs/agentforge/plans/2026-08-30-t-10-authenticated-dashboard.md`](docs/agentforge/plans/2026-08-30-t-10-authenticated-dashboard.md).
- [x] Materialize the Focus Rail composition at `/dashboard`: authenticated server route, header/session context, persistent list rail, task workspace, and semantic shadcn-style controls using the existing token system.
- [x] Keep the route server-owned for session gating, Inbox provisioning, and initial view-model reads; keep browser orchestration free of Drizzle, Better Auth, Sanity, and provider payloads.
- [x] Add list operations (create, select, rename, delete, and visible cursor `Load more`) through the existing list Server Actions and authenticated JSON read route.
- [x] Add task operations (create, edit title/notes, delete, direct status changes, completed-task toggle, and visible cursor `Load more`) through the existing task Server Actions and authenticated JSON read route.
- [x] Reset task items/cursor and reload page one when the selected list or completed-task visibility changes; append later pages in server order only while a cursor exists.
- [x] Provide accessible loading, empty, validation/conflict, recoverable-error, disabled/pending, selected, long-content, and final-list reload states, including focus management and non-color-only labels.

Implementation scope and interfaces:

- Create `app/(app)/dashboard/page.tsx` plus route-local `loading.tsx` and `error.tsx`; consume `requireUser`, `listApplication`, `taskApplication`, `toListPageViewModel`, and `toTaskPageViewModel`, and pass only serializable user/list/task view models plus Server Action references to the client.
- Create the dashboard client/container and composable Focus Rail pieces under `components/dashboard/` (or one clearly owned module presentation location if implementation evidence requires it); use the existing `components/ui/button.tsx` and only the focused semantic primitives needed for labels, text input, textarea, checkbox/select, alert, and confirmation.
- Add a small framework-independent dashboard state/response helper and focused tests only if needed to prove replace/append/reset behavior; do not introduce a state-management dependency or a full React unit-test matrix.
- Read pagination from `/api/lists` and `/api/lists/:listId/tasks` with same-origin `fetch`; invoke `createListAction`, `renameListAction`, `deleteListAction`, `createTaskAction`, `updateTaskAction`, and `deleteTaskAction` with serializable objects.
- Leave migrations, schema, auth provider configuration, landing/Sanity content, and the rejected UI directions unchanged.

Recommended agent skills:

- `frontend-ui-engineering` for production-quality component structure, semantic controls, state handling, responsive layout, loading/error/empty states, and WCAG basics.
- `vercel-composition-patterns` for composable dashboard and task/list component APIs without boolean-prop or configuration sprawl.
- `vercel-react-best-practices` for React and Next.js rendering, state, and performance decisions.
- `next-dev-loop` for runtime verification in the running Next.js app after implementation.
- `testing-first-class` and `test-driven-development` for the affected test contracts and behavior loop.
- `incremental-implementation` for vertical slices and `git-workflow-and-versioning` for the coherent delivery commit.

Verification:

- [x] Focused unit/state tests (when added) pass, and authenticated route/action behavior remains covered by the existing boundary tests.
- [x] `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, changed-file `pnpm exec prettier --check`, and `git diff --check` pass.
- [x] With `next dev` and the repository runtime/browser prerequisites available, an authenticated manual/browser check confirms private-session gating, list/task pagination, filtering, mutation feedback, final-list reload, keyboard reachability, visible focus, and no overflow at 320px, 768px, 1024px, and 1440px.
- [x] Runtime evidence is recorded without credentials; any unavailable prerequisite or deferred T-15 harness evidence is reported rather than replaced by a weaker check.

Evidence: Added the server-owned `/dashboard` route, route loading/error states, sign-out action, Focus Rail client composition, semantic input/textarea/label/alert primitives, and the framework-independent pagination state helper with four focused tests. `pnpm test` passes (19 files, 96 tests), `pnpm typecheck` passes, `pnpm lint` passes with only the pre-existing `app/layout.tsx:1:10` `Geist` warning, `pnpm build` passes on Next.js 16.3.1/Turbopack, changed-file Prettier checks pass, and `git diff --check` passes. The Next runtime loop used the disposable local PostgreSQL 18 database `dashboard_t10_20260830` and local mailbox mode without recording credentials: anonymous `/dashboard` requests redirect to `/sign-in?next=%2Fdashboard`; the authenticated browser session exercised Inbox provisioning, list create/select/rename/delete, task create/edit/delete/status, completed-task filtering, both visible cursor continuations, duplicate/blank validation feedback, final-list reload with Inbox recreation, sign-out, keyboard focus return after deletion, and focus-visible styling. Seeded disposable rows made both `Load more` controls continue through their remaining pages without duplicate IDs or order changes. At 320px, 768px, 1024px, and 1440px there was no horizontal document overflow. Axe reported 0 violations (39 passes); browser errors were empty, console output contained only expected React DevTools/HMR messages, Next MCP reported `issues: []`, `configErrors: []`, `sessionErrors: []`, and the route map includes `/dashboard`. T-15 reusable Playwright evidence and the T-11 auth/landing route remain intentionally deferred.

Review gate: fresh GPT-5.6-Sol medium reviews of the implementation tips `8c864b4`, `f90dd92`, `89ea479`, and `a25461b` returned actionable accessibility findings that were fixed in the subsequent tips; the final review of `a25461b` returned **No actionable findings**. T-10 is closed and the dependency graph is recomputed below.

Test contracts: `TST-LISTS-001`, `TST-LISTS-003`, `TST-TASKS-003`, `TST-UI-001`, `TST-E2E-003`.

Dependencies: T-09, T-09B.

Unblock condition: T-09 and T-09B are merged on `main`; T-10 is safely implementable without T-11, T-12A, or T-15. T-10 is now complete at reviewed tip `a25461b`, so T-11 is the next safely implementable task; T-12A and T-15 remain blocked by their listed dependencies.

### T-11: Build the public landing and auth screens

- [x] Implement the accepted plan in [`docs/agentforge/plans/2026-08-31-t-11-public-landing-auth.md`](docs/agentforge/plans/2026-08-31-t-11-public-landing-auth.md).
- [x] Materialize the selected Focus Rail direction across the public landing and authentication surfaces without copying private dashboard controls.
- [x] Replace the scaffold root route with a server-owned Sanity-backed landing page and explicit provider-failure boundary, linking to sign-up, sign-in, and magic-link entry points.
- [x] Add accessible sign-up, sign-in, and magic-link request/consume screens using the installed Better Auth browser client; preserve the existing dashboard sign-out action as the sign-out UX.
- [x] Constrain `next` callbacks to safe same-origin paths, default to `/dashboard`, and keep provider payloads, Better Auth records, credentials, mailbox contents, and secrets out of UI-facing types and logs.
- [x] Keep auth forms as small client interaction islands with stable validation/error/pending/success states, no duplicate authentication provider, and no schema, migration, or Sanity configuration changes.

Recommended agent skills:

- `frontend-ui-engineering` for accessible forms, responsive layouts, error and loading states, focus management, and consistent design-system usage.
- `vercel-composition-patterns` for reusable auth form and landing section composition.
- `vercel-react-best-practices` for Server Component, Client Component, and interaction-boundary choices.
- `next-dev-loop` for checking the real landing and auth routes in a running Next.js app.
- `testing-first-class` for reconciling the affected auth/UI contracts and evidence layers.
- `test-driven-development` for the redirect/error contract tests before implementation.
- `source-driven-development` for the installed Better Auth and Next.js APIs.
- `security-and-hardening` for safe callback handling and provider-boundary isolation.
- `incremental-implementation` and `git-workflow-and-versioning` for vertical slices and a coherent reviewed tip.
- `code-review-and-quality` and `verification-before-completion` for the final fresh-review loop and evidence gate.

Verification:

- [x] Focused redirect/error tests pass, and existing auth integration/boundary tests remain green.
- [x] The public landing renders the validated Sanity-backed view model; missing/invalid provider content fails through an explicit safe boundary rather than a permanent hardcoded fallback.
- [!] Historical T-11 closeout: the full verification-pending, verified sign-in, magic-link request/consume, and sign-out browser lifecycle remained T-15-owned; T-11 verified the route surfaces, safe `/dashboard` callback default, stable invalid-credential and invalid-token states, and the existing local PostgreSQL auth integration lifecycle without recording credentials or tokens. T-15 later completed the browser lifecycle evidence.
- [x] Forms are keyboard accessible with labelled controls, visible focus tokens, pending/error/success states, long-content wrapping, and no horizontal overflow at `320px`, `768px`, `1024px`, and `1440px`.
- [x] `pnpm test`, `pnpm test:integration`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, changed-file Prettier checks, `git diff --check`, and `pnpm sanity:smoke` pass; lint reports only the pre-existing `app/layout.tsx:1:10` `Geist` warning.
- [x] A fresh GPT-5.6-Sol medium reviewer returned **No actionable findings** for reviewed code tip `7c1b617`; at T-11 closeout, T-15's dedicated Playwright E2E contracts were explicitly outstanding and were later completed by T-15.

Test contracts: `TST-AUTH-001`, `TST-AUTH-002`, `TST-AUTH-003`, `TST-UI-001`, `TST-E2E-001`, `TST-E2E-002`.

Dependencies: T-02, T-05, T-09B, T-10, T-12.

Plan: [`docs/agentforge/plans/2026-08-31-t-11-public-landing-auth.md`](docs/agentforge/plans/2026-08-31-t-11-public-landing-auth.md).

Implementation scope and interfaces:

- Replace the scaffold `app/page.tsx` in place as the sole server-owned `/` landing route and add its provider-safe root error boundary without creating a duplicate `app/(marketing)/page.tsx`; add auth route group pages under `app/(auth)/` and composition-owned landing/auth UI under `components/landing/` and `components/auth/`.
- Add one client-only Better Auth wrapper under `lib/auth-client.ts` using `createAuthClient` and `magicLinkClient`; do not export provider records or server-only helpers through it.
- Add a framework-independent safe internal redirect/error helper and focused tests under `src/modules/auth/presentation/` only if the form boundary requires them.
- Consume `getPublishedLandingContent()` and `LandingContent` from the existing landing application/infrastructure boundary; leave Sanity client/query/configuration and the dashboard implementation untouched.

Evidence target at T-11 planning/closeout: T-11 owned landing/auth materialized runtime evidence for `TST-UI-001` and the route/form prerequisites for T-15. `TST-AUTH-001`, `TST-AUTH-002`, and `TST-AUTH-003` were `partial` until the T-15 browser and multi-user evidence was complete; `TST-E2E-001` and `TST-E2E-002` were `specified` until T-15. Current statuses are reconciled in `TESTING.md`.

Evidence at T-11 closeout: The server-owned root route consumes `getPublishedLandingContent()` and renders the Focus Rail landing view; `app/error.tsx` provides a provider-safe retry boundary using Next.js 16.3.1's `retry` callback. `/sign-up`, `/sign-in`, and `/magic-link` use one Better Auth browser client with the installed magic-link plugin, safe internal redirect handling, stable public error messages, and explicit pending/success states. `pnpm test` passed (20 files, 110 tests); `pnpm test:integration` passed (6 files, 23 tests against disposable local PostgreSQL 18); `pnpm typecheck`, `pnpm build`, changed-file Prettier, and `git diff --check` passed; `pnpm lint` had only the pre-existing Geist warning; and `pnpm sanity:smoke` validated the configured landing singleton. Next MCP reported `issues: []`, `configErrors: []`, and `sessionErrors: []`, and the route map included `/`, `/sign-up`, `/sign-in`, and `/magic-link`. Chromium inspection confirmed labelled landmarks and controls, keyboard traversal, stable invalid-credential and invalid-token messages, zero axe violations on the landing/auth routes, and no horizontal document overflow for all four routes at `320x800`, `768x1024`, `1024x768`, and `1440x900`; a synthetic 500-character headline/CTA check also remained within 320px after the `wrap-anywhere` fix. The deterministic mailbox/browser lifecycle and multi-user isolation were T-15 obligations at that historical closeout and were later verified.

Review gate: Runtime verification found the magic-link error-code double mapping and corrected it in `bd5a609`. Fresh GPT-5.6-Sol medium review of `bd5a609` found the Next retry callback and long-content wrapping issues and corrected them in `ef6e5e5`; a synthetic long-content check then required the Tailwind 4 `wrap-anywhere` refinement in `7c1b617`. The final fresh review of `7c1b617` returned **No actionable findings**. The repository's direct-main workflow required no PR branch; reviewed code tip `7c1b617` was pushed to `origin/main` before closeout.

Dependency recomputation: T-12A and T-15 are now safely unblocked because their listed dependencies are complete; T-12A owns the materialized UI audit, while T-15 owns the dedicated Playwright/mailbox and multi-user lifecycle harness. T-17 remains blocked by T-12A and T-15.

### T-12: Add the Sanity landing read path

- [x] Add the Sanity client/configuration seat under `src/sanity`.
- [x] Validate unknown Sanity payloads and map them to a plain landing view model inside landing infrastructure.
- [x] Give published landing reads one stable cache identity.
- [x] No T-12-specific fallback remains; public landing presentation remains owned by T-11.

Verification:

- [x] Fixture tests cover valid, optional, malformed, incomplete, identity-mismatch, and provider-field-isolation payloads.
- [x] The separate live read smoke fetches, validates, and maps the published singleton through the Node-safe client factory, shared source adapter, and application use case.

Test contracts: `TST-LANDING-001`, `TST-LANDING-002`.

Dependencies: T-02, T-03A.

Plan: [`2026-08-30-t-12-sanity-landing-read-path.md`](docs/agentforge/plans/2026-08-30-t-12-sanity-landing-read-path.md).

Evidence: `pnpm test` (4 files, 19 tests), `pnpm sanity:smoke`, `pnpm typecheck`, `pnpm lint` (one pre-existing `Geist` warning), `pnpm build`, and `git diff --check` all pass. [PR #8](https://github.com/michi-guns/nextjs-todo-list-example/pull/8) was independently reviewed by fresh GPT-5.6-Sol agents until no actionable findings remained.

Recommended AgentForge skills: `testing-first-class`, `test-driven-development`, `incremental-implementation`, `source-driven-development`, and `git-workflow-and-versioning`.

### T-13: Add Sanity freshness and recovery

- [x] Add a signature-verified webhook for relevant published landing changes.
- [x] Reject invalid signatures, irrelevant events, and invalid requests without invalidating cache.
- [x] Add an explicitly authorized manual recovery path.
- [x] Route both mechanisms through one server-only, idempotent invalidation service.

Verification:

- [x] Tests cover valid/invalid signatures, relevance filtering, duplicate delivery, manual authorization, immediate tag expiration, and shared invalidation routing.
- [!] A deployed release candidate receives one real Sanity webhook successfully; deferred because this repository has no deployed release candidate yet.

Test contracts: `TST-LANDING-003`.

Dependencies: T-12.

Plan: [`2026-08-30-t-13-sanity-freshness-recovery.md`](docs/agentforge/plans/2026-08-30-t-13-sanity-freshness-recovery.md).

Recommended AgentForge skills: `testing-first-class`, `test-driven-development`, `security-and-hardening`, `source-driven-development`, `incremental-implementation`, and `git-workflow-and-versioning`.

Evidence: `pnpm test` (6 files, 32 tests), `pnpm sanity:smoke`, `pnpm typecheck`, `pnpm lint` (one pre-existing `Geist` warning), `pnpm build`, and `git diff --check` all pass. [PR #9](https://github.com/michi-guns/nextjs-todo-list-example/pull/9) was independently reviewed by fresh GPT-5.6-Sol agents until no actionable findings remained. `TST-LANDING-003` is `partial` only because deployed webhook delivery awaits a release candidate.

### T-12A: Audit and refine the materialized UI

- [x] Implement the accepted audit plan in [`docs/agentforge/plans/2026-08-31-t-12a-ui-audit.md`](docs/agentforge/plans/2026-08-31-t-12a-ui-audit.md).
- [x] Review the implemented landing, auth, and dashboard surfaces against the selected direction handoff and current Web Interface Guidelines.
- [x] Add a shared, focus-visible skip-to-content affordance for the persistent public/auth/dashboard navigation and hide the decorative landing preview from the accessibility tree.
- [x] Re-check hierarchy, content density, overflow, responsive behavior, focus management, loading/error/empty states, and interaction clarity; make no speculative changes where the current implementation already satisfies the handoff.
- [x] Confirm the implementation uses project tokens and composable components without adding speculative UI infrastructure.

Recommended agent skills:

- `web-design-guidelines` for a current Web Interface Guidelines review of the implemented files.
- `frontend-ui-engineering` for accessibility, responsive, state, and component-quality corrections.
- `browser-testing-with-devtools` for console, DOM, focus, network, and viewport inspection in a real browser.
- `next-dev-loop` for verifying the corrected behavior in the running Next.js application.

Verification:

- [x] The review produces concrete file/line findings or records that no actionable findings remain.
- [x] Skip links move focus to the primary content region; the UI has no new console errors, obvious overflow, inaccessible controls, missing labels, or color-only critical state cues.
- [x] The selected direction remains recognizable after implementation and the core product flow remains unchanged.
- [x] `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, changed-file formatting, `git diff --check`, and Next.js runtime checks pass; integration evidence is rerun after the final code fix.

Test contracts: `TST-UI-001`, `TST-E2E-001`, `TST-E2E-002`, `TST-E2E-003`.

Dependencies: T-10, T-11, T-12, T-13.

Plan: [`docs/agentforge/plans/2026-08-31-t-12a-ui-audit.md`](docs/agentforge/plans/2026-08-31-t-12a-ui-audit.md).

Implementation scope: `components/ui/skip-link.tsx`, the public/auth/dashboard shell compositions, the landing decorative preview semantics, and the required UI/runtime evidence plus testing-ledger reconciliation. No route, domain, persistence, provider, or product-flow changes are in scope.

Task breakdown: (a) add and wire the shared skip-link and content targets, (b) correct the decorative preview landmark semantics, (c) inspect the four contract viewports and keyboard/focus/state behavior in Chromium, (d) reconcile `TST-UI-001`/`TST-E2E-003`, TODO, and the temporary checkpoint, including the T-15-owned authenticated dashboard skip-target follow-up, and (e) complete the fresh GPT-5.6-Sol pragmatic review loop before closeout.

Evidence: The audit found and fixed the missing persistent-navigation skip affordance and the empty labelled decorative preview landmark. `components/ui/skip-link.tsx` is wired to post-navigation content targets in landing, auth, and dashboard shells; the landing target was corrected after review so Enter followed by Tab reaches the primary `Get started` CTA. Chromium inspection of `/`, `/sign-up`, `/sign-in`, and `/magic-link` confirms first-position skip links, target focus, zero axe violations, no browser errors, and `scrollWidth === innerWidth` at `320x800`, `768x1024`, `1024x768`, and `1440x900`; the unauthenticated `/dashboard` check remains correctly session-gated, with its target covered by source/build inspection and T-10's authenticated runtime evidence. The selected Focus Rail hierarchy and existing state behavior remain unchanged; no speculative UI infrastructure or product/provider/domain changes were added.

Verification: `pnpm test` (20 files, 110 tests), `pnpm test:integration` (6 files, 23 tests against one disposable PostgreSQL 18 Testcontainer), `pnpm typecheck`, `pnpm lint` (one pre-existing `app/layout.tsx:1:10` unused `Geist` warning), `pnpm build`, changed-file Prettier checks, and `git diff --check` pass. Next.js runtime compilation/error checks report no issues. Fresh GPT-5.6-Sol review of pushed implementation tip `7c3d320` found one actionable skip-target issue; it was fixed in `a3eed2c`, and a fresh review of exact pushed tip `a3eed2c` returned **No actionable findings**. PR [#17](https://github.com/michi-guns/nextjs-todo-list-example/pull/17) contains the reviewed branch; TST-UI-001 remains `partial` solely for the authenticated dashboard skip-link activation/next-Tab check now owned by T-15, TST-E2E-003 remains `partial`, and TST-E2E-001/002 remain `specified`.

Dependency recomputation: T-15 is now safely unblocked because T-05, T-09, T-10, T-11, and T-14 are complete; T-17 remains blocked by T-15. No other task became safely implementable from this closeout.

## Checkpoint: core product

- [x] Password and magic-link sign-in work locally.
- [x] The full local journey works: sign in, obtain Inbox, create list, create task, change status, sign out.
- [x] Lists and tasks are private, validated, paginated, and persisted in PostgreSQL.
- [x] The landing page reads Sanity content and cache recovery is protected.
- [x] The selected UI direction is materialized and the implemented surfaces have been audited.

## Phase 4: verification and release evidence

### T-14: Build the PostgreSQL integration harness

- [x] Implement T-14 from the accepted plan in [`docs/agentforge/plans/2026-08-30-t-14-postgresql-harness.md`](docs/agentforge/plans/2026-08-30-t-14-postgresql-harness.md).
- [x] Use `@testcontainers/postgresql` with PostgreSQL 18.
- [x] Start one ephemeral container per integration suite, apply versioned migrations, and clean it up on success or failure.
- [x] Keep integration tests serial, give each test a unique user/data set, and refuse external database URLs in destructive cleanup.

Verification:

- [x] Docker-backed tests fail clearly when Docker is unavailable rather than silently skipping.
- [x] The full repository integration suite passes against the harness-owned database.

Test contracts: `TST-HARNESS-001`, `TST-MIGRATION-001`, `TST-PERSISTENCE-001`, `TST-LISTS-001`, `TST-LISTS-002`, `TST-LISTS-003`, `TST-TASKS-001`, `TST-TASKS-002`, `TST-TASKS-003`, `TST-CONCURRENCY-001`.

Dependencies: T-04, T-06, T-07, T-08.

Implementation scope: `src/test/postgres-harness.ts`, `src/test/postgres-global-setup.ts`, `src/test/postgres-test-setup.ts`, `vitest.integration.config.ts`, harness guard/isolation tests, and the required package/README evidence. Existing integration behavior and migrations remain unchanged; Playwright orchestration is T-15.

Plan: [`2026-08-30-t-14-postgresql-harness.md`](docs/agentforge/plans/2026-08-30-t-14-postgresql-harness.md).

Evidence: `pnpm test` (15 files, 67 tests), `pnpm test:integration` without `TEST_DATABASE_URL` (6 files, 23 tests against one disposable `postgres:18-alpine` Testcontainer), `pnpm typecheck`, `pnpm lint` (one pre-existing `Geist` warning), `pnpm build`, `pnpm exec drizzle-kit check`, `pnpm exec drizzle-kit generate` (no schema changes), changed-file Prettier checks, and `git diff --check` all pass. Harness tests cover local URL refusal, migration splitting, startup-failure reporting, migration-failure cleanup, teardown, PostgreSQL 18 catalog visibility, and isolated schemas. The remaining live Docker-daemon outage and Playwright lifecycle evidence belong to T-15; Neon development-branch migration alignment remains with T-01. No migration files or snapshots changed.

PR: [#13](https://github.com/michi-guns/nextjs-todo-list-example/pull/13) | implementation tip `ce8c4dc`, closeout tip `29d0343`, formatting tip `fbe3948`, and checkpoint tip `dadcd68` received fresh GPT-5.6-Sol reviews with no actionable findings; merged as `df974b9`.

### T-15: Replace the example Playwright suite

- [x] Implement the accepted plan in [`docs/agentforge/plans/2026-08-31-t-15-playwright-harness.md`](docs/agentforge/plans/2026-08-31-t-15-playwright-harness.md).
- [x] Replace the example suite's `playwright.dev` checks with the accepted local todo journeys and shared browser helpers.
- [x] Make `pnpm exec playwright test` own one loopback PostgreSQL 18 Testcontainer, the committed migration chain, deterministic behavior seed, local/test mailbox, dedicated Next.js test server, serial Chromium run, and cleanup on pass or failure.
- [x] Keep the normal project Chromium-only and add an explicit `pnpm test:e2e:cross-browser` (Firefox/WebKit) opt-in without reusing an unknown running server or external database.
- [x] Add password sign-in/sign-out, Inbox/list/task/status, visible list/task pagination, completed-task filtering, two-user privacy isolation, and the remaining authenticated dashboard skip-link/next-Tab checks.
- [x] Add the local mailbox request/read/consume magic-link journey with mailbox cleanup before execution.
- [x] Keep deterministic landing content test-only and application-facing; do not require Sanity credentials or network access for routine Playwright.

Recommended AgentForge skills:

- `using-agent-skills`, `planning`, and `task-breakdown` for the accepted plan and dependency-ordered delivery units.
- `testing-first-class` and `test-driven-development` for the affected durable contracts and red/green browser/runtime loop.
- `incremental-implementation` for the lifecycle, seed, and journey vertical slices.
- `playwright-cli` and `browser-testing-with-devtools` for real Chromium interaction, focus, console, network, and responsive evidence.
- `source-driven-development` for the installed Next.js, Better Auth, Testcontainers, and Playwright APIs.
- `security-and-hardening` for local-only database/mailbox guards and private-data assertions.
- `git-workflow-and-versioning`, `code-review-and-quality`, and `verification-before-completion` for coherent commits, the fresh proportional reviewer loop, and evidence-backed closeout.

Verification:

- [x] Focused landing-fixture and lifecycle tests pass; failures during server, migration, seed, or browser startup report the prerequisite and clean up the container/process/mailbox.
- [x] `pnpm exec playwright test` passes in Chromium against the harness-owned local database and leaves no server, container, mailbox, or browser test artifact that belongs outside the ignored paths.
- [x] The browser evidence covers the deterministic landing fixture, core authenticated journey, magic-link mailbox journey, two-user privacy isolation, seeded pagination/filtering, and dashboard skip-link activation followed by the next logical tab stop.
- [!] The optional cross-browser run was not executed in this routine gate; the runner's `PLAYWRIGHT_CROSS_BROWSER=true` project selection was verified to expose all seven journeys in Firefox and WebKit when those browsers are installed.
- [x] `pnpm test`, `pnpm test:integration`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, changed-file `pnpm exec prettier --check`, `pnpm exec drizzle-kit check --config drizzle.config.ts`, and `git diff --check` pass. The only lint output is the pre-existing `app/layout.tsx:1:10` unused `Geist` warning.

Test contracts: `TST-HARNESS-001`, `TST-AUTH-001`, `TST-AUTH-002`, `TST-AUTH-003`, `TST-UI-001`, `TST-E2E-001`, `TST-E2E-002`, `TST-E2E-003`.

Dependencies: T-05, T-09, T-10, T-11, T-12, T-12A, T-14 (all complete on `main`; T-12 is also transitive through the T-12A landing prerequisite).

Plan: [`docs/agentforge/plans/2026-08-31-t-15-playwright-harness.md`](docs/agentforge/plans/2026-08-31-t-15-playwright-harness.md).

Implementation scope and interfaces:

- `playwright.config.ts` and `e2e/global-setup.ts` own the fixed loopback base URL, serial browser projects, lifecycle startup/readiness, inherited test environment, and cleanup; they consume `startPostgresHarness()` rather than duplicating Testcontainers logic.
- `next.config.ts` selects the ignored `.next-playwright` build directory only under `PLAYWRIGHT_E2E=true`, allowing the dedicated test server to coexist safely with an unrelated default Next dev server.
- `eslint.config.mjs` ignores the generated `.next-playwright` directory so the standard lint gate remains source-only.
- `scripts/playwright-local/seed.ts` owns the explicit Better Auth-backed users and parameterized deterministic lists/tasks; `scripts/playwright-local/run.ts` owns the cross-browser project-selection wrapper.
- `e2e/fixtures.ts` and the journey specs own stable labels/selectors and browser outcomes only; they do not import provider records, credentials, or application database internals beyond the ignored local mailbox reader.
- `src/modules/landing/infrastructure/sanity-landing-reader.ts` receives only a `PLAYWRIGHT_E2E=true` + non-production fixture branch; the normal Sanity path and all domain/persistence/migration behavior remain unchanged.

Task breakdown: the following four delivery units are independently reviewable and must each leave an executable, verifiable tip.

#### T-15.1 — Add the guarded local test runtime

Status: complete at reviewed tip `4ccafe1`.

- Files: `src/modules/landing/infrastructure/sanity-landing-reader.ts`, `src/modules/landing/infrastructure/sanity-landing-reader.test.ts`, `playwright.config.ts`, `e2e/global-setup.ts`, `e2e/runtime-smoke.spec.ts`, `src/test/playwright-lifecycle.test.ts`, and `tsconfig.json`.
- Interfaces: consume `startPostgresHarness()` and `stopPostgresHarness()`; expose the fixed `http://127.0.0.1:3100` base URL, inherited `NODE_ENV=development`, `DATABASE_URL`, `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_LOCAL_MAILBOX`, `BETTER_AUTH_MAILBOX_DIR`, and `PLAYWRIGHT_E2E` values to the server and workers.
- Acceptance: a setup/teardown smoke can start the harness-owned container and dedicated Next.js server, wait for a local landing response, and clean up on success or startup/migration/server failure; the Sanity reader uses deterministic content only under the non-production E2E switch and never in production.
- Contracts/evidence: `TST-HARNESS-001`, `TST-E2E-003`; prove local URL guarding, server readiness, failure cleanup, and the fixture gate. Keep `TST-HARNESS-001` partial until the required live Docker-unavailable observation exists.
- Checks: `pnpm exec vitest run src/modules/landing/infrastructure/sanity-landing-reader.test.ts src/test/playwright-lifecycle.test.ts`; `pnpm exec playwright test e2e/runtime-smoke.spec.ts --project=chromium --grep "local runtime"`; `pnpm typecheck`; and `pnpm lint`. The named smoke test must assert only server readiness and deterministic landing content, not seeded application data.
- Dependencies/unblock: T-12, T-12A, and T-14; T-15.2 consumes the lifecycle seam.
- Recommended skills: `testing-first-class`, `test-driven-development`, `incremental-implementation`, `source-driven-development`, `security-and-hardening`, and `git-workflow-and-versioning`.

Evidence: focused landing/lifecycle Vitest (7 tests), the named Chromium `local runtime` smoke, `pnpm typecheck`, scoped Prettier, and `git diff --check` pass; `pnpm lint` has only the pre-existing `app/layout.tsx:1:10` Geist warning. The isolated `.next-playwright` directory prevents a competing default Next dev lock and repeated runs leave `tsconfig.json` clean. Fresh GPT-5.6-Sol review of `4ccafe1` returned **No actionable findings**. `TST-E2E-003` remains partial until the seeded browser journeys; `TST-HARNESS-001` remains partial pending the required live Docker-unavailable observation.

#### T-15.2 — Add the deterministic behavior seed and browser fixtures

Status: complete at corrected reviewed tip `6f841a3` (closeout review `f73223c`).

- Files: `scripts/playwright-local/seed.ts`, `e2e/fixtures.ts`, `e2e/runtime-smoke.spec.ts`, `e2e/global-setup.ts`, and `src/test/playwright-seed.test.ts`.
- Interfaces: `seedPlaywrightDatabase(databaseUrl: string, baseUrl: string): Promise<PlaywrightSeed>` creates verified scenario users through the real Better Auth handler and local mailbox; `PLAYWRIGHT_USERS` exposes typed `{ email, password, listName }` fixture data to specs; the seed inserts parameterized fixed-ID/timestamp lists and tasks through the harness-owned loopback connection without logging passwords, tokens, mailbox contents, or URLs.
- Acceptance: the seed is repeatable on a fresh container, contains a listless core user whose first dashboard load must provision the ordinary `Inbox`, pagination/completed-filter, skip-link, magic-link, and two privacy users, includes another user's records, and clears the mailbox before handing control to Playwright; no Neon or Sanity network is contacted.
- Contracts/evidence: `TST-HARNESS-001`, `TST-AUTH-001`, `TST-AUTH-002`, `TST-AUTH-003`, `TST-E2E-001`, `TST-E2E-002`, `TST-E2E-003`; prove verified seeded sign-in data and safe mailbox boundaries without replacing browser evidence.
- Checks: `pnpm exec vitest run src/test/playwright-seed.test.ts`; `pnpm exec playwright test e2e/runtime-smoke.spec.ts --project=chromium --grep "behavior seed"` to inspect only non-secret seeded labels/counts through the browser; `pnpm test`; and `pnpm test:integration`.
- Dependencies/unblock: T-15.1; T-15.3 consumes the exported fixtures.
- Recommended skills: `testing-first-class`, `test-driven-development`, `incremental-implementation`, `security-and-hardening`, and `git-workflow-and-versioning`.

Evidence: the seed-plan Vitest checks (4 tests), the named Chromium `behavior seed` smoke, the full Vitest suite (23 files, 121 tests), and the local PostgreSQL integration suite (23 tests) pass. The seed creates six Better Auth-verified scenario users through the local mailbox, leaves the core user listless so the application provisions the ordinary `Inbox`, inserts parameterized fixed-ID/timestamp records for the other scenarios, and clears the mailbox before browser control. Fresh GPT-5.6-Sol reviews of `7c59536` and corrected tip `6f841a3` returned **No actionable findings**; the final closeout tip `f73223c` also returned **No actionable findings**.

#### T-15.3 — Replace the example suite with Chromium journeys

Status: complete at reviewed implementation tip `2efa151`.

- Files: replace `e2e/example.spec.ts` with `e2e/core-journey.spec.ts`, `e2e/magic-link.spec.ts`, `e2e/privacy.spec.ts`, and `e2e/ui-contract.spec.ts`; add `e2e/fixtures.ts` and extend `e2e/runtime-smoke.spec.ts` only with the named seed smoke case.
- Interfaces: `signInWithPassword(page: Page, user: PlaywrightSeedUser): Promise<void>` and `readMagicLinkWithRetry(email: string): Promise<MagicLinkMessage>` are the only shared browser helpers; use stable accessible labels and existing route/action boundaries; read the local mailbox only through `readLatestMagicLink()`/`clearMagicLinkMailbox()`; do not reach into Drizzle repositories or provider records.
- Acceptance: serial Chromium journeys assert the deterministic landing copy, password sign-in/automatic `Inbox` provisioning/list/task/status/sign-out and private-route redirect, seeded list/task pagination and completed filtering, two-user UI/API privacy isolation, magic-link request/read/consume, and dashboard skip-link activation followed by the next logical tab stop. Created names are project-qualified so an opt-in cross-browser repetition is order-independent.
- Contracts/evidence: `TST-AUTH-001`, `TST-AUTH-002`, `TST-AUTH-003`, `TST-UI-001`, `TST-E2E-001`, `TST-E2E-002`, `TST-E2E-003`; record real browser URLs/outcomes and no weaker substitute.
- Checks: `pnpm exec playwright test` in Chromium, with console errors and unexpected network failures treated as test failures; preserve traces/reports only in ignored paths.
- Dependencies/unblock: T-15.2; T-15.4 consumes the complete journey evidence.
- Recommended skills: `playwright-cli`, `browser-testing-with-devtools`, `testing-first-class`, `test-driven-development`, `incremental-implementation`, and `security-and-hardening`.

Evidence: the exact Chromium run passes all seven journeys: deterministic landing, password sign-in/list/task/status/sign-out/private redirect, local mailbox magic-link request/read/consume, two-user UI/API privacy isolation, both cursor continuations with pre/post assertions, completed-task filtering, and dashboard skip-link activation followed by the next tab stop. Browser diagnostics fail on console errors, page errors, and unexpected request failures; the external `playwright.dev` sample is removed. Fresh GPT-5.6-Sol review of `2efa151` returned **No actionable findings**.

#### T-15.4 — Add opt-in browsers and close out the task

Status: complete at final reviewed closeout tip `f73223c`; merged as PR #18 (`3c4b0d5`).

- Files: `scripts/playwright-local/run.ts`, `package.json`, `playwright.config.ts`, `tsconfig.json`, the four named `e2e/*.spec.ts` files, `TODO.md`, `.dwf/decisions/TESTING.md`, `docs/agentforge/plans/2026-08-31-t-15-playwright-harness.md`, and `docs/agentforge/temporary/2026-08-30-implementation-run.md`.
- Interfaces: default direct Playwright invocation remains Chromium-only; `run.ts` sets `PLAYWRIGHT_CROSS_BROWSER=true` only for `pnpm test:e2e:cross-browser`, and `playwright.config.ts` expands the project list to Firefox/WebKit when that exact switch is true while retaining the same local lifecycle and no unknown-server reuse.
- Acceptance: the opt-in command is documented and selectable, all required gates pass, affected contracts and evidence are reconciled honestly, and the dependency graph is recomputed so T-17 is unblocked only after the final reviewed tip.
- Contracts/evidence: reconcile all eight T-15 contracts; keep `TST-HARNESS-001` partial if Docker-outage evidence is not observed, and mark browser contracts verified only when the landing assertion and all required journeys pass.
- Checks: `pnpm test`, `pnpm test:integration`, `pnpm exec playwright test`, optional `pnpm test:e2e:cross-browser`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm exec prettier --check package.json playwright.config.ts tsconfig.json e2e/fixtures.ts e2e/runtime-smoke.spec.ts e2e/core-journey.spec.ts e2e/magic-link.spec.ts e2e/privacy.spec.ts e2e/ui-contract.spec.ts e2e/global-setup.ts scripts/playwright-local/run.ts scripts/playwright-local/seed.ts src/modules/landing/infrastructure/sanity-landing-reader.ts src/modules/landing/infrastructure/sanity-landing-reader.test.ts src/test/playwright-lifecycle.test.ts src/test/playwright-seed.test.ts TODO.md docs/agentforge/plans/2026-08-31-t-15-playwright-harness.md`, `pnpm exec drizzle-kit check --config drizzle.config.ts`, and `git diff --check`.
- Dependencies/unblock: T-15.3; the corrected core Inbox journey and final closeout metadata received fresh GPT-5.6-Sol reviews with no actionable findings, so T-15 is complete and T-17 is unblocked.
- Recommended skills: `code-review-and-quality`, `verification-before-completion`, `git-workflow-and-versioning`, `testing-first-class`, and `unslop`.

Evidence: the corrected focused seed tests pass 4/4; `pnpm test` passes 23 files/121 tests; `pnpm test:integration` passes 6 files/23 tests against one disposable PostgreSQL 18 Testcontainer; `pnpm test:e2e` passes all 7 serial Chromium journeys against the harness-owned database and dedicated Next.js server, including automatic core `Inbox` provisioning; project selection with `PLAYWRIGHT_CROSS_BROWSER=true` lists the same 7 journeys for Chromium, Firefox, and WebKit (21 tests total); `pnpm typecheck`, `pnpm lint` (only the pre-existing `app/layout.tsx:1:10` unused `Geist` warning), `pnpm build`, scoped Prettier, `pnpm exec drizzle-kit check --config drizzle.config.ts`, and `git diff --check` pass. Cleanup leaves no port 3100 or task-owned PostgreSQL container. Fresh GPT-5.6-Sol reviews of corrected implementation tip `6f841a3` and final closeout tip `f73223c` returned **No actionable findings**. PR #18 merged as `3c4b0d5`. `TST-AUTH-001`, `TST-AUTH-002`, `TST-AUTH-003`, `TST-UI-001`, `TST-E2E-001`, `TST-E2E-002`, and `TST-E2E-003` are verified; `TST-HARNESS-001` remains partial only for the live Docker-outage observation.

Dependency checkpoint: T-15 is complete at final reviewed closeout tip `f73223c` and merged as PR #18 (`3c4b0d5`); T-17 is now the next safely unblocked task. `TST-HARNESS-001` remains `partial` only for the unobserved live Docker-daemon outage; the browser lifecycle evidence is complete.

### T-16: Produce Neon performance evidence

- [x] Add a guarded, repeatable `pnpm neon:performance` script that obtains the authoritative development endpoint through the Neon CLI, refuses non-development targets (including a mismatched `DATABASE_URL` override), and replaces only its two deterministic synthetic users.
- [x] Create the separate Neon development-branch performance seed: approximately 100 lists, 10,000 tasks in one list, and another user's records.
- [x] Run `EXPLAIN ANALYZE` for representative first-page and next-page list/task queries, including completed-task filtering when its SQL differs.
- [x] Verify correct cursor behavior at page size 100 and a warm 20-record database query under 50 ms with compute active.
- [x] Record redacted hosted evidence outside `.dwf` and reconcile the performance test contract, task status, and dependency checkpoint.

Verification:

- [x] The script's focused tests and hosted run pass with seed counts, ownership isolation, deterministic cursor continuation/termination, and non-secret evidence output.
- [x] Query plans use the intended composite indexes without a full sequential scan of the lists or tasks table.
- [x] The warm target is measured from server-reported database execution after compute is active and data is warm; network, authentication, rendering, CMS access, and compute startup are explicitly excluded.
- [x] `pnpm test`, `pnpm test:integration`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, changed-file Prettier checks, and `git diff --check` pass.

Test contracts: `TST-PERFORMANCE-001`.

Dependencies: T-01, T-04, T-08.

Implementation scope: `scripts/verify-neon-performance/`, the single `pnpm neon:performance` package command, the semantic-preserving explicit `NULLS LAST` task ordering in `src/modules/tasks/infrastructure/drizzle-task-repository.ts`, redacted evidence under `docs/agentforge/evidence/`, this T-16 entry, `TST-PERFORMANCE-001` reconciliation, and the temporary implementation checkpoint. No application routes, migrations, schema changes, production/default-branch operations, or local behavior-seed changes.

Plan: [`2026-08-30-t-16-neon-performance-evidence.md`](docs/agentforge/plans/2026-08-30-t-16-neon-performance-evidence.md).

Evidence: [`docs/agentforge/evidence/t16-neon-performance.json`](docs/agentforge/evidence/t16-neon-performance.json) records the direct development-branch run: 101 primary lists, 10,000 primary tasks in one list, 10,000 secondary-owner tasks, six index-backed plans with no lists/tasks sequential scans, owner isolation, maximum-page-size cursor checks, and ten warmed server-reported execution samples with a 0.086 ms maximum against the 50 ms target. The artifact records the `pnpm neon:performance` command, commit `7837a69cf8cacaa01825e324d305d799e42fce07`, and ref `task/t-16-neon-performance-evidence`. Focused core tests and the full suite pass (18 files/92 tests); local integration passes (6 files/23 tests against one disposable PostgreSQL 18 Testcontainer); typecheck and build pass; lint reports only the pre-existing `app/layout.tsx:1:10 Geist` warning; changed-file Prettier and diff checks pass. The task repository now expresses explicit `NULLS LAST` ordering to match the existing task index without changing `NOT NULL` result semantics. The CLI obtains the development endpoint independently through `neon connection-string development` and rejects a supplied default-branch URL before mutation. PR [#16](https://github.com/michi-guns/nextjs-todo-list-example/pull/16) is reviewed through final metadata tip `85d3998` with no actionable findings and merged as `5e40bfd`.

### T-17: Finish documentation and final quality gates

- [x] **T-17.1: Document setup and environment boundaries**
  - Files: `README.md`; preserve the canonical DWF links and leave `.env.local` untracked.
  - Interfaces: document the current `DATABASE_URL`, optional `DATABASE_URL_UNPOOLED`, `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_LOCAL_MAILBOX`, `BETTER_AUTH_MAILBOX_DIR`, `NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET`, `NEXT_PUBLIC_SANITY_API_VERSION`, `SANITY_REVALIDATE_SECRET`, and `SANITY_MANUAL_RECOVERY_SECRET` categories without values.
  - Acceptance: a new contributor can install dependencies, configure local application/auth values, understand the direct migration URL, run the app, identify the separate Sanity live smoke, and understand the test-only mailbox and deterministic Playwright landing fixture.
  - Contracts/evidence: preserve the environment and local-quality obligations in `TST-FOUNDATION-001`, `TST-HARNESS-001`, `TST-AUTH-002`, `TST-LANDING-002`, and `TST-E2E-002`; no executable behavior changes or new test contract is introduced.
  - Checks: changed-file Prettier check and `git diff --check` passed; fresh GPT-5.6-Sol review of the corrected README found no actionable findings.
  - Dependencies: accepted plan `docs/agentforge/plans/2026-08-31-t-17-documentation-quality.md`; no source or external-service prerequisite.
  - Recommended AgentForge skills: `documentation-and-adrs`, `unslop`, `git-workflow-and-versioning`.

- [x] **T-17.2: Add implementation command and recovery runbook**
  - Files: new `docs/runbooks/local-development-and-verification.md`; `docs/runbooks/index.md`; keep `docs/runbooks/failed-database-migration.md` and `docs/runbooks/sanity-integration-failure.md` authoritative for detailed failure response.
  - Interfaces: copyable PowerShell commands for `pnpm install`, `pnpm dev`, Drizzle check/generate/migrate, `pnpm test`, `pnpm test:integration`, `pnpm test:e2e`, `pnpm test:e2e:cross-browser`, and `pnpm sanity:smoke`; links to the existing recovery endpoints/runbooks.
  - Acceptance: commands use placeholders rather than credentials; migration guidance follows TD-025 (consolidate only safely recreatable pre-release history and use forward migrations for shared/production history); routine database cleanup cannot target Neon or another external database; no production deployment is implied.
  - Contracts/evidence: document the evidence boundaries for `TST-MIGRATION-001`, `TST-HARNESS-001`, `TST-LANDING-002`, and `TST-LANDING-003` without changing their status until verification reconciliation.
  - Checks: changed-file Prettier check, relative-link check, and `git diff --check` passed; fresh GPT-5.6-Sol review found one omission and one fallback-wording ambiguity, both fixed and re-reviewed with no actionable findings.
  - Dependencies: T-17.1 for navigation/terminology; existing runbooks and package scripts.
  - Recommended AgentForge skills: `documentation-and-adrs`, `migration-history-workflow`, `unslop`, `git-workflow-and-versioning`.

- [x] **T-17.3: Run final gates and reconcile delivery evidence**
  - Files: `TODO.md`; `.dwf/decisions/TESTING.md` only where final evidence requires a factual reconciliation; `docs/agentforge/temporary/2026-08-30-implementation-run.md`; accepted T-17 plan status.
  - Interfaces: no runtime interface changes; reconcile active `TST-*` IDs, exact command results, known warnings, optional cross-browser/deployment checks, and the dependency graph.
  - Acceptance: SPEC definition of done is reviewed item by item; all required local checks have evidence; skipped checks and remaining partial/deferred contracts are explicit; T-17 is marked complete only after a clean fresh GPT-5.6-Sol proportional review.
  - Contracts/evidence: reconcile every active contract in `.dwf/decisions/TESTING.md`; do not mark hosted migration, Docker-outage, concurrent, or deployed-Sanity evidence verified unless the required evidence actually exists.
  - Checks: `pnpm typecheck`; `pnpm lint`; `pnpm test`; `pnpm test:integration`; `pnpm test:e2e`; `pnpm exec drizzle-kit check --config drizzle.config.ts`; `pnpm exec prettier --check` for changed files; `pnpm build`; `git diff --check`. Verify cross-browser project selection separately when useful, but keep its execution optional.
  - Dependencies: T-17.1 and T-17.2; Docker and Chromium are required for the named local suites, while Sanity credentials are required only for `pnpm sanity:smoke`.
  - Recommended AgentForge skills: `code-review-and-quality`, `verification-before-completion`, `documentation-and-adrs`, `unslop`, `git-workflow-and-versioning`.

Verification:

- [x] All required local acceptance items have evidence: `pnpm typecheck`, `pnpm lint`, `pnpm test` (23 files/121 tests), `pnpm test:integration` (6 files/23 tests against one disposable PostgreSQL 18 Testcontainer), `pnpm test:e2e` (7 serial Chromium journeys), `pnpm sanity:smoke`, `pnpm exec drizzle-kit check --config drizzle.config.ts`, `pnpm build`, changed-file Prettier, relative-link checks, and `git diff --check`.
- [x] Skipped checks, pre-existing warnings, and remaining risks are recorded: the opt-in cross-browser command was not executed in Firefox/WebKit, but project selection exposes 21 tests; lint retains only the pre-existing `app/layout.tsx:1:10` unused `Geist` warning; `TST-MIGRATION-001` is blocked on an explicitly authorized non-default Neon branch realignment, `TST-HARNESS-001` remains partial for the unobserved Docker-outage scenario, and `TST-LANDING-003` remains partial for deployed webhook delivery. `TST-CONCURRENCY-001` is verified by the existing application and PostgreSQL commit-ordering/disjoint-field evidence.
- [x] A fresh GPT-5.6-Sol reviewer found no actionable findings on the final metadata tip after the historical-status reconciliation.

Test contracts: reconcile every active baseline contract in [`TESTING.md`](.dwf/decisions/TESTING.md) before closing this task.

Dependencies: T-12A, T-14, T-15, T-16 (all complete on `main` after PR #18 merged as `3c4b0d5`).

Plan: [`2026-08-31-t-17-documentation-quality.md`](docs/agentforge/plans/2026-08-31-t-17-documentation-quality.md).

Dependency checkpoint: T-17.1, T-17.2, and T-17.3 are complete at the final
reviewed documentation tip. The baseline is complete. T-18.1 through T-18.4,
T-19, T-20, and T-21 are complete. Harness outage observation and deployed
Sanity delivery remain evidence conditions rather than reasons to alter the
baseline.

## Phase 5: environment and delivery pipeline

This phase records the next proposed workstream. It deliberately separates
design decisions, local development, durable hosted development, automatic CI,
manual Preview delivery, manual Production release, pipeline verification, and
documentation. T-18 through T-25 are the core environment workstream; T-26
through T-29 are follow-on improvements that should not be pulled into the
initial deployment foundation without a new scope decision.

### T-18: Establish the environment contract and fail-closed target guardrails

- [x] Complete T-18 after all four contract, guardrail, and focused-test subtasks are accepted. This is the design and safety gate for the workstream.

- Files: `.dwf/CONTEXT.md`, `.dwf/decisions/TECHNICAL.md`, `.dwf/decisions/TESTING.md`, `.dwf/output/agent/PRD.md`, `.dwf/output/agent/SPEC.md`, `docs/agentforge/plans/2026-08-31-t-18-environment-delivery-pipeline.md`, `docs/architecture/`, `docs/runbooks/`, `scripts/environment/`, `src/test/`, and `TODO.md`, limited to the smallest files selected by the subtasks below.
- Interfaces: application-owned `APP_ENV` values `local`, `development`, `preview`, and `production`; explicit pooled runtime versus direct migration database roles; expected database branch/project identity; environment-specific application origin, Better Auth URL/secret, Sanity dataset/policy, mail transport, mutation permissions, and destructive-operation permissions; redacted target diagnostics; exact-ref input and resolved commit output for delivery commands.
- Acceptance: the four run contexts are defined without overloading Next.js `NODE_ENV`; every environment has an explicit target contract; local database reset and remote migration/deployment commands fail closed before mutation when their target is missing, mismatched, remote, production, or otherwise unsafe; secrets are never printed or committed; the current Neon `main` default used by `.env.local` is not silently promoted to Development or Production; unresolved Preview Sanity, Preview mail, and Production database choices are recorded as decisions rather than guessed in code.
- Contracts/evidence: T-18.1 must add or amend the canonical decision-ledger entries and formalize the `TST-ENV-001`, `TST-PIPELINE-001`, `TST-PREVIEW-001`, and `TST-RELEASE-001` contracts before implementation adds their behavior. Preserve and reconcile existing `TST-FOUNDATION-001`, `TST-MIGRATION-001`, `TST-HARNESS-001`, `TST-LANDING-002`, and `TST-LANDING-003` honestly.
- Checks: read the applicable DWF and installed framework guidance; run focused environment tests introduced by T-18.4; `pnpm typecheck`; `pnpm lint`; `pnpm test`; changed-file Prettier checks; and `git diff --check`. Do not claim hosted or production evidence from local tests.
- Dependencies/unblock: baseline T-17 is complete. T-18.1 must complete before T-18.2/T-18.3; T-18.4 depends on the accepted contract and guard implementation. T-19, T-20, T-21, T-22, and T-23 depend on the applicable T-18 subtasks.
- Recommended AgentForge skills: `planning`, `spec-driven-development`, `testing-first-class`, `test-driven-development`, `documentation-and-adrs`, `security-and-hardening`, `neon-postgres`, `neon-postgres-branches`, `ci-cd-and-automation`, and `git-workflow-and-versioning`.
- Plan: [`2026-08-31-t-18-environment-delivery-pipeline.md`](docs/agentforge/plans/2026-08-31-t-18-environment-delivery-pipeline.md).

#### T-18.1: Reconcile authority, settle open environment choices, and add test contracts

- [x] Complete T-18.1 before implementing environment profiles or deployment workflows.
- Files: `.dwf/CONTEXT.md`, `.dwf/decisions/TECHNICAL.md`, `.dwf/decisions/TESTING.md`, `.dwf/output/agent/PRD.md`, `.dwf/output/agent/SPEC.md` only where an accepted decision or contract genuinely belongs, `docs/agentforge/plans/2026-08-31-t-18-environment-delivery-pipeline.md`, and `TODO.md`.
- Interfaces: a written environment matrix and decision record covering Local, Development, Preview, and Production; a resolved answer for Preview Sanity source/dataset, Preview email delivery or controlled-account strategy, and the Production database project/branch; canonical `TST-ENV-001`, `TST-PIPELINE-001`, `TST-PREVIEW-001`, and `TST-RELEASE-001` definitions with evidence boundaries and dependency links.
- Acceptance: the stale scaffold snapshot in `.dwf/CONTEXT.md` is reconciled or explicitly superseded with verified current-state evidence; the chosen design preserves local Docker PostgreSQL plus hosted Sanity; durable Neon Development is distinguished from ephemeral isolated Preview branches; Production is not assumed to be Neon `main` until schema/migration alignment and protection are explicitly approved; manual Preview and manual exact-ref Production are stated as requirements; all unresolved choices have an owner, rationale, and follow-up rather than an implementation default hidden in environment variables.
- Contracts/evidence: update the canonical testing ledger before executable implementation. Keep hosted boundary evidence (Neon/Vercel/Sanity) separate from unit or local harness evidence, and leave existing partial/blocked statuses unchanged unless new evidence actually resolves them.
- Verification: `TD-026` records the four-profile matrix and resolves Preview Sanity to the dedicated non-production dataset, Preview mail to a controlled verified account, and Production to a separately provisioned protected Neon project/branch. The generated Agent/Human SPEC projections and `.dwf/CONTEXT.md` now distinguish the runnable local baseline from unprovisioned hosted targets. `TST-ENV-001`, `TST-PIPELINE-001`, `TST-PREVIEW-001`, and `TST-RELEASE-001` are canonical `specified` contracts with local versus hosted evidence boundaries; existing partial/blocked contract statuses are unchanged.
- Checks: decision/contract consistency review against PRD, SPEC, technical/product ledgers, and the accepted plan; `pnpm sanity:smoke` (read-only Sanity smoke passed); changed-file Prettier checks; relative-link check; and `git diff --check`.
- Dependencies/unblock: T-17; complete. This subtask unblocks T-18.2 and T-18.3. It does not provision, reset, or migrate any Neon branch.
- Recommended AgentForge skills: `planning`, `spec-driven-development`, `documentation-and-adrs`, `testing-first-class`, `neon-postgres-branches`, `ci-cd-and-automation`, and `unslop`.

#### T-18.2: Define profile, secret, and command contracts

- [x] Complete T-18.2 after T-18.1 accepts the environment matrix and canonical contracts.
- Files: the selected environment configuration seat under `scripts/environment/` (or an explicitly documented equivalent), non-secret `.env.example`/profile documentation, `package.json` only for truthful command aliases, `README.md`/runbook references only when required to expose the contract, and focused tests.
- Interfaces: typed profile parsing and validation; `APP_ENV`/`NODE_ENV` separation; runtime `DATABASE_URL` and migration `DATABASE_URL_UNPOOLED` roles; expected database target identity; Better Auth origin/secret; Sanity project/dataset/API version and write/revalidation policy; mail transport; Vercel/GitHub environment ownership; redacted `environment:inspect`-style diagnostics; exact-ref argument shape for preview/release commands.
- Acceptance: profiles reject missing required values, production secrets in non-production profiles, local mailbox use in deployed profiles, unapproved remote targets for local reset, pooled URLs used for migrations, direct URLs used as runtime defaults where pooling is required, invalid origins, and ambiguous target identity; every profile documents which operations are allowed; diagnostics show names and safe metadata only.
- Contracts/evidence: implement the contract described by `TST-ENV-001` after T-18.1 records it; preserve existing Better Auth, Sanity, migration, and harness boundaries. No provider-swapping framework is introduced.
- Verification: `scripts/environment/core.ts` and `scripts/environment/cli.ts` provide the typed profile parser, validated sensitive configuration result, redacted inspection command, and delivery argument boundary; [`docs/runbooks/environment-profiles.md`](docs/runbooks/environment-profiles.md) records the non-secret profile matrix and operation permissions; `src/test/environment/profile.test.ts` passes 20 focused tests; the CLI succeeds with a synthetic Local profile and emits no secret or connection value; `pnpm typecheck`, `pnpm lint` (0 errors; the existing `app/layout.tsx` unused `Geist` warning remains), changed-file Prettier checks, and `git diff --check` pass.
- Checks: focused profile/validation tests, `pnpm typecheck`, `pnpm lint`, changed-file Prettier checks, and `git diff --check`.
- Dependencies/unblock: T-18.1. T-19 through T-23 consume this contract; no task may duplicate ad hoc environment parsing.
- Recommended AgentForge skills: `testing-first-class`, `test-driven-development`, `security-and-hardening`, `api-and-interface-design`, `source-driven-development`, and `git-workflow-and-versioning`.

#### T-18.3: Implement target classification and fail-closed guards

- [x] Complete T-18.3 after T-18.2 defines the profile and target interfaces.
- Files: the selected `scripts/environment/` guard implementation, migration/reset/seed/deployment command adapters as needed, `db/` only if a target assertion must be enforced at the existing boundary, focused tests, and command documentation.
- Interfaces: target classifier that checks provider/project/branch identity rather than trusting a friendly branch name; guard functions for local reset, migration, seed replacement, preview cleanup, and Production deployment; safe error codes/messages; resolved-ref/target evidence objects with secrets redacted.
- Acceptance: a stale Neon `main` value cannot be used by a Local command; a Preview or Development command cannot mutate Production; a Production migration or deployment command cannot proceed with an unapproved or unresolved ref; a migration command cannot silently fall back from the direct URL to a pooled URL when direct access is required; every refusal happens before mutation and explains the smallest corrective action. The guard module is runtime-neutral for the future PowerShell and CI adapters; no state-changing command adapter exists in this slice.
- Contracts/evidence: `TST-ENV-001` and the relevant existing migration/harness contracts; prove refusal paths with focused guard tests and disposable/local target fixtures, not by experimenting against Production. TST-ENV-001 remains `partial` because hosted target identity, protected secrets, and Production mail evidence belong to later delivery tasks.
- Verification: `scripts/environment/guards.ts` now validates supplied Local/Neon identities and exposes pre-mutation guards for reset, migration, seed replacement, Preview cleanup/deployment, and Production deployment. Production migration shares the exact-ref/protected-approval proof with deployment. `src/test/environment/guards.test.ts` passes 37 focused tests, including project/branch and endpoint mismatch, required Neon endpoint evidence, harness-ownership correlation, pooled URL fallback, explicit-port/database and endpoint-override query rejection, exact resolved ref kind/SHA, Preview ID correlation, Production migration approval, redacted evidence, localhost/loopback equivalence, and mutation non-invocation on refusal. Provider authenticity and hosted identity evidence remain future adapter/task boundaries.
- Checks: focused guard suite, negative target-matrix tests, `pnpm typecheck`, changed-file ESLint, changed-file Prettier checks, and `git diff --check` pass. No hosted or Production evidence was claimed.
- Dependencies/unblock: T-18.1 and T-18.2. T-19, T-20, T-22, and T-23 must use these guards rather than bypassing them.
- Recommended AgentForge skills: `testing-first-class`, `test-driven-development`, `security-and-hardening`, `neon-postgres`, `neon-postgres-branches`, `ci-cd-and-automation`, and `git-workflow-and-versioning`.

#### T-18.4: Prove the environment contract with focused tests

- [x] Complete T-18.4 after T-18.2 and T-18.3 are implemented and reviewed.
- Files: `src/test/` or the chosen environment test seat, any test fixtures under `scripts/`, `.dwf/decisions/TESTING.md` only for evidence reconciliation, and `TODO.md` evidence.
- Interfaces: deterministic test matrix for profile parsing, target classification, safe redaction, pooled/direct role selection, exact-ref resolution, and refusal-before-mutation behavior; no test fixture may require a Production credential or reset a shared Neon branch.
- Acceptance: tests cover valid Local/Development/Preview/Production profiles, missing and conflicting variables, wrong branch/project identity, invalid origin, secret leakage, local mailbox rejection for deployed contexts, exact tags/SHAs/ambiguous refs, and destructive-command refusal; the suite is fast enough for local and CI use and does not weaken existing integration/E2E boundaries.
- Contracts/evidence: establish the executable local portion of `TST-ENV-001`; record which Preview/Production claims remain boundary evidence for T-22/T-23/T-24 rather than pretending unit tests prove them.
- Checks: focused test command introduced by this subtask; `pnpm test`; `pnpm typecheck`; changed-file Prettier checks; `git diff --check`.
- Dependencies/unblock: T-18.1, T-18.2, and T-18.3. Completion unblocks the local, hosted development, and CI tasks.
- Recommended AgentForge skills: `testing-first-class`, `test-driven-development`, `security-and-hardening`, `verification-before-completion`, and `git-workflow-and-versioning`.

Verification:

- [x] `pnpm exec vitest run src/test/environment` passes 3 files and 93 tests; `pnpm test` passes 26 files and 214 tests.
- [x] `pnpm typecheck`, `pnpm lint` (0 errors; the pre-existing `app/layout.tsx:1:10` unused `Geist` warning remains), changed-file Prettier checks, and `git diff --check` pass.
- [x] Local tests prove only profile and guard behavior. Hosted provider identity, Vercel/Sanity boundaries, protected secrets, and Production mail remain future evidence for T-20, T-21.5, T-22, T-23, and T-24; no shared or Production target was mutated.
- [x] PR: [#22](https://github.com/michi-guns/nextjs-todo-list-example/pull/22) is open from `task/T-18.4-environment-contract-tests`; final implementation tip `19c1d8b` received fresh GPT-5.6-Sol review with no actionable findings.

### T-19: Establish persistent Local Docker PostgreSQL while retaining hosted Sanity

- [x] Complete T-19 with a repeatable local Docker workflow and runtime evidence.
- Files: `docker-compose.yml` or a repository-local equivalent under `scripts/local-postgres/`, `package.json`, `.env.example`/local setup documentation, `README.md`, `docs/runbooks/local-development-and-verification.md`, and local lifecycle tests.
- Interfaces: explicit `pnpm dev:local` and database lifecycle commands for start/readiness/migrate/seed/stop; loopback-only local database target; the existing real Sanity client/configuration; the existing local/test mailbox; existing Testcontainers and Playwright flows remain available and are not silently redirected to Neon.
- Acceptance: a contributor can start a persistent PostgreSQL 18 container, apply the committed migration chain, seed safe local data, run the app, authenticate through the local mailbox, exercise todo behavior, and read the real hosted Sanity landing path; local reset refuses every remote target; interrupted startup, migration failure, and seed failure leave a recoverable state; local commands never require Neon or Vercel credentials.
- Contracts/evidence: `TST-ENV-001`, `TST-FOUNDATION-001`, `TST-HARNESS-001`, `TST-MIGRATION-001` where local evidence applies, `TST-AUTH-002`, `TST-LANDING-002`, and `TST-E2E-001`–`TST-E2E-003`; record Docker-daemon outage evidence only if observed.
- Checks: focused local lifecycle tests; `pnpm typecheck`; `pnpm lint`; `pnpm test`; `pnpm test:integration`; the relevant local browser smoke; `pnpm build`; changed-file Prettier checks; and `git diff --check`.
- Dependencies/unblock: T-18 complete; Docker is a required prerequisite for runtime verification. T-19 and T-20 may be developed in parallel after the shared contract, but T-21 consumes their stable command boundaries.
- Recommended AgentForge skills: `testing-first-class`, `test-driven-development`, `incremental-implementation`, `security-and-hardening`, `next-dev-loop`, `browser-testing-with-devtools`, and `git-workflow-and-versioning`.
- Plan: [`2026-09-03-t-19-local-docker-postgres.md`](docs/agentforge/plans/2026-09-03-t-19-local-docker-postgres.md).

Verification:

- [x] `pnpm exec vitest run scripts/local-postgres/core.test.ts` passes 14 focused tests for command parsing, loopback Compose identity, Neon/remote refusal before mutation, migrate-failure recovery, and password-free errors.
- [x] `pnpm local:postgres -- start` started `postgres:18-alpine` on `127.0.0.1:5432`; migrate applied users/lists/tasks/auth tables; seed created verified `local-dev@example.test`; sign-in against that database returned HTTP 200; reset of a Neon Development profile failed with `target_mismatch` and left data intact; a matching Local reset wiped public tables; stop kept the volume.
- [x] `pnpm test` passes 27 files and 228 tests; `pnpm test:integration` passes 6 files and 23 tests against one disposable PostgreSQL 18 Testcontainer, not the Compose volume.
- [x] `pnpm typecheck`, `pnpm lint` (0 errors; the pre-existing `app/layout.tsx:1:10` unused `Geist` warning remains), `pnpm build`, `pnpm sanity:smoke`, changed-file Prettier checks, and `git diff --check` pass.
- [x] Local Docker commands never required Neon or Vercel credentials. `TST-ENV-001` remains `partial` for hosted identity. `TST-MIGRATION-001` remains blocked on an owner-authorized Neon branch. Docker-daemon outage was not observed.
- [x] Fresh proportional review of the T-19 artifact found no actionable findings. Optional nits about `redactSecrets()` coverage and a verification-retry edge case were deferred.
- [x] PR: [#23](https://github.com/michi-guns/nextjs-todo-list-example/pull/23) is open from `task/T-19-local-docker-postgres`; implementation tip `4a03a9c`.

### T-20: Establish a durable Neon Development target

- [x] Complete T-20 only after an owner-authorized durable Neon Development target exists.
- Files: environment/profile adapters, Neon branch/connection helpers under `scripts/`, safe Development seed scripts/fixtures, migration smoke tests, `README.md`, `docs/runbooks/`, and redacted evidence under `docs/agentforge/evidence/` when hosted verification is performed.
- Interfaces: owner-authorized durable Neon Development project/branch; pooled runtime URL and direct migration URL; safe non-production seed modes for ordinary development, browser behavior, and performance; branch identity assertion; migration smoke and redacted target inspection commands.
- Acceptance: the developer can run the Next.js process locally against the durable Neon Development branch while using hosted Sanity; Drizzle migrations use the direct endpoint and application traffic uses the pooled endpoint; the target is not the temporary agent branch and does not expire unexpectedly; Development seed modes are deterministic and never reset Production or personal records; schema/migration evidence is captured on the authorized non-default target.
- Contracts/evidence: close or advance `TST-MIGRATION-001` only with the required branch-first evidence; preserve `TST-PERFORMANCE-001`'s guarded Development target behavior; reconcile `TST-FOUNDATION-001`, `TST-PERSISTENCE-001`, and `TST-ENV-001` where applicable. The currently observed temporary Development branch expires on 2026-09-02 and cannot satisfy this task without explicit durable replacement/authorization.
- Checks: Neon target/branch inspection; direct migration smoke; safe seed and rollback/refusal tests; `pnpm neon:performance` where relevant; `pnpm test`; `pnpm test:integration`; `pnpm typecheck`; `pnpm lint`; `pnpm build`; redacted evidence review; and `git diff --check`.
- Dependencies/unblock: T-18; owner-authorized durable Neon target and credentials are required. Do not reset or consolidate the current Neon `main` branch as a shortcut.
- Recommended AgentForge skills: `neon`, `neon-postgres`, `neon-postgres-branches`, `migration-history-workflow`, `testing-first-class`, `test-driven-development`, `security-and-hardening`, and `git-workflow-and-versioning`.
- Plan: [`2026-09-03-t-20-durable-neon-development.md`](docs/agentforge/plans/2026-09-03-t-20-durable-neon-development.md).

Verification:

- [x] `pnpm exec vitest run scripts/neon-development/core.test.ts` passes 11 focused tests for command parsing, identity matching, expiry/main/project refusal, pooled-migration refusal, provision-without-URLs, and redacted inspect output.
- [x] `pnpm neon:development -- provision` created durable branch `development` (`br-super-leaf-axfwoi2e`) in project `curly-dust-60603928` from `main` with no expiration.
- [x] Direct migrate applied the second committed hash; catalog exposed `lists`/`tasks` UUID columns with `uuidv7()` defaults. Ordinary seed created verified `dev-user@example.test` with 1 list and 2 tasks. Read-only `main` still has `posts_table` and one migration.
- [x] `pnpm test` passes 29 files and 244 tests; `pnpm test:integration` passes 6 files and 23 tests against one disposable PostgreSQL 18 Testcontainer.
- [x] `pnpm typecheck`, `pnpm lint` (0 errors; the pre-existing `app/layout.tsx:1:10` unused `Geist` warning remains), `pnpm build`, changed-file Prettier checks, and `git diff --check` pass.
- [x] `pnpm neon:performance` was not rerun; `TST-PERFORMANCE-001` remains verified by the existing T-16 evidence against the previous `development` branch name. The new branch uses the same name and committed schema.
- [x] Fresh proportional high-effort review of implementation tip `7f6b9b5` found no actionable findings. Optional nits about inspect allowing a missing port (mutation still fail-closed) and performance seed setting `NEON_COMPUTE_ACTIVE` were deferred.

### T-21: Add automatic CI quality gates with no deployment side effects

- [x] Complete T-21 with a real quality-gate run and no deployment side effects.
- Files: `.github/workflows/ci.yml`; `src/test/pipeline/ci-workflow.test.ts`; `package.json` `packageManager` only; README, `docs/runbooks/local-development-and-verification.md`, and `docs/development/quality-gates.md` for truthful command references; `app/page.tsx` `dynamic = "force-dynamic"` so production builds do not prerender Sanity; `TODO.md` and `.dwf/decisions/TESTING.md` evidence. No deployment workflow in this task.
- Interfaces: automatic `push`/`pull_request` quality workflow on `main`; SHA-pinned `actions/checkout` and `pnpm/setup`; Node 24 plus pnpm 11 from `packageManager`; `quality` job for typecheck, lint, unit tests, `drizzle-kit check`, and build; `harness` job for `pnpm test:integration` and Chromium `pnpm test:e2e`; Playwright report artifact on the harness job only; no GitHub secrets.
- Acceptance: CI verifies the selected commit without deploying to Vercel, creating Neon Preview branches, mutating Sanity, or requiring Production secrets; failures are visible and actionable; Docker and Chromium are declared on the harness job; CI does not become an implicit every-PR Preview deployment; workflow permissions and concurrency are least-privilege and documented.
- Contracts/evidence: `TST-FOUNDATION-001`, `TST-HARNESS-001`, `TST-E2E-001`–`TST-E2E-003`, `TST-ENV-001`, and the CI portion of `TST-PIPELINE-001`; distinguish workflow syntax/static evidence from an actually executed run.
- Checks: focused `pnpm exec vitest run src/test/pipeline/ci-workflow.test.ts`; a real CI run on the task commit; equivalent local gates `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:integration`, `pnpm test:e2e`, `pnpm build`, `pnpm exec drizzle-kit check --config drizzle.config.ts`, changed-file Prettier, and `git diff --check` as prerequisites allow.
- Dependencies/unblock: T-18 and the stable local test command boundary from T-19 are complete. T-20 remains blocked, so CI stays disposable/local and does not run hosted Development smoke.
- Recommended AgentForge skills: `ci-cd-and-automation`, `testing-first-class`, `test-driven-development`, `security-and-hardening`, `source-driven-development`, and `git-workflow-and-versioning`.
- Plan: [`2026-09-03-t-21-ci-quality-gates.md`](docs/agentforge/plans/2026-09-03-t-21-ci-quality-gates.md).

Verification:

- [x] `pnpm exec vitest run src/test/pipeline/ci-workflow.test.ts` passes 5 focused tests for trigger, permission, SHA pins, local-only commands, and loopback compile-time placeholders.
- [x] `pnpm test` passes 28 files and 233 tests; `pnpm test:integration` passes 6 files and 23 tests against one disposable PostgreSQL 18 Testcontainer; `pnpm test:e2e` passes 7 serial Chromium journeys.
- [x] `pnpm typecheck`, `pnpm lint` (0 errors; the pre-existing `app/layout.tsx:1:10` unused `Geist` warning remains), `pnpm build` with CI placeholders, `pnpm exec drizzle-kit check --config drizzle.config.ts`, changed-file Prettier checks, and `git diff --check` pass.
- [x] GitHub Actions run [33746137734](https://github.com/michi-guns/nextjs-todo-list-example/actions/runs/33746137734) on commit `e50a641` succeeded: Quality in 1m25s and Harness in 2m0s. No Vercel, Neon, Sanity mutation, or Production secret was used.
- [x] Fresh proportional review of implementation tip `e50a641` found no actionable findings. Optional nits about test-name tightness and `persist-credentials: false` were deferred.
- [x] PR: [#25](https://github.com/michi-guns/nextjs-todo-list-example/pull/25) is open from `task/T-21-ci-quality-gates`.

Dependency checkpoint, updated 2026-09-16: T-18.1 through T-18.4, T-19, T-20, T-21, and T-21.5 are complete. The mail foundation includes reviewed Resend implementation, a verified owner domain, one controlled real delivery, and the approved protected configuration run `35103297897`. T-23 can proceed to its own release preflight. The Preview workflow must not be inferred from Vercel's default Git integration or run automatically on every pull request.

### T-21.5: Establish the minimum Production mail foundation

- [x] Complete T-21.5 before T-23 can release Production. Protected run [35103297897](https://github.com/michi-guns/nextjs-todo-list-example/actions/runs/35103297897) passed after approval at `03b67809944bd4e65ed9d86a1444446b5a9cc0ce`.
- Plan: [Resend foundation and documentation continuation](docs/agentforge/plans/2026-09-09-t-21-5-resend-foundation.md). Owner approved Resend and test-domain sends on 2026-09-09, then the named owner subdomain, three DNS records, verification and one real test send on 2026-09-16.
- [x] Implement the thin Resend adapter and explicit profile/runtime selection. Unit tests pass 294/294, local integration 23/23 and Chromium 8/8. Typecheck, build, formatting and diff checks pass; lint retains only the existing unused Geist warning. A synthetic test-domain send through the adapter was accepted. Next.js MCP reports no compilation/runtime errors, and agent-browser proves password sign-in and local magic-link request. Fresh independent review gates the PR.
- [x] Verify the owner-controlled sending subdomain and perform one controlled real delivery through the existing adapter. On 2026-09-16, Resend verified `auth.dim-stamatakis.dev` after three approved Namecheap DNS additions. The test reached the owner's Gmail in Spam and was moved to Inbox only after explicit approval. This proves receipt, not automatic inbox placement or a deployed auth journey. See [redacted domain and delivery evidence](docs/agentforge/evidence/2026-09-16-resend-domain-delivery.md).
- [x] Configure and verify the protected GitHub Production sender settings. The first approved protected validator run passed; it proves configuration shape and secret scope, separately from the earlier real adapter delivery. Vercel runtime configuration remains T-23 work. See [protected mail verification](docs/runbooks/auth-mail.md#remaining-t-215-acceptance).
- [x] Add the no-network mail configuration CLI and manual, main-only protected workflow, with focused red/green CLI and workflow tests. The focused group passes 128 tests, the full unit suite passes 342, typecheck passes and lint retains only the existing Geist warning. Follow the existing plan's protected configuration continuation.
- [x] Apply and inspect the Production reviewer, branch restriction and mail variables while preserving the existing scoped key. See [protected configuration evidence](docs/agentforge/evidence/2026-09-16-production-mail-protection.md).
- [x] Publish and merge the independently reviewed [PR #35](https://github.com/michi-guns/nextjs-todo-list-example/pull/35), then record the waiting approval and successful protected execution. The agent submitted approval through the owner's account under their task/test authorization; the [evidence record](docs/agentforge/evidence/2026-09-16-production-mail-protection.md) distinguishes this from an owner UI click.
- Documentation checkpoint, 2026-09-16: record the provider evidence and spam observation, reconcile the current facts and contract limits, and prepare a fresh JZ handoff. This is a documentation continuation of the existing plan, not completion of the parent task.
- Files: the existing Better Auth mail boundary, a thin owner-approved remote mail adapter/configuration, non-secret profile documentation, focused auth/environment tests, and redacted delivery/health evidence.
- Interfaces: provider-backed `sendVerificationEmail` and `sendMagicLink` callbacks; explicit Production mail transport selection; protected provider configuration; fail-closed missing-configuration behavior; safe diagnostics that never expose message content, tokens, or credentials.
- Acceptance: Production verification and magic-link sends use the approved remote transport; local/test mailbox settings are rejected in Preview and Production; missing or invalid Production mail configuration blocks release before deployment; non-Production profiles cannot use Production credentials; no provider-swapping framework is introduced.
- Contracts/evidence: `TD-027`, `TST-AUTH-001`, `TST-AUTH-002`, `TST-ENV-001`, `TST-PIPELINE-001`, and `TST-RELEASE-001`; keep local mailbox evidence separate from remote delivery evidence.
- Checks: focused mail/profile tests; `pnpm test`; `pnpm typecheck`; `pnpm lint`; changed-file Prettier checks; `git diff --check`; and a controlled provider delivery/health smoke when the owner-authorized provider is available.
- Dependencies/unblock: T-18.2 through T-18.4 and owner approval/provisioning of the Production mail provider are satisfied. T-21.5's minimum foundation is verified; T-27 consumes it for broader authentication completion and abuse resistance.
- Recommended AgentForge skills: `better-auth-best-practices`, `email-and-password-best-practices`, `security-and-hardening`, `testing-first-class`, `test-driven-development`, `source-driven-development`, and `git-workflow-and-versioning`.

### T-22: Add manually triggered, fully functional Vercel Preview delivery

Required fix from the 2026-09-05 reusable-foundation review at `634d2b0`:

- [x] Bind migration, seed, and deployment inputs to the same immutable revision reported by `--ref`. The local CLI now requires a clean working tree whose `HEAD` equals the resolved SHA before it observes or creates a Preview branch. A different checkout or local edits fail with `workspace_mismatch` before any Neon, migration, seed, deployment, or smoke operation.
- [x] Before hosted T-22 proof, add focused regression evidence for a requested revision different from the current checkout and for local edits. `scripts/deploy/preview/core.test.ts` proves both refusal paths and the clean exact-revision path; `src/test/pipeline/preview-workflow.test.ts` proves that checkout and the adapter receive the same requested ref. This is local orchestration evidence only and does not satisfy the hosted T-22 or T-24 boundary.

- [x] The owner authorized the 2026-09-09 hosted attempt, but Vercel assigned Production to the first deployment. The task deployment and isolated Neon branch were cleaned up; no valid Preview smoke was completed. On 2026-09-14 the owner resolved the first-deployment prerequisite with a deliberate placeholder Production deployment (see the [Preview runbook](docs/runbooks/preview-delivery.md)), so further deployments are Previews. [PR #30](https://github.com/michi-guns/nextjs-todo-list-example/pull/30) carries the command and identity repairs; the owner-authorized run is recorded under Verification below.

Identity repairs slice, 2026-09-14, from the [Preview identity repairs plan](docs/agentforge/plans/2026-09-14-t-22-preview-identity-repairs.md):

- [x] Add `preflightDeploy` to `PreviewRuntime` in `scripts/deploy/preview/core.ts`, called after `assertPreviewWorkspace` and before `observeBranch`/`createBranch`. The default runtime reads the Vercel project through `GET /v9/projects/{VERCEL_PROJECT_ID}?teamId={VERCEL_ORG_ID}` and refuses with `target_mismatch` when `VERCEL_ORG_ID` is not a `team_` id, the returned `id` differs, or `targets.production` is absent. Focused tests prove the refusal happens before any Neon call.
- [x] Deploy with `vercel deploy --yes --json --target=preview --meta previewId=… --meta commitSha=… --env …` in `scripts/deploy/preview/vercel.ts`, parse the structured stdout JSON, and refuse a deployment whose `target` is `production`, whose `readyState` is not `READY`, or whose id is not `dpl_…`.
- [x] Replace the `vercel inspect` lookup with `GET /v13/deployments/{id}?teamId=…` and refuse when `projectId`, `target`, `meta.commitSha` or `meta.previewId` disagree with the request. Inject the process runner and `fetch` so `scripts/deploy/preview/vercel.test.ts` exercises the real parsing and validation against recorded CLI/API shapes.
- [x] Reconcile the runbook, README, environment/derived-app docs, attempt evidence, `TESTING.md` and this tracker: the stop condition is resolved, the Production Neon project `jolly-dew-32309276` exists for T-23, and `TST-PREVIEW-001`/`TST-PIPELINE-001`/`TST-ENV-001` stay `partial` until a hosted run succeeds.
- Checks: `pnpm exec vitest run scripts/deploy/preview/core.test.ts scripts/deploy/preview/vercel.test.ts src/test/pipeline/preview-workflow.test.ts`; `pnpm test`; `pnpm typecheck`; `pnpm lint`; changed-file Prettier; `git diff --check`; independent review of the final tip.
- Recommended AgentForge skills: `testing-first-class`, `test-driven-development`, `ci-cd-and-automation`, `security-and-hardening`, `documentation-and-adrs`, and `git-workflow-and-versioning`.
- Files: `.github/workflows/deploy-preview.yml`, explicit deploy/branch/seed/smoke helpers under `scripts/deploy/` or equivalent thin adapters, preview environment configuration documentation, and redacted Preview evidence under `docs/agentforge/evidence/`.
- Interfaces: `workflow_dispatch` inputs for an exact branch/tag/SHA and a safe preview identifier; resolved immutable commit SHA; isolated temporary Neon branch derived from durable Development; direct migration and safe seed sequence; Vercel Preview deployment; deployment-origin `BETTER_AUTH_URL`; non-production auth/mail/Sanity configuration; explicit cleanup/expiry path; workflow outputs for URL, deployment id, branch id, expiry, SHA, and redacted smoke result.
- Acceptance: a client receives an ephemeral Preview that supports authentication, list/task mutations, landing content, and the relevant browser smoke path; Preview database writes are isolated from Development and Production; data is sanitized or deterministic; local filesystem mail is rejected and the selected remote-safe mail or controlled-account strategy works; the requested ref is resolved and displayed; cleanup is repeatable and does not delete another preview; no automatic Preview is created for ordinary PR activity.
- Contracts/evidence: `TST-PIPELINE-001`, `TST-PREVIEW-001`, `TST-ENV-001`, `TST-AUTH-001`–`TST-AUTH-003`, `TST-LANDING-002`/`TST-LANDING-003` as applicable, and `TST-E2E-001`–`TST-E2E-003`; real Neon/Vercel evidence is required for hosted claims and must be redacted.
- Checks: workflow validation; a controlled manual run from a known branch/tag/SHA; branch isolation assertion; direct migration/seed verification; deployed browser/API smoke; cleanup/expiry verification; workflow artifact review; and `git diff --check`. Never use Production as a test target.
- Dependencies/unblock: T-18, T-20, and T-21; T-18.1 has resolved the Preview Sanity and mail strategy, while Vercel/Neon resources and the non-production dataset still require owner authorization and provisioning. Do not enable the workflow until the owner explicitly authorizes the hosted run.
- Recommended AgentForge skills: `ci-cd-and-automation`, `neon-postgres-branches`, `neon-postgres`, `testing-first-class`, `test-driven-development`, `security-and-hardening`, `browser-testing-with-devtools`, `next-dev-loop`, and `git-workflow-and-versioning`.
- Plan: [`2026-09-03-t-22-preview-delivery.md`](docs/agentforge/plans/2026-09-03-t-22-preview-delivery.md).

Verification:

- [x] `pnpm exec vitest run scripts/deploy/preview/core.test.ts src/test/pipeline/preview-workflow.test.ts src/modules/auth/infrastructure/auth-mail.test.ts` passes 3 files and 21 tests, including exact-revision workspace refusal before any provider or database operation and the real Git commit-peel subprocess on Windows.
- [x] `pnpm test` passes 32 files and 265 tests; `pnpm typecheck`, `pnpm lint` (0 errors; the pre-existing `app/layout.tsx:1:10` unused `Geist` warning remains), `pnpm build`, and `pnpm exec drizzle-kit check --config drizzle.config.ts` with the committed CI placeholders, changed-file Prettier, and `git diff --check` pass.
- [x] `pnpm test:integration` passes 6 files and 23 tests against disposable PostgreSQL after the Docker preflight reported server 29.7.2.
- [x] Dedicated Sanity `preview` dataset exists with published `landingPage`. GitHub Environment `preview` exists. Repository variable `NEXT_PUBLIC_SANITY_PROJECT_ID` is set.
- [x] Hosted functional Preview proof. The 2026-09-09 attempt was classified Production and deleted, with guarded Neon cleanup. The first-deployment prerequisite was resolved on 2026-09-14 by the placeholder Production deployment recorded in the [Preview runbook](docs/runbooks/preview-delivery.md). The owner-authorized [run 34840457016](docs/agentforge/evidence/2026-09-14-preview-run.md) at `1c8c38c` then passed the project preflight, created, migrated and seeded `preview-t22-20260914`, deployed a `target=null` Preview with matching commit/preview metadata, passed the HTTP smoke, and was independently verified over HTTP and in a real Chromium session (landing, sign-in, dashboard, list creation). The owner then checked the Preview manually and reported it working, and [cleanup run 34845688852](docs/agentforge/evidence/2026-09-14-preview-run.md) deleted `preview-t22-20260914` through the identity guard with `development` and `main` untouched; the orphaned Vercel deployment was removed. `TST-PREVIEW-001` is `verified`. Vercel Git auto-deploy must stay disabled.

### T-23: Add manually approved exact-ref Production release

- [x] Complete T-23 only after the Production target, migration policy, and protected approval path are accepted.
- Plan: [protected Production release](docs/agentforge/plans/2026-09-16-t-23-production-release.md), scoped under the owner's 2026-09-16 instruction to continue T-23 autonomously.
- Current state: the owner approved release `d639dfeeeca2932606c652cf5305ca3e0cd87a89`, its reviewed migrations and live checks. Protected runs `35112456687` and `35114013699` passed. The first live mail attempt exposed a protected credential mismatch; updating that secret and redeploying the same SHA resolved it. Real magic-link delivery/consumption, authenticated dashboard, sign-out/private-route gating and the signed Sanity webhook now pass. See [live evidence](docs/agentforge/evidence/2026-09-16-production-release-live.md). PR #38 already merged the independently reviewed implementation with passing exact main-push CI; fresh review and CI gate this documentation closeout.
- [x] T-23.1 — Finish prerequisite setup: the owner confirmed the project-only Vercel token; distinct Production credentials/settings and the signed Sanity webhook are configured. The complete profile passed validation in the provisioning process, with safe names/scopes recorded in the evidence. Existing mail settings and Preview scope are preserved. Subsequent protected-run validation passed in the T-23.5 release runs.
- [x] T-23.2 — `scripts/deploy/production/ref.ts` resolves a tag/full SHA to `ResolvedDeliveryRef`, checks reviewed-main ancestry and clean matching checkout, and requires exact-SHA main-push `ci.yml` Quality/Harness success. The safe subprocess boundary captures errors without exposing arguments/stderr. The ref/process suite passes 29 tests, including a red/green regression for a tag shadowing `origin/main`; the anchor is now explicitly `refs/remotes/origin/main`. Independent review approved the ref/core commit `b2c1d2a`. A real read-only command rehearsal resolved `e3ee5c0c63d34f81358243496cafe8777db5f785` and confirmed CI `35107944387`, attempt 1. No protected access or mutation was performed.
- [x] T-23.3 — The guarded release core, provider adapter and CLI are implemented. Existing profile/guard contracts control observed Neon/Vercel identity, direct migration, exact-SHA deployment, canonical smoke and separate safe stage results. The 62 Production tests cover ref/process/core/runtime/CLI boundaries. A real `drizzle-kit migrate` rehearsal applied both committed migrations to disposable local PostgreSQL. See [implementation evidence](docs/agentforge/evidence/2026-09-16-production-release-implementation.md). Protected execution is recorded under T-23.5.
- [x] T-23.4 — The manual main-only workflow, `pnpm release` command, pipeline test grouping and [release/recovery runbook](docs/runbooks/production-release.md) are implemented. Separate unprivileged ref/CI and protected release jobs bind approval/checkout to one SHA, scope secrets to the release step, serialize releases and publish safe records. Pipeline tests (235), typecheck, lint, build, migration shape, integration (23) and all three browser engines (24 journeys) pass. The [implementation evidence](docs/agentforge/evidence/2026-09-16-production-release-implementation.md) records the supporting Firefox diagnostics fix and verification boundary. Fresh review approved the complete implementation and hosted CI passed before PR #38 merged. The subsequent Production evidence is recorded under T-23.5.
- [x] T-23.5 — The non-Production ref/CI and migration rehearsals, concretely authorized protected releases and live checks are recorded in the [release evidence](docs/agentforge/evidence/2026-09-16-production-release-live.md), with durable safe artifacts, rollback compatibility and the mail configuration repair. `TST-RELEASE-001` and `TST-LANDING-003` are `verified`; environment/pipeline contracts remain `partial` for T-24's final reconciliation. No Production seed, reset, failure injection or down-migration ran.
- Files: `.github/workflows/deploy-production.yml`, release/ref/migration/smoke helpers under `scripts/deploy/`, protected environment configuration documentation, production runbook, and redacted release evidence under `docs/agentforge/evidence/`.
- Interfaces: `workflow_dispatch` input accepting a tag or commit SHA; exact-ref resolution and verification; required CI evidence for the resolved SHA; protected GitHub `production` Environment approval; direct forward migration; Vercel production deployment of the exact SHA; post-deploy smoke; release record containing SHA, migration result, deployment id, rollback reference, and operator/time metadata without secrets.
- Acceptance: no branch name or mutable “latest” alias can silently change the deployed commit; Production secrets are unavailable to CI/Preview jobs; migration runs separately from app boot through the direct endpoint; a failed deployment reports whether the database migration already succeeded and does not assume a database down-migration is safe; application rollback guidance names a compatible commit/ref and explicitly handles migration compatibility; the chosen Production Neon project/branch is protected and never reset by routine developer commands.
- Contracts/evidence: `TST-RELEASE-001`, `TST-PIPELINE-001`, `TST-ENV-001`, `TST-MIGRATION-001`, `TST-LANDING-003`, and the relevant authentication/browser contracts; mark hosted contracts verified only after real protected-environment evidence.
- Checks: workflow/ref-resolution tests; protected-environment approval evidence; controlled release rehearsal in an explicitly non-Production target where possible; real Production deployment only after owner approval; post-deploy smoke; redacted release artifact; `pnpm build`; and `git diff --check`.
- Dependencies/unblock: T-18, T-20, T-21, and T-21.5; T-18.1 has resolved the Production target policy and migration-history boundary. On 2026-09-14 the owner authorized the separate Neon Production project `jolly-dew-32309276` (`nextjs-todo-list-example-production`, default `main` branch; see [production readiness](docs/runbooks/production-readiness.md)) and the canonical origin `https://nextjs-todo-list-example.vercel.app` now carries a placeholder deployment that this task's first release replaces. The owner mail domain and controlled delivery were verified on 2026-09-16; the protected mail check passed in run `35103297897`, completing T-21.5. T-23 may now perform its own prerequisite checks. This task must not promote the current Neon `main` merely because it is the existing `.env.local` target.
- Recommended AgentForge skills: `ci-cd-and-automation`, `shipping-and-launch`, `migration-history-workflow`, `neon-postgres`, `testing-first-class`, `test-driven-development`, `security-and-hardening`, `observability-and-instrumentation`, and `git-workflow-and-versioning`.

Dependency checkpoint: T-22 and T-23 require the environment decisions, CI evidence, and hosted credentials/approvals they name. Neither task is unblocked by local unit tests alone. Do not claim the template's deployment pipeline is proven until T-24 covers both the simulated negative paths and the required disposable/controlled hosted boundaries.

Review priority, updated 2026-09-16: proceed to T-23 and the remaining T-24 release evidence. T-21.5's protected mail configuration and T-22's hosted Preview lifecycle are complete. The approved mail configuration run establishes that scoped foundation; it does not establish an application release, Production migration or deployed auth journey. T-23 retains its own target, credentials, exact-SHA and protected approval requirements.

### T-24: Prove the complete environment and delivery pipeline

This is the dedicated template-level pipeline test task. Its purpose is to
prove that the environment setup is correct, not merely that individual
commands compile.

- [x] Complete T-24 with layered local, static, and required disposable/controlled hosted evidence.
- Plan: [local pipeline evidence](docs/agentforge/plans/2026-09-09-t-24-local-pipeline-evidence.md), independently authorized by the owner on 2026-09-09.
- Final closeout plan: [complete pipeline evidence reconciliation](docs/agentforge/plans/2026-09-16-t-24-pipeline-closeout.md), under the owner's instruction to continue unblocked work.
- [x] T-24.1 — Map every environment, exact-ref, secret/approval, stage/failure and hosted lifecycle requirement to existing source/tests and real run evidence in `docs/agentforge/evidence/2026-09-16-pipeline-closeout.md`. Corroborate current protection/identity with read-only provider metadata. No new provider mutation or Production failure injection.
- [x] T-24.2 — Run `pnpm test:pipeline`, confirm unchanged executable behavior before reusing PR #39's full CI and the T-23 three-browser evidence, then reconcile `TST-ENV-001`/`TST-PIPELINE-001`, this tracker and dependency readiness. Link/format/diff checks, fresh exact-tip independent review and hosted CI gate merge. Recommended AgentForge skills: `testing-first-class`, `ci-cd-and-automation`, `documentation-and-adrs`, `code-review-and-quality` and `git-workflow-and-versioning`.
- [x] Add stage-order/failure/explicit-cleanup evidence and `pnpm test:pipeline`. The grouped local suite passes 124 tests. Local integration passes 23/23 and Chromium 8/8. Typecheck and lint pass with the existing unused Geist warning. Build, formatting and diff checks pass. The commit hook runs the final unit suite; fresh independent review gates the PR. Hosted Preview and Production rehearsal remain pending; the first Vercel deployment prerequisite and unimplemented protected release cannot be replaced by these local tests.
- Files: `src/test/environment/`, `src/test/pipeline/` or the repository's established test seat, workflow/static validation fixtures, disposable Neon/Vercel/Sanity adapters or controlled evidence helpers, `package.json`, `.github/workflows/`, `docs/agentforge/evidence/`, `.dwf/decisions/TESTING.md`, and `TODO.md`.
- Interfaces: a layered pipeline test command; profile/target matrix; exact-ref resolver; branch creation/identity/expiry/cleanup lifecycle; migration and seed sequencing; preview deployment contract; production approval/secret-scope contract; redacted evidence schema; failure-injection hooks that stop before shared/Production mutation.
- Acceptance: tests cover every environment profile and forbidden cross-target combination; local reset cannot reach Neon; Development and Preview are isolated; Preview branch creation, migration, deterministic/sanitized seed, app configuration, functional smoke, cleanup, and expiry are traceable; the selected tag/SHA resolves to one immutable commit; automatic PR deployment is absent; migration/seed/deploy failures report state and clean up safely; Production workflow requires protected approval and cannot be exercised by non-production credentials; tests prove the full application path for a Preview when the controlled hosted prerequisite is available.
- Contracts/evidence: formalize and reconcile `TST-PIPELINE-001`, `TST-PREVIEW-001`, and `TST-RELEASE-001`, plus `TST-ENV-001`; retain existing contract statuses when a boundary is unavailable. Layered tests may mock provider APIs for orchestration logic, but must include real disposable Neon/Vercel/browser evidence for claims those mocks cannot establish. Never run test cleanup or failure injection against Production.
- Checks: focused pipeline suite; workflow syntax/static checks; `pnpm test`; `pnpm test:integration`; `pnpm test:e2e`; `pnpm typecheck`; `pnpm lint`; `pnpm build`; controlled Preview lifecycle run; controlled release/ref-resolution rehearsal; redacted evidence review; changed-file Prettier; and `git diff --check`.
- Dependencies/unblock: T-18 through T-23. Neon/Vercel/Sanity credentials and disposable targets are required only for their named boundary tests; absent prerequisites must be reported, not replaced with a weaker claim.
- Recommended AgentForge skills: `testing-first-class`, `test-driven-development`, `ci-cd-and-automation`, `security-and-hardening`, `browser-testing-with-devtools`, `next-dev-loop`, `verification-before-completion`, and `git-workflow-and-versioning`.

Final evidence, 2026-09-16: the [requirement matrix](docs/agentforge/evidence/2026-09-16-pipeline-closeout.md)
accounts for every baseline clause. `pnpm test:pipeline` passes 235 tests;
PR #39 CI passed the full Quality/Harness gates on unchanged executable code.
The real T-22 Preview/cleanup and T-23 Production/mail/webhook evidence now fill
the hosted boundaries. Read-only provider checks corroborate target/protection
and secret scope. `TST-ENV-001` and `TST-PIPELINE-001` are `verified`.
Fresh independent review and hosted CI gate this evidence closeout.

Available prerequisite evidence from T-22:

- [x] Local orchestration refuses a requested revision different from the checkout and refuses local edits at the selected revision before Neon, migration, seed, deployment, or smoke operations. The Preview workflow checks out and passes the same requested ref. T-24 must retain this evidence when it adds the controlled hosted lifecycle and Production exact-ref rehearsal; these local tests do not prove either hosted boundary.

### T-25: Carefully document the complete environment and delivery system

Required reconciliation from the 2026-09-05 review, within this task's existing documentation scope:

- Plan: [current delivery documentation](docs/agentforge/plans/2026-09-09-t-25-delivery-documentation.md). Owner authorized this partial documentation slice independently of unavailable Production evidence.
- Final plan: [delivery documentation closeout](docs/agentforge/plans/2026-09-16-t-25-delivery-documentation-closeout.md), now that T-24 is reviewed and merged.
- [x] T-25.1 — Reconcile README, current `.dwf/CONTEXT.md` facts, environment map, profile/local/Preview runbooks, quality gates and documentation navigation with the implemented release and verified pipeline. State command targets and configuration ownership. Preserve canonical decisions, safe placeholders, historical evidence and T-29's separate guide scope.
- [x] T-25.2 — Review command/setting names against source and workflows without executing provider or migration commands; run link/anchor, changed-file Prettier, stale-current-state and diff checks. Reconcile this tracker, obtain fresh independent exact-tip review and pass hosted CI before merge. AgentForge skills: `documentation-and-adrs`, `testing-first-class`, `code-review-and-quality`, `git-workflow-and-versioning` and `unslop`.
- [x] Reconcile current context/toolchain/command examples and add environment, blocked-Preview and Production-readiness runbooks. Changed Markdown relative links/anchors, command-shape review, formatting and diff checks pass. Fresh independent review gates the documentation PR; full delivery documentation remains pending actual Preview/release proof.

- [x] Reconcile `.dwf/CONTEXT.md` with implemented CI/Preview tooling and the recorded durable Development evidence. At review time it still said those workflows were absent and Development was pending. Distinguish existing code, recorded successful checks, and unproven hosted behavior; do not mark T-22/T-23 complete from file presence.
- [x] Reconcile README setup prerequisites with `package.json` and the implemented commands. At review time README named pnpm 11.17.0 while `packageManager` selected 11.25.0. Keep one authoritative version source and avoid conflicting setup instructions.

This is the dedicated documentation task. It should leave a derived
application operator able to understand, run, verify, preview, release, and
recover the template without reading hidden agent context or guessing which
database a command targets.

- [x] Complete T-25 after the implemented environment and pipeline behavior has truthful evidence.
- Files: `README.md`, `docs/index.md`, `docs/architecture/environments.md`, `docs/runbooks/local-development-and-verification.md`, new Preview and Production release/recovery runbooks under `docs/runbooks/`, `docs/development/quality-gates.md`, `.dwf/CONTEXT.md` and supporting DWF/decision references only where T-18.1 authorizes reconciliation, `.env.example`-style non-secret templates, and `TODO.md` evidence links.
- Interfaces: environment matrix; copyable Local/Development/Preview/Production setup commands; pooled/direct database explanation; Sanity and email boundaries; secret ownership/naming categories without values; Neon branch policy; manual workflow inputs; exact-ref and resolved-SHA behavior; seed modes; cleanup/expiry; approval gates; migration and rollback/recovery procedure; troubleshooting; evidence redaction rules; and a small architecture diagram or sequence showing the delivery lifecycle.
- Acceptance: documentation is internally consistent with the canonical DWF decisions and implemented commands; it clearly says Local uses Docker PostgreSQL plus hosted Sanity, Development is a local app against durable Neon, Preview is a manually requested ephemeral fully functional deployment, and Production is an approved exact-ref release; it warns that pooled URLs are for runtime and direct URLs for migrations; it explains why an existing Neon `main` branch is not automatically Production; no credentials, tokens, or invented private links appear; stale scaffold statements are corrected or explicitly labeled historical; every operational command names its target and safety boundary.
- Contracts/evidence: reconcile documentation obligations for `TST-ENV-001`, `TST-PIPELINE-001`, `TST-PREVIEW-001`, `TST-RELEASE-001`, `TST-MIGRATION-001`, `TST-HARNESS-001`, `TST-LANDING-002`, and `TST-LANDING-003` without changing statuses absent evidence.
- Checks: link check; copy/paste review of commands; changed-file Prettier; `git diff --check`; documentation review against PRD/SPEC/decision ledgers; and a fresh proportional review of the final documentation tip.
- Dependencies/unblock: T-18 through T-24 for final truth, though a short design draft may be prepared after T-18.1. Documentation must be updated when later implementation changes the command surface.
- Recommended AgentForge skills: `documentation-and-adrs`, `writing-guidelines`, `unslop`, `testing-first-class`, `verification-before-completion`, and `git-workflow-and-versioning`.

T-25 final documentation verification, 2026-09-16: README, current context,
environment map, configuration ownership, Local/Development migration guidance,
Preview/release navigation and quality gates now match the implemented commands.
Source/workflow command review, 162 local links/anchors, changed-file Prettier,
stale-current-state search and `git diff --check` pass. No provider or migration
command was executed for this prose-only task. Fresh exact-tip independent
review and hosted CI gate merge. All TST statuses retain the reviewed T-24
baseline; T-29's existing guide is now ready for its final delivery retargeting
and documentation review. T-26/broader T-27/T-28 still require their named scope
or product decisions.

### T-26: Add runtime safety and observability hardening

Logger task definition, 2026-09-18: the owner selected a reusable Pino-backed
backend logger with dynamic settings in each environment's existing application
database. The [logger plan](docs/agentforge/plans/2026-09-18-t-26-shared-logger.md)
records that direction and the three unchecked review units below. This request
authorizes documentation/task definition only, not execution. The owner later
accepted the protected TypeScript settings CLI in [TD-031](.dwf/decisions/TECHNICAL.md#td-031),
resolving OD-026 without starting implementation.
The separately accepted [diagnostics plan](docs/agentforge/plans/2026-09-18-t-26-diagnostics.md)
adds T-26.4 through T-26.7 for optional central logs and grouped errors using
one startup-selected Sentry or Better Stack adapter. It also authorizes task
definition only. Runtime target validation, health/readiness and observability
beyond these two plans follow the later remaining-scope plan below. The parent
task is not complete.

Automatic alerts decision, 2026-09-19: [D-012](.dwf/decisions/PRODUCT.md#d-012)
and [TD-033](.dwf/decisions/TECHNICAL.md#td-033) accept a provider/channel-neutral
alert contract and outbound notification port, separate from diagnostics.
Total-outage detection and delivery must work independently of the monitored
Next.js app, with one incident/notification owner. The final accepted routing is
Better Stack Uptime native Email for availability, Sentry Free native Email for
new/regressed unexpected Production error groups, and NotificationPort with a
Resend Email adapter from protected GitHub Actions for failed Production releases.
The native paths do not run through our TypeScript port. Both diagnostics
adapters remain supported; Slack, Telegram and Pushover are future extensions.
OD-027 is resolved. No paid integration, custom relay, incident queue or state
machine is selected.

Remaining baseline plan, 2026-09-19: the owner accepted runtime target safety,
separate app/database/CMS health, safe diagnosis/runbooks and resolved release
identity checks. The [runtime safety and alerts plan](docs/agentforge/plans/2026-09-19-t-26-runtime-safety-and-alerts.md)
maps these to existing boundaries and verification without creating the final
task queue itself. The accepted breakdown below adds T-26.8–T-26.14 and keeps
T-26.1–T-26.7 unchanged and unchecked. [TD-035](.dwf/decisions/TECHNICAL.md#td-035)
and [TST-RUNTIME-001](.dwf/decisions/TESTING.md#tst-runtime-001) own the runtime
extension; [TST-ALERTS-001](.dwf/decisions/TESTING.md#tst-alerts-001) owns all three
notification paths. Both remain `specified`, with no runtime/provider proof.

Native uptime policy accepted, 2026-09-19: [SPEC](.dwf/output/agent/SPEC.md#native-uptime-policy)
records Production-only app/database/CMS monitoring, three-minute polling,
three further minutes of persistent failure after detection, three-minute stable
recovery, one opening and one recovery Email, and no periodic reminders.
Component identity and native/application single ownership remain mandatory.
Separately accepted [app/tool conditions](.dwf/output/agent/SPEC.md#application-tool-alert-policy)
cover failed Production release (migration/deployment/final post-deploy checks)
and new or regressed unexpected Production error groups, without Email per
repeated occurrence. Expected user errors/ordinary warnings remain diagnostics;
native uptime incidents get no second application alert. Recipient addresses,
protected secrets and actual free-account eligibility are execution prerequisites,
not open product choices. No implementation, provider setup, send or deployment
has been performed by this planning delivery.

#### Consolidated execution order and checkpoints

The accepted plans map to **21 child tasks**: T-26.1–T-26.14,
T-27.1–T-27.4 and T-28.1–T-28.3. Separate owner next-task instructions authorized
T-26.1 through T-26.3 on 2026-09-19; all three are complete. The owner authorized the
remaining locally executable children on 2026-09-24; T-26.4 through T-26.6, T-26.8 through T-26.11, T-27.1 and T-27.2 are
complete, leaving 9 unchecked children.
The plans themselves authorize task definition only. Further execution requires
the owner's instruction and the named prerequisites. Use one implementing agent
and subagents only for independent review, as the owner requested.

- Default serial implementation order: T-26.1–T-26.6, T-26.8–T-26.11,
  T-27.1–T-27.3, then T-28.1–T-28.2. This avoids concurrent edits to auth,
  environment and deployment composition; it is not a new product dependency.
- T-26.7, T-26.12–T-26.14, T-27.4 and T-28.3 obtain separately gated hosted
  evidence after their named predecessors. Missing access cannot be replaced
  with local mocks or silently skipped. T-26.2 and any schema-changing T-26.4
  also retain their existing required non-default Neon migration check; the
  default order is not a promise that every early task is fully offline.
- Before each task, classify required implementation and named verification
  prerequisites and run the cheap preflight. Stop on a missing required
  prerequisite; do not begin a partial slice or change targets to bypass it.
  Recompute all authorized unblocked work after each completed task.
- Each new code task below includes a final local gate of `pnpm test`,
  `pnpm typecheck`, `pnpm lint`, `pnpm build`, changed-file Prettier and
  `git diff --check`, plus its explicitly named integration/browser/pipeline
  checks. Focused Vitest runs must discover nonzero tests. Existing tasks
  T-26.1–T-26.7 retain their own checks. Normal hooks, exact-tip independent
  review, direct merge and main-push CI apply to every task.
- Checkpoint after T-26.6: contextual logging and local adapter/runtime proof,
  with hosted ingestion still distinct. After T-26.11: guarded runtime,
  bounded health, deployment smoke and local workflow Email path. After T-27.3
  and T-28.2: their local integrated journeys, without hosted readiness claims.
  Each checkpoint records partial versus complete `TST-*` evidence.
- Close each parent only after all its child tasks and required evidence pass.
  Provider/Production operations, recipient configuration and deliberate failure
  exercises retain their explicit target/authorization boundaries. No parent
  or test contract is complete from this documentation change.

Consolidated planning checks, 2026-09-19: 13 changed Markdown files pass scoped
Prettier, `git diff --check` and 667 local link/anchor checks. The 21 child
definitions have acceptance, files/interfaces, verification, prerequisites and
repository-local skills. All 36 existing `TST-*` statuses and the seven original
logger/diagnostics task definitions are preserved; the new runtime contract is
`specified`, bringing the ledger to 37 contracts. No application test or hosted
proof is claimed by these document checks. Normal commit hooks, one fresh
independent exact-tip review and main-push CI gate this consolidated delivery.
The unrelated local lockfile change remains outside its commits.

Remaining-plan checks, 2026-09-19: the seven affected documentation files pass
scoped formatting/diff checks and 531 local link/anchor checks. All 36 existing
test-contract statuses and the seven logger/diagnostics slices are preserved.
TST-ALERTS-001 remains `specified`; no runtime, provider setup or alert-delivery
proof is claimed. Normal hooks, fresh exact-tip independent review and
main-push CI gate this documentation delivery.

Alert decision-record checks, 2026-09-19: nine documentation files pass scoped
Prettier and diff checks; 563 local links/anchors resolve. Existing contract
statuses remain unchanged and TST-ALERTS-001 is `specified`. Normal hooks,
fresh exact-tip independent review and main-push CI gate integration. No
notification or outage evidence is claimed.

Diagnostics definition validation, 2026-09-18: seven Markdown files pass
changed-file Prettier, 436 local link/anchor checks and `git diff --check`.
The existing test-contract statuses and T-27/T-28 content are unchanged;
both new diagnostics contracts remain `specified`. Normal hooks, fresh
independent review of the final commit and main-push CI gate integration.
These documentation checks provide no logger or diagnostics runtime evidence.

TypeScript CLI decision follow-up, 2026-09-18: TD-031 resolves OD-026. Nine
Markdown files pass changed-file Prettier, 448 local link/anchor checks and
`git diff --check`; all existing test-contract statuses remain unchanged.
T-26.1 through T-26.7 remain unchecked, awaiting execution authorization.

Review context, existing planned work: `db/db.ts` consumes `DATABASE_URL` without the tooling's full environment-profile guard, and unexpected application failures mapped through `src/shared/entry-contract.ts` lose their diagnostic cause. Address runtime target validation and safe failure reporting within this task's accepted scope and prerequisites. Preserve generic client errors; do not describe all database errors as silent because `db/pool.ts` already logs idle-client failures.

- [ ] Complete T-26 as a separately scoped post-baseline hardening task.
- Files: application startup/configuration boundaries, health/readiness endpoints, accepted logging/diagnostics and operational-notification adapters, thin monitor configuration/runbook, deployment smoke helpers, safe error handling and focused tests. Metrics, tracing and a generic monitoring framework are outside this scope.
- Interfaces: sanitized startup target summary; readiness that distinguishes app, database, and CMS dependencies; correlation/request identifiers; structured failure events for migration/deployment/runtime target mismatch; no secret-bearing logs; release evidence links.
- Acceptance: operators can diagnose target mismatch, migration failure, auth/mail failure, and Sanity outage from safe telemetry; health checks do not leak credentials or falsely report readiness; production errors are actionable without logging tokens or personal data; deployment smoke uses the resolved release identity.
- Contracts/evidence: `TST-LOGGING-001`/`002`, `TST-DIAGNOSTICS-001`/`002`, `TST-RUNTIME-001` and `TST-ALERTS-001`; preserve current route behavior and existing `TST-*` obligations.
- Checks: focused unit/integration tests, `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, security/log review, and `git diff --check`.
- Dependencies/unblock: T-24/T-25 and product/technical decisions are complete. T-26.1 through T-26.6 and T-26.8 through T-26.11 are complete; the remaining 4 children have accepted plans. The owner authorized the locally executable children and the T-26.5 SDK install on 2026-09-24; hosted children still await their named authorizations. T-26.8 through T-26.11 are complete; the remaining T-26 children are hosted and await authorization; T-26.7 awaits hosted provider authorization. Provider setup and hosted evidence retain separate authorization boundaries.
- Recommended AgentForge skills: `observability-and-instrumentation`, `security-and-hardening`, `testing-first-class`, `test-driven-development`, and `git-workflow-and-versioning`.

<a id="t-261"></a>

#### T-26.1: Provide a reusable contextual backend logger

- [x] Implement the database-independent Pino facade and prove its emission,
      privacy and request-context contract. Execution authorized by the owner's
      next-task instruction on 2026-09-19. Registry and installed dependencies
      pass preflight; this unit needs no Docker or provider access.
- Files: new `src/shared/logging/` core, configuration schema, context,
  sanitizer, Pino writer and colocated `*.test.ts`; `package.json` and generated
  `pnpm-lock.yaml` for authorized dependencies. No database or application
  adoption in this unit; keep Node imports out of client-facing shared barrels.
- Interfaces: contextual module loggers, current-policy access, lazy event
  metadata, isolated request/job context and safe output. Concrete API names
  are implementation choices, not copies of the illustrative discussion API.
- Acceptance: global off wins; named-event suppression and exact module off
  cannot be overridden; module threshold replaces the default threshold.
  Existing logger objects see a changed snapshot. Concurrent requests do not
  share context. Filter before expensive metadata construction; sanitize
  arbitrary error strings/causes/stacks as well as keys. Logger/output failure
  cannot change an application result. JSON deployed output and readable local
  output retain safe severity, event, time, module, environment and correlation.
- Contracts: [TST-LOGGING-001](.dwf/decisions/TESTING.md#tst-logging-001), initially
  `specified`; record only the core evidence this unit provides.
- Checks: `pnpm exec vitest run src/shared/logging`, `pnpm test`,
  `pnpm typecheck`, `pnpm lint`, `pnpm build`, changed-file Prettier and
  `git diff --check`; inspect real writer output and short-process completion
  for both formats, severity channels and injected destination failures.
  Independent security/log review must find no sensitive fixture strings.
- Dependencies/prerequisites: accepted TD-029 direction, explicit execution and
  dependency-install authorization, registry access and installed dependencies.
  Scope is one core-library review unit. No Docker/provider operation needed.
- Local evidence, 2026-09-19: [logger core](docs/agentforge/evidence/2026-09-19-logger-core.md)
  records 30 focused tests, 445 total unit tests, passing typecheck/build and
  lint with only the existing `Geist` warning. Real short Node processes cover
  both formats, channels and destination failures. `TST-LOGGING-001` is partial
  until T-26.3 adoption/runtime proof. Independent exact-tip review and main-push
  CI remain the integration gates.
- Closeout: fresh GPT-6-Astra `xhigh` review approved implementation commit
  `57aa12f0dc77a850175b5e40e8cebacb53663367` without actionable findings.
  All 447 local Markdown destinations, scoped formatting and diff checks pass.
  This completion metadata receives its own fresh exact-tip review before
  direct merge and main-push CI. T-26.2 is next in serial order and needs its
  execution instruction plus Docker and an authorized non-default Neon
  migration target. No later task or hosted operation was started.
- Recommended AgentForge skills: `testing-first-class`, `test-driven-development`,
  `incremental-implementation`, `source-driven-development`,
  `observability-and-instrumentation`, `security-and-hardening`,
  `documentation-and-adrs`, `code-review-and-quality`, `git-workflow-and-versioning`.

<a id="t-262"></a>

#### T-26.2: Share logger settings safely across backend instances

- [x] Add the environment-local settings store, bounded refresh cache and the
      accepted protected TypeScript CLI. Execution authorized by the owner's
      next-task instruction on 2026-09-19. Docker, installed dependencies and
      the existing non-default Neon Development target pass read-only preflight.
      TD-031 resolves the interface choice previously tracked as OD-026.
- Files: `db/schema/logging.ts`, `db/schema/index.ts`, a new forward migration
  with generated metadata, `src/shared/logging/` settings store/cache/composition,
  colocated unit tests, `src/test/logging-settings.integration.test.ts`, and the
  TypeScript CLI: thin `scripts/logging/cli.ts`, typed/testable `core.ts`, focused
  `core.test.ts`, `vitest.config.ts` discovery and one `pnpm logging` manifest
  command using `tsx scripts/logging/cli.ts`. No new test infrastructure.
- Interfaces: one validated, versioned full snapshot per selected database;
  atomic revision-checked update; cached read and coalesced stale refresh.
  Reuse the existing pool without a logger/database import cycle. No log-event
  table, database query per emitted event or cross-environment settings service.
- Acceptance: two independent instances observe shared updates within the
  documented active-work refresh policy. Cold start uses safe defaults;
  outages/malformed data retain the last valid policy, including off. Refresh
  has a real bounded connection/query lifetime, bounded retry and no recursive
  logging. Late results cannot replace newer revisions. Old contextual objects
  see updated filters. Writes reject invalid snapshots, stale revisions and
  mismatched targets before mutation; read-only runtime use never writes defaults.
  The CLI explicitly selects the environment/target and uses existing operator
  permissions and credentials outside argv, policy files and output. Inspection
  results are JSON on stdout; sanitized diagnostics go to stderr. No new admin
  role, public endpoint, settings UI or authorization system is introduced.
- Contracts: [TST-LOGGING-002](.dwf/decisions/TESTING.md#tst-logging-002),
  `TST-FOUNDATION-001`, `TST-MIGRATION-001`, `TST-HARNESS-001`, `TST-ENV-001`.
  Existing baseline statuses/evidence do not prove the new schema or behavior.
- Checks: focused cache/settings unit tests via `pnpm exec vitest run src/shared/logging`
  and `pnpm exec vitest run scripts/logging`; `pnpm test:integration` for real
  persistence, independent caches, revision conflict, target isolation and
  timeout cleanup; `pnpm exec drizzle-kit check --config drizzle.config.ts`;
  fresh-chain and prior-schema upgrade evidence; branch-first migration smoke
  on an explicitly authorized non-default Neon branch. Also run `pnpm test`,
  `pnpm typecheck`, `pnpm lint`, `pnpm build`, changed-file Prettier and diff check.
  Run `pnpm test:pipeline` if shared environment guards change.
  Include the CLI test directory in Vitest discovery and require a nonzero
  focused test count. Existing strict `pnpm typecheck` covers its `.ts` files.
- Dependencies/prerequisites: T-26.1; accepted TD-031 and execution authorization to
  implement; Docker/PostgreSQL 18 Testcontainers for local verification;
  authorized non-default Neon target and direct migration role for the named
  migration check. Follow TD-025 and the migration-history skill; no reset,
  applied-history rewrite or Production migration is implied. One settings
  delivery/review unit; stop for a missing prerequisite before coding.
- Evidence, 2026-09-19: [shared settings](docs/agentforge/evidence/2026-09-19-logger-settings.md)
  records 33 focused logging tests, 20 focused CLI tests, 468 total unit tests,
  28 integration tests, strict typecheck, lint with the existing warning, build,
  migration-shape, formatting and links. Real local CLI inspect/set/conflict
  proof passes. The direct non-default Neon Development smoke applied only the
  additive settings migration, preserved both old hashes and confirmed an empty
  settings table through the real CLI. No Production operation ran.
- Review: GPT-6-Astra `xhigh` identified and verified fixes for server timeout
  cleanup and test-order dependence. A fresh reviewer approved `9a59be9` with
  no actionable findings. This completion metadata receives its own exact-tip
  review before direct merge; main-push CI is checked afterward.
  `TST-LOGGING-002` remains partial until T-26.3 application adoption/runtime
  proof. T-26.3 is next in the serial order and requires its next-task instruction
  plus the existing Docker/Chromium prerequisites. No later task was started.
- Recommended AgentForge skills: `testing-first-class`, `test-driven-development`,
  `incremental-implementation`, `migration-history-workflow`,
  `observability-and-instrumentation`, `security-and-hardening`,
  `documentation-and-adrs`, `code-review-and-quality`, `git-workflow-and-versioning`.

<a id="t-263"></a>

#### T-26.3: Adopt the logger at meaningful backend boundaries

- [x] Instrument the plan's initial boundaries and publish the usage/diagnosis
      runbook. Execution authorized by the owner's next-task instruction on
      2026-09-19. Dependencies, Docker, matching Chromium and the isolated Next.js
      runtime/browser preflight pass. Keep this unit within parent T-26's scope.
- Files: list/task route/action adapters and server composition, shared entry
  error reporting, auth-mail boundary, Sanity read/invalidation boundaries,
  `db/pool.ts`, affected boundary tests and runtime evidence; new
  `docs/runbooks/logging.md` with index/stack/data documentation links.
- Interfaces: refresh at adopted request/job entries, isolated correlation,
  stable operation/event names, safe outcomes/durations and one reporting owner
  for each propagated error. Preserve all existing client response contracts.
- Acceptance: caught unexpected failures are diagnosable without raw error
  leakage; ordinary validation/auth/domain refusals are not server errors.
  Mail/Sanity outcomes and idle pool errors are safe and bounded in volume.
  Suppression works on already-created loggers after refresh. No Node logger
  enters `app/(app)/dashboard/error.tsx` or another client bundle; no claim that
  backend events capture browser-only failures. Existing deployment/environment
  CLI result streams and Better Auth built-in behavior remain intact.
- Contracts: complete `TST-LOGGING-001`/`002` local obligations and rerun affected
  `TST-BOUNDARY-001`, `TST-AUTH-001`/`002`, `TST-LANDING-001`/`003`,
  `TST-FOUNDATION-001` and `TST-E2E-001`/`002` checks. Document separately gated
  hosted evidence without claiming it from local tests.
- Checks: focused changed-boundary unit tests, `pnpm test`,
  `pnpm test:integration`, `pnpm test:e2e`, `pnpm typecheck`, `pnpm lint`,
  `pnpm build`, security/log review, documentation links/commands,
  changed-file Prettier and `git diff --check`. Use the repository's Next.js
  runtime/browser workflow with captured real Pino JSON, induced local failure,
  concurrent request IDs and updated settings across independent instances.
  Verify completion/output lifecycle and severity mapping; real hosted
  delivery/provider checks require separate authorization.
- Dependencies/prerequisites: T-26.2; installed dependencies, available Docker
  and matching Chromium for the isolated browser/runtime checks. Scope is one
  adoption/runbook review unit. Parent T-26 remains incomplete afterward.
- Evidence, 2026-09-19: [logger adoption](docs/agentforge/evidence/2026-09-19-logger-adoption.md)
  records 118 focused tests, 479 total unit tests, 28 integration tests and all
  eight Chromium journeys passing, plus typecheck, lint with the existing
  warning, build, runtime/browser inspection, formatting and 618 document links.
  Two independent local Next processes prove JSON channels, request isolation,
  safe failure reporting and policy changes without restart. The build-time
  request gate prevents false prerender failures and settings reads.
  `TST-LOGGING-001`/`002` are verified for their local obligations; hosted
  diagnostics, Production changes and later parent work remain separate.
- Review: fresh GPT-6-Astra `xhigh` review approved implementation commit
  `9b7e9ae14901c1ff9eb4912d66f7e74aa0cde4d0` with no actionable findings.
  This completion metadata receives a fresh exact-tip review before direct
  merge and main-push CI. The predecessor's final `f236f29` also passed
  [main CI](https://github.com/michi-guns/nextjs-todo-list-example/actions/runs/35456518430).
  T-26.4 now has its delivery dependency satisfied and needs its own execution
  instruction and Docker/dependency preflight. No later task was started.
- Recommended AgentForge skills: `testing-first-class`, `test-driven-development`,
  `incremental-implementation`, `next-dev-loop`, `browser-testing-with-devtools`,
  `observability-and-instrumentation`, `security-and-hardening`,
  `documentation-and-adrs`, `code-review-and-quality`, `git-workflow-and-versioning`.

<a id="t-264"></a>

#### T-26.4: Route safe events under independent destination policies

- [x] Extend the logger with a small diagnostics Strategy and shared settings
      transition. Execution authorized by the owner's instruction on 2026-09-24.
      Docker, installed dependencies and the registry passed preflight.
- Files: planned `src/shared/logging/` policy/facade/cache and tests; new
  `src/shared/diagnostics/contracts.ts`, `dispatcher.ts`, `runtime.ts` and
  colocated tests; the accepted TypeScript settings CLI and
  `src/test/logging-settings.integration.test.ts`. Change schema/migration
  only if the stored representation requires it; no provider SDK in this unit.
- Interfaces: `SafeLogEvent`, `SafeErrorReport`, startup-selected Strategy
  `none`/`sentry`/`better-stack`, independent local/remote log policies and an
  explicit error-report control. Concrete method names follow the plan.
- Acceptance: common off/module-off/event suppression veto every destination.
  Console thresholds never discard eligible remote events; remote log
  thresholds never silently discard explicit error reports. Legacy settings
  retain console behavior and keep diagnostics off. No SDK loads for `none`.
  Existing logger objects see refreshed policy, with no per-event DB query.
  Credentials/provider identity remain startup-only, outside shared settings.
  Lazy metadata and safe projection run only for eligible destinations.
- Contracts: [TST-DIAGNOSTICS-001](.dwf/decisions/TESTING.md#tst-diagnostics-001),
  `TST-LOGGING-001`/`002`, `TST-ENV-001`; if schema changes, also
  `TST-MIGRATION-001`, `TST-FOUNDATION-001`, `TST-HARNESS-001`.
- Checks: `pnpm exec vitest run src/shared/logging src/shared/diagnostics`,
  `pnpm test:integration`, `pnpm test`, `pnpm typecheck`, `pnpm lint`,
  `pnpm build`, changed-file Prettier and `git diff --check`. Require nonzero
  focused test discovery. Prove both directions of independent routing and
  atomic policy transition across two real local PostgreSQL cache instances.
  Run `pnpm exec vitest run scripts/logging`. If schema changes, add
  `pnpm exec drizzle-kit check --config drizzle.config.ts`, fresh/upgrade
  evidence and the authorized non-default Neon migration check from T-26.2.
- Dependencies/prerequisites: T-26.3, execution authorization, installed
  dependencies and Docker/PostgreSQL 18 for required verification. TD-031's
  accepted CLI is delivered by the upstream writer task. One policy/routing review
  unit; no hosted provider credentials required.
- Evidence, 2026-09-24: [diagnostics routing](docs/agentforge/evidence/2026-09-24-diagnostics-routing.md)
  records 110 focused tests, 530 total unit tests, 29 integration tests,
  strict typecheck, lint with the existing warning, build, formatting and diff
  checks. The policy stays in the existing `jsonb` row, so no migration or Neon
  check applies. `TST-DIAGNOSTICS-001` is partial; SDK enrichment, boundary
  ownership and runtime flush remain for T-26.5/T-26.6.
- Review: a fresh Claude Opus 5.5 reviewer (xhigh effort requested) found one
  narrow privacy gap in stack parsing and four nits; commit `f73846f` fixes
  them with regression tests. A second fresh review found an empty-message
  header regression under Next's stack formatter, fixed with a test. The final tip receives its own fresh review before
  direct merge and main-push CI. T-26.5 is next in serial order.
- Recommended AgentForge skills: `testing-first-class`, `test-driven-development`,
  `incremental-implementation`, `api-and-interface-design`,
  `observability-and-instrumentation`, `security-and-hardening`,
  `documentation-and-adrs`, `code-review-and-quality`, `git-workflow-and-versioning`;
  `migration-history-workflow` only if a schema migration is required.

<a id="t-265"></a>

#### T-26.5: Add Sentry and Better Stack adapters with local wire evidence

- [x] Implement both concrete adapters behind the accepted Strategy, selecting
      only one at startup. Execution and the SDK install were authorized by the
      owner's instruction on 2026-09-24; registry and dependencies passed preflight.
- Files: `src/shared/diagnostics/sentry.ts`, `better-stack.ts`, startup
  composition, shared safe mapping where warranted, local wire tests and
  dependency manifest/lockfile. No browser SDK, public ingest proxy or account setup.
- Interfaces: Sentry structured logs and safe error events; Better Stack HTTP
  logs and documented Sentry-compatible error ingestion; bounded flush and
  local-only failure notices. Do not infer Logs API parity from error DSN support.
- Acceptance: real SDK/HTTP output preserves safe levels, timestamps, static
  event/module, environment, correlation and grouping fields. Post-enrichment
  filtering prevents sensitive metadata from escaping. Disable recapture and
  unwanted SDK integrations. Invalid credentials, timeouts, quota refusals,
  queue overflow and serialization failures cannot change app results or
  recursively export. Refreshed off policies discard unsent records, including
  SDK-buffered records; no fallback provider, unbounded retry or disk spool.
- Contracts: local adapter portion of
  [TST-DIAGNOSTICS-002](.dwf/decisions/TESTING.md#tst-diagnostics-002), plus
  `TST-DIAGNOSTICS-001` and `TST-LOGGING-001`. Local wire evidence cannot
  complete the hosted ingestion/grouping obligation.
- Checks: `pnpm exec vitest run src/shared/diagnostics`, `pnpm test`,
  `pnpm typecheck`, `pnpm lint`, `pnpm build`, changed-file Prettier and
  `git diff --check`. The focused run must use actual SDKs against a local
  collector via supported transport configuration. Inspect serialized payloads
  for sensitive sentinels, test slow/failed requests and off-before-flush, and
  confirm completion deadlines bound actual work rather than only an await.
- Dependencies/prerequisites: T-26.4; authorized compatible stable SDK install,
  registry access and installed-version public API/source review. One adapter
  delivery/review unit. Accounts/secrets are unnecessary for this local evidence.
- Evidence, 2026-09-24: [diagnostics adapters](docs/agentforge/evidence/2026-09-24-diagnostics-adapters.md)
  records 53 focused diagnostics tests against a local collector with the real
  `@sentry/core` 11.0.0 client, 550 total unit tests, typecheck, lint with the
  existing warning and build. `TST-DIAGNOSTICS-002` is partial: hosted ingestion
  and grouping remain T-26.7.
- Review: a fresh Claude Opus 5.5 reviewer (xhigh effort requested) found no
  blockers and two should-fix items (shared log `trace_id`, unproven scope
  attribute re-allowlisting) plus nits; all are fixed with regression tests.
  A second fresh review found scope data reaching log trace IDs and event
  tags/fingerprints; both are fixed with regression tests.
  The final tip receives its own fresh review before merge.
- Recommended AgentForge skills: `testing-first-class`, `test-driven-development`,
  `incremental-implementation`, `source-driven-development`,
  `observability-and-instrumentation`, `security-and-hardening`,
  `documentation-and-adrs`, `code-review-and-quality`, `git-workflow-and-versioning`.

<a id="t-266"></a>

#### T-26.6: Report backend failures once and document diagnostics operation

- [x] Connect Node startup, error ownership and bounded completion to the
      existing logger adoption; publish the runbook. Execution authorized by the
      owner's instruction on 2026-09-24; Docker, Chromium and dependencies passed.
- Files: new root `instrumentation.ts`; adopted route/action/server composition,
  auth-mail/Sanity/pool reporting owners; boundary/runtime tests; new
  `docs/runbooks/diagnostics.md`, logger runbook/index and environment guidance.
  Leave client error components and pure error mapping free of Node SDK imports.
- Interfaces: startup `register`, awaited Node `onRequestError`, explicit
  safe error reports for caught/mapped failures, request/job completion flush,
  trusted correlation and occurrence deduplication distinct from issue grouping.
- Acceptance: mapped unexpected errors and unhandled render/route failures
  each create one report when enabled. Reported rethrows do not duplicate even
  if Next transforms the error. Expected refusals and redirect/notFound control
  flow create no issue. Independent requests retain isolated context; generic
  client responses and auth/cache behavior stay unchanged. Runbook explains
  provider selection, destination controls, protected settings changes, safe
  grouping, timeout/loss limits and local versus hosted proof.
- Contracts: complete local `TST-DIAGNOSTICS-001` runtime obligations; preserve
  affected `TST-LOGGING-001`/`002`, `TST-BOUNDARY-001`, `TST-AUTH-001`/`002`,
  `TST-LANDING-001`/`003`, `TST-ENV-001`, `TST-E2E-001`/`002`.
- Checks: focused changed-boundary tests, `pnpm test`, `pnpm test:integration`,
  `pnpm test:e2e`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, docs links,
  changed-file Prettier and `git diff --check`. In the repository's isolated
  Next Node runtime, capture real adapter payloads locally for mapped,
  unhandled, rethrown, concurrent and expected-control-flow cases. Verify one
  issue per occurrence, bounded flush and absence of Node SDKs in client output.
  No hosted smoke is claimed by these checks.
- Dependencies/prerequisites: T-26.5, installed dependencies, Docker and
  matching Chromium for the isolated runtime/browser harness. One adoption
  and runbook review unit. T-26.7's hosted readiness remains pending.
- Evidence, 2026-09-24: [diagnostics adoption](docs/agentforge/evidence/2026-09-24-diagnostics-adoption.md)
  records 157 focused tests, 577 unit tests, 29 integration tests, 8 Chromium
  journeys, typecheck, lint with the existing warning, build, a clean client
  bundle and a two-process local Next runtime proof with real adapter payloads.
  The probe found and fixed per-bundle module copies by making the logging
  runtime, context stores and report registry process-wide.
  `TST-DIAGNOSTICS-001` is verified locally; `TST-DIAGNOSTICS-002` awaits T-26.7.
- Review: the first independent review found Next control flow inside an
  operation reported as a failure and an unawaited render/action hook flush;
  both were fixed with tests, plus nested-operation dedupe and a build-phase
  hook guard. A fresh exact-tip review confirmed the fixes before merge.
- Recommended AgentForge skills: `testing-first-class`, `test-driven-development`,
  `incremental-implementation`, `next-dev-loop`, `browser-testing-with-devtools`,
  `observability-and-instrumentation`, `security-and-hardening`,
  `documentation-and-adrs`, `code-review-and-quality`, `git-workflow-and-versioning`.

<a id="t-267"></a>

#### T-26.7: Prove both adapters against authorized hosted test projects

- [ ] Verify central log ingestion and grouped issues on each real provider,
      in separate runs with one startup-selected provider. Await explicit
      provider/target authorization and credentials; do not purchase services.
- Files: diagnostics runbook and `TST-DIAGNOSTICS-002` evidence. Any reusable
  smoke helper stays small and server-only; code changes require their own
  affected checks and fresh review. No application feature expansion.
- Interfaces: the implemented facade/settings writer and each provider's
  authorized test project; sanitized evidence containing no credentials.
- Acceptance: for Sentry and Better Stack separately, find the same synthetic
  operation's safe log and issue by correlation; two separate requests with
  the same safe failure form one issue with two occurrences, while a distinct
  safe failure stays separate. An error-level log alone creates no issue.
  Toggle each destination and shared off, then prove new export stops after
  the documented refresh window. Inspect received fields for sensitive
  sentinels. Record provider, commit, environment, time and evidence links.
- Contract: hosted portion of `TST-DIAGNOSTICS-002`. Record per-provider
  outcomes and required unavailable evidence honestly; a single provider
  pass or local collector cannot mark both adapters hosted-ready.
- Checks: the runbook's actual installed invocation and provider UI/API
  observations, accounting for ingestion delay; exact commands must be
  documented by T-26.6 before this run. Review sanitized evidence, verify local
  docs links/formatting and `git diff --check`. Reuse unchanged code checks;
  rerun affected tests if the smoke needs a code repair.
- Dependencies/prerequisites: T-26.6 and explicitly authorized isolated provider
  projects, ingest credentials and test target. Missing access blocks this
  hosted task without invalidating earlier local work. One evidence/review
  unit; parent T-26 remains incomplete after it.
- Recommended AgentForge skills: `observability-and-instrumentation`,
  `security-and-hardening`, `testing-first-class`, `documentation-and-adrs`,
  `code-review-and-quality`, `git-workflow-and-versioning`;
  `test-driven-development` if executable smoke code or behavior changes.

<a id="t-268"></a>

#### T-26.8: Refuse unsafe runtime targets before client initialization

- [x] Deliver the runtime-specific validation boundary from the accepted
      [runtime plan](docs/agentforge/plans/2026-09-19-t-26-runtime-safety-and-alerts.md).
- Files: pure/runtime modules under `src/shared/environment/`, shared rules in
  `scripts/environment/core.ts`, `db/db.ts`, `lib/auth.ts`, `src/sanity/config.ts`
  and client composition; focused configuration and environment tests.
- Interfaces: validated runtime inputs distinct from operator/migration inputs,
  safe target/release identity and sanitized initialization failure.
- Acceptance: refuse wrong profile, DB identity, origin, dataset or mail policy
  before constructing unsafe clients; Production needs no direct migration URL
  or provider-admin credentials. Preserve assigned Preview origins, build-time
  behavior and existing pool lifecycle; validation performs no import/build I/O.
- Contracts/checks: local configuration portion of `TST-RUNTIME-001`, preserving
  `TST-ENV-001`, auth and landing boundaries. Run `pnpm exec vitest run src/shared/environment src/test/environment`,
  `pnpm test:pipeline`, `pnpm test:integration`, `pnpm test:e2e` and the common
  final gate. Test secret sentinels and refusal before client construction.
- Dependencies/prerequisites: T-26.6 in the default shared-file sequence;
  installed dependencies, Docker and Chromium for required runtime regressions.
  One runtime-composition review unit; no hosted change in this task.
- Evidence, 2026-09-24: [runtime target validation](docs/agentforge/evidence/2026-09-24-runtime-target-validation.md)
  records shared pure rules, runtime-only Production inputs, Preview origin,
  sanitized refusals before client construction, 125 focused, 235 pipeline,
  607 unit and 29 integration tests, 8 Chromium journeys, typecheck, lint,
  build and a real `next start` refusal. `TST-RUNTIME-001` is `partial`.
- Review: the first independent review found that the Preview seed would be
  refused for a missing per-preview `DATABASE_BRANCH`; it now applies the
  observed profile with a regression test, and the runbook's
  `SECRET_NAMESPACE` claim was corrected. A fresh exact-tip review confirmed
  the fixes before merge.
- Recommended AgentForge skills: `testing-first-class`, `test-driven-development`,
  `incremental-implementation`, `security-and-hardening`, `next-dev-loop`,
  `documentation-and-adrs`, `code-review-and-quality`, `git-workflow-and-versioning`.

<a id="t-269"></a>

#### T-26.9: Expose bounded, independent dependency health

- [x] Deliver app, database and CMS probes with protected remote dependency access.
- Files: `src/shared/health/` probes/tests, thin
  `app/api/health/[component]/route.ts`, local integration/runtime tests and
  `docs/runbooks/operations.md` with configuration and safe troubleshooting.
- Interfaces: `/api/health/app`, `/api/health/database`, `/api/health/cms`;
  safe component/status/release identity, HTTP 200/503 and secret-header refusal.
- Acceptance: reuse the pool for read-only `SELECT 1`; fetch fresh published CMS
  content without CDN/indefinite cache or Draft Mode. Bound acquisition, query
  and network work to the plan's initial three-second budget, release resources
  and cap in-flight work. Missing monitor setup is not readiness. CMS-only
  failure remains distinguishable; no target URLs/secrets/raw errors escape.
- Contracts/checks: health portion of `TST-RUNTIME-001`; preserve
  `TST-FOUNDATION-001`, `TST-LANDING-001`/`003`, `TST-ENV-001`. Run
  `pnpm exec vitest run src/shared/health`, `pnpm test:integration`,
  `pnpm test:e2e` and the common gate. Use real disposable PostgreSQL, a
  controlled CMS HTTP server and isolated Next endpoints for success/refusal,
  failure/timeouts, cache bypass and resource-release proof. Unit mocks alone
  do not establish bounded DB work. Native monitor setup belongs to T-26.12.
- Dependencies/prerequisites: T-26.8; dependencies, Docker and Chromium.
  One health/readiness review unit; no external uptime account required locally.
- Evidence, 2026-09-24: [dependency health](docs/agentforge/evidence/2026-09-24-dependency-health.md)
  records bounded real-PostgreSQL and controlled-HTTP CMS probes (success,
  failure, acquisition/query/request timeouts, connection release, server-side
  cancellation, locked cache bypass), 619 unit and 37 integration tests, 9 Chromium
  tests, typecheck, lint, build and a real `next start` protection proof.
  `TST-RUNTIME-001` stays `partial` until T-26.10/T-26.12.
- Review: the first independent review asked for a test locking the CMS
  cache bypass; it was added, the health warning is now flushed, and the
  runbook wording was corrected. A fresh exact-tip review confirmed the fixes
  before merge.
- Recommended AgentForge skills: `testing-first-class`, `test-driven-development`,
  `incremental-implementation`, `api-and-interface-design`, `next-dev-loop`,
  `observability-and-instrumentation`, `security-and-hardening`,
  `documentation-and-adrs`, `code-review-and-quality`, `git-workflow-and-versioning`.

<a id="t-2610"></a>

#### T-26.10: Verify the running release during deployment smoke

- [x] Extend delivery smoke to compare actual runtime identity and readiness.
- Files: Production `scripts/deploy/production/runtime.ts`, core/tests;
  Preview `scripts/deploy/preview/vercel.ts`, core/tests; environment projection,
  both deployment workflows and their static tests; release/Preview runbooks.
- Interfaces: trusted deployment-observed identity supplied to runtime;
  bounded authenticated health smoke against the exact intended deployment.
- Acceptance: preserve provider project/ref/alias guards, then reject wrong
  runtime SHA or failed relevant readiness. A redirect or cached landing page
  is not DB/CMS health. Keep new monitor credentials environment-scoped and out
  of artifacts/errors. Preserve protected release approval and safe stage records.
- Contracts/checks: local delivery portion of `TST-RUNTIME-001`; preserve
  `TST-ENV-001`, `TST-PIPELINE-001`, `TST-PREVIEW-001`, `TST-RELEASE-001`.
  Run `pnpm test:pipeline`, controlled HTTP tests of smoke and the common gate.
  Cover mismatch, refused/timed-out health and valid identity. Actual deployed
  proof remains in T-26.12 and must not be inferred from local adapter tests.
- Dependencies/prerequisites: T-26.9, installed dependencies; one delivery
  integration review unit. No provider credentials/deployment required locally.
- Evidence, 2026-09-24: [release smoke](docs/agentforge/evidence/2026-09-24-release-smoke.md)
  records the shared health smoke over controlled HTTP (valid identity, wrong
  or unknown SHA, refused, unconfigured, failed and timed-out readiness, cold
  retries, no redirect), both adapters' forwarded identity and fail-closed
  secret checks, workflow static tests, pipeline, unit and browser gates.
  Hosted runs now need `HEALTH_PROBE_SECRET` in the `preview`/`production`
  Environments (owner provisioning, not done). `TST-RUNTIME-001` stays
  `partial` until T-26.12.
- Review: the independent review approved; its optional nits were taken
  (identity-check transport retry, body-timeout classification, secret log
  redaction, stale text); a confirmation review's mid-body reset nit was also
  fixed with a test. A fresh exact-tip review confirmed them before merge.
- Recommended AgentForge skills: `testing-first-class`, `test-driven-development`,
  `ci-cd-and-automation`, `security-and-hardening`, `documentation-and-adrs`,
  `code-review-and-quality`, `git-workflow-and-versioning`.

<a id="t-2611"></a>

#### T-26.11: Send release-failure alerts through the workflow Email adapter

- [x] Implement the complete local release-notification path, including workflow wiring.
- Files: `src/shared/operational-alerts/contracts.ts`, `resend-email.ts` and tests;
  `scripts/deploy/production/notify.ts` with testable core, workflow/static tests,
  `docs/runbooks/operations.md` and Production release guidance. Preserve auth mail.
- Interfaces: safe `OperationalAlert`, `NotificationPort.send(alert)` and the
  protected runner command `pnpm exec tsx scripts/deploy/production/notify.ts`.
- Acceptance: notify after the protected release step fails in migration,
  deployment or final smoke; success/skipped/unapproved execution and unrelated
  artifact failures do not notify. Validate the safe release record against
  trusted run/ref identity; use minimal unknown-stage metadata if absent.
  No database, auth-admission or live-app dependency. Protect sender/recipient/key,
  bound HTTP/retries, keep a stable attempt key and immutable retry payload,
  and preserve the original failure if notification fails. Document the 24-hour
  idempotency limit. Native uptime/Sentry events do not call this port.
- Contracts/checks: local release portion of `TST-ALERTS-001`, preserving
  `TST-RELEASE-001`/`TST-PIPELINE-001`. Run
  `pnpm exec vitest run src/shared/operational-alerts scripts/deploy/production`,
  `pnpm test:pipeline` and the common gate. Capture actual HTTP against a local
  collector for mapping, retries and secret sentinels; cover failed/slow/invalid
  responses, absent records and retained nonzero release result. No real mail.
- Dependencies/prerequisites: T-26.10 for serialized workflow integration;
  installed dependencies, no new SDK/account or local database required.
  One port/adapter/workflow review unit. Real runner/receipt proof is T-26.14.
- Evidence, 2026-09-24: [release-failure Email](docs/agentforge/evidence/2026-09-24-release-failure-email.md)
  records the port, Resend adapter and runner command against a local
  collector (mapping, stable key and identical retries, refusals, timeouts,
  invalid responses, redaction), trusted-record decisions and fallback, no
  app/database/auth imports and the release-step-only workflow condition.
  No real mail. The `production` Environment needs a `RELEASE_ALERT_EMAIL`
  secret (owner provisioning, not done). `TST-ALERTS-001` is `partial`.
- Review: the first independent review of `20fc5c4` requested one change:
  retry Resend `409` (same key still in progress) so a retry after a timeout
  is not a false "not sent"; fixed with a collector test. Its three
  documentation nits (cancel/timeout sends nothing, exact retried codes,
  structural release-result claim) are applied. The confirmation review
  approved `75a83a8` with no findings; its optional runbook clause (a
  `rejected` after a timeout may still arrive) is added as documentation only.
- Recommended AgentForge skills: `testing-first-class`, `test-driven-development`,
  `incremental-implementation`, `api-and-interface-design`, `ci-cd-and-automation`,
  `security-and-hardening`, `documentation-and-adrs`, `code-review-and-quality`,
  `git-workflow-and-versioning`.

<a id="t-2612"></a>

#### T-26.12: Prove deployed health and independent uptime Email

- [ ] Obtain the authorized deployed/runtime and Better Stack Uptime evidence.
- Files: operations/environment/release runbooks, redacted dated evidence and
  the testing ledger. Keep monitor configuration outside application health code.
- Interfaces: the implemented deployment smoke and generic health endpoints;
  native free-tier monitors and Email settings, with no custom relay.
- Acceptance: verify actual deployed target/SHA/readiness for Production and
  an authorized Preview, preserving their target guards. Configure Production-only
  app/DB/CMS monitors under the accepted timing policy; verify header protection,
  component distinction, one opening/recovery Email and no reminders or duplicate
  app notifications. A controlled external exercise proves detection/delivery
  independent of the app/DB. Record times without an onset-to-alert guarantee.
- Contracts/checks: deployed `TST-RUNTIME-001` and native-uptime portion of
  `TST-ALERTS-001`; preserve release/Preview and `TST-LANDING-002`/`003` obligations.
  Follow the exact implemented runbook commands from T-26.9/.10; inspect real
  monitor settings, recovery reset after another failure, and mailbox receipt.
  Check free-account entitlement, links, formatting and `git diff --check`.
  Reuse unchanged-code checks; repairs require their affected checks/review.
- Dependencies/prerequisites: T-26.10, separately approved exact-ref deployments,
  protected monitor secret and recipient, provider access and an approved
  disposable/controlled outage target. No unapproved Production failure injection,
  content publish, paid upgrade or permanent non-Production monitor. One hosted
  evidence unit; unavailable access leaves the required proof pending.
- Recommended AgentForge skills: `testing-first-class`, `shipping-and-launch`,
  `observability-and-instrumentation`, `security-and-hardening`,
  `documentation-and-adrs`, `code-review-and-quality`, `git-workflow-and-versioning`.

<a id="t-2613"></a>

#### T-26.13: Prove native Sentry group-transition Email

- [ ] Configure and verify the initial Production Sentry Free notification route.
- Files: diagnostics/operations runbooks and redacted `TST-ALERTS-001` evidence.
- Interfaces: existing Sentry adapter, Production startup selection and native
  first-seen/regression Email settings. Retain Better Stack adapter support.
- Acceptance: one Email for a new unexpected group and for recurrence after
  provider resolution; repeated occurrences, expected user errors and ordinary
  warnings do not each notify. Inspect overlapping issue rules and Issue Workflow
  preferences. No app port/relay duplicates native delivery; quotas/disabled
  ingestion are documented limits and never trigger a silent provider fallback.
- Contracts/checks: native-group portion of `TST-ALERTS-001`, preserving
  `TST-DIAGNOSTICS-001`/`002`. Use T-26.6's documented synthetic-event invocation,
  approved real provider observations and mailbox receipt. Recheck free-tier
  availability; local capture cannot prove grouping or delivery. Check sanitized
  evidence, local links, formatting and `git diff --check`.
- Dependencies/prerequisites: T-26.7, authorized Production Sentry configuration,
  recipient/account preferences and synthetic event/send permission. One hosted
  evidence unit; no paid/API integration procurement or forced real app failure.
- Recommended AgentForge skills: `testing-first-class`, `observability-and-instrumentation`,
  `security-and-hardening`, `documentation-and-adrs`, `code-review-and-quality`,
  `git-workflow-and-versioning`.

<a id="t-2614"></a>

#### T-26.14: Prove protected release Email and close operational evidence

- [ ] Verify real workflow-side Resend delivery and reconcile the complete T-26 baseline.
- Files: protected workflow configuration/runbook, dated sanitized evidence,
  testing ledger and this tracker; any small controlled exercise helper/tests.
- Interfaces: the implemented NotificationPort/Resend path and protected-runner
  failure record. Use the existing verified sender and configured operator recipient.
- Acceptance: an authorized controlled runner exercise sends an accepted message
  that is actually received, without calling the monitored app/DB. Prove bounded
  notification failure preserves the original failed result; local negative-path
  evidence may cover provider refusal without deliberately breaking Production.
  Record idempotency/receipt limits and all three ownership paths in the runbook.
- Contracts/checks: final release-delivery portion of `TST-ALERTS-001`, plus
  reconciliation of logging/diagnostics/runtime contracts and historical release
  evidence. Follow T-26.11's exact documented runner invocation, inspect protected
  settings and recipient receipt; links, formatting and `git diff --check`.
  Code/helper changes also require focused tests, the common gate and fresh review.
- Dependencies/prerequisites: T-26.11–T-26.13 and T-26.7; explicit recipient/send
  and controlled-run authorization, protected Resend credential, verified sender
  and permitted runner access. One evidence/parent-closeout review unit. No real
  failed migration or destructive outage is required to simulate a failed record.
  Close T-26 only when every required child/evidence boundary is complete.
- Recommended AgentForge skills: `testing-first-class`, `ci-cd-and-automation`,
  `observability-and-instrumentation`, `security-and-hardening`,
  `documentation-and-adrs`, `code-review-and-quality`, `git-workflow-and-versioning`;
  `test-driven-development` for executable helpers or repairs.

### T-27: Complete authentication product flows and abuse resistance

- [ ] Deliver the accepted recovery and abuse-resistance scope through T-27.1–T-27.4 below. Planning does not start implementation.
- Accepted scope, 2026-09-19: [D-011](.dwf/decisions/PRODUCT.md#d-011), [TD-032](.dwf/decisions/TECHNICAL.md#td-032), and [SPEC account recovery and abuse resistance](.dwf/output/agent/SPEC.md#account-recovery-and-abuse). No broad account-flow product choice remains open; exact lifetimes, limits, windows and copy are grounded implementation proposals.
- Accepted approach: [account recovery and abuse resistance plan](docs/agentforge/plans/2026-09-19-t-27-account-recovery.md). The breakdown below uses it without creating an overlapping plan; implementation remains pending.
- Decision-record checks, 2026-09-19: nine documentation files pass scoped Prettier and diff checks; all 537 local links/anchors resolve. The 31 existing test-contract statuses and TD-029–031/T-26 scope are preserved; three new auth contracts are `specified`. Normal commit hooks and a fresh exact-tip independent review gate delivery. No runtime, provider, migration or hosted verification is claimed.
- Files: Better Auth configuration/routes, verification and password-reset UI, existing auth-mail seam, shared PostgreSQL rate-limit persistence and any required forward migration, focused tests, and security/runbook documentation. No new mail provider or auth architecture.
- Interfaces: Better Auth request/reset and verification-resend APIs, automatic session revocation on successful reset, supported per-IP limits, and atomic shared recipient mail admission across instances.
- Acceptance: neutral recovery request; expiring single-use reset link; successful reset revokes all sessions and requires ordinary sign-in, while requesting mail does not change authentication state. Verification supports bounded resend and expired/invalid-link recovery with normal framework behavior. IP and recipient limits cover verification/reset/magic-link mail including automatic sends, cause a temporary wait without account lockout, and preserve privacy and environment mail policy. The SPEC owns the exact contract.
- Contracts/evidence: [TST-AUTH-004](.dwf/decisions/TESTING.md#tst-auth-004), [TST-AUTH-005](.dwf/decisions/TESTING.md#tst-auth-005), and [TST-AUTH-006](.dwf/decisions/TESTING.md#tst-auth-006) are `specified`, with implementation and executable evidence pending. Preserve TST-AUTH-001–003 and the completed local browser slice; local capture does not prove hosted delivery.
- Checks: TDD-focused auth tests, integration/browser journeys, `pnpm test`, `pnpm test:integration`, `pnpm test:e2e`, `pnpm typecheck`, `pnpm lint`, and `git diff --check`.
- Dependencies/unblock: T-21.5's Production mail foundation, T-18's environment/mail policy and T-24's test boundaries are complete. The scope, plan and breakdown are accepted; execution needs installed-version grounding, Docker/Chromium for local evidence and the separate hosted approvals. Account deletion, profile/email editing, social login, MFA, CAPTCHA procurement and new services are outside scope.
- Recommended AgentForge skills: `better-auth-best-practices`, `email-and-password-best-practices`, `security-and-hardening`, `testing-first-class`, `test-driven-development`, and `git-workflow-and-versioning`.

Local email-verification browser journey, explicit T-27 acceptance:

- Plan: [completed local browser slice](docs/agentforge/plans/2026-09-09-t-27-email-verification-browser.md). On 2026-09-09 the owner authorized this slice independently of the then-pending T-21.5 and T-24. It is historical baseline evidence, not the implementation plan for the later accepted recovery/abuse scope above.
- [x] Reconcile TST-AUTH-001/TST-E2E-001 and implement the fresh-account browser journey below. Focused Chromium 1/1, full Chromium 8/8, unit 268/268, integration 23/23, typecheck, lint with only the existing unused `Geist` warning, changed-file Prettier, and `git diff --check` pass. The HTML report archive contains zero token-bearing verification strings after the review repair; three focused diagnostic-redaction tests pass. Independent review of the final commit gates the task PR. The parent T-27 remains incomplete.

- [x] Add one self-contained Chromium test, `e2e/email-verification.spec.ts`, that creates a fresh account through `/sign-up`, observes verification pending, reads its captured verification link, opens that link in the same browser context, and proves authenticated access to `/dashboard` and the new account's Inbox.
- [x] Before consuming the link, prove the pending account cannot access `/dashboard`; expect the existing sign-in redirect. After verification, sign out and sign in with the same password to prove that the verified account retains its credential. Do not substitute a seeded, already verified account, injected session cookies, direct database updates, or direct `auth.handler` calls for this browser journey.
- [x] Keep the version-one inbox link-only: reuse the existing recipient/URL/token metadata capture. HTML rendering, an inbox UI, SMTP emulation, and a new mail-provider framework are outside this slice. No Resend account, real email delivery, DNS setup, or paid domain is required for this local test.

Implementation guidance, grounded in the current stack:

- Reuse `@playwright/test` through `e2e/fixtures.ts`, the serial Chromium configuration in `playwright.config.ts`, and `e2e/global-setup.ts`. That harness owns the disposable local PostgreSQL 18 Testcontainer, migrations, dedicated Next.js server, test content, and temporary mailbox. Required execution prerequisites are installed pnpm dependencies, available Docker, and the installed Chromium browser; report missing prerequisites without substituting a hosted database or silently installing/starting services.
- Exercise the existing Next.js sign-up UI and `authClient.signUp.email` path. Keep Better Auth responsible for token generation, validation, and session creation through `lib/auth.ts`, its Drizzle adapter, and the existing auth Route Handler. Preserve `requireEmailVerification` and `autoSignInAfterVerification`; do not implement a second token or session system. Consult the installed Next.js documentation and the installed Better Auth version's official docs/source before any runtime changes.
- Use `getByLabel("Name")`, `getByLabel("Email")`, `getByLabel("Password")`, and `getByRole("button", { name: "Create account", exact: true })`. Assert the existing `Check your inbox` heading and the `status` notice about waiting for email verification with Playwright's retrying assertions. Reuse current accessible copy and roles rather than changing product text to satisfy the test.
- Allocate a fresh synthetic recipient for each test attempt, including retries. Clear the existing local mailbox before the journey and in `finally`, as `e2e/magic-link.spec.ts` does. Reuse `readMagicLinkWithRetry(email)` despite its historical name; it reads verification messages too. Use its bounded polling rather than fixed sleeps. Confirm the message belongs to this recipient and its URL targets the dedicated test origin and `/api/auth/verify-email`, then navigate in the browser with `page.evaluate` so the verification URL is absent from Playwright report step titles. Poll only the resulting pathname and redact token query values from browser diagnostics. Do not print the captured URL or token in logs or committed evidence; protect any local browser artifacts that contain them.
- Keep delivery selection behind `deliverAuthEmail` in `src/modules/auth/infrastructure/auth-mail.ts`. Local/test execution uses the existing explicitly enabled mailbox; Production transport was subsequently completed in T-21.5 under [TD-027](.dwf/decisions/TECHNICAL.md#td-027). Do not weaken Preview/Production mailbox guards to run this test.

Verification and evidence for this slice:

- Run `pnpm exec playwright test e2e/email-verification.spec.ts --project=chromium` for the focused journey, then the existing `pnpm test:e2e` Chromium suite as the final browser gate. The parent task's required checks still apply when implementing T-27; use its focused auth integration checks if runtime behavior changes.
- Reconcile the exact signup/verification browser evidence through `testing-first-class` with [TST-AUTH-001](.dwf/decisions/TESTING.md#tst-auth-001) and [TST-E2E-001](.dwf/decisions/TESTING.md#tst-e2e-001), adding or extending the canonical contract before implementation if needed. Keep the separate [TST-AUTH-002](.dwf/decisions/TESTING.md#tst-auth-002) magic-link evidence intact. Do not infer remote delivery or inbox placement from local capture.
- Coverage clarification: T-15's browser test covers magic-link request/read/consume; the 2026-09-09 T-27 slice now proves signup email verification through the real browser UI as well as the existing backend integration coverage. Earlier T-11/T-15 closeout wording did not establish this journey. T-27's parent dependencies remain in force for its other work; the owner-approved local slice is complete.

<a id="t-271"></a>

#### T-27.1: Provide atomic shared authentication admission

- [x] Deliver the auth-owned PostgreSQL counter store and supported limiter adapter.
- Files: `db/schema/auth-rate-limit.ts`, schema exports, generated forward
  migration/metadata, `src/modules/auth/infrastructure/auth-rate-limit.ts`,
  policy defaults and colocated unit/real integration tests. Preserve applied history.
- Interfaces: Better Auth's supported `customStorage.consume(key, rule)` and
  separate namespaced recipient request/send admission using opaque HMAC keys.
- Acceptance: atomic first-use, exhaustion and window expiry across independent
  connections; reject without extending a window. Use database time and bounded
  expired-row cleanup. No raw email/IP keys or per-instance fallback; common
  store failure denies mail admission safely. Do not mutate credentials/sessions.
- Contracts/checks: storage portion of `TST-AUTH-006`; preserve foundation,
  migration and harness contracts. Run `pnpm exec vitest run src/modules/auth`,
  `pnpm exec vitest run --config vitest.integration.config.ts src/modules/auth`,
  `pnpm test:integration`, `pnpm exec drizzle-kit check --config drizzle.config.ts`
  and the common final gate. Prove fresh-chain/prior-schema upgrade and concurrent
  independent limiters on disposable local PostgreSQL. Hosted proof is T-27.4.
- Dependencies/prerequisites: completed T-18/T-21.5/T-24 and execution authority;
  installed Better Auth API review and Docker/PostgreSQL 18. No dependency on
  logger implementation. One storage/admission review unit, no hosted mutation.
- Evidence, 2026-09-24: [shared admission](docs/agentforge/evidence/2026-09-24-auth-admission.md) records the
  `auth_rate_limit` forward migration, the atomic UPSERT store, opaque HMAC
  keys, separate recipient request/send budgets, the `customStorage` adapter
  and policy defaults, proven on disposable PostgreSQL with independent pools
  (first use, exhaustion without extension, expiry, bounded cleanup,
  environments, failure denial, prior-schema upgrade). Not yet wired into
  Better Auth (T-27.2). `TST-AUTH-006` is `partial`.
- Review: the independent review approved `861a4d5` with no blockers or
  should-fix items. Deferred to T-27.2: pass an autocommit Pool (not an open
  transaction client) and fix the `AdmissionQueryable` comment; wire
  `onUnavailable` to sanitized diagnostics.
- Recommended AgentForge skills: `testing-first-class`, `test-driven-development`,
  `incremental-implementation`, `better-auth-best-practices`,
  `migration-history-workflow`, `security-and-hardening`, `documentation-and-adrs`,
  `code-review-and-quality`, `git-workflow-and-versioning`.

<a id="t-272"></a>

#### T-27.2: Integrate native recovery and bounded auth-mail delivery

- [x] Wire recovery, shared admission and explicit mail lifetime through Better Auth.
- Files: `lib/auth.ts`, auth configuration/factory and mail scheduler,
  `src/modules/auth/infrastructure/auth-mail.ts`, `resend-mail.ts`, auth route,
  standalone seed callers named in the account plan and focused integration tests.
- Interfaces: native reset/verification APIs, trusted `password-reset` message,
  Next `after()` scheduler and awaited/drained standalone scheduler; shared IP,
  recipient request and actual-send budgets from T-27.1.
- Acceptance: neutral known/unknown reset requests with expiring single-use
  tokens; successful reset revokes all sessions and does not auto-sign-in.
  Requests/invalid/expired/replayed/throttled links leave sessions and credentials
  unchanged. Cover automatic and `auth.api` sends without relying on HTTP limits.
  Preserve native verification semantics, Preview suppression and local mailbox.
  Denied actual-send admission does not reveal account existence or lock accounts.
- Contracts/checks: backend portions of `TST-AUTH-004`–`006`; preserve AUTH-001–003
  and environment boundaries. Run `pnpm exec vitest run src/modules/auth`,
  `pnpm test:integration`, `pnpm test:e2e` and the common gate. Prove concurrent
  token consumption, refusal of two previous sessions only after reset, trusted
  proxy IP handling and all send paths. A controlled pending mail operation proves
  responses do not await provider latency; seeds must explicitly drain delivery.
- Dependencies/prerequisites: T-27.1; installed dependencies, Docker and Chromium.
  One auth/mail integration review unit; no new provider, queue or auth architecture.
- Evidence, 2026-09-25: [native recovery](docs/agentforge/evidence/2026-09-25-native-recovery.md) records native reset
  (30-minute single-use tokens, revocation of every session, no auto sign-in),
  limits on in every environment, recipient request cooldown and actual-send
  cap across HTTP, `auth.api` and automatic sends, fail-closed admission,
  post-response mail with explicit standalone draining in the four seeds, and
  synthetic client addresses in tests instead of disabled limits.
  `TST-AUTH-004`/`005` are `partial`; `006` stays `partial`.
- Review: pending a fresh exact-tip independent review before merge.
- Recommended AgentForge skills: `testing-first-class`, `test-driven-development`,
  `incremental-implementation`, `better-auth-best-practices`,
  `email-and-password-best-practices`, `security-and-hardening`, `next-dev-loop`,
  `documentation-and-adrs`, `code-review-and-quality`, `git-workflow-and-versioning`.

<a id="t-273"></a>

#### T-27.3: Deliver recovery screens and real local browser journeys

- [ ] Add password/verification recovery UI and integrate local evidence/runbooks.
- Files: `app/(auth)/forgot-password`, `reset-password`, `verify-email`, matching
  `components/auth/` forms, sign-in/sign-up recovery links, auth-flow helpers,
  `src/test/browser-diagnostics.ts` and tests; new recovery E2E specs and auth runbook.
- Interfaces: supported auth-client recovery/resend APIs, bounded retry feedback,
  safe local callbacks and the existing explicitly enabled test mailbox.
- Acceptance: request/capture/consume reset via actual UI, reject old password
  and sessions, then ordinary new-password sign-in. Pending/invalid/expired
  verification has a resend path without bypassing private-access checks.
  Redact both reset-token path and query forms; no token/email in callback logs
  or public evidence. Preserve accessible labels, native auth and old journeys.
- Contracts/checks: local completion of `TST-AUTH-004`–`006`, preserving UI/E2E
  and baseline auth evidence. Run `pnpm exec vitest run src/modules/auth src/test/browser-diagnostics.test.ts`,
  `pnpm exec playwright test e2e/password-recovery.spec.ts e2e/verification-recovery.spec.ts e2e/email-verification.spec.ts e2e/magic-link.spec.ts --project=chromium`,
  `pnpm test:integration`, `pnpm test:e2e` and the common gate. Use fresh recipients,
  retrying assertions, real browser navigation and inspect sanitized artifacts;
  no seeded verified user or direct token/session writes replace the journeys.
- Dependencies/prerequisites: T-27.2; Docker, matching Chromium and installed
  dependencies. One UI/browser/runbook review unit. Remote receipt remains T-27.4.
- Recommended AgentForge skills: `testing-first-class`, `test-driven-development`,
  `frontend-ui-engineering`, `email-and-password-best-practices`, `next-dev-loop`,
  `browser-testing-with-devtools`, `security-and-hardening`, `documentation-and-adrs`,
  `code-review-and-quality`, `git-workflow-and-versioning`.

<a id="t-274"></a>

#### T-27.4: Prove protected migration and hosted recovery mail

- [ ] Obtain the account extension's authorized hosted migration and mail evidence.
- Files: auth-mail/release runbooks, dated redacted evidence, testing ledger and TODO.
- Interfaces: reviewed forward migration, protected exact-ref release and native
  password/verification browser flows using the selected Production mail transport.
- Acceptance: first prove the migration on the authorized non-default Neon branch,
  then apply through the protected release gate. With approved test identities,
  verify actual reset/resend receipt and consumption, stale-session refusal and
  ordinary new-password sign-in. Preserve environment and privacy controls;
  old transport evidence is not proof of these new journeys or inbox placement.
- Contracts/checks: hosted AUTH-004–006 and migration/environment/release evidence;
  use the exact implemented auth-mail and release runbook commands after target
  checks. Inspect mailbox receipt and deployed browser results, preserve required
  deployed Sanity smoke/webhook proof, check links/formatting and `git diff --check`.
  Reuse unchanged local evidence; any repair receives affected checks/review.
- Dependencies/prerequisites: T-27.3, authorized non-default branch/direct role,
  protected Production migration/release approval, configured verified sender,
  recipient/test accounts and explicit send permission. One hosted closeout unit;
  no destructive migration, account cleanup or real-user session reset is implied.
- Recommended AgentForge skills: `testing-first-class`, `migration-history-workflow`,
  `better-auth-best-practices`, `email-and-password-best-practices`,
  `shipping-and-launch`, `browser-testing-with-devtools`, `security-and-hardening`,
  `documentation-and-adrs`, `code-review-and-quality`, `git-workflow-and-versioning`.

### T-28: Add Sanity authenticated preview and live authoring

- Planning checks, 2026-09-19: all nine affected documentation files pass scoped Prettier and diff checks; 611 local links/anchors resolve. The 35 existing test-contract statuses are preserved and TST-LANDING-004 is `specified`. Normal commit hooks, fresh exact-tip independent review and main-push CI gate delivery; no editorial preview or hosted evidence is claimed.
- Review repair: a network-free synthetic probe found that the installed preview helper logs a present secret when redirect syntax is malformed in development. The plan and TST-LANDING-004 now require a quiet syntax precheck and log-refusal evidence while preserving framework authorization/cookies. This is a planning correction, not a runtime fix or verified preview contract.

- [ ] Implement the next-cycle editorial preview scope activated by [D-013](.dwf/decisions/PRODUCT.md#d-013) and [TD-034](.dwf/decisions/TECHNICAL.md#td-034), using the accepted [editorial preview plan](docs/agentforge/plans/2026-09-19-t-28-editorial-preview.md) and T-28.1–T-28.3 below. Await execution authority and scoped prerequisites.
- Files: Sanity presentation/preview routes and configuration, authenticated Draft Mode/Visual Editing/Live integration, webhook/revalidation handling, browser tests, and Sanity runbooks.
- Interfaces: existing Sanity editor identity and supported private-secret Draft Mode handshake; authorized draft reads/live subscriptions/field navigation/exit; published cache and webhook/recovery preservation. Local, Development and Production editorial sessions use the existing `production` dataset. Deployment Preview remains read-only on non-production `preview` with no editorial activation or draft token.
- Acceptance: editors see unpublished changes update live and click through to Studio fields; ordinary visitors retain published content. Only authorized draft responses may receive a read-only Viewer token, never write-capable editor credentials. Shared preview access is disabled; session, secret and membership/token revocation limits follow TD-034.
- Contracts/evidence: new `TST-LANDING-004` is `specified`; preserve existing `TST-LANDING-001`–`003` statuses and evidence boundaries. Fixtures and ordinary Playwright cannot substitute for real Studio/provider/browser proof; the read-only smoke and real deployed webhook clauses remain intact.
- Checks: focused Sanity tests, authorized real Studio/live/browser evidence, existing read-only/deployed Sanity checks at their required boundary, `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, changed-file formatting and `git diff --check`; `pnpm test:pipeline` when environment/delivery wiring changes.
- Dependencies/unblock: T-22/T-24 and the product/dataset/plan decisions are satisfied. Execution waits for its scoped prerequisite checks. Real hosted verification needs Viewer credentials, existing editor access, trusted origins/CORS, an allowed running target and authorization for the demonstrated provider actions. Planning creates no resources, edits no provider content and performs no deployment.
- Recommended AgentForge skills: `planning`, `source-driven-development`, `documentation-and-adrs`, `browser-testing-with-devtools`, `testing-first-class`, `test-driven-development`, and `git-workflow-and-versioning`.

<a id="t-281"></a>

#### T-28.1: Guard editorial configuration and preview authorization

- [ ] Add the environment/token boundary and supported Draft Mode entry/exit routes.
- Files: `src/sanity/preview-config.ts`, server-only preview composition,
  `app/api/draft-mode/enable/route.ts`, `disable/route.ts`, environment safe
  projection/tests, deployment adapters/workflows and refusal tests.
- Interfaces: disabled-by-default public capability flag, private Viewer token,
  existing Sanity private-secret handshake, async Draft Mode cookies and safe exit.
- Acceptance: allow only Local/Development/Production editorial sessions on
  `production`; deployment Preview omits the token and refuses activation.
  Disabled preview needs no token and does not break public build/read behavior.
  Quietly reject missing secret/malformed redirect before the helper can log a
  secret-bearing URL. Preserve native authorization, redirects and cookie behavior;
  public flag or Better Auth session alone grants no editorial access.
- Contracts/checks: boundary portion of `TST-LANDING-004`, preserving environment,
  Preview/release and published landing contracts. Run
  `pnpm exec vitest run src/sanity src/modules/landing src/test/environment`,
  `pnpm test:pipeline`, `pnpm test:e2e` and the common gate. Require focused route
  test discovery, secret sentinels, invalid/expired authorization and safe exit
  in the isolated Next runtime; no real Sanity credential required for local refusal.
- Dependencies/prerequisites: completed T-22/T-24, execution instruction,
  installed-version Next/Sanity guides, Docker and Chromium. Follow the default
  serial order to avoid shared environment/workflow edits; no auth feature dependency.
  One configuration/authorization review unit; no new packages or hosted mutation.
- Recommended AgentForge skills: `testing-first-class`, `test-driven-development`,
  `incremental-implementation`, `source-driven-development`, `security-and-hardening`,
  `next-dev-loop`, `ci-cd-and-automation`, `documentation-and-adrs`,
  `code-review-and-quality`, `git-workflow-and-versioning`.

<a id="t-282"></a>

#### T-28.2: Compose Studio preview, Live and field navigation

- [ ] Integrate the authorized preview branch and local regression evidence.
- Files: `sanity/presentation.ts`, `sanity.config.ts`, `src/sanity/preview.ts`,
  landing preview reader/presentation attributes, `app/page.tsx`,
  `components/landing/landing-page.tsx`, `exit-preview.tsx`, focused tests and
  Sanity/environment runbooks. Preserve root layout and published invalidation.
- Interfaces: supported Presentation/defineLive/VisualEditing APIs, clean
  validated landing model and four optional `data-sanity` attributes.
- Acceptance: only authorized landing preview mounts Live/overlays and receives
  the read-only Viewer browser token. Plain content retains validation; public
  output has no token, attributes or draft subscription. No draft data enters
  published cache. Explicit non-prefetched exit returns to published content;
  Studio stays out of the shared Live layout and shared preview access is disabled.
- Contracts/checks: local composition portion of `TST-LANDING-004`, preserving
  LANDING-001–003 and E2E published behavior. Run
  `pnpm exec vitest run src/sanity src/modules/landing`, `pnpm test:e2e`,
  `pnpm test:pipeline` if delivery changes, and the common gate. Inspect actual
  public/refusal Next responses and clean fixture mapping. These checks do not
  prove real provider draft authorization, Live or overlays; T-28.3 owns that proof.
- Dependencies/prerequisites: T-28.1; installed dependencies, Docker and Chromium.
  One preview-composition review unit. Leave unused Sanity scaffold intact.
- Recommended AgentForge skills: `testing-first-class`, `test-driven-development`,
  `incremental-implementation`, `frontend-ui-engineering`, `source-driven-development`,
  `next-dev-loop`, `browser-testing-with-devtools`, `security-and-hardening`,
  `documentation-and-adrs`, `code-review-and-quality`, `git-workflow-and-versioning`.

<a id="t-283"></a>

#### T-28.3: Prove real editorial preview and protected Production activation

- [ ] Obtain real Sanity/browser proof and reconcile the editorial runbook/evidence.
- Files: Sanity/environment/release runbooks, redacted evidence, testing ledger
  and TODO; actual provider configuration only within the approved target/scope.
- Interfaces: existing authorized Studio editor, Viewer credential, exact
  same-origin Presentation/CORS settings and protected deployment configuration.
- Acceptance: preflight intended dataset, read-only Viewer access and absence
  of active shared secrets. In separate editor/public contexts, make an approved
  unpublished edit, observe Live refresh, click the correct field and exit to
  published content. Anonymous visitors see published content and no token or
  draft subscription. Document secret/session/membership revocation limits accurately.
- Contracts/checks: actual-provider and hosted `TST-LANDING-004`; retain
  `pnpm sanity:smoke` and real signed webhook delivery for the deployed revision
  under LANDING-002/003. Follow T-28.2's exact runbook and the protected release
  process, inspect browser/network results without leaking tokens/draft content;
  links, formatting and `git diff --check`. Local fixtures are not hosted proof.
- Dependencies/prerequisites: T-28.2; approved editorial/content exercise,
  authorized editor/Viewer access, exact origins/CORS and protected Production
  configuration/release approval. One hosted closeout unit. Content publishing,
  deletion/cleanup or credential revocation needs its explicit scope; no bypass
  of access/framing protections or silent paid upgrade. Close T-28 only with proof.
- Recommended AgentForge skills: `testing-first-class`, `source-driven-development`,
  `shipping-and-launch`, `browser-testing-with-devtools`, `security-and-hardening`,
  `documentation-and-adrs`, `code-review-and-quality`, `git-workflow-and-versioning`.

### T-29: Publish the derived-application extension and replacement guide

- Plan: [derived application guide](docs/agentforge/plans/2026-09-09-t-29-derived-application-guide.md). Owner authorized this documentation slice without a maintained example app.
- Final closeout, 2026-09-16: T-24 and T-25 are reviewed and merged; the plan's closeout section maps the newly implemented Production boundaries.
- [x] T-29.1 — Extend the existing guide's retargeting map with `scripts/deploy/production/core.ts` target constants, `runtime.ts` repository identity, protected Production workflow/settings and associated refusal tests. Preserve the illustrative-only adaptation smoke and require the derived application's own hosted evidence. No source/provider change or maintained example app.
- [x] T-29.2 — Review the complete retain/replace guide against source and the verified pipeline, check command shapes, relative links/anchors, changed-file Prettier and diff, then obtain fresh exact-tip independent review and pass hosted CI before merge. AgentForge skills: `documentation-and-adrs`, `testing-first-class`, `code-review-and-quality`, `git-workflow-and-versioning` and `unslop`.
- [x] Write the [derived application guide](docs/architecture/derived-applications.md), including an illustrative adaptation smoke checklist. Relative links/anchors, source/command review, formatting and diff checks gate the documentation commit; fresh independent review gates its PR. No maintained or executed fork is claimed. The later T-24/T-25 reviewed closeouts satisfy the parent delivery prerequisites.

Review follow-through, within the existing guide scope:

- [x] Provide a short retain/replace checklist for todo modules and UI, migrations and seed data, auth/mail, Sanity, environment identity, and delivery workflows. Link to the owning instructions rather than adding another set of contracts.
- [x] Document Neon retargeting explicitly. At review time the original project identity was fixed in `scripts/neon-development/constants.ts`, checked in `scripts/neon-development/core.ts`, inherited by `scripts/deploy/preview/constants.ts`, and repeated in `.github/workflows/deploy-preview.yml`. Explain the coordinated changes and verification a fork needs; environment variables alone do not retarget this tooling. Preserve target guards. A new shared configuration architecture is a proposal requiring separate scope acceptance, not an implementation decision made by this guide.

The separate [fresh-fork experiment](FUTURE.md#fresh-fork-into-a-different-small-application) is a future idea, not an added T-29 acceptance criterion or dependency. T-27 authentication completion and T-28 CMS live authoring retain their existing scope and prerequisites.

- [x] Complete T-29 only after the core environment and delivery pipeline is reviewed.
- Files: `docs/architecture/`, a derived-application guide/example, replacement-seam documentation for domain/UI/CMS/deployment adapters, and template verification notes.
- Interfaces: documented seams for domain modules, UI surfaces, repositories, auth/mail, Sanity, database provider/branch policy, and delivery workflows; a minimal adaptation checklist that does not create a second framework.
- Acceptance: a derived app can identify what to replace versus retain, inherit the environment safety and test pipeline, and prove its own profile/preview/release setup; guidance remains opinionated and concrete rather than becoming a provider-agnostic abstraction catalogue.
- Contracts/evidence: add a template-derivation contract only if the DWF scope requires it; reuse `TST-ENV-001` and `TST-PIPELINE-001` as the safety baseline rather than creating duplicate authorities.
- Checks: documentation link/command review, adaptation smoke example, changed-file Prettier, and `git diff --check`.
- Dependencies/unblock: T-25 and the reviewed implementation of T-18 through T-24; product scope approval is required before adding a maintained example app.
- Recommended AgentForge skills: `documentation-and-adrs`, `spec-driven-development`, `testing-first-class`, `writing-guidelines`, and `git-workflow-and-versioning`.

T-29 final guide verification, 2026-09-16: the guide now maps the Production
Neon/Vercel/origin/fallback constants, exact GitHub repository check, protected
workflow/settings and refusal tests alongside the existing Development/Preview
seams. Commands and file responsibilities were checked against source; 95 local
links/anchors, changed-file Prettier and diff checks pass. The adaptation smoke
remains illustrative. Fresh independent review and hosted CI gate merge.

Final post-baseline dependency checkpoint, 2026-09-09: T-18.1 through T-18.4,
T-19, T-20 and T-21 are complete. The reviewed T-27 local verification journey,
T-21.5 Resend implementation and T-24 local pipeline evidence are merged.
T-21.5 still needs a verified owner mail domain and protected sender evidence.
T-22 needs the first Vercel deployment decision and adapter identity repairs;
T-23 needs its separately protected target and release workflow. T-24 hosted
and release boundaries remain pending. T-25 and T-29 can publish their
owner-authorized current documentation slices, while full delivery claims
remain conditional on those boundaries. T-26, broader T-27 and T-28 retain
their existing unaccepted scope or prerequisites. Do not infer hosted
readiness from local test results or authorize provider operations from this
backlog alone.

Update, 2026-09-14: the owner resolved the Vercel first-deployment
prerequisite with a placeholder Production deployment and provisioned the
separate Neon Production project `jolly-dew-32309276`. T-22's identity
repairs are implemented with local evidence. Later that day the owner-authorized
hosted run, manual owner check and identity-checked cleanup completed, so T-22
is complete and `TST-PREVIEW-001` is `verified`. Dependency recomputation: T-24's
hosted Preview boundary now has real evidence, while its Production release
rehearsal still waits for T-23; T-23 remains blocked only by T-21.5's
verified-domain requirement; T-28 still waits on T-24 and its product decision. Each future
hosted run still needs owner authorization.

Update, 2026-09-16: the [owner-domain and delivery slice](docs/agentforge/evidence/2026-09-16-resend-domain-delivery.md)
is complete. T-21.5 remains open only for its protected Production sender
configuration and verification. Start the next session with that acceptance,
then recompute readiness for T-23. T-24 already has its hosted Preview evidence
and still needs the protected release boundary; T-25/T-29 final delivery
documentation follows that evidence. T-26, broader T-27 and T-28 keep their
existing scope/decision prerequisites. The real test email initially arrived
in Spam; the owner's approved manual move to Inbox must not be recorded as
automatic inbox delivery. No Production configuration or deployment was
performed in this session.

Latest dependency checkpoint, 2026-09-16 after protected run `35103297897`:
T-21.5 is complete. PR #35 merged after independent review and passing CI;
the mail job then waited for its required reviewer and passed with scoped
Production settings. T-23's subsequent preflight confirmed its targets and
resolved the project-scoped Vercel credential blocker with explicit owner
confirmation. Scoped prerequisite settings, the plan and breakdown are ready
for implementation; protected-run validation and release evidence remain.
T-24 still needs T-23's release evidence; T-25/T-29 final delivery
documentation follows it. T-26, broader T-27 and T-28 retain their existing
scope and decision prerequisites. No application release or database change
was performed to close T-21.5.

Latest dependency checkpoint, 2026-09-16 after protected release `35114013699`:
T-23 is complete with the [live release evidence](docs/agentforge/evidence/2026-09-16-production-release-live.md).
T-24 is now unblocked for final reconciliation of its existing local tests,
T-22 hosted Preview lifecycle and T-23 protected release. T-25 and T-29 final
closeout follow that review. T-26 still requires agreed observability scope;
broader T-27 and T-28 still require their explicit product decisions. Earlier
checkpoint statements describe the state at their own time, not current blockers.

Latest dependency checkpoint after T-24 reconciliation, 2026-09-16:
T-18 through T-24 have the required baseline evidence. T-25 is unblocked for
final operational documentation, then T-29 can close its existing derived-app
guide scope. T-26 requires an agreed observability scope; broader T-27 and
T-28 require explicit product decisions. No new hosted operations are needed
for the documentation closeouts.

Latest dependency checkpoint after T-29 closeout, 2026-09-16:
All accepted baseline tasks and the existing derived-app guide are complete.
The only unchecked tasks are T-26, broader T-27 and T-28. T-26 now has its
technical prerequisites but still requires agreed observability scope; the
owner has been asked to choose that scope. Broader authentication and Sanity
live authoring retain their explicit product-decision prerequisites. No further
implementation is inferred from baseline completion alone.

## Repository maintenance

### T-30: Reconcile current documentation and complete approved housekeeping

- [x] Complete the owner-approved [housekeeping plan](docs/agentforge/plans/2026-09-18-repository-housekeeping.md). Final read-only inspection on 2026-09-18 confirms that the residual worktree directory and all four named empty reviewer-skill directories are absent; the earlier execution-policy blocker is resolved.
- [x] Review both stashes, remove the superseded T-27 snapshot, and preserve the unique dependency-upgrade snapshot unchanged.
- [x] Remove 43 completed local branches, 32 GitHub branches, five stale tracking refs, and the two expired disabled reviewer files. The secondary worktree is unregistered and fully removed. The owner-approved housekeeping branch was also deleted after PR #43 merged.
- [x] Correct stale current-state documentation and broken skill references, preserving historical evidence and existing contract statuses. Changed-file formatting and diff checks pass; 247 current documentation/skill files contain 343 valid local Markdown destinations. Fresh independent review of `c77c8b9202d817f519b662b6de2a5e6ee27abb62` returned no actionable findings; [PR #43](https://github.com/michi-guns/nextjs-todo-list-example/pull/43) merged after Quality and Harness passed. [Main CI](https://github.com/michi-guns/nextjs-todo-list-example/actions/runs/35344566757) also passed for merge `8bf38235f3fb29e25682f3d85a6b1c8058dd1df8`.
- Files: the six documentation/skill files named in the plan, this tracker, and the plan. Git cleanup affects only the approved refs, worktree, stash, and disabled reviewer artifacts. No application, dependency, database, or deployment changes.
- Acceptance: completed branch pointers and obsolete local artifacts are removed; the unique dependency-upgrade stash is retained; stale current-state claims and six broken documentation references are corrected; historical evidence and T-26/T-27/T-28 scope remain intact.
- Evidence contracts: reconcile prose against existing verified `TST-MIGRATION-001`, `TST-PERFORMANCE-001`, `TST-LANDING-002`, and `TST-LANDING-003`. Do not change their statuses or close the partial `TST-HARNESS-001` live-outage observation.
- Verification: fresh exact-ref/file preflight before deletion; final Git/stash/worktree inventory; documentation link/anchor checks; changed-file Prettier; `git diff --check`; fresh independent exact-tip review; normal PR CI. Reuse the same-turn unchanged-code audit evidence: `pnpm test` 42 files/415 tests, `pnpm typecheck --incremental false`, and `pnpm lint` with only the existing `Geist` warning.
- Dependencies: satisfied. The final inventory had clean synchronized `main`, one local and one remote branch, no open PRs, one registered worktree, and the intentionally retained dependency stash `ae0af7f5f1e79246b6b77e12ccf395103265d6d6`. This documentation-only closeout uses the same task branch and review/CI protocol. T-26 still needs agreed observability scope; broader T-27 and T-28 still need their product decisions. No further cleanup blocks selection of the next task.
- Recommended AgentForge skills: `planning`, `task-breakdown`, `documentation-and-adrs`, `git-workflow-and-versioning`, `code-review-and-quality`, `testing-first-class`, and `unslop`.

## Workflow and maintenance improvements

Accepted plan: [workflow, documentation, and dependencies](docs/agentforge/plans/2026-09-18-workflow-documentation-dependencies.md).

### T-31: Simplify task integration and branch cleanup

- [x] Replace mandatory PR delivery with task branches from `main`, reviewed direct merges, ordinary push authorization, and verified merged-branch cleanup.
- Files: `AGENTS.md`, this task protocol, Git/review/testing skills, testing execution guidance, and affected current development docs. Preserve historical PR evidence and protected release requirements.
- Acceptance: one consistent current workflow; no new permission for commit/push/eligible branch deletion; no deletion of unmerged, active, or unrelated work; stale documentation checked.
- Evidence: prose-only, no product `TST-*` status changes. Verify current-rule consistency, local Markdown destinations, changed-file Prettier, `git diff --check`, independent exact-tip review, and main-push CI.
- Dependencies: none. Prerequisites: repository, Git, installed formatter; all available.
- Verification, 2026-09-18: all 264 local Markdown destinations across eight changed files resolve; changed-file Prettier and `git diff --check` pass. Commit-hook `pnpm test` passes 42 files/415 tests. Fresh GPT-6-Astra `xhigh` review approved implementation commit `c655f94` with no actionable findings. This metadata tip receives its own independent review before integration; main-push CI is checked afterward. No product contract status changed.
- Recommended AgentForge skills: `planning`, `task-breakdown`, `git-workflow-and-versioning`, `documentation-and-adrs`, `code-review-and-quality`, `unslop`.

### T-32: Specialize documentation maintenance and agent-context audits

- [x] Adapt the existing documentation skill for a delegated specialist with product/domain/architecture documentation maintenance and focused AI-context audits.
- Files: `documentation-and-adrs`, `context-engineering`, `using-agent-skills`, `AGENTS.md`, and documentation protocol/navigation as needed. No application code or replacement framework.
- Interfaces: a scoped delegation brief with accepted intent, changed files/evidence and maintenance or read-only review mode; output with changes, anchored actionable findings, unresolved decisions and verification limits.
- Acceptance: one maintained source of specialist instructions; canonical DWF authority and ADR history preserved; scoped automatic routing; no invented requirements, blanket audits, recursive delegation, or copied source-project policies.
- Evidence: skill validation, independent forward-tests for maintenance/review boundaries, duplicate guidance and code/contract disagreement; local links, changed-file Prettier, diff check, independent exact-tip review, and main-push CI. Product `TST-*` statuses are unaffected.
- Dependencies: T-31. Prerequisites: repository and available sub-agents; available.
- Verification: [specialist evidence](docs/agentforge/evidence/2026-09-18-documentation-specialist.md) records the independent maintenance and read-only audit runs, including the actionable historical-reviewer wording correction. T-31 main-push [CI run 35361865667](https://github.com/michi-guns/nextjs-todo-list-example/actions/runs/35361865667) passed at `0a317a1`.
- Closeout, 2026-09-18: both adapted skills pass `quick_validate.py`; all 123 local Markdown targets across nine changed files resolve; formatting and diff checks pass. Commit-hook unit tests pass 42 files/415 tests. Fresh GPT-6-Astra `xhigh` review approved `99a0c27` with no findings. Final metadata receives a fresh exact-tip review before merge and main-push CI. T-33 is the next authorized task; T-26/T-27/T-28 retain their scope prerequisites.
- Recommended AgentForge skills: `documentation-and-adrs`, `context-engineering`, `git-workflow-and-versioning`, `code-review-and-quality`, `unslop`.

### T-33: Refresh stable dependencies while retaining TypeScript 6

- [x] Update direct dependencies to current stable compatible releases in related groups; retain TypeScript 6 and ESLint 9, and allow the Drizzle release-candidate line.
- Files: `package.json`, generated `pnpm-lock.yaml`, required compatibility fixes/tests, stack documentation and a dated evidence record. Preserve the existing dependency stash and database migration history.
- Acceptance: official release/migration notes reviewed; no experimental release except Drizzle; application behavior preserved; all required local checks pass; independent review and tidy direct merge.
- Evidence contracts: the local foundation, migration, harness, persistence, auth, list/task, concurrency, boundary, landing, UI/E2E and environment/pipeline contracts named in the accepted plan. Record fresh local results separately from historical hosted and performance evidence; do not close unrelated partial obligations.
- Checks: pre-upgrade `pnpm test`; per-group affected checks; final `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:integration`, `pnpm test:e2e`, `pnpm test:e2e:cross-browser`, `pnpm exec drizzle-kit check --config drizzle.config.ts`, `pnpm build`, changed-file Prettier, `git diff --check`, independent review, and main-push CI.
- Dependencies: T-32. Prerequisites: registry access/dependencies to implement; Docker and matching Playwright browsers for integration/browser checks. Initial preflight passes; install browser revisions required by the authorized upgrade.
- Previous task closeout: T-32 final commit `900e018` received fresh GPT-6-Astra `xhigh` approval and passed main-push [CI run 35363143600](https://github.com/michi-guns/nextjs-todo-list-example/actions/runs/35363143600). Its merged local branch was deleted; no PR was created.
- Closeout, 2026-09-18: [dependency evidence](docs/agentforge/evidence/2026-09-18-stable-dependencies.md) records passing typecheck, lint (existing warning), 415 unit tests, 23 integration tests, 8 Chromium and 24 cross-browser journeys, migration check, production build, frozen install, peers, formatting and links. It also records the investigated transient lint/browser diagnostics and unchanged successful reruns. Fresh GPT-6-Astra `xhigh` review approved implementation commit `b73b013` with no findings. This completion metadata receives its own fresh exact-tip review before direct merge; main-push CI is checked afterward. T-31/T-32/T-33 exhaust this session's authorized work. T-26/T-27/T-28 retain their existing product/prerequisite boundaries.
- Recommended AgentForge skills: `testing-first-class`, `incremental-implementation`, `source-driven-development`, `test-driven-development` for compatibility behavior changes, `next-dev-loop` when runtime changes, `documentation-and-adrs`, `code-review-and-quality`, `git-workflow-and-versioning`.

## Explicitly out of scope for this baseline

- OAuth or social login.
- Teams, organizations, shared lists, roles, or machine-authenticated APIs.
- Real-time collaboration, offline/PWA behavior, mobile apps, or multi-region operations.
- Recurring tasks, subtasks, tags, attachments, comments, or payments.
- Polished verification and password-reset flows were outside the original baseline; the later [T-27 recovery scope](#t-27-complete-authentication-product-flows-and-abuse-resistance) is accepted and awaiting implementation.
- Sanity Live, Draft Mode, Presentation Tool, and visual editing were outside the original baseline; [T-28](#t-28-add-sanity-authenticated-preview-and-live-authoring) now has accepted next-cycle scope under D-013/TD-034, with implementation still planned.
- Speculative database indexes, Redis, application-level query caching, and provider-swapping abstractions.
