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

## Task branch and PR protocol

This protocol applies only to delivery tasks tracked in this file. The DWF remains the design authority, and `TODO.md` remains the delivery tracker.

Ordinary work that is not a `TODO.md` task follows [`AGENTS.md`](AGENTS.md): no PR requirement; commit and push to `main` is allowed. Do not use this protocol for that work.

Every `TODO.md` implementation task still gets its own short-lived branch and pull request.

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
4. Commit the complete task with a descriptive message such as `feat: implement lists capability`.
5. Spawn the independent closeout reviewer required by `AGENTS.md`: a fresh
   sub-agent on this harness's most capable model, at Grok `high`, Codex or
   Claude Code `xhigh`, or the highest available effort on GLM, Kimi, Qwen,
   and similar harnesses. Point it at that exact commit. Fix actionable
   findings, rerun affected checks, and spawn a new reviewer for each
   changed tip.
6. Mark the task `[x]`, update any checkpoint it satisfies, and commit remaining evidence.
   If that creates a new tip, spawn a new reviewer against it. Do not push or
   open a PR until the reviewed commit is the current branch/PR tip.
7. Push the branch with its upstream configured.
8. Open a pull request from the task branch into `main`. Use
   [`.github/PULL_REQUEST_TEMPLATE.md`](.github/PULL_REQUEST_TEMPLATE.md).
   The PR body must include:
   - a **Why this change** section at the top, written for product owners,
     stakeholders, and other non-engineers: 3-6 short everyday-language
     sentences covering what a person can now do, why it matters, and what
     this does not change, with no files, commands, or test IDs in that
     section;
   - a concise technical summary of the behavior delivered;
   - the task ID and links to the relevant DWF PRD/SPEC sections;
   - the affected `TST-*` IDs and their status;
   - acceptance criteria and verification commands/results;
   - known limitations, follow-up tasks, and any external prerequisites.
9. Report the terminal handoff in this format:

   `T-XX | PR #N | <PR title> | <clickable GitHub URL>`

   Include the final commit SHA and the checks that ran below it.

### Authorization and safety

- The normal task workflow is pre-authorized: do not ask for separate permission to create the task branch, commit task changes, push the branch, or open the PR.
- Do not merge the PR, force-push, rewrite history, delete branches, reset data, or broaden credentials without an explicit request.
- Stop and report a blocker when the task needs a missing external resource, a new product or technical decision, unavailable credentials, or a destructive operation outside this protocol.
- Keep secrets out of commits, PR bodies, logs, and screenshots.

## Current baseline

- [x] DWF product and technical contracts reviewed.
- [x] The runnable authenticated todo reference and reusable foundations are implemented across the capability modules, database, UI, and test harness.
- [x] `pnpm typecheck` passes.
- [x] `pnpm lint` exits successfully, with one existing unused-`Geist` warning in `app/layout.tsx`.
- [x] `pnpm test` passes 23 files and 121 tests.
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

Dependency checkpoint: T-18.1 through T-18.4, T-19, T-20, and T-21 are complete. T-21.5 remains blocked on an owner-approved Production mail provider. T-21.5 must still be in place before a Production release workflow is enabled. The Preview workflow must not be inferred from Vercel's default Git integration or run automatically on every pull request.

### T-21.5: Establish the minimum Production mail foundation

- [ ] Complete T-21.5 before T-23 can release Production.
- Files: the existing Better Auth mail boundary, a thin owner-approved remote mail adapter/configuration, non-secret profile documentation, focused auth/environment tests, and redacted delivery/health evidence.
- Interfaces: provider-backed `sendVerificationEmail` and `sendMagicLink` callbacks; explicit Production mail transport selection; protected provider configuration; fail-closed missing-configuration behavior; safe diagnostics that never expose message content, tokens, or credentials.
- Acceptance: Production verification and magic-link sends use the approved remote transport; local/test mailbox settings are rejected in Preview and Production; missing or invalid Production mail configuration blocks release before deployment; non-Production profiles cannot use Production credentials; no provider-swapping framework is introduced.
- Contracts/evidence: `TD-027`, `TST-AUTH-001`, `TST-AUTH-002`, `TST-ENV-001`, `TST-PIPELINE-001`, and `TST-RELEASE-001`; keep local mailbox evidence separate from remote delivery evidence.
- Checks: focused mail/profile tests; `pnpm test`; `pnpm typecheck`; `pnpm lint`; changed-file Prettier checks; `git diff --check`; and a controlled provider delivery/health smoke when the owner-authorized provider is available.
- Dependencies/unblock: T-18.2 through T-18.4 and owner approval/provisioning of the Production mail provider. T-23 is blocked until this task's minimum foundation is verified; T-27 consumes it for broader authentication completion and abuse resistance.
- Recommended AgentForge skills: `better-auth-best-practices`, `email-and-password-best-practices`, `security-and-hardening`, `testing-first-class`, `test-driven-development`, `source-driven-development`, and `git-workflow-and-versioning`.

