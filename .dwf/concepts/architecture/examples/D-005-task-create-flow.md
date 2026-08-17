# D-005 Example — Task Creation and Ownership

**Illustrative only.** The normative boundary is [`../../../SPEC.md#14-boundary-clarifications`](../../../SPEC.md#14-boundary-clarifications).

```ts
export async function createTaskAction(
  formData: FormData
): Promise<ActionResult<TaskViewModel>> {
  const user = await requireUser()

  const input = createTaskSchema.parse({
    listId: formData.get("listId"),
    title: formData.get("title"),
    notes: formData.get("notes"),
  })

  const task = await createTask(user.id, input.listId, {
    title: input.title,
    notes: input.notes,
  })

  revalidatePath(`/dashboard?list=${input.listId}`)
  return { ok: true, data: toTaskViewModel(task) }
}
```

The task use case does not call a list UI component or receive an owner id from the form. The task repository must make the list-ownership check part of its persistence boundary:

```text
user.id + listId
  → task repository verifies owned list
  → insert task with same userId
  → return Task DTO
```

A task belonging to another user is treated as not found under the privacy policy, not as a successful insert or an exposed authorization error.
