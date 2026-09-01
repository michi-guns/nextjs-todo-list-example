import { describe, expect, it } from "vitest"

import {
  EnvironmentGuardError,
  assertMigrationAllowed,
  assertLocalResetAllowed,
  assertPreviewCleanupAllowed,
  assertPreviewDeploymentAllowed,
  assertProductionDeploymentAllowed,
  assertSeedReplacementAllowed,
  executeAfterGuard,
  type DatabaseConnectionObservation,
  type DatabaseTargetIdentity,
  type RedactedEnvironmentEvidence,
  type ResolvedDeliveryRef,
} from "@/scripts/environment/guards"
import {
  inspectEnvironment,
  parseDeliveryArguments,
  parseEnvironmentProfile,
  type AppEnv,
  type EnvironmentVariables,
  type EnvironmentProfile,
} from "@/scripts/environment/core"

function localEnvironment(): Record<string, string | undefined> {
  return {
    APP_ENV: "local",
    NODE_ENV: "test",
    BETTER_AUTH_URL: "http://127.0.0.1:3100",
    BETTER_AUTH_SECRET: "local-auth-secret",
    DATABASE_PROVIDER: "local-postgres",
    DATABASE_URL: "postgresql://local-user:local-password@127.0.0.1:5432/todo",
    DATABASE_URL_UNPOOLED:
      "postgresql://local-user:local-password@127.0.0.1:5432/todo",
    NEXT_PUBLIC_SANITY_PROJECT_ID: "project-id",
    NEXT_PUBLIC_SANITY_DATASET: "production",
    NEXT_PUBLIC_SANITY_API_VERSION: "2026-08-27",
    SANITY_WRITE_POLICY: "local-recovery",
    SANITY_REVALIDATE_SECRET: "local-revalidate-secret",
    SANITY_MANUAL_RECOVERY_SECRET: "local-manual-recovery-secret",
    APP_MAIL_TRANSPORT: "local-mailbox",
    BETTER_AUTH_LOCAL_MAILBOX: "true",
    DEPLOYMENT_OWNER: "local",
    SECRET_NAMESPACE: "local",
  }
}

function neonEnvironment(
  appEnv: Exclude<AppEnv, "local">
): Record<string, string | undefined> {
  const isPreview = appEnv === "preview"
  const isProduction = appEnv === "production"
  const branch = isProduction
    ? "production"
    : isPreview
      ? "preview-42"
      : "development"
  const runtimeHost = isPreview
    ? "ep-preview-pooler.neon.tech"
    : "ep-app-pooler.neon.tech"

  return {
    APP_ENV: appEnv,
    NODE_ENV: isPreview || isProduction ? "production" : "development",
    BETTER_AUTH_URL: isProduction
      ? "https://app.example.test"
      : isPreview
        ? "https://preview.example.test"
        : "http://localhost:3000",
    BETTER_AUTH_SECRET: `${appEnv}-auth-secret`,
    DATABASE_PROVIDER: "neon",
    DATABASE_PROJECT_ID: "project-id",
    DATABASE_BRANCH: branch,
    DATABASE_URL: `postgresql://runtime:runtime-password@${runtimeHost}:5432/todo`,
    DATABASE_URL_UNPOOLED: `postgresql://migration:migration-password@ep-${branch}.neon.tech:5432/todo`,
    NEXT_PUBLIC_SANITY_PROJECT_ID: "project-id",
    NEXT_PUBLIC_SANITY_DATASET: isPreview ? "preview" : "production",
    NEXT_PUBLIC_SANITY_API_VERSION: "2026-08-27",
    SANITY_WRITE_POLICY: isProduction ? "production-recovery" : "read-only",
    SANITY_REVALIDATE_SECRET: isProduction
      ? "production-revalidate-secret"
      : undefined,
    SANITY_MANUAL_RECOVERY_SECRET: isProduction
      ? "production-manual-recovery-secret"
      : undefined,
    APP_MAIL_TRANSPORT: isProduction
      ? "remote"
      : isPreview
        ? "controlled-account"
        : "local-mailbox",
    APP_MAIL_PROVIDER: isProduction ? "mail-provider" : undefined,
    BETTER_AUTH_LOCAL_MAILBOX: isPreview || isProduction ? undefined : "true",
    DEPLOYMENT_OWNER: isPreview || isProduction ? "vercel" : "local",
    SECRET_NAMESPACE: appEnv,
  }
}

function developmentEnvironment(): Record<string, string | undefined> {
  return neonEnvironment("development")
}

