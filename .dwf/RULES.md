# Project Design Rules

These are mandatory project constraints. They constrain both the product and technical contract; they do not prescribe executor-internal coding tasks.

## Product and architecture

- This repository remains a standalone public example. Do not invent links to unrelated or private products.
- Keep the domain intentionally small: authenticated personal lists and tasks plus editorial landing content.
- Users own only their own lists and tasks. Do not introduce teams, organizations, shared lists, or a parallel tenant model without an explicit product decision.
- PostgreSQL/Drizzle owns Better Auth records, lists, tasks, ownership, status, timestamps, and relational integrity.
- Sanity owns landing editorial content only. Todos never live in Sanity.
- Keep domain rules independent of Next.js, React, Drizzle, Sanity, HTTP, and browser APIs.
- Keep framework/provider details behind infrastructure adapters and validate untrusted inputs with Zod at server boundaries.
- Prefer existing repository extension points. Do not reshape source code merely to mirror conceptual design nouns.

## Repository and safety

- Package manager: pnpm.
- Read the relevant Next.js guide under `node_modules/next/dist/docs/` before writing code because this repository uses a breaking-change-sensitive Next.js version.
- Do not commit secrets, `.env*` values, tokens, or credentials.
- Keep commits coherent and avoid rewriting shared history or force-pushing `main`.
- Husky/lint-staged and the scripts in `package.json` are the local quality baseline.

## Design and Delivery separation

- `.dwf/` is canonical product/technical design authority.
- Delivery state belongs outside `.dwf/` in the Delivery System's Roadmap → Milestone → Phase artifacts.
- Delivery must not create a task hierarchy beneath Phase or prescribe file-by-file implementation decomposition.
- Code Factory/implementation execution owns tasks, coding strategy, branches/worktrees, and internal test sequencing.
- Trello artifacts, when used, are operational/projection state and must not silently become canonical design or Delivery truth.
- Genuine product/technical gaps must return to `.dwf/`; Delivery must not resolve them by assumption.
