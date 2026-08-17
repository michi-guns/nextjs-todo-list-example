# D-003 Contract — Persistence Ports

**Status:** normative  
**Decision:** [D-003](../DECISIONS.md#d-003--module-owned-persistence-ports)

## Shared value types

These are module/application types, not Drizzle row types:

```ts
export type UserId = string
export type ListId = string
export type TaskId = string

export type TaskStatus = "todo" | "in_progress" | "done"

export interface List {
  id: ListId
  userId: UserId
  name: string
  createdAt: Date
  updatedAt: Date
}

export interface Task {
  id: TaskId
  listId: ListId
  userId: UserId
  title: string
  notes: string | null
  status: TaskStatus
  createdAt: Date
  updatedAt: Date
}
```

## Lists application port

`src/modules/lists/application/ports.ts` owns the interface. The implementation belongs in `lists/infrastructure/`.

```ts
export interface ListRepository {
  listByUser(userId: UserId): Promise<readonly List[]>
  findByIdForUser(userId: UserId, listId: ListId): Promise<List | null>
  ensureDefaultInbox(userId: UserId, now: Date): Promise<List>
  insert(input: NewList): Promise<List>
  rename(
    userId: UserId,
    listId: ListId,
    name: string,
    now: Date
  ): Promise<List | null>
  delete(userId: UserId, listId: ListId): Promise<boolean>
}

export interface NewList {
  id: ListId
  userId: UserId
  name: string
  now: Date
}
```

`ensureDefaultInbox` is one repository operation, not a check-then-insert split across application code. The adapter must implement the no-duplicate behavior atomically under concurrent first requests.

## Tasks application port

`src/modules/tasks/application/ports.ts` owns the interface. The implementation belongs in `tasks/infrastructure/`.

```ts
export interface TaskRepository {
  listByOwnedList(
    userId: UserId,
    listId: ListId,
    options: { includeCompleted: boolean }
  ): Promise<readonly Task[]>

  insert(input: NewTask): Promise<Task | "list_not_found">

  findByIdForUser(userId: UserId, taskId: TaskId): Promise<Task | null>

  updateForUser(
    userId: UserId,
    taskId: TaskId,
    patch: TaskPatch,
    now: Date
  ): Promise<Task | null>

  deleteForUser(userId: UserId, taskId: TaskId): Promise<boolean>
}

export interface NewTask {
  id: TaskId
  userId: UserId
  listId: ListId
  title: string
  notes: string | null
  status: TaskStatus
  now: Date
}

export interface TaskPatch {
  title?: string
  notes?: string | null
  status?: TaskStatus
}
```

The task adapter must verify both `tasks.user_id = userId` and ownership of the referenced list. A missing or foreign list is represented as `"list_not_found"`; the application layer maps it to the project’s chosen not-found policy.

## Adapter rules

- Drizzle table/row types stay inside `infrastructure/`.
- Repository methods return module types or explicit domain/application outcomes.
- `db/queries/` is not a central business API.
- Migrations enforce foreign keys, timestamps, and task-to-list cascade deletion.
- Repository adapters are replaceable in application tests with in-memory fakes implementing the same interfaces.
