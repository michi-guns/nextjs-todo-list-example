---
name: reviewer-followthrough
description: Continue an authorized AgentForge task run after a fresh GPT-5.6-Sol review is satisfied by reconciling evidence, updating TODO, and selecting the next unblocked task.
---

# Reviewer follow-through

This is a temporary coordination skill for the implementation run described in `docs/agentforge/temporary/2026-08-30-implementation-run.md`.

## Activation gate

Activate this skill **only after** the current task has a fresh GPT-5.6-Sol review with no actionable findings. It must not replace the review or be used to bypass unresolved findings.

## Close the reviewed task

1. Reconcile every referenced `TST-*` contract in `.dwf/decisions/TESTING.md`.
2. Record exact commands, results, and any honest partial or blocked evidence.
3. Mark the task `[x]` in `TODO.md` and link the plan, PR, and evidence.
4. Preserve future obligations; do not mark a contract verified from weaker evidence.

## Recompute and continue

1. Read the current `TODO.md` dependency lines after the task is complete.
2. Identify every task whose dependencies are satisfied; do not assume only the immediate successor is eligible.
3. Merge the reviewed PR and pull latest `main` under the current user authorization.
4. Start the next safely unblocked task from a fresh task branch and follow the repository's planning, testing-first, TDD, incremental, verification, and PR rules.
5. If no task is eligible, stop and report the remaining blockers and their prerequisites.

## Review standard

The reviewer must be asked to be reasonable, proportional, and pragmatic. Fix actionable correctness, security, boundary, test, maintainability, and established-convention issues. Do not expand scope for speculative perfection. Every new fix requires verification and a fresh reviewer.

## Scope and safety

- Keep secrets out of source, evidence, commits, and PRs.
- Do not use recursive deletes or destructive Git history operations.
- Do not silently change DWF decisions or invent requirements.
- Keep unrelated dirty work intact.

## Expiry guard

Valid only through 2026-08-31 in Europe/Athens. On or after 2026-09-01, this skill is non-authoritative and stale: do not activate it or author from it. Remove this file and `docs/agentforge/temporary/2026-08-30-implementation-run.md` with explicit file-level deletion before doing other work. No recursive deletion is permitted.
