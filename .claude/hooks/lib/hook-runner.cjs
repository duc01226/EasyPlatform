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

"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { parseStdinSync, parseHookEvent, parseJsonInput } = require("./stdin-parser.cjs");
const {
  debug,
  logError,
  recordHookDecision,
} = require("./debug-log.cjs");

// Default timeout for async hooks (15 seconds). This script-level limit is why most settings
// entries declare no `timeout`: the host default, measured in minutes, is never reached. A
// synchronous hook has no timer here, so one that runs under a short host budget (session end)
// declares its limit in settings instead.
const DEFAULT_TIMEOUT_MS = 15000;
const MAX_PRE_TOOL_INPUT_BYTES = 1024 * 1024;
const TIMEOUT_DRAIN_GRACE_MS = 500;

/**
 * Create a promise that rejects after timeout
 * @param {number} ms - Timeout in milliseconds
 * @param {string} name - Hook name for error message
 * @returns {Promise} Promise that rejects on timeout
 */
function timeoutPromise(ms, name) {
  let timer;
  const promise = new Promise((_, reject) => {
    // Keep this timer referenced until the race settles. An unref'd timer lets
    // a never-resolving hook process exit 0 before its timeout can report the
    // failure, which is indistinguishable from a successful hook to the host.
    timer = setTimeout(
      () => reject(Object.assign(new Error(`Hook ${name} timed out after ${ms}ms`), { code: "HOOK_TIMEOUT" })),
      ms,
    );
  });
  return {
    promise,
    cancel() {
      clearTimeout(timer);
    },
  };
}

/** Absolute, symlink/junction-resolved form of `target`; the plain resolved path when it cannot be resolved. */
function canonicalPath(target, realpath) {
  const resolved = path.resolve(target);
  try {
    return realpath(resolved);
  } catch {
    return resolved;
  }
}

/**
 * True when `mod` (the caller's `module`) is the running hook entry point, on BOTH launch shapes:
 * `node <hook>` (Claude/OpenCode: `require.main === mod`) and the Codex mirror launcher
 * `node -e "…require(path.join(root, hookPath))" -- <hookPath>` (`require.main` undefined; the
 * launcher chdirs to the root first, so the relative argv[1] resolves to the hook file).
 *
 * Node records `mod.filename` as the REAL path, so both sides are canonicalized before comparing —
 * otherwise a framework reached through a symlink or junction never matches and every hook using
 * this check becomes a silent no-op on Codex. Windows paths compare case-insensitively.
 * Twin of scripts/lib/project-root.cjs isInvokedAsScript (ESM CLIs; minimal stand-in in
 * codex/verify-sdd-semantic-compliance.mjs); keep them in step.
 * `options` (tests only): `main`, `argv`, `platform`, `realpath`. Never throws.
 */
function isHookEntryPoint(mod, options = {}) {
  try {
    if (!mod || typeof mod.filename !== "string") return false;
    const main = Object.prototype.hasOwnProperty.call(options, "main") ? options.main : require.main;
    if (main === mod) return true;
    if (main) return false;
    const argv = options.argv || process.argv;
    if (typeof argv[1] !== "string" || argv[1] === "") return false;
    const realpath = options.realpath || fs.realpathSync.native;
    const invoked = canonicalPath(argv[1], realpath);
    const self = canonicalPath(mod.filename, realpath);
    return (options.platform || process.platform) === "win32"
      ? invoked.toLowerCase() === self.toLowerCase()
      : invoked === self;
  } catch {
    return false; // fail-open: entry-point detection must never throw out of a required module
  }
}

function finishTimedOutHook(code) {
  // A timeout must stop live handles. Flush queued output before terminating;
  // a stalled host pipe cannot extend the hook lifetime without bound.
  const watchdog = setTimeout(() => process.exit(code), TIMEOUT_DRAIN_GRACE_MS);
  let remaining = 2;
  const drained = () => {
    if (--remaining === 0) {
      clearTimeout(watchdog);
      process.exit(code);
    }
  };
  for (const stream of [process.stdout, process.stderr]) {
    try {
      stream.write("", drained);
    } catch {
      drained();
    }
  }
}

