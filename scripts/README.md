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
