#!/usr/bin/env node
'use strict';

/**
 * Edit State Management - Tracks edit/write operations for complexity detection
 *
 * Monitors the number of file modifications in a session to detect when
 * multi-file operations are occurring without todo tracking.
 *
 * Storage: /tmp/ck/edit/edit-state-{sessionId}.json
 *
 * Used by:
 * - edit-enforcement.cjs (PreToolUse → Edit|Write|MultiEdit|NotebookEdit)
 * - todo-tracker.cjs (PostToolUse → TaskCreate) - resets count
 *
 * @module edit-state
 */

const fs = require('fs');
const path = require('path');
const { CK_TMP_DIR, ensureDir } = require('./ck-paths.cjs');

// Edit state directory
const EDIT_DIR = path.join(CK_TMP_DIR, 'edit');

// State file path pattern
const STATE_FILE_PREFIX = 'edit-state-';


/**
 * Get edit state file path for a session
 * @param {string} sessionId - Session identifier
 * @returns {string} Path to edit state file
 */
function getEditStatePath(sessionId) {
  return path.join(EDIT_DIR, `${STATE_FILE_PREFIX}${sessionId}.json`);
}

/**
 * Default edit state schema
 * @returns {Object} Default empty edit state
 */
function getDefaultState() {
  return {
    editCount: 0,              // Number of Edit/Write calls since last TaskCreate
    writeCount: 0,             // Number of Write calls specifically
    filesModified: [],         // List of files modified (last 20)
    sessionStarted: null,      // ISO timestamp of session start
    lastUpdated: null,         // ISO timestamp of last update
    planWarningShown: false,   // Plan artifact warning at 4 unique files
    planWarningShown8: false   // Plan artifact warning at 8 unique files
  };
}

/**
 * Load edit state from file
 * @param {string} sessionId - Session identifier
 * @returns {Object} Edit state or default
 */
function getEditState(sessionId) {
  if (!sessionId) return getDefaultState();

  const statePath = getEditStatePath(sessionId);
  try {
    if (!fs.existsSync(statePath)) {
      return { ...getDefaultState(), sessionStarted: new Date().toISOString() };
    }
    const data = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    return { ...getDefaultState(), ...data };
  } catch (e) {
    return { ...getDefaultState(), sessionStarted: new Date().toISOString() };
  }
}

/**
 * Save edit state atomically
 * @param {string} sessionId - Session identifier
 * @param {Object} state - Edit state to save
 * @returns {boolean} Success status
 */
function setEditState(sessionId, state) {
  if (!sessionId) return false;

  ensureDir(EDIT_DIR);
  const statePath = getEditStatePath(sessionId);
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
 * Record an edit/write operation
 * @param {string} sessionId - Session identifier
 * @param {string} filePath - Path to file being modified
 * @param {string} toolName - 'Edit' or 'Write'
 * @returns {Object} Updated state with warning info
 */
function recordEdit(sessionId, filePath, toolName) {
  const state = getEditState(sessionId);

  state.editCount++;
  if (toolName === 'Write') {
    state.writeCount++;
  }

  // Track files modified (keep last 20)
  if (filePath && !state.filesModified.includes(filePath)) {
    state.filesModified.push(filePath);
    if (state.filesModified.length > 20) {
      state.filesModified = state.filesModified.slice(-20);
    }
  }

  setEditState(sessionId, state);

  return {
    state,
    editCount: state.editCount,
    uniqueFiles: state.filesModified.length
  };
}


/**
 * Reset edit count (called when TaskCreate is used)
 * @param {string} sessionId - Session identifier
 * @returns {boolean} Success status
 */
function resetEditCount(sessionId) {
  const state = getEditState(sessionId);
  state.editCount = 0;
  state.writeCount = 0;
  state.filesModified = [];
  return setEditState(sessionId, state);
}


/**
 * Get current edit count
 * @param {string} sessionId - Session identifier
 * @returns {number} Current edit count
 */
function getEditCount(sessionId) {
  const state = getEditState(sessionId);
  return state.editCount;
}

/**
 * Check if plan warning has been shown at a given level
 * @param {string} sessionId - Session identifier
 * @param {number} level - Warning level (4 or 8)
 * @returns {boolean} True if warning was already shown
 */
function getPlanWarningShown(sessionId, level) {
  const state = getEditState(sessionId);
  return level >= 8 ? state.planWarningShown8 : state.planWarningShown;
}

/**
 * Mark plan warning as shown at a given level
 * @param {string} sessionId - Session identifier
 * @param {number} level - Warning level (4 or 8)
 * @returns {boolean} Success status
 */
function setPlanWarningShown(sessionId, level) {
  const state = getEditState(sessionId);
  if (level >= 8) {
    state.planWarningShown8 = true;
  } else {
    state.planWarningShown = true;
  }
  return setEditState(sessionId, state);
}

/**
 * Clear edit state for session
 * @param {string} sessionId - Session identifier
 * @returns {boolean} Success status
 */
function clearEditState(sessionId) {
  if (!sessionId) return false;

  const statePath = getEditStatePath(sessionId);
  try {
    if (fs.existsSync(statePath)) {
      fs.unlinkSync(statePath);
    }
    return true;
  } catch (e) {
    return false;
  }
}

module.exports = {
  // Constants
  EDIT_DIR,

  // Path helpers
  getEditStatePath,
  getDefaultState,

  // State operations
  getEditState,
  setEditState,
  recordEdit,
  resetEditCount,
  clearEditState,

  // Query functions
  getEditCount,

  // Plan artifact enforcement
  getPlanWarningShown,
  setPlanWarningShown
};
