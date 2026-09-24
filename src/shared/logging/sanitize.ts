const outcomes = [
  "completed",
  "failed",
  "refused",
  "suppressed",
  "timeout",
  "fallback",
] as const
const transports = ["mailbox", "suppressed", "resend"] as const
export const errorCodes = {
  ETIMEDOUT: "timeout",
  ECONNREFUSED: "unavailable",
  ECONNRESET: "unavailable",
  EPIPE: "unavailable",
  ENOTFOUND: "unavailable",
  "23505": "conflict",
  "23503": "constraint",
} as const

export type SafeMetadata = {
  outcome?: (typeof outcomes)[number]
  durationMs?: number
  transport?: (typeof transports)[number]
  error?: { kind: string; code?: keyof typeof errorCodes }
}

/** Read only own data properties. Do not run getters, toJSON or Error serializers. */
export function ownValue(input: unknown, key: string): unknown {
  if (!input || typeof input !== "object") return undefined
  try {
    const descriptor = Object.getOwnPropertyDescriptor(input, key)
    return descriptor && "value" in descriptor ? descriptor.value : undefined
  } catch {
    return undefined
  }
}

/** Fixed projection: four keys, one nested level, no arbitrary strings/collections. */
export function sanitizeMetadata(input: unknown): SafeMetadata {
  const safe: SafeMetadata = {}
  const outcome = ownValue(input, "outcome")
  const duration = ownValue(input, "durationMs")
  const transport = ownValue(input, "transport")
  const error = ownValue(input, "error")
  if (
    typeof outcome === "string" &&
    outcomes.includes(outcome as SafeMetadata["outcome"] & string)
  ) {
    safe.outcome = outcome as SafeMetadata["outcome"]
  }
  if (
    typeof duration === "number" &&
    Number.isFinite(duration) &&
    duration >= 0 &&
    duration <= 86_400_000
  ) {
    safe.durationMs = duration
  }
  if (
    typeof transport === "string" &&
    transports.includes(transport as SafeMetadata["transport"] & string)
  ) {
    safe.transport = transport as SafeMetadata["transport"]
  }
  if (error !== undefined) {
    const code = ownValue(error, "code")
    safe.error =
      typeof code === "string" && Object.hasOwn(errorCodes, code)
        ? {
            kind: errorCodes[code as keyof typeof errorCodes],
            code: code as keyof typeof errorCodes,
          }
        : { kind: "unexpected" }
  }
  return safe
}
