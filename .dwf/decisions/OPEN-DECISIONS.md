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

- **Status:** OPEN
- **Impact:** BOTH
- **Blocking:** NO
- **Related:** D-001, TD-004, TD-006, EC-004

### Problem / Conflict

The contract permits `403` or privacy-preserving `404` for another user's resource.

### Accepted Constraints

Ownership checks are mandatory and must occur at private operation boundaries. The current recommendation is `404` so resource existence is not disclosed.

### Decision Required

Choose one not-found/forbidden mapping and apply it consistently across Server Actions and JSON handlers.

### Resolution

Pending.

<a id="od-003"></a>

## OD-003 — Local magic-link test mechanism

- **Status:** OPEN
- **Impact:** SPEC
- **Blocking:** YES for deterministic local verification
- **Related:** D-002, TD-004, EC-009, OQ-001

### Problem / Conflict

Magic-link request/consume is required, but the local mail/test delivery mechanism is not selected.

### Accepted Constraints

The mechanism must be deterministic, local/test-safe, and must not require committed secrets.

### Decision Required

Choose a local mailer, test hook, or equivalent supported by the installed Better Auth version.

### Resolution

Pending.

<a id="od-004"></a>

## OD-004 — Exact API path spelling

- **Status:** OPEN
- **Impact:** SPEC
- **Blocking:** NO
- **Related:** D-006, TD-003, TD-008

### Problem / Conflict

The JSON API behavior is specified, but exact route spelling remains implementation freedom until a consumer requires stable paths.

### Accepted Constraints

Route handlers must share authentication, ownership, Zod validation, application use cases, and the `{ error: { code, message } }` error shape.

### Decision Required

Choose and document exact paths if an external consumer or implementation convention requires them.

### Resolution

Pending.

## Non-blocking implementation freedom

Dashboard chrome, empty-state copy, exact Sanity document type naming, and exact environment-variable names remain implementation details unless they change observable product behavior or require a new architectural decision.
