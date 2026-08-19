# AS-001 — Authenticated User Boundary

**Concept kind:** Architectural Subsystem

**Architectural Subsystem:** AS-001

**Derived explanation.** This Concept explains architecture already established by [`TD-004`](../../decisions/TECHNICAL.md#td-004) and the [Agent SPEC authentication boundary](../../output/agent/SPEC.md#143-authentication-boundary). It does not create product or technical truth.

## Quick reload

- This is the server-only application boundary around Better Auth session identity.
- It translates the active session into a small application-owned `CurrentUser` representation.
- Private pages, list flows, task flows, JSON handlers, and first-use Inbox behavior consume it.
- Client-provided user IDs never determine ownership identity.
- Better Auth records and provider details stay behind the boundary.

## Boundary

The subsystem answers whether the current server operation has an authenticated user and, when it does, returns the application-facing identity for that user.

Its semantic operations are equivalent to:

```ts
type CurrentUser = {
  id: string
  email: string
  name: string | null
}

getCurrentUser(): Promise<CurrentUser | null>
requireUser(): Promise<CurrentUser>
```

These names and their concrete file grouping remain implementation choices. Their behavior and returned application-facing identity are the settled boundary.

## Responsibilities

- Resolve the current Better Auth session at a server operation boundary.
- Map authenticated identity into the application-owned `CurrentUser` shape.
- Keep Better Auth instances, raw session records, and provider types out of consuming modules.
- Ensure ownership identity comes from the trusted session rather than browser input.
- Give private pages, Server Actions, and Route Handlers one consistent application-facing authentication boundary.

## Non-responsibilities

- Determining whether a specific list or task belongs to the current user.
- Validating list or task input.
- Creating the default Inbox.
- Choosing presentation behavior such as redirects, action results, or JSON status codes.
- Implementing list/task persistence.
- Defining the sign-up, sign-in, sign-out, or magic-link user experience.

## Dependencies

- Better Auth and its server-side session facilities.
- Better Auth persistence through the repository's existing Drizzle/PostgreSQL integration.
- Server request context as required by the selected Better Auth integration.

## Known consumers

- Authenticated app pages and dashboard composition.
- List Server Actions and private list Route Handlers.
- Task Server Actions and private task Route Handlers.
- The authenticated first-use flow that invokes `ensureDefaultInbox`.

Consumers receive `CurrentUser` or an unauthenticated outcome. They do not receive Better Auth session records and do not accept a browser-supplied user ID as a substitute.

## Important invariants

- Every private read and mutation authenticates at its operation boundary.
- Middleware may improve navigation behavior but never replaces operation-level authentication.
- The session user ID is the ownership identity passed into list and task application use cases.
- Raw Better Auth records and provider-specific types do not cross into list, task, or landing contracts.

## Verification

The subsystem can be verified independently of completed list/task features:

- An authenticated session maps to the expected application-owned `CurrentUser` fields.
- An unauthenticated operation does not receive a `CurrentUser` from `requireUser`.
- `getCurrentUser` represents the absence of an authenticated user as `null`.
- Browser-supplied identity cannot override the session identity.
- Better Auth-specific records do not appear in the public application-facing contract.

## Implementation freedom

The implementation agent may choose:

- Exact files and folder grouping inside the auth capability.
- Functions, a service object, or equivalent internal composition.
- Better Auth API calls and adapter details compatible with the installed version.
- Internal error types and test-double strategy.
- Optional middleware for navigation convenience, provided operation-level authentication remains authoritative.

## Canonical references

- [`D-001 — Personal authenticated workspace`](../../decisions/PRODUCT.md#d-001)
- [`D-002 — Password and magic-link authentication`](../../decisions/PRODUCT.md#d-002)
- [`TD-003 — Layered dependency direction and composition-only routes`](../../decisions/TECHNICAL.md#td-003)
- [`TD-004 — Server-only Better Auth application boundary`](../../decisions/TECHNICAL.md#td-004)
- [`RULE-006 — Validate and isolate untrusted boundaries`](../../RULES.md#rule-006)
- [Agent SPEC — Auth](../../output/agent/SPEC.md#2-auth-better-auth)
- [Agent SPEC — Authentication boundary](../../output/agent/SPEC.md#143-authentication-boundary)
