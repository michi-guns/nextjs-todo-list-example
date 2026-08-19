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

## Non-blocking implementation freedom

Dashboard chrome, empty-state copy, exact Sanity document type naming, and exact environment-variable names remain implementation details unless they change observable product behavior or require a new architectural decision.
