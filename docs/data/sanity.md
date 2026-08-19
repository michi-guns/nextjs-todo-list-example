---
status: active
owner: content-and-engineering
related-decisions:
  - TD-007
---

# Sanity

Sanity is the CMS adapter for the public landing page.

This repository uses a dedicated Sanity project and dataset with one singleton landing document. Exact provider IDs, dataset naming, document type naming, and document ID remain setup choices.

## Suitable data

- Headline and blurb
- Primary and secondary CTA labels
- Future editorial marketing fields

## Integration rule

Fetch and validate Sanity documents in infrastructure, then map them to a landing view model. Raw GROQ and CMS document types must not cross into domain or application code.

## Not authoritative for

Users, sessions, lists, tasks, ownership, task status, or any transactional history.

Webhook revalidation and visual editing are outside the current spike.
