# T-22 manual Vercel Preview delivery implementation plan

> AgentForge plan. Use `task-breakdown` after this plan is accepted.

**Status:** Accepted

**Goal:** An operator can request one exact-ref Preview that creates an isolated, expiring Neon branch from durable Development, migrates and seeds a controlled verified account, deploys that SHA to Vercel Preview, smokes authentication/list-task/landing, and cleans up only the matching preview.

**Spec and decisions:** [Agent SPEC §11](../../.dwf/output/agent/SPEC.md#11-environment-and-delivery-contract); [TD-026](../../.dwf/decisions/TECHNICAL.md#td-026); [TST-PREVIEW-001](../../.dwf/decisions/TESTING.md#tst-preview-001), [TST-PIPELINE-001](../../.dwf/decisions/TESTING.md#tst-pipeline-001), [TST-ENV-001](../../.dwf/decisions/TESTING.md#tst-env-001), [TST-AUTH-001](../../.dwf/decisions/TESTING.md#tst-auth-001)–[TST-AUTH-003](../../.dwf/decisions/TESTING.md#tst-auth-003), [TST-LANDING-002](../../.dwf/decisions/TESTING.md#tst-landing-002); T-22 in [`TODO.md`](../../TODO.md); parent plan [`2026-08-31-t-18-environment-delivery-pipeline.md`](./2026-08-31-t-18-environment-delivery-pipeline.md).

**Architecture:** Add a thin `scripts/deploy/preview/` adapter that reuses `parseDeliveryArguments`, the T-18.3 Preview guards, and the T-20 Neon CLI observation style. One GitHub `workflow_dispatch` workflow calls that adapter. Do not introduce a provider-swapping framework, automatic PR deploys, or Production mail.

**Global constraints:** Do not trigger on `push` or `pull_request`. Do not read Production secrets. Do not mutate Neon `main`, durable `development`, or Production. Do not copy personal Development records. Do not enable the local mailbox. Do not send arbitrary Preview mail. Do not fall back to the Sanity `production` dataset. Do not print connection strings, tokens, passwords, or mailbox contents. T-21.5 and T-23 stay out of scope.

## 2026-09-05 exact-revision amendment

The reusable-foundation review found that the local adapter resolved `--ref` but still ran migration, seed, and Vercel commands from the current working tree. Recording the SHA as deployment metadata did not bind those inputs to that revision.

Keep the local command fail-closed. After resolving `--ref`, inspect the current Git `HEAD` and porcelain status before observing or creating a Preview branch. Continue only when `HEAD` equals the resolved SHA and the working tree has no tracked or untracked changes. Otherwise report a safe workspace-mismatch error and invoke no Neon, migration, seed, deployment, or smoke operation. This also preserves the workflow path because `actions/checkout` selects the requested ref before invoking the adapter.

Focused tests must cover a requested revision that differs from `HEAD`, local changes at the selected revision, and the exact clean revision. The first two cases must prove that no mutation boundary is called. This local evidence strengthens `TST-PIPELINE-001` and `TST-PREVIEW-001` but does not replace the controlled hosted lifecycle required by T-22 and T-24.

## Current state and file map

- `scripts/environment/core.ts` already parses Preview profiles (`APP_MAIL_TRANSPORT=controlled-account`, dataset `preview`, non-loopback HTTPS origin) and `parseDeliveryArguments({ command: "preview", ref, previewId })`. Mutable aliases `main`/`master`/`latest`/`head` are rejected.
- `scripts/environment/guards.ts` already implements `assertPreviewDeploymentAllowed`, `assertPreviewCleanupAllowed`, `assertMigrationAllowed`, and `assertSeedReplacementAllowed`. The adapter must supply a provider-created Preview identity whose `previewId` equals the requested id and whose project/branch match the selected Neon branch.
- `scripts/deploy/preview/core.ts` resolves the requested ref, but migration, seed, and deployment still consume the current working tree. It must inspect and reject a different or dirty checkout before branch observation or creation.
- `scripts/neon-development/` owns durable `development` (`curly-dust-60603928` / `development`). Preview branches parent from that branch, never from `main`.
- `.github/workflows/ci.yml` is the only automatic workflow. `src/test/pipeline/ci-workflow.test.ts` forbids Vercel/Neon/secrets in that file only.
- `lib/auth.ts` always calls `captureMagicLink`, which throws when the local mailbox is disabled. Preview sign-in with `sendOnSignIn: true` would fail without a Preview no-op mail path.
- No Vercel project, GitHub Environment, or `preview` Sanity dataset is recorded in the repository.
- Planned ownership:
  - `scripts/deploy/preview/constants.ts`: project id reuse from T-20, branch prefix `preview-`, parent `development`, 7-day expiry, synthetic seed user.
  - `scripts/deploy/preview/core.ts`: command parsing, SHA resolution, Neon branch lifecycle, guard wiring, redacted evidence.
  - `scripts/deploy/preview/seed.ts`: one verified `preview-user@example.test` plus a small Inbox; no mailbox.
  - `scripts/deploy/preview/smoke.ts`: HTTP landing, password sign-in, list/task mutation.
  - `scripts/deploy/preview/cli.ts`: `pnpm preview -- deploy|cleanup|inspect`.
  - `scripts/deploy/preview/core.test.ts`: CLI-free unit tests with an injected runtime.
  - `.github/workflows/deploy-preview.yml`: manual `workflow_dispatch` only, GitHub Environment `preview`.
  - `src/test/pipeline/preview-workflow.test.ts`: static trigger, permission, pin, and no-automatic-deploy tests.
  - `lib/auth.ts`: Preview-only mail no-op so the controlled account can sign in without outbound mail.
  - README, environment-profiles runbook, `TODO.md`, `TESTING.md`, and redacted hosted evidence under `docs/agentforge/evidence/` only when a real run happens.

## Dependencies and work order

1. Failing tests for command parsing, SHA resolution, exact clean workspace acceptance, different-checkout refusal, local-edit refusal, branch naming `preview-<preview-id>`, parent/expiry/main refusal, Preview-id mismatch, Production/Development target refusal, and redacted inspect output.
2. Injected runtime for Neon observe/create/delete, migrate, seed, Vercel deploy, and HTTP smoke. Default runtime shells out to `neon` and `vercel` the same way T-20 shells out to `neon`.
3. `deploy`: resolve `--ref` to one 40-character SHA; require a clean working tree whose `HEAD` is that SHA before any provider or database mutation; create `preview-<id>` from `development` with `--expires-at` 7 days ahead (RFC 3339, second precision); observe pooled/direct URLs; call `assertPreviewDeploymentAllowed` then migrate through the direct URL; seed the controlled account; deploy that SHA to Vercel Preview with Preview-scoped env; run HTTP smoke; print redacted URL/deployment id/branch id/expiry/SHA.
4. Preview auth: when `APP_ENV=preview`, `sendVerificationEmail` and `sendMagicLink` return without writing the local mailbox or sending remote mail. Seed creates the user through Better Auth sign-up, then sets `users.email_verified = true` through SQL. Do not add a Production mail provider.
5. BETTER_AUTH_URL: set to the Vercel deployment origin. If the origin is known only after the first CLI deploy, pass `https://${VERCEL_URL}` as a Preview-only runtime fallback in `lib/auth.ts` and record the observed URL in evidence. Do not use that fallback for Local, Development, or Production.
6. `cleanup`: observe the named Preview branch, call `assertPreviewCleanupAllowed`, delete only that Neon branch, and leave Development/Production untouched. Cleanup of a missing matching branch is a safe no-op after identity checks. Do not delete a differently named preview.
7. `.github/workflows/deploy-preview.yml`: `workflow_dispatch` inputs `ref`, `preview-id`, and `action` (`deploy` | `cleanup`). Environment `preview`. Default permissions `contents: read`. SHA-pin `actions/checkout` and `pnpm/setup` to the T-21 pins. No `push`/`pull_request`. No Production secrets. Outputs: url, deployment id, branch id, expiry, SHA, redacted smoke.
8. Hosted preflight before any real mutation: Neon CLI against project `curly-dust-60603928` / branch `development`; Vercel project/token; GitHub Environment `preview` secrets; Sanity dataset `preview` on the dedicated project. If any item is missing, keep `TST-PREVIEW-001` `specified` or `partial` and do not invent a target.
9. Documentation and `TST-*` evidence.

T-22 remains one delivery task in `TODO.md`. Do not split it. Do not start T-21.5, T-23, or T-24.

## Verification strategy

- `TST-PREVIEW-001`: local tests prove orchestration, isolation, refusal, and cleanup identity. Mark `partial` after a real disposable Neon/Vercel/browser-or-HTTP smoke when the owner-authorized resources exist. Mark `blocked` with the named missing resource if preflight fails. Local tests never claim a deployed Preview.
- `TST-PIPELINE-001`: orchestration tests prove that a different or dirty checkout stops before provider and database mutation. Static workflow tests prove manual dispatch, least-privilege permissions, SHA pins, Environment `preview`, and the absence of automatic PR/push deploy. Hosted lifecycle evidence stays this task's controlled run, not CI.
- `TST-ENV-001`: Preview commands refuse `main`, durable `development` as the mutation target, Production profiles, pooled migration URLs, and local-mailbox settings before mutation. Hosted identity evidence is the CLI-observed project/branch/host correlation from the controlled run.
- `TST-AUTH-001`–`TST-AUTH-003`: HTTP smoke signs in the pre-seeded verified password account. Do not mark remote mail verified. Magic-link/sign-up on Preview remain outside this contract until T-27.
- `TST-LANDING-002`: HTTP GET of `/` against the Preview origin when the `preview` dataset exists. Do not claim `TST-LANDING-003` webhook delivery.
- Focused: `pnpm exec vitest run scripts/deploy/preview/core.test.ts src/test/pipeline/preview-workflow.test.ts`.
- Gates: `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, changed-file Prettier, `git diff --check`. Run `pnpm test:integration` when Docker is available.
- Hosted: one controlled `deploy` then `cleanup` from a known SHA when preflight passes. Record redacted evidence. Never use Production as a test target.

## Risks and assumptions

- The user request to implement the next `TODO.md` task authorizes the T-22 adapter and workflow. It does not create Vercel/GitHub/Sanity resources. A hosted run proceeds only after preflight finds those resources.
- Preview branches are normal Neon branches from durable `development` with `--expires-at`, not schema-only and not from `main`. Neon refuses children of expiring parents; `development` has no expiry.
- Branch names are `preview-<preview-id>`. `preview-id` already matches `PREVIEW_ID_PATTERN` (`^[A-Za-z0-9][A-Za-z0-9._-]*$`).
- Seed replaces only the synthetic Preview user (`preview-user@example.test`). It never `TRUNCATE`s shared tables or copies Development personal rows.
- Vercel Git integration, if connected, can still auto-deploy PRs. This repository's workflow must not add PR triggers; operators must disable or ignore Vercel Git auto-deploy in the project settings. That dashboard setting is not encoded in git.
- `vercel deploy` without `--prod` creates a Preview deployment ([Deploying from the CLI](https://vercel.com/docs/cli/deploy)). Per-deployment env must include the branch-specific `DATABASE_URL` values; stored Vercel Preview env cannot be the source of the Neon URL.
- GitHub Actions Environment `preview` holds `NEON_API_KEY`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, and the Preview `BETTER_AUTH_SECRET`. The workflow must not reference Production Environment secrets.
- The Sanity `preview` dataset is an owner-provisioned prerequisite. If it is missing, landing smoke stays blocked; do not retarget `production`.

## Handoff to task breakdown

T-22 already exists in `TODO.md` with acceptance criteria, files, contracts, and checks. Do not split it. Implement that task against this plan.
