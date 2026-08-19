# Open Questions

Tracked factual questions (`OQ-*`). Entries with `OPEN` status remain unresolved and must not be guessed closed. Answered entries stay here as evidence history and point to any decision that still remains.

<a id="oq-001"></a>

## OQ-001 — Better Auth magic-link integration evidence

- **Status:** ANSWERED
- **Blocking:** NO — the factual package question is answered and OD-003 has selected the local mechanism
- **Source:** installed `better-auth@1.7.1`, package exports and type/runtime declarations, official Better Auth magic-link documentation
- **Related:** D-002, TD-004, EC-009

### Exact Question

What Better Auth configuration and local/test mail delivery behavior are supported by the installed package version and current environment?

### Why It Matters

The product requires magic-link request/consume behavior, while the repository currently contains only a basic email/password configuration.

### Evidence Needed

Installed Better Auth integration guidance, plugin API evidence, and the delivery seam available for a deterministic local smoke path.

### Answer

The installed `better-auth@1.7.1` package exports the `magicLink` server plugin and `magicLinkClient` client plugin. The server plugin requires a `sendMagicLink` callback and passes it the generated `email`, verification `url`, `token`, and optional metadata. It provides request and verification endpoints, stores verification data through Better Auth, defaults links to a five-minute lifetime, and consumes a token on its first verification attempt.

Better Auth does not select or provide this project's email transport. The application must implement `sendMagicLink`, which may send the URL through a real provider or capture it through a local/test adapter. This confirms that a deterministic test-only capture mechanism is supported without changing Better Auth internals. OD-003 selects the project's local/test mechanism.

Evidence: [Better Auth magic-link documentation](https://better-auth.com/docs/plugins/magic-link) and the installed package declarations under `node_modules/better-auth/dist/plugins/magic-link/`.

<a id="oq-002"></a>

## OQ-002 — Sanity project and document evidence

- **Status:** ANSWERED
- **Blocking:** YES for the real landing integration — the answer is that no usable Sanity resource is currently configured
- **Source:** repository files and local environment-key inspection on 2026-08-19
- **Related:** D-005, TD-007, EC-007, OD-005

### Exact Question

What Sanity project, dataset, document type, and published document are available for local integration?

### Why It Matters

The technical contract names the landing fields, but the repository currently has no Sanity dependency or client configuration.

### Evidence Needed

Project configuration and a non-secret local/test document shape.

### Answer

No Sanity project, dataset, document type, or published landing document is currently available from this workspace. The package manifest has no Sanity dependency, the source tree has no Sanity client or schema configuration, and the local environment contains no Sanity configuration keys. A project resource must be provisioned before the real landing integration can be verified; OD-005 settles that it will be a dedicated project and dataset with one singleton landing document.

<a id="oq-003"></a>

## OQ-003 — Database migration/application state

- **Status:** ANSWERED
- **Blocking:** NO for current-state verification — the planned list/task schema still needs implementation and migration
- **Source:** linked Neon status, read-only `information_schema` queries, live Drizzle migration ledger, and local migration hash on 2026-08-19
- **Related:** D-003, D-004, TD-005, TD-006, OD-006

### Exact Question

Have the current Neon/development migrations been applied to the intended database, and what schema is actually present?

### Why It Matters

The repository contains migration artifacts, so the linked database and actual deployed schema needed read-only verification.

### Evidence Needed

A safe local/development database inspection during implementation preparation.

### Answer

The workspace is linked to the `nextjs-todo-list-example` Neon project and its default `main` branch. The live Drizzle ledger contains one applied migration. Its stored hash exactly matches the SHA-256 hash of `migrations/20260807190126_silly_vivisector/migration.sql`, confirming that the current local migration was applied.

The live schema contains the Better Auth tables `account`, `session`, `users`, and `verification`, plus the scaffold `posts_table`. It does not contain the planned `lists` or `tasks` tables. No migration for those tables currently exists. OD-006 requires that migration to be developed and verified on a non-default Neon branch before it is applied to the default branch.
