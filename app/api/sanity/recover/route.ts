import { landingContentInvalidationService } from "../../../../src/modules/landing/infrastructure/sanity-invalidation"
import { handleManualLandingRecovery } from "../../../../src/modules/landing/presentation/sanity-revalidation"
import { runLoggedOperation } from "@/src/shared/logging/server"

export const runtime = "nodejs"

export async function POST(request: Request) {
  return runLoggedOperation("sanity", "sanity.recover", () =>
    handleManualLandingRecovery(request, {
      manualRecoverySecret: process.env.SANITY_MANUAL_RECOVERY_SECRET,
      invalidate: () => landingContentInvalidationService.invalidate(),
    })
  )
}
