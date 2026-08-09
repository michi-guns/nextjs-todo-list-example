---
status: active
owner: engineering
---

# Cross-System Consistency

There is intentionally no transactional synchronization between Sanity and PostgreSQL in the spike.

- Sanity changes affect landing content only.
- PostgreSQL changes affect authentication, lists, and tasks.
- A Sanity outage must not corrupt or rewrite todo data.
- A database migration must not require copying content from Sanity.

Future integrations must document ownership, freshness, failure behavior, and revalidation in an ADR.
