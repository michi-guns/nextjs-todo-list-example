# Delivery TODO

This file tracks implementation delivery for the starter baseline. The [DWF README](.dwf/README.md), [Agent PRD](.dwf/output/agent/PRD.md), [Agent SPEC](.dwf/output/agent/SPEC.md), and decision ledgers remain authoritative.

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

1. Select the next unchecked task whose dependencies are satisfied.
2. Start from the latest `main` and create `task/<task-id>-<short-slug>`, for example `task/T-06-lists-capability`.
3. Mark the task `[~]` on that branch and keep the change limited to the task and its required verification.
4. Use the task's recommended agent skills and preserve the DWF contracts. Do not silently expand scope or resolve a product/technical decision in code.

### Finish a task

1. Complete the task acceptance criteria and record the verification evidence in the task or its linked artifact.
2. Run the focused checks plus the proportionate project quality gates. Do not claim a check passed when it was skipped.
3. Mark the task `[x]`, update any checkpoint it satisfies, and commit the complete task with a descriptive message such as `feat: implement lists capability`.
4. Push the branch with its upstream configured.
5. Open a pull request from the task branch into `main`. The PR body must include:
   - a concise summary of the behavior delivered;
   - the task ID and links to the relevant DWF PRD/SPEC sections;
   - acceptance criteria and verification commands/results;
   - known limitations, follow-up tasks, and any external prerequisites.
6. Report the terminal handoff in this format:

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
- [ ] Meaningful test, migration, Sanity, and browser evidence exists.

## Phase 0: prerequisites

### T-01: Create the Neon development branch

- [x] Create the non-default Neon `development` branch from `main` before any schema-changing work. The branch is ready and expires on 2026-09-02.
- [x] Point development migration verification at that branch through an ephemeral CLI-derived `DATABASE_URL`; no credential is stored in the repository.
- [x] Record the branch and migration verification result in this delivery tracker.

Verification:

- [x] The complete existing migration chain applied successfully to the Neon `development` branch with `pnpm exec drizzle-kit migrate`.
- [x] The default branch was not changed; future schema migrations must still pass on `development` before promotion.

Dependencies: none.

### T-02: Provision the dedicated Sanity resource

- [!] Create the dedicated Sanity project and dataset.
- [ ] Create and publish the singleton landing document with the required headline, blurb, primary CTA, and optional secondary CTA fields.
- [ ] Configure local/server-only Sanity settings without committing secrets.

Verification:

- [ ] A read-only smoke can fetch the published singleton through the real client and query path.
- [ ] Missing configuration or content fails clearly instead of silently becoming permanent fallback content.

Dependencies: none.

## Phase 1: shared foundations

### T-03: Replace the database runtime boundary

- [x] Replace the Neon HTTP adapter with `node-postgres` through `drizzle-orm/node-postgres`.
- [x] Create one bounded, module-scoped `pg.Pool` shared by Better Auth and list/task repositories.
- [x] Register the pool with Vercel `attachDatabasePool` when running on Vercel Fluid Compute.
- [x] Use pooled Neon connections for application traffic, direct connections for migrations, and the harness URL for local tests.

Verification:

- [x] Source typecheck and lint pass; the standard commands are currently affected only by stale ignored `.next/` and `dist/` artifacts from the earlier Sanity setup.
- [x] The same repository implementation connected successfully to local PostgreSQL and pooled Neon.

Dependencies: T-01.

### T-04: Add the lists and tasks schema

- [ ] Add `lists` and `tasks` Drizzle tables with ownership, timestamps, statuses, and nullable notes as defined by the SPEC.
- [ ] Add the list-to-task foreign key with database-level cascade deletion.
- [ ] Add database-enforced case-insensitive uniqueness for list names per user and task titles per list.
- [ ] Add the required composite cursor indexes aligned with the authenticated equality scopes and ordering.
- [ ] Retire the scaffold `posts` schema from active application code without editing the already-applied migration in place.

Verification:

- [ ] A new versioned migration applies to an empty PostgreSQL 18 Testcontainer.
- [ ] The reviewed migration applies successfully to the Neon development branch.
- [ ] Integration coverage proves uniqueness, cascade deletion, and required indexes/constraints.

Dependencies: T-01, T-03.

### T-05: Complete the Better Auth boundary

