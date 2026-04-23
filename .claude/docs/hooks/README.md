# Hooks Reference

> 73 hook files + 29 lib modules for context-aware AI behavior (some hooks register on multiple events)

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

| Event              | Trigger                      | Hooks | Use Cases                                                                                 |
| ------------------ | ---------------------------- | ----- | ----------------------------------------------------------------------------------------- |
| `SessionStart`     | Session begins/resumes       | 7     | Init state, recover from compaction, resume context, load docs                            |
| `SessionEnd`       | Session ends                 | 1     | Save state, cleanup temp/swap files, notifications                                        |
| `UserPromptSubmit` | Before processing user input | 2     | Route workflows (3 split hooks), gate init, assemble prompt context (6 split hooks)       |
| `PreToolUse`       | Before tool execution        | 28    | Block sensitive ops, inject context, enforce plans/todos                                  |
| `PostToolUse`      | After tool completes         | 8     | Externalize outputs, format code, track events                                            |
| `PreCompact`       | Before context compaction    | 1     | Write compaction marker; capture git status snapshot for post-compact re-verify warning   |
| `SubagentStart`    | Subagent spawning            | 18    | Inject project context in 18 sequential parts (inject paging — avoids 9KB per-hook limit) |
| `Notification`     | Idle/waiting events          | 1     | System notifications                                                                      |
| `Stop`             | Response complete            | 1     | System notifications                                                                      |

---

## Hook Catalog

### Session Lifecycle

