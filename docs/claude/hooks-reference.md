# Hooks Reference

Complete reference for BravoSUITE Claude Code hooks — execution order by event.

## Event Lifecycle

```text
SessionStart (startup | resume | clear | compact)
    │
    ▼
UserPromptSubmit → (route workflows, inject rules, capture feedback)
    │
    ▼
PreToolUse → (validate, block, inject context)
    │
    ▼
[Tool Executes]
    │
    ▼
PostToolUse → (externalize, format, track, learn)
    │
    ▼
Notification / Stop → (system alerts)
    │
    ▼
PreCompact → (save state, prune, mine patterns, write lessons)
    │
    ▼
SessionEnd → (cleanup, write pending-tasks warning)
```

## Execution Order by Event

### SessionStart

Hooks fire in registration order per matcher group.

| Order | Hook | Matcher | Purpose |
|-------|------|---------|---------|
| 1 | `session-init.cjs` | `startup\|resume\|clear\|compact` | Init context, env vars, project detection |
| 2 | `post-compact-recovery.cjs` | `resume\|compact` | Restore workflow state, todos, swap inventory |
| 3 | `session-resume.cjs` | `resume` | Inject pending-tasks warning, restore checkpoint todos |
| 4 | `npm-auto-install.cjs` | `startup` | Auto-install missing npm packages |

### SessionEnd

| Order | Hook | Matcher | Purpose |
|-------|------|---------|---------|
| 1 | `session-end.cjs` | `clear\|exit\|compact` | Write pending-tasks warning, cleanup temp/swap files |
| 2 | `notify-waiting.js` | `clear\|exit\|compact` | System notification |

### UserPromptSubmit

| Order | Hook | Purpose |
|-------|------|---------|
| 1 | `workflow-router.cjs` | Detect intent, inject matching workflow from 29-workflow catalog |
| 2 | `dev-rules-reminder.cjs` | Inject development rules reminder |
| 3 | `lessons-injector.cjs` | Inject `docs/lessons.md` into prompt (with dedup) |
| 4 | `init-reference-docs.cjs` | Scaffold companion reference docs on session start |

### PreToolUse

Multiple matcher groups — hooks in the same group fire in array order.

| Group | Hook | Matcher | Purpose |
|-------|------|---------|---------|
| 1 | `windows-command-detector.cjs` | `Bash` | Detect/block Windows CMD syntax |
| 2a | `scout-block.cjs` | `Bash\|Glob\|Grep\|Read\|Edit\|Write\|NotebookEdit` | Control scope of file access |
| 2b | `privacy-block.cjs` | same | Block sensitive files (.env, keys) |
| 3 | `path-boundary-block.cjs` | `Bash\|Edit\|Write\|MultiEdit\|NotebookEdit` | Block access outside project root |
| 4 | `edit-enforcement.cjs` | `Edit\|Write\|MultiEdit\|NotebookEdit` | Track edits, plan warnings at 4/8 files, block without TaskCreate |
| 5 | `skill-enforcement.cjs` | `Skill` | Block implementation skills without TaskCreate |
| 6 | `code-review-rules-injector.cjs` | `Skill` | Inject code review rules on review skills |
| 6b | `lessons-injector.cjs` | `Edit\|Write\|MultiEdit` | Inject lessons before file edits |
| 7a | `search-before-code.cjs` | `Edit\|Write\|MultiEdit` | Validate search before code changes |
| 7b | `design-system-context.cjs` | same | Inject design tokens for UI files |
| 7c | `code-patterns-injector.cjs` | same | Inject codebase patterns |
| 7d | `backend-csharp-context.cjs` | same | Inject C# patterns for backend files |
| 7e | `frontend-typescript-context.cjs` | same | Inject Angular/TS patterns |
| 7f | `scss-styling-context.cjs` | same | Inject BEM/SCSS patterns |
| 8 | `role-context-injector.cjs` | `Read\|Write` | Inject role-specific context |
| 9 | `figma-context-extractor.cjs` | `Read` | Extract Figma design context |
| 10 | `artifact-path-resolver.cjs` | `Write` | Resolve artifact output paths |
| 11 | `path-boundary-block.cjs` | `mcp__filesystem__*` | Block MCP filesystem access outside project |

