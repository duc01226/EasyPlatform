---
name: prompt-expand
description: '[Skill Management] Expand caveman-compressed text back into fluent English, then apply AI attention anchoring (top/bottom summaries, inline READ summaries, progressive disclosure). Use when reconstructing compressed prompts/docs/skills into readable, well-structured form.'
---

> Codex compatibility note:
>
> - Invoke repository skills with `$skill-name` in Codex; this mirrored copy rewrites legacy Claude `/skill-name` references.
> - Prefer the `plan-hard` skill for planning guidance in this Codex mirror.
> - Task tracker mandate: BEFORE executing any workflow or skill step, create/update task tracking for all steps and keep it synchronized as progress changes.
> - User-question prompts mean to ask the user directly in Codex.
> - Ignore Claude-specific mode-switch instructions when they appear.
> - Strict execution contract: when a user explicitly invokes a skill, execute that skill protocol as written.
> - Do not skip, reorder, or merge protocol steps unless the user explicitly approves the deviation first.
> - For workflow skills, execute each listed child-skill step explicitly and report step-by-step evidence.
> - If a required step/tool cannot run in this environment, stop and ask the user before adapting.

<!-- CODEX:PROJECT-REFERENCE-LOADING:START -->

## Codex Project-Reference Loading (No Hooks)

Codex does not receive Claude hook-based doc injection.
When coding, planning, debugging, testing, or reviewing, open project docs explicitly using this routing.

**Always read:**

- `docs/project-reference/docs-index-reference.md` (routes to the full `docs/project-reference/*` catalog)
- `docs/project-reference/lessons.md` (always-on guardrails and anti-patterns)

**Situation-based docs:**

- Backend/CQRS/API/domain/entity changes: `backend-patterns-reference.md`, `domain-entities-reference.md`, `project-structure-reference.md`
- Frontend/UI/styling/design-system: `frontend-patterns-reference.md`, `scss-styling-guide.md`, `design-system/README.md`
- Spec/test-case planning or TC mapping: `feature-docs-reference.md`
- Integration test implementation/review: `integration-test-reference.md`
- E2E test implementation/review: `e2e-test-reference.md`
- Code review/audit work: `code-review-rules.md` plus domain docs above based on changed files

Do not read all docs blindly. Start from `docs-index-reference.md`, then open only relevant files for the task.

<!-- CODEX:PROJECT-REFERENCE-LOADING:END -->

> **[IMPORTANT]** Use task tracking to break ALL work into small tasks BEFORE starting.

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

## Quick Summary

**Goal:** Two-phase restoration of any caveman-compressed markdown file: (1) Language Expansion — reconstruct fluent, grammatically correct English from compressed text while preserving ALL semantic content; (2) Prompt Enhancement — apply AI attention anchoring so AI reads and follows all instructions.

**Workflow:**

1. **Read** — Read the target file completely
2. **Expand** — Apply language expansion pass (Phase 1)
3. **Enhance** — Apply prompt enhancement transforms (Phase 2)
4. **Verify** — No semantic loss, correct structure, rule density ≥ pre-expansion

**Key Rules:**

- Expand FIRST, enhance SECOND — expansion restores readability; enhancement then structures it for AI attention
- Preserve ALL facts, constraints, logical steps, numbers, and technical terms exactly — never invent or omit content
- Post-expansion rule density (MUST ATTENTION/NEVER/ALWAYS per 100 lines) must be ≥ pre-expansion
- Language expansion applies to prose only — never modify code blocks, YAML, structured tables, or SYNC tags
- Expand for clarity and flow, not verbosity — natural English, not padded English

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

Expand and enhance this file:
<target>$ARGUMENTS</target>

If no file specified, ask via a direct user question. If raw caveman text is passed instead of a file path, apply language expansion directly and output the result.

---

## Phase 1: Language Expansion

Convert caveman-compressed text back into proper, fluent English. The source text uses very short sentences, no connectives, active voice, concrete language, and minimal articles.

### Expansion Rules

#### What to Add

| Category            | Examples                                                            | Guidance                                                                    |
| ------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Articles            | a, an, the                                                          | Add where natural; default to `the` for specific things, `a/an` for general |
| Connectives         | because, therefore, however, additionally, which means, in order to | Use to show logical relationships between sentences                         |
| Auxiliary verbs     | is, are, was, were, have, has, does                                 | Restore where grammatically required                                        |
| Prepositions        | of, for, to, in, on, at                                             | Add back when they clarify relationships                                    |
| Pronouns            | it, this, that, they                                                | Restore when referencing a previously mentioned noun                        |
| Subordinate clauses | "which allows...", "so that...", "when..."                          | Use to merge short choppy sentences into natural flow                       |