### T-22: Add manually triggered, fully functional Vercel Preview delivery

Required fix from the 2026-09-05 reusable-foundation review at `634d2b0`:

- [ ] Bind migration, seed, and deployment inputs to the same immutable revision reported by `--ref`. The current local CLI resolves a SHA in `scripts/deploy/preview/core.ts`, but its subprocesses use the current working directory; `scripts/deploy/preview/vercel.ts` passes the SHA as metadata without selecting its files. A different checkout or local edits can therefore produce an artifact that does not match the reported revision. The workflow checkout mitigates the ordinary workflow case, but does not prove the documented local command.
- [ ] Before hosted T-22 proof, add focused regression evidence for a requested revision different from the current checkout and for local edits. Prove that migration/seed/deploy use the selected revision, or that the command refuses the mismatch before mutation. Reconcile this evidence with the existing exact-ref contracts and T-24; do not treat the earlier green checks below as proof of artifact identity.

- [~] Complete T-22 only after the owner authorizes a controlled hosted Preview run.
- Files: `.github/workflows/deploy-preview.yml`, explicit deploy/branch/seed/smoke helpers under `scripts/deploy/` or equivalent thin adapters, preview environment configuration documentation, and redacted Preview evidence under `docs/agentforge/evidence/`.
- Interfaces: `workflow_dispatch` inputs for an exact branch/tag/SHA and a safe preview identifier; resolved immutable commit SHA; isolated temporary Neon branch derived from durable Development; direct migration and safe seed sequence; Vercel Preview deployment; deployment-origin `BETTER_AUTH_URL`; non-production auth/mail/Sanity configuration; explicit cleanup/expiry path; workflow outputs for URL, deployment id, branch id, expiry, SHA, and redacted smoke result.
- Acceptance: a client receives an ephemeral Preview that supports authentication, list/task mutations, landing content, and the relevant browser smoke path; Preview database writes are isolated from Development and Production; data is sanitized or deterministic; local filesystem mail is rejected and the selected remote-safe mail or controlled-account strategy works; the requested ref is resolved and displayed; cleanup is repeatable and does not delete another preview; no automatic Preview is created for ordinary PR activity.
- Contracts/evidence: `TST-PIPELINE-001`, `TST-PREVIEW-001`, `TST-ENV-001`, `TST-AUTH-001`–`TST-AUTH-003`, `TST-LANDING-002`/`TST-LANDING-003` as applicable, and `TST-E2E-001`–`TST-E2E-003`; real Neon/Vercel evidence is required for hosted claims and must be redacted.
- Checks: workflow validation; a controlled manual run from a known branch/tag/SHA; branch isolation assertion; direct migration/seed verification; deployed browser/API smoke; cleanup/expiry verification; workflow artifact review; and `git diff --check`. Never use Production as a test target.
- Dependencies/unblock: T-18, T-20, and T-21; T-18.1 has resolved the Preview Sanity and mail strategy, while Vercel/Neon resources and the non-production dataset still require owner authorization and provisioning. Do not enable the workflow until the owner explicitly authorizes the hosted run.
- Recommended AgentForge skills: `ci-cd-and-automation`, `neon-postgres-branches`, `neon-postgres`, `testing-first-class`, `test-driven-development`, `security-and-hardening`, `browser-testing-with-devtools`, `next-dev-loop`, and `git-workflow-and-versioning`.
- Plan: [`2026-09-03-t-22-preview-delivery.md`](docs/agentforge/plans/2026-09-03-t-22-preview-delivery.md).

Verification:

