---
name: skill-create
description: >-
  [Tooling & Meta] Create new Claude Code skills or scan/fix invalid skill headers.
  Triggers on: create skill, new skill, scan skills, fix skills, validate skills,
  invalid skill header, skill schema.
argument-hint: [prompt-or-url-or-scan]
---

Create skills or validate existing ones against official Claude Code schema.

## Official Schema

Read: `references/official-skill-schema.md`

10 valid fields: `name`, `description`, `argument-hint`, `disable-model-invocation`, `user-invocable`, `allowed-tools`, `model`, `context`, `agent`, `hooks`.

## Mode: Create Skill

Use `skill-plan` and `claude-code` skills. Use `docs-seeker` to search documentation.

<user-prompt>$ARGUMENTS</user-prompt>

1. Read `references/official-skill-schema.md` for valid frontmatter fields
2. Create `.claude/skills/<name>/SKILL.md` (<100 lines) with valid frontmatter only
3. Put trigger keywords in `description` field (NOT in `infer` — it's invalid)
4. Heavy content goes in `references/` (<100 lines each)
5. Scripts in `scripts/` (Node.js/Python preferred)

**Rules:**
- Skills are practical instructions, not documentation
- Token-efficient: progressive disclosure (SKILL.md → references/ → scripts/)
- If given URL, use `Explore` subagent to explore all internal links
- If given GitHub URL, use `repomix` to summarize then explore with subagents
- If given nothing, use `AskUserQuestion` for clarifications

## Mode: Scan & Fix Invalid Skills

```bash
# Report only — show all invalid fields:
node .claude/skills/skill-create/scripts/validate-skills.cjs

# Auto-fix — remove invalid fields (version, license, infer), rename typos (tools → allowed-tools):
node .claude/skills/skill-create/scripts/validate-skills.cjs --fix

# Scan specific directory:
node .claude/skills/skill-create/scripts/validate-skills.cjs --path .claude/skills/find-component
```

After `--fix`, manually review skills with ERROR-level issues (unknown fields that can't be auto-fixed).
