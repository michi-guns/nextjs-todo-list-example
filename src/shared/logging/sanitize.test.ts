import { describe, expect, it, vi } from "vitest"
import { sanitizeMetadata } from "./sanitize"

describe("TST-LOGGING-001 safe metadata projection", () => {
  it("keeps only bounded outcomes, durations, transports and classified error codes", () => {
    expect(
      sanitizeMetadata({
        outcome: "failed",
        durationMs: 23.5,
        transport: "resend",
        error: Object.assign(new Error("private"), { code: "ETIMEDOUT" }),
        status: 500,
      })
    ).toEqual({
      outcome: "failed",
      durationMs: 23.5,
      transport: "resend",
      error: { kind: "timeout", code: "ETIMEDOUT" },
    })
    expect(
      sanitizeMetadata({
        durationMs: Infinity,
        outcome: "secret",
        transport: "https://private",
      })
    ).toEqual({})
    expect(sanitizeMetadata({ durationMs: -1 })).toEqual({})
    expect(sanitizeMetadata({ durationMs: 86_400_001 })).toEqual({})
  })

  it("discards secret-bearing strings, keys, nested causes, cycles and serializers", () => {
    const secret =
      "SENTINEL-token person@example.com postgres://user:password@host/private Buy private task"
    const serializer = vi.fn(() => secret)
    const error = Object.assign(
      new Error(secret, { cause: new Error(secret) }),
      { stack: secret, code: secret, toJSON: serializer }
    )
    const data: Record<string, unknown> = {
      error,
      password: secret,
      token: secret,
      message: secret,
      body: secret,
      nested: { outcome: secret },
      outcome: secret,
      durationMs: secret,
      transport: secret,
      toJSON: serializer,
    }
    data.cycle = data
    expect(sanitizeMetadata(data)).toEqual({ error: { kind: "unexpected" } })
    expect(JSON.stringify(sanitizeMetadata(data))).not.toContain("SENTINEL")
    expect(serializer).not.toHaveBeenCalled()
  })

  it("does not invoke getters or recurse through arbitrary input", () => {
    const getter = vi.fn(() => {
      throw new Error("secret")
    })
    const input = Object.defineProperties(
      {},
      { outcome: { get: getter }, error: { get: getter } }
    )
    expect(sanitizeMetadata(input)).toEqual({})
    expect(getter).not.toHaveBeenCalled()
    const error = Object.defineProperty({}, "code", { get: getter })
    expect(sanitizeMetadata({ error })).toEqual({
      error: { kind: "unexpected" },
    })
    expect(getter).not.toHaveBeenCalled()
    expect(
      sanitizeMetadata(new Proxy({}, { getOwnPropertyDescriptor: getter }))
    ).toEqual({})
  })
})
