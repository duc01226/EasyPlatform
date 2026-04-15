#!/usr/bin/env node
'use strict';

/**
 * PostToolUse Hook: Agent Result Validator
 * Fires: PostToolUse (matcher: "Agent")
 *
 * Detects truncated/incomplete subagent results and injects a markdown warning.
 * Heuristics (fail-open — exit 0 always):
 *   1. Empty result
 *   2. length <200 AND no terminal punctuation (.!?)
 *   3. Result references a plans/ path that does not exist on disk
 */

const fs = require('fs');
const path = require('path');
const { runHook } = require('./lib/hook-runner.cjs');
const { debug } = require('./lib/debug-log.cjs');

/** Minimum result length to skip the short-result heuristic */
const MIN_HEALTHY_LENGTH = 200;

/** Regex: terminal punctuation as last non-whitespace character */
const TERMINAL_PUNCT_RE = /[.!?]\s*$/;

/** Regex: plans/ or docs/ report path referenced inside result text */
const REPORT_PATH_RE = /plans\/(?:reports\/[\w\-.]+\.md|[\w-]+\/[\w\-.]+\.md)/g;

/**
 * Check if toolResult looks like a truncated / incomplete output.
 * @param {string} result - The coerced string value of toolResult
 * @returns {{ truncated: boolean, reason: string | null }}
 */
function detectTruncation(result) {
    // Heuristic 1: empty
    if (!result || result.trim().length === 0) {
        return { truncated: true, reason: 'empty result' };
    }

    // Heuristic 2: short AND no terminal punctuation
    if (result.length < MIN_HEALTHY_LENGTH && !TERMINAL_PUNCT_RE.test(result)) {
        return {
            truncated: true,
            reason: `result is ${result.length} chars with no terminal punctuation`
        };
    }

    return { truncated: false, reason: null };
}

/**
 * Check if any report path referenced in the result is missing on disk.
 * @param {string} result
 * @param {string} cwd
 * @returns {string | null} First missing path, or null if all exist / none referenced
 */
function detectMissingReport(result, cwd) {
    const matches = [...result.matchAll(REPORT_PATH_RE)];
    for (const match of matches) {
        const reportPath = path.resolve(cwd, match[0]);
        if (!fs.existsSync(reportPath)) {
            return match[0];
        }
    }
    return null;
}

/**
 * Build the warning markdown block.
 * @param {string} reason - Short description of why truncation was detected
 * @returns {string}
 */
function buildWarning(reason) {
    return [
        '',
        '> ⚠️ **Subagent result appears truncated or incomplete.**',
        `> Detected: ${reason}.`,
        '>',
        '> The subagent may have exhausted its context or step budget mid-task.',
        '> **Before continuing:**',
        '> 1. Check `tmp/ck-agent-*.progress.md` for any partial work written by the subagent.',
        '> 2. Re-read any files the subagent was supposed to modify.',
        '> 3. Re-spawn the subagent with a focused, scoped prompt if needed.',
        '',
    ].join('\n');
}

runHook('post-agent-validator', (event) => {
    const { toolName, toolResult } = event;

    // Only validate Agent tool calls (matcher should filter, but double-check)
    if (toolName !== 'Agent') {
        debug('post-agent-validator', `Skipping non-Agent tool: ${toolName}`);
        return;
    }

    // Coerce toolResult to string — it may be an empty string or an object
    const resultStr = typeof toolResult === 'string'
        ? toolResult
        : (() => {
            try { return toolResult ? JSON.stringify(toolResult) : ''; }
            catch { return String(toolResult) || ''; }
        })();

    const { truncated, reason } = detectTruncation(resultStr);

    if (truncated) {
        debug('post-agent-validator', `Truncation detected: ${reason}`);
        process.stdout.write(buildWarning(reason));
        return;
    }

    // Heuristic 3: referenced report file missing on disk
    const missingReport = detectMissingReport(resultStr, process.cwd());
    if (missingReport) {
        const missingReason = `result references "${missingReport}" which does not exist`;
        debug('post-agent-validator', `Missing report: ${missingReport}`);
        process.stdout.write(buildWarning(missingReason));
        return;
    }

    debug('post-agent-validator', `Result looks healthy (${resultStr.length} chars)`);
});
