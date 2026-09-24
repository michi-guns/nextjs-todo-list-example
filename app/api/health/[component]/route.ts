import { logging, pool } from "@/db/db"
import { createPublishedLandingProbe } from "@/src/modules/landing/infrastructure/sanity-landing-health"
import { sanityClient } from "@/src/sanity/client"
import { withLogContext } from "@/src/shared/logging/context"
import {
  createHealthHandler,
  resolveHealthAccess,
  resolveRelease,
} from "@/src/shared/health/handler"
import { createDatabaseProbe } from "@/src/shared/health/probes"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * `/api/health/app|database|cms`. Liveness is public; dependency probes are
 * bounded, single-flight per instance and protected in remote profiles.
 * Settings refresh is deliberately skipped so liveness never waits on the
 * database.
 */
export const GET = createHealthHandler({
  probes: {
    database: createDatabaseProbe(pool),
    cms: createPublishedLandingProbe(sanityClient),
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
