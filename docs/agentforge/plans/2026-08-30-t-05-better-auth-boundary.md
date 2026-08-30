# T-05 Better Auth boundary implementation plan

> AgentForge plan and implementation record. `task-breakdown` reconciled its delivery metadata before implementation.

**Status:** Completed

**Goal:** Complete the Better Auth boundary for the starter application: keep provider configuration and raw records behind server-side infrastructure, expose the app-facing current-user helpers, support email/password and magic-link authentication, and provide a strictly local/test-only temporary mailbox for deterministic magic-link verification.

**Spec and decisions:** [Agent SPEC authentication contract](../../.dwf/output/agent/SPEC.md#2-auth-better-auth), [authentication boundary](../../.dwf/output/agent/SPEC.md#143-authentication-boundary), [TD-003](../../.dwf/decisions/TECHNICAL.md#td-003), [TD-009](../../.dwf/decisions/TECHNICAL.md#td-009), [TD-016](../../.dwf/decisions/TECHNICAL.md#td-016), [TST-AUTH-001](../../.dwf/decisions/TESTING.md#tst-auth-001), [TST-AUTH-002](../../.dwf/decisions/TESTING.md#tst-auth-002), and [TST-AUTH-003](../../.dwf/decisions/TESTING.md#tst-auth-003).

**Architecture:** Keep `lib/auth.ts` as the Better Auth infrastructure configuration and expose only app-facing server helpers from the auth module. Route all Better Auth requests through a server-only catch-all route; do not export Better Auth records or accept a client-supplied owner identifier. Keep the existing Better Auth text user/session identifiers because they are the established auth schema contract; list/task native UUIDs remain a separate persistence concern. Configure email/password and magic-link plugins according to the current Better Auth API, with the application-owned auth boundary responsible for current-user resolution and ordinary unauthenticated outcomes. The local/test magic-link mailbox is an explicit opt-in adapter backed by a temporary gitignored location, never enabled by default or exposed in shared/production modes.

**Global constraints:** Preserve the accepted DWF auth and data contracts. Do not add OAuth/social providers, list/task use cases, dashboard/UI work, client-side owner fields, or a production mailbox. Do not expose raw Better Auth user/session/account/verification rows from app-facing modules. Do not weaken cookie/session security or allow bearer/cross-origin credentials to broaden authorization. Keep secrets and captured links out of source control and logs.

## Implementation outcome

- Better Auth is configured behind `lib/auth.ts`, exposed through the server-only catch-all route, and mapped to the app-facing `CurrentUser` contract through `getCurrentUser()` and `requireUser()`.
- Email/password and magic-link flows are covered by request-level integration tests against disposable local PostgreSQL 18. Magic links are captured only when `NODE_ENV` is `development` or `test` and `BETTER_AUTH_LOCAL_MAILBOX=true`; the mailbox path is restricted to the operating-system temporary directory or the ignored `.local/better-auth-mailbox` directory.
- Better Auth 1.7 requires `account.issuer` and a unique `(issuer, account_id)` identity index. Because this repository is still pre-release and the migration target is disposable/agent-owned, the approved migration-history workflow consolidated those additions into the existing T-04 migration and regenerated its tracked snapshot rather than adding another migration file. The baseline migration remains unchanged.

## Initial state and file map (before implementation)

- `lib/auth.ts` already contains the minimal Better Auth + Drizzle adapter configuration for `users`, `sessions`, `accounts`, and `verification`; it needs the final provider callbacks/plugins and environment-safe behavior required by the SPEC.
- `db/schema/auth.ts` owns the Better Auth tables and remains the persistence source of truth; its text user IDs and session foreign keys must stay compatible with the existing migration.
- `db/db.ts` owns the node-postgres Drizzle connection and must not be duplicated by auth helpers or tests.
- `src/modules/auth/{domain,application,infrastructure,presentation}` are reserved module seats with placeholder files; place app-facing contracts and infrastructure adapters there without copying Better Auth internals.
- `app/api` has no Better Auth catch-all route yet; add the smallest Next.js route surface required by the current framework version.
- `TODO.md` is the delivery tracker; T-05 is active on `task/t-05-better-auth-boundary` and its acceptance criteria remain the source of task scope.

## Dependencies and work order

1. Reconfirm the synchronized branch, auth schema/migration state, package scripts, local-only database/mailbox prerequisites, and current Next.js/Better Auth documentation before editing code.
2. Reconcile the testing ledger and add focused red tests for `TST-AUTH-001`, `TST-AUTH-002`, and `TST-AUTH-003`, including the explicit local/test mailbox boundary and owner-ID rejection behavior.
3. Implement the server-only current-user helpers and infrastructure boundary, keeping Better Auth raw records private and mapping provider results to the `CurrentUser` contract.
4. Add the Next.js Better Auth route and the email/password plus magic-link flows, with the mailbox adapter enabled only through an explicit local/test configuration and safely isolated temporary storage.
5. Run focused unit/request-boundary tests against the disposable local PostgreSQL setup, then run the repository typecheck, lint, full test suite, and any available framework/runtime verification required by the changed route surface.
6. Review the diff for secret leakage, client owner-ID trust, cross-origin credential behavior, and scope creep; reconcile the T-05 checklist and testing evidence, commit, push, and update the task PR.

## Verification strategy

- **TST-AUTH-001:** Prove email/password sign-up, sign-in, authenticated private-boundary access, sign-out, and rejection of subsequent private operations. Use the repository's request-boundary tests and the required browser journey when its runtime prerequisites are available.
- **TST-AUTH-002:** In explicit local/test mode, request one magic link, read it deterministically from the temporary mailbox, consume it once to establish a session, and prove the mailbox endpoint/adapter is unavailable outside that mode. Verify single-use behavior.
- **TST-AUTH-003:** Prove anonymous private reads/mutations return the ordinary unauthenticated result; authenticated operations derive ownership from the server session; another user's identifiers resolve as privacy-preserving not-found; and client-provided owner IDs or broadened bearer/cross-origin credentials are ignored or rejected.
- Keep tests deterministic and isolated. Use only the repository's disposable local PostgreSQL contract, refuse external database URLs, and ensure temporary mailbox cleanup cannot remove unrelated files. Do not claim hosted or browser evidence when the prerequisite is unavailable.
- Focused checks should include the auth test targets, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `git diff --check`, and the repository's Next.js runtime/browser verification for the new route if a local server and browser are available.

### Recorded evidence

- `pnpm test` — 3 files, 6 unit tests passed.
- `TEST_DATABASE_URL=postgresql://...@127.0.0.1:55432/t05 pnpm test:integration` — 3 files, 7 tests passed against a disposable `postgres:18-alpine` container.
- `pnpm exec drizzle-kit check --config drizzle.config.ts` and `pnpm exec drizzle-kit generate --config drizzle.config.ts --explain --output text` — migration metadata is coherent and produces no pending statements.
- `pnpm exec drizzle-kit migrate --config drizzle.config.ts` on a fresh local migration database, followed by catalog inspection — issuer default, unique identity index, UUIDv7 list/task defaults, foreign keys, and indexes applied successfully.
- `pnpm typecheck`, targeted ESLint, and `git diff --check` passed; full `pnpm lint` passed with the existing unused `Geist` warning in `app/layout.tsx`. `pnpm build` completed with the auth route present and no Turbopack tracing warnings.
- The `next-dev-loop` runtime check opened the running app with `agent-browser`, returned `null` from `GET /api/auth/get-session`, and recorded empty Next MCP compilation/error results. Private list/task entry-path evidence and the required authenticated Chromium journeys remain owned by T-09/T-15; the three auth contracts are therefore recorded as `partial` in the testing ledger.

## Risks and assumptions

- Better Auth APIs and Next.js route conventions are version-sensitive; implementation must consult the installed framework guides and official Better Auth documentation before code is written.
- The existing auth migration is already the shared contract for text user IDs. This task does not reopen that schema or convert auth IDs to native UUIDs.
- Magic-link delivery is intentionally a test/local transport. Production email delivery is outside T-05 and must not be approximated by a default filesystem mailbox.
- Cookie/session behavior depends on the framework adapter. The app-facing helpers must fail closed when no valid session is present and must not leak provider-specific records.
- If a required local PostgreSQL, browser, or Better Auth prerequisite is unavailable, stop at the smallest honest evidence boundary and report the concrete prerequisite instead of substituting a weaker check.

## Handoff to task breakdown

Turn this plan into one T-05 delivery task with independently verifiable slices: (a) testing-ledger reconciliation and red auth-boundary tests, (b) server-only Better Auth configuration/helpers and route boundary, (c) email/password and local/test magic-link flows with the guarded temporary mailbox, and (d) focused plus repository-wide verification and evidence reconciliation. Keep the TST-AUTH-001/002/003 contracts explicit and preserve all scope exclusions above.
