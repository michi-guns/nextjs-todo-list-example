<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Agent operating notes

## Product intent

- Read [`.dwf/README.md`](.dwf/README.md), [`.dwf/RULES.md`](.dwf/RULES.md), and [`docs/documentation-protocol.md`](docs/documentation-protocol.md) before meaningful changes.
- Read [`.dwf/PRD.md`](.dwf/PRD.md) and [`.dwf/SPEC.md`](.dwf/SPEC.md) before implementing product, domain, architecture, persistence, or integration behavior.
- Read relevant [`.dwf/ADRs/`](.dwf/ADRs/), open questions/decisions, and supporting architecture/data/domain documents.
- Treat `.dwf/` as the canonical product/technical design authority. Delivery artifacts live outside `.dwf/` and must reference, not redefine, it.
- This repo is a standalone public example. Do not invent links to other products or private projects.

## Trello Work Units

- Board (exact name): `Next.js Todo List Example`
- Always pass `--board "Next.js Todo List Example"` to `jz-trello-flow`.
- Card titles use prefix **`WU-N: `** (example: `WU-4: Scaffold module bowl dirs with gitkeep`). Keep metadata `id` and title prefix in sync when renaming.
- Managed skills (installed under `.agents/skills/`):
  - `trello-work-orchestrator`
  - `trello-work-design`
  - `trello-work-deliver`
  - `trello-work-recover`
- Load the matching skill before design, delivery, orchestration, or recovery work.
- Canonical lists: Inbox, In Design, Ready, In Progress, Review, Blocked, Done.
- Prefer `jz-trello-flow docs` as command syntax authority.
- Do not archive Done cards unless a human asks.
- Experimental board cache: [`.jz-trello/board-cache.json`](.jz-trello/board-cache.json) (schema: [`board-cache.schema.json`](.jz-trello/board-cache.schema.json)). Projection + soft sequence only; **Trello wins** on status/identity. Refresh via `list` before relying on it after remote changes. See [`.jz-trello/README.md`](.jz-trello/README.md).

## Git strategy (simple / flexible)

- **No PR requirement.** No protected-branch ceremony for this spike.
- Agents and humans may:
  - commit and **push directly to `main`**, or
  - use short-lived branches and merge locally / on GitHub however is convenient.
- Keep commits coherent and messages clear enough to skim history.
- Do not force-push `main` unless the operator explicitly asks.
- Do not rewrite shared history casually.
- Secrets stay out of git (`.env*`, tokens, credentials).

## Local quality

- Package manager: pnpm (see `packageManager` / lockfile if present).
- Husky + lint-staged run on commit when configured.
- Prefer `pnpm typecheck`, `pnpm lint`, `pnpm test`, and Playwright scripts from `package.json` / SPEC before calling work done.
