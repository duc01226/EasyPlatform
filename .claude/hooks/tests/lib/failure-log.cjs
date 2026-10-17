/**
 * Failure-log hygiene for the aggregate runner.
 *
 * `run-all-tests.cjs` persists a JSON failure log to `os.tmpdir()/ck/` on every
 * failing run. These helpers decide what that file may contain and how long it
 * survives. They live here rather than in the runner so the suite that asserts
 * them can require them WITHOUT requiring the runner mid-run — a suite loaded by
 * the runner that then loads the runner back is a circular require whose exports
 * are half-populated depending on load order.
 */

'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// The log is a diagnostic, not a transcript. `debug-log.cjs:118-122` already
// decided that question for this repo's other persisted sink — it strips error
// MESSAGES because "error messages often contain absolute config paths or command
// text" — and the runner writes to a sibling path under the same `os.tmpdir()/ck/`
// root. It cannot follow that rule literally: naming the failing test IS the log's
// purpose, and a record with no message names nothing. So it keeps the message and
// removes what made the sibling sink refuse one — the machine identifiers inside
// the paths. On Windows every `os.tmpdir()` string embeds the local account name,
// and this sink, unlike CLAUDE_HOOK_DEBUG, is not opt-in: it writes on every
// failing run.
function buildRedactions() {
  return [
    [process.env.CLAUDE_PROJECT_DIR, '<repo>'],
    [os.tmpdir(), '<tmp>'],
    [os.homedir(), '<home>']
  ]
    .filter(([value]) => typeof value === 'string' && value.length > 2)
    // Longest first: on Windows the home directory is a PREFIX of the temp
    // directory, and replacing it first would leave `<home>\AppData\Local\Temp`
    // — redacted, but no longer recognisable as the temp root.
    .sort((a, b) => b[0].length - a[0].length);
}

// A path reaches the log in whatever separator and casing the producing process
// used, so a plain string replace catches one spelling and leaves the rest.
const escapeForRegExp = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function buildRedactionPatterns() {
  return buildRedactions().map(([value, label]) => [
    new RegExp(escapeForRegExp(value).replace(/\\\\|\//g, '[\\\\/]'), 'gi'),
    label
  ]);
}

// Rebuilt on demand rather than frozen at load: CLAUDE_PROJECT_DIR is set by the
// runner's own startup code, and a module-scope snapshot would capture whatever
// was set at require time.
const MAX_LOGGED_FAILURES = 200;
const MAX_ERROR_CHARS = 2000;
const MAX_STACK_CHARS = 4000;
const RETAINED_FAILURE_LOGS = 10;

function redact(value, limit) {
  if (value === null || value === undefined) return value;
  let text = String(value);
  for (const [pattern, label] of buildRedactionPatterns()) text = text.replace(pattern, label);
  // Bounded because one entry can carry `stdout.slice(-1200)` + `stderr.slice(-500)`
  // of a child script, and a suite-wide failure multiplies that by every test in it.
  return text.length > limit ? `${text.slice(0, limit)}\n…[truncated ${text.length - limit} chars]` : text;
}

// Retention, because nothing else deletes these. `%TEMP%` is not purged by default
// on Windows, so a repeatedly-flaky gate otherwise accumulates one file per failing
// run forever — the same unbounded-sink problem `debug-log.cjs:133-143` rotates to
// avoid. Newest kept. Every failure here is swallowed on purpose: this runs inside
// an ALREADY failing run, and a housekeeping error must never replace the real
// failure it was called to record.
function pruneFailureLogs(dir, keep) {
  try {
    const logs = fs.readdirSync(dir)
      .filter(name => /^hook-test-failures-.*\.json$/.test(name))
      .map(name => ({ name, mtimeMs: fs.statSync(path.join(dir, name)).mtimeMs }))
      .sort((a, b) => b.mtimeMs - a.mtimeMs);
    for (const stale of logs.slice(keep)) {
      try {
        fs.unlinkSync(path.join(dir, stale.name));
      } catch (error) {
        // A concurrent run holds it, or already removed it. Not this run's problem.
      }
    }
  } catch (error) {
    // No directory yet, or it cannot be listed. Nothing to prune.
  }
}

module.exports = {
  redact,
  pruneFailureLogs,
  buildRedactionPatterns,
  MAX_LOGGED_FAILURES,
  MAX_ERROR_CHARS,
  MAX_STACK_CHARS,
  RETAINED_FAILURE_LOGS
};
