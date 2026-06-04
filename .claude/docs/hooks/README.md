# Hooks Reference

> 54 top-level hook files + 33 lib modules for context-aware AI behavior (some hooks register on multiple events)

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

| Event              | Trigger                      | Hooks | Use Cases                                                                                        |
| ------------------ | ---------------------------- | ----- | ------------------------------------------------------------------------------------------------ |
| `SessionStart`     | Session begins/resumes       | 9     | Verify install, init state, recover from compaction, resume context, load docs                   |
| `SessionEnd`       | Session ends                 | 2     | Save state, cleanup temp/swap files, notifications                                               |
| `UserPromptSubmit` | Before processing user input | 11    | Route workflows (3 split hooks), gate init, assemble prompt context (6 split hooks)              |
| `PreToolUse`       | Before tool execution        | 30    | Block sensitive ops, inject context, enforce plans/todos, warn on doc⇄code drift                 |
| `PostToolUse`      | After tool completes         | 8     | Externalize outputs, format code, track events                                                   |
| `PreCompact`       | Before context compaction    | 1     | Write compaction marker; capture git status snapshot for post-compact re-verify warning          |
| `SubagentStart`    | Subagent spawning            | 8     | Inject project context as 8 lightweight guidance pointers (read-on-demand — no full doc content) |
| `Notification`     | Idle/waiting events          | 1     | System notifications                                                                             |
| `Stop`             | Response complete            | 1     | System notifications                                                                             |

---

## Hook Catalog

### Session Lifecycle

