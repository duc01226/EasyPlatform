#!/usr/bin/env node
/**
 * Compact Suggestion Hook (PostToolUse)
 *
 * Proactively suggests `/compact` command after heavy tool usage (~50 calls)
 * to help manage context window before it becomes critical.
 *
 * Tracked Tools: Bash, Read, Grep, Glob, Skill, Edit, Write
 *
 * Behavior:
 * - Counts heavy tool operations per session
 * - After 50 tool calls: shows one-time suggestion
 * - Resets on session start or after /compact detection
 *
 * Exit Codes:
 *   0 - Success (non-blocking)
 */

const {
  recordToolCall,
  resetCompactState,
  getProgress,
  COMPACT_THRESHOLD
} = require('./lib/compact-state.cjs');

// Tools that heavily consume context
const TRACKED_TOOLS = new Set([
  'Bash',
  'Read',
  'Grep',
  'Glob',
  'Skill',
  'Edit',
  'Write',
  'MultiEdit',
  'NotebookEdit',
  'WebFetch',
  'WebSearch'
]);

/**
 * Read stdin asynchronously with timeout to prevent hanging
 * @returns {Promise<Object|null>} Parsed JSON payload or null
 */
async function readStdin() {
  return new Promise((resolve) => {
    let data = '';

    // Handle no stdin (TTY mode)
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
 * Output compact suggestion to LLM context
 * @param {number} count - Number of tool calls
 */
function outputSuggestion(count) {
  const progress = getProgress();

  console.log(`
## Context Window Checkpoint

You've made **${count} tool calls** in this session.

### Recommendation

Consider running \`/compact\` to:
- Summarize the conversation so far
- Free up context window for more complex tasks
- Preserve important insights before context limit

### Current Progress
- Tool calls: ${progress.current}/${progress.threshold}
- Session active since: ${new Date().toLocaleTimeString()}

### When to compact:
- After completing a significant task or feature
- Before starting a new major investigation
- When you notice the context is getting long

*This is a one-time suggestion. Continue working if you're mid-task.*
`);
}

/**
 * Check if tool output mentions /compact was run
 * @param {Object} payload - Hook payload
 * @returns {boolean} True if compact was detected
 */
function detectCompactRun(payload) {
  // Check if Skill tool was used with 'compact' argument
  if (payload.tool_name === 'Skill') {
    const skillName = payload.tool_input?.skill || '';
    if (skillName.toLowerCase().includes('compact')) {
      return true;
    }
  }

  // Check tool output for compact indicators
  const output = payload.tool_output || '';
  if (typeof output === 'string' && output.toLowerCase().includes('context compacted')) {
    return true;
  }

  return false;
}

async function main() {
  const payload = await readStdin();
  if (!payload) process.exit(0);

  const toolName = payload.tool_name;

  // ─────────────────────────────────────────────────────────────────────────
  // Detect /compact execution and reset state
  // ─────────────────────────────────────────────────────────────────────────
  if (detectCompactRun(payload)) {
    resetCompactState();
    if (process.env.CK_DEBUG) {
      console.error('[compact-suggestion] Reset: /compact detected');
    }
    process.exit(0);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Track heavy tool usage
  // ─────────────────────────────────────────────────────────────────────────
  if (TRACKED_TOOLS.has(toolName)) {
    const result = recordToolCall();

    if (process.env.CK_DEBUG) {
      console.error(`[compact-suggestion] Tool: ${toolName}, Count: ${result.toolCallCount}/${result.threshold}`);
    }

    if (result.shouldSuggest) {
      outputSuggestion(result.toolCallCount);
    }

    process.exit(0);
  }

  // Other tools: ignore
  process.exit(0);
}

main().then(() => process.exit(0)).catch((error) => {
  // Fail-open: don't block operations
  if (process.env.CK_DEBUG) {
    console.error(`[compact-suggestion] Error: ${error.message}`);
  }
  process.exit(0);
});
