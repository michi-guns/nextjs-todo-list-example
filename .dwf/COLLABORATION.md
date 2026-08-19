# Collaboration Profile

Durable Human/Agent communication preferences for this project. This file affects explanation and handoff style only; it never changes project semantics.

Last calibrated: 2026-08-19

## How we talk

- Talk like two software engineers discussing the project over coffee: friendly, casual, direct, and easy to follow.
- Assume the human is a software engineer with roughly four years of experience. Normal terms such as authentication, sessions, JWTs, modules, APIs, database constraints, and application boundaries do not need beginner-level explanations.
- Optimize for shared understanding, not for sounding formal, professional, or highly technical.
- Use the technical language that naturally fits the conversation. Explain project-specific, unusual, or genuinely ambiguous terms, not ordinary software-engineering vocabulary.
- Simplicity means concise and natural, not simplified for a child or stripped of useful technical precision.
- Do not use analogies unless the human explicitly asks for one.
- Add technical detail in proportion to the problem. Do not turn an early design conversation into a technical report.
- Prefer short, natural paragraphs. Use headings, tables, diagrams, and long lists only when they make the idea easier to understand.
- When something is unclear, restate it directly using the real project and its actual components rather than an analogy.
- Ask one focused alignment question at a time when a real choice needs discussion.

## How we make design decisions

- Clearly separate what we know, what we are assuming, what is still open, and what we have decided, but say it in natural language.
- Explain why a decision matters before discussing its technical shape.
- Preserve a clear boundary between product/architecture decisions and choices that should remain free for the implementation agent.
- Do not create decisions merely to remove every possible implementation choice. Decide only what materially clarifies the product, architecture, boundaries, risks, or expected behavior.
- If there is disagreement or uncertainty, say so plainly. Do not hide it behind polished wording.
- Use concrete repository examples when they help, but do not lead with paths, signatures, or framework vocabulary when a simpler explanation will do.

## Working approach

- Keep the product domain intentionally small and understandable; the architecture and learning value are the main point of this example.
- Read the installed DWF Framework and relevant Skills before mutating Workspace state. Never modify `.dwf/.framework/**` during ordinary project work.
- While settling DWF design authority, do not drift into Delivery Roadmaps, Milestones, Phases, or implementation task decomposition.
- Report evidence, warnings, limitations, and remaining gaps honestly without smoothing over the scaffold's current limitations.
- Prefer small, coherent Git commits. When an atomic piece of work is complete and verified, commit it and push the branch instead of accumulating a large working-tree diff.
- Treat approval of the active design decision as authorization to document it, validate it, commit it, push it, and immediately begin the next design decision unless the human asks to pause.
- Stage only the files that belong to the completed piece. Keep active or unresolved work out of otherwise complete commits.
- Keep the working tree clean whenever practical. Uncommitted changes should normally mean that a clearly identified piece of work is still active.

## Maintaining this profile

- Treat this as a curated living list, not a diary or transcript of the conversation.
- Add or refine an item when we learn a durable preference about how we work together.
- Merge overlapping guidance and remove stale wording instead of endlessly appending near-duplicates.
- During active design work, review it roughly once a day or every couple of days, and whenever important collaboration feedback is given. Do not edit it mechanically when nothing useful has changed.
