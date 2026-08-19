# Product Requirements — Next.js Todo List Example

**Status:** generated Agent product projection
**Authority:** [`../../decisions/PRODUCT.md`](../../decisions/PRODUCT.md), [`../../decisions/EDGE-CASES.md`](../../decisions/EDGE-CASES.md), [`../../decisions/OPEN-QUESTIONS.md`](../../decisions/OPEN-QUESTIONS.md), and [`../../decisions/OPEN-DECISIONS.md`](../../decisions/OPEN-DECISIONS.md)
**Companion:** [`SPEC.md`](./SPEC.md) (generated technical projection)

This projection is generated from the durable DWF Workspace. It is the precise observable product contract; it does not own decision rationale or implementation mechanisms.

This repository is a **public, standalone, opinionated Next.js starter** implemented as a complete personal-todo reference application on the selected [Next.js stack](../../../docs/architecture/stack.md). Vercel is the intended hosting target, although deployment remains optional for starter-baseline completion. The reference domain is intentionally simple; the reusable foundations are production-minded.

---

## 1. Product purpose and reuse contract

- The starter itself is the product; the todo application is its complete reference implementation.
- A derived application should be able to replace mostly domain and UI code while retaining or adapting the cross-cutting foundations.
- The starter provides one preferred, modern stack and architecture. It is not a configurable framework for swapping infrastructure providers or architectural styles.
- The baseline optimizes for high reusable quality without excessive implementation time: use the simplest genuinely robust design and add complexity only when it has a clear, durable payoff.

### Problem

Teams repeatedly spend time rebuilding and reconciling the same cross-cutting foundations before they can focus on a new application's domain and UI. This starter provides one coherent reference that includes:

- authenticated personal data in Postgres
- editorial marketing content in a CMS
- clear, replaceable domain boundaries
- secure server boundaries and operational recovery paths
- layered tests, migrations, documentation, and local quality controls

A todo list is a universally understood reference domain, so the architecture and reusable foundations stay visible.

## 2. Goals

1. Ship a complete, runnable **todo reference baseline**, not a mock UI or disposable prototype.
2. Keep reusable foundations independent from replaceable todo-domain and UI concerns.
3. Implement **Better Auth** (email/password + magic link) with session-guarded mutations.
4. Store **lists and tasks** in **Postgres via Drizzle (Neon)**.
5. Store **landing editorial copy** in **Sanity** (not todos), with automatic published-content revalidation and protected manual recovery.
6. Expose writes via **Server Actions** and **simple JSON Route Handlers** (UI + future agents).
7. Validate inputs with **Zod** at server boundaries.
8. Use **shadcn/ui** with a richer dashboard-style signed-in shell that demonstrates a replaceable, high-quality product UI.
9. Prove **Vitest** unit coverage, real local PostgreSQL integration coverage, and **Playwright** happy paths.
10. Use **Husky + lint-staged** for local quality; no GitHub Actions CI is required for the currently accepted starter baseline.
11. Demonstrate that the core cursor reads are index-backed and comfortably fast on a representative Neon development dataset.
12. Prefer current stable best practices and high-leverage production safeguards without adding speculative framework machinery.

## 3. Non-goals (explicit)

Out of scope for the current todo reference baseline:

- A universal generator or configurable framework for interchangeable stacks and providers
- Turnkey production certification, application-specific compliance, or universal operational guarantees
- Real-time / multiplayer collaboration
- Native mobile apps
- OAuth / social login
- Polished email verification and password-reset product flows
- Sanity Live draft preview and click-to-edit visual editing in the initial delivery phase; this accepted capability follows the webhook and manual-recovery baseline
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
- There is **no** tenant, organization, or `Workspace` entity. Lists belong directly to the authenticated user through `userId`.
- Authorization rule: **must be signed in** to read or write lists/tasks.
- Requests for another user's list or task do not reveal whether that resource exists.

## 5. Product shape

### 5.1 Lists

- A user has **many lists**.
- List names are trimmed, contain **1–80 characters**, and are unique per user under case-insensitive comparison.
- Whenever a private workspace loads with zero lists, atomically and idempotently create one list named **Inbox**.
- The automatic Inbox is an ordinary list after creation and may be renamed or deleted. Deleting the final list causes a new empty Inbox to appear on the next private workspace load; any existing list prevents automatic Inbox creation.
- List operations: **create**, **rename**, **delete**.
- Deleting a list **cascade-deletes** its tasks.
- List reads are deterministic and ordered oldest-created first. Manual reordering is out of scope.
- List reads use forward cursor pagination and return an opaque next cursor when more records exist.
- List pages default to 20 records and accept at most 100. The dashboard exposes `Load more` while another page exists.

### 5.2 Tasks

