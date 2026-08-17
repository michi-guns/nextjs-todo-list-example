# Grill Session

## Protocol

- Ask one decision question at a time.
- Offer 2-4 reasonable options as a numbered list.
- Prefix the recommended option exactly with `(recommended):`.
- Record accepted decisions before asking the next question.
- Create normative contracts and illustrative examples when they reduce implementation ambiguity.

## User Preferences

- Prefer concrete file paths, file responsibilities, and TypeScript signatures over abstract architecture language.
- Reduce implementation ambiguity and guessing before source code is written.
- Keep the design pragmatic and explicit rather than speculative.

## Current Design Target

- Feature: implementation architecture for the Next.js Todo List Example spike
- Area: whole product architecture and module contracts
- Goal: define an implementation-ready file system, module boundaries, responsibilities, interfaces, schemas, flows, and build sequence

## Locked Decisions

### D-001: Whole-system dependency-ordered design

Decision: Design the entire spike as one connected architecture in dependency order. Establish shared rules and ownership first, then resolve auth and persistence, lists and tasks, landing/Sanity, presentation/API, and testing.

Why: This exposes cross-module ownership and dependency conflicts before implementation. It also lets each later contract build on earlier decisions instead of reconciling incompatible module designs afterward.

Scope: This decision governs the design sequence only; it does not add product scope or authorize application-source implementation during the grill.

Contract: Each accepted boundary decision must be recorded as a normative contract or an explicitly linked illustrative example when that reduces implementation ambiguity.

### D-002: Four capability modules

Decision: Use `auth`, `landing`, `lists`, and `tasks` as the first-class capability modules. Keep `src/shared/` small. Keep root `db/` and `src/sanity/` as explicit infrastructure seats rather than adding separate `data` or `content` business modules.

Why: These four modules match the product vocabulary and existing SPEC layout. They make ownership obvious without creating infrastructure-only indirection.

Scope: `auth` owns the application-facing session boundary; `landing` owns the landing view model and CMS read path; `lists` owns list behavior; `tasks` owns task behavior. The root database and Sanity seats provide adapters and clients, not new business concepts.

Contract: Business rules stay inside the owning module. Other modules consume application contracts, not database tables, raw Sanity documents, or framework-specific internals.

### D-003: Module-owned persistence ports

Decision: Define repository ports beside each owning module's domain/application code. Implement Drizzle adapters in that module's `infrastructure/`. Keep only the Drizzle client and shared Better Auth schema in root `db/`.

Why: This keeps domain and application tests independent of Next.js and Drizzle while making each module's persistence needs visible at its boundary.

Scope: Lists and tasks own their repository contracts. Auth owns its application-facing session boundary while Better Auth and its adapter tables remain infrastructure details. Root `db/` provides the client, schema seat, and migrations; it does not become a second business layer.

Contract: Domain/application code may depend on repository interfaces and domain DTOs. Infrastructure may depend on Drizzle. Presentation and `app/` may not import Drizzle tables or persistence row types directly.

### D-004: Small server-only authentication boundary

Decision: The `auth` module exposes server-only `getCurrentUser()` and `requireUser()` helpers returning an application session DTO. Better Auth instances, raw session records, and auth route wiring stay inside the auth module.

Why: Every private list/task read and write needs one consistent authentication boundary, while application code should not depend on Better Auth-specific record shapes.

Scope: `getCurrentUser()` may represent an anonymous request with `null`; `requireUser()` rejects an unauthenticated request. Authorization remains an application/use-case responsibility and cannot be replaced by middleware alone.

Contract: Pages, Server Actions, and Route Handlers consume the auth module boundary. They do not import Better Auth internals or trust a user id supplied by a client.

### D-005: Separate lists and tasks use cases

Decision: Keep lists and tasks as separate application capabilities with explicit `userId` input. Task operations verify list ownership through a narrow list-ownership port or equivalent repository contract, and application APIs return module DTOs rather than Drizzle rows.

Why: Ownership, default Inbox creation, list deletion, task/list membership, and task invariants remain independently testable while the cross-module relationship stays explicit.

Scope: Lists own list CRUD and default-list behavior. Tasks own task CRUD, status, notes, and completed-task filtering. Presentation coordinates use cases but does not implement their business rules.

Contract: Application entry points never accept an untrusted owner id from a client. They receive the authenticated user id from the server-side auth boundary and enforce ownership before reading or mutating data.

### D-006: Validated Sanity adapter with explicit failure

Decision: The `landing` module exposes a plain landing view model and repository port. Its Sanity client, GROQ query, payload validation, and mapper stay in `landing/infrastructure/`. Once the CMS read path is wired, a missing or invalid required document is an explicit integration failure rather than a permanent hardcoded fallback.

Why: Sanity remains an editorial adapter and its raw document shape cannot leak into application or UI code. Explicit failure makes configuration and publishing problems visible.

Scope: A temporary scaffold fallback may exist only while wiring the CMS and must be removed when the real read path works. The landing application path is read-only in this spike; webhooks, visual editing, and revalidation are out of scope.

Contract: Marketing routes consume the landing application/view-model API, never GROQ strings, Sanity clients, or raw CMS documents. Infrastructure validates and maps the CMS payload before returning application data.

### D-007: Composition-only app routes

Decision: Keep `app/` as the Next.js composition and framework-routing layer. Put Server Action functions, handler adapters, Zod input schemas, view models, and capability-owned UI under each module's `presentation/`. Keep generic shadcn primitives in `components/ui/`.

Why: This gives every capability one obvious presentation owner while keeping route files thin and preventing `components/` from becoming a second domain layer.

Scope: Next.js-required route files under `app/` may delegate immediately to module presentation adapters. The module owns validation, auth/use-case orchestration, error mapping, and view-model shaping; `app/` owns route composition, params, and framework metadata.

Contract: Server Actions and JSON Route Handlers share the same auth, Zod, and application-use-case path. No route or UI component imports Drizzle tables, raw Sanity documents, or core business rules.

### D-008: Layered contract verification

Decision: Verify domain invariants, application use cases with ports/fakes, Zod and authentication boundaries, non-trivial adapters, and the core Playwright journey. Do not require a full React component unit-test matrix for spike completion.

Why: This proves the high-risk contracts—ownership, validation, status transitions, default Inbox behavior, and integration mapping—without coupling every rule to a browser or live database.

Scope: The acceptance matrix must cover password sign-in or seeded sign-in, list creation, task creation, status change, sign-out, and the relevant negative boundary cases. The exact test files will be specified in the design artifacts.

Contract: Every normative contract created from this session must map to at least one deterministic test or explicit smoke scenario.

## Open Questions

None currently. Accepted decisions now need to be consolidated into normative contracts, illustrative examples, and the implementation-ready design specification.

## Rejected Options

None yet.

## Notes

- The canonical project docs already decide the product scope and broad stack.
- This workspace narrows those decisions into implementation-ready architecture.
- No application source files should change during this design session.
