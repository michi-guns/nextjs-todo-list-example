# ADR-0002: Use Sanity for Editorial Landing Content

## Status

Accepted

## Context

Marketing copy should be editable without application deployments, while todo data needs transactional ownership and authorization.

## Decision

Use Sanity for landing-page editorial content only. Access it through infrastructure adapters, validate query results, and map them into application view models.

## Consequences

Positive: content can change independently and remains separate from transactional workflows.

Negative: the system has a second data store and must keep ownership and failure behavior explicit.

## Related Documents

- [Sanity data rules](../../docs/data/sanity.md)
- [Data ownership](../../docs/data/ownership.md)
