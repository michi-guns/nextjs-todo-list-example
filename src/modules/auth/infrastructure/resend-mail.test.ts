import { afterEach, describe, expect, it, vi } from "vitest"

import { readResendConfig, sendResendAuthEmail } from "./resend-mail"

const environment = {
  APP_ENV: "production",
  NODE_ENV: "production",
  APP_MAIL_TRANSPORT: "remote",
  APP_MAIL_PROVIDER: "resend",
  SECRET_NAMESPACE: "production",
  RESEND_API_KEY: "re_synthetic_test_key",
  APP_MAIL_FROM: "auth@example.com",
}
const message = {
  email: "person@example.test",
  url: "https://example.com/api/auth/verify-email?token=synthetic-token",
  token: "synthetic-token",
  metadata: { kind: "email-verification" },
}

afterEach(() => vi.unstubAllGlobals())

describe("Resend configuration", () => {
  it("reads the explicitly selected Production credentials", () => {
    expect(readResendConfig(environment)).toEqual({
      apiKey: environment.RESEND_API_KEY,
      from: environment.APP_MAIL_FROM,
    })
  })

  it.each([
    ["APP_ENV", "preview"],
    ["SECRET_NAMESPACE", "local"],
    ["APP_MAIL_TRANSPORT", "local-mailbox"],
    ["APP_MAIL_PROVIDER", "unknown"],
    ["BETTER_AUTH_LOCAL_MAILBOX", "true"],
    ["RESEND_API_KEY", ""],
    ["RESEND_API_KEY", "bad-secret"],
    ["APP_MAIL_FROM", ""],
    ["APP_MAIL_FROM", "not-an-address"],
    ["APP_MAIL_FROM", "onboarding@resend.dev"],
  ])("rejects invalid %s without echoing its value", (key, value) => {
    expect(() => readResendConfig({ ...environment, [key]: value })).toThrow(
      "Invalid Production Resend configuration"
    )
  })
})

describe("Resend delivery", () => {
  it.each([
    [message, "Verify your email"],
    [{ ...message, metadata: undefined }, "Your sign-in link"],
    [
      { ...message, metadata: { kind: "password-reset" } },
      "Reset your password",
    ],
  ])("sends the original auth URL as plain text", async (input, subject) => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(Response.json({ id: "email-id" }))
    vi.stubGlobal("fetch", fetchMock)
    await sendResendAuthEmail(readResendConfig(environment), input)
    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe("https://api.resend.com/emails")
    expect(options).toMatchObject({ method: "POST", redirect: "error" })
    expect(options.signal).toBeInstanceOf(AbortSignal)
    expect(JSON.parse(options.body)).toEqual({
      from: environment.APP_MAIL_FROM,
      to: [message.email],
      subject,
      text: expect.stringContaining(message.url),
    })
    expect(options.headers.Authorization).toBe(
      `Bearer ${environment.RESEND_API_KEY}`
    )
  })

  it.each([401, 429, 500])(
    "rejects HTTP %s without provider content",
    async (status) => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(new Response(message.url, { status }))
      )
      await expect(
        sendResendAuthEmail(readResendConfig(environment), message)
      ).rejects.toThrow("Resend auth email delivery failed")
    }
  )

  it("does not expose a network exception or its cause", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error(message.url)))
    const error = await sendResendAuthEmail(
      readResendConfig(environment),
      message
    ).catch((error) => error)
    expect(error.message).toBe("Resend auth email delivery failed")
    expect(error.cause).toBeUndefined()
  })

  it("rejects a successful response without a delivery id", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json({ unexpected: message.url }))
    )
    await expect(
      sendResendAuthEmail(readResendConfig(environment), message)
    ).rejects.toThrow("Resend auth email delivery failed")
  })
})
