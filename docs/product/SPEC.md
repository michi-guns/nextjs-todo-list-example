# Technical Specification — Next.js Todo List Example

**Status:** agreed spike build contract  
**Companion:** [`PRD.md`](./PRD.md)  
**Stack:** See the canonical [technology stack](../architecture/stack.md). This document defines the implementation contract and stack-specific constraints for this project.

This document is the implementation contract. If code disagrees with this file, either fix the code or deliberately amend this file.

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
├── docs/
│   ├── product/
│   │   ├── PRD.md
│   │   └── SPEC.md
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

### 2.3 First sign-in side effect

When a signed-in user has **zero** lists, create default list:

- `name`: `"Inbox"`
- `userId`: session user id

Idempotent: never create a second automatic Inbox if any list exists.

### 2.4 Placement

- Better Auth handler routes under `app/api/auth/...` (or library convention).
- Drizzle adapter tables live in the root `db/schema` seat as required by Better Auth.
- Optional thin `src/modules/auth` for app-facing helpers (`requireUser()`, session DTO). Avoid duplicating library internals.

---

## 3. Data model (Postgres)

Conceptual model (names may match Drizzle tables closely):

### 3.1 `lists`

| Column      | Type        | Notes                        |
| ----------- | ----------- | ---------------------------- |
| `id`        | uuid / text | PK                           |
| `userId`    | uuid / text | owner, indexed, FK to user   |
| `name`      | text        | required, trimmed, non-empty |
| `createdAt` | timestamptz | required                     |
| `updatedAt` | timestamptz | required                     |

### 3.2 `tasks`

| Column      | Type        | Notes                                       |
| ----------- | ----------- | ------------------------------------------- |
| `id`        | uuid / text | PK                                          |
| `listId`    | uuid / text | FK → lists.id, cascade on list delete       |
| `userId`    | uuid / text | denormalized owner for simple authz queries |
| `title`     | text        | required, trimmed, non-empty                |
| `notes`     | text        | optional, default empty/null                |
| `status`    | enum/text   | `todo` \| `in_progress` \| `done`           |
| `createdAt` | timestamptz | required                                    |
| `updatedAt` | timestamptz | required                                    |

**Cascade:** deleting a list deletes all tasks in that list (DB-level ON DELETE CASCADE preferred).

**Auth tables:** per Better Auth + Drizzle adapter (users, sessions, accounts, verifications, etc.). Do not invent a parallel user table.

---

## 4. Domain rules

### 4.1 List

- Name min length 1 after trim; max length recommended 80.
- User can only mutate own lists.
- Delete list is always hard delete + cascade tasks (no soft delete in spike).

### 4.2 Task

- Title min length 1 after trim; max length recommended 200.
- Notes optional; max length recommended 5000.
- Status only one of: `todo`, `in_progress`, `done`.
- Create defaults status to `todo` unless specified and valid.
- Task must belong to a list owned by the same user.
- Moving a task across lists is **out of scope** unless added later by amending this SPEC.

### 4.3 Visibility filter

- Application/query supports `includeCompleted: boolean` (default `true` or `false` — pick one in implementation and keep consistent; recommended default **show all**, UI toggle hides `done`).

---

## 5. Application use cases (minimum)

### Lists

- `ensureDefaultInbox(userId)`
- `listLists(userId)`
- `createList(userId, { name })`
- `renameList(userId, listId, { name })`
- `deleteList(userId, listId)`

### Tasks

- `listTasks(userId, listId, { includeCompleted })`
- `createTask(userId, listId, { title, notes? })`
- `updateTask(userId, taskId, { title?, notes?, status? })`
- `deleteTask(userId, taskId)`

All use cases enforce ownership; return domain/application errors for not found vs forbidden (forbid may be indistinguishable as 404 for privacy — pick one policy and apply consistently; **recommended:** 404 for other users’ resources).

---

## 6. Sanity (landing only)

### 6.1 Content

Single document type (name flexible), e.g. `landingPage`:

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

## 7. HTTP / Action API sketch

Exact paths may vary; behavior must match.

### 7.1 JSON Route Handlers (session required unless noted)

| Method | Path                   | Body / query                  | Result       |
| ------ | ---------------------- | ----------------------------- | ------------ |
| GET    | `/api/lists`           | —                             | user’s lists |
| POST   | `/api/lists`           | `{ name }`                    | created list |
| PATCH  | `/api/lists/:id`       | `{ name }`                    | renamed      |
| DELETE | `/api/lists/:id`       | —                             | deleted      |
| GET    | `/api/lists/:id/tasks` | `?includeCompleted=`          | tasks        |
| POST   | `/api/lists/:id/tasks` | `{ title, notes? }`           | created task |
| PATCH  | `/api/tasks/:id`       | `{ title?, notes?, status? }` | updated      |
| DELETE | `/api/tasks/:id`       | —                             | deleted      |

Auth routes: Better Auth defaults under `/api/auth/*` (public where appropriate).

Errors: consistent JSON `{ error: { code, message } }` with 401/404/422 as applicable.

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
- **App:** dashboard-style shell (shadcn): sidebar lists, main task panel, status controls, show/hide completed.
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
  6. Sign-out
- Magic link may be tested with test hooks/fakes if email provider is local/test-mode.
- CI: **not required** for spike complete.

### 10.3 Local quality

- Husky + lint-staged on commit (eslint/prettier as configured in `package.json`).
- Scripts: `pnpm test`, `pnpm exec playwright test`, `pnpm typecheck`, `pnpm lint`.

---

## 11. Environment (categories only)

Do not commit secrets. Typical categories:

- Database URL (Neon)
- Better Auth secret + URL
- Magic link / email provider settings (dev)
- Sanity project id, dataset, token (server), API version

Document exact variable names in README when wiring — not in this SPEC body if still unstable.

---

## 12. Implementation notes vs current scaffold

As of writing, the repo already has partial scaffold (Next app router root `app/`, shadcn, root `db`, Drizzle config, Vitest/Playwright/Husky). This SPEC describes the **target**. Grow toward `src/modules/*` and `src/sanity/`; avoid inventing a parallel architecture in `lib/`.

---

## 13. Definition of done (engineering checklist)

- [ ] Better Auth email/password + magic link working locally
- [ ] Session guards on actions + JSON API
- [ ] Drizzle schema: auth tables + lists + tasks; migrations applied on Neon/dev DB
- [ ] Default Inbox on first list-less session
- [ ] List CRUD + cascade delete
- [ ] Task CRUD + status + hide completed
- [ ] Landing Sanity read path
- [ ] Zod at boundaries
- [ ] Module layering respected for lists/tasks/landing
- [ ] Vitest suite green for agreed scope
- [ ] Playwright happy paths green locally
- [ ] Husky + lint-staged active
- [ ] README explains setup without referencing unrelated products
