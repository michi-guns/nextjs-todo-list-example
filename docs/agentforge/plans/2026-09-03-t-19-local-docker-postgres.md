# T-19 local Docker PostgreSQL implementation plan

> AgentForge plan. Use `task-breakdown` after this plan is accepted.

**Status:** Accepted

**Goal:** A contributor can start a persistent loopback PostgreSQL 18 container, migrate, seed safe local data, and run the app with hosted Sanity, without touching Neon or Vercel.

**Spec and decisions:** [Agent SPEC §11](../../.dwf/output/agent/SPEC.md#11-environment-and-delivery-contract); [TD-026](../../.dwf/decisions/TECHNICAL.md); [TST-ENV-001](../../.dwf/decisions/TESTING.md#tst-env-001), [TST-FOUNDATION-001](../../.dwf/decisions/TESTING.md#tst-foundation-001), [TST-HARNESS-001](../../.dwf/decisions/TESTING.md#tst-harness-001), [TST-MIGRATION-001](../../.dwf/decisions/TESTING.md#tst-migration-001); T-19 in [`TODO.md`](../../TODO.md); parent plan [`2026-08-31-t-18-environment-delivery-pipeline.md`](./2026-08-31-t-18-environment-delivery-pipeline.md).

**Architecture:** Add a repository-owned Compose file and a thin `scripts/local-postgres/` adapter. Lifecycle commands load the Local profile, refuse anything that is not the documented loopback Compose identity, then call the existing T-18.3 guards before migrate, seed, or reset. Testcontainers and Playwright keep their own disposable containers.

**Global constraints:** Bind the published port to `127.0.0.1` only. Do not require Neon or Vercel credentials. Do not print connection strings, passwords, or secrets. Do not redirect `pnpm test`, `pnpm test:integration`, or `pnpm test:e2e` onto this persistent database. Do not treat an arbitrary developer Postgres as disposable; reset only the Compose project after the URL matches the Compose identity and `assertLocalResetAllowed` sees harness ownership for that identity.

## Current state and file map

- `scripts/environment/` already parses Local profiles and guards mutation. No state-changing Local adapter exists yet.
- `src/test/postgres-harness.ts` owns disposable Testcontainers Postgres 18 and the committed migration SQL loader. Leave that path unchanged.
- `scripts/playwright-local/seed.ts` owns the browser-harness seed. Local synthetic seed is a separate, smaller dataset.
- README and the local runbook still describe a generic reachable Postgres rather than the Compose workflow.
- Planned ownership:
  - `scripts/local-postgres/compose.yaml`: persistent `postgres:18-alpine`, loopback publish, named volume.
  - `scripts/local-postgres/core.ts`: command sequencing, Compose identity, guard wiring, Docker/migrate/app runners.
  - `scripts/local-postgres/seed.ts`: one verified local demo user plus a small Inbox dataset.
  - `scripts/local-postgres/cli.ts`: `pnpm local:postgres -- <command>` and `pnpm dev:local`.
  - `scripts/local-postgres/core.test.ts`: Docker-free lifecycle tests.
  - README, local runbook, environment-profiles runbook, `TODO.md`, and `TESTING.md` evidence only.

## Dependencies and work order

1. PR template and delivery-protocol wording for a stakeholder-facing PR summary. Authorized with this task; keep it as its own commit.
2. Failing lifecycle tests for identity matching, remote refusal, and failure sequencing.
3. Compose file plus start/ready/stop against Docker.
4. Guarded migrate and seed adapters.
5. Guarded reset of the Compose volume only.
6. `pnpm dev:local` starts the database, migrates, then runs `next dev` without stopping Postgres on exit.
7. Documentation and `TST-*` evidence.

T-19 remains one delivery task in `TODO.md`. T-20 stays blocked on an owner-authorized durable Neon target.

## Verification strategy

- `TST-ENV-001`: unit tests prove Local commands refuse Neon/remote URLs and mismatched loopback identity before Docker or SQL mutation. Runtime evidence is a real Compose start/migrate/seed/stop on loopback. Hosted Neon/Vercel evidence stays later.
- `TST-FOUNDATION-001`: reuse the existing verified runtime; this task only adds the Local developer database seat.
- `TST-HARNESS-001`: confirm Testcontainers/Playwright still own their disposable URLs and are not pointed at Compose.
- `TST-MIGRATION-001`: local Compose migrate applies the committed chain. Neon remaining evidence stays blocked.
- Focused: `pnpm exec vitest run scripts/local-postgres/core.test.ts`.
- Gates: `pnpm test`, `pnpm test:integration`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, changed-file Prettier, `git diff --check`, plus a real local Compose lifecycle run. Browser smoke of `/` and sign-in against the local database when Docker and Sanity config are available.

## Risks and assumptions

- Postgres 18 official images store data under `/var/lib/postgresql`, not `/var/lib/postgresql/data`.
- Port `5432` on loopback matches the documented Local URL. If the port is taken, start fails clearly; do not silently pick another port.
- The Compose database is repository-owned local infrastructure. Reset may pass `ownership: "harness"` only after the profile URL matches this Compose identity, so a different local Postgres is not wiped.
- `dev:local` does not auto-seed. Seed stays an explicit command so reruns do not replace unexpected data by surprise.
- Docker is required for runtime verification. If the daemon is down, stop and report it.

## Handoff to task breakdown

T-19 already exists in `TODO.md` with acceptance criteria, files, contracts, and checks. Do not split it. Implement that task against this plan.
