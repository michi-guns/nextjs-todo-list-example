# Open Decisions

Tracked choices (`OD-*`). Entries with `OPEN` status remain unresolved and recommendations are not accepted decisions. Resolved entries stay here as decision history and point to the durable contract they updated.

<a id="od-001"></a>

## OD-001 — Completed-task query default

- **Status:** RESOLVED
- **Impact:** SPEC
- **Blocking:** NO
- **Related:** D-004, EC-003

### Problem / Conflict

The contract supports `includeCompleted: boolean` and the UI supports hiding completed tasks, so one consistent default was required.

### Accepted Constraints

Completed tasks remain stored. The implementation must use one default consistently.

### Decision Required

Choose the default value for `includeCompleted`.

### Resolution

`includeCompleted` defaults to `true`. An omitted value returns all stored tasks, and the initial UI shows completed tasks. Users may explicitly hide completed tasks without deleting them.

<a id="od-002"></a>

## OD-002 — Privacy error mapping

- **Status:** RESOLVED
- **Impact:** BOTH
- **Blocking:** NO
- **Related:** D-001, TD-004, TD-006, EC-004

### Problem / Conflict

The contract permitted either `403` or privacy-preserving `404` for another user's resource, so one consistent external policy was required.

### Accepted Constraints

Ownership checks are mandatory and must occur at private operation boundaries.

### Decision Required

Choose one not-found/forbidden mapping and apply it consistently across Server Actions and JSON handlers.

### Resolution

For private list and task resources, a missing resource and a resource owned by another user both produce the same application-level `not_found` outcome. JSON Route Handlers map it to `404` with error code `not_found`; Server Actions expose the equivalent generic not-found result. Unauthenticated requests remain `401`. Exact user-facing wording and internal logging remain implementation choices.

<a id="od-003"></a>

## OD-003 — Local magic-link test mechanism

- **Status:** RESOLVED
- **Impact:** SPEC
- **Blocking:** NO
- **Related:** D-002, TD-004, EC-009, OQ-001

### Problem / Conflict

Magic-link request/consume is required, so the local/test delivery mechanism needed to be selected.

### Accepted Constraints

The mechanism must be deterministic, local/test-safe, and must not require committed secrets.

### Decision Required

Choose a local mailer, test hook, or equivalent supported by the installed Better Auth version.

### Resolution

In explicitly enabled local/test mode, the Better Auth `sendMagicLink` callback writes the generated email address and verification URL to a temporary, gitignored, file-backed mailbox. Playwright clears the mailbox before the test, requests a link, reads the captured URL, and visits it to verify consumption. The mailbox must be unavailable outside local/test mode and must never be committed. Exact path, serialization format, helper names, and environment-variable names remain implementation choices. A production email provider is outside the local spike requirement.

<a id="od-004"></a>

## OD-004 — Exact API path spelling

- **Status:** RESOLVED
- **Impact:** SPEC
- **Blocking:** NO
- **Related:** D-006, TD-003, TD-008

### Problem / Conflict

The JSON API behavior was specified, but exact route spelling needed to become stable for consumers and verification.

### Accepted Constraints

Route handlers must share authentication, ownership, Zod validation, application use cases, and the `{ error: { code, message } }` error shape.

### Decision Required

Choose and document exact paths if an external consumer or implementation convention requires them.

### Resolution

Use `/api/auth/*` for Better Auth; `/api/lists` for listing and creating lists; `/api/lists/:listId` for renaming and deleting one list; `/api/lists/:listId/tasks` for listing and creating tasks in a list; and `/api/tasks/:taskId` for updating and deleting one task. Supported methods and payloads remain those in the Agent SPEC.

<a id="od-005"></a>

## OD-005 — Dedicated Sanity resource

- **Status:** RESOLVED
- **Impact:** BOTH
- **Blocking:** NO — provisioning remains an implementation prerequisite
- **Related:** D-005, TD-007, EC-007, OQ-002

