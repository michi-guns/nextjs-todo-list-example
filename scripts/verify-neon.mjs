import { readFileSync } from "fs"
import { drizzle } from "drizzle-orm/node-postgres"
import { sql } from "drizzle-orm"
import { Pool } from "pg"

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=")
      let v = l.slice(i + 1)
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1)
      }
      return [l.slice(0, i), v]
    })
)

if (!env.DATABASE_URL) {
  console.error("DATABASE_URL missing from .env.local")
  process.exit(1)
}

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 20_000,
  connectionTimeoutMillis: 10_000,
})
const db = drizzle({ client: pool })

try {
  const result = await db.execute(sql`SELECT 1 AS ok`)
  console.log("connection ok:", JSON.stringify(result.rows))
} finally {
  await pool.end()
}
