import { describe, expect, it } from "vitest"

import {
  EnvironmentGuardError,
  assertLocalResetAllowed,
  assertMigrationAllowed,
  assertPreviewCleanupAllowed,
  assertPreviewDeploymentAllowed,
  assertProductionDeploymentAllowed,
  assertSeedReplacementAllowed,
  classifyDatabaseTarget,
  executeAfterGuard,
  type DatabaseConnectionObservation,
  type DatabaseConnectionTargetIdentity,
  type DatabaseTargetIdentity,
  type EnvironmentGuardInput,
  type PreviewCleanupIdentity,
  type ProductionApproval,
  type ResolvedDeliveryRef,
} from "@/scripts/environment/guards"
import type { EnvironmentProfile } from "@/scripts/environment/core"

const localDatabaseUrl =
  "postgresql://local-user:local-password@127.0.0.1:5432/todo"

function localProfile(): EnvironmentProfile {
  return {
    appEnv: "local",
    nodeEnv: "test",
    betterAuth: {
      url: "http://127.0.0.1:3100",
      secret: "local-auth-secret",
    },
    database: {
      provider: "local-postgres",
      runtimeRole: "direct",
      migrationRole: "direct",
      runtimeUrl: localDatabaseUrl,
      migrationUrl: localDatabaseUrl,
      runtimeUrlConfigured: true,
      migrationUrlConfigured: true,
    },
    sanity: {
      projectId: "project-id",
      dataset: "production",
      apiVersion: "2026-08-27",
      writePolicy: "local-recovery",
      revalidateSecret: "revalidate-secret",
      manualRecoverySecret: "manual-recovery-secret",
    },
    mail: {
      transport: "local-mailbox",
      localMailboxEnabled: true,
    },
    deployment: {
      owner: "local",
      secretNamespace: "local",
    },
    operations: {
      canMigrate: true,
      canSeed: true,
      canReset: true,
      canPreviewDeploy: false,
      canProductionDeploy: false,
      canUseSanityRecovery: true,
    },
  }
}

function neonProfile(
  appEnv: "development" | "preview" | "production"
): EnvironmentProfile {
  const branch =
    appEnv === "development"
      ? "development"
      : appEnv === "preview"
        ? "preview-42"
        : "production"
  const isProduction = appEnv === "production"
  const isPreview = appEnv === "preview"

  return {
    appEnv,
    nodeEnv: isProduction || isPreview ? "production" : "development",
    betterAuth: {
      url: isProduction
        ? "https://app.example.test"
        : isPreview
          ? "https://preview.example.test"
          : "http://localhost:3000",
      secret: `${appEnv}-auth-secret`,
    },
    database: {
      provider: "neon",
      projectId: "project-id",
      branch,
      runtimeRole: "pooled",
      migrationRole: "direct",
      runtimeUrl: `postgresql://runtime:runtime-password@ep-${appEnv}-pooler.neon.tech:5432/todo`,
      migrationUrl: `postgresql://migration:migration-password@ep-${branch}.neon.tech:5432/todo`,
      runtimeUrlConfigured: true,
      migrationUrlConfigured: true,
    },
    sanity: {
      projectId: "project-id",
      dataset: isPreview ? "preview" : "production",
      apiVersion: "2026-08-27",
      writePolicy: isProduction ? "production-recovery" : "read-only",
      ...(isProduction
        ? {
            revalidateSecret: "revalidate-secret",
            manualRecoverySecret: "manual-recovery-secret",
          }
        : {}),
    },
    mail: {
      transport: isProduction
        ? "remote"
        : isPreview
          ? "controlled-account"
          : "local-mailbox",
      ...(isProduction ? { provider: "mail-provider" } : {}),
      localMailboxEnabled: false,
    },
    deployment: {
      owner: isProduction || isPreview ? "vercel" : "github",
      secretNamespace: appEnv,
    },
    operations: {
      canMigrate: true,
      canSeed: !isProduction,
      canReset: false,
      canPreviewDeploy: isPreview,
      canProductionDeploy: isProduction,
      canUseSanityRecovery: isProduction,
    },
  }
}

