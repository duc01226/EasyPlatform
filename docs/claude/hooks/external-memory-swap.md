# External Memory Swap System

> Post-compaction recovery for large tool outputs via externalized swap files

## Overview

The External Memory Swap system externalizes large tool outputs to swap files, keeping lightweight pointers in conversation context. This enables **exact content retrieval after context compaction** - the primary value proposition.

**Critical Constraint:** PostToolUse hooks cannot transform tool output (architectural limitation). The original content still enters context. Value is realized **after compaction** when exact content can be retrieved via pointers.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        EXTERNAL MEMORY SWAP FLOW                        │
└─────────────────────────────────────────────────────────────────────────┘

  Tool Execution (Read/Grep/Glob)
           │
           ▼
  ┌─────────────────────┐
  │   PostToolUse Hook  │
  │  tool-output-swap   │
  └─────────┬───────────┘
            │
            ▼
  ┌─────────────────────┐     size < threshold
  │  shouldExternalize  │────────────────────────► Pass through (no action)
  └─────────┬───────────┘
            │ size >= threshold
            ▼
  ┌─────────────────────┐
  │    externalize()    │
  │   swap-engine.cjs   │
  └─────────┬───────────┘
            │
            ├──────────────────────────────────────┐
            │                                      │
            ▼                                      ▼
  ┌─────────────────────┐              ┌─────────────────────┐
  │  Write Swap Files   │              │  Inject Pointer     │
  │  /tmp/ck/swap/...   │              │  via console.log    │
  └─────────────────────┘              └─────────────────────┘
            │
            ▼
  ┌─────────────────────────────────────────────────────────┐
  │              SWAP STORAGE STRUCTURE                      │
  │  /tmp/ck/swap/{sessionId}/                              │
  │  ├── index.json          (session manifest)             │
  │  ├── .lock               (concurrency lock file)        │
  │  ├── {hash}.content      (raw content, exact)           │
  │  └── {hash}.meta.json    (metadata + summary)           │
  └─────────────────────────────────────────────────────────┘

                    ... Later, on Context Compaction ...

  ┌─────────────────────┐
  │  SessionStart Hook  │
  │ post-compact-recovery│
  └─────────┬───────────┘
            │
            ▼
  ┌─────────────────────┐
  │  getSwapEntries()   │──────► Retrieves swap file inventory
  └─────────┬───────────┘
            │
            ▼
  ┌─────────────────────────────────────────────────────────┐
  │              RECOVERY INJECTION                          │
  │  "Previously externalized content available:"            │
  │  | ID | Tool | Summary | Retrieve Path |                │
  │  Use Read tool to get exact content when needed          │
  └─────────────────────────────────────────────────────────┘
