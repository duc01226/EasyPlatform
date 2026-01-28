#!/usr/bin/env node
/**
 * Edit Complexity Tracker Hook (PostToolUse)
 *
 * Enhanced replacement for edit-count-tracker.cjs with two-tier warnings:
 * - Soft warning at 3+ edits without TodoWrite
 * - Strong warning at 6+ edits without TodoWrite (with TodoWrite template)
 *
 * Handles MultiEdit by extracting all file paths from the tool input.
 * Resets count when TodoWrite is called.
 *
 * Exit Codes:
 *   0 - Success (non-blocking)
 */

'use strict';

const {
  recordEdit,
  recordWrite,
  resetEditState,
  getEditState,
  setEditState,
  EDIT_THRESHOLD
} = require('./lib/edit-state.cjs');
const { getTodoState } = require('./lib/todo-state.cjs');

// Strong warning threshold (second tier)
const STRONG_THRESHOLD = 6;

/**
 * Read stdin asynchronously with timeout to prevent hanging
 * @returns {Promise<Object|null>} Parsed JSON payload or null
 */
async function readStdin() {
  return new Promise((resolve) => {
    let data = '';

    if (process.stdin.isTTY) {
      resolve(null);
      return;
    }

    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => { data += chunk; });
    process.stdin.on('end', () => {
      if (!data.trim()) {
        resolve(null);
        return;
      }
      try {
        resolve(JSON.parse(data));
      } catch {
        resolve(null);
      }
    });
    process.stdin.on('error', () => resolve(null));

    // Timeout after 500ms to prevent hanging
    setTimeout(() => resolve(null), 500);
  });
}

/**
 * Check if warning should be shown (no active todos)
 * @returns {boolean} True if warning should be shown
 */
function shouldShowWarning() {
  const todoState = getTodoState();
  return !(todoState.hasTodos && todoState.taskCount > 0);
}

/**
 * Output soft warning (3+ edits)
 * @param {number} count - Number of file operations
 * @param {string[]} files - List of edited files
 */
function outputSoftWarning(count, files) {
  const fileList = (files || []).slice(-5).map(f => `  - ${f}`).join('\n');

  console.log(`
## Multi-File Operation Detected

You've modified **${count} files** without todo tracking:

${fileList}

### Recommendation

For multi-file operations, use **TodoWrite** to:
- Track progress across files
- Preserve context if session compacts
- Show user the scope of changes

*This is a soft reminder, not a blocker.*
`);
}

/**
 * Output strong warning (6+ edits)
 * @param {number} count - Number of file operations
 * @param {string[]} files - List of edited files
 */
function outputStrongWarning(count, files) {
  const fileList = (files || []).slice(-8).map(f => `  - ${f}`).join('\n');

  console.log(`
## Large Multi-File Operation Without Tracking

You've modified **${count} files** without any todo tracking. This makes it hard to:
- Resume after context compaction
- Show the user what changed
- Track remaining work

${fileList}

### Action Required

Add todo tracking now:

\`\`\`
Use TodoWrite to create a task describing the current multi-file operation
\`\`\`

*This is a strong reminder. Please add tracking to preserve workflow context.*
`);
}

/**
 * Extract all file paths from MultiEdit tool input
 * @param {Object} toolInput - MultiEdit tool input
 * @returns {string[]} Array of file paths
 */
function extractMultiEditFiles(toolInput) {
  const files = [];
  // MultiEdit has an edits array with file_path on each entry
  if (Array.isArray(toolInput.edits)) {
    for (const edit of toolInput.edits) {
      const fp = edit.file_path || edit.filePath;
      if (fp && !files.includes(fp)) {
        files.push(fp);
      }
    }
  }
  // Fallback: single file_path
  if (files.length === 0) {
    const fp = toolInput.file_path || toolInput.filePath;
    if (fp) files.push(fp);
  }
  return files;
}

async function main() {
  const payload = await readStdin();
  if (!payload) process.exit(0);

  const toolName = payload.tool_name;
  const toolInput = payload.tool_input || {};

  // Handle TodoWrite: Reset edit count
  if (toolName === 'TodoWrite') {
    resetEditState();
    if (process.env.CK_DEBUG) {
      console.error('[edit-complexity-tracker] Reset: TodoWrite detected');
    }
    process.exit(0);
  }

  // Track Edit operations
  if (toolName === 'Edit') {
    const filePath = toolInput.file_path || toolInput.filePath || 'unknown';
    const canWarn = shouldShowWarning();
    const result = recordEdit(filePath, canWarn);

    if (canWarn) {
      emitWarning(result.editCount, result.editedFiles);
    }

    process.exit(0);
  }

  // Track MultiEdit operations (extract each file)
  if (toolName === 'MultiEdit') {
    const files = extractMultiEditFiles(toolInput);
    const canWarn = shouldShowWarning();

    let lastResult;
    for (const filePath of files) {
      lastResult = recordEdit(filePath, canWarn);
    }

    if (lastResult && canWarn) {
      emitWarning(lastResult.editCount, lastResult.editedFiles);
    }

    process.exit(0);
  }

  // Track Write operations
  if (toolName === 'Write') {
    const filePath = toolInput.file_path || toolInput.filePath || 'unknown';
    const canWarn = shouldShowWarning();
    const result = recordWrite(filePath, canWarn);

    if (canWarn) {
      emitWarning(result.totalCount, result.editedFiles);
    }

    process.exit(0);
  }

  // Other tools: ignore
  process.exit(0);
}

/**
 * Emit appropriate warning based on edit count
 * @param {number} count - Total edit count
 * @param {string[]} files - Edited files list
 */
function emitWarning(count, files) {
  const state = getEditState();

  // Strong warning at 6+ (only once)
  if (count >= STRONG_THRESHOLD && !state.strongWarningShown) {
    setEditState({ strongWarningShown: true });
    outputStrongWarning(count, files);
    return;
  }

  // Soft warning at 3+ (only once, and only if strong not yet shown)
  if (count >= EDIT_THRESHOLD && !state.warningShown && !state.strongWarningShown) {
    // warningShown already set by recordEdit/recordWrite when canWarn=true
    outputSoftWarning(count, files);
  }
}

main().then(() => process.exit(0)).catch((error) => {
  if (process.env.CK_DEBUG) {
    console.error(`[edit-complexity-tracker] Error: ${error.message}`);
  }
  process.exit(0);
});
