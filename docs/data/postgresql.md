---
status: active
owner: engineering
related-decisions:
  - TD-005
---

# PostgreSQL and Drizzle

The root `db/` directory is the canonical Drizzle client/schema seat. The root `migrations/` directory contains generated migration artifacts.

Use node-postgres through Drizzle's node-postgres adapter as the shared runtime for Neon and local Testcontainers, as settled in [`OD-022`](../../.dwf/decisions/OPEN-DECISIONS.md#od-022). Keep one bounded module-scoped pool, register it for Vercel Fluid Compute lifecycle management, and do not create separate repository implementations for the two environments.

## Responsibilities

- Store transactional application truth.
- Enforce relational integrity and list/task cascade behavior.
- Support ownership-aware queries.
- Support local integration testing through PostgreSQL 18 Testcontainers.

## Persistence rules

- Keep Drizzle row types inside infrastructure.
- Keep migrations versioned and reviewable.
- Before changing migration history, use the repository-local
  [`postgresql-migration-workflow`](../../.agents/skills/postgresql-migration-workflow/SKILL.md)
  skill to classify the targets. Consolidate unreleased changes only while
  history is scaffolding-only and safely recreatable; once shared development
  or production adopts the history, keep applied migrations immutable and add a
  forward migration.
- Do not create a parallel user table outside Better Auth’s adapter schema.
- Develop and verify schema-changing migrations on a non-default Neon branch before applying the same reviewed migration to the default branch.
- Apply those same versioned migrations to ephemeral local integration databases; do not maintain a test-only schema.
- Use local Testcontainers databases for routine integration and Playwright runs; reserve the non-default Neon branch for migration smoke, cloud-driver compatibility, and performance evidence.
- Keep local behavior data separate from the representative Neon performance seed.
- Refuse external database URLs in destructive test reset and cleanup helpers.
