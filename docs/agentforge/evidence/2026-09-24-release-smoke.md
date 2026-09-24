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
  ten-second timeout, a cold database or CMS gets two retries on
  `timeout`/`unreachable`, and failures carry only fixed vocabulary.
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
| `pnpm test:pipeline`                                               | 16 files, 251 tests passed                |
| `pnpm exec vitest run src/shared/environment src/test/environment` | 127 tests passed                          |
| `pnpm test`                                                        | 67 files, 638 tests passed                |
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
the bounded time after two attempts; a `307` is not followed. Secrets and the
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

Pending a fresh exact-tip independent review before merge.
