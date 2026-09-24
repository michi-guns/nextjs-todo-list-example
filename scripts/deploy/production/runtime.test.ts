import { describe, expect, it, vi } from "vitest"
import { parseEnvironmentProfile } from "../../environment/core"
import { productionTarget as target } from "./core"
import { createProductionRuntime } from "./runtime"

const environment = {
  APP_ENV: "production",
  NODE_ENV: "production",
  BETTER_AUTH_URL: target.origin,
  BETTER_AUTH_SECRET: "auth-private",
  DATABASE_PROVIDER: "neon",
  DATABASE_PROJECT_ID: target.neonProjectId,
  DATABASE_BRANCH: "main",
  DATABASE_URL:
    "postgresql://owner:secret@ep-production-pooler.neon.tech:5432/neondb?sslmode=require",
  DATABASE_URL_UNPOOLED:
    "postgresql://owner:secret@ep-production.neon.tech:5432/neondb?sslmode=require",
  NEXT_PUBLIC_SANITY_PROJECT_ID: "e2i6tepv",
  NEXT_PUBLIC_SANITY_DATASET: "production",
  SANITY_WRITE_POLICY: "production-recovery",
  SANITY_REVALIDATE_SECRET: "webhook-private",
  SANITY_MANUAL_RECOVERY_SECRET: "recovery-private",
  APP_MAIL_TRANSPORT: "remote",
  APP_MAIL_PROVIDER: "resend",
  APP_MAIL_FROM: "auth@example.com",
  RESEND_API_KEY: "re_private",
  SECRET_NAMESPACE: "production",
  DEPLOYMENT_OWNER: "github",
  VERCEL_ORG_ID: target.vercelTeamId,
  VERCEL_PROJECT_ID: target.vercelProjectId,
  VERCEL_TOKEN: "vercel-private",
  NEON_API_KEY: "neon-private",
  GITHUB_TOKEN: "github-private",
  HEALTH_PROBE_SECRET: "health-private-0123456789abcdef0123456789",
  GITHUB_REPOSITORY: "michi-guns/nextjs-todo-list-example",
}
const profile = parseEnvironmentProfile(environment)
const sha = "a".repeat(40)
const input = {
  ref: { requestedRef: sha, commitSha: sha, kind: "commit" as const },
  ci: { commitSha: sha, runId: 1, runAttempt: 1 },
  approvedSha: sha,
  rollbackCompatible: true,
  actor: "operator",
  workflowRunId: "1",
}
const observation = {
  projectId: target.neonProjectId,
  branchId: target.neonBranchId,
  branch: "main",
  directHost: "ep-production.neon.tech",
  database: "neondb",
  port: 5432,
  rollback: {
    deploymentId: target.placeholderDeploymentId,
    kind: "maintenance-placeholder" as const,
  },
}
const deployment = {
  deploymentId: "dpl_new",
  url: "https://deployment.vercel.app",
}
const health = { release: sha }
function provider() {
  return vi.fn<typeof fetch>().mockImplementation(async (url) => {
    const path = new URL(String(url)).pathname
    if (path.endsWith("/endpoints"))
      return Response.json({
        endpoints: [
          {
            project_id: target.neonProjectId,
            branch_id: target.neonBranchId,
            host: "ep-production.neon.tech",
            type: "read_write",
          },
        ],
      })
    if (path.endsWith("/databases"))
      return Response.json({
        databases: [{ name: "neondb", branch_id: target.neonBranchId }],
      })
    if (path.includes("/branches/"))
      return Response.json({
        branch: {
          id: target.neonBranchId,
          project_id: target.neonProjectId,
          name: "main",
        },
      })
    if (path.includes("/projects/"))
      return Response.json({
        id: target.vercelProjectId,
        accountId: target.vercelTeamId,
        targets: { production: { id: target.placeholderDeploymentId } },
      })
    if (path.includes("/deployments/"))
      return Response.json({
        id: path.split("/").at(-1),
        projectId: target.vercelProjectId,
        target: "production",
        readyState: "READY",
        meta: path.endsWith("dpl_new") ? { commitSha: sha } : {},
      })
    if (path.includes("/aliases/"))
      return Response.json({
        projectId: target.vercelProjectId,
        deploymentId: "dpl_new",
        alias: new URL(target.origin).hostname,
      })
    if (path.startsWith("/api/health/"))
      return Response.json({
        component: path.split("/").at(-1),
        status: "ok",
        release: health.release,
      })
    if (path === "/api/auth/get-session") return Response.json(null)
    if (path === "/api/lists") return Response.json({}, { status: 401 })
    return new Response("page", { status: 200 })
  })
}

