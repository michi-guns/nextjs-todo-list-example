# Open Questions

Unresolved factual questions (`OQ-*`): what is true? Do not guess an answer merely to close an item.

<a id="oq-001"></a>

## OQ-001 — Better Auth magic-link integration evidence

- **Status:** OPEN
- **Blocking:** YES for the magic-link acceptance path
- **Source:** existing repository inspection and PRD/SPEC
- **Related:** D-002, TD-004, EC-009

### Exact Question

What Better Auth configuration and local/test mail delivery behavior are supported by the installed package version and current environment?

### Why It Matters

The product requires magic-link request/consume behavior, while the repository currently contains only a basic email/password configuration.

### Evidence Needed

Installed Better Auth integration guidance, provider/test-mail configuration, and a deterministic local smoke path.

### Answer

Pending.

<a id="oq-002"></a>

## OQ-002 — Sanity project and document evidence

- **Status:** OPEN
- **Blocking:** YES for the real landing integration
- **Source:** existing repository inspection and PRD/SPEC
- **Related:** D-005, TD-007, EC-007

### Exact Question

What Sanity project, dataset, document type, and published document are available for local integration?

### Why It Matters

The technical contract names the landing fields, but the repository currently has no Sanity dependency or client configuration.

### Evidence Needed

Project configuration and a non-secret local/test document shape.

### Answer

Pending.

<a id="oq-003"></a>

## OQ-003 — Database migration/application state

- **Status:** OPEN
- **Blocking:** YES for persistence verification
- **Source:** existing repository inspection
- **Related:** D-003, D-004, TD-005, TD-006

### Exact Question

Have the current Neon/development migrations been applied to the intended database, and what schema is actually present?

### Why It Matters

The repository contains migration artifacts, but this migration did not connect to or verify an external database.

### Evidence Needed

A safe local/development database inspection during implementation preparation.

### Answer

Pending.