### PostToolUse

| Group | Hook | Matcher | Purpose |
|-------|------|---------|---------|
| 1 | `tool-output-swap.cjs` | `Read\|Grep\|Glob` | Externalize large outputs to swap files |
| 2 | `bash-cleanup.cjs` | `Bash` | Clean up tmpclaude temp files |
| 3 | `post-edit-prettier.cjs` | `Edit\|Write\|MultiEdit` | Auto-run Prettier |
| 4 | `todo-tracker.cjs` | `TaskCreate\|TaskUpdate` | Persist todo state to disk |
| 5 | `workflow-step-tracker.cjs` | `Skill` | Track workflow step completion |
| 6 | `tool-counter.cjs` | `Bash\|Edit\|Write\|Read\|Grep\|Glob\|Task` | Count tool calls, suggest /compact |

### PreCompact

| Order | Hook | Matcher | Purpose |
|-------|------|---------|---------|
| 1 | `write-compact-marker.cjs` | `manual\|auto` | Write marker for statusline baseline reset |

### SubagentStart

| Order | Hook | Matcher | Purpose |
|-------|------|---------|---------|
| 1 | `subagent-init.cjs` | `*` | Inject project context and rules |

### Notification

| Order | Hook | Matcher | Purpose |
|-------|------|---------|---------|
| 1 | `notify-waiting.js` | `idle_prompt\|AskUserPrompt` | System notification when waiting |

### Stop

| Order | Hook | Purpose |
|-------|------|---------|
| 1 | `notify-waiting.js` | System notification on response complete |

## State File Reference

| File | Written By | Read By |
|------|-----------|---------|
| `/tmp/ck/markers/{id}.marker.json` | `write-compact-marker`, `session-init` | statusline, `session-end` |
| `/tmp/ck/swap/{id}/*.content` | `tool-output-swap` | `post-compact-recovery`, `session-resume`, `session-end` |
| `/tmp/ck/todo/todo-state-{id}.json` | `todo-tracker` | `edit-enforcement`, `skill-enforcement`, `session-end`, `session-resume` |
| `/tmp/ck/edit/edit-state-{id}.json` | `edit-enforcement`, `todo-tracker` | `edit-enforcement` |
| `/tmp/ck/session/{id}.json` | `ck-session-state` | `edit-enforcement`, `session-init` |
| `/tmp/ck/calibration.json` | `write-compact-marker` | `context-tracker` |
| `.claude/pending-tasks-warning.json` | `session-end` | `session-resume` |
| `plans/reports/memory-checkpoint-*.md` | `post-compact-recovery` | `session-resume` |
| `docs/lessons.md` | `/learn` skill | `lessons-injector` |

## Hook Configuration

**Location:** `.claude/settings.json`

```json
{
  "hooks": {
    "EventName": [{
      "matcher": "Pattern|Regex|*",
      "hooks": [{
        "type": "command",
        "command": "node \"$CLAUDE_PROJECT_DIR\"/.claude/hooks/hook-name.cjs",
        "timeout": 60
      }]
    }]
  }
}
```

**Matcher Patterns:**
- Exact: `Write`, `Edit`, `Bash`
- Pipe-separated: `Edit|Write|MultiEdit`
- Wildcard: `*`
- MCP: `mcp__server__tool`

## Testing

```bash
# Run all hook tests (247 tests)
node .claude/hooks/tests/test-all-hooks.cjs

# Run core lib tests (10 tests)
node .claude/hooks/tests/test-lib-modules.cjs

# Run extended lib tests (stub — 0 tests)
node .claude/hooks/tests/test-lib-modules-extended.cjs

# Total: 257 tests
```

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success, allow operation |
| 1 | Block operation (safety hooks only) |

## Related Documentation

- [hooks/README.md](hooks/README.md) — Hooks catalog with lessons system
- [hooks/architecture.md](hooks/architecture.md) — Hook system architecture
- [hooks/external-memory-swap.md](hooks/external-memory-swap.md) — Swap system detail
- [hooks/extending-hooks.md](hooks/extending-hooks.md) — Creating custom hooks

---

*Source: `.claude/settings.json` | 35 hooks across 9 events | 257 tests | Last updated: 2026-02-28*
