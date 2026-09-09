# Production readiness

There is no implemented Production release workflow or approved protected
Production database target. T-23 remains pending. Do not use the current Neon
`main`, a Preview deployment or a local test as a substitute.

Before a runnable release/recovery procedure can be completed, the owner and
implementation must establish the [TD-026](../../.dwf/decisions/TECHNICAL.md#td-026)
and [TD-027](../../.dwf/decisions/TECHNICAL.md#td-027) requirements:

- A separately provisioned protected Neon project/branch with correlated
  direct migration and pooled runtime URLs.
- Protected Production approval and secrets, unavailable to CI and Preview.
- A verified owner mail domain, protected Resend settings and controlled
  delivery evidence. See [authentication mail](auth-mail.md). Test-domain
  simulation does not meet this requirement.
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
