# Delivery TODO

This file tracks implementation delivery for the starter baseline. The [DWF README](.dwf/README.md), [Agent PRD](.dwf/output/agent/PRD.md), [Agent SPEC](.dwf/output/agent/SPEC.md), and decision ledgers remain authoritative.

The [Testing Decisions and Test Contracts ledger](.dwf/decisions/TESTING.md) owns test policy, `TST-*` obligations, statuses, dependencies, and evidence expectations. This file assigns those contracts to delivery tasks; it does not redefine them.

Status markers:

- `[ ]` Not started
- `[~]` In progress
- `[x]` Complete
- `[!]` Blocked

## Temporary task branch and PR protocol

This is a temporary delivery protocol for the current implementation run. The DWF remains the design authority, and `TODO.md` remains the delivery tracker.

### Bootstrap exception

- The initial tracker and this protocol may be committed directly to the current `main` branch.
- After the bootstrap commit, every implementation task gets its own short-lived branch and pull request.

### Start a task

1. Read the relevant `TST-*` contracts before selecting implementation work. Identify evidence that is possible now and evidence that depends on later tasks or unavailable prerequisites.
2. Select the next unchecked task whose dependencies are satisfied. `T-03A` must be complete before selecting any later implementation task.
3. Start from the latest `main` and create `task/<task-id>-<short-slug>`, for example `task/T-06-lists-capability`.
4. Mark the task `[~]` on that branch and keep the change limited to the task and its required verification.
5. For multi-step work, use AgentForge `planning` first and `task-breakdown` second. Use the task's recommended agent skills, including `testing-first-class` before coding and `test-driven-development` for executable behavior. Do not silently expand scope or resolve a product/technical decision in code.

### Finish a task

1. Complete the task acceptance criteria and record the verification evidence in the task or its linked artifact.
2. Reconcile every referenced `TST-*` contract. Mark it `verified`, `partial`, `blocked`, `deferred`, or `retired` with the exact evidence or a linked follow-up; never silently omit a future integration or E2E obligation.
3. Run the focused checks plus the proportionate project quality gates. Do not claim a check passed when it was skipped.
4. Mark the task `[x]`, update any checkpoint it satisfies, and commit the complete task with a descriptive message such as `feat: implement lists capability`.
5. Push the branch with its upstream configured.
6. Open a pull request from the task branch into `main`. The PR body must include:
   - a concise summary of the behavior delivered;
   - the task ID and links to the relevant DWF PRD/SPEC sections;
   - the affected `TST-*` IDs and their status;
   - acceptance criteria and verification commands/results;
   - known limitations, follow-up tasks, and any external prerequisites.
7. Report the terminal handoff in this format:

   `T-XX | PR #N | <PR title> | <clickable GitHub URL>`

   Include the final commit SHA and the checks that ran below it.

### Authorization and safety

- The normal task workflow is pre-authorized: do not ask for separate permission to create the task branch, commit task changes, push the branch, or open the PR.
- Do not merge the PR, force-push, rewrite history, delete branches, reset data, or broaden credentials without an explicit request.
- Stop and report a blocker when the task needs a missing external resource, a new product or technical decision, unavailable credentials, or a destructive operation outside this protocol.
- Keep secrets out of commits, PR bodies, logs, and screenshots.

## Current baseline

- [x] DWF product and technical contracts reviewed.
- [x] Repository is a scaffold with empty capability folders, not a working todo app.
- [x] `pnpm typecheck` passes.
- [x] `pnpm lint` exits successfully, with one existing unused-`Geist` warning in `app/layout.tsx`.
- [x] `pnpm test` exits successfully, but currently finds no test files.
- [ ] Meaningful test, migration, Sanity, and browser evidence exists. Track the obligation set in [`TESTING.md`](.dwf/decisions/TESTING.md).

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
- [!] PostgreSQL 18 Testcontainers migration evidence is blocked until the reusable T-14 harness exists; the local integration check does not replace that obligation.
- [!] The prior two-step migration chain remains recorded on the agent-owned Neon development branch; the consolidated files were verified on a fresh local PostgreSQL database, and the cloud branch was not destructively reset.
- [x] Integration coverage proves uniqueness, cascade deletion, and required indexes/constraints.
- [!] The consolidated migration's final catalog exposes UUIDv7 defaults on the fresh local PostgreSQL database; applying this rewritten history to Neon requires a separately approved branch realignment.
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

- [!] Private list/task reads and mutations are deferred to T-09; the current `requireUser()` boundary fails closed for unauthenticated requests.
- [x] The local/test mailbox flow can request, read, and consume email-verification and magic links; both same-account lifecycle orders are covered.
- [x] Authenticated code never accepts a client-provided owner id.

