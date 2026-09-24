import { describe, expect, it, vi } from "vitest"

import { parseEnvironmentProfile } from "../../environment/core"
import { PREVIEW_PROJECT_ID, previewBranchName } from "./constants"
import { PreviewDeliveryError } from "./core"
import {
  deployPreview,
  parseVercelDeployOutput,
  preflightVercelProject,
  readVercelIdentity,
  verifyPreviewDeployment,
  type VercelDependencies,
  type VercelIdentity,
} from "./vercel"

const COMMIT_SHA = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
const PREVIEW_ID = "demo-1"
const TOKEN = "vercel-token-for-tests"
const TEAM_ID = "team_test0000000000000000"
const PROJECT_ID = "prj_test000000000000000000"
const DEPLOYMENT_ID = "dpl_testDeployment0000000000"
const DEPLOYMENT_URL = "https://todo-preview-abc123-team.vercel.app"

const identity: VercelIdentity = {
  token: TOKEN,
  teamId: TEAM_ID,
  projectId: PROJECT_ID,
}

function previewProfile() {
  const branch = previewBranchName(PREVIEW_ID)
  return parseEnvironmentProfile({
    APP_ENV: "preview",
    NODE_ENV: "production",
    BETTER_AUTH_URL: "https://preview.example.test",
    BETTER_AUTH_SECRET: "preview-auth-secret-for-tests",
    DATABASE_PROVIDER: "neon",
    DATABASE_PROJECT_ID: PREVIEW_PROJECT_ID,
    DATABASE_BRANCH: branch,
    DATABASE_URL:
      "postgresql://runtime:runtime-password@ep-demo-pooler.us-east-2.aws.neon.tech:5432/neondb?sslmode=require",
    DATABASE_URL_UNPOOLED:
      "postgresql://migration:migration-password@ep-demo.us-east-2.aws.neon.tech:5432/neondb?sslmode=require",
    NEXT_PUBLIC_SANITY_PROJECT_ID: "project-id",
    NEXT_PUBLIC_SANITY_DATASET: "preview",
    NEXT_PUBLIC_SANITY_API_VERSION: "2026-08-27",
    SANITY_WRITE_POLICY: "read-only",
    APP_MAIL_TRANSPORT: "controlled-account",
    DEPLOYMENT_OWNER: "github",
    SECRET_NAMESPACE: "preview",
  })
}

function projectRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: PROJECT_ID,
    name: "nextjs-todo-list-example",
    accountId: TEAM_ID,
    ssoProtection: null,
    targets: {
      production: {
        id: "dpl_placeholderProduction00000",
        target: "production",
        readyState: "READY",
      },
    },
    ...overrides,
  }
}

function deploymentRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: DEPLOYMENT_ID,
    url: DEPLOYMENT_URL.replace("https://", ""),
    projectId: PROJECT_ID,
    target: null,
    readyState: "READY",
    meta: { previewId: PREVIEW_ID, commitSha: COMMIT_SHA },
    ...overrides,
  }
}

/** Bare `--json` payload written by `vercel deploy` on an interactive runner. */
function bareDeployOutput(overrides: Record<string, unknown> = {}) {
  return JSON.stringify(
    {
      id: DEPLOYMENT_ID,
      url: DEPLOYMENT_URL,
      inspectorUrl: "https://vercel.com/team/project/abc",
      readyState: "READY",
      target: null,
      deploymentApiUrl: `https://api.vercel.com/v13/deployments/${DEPLOYMENT_ID}`,
      ...overrides,
    },
    null,
    2
  )
}

/** Agent-mode payload written by `vercel deploy` when stdin is not a TTY. */
function agentDeployOutput(overrides: Record<string, unknown> = {}) {
  return `${JSON.stringify(
    {
      status: "ok",
      deployment: JSON.parse(bareDeployOutput(overrides)),
      message: `Deployment ${DEPLOYMENT_URL} ready.`,
      next: [{ command: "vercel inspect x", when: "Inspect deployment" }],
    },
    null,
    2
  )}\n`
}

