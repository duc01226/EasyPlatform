#!/usr/bin/env node
'use strict';

/**
 * Todo State Management - Persistent todo tracking for workflow enforcement
 *
 * Provides functions to track whether TaskCreate has been called in the current session,
 * enabling enforcement of workflow compliance (no implementation without todo tracking).
 *
 * Storage: /tmp/ck/todo-{sessionId}.json
 *
 * Used by:
 * - edit-enforcement.cjs (PreToolUse → Edit|Write|MultiEdit|NotebookEdit)
 * - skill-enforcement.cjs (PreToolUse → Skill)
 * - todo-tracker.cjs (PostToolUse → TaskCreate)
 *
 * @module todo-state
 */

const fs = require('fs');
const path = require('path');
const { CK_TMP_DIR, ensureDir } = require('./ck-paths.cjs');

// Todo state directory
const TODO_DIR = path.join(CK_TMP_DIR, 'todo');

// State file path pattern
const STATE_FILE_PREFIX = 'todo-state-';

/**
 * Get todo state file path for a session
 * @param {string} sessionId - Session identifier
 * @returns {string} Path to todo state file
 */
function getTodoStatePath(sessionId) {
  return path.join(TODO_DIR, `${STATE_FILE_PREFIX}${sessionId}.json`);
}

/**
 * Default todo state schema
 * @returns {Object} Default empty todo state
 */
function getDefaultState() {
  return {
    hasTodos: false,           // Whether TaskCreate has been called
    pendingCount: 0,           // Count of pending todos
    completedCount: 0,         // Count of completed todos
    inProgressCount: 0,        // Count of in-progress todos
    lastTodos: [],             // Last 10 todos for recovery (actual content)
    lastUpdated: null,         // ISO timestamp of last update
    bypasses: [],              // Record of enforcement bypasses
    metadata: {}               // Additional data
  };
}

/**
 * Load todo state from file
 * @param {string} sessionId - Session identifier
 * @returns {Object} Todo state or default
 */
function getTodoState(sessionId) {
  if (!sessionId) return getDefaultState();

  const statePath = getTodoStatePath(sessionId);
  try {
    if (!fs.existsSync(statePath)) return getDefaultState();
    const data = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    return { ...getDefaultState(), ...data };
  } catch (e) {
    return getDefaultState();
  }
}

/**
 * Save todo state atomically
 * Uses write-to-temp-then-rename pattern to prevent corruption
 *
 * @param {string} sessionId - Session identifier
 * @param {Object} state - Todo state to save
 * @returns {boolean} Success status
 */
function setTodoState(sessionId, state) {
  if (!sessionId) return false;

  ensureDir(TODO_DIR);
  const statePath = getTodoStatePath(sessionId);
  const tmpFile = statePath + '.' + Math.random().toString(36).slice(2);

  try {
    const stateToSave = {
      ...state,
      lastUpdated: new Date().toISOString()
    };
    fs.writeFileSync(tmpFile, JSON.stringify(stateToSave, null, 2));
    fs.renameSync(tmpFile, statePath);
    return true;
  } catch (e) {
    try { fs.unlinkSync(tmpFile); } catch (_) { /* ignore */ }
    return false;
  }
}

/**
 * Mark that TaskCreate has been called with counts
 * @param {string} sessionId - Session identifier
 * @param {Object} counts - Todo counts {pending, completed, inProgress}
 * @param {Array} todos - Optional: actual todo items for recovery
 * @returns {boolean} Success status
 */
function markTodosCalled(sessionId, counts = {}, todos = null) {
  const state = getTodoState(sessionId);

  state.hasTodos = true;
  state.pendingCount = counts.pending || 0;
  state.completedCount = counts.completed || 0;
  state.inProgressCount = counts.inProgress || 0;

  // Store last 10 todos for recovery (non-completed ones prioritized)
  if (todos && Array.isArray(todos)) {
    const nonCompleted = todos.filter(t => t.status !== 'completed');
    const completed = todos.filter(t => t.status === 'completed');
    state.lastTodos = [...nonCompleted, ...completed].slice(0, 10).map(t => ({
      content: t.content,
      status: t.status,
      activeForm: t.activeForm
    }));
  }

  return setTodoState(sessionId, state);
}

/**
 * Check if TaskCreate has been called
 * @param {string} sessionId - Session identifier
 * @returns {boolean} True if todos exist
 */
