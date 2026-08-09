# AI Coding Agent Guide

## Mission

Evolve this standalone example while preserving its domain boundaries, data ownership, and documentation system.

## Before coding

1. Read `docs/index.md` and `docs/documentation-protocol.md`.
2. Read the relevant product, architecture, domain, and data documents.
3. Read linked ADRs and check assumptions/open questions.
4. Inspect repository conventions and the current implementation.

## During implementation

- Prefer small vertical slices.
- Keep domain code framework-independent.
- Validate untrusted input with Zod.
- Keep Drizzle and Sanity behind infrastructure adapters.
- Keep Server Components for direct reads and Server Actions for UI mutations.
- Record new uncertainty as an assumption.

## Before completion

Run relevant type checks, linting, tests, builds, and migration checks. Update current-state documents, indexes, and ADRs when architecture or behavior changes.
