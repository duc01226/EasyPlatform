# Enforcement & Safety Documentation

> Blocks unsafe or out-of-scope operations.

## Overview

Enforcement hooks prevent unsafe operations, enforce workflow rules, and ensure code quality. They can block tool execution by exiting with code 2.

## Hooks

| Hook | Trigger | Purpose |
|------|---------|---------|
| `todo-enforcement.cjs` | PreToolUse (Skill) | Block implementation without todos |
| `scout-block.cjs` | PreToolUse (Bash\|Glob\|Grep\|Read\|Edit\|Write) | Block implementation during scout |
| `privacy-block.cjs` | PreToolUse (Bash\|Glob\|Grep\|Read\|Edit\|Write) | Block access to sensitive files |
| `cross-platform-bash.cjs` | PreToolUse (Bash) | Warn about Windows-specific commands |
| `post-edit-prettier.cjs` | PostToolUse (Edit\|Write) | Auto-format edited files |

## Hook Details

### todo-enforcement.cjs

**Purpose**: Ensures todos exist before running implementation skills.

**Blocked skills** (require todos):
- `/cook`, `/fix`, `/code`, `/feature`, `/implement`
- `/test`, `/debug`, `/code-review`, `/commit`

**Allowed skills** (no todos required):
- `/scout`, `/scout:ext`, `/investigate`, `/research`, `/explore`
- `/plan`, `/plan:fast`, `/plan:hard`, `/plan:validate`
- `/watzup`, `/checkpoint`, `/kanban`

**Bypass**: Use `quick:` prefix: `quick: add a button`

**Output on block**:
```
BLOCKED: Implementation skill requires active todos

Use TodoWrite tool first, or prefix with "quick:" to bypass.

Detected skill: /cook
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
| 2 | Block operation (PreToolUse only) |

Only PreToolUse hooks can block operations. PostToolUse hooks always exit 0.

## Lib Modules

| Module | Purpose |
|--------|---------|
| `todo-state.cjs` | Check if todos exist |
| `edit-state.cjs` | Track edit operations |

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
echo '{"tool_name":"Skill","tool_input":{"skill":"cook"}}' | node .claude/hooks/todo-enforcement.cjs
echo $?  # Exit code: 0=allowed, 2=blocked
```

View todo state:
```bash
cat .claude/.todo-state.json | jq '.todos | length'
```

---

*See also: [Session Lifecycle](session/) for todo state management*
