# Skill Structure Guide

## Directory Layout
```
.claude/skills/skill-name/
  SKILL.md              # Required. <100 lines. Quick reference guide.
  references/           # Docs loaded on-demand into context
  scripts/              # Executable code (prefer Node.js/Python over bash)
  assets/               # Output files (templates, images, fonts)
```

## SKILL.md Frontmatter (Official Schema)

Source: https://code.claude.com/docs/en/skills

| Field | Required | Description |
|-------|----------|-------------|
| `name` | No | Slash-command name. Lowercase, hyphens, max 64 chars. Default: dir name |
| `description` | Recommended | What skill does + trigger keywords for auto-activation. Default: first paragraph |
| `argument-hint` | No | Autocomplete hint, e.g. `[issue-number]` |
| `disable-model-invocation` | No | `true` = user-only, Claude cannot auto-trigger. Default: `false` |
| `user-invocable` | No | `false` = hidden from `/` menu, Claude-only. Default: `true` |
| `allowed-tools` | No | Comma-separated tool whitelist, e.g. `Read, Grep, Glob` |
| `model` | No | Force specific model for this skill |
| `context` | No | `fork` to run in isolated subagent |
| `agent` | No | Subagent type when `context: fork` (e.g. `Explore`, `Plan`) |
| `hooks` | No | Skill-scoped lifecycle hooks |

**NOT valid:** `version`, `license`, `infer`, `tools` — ignored by Claude Code runtime.

```yaml
---
name: skill-name
description: >-
  [Category] What this skill does. Triggers on: keyword1, keyword2.
  Include trigger keywords in description for auto-activation.
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
argument-hint: [args]
---
```

## SKILL.md Body Guidelines
- **<100 lines** total (frontmatter + body)
- Imperative/verb-first writing style ("Create X" not "You should create X")
- Purpose statement (1-2 lines)
- Decision tree or workflow steps (concise)
- `Read:` directives pointing to references/ for detail
- No inline examples >5 lines -- move to references/

## Progressive Disclosure (3 Levels)
1. **Metadata** (name + description) -- always in context (~100 words)
2. **SKILL.md body** -- loaded when skill triggers (<100 lines)
3. **Bundled resources** -- loaded on-demand by Claude (unlimited)

## References/ Files
- Also <100 lines each; split further if needed
- Sacrifice grammar for concision
- Practical instructions, not documentation
- Can cross-reference other references/ or scripts/

## Scripts/ Files
- Prefer Node.js or Python (bash not portable on Windows)
- Include `requirements.txt` for Python scripts
- Write tests; run and verify before committing
- Env loading order: `process.env` > `skills/${SKILL}/.env` > `skills/.env` > `.claude/.env`
- Create `.env.example` for required vars

## Assets/ Files
- Not loaded into context; used in output (templates, images, fonts)
- Examples: boilerplate project dirs, brand assets, font files

## Skill Naming
- Combine related topics: `cloudflare` + `cloudflare-r2` + `cloudflare-workers` -> `devops`
- Use kebab-case
- Be specific enough for auto-activation but general enough to avoid skill sprawl

## Description Quality
- Include concrete use-case keywords for auto-activation
- Mention what references/scripts are bundled
- Third person: "This skill should be used when..." not "Use this skill when..."
