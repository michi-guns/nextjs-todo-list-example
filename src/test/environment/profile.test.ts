import { describe, expect, it } from "vitest"

import {
  EnvironmentProfileError,
  inspectEnvironment,
  parseDeliveryArguments,
  parseEnvironmentProfile,
} from "@/scripts/environment/core"

const localDatabaseUrl =
  "postgresql://local-user:local-password@127.0.0.1:5432/todo"

function localEnvironment(): Record<string, string | undefined> {
  return {
    APP_ENV: "local",
    NODE_ENV: "test",
    BETTER_AUTH_URL: "http://127.0.0.1:3100",
    BETTER_AUTH_SECRET: "local-auth-secret-for-tests",
    DATABASE_PROVIDER: "local-postgres",
    DATABASE_URL: localDatabaseUrl,
    DATABASE_URL_UNPOOLED: localDatabaseUrl,
    NEXT_PUBLIC_SANITY_PROJECT_ID: "project-id",
    NEXT_PUBLIC_SANITY_DATASET: "production",
    NEXT_PUBLIC_SANITY_API_VERSION: "2026-08-27",
    SANITY_WRITE_POLICY: "local-recovery",
    SANITY_REVALIDATE_SECRET: "sanity-webhook-secret",
    SANITY_MANUAL_RECOVERY_SECRET: "sanity-recovery-secret",
    APP_MAIL_TRANSPORT: "local-mailbox",
    BETTER_AUTH_LOCAL_MAILBOX: "true",
    DEPLOYMENT_OWNER: "local",
    SECRET_NAMESPACE: "local",
  }
}

function neonEnvironment(
  appEnv: "development" | "preview" | "production"
): Record<string, string | undefined> {
  const isPreview = appEnv === "preview"
  const isProduction = appEnv === "production"
  const branch = isProduction
    ? "production"
    : isPreview
      ? "preview-42"
      : "development"
  const dataset = isPreview ? "preview" : "production"
  const urlHost = isPreview
    ? "ep-preview-pooler.neon.tech"
    : "ep-app-pooler.neon.tech"

  return {
    APP_ENV: appEnv,
    NODE_ENV: isProduction || isPreview ? "production" : "development",
    BETTER_AUTH_URL: isProduction
      ? "https://app.example.test"
      : isPreview
        ? "https://preview.example.test"
        : "http://localhost:3000",
    BETTER_AUTH_SECRET: `${appEnv}-auth-secret-for-tests`,
    DATABASE_PROVIDER: "neon",
    DATABASE_PROJECT_ID: "project-id",
    DATABASE_BRANCH: branch,
    DATABASE_URL: `postgresql://runtime:runtime-password@${urlHost}/todo?sslmode=require`,
    DATABASE_URL_UNPOOLED: `postgresql://migration:migration-password@ep-${branch}.neon.tech/todo?sslmode=require`,
    NEXT_PUBLIC_SANITY_PROJECT_ID: "project-id",
    NEXT_PUBLIC_SANITY_DATASET: dataset,
    NEXT_PUBLIC_SANITY_API_VERSION: "2026-08-27",
    SANITY_WRITE_POLICY: isProduction ? "production-recovery" : "read-only",
    SANITY_REVALIDATE_SECRET: isProduction
      ? "sanity-webhook-secret"
      : undefined,
    SANITY_MANUAL_RECOVERY_SECRET: isProduction
      ? "sanity-recovery-secret"
      : undefined,
    APP_MAIL_TRANSPORT: isProduction
      ? "remote"
      : isPreview
        ? "controlled-account"
        : "local-mailbox",
    APP_MAIL_PROVIDER: isProduction ? "provider-name" : undefined,
    BETTER_AUTH_LOCAL_MAILBOX: isProduction || isPreview ? undefined : "true",
    DEPLOYMENT_OWNER: isProduction || isPreview ? "vercel" : "local",
    SECRET_NAMESPACE: appEnv,
  }
}

