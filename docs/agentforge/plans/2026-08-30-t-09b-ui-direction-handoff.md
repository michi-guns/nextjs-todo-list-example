# T-09B UI direction handoff implementation plan

> AgentForge plan. Use `task-breakdown` after this plan is accepted.

**Status:** Accepted

**Goal:** Select the dashboard direction that best fits the accepted personal-todo product contract and leave an implementation-ready handoff for the production landing, auth, and dashboard surfaces.

**Spec and decisions:** [Agent PRD §5.5 Surfaces](../../../.dwf/output/agent/PRD.md#55-surfaces), [Agent PRD §5 Product shape](../../../.dwf/output/agent/PRD.md#5-product-shape), [Agent SPEC §9 UI](../../../.dwf/output/agent/SPEC.md#9-ui), [Agent SPEC §14.6 Presentation boundary](../../../.dwf/output/agent/SPEC.md#146-presentation-boundary), [D-001](../../../.dwf/decisions/PRODUCT.md#d-001), [D-003](../../../.dwf/decisions/PRODUCT.md#d-003), [D-004](../../../.dwf/decisions/PRODUCT.md#d-004), [D-009](../../../.dwf/decisions/PRODUCT.md#d-009), [TD-009](../../../.dwf/decisions/TECHNICAL.md#td-009), [TD-020](../../../.dwf/decisions/TECHNICAL.md#td-020), [TST-UI-001](../../../.dwf/decisions/TESTING.md#tst-ui-001), and the completed [T-09A exploration plan](2026-08-30-t-09a-ui-direction-exploration.md).

**Architecture:** Treat the T-09A static exploration as the evidence source and record one presentation decision outside `.dwf`. Select **Focus Rail**: a persistent list context with one calm task queue. It directly matches the locked app-shell shape (list sidebar plus task main panel), performs strongly for first-open comprehension and narrow viewports, and has the lowest implementation complexity while preserving every required list/task capability. Update the exploration metadata/report with the decision and add an implementation handoff that names the information architecture, interaction model, visual hierarchy, composition boundaries, responsive rules, accessibility requirements, state matrix, and reusable tokens/primitives. Do not add production routes, React components, APIs, schema changes, dependencies, or a new DWF decision because this task chooses a presentation direction without changing product behavior or a technical boundary.

**Global constraints:** Preserve the authenticated personal-list model, list/task terminology, `todo` / `in_progress` / `done` semantics, completed-task visibility, cursor-pagination affordances, privacy-preserving errors, and destructive-action meaning. Keep landing and auth as extension notes owned by T-11; they inherit tokens, hierarchy, and focus treatment but never expose private task controls or provider payloads. Use the existing shadcn/Tailwind semantic token vocabulary and the project's composition/accessibility guidance. Keep prototype assets and handoff links outside `.dwf`; `.dwf` remains the authority.

## Current state and file map

- `.ui-explorations/t09a-dashboard/exploration.json` records three directions and currently defers the decision with `status: "comparing"`.
- `.ui-explorations/t09a-dashboard/report.md` contains the shared fixture, inspection evidence, portfolio comparison, and explicit T-09A scope. It must gain a concise decision section and a status update without rewriting the historical evidence.
- `.ui-explorations/t09a-dashboard/directions/*.json` and their static pages are the comparable source material. The Focus Rail manifest already describes the selected high-level model and landing/auth extension notes.
- `.ui-explorations/t09a-dashboard/` is the only production-facing input from T-09A. A new `handoff.md` in that directory will be the durable implementation brief consumed by T-10 and T-11.
- `.dwf/decisions/TESTING.md` owns `TST-UI-001`; its status remains `partial` because this task can close the direction-selection/prototype layer but cannot prove materialized Next.js runtime or end-to-end behavior.
- `TODO.md` owns delivery status. Task-breakdown will add the plan link, exact file scope, acceptance criteria, checks, and evidence fields to T-09B; implementation closeout will mark only T-09B complete.

## Dependencies and work order

1. Reconfirm the three manifests, shared fixture, report comparison, and authoritative PRD/SPEC/decision constraints. No external service or database branch is required.
2. Evaluate the directions against explicit product-derived criteria: first-open comprehension, task capture, status visibility, retrieval/continuity, narrow-viewport suitability, accessibility basics, and implementation complexity. Record why Focus Rail wins and the material status-visibility trade-off it accepts; keep Status Board and Command Inspector as rejected alternatives with links.
3. Update `exploration.json` to represent a selected decision and preserve the dashboard-only prototype scope. Update `report.md` with the decision and evidence links, then add `handoff.md` as the implementation brief.
4. Reconcile `TST-UI-001` and `TODO.md` with exact evidence, run structural/document checks, and perform the required fresh GPT-5.6-Sol pragmatic review loop before delivery. If a review changes the handoff, repeat the review against the changed tip.
5. After T-09B is merged, recompute the graph. T-10 and T-11 become dependency-satisfied UI implementation candidates; T-16 remains independently eligible only if its Neon prerequisite preflight is available.

## Verification strategy

- Run `python .agents/skills/ui-direction-explorer/scripts/validate-directions.py .ui-explorations/t09a-dashboard`; it must report exactly three directions, zero errors, and no new structural warnings.
- Parse the changed JSON manifests with Python and verify the selected direction, prototype link, fixture identity, and status/surface fields are internally consistent.
- Check every relative link in `handoff.md`, the updated report, the exploration manifest, the plan, and the T-09B TODO entry resolves to a repository file or a deliberately named future task; do not invent runtime routes.
- Run changed-file Prettier checks, `git diff --check`, `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build`. Reuse the valid T-09A browser/preview evidence because this slice changes no executable surface; do not claim new runtime or end-to-end evidence.
- Fresh-review acceptance requires an independent GPT-5.6-Sol reviewer at medium reasoning to report actionable findings only and to judge the decision and handoff proportionally against the DWF. Fix every actionable finding, rerun affected checks, and obtain a fresh review for each changed tip until no actionable findings remain.

## Risks and assumptions

- Focus Rail is a presentation choice, not a new product decision: the PRD already locks the sidebar-plus-task-panel shell, and no behavior or technical boundary changes. If the handoff would require changing those contracts, stop and raise a Design Gap instead of silently editing `.dwf`.
- Prototype inspection cannot prove authenticated ownership, persistence, or Next.js runtime behavior. The handoff must explicitly defer those obligations to T-10, T-11, T-12A, and T-15 while retaining the required states for their implementation.
- A single calm queue sacrifices simultaneous cross-status visibility. The production brief mitigates this with explicit status labels/controls, the completed-task toggle, and clear selected-list context rather than importing the Status Board's density.
- Landing/auth are not re-prototyped in this task. Their extension requirements are concrete enough for T-11: reuse selected tokens, hierarchy, responsive spacing, and visible focus while keeping Sanity/Better Auth boundaries intact.
- No new ADR is warranted: this is a reversible UI handoff for an already-accepted presentation boundary, and the exploration report plus handoff are the established artifact location.

## Handoff to task breakdown

Turn this plan into one fresh-review task, T-09B, with coherent slices for (a) evidence-backed evaluation and selection, (b) exploration metadata/report reconciliation, (c) the implementation-ready handoff artifact, and (d) validation, test-contract reconciliation, TODO/checkpoint evidence, and the fresh reviewer loop. Keep production implementation explicitly out of scope. The resulting handoff must let T-10 build the dashboard and T-11 build landing/auth without inventing a competing visual or interaction direction.
