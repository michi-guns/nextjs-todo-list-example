import { z } from "zod"

/** Header and components match `src/shared/health/handler.ts`. */
const HEALTH_SECRET_HEADER = "x-health-secret"
const COMPONENTS = ["app", "database", "cms"] as const
type Component = (typeof COMPONENTS)[number]

const SAFE_WORD = /^[a-z_]{1,40}$/
const bodySchema = z.object({
  component: z.string().optional(),
  status: z.string(),
  code: z.string().optional(),
  release: z.string().optional(),
})

export type HealthSmokeReason =
  | "unreachable"
  | "unavailable"
  | "refused"
  | "release_mismatch"
  | "invalid_response"

/** Carries only fixed vocabulary: never URLs, secrets or response text. */
export class HealthSmokeError extends Error {
  constructor(
    readonly component: Component,
    readonly reason: HealthSmokeReason,
    readonly code?: string
  ) {
    super(
      `Deployed ${component} health check failed: ${reason}${code ? ` (${code})` : ""}`
    )
    this.name = "HealthSmokeError"
  }
}

export interface HealthSmokeInput {
  /** The exact deployment origin under test. */
  readonly origin: string
  /** The resolved commit the deployment must be running. */
  readonly commitSha: string
  /** Environment-scoped monitor secret for dependency probes. */
  readonly secret: string
  readonly request?: typeof fetch
  readonly timeoutMs?: number
  /** Dependency attempts; a cold database or CMS may need a retry. */
  readonly attempts?: number
  readonly pauseMs?: number
}

const SECRET_PATTERN = /^[\x21-\x7e]{32,256}$/

/**
 * The environment-scoped monitor secret delivery forwards to the app and
 * uses for its own smoke. Same rule as the app's `resolveHealthAccess`, so a
 * value the app would ignore is refused before anything is deployed.
 */
export function readHealthProbeSecret(
  environment: Readonly<Record<string, string | undefined>>
): string {
  const secret = environment.HEALTH_PROBE_SECRET?.trim()
  if (!secret || !SECRET_PATTERN.test(secret))
    throw new Error(
      "HEALTH_PROBE_SECRET must be 32-256 printable characters in this environment"
    )
  return secret
}

const RETRYABLE = new Set(["timeout", "unreachable"])

/**
 * Checks the running release identity and database/CMS readiness through the
 * deployment's own health endpoints. A redirect, a cached landing page or a
 * provider's metadata is not accepted as evidence of either.
 */
export async function smokeDeployedHealth(
  input: HealthSmokeInput
): Promise<Record<Component, "ok">> {
  const request = input.request ?? fetch
  const origin = new URL(input.origin).origin
  const attempts = Math.max(1, input.attempts ?? 3)
  const pause = (ms: number) => new Promise((done) => setTimeout(done, ms))

  async function check(component: Component): Promise<void> {
    for (let attempt = 1; ; attempt += 1) {
      const retry = attempt < attempts && component !== "app"
      let response: Response
      try {
        response = await request(`${origin}/api/health/${component}`, {
          headers:
            component === "app"
              ? undefined
              : { [HEALTH_SECRET_HEADER]: input.secret },
          redirect: "error",
          signal: AbortSignal.timeout(input.timeoutMs ?? 10_000),
        })
      } catch {
        if (retry) {
          await pause(input.pauseMs ?? 2_000)
          continue
        }
        throw new HealthSmokeError(component, "unreachable")
      }
      const parsed = bodySchema
        .partial()
        .safeParse(await response.json().catch(() => null))
      const body = parsed.success ? parsed.data : {}
      const code =
        body.code && SAFE_WORD.test(body.code) ? body.code : undefined
      if (response.status === 401 || response.status === 404)
        throw new HealthSmokeError(component, "refused", code)
      if (!parsed.success || !body.status)
        throw new HealthSmokeError(component, "invalid_response")
      if (response.status === 200 && body.status === "ok") {
        if (body.component !== component)
          throw new HealthSmokeError(component, "invalid_response")
        if (body.release !== input.commitSha.toLowerCase())
          throw new HealthSmokeError(component, "release_mismatch")
        return
      }
      if (response.status === 503 && retry && code && RETRYABLE.has(code)) {
        await pause(input.pauseMs ?? 2_000)
        continue
      }
      throw new HealthSmokeError(component, "unavailable", code)
    }
  }

  // Identity first: a wrong release makes dependency answers meaningless.
  for (const component of COMPONENTS) await check(component)
  return { app: "ok", database: "ok", cms: "ok" }
}
