import { describe, expect, it, vi } from "vitest"

import {
  PREVIEW_PARENT_BRANCH,
  PREVIEW_PROJECT_ID,
  previewBranchName,
} from "./constants"
import { parseEnvironmentProfile } from "../../environment/core"

import {
  PreviewDeliveryError,
  parsePreviewCommand,
  redactPreviewLog,
  runPreviewCommand,
  runPreviewProcess,
  type ObservedPreviewBranch,
  type PreviewRuntime,
} from "./core"
import { buildPreviewVercelEnvArgs } from "./vercel"

const COMMIT_SHA = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
const OTHER_COMMIT_SHA = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
const PREVIEW_ID = "demo-1"
const BRANCH = previewBranchName(PREVIEW_ID)
const directHost = "ep-preview-demo.us-east-2.aws.neon.tech"
const pooledHost = "ep-preview-demo-pooler.us-east-2.aws.neon.tech"
const database = "neondb"
const directUrl = `postgresql://migration:migration-password@${directHost}:5432/${database}?sslmode=require`
const pooledUrl = `postgresql://runtime:runtime-password@${pooledHost}:5432/${database}?sslmode=require`

const HEALTH_SECRET = "preview-health-secret-0123456789abcdefghij"

function previewEnvironment(
  overrides: Record<string, string | undefined> = {}
): Record<string, string | undefined> {
  return {
    APP_ENV: "preview",
    NODE_ENV: "production",
    BETTER_AUTH_URL: "https://preview.example.test",
    BETTER_AUTH_SECRET: "preview-auth-secret-for-tests",
    DATABASE_PROVIDER: "neon",
    DATABASE_PROJECT_ID: PREVIEW_PROJECT_ID,
    DATABASE_BRANCH: BRANCH,
    DATABASE_URL: pooledUrl,
    DATABASE_URL_UNPOOLED: directUrl,
    NEXT_PUBLIC_SANITY_PROJECT_ID: "project-id",
    NEXT_PUBLIC_SANITY_DATASET: "preview",
    NEXT_PUBLIC_SANITY_API_VERSION: "2026-08-27",
    SANITY_WRITE_POLICY: "read-only",
    APP_MAIL_TRANSPORT: "controlled-account",
    DEPLOYMENT_OWNER: "github",
    SECRET_NAMESPACE: "preview",
    HEALTH_PROBE_SECRET: HEALTH_SECRET,
    ...overrides,
  }
}

function observedBranch(
  overrides: Partial<ObservedPreviewBranch> = {}
): ObservedPreviewBranch {
  return {
    projectId: PREVIEW_PROJECT_ID,
    branch: BRANCH,
    branchId: "br-preview-demo",
    isDefault: false,
    expiresAt: "2026-09-10T00:00:00Z",
    parentBranch: PREVIEW_PARENT_BRANCH,
    directHost,
    pooledHost,
    database,
    port: 5432,
    directUrl,
    pooledUrl,
    ...overrides,
  }
}

function unusedRuntime(): PreviewRuntime {
  return {
    resolveRef: vi.fn().mockResolvedValue({
      requestedRef: COMMIT_SHA,
      commitSha: COMMIT_SHA,
      kind: "commit",
    }),
    inspectWorkspace: vi.fn().mockResolvedValue({
      commitSha: COMMIT_SHA,
      status: "",
    }),
    preflightDeploy: vi.fn().mockResolvedValue({
      projectId: "prj_test000000000000000000",
      productionDeploymentId: "dpl_placeholderProduction00000",
    }),
    observeBranch: vi.fn().mockResolvedValue(observedBranch()),
    createBranch: vi.fn().mockResolvedValue(observedBranch()),
    deleteBranch: vi.fn(),
    migrate: vi.fn(),
    seed: vi.fn(),
    deploy: vi.fn().mockResolvedValue({
      url: "https://preview-demo.vercel.app",
      deploymentId: "dpl_preview_demo",
    }),
    smoke: vi.fn().mockResolvedValue({
      landing: true,
      signedIn: true,
      mutated: true,
    }),
  }
}

