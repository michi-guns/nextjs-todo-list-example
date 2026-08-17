# D-004 Contract — Authentication and Session Boundary

**Status:** normative  
**Decision:** [D-004](../DECISIONS.md#d-004--small-server-only-authentication-boundary)

## Application DTO

```ts
export interface CurrentUser {
  id: string
  email: string
  name: string | null
}
```

`CurrentUser` is the only user shape exposed to lists, tasks, landing presentation, and dashboard composition. It is not the Better Auth user row.

## Server-only functions

```ts
/** Reads the current request's session. Returns null for anonymous requests. */
export async function getCurrentUser(): Promise<CurrentUser | null>

/** Reads the current request's session or throws UnauthenticatedError. */
export async function requireUser(): Promise<CurrentUser>

export class UnauthenticatedError extends Error {
  readonly code = "UNAUTHENTICATED"
}
```

These functions obtain session state from the server request context. They do not accept a `userId` argument and callers must not derive ownership from client input.

## Responsibilities

`src/modules/auth/infrastructure/better-auth.ts`:

- creates the Better Auth server instance
- configures the Drizzle adapter
- enables email/password and magic-link behavior
- owns provider-specific callbacks and secrets

`src/modules/auth/infrastructure/session-reader.ts`:

- reads the Better Auth session
- maps the provider record into `CurrentUser`
- returns `null` when no valid session exists

`src/modules/auth/presentation/auth-handler.ts`:

- adapts the Better Auth handler to the framework route
- is delegated by `app/api/auth/[...all]/route.ts`

## Request boundary invariant

Every private list/task read and write follows:

```text
requireUser()
  → validate untrusted input with Zod
  → call application use case with user.id
```

Middleware may redirect unauthenticated page requests for UX, but it does not replace the `requireUser()` call inside actions, handlers, or application-facing private reads.

## Auth UI boundary

Auth screens may use a browser client wrapper from `auth/presentation/client.ts`. That wrapper exposes only the operations required by the UI; it must not export the server Better Auth instance or database records.
