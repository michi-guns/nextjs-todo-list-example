import { afterEach, describe, expect, it, vi } from "vitest"

import { deliverAuthEmail } from "./auth-mail"

const mutableEnvironment = process.env as Record<string, string | undefined>
const original = {
  appEnv: process.env.APP_ENV,
  nodeEnv: process.env.NODE_ENV,
  mailbox: process.env.BETTER_AUTH_LOCAL_MAILBOX,
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
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
  it("uses Resend for explicitly configured Production", async () => {
    for (const [key, value] of Object.entries({
      APP_ENV: "production",
      NODE_ENV: "production",
      APP_MAIL_TRANSPORT: "remote",
      APP_MAIL_PROVIDER: "resend",
      SECRET_NAMESPACE: "production",
      RESEND_API_KEY: "re_synthetic",
      APP_MAIL_FROM: "auth@example.com",
      BETTER_AUTH_LOCAL_MAILBOX: "false",
    }))
      vi.stubEnv(key, value)
    const fetchMock = vi
      .fn()
      .mockResolvedValue(Response.json({ id: "email-id" }))
    vi.stubGlobal("fetch", fetchMock)
    await deliverAuthEmail({
      email: "person@example.test",
      url: "https://example.com/verify?token=synthetic",
      token: "synthetic",
    })
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it.each(["local", "development", "preview"])(
    "rejects remote configuration in %s before delivery",
    async (appEnv) => {
      vi.stubEnv("APP_ENV", appEnv)
      vi.stubEnv("APP_MAIL_TRANSPORT", "remote")
      vi.stubEnv("APP_MAIL_PROVIDER", "resend")
      const fetchMock = vi.fn()
      vi.stubGlobal("fetch", fetchMock)
      await expect(
        deliverAuthEmail({
          email: "person@example.test",
          url: "https://example.com/verify?token=synthetic",
          token: "synthetic",
        })
      ).rejects.toThrow("Remote mail is unavailable outside Production")
      expect(fetchMock).not.toHaveBeenCalled()
    }
  )

  it("rejects enabled local mailbox settings on Preview", async () => {
    vi.stubEnv("APP_ENV", "preview")
    vi.stubEnv("BETTER_AUTH_LOCAL_MAILBOX", "true")
    await expect(
      deliverAuthEmail({
        email: "person@example.test",
        url: "https://example.com/verify",
        token: "synthetic",
      })
    ).rejects.toThrow("Local mailbox is unavailable on Preview")
  })

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
