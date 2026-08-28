# Project Documentation

This directory is the knowledge system for the Next.js Todo List Example.

## Start here

- [DWF design authority](../.dwf/README.md)
- [Testing decisions and test contracts](../.dwf/decisions/TESTING.md)
- [System in five minutes](./handbook/system-in-five-minutes.md)
- [Documentation protocol](./documentation-protocol.md)
- [Architecture overview](./architecture/overview.md)
- [Technology stack](./architecture/stack.md)
- [Data ownership](./data/ownership.md)

## Build or change a feature

1. Read [`.dwf/README.md`](../.dwf/README.md), including its rules and current context.
2. Read the generated [Agent PRD](../.dwf/output/agent/PRD.md) and [Agent SPEC](../.dwf/output/agent/SPEC.md).
3. Read the testing ledger [`../.dwf/decisions/TESTING.md`](../.dwf/decisions/TESTING.md) and relevant Product, Technical, Edge Case, and open-state ledgers, plus supporting architecture/data/domain documents.
4. Reconcile the accepted design and affected test contracts with the current repository before planning delivery or implementation.
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
