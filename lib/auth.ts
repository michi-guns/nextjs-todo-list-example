import { db } from "@/db/db"
import {
  accountsTable,
  sessionsTable,
  usersTable,
  verification,
} from "@/db/schema/auth"
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { magicLink } from "better-auth/plugins"

import { deliverAuthEmail } from "@/src/modules/auth/infrastructure/auth-mail"

const configuredBaseUrl =
  process.env.BETTER_AUTH_URL?.trim() ||
  (process.env.APP_ENV === "preview" && process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : undefined)
const configuredSecret = process.env.BETTER_AUTH_SECRET?.trim()

if (process.env.NODE_ENV === "production" && !configuredSecret) {
  throw new Error("BETTER_AUTH_SECRET is required in production")
}

function getTrustedOrigins() {
  const origins: string[] = []

  if (configuredBaseUrl) {
    origins.push(new URL(configuredBaseUrl).origin)
  }

  if (process.env.APP_ENV === "preview" && process.env.VERCEL_URL) {
    origins.push(`https://${process.env.VERCEL_URL}`)
  }

  if (process.env.NODE_ENV !== "production") {
    origins.push("http://localhost:3000", "http://127.0.0.1:3000")
  }

  return [...new Set(origins)]
}

export const auth = betterAuth({
  ...(configuredBaseUrl ? { baseURL: configuredBaseUrl } : {}),
  ...(configuredSecret ? { secret: configuredSecret } : {}),
  trustedOrigins: getTrustedOrigins(),
  database: drizzleAdapter(db, {
    provider: "pg", // or "mysql", "sqlite"
    schema: {
      account: accountsTable,
      session: sessionsTable,
      user: usersTable,
      verification,
    },
  }),
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url, token }) => {
      await deliverAuthEmail({
        email: user.email,
        url,
        token,
        metadata: { kind: "email-verification" },
      })
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    autoSignIn: true,
  },
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url, token, metadata }) => {
        await deliverAuthEmail({
          email,
          url,
          token,
          metadata,
        })
      },
    }),
  ],
})
