# Claude Code SKILL.md — Official Schema Reference

> Source: [Claude Code Docs — Extend Claude with skills](https://code.claude.com/docs/en/skills.md)

## Structure

```
skill-name/
├── SKILL.md          # Required — frontmatter + instructions
├── references/       # Optional — detailed docs (loaded on demand)
├── scripts/          # Optional — executable helpers
└── examples.md       # Optional — usage examples
```

## Frontmatter (all fields optional)

```yaml
---
# Display & Discovery
name: my-skill                         # Lowercase, hyphens. Default: directory name. Max 64 chars.
description: 'What it does and when'   # Claude uses this for auto-activation. MUST be single-line or quoted.
argument-hint: '[issue-number]'        # Autocomplete hint for arguments.

# Invocation Control
disable-model-invocation: false        # true = user-only (/name). Claude cannot auto-invoke.
user-invocable: true                   # false = hidden from / menu. Claude-only auto-invoke.

# Execution
context: inline                        # inline (default) or fork (isolated subagent).
agent: general-purpose                 # Subagent type when context: fork.
model: opus-4-5                        # Model override. Default: session model.

# Capabilities
allowed-tools: 'Read, Grep, Glob'     # Comma-separated. Restricts tools when skill is active.

# Hooks (skill-scoped)
hooks:
  SessionStart:
    - matcher: startup
      hooks:
        - type: command
          command: 'echo "loaded"'

# Portable Standard (optional)
version: 1.0.0                         # Semantic version.
license: MIT                           # License type.
---
```

## Invocation Control Matrix

| Setting | User Invokes | Claude Invokes | Description |
|---------|-------------|----------------|-------------|
| Default | Yes | Yes | Description in context; loads on invocation |
| `disable-model-invocation: true` | Yes | No | User-only. Not in context until invoked |
| `user-invocable: false` | No | Yes | Hidden from menu. Claude auto-invokes |

## Variable Substitution

| Variable | Description |
|----------|-------------|
| `$ARGUMENTS` | All arguments passed to skill |
| `$ARGUMENTS[N]` / `$N` | Specific argument by 0-based index |
| `${CLAUDE_SESSION_ID}` | Current session ID |
| `` !`command` `` | Execute shell command before skill runs (preprocessing) |

## Description Best Practices

1. Include keywords users naturally say
2. Explain when to use (trigger conditions)
3. Be specific and actionable
4. Keep single-line (multi-line YAML indicators may not parse correctly)

**Good:** `'Deploy app to production. Use for release workflows.'`
**Bad:** `'Utility tool'` (too vague)

## Context Budget

- Descriptions loaded at 2% of context window (~16,000 chars)
- Run `/context` to check for excluded skills
- Override: `export SLASH_COMMAND_TOOL_CHAR_BUDGET=<chars>`
- Keep SKILL.md under 500 lines; use reference files for detail

## Resolution Order (highest priority first)

1. Enterprise managed settings
2. Personal `~/.claude/skills/`
3. Project `.claude/skills/`
4. Plugin skills (namespaced `plugin:skill-name`)

## Extended Thinking

Include word "ultrathink" anywhere in skill content to enable extended thinking mode.

## Key Rules

- `SKILL.md` is required; all other files optional
- Reference files loaded on demand (progressive disclosure)
- Same skill name across levels: higher-priority wins
- Scripts in `scripts/` executed by Claude when tool access granted
- Nested `.claude/skills/` in monorepos auto-discovered
