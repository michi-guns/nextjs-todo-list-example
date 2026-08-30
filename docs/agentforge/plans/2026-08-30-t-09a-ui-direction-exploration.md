# T-09A UI direction exploration implementation plan

> AgentForge plan. Use `task-breakdown` after this plan is accepted.

**Status:** Accepted

**Goal:** Produce exactly three comparable, interactive, reversible prototypes for the personal-todo landing/auth/dashboard direction decision without changing production routes, data contracts, or business behavior.

**Spec and decisions:** [Agent PRD §5.5 Surfaces](../../../.dwf/output/agent/PRD.md#55-surfaces), [Agent SPEC §9 UI](../../../.dwf/output/agent/SPEC.md#9-ui), [Agent SPEC §14.6 Presentation boundary](../../../.dwf/output/agent/SPEC.md#146-presentation-boundary), [TD-009](../../../.dwf/decisions/TECHNICAL.md#td-009), [TD-020](../../../.dwf/decisions/TECHNICAL.md#td-020), [TST-UI-001](../../../.dwf/decisions/TESTING.md#tst-ui-001), [TST-E2E-003](../../../.dwf/decisions/TESTING.md#tst-e2e-003), and the T-09A acceptance criteria in [`TODO.md`](../../../TODO.md#t-09a-explore-and-prototype-ui-directions).

**Architecture:** Keep the exploration under `.ui-explorations/t09a-dashboard/`, outside `app/`, `components/`, and production module code. A small static HTML/CSS/ES-module preview uses one shared fixture and interaction harness, while each direction owns an independent page and manifest. The static preview is served with the already-installed Vite binary only for inspection; it is not added as an application dependency or production route. The launcher, manifests, fixture, research ledger, direction pages, and report preserve enough continuity for a later T-09B handoff without turning the spike into a second UI architecture.

**Global constraints:** Produce exactly three directions at prototype depth. Keep the accepted personal-todo terminology, authenticated ownership, list/task capabilities, status values (`todo`, `in_progress`, `done`), completed-task visibility/filter behavior, cursor-pagination affordance, and destructive-action semantics recognizable. Use the same representative fixture, required capabilities, and target viewports for every direction. Do not add backend calls, schema/migration changes, auth changes, Sanity integration, production routes, new runtime dependencies, or speculative component infrastructure. Do not claim browser, accessibility, or responsive validation without recording actual inspection evidence.

## Current state and file map

- The scaffold has only the template root page, a neutral shadcn button, theme support, and empty `(marketing)`, `(auth)`, and `(app)` route groups. There is no existing production dashboard or story/preview route to reuse.
- T-09 has delivered the list/task actions and JSON contracts, but T-09A must remain independent of those runtime adapters; fixture interactions simulate the settled behavior locally.
- The existing tokens are neutral shadcn/Tailwind CSS variables in `app/globals.css`; the preview may mirror their semantic values while exploring hierarchy and density as the primary variables.
- `.ui-explorations/t09a-dashboard/` will contain `exploration.json`, `fixture.json`, `research-ledger.json`, `directions/*.json`, `index.html`, `shared.css`, `shared.js`, one page per direction, and `report.md`.

## Exploration contract

- **User and goal:** A signed-in individual wants to capture, scan, organize, and complete personal tasks across a small set of private lists.
- **Critical scenario:** Open the private workspace, identify the active list, add a task with a note, change its status, inspect completed-task visibility, switch lists, and load more records without losing context.
- **Locked dimensions:** Product terminology, private session ownership, list/task capabilities, status semantics, completed-task filter semantics, bounded pagination, and privacy-preserving error states.
- **Free dimensions:** Information architecture, navigation model, density, hierarchy, disclosure, list/task composition, filter/search presentation, and local interaction details that preserve the locked behavior.
- **Target viewports:** 1440×900 and 1024×768 for desktop comparison; 768×1024 and 320×800 as responsive/stress checks.
- **Required states:** Normal data, empty list/task state, loading placeholder, validation/error feedback, selected list/task, disabled pending action, completed/hidden task, long title/note, and pagination continuation.

## Direction hypotheses

1. **Focus Rail — calm list-first workspace:** A persistent list rail and one focused task queue make the next action obvious for occasional users; it optimizes comprehension and low cognitive load at the cost of less simultaneous context.
2. **Status Board — throughput-oriented workboard:** A selected list becomes a three-lane status board with visible counts and direct status movement; it optimizes scanability and state visibility for frequent users at the cost of greater density and more horizontal pressure on narrow screens.
3. **Command Inspector — search-first contextual workspace:** A global capture/search field and persistent contextual inspector make retrieval and rapid editing the primary path; it optimizes fast re-entry and keyboard-oriented continuity at the cost of discoverability for users who prefer browsing.

The three directions differ on information architecture, workflow model, navigation model, composition model, content hierarchy, density, disclosure, and interaction model. Visual treatment is deliberately secondary. The divergence gate must answer what product assumption choosing one over another represents.

## Dependencies and work order

1. Persist the exploration contract, shared fixture, research ledger, and direction manifests before writing pages. Research records should capture only transferable patterns from the project plus a few official comparable-product references; external references never override the DWF.
2. Build the shared static preview shell, semantic tokens, fixture loader, and small interaction harness. Prove selection, task capture, status updates, completed filtering, list switching, and load-more behavior with the shared fixture before duplicating direction markup.
3. Implement each direction as a separately reachable page at the same fidelity. Each page must expose the critical scenario and required states using the same fixture; direction-specific markup may diverge substantially.
4. Serve the static preview with Vite and inspect every direction at the target and stress viewports using Playwright CLI. Record actual screenshots/DOM/accessibility observations and fix only material comparison defects.
5. Evaluate the portfolio against task clarity, throughput, scanability, cognitive load, state visibility, discoverability, responsive suitability, accessibility basics, and implementation complexity. Record the unresolved choice rather than forcing a winner.
6. Reconcile `TST-UI-001` with prototype evidence while leaving runtime/browser acceptance for T-09B/T-10/T-11/T-12A and `TST-E2E-003` with its owning tasks. Mark T-09A complete only after the fresh-review loop and evidence package are complete.

## Verification strategy

- Structural guard: `python .agents/skills/ui-direction-explorer/scripts/validate-directions.py .ui-explorations/t09a-dashboard` must pass with exactly three manifests and no structural errors.
- Static preview: start `pnpm exec vite .ui-explorations/t09a-dashboard --host 127.0.0.1 --port 4173`, open the launcher and each direction, and exercise the critical scenario with Playwright CLI. Capture screenshots at 1440×900, 1024×768, 768×1024, and 320×800 where the environment permits.
- Browser checks: confirm no console errors, all implemented controls are keyboard reachable, focus is visible, labels are meaningful, long content does not clip, loading/error/empty/disabled/selected states are understandable, and mobile layouts are not merely squeezed desktop layouts.
- Documentation checks: changed Markdown/JSON/HTML/CSS/JS files pass Prettier where configured; `git diff --check` passes; no production source, package manifest, lockfile, migration, snapshot, or generated application artifact changes appear in the task diff.
- Project gate: run `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build` after the prototype is complete. The existing lint warning in `app/layout.tsx` remains pre-existing if unchanged. Integration tests are reused as valid evidence because this slice does not touch persistence; no weaker substitute is introduced.

## Risks and assumptions

- No production preview route exists, so a static Vite preview is the smallest reversible mechanism that permits real browser inspection without exposing an experimental route in the application. If Vite cannot serve the directory, use the installed Playwright/browser capability against a local static server and record the limitation.
- T-09A is an exploration, not a production UI implementation. The prototype may simulate mutations in memory, but it must not imply that fixture state is persisted or that the API has been browser-verified.
- External product references are used to extract patterns, not to clone proprietary screens or copy content. Research is sufficient when additional references stop changing the hypotheses.
- TST-UI-001 remains `specified` or `partial` after this task because its full contract also requires materialized-surface runtime inspection and later browser acceptance; T-09A records only the fair prototype layer.

## Handoff to task breakdown

Turn this plan into one fresh-review task, T-09A, with these independently verifiable slices: (a) exploration contract, fixture, research ledger, and divergent manifests, (b) shared static preview harness and launcher, (c) Focus Rail direction, (d) Status Board direction, (e) Command Inspector direction, and (f) browser inspection, portfolio report, TST/UI reconciliation, TODO/checkpoint evidence, and the required fresh GPT-5.6-Sol review loop. Preserve the static isolation and all explicit scope exclusions.