- [x] `pnpm exec vitest run scripts/deploy/preview/core.test.ts src/test/pipeline/preview-workflow.test.ts src/modules/auth/infrastructure/auth-mail.test.ts` passes 3 files and 18 tests.
- [x] `pnpm test` passes 32 files and 260 tests; `pnpm typecheck`, `pnpm lint` (0 errors; the pre-existing `app/layout.tsx:1:10` unused `Geist` warning remains), `pnpm build`, `pnpm exec drizzle-kit check --config drizzle.config.ts`, changed-file Prettier, and `git diff --check` pass.
- [x] Dedicated Sanity `preview` dataset exists with published `landingPage`. GitHub Environment `preview` exists. Repository variable `NEXT_PUBLIC_SANITY_PROJECT_ID` is set.
- [ ] Controlled hosted deploy/cleanup is blocked on a Vercel project plus GitHub Environment `preview` secrets: `NEON_API_KEY`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, and Preview `BETTER_AUTH_SECRET`. Do not run the workflow until those secrets exist. Vercel Git auto-deploy must stay disabled.

### T-23: Add manually approved exact-ref Production release

- [ ] Complete T-23 only after the Production target, migration policy, and protected approval path are accepted.
- Files: `.github/workflows/deploy-production.yml`, release/ref/migration/smoke helpers under `scripts/deploy/`, protected environment configuration documentation, production runbook, and redacted release evidence under `docs/agentforge/evidence/`.
- Interfaces: `workflow_dispatch` input accepting a tag or commit SHA; exact-ref resolution and verification; required CI evidence for the resolved SHA; protected GitHub `production` Environment approval; direct forward migration; Vercel production deployment of the exact SHA; post-deploy smoke; release record containing SHA, migration result, deployment id, rollback reference, and operator/time metadata without secrets.
- Acceptance: no branch name or mutable “latest” alias can silently change the deployed commit; Production secrets are unavailable to CI/Preview jobs; migration runs separately from app boot through the direct endpoint; a failed deployment reports whether the database migration already succeeded and does not assume a database down-migration is safe; application rollback guidance names a compatible commit/ref and explicitly handles migration compatibility; the chosen Production Neon project/branch is protected and never reset by routine developer commands.
- Contracts/evidence: `TST-RELEASE-001`, `TST-PIPELINE-001`, `TST-ENV-001`, `TST-MIGRATION-001`, `TST-LANDING-003`, and the relevant authentication/browser contracts; mark hosted contracts verified only after real protected-environment evidence.
- Checks: workflow/ref-resolution tests; protected-environment approval evidence; controlled release rehearsal in an explicitly non-Production target where possible; real Production deployment only after owner approval; post-deploy smoke; redacted release artifact; `pnpm build`; and `git diff --check`.
- Dependencies/unblock: T-18, T-20, T-21, and T-21.5; T-18.1 has resolved the Production target policy and migration-history boundary, while the protected project/branch and minimum mail transport still require owner provisioning and approval. This task must not promote the current Neon `main` merely because it is the existing `.env.local` target.
- Recommended AgentForge skills: `ci-cd-and-automation`, `shipping-and-launch`, `migration-history-workflow`, `neon-postgres`, `testing-first-class`, `test-driven-development`, `security-and-hardening`, `observability-and-instrumentation`, and `git-workflow-and-versioning`.

Dependency checkpoint: T-22 and T-23 require the environment decisions, CI evidence, and hosted credentials/approvals they name. Neither task is unblocked by local unit tests alone. Do not claim the template's deployment pipeline is proven until T-24 covers both the simulated negative paths and the required disposable/controlled hosted boundaries.

Review priority, existing planned work: retain T-21.5 Production mail as a release prerequisite, complete the T-22 artifact fix before controlled hosted Preview proof, and retain T-23/T-24 protected release and pipeline evidence. These are unfinished delivery obligations, not new tasks or authorization to provision providers or deploy. Local auth and test evidence does not establish Production mail delivery.

### T-24: Prove the complete environment and delivery pipeline

This is the dedicated template-level pipeline test task. Its purpose is to
prove that the environment setup is correct, not merely that individual
commands compile.

