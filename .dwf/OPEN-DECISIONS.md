# Open Decisions

These choices are visible and intentionally unsettled. They must not be silently treated as accepted truth.

## OD-001 — Completed-task query default

The SPEC requires `includeCompleted: boolean` but leaves the default to implementation, recommending show-all with a hide-completed UI toggle. The implementation agent may use the recommendation unless product/design authority selects another behavior.

## OD-002 — Privacy error mapping

The SPEC allows `403` or privacy-preserving `404` for another user's resource and recommends `404`. The implementation must choose one policy consistently at the boundary or obtain explicit authority before changing observable behavior.

## OD-003 — Local magic-link test mechanism

The product requires magic-link request/consume behavior, while the exact local mail/test mechanism is not selected. A deterministic local mailer or test hook is expected; the choice should be recorded in the technical contract if it affects the implementation shape.

## OD-004 — Exact API path spelling

The SPEC defines behavior and an API sketch but allows exact paths to vary. This is normal implementation freedom unless a future consumer requires stable path names; no Delivery blocker exists currently.

## Non-blocking implementation freedom

Dashboard chrome, empty-state copy, exact Sanity document type naming, and exact environment-variable names remain implementation/integration details unless they change observable product behavior or require a new architectural decision.