function readPreToolInput() {
  const chunks = [];
  let totalBytes = 0;
  const buffer = Buffer.allocUnsafe(64 * 1024);
  while (true) {
    const bytesRead = fs.readSync(0, buffer, 0, buffer.length, null);
    if (bytesRead === 0) break;
    totalBytes += bytesRead;
    if (totalBytes > MAX_PRE_TOOL_INPUT_BYTES) {
      throw new Error(`PreToolUse stdin payload exceeds ${MAX_PRE_TOOL_INPUT_BYTES} bytes`);
    }
    chunks.push(Buffer.from(buffer.subarray(0, bytesRead)));
  }
  const raw = Buffer.concat(chunks, totalBytes).toString("utf8");
  if (!raw.trim()) throw new Error("empty PreToolUse stdin payload");
  return parseJsonInput(raw);
}

function validatePreToolInput(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("PreToolUse payload must be a JSON object");
  }
  if (typeof input.tool_name !== "string" || input.tool_name.trim() === "") {
    throw new Error("PreToolUse payload is missing tool_name");
  }
  if (!input.tool_input || typeof input.tool_input !== "object" || Array.isArray(input.tool_input)) {
    throw new Error("PreToolUse payload is missing an object tool_input");
  }
  const eventName = input.hook_event_name || input.event;
  if (eventName !== undefined && eventName !== "PreToolUse") {
    throw new Error("Expected PreToolUse event; unsupported event type");
  }
  return input;
}

function normalizeResult(name, result) {
  let normalized;
  if (result === undefined || result === null) normalized = {};
  else if (typeof result === "string") normalized = { stdout: result };
  else if (typeof result === "number") normalized = { code: result };
  else if (typeof result === "object") normalized = result;
  else normalized = { code: 2, stderr: `${name}: hook returned an invalid result\n`, decision: "error" };

  let code = normalized.code ?? 0;
  if (code !== 0 && code !== 2) {
    return {
      code: 2,
      stdout: "",
      stderr: `${name}: hook returned unsupported exit code ${code}\n`,
      decision: "error",
    };
  }

  const stdout = typeof normalized.stdout === "string" ? normalized.stdout : "";
  let stderr = typeof normalized.stderr === "string" ? normalized.stderr : "";
  let safeStdout = stdout;
  if (code === 2 && stdout) {
    safeStdout = "";
    stderr += `${name}: blocking hook output was discarded; blocks must use stderr\n`;
  }
  if (code === 2 && !stderr.trim()) {
    stderr = `${name}: hook blocked without a diagnostic message\n`;
  }
  return {
    code,
    stdout: safeStdout,
    stderr,
    decision: normalized.decision || (code === 2 ? "block" : "allow"),
    error: normalized.error,
  };
}

function finishPreToolHook(name, input, result, startedAt, options = {}) {
  const outcome = normalizeResult(name, result);
  const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;

  try {
    if (outcome.stdout) process.stdout.write(outcome.stdout);
    if (outcome.stderr) process.stderr.write(outcome.stderr.endsWith("\n") ? outcome.stderr : `${outcome.stderr}\n`);
  } catch (error) {
    // Keep any transport failure visible and make the result a blocking error
    // when the original outcome was not already a block.
    logError(name, `hook output transport failed: ${error.message}`);
    if (outcome.code !== 2) outcome.code = options.transportErrorCode ?? options.errorExitCode ?? 2;
  }

  try {
    recordHookDecision(name, {
      code: outcome.code,
      decision: outcome.decision,
      durationMs,
      eventName: input?.hook_event_name || input?.event || "PreToolUse",
      toolName: input?.tool_name || "unknown",
      error: outcome.error,
    });
  } catch (error) {
    logError(name, `hook decision logging failed: ${error.message}`);
  }

  // Do not call process.exit after writing output. Node's natural drain is
  // required for Claude Code to receive the complete stderr/stdout payload.
  process.exitCode = outcome.code;
  return outcome.code;
}

function hookErrorResult(name, error, code) {
  return {
    code,
    stderr: `${name}: ${error instanceof Error ? error.message : String(error)}\n`,
    decision: code === 2 ? "error-block" : "error-allow",
    error,
  };
}

/**
 * Stream-safe PreToolUse wrapper for synchronous hook handlers.
 * The handler returns undefined for allow or an outcome object with code,
 * stdout and stderr. Input/handler failures are always observable.
 */
