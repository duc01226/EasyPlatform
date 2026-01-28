/**
 * Hook execution wrapper for Claude hooks
 *
 * Provides consistent error handling and exit behavior across all hooks.
 * Hooks should use this to wrap their main logic.
 *
 * Features:
 * - Automatic timeout protection (default 15s) to prevent hangs
 * - Consistent error handling with non-blocking exit codes
 * - Optional result output to stdout
 *
 * @example
 * const { runHook } = require('./lib/hook-runner.cjs');
 *
 * runHook('my-hook', async (event) => {
 *   // Hook logic here
 *   return { output: 'result' };
 * });
 */

'use strict';

const { parseStdinSync, parseHookEvent } = require('./stdin-parser.cjs');
const { debug, debugError } = require('./debug-log.cjs');

// Default timeout for async hooks (15 seconds)
const DEFAULT_TIMEOUT_MS = 15000;

/**
 * Create a promise that rejects after timeout
 * @param {number} ms - Timeout in milliseconds
 * @param {string} name - Hook name for error message
 * @returns {Promise} Promise that rejects on timeout
 */
function timeoutPromise(ms, name) {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Hook ${name} timed out after ${ms}ms`)), ms);
  });
}

/**
 * Run a hook with standard error handling and exit behavior
 *
 * @param {string} name - Hook name for logging
 * @param {Function} handler - Hook handler function (sync or async)
 * @param {Object} options - Execution options
 * @param {number} options.exitCode - Exit code on success (default: 0)
 * @param {number} options.errorExitCode - Exit code on error (default: 0, non-blocking)
 * @param {boolean} options.parseEvent - Parse stdin as hook event (default: true)
 * @param {boolean} options.outputResult - Output handler result to stdout (default: false)
 * @param {number} options.timeout - Timeout in ms (default: 15000, 0 = no timeout)
 */
async function runHook(name, handler, options = {}) {
  const {
    exitCode = 0,
    errorExitCode = 0,
    parseEvent = true,
    outputResult = false,
    timeout = DEFAULT_TIMEOUT_MS
  } = options;

  try {
    const input = parseEvent ? parseHookEvent({ context: name }) : parseStdinSync({ context: name });

    debug(name, 'Starting hook execution');

    // Execute handler with timeout protection
    const handlerPromise = Promise.resolve(handler(input));
    const result = timeout > 0
      ? await Promise.race([handlerPromise, timeoutPromise(timeout, name)])
      : await handlerPromise;

    if (outputResult && result !== undefined) {
      if (typeof result === 'string') {
        process.stdout.write(result);
      } else if (result !== null) {
        process.stdout.write(JSON.stringify(result));
      }
    }

    debug(name, 'Hook completed successfully');
    process.exit(exitCode);
  } catch (error) {
    debugError(name, error);
    process.exit(errorExitCode);
  }
}

/**
 * Run a hook synchronously with standard error handling
 *
 * @param {string} name - Hook name for logging
 * @param {Function} handler - Hook handler function (sync only)
 * @param {Object} options - Same as runHook options
 */
function runHookSync(name, handler, options = {}) {
  const {
    exitCode = 0,
    errorExitCode = 0,
    parseEvent = true,
    outputResult = false
  } = options;

  try {
    const input = parseEvent ? parseHookEvent({ context: name }) : parseStdinSync({ context: name });

    debug(name, 'Starting hook execution (sync)');

    const result = handler(input);

    if (outputResult && result !== undefined) {
      if (typeof result === 'string') {
        process.stdout.write(result);
      } else if (result !== null) {
        process.stdout.write(JSON.stringify(result));
      }
    }

    debug(name, 'Hook completed successfully');
    process.exit(exitCode);
  } catch (error) {
    debugError(name, error);
    process.exit(errorExitCode);
  }
}

/**
 * Create a blocking hook that can reject with exit code 2
 * Used for pre-tool hooks that need to block execution
 *
 * @param {string} name - Hook name for logging
 * @param {Function} validator - Function that returns { allowed: boolean, message?: string }
 * @param {Object} options - Execution options
 * @param {number} options.timeout - Timeout in ms (default: 15000, 0 = no timeout)
 */
async function runBlockingHook(name, validator, options = {}) {
  const { parseEvent = true, timeout = DEFAULT_TIMEOUT_MS } = options;

  try {
    const input = parseEvent ? parseHookEvent({ context: name }) : parseStdinSync({ context: name });

    debug(name, 'Running blocking hook validation');

    // Execute validator with timeout protection
    const validatorPromise = Promise.resolve(validator(input));
    const result = timeout > 0
      ? await Promise.race([validatorPromise, timeoutPromise(timeout, name)])
      : await validatorPromise;

    if (result && result.allowed === false) {
      // Output rejection message for Claude to see
      if (result.message) {
        process.stdout.write(result.message);
      }
      debug(name, 'Hook blocked execution');
      process.exit(2); // Exit code 2 = block the action
    }

    debug(name, 'Hook allowed execution');
    process.exit(0);
  } catch (error) {
    debugError(name, error);
    process.exit(0); // Non-blocking on error (timeout or exception = allow)
  }
}

module.exports = {
  runHook,
  runHookSync,
  runBlockingHook
};
