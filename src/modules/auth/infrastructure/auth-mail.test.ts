import { afterEach, describe, expect, it, vi } from "vitest"

import { createAuthMailer, deliverAuthEmail } from "./auth-mail"
import { createDrainableScheduler } from "./mail-scheduler"
import { createLogger } from "../../../shared/logging/logger"
import { createOperationRunner } from "../../../shared/logging/operation"

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
  it("records suppression and delivery failure once without mail contents", async () => {
    const write = vi.fn()
    const logging = createOperationRunner({
      logger: createLogger({ environment: "preview", write }),
      refresh: async () => {},
    })
    const message = {
      email: "private-person@example.test",
      url: "https://example.test/?token=private-token",
      token: "private-token",
    }
    vi.stubEnv("APP_ENV", "preview")
    vi.stubEnv("BETTER_AUTH_LOCAL_MAILBOX", "false")
    await logging.run("auth", "auth.post", () => deliverAuthEmail(message))
    expect(write).toHaveBeenCalledWith(
      "info",
      expect.objectContaining({
        outcome: "suppressed",
        transport: "suppressed",
        event: "auth.mail.delivery.completed",
      })
    )
    vi.stubEnv("APP_MAIL_TRANSPORT", "remote")
    await expect(
      logging.run("auth", "auth.post", () => deliverAuthEmail(message))
    ).rejects.toThrow()
    expect(
      write.mock.calls.filter(([level]) => level === "error")
    ).toHaveLength(1)
    expect(JSON.stringify(write.mock.calls)).not.toContain("private-")
  })
  it("uses Resend for explicitly configured Production", async () => {
    const write = vi.fn()
    const logging = createOperationRunner({
      logger: createLogger({ environment: "production", write }),
      refresh: async () => {},
    })
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
    await logging.run("auth", "auth.post", () =>
      deliverAuthEmail({
        email: "person@example.test",
        url: "https://example.com/verify?token=synthetic",
        token: "synthetic",
      })
    )
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(write).toHaveBeenCalledWith(
      "info",
      expect.objectContaining({
        event: "auth.mail.delivery.completed",
        transport: "resend",
        outcome: "completed",
      })
    )
    expect(JSON.stringify(write.mock.calls)).not.toContain(
      "person@example.test"
    )
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

describe("TST-AUTH-006 auth mail admission and lifetime", () => {
  const message = {
    email: "Person@Example.test",
    url: "https://example.test/api/auth/reset-password/secret-token",
    token: "secret-token",
    metadata: { kind: "password-reset" },
  }

  function mailer(
    decision: object,
    deliver = vi.fn().mockResolvedValue(undefined)
  ) {
    const scheduler = createDrainableScheduler()
    const consumeRecipient = vi.fn().mockResolvedValue(decision)
    const onDenied = vi.fn()
    return {
      scheduler,
      consumeRecipient,
      deliver,
      onDenied,
      subject: createAuthMailer({
        admission: { consumeRecipient },
        scheduler: () => scheduler,
        deliver,
        onDenied,
      }),
    }
  }

  it("returns before a pending provider call and delivers after admission", async () => {
    let release!: () => void
    const pending = new Promise<void>((done) => (release = done))
    const { scheduler, consumeRecipient, deliver, subject } = mailer(
      { allowed: true, retryAfter: null },
      vi.fn().mockReturnValue(pending)
    )
    const settled = vi.fn()
    subject.send(message)
    await Promise.resolve()
    const drained = scheduler.drain().then(settled)
    await new Promise((done) => setTimeout(done, 20))
    expect(consumeRecipient).toHaveBeenCalledWith("send", message.email)
    expect(deliver).toHaveBeenCalledWith(message)
    expect(settled).not.toHaveBeenCalled()
    release()
    await drained
    expect(settled).toHaveBeenCalledOnce()
  })

  it.each(["limited", "unavailable", "invalid_recipient"] as const)(
    "suppresses a %s send without throwing an account signal",
    async (reason) => {
      const { scheduler, deliver, onDenied, subject } = mailer({
        allowed: false,
        retryAfter: null,
        reason,
      })
      expect(() => subject.send(message)).not.toThrow()
      await scheduler.drain()
      expect(deliver).not.toHaveBeenCalled()
      expect(onDenied).toHaveBeenCalledWith(reason)
    }
  )

  it("contains a delivery failure inside the scheduled task", async () => {
    const { scheduler, subject } = mailer(
      { allowed: true, retryAfter: null },
      vi.fn().mockRejectedValue(new Error("provider down secret-token"))
    )
    subject.send(message)
    await expect(scheduler.drain()).resolves.toBeUndefined()
  })
})
