# Shared backend logger implementation plan

**Status:** The owner accepted the logger direction and requested this task
definition on 2026-09-18. Implementation is not authorized by this document.
The settings-management interface below is proposed pending [OD-026](../../../.dwf/decisions/OPEN-DECISIONS.md#od-026).

**Goal:** Diagnose meaningful backend operations and failures through one small
Pino-backed logger whose shared filters can change without redeploying.

**Spec and decisions:** [TD-029](../../../.dwf/decisions/TECHNICAL.md#td-029),
[Agent SPEC](../../../.dwf/output/agent/SPEC.md#shared-backend-logging),
[TD-025 migration policy](../../../.dwf/decisions/TECHNICAL.md#td-025),
[TD-026 environment isolation](../../../.dwf/decisions/TECHNICAL.md#td-026), and
[testing ledger](../../../.dwf/decisions/TESTING.md#tst-logging-001).

**Architecture:** A server-only facade creates small contextual logger objects.
It reads the current in-memory policy, filters and sanitizes an event, then
passes it to Pino. A separate settings adapter reads the selected environment's
existing PostgreSQL database through Drizzle. Request/job boundaries refresh
the cache; emitting a log never queries the database.

**Global constraints:** Keep domain code, generic client errors, authentication
behavior and existing CLI result streams unchanged. No logging-provider
framework, external store, browser logger, admin role/UI, public settings route,
metrics, tracing, alerts, health endpoint or startup-target hardening. Those
remaining T-26 concerns are not approved by this logger slice. T-27/T-28 remain
outside scope. No packages, application code, migrations or hosted settings
are changed while defining these tasks.

## Current state and file map

The source inspected at `2ca1c6a` has these boundaries. New paths below are
planned locations, not claims that a module or command already exists.

| Existing or proposed files                                                                                                                                  | Responsibility in the implementation                                                                                                                                                        |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| New `src/shared/logging/config.ts`, `logger.ts`, `context.ts`, `sanitize.ts`, `pino-writer.ts` and colocated unit tests                                     | Validated filters, contextual facade, isolated Node request/job context, safe event projection and Pino output. Keep the core independent of database imports.                              |
| New `src/shared/logging/settings-store.ts`, `settings-cache.ts`, `runtime.ts`; `db/schema/logging.ts`, `db/schema/index.ts` and new forward migration       | One versioned settings snapshot in the selected application database, bounded refresh and composition using the existing pool. Do not create another connection pool or persist log events. |
| `src/shared/entry-contract.ts`; `src/modules/lists/presentation/list-routes.ts`, `list-actions.ts`; equivalent `tasks` files                                | Report caught unexpected failures once before existing generic response mapping. Expected refusals retain their status/body and are not server-error events.                                |
| `app/actions/lists.ts`, `app/actions/tasks.ts`, relevant `app/api/` route composition; server dashboard/landing read entry points                           | Establish request context and invoke stale-settings refresh around adopted backend operations. Do not put side effects in the pure error mapper.                                            |
| `src/modules/auth/infrastructure/auth-mail.ts`; `app/api/auth/[...all]/route.ts` and `lib/auth.ts` only for necessary context wiring                        | Mail delivery outcomes, duration and safe failure classification. Preserve Better Auth callbacks, responses and token/session behavior.                                                     |
| `src/modules/landing/infrastructure/sanity-landing-reader.ts`, `sanity-landing-source.ts`, `sanity-invalidation.ts`; webhook/recovery presentation boundary | Published-read and invalidation outcomes without CMS content, secrets or raw provider payloads. Preserve cache/revalidation behavior.                                                       |
| `db/pool.ts`                                                                                                                                                | Replace the existing raw idle-client error report with a sanitized event. Pool construction and lifecycle stay unchanged.                                                                   |
| Proposed `scripts/logging/cli.ts`, `core.ts`, tests and one `package.json` command                                                                          | Protected operator settings inspection/update, subject to OD-026. Do not rewrite deployment or environment CLI logging.                                                                     |
| `package.json`, generated `pnpm-lock.yaml`                                                                                                                  | Add compatible stable Pino and local-only formatting support when implementation/install is authorized. Pino is not a direct dependency today.                                              |
| New `docs/runbooks/logging.md`, links in `docs/index.md`, stack/data docs and existing testing ledger                                                       | Usage, event catalogue, config changes, failure diagnosis, freshness limits and evidence. Documentation must distinguish implemented local behavior from hosted proof.                      |

Keep Node/Pino imports out of client bundles, including
`app/(app)/dashboard/error.tsx`, and out of mixed shared barrels used by clients.
Compose the settings adapter after the database boundary exists. In particular,
`db/pool.ts` may use the database-free logger core but must not import a runtime
singleton that imports `db/db.ts` back again.

## Policy and operational behavior

The following concrete defaults refine the accepted direction for later
implementation. The SPEC remains the semantic authority.

- Use a validated full snapshot with `schemaVersion`, monotonic `revision`,
  `enabled`, `minimumLevel`, exact `moduleLevels` and exact `suppressedEvents`.
  Levels use Pino's ordered `trace`, `debug`, `info`, `warn`, `error`, `fatal`;
  a module override may also be `off`. Reject unknown levels, malformed names,
  oversized collections and invalid versions without partially applying data.
- Apply filters in this order: global disabled, named event suppression,
  module `off`, then the module threshold if present or the global threshold.
  An exact module override replaces the default threshold, so deliberate
  module debugging works without enabling debug everywhere. Avoid wildcard
  matching or a category inheritance tree for this slice.
- Cold start uses enabled logging at `info`, no overrides or suppressions and
  strict sanitization. Missing settings, a missing table during rollout,
  malformed data or an unavailable database keep these defaults or the last
  valid snapshot. Defaults are not written back automatically. Deleting a
  settings row must not be the reset procedure; publish an explicit defaults
  snapshot with a new revision.
- Use one singleton row per database with an atomic, optimistic revision check
  for updates. Runtime code only reads it. Validate on both write and read.
  Operator inspection reports the persisted revision; it does not claim that
  every instance has already adopted it. Two environments never share a row
  through a hardcoded Production connection.
- Proposed cache timing: 30 seconds between refresh attempts, with a one-second
  total connection/query budget. This bounds normal per-instance load while
  allowing an operator change to take effect promptly. These are engineering
  defaults, not an interval dictated by the owner. Pin them as tested constants
  after checking the real pool adapter supports the total deadline.
- At the first adopted request/job boundary after expiry, await a bounded
  refresh before the operation. Concurrent callers share one in-flight refresh.
  Long-lived requests/jobs check at safe work checkpoints at most 30 seconds
  apart while executing. A single blocking operation is not interrupted; name
  that limit in the runbook. With a reachable database, active instances adopt
  changes at the next eligible entry/checkpoint plus the one-second query
  budget. Idle serverless instances check on their next invocation, without a
  background timer guarantee. Existing logger objects consult current policy
  on each emit; off does not disable the boundary's refresh mechanism.
- Timeouts must release/cancel database work appropriately, not just race a
  promise and leave overlapping queries alive. Schedule the next eligible
  attempt after success or failure, and prevent a late result from replacing a
  newer revision. Retain valid settings through an outage even beyond the normal
  freshness bound, including a previously disabled configuration.
- Refresh failure never invokes the refresh path recursively. If emitting a
  settings-failure diagnostic, use the current in-memory policy, a safe fixed
  event and bounded repetition. Global off still applies. Serialization,
  formatting or output failures cannot fail business work or mask its error.

Request context uses Node async-context isolation or explicit immutable context,
not a mutable process-wide request field. Generate a server-owned correlation ID
at adopted entries and propagate it internally through the operation. Do not use
a caller-supplied ID as that trusted identity. Keep static operation names
instead of URL queries, resource identifiers or personal data.
Background pool errors receive an independent correlation ID and must not
inherit an unrelated request. Metadata cannot overwrite event, level, time,
module, environment or correlation fields. Avoid constructing expensive debug
metadata until all applicable filters pass.

Sanitization projects selected metadata into an allowlist and limits string
length, depth and collection size before serialization. Treat error messages,
causes and stacks as untrusted strings. Default to safe classifications/codes
and static descriptions; omit arbitrary text rather than claiming a few regexes
can sanitize it. Include only deliberately sanitized diagnostic detail with
tests proving credentials, URLs, tokens, email addresses, task text and provider
bodies cannot escape, including nested causes, cyclic objects and custom
serializers/getters. Pino key-path redaction is additional protection, not the
primary guarantee. No raw `Error`, request, response, session or message object
is passed to Pino's default serializers.

## Initial adoption and output

Choose one reporting owner for a propagated failure and retain correlation
through wrappers. A provider failure plus its mapped entry failure must not
produce two unexpected-error reports for the same failed operation. Verify
both caught-and-mapped and rethrown paths; do not rely solely on a framework
uncaught-error hook.

| Boundary                                                     | Initial event policy                                                                                                                                                                          |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| List/task JSON and Server Action operations, dashboard reads | Unexpected failure at `error`; optional completed-operation detail at `debug`. Routine 401/404/409/422 outcomes are not unexpected errors. Preserve response contracts.                       |
| Auth mail                                                    | Delivery completion or controlled suppression at `info`, provider/configuration failure at `error`, duration and transport kind only. Never log recipient or verification/magic-link content. |
| Sanity published read and invalidation                       | Read success at `debug`, accepted invalidation at `info`, unexpected integration failure at `error`. No GROQ results, document text or webhook body.                                          |
| Idle PostgreSQL pool error                                   | One sanitized `error` event preserving diagnostic classification; no raw driver error, SQL or connection string.                                                                              |
| Settings refresh                                             | Bounded failure/recovery events, subject to the same policy. No per-log refresh and no unbounded outage chatter.                                                                              |

Document exact stable event names in the runbook during implementation. Do not
instrument each function, add a blanket `console` replacement, or alter
`scripts/deploy/production/cli.ts` and `scripts/environment/cli.ts` result
streams. Better Auth's independent logger is not automatically covered. Any
future bridge must use its supported `logger` configuration and preserve its
built-in behavior; that bridge is not required for this initial app-owned scope.

Deployed output is newline-delimited JSON. Prefer direct, non-worker output
without application-level buffering that survives past request completion.
Route severity deliberately to the platform's supported channels and preserve
the explicit severity field. Test actual output at request completion and short
process exit, including destination failure. Keep readable local formatting
local-only; do not import a pretty-print worker into deployed request handling.
This does not promise durable log storage or recover earlier suppressed events.

## Proposed settings-management interface

Recommend an operator CLI, matching [existing script conventions](../../../scripts/README.md),
with `inspect` and `set --file <snapshot.json> --expected-revision <n>` beneath
one future `pnpm logging` command. JSON on stdout is the inspection/update
result; diagnostics go to stderr. The input file contains policy only, never
credentials. The writer uses existing operator-supplied environment credentials,
an explicit target and existing profile/target identity checks before mutation.
It validates the full snapshot, commits once and refuses stale revisions.

If selected, register `scripts/logging/**/*.test.ts` in `vitest.config.ts`.
Its current explicit includes omit that directory; a successful command with
zero discovered tests is not evidence. Record a nonzero test count for the
focused adapter run.

This recommendation adds no product admin identity, public HTTP endpoint or
settings UI. [OD-026](../../../.dwf/decisions/OPEN-DECISIONS.md#od-026) must choose
the interface and protected authorization path before implementing its writer
or operating it against hosted environments. Production changes retain the
existing owner/protected-operation boundary; the command must not quietly load
an ambient `.env.local` target and infer authorization. If the owner selects an
endpoint/UI instead, revise this bounded task before implementing that design.
The accepted database store and dynamic multi-instance behavior are not open
questions.

## Dependencies and work order

The ordered review units are [T-26.1](../../../TODO.md#t-261),
[T-26.2](../../../TODO.md#t-262), and [T-26.3](../../../TODO.md#t-263).
First prove the emission contract with safe defaults, then shared settings and
its selected writer, then adopt the logger in the named backend paths. Each
unit gets its own branch, tests, evidence and fresh independent review. All
remain unchecked and await a separate execution instruction.

| Prerequisite                                                                                                                 | Classification and unblock condition                                                                                                                                     |
| ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Execution authorization, stable compatible Pino/version documentation, registry access and installed repository dependencies | Required to implement T-26.1; package installation is future work and must be authorized, not performed during task definition.                                          |
| OD-026 selection; documented schema/target classification                                                                    | Required before T-26.2 writer implementation. Existing Production migration history is immutable; add only a reviewed forward migration under TD-025.                    |
| Running Docker, repository PostgreSQL 18 Testcontainers and migration tooling                                                | Required for T-26.2 local persistence/upgrade verification. No hosted database substitutes.                                                                              |
| Owner-authorized non-default Neon branch and direct migration role                                                           | Required for the existing branch-first migration verification before promotion. Never infer this authorization from the plan or apply schema changes to Production here. |
| Installed Playwright Chromium and the repository's isolated Next.js test lifecycle                                           | Required for T-26.3 runtime/browser regression evidence; use synthetic accounts and disposable local PostgreSQL.                                                         |
| Real provider credentials and explicit hosted-operation authorization                                                        | Required only for a separately requested deployed/provider smoke. Local tests do not establish Vercel delivery, live mail or live Sanity outage evidence.                |

For this documentation task, Git, installed Prettier and the local link checker
are available in the original checkout. Its pre-existing `pnpm-lock.yaml`
working-copy state is excluded from this change. Do not install dependencies,
start services or perform provider operations to define these tasks.

## Verification strategy

[TST-LOGGING-001](../../../.dwf/decisions/TESTING.md#tst-logging-001) owns emission,
privacy and context evidence; [TST-LOGGING-002](../../../.dwf/decisions/TESTING.md#tst-logging-002)
owns shared settings. Both start `specified`. Reuse existing contract meanings
for `TST-FOUNDATION-001`, `TST-MIGRATION-001`, `TST-HARNESS-001`,
`TST-BOUNDARY-001`, `TST-AUTH-001`/`002`, `TST-LANDING-001`/`003`,
`TST-ENV-001` and `TST-E2E-001`/`002`. Do not reset their historical evidence or
claim new hosted proof from unit tests.

- Unit checks cover full filter precedence, invalid settings, old child-loggers
  seeing refreshed policy, lazy metadata, two interleaved requests and isolated
  job context, spoofed reserved fields, arbitrary sensitive error strings,
  nested/cyclic metadata, output failures and one report per propagated error.
- Fake-clock cache tests cover cold start, missing/malformed snapshots,
  concurrent stale requests, bounded timeout and retry, recovery after outage,
  late responses and active/idle freshness. These prove cache logic, not real
  PostgreSQL persistence or environment isolation.
- Real local PostgreSQL integration checks use two independent cache/store
  instances sharing a database, atomic revision conflicts, full-snapshot reads,
  namespace/target isolation and preserved old settings after failed writes.
  Apply the new chain to a fresh database and upgrade from the prior schema.
  Verify settings-query timeout/pool cleanup against the real adapter.
- Boundary tests capture emitted output for list/task mapped failures,
  successful/suppressed/failed mail and Sanity outcomes, preserving all existing
  response and cache contracts. Expected refusal and propagated-error cases
  check severity and deduplication explicitly.
- Runtime evidence uses the real Pino writer and a Next.js Node request path,
  with captured JSON, local readable output, severity channel mapping, and
  request/process completion checks. Confirm no browser-only bundle imports the
  logger. Cross-instance configuration behavior uses two independent instances,
  not two logger objects sharing the same cache.

Future commands and their expected results belong to each TODO review unit.
The complete logger slice retains T-26's `pnpm test`, `pnpm typecheck`,
`pnpm lint`, `pnpm build`, security/log review and `git diff --check`, plus
`pnpm test:integration`, `pnpm test:e2e`, migration check/branch smoke and
focused pipeline guard checks where affected. No manual application suite is
needed for this documentation-only change; normal repository commit/CI gates
are separate from future logger evidence.

## Sources and evidence limits

Reviewed on 2026-09-18:

- [Pino API](https://github.com/pinojs/pino/blob/main/docs/api.md) documents
  levels, child loggers and output destinations. The facade must implement its
  own current-policy checks so contextual objects cannot freeze an old policy.
- [Pino redaction](https://github.com/pinojs/pino/blob/main/docs/redaction.md)
  supports path-based protection; the task additionally requires safe arbitrary
  string/error projection. [OWASP logging guidance](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
  supports keeping secrets and sensitive data out and testing logging failures.
- [Pino asynchronous logging](https://github.com/pinojs/pino/blob/main/docs/asynchronous.md)
  describes buffering/freeze risks. This plan infers a conservative direct-output
  default for Vercel; it does not claim an executed Vercel integration.
  [pino-pretty](https://github.com/pinojs/pino-pretty) is a local formatting option.
- Installed Next.js 16.3.5 docs at
  `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/serverExternalPackages.md`
  list Pino and pino-pretty as automatically externalized. This is compatibility
  guidance, not proof of the proposed runtime wiring.
- [Vercel runtime logs](https://vercel.com/docs/logs/runtime) distinguish stdout,
  stderr and console warning behavior. Preserve explicit JSON severity and
  document the platform distinction for streaming/non-streaming functions;
  do not assume a numeric Pino field alone sets Vercel's displayed severity.

## Handoff to task breakdown

Use the three linked unchecked TODO units as the sole executable task list.
The reusable facade, environment-local settings store, refresh behavior and
initial adoption are defined here; only OD-026's management choice remains
unselected. This documentation delivery ends after its own checks, independent
review and integration. It does not start T-26.1 or close parent T-26.
