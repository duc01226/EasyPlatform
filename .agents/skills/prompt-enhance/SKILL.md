---
name: prompt-enhance
description: '[Skill Management] Use when enhancing, compressing, or expanding prompts, docs, or skills with attention anchoring [INTELLIGENT ROUTING]. Flag: --op={compress|expand|enhance} (default enhance); --op=compress strips token bloat, --op=expand reconstructs compressed text.'
---

> Codex compatibility note:
>
> - Invoke repository skills with `$skill-name` in Codex; this mirrored copy rewrites legacy Claude `/skill-name` references.
> - Task tracker mandate: BEFORE executing any workflow or skill step, create/update task tracking for all steps and keep it synchronized as progress changes.
> - User-question prompts mean to ask the user directly in Codex.
> - Ignore Claude-specific mode-switch instructions when they appear.
> - Strict execution contract: when a user explicitly invokes a skill, execute that skill protocol as written.
> - Subagent authorization: when a skill is user-invoked or AI-detected and its protocol requires subagents, that skill activation authorizes use of the required `spawn_agent` subagent(s) for that task.
> - Do not skip, reorder, or merge protocol steps unless the user explicitly approves the deviation first.
> - For workflow skills, execute each listed child-skill step explicitly and report step-by-step evidence.
> - If a required step/tool cannot run in this environment, stop and ask the user before adapting.

<!-- CODEX:PROJECT-REFERENCE-LOADING:START -->

## Codex Project-Reference Loading (No Hooks)

Codex uses static project-reference loading instead of runtime-injected project docs.
When coding, planning, debugging, testing, or reviewing, open project docs explicitly using this routing.

**Always read:**

- `docs/project-config.json` (project-specific paths, commands, modules, and workflow/test settings)
- `docs/project-reference/docs-index-reference.md` (routes to the full `docs/project-reference/*` catalog)
- `docs/project-reference/lessons.md` (always-on guardrails and anti-patterns)

**Missing/stale context route:** If `docs/project-config.json`, the docs index, `lessons.md`, `CLAUDE.md`, `AGENTS.md`, or any task-required reference doc is missing or stale, auto-run `$project-init` or the narrow setup route (`$project-config`, `$docs-init`, `$scan-all`, `$scan --target=<key>`, `$claude-md-init`) before ordinary project-specific work. If Codex mirrors or `AGENTS.md` are missing/stale, ask the user to run `$sync-codex`; do not auto-run it.

**Situation-based docs:**

