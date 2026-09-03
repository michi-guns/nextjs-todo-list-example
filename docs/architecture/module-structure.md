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

Entities, value objects, invariants, and domain errors. It must remain framework-independent. In this repository, repository ports live in `application/`, not here.

## Application

Use cases, commands, queries, DTOs, and repository ports. It coordinates work but does not execute SQL or render JSX.

## Infrastructure

Drizzle repositories, Sanity adapters, external providers, mappers, and technical configuration.

## Presentation

Server Actions, Route Handler adapters, input schemas, and view models. In this repository, dashboard UI lives in `components/dashboard`.

Architectural folders make todo-specific code replaceable and keep reusable foundations independent from the reference domain. New feature code should keep files small and add deeper structure only when it contains a real responsibility.
