---
status: active
owner: engineering
---

# Technology Stack

This is a supporting inventory of technologies used by the example. The canonical technical contract is [`.dwf/SPEC.md`](../../.dwf/SPEC.md); this document provides role-level orientation without overriding it.

## Application

- **Next.js App Router** — routing, Server Components, Server Actions, and Route Handlers
- **React** — UI composition and client-side interaction where required
- **TypeScript** — application language and static typing
- **shadcn/ui** — reusable UI primitives and dashboard components

## Authentication and data

- **Better Auth** — email/password, magic-link, and session handling
- **PostgreSQL on Neon** — transactional persistence
- **Drizzle ORM and Drizzle Kit** — typed database access, schema, and migrations
- **Sanity** — editable landing-page content only

## Validation and quality

- **Zod** — untrusted input and external-payload validation
- **Vitest** — domain, application, and schema tests
- **Playwright** — end-to-end browser journeys
- **pnpm** — package management and scripts
- **Husky and lint-staged** — local commit-time quality checks

## Data boundary

The authoritative ownership rules live in [data ownership](../data/ownership.md). This stack document only identifies the systems used to implement those boundaries.

## Related technical rules

- [Next.js boundaries](./nextjs-boundaries.md)
- [Dependency rules](./dependency-rules.md)
- [Testing strategy](./testing-strategy.md)
- [PostgreSQL and Drizzle](../data/postgresql.md)
- [Sanity](../data/sanity.md)
