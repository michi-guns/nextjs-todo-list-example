import { mkdtemp, readFile, readdir, rm } from "node:fs/promises"
import os from "node:os"
import path from "node:path"

import { Pool, type PoolClient } from "pg"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

import type { CurrentUser } from "./domain/current-user"

const testDatabaseUrl = process.env.TEST_DATABASE_URL?.trim()
const mutableEnvironment = process.env as Record<string, string | undefined>
const baseUrl = "http://localhost:3000"

if (!testDatabaseUrl) {
  throw new Error(
    "TEST_DATABASE_URL is required for the local PostgreSQL integration suite"
  )
}

function getLocalDatabaseUrl(databaseUrl: string) {
  const parsedUrl = new URL(databaseUrl)
  const localHosts = new Set(["localhost", "127.0.0.1", "::1", "[::1]"])

  if (!localHosts.has(parsedUrl.hostname)) {
    throw new Error("TEST_DATABASE_URL must point to local PostgreSQL")
  }

  if (!/^postgres(?:ql)?:$/.test(parsedUrl.protocol)) {
    throw new Error("TEST_DATABASE_URL must use the PostgreSQL URL scheme")
  }

  return databaseUrl
}

function quoteIdentifier(identifier: string) {
  return `"${identifier.replaceAll('"', '""')}"`
}

async function applyMigration(client: PoolClient, migrationSql: string) {
  const statements = migrationSql
    .split(/--> statement-breakpoint\s*/)
    .map((statement) => statement.trim())
    .filter(Boolean)

  for (const statement of statements) {
    await client.query(statement)
  }
}

async function getMigrationSqlFiles() {
  const migrationsRoot = path.resolve("migrations")
  const entries = await readdir(migrationsRoot, { withFileTypes: true })
  const directories = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()

  return Promise.all(
    directories.map(async (directory) =>
      readFile(path.join(migrationsRoot, directory, "migration.sql"), "utf8")
    )
  )
}

function getSetCookieHeaders(response: Response) {
  const responseHeaders = response.headers as Headers & {
    getSetCookie?: () => string[]
  }
  const cookies = responseHeaders.getSetCookie?.()

  if (cookies?.length) {
    return cookies
  }

  const setCookie = response.headers.get("set-cookie")
  return setCookie ? setCookie.split(/,(?=\s*[^;,=]+=[^;,]+)/) : []
}

function getCookieHeader(response: Response) {
  return getSetCookieHeaders(response)
    .map((cookie) => cookie.split(";", 1)[0])
    .join("; ")
}

let syntheticAddress = 0
function nextSyntheticAddress() {
  syntheticAddress += 1
  return `198.18.${Math.floor(syntheticAddress / 250)}.${(syntheticAddress % 250) + 1}`
}

function getResponseLocation(response: Response) {
  return response.headers.get("location") ?? ""
}

type AuthTestContext = {
  auth: typeof import("../../../lib/auth").auth
  getCurrentUserForHeaders: (
    requestHeaders: Headers
  ) => Promise<CurrentUser | null>
  requireUserForHeaders: (requestHeaders: Headers) => Promise<CurrentUser>
  readLatestMagicLink: (email: string) => Promise<{
    email: string
    url: string
    token: string
    metadata?: Record<string, unknown>
  } | null>
  clearMagicLinkMailbox: () => Promise<void>
  appPool: Pool
  drainMail: () => Promise<void>
}

