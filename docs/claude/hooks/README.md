# Hooks Reference

> 35 hooks + 18 lib modules for context-aware AI behavior

## Overview

Hooks are Node.js scripts (`.cjs`) that execute at specific Claude Code lifecycle events, enabling automated context injection, lessons injection, workflow enforcement, and safety controls.

```
SessionStart hooks → UserPromptSubmit hooks → PreToolUse hooks → [Tool runs] → PostToolUse hooks
       ↓                    ↓                       ↓                                ↓
  Init state         Route workflows          Validate/block              Track outcomes
  Load patterns      Capture feedback         Inject context              Learn patterns
  Inject deltas      Detect corrections       Enforce rules               Format outputs
```

## Hook Events

| Event | Trigger | Hooks | Use Cases |
|-------|---------|-------|-----------|
| `SessionStart` | Session begins/resumes | 4 | Init state, recover from compaction, resume context |
| `SessionEnd` | Session ends | 2 | Save state, cleanup temp/swap files, write pending-tasks warning |
| `UserPromptSubmit` | Before processing user input | 4 | Route workflows, inject rules, inject lessons, init reference docs |
| `PreToolUse` | Before tool execution | 18 hooks (11 groups) | Block sensitive ops, inject context, enforce plans/todos |
| `PostToolUse` | After tool completes | 6 | Externalize outputs, format code, track events, count tools |
| `PreCompact` | Before context compaction | 1 | Write compaction marker |
| `SubagentStart` | Subagent spawning | 1 | Configure subagent with parent context |
| `Notification` | Idle/waiting events | 1 | System notifications |
| `Stop` | Response complete | 1 | System notifications |

---

## Hook Catalog

### Session Lifecycle

| Hook | Event | Matcher | Purpose |
|------|-------|---------|---------|
| `session-init.cjs` | SessionStart | `startup\|resume\|clear\|compact` | Initialize session: detect project, write env vars |
| `post-compact-recovery.cjs` | SessionStart | `resume\|compact` | Restore workflow state, todos, and swap inventory after compaction |
| `session-resume.cjs` | SessionStart | `resume` | Inject pending-tasks warning from prev session, restore todos from checkpoint |
| `npm-auto-install.cjs` | SessionStart | `startup` | Auto-install missing npm packages from root `package.json` |
| `session-end.cjs` | SessionEnd | `clear\|exit\|compact` | Write pending-tasks warning, cleanup temp/swap files, delete markers |
| `notify-waiting.js` | SessionEnd, Stop, Notification | various | System notification when Claude is waiting for input |
| `subagent-init.cjs` | SubagentStart | `*` | Inject project context, rules, and workflow state into subagent sessions |

### Context Injection (PreToolUse)

| Hook | Matcher | Purpose |
|------|---------|---------|
| `backend-csharp-context.cjs` | `Edit\|Write\|MultiEdit` | Inject C#/CQRS patterns when editing backend files |
| `frontend-typescript-context.cjs` | `Edit\|Write\|MultiEdit` | Inject Angular/TS patterns when editing frontend files |
| `design-system-context.cjs` | `Edit\|Write\|MultiEdit` | Inject design tokens when editing UI components |
| `scss-styling-context.cjs` | `Edit\|Write\|MultiEdit` | Inject BEM/SCSS patterns when editing style files |
| `code-patterns-injector.cjs` | `Edit\|Write\|MultiEdit` | Inject discovered codebase patterns before edits |
| `search-before-code.cjs` | `Edit\|Write\|MultiEdit` | Validate search was performed before code changes |
| `role-context-injector.cjs` | `Read\|Write` | Inject role-specific context (PO, BA, QA, etc.) |
| `figma-context-extractor.cjs` | `Read` | Extract and inject Figma design context |
| `code-review-rules-injector.cjs` | `Skill` | Inject BravoSUITE code review rules on review skill activation |
| `artifact-path-resolver.cjs` | `Write` | Resolve correct artifact output paths (plans/, reports/) |

### Lessons Injection

| Hook | Event | Purpose |
|------|-------|---------|
| `lessons-injector.cjs` | UserPromptSubmit | Inject `docs/lessons.md` into prompt (with dedup) |
| `lessons-injector.cjs` | PreToolUse:`Edit\|Write\|MultiEdit` | Inject lessons before file edits (always) |

Lessons are managed via `/learn` skill. See `.claude/skills/learn/SKILL.md`.

### Workflow Automation

