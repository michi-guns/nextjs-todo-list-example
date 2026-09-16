# Quality Gates

Before completion, run the checks relevant to the change:

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm test:pipeline` when environment profiles, target guards or delivery behavior changes
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

Delivery changes also need the relevant evidence from
[TST-ENV-001 and the pipeline contracts](../../.dwf/decisions/TESTING.md#tst-env-001).
Local injected failures prove orchestration/refusal; real Preview/Production
claims need their authorized hosted evidence. The
[baseline evidence matrix](../agentforge/evidence/2026-09-16-pipeline-closeout.md)
records that distinction. A Production release additionally requires exact-SHA
main-push CI and protected approval under the [release runbook](../runbooks/production-release.md).

For a documentation-only change, check command shapes against their owning
scripts/workflows, links/anchors, changed-file Prettier and the diff. Reuse
unchanged-code evidence with its original attribution. Commit hooks and hosted
CI remain enabled. Each non-trivial task needs fresh independent review of its
latest artifact before merge; code/test fixes require affected checks and a
fresh review.

Do not hide failures. Distinguish pre-existing failures from regressions introduced by the change.
