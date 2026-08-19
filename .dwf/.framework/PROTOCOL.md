# Design Workspace Framework — Candidate Protocol

Status: **PROPOSAL / PRE-EXTRACTION CANDIDATE**

This protocol defines the proposed Design Workspace Framework (DWF) mental model and the contract between reusable Framework machinery and one project's Workspace instance.

It intentionally contains no project-specific product or technical truth.

## 1. Core model

A DWF-enabled project uses one hidden root:

```text
.dwf/
├── .framework/      # reusable/versioned DWF machinery
└── ...              # project-specific Workspace state
```

The ownership rule is strict:

```text
.dwf/.framework/**
    = HOW DWF works

.dwf/** excluding .framework
    = WHAT THIS PROJECT has established
```

The Framework supplies semantics, Skills, templates, and optional tooling. The Workspace stores project truth and project-derived projections.

A Framework artifact must not own project-specific design truth. A Workspace artifact must not redefine the generic DWF protocol.

## 2. Framework installation boundary

`.dwf/.framework/` is supplied by a known DWF distribution/version. Project Agents must not independently recreate or mutate it during ordinary project work.

Normal project operations treat `.framework/**` as read-only.

Framework mutation is allowed only during an explicit DWF install, upgrade, or framework-development operation.

`VERSION` identifies the installed framework distribution.

The Framework may contain:

```text
.framework/
├── VERSION
├── PROTOCOL.md
├── PROPOSALS.md   # optional local framework-enhancement ledger
├── skills/
├── templates/
├── schemas/       # only when implemented
└── validators/    # only when implemented
```

### Local framework proposals

Until the Framework has a canonical distribution repository, a local installation may use `PROPOSALS.md` to preserve reusable framework improvements discovered during project work.

The proposal ledger is Framework-owned and must contain only generic DWF improvements, never project-specific product or technical truth. Proposals are non-authoritative until intentionally integrated into the relevant protocol, Skill, template, glossary, schema, or validator and included in a versioned Framework revision.

Use stable proposal IDs and preserve resolved entries as history. An accepted proposal may remain pending integration; acceptance records intent, while the current Framework contract remains the installed protocol and executable machinery.

Do not create fake automation. If a capability is semantic-only, say so. If an executable validator/schema exists, package the real implementation.

## 3. Standard project Workspace schema

DWF is structurally prescriptive to reduce cognitive load. Projects may differ in content depth, but fundamental knowledge categories have predictable locations.

Candidate standard:

```text
.dwf/
├── .framework/
│   └── ...
│
├── README.md
├── CONTEXT.md
├── RULES.md
├── GLOSSARY.md          # optional
├── COLLABORATION.md     # optional
│
├── decisions/
│   ├── PRODUCT.md
│   ├── TECHNICAL.md
│   ├── EDGE-CASES.md
│   ├── OPEN-QUESTIONS.md
│   └── OPEN-DECISIONS.md
│
├── concepts/            # optional
│   └── ...
│
└── output/
    ├── agent/
    │   ├── PRD.md
    │   └── SPEC.md
    └── human/
        ├── PRD.md
        └── SPEC.md
```

### Required core

These locations should exist in every initialized DWF Workspace:

- `README.md`
- `CONTEXT.md`
- `RULES.md`
- `decisions/PRODUCT.md`
- `decisions/TECHNICAL.md`
- `decisions/EDGE-CASES.md`
- `decisions/OPEN-QUESTIONS.md`
- `decisions/OPEN-DECISIONS.md`
- `output/agent/PRD.md`
- `output/agent/SPEC.md`
- `output/human/PRD.md`
- `output/human/SPEC.md`

An empty required ledger should explicitly state that it currently has no entries. Absence must not be used to mean both "none" and "not initialized".

### Standard optional slots

- `GLOSSARY.md`
- `COLLABORATION.md`
- `concepts/`

Create optional slots only when they provide real value.

## 4. Project-root ownership

The `.dwf/` root is project-oriented.

### `README.md`

