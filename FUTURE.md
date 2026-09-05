# Future ideas

This file collects deferred experiments from the 2026-09-05 reusable-foundation review. These ideas are not accepted implementation contracts, scheduled work, or immediate delivery commitments. [TODO.md](TODO.md) owns the current roadmap. The [DWF README](.dwf/README.md), [Agent PRD](.dwf/output/agent/PRD.md), [Agent SPEC](.dwf/output/agent/SPEC.md), and decision ledgers remain authoritative.

Before starting an idea, agree its scope and prerequisites, reconcile any contract changes through DWF, and use the existing AgentForge planning and task workflow. Nothing here authorizes provisioning, deployment, destructive operations, or a maintained second application.

## Fresh fork into a different small application

Proposed experiment, deferred with no target date: derive a small application with a different domain, such as a personal reading log, to learn how much work it takes to reuse this starter. Choose the example and its limits when the experiment is accepted.

Use the existing opinionated stack and the T-29 replacement guide. Record which domain/UI files, schema and seeds, provider identities, and delivery settings had to change; which auth, persistence, validation, and testing foundations remained useful; and where setup instructions were missing or misleading. Exercise a small authenticated create/read/update path and the relevant local checks. Hosted validation would need its own agreed prerequisites and authorization.

The useful output is a short account of reuse friction and specific improvements to the guide or starter. It is not a benchmark commitment, a second maintained product, or justification for a provider-swapping framework. This experiment does not block T-29 or the current delivery roadmap.
