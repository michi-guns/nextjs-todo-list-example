import { db } from "@/db/db" // your drizzle instance
import {
  accountsTable,
  sessionsTable,
  usersTable,
  verification,
} from "@/db/schema/auth"
import { betterAuth } from "better-auth"
import { APIError, createAuthMiddleware } from "better-auth/api"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { magicLink } from "better-auth/plugins"
import { z } from "zod"

import { captureMagicLink } from "@/src/modules/auth/infrastructure/local-mailbox"

const configuredBaseUrl = process.env.BETTER_AUTH_URL?.trim()
const configuredSecret = process.env.BETTER_AUTH_SECRET?.trim()

if (process.env.NODE_ENV === "production" && !configuredSecret) {
  throw new Error("BETTER_AUTH_SECRET is required in production")
}

function getTrustedOrigins() {
  const origins: string[] = []

  if (configuredBaseUrl) {
    origins.push(new URL(configuredBaseUrl).origin)
  }

  if (process.env.NODE_ENV !== "production") {
    origins.push("http://localhost:3000", "http://127.0.0.1:3000")
  }

  return [...new Set(origins)]
}

const magicLinkPayloadSchema = z.object({ email: z.email() })

const requireVerifiedMagicLinkAccount = createAuthMiddleware(async (ctx) => {
  if (ctx.path !== "/magic-link/verify") {
    return
  }

  const token = typeof ctx.query?.token === "string" ? ctx.query.token : null
  if (!token) {
    return
  }

  const pendingVerification =
    await ctx.context.internalAdapter.findVerificationValue(token)
  if (!pendingVerification) {
    return
  }

  let payload: unknown
  try {
    payload = JSON.parse(pendingVerification.value) as unknown
  } catch {
    return
  }

  const parsedPayload = magicLinkPayloadSchema.safeParse(payload)
  if (!parsedPayload.success) {
    return
  }

  const userRecord = await ctx.context.internalAdapter.findUserByEmail(
    parsedPayload.data.email
  )
  if (userRecord?.user && !userRecord.user.emailVerified) {
    throw new APIError("FORBIDDEN", {
      message: "Verify your email before using a magic link",
    })
  }
})

export const auth = betterAuth({
  ...(configuredBaseUrl ? { baseURL: configuredBaseUrl } : {}),
  ...(configuredSecret ? { secret: configuredSecret } : {}),
  trustedOrigins: getTrustedOrigins(),
  hooks: {
    before: requireVerifiedMagicLinkAccount,
  },
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
      await captureMagicLink({
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
        await captureMagicLink({
          email,
          url,
          token,
          metadata,
        })
      },
    }),
  ],
})
