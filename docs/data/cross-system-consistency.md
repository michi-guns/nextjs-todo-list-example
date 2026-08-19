---
status: active
owner: engineering
---

# Cross-System Consistency

There is intentionally no transactional synchronization between Sanity and PostgreSQL in the current starter baseline.

- Sanity changes affect landing content only.
- PostgreSQL changes affect authentication, lists, and tasks.
- A Sanity outage must not corrupt or rewrite todo data.
- A database migration must not require copying content from Sanity.

Sanity cache invalidation changes only the derived public landing read. It never writes PostgreSQL data. Automatic webhook and protected manual recovery use one idempotent invalidation path, so duplicate delivery does not create cross-system state.
