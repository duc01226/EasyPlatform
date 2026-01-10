#!/usr/bin/env node
/**
 * Todo Tracker Hook (PostToolUse)
 *
 * Tracks TodoWrite usage to update todo state file.
 * This enables pre-command validation and context preservation.
 *
 * Triggered by: PostToolUse event for TodoWrite tool
 *
 * Exit Codes:
 *   0 - Success (non-blocking)
 */

const fs = require('fs');
const { setTodoState } = require('./lib/todo-state.cjs');

try {
  // Read stdin
  const stdin = fs.readFileSync(0, 'utf-8').trim();
  if (!stdin) process.exit(0);

  const payload = JSON.parse(stdin);

  // Only process TodoWrite tool
  if (payload.tool_name !== 'TodoWrite') {
    process.exit(0);
  }

  // Extract todos from tool input
  const todos = payload.tool_input?.todos || [];

  // Calculate counts
  const pending = todos.filter(t => t.status === 'pending').length;
  const completed = todos.filter(t => t.status === 'completed').length;
  const inProgress = todos.filter(t => t.status === 'in_progress').length;

  // Update state
  setTodoState({
    hasTodos: todos.length > 0,
    taskCount: todos.length,
    pendingCount: pending,
    completedCount: completed,
    inProgressCount: inProgress,
    // Store recent todos for recovery (limit to prevent bloat)
    lastTodos: todos.slice(0, 10).map(t => ({
      content: t.content,
      status: t.status,
      activeForm: t.activeForm
    }))
  });

  // Log for debugging
  if (process.env.CK_DEBUG) {
    console.error(`[todo-tracker] Updated: ${todos.length} todos (${pending} pending, ${inProgress} in-progress, ${completed} completed)`);
  }

  process.exit(0);
} catch (error) {
  // Fail-open: don't block on errors
  if (process.env.CK_DEBUG) {
    console.error(`[todo-tracker] Error: ${error.message}`);
  }
  process.exit(0);
}
