# Extending Hooks

> Guide for creating custom Claude Code hooks

## Overview

Hooks are Node.js scripts that execute at specific Claude Code lifecycle events. They receive JSON via stdin, perform their logic, and communicate results via stdout and exit codes. This guide covers creating custom hooks from scratch.

---

## Hook Structure

### Basic Template

```javascript
#!/usr/bin/env node
/**
 * my-custom-hook.cjs - Description of what this hook does
 *
 * Event: PreToolUse | PostToolUse | PrePrompt | etc.
 * Purpose: Brief explanation
 */

'use strict';

const { runHook } = require('./lib/hook-runner.cjs');

runHook('my-custom-hook', async (event) => {
  // event.hookEventName - SessionStart, PreToolUse, etc.
  // event.toolName - Read, Edit, Bash, etc.
  // event.toolInput - Tool parameters
  // event.toolResult - Tool output (PostToolUse only)
  // event.sessionId - Unique session ID
  // event.cwd - Current working directory

  // Your logic here

  return {
    continue: true,           // false = block operation
    inject: 'Context text',   // Optional: inject into Claude's context
    message: 'User message'   // Optional: display to user
  };
}, {
  exitCode: 0,        // Success exit code
  errorExitCode: 0,   // Non-blocking on error
  outputResult: true  // Write return value to stdout
});
```

### Blocking Hook Template

For hooks that need to block operations (like safety checks):

```javascript
const { runBlockingHook } = require('./lib/hook-runner.cjs');

runBlockingHook('my-blocking-hook', async (event) => {
  if (shouldBlock(event)) {
    return {
      allowed: false,
      message: 'Operation blocked: reason explanation'
    };
  }
  return { allowed: true };
});
```

### Sync Hook Template

For simple synchronous hooks:

```javascript
const { runHookSync } = require('./lib/hook-runner.cjs');

runHookSync('my-sync-hook', (event) => {
  // Synchronous logic only
  return { continue: true };
});
```

---

## Input Schema

Hooks receive JSON via stdin with this structure:

```typescript
interface HookInput {
  hook_event_name: string;  // SessionStart, PreToolUse, PostToolUse, etc.
  tool_name?: string;       // Read, Edit, Bash, Glob, Grep, etc.
  tool_input?: {            // Tool-specific parameters
    file_path?: string;     // For Read, Edit, Write
    pattern?: string;       // For Glob, Grep
    command?: string;       // For Bash
    // ... other tool-specific fields
  };
  tool_result?: string;     // Tool output (PostToolUse only)
  session_id: string;       // Unique session identifier
  cwd: string;              // Current working directory
}
```

### Parsed Event Object

The `hook-runner.cjs` parser provides normalized access:

```javascript
const event = {
  raw: { /* original JSON */ },
  hookEventName: 'PreToolUse',
  toolName: 'Read',
  toolInput: { file_path: '/path/to/file.ts' },
  toolResult: '',
  sessionId: 'abc123',
  cwd: '/project/root'
};
```

---

## Output Schema

### Standard Output (stdout)

Return JSON to communicate with Claude Code:

```json
{
  "continue": true,
  "inject": "## Context\n\nGuidance text to inject...",
  "message": "Message to display to user"
}
```

| Field | Type | Purpose |
|-------|------|---------|
| `continue` | boolean | `true` = proceed, `false` = block operation |
| `inject` | string | Text injected into Claude's context window |
| `message` | string | Message displayed to user (stderr is also visible) |

### Exit Codes

| Code | Behavior | Use Case |
|------|----------|----------|
| `0` | Success, continue processing | Normal completion |
| `2` | Block operation | Security/safety blocks |
| Other | Error, logged but continues | Non-critical failures |

**Important:** Always exit with code `0` on errors unless you specifically want to block the operation. Hooks should be **non-blocking by default** to avoid breaking Claude Code.

---

## Registration

### settings.json Configuration

Register hooks in `.claude/settings.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Read|Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "node \"%CLAUDE_PROJECT_DIR%\"/.claude/hooks/my-hook.cjs"
          }
        ]
      }
    ]
  }
}
```

### Event Types & Matchers

