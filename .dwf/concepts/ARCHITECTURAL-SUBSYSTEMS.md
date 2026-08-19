# Architectural Subsystems

This is the compact inventory of qualified Architectural Subsystems for this project. These are derived planning identities for architecture already established by canonical technical decisions. The inventory does not create or override architecture.

## AS-001 — Authenticated User Boundary

- **Concept:** [`authenticated-user-boundary/README.md`](authenticated-user-boundary/README.md)
- **Canonical basis:** [`TD-004`](../decisions/TECHNICAL.md#td-004), supported by [`TD-003`](../decisions/TECHNICAL.md#td-003), [`D-001`](../decisions/PRODUCT.md#d-001), and [`D-002`](../decisions/PRODUCT.md#d-002)
- **Boundary:** Translates the server-side Better Auth session into the application's trusted current-user representation without exposing Better Auth records or accepting client-provided ownership identity.
- **Known consumers:** Private app pages, list operations, task operations, private JSON Route Handlers, and the first-use default Inbox flow.
