import { config } from "dotenv"
import { createClient } from "next-sanity"

config({ path: ".env.local" })

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET
const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2026-08-27"

if (!projectId) {
  throw new Error("Missing NEXT_PUBLIC_SANITY_PROJECT_ID")
}

if (!dataset) {
  throw new Error("Missing NEXT_PUBLIC_SANITY_DATASET")
}

const client = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: true,
})

const landingPage = await client.fetch(
  '*[_id == "landingPage" && _type == "landingPage"][0]{_id,_type,headline,blurb,primaryCtaLabel,secondaryCtaLabel}'
)

if (!landingPage) {
  throw new Error("Published landingPage singleton was not found")
}

if (landingPage._id !== "landingPage" || landingPage._type !== "landingPage") {
  throw new Error("Published landingPage singleton has an unexpected identity")
}

const requiredFields = ["headline", "blurb", "primaryCtaLabel"]
const missingFields = requiredFields.filter(
  (field) =>
    typeof landingPage[field] !== "string" ||
    landingPage[field].trim().length === 0
)

if (missingFields.length > 0) {
  throw new Error(
    `Published landingPage singleton is missing required fields: ${missingFields.join(", ")}`
  )
}

if (
  landingPage.secondaryCtaLabel !== undefined &&
  landingPage.secondaryCtaLabel !== null &&
  typeof landingPage.secondaryCtaLabel !== "string"
) {
  throw new Error(
    "Published landingPage secondaryCtaLabel must be a string when present"
  )
}

console.log(
  `Sanity landing smoke passed: ${JSON.stringify({
    id: landingPage._id,
    type: landingPage._type,
    fields: Object.keys(landingPage).sort(),
  })}`
)
