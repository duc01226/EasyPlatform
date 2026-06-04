---
name: sync-skills-shared-protocols
description: '[Skill Management] Use when shared protocol checklists change and need propagation across skills.'
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

Codex does not receive Claude hook-based doc injection.
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

**Goal:** Two operations — (A) propagate updated content for existing SYNC: blocks across all skills, or (B) add a new SYNC: block to all skill/agent files that don't have it yet.

**Canonical source:** `.claude/skills/shared/sync-inline-versions.md`

## Workflow

### Operation A: Update Existing Block Content

Use when a SYNC: block already exists in files and push updated content to all of them.

### Step 1: Identify What Changed

If user specifies a tag name (e.g., `sync-skills-shared-protocols understand-code-first`):

- Sync only that tag

If no tag specified:

- Read `sync-inline-versions.md`
- Ask user which tag(s) to sync, or "all"

### Step 2: Read Canonical Content

For each tag to sync:

1. Read `.claude/skills/shared/sync-inline-versions.md`
2. Extract content under `## SYNC:{tag-name}` heading (everything between that heading and the next `---` or `## SYNC:`)

### Step 3: Find All Skills with Tag

```bash
grep -rl "SYNC:{tag-name}" .claude/skills/*/SKILL.md
```

### Step 4: Replace Content in Each Skill

For each file found:

1. Find `<!-- SYNC:{tag-name} -->` open tag
2. Find `<!-- /SYNC:{tag-name} -->` close tag
3. Replace everything between them with the canonical content
4. Do NOT touch `:reminder` blocks — those are separate, shorter versions

### Step 5: Verify

Run these checks after all replacements:

```python
# 1. SYNC tag balance (all opens have matching closes)
# 2. Content matches canonical source
# 3. No content outside SYNC blocks was modified
```

Report:

- Tags synced
- Files updated (count)
- Any balance issues

### Step 6: Reminder Blocks

`:reminder` blocks (`<!-- SYNC:{tag}:reminder -->`) are 1-line summaries at the bottom of skills for AI recency attention. These are NOT auto-synced — they are hand-written. Skip them unless user explicitly asks to update reminders too.

---

### Operation B: Add a New Block to All Files

Use when a NEW SYNC: block needs to be inserted into all 288 skill/agent files that don't have it yet. This is a bulk-insert operation — not a content-update.

**When to use:** A new protocol rule is added to hooks (`prompt-injections.cjs`) and should also appear in all skills/agents as a fallback for hook-less environments.

#### Step B1: Add block content to canonical source

Edit `.claude/skills/shared/sync-inline-versions.md` and add a new section:

```markdown
## SYNC:{new-block-name}

> **[Rule content here]**

---
```

#### Step B2: Add block to `sync-hooks-to-skills.py`

Edit `.claude/scripts/sync-hooks-to-skills.py`:

1. Add entry to `BLOCKS` dict:

```python
BLOCKS = {
    # ... existing blocks ...
    "new-block-name": """\
<!-- SYNC:new-block-name -->

> **[Full block content here — exactly as it should appear in files]**

<!-- /SYNC:new-block-name -->""",
}
```

2. Add 1-line reminder to `REMINDERS` dict:

```python
REMINDERS = {
# ... existing reminders ...
"new-block-name": """\

> **[IMPORTANT]** Use task tracking to break ALL work into small tasks BEFORE starting.

<!-- SYNC:new-block-name:reminder -->
**MUST ATTENTION** [one-line summary of the rule].
<!-- /SYNC:new-block-name:reminder -->""",
}
```

3. Add the block name to the relevant tier list(s) (controls which targets receive it + insertion order):

