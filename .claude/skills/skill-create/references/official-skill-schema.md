# Official Claude Code Skill Schema

Source: https://code.claude.com/docs/en/skills

## Valid Frontmatter Fields

| Field | Required | Description |
|-------|----------|-------------|
| `name` | No | Slash-command name. Lowercase, hyphens, max 64 chars. Default: directory name |
| `description` | Recommended | What skill does + when to use. Drives auto-activation. Default: first paragraph |
| `argument-hint` | No | Autocomplete hint, e.g. `[issue-number]` or `[filename] [format]` |
| `disable-model-invocation` | No | `true` = user-only, Claude cannot auto-trigger. Default: `false` |
| `user-invocable` | No | `false` = hidden from `/` menu, Claude-only. Default: `true` |
| `allowed-tools` | No | Comma-separated tool whitelist, e.g. `Read, Grep, Glob, Bash(gh *)` |
| `model` | No | Force specific model for this skill |
| `context` | No | `fork` to run in isolated subagent context |
| `agent` | No | Subagent type when `context: fork` (e.g. `Explore`, `Plan`, `general-purpose`) |
| `hooks` | No | Skill-scoped lifecycle hooks object |

**These 10 fields are the ONLY valid frontmatter fields.**

## NOT Valid (Ignored by Runtime)

- `version` — no effect, use git for versioning
- `license` — no effect
- `infer` — no effect, put trigger keywords in `description` instead
- `tools` — typo for `allowed-tools`
- `triggers`, `activation`, `keywords`, `skill-type`, `languages` — no effect

## String Substitutions (In Skill Body)

| Variable | Description |
|----------|-------------|
| `$ARGUMENTS` | All arguments passed when invoking |
| `$ARGUMENTS[N]` or `$N` | Specific argument by 0-based index |
| `${CLAUDE_SESSION_ID}` | Current session ID |

## Invocation Control

| Frontmatter | User can invoke | Claude can invoke |
|-------------|-----------------|-------------------|
| (default) | Yes | Yes |
| `disable-model-invocation: true` | Yes | No |
| `user-invocable: false` | No | Yes |

## Dynamic Context

Use `` !`command` `` syntax to inject shell command output into skill content at load time.

## Frontmatter Template

```yaml
---
name: skill-name
description: >-
  [Category] What this skill does. Triggers on: keyword1, keyword2.
  Use when [scenario]. This skill should be used when...
argument-hint: [args]
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
---
```

## Subagent Skill Template

```yaml
---
name: skill-name
description: >-
  [Category] What this skill does in isolation.
context: fork
agent: Explore
allowed-tools: Read, Grep, Glob
---
```
