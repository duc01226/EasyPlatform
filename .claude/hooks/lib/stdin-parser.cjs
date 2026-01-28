/**
 * Stdin parsing utility for Claude hooks
 *
 * Provides consistent stdin reading and JSON parsing across all hooks.
 * Hooks receive event data via stdin as JSON.
 *
 * @example
 * const { parseStdinSync } = require('./lib/stdin-parser.cjs');
 * const eventData = parseStdinSync();
 * // eventData is {} if stdin is empty or invalid JSON
 */

'use strict';

const fs = require('fs');
const { debugError } = require('./debug-log.cjs');

/**
 * Parse stdin synchronously as JSON
 *
 * @param {Object} options - Parsing options
 * @param {any} options.defaultValue - Value to return if stdin is empty or invalid (default: {})
 * @param {boolean} options.trim - Whether to trim whitespace (default: true)
 * @param {boolean} options.throwOnError - Throw instead of returning default on parse error (default: false)
 * @param {string} options.context - Context name for debug logging (default: 'stdin-parser')
 * @returns {any} Parsed JSON or defaultValue
 */
function parseStdinSync(options = {}) {
  const {
    defaultValue = {},
    trim = true,
    throwOnError = false,
    context = 'stdin-parser'
  } = options;

  try {
    let stdin = fs.readFileSync(0, 'utf-8');
    if (trim) stdin = stdin.trim();

    if (!stdin) {
      return defaultValue;
    }

    return JSON.parse(stdin);
  } catch (error) {
    if (throwOnError) {
      throw error;
    }
    debugError(context, error);
    return defaultValue;
  }
}

/**
 * Parse stdin synchronously, returning raw string
 *
 * @param {Object} options - Parsing options
 * @param {boolean} options.trim - Whether to trim whitespace (default: true)
 * @returns {string} Raw stdin content
 */
function readStdinSync(options = {}) {
  const { trim = true } = options;

  try {
    let stdin = fs.readFileSync(0, 'utf-8');
    return trim ? stdin.trim() : stdin;
  } catch {
    return '';
  }
}

/**
 * Parse stdin and extract common hook event fields
 *
 * @param {Object} options - Parsing options (same as parseStdinSync)
 * @returns {Object} Object with { raw, hookEventName, toolName, toolInput, sessionId, ... }
 */
function parseHookEvent(options = {}) {
  const raw = parseStdinSync(options);

  return {
    raw,
    hookEventName: raw.hook_event_name || '',
    toolName: raw.tool_name || '',
    toolInput: raw.tool_input || {},
    toolResult: raw.tool_result || '',
    sessionId: raw.session_id || '',
    cwd: raw.cwd || process.cwd(),
    // Pass through all original fields
    ...raw
  };
}

module.exports = {
  parseStdinSync,
  readStdinSync,
  parseHookEvent
};
