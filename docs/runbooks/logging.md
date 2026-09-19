# Backend logging

The database-independent logger core lives in `src/shared/logging/`. T-26.1
provides filtering, request/job context, safe metadata and Pino output. Application
adoption belongs to T-26.3. T-26.2 adds shared database settings, bounded refresh
and the operator CLI. See the [accepted contract](../../.dwf/output/agent/SPEC.md#shared-backend-logging),
[core evidence](../agentforge/evidence/2026-09-19-logger-core.md) and
[settings evidence](../agentforge/evidence/2026-09-19-logger-settings.md).

## Use the core

Import the facade directly from server code. Its `server-only` marker rejects
Client Component imports. Do not export it from the mixed `src/shared/index.ts`
barrel. The core has no database, Next request API or domain dependency.

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

The example asks three diagnostic questions: which operation produced an event,
whether it completed or failed, and how long it took. The core supplies those
fields; T-26.3 will document the actual application event catalogue and reporting
owners. It does not yet change any application's logging behavior.

## Policy and privacy

`createLogPolicy()` starts enabled at `info`. `update(unknown)` accepts a complete
validated schema-version-1 snapshot only at a newer revision and returns a
boolean. Snapshots are copied and frozen. Invalid updates retain the previous
snapshot. There are at most 100 module overrides and 100 event suppressions.
This helper only publishes in memory; the settings adapter below supplies
persistence and refresh.

Global off, exact event suppression and exact module off veto emission. Otherwise
the exact module threshold replaces the default threshold. Existing logger
objects read current policy on every call. Use a metadata callback for expensive
debug data so filtering happens before construction.

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

The direct Pino destination invokes `console.log` for trace/debug/info,
`console.warn` for warn and `console.error` for error/fatal. Vercel derives its
dashboard severity from the output channel, not a JSON field. Thus the JSON
severity preserves distinctions such as debug and fatal even when the platform
groups them as info or error. See [Vercel's structured logging guidance](https://vercel.com/kb/guide/add-structured-application-logs-to-vercel-functions).

There is no application queue, worker transport or deferred flush. Tests inspect
real output at operation completion and normal Node process exit, including
console stream failures. Node console streams may still be asynchronous; abrupt
`process.exit`, platform termination and failed sinks can lose logs. This core
does not promise durable storage or prove deployed delivery. See
[Node process I/O](https://nodejs.org/api/process.html#a-note-on-process-io).

Run `pnpm exec vitest run src/shared/logging` for the core evidence. Next.js
request-boundary lifecycle and once-only application failure reporting remain
T-26.3 obligations. Hosted ingestion has its own authorized tasks.

## Shared settings and refresh

`createLoggingRuntime(pool, environment)` composes the store, cache and logger
with the existing application pool. Create it once after the database boundary
exists. Do not import this composition from `db/pool.ts`; the logger core stays
database-independent. T-26.3 will wire application entries to `await refresh()`
and use its `logger` factory. This task provides the composition but does not
change current application request logging.

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
Once checked out, the settings operation has a one-second deadline that destroys
its connection on timeout. Thus an attempt can take at most approximately 11
seconds, subject to Node event-loop scheduling. This deliberately replaces the
plan's illustrative one-second total budget: installed pg-pool has no public
per-checkout timeout/cancellation API, and changing every application connection
or using a second runtime pool would alter unrelated behavior. Saturated pool
waiters are removed by pg-pool's deadline; timed-out SQL is not left running.
Retries wait another 30 seconds after either result. Healthy active instances
converge at their next eligible checkpoint plus this bounded attempt; outages
can preserve stale settings indefinitely. The cache emits no recursive failure
logs. Operator inspection distinguishes persisted state from instance adoption.

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
  "schemaVersion": 1,
  "revision": 1,
  "enabled": true,
  "minimumLevel": "info",
  "moduleLevels": {},
  "suppressedEvents": []
}
```

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
