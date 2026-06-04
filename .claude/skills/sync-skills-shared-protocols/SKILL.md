---
name: sync-skills-shared-protocols
version: 1.0.0
description: '[Skill Management] Use when shared protocol checklists change and need propagation across skills.'
---

## Quick Summary

**Goal:** Two operations — (A) propagate updated content for existing SYNC: blocks across all skills, or (B) add a new SYNC: block to all skill/agent files that don't have it yet.

> **Renamed:** formerly `/sync-protocols` — that name no longer resolves as a slash command; use `/sync-skills-shared-protocols`.

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

Use when a NEW SYNC: block needs to be inserted into all 183 skill/agent files that don't have it yet. This is a bulk-insert operation — not a content-update.

**When to use:** A new protocol rule is added to `.claude/skills/shared/sync-inline-versions.md` and should appear in static carriers (`CLAUDE.md`, `AGENTS.md`, Codex, skills, and agents).

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

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting.

<!-- SYNC:new-block-name:reminder -->
**MUST ATTENTION** [one-line summary of the rule].
<!-- /SYNC:new-block-name:reminder -->""",
}
```

3. Add the block name to the relevant tier list(s) (controls which targets receive it + insertion order):

```python
# Skills keep the original 2-block set — do NOT add agent-only rules here.
SKILL_BLOCK_ORDER = ["critical-thinking-mindset", "ai-mistake-prevention"]

# Core-6: every agent (skills/SKILL.md is unaffected).
CORE_BLOCK_ORDER = ["critical-thinking-mindset", "ai-mistake-prevention",
                    "sequential-thinking-protocol", "task-tracking-external-report",
                    "project-reference-docs-guide", "agent-bootstrap"]

# Code-10: Core-6 + code-investigation blocks, for agents that read/review AND fix code.
CODE_BLOCK_ORDER = CORE_BLOCK_ORDER + ["understand-code-first", "evidence-based-reasoning",
                                       "cross-service-check", "fix-layer-accountability"]

# Readonly-Code-8: Core-6 + reading-discipline blocks only, for read-only/design
# agents that locate/read/design code but never fix a layer or cross a service
# boundary (excludes the two mutation-oriented blocks).
READONLY_CODE_BLOCK_ORDER = CORE_BLOCK_ORDER + ["understand-code-first", "evidence-based-reasoning"]
```

**Agent tiering:** agents no longer share one block list. `find_target_files()` classifies each `.claude/agents/*.md` by explicit membership in one of three sets:

- `CODE_AGENTS` (17 code/review/fix agents → `CODE_BLOCK_ORDER`, Code-10).
- `READONLY_CODE_AGENTS` (4 read-only/design agents — `researcher`, `scout`, `scout-external`, `ui-ux-designer` → `READONLY_CODE_BLOCK_ORDER`, Core-6 + understand-code-first + evidence-based-reasoning; the mutation-oriented `cross-service-check` + `fix-layer-accountability` are deliberately excluded to save tokens on agents that only locate/read/design code).
- `CORE_ONLY_AGENTS` (8 non-code agents → `CORE_BLOCK_ORDER`, Core-6).

An agent in **none of the three sets (or in more than one)** raises `SystemExit` — no silent default; classify it before the script will run. Skills always use `SKILL_BLOCK_ORDER`. Pass `--agents-only` to scope a run to agents (skip skills).

> **Adding a new agent:** add its basename to exactly one of `CODE_AGENTS` / `READONLY_CODE_AGENTS` / `CORE_ONLY_AGENTS` in `sync-hooks-to-skills.py` **and** in the regression suite `.claude/hooks/tests/suites/agent-universal-rules.test.cjs` (TC-UAR-005 fails until both agree). The two enforce one invariant.
>
> **Note — the inserter is insert-only.** Moving an agent from CODE to READONLY_CODE (or otherwise dropping a block from its tier) does NOT remove the now-excess SYNC block from its `.md` on disk — `process_file` only inserts missing blocks. Strip the excess block(s) from the agent `.md` source by hand (or a scoped one-off) so the regression suite's tier assertions pass.

#### Step B3: Run the script (dry-run first)

```bash
python .claude/scripts/sync-hooks-to-skills.py --dry-run --verbose
# Verify: expected N updated, 0 errors

python .claude/scripts/sync-hooks-to-skills.py --verbose
# Verify: 183 updated (or close — some may already have it → skip)
```

#### Step B4: Verify

```bash
# Confirm target files now contain the new block. Expected count is TIER-AWARE:
#   - block in SKILL_BLOCK_ORDER          → all skills + all agents
#   - block in CORE_BLOCK_ORDER           → all 29 agents (skills excluded)
#   - block in READONLY_CODE_BLOCK_ORDER  → 21 agents (17 code + 4 readonly-code)
#   - block in CODE_BLOCK_ORDER           → 17 code agents only
grep -rl "SYNC:new-block-name" .claude/skills/*/SKILL.md .claude/agents/*.md | wc -l

# Then run the agent-coverage regression suite — it asserts tier membership,
# disjointness, and SYNC tag balance across all 29 agents.
node .claude/hooks/tests/run-all-tests.cjs --filter=agent-universal
```

Check a representative file of each affected tier manually to confirm placement and formatting.

---

## Usage Examples

```
/sync-skills-shared-protocols understand-code-first     # Sync one tag (Operation A)
/sync-skills-shared-protocols all                        # Sync all tags (Operation A)
/sync-skills-shared-protocols                            # Interactive — asks which tags
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
> **Re-read files after context changes.** Context compaction, resume, or long-running work can make memory stale; verify current files before acting.
> **Verify generated content against source evidence.** AI hallucinates APIs, names, claims, and document facts. Check the relevant source before documenting or referencing.
> **Check downstream references before deleting or renaming.** Removing an artifact can stale docs, generated mirrors, configs, and callers; map references first.
> **Trace the full impact chain after edits.** Changing a definition can miss derived outputs and consumers. Follow the affected chain before declaring done.
> **Verify ALL affected outputs, not just the first.** One green check is not all green checks; validate every output surface the change can affect.
> **Assume existing values are intentional — ask WHY before changing.** Before changing a constant, limit, flag, wording, or pattern, read nearby context and history.
> **Surface ambiguity before acting — don't pick silently.** Multiple valid interpretations require an explicit question or stated assumption with risk.
> **Keep shared guidance role-relevant.** Universal guidance must help every receiving skill or agent; code-specific obligations belong only in code-specific protocols.

<!-- /SYNC:ai-mistake-prevention -->

<!-- SYNC:shared-protocol-duplication-policy:reminder -->

**IMPORTANT MUST ATTENTION** follow duplication policy: inline protocols are INTENTIONAL, never extract to file references

<!-- /SYNC:shared-protocol-duplication-policy:reminder -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical + sequential thinking — every claim needs appropriate traced evidence (`file:line` for repo/code claims; source URL or artifact section for research, product, content, and docs claims); confidence >80% to act, <60% DO NOT recommend. Anti-hallucination: never present guess as fact, admit uncertainty freely, cross-reference independently, stay skeptical of own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — verify generated content against evidence, trace downstream references before deleting or renaming, verify all affected outputs, re-read files after context loss, and surface ambiguity before acting.

<!-- /SYNC:ai-mistake-prevention:reminder -->

## Closing Reminders

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **Critical Thinking:** apply critical+sequential thinking; trace every claim, confidence >80%.
- **Shared Protocol Duplication:** inline protocols are intentional; never extract to file references.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.

**IMPORTANT MUST ATTENTION** edit `sync-inline-versions.md` FIRST before syncing to skills
**IMPORTANT MUST ATTENTION** verify SYNC tag balance after every sync run
**IMPORTANT MUST ATTENTION** NEVER modify content outside `<!-- SYNC:tag -->` boundaries
**IMPORTANT MUST ATTENTION** skip files with missing close tags and report as errors

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
