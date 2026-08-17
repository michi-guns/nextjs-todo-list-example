# D-006 Contract — Landing and Sanity

**Status:** normative  
**Decision:** [D-006](../DECISIONS.md#d-006--validated-sanity-adapter-with-explicit-failure)

## Application view model

```ts
export interface LandingContent {
  headline: string
  blurb: string
  primaryCtaLabel: string
  secondaryCtaLabel?: string
}
```

This is the only landing content shape exposed beyond the module infrastructure boundary.

## Repository port

`src/modules/landing/application/ports.ts`:

```ts
export interface LandingContentRepository {
  getPublishedLandingContent(): Promise<LandingContent>
}
```

`src/modules/landing/application/get-landing-content.ts`:

```ts
export async function getLandingContent(
  repository: LandingContentRepository
): Promise<LandingContent>
```

The application use case does not know whether the repository is Sanity, a test fake, or a future provider.

## Sanity infrastructure

`src/modules/landing/infrastructure/sanity-document-schema.ts` validates the external payload before mapping. The expected document fields are:

```ts
const sanityLandingDocument = z.object({
  headline: z.string().trim().min(1),
  blurb: z.string().trim().min(1),
  primaryCtaLabel: z.string().trim().min(1),
  secondaryCtaLabel: z.string().trim().min(1).optional(),
})
```

The exact Sanity document type name may be chosen during integration; it must remain an infrastructure detail.

`map-sanity-document.ts` performs:

```text
unknown Sanity payload
  → schema parse
  → field mapping
  → LandingContent
```

Invalid or missing required content raises a typed integration error. Raw GROQ, client instances, and Sanity document types do not leave `infrastructure/`.

## Failure behavior

- During the temporary wiring period, a clearly marked fallback may unblock local page composition.
- Once the real Sanity read path works, remove that fallback.
- A missing/invalid required document should produce an explicit server-side integration failure and a controlled public error state; it must not silently substitute stale hardcoded product copy.
- Webhooks, on-demand revalidation, and authoring UI are outside this spike.
