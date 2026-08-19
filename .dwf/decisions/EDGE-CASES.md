# Edge Cases

Durable explicitly considered scenarios (`EC-*`). Edge Cases point to the owning Product/Technical Decision or generated contract; they do not override those owners.

<a id="ec-001"></a>

## EC-001 — Private workspace load with no lists

- **Status:** HANDLED
- **Product decisions:** D-003
- **Technical decisions:** TD-005, TD-006
- **Resolved by:** OD-013

The user has no lists when a private workspace load begins, either because the account is new or because the final list was deleted. The system creates exactly one new empty `Inbox`, atomically and idempotently, rather than returning an unusable workspace or creating duplicates under concurrent requests. The Inbox has no protected identity after creation and may be renamed or deleted like any other list. Any existing list prevents automatic Inbox creation.

<a id="ec-002"></a>

## EC-002 — Blank or whitespace-only names

- **Status:** HANDLED
- **Product decisions:** D-003, D-004
- **Technical decisions:** TD-008
- **Resolved by:** OD-007 for list-name length; OD-008 for task-title length

List names and task titles are trimmed and must remain non-empty after trimming. List names must not exceed 80 characters, and task titles must not exceed 200 characters. Server-side Zod/application validation rejects invalid input; client-only validation is insufficient.

<a id="ec-003"></a>

## EC-003 — Completed task visibility

- **Status:** HANDLED
- **Product decisions:** D-004
- **Resolved by:** OD-001

Completed tasks remain stored and are included by default. An omitted `includeCompleted` value behaves as `true`, and the initial UI shows completed tasks. Users may explicitly hide them without changing stored task state.

<a id="ec-004"></a>

## EC-004 — Another user's list or task identifier

- **Status:** HANDLED
- **Product decisions:** D-001
- **Technical decisions:** TD-004, TD-006, TD-008
- **Resolved by:** OD-002

A signed-in user presents an identifier owned by another user. Ownership is checked at the application and persistence boundaries. The operation returns the same `not_found` outcome used for a nonexistent resource; JSON callers receive `404` with code `not_found`, and Server Actions expose the equivalent generic result.

<a id="ec-005"></a>

## EC-005 — List deletion with tasks

- **Status:** HANDLED
- **Product decisions:** D-003, D-004
- **Technical decisions:** TD-005, TD-006

Deleting an owned list hard-deletes its tasks through the relational cascade contract. The product does not use soft deletion for this spike.

<a id="ec-006"></a>

## EC-006 — Task/list ownership mismatch

- **Status:** HANDLED
- **Product decisions:** D-001, D-004
- **Technical decisions:** TD-004, TD-006

A task creation or update references a list that is not owned by the authenticated user, or a task is read through a different user's list. The operation cannot succeed; repository/application ownership checks prevent cross-user access or insertion.

<a id="ec-007"></a>

## EC-007 — Sanity unavailable or invalid

- **Status:** HANDLED
- **Product decisions:** D-005
- **Technical decisions:** TD-007

The landing provider returns unavailable, malformed, or incomplete content. The adapter validates and maps external data; once the real path is wired, required-content failure is explicit rather than silently becoming permanent hardcoded copy.

<a id="ec-008"></a>

## EC-008 — Anonymous private-data request

- **Status:** HANDLED
- **Product decisions:** D-001, D-002
- **Technical decisions:** TD-004, TD-008

An anonymous browser or JSON caller requests private lists/tasks. The boundary requires a session before reading or mutating private data; middleware redirects may improve UX but do not replace operation-level authorization.

<a id="ec-009"></a>

## EC-009 — Magic-link local/test delivery

- **Status:** HANDLED
- **Product decisions:** D-002
- **Answered by:** OQ-001
- **Resolved by:** OD-003

The installed Better Auth version supports a `sendMagicLink` callback that receives the generated verification URL. In explicitly enabled local/test mode, that callback writes the email and URL to a temporary, gitignored, file-backed mailbox. Tests clear and read the mailbox deterministically; it is unavailable outside local/test mode.

<a id="ec-010"></a>

## EC-010 — Oversized task notes

- **Status:** HANDLED
- **Product decisions:** D-004
- **Technical decisions:** TD-008
- **Resolved by:** OD-009

Task notes remain optional. When notes are present and exceed 5,000 characters, server-side Zod/application validation rejects the input; client-only validation is insufficient.

<a id="ec-011"></a>

## EC-011 — Empty or cleared task notes

- **Status:** HANDLED
- **Product decisions:** D-004
- **Technical decisions:** TD-008
- **Resolved by:** OD-010

Task notes are trimmed. On creation, omitted, `null`, empty, and whitespace-only notes become `null`. On update, an omitted `notes` field leaves the current notes unchanged, while an explicit `null`, empty, or whitespace-only value clears them to `null`. The 5,000-character limit is evaluated after trimming.

<a id="ec-012"></a>

## EC-012 — Repeated or direct task status changes

- **Status:** HANDLED
- **Product decisions:** D-004
- **Resolved by:** OD-011

A task may move directly between any two valid statuses without an intermediate step. Applying its current status again succeeds as an idempotent no-op rather than producing a transition error.

