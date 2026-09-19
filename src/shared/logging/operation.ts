import { AsyncLocalStorage } from "node:async_hooks"
import { mapApplicationError } from "../error-contract"
import { withLogContext } from "./context"
import type { createLogger } from "./logger"
import type { SafeMetadata } from "./sanitize"

type LoggerFactory = ReturnType<typeof createLogger>
type ObservationOptions = { level?: "info" | "debug"; metadata?: SafeMetadata }
type OperationState = {
  readonly reported: Set<unknown>
  readonly logger: LoggerFactory
  readonly module: string
  readonly operation: string
  readonly started: number
  outcome: "completed" | "refused" | "failed"
}
const activeOperation = new AsyncLocalStorage<OperationState>()

/** Called before mapping a caught failure; the pure response mapper stays pure. */
export function reportOperationError(
  error: unknown,
  owner?: {
    module: string
    operation: string
    started: number
    metadata?: SafeMetadata
  }
): void {
  try {
    const state = activeOperation.getStore()
    if (!state) return
    if (mapApplicationError(error).status !== 500) {
      if (state.outcome !== "failed") state.outcome = "refused"
      return
    }
    state.outcome = "failed"
    if (state.reported.has(error)) return
    state.reported.add(error)
    const boundary = owner ?? state
    state
      .logger(boundary.module)
      .emit("error", `${boundary.operation}.failed`, {
        ...owner?.metadata,
        outcome: "failed",
        durationMs: performance.now() - boundary.started,
        error,
      })
  } catch {
    // Diagnostics must never replace the application result or original error.
  }
}

export function createOperationRunner(runtime: {
  logger: LoggerFactory
  refresh: () => Promise<void>
}) {
  async function run<T>(
    module: string,
    operation: string,
    work: () => Promise<T>
  ): Promise<T> {
    return withLogContext(operation, () =>
      activeOperation.run(
        {
          reported: new Set(),
          logger: runtime.logger,
          module,
          operation,
          started: performance.now(),
          outcome: "completed",
        },
        async () => {
          // Off never disables refresh; the cache owns coalescing and retry deadlines.
          try {
            await runtime.refresh()
          } catch {
            /* Retain application availability. */
          }
          try {
            const result = await work()
            const state = activeOperation.getStore()!
            if (result instanceof Response && result.status >= 400) {
              state.outcome = result.status >= 500 ? "failed" : "refused"
            }
            runtime.logger(module).emit("debug", `${operation}.completed`, {
              outcome: state.outcome,
              durationMs: performance.now() - state.started,
            })
            return result
          } catch (error) {
            reportOperationError(error)
            throw error
          }
        }
      )
    )
  }

  return { run }
}

/** Integrations inherit the adopted entry. Standalone seed/CLI output stays unchanged. */
export async function observeOperation<T>(
  module: string,
  operation: string,
  work: () => Promise<T>,
  options: ObservationOptions = {}
): Promise<T> {
  const state = activeOperation.getStore()
  if (!state) return work()
  const started = performance.now()
  try {
    const result = await work()
    state
      .logger(module)
      .emit(options.level ?? "debug", `${operation}.completed`, {
        ...options.metadata,
        outcome: options.metadata?.outcome ?? "completed",
        durationMs: performance.now() - started,
      })
    return result
  } catch (error) {
    reportOperationError(error, {
      module,
      operation,
      started,
      metadata: options.metadata,
    })
    throw error
  }
}
