#!/usr/bin/env node
/**
 * SessionEnd Hook - Cleanup on session end (clear, compact, exit)
 */

const fs = require('fs');
const { deleteMarker } = require('./lib/context-tracker.cjs');
const { clearState: clearWorkflowState, cleanupLegacyStateFile } = require('./lib/workflow-state.cjs');
const { clearEditState } = require('./lib/edit-state.cjs');
const { cleanupTempFiles } = require('./lib/temp-cleanup.cjs');

let _swapEngine = null;
function getSwapEngine() {
  if (_swapEngine) return _swapEngine;

  try {
    _swapEngine = require('./lib/swap-engine.cjs');
  } catch (e) {
    if (process.env.CK_DEBUG) console.error(`[session-end] Failed to load swap-engine: ${e.message}`);
    return null;
  }
  return _swapEngine;
}

function cleanupSwapFiles(reason, sessionId) {
  const engine = getSwapEngine();
  if (!engine) return;

  try {
    const config = engine.loadConfig();
    if (!config.enabled) return;

    if (reason === 'clear') {
      engine.deleteSessionSwap(sessionId);
      return;
    }

    if (reason === 'compact') {
      engine.cleanupSwapFiles(sessionId, config.retention?.defaultHours || 24);
      engine.cleanupOrphans(sessionId);
    }
  } catch (e) {
    if (process.env.CK_DEBUG) console.error(`[session-end] Swap cleanup error: ${e.message}`);
  }
}

async function main() {
  try {
    const stdin = fs.readFileSync(0, 'utf-8').trim();
    const data = stdin ? JSON.parse(stdin) : {};
    const reason = data.reason || 'unknown';
    const sessionId = data.session_id || null;

    // Always clean up temp files on session end
    // These files (tmpclaude-xxxx-cwd) are created by Task tool during the session
    cleanupTempFiles();

    // Clean up swap files based on trigger type
    if (sessionId) {
      cleanupSwapFiles(reason, sessionId);
    }

    // Delete marker on /clear to reset context baseline
    // SessionEnd fires with OLD session_id before new session starts
    // This ensures clean slate for the next session
    if (reason === 'clear' && sessionId) {
      deleteMarker(sessionId);
      // Clear workflow state (per-session file) and edit state on session clear
      clearWorkflowState(sessionId);
      cleanupLegacyStateFile();
      clearEditState();
    }

    process.exit(0);
  } catch (error) {
    process.exit(0);
  }
}

main();
