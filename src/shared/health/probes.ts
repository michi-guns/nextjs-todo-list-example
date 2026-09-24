import type { Pool, PoolClient, QueryConfig } from "pg"

/** Initial per-probe budget from the runtime plan. */
export const PROBE_DEADLINE_MS = 3_000

export type ProbeFailure =
  "timeout" | "unreachable" | "query_failed" | "invalid_content"
export type ProbeResult =
  | { readonly status: "ok" }
  | { readonly status: "unavailable"; readonly code: ProbeFailure }

const CLIENT_BACKSTOP_MS = 250

const unavailable = (code: ProbeFailure): ProbeResult => ({
  status: "unavailable",
  code,
})

/**
 * Concurrent callers share the one in-flight probe, so each instance runs at
 * most one probe per component and never queues monitor traffic.
 */
export function singleFlight(
  work: () => Promise<ProbeResult>
): () => Promise<ProbeResult> {
  let inFlight: Promise<ProbeResult> | undefined
  return () =>
    (inFlight ??= work().finally(() => {
      inFlight = undefined
    }))
}

function deadline(ms: number) {
  let timer: ReturnType<typeof setTimeout> | undefined
  const expired = new Promise<"expired">((resolve) => {
    timer = setTimeout(() => resolve("expired"), ms)
  })
  return { expired, cancel: () => clearTimeout(timer) }
}

/**
 * Read-only `SELECT 1` through the shared application pool. Acquisition and
 * the query share one deadline: a late acquisition is released as soon as it
 * arrives. The statement runs in a read-only transaction whose server-side
 * `statement_timeout` ends the work itself; a failed or timed-out connection
 * is destroyed rather than returned to the pool.
 */
export function createDatabaseProbe(
  pool: Pick<Pool, "connect">,
  options: { deadlineMs?: number; statement?: string } = {}
): () => Promise<ProbeResult> {
  const deadlineMs = options.deadlineMs ?? PROBE_DEADLINE_MS
  const statement = options.statement ?? "SELECT 1"
  // An acquisition that outlived its probe; the pool bounds its wait.
  let lateAcquisition: Promise<unknown> | undefined

  return singleFlight(async () => {
    if (lateAcquisition) return unavailable("timeout")
    const started = performance.now()
    const acquisition = pool.connect()
    const timer = deadline(deadlineMs)
    let client: PoolClient
    try {
      const first = await Promise.race([acquisition, timer.expired])
      if (first === "expired") {
        lateAcquisition = acquisition
          .then((late) => late.release())
          .catch(() => {})
          .finally(() => {
            lateAcquisition = undefined
          })
        return unavailable("timeout")
      }
      client = first
    } catch {
      return unavailable("unreachable")
    } finally {
      timer.cancel()
    }

    const remaining = Math.max(
      1,
      Math.floor(deadlineMs - (performance.now() - started))
    )
    try {
      // One round trip; SET LOCAL ends with the transaction (pooler-safe).
      const query: QueryConfig & { query_timeout: number } = {
        text: `BEGIN READ ONLY; SET LOCAL statement_timeout = ${remaining}; ${statement}; COMMIT`,
        // Client-side backstop if the server never answers (pg option).
        query_timeout: remaining + CLIENT_BACKSTOP_MS,
      }
      await client.query(query)
      client.release()
      return { status: "ok" }
    } catch (error) {
      // Never reuse a connection whose query may still be running.
      client.release(true)
      return unavailable(
        error instanceof Error && /timeout/i.test(error.message)
          ? "timeout"
          : "query_failed"
      )
    }
  })
}

/**
 * Fresh published CMS read. The caller's fetch must bypass CDN and data
 * caches and honor the abort signal; the deadline aborts the request itself.
 */
export async function probeCms<T>(
  fetchPublished: (signal: AbortSignal) => Promise<unknown>,
  validate: (document: unknown) => T,
  options: { deadlineMs?: number } = {}
): Promise<ProbeResult> {
  const controller = new AbortController()
  const timer = deadline(options.deadlineMs ?? PROBE_DEADLINE_MS)
  void timer.expired.then(() => controller.abort())
  let document: unknown
  try {
    const first = await Promise.race([
      fetchPublished(controller.signal),
      timer.expired,
    ])
    if (first === "expired") return unavailable("timeout")
    document = first
  } catch {
    return unavailable(controller.signal.aborted ? "timeout" : "unreachable")
  } finally {
    timer.cancel()
  }
  try {
    validate(document)
    return { status: "ok" }
  } catch {
    return unavailable("invalid_content")
  }
}
