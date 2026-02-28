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

// Debug logs directory
const DEBUG_DIR = path.join(CK_TMP_DIR, 'debug');

// External memory swap directory (tool output externalization)
const SWAP_DIR = path.join(CK_TMP_DIR, 'swap');

// Session state directory (consolidated from /tmp/ck-session-*.json)
const SESSION_STATE_DIR = path.join(CK_TMP_DIR, 'session');

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
 * Get swap directory for a session
 * @param {string} sessionId - Session ID
 * @returns {string} Full path to session swap directory
 */
function getSwapDir(sessionId) {
  return path.join(SWAP_DIR, sessionId);
}

/**
 * Ensure swap directory exists for a session
 * @param {string} sessionId - Session ID
 * @returns {string} Full path to session swap directory
 */
function ensureSwapDir(sessionId) {
  const swapPath = getSwapDir(sessionId);
  ensureDir(swapPath);
  return swapPath;
}

/**
 * Get session state file path
 * @param {string} sessionId - Session ID
 * @returns {string} Full path to session state file (/tmp/ck/session/{id}.json)
 */
function getSessionStatePath(sessionId) {
  ensureDir(SESSION_STATE_DIR);
  return path.join(SESSION_STATE_DIR, `${sessionId}.json`);
}

/**
 * Initialize ClaudeKit temp directories
 * Call this at startup to ensure directories exist
 */
function initDirs() {
  ensureDir(CK_TMP_DIR);
  ensureDir(MARKERS_DIR);
  ensureDir(DEBUG_DIR);
  ensureDir(SWAP_DIR);
  ensureDir(SESSION_STATE_DIR);
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

module.exports = {
  // Directories
  CK_TMP_DIR,
  MARKERS_DIR,
  DEBUG_DIR,
  SWAP_DIR,
  SESSION_STATE_DIR,

  // Files
  CALIBRATION_PATH,

  // Helpers
  ensureDir,
  getMarkerPath,
  getDebugLogPath,
  getSwapDir,
  ensureSwapDir,
  getSessionStatePath,
  initDirs,
  cleanAll
};
