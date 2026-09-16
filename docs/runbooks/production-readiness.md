# Production readiness

The separately provisioned Production target, protected configuration and
manual exact-ref workflow are implemented. [PR #38](https://github.com/michi-guns/nextjs-todo-list-example/pull/38)
merged the reviewed release tooling. T-23.5 still requires a concretely
approved Production run and actual hosted evidence. Use the
[release and recovery runbook](production-release.md) for the procedure.

The [2026-09-16 preflight](../agentforge/evidence/2026-09-16-production-release-preflight.md)
confirms the intended targets and Sanity read path. The owner approved the
project-only Vercel token through the browser after the CLI refused creation.
That token and the remaining scoped configuration are stored in GitHub
`production`; provisioning-process profile validation passed. The [T-23 plan](../agentforge/plans/2026-09-16-t-23-production-release.md)
and its [implementation evidence](../agentforge/evidence/2026-09-16-production-release-implementation.md)
record the local checks and migration rehearsal. Protected-run validation and
real release evidence remain required.

The [TD-026](../../.dwf/decisions/TECHNICAL.md#td-026) and
[TD-027](../../.dwf/decisions/TECHNICAL.md#td-027) readiness boundaries are:

- A separately provisioned protected Neon project/branch with correlated
  direct migration and pooled runtime URLs. The owner-authorized project
  `nextjs-todo-list-example-production` (`jolly-dew-32309276`, PostgreSQL 18,
  `aws-us-east-2`) was created on 2026-09-14; its default `main` branch is the
  intended Production branch. The release adapter binds this identity to
  provider-observed branch, endpoint and database metadata before migration.
  The free plan exposes no protected-branch setting; project isolation and
  the protected workflow provide the accepted execution boundary.
- Protected Production approval and secrets, unavailable to CI and Preview.
  GitHub `production` now requires `jimzord12` approval, disables administrator
  bypass and allows only branch `main`. Its existing Resend key and mail
  variables are configured. The first protected mail check passed on 2026-09-16;
  database, app and deployment credentials were added during T-23 preflight.
  Their actual protected-run validation remains T-23.5 evidence.
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

The release command and workflow now implement these requirements; local
proof does not complete the hosted boundaries. T-24 retains the broader
pipeline failure/isolation rehearsal, and T-25 retains the final system-wide
delivery documentation.
