# Next.js Todo List Example

This repository is a standalone, opinionated, production-minded Next.js starter implemented through a complete todo reference application. It combines a modern stack, domain-centered modular architecture, cross-cutting application foundations, and AI-assisted development. A derived application should be able to replace mostly the domain and UI while retaining or adapting those foundations.

The starter favors one well-supported path and the simplest design that is genuinely robust. It accepts modest extra complexity when that investment clearly improves reusable safety, correctness, operability, maintainability, or avoided rework. The source tree is currently a scaffold; the product contract describes the target starter baseline and authenticated todo journey.

## Project documentation

Start with [`.dwf/README.md`](.dwf/README.md), then read the generated
[Agent PRD](.dwf/output/agent/PRD.md), [Agent SPEC](.dwf/output/agent/SPEC.md),
and [project documentation](docs/index.md). Before modifying product behavior,
architecture, persistence, or integrations, read
[`docs/documentation-protocol.md`](docs/documentation-protocol.md) and the
relevant DWF decision ledgers.

## Local authentication and integration tests

The application reads `DATABASE_URL`, `BETTER_AUTH_URL`, and
`BETTER_AUTH_SECRET` from the server environment. `BETTER_AUTH_SECRET` is
required in production. The local/test authentication-link mailbox is opt-in:
set `BETTER_AUTH_LOCAL_MAILBOX=true` only in development or test, and
optionally set `BETTER_AUTH_MAILBOX_DIR` to a child of the operating-system
temporary directory or `.local/better-auth-mailbox`. It captures both magic
links and the email-verification link sent after password sign-up.

Password accounts must verify their email before a password session is
created. This preserves the password credential when the same verified account
later uses a magic link; Better Auth intentionally removes unproven account
credentials when a magic link proves an otherwise-unverified email. Production
email delivery remains outside the T-05 local mailbox boundary. If the magic
link is consumed first, that deliberate Better Auth security transition revokes
the unproven password credential; password reset/recovery is a later product
surface.

`pnpm test:integration` starts one disposable PostgreSQL 18 Testcontainer,
applies the committed migrations, runs the integration files serially, and
tears the container down after the suite. Docker must be available for this
command; the harness owns the generated `TEST_DATABASE_URL` and does not use an
external database target. The harness also refuses non-local PostgreSQL URLs
before destructive schema cleanup. The regular `pnpm test` suite remains
Docker-free. Do not commit environment files, credentials, or captured
authentication links.

## Adding components

To add components to your app, run the following command:

```bash
pnpm dlx shadcn@latest add button
```

This will place the ui components in the `components` directory.

## Using components

To use the components in your app, import them as follows:

```tsx
import { Button } from "@/components/ui/button"
```
