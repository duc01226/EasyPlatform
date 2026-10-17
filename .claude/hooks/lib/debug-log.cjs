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

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const isDebugEnabled = () => process.env.CK_DEBUG === '1' || process.env.CK_DEBUG === 'true';
const isHookDebugEnabled = () => process.env.CLAUDE_HOOK_DEBUG === '1' || process.env.CLAUDE_HOOK_DEBUG === 'true';
const HOOK_DEBUG_MAX_BYTES = 1024 * 1024;

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

// Seven Bash PreToolUse hooks fire on the SAME tool call, each in its own process,
// each appending to the SAME file: an interleaved open is the normal case here, not
// an anomaly. On Windows an append that lands inside a peer's open handle fails with
// EPERM/EBUSY/EACCES, and on any host a peer's rotation can move the file out from
// under this call (ENOENT). Reporting those to stderr made a benign race read as a
// hook fault — and a hook writing to stderr on an ALLOW is precisely what the Bash
// contract suite asserts against, so the race surfaced as an intermittent failure of
// a safety gate instead of as a logging hiccup.
const CONCURRENT_ACCESS_CODES = new Set(['EACCES', 'EBUSY', 'EEXIST', 'ENOENT', 'EPERM']);

// Retry rather than reclassify. Silencing these codes would also silence a sink that
// is genuinely broken — a log path that is a directory, a read-only volume — because
// those surface under the same names. A transient race clears within a few
// milliseconds; a broken sink fails every attempt and is still reported. The total
// added wait is 30ms, only on the opt-in CLAUDE_HOOK_DEBUG path, and only when a
// write has already failed once.
const APPEND_RETRY_DELAYS_MS = [2, 8, 20];

const isConcurrentAccessError = error => CONCURRENT_ACCESS_CODES.has(error?.code);

// Synchronous by necessity: recordHookDecision runs on the hook's exit path, where
// there is no event loop turn left to await.
function sleepSync(milliseconds) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
}

// Did a peer actually rotate the file, or did the rename just fail? Re-reads the
// size instead of inferring it from the errno, so a rename that CANNOT succeed is
// never mistaken for one another process already did.
function stillOversized(logPath, line) {
  try {
    const stat = fs.statSync(logPath);
    return stat.isFile() && stat.size + Buffer.byteLength(line) > HOOK_DEBUG_MAX_BYTES;
  } catch (error) {
    // Gone entirely — the peer's rename did land, or something removed it. Either
    // way there is no oversized file here to bound.
    return false;
  }
}

function appendWithRetry(logPath, line) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      fs.appendFileSync(logPath, line, 'utf8');
      return;
    } catch (error) {
      if (attempt >= APPEND_RETRY_DELAYS_MS.length || !isConcurrentAccessError(error)) throw error;
      sleepSync(APPEND_RETRY_DELAYS_MS[attempt]);
    }
  }
}

/**
 * Write a diagnostic without ever using stdout. The second fallback is only
 * for an already-broken stderr stream; there is no reliable process-local
 * channel beyond it.
 */
function writeDiagnostic(context, message) {
  const line = `[${context}] ${message}\n`;
  try {
    process.stderr.write(line);
  } catch (stderrError) {
    try {
      console.error(line.trim());
    } catch (consoleError) {
      // The host closed both diagnostic streams. Do not throw from logging.
    }
  }
}

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
    } catch (error) {
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
  writeDiagnostic(context, `ERROR: ${errorMessage(error)}`);
}

/**
 * Log error only if debug mode is enabled (for non-critical errors)
 * @param {string} context - Hook or module name for prefix
 * @param {Error|string} error - Error to log
 */
function debugError(context, error) {
  if (isDebugEnabled()) {
    const message = errorMessage(error);
    const stack = error instanceof Error ? error.stack : '';
    console.error(`[${context}] ERROR: ${message}`);
    if (stack) console.error(stack);
  }
}

