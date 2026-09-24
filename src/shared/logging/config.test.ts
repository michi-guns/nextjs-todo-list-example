import { describe, expect, it } from "vitest"
import {
  allowsErrorReport,
  createLogPolicy,
  defaultLogPolicy,
  logPolicySchema,
  routeLog,
  type LogLevel,
  type LogPolicy,
} from "./config"

function policy(overrides: {
  revision?: number
  enabled?: boolean
  disabledModules?: string[]
  suppressedEvents?: string[]
  console?: Partial<LogPolicy["console"]>
  diagnostics?: Partial<LogPolicy["diagnostics"]>
}): LogPolicy & { disabledModules: string[]; suppressedEvents: string[] } {
  return {
    ...defaultLogPolicy,
    ...overrides,
    disabledModules: overrides.disabledModules ?? [],
    suppressedEvents: overrides.suppressedEvents ?? [],
    console: { ...defaultLogPolicy.console, ...overrides.console },
    diagnostics: { ...defaultLogPolicy.diagnostics, ...overrides.diagnostics },
  }
}
const remote = { enabled: true, errorReportsEnabled: true }

describe("TST-LOGGING-001 policy", () => {
  it("starts at console info and lets an exact module threshold replace the default", () => {
    const current = createLogPolicy()
    expect(routeLog(current.current(), "auth", "mail.sent", "debug")).toEqual({
      console: false,
      diagnostics: false,
    })
    expect(
      routeLog(current.current(), "auth", "mail.sent", "info").console
    ).toBe(true)
    expect(
      current.update(
        policy({ revision: 1, console: { moduleLevels: { auth: "debug" } } })
      )
    ).toBe(true)
    expect(
      routeLog(current.current(), "auth", "mail.sent", "debug").console
    ).toBe(true)
    expect(
      routeLog(current.current(), "auth.mail", "mail.sent", "debug").console
    ).toBe(false)
  })

  it("honors stricter module thresholds and all six ordered severities", () => {
    const strict = policy({
      console: { minimumLevel: "warn", moduleLevels: { auth: "fatal" } },
    })
    expect(
      (["trace", "debug", "info", "warn", "error", "fatal"] as LogLevel[]).map(
        (level) => routeLog(strict, "jobs", "job.done", level).console
      )
    ).toEqual([false, false, false, true, true, true])
    expect(routeLog(strict, "auth", "mail.failed", "error").console).toBe(false)
    expect(routeLog(strict, "auth", "mail.failed", "fatal").console).toBe(true)
    expect(
      routeLog(defaultLogPolicy, "constructor", "job.done", "info").console
    ).toBe(true)
  })

  it.each([
    { enabled: "yes" },
    { schemaVersion: 3 },
    { revision: -1 },
    { disabledModules: ["auth.*"] },
    { suppressedEvents: Array(101).fill("mail.sent") },
    { suppressedEvents: ["x".repeat(81)] },
    { console: { ...defaultLogPolicy.console, minimumLevel: "verbose" } },
    { console: { ...defaultLogPolicy.console, moduleLevels: { auth: "off" } } },
    {
      console: {
        ...defaultLogPolicy.console,
        moduleLevels: Object.fromEntries(
          Array.from({ length: 101 }, (_, n) => [`module${n}`, "info"])
        ),
      },
    },
    { diagnostics: { ...defaultLogPolicy.diagnostics, dsn: "https://x" } },
    { diagnostics: { enabled: true } },
    { minimumLevel: "info" },
    { extra: true },
  ])(
    "rejects invalid full snapshots without replacing the last valid policy: %o",
    (invalid) => {
      const current = createLogPolicy()
      current.update(policy({ revision: 1, enabled: false }))
      expect(
        current.update({ ...defaultLogPolicy, revision: 2, ...invalid })
      ).toBe(false)
      expect(current.current().enabled).toBe(false)
      expect(current.current().revision).toBe(1)
    }
  )

  it("copies and deeply freezes snapshots and refuses older or repeated revisions", () => {
    const current = createLogPolicy()
    const input = policy({
      revision: 2,
      disabledModules: ["auth"],
      suppressedEvents: ["mail.sent"],
      diagnostics: { moduleLevels: { lists: "info" } },
    })
    current.update(input)
    input.suppressedEvents.push("mail.failed")
    input.disabledModules.push("lists")
    expect(current.current().suppressedEvents).toEqual(["mail.sent"])
    expect(current.current().disabledModules).toEqual(["auth"])
    for (const part of [
      current.current(),
      current.current().console,
      current.current().diagnostics,
      current.current().console.moduleLevels,
      current.current().diagnostics.moduleLevels,
      current.current().disabledModules,
    ])
      expect(Object.isFrozen(part)).toBe(true)
    expect(current.update(policy({ revision: 1 }))).toBe(false)
    expect(current.update(policy({ revision: 2 }))).toBe(false)
  })
})

