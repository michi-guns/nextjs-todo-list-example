# T-09B Focus Rail implementation handoff

**Status:** Selected for the production UI direction.

**Selected direction:** [Focus Rail](./directions/focus-rail/index.html)

**Consumers:** T-10 (authenticated dashboard) and T-11 (public landing and auth screens).

This is an implementation brief, not a second product or technical authority. The [Agent PRD](../../.dwf/output/agent/PRD.md), [Agent SPEC](../../.dwf/output/agent/SPEC.md), and accepted decision ledgers remain authoritative. The choice changes presentation guidance only; it does not add behavior, routes, APIs, persistence, authentication, or content-provider requirements.

## Decision

Focus Rail uses a persistent list context and one calm task queue. It wins because it matches the PRD's locked list-sidebar-plus-task-panel shell, makes the active list and next action obvious on first open, remains the strongest narrow-viewport option in the shared T-09A inspection, and has the lowest implementation complexity.

The accepted trade-off is less simultaneous cross-status context than Status Board and more navigation for comparison-heavy work. Keep status labels and direct controls visible, and keep the completed-task toggle and bounded `Load more` affordance prominent; do not add a board or a global command/search spine to compensate.

Status Board and Command Inspector remain useful rejected hypotheses, documented in the [comparison report](./report.md) and [exploration manifest](./exploration.json). Reconsidering this direction later requires a new, explicit product/UI decision rather than an incidental implementation rewrite.

## Product constraints to preserve

- The user is authenticated and sees only session-owned lists and tasks. Anonymous users go through the public landing/auth surfaces; private records and provider payloads never appear in UI-facing types.
- Lists support create, select, rename, delete, deterministic forward pagination, and visible `Load more`. Deleting a list removes its tasks; deleting the final list produces an explicit reload state and an `Inbox` on the next private-workspace load.
- Tasks support create, edit title/notes, delete, direct transitions among `todo`, `in_progress`, and `done`, deterministic forward pagination, visible `Load more`, and show/hide completed behavior. Changing list or completed filter restarts task pagination.
- Preserve the accepted validation, conflict, privacy-preserving error, and destructive-action semantics. Do not infer counts, search, drag-and-drop ordering, teams, or collaboration that the contracts do not provide.

## Authenticated dashboard composition

Use composition-owned UI, with data fetching and mutation orchestration kept in a container/page boundary:

```text
AppShell
├─ AppHeader (product mark, current-user/session actions)
├─ ListRail
│  ├─ ListRailHeading ("Lists", create action)
│  ├─ ListNavigation (owned lists, selected state)
│  └─ ListActions (create, rename, delete)
└─ TaskWorkspace
   ├─ WorkspaceHeading (active list, context/status summary)
   ├─ TaskCapture (title + optional notes + submit)
   ├─ TaskToolbar (show/hide completed, refresh/status feedback)
   ├─ TaskQueue (task rows, direct status control, edit disclosure, delete)
   └─ Pagination / state region (visible Load more or empty/loading/error)
```

The rail is the persistent navigation context at desktop widths. The workspace is the only primary content stream: task titles lead, notes are progressive detail, and each row exposes a direct status control plus an explicit edit/delete path. Editing stays in the row or an accessible local disclosure; do not introduce a separate global inspector. The active list must remain visible while capturing, editing, filtering, paginating, and handling errors.

Use the existing capability-owned Server Actions/route adapters and plain view models. The UI does not call Drizzle, Better Auth, Sanity, or provider clients directly. Prefer composable primitives over components with many mode or boolean props; keep list/task business rules in their existing module boundaries.

## Interaction model

1. On workspace load, select the first returned list (normally `Inbox` when the user has no lists) and load its first task page. Preserve the selected list while task mutations settle.
2. Creating a task accepts a required trimmed title and optional trimmed notes. Show validation/conflict feedback near the form and keep the user's context intact after success or failure.
3. Selecting a list updates the visible heading and restarts task pagination from the first page. The selected list uses a non-color-only active treatment and `aria-current`.
4. The completed toggle restarts the task page from the first cursor and labels whether completed work is shown. It never deletes or silently changes task status.
5. Status changes are direct and explicit (`todo`, `in_progress`, `done`); expose the text label as well as any visual accent. Reapplying a status remains a successful no-op.
6. `Load more` is a real button shown only while `nextCursor` is non-null. Appended tasks preserve settled order; pending state disables the relevant continuation control and announces progress.
7. Rename/delete actions are scoped to the selected list. Destructive deletion requires an accessible confirmation. If it removes the final list, show the explicit reload/Inbox recreation state and move focus to its reload action.
8. Task title/notes editing is local to the selected row or disclosure. Delete is explicit and preserves the same error and confirmation semantics as list deletion.
9. Do not add global `/` or Cmd/Ctrl-K shortcuts, board drag/drop, or cross-list search; those belong to rejected alternatives and would change the chosen interaction model.

## Visual hierarchy and reusable primitives

