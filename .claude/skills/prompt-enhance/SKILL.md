---
name: prompt-enhance
version: 3.6.0
description: '[Skill Management] Use when enhancing, compressing or expanding prompts, docs or skills. --op={compress|expand|enhance}.'
---

## Quick Summary

**Goal:** Improve readable, actionable instructions with preserved meaning. Agent guides use the shared content-value branch; other targets use two-phase optimization — (1) Caveman Compression strips stop words + grammatical scaffolding while preserving semantic meaning; (2) Prompt Enhancement applies AI attention anchoring to make priorities and routing easier to find — producing a prompt/skill that states its objective and ultimate outcome (one consolidated Goal) in both top summary and bottom reminders so AI optimizes for the right result.

**Summary:**

- Classify output ownership FIRST. Agent guides use the content-value/retention branch; other targets compress prose then attention-anchor structure.
- Enhance derives BOTH a **Goal** (the outcome to optimize for) AND a **Summary** (key things + steps to notice) for the target, and places both in its Quick Summary.
- **Anti-forget rule (task/purpose targets):** when the target performs a task or has a purpose, the Summary AND Closing Reminders MUST carry the goal + purpose + ALL important main steps/tasks (compact enumeration) — why: this framework repeats a compact route at the entry and exit; anchors aid navigation but do not guarantee compliance.
- Preserve meaningful rules and consumer-required code/YAML/tables/tags; agent-guide removals require semantic dispositions, not blanket example retention.
- Route on `--op` (default `enhance`): `compress` = token-strip only, `expand` = reconstruct compressed text.
- For skill enhancement, preserve direct reference discovery, control by consequence, bounded feedback, dependency setup and model evaluation; use the authoring-quality reference below.

**Workflow:**

1. **Detect** — Resolve output identity/ownership. Agent guides take the Agent-Guide Branch and return; classify other targets as skill, sub-agent, protocol or general prompt
2. **Read** — Read target file completely
3. **Goal + Summary** — Derive the target's one-sentence Goal (what it achieves + the ultimate outcome it must cause) AND its Summary (2-4 bullets of the key important things + the steps AI must notice) from the target's task, constraints, and success criteria
4. **Compress** — Apply caveman compression (Phase 1)
5. **Enhance** — Apply AI attention anchoring transforms (Phase 2)
6. **Verify** — Semantic retention, readable guidance and Goal anchored top and bottom

**Key Rules:**

