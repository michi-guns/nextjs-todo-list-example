---
status: evolving
owner: engineering
---

# Availability

The spike prioritizes clear local behavior over production operations.

- Private list/task reads require the database and an authenticated session.
- The public landing page may use a clearly marked fallback only while Sanity is not wired.
- No real-time, multi-region, offline, or long-running worker guarantees are part of the spike.
- External failures should become explicit application or boundary errors rather than fabricated domain data.
