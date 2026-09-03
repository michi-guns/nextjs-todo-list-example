import { afterEach, describe, expect, it } from "vitest"

import { deliverAuthEmail } from "./auth-mail"

const mutableEnvironment = process.env as Record<string, string | undefined>
const original = {
  appEnv: process.env.APP_ENV,
  nodeEnv: process.env.NODE_ENV,
  mailbox: process.env.BETTER_AUTH_LOCAL_MAILBOX,
}

afterEach(() => {
  if (original.appEnv === undefined) delete mutableEnvironment.APP_ENV
  else mutableEnvironment.APP_ENV = original.appEnv
  if (original.nodeEnv === undefined) delete mutableEnvironment.NODE_ENV
  else mutableEnvironment.NODE_ENV = original.nodeEnv
  if (original.mailbox === undefined) {
    delete mutableEnvironment.BETTER_AUTH_LOCAL_MAILBOX
  } else {
    mutableEnvironment.BETTER_AUTH_LOCAL_MAILBOX = original.mailbox
  }
})

describe("deliverAuthEmail", () => {
  it("does not send or write a mailbox on Preview", async () => {
    mutableEnvironment.APP_ENV = "preview"
    mutableEnvironment.NODE_ENV = "production"
    delete mutableEnvironment.BETTER_AUTH_LOCAL_MAILBOX

    await expect(
      deliverAuthEmail({
        email: "preview-user@example.test",
        url: "https://preview.example.test/api/auth/verify-email?token=secret",
        token: "secret",
      })
    ).resolves.toBeUndefined()
  })

  it("still requires the local mailbox outside Preview", async () => {
    delete mutableEnvironment.APP_ENV
    mutableEnvironment.NODE_ENV = "production"
    delete mutableEnvironment.BETTER_AUTH_LOCAL_MAILBOX

    await expect(
      deliverAuthEmail({
        email: "person@example.test",
        url: "http://127.0.0.1:3000/api/auth/verify-email?token=secret",
        token: "secret",
      })
    ).rejects.toThrow(/local mailbox/)
  })
})