```

---

## Architecture

### Component Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                    COMPONENT LAYERS                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────┐                                        │
│  │  settings.json  │  Hook Registration                     │
│  └────────┬────────┘                                        │
│           │ registers                                        │
│           ▼                                                  │
│  ┌─────────────────────┐                                    │
│  │ tool-output-swap.cjs│  PostToolUse Hook (thin wrapper)   │
│  └────────┬────────────┘                                    │
│           │ calls                                            │
│           ▼                                                  │
│  ┌─────────────────────┐                                    │
│  │   swap-engine.cjs   │  Core Logic (418 lines)            │
│  │                     │  - shouldExternalize()              │
│  │                     │  - externalize()                    │
│  │                     │  - extractSummary()                 │
│  │                     │  - buildPointer()                   │
│  └────────┬────────────┘                                    │
│           │ uses                                             │
│           ▼                                                  │
│  ┌─────────────────────┐                                    │
│  │    ck-paths.cjs     │  Path Infrastructure               │
│  │                     │  - SWAP_DIR constant                │
│  │                     │  - ensureSwapDir()                  │
│  │                     │  - getSwapDir()                     │
│  └─────────────────────┘                                    │
│                                                              │
│  ┌─────────────────────┐                                    │
│  │  swap-config.json   │  Configuration                     │
│  └─────────────────────┘                                    │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                    INTEGRATION POINTS                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────┐                                │
│  │ post-compact-recovery.cjs│  Injects swap inventory        │
│  │                         │  on session resume              │
│  └─────────────────────────┘                                │
│                                                              │
│  ┌─────────────────────────┐                                │
│  │    session-end.cjs      │  Cleanup on session end         │
│  │                         │  - clear/exit: full delete      │
│  │                         │  - compact: retention cleanup    │
│  └─────────────────────────┘                                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### File Locations

| File | Location | Purpose |
|------|----------|---------|
| `tool-output-swap.cjs` | `.claude/hooks/` | PostToolUse hook entry point |
| `swap-engine.cjs` | `.claude/hooks/lib/` | Core externalization logic |
| `swap-config.json` | `.claude/hooks/config/` | Thresholds and limits |
| `ck-paths.cjs` | `.claude/hooks/lib/` | SWAP_DIR and path helpers |
| Swap files | `/tmp/ck/swap/{sessionId}/` | Runtime storage |

---

## Configuration

### swap-config.json

```json
{
  "enabled": true,
  "thresholds": {
    "default": 4096,
    "Read": 8192,
    "Grep": 4096,
    "Bash": 6144,
    "Glob": 2048
  },
  "retention": {
    "defaultHours": 24,
    "accessedHours": 48,
    "neverAccessedHours": 6
  },
  "limits": {
    "maxEntriesPerSession": 100,
    "maxTotalBytes": 262144000,
    "maxSingleFile": 5242880
  },
  "summary": {
    "maxLength": 500,
    "keyPatternsCount": 10
  }
}
```

### Configuration Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `thresholds.Read` | 8192 | Chars before externalizing Read output |
| `thresholds.Grep` | 4096 | Chars before externalizing Grep output |
| `thresholds.Bash` | 6144 | Chars before externalizing Bash output |
| `thresholds.Glob` | 2048 | Chars before externalizing Glob output |
| `retention.defaultHours` | 24 | Base retention period |
| `retention.accessedHours` | 48 | Extended retention if retrieved |
| `retention.neverAccessedHours` | 6 | Shorter retention if never accessed |
| `limits.maxEntriesPerSession` | 100 | Max swap files per session |
| `limits.maxTotalBytes` | 250MB | Total storage limit |
| `limits.maxSingleFile` | 5MB | Single file size limit |

---

## Main Workflow Code Flow

### 1. Hook Registration (settings.json:32-41)

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "hooks": [
          {
            "command": "node \"%CLAUDE_PROJECT_DIR%\"/.claude/hooks/tool-output-swap.cjs",
            "type": "command"
          }
        ],
        "matcher": "Read|Grep|Glob"
      }
    ]
  }
}
```

### 2. PostToolUse Hook Execution (tool-output-swap.cjs)

```javascript
// tool-output-swap.cjs - Entry point
runHook('tool-output-swap', (event) => {
  const { toolName, toolInput, toolResult, sessionId } = event;

  // Step 1: Check if externalization needed
  if (!toolResult || !shouldExternalize(toolName, toolResult, toolInput)) {
    return; // Below threshold, no action
  }

  // Step 2: Externalize to swap file
  const entry = externalize(
    sessionId || process.env.CK_SESSION_ID || 'default',
    toolName,
    toolInput,
    toolResult
  );

  // Step 3: Inject pointer into context
  console.log(buildPointer(entry));
});
```

### 3. Threshold Check (swap-engine.cjs:47-63)

```javascript
function shouldExternalize(toolName, toolResult, toolInput = {}) {
  const config = loadConfig();
  if (!config.enabled) return false;

  // Prevent recursion - don't externalize swap file reads
  if (toolName === 'Read' && (toolInput?.file_path || '').includes('/tmp/ck/swap/')) {
    return false;
  }

  const content = typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult);
  const threshold = config.thresholds[toolName] || config.thresholds.default;

  // Skip if exceeds single file limit
  if (content.length > config.limits.maxSingleFile) {
    return false;
  }

  return content.length > threshold;
}
```

### 4. Externalization (swap-engine.cjs:150-181)

