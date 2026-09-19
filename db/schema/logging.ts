import { sql } from "drizzle-orm"
import { bigint, check, jsonb, pgTable, smallint } from "drizzle-orm/pg-core"

export const loggingSettingsTable = pgTable(
  "logging_settings",
  {
    id: smallint("id").primaryKey(),
    revision: bigint("revision", { mode: "number" }).notNull(),
    policy: jsonb("policy").$type<unknown>().notNull(),
  },
  (table) => [
    check("logging_settings_singleton", sql`${table.id} = 1`),
    check(
      "logging_settings_revision_range",
      sql`${table.revision} BETWEEN 1 AND 9007199254740991`
    ),
  ]
)
