# D-004 Example — Authenticated Mutation Flow

**Illustrative only.** The normative boundary is [D-004 auth session](../contracts/D-004-auth-session.md) and [D-007 presentation layout](../contracts/D-007-presentation-layout.md).

A list action should conceptually look like this:

```ts
"use server"

export async function createListAction(
  formData: FormData
): Promise<ActionResult<ListViewModel>> {
  const user = await requireUser()

  const input = createListSchema.parse({
    name: formData.get("name"),
  })

  try {
    const list = await createList(user.id, input)
    revalidatePath("/dashboard")
    return { ok: true, data: toListViewModel(list) }
  } catch (error) {
    return mapListErrorToActionResult(error)
  }
}
```

The important sequence is not the exact helper naming:

```text
session → Zod → use case(user.id, input) → view model → revalidate/result
```

A browser payload such as `{ userId: "someone-else" }` is either rejected by the schema or ignored because ownership comes from `requireUser()`.
