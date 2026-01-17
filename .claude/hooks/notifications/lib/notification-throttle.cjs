/**
 * Notification-specific throttling
 * Different from sender.cjs (which throttles on HTTP errors)
 * This throttles by event type to prevent notification spam
 */
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

const THROTTLE_FILE = path.join(os.tmpdir(), 'ck-noti-event-throttle.json');

// Throttle durations per event type (ms)
const THROTTLE_DURATIONS = {
  idle_prompt: 60 * 1000,     // 60 seconds - primary spam source
  SubagentStop: 30 * 1000,    // 30 seconds - less critical
  default: 10 * 1000          // 10 seconds - fallback
};

// Events that should NEVER be throttled (only truly critical notifications)
// AskUserPrompt removed - it's for command approvals which spam; user sees them in terminal anyway
const NEVER_THROTTLE = ['Stop'];

/**
 * Load throttle state from temp file
 * @returns {Object} Event type -> last notification timestamp
 */
function loadState() {
  try {
    if (fs.existsSync(THROTTLE_FILE)) {
      return JSON.parse(fs.readFileSync(THROTTLE_FILE, 'utf8'));
    }
  } catch {
    // Corrupted file - start fresh
  }
  return {};
}

/**
 * Save throttle state to temp file
 * @param {Object} state
 */
function saveState(state) {
  try {
    // Clean old entries (>10 min) to prevent file bloat
    const now = Date.now();
    const cleaned = {};
    for (const [key, ts] of Object.entries(state)) {
      if (now - ts < 10 * 60 * 1000) cleaned[key] = ts;
    }
    fs.writeFileSync(THROTTLE_FILE, JSON.stringify(cleaned, null, 2));
  } catch {
    // Non-critical - continue without persistence
  }
}

/**
 * Check if notification should be throttled
 * @param {string} eventType - Event type (idle_prompt, Stop, etc.)
 * @param {string} [sessionId] - Optional session for per-session throttling
 * @returns {boolean} True if should skip
 */
function shouldThrottle(eventType, sessionId) {
  const duration = THROTTLE_DURATIONS[eventType] || THROTTLE_DURATIONS.default;
  const key = sessionId ? `${eventType}:${sessionId}` : eventType;

  const state = loadState();
  const lastNotify = state[key];

  if (lastNotify && (Date.now() - lastNotify) < duration) {
    return true;
  }

  return false;
}

/**
 * Record notification sent (for throttle tracking)
 * @param {string} eventType
 * @param {string} [sessionId]
 */
function recordNotification(eventType, sessionId) {
  const key = sessionId ? `${eventType}:${sessionId}` : eventType;
  const state = loadState();
  state[key] = Date.now();
  saveState(state);
}

/**
 * Check and record in one call
 * @param {string} eventType
 * @param {string} [sessionId]
 * @returns {boolean} True if throttled (should skip notification)
 */
function checkThrottle(eventType, sessionId) {
  // Never throttle critical events
  if (NEVER_THROTTLE.includes(eventType)) {
    return false;
  }

  if (shouldThrottle(eventType, sessionId)) {
    return true;
  }

  recordNotification(eventType, sessionId);
  return false;
}

module.exports = {
  shouldThrottle,
  recordNotification,
  checkThrottle,
  THROTTLE_DURATIONS,
  NEVER_THROTTLE
};
