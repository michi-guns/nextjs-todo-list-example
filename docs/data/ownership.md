---
status: active
owner: engineering
related-adrs:
  - ADR-0002
  - ADR-0003
---

# Data Ownership

## Sanity owns

- Landing-page headline, blurb, and CTA copy
- Editorial publishing workflow for that content

## PostgreSQL owns

- Better Auth users, sessions, accounts, and verification records
- Lists and tasks
- Ownership, status, timestamps, and relational integrity

## Rule

Sanity content must never become the source of truth for lists or tasks. CMS payloads are validated and mapped at the infrastructure boundary.
