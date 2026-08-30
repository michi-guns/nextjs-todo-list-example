import { z } from "zod"

export const listIdSchema = z.string().uuid()

export const createListInputSchema = z.object({
  name: z.string().trim().min(1).max(80),
})

export const renameListInputSchema = z.object({
  listId: listIdSchema,
  name: z.string().trim().min(1).max(80),
})

export const deleteListInputSchema = z.object({
  listId: listIdSchema,
})

export type CreateListInput = z.infer<typeof createListInputSchema>
export type RenameListInput = z.infer<typeof renameListInputSchema>
export type DeleteListInput = z.infer<typeof deleteListInputSchema>
