#!/usr/bin/env node
'use strict';

/**
 * ACE CLI Helpers - Shared Utilities for Hook Scripts
 *
 * Provides common functionality used across all ACE hooks:
 * - Stdin reading (synchronous)
 * - Hook runner with error handling
 * - Logging utilities
 *
 * @module ace-cli-helpers
 */

const fs = require('fs');
const path = require('path');

// Memory directory path
const MEMORY_DIR = path.join(__dirname, '..', '..', 'memory');

/**
 * Ensure memory directory exists
 */
function ensureMemoryDir() {
  if (!fs.existsSync(MEMORY_DIR)) {
    fs.mkdirSync(MEMORY_DIR, { recursive: true });
  }
}

/**
 * Read stdin synchronously (hooks receive JSON payload via stdin)
 * @returns {string} stdin content or empty string if error
 */
function readStdinSync() {
  try {
    return fs.readFileSync(0, 'utf-8').trim();
  } catch (e) {
    return '';
  }
}

/**
 * Parse stdin as JSON
 * @returns {Object|null} Parsed JSON or null if invalid/empty
 */
function parseStdinJson() {
  const stdin = readStdinSync();
  if (!stdin) return null;

  try {
    return JSON.parse(stdin);
  } catch (e) {
    return null;
  }
}

/**
 * Log message to ACE error log file
 * @param {string} source - Log source identifier
 * @param {string} message - Log message
 */
function logError(source, message) {
  try {
    ensureMemoryDir();
    const logFile = path.join(MEMORY_DIR, 'ace-errors.log');
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logFile, `${timestamp} | ${source} | ${message}\n`);
  } catch (e) {
    // Ignore logging errors - non-blocking
  }
}

/**
 * Run hook with standard error handling
 *
 * Handles:
 * - Reading and parsing stdin JSON
 * - Empty stdin (exits cleanly with 0)
 * - JSON parse errors (logs and exits cleanly)
 * - Handler exceptions (logs and exits cleanly)
 *
 * @param {Function} handler - Hook handler function (receives parsed payload)
 * @param {Object} options - Configuration options
 * @param {string} options.name - Hook name for logging
 * @param {boolean} options.exitOnEmpty - Exit if stdin is empty (default: true)
 * @returns {void}
 *
 * @example
 * runHook((payload) => {
 *   // Skip if not our target tool
 *   if (payload.tool_name !== 'Skill') return;
 *
 *   // Process payload
 *   processSkillExecution(payload);
 * }, { name: 'ace-event-emitter' });
 */
function runHook(handler, options = {}) {
  const { name = 'unknown-hook', exitOnEmpty = true } = options;

  try {
    const stdin = readStdinSync();

    // Exit cleanly if no input
    if (!stdin) {
      if (exitOnEmpty) process.exit(0);
      return;
    }

    // Parse JSON payload
    let payload;
    try {
      payload = JSON.parse(stdin);
    } catch (e) {
      logError(name, `JSON parse error: ${e.message}`);
      process.exit(0);
    }

    // Run handler
    handler(payload);

    // Exit cleanly
    process.exit(0);
  } catch (err) {
    // Log error and exit cleanly (non-blocking)
    logError(name, `Handler error: ${err.message}`);
    process.exit(0);
  }
}

/**
 * Run hook with async handler support
 *
 * @param {Function} handler - Async hook handler function
 * @param {Object} options - Configuration options (same as runHook)
 * @returns {Promise<void>}
 *
 * @example
 * runHookAsync(async (payload) => {
 *   await processAsync(payload);
 * }, { name: 'ace-async-hook' });
 */
async function runHookAsync(handler, options = {}) {
  const { name = 'unknown-hook', exitOnEmpty = true } = options;

  try {
    const stdin = readStdinSync();

    if (!stdin) {
      if (exitOnEmpty) process.exit(0);
      return;
    }

    let payload;
    try {
      payload = JSON.parse(stdin);
    } catch (e) {
      logError(name, `JSON parse error: ${e.message}`);
      process.exit(0);
    }

    await handler(payload);

    process.exit(0);
  } catch (err) {
    logError(name, `Handler error: ${err.message}`);
    process.exit(0);
  }
}

/**
 * Extract context metadata from environment
 * @returns {Object} Context object with branch, workflow, etc.
 */
function extractContext() {
  return {
    branch: process.env.GIT_BRANCH || process.env.CK_GIT_BRANCH || null,
    workflow_step: process.env.CK_WORKFLOW_STEP || null,
    workflow_name: process.env.CK_WORKFLOW_NAME || null,
    session_type: process.env.CK_SESSION_TYPE || null,
    session_id: process.env.CLAUDE_SESSION_ID || 'unknown'
  };
}

module.exports = {
  MEMORY_DIR,
  ensureMemoryDir,
  readStdinSync,
  parseStdinJson,
  logError,
  runHook,
  runHookAsync,
  extractContext
};