function fakeFetch(
  responses: Record<string, { status?: number; body: unknown }>
): VercelDependencies["fetch"] & {
  calls: Array<{ url: string; init?: RequestInit }>
} {
  const calls: Array<{ url: string; init?: RequestInit }> = []
  const handler = vi.fn(
    async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input)
      calls.push({ url, init })
      const match = Object.entries(responses).find(([key]) => url === key)
      if (!match) {
        return new Response(
          JSON.stringify({ error: { message: "not found" } }),
          {
            status: 404,
          }
        )
      }
      const { status = 200, body } = match[1]
      return new Response(JSON.stringify(body), { status })
    }
  )
  return Object.assign(handler as unknown as VercelDependencies["fetch"], {
    calls,
  })
}

function dependencies(input: {
  stdout?: string
  responses?: Record<string, { status?: number; body: unknown }>
}) {
  const run = vi.fn().mockResolvedValue(input.stdout ?? agentDeployOutput())
  const fetch = fakeFetch(
    input.responses ?? {
      [`https://api.vercel.com/v9/projects/${PROJECT_ID}?teamId=${TEAM_ID}`]: {
        body: projectRecord(),
      },
      [`https://api.vercel.com/v13/deployments/${DEPLOYMENT_ID}?teamId=${TEAM_ID}`]:
        { body: deploymentRecord() },
    }
  )
  return { run, fetch }
}

describe("readVercelIdentity", () => {
  it("reads the token, team and project identity", () => {
    expect(
      readVercelIdentity({
        VERCEL_TOKEN: ` ${TOKEN} `,
        VERCEL_ORG_ID: TEAM_ID,
        VERCEL_PROJECT_ID: PROJECT_ID,
      })
    ).toEqual(identity)
  })

  it("refuses a missing token before any provider call", () => {
    expect(() =>
      readVercelIdentity({
        VERCEL_ORG_ID: TEAM_ID,
        VERCEL_PROJECT_ID: PROJECT_ID,
      })
    ).toThrow(expect.objectContaining({ code: "cli_unavailable" }))
  })

  it.each([
    ["a personal account id", "pb9ODqn3e1rjNm569kZQdwo9"],
    ["an empty value", ""],
    ["a missing value", undefined],
  ])(
    "refuses %s as VERCEL_ORG_ID because lookups must be team-scoped",
    (_, orgId) => {
      expect(() =>
        readVercelIdentity({
          VERCEL_TOKEN: TOKEN,
          VERCEL_ORG_ID: orgId,
          VERCEL_PROJECT_ID: PROJECT_ID,
        })
      ).toThrow(expect.objectContaining({ code: "target_mismatch" }))
    }
  )

  it("refuses a missing or malformed VERCEL_PROJECT_ID", () => {
    expect(() =>
      readVercelIdentity({
        VERCEL_TOKEN: TOKEN,
        VERCEL_ORG_ID: TEAM_ID,
        VERCEL_PROJECT_ID: "nextjs-todo-list-example",
      })
    ).toThrow(expect.objectContaining({ code: "target_mismatch" }))
  })
})

