# Glossary

## Product terms

**User**: An authenticated person represented by Better Auth.

**List**: A user-owned collection of tasks. A user with no existing lists receives an `Inbox` list on first sign-in.

**Task**: A user-owned item belonging to exactly one list.

**Task status**: One of `todo`, `in_progress`, or `done`.

**Landing content**: Editorial headline, blurb, and CTA copy served from Sanity. It is not transactional todo data.

## Design terms

**Domain rule**: A business invariant that must hold regardless of UI or persistence.

**Application use case**: A named operation the system permits, such as `createTask` or `deleteList`.

**Adapter**: Infrastructure code that translates an external system such as Better Auth, Drizzle, or Sanity into an application-facing interface.

**Repository port**: A module-owned interface describing the persistence/provider capability an application use case needs without exposing the adapter implementation.

**View model**: A presentation-facing shape derived from an application DTO for a page, action result, or JSON response.

**Transactional truth**: Data whose correctness is owned by PostgreSQL rather than an editorial content system.

**Infrastructure seat**: A root location reserved for a provider client, schema, or migration concern, not a separate business capability.

## Delivery terms

**Roadmap**: The overall implementation journey and scheduling orientation. It does not itself create dependency edges.

**Milestone**: An observable integrated capability or acceptance boundary above individual Phases.

**Phase**: The smallest externally managed implementation handoff unit. A Phase has an outcome/constraint/proof contract and no Delivery Task children.

**Design Gap**: Evidence-backed missing or conflicting canonical product/technical truth that requires DWF authority before implementation can continue correctly.

**Execution Baseline**: The content-derived identity of the exact authoritative Phase truth an active implementation must satisfy.