#### What to Preserve Exactly

| Category                         | Why                                                                     |
| -------------------------------- | ----------------------------------------------------------------------- |
| All nouns and noun phrases       | Core semantic units — never paraphrase                                  |
| All main verbs                   | Actions must remain unchanged                                           |
| All adjectives                   | Meaning-bearing; do not substitute synonyms                             |
| Numbers and quantifiers          | `at least 20`, `approximately 15%`, `more than 3` — exact values matter |
| Uncertainty qualifiers           | `appears to be`, `seems`, `might` — these are intentional hedges        |
| Negations                        | `not`, `no`, `never`, `without` — critical for correctness              |
| Technical and domain terms       | Never simplify or paraphrase domain language                            |
| `file:line` references and paths | Exact paths must be preserved verbatim                                  |
| Names and titles                 | `Dr.`, `Senator`, proper nouns — unchanged                              |
| Time and frequency words         | `every Tuesday`, `weekly`, `always`, `never`                            |

#### Connective Selection Guide

Use connectives that accurately reflect the logical relationship — do not add connectives arbitrarily.

| Relationship   | Connectives to use                                    |
| -------------- | ----------------------------------------------------- |
| Cause → Effect | because, since, which causes, leading to, as a result |
| Contrast       | however, but, although, despite, on the other hand    |
| Addition       | additionally, furthermore, also, in addition, and     |
| Sequence       | first, then, next, finally, after, before             |
| Purpose        | in order to, so that, to enable, to ensure            |
| Condition      | if, when, unless, provided that, given that           |
| Clarification  | specifically, that is, in other words, which means    |

### Sentence Expansion Process

For each compressed sentence or bullet:

1. **Identify the core subject-verb-object** — this is non-negotiable content
2. **Restore articles** — add `the` for specific referents, `a/an` for general
3. **Restore auxiliary verbs** — `was designed`, `is required`, `has been removed`
4. **Add connectives** — merge related short sentences into one fluent sentence where natural
5. **Restore prepositions** — add `of`, `for`, `to` where they clarify relationships
6. **Check length** — target 10-25 words per sentence for readability

### Expansion Examples

| Compressed                                                      | Expanded                                                                     | Notes                                                    |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------- |
| "System designed process data efficiently."                     | "The system was designed to process data efficiently."                       | Added: the, was, to                                      |
| "Removes predictable grammar preserving unpredictable content." | "It removes predictable grammar while preserving the unpredictable content." | Added: It, while, the                                    |
| "At least 20 people."                                           | "There were at least 20 people."                                             | Restored existential construction; kept quantifier exact |
| "Made from wood and metal."                                     | "It is made from wood and metal."                                            | Added: It, is; kept `from` (relationship preposition)    |
| "Method compressing LLM contexts."                              | "This is a semantic compression method for LLM contexts."                    | Fully restored noun phrase                               |
| "Confidence >80% act."                                          | "When confidence exceeds 80%, proceed to act."                               | Restored conditional structure                           |

### Expansion Scope

Apply expansion to:

- Prose paragraphs and explanatory text
- Bullet point descriptions
- Rule statements (restore full imperative sentences)
- Section introductions and transitions

Do NOT modify:

- Code blocks (any language)
- YAML frontmatter
- Structured tables (expand cell values only if they are prose fragments)
- `<!-- SYNC -->` tags and their contents
- `file:line` references and paths
- Frontmatter fields

---

## Phase 2: Prompt Enhancement

Applies after expansion. Source: Anthropic prompt engineering guide, Stanford "lost-in-the-middle" research, 2025-2026 LLM context optimization studies.

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

