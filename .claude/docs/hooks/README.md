# Hooks Reference

> 44 hook files + 27 lib modules for context-aware AI behavior (some hooks register on multiple events)

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

| Event              | Trigger                      | Hooks | Use Cases                                                      |
| ------------------ | ---------------------------- | ----- | -------------------------------------------------------------- |
| `SessionStart`     | Session begins/resumes       | 7     | Init state, recover from compaction, resume context, load docs |
| `SessionEnd`       | Session ends                 | 1     | Save state, cleanup temp/swap files, notifications             |
| `UserPromptSubmit` | Before processing user input | 2     | Route workflows, gate init, assemble prompt context            |
| `PreToolUse`       | Before tool execution        | 17    | Block sensitive ops, inject context, enforce plans/todos       |
| `PostToolUse`      | After tool completes         | 7     | Externalize outputs, format code, track events                 |
| `PreCompact`       | Before context compaction    | 1     | Write compaction marker                                        |
| `SubagentStart`    | Subagent spawning            | 1     | Configure subagent with parent context                         |
| `Notification`     | Idle/waiting events          | 1     | System notifications                                           |
| `Stop`             | Response complete            | 1     | System notifications                                           |

---

## Hook Catalog

### Session Lifecycle

| Hook                           | Event                          | Matcher                           | Purpose                                                                                   |
| ------------------------------ | ------------------------------ | --------------------------------- | ----------------------------------------------------------------------------------------- |
| `session-init.cjs`             | SessionStart                   | `startup\|resume\|clear\|compact` | Initialize session: detect project, write env vars                                        |
| `post-compact-recovery.cjs`    | SessionStart                   | `resume\|compact`                 | Restore workflow state, todos, and swap inventory after compaction                        |
| `session-resume.cjs`           | SessionStart                   | `resume`                          | Inject pending-tasks warning from prev session, restore todos from checkpoint             |
| `npm-auto-install.cjs`         | SessionStart                   | `startup`                         | Auto-install missing npm packages from root `package.json`                                |
| `session-init-docs.cjs`        | SessionStart                   | `startup`                         | Config skeleton + reference doc placeholder creation                                      |
| `workflow-router.cjs`          | SessionStart, UserPromptSubmit | `startup`, `*`                    | Detect intent, inject matching workflow from 45-workflow catalog                          |
| `prompt-context-assembler.cjs` | SessionStart, UserPromptSubmit | `startup`, `*`                    | Assemble session context, lessons, and lesson-learned reminder                            |
| `graph-session-init.cjs`       | SessionStart                   | `startup`                         | Check Python/tree-sitter/graph.db, inject status guidance (skips if config not populated) |
| `session-end.cjs`              | SessionEnd                     | `clear\|exit\|compact`            | Write pending-tasks warning, cleanup temp/swap files, delete markers                      |
| `notify-waiting.js`            | SessionEnd, Stop, Notification | various                           | System notification when Claude is waiting for input                                      |
| `subagent-init.cjs`            | SubagentStart                  | `*`                               | Inject project context, rules, and workflow state into subagent sessions                  |

### Context Injection (PreToolUse)

| Hook                             | Matcher                           | Purpose                                                            |
| -------------------------------- | --------------------------------- | ------------------------------------------------------------------ |
| `backend-context.cjs`            | `Edit\|Write\|MultiEdit`          | Inject C#/CQRS patterns when editing backend files                 |
| `frontend-context.cjs`           | `Edit\|Write\|MultiEdit`          | Inject Angular/TS patterns when editing frontend files             |
| `design-system-context.cjs`      | `Edit\|Write\|MultiEdit`          | Inject design tokens when editing UI components                    |
| `scss-styling-context.cjs`       | `Edit\|Write\|MultiEdit`          | Inject BEM/SCSS patterns when editing style files                  |
| `code-patterns-injector.cjs`     | `Edit\|Write\|MultiEdit`          | Inject discovered codebase patterns before edits                   |
| `search-before-code.cjs`         | `Edit\|Write\|MultiEdit`          | Validate search was performed before code changes                  |
| `role-context-injector.cjs`      | `Write`                           | Inject role-specific context (PO, BA, QA, etc.)                    |
| `figma-context-extractor.cjs`    | `Read`                            | Extract and inject Figma design context                            |
| `code-review-rules-injector.cjs` | `Skill`                           | Inject YourProject code review rules on review skill activation    |
| `dev-rules-injector.cjs`         | `Edit\|Write\|MultiEdit`, `Skill` | Inject development-rules.md before edits and review/coding skills  |
| `knowledge-context.cjs`          | `Edit\|Write\|MultiEdit`          | Inject knowledge work guidelines for docs/knowledge/ files         |
| `ba-refinement-context.cjs`      | `Write\|Edit`                     | Inject BA team refinement context when editing PBI artifacts       |
| `artifact-path-resolver.cjs`     | `Write`                           | Resolve correct artifact output paths (plans/, reports/)           |
| `graph-context-injector.cjs`     | `Skill`                           | Auto-inject blast radius when review/debug skills invoked          |
| `mindset-injector.cjs`           | `Edit\|Write\|MultiEdit`, `Skill` | Inject critical thinking mindset + AI mistake prevention reminders |
| `git-commit-block.cjs`           | `Bash`                            | Block git commit/push unless /commit skill is active               |

