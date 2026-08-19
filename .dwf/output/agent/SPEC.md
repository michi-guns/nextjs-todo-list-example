# Technical Specification — Next.js Todo List Example

**Status:** generated Agent technical projection
**Authority:** [`../../RULES.md`](../../RULES.md), [`../../CONTEXT.md`](../../CONTEXT.md), [`../../decisions/PRODUCT.md`](../../decisions/PRODUCT.md), [`../../decisions/TECHNICAL.md`](../../decisions/TECHNICAL.md), [`../../decisions/EDGE-CASES.md`](../../decisions/EDGE-CASES.md), and [`PRD.md`](./PRD.md)
**Companion:** [`PRD.md`](./PRD.md) (generated product projection)
**Stack orientation:** See the supporting [technology stack](../../../docs/architecture/stack.md).

This projection is generated from the durable DWF Workspace. It is subordinate to the Agent PRD and does not own technical-decision rationale.

This document is the implementation contract. If code disagrees with it, either update the code or deliberately amend the owning Workspace state and regenerate projections.

---

## 1. Repository layout (target bowl)

Follow a domain-centered modular monolith. Application modules live under
`src/`; the existing root `db/` and `migrations/` seats are the canonical
database locations.

```text
.
├── app/                          # Next.js routes (composition only)
│   ├── (marketing)/              # public landing
│   ├── (auth)/                   # sign-in, sign-up, magic link
│   ├── (app)/                    # authenticated dashboard shell
│   └── api/                      # JSON Route Handlers (+ Better Auth handler routes as required)
├── components/                   # shadcn/ui and generic UI chrome
├── e2e/                          # Playwright tests
├── .dwf/                         # canonical product/technical design authority
├── db/                           # Drizzle client and schema
├── migrations/                   # generated/applied Drizzle migrations
├── src/
│   ├── sanity/                   # Sanity config, schemas, server client (when added)
│   ├── modules/
│   │   ├── auth/                 # thin auth integration if needed beyond library defaults
│   │   ├── landing/              # Sanity read path for marketing
│   │   ├── lists/
│   │   │   ├── domain/
│   │   │   ├── application/
│   │   │   ├── infrastructure/
│   │   │   └── presentation/
│   │   └── tasks/
│   │       ├── domain/
│   │       ├── application/
│   │       ├── infrastructure/
│   │       └── presentation/
│   └── shared/                   # tiny cross-cutting utils only
├── drizzle.config.ts
├── playwright.config.ts
└── package.json
```

### 1.1 Module layers

Inside a capability module (add a folder only when it contains real code):

| Layer             | Responsibility                                                                                            | Must not                                           |
| ----------------- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `domain/`         | Entities, invariants, domain errors, repository **ports**                                                 | Import Next, React, Drizzle, Sanity, HTTP types    |
| `application/`    | Use cases / commands / queries, DTOs                                                                      | SQL, GROQ, JSX, Drizzle row types, raw Sanity docs |
| `infrastructure/` | Drizzle repositories, Sanity adapters, mappers                                                            | Leak persistence types into domain APIs            |
| `presentation/`   | Server Actions, Route Handler adapters, view models, Zod **input** schemas, UI pieces owned by the module | Core business rules; direct table imports in UI    |

### 1.2 Dependency direction

```text
presentation → application → domain
infrastructure → application ports + domain contracts
app (routes) → module presentation / application APIs
```

- `shared/` must not import from `modules/` or `app/`.
- Modules must not import from `app/`.
- Prefer root `db/` and `src/sanity` as seats; call them from module `infrastructure/`.

### 1.3 Next.js boundaries

- Default **Server Components**.
- **Client Components** only for real browser interactivity.
- **Server Actions**: authenticate → authorize → validate (Zod) → application use case → map errors → revalidate/redirect.
- **Route Handlers**: JSON API for lists/tasks (and auth routes as Better Auth requires). Treat as untrusted entry points; same authz + zod + use case path as actions where they mutate or read private data.

---

## 2. Auth (Better Auth)

### 2.1 Methods

- Email + password: sign-up, sign-in, sign-out.
- Magic link: request + consume.
- No OAuth/social providers in spike.

### 2.2 Session rules

