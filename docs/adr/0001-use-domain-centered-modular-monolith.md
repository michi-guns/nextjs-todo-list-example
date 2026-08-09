# ADR-0001: Use a Domain-Centered Modular Monolith

## Status

Accepted

## Context

The project is built by a small team and is heavily assisted by AI agents. It needs clear business boundaries without the operational cost of microservices.

## Decision

Use one deployable Next.js application organized by business modules. Separate domain, application, infrastructure, and presentation responsibilities where useful.

## Consequences

Positive: capabilities remain cohesive, deployment stays simple, and agents can retrieve focused context.

Negative: module boundaries require discipline and in-process coupling can grow if dependency rules are ignored.

## Related Documents

- [Architecture overview](../architecture/overview.md)
- [Dependency rules](../architecture/dependency-rules.md)