### Problem / Conflict

No Sanity resource is currently configured, and this standalone public example should not depend on an unrelated project's editorial content.

### Accepted Constraints

Sanity owns landing editorial content only. Todo data never belongs there, and the landing adapter must validate and map external documents before exposing its view model.

### Decision Required

Choose whether this example receives an isolated Sanity resource and whether landing content is represented by one current document.

### Resolution

Provision a dedicated Sanity project and dataset for this repository. Store the established headline, blurb, primary CTA, and optional secondary CTA fields in one singleton landing document. Exact project ID, dataset name, document type name, document ID, and environment-variable names remain setup or implementation choices.

<a id="od-006"></a>

## OD-006 — Neon branch-first schema development

- **Status:** RESOLVED
- **Impact:** SPEC
- **Blocking:** NO — a development branch must be created before schema-changing implementation begins
- **Related:** D-003, D-004, TD-005, TD-006, OQ-003

### Problem / Conflict

The workspace is linked to Neon's default `main` branch, while the planned list/task schema requires new migrations that should be tested without changing the default branch first.

### Accepted Constraints

Drizzle migration files remain the versioned schema authority. Migration testing must not rely on ad hoc schema changes or put the default Neon branch at unnecessary risk.

### Decision Required

Choose where schema-changing development and migration verification occur before the default branch receives the migration.

### Resolution

Create a non-default Neon development branch from the current default branch before implementing the list/task schema. Generate, apply, and verify new Drizzle migrations on that development branch first. Apply the same reviewed migration to the default branch only after verification succeeds. Exact branch name, lifetime, and promotion command remain implementation or delivery choices.

<a id="od-007"></a>

## OD-007 — List name length

- **Status:** RESOLVED
- **Impact:** BOTH
- **Blocking:** NO
- **Related:** D-003, TD-008, EC-002

### Problem / Conflict

List names were required and non-empty after trimming, but their maximum accepted length was only a recommendation.

### Accepted Constraints

The same limit must be enforced consistently by application validation, Server Actions, and JSON Route Handlers.

### Decision Required

Choose the accepted list-name length range.

### Resolution

After trimming, a list name must contain between 1 and 80 characters inclusive.

<a id="od-008"></a>

## OD-008 — Task title length

- **Status:** RESOLVED
- **Impact:** BOTH
- **Blocking:** NO
- **Related:** D-004, TD-008, EC-002

### Problem / Conflict

Task titles were required and non-empty after trimming, but their maximum accepted length was only a recommendation.

### Accepted Constraints

The same limit must be enforced consistently by application validation, Server Actions, and JSON Route Handlers.

### Decision Required

Choose the accepted task-title length range.

### Resolution

After trimming, a task title must contain between 1 and 200 characters inclusive.

<a id="od-009"></a>

## OD-009 — Task notes length

- **Status:** RESOLVED
- **Impact:** BOTH
- **Blocking:** NO
- **Related:** D-004, TD-008, EC-010

### Problem / Conflict

Task notes were optional, but their maximum accepted length was only a recommendation.

### Accepted Constraints

Notes must remain optional, and the same maximum must be enforced consistently by application validation, Server Actions, and JSON Route Handlers.

### Decision Required

Choose the accepted maximum length for task notes.

### Resolution

Task notes are optional. When present, they must not exceed 5,000 characters.

<a id="od-010"></a>

## OD-010 — Task notes normalization

- **Status:** RESOLVED
- **Impact:** BOTH
- **Blocking:** NO
- **Related:** D-004, TD-008, EC-011

### Problem / Conflict

Task notes were optional, but the contract did not define whether surrounding whitespace and empty values should be preserved or normalized.

### Accepted Constraints

The application must represent absent notes consistently without preventing ordinary multiline text.

### Decision Required

Choose how task notes are normalized and cleared.

### Resolution

