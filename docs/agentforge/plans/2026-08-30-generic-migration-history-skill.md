# Generic migration-history skill implementation plan

> AgentForge plan. This plan is accepted for the migration-skill review follow-up; `task-breakdown` reconciles its delivery metadata before implementation.

**Status:** Completed

**Goal:** Replace the repository-coupled PostgreSQL migration skill with a reusable migration-history policy, while keeping project-specific database mechanics in project documentation and preserving compatibility for existing skill links.

**Spec and decisions:** The reusable-foundation contract in [Agent PRD](../../.dwf/output/agent/PRD.md#1-product-purpose-and-reuse-contract), [Agent SPEC starter architecture principles](../../.dwf/output/agent/SPEC.md#14-starter-architecture-principles), [RULE-010](../../.dwf/RULES.md#rule-010), and the accepted migration-history policy in [TD-025](../../.dwf/decisions/TECHNICAL.md#td-025). The skill is an agent workflow artifact, not a change to the product or database schema.

**Architecture:** Make `migration-history-workflow` the canonical, database-agnostic AgentForge skill. It owns one decision: classify the target state and choose consolidation/in-place editing for unreleased disposable history or append-only migrations for shared/production history. Keep generated-artifact alignment, safety confirmation, and evidence/reporting generic. Move PostgreSQL/Drizzle/Neon/Testcontainers commands and repository contract references to `docs/data/postgresql.md`. Retain the old `postgresql-migration-workflow` paths as explicit compatibility aliases that point to the new canonical skill, avoiding a destructive deletion while existing links age out.

**Global constraints:** Do not change application code, database migrations, schemas, dependencies, or test contracts. Do not weaken the accepted TD-025 state gate. Do not copy DWF or testing-ledger requirements into the reusable skill. Keep the Claude Code files as thin bridges. Add only a concise generic-artifact/reuse principle to `AGENTS.md`; do not turn it into a broad abstraction mandate.

## Current state and file map

- `.agents/skills/postgresql-migration-workflow/SKILL.md` currently combines a repository-specific state gate with Drizzle, PostgreSQL, Neon, Testcontainers, `.dwf`, and `TST-*` instructions.
- `.agents/skills/using-agent-skills/SKILL.md` routes migration work to the PostgreSQL-specific name.
- `.claude/skills/postgresql-migration-workflow/SKILL.md` is a Claude bridge to the old canonical path.
- `docs/data/postgresql.md` owns project-specific PostgreSQL/Drizzle migration mechanics and links to the old skill name.
- `TODO.md` contains the T-04 recommended skill reference.
- `AGENTS.md` already requires reusable foundations but does not state the generic-artifact principle explicitly.

Planned ownership after the change:

- `.agents/skills/migration-history-workflow/SKILL.md`: reusable policy and workflow only.
- `.claude/skills/migration-history-workflow/SKILL.md`: thin Claude bridge to the canonical skill.
- The old `.agents/skills/postgresql-migration-workflow/SKILL.md` and `.claude/skills/postgresql-migration-workflow/SKILL.md`: compatibility aliases with deprecation text and a link to the generic skill.
- `.agents/skills/using-agent-skills/SKILL.md`, `docs/data/postgresql.md`, and `TODO.md`: canonical name and link updates.
- `AGENTS.md`: one concise rule explaining generic/reusable artifacts with a clarity/no-overengineering boundary.

## Dependencies and work order

1. Validate the clean branch, current references, and the existing skill-file format (complete during preflight).
2. Add the generic canonical skill and its Claude bridge; convert the old PostgreSQL paths to compatibility aliases.
3. Update the AgentForge router, PostgreSQL supporting documentation, T-04 delivery reference, and `AGENTS.md`.
4. Search for stale canonical references, validate all skill front matter/bridge paths, run repository documentation and quality checks, review the diff, commit, push, and update PR #6.

The work is sequential because the canonical name must exist before aliases and references can be verified. No database, Docker, Neon, or Testcontainers prerequisite is required for this prose-only change.

## Verification strategy

- Validate the new canonical skill, both compatibility aliases, both Claude bridges, and the router with the available skill front-matter validator.
- Use `rg` to confirm the generic skill contains no repository-specific `.dwf`, `TST-*`, PostgreSQL, Drizzle, Neon, or Testcontainers coupling, and that active references resolve to `migration-history-workflow`.
- Run `git diff --check` and inspect the complete diff for scope, link, and wording errors.
- Run `pnpm test`, `pnpm typecheck`, and `pnpm lint` as proportionate repository gates; no `TST-*` contract is affected because application behavior and test obligations are unchanged.
- Review the PR body and changed-file scope after pushing. No database migration or runtime verification is required for this documentation/skill-only amendment.

## Risks and assumptions

- Keeping compatibility aliases means the old name remains discoverable temporarily; the alias will not contain the old policy and will clearly identify the new canonical skill.
- Some external consumers may deep-link to the old path. The alias preserves those links while making the generic skill the router/documentation default.
- “Generic” must not erase useful safety. The canonical skill will still require evidence-backed state classification, explicit confirmation for destructive history changes, and honest uncertainty handling, expressed without repository or database vendor assumptions.
- The accepted project policy remains PostgreSQL/Drizzle-specific where needed in `docs/data/postgresql.md` and DWF; only the reusable decision workflow is generalized.

## Handoff to task breakdown

Create one focused delivery task for the skill refactor and policy guidance, with these verifiable slices: (a) add the generic canonical skill and Claude bridge, (b) convert old paths to compatibility aliases, (c) update router/project references and `AGENTS.md`, and (d) validate links, skill format, prose scope, and repository gates. No application tests or database artifacts are in scope.