function localTarget(): DatabaseTargetIdentity {
  return {
    provider: "local-postgres",
    host: "127.0.0.1",
  }
}

function previewIdentity(
  previewId = "preview-42",
  branch = "preview-42",
  projectId = "project-id"
): PreviewCleanupIdentity {
  return { previewId, branch, projectId }
}

function neonTarget(
  branch = "development",
  projectId = "project-id"
): DatabaseTargetIdentity {
  return {
    provider: "neon",
    projectId,
    branch,
    host: `ep-${branch}.neon.tech`,
  }
}

function connection(
  target: DatabaseTargetIdentity,
  role: "direct" | "pooled",
  url?: string
): DatabaseConnectionObservation {
  const host =
    target.host ??
    (target.provider === "local-postgres"
      ? "127.0.0.1"
      : `ep-${target.branch}.neon.tech`)
  const connectionTarget: DatabaseConnectionTargetIdentity = {
    ...target,
    host,
  }
  const defaultUrl =
    target.provider === "local-postgres"
      ? localDatabaseUrl
      : role === "pooled"
        ? `postgresql://runtime:runtime-password@${host.replace(".neon.tech", "-pooler.neon.tech")}:5432/todo`
        : `postgresql://migration:migration-password@${host}:5432/todo`

  return { target: connectionTarget, role, url: url ?? defaultUrl }
}

function guardInput(
  profile: EnvironmentProfile,
  target: DatabaseTargetIdentity,
  observedConnection?: DatabaseConnectionObservation
): EnvironmentGuardInput {
  return {
    profile,
    target,
    ...(observedConnection ? { connection: observedConnection } : {}),
  }
}

const resolvedRef: ResolvedDeliveryRef = {
  requestedRef: "release/2026-09-01",
  commitSha: "0123456789abcdef0123456789abcdef01234567",
  kind: "branch",
}

const resolvedProductionRef: ResolvedDeliveryRef = {
  requestedRef: "v1.0.0",
  commitSha: "0123456789abcdef0123456789abcdef01234567",
  kind: "tag",
}

const productionApproval: ProductionApproval = {
  environment: "production",
  commitSha: resolvedProductionRef.commitSha,
  approved: true,
}

describe("classifyDatabaseTarget", () => {
  it("accepts loopback Local identity without a remote branch label", () => {
    expect(classifyDatabaseTarget(localTarget())).toEqual({
      provider: "local-postgres",
      kind: "local",
      host: "127.0.0.1",
    })
  })

  it("treats localhost and loopback addresses as the same Local target", () => {
    const target = { provider: "local-postgres" as const, host: "localhost" }

    expect(
      assertMigrationAllowed(
        guardInput(localProfile(), target, connection(target, "direct"))
      ).database
    ).toMatchObject({ provider: "local-postgres", role: "direct" })
  })

  it("accepts Neon only when project and branch identity are both present", () => {
    expect(classifyDatabaseTarget(neonTarget("development"))).toEqual({
      provider: "neon",
      kind: "neon",
      projectId: "project-id",
      branch: "development",
      host: "ep-development.neon.tech",
    })
  })

  it("rejects a friendly Neon branch label without project identity", () => {
    expect(() =>
      classifyDatabaseTarget({ provider: "neon", branch: "development" })
    ).toThrowError(
      expect.objectContaining<Partial<EnvironmentGuardError>>({
        code: "target_unresolved",
        message: expect.stringContaining("provider-observed"),
      })
    )
  })

  it("rejects a Local target that is not loopback", () => {
    expect(() =>
      classifyDatabaseTarget({
        provider: "local-postgres",
        host: "ep-main.neon.tech",
      })
    ).toThrowError(expect.objectContaining({ code: "target_mismatch" }))
  })
})

