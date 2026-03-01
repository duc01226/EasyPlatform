# Quick Reference Card

> Essential Claude Code commands, shortcuts, and patterns at a glance.

## Common Commands

| Command                  | Description                      |
| ------------------------ | -------------------------------- |
| `/plan`                  | Create implementation plan       |
| `/plan-hard`             | Comprehensive plan with research |
| `/cook`                  | Implement current task           |
| `/fix`                   | Fix bug or issue                 |
| `/scout`                 | Find relevant files              |
| `/feature-investigation` | Deep investigation               |
| `/test`                  | Run or generate tests            |
| `/commit`                | Stage and commit changes         |
| `/pr`                    | Create pull request              |
| `/review`                | Code review                      |
| `/watzup`                | Session status summary           |

## Quick Bypasses

| Prefix     | Effect                   |
| ---------- | ------------------------ |
| `quick:`   | Skip workflow detection  |
| `/command` | Direct command execution |

## Workflow Detection

```
Feature → /scout → /investigate → /plan → /plan-review → /plan-validate → /why-review → /cook → /code-simplifier → /review-changes → /code-review → /sre-review → /changelog → /test → /docs-update → /watzup
Bug Fix → /scout → /investigate → /debug → /plan → /plan-review → /plan-validate → /why-review → /fix → /code-simplifier → /review-changes → /code-review → /changelog → /test → /watzup
Refactor → /scout → /investigate → /plan → /plan-review → /plan-validate → /why-review → /code → /code-simplifier → /review-changes → /code-review → /sre-review → /changelog → /test → /watzup
Docs → /scout → /investigate → /plan → /plan-review → /plan-validate → /docs-update → /review-changes → /review-post-task → /watzup
```

## Hook Events

| Event              | When                            |
| ------------------ | ------------------------------- |
| `SessionStart`     | startup, resume, clear, compact |
| `SubagentStart`    | Agent spawned                   |
| `UserPromptSubmit` | User sends message              |
| `PreToolUse`       | Before tool executes            |
| `PostToolUse`      | After tool completes            |
| `PreCompact`       | Before context compaction       |
| `SessionEnd`       | Session terminates              |

## Key Files

| File             | Purpose                     |
| ---------------- | --------------------------- |
| `settings.json`  | Hooks, permissions, plugins |
| `.ck.json`       | Project config, assertions  |
| `.mcp.json`      | MCP server configuration    |
| `workflows.json` | Workflow definitions        |

## Agent Types

| Type                  | Use For                 |
| --------------------- | ----------------------- |
| `researcher`          | Technology research     |
| `scout`               | Codebase exploration    |
| `planner`             | Implementation planning |
| `fullstack-developer` | Code implementation     |
| `code-reviewer`       | Code review             |
| `tester`              | Test validation         |
| `debugger`            | Issue investigation     |
| `git-manager`         | Git operations          |

## Permissions Format

```
Tool(pattern)     # Match tool with pattern
Bash(git:*)       # All git commands
Edit(**/.env*)    # Block env files
Read              # All reads
```

## Environment Variables

| Variable                | Description           |
| ----------------------- | --------------------- |
| `CLAUDE_PROJECT_DIR`    | Project root          |
| `CLAUDE_SESSION_ID`     | Session ID            |
| `CLAUDE_TOOL_NAME`      | Current tool          |
| `CLAUDE_COMPACT_REASON` | Why compact triggered |

## Exit Codes (Hooks)

| Code | Meaning                 |
| ---- | ----------------------- |
| `0`  | Success/Allow           |
| `2`  | Block (PreToolUse only) |

## Storage Locations

| Type           | Path                                     |
| -------------- | ---------------------------------------- |
| Lessons        | `docs/lessons.md`                        |
| Todo State     | `.claude/.todo-state.json`               |
| Workflow State | `.claude/.workflow-state.json`           |

## Skill Categories

| Category      | Examples                                     |
| ------------- | -------------------------------------------- |
| Development   | `frontend-design`, `api-design` |
| Architecture  | `api-design`, `arch-security-review`         |
| AI            | `ai-multimodal`, `mcp-builder`               |
| Testing       | `debug`, `code-review`                       |
| DevOps        | `devops`, `database-optimization`            |
| Documentation | `docs-seeker`, `feature-docs`                |

## Common Patterns

### Start Implementation

```
1. Create tasks with TaskCreate
2. Run /plan or /plan-hard
3. Get approval
4. Run /cook
```

### Debug Issue

```
1. /scout to find files
2. /feature-investigation to understand
3. /debug for root cause
4. /fix to resolve
```

### Code Review

```
1. /review or /review-changes
2. Address feedback
3. /commit
```

---

*Full documentation: [README](README.md)*
