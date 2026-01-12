#!/usr/bin/env node
'use strict';

/**
 * ACE Feedback Tracker - Track Delta Effectiveness
 *
 * Tracks which injected deltas contributed to successful outcomes.
 * Updates helpful/not_helpful counts and recalculates confidence.
 *
 * Triggers:
 * - PostToolUse (Skill) - Track skill execution outcomes
 * - UserPromptSubmit - Detect negative feedback keywords
 *
 * Human feedback weight: 3x (per user decision)
 *
 * @module ace-feedback-tracker
 */

const fs = require('fs');
const path = require('path');
const {
  loadDeltas,
  saveDeltas,
  recalculateConfidence,
  ensureDirs,
  withLock,
  MEMORY_DIR
} = require('./lib/ace-playbook-state.cjs');
const {
  detectNegativeFeedback
} = require('./lib/ace-outcome-classifier.cjs');
const { MAX_STDIN_BYTES } = require('./lib/ace-constants.cjs');

// Paths
const TRACKING_FILE = path.join(MEMORY_DIR, '.ace-injection-tracking.json');

/**
 * Read stdin synchronously with size limit
 * @returns {string} stdin content (empty if exceeds MAX_STDIN_BYTES)
 */
function readStdinSync() {
  try {
    const content = fs.readFileSync(0, 'utf-8');
    if (content.length > MAX_STDIN_BYTES) {
      return '';
    }
    return content.trim();
  } catch (e) {
    return '';
  }
}

/**
 * Load injection tracking data
 * @returns {Object} Tracking data by session ID
 */
function loadTracking() {
  if (!fs.existsSync(TRACKING_FILE)) {
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(TRACKING_FILE, 'utf8'));
  } catch (e) {
    return {};
  }
}

/**
 * Save tracking data
 * @param {Object} tracking - Tracking data
 */
function saveTracking(tracking) {
  ensureDirs();
  fs.writeFileSync(TRACKING_FILE, JSON.stringify(tracking, null, 2));
}

/**
 * Get injected delta IDs for current session
 * @returns {string[]} Array of delta IDs
 */
function getInjectedDeltaIds() {
  const tracking = loadTracking();
  const sessionId = process.env.CLAUDE_SESSION_ID || 'unknown';

  const sessionData = tracking[sessionId];
  if (!sessionData) {
    return [];
  }

  return sessionData.injected_deltas || [];
}

/**
 * Update delta feedback counts
 * @param {string[]} deltaIds - Delta IDs to update
 * @param {boolean} wasSuccessful - Whether the outcome was successful
 * @param {boolean} isHumanFeedback - Whether this is human feedback
 */
function updateDeltaFeedback(deltaIds, wasSuccessful, isHumanFeedback = false) {
  if (deltaIds.length === 0) return;

  // Use lock to prevent race condition during read-modify-write
  withLock(() => {
    const deltas = loadDeltas();
    let updated = false;

    for (const deltaId of deltaIds) {
      const delta = deltas.find(d => d.delta_id === deltaId);
      if (!delta) continue;

      if (isHumanFeedback) {
        if (wasSuccessful) {
          delta.human_feedback_count = (delta.human_feedback_count || 0) + 1;
          delta.last_helpful = new Date().toISOString();
        } else {
          // Negative human feedback counts against (but not 3x weighted)
          delta.not_helpful_count = (delta.not_helpful_count || 0) + 1;
        }
      } else {
        if (wasSuccessful) {
          delta.helpful_count = (delta.helpful_count || 0) + 1;
          delta.last_helpful = new Date().toISOString();
        } else {
          delta.not_helpful_count = (delta.not_helpful_count || 0) + 1;
        }
      }

      delta.confidence = recalculateConfidence(delta);
      updated = true;
    }

    if (updated) {
      saveDeltas(deltas);
    }
  });
}

/**
 * Determine if skill execution was successful
 * @param {Object} payload - PostToolUse payload
 * @returns {boolean} True if successful
 */
function wasSkillSuccessful(payload) {
  // Check exit code
  if (payload.exit_code && payload.exit_code > 0) {
    return false;
  }

  // Check for error
  if (payload.error) {
    return false;
  }

  // Check tool response for failure signals
  const response = payload.tool_response || '';
  if (typeof response === 'string') {
    if (response.includes('Error:') || response.includes('FAILED') || response.includes('blocked')) {
      return false;
    }
  }

  return true;
}

/**
 * Log feedback event
 * @param {string} message - Log message
 */
function logFeedback(message) {
  ensureDirs();
  const logFile = path.join(MEMORY_DIR, 'ace-feedback.log');
  const timestamp = new Date().toISOString();
  fs.appendFileSync(logFile, `${timestamp} | ${message}\n`);
}

/**
 * Main execution
 */
function main() {
  try {
    const stdin = readStdinSync();
    if (!stdin) {
      process.exit(0);
    }

    const payload = JSON.parse(stdin);

    // Get injected deltas for this session
    const injectedDeltaIds = getInjectedDeltaIds();
    if (injectedDeltaIds.length === 0) {
      process.exit(0);
    }

    // Handle PostToolUse (Skill) - track skill outcomes
    if (payload.tool_name === 'Skill') {
      const skillName = payload.tool_input?.skill || 'unknown';
      const wasSuccessful = wasSkillSuccessful(payload);

      // Use lock for entire read-filter-update operation (prevents race condition)
      withLock(() => {
        const deltas = loadDeltas();
        const matchingDeltaIds = injectedDeltaIds.filter(id => {
          const delta = deltas.find(d => d.delta_id === id);
          return delta && delta.condition?.toLowerCase().includes(skillName.toLowerCase());
        });

        if (matchingDeltaIds.length > 0) {
          // Update deltas directly (already in lock)
          let updated = false;
          for (const deltaId of matchingDeltaIds) {
            const delta = deltas.find(d => d.delta_id === deltaId);
            if (!delta) continue;

            if (wasSuccessful) {
              delta.helpful_count = (delta.helpful_count || 0) + 1;
              delta.last_helpful = new Date().toISOString();
            } else {
              delta.not_helpful_count = (delta.not_helpful_count || 0) + 1;
            }
            delta.confidence = recalculateConfidence(delta);
            updated = true;
          }
          if (updated) {
            saveDeltas(deltas);
          }
          logFeedback(`skill | ${skillName} | ${wasSuccessful ? 'success' : 'failure'} | ${matchingDeltaIds.length} deltas`);
        }
      });

      process.exit(0);
    }

    // Handle UserPromptSubmit - detect negative human feedback
    const hookEvent = payload.hook_event_name || '';
    if (hookEvent === 'UserPromptSubmit' || payload.user_message) {
      const userMessage = payload.user_message || payload.message || '';

      if (detectNegativeFeedback(userMessage)) {
        updateDeltaFeedback(injectedDeltaIds, false, true);
        logFeedback(`human_negative | "${userMessage.substring(0, 50)}..." | ${injectedDeltaIds.length} deltas`);
      }
    }

    process.exit(0);
  } catch (err) {
    try {
      ensureDirs();
      logFeedback(`error | ${err.message}`);
    } catch {
      // Ignore logging errors
    }
    process.exit(0);
  }
}

main();
