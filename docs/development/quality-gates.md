# Quality Gates

Before completion, run the checks relevant to the change:

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm exec playwright test` for affected user journeys
- migration generation/checks when database schema changes
- `git diff --check`

Do not hide failures. Distinguish pre-existing failures from regressions introduced by the change.