function hasTodos(sessionId) {
  const state = getTodoState(sessionId);
  return state.hasTodos;
}

/**
 * Record an enforcement bypass
 * @param {string} sessionId - Session identifier
 * @param {Object} bypass - Bypass details
 * @param {string} bypass.skill - Skill that was allowed
 * @param {string} bypass.reason - Reason for bypass
 * @returns {boolean} Success status
 */
function recordBypass(sessionId, bypass) {
  const state = getTodoState(sessionId);

  state.bypasses.push({
    ...bypass,
    timestamp: new Date().toISOString()
  });

  // Keep only last 20 bypasses
  if (state.bypasses.length > 20) {
    state.bypasses = state.bypasses.slice(-20);
  }

  return setTodoState(sessionId, state);
}

/**
 * Clear todo state for session
 * @param {string} sessionId - Session identifier
 * @returns {boolean} Success status
 */
function clearTodoState(sessionId) {
  if (!sessionId) return false;

  const statePath = getTodoStatePath(sessionId);
  try {
    if (fs.existsSync(statePath)) {
      fs.unlinkSync(statePath);
    }
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Get state for checkpoint preservation
 * Returns state that can be saved/restored across compaction
 * @param {string} sessionId - Session identifier
 * @returns {Object} State for preservation
 */
function getStateForCheckpoint(sessionId) {
  const state = getTodoState(sessionId);
  return {
    hasTodos: state.hasTodos,
    pendingCount: state.pendingCount,
    completedCount: state.completedCount,
    inProgressCount: state.inProgressCount,
    lastTodos: state.lastTodos || []
  };
}

/**
 * Restore state from checkpoint
 * @param {string} sessionId - Session identifier
 * @param {Object} checkpoint - Checkpoint state
 * @returns {boolean} Success status
 */
function restoreFromCheckpoint(sessionId, checkpoint) {
  const state = getTodoState(sessionId);

  state.hasTodos = checkpoint.hasTodos || false;
  state.pendingCount = checkpoint.pendingCount || 0;
  state.completedCount = checkpoint.completedCount || 0;
  state.inProgressCount = checkpoint.inProgressCount || 0;
  state.lastTodos = checkpoint.lastTodos || [];

  return setTodoState(sessionId, state);
}

/**
 * Inherit todo state for subagent
 * Copies parent state to child session
 * @param {string} parentSessionId - Parent session ID
 * @param {string} childSessionId - Child session ID
 * @returns {boolean} Success status
 */
function inheritForSubagent(parentSessionId, childSessionId) {
  const parentState = getTodoState(parentSessionId);

  // Only inherit if parent has todos
  if (!parentState.hasTodos) return false;

  const childState = {
    ...getDefaultState(),
    hasTodos: parentState.hasTodos,
    pendingCount: parentState.pendingCount,
    completedCount: parentState.completedCount,
    inProgressCount: parentState.inProgressCount,
    metadata: {
      inheritedFrom: parentSessionId,
      inheritedAt: new Date().toISOString()
    }
  };

  return setTodoState(childSessionId, childState);
}

/**
 * Get todo state summary for subagent context injection
 * Reads parent session state from env and returns formatted summary
 * @returns {Object|null} Summary with hasTodos, taskCount, pendingCount, summaryTodos
 */
function getTodoStateForSubagent() {
  const sessionId = process.env.CLAUDE_SESSION_ID || process.env.CK_SESSION_ID;
  if (!sessionId) return null;

  const state = getTodoState(sessionId);
  if (!state.hasTodos) return null;

  const taskCount = state.pendingCount + state.completedCount + state.inProgressCount;
  const summaryTodos = (state.lastTodos || [])
    .filter(t => t.status !== 'completed')
    .map(t => {
      const icon = t.status === 'in_progress' ? '[>>]' : '[ ]';
      return `${icon} ${t.content}`;
    });

  return {
    hasTodos: true,
    taskCount,
    pendingCount: state.pendingCount,
    summaryTodos
  };
}

module.exports = {
  // Directory
  TODO_DIR,

  // Path helpers
  getTodoStatePath,
  getDefaultState,

  // State operations
  getTodoState,
  setTodoState,
  markTodosCalled,
  hasTodos,
  clearTodoState,

  // Bypass tracking
  recordBypass,

  // Checkpoint/restore
  getStateForCheckpoint,
  restoreFromCheckpoint,

  // Subagent support
  inheritForSubagent,
  getTodoStateForSubagent
};
