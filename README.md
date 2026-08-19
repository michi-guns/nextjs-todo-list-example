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
