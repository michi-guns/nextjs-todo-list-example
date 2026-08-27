# Developer Experience

## Principle

Assume the developer remembers only one thing: this skill helps explore and prototype UI/UX directions.

Everything else should be discovered, inferred, or explained at the moment it becomes useful.

## Interaction model

### At invocation

If enough intent exists, proceed. A short orientation is useful when the request is vague:

> I’ll inspect the existing product surface, create several meaningfully different approaches, and keep them comparable so you can choose the high-level direction. I’ll preserve existing product behavior unless the exploration clearly calls out a deliberate alternative.

Do not dump methodology, configuration, source lists, or internal terms.

### While working

Surface only decisions that materially benefit from developer input. Prefer statements that make assumptions visible without blocking progress:

> I’m treating the current API and permissions as fixed, while navigation, hierarchy, density, and filtering are open to change.

If that assumption can be inferred safely, continue rather than waiting for approval.

### At decision points

Explain the choice in product language:

> A is a dense operations tool; B is a guided workspace. The main decision is whether frequent-user throughput or occasional-user clarity matters more here.

Then offer simple next moves.

## Questions

Ask only when all three are true:

1. The information cannot be inferred from the repository, prompt, or existing exploration state.
2. Different answers would materially change the exploration.
3. Proceeding with a reasonable default would create significant wasted work or product risk.

Ask one high-value product question rather than a skill-configuration questionnaire.

Never ask the developer to choose internal settings such as a divergence score, fixture strategy, research provider, or manifest format.

## Natural language is the API

Map ordinary phrases to internal behavior:

| Developer says              | Interpret as                                |
| --------------------------- | ------------------------------------------- |
| "show me a few options"     | several distinct directions                 |
| "ideas only"                | concept briefs, no code                     |
| "make them clickable"       | prototype depth                             |
| "use the real page"         | integrated depth                            |
| "keep the sidebar"          | lock navigation                             |
| "don't touch behavior"      | lock workflows/business logic               |
| "make it more experimental" | increase design risk, not random decoration |
| "continue this"             | recover previous exploration state          |
| "go with B"                 | select B and guide productionization        |

## Failure and capability messages

Translate implementation limitations into plain language.

Bad:

> MCP capability unavailable; source-selection fallback activated.

Good:

> Mobbin isn’t available in this environment, so I used the sources I can access plus patterns already present in the project. That doesn’t block the exploration.

Bad:

> Visual QA phase skipped due to missing browser tool.

Good:

> I could build the prototypes here, but this environment can’t render them for visual inspection, so I haven’t claimed a visual pass.

## Continuity

The developer should not have to remember identifiers or previous decisions. When exploration state exists, resolve references like:

- "the one I liked"
- "yesterday's dashboard exploration"
- "option C"
- "the dense one"
- "continue the onboarding ideas"

from project-local state and conversation context when possible.

If ambiguity remains but work can continue safely, choose the most likely referent and state the assumption briefly.

## Avoid documentation-as-DX

Do not solve usability problems by telling the developer to read this skill's documentation. The skill itself is responsible for guiding the workflow.
