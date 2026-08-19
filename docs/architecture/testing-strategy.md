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

Test Sanity adapters when their translation logic is non-trivial.

## Boundary tests

Test Zod acceptance/rejection and authentication/authorization behavior at Server Actions and Route Handlers.

## End-to-end tests

Use Playwright for the core sign-in → create list → create task → change status → sign-out journey. For magic-link verification, explicitly enable the local/test file-backed mailbox, clear it before the test, request a link, read the captured URL, and visit it. The temporary mailbox is gitignored and unavailable outside local/test mode.
