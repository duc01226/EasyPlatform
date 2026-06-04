#!/usr/bin/env node
'use strict';

/**
 * Verify Copilot mirror divergence — drift gate for the generated GitHub Copilot
 * instruction set (.github/copilot-instructions.md + .github/instructions/*).
 *
 * ORACLE PATTERN: this checker imports the SAME generator functions the writer
 * (sync-copilot-workflows.cjs) uses, so "expected" output can never drift from
 * real behavior. If the committed .github files differ from a fresh generation,
 * the Copilot mirror is stale → exit 1. Re-sync with:
 *   node .claude/scripts/sync-copilot-workflows.cjs
 *
 * Mirrors the Codex gate (.claude/scripts/codex/verify-sync-divergence.mjs):
 * same fail-open policy (internal error → WARN + exit 0, never wedge a commit),
 * same CRLF-normalized comparison, same bounded diff reporting.
 *
 * Usage:
 *   node .claude/scripts/verify-copilot-divergence.cjs
 *
 * Exit codes:
 *   0 — mirror in sync (PASS) OR internal error (fail-open WARN)
 *   1 — genuine drift detected (FAIL)
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const WORKFLOWS_PATH = path.join(ROOT, '.claude', 'workflows.json');
const COPILOT_MAIN_REL = path.join('.github', 'copilot-instructions.md');
const INSTRUCTIONS_REL = path.join('.github', 'instructions');
const INSTRUCTIONS_DIR = path.join(ROOT, INSTRUCTIONS_REL);
const COMMON_PROTOCOL_FILENAME = 'common-protocol.instructions.md';

const MAX_REPORTED_DIFFS = 50;

/** Normalize line endings so a CRLF/LF mismatch is never reported as drift. */
function normalize(text) {
    return String(text).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

/** Display relative paths with forward slashes regardless of platform. */
function toDisplayPath(relPath) {
    return relPath.split(path.sep).join('/');
}

/**
 * Build the expected Copilot output set by regenerating from sources of truth.
 * Keys are repo-relative paths; values are file contents.
 * @returns {Map<string,string>}
 */
function buildExpected() {
    // Lazy require: generator LOAD errors must hit main()'s fail-open catch,
    // not crash at module scope where nothing guards them.
    const gen = require('./sync-copilot-workflows.cjs');
    const { registry, projectInstructions } = gen.loadCopilotRegistry();
    const projectConfig = gen.loadProjectConfig();
    const workflowConfig = JSON.parse(fs.readFileSync(WORKFLOWS_PATH, 'utf8'));

    const expected = new Map();
    expected.set(COPILOT_MAIN_REL, gen.generateProjectSpecificFile(registry, projectInstructions, projectConfig));
    expected.set(
        path.join(INSTRUCTIONS_REL, COMMON_PROTOCOL_FILENAME),
        gen.generateCommonProtocolFile(workflowConfig)
    );
    for (const [filename, content] of gen.buildInstructionFiles()) {
        expected.set(path.join(INSTRUCTIONS_REL, filename), content);
    }
    return expected;
}

/**
 * Read the committed Copilot output set from disk. Scans the known output
 * locations so stale/extra generated files are also surfaced.
 * @returns {Map<string,string>}
 */
function readCommitted() {
    const actual = new Map();

    const mainAbs = path.join(ROOT, COPILOT_MAIN_REL);
    if (fs.existsSync(mainAbs)) {
        actual.set(COPILOT_MAIN_REL, fs.readFileSync(mainAbs, 'utf8'));
    }

    if (fs.existsSync(INSTRUCTIONS_DIR)) {
        for (const f of fs.readdirSync(INSTRUCTIONS_DIR)) {
            if (!f.endsWith('.instructions.md')) continue;
            actual.set(path.join(INSTRUCTIONS_REL, f), fs.readFileSync(path.join(INSTRUCTIONS_DIR, f), 'utf8'));
        }
    }

    return actual;
}

/**
 * Diff expected (freshly generated) vs actual (committed) content maps.
 * @returns {Array<{relPath: string, kind: 'content'|'missing-in-mirror'|'extra-in-mirror'}>}
 *   - content            : file exists in both but content differs
 *   - missing-in-mirror  : generator expects the file, it's not committed
 *   - extra-in-mirror    : committed file the generator no longer produces
 */
function diffMaps(expected, actual) {
    const diffs = [];

    for (const [relPath, expectedContent] of expected) {
        if (!actual.has(relPath)) {
            diffs.push({ relPath, kind: 'missing-in-mirror' });
        } else if (normalize(expectedContent) !== normalize(actual.get(relPath))) {
            diffs.push({ relPath, kind: 'content' });
        }
    }

    for (const relPath of actual.keys()) {
        if (!expected.has(relPath)) {
            diffs.push({ relPath, kind: 'extra-in-mirror' });
        }
    }

    diffs.sort((a, b) => (a.relPath < b.relPath ? -1 : a.relPath > b.relPath ? 1 : 0));
    return diffs;
}

function main() {
    const expected = buildExpected();
    const actual = readCommitted();
    const diffs = diffMaps(expected, actual);

    if (diffs.length === 0) {
        console.log('[copilot-divergence] PASS — Copilot mirror is in sync with sources.');
        process.exit(0);
    }

    console.error(`[copilot-divergence] FAIL — ${diffs.length} file(s) diverge from generated output:`);
    for (const d of diffs.slice(0, MAX_REPORTED_DIFFS)) {
        console.error(`  ${d.kind.padEnd(18)} ${toDisplayPath(d.relPath)}`);
    }
    if (diffs.length > MAX_REPORTED_DIFFS) {
        console.error(`  ... and ${diffs.length - MAX_REPORTED_DIFFS} more`);
    }
    console.error('');
    console.error('Re-sync the Copilot mirror:  node .claude/scripts/sync-copilot-workflows.cjs');
    console.error('(then re-stage the .github changes). Bypass once with: git commit --no-verify');
    process.exit(1);
}

module.exports = { diffMaps, readCommitted, buildExpected };

if (require.main === module) {
    try {
        main();
    } catch (err) {
        // Fail-open: a bug in the gate must never block a commit. Only genuine
        // drift (exit 1 above) blocks; internal errors warn and pass.
        console.warn(`[copilot-divergence] WARN — verifier error, skipping gate: ${err.message}`);
        process.exit(0);
    }
}