| Hook | Event | Purpose |
|------|-------|---------|
| `workflow-router.cjs` | UserPromptSubmit | Detect intent, inject matching workflow from 29-workflow catalog |
| `dev-rules-reminder.cjs` | UserPromptSubmit | Inject development rules reminder on each prompt |
| `init-reference-docs.cjs` | UserPromptSubmit | Scaffold companion reference docs on session start |
| `workflow-step-tracker.cjs` | PostToolUse:`Skill` | Track workflow step completion |
| `edit-enforcement.cjs` | PreToolUse:`Edit\|Write\|MultiEdit\|NotebookEdit` | Track edits, plan warnings at 4/8 files, block without TaskCreate |
| `skill-enforcement.cjs` | PreToolUse:`Skill` | Block implementation skills without TaskCreate |
| `todo-tracker.cjs` | PostToolUse:`TaskCreate\|TaskUpdate` | Persist todo state to disk for cross-compaction recovery |

### Safety & Privacy

| Hook | Matcher | Purpose |
|------|---------|---------|
| `path-boundary-block.cjs` | `Bash\|Edit\|Write\|MultiEdit\|NotebookEdit` | Block file access outside project root (security-critical) |
| `privacy-block.cjs` | `Bash\|Glob\|Grep\|Read\|Edit\|Write\|NotebookEdit` | Block access to sensitive files (.env, keys, credentials) |
| `scout-block.cjs` | `Bash\|Glob\|Grep\|Read\|Edit\|Write\|NotebookEdit` | Prevent bulk reads outside approved scope |
| `windows-command-detector.cjs` | `Bash` | Detect/block Windows CMD syntax in Git Bash environment |

### Context Management & Utility

| Hook | Event | Purpose |
|------|-------|---------|
| `tool-output-swap.cjs` | PostToolUse:`Read\|Grep\|Glob` | Externalize large outputs to swap files (see [External Memory Swap](./external-memory-swap.md)) |
| `write-compact-marker.cjs` | PreCompact | Write compaction marker for statusline baseline reset |
| `post-edit-prettier.cjs` | PostToolUse:`Edit\|Write\|MultiEdit` | Auto-run Prettier on edited files |
| `bash-cleanup.cjs` | PostToolUse:`Bash` | Clean up tmpclaude temp files after Bash commands |
| `tool-counter.cjs` | PostToolUse:`Bash\|Edit\|Write\|Read\|Grep\|Glob\|Task` | Count tool calls, suggest /compact at thresholds |

---

## Lessons System

The lessons system is a simple manual learning mechanism:

```
USER TEACHING                         INJECTION
/learn "always use X"                 UserPromptSubmit / PreToolUse(Edit|Write|MultiEdit)
         ↓                                    ↓
/learn skill appends to               lessons-injector.cjs
docs/lessons.md                        reads docs/lessons.md
         ↓                                    ↓
- [YYYY-MM-DD] lesson text             console.log(content) → context
Max 50 entries (FIFO trim)
```

**How to teach:**
- Type `/learn always use IGrowthRootRepository` → lesson saved to `docs/lessons.md`
- Type `/learn list` → view current lessons
- Type `/learn remove 3` → remove lesson #3
- Say "remember this" or "always do X" → auto-inferred, asks confirmation

---

## Session Lifecycle

```
SESSION START                                   DURING SESSION
  session-init.cjs ─────────────────────┐         edit-enforcement.cjs (every edit)
    ├── cleanupAll()                    │         skill-enforcement.cjs (every skill)
    ├── detectProjectType()             │         tool-output-swap.cjs (large outputs)
    ├── resolvePlanPath()               │         todo-tracker.cjs (every TaskCreate)
    └── writeEnv() (25 CK_* vars)      │         lessons-injector.cjs (every edit)
  post-compact-recovery.cjs ────────────┤
    └── restore workflow + todos        │       COMPACTION
  session-resume.cjs ───────────────────┤         write-compact-marker.cjs
    ├── injectPendingTasksWarning()     │
    ├── restore todos from checkpoint   │       SESSION END
    └── inject swap inventory           │         session-end.cjs
  npm-auto-install.cjs ─────────────────┘           ├── write pending-tasks-warning.json
                                                    ├── cleanupAll()
                                                    ├── deleteMarker() (on /clear)
                                                    └── deleteSessionSwap() (on exit/clear)
```

---

## Lib Modules

### State Management

