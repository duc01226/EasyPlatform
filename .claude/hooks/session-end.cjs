#!/usr/bin/env node
/**
 * SessionEnd Hook - Cleanup on session end
 *
 * Fires: When session ends (clear, compact, user exit)
 * Purpose: Clean up tmpclaude temp/swap files and stale snapshots on session end
 *
 * Exit Codes:
 *   0 - Success (non-blocking)
 */

'use strict';

const fs = require('fs');
const { runHookSync } = require('./lib/hook-runner.cjs');
const { debug } = require('./lib/debug-log.cjs');
const { cleanupAll } = require('./lib/temp-file-cleanup.cjs');
const { cleanupSwapFiles, deleteSessionSwap } = require('./lib/swap-engine.cjs');
const { getSnapshotPath } = require('./lib/ck-paths.cjs');

runHookSync('session-end', event => {
    const reason = event.reason || 'unknown';
    const sessionId = event.session_id || null;

    debug('session-end', `Reason: ${reason}, Session: ${sessionId}`);

    // Clean up tmpclaude temp files (project root + .claude/ recursively)
    cleanupAll();

    // Clean up swap files based on reason
    if (sessionId) {
        if (reason === 'clear' || reason === 'exit') {
            // Full cleanup on clear/exit - delete entire swap directory
            deleteSessionSwap(sessionId);
            debug('session-end', `Deleted swap directory for session ${sessionId}`);
            try {
                const snapshotPath = getSnapshotPath(sessionId);
                if (fs.existsSync(snapshotPath)) fs.unlinkSync(snapshotPath);
            } catch (e) {
                debug('session-end', `Failed to clean snapshot: ${e.message}`);
            }
        } else if (reason === 'compact') {
            // On compact, only cleanup old files (keep recent for recovery)
            cleanupSwapFiles(sessionId, 24); // 24 hour retention
            debug('session-end', `Cleaned old swap files for session ${sessionId}`);
        }
    }
});