### Lessons Injection

| Hook                   | Event                               | Purpose                                                             |
| ---------------------- | ----------------------------------- | ------------------------------------------------------------------- |
| `lessons-injector.cjs` | UserPromptSubmit                    | Inject `docs/project-reference/lessons.md` into prompt (with dedup) |
| `lessons-injector.cjs` | PreToolUse:`Edit\|Write\|MultiEdit` | Inject lessons before file edits (always)                           |

Lessons are managed via `/learn` skill. See `.claude/skills/learn/SKILL.md`.

### Workflow Automation

| Hook                           | Event                                             | Purpose                                                             |
| ------------------------------ | ------------------------------------------------- | ------------------------------------------------------------------- |
| `init-prompt-gate.cjs`         | UserPromptSubmit                                  | Block prompts until config populated + graph built (exit 2 = block) |
| `workflow-router.cjs`          | SessionStart, UserPromptSubmit                    | Detect intent, inject matching workflow from 45-workflow catalog    |
| `prompt-context-assembler.cjs` | SessionStart, UserPromptSubmit                    | Assemble session context, lessons, and lesson-learned reminder      |
| `session-init-docs.cjs`        | SessionStart:`startup`                            | Config skeleton + reference doc placeholder creation                |
| `workflow-step-tracker.cjs`    | PostToolUse:`Skill`                               | Track workflow step completion                                      |
| `edit-enforcement.cjs`         | PreToolUse:`Edit\|Write\|MultiEdit\|NotebookEdit` | Track edits, plan warnings at 4/8 files, block without TaskCreate   |
| `skill-enforcement.cjs`        | PreToolUse:`Skill`                                | Block implementation skills without TaskCreate                      |
| `todo-tracker.cjs`             | PostToolUse:`TaskCreate\|TaskUpdate`              | Persist todo state to disk for cross-compaction recovery            |
| `workflow-task-guard.cjs`      | PreToolUse:`TaskUpdate`                           | Block completing workflow tasks without Skill invocation            |

### Safety & Privacy

| Hook                           | Matcher                                             | Purpose                                                                  |
| ------------------------------ | --------------------------------------------------- | ------------------------------------------------------------------------ |
| `path-boundary-block.cjs`      | `Bash\|Edit\|Write\|MultiEdit\|NotebookEdit`        | Block file access outside project root (security-critical)               |
| `privacy-block.cjs`            | `Bash\|Glob\|Grep\|Read\|Edit\|Write\|NotebookEdit` | Block access to sensitive files (.env, keys, credentials)                |
| `scout-block.cjs`              | `Bash\|Glob\|Grep\|Read\|Edit\|Write\|NotebookEdit` | Prevent bulk reads outside approved scope                                |
| `windows-command-detector.cjs` | `Bash`                                              | Detect/block Windows CMD syntax; auto-rewrite `\!` in `node -e` commands |

### Context Management & Utility

| Hook                       | Event                                | Purpose                                                                                          |
| -------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `tool-output-swap.cjs`     | PostToolUse:`Read\|Grep\|Glob`       | Externalize large outputs to swap files (see [External Memory Swap](./external-memory-swap.md))  |
| `write-compact-marker.cjs` | PreCompact                           | Write compaction marker for statusline baseline reset                                            |
| `post-edit-prettier.cjs`   | PostToolUse:`Edit\|Write\|MultiEdit` | Auto-run Prettier on edited files                                                                |
| `bash-cleanup.cjs`         | PostToolUse:`Bash`                   | Clean up tmpclaude temp files after Bash commands                                                |
| `graph-auto-update.cjs`    | PostToolUse:`Edit\|Write\|MultiEdit` | Incremental graph update after file edits (3s debounce)                                          |
| `graph-grep-suggester.cjs` | PostToolUse:`Grep`                   | Suggest graph queries when grep finds important entry-point files (entities, commands, handlers) |

