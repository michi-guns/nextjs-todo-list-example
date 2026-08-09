---
status: active
owner: engineering
related-adrs:
  - ADR-0003
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