/**
 * Record one PreToolUse decision when the opt-in hook diagnostics switch is on.
 * The record deliberately excludes command/path contents: it is for lifecycle
 * diagnosis, not a second transcript. The file is bounded and rotates once.
 *
 * @param {string} context
 * @param {{code?: number, decision?: string, durationMs?: number, toolName?: string, eventName?: string, error?: Error|string}} details
 */
function recordHookDecision(context, details = {}) {
  if (!isHookDebugEnabled()) return;

  const entry = {
    timestamp: new Date().toISOString(),
    hook: context,
    event: details.eventName || 'PreToolUse',
    tool: details.toolName || 'unknown',
    decision: details.decision || (details.code === 2 ? 'block' : 'allow'),
    code: details.code ?? 0,
    durationMs: Math.max(0, Number(details.durationMs) || 0)
  };
  if (details.error) {
    entry.error = {
      name: details.error instanceof Error ? details.error.name : 'Error',
      // Error messages often contain absolute config paths or command text.
      // The opt-in file is deliberately a lifecycle trace, not a transcript.
      code: typeof details.error?.code === 'string' ? details.error.code : 'HOOK_ERROR'
    };
  }

  const line = `${JSON.stringify(entry)}\n`;
  const logPath = process.env.CLAUDE_HOOK_DEBUG_LOG ||
    path.join(os.tmpdir(), 'ck', 'debug', 'bash-hooks.log');

  try {
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
    let stat = null;
    try {
      stat = fs.statSync(logPath);
    } catch (statError) {
      // existsSync-then-statSync is itself a race: a peer's rotation between the
      // two calls turned a missing file into a thrown ENOENT. Nothing to rotate
      // in that case — fall through and let the append create the file.
      if (!isConcurrentAccessError(statError)) throw statError;
    }
    if (stat?.isFile() && stat.size + Buffer.byteLength(line) > HOOK_DEBUG_MAX_BYTES) {
      const backup = `${logPath}.1`;
      try {
        if (fs.existsSync(backup)) fs.unlinkSync(backup);
        fs.renameSync(logPath, backup);
      } catch (rotateError) {
        // A peer hook rotating the same file at the same instant loses this race
        // by design: it already moved the oversized file aside, so the bound is
        // held and there is nothing here to report. Truncating anyway would
        // destroy the fresh file that peer just started.
        //
        // "The peer rotated" is CHECKED, never assumed — the same codes also
        // cover a rename that simply cannot succeed (a locked `.1`, a read-only
        // volume). If the active file is still oversized, no peer rotated, and
        // this falls through to the visible report plus truncation that keeps the
        // sink bounded. Silence here would trade a stderr line for unbounded growth.
        if (!isConcurrentAccessError(rotateError) || stillOversized(logPath, line)) {
          writeDiagnostic(context, `CLAUDE_HOOK_DEBUG rotation failed: ${errorMessage(rotateError)}`);
          // A failed rename must not turn a bounded diagnostic sink into an
          // unbounded append-only file. Start a fresh active file instead.
          fs.writeFileSync(logPath, '', 'utf8');
        }
      }
    }
    appendWithRetry(logPath, line);
  } catch (error) {
    // A failed diagnostic sink must itself be visible and must never alter the
    // hook's policy decision or write a misleading stdout record.
    writeDiagnostic(context, `CLAUDE_HOOK_DEBUG log failure: ${errorMessage(error)}`);
  }
}

/**
 * Record an internal best-effort failure while retaining the caller's policy.
 * This is used by advisory hooks for expected fail-open branches.
 */
function reportHookInternalError(context, label, error) {
  writeDiagnostic(context, `${label}: ${errorMessage(error)}`);
}

module.exports = {
  debug,
  debugJson,
  debugError,
  logError,
  isDebugEnabled,
  isHookDebugEnabled,
  recordHookDecision,
  reportHookInternalError
};
