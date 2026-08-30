import { execFile } from "node:child_process"
import { promisify } from "node:util"
import { mkdir, writeFile } from "node:fs/promises"
import { dirname, relative, resolve, sep } from "node:path"
import { Pool } from "pg"

import {
  assertAuthoritativeDevelopmentTarget,
  assertCursorSequence,
  assertPlanUsesIndex,
  deterministicUuid,
  extractPlanSummary,
  normalizeSslMode,
} from "./core.mjs"

const execFileAsync = promisify(execFile)

const PRIMARY_USER_ID = "t16-performance-primary"
const SECONDARY_USER_ID = "t16-performance-secondary"
const PRIMARY_USER_EMAIL = "t16-performance-primary@example.invalid"
const SECONDARY_USER_EMAIL = "t16-performance-secondary@example.invalid"
const LIST_COUNT = 101
const TASK_COUNT = 10_000
const SECONDARY_TASK_COUNT = 10_000
const LIST_PAGE_SIZE = 20
const TASK_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 100
const WARMUP_COUNT = 3
const DEFAULT_WARM_SAMPLE_COUNT = 10
const WARM_TARGET_MS = 50
const SEED_BASE_TIME = Date.UTC(2025, 0, 1, 0, 0, 0)
const DEVELOPMENT_BRANCH = "development"
const NEON_CLI_TIMEOUT_MS = 30_000
const PERFORMANCE_EVIDENCE_PATH =
  "docs/agentforge/evidence/t16-neon-performance.json"
const EXPECTED_INDEXES = {
  lists: "lists_user_created_at_id_idx",
  tasks: "tasks_user_list_created_at_id_idx",
}

function parsePositiveInteger(value, fallback, name) {
  if (value === undefined || value === "") {
    return fallback
  }

  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
    throw new Error(`${name} must be an integer from 1 through 100`)
  }
  return parsed
}

async function getAuthoritativeDevelopmentUrl() {
  const command = process.platform === "win32" ? "powershell.exe" : "neon"
  const args =
    process.platform === "win32"
      ? [
          "-NoLogo",
          "-NoProfile",
          "-NonInteractive",
          "-ExecutionPolicy",
          "Bypass",
          "-Command",
          "neon connection-string development",
        ]
      : ["connection-string", DEVELOPMENT_BRANCH]

  let result
  try {
    result = await execFileAsync(command, args, {
      encoding: "utf8",
      maxBuffer: 1024 * 1024,
      timeout: NEON_CLI_TIMEOUT_MS,
      windowsHide: true,
    })
  } catch {
    throw new Error(
      "Unable to obtain the authoritative Neon development connection string; verify that the Neon CLI is installed, authenticated, and the development branch is available"
    )
  }

  const databaseUrl = result.stdout.trim()
  if (!databaseUrl) {
    throw new Error(
      "The Neon CLI returned no connection string for the development branch"
    )
  }

  return databaseUrl
}

function loadConfig(environment = process.env, authoritativeDatabaseUrl) {
  const suppliedDatabaseUrl = environment.DATABASE_URL?.trim()
  const databaseUrl = suppliedDatabaseUrl || authoritativeDatabaseUrl
  const computeActive = environment.NEON_COMPUTE_ACTIVE?.trim().toLowerCase()
  const expectedDatabase =
    environment.NEON_EXPECTED_DATABASE?.trim() || "neondb"
  const evidencePath =
    environment.T16_EVIDENCE_PATH?.trim() || PERFORMANCE_EVIDENCE_PATH
  const warmSampleCount = parsePositiveInteger(
    environment.T16_WARM_SAMPLES,
    DEFAULT_WARM_SAMPLE_COUNT,
    "T16_WARM_SAMPLES"
  )

  if (!authoritativeDatabaseUrl) {
    throw new Error(
      "The authoritative Neon development connection string is required"
    )
  }
  if (!databaseUrl) {
    throw new Error("DATABASE_URL must be available for the development branch")
  }
  if (computeActive !== "true") {
    throw new Error(
      "NEON_COMPUTE_ACTIVE=true is required after confirming the development branch is ready"
    )
  }

  const target = assertAuthoritativeDevelopmentTarget({
    databaseUrl,
    authoritativeDatabaseUrl,
  })

  return {
    branchName: target.branchName,
    databaseUrl,
    evidencePath,
    expectedDatabase,
    target,
    allowEvidenceReplace: environment.T16_ALLOW_EVIDENCE_REPLACE === "true",
    warmSampleCount,
  }
}

