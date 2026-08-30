import type { NextRequest } from "next/server"

import { landingContentInvalidationService } from "../../../../src/modules/landing/infrastructure/sanity-invalidation"
import { handleSanityWebhook } from "../../../../src/modules/landing/presentation/sanity-revalidation"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  return handleSanityWebhook(request, {
    webhookSecret: process.env.SANITY_REVALIDATE_SECRET,
    invalidate: () => landingContentInvalidationService.invalidate(),
  })
}
