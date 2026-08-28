import { attachDatabasePool } from "@vercel/functions"
import { drizzle } from "drizzle-orm/node-postgres"

import { createDatabasePool } from "./pool"

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not defined")
}

export const pool = createDatabasePool(databaseUrl)
attachDatabasePool(pool)

export const db = drizzle({ client: pool })
