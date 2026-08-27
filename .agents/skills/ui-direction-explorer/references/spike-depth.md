# Exploration Depth

Direction count and implementation depth are independent.

## Brief

Use when the developer asks for ideas, concepts, high-level directions, or explicit no-code exploration.

A brief includes enough detail to compare the hypothesis:

- name
- core hypothesis
- structure / IA
- primary workflow/navigation model
- visual character when relevant
- supporting evidence
- primary advantage
- primary trade-off
- rough schematic description if useful

Do not create implementation merely to make the brief feel complete.

## Prototype

Default for "spike," "prototype," "mock it in code," "show me competing approaches," or intentional skill use where interactive comparison is expected.

A prototype should:

- use realistic content/fixture data
- implement the critical scenario
- contain enough interaction to communicate the hypothesis
- look coherent at the target viewport
- remain isolated and removable
- avoid backend integration unless essential to the hypothesis

A prototype is not production code. Optimize for learning per unit of effort.

Do not spend time on exhaustive abstractions, edge cases, analytics, complete tests, or backend plumbing unless they are necessary to evaluate the direction.

## Integrated

Use only when the developer explicitly asks to place alternatives into the real application architecture or to productionize a selected direction.

Integrated work should:

- preserve project architecture and conventions
- reuse production data/contracts
- meet normal engineering quality expectations
- include appropriate accessibility/responsiveness/tests
- remove or archive superseded experimental code as appropriate

## Inferring depth

| Wording                                             | Usually infer                 |
| --------------------------------------------------- | ----------------------------- |
| "ideas", "directions", "concepts"                   | brief                         |
| "spikes", "prototypes", "clickable", "mock in code" | prototype                     |
| "implement these in the real page"                  | integrated alternatives       |
| "make B real", "ship B", "productionize B"          | integrated selected direction |

When the skill is intentionally invoked with a vague request like "explore our dashboard" and repository coding access exists, prefer prototype unless context strongly suggests ideation-only.

## Large counts

Never silently reduce an explicit direction count.

Scale the **fidelity**, not the count, when necessary to keep comparisons fair. For many requested prototypes, implement the smallest coherent version of each that still communicates the hypothesis.

If the developer explicitly asks for high-fidelity implementations of a large count, follow the request rather than silently substituting briefs.