```javascript
function externalize(sessionId, toolName, toolInput, toolResult) {
  // Create session swap directory
  const sessionDir = ensureSwapDir(sessionId);
  const swapId = generateSwapId(toolName, toolInput);
  const content = typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult, null, 2);
  const contentPath = path.join(sessionDir, `${swapId}.content`);

  // Write raw content (exact preservation)
  fs.writeFileSync(contentPath, content, 'utf8');

  // Create metadata with summary
  const metadata = {
    id: swapId,
    tool: toolName,
    input: toolInput,
    metrics: {
      charCount: content.length,
      lineCount: content.split('\n').length,
      tokenEstimate: Math.ceil(content.length / 4)
    },
    summary: extractSummary(content, toolName),
    keyPatterns: extractKeyPatterns(content, toolName),
    timestamps: {
      capturedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + MS_PER_DAY).toISOString()
    }
  };

  // Write metadata
  fs.writeFileSync(path.join(sessionDir, `${swapId}.meta.json`), JSON.stringify(metadata, null, 2));

  // Update session index
  const index = readIndex(sessionDir);
  index.entries[swapId] = { tool: toolName, summary: metadata.summary.slice(0, 100), charCount: content.length };
  writeIndex(sessionDir, index);

  return { swapId, sessionDir, contentPath, metadata };
}
```

### 5. Summary Extraction (swap-engine.cjs:70-109)

```javascript
function extractSummary(content, toolName) {
  const maxLen = loadConfig().summary.maxLength;

  if (toolName === 'Read') {
    // Extract class/interface/function signatures
    const patterns = [
      [/(?:public|internal|private)?\s*(?:sealed|abstract|static)?\s*class\s+\w+/g, 3],
      [/(?:public|internal)?\s*interface\s+\w+/g, 2],
      [/(?:export\s+)?class\s+\w+/g, 3],
      [/(?:export\s+)?(?:async\s+)?function\s+\w+/g, 3]
    ];
    const sigs = patterns.flatMap(([re, n]) => (content.match(re) || []).slice(0, n));
    return sigs.length ? sigs.slice(0, 10).map(s => s.trim()).join(', ') : truncate(content);
  }

  if (toolName === 'Grep') {
    const lines = content.split('\n').filter(l => l.trim());
    return `${lines.length} matches. Preview: ${lines.slice(0, 3).map(l => l.slice(0, 80)).join(' | ')}`;
  }

  if (toolName === 'Glob') {
    const files = content.split('\n').filter(l => l.trim());
    const exts = [...new Set(files.map(f => path.extname(f)).filter(Boolean))].slice(0, 5);
    return `${files.length} files. Types: ${exts.join(', ')}`;
  }

  return truncate(content);
}
```

### 6. Pointer Generation (swap-engine.cjs:183-212)

```javascript
function buildPointer(entry) {
  const { swapId, contentPath, metadata } = entry;
  const { charCount, tokenEstimate } = metadata.metrics;
  const filePath = contentPath.replace(/\\/g, '/');

  return `
## External Memory Reference

| Field | Value |
|-------|-------|
| **ID** | \`${swapId}\` |
| **Tool** | ${metadata.tool} |
| **Input** | \`${formatInput(metadata.input)}\` |
| **Size** | ${charCount.toLocaleString()} chars (~${tokenEstimate.toLocaleString()} tokens) - externalized |

### Summary
${metadata.summary}

### Key Patterns
${metadata.keyPatterns.map(p => `- \`${p}\``).join('\n')}