```python
# Skills keep the original 2-block set — do NOT add agent-only rules here.
SKILL_BLOCK_ORDER = ["critical-thinking-mindset", "ai-mistake-prevention"]

# Core-5: every agent (skills/SKILL.md is unaffected).
CORE_BLOCK_ORDER = ["critical-thinking-mindset", "ai-mistake-prevention",
                    "sequential-thinking-protocol", "task-tracking-external-report",
                    "project-reference-docs-guide"]

# Code-9: Core-5 + code-investigation blocks, for agents that read/review code.
CODE_BLOCK_ORDER = CORE_BLOCK_ORDER + ["understand-code-first", "evidence-based-reasoning",
                                       "cross-service-check", "fix-layer-accountability"]
```

**Agent tiering (added 2026-06):** agents no longer share one block list. `find_target_files()` classifies each `.claude/agents/*.md` by explicit membership in `CODE_AGENTS` (20 code/review agents → `CODE_BLOCK_ORDER`) or `CORE_ONLY_AGENTS` (8 non-code agents → `CORE_BLOCK_ORDER`). An agent in **neither set (or both)** raises `SystemExit` — no silent default; classify it before the script will run. Skills always use `SKILL_BLOCK_ORDER`. Pass `--agents-only` to scope a run to agents (skip skills).

> **Adding a new agent:** add its basename to exactly one of `CODE_AGENTS` / `CORE_ONLY_AGENTS` in `sync-hooks-to-skills.py` **and** in the regression suite `.claude/hooks/tests/suites/agent-universal-rules.test.cjs` (TC-UAR-005 fails until both agree). The two enforce one invariant.

#### Step B3: Run the script (dry-run first)

```bash
python .claude/scripts/sync-hooks-to-skills.py --dry-run --verbose
# Verify: expected N updated, 0 errors

python .claude/scripts/sync-hooks-to-skills.py --verbose
# Verify: 288 updated (or close — some may already have it → skip)
```

#### Step B4: Verify

```bash
# Confirm target files now contain the new block. Expected count is TIER-AWARE:
#   - block in SKILL_BLOCK_ORDER  → all skills + all agents
#   - block in CORE_BLOCK_ORDER   → all 28 agents (skills excluded)
#   - block in CODE_BLOCK_ORDER   → 21 code agents only
grep -rl "SYNC:new-block-name" .claude/skills/*/SKILL.md .claude/agents/*.md | wc -l

# Then run the agent-coverage regression suite — it asserts tier membership,
# disjointness, and SYNC tag balance across all 28 agents.
node .claude/hooks/tests/run-all-tests.cjs --filter=agent-universal
```

Check a representative file of each affected tier manually to confirm placement and formatting.

---

## Usage Examples

```
$sync-skills-shared-protocols understand-code-first     # Sync one tag (Operation A)
$sync-skills-shared-protocols all                        # Sync all tags (Operation A)
$sync-skills-shared-protocols                            # Interactive — asks which tags
# Adding new block: use Operation B workflow above (script-driven)
```

## Rules

- ALWAYS edit `sync-inline-versions.md` FIRST, then run this skill
- NEVER modify content outside `<!-- SYNC:tag -->` boundaries
- NEVER touch `:reminder` blocks unless explicitly asked
- If close tag is missing in a target file, SKIP that file and report it as an error
- Use the `Grep` tool (not shell grep) per project conventions
- Verify tag balance after every sync run
- For bulk-insert (Operation B): use `sync-hooks-to-skills.py` — NEVER do it manually across 288 files

---

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:shared-protocol-duplication-policy -->

> **Shared Protocol Duplication Policy** — Inline protocol content in skills (wrapped in `<!-- SYNC:tag -->`) is INTENTIONAL duplication. Do NOT extract, deduplicate, or replace with file references. AI compliance drops significantly when protocols are behind file-read indirection. To update: edit `.claude/skills/shared/sync-inline-versions.md` first, then grep `SYNC:protocol-name` and update all occurrences.

