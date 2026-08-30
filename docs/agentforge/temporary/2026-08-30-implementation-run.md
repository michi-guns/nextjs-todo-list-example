# Temporary implementation-run context

**Created:** 2026-08-30

**Timezone:** Europe/Athens

**Expires:** 2026-09-01 (the file and its paired temporary skill are stale on that date)

## Objective

Continue the repository's AgentForge delivery autonomously through every task that is safely unblocked. Finish each task with evidence, obtain a fresh pragmatic GPT-5.6-Sol review, fix all actionable findings, and then reassess the dependency graph before selecting the next task.

## Repository state at handoff

- Repository: `michi-guns/nextjs-todo-list-example`
- Current branch: `task/t-16-neon-performance-evidence` (T-09A merged as `b88f377`; T-09B is complete on the direct-main tip `994bca0`; T-16 hosted evidence ran against implementation commit `7837a69`; current reviewed closeout tip is `944c35f`; PR #16 remains open pending final closeout review and merge; verify `git rev-parse HEAD` before acting)
- Base: latest `main` from `origin/main`
- T-05 PR #7 is merged as `2935283`; T-12 and T-13 are already merged and complete.
- T-06 PR #10 is merged as `1c1b355`; its implementation commit `cdf6ee1` and closeout tip `2eccfcc` each received fresh GPT-5.6-Sol reviews with no actionable findings. T-07 PR #11 is merged as `cce883c`; its implementation tip `2253724` and closeout metadata tips received fresh GPT-5.6-Sol reviews, with all actionable findings fixed and the final current-tip review returning no actionable findings. T-08 PR #12 was independently reviewed through closeout tip `72e999e` with no actionable findings and merged as `ee20cea`. T-14 PR #13 was reviewed through implementation tip `ce8c4dc`, closeout tip `29d0343`, formatting tip `fbe3948`, and checkpoint tip `dadcd68`, with all actionable findings fixed and the final current-tip review returning no actionable findings; it is merged as `df974b9`. At that historical checkpoint, dependency recomputation left T-09, T-09A, and T-16 as candidate tasks; the current graph is recorded below.
- T-09 PR #14 implemented the list/task Server Actions and JSON Route Handler entry paths. Implementation `b4292b5`, same-origin security fix `6604141`, code/test tip `853fedd`, and metadata tips `2ed1e35`, `4a58242`, and `5e45396` were reviewed through the required fresh-review loop with all actionable findings fixed; it is merged as `17c0799`. All unit, integration, typecheck, lint, build, Drizzle, Prettier, and diff gates pass. At that handoff, dependency recomputation left T-09A and T-16 safely unblocked; T-09A was selected first on this branch with plan [`docs/agentforge/plans/2026-08-30-t-09a-ui-direction-exploration.md`](../plans/2026-08-30-t-09a-ui-direction-exploration.md).
- This is a live checkpoint, not authority: verify the current branch, `HEAD`, remote/PR state, `TODO.md`, accepted plan, and prerequisites before acting, then update this section after every task transition.
- No secrets, token values, or environment contents belong in commits, logs, or PR bodies.

## T-09A closeout checkpoint

The accepted T-09A plan is implemented under `.ui-explorations/t09a-dashboard/`: three materially different dashboard prototypes share one fixture and interaction harness, with explicit landing/auth extension notes and no production surface changes. Reviewed code tip `b37fa8e` and closeout tip `e1cec9a` passed the structural validator, Chromium inspection, 86 unit tests, typecheck, lint (one pre-existing Geist warning), build, formatting, and diff checks. The checkpoint commits `98cb2cb`, `7d6dd8d`, `e1dd2b7`, and `23d27e9` reconciled the closeout context and artifact links; T-09A is complete in TODO and PR #15 merged as `b88f377`. T-09B consumed this exploration and is recorded below.

## T-09B closeout checkpoint

The accepted plan [`2026-08-30-t-09b-ui-direction-handoff.md`](../plans/2026-08-30-t-09b-ui-direction-handoff.md) selected Focus Rail and added the implementation-ready brief at `.ui-explorations/t09a-dashboard/handoff.md`. `exploration.json` is now `status: "selected"` with `selected_direction: "focus-rail"`; `report.md` records the explicit accessibility comparison and rejected Status Board/Command Inspector alternatives. The handoff defines the dashboard composition, responsive breakpoints, semantic shadcn/Tailwind tokens, keyboard/focus and state requirements, and landing/auth extension notes for T-10 and T-11. No production route, API, schema, migration, dependency, or business behavior changed.

T-09B affected `TST-UI-001`, which remains `partial`: T-09A/T-09B provide prototype and selection evidence; T-10/T-11/T-12A own materialized UI runtime/state evidence; T-15's browser journeys remain under the separate `TST-E2E-*` contracts. The direction validator reports 3 directions, 0 errors, and 0 warnings; local Markdown links, Prettier, `git diff --check`, `pnpm test` (17 files/86 tests), typecheck, lint (one pre-existing `Geist` warning), and build pass. Review loop: `1ccf044` and `5472805` received actionable documentation findings, fixed in `5472805` and `88e184e`; fresh reviews of `88e184e`, `d15f25e`, and final closeout tip `994bca0` returned no actionable findings. TODO marks T-09B complete and the reviewed direct-main history is pushed to `origin/main`; no PR branch was required under `AGENTS.md`.

## T-16 closeout checkpoint

The accepted plan [`2026-08-30-t-16-neon-performance-evidence.md`](../plans/2026-08-30-t-16-neon-performance-evidence.md) is implemented on `task/t-16-neon-performance-evidence`. The guarded `pnpm neon:performance` CLI obtains the direct development endpoint independently through `neon connection-string development`, rejects a supplied default-branch URL before mutation, scopes replacement to the two deterministic synthetic users, and records source provenance. The hosted run at implementation commit `7837a69cf8cacaa01825e324d305d799e42fce07` seeded 101 primary lists, 10,000 primary tasks, and 10,000 secondary-owner tasks; all six representative plans used the accepted composite indexes without lists/tasks sequential scans; maximum-page-size cursor and owner-isolation checks passed; and ten warmed server-reported executions peaked at 0.086 ms against the 50 ms target. The redacted artifact is [`docs/agentforge/evidence/t16-neon-performance.json`](../evidence/t16-neon-performance.json); `TST-PERFORMANCE-001` is reconciled as verified. The semantic-preserving explicit `NULLS LAST` task ordering remains aligned with the existing index.

Review loop history: `fccab14` received the circular-guard finding; `4c35d6b` fixed it and the next review found only the stale test count; `527bf25` reconciled that count and the next review found the missing checkpoint/provenance; `7837a69` adds generated commit/ref provenance. The final fresh review of the closeout tip is pending before PR #16 is merged. Checks through this closeout include `pnpm test` (18 files/92 tests), `pnpm test:integration` (6 files/23 tests against one disposable PostgreSQL 18 Testcontainer), typecheck, lint with only the pre-existing `Geist` warning, build, changed-file Prettier, and `git diff --check`; the hosted development run and default-branch rejection regression also pass.

## Non-negotiable constraints

- Use only repository-local AgentForge skills and DWF contracts.
- For behavior changes, use `testing-first-class`, then `test-driven-development`, with incremental slices.
- Preserve the completed T-07/T-08 plans and implement only from the accepted current-task plan and its `TODO.md` breakdown.
- No recursive deletes. Routine reads, edits, tests, commits, pushes, PRs, merges, and non-destructive branch inspection are authorized for this run; deleting a local or remote branch still requires the explicit confirmation required by `AGENTS.md`.
- Do not broaden a task or reopen accepted product/technical decisions without a concrete contract gap.

## T-07 completed checkpoint

The framework-independent tasks domain/application boundary and Drizzle repository under `src/modules/tasks` are complete: task fields are validated and normalized; CRUD and deterministic bounded cursor reads are owner/list-scoped; list ownership, per-list title uniqueness, completed filtering, direct status transitions, repeated-status timestamp idempotence, and omitted-versus-submitted patch semantics are covered. Raw Drizzle rows remain inside infrastructure, and the existing schema was consumed without a migration. Entry paths and UI remain with later tasks.

Affected contracts: `TST-TASKS-001`, `TST-TASKS-002`, `TST-TASKS-003`, and the task-side portion of `TST-CONCURRENCY-001`.

Evidence is recorded in `TODO.md` and `.dwf/decisions/TESTING.md`: the full unit/integration/type/lint/build/Drizzle/diff gates pass, while boundary, browser, and reusable-harness obligations remain honestly `partial` and owned by T-08/T-09/T-10/T-14.

## T-08 completed checkpoint

The framework-independent shared pagination and error contracts are merged: stable `Page<T>`/page-request types and 20/100 limits, Zod-backed parsing for untrusted pagination parameters, and safe mapping of known application outcomes to the accepted status/envelope. List/task consumers use the shared page primitives, and maximum-size (100→101) list/task continuation evidence is covered. Capability-specific cursor codecs/domain errors, migrations, routes, actions, and UI remain with their owning tasks.

Affected contracts: `TST-LISTS-003`, `TST-TASKS-003`, and `TST-BOUNDARY-001`.

Evidence: 14 unit-test files/62 tests and 5 local PostgreSQL integration files/21 tests against disposable `postgres:18-alpine`; full typecheck, lint (one pre-existing Geist warning), build, both Drizzle checks, changed-file Prettier, and diff gates pass. The implementation tip `c3044b5` and closeout tip `72e999e` each received fresh pragmatic reviews with no actionable findings. Testcontainers lifecycle and authenticated request evidence remain with T-14/T-09.

## T-14 completed checkpoint

The reusable PostgreSQL integration harness is implemented: `@testcontainers/postgresql` starts one disposable `postgres:18-alpine` container in Vitest global setup, applies the committed migration chain, injects its local URI through `project.provide`/`inject`, runs integration files serially, and tears the container down on success or setup failure. Existing per-file schema isolation and migrations remain unchanged.

Affected contracts: `TST-HARNESS-001`, `TST-MIGRATION-001`, `TST-PERSISTENCE-001`, `TST-LISTS-001`, `TST-LISTS-002`, `TST-LISTS-003`, `TST-TASKS-001`, `TST-TASKS-002`, `TST-TASKS-003`, and `TST-CONCURRENCY-001`.

Evidence: `pnpm test` (15 files/67 tests), `pnpm test:integration` without `TEST_DATABASE_URL` (6 files/23 tests against one disposable PostgreSQL 18 Testcontainer), typecheck, build, Drizzle check/generate, lint with the existing Geist warning only, changed-file Prettier checks, and diff checks pass. Harness unit/integration tests cover local-target refusal, startup/migration failure reporting and cleanup, migration visibility, serial shared-container compatibility, and schema isolation. T-14 implementation, closeout, formatting, and checkpoint tips received fresh GPT-5.6-Sol reviews with no actionable findings. TST-HARNESS-001 remains `partial` for the live daemon-outage and Playwright lifecycle clauses; TST-MIGRATION-001 remains `partial` pending Neon development-branch alignment.

## Next-task dependency checkpoint

The current TODO graph marks T-09A complete and PR #15 merged as `b88f377`, T-09B complete on `main` at `994bca0`, and T-16 complete in TODO on reviewed closeout tip `944c35f` (the hosted evidence itself ran against implementation commit `7837a69`) with PR #16 open pending final review/merge. Once PR #16 is merged, T-10 (authenticated dashboard) and T-11 (public landing/auth) are the safely unblocked implementation candidates; T-12A, T-15, and T-17 remain blocked by their listed dependencies. T-16 has no remaining implementation dependency.

## Review loop

After a task's focused and project checks pass:

1. Commit and push the task branch and open its PR.
2. Spawn a fresh GPT-5.6-Sol agent at medium reasoning. Tell it to be reasonable, proportional, and pragmatic; review correctness, security, boundaries, tests, maintainability, and project conventions; report actionable findings only; do not demand speculative perfection or scope expansion.
3. Treat findings as evidence, not requirements. Reconcile each one with the changed artifact, DWF/TST contracts, installed-version official docs/source, and executable behavior before fixing or rejecting it. A suggestion that overrides documented framework security/lifecycle behavior is a contract conflict until proven otherwise.
4. If a finding is actionable, fix the smallest in-scope behavior and add/update its regression test when possible, rerun affected checks, and spawn another fresh reviewer. Approval never carries over to a changed commit.
5. If three substantive cycles remain unresolved or contradictory, stop and report the exact conflict rather than looping or claiming satisfaction.

## Close-the-loop protocol

Only after the reviewer is satisfied:

1. Reconcile every referenced `TST-*` contract with exact evidence in `.dwf/decisions/TESTING.md`.
2. Mark the completed task `[x]` in `TODO.md`, link its plan/PR/evidence, and keep later obligations visible.
3. Merge the reviewed PR under the current user authorization, update local `main` with `git pull --ff-only`, and recompute all task dependencies from `TODO.md`.
4. Select every task whose dependencies are genuinely satisfied (not only the immediate successor), verify its real prerequisites, create its task branch from latest `main`, and repeat this run context and review loop.
5. Stop only when no safely unblocked task remains or an explicit prerequisite/contract decision blocks progress; report the exact reason.

## Expiry guard

This is temporary coordination state, not a product or technical authority. On or after **2026-09-01 Europe/Athens**, do not use or author from this file, the paired `reviewer-followthrough` skill, or its Claude bridge. Treat all three as stale/expired and remove them with explicit file-level deletion only. If no agent runs that day, cleanup occurs at the first later invocation before any other task action.
