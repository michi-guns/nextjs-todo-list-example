---
status: active
owner: engineering
---

# Testing Strategy

## Domain tests

Test task statuses, trimming/non-empty rules, and other invariants without framework or database setup.

## Application tests

Test use cases with repository ports or fakes, especially ownership, default Inbox creation, and cascade behavior at the application boundary.

## Infrastructure tests

Test Drizzle mappings and Sanity adapters when their translation logic is non-trivial.

## Boundary tests

Test Zod acceptance/rejection and authentication/authorization behavior at Server Actions and Route Handlers.

## End-to-end tests

Use Playwright for the core sign-in → create list → create task → change status → sign-out journey.
