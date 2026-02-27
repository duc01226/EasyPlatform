# Atomic Writes for Data Persistence

## Problem Statement

Direct file writes are not atomic:
- Process crash mid-write leaves partial/corrupt file
- Power loss during write causes data loss
- `writeFileSync()` provides no atomicity guarantees

**Real Example:** JSON state file corruption when process crashed during write, leaving truncated JSON that couldn't be parsed on next load.

## Solution: Temp File + Rename Pattern

Write to temporary file first, then rename to final destination. `rename()` is atomic on POSIX systems.

### POSIX Implementation

```javascript
const fs = require('fs');

/**
 * Atomic JSON write - writes to temp file then renames
 */
function atomicWriteJSON(filePath, data) {
  const tmpPath = filePath + '.tmp';
  const content = JSON.stringify(data, null, 2);

  // Write to temp file first
  fs.writeFileSync(tmpPath, content, 'utf8');

  // Atomic rename to final path
  fs.renameSync(tmpPath, filePath);
}
```

### Windows-Safe Implementation

Windows `rename` may fail if target exists. Use backup pattern:

```javascript
const fs = require('fs');

/**
 * Atomic JSON write - Windows safe
 */
function atomicWriteJSON(filePath, data) {
  const tmpPath = filePath + '.tmp';
  const bakPath = filePath + '.bak';
  const content = JSON.stringify(data, null, 2);

  // Step 1: Write to temp file
  fs.writeFileSync(tmpPath, content, 'utf8');

  // Step 2: Backup original if exists
  try {
    if (fs.existsSync(filePath)) {
      fs.renameSync(filePath, bakPath);
    }
  } catch { /* no original file */ }

  // Step 3: Rename temp to final (atomic)
  fs.renameSync(tmpPath, filePath);

  // Step 4: Clean up backup
  try {
    fs.unlinkSync(bakPath);
  } catch { /* no backup or cleanup failed */ }
}
```

### With File Locking

For shared state, combine with file locking:

```javascript
function saveState(state) {
  return withLock(() => {
    atomicWriteJSON(STATE_FILE, state);
  });
}
```

## Key Principles

1. **Never write directly to final path** - Always use temp file
2. **Rename is atomic** - One operation, no partial states
3. **Handle Windows differences** - Backup pattern for cross-platform
4. **Clean up on startup** - Remove leftover .tmp/.bak files
5. **Validate before write** - Ensure data is valid JSON

## Recovery Pattern

On startup, check for incomplete writes:

```javascript
function recoverFromCrash(filePath) {
  const tmpPath = filePath + '.tmp';
  const bakPath = filePath + '.bak';

  // Case 1: Temp file exists but final doesn't
  // (crashed after temp write, before rename)
  if (fs.existsSync(tmpPath) && !fs.existsSync(filePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(tmpPath, 'utf8'));
      fs.renameSync(tmpPath, filePath);
      console.log('Recovered from temp file');
    } catch {
      fs.unlinkSync(tmpPath); // Corrupt temp, discard
    }
  }

  // Case 2: Backup exists but final doesn't
  // (crashed during Windows rename sequence)
  if (fs.existsSync(bakPath) && !fs.existsSync(filePath)) {
    fs.renameSync(bakPath, filePath);
    console.log('Recovered from backup');
  }

  // Case 3: Both temp and final exist - temp is stale
  if (fs.existsSync(tmpPath) && fs.existsSync(filePath)) {
    fs.unlinkSync(tmpPath);
  }

  // Case 4: Both backup and final exist - backup is stale
  if (fs.existsSync(bakPath) && fs.existsSync(filePath)) {
    fs.unlinkSync(bakPath);
  }
}
```

## Anti-Patterns

```javascript
// WRONG: Direct write - not atomic
fs.writeFileSync(filePath, JSON.stringify(data));

// WRONG: No error handling on temp write
const tmp = filePath + '.tmp';
fs.writeFileSync(tmp, data); // Could fail
fs.renameSync(tmp, filePath); // Leaves corrupt .tmp

// WRONG: Using copy instead of rename
fs.copyFileSync(tmpPath, filePath); // Not atomic!
fs.unlinkSync(tmpPath);
```

## Verification

Test crash resilience:
```javascript
// Simulate crash during write
function testCrashResilience() {
  const testFile = 'test-state.json';

  // Write initial state
  atomicWriteJSON(testFile, { count: 1 });

  // Simulate crash: create .tmp but don't complete rename
  fs.writeFileSync(testFile + '.tmp', JSON.stringify({ count: 2 }));

  // Recovery should restore from backup or use original
  recoverFromCrash(testFile);

  const state = JSON.parse(fs.readFileSync(testFile, 'utf8'));
  console.log('Recovered state:', state);
}
```

## Performance Note

Atomic writes have slight overhead (extra I/O for rename). For high-frequency writes:
- Batch updates before persisting
- Use write-ahead log for critical data
- Consider SQLite for structured data (has built-in atomicity)