### Retrieval
\`\`\`
Read: ${filePath}
\`\`\`

> Content externalized to preserve context. Use Read tool above to retrieve when needed.
`;
}
```

### 7. Post-Compaction Recovery (post-compact-recovery.cjs:154-179)

```javascript
// In buildRecoveryInjection()
if (sessionId) {
  const swapEntries = getSwapEntries(sessionId);
  if (swapEntries.length > 0) {
    lines.push('### Externalized Content (Recoverable)');
    lines.push('');
    lines.push('The following large tool outputs were externalized during this session:');
    lines.push('');
    lines.push('| ID | Tool | Summary | Retrieve |');
    lines.push('|----|------|---------|----------|');
    swapEntries.slice(0, 10).forEach(entry => {
      const shortSummary = entry.summary.slice(0, 40) + (entry.summary.length > 40 ? '...' : '');
      lines.push(`| \`${entry.id}\` | ${entry.tool} | ${shortSummary} | \`Read: ${entry.retrievePath}\` |`);
    });
    lines.push('');
    lines.push('> Use Read tool with the retrieve path to get exact content when needed.');
  }
}
```

### 8. Session End Cleanup (session-end.cjs:38-49)

```javascript
// Clean up swap files based on reason
if (sessionId) {
  if (reason === 'clear' || reason === 'exit') {
    // Full cleanup on clear/exit - delete entire swap directory
    deleteSessionSwap(sessionId);
  } else if (reason === 'compact') {
    // On compact, only cleanup old files (keep recent for recovery)
    cleanupSwapFiles(sessionId, 24); // 24 hour retention
  }
}
```

---

## Example: Complete Flow

### Scenario: Large File Read

```
1. User asks: "Read src/Services/Employee.cs"

2. Claude executes Read tool → returns 15,234 chars

3. PostToolUse fires → tool-output-swap.cjs receives event:
   {
     toolName: "Read",
     toolInput: { file_path: "src/Services/Employee.cs" },
     toolResult: "// Employee.cs content... (15,234 chars)",
     sessionId: "abc123"
   }

4. shouldExternalize("Read", content) → true (15,234 > 8,192 threshold)

5. externalize() writes:
   /tmp/ck/swap/abc123/a1b2c3d4e5f6.content   (exact file content)
   /tmp/ck/swap/abc123/a1b2c3d4e5f6.meta.json (metadata + summary)
   /tmp/ck/swap/abc123/index.json             (updated index)

6. buildPointer() outputs to context:
   ## External Memory Reference
   | Field | Value |
   |-------|-------|
   | **ID** | `a1b2c3d4e5f6` |
   | **Tool** | Read |
   | **Size** | 15,234 chars (~3,809 tokens) - externalized |

   ### Summary
   class Employee : RootEntity<Employee, string>, GetByEmailAsync, ValidateAsync

   ### Retrieval
   Read: /tmp/ck/swap/abc123/a1b2c3d4e5f6.content

7. ... Session continues, context grows ...

8. Context compaction triggered

9. SessionStart(resume) fires → post-compact-recovery.cjs runs

10. Recovery injection includes:
    ### Externalized Content (Recoverable)
    | ID | Tool | Summary | Retrieve |
    |----|------|---------|----------|
    | `a1b2c3d4e5f6` | Read | class Employee... | `Read: /tmp/ck/swap/abc123/...` |

