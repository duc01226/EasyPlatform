# Hook System Architecture

> Event-driven extensibility for Claude Code automation

## Overview

The hook system provides extensible automation through event-driven shell scripts. Hooks intercept Claude Code operations at defined lifecycle points, enabling context injection, pattern learning, safety enforcement, and workflow automation.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Claude Code Runtime                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌──────────────┐     ┌──────────────┐     ┌──────────────┐           │
│   │ SessionStart │────▶│  PrePrompt   │────▶│ PreToolUse   │           │
│   │    Hooks     │     │    Hooks     │     │    Hooks     │           │
│   └──────────────┘     └──────────────┘     └──────────────┘           │
│          │                    │                    │                    │
│          │                    │                    ▼                    │
│          │                    │            ┌──────────────┐            │
│          │                    │            │    Tool      │            │
│          │                    │            │  Execution   │            │
│          │                    │            └──────────────┘            │
│          │                    │                    │                    │
│          │                    │                    ▼                    │
│   ┌──────────────┐     ┌──────────────┐     ┌──────────────┐           │
│   │ SessionStop  │◀────│ PreCompact   │◀────│ PostToolUse  │           │
│   │    Hooks     │     │    Hooks     │     │    Hooks     │           │
│   └──────────────┘     └──────────────┘     └──────────────┘           │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Event Lifecycle

### Session Events

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Session Lifecycle                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   New Session                    Session End                             │
│       │                              ▲                                   │
│       ▼                              │                                   │
│  ┌──────────┐    Work Loop      ┌──────────┐                            │
│  │ Session  │◀─────────────────▶│ Session  │                            │
│  │  Start   │                   │   Stop   │                            │
│  └──────────┘                   └──────────┘                            │
│       │                              ▲                                   │
│       │                              │                                   │
│       │      ┌──────────────┐        │                                   │
│       │      │  PreCompact  │────────┤ Context Full                      │
│       │      └──────────────┘        │                                   │
│       │             │                │                                   │
│       │             ▼                │                                   │
│       │      ┌──────────────┐        │                                   │
│       └─────▶│   Session    │────────┘ Resume                            │
│              │   Resume     │                                            │
│              └──────────────┘                                            │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Tool Execution Events

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      Tool Execution Lifecycle                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   User Prompt ──▶ PrePrompt ──▶ Claude Processing ──▶ Tool Decision     │
│                                                            │             │
│                                                            ▼             │
│   ┌────────────────────────────────────────────────────────────────┐    │
│   │                      PreToolUse Hooks                           │    │
│   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │    │
│   │  │   Privacy   │  │    Todo     │  │   Scout     │             │    │
│   │  │    Block    │  │ Enforcement │  │   Block     │             │    │
│   │  └─────────────┘  └─────────────┘  └─────────────┘             │    │
│   │        │                │                │                      │    │
│   │        └────────────────┴────────────────┘                      │    │
│   │                         │                                       │    │
│   │           continue: true/false                                  │    │
│   └─────────────────────────┬──────────────────────────────────────┘    │
│                             │                                            │
│                             ▼                                            │
│                    ┌─────────────────┐                                  │
│                    │ Tool Execution  │                                  │
│                    │ (Read, Edit,    │                                  │
│                    │  Bash, etc.)    │                                  │
│                    └─────────────────┘                                  │
│                             │                                            │
│                             ▼                                            │
│   ┌────────────────────────────────────────────────────────────────┐    │
│   │                     PostToolUse Hooks                           │    │
│   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │    │
│   │  │   Event     │  │   Pattern   │  │  Workflow   │             │    │
│   │  │  Emitter    │  │  Detector   │  │  Tracker    │             │    │
│   │  └─────────────┘  └─────────────┘  └─────────────┘             │    │
│   └────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Hook Execution Model

### Input Schema

Hooks receive JSON via stdin:

```typescript
interface HookInput {
  event: string;           // Event type (SessionStart, PreToolUse, etc.)
  tool?: string;           // Tool name (for tool events)
  input?: object;          // Tool input parameters
  output?: object;         // Tool output (PostToolUse only)
  session_id: string;      // Unique session identifier
  timestamp: string;       // ISO timestamp
  context?: {              // Additional context
    working_dir: string;
    git_branch?: string;
    active_plan?: string;
  };
}
```

