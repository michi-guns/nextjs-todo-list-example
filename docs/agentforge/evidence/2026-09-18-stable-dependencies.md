# Stable dependency refresh — 2026-09-18

Task: [T-33](../../../TODO.md#t-33-refresh-stable-dependencies-while-retaining-typescript-6).
Plan: [workflow, documentation, and dependencies](../plans/2026-09-18-workflow-documentation-dependencies.md).

## Selection and compatibility

The owner authorized current stable direct dependencies and package tooling,
with Drizzle's release-candidate line allowed and TypeScript 7 excluded.
The owner subsequently confirmed that ESLint must remain on version 9.
Registry metadata was checked on 2026-09-18. Drizzle ORM and Kit remain at
`1.0.0-rc.4`; TypeScript remains at `6.0.3`, the latest release in its allowed
major. Hashed experimental Drizzle builds and the TypeScript 7 `latest` tag
were not selected. `package.json` and `pnpm-lock.yaml` record the exact result.

Official compatibility notes checked before installation:

- [pnpm 12](https://github.com/pnpm/pnpm/releases/tag/v12.0.0) changes peer
  resolution and validates workspace settings more strictly. The existing
  allow-build policy remains applicable. The pinned
  [pnpm/setup v2](https://github.com/pnpm/setup/releases/tag/v2.0.0) supports
  pnpm 11 and later and reads the repository's package-manager declaration.
- [Next.js 16.3.5](https://github.com/vercel/next.js/releases/tag/v16.3.5)
  and [React 19.3](https://react.dev/blog/2026/09/09/react-19-3) are stable
  releases. Next and its ESLint configuration are upgraded together. The
  installed Next.js upgrading guide was read before the refresh.
- [Sanity 6 migration](https://www.sanity.io/docs/help/v5-to-v6) requires
  Node 22.12+ and React 19.2.2+. This repository uses Node 24 and has no
  custom auth provider array, removed auth mode, search configuration, or
  Vite overrides requiring the documented migrations.
- [Vitest 5 migration](https://main.vitest.dev/guide/migration/) requires
  Node 22.12+ and Vite 6.4+. pnpm resolves its required Vite peer. The new
  default clears mock history between tests; existing tests must prove
  compatibility without weakening that default. There are no inline test
  projects or benchmark API consumers to migrate.
- [ESLint 10 migration](https://eslint.org/docs/latest/use/migrate-to-10.0.0)
  supports Node 24 and flat configuration, but the actual Next.js plugin graph
  is not ready. Installing 10.10.0 produced three unsatisfied peer ranges
  (`eslint-plugin-react`, `eslint-plugin-import`, `eslint-plugin-jsx-a11y`),
  then `pnpm lint` failed loading `react/display-name` because
  `contextOrFilename.getFilename` was removed. The
  [upstream compatibility issue](https://github.com/jsx-eslint/eslint-plugin-react/issues/3977)
  matches this failure. Retain 9.39.5, the latest compatible ESLint 9 release,
  without overrides, disabled rules, or plugin patches. Its upstream
  deprecation warning is a known remaining limitation, not a passing ESLint 10
  migration. Revisit when the stable Next.js plugin graph supports ESLint 10.
- [Better Auth 1.7.5](https://github.com/better-auth/better-auth/releases/tag/v1.7.5)
  includes Drizzle adapter initialization fixes and supports the retained
  Drizzle RC line. Auth integration and browser journeys are regression gates.
- [Playwright release notes](https://playwright.dev/docs/release-notes)
  accompany the browser-tool update; install matching Chromium, Firefox,
  and WebKit revisions before exercising the existing journeys.

## Baseline before the refresh

On the unchanged application dependencies, Node 24.18.0, pnpm 11.25.0 and
Docker 29.7.2 were available. `pnpm typecheck` passed; `pnpm lint` passed
with the existing unused `Geist` warning in `app/layout.tsx`.
`pnpm test` passed 42 files / 415 tests, `pnpm test:integration` passed
6 files / 23 tests against disposable local PostgreSQL, and `pnpm test:e2e`
passed all 8 Chromium journeys.

## Upgrade verification

- pnpm 12.4.2 and the Next/React/UI group: `pnpm typecheck` and `pnpm test`
  passed (42 files / 415 tests). An intermediate optional TypeScript peer
  warning came from Sanity 5's transitive `tsconfck`; the Sanity 6 update
  removed that dependency and installation completed without peer warnings.
- Sanity 6 and its related packages: `pnpm typecheck` passed; the focused
  `pnpm exec vitest run src/sanity/config.test.ts src/modules/landing` passed
  6 files / 32 tests. `pnpm sanity:smoke` passed against the configured published
  singleton, returning the four mapped landing fields without mutations.
- Better Auth, Zod, and Vercel Functions: `pnpm typecheck`, `pnpm test`
  (42 files / 415 tests), and `pnpm test:integration` (6 files / 23 tests)
  passed. Database-backed checks used disposable local PostgreSQL.

- Vitest 5 initially failed `pnpm typecheck` at the five uses of
  `describe.sequential`. Applied its documented replacement,
  `describe(name, { concurrent: false }, callback)`, preserving suite ordering,
  assertions, and the existing serial integration configuration.
- Housekeeping removes obsolete version-specific `minimumReleaseAgeExclude`
  entries and ignores Vitest 5's new `.vitest/` report root. The existing
  build-script allowlist is unchanged. `pnpm install --frozen-lockfile` passed
  supply-chain validation for 1,621 entries; `pnpm peers check` reports no issues.

Final local gates on the upgraded packages:

| Command                                                                 | Result                                                                         |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `pnpm typecheck`                                                        | Passed                                                                         |
| `pnpm lint`                                                             | Passed; existing unused `Geist` warning only                                   |
| `pnpm test`                                                             | 42 files / 415 tests passed on Vitest 5.0.1                                    |
| `pnpm test:integration`                                                 | 6 files / 23 tests passed on disposable PostgreSQL 18                          |
| `pnpm test:e2e`                                                         | 8 Chromium journeys passed                                                     |
| `pnpm test:e2e:cross-browser`                                           | 24 journeys passed: Chromium, Firefox, WebKit                                  |
| `pnpm exec drizzle-kit check --config drizzle.config.ts`                | Passed; migration history unchanged                                            |
| `pnpm build`                                                            | Passed; Next.js 16.3.5 production build and route generation                   |
| `pnpm install --frozen-lockfile`                                        | Passed without changing dependency resolutions                                 |
| `pnpm peers check`                                                      | No peer dependency issues                                                      |
| `pnpm outdated --format json`                                           | Only the intentionally retained ESLint 9 and TypeScript 6 differ from `latest` |
| Changed-file Prettier, local Markdown links/anchors, `git diff --check` | Passed                                                                         |

Two verification interruptions were investigated, without changing checks:

- Running lint alongside Playwright initially raced with Playwright recreating
  `test-results` and produced `ENOENT`. The standalone lint rerun passed. Run
  these commands serially when they share generated directories.
- The first cross-browser run passed Chromium/Firefox, then the WebKit core
  journey reported `Load request cancelled` for the Next.js development-overlay
  font `/__nextjs_font/geist-latin.woff2`; seven remaining journeys did not run.
  Installed Next.js source identifies that resource as a development-tools
  font. A focused WebKit rerun with tracing passed and recorded HTTP 200 font
  responses; the full unchanged cross-browser rerun then passed all 24 journeys.
  No cancellation filter, retry setting, timeout, or assertion was relaxed.
  This records an intermittent development-server diagnostic, not a proven
  deterministic fix for it.

The documentation specialist updated stack/version guidance and the Production
runbook's obsolete PR wording. The parent reconciled TD-028's current reviewer
wording with the owner's accepted workflow. Protected Production approvals,
historical release evidence, and AgentForge remain in place.

Independent exact-tip review and main-push CI are integration gates still pending
at this implementation checkpoint.

## Evidence boundaries

This refresh reruns local foundation, migration, harness, persistence, auth,
list/task, concurrency, boundary, landing, UI/E2E and environment/pipeline
checks listed in the accepted plan. It does not refresh historical hosted
Preview, protected Production release, webhook delivery, or Neon performance
evidence. Their original dates and contract statuses remain intact. No database
migration or product contract change is intended, and the pre-existing
dependency stash is preserved.

Contract reconciliation: fresh local evidence supports `TST-FOUNDATION-001`,
`TST-MIGRATION-001`, `TST-HARNESS-001`, `TST-PERSISTENCE-001`,
`TST-AUTH-001`–`003`, `TST-LISTS-001`–`003`, `TST-TASKS-001`–`003`,
`TST-CONCURRENCY-001`, `TST-BOUNDARY-001`, `TST-LANDING-001`/`003`,
`TST-UI-001`, `TST-E2E-001`–`003`, `TST-ENV-001`, `TST-PIPELINE-001`,
`TST-PREVIEW-001`, and `TST-RELEASE-001`. The read-only published-content
smoke additionally refreshes `TST-LANDING-002`. Contract statuses remain
unchanged: notably, the pre-existing partial harness obligation is not closed
by these reruns, and local pipeline tests do not establish new hosted evidence.
