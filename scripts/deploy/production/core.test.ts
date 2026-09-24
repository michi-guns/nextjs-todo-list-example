import { describe, expect, it, vi } from "vitest"
import {
  runProductionRelease,
  type ProductionRuntime,
  type ReleaseInput,
} from "./core"

const sha = "a".repeat(40)
const input: ReleaseInput = {
  ref: { requestedRef: sha, commitSha: sha, kind: "commit" },
  ci: { commitSha: sha, runId: 123, runAttempt: 1 },
  approvedSha: sha,
  rollbackCompatible: true,
  actor: "jimzord12",
  workflowRunId: "456",
}
export function productionEnvironment(): Record<string, string> {
  return {
    APP_ENV: "production",
    NODE_ENV: "production",
    BETTER_AUTH_URL: "https://nextjs-todo-list-example.vercel.app",
    BETTER_AUTH_SECRET: "test-auth-secret",
    DATABASE_PROVIDER: "neon",
    DATABASE_PROJECT_ID: "jolly-dew-32309276",
    DATABASE_BRANCH: "main",
    DATABASE_URL:
      "postgresql://owner:secret@ep-production-pooler.neon.tech:5432/neondb?sslmode=require",
    DATABASE_URL_UNPOOLED:
      "postgresql://owner:secret@ep-production.neon.tech:5432/neondb?sslmode=require",
    NEXT_PUBLIC_SANITY_PROJECT_ID: "e2i6tepv",
    NEXT_PUBLIC_SANITY_DATASET: "production",
    SANITY_WRITE_POLICY: "production-recovery",
    SANITY_REVALIDATE_SECRET: "webhook-secret",
    SANITY_MANUAL_RECOVERY_SECRET: "recovery-secret",
    APP_MAIL_TRANSPORT: "remote",
    APP_MAIL_PROVIDER: "resend",
    APP_MAIL_FROM: "auth@example.com",
    RESEND_API_KEY: "re_sensitive_key",
    DEPLOYMENT_OWNER: "github",
    SECRET_NAMESPACE: "production",
  }
}
const target = {
  projectId: "jolly-dew-32309276",
  branchId: "br-purple-sea-a53v962l",
  branch: "main",
  directHost: "ep-production.neon.tech",
  database: "neondb",
  port: 5432,
  rollback: {
    deploymentId: "dpl_previous",
    commitSha: "b".repeat(40),
    kind: "application" as const,
  },
}
function runtime() {
  return {
    verifyRevision: vi.fn().mockResolvedValue(undefined),
    observe: vi.fn().mockResolvedValue(target),
    migrate: vi.fn().mockResolvedValue(undefined),
    deploy: vi.fn().mockResolvedValue({
      deploymentId: "dpl_new",
      url: "https://deployment.vercel.app",
    }),
    smoke: vi.fn().mockResolvedValue(undefined),
  } satisfies ProductionRuntime
}

