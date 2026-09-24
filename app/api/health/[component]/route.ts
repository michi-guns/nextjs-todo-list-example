import { logging, pool } from "@/db/db"
import { createPublishedLandingProbe } from "@/src/modules/landing/infrastructure/sanity-landing-health"
import { withLogContext } from "@/src/shared/logging/context"
import {
  createHealthHandler,
  resolveHealthAccess,
  resolveRelease,
} from "@/src/shared/health/handler"
import {
  createDatabaseProbe,
  type ProbeResult,
} from "@/src/shared/health/probes"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * `/api/health/app|database|cms`. Liveness is public; dependency probes are
 * bounded, single-flight per instance and protected in remote profiles.
 * Settings refresh is deliberately skipped so liveness never waits on the
 * database, and the CMS client loads on the first CMS probe so missing CMS
 * configuration cannot take liveness down.
 */
let cmsProbe: Promise<() => Promise<ProbeResult>> | undefined
function probeCmsLazily(): Promise<ProbeResult> {
  cmsProbe ??= import("@/src/sanity/client").then(({ sanityClient }) =>
    createPublishedLandingProbe(sanityClient)
  )
  return cmsProbe.then(
    (probe) => probe(),
    (error: unknown) => {
      cmsProbe = undefined // Retry after the configuration is fixed.
      throw error
    }
  )
}

export const GET = createHealthHandler({
  probes: {
    database: createDatabaseProbe(pool),
    cms: probeCmsLazily,
  },
  release: resolveRelease(),
  access: resolveHealthAccess(),
  // Operational signal only: the uptime monitor owns alerting, not issues.
  onUnavailable: async (component, code) => {
    withLogContext("health.read", () =>
      logging.logger("health").emit("warn", `health.${component}.unavailable`, {
        outcome: code === "timeout" ? "timeout" : "failed",
      })
    )
    // Provider log export, when policy allows it, is sent before the answer.
    await logging.flush()
  },
})
