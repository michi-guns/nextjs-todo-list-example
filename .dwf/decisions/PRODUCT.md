# Product Decisions

Canonical durable Product Decisions (`D-*`). These decisions own accepted observable product behavior and design semantics. The generated Agent PRD is the exact projection; this ledger preserves the decisions and rationale.

<a id="d-001"></a>

## D-001 — Personal authenticated area

- **Status:** ACCEPTED
- **Source:** PRD, sections 3–4; accepted spike scope
- **Related:** [OD-002](OPEN-DECISIONS.md#od-002), [Agent PRD](../output/agent/PRD.md#4-users-and-permissions)

Anonymous visitors may view the public landing page and enter authentication flows. A signed-in user may read and mutate only that user's lists and tasks. Requests for another user's private resource do not reveal whether it exists. The signed-in product area is not a `Workspace` domain or persistence entity: lists belong directly to the user through `userId`, and tasks belong to lists. Teams, organizations, roles, shared lists, and collaboration are out of scope for the spike.

<a id="d-002"></a>

## D-002 — Password and magic-link authentication

- **Status:** ACCEPTED
- **Source:** PRD, goals and acceptance sections
- **Related:** [Agent PRD](../output/agent/PRD.md#4-users-and-permissions)

The spike must demonstrate email/password sign-up and sign-in plus magic-link request and consumption. Sign-out is required. OAuth and social login are out of scope.

<a id="d-003"></a>

## D-003 — Default Inbox and list lifecycle

- **Status:** ACCEPTED
- **Source:** PRD, section 5.1
- **Related:** [OD-007](OPEN-DECISIONS.md#od-007), [OD-012](OPEN-DECISIONS.md#od-012), [OD-013](OPEN-DECISIONS.md#od-013), [OD-014](OPEN-DECISIONS.md#od-014), [OD-015](OPEN-DECISIONS.md#od-015), [Agent PRD](../output/agent/PRD.md#51-lists)

A user may own many lists. List names are trimmed, contain 1–80 characters, and are unique per user using a case-insensitive comparison. Whenever an authenticated private workspace loads and the user has no lists, the product atomically and idempotently creates one list named `Inbox`. After creation, that Inbox is an ordinary list and may be renamed or deleted. Deleting the final list causes a new empty Inbox to be created on the next private workspace load. Any existing list prevents automatic Inbox creation. Deleting a list removes its tasks. List reads use forward cursor pagination, remain deterministic, and show the oldest-created list first; manual reordering is outside the spike.

<a id="d-004"></a>

## D-004 — Task lifecycle and statuses

- **Status:** ACCEPTED
- **Source:** PRD, section 5.2
- **Related:** [OD-001](OPEN-DECISIONS.md#od-001), [OD-008](OPEN-DECISIONS.md#od-008), [OD-009](OPEN-DECISIONS.md#od-009), [OD-010](OPEN-DECISIONS.md#od-010), [OD-011](OPEN-DECISIONS.md#od-011), [OD-012](OPEN-DECISIONS.md#od-012), [OD-014](OPEN-DECISIONS.md#od-014), [OD-015](OPEN-DECISIONS.md#od-015), [Agent PRD](../output/agent/PRD.md#52-tasks)

Each task belongs to exactly one user-owned list. A task has a required title containing 1–200 characters after trimming, optional trimmed notes containing at most 5,000 characters, timestamps, and one of `todo`, `in_progress`, or `done`. Task titles are unique within one list using a case-insensitive comparison; the same title may appear in different lists. Empty or whitespace-only notes are treated as absent. New tasks begin as `todo`; afterward, users may move a task directly between any valid statuses. Reapplying the current status succeeds without changing the status. Users may create, edit, delete, and change task status. Task reads use forward cursor pagination, remain deterministic, and show the newest-created task first. Completed tasks remain stored and are shown by default; users may explicitly hide them without deleting them or changing the relative order of visible tasks. Manual reordering is outside the spike.

<a id="d-005"></a>

## D-005 — Editorial landing content is separate from todo data

- **Status:** ACCEPTED
- **Source:** PRD, goals, data ownership, and non-goals
- **Related:** [Agent PRD](../output/agent/PRD.md#6-data-ownership-product-view)

The public landing surface contains editable headline, blurb, and CTA content. Editorial content is separate from personal lists and tasks; todo data never lives in the editorial content system.

<a id="d-006"></a>

## D-006 — Complete, locally verifiable spike journey

- **Status:** ACCEPTED
- **Source:** PRD, sections 2 and 7
- **Related:** [Agent PRD](../output/agent/PRD.md#7-spike-complete-acceptance)

Spike completion requires a real local journey: authenticate, obtain `Inbox`, create a list, create a task, change status, sign out, and verify private-data protection. Server-boundary validation, domain/application tests, the core Playwright path, and local commit quality hooks are part of the spike acceptance. Deployment and CI are optional.
