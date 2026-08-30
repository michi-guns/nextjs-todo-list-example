# Temporary implementation-run context

**Created:** 2026-08-30

**Timezone:** Europe/Athens

**Expires:** 2026-09-01 (the file and its paired temporary skill are stale on that date)

## Objective

Continue the repository's AgentForge delivery autonomously through every task that is safely unblocked. Finish each task with evidence, obtain a fresh pragmatic GPT-5.6-Sol review, fix all actionable findings, and then reassess the dependency graph before selecting the next task.

## Repository state at handoff

- Repository: `michi-guns/nextjs-todo-list-example`
- Current branch: `main` at merge commit `cce883c` (T-07 merged; T-08 is the next task)
- Base: latest `main` from `origin/main`
- T-05 PR #7 is merged as `2935283`; T-12 and T-13 are already merged and complete.
- T-06 PR #10 is merged as `1c1b355`; its implementation commit `cdf6ee1` and closeout tip `2eccfcc` each received fresh GPT-5.6-Sol reviews with no actionable findings. T-07 PR #11 is merged as `cce883c`; its implementation tip `2253724` and closeout metadata tips received fresh GPT-5.6-Sol reviews, with all actionable findings fixed and the final current-tip review returning no actionable findings. Dependency recomputation leaves T-08 as the only safely unblocked implementation task; T-09/T-09A/T-09B and later UI/application tasks remain blocked by their prerequisites, and T-14/T-16 remain blocked by their listed dependencies.
- This is a live checkpoint, not authority: verify the current branch, `HEAD`, remote/PR state, `TODO.md`, accepted plan, and prerequisites before acting, then update this section after every task transition.
- No secrets, token values, or environment contents belong in commits, logs, or PR bodies.

## Non-negotiable constraints

- Use only repository-local AgentForge skills and DWF contracts.
- For behavior changes, use `testing-first-class`, then `test-driven-development`, with incremental slices.
- Follow the saved plan at `docs/agentforge/plans/2026-08-30-t-07-tasks-capability.md` for the completed checkpoint; create and accept a new T-08 plan before implementation.
- No recursive deletes. Routine reads, edits, tests, commits, pushes, PRs, merges, and branch cleanup are authorized for this run.
- Do not broaden a task or reopen accepted product/technical decisions without a concrete contract gap.

## T-07 completed checkpoint

The framework-independent tasks domain/application boundary and Drizzle repository under `src/modules/tasks` are complete: task fields are validated and normalized; CRUD and deterministic bounded cursor reads are owner/list-scoped; list ownership, per-list title uniqueness, completed filtering, direct status transitions, repeated-status timestamp idempotence, and omitted-versus-submitted patch semantics are covered. Raw Drizzle rows remain inside infrastructure, and the existing schema was consumed without a migration. Entry paths and UI remain with later tasks.

Affected contracts: `TST-TASKS-001`, `TST-TASKS-002`, `TST-TASKS-003`, and the task-side portion of `TST-CONCURRENCY-001`.

Evidence is recorded in `TODO.md` and `.dwf/decisions/TESTING.md`: the full unit/integration/type/lint/build/Drizzle/diff gates pass, while boundary, browser, and reusable-harness obligations remain honestly `partial` and owned by T-08/T-09/T-10/T-14.

## Next checkpoint: T-08

T-08 is the only task whose dependencies are satisfied after T-07: T-06 and T-07 are complete, while T-09/T-09A/T-09B/T-14/T-16 remain blocked by their listed prerequisites. Create the T-08 AgentForge plan and task breakdown from the current `main` before coding.

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
