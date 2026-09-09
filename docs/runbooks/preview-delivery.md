# Preview delivery

## Current stop condition

Do not dispatch a new deployment on the empty Vercel project. Vercel documents
that [the first deployment is always Production](https://vercel.com/docs/cli/deploy#prod),
even without `--prod`. This conflicts with the accepted Preview-only boundary.
The owner must resolve initial setup under TD-026 before another attempt.

The 2026-09-09 attempt created, migrated and seeded an isolated Neon branch,
then Vercel assigned Production to its first deployment. That deployment was
deleted and the explicit Neon cleanup workflow succeeded. No valid hosted
Preview smoke or Production release evidence was obtained.
[Draft PR #30](https://github.com/michi-guns/nextjs-todo-list-example/pull/30)
contains command repairs and the detailed redacted attempt record. It remains
incomplete; team-scoped deployment lookup and returned identity validation
also need repair. The following is the command contract, not permission to
ignore that stop condition.

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
to the adapter. Until the pending separator repair is merged, avoid adding a
standalone `--` between the script name and its command.

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
Hosted T-22/T-24 acceptance remains pending until these observations establish
a real functional Preview and safe cleanup.