---

## Lessons System

The lessons system is a simple manual learning mechanism:

```
USER TEACHING                         INJECTION
/learn "always use X"                 UserPromptSubmit / PreToolUse(Edit|Write|MultiEdit)
         ↓                                    ↓
/learn skill appends to               lessons-injector.cjs
docs/project-reference/lessons.md                        reads docs/project-reference/lessons.md
         ↓                                    ↓
- [YYYY-MM-DD] lesson text             console.log(content) → context
Max 50 entries (FIFO trim)
```

**How to teach:**

- Type `/learn always use IGrowthRootRepository` → lesson saved to `docs/project-reference/lessons.md`
- Type `/learn list` → view current lessons
- Type `/learn remove 3` → remove lesson #3
- Say "remember this" or "always do X" → auto-inferred, asks confirmation

---

## Session Lifecycle

```
SESSION START (8 hooks)                         DURING SESSION
  session-init.cjs ─────────────────────┐         edit-enforcement.cjs (every edit)
    ├── cleanupAll()                    │         skill-enforcement.cjs (every skill)
    ├── detectProjectType()             │         tool-output-swap.cjs (large outputs)
    ├── resolvePlanPath()               │         todo-tracker.cjs (every TaskCreate)
    └── writeEnv() (25 CK_* vars)      │         lessons-injector.cjs (every edit)
  post-compact-recovery.cjs ────────────┤         graph-auto-update.cjs (after edits)
    └── restore workflow + todos        │
  session-resume.cjs ───────────────────┤       COMPACTION
    ├── injectPendingTasksWarning()     │         write-compact-marker.cjs
    ├── restore todos from checkpoint   │
    └── inject swap inventory           │       SESSION END (2 hooks)
  npm-auto-install.cjs                  │         session-end.cjs
  session-init-docs.cjs                 │           ├── write pending-tasks-warning.json
  workflow-router.cjs                   │           ├── cleanupAll()
  prompt-context-assembler.cjs          │           ├── deleteMarker() (on /clear)
  graph-session-init.cjs ───────────────┘           └── deleteSessionSwap() (on exit/clear)
```

---

## Lib Modules

### State Management

| Module                 | Purpose                                                                     |
| ---------------------- | --------------------------------------------------------------------------- |
| `ck-session-state.cjs` | Session state persistence                                                   |
| `workflow-state.cjs`   | Workflow progress tracking across compaction                                |
| `todo-state.cjs`       | Todo list state persistence for enforcement                                 |
| `edit-state.cjs`       | File edit tracking + plan warning state                                     |
| `context-tracker.cjs`  | Context usage monitoring, tool call counting, compaction threshold learning |

### External Memory

| Module            | Purpose                                                                          |
| ----------------- | -------------------------------------------------------------------------------- |
| `swap-engine.cjs` | Core engine: externalize large outputs, generate pointers, manage swap lifecycle |

### ClaudeKit (CK) Infrastructure

| Module                 | Purpose                                                        |
| ---------------------- | -------------------------------------------------------------- |
| `ck-paths.cjs`         | Centralized path constants (`/tmp/ck/`, swap, edit, todo dirs) |
| `ck-config-loader.cjs` | Config loading and merging                                     |
| `ck-config-utils.cjs`  | Facade for config utilities                                    |
| `ck-env-utils.cjs`     | Environment variable detection                                 |
| `ck-git-utils.cjs`     | Low-level git utilities                                        |
| `ck-path-utils.cjs`    | Path resolution and normalization                              |
| `ck-plan-resolver.cjs` | Resolve active plan from session or branch context             |

### Context Injection

| Module                      | Purpose                                                       |
| --------------------------- | ------------------------------------------------------------- |
| `context-injector-base.cjs` | Shared base for PreToolUse context injection hooks            |
| `prompt-injections.cjs`     | Shared prompt injection helpers (lessons, lesson-learned)     |
| `session-init-helpers.cjs`  | SessionStart helpers: reference doc placeholders, config init |
| `dedup-constants.cjs`       | Centralized dedup markers and dynamic line count calculation  |

### Configuration

| Module                       | Purpose                                                           |
| ---------------------------- | ----------------------------------------------------------------- |
| `project-config-loader.cjs`  | Load and validate project configuration, generate project summary |
| `project-config-schema.cjs`  | Project config JSON schema definition                             |
| `test-fixture-generator.cjs` | Generate test fixture data for hook tests                         |

### General Utilities