describe("target guards", () => {
  it.each([
    ["local", localProfile(), localTarget()],
    ["development", neonProfile("development"), neonTarget()],
    ["preview", neonProfile("preview"), neonTarget("preview-42")],
  ] as const)("accepts the matching %s target", (_name, profile, target) => {
    const evidence = assertMigrationAllowed(
      guardInput(
        profile,
        target,
        connection(target, profile.database.migrationRole)
      )
    )

    expect(evidence.database).toMatchObject({
      provider: profile.database.provider,
      role: "direct",
    })
    if (profile.database.projectId && profile.database.branch) {
      expect(evidence.database).toMatchObject({
        projectId: profile.database.projectId,
        branch: profile.database.branch,
      })
    }
  })

  it("requires exact approved release proof before Production migration", () => {
    const target = neonTarget("production")
    const base = guardInput(
      neonProfile("production"),
      target,
      connection(target, "direct")
    )
    const proofBase = { ...base, resolvedRef: resolvedProductionRef }

    expect(() => assertMigrationAllowed(proofBase)).toThrowError(
      expect.objectContaining({ code: "approval_required" })
    )

    expect(
      assertMigrationAllowed({
        ...proofBase,
        approval: productionApproval,
      }).ref
    ).toEqual(resolvedProductionRef)
  })

  it("rejects a mismatched Neon project even when the branch name matches", () => {
    expect(() =>
      assertMigrationAllowed(
        guardInput(
          neonProfile("development"),
          neonTarget("development", "different-project"),
          connection(neonTarget("development", "different-project"), "direct")
        )
      )
    ).toThrowError(
      expect.objectContaining({
        code: "target_mismatch",
        message: expect.stringContaining(
          "select the provider project and branch configured for APP_ENV"
        ),
      })
    )
  })

  it("rejects a mismatched Neon branch even when the project matches", () => {
    const target = neonTarget("preview-42")
    expect(() =>
      assertMigrationAllowed(
        guardInput(
          neonProfile("development"),
          target,
          connection(target, "direct")
        )
      )
    ).toThrowError(expect.objectContaining({ code: "target_mismatch" }))
  })

  it("requires a provider-observed Neon endpoint host before database mutation", () => {
    const target: DatabaseTargetIdentity = {
      provider: "neon",
      projectId: "project-id",
      branch: "development",
    }

    expect(() =>
      assertMigrationAllowed(
        guardInput(
          neonProfile("development"),
          target,
          connection(target, "direct")
        )
      )
    ).toThrowError(
      expect.objectContaining({
        code: "target_unresolved",
        message: expect.stringContaining("endpoint host"),
      })
    )
  })

  it("returns corrective guidance for invalid endpoint metadata", () => {
    expect(() =>
      classifyDatabaseTarget({
        provider: "local-postgres",
        host: "127.0.0.1",
        port: 0,
      })
    ).toThrowError(
      expect.objectContaining({
        code: "target_unresolved",
        message: expect.stringContaining(
          "provide a valid port from the provider-observed endpoint"
        ),
      })
    )
  })

  it("explains accepted forms for malformed target metadata and Preview IDs", () => {
    expect(() =>
      classifyDatabaseTarget({
        provider: "neon",
        projectId: "project with spaces",
        branch: "preview-42",
        host: "ep-preview.neon.tech",
      })
    ).toThrowError(
      expect.objectContaining({
        code: "target_unresolved",
        message: expect.stringContaining(
          "1-128 characters: start with a letter or number"
        ),
      })
    )

    expect(() =>
      assertPreviewCleanupAllowed({
        ...guardInput(neonProfile("preview"), neonTarget("preview-42")),
        requestedPreviewId: "preview with spaces",
        preview: previewIdentity(),
      })
    ).toThrowError(
      expect.objectContaining({
        code: "target_unresolved",
        message: expect.stringContaining(
          "1-128 characters: start with a letter or number"
        ),
      })
    )
  })

  it("rejects a Preview operation pointed at the Production branch", () => {
    expect(() =>
      assertSeedReplacementAllowed(
        guardInput(
          neonProfile("preview"),
          neonTarget("production"),
          connection(neonTarget("production"), "direct")
        )
      )
    ).toThrowError(expect.objectContaining({ code: "target_mismatch" }))
  })

  it("rejects Local reset against a remote target before mutation", () => {
    expect(() =>
      assertLocalResetAllowed(
        guardInput(
          localProfile(),
          neonTarget("main"),
          connection(neonTarget("main"), "direct")
        )
      )
    ).toThrowError(expect.objectContaining({ code: "target_mismatch" }))
  })

  it("requires an explicit harness-owned target for Local reset", () => {
    const target = { ...localTarget(), ownership: "developer" as const }

    expect(() =>
      assertLocalResetAllowed(
        guardInput(localProfile(), target, connection(target, "direct"))
      )
    ).toThrowError(expect.objectContaining({ code: "target_unresolved" }))
  })

  it("accepts Local reset only for the matching harness-owned endpoint", () => {
    const target = { ...localTarget(), ownership: "harness" as const }

    expect(
      assertLocalResetAllowed(
        guardInput(localProfile(), target, connection(target, "direct"))
      )
    ).toMatchObject({
      operation: "local-reset",
      database: { provider: "local-postgres", role: "direct" },
    })
  })

  it("rejects conflicting selected and connection ownership for Local reset", () => {
    const selectedTarget = {
      ...localTarget(),
      ownership: "developer" as const,
    }
    const observed = connection(selectedTarget, "direct")
    const observedConnection: DatabaseConnectionObservation = {
      ...observed,
      target: { ...observed.target, ownership: "harness" },
    }

    expect(() =>
      assertLocalResetAllowed(
        guardInput(localProfile(), selectedTarget, observedConnection)
      )
    ).toThrowError(
      expect.objectContaining({
        code: "target_mismatch",
        message: expect.stringContaining("ownership must agree"),
      })
    )
  })

  it("rejects Local reset when the database endpoint differs from the profile", () => {
    const target = { ...localTarget(), ownership: "harness" as const }

    expect(() =>
      assertLocalResetAllowed(
        guardInput(
          localProfile(),
          target,
          connection(
            target,
            "direct",
            "postgresql://local-user:local-password@127.0.0.1:5433/other"
          )
        )
      )
    ).toThrowError(expect.objectContaining({ code: "target_mismatch" }))
  })

  it("rejects Local reset URLs with endpoint-overriding query parameters", () => {
    const target = { ...localTarget(), ownership: "harness" as const }

    expect(() =>
      assertLocalResetAllowed(
        guardInput(
          localProfile(),
          target,
          connection(
            target,
            "direct",
            "postgresql://local-user:local-password@127.0.0.1:5432/todo?host=ep-production.neon.tech"
          )
        )
      )
    ).toThrowError(
      expect.objectContaining({
        code: "invalid_connection",
        message: expect.stringContaining("remove the host query parameter"),
      })
    )
  })

  it("rejects Neon migration URLs with endpoint-overriding query parameters", () => {
    const target = neonTarget()

    expect(() =>
      assertMigrationAllowed(
        guardInput(
          neonProfile("development"),
          target,
          connection(
            target,
            "direct",
            "postgresql://migration:migration-password@ep-development.neon.tech/todo?port=5433"
          )
        )
      )
    ).toThrowError(
      expect.objectContaining({
        code: "invalid_connection",
        message: expect.stringContaining("remove the port query parameter"),
      })
    )
  })

  it("rejects mutation URLs that could fall back to PGPORT or PGDATABASE", () => {
    const localResetTarget = {
      ...localTarget(),
      ownership: "harness" as const,
    }
    expect(() =>
      assertLocalResetAllowed(
        guardInput(
          localProfile(),
          localResetTarget,
          connection(
            localResetTarget,
            "direct",
            "postgresql://local-user:local-password@127.0.0.1/todo"
          )
        )
      )
    ).toThrowError(
      expect.objectContaining({
        code: "invalid_connection",
        message: expect.stringContaining("PGPORT fallback"),
      })
    )

    const remoteTarget = neonTarget()
    expect(() =>
      assertMigrationAllowed(
        guardInput(
          neonProfile("development"),
          remoteTarget,
          connection(
            remoteTarget,
            "direct",
            "postgresql://migration:migration-password@ep-development.neon.tech:5432"
          )
        )
      )
    ).toThrowError(
      expect.objectContaining({
        code: "invalid_connection",
        message: expect.stringContaining("PGDATABASE fallback"),
      })
    )
  })

  it("rejects pooled connections for migration even when target identity matches", () => {
    const target = neonTarget()
    expect(() =>
      assertMigrationAllowed(
        guardInput(
          neonProfile("development"),
          target,
          connection(target, "pooled")
        )
      )
    ).toThrowError(
      expect.objectContaining({ code: "connection_role_mismatch" })
    )
  })

  it("rejects a pooled URL even when a caller labels it as direct", () => {
    const target = neonTarget()
    expect(() =>
      assertMigrationAllowed(
        guardInput(
          neonProfile("development"),
          target,
          connection(
            target,
            "direct",
            "postgresql://migration:migration-password@ep-development-pooler.neon.tech:5432/todo"
          )
        )
      )
    ).toThrowError(
      expect.objectContaining({ code: "connection_role_mismatch" })
    )
  })

  it("rejects a Neon URL whose host is not the configured branch endpoint", () => {
    const target = {
      ...neonTarget(),
      host: "ep-other.neon.tech",
    }

    expect(() =>
      assertMigrationAllowed(
        guardInput(
          neonProfile("development"),
          target,
          connection(
            target,
            "direct",
            "postgresql://migration:migration-password@ep-other.neon.tech:5432/todo"
          )
        )
      )
    ).toThrowError(expect.objectContaining({ code: "target_mismatch" }))
  })

  it("rejects a selected Neon target whose host differs from the observed connection target", () => {
    const target = {
      ...neonTarget(),
      host: "ep-other.neon.tech",
    }

    expect(() =>
      assertMigrationAllowed(
        guardInput(
          neonProfile("development"),
          target,
          connection(neonTarget(), "direct")
        )
      )
    ).toThrowError(expect.objectContaining({ code: "target_mismatch" }))
  })

  it("rejects seed replacement in Production", () => {
    const target = neonTarget("production")
    expect(() =>
      assertSeedReplacementAllowed(
        guardInput(
          neonProfile("production"),
          target,
          connection(target, "direct")
        )
      )
    ).toThrowError(expect.objectContaining({ code: "operation_forbidden" }))
  })

  it("does not allow a mutable permission flag to enable Production seed replacement", () => {
    const profile = neonProfile("production")
    const weakenedProfile: EnvironmentProfile = {
      ...profile,
      operations: { ...profile.operations, canSeed: true },
    }
    const target = neonTarget("production")

    expect(() =>
      assertSeedReplacementAllowed(
        guardInput(weakenedProfile, target, connection(target, "direct"))
      )
    ).toThrowError(expect.objectContaining({ code: "operation_forbidden" }))
  })

  it("does not allow a mutable permission flag to enable Production deployment outside Production", () => {
    const profile = neonProfile("development")
    const weakenedProfile: EnvironmentProfile = {
      ...profile,
      operations: { ...profile.operations, canProductionDeploy: true },
    }
    const target = neonTarget("development")

    expect(() =>
      assertProductionDeploymentAllowed({
        ...guardInput(weakenedProfile, target),
        resolvedRef: resolvedProductionRef,
        approval: productionApproval,
      })
    ).toThrowError(expect.objectContaining({ code: "operation_forbidden" }))
  })

  it("requires an identity-matched Preview branch for cleanup", () => {
    const target = neonTarget("preview-42")
    const preview: PreviewCleanupIdentity = {
      previewId: "preview-42",
      projectId: "project-id",
      branch: "preview-42",
    }

    expect(
      assertPreviewCleanupAllowed({
        ...guardInput(neonProfile("preview"), target),
        requestedPreviewId: "preview-42",
        preview,
      }).preview
    ).toEqual(preview)

    expect(() =>
      assertPreviewCleanupAllowed({
        ...guardInput(neonProfile("preview"), target),
        requestedPreviewId: "preview-42",
        preview: { ...preview, branch: "preview-other" },
      })
    ).toThrowError(expect.objectContaining({ code: "target_mismatch" }))

    expect(() =>
      assertPreviewCleanupAllowed({
        ...guardInput(neonProfile("preview"), target),
        requestedPreviewId: "preview-other",
        preview,
      })
    ).toThrowError(
      expect.objectContaining({
        code: "target_mismatch",
        message: expect.stringContaining(
          "use the provider-created Preview identity"
        ),
      })
    )
  })

  it("rejects a Neon endpoint that disagrees with the profile for non-connection guards", () => {
    const previewTarget = {
      ...neonTarget("preview-42"),
      host: "ep-production.neon.tech",
    }
    const preview = previewIdentity()

    expect(() =>
      assertPreviewCleanupAllowed({
        ...guardInput(neonProfile("preview"), previewTarget),
        requestedPreviewId: "preview-42",
        preview,
      })
    ).toThrowError(expect.objectContaining({ code: "target_mismatch" }))

    expect(() =>
      assertPreviewDeploymentAllowed({
        ...guardInput(neonProfile("preview"), previewTarget),
        requestedPreviewId: "preview-42",
        preview,
        resolvedRef,
      })
    ).toThrowError(expect.objectContaining({ code: "target_mismatch" }))

    const productionTarget = {
      ...neonTarget("production"),
      host: "ep-preview.neon.tech",
    }
    expect(() =>
      assertProductionDeploymentAllowed({
        ...guardInput(neonProfile("production"), productionTarget),
        resolvedRef: resolvedProductionRef,
        approval: productionApproval,
      })
    ).toThrowError(expect.objectContaining({ code: "target_mismatch" }))
  })

  it("requires a resolved immutable ref for Preview deployment", () => {
    const target = neonTarget("preview-42")
    expect(() =>
      assertPreviewDeploymentAllowed({
        ...guardInput(neonProfile("preview"), target),
        requestedPreviewId: "preview-42",
        preview: previewIdentity(),
      })
    ).toThrowError(
      expect.objectContaining({
        code: "ref_unresolved",
        message: expect.stringContaining(
          "provide a provider-resolved full commit SHA"
        ),
      })
    )

    expect(
      assertPreviewDeploymentAllowed({
        ...guardInput(neonProfile("preview"), target),
        requestedPreviewId: "preview-42",
        preview: previewIdentity(),
        resolvedRef,
      }).ref
    ).toEqual(resolvedRef)

    expect(() =>
      assertPreviewDeploymentAllowed({
        ...guardInput(neonProfile("preview"), target),
        requestedPreviewId: "preview-42",
        preview: previewIdentity("preview-other", "preview-other"),
        resolvedRef,
      })
    ).toThrowError(expect.objectContaining({ code: "target_mismatch" }))

    expect(() =>
      assertPreviewDeploymentAllowed({
        ...guardInput(neonProfile("preview"), target),
        requestedPreviewId: "preview-other",
        preview: previewIdentity(),
        resolvedRef,
      })
    ).toThrowError(expect.objectContaining({ code: "target_mismatch" }))
  })

  it("requires an exact resolved ref and matching Production approval", () => {
    const target = neonTarget("production")
    const base = {
      ...guardInput(neonProfile("production"), target),
      resolvedRef: resolvedProductionRef,
    }

    expect(() => assertProductionDeploymentAllowed(base)).toThrowError(
      expect.objectContaining({ code: "approval_required" })
    )

    expect(() =>
      assertProductionDeploymentAllowed({
        ...base,
        approval: {
          ...productionApproval,
          approved: "yes",
        } as unknown as ProductionApproval,
      })
    ).toThrowError(expect.objectContaining({ code: "approval_required" }))

    expect(
      assertProductionDeploymentAllowed({
        ...base,
        approval: productionApproval,
      }).ref
    ).toEqual(resolvedProductionRef)

    expect(() =>
      assertProductionDeploymentAllowed({
        ...base,
        approval: { ...productionApproval, commitSha: "f".repeat(40) },
      })
    ).toThrowError(
      expect.objectContaining({
        code: "approval_mismatch",
        message: expect.stringContaining(
          "obtain protected Production approval for the resolved commit"
        ),
      })
    )

    expect(() =>
      assertProductionDeploymentAllowed({
        ...guardInput(neonProfile("production"), target),
        approval: productionApproval,
      })
    ).toThrowError(
      expect.objectContaining({
        code: "ref_unresolved",
        message: expect.stringContaining(
          "provide a provider-resolved full commit SHA"
        ),
      })
    )

    expect(() =>
      assertProductionDeploymentAllowed({
        ...base,
        resolvedRef,
        approval: { ...productionApproval, commitSha: resolvedRef.commitSha },
      })
    ).toThrowError(expect.objectContaining({ code: "ref_invalid" }))

    expect(() =>
      assertProductionDeploymentAllowed({
        ...base,
        resolvedRef: { ...resolvedProductionRef, requestedRef: "latest" },
        approval: productionApproval,
      })
    ).toThrowError(
      expect.objectContaining({
        code: "ref_invalid",
        message: expect.stringContaining("provide a non-mutable delivery ref"),
      })
    )
  })

  it("requires commit-kind Production refs to name the exact full SHA", () => {
    const target = neonTarget("production")
    const commitRef: ResolvedDeliveryRef = {
      requestedRef: resolvedProductionRef.commitSha,
      commitSha: resolvedProductionRef.commitSha,
      kind: "commit",
    }

    expect(
      assertProductionDeploymentAllowed({
        ...guardInput(neonProfile("production"), target),
        resolvedRef: commitRef,
        approval: productionApproval,
      }).ref
    ).toEqual(commitRef)

    expect(() =>
      assertProductionDeploymentAllowed({
        ...guardInput(neonProfile("production"), target),
        resolvedRef: {
          ...commitRef,
          requestedRef: "release/candidate",
        },
        approval: productionApproval,
      })
    ).toThrowError(expect.objectContaining({ code: "ref_invalid" }))
  })

  it("returns safe evidence without URLs or credentials", () => {
    const target = neonTarget()
    const evidence = assertMigrationAllowed(
      guardInput(
        neonProfile("development"),
        target,
        connection(target, "direct")
      )
    )
    const output = JSON.stringify(evidence)

    expect(output).not.toContain("postgresql://")
    expect(output).not.toContain("migration-password")
    expect(output).not.toContain("development-auth-secret")
    expect(evidence).toMatchObject({
      appEnv: "development",
      operation: "migration",
      database: {
        provider: "neon",
        projectId: "project-id",
        branch: "development",
        role: "direct",
      },
    })
  })

  it("does not invoke a mutation when a guard refuses the target", async () => {
    const target = neonTarget("main")
    let mutationCount = 0

    await expect(
      executeAfterGuard(
        () =>
          assertLocalResetAllowed(
            guardInput(localProfile(), target, connection(target, "direct"))
          ),
        async () => {
          mutationCount += 1
        }
      )
    ).rejects.toThrowError(EnvironmentGuardError)

    expect(mutationCount).toBe(0)
  })
})
