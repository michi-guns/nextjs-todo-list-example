# T-10 — Authenticated Focus Rail dashboard

**Status:** Accepted for implementation.

## Goal

Materialize the selected Focus Rail direction in the authenticated `/dashboard`
surface. A signed-in user can manage only their own lists and tasks, see
deterministic cursor pagination, filter completed tasks, and receive clear
pending/error/empty feedback at the required responsive viewports.

## Authority and prerequisites

- Product and behavior: `.dwf/output/agent/PRD.md` and `.dwf/output/agent/SPEC.md`.
- UI direction: `.ui-explorations/t09a-dashboard/handoff.md` (`focus-rail`).
- Test contracts: `TST-LISTS-003`, `TST-TASKS-003`, `TST-UI-001`, and
  `TST-E2E-003` in `.dwf/decisions/TESTING.md`.
- Existing capability boundaries remain authoritative: app routes compose
  module presentation, Server Actions own mutations, and JSON Route Handlers
  own authenticated reads. The browser never imports Drizzle, Better Auth, or
  application repositories.

## Design

### Route and server boundary

- Add `app/(app)/dashboard/page.tsx` as a Server Component.
- Require a session with `requireUser()`, atomically call
  `listApplication.ensureDefaultInbox(user.id)`, then fetch the first list page
  and the first task page for its selected list. Keep server work parallel after
  the list page is known; pass only serializable view models and the current
  user's display fields to a client container.
- Add route-local loading/error UI for the authenticated segment. An anonymous
  request must be redirected to the existing auth entry surface (or receive the
  existing safe unauthenticated boundary) without rendering private data.

### Client composition and state

- Add a focused client container under `src/modules/lists/presentation` or
  `src/modules/tasks/presentation` only for orchestration, plus composable UI
  pieces under `components/`:
  `AppShell`, `AppHeader`, `ListRail`, `TaskWorkspace`, `TaskCapture`,
  `TaskToolbar`, and `TaskQueue`.
- Use existing shadcn `Button` and add only the small semantic primitives needed
  (`Input`, `Textarea`, `Label`, `Checkbox`, and an alert/confirmation pattern)
  rather than a speculative component system. Use semantic Tailwind tokens from
  `globals.css`; no second palette or hard-coded status colors.
- Keep selected-list, list cursor, task cursor, completed visibility, pending
  operation, and field/error state in the client container. The initial list and
  task pages are server-provided; subsequent pages use same-origin `fetch` GETs
  to the existing authenticated JSON routes.
- Mutations call the existing Server Actions with plain serializable objects.
  Apply returned view models locally, preserve the active context, and refresh
  the relevant page state when a delete or final-list recreation requires a new
  server load. Do not duplicate validation or ownership rules in the browser.
- Selecting a list or toggling completed visibility clears task items/cursor and
  fetches page one for the new context. `Load more` is a real disabled-while-
  pending button and appends in server order only when `nextCursor` exists.
- List create/select/rename/delete and task create/edit/delete/status operations
  use explicit labels, confirmations for destructive actions, and actionable
  role-alert feedback. A final-list delete presents the required reload state,
  focuses its reload control, and lets the next server load provision Inbox.

### Accessibility and responsive behavior

- Use landmarks, one page heading, labelled native inputs, `aria-current` for
  the selected list, `aria-busy`/`role=status` for pending work, and visible
  focus styles. Keep all controls keyboard reachable and touch-sized.
- At 1440px use a persistent narrow rail; at 1024px/768px use a compact
  horizontally scrollable list strip; at 320px stack rail and workspace. Ensure
  long titles/notes wrap and document width never overflows.
- Include loading skeleton/label, empty-list, empty-filter, validation/conflict,
  recoverable-error, disabled/pending, selected, and pagination states.

## Verification and evidence

1. Add focused pure state/response tests only where they prove pagination reset,
   append/replace behavior, and safe error handling; do not build a full React
   unit matrix.
2. Run `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, changed-file
   Prettier, and `git diff --check`.
3. Run the required Next 16 runtime loop with `next dev` and the repository's
   `agent-browser`/Next MCP workflow when prerequisites are available. Exercise
   an authenticated session at 320, 768, 1024, and 1440 widths: list/task
   creation, rename/edit/delete, status, completed toggle, both Load more
   controls, keyboard focus, errors, and final-list reload.
4. Record exact runtime evidence without credentials. Reconcile the four TST
   contracts and the T-10 entry in `TODO.md`; leave end-to-end harness ownership
   to T-15 where the required reusable Playwright setup is not yet present.

## Scope boundaries

Do not change migrations, database schema, auth provider configuration, landing
content, or the rejected UI directions. Do not add search, command shortcuts,
drag/drop ordering, totals, bearer auth, or a new state-management dependency.
