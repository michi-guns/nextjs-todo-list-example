import { sql } from "drizzle-orm"
import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"

import { usersTable } from "./auth"
import { listsTable } from "./lists"

export const taskStatusEnum = pgEnum("task_status", [
  "todo",
  "in_progress",
  "done",
])

export const tasksTable = pgTable(
  "tasks",
  {
    id: uuid("id")
      .default(sql`uuidv7()`)
      .primaryKey(),
    listId: uuid("list_id")
      .notNull()
      .references(() => listsTable.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    notes: text("notes"),
    status: taskStatusEnum("status").default("todo").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("tasks_list_title_unique_idx").using(
      "btree",
      table.listId,
      sql`lower(${table.title})`
    ),
    index("tasks_user_list_created_at_id_idx").using(
      "btree",
      table.userId,
      table.listId,
      table.createdAt.desc(),
      table.id.desc()
    ),
  ]
)

export type TaskStatus = (typeof taskStatusEnum.enumValues)[number]
export type InsertTask = typeof tasksTable.$inferInsert
export type SelectTask = typeof tasksTable.$inferSelect
