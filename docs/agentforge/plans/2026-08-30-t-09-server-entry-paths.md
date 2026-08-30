# T-09 Server Actions and JSON Route Handlers implementation plan

> AgentForge plan. Use `task-breakdown` after this plan is accepted.

**Status:** Accepted

**Goal:** Expose the settled list and task application operations through authenticated, validated Server Actions and same-origin JSON Route Handlers with stable success and error contracts.

**Spec and decisions:** [Agent SPEC §1.1–1.4](../../.dwf/output/agent/SPEC.md#11-module-layers), [§7 HTTP / Action API contract](../../.dwf/output/agent/SPEC.md#7-http--action-api-contract), [§8 Validation](../../.dwf/output/agent/SPEC.md#8-validation-zod), and [§14.6 Presentation boundary](../../.dwf/output/agent/SPEC.md#146-presentation-boundary); [TD-003](../../.dwf/decisions/TECHNICAL.md#td-003), [TD-004](../../.dwf/decisions/TECHNICAL.md#td-004), [TD-008](../../.dwf/decisions/TECHNICAL.md#td-008), [TD-020](../../.dwf/decisions/TECHNICAL.md#td-020), and [TD-022](../../.dwf/decisions/TECHNICAL.md#td-022); [TST-AUTH-003](../../.dwf/decisions/TESTING.md#tst-auth-003) and [TST-BOUNDARY-001](../../.dwf/decisions/TESTING.md#tst-boundary-001).

**Architecture:** Keep the boundary logic in `src/modules/lists/presentation` and `src/modules/tasks/presentation`. Each capability owns its Zod input/query schemas, safe view-model mapping, JSON handler adapter, and action adapter. The adapters receive the authenticated-user function, application service, and revalidation callback as dependencies so request-level tests stay framework-independent and do not need a database. Thin `app/api/**/route.ts` wrappers compose the adapters with `requireUserForHeaders`, the existing Drizzle repositories/application factories, and `revalidatePath`. Thin `app/actions/*.ts` wrappers carry Next.js's file-level `use server` directive and compose the same presentation action adapters; they contain no business rules or direct table queries. Both entry paths therefore run authenticate → validate → application use case → safe map → revalidate/respond, while the application and repository layers remain unchanged.

**Global constraints:** Use the installed Next.js 16.3.1 request shape (`Request`, `Response`, and promised dynamic `params`) and the repository's existing Better Auth session helpers. Do not accept a client-provided owner ID, bearer token, API key, JWT, CORS access, or any other machine credential. Reuse the shared pagination parser and error-contract mapper. Validate resource IDs as UUIDs at the presentation boundary, list/task mutation payloads with capability-owned Zod schemas, and treat malformed JSON/query/path input as the canonical `invalid_input`/422 outcome. Return only safe capability view models (no `userId` or Better Auth records); serialize timestamps as ISO strings. Mutation responses use `{ deleted: true }` for deletes and call the future dashboard page revalidation hook after a successful application operation. No schema, migration, snapshot, dependency, UI, or authentication-provider changes are in scope.

## Current state and file map

- `src/modules/auth/presentation/current-user.ts` already exposes `requireUserForHeaders` for request adapters, while `requireUser` reads the current Next.js session for Server Actions.
- `src/modules/lists/application/list-use-cases.ts` and `src/modules/tasks/application/task-use-cases.ts` expose the settled owner-scoped operations; their repository ports and Drizzle implementations are complete and tested.
- `src/shared/pagination.ts` owns default/maximum limits and opaque-cursor query parsing. `src/shared/error-contract.ts` owns the canonical 401/404/409/422/500 status and non-leaking error envelope.
- `app/api/auth/[...all]/route.ts` and the Sanity route wrappers establish the repository's thin App Router composition style. No list/task routes or actions currently exist.
- Planned shared presentation support: a small serializable `ActionResult`/error-response helper (only if the two adapters need it), plus list/task-specific schemas and view-model mappers.
- Planned list presentation files: list schemas, list view models, list JSON adapter, list action adapter, and focused boundary tests.
- Planned task presentation files: task schemas/query parser, task view models, task JSON adapter, task action adapter, and focused boundary tests.
- Planned App Router composition files: `app/api/lists/route.ts`, `app/api/lists/[listId]/route.ts`, `app/api/lists/[listId]/tasks/route.ts`, `app/api/tasks/[taskId]/route.ts`, `app/actions/lists.ts`, and `app/actions/tasks.ts`.

## Dependencies and work order

1. Create the shared boundary result/response primitives only where duplication is demonstrated; define capability schemas and view-model mappers first so actions and routes consume one validation and serialization contract.
2. Implement and test list adapters, then compose the list collection/resource routes and list action exports.
3. Implement and test task adapters, then compose the task-list/task-resource routes and task action exports.
4. Run focused boundary tests before project-wide checks. Reconcile `TST-AUTH-003`, `TST-BOUNDARY-001`, and the T-09 TODO evidence only after the full gate passes.

The list and task adapters are conceptually parallel after the shared contract is settled, but the implementation will proceed in small vertical slices in one branch to keep the route/action contract and review surface coherent. T-10/T-11 UI work remains out of scope; the dashboard path used for revalidation is a future consumer and need not exist for this task.

## Verification strategy

- `TST-BOUNDARY-001`: request-level tests invoke the list/task adapters with Web `Request` objects and fakes, covering successful list/task reads and mutations, `{ items, nextCursor }` pagination shape, authenticated owner propagation, unauthenticated `401`, privacy-preserving `404`, duplicate `409`, malformed/invalid `422`, and canonical safe envelopes. Tests also verify the client cannot supply ownership identity.
- `TST-AUTH-003`: boundary tests prove anonymous requests are rejected through the existing session-facing helper contract and that an arbitrary bearer header or body `userId` never becomes authority. No alternate machine-authentication path is introduced.
- Server Action tests remain smaller than route coverage: authentication failure, shared schema rejection, successful safe view-model mapping/revalidation, and expected not-found/conflict mapping for both capabilities.
- Focused commands during implementation: `pnpm test -- src/modules/lists/presentation src/modules/tasks/presentation` (or the exact colocated files), `pnpm typecheck`, and `git diff --check`.
- Completion gates: `pnpm test`, `pnpm test:integration` (the T-14 harness-owned local PostgreSQL suite), `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm exec drizzle-kit check`, `pnpm exec drizzle-kit generate`, changed-file Prettier checks, and `git diff --check`. Route/action behavior is proven by adapter tests; no weaker mock replaces the existing persistence/harness evidence.
- Next.js runtime/browser verification is deferred to T-15 because there is no dashboard UI yet; the build/typecheck still compile every new App Router wrapper.

## Risks and assumptions

- The SPEC does not prescribe a concrete action input encoding. The adapters will accept serializable object payloads and the native `FormData` shape used by the repository's Server Action examples, normalizing both through the same Zod schemas; this keeps future native form usage possible without duplicating validation.
- The SPEC does not prescribe a delete status/body. `{ deleted: true }` is the smallest explicit success result and gives actions and JSON callers the same observable outcome.
- Revalidation targets the future `/dashboard` page via an injected callback. Keeping the callback in App Router composition avoids importing Next cache APIs into unit tests and permits T-10 to add the actual page without changing application contracts.
- UUID path validation is consistent with the settled native-UUID list/task schema. Fake repository tests can still use arbitrary IDs at the application layer; request-boundary fixtures use valid UUID lexemes.
- `mapApplicationError` is the only source of known error status/message mappings. Unknown errors and revalidation failures remain generic 500s; provider/database details never cross the response or action result.
- No unresolved DWF contradiction was found. Existing action examples use `FormData`, while the stable API table specifies JSON bodies; supporting both at the action adapter boundary preserves both settled consumers without changing the JSON contract.

## Handoff to task breakdown

Turn this plan into one fresh-review delivery task, T-09, with these independently verifiable slices: (a) shared boundary/action result primitives and list schemas/view models plus red list route/action tests, (b) list adapters and thin App Router composition, (c) task schemas/query parsing/view models plus red task route/action tests, (d) task adapters and thin App Router composition, and (e) full verification, TST ledger reconciliation, TODO/checkpoint evidence, and the required fresh GPT-5.6-Sol review loop. Preserve all explicit scope exclusions and the exact route/body/status contracts above.
