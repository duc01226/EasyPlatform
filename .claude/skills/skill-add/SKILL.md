---
name: skill-add
version: 2.0.0
description: '[Skill Management] Add new reference files or scripts to a skill. Triggers on: add reference, add script, skill reference, skill script.'
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting.

<!-- SYNC:shared-protocol-duplication-policy -->

> **Shared Protocol Duplication Policy** — Inline protocol content in skills (wrapped in `<!-- SYNC:tag -->`) is INTENTIONAL duplication. Do NOT extract, deduplicate, or replace with file references. AI compliance drops significantly when protocols are behind file-read indirection. To update: edit `.claude/skills/shared/sync-inline-versions.md` first, then grep `SYNC:protocol-name` and update all occurrences.

<!-- /SYNC:shared-protocol-duplication-policy -->

## Quick Summary

**Goal:** Add new reference files or scripts to an existing skill directory.

**Workflow:**

1. **Identify** — Determine target skill and required additions
2. **Create** — Add reference/script files following progressive disclosure (<100 lines each)
3. **Update SKILL.md** — Add SYNC blocks if new protocols apply, update references
4. **Enhance** — Call `/prompt-enhance` on the updated SKILL.md
5. **Validate** — Verify files work, scripts pass tests

**Key Rules:**

- Reference files under 100 lines each (progressive disclosure)
- Scripts must have tests and respect `.env` loading order
- If adding shared protocol content → use `<!-- SYNC:tag -->` inline blocks from `sync-inline-versions.md`
- MUST call `/prompt-enhance` on SKILL.md after modifications

## Arguments

$1: skill name (required)
$2: reference or script prompt (required)
If $1 or $2 is not provided, ask via `AskUserQuestion`.

## Mission

Add new reference files or scripts to `.claude/skills/$1` directory.

<reference-or-script-prompt>$2</reference-or-script-prompt>

## Rules

- Token-efficient: SKILL.md short and concise, references under 100 lines each
- If given a URL → use `Explore` subagent to explore all internal links
- If given multiple URLs → use parallel `Explore` subagents
- If given a GitHub URL → use `repomix` to summarize + parallel `Explore` subagents
- Skills are instructions, not documentation. Teach Claude HOW to do the task.
- If new content involves shared protocols → inline via SYNC tags, never file references

---

## Closing Reminders

- **MUST** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MUST** inline shared protocols via `<!-- SYNC:tag -->` blocks — NEVER use file references
- **MUST** call `/prompt-enhance` on updated SKILL.md as final quality pass
- **MUST** keep reference files under 100 lines each (progressive disclosure)
    <!-- SYNC:shared-protocol-duplication-policy:reminder -->
- **MUST** follow duplication policy: inline protocols are INTENTIONAL, never extract to file references
    <!-- /SYNC:shared-protocol-duplication-policy:reminder -->
