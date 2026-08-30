---
name: migration-history-workflow
description: >-
  Decide whether a versioned database migration history can be consolidated or
  must remain append-only by checking whether it is pre-release, shared, or live.
metadata:
  short-description: Choose in-place consolidation or forward migrations
---

# Migration history workflow

Use this skill for changes to a versioned database migration history. Its one
responsibility is choosing between consolidating unreleased history in place
and preserving adopted history with a new forward migration. It does not own
schema design, database-vendor commands, application tests, or deployment
promotion rules; follow the repository's local guidance for those concerns.

## State gate: inspect before choosing a migration shape

Do not create, edit, or delete migration files until the current state is
supported by evidence.

1. Read the repository instructions, migration documentation, and the selected
   migration tool's documentation. Identify any project-specific rules for
   generated metadata, migration application, review, and promotion.
2. Inspect the repository without exposing secrets: current branch and dirty
   paths, the active schema/configuration, every tracked migration directory,
   and the migration tool's ordering or snapshot metadata.
3. Inspect each relevant target read-only. Determine which migrations are
   recorded as applied, whether data must be retained, and whether real users,
   testers, stakeholders, or collaborators rely on the target. Never print
   connection strings or credentials.
4. Classify the project state from target usage, not from a branch name alone:

   | State                         | Evidence                                                                                                                                                                                      |
   | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
   | **Pre-release / scaffolding** | No real users or stakeholder/tester reliance; targets are fresh, agent-owned, ephemeral, or safely recreatable. Project labels such as V0 are useful context but are not proof by themselves. |
   | **Shared development**        | Testers, stakeholders, or collaborators rely on a development/staging target, or its data/history cannot be discarded, even if the product is not public.                                     |
   | **Production**                | Real users or live data depend on the target.                                                                                                                                                 |
   | **Unknown**                   | Evidence conflicts or access is insufficient. Stop and resolve the state with the owner rather than guessing.                                                                                 |

Record the evidence and classification in the implementation plan or change
notes before selecting a migration shape. A cloud target used only for an
agent's disposable smoke test is not production by itself; a shared target
with zero rows is still shared when other people rely on its history.

## Decision rule

Ask one question before creating a new migration: **Has another target adopted
the existing history, or can the final schema still be represented by the
existing unreleased migration?**

| Evidence-backed state                                                                   | Default action                                                                                                                                                                   |
| --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pre-release / scaffolding, and history exists only in disposable or agent-owned targets | Prefer one coherent initial migration. Consolidate unreleased changes in place, regenerate the tool's metadata, and realign disposable targets only after explicit confirmation. |
| Shared development or production, or any target with non-disposable data                | Keep applied history immutable. Add the smallest forward migration, verify the upgrade path on the repository's safe target, and promote it using the local release rules.       |
| Unknown or contradictory state                                                          | Do not rewrite or append on a guess. Resolve the environment status with the owner first.                                                                                        |

An existing migration in Git is not automatically immutable. The deciding
question is whether a shared or real-user target has adopted it. Conversely,
do not rewrite history merely because a target has no rows if other people
depend on that target's history.

## Workflow

1. State the target classification, evidence, assumptions, and selected mode
   (consolidation or append-only) before implementation.
2. For pre-release consolidation, get explicit confirmation before overwriting
   or removing migration files, generated metadata, or disposable target
   state. Make the final schema the source of truth, regenerate the migration
   tool's metadata, and remove obsolete unreleased steps only when the
   repository's safety rules allow it.
3. For shared development or production, preserve every applied migration and
   generate only the smallest forward change. Do not edit an adopted file to
   make the diff look cleaner.
4. Keep executable migration files and any generated ordering, snapshot, or
   journal metadata coherent. Commit generated metadata when the repository
   tracks it; do not hand-edit it to hide a mismatch.
5. Verify the complete chain on a fresh disposable target. For shared or live
   targets, verify the forward upgrade on the repository-approved safe branch
   or staging target before promotion. Use the repository's required test and
   migration harness; do not silently substitute a weaker check.
6. Report the classification, selected mode, files changed, checks run,
   targets intentionally untouched, and any remaining limitation.

## Safety boundaries

- Ask for explicit confirmation before overwriting or deleting migration files
  or generated metadata, removing migration history, or resetting/recreating a
  target. This skill does not grant destructive permission.
- Never rewrite a migration already adopted by shared development or
  production, and never run a destructive command against an unknown target.
- Keep secrets out of commands, logs, plans, commits, and review comments.
- If the repository's local rules conflict with this workflow, surface the
  conflict and resolve it with the owner before changing migration history.

## Completion checklist

- [ ] Target state is classified from current repository and read-only target
      evidence.
- [ ] Consolidation versus append-only mode is recorded and justified.
- [ ] Migration files and generated ordering/snapshot/journal metadata are
      coherent for the selected mode.
- [ ] The complete chain or forward upgrade was verified using the required
      repository harness.
- [ ] Any destructive realignment or intentionally untouched target is called
      out explicitly.
