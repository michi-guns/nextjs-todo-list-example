# D-006 Example — Sanity Payload Mapping

**Illustrative only.** The normative boundary is [`../../../SPEC.md#14-boundary-clarifications`](../../../SPEC.md#14-boundary-clarifications).

The route never sees a Sanity document:

```ts
// landing/infrastructure/map-sanity-document.ts
export function mapSanityDocument(input: unknown): LandingContent {
  const document = sanityLandingDocument.parse(input)

  return {
    headline: document.headline,
    blurb: document.blurb,
    primaryCtaLabel: document.primaryCtaLabel,
    secondaryCtaLabel: document.secondaryCtaLabel,
  }
}
```

The application path depends on a repository port:

```ts
// landing/application/get-landing-content.ts
export function getLandingContent(
  repository: LandingContentRepository
): Promise<LandingContent> {
  return repository.getPublishedLandingContent()
}
```

The dependency boundary is:

```text
Sanity response (unknown)
  → Zod schema
  → mapper
  → LandingContent
  → marketing view model
  → app/(marketing)/page.tsx
```

A GROQ query, Sanity client, or CMS-specific field name must not appear in the marketing page or in lists/tasks code.