function runPreToolHookSync(name, handler, options = {}) {
  const startedAt = process.hrtime.bigint();
  let input;
  try {
    input = readPreToolInput();
    validatePreToolInput(input);
  } catch (error) {
    const code = options.inputErrorCode ?? options.errorExitCode ?? 0;
    return finishPreToolHook(name, null, hookErrorResult(name, error, code), startedAt, options);
  }

  try {
    return finishPreToolHook(name, input, handler(input), startedAt, options);
  } catch (error) {
    const code = options.errorExitCode ?? 0;
    return finishPreToolHook(name, input, hookErrorResult(name, error, code), startedAt, options);
  }
}

/** Async counterpart of runPreToolHookSync for handlers with async work. */
async function runPreToolHook(name, handler, options = {}) {
  const startedAt = process.hrtime.bigint();
  let input;
  try {
    input = readPreToolInput();
    validatePreToolInput(input);
  } catch (error) {
    const code = options.inputErrorCode ?? options.errorExitCode ?? 0;
    return finishPreToolHook(name, null, hookErrorResult(name, error, code), startedAt, options);
  }

  try {
    return finishPreToolHook(name, input, await handler(input), startedAt, options);
  } catch (error) {
    const code = options.errorExitCode ?? 0;
    return finishPreToolHook(name, input, hookErrorResult(name, error, code), startedAt, options);
  }
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
    timeout = DEFAULT_TIMEOUT_MS,
  } = options;

  try {
    const input = parseEvent
      ? parseHookEvent({ context: name })
      : parseStdinSync({ context: name });

    debug(name, "Starting hook execution");

    // Execute handler with timeout protection
    const handlerPromise = Promise.resolve(handler(input));
    const timeoutState = timeout > 0 ? timeoutPromise(timeout, name) : null;
    let result;
    try {
      result = timeoutState
        ? await Promise.race([handlerPromise, timeoutState.promise])
        : await handlerPromise;
    } finally {
      timeoutState?.cancel();
    }

    if (outputResult && result !== undefined) {
      if (typeof result === "string") {
        process.stdout.write(result);
      } else if (result !== null) {
        process.stdout.write(JSON.stringify(result));
      }
    }

    debug(name, "Hook completed successfully");
    process.exitCode = exitCode;
  } catch (error) {
    logError(name, error);
    process.exitCode = errorExitCode;
    if (error?.code === "HOOK_TIMEOUT") finishTimedOutHook(errorExitCode);
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
    outputResult = false,
  } = options;

  try {
    const input = parseEvent
      ? parseHookEvent({ context: name })
      : parseStdinSync({ context: name });

    debug(name, "Starting hook execution (sync)");

    const result = handler(input);

    if (outputResult && result !== undefined) {
      if (typeof result === "string") {
        process.stdout.write(result);
      } else if (result !== null) {
        process.stdout.write(JSON.stringify(result));
      }
    }

    debug(name, "Hook completed successfully");
    process.exitCode = exitCode;
  } catch (error) {
    logError(name, error);
    process.exitCode = errorExitCode;
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
    const input = parseEvent
      ? parseHookEvent({ context: name })
      : parseStdinSync({ context: name });

    debug(name, "Running blocking hook validation");

    // Execute validator with timeout protection
    const validatorPromise = Promise.resolve(validator(input));
    const timeoutState = timeout > 0 ? timeoutPromise(timeout, name) : null;
    let result;
    try {
      result = timeoutState
        ? await Promise.race([validatorPromise, timeoutState.promise])
        : await validatorPromise;
    } finally {
      timeoutState?.cancel();
    }

    if (result && result.allowed === false) {
      // Output rejection message to stderr — Claude Code displays stderr from exit-2 hooks
      if (result.message) {
        process.stderr.write(result.message);
      }
      debug(name, "Hook blocked execution");
      process.exitCode = 2; // Exit code 2 = block the action
      return;
    }

    debug(name, "Hook allowed execution");
    process.exitCode = 0;
  } catch (error) {
    logError(name, error);
    process.exitCode = 0; // Preserve the generic wrapper's non-blocking contract.
    if (error?.code === "HOOK_TIMEOUT") finishTimedOutHook(0);
  }
}

module.exports = {
  runHook,
  runHookSync,
  runBlockingHook,
  runPreToolHook,
  runPreToolHookSync,
  isHookEntryPoint,
  MAX_PRE_TOOL_INPUT_BYTES,
};
