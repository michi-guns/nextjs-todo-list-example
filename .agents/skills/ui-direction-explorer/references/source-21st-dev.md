# Source Guide — 21st.dev

Website: https://21st.dev/
Documentation: https://docs.21st.dev/

## Role

Use 21st.dev primarily after high-level design hypotheses exist.

It is useful for:

- concrete React/Tailwind component ideas
- discovering alternate component compositions
- implementation acceleration
- inspecting real component code and dependencies
- translating an established direction into usable UI pieces

Current 21st tooling may also expose agent workflows for exploring design directions. Treat those as an additional ideation input, not as a replacement for this skill's product-specific exploration contract, shared fixture, and divergence gate.

## Sequence rule

Do not start the exploration by browsing the component catalog.

Correct sequence:

1. Understand the product problem.
2. Research comparable UX.
3. Form direction hypotheses.
4. Use 21st.dev to find components that support those hypotheses.

This avoids availability bias: "the catalog has it" is not a UX rationale.

## Access

Prefer a configured 21st integration/MCP/CLI when available and appropriate. Otherwise use accessible browser documentation/catalog pages. Do not assume authentication, quota, registry setup, or exact commands; check current docs when needed.

## Adoption policy

Before installing a component:

- inspect its dependencies
- adapt it to project tokens/conventions
- verify accessibility and responsive behavior
- avoid adding a library solely for decorative novelty
- keep prototype-only dependencies isolated

## Avoid

- letting component availability choose the information architecture
- installing several unrelated visual systems across directions
- treating preview polish as production quality
