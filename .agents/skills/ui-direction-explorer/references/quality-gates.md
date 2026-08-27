# Quality Gates

Quality gates keep prototype comparisons credible without turning spikes into production projects.

## Gate 1 — Before implementation

Each selected direction must have:

- a distinct identifier/name
- a one-sentence core hypothesis
- a plausible user/product rationale
- a primary optimization target
- a primary trade-off
- at least one decision-relevant difference from every close neighbor
- the same comparison fixture and required capabilities

Do not code a direction that exists only as a visual mood.

## Gate 2 — Structural implementation

For each prototype verify:

- it can be reached/viewed independently
- it uses the shared fixture or equivalent identical data
- it supports the critical scenario
- experimental code is isolated
- it does not silently alter backend contracts or business rules
- new dependencies are justified
- it does not break the normal application path merely to host the spike

## Gate 3 — Visual review

When render tooling exists, inspect rather than assuming generated code looks correct.

Check:

- hierarchy is visible at a glance
- no accidental overflow/clipping
- content density is representative
- long labels/content do not immediately collapse the layout
- interactive controls look interactive
- focus/selected/disabled/error states are understandable when relevant
- primary and secondary actions are distinguishable
- overlays/drawers/modals fit the viewport
- responsive behavior does not become a squeezed desktop layout
- motion does not obscure task state

## Gate 4 — Accessibility basics

At prototype depth, at minimum avoid obvious regressions:

- semantic interactive elements when practical
- keyboard reachability for implemented interactions
- visible focus
- meaningful labels
- no color-only critical state distinction
- reasonable contrast using project tokens
- reduced-motion respect when significant animation is introduced

Productionization should apply the project's full accessibility standard.

## Gate 5 — Comparison fairness

Review all directions side-by-side:

- similar level of polish
- same data burden
- same required tasks
- same viewport
- no direction has selectively omitted difficult states

Do not polish the favored direction more heavily before the team decides.

## Gate 6 — Portfolio divergence

Ask for each pair:

> What decision does this pair test?

If the answer is cosmetic, revise.

## Gate 7 — Handoff integrity

State which checks were actually performed.

Never say "visually validated," "responsive," or "accessible" merely because the code appears likely to be so.
