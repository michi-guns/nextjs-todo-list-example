import { createHash, timingSafeEqual } from "node:crypto"

import type { ProbeResult } from "./probes"

export type DependencyComponent = "database" | "cms"
export type HealthAccess =
  | { readonly mode: "open" }
  | { readonly mode: "protected"; readonly secret: string }
  /** Remote profile without monitor configuration: never reported ready. */
  | { readonly mode: "unconfigured" }

/** Header carrying the operator/monitor secret; never a URL or query value. */
export const HEALTH_SECRET_HEADER = "x-health-secret"

const RELEASE_PATTERN = /^[0-9a-f]{40}$/
const SECRET_PATTERN = /^[\x21-\x7e]{32,256}$/

/**
 * Resolved release identity. A hosted runtime without a supplied SHA says
 * `unknown` rather than substituting one; local processes are `unreleased`.
 */
export function resolveRelease(
  environment: Record<string, string | undefined> = process.env
): string {
  for (const candidate of [
    environment.APP_RELEASE_SHA,
    environment.VERCEL_GIT_COMMIT_SHA,
  ]) {
    const value = candidate?.trim().toLowerCase()
    if (value && RELEASE_PATTERN.test(value)) return value
  }
  return isRemote(environment) ? "unknown" : "unreleased"
}

function isRemote(environment: Record<string, string | undefined>) {
  return (
    environment.VERCEL === "1" ||
    environment.APP_ENV === "preview" ||
    environment.APP_ENV === "production"
  )
}

/** Dependency probes are protected in remote profiles; optional elsewhere. */
export function resolveHealthAccess(
  environment: Record<string, string | undefined> = process.env
): HealthAccess {
  const secret = environment.HEALTH_PROBE_SECRET?.trim()
  if (secret && SECRET_PATTERN.test(secret))
    return { mode: "protected", secret }
  return isRemote(environment) ? { mode: "unconfigured" } : { mode: "open" }
}

function digest(value: string) {
  return createHash("sha256").update(value).digest()
}

function authorized(access: HealthAccess, request: Request) {
  if (access.mode !== "protected") return access.mode === "open"
  const supplied = request.headers.get(HEALTH_SECRET_HEADER) ?? ""
  // Equal-length digests keep the comparison constant-time.
  return timingSafeEqual(digest(supplied), digest(access.secret))
}

function respond(status: number, body: Record<string, string>) {
  return Response.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  })
}

/**
 * Provider-neutral liveness and dependency readiness. Bodies carry only the
 * component, a fixed status/code vocabulary and the release identity: never
 * target URLs, credentials or raw errors.
 */
export function createHealthHandler(dependencies: {
  probes: Record<DependencyComponent, () => Promise<ProbeResult>>
  release: string
  access: HealthAccess
  /** Awaited so a bounded log flush completes before the response. */
  onUnavailable?: (
    component: DependencyComponent,
    code: string
  ) => void | Promise<void>
}) {
  const { probes, release, access } = dependencies
  return async function GET(
    request: Request,
    context: { params: Promise<{ component: string }> }
  ): Promise<Response> {
    const { component } = await context.params
    if (component === "app") {
      return respond(200, { component, status: "ok", release })
    }
    if (component !== "database" && component !== "cms") {
      return respond(404, { status: "unknown_component" })
    }
    if (access.mode === "unconfigured") {
      return respond(503, {
        component,
        status: "unavailable",
        code: "monitor_unconfigured",
        release,
      })
    }
    if (!authorized(access, request)) {
      return respond(401, {
        component,
        status: "refused",
        code: "unauthorized",
      })
    }
    const result = await probes[component]()
    if (result.status === "ok") {
      return respond(200, { component, status: "ok", release })
    }
    try {
      await dependencies.onUnavailable?.(component, result.code)
    } catch {
      // Observability never changes the health answer.
    }
    return respond(503, {
      component,
      status: "unavailable",
      code: result.code,
      release,
    })
  }
}
