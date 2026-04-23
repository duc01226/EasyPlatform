---
name: problem-solving
version: 2.0.0
description: '[Utilities] Apply systematic problem-solving techniques for complexity spirals (simplification cascades), innovation blocks (collision-zone thinking), recurring patterns (meta-pattern recognition), assumption constraints (inversion exercise), and scale uncertainty (scale game). Triggers: problem-solving, structured thinking, decision framework, simplification cascade, collision-zone thinking, meta-pattern, inversion exercise, scale game.'
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> - **Check downstream references before deleting.** Deleting components causes documentation and code staleness cascades. Map all referencing files before removal.
> - **Verify AI-generated content against actual code.** AI hallucinates APIs, class names, and method signatures. Always grep to confirm existence before documenting or referencing.
> - **Trace full dependency chain after edits.** Changing a definition misses downstream variables and consumers derived from it. Always trace the full chain.
> - **Trace ALL code paths when verifying correctness.** Confirming code exists is not confirming it executes. Always trace early exits, error branches, and conditional skips — not just happy path.
> - **When debugging, ask "whose responsibility?" before fixing.** Trace whether bug is in caller (wrong data) or callee (wrong handling). Fix at responsible layer — never patch symptom site.
> - **Assume existing values are intentional — ask WHY before changing.** Before changing any constant, limit, flag, or pattern: read comments, check git blame, examine surrounding code.
> - **Verify ALL affected outputs, not just the first.** Changes touching multiple stacks require verifying EVERY output. One green check is not all green checks.
> - **Holistic-first debugging — resist nearest-attention trap.** When investigating any failure, list EVERY precondition first (config, env vars, DB names, endpoints, DI registrations, data preconditions), then verify each against evidence before forming any code-layer hypothesis.
> - **Surgical changes — apply the diff test.** Bug fix: every changed line must trace directly to the bug. Don't restyle or improve adjacent code. Enhancement task: implement improvements AND announce them explicitly.
> - **Surface ambiguity before coding — don't pick silently.** If request has multiple interpretations, present each with effort estimate and ask. Never assume all-records, file-based, or more complex path.

<!-- /SYNC:ai-mistake-prevention -->

## Quick Summary

**Goal:** Apply systematic problem-solving techniques matched to specific types of stuck-ness.

**Workflow:**

1. **Identify Stuck-Type** — Match symptom to technique (complexity, innovation block, recurring pattern, assumption, scale)
2. **Load Reference** — Read detailed technique guide from `references/`
3. **Apply Systematically** — Follow technique process; combine techniques if needed
4. **Document Insights** — Record what worked/failed for future reference

**Key Rules:**

- Match symptom to technique: complexity spirals = Simplification Cascades, innovation blocks = Collision-Zone Thinking
- Multiple techniques can be combined (e.g., Simplification + Meta-pattern)
- "This problem is unique" is almost always wrong; look for meta-patterns

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

# Problem-Solving Techniques

Systematic approaches for different types of stuck-ness. Each technique targets specific problem patterns.

## When to Use

Apply when encountering:

- **Complexity spiraling** - Multiple implementations, growing special cases, excessive branching
- **Innovation blocks** - Conventional solutions inadequate, need breakthrough thinking
- **Recurring patterns** - Same issue across domains, reinventing solutions
- **Assumption constraints** - Forced into "only way", can't question premise
- **Scale uncertainty** - Production readiness unclear, edge cases unknown
- **General stuck-ness** - Unsure which technique applies

## Quick Dispatch

**Match symptom to technique:**

| Stuck Symptom                                         | Technique                    | Reference                                |
| ----------------------------------------------------- | ---------------------------- | ---------------------------------------- |
| Same thing implemented 5+ ways, growing special cases | **Simplification Cascades**  | `references/simplification-cascades.md`  |
| Conventional solutions inadequate, need breakthrough  | **Collision-Zone Thinking**  | `references/collision-zone-thinking.md`  |
| Same issue in different places, reinventing wheels    | **Meta-Pattern Recognition** | `references/meta-pattern-recognition.md` |
| Solution feels forced, "must be done this way"        | **Inversion Exercise**       | `references/inversion-exercise.md`       |
| Will this work at production? Edge cases unclear?     | **Scale Game**               | `references/scale-game.md`               |
| Unsure which technique to use                         | **When Stuck**               | `references/when-stuck.md`               |

## Core Techniques

### 1. Simplification Cascades

Find one insight eliminating multiple components. "If this is true, we don't need X, Y, Z."

**Key insight:** Everything is a special case of one general pattern.

**Red flag:** "Just need to add one more case..." (repeating forever)

### 2. Collision-Zone Thinking

Force unrelated concepts together to discover emergent properties. "What if we treated X like Y?"

**Key insight:** Revolutionary ideas from deliberate metaphor-mixing.

**Red flag:** "I've tried everything in this domain"

### 3. Meta-Pattern Recognition

Spot patterns appearing in 3+ domains to find universal principles.

**Key insight:** Patterns in how patterns emerge reveal reusable abstractions.

**Red flag:** "This problem is unique" (probably not)

### 4. Inversion Exercise

Flip core assumptions to reveal hidden constraints. "What if the opposite were true?"

**Key insight:** Valid inversions reveal context-dependence of "rules."

**Red flag:** "There's only one way to do this"

### 5. Scale Game

Test at extremes (1000x bigger/smaller, instant/year-long) to expose fundamental truths.

**Key insight:** What works at one scale fails at another.

**Red flag:** "Should scale fine" (without testing)

## Application Process

1. **Identify stuck-type** - Match symptom to technique above
2. **Load detailed reference** - Read specific technique from `references/`
3. **Apply systematically** - Follow technique's process
4. **Document insights** - Record what worked/failed
5. **Combine if needed** - Some problems need multiple techniques

## Combining Techniques

Powerful combinations:

- **Simplification + Meta-pattern** - Find pattern, then simplify all instances
- **Collision + Inversion** - Force metaphor, then invert its assumptions
- **Scale + Simplification** - Extremes reveal what to eliminate
- **Meta-pattern + Scale** - Universal patterns tested at extremes

## References

Load detailed guides as needed:

- `references/when-stuck.md` - Dispatch flowchart and decision tree
- `references/simplification-cascades.md` - Cascade detection and extraction
- `references/collision-zone-thinking.md` - Metaphor collision process
- `references/meta-pattern-recognition.md` - Pattern abstraction techniques
- `references/inversion-exercise.md` - Assumption flipping methodology
- `references/scale-game.md` - Extreme testing procedures
- `references/attribution.md` - Source and adaptation notes

---

## Closing Reminders

- **IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality
    <!-- SYNC:critical-thinking-mindset:reminder -->
- **MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.
    <!-- /SYNC:critical-thinking-mindset:reminder -->
    <!-- SYNC:ai-mistake-prevention:reminder -->
- **MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.
    <!-- /SYNC:ai-mistake-prevention:reminder -->

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
