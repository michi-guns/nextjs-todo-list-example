# Documentation Protocol

This is a living knowledge system for humans and AI coding agents.

## Reading order

1. `docs/index.md`
2. Relevant current-state architecture or data document
3. Relevant product/domain specification
4. Related ADRs
5. Active assumptions and open questions
6. Relevant development guide or runbook

## Authority

- `product/` defines requirements and the implementation contract.
- `architecture/` and `data/` describe the intended current system.
- `domain/` defines vocabulary, rules, and lifecycle behavior.
- `adr/` records why significant decisions were made; newer current-state documents may supersede it.
- `domain/assumptions/` records unverified beliefs and is never authoritative by itself.
- `development/` defines implementation and validation practice.
- `runbooks/` defines recovery procedures.

## Update rules

- Business behavior changes update the product/domain documents, tests, and affected current-state documents.
- Architecture changes require a new ADR or a superseding ADR, plus updated indexes and architecture docs.
- Verified assumptions move into authoritative documents and remain as history when useful.
- Repeated operational problems get a runbook.
- One document should own one concept or decision; prefer links over duplication.
- Preserve uncertainty explicitly and update indexes when files move.

## ADR rules

Accepted ADRs are not silently rewritten. Corrections may clarify wording without changing the decision. Changed decisions require a new ADR, and the previous ADR is marked superseded.

## Completion checklist

- Authoritative documents were read.
- Relevant assumptions and open questions were checked.
- Current-state documents and indexes are accurate.
- New architecture decisions have ADR coverage.
- Written rules are enforced by tests or tooling where practical.
- Remaining uncertainty is reported honestly.