- [ ] Keep Better Auth configuration and raw records behind the auth infrastructure boundary.
- [ ] Expose server-only current-user helpers equivalent to `getCurrentUser()` and `requireUser()`.
- [ ] Support email/password sign-up, sign-in, and sign-out.
- [ ] Support magic-link request and consumption.
- [ ] In explicit local/test mode only, capture magic links in a temporary gitignored mailbox.

Verification:

- [ ] Unauthenticated private reads and mutations return the ordinary unauthenticated result.
- [ ] The local/test mailbox flow can request, read, and consume one magic link.
- [ ] Authenticated code never accepts a client-provided owner id.

Dependencies: T-03.

## Checkpoint: foundations

- [ ] `pnpm typecheck` passes.
- [ ] `pnpm lint` passes without new warnings.
- [ ] PostgreSQL 18 integration setup applies the complete migration chain.
- [ ] Password and magic-link authentication work against the local test database.

## Phase 2: domain and application behavior

### T-06: Implement the lists capability

- [ ] Add framework-independent list rules and repository ports under `src/modules/lists`.
- [ ] Implement `ensureDefaultInbox`, list reads, create, rename, and delete use cases.
- [ ] Make Inbox creation atomic and idempotent, including after final-list deletion.
- [ ] Enforce trimming, 1–80 character names, ownership, privacy-preserving not-found results, and last-successful-write behavior.

Verification:

- [ ] Unit tests cover normalization, ownership, Inbox lifecycle, and expected application outcomes.
- [ ] Integration tests cover concurrent Inbox creation, duplicate names, cursor ordering, and cascade behavior.

Dependencies: T-04, T-05.

### T-07: Implement the tasks capability

- [ ] Add framework-independent task rules and repository ports under `src/modules/tasks`.
- [ ] Implement task reads, create, update, status changes, and delete use cases.
- [ ] Enforce title and notes normalization, status rules, list ownership, per-list case-insensitive title uniqueness, and patch semantics.
- [ ] Implement newest-first cursor reads and the `includeCompleted` filter, defaulting to `true`.

Verification:

- [ ] Unit tests cover status transitions, trimming, note clearing, validation, and concurrent patch semantics.
- [ ] Integration tests cover ownership, duplicate titles, pagination, completed filtering, cascade deletion, and last-successful-write behavior.

Dependencies: T-04, T-05, T-06.

### T-08: Add shared pagination and error contracts

- [ ] Validate cursors and limits at the presentation boundary. Default `limit` to 20 and cap it at 100.
- [ ] Return only `{ items, nextCursor }` for page reads, with opaque context-bound cursors.
- [ ] Map unauthenticated, not-found, conflict, and invalid-input outcomes consistently across entry points.
- [ ] Keep list/task queries bounded to at most `limit + 1` rows and avoid N+1 work.

Verification:

- [ ] Unit and boundary tests cover malformed/cross-context cursors, limit errors, response shape, and privacy-preserving `404` behavior.
- [ ] Query tests prove the required ordering and continuation behavior at the maximum page size.

Dependencies: T-06, T-07.

## Phase 3: application surfaces

### T-09: Add Server Actions and JSON Route Handlers

- [ ] Add the stable list/task routes from the SPEC: `/api/lists`, `/api/lists/:listId`, `/api/lists/:listId/tasks`, and `/api/tasks/:taskId`.
- [ ] Make actions and handlers follow authenticate, authorize, validate, use case, map, and revalidate/respond.
- [ ] Share Zod schemas and application use cases between actions and handlers.
- [ ] Keep the private JSON API same-origin and session-authenticated. Do not add bearer-token or machine authentication.

Verification:

- [ ] Route Handler contract tests cover success, pagination, `401`, privacy-preserving `404`, `409`, and `422` responses.
- [ ] Server Action tests cover authentication, validation, successful mapping, and expected errors.

Dependencies: T-05, T-06, T-07, T-08.

### T-09A: Explore and prototype UI directions

- [ ] Define the locked product constraints, critical user scenarios, representative data, target viewports, and free UI dimensions for the landing, auth, and dashboard surfaces.
- [ ] Produce three materially different UI directions based on different information-architecture or interaction hypotheses, not cosmetic variations.
- [ ] Prototype the critical scenario with the same realistic fixture data while keeping each direction isolated, removable, and independent of backend or schema changes.
- [ ] Render and inspect each direction for hierarchy, density, overflow, focus, selected, disabled, error, empty, and responsive states where relevant.