describe("Better Auth boundary", { concurrent: false }, () => {
  const databaseUrl = getLocalDatabaseUrl(testDatabaseUrl)
  const schemaName = `codex_t05_${process.pid}_${Date.now()}`
  let setupPool: Pool | undefined
  let context: AuthTestContext | undefined
  let mailboxDirectory: string | undefined
  const originalEnvironment = {
    databaseUrl: mutableEnvironment.DATABASE_URL,
    betterAuthUrl: mutableEnvironment.BETTER_AUTH_URL,
    betterAuthSecret: mutableEnvironment.BETTER_AUTH_SECRET,
    nodeEnv: mutableEnvironment.NODE_ENV,
    mailboxEnabled: mutableEnvironment.BETTER_AUTH_LOCAL_MAILBOX,
    mailboxDirectory: mutableEnvironment.BETTER_AUTH_MAILBOX_DIR,
  }

  beforeAll(async () => {
    setupPool = new Pool({ connectionString: databaseUrl })
    const setupClient = await setupPool.connect()

    try {
      await setupClient.query(`CREATE SCHEMA ${quoteIdentifier(schemaName)}`)
      await setupClient.query(
        `SET search_path TO ${quoteIdentifier(schemaName)}, public`
      )

      const migrations = await getMigrationSqlFiles()
      for (const migrationSql of migrations) {
        await applyMigration(setupClient, migrationSql)
      }
    } finally {
      setupClient.release()
    }

    const appDatabaseUrl = new URL(databaseUrl)
    appDatabaseUrl.searchParams.set(
      "options",
      `-c search_path=${schemaName},public`
    )
    mailboxDirectory = await mkdtemp(
      path.join(os.tmpdir(), "t05-auth-integration-mailbox-")
    )
    mutableEnvironment.DATABASE_URL = appDatabaseUrl.toString()
    mutableEnvironment.BETTER_AUTH_URL = baseUrl
    mutableEnvironment.BETTER_AUTH_SECRET =
      "t05-integration-secret-that-is-long-enough-for-tests"
    mutableEnvironment.NODE_ENV = "test"
    mutableEnvironment.BETTER_AUTH_LOCAL_MAILBOX = "true"
    mutableEnvironment.BETTER_AUTH_MAILBOX_DIR = mailboxDirectory

    // No request scope here: mail is sent in-process and drained explicitly.
    const { selectStandaloneAuthMail } =
      await import("./infrastructure/mail-scheduler")
    const mail = selectStandaloneAuthMail()
    const [authModule, currentUserModule, mailboxModule, databaseModule] =
      await Promise.all([
        import("../../../lib/auth"),
        import("./presentation/current-user"),
        import("./infrastructure/local-mailbox"),
        import("../../../db/db"),
      ])

    context = {
      auth: authModule.auth,
      getCurrentUserForHeaders: currentUserModule.getCurrentUserForHeaders,
      requireUserForHeaders: currentUserModule.requireUserForHeaders,
      readLatestMagicLink: async (email) => {
        await mail.drain()
        return mailboxModule.readLatestMagicLink(email)
      },
      clearMagicLinkMailbox: async () => {
        await mail.drain()
        await mailboxModule.clearMagicLinkMailbox()
      },
      appPool: databaseModule.pool,
      drainMail: () => mail.drain(),
    }
  })

  afterAll(async () => {
    if (context) {
      await context.drainMail()
      await context.appPool.end()
    }
    const { selectAuthMailScheduler } =
      await import("./infrastructure/mail-scheduler")
    selectAuthMailScheduler(undefined)

    if (mailboxDirectory) {
      await rm(mailboxDirectory, { recursive: true, force: true })
    }

    if (setupPool) {
      const cleanupPool = new Pool({ connectionString: databaseUrl })
      try {
        await cleanupPool.query(
          `DROP SCHEMA IF EXISTS ${quoteIdentifier(schemaName)} CASCADE`
        )
      } finally {
        await cleanupPool.end()
        await setupPool.end()
      }
    }

    if (originalEnvironment.databaseUrl === undefined) {
      delete mutableEnvironment.DATABASE_URL
    } else {
      mutableEnvironment.DATABASE_URL = originalEnvironment.databaseUrl
    }
    if (originalEnvironment.betterAuthUrl === undefined) {
      delete mutableEnvironment.BETTER_AUTH_URL
    } else {
      mutableEnvironment.BETTER_AUTH_URL = originalEnvironment.betterAuthUrl
    }
    if (originalEnvironment.betterAuthSecret === undefined) {
      delete mutableEnvironment.BETTER_AUTH_SECRET
    } else {
      mutableEnvironment.BETTER_AUTH_SECRET =
        originalEnvironment.betterAuthSecret
    }
    if (originalEnvironment.nodeEnv === undefined) {
      delete mutableEnvironment.NODE_ENV
    } else {
      mutableEnvironment.NODE_ENV = originalEnvironment.nodeEnv
    }
    if (originalEnvironment.mailboxEnabled === undefined) {
      delete mutableEnvironment.BETTER_AUTH_LOCAL_MAILBOX
    } else {
      mutableEnvironment.BETTER_AUTH_LOCAL_MAILBOX =
        originalEnvironment.mailboxEnabled
    }
    if (originalEnvironment.mailboxDirectory === undefined) {
      delete mutableEnvironment.BETTER_AUTH_MAILBOX_DIR
    } else {
      mutableEnvironment.BETTER_AUTH_MAILBOX_DIR =
        originalEnvironment.mailboxDirectory
    }
  })

  function getContext() {
    if (!context) {
      throw new Error("The Better Auth integration context was not initialized")
    }

    return context
  }

  async function authRequest(
    pathname: string,
    init: RequestInit = {},
    cookie?: string
  ) {
    const headers = new Headers(init.headers)
    headers.set("origin", baseUrl)
    // A distinct synthetic client per request keeps unrelated steps out of
    // each other's HTTP limits; limit tests pass their own address.
    if (!headers.has("x-forwarded-for")) {
      headers.set("x-forwarded-for", nextSyntheticAddress())
    }
    if (cookie) {
      headers.set("cookie", cookie)
    }

    return getContext().auth.handler(
      new Request(`${baseUrl}${pathname}`, {
        ...init,
        headers,
      })
    )
  }

  async function consumeEmailVerification(email: string) {
    const message = await getContext().readLatestMagicLink(email)
    expect(message).toMatchObject({ email, token: expect.any(String) })
    expect(message?.url).toContain("/verify-email")

    if (!message) {
      throw new Error(
        "The local/test mailbox did not capture an email verification link"
      )
    }

    const response = await getContext().auth.handler(
      new Request(message.url, {
        headers: { origin: baseUrl },
      })
    )
    expect(response.status).toBe(302)
    return response
  }

  it("creates, uses, and ends an email/password session", async () => {
    const email = `t05-password-${Date.now()}@example.test`
    const password = "correct horse battery staple"
    await getContext().clearMagicLinkMailbox()
    const signUpResponse = await authRequest("/api/auth/sign-up/email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Password User",
        email,
        password,
      }),
    })

    expect(signUpResponse.status).toBe(200)
    const signUpPayload = (await signUpResponse.json()) as {
      user?: { id: string; email: string }
    }
    expect(signUpPayload.user).toMatchObject({ email })

    expect(getCookieHeader(signUpResponse)).toBe("")

    const verificationResponse = await consumeEmailVerification(email)
    const signedUpCookie = getCookieHeader(verificationResponse)
    expect(signedUpCookie).toContain("better-auth.session_token=")

    const signedUpUser = await getContext().getCurrentUserForHeaders(
      new Headers({ cookie: signedUpCookie })
    )
    expect(signedUpUser).toMatchObject({
      email,
      name: "Password User",
    })

    const signedOutResponse = await authRequest(
      "/api/auth/sign-out",
      { method: "POST" },
      signedUpCookie
    )
    expect(signedOutResponse.status).toBe(200)
    await expect(
      getContext().getCurrentUserForHeaders(new Headers())
    ).resolves.toBeNull()
    await expect(
      getContext().getCurrentUserForHeaders(
        new Headers({ cookie: signedUpCookie })
      )
    ).resolves.toBeNull()

    const signInResponse = await authRequest("/api/auth/sign-in/email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    })
    expect(signInResponse.status).toBe(200)
    const signedInCookie = getCookieHeader(signInResponse)
    expect(signedInCookie).toContain("better-auth.session_token=")

    await expect(
      getContext().getCurrentUserForHeaders(
        new Headers({ cookie: signedInCookie })
      )
    ).resolves.toMatchObject({ email })
  })

  it("requests and consumes a local/test magic link once", async () => {
    const email = `t05-magic-${Date.now()}@example.test`
    await getContext().clearMagicLinkMailbox()

    const requestResponse = await authRequest("/api/auth/sign-in/magic-link", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email,
        name: "Magic User",
        callbackURL: "/",
      }),
    })
    expect(requestResponse.status).toBe(200)
    await expect(requestResponse.json()).resolves.toEqual({ status: true })

    const message = await getContext().readLatestMagicLink(email)
    expect(message).toMatchObject({ email, token: expect.any(String) })
    expect(message?.url).toContain("/api/auth/magic-link/verify")

    if (!message) {
      throw new Error("The local/test mailbox did not capture a magic link")
    }

    const consumeResponse = await getContext().auth.handler(
      new Request(message.url, {
        headers: { origin: baseUrl },
      })
    )
    expect(consumeResponse.status).toBe(302)
    expect(getResponseLocation(consumeResponse)).toContain(baseUrl)

    const magicCookie = getCookieHeader(consumeResponse)
    expect(magicCookie).toContain("better-auth.session_token=")
    await expect(
      getContext().getCurrentUserForHeaders(
        new Headers({ cookie: magicCookie })
      )
    ).resolves.toMatchObject({ email, name: "Magic User" })

    const replayResponse = await getContext().auth.handler(
      new Request(message.url, {
        headers: { origin: baseUrl },
      })
    )
    expect(replayResponse.status).toBe(302)
    expect(getResponseLocation(replayResponse)).toContain("INVALID_TOKEN")
  })

  it("follows Better Auth's email ownership lifecycle for password and magic-link accounts", async () => {
    const password = "correct horse battery staple"

    const magicFirstEmail = `t05-magic-first-${Date.now()}@example.test`
    await getContext().clearMagicLinkMailbox()

    const signUpResponse = await authRequest("/api/auth/sign-up/email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Password Magic User",
        email: magicFirstEmail,
        password,
      }),
    })
    expect(signUpResponse.status).toBe(200)
    expect(getCookieHeader(signUpResponse)).toBe("")

    const requestResponse = await authRequest("/api/auth/sign-in/magic-link", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: magicFirstEmail,
        callbackURL: "/",
      }),
    })
    expect(requestResponse.status).toBe(200)

    const magicFirstMessage =
      await getContext().readLatestMagicLink(magicFirstEmail)
    expect(magicFirstMessage).toMatchObject({
      email: magicFirstEmail,
      token: expect.any(String),
    })
    if (!magicFirstMessage) {
      throw new Error("The local/test mailbox did not capture a magic link")
    }

    const magicFirstConsumeResponse = await getContext().auth.handler(
      new Request(magicFirstMessage.url, {
        headers: { origin: baseUrl },
      })
    )
    expect(magicFirstConsumeResponse.status).toBe(302)
    await expect(
      getContext().getCurrentUserForHeaders(
        new Headers({ cookie: getCookieHeader(magicFirstConsumeResponse) })
      )
    ).resolves.toMatchObject({ email: magicFirstEmail })

    const revokedPasswordSignInResponse = await authRequest(
      "/api/auth/sign-in/email",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: magicFirstEmail, password }),
      }
    )
    expect(revokedPasswordSignInResponse.status).toBe(401)

    const verifiedFirstEmail = `t05-verified-first-${Date.now()}@example.test`
    await getContext().clearMagicLinkMailbox()
    const verifiedFirstSignUpResponse = await authRequest(
      "/api/auth/sign-up/email",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "Verified First User",
          email: verifiedFirstEmail,
          password,
        }),
      }
    )
    expect(verifiedFirstSignUpResponse.status).toBe(200)
    await consumeEmailVerification(verifiedFirstEmail)

    await getContext().clearMagicLinkMailbox()
    const verifiedMagicRequestResponse = await authRequest(
      "/api/auth/sign-in/magic-link",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: verifiedFirstEmail, callbackURL: "/" }),
      }
    )
    expect(verifiedMagicRequestResponse.status).toBe(200)

    const verifiedMagicMessage =
      await getContext().readLatestMagicLink(verifiedFirstEmail)
    expect(verifiedMagicMessage).toMatchObject({
      email: verifiedFirstEmail,
      token: expect.any(String),
    })
    if (!verifiedMagicMessage) {
      throw new Error("The local/test mailbox did not capture a magic link")
    }

    const verifiedMagicConsumeResponse = await getContext().auth.handler(
      new Request(verifiedMagicMessage.url, {
        headers: { origin: baseUrl },
      })
    )
    expect(verifiedMagicConsumeResponse.status).toBe(302)

    const passwordSignInAfterMagicResponse = await authRequest(
      "/api/auth/sign-in/email",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: verifiedFirstEmail, password }),
      }
    )
    expect(passwordSignInAfterMagicResponse.status).toBe(200)
  })

  it("fails closed for anonymous or client-supplied owner identity", async () => {
    const spoofedHeaders = new Headers({
      authorization: "Bearer attacker-controlled-token",
      "x-user-id": "attacker-controlled-user",
    })

    await expect(
      getContext().getCurrentUserForHeaders(spoofedHeaders)
    ).resolves.toBeNull()
    await expect(
      getContext().requireUserForHeaders(spoofedHeaders)
    ).rejects.toMatchObject({
      code: "unauthenticated",
    })
  })

  async function createVerifiedUser(label: string) {
    const email = `t272-${label}-${Date.now()}@example.test`
    const password = "original password 123"
    const signUp = await authRequest("/api/auth/sign-up/email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Recovery User", email, password }),
    })
    expect(signUp.status).toBe(200)
    await consumeEmailVerification(email)
    return { email, password }
  }

  async function signIn(email: string, password: string, address?: string) {
    return authRequest("/api/auth/sign-in/email", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(address ? { "x-forwarded-for": address } : {}),
      },
      body: JSON.stringify({ email, password }),
    })
  }

  async function requestReset(email: string) {
    return authRequest("/api/auth/request-password-reset", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, redirectTo: "/reset-password" }),
    })
  }

  async function resetPassword(
    token: string,
    newPassword: string,
    address?: string
  ) {
    return authRequest("/api/auth/reset-password", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(address ? { "x-forwarded-for": address } : {}),
      },
      body: JSON.stringify({ token, newPassword }),
    })
  }

  async function isSignedIn(cookie: string) {
    return (
      (await getContext().getCurrentUserForHeaders(new Headers({ cookie }))) !==
      null
    )
  }

  async function readResetMessage(email: string) {
    const message = await getContext().readLatestMagicLink(email)
    expect(message?.metadata).toMatchObject({ kind: "password-reset" })
    expect(message?.url).toContain("/api/auth/reset-password/")
    return message!
  }

  it("TST-AUTH-004 answers reset requests identically for known and unknown addresses", async () => {
    const { email } = await createVerifiedUser("neutral")
    const unknown = `t272-unknown-${Date.now()}@example.test`
    await getContext().clearMagicLinkMailbox()
    const known = await requestReset(email)
    const absent = await requestReset(unknown)
    expect([known.status, absent.status]).toEqual([200, 200])
    expect(await known.json()).toEqual(await absent.json())
    await readResetMessage(email)
    await expect(getContext().readLatestMagicLink(unknown)).resolves.toBeNull()
    // The token expires after the policy's 30 minutes.
    const expiry = await getContext().appPool.query<{ minutes: number }>(
      "SELECT round(extract(epoch FROM expires_at - now()) / 60)::int AS minutes FROM verification WHERE identifier LIKE 'reset-password:%' ORDER BY created_at DESC LIMIT 1"
    )
    expect(expiry.rows[0]?.minutes).toBe(30)
  })

  it("TST-AUTH-004 resets once, revokes every session and does not sign in", async () => {
    const { email, password } = await createVerifiedUser("reset")
    const first = getCookieHeader(await signIn(email, password))
    const second = getCookieHeader(await signIn(email, password))
    expect([await isSignedIn(first), await isSignedIn(second)]).toEqual([
      true,
      true,
    ])
    await getContext().clearMagicLinkMailbox()
    expect((await requestReset(email)).status).toBe(200)
    // Requesting mail changes nothing about existing sessions.
    expect(await isSignedIn(first)).toBe(true)
    const { token } = await readResetMessage(email)

    const reset = await resetPassword(token, "brand new password 456")
    expect(reset.status).toBe(200)
    expect(getCookieHeader(reset)).not.toContain("session_token=")
    expect([await isSignedIn(first), await isSignedIn(second)]).toEqual([
      false,
      false,
    ])
    expect((await signIn(email, password)).status).toBe(401)
    expect((await signIn(email, "brand new password 456")).status).toBe(200)
    expect((await resetPassword(token, "another password 789")).status).toBe(
      400
    )
  })

  it("TST-AUTH-004 lets exactly one concurrent submission consume a reset token", async () => {
    const { email } = await createVerifiedUser("concurrent")
    await getContext().clearMagicLinkMailbox()
    await requestReset(email)
    const { token } = await readResetMessage(email)
    const statuses = await Promise.all(
      ["concurrent one 111", "concurrent two 222", "concurrent six 333"].map(
        (next) => resetPassword(token, next).then((response) => response.status)
      )
    )
    // One winner; the others are clean INVALID_TOKEN refusals, not errors.
    expect([...statuses].sort()).toEqual([200, 400, 400])
  })

  it("TST-AUTH-004 leaves credentials and sessions unchanged for invalid, expired and throttled requests", async () => {
    const { email, password } = await createVerifiedUser("unchanged")
    const session = getCookieHeader(await signIn(email, password))
    expect(
      (await resetPassword("not-a-real-token", "whatever pass 1")).status
    ).toBe(400)

    await getContext().clearMagicLinkMailbox()
    await requestReset(email)
    const { token } = await readResetMessage(email)
    await getContext().appPool.query(
      "UPDATE verification SET expires_at = now() - interval '1 minute' WHERE identifier = $1",
      [`reset-password:${token}`]
    )
    expect((await resetPassword(token, "expired attempt 22")).status).toBe(400)

    // A second request inside the recipient window is refused, with a wait.
    const throttled = await requestReset(email)
    expect(throttled.status).toBe(429)
    expect(Number(throttled.headers.get("x-retry-after"))).toBeGreaterThan(0)

    expect(await isSignedIn(session)).toBe(true)
    expect((await signIn(email, password)).status).toBe(200)
  })

  it("TST-AUTH-006 gives absent and present recipients the same cooldown, including auth.api calls", async () => {
    const { email } = await createVerifiedUser("cooldown")
    const unknown = `t272-cooldown-unknown-${Date.now()}@example.test`
    for (const address of [email, unknown]) {
      expect((await requestReset(address)).status).toBe(200)
      const again = await requestReset(address)
      expect(again.status).toBe(429)
      await expect(again.json()).resolves.toMatchObject({
        code: "RECIPIENT_COOLDOWN",
      })
    }
    // Server calls bypass the HTTP limiter but not the recipient budget.
    const serverEmail = `t272-api-${Date.now()}@example.test`
    await getContext().auth.api.requestPasswordReset({
      body: { email: serverEmail, redirectTo: "/reset-password" },
    })
    await expect(
      getContext().auth.api.requestPasswordReset({
        body: { email: serverEmail, redirectTo: "/reset-password" },
      })
    ).rejects.toMatchObject({ statusCode: 429 })
  })

  it("TST-AUTH-006 caps automatic sends per recipient across rotating client addresses", async () => {
    const email = `t272-sendcap-${Date.now()}@example.test`
    const password = "unverified password 1"
    await getContext().clearMagicLinkMailbox()
    const signUp = await authRequest("/api/auth/sign-up/email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Send Cap", email, password }),
    })
    expect(signUp.status).toBe(200)
    let delivered = (await getContext().readLatestMagicLink(email)) ? 1 : 0
    // Each unverified sign-in from a new address triggers an automatic send.
    for (let attempt = 0; attempt < 7; attempt += 1) {
      await getContext().clearMagicLinkMailbox()
      const response = await signIn(
        email,
        password,
        `203.0.113.${attempt + 10}`
      )
      expect(response.status).toBe(403)
      if (await getContext().readLatestMagicLink(email)) delivered += 1
    }
    expect(delivered).toBe(5)
  })

  it("TST-AUTH-006 bounds reset submissions per trusted client address", async () => {
    const address = "192.0.2.77"
    const statuses: number[] = []
    for (let attempt = 0; attempt < 6; attempt += 1)
      statuses.push(
        (await resetPassword("no-such-token", "attempt pass 1", address)).status
      )
    expect(statuses.slice(0, 5).every((status) => status === 400)).toBe(true)
    expect(statuses[5]).toBe(429)
    expect(
      (await resetPassword("no-such-token", "attempt pass 1", "192.0.2.78"))
        .status
    ).toBe(400)
    // Counter keys are opaque: no stored key carries an address or email.
    const keys = await getContext().appPool.query<{ key: string }>(
      "SELECT key FROM auth_rate_limit"
    )
    expect(keys.rows.length).toBeGreaterThan(0)
    for (const { key } of keys.rows)
      expect(key).toMatch(/^[a-z-]+:[0-9a-f]{64}$/)
  })

  it("TST-AUTH-004 answers before a pending mail operation finishes", async () => {
    const { email } = await createVerifiedUser("pending")
    await getContext().clearMagicLinkMailbox()
    const { currentAuthMailScheduler, selectAuthMailScheduler } =
      await import("./infrastructure/mail-scheduler")
    const standalone = currentAuthMailScheduler()
    const held: Array<() => Promise<void>> = []
    selectAuthMailScheduler({ schedule: (task) => void held.push(task) })
    try {
      const response = await requestReset(email)
      expect(response.status).toBe(200)
      expect(held).toHaveLength(1)
      await expect(getContext().readLatestMagicLink(email)).resolves.toBeNull()
      await Promise.all(held.map((task) => task()))
      await readResetMessage(email)
    } finally {
      selectAuthMailScheduler(standalone)
    }
  })

  it("TST-AUTH-005 resends verification neutrally, bounded, and recovers invalid links", async () => {
    const stamp = Date.now()
    const pending = `t272-pending-${stamp}@example.test`
    const absent = `t272-absent-${stamp}@example.test`
    const { email: verified } = await createVerifiedUser("already-verified")
    const signUp = await authRequest("/api/auth/sign-up/email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Pending",
        email: pending,
        password: "pending password 1",
      }),
    })
    expect(signUp.status).toBe(200)
    await getContext().clearMagicLinkMailbox()

    const resend = (email: string) =>
      authRequest("/api/auth/send-verification-email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, callbackURL: "/dashboard" }),
      })
    const answers = await Promise.all(
      [pending, absent, verified].map(async (email) => {
        const response = await resend(email)
        return [response.status, await response.json()]
      })
    )
    expect(answers).toEqual([
      [200, { status: true }],
      [200, { status: true }],
      [200, { status: true }],
    ])
    const fresh = await getContext().readLatestMagicLink(pending)
    expect(fresh?.url).toContain("/verify-email")
    await expect(getContext().readLatestMagicLink(absent)).resolves.toBeNull()
    await expect(getContext().readLatestMagicLink(verified)).resolves.toBeNull()
    for (const email of [pending, absent])
      expect((await resend(email)).status).toBe(429)

    const invalid = await getContext().auth.handler(
      new Request(
        `${baseUrl}/api/auth/verify-email?token=not-a-token&callbackURL=/dashboard`,
        { headers: { origin: baseUrl } }
      )
    )
    expect(getResponseLocation(invalid)).toContain("error=INVALID_TOKEN")

    // An expired link reports TOKEN_EXPIRED and leaves the account pending.
    vi.useFakeTimers({ toFake: ["Date"], now: Date.now() + 2 * 60 * 60 * 1000 })
    try {
      const expired = await getContext().auth.handler(
        new Request(fresh!.url, { headers: { origin: baseUrl } })
      )
      expect(getResponseLocation(expired)).toContain("error=TOKEN_EXPIRED")
    } finally {
      vi.useRealTimers()
    }
    const state = await getContext().appPool.query<{ verified: boolean }>(
      "SELECT email_verified AS verified FROM users WHERE email = $1",
      [pending]
    )
    expect(state.rows[0]?.verified).toBe(false)
    // The unexpired link still verifies normally.
    const verifiedNow = await getContext().auth.handler(
      new Request(fresh!.url, { headers: { origin: baseUrl } })
    )
    expect(verifiedNow.status).toBe(302)
    expect(getCookieHeader(verifiedNow)).toContain("session_token=")
  })
})