| Module | Purpose |
|--------|---------|
| `ck-session-state.cjs` | Session state persistence |
| `workflow-state.cjs` | Workflow progress tracking across compaction |
| `todo-state.cjs` | Todo list state persistence for enforcement |
| `edit-state.cjs` | File edit tracking + plan warning state |
| `context-tracker.cjs` | Context usage monitoring, tool call counting, compaction threshold learning |

### External Memory

| Module | Purpose |
|--------|---------|
| `swap-engine.cjs` | Core engine: externalize large outputs, generate pointers, manage swap lifecycle |

### ClaudeKit (CK) Infrastructure

| Module | Purpose |
|--------|---------|
| `ck-paths.cjs` | Centralized path constants (`/tmp/ck/`, swap, edit, todo dirs) |
| `ck-config-loader.cjs` | Config loading and merging |
| `ck-config-utils.cjs` | Facade for config utilities |
| `ck-env-utils.cjs` | Environment variable detection |
| `ck-git-utils.cjs` | Low-level git utilities |
| `ck-path-utils.cjs` | Path resolution and normalization |
| `ck-plan-resolver.cjs` | Resolve active plan from session or branch context |

### General Utilities

| Module | Purpose |
|--------|---------|
| `debug-log.cjs` | Debug logging (file + stderr) |
| `hook-runner.cjs` | Hook execution wrapper with error handling |
| `stdin-parser.cjs` | Parse JSON from hook stdin |
| `temp-file-cleanup.cjs` | tmpclaude file cleanup |
| `wr-config.cjs` | Workflow router configuration |

---

## Hook Input/Output

### Input (stdin)

Hooks receive JSON via stdin with event-specific payload:

```json
{
  "tool_name": "Edit",
  "tool_input": { "file_path": "/path/to/file.ts", "old_string": "...", "new_string": "..." },
  "session_id": "abc123"
}
```

### Output (stdout)

Text printed to stdout is injected into conversation context. Hooks use `console.log()` for context injection.

### Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success, allow operation to proceed |
| `1` | Block operation (with error message on stderr) |

> All BravoSUITE hooks exit 0 (non-blocking) except safety hooks (`path-boundary-block`, `privacy-block`, `scout-block`) which exit 1 to block.

---

## Configuration

### Hook Registration (`.claude/settings.json`)

Hooks are registered in `settings.json` under `hooks.{EventName}[].hooks[]`. Each registration specifies a `command` and `matcher`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "hooks": [{ "command": "node \"$CLAUDE_PROJECT_DIR\"/.claude/hooks/privacy-block.cjs", "type": "command" }],
        "matcher": "Bash|Glob|Grep|Read|Edit|Write|NotebookEdit"
      }
    ]
  }
}
```

### Hook-Specific Config (`.claude/.ck.json`)

```json
{
  "privacyBlock": true,
  "codeReview": { "enabled": true, "rulesPath": "docs/code-review-rules.md" }
}
```

### Code Review Rules

`code-review-rules-injector.cjs` auto-injects `docs/code-review-rules.md` when code review skills activate. Configure via `.ck.json`:

| Field | Default | Description |
|-------|---------|-------------|
| `codeReview.enabled` | `true` | Enable/disable rule injection |
| `codeReview.rulesPath` | `docs/code-review-rules.md` | Path to rules file |
| `codeReview.injectOnSkills` | `["code-review", "review-pr"]` | Skills that trigger injection |

---

## Testing

257 tests across 3 suites, all passing:

| Suite | Tests | File |
|-------|-------|------|
| Hook behavior tests | 247 | `tests/test-all-hooks.cjs` |
| Core lib tests | 10 | `tests/test-lib-modules.cjs` |
| Extended lib tests | 0 (stub) | `tests/test-lib-modules-extended.cjs` |

Run all: `node .claude/hooks/tests/test-all-hooks.cjs && node .claude/hooks/tests/test-lib-modules.cjs && node .claude/hooks/tests/test-lib-modules-extended.cjs`

---

## Related Documentation

- [architecture.md](./architecture.md) — Hook system architecture diagrams
- [external-memory-swap.md](./external-memory-swap.md) — External Memory Swap for post-compaction recovery
- [extending-hooks.md](./extending-hooks.md) — Creating custom hooks
- [../hooks-reference.md](../hooks-reference.md) — Execution order by event
- [../skills/README.md](../skills/README.md) — Skills catalog

---

*Source: `.claude/hooks/` | Hooks + lib modules | Lessons via `/learn` skill + `lessons-injector.cjs`*