11. Claude can now retrieve exact content via: Read /tmp/ck/swap/abc123/a1b2c3d4e5f6.content
```

---

## API Reference

### swap-engine.cjs Exports

| Function | Signature | Description |
|----------|-----------|-------------|
| `shouldExternalize` | `(toolName, toolResult, toolInput?) → boolean` | Check if output exceeds threshold |
| `externalize` | `(sessionId, toolName, toolInput, toolResult) → Entry` | Write swap files, return entry |
| `buildPointer` | `(entry) → string` | Generate markdown pointer |
| `extractSummary` | `(content, toolName) → string` | Tool-specific summary extraction |
| `extractKeyPatterns` | `(content, toolName) → string[]` | Extract class/function names |
| `getSwapEntries` | `(sessionId) → Entry[]` | Get all swap entries for session |
| `cleanupSwapFiles` | `(sessionId, maxAgeHours?) → void` | Remove expired swap files |
| `deleteSessionSwap` | `(sessionId) → void` | Delete entire session swap directory |
| `loadConfig` | `() → Config` | Load swap configuration (cached) |

### ck-paths.cjs Swap Helpers

| Function | Signature | Description |
|----------|-----------|-------------|
| `SWAP_DIR` | `string` | Base swap directory (`/tmp/ck/swap`) |
| `getSwapDir` | `(sessionId) → string` | Get session swap directory path |
| `ensureSwapDir` | `(sessionId) → string` | Create and return session swap directory |

---

## Storage Schema

### index.json

```json
{
  "entries": {
    "a1b2c3d4e5f6": {
      "tool": "Read",
      "summary": "class Employee : RootEntity...",
      "charCount": 15234,
      "capturedAt": "2026-01-16T10:30:00Z"
    }
  },
  "totalEntries": 1,
  "totalBytes": 15234,
  "lastUpdatedAt": "2026-01-16T10:30:00Z"
}
```

### {hash}.meta.json

```json
{
  "id": "a1b2c3d4e5f6",
  "tool": "Read",
  "input": { "file_path": "src/Services/Employee.cs" },
  "metrics": {
    "charCount": 15234,
    "lineCount": 423,
    "tokenEstimate": 3809
  },
  "summary": "class Employee : RootEntity<Employee, string>...",
  "keyPatterns": ["Employee", "GetByEmailAsync", "ValidateAsync"],
  "timestamps": {
    "capturedAt": "2026-01-16T10:30:00Z",
    "expiresAt": "2026-01-17T10:30:00Z",
    "lastAccessedAt": null
  },
  "retrieval": {
    "count": 0,
    "lastRetrievedAt": null
  }
}
```

---

## Session Lifecycle Integration

The swap system participates in multiple session events to ensure content availability across compactions and proper cleanup on exit.

```text
PostToolUse (tool-output-swap.cjs)
    │  Externalize large outputs → .content + .meta.json + index.json
    ▼
PreCompact (write-compact-marker.cjs)
    │  Write compaction marker for recovery baseline
    ▼
SessionStart:compact (post-compact-recovery.cjs)
    │  Inject swap inventory table into context
    │  "Previously externalized content available: ..."
    ▼
SessionStart:resume (session-resume.cjs)
    │  Re-inject swap inventory if session has entries
    ▼
SessionEnd:exit|clear (session-end.cjs)
    │  deleteSessionSwap() → full removal of session swap dir
    ▼
SessionEnd:compact (session-end.cjs)
       cleanupSwapFiles(24h) → age-based pruning, keep recent
```

| Event | Hook | Swap Action |
|-------|------|-------------|
| PostToolUse | `tool-output-swap.cjs` | Externalize if above threshold |
| PreCompact | `write-compact-marker.cjs` | Write marker for statusline reset |
| SessionStart:compact | `post-compact-recovery.cjs` | Inject swap inventory table |
| SessionStart:resume | `session-resume.cjs` | Re-inject swap inventory |
| SessionEnd:exit/clear | `session-end.cjs` | `deleteSessionSwap()` — full removal |
| SessionEnd:compact | `session-end.cjs` | `cleanupSwapFiles(24h)` — age-based pruning |

### File Locking

The swap engine uses a `.lock` file in each session directory to prevent concurrent writes during externalization and index updates. The lock is acquired before writing content/metadata and released after the index is updated.

---

## Limitations

### What This System Does NOT Do

| Misconception | Reality |
|---------------|---------|
| Reduces context during active session | ❌ Original content still enters context |
| Transforms tool output | ❌ Hooks can only observe and inject |
| Provides 83% token savings | ❌ That would require output transformation |

### What This System DOES Do

| Capability | Value |
|------------|-------|
| Post-compaction recovery | ✅ Retrieve exact content after compaction |
| Semantic indexing | ✅ Quick reference to key patterns |
| Exact retrieval | ✅ Unlike lossy summarization |
| Session-isolated storage | ✅ No cross-session pollution |

---

## Testing

Run the test suite:

```bash
node .claude/hooks/tests/test-swap-engine.cjs
```

**Test Coverage:** 50 tests covering all core functions (including deepMerge, locking)

---

## Related Documentation

- [README.md](./README.md) - Hooks overview with session lifecycle
- [architecture.md](./architecture.md) - Hook system architecture
- [../hooks-reference.md](../hooks-reference.md) - Execution order by event, state file reference
- [../configuration/README.md](../configuration/README.md) - Settings configuration

---

*Source: `.claude/hooks/lib/swap-engine.cjs` (418 lines) | Tests: 50 passing*
