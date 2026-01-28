#!/usr/bin/env node
/**
 * Compact State Management Library
 *
 * Tracks tool call usage within a session to proactively suggest
 * context compaction after heavy tool usage (~50 calls).
 *
 * State File: .claude/.compact-state.json
 * Reset: On session start or after /compact executed
 */

const path = require('path');
const { createStateManager } = require('./state-manager.cjs');

const STATE_FILE = path.join(process.cwd(), '.claude', '.compact-state.json');

// Threshold for suggesting compaction (tool calls)
const COMPACT_THRESHOLD = 50;

// Maximum state file size before auto-reset (50KB safeguard)
const MAX_STATE_SIZE_BYTES = 50 * 1024;

// Recurring suggestion interval (calls)
const RECURRING_INTERVAL = 20;

// Maximum suggestions per session
const MAX_SUGGESTIONS = 3;

// Default state
const DEFAULT_STATE = {
  sessionToolCallCount: 0,
  suggestionCount: 0,
  lastSuggestedAt: null,
  lastReset: null,
  sessionStartTime: null
};

// Create state manager instance with 24h TTL
const manager = createStateManager(STATE_FILE, DEFAULT_STATE, {
  mergeOnSet: true,
  ttlHours: 24
});

/**
 * Load current compact state
 * @returns {Object} Compact state object
 */
function getCompactState() {
  return manager.get();
}

/**
 * Save compact state
 * @param {Object} state - Partial state to merge
 */
function setCompactState(state) {
  manager.set(state);
}

/**
 * Check state file size and auto-reset if too large
 * @returns {boolean} True if state was reset due to size
 */
function checkAndResetIfTooLarge() {
  const fs = require('fs');
  try {
    if (fs.existsSync(STATE_FILE)) {
      const stats = fs.statSync(STATE_FILE);
      if (stats.size > MAX_STATE_SIZE_BYTES) {
        resetCompactState();
        if (process.env.CK_DEBUG) {
          console.error(`[compact-state] Auto-reset: state file exceeded ${MAX_STATE_SIZE_BYTES} bytes`);
        }
        return true;
      }
    }
  } catch {
    // Ignore errors - fail-safe
  }
  return false;
}

/**
 * Record a tool call
 * @returns {Object} Updated state with shouldSuggest flag
 */
function recordToolCall() {
  // Safety check for state file bloat
  checkAndResetIfTooLarge();

  const state = getCompactState();

  // Initialize session start time if not set
  if (!state.sessionStartTime) {
    state.sessionStartTime = new Date().toISOString();
  }

  const newCount = state.sessionToolCallCount + 1;
  const suggestionCount = state.suggestionCount || 0;

  // Recurring suggestion logic:
  // - First suggestion at 50
  // - Then at 70, 90 (every 20 calls)
  // - Cap at 3 suggestions total
  let shouldSuggest = false;
  if (newCount >= COMPACT_THRESHOLD && suggestionCount < MAX_SUGGESTIONS) {
    const callsSinceThreshold = newCount - COMPACT_THRESHOLD;
    // Suggest at 50, then every 20 calls (70, 90, ...)
    if (callsSinceThreshold === 0 || callsSinceThreshold % RECURRING_INTERVAL === 0) {
      shouldSuggest = true;
    }
  }

  setCompactState({
    sessionToolCallCount: newCount,
    sessionStartTime: state.sessionStartTime,
    suggestionCount: shouldSuggest ? suggestionCount + 1 : suggestionCount,
    lastSuggestedAt: shouldSuggest ? new Date().toISOString() : state.lastSuggestedAt
  });

  return {
    toolCallCount: newCount,
    shouldSuggest,
    threshold: COMPACT_THRESHOLD,
    suggestionNumber: shouldSuggest ? suggestionCount + 1 : suggestionCount
  };
}

/**
 * Reset compact state (called on session start or after /compact)
 */
function resetCompactState() {
  setCompactState({
    sessionToolCallCount: 0,
    suggestionCount: 0,
    lastSuggestedAt: null,
    lastReset: new Date().toISOString(),
    sessionStartTime: new Date().toISOString()
  });
}

/**
 * Clear compact state file
 */
function clearCompactState() {
  manager.clear();
}

/**
 * Get current progress toward threshold
 * @returns {Object} Progress info
 */
function getProgress() {
  const state = getCompactState();
  return {
    current: state.sessionToolCallCount,
    threshold: COMPACT_THRESHOLD,
    percentage: Math.min(100, Math.round((state.sessionToolCallCount / COMPACT_THRESHOLD) * 100)),
    suggestionCount: state.suggestionCount || 0
  };
}

module.exports = {
  getCompactState,
  setCompactState,
  recordToolCall,
  resetCompactState,
  clearCompactState,
  getProgress,
  COMPACT_THRESHOLD,
  STATE_FILE
};