- Session required for all list/task reads and writes (UI and JSON API).
- Signed-out users only access marketing + auth routes.
- Each user may only access rows where `userId` matches the session user.

### 2.3 Listless private workspace side effect

When a signed-in user has **zero** lists, create default list:

- `name`: `"Inbox"`
- `userId`: session user id

Run this check whenever the authenticated private workspace loads. Keep it atomic and idempotent under concurrent loads: never create more than one automatic Inbox, and never create one when any list exists. After creation, the Inbox is an ordinary list and may be renamed or deleted. Deleting the final list results in a new empty Inbox on the next private workspace load.

### 2.4 Placement

- Better Auth handler routes under `app/api/auth/...` (or library convention).
- Drizzle adapter tables live in the root `db/schema` seat as required by Better Auth.
- Optional thin `src/modules/auth` for app-facing helpers (`requireUser()`, session DTO). Avoid duplicating library internals.
- In explicitly enabled local/test mode, the magic-link `sendMagicLink` adapter writes the generated email and verification URL to a temporary, gitignored, file-backed mailbox. The mailbox is unavailable outside local/test mode; exact path, format, and configuration names are implementation choices.

---

## 3. Data model (Postgres)

Conceptual model (names may match Drizzle tables closely):

### 3.1 `lists`

| Column      | Type        | Notes                                                                  |
| ----------- | ----------- | ---------------------------------------------------------------------- |
| `id`        | uuid / text | PK                                                                     |
| `userId`    | uuid / text | owner, indexed, FK to user                                             |
| `name`      | text        | required, trimmed, 1–80 characters; unique per user case-insensitively |
| `createdAt` | timestamptz | required                                                               |
| `updatedAt` | timestamptz | required                                                               |

### 3.2 `tasks`

| Column      | Type        | Notes                                                                   |
| ----------- | ----------- | ----------------------------------------------------------------------- |
| `id`        | uuid / text | PK                                                                      |
| `listId`    | uuid / text | FK → lists.id, cascade on list delete                                   |
| `userId`    | uuid / text | denormalized owner for simple authz queries                             |
| `title`     | text        | required, trimmed, 1–200 characters; unique per list case-insensitively |
| `notes`     | text        | nullable, trimmed, maximum 5,000 characters                             |
| `status`    | enum/text   | `todo` \| `in_progress` \| `done`                                       |
| `createdAt` | timestamptz | required                                                                |
| `updatedAt` | timestamptz | required                                                                |

**Cascade:** deleting a list deletes all tasks in that list (DB-level ON DELETE CASCADE preferred).

**Auth tables:** per Better Auth + Drizzle adapter (users, sessions, accounts, verifications, etc.). Do not invent a parallel user table.

### 3.3 Migration workflow

- Before schema-changing implementation, create a non-default Neon development branch from the current default branch.
- Generate, apply, and verify Drizzle migrations on that development branch.
- Apply the same reviewed migration to the default branch only after verification succeeds.
- Exact Neon branch name, lifetime, and migration-promotion command remain implementation or delivery choices.

### 3.4 Required indexes and constraints

- Lists and tasks have primary keys.
- Tasks reference lists through a database foreign key with cascade deletion.
- A database-enforced case-insensitive unique key protects list names within one `userId`.
- A database-enforced case-insensitive unique key protects task titles within one `listId`.
- List cursor reads use a composite B-tree index beginning with `userId`, followed by `createdAt` and the deterministic cursor tie-breaker, with direction matching oldest-first order.
- Task cursor reads use a composite B-tree index beginning with `userId` and `listId`, followed by `createdAt` and the deterministic cursor tie-breaker, with direction matching newest-first order.
- Do not add speculative status, notes, search, or partial indexes until measured query evidence requires them.
- Exact normalized-key representation, tie-breaker type, index names, and Drizzle syntax remain implementation choices.

### 3.5 Query and connection baseline

- Cursor queries keep their equality predicates and ordering aligned with the required composite indexes.
- Fetch at most `limit + 1` rows to determine whether another page exists; return at most `limit` items and derive `nextCursor` without a total-count query.
- Select only fields required by the application-facing result.
- Main list/task request paths use a small, bounded number of queries and do not issue one follow-up query per returned row.
- The application runtime reuses one module-level Drizzle/database client instead of creating one per request.
- Deployed application traffic uses a pooled Neon connection. Schema migrations use a direct Neon connection.
- Redis and application-level query caching are not part of the spike baseline.
- Exact query composition, projections, instrumentation, client factory names, and environment-variable names remain implementation choices.