function targetFor(
  profile: EnvironmentProfile,
  overrides: Partial<DatabaseTargetIdentity> = {}
): DatabaseTargetIdentity {
  if (profile.database.provider === "local-postgres") {
    return {
      provider: "local-postgres",
      host: "127.0.0.1",
      ...overrides,
    }
  }

  return {
    provider: "neon",
    projectId: profile.database.projectId,
    branch: profile.database.branch,
    host: new URL(profile.database.migrationUrl).hostname,
    ...overrides,
  }
}

function directConnection(
  profile: EnvironmentProfile,
  target: DatabaseTargetIdentity,
  role: "direct" | "pooled" = "direct",
  url = profile.database.migrationUrl
): DatabaseConnectionObservation {
  return {
    target: {
      ...target,
      host: target.host ?? new URL(url).hostname,
    },
    role,
    url,
  }
}

const commitSha = "0123456789abcdef0123456789abcdef01234567"

function resolvedRef(kind: ResolvedDeliveryRef["kind"]): ResolvedDeliveryRef {
  return {
    requestedRef:
      kind === "commit"
        ? commitSha
        : kind === "tag"
          ? "v1.0.0"
          : "release/2026-09-01",
    commitSha,
    kind,
  }
}

const productionApproval = {
  environment: "production" as const,
  commitSha,
  approved: true,
}

it.each([
  ["development", developmentEnvironment],
  ["preview", () => neonEnvironment("preview")],
] as const)(
  "refuses a mutable %s profile pointed at the default Neon main branch",
  (appEnv, createEnvironment) => {
    const parsed = parseEnvironmentProfile(createEnvironment())
    const migrationUrl =
      "postgresql://migration:migration-password@ep-main.neon.tech:5432/todo"
    const profile: EnvironmentProfile = {
      ...parsed,
      database: {
        ...parsed.database,
        branch: "main",
        migrationUrl,
      },
    }
    const target: DatabaseTargetIdentity = {
      provider: "neon",
      projectId: "project-id",
      branch: "main",
      host: "ep-main.neon.tech",
    }
    const connection: DatabaseConnectionObservation = {
      target: { ...target, host: "ep-main.neon.tech" },
      role: "direct",
      url: migrationUrl,
    }

    expect(profile.appEnv).toBe(appEnv)
    expect(() =>
      assertMigrationAllowed({ profile, target, connection })
    ).toThrowError(
      expect.objectContaining<Partial<EnvironmentGuardError>>({
        code: "target_mismatch",
        message: expect.stringContaining("default main branch"),
      })
    )
  }
)

it("allows a separately identified Production target whose branch is named main", () => {
  const parsed = parseEnvironmentProfile(neonEnvironment("production"))
  const migrationUrl =
    "postgresql://migration:migration-password@ep-protected-production.neon.tech:5432/todo"
  const profile: EnvironmentProfile = {
    ...parsed,
    database: {
      ...parsed.database,
      projectId: "protected-production-project",
      branch: "main",
      migrationUrl,
    },
  }
  const target: DatabaseTargetIdentity = {
    provider: "neon",
    projectId: "protected-production-project",
    branch: "main",
    host: "ep-protected-production.neon.tech",
  }

  const evidence = assertMigrationAllowed({
    profile,
    target,
    connection: directConnection(profile, target),
    resolvedRef: resolvedRef("tag"),
    approval: productionApproval,
  })

  expect(evidence).toMatchObject({
    appEnv: "production",
    database: {
      provider: "neon",
      projectId: "protected-production-project",
      branch: "main",
      role: "direct",
    },
  })
})