> **Prompt Enhancement Transforms (Base)** — Transforms 1-3 are identical across `prompt-enhance` / `prompt-expand`. Transform 4 is per-skill (conciseness pass for enhance; structural clarity pass for expand) and stays local to each skill.
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
> - `docs/project-reference/` files → NO inline summary (varies per project, auto-injected by hooks). Add: `(Codex has no hook injection — open this file directly before proceeding)`
>
> ### Transform 2: Top Summary Section
>
> Required structure (first 20 lines after frontmatter):
>
> ```markdown
> > **[IMPORTANT]** task tracking instruction...
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

#### Transform 4: Structural Clarity Pass

After expansion, apply structural improvements:

**Convert to structured format:**

- Prose paragraphs listing rules → bullet lists
- Enumerated conditions → decision tables
- Before/after examples → two-column tables

**Keep as prose:**

- Explanatory context (why a rule exists)
- Narrative descriptions of workflows
- Anti-pattern stories and rationale

---

## Process

### Step 1: Read and Analyze

1. Read the target file completely
2. Record: current line count, rule density (MUST ATTENTION/NEVER/ALWAYS count per 100 lines)
3. Identify compressed prose regions — very short sentences, missing articles, no connectives
4. List all READ references → classify as `.claude/` (needs inline summary) or `docs/` (skip)
5. Note: missing Quick Summary, missing Closing Reminders, tables needing cell expansion

### Step 2: Language Expansion Pass

1. Work through each prose section sequentially
2. For each compressed sentence or bullet: restore articles, auxiliary verbs, connectives, prepositions
3. Merge short choppy sentences into natural flowing sentences where logical relationship is clear
4. Skip code blocks, YAML, SYNC tags, and file paths entirely
5. After each paragraph, verify that all original facts and constraints are still present

### Step 3: Create Inline Summaries

For each `.claude/` protocol reference:

1. Read the referenced file
2. Extract 2-3 key rules
3. Write the blockquote inline summary
4. Keep the MUST ATTENTION READ instruction on the next line

### Step 4: Add/Fix Top Section

- If Quick Summary is missing → create one from the file's content
- If present but weak → strengthen with Goal, Workflow, Key Rules structure
- Ensure protocol summaries appear before the Quick Summary block

### Step 5: Add/Fix Bottom Section

- If Closing Reminders are missing → add the standard section
- Choose rules that AI most commonly skips (evidence-based, task creation, pattern search)
- Remove old "IMPORTANT Task Planning Notes" sections if superseded by Closing Reminders

### Step 6: Verify

| Check                 | Pass Condition                                                     |
| --------------------- | ------------------------------------------------------------------ |
| No YAML corruption    | Frontmatter intact and parseable                                   |
| No semantic loss      | All original facts, constraints, numbers, paths present            |
| Rule density          | Post-expansion ≥ pre-expansion (count MUST ATTENTION/NEVER/ALWAYS) |
| Fluency               | No remaining 2-5 word telegraphic sentences in prose regions       |
| Formatting            | Blank lines between sections, headers correct                      |
| READ classification   | `.claude/` → inline summary added, `docs/` → skipped               |
| Code blocks untouched | No changes inside ``` fences                                       |

---

<!-- SYNC:ai-mistake-prevention -->

**AI Mistake Prevention** — Failure modes to avoid on every task:
**Check downstream references before deleting.** Deleting components causes documentation and code staleness cascades. Map all referencing files before removal.
**Verify AI-generated content against actual code.** AI hallucinates APIs, class names, and method signatures. Always grep to confirm existence before documenting or referencing.
**Trace full dependency chain after edits.** Changing a definition misses downstream variables and consumers derived from it. Always trace the full chain.
**Trace ALL code paths when verifying correctness.** Confirming code exists is not confirming it executes. Always trace early exits, error branches, and conditional skips — not just happy path.
**When debugging, ask "whose responsibility?" before fixing.** Trace whether bug is in caller (wrong data) or callee (wrong handling). Fix at responsible layer — never patch symptom site.
**Assume existing values are intentional — ask WHY before changing.** Before changing any constant, limit, flag, or pattern: read comments, check git blame, examine surrounding code.
**Verify ALL affected outputs, not just the first.** Changes touching multiple stacks require verifying EVERY output. One green check is not all green checks.
**Holistic-first debugging — resist nearest-attention trap.** When investigating any failure, list EVERY precondition first (config, env vars, DB names, endpoints, DI registrations, data preconditions), then verify each against evidence before forming any code-layer hypothesis.
**Surgical changes — apply the diff test.** Bug fix: every changed line must trace directly to the bug. Don't restyle or improve adjacent code. Enhancement task: implement improvements AND announce them explicitly.
**Surface ambiguity before coding — don't pick silently.** If request has multiple interpretations, present each with effort estimate and ask. Never assume all-records, file-based, or more complex path.

<!-- /SYNC:ai-mistake-prevention -->
<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.

<!-- /SYNC:critical-thinking-mindset:reminder -->
<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.