Recommended agent skills:

- `ui-direction-explorer` for repository reconnaissance, divergent direction briefs, fair comparison fixtures, isolated prototypes, visual inspection, and evidence-based evaluation.
- `frontend-ui-engineering` for semantic controls, keyboard reachability, meaningful states, design-system tokens, and responsive prototype structure.

Verification:

- [ ] Each direction has a distinct hypothesis, optimization target, and trade-off.
- [ ] All directions use the same primary scenario, data burden, required capabilities, and target viewport.
- [ ] The exploration handoff states any visual-inspection limitation instead of claiming unperformed validation.

Dependencies: T-08.

### T-09B: Select and hand off the UI direction

- [ ] Compare the directions against explicit criteria derived from the product goal and the accepted todo workflow.
- [ ] Select one direction and record its information architecture, interaction model, visual hierarchy, component composition, responsive behavior, accessibility requirements, and important states.
- [ ] Keep the exploration record and prototype links outside `.dwf`; update the DWF only if the selected direction changes product behavior or an accepted technical boundary.
- [ ] Identify the reusable tokens and primitives that the production implementation should preserve.

Recommended agent skills:

- `ui-direction-explorer` for the divergence gate, side-by-side evaluation, trade-off analysis, and decision-oriented handoff.
- `frontend-ui-engineering` for translating the selected direction into an implementation-ready component and accessibility brief.

Verification:

- [ ] The chosen direction has a clear reason for winning and a documented trade-off.
- [ ] T-10 and T-11 can be implemented from the handoff without inventing a competing UI direction.
- [ ] The handoff includes the empty, loading, error, focus, narrow-viewport, and long-content states needed by the product.

Dependencies: T-09A.

### T-10: Build the authenticated dashboard

- [ ] Materialize the selected direction from T-09B in the authenticated dashboard rather than introducing a new visual system during implementation.
- [ ] Add the authenticated app route and dashboard shell using shadcn/ui.
- [ ] Add list sidebar operations: create, select, rename, delete, and visible `Load more`.
- [ ] Add task operations: create, edit, delete, status changes, completed-task toggle, and visible `Load more`.
- [ ] Reset task pagination when the selected list or completed-task filter changes.

Recommended agent skills:

- `frontend-ui-engineering` for production-quality component structure, semantic controls, state handling, responsive layout, loading/error/empty states, and WCAG basics.
- `vercel-composition-patterns` for composable dashboard and task/list component APIs without boolean-prop or configuration sprawl.
- `vercel-react-best-practices` for React and Next.js rendering, state, and performance decisions.
- `next-dev-loop` for runtime verification in the running Next.js app after implementation.

Verification:

- [ ] The dashboard works with authenticated session data only.
- [ ] A manual runtime check confirms list/task pagination, filtering, and mutation feedback.
- [ ] The UI works at 320px, 768px, 1024px, and 1440px with keyboard-accessible interactions and visible focus.

Dependencies: T-09, T-09B.

### T-11: Build the public landing and auth screens

- [ ] Materialize the selected direction from T-09B across the public landing and authentication surfaces.
- [ ] Add the public landing route with links into authentication.
- [ ] Add sign-up, sign-in, magic-link request/consume, and sign-out screens sufficient for the accepted happy paths.
- [ ] Keep provider payloads and Better Auth records out of UI-facing types.

Recommended agent skills:

- `frontend-ui-engineering` for accessible forms, responsive layouts, error and loading states, focus management, and consistent design-system usage.
- `vercel-composition-patterns` for reusable auth form and landing section composition.
- `vercel-react-best-practices` for Server Component, Client Component, and interaction-boundary choices.
- `next-dev-loop` for checking the real landing and auth routes in a running Next.js app.

Verification:

- [ ] The public landing renders the Sanity-backed view model once T-12 is wired.
- [ ] Auth screens work against the local test database and show stable expected errors.
- [ ] Forms are keyboard accessible, labels and focus states are clear, and layouts work at the agreed responsive breakpoints.

Dependencies: T-02, T-05, T-09B.

