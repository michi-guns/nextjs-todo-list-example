# Architectural Subsystems

This is the compact inventory of qualified Architectural Subsystems for this project. These are derived planning identities for architecture already established by canonical technical decisions. The inventory does not create or override architecture.

## AS-001 — Authentication Service

- **Concept:** [`authentication-service/README.md`](authentication-service/README.md)
- **Canonical basis:** [`TD-002`](../decisions/TECHNICAL.md#td-002) and [`TD-004`](../decisions/TECHNICAL.md#td-004), supported by [`TD-003`](../decisions/TECHNICAL.md#td-003), [`D-001`](../decisions/PRODUCT.md#d-001), and [`D-002`](../decisions/PRODUCT.md#d-002)
- **Identity:** The application's authentication component around Better Auth.
- **Boundary:** Supports the accepted authentication methods and exposes trusted current-user resolution without leaking Better Auth records or accepting client-provided ownership identity.
- **Known consumers:** Authentication presentation flows, auth route composition, private app pages, list operations, task operations, private JSON Route Handlers, and the listless-workspace default Inbox flow.

## AS-002 — List Service

- **Concept:** [`list-service/README.md`](list-service/README.md)
- **Canonical basis:** [`D-003`](../decisions/PRODUCT.md#d-003), [`TD-005`](../decisions/TECHNICAL.md#td-005), and [`TD-006`](../decisions/TECHNICAL.md#td-006), supported by [`TD-002`](../decisions/TECHNICAL.md#td-002), [`TD-003`](../decisions/TECHNICAL.md#td-003), and [`D-001`](../decisions/PRODUCT.md#d-001)
- **Identity:** The application's component for default-Inbox behavior and the lifecycle of user-owned lists.
- **Boundary:** Exposes user-scoped list operations while keeping list persistence, ownership enforcement, atomic Inbox creation, and task cascade behavior behind its application-facing interface.
- **Known consumers:** The authenticated listless-workspace flow, dashboard and navigation composition, list Server Actions, private list JSON Route Handlers, and task-creation presentation flows.

## AS-003 — Task Service

- **Concept:** [`task-service/README.md`](task-service/README.md)
- **Canonical basis:** [`D-004`](../decisions/PRODUCT.md#d-004), [`TD-005`](../decisions/TECHNICAL.md#td-005), and [`TD-006`](../decisions/TECHNICAL.md#td-006), supported by [`TD-002`](../decisions/TECHNICAL.md#td-002), [`TD-003`](../decisions/TECHNICAL.md#td-003), and [`D-001`](../decisions/PRODUCT.md#d-001)
- **Identity:** The application's component for task lifecycle behavior inside user-owned lists.
- **Boundary:** Exposes user-scoped task operations while keeping task persistence, ownership enforcement, list-membership checks, status behavior, and completed-task filtering behind its application-facing interface.
- **Known consumers:** Dashboard task-panel composition, task Server Actions, private task JSON Route Handlers, status controls, and completed-task visibility controls.

## Reviewed candidates not currently qualified

These candidates do not receive an `AS-*` identity. They remain ordinary architecture or capability components unless a later review finds that every Architectural Subsystem qualification requirement is supported by current design evidence.

### Landing Content Service

- **Status:** NOT QUALIFIED
- **Reviewed:** 2026-08-19
- **Canonical basis:** [`D-005`](../decisions/PRODUCT.md#d-005), [`D-008`](../decisions/PRODUCT.md#d-008), and [`TD-023`](../decisions/TECHNICAL.md#td-023)
- **Finding:** The landing capability has a meaningful and independently verifiable Sanity adapter boundary, but the current delivery phase still has only one content-consuming flow: rendering the public landing page. Webhook and manual invalidation support that flow rather than consume the content contract independently. The deferred editorial preview is not yet a current consumer.
- **Current treatment:** Keep it as the ordinary `landing` capability module described by the canonical architecture.
- **Revisit when:** The accepted editorial preview or another real flow is delivered and shares the same validated landing-content core. Do not qualify it from deferred capability alone.