- **Operation flag** (see [Operation Mode](#operation-mode---op)): `--op=enhance` (default) = compress + anchor + skill-principles; `--op=compress` = token-strip only; `--op=expand` = reconstruct compressed text into fluent form (inverse Phase 1 + structural Transform 4)
- For general prompts, compress before structural enhancement. Agent guides use their dedicated branch instead.
- Preserve meaningful rules/constraints and verified evidence; agent guides may disposition redundant examples or outside-purpose evidence to reports.
- MUST ATTENTION derive the target's Goal and add it to both `## Quick Summary` and `## Closing Reminders`
- MUST ATTENTION derive the target's Summary (key important things + steps AI must notice) and place it in `## Quick Summary` immediately after the Goal — a condensing digest at a different altitude than Workflow/Key Rules, NEVER a verbatim re-listing of them
- MUST ATTENTION when the target performs a task or has a purpose, the Summary AND `## Closing Reminders` MUST enumerate the goal + purpose + ALL important main steps/tasks as a compact list — why: compact entry and exit routes make required steps visible without duplicating their detailed procedures (compact enumeration ≠ the verbose Workflow prose, so the altitude stays distinct)
- MUST ATTENTION skill AND sub-agent (`.claude/agents/*.md`) targets require the SAME Goal + Summary + Closing-Reminders structure (see [When Target is a Sub-Agent File](#when-target-is-a-sub-agent-file)) — anchored top and bottom; NEVER alter SYNC blocks when enhancing an agent
- Verify retained rules, exceptions and preconditions by semantic disposition; warning-keyword counts are not a quality gate
- Caveman compression applies to prose only — NEVER compress code blocks, YAML, or structured tables
- Prompt quality > token count, but verbose prompts degrade quality — optimize clarity-per-token

---

## Contents

- [Quick Summary](#quick-summary)
- [Target File](#target-file)
- [Operation Mode (`--op=`)](#operation-mode---op)
- [Agent-Guide Branch (before general transforms)](#agent-guide-branch-before-general-transforms)
- [Phase 0: Detect Target Type](#phase-0-detect-target-type)
- [When Target is a Skill File](#when-target-is-a-skill-file)
- [When Target is a Sub-Agent File](#when-target-is-a-sub-agent-file)
- [Phase 1: Caveman Compression](#phase-1-caveman-compression)
- [Phase 2: Prompt Enhancement](#phase-2-prompt-enhancement)
- [Process](#process)
- [Closing Reminders](#closing-reminders)

## Target File

Compress and enhance this file:
<target>$ARGUMENTS</target>

No file? Ask via `ask user question tool`. Text passed (not file path)? Apply caveman compression directly and output result.

---

## Operation Mode (`--op=`)

Route on `--op` (default `enhance`). Transforms 1-3 (inline summaries, top summary, closing reminders — the shared SYNC base block below) are identical across all ops; only Phase 1 and Transform 4 differ:

| `--op`                | Phase 1                                        | Transform 4            | Skill-principles + Goal           | Former skill       |
| --------------------- | ---------------------------------------------- | ---------------------- | -------------------------------- | ------------------ |
| `enhance` *(default)* | Caveman Compression                            | Conciseness pass       | Applied (skill files)            | host               |
| `compress`            | Caveman Compression                            | Conciseness pass       | Skipped (pure token strip)       | `/prompt-compress` |
| `expand`              | **Language Expansion** (inverse — branch below) | **Structural Clarity** | Skipped                          | `/prompt-expand`   |

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

Verify (expand): no semantic loss (all facts/numbers/paths present), semantic retention verified, no telegraphic 2-5 word prose sentences remain, code blocks untouched.

---

## Agent-Guide Branch (before general transforms)

When the target output is root context, a project-reference guide/template, docs index or prompt/protocol registry, use the branch below. Classify by resolved output identity and ownership, not the scratch candidate filename. Curated lessons/audits keep their owner contract and require authorized scope.

For these targets, use this branch instead of caveman compression, blanket example/table preservation or generic skill scaffolding:

For persistent instruction files (`CLAUDE.md`, `AGENTS.md` or host equivalents), apply the **Instruction-file audit** in `.claude/skills/shared/protocols/context-engineering-principles.md` during final verification for every operation; preserve generated ownership.

1. Read/save the baseline and inventory meaningful rules, protocols, exceptions, rationale, discovery and parser structures.
2. Remove low-value repetition/report material by explicit disposition. Keep clear sentences and necessary conditions; retain action-governing numbers and a useful short example. Preserve consumer-required data/syntax.
3. Make purpose/read-when and critical rules easy to find, with brief closing reminders when useful. Do not duplicate substantive protocols into summaries or invent missing implementation examples.
4. Verify sources and triggered discovery, then review final semantic dispositions against the baseline after all transforms. Reject both report bulk and lost exceptions; no word, warning or example quota proves quality.
   Apply the shared output-quality long-file navigation check here, before this branch returns, for every operation.
5. Before applying, use the owning writer's baseline and freshness rules. Editorial enhancement alone does not claim a full scan or refresh its ledger.

Return this review to the caller; a scan candidate remains unapplied until its final gate. Other target types use the general transforms below.

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

> **Skill authoring quality** — Keep required references discoverable, match control to consequence, and verify outputs through bounded feedback with explicit dependencies and model evidence. Read `.claude/skills/skill-creator/references/authoring-quality.md` when enhancing a skill or its bundled references; it owns the detailed acceptance checks. This is a reference read, not an invocation of the command-only creator skill.

Apply that gate to `--op=enhance`. For `compress` or `expand`, preserve these contracts without adding new procedures. Inventory referenced resources before moving text; edit companion resources only within the requested scope and report needed changes outside it. Treat a preview as discovery, then read required content. Preserve tested model claims separately from intended support; record unavailable comparisons as `NOT RUN`.

Read `.claude/skills/skill-creator/references/schema-reference.md` when changing headers or model metadata; it owns accepted fields and distinguishes runtime model selection from compatibility evidence.

**Risk-profile gate (blocking):** Enhancement preserves the target skill's job,
input/output, mutation authority, delegation boundary, and terminal states.
Classify the target as `content`, `analysis`, `conversion`, `implementation`,
`orchestration`, or `security/authority` before applying the checklist. Fresh
agent review, specialist routing, inline sub-agent protocols, and recursive
loops are mandatory only for `implementation`, `orchestration`, or
`security/authority` targets (or when the target already owns an equivalent
gate). For `content`, `analysis`, and `conversion` skills, record those rows as
`N/A — not required by the target contract`; never add review machinery merely
because this enhancer can add it. A change that widens mutation or delegation
authority must be surfaced as a contract change, not silently introduced.

### Skill Enhancement Checklist

After caveman compression, evaluate skill against each principle, add missing structure:

| Principle                    | Check                                    | Action if missing                                      |
| ---------------------------- | ---------------------------------------- | ------------------------------------------------------ |
| Detect Before Act            | Phase 0 / classification step present?   | Add artifact-type detection before Phase 1             |
| Derive, Don't Enumerate      | Are choices flexible while dependent gates stay ordered? | Use decision criteria for variable work; preserve required sequences and progress checklists |
| Evidence Gates               | Every claim requires `file:line`?        | Add evidence requirement to all review steps           |
| Fresh Eyes Protocol          | Required by risk profile and target contract? | Add Round 2 fresh sub-agent protocol only when required; otherwise record N/A |
| Specialize by Type           | Required by risk profile and target contract? | Add specialist routing only when required; otherwise record N/A |
| Embed Protocols Verbatim     | A sub-agent prompt is actually emitted? | Inline the needed protocol body at that call site; do not add delegation to a non-delegating target |
| Search-Based Discovery       | Any hardcoded paths/formats/IDs?         | Replace with search instructions                       |
| Dimensions > Checklists      | Is analysis flexible and execution progress observable? | Use dimensions for analysis; retain checklists that protect dependencies and exit conditions |
| Recursive Quality Loop       | Required by risk profile and target contract? | Add the bounded loop only when required; otherwise record N/A and preserve the target's terminal state |
| Anti-Rationalization Anchors | Closing reminders include evasion table? | Add evasion → rebuttal table                           |

### Anti-Forget Anchoring (task/purpose targets)

For task/purpose targets (skills, sub-agents and task prompts), this framework requires compact entry and exit routes. Position effects vary by model and task; these anchors are a navigation convention, not a guaranteed performance improvement:

| Anchor                          | Must carry                                                                                                      |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `## Quick Summary` → `**Summary:**` | Goal + purpose + **ALL important main steps/tasks** as a compact ordered enumeration (one short phrase each)   |
| `## Closing Reminders`          | Goal echo + a `MUST ATTENTION` line re-listing the same main steps/tasks in order                              |

- MUST ATTENTION enumerate EVERY important main step/task — completeness beats brevity here; a step omitted from both anchors is harder to find — why: both anchors must expose the complete route; their presence does not guarantee that a model follows it.
- The compact enumeration is a DIFFERENT altitude than the verbose `## Workflow`/body — short phrases, not full prose — so it complements (never replaces) the detailed steps below.
- Surface conditional routing too (modes, `--flags`, gates) so the AI doesn't forget a whole branch — why: a forgotten mode silently runs the wrong path.

---

## When Target is a Sub-Agent File

Target `.claude/agents/*.md` (a custom sub-agent definition — the shape a creator skill like `custom-agent` emits)? Apply the **Sub-Agent Required Structure** AFTER caveman compression, BEFORE writing enhanced output. Same Goal + Summary + Closing-Reminders contract as a skill file — anchored top and bottom so the isolated, zero-history sub-agent optimizes for the right outcome — mapped onto the agent body (`## Role → ## Workflow → ## Key Rules → ## Output`).

### Sub-Agent Required Structure

| Block                          | Location                                              | Requirement                                                                                                                              |
| ------------------------------ | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `## Quick Summary`             | first section after frontmatter                      | Present — holds Goal + Summary + Workflow + Key Rules                                                                                     |
| `**Goal:**`                    | inside Quick Summary                                 | One consolidated sentence — what the agent achieves AND the ultimate outcome it must cause                                                |
| `**Summary:**`                 | inside Quick Summary, immediately after Goal         | 2-4 bullets — the read-this-if-nothing-else digest (key things + steps to notice); distinct altitude from Workflow/Key Rules, NEVER a verbatim re-listing |
| `**Workflow:**` / `**Key Rules:**` | inside Quick Summary                             | Keep existing                                                                                                                             |
| `## Closing Reminders`         | end of file, after the `:reminder` SYNC blocks       | Present — first line `**IMPORTANT MUST ATTENTION Goal:**` echoes the same Goal                                                            |

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

Prompt quality FIRST. Remove low-value prose while preserving readable conditions. Optimize **clarity-per-token**; fewer tokens alone do not prove better performance.

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

- **Decision value** — what correct action depends on each section
- **Retention** — meaningful items retained, consolidated, replaced by discovery or removed with a reason
- **Risk** — what breaks if cut too aggressively (e.g., AI misses a pattern)

---

## Process

### Step 0: Detect and Classify

1. Identify target type (skill file / protocol / general doc / raw text)
2. Skill file (`.claude/skills/**/*.md`) → apply Universal Skill-Building Principles after Phase 1

### Step 1: Read and Analyze

1. Read target file completely
2. Record meaningful rules, exceptions, preconditions, navigation and parser structures for disposition review
3. List all READ references → classify as `.claude/` (needs inline summary) or `docs/` (skip)
4. Derive the one-sentence **Goal** (what it achieves + ultimate outcome it must cause) from target task/outcomes/guardrails; cite source lines or mark inferred with confidence
5. Derive the **Summary** (2-4 bullets of the key important things + the steps AI must notice) — the read-this-if-nothing-else digest at a different altitude than Workflow/Key Rules; cite source lines or mark inferred with confidence — why: the Summary condenses what matters most, it does not re-list every step/rule
   - If the target performs a task or has a purpose, the Summary MUST also enumerate ALL important main steps/tasks (compact ordered list) + any modes/flags/gates — why: steps buried in the long middle get forgotten; the Summary anchor re-surfaces every one
6. Identify: missing Quick Summary, missing Goal, missing Summary, missing main-step enumeration (task targets), missing Closing Reminders, prose-heavy sections

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
- For task/purpose targets, ensure the Summary enumerates ALL important main steps/tasks (compact ordered list) + modes/flags/gates — why: complete anchors expose the required route
- Protocol summaries appear before Quick Summary

### Step 5: Add/Fix Bottom Section

- Missing Closing Reminders → add standard section
- Pick rules AI most commonly skips (evidence-based, task creation, pattern search)
- Echo the same Goal near the start of Closing Reminders: `**IMPORTANT MUST ATTENTION Goal:** ...`
- For task/purpose targets, add a `MUST ATTENTION` line re-listing ALL important main steps/tasks in order — why: the bottom anchor re-surfaces every step after the long middle, matching the top Summary
- Remove old "IMPORTANT Task Planning Notes" if superseded by Closing Reminders

### Step 6: Verify

| Check               | Pass Condition                                 |
| ------------------- | ---------------------------------------------- |
| No YAML corruption  | Frontmatter intact                             |
| No content loss     | All rules, code, paths present                 |
| Semantic retention | Dispositions preserve action-changing rules, exceptions and reliable discovery |
| Goal                | Present in Quick Summary and Closing Reminders |
| Summary             | Present in Quick Summary (key things + steps digest) |
| Main steps anchored | Task/purpose target → ALL main steps/tasks enumerated in BOTH Summary and Closing Reminders |
| Readability         | Clear priorities and conditions; no report bulk packed into dense prose |
| Formatting          | Blank lines between sections, headers correct  |
| Navigation          | Shared output-quality contents check passes on the final file for every operation; preserve stricter skill-owner rules |
| READ classification | `.claude/` → inline summary, `docs/` → skipped |
| Skill authoring quality | Enhance → authoring-quality gate recorded; compress/expand → discovery, freedom, checks, dependencies and compatibility retained. Unrun behavioral/model comparisons remain `NOT RUN` |

---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting.

<!-- LOCAL:universal-skill-building-principles -->

> **Universal Skill-Building Principles** — 10 principles for building AI skills that work across any project type. Source: extracted from changes-review, plan --mode=review, code-quality-review skill rewrites.
>
> **Meta-principle: Teach AI to reason, not to recite.** Skill's job: structure WHEN and HOW AI applies its existing knowledge — not enumerate every possible concern.
>
> 1. **Detect Before Act** — Every skill starts with a classification phase. Detect artifact type (plan type, code category, change nature) before applying any logic. Detection drives: sub-agent selection, which dimensions to emphasize, mandatory vs. optional checks.
>    Anti-pattern: same checklist applied regardless of input type.
> 2. **Derive, Don't Enumerate** — Teach decision criteria for variable analysis: understand role → read conventions → derive concerns → execute with evidence. Preserve ordered gates and progress checklists when they protect dependencies or completion conditions; one skill may mix flexible analysis and strict execution.
>    Test: Can this skill run on a Python/Go project without modification? If not → it's enumerating, not teaching.
> 3. **Evidence Gates** — Every claim, finding, recommendation requires `file:line` proof or traced call chain. Confidence thresholds: >80% act freely, 60-80% verify first, <60% DO NOT recommend. "Insufficient evidence" is valid output. Speculation is forbidden output.
> 4. **Fresh Eyes Protocol** — For implementation, orchestration, and security/authority targets, Round 1 is in the main session and Round 2 uses a fresh sub-agent (zero memory of Round 1); the main agent reads the report but NEVER filters or overrides findings. Max 3 review rounds; use a fresh sub-agent for any further round, then escalate to the user if blockers remain. For content, analysis, and conversion targets, apply only when the target contract explicitly requires an independent review; otherwise record N/A and preserve the target's simpler terminal state.
>    Why: main agent rationalizes its own mistakes. Zero-memory sub-agent catches what main agent dismissed.
> 5. **Specialize by Type** — When the risk profile requires delegation, route to specialized sub-agents based on detected artifact type:
>
>     | Artifact type                | Sub-agent               |
>     | ---------------------------- | ----------------------- |
>     | Source code / diffs          | `code-reviewer`         |
>     | Security-sensitive changes   | `security-auditor`      |
>     | Performance-critical changes | `performance-optimizer` |
>     | Plans / docs / specs         | `general-purpose`       |
>
> 6. **Embed Protocols Verbatim, Never Reference** — When a target actually emits a sub-agent prompt, shared protocols MUST be copied inline into that prompt — never referenced by file path or tag name. Do not create a sub-agent prompt merely to satisfy this principle. Maintain canonical source; embed the needed body at each real call site.
> 7. **Search-Based Discovery** — Never hardcode project-specific paths, formats, or identifiers. Teach skill to discover them:
>     - "Search for `coding-standards`, `style-guide`, `contributing`" not "read `docs/X/code-review-rules.md`"
>     - "Find the project's test format near changed files" not "look for `TC-{FEATURE}-{NNN}` in the business spec root (default `docs/specs`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path)"
>       This is what makes a skill work across any project without modification.
> 8. **Dimensions > Checklists** — Structure variable review/analysis as named thinking dimensions: (1) state the dimension's role, (2) derive what could go wrong, (3) apply with evidence. Retain execution checklists for dependencies and exit conditions; mark completion only after checks pass.
>    **Serial attention:** When applying a dimension-based framework, NEVER scan all dimensions simultaneously. One focused pass per dimension. AI misses violations when attention is split across concurrent concerns. Pattern: identify applicable dimensions → sequential focused passes → aggregate.
>    **Ownership gate:** repetition prompts investigation, never automatic extraction or a severity quota. Share behavior only when consumers, invariants and reasons to change align and indirection lowers future change cost. Group evidenced violations when they share one cause; name the consequence.
> 9. **Recursive Quality Loop** — For targets whose contract includes review/fix convergence, use Fix → Re-review; each round uses a NEW fresh sub-agent and stops at 2 rounds with escalation. For other targets, do not invent a loop: preserve their declared terminal state and record this principle as N/A.
> 10. **Anti-Rationalization Anchors** — Explicitly name and embed the evasion patterns AI uses to skip steps in the skill's closing reminders:
>
>     | Evasion               | Rebuttal                                                   |
>     | --------------------- | ---------------------------------------------------------- |
>     | "Too simple for this" | Wrong assumptions waste more time. Apply anyway.           |
>     | "Already searched"    | Show `file:line` evidence. No proof = no search.           |
>     | "Just do it"          | Still need task tracking. Skip depth, never skip tracking. |

<!-- /LOCAL:universal-skill-building-principles -->

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — Apply each protocol only when its read-when condition holds. If a protocol's text is not in your context, read its file below before you act on it.

- `context-engineering-principles` — Prompt clarity and semantic retention principles; writing or enhancing prompts, skills or agents → .claude/skills/shared/protocols/context-engineering-principles.md
- `output-quality-principles` — Readable guidance and verified contents for long skill/doc files; writing, updating or auditing a skill or reference document, or another Markdown artifact over 200 lines → .claude/skills/shared/protocols/output-quality-principles.md
- `prompt-enhancement-transforms-base` — Base transforms shared by every prompt-enhance operation; running prompt-enhance → .claude/skills/shared/protocols/prompt-enhancement-transforms-base.md
- `shared-protocol-duplication-policy` — Protocol copies in carriers are intentional: edit the canonical source, then propagate; editing a shared protocol or its carriers → .claude/skills/shared/protocols/shared-protocol-duplication-policy.md

<!-- PROTOCOL-GUIDES:END -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Improve readable, actionable instructions without losing conditions or consumer contracts. Classify agent guides first and use their shared content-value/retention branch; other prompts use compression and attention anchoring.

**IMPORTANT MUST ATTENTION Protocols in force (concise digest of the SYNC/shared blocks this skill carries — each is a signpost to its canonical body above):**

- **Output Quality:** prioritize useful guidance and readability; preserve conditions and contractual structures.
- **Universal Skill-Building:** MUST ATTENTION detect-before-act, derive-don't-enumerate, evidence gates, fresh-eyes, embed protocols verbatim.
- **Context Engineering:** MUST ATTENTION primacy-recency, high-signal density, compress aggressively, affirmative directives.
- **Prompt Enhancement Transforms:** MUST ATTENTION inline READ summaries, top Quick-Summary, bottom Closing-Reminders (Transforms 1-3 base).
- **Shared Protocol Duplication Policy:** NEVER extract SYNC duplication to references — edit canonical first; inline is intentional.

**IMPORTANT MUST ATTENTION Main steps:** classify ownership/type and select operation → read the complete target and inventory its contract → derive Goal + Summary → compress or expand → read protocol references and add inline summaries → anchor top and bottom → verify retention, readability and syntax. Agent guides use their dedicated branch and owning writer's application gate.

- Default `--op=enhance`; `compress` strips prose only, while `expand` restores fluent language and structural clarity. Preserve code, YAML, tables, paths and SYNC content.
- Task/purpose targets need Goal + purpose + every main step, conditional mode/flag and gate in both anchors. Keep Summary distinct from detailed Workflow/Key Rules. Skills and sub-agents share this structure; preserve agent Role/Workflow/Key Rules/Output sections.
- Read referenced protocols before summarizing them; inline summaries apply to `.claude/` protocols, not project `docs/`. State the correct action and retain non-obvious rationale and examples that clarify necessary distinctions.
- Preserve owner-specific structure, meaningful rules, exceptions and consumer contracts. Verify semantic dispositions and YAML integrity; length and warning counts prove neither quality nor retention.
- For skills, apply the directly linked authoring-quality gate: reference discovery, control by consequence, bounded feedback, dependency setup and model evidence. Preserve ordered gates and progress checklists; report unrun comparisons honestly.
- Ground claims in `file:line` evidence; >80% confidence to act, verify uncertainty first. READ `CLAUDE.md` before starting.

**Anti-Rationalization:**

| Evasion                                 | Rebuttal                                                                  |
| --------------------------------------- | ------------------------------------------------------------------------- |
| "File is short, skip review" | Classify ownership and verify semantic retention; length alone proves nothing |
| "Already read the file"                 | Show baseline semantic inventory and disposition review                          |
| "Closing reminders already exist"       | Verify they echo top-section rules AND include anti-rationalization table |
| "Skill file, skip Universal Principles" | NEVER skip — Phase 0 detection is BLOCKING                                |
| "Summary already has the goal, enough"  | Task/purpose target needs ALL main steps enumerated in Summary AND Reminders — a goal alone leaves middle-buried steps forgettable |

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
