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

export const logPolicySchema = z.strictObject({
  schemaVersion: z.literal(1),
  revision: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  enabled: z.boolean(),
  minimumLevel: z.enum(logLevels),
  moduleLevels: z
    .record(logName, z.enum([...logLevels, "off"]))
    .refine((levels) => Object.keys(levels).length <= 100),
  suppressedEvents: z.array(logName).max(100),
})

export type LogPolicy = Readonly<
  Omit<z.infer<typeof logPolicySchema>, "moduleLevels" | "suppressedEvents"> & {
    moduleLevels: Readonly<Record<string, LogLevel | "off">>
    suppressedEvents: readonly string[]
  }
>

function freezePolicy(policy: z.infer<typeof logPolicySchema>): LogPolicy {
  Object.freeze(policy.moduleLevels)
  Object.freeze(policy.suppressedEvents)
  return Object.freeze(policy)
}

export const defaultLogPolicy = freezePolicy({
  schemaVersion: 1,
  revision: 0,
  enabled: true,
  minimumLevel: "info",
  moduleLevels: {},
  suppressedEvents: [],
})

/** In-memory only. The later settings cache supplies validated newer revisions. */
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

export function permits(
  policy: LogPolicy,
  module: string,
  event: string,
  level: LogLevel
): boolean {
  if (!policy.enabled || policy.suppressedEvents.includes(event)) return false
  const threshold = Object.hasOwn(policy.moduleLevels, module)
    ? policy.moduleLevels[module]
    : policy.minimumLevel
  return (
    threshold !== "off" &&
    logLevels.indexOf(level) >= logLevels.indexOf(threshold)
  )
}
