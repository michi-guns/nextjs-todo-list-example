import { mkdtemp, rm } from "node:fs/promises"
import os from "node:os"
import path from "node:path"

import { afterEach, describe, expect, it } from "vitest"

import {
  captureMagicLink,
  clearMagicLinkMailbox,
  isLocalMailboxEnabled,
  listMagicLinkMailbox,
  readLatestMagicLink,
} from "./local-mailbox"

const originalEnvironment = {
  nodeEnv: process.env.NODE_ENV,
  mailboxEnabled: process.env.BETTER_AUTH_LOCAL_MAILBOX,
  mailboxDirectory: process.env.BETTER_AUTH_MAILBOX_DIR,
}

let mailboxDirectory: string | undefined
const mutableEnvironment = process.env as Record<string, string | undefined>

afterEach(async () => {
  if (mailboxDirectory) {
    await rm(mailboxDirectory, { recursive: true, force: true })
    mailboxDirectory = undefined
  }

  if (originalEnvironment.nodeEnv === undefined)
    delete mutableEnvironment.NODE_ENV
  else mutableEnvironment.NODE_ENV = originalEnvironment.nodeEnv

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

describe("local Better Auth mailbox", () => {
  it("captures and reads the latest link only in explicit test mode", async () => {
    mailboxDirectory = await mkdtemp(
      path.join(os.tmpdir(), "t05-auth-mailbox-")
    )
    mutableEnvironment.NODE_ENV = "test"
    process.env.BETTER_AUTH_LOCAL_MAILBOX = "true"
    process.env.BETTER_AUTH_MAILBOX_DIR = mailboxDirectory

    expect(isLocalMailboxEnabled()).toBe(true)

    await captureMagicLink({
      email: "person@example.test",
      url: "http://localhost:3000/api/auth/magic-link/verify?token=secret",
      token: "secret",
      metadata: { source: "test" },
    })

    await expect(
      readLatestMagicLink("PERSON@example.test")
    ).resolves.toMatchObject({
      email: "person@example.test",
      token: "secret",
      metadata: { source: "test" },
    })
    await expect(listMagicLinkMailbox()).resolves.toHaveLength(1)

    await clearMagicLinkMailbox()
    await expect(readLatestMagicLink("person@example.test")).resolves.toBeNull()
  })

  it("rejects access when the explicit local/test switch is absent", async () => {
    mutableEnvironment.NODE_ENV = "production"
    process.env.BETTER_AUTH_LOCAL_MAILBOX = "true"

    expect(isLocalMailboxEnabled()).toBe(false)
    await expect(readLatestMagicLink("person@example.test")).rejects.toThrow(
      "available only"
    )
  })

  it("rejects a mailbox path that could clear unrelated files", async () => {
    mutableEnvironment.NODE_ENV = "test"
    process.env.BETTER_AUTH_LOCAL_MAILBOX = "true"
    process.env.BETTER_AUTH_MAILBOX_DIR = process.cwd()

    await expect(readLatestMagicLink("person@example.test")).rejects.toThrow(
      "must be a child"
    )
  })
})
