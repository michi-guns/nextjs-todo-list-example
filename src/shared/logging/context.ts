// Node-only core shared with repository tools; server.ts guards the Next facade.
import { AsyncLocalStorage } from "node:async_hooks"
import { randomUUID } from "node:crypto"
import { logName } from "./config"

type LogContext = Readonly<{ correlationId: string; operation?: string }>
const context = new AsyncLocalStorage<LogContext>()

export function currentLogContext(): LogContext | undefined {
  return context.getStore()
}

/** A new request/job owns its ID; ordinary nested calls inherit it automatically.
 * https://nodejs.org/api/async_context.html#asynclocalstoragerunstore-callback-args
 */
export function withLogContext<T>(operation: string, work: () => T): T {
  const name = logName.safeParse(operation)
  return context.run(
    Object.freeze({
      correlationId: randomUUID(),
      ...(name.success ? { operation: name.data } : {}),
    }),
    work
  )
}
