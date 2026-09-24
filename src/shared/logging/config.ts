import { z } from "zod"

export const logLevels = [
  "trace",
  "debug",
  "info",
  "warn",
  "error",
  "fatal",
] as const
export type LogLevel = (typeof logLevels)[number]
export const logEnvironmentSchema = z.enum([
  "local",
  "development",
  "preview",
  "production",
])
export type LogEnvironment = z.infer<typeof logEnvironmentSchema>
export const logName = z
  .string()
  .max(80)
  .regex(/^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/)

const level = z.enum(logLevels)
const names = z.array(logName).max(100)
const thresholds = z
  .record(logName, level)
  .refine((levels) => Object.keys(levels).length <= 100)
const revision = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER)

/** Version 2 (SPEC 11.2): shared vetoes plus independent destination policies. */
const destinationPolicySchema = z.strictObject({
  schemaVersion: z.literal(2),
  revision,
  enabled: z.boolean(),
  disabledModules: names,
  suppressedEvents: names,
  console: z.strictObject({
    enabled: z.boolean(),
    minimumLevel: level,
    moduleLevels: thresholds,
  }),
  diagnostics: z.strictObject({
    enabled: z.boolean(),
    minimumLevel: level,
    moduleLevels: thresholds,
    errorReportsEnabled: z.boolean(),
  }),
})
type PolicyData = z.infer<typeof destinationPolicySchema>

/** TD-029 snapshots keep console behavior; an old row never enables export. */
const legacyPolicySchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    revision,
    enabled: z.boolean(),
    minimumLevel: level,
    moduleLevels: z
      .record(logName, z.enum([...logLevels, "off"]))
      .refine((levels) => Object.keys(levels).length <= 100),
    suppressedEvents: names,
  })
  .transform((legacy): PolicyData => ({
    schemaVersion: 2,
    revision: legacy.revision,
    enabled: legacy.enabled,
    disabledModules: Object.keys(legacy.moduleLevels).filter(
      (module) => legacy.moduleLevels[module] === "off"
    ),
    suppressedEvents: legacy.suppressedEvents,
    console: {
      enabled: true,
      minimumLevel: legacy.minimumLevel,
      moduleLevels: Object.fromEntries(
        Object.entries(legacy.moduleLevels).filter(
          (entry): entry is [string, LogLevel] => entry[1] !== "off"
        )
      ),
    },
    diagnostics: { ...defaultDiagnostics, moduleLevels: {} },
  }))

export const logPolicySchema = z.union([
  destinationPolicySchema,
  legacyPolicySchema,
])

type Destination = Readonly<{
  enabled: boolean
  minimumLevel: LogLevel
  moduleLevels: Readonly<Record<string, LogLevel>>
}>
export type LogPolicy = Readonly<{
  schemaVersion: 2
  revision: number
  enabled: boolean
  disabledModules: readonly string[]
  suppressedEvents: readonly string[]
  console: Destination
  diagnostics: Destination & Readonly<{ errorReportsEnabled: boolean }>
}>

function freezePolicy(policy: PolicyData): LogPolicy {
  for (const part of [policy.console, policy.diagnostics]) {
    Object.freeze(part.moduleLevels)
    Object.freeze(part)
  }
  Object.freeze(policy.disabledModules)
  Object.freeze(policy.suppressedEvents)
  return Object.freeze(policy)
}

const defaultDiagnostics = {
  enabled: false,
  minimumLevel: "warn",
  errorReportsEnabled: false,
} as const

export const defaultLogPolicy = freezePolicy({
  schemaVersion: 2,
  revision: 0,
  enabled: true,
  disabledModules: [],
  suppressedEvents: [],
  console: { enabled: true, minimumLevel: "info", moduleLevels: {} },
  diagnostics: { ...defaultDiagnostics, moduleLevels: {} },
})

/** In-memory only. The settings cache supplies validated newer revisions. */
export function createLogPolicy() {
  let snapshot = defaultLogPolicy
  return {
    current: (): LogPolicy => snapshot,
    update(input: unknown): boolean {
      try {
        const result = logPolicySchema.safeParse(input)
        if (!result.success || result.data.revision <= snapshot.revision)
          return false
        snapshot = freezePolicy(result.data)
        return true
      } catch {
        return false
      }
    },
  }
}

/** Shared vetoes govern every destination, including explicit error reports. */
function vetoed(policy: LogPolicy, module: string, event: string): boolean {
  return (
    !policy.enabled ||
    policy.disabledModules.includes(module) ||
    policy.suppressedEvents.includes(event)
  )
}

function accepts(destination: Destination, module: string, level: LogLevel) {
  if (!destination.enabled) return false
  const threshold = Object.hasOwn(destination.moduleLevels, module)
    ? destination.moduleLevels[module]
    : destination.minimumLevel
  return logLevels.indexOf(level) >= logLevels.indexOf(threshold)
}

/** Each destination resolves its own threshold, so console filtering never gates export. */
export function routeLog(
  policy: LogPolicy,
  module: string,
  event: string,
  level: LogLevel
): { console: boolean; diagnostics: boolean } {
  if (vetoed(policy, module, event))
    return { console: false, diagnostics: false }
  return {
    console: accepts(policy.console, module, level),
    diagnostics: accepts(policy.diagnostics, module, level),
  }
}

/** Explicit reports ignore numeric log thresholds but need both remote controls. */
export function allowsErrorReport(
  policy: LogPolicy,
  module: string,
  event: string
): boolean {
  return (
    !vetoed(policy, module, event) &&
    policy.diagnostics.enabled &&
    policy.diagnostics.errorReportsEnabled
  )
}
