---
status: active
owner: engineering
---

# Module Structure

Business capabilities own their code.

```text
src/modules/tasks/
├── domain/
├── application/
├── infrastructure/
└── presentation/
```

## Domain

Entities, value objects, invariants, domain errors, and repository contracts. It must remain framework-independent.

## Application

Use cases, commands, queries, DTOs, and application ports. It coordinates work but does not execute SQL or render JSX.

## Infrastructure

Drizzle repositories, Sanity adapters, external providers, mappers, and technical configuration.

## Presentation

Server Actions, Route Handler adapters, input schemas, view models, and module-owned UI.

Architectural folders are scaffolded here for learning; new feature code should keep files small and add deeper structure when it contains real code.
