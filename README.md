# Next.js template

This is a Next.js template with shadcn/ui.

## Project documentation

This repository is also a standalone reference example for a modern Next.js
stack, vertical-slice architecture, and AI-assisted development.

Start with the canonical [`.dwf/README.md`](.dwf/README.md). Before modifying
product behavior, architecture, persistence, or integrations, read
[`docs/documentation-protocol.md`](docs/documentation-protocol.md) and the
relevant DWF artifacts.

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
