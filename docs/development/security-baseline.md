# Security Baseline

- Authenticate every private read and mutation.
- Authorize ownership in application use cases, not only in UI or route code.
- Validate Server Action, Route Handler, and external CMS inputs.
- Keep Better Auth secrets, database URLs, and Sanity tokens out of git and client bundles.
- Return the same privacy-preserving not-found behavior for nonexistent resources and resources owned by another user.
- Treat all browser input and webhook/integration payloads as untrusted.
- Verify the Sanity webhook signature before trusting its payload or invalidating content.
- Require explicit operator authorization for manual cache recovery, and keep webhook and operator secrets server-side.
- Keep private list and task JSON routes same-origin and session-authenticated unless a later decision defines machine credentials and their lifecycle.