| Hook                                          | Event                          | Matcher                           | Purpose                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| --------------------------------------------- | ------------------------------ | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `verify-install.cjs`                          | SessionStart                   | `startup\|resume\|clear\|compact` | Install integrity preflight (runs first): detect partial `.claude` copy with missing hook `lib/*.cjs` files, emit one actionable message                                                                                                                                                                                                                                                                                                           |
| `session-init.cjs`                            | SessionStart                   | `startup\|resume\|clear\|compact` | Initialize session: detect project, write env vars                                                                                                                                                                                                                                                                                                                                                                                                 |
| `post-compact-recovery.cjs`                   | SessionStart                   | `resume\|compact`                 | Restore workflow state, todos, and swap inventory after compaction; scan tmp/ for [partial] subagent progress files (session-scoped)                                                                                                                                                                                                                                                                                                               |
| `session-resume.cjs`                          | SessionStart                   | `resume`                          | Inject pending-tasks warning from prev session, restore todos from checkpoint                                                                                                                                                                                                                                                                                                                                                                      |
| `npm-auto-install.cjs`                        | SessionStart                   | `startup`                         | Auto-install missing npm packages from root `package.json`                                                                                                                                                                                                                                                                                                                                                                                         |
| `session-init-docs.cjs`                       | SessionStart                   | `startup`                         | Config skeleton + reference doc placeholder creation                                                                                                                                                                                                                                                                                                                                                                                               |
| `workflow-router.cjs`                         | SessionStart, UserPromptSubmit | `startup`, `*`                    | Inject first third of 17-workflow catalog + detection instructions (part 1 of 3)                                                                                                                                                                                                                                                                                                                                                                   |
| `workflow-router-p2.cjs`                      | SessionStart, UserPromptSubmit | `startup`, `*`                    | Inject second third of 17-workflow catalog (part 2 of 3)                                                                                                                                                                                                                                                                                                                                                                                           |
| `workflow-router-p3.cjs`                      | SessionStart, UserPromptSubmit | `startup`, `*`                    | Inject final third of 17-workflow catalog (part 3 of 3)                                                                                                                                                                                                                                                                                                                                                                                            |
| `prompt-context-assembler.cjs`                | SessionStart, UserPromptSubmit | `startup`, `*`                    | Assemble session context, rules, modularization guidance, lessons (part 1 of 2)                                                                                                                                                                                                                                                                                                                                                                    |
| `prompt-context-assembler-closers.cjs`        | SessionStart, UserPromptSubmit | `startup`, `*`                    | Inject graph protocol tier 1, graph compact reminder, workflow gate, lesson-learned reminder                                                                                                                                                                                                                                                                                                                                                       |
| `prompt-context-assembler-docs.cjs`           | SessionStart, UserPromptSubmit | `startup`, `*`                    | Guidance pointer for project-structure-reference.md (merged from former p1+p2 full-content hooks)                                                                                                                                                                                                                                                                                                                                                  |
| `prompt-context-assembler-claude.cjs`         | SessionStart, UserPromptSubmit | `startup`, `*`                    | Inject CLAUDE.md TL;DR key rules (part 1 of 2)                                                                                                                                                                                                                                                                                                                                                                                                     |
| `prompt-context-assembler-project-config.cjs` | SessionStart, UserPromptSubmit | `startup`, `*`                    | Inject project-config-summary (~3.2KB): project modules, framework, context groups                                                                                                                                                                                                                                                                                                                                                                 |
| `pre-compact-snapshot.cjs`                    | UserPromptSubmit               | `*`                               | Capture last 100 readable `[Human]/[Assistant]` transcript lines as JSON snapshot at `/tmp/ck/snapshots/{sessionId}.json`; injected by `post-compact-recovery.cjs` after compact only                                                                                                                                                                                                                                                              |
| `graph-session-init.cjs`                      | SessionStart                   | `startup`                         | Check Python/tree-sitter/graph.db, inject status guidance (skips if config not populated)                                                                                                                                                                                                                                                                                                                                                          |
| `session-end.cjs`                             | SessionEnd                     | `clear\|exit\|compact`            | Write pending-tasks warning, cleanup temp/swap files, delete markers                                                                                                                                                                                                                                                                                                                                                                               |
| `notify-waiting.js`                           | SessionEnd, Stop, Notification | various                           | System notification when Claude is waiting for input                                                                                                                                                                                                                                                                                                                                                                                               |
| `subagent-init.cjs`                           | SubagentStart                  | `*`                               | Dispatcher — runs consolidated builders 1-5 in order: (1) identity, plan context, language, rules, naming, trust, agent instructions, critical thinking mindset; (2) read-guidance pointer for patterns + agent-specific docs; (3) read-guidance pointer for development-rules.md (code/review agents only); (4) read-guidance pointer for code-review-rules.md (code-reviewer/code-simplifier/spec-compliance-reviewer only); (5) lessons learned |
| `subagent-init-2.cjs`                         | SubagentStart                  | `*`                               | Dispatcher — runs consolidated builder 6: AI mistake prevention bullets                                                                                                                                                                                                                                                                                                                                                                            |
| `subagent-init-3.cjs`                         | SubagentStart                  | `*`                               | Dispatcher — runs consolidated builders 7-8: (7) context-window-overflow guard injecting session-scoped `ck-agent-<ms>-<rnd>` naming contract + Output Contract + Report Path Declaration; (8) parent todo list so subagents know active task context                                                                                                                                                                                              |

### Context Injection (PreToolUse)

| Hook | Matcher | Purpose |
| ---- | ------- | ------- |

> **The inject-only PreToolUse hooks are dispatchers, not per-context files.** The 16 former standalone inject modules (backend-context, frontend-context, design-system-context, scss-styling-context, code-patterns-injector, role-context-injector, code-review-rules-injector, dev-rules-injector, knowledge-context, spec-context, artifact-path-resolver, graph-context-injector, mindset-injector, mindset-compact-injector, python-call-guide, lessons-injector) plus the design-system canonical guide were CONSOLIDATED into pure **builder functions** in `lib/pretooluse-context-builders.cjs`, dispatched by the 9 cap-bounded dispatcher processes below. Each builder retains its original inject behavior; only the registration model changed. See the "Phase 04 consolidation" note after the table.
>
> The two standalone inject hooks (`figma-context-extractor.cjs`, `ba-refinement-context.cjs`) and the blocking gates (`doc-sync-gate.cjs`, `agent-files-skill-gate.cjs`, `git-commit-block.cjs`) remain independent files — they are NOT folded into the dispatchers.

