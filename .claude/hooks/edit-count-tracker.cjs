#!/usr/bin/env node
/**
 * Edit Count Tracker Hook (PostToolUse)
 *
 * Tracks Edit/Write operations and shows soft warning when multiple
 * file changes occur without TodoWrite tracking.
 *
 * Purpose: Close the gap where multi-file operations bypass workflow
 * detection and skill enforcement.
 *
 * Behavior:
 * - Counts Edit/Write operations per session
 * - After 3+ edits without TodoWrite: shows reminder (once)
 * - Resets count when TodoWrite is called
 *
 * Exit Codes:
 *   0 - Success (non-blocking)
 */

const fs = require('fs');
const {
  recordEdit,
  recordWrite,
  resetEditState
} = require('./lib/edit-state.cjs');
const { getTodoState } = require('./lib/todo-state.cjs');

/**
 * Output soft warning to LLM context
 * @param {number} count - Number of file operations
 * @param {string[]} files - List of edited files
 */
function outputWarning(count, files) {
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

### To add tracking now:
\`\`\`
Use TodoWrite to list the files/tasks being modified
\`\`\`

### To suppress this reminder:
Create any todo item, even a simple "Batch file updates" task.

*This is a soft reminder, not a blocker.*
`);
}

/**
 * Check if warning should be shown (todos don't exist)
 * @returns {boolean} True if warning should be shown
 */
function shouldShowWarning() {
  const todoState = getTodoState();
  return !(todoState.hasTodos && todoState.taskCount > 0);
}

try {
  const stdin = fs.readFileSync(0, 'utf-8').trim();
  if (!stdin) process.exit(0);

  const payload = JSON.parse(stdin);
  const toolName = payload.tool_name;
  const toolInput = payload.tool_input || {};

  // ─────────────────────────────────────────────────────────────────────────
  // Handle TodoWrite: Reset edit count (user is now tracking)
  // ─────────────────────────────────────────────────────────────────────────
  if (toolName === 'TodoWrite') {
    resetEditState();
    if (process.env.CK_DEBUG) {
      console.error('[edit-count-tracker] Reset: TodoWrite detected');
    }
    process.exit(0);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Track Edit operations
  // ─────────────────────────────────────────────────────────────────────────
  if (toolName === 'Edit' || toolName === 'MultiEdit') {
    const filePath = toolInput.file_path || toolInput.filePath || 'unknown';

    // Check todos BEFORE recording (to avoid setting warningShown if todos exist)
    const canWarn = shouldShowWarning();
    const result = recordEdit(filePath, canWarn);

    if (result.shouldWarn && canWarn) {
      outputWarning(result.editCount, result.editedFiles);
    }

    process.exit(0);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Track Write operations (new files)
  // ─────────────────────────────────────────────────────────────────────────
  if (toolName === 'Write') {
    const filePath = toolInput.file_path || toolInput.filePath || 'unknown';

    // Check todos BEFORE recording (to avoid setting warningShown if todos exist)
    const canWarn = shouldShowWarning();
    const result = recordWrite(filePath, canWarn);

    if (result.shouldWarn && canWarn) {
      outputWarning(result.totalCount, result.editedFiles);
    }

    process.exit(0);
  }

  // Other tools: ignore
  process.exit(0);

} catch (error) {
  // Fail-open: don't block operations
  if (process.env.CK_DEBUG) {
    console.error(`[edit-count-tracker] Error: ${error.message}`);
  }
  process.exit(0);
}
