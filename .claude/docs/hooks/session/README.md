# Session Lifecycle Documentation

> Manages session state, initialization, resume, and cleanup.

## Overview

Session hooks handle Claude Code lifecycle events: starting sessions, resuming from checkpoints, subagent inheritance, and cleanup.

## State Machine

```
                  ┌─────────────┐
                  │   NEW       │
                  └──────┬──────┘
                         │ user starts claude
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                     SessionStart                             │
│  ┌──────────────┬──────────────┬─────────────┬────────────┐ │
│  │   startup    │   resume     │   clear     │  compact   │ │
│  │ (fresh)      │ (continue)   │ (/clear)    │ (memory)   │ │
│  └──────┬───────┴──────┬───────┴──────┬──────┴──────┬─────┘ │
└─────────┼──────────────┼──────────────┼─────────────┼───────┘
          │              │              │             │
          ▼              ▼              ▼             ▼
    ┌──────────┐   ┌──────────┐   ┌──────────┐  ┌──────────┐
    │  ACTIVE  │   │  ACTIVE  │   │  ACTIVE  │  │ COMPACT  │
    │ (todos=0)│   │ (todos=N)│   │ (clean)  │  │(preserve)│
    └────┬─────┘   └────┬─────┘   └──────────┘  └────┬─────┘
         │              │                            │
         └──────────────┴────────────────────────────┘
                        │
                        ▼ (user exits or /clear)
                  ┌──────────┐
                  │SessionEnd│
                  │ (clear)  │
                  └──────────┘
```

## Hooks

| Hook | Matcher | Purpose |
|------|---------|---------|
| `session-init.cjs` | `startup\|resume\|clear\|compact` | Project detection, env setup |
| `session-resume.cjs` | `resume` | Todo/checkpoint restoration |
| `session-end.cjs` | `clear\|exit\|compact` | Cleanup session state |
| `subagent-init.cjs` | `*` | Inherit parent state |

## Hook Details

### session-init.cjs

**Triggers**: All session start types.

**Responsibilities**:
1. Detect project type (monorepo, single-repo, npm, dotnet, etc.)
2. Set environment variables (`CK_PROJECT_TYPE`, `CK_GIT_BRANCH`, etc.)
3. Generate session context output (injected into Claude)

**Output example**:
```
SessionStart:compact hook success: Session compact. Project: single-repo | PM: npm | Plan naming: {date}-{issue}-{slug}
```

**Modules used**:
- `si-exec.cjs` - Command execution

### session-resume.cjs

**Triggers**: startup, resume, compact (not clear).

**Responsibilities**:
1. Restore todo state from `.todo-state.json`
2. Restore checkpoint context from `plans/reports/`
3. Set `CK_RESUMED_TODOS` environment variable

**Checkpoint restoration**:
- Looks for memory checkpoints < 24 hours old
- Restores todo list from checkpoint
- Injects checkpoint summary into context

### session-end.cjs

**Triggers**: clear only.

**Responsibilities**:
1. Archive current session state
2. Clear transient state files
3. Log session statistics

### subagent-init.cjs

**Triggers**: All subagent starts.

**Responsibilities**:
1. Inherit parent todo state
2. Inherit plan context
3. Set subagent-specific environment variables

**Environment inherited**:
- `CK_PARENT_SESSION_ID`
- `CK_TODO_STATE` (serialized)
- `CK_PLAN_PATH`

## Storage

| File | Purpose |
|------|---------|
| `.claude/.ck.json` | Main session state (project type, branch, settings) |
| `.claude/.todo-state.json` | Persistent todo list |
| `.claude/.workflow-state.json` | Workflow progress tracking |
| `.claude/.edit-state.json` | Edit operation tracking |

### .ck.json Schema

```json
{
  "session_id": "abc123",
  "project_type": "single-repo",
  "package_manager": "npm",
  "framework": "angular",
  "git_branch": "main",
  "last_compact": "2026-01-13T09:00:00Z",
  "plan_path": "plans/260113-feature/"
}
```

### .todo-state.json Schema

```json
{
  "timestamp": "2026-01-13T09:00:00Z",
  "todos": [
    {
      "content": "Implement feature X",
      "status": "in_progress",
      "activeForm": "Implementing feature X"
    }
  ]
}
```

## Environment Variables

Set by session hooks:

| Variable | Source | Description |
|----------|--------|-------------|
| `CK_PROJECT_TYPE` | session-init | single-repo, monorepo, unknown |
| `CK_PACKAGE_MANAGER` | session-init | npm, yarn, pnpm, dotnet |
| `CK_GIT_BRANCH` | session-init | Current git branch |
| `CK_FRAMEWORK` | session-init | angular, react, dotnet, etc. |
| `CK_SESSION_TYPE` | payload | startup, resume, clear, compact |
| `CK_RESUMED_TODOS` | session-resume | "true" if todos restored |
| `CK_PLAN_PATH` | session-init | Active plan directory |

## Lib Modules

| Module | Purpose |
|--------|---------|
| `ck-config.cjs` | Load/parse .ck.json |
| `ck-config-utils.cjs` | Configuration utilities |
| `ck-git.cjs` | Git information extraction |
| `ck-naming.cjs` | Naming convention helpers |
| `ck-paths.cjs` | Path resolution |
| `ck-session-state.cjs` | Session state management |
| `si-exec.cjs` | Safe command execution |

## Checkpoint System

During PreCompact, checkpoints are created:

```markdown
# Context Memory Checkpoint

## Session Info
- **Timestamp:** 2026-01-13T09:00:00Z
- **Session ID:** abc123
- **Branch:** main

## Todo List State
- **Total Tasks:** 5
- **Pending:** 2
- **In Progress:** 1
- **Completed:** 2

### Active Todos
1. [x] Research existing code
2. [x] Design solution
3. [~] Implement feature
4. [ ] Write tests
5. [ ] Update documentation
```

Checkpoint location: `plans/reports/memory-checkpoint-{timestamp}.md`

## Debugging

View current session state:
```bash
cat .claude/.ck.json | jq
```

View todo state:
```bash
cat .claude/.todo-state.json | jq '.todos'
```

Check session hooks:
```bash
# List session hooks in settings
cat .claude/settings.json | jq '.hooks.SessionStart'
```

---

*See also: [Hooks Overview](../README.md)*
