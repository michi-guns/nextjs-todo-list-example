import { InvalidTaskPageRequestError } from "../domain/task-errors"

export interface TaskCursorPosition {
  readonly userId: string
  readonly listId: string
  readonly includeCompleted: boolean
  readonly createdAt: Date
  readonly id: string
}

const CURSOR_VERSION = 1
const MAX_CURSOR_LENGTH = 2_048
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function invalidCursor(message = "Invalid task cursor"): never {
  throw new InvalidTaskPageRequestError(message)
}

function getScope(position: {
  userId: string
  listId: string
  includeCompleted: boolean
}) {
  return `tasks:${position.userId}:${position.listId}:${position.includeCompleted ? "all" : "active"}`
}

export function encodeTaskCursor(position: TaskCursorPosition): string {
  if (
    !position.userId ||
    !uuidPattern.test(position.listId) ||
    !uuidPattern.test(position.id) ||
    typeof position.includeCompleted !== "boolean" ||
    Number.isNaN(position.createdAt.getTime())
  ) {
    return invalidCursor()
  }

  return Buffer.from(
    JSON.stringify({
      version: CURSOR_VERSION,
      scope: getScope(position),
      createdAt: position.createdAt.toISOString(),
      id: position.id,
    }),
    "utf8"
  ).toString("base64url")
}

export function decodeTaskCursor(
  cursor: string,
  userId: string,
  listId: string,
  includeCompleted: boolean
): TaskCursorPosition {
  if (
    typeof cursor !== "string" ||
    cursor.length === 0 ||
    cursor.length > MAX_CURSOR_LENGTH ||
    !/^[A-Za-z0-9_-]+$/.test(cursor)
  ) {
    return invalidCursor()
  }

  let payload: unknown
  try {
    payload = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"))
  } catch {
    return invalidCursor()
  }

  if (
    typeof payload !== "object" ||
    payload === null ||
    Array.isArray(payload)
  ) {
    return invalidCursor()
  }

  const record = payload as Record<string, unknown>
  if (
    record.version !== CURSOR_VERSION ||
    record.scope !== getScope({ userId, listId, includeCompleted }) ||
    typeof record.createdAt !== "string" ||
    typeof record.id !== "string" ||
    !uuidPattern.test(listId) ||
    !uuidPattern.test(record.id)
  ) {
    return invalidCursor()
  }

  const createdAt = new Date(record.createdAt)
  if (Number.isNaN(createdAt.getTime())) {
    return invalidCursor()
  }

  return { userId, listId, includeCompleted, createdAt, id: record.id }
}
