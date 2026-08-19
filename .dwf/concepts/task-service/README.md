# AS-003 — Task Service

**Concept kind:** Architectural Subsystem

**Architectural Subsystem:** AS-003

**Derived explanation.** This Concept explains the task capability already established by [`D-004`](../../decisions/PRODUCT.md#d-004), [`TD-002`](../../decisions/TECHNICAL.md#td-002), [`TD-005`](../../decisions/TECHNICAL.md#td-005), [`TD-006`](../../decisions/TECHNICAL.md#td-006), and the [Agent SPEC task application boundary](../../output/agent/SPEC.md#144-lists-and-tasks-application-boundary). It does not create product or technical truth.

## Quick reload

- This is the application's component for the lifecycle of tasks inside user-owned lists.
- It lists, creates, updates, deletes, and changes the status of tasks.
- It supports including or excluding completed tasks from reads without deleting them.
- Its persistence queries enforce both task ownership and task/list membership.
- Presentation code consumes task operations without coordinating Drizzle tables or queries.

## Identity

The Task Service is the application's single architectural component for task lifecycle behavior. It gives task presentation adapters a stable application-facing interface while keeping task persistence, ownership enforcement, and list-membership checks behind that interface.

## Boundary

The subsystem owns task operations inside a user-owned list. It receives the trusted authenticated user ID from the Authentication Service boundary and ensures task reads and mutations remain scoped to that owner and to valid list membership.

Its semantic operations are equivalent to:

```ts
listTasks(userId, listId, options): Promise<Page<Task>>
createTask(userId, listId, input): Promise<Task>
updateTask(userId, taskId, input): Promise<Task>
deleteTask(userId, taskId): Promise<void>
```

The concrete function names, input types, result types, and file grouping remain implementation choices. The user-scoped behavior, list-membership enforcement, and task lifecycle are the settled boundary.

## Responsibilities

- List tasks inside a list owned by the authenticated user.
- Create tasks in a list owned by the authenticated user.
- Edit and delete tasks owned by the authenticated user.
- Change task status among `todo`, `in_progress`, and `done`.
- Keep completed tasks stored while supporting their inclusion or exclusion from reads.
- Own the repository contracts required by task application operations.
- Enforce task ownership and task/list membership in persistence queries rather than relying on presentation filtering.
- Keep Drizzle row types and persistence outcomes behind application-facing task contracts.

## Non-responsibilities

- Resolving sessions or deciding whether a request is authenticated.
- Accepting a browser-provided user ID as ownership authority.
- Creating, renaming, deleting, or automatically provisioning lists.
- Owning task UI, Server Action behavior, HTTP paths, redirects, or JSON response mapping.
- Selecting the exact Drizzle schema layout, query syntax, or source-file structure.

## Dependencies

- A trusted user ID obtained through the Authentication Service.
- The task domain and application contracts owned by the task capability.
- User-owned list identity accepted through a task operation and verified at the persistence boundary.
- PostgreSQL/Neon and Drizzle through the Task Service's infrastructure adapter.

## Known consumers

- Dashboard task-panel composition.
- Task Server Actions.
- Private task JSON Route Handlers.
- Status controls and completed-task visibility controls through their presentation adapters.

Consumers provide trusted ownership identity and application inputs. They do not read task tables directly or receive Drizzle row types.

## Important invariants

- Every task read and mutation is scoped to the authenticated user ID.
- A task belongs to exactly one user-owned list.
- Creating a task requires a list owned by the authenticated user.
- One user cannot read or mutate another user's tasks.
- A task title contains 1–200 characters after trimming.
- Task titles are unique within one list under case-insensitive comparison and may repeat in different lists.
- Task notes are trimmed and optional, empty notes normalize to `null`, and non-empty notes contain at most 5,000 characters after trimming.
- New tasks begin with status `todo`.
- Task status is one of `todo`, `in_progress`, or `done`.
- Any valid status may transition directly to any other valid status; reapplying the current status is an idempotent no-op.
- Task reads are deterministic and ordered by creation time, newest first.
- Task reads use forward cursor pagination and return items plus an opaque next cursor.
- Task pages default to 20 records and accept at most 100; no total count or numbered-page metadata is returned.
- Hiding completed tasks changes the read result, not stored task state.
- When completed-task visibility is omitted, reads include completed tasks.
- Task persistence types do not cross into presentation or other capability contracts.

## Verification

The subsystem can be verified independently of completed task presentation:

- Task creation succeeds only inside a list owned by the authenticated user.
- Task list, update, status-change, and delete operations affect only the authenticated owner's rows.
- Attempts to use another user's list or task produce the same `not_found` outcome as a nonexistent resource.
- Task creation and title updates reject titles outside the settled 1–200 character range after trimming.
- Task creation and title updates return `conflict` when that list already contains the same case-insensitive trimmed title, including under concurrent writes.
- Task creation and notes updates reject notes longer than 5,000 characters.
- Empty notes normalize to `null`; omitting notes from an update leaves existing notes unchanged.
- New tasks receive status `todo`.
- Status changes accept direct transitions between all settled task statuses, treat the current status as a successful no-op, and reject values outside the settled statuses.
- Task reads return newest-created tasks first and remain deterministic when timestamps match.
- Pagination remains scoped to the authenticated owner, selected list, and completed-task filter; cursor data never overrides that context.
- Dashboard consumers can append another page while a next cursor exists; changing the selected list or completed-task filter starts again from the first page.
- Explicit completed-task filtering includes or excludes stored `done` tasks as requested.
- Completed-task filtering preserves the relative order of remaining tasks.
- Omitting completed-task visibility includes stored `done` tasks.
- Application-facing task results do not expose Drizzle row types.

## Implementation freedom

The implementation agent may choose:

- Functions, objects, or equivalent internal composition; the architectural name does not require a class named `TaskService`.
- Exact application DTOs, repository-port names, and internal error types.
- Exact files and folder grouping within the task capability.
- Drizzle query composition, provided ownership and list-membership requirements hold.
- Test doubles and the split between unit and adapter integration tests.
- Presentation adapters and error mapping consistent with the separately settled presentation decisions.

## Canonical references

- [`D-001 — Personal authenticated area`](../../decisions/PRODUCT.md#d-001)
- [`D-004 — Task lifecycle and statuses`](../../decisions/PRODUCT.md#d-004)
- [`TD-002 — Four capability modules and explicit infrastructure seats`](../../decisions/TECHNICAL.md#td-002)
- [`TD-003 — Layered dependency direction and composition-only routes`](../../decisions/TECHNICAL.md#td-003)
- [`TD-005 — PostgreSQL/Neon with Drizzle owns transactional truth`](../../decisions/TECHNICAL.md#td-005)
- [`TD-006 — Module-owned repository ports and ownership-aware adapters`](../../decisions/TECHNICAL.md#td-006)
- [`TD-008 — Zod and shared mutation paths at untrusted boundaries`](../../decisions/TECHNICAL.md#td-008)
- [`RULE-006 — Validate and isolate untrusted boundaries`](../../RULES.md#rule-006)
- [Open decisions](../../decisions/OPEN-DECISIONS.md)
- [Agent SPEC — Lists and tasks application boundary](../../output/agent/SPEC.md#144-lists-and-tasks-application-boundary)
