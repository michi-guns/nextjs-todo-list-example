# Architectural Subsystems

This is the compact inventory of qualified Architectural Subsystems for this project. These are derived planning identities for architecture already established by canonical technical decisions. The inventory does not create or override architecture.

## AS-001 — Authentication Service

- **Concept:** [`authentication-service/README.md`](authentication-service/README.md)
- **Canonical basis:** [`TD-002`](../decisions/TECHNICAL.md#td-002) and [`TD-004`](../decisions/TECHNICAL.md#td-004), supported by [`TD-003`](../decisions/TECHNICAL.md#td-003), [`D-001`](../decisions/PRODUCT.md#d-001), and [`D-002`](../decisions/PRODUCT.md#d-002)
- **Identity:** The application's authentication component around Better Auth.
- **Boundary:** Supports the accepted authentication methods and exposes trusted current-user resolution without leaking Better Auth records or accepting client-provided ownership identity.
- **Known consumers:** Authentication presentation flows, auth route composition, private app pages, list operations, task operations, private JSON Route Handlers, and the first-use default Inbox flow.
