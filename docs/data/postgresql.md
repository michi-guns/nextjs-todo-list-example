---
status: active
owner: engineering
related-decisions:
  - TD-005
---

# PostgreSQL and Drizzle

The root `db/` directory is the canonical Drizzle client/schema seat. The root `migrations/` directory contains generated migration artifacts.

## Responsibilities

- Store transactional application truth.
- Enforce relational integrity and list/task cascade behavior.
- Support ownership-aware queries.

## Persistence rules

- Keep Drizzle row types inside infrastructure.
- Keep migrations versioned and reviewable.
- Do not create a parallel user table outside Better Auth’s adapter schema.
- Develop and verify schema-changing migrations on a non-default Neon branch before applying the same reviewed migration to the default branch.
