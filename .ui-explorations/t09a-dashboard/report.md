# T-09A dashboard direction exploration

Status: comparing. T-09B is responsible for selecting one direction; this exploration does not force a winner.

## What stayed constant

Every prototype uses [`fixture.json`](./fixture.json) and the same in-memory interaction harness. The shared scenario is Jordan Lee opening `Launch week`, capturing a task with an optional note, changing its status, showing or hiding completed work, switching lists, and loading one bounded continuation page. The required terminology, private-list ownership model, `todo` / `in_progress` / `done` statuses, completed-task filter, pagination affordance, and destructive-action meaning remain recognizable.

The fixture deliberately includes mixed statuses, a long list label, long titles and notes, an empty newly created list, and enough records to make the `Load 3 more` continuation meaningful. The prototypes do not call the application API, mutate the schema, add a route, or add a dependency.

## Surface scope

This spike materializes the authenticated dashboard journey only. The landing and authentication surfaces are intentionally extension notes, not interactive prototypes: their locked journeys remain Sanity-backed landing rendering with links into sign-up/sign-in, plus sign-up, sign-in, magic-link request/consume, and sign-out. The direction manifests record how each dashboard hypothesis should carry into those surfaces without exposing private task controls or provider payloads. T-11 remains the implementation owner for landing/auth screens, and T-09B remains the owner for choosing the direction they should inherit.

## Directions

| Direction                                                      | Primary hypothesis                                                                                    | Optimizes for                                               | Material trade-off                                                                            |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| [Focus Rail](./directions/focus-rail/index.html)               | A persistent list rail plus one calm queue keeps the next useful action obvious for occasional users. | Comprehension, confidence, low cognitive load.              | Comparing several statuses requires more navigation and less simultaneous context is visible. |
| [Status Board](./directions/status-board/index.html)           | Three lifecycle lanes make work in progress and state changes visible for frequent task managers.     | Throughput, scanability, state visibility.                  | Higher density and horizontal pressure make narrow-screen reading harder.                     |
| [Command Inspector](./directions/command-inspector/index.html) | A global search/capture spine plus a persistent inspector improves rapid re-entry and direct editing. | Fast retrieval, continuity, keyboard-oriented manipulation. | Browse-first users must discover the command model; empty search states are stark.            |

The directions vary information architecture, workflow model, navigation, composition, hierarchy, density, disclosure, and search/filter presentation. They are not three color treatments of one layout.

## Inspection evidence

The static preview was served with the already-installed Vite binary:

```text
pnpm exec vite .ui-explorations/t09a-dashboard --host 127.0.0.1 --port 4173
```

Chromium Playwright CLI inspection opened the launcher and each direction. The agreed matrix was exercised at `1440x900`, `1024x768`, `768x1024`, and `320x800` for every direction. The document reported no horizontal overflow at any matrix size, all three directions preserved their distinguishing structure, and the browser console reported zero errors after adding the local favicon.

Observed interaction evidence:

- Focus Rail captured a task with a note, exposed selected-list context, switched to a newly created empty list, and exposed create/rename/delete list affordances.
- Status Board moved a task from `todo` to `done`, grouped cards into all three lanes, and appended the next bounded page of records.
- Command Inspector searched across the shared fixture, produced a meaningful no-match empty state, kept a selected task in the inspector, and saved an edited note.
- A blank task capture produced an inline validation error. The loading preview temporarily set `aria-busy`, displayed a loading placeholder, and disabled eight context-sensitive controls in the inspected command direction. Selected list/task styling, visible keyboard focus, long labels, long notes, and mobile stacking were inspected directly.

The browser screenshots used for visual inspection were intentionally kept as local evidence outside the repository; the report records the observations and commands without turning transient screenshots into product assets.

## Portfolio evaluation for T-09B

| Criterion                   | Focus Rail                                                        | Status Board                                          | Command Inspector                                                              |
| --------------------------- | ----------------------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------ |
| First-open comprehension    | Strong: selected list and next action are explicit.               | Medium: lane model is clear but denser.               | Medium: command model needs orientation.                                       |
| Status visibility           | Medium: one queue with status chips.                              | Strong: all lanes and counts are immediately visible. | Medium: status is visible in results and inspector.                            |
| Capture speed               | Strong: inline title/note capture.                                | Strong: capture sits above the board.                 | Strong for returning users: capture is next to search.                         |
| Retrieval and continuity    | Medium: list navigation is explicit.                              | Medium: list selector preserves context.              | Strong: query, result index, and inspector stay together.                      |
| Narrow viewport suitability | Strong: rail becomes a scrollable context strip and queue stacks. | Medium: lanes stack, increasing page length.          | Strong: spine and inspector stack without document overflow.                   |
| Implementation complexity   | Low: straightforward list rail and queue.                         | Medium: lane grouping and responsive board rules.     | Medium: search, result selection, and inspector state add interaction surface. |

These are prototype observations, not a product decision. T-09B should weigh the intended user mix and expected task volume before selecting a direction. The current recommendation is to carry all three forward until that decision is made.

## Contract reconciliation and limitations

`TST-UI-001` is now `partial`: the fair prototype and Chromium inspection layer is evidenced here. The contract's materialized Next.js runtime, authenticated ownership, and end-to-end browser layers remain owned by T-09B, T-10, T-11, T-12A, and T-15. This prototype does not prove persistence, API authorization, Sanity rendering, or cross-browser compatibility.

Structural validation command:

```text
python .agents/skills/ui-direction-explorer/scripts/validate-directions.py .ui-explorations/t09a-dashboard
```

It passes with exactly three direction manifests and no structural warnings. Project-level `pnpm test` was also run for this static-only slice; persistence integration evidence from the unchanged surface is reused rather than re-run as a weaker substitute.
