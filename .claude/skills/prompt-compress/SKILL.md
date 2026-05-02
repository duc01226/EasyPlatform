---
name: prompt-compress
version: 1.0.0
description: '[Skill Management] Compress + enhance any prompt/doc/skill file — applies caveman compression (stop-word removal) first, then AI attention anchoring (top/bottom summaries, inline READ summaries, progressive disclosure). Use when reducing token bloat in prompts, skills, or injected docs.'
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting.

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

## Quick Summary

**Goal:** Two-phase optimization of any markdown prompt file: (1) Caveman Compression — aggressively strip stop words and grammatical scaffolding while preserving semantic meaning; (2) Prompt Enhancement — apply AI attention anchoring so AI actually reads and follows all instructions.

**Workflow:**

1. **Read** — Read the target file completely
2. **Compress** — Apply caveman compression pass (Phase 1)
3. **Enhance** — Apply prompt enhancement transforms (Phase 2)
4. **Verify** — No content loss, correct structure, rule density ≥ pre-optimization

**Key Rules:**

- Compress FIRST, enhance SECOND — compression removes noise; enhancement then structures signal
- Never remove meaningful rules, constraints, code examples, or `file:line` evidence
- Post-optimization rule density (MUST ATTENTION/NEVER/ALWAYS per 100 lines) must be ≥ pre-optimization
- Caveman compression applies to prose only — never compress code blocks, YAML, or structured tables
- Prompt quality > token count, but verbose prompts degrade quality — optimize clarity-per-token

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

Compress and enhance this file:
<target>$ARGUMENTS</target>

If no file specified, ask via `AskUserQuestion`. If text passed instead of a file path, apply caveman compression to the text directly and output the result.

---

## Phase 1: Caveman Compression

Aggressively remove stop words and grammatical scaffolding while preserving meaning. Think like a caveman — use only content words that carry semantic weight.

### What to Remove

| Category                      | Examples                                                               |
| ----------------------------- | ---------------------------------------------------------------------- |
| Articles                      | a, an, the                                                             |
| Auxiliary verbs               | is, are, was, were, am, be, been, being, have, has, had, do, does, did |
| Redundant prepositions        | of, for, to, in, on, at (when meaning stays clear without them)        |
| Pronouns (when context clear) | it, this, that, these, those                                           |
| Pure intensifiers             | very, quite, rather, somewhat, really, extremely                       |

### What to Keep (Always)

| Category                         | Reason                                                 |
| -------------------------------- | ------------------------------------------------------ |
| All nouns                        | Core semantic units                                    |
| All main verbs (not auxiliaries) | Actions carry meaning                                  |
| All meaningful adjectives        | Add semantic signal                                    |
| Numbers and quantifiers          | `at least`, `approximately`, `more than`, `15`, `many` |
| Uncertainty qualifiers           | `appears to be`, `seems`, `might`, `what sounded like` |
| Critical prepositions            | `from`, `with`, `without`, `stuck to` — change meaning |
| Time/frequency words             | `every Tuesday`, `weekly`, `always`, `never`           |
| Names and titles                 | `Dr.`, `Mr.`, `Senator`                                |
| Technical/domain terms           | Never simplify domain language                         |
| Negations                        | `not`, `no`, `never`, `without`                        |

### Preposition Decision Rule

- Keep when defining relationship: `made from wood` (keep `from`), `stuck to wall` (keep `to`)
- Remove when purely grammatical: `system for processing data` → `system processing data`
- Keep `in/on/at` for location/position: `file in /src` (keep) vs `written in prose` (remove)

### Compression Examples

| Original                                                                    | Compressed                                                      | Removed               |
| --------------------------------------------------------------------------- | --------------------------------------------------------------- | --------------------- |
| "The system was designed to process data efficiently"                       | "System designed process data efficiently."                     | The, was, to          |
| "It removes predictable grammar while preserving the unpredictable content" | "Removes predictable grammar preserving unpredictable content." | It, the, while        |
| "There were at least 20 people"                                             | "At least 20 people."                                           | There, were           |
| "Made from wood and metal"                                                  | "Made from wood and metal."                                     | nothing — `from` kept |
| "This is a method for compressing LLM contexts"                             | "Method compressing LLM contexts."                              | This, is, a, for      |

### Compression Scope

Apply to:

- Prose paragraphs and explanatory text
- Bullet point descriptions
- Rule statements (keep imperative verbs)
- Section intros and transitions

Do NOT compress:

