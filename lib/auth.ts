import { db } from "@/db/db" // your drizzle instance
import {
  accountsTable,
  sessionsTable,
  usersTable,
  verification,
} from "@/db/schema/auth"
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg", // or "mysql", "sqlite"
    schema: {
      account: accountsTable,
      session: sessionsTable,
      user: usersTable,
      verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
  },
})
