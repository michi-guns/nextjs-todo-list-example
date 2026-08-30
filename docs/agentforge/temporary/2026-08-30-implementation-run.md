# Temporary implementation-run context

**Created:** 2026-08-30

**Timezone:** Europe/Athens

**Expires:** 2026-09-01 (the file and its paired temporary skill are stale on that date)

## Objective

Continue the repository's AgentForge delivery autonomously through every task that is safely unblocked. Start with T-12, finish each task with evidence, obtain a fresh pragmatic GPT-5.6-Sol review, fix all actionable findings, and then reassess the dependency graph before selecting the next task.

## Repository state at handoff

- Repository: `michi-guns/nextjs-todo-list-example`
- Current branch: `task/t-12-sanity-landing-read-path`
- Base: latest `main` from `origin/main`
- T-05 PR #7 remains open and unmerged: `task/t-05-better-auth-boundary`
- T-12 is the only implementation task currently unblocked. T-13 becomes eligible after T-12 is merged. T-06 and later todo capabilities remain blocked by T-05.
- No secrets, token values, or environment contents belong in commits, logs, or PR bodies.

## Non-negotiable constraints

- Use only repository-local AgentForge skills and DWF contracts.
- For behavior changes, use `testing-first-class`, then `test-driven-development`, with incremental slices.
- Follow the saved plan at `docs/agentforge/plans/2026-08-30-t-12-sanity-landing-read-path.md`.
- No recursive deletes. Routine reads, edits, tests, commits, pushes, PRs, merges, and branch cleanup are authorized for this run.
- Do not broaden a task or reopen accepted product/technical decisions without a concrete contract gap.

## T-12 acceptance target

Add the server-only Sanity application read boundary under `src/sanity` and `src/modules/landing`: fetch the published singleton, validate unknown data, map a plain landing view model, and give the published read one stable cache identity. Keep raw Sanity/GROQ types inside infrastructure. Route the separate live smoke through the same canonical path. Leave public landing UI to T-11.

Affected contracts: `TST-LANDING-001` and `TST-LANDING-002`.

Expected evidence: fixture tests for valid, optional, malformed, incomplete, identity-mismatch, and provider-field-isolation cases; `pnpm sanity:smoke`; `pnpm test`; `pnpm typecheck`; `pnpm lint`; and `git diff --check`.

## Review loop

After a task's focused and project checks pass:

1. Commit and push the task branch and open its PR.
2. Spawn a fresh GPT-5.6-Sol agent at medium reasoning. Tell it to be reasonable, proportional, and pragmatic; review correctness, security, boundaries, tests, maintainability, and project conventions; report actionable findings only; do not demand speculative perfection or scope expansion.
3. If it reports findings, fix them, rerun affected checks, and spawn another fresh reviewer. Continue until the reviewer reports no actionable findings.

## Close-the-loop protocol

Only after the reviewer is satisfied:

1. Reconcile every referenced `TST-*` contract with exact evidence in `.dwf/decisions/TESTING.md`.
2. Mark the completed task `[x]` in `TODO.md`, link its plan/PR/evidence, and keep later obligations visible.
3. Merge the reviewed PR under the current user authorization, update local `main` with `git pull --ff-only`, and recompute all task dependencies from `TODO.md`.
4. Select the next task whose dependencies are genuinely satisfied, create its task branch from latest `main`, and repeat this run context and review loop.
5. Stop only when no safely unblocked task remains or an explicit prerequisite/contract decision blocks progress; report the exact reason.

## Expiry guard

This is temporary coordination state, not a product or technical authority. On or after **2026-09-01 Europe/Athens**, do not use or author from this file or the paired `reviewer-followthrough` skill. Treat both as stale/expired and remove them with explicit file-level deletion only. If no agent runs that day, cleanup occurs at the first later invocation before any other task action.