describe("parseEnvironmentProfile", () => {
  it.each([
    ["local", localEnvironment()],
    ["development", neonEnvironment("development")],
    ["preview", neonEnvironment("preview")],
    ["production", neonEnvironment("production")],
  ])("accepts the explicit %s profile", (appEnv, environment) => {
    const profile = parseEnvironmentProfile(environment)

    expect(profile.appEnv).toBe(appEnv)
    expect(profile.betterAuth.url).toMatch(/^(http|https):\/\//)
    expect(profile.database.provider).toBe(
      appEnv === "local" ? "local-postgres" : "neon"
    )
    expect(profile.sanity.dataset).toBe(
      appEnv === "preview" ? "preview" : "production"
    )
    expect(profile.operations.canUseSanityRecovery).toBe(
      appEnv === "local" || appEnv === "production"
    )
  })

  it("requires an explicit APP_ENV rather than inferring from NODE_ENV", () => {
    const environment = localEnvironment()
    delete environment.APP_ENV

    expect(() => parseEnvironmentProfile(environment)).toThrowError(
      expect.objectContaining({
        code: "missing_variable",
        variable: "APP_ENV",
      })
    )
  })

  it("rejects a non-loopback origin for Local", () => {
    const environment = localEnvironment()
    environment.BETTER_AUTH_URL = "https://app.example.test"

    expect(() => parseEnvironmentProfile(environment)).toThrowError(
      expect.objectContaining({ code: "invalid_origin" })
    )
  })

  it("requires the database provider that belongs to the application profile", () => {
    const local = localEnvironment()
    local.DATABASE_PROVIDER = "neon"
    expect(() => parseEnvironmentProfile(local)).toThrowError(
      expect.objectContaining({
        code: "database_target_mismatch",
        variable: "DATABASE_PROVIDER",
      })
    )

    const development = neonEnvironment("development")
    development.DATABASE_PROVIDER = "local-postgres"
    expect(() => parseEnvironmentProfile(development)).toThrowError(
      expect.objectContaining({
        code: "database_target_mismatch",
        variable: "DATABASE_PROVIDER",
      })
    )
  })

  it("rejects a remote database target declared as Local", () => {
    const environment = localEnvironment()
    environment.DATABASE_URL =
      "postgresql://runtime:runtime-password@ep-stale-pooler.neon.tech/todo"
    environment.DATABASE_URL_UNPOOLED =
      "postgresql://migration:migration-password@ep-stale.neon.tech/todo"

    expect(() => parseEnvironmentProfile(environment)).toThrowError(
      expect.objectContaining({
        code: "database_target_mismatch",
        variable: "DATABASE_URL",
      })
    )
  })

  it("requires project and branch identity for Neon profiles", () => {
    const environment = neonEnvironment("development")
    delete environment.DATABASE_PROJECT_ID

    expect(() => parseEnvironmentProfile(environment)).toThrowError(
      expect.objectContaining({
        code: "missing_variable",
        variable: "DATABASE_PROJECT_ID",
      })
    )
  })

  it("reports Local read-only Sanity as non-recovery-capable", () => {
    const environment = localEnvironment()
    environment.SANITY_WRITE_POLICY = "read-only"
    delete environment.SANITY_REVALIDATE_SECRET
    delete environment.SANITY_MANUAL_RECOVERY_SECRET

    expect(
      parseEnvironmentProfile(environment).operations.canUseSanityRecovery
    ).toBe(false)
  })

  it("rejects Production secrets in a Preview namespace", () => {
    const environment = neonEnvironment("preview")
    environment.SECRET_NAMESPACE = "production"

    expect(() => parseEnvironmentProfile(environment)).toThrowError(
      expect.objectContaining({ code: "secret_namespace_mismatch" })
    )
  })

  it("rejects Sanity recovery secrets in a read-only deployed profile", () => {
    const environment = neonEnvironment("preview")
    environment.SANITY_REVALIDATE_SECRET = "must-not-be-present"

    expect(() => parseEnvironmentProfile(environment)).toThrowError(
      expect.objectContaining({
        code: "sanity_policy_mismatch",
        variable: "SANITY_REVALIDATE_SECRET",
      })
    )
  })

  it("rejects the local mailbox in a deployed profile", () => {
    const environment = neonEnvironment("preview")
    environment.APP_MAIL_TRANSPORT = "local-mailbox"
    environment.BETTER_AUTH_LOCAL_MAILBOX = "true"

    expect(() => parseEnvironmentProfile(environment)).toThrowError(
      expect.objectContaining({ code: "mail_policy_mismatch" })
    )
  })

  it("rejects a pooled migration URL and a direct runtime URL for Neon", () => {
    const environment = neonEnvironment("development")
    environment.DATABASE_URL =
      "postgresql://runtime:runtime-password@ep-app.neon.tech/todo"
    environment.DATABASE_URL_UNPOOLED =
      "postgresql://migration:migration-password@ep-app-pooler.neon.tech/todo"

    expect(() => parseEnvironmentProfile(environment)).toThrowError(
      expect.objectContaining({ code: "database_role_mismatch" })
    )
  })

  it("rejects a missing direct URL for a remote profile", () => {
    const environment = neonEnvironment("production")
    delete environment.DATABASE_URL_UNPOOLED

    expect(() => parseEnvironmentProfile(environment)).toThrowError(
      expect.objectContaining({
        code: "missing_variable",
        variable: "DATABASE_URL_UNPOOLED",
      })
    )
  })

  it("does not expose secret or connection values in inspection output", () => {
    const environment = localEnvironment()
    const profile = parseEnvironmentProfile(environment)
    const inspection = inspectEnvironment(profile)
    const output = JSON.stringify(inspection)

    expect(profile.betterAuth.secret).toBe("local-auth-secret-for-tests")
    expect(profile.database.runtimeUrl).toBe(localDatabaseUrl)
    expect(profile.database.migrationUrl).toBe(localDatabaseUrl)
    expect(profile.sanity.revalidateSecret).toBe("sanity-webhook-secret")
    expect(output).not.toContain("local-auth-secret-for-tests")
    expect(output).not.toContain("local-password")
    expect(output).not.toContain("sanity-webhook-secret")
    expect(output).not.toContain("postgresql://")
    expect(inspection).toMatchObject({
      appEnv: "local",
      database: {
        provider: "local-postgres",
        runtimeRole: "direct",
        migrationRole: "direct",
      },
      secrets: {
        betterAuth: true,
      },
    })
  })
})

describe("parseDeliveryArguments", () => {
  it("accepts exact-ref-shaped Preview input", () => {
    expect(
      parseDeliveryArguments([
        "preview",
        "--ref",
        "release/2026-09-01",
        "--preview-id",
        "preview-42",
      ])
    ).toEqual({
      command: "preview",
      ref: "release/2026-09-01",
      previewId: "preview-42",
    })
  })

  it("accepts tag-or-SHA-shaped Production input", () => {
    expect(
      parseDeliveryArguments([
        "production",
        "--ref",
        "0123456789abcdef0123456789abcdef01234567",
      ])
    ).toEqual({
      command: "production",
      ref: "0123456789abcdef0123456789abcdef01234567",
    })
  })

  it("rejects missing Preview identity and mutable aliases", () => {
    expect(() =>
      parseDeliveryArguments(["preview", "--ref", "latest"])
    ).toThrowError(EnvironmentProfileError)
    expect(() =>
      parseDeliveryArguments(["preview", "--ref", "v1.0.0"])
    ).toThrowError(expect.objectContaining({ code: "missing_argument" }))
  })

  it("rejects unsafe delivery refs and Preview identifiers before resolution", () => {
    expect(() =>
      parseDeliveryArguments([
        "preview",
        "--ref",
        "../../production",
        "--preview-id",
        "preview-42",
      ])
    ).toThrowError(expect.objectContaining({ code: "invalid_argument" }))

    expect(() =>
      parseDeliveryArguments([
        "preview",
        "--ref",
        "release/2026-09-01",
        "--preview-id",
        "preview id",
      ])
    ).toThrowError(expect.objectContaining({ code: "invalid_argument" }))

    expect(() =>
      parseDeliveryArguments([
        "preview",
        "--ref",
        "./production",
        "--preview-id",
        "preview-42",
      ])
    ).toThrowError(expect.objectContaining({ code: "invalid_argument" }))
  })
})
