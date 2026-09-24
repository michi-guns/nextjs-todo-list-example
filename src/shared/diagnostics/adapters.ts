import type { DiagnosticsAdapters } from "./runtime"

/**
 * Startup factories for the two accepted providers. Each dynamic import runs
 * only for the provider selected at startup, so `none` loads no SDK.
 */
export const diagnosticsAdapters: DiagnosticsAdapters = {
  sentry: (config, gate, notice) =>
    import("./sentry").then(({ createSentryStrategy }) =>
      createSentryStrategy(config, gate, notice)
    ),
  "better-stack": (config, gate, notice) =>
    import("./better-stack").then(({ createBetterStackStrategy }) =>
      createBetterStackStrategy(config, gate, notice)
    ),
}
