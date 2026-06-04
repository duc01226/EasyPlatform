# Quick Start (5 Minutes)

> Get up and running with Claude Code in YourProject

## Prerequisites

| Requirement     | Version | Check Command      |
| --------------- | ------- | ------------------ |
| Claude Code CLI | Latest  | `claude --version` |
| Node.js         | 18+     | `node --version`   |
| Git             | 2.x+    | `git --version`    |

## Step 1: Verify Installation (30 seconds)

```bash
# Check Claude Code
claude --version

# Check Node.js
node --version

# Check Git
git --version
```

**Expected:** All commands return version numbers without errors.

## Step 2: Understand Project Structure (1 minute)

```
.claude/
|-- settings.json     # Main configuration (hooks, features)
|-- skills/           # 156 skills (invoked via / prefix, activated by context)
|-- agents/           # Subagent configurations
|-- hooks/            # 15 top-level hook files + 25 lib modules
|   +-- lib/          # Shared hook libraries
|-- workflows/        # Development rules and workflows
+-- scripts/          # Utility scripts
```

## Step 3: First Commands (2 minutes)

### Check project status

```bash
/watzup
```

Shows current branch, uncommitted changes, and active workflows.

### Get help

```bash
/ck-help
```

Lists all available commands with descriptions.

### Understand a feature

```bash
/scout "how does employee management work"
```

Searches codebase for relevant files and explains functionality.

## Step 4: Common Workflows (1.5 minutes)

### Implement a Feature

```bash
# 1. Create implementation plan
/plan "add dark mode toggle to settings"

# 2. Review plan, approve when ready

# 3. Execute implementation
/feature-implement

# 4. Run tests
/test

# 5. Create pull request
/git/pr
```

### Fix a Bug

```bash
# 1. Diagnose and fix
/fix "login button not responding"

# 2. Review the fix

# 3. Run tests
/test
```

### Investigate Code

```bash
# Quick scan
/scout "where is validation handled"

# Deep investigation
/investigate "how does employee validation work"
```

## Step 5: Understanding Hook Events (Optional)

Claude Code intercepts these event types (there is no `SubagentStart` hook — agent context is static in the agent `.md` files; `PreCompact` has no live hook — recovery is static re-anchoring from `CLAUDE.md` / `SKILL.md`):

| Event              | When It Fires            | Example Hook               |
| ------------------ | ------------------------ | -------------------------- |
| `SessionStart`     | Claude Code starts       | `session-init.cjs`         |
| `SessionEnd`       | Claude Code exits        | `session-end.cjs`          |
| `UserPromptSubmit` | Before each user message | `init-prompt-gate.cjs`     |
| `PostToolUse`      | After tool execution     | `post-edit-prettier.cjs`   |
| `PreToolUse`       | Before tool execution    | `privacy-block.cjs`        |
| `Stop`             | Response complete        | `notifications/notify.cjs` |
| `Notification`     | Idle/waiting events      | `notifications/notify.cjs` |

See [hooks/README.md](./hooks/README.md) for detailed explanations.

## Next Steps

| Goal              | Document                                             |
| ----------------- | ---------------------------------------------------- |
| Browse all skills | [skills/README.md](./skills/README.md)               |
| Understand skills | [skills/README.md](./skills/README.md)               |
| Deep-dive hooks   | [hooks/README.md](./hooks/README.md)                 |
| Configure Claude  | [configuration/README.md](./configuration/README.md) |

## Troubleshooting First Run

| Issue                        | Solution                               |
| ---------------------------- | -------------------------------------- |
| `command not found: claude`  | Reinstall Claude Code CLI, add to PATH |
| `permission denied` on hooks | `chmod +x .claude/hooks/*.cjs`         |
| Hooks not running            | Check `.claude/settings.json` syntax   |
| Context not injected         | Verify hook files exist and are valid  |

### Quick Diagnostics

```bash
# Verify hooks are configured
cat .claude/settings.json | grep -A 10 '"hooks"'

# Test a hook directly
echo '{"hook_event_name":"SessionStart"}' | node .claude/hooks/session-init.cjs

```

For more troubleshooting, see [troubleshooting.md](./troubleshooting.md).

## Key Concepts

### Commands vs Skills

- **Commands** (`/feature-implement`, `/plan`): Explicitly invoked by user with `/` prefix
- **Skills**: Automatically activated based on context keywords

### Lessons System

The system that learns from your interactions:

1. **`/learn` skill**: Appends lessons to `docs/project-reference/lessons.md`
2. **Lessons delivery**: the read-lessons contract is carried statically in `CLAUDE.md` / `SKILL.md`; re-reading those files re-anchors the lessons after compaction (the former runtime inject/recovery hooks were removed)

### Workflow Detection

Claude Code automatically detects intent and suggests workflows:

- "implement X" -> `/plan` -> `/feature-implement` -> `/test`
- "fix X" -> `/fix` -> `/test`
- "review X" -> `/review`

---

_Ready to dive deeper? Start with [skills/README.md](./skills/README.md) or [hooks/README.md](./hooks/README.md)._
