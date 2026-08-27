# Semantic Divergence

The purpose of divergence is to test different product/design hypotheses, not to maximize novelty.

## Impact dimensions

### High impact

Differences here often justify separate directions:

- information architecture
- primary workflow model
- navigation model
- content hierarchy
- composition model
- task sequencing
- relationship between list/details/context

### Medium impact

Useful supporting differences:

- density
- progressive disclosure
- interaction model
- filtering/search model
- data visualization approach
- input/selection model
- degree of direct manipulation

### Low impact

These rarely justify separate directions on their own:

- color palette
- typography family
- border radius
- shadows
- gradients
- surface treatment
- decorative illustration
- animation style

## Pairwise decision test

For every pair, complete this sentence:

> Choosing A over B means we believe __________ matters more / works better for this user because __________.

If the sentence can only mention visual taste, the pair is insufficiently divergent.

Examples of meaningful decisions:

- persistent information visibility vs progressive disclosure
- browse-first vs search-first
- list-detail navigation vs persistent split view
- expert throughput vs guided learnability
- entity-centered vs workflow-centered organization
- monitoring overview vs action queue

## Similarity heuristic

As a deterministic lint heuristic, two directions should normally differ on:

- at least one high-impact dimension, and
- several total categorical dimensions.

This is not a mathematical definition of UX uniqueness. Semantic review wins.

## Portfolio test

After implementation, review the entire set again.

Ask:

1. Does each direction teach the team something different?
2. Are any two directions likely to lead to the same product decision?
3. Did implementation accidentally converge previously distinct concepts?
4. Is one direction only a prettier/weaker version of another?

If yes, revise or replace the redundant direction.

## Do not manufacture divergence

Different is not automatically useful.

Do not create bizarre navigation, unusual controls, or excessive novelty simply to pass a divergence gate. Every major difference needs a plausible product rationale.

## Transferring ideas between directions

A useful element may move from one direction to another only when it does not undermine the receiving direction's core hypothesis.

Do not produce a Frankenstein compromise that contains every locally attractive element but no coherent product model.
