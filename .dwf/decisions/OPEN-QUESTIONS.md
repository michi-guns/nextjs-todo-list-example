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
- **Blocking:** NO for the real landing read path — the configured singleton smoke is verified; deployed webhook delivery remains partial under `TST-LANDING-003`
- **Source:** repository files, configured non-secret environment-key inspection, and the read-only `pnpm sanity:smoke` on 2026-09-01
- **Related:** D-005, D-008, TD-023, EC-007, OD-005

### Exact Question

What Sanity project, dataset, document type, and published document are available for local integration?

### Why It Matters

The technical contract names the landing fields, but the repository currently has no Sanity dependency or client configuration.

### Evidence Needed

Project configuration and a non-secret local/test document shape.

### Historical answer (2026-08-19)

No Sanity project, dataset, document type, or published landing document is currently available from this workspace. The package manifest has no Sanity dependency, the source tree has no Sanity client or schema configuration, and the local environment contains no Sanity configuration keys. A project resource must be provisioned before the real landing integration can be verified; OD-005 settles that it will be a dedicated project and dataset with one singleton landing document.

### Current answer (2026-09-01)

The repository now contains the Sanity dependency, client/configuration, validated landing read path, and dedicated landing singleton integration. The read-only `pnpm sanity:smoke` command fetched, validated, and mapped the published singleton fields `headline`, `blurb`, `primaryCtaLabel`, and `secondaryCtaLabel`. The configured project and dataset identifiers remain environment configuration and are not committed as secret material. The deployed webhook-delivery portion remains partial under `TST-LANDING-003`; it does not block the local landing read path or the T-18 environment contract.

<a id="oq-003"></a>

## OQ-003 — Database migration/application state

- **Status:** ANSWERED
- **Blocking:** NO — current migration and environment state is verified; future Neon realignment is a separately authorized delivery operation
- **Source:** linked Neon status, read-only `information_schema` queries, live Drizzle migration ledgers, local Docker catalog inspection, and migration metadata review on 2026-08-28
- **Related:** D-003, D-004, TD-005, TD-006, OD-006

### Exact Question

Have the current Neon/development migrations been applied to the intended database, and what schema is actually present?

### Why It Matters

The repository contains migration artifacts, so the linked database and actual deployed schema needed read-only verification.

### Evidence Needed

A safe local/development database inspection during implementation preparation.

### Answer

The workspace is linked to the `nextjs-todo-list-example` Neon project and its default `main` branch. The default branch still contains the scaffold Better Auth tables and `posts_table`, with its original migration ledger intact. The non-default `development` branch is an agent-owned migration-smoke target; it contains the previously verified two-step T-04 lists/tasks history and no real list/task consumers.

The repository now consolidates that pre-release history into one T-04 migration that creates native UUID list/task keys and UUIDv7 defaults directly. A fresh local PostgreSQL 18 database applied the complete consolidated chain successfully and matched the expected catalog. The existing Neon development ledger was not destructively reset; future use of the consolidated history there requires explicit realignment.
