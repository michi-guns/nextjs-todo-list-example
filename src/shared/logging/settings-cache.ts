import { createLogPolicy, logPolicySchema } from "./config"

export const SETTINGS_REFRESH_MS = 30_000

/** The reader owns connection/query deadlines. Emission never calls this cache. */
export function createSettingsCache(
  reader: { read(): Promise<unknown> },
  notify?: (transition: "failed" | "recovered") => void
) {
  const policy = createLogPolicy()
  let nextAttempt = 0
  let inFlight: Promise<void> | undefined
  let failed = false

  function transition(unavailable: boolean) {
    if (failed === unavailable) return
    failed = unavailable
    try {
      notify?.(unavailable ? "failed" : "recovered")
    } catch {
      /* Best effort. */
    }
  }

  return {
    current: policy.current,
    refresh(): Promise<void> {
      if (inFlight) return inFlight
      if (performance.now() < nextAttempt) return Promise.resolve()
      inFlight = (async () => {
        try {
          const value = await reader.read()
          const valid =
            value === null || logPolicySchema.safeParse(value).success
          if (valid && value !== null) policy.update(value)
          transition(!valid)
        } catch {
          // Keep the last valid policy, including off. Notify without a refresh path.
          transition(true)
        } finally {
          nextAttempt = performance.now() + SETTINGS_REFRESH_MS
        }
      })().finally(() => {
        inFlight = undefined
      })
      return inFlight
    },
  }
}