- Backend/CQRS/API/domain/entity changes: `backend-patterns-reference.md`, `domain-entities-reference.md`, `project-structure-reference.md`
- Frontend/UI/styling/design-system: `frontend-patterns-reference.md`, `scss-styling-guide.md`, `design-system/README.md`
- Spec authoring, `docs/specs/` pathing, or TC format: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`
- Behavior/public-contract changes or spec-test-code sync: `workflow-spec-test-code-cycle-reference.md` plus the spec docs above
- Derived spec indexes/ERDs/reimplementation guides: `spec-system-reference.md` and source Feature Specs under `docs/specs/`
- Integration test implementation/review: `integration-test-reference.md`
- E2E test implementation/review: `e2e-test-reference.md`
- Code review/audit work: `code-review-rules.md` plus domain docs above based on changed files

Do not read all docs blindly. Start from `docs-index-reference.md`, then open only relevant files for the task.

<!-- CODEX:PROJECT-REFERENCE-LOADING:END -->

## Quick Summary

**Goal:** Two-phase optimization — (1) Caveman Compression strips stop words + grammatical scaffolding while preserving semantic meaning; (2) Prompt Enhancement applies AI attention anchoring so AI reads and follows all instructions — producing a prompt/skill that states its objective and ultimate outcome (one consolidated Goal) in both top summary and bottom reminders so AI optimizes for the right result.

**Summary:**

- Two phases, in order: caveman-compress prose FIRST, then attention-anchor structure — NEVER skip or reorder.
- Enhance derives BOTH a **Goal** (the outcome to optimize for) AND a **Summary** (key things + steps to notice) for the target, and places both in its Quick Summary.
- Protect content: NEVER compress code/YAML/tables/SYNC tags, NEVER delete rules or `file:line` evidence; post rule-density MUST be ≥ pre.
- Route on `--op` (default `enhance`): `compress` = token-strip only, `expand` = reconstruct compressed text.

**Workflow:**

1. **Detect** — Classify target: skill file, sub-agent file (`.claude/agents/*.md`), protocol file, or general doc
2. **Read** — Read target file completely
3. **Goal + Summary** — Derive the target's one-sentence Goal (what it achieves + the ultimate outcome it must cause) AND its Summary (2-4 bullets of the key important things + the steps AI must notice) from the target's task, constraints, and success criteria
4. **Compress** — Apply caveman compression (Phase 1)
5. **Enhance** — Apply AI attention anchoring transforms (Phase 2)
6. **Verify** — No content loss, rule density ≥ pre-optimization, Goal anchored top and bottom

**Key Rules:**

- **Operation flag** (see [Operation Mode](#operation-mode---op)): `--op=enhance` (default) = compress + anchor + skill-principles; `--op=compress` = token-strip only; `--op=expand` = reconstruct compressed text into fluent form (inverse Phase 1 + structural Transform 4)
- NEVER skip Phase 1 (compress) before Phase 2 (enhance) — compression removes noise, enhancement structures signal
- NEVER remove meaningful rules, constraints, code examples, or `file:line` evidence
- MUST ATTENTION derive the target's Goal and add it to both `## Quick Summary` and `## Closing Reminders`
- MUST ATTENTION derive the target's Summary (key important things + steps AI must notice) and place it in `## Quick Summary` immediately after the Goal — a condensing digest at a different altitude than Workflow/Key Rules, NEVER a verbatim re-listing of them
- MUST ATTENTION skill AND sub-agent (`.claude/agents/*.md`) targets require the SAME Goal + Summary + Closing-Reminders structure (see [When Target is a Sub-Agent File](#when-target-is-a-sub-agent-file)) — anchored top and bottom; NEVER alter SYNC blocks when enhancing an agent
- Post-optimization rule density (MUST ATTENTION/NEVER/ALWAYS per 100 lines) MUST be ≥ pre-optimization
- Caveman compression applies to prose only — NEVER compress code blocks, YAML, or structured tables
- Prompt quality > token count, but verbose prompts degrade quality — optimize clarity-per-token

---

## Target File

Compress and enhance this file:
<target>$ARGUMENTS</target>

No file? Ask via a direct user question. Text passed (not file path)? Apply caveman compression directly and output result.

---

## Operation Mode (`--op=`)

Route on `--op` (default `enhance`). Transforms 1-3 (inline summaries, top summary, closing reminders — the shared SYNC base block below) are identical across all ops; only Phase 1 and Transform 4 differ:

| `--op`                | Phase 1                                         | Transform 4            | Skill-principles + Goal    | Former skill       |
| --------------------- | ----------------------------------------------- | ---------------------- | -------------------------- | ------------------ |
| `enhance` _(default)_ | Caveman Compression                             | Conciseness pass       | Applied (skill files)      | host               |
| `compress`            | Caveman Compression                             | Conciseness pass       | Skipped (pure token strip) | `/prompt-compress` |
| `expand`              | **Language Expansion** (inverse — branch below) | **Structural Clarity** | Skipped                    | `/prompt-expand`   |

- `enhance` / `compress` → run **Phase 1: Caveman Compression** + **Transform 4: Conciseness** below. `enhance` additionally derives the Goal and (for skill files) applies the Universal Skill-Building Principles; `compress` skips both for a pure token-reduction pass.
- `expand` → run the **Language Expansion branch** below INSTEAD of Caveman Compression, and the **Structural Clarity** Transform 4 instead of conciseness.
- No `--op` provided → `enhance`.

### `--op=expand` — Language Expansion branch

Reconstruct fluent, grammatically correct English from caveman-compressed text while preserving ALL semantic content (inverse of Phase 1). Run INSTEAD of Caveman Compression.

**Restore** (add back): articles (`a/an/the`); connectives matching the logical relationship (`because/however/in order to`); auxiliary verbs (`is/are/was/has`); clarifying prepositions; pronouns referencing prior nouns; subordinate clauses merging choppy sentences.
**Preserve exactly** (never paraphrase/omit): all nouns + main verbs + adjectives, numbers/quantifiers, uncertainty qualifiers, negations (`not/no/never/without`), technical/domain terms, `file:line` paths, names/titles, time/frequency words.

**Connective selection** (match relationship, never arbitrary): cause→effect `because/since/as a result`; contrast `however/although/despite`; addition `additionally/furthermore`; sequence `first/then/finally`; purpose `in order to/so that`; condition `if/when/unless`; clarification `specifically/that is`.

Per sentence: identify core S-V-O (non-negotiable) → restore articles/auxiliaries/connectives/prepositions → merge related shorts → target 10-25 words. Skip code blocks, YAML, tables, SYNC tags, paths.

**Transform 4 (expand) — Structural Clarity pass:** convert prose rule-lists → bullets, enumerated conditions → decision tables, before/after examples → two-column tables. Keep as prose: explanatory context (why a rule exists), workflow narratives, anti-pattern rationale.

Verify (expand): no semantic loss (all facts/numbers/paths present), rule density post ≥ pre, no telegraphic 2-5 word prose sentences remain, code blocks untouched.

---

## Phase 0: Detect Target Type

**Before any other step**, classify target:

| Target type        | Detection                                | Action                                                  |
| ------------------ | ---------------------------------------- | ------------------------------------------------------- |
| Skill file         | Path matches `.claude/skills/**/*.md`    | Apply Universal Skill-Building Principles after Phase 1 |
| Sub-agent file     | Path matches `.claude/agents/*.md`       | Apply Sub-Agent Required Structure after Phase 1        |
| Protocol file      | Path matches `.claude/protocols/**/*.md` | Standard 2-phase optimization only                      |
| General doc/prompt | Any other `.md` file                     | Standard 2-phase optimization only                      |
| Raw text           | No file path provided                    | Apply caveman compression only, output result           |

---

## When Target is a Skill File

Target `.claude/skills/**/*.md` (any `SKILL.md`)? Apply **Universal Skill-Building Principles** AFTER caveman compression, BEFORE writing enhanced output.

### Skill Enhancement Checklist

After caveman compression, evaluate skill against each principle, add missing structure:

| Principle                    | Check                                    | Action if missing                                      |
| ---------------------------- | ---------------------------------------- | ------------------------------------------------------ |
| Detect Before Act            | Phase 0 / classification step present?   | Add artifact-type detection before Phase 1             |
| Derive, Don't Enumerate      | Thinking framework vs. fixed checklist?  | Replace checklist with "understand → derive → execute" |
| Evidence Gates               | Every claim requires `file:line`?        | Add evidence requirement to all review steps           |
| Fresh Eyes Protocol          | Multi-round sub-agent review defined?    | Add Round 2 fresh sub-agent protocol                   |
| Specialize by Type           | Sub-agent routing table present?         | Add `security-auditor`/`performance-optimizer` options |
| Embed Protocols Verbatim     | Protocols inline in sub-agent prompts?   | Move protocol bodies inline, remove file references    |
| Search-Based Discovery       | Any hardcoded paths/formats/IDs?         | Replace with search instructions                       |
| Dimensions > Checklists      | Named dimensions with `Think:` prompts?  | Convert checklist to dimension framework               |
| Recursive Quality Loop       | Fix → re-review → max 3 rounds defined?  | Add recursive review loop                              |
| Anti-Rationalization Anchors | Closing reminders include evasion table? | Add evasion → rebuttal table                           |

---

## When Target is a Sub-Agent File

Target `.claude/agents/*.md` (a custom sub-agent definition — the shape a creator skill like `custom-agent` emits)? Apply the **Sub-Agent Required Structure** AFTER caveman compression, BEFORE writing enhanced output. Same Goal + Summary + Closing-Reminders contract as a skill file — anchored top and bottom so the isolated, zero-history sub-agent optimizes for the right outcome — mapped onto the agent body (`## Role → ## Workflow → ## Key Rules → ## Output`).

### Sub-Agent Required Structure

| Block                              | Location                                       | Requirement                                                                                                                                               |
| ---------------------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `## Quick Summary`                 | first section after frontmatter                | Present — holds Goal + Summary + Workflow + Key Rules                                                                                                     |
| `**Goal:**`                        | inside Quick Summary                           | One consolidated sentence — what the agent achieves AND the ultimate outcome it must cause                                                                |
| `**Summary:**`                     | inside Quick Summary, immediately after Goal   | 2-4 bullets — the read-this-if-nothing-else digest (key things + steps to notice); distinct altitude from Workflow/Key Rules, NEVER a verbatim re-listing |
| `**Workflow:**` / `**Key Rules:**` | inside Quick Summary                           | Keep existing                                                                                                                                             |
| `## Closing Reminders`             | end of file, after the `:reminder` SYNC blocks | Present — first line `**IMPORTANT MUST ATTENTION Goal:**` echoes the same Goal                                                                            |

- MUST ATTENTION add the missing `**Summary:**` and the Closing-Reminders Goal echo; lightly tighten Role/Workflow prose only — why: the structure must match a skill so creator skills emit one consistent shape.
- NEVER alter `<!-- SYNC:... -->` blocks or their `:reminder` variants — they are canonical-sync content; edit the canonical source (`.claude/skills/shared/sync-inline-versions.md`) instead — why: a divergent SYNC copy fails the `verify-sync-divergence` oracle.
- NEVER delete the agent body sections (`## Role`, `## Workflow`, `## Key Rules`, `## Output`) — preserve them; only restructure the summary/closing anchors.

---

## Phase 1: Caveman Compression

> Applies to `--op=compress|enhance`. For `--op=expand`, run the Language Expansion branch (above) instead.

Aggressively remove stop words + grammatical scaffolding preserving meaning. Use only content words carrying semantic weight.

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

### Transform 4: Token Optimization (Conciseness Pass)

> Applies to `--op=compress|enhance`. For `--op=expand`, use the Structural Clarity pass (see expand branch above).

Prompt quality FIRST. Verbose prompts degrade quality — AI attention dilutes across unnecessary tokens. Optimize **clarity-per-token**: maximum signal, minimum noise.

**What to cut:**

- **Filler phrases** — "It is important to note that", "Please make sure to", "You should always" → just state the rule
- **Redundant explanations** — heading says it, body doesn't re-explain. Tables > paragraphs for structured data
- **Duplicate content** — merge sections saying same thing differently (except intentional top/bottom anchoring)
- **Overly verbose examples** — trim to minimum lines demonstrating pattern. Replace paragraph explanations with `// comment` in code
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

### Step 0: Detect and Classify

1. Identify target type (skill file / protocol / general doc / raw text)
2. Skill file (`.claude/skills/**/*.md`) → apply Universal Skill-Building Principles after Phase 1

### Step 1: Read and Analyze

1. Read target file completely
2. Record: current line count, rule density (MUST ATTENTION/NEVER/ALWAYS count)
3. List all READ references → classify as `.claude/` (needs inline summary) or `docs/` (skip)
4. Derive the one-sentence **Goal** (what it achieves + ultimate outcome it must cause) from target task/outcomes/guardrails; cite source lines or mark inferred with confidence
5. Derive the **Summary** (2-4 bullets of the key important things + the steps AI must notice) — the read-this-if-nothing-else digest at a different altitude than Workflow/Key Rules; cite source lines or mark inferred with confidence — why: the Summary condenses what matters most, it does not re-list every step/rule
6. Identify: missing Quick Summary, missing Goal, missing Summary, missing Closing Reminders, prose-heavy sections

### Step 2: Caveman Compression Pass

1. Identify all prose paragraphs and bullet descriptions
2. Apply Phase 1 compression rules — remove stop words, keep semantic content
3. Skip code blocks, YAML, tables, SYNC tags, file paths
4. Verify meaning preserved after each paragraph

### Step 3: Create Inline Summaries

For each `.claude/` protocol reference:

1. Read the referenced file
2. Extract 2-3 key rules
3. Write blockquote inline summary
4. Keep MUST ATTENTION READ instruction on next line

### Step 4: Add/Fix Top Section

- Missing Quick Summary → create from file content
- Present but weak → strengthen with Goal, Workflow, Key Rules
- Ensure `**Goal:**` states what the skill achieves AND the ultimate outcome it must cause — a single consolidated line (never split the objective and outcome into two separate lines)
- Ensure `**Summary:**` is present in Quick Summary immediately after the Goal — create if missing, strengthen if weak; it condenses the key important things + the steps AI must notice at a different altitude than Workflow/Key Rules (NEVER a verbatim re-listing of them) — why: the Goal gives the outcome, the Summary gives the read-this-if-nothing-else digest
- Protocol summaries appear before Quick Summary

### Step 5: Add/Fix Bottom Section

- Missing Closing Reminders → add standard section
- Pick rules AI most commonly skips (evidence-based, task creation, pattern search)
- Echo the same Goal near the start of Closing Reminders: `**IMPORTANT MUST ATTENTION Goal:** ...`
- Remove old "IMPORTANT Task Planning Notes" if superseded by Closing Reminders

### Step 6: Verify

| Check               | Pass Condition                                       |
| ------------------- | ---------------------------------------------------- |
| No YAML corruption  | Frontmatter intact                                   |
| No content loss     | All rules, code, paths present                       |
| Rule density        | Post ≥ pre (count MUST ATTENTION/NEVER/ALWAYS)       |
| Goal                | Present in Quick Summary and Closing Reminders       |
| Summary             | Present in Quick Summary (key things + steps digest) |
| Line count          | Reduced (compression worked)                         |
| Formatting          | Blank lines between sections, headers correct        |
| READ classification | `.claude/` → inline summary, `docs/` → skipped       |

---

> **[IMPORTANT]** Use task tracking to break ALL work into small tasks BEFORE starting.

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

<!-- SYNC:universal-skill-building-principles -->

> **Universal Skill-Building Principles** — 10 principles for building AI skills that work across any project type. Source: extracted from review-changes, plan-review, code-review skill rewrites.
>
> **Meta-principle: Teach AI to reason, not to recite.** Skill's job: structure WHEN and HOW AI applies its existing knowledge — not enumerate every possible concern.
>
> 1. **Detect Before Act** — Every skill starts with a classification phase. Detect artifact type (plan type, code category, change nature) before applying any logic. Detection drives: sub-agent selection, which dimensions to emphasize, mandatory vs. optional checks.
>    Anti-pattern: same checklist applied regardless of input type.
> 2. **Derive, Don't Enumerate** — Teach AI HOW to reason about a domain, not WHAT items to tick. Replace "check X, Y, Z" with "understand role → read conventions → derive concerns from first principles → execute with evidence." Fixed checklist = ceiling. Thinking framework = floor.
>    Test: Can this skill run on a Python/Go project without modification? If not → it's enumerating, not teaching.
> 3. **Evidence Gates** — Every claim, finding, recommendation requires `file:line` proof or traced call chain. Confidence thresholds: >80% act freely, 60-80% verify first, <60% DO NOT recommend. "Insufficient evidence" is valid output. Speculation is forbidden output.
> 4. **Fresh Eyes Protocol** — Round 1 in main session. Round 2+ with fresh sub-agent (zero memory of Round 1). Main agent reads report but NEVER filters or overrides findings. Max 3 rounds, then escalate to user. Never declare PASS after Round 1 alone.
>    Why: main agent rationalizes its own mistakes. Zero-memory sub-agent catches what main agent dismissed.
> 5. **Specialize by Type** — Route to specialized sub-agents based on detected artifact type:
>
>     | Artifact type                | Sub-agent               |
>     | ---------------------------- | ----------------------- |
>     | Source code / diffs          | `code-reviewer`         |
>     | Security-sensitive changes   | `security-auditor`      |
>     | Performance-critical changes | `performance-optimizer` |
>     | Plans / docs / specs         | `general-purpose`       |
>
> 6. **Embed Protocols Verbatim, Never Reference** — Shared protocols MUST be copied inline into every sub-agent prompt — never referenced by file path or tag name. AI compliance drops significantly behind file-read indirection. Maintain canonical source; embed body at every call site.
> 7. **Search-Based Discovery** — Never hardcode project-specific paths, formats, or identifiers. Teach skill to discover them:
>     - "Search for `coding-standards`, `style-guide`, `contributing`" not "read `docs/X/code-review-rules.md`"
>     - "Find the project's test format near changed files" not "look for `TC-{FEATURE}-{NNN}` in `docs/specs/`"
>       This is what makes a skill work across any project without modification.
> 8. **Dimensions > Checklists** — Structure review/analysis as named thinking dimensions, each with a `Think:` prompt that forces first-principles reasoning: (1) state dimension's role, (2) derive what could go wrong if weak, (3) apply to artifact with evidence. Produces targeted, evidence-backed findings — not generic "add more detail" suggestions.
>    **Serial attention:** When applying a dimension-based framework, NEVER scan all dimensions simultaneously. One focused pass per dimension. AI misses violations when attention is split across concurrent concerns. Pattern: identify applicable dimensions → sequential focused passes → aggregate.
>    **Threshold invariant:** 3+ similar patterns in any dimension pass = MANDATORY extraction. 2+ violations of same kind = structural/architectural finding, not individual instance.
> 9. **Recursive Quality Loop** — Fix → Re-review → Fix → Re-review. Each round uses a NEW fresh sub-agent. Continue until PASS or 3 rounds max, then escalate. Never declare success after Round 1 alone. Never reuse a sub-agent across rounds.
> 10. **Anti-Rationalization Anchors** — Explicitly name and embed the evasion patterns AI uses to skip steps in the skill's closing reminders:
>
>     | Evasion               | Rebuttal                                                   |
>     | --------------------- | ---------------------------------------------------------- |
>     | "Too simple for this" | Wrong assumptions waste more time. Apply anyway.           |
>     | "Already searched"    | Show `file:line` evidence. No proof = no search.           |
>     | "Just do it"          | Still need task tracking. Skip depth, never skip tracking. |

<!-- /SYNC:universal-skill-building-principles -->

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
> 10. **Affirmative Directives** — Models comply with affirmative directives more reliably than prohibitions; a bare "don't X" leaves the correct action unspecified, so the model substitutes an arbitrary alternative. **Action:** State the action to take, not only the action to avoid. Keep `NEVER`/forbidden guardrails for hard invariants — but pair each with the right path ("Do X" not just "Don't do Y").
> 11. **Rationale-Carrying Instructions** — A rule shipped with its reason generalizes to edge cases the rule never enumerated and survives compression; a bare imperative gets misapplied or silently dropped. **Action:** Append a terse `— why: …` clause to every non-obvious rule. The reason names the failure prevented or outcome wanted — never restates the rule.

<!-- /SYNC:context-engineering-principles -->

<!-- SYNC:prompt-enhancement-transforms-base -->

> **Prompt Enhancement Transforms (Base)** — Transforms 1-3 are identical across all `$prompt-enhance` ops (`--op=compress|expand|enhance`). Transform 4 is per-op (conciseness pass for compress/enhance; structural clarity pass for expand) and stays local to each op branch.
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
> - `docs/project-reference/` files → NO inline summary (project-specific). Add: `(Claude may inject this via hooks; Codex must open this file directly using docs-index routing)`
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
> **Goal:** [One sentence — what this skill achieves AND the ultimate outcome it must cause]
>
> **Summary:** [2-4 bullets/sentences — the key important things + the steps AI must notice; the read-this-if-nothing-else digest, distinct altitude from the enumerated Workflow/Key Rules below]
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
> **IMPORTANT MUST ATTENTION Goal:** [same goal as Quick Summary]
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

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> **Re-read files after context changes.** Context compaction, resume, or long-running work can make memory stale; verify current files before acting.
> **Verify generated content against source evidence.** AI hallucinates APIs, names, claims, and document facts. Check the relevant source before documenting or referencing.
> **Check downstream references before deleting or renaming.** Removing an artifact can stale docs, generated mirrors, configs, and callers; map references first.
> **Trace the full impact chain after edits.** Changing a definition can miss derived outputs and consumers. Follow the affected chain before declaring done.
> **Verify ALL affected outputs, not just the first.** One green check is not all green checks; validate every output surface the change can affect.
> **Assume existing values are intentional — ask WHY before changing.** Before changing a constant, limit, flag, wording, or pattern, read nearby context and history.
> **Surface ambiguity before acting — don't pick silently.** Multiple valid interpretations require an explicit question or stated assumption with risk.
> **Keep shared guidance role-relevant.** Universal guidance must help every receiving skill or agent; code-specific obligations belong only in code-specific protocols.

<!-- /SYNC:ai-mistake-prevention -->

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical + sequential thinking — every claim needs appropriate traced evidence (`file:line` for repo/code claims; source URL or artifact section for research, product, content, and docs claims); confidence >80% to act, <60% DO NOT recommend. Anti-hallucination: never present guess as fact, admit uncertainty freely, cross-reference independently, stay skeptical of own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — verify generated content against evidence, trace downstream references before deleting or renaming, verify all affected outputs, re-read files after context loss, and surface ambiguity before acting.

<!-- /SYNC:ai-mistake-prevention:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Two-phase optimization (caveman compression + attention anchoring) that produces a prompt/skill stating its objective and ultimate outcome (one consolidated Goal) anchored top and bottom, so AI optimizes for the right result.

**IMPORTANT MUST ATTENTION Protocols in force (concise digest of the SYNC/shared blocks this skill carries — each is a signpost to its canonical body above):**

- **Output Quality:** MUST ATTENTION no inventories/trees/TOCs; lead with answer; sacrifice grammar for concision.
- **Universal Skill-Building:** MUST ATTENTION detect-before-act, derive-don't-enumerate, evidence gates, fresh-eyes, embed protocols verbatim.
- **Context Engineering:** MUST ATTENTION primacy-recency, high-signal density, compress aggressively, affirmative directives.
- **Prompt Enhancement Transforms:** MUST ATTENTION inline READ summaries, top Quick-Summary, bottom Closing-Reminders (Transforms 1-3 base).
- **Shared Protocol Duplication Policy:** NEVER extract SYNC duplication to references — edit canonical first; inline is intentional.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Critical Thinking:** MUST ATTENTION traced `file:line` proof per claim; confidence >80% to act; NEVER guess.

**IMPORTANT MUST ATTENTION** select `--op` FIRST (default `enhance`) — `compress`/`enhance` apply caveman compression FIRST (Phase 1) before structural enhancement (never skip); `expand` applies Language Expansion (inverse) instead — why: expand reconstructs, it does not strip
**IMPORTANT MUST ATTENTION** NEVER compress code blocks, YAML frontmatter, structured tables, or SYNC tags
**IMPORTANT MUST ATTENTION** read target file completely before any changes
**IMPORTANT MUST ATTENTION** derive the target's one-sentence Goal (what it achieves + ultimate outcome), then place it in both `## Quick Summary` and `## Closing Reminders` — why: AI must know the ultimate outcome after enhancement
**IMPORTANT MUST ATTENTION** enhance derives BOTH the target's Goal AND its Summary (key important things + steps AI must notice) and places both in `## Quick Summary`, the Summary at a different altitude than Workflow/Key Rules — why: the Goal tells AI the outcome to optimize for; the Summary tells AI the key things/steps to notice up front
**IMPORTANT MUST ATTENTION** skill AND sub-agent (`.claude/agents/*.md`) targets share ONE required structure — Goal + Summary in `## Quick Summary`, Goal echoed in `## Closing Reminders` — so creator skills (e.g. `custom-agent`) emit a consistent shape; when enhancing an agent NEVER alter `<!-- SYNC:... -->` blocks or delete `## Role`/`## Workflow`/`## Key Rules`/`## Output` — why: SYNC copies are canonical-synced and divergence fails the build
**IMPORTANT MUST ATTENTION** read each referenced protocol file to write accurate inline summaries — NEVER guess content
**IMPORTANT MUST ATTENTION** apply primacy-recency anchoring — 3 critical rules in first 5 AND last 5 lines of every enhanced file
**IMPORTANT MUST ATTENTION** verify rule density: count MUST ATTENTION/NEVER/ALWAYS before and after — post ≥ pre
**IMPORTANT MUST ATTENTION** state the action to take, not only what to avoid — pair every `NEVER` with the right path, and append a terse `— why:` to each non-obvious rule — why: affirmative directives + carried rationale are followed more reliably and survive compression (principles #10/#11)
**IMPORTANT MUST ATTENTION** add inline summaries only for `.claude/` protocol files, not project-specific `docs/` files
**IMPORTANT MUST ATTENTION** keep all meaningful content — only restructure/compress, NEVER delete rules or code examples
**IMPORTANT MUST ATTENTION** verify no YAML frontmatter corruption after changes
**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act). NEVER speculate without proof.
**IMPORTANT MUST ATTENTION** READ `CLAUDE.md` before starting

