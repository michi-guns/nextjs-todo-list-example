import { describe, expect, it } from "vitest"

import { EnvironmentProfileError } from "./rules"
import { parseRuntimeEnvironment } from "./runtime"

type Environment = Record<string, string | undefined>

const SECRET = "runtime-secret-sentinel-0123456789"
const PASSWORD = "database-password-sentinel"
const RESEND = "re_runtime_resend_sentinel_key"
const POOLED = `postgresql://app:${PASSWORD}@ep-quiet-sun-123456-pooler.eu-central-1.aws.neon.tech/todo?sslmode=require`
const DIRECT = `postgresql://app:${PASSWORD}@ep-quiet-sun-123456.eu-central-1.aws.neon.tech/todo?sslmode=require`
const LOCAL = `postgresql://app:${PASSWORD}@127.0.0.1:5432/todo`
/** Delivery-observed direct endpoint of the pooled host above. */
const ENDPOINT = "ep-quiet-sun-123456.eu-central-1.aws.neon.tech"

function local(): Environment {
  return {
    APP_ENV: "local",
    NODE_ENV: "development",
    BETTER_AUTH_URL: "http://127.0.0.1:3000",
    BETTER_AUTH_SECRET: SECRET,
    DATABASE_PROVIDER: "local-postgres",
    DATABASE_URL: LOCAL,
    NEXT_PUBLIC_SANITY_PROJECT_ID: "project-id",
    NEXT_PUBLIC_SANITY_DATASET: "production",
    SANITY_WRITE_POLICY: "read-only",
    APP_MAIL_TRANSPORT: "local-mailbox",
    BETTER_AUTH_LOCAL_MAILBOX: "true",
  }
}

/** Exactly what the Production delivery adapter forwards: no direct URL. */
function production(): Environment {
  return {
    APP_ENV: "production",
    NODE_ENV: "production",
    VERCEL: "1",
    BETTER_AUTH_URL: "https://todo.example.com",
    BETTER_AUTH_SECRET: SECRET,
    DATABASE_PROVIDER: "neon",
    DATABASE_PROJECT_ID: "production-project",
    DATABASE_BRANCH: "main",
    DATABASE_URL: POOLED,
    DATABASE_ENDPOINT_HOST: ENDPOINT,
    NEXT_PUBLIC_SANITY_PROJECT_ID: "project-id",
    NEXT_PUBLIC_SANITY_DATASET: "production",
    SANITY_WRITE_POLICY: "production-recovery",
    SANITY_REVALIDATE_SECRET: "sanity-revalidate-sentinel",
    SANITY_MANUAL_RECOVERY_SECRET: "sanity-recovery-sentinel",
    APP_MAIL_TRANSPORT: "remote",
    APP_MAIL_PROVIDER: "resend",
    APP_MAIL_FROM: "auth@mail.example.com",
    RESEND_API_KEY: RESEND,
    BETTER_AUTH_LOCAL_MAILBOX: "false",
    DEPLOYMENT_OWNER: "github",
    SECRET_NAMESPACE: "production",
  }
}

/** Preview gets its origin from the deployment, not BETTER_AUTH_URL. */
function preview(): Environment {
  return {
    APP_ENV: "preview",
    NODE_ENV: "production",
    VERCEL: "1",
    VERCEL_URL: "todo-git-abc123-team.vercel.app",
    BETTER_AUTH_SECRET: SECRET,
    DATABASE_PROVIDER: "neon",
    DATABASE_PROJECT_ID: "development-project",
    DATABASE_BRANCH: "preview-pr-42",
    DATABASE_URL: POOLED,
    DATABASE_ENDPOINT_HOST: ENDPOINT,
    DATABASE_URL_UNPOOLED: DIRECT,
    NEXT_PUBLIC_SANITY_PROJECT_ID: "project-id",
    NEXT_PUBLIC_SANITY_DATASET: "preview",
    SANITY_WRITE_POLICY: "read-only",
    APP_MAIL_TRANSPORT: "controlled-account",
  }
}

function refusal(environment: Environment): EnvironmentProfileError {
  try {
    parseRuntimeEnvironment(environment)
  } catch (error) {
    expect(error).toBeInstanceOf(EnvironmentProfileError)
    return error as EnvironmentProfileError
  }
  throw new Error("expected a refusal")
}

