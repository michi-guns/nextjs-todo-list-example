import { config } from "dotenv"
import { defineConfig } from "drizzle-kit"

config({ path: "./.env.local" })

const migrationDatabaseUrl =
  process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL

if (!migrationDatabaseUrl) {
  throw new Error(
    "DATABASE_URL_UNPOOLED or DATABASE_URL is not defined for migrations"
  )
}

export default defineConfig({
  schema: "./db/schema",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: migrationDatabaseUrl,
  },
})
