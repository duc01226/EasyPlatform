---
name: prompt-enhance
version: 2.0.0
description: '[Skill Management] Enhance any prompt/doc/skill file with AI attention anchoring — summary at top+bottom, inline summaries for READ references, progressive disclosure structure. Use for prompt engineering, skill refactoring, doc optimization.'
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting.

## Quick Summary

**Goal:** Refactor any markdown prompt file (skill, doc, protocol, agent definition) to follow AI attention anchoring best practices — ensuring AI actually reads and follows all instructions.

**Workflow:**

1. **Read** — Read the target file completely
2. **Analyze** — Identify READ references, missing summaries, weak top/bottom anchoring
3. **Refactor** — Apply the 3 transformations below
4. **Verify** — Check formatting, no content loss, correct structure

**Key Rules:**

- AI attention is strongest at TOP and BOTTOM of prompt, weakest in middle (Stanford "lost-in-the-middle" research)
- Every READ instruction MUST include an inline summary of the referenced file's key rules
- Top section = concise summary + key rules. Bottom section = closing reminders echoing top rules
- Middle section = detailed steps. Accept intentional duplication between top and bottom
- **Prompt quality > token count** — but verbose prompts degrade quality too. Optimize for clarity-per-token
- Never remove **meaningful** content — but DO tighten prose, merge redundant sections, and cut filler

<!-- SYNC:output-quality-principles -->

> **Output Quality** — Token efficiency without sacrificing quality.
>
> 1. No inventories/counts — AI can `grep | wc -l`. Counts go stale instantly
> 2. No directory trees — AI can `glob`/`ls`. Use 1-line path conventions
> 3. No TOCs — AI reads linearly. TOC wastes tokens
> 4. No examples that repeat what rules say — one example only if non-obvious
> 5. Lead with answer, not reasoning. Skip filler words and preamble
> 6. Sacrifice grammar for concision in reports
> 7. Unresolved questions at end, if any

<!-- /SYNC:output-quality-principles -->

---

## Target File

Enhance this file:
<target>$ARGUMENTS</target>

If no file specified, ask via `AskUserQuestion`.

---

## Context Engineering Principles (Research-Backed)

These principles are sourced from Anthropic's official prompt engineering guide, Stanford's "lost-in-the-middle" research, and 2025-2026 LLM context optimization studies. Apply when evaluating or enhancing any prompt.

### 1. Primacy-Recency Effect (Position Sensitivity)

LLM performance drops 15-47% for information placed in the middle of long contexts (Stanford). AI attention peaks at first/last 10% of text. **Action:** Place 3 most critical rules in both first 5 lines AND last 5 lines of every prompt. Queries at end improve quality by up to 30% (Anthropic).

### 2. High-Signal Density

Anthropic: _"Identify the smallest collection of high-signal tokens that maximize the probability of the desired outcome."_ **Action:** Every line should change AI behavior. If removing a line doesn't change output → cut it. Target: ≥8 rules (MUST/NEVER/ALWAYS) per 100 lines.

### 3. Context Rot

LLM performance degrades as context length grows — even when all content is relevant. Prompt compression (5-20x) maintains or improves accuracy while saving 70-94% tokens. **Action:** Compress aggressively. Shorter, denser prompts outperform longer, diluted ones.

### 4. Structured > Prose

Tables, bullet lists, and XML/markdown structure parse faster than paragraphs for AI. Constrained formats reduce error rates compared to free-text. **Action:** Convert narrative explanations to tables/bullets. Use markdown headers for semantic sections.

### 5. RCCF Framework

Modern LLMs (2025+) already know how to reason. What they need: **R**ole (personality), **C**ontext (grounding), **C**onstraints (guardrails), **F**ormat (structure). Constraints and format matter more than verbose instructions.

### 6. Checkbox Avoidance

Checkbox `[ ]` syntax triggers mechanical compliance — AI ticks boxes without reasoning. Bullet rules force reading and evaluation. **Action:** Replace `- [ ] Check X` with `- MUST verify X`.

### 7. Example Economy

3-5 examples optimal for few-shot; diminishing returns after. Multiple examples of the same pattern waste tokens. **Action:** 1 best example per pattern. Use BAD→GOOD pairs (2-3 lines each) for anti-patterns.

### 8. Deferred Tool Loading

Claude Code delays loading tool definitions when they exceed 10% of context window. **Action:** Keep injected docs well under 10% of context budget. If a doc exceeds ~3,000 lines, it's too large for injection — split or compress.

### 9. Rule Density Verification

Post-optimization rule count (MUST/NEVER/ALWAYS) must be ≥ pre-optimization count. Compression should preserve or increase density, never decrease it. **Action:** Count before and after every optimization pass.

---

## The 4 Transformations

### Transformation 1: Inline Summaries for READ References

**Problem:** AI sees "MUST READ `file.md`" and skips reading it.
**Solution:** Add 2-3 line summary of the file's key rules BEFORE the read instruction.

**Before:**

```

```

**After:**

```
> **Evidence-Based Reasoning** — Speculation is FORBIDDEN. Every claim needs `file:line` proof.
> Confidence: >95% recommend freely, 80-94% with caveats, <80% DO NOT recommend.
```

**How to create the summary:**

1. Read the referenced file
2. Extract the 2-3 most critical rules (what AI MUST do/not do)
3. Write as a blockquote with bold label + em dash + rules
4. Keep the MUST READ instruction on the next line (still tells AI to read for details)

**Scope rules:**

