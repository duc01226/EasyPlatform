#!/usr/bin/env node
'use strict';

/**
 * PreCompact Hook: Write session-specific marker file when conversation is compacted
 *
 * Captures `git status --short` into `compactState.gitStatus` so
 * `prompt-context-assembler.cjs` can emit the post-compact "CONTEXT COMPACTED"
 * re-verify warning on the next UserPromptSubmit.
 *
 * Fixes #178: Uses /tmp/ck/ namespace for temp files
 */

const fs = require('fs');
const { execSync } = require('child_process');
const {
  MARKERS_DIR,
  DEBUG_DIR,
  SESSION_ID_DEFAULT,
  ensureDir,
  getMarkerPath,
  getDebugLogPath
} = require('./lib/ck-paths.cjs');

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
// The marker file provides `compactState.gitStatus` for the post-compact re-verify warning.
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

    // Write session-specific marker so prompt-context-assembler.cjs can emit
    // the post-compact "CONTEXT COMPACTED" warning with captured git status
    const markerPath = getMarkerPath(sessionId);
    const cwd = data.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd();
    const gitStatus = captureGitStatus(cwd);
    const marker = {
      sessionId: sessionId,
      trigger: data.trigger || 'unknown',
      timestamp: Date.now(),
      ...(gitStatus ? { compactState: { gitStatus, warningShown: false } } : {})
    };
    fs.writeFileSync(markerPath, JSON.stringify(marker));

    debugLog(sessionId, `Compact marker written at ${markerPath}`);

  } catch (err) {
    debugLog('error', `Error: ${err.message}`);
    // Silent fail - don't break the compact
  }
});
