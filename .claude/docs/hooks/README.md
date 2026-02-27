# Hooks System Documentation

> Hooks organized into 5 subsystems for Claude Code customization.

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
| [Patterns](patterns/) | 2 | User pattern learning + lesson injection | [patterns/README.md](patterns/README.md) |
| [Workflows](workflows.md) | 2 | Intent routing | [workflows.md](workflows.md) |
| [Dev Rules](dev-rules.md) | 5 | Context-aware guidance | [dev-rules.md](dev-rules.md) |
| [Enforcement](enforcement.md) | 7 | Safety & blocking | [enforcement.md](enforcement.md) |

## Hook Inventory

### SessionStart Hooks

| Hook | Matcher | Purpose |
|------|---------|---------|
| `session-init.cjs` | `startup\|resume\|clear\|compact` | Initialize session state, detect project type |
| `session-resume.cjs` | `startup\|resume\|compact` | Restore todos, checkpoints |
| `lessons-injector.cjs` | `startup\|resume` | Inject lessons from `docs/lessons.md` |

### SubagentStart Hooks

| Hook | Matcher | Purpose |
|------|---------|---------|
| `subagent-init.cjs` | `*` | Inherit parent state to subagents |
| `role-context-injector.cjs` | `*` | Inject role context for team agents |

### UserPromptSubmit Hooks

| Hook | Purpose |
|------|---------|
| `workflow-router.cjs` | Detect intent, route to workflow |
| `dev-rules-reminder.cjs` | Inject development rules based on context |
| `pattern-learner.cjs` | Learn patterns from user prompts |

### PreToolUse Hooks

| Hook | Matcher | Purpose |
|------|---------|---------|
| `lessons-injector.cjs` | `Edit\|Write\|MultiEdit` | Inject lessons before edits |
| `skill-enforcement.cjs` | `Skill` | Force workflow first — block non-meta skills without tasks |
| `edit-enforcement.cjs` | `Edit\|Write\|MultiEdit\|NotebookEdit` | Block file edits without tasks |
| `cross-platform-bash.cjs` | `Bash` | Block Windows CMD commands, warn on ambiguous patterns |
| `search-before-code.cjs` | `Edit\|Write\|MultiEdit` | Block code edits without prior Grep/Glob search (exit 1) |
| `scout-block.cjs` | `Bash\|Glob\|Grep\|Read\|Edit\|Write` | Block implementation during scout |
| `privacy-block.cjs` | `Bash\|Glob\|Grep\|Read\|Edit\|Write` | Block access to sensitive files |
| `design-system-context.cjs` | `Edit\|Write\|MultiEdit` | Inject design system context |
| `backend-csharp-context.cjs` | `Edit\|Write\|MultiEdit` | Inject C# patterns for .cs files |
| `frontend-typescript-context.cjs` | `Edit\|Write\|MultiEdit` | Inject TS patterns for frontend |
| `scss-styling-context.cjs` | `Edit\|Write\|MultiEdit` | Inject SCSS patterns |
| `artifact-path-resolver.cjs` | `Write` | Resolve team artifact paths to absolute |
| `figma-context-extractor.cjs` | `Read` | Detect Figma URLs in plans, suggest MCP extraction |

### PostToolUse Hooks

| Hook | Matcher | Purpose |
|------|---------|---------|
| `todo-tracker.cjs` | `TodoWrite` | Persist todo state |
| `edit-complexity-tracker.cjs` | `Edit\|Write\|MultiEdit` | Track multi-file operations with soft/strong warnings |
| `post-edit-rule-check.cjs` | `Edit\|Write\|MultiEdit` | Validate edited .cs/.ts files against 6 CLAUDE.md rules (advisory) |
| `auto-fix-trigger.cjs` | `Bash` | Detect build/test failures with 3-tier escalation + error snippets |
| `bash-cleanup.cjs` | `Bash` | Clean up tmpclaude temp files |
| `post-edit-prettier.cjs` | `Edit\|Write` | Auto-format edited files |
| `workflow-step-tracker.cjs` | `Skill` | Track workflow progress |
| `compact-suggestion.cjs` | `Bash\|Read\|Grep\|Glob\|Skill\|Edit\|Write\|MultiEdit\|WebFetch\|WebSearch` | Suggest /compact after 50 calls, then recurring |

### PreCompact Hooks

| Hook | Matcher | Purpose |
|------|---------|---------|
| `write-compact-marker.cjs` | `manual\|auto` | Mark compaction timestamp |
| `save-context-memory.cjs` | `manual\|auto` | Save checkpoint before compaction |

### SessionEnd Hooks

| Hook | Matcher | Purpose |
|------|---------|---------|
| `session-end.cjs` | `clear` | Cleanup on session clear |

### Notification Hooks

| Hook | Purpose |
|------|---------|
| `notifications/notify.cjs` | Desktop notifications (Discord, Slack, Telegram) |

## Lib Modules

Hooks share functionality through `lib/` modules:

| Prefix | Purpose | Modules |
|--------|---------|---------|
| `compact-*` | Context management | compact-state |
| `ck-*` | Claude Kit core | ck-config, ck-config-utils, ck-git, ck-naming, ck-paths, ck-session |
| `si-*` | Session init | si-exec, si-output, si-project, si-python |
| `wr-*` | Workflow router | wr-config, wr-control, wr-detect, wr-output |
| `dr-*` | Dev rules | dr-context, dr-paths, dr-template |
| `lessons-*` | Learning system | lessons-writer (+ frequency scoring via `docs/lessons-freq.json`) |
| `*-state` | State management | todo-state, edit-state, workflow-state, failure-state, verification-state |

## Context Management

Proactive context window management to prevent critical limits.

### compact-suggestion.cjs (PostToolUse)

**Purpose:** Suggests `/compact` after ~50 heavy tool operations.

**Tracked Tools:** Bash, Read, Grep, Glob, Skill, Edit, Write, MultiEdit, WebFetch, WebSearch

**Behavior:**
- Counts tracked tool calls per session
- One-time suggestion at threshold (50 calls)
- Auto-resets when /compact detected
- Fail-open design (never blocks operations)

**State Management:**
- Uses `lib/compact-state.cjs` for persistent tracking
- State file: `.claude/.compact-state.json`
- 24h TTL, auto-reset on size overflow (50KB max)

**Testing:**
```bash
CK_DEBUG=1 echo '{"tool_name":"Read"}' | node .claude/hooks/compact-suggestion.cjs
```

**Debug Mode:** Set `CK_DEBUG=1` for verbose logging.

---

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
