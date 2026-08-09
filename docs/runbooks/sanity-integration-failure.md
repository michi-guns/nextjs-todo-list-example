# Runbook: Sanity Integration Failure

## Trigger

The landing page cannot fetch, validate, or map the configured Sanity document.

## Impact

Public editorial content may be unavailable. Private PostgreSQL-backed todo behavior should remain independent.

## Procedure

1. Check the Sanity project, dataset, API version, and server environment variables.
2. Confirm the expected document exists and is published.
3. Inspect the GROQ query and validation error without exposing tokens.
4. Verify whether the failure is a provider outage, configuration issue, schema change, or mapping bug.
5. Use the explicitly marked local fallback only while Sanity is not wired; do not fabricate transactional data.

## Escalation

Record repeated failures in an ADR or update the data availability documentation if the recovery strategy changes.