<a id="ec-013"></a>

## EC-013 — Equal timestamps and filtered task order

- **Status:** HANDLED
- **Product decisions:** D-003, D-004
- **Technical decisions:** TD-006
- **Resolved by:** OD-012

List and task reads remain deterministic when records share a `createdAt` value by applying an implementation-chosen stable tie-breaker. Hiding completed tasks removes matching tasks without changing the relative order of the remaining tasks.

<a id="ec-014"></a>

## EC-014 — Duplicate list names and task titles

- **Status:** HANDLED
- **Product decisions:** D-003, D-004
- **Technical decisions:** TD-005, TD-008, TD-010
- **Resolved by:** OD-014

Creating or renaming a list conflicts when the same user already owns a list with the same trimmed name under case-insensitive comparison. Creating or retitling a task conflicts when the same list already contains the same trimmed title under case-insensitive comparison; the same title remains valid in a different list. Database constraints prevent concurrent duplicates. JSON callers receive `409` with code `conflict`, and Server Actions expose the equivalent conflict result.

<a id="ec-015"></a>

## EC-015 — Malformed or cross-context cursor

- **Status:** HANDLED
- **Product decisions:** D-001, D-003, D-004
- **Technical decisions:** TD-006, TD-008
- **Resolved by:** OD-015

A malformed cursor or one incompatible with the current read context produces the standard invalid-input outcome; JSON callers receive `422`. Cursor contents never supply `userId`, authorize access, bypass list ownership, or override the selected completed-task filter. The authenticated scope and filters are applied independently on every page request.

<a id="ec-016"></a>

## EC-016 — Pagination limit and context changes

- **Status:** HANDLED
- **Product decisions:** D-003, D-004
- **Technical decisions:** TD-008
- **Resolved by:** OD-016

An omitted page limit behaves as 20. A non-integer limit or one outside 1–100 is invalid input; JSON callers receive `422`. A `null` next cursor ends the sequence and hides the dashboard's additional-page control. Changing the selected list or completed-task filter discards loaded task pages and starts a fresh first-page read so cursors are not reused across contexts.

<a id="ec-017"></a>

## EC-017 — Index drift from real query shape

- **Status:** HANDLED
- **Product decisions:** D-003, D-004
- **Technical decisions:** TD-010
- **Resolved by:** OD-017

Cursor queries must keep their authenticated equality scope and cursor ordering aligned with the required composite indexes. A query or schema change that breaks that alignment requires renewed query-plan evidence. Additional indexes are not added merely in anticipation of possible status filters, notes lookup, or search features.

<a id="ec-018"></a>

## EC-018 — Hidden unbounded database work

- **Status:** HANDLED
- **Product decisions:** D-003, D-004
- **Technical decisions:** TD-011
- **Resolved by:** OD-018

A page request must not load an unbounded result merely to slice it in application code, run a count query only to determine whether another cursor page exists, create a database client per request, or issue one follow-up query per returned list/task. The query reads at most one extra row, projects only required fields, and derives `nextCursor` without a total count.

<a id="ec-019"></a>

## EC-019 — Misleading performance measurement

- **Status:** HANDLED
- **Product decisions:** D-003, D-004
- **Technical decisions:** TD-012
- **Resolved by:** OD-019

The lightweight query target is measured only after Neon compute is active and relevant data is warm. It covers database execution for the paginated query, not network latency, authentication, rendering, CMS access, or compute startup. A single fast timing does not replace query-plan inspection, cross-user seed data, or cursor-correctness checks.

<a id="ec-020"></a>

## EC-020 — Docker unavailable or integration state leaks

- **Status:** HANDLED
- **Product decisions:** D-006
- **Technical decisions:** TD-013
- **Resolved by:** OD-020

When Docker is unavailable, database integration tests report the missing prerequisite and fail rather than passing through a silent skip; database-free unit tests remain usable. An integration test must not depend on rows left by an earlier test, and failure cleanup must still stop the suite-owned container. The exact state-isolation and process-cleanup helpers remain implementation choices.

<a id="ec-021"></a>

## EC-021 — Test cleanup targets an external database

- **Status:** HANDLED
- **Product decisions:** D-006
- **Technical decisions:** TD-014
- **Resolved by:** OD-021

Routine integration and Playwright reset or cleanup logic accepts only the connection supplied by its own local Testcontainers harness. It refuses Neon and other external database URLs before truncating, dropping, or resetting data. Neon verification uses its own non-destructive or explicitly scoped migration/performance commands and is not reached by ordinary test cleanup.

<a id="ec-022"></a>

## EC-022 — Vercel suspends a function with idle database clients

- **Status:** HANDLED
- **Product decisions:** D-001, D-002, D-003, D-004
- **Technical decisions:** TD-011, TD-015
- **Resolved by:** OD-022

The application creates one bounded `pg.Pool` at module scope rather than one pool per request. On Vercel, the pool is registered with `attachDatabasePool` so Fluid Compute can reuse connections during warm invocations and close idle clients before suspending the function instance. Application connections still target Neon's pooled endpoint; migration commands do not use the application pool.
