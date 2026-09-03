# Project script convention

Scripts that need a convenient `npm` or `pnpm` command should be organized as
one self-contained directory under `scripts/`.

Each script gets exactly one package command. That command points to the
script's thin `cli.mjs` entry point. The CLI may expose subcommands for the
script's related operations.

Example:

```text
scripts/
  example-task/
    cli.ts        # command-line argument handling and output
    core.ts       # reusable implementation
    core.test.ts  # focused tests for the implementation
```

```json
{
  "scripts": {
    "example-task": "tsx scripts/example-task/cli.ts"
  }
}
```

Run subcommands with:

```powershell
pnpm example-task -- status
pnpm example-task -- enable
```

Keep the package manifest to one command per script. Put reusable logic in
`core.ts`, keep the CLI thin, and keep tests focused on the core behavior.

## Local Docker PostgreSQL

`scripts/local-postgres/` owns the persistent Local PostgreSQL 18 Compose
project. The lifecycle command is `pnpm local:postgres -- <subcommand>`.
`pnpm dev:local` is the required alias for the `dev` subcommand.

```powershell
pnpm local:postgres -- start
pnpm local:postgres -- migrate
pnpm local:postgres -- seed
pnpm dev:local
```

The adapter binds `127.0.0.1:5432` only, calls the environment guards before
migrate/seed/reset, and never uses Neon or Vercel credentials. Integration and
Playwright Testcontainers remain separate.

## Neon Development target

`scripts/neon-development/` owns the durable non-default Neon `development`
branch in project `curly-dust-60603928`. The command is
`pnpm neon:development -- <subcommand>`.

```powershell
pnpm neon:development -- provision
pnpm neon:development -- inspect
pnpm neon:development -- migrate
pnpm neon:development -- seed
pnpm neon:development -- seed --mode behavior
pnpm neon:development -- seed --mode performance
```

`provision` creates branch `development` from `main` with no expiration when
it is missing. It does not reset `main` and does not accept `reset`.
`inspect`, `migrate`, and `seed` require a Development profile whose
`DATABASE_PROJECT_ID` and `DATABASE_BRANCH` match that target, with pooled
`DATABASE_URL` and direct `DATABASE_URL_UNPOOLED` values that include an
explicit port and database path. Ordinary seed replaces only
`dev-user@example.test`. Performance seed reuses `pnpm neon:performance`.

## Neon performance evidence

The T-16 benchmark is deliberately opt-in and targets only the non-default
Neon `development` branch. The script obtains the branch's direct connection
string itself through the authenticated Neon CLI and compares any optional
`DATABASE_URL` override with that independently obtained endpoint:

```powershell
$env:NEON_COMPUTE_ACTIVE = "true"
pnpm neon:performance
Remove-Item Env:NEON_COMPUTE_ACTIVE
```

The command requires the Neon CLI to be installed and authenticated, refuses
pooled or unexpected hosts (including a default-branch URL supplied through
`DATABASE_URL`), replaces only its prefixed synthetic users, and writes redacted evidence to
`docs/agentforge/evidence/t16-neon-performance.json`.
For a deliberate rerun that replaces an existing evidence file, also set
`T16_ALLOW_EVIDENCE_REPLACE=true` for that invocation.
