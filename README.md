# Next.js Todo List Example

This repository is a standalone teaching example for a modern Next.js stack, domain-centered modular architecture, and AI-assisted development. The source tree is currently a scaffold; the product contract describes the target authenticated todo journey.

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
npx shadcn@latest add button
```

This will place the ui components in the `components` directory.

## Using components

To use the components in your app, import them as follows:

```tsx
import { Button } from "@/components/ui/button"
```