describe("Preview delivery commands", () => {
  it.each([
    ["deploy", "--ref", COMMIT_SHA, "--preview-id", PREVIEW_ID],
    ["cleanup", "--preview-id", PREVIEW_ID],
    ["inspect", "--preview-id", PREVIEW_ID],
  ])("accepts the pnpm forwarded separator before %s", (...args) => {
    expect(parsePreviewCommand(["--", ...args])).toEqual(
      parsePreviewCommand(args)
    )
  })

  it("preflights the Vercel project after the workspace guard and before any Neon operation", async () => {
    const runtime = unusedRuntime()
    await runPreviewCommand(
      { command: "deploy", ref: COMMIT_SHA, previewId: PREVIEW_ID },
      { environment: previewEnvironment(), runtime, write: vi.fn() }
    )
    const order = [
      runtime.inspectWorkspace,
      runtime.preflightDeploy,
      runtime.observeBranch,
      runtime.deploy,
    ].map((operation) => {
      expect(operation).toHaveBeenCalledOnce()
      return vi.mocked(operation).mock.invocationCallOrder[0]
    })
    expect(order).toEqual([...order].sort((a, b) => a - b))
  })

  it("stops before observing or creating a Neon branch when the Vercel project has no Production deployment", async () => {
    const runtime = unusedRuntime()
    const refusal = new PreviewDeliveryError(
      "target_mismatch",
      "Vercel project has no Production deployment"
    )
    runtime.preflightDeploy = vi.fn().mockRejectedValue(refusal)
    const write = vi.fn()
    await expect(
      runPreviewCommand(
        { command: "deploy", ref: COMMIT_SHA, previewId: PREVIEW_ID },
        { environment: previewEnvironment(), runtime, write }
      )
    ).rejects.toBe(refusal)
    expect(runtime.observeBranch).not.toHaveBeenCalled()
    expect(runtime.createBranch).not.toHaveBeenCalled()
    expect(runtime.migrate).not.toHaveBeenCalled()
    expect(runtime.seed).not.toHaveBeenCalled()
    expect(runtime.deploy).not.toHaveBeenCalled()
    expect(write).not.toHaveBeenCalled()
  })

  it("does not preflight Vercel for inspect or cleanup", async () => {
    for (const command of ["inspect", "cleanup"] as const) {
      const runtime = unusedRuntime()
      await runPreviewCommand(
        { command, previewId: PREVIEW_ID },
        { environment: previewEnvironment(), runtime, write: vi.fn() }
      )
      expect(runtime.preflightDeploy).not.toHaveBeenCalled()
    }
  })

  it("runs migration, seed, deployment and smoke in order before recording success", async () => {
    const runtime = unusedRuntime()
    const write = vi.fn()
    await runPreviewCommand(
      { command: "deploy", ref: COMMIT_SHA, previewId: PREVIEW_ID },
      { environment: previewEnvironment(), runtime, write }
    )
    const order = [
      runtime.migrate,
      runtime.seed,
      runtime.deploy,
      runtime.smoke,
      write,
    ].map((operation) => {
      expect(operation).toHaveBeenCalledOnce()
      return vi.mocked(operation).mock.invocationCallOrder[0]
    })
    expect(order).toEqual([...order].sort((a, b) => a - b))
    expect(runtime.deploy).toHaveBeenCalledWith(
      expect.objectContaining({ healthSecret: HEALTH_SECRET })
    )
    expect(runtime.smoke).toHaveBeenCalledWith(
      expect.objectContaining({
        commitSha: COMMIT_SHA,
        healthSecret: HEALTH_SECRET,
      })
    )
  })

  it.each([undefined, "short"])(
    "refuses a Preview deploy without a valid monitor secret (%s) before any branch exists",
    async (secret) => {
      const runtime = unusedRuntime()
      await expect(
        runPreviewCommand(
          { command: "deploy", ref: COMMIT_SHA, previewId: PREVIEW_ID },
          {
            environment: previewEnvironment({ HEALTH_PROBE_SECRET: secret }),
            runtime,
            write: vi.fn(),
          }
        )
      ).rejects.toThrow(expect.objectContaining({ code: "invalid_command" }))
      expect(runtime.resolveRef).not.toHaveBeenCalled()
      expect(runtime.createBranch).not.toHaveBeenCalled()
      expect(runtime.deploy).not.toHaveBeenCalled()
    }
  )

  it.each(["migrate", "seed", "deploy", "smoke"] as const)(
    "stops after %s failure and allows only explicit matching cleanup",
    async (stage) => {
      const runtime = unusedRuntime()
      const failure = new Error(`${stage} failed`)
      runtime[stage] = vi.fn().mockRejectedValue(failure)
      const write = vi.fn()
      await expect(
        runPreviewCommand(
          { command: "deploy", ref: COMMIT_SHA, previewId: PREVIEW_ID },
          { environment: previewEnvironment(), runtime, write }
        )
      ).rejects.toBe(failure)
      const stages = ["migrate", "seed", "deploy", "smoke"] as const
      for (const later of stages.slice(stages.indexOf(stage) + 1)) {
        expect(runtime[later]).not.toHaveBeenCalled()
      }
      expect(write).not.toHaveBeenCalled()
      expect(runtime.deleteBranch).not.toHaveBeenCalled()

      await runPreviewCommand(
        { command: "cleanup", previewId: PREVIEW_ID },
        { environment: previewEnvironment(), runtime, write }
      )
      expect(runtime.deleteBranch).toHaveBeenCalledExactlyOnceWith(BRANCH)
    }
  )

  it("preserves Git commit-peel syntax through the host process wrapper", async () => {
    await expect(
      runPreviewProcess("git", ["rev-parse", "--verify", "HEAD^{commit}"])
    ).resolves.toMatch(/^[0-9a-f]{40}\r?\n$/i)
  })

  it("parses deploy, cleanup, and inspect and rejects extras", () => {
    expect(
      parsePreviewCommand([
        "deploy",
        "--ref",
        COMMIT_SHA,
        "--preview-id",
        PREVIEW_ID,
      ])
    ).toEqual({
      command: "deploy",
      ref: COMMIT_SHA,
      previewId: PREVIEW_ID,
    })
    expect(
      parsePreviewCommand(["cleanup", "--preview-id", PREVIEW_ID])
    ).toEqual({
      command: "cleanup",
      previewId: PREVIEW_ID,
    })
    expect(
      parsePreviewCommand(["inspect", "--preview-id", PREVIEW_ID])
    ).toEqual({
      command: "inspect",
      previewId: PREVIEW_ID,
    })
    expect(() => parsePreviewCommand(["reset"])).toThrow(PreviewDeliveryError)
    expect(() =>
      parsePreviewCommand(["deploy", "--preview-id", PREVIEW_ID])
    ).toThrow(/--ref is required/)
    expect(() => parsePreviewCommand(["cleanup"])).toThrow(/preview-id/)
    expect(() =>
      parsePreviewCommand([
        "deploy",
        "--ref",
        "main",
        "--preview-id",
        PREVIEW_ID,
      ])
    ).toThrow(/mutable alias/)
  })

  it("names the Neon branch preview-<preview-id>", () => {
    expect(previewBranchName("demo-1")).toBe("preview-demo-1")
  })

  it("refuses a requested revision different from the checkout before any Preview operation", async () => {
    const runtime = unusedRuntime()
    runtime.inspectWorkspace = vi.fn().mockResolvedValue({
      commitSha: OTHER_COMMIT_SHA,
      status: "",
    })

    await expect(
      runPreviewCommand(
        parsePreviewCommand([
          "deploy",
          "--ref",
          COMMIT_SHA,
          "--preview-id",
          PREVIEW_ID,
        ]),
        { environment: previewEnvironment(), runtime }
      )
    ).rejects.toMatchObject({ code: "workspace_mismatch" })

    expect(runtime.observeBranch).not.toHaveBeenCalled()
    expect(runtime.createBranch).not.toHaveBeenCalled()
    expect(runtime.migrate).not.toHaveBeenCalled()
    expect(runtime.seed).not.toHaveBeenCalled()
    expect(runtime.deploy).not.toHaveBeenCalled()
    expect(runtime.smoke).not.toHaveBeenCalled()
  })

  it("refuses local edits at the requested revision before any Preview operation", async () => {
    const runtime = unusedRuntime()
    runtime.inspectWorkspace = vi.fn().mockResolvedValue({
      commitSha: COMMIT_SHA,
      status: " M migrations/0002_example.sql",
    })

    await expect(
      runPreviewCommand(
        parsePreviewCommand([
          "deploy",
          "--ref",
          COMMIT_SHA,
          "--preview-id",
          PREVIEW_ID,
        ]),
        { environment: previewEnvironment(), runtime }
      )
    ).rejects.toMatchObject({ code: "workspace_mismatch" })

    expect(runtime.observeBranch).not.toHaveBeenCalled()
    expect(runtime.createBranch).not.toHaveBeenCalled()
    expect(runtime.migrate).not.toHaveBeenCalled()
    expect(runtime.seed).not.toHaveBeenCalled()
    expect(runtime.deploy).not.toHaveBeenCalled()
    expect(runtime.smoke).not.toHaveBeenCalled()
  })

  it("refuses production, local, and development profiles before creating a branch", async () => {
    const runtime = unusedRuntime()

    for (const appEnv of ["production", "local", "development"] as const) {
      await expect(
        runPreviewCommand(
          parsePreviewCommand([
            "deploy",
            "--ref",
            COMMIT_SHA,
            "--preview-id",
            PREVIEW_ID,
          ]),
          {
            environment: previewEnvironment({ APP_ENV: appEnv }),
            runtime,
          }
        )
      ).rejects.toMatchObject({ code: "target_mismatch" })
    }

    expect(runtime.createBranch).not.toHaveBeenCalled()
    expect(runtime.migrate).not.toHaveBeenCalled()
    expect(runtime.deploy).not.toHaveBeenCalled()
  })

  it("refuses a missing, default, main, development, or non-expiring observed branch before mutation", async () => {
    const runtime = unusedRuntime()
    runtime.observeBranch = vi.fn().mockResolvedValue(
      observedBranch({
        branch: "development",
        expiresAt: null,
        directHost: "ep-development.us-east-2.aws.neon.tech",
        pooledHost: "ep-development-pooler.us-east-2.aws.neon.tech",
      })
    )

    await expect(
      runPreviewCommand(
        parsePreviewCommand([
          "deploy",
          "--ref",
          COMMIT_SHA,
          "--preview-id",
          PREVIEW_ID,
        ]),
        { environment: previewEnvironment(), runtime }
      )
    ).rejects.toMatchObject({ code: "target_mismatch" })
    expect(runtime.createBranch).not.toHaveBeenCalled()
    expect(runtime.migrate).not.toHaveBeenCalled()
  })

  it("creates an expiring preview branch from development when it is missing", async () => {
    const runtime = unusedRuntime()
    runtime.observeBranch = vi.fn().mockResolvedValue(null)

    await runPreviewCommand(
      parsePreviewCommand([
        "deploy",
        "--ref",
        COMMIT_SHA,
        "--preview-id",
        PREVIEW_ID,
      ]),
      { environment: previewEnvironment(), runtime, write: () => undefined }
    )

    expect(runtime.inspectWorkspace).toHaveBeenCalledOnce()
    expect(runtime.createBranch).toHaveBeenCalledWith(
      expect.objectContaining({
        previewId: PREVIEW_ID,
        branch: BRANCH,
        parentBranch: PREVIEW_PARENT_BRANCH,
      })
    )
    expect(runtime.migrate).toHaveBeenCalledWith(directUrl)
    expect(runtime.seed).toHaveBeenCalledOnce()
    expect(runtime.deploy).toHaveBeenCalledOnce()
    expect(runtime.smoke).toHaveBeenCalledOnce()
    expect(runtime.deleteBranch).not.toHaveBeenCalled()
  })

  it("reuses an existing matching expiring preview branch", async () => {
    const runtime = unusedRuntime()

    await runPreviewCommand(
      parsePreviewCommand([
        "deploy",
        "--ref",
        COMMIT_SHA,
        "--preview-id",
        PREVIEW_ID,
      ]),
      { environment: previewEnvironment(), runtime, write: () => undefined }
    )

    expect(runtime.createBranch).not.toHaveBeenCalled()
    expect(runtime.migrate).toHaveBeenCalledWith(directUrl)
  })

  it("does not migrate a pooled URL even when the rest of the profile is valid", async () => {
    const runtime = unusedRuntime()
    runtime.observeBranch = vi
      .fn()
      .mockResolvedValue(observedBranch({ directUrl: pooledUrl }))

    await expect(
      runPreviewCommand(
        parsePreviewCommand([
          "deploy",
          "--ref",
          COMMIT_SHA,
          "--preview-id",
          PREVIEW_ID,
        ]),
        { environment: previewEnvironment(), runtime }
      )
    ).rejects.toMatchObject({ code: "database_role_mismatch" })
    expect(runtime.migrate).not.toHaveBeenCalled()
    expect(runtime.deploy).not.toHaveBeenCalled()
  })

  it("cleans up only the identity-matched preview branch", async () => {
    const runtime = unusedRuntime()

    await runPreviewCommand(
      parsePreviewCommand(["cleanup", "--preview-id", PREVIEW_ID]),
      { environment: previewEnvironment(), runtime }
    )

    expect(runtime.deleteBranch).toHaveBeenCalledWith(BRANCH)
    expect(runtime.migrate).not.toHaveBeenCalled()
    expect(runtime.deploy).not.toHaveBeenCalled()
  })

  it.each(["development", "preview-another-id"])(
    "refuses cleanup when observation reports %s",
    async (branch) => {
      const runtime = unusedRuntime()
      runtime.observeBranch = vi
        .fn()
        .mockResolvedValue(observedBranch({ branch }))
      await expect(
        runPreviewCommand(
          { command: "cleanup", previewId: PREVIEW_ID },
          { environment: previewEnvironment(), runtime }
        )
      ).rejects.toMatchObject({ code: "target_mismatch" })
      expect(runtime.deleteBranch).not.toHaveBeenCalled()
    }
  )

  it("does not delete a missing preview branch", async () => {
    const runtime = unusedRuntime()
    runtime.observeBranch = vi.fn().mockResolvedValue(null)

    await runPreviewCommand(
      parsePreviewCommand(["cleanup", "--preview-id", PREVIEW_ID]),
      { environment: previewEnvironment(), runtime }
    )

    expect(runtime.deleteBranch).not.toHaveBeenCalled()
  })

  it("prints redacted inspect output without secrets or connection strings", async () => {
    const runtime = unusedRuntime()
    const lines: string[] = []

    await runPreviewCommand(
      parsePreviewCommand(["inspect", "--preview-id", PREVIEW_ID]),
      {
        environment: previewEnvironment(),
        runtime,
        write: (line) => lines.push(line),
      }
    )

    const output = lines.join("\n")
    expect(output).toContain(`previewId=${PREVIEW_ID}`)
    expect(output).toContain(`projectId=${PREVIEW_PROJECT_ID}`)
    expect(output).toContain(`branch=${BRANCH}`)
    expect(output).toContain("expiresAt=2026-09-10T00:00:00Z")
    expect(output).not.toContain("postgresql://")
    expect(output).not.toContain("migration-password")
    expect(output).not.toContain("runtime-password")
    expect(output).not.toContain("preview-auth-secret-for-tests")
  })

  it("redacts tokens, env flags, and connection strings from process logs", () => {
    const leaked = redactPreviewLog(
      "vercel --token super-secret --env DATABASE_URL=postgresql://runtime:runtime-password@host/db BETTER_AUTH_SECRET=preview-auth-secret-for-tests failed"
    )

    expect(leaked).not.toContain("super-secret")
    expect(leaked).not.toContain("postgresql://")
    expect(leaked).not.toContain("runtime-password")
    expect(leaked).not.toContain("preview-auth-secret-for-tests")
    expect(leaked).toContain("--token ***")
    expect(leaked).toContain("--env ***")
    expect(leaked).toContain("BETTER_AUTH_SECRET=***")
  })
})

