---
name: skill-optimize
version: 2.0.0
description: '[Skill Management] Optimize an existing agent skill for token efficiency, attention anchoring, and SYNC protocol compliance. Triggers on: optimize skill, improve skill, refactor skill, skill too long.'
disable-model-invocation: true
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting.

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:shared-protocol-duplication-policy -->

> **Shared Protocol Duplication Policy** — Inline protocol content in skills (wrapped in `<!-- SYNC:tag -->`) is INTENTIONAL duplication. Do NOT extract, deduplicate, or replace with file references. AI compliance drops significantly when protocols are behind file-read indirection. To update: edit `.claude/skills/shared/sync-inline-versions.md` first, then grep `SYNC:protocol-name` and update all occurrences.

<!-- /SYNC:shared-protocol-duplication-policy -->

## Quick Summary

**Goal:** Optimize an existing skill for token efficiency, AI attention anchoring, and SYNC protocol compliance.

**Workflow:**

1. **Analyze** — Review structure, line count, SYNC tags, attention anchoring
2. **Check SYNC compliance** — Verify protocols are inlined (not file references), tags balanced
3. **Optimize** — Apply prompt-enhance principles, move details to references, improve clarity
4. **Enhance** — Call `/prompt-enhance` on the optimized SKILL.md
5. **Validate** — Verify skill still works correctly after optimization

**Key Rules:**

- SKILL.md under 500 lines; reference files under 100 lines each
- Shared protocols MUST ATTENTION be inlined via `<!-- SYNC:tag -->` blocks, NEVER `MUST ATTENTION READ shared/` references
- MUST ATTENTION call `/prompt-enhance` as final quality pass
- Attention structure: SYNC blocks at top, Quick Summary, detailed steps, Closing Reminders with `:reminder` blocks at bottom

## Arguments

SKILL: $1 (default: `*`)
PROMPT: $2 (default: empty)

## Your Mission

Optimize skill at `.claude/skills/${SKILL}` directory.

**Mode detection:**

- If arguments contain "auto" or "trust me": Skip plan approval, implement directly.
- Otherwise: Propose plan first, ask user to review before implementing.

<additional-instructions>$PROMPT</additional-instructions>

## Optimization Checklist

### 1. Structure Check

- [ ] Has `## Quick Summary` (Goal/Workflow/Key Rules) within first 30 lines
- [ ] Has `## Closing Reminders` at bottom with `:reminder` SYNC blocks
- [ ] SYNC protocol blocks at top (primacy zone)
- [ ] Critical rules appear in BOTH top and bottom sections (primacy-recency)

### 2. SYNC Protocol Check

- [ ] No file references to `.claude/skills/shared/` — all protocols inlined via SYNC blocks
- [ ] All SYNC tags balanced (every open has matching close)
- [ ] Content matches canonical source: `.claude/skills/shared/sync-inline-versions.md`
- [ ] `:reminder` blocks present at bottom for each protocol

### 3. Token Efficiency Check

- [ ] SKILL.md under 500 lines (target: under 300)
- [ ] No filler phrases, redundant explanations, or TOCs
- [ ] Tables/bullets over prose paragraphs
- [ ] Examples are minimal (1 per pattern, not verbose)

### 4. Final Enhancement

- [ ] Call `/prompt-enhance` on the finished SKILL.md
- [ ] Verify no content loss (diff check)
- [ ] Rule density maintained or improved (count MUST ATTENTION/NEVER/ALWAYS before and after)

---

<!-- SYNC:shared-protocol-duplication-policy:reminder -->

**IMPORTANT MUST ATTENTION** follow duplication policy: inline protocols are INTENTIONAL, never extract to file references

<!-- /SYNC:shared-protocol-duplication-policy:reminder -->
<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> **Check downstream references before deleting.** Deleting components causes documentation and code staleness cascades. Map all referencing files before removal.
> **Verify AI-generated content against actual code.** AI hallucinates APIs, class names, and method signatures. Always grep to confirm existence before documenting or referencing.
> **Trace full dependency chain after edits.** Changing a definition misses downstream variables and consumers derived from it. Always trace the full chain.
> **Trace ALL code paths when verifying correctness.** Confirming code exists is not confirming it executes. Always trace early exits, error branches, and conditional skips — not just happy path.
> **When debugging, ask "whose responsibility?" before fixing.** Trace whether bug is in caller (wrong data) or callee (wrong handling). Fix at responsible layer — never patch symptom site.
> **Assume existing values are intentional — ask WHY before changing.** Before changing any constant, limit, flag, or pattern: read comments, check git blame, examine surrounding code.
> **Verify ALL affected outputs, not just the first.** Changes touching multiple stacks require verifying EVERY output. One green check is not all green checks.
> **Holistic-first debugging — resist nearest-attention trap.** When investigating any failure, list EVERY precondition first (config, env vars, DB names, endpoints, DI registrations, data preconditions), then verify each against evidence before forming any code-layer hypothesis.
> **Surgical changes — apply the diff test.** Bug fix: every changed line must trace directly to the bug. Don't restyle or improve adjacent code. Enhancement task: implement improvements AND announce them explicitly.
> **Surface ambiguity before coding — don't pick silently.** If request has multiple interpretations, present each with effort estimate and ask. Never assume all-records, file-based, or more complex path.

<!-- /SYNC:ai-mistake-prevention -->
<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.

<!-- /SYNC:critical-thinking-mindset:reminder -->
<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.

<!-- /SYNC:ai-mistake-prevention:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
**IMPORTANT MUST ATTENTION** inline shared protocols via `<!-- SYNC:tag -->` — NEVER use file references
**IMPORTANT MUST ATTENTION** call `/prompt-enhance` on optimized skill as final quality pass
**IMPORTANT MUST ATTENTION** verify SYNC tag balance and content matches canonical source

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
