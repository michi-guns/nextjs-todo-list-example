import type { Instrumentation } from "next"

/**
 * Next.js calls `register` once per server instance before it serves requests.
 * Diagnostics are Node-only and optional; nothing starts during `next build`.
 * https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation
 */
export async function register() {
  if (
    process.env.NEXT_RUNTIME !== "nodejs" ||
    process.env.NEXT_PHASE === "phase-production-build"
  )
    return
  const { startApplicationDiagnostics } =
    await import("./src/shared/diagnostics/startup")
  await startApplicationDiagnostics()
}

/** Owns unhandled server failures that no application boundary reported. */
export const onRequestError: Instrumentation.onRequestError = async (
  error,
  _request,
  context
) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return
  const { reportRequestError } =
    await import("./src/shared/diagnostics/startup")
  // The raw request (path, headers) is deliberately never read.
  await reportRequestError(error, { routeType: context.routeType })
}
