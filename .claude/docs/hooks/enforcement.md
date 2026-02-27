# Enforcement & Safety Documentation

> Blocks unsafe or out-of-scope operations.

## Overview

Enforcement hooks prevent unsafe operations, enforce workflow rules, and ensure code quality. They can block tool execution by exiting with code 2.

## Hooks

| Hook | Trigger | Purpose |
|------|---------|---------|
| `skill-enforcement.cjs` | PreToolUse (Skill) | Block non-meta skills without tasks (force workflow first) |
| `edit-enforcement.cjs` | PreToolUse (Edit\|Write\|MultiEdit\|NotebookEdit) | Block file edits without tasks |
| `search-before-code.cjs` | PreToolUse (Edit\|Write\|MultiEdit) | Block code edits without prior search (exit 1) |
| `scout-block.cjs` | PreToolUse (Bash\|Glob\|Grep\|Read\|Edit\|Write) | Block implementation during scout |
| `privacy-block.cjs` | PreToolUse (Bash\|Glob\|Grep\|Read\|Edit\|Write) | Block access to sensitive files |
| `cross-platform-bash.cjs` | PreToolUse (Bash) | Warn about Windows-specific commands |
| `post-edit-rule-check.cjs` | PostToolUse (Edit\|Write\|MultiEdit) | Advisory: detect CLAUDE.md rule violations in edited files |
| `post-edit-prettier.cjs` | PostToolUse (Edit\|Write) | Auto-format edited files |

## Hook Details

### skill-enforcement.cjs

**Purpose**: Enforces "force workflow first" — ALL non-meta skills require active tasks.

**Design intent**: Workflow activation → TaskCreate → then skills. No skill runs without task tracking (except meta).

**Always allowed** (META_SKILLS — no workflow/tasks required):
- `/help`, `/memory`, `/memory-management`, `/checkpoint`, `/recover`, `/context`
- `/ck-help`, `/watzup`, `/compact`, `/kanban`, `/coding-level`
- `/workflow-start` (always allowed — entry point)

**Blocked without tasks** (everything else):
- Research: `/scout`, `/investigate`, `/plan`, `/research`
- Implementation: `/cook`, `/fix`, `/code`, `/feature`
- Testing: `/test`, `/debug`, `/code-review`, `/commit`

**Bypass**: `CK_QUICK_MODE=true` or `quick:` prefix

**Output on block**:
```
## Workflow Task Enforcement Block

Skill blocked: cook
Call TaskCreate for EACH workflow step BEFORE executing any skill.
```

### edit-enforcement.cjs

**Purpose**: Blocks file modifications without active tasks.

**Blocked tools**: `Edit`, `Write`, `MultiEdit`, `NotebookEdit`

**Exempt paths**: `.claude/hooks/`, `.claude/skills/`, `plans/`, `.json`, `.md`

**Bypass**: `CK_QUICK_MODE=true`

**Output on block**:
```
## Task Tracking Enforcement

Blocked: Edit on src/app/feature.component.ts
File modifications require task tracking.
```

### scout-block.cjs

**Purpose**: Prevents implementation during scout/research mode.

**When active**: During `/scout` or `/investigate` execution

**Blocked operations**:
- Edit, Write, MultiEdit tools
- Overly broad glob patterns (e.g., `**/*.ts`)

**Output on block**:
```
BLOCKED: Implementation not allowed during scout mode

Current mode: /scout
Attempted: Edit

Complete research first, then switch to implementation.
```

### privacy-block.cjs

**Purpose**: Prevents access to sensitive files.

**Blocked patterns**:
- `.env*` files
- `**/secrets/**`
- `**/credentials*`
- `~/.ssh/**`, `~/.aws/**`

**Output on block**:
```
BLOCKED: Access to sensitive file denied

File: .env.local
Reason: Environment files may contain secrets
```

### cross-platform-bash.cjs

**Purpose**: Warns about Windows-specific commands that fail in Git Bash.

**Detected issues**:
- `> nul` (creates "nul" file in Git Bash)
- `dir /b /s` (use `find` instead)
- Backslash paths

**Output (warning, not block)**:
```
WARNING: Windows-specific command detected

Command: dir /b /s path
Issue: "dir /b" doesn't work in Git Bash

Portable alternative:
  find "path" -type f
```

### search-before-code.cjs

**Purpose**: Enforces "search existing patterns first" before non-trivial code modifications.

**Dynamic threshold by extension**:
- `.cs`, `.ts` → **10 lines** (strict — primary codebase languages)
- `.html`, `.scss`, `.tsx`, `.css`, `.sass` → **20 lines** (default)

**Exempt paths**: `.claude/`, `plans/`, `docs/`, `.md`, `node_modules/`, `dist/`, `obj/`, `bin/`

**Evidence sources** (checked in order):
1. `CK_SEARCH_PERFORMED=1` env var (cached from prior Grep/Glob)
2. Transcript tail (last 100 lines) for `<invoke name="Grep">` or `<invoke name="Glob">`

**Bypass**: "skip search" / "no search" / "just do it" keywords, or `CK_SKIP_SEARCH_CHECK=1`

**Exit code**: **1** to block (not 2 — this is a PreToolUse hook but uses exit 1)

### post-edit-rule-check.cjs

**Purpose**: Validates edited `.cs`/`.ts` files against 6 CLAUDE.md golden rules post-edit.

**Behavior**:
1. Reads the actual file from disk after edit
2. Matches against 6 rule patterns (positive regex + optional negative regex)
3. Session dedup — same rule on same file fires only once per session
4. Tracks violation metrics in `violation-metrics.json`

**Rules**: `raw-httpclient`, `missing-untilDestroyed`, `throw-validation`, `side-effect-in-handler`, `dto-mapping-in-handler`, `raw-component`

**Advisory only** — never blocks (always exits 0).

### post-edit-prettier.cjs

**Purpose**: Auto-formats files after editing.

**Triggers**: PostToolUse for Edit, Write

**Behavior**:
1. Checks if file type is supported by Prettier
2. Runs `npx prettier --write <file>`
3. Silent on success, logs errors

**Supported files**: `.ts`, `.tsx`, `.js`, `.jsx`, `.json`, `.css`, `.scss`, `.md`, `.html`

## Exit Codes

| Exit Code | Meaning |
|-----------|---------|
| 0 | Success (allow operation) |
| 1 | Block operation (skill-enforcement, edit-enforcement, search-before-code) |

Only PreToolUse hooks can block operations. PostToolUse hooks always exit 0.

## Lib Modules

| Module | Purpose |
|--------|---------|
| `todo-state.cjs` | Check if todos exist |
| `edit-state.cjs` | Track edit operations |
| `failure-state.cjs` | Track consecutive build/test failures per session |

## Configuration in settings.json

```json
{
  "permissions": {
    "deny": [
      "Edit(**/.env*)",
      "Read(**/.env*)",
      "Write(**/secrets/**)"
    ]
  }
}
```

Note: `permissions.deny` works alongside privacy-block.cjs for defense in depth.

## Debugging

Check if blocked:
```bash
# Run hook manually with mock payload
echo '{"tool_name":"Skill","tool_input":{"skill":"cook"}}' | node .claude/hooks/skill-enforcement.cjs
echo $?  # Exit code: 0=allowed, 1=blocked
```

View todo state:
```bash
cat .claude/.todo-state.json | jq '.todos | length'
```

---

*See also: [Session Lifecycle](session/) for todo state management*
