# Extending Hooks

> Guide for creating custom Claude Code hooks

## Overview

Hooks are Node.js scripts that execute at specific Claude Code lifecycle events. They receive JSON via stdin, perform their logic, and communicate results via stdout or exit codes. This guide covers creating custom hooks from scratch.

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

runHook(
    'my-custom-hook',
    async event => {
        // event.hookEventName - SessionStart, PreToolUse, etc.
        // event.toolName - Read, Edit, Bash, etc.
        // event.toolInput - Tool parameters
        // event.toolResult - Tool output (PostToolUse only)
        // event.sessionId - Unique session ID
        // event.cwd - Current working directory

        // Your logic here

        // Return an object/string only for event types that explicitly support stdout.
        // SessionStart hooks must return undefined and stay silent.
        return undefined;
    },
    {
        exitCode: 0, // Success exit code
        errorExitCode: 0, // Non-blocking on error
        outputResult: false // Keep hooks silent unless the event contract requires output
    }
);
```

### Blocking Hook Template

`runBlockingHook` uses an allow-on-error contract: it blocks an explicit
`allowed: false` result, but permits ordinary runtime errors and timeouts after
reporting them. Use it only when that failure policy is intended; for a
deny-closed security boundary, use the explicit pre-tool policy below.

```javascript
const { runBlockingHook } = require('./lib/hook-runner.cjs');

