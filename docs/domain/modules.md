# Domain Modules

## Auth

Owns the application-facing session and authenticated-user boundary. Better Auth owns its implementation details and tables.

## Lists

Owns user-owned task collections, list naming, and list deletion behavior.

## Tasks

Owns task identity, title/notes, status, list membership, and task invariants.

## Landing

Owns the application-facing landing view model. Sanity is its editorial adapter, not the owner of transactional todo behavior.

These boundaries may change through ADRs as real behavior becomes clearer.
