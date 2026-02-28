#!/usr/bin/env node
'use strict';

/**
 * Todo Tracker - PostToolUse Hook for TaskCreate and TaskUpdate
 *
 * Tracks when TaskCreate or TaskUpdate is called and updates the todo state file.
 * This enables edit-enforcement.cjs and skill-enforcement.cjs to check
 * if todos exist before allowing implementation.
 *
 * Triggers on: PostToolUse → TaskCreate, TaskUpdate
 *
 * Exit Codes:
 *   0 - Success (non-blocking)
 *
 * @module todo-tracker
 */

const fs = require('fs');
const { getTodoState, setTodoState, markTodosCalled } = require('./lib/todo-state.cjs');
const { resetEditCount } = require('./lib/edit-state.cjs');

/**
 * Count todos by status
 * @param {Array} todos - Todo items
 * @returns {Object} Counts by status
 */
function countTodos(todos) {
  if (!Array.isArray(todos)) {
    return { pending: 0, completed: 0, inProgress: 0 };
  }

  return todos.reduce((counts, todo) => {
    switch (todo.status) {
      case 'pending':
        counts.pending++;
        break;
      case 'completed':
        counts.completed++;
        break;
      case 'in_progress':
        counts.inProgress++;
        break;
    }
    return counts;
  }, { pending: 0, completed: 0, inProgress: 0 });
}

/**
 * Handle TaskUpdate — adjust counts based on status transition.
 * Decrements the "from" bucket and increments the "to" bucket.
 * Since we don't know the previous status, we use a safe heuristic:
 * - completed: decrement pending or inProgress (whichever > 0, prefer inProgress)
 * - in_progress: decrement pending (if > 0)
 * - deleted: decrement pending or inProgress
 * - pending: no-op (unlikely transition)
 *
 * @param {string} sessionId
 * @param {string} newStatus - The status being set
 * @param {string} taskId - The task being updated
 */
function handleTaskUpdate(sessionId, newStatus, taskId) {
  const state = getTodoState(sessionId);
  if (!state.hasTodos) return;

  if (newStatus === 'completed' || newStatus === 'deleted') {
    // Task finishing — decrement active count
    if (state.inProgressCount > 0) {
      state.inProgressCount--;
    } else if (state.pendingCount > 0) {
      state.pendingCount--;
    }
    if (newStatus === 'completed') {
      state.completedCount++;
    }
  } else if (newStatus === 'in_progress') {
    // Task starting — move from pending to inProgress
    if (state.pendingCount > 0) {
      state.pendingCount--;
    }
    state.inProgressCount++;
  }

  // Update lastTodos status if task matches
  if (taskId && state.lastTodos) {
    const todo = state.lastTodos.find(t => t.taskId === taskId);
    if (todo) {
      todo.status = newStatus;
    }
  }

  setTodoState(sessionId, state);
}

/**
 * Main hook execution
 */
function main() {
  try {
    // Read PostToolUse payload from stdin
    const stdin = fs.readFileSync(0, 'utf-8').trim();
    if (!stdin) process.exit(0);

    const payload = JSON.parse(stdin);

    const toolName = payload.tool_name;
    if (toolName !== 'TodoWrite' && toolName !== 'TaskCreate' && toolName !== 'TaskUpdate') {
      process.exit(0);
    }

    // Get session ID (CK_SESSION_ID is the standard for Claude Kit hooks)
    const sessionId = process.env.CLAUDE_SESSION_ID || process.env.CK_SESSION_ID || 'unknown';

    if (toolName === 'TaskUpdate') {
      // TaskUpdate — adjust counts based on new status
      const newStatus = payload.tool_input?.status;
      const taskId = payload.tool_input?.taskId;
      if (newStatus) {
        handleTaskUpdate(sessionId, newStatus, taskId);
      }
    } else if (toolName === 'TaskCreate') {
      // TaskCreate creates one task at a time — increment pending count
      const state = getTodoState(sessionId);
      const subject = payload.tool_input?.subject || '';
      const activeForm = payload.tool_input?.activeForm || '';
      // tool_result is a string like "Task #8 created successfully: ..."
      const resultStr = typeof payload.tool_result === 'string' ? payload.tool_result : '';
      const idMatch = resultStr.match(/Task #(\d+)/);
      const taskId = idMatch ? idMatch[1] : null;

      state.hasTodos = true;
      state.pendingCount++;

      // Append to lastTodos (keep last 10, non-completed first)
      state.lastTodos = state.lastTodos || [];
      state.lastTodos.push({ content: subject, status: 'pending', activeForm, taskId });
      if (state.lastTodos.length > 10) {
        state.lastTodos = state.lastTodos.slice(-10);
      }

      setTodoState(sessionId, state);

      // Reset edit count since user is now tracking with todos
      resetEditCount(sessionId);
    } else {
      // TodoWrite — batch todo creation (legacy)
      const todos = payload.tool_input?.todos || [];
      const counts = countTodos(todos);
      markTodosCalled(sessionId, counts, todos);
      resetEditCount(sessionId);
    }

    if (process.env.CK_DEBUG) {
      const state = getTodoState(sessionId);
      console.log(`[todo-tracker] ${toolName}: pending=${state.pendingCount}, inProgress=${state.inProgressCount}, completed=${state.completedCount}`);
    }

    process.exit(0);

  } catch (error) {
    if (process.env.CK_DEBUG) {
      console.error(`[todo-tracker] Error: ${error.message}`);
    }
    process.exit(0);
  }
}

main();
