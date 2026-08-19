# AS-002 — List Service

**Concept kind:** Architectural Subsystem

**Architectural Subsystem:** AS-002

**Derived explanation.** This Concept explains the list capability already established by [`D-003`](../../decisions/PRODUCT.md#d-003), [`TD-002`](../../decisions/TECHNICAL.md#td-002), [`TD-005`](../../decisions/TECHNICAL.md#td-005), [`TD-006`](../../decisions/TECHNICAL.md#td-006), and the [Agent SPEC list application boundary](../../output/agent/SPEC.md#144-lists-and-tasks-application-boundary). It does not create product or technical truth.

## Quick reload

- This is the application's component for the lifecycle of a user's lists.
- It creates the default Inbox whenever a private workspace loads with no lists and keeps that operation atomic and idempotent.
- It lists, creates, renames, and deletes user-owned lists.
- Its persistence queries enforce ownership, and list deletion uses the database cascade contract for tasks.
- Presentation code consumes list operations without coordinating Drizzle tables or queries.

## Identity

The List Service is the application's single architectural component for list lifecycle behavior. It gives listless-workspace flows and list presentation adapters a stable application-facing interface while keeping list persistence and ownership enforcement behind that interface.

## Boundary

The subsystem owns default-Inbox creation and the user-scoped list lifecycle. It receives the trusted authenticated user ID from the Authentication Service boundary and ensures every list operation and persistence query remains scoped to that owner.

Its semantic operations are equivalent to:

```ts
ensureDefaultInbox(userId): Promise<List>
listLists(userId, page): Promise<Page<List>>
createList(userId, input): Promise<List>
renameList(userId, listId, input): Promise<List>
deleteList(userId, listId): Promise<void>
```

The concrete function names, input types, result types, and file grouping remain implementation choices. The user-scoped behavior and list lifecycle are the settled boundary.

## Responsibilities

- Create one list named `Inbox` whenever an authenticated private workspace loads and the user has no lists.
- Keep default-Inbox creation atomic under concurrent listless workspace loads and idempotent after success.
- Treat the automatic Inbox as an ordinary list after creation, allowing it to be renamed or deleted.
- List, create, rename, and delete lists for the authenticated owner.
- Own the repository contracts required by list application operations.
- Enforce list ownership in persistence queries rather than relying on presentation filtering.
- Delete a list through the established database cascade contract so its tasks are removed with it.
- Keep Drizzle row types and persistence outcomes behind application-facing list contracts.

## Non-responsibilities

- Resolving sessions or deciding whether a request is authenticated.
- Accepting a browser-provided user ID as ownership authority.
- Creating, editing, changing the status of, or individually deleting tasks.
- Owning list UI, Server Action behavior, HTTP paths, redirects, or JSON response mapping.
- Selecting the exact Drizzle schema layout, query syntax, transaction mechanism, or source-file structure.

## Dependencies

- A trusted user ID obtained through the Authentication Service.
- The list domain and application contracts owned by the list capability.
- PostgreSQL/Neon and Drizzle through the List Service's infrastructure adapter.
- The database-level list-to-task cascade contract.

## Known consumers

- The authenticated private-workspace flow that needs a default Inbox when the user has no lists.
- Dashboard and navigation composition that display the user's lists.
- List Server Actions.
- Private list JSON Route Handlers.
- Task-creation presentation flows that need the user's available lists or selected list.

Consumers provide trusted ownership identity and application inputs. They do not read list tables directly or receive Drizzle row types.

## Important invariants

- Every list read and mutation is scoped to the authenticated user ID.
- List names are trimmed and contain 1–80 characters.
- List names are unique per authenticated user under case-insensitive comparison; there is no `Workspace` ownership entity.
- List reads are deterministic and ordered by creation time, oldest first.
- List reads use forward cursor pagination and return items plus an opaque next cursor.
- List pages default to 20 records and accept at most 100; no total count or numbered-page metadata is returned.
- The list cursor query is backed by a composite B-tree index matching authenticated user scope, settled order, and deterministic tie-breaking.
- A list page reads at most one row beyond its limit, projects only application-required fields, and does not trigger one follow-up query per returned list.
- A user with zero lists receives exactly one automatic Inbox, including under concurrent private workspace loads and after final-list deletion.
- An existing list of any name prevents automatic Inbox creation.
- The automatic Inbox may be renamed or deleted like any other list.
- One user cannot read, rename, or delete another user's list.
- Deleting a list removes all tasks in that list through the database cascade contract.
- List persistence types do not cross into presentation or other capability contracts.

## Verification

The subsystem can be verified independently of completed task presentation:

- A user with no lists receives one Inbox.
- Repeated or concurrent default-Inbox requests do not create duplicates.
- A user who already has any list does not receive an automatic Inbox.
- Renaming or deleting the automatic Inbox follows the same behavior as any other owned list; deleting the final list leads to a new Inbox on the next private workspace load.
- List create, list, rename, and delete operations affect only the authenticated owner's rows.
- List creation and rename reject names outside the accepted 1–80 character range after trimming.
- List creation and rename return `conflict` when the authenticated user already owns the same case-insensitive trimmed name, including under concurrent writes.
- List reads return oldest-created lists first and remain deterministic when timestamps match.
- Pagination returns no duplicate or skipped records merely because earlier rows were inserted or deleted; cursor data never overrides authenticated ownership.
- Representative query-plan evidence confirms that paginated list reads use the intended composite index.
- On the representative Neon seed, warm 20-record list queries satisfy the agreed database-execution target without a full table scan.
- Page reads return no more than the requested limit and derive the next cursor from at most one extra row, without a total-count query.
- Dashboard consumers can append another page while a next cursor exists.
- Attempts to operate on another user's list produce the same `not_found` outcome as a nonexistent list.
- Deleting a list removes its tasks at the database boundary.
- Application-facing list results do not expose Drizzle row types.

## Implementation freedom

The implementation agent may choose:

- Functions, objects, or equivalent internal composition; the architectural name does not require a class named `ListService`.
- Exact application DTOs, repository-port names, and internal error types.
- Exact files and folder grouping within the list capability.
- Drizzle query composition and transaction or conflict-handling strategy, provided ownership and atomic-Inbox requirements hold.
- Exact index names, normalized uniqueness representation, and deterministic cursor tie-breaker.
- Test doubles and the split between unit and adapter integration tests.
- Presentation adapters and error mapping consistent with the separately settled presentation decisions.

## Canonical references

- [`D-001 — Personal authenticated area`](../../decisions/PRODUCT.md#d-001)
- [`D-003 — Default Inbox and list lifecycle`](../../decisions/PRODUCT.md#d-003)
- [`TD-002 — Four capability modules and explicit infrastructure seats`](../../decisions/TECHNICAL.md#td-002)
- [`TD-003 — Layered dependency direction and composition-only routes`](../../decisions/TECHNICAL.md#td-003)
- [`TD-005 — PostgreSQL/Neon with Drizzle owns transactional truth`](../../decisions/TECHNICAL.md#td-005)
- [`TD-006 — Module-owned repository ports and ownership-aware adapters`](../../decisions/TECHNICAL.md#td-006)
- [`TD-008 — Zod and shared mutation paths at untrusted boundaries`](../../decisions/TECHNICAL.md#td-008)
- [`TD-010 — Query-shaped PostgreSQL index baseline`](../../decisions/TECHNICAL.md#td-010)
- [`TD-011 — Bounded queries and environment-appropriate connections`](../../decisions/TECHNICAL.md#td-011)
- [`TD-012 — Representative query-plan and warm-query evidence`](../../decisions/TECHNICAL.md#td-012)
- [`RULE-006 — Validate and isolate untrusted boundaries`](../../RULES.md#rule-006)
- [Agent SPEC — Lists and tasks application boundary](../../output/agent/SPEC.md#144-lists-and-tasks-application-boundary)
