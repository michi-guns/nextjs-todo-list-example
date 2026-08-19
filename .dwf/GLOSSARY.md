# Project Glossary

Stable project/domain terminology. Framework terminology belongs in `.framework/`, not here.

## Product terms

**Starter:** The opinionated, reusable Next.js foundation that is the repository's primary product.

**Todo reference application:** The complete personal-todo implementation used to demonstrate and verify the starter's foundations.

**Starter baseline:** The currently accepted local behavior, integration, verification, and quality contract required before the starter reference is considered complete.

**Derived application:** A future application created from the starter, expected to replace mostly domain and UI code while retaining or adapting cross-cutting foundations.

**User:** An authenticated person represented by Better Auth.

**List:** A user-owned collection of tasks. A user with no existing lists receives an `Inbox` list on first authenticated use.

**Task:** A user-owned item belonging to exactly one list.

**Task status:** One of `todo`, `in_progress`, or `done`.

**Landing content:** Editorial headline, blurb, and CTA copy served from Sanity. It is not transactional todo data.

## Design terms

**Domain rule:** A business invariant that must hold regardless of UI or persistence.

**Application use case:** A named operation the system permits, such as `createTask` or `deleteList`.

**Adapter:** Infrastructure code that translates an external system such as Better Auth, Drizzle, or Sanity into an application-facing interface.

**Repository port:** A module-owned interface describing the persistence/provider capability an application use case needs without exposing adapter implementation.

**View model:** A presentation-facing shape derived from an application DTO for a page, action result, or JSON response.

**Transactional truth:** Data whose correctness is owned by PostgreSQL rather than editorial content systems.

**Infrastructure seat:** A repository location reserved for a provider client, schema, or migration concern, not a separate business capability.

## Decision identifiers

**D-\*:** Accepted observable Product Decision.

**TD-\*:** Accepted or explicitly authorized technical/architecture mechanism downstream of Product Decisions.

**EC-\*:** Explicitly considered scenario that points to an owning contract without overriding it.

**OQ-\*:** Unresolved factual question.

**OD-\*:** Unresolved choice among understood alternatives.
