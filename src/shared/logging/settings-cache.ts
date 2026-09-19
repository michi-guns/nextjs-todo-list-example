import { createLogPolicy } from "./config"

export const SETTINGS_REFRESH_MS = 30_000

/** The reader owns connection/query deadlines. Emission never calls this cache. */
export function createSettingsCache(reader: { read(): Promise<unknown> }) {
  const policy = createLogPolicy()
  let nextAttempt = 0
  let inFlight: Promise<void> | undefined

  return {
    current: policy.current,
    refresh(): Promise<void> {
      if (inFlight) return inFlight
      if (performance.now() < nextAttempt) return Promise.resolve()
      inFlight = (async () => {
        try {
          policy.update(await reader.read())
        } catch {
          // Keep the last valid policy, including off. No recursive diagnostics.
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
