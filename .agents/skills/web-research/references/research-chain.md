# Research Chain (`web-research --chain=deep-dive`)

Caller-passed mode: `web-research` runs Steps 1-5, then runs the `source-deep-dive` procedure inline and leaves one evidence base. `.claude/skills/source-deep-dive/SKILL.md` stays the single owner of the deep-dive procedure; this file holds only the glue between the two.

## Applies when

- The caller passes `--chain=deep-dive` (a workflow step's `args`, or the user typing it). Nothing else triggers it.
- Without the flag, `web-research` stops after Step 5 with the source map and `$source-deep-dive` stays a separate call.

## Procedure

1. **Research.** Run `web-research` Steps 1-5 unchanged, under the query budget its own steps state; source map at `tmp/research/_sources-{slug}.md`. Keep `{slug}`.
2. **Deep dive.** [BLOCKING] Read `.claude/skills/source-deep-dive/SKILL.md` now, then execute its Steps 1-5 in order against the source map just written: load and prioritize that map (never a fresh search), within the fetch budget its own steps state, extract, cross-validate, write `tmp/research/_evidence-{slug}.md` incrementally with `## Unresolved Discrepancies` and `## Gaps Remaining`. Its rules and template win over any recollection; copy nothing from it into this chain.
3. **Caps stay separate.** The search budget in `web-research` and the fetch budget in `source-deep-dive` each apply as that skill's own steps state them; the chain restates neither number and raises neither. A Narrow scope passed by the caller lowers both.
4. **Hand-off.** Return the source-map path, the evidence-base path and the slug. The chain produces no synthesis and no review.

## Tasks

Create the `web-research` phase tasks and the `source-deep-dive` phase tasks up front, under the parent row when nested. Prefix them `web-research ·` and `deep-dive ·`; keep one `in_progress` and close each with evidence.

## Routing questions

| Situation | Behavior |
| --- | --- |
| THIS run is a step of a `[Workflow]` row (its own phase tasks are linked to that parent row, `nested=true`) | Skip `web-research` Next Steps and the `source-deep-dive` Next Steps; the workflow owns routing. A `[Workflow]` row that merely exists in the current task list, such as an abandoned one, does not count. |
| Standalone run with the flag (not nested, or only an unrelated `[Workflow]` row exists) | Run the chain with no routing question (the call is an explicit skill request); after the chain, ask the `source-deep-dive` Next Steps question once. |

## Boundaries

- **No fresh-context boundary needed.** The deep dive reads its input from the source-map file written in step 1, and the evidence base is written incrementally, so after compaction a resume continues at the first unfinished phase (source map present, evidence base absent or partial).
- **No user checkpoint between the halves.** Neither skill has a mid-chain `ask user question tool`: their only prompts are the post-run Next Steps, covered above. Any blocking question a future edit adds to `source-deep-dive` Steps 1-5 is kept inside the chained step.
- **The independent check stays outside.** The chain never reviews its own evidence. `knowledge-review` (or the caller's review gate) runs as its own step on the final artifact.
