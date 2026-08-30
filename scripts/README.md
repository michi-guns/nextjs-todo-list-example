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

## Neon performance evidence

The T-16 benchmark is deliberately opt-in and targets only the non-default
Neon `development` branch. Obtain a direct connection string and the endpoint
host ephemerally with `neonctl`; do not copy either value into a file:

```powershell
$devUrl = (neon connection-string development).Trim()
$devHost = ([Uri]$devUrl).Host
$env:DATABASE_URL = $devUrl
$env:NEON_DEVELOPMENT_HOST = $devHost
$env:NEON_DEVELOPMENT_BRANCH = "development"
$env:NEON_COMPUTE_ACTIVE = "true"
pnpm neon:performance
Remove-Item Env:DATABASE_URL, Env:NEON_DEVELOPMENT_HOST, Env:NEON_DEVELOPMENT_BRANCH, Env:NEON_COMPUTE_ACTIVE
```

The command refuses pooled or unexpected hosts, replaces only its prefixed
synthetic users, and writes redacted evidence to
`docs/agentforge/evidence/t16-neon-performance.json`.
For a deliberate rerun that replaces an existing evidence file, also set
`T16_ALLOW_EVIDENCE_REPLACE=true` for that invocation.
