import type { TestProject } from "vitest/node"

import {
  startPostgresHarness,
  stopPostgresHarness,
  type PostgresHarness,
} from "./postgres-harness"

let harness: PostgresHarness | undefined

export async function setup(project: TestProject): Promise<void> {
  const startedHarness = await startPostgresHarness()

  try {
    project.provide("testDatabaseUrl", startedHarness.databaseUrl)
    harness = startedHarness
  } catch (error) {
    await stopPostgresHarness(startedHarness)
    throw error
  }
}

export async function teardown(): Promise<void> {
  const activeHarness = harness
  harness = undefined
  await stopPostgresHarness(activeHarness)
}
