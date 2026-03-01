---
name: context
version: 1.0.0
description: '[Utilities] Load project context for current session'
activation: user-invoked
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ask user whether to skip.

## Quick Summary

**Goal:** Load project context for the current session (git status, branch info, recent changes).

**Workflow:**

1. **Gather** -- Run git status, branch info, recent commits
2. **Analyze** -- Identify current work context and pending changes
3. **Present** -- Summarize context for session awareness

**Key Rules:**

- Provides situational awareness at session start
- Shows branch, uncommitted changes, recent commits
- Non-destructive: read-only operation

# Load Project Context

Load current development context to help with subsequent tasks.

## Git Status

```bash
git status --short
git branch --show-current
```

## Recent Activity

```bash
# Recent commits
git log --oneline -5

# Uncommitted changes
git diff --stat
```

## Project Pattern Discovery

Read `docs/project-config.json` for project-specific service/app paths and patterns. If file not found, discover structure dynamically:

```bash
# Find backend service directories
find src/ -name "*.csproj" -maxdepth 4 | head -20

# Find frontend app directories
find src/ -name "package.json" -maxdepth 3 | head -10

# Find shared libraries
find . -path "*/libs/*" -name "package.json" -maxdepth 4 | head -10
```

## Development Patterns

**Backend:** Clean Architecture + CQRS + Entity Events
**Frontend:** Component framework + state management

## Current Session Focus

Based on the git status, identify:

- What files are being worked on
- What feature/fix is in progress
- Any uncommitted changes that need attention

Summarize the current state to help with subsequent tasks.

---

**IMPORTANT Task Planning Notes (MUST FOLLOW)**

- Always plan and break work into many small todo tasks
- Always add a final review todo task to verify work quality and identify fixes/enhancements
