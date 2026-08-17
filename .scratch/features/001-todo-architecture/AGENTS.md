# Feature Agent Notes

## What We Are Building

- Feature: implementation architecture for the Next.js Todo List Example spike
- User value: remove ambiguity before implementation by defining module boundaries, files, contracts, and flows
- Primary owner/context: this repository's product and engineering design session

## Why

- Problem: the canonical PRD and SPEC define high-level behavior but do not yet specify the concrete file system and cross-module contracts
- Success signal: a separate implementation agent can build the spike without guessing about ownership, signatures, data flow, or boundary behavior
- Important constraint: preserve the existing product decisions and the domain-centered modular-monolith direction

## Scope

- In scope: core modules, submodules, file responsibilities, dependency direction, TypeScript/Zod contracts, representative examples, and implementation sequencing
- Out of scope: changing product scope, adding non-goal features, or editing application source code during design
- Related work: canonical product requirements in `docs/product/PRD.md` and `docs/product/SPEC.md`

## Feature Rules

- Follow the repository `AGENTS.md` and canonical project documentation.
- Keep design pragmatic for a small team and a public teaching example.
- Prefer explicit boring files and contracts over speculative abstractions.
- Ask one high-value decision question at a time.
- Mark normative contracts separately from illustrative examples.

## Read Order

1. Repository `AGENTS.md`.
2. This file.
3. `GLOSSARY.md`.
4. `features-cli progress --feature todo-architecture --json`.
5. `GRILL_SESSION.md`, continuing from `## Next Question`.
