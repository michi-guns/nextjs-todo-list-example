import { execFile } from "node:child_process"
import { open } from "node:fs/promises"
import { promisify } from "node:util"
import { Pool } from "pg"
import { z } from "zod"
import { createSettingsStore } from "../../src/shared/logging/settings-store"
import { productionTarget } from "../deploy/production/core"
import {
  assertReleaseCheckout,
  requireReleaseCi,
  resolveReleaseRef,
} from "../deploy/production/ref"
import type { LoggingCommandRuntime } from "./core"

const execute = promisify(execFile)
const branchSchema = z.object({
  id: z.string(),
  name: z.string(),
  project_id: z.string(),
  default: z.boolean(),
})
const sha = z.string().regex(/^[0-9a-f]{40}$/)

async function runNeon(args: string[]): Promise<string> {
  try {
    // Windows npm shims need a shell. Single-quoted PowerShell literals preserve arguments.
    const command = process.platform === "win32" ? "powershell.exe" : "neon"
    const parameters =
      process.platform === "win32"
        ? [
            "-NoProfile",
            "-NonInteractive",
            "-Command",
            `& neon ${args.map((value) => `'${value.replaceAll("'", "''")}'`).join(" ")}; exit $LASTEXITCODE`,
          ]
        : args
    const { stdout } = await execute(command, parameters, {
      windowsHide: true,
      timeout: 20_000,
      maxBuffer: 256 * 1024,
    })
    return stdout.trim()
  } catch {
    throw new Error("Logging target lookup failed")
  }
}

export function createLoggingCommandRuntime(
  run: typeof runNeon = runNeon
): LoggingCommandRuntime {
  return {
    async observe(command) {
      if (command.environment === "local")
        return {
          provider: "local-postgres",
          host: command.host!,
          port: command.port!,
          database: command.database,
          ownership: "developer",
        }
      const branch = branchSchema.parse(
        JSON.parse(
          await run([
            "branches",
            "get",
            command.branch!,
            "--project-id",
            command.project!,
            "--output",
            "json",
          ])
        )
      )
      if (
        branch.project_id !== command.project ||
        branch.name !== command.branch ||
        (command.environment !== "production" && branch.default)
      )
        throw new Error("Logging target mismatch")
      if (
        command.environment === "production" &&
        (branch.project_id !== productionTarget.neonProjectId ||
          branch.id !== productionTarget.neonBranchId ||
          command.database !== productionTarget.database)
      )
        throw new Error("Logging Production target mismatch")
      const direct = new URL(
        await run([
          "connection-string",
          branch.id,
          "--project-id",
          branch.project_id,
          "--database-name",
          command.database,
          "--ssl",
          "verify-full",
        ])
      )
      if (
        !/^postgres(?:ql)?:$/.test(direct.protocol) ||
        direct.hostname.includes("-pooler") ||
        direct.pathname !== `/${command.database}`
      )
        throw new Error("Logging endpoint mismatch")
      return {
        provider: "neon",
        projectId: branch.project_id,
        branch: branch.name,
        host: direct.hostname,
        port: Number(direct.port || 5432),
        database: command.database,
        ownership: "provider",
      }
    },
    async readPolicy(file) {
      const handle = await open(file, "r")
      try {
        if (!(await handle.stat()).isFile())
          throw new Error("Policy must be a regular file")
        const buffer = Buffer.alloc(32_769)
        const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0)
        if (bytesRead > 32_768) throw new Error("Policy exceeds 32 KiB")
        return JSON.parse(buffer.toString("utf8", 0, bytesRead)) as unknown
      } finally {
        await handle.close()
      }
    },
    async verifyProduction(environment) {
      // Same protected-job trust boundary as the existing release CLI; no --approve flag.
      const commitSha = sha.parse(environment.RELEASE_COMMIT_SHA)
      if (
        environment.GITHUB_ACTIONS !== "true" ||
        environment.GITHUB_REF !== "refs/heads/main" ||
        environment.GITHUB_REPOSITORY !==
          "michi-guns/nextjs-todo-list-example" ||
        environment.RELEASE_APPROVED_SHA !== commitSha
      )
        throw new Error("Protected Production approval required")
      await assertReleaseCheckout(commitSha)
      const resolvedRef = await resolveReleaseRef(commitSha)
      await requireReleaseCi({
        repository: environment.GITHUB_REPOSITORY,
        commitSha,
        token: environment.GITHUB_TOKEN ?? "",
      })
      return {
        resolvedRef,
        approval: { environment: "production", commitSha, approved: true },
      }
    },
    async connect(profile) {
      const pool = new Pool({
        connectionString: profile.database.migrationUrl,
        max: 1,
        connectionTimeoutMillis: 10_000,
      })
      pool.on("error", () => {
        /* Never print provider errors or credentials. */
      })
      return { store: createSettingsStore(pool), close: () => pool.end() }
    },
  }
}