- Start with the repository's semantic shadcn/Tailwind tokens: `background`, `foreground`, `card`, `muted`, `muted-foreground`, `border`, `input`, `primary`, `primary-foreground`, `accent`, `ring`, `destructive`, and the sidebar token family. Do not introduce a second palette or hard-coded status colors.
- Use one restrained focus accent for the selected list, primary actions, and focus ring. Status chips may use semantic accents, but every status remains text-labelled and distinguishable without color.
- Keep the page title/active-list heading first, the capture form second, the task queue third, and destructive/help details last. Use the existing sans font and spacing/radius scale; avoid decorative gradients, excessive rounding, or shadow-heavy cards.
- Prefer the existing `Button` plus shadcn-style `Input`, `Textarea`, `Select`, `Checkbox`, `Alert`, `AlertDialog`, `Skeleton`, and `Sidebar` primitives as needed. Add only primitives required by the materialized surfaces, not a speculative design-system layer.
- Keep task rows bounded and readable: long titles and notes wrap rather than clip; secondary notes remain visually quieter; pending, selected, and completed treatments remain distinguishable in high contrast.

## Responsive behavior

- At wide desktop (`1440px`), use a persistent narrow list rail beside a flexible task workspace. The main queue receives the available width; no horizontal page scrolling is allowed.
- At compact desktop/tablet (`1024px` and `768px`), keep list context visible as a compact, horizontally scrollable rail or strip above the workspace. The task workspace remains a single column and forms/row actions may wrap.
- At narrow mobile (`320px`), stack the rail, workspace heading, capture fields, task content, and actions. Make controls large enough to operate by touch and keep long labels/titles/note text wrapping inside the viewport.
- Test the four contract viewports (`320px`, `768px`, `1024px`, `1440px`) and verify no document overflow, clipped focus indicator, or action hidden only behind hover.

## Accessibility and state requirements

- Use landmarks and headings: an `aside`/`nav` for lists, one page heading, labelled form controls, and a task list with meaningful accessible names. Icon-only actions require an `aria-label` and a tooltip/title where appropriate.
- Every action is a native keyboard-focusable control. Preserve logical tab order (header/session → list rail → workspace controls → task rows) and a visible `:focus-visible` ring with sufficient contrast.
- Mark the selected list with `aria-current`, expose task status in text, and use `aria-busy`/`role="status"` for loading and mutation progress. Use `role="alert"` for validation, conflict, authorization, and recoverable server errors without exposing sensitive ownership details.
- Manage focus after list/task creation, rename, deletion, pagination, and final-list reload. Keep focus in the active context and announce appended content; do not steal focus during ordinary background refresh.
- Provide understandable, actionable copy for every required state:

| State                         | Required presentation                                                                                 |
| ----------------------------- | ----------------------------------------------------------------------------------------------------- |
| Initial/loading               | Skeleton or labelled loading region; retain selected-list context and disable only affected controls. |
| Empty list                    | Explain that the list is clear and offer task capture without a blank panel.                          |
| No lists after final deletion | Explain that `Inbox` returns on workspace reload and focus an explicit reload action.                 |
| Empty completed-filter result | Say completed tasks are hidden and provide the toggle to show them.                                   |
| Validation/conflict/error     | Inline, field-associated message or alert; preserve entered context and offer retry/correction.       |
| Selected list/task            | Visible border/background plus semantic current/selection state, not color alone.                     |
| Disabled/pending              | Stable label, disabled control, and status announcement; avoid duplicate submissions.                 |
| Long content                  | Wrap titles/notes, preserve readable measure, and keep edit/delete controls reachable.                |
| Pagination continuation       | Visible `Load more` while a cursor exists; append in order and report the settled range.              |

- Respect reduced-motion preferences and maintain usable contrast in light and dark themes supplied by the existing token system.

## Landing and authentication extension notes

T-11 should carry the Focus Rail hierarchy and token vocabulary into the public surfaces without copying the private dashboard:

- Landing: content-first Sanity view model, one clear sign-up CTA, and secondary sign-in/magic-link entry. Do not show list/task controls or raw Sanity fields.
- Auth: spacious single-column sign-up, sign-in, magic-link request/consume, and sign-out flows with explicit labels, field-level errors, pending states, recovery links, and visible focus. Keep Better Auth provider payloads out of presentation types.
- Both surfaces use the same semantic colors, typography, spacing, focus treatment, responsive breakpoints, and error/loading conventions as the dashboard.

## Verification handoff

T-10 and T-11 should treat this document plus the linked PRD/SPEC as the design baseline. T-09A/T-09B prove only the isolated prototype and direction-handoff layers. `TST-UI-001` remains `partial` until T-10/T-11/T-12A provide materialized Next.js runtime/state inspection. `TST-E2E-003` remains owned by T-10, T-12A, and T-15 as recorded in the testing ledger; this handoff provides none of that end-to-end evidence. Production implementation must add focused evidence for keyboard reachability, state clarity, responsive overflow, authenticated ownership, and the required happy paths rather than claiming the static preview as runtime proof.