- Code blocks (any language)
- YAML frontmatter
- Structured tables (column values may be fragmented — keep as-is)
- `file:line` references and paths
- `<!-- SYNC -->` tags and their content
- Frontmatter fields

---

## Phase 2: Prompt Enhancement

Applies after compression. Source: Anthropic prompt engineering guide, Stanford "lost-in-the-middle" research, 2025-2026 LLM context optimization studies.

<!-- SYNC:context-engineering-principles -->

> **Context Engineering Principles** — Research-backed principles for prompt quality. Source: Anthropic prompt engineering guide, Stanford "lost-in-the-middle" research, 2025-2026 LLM context optimization studies.
>
> 1. **Primacy-Recency Effect** — LLM performance drops 15-47% for middle-context information (Stanford). AI attention peaks at first/last 10% of text. **Action:** Place the 3 most critical rules in both the first 5 lines AND the last 5 lines of every prompt. Queries at end improve quality by up to 30% (Anthropic).
> 2. **High-Signal Density** — Anthropic: _"Identify the smallest collection of high-signal tokens that maximize the probability of the desired outcome."_ **Action:** Every line should change AI behavior. If removing a line doesn't change output → cut it. Target ≥8 rules (MUST ATTENTION/NEVER/ALWAYS) per 100 lines.
> 3. **Context Rot** — LLM performance degrades as context length grows — even when all content is relevant. Compression (5-20x) maintains or improves accuracy while saving 70-94% tokens. **Action:** Compress aggressively. Shorter, denser prompts outperform longer, diluted ones.
> 4. **Structured > Prose** — Tables, bullets, XML/markdown parse faster than paragraphs. Constrained formats reduce error rates vs free-text. **Action:** Convert narrative to tables/bullets. Use markdown headers for semantic sections.
> 5. **RCCF Framework** — Modern LLMs (2025+) already know how to reason. What they need: **R**ole (personality), **C**ontext (grounding), **C**onstraints (guardrails), **F**ormat (structure). Constraints and format matter more than verbose instructions.
> 6. **Checkbox Avoidance** — `[ ]` syntax triggers mechanical compliance — AI ticks boxes without reasoning. Bullet rules force reading and evaluation. **Action:** Replace `- [ ] Check X` with `- MUST ATTENTION verify X`.
> 7. **Example Economy** — 3-5 examples optimal for few-shot; diminishing returns after. **Action:** 1 best example per pattern. Use BAD→GOOD pairs (2-3 lines each) for anti-patterns.
> 8. **Deferred Tool Loading** — Claude Code delays loading tool definitions when they exceed 10% of context window. **Action:** Keep injected docs well under 10% of context budget. Docs exceeding ~3,000 lines are too large for injection — split or compress.
> 9. **Rule Density Verification** — Post-optimization rule count (MUST ATTENTION/NEVER/ALWAYS) must be ≥ pre-optimization count. Compression should preserve or increase density, never decrease it. **Action:** Count before and after every optimization pass.

<!-- /SYNC:context-engineering-principles -->

<!-- SYNC:prompt-enhancement-transforms-base -->

> **Prompt Enhancement Transforms (Base)** — Transforms 1-3 are identical across `prompt-enhance` / `prompt-compress` / `prompt-expand`. Transform 4 is per-skill (conciseness pass for enhance/compress; structural clarity pass for expand) and stays local to each skill.
>
> ### Transform 1: Inline Summaries for READ References
>
> **Problem:** AI sees `MUST ATTENTION READ file.md` and skips it.
> **Solution:** Add a 2-3 line summary of key rules BEFORE the read instruction.
>
> **Before:**
>
> ```
> MUST ATTENTION READ .claude/protocols/evidence.md
> ```
>
> **After:**
>
> ```
> > **Evidence-Based Reasoning** — Speculation is FORBIDDEN. Every claim requires `file:line` proof.
> > Confidence: >95% recommend freely, 80-94% with caveats, <80% DO NOT recommend.
>
> MUST ATTENTION READ .claude/protocols/evidence.md for full details.
> ```
>
> **Scope rules:**
>
> - `.claude/` protocol files → always add an inline summary (stable, belongs to framework)
> - `docs/project-reference/` files → NO inline summary (varies per project, auto-injected by hooks). Add: `(content auto-injected by hook — check for [Injected: ...] header before reading)`
>
> ### Transform 2: Top Summary Section
>
> Required structure (first 20 lines after frontmatter):
>
> ```markdown
> > **[IMPORTANT]** TaskCreate instruction...
>
> > **Protocol Name** — [inline summary]. MUST ATTENTION READ `path` for details.
>
> ## Quick Summary
>
> **Goal:** [One sentence — what this skill achieves]
>
> **Workflow:**
>
> 1. **[Step]** — [description]
>
> **Key Rules:**
>
> - [Most critical constraint]
> ```
>
> ### Transform 3: Bottom Closing Reminders
>
> Add at the very end of the file:
>
> ```markdown
> ---
>
> ## Closing Reminders
>
> **IMPORTANT MUST ATTENTION** [echo rule #1 from the top section]
> **IMPORTANT MUST ATTENTION** [echo rule #2]
> **IMPORTANT MUST ATTENTION** [echo rule #3]
> **IMPORTANT MUST ATTENTION** add a final review task to verify work quality
> ```
>
> Pick 3-5 rules AI most commonly violates. Bottom section re-anchors attention after the long middle.

