# Output Quality Principles (AI Prompt Optimization)

> These reference docs are injected into AI agent context by hooks. Every line = tokens consumed. Every wasted line = slower, less effective agents. Apply these principles when generating or updating reference docs.

## The 10 Rules

1. **No inventories/counts** — Don't list "there are N entities/components/services." AI can `grep | wc -l`. Counts go stale instantly and waste tokens confirming greppable facts.

2. **No directory trees** — AI can `glob`/`ls`. Replace trees with 1-line path conventions: `apps/{app}/ → libs/{framework-core}/ → libs/{domain}/{module}/`

3. **No TOCs / table of contents** — AI reads linearly in injection context. TOC wastes 10-20 lines navigating content AI will read top-to-bottom anyway.

4. **Rules > descriptions** — Write "MUST use X" not "X is a pattern that allows you to..." AI needs actionable rules, not education. If removing a line doesn't change AI behavior → cut it.

5. **1 example per pattern** — Multiple examples of the same pattern waste tokens. Show the best example only. AI extrapolates from 1 good example; the 2nd-5th add noise.

6. **Tables > prose** — Structured formats (tables, bullet lists) parse faster than paragraphs for AI. Convert narrative explanations to structured format wherever possible.

7. **BAD→GOOD pairs: 2-3 lines each** — Anti-pattern examples need the contrast, not the narrative. Show the bad code, show the good code, done. Cut "this is bad because..." prose.

8. **Primacy-recency anchoring** — AI attention peaks at first/last 10% of text (Stanford "lost-in-the-middle" research). Put the 3 most critical rules in the FIRST 5 lines AND LAST 5 lines of each doc. Intentional duplication.

9. **No checkbox checklists** — Use bullet rules instead. Checkbox `[ ]` syntax triggers mechanical ticking behavior in AI instead of reasoned evaluation. Bullets force reading.

10. **Density target: ≥8 rules per 100 lines** — Count `MUST`/`NEVER`/`ALWAYS` occurrences. If density drops below 8 per 100 lines, the doc has too much filler. Post-optimization density must be ≥ pre-optimization.

## What to ALWAYS Keep

- **Code examples showing CORRECT patterns** — these prevent bugs; AI copies them directly
- **Base class names and interface signatures** — "what to extend" decisions
- **Message bus naming conventions** — cross-service bugs are hardest to debug
- **BAD→GOOD pairs** — compressed to 2-3 lines, but the contrast is essential
- **Decision rules** — "If X → use Y, else Z" (compact tables for 3+ branches)

## What to ALWAYS Cut

- File/component/service counts (stale immediately)
- "Related documents" / link sections (CLAUDE.md + hooks handle routing)
- Source references / attribution (not actionable for AI)
- ASCII art decision trees (replace with compact tables)
- Verbose anti-pattern explanations (replace with terse BAD→GOOD)
- Closing summaries that restate earlier content (unless used for primacy-recency anchoring)

## Verification After Generation

1. **Rule density** — Count `MUST`/`NEVER`/`ALWAYS`. Post ≥ pre.
2. **Base class grep** — All base class names still present.
3. **Code examples** — Every CORRECT pattern code example preserved.
4. **Primacy-recency** — Top 5 lines and bottom 5 lines contain most critical rules.
