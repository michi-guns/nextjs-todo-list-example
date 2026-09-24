import { sql } from "drizzle-orm"
import {
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core"

/**
 * Auth-owned fixed-window admission counters. `key` is an opaque, namespaced
 * HMAC (never a raw email or IP address); an expired row means the same as
 * an absent one and may be deleted at any time.
 */
export const authRateLimitTable = pgTable(
  "auth_rate_limit",
  {
    key: text("key").primaryKey(),
    count: integer("count").notNull(),
    windowExpiresAt: timestamp("window_expires_at", {
      withTimezone: true,
    }).notNull(),
  },
  (table) => [
    check("auth_rate_limit_count_positive", sql`${table.count} >= 1`),
    index("auth_rate_limit_window_expires_at_idx").on(table.windowExpiresAt),
  ]
)
