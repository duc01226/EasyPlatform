#!/usr/bin/env node
'use strict';

/**
 * Failure State - tracks consecutive build/test failures per session
 *
 * State file: {os.tmpdir()}/ck/{sessionId}/failure-state.json
 * All operations synchronous. Fail-open on all errors.
 *
 * @module failure-state
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Get state file path for session
 */
function getStatePath(sessionId) {
  const id = sessionId || process.env.CLAUDE_SESSION_ID || 'unknown';
  return path.join(os.tmpdir(), 'ck', id, 'failure-state.json');
}

/**
 * Load failure state from temp file
 */
function loadFailureState(sessionId) {
  try {
    const statePath = getStatePath(sessionId);
    if (!fs.existsSync(statePath)) {
      return { failures: {}, total_failures: 0, session_id: sessionId };
    }
    return JSON.parse(fs.readFileSync(statePath, 'utf-8'));
  } catch {
    return { failures: {}, total_failures: 0, session_id: sessionId };
  }
}

/**
 * Save failure state to temp file
 */
function saveFailureState(sessionId, state) {
  try {
    const statePath = getStatePath(sessionId);
    const dir = path.dirname(statePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(statePath, JSON.stringify(state));
  } catch {
    // Fail-open
  }
}

/**
 * Record a build/test failure for a category
 * @returns {number} Updated consecutive count
 */
function recordFailure(sessionId, category, commandSummary, errorSnippet) {
  const state = loadFailureState(sessionId);

  if (!state.failures[category]) {
    state.failures[category] = {
      consecutive_count: 0,
      first_failure_at: new Date().toISOString(),
      last_failure_at: null,
      command_summary: commandSummary
    };
  }

  state.failures[category].consecutive_count++;
  state.failures[category].last_failure_at = new Date().toISOString();
  state.failures[category].command_summary = commandSummary;
  state.failures[category].last_error_snippet = errorSnippet || null;
  state.total_failures = (state.total_failures || 0) + 1;

  saveFailureState(sessionId, state);
  return state.failures[category].consecutive_count;
}

/**
 * Record a success, resetting the counter for this category
 */
function recordSuccess(sessionId, category) {
  const state = loadFailureState(sessionId);
  if (state.failures[category]) {
    delete state.failures[category];
    saveFailureState(sessionId, state);
  }
}

/**
 * Get consecutive failure count for a category
 */
function getConsecutiveCount(sessionId, category) {
  const state = loadFailureState(sessionId);
  return state.failures[category]?.consecutive_count || 0;
}

/**
 * Clear all failure state for session
 */
function clearFailureState(sessionId) {
  try {
    const statePath = getStatePath(sessionId);
    if (fs.existsSync(statePath)) {
      fs.unlinkSync(statePath);
    }
  } catch {
    // Fail-open
  }
}

/**
 * Get summary of all active failures for reporting
 */
function getFailureSummary(sessionId) {
  const state = loadFailureState(sessionId);
  return Object.entries(state.failures).map(([cat, info]) => ({
    category: cat,
    count: info.consecutive_count,
    lastError: info.last_error_snippet,
    command: info.command_summary
  }));
}

module.exports = {
  loadFailureState,
  recordFailure,
  recordSuccess,
  getConsecutiveCount,
  clearFailureState,
  getFailureSummary
};