function resolveEvidencePath(requestedPath) {
  const root = resolve(process.cwd())
  const evidenceRoot = resolve(root, "docs/agentforge/evidence")
  const outputPath = resolve(root, requestedPath)
  const relativePath = relative(evidenceRoot, outputPath)

  if (
    relativePath === "" ||
    relativePath === ".." ||
    relativePath.startsWith(`..${sep}`) ||
    relativePath.includes(`..${sep}`)
  ) {
    throw new Error(
      "T16_EVIDENCE_PATH must remain inside docs/agentforge/evidence"
    )
  }

  return outputPath
}

async function getDatabaseIdentity(client) {
  const result = await client.query(`
    SELECT
      current_database() AS database,
      current_user AS role,
      current_setting('server_version') AS server_version,
      current_setting('server_version_num') AS server_version_num
  `)
  return result.rows[0]
}

function assertDatabaseIdentity(identity, expectedDatabase) {
  if (identity?.database !== expectedDatabase) {
    throw new Error(
      `Connected database ${identity?.database || "unknown"} does not match the expected Neon development database`
    )
  }
}

async function assertRequiredIndexes(client) {
  const result = await client.query(`
    SELECT tablename, indexname
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename IN ('lists', 'tasks')
  `)
  const indexes = new Set(
    result.rows.map((row) => `${row.tablename}:${row.indexname}`)
  )

  for (const [table, indexName] of Object.entries(EXPECTED_INDEXES)) {
    if (!indexes.has(`${table}:${indexName}`)) {
      throw new Error(
        `Required ${table} index ${indexName} is not present on the development branch`
      )
    }
  }
}

async function insertRows(client, table, columns, rows, batchSize = 500) {
  for (let start = 0; start < rows.length; start += batchSize) {
    const batch = rows.slice(start, start + batchSize)
    const values = batch.flat()
    const placeholders = batch
      .map((row, rowIndex) => {
        const offset = rowIndex * columns.length
        return `(${columns.map((_, columnIndex) => `$${offset + columnIndex + 1}`).join(", ")})`
      })
      .join(", ")
    await client.query(
      `INSERT INTO ${table} (${columns.join(", ")}) VALUES ${placeholders}`,
      values
    )
  }
}

function buildSeed() {
  const primaryLists = Array.from({ length: LIST_COUNT }, (_, index) => {
    const createdAt = new Date(SEED_BASE_TIME + index * 60_000)
    return {
      id: deterministicUuid(`t16-performance:list:${index}`),
      userId: PRIMARY_USER_ID,
      name: `T16 performance list ${String(index + 1).padStart(3, "0")}`,
      createdAt,
      updatedAt: createdAt,
    }
  })
  const largeList = primaryLists[0]
  const secondaryList = {
    id: deterministicUuid("t16-performance:secondary-list"),
    userId: SECONDARY_USER_ID,
    name: "T16 secondary-user list",
    createdAt: new Date(SEED_BASE_TIME - 86_400_000),
    updatedAt: new Date(SEED_BASE_TIME - 86_400_000),
  }

  const primaryTasks = Array.from({ length: TASK_COUNT }, (_, index) => {
    const createdAt = new Date(SEED_BASE_TIME + (TASK_COUNT - index) * 1_000)
    const status =
      index % 5 === 0 ? "done" : index % 2 === 0 ? "todo" : "in_progress"
    return {
      id: deterministicUuid(`t16-performance:task:${index}`),
      listId: largeList.id,
      userId: PRIMARY_USER_ID,
      title: `T16 performance task ${String(index + 1).padStart(5, "0")}`,
      notes: null,
      status,
      createdAt,
      updatedAt: createdAt,
    }
  })
  const secondaryTasks = Array.from(
    { length: SECONDARY_TASK_COUNT },
    (_, index) => {
      const createdAt = new Date(SEED_BASE_TIME - (index + 1) * 1_000)
      return {
        id: deterministicUuid(`t16-performance:secondary-task:${index}`),
        listId: secondaryList.id,
        userId: SECONDARY_USER_ID,
        title: `T16 secondary-user task ${index + 1}`,
        notes: null,
        status: "todo",
        createdAt,
        updatedAt: createdAt,
      }
    }
  )

  return {
    largeList,
    lists: [...primaryLists, secondaryList],
    primaryTasks,
    secondaryTasks,
  }
}

