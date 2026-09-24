# T-26.10 release smoke evidence

The owner's instruction of 2026-09-24 authorizes this local review unit under
the [runtime plan](../plans/2026-09-19-t-26-runtime-safety-and-alerts.md) and
[T-26.10](../../../TODO.md#t-2610). No workflow was dispatched and no provider
credential, deployment or GitHub Environment was used or changed. Deployed
proof is T-26.12.

## Preflight

Clean `main` at `196809b` (main CI passed) before creating
`codex/t-26.10-release-smoke`. Node 24.18.0, Docker 29.7.2, Chromium and
installed dependencies were available. The Production adapter already observed
the direct Neon endpoint host and verified deployment metadata and the
canonical alias; the Preview adapter observed the temporary branch URLs and
forwarded `DATABASE_URL_UNPOOLED` to the deployment although the app never
needs it.

## Delivered behavior

- `scripts/deploy/health-smoke.ts`: one bounded smoke shared by both adapters.
  It checks `/api/health/app` first and requires its `release` to equal the
  resolved commit, then the protected database and CMS probes with the
  environment's secret header. Redirects are not followed, each request has a
  ten-second timeout covering the body, any component gets two retries on a
  transport failure (network error or timeout) and the dependencies also on
  a `503 timeout`/`unreachable`; a wrong answer is never retried, and failures
  carry only fixed vocabulary.
  `readHealthProbeSecret` applies the app's 32-256 printable-character rule.
- **Production:** the runtime refuses to start without a valid
  `HEALTH_PROBE_SECRET`; `deploy` now receives the observation and forwards
  `APP_RELEASE_SHA`, the observed `DATABASE_ENDPOINT_HOST` and the secret at
  build and runtime; `smoke` runs the health smoke on the canonical origin
  after the alias and HTTP checks and before the Sanity read. The workflow
  passes the secret only to the protected release step.
- **Preview:** `deploy` refuses before any ref, branch or deployment work
  without a valid secret; the deployment receives the same identity and no
  longer receives the migration URL; `smokePreview` adds the health smoke on
  the exact deployment origin. The workflow passes the secret from the
  `preview` Environment, and the Preview seed applies the endpoint too.
- The runtime gate from T-26.8 now requires `DATABASE_ENDPOINT_HOST` for
  Preview and Production, since delivery always supplies it.
- Runbooks: operations, environment profiles, Production release, Preview
  delivery and Production readiness.

## Checks

| Command                                                            | Result                                    |
| ------------------------------------------------------------------ | ----------------------------------------- |
| `pnpm test:pipeline`                                               | 16 files, 254 tests passed                |
| `pnpm exec vitest run src/shared/environment src/test/environment` | 127 tests passed                          |
| `pnpm test`                                                        | 67 files, 641 tests passed                |
| `pnpm test:integration`                                            | 9 files, 37 tests passed                  |
| `pnpm test:e2e`, with and without the Sanity variables             | 9 Chromium tests passed each time         |
| `pnpm typecheck`                                                   | Passed                                    |
| `pnpm lint`                                                        | Passed; only the existing `Geist` warning |
| `pnpm build`                                                       | Passed                                    |
| Changed-file Prettier, `git diff --check`                          | Passed                                    |

### Controlled HTTP smoke

`scripts/deploy/health-smoke.test.ts` runs the smoke against a real loopback
HTTP deployment: the valid release passes and only dependency probes receive
the secret; a different or `unknown` release fails at `app` before any
dependency request; `401`, `503 monitor_unconfigured`, `503 query_failed` and
a non-JSON 200 fail with their fixed reason; a CMS answering `timeout` twice
passes on the third attempt; a hanging database fails as `unreachable` within
the bounded time after two attempts; a hanging identity request is retried
while a wrong release is not; a body that stops mid-read is a retryable
transport failure, not an invalid response, and so is a connection reset
mid-body; a `307` is not followed. Secrets and the
host never appear in errors. `scripts/deploy/preview/smoke.test.ts` runs the
whole Preview smoke over HTTP for the right and a wrong release.

### Adapter and workflow tests

Production: exact forwarded values appear once for build and once for
runtime; the canonical-origin probes run in order with the secret header; a
wrong release fails before the Sanity command; a missing or short secret is
refused before any network access; the release record marks a failed smoke
without the reason text. Preview: the forwarded identity is present twice,
the migration URL is absent, a missing or short secret stops `deploy` before
ref resolution or branch creation, and deploy/smoke receive the secret and
commit. Both workflow static tests require the Environment secret, and the
Production test keeps it out of steps before the release consumer.

## Contract reconciliation

`TST-RUNTIME-001` stays `partial`: configuration, health and delivery-smoke
local portions are verified; authorized deployed evidence is T-26.12.
`TST-PIPELINE-001`, `TST-PREVIEW-001`, `TST-RELEASE-001` and `TST-ENV-001`
tests were rerun and pass.

**Operational consequence:** the next Preview or Production run needs a
`HEALTH_PROBE_SECRET` in the `preview`/`production` GitHub Environment. It is
not provisioned; this task changed no hosted configuration.

## Review

The first independent review (read-only, against `4127531`) approved: it
confirmed the alias-then-origin order, Preview's disabled SSO protection, the
endpoint host rule for real Neon hosts, that no other gate importer lacks the
endpoint, secret handling in errors, records and logs, and a real Node 24
`redirect: "error"` refusal. Its optional nits were taken:

- a single transport failure on `/api/health/app` no longer fails a release
  that is already live; identity requests retry like dependencies, but a
  wrong release still fails at once;
- a timeout while reading the body is a retryable transport failure rather
  than `invalid_response`;
- `HEALTH_PROBE_SECRET=` joins the Preview log redaction list;
- a stale TESTING follow-up line and stray test blank lines were corrected.

The unit, pipeline, typecheck and lint checks were rerun after these changes.
A confirmation review approved them and noted that a connection reset
mid-body was still classified as an invalid response; the body read now
treats only a JSON syntax error as invalid, with a regression test that fails
on the previous code. A fresh exact-tip review confirmed this before merge.
