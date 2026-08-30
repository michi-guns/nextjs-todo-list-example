import { mkdtemp, readFile, readdir, rm } from "node:fs/promises"
import os from "node:os"
import path from "node:path"

import { Pool, type PoolClient } from "pg"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

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
}

describe.sequential("Better Auth boundary", () => {
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
      readLatestMagicLink: mailboxModule.readLatestMagicLink,
      clearMagicLinkMailbox: mailboxModule.clearMagicLinkMailbox,
      appPool: databaseModule.pool,
    }
  })

  afterAll(async () => {
    if (context) {
      await context.appPool.end()
    }

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

  it("creates, uses, and ends an email/password session", async () => {
    const email = `t05-password-${Date.now()}@example.test`
    const password = "correct horse battery staple"
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

    const signedUpCookie = getCookieHeader(signUpResponse)
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
})
