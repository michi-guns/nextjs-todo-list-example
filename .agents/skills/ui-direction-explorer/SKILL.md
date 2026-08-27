---
name: ui-direction-explorer
description: Explore and prototype competing UI/UX directions. Use for design spikes, redesign options, UI inspiration, or choosing a high-level interface direction before production implementation.
compatibility: Requires project/file access for repository-aware exploration. External research is optional and depends on available web/browser or MCP tools. Rendering and visual inspection are used when available.
metadata:
  version: "3.0.0"
  category: "ui-ux-exploration"
---

# UI Direction Explorer

Explore the design space before committing production engineering effort.

The goal is not to generate several attractive screens. The goal is to create a comparable set of genuinely different product-design hypotheses, prototype them to the requested depth, and help the developer decide what direction to pursue.

## Developer Experience Contract

Assume the developer has never used this skill before.

The developer should only need to know that this skill can help explore and prototype UI/UX directions. Do not require them to understand the skill's workflow, variables, research providers, evaluation method, storage layout, or internal vocabulary.

### Default to action

When the request contains enough product intent to proceed:

1. Inspect the project and existing surface.
2. Infer reasonable constraints and defaults.
3. Briefly tell the developer what you are going to explore in plain language.
4. Begin the work.

Do not turn invocation into a configuration interview.

### Ask product questions, not skill questions

Only ask when a missing answer cannot be inferred and choosing incorrectly would materially change the exploration.

Bad: "What spike depth do you want?"

Better: "Do you only want to compare ideas, or should I build them so you can interact with them?"

Never require memorized commands. Natural-language instructions are the configuration API.

### Keep internal mechanics mostly invisible

Terms such as `direction_count`, `spike_depth`, comparison fixture, divergence gate, research ledger, and exploration contract are implementation details. Do not surface them unless doing so helps the developer or they ask.

### Guide the next decision

After an exploration, explain the meaningful trade-offs and suggest simple next actions such as:

- "Go with B."
- "Push C further."
- "Give me three more options."
- "Use A's filtering idea in C."
- "Turn B into the production implementation."

Read [references/developer-experience.md](references/developer-experience.md) when interaction or handoff behavior is ambiguous.

## Core Invariants

1. **Honor explicit count.** If the developer requests N directions, produce exactly N.
2. **Infer count when omitted.** Use a sensible number for the scope; normally 4 for a page or feature. Announce the inferred count before substantial work so it can be steered.
3. **Separate count from depth.** Number of directions and implementation depth are independent.
4. **Decision-relevant divergence.** Separate directions must test different high-level product/design hypotheses, not merely different styling.
5. **Fair comparison.** All directions solve the same primary scenario with representative data and locked product constraints unless a direction explicitly declares an intentional exception.
6. **Research before component shopping.** Understand the product problem and comparable UX patterns before browsing implementation component libraries.
7. **Synthesize, do not clone.** Learn patterns from multiple references. Never reproduce a single product's interface wholesale.
8. **Capability-aware research.** Never pretend an external source was searched. Missing web/MCP access must not block exploration.
9. **Reversible prototypes.** Keep spikes isolated and cheap to remove. Avoid backend, schema, API, or business-rule changes unless explicitly requested.
10. **Evidence over taste.** Explain what each direction optimizes for and what it sacrifices.
11. **Visual verification when possible.** Render and inspect prototypes when the environment supports it. Never claim visual validation if it was not performed.
12. **Human decision support.** Do not force a winner when the product evidence does not justify one; expose the real decision instead.
13. **Continuity.** Reuse prior exploration state when it exists so the developer does not need to remember previous choices or skill internals.

## Interpret the Request

Infer these concepts internally from natural language.

### Number of directions

- Explicit number: obey exactly.
- "a couple": 2.
- "a few": normally 3.
- "several": normally 4.
- No number: normally 4 for a page/feature, 3 for a narrow workflow, and up to 5 for broad greenfield exploration.

Do not silently reduce a developer-requested count because it is large.

### Exploration depth

Read [references/spike-depth.md](references/spike-depth.md) when depth is not obvious.

Use:

- **brief** when the developer asks for ideas, concepts, directions, or exploration without implementation.
- **prototype** by default when they ask for spikes, prototypes, mockups in code, or to "show" competing UI approaches in the project.
- **integrated** only when they explicitly want alternatives implemented in the real application architecture or want a selected direction productionized.

If the wording is vague but this skill was intentionally invoked to prototype UI/UX, prefer **prototype**.

## Workflow

Read [references/workflow.md](references/workflow.md) for detailed execution guidance.

### 1. Inspect before designing

Inspect the repository and current product surface before asking the developer to explain their own codebase.

Look for what is relevant, such as:

- routes, screens, navigation, and nearby flows
- existing design system, tokens, components, icons, and typography
- package/framework conventions
- domain types, representative data, API contracts, permissions, and business rules
- responsive conventions and target platforms
- existing tests, stories, preview routes, or fixture systems

Treat existing business behavior as intentional unless the request or evidence says otherwise.

### 2. Establish exploration boundaries

Internally distinguish:

- product goal and primary user task
- locked constraints
- dimensions that are free to change
- target platform/viewports
- critical scenarios every direction must support
- requested direction count
- exploration depth

Read [references/exploration-contract.md](references/exploration-contract.md).

Persist this state when project write access exists, following [references/continuity.md](references/continuity.md).

### 3. Research the problem

Read [references/research-strategy.md](references/research-strategy.md) and [references/source-selection.md](references/source-selection.md).

Prefer evidence that solves comparable user problems, workflows, information density, and interaction complexity. Research patterns, not merely attractive visuals.

