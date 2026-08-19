---
status: evolving
owner: engineering
---

# Availability

The starter baseline requires clear local verification and production-minded failure boundaries without claiming universal operational guarantees for every derived application.

- Private list/task reads require the database and an authenticated session.
- The public landing page may use a clearly marked fallback only while Sanity is not wired.
- No real-time, multi-region, offline, or long-running worker guarantees are part of the current todo reference baseline.
- External failures should become explicit application or boundary errors rather than fabricated domain data.
- Prefer simple recovery paths with clear operational value over elaborate availability machinery that the accepted baseline does not need.
