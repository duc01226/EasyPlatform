---
name: knowledge-synthesis
version: 1.0.0
description: '[Research] Synthesize research findings into structured report using template. Final step of research workflow.'
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting.

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

**Goal:** Synthesize evidence base into final structured report using enforced template.

**Workflow:**

1. **Load evidence** — Read evidence base from deep-research
2. **Load template** — Read enforced template from .claude/templates/
3. **Synthesize** — Write report following template structure
4. **Citation check** — Verify every claim has citation
5. **Confidence summary** — Aggregate scores, flag gaps

**Key Rules:**

- MUST ATTENTION use enforced template structure — all sections required
- Every factual claim inline-cited: `[N]` referencing source table
- Knowledge gaps section mandatory

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

# Knowledge Synthesis

## Step 1: Load Evidence

Read `.claude/tmp/_evidence-{slug}.md` and `.claude/tmp/_sources-{slug}.md`.

Inventory:

- Total findings with confidence scores
- Unresolved discrepancies
- Remaining gaps

## Step 2: Load Template

Read the enforced template: `.claude/templates/research-report-template.md`

Every section in the template MUST ATTENTION appear in the final report.

## Step 3: Synthesize Report

Write to `docs/knowledge/research/{slug}.md`:

For each template section:

1. Map relevant findings from evidence base
2. Write content with inline citations `[N]`
3. Declare confidence per finding
4. Note cross-cutting patterns and contradictions in Analysis section

## Step 4: Citation Audit

Verify:

- Every factual claim has at least one `[N]` citation
- Every source in the Sources table is referenced at least once
- No orphan citations (referencing non-existent source)

## Step 5: Confidence Summary

Calculate overall report confidence:

- Average of all finding confidence scores
- Weight by finding importance
- Flag any <60% findings prominently

## Output

Final report: `docs/knowledge/research/{descriptive-slug}.md`

Clean up working files from `.claude/tmp/` after successful synthesis.

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
