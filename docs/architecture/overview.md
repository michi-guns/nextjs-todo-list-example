---
status: evolving
owner: engineering
related-decisions:
  - TD-001
---

# Architecture Overview

The application is a domain-centered modular monolith with vertical slices. It is one deployable Next.js system organized by capability.

```text
app/                 Next.js routes and composition
src/modules/         auth, landing, lists, and tasks
src/sanity/          Sanity client/configuration seat
db/                  Drizzle client and schema seat
migrations/          Drizzle migration seat
components/          generic UI and shadcn components
```

The design borrows useful rules from Clean, Hexagonal, Onion, and Domain-Driven Design without requiring every pattern from those approaches.

See the supporting [technology stack](./stack.md) and the canonical technical contract in [`../../.dwf/output/agent/SPEC.md`](../../.dwf/output/agent/SPEC.md).

## Design goal

Keep the todo reference behavior understandable, testable, and replaceable while cross-cutting foundations remain reusable. Isolate framework and provider details where the accepted architecture needs a boundary, but do not add generic provider-swapping abstractions. Keep modules small enough for a developer or AI agent to understand in one focused context.
