# T-12 Sanity landing read path implementation plan

> AgentForge plan. Use `task-breakdown` before implementation.

**Status:** Accepted

**Goal:** Add a server-only, validated, cache-tagged Sanity read path that returns a plain landing view model and is proven by fixtures and a read-only live smoke.

**Spec and decisions:** [Agent SPEC §6](../../.dwf/output/agent/SPEC.md#6-sanity-landing-only), [Agent SPEC §14.5](../../.dwf/output/agent/SPEC.md#145-landingsanity-boundary), [Sanity data contract](../../docs/data/sanity.md), [TD-023](../../.dwf/decisions/TECHNICAL.md), [TST-LANDING-001](../../.dwf/decisions/TESTING.md#tst-landing-001), and [TST-LANDING-002](../../.dwf/decisions/TESTING.md#tst-landing-002).

**Architecture:** Keep the existing root `sanity/` Studio setup intact. Add an application-facing client/configuration seat under `src/sanity`, a landing domain view model and application repository port under `src/modules/landing`, and a Sanity infrastructure adapter that owns GROQ, unknown-payload validation, mapping, and cache identity. The adapter returns only the plain landing contract; provider records never cross into application or presentation code.

**Global constraints:** Published content only; no Sanity mutations, draft/live preview, or webhook work in T-12. Use the existing fixed published singleton and environment variables without committing values. This Next.js 16 project does not enable Cache Components, so use the documented tagged `client.fetch` strategy with an indefinite lifetime until T-13 invalidates the stable landing tag. Keep the public landing UI and fallback removal owned by T-11.

## Current state and file map

- `sanity/env.ts`, `sanity/lib/client.ts`, and `sanity/schemaTypes/landingPage.ts` configure the embedded Studio and published singleton; they remain Studio-owned.
- `sanity/fixtures/landingPage.json` is the local valid payload fixture.
- `scripts/verify-sanity.mjs` currently duplicates identity and field checks; replace it with a TypeScript smoke that calls the canonical adapter path.
- New `src/sanity` files own the server client, query/fetch helper, and stable cache tag.
- New `src/modules/landing/domain` owns the plain `LandingContent` type; `application` owns the repository port/use case; `infrastructure` owns the Sanity schema, query, mapper, and repository implementation.
- New fixture tests live beside the landing infrastructure and exercise behavior rather than implementation details.

## Dependencies and work order

1. Add the durable plan, mark T-12 `[~]`, and add the temporary run-context and reviewer-follow-through skill.
2. Write fixture tests for valid, optional, malformed, incomplete, identity-mismatch, and provider-field-leak cases; confirm the RED state.
3. Add the client/fetch boundary, view model/port, and Sanity adapter until the fixture suite is GREEN.
4. Route the live smoke through the same fetch/validate/map path and run it against the configured published singleton.
5. Reconcile `TST-LANDING-001` and `TST-LANDING-002`, run the project gates, mark T-12 complete, push, open the PR, and perform the required fresh-agent review loop.

## Verification strategy

- `TST-LANDING-001`: Vitest fixture integration proves unknown input validation, optional-field handling, explicit required-content failures, and provider-field isolation.
- `TST-LANDING-002`: `pnpm sanity:smoke` performs a separate read-only real-client fetch, validation, and mapping; missing configuration/content or query/validation/mapping failures exit nonzero with clear errors.
- Focused tests run during the RED/GREEN loop. Completion gates are `pnpm test`, `pnpm typecheck`, `pnpm lint`, `git diff --check`, and the live smoke. No browser work is added because T-11 owns presentation.

## Risks and assumptions

- The existing Studio client uses CDN defaults for Studio-oriented code; the application read client uses the live API (`useCdn: false`) so future tag invalidation is not hidden by the Sanity CDN.
- Required strings must be nonblank; optional secondary CTA is omitted when absent or null and retained when supplied as a string.
- The current scaffold page is not a CMS fallback consumed by the landing module, so it remains untouched until T-11 wires the view model.
- The temporary follow-through skill is valid through 2026-08-31 in Europe/Athens. On or after 2026-09-01 it is non-authoritative and stale; the first agent invocation must delete the skill and paired run-context file with explicit file-level operations only.

## Handoff to task breakdown

This plan maps to one delivery task, T-12, with two affected contracts (`TST-LANDING-001` and `TST-LANDING-002`). The task must leave the repository with a canonical application read path, fixture evidence, live smoke evidence, and no duplicate validation path in the smoke script.