| Hook                                          | Event                          | Matcher                           | Purpose                                                                                                                                                                               |
| --------------------------------------------- | ------------------------------ | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `session-init.cjs`                            | SessionStart                   | `startup\|resume\|clear\|compact` | Initialize session: detect project, write env vars                                                                                                                                    |
| `post-compact-recovery.cjs`                   | SessionStart                   | `resume\|compact`                 | Restore workflow state, todos, and swap inventory after compaction; scan tmp/ for [partial] subagent progress files (session-scoped)                                                  |
| `session-resume.cjs`                          | SessionStart                   | `resume`                          | Inject pending-tasks warning from prev session, restore todos from checkpoint                                                                                                         |
| `npm-auto-install.cjs`                        | SessionStart                   | `startup`                         | Auto-install missing npm packages from root `package.json`                                                                                                                            |
| `session-init-docs.cjs`                       | SessionStart                   | `startup`                         | Config skeleton + reference doc placeholder creation                                                                                                                                  |
| `workflow-router.cjs`                         | SessionStart, UserPromptSubmit | `startup`, `*`                    | Inject first third of 32-workflow catalog + detection instructions (part 1 of 3)                                                                                                      |
| `workflow-router-p2.cjs`                      | SessionStart, UserPromptSubmit | `startup`, `*`                    | Inject second third of 32-workflow catalog (part 2 of 3)                                                                                                                              |
| `workflow-router-p3.cjs`                      | SessionStart, UserPromptSubmit | `startup`, `*`                    | Inject final third of 32-workflow catalog (part 3 of 3)                                                                                                                               |
| `prompt-context-assembler.cjs`                | SessionStart, UserPromptSubmit | `startup`, `*`                    | Assemble session context, rules, modularization guidance, lessons (part 1 of 2)                                                                                                       |
| `prompt-context-assembler-closers.cjs`        | SessionStart, UserPromptSubmit | `startup`, `*`                    | Inject graph protocol tier 1, graph compact reminder, workflow gate, lesson-learned reminder                                                                                          |
| `prompt-context-assembler-docs.cjs`           | SessionStart, UserPromptSubmit | `startup`, `*`                    | Inject first half of project-structure-reference.md (part 1 of 2)                                                                                                                     |
| `prompt-context-assembler-docs-p2.cjs`        | SessionStart, UserPromptSubmit | `startup`, `*`                    | Inject second half of project-structure-reference.md (part 2 of 2)                                                                                                                    |
| `prompt-context-assembler-claude.cjs`         | SessionStart, UserPromptSubmit | `startup`, `*`                    | Inject CLAUDE.md TL;DR key rules (part 1 of 2)                                                                                                                                        |
| `prompt-context-assembler-project-config.cjs` | SessionStart, UserPromptSubmit | `startup`, `*`                    | Inject project-config-summary (~3.2KB): project modules, framework, context groups                                                                                                    |
| `pre-compact-snapshot.cjs`                    | UserPromptSubmit               | `*`                               | Capture last 100 readable `[Human]/[Assistant]` transcript lines as JSON snapshot at `/tmp/ck/snapshots/{sessionId}.json`; injected by `post-compact-recovery.cjs` after compact only |
| `graph-session-init.cjs`                      | SessionStart                   | `startup`                         | Check Python/tree-sitter/graph.db, inject status guidance (skips if config not populated)                                                                                             |
| `session-end.cjs`                             | SessionEnd                     | `clear\|exit\|compact`            | Write pending-tasks warning, cleanup temp/swap files, delete markers                                                                                                                  |
| `notify-waiting.js`                           | SessionEnd, Stop, Notification | various                           | System notification when Claude is waiting for input                                                                                                                                  |
| `subagent-init-identity.cjs`                  | SubagentStart                  | `*`                               | Fires 1st of 18: identity, plan context, language, rules, naming, trust, agent instructions, critical thinking mindset                                                                |
| `subagent-init-patterns-p1.cjs`               | SubagentStart                  | `*`                               | Fires 2nd of 18: coding patterns Part 1/5 (≤9KB — avoids silent tail truncation)                                                                                                      |
| `subagent-init-patterns-p2.cjs`               | SubagentStart                  | `*`                               | Fires 3rd of 18: coding patterns Part 2/5 (≤9KB)                                                                                                                                      |
| `subagent-init-patterns-p3.cjs`               | SubagentStart                  | `*`                               | Fires 4th of 18: coding patterns Part 3/5 (≤9KB)                                                                                                                                      |
| `subagent-init-patterns-p4.cjs`               | SubagentStart                  | `*`                               | Fires 5th of 18: coding patterns Part 4/5 (≤9KB)                                                                                                                                      |
| `subagent-init-patterns-p5.cjs`               | SubagentStart                  | `*`                               | Fires 6th of 18: coding patterns Part 5/5 (≤9KB) + agent-type-specific docs                                                                                                           |
| `subagent-init-dev-rules-p1.cjs`              | SubagentStart                  | `*`                               | Fires 7th of 18: development-rules.md Part 1/3 (code/review agents only)                                                                                                              |
| `subagent-init-dev-rules-p2.cjs`              | SubagentStart                  | `*`                               | Fires 8th of 18: development-rules.md Part 2/3                                                                                                                                        |
| `subagent-init-dev-rules-p3.cjs`              | SubagentStart                  | `*`                               | Fires 9th of 18: development-rules.md Part 3/3 (with overflow hint if truncated)                                                                                                      |
| `subagent-init-code-review-rules-p1.cjs`      | SubagentStart                  | `*`                               | Fires 10th of 18: code-review-rules.md Part 1/5 (code-review/code-reviewer agents only)                                                                                               |
| `subagent-init-code-review-rules-p2.cjs`      | SubagentStart                  | `*`                               | Fires 11th of 18: code-review-rules.md Part 2/5                                                                                                                                       |
| `subagent-init-code-review-rules-p3.cjs`      | SubagentStart                  | `*`                               | Fires 12th of 18: code-review-rules.md Part 3/5                                                                                                                                       |
| `subagent-init-code-review-rules-p4.cjs`      | SubagentStart                  | `*`                               | Fires 13th of 18: code-review-rules.md Part 4/5                                                                                                                                       |
| `subagent-init-code-review-rules-p5.cjs`      | SubagentStart                  | `*`                               | Fires 14th of 18: code-review-rules.md Part 5/5 (with overflow hint if truncated)                                                                                                     |
| `subagent-init-lessons.cjs`                   | SubagentStart                  | `*`                               | Fires 15th of 18: lessons learned (~1,560 chars)                                                                                                                                      |
| `subagent-init-ai-mistakes.cjs`               | SubagentStart                  | `*`                               | Fires 16th of 18: AI mistake prevention bullets (~8,200 chars; split from lessons to stay under 9KB limit)                                                                            |
| `subagent-init-context-guard.cjs`             | SubagentStart                  | `*`                               | Fires 17th of 18: context-window-overflow guard; injects session-scoped `ck-agent-<ms>-<rnd>` naming contract + Output Contract + Report Path Declaration                             |
| `subagent-init-todos.cjs`                     | SubagentStart                  | `*`                               | Fires 18th of 18 (last): parent todo list so subagents know active task context                                                                                                       |

### Context Injection (PreToolUse)

