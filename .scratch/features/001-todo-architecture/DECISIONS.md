# Accepted Architecture Decisions — Todo List Example

**Status:** accepted design decisions  
**Feature:** `todo-architecture`  
**Source ledger:** [`GRILL_SESSION.md`](./GRILL_SESSION.md)

These decisions refine, but do not replace, the canonical product and technical decisions in [`docs/product/PRD.md`](../../../docs/product/PRD.md), [`docs/product/SPEC.md`](../../../docs/product/SPEC.md), and ADR-0001 through ADR-0003.

## D-001 — Whole-system dependency-ordered design

Design the entire spike as one connected architecture. Resolve shared rules and ownership first, then persistence/auth, lists/tasks, landing/Sanity, presentation/API, and testing.

## D-002 — Four capability modules

Use four first-class capability modules:

- `auth` — application-facing authenticated-user/session boundary
- `landing` — landing view model and Sanity read path
- `lists` — list behavior and default Inbox behavior
- `tasks` — task behavior, status, notes, and list membership

Keep `src/shared/` tiny. Keep root `db/` and `src/sanity/` as explicit infrastructure seats, not additional business modules.

See [D-002 module boundaries](contracts/D-002-module-boundaries.md).

## D-003 — Module-owned persistence ports

Define repository ports beside the owning module's domain/application code. Implement Drizzle adapters in that module's `infrastructure/`. Root `db/` owns the Drizzle client, schema seat, and migrations; it is not a central business-query layer.

See [D-003 persistence ports](contracts/D-003-persistence-ports.md).

## D-004 — Small server-only authentication boundary

Expose server-only `getCurrentUser()` and `requireUser()` helpers returning an application session DTO. Keep Better Auth instances, raw session records, and auth route wiring inside `auth`.

See [D-004 auth session](contracts/D-004-auth-session.md) and [the auth flow example](examples/D-004-auth-flow.md).

## D-005 — Separate lists and tasks use cases

Lists and tasks remain separate application capabilities. Use cases receive the authenticated `userId` from the server boundary, enforce ownership, and return module DTOs rather than Drizzle rows. Task persistence verifies list ownership through a narrow repository contract/query boundary.

See [D-005 lists and tasks](contracts/D-005-lists-tasks.md) and [the task flow example](examples/D-005-task-create-flow.md).

## D-006 — Validated Sanity adapter with explicit failure

The landing module exposes a plain view model and repository port. Sanity client/query/payload validation/mapping remain in `landing/infrastructure/`. A temporary scaffold fallback may exist only while wiring; after that, missing or invalid required CMS content is an explicit integration failure.

See [D-006 landing and Sanity](contracts/D-006-landing-sanity.md) and [the mapping example](examples/D-006-sanity-mapping.md).

## D-007 — Composition-only app routes

`app/` owns Next.js routing and composition. Module `presentation/` owns Server Actions, handler adapters, Zod input schemas, view models, and capability-owned UI. Generic shadcn primitives remain in `components/ui/`.

See [D-007 presentation layout](contracts/D-007-presentation-layout.md).

## D-008 — Layered contract verification

Verify domain invariants, application use cases with ports/fakes, Zod/auth boundaries, non-trivial adapters, and the core Playwright journey. A complete React component unit-test matrix is not required for the spike.

See [D-008 acceptance matrix](contracts/D-008-acceptance.md).

## Inherited implementation defaults

These defaults come from the canonical SPEC recommendations and remain easy to amend during implementation review:

- `includeCompleted` defaults to `true`; the UI toggle hides completed tasks.
- Other users' resources use privacy-preserving `404` behavior.
- JSON errors use `{ error: { code, message } }`.
- Domain/application code uses plain TypeScript types and functions; classes are not required unless a concrete adapter or error type benefits from one.
- Exact environment variable names are documented when integrations are wired.
