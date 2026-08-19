---
status: active
owner: engineering
---

# Testing Strategy

## Domain tests

Test task statuses, trimming/non-empty rules, and other invariants without framework or database setup.

## Application tests

Test use cases with repository ports or fakes, especially ownership, default Inbox creation, and cascade behavior at the application boundary.

Domain and application unit tests do not require PostgreSQL or Docker.

## Infrastructure tests

Use PostgreSQL 18 through `@testcontainers/postgresql` for Drizzle repository and migration integration tests. Apply the versioned migrations and cover database uniqueness, cascade deletion, ownership-aware queries, cursor pagination, and concurrent default-Inbox creation. Isolate state between tests and stop the suite-owned container even after failures. Docker-backed tests fail clearly rather than silently skipping when Docker is unavailable.

Routine integration tests use only their harness-owned local container and require no Neon credentials. Reset and cleanup helpers refuse external database URLs.

Test Sanity adapters when their translation logic is non-trivial.

## Boundary tests

Test Zod acceptance/rejection and authentication/authorization behavior at Server Actions and Route Handlers.

## End-to-end tests

Use Playwright for the core sign-in → create list → create task → change status → sign-out journey. For magic-link verification, explicitly enable the local/test file-backed mailbox, clear it before the test, request a link, read the captured URL, and visit it. The temporary mailbox is gitignored and unavailable outside local/test mode.

Chromium is the required browser for the routine acceptance suite. Keep Firefox and WebKit in a separate on-demand cross-browser run used before a public release and after major UI changes. They are not part of every ordinary database-backed test run.

One local command starts a PostgreSQL 18 Testcontainer, applies the versioned migrations, loads a small deterministic behavior seed, starts a dedicated Next.js test server against that database, runs Playwright, and tears everything down. The behavior seed includes cross-user privacy and enough records to exercise visible pagination. It remains separate from the large Neon performance seed.

## Neon verification

Use the non-default Neon development branch for migration smoke checks, cloud-driver compatibility, the representative performance seed, `EXPLAIN ANALYZE`, and the agreed warm-query target. Routine integration and Playwright tests do not use Neon.
