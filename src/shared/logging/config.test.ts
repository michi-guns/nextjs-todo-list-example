import { describe, expect, it } from "vitest"
import { createLogPolicy, defaultLogPolicy, permits } from "./config"

describe("TST-LOGGING-001 policy", () => {
  it("starts at info and lets an exact module threshold replace the default", () => {
    const policy = createLogPolicy()
    expect(permits(policy.current(), "auth", "mail.sent", "debug")).toBe(false)
    expect(permits(policy.current(), "auth", "mail.sent", "info")).toBe(true)
    expect(
      policy.update({
        ...defaultLogPolicy,
        revision: 1,
        moduleLevels: { auth: "debug" },
      })
    ).toBe(true)
    expect(permits(policy.current(), "auth", "mail.sent", "debug")).toBe(true)
    expect(permits(policy.current(), "auth.mail", "mail.sent", "debug")).toBe(
      false
    )
  })

  it("applies global off, event suppression and module off before thresholds", () => {
    expect(
      permits(
        { ...defaultLogPolicy, enabled: false },
        "auth",
        "mail.sent",
        "fatal"
      )
    ).toBe(false)
    expect(
      permits(
        {
          ...defaultLogPolicy,
          suppressedEvents: ["mail.sent"],
          moduleLevels: { auth: "trace" },
        },
        "auth",
        "mail.sent",
        "fatal"
      )
    ).toBe(false)
    expect(
      permits(
        { ...defaultLogPolicy, moduleLevels: { auth: "off" } },
        "auth",
        "mail.sent",
        "fatal"
      )
    ).toBe(false)
    expect(
      permits(
        { ...defaultLogPolicy, suppressedEvents: ["mail.sent"] },
        "auth",
        "mail.sent.again",
        "info"
      )
    ).toBe(true)
  })

  it("honors stricter module thresholds and all six ordered severities", () => {
    const policy = {
      ...defaultLogPolicy,
      minimumLevel: "warn" as const,
      moduleLevels: { auth: "fatal" as const },
    }
    expect(
      ["trace", "debug", "info", "warn", "error", "fatal"].map((level) =>
        permits(policy, "jobs", "job.done", level as typeof policy.minimumLevel)
      )
    ).toEqual([false, false, false, true, true, true])
    expect(permits(policy, "auth", "mail.failed", "error")).toBe(false)
    expect(permits(policy, "auth", "mail.failed", "fatal")).toBe(true)
    expect(permits(defaultLogPolicy, "constructor", "job.done", "info")).toBe(
      true
    )
  })

  it.each([
    { enabled: "yes" },
    { minimumLevel: "verbose" },
    { schemaVersion: 2 },
    { revision: -1 },
    { moduleLevels: { "auth.*": "off" } },
    { suppressedEvents: Array(101).fill("mail.sent") },
    {
      moduleLevels: Object.fromEntries(
        Array.from({ length: 101 }, (_, n) => [`module${n}`, "info"])
      ),
    },
    { suppressedEvents: ["x".repeat(81)] },
    { extra: true },
  ])(
    "rejects invalid full snapshots without replacing the last valid policy: %o",
    (invalid) => {
      const policy = createLogPolicy()
      policy.update({ ...defaultLogPolicy, revision: 1, enabled: false })
      expect(
        policy.update({ ...defaultLogPolicy, revision: 2, ...invalid })
      ).toBe(false)
      expect(policy.current().enabled).toBe(false)
      expect(policy.current().revision).toBe(1)
    }
  )

  it("copies and freezes snapshots and refuses older or repeated revisions", () => {
    const policy = createLogPolicy()
    const input = {
      ...defaultLogPolicy,
      revision: 2,
      moduleLevels: { auth: "off" as const },
      suppressedEvents: ["mail.sent"],
    }
    policy.update(input)
    input.moduleLevels.auth = "off"
    input.suppressedEvents.push("mail.failed")
    expect(policy.current().suppressedEvents).toEqual(["mail.sent"])
    expect(Object.isFrozen(policy.current().moduleLevels)).toBe(true)
    expect(policy.update({ ...defaultLogPolicy, revision: 1 })).toBe(false)
    expect(policy.update({ ...defaultLogPolicy, revision: 2 })).toBe(false)
  })
})