| Event | Matcher Values | When Triggered |
|-------|----------------|----------------|
| `SessionStart` | `startup`, `resume`, `clear`, `compact` | New or resumed session |
| `SessionEnd` | `clear`, `exit`, `compact` | Session ending |
| `UserPromptSubmit` | (none needed) | User submits prompt |
| `PreToolUse` | Tool names: `Read`, `Edit`, `Write`, `Bash`, `Glob`, `Grep`, `Skill` | Before tool execution |
| `PostToolUse` | Tool names (same as above) | After tool execution |
| `PreCompact` | `manual`, `auto` | Before context compaction |
| `SubagentStart` | `*` | Subagent spawning |
| `Notification` | (none needed) | Waiting for user input |

### Matcher Patterns

```json
{
  "matcher": "Read|Edit|Write",      // OR - matches any
  "matcher": "Bash",                  // Single tool
  "matcher": "*",                     // All events
  "matcher": "startup|resume"         // Multiple event subtypes
}
```

---

## Utility Modules

### debug-log.cjs

```javascript
const { debug, debugJson, debugError, logError } = require('./lib/debug-log.cjs');

// Only logs when CK_DEBUG=1 environment variable is set
debug('my-hook', 'Processing started');
debugJson('my-hook', 'Event data', event);
debugError('my-hook', error);  // Debug-only error

// Always logs (for critical errors)
logError('my-hook', error);
```

### stdin-parser.cjs

```javascript
const { parseStdinSync, parseHookEvent, readStdinSync } = require('./lib/stdin-parser.cjs');

// Parse as JSON with defaults
const data = parseStdinSync({ defaultValue: {}, throwOnError: false });

// Parse with normalized event fields
const event = parseHookEvent({ context: 'my-hook' });

// Read raw stdin
const raw = readStdinSync({ trim: true });
```

### ck-paths.cjs

```javascript
const paths = require('./lib/ck-paths.cjs');

paths.claudeDir        // .claude/
paths.memoryDir        // .claude/memory/
paths.hooksDir         // .claude/hooks/
paths.plansDir         // plans/
paths.reportsDir       // plans/reports/
```

### ck-config-loader.cjs

```javascript
const { loadCkConfig } = require('./lib/ck-config-loader.cjs');

const config = loadCkConfig();
// config.privacyBlock, config.scoutBlockMb, config.ace, etc.
```

---

## Example: Custom Safety Hook

Complete example blocking access to test fixtures:

```javascript
#!/usr/bin/env node
/**
 * test-fixture-block.cjs - Block modifications to test fixtures
 *
 * Event: PreToolUse
 * Purpose: Prevent accidental modification of test fixture files
 */

'use strict';

const path = require('path');
const { runBlockingHook } = require('./lib/hook-runner.cjs');
const { debug } = require('./lib/debug-log.cjs');

const FIXTURE_PATTERNS = [
  /\/__fixtures__\//,
  /\/test-data\//,
  /\.fixture\.(json|ts|js)$/
];

function isFixturePath(filePath) {
  if (!filePath) return false;
  const normalized = filePath.replace(/\\/g, '/');
  return FIXTURE_PATTERNS.some(p => p.test(normalized));
}

runBlockingHook('test-fixture-block', async (event) => {
  // Only check Edit and Write operations
  if (!['Edit', 'Write'].includes(event.toolName)) {
    return { allowed: true };
  }

  const filePath = event.toolInput?.file_path || '';
  debug('test-fixture-block', `Checking: ${filePath}`);

  if (isFixturePath(filePath)) {
    return {
      allowed: false,
      message: `
