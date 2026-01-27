#!/usr/bin/env node
/**
 * Todo Tracker Hook (PostToolUse)
 *
 * Tracks task tool usage to update todo state file.
 * This enables pre-command validation and context preservation.
 *
 * Triggered by: PostToolUse event for TodoWrite, TaskCreate, TaskUpdate tools
 *
 * Exit Codes:
 *   0 - Success (non-blocking)
 */

const { getTodoState, setTodoState } = require('./lib/todo-state.cjs');

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
 * Handle TodoWrite tool (legacy batch format)
 * @param {Object} input - tool_input with todos array
 */
function handleTodoWrite(input) {
  const todos = input?.todos || [];
  const pending = todos.filter(t => t.status === 'pending').length;
  const completed = todos.filter(t => t.status === 'completed').length;
  const inProgress = todos.filter(t => t.status === 'in_progress').length;

  setTodoState({
    hasTodos: todos.length > 0,
    taskCount: todos.length,
    pendingCount: pending,
    completedCount: completed,
    inProgressCount: inProgress,
    lastTodos: todos.slice(0, 10).map(t => ({
      content: t.content,
      status: t.status,
      activeForm: t.activeForm
    }))
  });

  if (process.env.CK_DEBUG) {
    console.error(`[todo-tracker] TodoWrite: ${todos.length} todos (${pending} pending, ${inProgress} in-progress, ${completed} completed)`);
  }
}

/**
 * Handle TaskCreate tool (single task creation)
 * @param {Object} input - tool_input with subject, description, activeForm
 */
function handleTaskCreate(input) {
  const state = getTodoState();
  const newCount = (state.taskCount || 0) + 1;
  const newPending = (state.pendingCount || 0) + 1;

  // Append to lastTodos (cap at 20 entries)
  const lastTodos = (state.lastTodos || []).slice(0, 19);
  lastTodos.push({
    content: input?.subject || 'Untitled task',
    status: 'pending',
    activeForm: input?.activeForm || null
  });

  setTodoState({
    hasTodos: true,
    taskCount: newCount,
    pendingCount: newPending,
    completedCount: state.completedCount || 0,
    inProgressCount: state.inProgressCount || 0,
    lastTodos
  });

  if (process.env.CK_DEBUG) {
    console.error(`[todo-tracker] TaskCreate: "${input?.subject}" (total: ${newCount})`);
  }
}

/**
 * Handle TaskUpdate tool (status changes)
 * @param {Object} input - tool_input with taskId, status, etc.
 */
function handleTaskUpdate(input) {
  const state = getTodoState();
  const newStatus = input?.status;

  // Only adjust counts if status is being changed
  if (newStatus && state.hasTodos) {
    // Approximate: decrement one from in_progress (most likely source) and increment target
    // This is imprecise but sufficient for enforcement (hasTodos + taskCount are the critical checks)
    const update = { hasTodos: true };

    if (newStatus === 'completed') {
      update.completedCount = (state.completedCount || 0) + 1;
      // Decrement in_progress if positive, else decrement pending
      if ((state.inProgressCount || 0) > 0) {
        update.inProgressCount = state.inProgressCount - 1;
      } else if ((state.pendingCount || 0) > 0) {
        update.pendingCount = state.pendingCount - 1;
      }
    } else if (newStatus === 'in_progress') {
      update.inProgressCount = (state.inProgressCount || 0) + 1;
      if ((state.pendingCount || 0) > 0) {
        update.pendingCount = state.pendingCount - 1;
      }
    } else if (newStatus === 'deleted') {
      const newCount = Math.max(0, (state.taskCount || 1) - 1);
      update.taskCount = newCount;
      update.hasTodos = newCount > 0;
      // Decrement from most likely source
      if ((state.pendingCount || 0) > 0) {
        update.pendingCount = state.pendingCount - 1;
      } else if ((state.inProgressCount || 0) > 0) {
        update.inProgressCount = state.inProgressCount - 1;
      }
    }

    // Update lastTodos entry if found by matching
    if (input?.taskId && input?.subject) {
      const lastTodos = (state.lastTodos || []).map(t => {
        if (t.content === input.subject) {
          return { ...t, status: newStatus };
        }
        return t;
      });
      update.lastTodos = lastTodos;
    }

    setTodoState(update);
  }

  if (process.env.CK_DEBUG) {
    console.error(`[todo-tracker] TaskUpdate: task=${input?.taskId} status=${newStatus}`);
  }
}

async function main() {
  const payload = await readStdin();
  if (!payload) process.exit(0);

  const toolName = payload.tool_name;
  const input = payload.tool_input;

  switch (toolName) {
    case 'TodoWrite':
      handleTodoWrite(input);
      break;
    case 'TaskCreate':
      handleTaskCreate(input);
      break;
    case 'TaskUpdate':
      handleTaskUpdate(input);
      break;
    default:
      // Unknown tool, ignore
      break;
  }

  process.exit(0);
}

main().then(() => process.exit(0)).catch((error) => {
  // Fail-open: don't block on errors
  if (process.env.CK_DEBUG) {
    console.error(`[todo-tracker] Error: ${error.message}`);
  }
  process.exit(0);
});
