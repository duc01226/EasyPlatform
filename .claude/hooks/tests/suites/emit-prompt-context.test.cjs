/**
 * emitPromptContext Test Suite — Codex JSON-parser-safety invariant.
 *
 * init-prompt-gate.cjs emits UserPromptSubmit guidance as plaintext stdout, which
 * BOTH Claude and Codex accept as prompt context. Codex, however, routes
 * JSON-looking stdout ({...} / [...]) through its JSON parser. emitPromptContext
 * prefixes such messages with "Hook context:\n" so Codex treats them as plaintext
 * instead of failing/garbling a JSON parse.
 *
 * Invariant under test (TC-EPC-001..005):
 *   - A message whose first non-whitespace char is `{` or `[` is emitted as
 *     "Hook context:\n" + trimmedStart(message).
 *   - Any other message is emitted verbatim (no prefix).
 *   - Empty / nullish messages emit nothing.
 *
 * This is the regression net for the Codex-safety branch added in the de-hooking
 * refactor; it is otherwise only exercised indirectly via the staleness/agent-files
 * gate paths.
 */

const path = require('path');
const { assertEqual, assertTrue } = require('../lib/assertions.cjs');

const { emitPromptContext } = require(path.resolve(__dirname, '../../init-prompt-gate.cjs'));

// Capture stdout written via console.log during fn(). Returns array of logged args[0].
function captureLog(fn) {
    const lines = [];
    const original = console.log;
    console.log = (...args) => { lines.push(args.length ? String(args[0]) : ''); };
    try {
        fn();
    } finally {
        console.log = original;
    }
    return lines;
}

module.exports = {
    name: 'emit-prompt-context',
    tests: [
        {
            name: 'TC-EPC-001: brace-leading message gets Hook context: prefix',
            fn() {
                const out = captureLog(() => emitPromptContext('{"decision":"block"}'));
                assertEqual(out.length, 1, 'expected exactly one stdout write');
                assertEqual(out[0], 'Hook context:\n{"decision":"block"}', 'brace-leading message must be prefixed');
            },
        },
        {
            name: 'TC-EPC-002: bracket-leading message gets Hook context: prefix',
            fn() {
                const msg = '[project-context] Reference docs are stale.';
                const out = captureLog(() => emitPromptContext(msg));
                assertEqual(out.length, 1, 'expected exactly one stdout write');
                assertEqual(out[0], `Hook context:\n${msg}`, 'bracket-leading message must be prefixed');
            },
        },
        {
            name: 'TC-EPC-003: plain text message is emitted verbatim (no prefix)',
            fn() {
                const msg = 'Reference doc scan skipped. Gate dismissed for 7 days.';
                const out = captureLog(() => emitPromptContext(msg));
                assertEqual(out.length, 1, 'expected exactly one stdout write');
                assertEqual(out[0], msg, 'plain message must be emitted unchanged');
                assertTrue(!out[0].startsWith('Hook context:'), 'plain message must NOT be prefixed');
            },
        },
        {
            name: 'TC-EPC-004: leading whitespace before brace/bracket still triggers prefix (trimStart)',
            fn() {
                const out = captureLog(() => emitPromptContext('\n  [stale] docs'));
                assertEqual(out.length, 1, 'expected exactly one stdout write');
                assertEqual(out[0], 'Hook context:\n[stale] docs', 'whitespace-then-bracket must trim and prefix');
            },
        },
        {
            name: 'TC-EPC-005: empty / nullish message emits nothing',
            fn() {
                assertEqual(captureLog(() => emitPromptContext('')).length, 0, 'empty string must emit nothing');
                assertEqual(captureLog(() => emitPromptContext(null)).length, 0, 'null must emit nothing');
                assertEqual(captureLog(() => emitPromptContext(undefined)).length, 0, 'undefined must emit nothing');
                assertEqual(captureLog(() => emitPromptContext('   ')).length, 1, 'whitespace-only is non-empty -> emitted verbatim');
            },
        },
    ],
};