| Hook                             | Matcher                                                                           | Purpose                                                                                                                                                                                                                                   |
| -------------------------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `backend-context.cjs`            | `Edit\|Write\|MultiEdit`                                                          | Inject C#/CQRS patterns when editing backend files                                                                                                                                                                                        |
| `frontend-context.cjs`           | `Edit\|Write\|MultiEdit`                                                          | Inject Angular/TS patterns when editing frontend files                                                                                                                                                                                    |
| `design-system-context.cjs`      | `Edit\|Write\|MultiEdit`                                                          | Inject design tokens when editing UI components                                                                                                                                                                                           |
| `scss-styling-context.cjs`       | `Edit\|Write\|MultiEdit`                                                          | Inject BEM/SCSS patterns when editing style files                                                                                                                                                                                         |
| `code-patterns-injector.cjs`     | `Edit\|Write\|MultiEdit`                                                          | Inject discovered codebase patterns before edits                                                                                                                                                                                          |
| `role-context-injector.cjs`      | `Write`                                                                           | Inject role-specific context (PO, BA, QA, etc.)                                                                                                                                                                                           |
| `figma-context-extractor.cjs`    | `Read`                                                                            | Extract and inject Figma design context                                                                                                                                                                                                   |
| `code-review-rules-injector.cjs` | `Skill`                                                                           | Inject YourProject code review rules on review skill activation                                                                                                                                                                           |
| `dev-rules-injector.cjs`         | `Edit\|Write\|MultiEdit`, `Skill`                                                 | Inject development-rules.md before edits and review/coding skills                                                                                                                                                                         |
| `knowledge-context.cjs`          | `Edit\|Write\|MultiEdit`                                                          | Inject knowledge work guidelines for docs/knowledge/ files                                                                                                                                                                                |
| `ba-refinement-context.cjs`      | `Write\|Edit`                                                                     | Inject BA team refinement context when editing PBI artifacts                                                                                                                                                                              |
| `feature-docs-context.cjs`       | `Write\|Edit\|MultiEdit`                                                          | Inject feature-docs reference context when editing business feature docs                                                                                                                                                                  |
| `test-specs-context.cjs`         | `Write\|Edit\|MultiEdit`                                                          | Inject test-specs reference context when editing test specification files                                                                                                                                                                 |
| `artifact-path-resolver.cjs`     | `Write`                                                                           | Resolve correct artifact output paths (plans/, reports/)                                                                                                                                                                                  |
| `graph-context-injector.cjs`     | `Skill`                                                                           | Auto-inject blast radius when review/debug skills invoked                                                                                                                                                                                 |
| `mindset-injector.cjs`           | `Skill\|Agent\|Edit\|Write\|MultiEdit\|TaskCreate\|TaskUpdate` (in_progress only) | Inject critical thinking mindset + AI mistake prevention reminders; full re-anchor before Agent spawns; compact context on task ops                                                                                                       |
| `mindset-compact-injector.cjs`   | `Read\|Grep\|Glob\|Bash`                                                          | Lightweight critical-thinking re-anchor on read-only tools; deduped via DEDUP_LINES.CRITICAL_THINKING — no spam on consecutive greps                                                                                                      |
| `python-call-guide.cjs`          | `Bash`                                                                            | Inject platform-aware Python invocation guide when Bash command matches `/\bpython3?\b/`; highlights current platform's rule (`py`/`python` on Windows, `python3` on macOS/Linux); deduped via DEDUP_LINES.PYTHON_GUIDE (100-line window) |
| `git-commit-block.cjs`           | `Bash`                                                                            | Block git commit/push unless /commit skill is active                                                                                                                                                                                      |

### Lessons Injection

| Hook                   | Event                               | Purpose                                                             |
| ---------------------- | ----------------------------------- | ------------------------------------------------------------------- |
| `lessons-injector.cjs` | UserPromptSubmit                    | Inject `docs/project-reference/lessons.md` into prompt (with dedup) |
| `lessons-injector.cjs` | PreToolUse:`Edit\|Write\|MultiEdit` | Inject lessons before file edits (always)                           |

Lessons are managed via `/learn` skill. See `.claude/skills/learn/SKILL.md`.

### Workflow Automation

| Hook                                                                              | Event                                             | Purpose                                                             |
| --------------------------------------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------- |
| `init-prompt-gate.cjs`                                                            | UserPromptSubmit                                  | Block prompts until config populated + graph built (exit 2 = block) |
| `workflow-router.cjs` (+ p2, p3)                                                  | SessionStart, UserPromptSubmit                    | Inject 32-workflow catalog in three parts (split for size safety)   |
| `prompt-context-assembler.cjs` (+ closers, docs, docs-p2, claude, project-config) | SessionStart, UserPromptSubmit                    | Assemble all session context in 6 parts (split for size safety)     |
| `session-init-docs.cjs`                                                           | SessionStart:`startup`                            | Config skeleton + reference doc placeholder creation                |
| `workflow-step-tracker.cjs`                                                       | PostToolUse:`Skill`                               | Track workflow step completion                                      |
| `edit-enforcement.cjs`                                                            | PreToolUse:`Edit\|Write\|MultiEdit\|NotebookEdit` | Track edits, plan warnings at 4/8 files, block without TaskCreate   |
| `skill-enforcement.cjs`                                                           | PreToolUse:`Skill`                                | Block implementation skills without TaskCreate                      |
| `todo-tracker.cjs`                                                                | PostToolUse:`TaskCreate\|TaskUpdate`              | Persist todo state to disk for cross-compaction recovery            |
| `workflow-task-guard.cjs`                                                         | PreToolUse:`TaskUpdate`                           | Block completing workflow tasks without Skill invocation            |

