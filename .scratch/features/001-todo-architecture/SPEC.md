# Implementation Architecture Specification — Todo List Example

**Status:** design-ready for implementation review  
**Feature:** `todo-architecture`  
**Canonical product contract:** [`docs/product/PRD.md`](../../../docs/product/PRD.md)  
**Canonical stack contract:** [`docs/product/SPEC.md`](../../../docs/product/SPEC.md)

## 1. Design objective

Turn the canonical spike requirements into a concrete implementation map. A separate implementation agent should be able to identify the owner of every rule, choose the correct file, use the agreed boundary signatures, and trace a request without inventing a second architecture.

This document is normative together with the linked files under `contracts/`. Files under `examples/` are explanatory and illustrative; they do not replace contracts.

## 2. Dependency direction

```text
app routes ───────→ module presentation/application APIs
module presentation ─→ application ─→ domain
module infrastructure ─→ application ports + domain contracts
root db/ ─────────→ Drizzle client/schema/migrations only
src/sanity/ ──────→ Sanity client/configuration only
```

Rules:

- `domain/` does not import Next.js, React, Drizzle, Sanity, HTTP, or browser APIs.
- `application/` does not execute SQL/GROQ, render JSX, or expose persistence/CMS rows.
- `infrastructure/` maps external rows/documents into module types.
- `presentation/` handles auth, Zod, HTTP/action translation, view models, and owned UI; it does not own business rules.
- `app/` composes routes and metadata; it does not import database tables or raw CMS payloads.
- `src/shared/` stays small and cannot import `app/` or capability modules.

## 3. Target file system

```text
app/
├── (marketing)/
│   └── page.tsx                         # compose landing application read + public CTAs
├── (auth)/
│   ├── sign-in/page.tsx                 # compose sign-in screen
│   ├── sign-up/page.tsx                 # compose sign-up screen
│   └── magic-link/page.tsx              # compose magic-link request/consume screen
├── (app)/
│   ├── layout.tsx                       # require authenticated dashboard shell
│   └── dashboard/page.tsx               # compose lists/tasks reads and module UI
├── api/
│   ├── auth/[...all]/route.ts           # delegate Better Auth request handling
│   ├── lists/route.ts                   # delegate GET/POST list collection
│   ├── lists/[listId]/route.ts          # delegate PATCH/DELETE list resource
│   ├── lists/[listId]/tasks/route.ts    # delegate GET/POST task collection
│   └── tasks/[taskId]/route.ts          # delegate PATCH/DELETE task resource
├── globals.css
└── layout.tsx                           # global fonts/theme/providers

components/
├── ui/                                  # generic shadcn primitives only
└── theme-provider.tsx                   # generic theme context

db/
├── db.ts                                 # Neon + Drizzle client
├── index.ts                              # stable db exports
└── schema/
    ├── auth.ts                           # Better Auth adapter tables
    ├── lists.ts                          # lists table and relational constraints
    ├── tasks.ts                          # tasks table and list cascade FK
    └── index.ts                          # schema exports for Drizzle config

migrations/                               # generated, reviewed Drizzle migrations

src/
├── sanity/
│   ├── client.ts                          # server-only Sanity client
│   ├── config.ts                          # project/dataset/API configuration
│   └── index.ts                           # stable infrastructure exports
├── shared/
│   └── errors.ts                          # only genuinely cross-module error primitives
└── modules/
    ├── auth/
    │   ├── application/
    │   │   ├── session.ts                 # CurrentUser DTO, getCurrentUser, requireUser
    │   │   └── errors.ts                  # unauthenticated application error
    │   ├── infrastructure/
    │   │   ├── better-auth.ts             # Better Auth server instance/configuration
    │   │   ├── session-reader.ts          # map Better Auth session → CurrentUser
    │   │   └── mailer.ts                  # magic-link delivery adapter when required
    │   └── presentation/
    │       ├── auth-handler.ts            # Better Auth HTTP adapter export
    │       ├── schemas.ts                 # auth input validation not owned by Better Auth
    │       ├── client.ts                  # browser auth client wrapper
    │       └── components/                # sign-in/sign-up/magic-link UI
    ├── landing/
    │   ├── application/
    │   │   ├── ports.ts                   # LandingContentRepository
    │   │   ├── types.ts                   # LandingContent view/application type
    │   │   └── get-landing-content.ts     # read use case
    │   ├── infrastructure/
    │   │   ├── sanity-client.ts           # module-facing Sanity client setup
    │   │   ├── sanity-content-repository.ts # Sanity repository implementation
    │   │   ├── sanity-document-schema.ts  # validate external CMS payload
    │   │   └── map-sanity-document.ts     # CMS payload → LandingContent
    │   └── presentation/
    │       └── view-model.ts              # application model → marketing view model
    ├── lists/
    │   ├── domain/
    │   │   ├── list.ts                    # List type and pure naming rules
    │   │   └── errors.ts                  # list domain/application errors
    │   ├── application/
    │   │   ├── ports.ts                   # ListRepository contract
    │   │   ├── dto.ts                     # list input/output DTOs
    │   │   └── use-cases.ts               # default Inbox + list CRUD
    │   ├── infrastructure/
    │   │   └── drizzle-list-repository.ts # Drizzle implementation of ListRepository
    │   └── presentation/
    │       ├── actions.ts                 # dashboard list mutations
    │       ├── handlers.ts                # list JSON route adapters
    │       ├── schemas.ts                 # list Zod input schemas
    │       ├── view-models.ts              # list DTO → UI/API shapes
    │       └── components/list-sidebar.tsx # list-owned UI
    └── tasks/
        ├── domain/
        │   ├── task.ts                    # Task type, statuses, pure invariants
        │   └── errors.ts                  # task domain/application errors
        ├── application/
        │   ├── ports.ts                   # TaskRepository contract
        │   ├── dto.ts                     # task input/output DTOs
        │   └── use-cases.ts               # task queries and mutations
        ├── infrastructure/
        │   └── drizzle-task-repository.ts # ownership-aware Drizzle implementation
        └── presentation/
            ├── actions.ts                 # dashboard task mutations
            ├── handlers.ts                # task JSON route adapters
            ├── schemas.ts                 # task Zod input schemas
            ├── view-models.ts             # task DTO → UI/API shapes
            └── components/task-panel.tsx  # task-owned UI

e2e/
└── todo-journey.spec.ts                   # sign-in → list → task → status → sign-out
```

