---
name: git-workflow-and-versioning
description: Deliver coherent commits, reviewed task merges, and safe branch cleanup using this repository's Git workflow. Use when branching, committing, integrating work, or preparing a versioned release.
---

# Git workflow and versioning

Use [AGENTS.md](../../../AGENTS.md) for authorization and safety and the
[task workflow](../../../TODO.md#task-branch-and-merge-protocol) for delivery.
Task work uses a branch from current main and merges directly back after checks
and independent review. A PR is needed only when explicitly requested.

## Before changing Git state

Read status, branch tips and worktree usage. Preserve dirty/untracked work and
stashes. Fetch before choosing the task base or checking remote cleanup.
Never infer that a branch is disposable from its name or age.

Use the task's accepted plan, scope and verification. Do not turn a Git task
into a release, deployment, dependency update, or unrelated cleanup.

## Commits and integration

Keep each commit coherent and describe the outcome with a clear prefix such as
`feat:`, `fix:`, `docs:`, or `chore:`. Inspect the staged diff, keep secrets
and generated build output out, and leave commit hooks enabled.

Record checks and their limits in the task or linked evidence. Follow the
[quality gates](../../../docs/development/quality-gates.md) proportionate to the
changed files; prose-only work does not require redundant application tests.

Use the independent review gate in `AGENTS.md`. Prefer a fast-forward merge
of the reviewed tip. If concurrent work advanced main, merge main into the task
branch, resolve conflicts and repeat affected checks and review before merging
back. Do not rebase or amend under routine delivery authorization.

## Branch cleanup and light housekeeping

After integration and push, verify the exact branch tip is an ancestor of main:

`git merge-base --is-ancestor <branch-tip> main`

Only exit code 0 proves inclusion. Check current worktrees and other agents
before deletion. Use `git branch -d <branch>` for an eligible local branch.
For remote branches, fetch and verify the current remote tip is also in main.
Delete with an exact-tip lease so concurrent updates are preserved:

`git push --force-with-lease=refs/heads/<branch>:<verified-sha> origin :refs/heads/<branch>`

The lease protects the authorized deletion; it does not authorize force-updating
any branch. If the lease fails or another worker is active, keep the branch and
report why. Never delete main. Avoid blanket pruning based only on stale refs.

Check documentation affected by the work and finish with clean main where
possible. Do not discard unrelated changes to make status look clean. Deleting
files, caches, stashes or worktree directories still follows the separate safety
checkpoint in `AGENTS.md`.

## Versioned releases

A task merge is not a release. Follow the
[production release procedure](../../../docs/runbooks/production-release.md)
and its protected approvals for hosted work.

When an authorized release needs a version, use an immutable tag and choose
major/minor/patch according to consumer-visible compatibility. Never move an
existing shared tag as routine cleanup. Record user-visible changes and required
migration steps in the repository's existing documentation; do not introduce a
parallel changelog or release process solely because this skill was invoked.

## Completion

Report the task and final commit, checks and independent review, main-push CI,
and any branch or local work deliberately retained. Routine commit, push, merge
and eligible branch cleanup need no additional permission.
