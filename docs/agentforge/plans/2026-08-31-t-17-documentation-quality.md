# T-17: Finish documentation and final quality gates

**Status:** Completed

## Goal

Make the repository's setup, environment boundaries, migration workflow, test
commands, and recovery paths discoverable from the README and supporting
runbooks. Then run the final local quality gates and reconcile the active
testing contracts and delivery checklist against the implementation on `main`.

This is a documentation and evidence task. It does not change application
behavior, dependencies, schema, migration files, or provider data.

## Authoritative inputs

- Product contract: [Agent PRD](../../../.dwf/output/agent/PRD.md), especially
  the starter-baseline acceptance in section 7.
- Technical contract: [Agent SPEC](../../../.dwf/output/agent/SPEC.md),
  especially migration workflow (3.3), testing (10), environment categories
  (11), and definition of done (13).
- Accepted decisions: [TD-013](../../../.dwf/decisions/TECHNICAL.md#td-013),
  [TD-014](../../../.dwf/decisions/TECHNICAL.md#td-014),
  [TD-015](../../../.dwf/decisions/TECHNICAL.md#td-015),
  [TD-016](../../../.dwf/decisions/TECHNICAL.md#td-016),
  [TD-017](../../../.dwf/decisions/TECHNICAL.md#td-017),
  [TD-018](../../../.dwf/decisions/TECHNICAL.md#td-018),
  [TD-019](../../../.dwf/decisions/TECHNICAL.md#td-019), and
  [TD-025](../../../.dwf/decisions/TECHNICAL.md#td-025).
- Test authority: [TESTING.md](../../../.dwf/decisions/TESTING.md), including
  the current status and evidence for every active `TST-*` contract.
- Repository guidance: [documentation protocol](../../documentation-protocol.md),
  [PostgreSQL/Drizzle notes](../../data/postgresql.md), [Sanity notes](../../data/sanity.md),
  and [quality gates](../../development/quality-gates.md).

## Current-state findings

- `README.md` already documents core auth variables, the local mailbox, and the
  Testcontainers integration boundary, but it does not provide a complete
  quick-start, exact migration/Drizzle commands, Sanity configuration/smoke
  path, Playwright lifecycle, or recovery map.
- The repository has two committed migration directories: the original auth
  foundation and the later lists/tasks schema. They are the complete chain for
  a fresh database. No new migration is needed for this documentation task.
- `pnpm test:integration` and the Playwright runner own disposable local
  PostgreSQL 18 containers; routine tests must not be pointed at Neon or a
  developer database. `pnpm sanity:smoke` is intentionally a separate,
  read-only configured-resource check.
- The remaining baseline contract caveats are already explicit: migration
  smoke on the agent-owned Neon development branch is blocked pending an
  explicitly authorized realignment (`TST-MIGRATION-001`), the live
  Docker-outage observation is unobserved (`TST-HARNESS-001`), and deployed
  Sanity delivery is deferred until a release candidate (`TST-LANDING-003`).
  Existing application and PostgreSQL evidence now satisfies
  `TST-CONCURRENCY-001`; documentation must preserve these distinctions.

## Work packages

### T-17.1: README setup and environment map

Update `README.md` with a concise quick start, prerequisites, exact current
environment variable names grouped by local application, migrations, Sanity,
and test-only use. Explain that secrets and captured links stay out of Git;
provide a safe `.env.local` shape without real values. Link to canonical DWF
and supporting docs instead of copying product requirements.

Acceptance:

- A new contributor can install dependencies, configure a local app database
  and Better Auth, run the app, and identify the separate Sanity smoke.
- The README accurately explains that `DATABASE_URL_UNPOOLED` is preferred
  for direct migration commands, while the application uses `DATABASE_URL`.
- The README accurately describes the local mailbox gate, deterministic
  Playwright landing fixture, Chromium default, and opt-in cross-browser run.

### T-17.2: Migration, test, and recovery runbook

Add a focused runbook under `docs/runbooks/` (and link it from the runbook
index) for the implementation-specific commands and failure boundaries:

- inspect/check/generate/apply the committed Drizzle chain;
- run unit, local Testcontainers integration, Chromium Playwright, opt-in
  cross-browser, and Sanity live-smoke commands;
- recover from a failed migration or stale/invalid Sanity content by using the
  existing runbooks and never logging secrets or targeting external databases
  with destructive test cleanup.

Acceptance:

- Commands are copyable PowerShell examples and use placeholders rather than
  credential values.
- Migration guidance routes through the accepted environment-gated policy:
  consolidate only safely recreatable pre-release history; use a new forward
  migration once shared development or production depends on the chain.
- The runbook does not introduce a second source of requirements or imply a
  production deployment exists.

### T-17.3: Final gates and reconciliation

Run the proportionate final gate for the whole implementation, check the SPEC
definition of done, reconcile every active `TST-*` status/evidence reference
that changed, update `TODO.md`, and refresh the temporary implementation
checkpoint. Record skipped optional browser/deployment checks, pre-existing
lint warnings, and concrete remaining risks honestly.

Required checks:

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm test:integration`
- `pnpm test:e2e`
- `pnpm exec drizzle-kit check --config drizzle.config.ts`
- `pnpm exec prettier --check` for changed files
- `pnpm build`
- `git diff --check`

`pnpm test:e2e:cross-browser` remains an explicit optional check; project
selection may be verified without requiring Firefox/WebKit execution in the
ordinary gate. `pnpm sanity:smoke` remains a separate live prerequisite whose
result must not be replaced by a local fixture.

## Dependencies and sequencing

T-12A, T-14, T-15, and T-16 are complete on the current `main` tip. Work
packages are sequential because the README/runbook must reflect the final
commands and the reconciliation must describe the exact reviewed evidence.
No source, migration, dependency, Neon, Sanity, or external deployment change
is authorized by this plan.

## Review and closeout

After the documentation/evidence tip is complete, obtain a fresh GPT-5.6-Sol
medium-reasoning review with an explicit request for reasonable, proportional,
pragmatic, actionable-only findings. Fix every actionable finding, re-run the
affected checks, and obtain a clean review of the final metadata tip before
marking T-17 complete. Recompute the TODO dependency graph; if no safely
unblocked task remains, record that result and stop.
