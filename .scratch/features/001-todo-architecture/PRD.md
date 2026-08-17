# Architecture Design Brief — Todo List Example

**Status:** design in progress  
**Canonical product source:** [`docs/product/PRD.md`](../../../docs/product/PRD.md)  
**Canonical build source:** [`docs/product/SPEC.md`](../../../docs/product/SPEC.md)

## Problem

The repository's canonical product and technical documents establish the desired todo product and broad technology choices, but they do not yet remove all implementation ambiguity. A developer should not have to guess which files own a rule, which interfaces cross module boundaries, how Sanity is isolated, or how Next.js routes reach application use cases.

## Goal

Produce an implementation-ready architecture design for the spike that specifies:

- the concrete repository file system
- core modules and submodule responsibilities
- dependency direction and composition boundaries
- TypeScript interfaces and function signatures where they are cross-module contracts
- Zod schemas and external API shapes
- persistence and CMS adapter responsibilities
- representative illustrative snippets and end-to-end flows
- an implementation sequence and acceptance matrix

## Users and value

The primary users are developers and coding agents working in this public example. The value is predictable implementation: a separate implementer can build the agreed spike without inventing architecture or silently changing product behavior.

## Scope

In scope:

- auth, landing, lists, tasks, and shared infrastructure boundaries
- Postgres/Drizzle and Sanity adapter contracts
- Server Action and JSON Route Handler boundaries
- domain/application/presentation/infrastructure file layout
- test seams and end-to-end acceptance coverage

Out of scope:

- changing the canonical product scope
- OAuth, collaboration, teams, recurring tasks, attachments, payments, offline support, or production-scale operations
- application source implementation while design is being grilled

## Success criteria

- Every core capability has a clear owner and file-level responsibility.
- Cross-module contracts are normative and linked from the decision ledger.
- Illustrative examples explain intended use without masquerading as implementation.
- Remaining choices are explicit, small, and non-blocking or resolved before implementation starts.
- The design can be handed to an implementation agent without chat history.