**Anti-Rationalization:**

| Evasion                                 | Rebuttal                                                                  |
| --------------------------------------- | ------------------------------------------------------------------------- |
| "File is short, skip compression"       | Apply both phases anyway — density matters at any length                  |
| "Already read the file"                 | Show recorded line count + rule density as proof                          |
| "Closing reminders already exist"       | Verify they echo top-section rules AND include anti-rationalization table |
| "Skill file, skip Universal Principles" | NEVER skip — Phase 0 detection is BLOCKING                                |

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using task tracking.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:START -->

## Hookless Prompt Protocol Mirror (Auto-Synced)

Source: `.claude/.ck.json` + `.claude/skills/shared/sync-inline-versions.md` (`:full` blocks) + `.claude/scripts/lib/hookless-prompt-protocol.cjs`

## [WORKFLOW-EXECUTION-PROTOCOL] [BLOCKING] Workflow Execution Protocol — MANDATORY IMPORTANT MUST CRITICAL. Do not skip for any reason.

**Generic portability boundary:** Reusable skills and protocol text stay project-neutral; project-specific conventions are discovered from docs/project-config.json and docs/project-reference/. Apply shared AI-SDD from `shared/sdd-artifact-contract.md`. Read `docs/project-config.json` and `docs/project-reference/docs-index-reference.md`, then open the project reference docs named there. For spec, test-case, behavior-change, public-contract, or `docs/specs/` work, route through the local spec docs named by the docs index: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`, and `workflow-spec-test-code-cycle-reference.md` when specs/tests/code must stay synchronized. If either file or a required reference doc is missing or stale, auto-run `$project-init` (or the narrow lower-level route such as `$project-config`, `$docs-init`, `$scan-all`, or `$scan --target=<key>`) before ordinary project-specific work. Any supported AI tool may execute when this shared context and local docs are available.

1. **DETECT:** If the prompt starts with an explicit slash skill/workflow command, execute it directly. Otherwise match the prompt against the workflow catalog and skill list.
2. **ANALYZE:** Choose the best option: execute directly, invoke a skill, activate a standard workflow, or compose a custom step combination.
3. **AUTO-SELECT:** Pick the best option yourself. Do not ask the user to choose between direct execution, skill, standard workflow, or custom workflow.
4. **ACTIVATE:** For a selected workflow, call `$start-workflow <workflowId>`; for a selected skill, invoke that skill; for a custom workflow, sequence custom steps directly; for direct execution, proceed with the task.
5. **CREATE TASKS:** task tracking for ALL workflow/skill/custom steps before execution when the selected path has multiple steps.
6. **EXECUTE:** Advance per the **Workflow Step Advancement & Parallel Phases** rule in your context instructions — model-driven; a sub-agent completion advances a step identically to an inline call; a parallel-phase group is an all-return barrier (advance only after ALL members return, never serialize it)

## Shared AI-SDD Protocol Markers

Source: `.claude/skills/shared/sync-inline-versions.md`

## SYNC:ai-sdd-artifact-contract

> **AI-SDD Artifact Contract** — Shared spec-driven development rules stay portable and source-owned.
>
> 1. Keep reusable AI-SDD principles in `.claude`; put repository-specific paths, commands, owners, products, and formats in project config/reference docs.
> 2. Preserve cycle: `spec -> plan -> tasks -> implement -> verify -> update spec/docs`.
> 3. Trace every requirement or invariant through decision, task, TC/test, source evidence, and docs/spec update.
> 4. Treat code-to-spec extraction as reference-only until accepted by the canonical spec owner.
> 5. Any supported AI tool may plan, implement, review, or verify with synced context; using multiple tools is optional.
> 6. Update `.claude` source first, then sync generated mirrors; do not manually edit `.agents`, `.codex`, or `AGENTS.md`. — why: mirrors are generated artifacts; hand-edits are overwritten on the next sync
> 7. If `docs/project-config.json`, root instruction files, or a required project-reference doc is missing or stale, auto-run `$project-init` or the narrow lower-level route before ordinary project-specific work.
>
> **Active reference:** `shared/sdd-artifact-contract.md` in the active skills root.

---

## SYNC:ai-sdd-artifact-contract:reminder

- **MANDATORY** Apply `shared/sdd-artifact-contract.md`; keep reusable AI-SDD in `.claude` and local rules in project docs.
- **MANDATORY** Code-to-spec extraction is reference-only until canonical acceptance; any supported AI tool may execute with synced context.
- **MANDATORY** Update `.claude` source before syncing generated mirrors; do not manually edit `.agents`, `.codex`, or `AGENTS.md`.
- **MANDATORY** Missing or stale project config, root instruction files, or required reference docs route project-specific work through `$project-init` or the narrow setup route automatically.
  **[TASK-PLANNING] [MANDATORY]** BEFORE executing any workflow or skill step, create/update task tracking for all planned steps, then keep it synchronized as each step starts/completes.

## [LESSON-LEARNED-REMINDER] [BLOCKING] Task Planning & Continuous Improvement — MANDATORY. Do not skip.

Break work into small tasks (task tracking) before starting. Add final task: "Analyze AI mistakes & lessons learned".

**Extract lessons — ROOT CAUSE ONLY, not symptom fixes:**

1. Name the FAILURE MODE (reasoning/assumption failure), not symptom — "assumed API existed without reading source" not "used wrong enum value".
2. Generality test: does this failure mode apply to ≥3 contexts/codebases? If not, abstract one level up.
3. Write as a universal rule — strip project-specific names/paths/classes. Useful on any codebase.
4. Consolidate: multiple mistakes sharing one failure mode → ONE lesson.
5. **Recurrence gate:** "Would this recur in future session WITHOUT this reminder?" — No → skip `$learn`.
6. **Auto-fix gate:** "Could `$code-review`/`$code-simplifier`/`$security-review`/`$lint` catch this?" — Yes → improve review skill instead.
7. BOTH gates pass → ask user to run `$learn`.
   **[CRITICAL-THINKING-MINDSET]** Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
   **Anti-hallucination principle:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.
   **AI Attention principle (Primacy-Recency):** Put the 3 most critical rules at both top and bottom of long prompts/protocols so instruction adherence survives long context windows.
   **Goal-driven execution:** Define success criteria first, loop until verified, and stop only when observable checks pass.
   **Tests verify intent:** Tests must protect business rules/invariants and fail when the protected intent breaks, not only mirror current behavior.

## Common AI Mistake Prevention (System Lessons)

- **Re-read files after context compaction.** Edit requires prior Read in same context; compaction wipes read state. Re-read before editing.
- **Grep for old terms after bulk replacements.** AI over-trusts find/replace completeness. Grep full repo after bulk edits for missed refs in docs/configs/catalogs.
- **Check downstream references before deleting.** Deletions cascade doc/code staleness. Map referencing files before removal.
- **After memory loss, check existing state before creating new.** Compaction wipes prior-work memory. Query current state to resume — never blindly duplicate.
- **Verify AI-generated content against actual code.** AI hallucinates APIs, class names, method signatures. Grep to confirm existence before documenting/referencing.
- **Trace full dependency chain after edits.** Changing a definition misses downstream consumers. Trace the full chain.
- **When renaming, grep ALL consumer file types.** Some file types silently ignore missing refs (no compile error). Search code, templates, configs, generated files.
- **Trace ALL code paths when verifying correctness.** Code existing ≠ code executing. Trace early exits, error branches, conditional skips — not just happy path.
- **Update docs that embed canonical data when source changes.** Docs inlining derived data (workflows, schemas, configs) go stale silently. Update all embedding docs alongside source.
- **Verify sub-agent results after context recovery.** Background agents may finish while parent compacted — grep-verify output, don't trust assumed completion.
- **Cross-check full target list against sub-agent assignments.** Parallel sub-agents by category miss boundary items. Reconcile union of assignments against target list before proceeding.
- **Sub-agents inherit knowledge only from their agent .md definition — use custom agent types, not built-in Explore.** Tool adoption = permission + knowledge + enforcement (numbered workflow step).
- **Persist sub-agent findings incrementally, not as a final batch.** Long sub-agents hit cutoffs before final write — findings lost. Instruct append-per-section to report file.
- **When debugging, ask "whose responsibility?" before fixing.** Trace caller (wrong data) vs callee (wrong handling). Fix at responsible layer — never patch symptom site.
- **Grep ALL removed names after extraction/refactoring.** Primary file "done" ≠ secondary files clean. Grep entire scope for every removed symbol before declaring complete.
- **Assume existing values are intentional — ask WHY before changing.** Pattern-matching as "wrong" skips context. Before changing any constant/limit/flag: read comments, git blame, surrounding code.
- **Verify ALL affected outputs, not just the first.** One build green ≠ all green. Multi-stack changes (backend/frontend/tests/docs) require verifying EVERY output.
- **Evaluate fit before copying a nearby pattern.** Closest example ≠ matching preconditions — verify the new context shares the same constraints, base classes, scope, lifetime.
- **Holistic-first debugging — resist nearest-attention trap.** Don't dive into first plausible cause. List EVERY precondition (config, env vars, paths, DB, endpoints, creds, versions, DI, data). Verify each against evidence (grep/query — not reasoning). Ask "what would falsify this?" — if nothing, it's not a hypothesis. Most expensive failure: going deeper in "obvious" layer while bug sits in layer never questioned.
- **Surgical changes — apply the diff test (context-aware).** Two modes: (1) Bug fix → every line traces to the bug; no restyling; orphan cleanup only for imports YOUR changes made unused. (2) Review/enhancement → implement improvements AND announce as "Enhancement beyond main request: [what]". Never silently scope-creep. Diff test: "Would this line exist if I wasn't asked to do X?" — if no, delete or announce.
- **Surface ambiguity before coding — don't pick silently.** Multiple valid interpretations → present each with effort: "[Request] could mean (1) [N h], (2) [N h]. Which matters?" List scope/format/volume/constraints assumptions first. If simpler path exists, say so. Never silently pick.
- **[MANDATORY FIRST ACTION] ALWAYS activate a suitable skill or workflow BEFORE responding.** Match task against workflow catalog + skill list; invoke via skill invocation or `$start-workflow <workflowId>`. NEVER answer or write code before checking. Skip = protocol violation.
- **Why-Review adversarial mindset — apply when reviewing any plan, decision, or design.** Default SKEPTIC not VALIDATOR: steel-man a rejected alternative, invert each stated reason ("what does it sacrifice?"), stress-test top 2-3 assumptions, run pre-mortem ("ships, fails in 3 months — what breaks?"), surface 1-2 alternatives author missed. Section presence ≠ quality; quality = causal reasoning + concrete mitigations + evidence, not "it's better" or "monitor closely".
- **Front-load report-write in sub-agent prompts for large reviews.** Many-file sub-agents hit budget before final write — findings lost. Design prompts so: (1) report-write is first explicit deliverable, (2) append per-file/section (not batched), (3) scope bounded so reads don't exhaust budget. Truncated mid-sentence with no report file → spawn narrower scope, don't retry same prompt.
- **After context compaction, re-verify all prior phase outcomes before continuing.** Summaries describe intent, not environment state (git index, filesystem, processes). On resume, FIRST audit: git status, re-read modified files, verify filesystem. Every "completed" claim is an untested hypothesis until evidence confirms.
- **OOM/memory: check row count before row size.** Triage: (1) Unbounded query — no DB filter for trigger? Push filter to DB; eliminates OOM. (2) Large rows? Projection reduces proportionally. Row reduction > projection in ROI.
- **Keep domain concepts out of generic/shared/infrastructure layers.** Reusable layer (shared library, framework, infra module) must reference NO consumer-specific domain concept — tenant/customer/product IDs, business entities, feature rules. Leak compiles + runs → passes review silently while coupling the "reusable" layer to one consumer. Keep shared type domain-free; push domain fields/logic down into the consumer via subclass/composition. — why: a layer coupled to one consumer's domain is no longer reusable.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:END -->
