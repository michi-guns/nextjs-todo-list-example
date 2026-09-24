# Runtime operations: health endpoints

The application exposes three provider-neutral health endpoints so an uptime
monitor or a release smoke can tell _which_ part is down. Canonical rules:
[SPEC section 11.4](../../.dwf/output/agent/SPEC.md#runtime-health-safety),
[TD-035](../../.dwf/decisions/TECHNICAL.md#td-035) and
[`TST-RUNTIME-001`](../../.dwf/decisions/TESTING.md#tst-runtime-001).
Runtime configuration refusal is described in the
[environment runbook](environment-profiles.md#runtime-validation).

## Endpoints

| Path                   | Answers                                                      | Access                        |
| ---------------------- | ------------------------------------------------------------ | ----------------------------- |
| `/api/health/app`      | This runtime can answer; no dependency is touched            | Public                        |
| `/api/health/database` | Read-only `SELECT 1` through the application's existing pool | Monitor secret in remote envs |
| `/api/health/cms`      | Fresh read and validation of the published landing singleton | Monitor secret in remote envs |

Every response is `no-store` JSON with a fixed vocabulary:

```json
{
  "component": "database",
  "status": "unavailable",
  "code": "timeout",
  "release": "<40-hex SHA>"
}
```

| HTTP | `status`            | `code`                                                      |
| ---- | ------------------- | ----------------------------------------------------------- |
| 200  | `ok`                | none                                                        |
| 503  | `unavailable`       | `timeout`, `unreachable`, `query_failed`, `invalid_content` |
| 503  | `unavailable`       | `monitor_unconfigured`: remote env without a monitor secret |
| 401  | `refused`           | `unauthorized`: missing or wrong secret header              |
| 404  | `unknown_component` | none; the requested path is not echoed                      |

Bodies never contain target URLs, hosts, credentials or raw errors. A CMS
failure never marks the database unavailable, and the reverse.

## Configuration

```dotenv
# Server-only, 32-256 printable characters; one value per environment.
HEALTH_PROBE_SECRET=<random secret>
# Resolved deployment SHA; the delivery adapters supply it.
APP_RELEASE_SHA=<40-hex commit SHA>
```

- Monitors send the secret in the `x-health-secret` header, never in the URL
  or query. The comparison is constant-time.
- Remote environments are `APP_ENV=preview|production` or any Vercel process.
  There, a missing or weak secret leaves the dependency probes answering
  `503 monitor_unconfigured`; it never counts as readiness and never blocks
  application startup.
- Local, Development and unprofiled processes leave the probes open unless a
  secret is configured.
- `release` is `APP_RELEASE_SHA`, else `VERCEL_GIT_COMMIT_SHA`. A remote
  process with neither reports `unknown`; a local one reports `unreleased`.

The Preview and Production delivery adapters forward the environment's
`HEALTH_PROBE_SECRET`, `APP_RELEASE_SHA` and the observed
`DATABASE_ENDPOINT_HOST` to the deployment, and refuse to start without a
valid secret. Their smoke then calls all three endpoints on the exact
deployment and fails on a wrong release, a refusal or unavailable
dependencies (a cold database or CMS gets two retries). Provisioning the
secret in a real monitor is T-26.12 and needs its own authorization.

## Bounds

- Each probe has a three-second budget and runs at most once at a time per
  instance; concurrent callers share the in-flight result instead of queueing.
  A failing answer may add up to one second of bounded log flush when a
  diagnostics provider is active, so give monitors a timeout above four
  seconds.
- **Database:** acquisition and query share the deadline. The statement runs
  as `BEGIN READ ONLY; SET LOCAL statement_timeout = …; SELECT 1; COMMIT`, so
  the server ends slow work itself. A timed-out or failed connection is
  destroyed, not returned to the pool. If the pool is saturated, a late
  connection is released as soon as it arrives, and later probes answer
  `timeout` immediately until it has.
- **CMS:** the query bypasses the CDN, the indefinite `landing-content` cache
  and Draft Mode (`perspective=published`), and the deadline aborts the HTTP
  request itself.
- The route skips the logging-settings refresh, so liveness never waits on the
  database.

## Troubleshooting

| Symptom                         | Meaning and check                                                                                                                  |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `app` fails                     | The runtime itself is down or refused its configuration; see deployment logs                                                       |
| `database` `unreachable`        | Connection refused, DNS or authentication; check the environment's database target and status                                      |
| `database` `timeout`            | Pool saturated, slow database, a network black hole or a sleeping compute still waking; check load, connectivity and compute state |
| `database` `query_failed`       | Connected but the read-only statement failed; check database health                                                                |
| `cms` `unreachable` / `timeout` | Sanity API outage or network; the application may still serve cached landing content                                               |
| `cms` `invalid_content`         | The published landing singleton is missing or invalid; fix it in Studio                                                            |
| `503 monitor_unconfigured`      | Set `HEALTH_PROBE_SECRET` for that environment and redeploy                                                                        |
| `401 unauthorized`              | The monitor's `x-health-secret` does not match the environment's secret                                                            |

Each dependency failure also writes one `warn` log
(`health.database.unavailable` or `health.cms.unavailable`) with a fixed
outcome: to the console, and to the diagnostics provider's logs when policy
allows, flushed before the response. It never creates an issue: the uptime
monitor owns alerting.

## Release-failure Email

When the protected Production release step fails, the workflow's
`Notify release failure` step runs
`pnpm exec tsx scripts/deploy/production/notify.ts`. It uses the reusable
`NotificationPort` (`src/shared/operational-alerts/contracts.ts`) and its Resend
Email adapter (`resend-email.ts`). It needs no application, database or auth
mail, so it works during a total outage as long as the GitHub runner runs.

| Release record                                                    | Email                                                     |
| ----------------------------------------------------------------- | --------------------------------------------------------- |
| This run and commit, failed in migration/deployment/smoke         | One Email naming that stage                               |
| This run and commit, failed only in preflight                     | None: nothing changed; the run's failure is enough        |
| Missing, invalid, or another run's/commit's record                | One Email with stage `unknown`, from trusted run metadata |
| Succeeded, skipped or unapproved run, or a later artifact failure | None: the step does not run                               |

Configuration lives only in the protected step's environment:
`RESEND_API_KEY` and `APP_MAIL_FROM` (the existing Production sender) and the
`RELEASE_ALERT_EMAIL` recipient secret. None is ever an argument or a record
field.

- The idempotency key is `release_failed/<repository>/<run id>/<run attempt>`,
  and the payload is fixed before the first request. Rerunning the same
  attempt reuses both; re-running the workflow is a new attempt and a new
  Email. Resend keeps keys for 24 hours only, so a retry after that window can
  deliver a duplicate. There are no reminders and no incident state.
- Each request has a ten-second timeout; up to three attempts retry network
  errors, timeouts, `429` and `5xx`. Other refusals stop at once.
- If the Email cannot be handed to Resend, the step fails with one safe
  annotation (`Release-failure alert not sent: <reason>`, for example
  `not_configured`, `rejected`, `timeout`). The release step's failure, its
  record and the job result are unchanged.
- Provider acceptance is not mailbox receipt, and nothing is sent when the
  runner itself never starts. Native uptime and Sentry Email do not use this
  port. Real delivery and receipt proof is T-26.14.
