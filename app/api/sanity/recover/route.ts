import { landingContentInvalidationService } from "../../../../src/modules/landing/infrastructure/sanity-invalidation"
import { handleManualLandingRecovery } from "../../../../src/modules/landing/presentation/sanity-revalidation"

export const runtime = "nodejs"

export async function POST(request: Request) {
  return handleManualLandingRecovery(request, {
    manualRecoverySecret: process.env.SANITY_MANUAL_RECOVERY_SECRET,
    invalidate: () => landingContentInvalidationService.invalidate(),
  })
}
