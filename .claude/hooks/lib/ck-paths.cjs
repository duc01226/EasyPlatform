#!/usr/bin/env node
'use strict';

/**
 * ClaudeKit Paths - Centralized path constants for all temporary/runtime files
 *
 * All ClaudeKit temp files consolidated under /tmp/ck/ namespace for:
 * - Cleaner /tmp directory (single namespace)
 * - Easier cleanup (rm -rf /tmp/ck/)
 * - Debugging (all state in one place)
 * - No collisions with other tools
 *
 * Fixes:
 * - #177: Race condition from shared global state file
 * - #178: Scattered temp files consolidation
 *
 * @module ck-paths
 */

const path = require('path');
const os = require('os');
const fs = require('fs');

// Root directory for all ClaudeKit temp files
const CK_TMP_DIR = path.join(os.tmpdir(), 'ck');

// Session-specific marker files (per-session, no race conditions)
const MARKERS_DIR = path.join(CK_TMP_DIR, 'markers');

// Global calibration data (shared by design - records compact thresholds)
const CALIBRATION_PATH = path.join(CK_TMP_DIR, 'calibration.json');

// Hook metrics data (shared - tracks hook effectiveness)
const METRICS_PATH = path.join(CK_TMP_DIR, 'hook-metrics.json');

// Debug logs directory
const DEBUG_DIR = path.join(CK_TMP_DIR, 'debug');

// Swap files directory (for externalized large tool outputs)
const SWAP_DIR = path.join(CK_TMP_DIR, 'swap');

// Workflow state directory (per-session workflow tracking)
const WORKFLOW_DIR = path.join(CK_TMP_DIR, 'workflow');

/**
 * Ensure directory exists
 * @param {string} dirPath - Directory path to create
 */
function ensureDir(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  } catch (err) {
    // Silent fail - non-critical, but log for debugging
    if (process.env.CK_DEBUG) {
      console.error(`[CK] Failed to create ${dirPath}: ${err.message}`);
    }
  }
}

/**
 * Get marker file path for a session
 * @param {string} sessionId - Session ID
 * @returns {string} Full path to marker file
 */
function getMarkerPath(sessionId) {
  return path.join(MARKERS_DIR, `${sessionId}.json`);
}

/**
 * Get debug log path for a session
 * @param {string} sessionId - Session ID
 * @returns {string} Full path to debug log
 */
function getDebugLogPath(sessionId) {
  return path.join(DEBUG_DIR, `${sessionId}.log`);
}

/**
 * Initialize ClaudeKit temp directories
 * Call this at startup to ensure directories exist
 */
function initDirs() {
  ensureDir(CK_TMP_DIR);
  ensureDir(MARKERS_DIR);
  ensureDir(DEBUG_DIR);
}

/**
 * Clean up all ClaudeKit temp files
 * Useful for testing or manual cleanup
 */
function cleanAll() {
  try {
    if (fs.existsSync(CK_TMP_DIR)) {
      fs.rmSync(CK_TMP_DIR, { recursive: true, force: true });
    }
  } catch (err) {
    // Silent fail
  }
}

/**
 * Sanitize session ID to prevent path injection
 * Only allows alphanumeric characters and dashes
 * @param {string} sessionId - Raw session ID
 * @returns {string} Sanitized session ID
 */
function sanitizeSessionId(sessionId) {
  const raw = (typeof sessionId === 'string' && sessionId) ? sessionId : 'default';
  return raw.replace(/[^a-zA-Z0-9-]/g, '_');
}

/**
 * Get swap directory for a session
 * @param {string} sessionId - Session ID
 * @returns {string} Full path to session swap directory
 */
function getSwapDir(sessionId) {
  return path.join(SWAP_DIR, sanitizeSessionId(sessionId));
}

/**
 * Ensure swap directory exists for a session
 * @param {string} sessionId - Session ID
 * @returns {string} Full path to session swap directory
 */
function ensureSwapDir(sessionId) {
  const dir = getSwapDir(sessionId);
  ensureDir(dir);
  return dir;
}

/**
 * Get workflow state file path for a session
 * @param {string} sessionId - Session ID
 * @returns {string} Full path to workflow state file
 */
function getWorkflowPath(sessionId) {
  return path.join(WORKFLOW_DIR, `${sanitizeSessionId(sessionId)}.json`);
}

module.exports = {
  // Directories
  CK_TMP_DIR,
  MARKERS_DIR,
  DEBUG_DIR,
  SWAP_DIR,
  WORKFLOW_DIR,

  // Files
  CALIBRATION_PATH,
  METRICS_PATH,

  // Helpers
  ensureDir,
  getMarkerPath,
  getDebugLogPath,
  getWorkflowPath,
  initDirs,
  cleanAll,

  // Swap helpers
  sanitizeSessionId,
  getSwapDir,
  ensureSwapDir
};