async function seedPerformanceData(client) {
  const seed = buildSeed()
  const syntheticUserIds = [PRIMARY_USER_ID, SECONDARY_USER_ID]

  await client.query("BEGIN")
  try {
    await client.query("DELETE FROM users WHERE id = ANY($1::text[])", [
      syntheticUserIds,
    ])
    await insertRows(
      client,
      "users",
      ["id", "name", "email", "email_verified", "created_at", "updated_at"],
      [
        [
          PRIMARY_USER_ID,
          "T16 Performance Primary",
          PRIMARY_USER_EMAIL,
          true,
          new Date(SEED_BASE_TIME),
          new Date(SEED_BASE_TIME),
        ],
        [
          SECONDARY_USER_ID,
          "T16 Performance Secondary",
          SECONDARY_USER_EMAIL,
          true,
          new Date(SEED_BASE_TIME),
          new Date(SEED_BASE_TIME),
        ],
      ],
      2
    )
    await insertRows(
      client,
      "lists",
      ["id", "user_id", "name", "created_at", "updated_at"],
      seed.lists.map((list) => [
        list.id,
        list.userId,
        list.name,
        list.createdAt,
        list.updatedAt,
      ])
    )
    await insertRows(
      client,
      "tasks",
      [
        "id",
        "list_id",
        "user_id",
        "title",
        "notes",
        "status",
        "created_at",
        "updated_at",
      ],
      [...seed.primaryTasks, ...seed.secondaryTasks].map((task) => [
        task.id,
        task.listId,
        task.userId,
        task.title,
        task.notes,
        task.status,
        task.createdAt,
        task.updatedAt,
      ])
    )
    await client.query("COMMIT")
  } catch (error) {
    await client.query("ROLLBACK")
    throw error
  }

  await client.query("ANALYZE lists")
  await client.query("ANALYZE tasks")

  const [listCounts, taskCounts] = await Promise.all([
    client.query(
      `SELECT user_id, count(*)::int AS count FROM lists WHERE user_id = ANY($1::text[]) GROUP BY user_id ORDER BY user_id`,
      [syntheticUserIds]
    ),
    client.query(
      `SELECT user_id, count(*)::int AS count, count(*) FILTER (WHERE status = 'done')::int AS done_count FROM tasks WHERE user_id = ANY($1::text[]) GROUP BY user_id ORDER BY user_id`,
      [syntheticUserIds]
    ),
  ])

  return {
    primaryListId: seed.largeList.id,
    primaryUserId: PRIMARY_USER_ID,
    secondaryUserId: SECONDARY_USER_ID,
    listCounts: listCounts.rows,
    taskCounts: taskCounts.rows,
    primaryListCount: LIST_COUNT,
    primaryTaskCount: TASK_COUNT,
    secondaryTaskCount: SECONDARY_TASK_COUNT,
  }
}

function listPageQuery(userId, pageSize, cursor) {
  if (cursor) {
    return {
      text: `
        SELECT id, user_id, name, created_at, updated_at
        FROM lists
        WHERE user_id = $1
          AND (created_at > $2::timestamptz OR (created_at = $2::timestamptz AND id > $3::uuid))
        ORDER BY created_at ASC, id ASC
        LIMIT $4
      `,
      values: [userId, cursor.createdAt, cursor.id, pageSize + 1],
    }
  }

  return {
    text: `
      SELECT id, user_id, name, created_at, updated_at
      FROM lists
      WHERE user_id = $1
      ORDER BY created_at ASC, id ASC
      LIMIT $2
    `,
    values: [userId, pageSize + 1],
  }
}

