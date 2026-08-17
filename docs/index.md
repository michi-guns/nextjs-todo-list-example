# Project Documentation

This directory is the knowledge system for the Next.js Todo List Example.

## Start here

- [DWF design authority](../.dwf/README.md)
- [System in five minutes](./handbook/system-in-five-minutes.md)
- [Documentation protocol](./documentation-protocol.md)
- [Architecture overview](./architecture/overview.md)
- [Technology stack](./architecture/stack.md)
- [Data ownership](./data/ownership.md)

## Build or change a feature

1. Read [`.dwf/README.md`](../.dwf/README.md), including its rules and current context.
2. Read the relevant sections of [`.dwf/PRD.md`](../.dwf/PRD.md) and [`.dwf/SPEC.md`](../.dwf/SPEC.md).
3. Read relevant ADRs, supporting architecture/data/domain documents, and unresolved questions/decisions.
4. Reconcile the accepted design with the current repository before planning delivery or implementation.
5. Keep Delivery Roadmap/Milestone/Phase artifacts outside `.dwf/`; keep task decomposition below the Phase boundary.

The `.dwf/` workspace is authoritative for product and technical design. This `docs/` tree supplies supporting, operational, and explanatory material.

## Document map

- `../.dwf/`: canonical product/technical design authority
- `handbook/`: fast human orientation and derived explanations
- `architecture/`: supporting architecture notes
- `domain/`: supporting domain vocabulary and lifecycle notes
- `data/`: supporting data ownership and consistency notes
- `development/`: coding and quality guidance
- `runbooks/`: operational recovery procedures
- `documentation-protocol.md`: documentation navigation and maintenance protocol

When documents disagree, follow [the documentation protocol](./documentation-protocol.md) and the semantic authority rules in [`.dwf/README.md`](../.dwf/README.md).
