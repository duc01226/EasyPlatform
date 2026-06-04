# SKILL.md Schema Reference

Frontmatter fields, invocation control, variable substitution, and validation rules. Loaded on demand by `skill-creator`.

## Frontmatter Fields

```yaml
---
name: my-skill # Lowercase, hyphens. Max 64 chars. Default: directory name.
description: '[Category] What it does. Triggers on: keyword1, keyword2.' # MUST be single-line
argument-hint: '[issue-number]' # Autocomplete hint for arguments
disable-model-invocation: false # true = user-only (/name), Claude cannot auto-invoke
user-invocable: true # false = hidden from / menu, Claude-only auto-invoke
allowed-tools: Read, Grep, Bash # Restrict tools available while skill runs
context: inline # inline (default) or fork (isolated subagent)
agent: general-purpose # Subagent type when context: fork
model: inherit-4-5 # Model override. Default: session model
license: Complete terms in LICENSE.txt # Official field. Keep when a LICENSE.txt ships with the skill
version: 1.0.0 # Project convention (non-official)
---
```

Official fields: `name`, `description`, `argument-hint`, `disable-model-invocation`, `user-invocable`, `allowed-tools`, `model`, `context`, `agent`, `hooks`, `license`.

**Project-convention fields are config-driven (portability).** The validator ships generic — it does NOT hardcode any project's non-official fields. Each project declares its accepted conventions in `docs/project-config.json` under `skillConventions`; the validator flags those INFO instead of ERROR. With no config, only the official schema is accepted (strict mode).

```json
"skillConventions": {
  "conventionFields": ["version", "activation", "triggers", "execution-mode", "context-budget", "last_reviewed", "tags", "category"],
  "removableFields": ["infer"],          // WARN + (--fix) removes
  "fieldFixes": { "tools": "allowed-tools" }  // WARN + (--fix) renames
}
```

Universal defaults (`infer` removable, `tools`→`allowed-tools`) apply even with no config — these are deprecated/typo fields, not project taste. The config path honors `.ck.json` `portability.projectConfigPath`.

## Invocation Control Matrix

| Setting                          | User Invokes | Claude Invokes | Description                                 |
| -------------------------------- | ------------ | -------------- | ------------------------------------------- |
| Default                          | Yes          | Yes            | Description in context; loads on invocation |
| `disable-model-invocation: true` | Yes          | No             | User-only. Not in context until invoked     |
| `user-invocable: false`          | No           | Yes            | Hidden from menu. Claude auto-invokes       |

## Variable Substitution

| Variable               | Description                             |
| ---------------------- | --------------------------------------- |
| `$ARGUMENTS`           | All arguments passed to skill           |
| `$ARGUMENTS[N]` / `$N` | Specific argument by 0-based index      |
| `${CLAUDE_SESSION_ID}` | Current session ID                      |
| `` !`command` ``       | Execute shell command before skill runs |

## Description Quality

- Single-line only — multi-line YAML breaks catalog parsing.
- Start with `[Category]` prefix (e.g., `[Frontend]`, `[Planning]`, `[AI & Tools]`).
- Include trigger keywords for auto-activation; third-person voice ("Use when...").
- Descriptions load at ~2% of context window (~16,000 chars) — keep concise.

## Validation Rules (Scan & Fix — `validate-skills.cjs`)

| Check                    | Rule                                           | Severity |
| ------------------------ | ---------------------------------------------- | -------- |
| Frontmatter exists       | Must have `---` delimiters                     | Error    |
| Description single-line  | No literal newlines in description value       | Error    |
| Description not empty    | Must have description for discoverability      | Warning  |
| Name format              | Lowercase, hyphens, starts letter/num, ≤64     | Error    |
| Unknown official field   | Field not in official schema                   | Error    |
| Removable field          | `infer` — ignored by runtime (`--fix` removes) | Warning  |
| Field typo               | `tools` → `allowed-tools` (`--fix` renames)    | Warning  |
| Description has category | Should start with `[Category]`                 | Info     |
| Quick Summary exists     | `## Quick Summary` in first 30 lines           | Warning  |
| SYNC tag balance         | Every open tag has a matching close tag        | Error    |

`--fix` auto-applies removable/renamable fixes only; structural issues are reported for manual repair.