| Dispatcher / Hook              | Matcher                                                                           | Purpose                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------------------ | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pretooluse-ctx-edit.cjs`      | `Edit\|Write\|MultiEdit`                                                          | Dispatcher — invokes the early edit-path builders: `buildDesignSystemCanonicalGuide` (canonical design-system read-guide), `buildDesignSystemContext` (design tokens for UI components), `buildKnowledgeContext` (docs/knowledge work guidelines)                                                                                                                                  |
| `pretooluse-ctx-edit-tail.cjs` | `Edit\|Write\|MultiEdit`                                                          | Dispatcher — invokes the tail edit-path builders in order: `buildBackendContext` (C#/CQRS patterns for backend files), `buildFrontendContext` (Angular/TS patterns), `buildScssStylingContext` (BEM/SCSS patterns), `buildCodePatterns` (discovered codebase patterns), `buildRoleContext` (role-specific context: PO, BA, QA, etc.), `buildLessons` (inject lessons before edits) |
| `pretooluse-ctx-edit-spec.cjs` | `Write\|Edit\|MultiEdit`                                                          | Dispatcher — invokes `buildSpecContext` (Feature Spec 8-section reference when editing docs/specs/) and `buildArtifactPath` (resolve plans/ and reports/ output paths)                                                                                                                                                                                                             |
| `pretooluse-ctx-canon.cjs`     | `Read\|Skill`                                                                     | Dispatcher — invokes `buildDesignSystemCanonicalGuide` (read-guide for the canonical design-system doc when reading or invoking skills). NOTE: the canonical guide's UserPromptSubmit registration still points at `design-system-canonical-guide.cjs` directly; only its PreToolUse registrations were folded into `-edit` / `-canon`                                             |
| `pretooluse-ctx-crr.cjs`       | `Skill\|Agent\|Edit\|Write\|MultiEdit\|TaskCreate\|TaskUpdate`                    | Dispatcher — invokes `buildCodeReviewRules` (inject code-review-rules.md on review-skill activation)                                                                                                                                                                                                                                                                               |
| `pretooluse-ctx-dev.cjs`       | `Skill\|Agent\|Edit\|Write\|MultiEdit\|TaskCreate\|TaskUpdate`                    | Dispatcher — invokes `buildDevRules` (development-rules.md before edits and review/coding skills)                                                                                                                                                                                                                                                                                  |
| `pretooluse-ctx-graph.cjs`     | `Skill\|Agent`                                                                    | Dispatcher — invokes `buildGraphContext` (auto-inject blast radius when review/debug skills invoked)                                                                                                                                                                                                                                                                               |
| `pretooluse-ctx-mindset.cjs`   | `Skill\|Agent\|Edit\|Write\|MultiEdit\|TaskCreate\|TaskUpdate` (in_progress only) | Dispatcher — invokes `buildMindset` (critical thinking mindset + AI mistake prevention reminders; full re-anchor before Agent spawns; compact context on task ops)                                                                                                                                                                                                                 |
| `pretooluse-ctx-readbash.cjs`  | `Read\|Grep\|Glob\|Bash`                                                          | Dispatcher — invokes `buildMindsetCompact` (lightweight critical-thinking re-anchor on read-only tools, deduped via DEDUP_LINES.CRITICAL_THINKING) and `buildPythonGuide` (platform-aware Python invocation guide when a Bash command matches `/\bpython3?\b/`, deduped via DEDUP_LINES.PYTHON_GUIDE)                                                                              |
| `figma-context-extractor.cjs`  | `Read`                                                                            | Standalone inject hook (NOT consolidated) — extract and inject Figma design context                                                                                                                                                                                                                                                                                                |
| `ba-refinement-context.cjs`    | `Write\|Edit`                                                                     | Standalone inject hook (NOT consolidated) — inject BA team refinement context when editing PBI artifacts; registered BETWEEN `-edit-tail` (role) and `-edit-spec` (spec+artifact) to preserve legacy emit order                                                                                                                                                                    |
| `doc-sync-gate.cjs`            | `Bash` + `Write\|Edit\|MultiEdit`                                                 | Doc⇄Code sync gate — WARN-only (every path exits 0, never blocks): warns when a `git commit` stages behavioral code in an enforced area without touching its Feature Spec, and per-edit when enforced-area code drifts past `last_synced`                                                                                                                                          |
| `agent-files-skill-gate.cjs`   | `Skill`                                                                           | Project-context router: if a non-meta skill runs while CLAUDE.md / AGENTS.md is missing, guide the model to the generator skill (`/claude-md-init`, `/sync-codex`)                                                                                                                                                                                                                 |
| `git-commit-block.cjs`         | `Bash`                                                                            | Block git commit/push unless /commit skill is active                                                                                                                                                                                                                                                                                                                               |

> **Phase 04 consolidation (PreToolUse inject-only dispatchers).** The inject-only
> modules above (graph / code-review-rules / dev-rules / mindset / mindset-compact /
> knowledge / design-system-context / canonical-guide / code-patterns / backend /
> frontend / scss / lessons / role / spec / artifact / python-call-guide) no longer
> register individually. They are dispatched by **9 cap-bounded dispatcher processes**
> (`pretooluse-ctx-graph`, `-crr`, `-dev`, `-mindset`, `-readbash`, `-edit`,
> `-edit-tail`, `-edit-spec`, `-canon`), each a thin wrapper over
> `lib/pretooluse-dispatch.cjs` + `lib/pretooluse-context-builders.cjs`. The runtime
> reads stdin once, scans the transcript once (shared `preloadedLines`), runs each
> builder under its own try/catch, joins non-empty trimmed blocks with `\n`, and
> always exits 0.
>
> **Routing-table invariant (do not break when adding/reordering inject context):**
>
> 1. **Byte-equivalent ordered concat.** For every tool, concatenating the dispatcher
>    blocks (in registration order) must be byte-identical to concatenating the legacy
>    hooks' trimmed stdout in legacy reg order. Builder order within a dispatcher MUST
>    match the legacy emit order. Proof harness: `plans/.../reports/p04-e2e-concat.cjs`;
>    regression suite: `tests/suites/pretooluse-dispatchers.test.cjs` (TC-HOOKS-030).
> 2. **Blocking gates stay independent.** A dispatcher carries ONLY inject-only builders
>    — NEVER a gate. The shared try/catch must never wrap a gate (it would mask an
>    exit-2/deny). Gates keep their own `settings.json` registrations (TC-HOOKS-032).
> 3. **figma stays independent** (JSON `{user:...}` control contract, not text) and
>    **design-system-canonical-guide.cjs stays a file** (its UserPromptSubmit reg points
>    at it; only its two PreToolUse regs were folded into `-edit`/`-canon`) — TC-HOOKS-036.
> 4. **ba-refinement interleave.** `ba-refinement-context.cjs` is an independent inject
>    hook registered BETWEEN `-edit-tail` (role) and `-edit-spec` (spec+artifact); this
>    ordering preserves the legacy role → ba-refinement → artifact emit order for BA-path
>    writes. Do not move `-edit-spec` before ba-refinement.
> 5. **≤8500 chars per emitted block** (TC-HOOKS-035), except the grandfathered single
>    indivisible giants `-dev` (development-rules.md) and `-mindset` (review-skill path).
>
> The 24 legacy standalone module files (16 PreToolUse inject modules + 8 SubagentStart
> modules) have been PHYSICALLY DELETED — their behavior now lives entirely as builder
> functions in `lib/pretooluse-context-builders.cjs` (PreToolUse) and inside
> `subagent-init.cjs` / `subagent-init-2.cjs` / `subagent-init-3.cjs` (SubagentStart).
> Only `ba-refinement-context.cjs` and `figma-context-extractor.cjs` survive as
> standalone inject hooks.

### Lessons Injection

| Hook / Builder                                  | Event                               | Purpose                                                             |
| ----------------------------------------------- | ----------------------------------- | ------------------------------------------------------------------- |
| `prompt-context-assembler.cjs` (lessons part)   | UserPromptSubmit                    | Inject `docs/project-reference/lessons.md` into prompt (with dedup) |
| `buildLessons` (via `pretooluse-ctx-edit-tail`) | PreToolUse:`Edit\|Write\|MultiEdit` | Inject lessons before file edits (always)                           |

Lessons are managed via `/learn` skill. See `.claude/skills/learn/SKILL.md`.

### Workflow Automation

| Hook                                                                     | Event                                             | Purpose                                                                         |
| ------------------------------------------------------------------------ | ------------------------------------------------- | ------------------------------------------------------------------------------- |
| `init-prompt-gate.cjs`                                                   | UserPromptSubmit                                  | Block prompts until config populated + graph built (exit 2 = block)             |
| `workflow-router.cjs` (+ p2, p3)                                         | SessionStart, UserPromptSubmit                    | Inject 17-workflow catalog in three parts (split for size safety)               |
| `prompt-context-assembler.cjs` (+ closers, docs, claude, project-config) | SessionStart, UserPromptSubmit                    | Assemble all session context in 5 parts (split for size safety)                 |
| `session-init-docs.cjs`                                                  | SessionStart:`startup`                            | Config skeleton + reference doc placeholder creation                            |
| `workflow-step-tracker.cjs`                                              | PostToolUse:`Skill`                               | Track workflow step completion (accelerator only — advancement is model-driven) |
| `edit-enforcement.cjs`                                                   | PreToolUse:`Edit\|Write\|MultiEdit\|NotebookEdit` | Track edits, plan warnings at 4/8 files, block without TaskCreate               |
| `skill-enforcement.cjs`                                                  | PreToolUse:`Skill`                                | Block implementation skills without TaskCreate                                  |
| `todo-tracker.cjs`                                                       | PostToolUse:`TaskCreate\|TaskUpdate`              | Persist todo state to disk for cross-compaction recovery                        |
| `workflow-task-guard.cjs`                                                | PreToolUse:`TaskUpdate`                           | Block completing workflow tasks without Skill invocation                        |

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
/learn skill appends to               buildLessons (via pretooluse-ctx-edit-tail) /
docs/project-reference/lessons.md     prompt-context-assembler.cjs read docs/project-reference/lessons.md
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
    └── writeEnv() (25 CK_* vars)      │         buildLessons via pretooluse-ctx-edit-tail (every edit)
  post-compact-recovery.cjs ────────────┤         graph-auto-update.cjs (after edits)
    └── restore workflow + todos        │
  session-resume.cjs ───────────────────┤       COMPACTION
    ├── injectPendingTasksWarning()     │         write-compact-marker.cjs
    ├── restore todos from checkpoint   │
    └── inject swap inventory           │       SESSION END (2 hooks)
  npm-auto-install.cjs                  │         session-end.cjs
  session-init-docs.cjs                 │           ├── write pending-tasks-warning.json
  workflow-router.cjs (+ p2, p3)         │           ├── cleanupAll()
  prompt-context-assembler.cjs (+closers,docs,claude,project-config) │ ├── deleteMarker() (on /clear)
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

| Module                  | Purpose                                                                                         |
| ----------------------- | ----------------------------------------------------------------------------------------------- |
| `ck-paths.cjs`          | Centralized path constants (`/tmp/ck/`, swap, edit, todo dirs)                                  |
| `ck-config-loader.cjs`  | Config loading and merging                                                                      |
| `ck-config-schema.cjs`  | Validate `.claude/.ck.json` against expected schema (warns on typos/unknown keys, never blocks) |
| `agent-files-state.cjs` | Shared detection of missing root agent-instruction files (CLAUDE.md / AGENTS.md)                |
| `ck-config-utils.cjs`   | Facade for config utilities                                                                     |
| `ck-env-utils.cjs`      | Environment variable detection                                                                  |
| `ck-git-utils.cjs`      | Low-level git utilities                                                                         |
| `ck-path-utils.cjs`     | Path resolution and normalization                                                               |
| `ck-plan-resolver.cjs`  | Resolve active plan from session or branch context                                              |

### Context Injection

| Module                          | Purpose                                                                                                                              |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `context-injector-base.cjs`     | Shared base for PreToolUse context injection hooks                                                                                   |
| `prompt-injections.cjs`         | Shared prompt injection helpers (critical context, AI mistake prevention, lessons, lesson-learned, workflow protocol)                |
| `session-init-helpers.cjs`      | SessionStart helpers: reference doc placeholders, config init                                                                        |
| `dedup-constants.cjs`           | Centralized dedup markers and dynamic line count calculation                                                                         |
| `transcript-utils.cjs`          | Shared transcript helpers: `isMarkerInContext` (dedup check) + `loadTranscriptLines` (safe file read); used by all 6 assembler hooks |
| `subagent-context-builders.cjs` | Shared builders for the 8 subagent-init hooks (read-guidance pointers, execution order)                                              |
| `doc-sync-classify.cjs`         | Pure classification shared by both `doc-sync-gate.cjs` matchers (commit-time WARN + per-edit WARN, both advisory exit 0)             |

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

> All hooks exit 0 (non-blocking) except safety hooks (`path-boundary-block`, `privacy-block`, `scout-block`, `init-prompt-gate`, `git-commit-block`) which exit 2 to block. Note: `doc-sync-gate.cjs` is explicitly WARN-only — every code path exits 0.

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

The `buildCodeReviewRules` builder (dispatched by `pretooluse-ctx-crr.cjs`) auto-injects `docs/project-reference/code-review-rules.md` when code review skills activate. Configure via `.ck.json`:

| Field                       | Default                                                                           | Description                          |
| --------------------------- | --------------------------------------------------------------------------------- | ------------------------------------ |
| `codeReview.enabled`        | `true`                                                                            | Enable/disable rule injection        |
| `codeReview.rulesPath`      | `docs/project-reference/code-review-rules.md`                                     | Path to rules file                   |
| `codeReview.injectOnSkills` | `["code-review", "review", "review:codebase", "review-changes", "code-reviewer"]` | Skills/agents that trigger injection |

---

## Testing

Current primary hook test status: `test-all-hooks.cjs` passes with 362 tests, 0 failures (live run 2026-06-13). The suite runner also exposes 16 discoverable suites, including `count-drift`.

| Test Surface          | Count | File/Location                            |
| --------------------- | ----- | ---------------------------------------- |
| Primary hook runner   | 362   | `tests/test-all-hooks.cjs`               |
| Discoverable suites   | 16    | `tests/suites/*.test.cjs`                |
| Standalone test files | 13    | `tests/test-*.cjs/.js` excluding runner  |
| Scout-block tests     | 7     | `scout-block/tests/test-*.js`            |
| Lib unit tests        | 1     | `lib/__tests__/ck-config-utils.test.cjs` |

Run all primary hook tests: `node .claude/hooks/tests/test-all-hooks.cjs`

Run a suite subset: `node .claude/hooks/tests/run-all-tests.cjs --filter=count-drift`

---

## Related Documentation

- [architecture.md](./architecture.md) — Hook runtime contract and layer boundaries
- [extending-hooks.md](./extending-hooks.md) — Creating custom hooks
- [../configuration/README.md](../configuration/README.md) — Configuration hierarchy and hooks config
- [../skills/README.md](../skills/README.md) — Skills catalog

---

_Source: `.claude/hooks/` | Hooks + lib modules | Lessons via `/learn` skill + `buildLessons` (dispatched by `pretooluse-ctx-edit-tail.cjs`)_
