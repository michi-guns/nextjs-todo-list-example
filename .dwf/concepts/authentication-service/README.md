# AS-001 — Authentication Service

**Concept kind:** Architectural Subsystem

**Architectural Subsystem:** AS-001

**Derived explanation.** This Concept explains the authentication capability already established by [`D-002`](../../decisions/PRODUCT.md#d-002), [`TD-002`](../../decisions/TECHNICAL.md#td-002), [`TD-004`](../../decisions/TECHNICAL.md#td-004), and the [Agent SPEC auth design](../../output/agent/SPEC.md#2-auth-better-auth). It does not create product or technical truth.

## Quick reload

- This is the application's authentication component around Better Auth.
- It supports email/password authentication, magic links, sign-out, and server-side session resolution.
- It translates the active session into a small application-owned `CurrentUser` representation for private operations.
- Authentication presentation, private pages, list flows, task flows, JSON handlers, and listless-workspace Inbox behavior consume it.
- Client-provided user IDs never determine ownership identity.
- Better Auth records and provider details stay behind the boundary.

## Identity

The Authentication Service is the application's single architectural component for authentication. It gives authentication flows and private server operations one stable application-facing interface while keeping Better Auth integration details internal.

## Boundary

The subsystem owns the application integration required to sign users up and in with email/password, request and consume magic links, sign users out, resolve sessions, and return the trusted current-user identity.

Its current-user operations are semantically equivalent to:

```ts
type CurrentUser = {
  id: string
  email: string
  name: string | null
}

getCurrentUser(): Promise<CurrentUser | null>
requireUser(): Promise<CurrentUser>
```

The concrete function names, Better Auth calls, and file grouping remain implementation choices. The supported authentication methods, trusted session behavior, and returned application-facing identity are the settled boundary.

## Responsibilities

- Configure and integrate Better Auth for the accepted authentication methods.
- Support email/password sign-up and sign-in.
- Support magic-link request and consumption.
- Support sign-out.
- Resolve the current Better Auth session at private server operation boundaries.
- Map authenticated identity into the application-owned `CurrentUser` shape.
- Keep Better Auth instances, raw records, provider types, and integration details out of consuming modules.
- Ensure ownership identity comes from the trusted session rather than browser input.
- Give authentication flows, private pages, Server Actions, and Route Handlers one consistent application-facing authentication component.

## Non-responsibilities

- Determining whether a specific list or task belongs to the current user.
- Validating list or task input.
- Creating the default Inbox.
- Owning authentication-page UI or choosing presentation behavior such as redirects, action results, or JSON status codes.
- Implementing list/task persistence.
- Defining product behavior for authentication methods outside email/password and magic link.

## Dependencies

- Better Auth and its server-side session facilities.
- Better Auth persistence through the repository's existing Drizzle/PostgreSQL integration.
- The temporary file-backed mailbox in explicitly enabled local/test mode, and an environment-appropriate send adapter if another deployment environment is later supported.
- Server request context as required by the selected Better Auth integration.

## Known consumers

- Sign-up, sign-in, magic-link, and sign-out presentation flows.
- Better Auth Route Handler composition under the application's auth API route.
- Authenticated app pages and dashboard composition.
- List Server Actions and private list Route Handlers.
- Task Server Actions and private task Route Handlers.
- The authenticated private-workspace flow that invokes `ensureDefaultInbox` when the user has no lists.

Consumers receive `CurrentUser` or an unauthenticated outcome. They do not receive Better Auth session records and do not accept a browser-supplied user ID as a substitute.

## Important invariants

- Every private read and mutation authenticates at its operation boundary.
- Middleware may improve navigation behavior but never replaces operation-level authentication.
- The session user ID is the ownership identity passed into list and task application use cases.
- Email/password and magic link are the supported sign-in methods; OAuth and social login remain out of scope.
- The file-backed magic-link mailbox is temporary, gitignored, and unavailable outside explicitly enabled local/test mode.
- Raw Better Auth records and provider-specific types do not cross into list, task, or landing contracts.

## Verification

The subsystem can be verified independently of completed list/task features:

- Email/password sign-up, sign-in, and sign-out produce the expected authentication state changes.
- A requested magic link can be consumed to establish the expected authenticated session.
- The local/test path captures the generated link, reads it deterministically, and verifies it without an external email provider.
- An authenticated session maps to the expected application-owned `CurrentUser` fields.
- An unauthenticated operation does not receive a `CurrentUser` from `requireUser`.
- `getCurrentUser` represents the absence of an authenticated user as `null`.
- Browser-supplied identity cannot override the session identity.
- Better Auth-specific records do not appear in the public application-facing contract.

## Implementation freedom

The implementation agent may choose:

- Exact files and folder grouping inside the auth capability.
- Functions, objects, or equivalent internal composition; the architectural name does not require a class named `AuthenticationService`.
- Better Auth API calls and adapter details compatible with the installed version.
- Exact local/test mailbox path, serialization format, helper names, and environment-variable names.
- Internal error types and test-double strategy.
- Optional middleware for navigation convenience, provided operation-level authentication remains authoritative.

## Canonical references

- [`D-001 — Personal authenticated workspace`](../../decisions/PRODUCT.md#d-001)
- [`D-002 — Password and magic-link authentication`](../../decisions/PRODUCT.md#d-002)
- [`TD-002 — Four capability modules and explicit infrastructure seats`](../../decisions/TECHNICAL.md#td-002)
- [`TD-003 — Layered dependency direction and composition-only routes`](../../decisions/TECHNICAL.md#td-003)
- [`TD-004 — Server-only Better Auth application boundary`](../../decisions/TECHNICAL.md#td-004)
- [`RULE-006 — Validate and isolate untrusted boundaries`](../../RULES.md#rule-006)
- [Agent SPEC — Auth](../../output/agent/SPEC.md#2-auth-better-auth)
- [Agent SPEC — Authentication boundary](../../output/agent/SPEC.md#143-authentication-boundary)
