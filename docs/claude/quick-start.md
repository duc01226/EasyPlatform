# Quick Start (5 Minutes)

> Get up and running with Claude Code in BravoSUITE

## Prerequisites

| Requirement | Version | Check Command |
|-------------|---------|---------------|
| Claude Code CLI | Latest | `claude --version` |
| Node.js | 18+ | `node --version` |
| Git | 2.x+ | `git --version` |

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
|-- commands/         # 95 slash commands (/cook, /plan, etc.)
|-- skills/           # 73 domain skills (activated by context)
|-- agents/           # Subagent configurations
|-- hooks/            # 26 event hooks + 39 lib modules
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
/cook

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
/feature-investigation "how does employee validation work"
```

## Step 5: Understanding Hook Events (Optional)

Claude Code intercepts 8 event types:

| Event | When It Fires | Example Hook |
|-------|---------------|--------------|
| `SessionStart` | Claude Code starts | `session-init.cjs` |
| `SessionStop` | Claude Code exits | `session-end.cjs` |
| `UserPromptSubmit` | Before each user message | `lessons-injector.cjs` |
| `PostToolUse` | After tool execution | `tool-output-swap.cjs` |
| `PreToolUse` | Before tool execution | `privacy-block.cjs` |
| `PreCompact` | Before context compaction | `write-compact-marker.cjs` |
| `SessionResume` | After compaction recovery | `post-compact-recovery.cjs` |
| `SubagentStart` | Subagent initialization | `subagent-init.cjs` |

See [hooks/README.md](./hooks/README.md) for detailed explanations.

## Next Steps

| Goal | Document |
|------|----------|
| Browse all skills | [skills/README.md](./skills/README.md) |
| Understand skills | [skills/README.md](./skills/README.md) |
| Deep-dive hooks | [hooks/architecture.md](./hooks/architecture.md) |
| Configure Claude | [configuration/README.md](./configuration/README.md) |

## Troubleshooting First Run

| Issue | Solution |
|-------|----------|
| `command not found: claude` | Reinstall Claude Code CLI, add to PATH |
| `permission denied` on hooks | `chmod +x .claude/hooks/*.cjs` |
| Hooks not running | Check `.claude/settings.json` syntax |
| Context not injected | Verify hook files exist and are valid |

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

- **Commands** (`/cook`, `/plan`): Explicitly invoked by user with `/` prefix
- **Skills**: Automatically activated based on context keywords

### Lessons System

The system that learns from your interactions:
1. **`/learn` skill**: Appends lessons to `docs/lessons.md`
2. **`lessons-injector.cjs` hook**: Injects lessons on prompts and edits

### Workflow Detection

Claude Code automatically detects intent and suggests workflows:
- "implement X" -> `/plan` -> `/cook` -> `/test`
- "fix X" -> `/fix` -> `/test`
- "review X" -> `/review`

---

*Ready to dive deeper? Start with [skills/README.md](./skills/README.md) or [hooks/README.md](./hooks/README.md).*
