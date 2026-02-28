# Claude Hooks Internals - Developer Deep Dive

> **DEPRECATED:** This document has been split into modular documentation. Use the new docs:
>
> - [hooks/README.md](./hooks/README.md) - Hook system overview
> - [hooks/architecture.md](./hooks/architecture.md) - System architecture
> - [hooks/pattern-learning.md](./hooks/pattern-learning.md) - Pattern detection
> - [hooks/extending-hooks.md](./hooks/extending-hooks.md) - Extension guide
>
> This file is kept for reference but may be removed in future updates.

---

> Last verified: c645a32e53 (2026-01-13)

This document provides in-depth technical details for developers who need to debug, extend, or customize the Claude Kit hook system.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Hook Execution Model](#hook-execution-model)
3. [Data Flow Diagrams](#data-flow-diagrams)
4. [File Storage Formats](#file-storage-formats)
5. [Configuration Reference](#configuration-reference)
6. [Extension Patterns](#extension-patterns)
7. [Debugging Guide](#debugging-guide)

---

## Architecture Overview

### Hook System Design

The hook system follows a Unix-style pipeline model:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CLAUDE CODE RUNTIME                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐   │
│  │ Event       │────▶│ Hook Dispatcher  │────▶│ Hook Scripts    │   │
│  │ (SessionStart)    │ (Built into CC)  │     │ (.cjs files)    │   │
│  └─────────────┘     └──────────────────┘     └───────┬─────────┘   │
│                                                       │              │
│                                                       ▼              │
│                              ┌────────────────────────────────────┐ │
│                              │ STDIN: JSON event payload          │ │
│                              │ STDOUT: Context injection          │ │
│                              │ STDERR: Debug logging              │ │
│                              │ EXIT 0: Always (non-blocking)      │ │
│                              └────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### Hook Categories

| Category     | Purpose              | Key Files                                                         |
| ------------ | -------------------- | ----------------------------------------------------------------- |
| Session      | Lifecycle management | session-init.cjs, post-compact-recovery.cjs                       |
| Workflow     | Intent detection     | workflow-router.cjs, workflow-step-tracker.cjs                    |
| Context      | Code-type injection  | backend-csharp-context.cjs, frontend-typescript-context.cjs       |
| Safety       | Access control       | scout-block.cjs, privacy-block.cjs                                |
| Lessons      | Learning system      | lessons-injector.cjs (injection) + /learn skill (writing)         |
| Todo         | Workflow enforcement | edit-enforcement.cjs, skill-enforcement.cjs, todo-tracker.cjs     |
| Notification | External alerts      | notifications/notify.cjs, notifications/providers/*.cjs           |
| Quality      | Code quality         | post-edit-prettier.cjs                                            |

### Shared Libraries

```
.claude/hooks/lib/
├── ck-paths.cjs              # Path resolution utilities
├── workflow-state.cjs        # Persistent workflow state
├── todo-state.cjs            # Todo enforcement state
├── edit-state.cjs            # Edit state tracking
└── swap-engine.cjs           # External Memory Swap engine
```

### Design Principles

1. **Non-Blocking:** All hooks exit 0, errors logged not thrown
2. **Privacy-First:** No stdout/stderr content stored, metadata only
3. **Atomic Operations:** Write-temp-rename pattern for file safety
4. **Graceful Degradation:** Missing modules don't crash the system
5. **Stateless Preference:** State in files, hooks are pure functions

---

## Hook Execution Model

### Event Lifecycle

```
┌──────────────────────────────────────────────────────────────────────┐
│                        SESSION LIFECYCLE                              │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  SessionStart (startup|resume|clear|compact)                          │
│       │                                                               │
│       ├── session-init.cjs: Initialize session, inject coding level   │
│       ├── lessons-injector.cjs: Inject lessons from docs/lessons.md│
│       └── post-compact-recovery.cjs: Restore workflow state (resume) │
│       │                                                               │
│       ▼                                                               │
│  UserPromptSubmit (every user message)                                │
│       │                                                               │
│       ├── workflow-router.cjs: Detect intent, suggest workflow        │
│       ├── lessons-injector.cjs: Inject lessons from docs/lessons.md│
│       └── dev-rules-reminder.cjs: Inject development rules            │
│       │                                                               │
│       ▼                                                               │
│  PreToolUse (before tool execution)                                   │
│       │                                                               │
│       ├── scout-block.cjs: Block heavy directories (.ckignore)        │
│       ├── privacy-block.cjs: Block sensitive files (.env, secrets)    │
│       ├── edit-enforcement.cjs: Block edits without todos             │
│       ├── skill-enforcement.cjs: Block impl skills without todos      │
│       ├── backend-csharp-context.cjs: Inject patterns for .cs files   │
│       ├── frontend-typescript-context.cjs: Inject TS patterns         │
│       └── scss-styling-context.cjs: Inject SCSS/BEM patterns          │
│       │                                                               │
│       ▼                                                               │
│  [Tool Execution]                                                     │
│       │                                                               │
│       ▼                                                               │
│  PostToolUse (after tool execution)                                   │
│       │                                                               │
│       ├── post-edit-prettier.cjs: Format edited files                 │
│       ├── todo-tracker.cjs: Update todo state                         │
│       └── workflow-step-tracker.cjs: Advance workflow step            │
│       │                                                               │
│       ▼                                                               │
│  PreCompact (before context compaction)                               │
│       │                                                               │
│       └── write-compact-marker.cjs: Write marker for statusline reset │
│       │                                                               │
│       ▼                                                               │
│  Stop (session terminates)                                            │
│       │                                                               │
│       └── notifications/notify.cjs: Send completion notifications     │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

### Hook Input Format (STDIN)

```javascript
// All hooks receive JSON via STDIN
const event = JSON.parse(await readStdin());

// Common fields
{
  "session_id": "sess_abc123",
  "cwd": "/path/to/project",
  "hook_event_name": "SessionStart",  // Event type
  "trigger": "startup",               // startup|resume|clear|compact

  // PreToolUse/PostToolUse specific
  "tool_name": "Edit",
  "tool_input": { "file_path": "/path/to/file.ts" },
  "tool_output": { "success": true },

  // UserPromptSubmit specific
  "user_prompt": "Add dark mode feature"
}
```

### Hook Output Format (STDOUT)

```javascript
// STDOUT content is injected into Claude's context
console.log('## Context Injection Title');
console.log('Instructions for Claude...');

// For blocking hooks (PreToolUse)
// Output JSON with "decision" field
console.log(JSON.stringify({
  "decision": "block",  // allow | block
  "reason": "Access to node_modules blocked"
}));
```

### Error Handling Pattern

```javascript
// Non-blocking error pattern - ALL hooks must follow this
try {
  // Hook logic
} catch (error) {
  console.error('[hook-name] Error:', error.message);
  // Still exit 0 to not block Claude
}
process.exit(0);
```

---

## Lessons System

The learning system uses a simple file-based approach:

- **`/learn` skill** appends lessons to `docs/lessons.md`
- **`lessons-injector.cjs` hook** injects lessons on `UserPromptSubmit` and `PreToolUse(Edit|Write|MultiEdit)` events
- Lessons are human-readable markdown stored in `docs/lessons.md`

---

## Data Flow Diagrams

### Workflow Detection Flow

```
┌────────────────────────────────────────────────────────────────────┐
│                    WORKFLOW DETECTION FLOW                          │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  User Prompt: "Add a dark mode feature"                             │
│         │                                                           │
│         ▼                                                           │
│  UserPromptSubmit Event                                             │
│         │                                                           │
│         ▼                                                           │
│  ┌─────────────────────────────────────┐                            │
│  │ workflow-router.cjs                 │                            │
│  │                                     │                            │
│  │  1. Check for explicit command (/)  │ → Skip if found            │
│  │  2. Check for quick: prefix         │ → Skip confirmation        │
│  │  3. Load workflows.json triggers    │                            │
│  │  4. Score each workflow:            │                            │
│  │     - feature: 10 (matches "add")   │                            │
│  │     - bugfix: 0                     │                            │
│  │     - docs: 0                       │                            │
│  │  5. Select highest (feature)        │                            │
│  └─────────────────┬───────────────────┘                            │
│                    │                                                │
│                    ▼                                                │
│  STDOUT (Context Injection)                                         │
│  ┌─────────────────────────────────────┐                            │
│  │ ## Workflow Detected                │                            │
│  │                                     │                            │
│  │ **Intent:** Feature Implementation  │                            │
│  │ **Sequence:** /scout → ... → /cook → /review-changes → /test → ... │                            │
│  │                                     │                            │
│  │ Instructions: Ask user to proceed   │                            │
│  └─────────────────────────────────────┘                            │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Compaction Recovery Flow

```
┌────────────────────────────────────────────────────────────────────┐
│                    COMPACTION RECOVERY FLOW                         │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Context Limit Reached                                              │
│         │                                                           │
│         ▼                                                           │
│  PreCompact Event                                                   │
│         │                                                           │
│         ▼                                                           │
│  ┌─────────────────────────────────────┐                            │
│  │ write-compact-marker.cjs            │                            │
│  │                                     │                            │
│  │  1. Write compaction marker         │                            │
│  │  2. Reset statusline baseline       │                            │
│  └─────────────────┬───────────────────┘                            │
│                                                                     │
│  ... [Context Compaction Occurs] ...                                │
│                                                                     │
│  SessionStart (trigger="compact" or "resume")                       │
│         │                                                           │
│         ▼                                                           │
│  ┌─────────────────────────────────────┐                            │
│  │ post-compact-recovery.cjs           │                            │
│  │                                     │                            │
│  │  1. Find checkpoints within 24h     │                            │
│  │  2. Load workflow state from /tmp/  │                            │
│  │  3. Extract lastTodos for recovery  │                            │
│  │  4. Format recovery instructions    │                            │
│  └─────────────────┬───────────────────┘                            │
│                    │                                                │
│                    ▼                                                │
│  STDOUT (Recovery Context)                                          │
│  ┌─────────────────────────────────────┐                            │
│  │ ══════════════════════════════════  │                            │
│  │ WORKFLOW RECOVERY                   │                            │
│  │ ══════════════════════════════════  │                            │
│  │                                     │                            │
│  │ Active Workflow: feature            │                            │
│  │ Current Step: cook (3/7)            │                            │
│  │ Completed: plan ✓, scout ✓          │                            │
│  │ Remaining: test → code-review → ... │                            │
│  │                                     │                            │
│  │ Recovered Todos:                    │                            │
│  │ [JSON array to restore via TaskCreate]                           │
│  │                                     │                            │
│  │ ACTION REQUIRED:                    │                            │
│  │ 1. Call TaskCreate with above       │                            │
│  │ 2. Continue from /cook              │                            │
│  │ ══════════════════════════════════  │                            │
│  └─────────────────────────────────────┘                            │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

---

## File Storage Formats

### lessons.md

**Location:** `docs/lessons.md`
**Format:** Markdown (human-readable)

Lessons are appended by the `/learn` skill and injected into context by `lessons-injector.cjs`. Each lesson is a simple text entry describing a learned behavior or preference.

### workflow-state.json

**Location:** `/tmp/ck/workflow/{session_id}.json`
**Format:** JSON

```json
{
  "session_id": "sess-abc",
  "workflowType": "feature",
  "currentStepIndex": 2,
  "workflowSteps": ["plan", "cook", "test", "code-review", "docs-update", "watzup"],
  "completedSteps": ["plan", "cook"],
  "activePlan": "plans/250113-feature-auth/plan.md",
  "todos": [],
  "lastTodos": [
    {"content": "[Workflow] /plan - Create plan", "status": "completed"},
    {"content": "[Workflow] /cook - Implement", "status": "completed"},
    {"content": "[Workflow] /test - Run tests", "status": "in_progress"}
  ],
  "startedAt": "2025-01-13T10:00:00Z",
  "lastUpdatedAt": "2025-01-13T10:30:00Z"
}
```

### todo-state.json

**Location:** `/tmp/ck/todo-state.json`
**Format:** JSON

```json
{
  "hasTodos": true,
  "lastTodos": [
    {"content": "Create implementation plan", "status": "completed"},
    {"content": "Implement feature", "status": "in_progress"},
    {"content": "Run tests", "status": "pending"}
  ],
  "updatedAt": "2025-01-13T10:15:00Z"
}
```

### hook-metrics.json

**Location:** `.claude/memory/hook-metrics.json`
**Format:** JSON

```json
{
  "hooks": {
    "session-init": {
      "invocations": 145,
      "errors": 2,
      "avg_duration_ms": 45
    },
    "workflow-router": {
      "invocations": 320,
      "detections": 180,
      "false_positives": 5
    }
  },
  "last_updated": "2025-01-13T10:00:00Z"
}
```

---

## Configuration Reference

### Environment Variables

| Variable              | Description                      | Default       |
| --------------------- | -------------------------------- | ------------- |
| CK_BYPASS_TODO_CHECK  | Bypass todo enforcement          | false         |
| CK_BYPASS_SCOUT_BLOCK | Bypass scout blocking            | false         |
| CK_SESSION_ID         | Current session ID               | -             |
| CK_DEBUG              | Enable debug logging             | false         |
| CK_CODING_LEVEL       | Override coding level            | -1 (disabled) |
| CLAUDE_PROJECT_DIR    | Project directory path           | cwd           |

### Path Constants (ck-paths.cjs)

| Path               | Description                            |
| ------------------ | -------------------------------------- |
| CK_ROOT            | `.claude/`                             |
| CK_HOOKS           | `.claude/hooks/`                       |
| CK_TEMP            | `/tmp/ck/`                             |
| LESSONS_FILE       | `docs/lessons.md`                   |
| WORKFLOW_STATE_DIR | `/tmp/ck/workflow/`                    |
| TODO_STATE         | `/tmp/ck/todo-state.json`              |

---

## Extension Patterns

### Creating a New Hook

```javascript
#!/usr/bin/env node
// .claude/hooks/my-hook.cjs

const fs = require('fs');

// 1. Read event from STDIN
async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString();
}

// 2. Parse and process
async function main() {
  try {
    const input = await readStdin();
    const event = JSON.parse(input);

    // 3. Your logic here
    if (event.tool_name === 'Edit') {
      // Do something for Edit events
      console.log('## My Hook Injection');
      console.log('Custom instructions...');
    }

  } catch (error) {
    // 4. Always log errors to stderr, not stdout
    console.error('[my-hook] Error:', error.message);
  }

  // 5. Always exit 0 (non-blocking)
  process.exit(0);
}

main();
```

### Registering a Hook

Add to `.claude/settings.json`:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit",
        "hooks": [
          {
            "type": "command",
            "command": "node .claude/hooks/my-hook.cjs"
          }
        ]
      }
    ]
  }
}
```

### Using Shared Libraries

```javascript
// Use path utilities
const { CK_ROOT, CK_HOOKS } = require('./lib/ck-paths.cjs');

// Use workflow state
const { loadWorkflowState, saveWorkflowState } = require('./lib/workflow-state.cjs');

// Use todo state
const { loadTodoState, saveTodoState } = require('./lib/todo-state.cjs');
```

### Creating a Blocking Hook

```javascript
// For PreToolUse: can block tool execution

async function main() {
  const event = JSON.parse(await readStdin());

  // Check condition
  if (shouldBlock(event)) {
    // Output JSON with decision field
    console.log(JSON.stringify({
      decision: 'block',
      reason: 'Access denied: reason here'
    }));
  }
  // If no output or decision: 'allow', tool execution proceeds

  process.exit(0);
}
```

### Creating a Context Injection Hook

```javascript
#!/usr/bin/env node
// .claude/hooks/my-context.cjs

async function main() {
  try {
    const event = JSON.parse(await readStdin());

    // Check if this hook should fire
    if (event.tool_name !== 'Edit') return;

    const filePath = event.tool_input?.file_path || '';
    if (!filePath.endsWith('.custom')) return;

    // Inject context
    console.log('## Custom File Patterns');
    console.log('');
    console.log('When editing .custom files:');
    console.log('- Use specific pattern A');
    console.log('- Avoid pattern B');
    console.log('- Prefer pattern C');

  } catch (error) {
    console.error('[my-context] Error:', error.message);
  }
  process.exit(0);
}
```

---

## Debugging Guide

### Enable Debug Mode

```bash
# Full debug output
CK_DEBUG=1 claude

# Debug specific hook
CK_DEBUG=session-init claude

```

### Check Hook Execution

```bash
# Verify hooks are configured
cat .claude/settings.json | jq '.hooks'

# Test hook manually
echo '{"hook_event_name":"SessionStart","trigger":"startup"}' | node .claude/hooks/session-init.cjs

# Watch hook output
echo '{"tool_name":"Edit","tool_input":{"file_path":"test.ts"}}' | node .claude/hooks/backend-csharp-context.cjs
```

### Debug Workflow Detection

```bash
# Test prompt detection
echo '{"user_prompt":"Add dark mode feature"}' | node .claude/hooks/workflow-router.cjs

# Check workflow state
cat /tmp/ck/workflow/*.json 2>/dev/null | jq '.' || echo "No active workflow"
```

### Debug Todo Enforcement

```bash
# Check todo state
cat /tmp/ck/todo-state.json 2>/dev/null || echo "No todo state"

# Bypass for testing
CK_BYPASS_TODO_CHECK=1 claude
```

### Common Issues

| Symptom              | Debug Command                         | Solution            |
| -------------------- | ------------------------------------- | ------------------- |
| Hooks not running    | `node .claude/hooks/verify-hooks.cjs` | Check settings.json |
| Lessons not injecting| Check docs/lessons.md              | Verify file exists  |
| Workflow stuck       | Check workflow-state.json             | Use /recover        |
| High latency         | Check hook-metrics.json               | Optimize slow hooks |
| Memory issues        | Check file sizes                      | Rotate old data     |

### Log Files

| Location                               | Purpose                           |
| -------------------------------------- | --------------------------------- |
| stderr from hooks                      | Error messages (visible in debug) |
| `.claude/memory/hook-metrics.json`     | Performance data                  |
| `/tmp/ck/*.json`                       | Runtime state                     |
| `plans/reports/memory-checkpoint-*.md` | Session checkpoints               |

### Verification Commands

```bash
# Full hook verification
node .claude/hooks/verify-hooks.cjs

# Workflow state inspection
cat /tmp/ck/workflow/*.json | jq '.'

```

---

## Related Documentation

- [claude-kit-setup.md](claude-kit-setup.md) - Main setup guide and feature overview
- [ai-assistant-setup-comparison.md](ai-assistant-setup-comparison.md) - Claude vs Copilot comparison
- [troubleshooting.md](troubleshooting.md) - General troubleshooting guide
