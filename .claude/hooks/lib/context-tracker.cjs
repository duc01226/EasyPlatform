#!/usr/bin/env node
'use strict';

/**
 * Context Marker Infrastructure
 *
 * Session-scoped marker read/write used by compaction hooks.
 *
 * Architecture:
 * - No global state — each session has its own marker file
 * - Marker file consumed by `prompt-context-assembler.cjs` to emit the
 *   post-compact "CONTEXT COMPACTED" re-verify warning using `compactState.gitStatus`
 * - Markers deleted on session-end to prevent cross-session leakage
 *
 * Marker schema (current):
 * {
 *   sessionId: string,
 *   trigger: string,                   // 'manual' | 'auto' | 'unknown'
 *   timestamp: number,
 *   compactState?: {
 *     gitStatus: string,               // captured by write-compact-marker.cjs
 *     warningShown: boolean            // flipped by prompt-context-assembler.cjs after display
 *   }
 * }
 *
 * @module context-tracker
 */

const fs = require('fs');
const {
  MARKERS_DIR,
  ensureDir,
  getMarkerPath
} = require('./ck-paths.cjs');

/**
 * Read marker file for a session
 * Defensive: handles missing/empty/corrupt files gracefully
 * @param {string} sessionId - Session ID
 * @returns {Object|null} Marker data or null
 */
function readMarker(sessionId) {
  try {
    const markerPath = getMarkerPath(sessionId);
    if (!fs.existsSync(markerPath)) return null;
    const data = fs.readFileSync(markerPath, 'utf8');
    if (!data.trim()) return null; // Catch empty/corrupt files
    const marker = JSON.parse(data);
    // Basic schema validation
    if (!marker || typeof marker.sessionId !== 'string') {
      return null;
    }
    return marker;
  } catch (err) {
    // Silent fail - corrupt JSON or read error
  }
  return null;
}

/**
 * Write marker file for a session
 * @param {string} sessionId - Session ID
 * @param {Object} marker - Marker data
 */
function writeMarker(sessionId, marker) {
  try {
    ensureDir(MARKERS_DIR);
    const markerPath = getMarkerPath(sessionId);
    fs.writeFileSync(markerPath, JSON.stringify(marker));
  } catch (err) {
    // Silent fail
  }
}

/**
 * Delete marker file for a session
 * @param {string} sessionId - Session ID
 */
function deleteMarker(sessionId) {
  try {
    const markerPath = getMarkerPath(sessionId);
    if (fs.existsSync(markerPath)) {
      fs.unlinkSync(markerPath);
    }
  } catch (err) {
    // Silent fail
  }
}

/**
 * Clear all markers (for testing/cleanup)
 * Uses new /tmp/ck/ namespace
 */
function clearAllState() {
  const { cleanAll } = require('./ck-paths.cjs');
  cleanAll();
}

module.exports = {
  readMarker,
  writeMarker,
  deleteMarker,
  clearAllState
};
