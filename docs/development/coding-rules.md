# Coding Rules

- Use TypeScript and the repository’s existing formatting conventions.
- Keep modules cohesive and imports flowing inward toward domain rules.
- Prefer explicit names from the todo domain over generic utility names.
- Keep shared code genuinely cross-cutting.
- Do not put authorization only in UI controls.
- Do not expose secrets or commit `.env` values.
- Prefer the smallest abstraction that improves clarity or testability.
- Follow the agent-first stack rule in [`TD-028`](../../.dwf/decisions/TECHNICAL.md#td-028): current documented defaults, with Drizzle, Better Auth, and Zod 4 as named exceptions.
