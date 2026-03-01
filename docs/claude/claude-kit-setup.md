# Claude Kit Setup - Comprehensive Documentation

> **DEPRECATED:** This document has been split into modular documentation. Use the new docs:
>
> - [hooks/README.md](./hooks/README.md) - Hook system overview
> - [hooks/README.md](./hooks/README.md) - Hooks overview
> - [configuration/README.md](./configuration/README.md) - Configuration files
> - [skills/README.md](./skills/README.md) - Skills catalog (includes all migrated commands)
>
> This file is kept for reference but may be removed in future updates.

---

> BravoSUITE's advanced Claude Code configuration with workflow automation, lessons system, and context-aware AI capabilities.

## Table of Contents

1. [Overview](#overview)
2. [Quick Start (5 Minutes)](#quick-start-5-minutes)
3. [Directory Structure](#directory-structure)
4. [Configuration Files](#configuration-files)
5. [Hook System](#hook-system)
6. [Workflow Automation](#workflow-automation)
7. [Lessons System](#lessons-system)
8. [Skills Catalog](#skills-catalog)
9. [Agents](#agents)
10. [Commands Reference](#commands-reference)
11. [Output Styles (Coding Levels)](#output-styles-coding-levels)
12. [Long-Running State Tracking](#long-running-state-tracking)
13. [System Integration Flow](#system-integration-flow)
14. [Troubleshooting](#troubleshooting)

---

## Overview

The `.claude` directory contains a sophisticated Claude Code configuration that transforms Claude from a basic AI assistant into a workflow-aware development partner. Key capabilities:

| Capability                  | Description                                          |
| --------------------------- | ---------------------------------------------------- |
| **Lessons System**          | Learns from human feedback via `/learn` skill        |
| **Workflow Automation**     | Auto-detects intent and follows structured workflows |
| **Context Persistence**     | Survives context compaction via checkpoints          |
| **Coding Level Adaptation** | Adjusts output style to developer experience level   |
| **Domain-Aware Context**    | Injects relevant patterns based on file types        |

### Design Principles

- **Non-blocking**: All hooks exit 0 even on errors
- **Privacy-first**: Metadata only, no stdout/stderr content stored
- **Atomic operations**: File locking and write-temp-rename patterns
- **Graceful degradation**: Missing modules don't crash the system

---

## Quick Start (5 Minutes)

### Prerequisites

- Claude Code CLI installed (`npm i -g @anthropic-ai/claude-code`)
- Node.js 18+ (for hooks)
- Git repository initialized

### Step 1: Copy Configuration

```bash
# Required directories
cp -r .claude/ your-project/.claude/

# Required root files
cp CLAUDE.md your-project/
```

### Step 2: Install Dependencies

```bash
cd your-project/.claude/hooks
npm install  # If package.json exists
```

### Step 3: Verify Setup

```bash
# Test hooks are working
node .claude/hooks/verify-hooks.cjs

# Start Claude Code
claude
```

### Step 4: Customize

1. Edit `.claude/.ck.json` for project settings (coding level, assertions)
2. Review `.claude/settings.json` for permissions
3. Add project-specific assertions to `.ck.json`

### What You Get

| Feature            | Enabled By                         | Description                                |
| ------------------ | ---------------------------------- | ------------------------------------------ |
| Workflow detection | workflow-router.cjs                | Auto-detect feature/bugfix/refactor intent |
| Context injection  | *-context.cjs hooks                | Domain-specific patterns for C#/TS/SCSS    |
| Lessons            | lessons-injector.cjs               | Inject learned lessons into context        |
| Todo enforcement   | edit-enforcement.cjs, skill-enforcement.cjs | Block impl without planning                |
| File protection    | scout-block.cjs, privacy-block.cjs | Prevent access to .git, .env               |
| Output adaptation  | session-init.cjs                   | Adjust verbosity to coding level           |

---

## Directory Structure

```
.claude/
├── agents/                 # 22 specialized subagent definitions
│   ├── planner.md         # Research and planning agent
│   ├── code-reviewer.md   # Code review agent
│   ├── code-simplifier.md # Post-implementation cleanup agent
│   ├── debugger.md        # Debugging specialist
│   └── ...
├── commands/               # 60+ slash commands
│   ├── plan.md            # /plan - Create implementation plans
│   ├── plan/hard.md       # /plan-hard - Deep research planning
│   ├── plan/parallel.md   # /plan-parallel - Parallel-executable phases
│   ├── plan/validate.md   # /plan-validate - Validate plan with interview
│   ├── cook.md            # /cook - Implement features
│   ├── fix.md             # /fix - Fix bugs
│   ├── fix/hard.md        # /fix-hard - Complex issue resolution
│   ├── fix/test.md        # /fix-test - Test suite fixes
│   ├── fix/ci.md          # /fix-ci - CI/CD pipeline fixes
│   ├── review/post-task.md # /review-post-task - Two-pass code review
│   └── ...
├── hooks/                  # 35 lifecycle event handlers
│   ├── session-init.cjs   # SessionStart: Initialize session context
│   ├── workflow-router.cjs # UserPromptSubmit: Detect workflows
│   ├── lessons-injector.cjs # UserPromptSubmit/PreToolUse: Inject lessons
│   ├── init-reference-docs.cjs # UserPromptSubmit: Scaffold companion docs
│   ├── edit-enforcement.cjs # PreToolUse: Block edits without todos
│   ├── skill-enforcement.cjs # PreToolUse: Block impl skills without todos
│   ├── todo-tracker.cjs   # PostToolUse: Track todo usage
│   ├── verify-hooks.cjs   # Utility: Validate all hooks
│   ├── lib/               # Shared hook utilities
│   │   ├── edit-state.cjs # Edit state tracking
│   │   ├── swap-engine.cjs # External Memory Swap engine
│   │   ├── workflow-state.cjs # Persistent workflow state
│   │   ├── todo-state.cjs # Todo enforcement state management
│   │   └── ...
│   └── tests/             # Hook test files (5 tests)
│       ├── test-scout-block.js
│       ├── test-privacy-block.js
│       └── ...
├── lessons.md             # Learned lessons (human-readable)
├── output-styles/          # 6 coding level definitions
│   ├── coding-level-0-eli5.md
│   ├── coding-level-4-lead.md  # Tech Lead mode
│   └── ...
├── scripts/                # Utility scripts
│   ├── set-active-plan.cjs
│   ├── generate_catalogs.py
│   └── ...
├── skills/                 # 70+ skill definitions
│   ├── debug/
│   ├── code-review/
│   ├── planning/
│   └── ...
├── settings.json           # Main Claude Code settings
├── .ck.json               # Project-specific config (coding level, assertions)
├── workflows.json         # Workflow automation definitions (v1.2.0)
├── statusline.cjs         # Cross-platform Node.js statusline
├── statusline.sh          # Bash statusline (macOS/Linux)
└── statusline.ps1         # PowerShell statusline (Windows)
```

---

## Configuration Files

### settings.json

Main Claude Code configuration file.

```json
{
  "permissions": {
    "allow": ["Bash(git:*)", "Bash(npm:*)", "Edit", "Read", ...],
    "deny": ["Bash(rm -rf /*)", "Edit(**/.env*)", ...],
    "ask": ["Bash(git push:*)", "Bash(npm publish:*)"],
    "defaultMode": "bypassPermissions"
  },
  "hooks": {
    "SessionStart": [...],
    "UserPromptSubmit": [...],
    "PreToolUse": [...],
    "PostToolUse": [...],
    "PreCompact": [...],
    "SessionEnd": [...]
  },
  "statusLine": {
    "type": "command",
    "command": "node .claude/statusline.cjs"
  },
  "enabledPlugins": {
    "code-review@claude-plugins-official": true,
    "typescript-lsp@claude-plugins-official": true,
    ...
  }
}
```

**Key Features:**

- **Permissions**: Fine-grained allow/deny/ask lists for tool access
- **Hooks**: Lifecycle event handlers (see [Hook System](#hook-system))
- **Plugins**: Official Claude plugins for LSP, code review, etc.

### .ck.json

Project-specific configuration.

```json
{
  "codingLevel": 4,          // 0-5 (ELI5 to God mode)
  "project": "single-repo",
  "packageManager": "npm",
  "plan": {
    "naming": "{date}-{issue}-{slug}",
    "validation": ["frontmatter", "status", "title"]
  },
  "codeReview": {
    "enabled": true,
    "rulesPath": "docs/code-review-rules.md",
    "injectOnSkills": ["code-review", "review-pr", "review-changes", "code-reviewer"]
  },
  "assertions": [
    "Backend: Use service-specific repositories (IGrowthRootRepository)",
    "Backend: Use PlatformValidationResult fluent API",
    "Frontend: Extend AppBaseComponent",
    ...
  ]
}
```

**Key Features:**

- **Coding Level**: Determines output style (see [Output Styles](#output-styles-coding-levels))
- **Assertions**: 15 project-specific rules injected into context
- **Plan Settings**: Naming conventions and validation rules
- **Code Review**: Auto-injects project-specific review rules when review skills activate (see below)

#### Code Review Rules Configuration

The `codeReview` section enables automatic injection of project-specific code review rules:

| Field            | Type     | Description                                                        |
| ---------------- | -------- | ------------------------------------------------------------------ |
| `enabled`        | boolean  | Enable/disable rule injection (default: `true`)                    |
| `rulesPath`      | string   | Path to rules markdown file (default: `docs/code-review-rules.md`) |
| `injectOnSkills` | string[] | Skills that trigger injection                                      |

**How it works:**

1. When a review skill is invoked (e.g., `/code-review`, `/review-pr`)
2. Hook checks if rules were recently injected (deduplication)
3. Reads rules from the configured markdown file
4. Injects rules into Claude's context for the review session

**To update code review rules:**

1. Edit `docs/code-review-rules.md` directly
2. Add patterns with ❌ (wrong) and ✅ (correct) examples
3. Rules auto-inject next time a review skill is used

**To add new trigger skills:**

1. Add skill name to `injectOnSkills` array
2. Skill matching is case-insensitive and partial (e.g., "review" matches "review-pr")

### workflows.json

Workflow automation definitions (v1.2.0).

```json
{
  "version": "1.2.0",
  "workflows": {
    "feature": {
      "sequence": ["plan", "cook", "code-simplifier", "code-review", "test", "docs-update", "watzup"],
      "triggers": {
        "en": ["implement", "add", "create", "build", "develop"],
        "vi": ["thêm", "tạo", "xây dựng"],
        ...
      }
    },
    "bugfix": {
      "sequence": ["scout", "investigate", "debug", "plan", "fix", "code-simplifier", "code-review", "test"],
      "triggers": { "en": ["bug", "fix", "error", "broken"], ... }
    },
    ...
  },
  "stepMappings": {
    "plan": { "skill": "plan", "todoLabel": "/plan - Create implementation plan" },
    "cook": { "skill": "cook", "todoLabel": "/cook - Implement feature" },
    ...
  },
  "commandMapping": {
    "plan": { "claude": "/plan", "copilot": "@workspace /plan" },
    "cook": { "claude": "/cook", "copilot": "@workspace /cook" },
    "code": { "claude": "/code", "copilot": "@workspace /code" },
    "test": { "claude": "/test", "copilot": "@workspace /test" },
    ...
  },
  "checkpoints": {
    "enabled": true,
    "intervalMinutes": 30,
    "path": "plans/reports",
    "autoSaveOnCompact": true,
    "filenamePattern": "checkpoint-{YYMMDD}-{HHMM}-{slug}.md"
  }
}
```

**Key Features:**

- **Cross-Platform Commands**: 12 commands mapped for both Claude Code and GitHub Copilot
- **Checkpoints**: Automatic state preservation every 30 minutes and on compaction
- **Multilingual Triggers**: 5 languages (en, vi, zh, ja, ko)

**Workflow Types:**

| Type          | Sequence                                                                        |
| ------------- | ------------------------------------------------------------------------------- |
| feature       | plan → cook → code-simplifier → code-review → test → docs-update → watzup       |
| bugfix        | scout → investigate → debug → plan → fix → code-simplifier → code-review → test |
| documentation | scout → investigate → docs-update → watzup                                      |
| refactor      | plan → code → code-simplifier → code-review → test                              |
| review        | code-review → watzup                                                            |
| investigation | scout → investigate                                                             |

**Command Mapping (Claude Code ↔ GitHub Copilot):**

| Step             | Claude Code              | GitHub Copilot                      |
| ---------------- | ------------------------ | ----------------------------------- |
| plan             | `/plan`                  | `@workspace /plan`                  |
| cook             | `/cook`                  | `@workspace /cook`                  |
| code             | `/code`                  | `@workspace /code`                  |
| test             | `/test`                  | `@workspace /test`                  |
| fix              | `/fix`                   | `@workspace /fix`                   |
| debug            | `/debug`                 | `@workspace /debug`                 |
| scout            | `/scout`                 | `@workspace /scout`                 |
| investigate      | `/feature-investigation` | `@workspace /feature-investigation` |
| code-review      | `/code-review`           | `@workspace /code-review`           |
| code-simplifier  | `/code-simplifier`       | `@workspace /code-simplifier`       |
| review:post-task | `/review-post-task`      | `@workspace /review-post-task`      |
| docs-update      | `/docs-update`           | `@workspace /docs-update`           |
| watzup           | `/watzup`                | `@workspace /watzup`                |

---

## Hook System

Hooks are lifecycle event handlers that execute at specific points in the Claude Code session.

### Hook Lifecycle

```
SessionStart (startup|resume|clear|compact)
    ↓
UserPromptSubmit (every user message)
    ↓
PreToolUse (before tool execution)
    ↓
[Tool Execution]
    ↓
PostToolUse (after tool execution)
    ↓
PreCompact (before context compaction)
    ↓
SessionEnd (clear)
```

### Hook Files

| Hook                              | Event                    | Purpose                                                              |
| --------------------------------- | ------------------------ | -------------------------------------------------------------------- |
| `session-init.cjs`                | SessionStart             | Initialize session, detect project, inject coding level              |
| `workflow-router.cjs`             | UserPromptSubmit         | Detect intent, start workflows                                       |
| `lessons-injector.cjs`            | UserPromptSubmit         | Inject lessons from docs/lessons.md                               |
| `dev-rules-reminder.cjs`          | UserPromptSubmit         | Inject development rules                                             |
| `scout-block.cjs`                 | PreToolUse               | Block access to ignored directories                                  |
| `privacy-block.cjs`               | PreToolUse               | Block access to sensitive files                                      |
| `backend-csharp-context.cjs`      | PreToolUse (Edit/Write)  | Inject C# patterns for .cs files                                     |
| `frontend-typescript-context.cjs` | PreToolUse (Edit/Write)  | Inject TS patterns for .ts files                                     |
| `post-edit-prettier.cjs`          | PostToolUse (Edit/Write) | Format edited files with Prettier                                    |
| `skill-enforcement.cjs`           | PreToolUse (Skill)       | Block implementation skills without todos                            |
| `todo-tracker.cjs`                | PostToolUse (TaskCreate) | Track todo usage for enforcement                                     |
| `write-compact-marker.cjs`        | PreCompact               | Write compaction marker for statusline baseline reset                |
| `tool-output-swap.cjs`            | PostToolUse              | Externalize large outputs to swap files for post-compaction recovery |

### Context Injection Flow

```
Edit .cs file requested
    ↓
PreToolUse: backend-csharp-context.cjs
    ↓
Injects: Repository patterns, validation fluent API,
         entity event handlers, DTO mapping patterns
    ↓
Claude applies patterns in edit
```

### Todo Enforcement System

The todo enforcement system ensures workflows aren't skipped by blocking implementation skills when no todos have been set.

**Components:**

| File                   | Event                    | Purpose                                                              |
| ---------------------- | ------------------------ | -------------------------------------------------------------------- |
| `lib/todo-state.cjs`   | -                        | State management library (with lastTodos recovery)                   |
| `skill-enforcement.cjs` | PreToolUse (Skill)       | Blocks implementation skills without todos                           |
| `todo-tracker.cjs`     | PostToolUse (TaskCreate) | Updates state when todos are set (stores last 10 todos for recovery) |

**Allowed Skills (always pass):**

- Investigation: `scout`, `investigate`, `explore`, `planning`
- Planning: `plan`, `plan-hard`, `plan-validate`, `design`
- Review: `analyze`, `review`, `code-review`, `watzup`, `debug`
- Utility: `help`, `memory`, `checkpoint`, `recover`, `git:status`

**Blocked Skills (require todos):**

- Implementation: `cook`, `code`, `fix`, `feature`, `implement`
- Development: `refactor`, `build`, `create`, `develop`, `migration`

**Flow:**

```
Skill tool invoked
    ↓
skill-enforcement.cjs checks skill name
    ↓
If implementation skill:
    ├─ Check todo state file exists
    ├─ If hasTodos: true → Allow execution
    └─ If no todos → Block with message:
       "BLOCKED: Call TaskCreate before implementation"
    ↓
If allowed skill → Always pass through
```

**Bypass Mechanism:**

The system allows bypassing with `CK_BYPASS_TODO_CHECK=1` environment variable for testing or recovery scenarios.

---

## Workflow Automation

The workflow system automatically detects user intent and follows structured development workflows through a multi-layer orchestration system.

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CLAUDE CODE RUNTIME                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────┐     ┌──────────────────┐     ┌─────────────────────────┐   │
│  │ User Prompt │────▶│ UserPromptSubmit │────▶│ Workflow Router Hook    │   │
│  │             │     │ Hook Event       │     │ (workflow-router.cjs)   │   │
│  └─────────────┘     └──────────────────┘     └───────────┬─────────────┘   │
│                                                           │                  │
│                                   ┌───────────────────────▼────────────────┐│
│                                   │          workflows.json                ││
│                                   │  - Pattern matching rules              ││
│                                   │  - Workflow sequences                  ││
│                                   │  - Command mappings                    ││
│                                   └───────────────────────┬────────────────┘│
│                                                           │                  │
│                                   ┌───────────────────────▼────────────────┐│
│                                   │     Inject Instructions to LLM         ││
│                                   │  "Detected: Feature Implementation"   ││
│                                   │  "Following: /plan → ... → /cook → /review-changes → /test → ..."     ││
│                                   └───────────────────────┬────────────────┘│
│                                                           │                  │
│  ┌───────────────────────────────────────────────────────▼─────────────────┐│
│  │                          CLAUDE AI (LLM)                                ││
│  │  1. Reads injected instructions                                         ││
│  │  2. Announces workflow to user                                          ││
│  │  3. Executes Skill tool with each step (/plan, /cook, /test...)        ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
```

### Intent Detection

The `workflow-router.cjs` hook analyzes user prompts for trigger keywords:

```javascript
// Pattern-based scoring with priority weights
const scores = {
  feature: calculateScore(prompt, ['implement', 'add', 'create', 'build']),
  bugfix: calculateScore(prompt, ['bug', 'fix', 'error', 'broken']),
  documentation: calculateScore(prompt, ['docs', 'document', 'readme']),
  ...
};

// Highest score wins
const detectedWorkflow = Object.entries(scores)
  .filter(([_, score]) => score > 0.5)
  .sort((a, b) => b[1] - a[1])[0]?.[0];
```

### Workflow Detection Matrix

| User Prompt                 | Matched Patterns | Excluded By            | Result                 |
| --------------------------- | ---------------- | ---------------------- | ---------------------- |
| "Add dark mode feature"     | `add.*feature`   | -                      | Feature workflow       |
| "Fix the login bug"         | `fix`, `bug`     | -                      | Bugfix workflow        |
| "Add a fix for the crash"   | `add`, `fix`     | `fix` excludes feature | Bugfix wins            |
| "/plan dark mode"           | -                | `^\/\w+` (explicit)    | Skip detection         |
| "quick: add button"         | -                | `quick:` prefix        | Skip detection         |
| "How does auth work?"       | `how does.*work` | -                      | Investigation          |
| "Refactor the user service" | `refactor`       | -                      | Refactor workflow      |
| "Update the README"         | `readme`         | -                      | Documentation workflow |

### Workflow Execution

1. **Detection**: User prompt analyzed for intent
2. **Announcement**: `"Detected: Feature Implementation workflow"`
3. **TaskCreate**: All workflow steps created as todo items
4. **Confirmation**: Ask user to proceed (skip with `quick:` prefix)
5. **Execution**: Follow each step, updating todo status
6. **Recovery**: State persisted to survive context compaction

### Complete Execution Flow Example

**User Types:** "Add a dark mode toggle to the settings page"

#### Phase 1: Hook Execution (Before LLM Sees Prompt)

```
┌────────────────────────────────────────────────────────────────────┐
│ CLAUDE CODE RUNTIME                                                │
│                                                                    │
│  1. User submits prompt via CLI                                    │
│  2. UserPromptSubmit event fires                                   │
│  3. workflow-router.cjs executes:                                  │
│     - Pattern "add" matches feature.triggerPatterns ✓              │
│     - No exclude patterns matched ("fix", "bug" not present)       │
│     - Score: 10 points for "feature" workflow                      │
│     - Confidence: 100%                                             │
│  4. dev-rules-reminder.cjs executes:                               │
│     → Session context, paths, naming patterns to stdout            │
└────────────────────────────────────────────────────────────────────┘
```

#### Phase 2: LLM Receives Combined Context

Claude sees this in its context window:

```
[User Message]
Add a dark mode toggle to the settings page

[System Reminder - from workflow-router.cjs]
## Workflow Detected

**Intent:** Feature Implementation (100% confidence)
**Workflow:** /scout → /investigate → /plan → /plan-review → /plan-validate → /why-review → /cook → /code-simplifier → /review-changes → /code-review → /sre-review → /changelog → /test → /docs-update → /watzup

### Instructions (MUST FOLLOW)
1. **FIRST:** Announce the detected workflow to the user
2. **ASK:** "Proceed with this workflow? (yes/no/quick)"
3. **THEN:** Execute each step in sequence
```

#### Phase 3: Sequential Skill Execution

User says "yes", then Claude executes each step:

```
Step 1: Claude calls Skill tool with skill="plan"
  → Creates implementation plan at plans/251231-1128-dark-mode/README.md

Step 2: Claude calls Skill tool with skill="cook"
  → Implements the feature, creates src/components/DarkModeToggle.tsx

Step 3: Claude calls Skill tool with skill="test"
  → Runs tests, verifies all pass

Step 4: Claude calls Skill tool with skill="code-review"
  → Reviews implementation, reports any issues

Step 5: Claude calls Skill tool with skill="docs-update"
  → Updates documentation

Step 6: Claude calls Skill tool with skill="watzup"
  → Generates summary of changes
```

### How the LLM "Follows" Workflows

The LLM doesn't have built-in workflow logic. Instead, it follows instructions because they're injected as system context:

| Layer         | Mechanism                | What Happens                                  |
| ------------- | ------------------------ | --------------------------------------------- |
| **Hook**      | JavaScript script        | Runs BEFORE LLM, analyzes prompt              |
| **Injection** | stdout → system-reminder | Instructions appended to LLM's context        |
| **Inference** | LLM reads "MUST FOLLOW"  | LLM treats injected text as authoritative     |
| **Tools**     | Skill/Bash/Read/Edit     | LLM calls tools to execute each workflow step |

**Key Insight:** Instructions with phrases like "MUST FOLLOW", "Instructions", and numbered steps influence LLM behavior because they appear as system-level guidance that the model is trained to respect.

### Override Mechanisms

| Mechanism        | Usage                  | Effect                                 |
| ---------------- | ---------------------- | -------------------------------------- |
| `quick:` prefix  | `quick: add button`    | Skip confirmation, still creates todos |
| Explicit command | `/fix the bug`         | Directly executes specific skill       |
| Simple task      | Single-line changes    | Skip workflow entirely                 |
| Say "quick"      | After detection prompt | Skip full workflow, handle directly    |

### Workflow Troubleshooting

#### Workflow Not Detected

1. Check if patterns in `workflows.json` match your prompt
2. Verify `settings.enabled` is `true`
3. Check if an exclude pattern is blocking detection
4. Try explicit command: `/plan your task`

#### Wrong Workflow Detected

1. Review pattern priorities (lower number = higher priority)
2. Add exclude patterns to prevent false matches
3. Use `quick:` prefix to bypass detection

#### Workflow Steps Forgotten (Context Loss)

**Automatic Recovery (v1.2.0+):** The system includes 3-hook recovery infrastructure:

| Hook                        | Event                 | Action                     |
| --------------------------- | --------------------- | -------------------------- |
| `write-compact-marker.cjs`  | PreCompact            | Write marker for recovery  |
| `post-compact-recovery.cjs` | SessionStart (resume) | Inject recovery context    |
| `workflow-step-tracker.cjs` | PostToolUse (Skill)   | Advance to next step       |

**Manual Recovery:** Use `/recover` command or find latest checkpoint at `plans/reports/memory-checkpoint-*.md`

### Workflow Best Practices

1. **Define Clear Patterns**: Use specific regex patterns that minimize false positives
2. **Use Exclude Patterns**: Prevent workflow conflicts by excluding competing keywords
3. **Set Appropriate Priorities**: Ensure most specific workflows have lower priority numbers
4. **Require Confirmation for High-Impact**: Set `confirmFirst: true` for feature/refactor workflows
5. **Keep Sequences Focused**: Fewer steps = faster execution, more steps = thorough coverage

---

## Lessons System

The learning system uses a simple file-based approach to capture and inject lessons learned during development sessions.

### How It Works

| Component              | Description                                                    |
| ---------------------- | -------------------------------------------------------------- |
| **`/learn` skill**     | Appends lessons to `docs/lessons.md`                        |
| **`lessons-injector.cjs`** | Injects lessons on `UserPromptSubmit` and `PreToolUse(Edit\|Write\|MultiEdit)` |
| **`docs/lessons.md`** | Human-readable markdown file storing all learned patterns    |

### Lesson Injection Flow

```
1. User invokes /learn with a lesson
       ↓
2. /learn skill appends to docs/lessons.md
       ↓
3. On next prompt, lessons-injector.cjs reads docs/lessons.md
       ↓
4. Lessons injected into Claude's context window
       ↓
5. Claude follows lessons as contextual instructions
```

### Key Files

| File                     | Role                                          |
| ------------------------ | --------------------------------------------- |
| `/learn` skill           | Appends lessons to `docs/lessons.md`       |
| `lessons-injector.cjs`   | Injects lessons on prompt submit and edits    |
| `docs/lessons.md`     | Human-readable lessons storage                |

---

## Skills Catalog

Skills are reusable prompt templates that provide specialized capabilities. **77 skills** organized by domain.

### Skill Structure

```markdown
---
name: Debugging
description: Systematic debugging framework...
version: 3.0.0
languages: all
---

# Debugging

## Core Principle
**NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST**

## When to Use
...

## The Four Techniques
...
```

### Development Skills (11)

| Skill             | Description                                     | Trigger Keywords           |
| ----------------- | ----------------------------------------------- | -------------------------- |
| `debug`           | 4-phase systematic debugging framework          | bug, error, investigate    |
| `code-review`     | Receive/request reviews with verification gates | review, check, audit       |
| `code-simplifier` | Post-implementation cleanup                     | simplify, refactor, clean  |
| `refactoring`     | Safe code restructuring                         | refactor, restructure      |
| `test-spec` | Generate test specifications and test cases     | test, unit test, coverage  |
| `webapp-testing`  | Web application testing strategies              | e2e, integration, selenium |
| `commit`          | Stage and commit with conventional messages     | commit, git commit         |
| `learn`           | Teach Claude a pattern explicitly               | remember, always, never    |
| `package-upgrade` | Upgrade dependencies safely                     | upgrade, update deps       |
| `skill-creator`   | Create new skills                               | create skill, new skill    |

### Architecture Skills (4)

| Skill                            | Description                          | Trigger Keywords               |
| -------------------------------- | ------------------------------------ | ------------------------------ |
| `api-design`                     | REST API endpoint design             | API, endpoint, controller      |
| `arch-security-review`           | Security vulnerability analysis      | security, authorization, OWASP |
| `arch-performance-optimization`  | Performance bottleneck analysis      | slow, optimize, performance    |
| `arch-cross-service-integration` | Cross-service communication patterns | integration, sync, message bus |

### Frontend Skills (6)

| Skill              | Description                                       | Trigger Keywords                             |
| ------------------ | ------------------------------------------------- | -------------------------------------------- |
| `frontend-design`  | UI/UX implementation with design systems          | UI, design, styling                          |
| *(removed — handled by hooks + `docs/frontend-patterns-reference.md`)* | | |
| `shadcn-tailwind`  | React component library + Tailwind CSS            | shadcn, Tailwind, Radix                      |
| `ui-ux-pro-max`    | Advanced UI/UX patterns                           | user experience, interface                   |
| `threejs`          | 3D graphics with Three.js                         | 3D, WebGL, Three.js                          |

### Backend Skills (5)

| Skill                   | Description                          | Trigger Keywords            |
| ----------------------- | ------------------------------------ | --------------------------- |
| `api-design`            | REST API endpoint design, CQRS       | C#, backend, CQRS, .NET     |
| `databases`             | MongoDB, PostgreSQL patterns         | database, query, SQL, Mongo |
| `database-optimization` | Query optimization, indexing, N+1    | slow query, N+1, index      |
| `better-auth`           | Framework-agnostic TypeScript auth   | auth, OAuth, JWT, session   |
| `payment-integration`   | Payment gateway integration          | Stripe, payment, checkout   |

### Planning Skills (4)

| Skill                 | Description                                         | Trigger Keywords                           |
| --------------------- | --------------------------------------------------- | ------------------------------------------ |
| `planning`            | Mental models, plan file format (includes research) | plan, design, architect, research, explore |
| `problem-solving`     | Problem decomposition frameworks                    | problem, analyze, solve                    |
| `sequential-thinking` | Step-by-step reasoning                              | think, reason, steps                       |
| `plan-analysis`       | Analyze existing plans                              | analyze plan, review plan                  |

### Documentation Skills (5)

| Skill                   | Description                                             | Trigger Keywords                            |
| ----------------------- | ------------------------------------------------------- | ------------------------------------------- |
| `documentation`         | Technical documentation and README files                | document, API docs, JSDoc, README           |
| `feature-docs` | BravoSUITE business module docs (includes feature-docs) | business feature, module docs, feature docs |
| `docs-seeker`           | Search technical documentation                          | find docs, search docs                      |
| `test-specs-docs`       | Test specification documentation                        | test specs, test docs                       |
| `repomix`               | Repository analysis and summarization                   | repo summary, codebase                      |

### AI/ML Skills (6)

| Skill               | Description                           | Trigger Keywords              |
| ------------------- | ------------------------------------- | ----------------------------- |
| `ai-artist`         | Prompt engineering for LLMs/image gen | prompt, LLM, image generation |
| `ai-multimodal`     | Gemini API multimedia processing      | audio, video, image analysis  |
| `mcp-builder`       | MCP server development                | MCP, server, protocol         |
| `mcp-management`    | Manage MCP server integrations        | MCP tools, MCP resources      |
| `google-adk-python` | Google ADK for Python                 | Google ADK, agent SDK         |
| `ai-dev-tools-sync` | Sync Claude Code and Copilot configs  | sync tools, AI config         |

### DevOps Skills (4)

| Skill              | Description                        | Trigger Keywords              |
| ------------------ | ---------------------------------- | ----------------------------- |
| `devops`           | Cloudflare, Docker, GCP deployment | deploy, cloud, container, K8s |
| `chrome-devtools`  | Browser automation with Puppeteer  | browser, puppeteer, CDP       |
| `media-processing` | FFmpeg, ImageMagick, RMBG          | video, audio, image edit      |
| `shopify`          | Shopify development patterns       | Shopify, e-commerce           |

### Utility Skills (7)

| Skill                       | Description                          | Trigger Keywords                |
| --------------------------- | ------------------------------------ | ------------------------------- |
| `context-optimization`      | Context window management            | context, compress, tokens       |
| `memory-management`         | Cross-session memory and checkpoints | remember, save pattern, persist |
| `branch-comparison`         | Git branch analysis                  | compare branches, git diff      |
| `debug`                     | Bug investigation                    | debug, diagnose, trace          |
| `domain-name-brainstormer`  | Generate domain name ideas           | domain, naming, TLD             |
| `developer-growth-analysis` | Analyze coding patterns for growth   | growth, learning, improve       |
| `markdown-novel-viewer`     | Markdown novel rendering             | novel, markdown viewer          |

### Document Processing Skills (4)

| Skill                  | Description                   | Trigger Keywords         |
| ---------------------- | ----------------------------- | ------------------------ |
| `document-skills/pdf`  | PDF processing and extraction | PDF, extract PDF         |
| `document-skills/docx` | Word document processing      | DOCX, Word, document     |
| `document-skills/xlsx` | Excel spreadsheet processing  | Excel, XLSX, spreadsheet |
| `document-skills/pptx` | PowerPoint processing         | PowerPoint, PPTX, slides |

### Task-Specific Skills (5)

| Skill                          | Description                     | Trigger Keywords  |
| ------------------------------ | ------------------------------- | ----------------- |
| `tasks-feature-implementation` | Feature implementation workflow | implement feature |
| `tasks-code-review`            | Code review workflow            | review code       |
| `tasks-documentation`          | Documentation workflow          | update docs       |
| `tasks-test-generation`        | Test generation workflow        | generate tests    |
| `tasks-spec-update`            | Specification update workflow   | update spec       |

### Mobile & Web Framework Skills (3)

| Skill                   | Description                    | Trigger Keywords              |
| ----------------------- | ------------------------------ | ----------------------------- |
| `mobile-development`    | React Native, Flutter patterns | mobile, React Native, Flutter |
| `web-frameworks`        | Next.js, Remix, Astro patterns | Next.js, Remix, SSR           |
| `feature`               | General feature implementation | implement, build feature      |
| `feature-investigation` | Investigate existing features  | how does, explain, trace      |

---

## Agents

Agents are specialized subprocesses that handle complex, multi-step tasks autonomously. **22 agents** with different capabilities.

### Agent Overview

| Agent                 | Purpose                                  | Model  | Auto-Invocation       |
| --------------------- | ---------------------------------------- | ------ | --------------------- |
| `planner`             | Research and create implementation plans | opus   | /plan, /plan-hard     |
| `code-reviewer`       | Comprehensive code review                | sonnet | /code-review, /review |
| `debugger`            | Investigate and fix issues               | sonnet | /debug, /fix-hard     |
| `tester`              | Validate code quality through tests      | sonnet | /test                 |
| `researcher`          | Comprehensive research on topics         | sonnet | /research             |
| `docs-manager`        | Manage technical documentation           | sonnet | /docs-update          |
| `ui-ux-designer`      | UI/UX design and review                  | sonnet | /design               |
| `code-simplifier`     | Post-implementation cleanup              | sonnet | /code-simplifier      |
| `fullstack-developer` | Implementation phases                    | sonnet | /cook                 |
| `git-manager`         | Stage, commit, push changes              | sonnet | /commit, /git         |
| `scout`               | Locate files across codebase             | sonnet | /scout                |
| `scout-external`      | External tool codebase search            | sonnet | /scout-ext            |
| `database-admin`      | Database operations and optimization     | sonnet | /db-migrate           |
| `project-manager`     | Track progress, consolidate reports      | sonnet | Manual                |
| `journal-writer`      | Document technical difficulties          | sonnet | /journal              |

### Agent Invocation Patterns

**Automatic (via skill):**

```
User: "Create a plan for adding dark mode"
→ Claude calls Skill tool with skill="plan"
→ plan.md skill activates planner agent
→ Planner agent creates comprehensive plan
```

**Manual (via Task tool):**

```
User: "Use the debugger agent to investigate this issue"
→ Claude calls Task tool with subagent_type="debugger"
→ Debugger agent runs investigation workflow
```

**Background (parallel execution):**

```
User: "Research these three topics in parallel"
→ Claude calls Task tool 3x with run_in_background=true
→ Three researcher agents run concurrently
→ Results collected when all complete
```

### Agent Context Injection

Each agent receives context via `subagent-init.cjs` hook:

```
Agent starts
    ↓
subagent-init.cjs executes
    ↓
Injects:
  - Active plan path (CK_ACTIVE_PLAN)
  - Reports directory (CK_REPORTS_DIR)
  - Naming conventions (CK_NAME_PATTERN)
  - Project-specific rules (assertions)
  - Coding level (CK_CODING_LEVEL)
```

### Agent Output Patterns

| Agent          | Output Location      | Format                         |
| -------------- | -------------------- | ------------------------------ |
| planner        | plans/{date}-{slug}/ | plan.md + phase-XX.md files    |
| researcher     | plans/reports/       | researcher-{date}-{slug}.md    |
| code-reviewer  | inline               | Review comments with line refs |
| tester         | inline               | Test results with coverage     |
| git-manager    | inline               | Git operation status           |
| docs-manager   | docs/                | Updated documentation files    |
| scout          | inline               | File paths and descriptions    |
| journal-writer | plans/reports/       | journal-{date}-{slug}.md       |

### Agent Definition Structure

```markdown
---
name: planner
description: Use this agent for research and planning...
model: opus
---

You are an expert planner with deep expertise...

## Your Skills
**IMPORTANT**: Use `planning` skills...

## Role Responsibilities
- YAGNI, KISS, DRY principles
- Token efficiency
- Concise grammar
...
```

---

## Commands Reference

Commands are slash-invocable prompts that trigger specific actions. **95 commands** available.

### Command Structure

```markdown
---
description: Create implementation plan for a feature
---

Analyze the task and create a comprehensive plan...

**IMPORTANT**: Do not start implementing...
```

### Planning Commands (10)

| Command       | Variant     | Description                                      |
| ------------- | ----------- | ------------------------------------------------ |
| `/plan`       | -           | Create implementation plan with YAML frontmatter |
| `/plan`       | `:hard`     | Deep research with parallel researcher agents    |
| `/plan`       | `:parallel` | Create parallel-executable phases                |
| `/plan`       | `:validate` | Validate plan with critical questions interview  |
| `/plan`       | `:fast`     | Quick planning without deep research             |
| `/plan`       | `:two`      | Two-phase planning approach                      |
| `/plan`       | `:ci`       | Plan CI/CD pipeline changes                      |
| `/plan`       | `:cro`      | Conversion rate optimization planning            |
| `/plan`       | `:archive`  | Archive completed plan                           |
| `/brainstorm` | -           | Brainstorm solutions and approaches              |

### Implementation Commands (16)

| Command            | Variant          | Description                                     |
| ------------------ | ---------------- | ----------------------------------------------- |
| `/cook`            | -                | Implement features using orchestrated subagents |
| `/cook`            | `:hard`          | Complex implementation with thorough approach   |
| `/cook`            | `:fast`          | Quick implementation without full workflow      |
| `/cook`            | `:parallel`      | Parallel implementation phases                  |
| `/cook`            | `:auto`          | Auto-continue implementation                    |
| `/cook`            | `:auto/fast`     | Fast auto-continue                              |
| `/cook`            | `:auto/parallel` | Parallel auto-continue                          |
| `/code`            | -                | Write code with best practices                  |
| `/code`            | `:auto`          | Auto-continue coding                            |
| `/code`            | `:parallel`      | Parallel coding tasks                           |
| `/code`            | `:no-test`       | Code without running tests                      |
| `/code-simplifier` | -                | Simplify and refine code                        |
| `/create-feature`  | -                | Create new feature scaffold                     |
| `/feature`         | -                | Feature documentation                           |
| `/generate-dto`    | -                | Generate DTO from entity                        |
| `/migration`       | -                | Database migration commands                     |

### Bug Fix Commands (10)

| Command      | Variant     | Description                                |
| ------------ | ----------- | ------------------------------------------ |
| `/fix`       | -           | Debug and fix issues systematically        |
| `/fix`       | `:hard`     | Complex issue with full debugging workflow |
| `/fix`       | `:fast`     | Quick fix without deep analysis            |
| `/fix`       | `:test`     | Fix failing tests                          |
| `/fix`       | `:ci`       | Fix CI/CD pipeline failures                |
| `/fix`       | `:ui`       | Fix UI/UX issues                           |
| `/fix`       | `:types`    | Fix TypeScript type errors                 |
| `/fix`       | `:parallel` | Parallel fix execution                     |
| `/fix`       | `:logs`     | Fix based on log analysis                  |
| `/fix-issue` | -           | Fix GitHub issue                           |

### Investigation Commands (5)

| Command                  | Variant | Description                   |
| ------------------------ | ------- | ----------------------------- |
| `/scout`                 | -       | Locate files across codebase  |
| `/scout`                 | `:ext`  | External tool codebase search |
| `/feature-investigation` | -       | Deep dive into implementation |
| `/debug`                 | -       | Debug specific issue          |
| `/ask`                   | -       | Ask questions about codebase  |

### Review Commands (5)

| Command           | Variant      | Description                |
| ----------------- | ------------ | -------------------------- |
| `/review`         | -            | Request code review        |
| `/review`         | `:post-task` | Two-pass review after task |
| `/review`         | `:codebase`  | Review entire codebase     |
| `/review-changes` | -            | Review recent changes      |
| `/lint`           | -            | Run linting checks         |

### Testing Commands (3)

| Command  | Variant | Description             |
| -------- | ------- | ----------------------- |
| `/test`  | -       | Run and analyze tests   |
| `/test`  | `:ui`   | Run UI/E2E tests        |
| `/build` | -       | Build project and check |

### Git Commands (6)

| Command          | Variant  | Description                 |
| ---------------- | -------- | --------------------------- |
| `/git`           | `/cm`    | Stage and commit changes    |
| `/git`           | `/cp`    | Cherry-pick commits         |
| `/git`           | `/merge` | Merge branches              |
| `/git`           | `/pr`    | Create pull request         |
| `/pr`            | -        | Create/manage pull requests |
| `/release-notes` | -        | Generate release notes      |

### Documentation Commands (5)

| Command    | Variant      | Description                   |
| ---------- | ------------ | ----------------------------- |
| `/docs`    | `/init`      | Initialize documentation      |
| `/docs`    | `/update`    | Update documentation          |
| `/docs`    | `/summarize` | Summarize documentation       |
| `/watzup`  | -            | Generate change summary       |
| `/journal` | -            | Write technical journal entry |

### Content Commands (4)

| Command    | Variant    | Description                  |
| ---------- | ---------- | ---------------------------- |
| `/content` | `/fast`    | Quick content generation     |
| `/content` | `/good`    | Quality content generation   |
| `/content` | `/enhance` | Enhance existing content     |
| `/content` | `/cro`     | Conversion-optimized content |

### Design Commands (6)

| Command   | Variant       | Description                  |
| --------- | ------------- | ---------------------------- |
| `/design` | `/fast`       | Quick design generation      |
| `/design` | `/good`       | Quality design generation    |
| `/design` | `/3d`         | 3D design generation         |
| `/design` | `/screenshot` | Design from screenshot       |
| `/design` | `/describe`   | Describe design requirements |
| `/design` | `/video`      | Video design generation      |

### Utility Commands (12)

| Command         | Description                   |
| --------------- | ----------------------------- |
| `/checkpoint`   | Save context checkpoint       |
| `/recover`      | Restore from checkpoint       |
| `/compact`      | Trigger context compaction    |
| `/context`      | Show context information      |
| `/coding-level` | Change output verbosity level |
| `/ck-help`      | Claude Kit help               |
| `/kanban`       | View plans as kanban board    |
| `/performance`  | Performance analysis          |
| `/security`     | Security analysis             |
| `/worktree`     | Git worktree operations       |
| `/preview`      | Preview changes               |
| `/db-migrate`   | Database migration            |

### Bootstrap Commands (5)

| Command      | Variant          | Description                  |
| ------------ | ---------------- | ---------------------------- |
| `/bootstrap` | -                | Bootstrap new project        |
| `/bootstrap` | `:auto`          | Auto-bootstrap with defaults |
| `/bootstrap` | `:auto/fast`     | Fast auto-bootstrap          |
| `/bootstrap` | `:auto/parallel` | Parallel auto-bootstrap      |

### Integration Commands (2)

| Command            | Description             |
| ------------------ | ----------------------- |
| `/integrate/polar` | Integrate Polar.sh      |
| `/integrate/sepay` | Integrate SePay payment |

### Skill Management Commands (5)

| Command  | Variant     | Description                |
| -------- | ----------- | -------------------------- |
| `/skill` | `/add`      | Add new skill              |
| `/skill` | `/create`   | Create skill from template |
| `/skill` | `/fix-logs` | Fix skill based on logs    |
| `/skill` | `/optimize` | Optimize skill performance |
| `/skill` | `/plan`     | Plan skill improvements    |

### MCP Commands (1)

| Command    | Description          |
| ---------- | -------------------- |
| `/use-mcp` | Use MCP server tools |

---

## Output Styles (Coding Levels)

Output styles adapt Claude's communication based on the developer's experience level.

### Configuration

Set in `.claude/.ck.json`:

```json
{
  "codingLevel": 4
}
```

### Levels Overview

| Level | Name          | Target Audience                 | Characteristics                                            |
| ----- | ------------- | ------------------------------- | ---------------------------------------------------------- |
| 0     | ELI5          | Complete beginners              | Explain everything, real-world analogies, max hand-holding |
| 1     | Junior        | 0-2 years experience            | Include examples, explain patterns, define terms           |
| 2     | Mid           | 2-5 years experience            | Balanced explanations, some patterns assumed               |
| 3     | Senior        | 5-8 years experience            | Concise, focus on edge cases, minimal explanation          |
| 4     | **Tech Lead** | 8-15 years experience (default) | Strategic thinking, risk analysis, architecture focus      |
| 5     | God Mode      | 15+ years / domain experts      | Code only, zero hand-holding, maximum velocity             |

### Injection Mechanism

`session-init.cjs` reads codingLevel from `.ck.json` and injects the appropriate style:

```javascript
const level = config.codingLevel ?? 4;  // Default to Tech Lead
const stylePath = `.claude/output-styles/coding-level-${level}-*.md`;
const style = fs.readFileSync(glob.sync(stylePath)[0], 'utf-8');
console.log(style);  // Injected into session context
```

### Example Comparison by Level

**Task:** "Add input validation to an API endpoint"

---

**Level 0 (ELI5):**

> ### Big Picture
>
> We need to make sure people send us the right information before we try to use it.
>
> ### Real-World Analogy
>
> Think of it like a bouncer at a club checking IDs. Before anyone gets in, the bouncer makes sure they have proper identification. Our code does the same thing with data!
>
> ### Let's Try It Step by Step
>
> ```csharp
> // Step 1: Check if the email is provided
> if (string.IsNullOrEmpty(request.Email))
> {
>     // If no email, return an error message
>     return BadRequest("Please provide an email address");
> }
> ```
>
> **What this does:** It looks at the email field and says "Is this empty?" If yes, we send back a friendly message.
>
> ### Try It Yourself
>
> Try sending a request without an email and see what happens!
>
> ### Check-In
>
> Does this make sense? Any questions about validation?

---

**Level 4 (Tech Lead) - Default:**

> ### Executive Summary
>
> Implement validation using PlatformValidationResult fluent API per project standards. 2-3 hours effort including edge cases. Main risk: breaking existing API consumers if error format changes.
>
> ### Risk Assessment
>
> | Risk | L | I | Mitigation |
> |------|---|---|------------|
> | Consumer breaking change | M | H | Version error format, add deprecation header |
> | Inconsistent adoption | M | M | Lint rules, code review checklist |
>
> ### Recommended Approach
>
> ```csharp
> public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
>     => base.Validate()
>         .And(_ => Email.IsNotNullOrEmpty(), "Email required")
>         .And(_ => Email.IsValidEmail(), "Invalid email format")
>         .And(_ => Amount > 0, "Amount must be positive");
> ```
>
> Uses existing fluent validation pattern. No new dependencies.
>
> ### Decisions Needed
>
> 1. Error message format - user-facing vs developer-facing?
> 2. Async validation for uniqueness checks?

---

**Level 5 (God Mode):**

> ```csharp
> public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
>     => base.Validate()
>         .And(_ => Email.IsNotNullOrEmpty(), "Email required")
>         .And(_ => Email.IsValidEmail(), "Invalid format");
> ```
>
> `PlatformValidationResult` fluent API. Chain with `.AndAsync()` for DB checks.

---

### Level 4 (Tech Lead) - Full Specification

From `coding-level-4-lead.md`:

**Communication Rules:**

- Lead with executive summary (3-4 sentences max)
- Quantify everything (latency, throughput, cost, effort)
- Be explicit about assumptions and confidence levels
- Identify decisions needing stakeholder alignment

**Risk Rules:**

- Include formal risk assessment (likelihood × impact)
- Identify single points of failure
- Propose mitigation strategies
- Flag security/compliance implications

**Code Rules:**

- Focus on interfaces and contracts over implementation
- Show only essential code
- Include complexity analysis
- Design for extensibility

**Required Response Structure:**

1. Executive Summary
2. Risk Assessment (table)
3. Strategic Options (comparison)
4. Recommended Approach
5. Operational Considerations
6. Business Impact
7. Decisions Needed

### Level 5 (God Mode) - Full Specification

From `coding-level-5-god.md`:

**Communication Rules:**

- Answer exactly what was asked - nothing more
- Default to code, not prose
- Assume they understand everything
- Be terse - every word must earn its place
- Challenge their approach if you see critical flaws

**FORBIDDEN:**

- Explaining concepts, patterns, or syntax
- Adding context, background, or motivation
- Comments unless requested
- Summaries or "Key Takeaways"
- Clarifying questions for minor ambiguities

---

## Long-Running State Tracking

The system persists workflow state across context compaction events.

### State Storage

```javascript
// workflow-state.cjs
const WORKFLOW_DIR = '/tmp/ck/workflow';

function getDefaultState() {
  return {
    workflowType: null,       // 'feature' | 'bugfix' | 'refactor' | ...
    workflowSteps: [],        // Ordered step names
    currentStepIndex: -1,     // Current position
    completedSteps: [],       // Completed step names
    activePlan: null,         // Path to active plan
    todos: [],                // TaskCreate snapshot
    lastTodos: [],            // Last 10 todos for recovery (actual content)
    startedAt: null,          // ISO timestamp
    lastUpdatedAt: null,      // ISO timestamp
    metadata: {}              // Additional data
  };
}
```

### Recovery Flow

```
PreCompact triggered (manual|auto)
    ↓
write-compact-marker.cjs writes marker
    → Resets statusline baseline
    → Marks compaction point for recovery
    ↓
Context compaction occurs
    ↓
SessionStart triggered (resume|compact)
    ↓
post-compact-recovery.cjs reads workflow state
    ↓
Injects recovery context:
    - Active workflow type
    - Current step
    - Completed/remaining steps
    - Pending todos
    - Action required
```

### Checkpoint Format

```markdown
# Memory Checkpoint - 2025-01-12T05:00:00Z

## Workflow State
- **Type:** feature
- **Current Step:** cook (3/7)
- **Completed:** plan, scout
- **Remaining:** test → code-review → docs-update → watzup

## Active Plan
plans/250112-feature-auth/plan.md

## Pending Todos
- [ ] [Workflow] /cook - Implement feature
- [ ] [Workflow] /test - Run tests
- [ ] [Workflow] /code-review - Request review

## Recovery Instructions
Continue from step "cook". Read plan.md for implementation details.
```

### External Memory Swap

The External Memory Swap system complements the checkpoint-based recovery by externalizing large tool outputs (Read, Grep, Bash, Glob) to swap files. This enables **exact content retrieval** after context compaction.

**Key Components:**

| File                      | Purpose                                          |
| ------------------------- | ------------------------------------------------ |
| `tool-output-swap.cjs`    | PostToolUse hook that externalizes large outputs |
| `lib/swap-engine.cjs`     | Core externalization engine with locking         |
| `config/swap-config.json` | Thresholds and limits configuration              |

**Configuration (swap-config.json):**

| Parameter                     | Default | Description                            |
| ----------------------------- | ------- | -------------------------------------- |
| `thresholds.Read`             | 8KB     | Chars before externalizing Read output |
| `thresholds.Grep`             | 4KB     | Chars before externalizing Grep output |
| `thresholds.Bash`             | 6KB     | Chars before externalizing Bash output |
| `thresholds.Glob`             | 2KB     | Chars before externalizing Glob output |
| `limits.maxEntriesPerSession` | 100     | Max swap files per session             |
| `limits.maxTotalBytes`        | 250MB   | Total storage limit                    |

**Flow:**

```
Tool output > threshold → externalize() → swap file + pointer
                                              ↓
                        Post-compaction → recovery injects swap inventory
                                              ↓
                        Claude retrieves exact content via Read tool
```

**Detailed Documentation:** [hooks/external-memory-swap.md](hooks/external-memory-swap.md)

---

## System Integration Flow

### Complete Request Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         SESSION START                            │
├─────────────────────────────────────────────────────────────────┤
│ 1. session-init.cjs                                             │
│    ├─ Detect project type, package manager                     │
│    ├─ Load .ck.json (coding level, assertions)                  │
│    ├─ Inject output style based on coding level                 │
│    ├─ Inject lessons from docs/lessons.md                    │
│    └─ Set up environment variables                              │
│                                                                  │
│ 2. post-compact-recovery.cjs (if resume/compact)                │
│    ├─ Find checkpoints within 24 hours                          │
│    └─ Inject workflow recovery context with lastTodos           │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                       USER PROMPT SUBMIT                         │
├─────────────────────────────────────────────────────────────────┤
│ 3. workflow-router.cjs                                          │
│    ├─ Analyze prompt for intent keywords                        │
│    ├─ Score each workflow type                                  │
│    ├─ Detect workflow and generate TaskCreate items              │
│    └─ Inject workflow announcement                              │
│                                                                  │
│ 4. dev-rules-reminder.cjs                                       │
│    └─ Inject relevant development rules                         │
│                                                                  │
│ 5. lessons-injector.cjs                                         │
│    └─ Inject lessons from docs/lessons.md                    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                        TOOL EXECUTION                            │
├─────────────────────────────────────────────────────────────────┤
│ 6. PreToolUse (Bash|Glob|Grep|Read|Edit|Write)                  │
│    ├─ scout-block.cjs → Block .ckignore directories             │
│    └─ privacy-block.cjs → Block sensitive files                 │
│                                                                  │
│ 7. PreToolUse (Skill)                                           │
│    └─ skill-enforcement.cjs → Block impl skills without todos   │
│                                                                  │
│ 8. PreToolUse (Edit|Write|MultiEdit)                            │
│    ├─ backend-csharp-context.cjs → Inject C# patterns           │
│    ├─ frontend-typescript-context.cjs → Inject TS patterns      │
│    └─ scss-styling-context.cjs → Inject SCSS patterns           │
│                                                                  │
│ [Tool Executes]                                                  │
│                                                                  │
│ 9. PostToolUse (Edit|Write)                                     │
│    └─ post-edit-prettier.cjs → Format with Prettier             │
│                                                                  │
│ 10. PostToolUse (TaskCreate)                                     │
│     └─ todo-tracker.cjs → Update todo state                     │
│                                                                  │
│ 11. PostToolUse (Skill)                                         │
│     └─ workflow-step-tracker.cjs → Mark step complete           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                       CONTEXT COMPACTION                         │
├─────────────────────────────────────────────────────────────────┤
│ 13. PreCompact (manual|auto)                                    │
│     └─ write-compact-marker.cjs → Write marker for recovery     │
└─────────────────────────────────────────────────────────────────┘
```

### Lessons Learning Flow

```
User invokes /learn → /learn skill appends to docs/lessons.md
                         ↓
Next session/prompt → lessons-injector.cjs injects lessons into context
                         ↓
Claude follows lessons as contextual instructions
```

---

## Quick Reference

### Environment Variables

| Variable             | Description                |
| -------------------- | -------------------------- |
| `CK_SESSION_ID`      | Current session identifier |
| `CK_PROJECT_TYPE`    | Detected project type      |
| `CK_GIT_BRANCH`      | Current git branch         |
| `CK_DEBUG`           | Enable debug logging       |
| `CLAUDE_PROJECT_DIR` | Project directory path     |

### Key Paths

| Path                                   | Purpose                |
| -------------------------------------- | ---------------------- |
| `/tmp/ck/workflow/{sessionId}.json`    | Workflow state         |
| `plans/reports/memory-checkpoint-*.md` | Compaction checkpoints |
| `.claude/.ck.json`                     | Project configuration  |
| `.claude/settings.json`                | Claude Code settings   |

### Lessons File

The `docs/lessons.md` file stores learned lessons in human-readable markdown format, managed by the `/learn` skill and `lessons-injector.cjs` hook.

### Statusline Scripts

Three platform-specific statusline implementations:

| Script           | Platform                 | Description               |
| ---------------- | ------------------------ | ------------------------- |
| `statusline.cjs` | Node.js (cross-platform) | Default, works everywhere |
| `statusline.sh`  | Bash (macOS/Linux)       | Native shell version      |
| `statusline.ps1` | PowerShell (Windows)     | Native Windows version    |

Default configuration in settings.json uses Node.js variant:

```json
"statusLine": {
  "type": "command",
  "command": "node .claude/statusline.cjs"
}
```

### Common Commands

```bash
# Change coding level
/coding-level 3   # Set to Senior mode

# Manual checkpoint
/checkpoint       # Save context checkpoint

# Recover from compaction
/recover          # Restore from last checkpoint

# Force workflow
quick: implement auth  # Skip confirmation, run feature workflow

# Explicit skill
/fix the bug      # Run fix skill directly
```

---

## Maintenance

### Adding New Skills

1. Create directory: `.claude/skills/{skill-name}/`
2. Create `skill.md` with frontmatter
3. Add references in `references/` subdirectory
4. Run `python .claude/scripts/scan_skills.py` to update catalog

### Adding New Hooks

1. Create hook file in `.claude/hooks/`
2. Add to appropriate event in `settings.json`
3. Ensure hook exits 0 on success/error (non-blocking)
4. Run `node .claude/hooks/verify-hooks.cjs` to validate

### Hook Verification

The `verify-hooks.cjs` script validates all hooks registered in settings.json.

**Checks performed:**

- File existence for all registered hooks
- Valid shebang (`#!/usr/bin/env node`)
- Syntax validity (can be `require()`d)
- Required libraries in `lib/` directory

**Running verification:**

```bash
node .claude/hooks/verify-hooks.cjs
```

**Sample output:**

```
## Hook Verification Report

**Status:** ALL VALID
**Hooks Checked:** 23 (22 valid)
**Libraries:** 6/6

### Issues
**Warnings:**
- [Notification] notify-waiting.js: Missing shebang
```

**Exit Codes:**

- `0` - All hooks valid
- `1` - Issues found (with report)

### Hook Testing

Test files in `.claude/hooks/tests/`:

| Test File                     | Coverage                          |
| ----------------------------- | --------------------------------- |
| `test-scout-block.js`         | Directory/file blocking patterns  |
| `test-privacy-block.js`       | Sensitive file protection         |
| `test-context-tracker.cjs`    | Session detection, token tracking |
| `test-ckignore.js`            | Ignore pattern matching           |
| `test-modularization-hook.js` | Hook modularization patterns      |

**Running tests:**

```bash
node .claude/hooks/tests/test-scout-block.js
node .claude/hooks/tests/test-privacy-block.js
node .claude/hooks/tests/test-context-tracker.cjs
```

---

## How Each Hook Helps (Detailed)

This section provides an in-depth explanation of how each hook contributes to the overall system effectiveness.

### SessionStart Hooks

#### session-init.cjs - Foundation Layer

**Purpose:** Establishes session context and injects coding guidelines.

**How It Helps:**

1. **Project Detection** - Automatically identifies project type, package manager, and frameworks:

   ```javascript
   // Detects: single-repo, monorepo, python, rust, go, etc.
   function detectProjectType() {
     if (fs.existsSync('BravoSUITE.sln')) return 'single-repo';
     if (fs.existsSync('nx.json')) return 'monorepo';
     if (fs.existsSync('pyproject.toml')) return 'python';
     // ...
   }
   ```

   **Benefit:** Claude immediately understands the tech stack without asking.

2. **Coding Level Injection** - Loads output style based on developer experience:

   ```javascript
   // Reads .ck.json → codingLevel → loads coding-level-{N}.md
   const codingLevel = ckConfig.codingLevel || 4;
   const styleContent = fs.readFileSync(`output-styles/coding-level-${codingLevel}.md`);
   // Outputs style guidelines to stdout → Claude receives them
   ```

   **Benefit:** Responses match developer expectations (beginner=verbose, senior=concise).

3. **User Assertions Injection** - Loads project-specific rules:

   ```javascript
   // From .ck.json assertions array
   // "Backend: Use service-specific repositories (IGrowthRootRepository)"
   // "Frontend: Extend AppBaseComponent"
   // Outputs as numbered list → Claude follows as hard constraints
   ```

   **Benefit:** Enforces architectural decisions without repeating in every prompt.

#### post-compact-recovery.cjs - Continuity Layer

**Purpose:** Restores workflow state after context compaction.

**How It Helps:**

1. **Checkpoint Discovery** - Finds recent checkpoints:

   ```javascript
   // Searches plans/reports/memory-checkpoint-*.md within 24 hours
   const checkpoints = glob.sync('plans/reports/memory-checkpoint-*.md')
     .filter(f => Date.now() - fs.statSync(f).mtimeMs < 24 * 60 * 60 * 1000);
   ```

2. **Workflow State Recovery** - Restores workflow progress:

   ```javascript
   // Loads workflow-state.json → outputs recovery context
   // "Detected workflow: feature (step 3/7: cook)"
   // "Completed: plan, scout | Remaining: test, code-review, docs-update, watzup"
   ```

   **Benefit:** Long-running tasks survive context compaction without losing progress.

3. **LastTodos Recovery** - Restores actual todo content:

   ```javascript
   // lib/todo-state.cjs stores last 10 todos
   // Recovery hook reads and outputs them for Claude to resume
   ```

   **Benefit:** Even if TaskCreate state is lost, actual content is preserved.

### UserPromptSubmit Hooks

#### workflow-router.cjs - Intent Detection Layer

**Purpose:** Automatically detects development intent and routes to appropriate workflow.

**How It Helps:**

1. **Pattern Matching** - Scores prompts against trigger keywords:

   ```javascript
   function detectIntent(userPrompt) {
     const scores = {};
     for (const [workflowId, workflow] of Object.entries(workflows)) {
       let score = 0;
       for (const pattern of workflow.triggers.en) {
         if (new RegExp(pattern, 'i').test(userPrompt)) {
           score += pattern.length > 5 ? 15 : 10; // Longer patterns = higher confidence
         }
       }
       scores[workflowId] = score;
     }
     // Highest score with >50% confidence wins
     return Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
   }
   ```

2. **TaskCreate Generation** - Pre-creates workflow steps:

   ```javascript
   // Outputs TaskCreate suggestion with all workflow steps
   // Claude sees: "Create these todos: /scout → /investigate → /plan → ... → /cook → /review-changes → ..."
   const todoItems = workflow.sequence.map(step => ({
     content: `[Workflow] /${step} - ${stepMappings[step].todoLabel}`,
     status: step === workflow.sequence[0] ? 'in_progress' : 'pending',
     activeForm: `Executing /${step}`
   }));
   ```

   **Benefit:** Workflows are tracked via TaskCreate, surviving context compaction.

3. **Quick Mode Detection** - Handles `quick:` prefix:

   ```javascript
   // "quick: add auth" → Detects feature workflow, skips confirmation
   const quickMode = userPrompt.startsWith('quick:');
   if (quickMode) {
     // Outputs: "Quick mode detected. Starting feature workflow immediately."
   }
   ```

   **Benefit:** Users can skip confirmation for routine tasks.

### PreToolUse Hooks

#### scout-block.cjs & privacy-block.cjs - Security Layer

**Purpose:** Prevents access to ignored directories and sensitive files.

**How It Helps:**

```javascript
// scout-block.cjs - Blocks .ckignore patterns
const ignoredPatterns = [
  'node_modules/**', 'dist/**', '.git/**',
  'vendor/**', 'coverage/**'
];

// privacy-block.cjs - Blocks sensitive files
const sensitivePatterns = [
  '**/.env*', '**/secrets.json', '**/credentials.json',
  '**/id_rsa*', '**/*.pem'
];

function shouldBlock(toolInput, patterns) {
  const filePath = extractPath(toolInput);
  return patterns.some(pattern => minimatch(filePath, pattern));
}

// If blocked: outputs warning, exits 2 (blocked)
// If allowed: exits 0 (continue)
```

**Benefit:** Prevents accidentally exposing secrets or wasting tokens on irrelevant files.

#### skill-enforcement.cjs - Workflow Discipline Layer

**Purpose:** Ensures implementation skills have TaskCreate context.

**How It Helps:**

```javascript
// Blocks: cook, code, fix, implement, refactor, build
// Allows: plan, scout, investigate, analyze, review, debug

function checkSkill(skillName) {
  const IMPLEMENTATION_SKILLS = ['cook', 'code', 'fix', 'implement', 'refactor'];
  const ALLOWED_SKILLS = ['plan', 'scout', 'investigate', 'analyze', 'review'];

  if (ALLOWED_SKILLS.some(s => skillName.includes(s))) return true;
  if (IMPLEMENTATION_SKILLS.some(s => skillName.includes(s))) {
    // Check if TaskCreate was called
    const todoState = loadTodoState();
    if (!todoState.hasTodos) {
      // Outputs blocking message, exits 2
      console.log('BLOCKED: Call TaskCreate before implementation skills.');
      return false;
    }
  }
  return true;
}
```

**Benefit:** Forces workflow discipline - planning before implementation.

#### backend-csharp-context.cjs & frontend-typescript-context.cjs - Pattern Injection Layer

**Purpose:** Injects domain-specific patterns when editing files.

**How It Helps:**

```javascript
// backend-csharp-context.cjs - For .cs files
function injectCSharpPatterns(filePath) {
  const patterns = {
    repository: `Use service-specific repositories:
      - IGrowthRootRepository<T> for bravoGROWTH
      - ICandidatePlatformRootRepository<T> for bravoTALENTS`,
    validation: `Use PlatformValidationResult fluent API:
      .And(condition, message)
      .AndAsync(asyncCondition, message)
      Never throw ValidationException`,
    dto: `DTOs own mapping:
      PlatformEntityDto<TEntity, TKey>.MapToEntity()
      PlatformDto<T>.MapToObject()`
  };
  // Outputs relevant patterns based on file content
}

// frontend-typescript-context.cjs - For .ts files
function injectTypeScriptPatterns(filePath) {
  const patterns = {
    component: `Extend AppBaseComponent/AppBaseVmStoreComponent`,
    state: `Use PlatformVmStore for state management`,
    api: `Extend PlatformApiService for HTTP calls`,
    subscription: `Always use .pipe(this.untilDestroyed())`
  };
}
```

**Benefit:** Claude applies correct patterns without needing full documentation context.

### PostToolUse Hooks

#### todo-tracker.cjs - State Management Layer

**Purpose:** Tracks TaskCreate usage for enforcement and recovery.

**How It Helps:**

```javascript
// Updates todo-state.json on every TaskCreate call
function updateTodoState(todos) {
  const state = {
    hasTodos: todos.length > 0,
    lastUpdated: new Date().toISOString(),
    todoCount: todos.length,
    lastTodos: todos.slice(-10) // Store last 10 for recovery
  };
  atomicWriteFile(TODO_STATE_FILE, JSON.stringify(state));
}
```

**Benefit:** Enables edit-enforcement/skill-enforcement and recovery from compaction.

#### post-edit-prettier.cjs - Code Quality Layer

**Purpose:** Auto-formats edited files with Prettier.

**How It Helps:**

```javascript
// After Edit/Write tool completes successfully
function formatFile(filePath) {
  if (!shouldFormat(filePath)) return; // Skip non-formattable files

  const ext = path.extname(filePath);
  const formatters = {
    '.ts': 'prettier --write',
    '.tsx': 'prettier --write',
    '.js': 'prettier --write',
    '.json': 'prettier --write',
    '.css': 'prettier --write',
    '.scss': 'prettier --write',
    '.md': 'prettier --write'
  };

  if (formatters[ext]) {
    execSync(`${formatters[ext]} "${filePath}"`, { stdio: 'pipe' });
  }
}
```

**Benefit:** Consistent code formatting without manual intervention.

### PreCompact Hooks

#### write-compact-marker.cjs - Compaction Marker

**Purpose:** Writes compaction marker for statusline baseline reset and recovery point.

**Benefit:** Enables post-compact-recovery.cjs to detect and restore state after compaction.

> **Note:** Lesson writing is handled by the `/learn` skill, not a PreCompact hook.

---

## Detailed Workflow Execution Examples

This section shows step-by-step code execution for main use cases.

### Example 1: Feature Implementation Workflow

**User Prompt:** `"Add dark mode toggle to settings page"`

#### Step 1: SessionStart Hooks Fire

```
┌─────────────────────────────────────────────────────────────────┐
│ session-init.cjs executes                                       │
├─────────────────────────────────────────────────────────────────┤
│ detectProjectType() → 'single-repo'                             │
│ loadCkConfig() → { codingLevel: 4, assertions: [...] }          │
│                                                                 │
│ STDOUT:                                                          │
│ "Project: single-repo | PM: npm | Level: 4 (Tech Lead)"         │
│ "User Assertions:"                                              │
│ "1. Backend: Use service-specific repositories"                 │
│ "2. Frontend: Extend AppBaseComponent"                          │
│ ...                                                             │
│                                                                 │
│ Lessons Injection:                                              │
│ lessons-injector.cjs reads docs/lessons.md                   │
│ Injects relevant lessons into context                           │
│                                                                 │
│ Exit: 0 (success)                                               │
└─────────────────────────────────────────────────────────────────┘
```

#### Step 2: UserPromptSubmit Hooks Fire

```
┌─────────────────────────────────────────────────────────────────┐
│ workflow-router.cjs executes                                    │
├─────────────────────────────────────────────────────────────────┤
│ Input: "Add dark mode toggle to settings page"                  │
│                                                                 │
│ detectIntent():                                                 │
│   scores = {                                                    │
│     feature: 25,    // "add" (10) + "toggle" (10) + "page" (5)  │
│     bugfix: 0,                                                  │
│     documentation: 0,                                           │
│     refactor: 5     // "settings" could be refactor             │
│   }                                                             │
│   winner = 'feature' (confidence: 0.83)                         │
│                                                                 │
│ generateTodoItems():                                            │
│   sequence = ['plan', 'cook', 'code-simplifier', 'code-review', │
│               'test', 'docs-update', 'watzup']                  │
│   todos = [                                                     │
│     { content: '[Workflow] /plan - Create plan', status: 'pending' },
│     { content: '[Workflow] /cook - Implement', status: 'pending' },
│     ...                                                         │
│   ]                                                             │
│                                                                 │
│ STDOUT:                                                          │
│ "Detected: **Feature Implementation** workflow"                 │
│ "Sequence: /scout → /investigate → /plan → ... → /cook → /code-simplifier → /review-changes →" │
│ "          /code-review → /sre-review → /changelog → /test → /docs-update → /watzup"          │
│ "Create todos: [JSON array]"                                    │
│                                                                 │
│ Exit: 0 (success)                                               │
└─────────────────────────────────────────────────────────────────┘

```

#### Step 3: Claude Calls TaskCreate Tool

```
┌─────────────────────────────────────────────────────────────────┐
│ Claude processes hook outputs and calls TaskCreate               │
├─────────────────────────────────────────────────────────────────┤
│ TaskCreate({                                                     │
│   todos: [                                                      │
│     { content: '[Workflow] /plan', status: 'in_progress', ... },│
│     { content: '[Workflow] /cook', status: 'pending', ... },    │
│     ...                                                         │
│   ]                                                             │
│ })                                                              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ PostToolUse: todo-tracker.cjs executes                          │
├─────────────────────────────────────────────────────────────────┤
│ updateTodoState():                                              │
│   state = {                                                     │
│     hasTodos: true,                                             │
│     todoCount: 7,                                               │
│     lastUpdated: '2025-01-12T05:00:00Z',                        │
│     lastTodos: [...7 todos...]                                  │
│   }                                                             │
│   atomicWriteFile(TODO_STATE_FILE, state)                       │
│                                                                 │
│ Exit: 0 (success)                                               │
└─────────────────────────────────────────────────────────────────┘
```

#### Step 4: Claude Calls Skill Tool (/plan)

```
┌─────────────────────────────────────────────────────────────────┐
│ PreToolUse: skill-enforcement.cjs executes                       │
├─────────────────────────────────────────────────────────────────┤
│ Input: Skill { name: 'plan' }                                   │
│                                                                 │
│ checkSkill('plan'):                                             │
│   'plan' is in ALLOWED_SKILLS → Always pass                     │
│                                                                 │
│ Exit: 0 (allow execution)                                       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ [Skill 'plan' executes - creates implementation plan]           │
└─────────────────────────────────────────────────────────────────┘

```

#### Step 5: Claude Calls Skill Tool (/cook)

```
┌─────────────────────────────────────────────────────────────────┐
│ PreToolUse: skill-enforcement.cjs executes                       │
├─────────────────────────────────────────────────────────────────┤
│ Input: Skill { name: 'cook' }                                   │
│                                                                 │
│ checkSkill('cook'):                                             │
│   'cook' is in IMPLEMENTATION_SKILLS → Check todos              │
│   loadTodoState() → { hasTodos: true }                          │
│   Todos exist → Allow execution                                 │
│                                                                 │
│ Exit: 0 (allow execution)                                       │
└─────────────────────────────────────────────────────────────────┘
```

#### Step 6: Claude Edits TypeScript File

```
┌─────────────────────────────────────────────────────────────────┐
│ PreToolUse: frontend-typescript-context.cjs executes            │
├─────────────────────────────────────────────────────────────────┤
│ Input: Edit { file: 'settings.component.ts' }                   │
│                                                                 │
│ shouldInject('.ts') → true                                      │
│ injectPatterns():                                               │
│                                                                 │
│ STDOUT:                                                          │
│ "## TypeScript/Angular Patterns"                                │
│ "- Extend AppBaseVmStoreComponent for stateful components"      │
│ "- Use PlatformVmStore for state management"                    │
│ "- Always .pipe(this.untilDestroyed()) for subscriptions"       │
│ "- BEM class naming: block__element --modifier"                 │
│                                                                 │
│ Exit: 0 (success)                                               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ [Edit tool executes - modifies settings.component.ts]           │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ PostToolUse: post-edit-prettier.cjs executes                    │
├─────────────────────────────────────────────────────────────────┤
│ Input: Edit { file: 'settings.component.ts', exit_code: 0 }     │
│                                                                 │
│ shouldFormat('.ts') → true                                      │
│ execSync('prettier --write "settings.component.ts"')            │
│                                                                 │
│ Exit: 0 (success)                                               │
└─────────────────────────────────────────────────────────────────┘

```

#### Step 7: Context Compaction Triggered

```
┌─────────────────────────────────────────────────────────────────┐
│ PreCompact: write-compact-marker.cjs executes                   │
├─────────────────────────────────────────────────────────────────┤
│ writeMarker():                                                  │
│   - Write compaction marker for statusline baseline reset       │
│   - Mark compaction point for post-compact-recovery.cjs         │
│                                                                 │
│ Exit: 0 (success)                                               │
└─────────────────────────────────────────────────────────────────┘
```

### Example 2: Bug Fix Workflow

**User Prompt:** `"Fix the login error when session expires"`

#### Workflow Detection & Routing

```
┌─────────────────────────────────────────────────────────────────┐
│ workflow-router.cjs                                             │
├─────────────────────────────────────────────────────────────────┤
│ Input: "Fix the login error when session expires"               │
│                                                                 │
│ detectIntent():                                                 │
│   scores = {                                                    │
│     feature: 0,                                                 │
│     bugfix: 35,   // "fix" (15) + "error" (15) + "login" (5)    │
│     documentation: 0,                                           │
│     refactor: 0                                                 │
│   }                                                             │
│   winner = 'bugfix' (confidence: 0.95)                          │
│                                                                 │
│ STDOUT:                                                          │
│ "Detected: **Bug Fix** workflow"                                │
│ "Sequence: /scout → /investigate → /debug → /plan → ... → /fix → /code-simplifier →"           │
│ "          /review-changes → /code-review → /changelog → /test → /watzup"                     │
└─────────────────────────────────────────────────────────────────┘
```

#### Scout Phase - Exploring Codebase

```
┌─────────────────────────────────────────────────────────────────┐
│ PreToolUse: scout-block.cjs executes                            │
├─────────────────────────────────────────────────────────────────┤
│ Input: Grep { path: 'src/', pattern: 'session.*expire' }        │
│                                                                 │
│ shouldBlock('src/'):                                            │
│   Not in .ckignore patterns                                     │
│                                                                 │
│ Exit: 0 (allow)                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ PreToolUse: scout-block.cjs executes                            │
├─────────────────────────────────────────────────────────────────┤
│ Input: Read { file: 'node_modules/auth/session.js' }            │
│                                                                 │
│ shouldBlock('node_modules/'):                                   │
│   Matches .ckignore pattern 'node_modules/**'                   │
│                                                                 │
│ STDOUT:                                                          │
│ "BLOCKED: Path matches .ckignore pattern"                       │
│                                                                 │
│ Exit: 2 (blocked)                                               │
└─────────────────────────────────────────────────────────────────┘
```

#### Debug Phase - Reading Sensitive Files Blocked

```
┌─────────────────────────────────────────────────────────────────┐
│ PreToolUse: privacy-block.cjs executes                          │
├─────────────────────────────────────────────────────────────────┤
│ Input: Read { file: '.env.local' }                              │
│                                                                 │
│ shouldBlock('.env.local'):                                      │
│   Matches sensitive pattern '**/.env*'                          │
│                                                                 │
│ STDOUT:                                                          │
│ "BLOCKED: Sensitive file access denied"                         │
│ "Pattern: **/.env*"                                             │
│                                                                 │
│ Exit: 2 (blocked)                                               │
└─────────────────────────────────────────────────────────────────┘
```

### Example 3: Todo Enforcement Blocking

**User Prompt:** `"/cook implement the feature"` (without prior planning)

```
┌─────────────────────────────────────────────────────────────────┐
│ PreToolUse: skill-enforcement.cjs executes                       │
├─────────────────────────────────────────────────────────────────┤
│ Input: Skill { name: 'cook' }                                   │
│                                                                 │
│ checkSkill('cook'):                                             │
│   'cook' is in IMPLEMENTATION_SKILLS → Check todos              │
│   loadTodoState() → { hasTodos: false }                         │
│   No todos exist → Block execution                              │
│                                                                 │
│ STDOUT:                                                          │
│ "═══════════════════════════════════════════════════════════"   │
│ "BLOCKED: Implementation skill requires TaskCreate first"        │
│ "═══════════════════════════════════════════════════════════"   │
│ ""                                                              │
│ "Skill 'cook' is blocked because no todos have been set."       │
│ ""                                                              │
│ "Required action:"                                              │
│ "1. Detect workflow or use /plan"                               │
│ "2. Call TaskCreate with workflow steps"                         │
│ "3. Then invoke /cook"                                          │
│ ""                                                              │
│ "Allowed without todos: /plan, /scout, /feature-investigation, /analyze"  │
│ "═══════════════════════════════════════════════════════════"   │
│                                                                 │
│ Exit: 2 (blocked)                                               │
└─────────────────────────────────────────────────────────────────┘
```

### Example 4: Recovery After Context Compaction

**After compaction, new session starts:**

```
┌─────────────────────────────────────────────────────────────────┐
│ SessionStart: session-init.cjs executes                         │
├─────────────────────────────────────────────────────────────────┤
│ [Standard initialization as shown in Example 1]                 │
│ Exit: 0                                                         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ SessionStart: post-compact-recovery.cjs executes                │
├─────────────────────────────────────────────────────────────────┤
│ Trigger: startup=compact (context compaction just occurred)     │
│                                                                 │
│ findCheckpoints():                                              │
│   checkpoints = glob('plans/reports/memory-checkpoint-*.md')    │
│   recent = filter(within 24 hours)                              │
│   latest = 'memory-checkpoint-250112-0500.md'                   │
│                                                                 │
│ loadWorkflowState():                                            │
│   state = {                                                     │
│     workflowType: 'feature',                                    │
│     currentStepIndex: 2,                                        │
│     completedSteps: ['plan', 'cook'],                           │
│     pendingSteps: ['code-simplifier', 'code-review', 'test',    │
│                    'docs-update', 'watzup']                     │
│   }                                                             │
│                                                                 │
│ loadLastTodos():                                                │
│   todos = [                                                     │
│     { content: '[Workflow] /plan', status: 'completed' },       │
│     { content: '[Workflow] /cook', status: 'completed' },       │
│     { content: '[Workflow] /code-simplifier', status: 'pending' },
│     ...                                                         │
│   ]                                                             │
│                                                                 │
│ STDOUT:                                                          │
│ "════════════════════════════════════════════════════════════"  │
│ "WORKFLOW RECOVERY - Context compaction detected"               │
│ "════════════════════════════════════════════════════════════"  │
│ ""                                                              │
│ "Active Workflow: feature"                                      │
│ "Current Step: code-simplifier (3/7)"                           │
│ "Completed: plan ✓, cook ✓"                                     │
│ "Remaining: code-simplifier → code-review → test →"             │
│ "           docs-update → watzup"                               │
│ ""                                                              │
│ "Recovered Todos:"                                              │
│ "[JSON array of todos to restore via TaskCreate]"                │
│ ""                                                              │
│ "ACTION REQUIRED:"                                              │
│ "1. Call TaskCreate with recovered todos above"                  │
│ "2. Continue from /code-simplifier"                             │
│ "════════════════════════════════════════════════════════════"  │
│                                                                 │
│ Exit: 0 (success)                                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Troubleshooting

Common issues and their solutions when working with Claude Kit.

### Hooks Not Executing

**Symptoms:** Context not injected, workflows not detected, lessons missing.

**Diagnosis:**

```bash
# Verify hooks are registered in settings.json
cat .claude/settings.json | grep -A 50 '"hooks"'

# Test a hook manually
echo '{"session_id":"test","type":"main"}' | node .claude/hooks/session-init.cjs

# Check for Node.js errors
node -c .claude/hooks/session-init.cjs  # Syntax check
```

**Solutions:**

1. **Hook not in settings.json** - Add to appropriate event array:

   ```json
   "hooks": {
     "SessionStart": [{ "command": "node .claude/hooks/session-init.cjs" }]
   }
   ```

2. **Node.js version** - Ensure Node.js 18+: `node --version`
3. **Missing dependencies** - Run `npm install` in `.claude/hooks/` if `package.json` exists
4. **Permission issues** (Unix) - Ensure executable: `chmod +x .claude/hooks/*.cjs`
5. **Path issues** - Use relative paths from project root, not absolute paths

### Workflow Not Detected

**Symptoms:** No "Detected: [workflow]" message, TaskCreate not auto-created.

**Diagnosis:**

```bash
# Check workflows.json exists and is valid
cat .claude/workflows.json | jq '.workflows | keys'

# Test workflow-router manually
echo '{"user_prompt":"add a dark mode feature"}' | node .claude/hooks/workflow-router.cjs
```

**Solutions:**

1. **Prompt lacks trigger keywords** - Use explicit keywords like "implement", "fix bug", "refactor"
2. **Exclude pattern blocking** - Check `workflows.json` → `triggers.exclude` patterns
3. **Use explicit command** - Prefix with `/plan`, `/fix`, etc. to bypass detection
4. **Use `quick:` prefix** - Force workflow without confirmation: `quick: add feature`

### Lessons Not Injecting

**Symptoms:** Learned patterns not appearing in context.

**Diagnosis:**

```bash
# Check lessons file exists and has content
cat docs/lessons.md 2>/dev/null || echo "No lessons file"

# Check lessons-injector.cjs is registered in settings.json
cat .claude/settings.json | jq '.hooks'
```

**Solutions:**

1. **No lessons file** - Use `/learn` to create lessons
2. **Empty file** - Add lessons with `/learn`
3. **Hook not registered** - Add `lessons-injector.cjs` to `settings.json` hooks

### Todo Enforcement Blocking

**Symptoms:** "BLOCKED: Call TaskCreate before implementation" errors.

**Diagnosis:**

```bash
# Check todo state file
cat /tmp/ck/todo-state.json 2>/dev/null || echo "No state file"

# Check which skills are blocked
grep -A 5 "BLOCKED_SKILLS" .claude/hooks/skill-enforcement.cjs
```

**Solutions:**

1. **Call TaskCreate first** - Create todos before using implementation skills
2. **Use planning skills** - `/plan`, `/scout`, `/feature-investigation` are always allowed
3. **Bypass temporarily**:

   ```bash
   CK_BYPASS_TODO_CHECK=1 claude  # Disable enforcement for session
   ```

4. **Reset state** - Delete `/tmp/ck/todo-state.json` to clear stale state

### Context Lost After Compaction

**Symptoms:** Workflow steps forgotten, todos missing, state lost.

**Diagnosis:**

```bash
# Check for recent checkpoints
ls -la plans/reports/memory-checkpoint-*.md | head -5

# Check workflow state
cat /tmp/ck/workflow/*.json 2>/dev/null | jq '.workflowType, .currentStepIndex'
```

**Solutions:**

1. **Use /recover command** - Restores from latest checkpoint
2. **Read checkpoint manually** - `Read plans/reports/memory-checkpoint-*.md`
3. **Check PreCompact hooks** - Ensure `write-compact-marker.cjs` is registered
4. **Manual todo recovery** - Use `lastTodos` from workflow state file

### Notifications Not Sending

**Symptoms:** No messages to Telegram/Discord/Slack on session events.

**Diagnosis:**

```bash
# Test notification manually
echo '{"hook_event_name":"Stop"}' | node .claude/hooks/notifications/notify.cjs

# Check throttle state (prevents spam)
cat /tmp/ck-noti-throttle.json 2>/dev/null

# Check env vars
echo "TELEGRAM: $TELEGRAM_BOT_TOKEN | DISCORD: $DISCORD_WEBHOOK_URL"
```

**Solutions:**

1. **Set env vars** - Export credentials:

   ```bash
   export TELEGRAM_BOT_TOKEN=your_token
   export TELEGRAM_CHAT_ID=your_chat_id
   export DISCORD_WEBHOOK_URL=your_webhook
   ```

2. **Clear throttle** - Delete `/tmp/ck-noti-throttle.json`
3. **Check provider status** - Verify Telegram bot, Discord webhook are active
4. **Enable debug** - `CK_DEBUG=1 claude` to see notification logs

### Context Injection Not Working

**Symptoms:** C#/TypeScript patterns not appearing when editing files.

**Diagnosis:**

```bash
# Test context injection hook
echo '{"tool_name":"Edit","tool_input":{"file_path":"test.cs"}}' | \
  node .claude/hooks/backend-csharp-context.cjs
```

**Solutions:**

1. **File extension mismatch** - Hook filters by extension (`.cs`, `.ts`, `.tsx`)
2. **Hook not registered** - Add to `PreToolUse` event in settings.json
3. **Token budget** - Context injection respects token limits
4. **Path pattern** - Some hooks filter by path (e.g., only `src/Services/`)

### Performance Issues

**Symptoms:** Slow responses, high latency, hook timeouts.

**Solutions:**

1. **Simplify hook logic** - Complex regex patterns slow PreToolUse
3. **Use codingLevel 4+** - Higher levels produce more concise output
4. **Enable caching** - Some hooks support result caching
5. **Parallelize hooks** - Ensure independent hooks don't block each other

### Scout Block False Positives

**Symptoms:** Legitimate directories being blocked by scout-block.cjs.

**Diagnosis:**

```bash
# Check .ckignore patterns
cat .claude/.ckignore

# Test scout block
echo '{"tool_name":"Glob","tool_input":{"pattern":"src/valid/**"}}' | \
  node .claude/hooks/scout-block.cjs
```

**Solutions:**

1. **Whitelist in .ckignore** - Use negation: `!src/node_modules/allowed/`
2. **Adjust patterns** - Edit `.ckignore` to be more specific
3. **Bypass for session** - `CK_BYPASS_SCOUT_BLOCK=1 claude`

### Common Error Messages

| Error                    | Cause                  | Solution                                |
| ------------------------ | ---------------------- | --------------------------------------- |
| `Cannot find module`     | Missing npm dependency | `cd .claude/hooks && npm install`       |
| `ENOENT: no such file`   | Missing config file    | Create required file (`.ck.json`, etc.) |
| `Permission denied`      | File not executable    | `chmod +x .claude/hooks/*.cjs`          |
| `JSON parse error`       | Invalid JSON in config | Validate with `jq . file.json`          |
| `ETIMEOUT`               | Hook took too long     | Simplify hook logic or increase timeout |
| `Hook returned non-zero` | Hook error             | Check hook stderr output                |

### Verification Commands

```bash
# Full hook verification
node .claude/hooks/verify-hooks.cjs

# Workflow state inspection
cat /tmp/ck/workflow/*.json | jq '.'

# Check lessons file
cat docs/lessons.md 2>/dev/null || echo "No lessons"
```

### Debug Mode

Enable comprehensive logging:

```bash
# Full debug output
CK_DEBUG=1 claude

# Debug specific hook
CK_DEBUG=session-init claude

```

Debug output includes:

- Hook execution timing
- Pattern matching scores

---

## Summary

The `.claude` setup transforms Claude Code into a sophisticated development partner through:

1. **Adaptive Communication**: Coding levels adjust output to developer experience
2. **Workflow Automation**: Auto-detects intent, follows structured processes
3. **Lessons System**: Learns from human feedback via `/learn` skill
4. **Context Persistence**: Survives compaction via checkpoints
5. **Domain Awareness**: Injects relevant patterns based on file types
6. **Safety Guards**: Blocks sensitive files, validates permissions

This creates a feedback loop where Claude continuously improves its behavior for the specific project, while maintaining structured workflows that ensure quality and consistency.
