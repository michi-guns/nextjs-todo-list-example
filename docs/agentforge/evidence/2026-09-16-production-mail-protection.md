# T-21.5 protected mail configuration

Date: 2026-09-16. This continues the [owner-domain delivery record](2026-09-16-resend-domain-delivery.md)
and [accepted Resend plan](../plans/2026-09-09-t-21-5-resend-foundation.md).
The owner authorized task completion, tests, commits and pushes, then T-23.

## Hosted configuration

Read-only inspection found the existing GitHub Environment `production`, id
`21297499656`, with `RESEND_API_KEY` last updated on 2026-09-05. It initially
had no required reviewer or branch restriction and no variables. The key
was not read, replaced or copied. Repository-level secrets are empty; Preview
has no Resend secret.

The Environment now has these verified settings:

- Required reviewer `jimzord12`, user id `45168324`.
- `can_admins_bypass=false`. Approval is required for administrator runs too.
- `prevent_self_review=false`, allowing the repository owner to approve their
  own manual dispatch. Approval is still an explicit separate step.
- Custom deployment branch policy with the sole branch `main`, no tags.
- Existing secret `RESEND_API_KEY`, with its original update timestamp.
- Environment variables `APP_ENV=production`, `NODE_ENV=production`,
  `APP_MAIL_TRANSPORT=remote`, `APP_MAIL_PROVIDER=resend`,
  `SECRET_NAMESPACE=production`, `BETTER_AUTH_LOCAL_MAILBOX=false`, and
  `APP_MAIL_FROM=noreply@auth.dim-stamatakis.dev`.

The configuration used GitHub's Environment update and branch-policy APIs
and `gh variable set --env production`. Subsequent read-back confirmed the
rules, sole allowed branch, variables and unchanged secret metadata:

```powershell
gh api repos/michi-guns/nextjs-todo-list-example/environments/production
gh api repos/michi-guns/nextjs-todo-list-example/environments/production/deployment-branch-policies
gh variable list --env production
gh secret list --env production
gh secret list
gh secret list --env preview
```

These commands expose settings and secret names, never secret values.
No Vercel, DNS, database or provider credential was changed.

## Executable check and local evidence

`verify-production-mail.yml` is manual only, restricted to `main`, and uses
the protected `production` Environment. It checks out `github.sha` with no
persisted Git credential, uses the existing SHA-pinned setup actions, and
passes mail settings only to the inspection step. The inspection CLI calls
the existing `readResendConfig`, emits fixed metadata on success and a generic
error on failure. It does not load local environment files or call providers.

- RED: all seven new CLI/workflow tests failed before those files existed.
- GREEN: the focused CLI/workflow/mail/profile run passed 6 files, 128 tests.
- `pnpm test`: 36 files, 342 tests passed.
- `pnpm typecheck`: passed after correcting the test fixture's Node environment
  types. The initial type errors were task-caused and are resolved.
- `pnpm lint`: passed with the existing unused `Geist` warning only.
- Changed-file Prettier and `git diff --check`: passed. A read-only relative
  file-link check also passed for all eight changed Markdown files.
- Fresh independent GPT-6-Astra review at xhigh approved
  `d5a7abebe29aa441c622f0af99c5b139702e5907` without actionable findings.
  The reviewer independently passed the same 128 focused tests, full-diff
  formatting and whitespace checks.
- [PR #35](https://github.com/michi-guns/nextjs-todo-list-example/pull/35)
  passed Quality and Harness in [CI run 35100323793](https://github.com/michi-guns/nextjs-todo-list-example/actions/runs/35100323793)
  and merged as `03b67809944bd4e65ed9d86a1444446b5a9cc0ce`.

The seven new tests exercise safe successful CLI output, missing credential,
test sender, wrong scope, enabled local mailbox, the protected manual workflow
and the unchanged CI/Preview credential boundaries. They do not stand in for
hosted approval or a protected secret read.

## Protected execution and closeout

[Run 35103297897](https://github.com/michi-guns/nextjs-todo-list-example/actions/runs/35103297897)
was manually dispatched from `main` at
`03b67809944bd4e65ed9d86a1444446b5a9cc0ce` on 2026-09-16 at 13:39:14 UTC.
The run entered `waiting`; the pending-deployments API identified the
`production` Environment and `jimzord12` as its required reviewer before any
validation step ran. The agent then submitted an explicit approval through
the required-reviewer API using the owner's authenticated account and their
authorization to complete T-21.5 and run its tests. The review comment records
that delegation and exact SHA. This was not a manual owner UI click or an
administrator bypass.

The protected job passed in 32 seconds, completing at 13:40:32 UTC. Its
validator output was:

```json
{
  "result": "configuration_valid",
  "provider": "resend",
  "secretNamespace": "production",
  "remoteDeliveryTested": false
}
```

The run, approval history and validation log were read back independently.
This completes T-21.5's remaining protected configuration acceptance. The
earlier provider/domain delivery evidence remains a separate layer. T-23 is
now eligible for its own prerequisite checks and release implementation.

## Evidence limits

TST-AUTH-001/002 retain their verified local lifecycle evidence.
TST-ENV-001 and TST-PIPELINE-001 remain partial. TST-RELEASE-001 remains
specified because a mail configuration check is not release execution.
The earlier real receipt proves only that earlier message's delivery.
This check does not validate the existing GitHub key against Resend, send an
email, exercise Better Auth remotely or configure the deployed Vercel app.