<!-- /SYNC:shared-protocol-duplication-policy -->

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
> **Keep domain concepts out of generic/shared/infrastructure layers.** A reusable layer (shared library, framework, infra module) must reference NO consumer-specific domain concept — tenant/customer/product IDs, business entities, feature rules. The leak compiles and runs, so it passes review silently while coupling the "reusable" layer to one consumer. Push domain fields/logic down into the consumer via subclass or composition.

<!-- /SYNC:ai-mistake-prevention -->

<!-- SYNC:shared-protocol-duplication-policy:reminder -->

**IMPORTANT MUST ATTENTION** follow duplication policy: inline protocols are INTENTIONAL, never extract to file references

<!-- /SYNC:shared-protocol-duplication-policy:reminder -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.

<!-- /SYNC:ai-mistake-prevention:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION** edit `sync-inline-versions.md` FIRST before syncing to skills
**IMPORTANT MUST ATTENTION** verify SYNC tag balance after every sync run
**IMPORTANT MUST ATTENTION** NEVER modify content outside `<!-- SYNC:tag -->` boundaries
**IMPORTANT MUST ATTENTION** skip files with missing close tags and report as errors

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using task tracking.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:START -->

## Hookless Prompt Protocol Mirror (Auto-Synced)

Source: `.claude/hooks/lib/prompt-injections.cjs` + `.claude/.ck.json`

## [WORKFLOW-EXECUTION-PROTOCOL] [BLOCKING] Workflow Execution Protocol — MANDATORY IMPORTANT MUST CRITICAL. Do not skip for any reason.

**Generic portability boundary:** Reusable skills and protocol text stay project-neutral; project-specific conventions are discovered from docs/project-config.json and docs/project-reference/. Apply shared AI-SDD from `shared/sdd-artifact-contract.md`. Read `docs/project-config.json` and `docs/project-reference/docs-index-reference.md`, then open the project reference docs named there. For spec, test-case, behavior-change, public-contract, or `docs/specs/` work, route through the local spec docs named by the docs index: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`, and `workflow-spec-test-code-cycle-reference.md` when specs/tests/code must stay synchronized. If either file or a required reference doc is missing or stale, auto-run `$project-init` (or the narrow lower-level route such as `$project-config`, `$docs-init`, `$scan-all`, or `$scan --target=<key>`) before ordinary project-specific work. Any supported AI tool may execute when this shared context and local docs are available.

1. **DETECT:** If the prompt starts with an explicit slash skill/workflow command, execute it directly. Otherwise match the prompt against the workflow catalog and skill list.
2. **ANALYZE:** Choose the best option: execute directly, invoke a skill, activate a standard workflow, or compose a custom step combination.
3. **AUTO-SELECT:** Pick the best option yourself. Do not ask the user to choose between direct execution, skill, standard workflow, or custom workflow.
4. **ACTIVATE:** For a selected workflow, call `$start-workflow <workflowId>`; for a selected skill, invoke that skill; for a custom workflow, sequence custom steps directly; for direct execution, proceed with the task.
5. **CREATE TASKS:** task tracking for ALL workflow/skill/custom steps before execution when the selected path has multiple steps.
6. **EXECUTE:** Advance per the **Workflow Step Advancement & Parallel Phases** rule in your context instructions — model-driven; a sub-agent completion advances a step identically to an inline call; a parallel-phase group is an all-return barrier (advance only after ALL members return, never serialize it)
   **[CRITICAL-THINKING-MINDSET]** Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
   **Anti-hallucination principle:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.
   **AI Attention principle (Primacy-Recency):** Put the 3 most critical rules at both top and bottom of long prompts/protocols so instruction adherence survives long context windows.
   **Goal-driven execution:** Define success criteria first, loop until verified, and stop only when observable checks pass.
   **Tests verify intent:** Tests must protect business rules/invariants and fail when the protected intent breaks, not only mirror current behavior.

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
   **[TASK-PLANNING] [MANDATORY]** BEFORE executing any workflow or skill step, create/update task tracking for all planned steps, then keep it synchronized as each step starts/completes.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:END -->
