# Exploration Contract

The exploration contract is an internal boundary document. It prevents accidental scope drift and makes directions comparable.

The developer does not need to know or fill this format.

## Priority order

When constraints conflict, use this precedence:

1. Explicit developer instruction.
2. Product/business invariants and safety/legal requirements.
3. Existing contracts that surrounding code depends on.
4. Established project conventions.
5. Skill defaults.
6. External inspiration.

External inspiration never overrides product requirements.

## Locked vs free dimensions

Treat business behavior conservatively by default.

Usually locked unless explicitly opened:

- backend/API contracts
- persisted data model
- permissions and authorization
- business rules
- required data fields
- compliance behavior
- destructive-action semantics
- core product terminology with domain meaning

Usually free for UI exploration unless explicitly locked:

- visual hierarchy
- layout and composition
- grouping
- information density
- progressive disclosure
- navigation within the explored surface
- filter/search presentation
- component composition
- interaction details that preserve behavior
- visual language within brand constraints

Do not assume global application navigation is free merely because local composition is free. Infer scope from the request.

## Declared exceptions

A direction may intentionally violate a normally locked UX assumption only when:

1. The developer's request permits broader UX exploration.
2. The direction clearly labels what changes.
3. The comparison explains the consequence.
4. The implementation remains isolated and does not mutate production behavior unless requested.

Example:

> Direction C intentionally changes filtering from persistent controls to query-first search. Backend query semantics remain unchanged.

## Facts vs assumptions

Persist important assumptions separately from observed repository facts.

Useful categories:

- `observed`: confirmed from project or source.
- `inferred`: likely based on context.
- `assumed`: reasonable default used to proceed.
- `explicit`: directly stated by developer.

When an assumption materially affects the decision, surface it in the final handoff.

## Comparison fixture

A fair fixture should answer:

- Who is the user?
- What are they trying to accomplish?
- What data/content must every direction handle?
- Which states are important?
- What target viewport applies?
- What stress condition could expose weaknesses?

Examples of stress conditions:

- long names
- 50+ table rows
- mixed success/error states
- narrow responsive width
- many filters
- disabled permissions
- empty state
- localization expansion

Use only stress conditions relevant to the product decision.