describe("preflightVercelProject", () => {
  it("accepts a team-scoped project that already has a promoted Production deployment", async () => {
    const deps = dependencies({})
    await expect(preflightVercelProject(identity, deps)).resolves.toEqual({
      projectId: PROJECT_ID,
      productionDeploymentId: "dpl_placeholderProduction00000",
    })
    expect(deps.fetch.calls).toHaveLength(1)
    expect(deps.fetch.calls[0].url).toBe(
      `https://api.vercel.com/v9/projects/${PROJECT_ID}?teamId=${TEAM_ID}`
    )
    expect(
      new Headers(deps.fetch.calls[0].init?.headers).get("authorization")
    ).toBe(`Bearer ${TOKEN}`)
  })

  it("refuses a project with no Production deployment so the first deployment cannot become Production", async () => {
    const deps = dependencies({
      responses: {
        [`https://api.vercel.com/v9/projects/${PROJECT_ID}?teamId=${TEAM_ID}`]:
          {
            body: projectRecord({ targets: {} }),
          },
      },
    })
    await expect(preflightVercelProject(identity, deps)).rejects.toThrow(
      expect.objectContaining({
        code: "target_mismatch",
        message: expect.stringContaining("no Production deployment"),
      })
    )
  })

  it("refuses a project record whose id differs from the configured project", async () => {
    const deps = dependencies({
      responses: {
        [`https://api.vercel.com/v9/projects/${PROJECT_ID}?teamId=${TEAM_ID}`]:
          {
            body: projectRecord({ id: "prj_other00000000000000000000" }),
          },
      },
    })
    await expect(preflightVercelProject(identity, deps)).rejects.toThrow(
      expect.objectContaining({ code: "target_mismatch" })
    )
  })

  it("reports a failed project lookup without leaking the token", async () => {
    const deps = dependencies({
      responses: {
        [`https://api.vercel.com/v9/projects/${PROJECT_ID}?teamId=${TEAM_ID}`]:
          {
            status: 403,
            body: {
              error: { code: "forbidden", message: `token ${TOKEN} rejected` },
            },
          },
      },
    })
    const failure = await preflightVercelProject(identity, deps).catch(
      (error: unknown) => error
    )
    expect(failure).toBeInstanceOf(PreviewDeliveryError)
    expect((failure as PreviewDeliveryError).code).toBe("command_failed")
    expect((failure as PreviewDeliveryError).message).toContain("403")
    expect((failure as PreviewDeliveryError).message).toContain(
      "forbidden: token *** rejected"
    )
    expect((failure as PreviewDeliveryError).message).not.toContain(TOKEN)
  })

  it("reports a network failure as a delivery error instead of a bare TypeError", async () => {
    const deps = dependencies({})
    deps.fetch = vi
      .fn()
      .mockRejectedValue(
        new TypeError("fetch failed")
      ) as unknown as typeof deps.fetch
    await expect(preflightVercelProject(identity, deps)).rejects.toThrow(
      expect.objectContaining({
        code: "command_failed",
        message: expect.stringContaining("fetch failed"),
      })
    )
  })

  it("refuses a successful response whose body is not a JSON object", async () => {
    const deps = dependencies({
      responses: {
        [`https://api.vercel.com/v9/projects/${PROJECT_ID}?teamId=${TEAM_ID}`]:
          { body: null },
      },
    })
    await expect(preflightVercelProject(identity, deps)).rejects.toThrow(
      expect.objectContaining({ code: "command_failed" })
    )
  })
})

describe("parseVercelDeployOutput", () => {
  it("reads the agent-mode payload", () => {
    expect(parseVercelDeployOutput(agentDeployOutput())).toEqual({
      deploymentId: DEPLOYMENT_ID,
      url: DEPLOYMENT_URL,
      readyState: "READY",
      target: null,
    })
  })

  it("reads the bare --json payload even when progress text precedes it", () => {
    expect(
      parseVercelDeployOutput(`Deploying project\n${bareDeployOutput()}\n`)
    ).toEqual({
      deploymentId: DEPLOYMENT_ID,
      url: DEPLOYMENT_URL,
      readyState: "READY",
      target: null,
    })
  })

  it("accepts an explicit preview target", () => {
    expect(
      parseVercelDeployOutput(bareDeployOutput({ target: "preview" })).target
    ).toBe("preview")
  })

  it("refuses a deployment that Vercel assigned to Production", () => {
    expect(() =>
      parseVercelDeployOutput(bareDeployOutput({ target: "production" }))
    ).toThrow(expect.objectContaining({ code: "target_mismatch" }))
  })

  it("refuses a deployment that is not READY", () => {
    expect(() =>
      parseVercelDeployOutput(bareDeployOutput({ readyState: "ERROR" }))
    ).toThrow(expect.objectContaining({ code: "command_failed" }))
  })

  it("refuses output without a structured deployment", () => {
    expect(() => parseVercelDeployOutput(`${DEPLOYMENT_URL}\n`)).toThrow(
      expect.objectContaining({ code: "command_failed" })
    )
  })
})

