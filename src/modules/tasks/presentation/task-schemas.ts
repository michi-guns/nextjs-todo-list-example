import { z } from "zod"

export const taskIdSchema = z.string().uuid()
export const listIdSchema = z.string().uuid()
export const taskStatusSchema = z.enum(["todo", "in_progress", "done"])

const taskTextFields = {
  title: z.string().trim().min(1).max(200),
  notes: z.string().trim().max(5_000).nullable().optional(),
} as const

export const createTaskBodySchema = z.object(taskTextFields)
export const createTaskInputSchema = createTaskBodySchema.extend({
  listId: listIdSchema,
})

const taskPatchFields = {
  title: z.string().trim().min(1).max(200).optional(),
  notes: z.string().trim().max(5_000).nullable().optional(),
  status: taskStatusSchema.optional(),
} as const

export const taskPatchSchema = z
  .object(taskPatchFields)
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one task field is required",
  })

export const updateTaskInputSchema = z
  .object({ taskId: taskIdSchema, ...taskPatchFields })
  .refine((value) => Object.keys(value).some((key) => key !== "taskId"), {
    message: "At least one task field is required",
  })

export const deleteTaskInputSchema = z.object({
  taskId: taskIdSchema,
})

export type CreateTaskBody = z.infer<typeof createTaskBodySchema>
export type CreateTaskInput = z.infer<typeof createTaskInputSchema>
export type TaskPatchInput = z.infer<typeof taskPatchSchema>
export type UpdateTaskInput = z.infer<typeof updateTaskInputSchema>
export type DeleteTaskInput = z.infer<typeof deleteTaskInputSchema>
