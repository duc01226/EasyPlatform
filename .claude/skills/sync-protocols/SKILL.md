---
name: sync-protocols
version: 1.0.0
description: '[Skill Management] Sync SYNC-tagged protocol content from canonical source to all skills. Use when shared protocol checklists change and need propagation across skills.'
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

**Goal:** Two operations — (A) propagate updated content for existing SYNC: blocks across all skills, or (B) add a new SYNC: block to all skill/agent files that don't have it yet.

**Canonical source:** `.claude/skills/shared/sync-inline-versions.md`

## Workflow

### Operation A: Update Existing Block Content

Use when a SYNC: block already exists in files and push updated content to all of them.

### Step 1: Identify What Changed

If user specifies a tag name (e.g., `sync-protocols understand-code-first`):

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
<!-- SYNC:new-block-name:reminder -->
**MUST ATTENTION** [one-line summary of the rule].
<!-- /SYNC:new-block-name:reminder -->""",
}
```

3. Add the block name to `BLOCK_ORDER` list (controls insertion order):

```python
BLOCK_ORDER = ["critical-thinking-mindset", "ai-mistake-prevention", "new-block-name"]
```

#### Step B3: Run the script (dry-run first)

```bash
python .claude/scripts/sync-hooks-to-skills.py --dry-run --verbose
# Verify: expected N updated, 0 errors

python .claude/scripts/sync-hooks-to-skills.py --verbose
# Verify: 288 updated (or close — some may already have it → skip)
```

#### Step B4: Verify

```bash
# Confirm all target files now contain the new block
grep -rl "SYNC:new-block-name" .claude/skills/*/SKILL.md .claude/agents/*.md | wc -l
# Should equal total file count (288)
```

Check a representative file manually to confirm correct placement and formatting.

---

## Usage Examples

```
/sync-protocols understand-code-first     # Sync one tag (Operation A)
/sync-protocols all                        # Sync all tags (Operation A)
/sync-protocols                            # Interactive — asks which tags
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

**IMPORTANT MUST ATTENTION** edit `sync-inline-versions.md` FIRST before syncing to skills
**IMPORTANT MUST ATTENTION** verify SYNC tag balance after every sync run
**IMPORTANT MUST ATTENTION** NEVER modify content outside `<!-- SYNC:tag -->` boundaries
**IMPORTANT MUST ATTENTION** skip files with missing close tags and report as errors

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
