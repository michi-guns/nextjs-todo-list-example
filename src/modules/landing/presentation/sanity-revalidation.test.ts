import { createHmac } from "node:crypto"
import type { NextRequest } from "next/server"
import { describe, expect, it, vi } from "vitest"

import {
  handleManualLandingRecovery,
  handleSanityWebhook,
} from "./sanity-revalidation"

const WEBHOOK_SECRET = "webhook-secret-for-tests"
const MANUAL_RECOVERY_SECRET = "manual-recovery-secret-for-tests"

const landingEvent = {
  _id: "landingPage",
  _type: "landingPage",
  operation: "update",
}

function createRequest(body: string, headers?: HeadersInit): NextRequest {
  return new Request("http://localhost/api/sanity/webhook", {
    method: "POST",
    headers,
    body,
  }) as NextRequest
}

function createSignedHeaders(
  body: string,
  secret: string,
  timestamp = 1_800_000_000_000
) {
  const digest = createHmac("sha256", secret)
    .update(`${timestamp}.${body}`)
    .digest("base64url")

  return {
    "content-type": "application/json",
    "sanity-webhook-signature": `t=${timestamp},v1=${digest}`,
  }
}

function parsedWebhook(body: unknown, isValidSignature = true) {
  return vi.fn().mockResolvedValue({ body, isValidSignature })
}

describe("handleSanityWebhook", () => {
  it("accepts a valid Sanity signature for the published landing singleton", async () => {
    const body = JSON.stringify(landingEvent)
    const invalidate = vi.fn()

    const response = await handleSanityWebhook(
      createRequest(body, createSignedHeaders(body, WEBHOOK_SECRET)),
      {
        webhookSecret: WEBHOOK_SECRET,
        invalidate,
        waitForContentLakeEventualConsistency: false,
      }
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ revalidated: true })
    expect(invalidate).toHaveBeenCalledOnce()
  })

  it("rejects an invalid signature without invalidating", async () => {
    const body = JSON.stringify(landingEvent)
    const invalidate = vi.fn()

    const response = await handleSanityWebhook(
      createRequest(body, createSignedHeaders(body, "wrong-secret")),
      {
        webhookSecret: WEBHOOK_SECRET,
        invalidate,
        waitForContentLakeEventualConsistency: false,
      }
    )

    expect(response.status).toBe(401)
    expect(invalidate).not.toHaveBeenCalled()
  })

  it("rejects malformed payloads without invalidating", async () => {
    const invalidate = vi.fn()
    const parseBody = parsedWebhook({ _id: "landingPage" })

    const response = await handleSanityWebhook(createRequest("ignored"), {
      webhookSecret: WEBHOOK_SECRET,
      invalidate,
      parseBody,
    })

    expect(response.status).toBe(400)
    expect(invalidate).not.toHaveBeenCalled()
  })

  it("rejects parser failures caused by malformed JSON without invalidating", async () => {
    const invalidate = vi.fn()
    const parseBody = vi.fn().mockRejectedValue(new SyntaxError("invalid JSON"))

    const response = await handleSanityWebhook(createRequest("ignored"), {
      webhookSecret: WEBHOOK_SECRET,
      invalidate,
      parseBody,
    })

    expect(response.status).toBe(400)
    expect(invalidate).not.toHaveBeenCalled()
  })

  it("ignores relevantly signed events for other documents", async () => {
    const invalidate = vi.fn()
    const parseBody = parsedWebhook({
      _id: "other-document",
      _type: "landingPage",
    })

    const response = await handleSanityWebhook(createRequest("ignored"), {
      webhookSecret: WEBHOOK_SECRET,
      invalidate,
      parseBody,
    })

    expect(response.status).toBe(204)
    expect(invalidate).not.toHaveBeenCalled()
  })

  it("ignores draft singleton events", async () => {
    const invalidate = vi.fn()
    const parseBody = parsedWebhook({
      _id: "drafts.landingPage",
      _type: "landingPage",
    })

    const response = await handleSanityWebhook(createRequest("ignored"), {
      webhookSecret: WEBHOOK_SECRET,
      invalidate,
      parseBody,
    })

    expect(response.status).toBe(204)
    expect(invalidate).not.toHaveBeenCalled()
  })

  it("returns a configuration error when the webhook secret is absent", async () => {
    const invalidate = vi.fn()
    const parseBody = vi.fn()

    const response = await handleSanityWebhook(createRequest("ignored"), {
      invalidate,
      parseBody,
    })

    expect(response.status).toBe(500)
    expect(parseBody).not.toHaveBeenCalled()
    expect(invalidate).not.toHaveBeenCalled()
  })

  it("keeps duplicate valid deliveries safe", async () => {
    const invalidate = vi.fn()
    const parseBody = parsedWebhook(landingEvent)
    const dependencies = {
      webhookSecret: WEBHOOK_SECRET,
      invalidate,
      parseBody,
    }

    await expect(
      handleSanityWebhook(createRequest("ignored"), dependencies)
    ).resolves.toMatchObject({ status: 200 })
    await expect(
      handleSanityWebhook(createRequest("ignored"), dependencies)
    ).resolves.toMatchObject({ status: 200 })

    expect(invalidate).toHaveBeenCalledTimes(2)
  })
})

describe("handleManualLandingRecovery", () => {
  it("rejects missing or invalid operator authorization", async () => {
    const invalidate = vi.fn()

    await expect(
      handleManualLandingRecovery(new Request("http://localhost"), {
        manualRecoverySecret: MANUAL_RECOVERY_SECRET,
        invalidate,
      })
    ).resolves.toMatchObject({ status: 401 })

    await expect(
      handleManualLandingRecovery(
        new Request("http://localhost", {
          headers: { authorization: "Bearer wrong-secret" },
        }),
        {
          manualRecoverySecret: MANUAL_RECOVERY_SECRET,
          invalidate,
        }
      )
    ).resolves.toMatchObject({ status: 401 })

    expect(invalidate).not.toHaveBeenCalled()
  })

  it("requires configured operator authorization", async () => {
    const invalidate = vi.fn()

    const response = await handleManualLandingRecovery(
      new Request("http://localhost", {
        headers: { authorization: `Bearer ${MANUAL_RECOVERY_SECRET}` },
      }),
      { invalidate }
    )

    expect(response.status).toBe(500)
    expect(invalidate).not.toHaveBeenCalled()
  })

  it("routes an authorized recovery request through the shared invalidation service", async () => {
    const invalidate = vi.fn()

    const response = await handleManualLandingRecovery(
      new Request("http://localhost", {
        headers: { authorization: `Bearer ${MANUAL_RECOVERY_SECRET}` },
      }),
      {
        manualRecoverySecret: MANUAL_RECOVERY_SECRET,
        invalidate,
      }
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ revalidated: true })
    expect(invalidate).toHaveBeenCalledOnce()
  })

  it("allows webhook and manual recovery to share one invalidation port", async () => {
    const invalidate = vi.fn()
    const parseBody = parsedWebhook(landingEvent)

    await expect(
      handleSanityWebhook(createRequest("ignored"), {
        webhookSecret: WEBHOOK_SECRET,
        invalidate,
        parseBody,
      })
    ).resolves.toMatchObject({ status: 200 })

    await expect(
      handleManualLandingRecovery(
        new Request("http://localhost", {
          headers: { authorization: `Bearer ${MANUAL_RECOVERY_SECRET}` },
        }),
        {
          manualRecoverySecret: MANUAL_RECOVERY_SECRET,
          invalidate,
        }
      )
    ).resolves.toMatchObject({ status: 200 })

    expect(invalidate).toHaveBeenCalledTimes(2)
  })
})
