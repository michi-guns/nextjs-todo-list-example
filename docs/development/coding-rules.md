# Coding Rules

- Use TypeScript and the repository’s existing formatting conventions.
- Keep modules cohesive and imports flowing inward toward domain rules.
- Prefer explicit names from the todo domain over generic utility names.
- Keep shared code genuinely cross-cutting.
- Do not put authorization only in UI controls.
- Do not expose secrets or commit `.env` values.
- Prefer the smallest abstraction that improves clarity or testability.
