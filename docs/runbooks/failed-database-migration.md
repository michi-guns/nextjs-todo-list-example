# Runbook: Failed Database Migration

## Trigger

Drizzle migration generation or application fails, or the database does not match the versioned schema.

## Impact

The application may fail to start or may not be safe to use for affected features.

## Procedure

1. Stop applying further migrations.
2. Record the exact command, error, database, and migration identifier.
3. Inspect the generated SQL and current database state.
4. Check whether the migration was partially applied.
5. Restore from a safe backup or use the database provider’s documented recovery procedure when data may be affected.
6. Correct the schema/migration intentionally and review it before retrying.

## Verification

Run the migration check, typecheck, relevant tests, and a focused application smoke test.

## Safety

Never delete or rewrite applied migration history casually. Create a corrective migration or record an ADR when the decision changes.
