---
name: postgresql-migration-workflow
description: >-
  Create, review, consolidate, or apply this repository's Drizzle/PostgreSQL
  migrations after determining whether the migration history is scaffolding-only
  or already shared by real users and environments.
metadata:
  short-description: Choose safe or consolidating database migrations
---

# PostgreSQL migration workflow

Use this skill for changes to the root `db/` schema, `migrations/`, Drizzle
configuration, or migration application. Its first responsibility is to decide
whether migration history may be consolidated or must remain append-only. It
does not replace the repository's testing, Neon, source-verification, or
documentation skills.

## State gate: inspect before choosing a migration shape

Do not generate or edit migration SQL until the current state is evidenced.

1. Read the repository instructions and migration-specific design material:
   [`AGENTS.md`](../../../AGENTS.md), [`docs/data/postgresql.md`](../../../docs/data/postgresql.md),
   [`docs/runbooks/failed-database-migration.md`](../../../docs/runbooks/failed-database-migration.md),
   the relevant `.dwf/` SPEC and decision ledgers, and the applicable testing
   contracts.
2. Inspect the repository without exposing secrets: current branch and dirty
   paths, the active Drizzle schema/config, every tracked migration directory,
   and the migration metadata chain (`migrations/meta/_journal.json` when the
   configured Drizzle Kit version creates one, or each snapshot's `id` and
   `prevIds` links otherwise).
3. Inspect each relevant database or branch read-only. Determine which
   migrations are recorded as applied, whether any non-disposable data exists,
   and who relies on that target. Never print connection strings or credentials.
   Use the direct database connection for migration work and the repository's
   Neon/Testcontainers workflow for the relevant verification lane.
4. Classify the state using evidence, not a branch name alone:

   | State                  | Meaning                                                                                                                                          |
   | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
   | **Scaffolding-only**   | No production or stakeholder-used development environment; targets are fresh, agent-owned, ephemeral, or safely recreatable.                     |
   | **Shared development** | A development/staging target is relied on by collaborators or stakeholders, or contains data that cannot be discarded, even if it is not public. |
   | **Production**         | Real users or live data depend on the target.                                                                                                    |
   | **Unknown**            | Evidence conflicts or access is insufficient. Stop and ask rather than guessing.                                                                 |

Record the evidence and classification in the implementation plan or change
notes. A cloud database used only for migration smoke testing is not production
by itself; a shared target with zero rows is still shared if other people rely on
its history.

## Decision rule

| Evidence-backed state                                                             | Default action                                                                                                                                                             |
| --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Scaffolding-only, and the migrations exist only in disposable/agent-owned targets | Prefer one coherent initial migration. Consolidate unreleased changes in place, regenerate Drizzle metadata, and realign disposable databases after explicit confirmation. |
| Shared development or production, or any target with non-disposable data          | Keep applied history immutable. Generate a new forward migration, verify it on the required non-default branch first, then promote it according to the repository runbook. |
| Unknown or contradictory state                                                    | Do not rewrite or append on a guess. Resolve the environment status with the owner first.                                                                                  |

An existing migration being present in Git is not enough to make it immutable.
The deciding question is whether a shared or real-user target has adopted that
history. Conversely, an agent must not rewrite history merely because a target
has no rows if other people depend on it.

## Drizzle migration artifacts

- `migration.sql` is the executable database transition.
- `snapshot.json` is Drizzle Kit's generated representation of the schema state
  used to calculate later diffs. It contains schema metadata, not application
  rows or credentials. Commit it to Git alongside the SQL migration.
- `migrations/meta/_journal.json`, when present, records migration ordering and
  metadata. Some Drizzle Kit versions instead link snapshots with `id` and
  `prevIds`; keep whichever metadata format this repository uses coherent with
  the migration directories and commit it as well.

Generate snapshots with Drizzle Kit; do not keep them local-only or hand-edit
them to hide a mismatch. During an authorized scaffolding consolidation,
regenerate the snapshot and any journal/chain metadata from the final schema,
remove the obsolete migration directory, and review the complete diff. Do not
leave stale snapshot links or journal entries behind.

## Workflow

1. State the environment assumptions and migration mode (consolidation or
   append-only) before implementation.
2. Read the affected `TST-*` contracts and invoke
   [`testing-first-class`](../testing-first-class/SKILL.md) before behavior
   changes; chain [`test-driven-development`](../test-driven-development/SKILL.md)
   when executable tests or behavior change.
3. Keep the Drizzle schema, SQL, snapshot/chain metadata, and documentation aligned.
   For consolidation, make the final schema the source of truth and produce a
   clean migration chain that applies to an empty PostgreSQL database. For
   append-only work, preserve every applied migration and add only the smallest
   forward change.
4. Verify the full chain against the repository's disposable PostgreSQL/Testcontainers
   harness and run `pnpm exec drizzle-kit check` plus the focused integration
   tests. Use `drizzle-kit push` only for exploration; it is not migration
   verification.
5. For shared development or production paths, use the direct migration URL,
   verify on the required non-default Neon branch, inspect the resulting catalog,
   and only then promote the same reviewed files.
6. Report the state evidence, selected mode, exact checks, and any target that
   was intentionally not touched.

## Safety boundaries

- Ask for explicit confirmation before overwriting or deleting migration files,
  removing snapshot/journal entries, or resetting/recreating a database. This
  skill does not grant destructive permission.
- Never rewrite a migration already adopted by shared development or production.
- Do not silently substitute a weaker database or fake schema for a required
  migration check. If the required harness is unavailable, report the blocker.
- Keep secrets out of command output, plans, commits, and review comments.
- When this workflow conflicts with a canonical `.dwf/` requirement, surface the
  conflict and resolve it before changing the migration strategy.

## Completion checklist

- [ ] Environment classification is supported by current repository and
      read-only database evidence.
- [ ] Consolidation vs. append-only mode is recorded and justified.
- [ ] SQL, snapshot/chain metadata, schema, and docs are coherent.
- [ ] The complete migration chain applies successfully to the required local
      disposable database.
- [ ] Shared-target migration smoke was run when the state gate required it.
- [ ] Focused tests, `drizzle-kit check`, and repository quality gates pass.
- [ ] Any destructive realignment or intentionally unrun environment is called
      out explicitly.
