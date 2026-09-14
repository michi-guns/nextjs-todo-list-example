# T-22 Preview identity repairs implementation plan

> AgentForge plan. Use `task-breakdown` after this plan is accepted.

**Status:** Accepted

**Goal:** A requested Preview run refuses to touch Neon unless the Vercel
project already has a promoted Production deployment, deploys with an explicit
Preview target, and proves the returned deployment's project, target, commit
and Preview identity through a team-scoped API lookup before smoke runs.

**Spec and decisions:** [Agent SPEC delivery section](../../../.dwf/output/agent/SPEC.md),
[TD-026](../../../.dwf/decisions/TECHNICAL.md#td-026),
[TST-PREVIEW-001](../../../.dwf/decisions/TESTING.md#tst-preview-001),
[TST-PIPELINE-001](../../../.dwf/decisions/TESTING.md#tst-pipeline-001),
[TST-ENV-001](../../../.dwf/decisions/TESTING.md#tst-env-001), the parent
[T-22 plan](2026-09-03-t-22-preview-delivery.md) and the
[2026-09-09 attempt evidence](../evidence/2026-09-09-preview-attempt.md).

**Architecture:** Keep the existing `PreviewRuntime` seam in
`scripts/deploy/preview/core.ts`. Add one runtime step, `preflightDeploy`,
that runs after the exact-revision workspace guard and before any Neon
observe/create call. Replace the `vercel inspect` lookup in
`scripts/deploy/preview/vercel.ts` with the Vercel CLI's structured `--json`
deploy output plus a team-scoped REST lookup (`GET /v13/deployments/{id}?teamId=`)
that validates project, target, commit and Preview metadata. No new framework,
no provider abstraction; the Vercel CLI and REST API remain the only external
boundary and are injected for tests.

**Global constraints:** Vercel CLI 59.11.2 and Neon CLI 2.45.0 as pinned by the
workflow; free tiers only; the Production Vercel target is never a deploy
target of this tooling; Preview stays `workflow_dispatch` only; no
credentials or connection strings in logs, evidence or tests.

## Current state and file map

Owner-side prerequisites completed on 2026-09-14 (owner-authorized, run by the
agent): a deliberate placeholder Production deployment
`dpl_GRpcAgtr9BZ7QcsUNHX259WAvLin` now occupies the Vercel project's
Production slot (canonical origin `https://nextjs-todo-list-example.vercel.app`),
so further deployments are Previews; a separate Neon Production project
`jolly-dew-32309276` exists for T-23. The project record shows
`ssoProtection: null`, so Preview URLs are reachable by the HTTP smoke.

| Responsibility                                       | File                                                                                                                                                                                      | Planned change                                                                                                                        |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Command orchestration, guards, runtime seam          | `scripts/deploy/preview/core.ts`                                                                                                                                                          | Add `preflightDeploy` to `PreviewRuntime`; call it in `deploy` before `observeBranch`; default runtime delegates to `vercel.ts`       |
| Vercel CLI/API adapter                               | `scripts/deploy/preview/vercel.ts`                                                                                                                                                        | `preflightVercelProject`, `--json --target=preview` deploy parsing, `verifyPreviewDeployment` REST lookup, injected `run` and `fetch` |
| Orchestration tests with injected runtime            | `scripts/deploy/preview/core.test.ts`                                                                                                                                                     | Preflight ordering and refusal-before-Neon cases; extend `unusedRuntime()`                                                            |
| Adapter tests with fake CLI output and API responses | `scripts/deploy/preview/vercel.test.ts` (new)                                                                                                                                             | Preflight, deploy parsing, identity validation, redaction                                                                             |
| Workflow contract                                    | `.github/workflows/deploy-preview.yml`                                                                                                                                                    | No change beyond PR #30's pinned CLIs; test asserts the Vercel identity secrets are still supplied                                    |
| Runbook, README, environment docs                    | `docs/runbooks/preview-delivery.md`, `README.md`, `docs/architecture/environments.md`, `docs/runbooks/local-development-and-verification.md`, `docs/architecture/derived-applications.md` | Replace the stop condition with the resolution and the preflight contract                                                             |
| Evidence and ledger                                  | `docs/agentforge/evidence/2026-09-09-preview-attempt.md`, `.dwf/decisions/TESTING.md`, `TODO.md`, parent plan                                                                             | Record the 2026-09-14 resolution; statuses stay `partial` until a hosted run succeeds                                                 |

## Dependencies and work order

1. Merge `origin/main` into `task/T-22-hosted-preview-proof` (done, `7a6943f`).
2. Adapter tests first, then `vercel.ts` and `core.ts` changes.
3. Documentation, evidence and ledger reconciliation.
4. Independent review loop, push, PR #30 update.
5. Owner-authorized hosted run from the task branch ref, then evidence and
   status reconciliation. Not part of this slice's local completion.

## Verification strategy

- `pnpm exec vitest run scripts/deploy/preview/core.test.ts scripts/deploy/preview/vercel.test.ts src/test/pipeline/preview-workflow.test.ts`
- `pnpm test`, `pnpm typecheck`, `pnpm lint`, changed-file Prettier, `git diff --check`
- `TST-PREVIEW-001`, `TST-PIPELINE-001`, `TST-ENV-001` remain `partial`; the
  hosted run is the only evidence that can move `TST-PREVIEW-001`.

## Risks and assumptions

- The Vercel CLI prints its structured JSON to stdout under `--json` or a
  non-TTY stdout (verified in the installed 59.11.2 bundle); the adapter
  passes `--json` explicitly so the shape does not depend on the runner TTY.
- `--target=preview` is accepted by `parseTarget` in the installed CLI and
  is the documented explicit Preview target.
- The `preview` GitHub Environment's `VERCEL_ORG_ID` must be the team id
  (`team_…`); the preflight refuses any other shape before Neon is touched.
- Preview deployments have `target: null` in the API; validation therefore
  requires `target !== "production"` rather than an exact `"preview"` string.

## Handoff to task breakdown

One work package under the existing T-22 tracker entry: identity preflight
and validation with focused tests, documentation reconciliation, and the
review loop. The hosted run stays a separately authorized step.