Test contracts: `TST-AUTH-001`, `TST-AUTH-002`, `TST-AUTH-003`.

Evidence: `pnpm test` (6 unit tests), `pnpm test:integration` against disposable local PostgreSQL 18 (8 tests), and `pnpm exec drizzle-kit migrate` plus catalog inspection all pass. The auth contracts remain `partial` until T-09 adds private entry paths and T-15 records the required Chromium journeys.

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
- [!] The full verification-pending, verified sign-in, magic-link request/consume, and sign-out browser lifecycle remains T-15-owned; T-11 verified the route surfaces, safe `/dashboard` callback default, stable invalid-credential and invalid-token states, and the existing local PostgreSQL auth integration lifecycle without recording credentials or tokens.
- [x] Forms are keyboard accessible with labelled controls, visible focus tokens, pending/error/success states, long-content wrapping, and no horizontal overflow at `320px`, `768px`, `1024px`, and `1440px`.
- [x] `pnpm test`, `pnpm test:integration`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, changed-file Prettier checks, `git diff --check`, and `pnpm sanity:smoke` pass; lint reports only the pre-existing `app/layout.tsx:1:10` `Geist` warning.
- [x] A fresh GPT-5.6-Sol medium reviewer returned **No actionable findings** for reviewed code tip `7c1b617`; T-15's dedicated Playwright E2E contracts remain explicitly outstanding.

Test contracts: `TST-AUTH-001`, `TST-AUTH-002`, `TST-AUTH-003`, `TST-UI-001`, `TST-E2E-001`, `TST-E2E-002`.

Dependencies: T-02, T-05, T-09B, T-10, T-12.

Plan: [`docs/agentforge/plans/2026-08-31-t-11-public-landing-auth.md`](docs/agentforge/plans/2026-08-31-t-11-public-landing-auth.md).

Implementation scope and interfaces:

- Replace the scaffold `app/page.tsx` in place as the sole server-owned `/` landing route and add its provider-safe root error boundary without creating a duplicate `app/(marketing)/page.tsx`; add auth route group pages under `app/(auth)/` and composition-owned landing/auth UI under `components/landing/` and `components/auth/`.
- Add one client-only Better Auth wrapper under `lib/auth-client.ts` using `createAuthClient` and `magicLinkClient`; do not export provider records or server-only helpers through it.
- Add a framework-independent safe internal redirect/error helper and focused tests under `src/modules/auth/presentation/` only if the form boundary requires them.
- Consume `getPublishedLandingContent()` and `LandingContent` from the existing landing application/infrastructure boundary; leave Sanity client/query/configuration and the dashboard implementation untouched.

Evidence target: T-11 owns landing/auth materialized runtime evidence for `TST-UI-001` and the route/form prerequisites for T-15. `TST-AUTH-001`, `TST-AUTH-002`, and `TST-AUTH-003` remain `partial` until the T-15 browser and multi-user evidence is complete; `TST-E2E-001` and `TST-E2E-002` remain `specified` until T-15.

Evidence: The server-owned root route consumes `getPublishedLandingContent()` and renders the Focus Rail landing view; `app/error.tsx` provides a provider-safe retry boundary using Next.js 16.3.1's `retry` callback. `/sign-up`, `/sign-in`, and `/magic-link` use one Better Auth browser client with the installed magic-link plugin, safe internal redirect handling, stable public error messages, and explicit pending/success states. `pnpm test` passes (20 files, 110 tests); `pnpm test:integration` passes (6 files, 23 tests against disposable local PostgreSQL 18); `pnpm typecheck`, `pnpm build`, changed-file Prettier, and `git diff --check` pass; `pnpm lint` has only the pre-existing Geist warning; and `pnpm sanity:smoke` validates the configured landing singleton. Next MCP reports `issues: []`, `configErrors: []`, and `sessionErrors: []`, and the route map includes `/`, `/sign-up`, `/sign-in`, and `/magic-link`. Chromium inspection confirms labelled landmarks and controls, keyboard traversal, stable invalid-credential and invalid-token messages, zero axe violations on the landing/auth routes, and no horizontal document overflow for all four routes at `320x800`, `768x1024`, `1024x768`, and `1440x900`; a synthetic 500-character headline/CTA check also remains within 320px after the `wrap-anywhere` fix. The deterministic mailbox/browser lifecycle and multi-user isolation remain T-15 obligations.

