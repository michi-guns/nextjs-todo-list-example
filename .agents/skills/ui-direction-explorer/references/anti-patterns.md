# Anti-Patterns

## Five skins of one layout

Symptoms:

- same sidebar
- same card grid
- same hierarchy
- different colors/radius/gradients

Fix: return to the product hypothesis and change a high-impact dimension.

## Component-catalog-driven UX

Symptom:

> We found a cool component, so the page is organized around it.

Fix: establish the UX model before searching implementation libraries.

## Famous-product cloning

Symptom:

> Make one Linear, one Stripe, one Notion.

Fix: extract transferable patterns from multiple products and recombine them around this project's constraints.

## Unequal fixtures

Symptom: the cleanest direction has the least realistic data.

Fix: use the shared comparison fixture.

## Novelty for divergence's sake

Symptom: odd navigation or interaction exists only because the directions had to be different.

Fix: every major difference needs a plausible user/product rationale.

## Configuration interview

Symptom: the developer is asked to choose count, depth, research sources, rubrics, and constraints before anything happens.

Fix: infer defaults, inspect the repo, and ask only high-value product questions.

## Exposing internal vocabulary

Symptom:

> Choose your spike_depth and divergence threshold.

Fix: translate choices into ordinary language or keep them internal.

## Research theater

Symptom: claiming Mobbin/Refero/etc. inspired the result without actually accessing them.

Fix: record capabilities and evidence; say when a source was unavailable.

## Research dump

Symptom: dozens of screenshots/links with no extracted principles.

Fix: keep a concise evidence ledger tied to hypotheses.

## Styling before UX

Symptom: the first decisions are fonts, gradients, colors, and animation.

Fix: solve architecture, task flow, hierarchy, composition, and disclosure first.

## Overproduction

Symptom: prototypes trigger API rewrites, schema changes, exhaustive tests, and architecture refactors.

Fix: isolate spikes and optimize for learning.

## Underproduction

Symptom: a "prototype" is a static skeleton too incomplete to evaluate its core interaction.

Fix: implement the primary scenario and material interaction.

## Frankenstein winner

Symptom: every liked element from every direction is merged into one incoherent screen.

Fix: preserve the selected direction's core hypothesis; transfer only compatible elements.

## Premature winner

Symptom: the agent declares the most visually polished option objectively best.

Fix: evaluate against product-specific criteria and surface unresolved trade-offs.

## Ignoring existing product conventions

Symptom: every exploration invents new buttons, icons, tokens, and patterns even when the project already has robust primitives.

Fix: reuse stable primitives unless they prevent meaningful exploration.

## Existing UI as untouchable law

Opposite symptom: every direction keeps current layout because existing components make it easy.

Fix: distinguish product invariants from incidental implementation history.

## Desktop shrink-wrap mobile

Symptom: responsive exploration simply compresses a dense desktop composition.

Fix: reconsider information priority and interaction model for mobile.

## False validation

Symptom: declaring responsiveness/accessibility/visual quality without rendering or testing.

Fix: state what was actually checked and what remains unverified.
