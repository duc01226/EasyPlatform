---
name: skill-optimize
version: 2.0.0
description: '[Skill Management] Optimize an existing agent skill for token efficiency, attention anchoring, and SYNC protocol compliance. Triggers on: optimize skill, improve skill, refactor skill, skill too long.'
disable-model-invocation: false
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting.

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
- Shared protocols MUST be inlined via `<!-- SYNC:tag -->` blocks, NEVER `MUST READ shared/` references
- MUST call `/prompt-enhance` as final quality pass
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
- [ ] Rule density maintained or improved (count MUST/NEVER/ALWAYS before and after)

---

## Closing Reminders

- **MUST** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MUST** inline shared protocols via `<!-- SYNC:tag -->` — NEVER use file references
- **MUST** call `/prompt-enhance` on optimized skill as final quality pass
- **MUST** verify SYNC tag balance and content matches canonical source
      <!-- SYNC:shared-protocol-duplication-policy:reminder -->
- **MUST** follow duplication policy: inline protocols are INTENTIONAL, never extract to file references
      <!-- /SYNC:shared-protocol-duplication-policy:reminder -->
