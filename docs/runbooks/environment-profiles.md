# Environment profiles

The repository uses an application-owned `APP_ENV` to select one of four
explicit profiles. `NODE_ENV` remains the Next.js runtime mode and is not a
database or deployment target selector.

Run the read-only profile diagnostic after configuring `.env.local` or the
process environment:

```powershell
pnpm environment:inspect
```

The command loads `.env.local`, validates the profile, and prints safe metadata
only. It never connects to PostgreSQL or Sanity, sends mail, runs migrations,
changes data, creates a branch, or deploys. A failed validation exits non-zero
before any operation can consume the profile.

## Profile matrix

| Profile     | Required runtime identity                                                          | Database roles                                                                                                              | Sanity and mail policy                                                                                 | Allowed operations                                                                                                          |
| ----------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| Local       | `APP_ENV=local`; `NODE_ENV=development` or `test`; loopback HTTP `BETTER_AUTH_URL` | `DATABASE_PROVIDER=local-postgres`; loopback direct URL for runtime and migrations                                          | Production dataset; `read-only` or `local-recovery`; local mailbox enabled                             | Migrate and seed; reset only after the target guard proves the loopback database; Sanity recovery only for `local-recovery` |
| Development | `APP_ENV=development`; `NODE_ENV=development`; local loopback HTTP origin          | Non-default, owner-authorized Neon branch; pooled `DATABASE_URL` for runtime; direct `DATABASE_URL_UNPOOLED` for migrations | Production dataset, read-only; local mailbox enabled                                                   | Migrate and seed; no reset or deployment                                                                                    |
| Preview     | `APP_ENV=preview`; `NODE_ENV=production`; assigned non-loopback HTTPS origin       | Isolated temporary Neon branch; pooled runtime URL and direct migration URL                                                 | Dedicated `preview` dataset, read-only; controlled verified account; local mailbox disabled            | Migrate, safe seed, and manual Preview delivery; no reset or Production delivery                                            |
| Production  | `APP_ENV=production`; `NODE_ENV=production`; canonical non-loopback HTTPS origin   | Separately provisioned protected Neon project and branch; pooled runtime URL and direct migration URL                       | Production dataset, `production-recovery`; owner-approved remote mail provider; local mailbox disabled | Forward migration, protected Production delivery, and approved Sanity recovery; no reset or seed replacement                |

The parser requires `DATABASE_PROVIDER` to match the profile: Local must use
`local-postgres`, and Development, Preview, and Production must use `neon`.
Remote profiles also require both `DATABASE_PROJECT_ID` and
`DATABASE_BRANCH`. `DATABASE_URL` is the application runtime connection;
`DATABASE_URL_UNPOOLED` is the direct migration connection. A pooled Neon URL
must never be used for migrations, and a direct URL must not replace the pooled
runtime default.

The profile parser checks the declared target identity and policy. The target
classifier and mutation guards owned by T-18.3 must additionally verify the
actual provider/project/branch before reset, migration, seed, cleanup, or
deployment. A profile declaration is not permission to mutate a shared or
Production target.

## Variables

Use these names in a local `.env.local`, a GitHub Environment, or the eventual
Vercel project settings. Values below describe categories, not credentials.

| Variable                         | Required          | Meaning                                                                                          |
| -------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------ |
| `APP_ENV`                        | Every profile     | `local`, `development`, `preview`, or `production`                                               |
| `NODE_ENV`                       | Every profile     | Next.js mode: `development`, `test`, or `production`; pairing is checked above                   |
| `BETTER_AUTH_URL`                | Every profile     | Exact application origin; Local/Development loopback HTTP, Preview/Production non-loopback HTTPS |
| `BETTER_AUTH_SECRET`             | Every profile     | Secret in the profile's namespace; never print or commit it                                      |
| `DATABASE_PROVIDER`              | Every profile     | `local-postgres` or `neon`, matching `APP_ENV`                                                   |
| `DATABASE_URL`                   | Every profile     | Runtime PostgreSQL URL; pooled for Neon                                                          |
| `DATABASE_URL_UNPOOLED`          | Neon profiles     | Direct PostgreSQL URL for migrations; optional only for a direct local URL                       |
| `DATABASE_PROJECT_ID`            | Neon profiles     | Expected Neon project identity                                                                   |
| `DATABASE_BRANCH`                | Neon profiles     | Expected Neon branch identity; Development/Preview cannot use `main`                             |
| `NEXT_PUBLIC_SANITY_PROJECT_ID`  | Every profile     | Public Sanity project identifier                                                                 |
| `NEXT_PUBLIC_SANITY_DATASET`     | Every profile     | `production` except `preview`, which uses `preview`                                              |
| `NEXT_PUBLIC_SANITY_API_VERSION` | Optional          | Safe Sanity API-version identifier; defaults to `2026-08-27`                                     |
| `SANITY_WRITE_POLICY`            | Every profile     | `read-only`, `local-recovery`, or `production-recovery`, matching the matrix                     |
| `SANITY_REVALIDATE_SECRET`       | Recovery profiles | Server-only revalidation secret; required by recovery policies                                   |
| `SANITY_MANUAL_RECOVERY_SECRET`  | Recovery profiles | Server-only manual recovery secret; required by recovery policies                                |
| `APP_MAIL_TRANSPORT`             | Every profile     | `local-mailbox`, `controlled-account`, or `remote`, matching the matrix                          |
| `APP_MAIL_PROVIDER`              | Remote mail only  | Provider name metadata; the provider must be owner-approved before Production                    |
| `BETTER_AUTH_LOCAL_MAILBOX`      | Local/Development | Must be `true`; must be absent or `false` in deployed profiles                                   |
| `DEPLOYMENT_OWNER`               | Every profile     | `local`, `github`, or `vercel`, constrained by profile                                           |
| `SECRET_NAMESPACE`               | Every profile     | `local`/`ci` for Local, otherwise exactly `development`, `preview`, or `production`              |

The existing `BETTER_AUTH_MAILBOX_DIR` remains a local/test-only path setting.
It is not a deployment transport and is not accepted as a substitute for the
Preview controlled account or the Production remote provider.

## Delivery argument boundary

The reusable parser accepts the argument shapes reserved for later delivery
commands:

```text
preview --ref <non-mutable-ref> --preview-id <isolated-preview-id>
production --ref <tag-or-commit-ref>
```

`--ref` is required, must be supplied once, and rejects mutable aliases such as
`latest`, `main`, and `master`. Preview requires `--preview-id`; Production
rejects it. T-18.3 owns resolving the supplied ref to one immutable commit and
T-22/T-23 own the hosted mutation and approval workflows.

## Redaction rules

The parser result is a validated runtime configuration and intentionally retains
the connection strings and server-only secrets required by future consumers.
Treat that result as sensitive and never serialize it directly; use
`inspectEnvironment` for diagnostics.

Inspection output may include profile names, origin, provider, expected
project/branch identifiers, dataset, API version, policy names, deployment
owner, and booleans indicating whether secrets are configured. It must not
include `BETTER_AUTH_SECRET`, Sanity secret values, mail credentials or URLs,
PostgreSQL connection strings, passwords, tokens, or mailbox contents.

Never commit `.env*`, GitHub/Vercel secret values, captured connection strings,
or local mailbox files.