describe("TST-RUNTIME-001 runtime configuration boundary", () => {
  it("accepts runtime-only Production inputs without migration or admin credentials", () => {
    const runtime = parseRuntimeEnvironment(production())
    expect(runtime).toMatchObject({
      profile: "production",
      databaseUrl: POOLED,
      auth: { baseUrl: "https://todo.example.com", secret: SECRET },
      target: {
        provider: "neon",
        projectId: "production-project",
        branch: "main",
        role: "pooled",
      },
    })
  })

  it("preserves the deployment-assigned Preview origin", () => {
    const runtime = parseRuntimeEnvironment(preview())
    expect(runtime.auth.baseUrl).toBe("https://todo-git-abc123-team.vercel.app")
    expect(
      parseRuntimeEnvironment({
        ...preview(),
        BETTER_AUTH_URL: "https://preview.example.com",
      }).auth.baseUrl
    ).toBe("https://preview.example.com")
  })

  it("accepts a coherent Local profile with a direct loopback database", () => {
    expect(parseRuntimeEnvironment(local())).toMatchObject({
      profile: "local",
      target: { provider: "local-postgres", role: "direct" },
    })
  })

  it.each<[string, Environment, string, string]>([
    [
      "Production on a direct (migration) URL",
      { ...production(), DATABASE_URL: DIRECT },
      "database_role_mismatch",
      "DATABASE_URL",
    ],
    [
      "Production on a loopback database",
      { ...production(), DATABASE_URL: LOCAL },
      "database_target_mismatch",
      "DATABASE_URL",
    ],
    [
      "Local on a remote database",
      { ...local(), DATABASE_URL: DIRECT },
      "database_target_mismatch",
      "DATABASE_URL",
    ],
    [
      "Local carrying a remote endpoint identity",
      {
        ...local(),
        DATABASE_ENDPOINT_HOST:
          "ep-quiet-sun-123456.eu-central-1.aws.neon.tech",
      },
      "database_target_mismatch",
      "DATABASE_ENDPOINT_HOST",
    ],
    [
      "Local declaring a remote provider",
      { ...local(), DATABASE_PROVIDER: "neon" },
      "database_target_mismatch",
      "DATABASE_PROVIDER",
    ],
    [
      "Preview on the default Neon branch",
      { ...preview(), DATABASE_BRANCH: "main" },
      "database_target_mismatch",
      "DATABASE_BRANCH",
    ],
    [
      "Production without the delivery-observed endpoint",
      { ...production(), DATABASE_ENDPOINT_HOST: undefined },
      "missing_variable",
      "DATABASE_ENDPOINT_HOST",
    ],
    [
      "Preview without the delivery-observed endpoint",
      { ...preview(), DATABASE_ENDPOINT_HOST: " " },
      "missing_variable",
      "DATABASE_ENDPOINT_HOST",
    ],
    [
      "Neon without a project identity",
      { ...production(), DATABASE_PROJECT_ID: undefined },
      "missing_variable",
      "DATABASE_PROJECT_ID",
    ],
    [
      "a database host that differs from the delivery-observed endpoint",
      {
        ...production(),
        DATABASE_ENDPOINT_HOST: "ep-other-777777.eu-central-1.aws.neon.tech",
      },
      "database_target_mismatch",
      "DATABASE_URL",
    ],
    [
      "Production on a loopback HTTP origin",
      { ...production(), BETTER_AUTH_URL: "http://127.0.0.1:3000" },
      "invalid_origin",
      "BETTER_AUTH_URL",
    ],
    [
      "Preview without any origin",
      { ...preview(), VERCEL_URL: undefined },
      "missing_variable",
      "BETTER_AUTH_URL",
    ],
    [
      "Production without an auth secret",
      { ...production(), BETTER_AUTH_SECRET: " " },
      "missing_variable",
      "BETTER_AUTH_SECRET",
    ],
    [
      "Preview on the published production dataset",
      { ...preview(), NEXT_PUBLIC_SANITY_DATASET: "production" },
      "sanity_policy_mismatch",
      "NEXT_PUBLIC_SANITY_DATASET",
    ],
    [
      "Preview with Production mail",
      { ...preview(), APP_MAIL_TRANSPORT: "remote" },
      "mail_policy_mismatch",
      "APP_MAIL_TRANSPORT",
    ],
    [
      "Production with the local mailbox",
      { ...production(), BETTER_AUTH_LOCAL_MAILBOX: "true" },
      "mail_policy_mismatch",
      "BETTER_AUTH_LOCAL_MAILBOX",
    ],
    [
      "Production with the Next development runtime",
      { ...production(), NODE_ENV: "development" },
      "invalid_value",
      "NODE_ENV",
    ],
    [
      "an unknown profile",
      { ...production(), APP_ENV: "staging" },
      "invalid_value",
      "APP_ENV",
    ],
    [
      "a hosted deployment without a profile",
      { ...production(), APP_ENV: undefined },
      "missing_variable",
      "APP_ENV",
    ],
  ])("refuses %s", (_, environment, code, variable) => {
    const error = refusal(environment)
    expect({ code: error.code, variable: error.variable }).toEqual({
      code,
      variable,
    })
  })

  it("refuses invalid Production mail configuration without echoing the key", () => {
    const error = refusal({ ...production(), APP_MAIL_FROM: "not-an-address" })
    expect(error.code).toBe("mail_policy_mismatch")
  })

  it("accepts the delivery-observed endpoint for its pooled runtime host", () => {
    expect(
      parseRuntimeEnvironment({
        ...production(),
        DATABASE_ENDPOINT_HOST:
          "ep-quiet-sun-123456.eu-central-1.aws.neon.tech",
      })
    ).toMatchObject({
      target: {
        endpointHost: "ep-quiet-sun-123456.eu-central-1.aws.neon.tech",
      },
    })
  })

  it("never places secrets, credentials or URLs in refusals", () => {
    const sentinels = [SECRET, PASSWORD, RESEND, "ep-quiet-sun", "vercel.app"]
    const cases: Environment[] = [
      { ...production(), DATABASE_URL: DIRECT },
      { ...production(), DATABASE_URL: "not a url " + PASSWORD },
      { ...production(), BETTER_AUTH_URL: `https://u:${SECRET}@x.example` },
      { ...preview(), NEXT_PUBLIC_SANITY_DATASET: "production" },
      { ...production(), APP_MAIL_FROM: RESEND },
      { ...production(), NODE_ENV: SECRET },
      { ...preview(), VERCEL_URL: `${SECRET}/path` },
    ]
    for (const environment of cases) {
      const error = refusal(environment)
      const surface = JSON.stringify({
        message: error.message,
        stack: error.stack,
        cause: String(error.cause),
        own: { ...error },
      })
      for (const sentinel of sentinels) expect(surface).not.toContain(sentinel)
    }
  })

  it("keeps the unprofiled local developer loop outside hosted deployments", () => {
    expect(
      parseRuntimeEnvironment({
        NODE_ENV: "development",
        DATABASE_URL: DIRECT,
        BETTER_AUTH_URL: "http://localhost:3000",
      })
    ).toEqual({
      profile: "unprofiled",
      databaseUrl: DIRECT,
      auth: { baseUrl: "http://localhost:3000" },
      editorialPreview: { enabled: false },
    })
    expect(refusal({ NODE_ENV: "development" }).variable).toBe("DATABASE_URL")
    expect(
      refusal({ NODE_ENV: "production", DATABASE_URL: LOCAL }).variable
    ).toBe("BETTER_AUTH_SECRET")
  })

  it("leaves NODE_ENV to Next during the build, validating everything else", () => {
    const building = { NEXT_PHASE: "phase-production-build" }
    expect(
      parseRuntimeEnvironment({
        ...local(),
        ...building,
        NODE_ENV: "production",
      }).profile
    ).toBe("local")
    expect(
      refusal({ ...preview(), ...building, NEXT_PUBLIC_SANITY_DATASET: "x" })
        .code
    ).toBe("sanity_policy_mismatch")
  })

  it("TST-LANDING-004 carries the editorial preview capability: Production on, Preview refused", () => {
    const VIEWER = "sk-viewer-sentinel-0123456789"
    const enabled = parseRuntimeEnvironment({
      ...production(),
      NEXT_PUBLIC_SANITY_EDITORIAL_PREVIEW_ENABLED: "true",
      SANITY_API_READ_TOKEN: VIEWER,
    })
    expect(enabled).toMatchObject({
      editorialPreview: { enabled: true, token: VIEWER },
    })
    expect(parseRuntimeEnvironment(production())).toMatchObject({
      editorialPreview: { enabled: false },
    })
    for (const forged of [
      { NEXT_PUBLIC_SANITY_EDITORIAL_PREVIEW_ENABLED: "true" },
      { SANITY_API_READ_TOKEN: VIEWER },
    ]) {
      const error = refusal({ ...preview(), ...forged })
      expect(error.message).not.toContain(VIEWER)
    }
  })
})