describe("Preview Vercel deploy arguments", () => {
  it("omits --prod and BETTER_AUTH_URL so the deployment origin comes from VERCEL_URL", () => {
    const profile = parseEnvironmentProfile(previewEnvironment())
    const args = buildPreviewVercelEnvArgs(
      profile,
      COMMIT_SHA,
      PREVIEW_ID,
      HEALTH_SECRET
    )
    const joined = args.join(" ")

    expect(args).not.toContain("--prod")
    expect(joined).not.toContain("BETTER_AUTH_URL")
    expect(joined).not.toContain("preview.example.test")
    expect(joined).toContain("APP_ENV=preview")
    expect(joined).toContain(`DATABASE_BRANCH=${BRANCH}`)
    expect(joined).toContain("NEXT_PUBLIC_SANITY_DATASET=preview")
    // Runtime identity for the gate and health endpoints, at build and runtime.
    for (const value of [
      `APP_RELEASE_SHA=${COMMIT_SHA.toLowerCase()}`,
      `DATABASE_ENDPOINT_HOST=${new URL(directUrl).hostname}`,
      `HEALTH_PROBE_SECRET=${HEALTH_SECRET}`,
    ])
      expect(args.filter((arg) => arg === value)).toHaveLength(2)
    // The app never receives the migration (direct) connection string.
    expect(joined).not.toContain("DATABASE_URL_UNPOOLED")
    expect(joined).not.toContain(directUrl)
  })
})
