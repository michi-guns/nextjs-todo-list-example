import { mapApplicationError } from "../error-contract"
import { currentLogContext, withLogContext } from "../logging/context"
import type { createLogger } from "../logging/logger"
import {
  isFrameworkControlFlow,
  markReported,
  wasReported,
} from "../logging/operation"

const routeTypes = new Set(["render", "route", "action", "proxy"])

function expected(error: unknown): boolean {
  return (
    isFrameworkControlFlow(error) || mapApplicationError(error).status !== 500
  )
}

/**
 * Owner of unhandled server render/route/action failures that no application
 * boundary reported. Next passes the thrown object itself (with a digest
 * attached), so a boundary's earlier report is recognized by identity.
 * https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation#onrequesterror-optional
 */
export function createRequestErrorReporter(
  runtime: {
    logger: ReturnType<typeof createLogger>
    flush: () => Promise<void>
  },
  /** Platform lifetime extension; a no-op outside a Vercel request context. */
  waitUntil: (promise: Promise<unknown>) => void = () => {}
) {
  return async function reportRequestError(
    error: unknown,
    context: { routeType?: string }
  ): Promise<void> {
    try {
      if (wasReported(error) || expected(error)) return
      markReported(error)
      const kind =
        context.routeType && routeTypes.has(context.routeType)
          ? context.routeType
          : "request"
      const event = `next.${kind}.failed`
      const record = () => {
        const log = runtime.logger("next")
        log.emit("error", event, { outcome: "failed", error })
        log.reportError(event, error)
      }
      // Keep the request's correlation when Next runs the hook inside it.
      if (currentLogContext()) record()
      else withLogContext(`next.${kind}`, record)
      // Next awaits this hook for route handlers but drops its promise on
      // render/action paths, so the platform must keep the flush alive.
      const flushed = runtime.flush()
      try {
        waitUntil(flushed)
      } catch {
        /* No request context: the awaited flush below still runs. */
      }
      await flushed
    } catch {
      // Next logs hook failures; never add noise or replace the original error.
    }
  }
}