- [ ] Complete T-24 with layered local, static, and required disposable/controlled hosted evidence.
- Files: `src/test/environment/`, `src/test/pipeline/` or the repository's established test seat, workflow/static validation fixtures, disposable Neon/Vercel/Sanity adapters or controlled evidence helpers, `package.json`, `.github/workflows/`, `docs/agentforge/evidence/`, `.dwf/decisions/TESTING.md`, and `TODO.md`.
- Interfaces: a layered pipeline test command; profile/target matrix; exact-ref resolver; branch creation/identity/expiry/cleanup lifecycle; migration and seed sequencing; preview deployment contract; production approval/secret-scope contract; redacted evidence schema; failure-injection hooks that stop before shared/Production mutation.
- Acceptance: tests cover every environment profile and forbidden cross-target combination; local reset cannot reach Neon; Development and Preview are isolated; Preview branch creation, migration, deterministic/sanitized seed, app configuration, functional smoke, cleanup, and expiry are traceable; the selected tag/SHA resolves to one immutable commit; automatic PR deployment is absent; migration/seed/deploy failures report state and clean up safely; Production workflow requires protected approval and cannot be exercised by non-production credentials; tests prove the full application path for a Preview when the controlled hosted prerequisite is available.
- Contracts/evidence: formalize and reconcile `TST-PIPELINE-001`, `TST-PREVIEW-001`, and `TST-RELEASE-001`, plus `TST-ENV-001`; retain existing contract statuses when a boundary is unavailable. Layered tests may mock provider APIs for orchestration logic, but must include real disposable Neon/Vercel/browser evidence for claims those mocks cannot establish. Never run test cleanup or failure injection against Production.
- Checks: focused pipeline suite; workflow syntax/static checks; `pnpm test`; `pnpm test:integration`; `pnpm test:e2e`; `pnpm typecheck`; `pnpm lint`; `pnpm build`; controlled Preview lifecycle run; controlled release/ref-resolution rehearsal; redacted evidence review; changed-file Prettier; and `git diff --check`.
- Dependencies/unblock: T-18 through T-23. Neon/Vercel/Sanity credentials and disposable targets are required only for their named boundary tests; absent prerequisites must be reported, not replaced with a weaker claim.
- Recommended AgentForge skills: `testing-first-class`, `test-driven-development`, `ci-cd-and-automation`, `security-and-hardening`, `browser-testing-with-devtools`, `next-dev-loop`, `verification-before-completion`, and `git-workflow-and-versioning`.

### T-25: Carefully document the complete environment and delivery system

Required reconciliation from the 2026-09-05 review, within this task's existing documentation scope:

- [ ] Reconcile `.dwf/CONTEXT.md` with implemented CI/Preview tooling and the recorded durable Development evidence. At review time it still said those workflows were absent and Development was pending. Distinguish existing code, recorded successful checks, and unproven hosted behavior; do not mark T-22/T-23 complete from file presence.
- [ ] Reconcile README setup prerequisites with `package.json` and the implemented commands. At review time README named pnpm 11.17.0 while `packageManager` selected 11.25.0. Keep one authoritative version source and avoid conflicting setup instructions.

This is the dedicated documentation task. It should leave a derived
application operator able to understand, run, verify, preview, release, and
recover the template without reading hidden agent context or guessing which
database a command targets.

- [ ] Complete T-25 after the implemented environment and pipeline behavior has truthful evidence.
- Files: `README.md`, `docs/index.md`, `docs/architecture/environments.md`, `docs/runbooks/local-development-and-verification.md`, new Preview and Production release/recovery runbooks under `docs/runbooks/`, `docs/development/quality-gates.md`, `.dwf/CONTEXT.md` and supporting DWF/decision references only where T-18.1 authorizes reconciliation, `.env.example`-style non-secret templates, and `TODO.md` evidence links.
- Interfaces: environment matrix; copyable Local/Development/Preview/Production setup commands; pooled/direct database explanation; Sanity and email boundaries; secret ownership/naming categories without values; Neon branch policy; manual workflow inputs; exact-ref and resolved-SHA behavior; seed modes; cleanup/expiry; approval gates; migration and rollback/recovery procedure; troubleshooting; evidence redaction rules; and a small architecture diagram or sequence showing the delivery lifecycle.
- Acceptance: documentation is internally consistent with the canonical DWF decisions and implemented commands; it clearly says Local uses Docker PostgreSQL plus hosted Sanity, Development is a local app against durable Neon, Preview is a manually requested ephemeral fully functional deployment, and Production is an approved exact-ref release; it warns that pooled URLs are for runtime and direct URLs for migrations; it explains why an existing Neon `main` branch is not automatically Production; no credentials, tokens, or invented private links appear; stale scaffold statements are corrected or explicitly labeled historical; every operational command names its target and safety boundary.
- Contracts/evidence: reconcile documentation obligations for `TST-ENV-001`, `TST-PIPELINE-001`, `TST-PREVIEW-001`, `TST-RELEASE-001`, `TST-MIGRATION-001`, `TST-HARNESS-001`, `TST-LANDING-002`, and `TST-LANDING-003` without changing statuses absent evidence.
- Checks: link check; copy/paste review of commands; changed-file Prettier; `git diff --check`; documentation review against PRD/SPEC/decision ledgers; and a fresh proportional review of the final documentation tip.
- Dependencies/unblock: T-18 through T-24 for final truth, though a short design draft may be prepared after T-18.1. Documentation must be updated when later implementation changes the command surface.
- Recommended AgentForge skills: `documentation-and-adrs`, `writing-guidelines`, `unslop`, `testing-first-class`, `verification-before-completion`, and `git-workflow-and-versioning`.

