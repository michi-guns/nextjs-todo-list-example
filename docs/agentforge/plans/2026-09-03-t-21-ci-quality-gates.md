# T-21 automatic CI quality gates implementation plan

> AgentForge plan. Use `task-breakdown` after this plan is accepted.

**Status:** Accepted

**Goal:** Every push and pull request to `main` runs the repository quality gates on GitHub Actions without deploying, creating Preview branches, mutating Sanity, or using Production secrets.

**Spec and decisions:** [Agent SPEC §10.3, §10.7, §11](../../.dwf/output/agent/SPEC.md#103-playwright); [D-010](../../.dwf/decisions/PRODUCT.md#d-010); [TD-026](../../.dwf/decisions/TECHNICAL.md#td-026); [TST-PIPELINE-001](../../.dwf/decisions/TESTING.md#tst-pipeline-001), [TST-ENV-001](../../.dwf/decisions/TESTING.md#tst-env-001), [TST-FOUNDATION-001](../../.dwf/decisions/TESTING.md#tst-foundation-001), [TST-HARNESS-001](../../.dwf/decisions/TESTING.md#tst-harness-001), [TST-E2E-001](../../.dwf/decisions/TESTING.md#tst-e2e-001)–[TST-E2E-003](../../.dwf/decisions/TESTING.md#tst-e2e-003); T-21 in [`TODO.md`](../../TODO.md); parent plan [`2026-08-31-t-18-environment-delivery-pipeline.md`](./2026-08-31-t-18-environment-delivery-pipeline.md).

**Architecture:** Add one workflow at `.github/workflows/ci.yml`. It verifies the selected commit with the existing local commands. Integration and Playwright keep the T-14/T-15 disposable Testcontainers path. CI does not become a Preview or Production adapter.

**Global constraints:** Do not add `deploy-preview.yml` or `deploy-production.yml`. Do not call Vercel, Neon CLI, or Sanity write/revalidate endpoints. Do not read Production or hosted-development secrets. Do not set `TEST_DATABASE_URL` to a remote URL. Do not run `pnpm sanity:smoke`, `pnpm neon:performance`, or `pnpm test:e2e:cross-browser`. T-20 remains blocked on an owner-authorized durable Neon target, so this task stays disposable/local.

## Current state and file map

- `.github/` contains only the pull-request template. No workflow exists.
- `package.json` has no `packageManager` field. Local toolchain is Node.js 24.18.0 and pnpm 11.17.0.
- `src/test/postgres-harness.ts` and `e2e/global-setup.ts` already own disposable PostgreSQL 18 and the Playwright server lifecycle.
- `pnpm build` imports `lib/auth.ts` and `db/db.ts`, so a production build needs `DATABASE_URL`, `BETTER_AUTH_SECRET`, and the public Sanity project/dataset names even when it does not query those services.
- Planned ownership:
  - `.github/workflows/ci.yml`: the only automatic workflow.
  - `src/test/pipeline/ci-workflow.test.ts`: static trigger, permission, pin, and no-deploy contract tests.
  - `package.json`: `packageManager` so `pnpm/setup` can resolve the pnpm version.
  - README, `docs/runbooks/local-development-and-verification.md`, `docs/development/quality-gates.md`, `TODO.md`, and `TESTING.md` evidence only.

## Dependencies and work order

1. Failing static tests for the missing workflow contract.
2. SHA-pinned `ci.yml` with two jobs: `quality` (Docker-free) and `harness` (Testcontainers plus Chromium Playwright).
3. `packageManager` and compile-time placeholder environment for `pnpm build` / `drizzle-kit check`. If a clean production build tries to prerender the Sanity landing page, add `export const dynamic = "force-dynamic"` on `app/page.tsx` only. Do not set `PLAYWRIGHT_E2E` during `next build`.
4. Documentation and `TST-*` evidence. The pull request itself is the required real CI run.

T-21 remains one delivery task in `TODO.md`. T-20 stays blocked. T-22 stays blocked until T-20 and this CI evidence exist.

## Verification strategy

- `TST-PIPELINE-001`: local tests prove trigger, permission, concurrency, SHA pins, and the absence of deploy/secret/hosted side effects. Mark `partial` after a real GitHub Actions run on the task commit. Preview and Production orchestration stay later.
- `TST-ENV-001`: CI uses dummy loopback/placeholder values for compile-time only and never a Neon or Production URL. Hosted identity evidence stays later.
- `TST-FOUNDATION-001`, `TST-HARNESS-001`, `TST-E2E-001`–`TST-E2E-003`: the harness job runs the existing integration and Chromium Playwright commands against disposable local containers. Docker-outage observation remains unclaimed unless it happens.
- Focused: `pnpm exec vitest run src/test/pipeline/ci-workflow.test.ts`.
- Local gates: `pnpm test`, `pnpm test:integration`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm exec drizzle-kit check --config drizzle.config.ts`, changed-file Prettier, and `git diff --check`. Run `pnpm test:e2e` when Docker is available; if it is not, record that the GitHub Actions harness job is the remaining browser evidence rather than skipping the workflow step.
- Hosted: the open pull request must show a successful `CI` run. Syntax-only validation does not replace that run.

## Risks and assumptions

- GitHub-hosted `ubuntu-latest` provides Docker. Testcontainers can pull `postgres:18-alpine`. Playwright installs Chromium with OS deps on the runner, not through the Playwright Docker image, so Testcontainers can still use the host Docker daemon.
- `pnpm/setup@c9883cc79df532ad1a7b81bf9ab944ceb090d65c` (`v2.0.0`) is the current pnpm GitHub Actions recipe and installs Node.js, so this workflow does not also use `actions/setup-node`. Pin `actions/checkout` to `v6.1.0` (`d23441a48e516b6c34aea4fa41551a30e30af803`) to match current GitHub/Playwright CI docs rather than jumping to undocumented `v7`.
- Compile-time placeholders are not secrets and must not look like hosted credentials. Husky's `prepare` script is a no-op when GitHub sets `CI=true`.
- Artifact upload is limited to the Playwright HTML report on the harness job, with `actions: write` only on that job.

## Handoff to task breakdown

T-21 already exists in `TODO.md` with acceptance criteria, files, contracts, and checks. Do not split it. Implement that task against this plan.