<!-- /SYNC:prompt-enhancement-transforms-base -->

<!-- SYNC:shared-protocol-duplication-policy -->

> **Shared Protocol Duplication Policy** — Inline protocol content in skills (wrapped in `<!-- SYNC:tag -->`) is INTENTIONAL duplication. Do NOT extract, deduplicate, or replace with file references. AI compliance drops significantly when protocols are behind file-read indirection. To update: edit `.claude/skills/shared/sync-inline-versions.md` first, then grep `SYNC:protocol-name` and update all occurrences.

<!-- /SYNC:shared-protocol-duplication-policy -->

#### Transform 4: Token Optimization (Conciseness Pass)

After caveman compression, apply structural cleanup:

**Cut:**

- Filler phrases — "It is important to note that", "Please make sure to" → state the rule directly
- Redundant explanations — if heading says it, body need not re-explain
- Duplicate content — merge sections saying same thing (except intentional top/bottom anchoring)
- Overly verbose examples — trim to minimum lines demonstrating pattern

**Keep:**

- Code examples with actual file paths/patterns
- Decision tables and lookup references
- Anti-pattern before/after pairs
- All `file:line` evidence and concrete paths
- Top/bottom anchoring (intentional duplication)

---

## Process

### Step 1: Read and Analyze

1. Read target file completely
2. Record: current line count, rule density (MUST ATTENTION/NEVER/ALWAYS count)
3. List all READ references → classify as `.claude/` (needs inline summary) or `docs/` (skip)
4. Identify: missing Quick Summary, missing Closing Reminders, prose-heavy sections

### Step 2: Caveman Compression Pass

1. Identify all prose paragraphs and bullet descriptions
2. Apply compression rules — remove stop words, keep semantic content
3. Skip code blocks, YAML, tables, SYNC tags, file paths
4. Verify meaning preserved after each paragraph

### Step 3: Create Inline Summaries

For each `.claude/` protocol reference:

1. Read the referenced file
2. Extract 2-3 key rules
3. Write blockquote inline summary
4. Keep MUST ATTENTION READ instruction on next line

### Step 4: Add/Fix Top Section

- If Quick Summary missing → create from file content
- If present but weak → strengthen with Goal, Workflow, Key Rules
- Protocol summaries appear before Quick Summary

### Step 5: Add/Fix Bottom Section

- If Closing Reminders missing → add standard section
- Pick rules AI most commonly skips
- Remove old "IMPORTANT Task Planning Notes" if superseded

### Step 6: Verify

| Check               | Pass Condition                                 |
| ------------------- | ---------------------------------------------- |
| No YAML corruption  | Frontmatter intact                             |
| No content loss     | All rules, code, paths present                 |
| Rule density        | Post ≥ pre (count MUST ATTENTION/NEVER/ALWAYS) |
| Line count          | Reduced (compression worked)                   |
| Formatting          | Blank lines between sections, headers correct  |
| READ classification | `.claude/` → inline summary, `docs/` → skipped |

---

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

**IMPORTANT MUST ATTENTION** apply caveman compression FIRST before any structural enhancement — never skip Phase 1
**IMPORTANT MUST ATTENTION** never compress code blocks, YAML frontmatter, structured tables, or SYNC tags
**IMPORTANT MUST ATTENTION** verify rule density post-compression ≥ pre-compression — compression must not dilute signal
**IMPORTANT MUST ATTENTION** apply primacy-recency anchoring — 3 critical rules in first 5 AND last 5 lines of every enhanced file
**IMPORTANT MUST ATTENTION** add inline summaries only for `.claude/` protocol files, never for `docs/` project files
**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act). NEVER speculate without proof.
**IMPORTANT MUST ATTENTION** READ `CLAUDE.md` before starting

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
