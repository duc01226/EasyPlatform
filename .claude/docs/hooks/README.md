# Hooks System Documentation

> Hooks organized into subsystems for Claude Code customization.

## Overview

Hooks intercept Claude Code events and inject context, enforce rules, or capture data. Configured in `.claude/settings.json` under the `hooks` key.

## Event Lifecycle

```
Session Start
    │
    ▼
┌───────────────────┐     ┌───────────────────┐
│   SessionStart    │────▶│  SubagentStart    │ (if subagent spawned)
│  (init, inject)   │     │  (inherit state)  │
└───────────────────┘     └───────────────────┘
    │
    ▼
┌───────────────────┐
│ UserPromptSubmit  │◀──── User types message
│ (route, detect)   │
└───────────────────┘
    │
    ▼
┌───────────────────┐     ┌───────────────────┐
│    PreToolUse     │────▶│   PostToolUse     │
│ (block, inject)   │     │ (track, emit)     │
└───────────────────┘     └───────────────────┘
    │                           │
    └───────────────────────────┘
              │
              ▼ (when context full)
┌───────────────────┐
│    PreCompact     │
│ (save, analyze)   │
└───────────────────┘
    │
    ▼ (on /clear or exit)
┌───────────────────┐
│    SessionEnd     │
│    (cleanup)      │
└───────────────────┘
```

## Hook Registration (settings.json)

```json
{
  "hooks": {
    "EventType": [
      {
        "matcher": "pattern",  // regex-like pattern (e.g., "startup|resume", "Edit|Write")
        "hooks": [
          {
            "type": "command",
            "command": "node \"%CLAUDE_PROJECT_DIR%\"/.claude/hooks/hook-name.cjs"
          }
        ]
      }
    ]
  }
}
```

### Matcher Patterns

| Pattern | Matches |
|---------|---------|
| `*` | All events of that type |
| `startup\|resume` | SessionStart with startup OR resume trigger |
| `Edit\|Write\|MultiEdit` | Tool calls for Edit, Write, or MultiEdit |
| `Bash\|Glob\|Grep\|Read` | File operation tools |
| `manual\|auto` | Manual or automatic compaction |

## Subsystems

| Subsystem | Hooks | Purpose | Docs |
|-----------|-------|---------|------|
| [Session](session/) | 4 | Lifecycle management | [session/README.md](session/README.md) |
| [Workflows](workflows.md) | 2 | Intent routing | [workflows.md](workflows.md) |
| [Dev Rules](dev-rules.md) | 5 | Context-aware guidance | [dev-rules.md](dev-rules.md) |
| [Enforcement](enforcement.md) | 5 | Safety & blocking | [enforcement.md](enforcement.md) |

## Hook Inventory

### SessionStart Hooks

| Hook | Matcher | Purpose |
|------|---------|---------|
| `session-init.cjs` | `startup\|resume\|clear\|compact` | Initialize session state, detect project type |
| `session-resume.cjs` | `resume` | Restore todos, checkpoints |
| `post-compact-recovery.cjs` | `resume\|compact` | Recover state after compaction |
| `lessons-injector.cjs` | `startup\|resume` | Inject lessons into context |
| `npm-auto-install.cjs` | `startup` | Auto-install npm dependencies |

### SubagentStart Hooks

| Hook | Matcher | Purpose |
|------|---------|---------|
| `subagent-init.cjs` | `*` | Inherit parent state to subagents |

### UserPromptSubmit Hooks

| Hook | Purpose |
|------|---------|
| `workflow-router.cjs` | Detect intent, route to workflow |
| `dev-rules-reminder.cjs` | Inject development rules based on context |
| `lessons-injector.cjs` | Inject lessons into context |

### PreToolUse Hooks

