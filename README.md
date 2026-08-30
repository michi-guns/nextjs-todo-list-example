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
required in production. The local/test magic-link mailbox is opt-in: set
`BETTER_AUTH_LOCAL_MAILBOX=true` only in development or test, and optionally
set `BETTER_AUTH_MAILBOX_DIR` to a child of the operating-system temporary
directory or `.local/better-auth-mailbox`.

The integration suite uses `TEST_DATABASE_URL` and refuses non-local
PostgreSQL URLs. Do not commit environment files, credentials, or captured
magic links.

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
