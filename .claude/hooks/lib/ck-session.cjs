#!/usr/bin/env node
/**
 * ClaudeKit Session State
 *
 * Session state persistence for plan activation and cross-hook communication.
 * Part of the ck-config-utils modularization.
 *
 * @module ck-session
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Get session temp file path
 * @param {string} sessionId - Session identifier
 * @returns {string} Path to session temp file
 */
function getSessionTempPath(sessionId) {
  return path.join(os.tmpdir(), `ck-session-${sessionId}.json`);
}

/**
 * Read session state from temp file
 * @param {string} sessionId - Session identifier
 * @returns {Object|null} Session state or null
 */
function readSessionState(sessionId) {
  if (!sessionId) return null;
  const tempPath = getSessionTempPath(sessionId);
  try {
    if (!fs.existsSync(tempPath)) return null;
    return JSON.parse(fs.readFileSync(tempPath, 'utf8'));
  } catch (e) {
    return null;
  }
}

/**
 * Write session state atomically to temp file
 * @param {string} sessionId - Session identifier
 * @param {Object} state - State object to persist
 * @returns {boolean} Success status
 */
function writeSessionState(sessionId, state) {
  if (!sessionId) return false;
  const tempPath = getSessionTempPath(sessionId);
  const tmpFile = tempPath + '.' + Math.random().toString(36).slice(2);
  try {
    fs.writeFileSync(tmpFile, JSON.stringify(state, null, 2));
    fs.renameSync(tmpFile, tempPath);
    return true;
  } catch (e) {
    try { fs.unlinkSync(tmpFile); } catch (_) { /* ignore */ }
    return false;
  }
}

/**
 * Clear session state
 * @param {string} sessionId - Session identifier
 * @returns {boolean} Success status
 */
function clearSessionState(sessionId) {
  if (!sessionId) return false;
  const tempPath = getSessionTempPath(sessionId);
  try {
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
    return true;
  } catch (e) {
    return false;
  }
}

module.exports = {
  getSessionTempPath,
  readSessionState,
  writeSessionState,
  clearSessionState
};