Fresh-Agent entrypoint and navigation. It should explain what this project Workspace represents, where each knowledge category lives, and which outputs are available. It is an index, not a duplicate requirements summary.

### `CONTEXT.md`

Verified durable facts about the project, environment, repositories, integrations, actors, and system boundaries.

Ownership test:

- if a statement became true because a product/design choice was accepted, it belongs in `decisions/PRODUCT.md`;
- if it became true because an implementation/architecture mechanism was accepted, it belongs in `decisions/TECHNICAL.md`;
- if it is an independently verified fact, it may belong in `CONTEXT.md`.

Code/repository reality is evidence for context and feasibility. It does not silently rewrite product authority.

### `RULES.md`

Mandatory project-specific constraints. Prefer stable `RULE-*` IDs when the project has enough rules to benefit from durable references.

Rules constrain work but do not override explicit product behavior, correctness, legal obligations, or security requirements.

### `GLOSSARY.md`

Optional stable project/domain terminology. Framework terminology belongs to `.framework/PROTOCOL.md` or Framework-owned references, not the project glossary.

### `COLLABORATION.md`

Optional durable Human/Agent communication preferences. It may affect explanation style, not project semantics.

## 5. Durable design ledgers

### Thin decision records

DWF stores current accepted decisions, not routine deliberation.

- Record the final product result in `PRODUCT.md` and the final technical result in `TECHNICAL.md`.
- Keep each decision short. State the chosen behavior or mechanism and its scope. Add reasoning only when the tradeoff is unusually complex or future readers are likely to question it.
- `OPEN-DECISIONS.md` contains unresolved choices only. An `OD-*` record is not a required step before a `D-*` or `TD-*` decision.
- When an open choice is resolved, record the result in its owning ledger and remove the `OD-*` entry. Git keeps the ordinary decision history.
- Do not repeat the same decision across several ledgers. Generated outputs and supporting documents include only the parts their readers need.
- Keep a superseded entry only when current migration, compatibility, or implementation work still needs the old contract.

### `decisions/PRODUCT.md` — `D-*`

Canonical durable Product Decisions.

A Product Decision concerns accepted observable product/design behavior or semantics.

Classification test:

> If changing the decision would change observable product behavior, it normally belongs in `D-*`.

Use stable IDs and anchors:

```markdown
<a id="d-001"></a>

## D-001 — Short title

- Status: ACCEPTED | SUPERSEDED
- Source: ... # optional provenance
- Supersedes: D-NNN # optional
- Superseded by: D-NNN # optional
- Related: ... # optional

Decision text.
```

Never reuse retired IDs. Keep the active ledger focused on current accepted truth. Git keeps routine history. Preserve a superseded entry only when current work still needs to understand the old contract.

### `decisions/TECHNICAL.md` — `TD-*`

Canonical durable Technical Decisions.

A Technical Decision concerns implementation/architecture mechanisms whose replacement could preserve observable product behavior.

Classification test:

> If the mechanism could change without changing the observable PRD contract, it normally belongs in `TD-*`.

A Technical Decision is downstream of accepted Product Decisions and may never override a `D-*`.

Use stable IDs and anchors:

```markdown
<a id="td-001"></a>

## TD-001 — Short title

- Status: PROVISIONAL | ACCEPTED | SUPERSEDED
- Related product decisions: D-NNN, ...
- Source: ... # optional provenance
- Supersedes: TD-NNN # optional
- Superseded by: TD-NNN # optional
- Scope: ... # optional

Decision text.
```

`PROVISIONAL` is allowed only when the project intentionally authorizes a bounded temporary technical commitment. A provisional mechanism may not weaken settled Product Decisions.

Do not create a second mandatory ADR system that competes with `TD-*` unless a future DWF version assigns ADRs a clearly non-overlapping role.

### `decisions/EDGE-CASES.md` — `EC-*`

Durable catalog of explicitly considered scenarios.

Edge Cases are design knowledge but do not independently own product/technical behavior. Each `EC-*` should point to the `D-*`, `TD-*`, `RULE-*`, PRD/SPEC section, or other owner that determines the correct behavior.

