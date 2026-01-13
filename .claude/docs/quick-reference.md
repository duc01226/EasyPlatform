# Quick Reference Card

> Essential Claude Code commands, shortcuts, and patterns at a glance.

## Common Commands

| Command | Description |
|---------|-------------|
| `/plan` | Create implementation plan |
| `/plan:hard` | Comprehensive plan with research |
| `/cook` | Implement current task |
| `/fix` | Fix bug or issue |
| `/scout` | Find relevant files |
| `/investigate` | Deep investigation |
| `/test` | Run or generate tests |
| `/commit` | Stage and commit changes |
| `/pr` | Create pull request |
| `/review` | Code review |
| `/watzup` | Session status summary |

## Quick Bypasses

| Prefix | Effect |
|--------|--------|
| `quick:` | Skip workflow detection |
| `/command` | Direct command execution |

## Workflow Detection

```
Feature → /plan → /plan:review → /cook → /simplify → /review → /test → /docs → /watzup
Bug Fix → /scout → /investigate → /debug → /plan → /plan:review → /fix → /simplify → /review → /test
Refactor → /plan → /plan:review → /code → /simplify → /review → /test
Docs → /scout → /investigate → /docs-update → /watzup
```

## Hook Events

| Event | When |
|-------|------|
| `SessionStart` | startup, resume, clear, compact |
| `SubagentStart` | Agent spawned |
| `UserPromptSubmit` | User sends message |
| `PreToolUse` | Before tool executes |
| `PostToolUse` | After tool completes |
| `PreCompact` | Before context compaction |
| `SessionEnd` | Session terminates |

## Key Files

| File | Purpose |
|------|---------|
| `settings.json` | Hooks, permissions, plugins |
| `.ck.json` | Project config, assertions |
| `.mcp.json` | MCP server configuration |
| `workflows.json` | Workflow definitions |

## Agent Types

| Type | Use For |
|------|---------|
| `researcher` | Technology research |
| `scout` | Codebase exploration |
| `planner` | Implementation planning |
| `fullstack-developer` | Code implementation |
| `code-reviewer` | Code review |
| `tester` | Test validation |
| `debugger` | Issue investigation |
| `git-manager` | Git operations |

## ACE Constants

| Constant | Value |
|----------|-------|
| `MAX_DELTAS` | 50 |
| `CONFIDENCE_THRESHOLD` | 0.80 |
| `SIMILARITY_THRESHOLD` | 0.85 |
| `STALE_DAYS` | 90 |
| `MAX_INJECTION_TOKENS` | 500 |

## Pattern Matching Weights

| Factor | Weight |
|--------|--------|
| File path match | 40% |
| Category match | 20% |
| Keyword match | 20% |
| Tag match | 10% |
| Confidence | 10% |

## Permissions Format

```
Tool(pattern)     # Match tool with pattern
Bash(git:*)       # All git commands
Edit(**/.env*)    # Block env files
Read              # All reads
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `CLAUDE_PROJECT_DIR` | Project root |
| `CLAUDE_SESSION_ID` | Session ID |
| `CLAUDE_TOOL_NAME` | Current tool |
| `CLAUDE_COMPACT_REASON` | Why compact triggered |

## Exit Codes (Hooks)

| Code | Meaning |
|------|---------|
| `0` | Success/Allow |
| `2` | Block (PreToolUse only) |

## Storage Locations

| Type | Path |
|------|------|
| Deltas | `.claude/memory/deltas.json` |
| Candidates | `.claude/memory/delta-candidates.json` |
| Patterns | `.claude/memory/learned-patterns/*.yaml` |
| Todo State | `.claude/.todo-state.json` |
| Workflow State | `.claude/.workflow-state.json` |

## Skill Categories

| Category | Examples |
|----------|----------|
| Development | `backend-development`, `frontend-angular-*` |
| Architecture | `api-design`, `arch-security-review` |
| AI | `ai-multimodal`, `mcp-builder` |
| Testing | `debugging`, `code-review` |
| DevOps | `devops`, `database-optimization` |
| Documentation | `docs-seeker`, `feature-docs` |

## Common Patterns

### Start Implementation
```
1. Create todos with TodoWrite
2. Run /plan or /plan:hard
3. Get approval
4. Run /cook
```

### Debug Issue
```
1. /scout to find files
2. /investigate to understand
3. /debug for root cause
4. /fix to resolve
```

### Code Review
```
1. /review or /review/changes
2. Address feedback
3. /commit
```

---

*Full documentation: [README](README.md)*