Review gate: Runtime verification found the magic-link error-code double mapping and corrected it in `bd5a609`. Fresh GPT-5.6-Sol medium review of `bd5a609` found the Next retry callback and long-content wrapping issues and corrected them in `ef6e5e5`; a synthetic long-content check then required the Tailwind 4 `wrap-anywhere` refinement in `7c1b617`. The final fresh review of `7c1b617` returned **No actionable findings**. The repository's direct-main workflow required no PR branch; reviewed code tip `7c1b617` was pushed to `origin/main` before closeout.

Dependency recomputation: T-12A is now safely unblocked because T-10, T-11, T-12, and T-13 are complete. T-15 remains blocked until its listed T-05, T-09, T-10, T-11, and T-14 prerequisites are coupled with its dedicated Playwright/mailbox harness; T-17 remains blocked by T-12A and T-15.

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

- [ ] Review the implemented landing, auth, and dashboard surfaces against the selected direction handoff.
- [ ] Fix material issues in hierarchy, content density, overflow, responsive behavior, focus management, loading/error/empty states, and interaction clarity.
- [ ] Confirm the implementation uses project tokens and composable components without adding speculative UI infrastructure.

Recommended agent skills:

- `web-design-guidelines` for a current Web Interface Guidelines review of the implemented files.
- `frontend-ui-engineering` for accessibility, responsive, state, and component-quality corrections.
- `browser-testing-with-devtools` for console, DOM, focus, network, and viewport inspection in a real browser.
- `next-dev-loop` for verifying the corrected behavior in the running Next.js application.

Verification:

- [ ] The review produces concrete file/line findings or records that no actionable findings remain.
- [ ] The UI has no new console errors, obvious overflow, inaccessible controls, missing labels, or color-only critical state cues.
- [ ] The selected direction remains recognizable after implementation and the core product flow remains unchanged.

Test contracts: `TST-UI-001`, `TST-E2E-001`, `TST-E2E-002`, `TST-E2E-003`.

Dependencies: T-10, T-11, T-12, T-13.

## Checkpoint: core product

- [ ] Password and magic-link sign-in work locally.
- [ ] The full local journey works: sign in, obtain Inbox, create list, create task, change status, sign out.
- [ ] Lists and tasks are private, validated, paginated, and persisted in PostgreSQL.
- [ ] The landing page reads Sanity content and cache recovery is protected.
- [ ] The selected UI direction is materialized and the implemented surfaces have been audited.

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

- [ ] Replace the `playwright.dev` tests with the accepted todo journey under `e2e/`.
- [ ] Add one local command that starts PostgreSQL, applies migrations, loads deterministic behavior seed data, starts a dedicated Next.js test server, runs Playwright, and tears everything down.
- [ ] Run the required suite in Chromium and keep Firefox/WebKit as an explicit on-demand run.
- [ ] Add the magic-link mailbox journey.

Verification:

- [ ] `pnpm exec playwright test` passes against the harness-owned local database in Chromium.
- [ ] Cross-browser checks remain available separately for release or major UI changes.

Test contracts: `TST-HARNESS-001`, `TST-AUTH-001`, `TST-AUTH-002`, `TST-AUTH-003`, `TST-E2E-001`, `TST-E2E-002`, `TST-E2E-003`.

Dependencies: T-05, T-09, T-10, T-11, T-14.

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

- [ ] Update README setup instructions for the actual environment categories, local database harness, Sanity, and magic-link mailbox.
- [ ] Document any implementation-specific migration, test, and recovery commands without committing secrets.
- [ ] Run the final gates: `pnpm typecheck`, `pnpm lint`, `pnpm test`, affected Playwright tests, migration checks, and `git diff --check`.
- [ ] Review the implementation against the [SPEC definition of done](.dwf/output/agent/SPEC.md#13-definition-of-done-engineering-checklist).

Verification:

- [ ] All required local acceptance items have evidence.
- [ ] Skipped checks, pre-existing warnings, and remaining risks are recorded.

Test contracts: reconcile every active baseline contract in [`TESTING.md`](.dwf/decisions/TESTING.md) before closing this task.

Dependencies: T-12A, T-14, T-15, T-16.

## Explicitly out of scope for this baseline

- OAuth or social login.
- Teams, organizations, shared lists, roles, or machine-authenticated APIs.
- Real-time collaboration, offline/PWA behavior, mobile apps, or multi-region operations.
- Recurring tasks, subtasks, tags, attachments, comments, or payments.
- Polished email verification and password-reset product flows.
- Sanity Live, Draft Mode, Presentation Tool, and visual editing. These are deferred until after the webhook and manual-recovery baseline.
- GitHub Actions CI and deployed Vercel preview evidence.
- Speculative database indexes, Redis, application-level query caching, and provider-swapping abstractions.
