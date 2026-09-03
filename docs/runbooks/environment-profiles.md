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

The profile parser checks the declared target identity and policy. The
classifier and mutation guards in `scripts/environment/guards.ts` additionally
validate and correlate supplied provider/project/branch observations before
reset, migration, seed, cleanup, or deployment. A profile declaration is not
permission to mutate a shared or Production target.

## Target classification and operation guards

Provider adapters must supply an observed `DatabaseTargetIdentity` containing
the provider identity they resolved. A Neon observation is unresolved unless it
contains `projectId`, `branch`, and a provider-observed endpoint `host` before
an operation guard can authorize database mutation; a branch label by itself is
not enough. Local observations must contain a loopback host and cannot carry
remote project or branch fields. The classifier does not derive identity from a
friendly branch name or from the local `.env.local` declaration. Provider
authenticity and hosted identity evidence remain responsibilities of the later
Neon/Vercel adapters and their verification tasks.

Connection observations must include the provider-observed endpoint host. When
available, they should also include the port and database name; the guard
correlates those values and the profile's direct migration URL before allowing
a state-changing database operation. Local reset additionally requires an
explicit `ownership: "harness"` observation, so a developer-owned loopback
database cannot be treated as disposable test state. Production migration also
requires the same provider-resolved exact-ref and protected-approval proof as
Production deployment. PostgreSQL URL query parameters that override the
endpoint (`host`, `hostaddr`, `port`, `database`, or `dbname`) are rejected;
the authority and path must carry the guarded endpoint identity. Guarded
mutation URLs must also include an explicit port and database path, so
`PGPORT` and `PGDATABASE` cannot silently select a different endpoint.

State-changing command adapters call the operation-specific assertion before
opening the mutation boundary:

| Guard                               | Required safety boundary                                                                                                                                                    |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `assertLocalResetAllowed`           | Local profile, matching loopback PostgreSQL target, harness-owned endpoint, and direct connection                                                                           |
| `assertMigrationAllowed`            | Matching profile target and an explicitly observed direct connection; pooled Neon URLs are rejected even when mislabeled; Production also requires exact-ref approval proof |
| `assertSeedReplacementAllowed`      | Any non-Production profile, matching target, and direct connection                                                                                                          |
| `assertPreviewCleanupAllowed`       | Preview profile plus requested/provider preview IDs and project/branch identity that exactly match the selected temporary branch                                            |
| `assertPreviewDeploymentAllowed`    | Preview profile, requested/provider preview IDs, complete provider-created identity, and a provider-resolved immutable commit SHA                                           |
| `assertProductionDeploymentAllowed` | Production profile, matching target, provider-resolved `tag` or full `commit` ref, and protected approval for that exact SHA                                                |

`executeAfterGuard` runs the assertion completely before invoking the supplied
mutation callback. The repository does not yet have state-changing migration,
reset, seed, or deployment adapters; later PowerShell and GitHub workflow
adapters must call these assertions before opening their mutation boundaries.
Guard failures use stable safe error codes such as
`target_unresolved`, `target_mismatch`, `connection_role_mismatch`,
`ref_unresolved`, and `approval_required`. Returned evidence contains only
profile, provider, project/branch, operation, preview, and resolved-SHA
metadata; connection strings, credentials, mailbox values, and secrets are
never copied into it.

The module is runtime-neutral and can be called from those adapters through
`tsx`; it does not connect to a provider or mutate data by itself. T-20/T-22/T-23
must provide the actual Neon/Vercel/provider observations and ref-resolution
implementation; those tasks must call these guards rather than recreate target
checks.

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
rejects it. The guard boundary accepts only a provider-resolved ref with one
full 40-character commit SHA. Preview may resolve a branch, tag, or commit;
Production must resolve a tag or full commit ref and must match protected
approval. Preview guards compare the requested `--preview-id` with the
provider-created Preview identity as well as its project and branch. T-22/T-23
own provider-specific ref resolution and hosted mutation.

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
