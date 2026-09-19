# Optional backend diagnostics implementation plan

**Status:** The owner accepted the small Strategy interface with Sentry and
Better Stack adapters on 2026-09-18 and requested this task definition.
Implementation and hosted operations need separate execution authorization.

**Goal:** Export selected backend logs and explicitly reported unexpected
errors to one optional diagnostics provider without coupling application code
to that provider.

**Spec and decisions:** [TD-030](../../../.dwf/decisions/TECHNICAL.md#td-030),
[Agent SPEC section 11.2](../../../.dwf/output/agent/SPEC.md#diagnostics-provider-adapters),
[TD-029 logger foundation](../../../.dwf/decisions/TECHNICAL.md#td-029),
[TST-DIAGNOSTICS-001](../../../.dwf/decisions/TESTING.md#tst-diagnostics-001),
[TST-DIAGNOSTICS-002](../../../.dwf/decisions/TESTING.md#tst-diagnostics-002), and
the [logger plan](2026-09-18-t-26-shared-logger.md).

**Architecture:** Extend the shared logger with independent local-output and
remote-export policy checks. A small Node-only diagnostics Strategy accepts
safe records, reports errors and flushes within a deadline. Startup selects
`none`, `sentry` or `better-stack` once per environment. One facade serves
application code; each selected adapter maps its safe records to supported
provider APIs.

Owner selection, 2026-09-19: [TD-033](../../../.dwf/decisions/TECHNICAL.md#td-033)
chooses Sentry Free initially for Production diagnostics and its native
new/regressed-group Email. Both adapters and startup selection remain required.
Native alert setup/evidence is delivered by T-26.13 in the separate
[runtime/alerts plan](2026-09-19-t-26-runtime-safety-and-alerts.md); it does not
add notification dispatch to this diagnostics Strategy or change T-26.4–T-26.7.

**Global constraints:** No provider changes while a process is running, dual
export, provider plugin system, browser instrumentation, replay, metrics,
tracing, profiling, uptime, alerts or health/readiness changes. Preserve
authentication, client errors and CLI result streams. This document neither
installs SDKs nor provisions accounts, edits runtime code or applies migrations.
T-27/T-28 and the remaining parent T-26 scope stay outside this delivery.

## Current state and file map

Inspected baseline `6c17b15` has the logger design but no logger implementation,
diagnostics SDK, provider settings or `instrumentation.ts`. The paths below
are proposed locations, not existing APIs.

| Existing or proposed files                                                                                          | Responsibility                                                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/shared/logging/config.ts`, `logger.ts`, `sanitize.ts`, settings cache/store and their future tests             | Extend the planned logger policy and safe projection; route before Pino filtering. Preserve its existing DB/cache boundary.                                |
| New `src/shared/diagnostics/contracts.ts`, `dispatcher.ts`, `runtime.ts` and colocated unit tests                   | Small typed Strategy, safe record routing, startup selection, failure containment and bounded lifecycle. Keep provider imports out of domain modules.      |
| New `src/shared/diagnostics/sentry.ts`, `better-stack.ts` and adapter tests                                         | Concrete supported SDK/HTTP mappings. Shared Sentry-compatible error transport helpers are allowed only where both adapters actually share behavior.       |
| Root `instrumentation.ts`; adopted route/action/server composition                                                  | Node-only startup and Next `onRequestError`; await bounded flush at owned completion boundaries. Do not add `instrumentation-client.ts`.                   |
| Existing list/task entry adapters, auth-mail, Sanity read/invalidation and `db/pool.ts`                             | Extend the logger adoption's existing reporting owners with explicit error reports. Keep pure `src/shared/error-contract.ts` mapping free of side effects. |
| Future `db/schema/logging.ts`, accepted TypeScript settings CLI and `src/test/logging-settings.integration.test.ts` | Versioned policy transition using the same environment-local snapshot; add a forward migration only if the stored representation requires it.              |
| `package.json`, generated lockfile, environment contract/example docs                                               | Authorized stable Node SDK dependency and startup-only server credentials. No `NEXT_PUBLIC_*` secrets or provider credentials in the settings row.         |
| New `docs/runbooks/diagnostics.md`; logger runbook and `docs/index.md` links                                        | Provider setup, destination controls, error ownership, privacy, lifecycle limits and separate local/hosted evidence.                                       |

The Node logger and SDK must remain absent from client bundles, including
`app/(app)/dashboard/error.tsx`. Use dynamic Node imports behind
`NEXT_RUNTIME === 'nodejs'` in instrumentation. Reuse the existing database
pool and logger composition; do not introduce a circular pool/runtime import.

## Routing and settings extension

SPEC section 11.2 owns the semantics. The proposed implementation keeps common
vetoes and adds two destination policies to the versioned settings snapshot.
Migrate legacy numeric thresholds to local output. Keep legacy module `off`
and named-event suppression as shared vetoes. Default diagnostics and explicit
error reporting to disabled, with log minimum `warn`; selecting a startup
provider alone never enables export.

| Control                                                               | Backend output            | Remote logs                        | Explicit error report                |
| --------------------------------------------------------------------- | ------------------------- | ---------------------------------- | ------------------------------------ |
| Shared global disabled, exact module `off`, or named event suppressed | Drop                      | Drop                               | Drop                                 |
| Console destination disabled or threshold excludes event              | Drop                      | Evaluate diagnostics independently | Evaluate report policy independently |
| Diagnostics destination disabled or startup provider `none`           | Evaluate console normally | Drop                               | Drop                                 |
| Diagnostics log threshold excludes event                              | Evaluate console normally | Drop                               | Unaffected by log threshold          |
| Diagnostics `errorReportsEnabled=false`                               | Evaluate console normally | Evaluate log policy normally       | Drop                                 |

Remote log thresholds have their own exact module overrides. This supports
console `debug` with remote `warn`, and console `error` with remote `info`,
without an upstream Pino threshold losing remote events. Compute destination
eligibility before lazy metadata construction. Each old contextual logger
consults the latest cache on every operation. Cache refresh, optimistic writes,
environment isolation and last-valid fallback remain owned by TD-029.

Separate `log(SafeLogEvent)` from `reportError(SafeErrorReport)` in the Strategy.
Method names are proposed, while the distinction is required. One failure may
produce a safe error-level log and one issue report. A log alone creates no
issue. Reporting uses shared vetoes, diagnostics enablement and the explicit
error-report control, independently of numeric log thresholds.

Use server-generated request/job correlation and a separate occurrence ID.
Grouping uses stable safe error class/code and source frame location where
available, never request IDs or arbitrary error text. Preserve useful locations
without local absolute paths, URLs/query strings, source text or captured
locals. Default arbitrary messages and causes to static safe descriptions.
No raw Error/request/session/provider object crosses the Strategy boundary.

Optional credentials and ingest hosts belong to startup environment validation.
Validate HTTPS provider endpoints from operator configuration, never a request.
Missing or invalid selected-provider configuration disables remote export and
emits at most a bounded safe local notice under local policy. It does not break
the app or silently select another provider. Other-provider credentials are
neither required nor used. A derived app choosing `none` needs no account.

## Adapter and lifecycle approach

Use an explicit adapter from the facade rather than native Pino or console
recapture. This keeps filtering, privacy and issue ownership before provider
capture. Sentry's Node log API supplies structured central logs; an explicit
safe event API supplies exceptions. Better Stack uses its HTTP log ingestion
and its documented Sentry-compatible error DSN. Sentry-compatible errors do
not establish compatibility with Sentry's Logs API.

Select supported stable SDK versions during implementation and verify their
public API/source first. Disable default integrations and unselected data
collection, auto exception capture, breadcrumbs, user/request enrichment,
metrics and tracing. Re-allowlist log/error payloads after SDK enrichment through
supported final-send hooks/transport APIs. Test the actual serialized wire
payload, including automatically attached fields, with sensitive sentinels.
Do not copy provider quick-start tracing or browser proxy examples.

Use only the small queue/deadline handling needed by these adapters. Proposed
initial bounds are 100 pending records, 16 KiB per safe record and one second
total flush time per request/job completion, including network I/O. These are
engineering defaults to validate against the selected APIs, not owner-mandated
constants. Define a deterministic overflow drop policy and bounded local-only
failure notices. Do not add disk persistence, application retries or a durable
delivery promise. Provider rate limiting, quota refusal and timeout must leave
the application result unchanged.

Recheck eligibility at the last supported point before transmission. Discard
unsent queued records disallowed by refreshed policy, including records buffered
inside an SDK. Prove that behavior through its supported transport/hooks; a
check only when records enter a queue is insufficient. Never patch SDK internals.
An implementation that cannot meet this must surface the concrete API conflict
before claiming compliance. Already in-flight data cannot be recalled.

Initialize one selected adapter per Node process, reuse it, await bounded
flush at adopted request/job boundaries and await asynchronous Next error-hook
work. A flush timeout must not leave unbounded active work. Do not rely on idle
timers before serverless freeze or call SDK `close` at the end of every request.
Concurrent flushes must stay bounded and preserve independent request context.
No live switch or dual-provider lifecycle is needed.

Application boundaries own caught-and-mapped unexpected failures and swallowed
integration failures. Next `onRequestError` owns unhandled server render/route
failures. Preserve report ownership across a rethrow, including Next's possible
transformed error and digest. Record a bounded occurrence identity rather than
treating a stable issue fingerprint as occurrence deduplication. Skip routine
401/404/409/422 outcomes and Next `redirect`/`notFound` control flow. Add no
reporting side effects to the client error component or a pure error mapper.

## Dependencies and work order

The review units are [T-26.4](../../../TODO.md#t-264),
[T-26.5](../../../TODO.md#t-265), [T-26.6](../../../TODO.md#t-266), and
[T-26.7](../../../TODO.md#t-267), sequential after the logger foundation.
All remain unchecked. Each code unit needs its own checks and fresh review.

| Prerequisite                                                                        | Classification and unblock condition                                                                                                                                                                      |
| ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Completed T-26.1 through T-26.3 and execution instruction                           | Required to implement diagnostics against the actual logger contracts. [TD-031](../../../.dwf/decisions/TECHNICAL.md#td-031) accepts the upstream TypeScript settings CLI; no editor choice remains open. |
| Installed dependencies, registry access and explicit SDK installation authorization | Required for T-26.5 implementation and checking real public APIs. No provider account is needed for local tests.                                                                                          |
| Available Docker/PostgreSQL 18 Testcontainers                                       | Required for T-26.4's real settings transition and cache integration evidence. Hosted databases cannot substitute.                                                                                        |
| Authorized non-default Neon branch and migration role, only if schema changes       | Required for the existing branch-first migration check. Append-only history and protected promotion remain unchanged.                                                                                     |
| Installed Chromium and the isolated Next.js test harness                            | Required for T-26.6 runtime/browser evidence, in addition to Docker and dependencies.                                                                                                                     |
| Owner-authorized provider test projects, credentials and target execution           | Required only for T-26.7 hosted evidence. No purchase, account creation or Production operation is authorized here. Missing access blocks that task, not the earlier local tasks.                         |

## Verification strategy

`TST-DIAGNOSTICS-001` covers routing, safe payloads, error ownership and local
lifecycle. `TST-DIAGNOSTICS-002` separates actual SDK wire compatibility from
hosted ingestion and issue grouping. Both start `specified`. Preserve existing
logger and boundary/auth/landing/environment evidence and rerun affected checks;
old evidence does not prove this extension.

- Unit tests cover the routing table, independent module thresholds, lazy
  metadata, legacy/cold policy, invalid startup configuration, `none` importing
  no provider SDK, stale contextual objects and local-only failure reporting.
- Real PostgreSQL tests cover upgraded snapshot validation, revision conflicts,
  two independent caches and destination toggles without provider identity
  changes. If a schema migration is needed, prove fresh-chain and prior-schema
  upgrade behavior plus the separately authorized branch-first check.
- Adapter tests use each real selected SDK/HTTP implementation with a local
  wire collector and supported configurable transport, without hosted secrets.
  Verify levels/times/context, sanitized exception frames/grouping fields,
  SDK-added metadata, disabled capture, queue overflow, delayed I/O, quota and
  auth failures, bounded flush and drop-on-policy-change. Provider protocol
  responses from a local collector do not prove a hosted product accepts them.
- Next Node runtime tests induce caught-and-mapped, unhandled render/route,
  rethrown and expected-control-flow failures. Check one issue per occurrence,
  generic responses, isolated correlation, boundary flush and no Node SDK in
  the browser bundle. Use a local capture transport and real facade, not a spy
  that bypasses SDK payload generation.
- Hosted evidence runs Sentry and Better Stack separately, with one selected
  provider per test process/deployment. For each, find correlated safe central
  logs and repeat one synthetic error in two requests to prove one issue with
  two occurrences; submit a distinct safe class/location to prove separation.
  Verify an error log alone creates no issue, destination off blocks future
  export after refresh, and the payload contains no sensitive sentinel data.
  Record commit, environment, provider configuration without secrets, time,
  expected/observed result and evidence link. Account for ingestion delay.

Exact local commands and expected evidence are listed in the TODO units.
This documentation delivery runs changed-file formatting, links, diff checks
and normal hooks/CI only. It supplies no diagnostics implementation evidence.

## Sources and evidence limits

Official sources reviewed on 2026-09-18 inform the proposed adapters:

- [Sentry Node logs](https://docs.sentry.io/platforms/javascript/guides/node/logs/)
  documents structured logger calls and `beforeSendLog`. Its
  [options](https://docs.sentry.io/platforms/javascript/guides/node/configuration/options/)
  describe disabling integrations and final payload filtering. Verify current
  data-collection options rather than copying deprecated `sendDefaultPii` flags.
- [Sentry Node APIs](https://docs.sentry.io/platforms/javascript/guides/node/configuration/apis/)
  distinguish bounded `flush` from `close`, which disables the client. This is
  API guidance, not an executed serverless delivery guarantee.
- [Sentry Pino integration](https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/integrations/pino/)
  has separate log and error capture settings. Native capture is deliberately
  not the initial adapter path because this design owns routing and privacy.
- [Better Stack Sentry SDK ingestion](https://betterstack.com/docs/errors/collecting-errors/sentry-sdk/)
  documents its error DSN. [HTTP log ingestion](https://betterstack.com/docs/logs/ingesting-data/http/logs/)
  is a separate authenticated endpoint. [Exception grouping](https://betterstack.com/docs/errors/using-the-product/exception-grouping/)
  uses exception details or an explicit fingerprint. Actual grouping still
  requires hosted evidence with the chosen SDK and sanitized data.
- [Better Stack Next.js guidance](https://betterstack.com/docs/logs/javascript/nextjs/)
  discusses flushing; its browser proxy and Web Vitals examples are outside
  this scope. Neither that integration nor its Pino worker transport is needed
  merely to send safe backend records.
- Installed Next.js 16.3.5 guides at
  `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/instrumentation.md`
  and `01-app/02-guides/instrumentation.md` define startup `register`, awaited
  asynchronous `onRequestError` and possible transformed errors/digests. The
  example's raw request object is unsafe for this project's export policy.

## Risks and assumptions

SDK enrichment and buffering may differ by version. Actual wire tests must
prove the selected hook/transport ordering and bounds. Sanitized frames may
reduce grouping detail; prove useful grouping on both hosted products before
advertising readiness. Runtime error transformation can break object-identity
deduplication, so test the real Next hook. Provider outage and serverless freeze
can lose diagnostic records; this scope promises bounded best-effort delivery.

## Handoff to task breakdown

The linked TODO units cover policy/routing, concrete adapters, backend adoption
and hosted verification. They are the sole delivery task list. Their completion
does not close the remaining parent T-26 hardening scope. This planning delivery
ends after independent review and integration without starting implementation.
