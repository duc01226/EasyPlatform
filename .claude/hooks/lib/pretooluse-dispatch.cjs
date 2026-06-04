'use strict';
/**
 * Shared PreToolUse context-dispatcher runtime (Phase 04).
 *
 * Each consolidated dispatcher hook is a thin wrapper that calls runDispatcher()
 * with an ordered list of builder functions. This helper centralises the
 * invariant boilerplate so every dispatcher behaves identically:
 *
 *   1. Read stdin ONCE, parse the PreToolUse payload.
 *   2. Load the transcript lines ONCE (single-scan, M1) and hand the same array
 *      to every builder for dedup — no builder re-reads the transcript file.
 *   3. Run each builder under its OWN try/catch (fault isolation): a throwing
 *      builder yields '' and never aborts the others. Critically, this preserves
 *      blocking-gate independence — these dispatchers carry ONLY inject-only
 *      builders, never a gate, so a swallowed throw can never mask an exit-2/deny.
 *   4. Concatenate non-empty trimmed blocks with '\n' (M4 join rule) and emit
 *      via console.log. ALWAYS exit 0 (non-blocking, fail-open).
 *
 * Equivalence (M4): for any tool, joining this dispatcher's emitted block(s) with
 * the other dispatchers' blocks (each trimmed, empties filtered, '\n' separator)
 * is byte-identical to joining the legacy hooks' trimmed stdout in legacy reg
 * order. Builder order within each dispatcher MUST match legacy reg/emit order.
 */

const fs = require('fs');
const { loadTranscriptLines } = require('./transcript-utils.cjs');

/**
 * Run a builder with fault isolation. Returns a trimmed string block, or '' on
 * any failure / non-string return.
 * @param {(payload: object, preloadedLines: string[]|null) => string} fn
 * @param {object} payload
 * @param {string[]|null} preloadedLines
 * @returns {string}
 */
function safeBlock(fn, payload, preloadedLines) {
    try {
        const out = fn(payload, preloadedLines);
        if (typeof out !== 'string') return '';
        return out.trim();
    } catch (err) {
        // Fail-open (drop this block, never abort siblings), but leave a breadcrumb:
        // an unexpected builder throw is invisible otherwise → "context mysteriously missing".
        console.error(`[pretooluse-dispatch] builder ${fn.name || '<anon>'} threw: ${err && err.message}`);
        return '';
    }
}

/**
 * Execute an ordered builder list against the current PreToolUse stdin payload
 * and emit the concatenated context block.
 *
 * @param {Array<(payload: object, preloadedLines: string[]|null) => string>} builders
 *        Ordered builders. Order MUST reproduce the legacy reg/emit order so the
 *        cross-dispatcher concatenation stays byte-equivalent.
 * @param {object} [opts]
 * @param {string} [opts.name] - dispatcher name for stderr diagnostics
 */
function runDispatcher(builders, opts = {}) {
    try {
        const stdin = fs.readFileSync(0, 'utf-8').trim();
        if (!stdin) process.exit(0);

        let payload;
        try {
            payload = JSON.parse(stdin);
        } catch {
            process.exit(0); // malformed payload → fail-open, emit nothing
        }

        // Single transcript scan shared by every builder's dedup check (M1).
        // null when there's no transcript yet → builders treat as "not injected".
        const preloadedLines = loadTranscriptLines(payload.transcript_path || '');

        const blocks = [];
        for (const fn of builders) {
            const block = safeBlock(fn, payload, preloadedLines);
            if (block !== '') blocks.push(block);
        }

        if (blocks.length > 0) {
            console.log(blocks.join('\n'));
        }
    } catch (error) {
        if (opts.name) console.error(`[${opts.name}] ${error.message}`);
        // fail-open
    }
    process.exit(0);
}

module.exports = { runDispatcher, safeBlock };
