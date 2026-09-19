---
status: active
owner: engineering
---

# Technology Stack

This is a supporting inventory of the starter's selected technologies. The canonical technical contract is [`../../.dwf/output/agent/SPEC.md`](../../.dwf/output/agent/SPEC.md); this document provides role-level orientation without overriding it. Stack-selection policy is [`TD-028`](../../.dwf/decisions/TECHNICAL.md#td-028) and [`RULE-012`](../../.dwf/RULES.md#rule-012).

## Selection rule

Coding agents write this starter under the owner's direction. Non-trivial tasks receive fresh independent agent review under [the repository workflow](../../AGENTS.md#review-and-task-follow-through). Use the current documented default of each accepted technology: the APIs the installed versions in this repository actually teach.

Do not revive older framework modes because they dominate training data. Do not require preview flags, experimental compiler options, or last-week surfaces as baseline unless a Technical Decision already accepted them.

The Next.js illustration: use the App Router as this installed Next.js version documents it (Server Components for reads, Server Actions for UI mutations, Route Handlers for JSON, auth, and webhooks). Do not fall back to the Pages Router. Do not make Cache Components, `'use cache'`, or other opt-in Next.js experiments a baseline requirement until this repository's installed Next.js documentation treats them as the default.

**Exceptions.** Keep these even when they are ahead of common tutorials. Do not replace them with more-familiar alternatives, and do not freeze an older major because training data still uses it:

- Drizzle ORM and Drizzle Kit, including the installed 1.x line
- Better Auth
- Zod 4

When those APIs differ from older tutorials, follow this repository's code and the installed package documentation.

## Versions and upgrades

[`package.json`](../../package.json) owns dependency declarations and selects pnpm through `packageManager`. [`pnpm-lock.yaml`](../../pnpm-lock.yaml) records the exact dependency resolutions. Use those files for versions rather than maintaining a second version inventory here.

The [approved dependency refresh](../agentforge/plans/2026-09-18-workflow-documentation-dependencies.md) selects stable releases, retaining the accepted Drizzle ORM and Drizzle Kit RC line, TypeScript 6, and ESLint 9. TypeScript 7 and ESLint 10 are outside the approved scope. Compatibility checks and their evidence belong to the delivery task.

## Application

- **Next.js App Router** — routing, Server Components, Server Actions, and Route Handlers
- **React** — UI composition and client-side interaction where required
- **TypeScript** — application language and static typing
- **shadcn/ui** — reusable UI primitives and dashboard components

## Authentication and data

- **Better Auth** — email/password, magic-link, and session handling
- **PostgreSQL on Neon** — transactional persistence
- **Drizzle ORM and Drizzle Kit** — typed database access, schema, and migrations
- **node-postgres** — shared Node-runtime PostgreSQL driver for Neon and local Testcontainers, with Vercel Fluid Compute pool lifecycle management
- **Sanity** — editable landing-page content only

## Validation and quality

- **Zod** — untrusted input and external-payload validation
- **Pino** — [contextual backend logging](../runbooks/logging.md) at application entries, with shared database policy and safe metadata
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