describe("verifyPreviewDeployment", () => {
  const expected = {
    deploymentId: DEPLOYMENT_ID,
    commitSha: COMMIT_SHA,
    previewId: PREVIEW_ID,
  }

  it("accepts a team-scoped deployment whose project, target, commit and preview metadata match", async () => {
    const deps = dependencies({})
    await expect(
      verifyPreviewDeployment(identity, expected, deps)
    ).resolves.toBeUndefined()
    expect(deps.fetch.calls[0].url).toBe(
      `https://api.vercel.com/v13/deployments/${DEPLOYMENT_ID}?teamId=${TEAM_ID}`
    )
  })

  it.each([
    ["project", { projectId: "prj_other00000000000000000000" }],
    ["target", { target: "production" }],
    ["commit", { meta: { previewId: PREVIEW_ID, commitSha: "b".repeat(40) } }],
    ["preview id", { meta: { previewId: "other", commitSha: COMMIT_SHA } }],
    ["ready state", { readyState: "BUILDING" }],
  ])(
    "refuses a deployment whose %s disagrees with the request",
    async (_, overrides) => {
      const deps = dependencies({
        responses: {
          [`https://api.vercel.com/v13/deployments/${DEPLOYMENT_ID}?teamId=${TEAM_ID}`]:
            { body: deploymentRecord(overrides) },
        },
      })
      await expect(
        verifyPreviewDeployment(identity, expected, deps)
      ).rejects.toThrow(expect.objectContaining({ code: "target_mismatch" }))
    }
  )
})

describe("deployPreview", () => {
  const environment = {
    VERCEL_TOKEN: TOKEN,
    VERCEL_ORG_ID: TEAM_ID,
    VERCEL_PROJECT_ID: PROJECT_ID,
  }

  it("deploys with an explicit preview target and structured output, then verifies identity", async () => {
    const deps = dependencies({})
    const result = await deployPreview(
      {
        profile: previewProfile(),
        commitSha: COMMIT_SHA,
        previewId: PREVIEW_ID,

        healthSecret: "preview-health-secret-0123456789abcdefghij",
      },
      { ...deps, environment }
    )
    expect(result).toEqual({ url: DEPLOYMENT_URL, deploymentId: DEPLOYMENT_ID })

    expect(deps.run).toHaveBeenCalledOnce()
    const [command, args, extraEnv] = deps.run.mock.calls[0]
    expect(command).toBe("vercel")
    expect(args.slice(0, 4)).toEqual([
      "deploy",
      "--yes",
      "--json",
      "--target=preview",
    ])
    expect(args).toContain(`previewId=${PREVIEW_ID}`)
    expect(args).toContain(`commitSha=${COMMIT_SHA}`)
    expect(args).not.toContain("--prod")
    expect(
      args.some((value: string) => value.startsWith("BETTER_AUTH_URL="))
    ).toBe(false)
    expect(extraEnv).toEqual({ VERCEL_TOKEN: TOKEN })

    const verifyCall = deps.fetch.calls.find((call) =>
      call.url.includes("/v13/deployments/")
    )
    expect(verifyCall?.url).toBe(
      `https://api.vercel.com/v13/deployments/${DEPLOYMENT_ID}?teamId=${TEAM_ID}`
    )
  })

  it("does not report success when the identity lookup disagrees", async () => {
    const deps = dependencies({
      responses: {
        [`https://api.vercel.com/v13/deployments/${DEPLOYMENT_ID}?teamId=${TEAM_ID}`]:
          {
            body: deploymentRecord({
              projectId: "prj_other00000000000000000000",
            }),
          },
      },
    })
    await expect(
      deployPreview(
        {
          profile: previewProfile(),
          commitSha: COMMIT_SHA,
          previewId: PREVIEW_ID,

          healthSecret: "preview-health-secret-0123456789abcdefghij",
        },
        { ...deps, environment }
      )
    ).rejects.toThrow(expect.objectContaining({ code: "target_mismatch" }))
  })

  it("refuses to deploy without team-scoped identity before invoking the CLI", async () => {
    const deps = dependencies({})
    await expect(
      deployPreview(
        {
          profile: previewProfile(),
          commitSha: COMMIT_SHA,
          previewId: PREVIEW_ID,

          healthSecret: "preview-health-secret-0123456789abcdefghij",
        },
        {
          ...deps,
          environment: { VERCEL_TOKEN: TOKEN, VERCEL_PROJECT_ID: PROJECT_ID },
        }
      )
    ).rejects.toThrow(expect.objectContaining({ code: "target_mismatch" }))
    expect(deps.run).not.toHaveBeenCalled()
  })
})