### Output Schema

Hooks return JSON via stdout:

```typescript
interface HookOutput {
  continue: boolean;       // Continue processing (false = block)
  inject?: string;         // Text to inject into context
  message?: string;        // Message to display to user
  transform?: {            // Modify tool input/output
    input?: object;
    output?: object;
  };
}
```

### Exit Codes

| Code | Behavior                                    |
| ---- | ------------------------------------------- |
| `0`  | Success - continue processing, apply output |
| `1`  | Block - stop operation, show message        |
| `2`  | Error - log and continue (non-blocking)     |

---

## Data Flow Architecture

### Workflow Routing Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Workflow Routing Flow                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   User: "implement user authentication"                                  │
│         │                                                                │
│         ▼                                                                │
│   ┌──────────────┐                                                      │
│   │   Workflow   │  Trigger patterns: /\b(implement|add|create)\b/      │
│   │   Router     │  Exclude patterns: /\b(fix|bug|error)\b/             │
│   └──────────────┘                                                      │
│         │                                                                │
│         │  Detected: "feature" workflow                                  │
│         │  Sequence: plan → cook → test → code-review                   │
│         │                                                                │
│         ▼                                                                │
│   ┌──────────────────────────────────────────────────────────┐          │
│   │  Inject workflow instructions:                            │          │
│   │  "Detected: Feature Implementation workflow.              │          │
│   │   Following: /plan → /plan-review → /plan-validate → /cook → /review-changes → /test      │          │
│   │   Proceed with this workflow?"                            │          │
│   └──────────────────────────────────────────────────────────┘          │
│         │                                                                │
│         ▼                                                                │
│   ┌──────────────┐     ┌──────────────┐                                 │
│   │    Todo      │────▶│  Workflow    │                                 │
│   │ Enforcement  │     │   Tracker    │                                 │
│   └──────────────┘     └──────────────┘                                 │
│   Blocks /cook unless  Tracks step completion                           │
│   TaskCreate called                                                       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Storage Architecture

### State Directory Structure

```
.claude/
├── lessons.md           # Learned lessons (human-readable, appended by /learn skill)
├── memory/
│   ├── session-state.json   # Current session state
│   ├── workflow-state.json  # Active workflow progress
│   └── todo-state.json      # Todo list persistence
```

---

## Hook Configuration

### settings.json

```json
{
  "hooks": {
    "enabled": true,
    "disabled": [],
    "timeout_ms": 5000,
    "debug": false
  }
}
```

### .ck.json (Hook-Specific Config)

```json
{
  "privacyBlock": true,
  "scoutBlockMb": 5,
  "workflowRouter": {
    "enabled": true,
    "confirmHighImpact": true,
    "allowOverride": true,
    "overridePrefix": "quick:"
  },
}
```

---

## Hook Runner API

The `hook-runner.cjs` module provides consistent execution:

```javascript
const { runHook } = require('./lib/hook-runner.cjs');

runHook('my-hook', async (event) => {
  // event = parsed stdin JSON

  if (shouldBlock(event)) {
    return {
      continue: false,
      message: 'Operation blocked: reason'
    };
  }

  return {
    continue: true,
    inject: '## Additional Context\n\nGuidance here...'
  };
}, {
  exitCode: 0,         // Success exit code
  errorExitCode: 0,    // Non-blocking on error
  outputResult: true   // Write result to stdout
});
```

---

## Debugging

### Enable Debug Logging

```bash
export CK_DEBUG=1
```

### Debug Log Location

```
.claude/logs/hooks-debug.log
```

### Manual Hook Testing

```bash
# Test a hook with sample input
echo '{"event":"PreToolUse","tool":"Read","input":{"file_path":".env"}}' | node .claude/hooks/privacy-block.cjs
```

---

## Related Documentation

- [README.md](./README.md) - Hooks overview and catalog
- [pattern-learning.md](./pattern-learning.md) - Pattern detection and injection
- [extending-hooks.md](./extending-hooks.md) - Creating custom hooks

---

*Source: `.claude/hooks/` | Architecture reference*