Use stable IDs and anchors:

```markdown
<a id="ec-001"></a>

## EC-001 — Short scenario

- Status: HANDLED | OPEN
- Product decisions: D-NNN, ... # optional
- Technical decisions: TD-NNN, ... # optional
- Rules: RULE-NNN, ... # optional
- Tags: ... # optional

Scenario and accepted handling, or the unresolved gap.
```

An `EC-*` must never override its owning contract.

### `decisions/OPEN-QUESTIONS.md` — `OQ-*`

Unresolved factual questions: **what is true?**

Do not guess an answer merely to close an item.

Suggested shape:

```markdown
<a id="oq-001"></a>

## OQ-001 — Short title

- Status: OPEN | ANSWERED
- Blocking: YES | NO
- Asked of / Source: ...
- Related: ...

### Exact Question

...

### Why It Matters

...

### Answer

Pending.
```

When answered, preserve the record and promote durable facts into `CONTEXT.md` when appropriate.

### `decisions/OPEN-DECISIONS.md` — `OD-*`

Unresolved choices: **what should we choose?**

Suggested shape:

```markdown
<a id="od-001"></a>

## OD-001 — Short title

- Status: OPEN | RESOLVED
- Impact: PRD | SPEC | BOTH
- Blocking: YES | NO
- Related: ...

### Problem / Conflict

...

### Accepted Constraints

...

### Decision Required

...

### Resolution

Pending.
```

When resolved, create or update the owning `D-*` or `TD-*`, remove the `OD-*` entry, and regenerate affected outputs. Preserve reasoning only for the rare cases defined by the thin decision record rule.

## 6. Generated projections

`output/` contains reproducible projections, not unique design truth.

Hard invariant:

> Deleting `.dwf/output/` must never destroy unique project design knowledge.

Given the project Workspace plus the correct Framework version/Skills, a capable Agent should be able to reproduce the outputs.

### `output/agent/PRD.md`

Agent-oriented product contract. It is generated from verified project context, rules as constraints, accepted `D-*`, relevant `EC-*`, and unresolved-state visibility.

It is optimized for exactness and low inference. It does not replace accepted `D-*` truth.

Technical mechanisms from `TD-*` must not leak into the PRD as product requirements unless the mechanism itself is observably required by an accepted Product Decision.

### `output/agent/SPEC.md`

Agent-oriented technical contract. It is downstream of:

- `RULES.md`;
- `CONTEXT.md`;
- accepted `D-*`;
- Agent PRD;
- accepted/provisionally authorized `TD-*`;
- relevant `EC-*`.

The SPEC implements the PRD and may never weaken or reinterpret it away.

### `output/human/PRD.md` and `output/human/SPEC.md`

Human-oriented projections derived from the validated Agent pair. They optimize comprehension, examples, and communication while preserving behavior exactly.

If Human and Agent projections disagree, regenerate the Human projection from the validated Agent pair.

### Generation order

```text
Settle/update Workspace state
        ↓
Generate Agent PRD
        ↓
Generate Agent SPEC
        ↓
Validate Agent pair
        ↓
Generate Human PRD
        ↓
Generate Human SPEC
```

Do not independently redesign inside Human projections.

## 7. Concepts

`concepts/` contains derived developer deep-dives for substantial project concepts/subsystems.

Concepts are explanatory, not authoritative.

A Concept should exist when a developer materially benefits from one coherent mental model that connects multiple canonical owners.

Each Concept should:

- state that it is derived/non-authoritative;
- provide a short Quick Reload section;
- define responsibilities and non-responsibilities;
- reference stable `D-*`, `TD-*`, `EC-*`, rules, and Agent contract sections;
- label illustrative code/interfaces as illustrative unless a canonical owner mandates the exact shape;
- never be the only location of an implementation-required invariant.

## 8. Agent Skills

Framework-owned Skills live under:

```text
.dwf/.framework/skills/<skill-name>/SKILL.md
```