runBlockingHook('my-blocking-hook', async event => {
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

runHookSync('my-sync-hook', event => {
    // Synchronous logic only. Keep a setup SessionStart hook silent;
    // universal rules arrive through the protocol-delivery hooks.
});
```

---

## Input Schema

Hooks receive JSON via stdin with this structure:

```typescript
interface HookInput {
    hook_event_name: string; // SessionStart, PreToolUse, PostToolUse, etc.
    tool_name?: string; // Read, Edit, Bash, Glob, Grep, etc.
    tool_input?: {
        // Tool-specific parameters
        file_path?: string; // For Read, Edit, Write
        pattern?: string; // For Glob, Grep
        command?: string; // For Bash
        // ... other tool-specific fields
    };
    tool_response?: unknown; // Tool output (PostToolUse) — the field name Claude Code documents; payload shape varies by tool
    tool_result?: unknown; // Legacy name read by lib/stdin-parser.cjs and the test helpers; do not rely on it for Claude input
    agent_id?: string; // Present when the event comes from a helper (sub-)agent
    transcript_path?: string; // Conversation history file of the main session
    session_id: string; // Unique session identifier
    cwd: string; // Current working directory
}
```

### Parsed Event Object

The `hook-runner.cjs` parser provides normalized access:

```javascript
const event = {
    raw: {
        /* original JSON */
    },
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

Hooks communicate with Claude Code via event-specific stdout contracts plus the exit code. Do not use stdout as a general prompt-injection channel. Universal rules are delivered only by the protocol-delivery hooks (read `README.md#protocol-delivery` before adding one); project information belongs in `CLAUDE.md` / `AGENTS.md`, and agent and skill files carry their own role text.

| Channel     | Exit code | Effect                                                                |
| ----------- | --------- | --------------------------------------------------------------------- |
| stdout text | `0`       | Event-specific output only; `SessionStart` must stay silent           |
| stderr text | `2`       | Operation is blocked; stderr message is shown (and visible to Claude) |
| no output   | `0`       | Silent no-op                                                          |

`runBlockingHook` implements the blocking channel for you: return `{ allowed: false, message }` and it writes `message` to stderr, sets exit code 2, and returns to drain output (`hook-runner.cjs:386-425`). Errors and timeouts retain its generic allow-on-error policy.

### Bash PreToolUse hooks

For hooks registered on `Bash`, use the stream-safe pre-tool wrapper:

```javascript
const { runPreToolHookSync } = require('./lib/hook-runner.cjs');

function evaluate(input) {
    if (input.tool_name !== 'Bash') return undefined;
    if (shouldBlock(input.tool_input?.command)) {
        return { code: 2, stderr: 'BLOCKED: explain the safe alternative\n' };
    }
    return undefined; // exit 0, empty stdout
}

runPreToolHookSync('my-bash-hook', evaluate, {
    inputErrorCode: 2, // use 0 only for a deliberately advisory heuristic
    errorExitCode: 2
});
```

The wrapper reports malformed input and handler errors, writes output before setting `process.exitCode`,
and records a decision/duration when `CLAUDE_HOOK_DEBUG=1`. Never call `process.exit()` immediately
after writing stdout or stderr. If a hook rewrites Bash input, return the complete documented envelope:

```javascript
return {
    stdout: `${JSON.stringify({
        hookSpecificOutput: {
            hookEventName: 'PreToolUse',
            updatedInput: { ...input.tool_input, command: rewrittenCommand }
        }
    })}\n`
};
```

`updatedInput` replaces the complete `tool_input` object, so preserve fields that are not being changed.
A syntax-only rewrite must omit `permissionDecision`: correcting syntax does not authorize the command
or its unrelated compound tail. Permission evaluation belongs to the host and separately authorized policy hooks.

**SessionStart contract:** setup hooks may create files, refresh state, or run checks, but must emit no stdout. The only SessionStart stdout carriers are the protocol-delivery hooks (the universal bundle after a `compact` or `clear`).

### Exit Codes

| Code  | Behavior                     | Use Case               |
| ----- | ---------------------------- | ---------------------- |
| `0`   | Success, continue processing | Normal completion      |
| `2`   | Block operation              | Security/safety blocks |
| Other | Error, logged but continues  | Non-critical failures  |

**Important:** Always exit with code `0` on errors unless you specifically want to block the operation. Hooks should be **non-blocking by default** to avoid breaking Claude Code.

---

## Validation Patterns

When a hook emits its own rejection instead of delegating to `runBlockingHook`, it must **drain before it
exits**. Write the message, set `process.exitCode`, then `return` — and let Node flush the stream on its own:

```javascript
if (!result.allowed) {
    process.stderr.write(result.message);
    process.exitCode = 2;
    return;
}
```

Each of those three lines carries the whole contract:

- **`process.stderr.write(result.message)`** — the block message is the only thing the user and Claude
  see. A rejection with no stderr text is a silent failure the caller cannot act on.
- **`process.exitCode = 2`** — never `process.exit(2)`. `process.exit` tears the process down
  immediately, so a large diagnostic queued on a pipe is truncated or lost entirely; setting
  `exitCode` lets Node drain first and exit with the same status.
- **`return`** — the rejection must not fall through into the allow path that follows it. Dropping the
  `return` produces a hook that writes a block message and then permits the operation anyway.

The canonical implementation of this contract lives in `runBlockingHook` itself
(`.claude/hooks/lib/hook-runner.cjs`), so a hook that delegates inherits it; the rules above bind any hook
that writes its own rejection instead.

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

| Event              | Matcher Values                                                       | When Triggered                 |
| ------------------ | -------------------------------------------------------------------- | ------------------------------ |
| `SessionStart`     | `startup`, `resume`, `clear`, `compact`                              | New or resumed session         |
| `SessionEnd`       | Host-specific supported reasons                                      | Session ending                 |
| `UserPromptSubmit` | (none needed)                                                        | User submits prompt            |
| `PreToolUse`       | Tool names: `Read`, `Edit`, `Write`, `Bash`, `Glob`, `Grep`, `Skill` | Before tool execution          |
| `PostToolUse`      | Tool names (same as above)                                           | After tool execution           |
| `PreCompact`       | `manual`, `auto`                                                     | Before context compaction      |
| `SubagentStart`    | Agent type names (e.g. `Explore\|Plan`) or `*`                       | Subagent spawning              |
| `UserPromptExpansion` | `*`                                                               | Typed `/command` expands       |
| `Stop`             | (none needed)                                                        | Main agent finishes responding |
| `Notification`     | (none needed)                                                        | Waiting for user input         |

> These are the events Claude Code supports for new hooks. This framework registers no `PreCompact` hook. `SubagentStart` and `UserPromptExpansion` carry only protocol-delivery handlers (the five `protocol-inject-<group>.cjs` group handlers, the four `protocol-inject-universal-<n>.cjs` bins on `SubagentStart` (also registered on `UserPromptSubmit` and on `SessionStart` with matcher `compact|clear`), and `skill-overlay-remind.cjs` on `UserPromptExpansion`); standing sub-agent context stays static in `agents/*.md`. Read `README.md#protocol-delivery` before adding another handler to either event.

### Matcher Patterns

```json
{
    "matcher": "Read|Edit|Write", // OR - matches any
    "matcher": "Bash", // Single tool
    "matcher": "*", // All events
    "matcher": "startup|resume" // Multiple event subtypes
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
debugError('my-hook', error); // Debug-only error

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

Runtime tmp/state directories and marker-file helpers (not source-tree paths):

```javascript
const {
    CK_TMP_DIR,
    MARKERS_DIR,
    DEBUG_DIR,
    SWAP_DIR,
    SESSION_STATE_DIR,
    ensureDir,
    getMarkerPath,
    getDebugLogPath,
    getSessionStatePath
} = require('./lib/ck-paths.cjs');

CK_TMP_DIR; // OS-tmp scoped framework state root
MARKERS_DIR; // dedup/injection marker files
DEBUG_DIR; // debug log files
getMarkerPath('my-hook'); // marker file path for a hook
getSessionStatePath(sessionId); // per-session state file
ensureDir(MARKERS_DIR); // create directory if missing
```

### ck-config-loader.cjs

```javascript
const { loadConfig } = require('./lib/ck-config-loader.cjs');

const config = loadConfig();
// config.plan, config.paths, config.subagent, etc.
// (top-level keys of .claude/.ck.json merged with DEFAULT_CONFIG)
```

---

## Example: Custom Safety Hook

Complete best-effort example blocking modifications to test fixtures. It uses
the generic `runBlockingHook` allow-on-error contract, so it is an accidental-edit
guard, not a deny-closed authorization boundary. Use an explicit pre-tool policy
if fixture protection must also reject failed evaluation:

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

const FIXTURE_PATTERNS = [/\/__fixtures__\//, /\/test-data\//, /\.fixture\.(json|ts|js)$/];

function isFixturePath(filePath) {
    if (!filePath) return false;
    const normalized = filePath.replace(/\\/g, '/');
    return FIXTURE_PATTERNS.some(p => p.test(normalized));
}

runBlockingHook('test-fixture-block', async event => {
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

## Example: Silent SessionStart Setup Hook

Hook that refreshes local state without writing startup guidance to stdout:

```javascript
#!/usr/bin/env node
/**
 * session-state-refresh.cjs - Refresh local hook state silently
 *
 * Event: SessionStart
 * Purpose: Keep derived hook state warm without prompt injection
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { runHook } = require('./lib/hook-runner.cjs');
const { debug } = require('./lib/debug-log.cjs');

const STATE_PATH = '.claude/state/session-start.json';

runHook(
    'session-state-refresh',
    async event => {
        if (event.hookEventName !== 'SessionStart') {
            return undefined;
        }

        const statePath = path.join(event.cwd, STATE_PATH);
        fs.mkdirSync(path.dirname(statePath), { recursive: true });
        fs.writeFileSync(
            statePath,
            JSON.stringify({
                refreshedAt: new Date().toISOString(),
                source: 'session-state-refresh'
            }) + '\n'
        );

        debug('session-state-refresh', `Updated ${STATE_PATH}`);
        return undefined;
    },
    { outputResult: false }
);
```

---

## Pattern: PostToolUse Context Accelerator

Use this shape only for a reminder that ALSO exists statically (the CLAUDE.md/AGENTS.md "Automatic Skill Activation" table or a lookup CLI) — the hook speeds delivery up, it never becomes the source of truth. Reference implementation: `file-convention-inject.cjs` (lib `file-conventions.cjs` / `convention-ledger.cjs`).

- **Output:** one JSON object on stdout, exit `0`, no decision fields:
  `{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"…"}}`. The tool call has already run; the text reaches the model before its next step.
- **Opt-in + fast no-op:** read one config switch first and return silently when it is off; keep heavy `require`s behind that check.
- **Fail-open:** any parse/config/IO error ⇒ empty stdout, exit `0`, no stderr noise (a reminder must never disrupt the tool flow).
- **Deliver only what is missing:** key delivery memory by `session_id` + working context (`agent_id` when present, else main); write the record only in the `process.stdout.write` callback so an undelivered reminder is retried; re-arm after condensation (SessionStart `compact|clear`, transcript marks) and after enough conversation growth.
- **Concurrency:** claim with an exclusive-create lock (`fs.openSync(file, 'wx')`), treat an old lock as stale, and re-check presence after acquiring it.
- **Budget:** cap the text, put the must-do lines first and last, and degrade lowest-precedence content first.
- **Codex:** `run-codex-sync.mjs` mirrors the registration; Codex runs the hook via a `node -e` launcher where `require.main` is undefined, so a bare `require.main === module` check silently never runs the hook there. Gate the entry point with `isHookEntryPoint(module)` from `./lib/hook-runner.cjs` — it covers both `node <hook>` and the Codex launcher; never hand-write the check.

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

# Trace every Bash-path hook decision and duration
export CLAUDE_HOOK_DEBUG=1
echo '{"hook_event_name":"PreToolUse","tool_name":"Bash","tool_input":{"command":"echo hi"}}' | node .claude/hooks/my-hook.cjs
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
- stderr when `CLAUDE_HOOK_DEBUG=1` is enabled

For the Bash PreToolUse chain, `CLAUDE_HOOK_DEBUG=1` writes one JSON record per invocation to the
platform temp directory at `ck/debug/bash-hooks.log` (override with `CLAUDE_HOOK_DEBUG_LOG`). Records
contain the hook, decision, exit code, and duration, but not command/path contents. The sink is bounded
and rotates once; a sink failure is emitted on stderr.

---

## Best Practices

### 1. Fail-Loud Error Design

Never hide a hook error. Distinguish policy uncertainty from ordinary runtime errors:
an unsupported or ambiguous operation in a deny-closed security policy must be
returned as an explicit rejection, not treated as permission. Generic `runBlockingHook`
retains allow-on-error compatibility for runtime errors and timeouts; its examples
do not promise deny-closed authorization. For a security boundary that must also
deny malformed input and handler failures, select and test the explicit pre-tool
error policy below. Advisory heuristics may deliberately select code 0, with visible
diagnostics. Do not change a generic helper's failure contract to implement one consumer's policy.

```javascript
runPreToolHookSync('my-hook', evaluate, {
    inputErrorCode: 2,
    errorExitCode: 2
});
```

### 2. Minimize Context Injection

Keep injected text concise to preserve context window:

```javascript
// ❌ Don't inject entire documentation files
return fs.readFileSync('huge-guide.md', 'utf-8');

// ✅ Inject focused, relevant snippets
return `## Key Pattern\n\n${relevantSection.slice(0, 500)}`;
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
message: 'Operation blocked';

// ✅ Specific, actionable message
message: `
BLOCKED: Cannot edit test fixtures

  File: ${filename}

  Test fixtures must remain stable. If update is intentional:
  1. Ask user for confirmation
  2. Retry with APPROVED: prefix: APPROVED:${filePath}
`;
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
%TEMP%/ck/debug/bash-hooks.log       # Windows
$TMPDIR/ck/debug/bash-hooks.log      # POSIX (or the platform temp directory)
```

Set `CLAUDE_HOOK_DEBUG_LOG` to choose a different file for a test or incident. The Bash trace rotates
once at 1 MiB, records the hook/decision/exit code/duration and error classification, and never stores
command or path contents. A sink failure is reported on stderr and does not change the hook decision.

### Common Issues

| Issue                          | Cause                                | Solution                                                               |
| ------------------------------ | ------------------------------------ | ---------------------------------------------------------------------- |
| Hook not executing             | Not registered in settings.json      | Add to appropriate event in hooks config                               |
| Hook blocking unexpectedly     | Exit code != 0                       | Return an explicit outcome and let the wrapper set `process.exitCode`  |
| Unexpected SessionStart output | Hook writes stdout or enables output | Remove stdout output; move guidance to a protocol                |
| JSON parse errors              | Malformed stdin                      | Use the pre-tool wrapper so the failure is visible and policy-specific |

---

## Related Documentation

- [README.md](./README.md) - Hooks overview and catalog

---

_Source: `.claude/hooks/lib/` | Hook development utilities_
