---
status: active
owner: engineering
---

# Next.js Boundaries

Next.js is the delivery and composition framework.

## Server Components

Use for server-side reads, public pages, dashboard pages, and view composition. Fetch from the application/data layer directly.

## Server Actions

Use for UI-triggered mutations. Each action authenticates, authorizes, validates with Zod, calls an application use case, translates expected errors, and deliberately revalidates or redirects.

## Route Handlers

Use for JSON APIs, Better Auth handlers, callbacks, webhooks, and integration boundaries. Treat them as untrusted entry points. The private list and task JSON routes remain same-origin and use the Better Auth browser session; do not add cross-origin or machine authentication without a new decision.

## Client Components

Use only for browser state, browser APIs, event handlers, or rich interaction. Business rules do not belong in components, actions, or route handlers.