| Module                  | Purpose                                                            |
| ----------------------- | ------------------------------------------------------------------ |
| `debug-log.cjs`         | Debug logging (file + stderr)                                      |
| `hook-runner.cjs`       | Hook execution wrapper with error handling                         |
| `stdin-parser.cjs`      | Parse JSON from hook stdin                                         |
| `temp-file-cleanup.cjs` | tmpclaude file cleanup                                             |
| `wr-config.cjs`         | Workflow router configuration                                      |
| `graph-utils.cjs`       | Python detection, graph availability check, CLI invocation wrapper |

---

## Hook Input/Output

### Input (stdin)

Hooks receive JSON via stdin with event-specific payload:

```json
{
    "tool_name": "Edit",
    "tool_input": {
        "file_path": "/path/to/file.ts",
        "old_string": "...",
        "new_string": "..."
    },
    "session_id": "abc123"
}
```

### Output (stdout)

Text printed to stdout is injected into conversation context. Hooks use `console.log()` for context injection.

### Exit Codes

| Code | Meaning                                        |
| ---- | ---------------------------------------------- |
| `0`  | Success, allow operation to proceed            |
| `2`  | Block operation (with error message on stderr) |

> All hooks exit 0 (non-blocking) except safety hooks (`path-boundary-block`, `privacy-block`, `scout-block`, `init-prompt-gate`) which exit 2 to block.

---

## Configuration

### Hook Registration (`.claude/settings.json`)

Hooks are registered in `settings.json` under `hooks.{EventName}[].hooks[]`. Each registration specifies a `command` and `matcher`:

```json
{
    "hooks": {
        "PreToolUse": [
            {
                "hooks": [
                    {
                        "command": "node \"$CLAUDE_PROJECT_DIR\"/.claude/hooks/privacy-block.cjs",
                        "type": "command"
                    }
                ],
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
    "codeReview": {
        "enabled": true,
        "rulesPath": "docs/project-reference/code-review-rules.md"
    }
}
```

### Code Review Rules

`code-review-rules-injector.cjs` auto-injects `docs/project-reference/code-review-rules.md` when code review skills activate. Configure via `.ck.json`:

| Field                       | Default                                       | Description                   |
| --------------------------- | --------------------------------------------- | ----------------------------- |
| `codeReview.enabled`        | `true`                                        | Enable/disable rule injection |
| `codeReview.rulesPath`      | `docs/project-reference/code-review-rules.md` | Path to rules file            |
| `codeReview.injectOnSkills` | `["code-review", "review-pr"]`                | Skills that trigger injection |

---

## Testing

614 tests across 8 suites, all passing:

| Suite               | Tests | File                                  |
| ------------------- | ----- | ------------------------------------- |
| Hook behavior tests | 300   | `tests/test-all-hooks.cjs`            |
| Core lib tests      | 10    | `tests/test-lib-modules.cjs`          |
| Extended lib tests  | 145   | `tests/test-lib-modules-extended.cjs` |
| Swap engine tests   | 50    | `tests/test-swap-engine.cjs`          |
| Context tracker     | 23    | `tests/test-context-tracker.cjs`      |
| Init reference docs | 5     | `tests/test-init-reference-docs.cjs`  |
| Shared utilities    | 17    | `tests/test-shared-utilities.cjs`     |
| Workflow task guard | 13    | `tests/test-workflow-task-guard.cjs`  |
| Git commit block    | 56    | `tests/test-git-commit-block.cjs`     |

Run all: `node .claude/hooks/tests/test-all-hooks.cjs && node .claude/hooks/tests/test-lib-modules.cjs && node .claude/hooks/tests/test-lib-modules-extended.cjs && node .claude/hooks/tests/test-swap-engine.cjs && node .claude/hooks/tests/test-context-tracker.cjs && node .claude/hooks/tests/test-init-reference-docs.cjs && node .claude/hooks/tests/test-shared-utilities.cjs && node .claude/hooks/tests/test-workflow-task-guard.cjs && node .claude/hooks/tests/test-git-commit-block.cjs`

---

## Related Documentation

- [architecture.md](./architecture.md) — Hook system architecture diagrams
- [external-memory-swap.md](./external-memory-swap.md) — External Memory Swap for post-compaction recovery
- [extending-hooks.md](./extending-hooks.md) — Creating custom hooks
- [../configuration/README.md](../configuration/README.md) — Configuration hierarchy and hooks config
- [../skills/README.md](../skills/README.md) — Skills catalog

---

_Source: `.claude/hooks/` | Hooks + lib modules | Lessons via `/learn` skill + `lessons-injector.cjs`_
