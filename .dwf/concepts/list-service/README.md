# AS-002 — List Service

**Concept kind:** Architectural Subsystem

**Architectural Subsystem:** AS-002

**Derived explanation.** This Concept explains the list capability already established by [`D-003`](../../decisions/PRODUCT.md#d-003), [`TD-002`](../../decisions/TECHNICAL.md#td-002), [`TD-005`](../../decisions/TECHNICAL.md#td-005), [`TD-006`](../../decisions/TECHNICAL.md#td-006), and the [Agent SPEC list application boundary](../../output/agent/SPEC.md#144-lists-and-tasks-application-boundary). It does not create product or technical truth.

## Quick reload

- This is the application's component for the lifecycle of a user's lists.
- It creates the default Inbox on first authenticated use and keeps that operation atomic and idempotent.
- It lists, creates, renames, and deletes user-owned lists.
- Its persistence queries enforce ownership, and list deletion uses the database cascade contract for tasks.
- Presentation code consumes list operations without coordinating Drizzle tables or queries.

## Identity

The List Service is the application's single architectural component for list lifecycle behavior. It gives first-use flows and list presentation adapters a stable application-facing interface while keeping list persistence and ownership enforcement behind that interface.

## Boundary

The subsystem owns default-Inbox creation and the user-scoped list lifecycle. It receives the trusted authenticated user ID from the Authentication Service boundary and ensures every list operation and persistence query remains scoped to that owner.

Its semantic operations are equivalent to:

```ts
ensureDefaultInbox(userId): Promise<List>
listLists(userId): Promise<readonly List[]>
createList(userId, input): Promise<List>
renameList(userId, listId, input): Promise<List>
deleteList(userId, listId): Promise<void>
```

The concrete function names, input types, result types, and file grouping remain implementation choices. The user-scoped behavior and list lifecycle are the settled boundary.

## Responsibilities

- Create one list named `Inbox` when an authenticated user has no lists.
- Keep default-Inbox creation atomic under concurrent first-use requests and idempotent after success.
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

- The authenticated first-use flow that needs a default Inbox.
- Dashboard and navigation composition that display the user's lists.
- List Server Actions.
- Private list JSON Route Handlers.
- Task-creation presentation flows that need the user's available lists or selected list.

Consumers provide trusted ownership identity and application inputs. They do not read list tables directly or receive Drizzle row types.

## Important invariants

- Every list read and mutation is scoped to the authenticated user ID.
- A user with zero lists receives exactly one automatic Inbox, including under concurrent first use.
- An existing list of any name prevents automatic Inbox creation.
- One user cannot read, rename, or delete another user's list.
- Deleting a list removes all tasks in that list through the database cascade contract.
- List persistence types do not cross into presentation or other capability contracts.

## Verification

The subsystem can be verified independently of completed task presentation:

- A user with no lists receives one Inbox.
- Repeated or concurrent default-Inbox requests do not create duplicates.
- A user who already has any list does not receive an automatic Inbox.
- List create, list, rename, and delete operations affect only the authenticated owner's rows.
- Attempts to operate on another user's list produce the same `not_found` outcome as a nonexistent list.
- Deleting a list removes its tasks at the database boundary.
- Application-facing list results do not expose Drizzle row types.

## Implementation freedom

The implementation agent may choose:

- Functions, objects, or equivalent internal composition; the architectural name does not require a class named `ListService`.
- Exact application DTOs, repository-port names, and internal error types.
- Exact files and folder grouping within the list capability.
- Drizzle query composition and transaction or conflict-handling strategy, provided ownership and atomic-Inbox requirements hold.
- Test doubles and the split between unit and adapter integration tests.
- Presentation adapters and error mapping consistent with the separately settled presentation decisions.

## Canonical references

- [`D-001 — Personal authenticated workspace`](../../decisions/PRODUCT.md#d-001)
- [`D-003 — Default Inbox and list lifecycle`](../../decisions/PRODUCT.md#d-003)
- [`TD-002 — Four capability modules and explicit infrastructure seats`](../../decisions/TECHNICAL.md#td-002)
- [`TD-003 — Layered dependency direction and composition-only routes`](../../decisions/TECHNICAL.md#td-003)
- [`TD-005 — PostgreSQL/Neon with Drizzle owns transactional truth`](../../decisions/TECHNICAL.md#td-005)
- [`TD-006 — Module-owned repository ports and ownership-aware adapters`](../../decisions/TECHNICAL.md#td-006)
- [`TD-008 — Zod and shared mutation paths at untrusted boundaries`](../../decisions/TECHNICAL.md#td-008)
- [`RULE-006 — Validate and isolate untrusted boundaries`](../../RULES.md#rule-006)
- [Agent SPEC — Lists and tasks application boundary](../../output/agent/SPEC.md#144-lists-and-tasks-application-boundary)