function taskPageQuery(userId, listId, pageSize, includeCompleted, cursor) {
  const completedPredicate = includeCompleted ? "" : "AND status <> 'done'"
  if (cursor) {
    return {
      text: `
        SELECT id, list_id, user_id, title, notes, status, created_at, updated_at
        FROM tasks
        WHERE user_id = $1
          AND list_id = $2
          ${completedPredicate}
          AND (created_at < $3::timestamptz OR (created_at = $3::timestamptz AND id < $4::uuid))
        ORDER BY created_at DESC NULLS LAST, id DESC NULLS LAST
        LIMIT $5
      `,
      values: [userId, listId, cursor.createdAt, cursor.id, pageSize + 1],
    }
  }

  return {
    text: `
      SELECT id, list_id, user_id, title, notes, status, created_at, updated_at
      FROM tasks
      WHERE user_id = $1
        AND list_id = $2
        ${completedPredicate}
      ORDER BY created_at DESC NULLS LAST, id DESC NULLS LAST
      LIMIT $3
    `,
    values: [userId, listId, pageSize + 1],
  }
}

async function queryPage(client, query, pageSize) {
  const result = await client.query(query)
  if (result.rows.length > pageSize + 1) {
    throw new Error(
      `Cursor query returned more than limit + 1 rows (${result.rows.length})`
    )
  }
  const items = result.rows.slice(0, pageSize)
  const lastItem = items.at(-1)
  return {
    fetchedRows: result.rows.length,
    items,
    nextCursor:
      result.rows.length > pageSize && lastItem
        ? { createdAt: lastItem.created_at, id: lastItem.id }
        : null,
  }
}

async function explainQuery(client, query) {
  const result = await client.query({
    text: `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON, TIMING OFF) ${query.text}`,
    values: query.values,
  })
  const payload =
    result.rows[0]?.["QUERY PLAN"] ?? Object.values(result.rows[0] ?? {})[0]
  return extractPlanSummary(payload)
}

async function recordPlan(client, label, query, expectedIndex) {
  const summary = await explainQuery(client, query)
  if (!Number.isFinite(summary.executionTimeMs)) {
    throw new Error(`Query plan for ${label} did not report execution time`)
  }
  try {
    assertPlanUsesIndex(summary, expectedIndex)
  } catch (error) {
    throw new Error(
      `${label}: ${error instanceof Error ? error.message : String(error)}; nodes=${summary.nodeTypes.join(", ") || "none"}; sequential=${summary.sequentialScans.join(", ") || "none"}`
    )
  }
  return {
    expectedIndex,
    label,
    ...summary,
    passed: true,
  }
}

async function collectPages(
  client,
  queryFactory,
  pageSize,
  direction,
  expectedCount
) {
  const pages = []
  let cursor = null
  for (let pageNumber = 0; pageNumber < 200; pageNumber += 1) {
    const page = await queryPage(client, queryFactory(cursor), pageSize)
    pages.push(page.items)
    if (!page.nextCursor) {
      assertCursorSequence({
        pages,
        direction,
        expectedCount,
        createdAtField: "created_at",
      })
      return {
        pageCount: pages.length,
        pageSizes: pages.map((items) => items.length),
        totalItems: pages.flat().length,
      }
    }
    cursor = page.nextCursor
  }

  throw new Error("Cursor pagination did not terminate within 200 pages")
}

function median(values) {
  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle]
}

async function measureWarmQuery(client, query, sampleCount) {
  for (let index = 0; index < WARMUP_COUNT; index += 1) {
    await client.query(query)
  }

  const executionTimes = []
  for (let index = 0; index < sampleCount; index += 1) {
    const summary = await explainQuery(client, query)
    if (!Number.isFinite(summary.executionTimeMs)) {
      throw new Error(
        "Warm-query EXPLAIN ANALYZE did not report execution time"
      )
    }
    executionTimes.push(summary.executionTimeMs)
  }

  const minimum = Math.min(...executionTimes)
  const maximum = Math.max(...executionTimes)
  const result = {
    databaseExecutionTimeMs: {
      max: maximum,
      median: median(executionTimes),
      min: minimum,
      samples: executionTimes,
    },
    fetchedLimit: TASK_PAGE_SIZE + 1,
    pageSize: TASK_PAGE_SIZE,
    sampleCount,
    targetMs: WARM_TARGET_MS,
    targetPassed: maximum < WARM_TARGET_MS,
    warmupCount: WARMUP_COUNT,
  }

  if (!result.targetPassed) {
    throw new Error(
      `Warm 20-record database query exceeded ${WARM_TARGET_MS} ms (max ${maximum} ms)`
    )
  }

  return result
}

