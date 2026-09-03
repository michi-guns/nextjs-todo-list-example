# Product Decisions

Canonical durable Product Decisions (`D-*`). These decisions own accepted observable product behavior and design semantics. The generated Agent PRD is the exact projection; this ledger preserves the decisions and rationale. See the [Testing Decisions and Test Contracts ledger](TESTING.md) for the `TST-*` obligations that verify these behaviors.

<a id="d-001"></a>

## D-001 — Personal authenticated area

- **Status:** ACCEPTED
- **Source:** PRD, sections 3–4; accepted todo reference scope
- **Related:** [OD-002](OPEN-DECISIONS.md#od-002), [Agent PRD](../output/agent/PRD.md#4-users-and-permissions)

Anonymous visitors may view the public landing page and enter authentication flows. A signed-in user may read and mutate only that user's lists and tasks. Requests for another user's private resource do not reveal whether it exists. The signed-in product area is not a `Workspace` domain or persistence entity: lists belong directly to the user through `userId`, and tasks belong to lists. Teams, organizations, roles, shared lists, and collaboration are out of scope for the current todo reference baseline.

<a id="d-002"></a>

## D-002 — Password and magic-link authentication

- **Status:** ACCEPTED
- **Source:** PRD, goals and acceptance sections
- **Related:** [Agent PRD](../output/agent/PRD.md#4-users-and-permissions)

The todo reference baseline must demonstrate email/password sign-up and sign-in plus magic-link request and consumption. Sign-out is required. OAuth and social login are out of scope.

<a id="d-003"></a>

## D-003 — Default Inbox and list lifecycle

- **Status:** ACCEPTED
- **Source:** PRD, section 5.1
- **Related:** [OD-007](OPEN-DECISIONS.md#od-007), [OD-012](OPEN-DECISIONS.md#od-012), [OD-013](OPEN-DECISIONS.md#od-013), [OD-014](OPEN-DECISIONS.md#od-014), [OD-015](OPEN-DECISIONS.md#od-015), [OD-016](OPEN-DECISIONS.md#od-016), [Agent PRD](../output/agent/PRD.md#51-lists)

A user may own many lists. List names are trimmed, contain 1–80 characters, and are unique per user using a case-insensitive comparison. Whenever an authenticated private workspace loads and the user has no lists, the product atomically and idempotently creates one list named `Inbox`. After creation, that Inbox is an ordinary list and may be renamed or deleted. Deleting the final list causes a new empty Inbox to be created on the next private workspace load. Any existing list prevents automatic Inbox creation. Deleting a list removes its tasks. List reads use forward cursor pagination with 20 records by default and at most 100, remain deterministic, and show the oldest-created list first. The dashboard loads additional list pages through a visible `Load more` interaction; manual reordering is outside the current todo reference baseline.

<a id="d-004"></a>

## D-004 — Task lifecycle and statuses

- **Status:** ACCEPTED
- **Source:** PRD, section 5.2
- **Related:** [OD-001](OPEN-DECISIONS.md#od-001), [OD-008](OPEN-DECISIONS.md#od-008), [OD-009](OPEN-DECISIONS.md#od-009), [OD-010](OPEN-DECISIONS.md#od-010), [OD-011](OPEN-DECISIONS.md#od-011), [OD-012](OPEN-DECISIONS.md#od-012), [OD-014](OPEN-DECISIONS.md#od-014), [OD-015](OPEN-DECISIONS.md#od-015), [OD-016](OPEN-DECISIONS.md#od-016), [Agent PRD](../output/agent/PRD.md#52-tasks)

Each task belongs to exactly one user-owned list. A task has a required title containing 1–200 characters after trimming, optional trimmed notes containing at most 5,000 characters, timestamps, and one of `todo`, `in_progress`, or `done`. Task titles are unique within one list using a case-insensitive comparison; the same title may appear in different lists. Empty or whitespace-only notes are treated as absent. New tasks begin as `todo`; afterward, users may move a task directly between any valid statuses. Reapplying the current status succeeds without changing the status. Users may create, edit, delete, and change task status. Task reads use forward cursor pagination with 20 records by default and at most 100, remain deterministic, and show the newest-created task first. The dashboard loads additional task pages through a visible `Load more` interaction. Completed tasks remain stored and are shown by default; users may explicitly hide them without deleting them or changing the relative order of visible tasks. Changing the selected list or completed-task filter restarts task pagination. Manual reordering is outside the current todo reference baseline.

<a id="d-005"></a>

## D-005 — Editorial landing content is separate from todo data

- **Status:** ACCEPTED
- **Source:** PRD, goals, data ownership, and non-goals
- **Related:** [Agent PRD](../output/agent/PRD.md#6-data-ownership-product-view)

The public landing surface contains editable headline, blurb, and CTA content. Editorial content is separate from personal lists and tasks; todo data never lives in the editorial content system.

<a id="d-006"></a>

## D-006 — Complete, locally verifiable reference journey

- **Status:** SUPERSEDED
- **Superseded by:** D-009
- **Source:** PRD, sections 2 and 7
- **Related:** [Agent PRD](../output/agent/PRD.md#7-starter-baseline-complete-acceptance)

The original completion contract requires a real local journey: authenticate, obtain `Inbox`, create a list, create a task, change status, sign out, and verify private-data protection. Server-boundary validation, database-free domain/application tests, real local PostgreSQL integration tests, the core Playwright path, and local commit quality hooks are part of acceptance. D-009 retains this journey inside the broader starter baseline. Deployment and CI remain separate scope decisions.

<a id="d-007"></a>

## D-007 — Last successful write wins for concurrent edits

- **Status:** ACCEPTED
- **Source:** current concurrent-edit behavior review
- **Related:** [Agent PRD](../output/agent/PRD.md#53-concurrent-edits)

Concurrent list and task edits do not require version tokens, merge prompts, or stale-write rejection. Each accepted mutation changes only the fields it contains. When accepted mutations write the same field, the value from the last successfully committed write is the observable result; mutations of different fields may both remain visible. Existing ownership, validation, and uniqueness rules still apply.

<a id="d-008"></a>

## D-008 — Phased Sanity freshness and editorial preview

- **Status:** ACCEPTED
- **Source:** current Sanity capability and delivery-sequencing review
- **Related:** [Agent PRD](../output/agent/PRD.md#54-editorial-publishing-and-preview)

Published landing-content changes automatically invalidate the affected public cache through a trusted Sanity webhook, and an authorized operator can invoke the same invalidation as a recovery action. Live draft preview with click-to-edit visual editing is also an intended starter capability, but it is deferred until after the webhook and manual-recovery baseline. The deferred preview must let an authorized editor read drafts and see draft changes in the Sanity Presentation Tool without publishing them.

<a id="d-009"></a>

## D-009 — Opinionated reusable starter with a complete todo reference

- **Status:** ACCEPTED
- **Source:** current product-intent realignment
- **Related:** [Agent PRD](../output/agent/PRD.md#1-product-purpose-and-reuse-contract), [TD-028](TECHNICAL.md#td-028)
- **Supersedes:** D-006

This repository's product is an opinionated, production-minded Next.js starter implemented as a complete personal-todo reference application. A derived application should be able to replace mostly the domain and UI while retaining or adapting the cross-cutting foundations. The starter provides one preferred stack and architecture rather than abstractions for interchangeable frameworks, databases, authentication systems, or content platforms.

The todo reference baseline remains locally verifiable through the complete authenticated journey and agreed boundary, persistence, integration, browser, migration, and quality evidence. Use current documented best practices of the accepted stack and the simplest design that is genuinely robust, following [TD-028](TECHNICAL.md#td-028). Add modest complexity when it produces a clear, reusable gain in safety, correctness, operability, maintainability, or avoided rework; do not spend baseline implementation time on speculative abstraction or low-leverage polish. Deployment and CI remain separate explicit scope decisions.

<a id="d-010"></a>

## D-010 — Environment and delivery workstream

- **Status:** ACCEPTED
- **Source:** T-18 delivery-scope acceptance following T-18.1 review
- **Related:** [D-009](#d-009), [TD-026](TECHNICAL.md#td-026), [TD-027](TECHNICAL.md#td-027), [TST-PIPELINE-001](TESTING.md#tst-pipeline-001), [Agent PRD](../output/agent/PRD.md#2-goals)

The repository accepts a separate T-18 through T-25 environment and delivery
workstream in addition to the locally verifiable starter baseline. The
workstream includes automatic repository CI quality gates with no deployment
side effects, a manually requested isolated Preview path, and a manually
approved exact-ref Production release path. Hosted resources, credentials, and
protected approvals remain explicit prerequisites; local configuration must
never imply them. CI cannot access Production secrets or create Preview
deployments, and ordinary pull requests do not create deployed Previews.
