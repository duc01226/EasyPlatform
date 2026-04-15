#!/usr/bin/env node
'use strict';

/**
 * PreCompact Hook: Write session-specific marker file when conversation is compacted
 * Also records calibration data for accurate compact threshold estimation
 *
 * Fixes #178: Uses /tmp/ck/ namespace for temp files
 *
 * Features:
 * - Session-specific markers for concurrent conversation support
 * - Calibration recording for self-improving threshold accuracy
 */

const fs = require('fs');
const { execSync } = require('child_process');
const {
  MARKERS_DIR,
  CALIBRATION_PATH,
  DEBUG_DIR,
  SESSION_ID_DEFAULT,
  ensureDir,
  getMarkerPath,
  getDebugLogPath
} = require('./lib/ck-paths.cjs');

const CALIBRATION_LOCK_PATH = CALIBRATION_PATH.replace('.json', '.lock');
const LOCK_TIMEOUT_MS = 5000;

function acquireCalibrationLock() {
  try {
    if (fs.existsSync(CALIBRATION_LOCK_PATH)) {
      const stat = fs.statSync(CALIBRATION_LOCK_PATH);
      if (Date.now() - stat.mtimeMs > LOCK_TIMEOUT_MS) {
        try { fs.unlinkSync(CALIBRATION_LOCK_PATH); } catch (e) {}
        if (fs.existsSync(CALIBRATION_LOCK_PATH)) return false;
      } else {
        return false; // lock held
      }
    }
    fs.writeFileSync(CALIBRATION_LOCK_PATH, String(process.pid), { flag: 'wx' });
    return true;
  } catch (err) {
    return false;
  }
}

function releaseCalibrationLock() {
  try { if (fs.existsSync(CALIBRATION_LOCK_PATH)) fs.unlinkSync(CALIBRATION_LOCK_PATH); }
  catch (e) {}
}

/**
 * Read existing calibration data
 * @returns {Object} Calibration data keyed by context window size
 */
function readCalibration() {
  try {
    if (fs.existsSync(CALIBRATION_PATH)) {
      return JSON.parse(fs.readFileSync(CALIBRATION_PATH, 'utf8'));
    }
  } catch (err) {
    // Silent fail - start fresh
  }
  return {};
}

/**
 * Write calibration data
 * @param {Object} data - Calibration data to save
 */
function writeCalibration(data) {
  try {
    ensureDir(MARKERS_DIR); // Ensure parent dir exists
    fs.writeFileSync(CALIBRATION_PATH, JSON.stringify(data, null, 2));
  } catch (err) {
    // Silent fail - calibration is optional
  }
}

/**
 * Update calibration with new compact observation
 * Uses exponential moving average to smooth out variations
 *
 * @param {number} contextWindowSize - Model's context window size
 * @param {number} tokensAtCompact - Total tokens when compact triggered
 */
function updateCalibration(contextWindowSize, tokensAtCompact) {
  if (!contextWindowSize || !tokensAtCompact || tokensAtCompact <= 0) {
    return;
  }

  if (!acquireCalibrationLock()) return; // skip if lock unavailable — calibration is optional

  try {
    const calibration = readCalibration();
    const key = String(contextWindowSize);

    // EMA alpha: 0.3 gives 70% weight to historical average, 30% to new observation
    // Chosen to smooth out variations while adapting to pattern changes within ~3-4 observations
    const CALIBRATION_ALPHA = 0.3;

    if (calibration[key]) {
      const alpha = CALIBRATION_ALPHA;
      const oldThreshold = calibration[key].threshold;
      const newThreshold = Math.floor(alpha * tokensAtCompact + (1 - alpha) * oldThreshold);

      calibration[key] = {
        threshold: newThreshold,
        samples: calibration[key].samples + 1,
        lastUpdated: Date.now(),
        lastObserved: tokensAtCompact
      };
    } else {
      // First observation for this window size
      calibration[key] = {
        threshold: tokensAtCompact,
        samples: 1,
        lastUpdated: Date.now(),
        lastObserved: tokensAtCompact
      };
    }

    writeCalibration(calibration);
  } finally {
    releaseCalibrationLock();
  }
}

/**
 * Append debug info to session-specific log file
 */
function debugLog(sessionId, message) {
  try {
    ensureDir(DEBUG_DIR);
    const logPath = getDebugLogPath(sessionId);
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logPath, `[${timestamp}] ${message}\n`);
  } catch (err) {
    // Silent fail
  }
}

/**
 * Capture git status --short for post-compact re-verify context.
 * Returns null on failure (non-git dir, timeout, etc.) — fail silently.
 * @param {string} cwd - Project directory
 * @returns {string|null}
 */
function captureGitStatus(cwd) {
  try {
    const output = execSync('git status --short', {
      cwd,
      timeout: 3000,
      encoding: 'utf8'
    }).trim();
    // Truncate to 50 lines max to keep marker file small
    const lines = output.split('\n');
    return lines.length > 50
      ? lines.slice(0, 50).join('\n') + '\n[...truncated]'
      : output;
  } catch (_e) {
    return null; // non-git dir, git not found, or timeout
  }
}

// COMPACT INVARIANT: This hook must fire BEFORE post-compact-recovery sees the marker.
// The marker file + calibration snapshot provide the state needed for full recovery.
// Workflow state is separately managed by todo-tracker.cjs and workflow-step-tracker.cjs.

// Read JSON from stdin (PreCompact payload)
let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);

    // Use SESSION_ID_DEFAULT as fallback (shared constant — must match all marker readers)
    const sessionId = data.session_id || SESSION_ID_DEFAULT;

    // Log received payload for debugging
    debugLog(sessionId, `PreCompact payload: ${JSON.stringify(data)}`);

    // Ensure marker directory exists
    ensureDir(MARKERS_DIR);

    // Write session-specific marker for statusline detection
    // baselineRecorded: false means statusline should record cumulative baseline on first read
    const markerPath = getMarkerPath(sessionId);
    const cwd = data.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd();
    const gitStatus = captureGitStatus(cwd);
    const marker = {
      sessionId: sessionId,
      trigger: data.trigger || 'unknown',
      baselineRecorded: false,  // Statusline will record cumulative total as baseline
      baseline: 0,              // Will be set by statusline on first read
      lastTokenTotal: 0,        // For token drop detection
      timestamp: Date.now(),
      ...(gitStatus ? { compactState: { gitStatus, warningShown: false } } : {})
    };
    fs.writeFileSync(markerPath, JSON.stringify(marker));

    debugLog(sessionId, `Baseline marker created at ${markerPath}`);

    // Record calibration data for threshold learning
    const contextInput = data.context_window?.total_input_tokens || 0;
    const contextOutput = data.context_window?.total_output_tokens || 0;
    const contextSize = data.context_window?.context_window_size || 0;

    if (contextSize > 0) {
      const tokensAtCompact = contextInput + contextOutput;
      updateCalibration(contextSize, tokensAtCompact);
      debugLog(sessionId, `Calibration updated: ${contextSize} -> ${tokensAtCompact}`);
    } else {
      debugLog(sessionId, `No context_window data in payload`);
    }

  } catch (err) {
    debugLog('error', `Error: ${err.message}`);
    // Silent fail - don't break the compact
  }
});
