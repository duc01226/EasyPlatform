# Skill Structure Guide

## Directory Layout
```
.claude/skills/skill-name/
  SKILL.md              # Required. <100 lines. Quick reference guide.
  references/           # Docs loaded on-demand into context
  scripts/              # Executable code (prefer Node.js/Python over bash)
  assets/               # Output files (templates, images, fonts)
```

## SKILL.md Frontmatter (Required)
```yaml
---
name: skill-name              # kebab-case, matches directory name
description: >-               # 1-3 sentences. Include trigger keywords.
  Use when [scenario]. Triggers on [keywords].
  This skill should be used when...
allowed-tools: Read, Write, Edit, Bash, Grep, Glob  # optional
infer: true                   # true = auto-activate on matching queries
license: See LICENSE.txt      # optional
version: 1.0.0                # optional
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