Do not create empty layer files just to satisfy the tree. The tree identifies the intended seats; a layer is added when it contains real code. Existing scaffold files that conflict with this layout should be migrated and removed, including the temporary `lib/auth.ts`, example `db/schema/test.ts`, and default Playwright example.

## 4. Capability ownership

| Capability    | Owns                                                                           | Does not own                                           |
| ------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------ |
| `auth`        | authenticated-user DTO, session reads, auth provider integration, auth screens | list/task authorization rules or a parallel user table |
| `landing`     | landing view model, CMS repository, Sanity mapping/failure behavior            | users, lists, tasks, or transactional state            |
| `lists`       | list naming, list CRUD, default Inbox, list deletion                           | task fields/status rules or raw route handling         |
| `tasks`       | task title/notes/status, list membership checks, task CRUD/filtering           | list CRUD or UI-only state                             |
| `db/`         | Drizzle client, tables, migrations                                             | use cases and business decisions                       |
| `src/sanity/` | Sanity client/configuration seat                                               | application view models and CMS policy                 |
| `app/`        | framework composition, route params, metadata                                  | domain/application rules and persistence access        |

## 5. Request flow

Private mutation flow:

```text
Browser action or JSON request
  → app route/module presentation adapter
  → requireUser()
  → Zod parse
  → application use case(user.id, input)
  → domain rules + repository port
  → infrastructure adapter
  → DTO/view-model/error mapping
  → revalidate/redirect or JSON response
```

Private reads use the same auth boundary and ownership-aware application query path. A client-provided `userId` is never trusted.

Public landing flow:

```text
app/(marketing)/page.tsx
  → landing getLandingContent()
  → LandingContentRepository
  → Sanity adapter
  → Zod payload validation
  → mapper
  → landing view model
  → rendered marketing page
```

## 6. Implementation sequence

1. Replace the temporary auth placement with `src/modules/auth` and wire Better Auth route handling.
2. Add lists/tasks Drizzle tables, constraints, migrations, and module repository ports/adapters.
3. Implement domain types/invariants and application use cases with fake-port tests.
4. Implement server-only auth boundary and private route guards.
5. Add lists/tasks Zod schemas, Server Actions, JSON adapters, and dashboard composition.
6. Add Sanity configuration, validated repository, landing view model, and marketing route.
7. Replace scaffold Playwright test with the todo journey and add negative boundary tests.
8. Run typecheck, lint, Vitest, Playwright, and the actual local application smoke path.

## 7. Review gate before source implementation

Before implementation begins, review every linked contract for:

- exact ownership and imports
- signature consistency
- error behavior
- no raw persistence/CMS types crossing boundaries
- coverage of the PRD/SPEC acceptance criteria
- a deterministic test or smoke scenario for every normative rule