Trim leading and trailing whitespace from task notes. Normalize an omitted note during creation, an explicit `null`, an empty string, or a whitespace-only string to `null`. During an update, omitting the `notes` field leaves the existing value unchanged, while any explicit empty value clears it to `null`. Apply the 5,000-character limit after trimming.

<a id="od-011"></a>

## OD-011 — Task status transitions

- **Status:** RESOLVED
- **Impact:** BOTH
- **Blocking:** NO
- **Related:** D-004, EC-012

### Problem / Conflict

The three task statuses were settled, but the contract did not say whether transitions form a restricted workflow or whether repeated status updates are valid.

### Accepted Constraints

New tasks begin as `todo`, and only `todo`, `in_progress`, and `done` are valid statuses.

### Decision Required

Choose the allowed transitions among the settled task statuses.

### Resolution

After creation, a task may move directly from any valid status to any other valid status. No transition requires an intermediate status. Setting a task to its current status succeeds as an idempotent no-op. New tasks still always begin as `todo`.

<a id="od-012"></a>

## OD-012 — Default list and task ordering

- **Status:** RESOLVED
- **Impact:** BOTH
- **Blocking:** NO
- **Related:** D-003, D-004, TD-006, EC-013

### Problem / Conflict

List and task reads had no settled ordering, so the dashboard and JSON API could return the same records in different or unstable sequences.

### Accepted Constraints

The spike does not include manual reordering. All consumers of the same application read must receive the same deterministic order.

### Decision Required

Choose the default ordering for lists and tasks.

### Resolution

Order lists by `createdAt` ascending, oldest first. Order tasks by `createdAt` descending, newest first. Completed-task filtering preserves the relative order of the remaining tasks. Equal timestamps require a deterministic tie-breaker, but the exact tie-breaker and query implementation remain implementation choices. Manual reordering is outside this spike.

<a id="od-013"></a>

## OD-013 — Automatic Inbox lifecycle

- **Status:** RESOLVED
- **Impact:** BOTH
- **Blocking:** NO
- **Related:** D-003, TD-006, EC-001

### Problem / Conflict

The product created an automatic Inbox for a new user, but it did not clearly define whether that Inbox remained special or what happened if a user later deleted every list.

### Accepted Constraints

Users may rename and delete lists. A listless private workspace must remain usable, and automatic Inbox creation must stay atomic and idempotent.

### Decision Required

Choose the lifecycle of the automatic Inbox after it is created and the behavior when a user later has zero lists.

### Resolution

After creation, the automatic Inbox is an ordinary user-owned list and may be renamed or deleted. Whenever an authenticated private workspace loads and the user has zero lists, create exactly one new list named `Inbox`. Therefore, deleting the final list leaves the user listless only until the next private workspace load, which creates a new empty Inbox. Any existing list, regardless of its name, prevents automatic Inbox creation.

<a id="od-014"></a>

## OD-014 — List-name and task-title uniqueness

- **Status:** RESOLVED
- **Impact:** BOTH
- **Blocking:** NO
- **Related:** D-001, D-003, D-004, TD-005, TD-008, EC-014

### Problem / Conflict

The contract settled text validation but did not define whether two lists or tasks could share the same displayed name or title.

### Accepted Constraints

The product has no `Workspace` hierarchy entity. Lists belong directly to a user through `userId`, and tasks belong directly to a list through `listId`. Uniqueness must remain correct under concurrent writes.

### Decision Required

Choose the uniqueness scope, comparison behavior, and external conflict outcome for list names and task titles.

### Resolution

List names are unique per `userId`. Task titles are unique per `listId`, so the same title may appear in different lists but not twice in one list. Compare trimmed values case-insensitively while preserving the accepted display text. Enforce uniqueness at the database boundary for race safety and map conflicts to the application-level `conflict` outcome. JSON Route Handlers return `409` with error code `conflict`; Server Actions expose the equivalent conflict result. The exact Postgres/Drizzle mechanism for case-insensitive uniqueness remains an implementation choice.

