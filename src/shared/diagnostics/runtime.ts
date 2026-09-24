import { z } from "zod"
import type { LogEnvironment } from "../logging/config"
import { loggingEnvironment } from "../logging/environment"
import type {
  DiagnosticsProvider,
  DiagnosticsStrategy,
  ExportGate,
} from "./contracts"
import type { DiagnosticsSink } from "./dispatcher"

type Identity = { environment: LogEnvironment; release?: string }
export type DiagnosticsConfig =
  | { provider: "none" }
  | (Identity & { provider: "sentry"; dsn: string })
  | (Identity & {
      provider: "better-stack"
      errorsDsn: string
      logsUrl: string
      logsToken: string
    })
type SelectedConfig = Exclude<DiagnosticsConfig, { provider: "none" }>

/** Lazy factories: the unselected provider's module is never imported. */
export type DiagnosticsAdapters = Partial<{
  [P in SelectedConfig["provider"]]: (
    config: Extract<SelectedConfig, { provider: P }>,
    gate: ExportGate
  ) => Promise<DiagnosticsStrategy>
}>

const https = z
  .url({ protocol: /^https$/ })
  .refine((value) => !/[?#]/.test(value))
/** Sentry-compatible DSN: public key user part and numeric project path. */
const dsn = https.refine((value) => {
  const url = URL.parse(value)
  return (
    !!url &&
    url.username !== "" &&
    !url.password &&
    /^\/\d+$/.test(url.pathname)
  )
})
const token = z.string().regex(/^[\w.-]{8,256}$/)
const releaseSchema = z.string().regex(/^[0-9a-f]{7,40}$/)

const configSchema = z.discriminatedUnion("DIAGNOSTICS_PROVIDER", [
  z.object({ DIAGNOSTICS_PROVIDER: z.literal("none") }),
  z.object({ DIAGNOSTICS_PROVIDER: z.literal("sentry"), SENTRY_DSN: dsn }),
  z.object({
    DIAGNOSTICS_PROVIDER: z.literal("better-stack"),
    BETTER_STACK_ERRORS_DSN: dsn,
    BETTER_STACK_LOGS_URL: https,
    BETTER_STACK_LOGS_TOKEN: token,
  }),
])

/**
 * Startup-only selection (SPEC 11.2). Invalid selected configuration disables
 * export; it never falls back to another provider's credentials.
 */
export function parseDiagnosticsConfig(
  environment: Record<string, string | undefined> = process.env
): DiagnosticsConfig | { provider: "invalid" } {
  const parsed = configSchema.safeParse({
    ...environment,
    DIAGNOSTICS_PROVIDER: environment.DIAGNOSTICS_PROVIDER ?? "none",
  })
  if (!parsed.success) return { provider: "invalid" }
  const selected = parsed.data
  if (selected.DIAGNOSTICS_PROVIDER === "none") return { provider: "none" }
  const release = releaseSchema.safeParse(environment.VERCEL_GIT_COMMIT_SHA)
  const identity: Identity = {
    environment: loggingEnvironment(environment),
    ...(release.success ? { release: release.data } : {}),
  }
  return selected.DIAGNOSTICS_PROVIDER === "sentry"
    ? { provider: "sentry", dsn: selected.SENTRY_DSN, ...identity }
    : {
        provider: "better-stack",
        errorsDsn: selected.BETTER_STACK_ERRORS_DSN,
        logsUrl: selected.BETTER_STACK_LOGS_URL,
        logsToken: selected.BETTER_STACK_LOGS_TOKEN,
        ...identity,
      }
}

const started = new WeakSet<DiagnosticsSink>()

/** Call once from Node startup. Failures stay local and leave export disabled. */
export async function startDiagnostics(
  dispatcher: DiagnosticsSink,
  adapters: DiagnosticsAdapters,
  environment: Record<string, string | undefined> = process.env
): Promise<DiagnosticsProvider | "disabled"> {
  const config = parseDiagnosticsConfig(environment)
  if (config.provider === "none") return "none"
  if (config.provider === "invalid") {
    dispatcher.notice("config_invalid")
    return "disabled"
  }
  if (started.has(dispatcher))
    return dispatcher.active() ? config.provider : "disabled"
  started.add(dispatcher)
  try {
    const factory = adapters[config.provider] as
      | ((
          config: SelectedConfig,
          gate: ExportGate
        ) => Promise<DiagnosticsStrategy>)
      | undefined
    if (!factory) throw new Error("adapter unavailable")
    dispatcher.install(await factory(config, dispatcher.gate), {
      release: config.release,
    })
    return config.provider
  } catch {
    dispatcher.notice("provider_unavailable")
    return "disabled"
  }
}