The bundled source guide covers Mobbin, Refero, Page Flows, 21st.dev, and React Bits. Other high-quality sources may be used when they are more relevant.

Do not let an implementation catalog determine the UX before design hypotheses exist.

### 4. Create directions before implementation

Form the requested number of direction briefs before coding them.

Each direction needs a clear answer to:

- What is the core product/design hypothesis?
- What does this optimize for?
- How does the information architecture work?
- What is the primary interaction/navigation model?
- What is materially different from the other directions?
- What does it sacrifice?
- Which observed patterns informed it?

Use [references/direction-archetypes.md](references/direction-archetypes.md) only to expand the search space, not as a menu of presets.

### 5. Run the divergence gate

Read [references/divergence.md](references/divergence.md).

For every pair of directions, ask:

> What meaningful product/design decision would choosing A over B represent?

If there is no strong answer, the pair is not divergent enough. Replace or materially revise the weaker direction before implementation.

Color, typography, radius, spacing, shadows, gradients, and animation style alone never constitute separate UX directions.

### 6. Create a fair comparison fixture

Use the same representative user scenario, realistic content/data, required capabilities, and target viewport across directions.

Do not make one direction look cleaner by giving it less information or fewer states.

The fixture may include deliberate stress cases when density, responsiveness, or edge conditions are central to the decision.

### 7. Build at the requested depth

Read [references/spike-depth.md](references/spike-depth.md).

For prototypes:

- Prefer the project's real tokens/components when they do not suppress the intended concept.
- Prefer an existing preview mechanism such as Storybook, a dev route, or the framework's established pattern.
- Otherwise create an isolated, clearly experimental surface consistent with the stack.
- Use realistic fixture data.
- Implement the minimum interaction needed to communicate the hypothesis.
- Avoid production abstractions, backend changes, migrations, or unrelated refactors.
- Keep every direction independently removable.

### 8. Render and inspect

When rendering/browser/simulator tooling is available:

1. Render each direction at the target viewport.
2. Inspect hierarchy, overflow, density, states, accessibility basics, and interaction clarity.
3. Correct obvious issues.
4. Re-render material corrections.

Read [references/quality-gates.md](references/quality-gates.md).

If visual inspection is unavailable, say so in the final handoff instead of claiming it passed.

### 9. Evaluate the portfolio

Read [references/evaluation.md](references/evaluation.md).

Evaluate against criteria derived from the product goal, not a universal fixed scoring formula. Prefer qualitative evidence such as Strong / Mixed / Weak, or a simple 1-5 scale with explanations when useful.

Then perform a second portfolio-level divergence review. The full set should teach the team different things.

### 10. Present for a decision

Present each direction with:

- memorable name/identifier
- one-sentence hypothesis
- what it optimizes for
- key UX model
- main advantage
- main trade-off
- important inspiration/pattern evidence
- where to view the prototype, if implemented

Then explain the **main decision the developer is actually making** between the strongest approaches.

Recommend a direction only when the goals and evidence justify it. Otherwise explain what product assumption determines the choice.

Finish with a few plain-language next actions. Do not require the developer to know how the skill works.

## Natural-Language Overrides

Explicit developer instructions always beat defaults.

Examples:

- "Give me 7" -> exactly 7 directions.
- "Ideas only" -> brief depth; do not implement prototypes.
- "Don't browse" -> use project context and bundled guidance only.
- "Mobile only" -> target mobile.
- "Keep the sidebar" -> navigation is locked.
- "Don't change the workflow" -> preserve task sequence and business behavior.
- "Make them wild" -> increase visual/conceptual risk while preserving required usability and product constraints.
- "Push B further" -> preserve B's core hypothesis and explore it more deeply.
- "Use A's filters in C" -> transfer the element only if it does not contradict C's core hypothesis.
- "Make C real" -> move the selected direction toward integrated/production implementation.

## Source Files

Load only what the current phase needs:

- [references/developer-experience.md](references/developer-experience.md) — zero-knowledge developer interaction and handoff.
- [references/workflow.md](references/workflow.md) — detailed end-to-end execution.
- [references/exploration-contract.md](references/exploration-contract.md) — product goal, constraints, fixtures, and assumptions.
- [references/research-strategy.md](references/research-strategy.md) — how to research without anchoring or cloning.
- [references/source-selection.md](references/source-selection.md) — source roles and capability fallback.
- [references/source-mobbin.md](references/source-mobbin.md) — Mobbin guidance.
- [references/source-refero.md](references/source-refero.md) — Refero guidance.
- [references/source-page-flows.md](references/source-page-flows.md) — Page Flows guidance.
- [references/source-21st-dev.md](references/source-21st-dev.md) — 21st.dev guidance.
- [references/source-react-bits.md](references/source-react-bits.md) — React Bits guidance.
- [references/direction-archetypes.md](references/direction-archetypes.md) — search-space expansion prompts.
- [references/divergence.md](references/divergence.md) — semantic divergence gate.
- [references/spike-depth.md](references/spike-depth.md) — brief/prototype/integrated semantics.
- [references/evaluation.md](references/evaluation.md) — adaptive comparison criteria.
- [references/quality-gates.md](references/quality-gates.md) — implementation/render review.
- [references/anti-patterns.md](references/anti-patterns.md) — common failure modes.
- [references/continuity.md](references/continuity.md) — repository-backed exploration memory.
- [references/maintenance.md](references/maintenance.md) — regression-driven maintenance of the skill itself.

## Deterministic Validation

When an exploration manifest exists, `scripts/validate-directions.py` can lint structural issues such as count mismatches, duplicate identifiers, missing hypotheses, and obvious categorical similarity.

The script is a guardrail, not a substitute for semantic UX judgment.
