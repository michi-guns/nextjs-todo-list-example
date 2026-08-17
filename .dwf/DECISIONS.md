# Accepted Design Rationale — Todo List Example

**Status:** accepted rationale
**Authority:** current behavior and technical requirements remain in [`PRD.md`](./PRD.md) and [`SPEC.md`](./SPEC.md).
**Architecture history:** accepted ADRs live under [`ADRs/`](./ADRs/).

This file preserves why important design choices were selected. It is not a second product or technical contract.

## D-001 — Whole-system dependency-ordered design

Design the spike as one connected system. Resolve shared ownership first, then persistence/auth, lists/tasks, landing/Sanity, presentation/API, and verification. This keeps cross-capability contracts coherent before implementation.

## D-002 — Four capability modules

Use four first-class capability modules:

- `auth` — application-facing authenticated-user/session boundary
- `landing` — landing view model and Sanity read path
- `lists` — list behavior and default Inbox behavior
- `tasks` — task behavior, status, notes, and list membership

Keep `src/shared/` small. Keep root `db/` and `src/sanity/` as infrastructure seats rather than additional business modules. The current module and dependency contract is in [`SPEC.md`](./SPEC.md#14-boundary-clarifications).

## D-003 — Module-owned persistence ports

Define repository ports beside the owning module's domain/application code and implement Drizzle adapters behind those ports. Root `db/` owns the client, schema, and migrations; it is not a central business-query layer. See [`SPEC.md`](./SPEC.md#14-boundary-clarifications).

## D-004 — Small server-only authentication boundary

Expose server-only `getCurrentUser()` and `requireUser()` helpers returning an application session DTO. Keep Better Auth instances, raw session records, and auth route wiring inside the auth boundary. See [`SPEC.md`](./SPEC.md#14-boundary-clarifications).

## D-005 — Separate lists and tasks use cases

Lists and tasks remain separate application capabilities. Use cases receive the authenticated `userId` from the server boundary, enforce ownership, and return application DTOs rather than Drizzle rows. Task persistence verifies list ownership through its repository boundary. See [`SPEC.md`](./SPEC.md#14-boundary-clarifications).

## D-006 — Validated Sanity adapter with explicit failure

The landing module exposes a plain view model and repository port. Sanity client/query/payload validation/mapping remain infrastructure details. A temporary fallback is allowed only while wiring; once the real read path works, missing or invalid required content is an explicit integration failure. See [`SPEC.md`](./SPEC.md#14-boundary-clarifications).

## D-007 — Composition-only app routes

`app/` owns Next.js routing and composition. Module presentation owns Server Actions, handler adapters, Zod input schemas, view models, and capability-owned UI. Generic shadcn primitives remain in `components/ui/`. See [`SPEC.md`](./SPEC.md#14-boundary-clarifications).

## D-008 — Layered contract verification

Verify domain invariants, application use cases with ports/fakes, Zod/auth boundaries, non-trivial adapters, and the core Playwright journey. A complete React component unit-test matrix is not required for the spike. See [`SPEC.md`](./SPEC.md#14-boundary-clarifications) and the testing strategy in [`docs/architecture/testing-strategy.md`](../docs/architecture/testing-strategy.md).

## Unsettled details

The completed-task default, privacy error mapping, local magic-link test mechanism, exact API path spelling, and integration configuration details remain visible in [`OPEN-DECISIONS.md`](./OPEN-DECISIONS.md) or [`OPEN-QUESTIONS.md`](./OPEN-QUESTIONS.md). They must not be treated as accepted rationale until resolved.
