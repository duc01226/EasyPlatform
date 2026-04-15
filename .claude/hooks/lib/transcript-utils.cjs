'use strict';
/**
 * Shared transcript utility helpers used by all prompt-context-assembler-* hooks.
 *
 * Extracted from the 4 assembler hooks where these were byte-for-byte duplicates.
 * Consumers: prompt-context-assembler.cjs, -claude, -closers, -docs, -docs-p2, -project-config
 */
const fs = require('fs');
const { TOP_DEDUP_LINES } = require('./dedup-constants.cjs');

/**
 * Check whether a dedup marker is already present in the transcript context.
 * Checks both the trailing (recency) and leading (primacy) windows.
 *
 * @param {string[]} lines - Transcript lines
 * @param {string} marker - Marker string to search for
 * @param {number} bottomWindow - Number of trailing lines to check
 * @param {number} [topWindow] - Number of leading lines to check (default TOP_DEDUP_LINES)
 * @returns {boolean}
 */
function isMarkerInContext(lines, marker, bottomWindow, topWindow = TOP_DEDUP_LINES) {
    if (!lines || lines.length === 0) return false;
    if (lines.slice(-bottomWindow).some(l => l.includes(marker))) return true;
    if (lines.slice(0, topWindow).some(l => l.includes(marker))) return true;
    return false;
}

/**
 * Load transcript lines from the given path.
 * Returns null if path is missing, unreadable, or empty.
 *
 * @param {string} transcriptPath - Absolute path to transcript file
 * @returns {string[]|null}
 */
function loadTranscriptLines(transcriptPath) {
    try {
        if (!transcriptPath || !fs.existsSync(transcriptPath)) return null;
        return fs.readFileSync(transcriptPath, 'utf-8').split('\n');
    } catch {
        return null;
    }
}

module.exports = { isMarkerInContext, loadTranscriptLines };
