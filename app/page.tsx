import { draftMode } from "next/headers"
import { VisualEditing } from "next-sanity/visual-editing"

import { ExitPreview } from "@/components/landing/exit-preview"
import { LandingPage } from "@/components/landing/landing-page"
import { readLandingPreview } from "@/src/modules/landing/infrastructure/sanity-landing-preview-reader"
import { getPublishedLandingContent } from "@/src/modules/landing/infrastructure/sanity-landing-reader"
import { landingEditAttributes } from "@/src/modules/landing/presentation/sanity-preview"
import { isEditorialPreviewSession } from "@/src/sanity/preview-config"
import { parseRuntimeEnvironment } from "@/src/shared/environment/runtime"
import { runLoggedOperation } from "@/src/shared/logging/server"

export const metadata = {
  title: "Focus Rail",
  description: "A calm, private place for your next task.",
}

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export default async function Page() {
  const preview = parseRuntimeEnvironment().editorialPreview
  if (isEditorialPreviewSession((await draftMode()).isEnabled, preview)) {
    // Authorized editorial session: draft reads, Live refresh and overlays.
    const { editorialLive } = await import("@/src/sanity/preview")
    const { sanityFetch, SanityLive } = editorialLive(preview.token)
    const content = await runLoggedOperation("landing", "landing.preview", () =>
      readLandingPreview(sanityFetch)
    )
    return (
      <>
        <LandingPage
          content={content}
          editAttributes={landingEditAttributes()}
        />
        <SanityLive includeDrafts action="refresh" />
        <VisualEditing />
        <ExitPreview />
      </>
    )
  }

  const content = await runLoggedOperation("landing", "landing.read", () =>
    getPublishedLandingContent()
  )

  return <LandingPage content={content} />
}
