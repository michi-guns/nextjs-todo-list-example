# Optional backend diagnostics

The backend can export safe logs and grouped error reports to one provider:
Sentry or Better Stack. It is off unless an environment selects a provider at
startup and the shared logging policy enables export. Browser errors, tracing,
metrics, replay and uptime are outside this feature; operational alerts have
their own contract in [SPEC section 11.3](../../.dwf/output/agent/SPEC.md#operational-alerts).

Canonical rules: [SPEC section 11.2](../../.dwf/output/agent/SPEC.md#diagnostics-provider-adapters),
[TD-030](../../.dwf/decisions/TECHNICAL.md#td-030) and
[`TST-DIAGNOSTICS-001`/`002`](../../.dwf/decisions/TESTING.md#tst-diagnostics-001).
The [logging runbook](logging.md) owns the facade, events and policy CLI.

## How a failure travels

1. A request enters an adopted boundary (`runLoggedOperation`, `loggedHandler`).
   It gets a server-generated correlation ID.
2. An unexpected failure is mapped to the generic client error. Its owning
   boundary writes one safe `error` log and one explicit issue report, then
   marks the error object as reported.
3. Expected refusals (validation, auth, not found, conflict) and Next
   `redirect`/`notFound` control flow create no issue.
4. If the error is rethrown to Next, `instrumentation.ts` `onRequestError`
   sees the same object and skips it. A failure no boundary owned is reported
   there as `next.<render|route|action|proxy>.failed`.
5. Before the response completes, the boundary awaits a flush bounded to one
   second. A hanging provider is aborted at that deadline; the response and
   the original error are unchanged.

Each report carries the error class, a classified kind/code, a static message,
repository-relative frame locations and up to three cause facts. Messages,
stack text, request data, headers, cookies, users and personal content never
leave the process. Issues group by module, event, class and code/kind (plus the
first in-app source frame when stacks are not bundled chunks). Occurrence and
correlation IDs never affect grouping. Under Next's bundled output the frame
slot is `no-frame`, so each boundary event forms one issue per error kind.

## Select a provider

Set these server-only variables in the environment's secure configuration.
They are never policy fields, arguments or `NEXT_PUBLIC_*` values.

```dotenv
# none (default), sentry or better-stack
DIAGNOSTICS_PROVIDER=sentry
SENTRY_DSN=https://<public-key>@<ingest-host>/<project-id>

# or
DIAGNOSTICS_PROVIDER=better-stack
BETTER_STACK_ERRORS_DSN=https://<application-token>@<ingest-host>/<application-id>
BETTER_STACK_LOGS_URL=https://<logs-ingesting-host>
BETTER_STACK_LOGS_TOKEN=<source-token>
```

- Selection happens once per Node server instance in `register`. Changing the
  provider needs a restart or redeployment; there is no live switching or
  dual export.
- Missing or invalid configuration for the selected provider disables export
  with one local `diagnostics.config_invalid` warning. It never falls back to
  the other provider. `none` loads no provider code.
- Endpoints must be HTTPS. Plain HTTP is accepted only for a loopback collector
  with `APP_ENV=local`, which the local wire tests use.
- `VERCEL_GIT_COMMIT_SHA`, when present and hexadecimal, becomes the release.
- Sentry receives structured logs through its Logs API and errors as explicit
  events. Better Stack receives logs through its HTTP ingestion and errors
  through its Sentry-compatible DSN; that DSN does not imply Logs API support.

These variables are not yet wired into the Preview/Production delivery
adapters. Hosted use, and provider project setup, belong to T-26.7 under its
own authorization.

## Turn export on and off

Selecting a provider alone exports nothing. Publish a policy revision through
the protected CLI in the [logging runbook](logging.md#inspect-and-change-policy):

```json
"diagnostics": {
  "enabled": true,
  "minimumLevel": "warn",
  "moduleLevels": {},
  "errorReportsEnabled": true
}
```

- `diagnostics.enabled=false` stops remote logs and reports; console output is
  unaffected. `errorReportsEnabled=false` keeps remote logs but stops issues.
- Global `enabled=false`, `disabledModules` and `suppressedEvents` stop both
  destinations, including reports.
- Instances adopt a change at their next request after the 30-second refresh
  window. Unsent records that the new policy disallows are dropped; data
  already in flight cannot be recalled.

## Diagnose

| Local event                        | Meaning                                                            | Check                                                  |
| ---------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------ |
| `diagnostics.config_invalid`       | Selected provider's configuration is missing or invalid            | Variable names, HTTPS, DSN shape; restart after fixing |
| `diagnostics.provider_unavailable` | Adapter failed to start                                            | Deployment logs around startup; configuration          |
| `diagnostics.export_failed`        | Provider refused or failed a send (auth, quota, 413, 5xx, network) | Provider status, credentials, quota                    |
| `diagnostics.flush_timeout`        | A completion flush reached its one-second deadline                 | Provider latency; records may be lost                  |
| `diagnostics.record_dropped`       | Overflow, rate-limit backoff or an oversized record                | Volume and provider rate limits                        |

Each notice appears at most once per five minutes per kind, only in local
output, and never re-exports. Delivery is best effort: there is no disk spool,
retry framework or durable queue, and a frozen serverless instance can lose
unsent records.

## Evidence and limits

- [T-26.4 routing evidence](../agentforge/evidence/2026-09-24-diagnostics-routing.md),
  [T-26.5 adapter wire evidence](../agentforge/evidence/2026-09-24-diagnostics-adapters.md)
  and [T-26.6 runtime evidence](../agentforge/evidence/2026-09-24-diagnostics-adoption.md)
  are local. A local collector proves payload shape and behavior, not that
  a hosted product accepts, searches or groups the data.
- Hosted proof for each provider is T-26.7. Sentry Free is the initial
  Production choice under [TD-033](../../.dwf/decisions/TECHNICAL.md#td-033);
  its native alert Email is T-26.13.
