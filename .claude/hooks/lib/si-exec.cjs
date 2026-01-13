#!/usr/bin/env node
/**
 * Session Init - Safe Execution Utilities
 *
 * Safe shell command execution with timeout support.
 * Part of session-init.cjs modularization.
 *
 * @module si-exec
 */

'use strict';

const { execSync, execFileSync } = require('child_process');

/**
 * Safely execute shell command with optional timeout
 * @param {string} cmd - Command to execute
 * @param {number} timeoutMs - Timeout in milliseconds (default: 5000)
 * @returns {string|null} Command output or null on failure
 */
function execSafe(cmd, timeoutMs = 5000) {
  try {
    return execSync(cmd, {
      encoding: 'utf8',
      timeout: timeoutMs,
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
  } catch (e) {
    return null;
  }
}

/**
 * Safely execute a binary with arguments (no shell interpolation)
 * Prevents command injection and handles paths with spaces correctly
 * @param {string} binary - Path to the executable
 * @param {string[]} args - Arguments array
 * @param {number} timeoutMs - Timeout in milliseconds (default: 2000)
 * @returns {string|null} Command output or null on failure
 */
function execFileSafe(binary, args, timeoutMs = 2000) {
  try {
    return execFileSync(binary, args, {
      encoding: 'utf8',
      timeout: timeoutMs,
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
  } catch (e) {
    return null;
  }
}

module.exports = {
  execSafe,
  execFileSafe
};