<a id="od-015"></a>

## OD-015 — Cursor pagination mechanism

- **Status:** RESOLVED
- **Impact:** BOTH
- **Blocking:** NO
- **Related:** D-003, D-004, TD-006, TD-008, EC-015

### Problem / Conflict

List and task reads needed pagination, but the contract did not select a pagination model or define how pagination interacts with ownership and deterministic ordering.

### Accepted Constraints

Pagination must preserve the settled list and task ordering, remain stable while records are added or deleted, and never treat cursor data as ownership authority.

### Decision Required

Choose the pagination mechanism and application-facing page contract.

### Resolution

Use forward cursor pagination for list and task reads. A page contains `items` and an opaque `nextCursor`, which is `null` when no later page exists. The cursor represents the settled `createdAt` ordering plus the implementation-chosen deterministic tie-breaker. Ownership, list membership, and completed-task filters are applied independently of cursor data; a cursor never grants access or selects an owner. Malformed or context-incompatible cursors produce the standard invalid-input outcome. Exact cursor encoding, signing, and internal tie-breaker type remain implementation choices.

<a id="od-016"></a>

## OD-016 — Pagination limits and dashboard behavior

- **Status:** RESOLVED
- **Impact:** BOTH
- **Blocking:** NO
- **Related:** D-003, D-004, TD-008, EC-016

### Problem / Conflict

Cursor pagination was selected, but the page limits, response metadata, and visible dashboard interaction still needed a stable contract.

### Accepted Constraints

The spike must visibly demonstrate pagination without adding numbered-page navigation or requiring total-count queries.

### Decision Required

Choose the default and maximum page sizes and the dashboard interaction for additional pages.

### Resolution

List and task reads default to 20 records per page and accept an integer `limit` from 1 through 100. Responses contain only `items` and `nextCursor`; they do not include total counts or numbered-page metadata. The dashboard initially loads one page and shows `Load more` while `nextCursor` is non-null. Loading more appends the next items in the settled order. Changing the selected list or completed-task filter discards the current task pages and starts again from the first page. Exact control placement, loading indicator, and button copy capitalization remain implementation choices.

<a id="od-017"></a>

## OD-017 — Essential database index and constraint baseline

- **Status:** RESOLVED
- **Impact:** SPEC
- **Blocking:** NO
- **Related:** D-001, D-003, D-004, TD-005, TD-006, EC-014, EC-015, EC-017

### Problem / Conflict

The relational constraints and cursor behavior were settled, but the contract did not yet require the small set of database indexes needed to protect correctness under concurrency and support the main read paths.

### Accepted Constraints

Indexes must match real product queries. The design should cover the high-impact baseline without pre-optimizing unused search or filter behavior.

### Decision Required

Choose the database constraints and composite indexes that are required before performance tuning becomes evidence-driven.

### Resolution

Lists and tasks use primary keys. Tasks reference lists with a database foreign key and cascade deletion. Database-enforced case-insensitive unique keys protect list names within one `userId` and task titles within one `listId`. List cursor reads have a composite B-tree index beginning with `userId`, followed by `createdAt` and the chosen deterministic cursor tie-breaker. Task cursor reads have a composite B-tree index beginning with their equality scope (`userId`, then `listId`), followed by `createdAt` and the chosen deterministic cursor tie-breaker. Index direction must support the settled oldest-first list order and newest-first task order. The exact case-insensitive key mechanism, tie-breaker type, index names, and Drizzle syntax remain implementation choices. Do not add speculative status, notes, search, or partial indexes until measured query evidence justifies them.

## Non-blocking implementation freedom

Dashboard chrome, empty-state copy, exact Sanity document type naming, and exact environment-variable names remain implementation details unless they change observable product behavior or require a new architectural decision.
