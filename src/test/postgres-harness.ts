import { readFile, readdir } from "node:fs/promises"
import path from "node:path"

import { PostgreSqlContainer } from "@testcontainers/postgresql"
import { Pool, type PoolClient } from "pg"

export const POSTGRES_TEST_IMAGE = "postgres:18-alpine"

const TEST_DATABASE = "todo_test"
const TEST_USERNAME = "postgres"
const TEST_PASSWORD = "postgres"
const LOCAL_POSTGRES_ERROR =
  "Integration database must be a local PostgreSQL URL"

export interface PostgresContainerLike {
  getConnectionUri(): string
  stop(): Promise<unknown>
}

export interface PostgresHarness {
  readonly container: PostgresContainerLike
  readonly databaseUrl: string
}

export interface PostgresHarnessDependencies {
  readonly startContainer?: () => Promise<PostgresContainerLike>
  readonly applyMigrations?: (databaseUrl: string) => Promise<void>
}

export function assertLocalPostgresUrl(
  databaseUrl: string | undefined
): string {
  if (!databaseUrl?.trim()) {
    throw new Error(LOCAL_POSTGRES_ERROR)
  }

  let parsedUrl: URL
  try {
    parsedUrl = new URL(databaseUrl)
  } catch {
    throw new Error(LOCAL_POSTGRES_ERROR)
  }

  const localHosts = new Set(["localhost", "127.0.0.1", "::1", "[::1]"])
  if (
    !localHosts.has(parsedUrl.hostname) ||
    !/^postgres(?:ql)?:$/.test(parsedUrl.protocol)
  ) {
    throw new Error(LOCAL_POSTGRES_ERROR)
  }

  return databaseUrl.trim()
}

export function splitMigrationStatements(migrationSql: string): string[] {
  return migrationSql
    .split(/--> statement-breakpoint\s*/)
    .map((statement) => statement.trim())
    .filter(Boolean)
}

export async function readMigrationSqlFiles(): Promise<readonly string[]> {
  const migrationsRoot = path.resolve("migrations")
  const entries = await readdir(migrationsRoot, { withFileTypes: true })
  const directories = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()

  return Promise.all(
    directories.map(async (directory) =>
      readFile(path.join(migrationsRoot, directory, "migration.sql"), "utf8")
    )
  )
}

export async function applyMigrationChain(client: PoolClient): Promise<void> {
  for (const migrationSql of await readMigrationSqlFiles()) {
    for (const statement of splitMigrationStatements(migrationSql)) {
      await client.query(statement)
    }
  }
}

export async function applyMigrationsToDatabase(
  databaseUrl: string
): Promise<void> {
  const localDatabaseUrl = assertLocalPostgresUrl(databaseUrl)
  const pool = new Pool({ connectionString: localDatabaseUrl })
  const client = await pool.connect()

  try {
    await applyMigrationChain(client)
  } finally {
    client.release()
    await pool.end()
  }
}

async function startDefaultContainer(): Promise<PostgresContainerLike> {
  return new PostgreSqlContainer(POSTGRES_TEST_IMAGE)
    .withDatabase(TEST_DATABASE)
    .withUsername(TEST_USERNAME)
    .withPassword(TEST_PASSWORD)
    .start()
}

export async function startPostgresHarness(
  dependencies: PostgresHarnessDependencies = {}
): Promise<PostgresHarness> {
  let container: PostgresContainerLike | undefined

  try {
    container = await (dependencies.startContainer ?? startDefaultContainer)()
    const databaseUrl = assertLocalPostgresUrl(container.getConnectionUri())
    await (dependencies.applyMigrations ?? applyMigrationsToDatabase)(
      databaseUrl
    )

    return { container, databaseUrl }
  } catch (error) {
    await container?.stop().catch(() => undefined)
    throw new Error(
      "PostgreSQL Testcontainer setup failed. Ensure Docker is running and the migration chain is valid.",
      { cause: error }
    )
  }
}

export async function stopPostgresHarness(
  harness: PostgresHarness | undefined
): Promise<void> {
  await harness?.container.stop()
}
