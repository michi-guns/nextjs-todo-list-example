---
name: reviewer-followthrough
description: Close an AgentForge task after an independent GPT-5.6-Sol review, reconcile findings with project authority, update evidence and dependencies, and continue only when the next task is safe.
---

# Reviewer follow-through

This is a temporary coordination skill for the implementation run described in `docs/agentforge/temporary/2026-08-30-implementation-run.md`. It coordinates close-out; it does not define product requirements, replace the review, or grant permissions.

## Activation and validity gates

Activate this skill only when all of the following are true:

1. The current task's focused and required project checks have run, with failures and unavailable evidence recorded honestly.
2. A fresh GPT-5.6-Sol reviewer inspected the exact current commit or artifact and reported **no actionable findings**.
3. The review request included the task contract, affected `TST-*` obligations, changed artifact, and verification evidence. The reviewer was asked to be reasonable, proportional, and pragmatic and to separate blockers from optional suggestions.

If any gate is missing, return to the relevant implementation, verification, or review skill. Never use this skill to bypass an unresolved finding.

This skill is valid only through 2026-08-31 in Europe/Athens. On or after 2026-09-01, it and the paired run context and Claude bridge are stale and non-authoritative: do not activate, extend, or author from them. Request explicit file-level deletion of the three paths before other task work; use no recursive deletion. If deletion approval is not available, stop and report the exact paths.

## Interpret review findings before fixing

Reviewer output is evidence, not authority. For every finding reported before the activation gate:

1. Locate the exact behavior, test, or contract it concerns; do not infer from the reviewer's summary alone.
2. Reconcile it with the applicable DWF PRD/SPEC/decisions, `TST-*` contract, installed-version official documentation or source, and executable behavior.
3. Classify it as **actionable**, **contract conflict/design gap**, **optional/nit**, or **noise**.
4. Fix an in-scope actionable finding with the smallest robust change. A behavior change needs a focused regression test when its prerequisite is available.
5. Do not implement a suggestion that contradicts a DWF contract or a framework's documented security/lifecycle behavior until the conflict is explicitly resolved. Surface the conflict and preserve the stronger evidence.

After every fix, rerun affected checks and obtain a new fresh review of the changed artifact; approval of an earlier commit does not carry forward. If three substantive review cycles remain unresolved or contradictory, stop and report the exact conflict rather than looping or claiming satisfaction.

## Close the reviewed task

1. Confirm the reviewer examined the latest branch/PR tip; a local review of an unpushed commit is not a reviewed PR.
2. Reconcile every referenced `TST-*` contract in `.dwf/decisions/TESTING.md`.
3. Record exact commands, results, and any honest partial, blocked, or deferred evidence.
4. Mark the task `[x]` in `TODO.md` and link the plan, PR, reviewed commit, and evidence.
5. Preserve future obligations; never mark a contract verified from weaker evidence or a lower test layer.
6. Update the paired run context with the new branch, commit, merged/PR state, and next checkpoint. It is a live checkpoint, not an immutable handoff.

## Recompute and continue

1. Read the current `TODO.md` dependency lines after the task is complete; do not rely on the old run context or memory.
2. Identify every task whose dependencies are satisfied and check its real prerequisites. Do not assume only the immediate successor is eligible.
3. Merge the reviewed PR and pull latest `main` under the current user authorization. Do not merge a stale or differently reviewed tip.
4. Start the next safely unblocked task from a fresh task branch and follow the repository's planning, task-breakdown, testing-first, TDD, incremental, source-driven, verification, and PR rules.
5. If no task is eligible, or a prerequisite/contract conflict remains, stop and report the exact blocker and its smallest unblocking action.

## Reviewer request

Use a prompt with this shape, supplying the actual contract and artifact:

```text
Review the exact current artifact/commit against the task contract and affected TST-* obligations.
Be reasonable, proportional, and pragmatic. Report actionable correctness, security, boundary,
test, maintainability, and established-convention defects only. Separate optional nits and
speculative improvements; do not expand scope. Treat framework behavior and DWF contracts as
evidence to verify, not assumptions to override. For each finding, give severity, concrete
evidence, affected contract/source, and the smallest remedy. If none remain, say exactly:
"No actionable findings."
```

## Scope and safety

- Use only repository-local AgentForge skills and DWF authority.
- Keep secrets out of source, evidence, commits, and PRs.
- Do not use recursive deletes or destructive Git history operations.
- Do not silently change DWF decisions or invent requirements.
- Keep unrelated dirty work intact.
