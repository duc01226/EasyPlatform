#!/usr/bin/env node
/**
 * SessionEnd Hook - Cleanup on session end
 *
 * Fires: When session ends (clear, compact, user exit)
 * Purpose: Delete compact marker files to reset context baseline on /clear
 *          Clean up tmpclaude temp files on any session end
 *          Write pending-tasks warning for next session (exit/clear only)
 *
 * Exit Codes:
 *   0 - Success (non-blocking)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { runHookSync } = require('./lib/hook-runner.cjs');
const { debug } = require('./lib/debug-log.cjs');
const { deleteMarker } = require('./lib/context-tracker.cjs');
const { cleanupAll } = require('./lib/temp-file-cleanup.cjs');
const { cleanupSwapFiles, deleteSessionSwap } = require('./lib/swap-engine.cjs');
const { getTodoState } = require('./lib/todo-state.cjs');

const PENDING_TASKS_FILE = path.join(__dirname, '..', 'pending-tasks-warning.json');

runHookSync('session-end', (event) => {
  const reason = event.reason || 'unknown';
  const sessionId = event.session_id || null;

  debug('session-end', `Reason: ${reason}, Session: ${sessionId}`);

  // === Pending tasks warning (BEFORE cleanup) ===
  // Write warning file for exit/clear so next session sees unfinished tasks
  if ((reason === 'exit' || reason === 'clear') && sessionId) {
    try {
      const state = getTodoState(sessionId);
      if (state.inProgressCount > 0 || state.pendingCount > 0) {
        const warning = {
          inProgressCount: state.inProgressCount,
          pendingCount: state.pendingCount,
          reason,
          timestamp: new Date().toISOString(),
          lastTodos: (state.lastTodos || []).slice(0, 10)
        };
        fs.writeFileSync(PENDING_TASKS_FILE, JSON.stringify(warning, null, 2), 'utf8');
        debug('session-end', `Wrote pending-tasks warning: ${state.inProgressCount} in-progress, ${state.pendingCount} pending`);
      }
    } catch (e) {
      debug('session-end', `Failed to write pending-tasks warning: ${e.message}`);
    }
  }

  // Clean up tmpclaude temp files (project root + .claude/ recursively)
  cleanupAll();

  // Delete marker on /clear to reset context baseline
  // SessionEnd fires with OLD session_id before new session starts
  // This ensures clean slate for the next session
  if (reason === 'clear' && sessionId) {
    deleteMarker(sessionId);
    debug('session-end', `Deleted marker for session ${sessionId}`);
  }

  // Clean up swap files based on reason
  if (sessionId) {
    if (reason === 'clear' || reason === 'exit') {
      // Full cleanup on clear/exit - delete entire swap directory
      deleteSessionSwap(sessionId);
      debug('session-end', `Deleted swap directory for session ${sessionId}`);
    } else if (reason === 'compact') {
      // On compact, only cleanup old files (keep recent for recovery)
      cleanupSwapFiles(sessionId, 24); // 24 hour retention
      debug('session-end', `Cleaned old swap files for session ${sessionId}`);
    }
  }
});
