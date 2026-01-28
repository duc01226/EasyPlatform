/**
 * Debug logging utility for Claude hooks
 *
 * Provides consistent debug output controlled by CK_DEBUG environment variable.
 * All debug messages are sent to stderr to avoid interfering with hook output.
 *
 * @example
 * const { debug, debugJson } = require('./lib/debug-log.cjs');
 * debug('hook-name', 'Processing started');
 * debugJson('hook-name', 'Event data', eventData);
 */

'use strict';

const isDebugEnabled = () => process.env.CK_DEBUG === '1' || process.env.CK_DEBUG === 'true';

/**
 * Log debug message to stderr if CK_DEBUG is enabled
 * @param {string} context - Hook or module name for prefix
 * @param {...any} args - Values to log
 */
function debug(context, ...args) {
  if (isDebugEnabled()) {
    console.error(`[${context}]`, ...args);
  }
}

/**
 * Log debug message with JSON-formatted data
 * @param {string} context - Hook or module name for prefix
 * @param {string} label - Description of the data
 * @param {any} data - Data to stringify
 */
function debugJson(context, label, data) {
  if (isDebugEnabled()) {
    try {
      console.error(`[${context}] ${label}:`, JSON.stringify(data, null, 2));
    } catch {
      console.error(`[${context}] ${label}: [unserializable]`);
    }
  }
}

/**
 * Log error with context, always outputs regardless of debug flag
 * Use for actual errors that should always be visible
 * @param {string} context - Hook or module name for prefix
 * @param {Error|string} error - Error to log
 */
function logError(context, error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[${context}] ERROR: ${message}`);
}

/**
 * Log error only if debug mode is enabled (for non-critical errors)
 * @param {string} context - Hook or module name for prefix
 * @param {Error|string} error - Error to log
 */
function debugError(context, error) {
  if (isDebugEnabled()) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : '';
    console.error(`[${context}] ERROR: ${message}`);
    if (stack) console.error(stack);
  }
}

module.exports = {
  debug,
  debugJson,
  debugError,
  logError,
  isDebugEnabled
};
