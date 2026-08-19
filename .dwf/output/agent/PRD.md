# Product Requirements — Next.js Todo List Example

**Status:** generated Agent product projection
**Authority:** [`../../decisions/PRODUCT.md`](../../decisions/PRODUCT.md), [`../../decisions/EDGE-CASES.md`](../../decisions/EDGE-CASES.md), [`../../decisions/OPEN-QUESTIONS.md`](../../decisions/OPEN-QUESTIONS.md), and [`../../decisions/OPEN-DECISIONS.md`](../../decisions/OPEN-DECISIONS.md)
**Companion:** [`SPEC.md`](./SPEC.md) (generated technical projection)

This projection is generated from the durable DWF Workspace. It is the precise observable product contract; it does not own decision rationale or implementation mechanisms.

This repository is a **public, standalone example** of a small multi-user todo product on a modern [Next.js stack](../../../docs/architecture/stack.md). It is intentionally simple in domain and intentionally serious in structure, auth, data split, and local quality tooling.

---

## 1. Problem

People learning or scaffolding full-stack Next.js apps need a concrete reference that shows:

- authenticated personal data in Postgres
- editorial marketing content in a CMS
- clear module boundaries
- tests and git hooks without pretending to be a production SaaS

A todo list is a universally understood domain, so architecture stays visible.

## 2. Goals

1. Ship a **complete spike**: a thin but real user journey, not a mock UI only.
2. Demonstrate **Better Auth** (email/password + magic link) with session-guarded mutations.
3. Store **lists and tasks** in **Postgres via Drizzle (Neon)**.
4. Store **landing editorial copy** in **Sanity** (not todos).
5. Expose writes via **Server Actions** and **simple JSON Route Handlers** (UI + future agents).
6. Validate inputs with **Zod** at server boundaries.
7. Use **shadcn/ui** with a **richer dashboard-style** signed-in shell (UI quality is part of the experiment).
8. Prove **Vitest** (domain/application/zod) and **Playwright** (happy paths) locally.
9. Use **Husky + lint-staged** for local quality; no GitHub Actions CI required for spike complete.

## 3. Non-goals (explicit)

Out of scope for spike complete:

- Real-time / multiplayer collaboration
- Native mobile apps
- OAuth / social login
- Polished email verification and password-reset product flows
- Sanity webhooks / revalidation pipelines
- Internationalization (English only)
- Recurring tasks, subtasks, tags, attachments, comments
- Payments, teams, orgs, roles beyond “user owns own data”
- Shared lists between users
- Offline / PWA
- Multi-region production operations
- GitHub Actions CI matrix

## 4. Users and permissions

| Actor     | Can do                                                            |
| --------- | ----------------------------------------------------------------- |
| Anonymous | View marketing landing; open sign-up / sign-in / magic-link flows |
| Signed-in | Manage only their own lists and tasks; sign out                   |

- Anyone may register.
- There is **no** tenant/org model: one implicit personal workspace per user.
- Authorization rule: **must be signed in** to read or write lists/tasks.
- Requests for another user's list or task do not reveal whether that resource exists.

## 5. Product shape

### 5.1 Lists

- A user has **many lists**.
- List names are trimmed and contain **1–80 characters**.
- On **first sign-in**, create a default list named **Inbox** if none exist.
- List operations: **create**, **rename**, **delete**.
- Deleting a list **cascade-deletes** its tasks.

### 5.2 Tasks

- A task belongs to exactly one list.
- Statuses: `todo` | `in_progress` | `done`.
- Fields: **title** (required, 1–200 characters after trimming), **notes** (optional, maximum 5,000 characters), timestamps.
- Operations: **create**, **edit** title/notes, **change status**, **delete**.
- Completed tasks **remain on the list** and are **shown by default**; UI offers **show/hide completed**.

### 5.3 Surfaces

1. **Public landing** — copy from Sanity (headline, blurb, CTAs).
2. **Auth screens** — sign-up, sign-in, magic link, sign-out.
3. **App shell** — dashboard-style layout: list sidebar + task main panel.

## 6. Data ownership (product view)

| System             | Owns                                                        |
| ------------------ | ----------------------------------------------------------- |
| Postgres (Drizzle) | Auth/session tables (as Better Auth requires), lists, tasks |
| Sanity             | Landing editorial content only                              |

Todos are never stored in Sanity.

## 7. Spike complete (acceptance)

The spike is complete when all of the following are true **locally**:

1. User can register and sign in with **email/password** and with **magic link**.
2. User can sign out; signed-out users cannot access list/task data.
3. First sign-in yields an **Inbox** list.
4. User can create/rename/delete lists; delete removes tasks.
5. User can create/edit/delete tasks and move status among `todo` / `in_progress` / `done`.
6. User can show/hide completed tasks.
7. Landing page renders **Sanity-driven** editorial fields (not hardcoded-only forever).
8. Mutations available via **Server Actions** and mirrored (or subset) **JSON Route Handlers**.
9. Zod validates server inputs.
10. Vitest covers domain rules, application use cases, and zod schemas (not a full UI unit matrix).
11. Playwright covers happy paths: sign-up/in → create list → create task → change status → sign-out.
12. Husky + lint-staged run on commit for staged lint/format (and project conventions as configured).

Deployed Vercel preview is **optional**, not required for spike complete.

## 8. Success metrics (qualitative)

- A new agent can implement features by reading [the supplied DWF bootstrap](../../README.md), [`../../CONTEXT.md`](../../CONTEXT.md), this generated PRD, [`SPEC.md`](./SPEC.md), the decision ledgers, and the supporting project documentation without chat history.
- Architecture seats (`src/modules/*`, `db`, `src/sanity`) stay obvious as the app grows slightly.
- Domain remains boring; structure and stack wiring remain the point.

## 9. Open-state visibility

No product behavior is silently inferred from unresolved state. Current open facts and choices remain in [`../../decisions/OPEN-QUESTIONS.md`](../../decisions/OPEN-QUESTIONS.md) and [`../../decisions/OPEN-DECISIONS.md`](../../decisions/OPEN-DECISIONS.md). Technical open items are surfaced in the generated SPEC where they affect implementation completeness.

## 10. Open product decisions

None material for spike start. Defer polish (empty states copy, exact dashboard chrome) to implementation taste within SPEC constraints.
