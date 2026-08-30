import { createHash } from "node:crypto"

const DIRECT_POSTGRES_PROTOCOLS = new Set(["postgres:", "postgresql:"])

export function assertDevelopmentTarget({
  databaseUrl,
  expectedHost,
  branchName,
}) {
  if (branchName !== "development") {
    throw new Error(
      `Neon performance evidence requires the development branch, received ${branchName || "no branch label"}`
    )
  }

  if (!expectedHost) {
    throw new Error("NEON_DEVELOPMENT_HOST is required for the branch guard")
  }

  let parsedUrl
  try {
    parsedUrl = new URL(databaseUrl)
  } catch {
    throw new Error("DATABASE_URL must be a valid PostgreSQL connection URL")
  }

  if (!DIRECT_POSTGRES_PROTOCOLS.has(parsedUrl.protocol)) {
    throw new Error("DATABASE_URL must use the PostgreSQL protocol")
  }

  const host = parsedUrl.hostname.toLowerCase()
  const normalizedExpectedHost = expectedHost.toLowerCase()
  if (host !== normalizedExpectedHost) {
    throw new Error(
      `DATABASE_URL host does not match the expected development host (${normalizedExpectedHost})`
    )
  }

  if (/-pooler(?:\.|$)/i.test(host)) {
    throw new Error(
      "The Neon performance script requires a direct connection, not a pooled host"
    )
  }

  return { branchName, host }
}

export function normalizeSslMode(databaseUrl) {
  const parsedUrl = new URL(databaseUrl)
  parsedUrl.searchParams.set("sslmode", "verify-full")
  return parsedUrl.toString()
}

export function deterministicUuid(seed) {
  const digest = createHash("sha256").update(seed).digest()
  digest[6] = (digest[6] & 0x0f) | 0x40
  digest[8] = (digest[8] & 0x3f) | 0x80
  const hex = digest.subarray(0, 16).toString("hex")
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-")
}

function parsePlanPayload(payload) {
  if (typeof payload === "string") {
    return JSON.parse(payload)
  }
  return payload
}

export function extractPlanSummary(payload) {
  const parsed = parsePlanPayload(payload)
  const envelope = Array.isArray(parsed) ? parsed[0] : parsed
  if (!envelope || typeof envelope !== "object") {
    throw new Error("EXPLAIN ANALYZE did not return a JSON plan")
  }

  const indexNames = new Set()
  const sequentialScans = []
  const nodeTypes = new Set()

  function visit(node) {
    if (!node || typeof node !== "object") {
      return
    }

    const nodeType = node["Node Type"]
    if (typeof nodeType === "string") {
      nodeTypes.add(nodeType)
      if (typeof node["Index Name"] === "string") {
        indexNames.add(node["Index Name"])
      }
      if (
        nodeType === "Seq Scan" &&
        typeof node["Relation Name"] === "string"
      ) {
        sequentialScans.push(node["Relation Name"])
      }
    }

    if (Array.isArray(node.Plans)) {
      node.Plans.forEach(visit)
    }
  }

  visit(envelope.Plan)

  return {
    executionTimeMs: Number(envelope["Execution Time"]),
    indexNames: [...indexNames],
    nodeTypes: [...nodeTypes],
    sequentialScans,
  }
}

export function assertPlanUsesIndex(summary, expectedIndex) {
  if (!summary.indexNames.includes(expectedIndex)) {
    throw new Error(
      `Expected query plan to use ${expectedIndex}; found ${summary.indexNames.join(", ") || "no index"}`
    )
  }

  const relevantSequentialScans = summary.sequentialScans.filter((relation) =>
    ["lists", "tasks"].includes(relation)
  )
  if (relevantSequentialScans.length > 0) {
    throw new Error(
      `Query plan contains a sequential scan of ${relevantSequentialScans.join(", ")}`
    )
  }
}

function comparableCreatedAt(value) {
  if (value instanceof Date) {
    return value.getTime()
  }

  if (typeof value === "number") {
    return value
  }

  const parsed = new Date(value).getTime()
  if (Number.isFinite(parsed)) {
    return parsed
  }

  throw new Error(
    `Cursor row has an invalid created_at value: ${String(value)}`
  )
}

export function assertCursorSequence({
  pages,
  direction,
  expectedCount,
  idField = "id",
  createdAtField = "createdAt",
}) {
  if (direction !== "asc" && direction !== "desc") {
    throw new Error(`Unsupported cursor direction: ${direction}`)
  }

  const rows = pages.flat()
  if (expectedCount !== undefined && rows.length !== expectedCount) {
    throw new Error(
      `Expected ${expectedCount} cursor rows, received ${rows.length}`
    )
  }

  const seenIds = new Set()
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index]
    const id = row[idField]
    if (typeof id !== "string" || id.length === 0) {
      throw new Error("Cursor row is missing a stable id")
    }
    if (seenIds.has(id)) {
      throw new Error(`Cursor pages contain a duplicate id: ${id}`)
    }
    seenIds.add(id)

    if (index === 0) {
      continue
    }

    const previous = rows[index - 1]
    const previousTime = comparableCreatedAt(previous[createdAtField])
    const currentTime = comparableCreatedAt(row[createdAtField])
    const timeComparison = currentTime - previousTime
    const idComparison =
      row[idField] > previous[idField]
        ? 1
        : row[idField] < previous[idField]
          ? -1
          : 0
    const comparison = timeComparison || idComparison
    const correctlyOrdered =
      direction === "asc" ? comparison > 0 : comparison < 0
    if (!correctlyOrdered) {
      throw new Error(
        `Cursor rows are out of order at position ${index} for ${direction} ordering`
      )
    }
  }
}
