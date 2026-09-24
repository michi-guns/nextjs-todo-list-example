# T-26.5 diagnostics adapters evidence

The owner's instruction of 2026-09-24 authorizes this review unit and its SDK
installation under the [diagnostics plan](../plans/2026-09-18-t-26-diagnostics.md)
and [T-26.5](../../../TODO.md#t-265). Node startup wiring and application
adoption (T-26.6) and hosted provider proof (T-26.7) are outside this delivery.

## Preflight and SDK selection

Clean `main` at `e529897` (main CI passed) matched the remote before creating
`codex/t-26.5-diagnostics-adapters`. Registry access, Node 24.18.0 and pnpm
12.4.2 were available. No accounts, credentials or hosted services were used.

`@sentry/core` 11.0.0, the current stable release, is pinned exactly. Its
public `ServerRuntimeClient` (`@sentry/core/server`), `createTransport`, `Scope`
and `logger` exports were checked in the installed type definitions and source.
`@sentry/node` 11.0.0 was not chosen: its README states that it installs runtime
module hooks for automatic instrumentation, which the accepted design disables.
Better Stack's documentation was checked on 2026-09-24: HTTP log ingestion is
`POST` with `Authorization: Bearer`, a JSON array body, a `dt` timestamp and
`202` success; error ingestion accepts Sentry SDK events through an
`https://token@host/id` DSN. Error-DSN support is not treated as Logs API parity.

## Delivered behavior

- `sentry-client.ts` builds one private `ServerRuntimeClient` per process. It is
  never registered as the global client, uses a private scope, no integrations,
  static trace lifecycle, no client reports, no breadcrumbs and every
  `dataCollection` switch off. Errors are sent as explicitly constructed events
  from `SafeErrorReport` (static message, safe frames, fingerprint, safe tags,
  occurrence ID and flat cause facts); logs use the Sentry Logs API with
  explicitly projected attributes.
- `beforeSend` returns exactly the event this module constructed (looked up by
  event ID, at most 100 pending), because scope tags and fingerprints merge into
  events before that hook. `beforeSendLog` rebuilds log attributes from an
  allowlist. A gated transport is the last point before transmission: it
  rechecks current policy for every event and every buffered log, re-allowlists
  attributes added after `beforeSendLog`, drops other item types and the
  envelope `trace` header, and gives each log the trace ID of its own request
  correlation (or a fresh random ID). A marker names the facade's own log
  attributes, so scope attributes merged after `beforeSendLog` cannot add or
  replace an allowlisted key. Pending requests are limited to ten; an awaited
  flush that reaches its deadline aborts every in-flight request, with a
  one-second per-request fallback. Overflow and rate-limit drops raise one
  bounded local notice.
- `better-stack.ts` sends logs to HTTP ingestion only at an awaited flush, keeps
  at most 100 pending records (dropping newer ones with one local notice),
  rechecks policy before sending, and reports errors through the shared
  Sentry-compatible client using the Better Stack DSN.
- `adapters.ts` exposes lazy factories; only the startup-selected provider's
  module is imported. Adapter failures surface as bounded local notices.
- The Sentry path also sends outside an awaited flush: error events leave at
  capture, and the SDK flushes its log buffer on its own unref'd five-second
  idle timer or when the buffer fills. Every such send passes the same gated
  transport, and delivery never depends on it. The "no timers" statement
  applies to Better Stack's HTTP log path only.

## Checks

| Command                                                                          | Result                                    |
| -------------------------------------------------------------------------------- | ----------------------------------------- |
| `pnpm exec vitest run src/shared/diagnostics` (three consecutive runs)           | 5 files, 53 tests passed each run         |
| `pnpm exec vitest run src/shared/logging src/shared/diagnostics scripts/logging` | 130 tests passed                          |
| `pnpm test`                                                                      | 56 files, 550 tests passed                |
| `pnpm typecheck`                                                                 | Passed                                    |
| `pnpm lint`                                                                      | Passed; only the existing `Geist` warning |
| `pnpm build`                                                                     | Passed                                    |
| Changed-file Prettier, `git diff --check`                                        | Passed                                    |

The wire tests run a real HTTP collector on `127.0.0.1`. Sentinels are placed
in the global and isolation scopes (user, tags, extras, breadcrumbs, a
fingerprint and attributes, including allowlisted tag and attribute keys), in
error messages and causes, and in console output; none appears in any request
body, tag, fingerprint or log `trace_id`. The collector's responses
exercise `401`, `402`, `403`, `406`, `413`, `429`, `500` and hanging requests.
Local collector responses do not prove that hosted Sentry or Better Stack
accept these payloads, that Better Stack accepts the Sentry envelope endpoint,
or how either groups issues.

## Contract reconciliation

`TST-DIAGNOSTICS-002` becomes `partial`: the local actual-SDK and HTTP wire
evidence is complete for both adapters. Hosted ingestion, searchable logs and
issue grouping on each real provider remain T-26.7 and cannot be inferred from
the local collector. `TST-DIAGNOSTICS-001` gains payload re-allowlisting after
SDK enrichment and send-time drops of SDK-buffered records; boundary ownership,
Next error transformation and runtime flush remain T-26.6.

## Review

A fresh Claude Opus 5.5 reviewer (xhigh effort requested) reviewed `458d74f`,
confirmed the public SDK surface, the absence of tracing, the post-enrichment
allowlists and failure containment, and found no blockers. Two should-fix
items were addressed with regression tests: every Sentry log shared one
process-wide `trace_id`, and re-allowlisting of scope attributes merged after
`beforeSendLog` was unproven (an allowlisted key set on a global scope could
pass when the log lacked it). The nits were also applied: the flush deadline
now aborts in-flight requests, event items are re-allowlisted in the transport
with string tag checks, SDK-side drops raise a notice, background sends are
documented and two test names were corrected.

A second fresh reviewer of `48a386b` confirmed the marker and abort logic and
the timing tests (12 runs under load), and found two remaining enrichment
paths with real-SDK probes: a scope `correlation_id` could become a log's
`trace_id`, and scope tags and fingerprints merged into error events before
`beforeSend`, affecting both providers' error path. The trace ID is now taken
only from the filtered own attributes and must be 32 hex characters, and
`beforeSend` returns the constructed event itself; regression tests cover
both. The final tip receives its own fresh review before merge.
