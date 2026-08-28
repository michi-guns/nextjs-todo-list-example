# Testing First-Class Design Implementation Plan

> **For agentic workers:** Use the repository's `testing-first-class` and `test-driven-development` skills to implement this plan task-by-task.

**Goal:** Establish a canonical, ID-based testing design system that lets agents discover, implement, and account for test obligations as the product grows.

**Architecture:** Add a project-owned `.dwf/decisions/TESTING.md` ledger for testing policy and durable `TST-*` contracts. Keep product and technical decisions authoritative for behavior and mechanisms; link them to test contracts instead of duplicating them. Connect the ledger to the Agent SPEC, delivery tracker, agent guidance, and a thin project-local skill.

**Tech Stack:** Markdown, the repository's DWF workspace, project-local Agent Skills, pnpm validation commands.

**Spec:** `.dwf/output/agent/PRD.md`, `.dwf/output/agent/SPEC.md`, and the accepted decisions under `.dwf/decisions/`.

## Global Constraints

- `.dwf/` remains the canonical product and technical design authority.
- `TESTING.md` owns test design and traceability; it does not override Product or Technical Decisions.
- Test contracts describe behavior and risk, not test filenames or implementation details.
- Blocked or future evidence must remain visible with an explicit dependency and follow-up task.
- Do not add application code, dependencies, CI, or deterministic automation in this slice.

---

### Task 1: Define the testing authority and initial test contracts

**Files:**

- Create: `.dwf/decisions/TESTING.md`

**Acceptance criteria:**

- [ ] The ledger defines the relationship between Product Decisions, Technical Decisions, test policy decisions, test contracts, tasks, executable tests, and run evidence.
- [ ] The ledger defines stable `TSD-*` and `TST-*` identifiers and lifecycle statuses.
- [ ] The current baseline's important database, auth, capability, boundary, Sanity, UI, end-to-end, migration, and performance obligations have explicit contracts.
- [ ] Existing T-03 evidence is represented without overstating what it proves.

**Verification:**

- [ ] Every contract links to its relevant product/technical decisions, SPEC area, owning task, evidence modes, and dependencies.
- [ ] No contract claims future evidence is verified.

**Dependencies:** None.

### Task 2: Wire canonical navigation and SPEC traceability

**Files:**

- Modify: `.dwf/README.md`
- Modify: `.dwf/output/agent/SPEC.md`
- Modify: `docs/architecture/testing-strategy.md`
- Modify: `docs/index.md`
- Modify: `docs/documentation-protocol.md`

**Acceptance criteria:**

- [ ] Fresh agents can find the testing ledger from the DWF and documentation entry points.
- [ ] The Agent SPEC points to the testing ledger and maps its major verification areas to `TST-*` contracts.
- [ ] Supporting testing strategy documentation points to the ledger as the owner of individual test obligations.
- [ ] Documentation ownership rules explain that the ledger supplements, rather than competes with, Product and Technical Decisions.

**Verification:**

- [ ] All new relative links resolve.
- [ ] No supporting document redefines the canonical test contracts.

**Dependencies:** Task 1.

### Task 3: Wire delivery and agent execution guidance

**Files:**

- Modify: `TODO.md`
- Modify: `AGENTS.md`
- Modify: `docs/development/agent-guide.md`
- Modify: `docs/development/implementation-workflow.md`
- Modify: `.agents/skills/using-agent-skills/SKILL.md`

**Acceptance criteria:**

- [ ] Relevant delivery tasks reference their `TST-*` contracts.
- [ ] Task start requires reading and reconciling affected test contracts.
- [ ] Task completion requires explicit verified, partial, blocked, deferred, or retired outcomes with evidence or follow-up links.
- [ ] The project routing guidance invokes `testing-first-class` alongside TDD for implementation and test work.

**Verification:**

- [ ] No current implementation task has testing obligations only in prose without a `TST-*` reference.
- [ ] The workflow does not require unavailable infrastructure for a documentation-only design task.

**Dependencies:** Task 1.

### Task 4: Create the thin testing-first-class skill

**Files:**

- Create: `.agents/skills/testing-first-class/SKILL.md`

**Acceptance criteria:**

- [ ] The skill explains the testing mental model, identifiers, statuses, and source-of-truth boundaries.
- [ ] The skill requires agents to discover affected test contracts before implementation and use TDD for executable behavior.
- [ ] The skill prevents silent omission and distinguishes partial, blocked, deferred, and verified evidence.
- [ ] The skill remains project-specific and concise, with no helper script or duplicated testing manual.

**Verification:**

- [ ] The skill passes the bundled skill validator.
- [ ] Its routing description is specific enough not to replace ordinary TDD or unrelated documentation work.

**Dependencies:** Task 1.

### Task 5: Validate the documentation system

**Files:**

- No additional files.

**Acceptance criteria:**

- [ ] Markdown links, anchors, identifier references, and status vocabulary are internally consistent.
- [ ] DWF validation and repository quality checks produce no task-caused failures.

**Verification:**

- [ ] Run the skill validator, DWF workspace validation if available, `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `git diff --check`.

**Dependencies:** Tasks 1–4.
