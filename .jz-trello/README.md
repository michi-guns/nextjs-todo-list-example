# `.jz-trello/` board cache (experimental)

| File                      | Role                                                             |
| ------------------------- | ---------------------------------------------------------------- |
| `board-cache.json`        | Local projection of board Work Units + soft-sequence annotations |
| `board-cache.schema.json` | JSON Schema (editor autocomplete / validation)                   |

## Authority

- **Trello** is source of truth for identity, status, parent, `blocked_by`, and card body.
- This cache is a **projection + annotations** only. Do not dual-write status here as peer truth.
- Soft order lives under `annotations` only — never fake hard blockers.

## Refresh (manual today)

```bash
jz-trello-flow list --board "Next.js Todo List Example" --output json
```

Merge into `units`, set `refreshedAt`, preserve `annotations` unless intentionally editing them.

Future: CLI/skills may refresh this file on `list` / sync (and optionally patch one unit on `get`).

## Editor setup

`board-cache.json` points at `./board-cache.schema.json` via `$schema`. VS Code/Cursor should offer autocomplete when the schema is present.
