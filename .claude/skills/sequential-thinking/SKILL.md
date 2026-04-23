---
name: sequential-thinking
version: 1.0.0
description: '[AI & Tools] Apply structured, reflective problem-solving for complex tasks requiring multi-step analysis, revision capability, and hypothesis verification. Use for complex problem decomposition, adaptive planning, analysis needing course correction, problems with unclear scope, multi-step solutions, and hypothesis-driven work.'
license: MIT
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

**Goal:** Solve complex problems through structured, reflective thought sequences with dynamic adjustment and revision.

**Workflow:**

1. **Estimate** — Start with loose thought count, adjust as understanding evolves
2. **Structure Thoughts** — One aspect per thought; state assumptions and uncertainties
3. **Revise/Branch** — Mark revisions of earlier thoughts; branch for alternative approaches
4. **Hypothesize & Verify** — Generate solution hypothesis, test it, iterate until verified
5. **Complete** — Mark final only when solution verified and confidence achieved

**Key Rules:**

- Dynamically expand/contract thought count as complexity changes
- Explicitly mark revisions with original reasoning and why it changed
- Can apply explicitly (visible markers) or implicitly (internal methodology)

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

# Sequential Thinking

Structured problem-solving via manageable, reflective thought sequences with dynamic adjustment.

## When to Apply

- Complex problem decomposition
- Adaptive planning with revision capability
- Analysis needing course correction
- Problems with unclear/emerging scope
- Multi-step solutions requiring context maintenance
- Hypothesis-driven investigation/debugging

## Core Process

### 1. Start with Loose Estimate

```
Thought 1/5: [Initial analysis]
```

Adjust dynamically as understanding evolves.

### 2. Structure Each Thought

- Build on previous context explicitly
- Address one aspect per thought
- State assumptions, uncertainties, realizations
- Signal what next thought should address

### 3. Apply Dynamic Adjustment

- **Expand**: More complexity discovered → increase total
- **Contract**: Simpler than expected → decrease total
- **Revise**: New insight invalidates previous → mark revision
- **Branch**: Multiple approaches → explore alternatives

### 4. Use Revision When Needed

```
Thought 5/8 [REVISION of Thought 2]: [Corrected understanding]
- Original: [What was stated]
- Why revised: [New insight]
- Impact: [What changes]
```

### 5. Branch for Alternatives

```
Thought 4/7 [BRANCH A from Thought 2]: [Approach A]
Thought 4/7 [BRANCH B from Thought 2]: [Approach B]
```

Compare explicitly, converge with decision rationale.

### 6. Generate & Verify Hypotheses

```
Thought 6/9 [HYPOTHESIS]: [Proposed solution]
Thought 7/9 [VERIFICATION]: [Test results]
```

Iterate until hypothesis verified.

### 7. Complete Only When Ready

Mark final: `Thought N/N [FINAL]`

Complete when:

- Solution verified
- All critical aspects addressed
- Confidence achieved
- No outstanding uncertainties

## Application Modes

**Explicit**: Use visible thought markers when complexity warrants visible reasoning or user requests breakdown.

**Implicit**: Apply methodology internally for routine problem-solving where thinking aids accuracy without cluttering response.

## Scripts (Optional)

Optional scripts for deterministic validation/tracking:

- `scripts/process-thought.js` - Validate & track thoughts with history
- `scripts/format-thought.js` - Format for display (box/markdown/simple)

See README.md for usage examples. Use when validation/persistence needed; otherwise apply methodology directly.

## References

Load when deeper understanding needed:

- `references/core-patterns.md` - Revision & branching patterns
- `references/examples-api.md` - API design example
- `references/examples-debug.md` - Debugging example
- `references/examples-architecture.md` - Architecture decision example
- `references/advanced-techniques.md` - Spiral refinement, hypothesis testing, convergence
- `references/advanced-strategies.md` - Uncertainty, revision cascades, meta-thinking

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
