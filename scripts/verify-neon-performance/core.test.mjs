import { describe, expect, it } from "vitest"

import {
  assertCursorSequence,
  assertDevelopmentTarget,
  deterministicUuid,
  extractPlanSummary,
} from "./core.mjs"

describe("Neon performance guards", () => {
  it("accepts the direct expected development endpoint", () => {
    expect(
      assertDevelopmentTarget({
        databaseUrl:
          "postgresql://user:password@ep-example.us-east-2.aws.neon.tech/neondb?sslmode=require",
        expectedHost: "ep-example.us-east-2.aws.neon.tech",
        branchName: "development",
      })
    ).toEqual({
      branchName: "development",
      host: "ep-example.us-east-2.aws.neon.tech",
    })
  })

  it("rejects the default, pooled, or mislabeled target", () => {
    expect(() =>
      assertDevelopmentTarget({
        databaseUrl:
          "postgresql://user:password@ep-default.us-east-2.aws.neon.tech/neondb",
        expectedHost: "ep-development.us-east-2.aws.neon.tech",
        branchName: "development",
      })
    ).toThrow(/host does not match/i)

    expect(() =>
      assertDevelopmentTarget({
        databaseUrl:
          "postgresql://user:password@ep-development-pooler.us-east-2.aws.neon.tech/neondb",
        expectedHost: "ep-development-pooler.us-east-2.aws.neon.tech",
        branchName: "development",
      })
    ).toThrow(/pooled/i)

    expect(() =>
      assertDevelopmentTarget({
        databaseUrl:
          "postgresql://user:password@ep-development.us-east-2.aws.neon.tech/neondb",
        expectedHost: "ep-development.us-east-2.aws.neon.tech",
        branchName: "main",
      })
    ).toThrow(/development/i)
  })

  it("creates stable UUIDs for rerunnable synthetic rows", () => {
    const first = deterministicUuid("t16-performance:list:1")

    expect(first).toBe(deterministicUuid("t16-performance:list:1"))
    expect(first).not.toBe(deterministicUuid("t16-performance:list:2"))
    expect(first).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    )
  })
})

describe("Neon performance query evidence", () => {
  it("summarizes index scans and sequential scans recursively", () => {
    const summary = extractPlanSummary([
      {
        Plan: {
          "Node Type": "Limit",
          Plans: [
            {
              "Node Type": "Index Scan",
              "Index Name": "tasks_user_list_created_at_id_idx",
              "Relation Name": "tasks",
              "Actual Rows": 21,
              "Actual Total Time": 0.2,
            },
          ],
        },
        "Execution Time": 0.3,
      },
    ])

    expect(summary.indexNames).toEqual(["tasks_user_list_created_at_id_idx"])
    expect(summary.sequentialScans).toEqual([])
    expect(summary.executionTimeMs).toBe(0.3)

    const sequential = extractPlanSummary([
      {
        Plan: {
          "Node Type": "Seq Scan",
          "Relation Name": "tasks",
        },
        "Execution Time": 1,
      },
    ])

    expect(sequential.sequentialScans).toEqual(["tasks"])
  })

  it("rejects duplicate, out-of-order, or incomplete cursor pages", () => {
    expect(() =>
      assertCursorSequence({
        pages: [
          [
            { id: "a", createdAt: 3 },
            { id: "b", createdAt: 2 },
          ],
          [
            { id: "b", createdAt: 2 },
            { id: "c", createdAt: 1 },
          ],
        ],
        direction: "desc",
        expectedCount: 4,
      })
    ).toThrow(/duplicate/i)

    expect(() =>
      assertCursorSequence({
        pages: [
          [
            { id: "a", createdAt: 1 },
            { id: "b", createdAt: 2 },
          ],
        ],
        direction: "desc",
        expectedCount: 2,
      })
    ).toThrow(/order/i)

    expect(() =>
      assertCursorSequence({
        pages: [[{ id: "a", createdAt: 2 }]],
        direction: "desc",
        expectedCount: 2,
      })
    ).toThrow(/expected 2/i)

    expect(() =>
      assertCursorSequence({
        pages: [
          [
            { id: "a", createdAt: 2 },
            { id: "c", createdAt: 1 },
            { id: "b", createdAt: 1 },
          ],
        ],
        direction: "desc",
        expectedCount: 3,
      })
    ).not.toThrow()

    expect(() =>
      assertCursorSequence({
        pages: [
          [
            { id: "b", createdAt: 1 },
            { id: "c", createdAt: 1 },
          ],
        ],
        direction: "desc",
        expectedCount: 2,
      })
    ).toThrow(/order/i)
  })
})
