# Preview delivery

## Current status

Vercel documents that [the first deployment of a project is always Production](https://vercel.com/docs/cli/deploy#prod),
even without `--prod`. The 2026-09-09 attempt hit that rule: it created,
migrated and seeded an isolated Neon branch, then Vercel assigned Production to
the deployment. That deployment was deleted and the explicit Neon cleanup
workflow succeeded; no hosted Preview smoke was obtained. See the
[attempt evidence](../agentforge/evidence/2026-09-09-preview-attempt.md).

On 2026-09-14 the owner resolved the prerequisite: a deliberate placeholder
static page was deployed with `vercel deploy --prod` from a scratch folder
outside this repository, so the project's Production slot was occupied by
deployment `dpl_GRpcAgtr9BZ7QcsUNHX259WAvLin` at
`https://nextjs-todo-list-example.vercel.app` ("Not released yet."). Every
further deployment without `--prod` is a Preview. The placeholder is not a
release. On 2026-09-16, T-23 replaced it with the reviewed application through
the [protected release workflow](production-release.md). The project therefore
continues to satisfy the existing-Production prerequisite for Preview.

The adapter now refuses to start when that prerequisite is missing. Before
any Neon branch is observed or created, `deploy` reads the project through
the team-scoped Vercel API and stops with `target_mismatch` unless
`VERCEL_ORG_ID` is a `team_` id, `VERCEL_PROJECT_ID` matches the returned
project and the project already has a promoted Production deployment. The
deployment itself runs with `--target=preview --json`; the structured result
must be `READY` and not `production`, and a second team-scoped lookup must
return the same project, a non-Production target and the exact `commitSha`
and `previewId` metadata before smoke runs. The deployment receives
`APP_RELEASE_SHA`, the observed `DATABASE_ENDPOINT_HOST` and
`HEALTH_PROBE_SECRET`, but no migration URL. Smoke checks landing, sign-in and
a list mutation, then that `/api/health/app` reports the resolved commit and
the protected database/CMS probes are ready. `deploy` refuses before any
branch exists unless the `preview` Environment holds a valid
`HEALTH_PROBE_SECRET`.

The first successful hosted run is recorded in the
[2026-09-14 run evidence](../agentforge/evidence/2026-09-14-preview-run.md):
run 34840457016 at `1c8c38c` with Preview id `t22-20260914`, verified
independently over HTTP and in a real browser. A hosted run still requires
explicit owner authorization each time. The following is the command
contract, not permission to dispatch.

## Preflight and request contract

The manual `.github/workflows/deploy-preview.yml` accepts `action`, `ref` and
`preview-id`. CI never dispatches it automatically. Keep Vercel disconnected
from automatic Git deployment. The GitHub `preview` environment holds
`NEON_API_KEY`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` and
`BETTER_AUTH_SECRET`; its Sanity project is a public environment variable.
Do not put Production credentials there.

Before a future authorized run, verify the reviewed workflow and adapter
repairs, Vercel project initialization/Preview targeting, durable Neon
Development identity and published Sanity `preview` singleton. Resolve `ref`
to a full commit SHA. The adapter refuses a different or dirty checkout before
observing or creating a database branch. Use a clean checkout for local
execution. Untracked files count as dirty.

The direct script argument forms accepted by the current parser are:

```powershell
pnpm preview inspect --preview-id <id>
pnpm preview deploy --ref <reviewed-tag-or-full-sha> --preview-id <id>
pnpm preview cleanup --preview-id <id>
```

Use a specific non-mutable branch, tag or SHA; aliases such as `main` and
`latest` are refused. The workflow checks out the requested ref and passes it
to the adapter. The parser accepts pnpm's forwarded leading `--`; both
`pnpm preview deploy …` and `pnpm preview -- deploy …` are valid.

The selected database must be `preview-<id>` in the configured Neon project,
with a non-default identity, Development parent and expiry. Runtime and build
receive that branch's pooled/direct URLs plus Preview mail/CMS policy. The
controlled account can use password sign-in; Preview does not send mail or
write the local mailbox.

## Failure and cleanup

A migration, seed, deployment or smoke error stops later stages. It does not
automatically roll back the database or delete resources. Inspect the run and
retain safe identifiers before explicit cleanup. Never retry by choosing
Development or main as the mutation target.

`cleanup --preview-id <id>` observes the branch and enforces project/name/
non-default/expiry identity before deleting it. A missing matching branch is a
no-op. The command deletes only Neon; Vercel deployment cleanup is a separate
scoped operation against the observed project and deployment ID. Deleting the
database leaves any retained application deployment unusable. Do not confuse
database expiry with Vercel cleanup.

Record the requested/resolved SHA, Preview ID, observed project/branch ID,
expiry, Vercel project/deployment/target and smoke/cleanup outcomes. Do not
record connection strings, keys, auth links, cookies or mailbox contents.
T-22's hosted acceptance was established by the 2026-09-14 run and cleanup;
T-24 subsequently reconciled these observations with the actual protected
Production releases in the [complete pipeline matrix](../agentforge/evidence/2026-09-16-pipeline-closeout.md).
That evidence does not authorize another Preview or cleanup operation.
