# Quality Gates

Before completion, run the checks relevant to the change:

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm test:integration` when persistence or harness behavior changed
- `pnpm exec playwright test` for affected user journeys
- migration generation/checks when database schema changes
- `pnpm build`
- `git diff --check`

Pushes and pull requests to `main` run the same typecheck, lint, unit,
migration-shape, build, integration, and Chromium Playwright commands in
[`.github/workflows/ci.yml`](../../.github/workflows/ci.yml). That workflow
does not deploy, create Preview branches, mutate Sanity, or use Production
secrets.

Do not hide failures. Distinguish pre-existing failures from regressions introduced by the change.
