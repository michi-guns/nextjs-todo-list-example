# T-26.11 release-failure Email evidence

The owner's instruction of 2026-09-24 authorizes this local review unit under
the [runtime plan](../plans/2026-09-19-t-26-runtime-safety-and-alerts.md) and
[T-26.11](../../../TODO.md#t-2611). No email was sent, no workflow was
dispatched and no GitHub Environment, Resend account or secret was used or
changed. Real delivery and receipt proof is T-26.14.

## Preflight

Clean `main` at `27e277d` (main CI passed) before creating
`codex/t-26.11-release-failure-email`. Node 24.18.0 and installed
dependencies were available; no new SDK, account or database was needed. The
release command already writes a safe record to
`$RUNNER_TEMP/production-release-record.json` for every outcome, including a
fallback preflight-failed record, and exits nonzero when the release fails.
The existing auth-mail Resend code requires the full Production app profile,
so the alert path reads its own three variables instead of reusing it.

## Delivered behavior

- `src/shared/operational-alerts/contracts.ts`: the safe `OperationalAlert`
  (kind, environment, repository, run id/attempt/URL, commit, stage),
  `NotificationPort.send(alert)`, `NotificationError` with fixed reasons and
  the attempt-stable `alertIdentity`.
- `src/shared/operational-alerts/resend-email.ts`: the Resend Email adapter.
  The payload and `Idempotency-Key` are fixed before the first request; up to
  three bounded attempts retry network errors, timeouts, `429` and `5xx`;
  other refusals and responses without an email id stop at once. Its config
  reader accepts only `RESEND_API_KEY`, `APP_MAIL_FROM` and
  `RELEASE_ALERT_EMAIL`, and never echoes them.
- `scripts/deploy/production/notify-core.ts`: trusted run identity from runner
  variables; the record is used only for this run and commit. Migration,
  deployment and smoke failures alert with their stage; success and
  preflight-only refusals send nothing; absent, invalid or foreign records
  alert with stage `unknown`. Delivery problems return a safe outcome.
- `scripts/deploy/production/notify.ts`: the runner command. It prints one
  line: accepted, not needed, or a `::error` annotation with the reason and
  exit code 1 for its own step only.
- The Production workflow gives the release step `id: release` and runs
  `Notify release failure` only when that step failed, before the record
  publication, with the key, sender and recipient secret only.
- [Operations runbook](../../runbooks/operations.md#release-failure-email),
  Production release and readiness guidance, environment ownership, context,
  SPEC and testing updates.

## Checks

| Command                                                                        | Result                                    |
| ------------------------------------------------------------------------------ | ----------------------------------------- |
| `pnpm exec vitest run src/shared/operational-alerts scripts/deploy/production` | 7 files, 90 tests passed                  |
| `pnpm test:pipeline`                                                           | 17 files, 269 tests passed                |
| `pnpm test`                                                                    | 69 files, 667 tests passed                |
| `pnpm typecheck`                                                               | Passed                                    |
| `pnpm lint`                                                                    | Passed; only the existing `Geist` warning |
| `pnpm build`                                                                   | Passed                                    |
| Changed-file Prettier, `git diff --check`                                      | Passed                                    |

No application route or runtime code changed, so the browser suite was not
rerun.

### Actual HTTP against a local collector

- One Email: bearer key, `release_failed/<repo>/<run>/<attempt>` key, sender,
  recipient, subject with stage and short commit, body with stage, full commit
  and run link; the key never appears in the body.
- `500`, a hanging request, `429`, then `200`: four requests with one identical
  body and one identical key.
- A second workflow attempt gets a different key.
- `422` stops after one request as `rejected`; a hanging provider fails as
  `timeout` after two bounded attempts; a `200` without an id is
  `invalid_response`; persistent `503` fails as `rejected` after three.
- Through the runner core: a deployment failure record produces the
  deployment Email; a missing record plus a `403` provider produces the
  `unknown`-stage request and a safe `rejected` outcome.
- No error, notice or output contains the key or recipient sentinels.

### Runner command and boundaries

The command, spawned with only runner variables, exits 0 without a provider
call for a preflight-only record, and exits 1 with exactly
`::error title=Release-failure alert not sent::not_configured` when the
recipient is invalid, without printing the key. A static test confirms the
four alert files import only `zod`, `node:` modules and each other: no app,
database or auth-mail module. The workflow static test pins the release step
id, the `failure() && steps.release.outcome == 'failure'` condition, the
three variables and the absence of database, Vercel, Neon and auth
credentials.

## Contract reconciliation

`TST-ALERTS-001` moves from `specified` to `partial`: the local release path
is verified. Native Better Stack uptime (T-26.12), Sentry group Email
(T-26.13) and real release-Email acceptance and receipt (T-26.14) remain.
`TST-RELEASE-001` and `TST-PIPELINE-001` tests pass unchanged apart from the
new notify step. The release step's failure, record and job result are not
altered by the notify step, which can only add its own failed step.

Limits: Resend keeps idempotency keys for 24 hours, so a same-attempt retry
after that can duplicate; nothing is sent if the runner never starts;
provider acceptance is not receipt.

**Operational consequence:** the `production` Environment needs a
`RELEASE_ALERT_EMAIL` secret. It is not provisioned; until it is, a failed
release reports `not_configured` in its notify step.

## Review

Pending a fresh exact-tip independent review before merge.