### T-12: Add the Sanity landing read path

- [ ] Add the Sanity client/configuration seat under `src/sanity`.
- [ ] Validate unknown Sanity payloads and map them to a plain landing view model inside landing infrastructure.
- [ ] Give published landing reads one stable cache identity.
- [ ] Remove any temporary fallback after the real CMS read path works.

Verification:

- [ ] Fixture tests cover valid payloads, optional fields, malformed content, and missing required content.
- [ ] The separate live read smoke fetches, validates, and maps the published singleton.

Dependencies: T-02.

### T-13: Add Sanity freshness and recovery

- [ ] Add a signature-verified webhook for relevant published landing changes.
- [ ] Reject invalid signatures, irrelevant events, and invalid requests without invalidating cache.
- [ ] Add an explicitly authorized manual recovery path.
- [ ] Route both mechanisms through one server-only, idempotent invalidation service.

Verification:

- [ ] Tests cover valid/invalid signatures, relevance filtering, duplicate delivery, and manual authorization.
- [ ] A deployed release candidate receives one real Sanity webhook successfully.

Dependencies: T-12.

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

Dependencies: T-10, T-11, T-12, T-13.

## Checkpoint: core product

- [ ] Password and magic-link sign-in work locally.
- [ ] The full local journey works: sign in, obtain Inbox, create list, create task, change status, sign out.
- [ ] Lists and tasks are private, validated, paginated, and persisted in PostgreSQL.
- [ ] The landing page reads Sanity content and cache recovery is protected.
- [ ] The selected UI direction is materialized and the implemented surfaces have been audited.

## Phase 4: verification and release evidence

### T-14: Build the PostgreSQL integration harness

- [ ] Use `@testcontainers/postgresql` with PostgreSQL 18.
- [ ] Start one ephemeral container per integration suite, apply versioned migrations, and clean it up on success or failure.
- [ ] Keep integration tests serial, give each test a unique user/data set, and refuse external database URLs in destructive cleanup.

Verification:

- [ ] Docker-backed tests fail clearly when Docker is unavailable rather than silently skipping.
- [ ] The full repository integration suite passes against the harness-owned database.

Dependencies: T-04, T-06, T-07, T-08.

### T-15: Replace the example Playwright suite

- [ ] Replace the `playwright.dev` tests with the accepted todo journey under `e2e/`.
- [ ] Add one local command that starts PostgreSQL, applies migrations, loads deterministic behavior seed data, starts a dedicated Next.js test server, runs Playwright, and tears everything down.
- [ ] Run the required suite in Chromium and keep Firefox/WebKit as an explicit on-demand run.
- [ ] Add the magic-link mailbox journey.

Verification:

- [ ] `pnpm exec playwright test` passes against the harness-owned local database in Chromium.
- [ ] Cross-browser checks remain available separately for release or major UI changes.

Dependencies: T-05, T-09, T-10, T-11, T-14.

### T-16: Produce Neon performance evidence

- [ ] Create the separate Neon development-branch performance seed: approximately 100 lists, 10,000 tasks in one list, and another user's records.
- [ ] Run `EXPLAIN ANALYZE` for representative first-page and next-page list/task queries, including completed-task filtering when its SQL differs.
- [ ] Verify correct cursor behavior at page size 100 and a warm 20-record database query under 50 ms with compute active.

Verification:

- [ ] Query plans use the intended composite indexes without a full sequential scan of the lists or tasks table.
- [ ] Evidence records database execution separately from network, authentication, rendering, CMS access, and compute startup.

Dependencies: T-01, T-04, T-08.

### T-17: Finish documentation and final quality gates

- [ ] Update README setup instructions for the actual environment categories, local database harness, Sanity, and magic-link mailbox.
- [ ] Document any implementation-specific migration, test, and recovery commands without committing secrets.
- [ ] Run the final gates: `pnpm typecheck`, `pnpm lint`, `pnpm test`, affected Playwright tests, migration checks, and `git diff --check`.
- [ ] Review the implementation against the [SPEC definition of done](.dwf/output/agent/SPEC.md#13-definition-of-done-engineering-checklist).

Verification:

- [ ] All required local acceptance items have evidence.
- [ ] Skipped checks, pre-existing warnings, and remaining risks are recorded.

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
