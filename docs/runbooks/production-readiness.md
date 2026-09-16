# Production readiness

The separately provisioned Production Neon project is recorded below, but
its protected release configuration and the Production workflow are not
implemented. T-23 remains pending. Do not use the Development project's Neon
`main`, a Preview deployment or a local test as a substitute.

Before a runnable release/recovery procedure can be completed, the owner and
implementation must establish the [TD-026](../../.dwf/decisions/TECHNICAL.md#td-026)
and [TD-027](../../.dwf/decisions/TECHNICAL.md#td-027) requirements:

- A separately provisioned protected Neon project/branch with correlated
  direct migration and pooled runtime URLs. The owner-authorized project
  `nextjs-todo-list-example-production` (`jolly-dew-32309276`, PostgreSQL 18,
  `aws-us-east-2`) was created on 2026-09-14; its default `main` branch is the
  intended Production branch. No tooling in this repository references it
  yet, which is the isolation that protects it until T-23 adds the release
  workflow. The free plan exposes no protected-branch setting.
- Protected Production approval and secrets, unavailable to CI and Preview.
  GitHub `production` now requires `jimzord12` approval, disables administrator
  bypass and allows only branch `main`. Its existing Resend key and mail
  variables are configured. The first protected mail check passed on 2026-09-16;
  database, app and deployment credentials remain T-23 setup work.
- A verified owner mail domain, protected Resend settings and controlled
  delivery evidence. The domain and one real adapter delivery were verified
  on 2026-09-16; the message initially arrived in Gmail Spam and was manually
  moved to Inbox with owner approval. T-21.5 is complete after its first
  protected mail check passed. See
  [authentication mail](auth-mail.md#remaining-t-215-acceptance) and its linked
  evidence; local configuration is not protected Production evidence.
- A manual tag/full-SHA workflow that resolves one immutable revision,
  verifies CI for it, validates the profile/mail prerequisites, waits for
  approval, migrates explicitly, deploys the same revision and runs smoke.
- A reviewed forward-migration and application recovery procedure with
  deployment/migration records. Follow the existing
  [failed-migration runbook](failed-database-migration.md); never assume an
  application rollback reverses a database migration.

These are accepted requirements, not current command examples. T-24 must add
protected release/ref-resolution rehearsal and boundary evidence after T-23
exists. T-25's final release/recovery documentation remains pending with it.
