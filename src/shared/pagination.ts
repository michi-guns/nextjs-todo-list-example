import { z } from "zod"

export const DEFAULT_PAGE_LIMIT = 20
export const MAX_PAGE_LIMIT = 100

export interface PageRequest {
  readonly cursor?: string
  readonly limit?: number
}

export interface Page<T> {
  readonly items: readonly T[]
  readonly nextCursor: string | null
}

const nonBlankCursor = z
  .string()
  .refine((cursor) => cursor.trim().length > 0, "Cursor must not be blank")

export const paginationQuerySchema = z.object({
  cursor: nonBlankCursor.optional(),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_PAGE_LIMIT)
    .default(DEFAULT_PAGE_LIMIT),
})

export type ParsedPaginationQuery = z.output<typeof paginationQuerySchema>

export class InvalidPaginationError extends Error {
  readonly code = "invalid_input" as const

  constructor(message = "Invalid pagination request") {
    super(message)
    this.name = "InvalidPaginationError"
  }
}

export interface PaginationSearchParams {
  get(name: string): string | null
  getAll?(name: string): readonly string[]
}

function readSingleParameter(
  searchParams: PaginationSearchParams,
  name: "cursor" | "limit"
) {
  const values = searchParams.getAll?.(name)
  if (values && values.length > 1) {
    throw new InvalidPaginationError(`Pagination parameter ${name} is repeated`)
  }
  return values?.[0] ?? searchParams.get(name) ?? undefined
}

export function parsePaginationQuery(
  searchParams: PaginationSearchParams
): ParsedPaginationQuery {
  const parsed = paginationQuerySchema.safeParse({
    cursor: readSingleParameter(searchParams, "cursor"),
    limit: readSingleParameter(searchParams, "limit"),
  })

  if (!parsed.success) {
    throw new InvalidPaginationError()
  }

  return parsed.data
}