Skills define repeatable DWF operations. `SKILL.md` is the orchestration entrypoint and may use progressive disclosure into supporting resources only when needed.

This candidate distribution includes Skills for:

- orientation;
- workspace initialization;
- best-effort migration;
- Product Decision management;
- Technical Decision management;
- Edge Case management;
- Agent PRD generation;
- Agent SPEC generation;
- Human PRD generation;
- Human SPEC generation;
- repository feasibility/minimal-change reconciliation;
- Workspace validation.

A Skill may guide project mutations only within the authority granted by the user and the Workspace ownership rules. Framework files remain read-only during ordinary project operations.

## 9. Chats are working surfaces, not required durable truth

This proposal does not require a persistent `sessions/` or `topics/` hierarchy.

A chat, Agent run, or local planning scratchpad may support reasoning, but current project truth must survive independently through the Workspace ledgers, context, concepts, outputs, and Git history.

A fresh Agent should not need historical conversations to understand the accepted design.

If a project needs a temporary handoff artifact, keep it small and explicitly non-authoritative rather than rebuilding a permanent conversation-history system by default.

## 10. Migration philosophy

The target schema is predictable; migration into it is intentionally Agentic/best-effort.

Migration should:

1. inventory existing documentation;
2. classify content by semantic ownership, not filename alone;
3. preserve current accepted decisions and stable IDs where possible, carrying rationale only when the thin decision record rule calls for it;
4. split mixed-authority files when needed;
5. surface contradictions as open questions/decisions rather than guessing;
6. repair references after moves;
7. generate/re-generate projections only after durable state is coherent;
8. never modify `.framework/**` during ordinary project migration.

Do not build a complicated deterministic converter merely to normalize arbitrary legacy documentation.

## 11. Repository-reality reconciliation

Before implementation delivery planning, compare the accepted design with the real repository architecture.

Use evidence-oriented classifications where useful:

- `ALIGNED`
- `MINIMAL_EXTENSION`
- `DESIGN_SHAPE_PRESSURE`
- `VERIFIED_CONFLICT`
- `EVIDENCE_GAP`

Prefer existing extension points. Do not force code structure to mirror conceptual nouns in documentation.

Code reality does not silently override product truth. A verified conflict is surfaced for design review.

## 12. Validation invariants

A valid proposed DWF Workspace should satisfy at least:

1. **Framework isolation** — `.framework/**` contains no project-specific truth.
2. **Workspace isolation** — project decisions/requirements are not stored inside `.framework/**`.
3. **Predictable schema** — every fundamental knowledge category uses its standard location.
4. **Decision separation** — `D-*`, `TD-*`, and `EC-*` retain separate semantics.
5. **Hierarchy** — `TD-*` never overrides `D-*`; SPEC never weakens PRD.
6. **Open-state honesty** — unresolved facts/choices are not silently converted into accepted truth.
7. **Output reproducibility** — `output/` contains no unique design truth.
8. **Concept derivation** — Concepts do not invent requirements.
9. **Fresh-Agent orientation** — a capable Agent can start at `.dwf/README.md` without historical chat context.
10. **Framework immutability during normal work** — project operations did not edit `.framework/**`.

## 13. Delivery-system boundary

DWF owns design authority and project-understanding state. A separate Delivery System may consume the settled implementation-facing contract to generate Roadmaps, Milestones, and Phases.

Do not store Delivery execution state/tasks inside DWF merely because implementation planning consumes DWF outputs.

Likewise, DWF should not prescribe coding-agent internal task decomposition below the Delivery Phase boundary.

## 14. Candidate status

This protocol is intentionally a pre-extraction candidate. The final DWF framework-extraction session should pressure-test:

- removal of durable Session/Topic machinery;
- framework installation/upgrade semantics;
- exact required/optional Workspace file set;
- edge-case location;
- Skill boundaries;
- framework repository/distribution packaging;
- versioning and validation;
- onboarding UX.

Do not represent this candidate as a stable public DWF release until that review explicitly accepts it.
