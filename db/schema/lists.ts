import { sql } from "drizzle-orm"
import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"

import { usersTable } from "./auth"

export const listsTable = pgTable(
  "lists",
  {
    id: uuid("id")
      .default(sql`uuidv7()`)
      .primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("lists_user_name_unique_idx").using(
      "btree",
      table.userId,
      sql`lower(${table.name})`
    ),
    index("lists_user_created_at_id_idx").using(
      "btree",
      table.userId,
      table.createdAt.asc(),
      table.id.asc()
    ),
  ]
)

export type InsertList = typeof listsTable.$inferInsert
export type SelectList = typeof listsTable.$inferSelect
