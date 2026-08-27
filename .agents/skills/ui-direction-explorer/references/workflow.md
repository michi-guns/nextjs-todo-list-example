# Detailed Workflow

Use this file when executing a full exploration.

## Phase 0 — Recover context

Before starting a new exploration, check whether a relevant `.ui-explorations/` entry already exists. If so, read its state and determine whether the developer is continuing it, branching it, or starting fresh.

Do not overwrite a previous exploration silently.

## Phase 1 — Repository reconnaissance

Inspect only the parts of the repository needed to understand the surface.

Prioritize:

1. Target route/screen/component.
2. Parent layout and navigation.
3. Shared design tokens and components.
4. Domain types and representative data.
5. Existing interaction/business behavior.
6. Related screens that establish product conventions.
7. Preview/test infrastructure.

Record facts separately from assumptions.

Do not infer that every existing visual choice is a hard constraint. Business rules and contracts deserve stronger preservation than incidental layout or styling.

## Phase 2 — Frame the exploration

Build an internal exploration contract with:

- product goal
- primary user and critical task
- target surface/platform
- requested or inferred direction count
- requested or inferred depth
- locked constraints
- free dimensions
- required states/capabilities
- comparison scenario
- target and stress viewport(s)

Use `assets/exploration-contract.template.json` as a structure when persisting.

## Phase 3 — Research

Research in this order:

1. Existing product and design system.
2. Comparable product/UX patterns.
3. End-to-end flow evidence when the problem is workflow-heavy.
4. Visual vocabulary.
5. Component/implementation inspiration only after hypotheses begin to form.

Record useful evidence in a research ledger. Prefer a few high-relevance observations over a large screenshot dump.

Stop researching when new references stop changing the candidate hypotheses.

## Phase 4 — Generate a larger internal candidate pool

Before selecting the requested directions, consider more hypotheses internally than will be presented. The purpose is to avoid converging on the first obvious patterns.

For a normal request, generating roughly `direction_count + 2` conceptual candidates is usually enough. This is a heuristic, not a developer-visible requirement.

Candidates should differ primarily on high-impact dimensions such as information architecture, workflow model, navigation, hierarchy, composition, and disclosure—not cosmetic style.

## Phase 5 — Select the portfolio

Choose exactly the developer-requested/inferred number of directions.

For each candidate, write a one-sentence core hypothesis and answer:

- Which user/product assumption does this test?
- What does it optimize for?
- What is its primary trade-off?
- Which other direction is it most similar to, and why is it still meaningfully different?

Run the semantic divergence gate before coding.

## Phase 6 — Normalize the comparison

Create one comparison fixture containing:

- same primary scenario
- same realistic data/content set
- same required capabilities
- same core states
- same target viewport(s)

A direction may intentionally expose information differently, but it may not omit inconvenient data merely to look cleaner unless that omission is part of a declared product hypothesis.

## Phase 7 — Implement

Follow the depth rules in `references/spike-depth.md`.

### Isolation preference order

1. Existing story/preview environment.
2. Existing development-only route or sandbox convention.
3. New isolated development route/component family consistent with the framework.
4. Standalone prototype only when integrating with the project would add unnecessary risk or effort.

Do not introduce a new framework just to prototype unless the developer asks.

### Reuse policy

Reuse existing design tokens, primitives, icons, domain types, and utilities when useful. Do not force every direction through existing higher-level components if those components encode the very layout being explored.

### Dependency policy

Prefer zero new runtime dependencies. Add a dependency only when it is material to the hypothesis and the cost is justified. Keep experimental dependencies isolated and easy to remove.

## Phase 8 — Visual and interaction review

When tooling permits:

- render each direction
- exercise its primary task
- inspect target viewport
- inspect one stress viewport if responsive behavior matters
- check obvious accessibility and focus issues
- correct material defects

Do not over-polish one direction while leaving others rough; comparison fidelity matters more than isolated perfection.

## Phase 9 — Evaluate

Derive evaluation criteria from the product goal. Compare directions against the same criteria.

Avoid false precision. A useful comparison explains why a direction is stronger or weaker for a criterion.

Then review the portfolio as a whole:

> What decision would selecting each direction actually represent?

If two directions teach the same lesson, revise the portfolio even if both are individually good.

## Phase 10 — Handoff

The final handoff should be compact and decision-oriented:

1. What was explored.
2. Each direction's hypothesis and trade-off.
3. The most important comparison.
4. Any material validation limitation.
5. Simple next actions.

Do not make the developer read internal manifests or research logs unless they ask.
