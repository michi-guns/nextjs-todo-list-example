# D-005 Contract — Lists and Tasks Use Cases

**Status:** normative  
**Decision:** [D-005](../DECISIONS.md#d-005--separate-lists-and-tasks-use-cases)

## Domain functions

Use plain functions and types. Domain functions never perform I/O.

```ts
export function normalizeListName(raw: string): string
// trims and rejects empty names; recommended maximum: 80 characters

export function normalizeTaskTitle(raw: string): string
// trims and rejects empty titles; recommended maximum: 200 characters

export function normalizeTaskNotes(
  raw: string | null | undefined
): string | null
// preserves null/empty policy chosen by the module; recommended maximum: 5000 characters

export function assertTaskStatus(value: string): TaskStatus
// accepts only todo, in_progress, or done
```

## Lists application API

`src/modules/lists/application/use-cases.ts` exports functions with explicit ownership input:

```ts
export async function ensureDefaultInbox(userId: UserId): Promise<List>

export async function listLists(userId: UserId): Promise<readonly List[]>

export async function createList(
  userId: UserId,
  input: { name: string }
): Promise<List>

export async function renameList(
  userId: UserId,
  listId: ListId,
  input: { name: string }
): Promise<List>

export async function deleteList(userId: UserId, listId: ListId): Promise<void>
```

Responsibilities:

- normalize and validate list names through domain rules
- pass the authenticated `userId` to every repository operation
- map a missing or foreign list to the selected privacy-preserving not-found error
- rely on the database foreign key for task cascade deletion
- call `ensureDefaultInbox` idempotently when the application requires a list for first use

## Tasks application API

`src/modules/tasks/application/use-cases.ts` exports:

```ts
export async function listTasks(
  userId: UserId,
  listId: ListId,
  options?: { includeCompleted?: boolean }
): Promise<readonly Task[]>

export async function createTask(
  userId: UserId,
  listId: ListId,
  input: { title: string; notes?: string | null }
): Promise<Task>

export async function updateTask(
  userId: UserId,
  taskId: TaskId,
  input: { title?: string; notes?: string | null; status?: TaskStatus }
): Promise<Task>

export async function deleteTask(userId: UserId, taskId: TaskId): Promise<void>
```

Responsibilities:

- default newly created tasks to `todo`
- normalize titles and notes and validate status
- enforce both task ownership and list ownership through the repository port
- preserve completed tasks; `includeCompleted: false` changes the query result only
- map absent/foreign records consistently to the project’s not-found policy

## Boundary error categories

The application layer may expose typed errors such as:

```ts
export type TodoErrorCode =
  | "LIST_NOT_FOUND"
  | "TASK_NOT_FOUND"
  | "INVALID_LIST_NAME"
  | "INVALID_TASK_TITLE"
  | "INVALID_TASK_STATUS"
```

Presentation maps these to the agreed JSON envelope or Server Action result. It must not expose Drizzle errors or SQL details.

## Ownership invariant

No use case accepts an owner id from a browser payload. The only owner id passed to these functions comes from `requireUser()` in server presentation code or from a trusted server-side application caller.
