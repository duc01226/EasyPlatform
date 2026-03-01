'use strict';
/**
 * Shared base for PreToolUse context injector hooks.
 *
 * Extracts common boilerplate: stdin parsing, tool_name check, file path
 * extraction, knowledge path skip, and dedup check. Each hook provides
 * domain-specific logic via the buildContext callback.
 *
 * Consumers: frontend-context, backend-context, design-system-context,
 *            scss-styling-context, knowledge-context
 */

const fs = require('fs');
const { isKnowledgePath } = require('./project-config-loader.cjs');
const { CODE_PATTERNS: SHARED_PATTERN_MARKER, DEDUP_LINES } = require('./dedup-constants.cjs');

/**
 * Check if a marker was recently injected in the transcript.
 * @param {string} transcriptPath
 * @param {string} marker - Dedup marker string
 * @param {number} lines - Number of trailing lines to check
 * @returns {boolean}
 */
function wasRecentlyInjected(transcriptPath, marker, lines) {
    try {
        if (!transcriptPath || !fs.existsSync(transcriptPath)) return false;
        const transcript = fs.readFileSync(transcriptPath, 'utf-8');
        return transcript.split('\n').slice(-lines).join('\n').includes(marker);
    } catch {
        return false;
    }
}

/**
 * Check if code patterns were recently injected (shared across frontend/backend).
 * @param {string} transcriptPath
 * @returns {boolean}
 */
function werePatternRecentlyInjected(transcriptPath) {
    return wasRecentlyInjected(transcriptPath, SHARED_PATTERN_MARKER, DEDUP_LINES.CODE_PATTERNS);
}

/**
 * Parse PreToolUse stdin and extract common fields.
 * Returns null if the hook should exit (wrong tool, no file path, etc.)
 * @param {object} [options]
 * @param {boolean} [options.skipKnowledgeCheck=false] - Skip isKnowledgePath check (for knowledge-context itself)
 * @returns {{ filePath: string, transcriptPath: string, payload: object } | null}
 */
function parsePreToolUseInput(options = {}) {
    const stdin = fs.readFileSync(0, 'utf-8').trim();
    if (!stdin) return null;

    const payload = JSON.parse(stdin);
    const toolName = payload.tool_name || '';
    const toolInput = payload.tool_input || {};
    const transcriptPath = payload.transcript_path || '';

    if (!['Edit', 'Write', 'MultiEdit'].includes(toolName)) return null;

    const filePath = toolInput.file_path || toolInput.filePath || '';
    if (!filePath) return null;

    if (!options.skipKnowledgeCheck && isKnowledgePath(filePath)) return null;

    return { filePath, transcriptPath, payload };
}

module.exports = { parsePreToolUseInput, wasRecentlyInjected, werePatternRecentlyInjected };
