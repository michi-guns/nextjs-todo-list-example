# Inspiration Source Selection

The five bundled sources have different jobs. Use them intentionally rather than searching every source for every request.

## Capability detection

Before external research, inspect the tools actually available.

For each source:

1. Prefer a configured native integration or MCP connection when available.
2. Otherwise use normal browser/web access when available and allowed.
3. Otherwise mark the source unavailable for this run.
4. Never claim a source was researched when it was not.
5. Continue using other available sources and project context.

Do not require the developer to configure a source unless they explicitly want richer research from it.

## Source roles

| Need                                                          | Prefer             |
| ------------------------------------------------------------- | ------------------ |
| Real shipped product screens and established UI patterns      | Mobbin, Refero     |
| End-to-end workflows and multi-screen behavior                | Page Flows, Refero |
| SaaS/web-app component composition                            | Refero             |
| Concrete React/Tailwind implementation ideas                  | 21st.dev           |
| Expressive components, interaction, motion, visual vocabulary | React Bits         |

## Recommended sequence

1. **Project context** — understand what already exists.
2. **Mobbin / Refero / Page Flows** — research comparable product and UX patterns.
3. **Independent hypotheses** — define the directions.
4. **21st.dev / React Bits** — find implementation or expression ideas after hypotheses exist.

This sequence is important. A component catalog should not decide the information architecture.

## Additional sources

These five are defaults, not a closed world. Use other sources when they are more relevant, including:

- official product documentation
- public product demos
- user-provided screenshots or Figma references
- accessibility and platform guidance
- the project's own design system and story catalog

Explain the role of additional sources when they materially influence a direction.

## Source freshness

Avoid embedding volatile counts, pricing, plan names, or exact installation commands into the exploration. If access/setup details matter, check the source's current documentation at runtime.