describe("TST-ENV-001 profile matrix", () => {
  const profileCases: Array<[AppEnv, () => EnvironmentVariables]> = [
    ["local", localEnvironment],
    ["development", developmentEnvironment],
    ["preview", () => neonEnvironment("preview")],
    ["production", () => neonEnvironment("production")],
  ]

  it.each(profileCases)(
    "accepts the explicit %s profile with the intended roles and operations",
    (appEnv, createEnvironment) => {
      const profile = parseEnvironmentProfile(createEnvironment())
      const inspection = inspectEnvironment(profile)
      const output = JSON.stringify(inspection)

      expect(profile.appEnv).toBe(appEnv)
      expect(profile.database.runtimeRole).toBe(
        appEnv === "local" ? "direct" : "pooled"
      )
      expect(profile.database.migrationRole).toBe("direct")
      expect(profile.operations).toEqual({
        canMigrate: true,
        canSeed: appEnv !== "production",
        canReset: appEnv === "local",
        canPreviewDeploy: appEnv === "preview",
        canProductionDeploy: appEnv === "production",
        canUseSanityRecovery: appEnv === "local" || appEnv === "production",
      })
      expect(inspection).toMatchObject({
        appEnv,
        database: {
          provider: appEnv === "local" ? "local-postgres" : "neon",
          runtimeRole: appEnv === "local" ? "direct" : "pooled",
          migrationRole: "direct",
        },
        sanity: {
          dataset: appEnv === "preview" ? "preview" : "production",
        },
      })

      const sensitiveValues = [
        profile.betterAuth.secret,
        profile.database.runtimeUrl,
        profile.database.migrationUrl,
        profile.sanity.revalidateSecret,
        profile.sanity.manualRecoverySecret,
      ].filter((value): value is string => Boolean(value))
      for (const value of sensitiveValues) {
        expect(output).not.toContain(value)
      }
      expect(output).not.toContain("postgresql://")
    }
  )

  const missingCases: Array<
    [string, () => Record<string, string | undefined>, string]
  > = [
    [
      "APP_ENV",
      () => {
        const environment = localEnvironment()
        delete environment.APP_ENV
        return environment
      },
      "APP_ENV",
    ],
    [
      "Better Auth URL",
      () => {
        const environment = localEnvironment()
        delete environment.BETTER_AUTH_URL
        return environment
      },
      "BETTER_AUTH_URL",
    ],
    [
      "Neon project identity",
      () => {
        const environment = developmentEnvironment()
        delete environment.DATABASE_PROJECT_ID
        return environment
      },
      "DATABASE_PROJECT_ID",
    ],
    [
      "Preview branch identity",
      () => {
        const environment = neonEnvironment("preview")
        delete environment.DATABASE_BRANCH
        return environment
      },
      "DATABASE_BRANCH",
    ],
    [
      "Production direct migration URL",
      () => {
        const environment = neonEnvironment("production")
        delete environment.DATABASE_URL_UNPOOLED
        return environment
      },
      "DATABASE_URL_UNPOOLED",
    ],
    [
      "Production mail provider",
      () => {
        const environment = neonEnvironment("production")
        delete environment.APP_MAIL_PROVIDER
        return environment
      },
      "APP_MAIL_PROVIDER",
    ],
  ]

  it.each(missingCases)(
    "rejects a profile with missing %s",
    (_name, createEnvironment, variable) => {
      expect(() => parseEnvironmentProfile(createEnvironment())).toThrowError(
        expect.objectContaining({ code: "missing_variable", variable })
      )
    }
  )

  const conflictingCases: Array<
    [string, () => Record<string, string | undefined>, string]
  > = [
    [
      "Local NODE_ENV",
      () => {
        const environment = localEnvironment()
        environment.NODE_ENV = "production"
        return environment
      },
      "invalid_value",
    ],
    [
      "Development default branch",
      () => {
        const environment = developmentEnvironment()
        environment.DATABASE_BRANCH = "main"
        return environment
      },
      "database_target_mismatch",
    ],
    [
      "Preview Sanity dataset",
      () => {
        const environment = neonEnvironment("preview")
        environment.NEXT_PUBLIC_SANITY_DATASET = "production"
        return environment
      },
      "sanity_policy_mismatch",
    ],
    [
      "Preview local mailbox",
      () => {
        const environment = neonEnvironment("preview")
        environment.APP_MAIL_TRANSPORT = "local-mailbox"
        environment.BETTER_AUTH_LOCAL_MAILBOX = "true"
        return environment
      },
      "mail_policy_mismatch",
    ],
    [
      "Production local mailbox",
      () => {
        const environment = neonEnvironment("production")
        environment.BETTER_AUTH_LOCAL_MAILBOX = "true"
        return environment
      },
      "mail_policy_mismatch",
    ],
    [
      "Neon runtime and migration roles",
      () => {
        const environment = developmentEnvironment()
        environment.DATABASE_URL =
          "postgresql://runtime:runtime-password@ep-development.neon.tech:5432/todo"
        environment.DATABASE_URL_UNPOOLED =
          "postgresql://migration:migration-password@ep-development-pooler.neon.tech:5432/todo"
        return environment
      },
      "database_role_mismatch",
    ],
  ]

  it.each(conflictingCases)(
    "rejects conflicting %s configuration",
    (_name, createEnvironment, code) => {
      expect(() => parseEnvironmentProfile(createEnvironment())).toThrowError(
        expect.objectContaining({ code })
      )
    }
  )

  it.each([
    ["Local", localEnvironment, "https://app.example.test"],
    ["Development", developmentEnvironment, "https://dev.example.test"],
    [
      "Preview",
      () => neonEnvironment("preview"),
      "http://preview.example.test",
    ],
    [
      "Production",
      () => neonEnvironment("production"),
      "https://localhost:3000",
    ],
  ] as const)(
    "rejects an invalid %s application origin",
    (_name, createEnvironment, origin) => {
      const environment = createEnvironment()
      environment.BETTER_AUTH_URL = origin

      expect(() => parseEnvironmentProfile(environment)).toThrowError(
        expect.objectContaining({ code: "invalid_origin" })
      )
    }
  )
})