---

## 4. Domain rules

### 4.1 List

- Name length is 1–80 characters inclusive after trimming.
- Names are unique per `userId` under case-insensitive comparison. Preserve the accepted display value while enforcing normalized uniqueness at the database boundary.
- User can only mutate own lists.
- Delete list is always hard delete + cascade tasks (no soft delete in spike).
- List reads order by `createdAt` ascending. Equal timestamps use a deterministic implementation-chosen tie-breaker.

### 4.2 Task

- Title length is 1–200 characters inclusive after trimming.
- Titles are unique per `listId` under case-insensitive comparison. The same title may appear in different lists; preserve the accepted display value while enforcing normalized uniqueness at the database boundary.
- Notes are trimmed and optional. On creation, omitted, `null`, empty, and whitespace-only notes normalize to `null`. On update, omitting `notes` leaves the value unchanged; explicitly providing `null`, empty, or whitespace-only notes clears the value to `null`.
- Notes have a maximum length of 5,000 characters after trimming.
- Status only one of: `todo`, `in_progress`, `done`.
- New tasks always begin with status `todo`.
- After creation, any valid status may transition directly to any other valid status. Reapplying the current status succeeds as an idempotent no-op.
- Task must belong to a list owned by the same user.
- Moving a task across lists is **out of scope** unless added later by amending this SPEC.
- Task reads order by `createdAt` descending. Equal timestamps use a deterministic implementation-chosen tie-breaker.
- Manual list and task reordering is out of scope.

### 4.3 Visibility filter

- Application/query supports `includeCompleted: boolean`, defaulting to `true`. An omitted value returns all stored tasks; the UI initially shows completed tasks and offers a toggle that hides `done` tasks.
- Completed-task filtering preserves the relative order of the remaining tasks.

### 4.4 Cursor pagination

- List and task reads use forward cursor pagination and return `{ items, nextCursor }`.
- `nextCursor` is opaque and is `null` when no later page exists.
- Cursor position follows the settled `createdAt` ordering plus the deterministic tie-breaker.
- Authentication, ownership, list membership, and completed-task filtering are applied independently of cursor data on every request.
- Malformed or context-incompatible cursors are invalid input. Exact encoding and signing remain implementation choices.
- Omitted `limit` defaults to 20; accepted limits are integers from 1 through 100.
- Page responses contain only `items` and `nextCursor`; total counts and numbered-page metadata are not part of the contract.

---

## 5. Application use cases (minimum)

### Lists

- `ensureDefaultInbox(userId)`
- `listLists(userId, { cursor?, limit? })`
- `createList(userId, { name })`
- `renameList(userId, listId, { name })`
- `deleteList(userId, listId)`

### Tasks

- `listTasks(userId, listId, { includeCompleted, cursor?, limit? })`
- `createTask(userId, listId, { title, notes? })`
- `updateTask(userId, taskId, { title?, notes?, status? })`
- `deleteTask(userId, taskId)`

All use cases enforce ownership. A nonexistent private resource and one owned by another user both return the same application-level `not_found` outcome so ownership is not disclosed.

---

## 6. Sanity (landing only)

### 6.1 Content

The repository uses a dedicated Sanity project and dataset containing one singleton landing document. Exact provider IDs and names remain setup choices. The singleton exposes:

- `headline` (string)
- `blurb` (text)
- `primaryCtaLabel` (string)
- `secondaryCtaLabel` (string, optional)

No list/task documents.

### 6.2 Runtime

- Server-side fetch on marketing page via `src/modules/landing` infrastructure adapter.
- Spike complete does **not** require webhooks or on-demand revalidation.
- Until Sanity is wired, a temporary fallback is allowed only if clearly marked; remove fallback once CMS read works.

### 6.3 Seat

- `src/sanity/` for client/config/schema packages.
- Module adapter maps CMS payload → landing view model (no raw CMS types past infrastructure).

---

