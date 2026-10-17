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

Official fields: `name`, `description`, `when_to_use`, `argument-hint`, `arguments`, `disable-model-invocation`, `user-invocable`, `allowed-tools`, `disallowed-tools`, `model`, `effort`, `context`, `agent`, `background`, `hooks`, `paths`, `shell`, `metadata`, `license`, `compatibility`. The validator's list follows the host's skills reference; re-read it before changing either.

`model` selects a runtime model where the host supports it; it does not declare all compatible or tested models. Document intended models, hosts and test evidence in the body or an evaluation reference linked directly from SKILL.md. Use custom compatibility metadata only when the host/schema accepts it.

**Project-convention fields are config-driven (portability).** The validator ships generic — it does NOT hardcode any project's non-official fields. Each project declares its accepted conventions in `docs/project-config.json` under `skillConventions`; the validator flags those INFO instead of ERROR. With no config, only the official schema is accepted (strict mode). Convention fields stay at the top level because the coding hosts this framework targets ignore unknown keys; before uploading a skill to a host with a strict schema, move them under `metadata`.

```json
"skillConventions": {
  "conventionFields": ["version", "activation", "triggers", "execution-mode", "context-budget", "tags", "category"],
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
| Description not empty     | Must have description for discoverability      | Warning  |
| Name format              | Lowercase, hyphens, starts letter/num, ≤64     | Error    |
| Unknown official field   | Field not in official schema                   | Error    |
| Removable field          | `infer` — ignored by runtime (`--fix` removes) | Warning  |
| Field typo               | `tools` → `allowed-tools` (`--fix` renames)    | Warning  |
| Description has category | Should start with `[Category]`                 | Info     |
| Quick Summary exists     | Standalone `## Quick Summary` after frontmatter, within physical lines 1–30 (inclusive) | Warning |
| Contents list            | A file over 100 lines, `SKILL.md` or a bundled Markdown file, has a `Contents` heading within physical lines 1–100, and any list present holds one linked entry per section in document order (`--fix-contents` writes it); `node_modules` is not inspected. Bundled symbolic/non-regular Markdown entries are reported uninspected and never dereferenced; shipped catalogs require regular files. | Warning |
| SYNC tag balance         | Standalone fences must close in reverse opening order with exactly matching full tags | Error |

`--fix` auto-applies removable/renamable fixes only; structural issues are reported for manual repair.

Missing or late Quick Summary headings produce a warning; warnings alone retain exit code 0. SYNC errors produce exit code 1 and identify the tag and physical line. Inline tag mentions in prose are not fences. Fences begin at column 1 and occupy their own line; body validation starts after the closing frontmatter delimiter.

Nested fences and reminder suffixes are valid when the complete tags match:

```markdown
<!-- SYNC:example -->
<!-- SYNC:example:reminder -->
Reminder content.
<!-- /SYNC:example:reminder -->
<!-- /SYNC:example -->
```

An unclosed opener, stray closer, different closing tag, or crossed pair is an error. The validator reports these issues without inserting, removing, or reordering body content, including in `--fix` mode. The script runs directly from an exported skill directory using Node builtins; no root package or hooks loader is required.
