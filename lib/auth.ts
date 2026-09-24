import { db, logging, pool } from "@/db/db"
import {
  accountsTable,
  sessionsTable,
  usersTable,
  verification,
} from "@/db/schema/auth"
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { createAuthMiddleware } from "better-auth/api"
import { magicLink } from "better-auth/plugins"

import {
  admitRecipientRequest,
  authIpAddressOptions,
  authRateLimitOptions,
} from "@/src/modules/auth/infrastructure/auth-config"
import { createAuthMailer } from "@/src/modules/auth/infrastructure/auth-mail"
import { AUTH_ADMISSION_POLICY } from "@/src/modules/auth/infrastructure/auth-policy"
import {
  createAdmissionStore,
  createAuthAdmission,
} from "@/src/modules/auth/infrastructure/auth-rate-limit"
import { currentAuthMailScheduler } from "@/src/modules/auth/infrastructure/mail-scheduler"
import { parseRuntimeEnvironment } from "@/src/shared/environment/runtime"
import { createOperationRunner } from "@/src/shared/logging/operation"

// Validated before the client exists; Preview keeps its assigned origin.
const runtime = parseRuntimeEnvironment()
const configuredBaseUrl = runtime.auth.baseUrl
const configuredSecret = runtime.auth.secret

function getTrustedOrigins() {
  const origins: string[] = []

  if (configuredBaseUrl) {
    origins.push(configuredBaseUrl)
  }

  if (process.env.APP_ENV === "preview" && process.env.VERCEL_URL) {
    origins.push(`https://${process.env.VERCEL_URL}`)
  }

  if (process.env.NODE_ENV !== "production") {
    origins.push("http://localhost:3000", "http://127.0.0.1:3000")
  }

  return [...new Set(origins)]
}

// Shared admission counters live in the selected database. `pool` is an
// autocommit Pool, so every decision is its own statement on database time.
const admission = createAuthAdmission({
  store: createAdmissionStore(pool),
  // The effective Better Auth secret; rotating it deliberately starts fresh
  // counters. Unprofiled local runs may rely on the library's own default.
  secret:
    configuredSecret ??
    process.env.BETTER_AUTH_SECRET ??
    process.env.AUTH_SECRET ??
    "unprofiled-local-auth-admission",
  environment: runtime.profile,
  onUnavailable: (purpose) =>
    logging
      .logger("auth")
      .emit(
        "warn",
        purpose === "http"
          ? "auth.admission.unavailable"
          : "auth.mail.admission.unavailable",
        { outcome: "failed" }
      ),
})

// Mail work runs after the response (Next `after()`), or on the explicit
// scheduler a seed or test selected, inside its own logged operation.
const { run: runLogged } = createOperationRunner(logging)
const mailer = createAuthMailer({
  admission,
  scheduler: () => ({
    schedule: (task) =>
      currentAuthMailScheduler().schedule(() =>
        runLogged("auth", "auth.mail.send", task)
      ),
  }),
  onDenied: (reason) =>
    logging
      .logger("auth")
      .emit(
        "warn",
        reason === "limited"
          ? "auth.mail.send.limited"
          : reason === "unavailable"
            ? "auth.mail.send.unavailable"
            : "auth.mail.send.invalid",
        { outcome: reason === "unavailable" ? "failed" : "refused" }
      ),
})

export const auth = betterAuth({
  ...(configuredBaseUrl ? { baseURL: configuredBaseUrl } : {}),
  ...(configuredSecret ? { secret: configuredSecret } : {}),
  trustedOrigins: getTrustedOrigins(),
  rateLimit: authRateLimitOptions(admission.customStorage),
  advanced: { ipAddress: authIpAddressOptions(process.env) },
  hooks: {
    before: createAuthMiddleware(async (ctx) =>
      admitRecipientRequest(admission, ctx.path, ctx.body)
    ),
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
      mailer.send({
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
    resetPasswordTokenExpiresIn:
      AUTH_ADMISSION_POLICY.resetPasswordTokenSeconds,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url, token }) => {
      mailer.send({
        email: user.email,
        url,
        token,
        metadata: { kind: "password-reset" },
      })
    },
  },
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url, token, metadata }) => {
        // The message kind is auth-owned; client metadata cannot change it.
        mailer.send({
          email,
          url,
          token,
          metadata: { ...metadata, kind: "magic-link" },
        })
      },
    }),
  ],
})