## 7. HTTP / Action API contract

The paths and parameter names below are stable API contracts.

### 7.1 JSON Route Handlers (session required unless noted)

| Method | Path                       | Body / query                        | Result                       |
| ------ | -------------------------- | ----------------------------------- | ---------------------------- |
| GET    | `/api/lists`               | `?cursor=&limit=`                   | `{ items, nextCursor }` page |
| POST   | `/api/lists`               | `{ name }`                          | created list                 |
| PATCH  | `/api/lists/:listId`       | `{ name }`                          | renamed                      |
| DELETE | `/api/lists/:listId`       | —                                   | deleted                      |
| GET    | `/api/lists/:listId/tasks` | `?includeCompleted=&cursor=&limit=` | `{ items, nextCursor }` page |
| POST   | `/api/lists/:listId/tasks` | `{ title, notes? }`                 | created task                 |
| PATCH  | `/api/tasks/:taskId`       | `{ title?, notes?, status? }`       | updated                      |
| DELETE | `/api/tasks/:taskId`       | —                                   | deleted                      |

Auth routes: Better Auth defaults under `/api/auth/*` (public where appropriate).

For paginated GET routes, omitted `limit` means 20 and accepted values are integers from 1 through 100. Responses do not include total counts or numbered-page metadata.

Errors use consistent JSON `{ error: { code, message } }`: unauthenticated requests use `401`; missing and other-owned private resources both use `404` with code `not_found`; uniqueness conflicts use `409` with code `conflict`; invalid input, including malformed or context-incompatible cursors, uses `422`. Private list/task handlers do not expose a distinct `403` ownership response. Server Actions map the same application outcomes without revealing resource existence.

### 7.2 Server Actions

Parallel mutations for the dashboard UI (create/rename/delete list; create/update/delete task). Share zod schemas and application use cases with Route Handlers.

---

## 8. Validation (Zod)

- Define input schemas in module `presentation` (or shared validation only if truly identical and stable).
- Parse in Server Actions and Route Handlers before calling application.
- Do not trust client-only validation.

---

## 9. UI

- **Marketing:** landing consuming Sanity view model + links to auth.
- **Auth:** sign-up, sign-in, magic link request/consume UX sufficient for happy paths.
- **App:** dashboard-style shell (shadcn): sidebar lists, main task panel, status controls, show/hide completed, and visible `Load more` controls for lists and tasks while `nextCursor` is non-null.
- Loading another page appends records in the settled order. Changing the selected list or completed-task filter discards loaded task pages and starts again from the first page.
- Prefer composition patterns; avoid turning `components/` into a second domain layer.

---

## 10. Testing

### 10.1 Vitest

- Location: colocated `*.test.ts` next to unit-tested modules.
- Scope for spike complete:
  - domain rules (status transitions/invariants as encoded)
  - application use cases (with mocked ports)
  - zod schema accept/reject cases
- Not required: full React component unit matrix.

### 10.2 Playwright

- Location: `e2e/`
- Happy paths minimum:
  1. Sign-up (password) or seed + sign-in
  2. Sign-in
  3. Create list
  4. Create task
  5. Change task status
  6. Load another task page from seeded data
  7. Sign-out
- The magic-link Playwright path clears the local/test mailbox, requests a link, reads the captured URL, and visits it to verify link consumption.
- CI: **not required** for spike complete.

### 10.3 Performance evidence

- Maintain a repeatable Neon development-branch performance seed with approximately 100 lists for one user, 10,000 tasks in one large list, and records for another user.
- Run `EXPLAIN ANALYZE` for representative first-page and next-page list/task cursor queries, plus completed-task filtering when it produces a distinct query shape.
- At the representative volume, the intended composite indexes support the paginated access paths without a full sequential scan of the lists or tasks table.
- With Neon compute active and relevant data warm, a 20-record database query executes in under 50 ms.
- Verify correct item counts, ordering, continuation, and termination at the maximum 100-record page size.
- Keep the evidence repeatable and local/manual or integration-level. Do not make the timing threshold a per-commit CI benchmark or treat it as an end-to-end production SLA.
- Exclude network latency, authentication, rendering, CMS access, and Neon compute startup from the database execution measurement.

### 10.4 Local quality