- A task belongs to exactly one list.
- Statuses: `todo` | `in_progress` | `done`; new tasks start as `todo`, then may move directly between any statuses.
- Fields: **title** (required, 1–200 characters after trimming, unique within its list under case-insensitive comparison), **notes** (optional, trimmed, empty represented as absent, maximum 5,000 characters after trimming), timestamps.
- The same task title may appear in different lists.
- Operations: **create**, **edit** title/notes, **change status**, **delete**. Reapplying the current status succeeds as a no-op.
- Completed tasks **remain on the list** and are **shown by default**; UI offers **show/hide completed**.
- Task reads are deterministic and ordered newest-created first. Hiding completed tasks preserves the relative order of visible tasks; manual reordering is out of scope.
- Task reads use forward cursor pagination and return an opaque next cursor when more records exist.
- Task pages default to 20 records and accept at most 100. The dashboard exposes `Load more` while another page exists; changing the selected list or completed-task filter restarts from the first page.

### 5.3 Concurrent edits

- List and task edits do not require version tokens or stale-write prompts.
- Each accepted mutation changes only the fields it contains.
- If accepted mutations write the same field, the last successfully committed value is the observable result. Changes to different fields may both persist.
- Ownership, validation, and uniqueness rules still apply to every mutation.

### 5.4 Editorial publishing and preview

- Publishing the landing singleton in Sanity automatically invalidates the affected public cache through a trusted webhook.
- An authorized operator can force the same invalidation when automatic delivery or cache state needs recovery.
- Authenticated live draft preview with click-to-edit visual editing is an intended capability, delivered after the webhook and manual-recovery baseline.

### 5.5 Surfaces

1. **Public landing** — copy from Sanity (headline, blurb, CTAs).
2. **Auth screens** — sign-up, sign-in, magic link, sign-out.
3. **App shell** — dashboard-style layout: list sidebar + task main panel.

## 6. Data ownership (product view)

| System             | Owns                                                        |
| ------------------ | ----------------------------------------------------------- |
| Postgres (Drizzle) | Auth/session tables (as Better Auth requires), lists, tasks |
| Sanity             | Landing editorial content only                              |

Todos are never stored in Sanity.

## 7. Starter baseline complete (acceptance)

The starter baseline is complete when all of the following are true **locally**:

1. User can register and sign in with **email/password** and with **magic link**.
2. User can sign out; signed-out users cannot access list/task data.
3. A listless private workspace load yields exactly one **Inbox** list, including after the final list was deleted.
4. User can create/rename/delete lists; delete removes tasks.
5. User can create/edit/delete tasks and move status among `todo` / `in_progress` / `done`.
6. User can show/hide completed tasks.
7. User can visibly load additional cursor-paginated lists and tasks.
8. Landing page renders **Sanity-driven** editorial fields (not hardcoded-only forever), and a read-only live smoke proves that the published singleton can be fetched, validated, and mapped before baseline completion.
9. Mutations available via **Server Actions** and mirrored (or subset) **JSON Route Handlers**.
10. Zod validates server inputs; duplicate list names and same-list task titles produce a conflict rather than creating duplicate rows.
11. Vitest covers database-free domain rules, application use cases, and zod schemas (not a full UI unit matrix).
12. PostgreSQL 18 Testcontainers integration tests apply the real migrations and cover the agreed persistence behavior.
13. Playwright covers happy paths in Chromium: sign-up/in → create list → create task → change status → sign-out. Firefox and WebKit are available through a separate on-demand cross-browser run before a public release or after a major UI change.
14. Husky + lint-staged run on commit for staged lint/format (and project conventions as configured).
15. Representative Neon development data and query-plan evidence confirm index-backed cursor reads, correct maximum-size pages, and the agreed warm-query target.
16. Concurrent list and task edits use last-successful-write behavior without weakening ownership, validation, or uniqueness enforcement.
17. A trusted Sanity webhook automatically refreshes published landing content, and an authorized operator can trigger the same cache invalidation for recovery.

Deployed Vercel preview is **optional**, not required for the currently accepted starter baseline.

## 8. Success metrics (qualitative)

- A new agent can implement features by reading [the supplied DWF bootstrap](../../README.md), [`../../CONTEXT.md`](../../CONTEXT.md), this generated PRD, [`SPEC.md`](./SPEC.md), the decision ledgers, and the supporting project documentation without chat history.
- A derived application can replace the todo capabilities and product UI without redesigning every cross-cutting foundation.
- Reusable infrastructure and boundary code do not depend on todo-specific concepts unless the dependency is inherent.
- Architecture seats (`src/modules/*`, `db`, `src/sanity`) stay obvious as the reference implementation grows.
- Added complexity has a concrete, durable payoff rather than serving hypothetical flexibility.

## 9. Open-state visibility

No product behavior is silently inferred from unresolved state. Current open facts and choices remain in [`../../decisions/OPEN-QUESTIONS.md`](../../decisions/OPEN-QUESTIONS.md) and [`../../decisions/OPEN-DECISIONS.md`](../../decisions/OPEN-DECISIONS.md). Technical open items are surfaced in the generated SPEC where they affect implementation completeness.

## 10. Open product decisions

None material for starter-baseline implementation. Defer low-leverage polish (empty-state wording and exact dashboard chrome) to implementation taste within SPEC constraints.
