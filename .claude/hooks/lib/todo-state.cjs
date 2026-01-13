#!/usr/bin/env node
/**
 * Todo State Management Library
 *
 * Tracks TodoWrite usage during session to enable:
 * - Pre-command validation (require todos before implementation)
 * - Context preservation (persist todos across compaction)
 * - Subagent inheritance (pass todos to child agents)
 *
 * State File: .claude/.todo-state.json
 */

const path = require('path');
const { createStateManager } = require('./state-manager.cjs');

// State file location (alongside workflow state)
const STATE_FILE = path.join(process.cwd(), '.claude', '.todo-state.json');

// Default state
const DEFAULT_STATE = {
  hasTodos: false,
  lastUpdated: null,
  taskCount: 0,
  pendingCount: 0,
  completedCount: 0,
  inProgressCount: 0,
  lastTodos: [],
  bypassCount: 0
};

// Create state manager instance
const manager = createStateManager(STATE_FILE, DEFAULT_STATE, { mergeOnSet: true });

/**
 * Load current todo state
 * @returns {Object} Todo state object
 */
function getTodoState() {
  return manager.get();
}

/**
 * Save todo state
 * @param {Object} state - Partial state to merge
 */
function setTodoState(state) {
  manager.set(state);
}

/**
 * Clear todo state (on session end/clear)
 */
function clearTodoState() {
  manager.clear();
}

/**
 * Track a bypass occurrence
 */
function recordBypass() {
  const state = getTodoState();
  setTodoState({
    bypassCount: (state.bypassCount || 0) + 1,
    lastBypass: new Date().toISOString()
  });
}

/**
 * Export todos for checkpoint preservation
 * @returns {Object|null} Todos export object or null if no todos
 */
function exportTodosForCheckpoint() {
  const state = getTodoState();
  if (!state.hasTodos) return null;

  return {
    todos: state.lastTodos || [],
    taskCount: state.taskCount,
    pendingCount: state.pendingCount,
    completedCount: state.completedCount,
    inProgressCount: state.inProgressCount,
    timestamp: state.lastUpdated
  };
}

/**
 * Restore todos from checkpoint
 * @param {Object} checkpoint - Checkpoint data with todos
 */
function restoreTodosFromCheckpoint(checkpoint) {
  if (!checkpoint || !checkpoint.todos || checkpoint.todos.length === 0) {
    return false;
  }

  setTodoState({
    hasTodos: true,
    taskCount: checkpoint.taskCount || checkpoint.todos.length,
    pendingCount: checkpoint.pendingCount || 0,
    completedCount: checkpoint.completedCount || 0,
    inProgressCount: checkpoint.inProgressCount || 0,
    lastTodos: checkpoint.todos,
    restoredFrom: checkpoint.timestamp || 'unknown'
  });

  return true;
}

/**
 * Get todo state for subagent inheritance
 * @returns {Object} Minimal state for subagent context
 */
function getTodoStateForSubagent() {
  const state = getTodoState();
  if (!state.hasTodos) return null;

  return {
    hasTodos: state.hasTodos,
    taskCount: state.taskCount,
    pendingCount: state.pendingCount,
    summaryTodos: (state.lastTodos || [])
      .slice(0, 3)
      .map(t => `[${t.status === 'completed' ? 'x' : t.status === 'in_progress' ? '~' : ' '}] ${t.content}`)
  };
}

module.exports = {
  getTodoState,
  setTodoState,
  clearTodoState,
  recordBypass,
  exportTodosForCheckpoint,
  restoreTodosFromCheckpoint,
  getTodoStateForSubagent,
  STATE_FILE
};