- Husky + lint-staged on commit (eslint/prettier as configured in `package.json`).
- Scripts: `pnpm test`, `pnpm exec playwright test`, `pnpm typecheck`, `pnpm lint`.

---

## 11. Environment (categories only)

Do not commit secrets. Typical categories:

- Pooled application database URL and direct migration database URL (Neon)
- Better Auth secret + URL
- Explicit local/test mailbox enablement and optional temporary path (non-secret)
- Production magic-link email provider settings if deployment later requires them
- Sanity project id, dataset, token (server), API version

Document exact variable names in README when wiring — not in this SPEC body if still unstable.

---

## 12. Implementation notes vs current scaffold

As of writing, the repo already has partial scaffold (Next app router root `app/`, shadcn, root `db`, Drizzle config, Vitest/Playwright/Husky). This SPEC describes the **target**. Grow toward `src/modules/*` and `src/sanity/`; avoid inventing a parallel architecture in `lib/`. The canonical design authority is `.dwf/`; Delivery artifacts, when created, belong outside `.dwf/`.

---

## 13. Definition of done (engineering checklist)

- [ ] Better Auth email/password + magic link working locally
- [ ] Session guards on actions + JSON API
- [ ] Drizzle schema: auth tables + lists + tasks + required constraints/indexes; migrations applied on Neon/dev DB
- [ ] Exactly one default Inbox on every listless private workspace load, including after final-list deletion
- [ ] List CRUD + cascade delete + case-insensitive per-user name uniqueness
- [ ] Task CRUD + status + hide completed + case-insensitive per-list title uniqueness
- [ ] Cursor-paginated list and task reads with opaque next cursors
- [ ] Pagination defaults to 20, caps at 100, omits total counts, and is visible through dashboard `Load more`
- [ ] Core list/task reads fetch at most `limit + 1`, avoid N+1 behavior, and use the required query-shaped indexes
- [ ] Representative Neon seed and `EXPLAIN ANALYZE` evidence satisfy the agreed index-use, cursor-correctness, and warm-query baseline
- [ ] Landing Sanity read path
- [ ] Zod at boundaries
- [ ] Module layering respected for lists/tasks/landing
- [ ] Vitest suite green for agreed scope
- [ ] Playwright happy paths green locally
- [ ] Husky + lint-staged active
- [ ] README explains setup without referencing unrelated products

---

## 14. Boundary clarifications

These clarifications preserve the accepted architecture decisions without prescribing unnecessary physical source shape.

### 14.1 Capability ownership

The first-class capabilities are `auth`, `landing`, `lists`, and `tasks`. `src/shared/` remains small. Root `db/` and `src/sanity/` are infrastructure seats, not additional business modules.

### 14.2 Persistence boundary

Lists and tasks own the repository ports required by their application use cases. Drizzle adapters implement those ports inside the owning capability's infrastructure boundary. Domain/application code consumes module types and outcomes, never Drizzle row types. Lists belong directly to users; there is no `Workspace` persistence entity. Database constraints enforce case-insensitive list-name uniqueness per user and task-title uniqueness per list. Composite B-tree indexes follow the authenticated equality scope and deterministic cursor order for list and task reads; additional indexes require measured evidence. `ensureDefaultInbox` must be atomic and idempotent under concurrent listless workspace loads; list deletion relies on the database cascade contract.

### 14.3 Authentication boundary

The auth module exposes server-only application helpers equivalent to:

```ts
type CurrentUser = {
  id: string
  email: string
  name: string | null
}

getCurrentUser(): Promise<CurrentUser | null>
requireUser(): Promise<CurrentUser>
```

Pages, Server Actions, and Route Handlers do not expose Better Auth records or trust a client-provided owner id. Middleware redirects may improve UX but do not replace authorization at private operation boundaries.

### 14.4 Lists and tasks application boundary

Use cases receive the authenticated user id from the server boundary and enforce ownership:

```ts
ensureDefaultInbox(userId): Promise<List>
listLists(userId, page): Promise<Page<List>>
createList(userId, input): Promise<List>
renameList(userId, listId, input): Promise<List>
deleteList(userId, listId): Promise<void>

listTasks(userId, listId, options): Promise<Page<Task>>
createTask(userId, listId, input): Promise<Task>
updateTask(userId, taskId, input): Promise<Task>
deleteTask(userId, taskId): Promise<void>
```

