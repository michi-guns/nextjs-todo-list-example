# D-007 Contract — Presentation and API Layout

**Status:** normative  
**Decision:** [D-007](../DECISIONS.md#d-007--composition-only-app-routes)

## File ownership

`app/` owns framework composition:

- route groups and page entry points
- dynamic route parameters
- route metadata and redirects
- thin `route.ts` delegates required by Next.js

Module `presentation/` owns:

- Server Actions
- JSON handler adapters
- Zod input schemas
- DTO/view-model mapping
- capability-owned React components
- expected error-to-action/HTTP translation

`components/ui/` owns generic shadcn primitives only.

## Server Action contract

Actions authenticate first, validate second, call an application use case third, and then revalidate/redirect or return an action result.

```ts
export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } }

export async function createListAction(
  formData: FormData
): Promise<ActionResult<ListViewModel>>

export async function renameListAction(
  formData: FormData
): Promise<ActionResult<ListViewModel>>

export async function deleteListAction(
  formData: FormData
): Promise<ActionResult<null>>

export async function createTaskAction(
  formData: FormData
): Promise<ActionResult<TaskViewModel>>

export async function updateTaskAction(
  formData: FormData
): Promise<ActionResult<TaskViewModel>>

export async function deleteTaskAction(
  formData: FormData
): Promise<ActionResult<null>>
```

The exact `FormData` field names are defined by the module Zod schemas and must not be inferred separately by each component.

## JSON handler contract

Route files remain thin delegates:

```ts
// app/api/lists/route.ts
export { GET, POST } from "@/src/modules/lists/presentation/handlers"
```

The module handler functions receive standard Web `Request` data and return standard `Response` objects:

```ts
export async function GET(request: Request): Promise<Response>
export async function POST(request: Request): Promise<Response>
export async function PATCH(request: Request): Promise<Response>
export async function DELETE(request: Request): Promise<Response>
```

Dynamic resource routes pass the route id to a module handler through the route adapter; the handler still obtains the owner from `requireUser()`.

## JSON envelope

Success responses contain the module view model or collection. Expected failures use:

```json
{ "error": { "code": "LIST_NOT_FOUND", "message": "List not found" } }
```

Minimum status mapping:

- `401` unauthenticated
- `404` absent or foreign resource under the privacy policy
- `422` invalid Zod/domain input
- `500` unexpected integration failure without internal details

## Boundary sequence

```text
request/formData
  → requireUser()
  → module Zod schema.parse(...)
  → application use case(user.id, parsed input)
  → module DTO/view-model mapper
  → action result or JSON response
```

No action, route handler, page, or UI component imports `db/schema/*`, a Drizzle row type, a Sanity client, or a raw CMS document.