\x1b[33mBLOCKED\x1b[0m: Cannot modify test fixture file

  File: ${path.basename(filePath)}

  Test fixtures should remain unchanged to ensure test stability.
  If you need to update fixtures, do so manually with explicit approval.
`
    };
  }

  return { allowed: true };
});

// Export for testing
module.exports = { isFixturePath };
```

Register in settings.json:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "node \"%CLAUDE_PROJECT_DIR%\"/.claude/hooks/test-fixture-block.cjs"
          }
        ]
      }
    ]
  }
}
```

---

## Example: Context Injection Hook

Hook that injects API documentation when relevant files are edited:

```javascript
#!/usr/bin/env node
/**
 * api-docs-context.cjs - Inject API documentation for controller files
 *
 * Event: PreToolUse (Edit|Write)
 * Purpose: Provide API design context when editing controllers
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { runHook } = require('./lib/hook-runner.cjs');
const { debug } = require('./lib/debug-log.cjs');

const CONTROLLER_PATTERN = /Controller\.(cs|ts)$/;
const API_DOCS_PATH = 'docs/api-guidelines.md';

runHook('api-docs-context', async (event) => {
  // Only for Edit/Write operations
  if (!['Edit', 'Write'].includes(event.toolName)) {
    return { continue: true };
  }

  const filePath = event.toolInput?.file_path || '';

  // Check if editing a controller file
  if (!CONTROLLER_PATTERN.test(filePath)) {
    return { continue: true };
  }

  debug('api-docs-context', `Controller detected: ${filePath}`);

  // Load API guidelines if they exist
  const docsPath = path.join(event.cwd, API_DOCS_PATH);
  if (!fs.existsSync(docsPath)) {
    return { continue: true };
  }

  const guidelines = fs.readFileSync(docsPath, 'utf-8');

  return {
    continue: true,
    inject: `
## API Design Guidelines

You are editing a controller file. Follow these API design patterns:

${guidelines.slice(0, 2000)}  <!-- Truncate to avoid context bloat -->

---
`
  };
}, { outputResult: true });
```

---

## Testing Hooks

### Manual Testing

```bash
# Test with sample input
echo '{"hook_event_name":"PreToolUse","tool_name":"Read","tool_input":{"file_path":".env"}}' | node .claude/hooks/my-hook.cjs

# Check exit code
echo $?

# Enable debug logging
export CK_DEBUG=1
echo '{"hook_event_name":"PreToolUse","tool_name":"Edit","tool_input":{"file_path":"test.ts"}}' | node .claude/hooks/my-hook.cjs
```

### Unit Testing Pattern

```javascript
// my-hook.test.js
const { isFixturePath } = require('./my-hook.cjs');

describe('isFixturePath', () => {
  test('blocks __fixtures__ directory', () => {
    expect(isFixturePath('src/__fixtures__/data.json')).toBe(true);
  });

  test('allows regular files', () => {
    expect(isFixturePath('src/components/Button.tsx')).toBe(false);
  });
});
```

### Debug Logging

Enable debug output for all hooks:

```bash
export CK_DEBUG=1
```

Debug logs are written to stderr and appear in:
- Terminal output during Claude Code execution
- `.claude/logs/hooks-debug.log` (if configured)

---

## Best Practices

### 1. Fail-Open Design

Always default to allowing operations on errors:

```javascript
try {
  // Hook logic
} catch (error) {
  debugError('my-hook', error);
  process.exit(0);  // Allow operation on error
}
```

### 2. Minimize Context Injection

Keep injected text concise to preserve context window:

```javascript
// ❌ Don't inject entire documentation files
inject: fs.readFileSync('huge-guide.md', 'utf-8')

// ✅ Inject focused, relevant snippets
inject: `## Key Pattern\n\n${relevantSection.slice(0, 500)}`
```

### 3. Fast Execution

Hooks run synchronously in the Claude Code pipeline. Keep execution fast:

```javascript
// ❌ Don't make external API calls
await fetch('https://api.example.com/validate');

// ✅ Use local checks only
if (localPattern.test(filePath)) { ... }
```

### 4. Clear Error Messages

Provide actionable guidance when blocking:

```javascript
// ❌ Vague message
message: 'Operation blocked'

// ✅ Specific, actionable message
message: `
BLOCKED: Cannot edit test fixtures

  File: ${filename}

  Test fixtures must remain stable. If update is intentional:
  1. Ask user for confirmation
  2. Retry with APPROVED: prefix: APPROVED:${filePath}
`
```

### 5. Export Functions for Testing

```javascript
// At end of hook file
if (typeof module !== 'undefined') {
  module.exports = { isValidPath, extractPatterns, ... };
}
```

---

## Debugging

### Enable Debug Mode

```bash
export CK_DEBUG=1
```

### Debug Log Location

```
.claude/logs/hooks-debug.log
```

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Hook not executing | Not registered in settings.json | Add to appropriate event in hooks config |
| Hook blocking unexpectedly | Exit code != 0 | Ensure `process.exit(0)` on success/error |
| Context not injecting | Missing `outputResult: true` | Add to runHook options |
| JSON parse errors | Malformed stdin | Use `parseStdinSync` with `defaultValue` |

---

## Related Documentation

- [README.md](./README.md) - Hooks overview and catalog
- [architecture.md](./architecture.md) - Hook system architecture

---

*Source: `.claude/hooks/lib/` | Hook development utilities*
