---
status: active
owner: engineering
related-decisions:
  - TD-005
---

# PostgreSQL and Drizzle

The root `db/` directory is the canonical Drizzle client/schema seat. The root `migrations/` directory contains generated migration artifacts.

The shared runtime driver for Neon and local Testcontainers remains open in [`OD-022`](../../.dwf/decisions/OPEN-DECISIONS.md#od-022). Do not create separate repository implementations for the two environments.

## Responsibilities

- Store transactional application truth.
- Enforce relational integrity and list/task cascade behavior.
- Support ownership-aware queries.
- Support local integration testing through PostgreSQL 18 Testcontainers.

## Persistence rules

- Keep Drizzle row types inside infrastructure.
- Keep migrations versioned and reviewable.
- Do not create a parallel user table outside Better Auth’s adapter schema.
- Develop and verify schema-changing migrations on a non-default Neon branch before applying the same reviewed migration to the default branch.
- Apply those same versioned migrations to ephemeral local integration databases; do not maintain a test-only schema.
- Use local Testcontainers databases for routine integration and Playwright runs; reserve the non-default Neon branch for migration smoke, cloud-driver compatibility, and performance evidence.
- Keep local behavior data separate from the representative Neon performance seed.
- Refuse external database URLs in destructive test reset and cleanup helpers.