- `.claude/` protocol files → YES, always add inline summary (content is stable, belongs to the framework)
- `docs/project-reference/` files → NO inline summary (content varies per project, auto-injected by hooks)
- For project-reference docs, add: `(content auto-injected by hook — check for [Injected: ...] header before reading)`

<!-- SYNC:shared-protocol-duplication-policy -->

> **Shared Protocol Duplication Policy** — Inline protocol content in skills (wrapped in `<!-- SYNC:tag -->`) is INTENTIONAL duplication. Do NOT extract, deduplicate, or replace with file references. AI compliance drops significantly when protocols are behind file-read indirection. To update: edit `.claude/skills/shared/sync-inline-versions.md` first, then grep `SYNC:protocol-name` and update all occurrences.

<!-- /SYNC:shared-protocol-duplication-policy -->

### Transformation 2: Top Summary Section

**Required structure** (first 20 lines after frontmatter):

```markdown
> **[IMPORTANT]** TaskCreate instruction...

> **Protocol Name** — [inline summary]. MUST READ `path` for details.
> **Another Protocol** — [inline summary]. MUST READ `path` for details.

## Quick Summary

**Goal:** [One sentence — what this skill achieves]

**Workflow:**

1. **[Step]** — [description]
2. **[Step]** — [description]

**Key Rules:**

- [Most critical constraint]
- [Second constraint]
```

### Transformation 3: Bottom Closing Reminders

**Add at the very end of the file:**

```markdown
---

## Closing Reminders

- **MUST** [echo the #1 most important rule from the top]
- **MUST** [echo the #2 most important rule]
- **MUST** [echo the #3 most important rule]
- **MUST** add a final review task to verify work quality
```

Pick 3-5 rules from the top that AI most commonly violates. The bottom section exists purely to re-anchor attention after the long middle section.

### Transformation 4: Token Optimization (Conciseness Pass)

**Principle:** Prompt quality is FIRST priority. But verbose prompts degrade quality too — AI attention dilutes across unnecessary tokens. Optimize for **clarity-per-token**: maximum signal, minimum noise.

**What to cut:**

- **Filler phrases** — "It is important to note that", "Please make sure to", "You should always" → just state the rule
- **Redundant explanations** — if the heading says it, the body doesn't need to re-explain. Tables > paragraphs for structured data
- **Duplicate content** — merge sections that say the same thing differently (except intentional top/bottom anchoring)
- **Overly verbose examples** — trim examples to minimum lines that demonstrate the pattern. Replace paragraph explanations with `// comment` in code
- **Prose paragraphs for rules** — convert to bullet lists or tables (AI parses structured formats faster)

**What to KEEP:**

- Code examples with actual file paths/patterns (AI copies these directly)
- Decision tables and lookup references
- Anti-pattern examples (before/after pairs)
- All `file:line` evidence and concrete paths
- Top/bottom anchoring (intentional duplication)

**Evaluation metrics per doc:**

- **Density score** — useful rules per 100 lines (higher = better)
- **Savings estimate** — % tokens saveable without losing information
- **Risk** — what breaks if cut too aggressively (e.g., AI misses a pattern)

---

## Process

### Step 1: Read and Analyze

1. Read the target file completely
2. List all READ/MUST READ references found
3. For each: classify as `.claude/` (needs inline summary) or `docs/` (skip, project-specific)
4. Check: does it have a Quick Summary section? Closing Reminders?
5. Report findings before making changes

### Step 2: Create Inline Summaries

For each `.claude/` protocol reference:

1. Read the referenced file
2. Extract 2-3 key rules
3. Write the inline summary blockquote
4. Replace the bare MUST READ with summary + read instruction

### Step 3: Add/Fix Top Section

- If Quick Summary missing → create one from the file's content
- If present but weak → strengthen with Goal, Workflow, Key Rules
- Ensure protocol summaries appear before Quick Summary

### Step 4: Add/Fix Bottom Section

- If Closing Reminders missing → add standard section
- Pick rules that AI most commonly skips (evidence-based, task creation, pattern search)
- Remove old "IMPORTANT Task Planning Notes" if superseded by Closing Reminders

### Step 5: Verify

- No YAML frontmatter corruption
- No content loss (diff check)
- Correct markdown formatting (blank lines between sections)
- READ references correctly classified (`.claude/` vs `docs/`)

---

## Closing Reminders

- **MUST** read target file completely before any changes
- **MUST** read each referenced protocol file to write accurate inline summaries — never guess content
- **MUST** apply primacy-recency anchoring — 3 critical rules in first 5 AND last 5 lines of every enhanced file
- **MUST** verify rule density: count MUST/NEVER/ALWAYS before and after — post ≥ pre
- **MUST** add inline summaries only for `.claude/` protocol files, not project-specific `docs/` files
- **MUST** keep all meaningful content — only restructure/compress, never delete rules or code examples
- **MUST** verify no YAML frontmatter corruption after changes
  **MANDATORY IMPORTANT MUST** READ the following files before starting:
      <!-- SYNC:output-quality-principles:reminder -->
- **MUST** follow output quality principles: token efficiency, lead with answer, no trailing summaries
      <!-- /SYNC:output-quality-principles:reminder -->
      <!-- SYNC:evidence-based-reasoning:reminder -->
- **MUST** cite `file:line` evidence for every claim (confidence >80% to act). NEVER speculate without proof.
      <!-- /SYNC:evidence-based-reasoning:reminder -->
- **MUST** READ `CLAUDE.md` before starting
