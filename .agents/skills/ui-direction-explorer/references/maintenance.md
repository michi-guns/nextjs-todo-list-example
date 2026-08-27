# Skill Maintenance

Use this file when improving the skill itself, not during ordinary UI exploration.

## Goal

Improve reliability without making normal developer interaction more complex or bloating `SKILL.md`.

## Feedback loop

After a meaningful failure or surprising result:

1. Capture the smallest reproducible prompt/context.
2. Classify the failure:
   - triggering
   - developer experience
   - context inference
   - research
   - divergence
   - comparison fairness
   - implementation isolation
   - visual quality
   - evaluation/handoff
   - continuity
3. Determine whether the fix belongs in:
   - `SKILL.md` for a universal invariant
   - a focused `references/*.md` file for phase-specific guidance
   - `scripts/` for deterministic structural checks
   - `evals/` for regression coverage
4. Add or update an eval before broadening instructions.
5. Re-run the regression set.
6. Keep the smallest instruction that fixes the class of failure.

## Do not overfit

Avoid adding a new rule for every individual bad output. Prefer general failure modes.

Bad maintenance:

> Always use a split panel on transaction screens because one exploration needed it.

Better:

> When comparing high-volume entity inspection, include hypotheses that test context-preserving detail access where relevant.

## Preserve zero-knowledge DX

Any new capability should pass this test:

> Does the developer now need to remember something new to use the skill successfully?

If yes, redesign the interaction so the skill infers it or teaches it at the moment of use.

## Keep progressive disclosure healthy

- Keep `SKILL.md` focused on universal behavior and routing to references.
- Keep reference files focused and directly linked from `SKILL.md` when they may be needed.
- Prefer deterministic scripts for checks that do not require design judgment.
- Avoid repeating the same detailed rule across multiple files.

## Source maintenance

External websites and integrations change.

Keep source reference files stable by describing:

- the source's role
- when to use it
- what evidence to extract
- how to fall back if unavailable

Do not hard-code volatile catalog counts, prices, quotas, plan names, or setup commands unless the skill's task specifically requires them. Check current provider documentation at runtime instead.

## Versioning

Update `metadata.version` in `SKILL.md` for material behavior changes.

Suggested convention:

- patch: wording/eval fixes with no intended workflow change
- minor: new optional capability/reference/guardrail
- major: changed defaults, semantics, or developer interaction contract
