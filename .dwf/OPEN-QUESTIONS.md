# Open Questions

These are unresolved facts requiring evidence. They are not accepted design truth.

## OQ-001 — Better Auth magic-link integration evidence

What exact Better Auth configuration and local/test mail delivery behavior are supported by the installed package version and current environment? The product contract requires a magic-link flow, but the repository currently has only a basic email/password configuration.

Evidence needed: installed Better Auth integration guidance, provider/test-mail configuration, and a local smoke path.

## OQ-002 — Sanity project and document evidence

What Sanity project, dataset, document type, and published document are available for local integration? The technical contract names the fields but the repository currently has no Sanity dependency or client configuration.

Evidence needed: project configuration and a non-secret local/test document shape.

## OQ-003 — Database migration/application state

Have the current Neon/development migrations been applied to the intended database, and what schema is actually present? The repository contains migration artifacts, but this migration did not connect to or verify an external database.

Evidence needed: a safe local/dev database inspection during implementation preparation.