describe("TST-DIAGNOSTICS-001 destination routing", () => {
  it("keeps cold defaults console-only with remote export and reports disabled", () => {
    expect(defaultLogPolicy).toMatchObject({
      schemaVersion: 2,
      revision: 0,
      enabled: true,
      console: { enabled: true, minimumLevel: "info" },
      diagnostics: {
        enabled: false,
        minimumLevel: "warn",
        errorReportsEnabled: false,
      },
    })
    expect(routeLog(defaultLogPolicy, "lists", "x.failed", "fatal")).toEqual({
      console: true,
      diagnostics: false,
    })
    expect(allowsErrorReport(defaultLogPolicy, "lists", "x.failed")).toBe(false)
  })

  it("upgrades legacy numeric thresholds to console only and module off to a shared veto", () => {
    const legacy = {
      schemaVersion: 1,
      revision: 4,
      enabled: true,
      minimumLevel: "debug",
      moduleLevels: { auth: "off", lists: "error" },
      suppressedEvents: ["mail.sent"],
    }
    const upgraded = logPolicySchema.parse(legacy)
    expect(upgraded).toEqual({
      schemaVersion: 2,
      revision: 4,
      enabled: true,
      disabledModules: ["auth"],
      suppressedEvents: ["mail.sent"],
      console: {
        enabled: true,
        minimumLevel: "debug",
        moduleLevels: { lists: "error" },
      },
      diagnostics: {
        enabled: false,
        minimumLevel: "warn",
        moduleLevels: {},
        errorReportsEnabled: false,
      },
    })
    const current = createLogPolicy()
    expect(current.update(legacy)).toBe(true)
    expect(routeLog(current.current(), "auth", "a.b", "fatal")).toEqual({
      console: false,
      diagnostics: false,
    })
    expect(allowsErrorReport(current.current(), "lists", "a.b")).toBe(false)
  })

  it.each([
    ["global off", policy({ enabled: false, diagnostics: remote })],
    ["module off", policy({ disabledModules: ["lists"], diagnostics: remote })],
    [
      "named event",
      policy({ suppressedEvents: ["list.failed"], diagnostics: remote }),
    ],
  ])("%s vetoes console, remote logs and explicit reports", (_, vetoed) => {
    expect(routeLog(vetoed, "lists", "list.failed", "fatal")).toEqual({
      console: false,
      diagnostics: false,
    })
    expect(allowsErrorReport(vetoed, "lists", "list.failed")).toBe(false)
    expect(routeLog(vetoed, "tasks", "task.failed", "fatal").console).toBe(
      vetoed.enabled
    )
  })

  it("routes each destination independently in both threshold directions", () => {
    const quietConsole = policy({
      console: { minimumLevel: "error" },
      diagnostics: { ...remote, minimumLevel: "info" },
    })
    expect(routeLog(quietConsole, "lists", "list.read", "info")).toEqual({
      console: false,
      diagnostics: true,
    })
    const quietRemote = policy({
      console: { minimumLevel: "debug" },
      diagnostics: { ...remote, minimumLevel: "warn" },
    })
    expect(routeLog(quietRemote, "lists", "list.read", "debug")).toEqual({
      console: true,
      diagnostics: false,
    })
    expect(routeLog(quietRemote, "lists", "list.slow", "warn")).toEqual({
      console: true,
      diagnostics: true,
    })
  })

  it("applies separate exact module overrides and destination off switches", () => {
    const split = policy({
      console: { minimumLevel: "info", moduleLevels: { lists: "fatal" } },
      diagnostics: {
        ...remote,
        minimumLevel: "error",
        moduleLevels: { lists: "debug" },
      },
    })
    expect(routeLog(split, "lists", "list.read", "debug")).toEqual({
      console: false,
      diagnostics: true,
    })
    expect(routeLog(split, "tasks", "task.read", "info")).toEqual({
      console: true,
      diagnostics: false,
    })
    const consoleOff = policy({
      console: { enabled: false },
      diagnostics: { ...remote, minimumLevel: "trace" },
    })
    expect(routeLog(consoleOff, "lists", "list.read", "trace")).toEqual({
      console: false,
      diagnostics: true,
    })
    const remoteOff = policy({
      diagnostics: { enabled: false, errorReportsEnabled: true },
    })
    expect(routeLog(remoteOff, "lists", "list.read", "fatal")).toEqual({
      console: true,
      diagnostics: false,
    })
    expect(allowsErrorReport(remoteOff, "lists", "list.failed")).toBe(false)
  })

  it("lets explicit reports ignore log thresholds but require both remote controls", () => {
    const thresholds = policy({
      console: { enabled: false },
      diagnostics: {
        ...remote,
        minimumLevel: "fatal",
        moduleLevels: { lists: "fatal" },
      },
    })
    expect(allowsErrorReport(thresholds, "lists", "list.failed")).toBe(true)
    expect(
      allowsErrorReport(
        policy({ diagnostics: { enabled: true, errorReportsEnabled: false } }),
        "lists",
        "list.failed"
      )
    ).toBe(false)
  })
})