async function runPerformanceEvidence(config) {
  const pool = new Pool({
    connectionString: normalizeSslMode(config.databaseUrl),
    max: 1,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 20_000,
  })
  const client = await pool.connect()

  try {
    const identity = await getDatabaseIdentity(client)
    assertDatabaseIdentity(identity, config.expectedDatabase)
    await assertRequiredIndexes(client)

    const seed = await seedPerformanceData(client)
    const listFirstPage = await queryPage(
      client,
      listPageQuery(seed.primaryUserId, LIST_PAGE_SIZE, null),
      LIST_PAGE_SIZE
    )
    if (!listFirstPage.nextCursor) {
      throw new Error(
        "List first page did not produce a cursor for the next-page plan"
      )
    }
    const taskFirstPage = await queryPage(
      client,
      taskPageQuery(
        seed.primaryUserId,
        seed.primaryListId,
        TASK_PAGE_SIZE,
        true,
        null
      ),
      TASK_PAGE_SIZE
    )
    if (!taskFirstPage.nextCursor) {
      throw new Error(
        "Task first page did not produce a cursor for the next-page plan"
      )
    }
    const filteredTaskFirstPage = await queryPage(
      client,
      taskPageQuery(
        seed.primaryUserId,
        seed.primaryListId,
        TASK_PAGE_SIZE,
        false,
        null
      ),
      TASK_PAGE_SIZE
    )
    if (filteredTaskFirstPage.items.some((task) => task.status === "done")) {
      throw new Error("Completed-task filter returned a done task")
    }

    const plans = [
      await recordPlan(
        client,
        "lists:first-page",
        listPageQuery(seed.primaryUserId, LIST_PAGE_SIZE, null),
        EXPECTED_INDEXES.lists
      ),
      await recordPlan(
        client,
        "lists:next-page",
        listPageQuery(
          seed.primaryUserId,
          LIST_PAGE_SIZE,
          listFirstPage.nextCursor
        ),
        EXPECTED_INDEXES.lists
      ),
      await recordPlan(
        client,
        "tasks:first-page:include-completed",
        taskPageQuery(
          seed.primaryUserId,
          seed.primaryListId,
          TASK_PAGE_SIZE,
          true,
          null
        ),
        EXPECTED_INDEXES.tasks
      ),
      await recordPlan(
        client,
        "tasks:next-page:include-completed",
        taskPageQuery(
          seed.primaryUserId,
          seed.primaryListId,
          TASK_PAGE_SIZE,
          true,
          taskFirstPage.nextCursor
        ),
        EXPECTED_INDEXES.tasks
      ),
      await recordPlan(
        client,
        "tasks:first-page:hide-completed",
        taskPageQuery(
          seed.primaryUserId,
          seed.primaryListId,
          TASK_PAGE_SIZE,
          false,
          null
        ),
        EXPECTED_INDEXES.tasks
      ),
      await recordPlan(
        client,
        "tasks:next-page:hide-completed",
        taskPageQuery(
          seed.primaryUserId,
          seed.primaryListId,
          TASK_PAGE_SIZE,
          false,
          filteredTaskFirstPage.nextCursor
        ),
        EXPECTED_INDEXES.tasks
      ),
    ]

    const listCursorCheck = await collectPages(
      client,
      (cursor) => listPageQuery(seed.primaryUserId, MAX_PAGE_SIZE, cursor),
      MAX_PAGE_SIZE,
      "asc",
      seed.primaryListCount
    )
    const taskCursorCheck = await collectPages(
      client,
      (cursor) =>
        taskPageQuery(
          seed.primaryUserId,
          seed.primaryListId,
          MAX_PAGE_SIZE,
          true,
          cursor
        ),
      MAX_PAGE_SIZE,
      "desc",
      seed.primaryTaskCount
    )

    const privacyResult = await client.query(
      `
        SELECT
          (SELECT count(*) FROM lists WHERE user_id = $1 AND id = $2::uuid)::int AS primary_cannot_see_secondary_list,
          (SELECT count(*) FROM tasks WHERE user_id = $1 AND list_id = $2::uuid)::int AS primary_cannot_see_secondary_tasks
      `,
      [seed.primaryUserId, deterministicUuid("t16-performance:secondary-list")]
    )
    const privacy = privacyResult.rows[0]
    if (
      privacy.primary_cannot_see_secondary_list !== 0 ||
      privacy.primary_cannot_see_secondary_tasks !== 0
    ) {
      throw new Error("Synthetic owner-isolation check failed")
    }

    const warmQuery = taskPageQuery(
      seed.primaryUserId,
      seed.primaryListId,
      TASK_PAGE_SIZE,
      true,
      null
    )
    const warmQueryEvidence = await measureWarmQuery(
      client,
      warmQuery,
      config.warmSampleCount
    )

    return {
      contract: "TST-PERFORMANCE-001",
      generatedAt: new Date().toISOString(),
      measurementScope: {
        databaseExecution:
          "PostgreSQL EXPLAIN ANALYZE Execution Time after warmup",
        excluded: [
          "network latency",
          "authentication",
          "rendering",
          "CMS access",
          "Neon compute startup",
        ],
        connectionMode: "direct Neon connection",
      },
      plans,
      privacy: {
        primaryCannotSeeSecondaryList:
          privacy.primary_cannot_see_secondary_list === 0,
        primaryCannotSeeSecondaryTasks:
          privacy.primary_cannot_see_secondary_tasks === 0,
      },
      seed: {
        primaryListCount: seed.primaryListCount,
        primaryTaskCount: seed.primaryTaskCount,
        secondaryTaskCount: seed.secondaryTaskCount,
        scopedSyntheticUserIds: [PRIMARY_USER_ID, SECONDARY_USER_ID],
        listCounts: seed.listCounts,
        taskCounts: seed.taskCounts,
      },
      target: {
        branch: config.branchName,
        computeActiveAttested: true,
        database: identity.database,
        developmentHostGuardPassed: Boolean(config.target.host),
        serverVersion: identity.server_version,
        serverVersionNum: identity.server_version_num,
      },
      cursorChecks: {
        list: listCursorCheck,
        task: taskCursorCheck,
        pageSize: MAX_PAGE_SIZE,
      },
      warmQuery: warmQueryEvidence,
      reproducibility: {
        command: "pnpm neon:performance",
        seedReplacement: "exact synthetic user IDs with foreign-key cascade",
        rerunnable: true,
      },
      result: "passed",
      schemaVersion: 1,
    }
  } finally {
    client.release()
    await pool.end()
  }
}

