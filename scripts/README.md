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