### T-26: Add runtime safety and observability hardening

Review context, existing planned work: `db/db.ts` consumes `DATABASE_URL` without the tooling's full environment-profile guard, and unexpected application failures mapped through `src/shared/entry-contract.ts` lose their diagnostic cause. Address runtime target validation and safe failure reporting within this task's accepted scope and prerequisites. Preserve generic client errors; do not describe all database errors as silent because `db/pool.ts` already logs idle-client failures.

- [ ] Complete T-26 as a separately scoped post-baseline hardening task.
- Files: application startup/configuration boundaries, health/readiness endpoints or checks, structured logging/metrics/tracing adapters, deployment smoke helpers, security headers/error handling, focused tests, and observability runbooks.
- Interfaces: sanitized startup target summary; readiness that distinguishes app, database, and CMS dependencies; correlation/request identifiers; structured failure events for migration/deployment/runtime target mismatch; no secret-bearing logs; release evidence links.
- Acceptance: operators can diagnose target mismatch, migration failure, auth/mail failure, and Sanity outage from safe telemetry; health checks do not leak credentials or falsely report readiness; production errors are actionable without logging tokens or personal data; deployment smoke uses the resolved release identity.
- Contracts/evidence: add or reconcile the smallest observability/security contracts after the core pipeline is accepted; preserve current route behavior and existing `TST-*` obligations.
- Checks: focused unit/integration tests, `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, security/log review, and `git diff --check`.
- Dependencies/unblock: T-24 and T-25; production-like observability requirements must be agreed before implementation.
- Recommended AgentForge skills: `observability-and-instrumentation`, `security-and-hardening`, `testing-first-class`, `test-driven-development`, and `git-workflow-and-versioning`.

### T-27: Complete authentication product flows and abuse resistance

- [ ] Complete T-27 only after the mail/environment decisions and product scope are accepted.
- Files: Better Auth configuration/routes, email verification and password-reset UI/routes, mail provider adapters, rate-limit/abuse controls, tests, and security/runbook documentation.
- Interfaces: verified-email lifecycle, password-reset token lifecycle, safe error messages, expiration/replay behavior, remote-safe Preview mail strategy if still applicable, and account-abuse telemetry/limits.
- Acceptance: verification and reset flows are usable and secure, tokens are single-use and time-bounded, user enumeration is minimized, Preview does not send uncontrolled mail, and the flows work against Local, Development, Preview, and Production profiles according to their mail policy.
- Contracts/evidence: add security/auth contracts through the canonical testing ledger; preserve `TST-AUTH-001`–`TST-AUTH-003` and do not mark remote mail evidence from local mailbox tests.
- Checks: TDD-focused auth tests, integration/browser journeys, `pnpm test`, `pnpm test:integration`, `pnpm test:e2e`, `pnpm typecheck`, `pnpm lint`, and `git diff --check`.
- Dependencies/unblock: T-21.5's minimum Production mail foundation, T-18's mail policy, and T-24's environment test boundaries; product acceptance is required before implementation. T-27 must not be the first task to establish the mail transport required by T-23.
- Recommended AgentForge skills: `better-auth-best-practices`, `email-and-password-best-practices`, `security-and-hardening`, `testing-first-class`, `test-driven-development`, and `git-workflow-and-versioning`.

### T-28: Add Sanity authenticated preview and live authoring

- [ ] Complete T-28 only after an explicit product decision moves the deferred Sanity capabilities into scope.
- Files: Sanity presentation/preview routes and configuration, authenticated Draft Mode/Visual Editing/Live integration, webhook/revalidation handling, browser tests, and Sanity runbooks.
- Interfaces: authenticated preview session, Preview/Development/Production dataset policy, webhook validation and recovery, live content refresh, and safe separation of editor credentials from public read configuration.
- Acceptance: the selected Sanity live-authoring capability is explicit, authenticated, tested against the chosen dataset policy, and does not expose editor credentials; deployed webhook delivery/recovery evidence is real before its contract is marked verified.
- Contracts/evidence: extend the canonical Sanity contracts after the T-18.1 dataset decision; preserve `TST-LANDING-002` and `TST-LANDING-003` evidence boundaries.
- Checks: focused Sanity tests, real deployed webhook/live smoke when credentials are available, browser verification, `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `git diff --check`.
- Dependencies/unblock: T-22, T-24, and an explicit product decision to move the current deferred Sanity capabilities into scope.
- Recommended AgentForge skills: `sanity-best-practices`, `sanity-migration`, `browser-testing-with-devtools`, `testing-first-class`, `test-driven-development`, and `git-workflow-and-versioning`.