describe("Production provider adapter", () => {
  it("observes scoped Neon/Vercel identities and the known maintenance fallback without mutation", async () => {
    const request = provider(),
      run = vi.fn().mockResolvedValue("")
    const runtime = createProductionRuntime(environment, { request, run })
    expect(await runtime.observe(profile)).toEqual({
      projectId: target.neonProjectId,
      branchId: target.neonBranchId,
      branch: "main",
      database: "neondb",
      directHost: "ep-production.neon.tech",
      port: 5432,
      rollback: {
        deploymentId: target.placeholderDeploymentId,
        kind: "maintenance-placeholder",
      },
    })
    expect(run).not.toHaveBeenCalled()
    for (const [url, init] of request.mock.calls) {
      expect(init?.redirect).toBe("error")
      expect(init?.method ?? "GET").toBe("GET")
      if (String(url).includes("api.vercel.com"))
        expect(String(url)).toContain(`teamId=${target.vercelTeamId}`)
    }
  })
  it("refuses a configured Vercel project outside the accepted target before network access", () => {
    const request = provider()
    expect(() =>
      createProductionRuntime(
        { ...environment, VERCEL_PROJECT_ID: "prj_other" },
        { request }
      )
    ).toThrow()
    expect(request).not.toHaveBeenCalled()
  })
  it("refuses an unknown prior deployment without immutable application metadata", async () => {
    const request = provider()
    request.mockImplementationOnce(async () =>
      Response.json({
        branch: {
          id: target.neonBranchId,
          project_id: target.neonProjectId,
          name: "main",
        },
      })
    )
    const real = request.getMockImplementation()!
    request.mockImplementation(async (url, init) =>
      String(url).includes("/v9/projects/")
        ? Response.json({
            id: target.vercelProjectId,
            accountId: target.vercelTeamId,
            targets: { production: { id: "dpl_unknown" } },
          })
        : real(url, init)
    )
    await expect(
      createProductionRuntime(environment, { request }).observe(profile)
    ).rejects.toThrow()
  })
  it("migrates with the direct URL and no seed or reset", async () => {
    const run = vi.fn().mockResolvedValue("")
    await createProductionRuntime(environment, { run }).migrate(
      profile.database.migrationUrl
    )
    expect(run).toHaveBeenCalledExactlyOnceWith(
      "pnpm",
      ["exec", "drizzle-kit", "migrate", "--config", "drizzle.config.ts"],
      {
        DATABASE_URL: profile.database.migrationUrl,
        DATABASE_URL_UNPOOLED: profile.database.migrationUrl,
      }
    )
  })
  it("deploys Production with exact metadata and only application configuration", async () => {
    const request = provider(),
      run = vi.fn().mockResolvedValue(
        JSON.stringify({
          status: "success",
          deployment: { id: "dpl_new", url: deployment.url },
        })
      )
    expect(
      await createProductionRuntime(environment, { request, run }).deploy(
        profile,
        input,
        observation
      )
    ).toEqual(deployment)
    const args = run.mock.calls[0][1] as string[]
    expect(args).toContain("--target=production")
    expect(args).toContain(`commitSha=${sha}`)
    expect(args).toContain(`BETTER_AUTH_URL=${target.origin}`)
    expect(args).toContain("RESEND_API_KEY=re_private")
    for (const value of [
      `APP_RELEASE_SHA=${sha}`,
      "DATABASE_ENDPOINT_HOST=ep-production.neon.tech",
      `HEALTH_PROBE_SECRET=${environment.HEALTH_PROBE_SECRET}`,
    ]) {
      // Runtime and build receive the same safe identity.
      expect(args.filter((arg) => arg === value)).toHaveLength(2)
    }
    expect(args.join(" ")).not.toMatch(
      /DATABASE_URL_UNPOOLED|NEON_API_KEY|GITHUB_TOKEN|VERCEL_TOKEN/
    )
    expect(request.mock.calls[0][0]).toContain(
      "/v13/deployments/dpl_new?teamId="
    )
  })
  it.each([
    { target: "preview" },
    { meta: { commitSha: "b".repeat(40) } },
    { projectId: "prj_other" },
    { readyState: "ERROR" },
  ])("refuses mismatched deployed identity %j", async (override) => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        id: "dpl_new",
        projectId: target.vercelProjectId,
        target: "production",
        readyState: "READY",
        meta: { commitSha: sha },
        ...override,
      })
    )
    const run = vi
      .fn()
      .mockResolvedValue(JSON.stringify({ id: "dpl_new", url: deployment.url }))
    await expect(
      createProductionRuntime(environment, { request, run }).deploy(
        profile,
        input,
        observation
      )
    ).rejects.toThrow()
  })
  it("checks canonical routing, unauthenticated boundaries and the real Sanity read command", async () => {
    const request = provider(),
      run = vi.fn().mockResolvedValue("")
    await createProductionRuntime(environment, { request, run }).smoke(
      deployment,
      profile,
      input
    )
    expect(request.mock.calls.map((c) => c[0])).toContain(
      `${target.origin}/api/lists`
    )
    expect(run).toHaveBeenCalledWith("pnpm", ["sanity:smoke"])
    const probes = request.mock.calls.filter(([url]) =>
      String(url).startsWith(`${target.origin}/api/health/`)
    )
    expect(probes.map(([url]) => String(url))).toEqual(
      ["app", "database", "cms"].map((c) => `${target.origin}/api/health/${c}`)
    )
    expect(new Headers(probes[1][1]?.headers).get("x-health-secret")).toBe(
      environment.HEALTH_PROBE_SECRET
    )
  })
  it("fails the smoke when the canonical origin runs another release", async () => {
    const request = provider(),
      run = vi.fn().mockResolvedValue("")
    health.release = "b".repeat(40)
    try {
      await expect(
        createProductionRuntime(environment, { request, run }).smoke(
          deployment,
          profile,
          input
        )
      ).rejects.toThrow("release_mismatch")
    } finally {
      health.release = sha
    }
    expect(run).not.toHaveBeenCalled()
  })
  it("refuses to run without a valid monitor secret before network access", () => {
    const request = provider()
    for (const secret of [undefined, "short"])
      expect(() =>
        createProductionRuntime(
          { ...environment, HEALTH_PROBE_SECRET: secret },
          { request }
        )
      ).toThrow("Invalid Production provider configuration")
    expect(request).not.toHaveBeenCalled()
  })
  it("refuses a canonical alias pointing at an older deployment", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        projectId: target.vercelProjectId,
        deploymentId: "dpl_old",
        alias: new URL(target.origin).hostname,
      })
    )
    const run = vi.fn()
    await expect(
      createProductionRuntime(environment, { request, run }).smoke(
        deployment,
        profile,
        input
      )
    ).rejects.toThrow()
    expect(run).not.toHaveBeenCalled()
  })
})
