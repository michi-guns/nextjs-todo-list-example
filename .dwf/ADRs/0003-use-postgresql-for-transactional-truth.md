# ADR-0003: Use PostgreSQL for Transactional Truth

## Status

Accepted

## Context

Users, sessions, lists, and tasks require relational integrity, ownership checks, and durable application behavior.

## Decision

Use PostgreSQL on Neon with Drizzle for authentication and todo data. Keep the root `db/` and `migrations/` seats explicit.

## Consequences

Positive: relational constraints and migrations protect transactional data, while Drizzle keeps schema and TypeScript close together.

Negative: local development requires database configuration and migration discipline.

## Related Documents

- [PostgreSQL and Drizzle](../../docs/data/postgresql.md)
- [Data ownership](../../docs/data/ownership.md)
