import { config } from "dotenv"

config({ path: ".env.local" })

try {
  const { getPublishedLandingContent } =
    await import("../src/modules/landing/infrastructure/sanity-landing-reader")
  const landingContent = await getPublishedLandingContent()

  console.log(
    `Sanity landing smoke passed: ${JSON.stringify({
      fields: Object.keys(landingContent).sort(),
    })}`
  )
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)

  console.error(`Sanity landing smoke failed: ${message}`)
  process.exitCode = 1
}
