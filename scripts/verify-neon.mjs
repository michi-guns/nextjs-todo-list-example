import { readFileSync } from "fs";
import { neon } from "@neondatabase/serverless";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      let v = l.slice(i + 1);
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      return [l.slice(0, i), v];
    })
);

if (!env.DATABASE_URL) {
  console.error("DATABASE_URL missing from .env.local");
  process.exit(1);
}

const sql = neon(env.DATABASE_URL);
const rows = await sql`SELECT 1 AS ok`;
console.log("connection ok:", JSON.stringify(rows));
