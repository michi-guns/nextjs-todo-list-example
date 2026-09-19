import { z } from "zod"
import {
  logEnvironmentSchema,
  type LogPolicy,
} from "../../src/shared/logging/config"
import { validateSettingsUpdate } from "../../src/shared/logging/settings-store"
import {
  parseEnvironmentProfile,
  type EnvironmentProfile,
  type EnvironmentVariables,
} from "../environment/core"
import {
  assertMigrationAllowed,
  type DatabaseTargetIdentity,
  type EnvironmentGuardInput,
} from "../environment/guards"

const identifier = z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/)
const commandSchema = z
  .strictObject({
    command: z.enum(["inspect", "set"]),
    environment: logEnvironmentSchema,
    database: identifier,
    host: z
      .string()
      .regex(/^(localhost|127\.0\.0\.1|::1)$/)
      .optional(),
    port: z.coerce.number().int().min(1).max(65535).optional(),
    project: identifier.optional(),
    branch: identifier.optional(),
    file: z.string().min(1).optional(),
    "expected-revision": z
      .string()
      .regex(/^(0|[1-9]\d*)$/)
      .transform(Number)
      .pipe(
        z
          .number()
          .int()
          .min(0)
          .max(Number.MAX_SAFE_INTEGER - 1)
      )
      .optional(),
  })
  .superRefine((value, ctx) => {
    const local = value.environment === "local"
    if (
      (local &&
        (!value.host || !value.port || value.project || value.branch)) ||
      (!local && (!value.project || !value.branch || value.host || value.port))
    )
      ctx.addIssue({ code: "custom", message: "Explicit target required" })
    if (
      value.command === "set"
        ? !value.file || value["expected-revision"] === undefined
        : value.file !== undefined || value["expected-revision"] !== undefined
    )
      ctx.addIssue({ code: "custom", message: "Invalid command options" })
  })
export type LoggingCommand = z.infer<typeof commandSchema>

export function parseLoggingCommand(args: readonly string[]): LoggingCommand {
  const [command, ...rest] = args[0] === "--" ? args.slice(1) : args
  const values: Record<string, unknown> = { command }
  for (let i = 0; i < rest.length; i += 2) {
    const key = rest[i]
    if (
      !key?.startsWith("--") ||
      rest[i + 1] === undefined ||
      Object.hasOwn(values, key.slice(2))
    )
      throw new Error("Invalid logging arguments")
    values[key.slice(2)] = rest[i + 1]
  }
  return commandSchema.parse(values)
}

export interface LoggingCommandRuntime {
  observe(
    command: LoggingCommand
  ): Promise<DatabaseTargetIdentity & { host: string }>
  readPolicy(file: string): Promise<unknown>
  verifyProduction(
    environment: EnvironmentVariables
  ): Promise<Pick<EnvironmentGuardInput, "resolvedRef" | "approval">>
  connect(profile: EnvironmentProfile): Promise<{
    store: {
      read(): Promise<LogPolicy | null>
      set(policy: unknown, revision: number): Promise<LogPolicy>
    }
    close(): Promise<void>
  }>
}

export async function runLoggingCommand(
  command: LoggingCommand,
  environment: EnvironmentVariables,
  runtime: LoggingCommandRuntime
) {
  const profile = parseEnvironmentProfile(environment)
  if (
    profile.appEnv !== command.environment ||
    profile.database.projectId !== command.project ||
    profile.database.branch !== command.branch
  )
    throw new Error("Logging target mismatch")
  // Validate the complete policy before opening a database connection.
  const policy =
    command.command === "set"
      ? validateSettingsUpdate(
          await runtime.readPolicy(command.file!),
          command["expected-revision"]!
        )
      : undefined
  const target = await runtime.observe(command)
  if (
    target.database !== command.database ||
    (command.environment === "local" &&
      (target.host !== command.host || target.port !== command.port))
  )
    throw new Error("Logging target mismatch")
  const proof =
    profile.appEnv === "production"
      ? await runtime.verifyProduction(environment)
      : {}
  assertMigrationAllowed({
    profile,
    target,
    ...proof,
    connection: { target, role: "direct", url: profile.database.migrationUrl },
  })
  const connection = await runtime.connect(profile)
  try {
    const saved = policy
      ? await connection.store.set(policy, command["expected-revision"]!)
      : await connection.store.read()
    return {
      environment: profile.appEnv,
      revision: saved?.revision ?? 0,
      policy: saved,
    }
  } finally {
    await connection.close()
  }
}