| Hook | Matcher | Purpose |
|------|---------|---------|
| `windows-command-detector.cjs` | `Bash` | Block Windows-specific commands |
| `scout-block.cjs` | `Bash\|Glob\|Grep\|Read\|Edit\|Write\|NotebookEdit` | Block implementation during scout |
| `privacy-block.cjs` | `Bash\|Glob\|Grep\|Read\|Edit\|Write\|NotebookEdit` | Block access to sensitive files |
| `path-boundary-block.cjs` | `Bash\|Glob\|Grep\|Read\|Edit\|Write\|NotebookEdit` | Block paths outside project |
| `edit-complexity-tracker.cjs` | `Edit\|Write\|MultiEdit` | Track edit complexity pre-operation |
| `todo-enforcement.cjs` | `Skill\|Edit\|Write\|MultiEdit\|NotebookEdit` | Block implementation without todos |
| `code-review-rules-injector.cjs` | `Skill` | Inject code review rules |
| `design-system-context.cjs` | `Edit\|Write\|MultiEdit` | Inject design system context |
| `code-patterns-injector.cjs` | `Edit\|Write\|MultiEdit` | Inject code patterns for context |
| `backend-csharp-context.cjs` | `Edit\|Write\|MultiEdit` | Inject C# patterns for .cs files |
| `frontend-typescript-context.cjs` | `Edit\|Write\|MultiEdit` | Inject TS patterns for frontend |
| `scss-styling-context.cjs` | `Edit\|Write\|MultiEdit` | Inject SCSS patterns |
| `role-context-injector.cjs` | `Read\|Write` | Inject role context for team agents |
| `figma-context-extractor.cjs` | `Read` | Extract Figma design context |
| `artifact-path-resolver.cjs` | `Write` | Resolve team artifact paths to absolute |
| `path-boundary-block.cjs` | `mcp__filesystem__*` | Block MCP filesystem outside project |

### PostToolUse Hooks

| Hook | Matcher | Purpose |
|------|---------|---------|
| `tool-output-swap.cjs` | `Read\|Grep\|Glob` | Swap tool output for context optimization |
| `bash-cleanup.cjs` | `Bash` | Clean up bash output |
| `post-edit-prettier.cjs` | `Edit\|Write\|MultiEdit` | Auto-format edited files |
| `todo-tracker.cjs` | `TaskCreate\|TaskUpdate` | Persist todo state |
| `workflow-step-tracker.cjs` | `Skill` | Track workflow progress |
| `tool-counter.cjs` | `Bash\|Edit\|Write\|Read\|Grep\|Glob\|Task` | Track tool usage counts |
| `notify-waiting.js` | `AskUserQuestion` | Notify user when waiting for input |

### PreCompact Hooks

| Hook | Matcher | Purpose |
|------|---------|---------|
| `write-compact-marker.cjs` | `manual\|auto` | Mark compaction timestamp |

### SessionEnd Hooks

| Hook | Matcher | Purpose |
|------|---------|---------|
| `session-end.cjs` | `clear\|exit\|compact` | Cleanup on session end |
| `notify-waiting.js` | `clear\|exit\|compact` | Final notification |

### Stop Hooks

| Hook | Purpose |
|------|---------|
| `notify-waiting.js` | Notify user when agent stops |

### Notification Hooks

| Hook | Purpose |
|------|---------|
| `notify-waiting.js` | Desktop notifications on idle prompt |

## Lib Modules

Hooks share functionality through `lib/` modules:

| Prefix | Purpose | Modules |
|--------|---------|---------|
| `ck-*` | Claude Kit core | ck-config, ck-config-utils, ck-git, ck-naming, ck-paths, ck-session |
| `si-*` | Session init | si-exec |
| `wr-*` | Workflow router | wr-config |
| `dr-*` | Dev rules | dr-context, dr-paths, dr-template |
| `*-state` | State management | todo-state, edit-state, workflow-state |

## Environment Variables

Hooks receive context via environment variables:

| Variable | Description |
|----------|-------------|
| `CLAUDE_PROJECT_DIR` | Project root directory |
| `TOOL_USE_NAME` | Current tool name (PreToolUse/PostToolUse) |
| `TOOL_USE_INPUT` | Tool input as JSON |
| `SESSION_ID` | Current session identifier |
| `TRIGGER` | Event trigger (startup, resume, clear, compact, manual, auto) |

## Hook Output

Hooks communicate via stdout:

- **Empty output**: No effect
- **Text output**: Injected into Claude's context
- **Exit code 0**: Success (blocking hooks pass)
- **Exit code 2**: Block the operation (PreToolUse only)

---

*See subsystem-specific docs for detailed behavior.*