The exact implementation may group or split these functions while preserving their ownership and observable behavior. List and task reads return forward cursor pages. List reads are oldest-first and task reads are newest-first, with deterministic tie-breaking. Tasks remain in one list; new tasks default to `todo`; completed tasks remain stored and may be filtered from reads without changing the relative order of remaining tasks. Cursor data does not carry ownership authority.

### 14.5 Landing/Sanity boundary

The landing module exposes a plain landing view model and repository/application read path. Sanity client setup, GROQ, external payload validation, and mapping remain infrastructure details. Raw CMS documents do not cross into application or presentation code. Once the real CMS read path works, missing/invalid required content is an explicit integration failure rather than an invisible permanent hardcoded fallback.

### 14.6 Presentation boundary

`app/` is composition-only. Module presentation owns Server Actions, JSON handler adapters, Zod input schemas, view models, error mapping, and capability-owned UI. Actions and handlers follow:

```text
authenticate → validate → application use case → map result/error → revalidate/respond
```

### 14.7 Verification boundary

The implementation must prove domain invariants, application use cases with ports/fakes, Zod/auth boundary behavior, non-trivial adapter mappings, and the core Playwright journey. A complete React component unit matrix is not required.

### 14.8 Delivery boundary

The Delivery System consumes this SPEC and the PRD. It owns Roadmap, Milestones, Phases, dependencies, readiness, lifecycle, acceptance, verification, evidence, and implementation handoff. It must not add task-level decomposition or rewrite this technical contract.

### 14.9 Boundary type sketches

These sketches are normative at the semantic boundary; implementation may choose equivalent file grouping and concrete error plumbing.

```ts
type UserId = string
type ListId = string
type TaskId = string
type TaskStatus = "todo" | "in_progress" | "done"

interface PageRequest {
  cursor?: string
  /** Defaults to 20; accepted range is 1–100. */
  limit?: number
}

interface Page<T> {
  items: readonly T[]
  nextCursor: string | null
}

interface List {
  id: ListId
  userId: UserId
  name: string
  createdAt: Date
  updatedAt: Date
}

interface Task {
  id: TaskId
  listId: ListId
  userId: UserId
  title: string
  notes: string | null
  status: TaskStatus
  createdAt: Date
  updatedAt: Date
}

interface ListRepository {
  listByUser(userId: UserId, page: PageRequest): Promise<Page<List>>
  findByIdForUser(userId: UserId, listId: ListId): Promise<List | null>
  ensureDefaultInbox(userId: UserId, now: Date): Promise<List>
  insert(input: {
    id: ListId
    userId: UserId
    name: string
    now: Date
  }): Promise<List>
  rename(
    userId: UserId,
    listId: ListId,
    name: string,
    now: Date
  ): Promise<List | null>
  delete(userId: UserId, listId: ListId): Promise<boolean>
}

interface TaskRepository {
  listByOwnedList(
    userId: UserId,
    listId: ListId,
    options: PageRequest & { includeCompleted: boolean }
  ): Promise<Page<Task>>
  insert(input: {
    id: TaskId
    userId: UserId
    listId: ListId
    title: string
    notes: string | null
    status: TaskStatus
    now: Date
  }): Promise<Task | "list_not_found">
  findByIdForUser(userId: UserId, taskId: TaskId): Promise<Task | null>
  updateForUser(
    userId: UserId,
    taskId: TaskId,
    patch: {
      title?: string
      notes?: string | null
      status?: TaskStatus
    },
    now: Date
  ): Promise<Task | null>
  deleteForUser(userId: UserId, taskId: TaskId): Promise<boolean>
}
```

Adapters keep Drizzle row types private. Repository methods enforce ownership through their query boundary; presentation does not coordinate raw table reads.

### 14.10 Current factual implementation prerequisites

No tracked design choice remains open. Current external-resource and deployed-schema facts remain in [`../../decisions/OPEN-QUESTIONS.md`](../../decisions/OPEN-QUESTIONS.md); answered absence of a resource does not silently satisfy an implementation prerequisite.