### Safety & Privacy

| Hook                           | Matcher                                             | Purpose                                                                  |
| ------------------------------ | --------------------------------------------------- | ------------------------------------------------------------------------ |
| `path-boundary-block.cjs`      | `Bash\|Edit\|Write\|MultiEdit\|NotebookEdit`        | Block file access outside project root (security-critical)               |
| `privacy-block.cjs`            | `Bash\|Glob\|Grep\|Read\|Edit\|Write\|NotebookEdit` | Block access to sensitive files (.env, keys, credentials)                |
| `scout-block.cjs`              | `Bash\|Glob\|Grep\|Read\|Edit\|Write\|NotebookEdit` | Prevent bulk reads outside approved scope                                |
| `windows-command-detector.cjs` | `Bash`                                              | Detect/block Windows CMD syntax; auto-rewrite `\!` in `node -e` commands |

### Context Management & Utility

| Hook                       | Event                                | Purpose                                                                                                                                                                                                     |
| -------------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tool-output-swap.cjs`     | PostToolUse:`Read\|Grep\|Glob`       | Externalize large outputs to swap files for post-compaction recovery                                                                                                                                        |
| `write-compact-marker.cjs` | PreCompact                           | Writes compaction marker on `PreCompact`; captures `git status --short` as `compactState.gitStatus` so `prompt-context-assembler.cjs` can emit the post-compact "CONTEXT COMPACTED" re-verify warning       |
| `pre-compact-snapshot.cjs` | UserPromptSubmit                     | Captures last 100 readable `[Human]/[Assistant]` transcript lines as rolling snapshot (`/tmp/ck/snapshots/{sessionId}.json`); used by `post-compact-recovery.cjs` to restore readable context after compact |
| `post-edit-prettier.cjs`   | PostToolUse:`Edit\|Write\|MultiEdit` | Auto-run Prettier on edited files                                                                                                                                                                           |
| `bash-cleanup.cjs`         | PostToolUse:`Bash`                   | Clean up tmpclaude temp files after Bash commands                                                                                                                                                           |
| `graph-auto-update.cjs`    | PostToolUse:`Edit\|Write\|MultiEdit` | Incremental graph update after file edits (3s debounce)                                                                                                                                                     |
| `graph-grep-suggester.cjs` | PostToolUse:`Grep`                   | Suggest graph queries when grep finds important entry-point files (entities, commands, handlers)                                                                                                            |
| `post-agent-validator.cjs` | PostToolUse:`Agent`                  | Detect truncated/incomplete subagent results via 3 heuristics; emit warning if truncated                                                                                                                    |

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
  workflow-router.cjs (+ p2, p3)         │           ├── cleanupAll()
  prompt-context-assembler.cjs (+closers,docs,docs-p2,claude,project-config) │ ├── deleteMarker() (on /clear)
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

| Module                      | Purpose                                                                                                                              |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `context-injector-base.cjs` | Shared base for PreToolUse context injection hooks                                                                                   |
| `prompt-injections.cjs`     | Shared prompt injection helpers (critical context, AI mistake prevention, lessons, lesson-learned, workflow protocol)                |
| `session-init-helpers.cjs`  | SessionStart helpers: reference doc placeholders, config init                                                                        |
| `dedup-constants.cjs`       | Centralized dedup markers and dynamic line count calculation                                                                         |
| `transcript-utils.cjs`      | Shared transcript helpers: `isMarkerInContext` (dedup check) + `loadTranscriptLines` (safe file read); used by all 6 assembler hooks |

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

- [extending-hooks.md](./extending-hooks.md) — Creating custom hooks
- [../configuration/README.md](../configuration/README.md) — Configuration hierarchy and hooks config
- [../skills/README.md](../skills/README.md) — Skills catalog

---

_Source: `.claude/hooks/` | Hooks + lib modules | Lessons via `/learn` skill + `lessons-injector.cjs`_
