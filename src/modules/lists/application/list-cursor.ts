import { InvalidPageRequestError } from "../domain/list-errors"

export interface ListCursorPosition {
  readonly userId: string
  readonly createdAt: Date
  readonly id: string
}

const CURSOR_VERSION = 1
const MAX_CURSOR_LENGTH = 2_048
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function invalidCursor(message = "Invalid list cursor"): never {
  throw new InvalidPageRequestError(message)
}

export function encodeListCursor(position: ListCursorPosition): string {
  if (
    !position.userId ||
    !uuidPattern.test(position.id) ||
    Number.isNaN(position.createdAt.getTime())
  ) {
    return invalidCursor()
  }

  return Buffer.from(
    JSON.stringify({
      version: CURSOR_VERSION,
      scope: `lists:${position.userId}`,
      createdAt: position.createdAt.toISOString(),
      id: position.id,
    }),
    "utf8"
  ).toString("base64url")
}

export function decodeListCursor(
  cursor: string,
  userId: string
): ListCursorPosition {
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
    record.scope !== `lists:${userId}` ||
    typeof record.createdAt !== "string" ||
    typeof record.id !== "string" ||
    !uuidPattern.test(record.id)
  ) {
    return invalidCursor()
  }

  const createdAt = new Date(record.createdAt)
  if (Number.isNaN(createdAt.getTime())) {
    return invalidCursor()
  }

  return { userId, createdAt, id: record.id }
}
