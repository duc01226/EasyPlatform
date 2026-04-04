---
name: sync-protocols
version: 1.0.0
description: '[Skill Management] Sync SYNC-tagged protocol content from canonical source to all skills. Use when shared protocol checklists change and need propagation across skills.'
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting.

<!-- SYNC:shared-protocol-duplication-policy -->

> **Shared Protocol Duplication Policy** — Inline protocol content in skills (wrapped in `<!-- SYNC:tag -->`) is INTENTIONAL duplication. Do NOT extract, deduplicate, or replace with file references. AI compliance drops significantly when protocols are behind file-read indirection. To update: edit `.claude/skills/shared/sync-inline-versions.md` first, then grep `SYNC:protocol-name` and update all occurrences.

<!-- /SYNC:shared-protocol-duplication-policy -->

## Quick Summary

**Goal:** Propagate updated protocol checklists from the canonical source to all skills.

**Canonical source:** `.claude/skills/shared/sync-inline-versions.md`

## Workflow

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

## Usage Examples

```
/sync-protocols understand-code-first     # Sync one tag
/sync-protocols all                        # Sync all tags
/sync-protocols                            # Interactive — asks which tags
```

## Rules

- ALWAYS edit `sync-inline-versions.md` FIRST, then run this skill
- NEVER modify content outside `<!-- SYNC:tag -->` boundaries
- NEVER touch `:reminder` blocks unless explicitly asked
- If close tag is missing in a target file, SKIP that file and report it as an error
- Use the `Grep` tool (not shell grep) per project conventions
- Verify tag balance after every sync run

---

## Closing Reminders

- **MUST** edit `sync-inline-versions.md` FIRST before syncing to skills
- **MUST** verify SYNC tag balance after every sync run
- **MUST** NEVER modify content outside `<!-- SYNC:tag -->` boundaries
- **MUST** skip files with missing close tags and report as errors
    <!-- SYNC:shared-protocol-duplication-policy:reminder -->
- **MUST** follow duplication policy: inline protocols are INTENTIONAL, never extract to file references
    <!-- /SYNC:shared-protocol-duplication-policy:reminder -->
