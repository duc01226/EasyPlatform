# File Locking for Shared State

## Problem Statement

When multiple processes/hooks may access the same file simultaneously:
- Concurrent reads during write cause partial/corrupt data
- Concurrent writes cause data loss (last write wins)
- No coordination leads to race conditions

**Real Example:** Multiple hooks accessing the same JSON state file. Without locking, simultaneous updates corrupt data.

## Solution: Advisory File Locking

Use a `.lock` file pattern with timeout and stale lock detection.

### Implementation Pattern

```javascript
const fs = require('fs');

const LOCK_FILE = 'state.lock';
const LOCK_TIMEOUT_MS = 5000;
const LOCK_RETRY_DELAY_MS = 50;

/**
 * Check if a process is still alive
 */
function isProcessAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * Synchronous sleep (for retry loops)
 */
function sleepSync(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) { /* busy wait */ }
}

/**
 * Acquire file lock with timeout
 */
function acquireLock() {
  const deadline = Date.now() + LOCK_TIMEOUT_MS;

  while (Date.now() < deadline) {
    try {
      // O_EXCL fails if file exists - atomic lock creation
      fs.writeFileSync(LOCK_FILE, process.pid.toString(), { flag: 'wx' });
      return true;
    } catch (err) {
      if (err.code === 'EEXIST') {
        // Check if lock is stale (owning process dead)
        try {
          const pid = parseInt(fs.readFileSync(LOCK_FILE, 'utf8'), 10);
          if (!isProcessAlive(pid)) {
            fs.unlinkSync(LOCK_FILE);
            continue; // Retry immediately
          }
        } catch { /* ignore read errors */ }
        sleepSync(LOCK_RETRY_DELAY_MS);
      } else {
        throw err;
      }
    }
  }
  return false;
}

/**
 * Release file lock
 */
function releaseLock() {
  try {
    fs.unlinkSync(LOCK_FILE);
  } catch { /* ignore if already released */ }
}

/**
 * Execute function with file lock
 */
function withLock(fn) {
  if (!acquireLock()) {
    console.error('[Lock] Timeout - skipping operation');
    return null;
  }
  try {
    return fn();
  } finally {
    releaseLock();
  }
}
```

### Usage

```javascript
// Wrap read-modify-write operations
function updateState(updater) {
  return withLock(() => {
    const state = loadState();
    const newState = updater(state);
    saveState(newState);
    return newState;
  });
}

// Example: Increment counter safely
updateState(state => ({
  ...state,
  counter: (state.counter || 0) + 1
}));
```

## Key Principles

1. **Always acquire lock BEFORE read** - Not just before write
2. **Handle stale locks** - Dead process detection prevents permanent lockout
3. **Use timeout** - Don't wait forever
4. **Wrap entire read-modify-write** - Not just the write
5. **Release in finally block** - Ensure release even on error

## Anti-Patterns

```javascript
// WRONG: Lock only protects write
const state = loadState(); // Race: another process can modify between load and save
acquireLock();
saveState(state);
releaseLock();

// WRONG: No stale lock detection
while (fs.existsSync(LOCK_FILE)) {
  sleep(50); // Can wait forever if process crashed
}

// WRONG: No timeout
while (!tryLock()) {
  sleep(50); // Can block indefinitely
}
```

## Windows Considerations

Windows file locking differs from POSIX:
- `fs.renameSync` may fail if target exists
- Use backup pattern: write .tmp → rename original to .bak → rename .tmp to final
- Check for leftover .tmp/.bak files on startup

## Verification

Test concurrent access:
```bash
# Run multiple instances simultaneously
for i in {1..10}; do
  node hook.cjs &
done
wait

# Verify no data corruption
node -e "console.log(JSON.parse(require('fs').readFileSync('state.json')))"
```
