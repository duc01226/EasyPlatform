#!/usr/bin/env node
/**
 * Edit State Management Library
 *
 * Tracks Edit/Write tool usage within a session to detect multi-file
 * operations that should have todo tracking.
 *
 * State File: .claude/.edit-state.json
 * Reset: On TodoWrite call or session clear
 */

const path = require('path');
const { createStateManager } = require('./state-manager.cjs');

const STATE_FILE = path.join(process.cwd(), '.claude', '.edit-state.json');

// Threshold for warning (edits without TodoWrite)
const EDIT_THRESHOLD = 3;

// Default state
const DEFAULT_STATE = {
  editCount: 0,
  writeCount: 0,
  editedFiles: [],
  lastReset: null,
  warningShown: false
};

// Create state manager instance
const manager = createStateManager(STATE_FILE, DEFAULT_STATE, { mergeOnSet: true });

/**
 * Load current edit state
 * @returns {Object} Edit state object
 */
function getEditState() {
  return manager.get();
}

/**
 * Save edit state
 * @param {Object} state - Partial state to merge
 */
function setEditState(state) {
  manager.set(state);
}

/**
 * Record an edit operation
 * @param {string} filePath - Path of edited file
 * @param {boolean} canWarn - Whether warning can be shown (no todos exist)
 * @returns {Object} Updated state with shouldWarn flag
 */
function recordEdit(filePath, canWarn = true) {
  const state = getEditState();
  const editedFiles = state.editedFiles || [];

  // Add file if not already tracked (dedupe)
  if (!editedFiles.includes(filePath)) {
    editedFiles.push(filePath);
  }

  const newCount = state.editCount + 1;
  const shouldWarn = newCount >= EDIT_THRESHOLD && !state.warningShown;

  // Only set warningShown=true if warning can actually be shown
  // This prevents silent suppression when todos exist
  setEditState({
    editCount: newCount,
    editedFiles: editedFiles.slice(-10), // Keep last 10 files
    warningShown: (shouldWarn && canWarn) ? true : state.warningShown
  });

  return {
    editCount: newCount,
    shouldWarn,
    editedFiles
  };
}

/**
 * Record a write operation (new file)
 * @param {string} filePath - Path of new file
 * @param {boolean} canWarn - Whether warning can be shown (no todos exist)
 * @returns {Object} Updated state with shouldWarn flag
 */
function recordWrite(filePath, canWarn = true) {
  const state = getEditState();
  const editedFiles = state.editedFiles || [];

  if (!editedFiles.includes(filePath)) {
    editedFiles.push(filePath);
  }

  const newCount = state.writeCount + 1;
  const totalCount = state.editCount + newCount;
  const shouldWarn = totalCount >= EDIT_THRESHOLD && !state.warningShown;

  // Only set warningShown=true if warning can actually be shown
  setEditState({
    writeCount: newCount,
    editedFiles: editedFiles.slice(-10),
    warningShown: (shouldWarn && canWarn) ? true : state.warningShown
  });

  return {
    writeCount: newCount,
    totalCount,
    shouldWarn,
    editedFiles
  };
}

/**
 * Reset edit state (called when TodoWrite is used)
 */
function resetEditState() {
  setEditState({
    editCount: 0,
    writeCount: 0,
    editedFiles: [],
    warningShown: false,
    strongWarningShown: false,
    lastReset: new Date().toISOString()
  });
}

/**
 * Clear edit state file (on session end)
 */
function clearEditState() {
  manager.clear();
}

module.exports = {
  getEditState,
  setEditState,
  recordEdit,
  recordWrite,
  resetEditState,
  clearEditState,
  EDIT_THRESHOLD,
  STATE_FILE
};
