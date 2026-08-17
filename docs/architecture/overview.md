---
status: evolving
owner: engineering
related-adrs:
  - ADR-0001
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

See the supporting [technology stack](./stack.md) and the canonical technical contract in [`../../.dwf/SPEC.md`](../../.dwf/SPEC.md).

## Design goal

Keep business behavior understandable and testable even when frameworks, databases, CMSs, or providers change. Keep modules small enough for a developer or AI agent to understand in one focused context.
