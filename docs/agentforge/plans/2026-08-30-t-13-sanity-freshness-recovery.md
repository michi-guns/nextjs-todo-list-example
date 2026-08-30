# T-13 Sanity freshness and recovery implementation plan

> AgentForge plan. This plan is accepted for implementation under the temporary reviewer-follow-through run context.

**Status:** Accepted

**Goal:** Make published landing-cache freshness recoverable through one server-only, idempotent invalidation service reached by a signature-verified Sanity webhook and an explicitly authorized manual recovery route.

**Spec and decisions:** [Agent SPEC §6.2–6.3](../../.dwf/output/agent/SPEC.md#62-runtime), [Agent SPEC §10.4](../../.dwf/output/agent/SPEC.md#104-sanity-verification), [Agent SPEC §14.5](../../.dwf/output/agent/SPEC.md#145-landingsanity-boundary), [TD-023](../../.dwf/decisions/TECHNICAL.md), [TST-LANDING-003](../../.dwf/decisions/TESTING.md#tst-landing-003), and [Sanity data boundary](../../docs/data/sanity.md).

**Global constraints:** Keep provider and operator secrets server-side and out of source, logs, client bundles, and evidence. Keep app routes composition-only and keep webhook payload validation, relevance filtering, and authorization in the landing boundary. Do not add draft reads, live preview, Sanity mutations, rate limiting, persistent webhook storage, or deployment infrastructure. Use the installed Next.js 16 API shape (`revalidateTag(tag, 'max')`) and the existing `landing-content` cache tag. Local acceptance may exercise signed requests directly; the deployed webhook evidence remains dependent on a deployed release candidate.

## Current state and file map

- `src/modules/landing/infrastructure/sanity-landing-repository.ts` owns `LANDING_CONTENT_CACHE_TAG` and the validated published-read boundary.
- `src/modules/landing/infrastructure/sanity-landing-source.ts` owns the tagged Sanity client fetch options.
- `src/sanity/client.ts` is the server-only application client; `src/sanity/client-factory.ts` is the Node-safe constructor used by the smoke script.
- No invalidation service, webhook handler, manual recovery handler, or App Router route exists yet.
- `next-sanity` already provides the official `next-sanity/webhook` `parseBody` helper. It verifies the raw request signature before exposing the parsed body; no additional webhook dependency is required unless implementation evidence shows a direct import is needed.
- The repository has no deployed release candidate, so local signed-handler evidence can be verified now while the deployed-delivery clause remains deferred.

## Architecture and boundaries

### Shared invalidation service

Add `src/modules/landing/infrastructure/sanity-invalidation.ts` with a server-only boundary. Its public service calls `revalidateTag(LANDING_CONTENT_CACHE_TAG, 'max')` and exposes a small injectable factory for deterministic tests. The service is intentionally stateless: repeating the same tag invalidation has the same effect, so duplicate deliveries remain safe across processes without an unsafe in-memory deduplication cache.

### Webhook boundary

Add a landing presentation adapter that accepts a `NextRequest`, reads `SANITY_REVALIDATE_SECRET`, delegates raw-body signature verification and parsing to `parseBody` from `next-sanity/webhook`, and checks a small unknown payload envelope. A valid event is relevant only when `_id === 'landingPage'` and `_type === 'landingPage'`; draft IDs, other documents, missing fields, and malformed JSON never call the service. Signature failures return `401`, invalid payloads return `400`, irrelevant valid events return a successful no-op response, and missing configuration returns `500`. The actual route is `app/api/sanity/webhook/route.ts`, with `runtime = 'nodejs'`, and only composes the adapter with the shared service.

### Manual recovery boundary

Add a sibling presentation adapter and route at `app/api/sanity/recover/route.ts`. It accepts `POST` with an `Authorization: Bearer <operator-secret>` header, compares the server-side `SANITY_MANUAL_RECOVERY_SECRET` using a constant-time comparison, and calls the same invalidation service. Missing configuration returns `500`; missing or invalid authorization returns `401`; an authorized request returns success without exposing the token. The route is server-side and has no browser-facing client.

### Documentation and configuration

Document the two server-only environment variable names, route paths, relevant Sanity projection/filter expectations, and the local signed-handler evidence in `docs/data/sanity.md` and the T-13 evidence record. Do not add secret values or claim deployed evidence that is unavailable.

## Dependencies and work order

1. Confirm the installed Next.js/next-sanity webhook and cache APIs and record the exact status/limitations in the implementation evidence.
2. Add red tests for the shared invalidator and both boundary adapters, including valid/invalid signatures, malformed and irrelevant events, duplicate delivery, manual authorization, and shared-service routing.
3. Implement the stateless server-only invalidation service and make the boundary tests pass.
4. Add the two thin App Router route wrappers and route-level build/type checks.
5. Update `TST-LANDING-003` to `partial` with exact local evidence and an explicit deferred deployed-delivery obligation; update T-13 acceptance/evidence in `TODO.md` only after review satisfaction.

The invalidation service and boundary tests can be developed in one focused slice because their injectable port is defined together. Route wrappers follow the adapters and do not introduce another business layer.

## Verification strategy

Affected contract: `TST-LANDING-003`.

- Focused Vitest tests: service calls the stable tag with the Next.js 16 `'max'` profile; webhook accepts a generated valid Sanity signature only for the published singleton; invalid signatures, malformed payloads, draft/other IDs, and duplicate deliveries do not cause unsafe behavior; manual recovery requires the operator secret and reaches the exact same service.
- `pnpm test` for the complete suite.
- `pnpm typecheck`, `pnpm lint`, `pnpm build`, and `git diff --check` for the changed route/module graph.
- A local direct signed-request smoke or focused test must prove the handler path without mutating Sanity. `pnpm sanity:smoke` remains the separate read-only T-12 check and must continue to pass.
- Deployed release evidence (`one real Sanity webhook delivery`) is explicitly deferred until a release candidate exists; it must not be marked verified by local tests.

## Risks and assumptions

- Sanity's current webhook signature header and payload parsing are delegated to `next-sanity/webhook`; tests should generate the current `sanity-webhook-signature` format rather than reimplementing verification in application code.
- The Sanity webhook configuration will filter/projection-limit events to the singleton, but the application boundary still rechecks exact identity because external filters are not a trust boundary.
- `revalidateTag(..., 'max')` is the current Next.js 16 route-handler API and gives content-oriented stale-while-revalidate semantics. The shared tag is already attached to the T-12 read fetch.
- Manual recovery is a protected operational endpoint, not a user-facing feature; a bearer secret is the smallest repository-compatible authorization choice until a real operator identity system exists.
- No deployment is available in this run. Local boundary evidence is sufficient for implementation progress but not for the final deployed-release clause.

## Handoff to task breakdown

The task breakdown should keep one coherent T-13 delivery unit with these independently verifiable slices:

1. Server-only idempotent invalidation service and unit evidence.
2. Webhook and manual recovery adapters with boundary tests.
3. Thin App Router wrappers, documentation, TST reconciliation, and final quality gates.
