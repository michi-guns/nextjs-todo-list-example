import { mapApplicationError } from "../error-contract"
import { currentLogContext, withLogContext } from "../logging/context"
import type { createLogger } from "../logging/logger"
import { markReported, wasReported } from "../logging/operation"
import { ownValue } from "../logging/sanitize"

const routeTypes = new Set(["render", "route", "action", "proxy"])
/** Next's own control-flow digests (redirect, notFound, dynamic usage, bailout). */
const controlFlow =
  /^(NEXT_REDIRECT|NEXT_HTTP_ERROR_FALLBACK|NEXT_NOT_FOUND|DYNAMIC_SERVER_USAGE|BAILOUT_TO_CLIENT_SIDE_RENDERING|NEXT_PRERENDER_INTERRUPTED)/

function expected(error: unknown): boolean {
  const digest = ownValue(error, "digest")
  return (
    (typeof digest === "string" && controlFlow.test(digest)) ||
    mapApplicationError(error).status !== 500
  )
}

/**
 * Owner of unhandled server render/route/action failures that no application
 * boundary reported. Next passes the thrown object itself (with a digest
 * attached), so a boundary's earlier report is recognized by identity.
 * https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation#onrequesterror-optional
 */
export function createRequestErrorReporter(runtime: {
  logger: ReturnType<typeof createLogger>
  flush: () => Promise<void>
}) {
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
      await runtime.flush()
    } catch {
      // Next logs hook failures; never add noise or replace the original error.
    }
  }
}