function redactError(error) {
  const message = error instanceof Error ? error.message : String(error)
  return message.replace(
    /postgres(?:ql)?:\/\/[^\s]+/gi,
    "[redacted connection]"
  )
}

async function main() {
  const authoritativeDatabaseUrl = await getAuthoritativeDevelopmentUrl()
  const config = loadConfig(process.env, authoritativeDatabaseUrl)
  const evidencePath = resolveEvidencePath(config.evidencePath)
  const evidence = await runPerformanceEvidence(config)
  await mkdir(dirname(evidencePath), { recursive: true })
  await writeFile(
    evidencePath,
    `${JSON.stringify(evidence, null, 2)}\n`,
    config.allowEvidenceReplace ? "utf8" : { encoding: "utf8", flag: "wx" }
  )

  const relativeEvidencePath = relative(process.cwd(), evidencePath)
  console.log(
    `Neon performance evidence passed for the ${config.branchName} branch: ${relativeEvidencePath}`
  )
  console.log(
    `Seeded ${evidence.seed.primaryListCount} primary lists and ${evidence.seed.primaryTaskCount} primary tasks; warm-query max database execution was ${evidence.warmQuery.databaseExecutionTimeMs.max} ms.`
  )
}

main().catch((error) => {
  console.error(`Neon performance evidence failed: ${redactError(error)}`)
  process.exitCode = 1
})