<!-- /SYNC:ai-mistake-prevention:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION** apply language expansion FIRST before any structural enhancement — never skip Phase 1
**IMPORTANT MUST ATTENTION** preserve ALL facts, numbers, technical terms, and `file:line` references exactly — never invent or paraphrase content
**IMPORTANT MUST ATTENTION** never modify code blocks, YAML frontmatter, structured tables, or SYNC tags during expansion
**IMPORTANT MUST ATTENTION** verify rule density post-expansion ≥ pre-expansion — expansion must not dilute signal below the original
**IMPORTANT MUST ATTENTION** apply primacy-recency anchoring — 3 critical rules in first 5 AND last 5 lines of every enhanced file
**IMPORTANT MUST ATTENTION** add inline summaries only for `.claude/` protocol files, never for `docs/` project-specific files
**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act). NEVER speculate without proof.
**IMPORTANT MUST ATTENTION** READ `CLAUDE.md` before starting

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using task tracking.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:START -->

## Hookless Prompt Protocol Mirror (Auto-Synced)

Source: `.claude/hooks/lib/prompt-injections.cjs` + `.claude/.ck.json`

## [WORKFLOW-EXECUTION-PROTOCOL] [BLOCKING] Workflow Execution Protocol — MANDATORY IMPORTANT MUST CRITICAL. Do not skip for any reason.

1. **DETECT:** Match prompt against workflow catalog
2. **ANALYZE:** Find best-match workflow AND evaluate if a custom step combination would fit better
3. **ASK (REQUIRED FORMAT):** Use a direct user question with this structure:
    - Question: "Which workflow do you want to activate?"
    - Option 1: "Activate **[BestMatch Workflow]** (Recommended)"
    - Option 2: "Activate custom workflow: **[step1 → step2 → ...]**" (include one-line rationale)
4. **ACTIVATE (if confirmed):** Call `$workflow-start <workflowId>` for standard; sequence custom steps manually
5. **CREATE TASKS:** task tracking for ALL workflow steps
6. **EXECUTE:** Follow each step in sequence
   **[CRITICAL-THINKING-MINDSET]** Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
   **Anti-hallucination principle:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.
   **AI Attention principle (Primacy-Recency):** Put the 3 most critical rules at both top and bottom of long prompts/protocols so instruction adherence survives long context windows.

## Learned Lessons

# Lessons Learned

> **[CRITICAL]** Hard-won project debugging/architecture rules. MUST ATTENTION apply BEFORE forming hypothesis or writing code.

## Quick Summary

**Goal:** Prevent recurrence of known failure patterns — debugging, architecture, naming, AI orchestration, environment.

**Top Rules (apply always):**

- MUST ATTENTION verify ALL preconditions (config, env, DB names, DI regs) BEFORE code-layer hypothesis
- MUST ATTENTION fix responsible layer — NEVER patch symptom sites with caller-specific defensive code
- MUST ATTENTION use `ExecuteInjectScopedAsync` for parallel async + repo/UoW — NEVER `ExecuteUowTask`
- MUST ATTENTION name by PURPOSE not CONTENT — adding member forces rename = abstraction broken
- MUST ATTENTION persist sub-agent findings incrementally after each file — NEVER batch at end
- MUST ATTENTION Windows bash: verify Python alias (`where python`/`where py`) — NEVER assume `python`/`python3` resolves

---

## Debugging & Root Cause Reasoning

- [2026-04-11] **Holistic-first: verify environment before code.** Failure → list ALL preconditions (config, env vars, DB names, endpoints, DI regs, credentials, permissions, data prerequisites) → verify each via evidence (grep/cat/query) BEFORE code-layer hypothesis. Worst rabbit holes: diving nearest layer while bug sits elsewhere — e.g., hours debugging "sync timeout", real cause: test appsettings pointing wrong DB. Cheapest check first.
- [2026-04-01] **Ask "whose responsibility?" before fixing.** Trace: bug in caller (wrong data) or callee (wrong handling)? Fix responsible layer — NEVER patch symptom site masking real issue.
- [2026-04-01] **Trace data lifecycle, not error site.** Follow data: creation → transformation → consumption. Bug usually where data created wrong, not consumed.
- [2026-04-01] **Code is caller-agnostic.** Functions/handlers/consumers don't know who invokes them. Comments/guards/messages describe business intent — NEVER reference specific callers (tests, seeders, scripts).

## Architecture Invariants

