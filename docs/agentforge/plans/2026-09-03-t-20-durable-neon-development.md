# T-20 durable Neon Development target implementation plan

> AgentForge plan. Use `task-breakdown` after this plan is accepted.

**Status:** Completed

**Goal:** A developer can run the local Next.js process against one durable, non-expiring Neon `development` branch, migrate through the direct endpoint, seed only synthetic non-production data, and inspect the target without secrets.

**Spec and decisions:** [Agent SPEC §11](../../.dwf/output/agent/SPEC.md#11-environment-and-delivery-contract); [TD-025](../../.dwf/decisions/TECHNICAL.md#td-025); [TD-026](../../.dwf/decisions/TECHNICAL.md#td-026); [TST-MIGRATION-001](../../.dwf/decisions/TESTING.md#tst-migration-001), [TST-ENV-001](../../.dwf/decisions/TESTING.md#tst-env-001), [TST-FOUNDATION-001](../../.dwf/decisions/TESTING.md#tst-foundation-001), [TST-PERSISTENCE-001](../../.dwf/decisions/TESTING.md#tst-persistence-001), [TST-PERFORMANCE-001](../../.dwf/decisions/TESTING.md#tst-performance-001); T-20 in [`TODO.md`](../../TODO.md); parent plan [`2026-08-31-t-18-environment-delivery-pipeline.md`](./2026-08-31-t-18-environment-delivery-pipeline.md).

**Architecture:** Add a thin `scripts/neon-development/` adapter that observes the Neon CLI identity, calls the existing T-18.3 guards, then migrates and seeds. Provision one durable non-default branch named `development` from the existing project default `main`. Do not introduce a provider-swapping framework.

**Global constraints:** Do not reset, rewrite, or promote Neon `main`. Do not set `--expires-at`. Do not print connection strings, passwords, or secrets. Do not write `.env.local`. Do not protect the branch (`--protected` is paid-plan only). Do not provision Production. Do not enable Preview workflows.

## Current state and file map

- Project `curly-dust-60603928` (`nextjs-todo-list-example`) is the owner-authenticated starter project. The temporary T-01 `development` branch expired on 2026-09-02 and no longer exists.
- Default branch `main` (`br-plain-block-axskh5gq`) is archived and idle. Read-only catalog inspection shows only the scaffold migration hash `ae215741…` (matches `migrations/20260807190126_silly_vivisector/migration.sql`) plus `users`/`account`/`session`/`verification`/`posts_table`. Lists/tasks and the second committed migration are absent.
- Migration-history classification: `main` has adopted the scaffold only. Git already contains the forward `lists-tasks-schema` migration. T-20 applies that existing forward chain on a fresh non-default branch. No migration files are rewritten.
- `scripts/environment/` already parses Development profiles and refuses `DATABASE_BRANCH=main`. No state-changing Development adapter exists yet.
- `scripts/verify-neon-performance/` already requires branch name `development` and a CLI-observed direct host. Leave that path in place.
- Planned ownership:
  - `scripts/neon-development/constants.ts`: expected project id `curly-dust-60603928`, branch `development`, parent `main`.
  - `scripts/neon-development/core.ts`: command parsing, CLI identity observation, expiry refusal, guard wiring.
  - `scripts/neon-development/seed.ts`: ordinary and behavior synthetic seeds that replace only prefixed development users.
  - `scripts/neon-development/cli.ts`: `pnpm neon:development -- <command>`.
  - `scripts/neon-development/core.test.ts`: CLI-free unit tests.
  - Redacted hosted evidence under `docs/agentforge/evidence/`.
  - README, environment-profiles runbook, local runbook, `TODO.md`, and `TESTING.md` evidence only.

## Dependencies and work order

1. Failing tests for command parsing, expected identity, expiry/main/pooled-migration refusal, and seed-mode parsing.
2. CLI identity observer using `neon branches get --output json` and `neon connection-string` with `--pooled` / default direct. Normalize missing Neon ports to `5432` before the existing guards, which require an explicit port.
3. `provision`: create `development` from `main` with `--no-secrets` and no `--expires-at` when missing; succeed when a durable matching branch already exists; refuse an expiring branch, a default-branch target, or a different project.
4. Guarded `inspect` and `migrate` (`drizzle-kit migrate` through `DATABASE_URL_UNPOOLED`).
5. Guarded `seed --mode ordinary|behavior|performance`. Ordinary and behavior stay in this adapter. Performance reuses `pnpm neon:performance` after identity checks.
6. Hosted provision, migrate, ordinary seed, redacted inspect evidence. Do not mutate `main`.
7. Documentation and `TST-*` evidence.

T-20 remains one delivery task in `TODO.md`. T-21.5, T-22, and T-23 stay blocked on their named owner prerequisites.

## Verification strategy

- `TST-MIGRATION-001`: apply the committed chain to the new non-default `development` branch through the direct URL. Catalog must expose lists/tasks native UUID keys after migrate. Neon `main` stays on the scaffold only. Status can move from `blocked` to `partial` or `verified` only for the development-branch smoke this task actually runs.
- `TST-ENV-001`: unit tests prove Development commands refuse `main`, expiry, project mismatch, and pooled migration URLs before CLI mutation. Hosted inspect proves CLI-observed project/branch/host correlation. Production mail and Preview remain later.
- `TST-FOUNDATION-001` / `TST-PERSISTENCE-001`: reuse existing verified runtime; this task only adds the Development target seat and hosted schema smoke.
- `TST-PERFORMANCE-001`: keep the existing T-16 command; do not treat a skipped performance rerun as a regression if compute is inactive. Record whether `pnpm neon:performance` ran.
- Focused: `pnpm exec vitest run scripts/neon-development/core.test.ts`.
- Gates: `pnpm test`, `pnpm test:integration`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, changed-file Prettier, `git diff --check`. Hosted: provision, inspect, migrate, ordinary seed against the authorized branch.

## Risks and assumptions

- Creating `development` from archived `main` unarchives the parent automatically ([branch archiving](https://neon.com/docs/guides/branch-archiving)). That is not a schema change to `main`.
- Neon CLI `branches create` omits `--expires-at` so the branch never expires ([CLI branches](https://neon.com/docs/reference/cli-branches)). `--protected` is skipped because it is paid-plan only.
- CLI connection strings often omit the port. The adapter adds `:5432` for guard correlation; operator `.env.local` Development URLs must include explicit port and database path.
- Seed never issues `DROP`/`TRUNCATE` of shared tables. It replaces only synthetic development users (`dev-*@example.test` and the existing T-16 performance prefixes).
- `.env.local` is operator-owned. Inspect prints redacted names and the env keys to set, not values.
- The user request to implement the next `TODO.md` task is the owner authorization to create this durable non-default branch in the existing project.

## Handoff to task breakdown

T-20 already exists in `TODO.md` with acceptance criteria, files, contracts, and checks. Do not split it. Implement that task against this plan.
