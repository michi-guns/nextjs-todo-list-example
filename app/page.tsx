import { LandingPage } from "@/components/landing/landing-page"
import { getPublishedLandingContent } from "@/src/modules/landing/infrastructure/sanity-landing-reader"

export const metadata = {
  title: "Focus Rail",
  description: "A calm, private place for your next task.",
}

export const runtime = "nodejs"

export default async function Page() {
  const content = await getPublishedLandingContent()

  return <LandingPage content={content} />
}
