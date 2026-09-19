# Backend logging

The database-independent logger core lives in `src/shared/logging/`. T-26.1
provides filtering, request/job context, safe metadata and Pino output. Application
adoption belongs to T-26.3. Shared database settings and the operator CLI belong
to T-26.2; neither exists yet. See the [accepted contract](../../.dwf/output/agent/SPEC.md#shared-backend-logging)
and [task evidence](../agentforge/evidence/2026-09-19-logger-core.md).

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
This is in-memory publication only, with no persistence or refresh promise.

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