describe("TST-ENV-001 delivery ref and mutation boundaries", () => {
  it("rejects mutable and duplicate delivery refs before resolution", () => {
    for (const ref of ["HEAD", "latest", "main", "master"]) {
      expect(() =>
        parseDeliveryArguments(["production", "--ref", ref])
      ).toThrowError(expect.objectContaining({ code: "invalid_argument" }))
    }

    expect(() =>
      parseDeliveryArguments([
        "preview",
        "--ref",
        "release/2026-09-01",
        "--ref",
        "release/2026-09-02",
        "--preview-id",
        "preview-42",
      ])
    ).toThrowError(expect.objectContaining({ code: "invalid_argument" }))
  })

  it("accepts Preview refs only after the provider supplies one resolved SHA", () => {
    const profile = parseEnvironmentProfile(neonEnvironment("preview"))
    const target = targetFor(profile)

    for (const kind of ["branch", "tag", "commit"] as const) {
      const ref = resolvedRef(kind)
      const evidence = assertPreviewDeploymentAllowed({
        profile,
        target,
        requestedPreviewId: "preview-42",
        preview: {
          previewId: "preview-42",
          projectId: "project-id",
          branch: "preview-42",
        },
        resolvedRef: ref,
      })

      expect(evidence.ref).toEqual(ref)
    }
  })

  it("accepts a Production tag or full SHA and rejects an ambiguous branch ref", () => {
    const profile = parseEnvironmentProfile(neonEnvironment("production"))
    const target = targetFor(profile)

    expect(
      assertProductionDeploymentAllowed({
        profile,
        target,
        resolvedRef: resolvedRef("tag"),
        approval: productionApproval,
      }).ref
    ).toEqual(resolvedRef("tag"))

    expect(
      assertProductionDeploymentAllowed({
        profile,
        target,
        resolvedRef: resolvedRef("commit"),
        approval: productionApproval,
      }).ref
    ).toEqual(resolvedRef("commit"))

    expect(() =>
      assertProductionDeploymentAllowed({
        profile,
        target,
        resolvedRef: resolvedRef("branch"),
        approval: productionApproval,
      })
    ).toThrowError(expect.objectContaining({ code: "ref_invalid" }))
  })

  const refusedCases: Array<[string, () => RedactedEnvironmentEvidence]> = [
    [
      "Local reset against a remote target",
      () => {
        const profile = parseEnvironmentProfile(localEnvironment())
        const target: DatabaseTargetIdentity = {
          provider: "neon",
          projectId: "project-id",
          branch: "main",
          host: "ep-main.neon.tech",
        }
        return assertLocalResetAllowed({
          profile,
          target,
          connection: directConnection(profile, target),
        })
      },
    ],
    [
      "migration through the pooled URL",
      () => {
        const profile = parseEnvironmentProfile(developmentEnvironment())
        const target = targetFor(profile)
        return assertMigrationAllowed({
          profile,
          target,
          connection: directConnection(
            profile,
            target,
            "pooled",
            profile.database.runtimeUrl
          ),
        })
      },
    ],
    [
      "Production seed replacement",
      () => {
        const profile = parseEnvironmentProfile(neonEnvironment("production"))
        const target = targetFor(profile)
        return assertSeedReplacementAllowed({
          profile,
          target,
          connection: directConnection(profile, target),
        })
      },
    ],
    [
      "Preview cleanup without provider identity",
      () => {
        const profile = parseEnvironmentProfile(neonEnvironment("preview"))
        return assertPreviewCleanupAllowed({
          profile,
          target: targetFor(profile),
          requestedPreviewId: "preview-42",
        })
      },
    ],
    [
      "Preview deployment without a resolved ref",
      () => {
        const profile = parseEnvironmentProfile(neonEnvironment("preview"))
        return assertPreviewDeploymentAllowed({
          profile,
          target: targetFor(profile),
          requestedPreviewId: "preview-42",
          preview: {
            previewId: "preview-42",
            projectId: "project-id",
            branch: "preview-42",
          },
        })
      },
    ],
    [
      "Production migration without protected approval",
      () => {
        const profile = parseEnvironmentProfile(neonEnvironment("production"))
        const target = targetFor(profile)
        return assertMigrationAllowed({
          profile,
          target,
          connection: directConnection(profile, target),
          resolvedRef: resolvedRef("tag"),
        })
      },
    ],
    [
      "Production deployment from a branch ref",
      () => {
        const profile = parseEnvironmentProfile(neonEnvironment("production"))
        return assertProductionDeploymentAllowed({
          profile,
          target: targetFor(profile),
          resolvedRef: resolvedRef("branch"),
          approval: productionApproval,
        })
      },
    ],
  ]

  it.each(refusedCases)(
    "refuses %s before invoking its mutation callback",
    async (_name, guard) => {
      let mutationCount = 0

      await expect(
        executeAfterGuard(guard, () => {
          mutationCount += 1
        })
      ).rejects.toBeInstanceOf(EnvironmentGuardError)

      expect(mutationCount).toBe(0)
    }
  )

  it("keeps every accepted guard evidence object free of secrets and URLs", () => {
    const cases: Array<{
      profile: EnvironmentProfile
      evidence: RedactedEnvironmentEvidence
    }> = []
    const localProfile = parseEnvironmentProfile(localEnvironment())
    const localTarget = targetFor(localProfile, { ownership: "harness" })
    cases.push({
      profile: localProfile,
      evidence: assertLocalResetAllowed({
        profile: localProfile,
        target: localTarget,
        connection: directConnection(localProfile, localTarget),
      }),
    })

    const developmentProfile = parseEnvironmentProfile(developmentEnvironment())
    const developmentTarget = targetFor(developmentProfile)
    cases.push({
      profile: developmentProfile,
      evidence: assertMigrationAllowed({
        profile: developmentProfile,
        target: developmentTarget,
        connection: directConnection(developmentProfile, developmentTarget),
      }),
    })
    cases.push({
      profile: developmentProfile,
      evidence: assertSeedReplacementAllowed({
        profile: developmentProfile,
        target: developmentTarget,
        connection: directConnection(developmentProfile, developmentTarget),
      }),
    })

    const previewProfile = parseEnvironmentProfile(neonEnvironment("preview"))
    const previewTarget = targetFor(previewProfile)
    const preview = {
      previewId: "preview-42",
      projectId: "project-id",
      branch: "preview-42",
    }
    cases.push({
      profile: previewProfile,
      evidence: assertPreviewCleanupAllowed({
        profile: previewProfile,
        target: previewTarget,
        requestedPreviewId: "preview-42",
        preview,
      }),
    })
    cases.push({
      profile: previewProfile,
      evidence: assertPreviewDeploymentAllowed({
        profile: previewProfile,
        target: previewTarget,
        requestedPreviewId: "preview-42",
        preview,
        resolvedRef: resolvedRef("branch"),
      }),
    })

    const productionProfile = parseEnvironmentProfile(
      neonEnvironment("production")
    )
    const productionTarget = targetFor(productionProfile)
    const productionConnection = directConnection(
      productionProfile,
      productionTarget
    )
    cases.push({
      profile: productionProfile,
      evidence: assertMigrationAllowed({
        profile: productionProfile,
        target: productionTarget,
        connection: productionConnection,
        resolvedRef: resolvedRef("tag"),
        approval: productionApproval,
      }),
    })
    cases.push({
      profile: productionProfile,
      evidence: assertProductionDeploymentAllowed({
        profile: productionProfile,
        target: productionTarget,
        resolvedRef: resolvedRef("tag"),
        approval: productionApproval,
      }),
    })

    for (const { profile, evidence } of cases) {
      const output = JSON.stringify(evidence)
      const sensitiveValues = [
        profile.betterAuth.secret,
        profile.database.runtimeUrl,
        profile.database.migrationUrl,
        profile.sanity.revalidateSecret,
        profile.sanity.manualRecoverySecret,
      ].filter((value): value is string => Boolean(value))

      for (const value of sensitiveValues) {
        expect(output).not.toContain(value)
      }
      expect(output).not.toContain("postgresql://")
    }
  })
})
