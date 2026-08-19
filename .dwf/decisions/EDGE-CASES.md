# Edge Cases

Durable explicitly considered scenarios (`EC-*`). Edge Cases point to the owning Product/Technical Decision or generated contract; they do not override those owners.

<a id="ec-001"></a>

## EC-001 — First authenticated use with no lists

- **Status:** HANDLED
- **Product decisions:** D-003
- **Technical decisions:** TD-005, TD-006

The user has no lists when private access begins. The system creates exactly one `Inbox`, atomically and idempotently, rather than returning an empty unusable workspace or creating duplicates under concurrent requests.

<a id="ec-002"></a>

## EC-002 — Blank or whitespace-only names

- **Status:** HANDLED
- **Product decisions:** D-003, D-004
- **Technical decisions:** TD-008

List names and task titles are trimmed and must remain non-empty after trimming. Server-side Zod/application validation rejects invalid input; client-only validation is insufficient.

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

- **Status:** OPEN
- **Product decisions:** D-002
- **Related open question:** OQ-001
- **Related open decision:** OD-003

The installed Better Auth version supports a `sendMagicLink` callback that receives the generated verification URL. The product still requires selection of the deterministic local capture or delivery mechanism tracked by OD-003.