- [2026-03-31] **ParallelAsync + repo/UoW MUST use `ExecuteInjectScopedAsync`, NEVER `ExecuteUowTask`.** `ExecuteUowTask` creates new UoW but reuses outer DI scope (same DbContext) — parallel iterations sharing non-thread-safe DbContext silently corrupt data. `ExecuteInjectScopedAsync` creates new UoW + new DI scope (fresh repo per iteration).
- [2026-03-31] **Bus message naming MUST include service name prefix — core services NEVER consume feature events.** Prefix declares schema ownership (`AccountUserEntityEventBusMessage` = Accounts owns). Core services (Accounts, Communication) are leaders. Feature services (Growth, Talents) sending to core MUST use `{CoreServiceName}...RequestBusMessage` — never define own event for core to consume.

## Naming & Abstraction

- [2026-04-12] **Name PURPOSE not CONTENT — "OrXxx" anti-pattern.** `HrManagerOrHrOrPayrollHrOperationsPolicy` names set members, not what it guards. Add role → rename = broken abstraction. **Rule:** names express DOES/GUARDS, not CONTAINS. **Test:** adding/removing member forces rename? YES = content-driven = bad → rename to purpose (e.g., `HrOperationsAccessPolicy`). **Nuance:** "Or" fine in behavioral idioms (`FirstOrDefault`, `SuccessOrThrow`) — expresses HAPPENS, not membership.

## Environment & Tooling

- [2026-04-20] **Windows bash: NEVER assume `python`/`python3` resolves — verify alias first.** Python may not be in bash PATH under those names. Check: `where python` / `where py`. Prefer `py` (Windows Python Launcher) for one-liners, `node` if JS alternative exists.

> Test-specific lessons → `docs/project-reference/integration-test-reference.md` Lessons Learned section. Production-code anti-patterns → `docs/project-reference/backend-patterns-reference.md` Anti-Patterns section. Generic debugging/refactoring reminders → System Lessons in `.claude/hooks/lib/prompt-injections.cjs`.

---

## Closing Reminders

- **IMPORTANT MUST ATTENTION** holistic-first: verify ALL preconditions (config, env, DB names, endpoints, DI regs) BEFORE code-layer hypothesis — cheapest check first
- **IMPORTANT MUST ATTENTION** fix responsible layer — NEVER patch symptom site; trace caller (wrong data) vs callee (wrong handling), fix root owner
- **IMPORTANT MUST ATTENTION** parallel async + repo/UoW → ALWAYS `ExecuteInjectScopedAsync`, NEVER `ExecuteUowTask` (shared DbContext = silent data corruption)
- **IMPORTANT MUST ATTENTION** bus message prefix = schema ownership; feature services NEVER define events for core services — use `{CoreServiceName}...RequestBusMessage`
- **IMPORTANT MUST ATTENTION** name by PURPOSE — adding/removing member forces rename = broken abstraction
- **IMPORTANT MUST ATTENTION** sub-agents MUST write findings after each file/section — NEVER batch all findings into one final write
- **IMPORTANT MUST ATTENTION** Windows bash: NEVER assume `python`/`python3` resolves — run `where python`/`where py` first, use `py` launcher or `node`

## [LESSON-LEARNED-REMINDER] [BLOCKING] Task Planning & Continuous Improvement — MANDATORY. Do not skip.

Break work into small tasks (task tracking) before starting. Add final task: "Analyze AI mistakes & lessons learned".

**Extract lessons — ROOT CAUSE ONLY, not symptom fixes:**

1. Name the FAILURE MODE (reasoning/assumption failure), not symptom — "assumed API existed without reading source" not "used wrong enum value".
2. Generality test: does this failure mode apply to ≥3 contexts/codebases? If not, abstract one level up.
3. Write as a universal rule — strip project-specific names/paths/classes. Useful on any codebase.
4. Consolidate: multiple mistakes sharing one failure mode → ONE lesson.
5. **Recurrence gate:** "Would this recur in future session WITHOUT this reminder?" — No → skip `$learn`.
6. **Auto-fix gate:** "Could `$code-review`/`/simplify`/`$security`/`$lint` catch this?" — Yes → improve review skill instead.
7. BOTH gates pass → ask user to run `$learn`.
   **[TASK-PLANNING] [MANDATORY]** BEFORE executing any workflow or skill step, create/update task tracking for all planned steps, then keep it synchronized as each step starts/completes.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:END -->
