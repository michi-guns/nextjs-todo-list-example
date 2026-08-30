import { config } from "dotenv"

config({ path: ".env.local" })

try {
  const [
    { createSanityClient },
    { createSanityLandingContentRepositoryFromClient },
    { getLandingContent },
  ] = await Promise.all([
    import("../src/sanity/client-factory"),
    import("../src/modules/landing/infrastructure/sanity-landing-source"),
    import("../src/modules/landing/application/get-landing-content"),
  ])
  const landingContent = await getLandingContent(
    createSanityLandingContentRepositoryFromClient(createSanityClient())
  )

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
