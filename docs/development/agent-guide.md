# AI Coding Agent Guide

## Mission

Evolve this opinionated starter and its todo reference implementation while preserving domain boundaries, reusable foundations, data ownership, and the documentation system.

## Before coding

1. Read `docs/index.md` and `docs/documentation-protocol.md`.
2. Read the relevant product, architecture, domain, and data documents.
3. Read linked ADRs and check assumptions/open questions.
4. Inspect repository conventions and the current implementation.

## During implementation

- Prefer small vertical slices.
- Keep cross-cutting foundations independent from todo-specific concepts so derived applications can replace mostly domain and UI code.
- Use current stable, recommended APIs and the simplest genuinely robust implementation. Add complexity only for a clear reusable benefit; do not build speculative provider-swapping abstractions.
- Keep domain code framework-independent.
- Validate untrusted input with Zod.
- Keep Drizzle and Sanity behind infrastructure adapters.
- Keep Server Components for direct reads and Server Actions for UI mutations.
- Record new uncertainty as an assumption.

## Before completion

Run relevant type checks, linting, tests, builds, and migration checks. Update current-state documents, indexes, and ADRs when architecture or behavior changes.
