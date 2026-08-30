# T-11 public landing and authentication screens implementation plan

> AgentForge plan. Use `task-breakdown` after this plan is accepted.

**Status:** Accepted for implementation

**Goal:** Materialize the selected Focus Rail presentation direction on the public Sanity-backed landing page and the email/password and magic-link authentication screens, with safe redirects, usable failure states, and no provider records in UI-facing contracts.

**Spec and decisions:** [Agent PRD §4–§7](../../../.dwf/output/agent/PRD.md#4-users-and-permissions), [Agent PRD §9](../../../.dwf/output/agent/PRD.md#9-success-metrics), [Agent SPEC §2](../../../.dwf/output/agent/SPEC.md#2-auth-better-auth), [Agent SPEC §6](../../../.dwf/output/agent/SPEC.md#6-sanity-landing-only), [Agent SPEC §9](../../../.dwf/output/agent/SPEC.md#9-ui), and [Agent SPEC §14.5–§14.6](../../../.dwf/output/agent/SPEC.md#145-landingsanity-boundary); [D-001](../../../.dwf/decisions/PRODUCT.md#d-001), [D-002](../../../.dwf/decisions/PRODUCT.md#d-002), [D-005](../../../.dwf/decisions/PRODUCT.md#d-005), [TD-004](../../../.dwf/decisions/TECHNICAL.md#td-004), [TD-007](../../../.dwf/decisions/TECHNICAL.md#td-007), [TD-020](../../../.dwf/decisions/TECHNICAL.md#td-020), and [TST-AUTH-001](../../../.dwf/decisions/TESTING.md#tst-auth-001), [TST-AUTH-002](../../../.dwf/decisions/TESTING.md#tst-auth-002), [TST-AUTH-003](../../../.dwf/decisions/TESTING.md#tst-auth-003), [TST-UI-001](../../../.dwf/decisions/TESTING.md#tst-ui-001), [TST-E2E-001](../../../.dwf/decisions/TESTING.md#tst-e2e-001), and [TST-E2E-002](../../../.dwf/decisions/TESTING.md#tst-e2e-002).

**Architecture:** Keep the public landing page as a server-owned App Router page that calls the existing `getPublishedLandingContent` application-facing reader and passes only the plain `LandingContent` view model to composition-owned UI. Keep authentication forms as small client interaction islands that use a single Better Auth browser client configured with the installed `magicLinkClient` plugin; the client module exposes no server records or database types. Server page wrappers validate an internal `next` path before passing it to forms, and successful client operations navigate with the existing App Router client navigation. Reuse the existing semantic tokens and `Button`, `Input`, `Label`, `Alert`, and `Textarea` primitives; add only an auth shell and the focused form/landing compositions required by these routes.

**Global constraints:** Use the installed Next.js 16.3.1 APIs and read the repository's local Next documentation before changing route or client boundaries. Keep Sanity GROQ/configuration and Better Auth server configuration behind their existing infrastructure seats. Never put `userId`, session records, raw Sanity payloads, provider error objects, credentials, mailbox contents, or secrets in UI-facing types or logs. Use the settled email/password and magic-link endpoints only; OAuth, password reset, and polished email delivery are out of scope. Treat the local mailbox as a test/development verification aid, not a production UI fallback. Preserve safe same-origin redirects (`/dashboard` by default; reject absolute, protocol-relative, and malformed paths). The existing dashboard sign-out Server Action remains the sign-out UX; do not add a second auth provider or a speculative account system.

## Current state and file map

- `app/page.tsx` is still the starter placeholder and will be replaced in place as the public `/` landing route. The existing `app/(marketing)` group remains a keep-file-only grouping for now; do not add a second `/` page there, because App Router route groups do not create a distinct URL. The landing error boundary should be placed at the root app boundary (or another non-duplicating route boundary) so provider failures remain explicit.
- `src/modules/landing/infrastructure/sanity-landing-reader.ts` returns the plain `LandingContent` contract through the validated, cache-tagged Sanity repository created by T-12. The page must consume this function rather than importing `next-sanity`, GROQ, or provider types.
- `lib/auth.ts` and `app/api/auth/[...all]/route.ts` own Better Auth server configuration and default API routes. `app/actions/auth.ts` already exposes the dashboard sign-out action.
- `src/modules/auth/presentation/current-user.ts` exposes server-only session helpers; auth pages may redirect already-authenticated users, but they must not serialize the current-user record to the browser.
- `components/dashboard/app-header.tsx` is the existing sign-out composition and supplies the visual/token vocabulary for the Focus Rail surfaces. `components/ui/{button,input,label,alert,textarea}.tsx` are the available semantic primitives.
- `node_modules/better-auth` provides `createAuthClient` through `better-auth/react` and `magicLinkClient` through `better-auth/client/plugins`; use these installed APIs rather than hand-duplicating Better Auth request/response handling.
- Existing integration tests prove the server boundary and local mailbox lifecycle. No public landing/auth route or browser form currently exists, and the default Playwright file still belongs to T-15's later orchestration work.

## Dependencies and work order

1. Reconcile the T-11 task and affected `TST-*` contracts, then add focused red tests for safe internal redirect parsing and any stable client-facing error normalization that the forms need.
2. Add the server landing route, its explicit provider-failure error boundary, and the shared public/auth shell. Verify that the page passes only the application landing view model and that links preserve a safe `next` path.
3. Add the Better Auth browser client and sign-up/sign-in/magic-link form islands. Cover required fields, password/name limits matching server contracts, pending/disabled states, stable expected error messages, verification/magic-link success states, and redirect behavior. Keep the callback URL internal and default it to `/dashboard`.
4. Add auth route pages for `/sign-up`, `/sign-in`, and `/magic-link`, including links among the supported flows and a clear path back to the landing page. Keep sign-out on the existing authenticated dashboard action.
5. Run focused tests, project gates, and the real Next runtime loop at the four agreed viewports. Reconcile T-11 evidence and `TST-*` statuses only after the fresh-review loop is clean; leave T-15's dedicated Playwright lifecycle and full E2E journeys explicitly outstanding.

The landing page and auth form compositions can be developed independently after the redirect/error contract is settled, but they will be delivered together so the anonymous-to-authenticated path is coherent and reviewable.

## Verification strategy

- **TST-AUTH-001:** Existing integration evidence remains valid; runtime checks must exercise the sign-up verification-pending state, verified sign-in path, redirect into `/dashboard`, and the existing dashboard sign-out control. The dedicated deterministic Chromium journey remains T-15-owned.
- **TST-AUTH-002:** The magic-link request page must expose a clear success state and use the existing Better Auth plugin callback contract. Local runtime verification may request a link and consume the captured URL without recording the token; deterministic mailbox/browser orchestration remains T-15-owned.
- **TST-AUTH-003:** Anonymous `/dashboard` remains session-gated, auth pages never accept a client owner ID, and `next` is constrained to same-origin paths. Existing request-boundary tests remain the authoritative private-operation evidence.
- **TST-UI-001:** Inspect landing, sign-up, sign-in, and magic-link pages in Chromium at `320px`, `768px`, `1024px`, and `1440px`; verify landmarks, labels, visible focus, pending/error/success states, long-content wrapping, and no horizontal overflow. Record runtime evidence separately from the T-09A prototype evidence.
- **TST-E2E-001 / TST-E2E-002:** Preserve these contracts as `specified` until T-15 builds the harness-owned Playwright journeys. T-11 supplies the routes and stable selectors/labels those journeys consume; it must not claim the dedicated E2E contracts are complete.
- Focused commands during implementation: the colocated auth presentation tests and `pnpm typecheck`.
- Completion gates: `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, changed-file Prettier checks, `git diff --check`, and the required Next runtime/browser inspection. `pnpm sanity:smoke` remains a separate read-only live prerequisite for the configured Sanity singleton; missing configuration/content must fail clearly rather than trigger a permanent hardcoded fallback.

## Risks and assumptions

- Better Auth's browser client returns `{ data, error }` objects whose error details are provider-shaped. Forms will map only known validation/session outcomes to concise user-facing messages and use a safe generic message otherwise; raw objects stay in the browser boundary and are not rendered or logged.
- Email/password sign-up requires email verification under the existing server configuration. The success state will explain that the user must follow the verification email; it will not pretend a session exists before verification.
- The magic-link consume operation is the URL generated by Better Auth and captured by the local mailbox in development/test. No custom token route or mailbox reader belongs in production UI.
- Sanity is already wired and validated by T-12, but the public route's runtime proof depends on the configured published singleton. If the local environment lacks it, record the explicit prerequisite failure and still keep the route's error boundary provider-safe.
- A simple `next` path helper is sufficient; do not add a general navigation/security package. Reject protocol-relative (`//...`), absolute (`https:...`), and non-path values before client navigation.
- No unresolved DWF contradiction was found. The only intentionally deferred evidence is the T-15 browser harness and full E2E execution.

## Handoff to task breakdown

Turn this plan into one fresh-review delivery task, T-11, with independently verifiable slices: (a) testing-ledger reconciliation and red redirect/error tests, (b) server landing route and public/auth shell, (c) Better Auth client and sign-up/sign-in/magic-link interaction islands, (d) route composition, safe redirect/error/pending/accessibility states, and (e) runtime/gate verification, contract reconciliation, and the required fresh GPT-5.6-Sol review loop. Preserve the scope exclusions above, keep T-15 E2E ownership explicit, and do not change schema, migrations, Sanity provider configuration, or private dashboard behavior.
