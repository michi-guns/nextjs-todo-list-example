# T-15 — Replace the example Playwright suite

**Status:** Accepted

## Goal

Replace the `playwright.dev` examples with a deterministic Chromium-first
acceptance suite for the local todo application. One invocation of
`pnpm exec playwright test` must own an ephemeral PostgreSQL 18 database,
versioned migrations, behavior seed, local/test mailbox, dedicated Next.js
server, browser journeys, and cleanup. Firefox and WebKit remain an explicit
opt-in run.

## Spec and decisions

- Product baseline: [`Agent PRD`](../../../.dwf/output/agent/PRD.md), especially
  the starter acceptance in section 7.
- Technical baseline: [`Agent SPEC`](../../../.dwf/output/agent/SPEC.md),
  sections 2, 7, 9, 10.3, and 14.3.
- Accepted decisions: [`D-009`](../../../.dwf/decisions/PRODUCT.md#d-009),
  [`TD-013`](../../../.dwf/decisions/TECHNICAL.md#td-013),
  [`TD-014`](../../../.dwf/decisions/TECHNICAL.md#td-014),
  [`TD-016`](../../../.dwf/decisions/TECHNICAL.md#td-016),
  [`TD-017`](../../../.dwf/decisions/TECHNICAL.md#td-017),
  [`OD-003`](../../../.dwf/decisions/OPEN-DECISIONS.md#od-003),
  [`OD-021`](../../../.dwf/decisions/OPEN-DECISIONS.md#od-021),
  [`OD-022`](../../../.dwf/decisions/OPEN-DECISIONS.md#od-022),
  [`OD-023`](../../../.dwf/decisions/OPEN-DECISIONS.md#od-023), and
  [`OD-024`](../../../.dwf/decisions/OPEN-DECISIONS.md#od-024).
- Durable contracts: [`TST-HARNESS-001`](../../../.dwf/decisions/TESTING.md#tst-harness-001),
  [`TST-AUTH-001`](../../../.dwf/decisions/TESTING.md#tst-auth-001),
  [`TST-AUTH-002`](../../../.dwf/decisions/TESTING.md#tst-auth-002),
  [`TST-AUTH-003`](../../../.dwf/decisions/TESTING.md#tst-auth-003),
  [`TST-UI-001`](../../../.dwf/decisions/TESTING.md#tst-ui-001),
  [`TST-E2E-001`](../../../.dwf/decisions/TESTING.md#tst-e2e-001),
  [`TST-E2E-002`](../../../.dwf/decisions/TESTING.md#tst-e2e-002), and
  [`TST-E2E-003`](../../../.dwf/decisions/TESTING.md#tst-e2e-003).

## Architecture

Use Playwright global setup/teardown as the lifecycle owner so the repository's
existing `pnpm exec playwright test` command is sufficient. The setup reuses
`startPostgresHarness()` from `src/test/postgres-harness.ts`, validates the
loopback URL before any cleanup, creates a private OS-temporary mailbox, sets
test-only environment variables, seeds the database, starts a dedicated
`next dev` Node server on a reserved local port, and waits for a successful
HTTP response before tests begin. Teardown stops the server, clears only the
harness mailbox files, removes the empty temporary mailbox directory, and stops
the container in a `finally` path. No external database, Neon credential, or
remote email delivery is used.

The behavior seed is a small, explicit fixture in `scripts/playwright-local/`.
It creates six independently usable scenario users through the real Better
Auth handler and local email-verification mailbox, then inserts deterministic
lists/tasks with fixed names, timestamps, and UUIDs through a parameterized
local PostgreSQL connection. The fixture includes a core user, a pagination /
completed-filter user, a skip-link user, a magic-link user, and two
privacy-isolation users. Each browser scenario owns a distinct seeded user (or
the deliberate two-user pair), uses project-qualified names for records it
creates, and therefore remains independent of scenario order and cross-browser
project repetition.
`seedPlaywrightDatabase(databaseUrl, baseUrl): Promise<PlaywrightSeed>` is the
only seed entry point, and `PLAYWRIGHT_USERS` is the typed fixture export used
by the browser helpers; neither export includes connection strings, mailbox
contents, or generated authentication tokens.

Routine landing requests use a deterministic application-facing fixture only
when `PLAYWRIGHT_E2E=true` and `NODE_ENV` is not `production`. The normal
Sanity-backed reader remains the production/default path, and the test-only
branch is covered by a focused unit test so the browser suite has no Sanity
network or credential prerequisite.

`playwright.config.ts` keeps one worker and disables full parallelism for the
shared database. Chromium is the default project. A small checked-in runner
sets `PLAYWRIGHT_CROSS_BROWSER=true` for an opt-in `test:e2e:cross-browser`
script, which expands the same lifecycle and journeys to Firefox and WebKit.
The regular `test:e2e` script and direct `pnpm exec playwright test` remain
Chromium-only.

## Current state and file map

- `e2e/example.spec.ts` is the default `playwright.dev` sample and will be
  replaced by `e2e/runtime-smoke.spec.ts`, `e2e/fixtures.ts`,
  `e2e/core-journey.spec.ts`, `e2e/magic-link.spec.ts`,
  `e2e/privacy.spec.ts`, and `e2e/ui-contract.spec.ts`.
- `playwright.config.ts` has no base URL, lifecycle, or browser-selection
  policy; it will gain global setup, the fixed local base URL, serial execution,
  and Chromium-first projects.
- `src/test/postgres-harness.ts` already starts PostgreSQL 18, applies every
  committed migration, rejects external URLs, and stops partially started
  containers; T-15 must consume this interface rather than duplicate it.
- `src/modules/auth/infrastructure/local-mailbox.ts` already provides explicit
  local/test gating, deterministic read/clear helpers, and safe temporary-path
  checks; browser setup and the magic-link spec will use those helpers.
- `src/modules/landing/infrastructure/sanity-landing-reader.ts` owns the
  application-facing landing read path; its guarded test fixture must not leak
  provider records into UI types.
- `app/(auth)/*`, `components/auth/*`, and `components/dashboard/*` expose the
  stable labels, controls, actions, and skip-link target needed by the browser
  specs. Their product behavior is not being redesigned.
- `package.json` currently has only the unconfigured `test:e2e` Playwright
  script; it will receive the lifecycle/cross-browser commands without adding a
  second test framework or remote service.
- `src/test/playwright-lifecycle.test.ts` and
  `src/test/playwright-seed.test.ts` will hold the focused Vitest checks for
  lifecycle guards and pure seed-plan behavior; the named Playwright smoke
  cases `local runtime` and `behavior seed` will exercise the actual
  server/seed boundary.

## Dependencies and work order

1. Reconcile T-15 in `TODO.md`, mark the task in progress, and add this plan,
   its exact work packages, prerequisites, and contract evidence.
2. Add the deterministic landing fixture and its focused test. This is the
   only application-runtime change and must remain local/test gated.
3. Add lifecycle helpers and `src/test/playwright-lifecycle.test.ts` for the
   Playwright harness: reserved-port validation, inherited test environment,
   server readiness, failure cleanup, mailbox cleanup, and reuse of the
   existing PostgreSQL harness. Add the named `local runtime` case in
   `e2e/runtime-smoke.spec.ts` to prove server readiness and the deterministic
   landing fixture.
4. Add `scripts/playwright-local/seed.ts` and its
   `seedPlaywrightDatabase(databaseUrl, baseUrl): Promise<PlaywrightSeed>` API,
   plus `src/test/playwright-seed.test.ts` and the shared browser fixtures.
   Verify that the seed can
   create verified Better Auth users and deterministic list/task records without
   logging passwords, tokens, mailbox contents, or connection strings.
5. Replace the example specs with four serial Chromium scenarios: core
   sign-in/list/task/status/sign-out; magic-link request/read/consume; two-user
   privacy isolation; and the dashboard skip-link activation/next-Tab check
   (including seeded visible pagination and completed filtering in the
   capability scenario).
6. Configure the default and opt-in browser projects, scripts, and cleanup;
   run focused RED/GREEN checks as each slice is added, then the full gates.
7. Reconcile all affected `TST-*` evidence and the temporary implementation
   checkpoint, obtain the required fresh GPT-5.6-Sol proportional review, fix
   actionable findings, and re-review every changed tip before closeout.

The setup/seed/browser slices are sequential because they share environment
variables, database schema, and selectors. No independent parallel task is
claimed for this shared lifecycle.

## Verification strategy

- `pnpm exec playwright test` is the primary acceptance command. It must start
  one `postgres:18-alpine` container, apply both committed migrations, create
  the deterministic fixture, start the dedicated server, run Chromium serially,
  and clean up on both pass and failure.
- Browser evidence must cover the deterministic landing fixture, password
  sign-in and sign-out with private-route redirect, Inbox/list/task creation
  and status change, seeded list/task continuation, completed-task
  hiding/showing, magic-link mailbox request/read/consume, two-user private-data
  isolation, and dashboard skip target focus followed by the next logical tab
  stop.
- `pnpm test:e2e:cross-browser` (or its documented project-selection equivalent)
  must make the same scenarios available in Firefox and WebKit without making
  them part of the default run.
- Focused unit/harness tests must cover test-only landing gating and lifecycle
  error/cleanup behavior. Existing Vitest and PostgreSQL integration suites
  remain required gates; no weaker unit test substitutes for browser evidence.
- The focused commands are `pnpm exec vitest run
src/modules/landing/infrastructure/sanity-landing-reader.test.ts
src/test/playwright-lifecycle.test.ts`, `pnpm exec vitest run
src/test/playwright-seed.test.ts`, and
  `pnpm exec playwright test e2e/runtime-smoke.spec.ts --project=chromium
--grep "local runtime|behavior seed"`; these named cases must not silently
  run the retired external `playwright.dev` sample.
- Completion gates: `pnpm test`, `pnpm test:integration`, `pnpm typecheck`,
  `pnpm lint`, `pnpm build`, `pnpm exec prettier --check` for changed files,
  `pnpm exec drizzle-kit check --config drizzle.config.ts`, and
  `git diff --check`. Record the pre-existing `Geist` lint warning separately
  if it remains the only warning.
- `TST-HARNESS-001` remains `partial` until both the equivalent Playwright
  lifecycle evidence and the required Docker-unavailable failure observation
  are recorded; the outage check must not be replaced by a unit simulation.
  `TST-AUTH-001`,
  `TST-AUTH-002`, `TST-AUTH-003`, `TST-E2E-001`, and `TST-E2E-002` can be
  reconciled to verified when their browser journeys pass. `TST-UI-001`'s
  remaining dashboard skip-link evidence is completed by the dedicated check;
  `TST-E2E-003` becomes verified when the repeatable dashboard behavior and
  deterministic landing evidence are recorded.

## Risks and assumptions

- Docker, the Chromium browser, Node.js, pnpm, and the current Playwright
  package are available. Preflight confirmed Docker 29.7.2, Node 24.18.0,
  pnpm 11.17.0, Playwright 1.62.1, and Chromium's installed location; the
  on-demand engines will be checked only when that run is requested.
- Port `3100` is reserved for the dedicated test server. Setup fails clearly
  if it is already occupied; it never reuses an unknown process or a user's
  running application.
- Better Auth's existing email-verification flow is used to create seeded
  password users, so the seed does not copy or guess password hashes. The
  shared fixture password is test data only and is never printed or committed
  as a secret.
- A Playwright worker can inherit the setup environment, including
  `NODE_ENV=development` (the local mailbox gate requires `development` or
  `test`; the dedicated Next server also runs in development mode). If the installed
  runner does not propagate it, setup will write a narrowly scoped process
  environment bridge consumed by the fixture; it will not fall back to
  `.env.local`, Neon, or a remote mailbox.
- The existing Next.js 16.3.1 route and component APIs remain stable. No
  migration, schema, domain, production auth, or Sanity project changes are in
  scope.

## Handoff to task breakdown

The task breakdown recorded in `TODO.md` uses the following fresh-review units:

1. **T-15.1 — deterministic test runtime:** test-only landing content,
   Playwright config/global setup/teardown, local server readiness, and focused
   lifecycle tests.
2. **T-15.2 — behavior seed and fixtures:** Better Auth-backed verified users,
   deterministic PostgreSQL lists/tasks, mailbox-safe shared helpers, and seed
   tests/evidence.
3. **T-15.3 — Chromium journeys:** replace the example suite with the
   deterministic landing assertion, core, magic-link, privacy,
   pagination/filtering, and dashboard skip-link scenarios.
4. **T-15.4 — browser selection and closeout:** opt-in Firefox/WebKit command,
   full gates, ledger/TODO/checkpoint reconciliation, fresh review loop, and
   dependency recomputation.

Every unit must leave a runnable, reviewable tip and use the repository's
testing-first-class → test-driven-development → incremental-implementation
sequence. Review prompts must request reasonable, proportional, pragmatic,
actionable-only findings.
