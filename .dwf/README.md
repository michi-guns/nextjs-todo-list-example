# Design Workspace Framework

This directory is the project's canonical design authority. It stores durable product and technical truth; it does not store Delivery state, implementation tasks, or Code Factory orchestration.

## Read order

1. [`RULES.md`](./RULES.md) — mandatory project constraints
2. [`CONTEXT.md`](./CONTEXT.md) — repository and system facts
3. [`PRD.md`](./PRD.md) — current observable product contract
4. [`SPEC.md`](./SPEC.md) — current technical implementation contract
5. [`DECISIONS.md`](./DECISIONS.md) — retained product/design rationale
6. [`ADRs/`](./ADRs/) — architecture decision records
7. [`OPEN-QUESTIONS.md`](./OPEN-QUESTIONS.md) — unresolved factual unknowns
8. [`OPEN-DECISIONS.md`](./OPEN-DECISIONS.md) — unresolved design choices
9. [`concepts/`](./concepts/) — derived developer explanations

## Project scope

A standalone public Next.js example of a small authenticated personal todo product. The spike demonstrates a modern Next.js stack, explicit capability boundaries, Better Auth, Postgres/Drizzle, Sanity landing content, server boundaries, and local quality tooling.

## Authority rules

- `PRD.md` owns current observable product behavior.
- `SPEC.md` owns the technical contract and is subordinate to `PRD.md`.
- `DECISIONS.md` and `ADRs/` preserve rationale and history; accepted current behavior must also appear in PRD/SPEC.
- `OPEN-QUESTIONS.md` and `OPEN-DECISIONS.md` are not accepted truth.
- `concepts/` is explanatory and derived, never authoritative.
- Repository reality is evidence. It does not silently rewrite design authority.

## Delivery boundary

The Delivery System consumes settled implementation-facing truth from this workspace and owns a separate repository-resident Delivery tree such as `implementation/` (Roadmap → Milestones → Phases). No Delivery artifacts currently exist in this repository. Delivery must not redefine this workspace or add task-level implementation plans here.

## Supporting documentation

The existing [`docs/`](../docs/) tree remains useful for handbook, domain, data, development, and runbook material. Its product/technical authority is subordinate to the linked `.dwf/` artifacts after this migration. `docs/index.md` explains the supporting documentation map.

## Migration note

This workspace was migrated from the repository's existing product/technical documents and prior design artifacts with semantic ownership preserved where possible. The supplied generic DWF framework documents live outside this repository and were not modified.
