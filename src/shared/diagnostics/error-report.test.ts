import { describe, expect, it } from "vitest"
import { projectErrorReport } from "./error-report"

const context = {
  module: "lists",
  event: "list.create.failed",
  environment: "production" as const,
  correlationId: "11111111-1111-4111-8111-111111111111",
  operation: "list.create",
}
const root = "C:/Users/private-person/work/app"
const sentinels =
  /private-person|person@example\.com|sk_live|secret-token|\?token=|query=|Bearer/

function errorWithStack(message: string, stack: string, cause?: unknown) {
  const error = new Error(message, { cause })
  Object.defineProperty(error, "stack", { value: stack })
  return error
}

describe("TST-DIAGNOSTICS-001 safe error reports", () => {
  it("projects allowlisted facts, relative frames and static text without private strings", () => {
    const cause = Object.assign(
      new Error("password=hunter2 person@example.com"),
      {
        code: "ECONNREFUSED",
      }
    )
    const error = errorWithStack(
      "Bearer secret-token for person@example.com",
      [
        "Error: Bearer secret-token for person@example.com",
        "    at createList (C:\\Users\\private-person\\work\\app\\src\\modules\\lists\\service.ts:42:7)",
        "    at async run (file:///C:/Users/private-person/work/app/.next/server/chunks/ssr/app.js?token=sk_live:9:3)",
        "    at Object.<anonymous> (/home/private-person/elsewhere/other.ts:1:1)",
        "    at node:internal/process/task_queues:105:5",
        "    at /srv/app/node_modules/pg/lib/client.js:545:17",
        "    at weird (https://cdn.example/app.js?query=person@example.com:1:1)",
      ].join("\n"),
      cause
    )
    const report = projectErrorReport(error, context, { root })
    expect(report).toMatchObject({
      ...context,
      error: {
        class: "Error",
        kind: "unexpected",
        message: "Unexpected failure",
      },
      causes: [{ class: "Error", kind: "unavailable", code: "ECONNREFUSED" }],
    })
    expect(report.error.frames).toEqual([
      {
        file: "src/modules/lists/service.ts",
        function: "createList",
        line: 42,
        column: 7,
      },
      {
        file: ".next/server/chunks/ssr/app.js",
        function: "run",
        line: 9,
        column: 3,
      },
      { file: "other.ts", function: "Object.<anonymous>", line: 1, column: 1 },
      { file: "node:internal/process/task_queues", line: 105, column: 5 },
      { file: "node_modules/pg/lib/client.js", line: 545, column: 17 },
      { file: "app.js", function: "weird", line: 1, column: 1 },
    ])
    expect(JSON.stringify(report)).not.toMatch(sentinels)
    expect(Date.parse(report.timestamp)).not.toBeNaN()
  })

  it("groups repeated occurrences by stable safe fields, never by occurrence or request IDs", () => {
    const stack =
      "TypeError: x\n    at createList (C:/Users/private-person/work/app/src/a.ts:1:1)"
    const first = projectErrorReport(
      errorWithStack("first person@example.com", stack),
      context,
      { root }
    )
    const second = projectErrorReport(
      errorWithStack("second text", stack),
      { ...context, correlationId: "22222222-2222-4222-8222-222222222222" },
      { root }
    )
    expect(first.fingerprint).toEqual(second.fingerprint)
    expect(first.fingerprint).toEqual([
      "lists",
      "list.create.failed",
      "Error",
      "unexpected",
      "src/a.ts:createList",
    ])
    expect(first.occurrenceId).not.toBe(second.occurrenceId)
    expect(first.fingerprint.join()).not.toContain(first.occurrenceId)
    expect(first.fingerprint.join()).not.toContain(context.correlationId)
    const distinct = projectErrorReport(
      Object.assign(new TypeError("other"), { code: "ETIMEDOUT" }),
      context,
      { root }
    )
    expect(distinct.fingerprint).not.toEqual(first.fingerprint)
    expect(distinct.error).toMatchObject({
      class: "TypeError",
      kind: "timeout",
      code: "ETIMEDOUT",
      message: "Dependency timeout",
    })
  })

  it("refuses unsafe class names, runs no getters and bounds frames and cause chains", () => {
    let getterCalls = 0
    class Hostile extends Error {}
    Object.defineProperty(Hostile, "name", { value: "person@example.com" })
    const hostile = new Hostile("x")
    Object.defineProperty(hostile, "code", {
      get() {
        getterCalls++
        return "ETIMEDOUT"
      },
    })
    let chain: unknown = new Error("deepest")
    for (let i = 0; i < 6; i++)
      chain = new Error(`level ${i}`, { cause: chain })
    Object.defineProperty(chain as Error, "stack", {
      value: `Error\n${"    at f (/x/a.ts:1:1)\n".repeat(50)}`,
    })
    const report = projectErrorReport(chain, context, { root })
    expect(report.causes).toHaveLength(3)
    expect(report.error.frames).toHaveLength(10)
    const projected = projectErrorReport(hostile, context, { root })
    expect(projected.error).toMatchObject({
      class: "Error",
      kind: "unexpected",
    })
    expect(getterCalls).toBe(0)
  })

  it("does not mistake message lines that imitate frames for stack frames", () => {
    const forged = new Error(
      "first\n    at forged (/tmp/person@example.com.ts:1:1)"
    )
    const report = projectErrorReport(forged, context, { root })
    expect(JSON.stringify(report)).not.toMatch(sentinels)
    expect(report.error.frames.length).toBeGreaterThan(0)
    expect(report.error.frames.map((frame) => frame.function)).not.toContain(
      "forged"
    )
  })

  it.each([
    ["a string", "person@example.com secret-token"],
    ["null", null],
    ["a plain object", { message: "person@example.com", stack: "at x" }],
  ])("contains non-Error values (%s) as fact-free reports", (_, thrown) => {
    const report = projectErrorReport(thrown, context, { root })
    expect(report.error).toEqual({
      class: "NonError",
      kind: "unexpected",
      message: "Unexpected failure",
      frames: [],
    })
    expect(JSON.stringify(report)).not.toMatch(sentinels)
  })
})