### T-29: Publish the derived-application extension and replacement guide

Review follow-through, within the existing guide scope:

- [ ] Provide a short retain/replace checklist for todo modules and UI, migrations and seed data, auth/mail, Sanity, environment identity, and delivery workflows. Link to the owning instructions rather than adding another set of contracts.
- [ ] Document Neon retargeting explicitly. At review time the original project identity was fixed in `scripts/neon-development/constants.ts`, checked in `scripts/neon-development/core.ts`, inherited by `scripts/deploy/preview/constants.ts`, and repeated in `.github/workflows/deploy-preview.yml`. Explain the coordinated changes and verification a fork needs; environment variables alone do not retarget this tooling. Preserve target guards. A new shared configuration architecture is a proposal requiring separate scope acceptance, not an implementation decision made by this guide.

The separate [fresh-fork experiment](FUTURE.md#fresh-fork-into-a-different-small-application) is a future idea, not an added T-29 acceptance criterion or dependency. T-27 authentication completion and T-28 CMS live authoring retain their existing scope and prerequisites.

- [ ] Complete T-29 only after the core environment and delivery pipeline is reviewed.
- Files: `docs/architecture/`, a derived-application guide/example, replacement-seam documentation for domain/UI/CMS/deployment adapters, and template verification notes.
- Interfaces: documented seams for domain modules, UI surfaces, repositories, auth/mail, Sanity, database provider/branch policy, and delivery workflows; a minimal adaptation checklist that does not create a second framework.
- Acceptance: a derived app can identify what to replace versus retain, inherit the environment safety and test pipeline, and prove its own profile/preview/release setup; guidance remains opinionated and concrete rather than becoming a provider-agnostic abstraction catalogue.
- Contracts/evidence: add a template-derivation contract only if the DWF scope requires it; reuse `TST-ENV-001` and `TST-PIPELINE-001` as the safety baseline rather than creating duplicate authorities.
- Checks: documentation link/command review, adaptation smoke example, changed-file Prettier, and `git diff --check`.
- Dependencies/unblock: T-25 and the reviewed implementation of T-18 through T-24; product scope approval is required before adding a maintained example app.
- Recommended AgentForge skills: `documentation-and-adrs`, `spec-driven-development`, `testing-first-class`, `writing-guidelines`, and `git-workflow-and-versioning`.

Final post-baseline dependency checkpoint: T-18.1 through T-18.4, the
parent T-18 contract gate, T-19, T-20, and T-21 are complete. T-21.5 remains
blocked on an owner-approved Production mail provider. T-22 through T-25 remain
ordered behind those named prerequisites; T-26 through T-29 are recorded
follow-ons. No Preview workflow, Vercel deployment, or Production operation is
authorized by this backlog entry alone.

## Explicitly out of scope for this baseline

- OAuth or social login.
- Teams, organizations, shared lists, roles, or machine-authenticated APIs.
- Real-time collaboration, offline/PWA behavior, mobile apps, or multi-region operations.
- Recurring tasks, subtasks, tags, attachments, comments, or payments.
- Polished email verification and password-reset product flows.
- Sanity Live, Draft Mode, Presentation Tool, and visual editing. These are deferred until after the webhook and manual-recovery baseline.
- Speculative database indexes, Redis, application-level query caching, and provider-swapping abstractions.
