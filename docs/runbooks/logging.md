# Backend logging

The logger lives in `src/shared/logging/`. Adopted backend entries refresh the
shared database policy, establish a correlation ID and report safe outcomes
through Pino. See the [accepted contract](../../.dwf/output/agent/SPEC.md#shared-backend-logging),
[core evidence](../agentforge/evidence/2026-09-19-logger-core.md) and
[settings evidence](../agentforge/evidence/2026-09-19-logger-settings.md), plus
[application/runtime evidence](../agentforge/evidence/2026-09-19-logger-adoption.md).

## Use an application entry

Import `runLoggedOperation` or `loggedHandler` from
`src/shared/logging/server.ts`. This Next.js facade has the `server-only` marker
and composes the cache with the existing pool in `db/db.ts`. Never export it
from the mixed `src/shared/index.ts` barrel or import it from a Client Component.

```ts
import { runLoggedOperation } from "@/src/shared/logging/server"

return runLoggedOperation("jobs", "job.run", async () => performWork())
```

Use `loggedHandler("lists", "lists.read", handlers.GET)` for a route function.
Every entry generates its own UUID, ignoring caller request-ID headers. It
awaits a stale-policy refresh before work and records completion at `debug`.
Known application refusals retain their existing responses. For caught errors,
list/task adapters use `entry-errors.ts` before the pure response mapper. For
rethrown errors, the entry records the failure and preserves the same exception.

Integration boundaries call `observeOperation` from `operation.ts` inside an
adopted entry. Mail delivery and Sanity reads/invalidation own their failures;
the enclosing entry does not report the same exception again. Ownership also
applies when policy suppresses that event, so an outer event cannot bypass its
suppression. An integration called outside an adopted entry runs normally
without adding output, preserving seed and deployment CLI result streams.

Keep framework control flow outside observed work. The dashboard awaits
Next.js `connection()` before refreshing settings and redirects unauthenticated
visitors after the observed read returns its refusal. Build-time prerendering
therefore does not query settings or produce a false application failure.

## Event catalogue and diagnosis

Operation names below produce `.completed` at `debug` and `.failed` at `error`
unless the table names a different completion level. Completion means the
boundary returned; inspect `outcome`, which can be `refused` or `failed`.

| Module             | Operations/events                                                                                                                                        | Reporting owner and use                                                                                                                                                                                                                                                                                       |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lists`            | `lists.read`, `lists.create`, `lists.rename`, `lists.delete`; mutation names also have `.action` variants                                                | JSON or Server Action entry, including authentication, application and revalidation failures                                                                                                                                                                                                                  |
| `tasks`            | `tasks.read`, `tasks.create`, `tasks.update`, `tasks.delete`; mutation names also have `.action` variants                                                | JSON or Server Action entry; no task title, notes or record IDs                                                                                                                                                                                                                                               |
| `dashboard`        | `dashboard.read`                                                                                                                                         | Session and initial private workspace read; normal sign-in redirect is not an error                                                                                                                                                                                                                           |
| `landing`          | `landing.read`, `landing.preview`                                                                                                                        | Landing entry; `landing.preview` is the draft read and validation of an authorized editorial session; nested Sanity failures stay owned by `sanity.read`                                                                                                                                                      |
| `auth`             | `auth.get`, `auth.post`, `auth.patch`, `auth.put`, `auth.delete`                                                                                         | Better Auth HTTP entry; its responses and independent built-in logger stay intact                                                                                                                                                                                                                             |
| `auth.mail`        | `auth.mail.delivery`                                                                                                                                     | `info` on delivery completion or Preview suppression, `error` on delivery/configuration failure; only transport, outcome and duration                                                                                                                                                                         |
| `sanity`           | `sanity.read`, `sanity.invalidation`, `sanity.webhook`, `sanity.recover`, `sanity.preview.unavailable`                                                   | Validated read at `debug`, accepted invalidation at `info`; `sanity.preview.unavailable` is a fixed `warn` (outcome only) when Draft Mode entry fails with `503`; integration/configuration failures at `error`; invalid signatures, irrelevant documents and unauthorized recovery are not unexpected errors |
| `database.pool`    | `database.pool.idle.failed`                                                                                                                              | Idle-client callback, with a new independent correlation ID and safe driver classification                                                                                                                                                                                                                    |
| `logging.settings` | `logging.settings.failed`, `logging.settings.recovered`                                                                                                  | One `warn` when reads become unavailable/invalid and one `info` on recovery, subject to current policy; no repeated outage chatter                                                                                                                                                                            |
| `next`             | `next.render.failed`, `next.route.failed`, `next.action.failed`, `next.proxy.failed`, `next.request.failed`                                              | Unhandled server failure that no boundary above reported, from `onRequestError`; control flow and expected refusals are skipped                                                                                                                                                                               |
| `health`           | `health.database.unavailable`, `health.cms.unavailable`                                                                                                  | `warn` (console, and provider logs when policy allows) when a dependency probe fails, outcome `failed` or `timeout`; no issue report, the uptime monitor owns alerting. See the [operations runbook](operations.md)                                                                                           |
| `diagnostics`      | `diagnostics.config_invalid`, `diagnostics.provider_unavailable`, `diagnostics.export_failed`, `diagnostics.flush_timeout`, `diagnostics.record_dropped` | Local-only `warn` notices, at most once per five minutes per kind; see the [diagnostics runbook](diagnostics.md)                                                                                                                                                                                              |

Start with module, event, correlation ID and duration. `timeout`, `unavailable`,
`conflict` and `constraint` classify allowlisted driver codes; everything else is
`unexpected`. The event tells you which boundary failed, not the raw provider
message. For `auth.mail.delivery.failed`, inspect the selected transport using
the [mail runbook](auth-mail.md). For Sanity failures, use the
[integration runbook](sanity-integration-failure.md). For settings fallback,
check the selected database, migration and role through the guarded CLI below.

To enable list diagnostics only, publish a new revision with
`"console": { ..., "moduleLevels": { "lists": "debug" } }`. To quiet a specific
event, add its exact full name, such as `lists.read.completed`, to
`suppressedEvents`; to silence a whole module, add it to `disabledModules`.
`enabled: false` suppresses every facade event, including settings recovery,
until a successful refresh adopts an enabled policy. Inspect persisted policy first when logs
disappear; absence alone does not prove an outage or universal instance adoption.

## Use the core

The core has no database, Next request API or domain dependency. It uses Node
async context and can also run in repository TypeScript tools. The Next-specific
`server-only` marker lives on `server.ts`; direct Node core imports still cannot
compile for a browser because they depend on Node async hooks. Keep all of these
modules out of client-facing barrels.

```ts
import { createLogPolicy } from "@/src/shared/logging/config"
import { withLogContext } from "@/src/shared/logging/context"
import { createLogger } from "@/src/shared/logging/logger"

const policy = createLogPolicy()
const moduleLogger = createLogger({
  environment: "local", // Supply the selected, validated APP_ENV at composition.
  policy: policy.current,
})
const log = moduleLogger("jobs")

await withLogContext("job.run", async () => {
  log.emit("debug", "job.completed", () => ({
    outcome: "completed",
    durationMs: 12,
  }))
})
```

Module, event and operation names must be static code-owned identifiers. Never
derive them from user input, resource IDs, URLs or exception messages. Names have
a maximum of 80 characters and use lowercase letters/digits with `.`, `_` or `-`
separators. These syntax checks are not permission to log personal text.

`withLogContext` creates a server-owned UUID and isolates it through async work.
Ordinary downstream calls inherit it. Calling it again starts a separate operation
and restores the outer context afterward. Code outside a context has no request
ID. Use a new context for independent jobs or background callbacks rather than
retaining a request's identity. The helper returns the callback's value/promise
and preserves its exception.

The example records which operation ran, its outcome and duration. It only
uses in-memory policy; application entries use the shared composition above.

## Policy and privacy

`createLogPolicy()` starts with console output enabled at `info` and remote
diagnostics disabled. `update(unknown)` accepts a complete validated snapshot
only at a newer revision and returns a boolean. Schema version 2 is current;
a legacy version-1 snapshot is upgraded on read or write: its numeric thresholds
become console thresholds, module `off` becomes a `disabledModules` entry and
diagnostics stay disabled. Snapshots are copied and deeply frozen. Invalid updates
retain the previous snapshot. Each list or override map holds at most 100 entries.
This helper only publishes in memory; the settings adapter below supplies
persistence and refresh.

Global `enabled: false`, `disabledModules` and exact `suppressedEvents` veto every
destination, including explicit error reports. Otherwise each destination,
`console` and `diagnostics`, applies its own `enabled` switch and threshold: an
exact module entry in that destination's `moduleLevels` replaces its
`minimumLevel`. A quiet console therefore never discards an eligible remote
event, and a quiet remote threshold never hides console output. Explicit
`reportError` calls ignore numeric thresholds and need both `diagnostics.enabled`
and `diagnostics.errorReportsEnabled`. Existing logger objects read current
policy on every call. Metadata callbacks run only when at least one destination
accepts the event.

Remote destinations also need a startup-selected provider. `DIAGNOSTICS_PROVIDER`
is `none` (default), `sentry` (`SENTRY_DSN`) or `better-stack`
(`BETTER_STACK_ERRORS_DSN`, `BETTER_STACK_LOGS_URL`, `BETTER_STACK_LOGS_TOKEN`).
These are server-only environment values, never policy fields. Invalid selected
configuration disables export with one local `diagnostics.config_invalid` notice
and never falls back to another provider. `instrumentation.ts` selects the
provider once per Node server instance; the [diagnostics runbook](diagnostics.md)
owns provider setup, failure ownership and diagnosis.
Explicit error reports carry only an error class, classified kind/code, static
message, repository-relative frame locations, up to three cause facts and a
stable fingerprint; the occurrence ID and correlation ID stay out of grouping.

Only `outcome`, `durationMs`, `transport` and classified `error` metadata survive.
Outcomes and transports use the finite lists in
[`sanitize.ts`](../../src/shared/logging/sanitize.ts). Duration is finite and
between zero and one day in milliseconds. Errors retain only a known code and
its fixed classification, otherwise `unexpected`. Messages, stacks, causes,
arbitrary strings, nested data, personal content and raw payloads are omitted.
The projector reads own data properties without calling getters or serializers.
Its fixed shape bounds depth and size without walking arbitrary objects.

Do not call the internal Pino writer with raw data. The facade sanitizes before
serialization and prevents metadata from replacing trusted fields. Metadata,
policy-access and output failures drop the affected event without recursion or
changing application results. An invalid environment suppresses facade output.

## Output and limits

`local` produces readable lines; `development`, `preview` and `production`
produce JSON. Each includes time, numeric Pino level, explicit severity, event,
module and environment, with correlation/operation when present. No hostname or
process ID is added. Local formatting requires no extra package or worker.
Application composition selects a recognized `APP_ENV`; otherwise it uses
`production` when `NODE_ENV=production` and `local` elsewhere. This output
fallback is not runtime target validation, which remains T-26.8 work.

The direct Pino destination invokes `console.log` for trace/debug/info,
`console.warn` for warn and `console.error` for error/fatal. Vercel derives its
dashboard severity from the output channel, not a JSON field. Thus the JSON
severity preserves distinctions such as debug and fatal even when the platform
groups them as info or error. Vercel preserves `console.warn` as warning for
streaming functions; non-streaming functions group stderr as error. See
[Vercel runtime log levels](https://vercel.com/docs/logs/runtime#level).

There is no application queue, worker transport or deferred flush. Tests inspect
real output at operation completion and normal Node process exit, including
console stream failures. Node console streams may still be asynchronous; abrupt
`process.exit`, platform termination and failed sinks can lose logs. This core
does not promise durable storage or prove deployed delivery. See
[Node process I/O](https://nodejs.org/api/process.html#a-note-on-process-io).

Run `pnpm exec vitest run src/shared/logging` for core/entry checks. Local Next.js
request completion, JSON channels and two-process policy adoption are recorded
in the application evidence. Hosted ingestion has its own authorized tasks.

## Shared settings and refresh

`createLoggingRuntime(pool, environment)` composes the store, cache and logger
with the existing application pool. Create it once after the database boundary
exists. Do not import this composition from `db/pool.ts`; the logger core stays
database-independent. `db/db.ts` composes it once and supplies the current-policy
logger to its idle-pool callback. The server facade refreshes adopted entries.

The selected database owns one `logging_settings` row, with singleton ID 1,
revision and a full JSON policy. Reads never insert defaults. A missing table,
missing row, malformed policy or failed query retains the last valid policy,
including off. Cold start uses enabled `info` with no overrides/suppressions.
Lower or equal revisions cannot replace a newer cached snapshot.

Refresh occurs at the first entry/checkpoint at least 30 seconds after the
previous attempt completed. Concurrent callers share that attempt. Long jobs
should call at safe checkpoints at most 30 seconds apart. A single blocking
operation is not interrupted. Idle instances wait until the next invocation;
there is no background polling, and emitting an event never reads the database.

The shared pool retains its existing 10-second connection/checkout deadline.
Once checked out, the settings transaction has a one-second client deadline that
destroys its connection on timeout. Its PostgreSQL-local `statement_timeout`
also cancels statements after 750 milliseconds, including blocked lock waits.
Failed transactions are discarded; successful commit restores the connection's
previous settings. Thus an attempt can take at most approximately 11
seconds, subject to Node event-loop scheduling. This deliberately replaces the
plan's illustrative one-second total budget: installed pg-pool has no public
per-checkout timeout/cancellation API, and changing every application connection
or using a second runtime pool would alter unrelated behavior. Saturated pool
waiters are removed by pg-pool's deadline; PostgreSQL enforces its own statement
bound even if the client disconnects first.
Retries wait another 30 seconds after either result. Healthy active instances
converge at their next eligible checkpoint plus this bounded attempt; outages
can preserve stale settings indefinitely. Cache transition diagnostics only
read current in-memory policy and never recurse through refresh. Operator
inspection distinguishes persisted state from instance adoption.

## Inspect and change policy

Load the complete selected [environment profile](environment-profiles.md) into
the process using existing secure operator configuration. The CLI never loads
`.env.local` automatically. The authenticated Neon CLI supplies independent
branch/endpoint observations; the supplied direct database role supplies actual
database access. No credentials belong in arguments, policy JSON or output.

Select every target explicitly. Examples assume the corresponding profile and
credentials are already in the process environment:

```powershell
pnpm logging -- inspect --environment local --host 127.0.0.1 --port 5432 --database todo
pnpm logging -- inspect --environment development --project curly-dust-60603928 --branch development --database neondb
pnpm logging -- set --environment development --project curly-dust-60603928 --branch development --database neondb --file policy.json --expected-revision 0
```

An absent row inspects as `policy: null, revision: 0`. For the first write,
`policy.json` contains this full snapshot, at most 32 KiB:

```json
{
  "schemaVersion": 2,
  "revision": 1,
  "enabled": true,
  "disabledModules": [],
  "suppressedEvents": [],
  "console": { "enabled": true, "minimumLevel": "info", "moduleLevels": {} },
  "diagnostics": {
    "enabled": false,
    "minimumLevel": "warn",
    "moduleLevels": {},
    "errorReportsEnabled": false
  }
}
```

A version-1 file is still accepted and stored as its version-2 upgrade. Code
older than T-26.4 rejects a stored version-2 row as `invalid_policy`: running
instances keep their last valid policy and new instances start from cold
defaults, and that release's `inspect` cannot read the row. Record the current
revision with the newer CLI before rolling back; afterwards, publish a version-1
file with the older release's CLI and that revision as `--expected-revision` to
restore control.

For later updates, inspect the current revision, increment `revision` by one
in the full policy file, and pass the old revision as `--expected-revision`.
Use static module/event names only. Updates commit one snapshot atomically.
A concurrent update returns `revision_conflict`; inspect again before deciding
what to publish. To restore defaults, publish them at a new revision rather
than deleting the row. If a write times out, it might already have committed:
inspect before retrying, and never assume timeout means rollback.

JSON results go to stdout; fixed diagnostics go to stderr. `invalid_policy`
means the snapshot/version/revision is invalid; `revision_conflict` means the
expected revision is stale; `settings_unavailable` means the database operation
failed, including missing schema or insufficient role permissions. Other
configuration/provider refusals use `refused_or_failed` without printing raw
exceptions. Check profile/explicit target agreement and apply the reviewed
forward migration through the owning environment workflow when needed.

Production inspection and updates require the existing protected GitHub main-job
boundary, a clean reviewed checkout, passing main CI and matching
`RELEASE_COMMIT_SHA` / `RELEASE_APPROVED_SHA`. Provider identity must match
`productionTarget` from the release adapter. There is no `--approve` flag or
new HTTP/admin interface. This command does not add or dispatch a Production
workflow; invoking it there still needs the owner-approved protected operation.
