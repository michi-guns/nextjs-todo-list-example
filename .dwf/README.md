# Project Design Workspace — Next.js Todo List Example

DWF Framework version: see [`.framework/VERSION`](.framework/VERSION).

This repository is a standalone public, opinionated, production-minded Next.js starter implemented through a complete authenticated personal-todo reference application. A derived application should be able to replace mostly the domain and UI while retaining or adapting the cross-cutting foundations. The source tree is currently a scaffold; the generated Agent PRD and SPEC describe the target starter baseline.

## Start here

Project truth:

- [`CONTEXT.md`](CONTEXT.md) — verified repository and system facts
- [`RULES.md`](RULES.md) — mandatory project-specific constraints
- [`decisions/PRODUCT.md`](decisions/PRODUCT.md) — accepted Product Decisions (`D-*`)
- [`decisions/TECHNICAL.md`](decisions/TECHNICAL.md) — accepted Technical Decisions (`TD-*`)
- [`decisions/EDGE-CASES.md`](decisions/EDGE-CASES.md) — explicitly considered scenarios (`EC-*`)
- [`decisions/OPEN-QUESTIONS.md`](decisions/OPEN-QUESTIONS.md) — unresolved facts (`OQ-*`)
- [`decisions/OPEN-DECISIONS.md`](decisions/OPEN-DECISIONS.md) — unresolved choices (`OD-*`)

Generated contracts:

- [`output/agent/PRD.md`](output/agent/PRD.md) — exact observable product contract
- [`output/agent/SPEC.md`](output/agent/SPEC.md) — exact technical implementation contract

Human projections:

- [`output/human/PRD.md`](output/human/PRD.md)
- [`output/human/SPEC.md`](output/human/SPEC.md)

Derived explanations:

- [`concepts/README.md`](concepts/README.md) — index of derived Developer Concepts
- [`concepts/ARCHITECTURAL-SUBSYSTEMS.md`](concepts/ARCHITECTURAL-SUBSYSTEMS.md) — qualified Architectural Subsystem inventory
- [`../docs/index.md`](../docs/index.md) — supporting architecture, domain, data, development, and runbook material

## Ownership

The Workspace root outside `.framework/` is project-specific design state. Product behavior is owned by the Agent PRD, technical behavior by the Agent SPEC, and accepted results by the decision ledgers. Keep decision entries thin. Record reasoning only for rare, difficult tradeoffs. Unresolved facts and choices remain visible rather than being silently inferred.

## Framework machinery

- [`.framework/`](.framework/) — supplied DWF machinery; read-only during ordinary project work
- [`.framework/PROTOCOL.md`](.framework/PROTOCOL.md) — installed framework protocol

Do not place Delivery Roadmaps, Milestones, Phases, or implementation task decomposition in this Workspace. Delivery artifacts, when used, live outside `.dwf/` and reference these contracts.
