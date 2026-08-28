---
status: active
owner: engineering
---

# Testing Strategy

The [canonical Testing Decisions and Test Contracts ledger](../../.dwf/decisions/TESTING.md) owns individual `TST-*` obligations, statuses, dependencies, and evidence. This document explains the supporting layer strategy and does not replace or redefine those contracts.

## Domain tests

Test task statuses, trimming/non-empty rules, and other invariants without framework or database setup.

## Application tests

Test use cases with repository ports or fakes, especially ownership, default Inbox creation, and cascade behavior at the application boundary.

Domain and application unit tests do not require PostgreSQL or Docker.

## Infrastructure tests

Use PostgreSQL 18 through `@testcontainers/postgresql` for Drizzle repository and migration integration tests. Apply the complete versioned migration chain to the empty database before loading test data. Cover database uniqueness, cascade deletion, ownership-aware queries, cursor pagination, and concurrent default-Inbox creation. Isolate state between tests and stop the suite-owned container even after failures. Docker-backed tests fail clearly rather than silently skipping when Docker is unavailable.

Routine integration tests use only their harness-owned local container and require no Neon credentials. Reset and cleanup helpers refuse external database URLs.

Run repository integration tests serially while they share one container. Each test creates and owns a unique user and its mutable records and remains independent of execution order. Parallel workers are allowed later only when each receives an isolated database or schema.

Test Sanity payload validation and mapping with local fixtures, including optional fields and missing or invalid required content. Test signed and invalid webhook requests, irrelevant and duplicate events, manual-recovery authorization, and the shared idempotent invalidation service without depending on mutable remote content. Local acceptance may call the signed handler directly; a deployment counts as release evidence only after one real Sanity webhook delivery succeeds through the deployed endpoint.

## Boundary tests

Keep domain and application tests as the main business-behavior suite. Test JSON Route Handlers at the request boundary for successful requests, paginated response shape, unauthenticated `401`, privacy-preserving `404`, conflict `409`, and invalid-input `422` responses. Give Server Actions a smaller adapter suite for authentication, Zod validation, successful result mapping, and expected error mapping. Do not repeat every business case across both entry paths.

## Coverage policy

Do not impose a minimum code-coverage percentage. Give every behavior required by the Agent SPEC suitable test evidence. Use coverage reports to find possible gaps, not as a substitute for behavior-based acceptance.

## End-to-end tests

Use Playwright for the core sign-in → create list → create task → change status → sign-out journey. For magic-link verification, explicitly enable the local/test file-backed mailbox, clear it before the test, request a link, read the captured URL, and visit it. The temporary mailbox is gitignored and unavailable outside local/test mode.

Chromium is the required browser for the routine acceptance suite. Keep Firefox and WebKit in a separate on-demand cross-browser run used before a public release and after major UI changes. They are not part of every ordinary database-backed test run.

One local command starts a PostgreSQL 18 Testcontainer, applies the versioned migrations, loads a small deterministic behavior seed, starts a dedicated Next.js test server against that database, runs Playwright, and tears everything down. The behavior seed includes cross-user privacy and enough records to exercise visible pagination. It remains separate from the large Neon performance seed.

Playwright scenarios also run serially while sharing their container. Each scenario owns its identity and mutable data and does not depend on another scenario running first. Parallel Playwright execution requires a database or schema isolated per worker.

Routine Playwright receives deterministic test-only landing content through the application-facing landing contract and does not call Sanity. The test source is unavailable in deployed runtime modes and is not a production fallback.

## Sanity live smoke

Keep one separate read-only smoke that fetches the published singleton through the real Sanity client and query, validates the unknown payload, and maps the landing view model. It must pass before starter-baseline completion and before a deployment is treated as release evidence. Missing configuration or content and query, validation, or mapping failures fail clearly. The smoke never mutates CMS content.

## Neon verification

Create the non-default Neon development branch from the current default branch before schema-changing implementation. Apply and verify the new reviewed migrations there before applying the same files to the default branch. Use that development branch for migration smoke checks, cloud-driver compatibility, the representative performance seed, `EXPLAIN ANALYZE`, and the agreed warm-query target. `drizzle-kit push` may support local exploration but does not count as migration verification. Routine integration and Playwright tests do not use Neon.
