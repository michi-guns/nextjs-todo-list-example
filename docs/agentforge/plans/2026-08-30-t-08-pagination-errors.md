# T-08 shared pagination and error contracts implementation plan

> AgentForge plan. Use `task-breakdown` after this plan is accepted.

**Status:** Accepted

**Goal:** Provide small, framework-independent pagination and error-contract primitives that list/task presentation adapters can use consistently without moving capability rules or HTTP composition into `shared/`.

**Spec and decisions:** [Agent SPEC §1.1–1.4](../../.dwf/output/agent/SPEC.md#11-module-layers), [§4.4 Cursor pagination](../../.dwf/output/agent/SPEC.md#44-cursor-pagination), [§7 HTTP / Action API contract](../../.dwf/output/agent/SPEC.md#7-http--action-api-contract), [§8 Validation](../../.dwf/output/agent/SPEC.md#8-validation-zod), and [§14.6 Presentation boundary](../../.dwf/output/agent/SPEC.md#146-presentation-boundary); [TD-006](../../.dwf/decisions/TECHNICAL.md#td-006), [TD-008](../../.dwf/decisions/TECHNICAL.md#td-008), and [TD-020](../../.dwf/decisions/TECHNICAL.md#td-020); [TST-LISTS-003](../../.dwf/decisions/TESTING.md#tst-lists-003), [TST-TASKS-003](../../.dwf/decisions/TESTING.md#tst-tasks-003), and [TST-BOUNDARY-001](../../.dwf/decisions/TESTING.md#tst-boundary-001).

**Architecture:** Add `src/shared/pagination.ts` as the single owner of the stable `Page<T>`/page-request shape, default and maximum page limits, and a Zod-backed parser for untrusted URL pagination parameters. The parser validates a non-blank opaque cursor lexeme and integer limits from 1 through 100; list/task cursor codecs remain capability-owned because only they know their scope and filter context. Add `src/shared/error-contract.ts` as a plain-data mapper from known application error codes (`unauthenticated`, `not_found`, `conflict`, and `invalid_input`) to the accepted HTTP status and `{ error: { code, message } }` envelope, with a safe internal-error fallback. Refactor the list/task repository ports and application/infrastructure limit constants to consume the shared pagination primitives, while preserving their existing domain-specific validation errors and cursor codecs. T‑09 will turn the mapped data into `Response` objects and use module-owned input schemas; T‑08 will not add routes, actions, or UI.

**Global constraints:** Keep `shared/` independent of `modules/`, `app/`, Next.js, React, Drizzle, Sanity, and HTTP response classes. Use the installed Zod version and existing TypeScript/Prettier conventions. Do not change the accepted page shape, cursor opacity, ownership predicates, completed-task semantics, or database schema/migrations. Keep repository reads bounded to `limit + 1` and avoid follow-up queries per returned row. Preserve existing public module exports where practical so T‑09 can adopt the shared types without a broad import rewrite.

## Current state and file map

- `src/modules/lists/application/list-repository.ts` and `src/modules/tasks/application/task-repository.ts` each define a duplicate `Page<T>` and page-request shape.
- `src/modules/lists/application/list-use-cases.ts`, `src/modules/tasks/application/task-use-cases.ts`, and both Drizzle repositories repeat the 20/100 pagination limits and retain capability-specific invalid-request errors.
- `src/modules/lists/application/list-cursor.ts` and `src/modules/tasks/application/task-cursor.ts` already validate opaque, context-bound cursor payloads and must remain the owners of those semantics.
- `src/modules/auth/presentation/current-user.ts`, list/task domain errors, and landing presentation code expose expected error outcomes in different locations; no shared HTTP envelope mapper exists.
- `app/` currently contains auth and Sanity routes only. Private list/task routes and Server Actions are intentionally T‑09 scope.
- Existing list/task PostgreSQL suites prove ordering, cursor continuation, filter behavior, and bounded reads at small limits. T‑08 will add maximum-page-size continuation evidence without changing schema or query ownership.

## Dependencies and work order

1. Confirm the current `main` state, T‑08 prerequisites, installed Zod API, and disposable local PostgreSQL availability; keep the complete migration chain unchanged.
2. Add failing unit tests for shared pagination parsing, stable page shape/constants, known error-to-status/envelope mapping, and safe unknown-error handling.
3. Implement the shared pagination and error contracts, then refactor list/task ports and limit consumers while keeping capability-specific error and cursor behavior intact.
4. Add PostgreSQL regressions that request a 100-record page and continue through a 101st list/task record, proving ordering, continuation, terminal cursors, and the existing `limit + 1` strategy at the accepted maximum.
5. Reconcile the three affected TST contracts, run the project gates, update the PR metadata, and complete the fresh GPT‑5.6‑Sol pragmatic review loop.

## Verification strategy

- `TST-LISTS-003`: shared parser tests cover default 20, accepted 1/100, rejection outside the range, blank/invalid cursor input, and the shared `{ items, nextCursor }` shape; the existing list PostgreSQL suite gains a 100→1 continuation case. Boundary response mapping remains partial until T‑09 and browser/harness evidence remains with T‑10/T‑14.
- `TST-TASKS-003`: shared parser tests and the existing task cursor tests cover the common limit/cursor contract; the task PostgreSQL suite gains the matching 100→1 continuation case while retaining completed filtering and context-bound cursor checks. T‑09/T‑10/T‑14 obligations remain deferred.
- `TST-BOUNDARY-001`: error-contract tests cover 401/404/409/422 mappings, stable JSON envelope shape, known messages, and a non-leaking 500 internal fallback. Actual authenticated route/action request tests remain T‑09 scope.
- Focused commands: `pnpm test -- src/shared src/modules/lists/application src/modules/tasks/application`; `TEST_DATABASE_URL=<local PostgreSQL URL> pnpm test:integration -- <list/task integration files>`. Completion gates are `pnpm test`, `TEST_DATABASE_URL=<local PostgreSQL URL> pnpm test:integration`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, both Drizzle checks, `pnpm exec prettier --check` for changed Markdown, and `git diff --check`.

## Risks and assumptions

- Shared pagination must remain transport-oriented; it must not decode or authorize capability-specific cursors. Module codecs continue to reject malformed or cross-context payloads before task/list SQL.
- A shared mapper must not expose arbitrary unknown exception messages. Known application codes may retain their established safe messages; unknown failures map to a generic internal error for T‑09 to return as HTTP 500.
- Moving the duplicate `Page<T>` type is source-compatible only if list/task application exports continue to re-export the shared type. Keep those aliases during the refactor.
- Maximum-page tests add disposable rows only inside unique integration schemas; they do not alter migrations, Neon state, or shared test data.

## Handoff to task breakdown

This plan maps to one vertical delivery task, T‑08. Task breakdown should preserve the shared pagination/error files, list/task type/constant refactors, maximum-page PostgreSQL regressions, unit tests, exact verification commands, and explicit T‑09 route/action scope exclusion. The implementation sequence is `testing-first-class` → `test-driven-development` → incremental implementation → source-driven review → verification → fresh GPT‑5.6‑Sol review.