describe("Production release stage boundary (TST-RELEASE-001)", () => {
  it("validates then migrates, deploys and smokes in order with recovery evidence", async () => {
    const rt = runtime()
    const record = await runProductionRelease(
      input,
      productionEnvironment(),
      rt
    )
    expect(record.result).toBe("succeeded")
    expect(record.stages).toEqual({
      preflight: "succeeded",
      migration: "succeeded",
      deployment: "succeeded",
      smoke: "succeeded",
    })
    expect(record.rollback).toEqual({
      ...target.rollback,
      forwardSchemaCompatible: true,
    })
    expect(record.deployment?.deploymentId).toBe("dpl_new")
    expect(rt.migrate).toHaveBeenCalledWith(
      productionEnvironment().DATABASE_URL_UNPOOLED
    )
    expect(rt.verifyRevision.mock.invocationCallOrder[0]).toBeLessThan(
      rt.observe.mock.invocationCallOrder[0]
    )
    expect(rt.observe.mock.invocationCallOrder[0]).toBeLessThan(
      rt.migrate.mock.invocationCallOrder[0]
    )
    expect(rt.migrate.mock.invocationCallOrder[0]).toBeLessThan(
      rt.deploy.mock.invocationCallOrder[0]
    )
    expect(rt.deploy.mock.invocationCallOrder[0]).toBeLessThan(
      rt.smoke.mock.invocationCallOrder[0]
    )
    // The deployment receives the observed endpoint; the smoke the exact ref.
    expect(rt.deploy.mock.calls[0][2]).toBe(target)
    expect(rt.smoke.mock.calls[0][2]).toBe(input)
  })

  it("records a failed smoke stage when the running release is wrong", async () => {
    const rt = runtime()
    rt.smoke.mockRejectedValue(
      new Error("Deployed app health check failed: release_mismatch")
    )
    const record = await runProductionRelease(
      input,
      productionEnvironment(),
      rt
    )
    expect(record.result).toBe("failed")
    expect(record.stages.smoke).toBe("failed")
    expect(JSON.stringify(record)).not.toContain("release_mismatch")
  })

  it.each([
    { approvedSha: "b".repeat(40) },
    { rollbackCompatible: false },
    { ci: { ...input.ci, commitSha: "b".repeat(40) } },
  ])(
    "refuses inconsistent release proof before external operations",
    async (override) => {
      const rt = runtime()
      const record = await runProductionRelease(
        { ...input, ...override },
        productionEnvironment(),
        rt
      )
      expect(record.stages.preflight).toBe("failed")
      expect(rt.verifyRevision).not.toHaveBeenCalled()
      expect(rt.observe).not.toHaveBeenCalled()
      expect(rt.migrate).not.toHaveBeenCalled()
    }
  )

  it("refuses missing remote mail configuration before mutation", async () => {
    const env = productionEnvironment()
    delete env.RESEND_API_KEY
    const rt = runtime()
    const record = await runProductionRelease(input, env, rt)
    expect(record.result).toBe("failed")
    expect(rt.migrate).not.toHaveBeenCalled()
  })

  it.each([
    { projectId: "development-project" },
    { branchId: "another-branch" },
    { directHost: "ep-another.neon.tech" },
    { database: "another" },
  ])("refuses mismatched observed database %j", async (override) => {
    const rt = runtime()
    rt.observe.mockResolvedValue({ ...target, ...override })
    const record = await runProductionRelease(
      input,
      productionEnvironment(),
      rt
    )
    expect(record.stages.preflight).toBe("failed")
    expect(rt.migrate).not.toHaveBeenCalled()
    expect(rt.deploy).not.toHaveBeenCalled()
  })

  it("refuses a pooled migration endpoint", async () => {
    const rt = runtime()
    const env = productionEnvironment()
    env.DATABASE_URL_UNPOOLED = env.DATABASE_URL
    const record = await runProductionRelease(input, env, rt)
    expect(record.result).toBe("failed")
    expect(rt.migrate).not.toHaveBeenCalled()
  })

  it("refuses a pooled runtime URL pointing to a different database endpoint", async () => {
    const rt = runtime()
    const env = productionEnvironment()
    env.DATABASE_URL = env.DATABASE_URL.replace("ep-production", "ep-other")
    const record = await runProductionRelease(input, env, rt)
    expect(record.stages.preflight).toBe("failed")
    expect(rt.migrate).not.toHaveBeenCalled()
  })

  it.each(["verifyRevision", "observe", "migrate", "deploy", "smoke"] as const)(
    "records safe partial failure at %s",
    async (operation) => {
      const rt = runtime()
      rt[operation].mockRejectedValue(
        new Error("postgresql://owner:secret@db/neondb re_sensitive_key")
      )
      const record = await runProductionRelease(
        input,
        productionEnvironment(),
        rt
      )
      expect(record.result).toBe("failed")
      expect(JSON.stringify(record)).not.toContain("secret")
      expect(JSON.stringify(record)).not.toContain("re_sensitive_key")
      if (operation === "migrate") {
        expect(record.stages.migration).toBe("failed")
        expect(rt.deploy).not.toHaveBeenCalled()
      }
      if (operation === "deploy") {
        expect(record.stages.migration).toBe("succeeded")
        expect(record.stages.deployment).toBe("failed")
        expect(rt.smoke).not.toHaveBeenCalled()
        expect(record.rollback?.deploymentId).toBe("dpl_previous")
      }
      if (operation === "smoke") {
        expect(record.stages.deployment).toBe("succeeded")
        expect(record.stages.smoke).toBe("failed")
        expect(record.deployment?.deploymentId).toBe("dpl_new")
      }
    }
  )
})
