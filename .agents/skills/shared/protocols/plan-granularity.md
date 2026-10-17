> **Plan Granularity** — Plan at decision-and-boundary altitude; execution discovers mechanics.
>
> 1. Use a few outcome-oriented phases with clear ownership and dependency order; do not decompose into method edits, line changes, 30-minute tasks, or recursive sub-plans.
> 2. Name known modules, contracts, data, tests, docs, and representative paths with evidence. Require exact file paths only when the repository already proves them.
> 3. Each phase states: objective, boundaries/non-goals, important decisions, affected owners/areas, executor discovery obligations, implementation output, and acceptance/quality gate citing the plan's checklist gate numbers it owns.
> 4. Open product or irreversible technical decisions block the plan and go to the user. Bounded implementation discovery is allowed when its source, owner, and stop condition are explicit.
> 5. Split a phase only when it has a real dependency boundary, independently verifiable outcome, or disjoint write ownership. A plan that reads like implementation replay is too detailed.
>
> **Self-question:** "Does this tell the executor what must be true, where to investigate, and how completion is proved—without telling them every edit?"
