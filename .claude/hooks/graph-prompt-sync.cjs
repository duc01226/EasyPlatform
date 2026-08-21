#!/usr/bin/env node
'use strict';
/**
 * UserPromptSubmit hook — keep the code graph in step with git HEAD.
 *
 * Trigger: UserPromptSubmit (every prompt)
 * Behavior: Compare the current git HEAD against the last HEAD this hook
 *           evaluated. Identical -> return immediately (no Python spawned).
 *           Changed -> run the graph `sync`, which diffs the graph's
 *           last_synced_commit against HEAD and re-parses what moved.
 *
 * Why this exists: `graph-session-init` only fires at SessionStart, and
 * `graph-auto-update` only fires PostToolUse on Edit|Write|MultiEdit. Neither
 * observes a `git pull` / `git checkout` / `git merge` performed mid-session or
 * between sessions, so code that arrived from someone else was never re-parsed
 * and the graph silently answered from a stale node set.
 *
 * Cost: one `git rev-parse HEAD` (~10-20ms) on a prompt where HEAD is
 * unchanged, which is the overwhelmingly common case. Python is spawned only
 * when HEAD actually moved.
 *
 * Older-checkout case: when HEAD is BEHIND the graph (an older branch or
 * commit the graph already covers), `sync` returns `graph_ahead_skipped` and
 * changes nothing — that rule lives in the Python sync, not here, so every
 * caller of `sync` gets it. This hook still records the HEAD as evaluated so
 * the no-op is not recomputed on every subsequent prompt.
 *
 * Exit: Always 0 (non-blocking). The prompt is never gated on graph freshness.
 */

const { runHook } = require('./lib/hook-runner.cjs');
const {
    isGraphAvailable,
    invokeGraph,
    getGraphDbPath,
    getGitHead,
    readLastSeenHead,
    writeLastSeenHead,
    acquireUpdateLock,
    releaseUpdateLock
} = require('./lib/graph-utils.cjs');
const { isConfigPopulated } = require('./lib/project-config-loader.cjs');
const { debug } = require('./lib/debug-log.cjs');

const TAG = 'graph-prompt-sync';

runHook(
    TAG,
    async () => {
        // Config not initialized; project init/prompt gates own user-facing guidance.
        if (!isConfigPopulated()) return;

        // Fast-path: no graph to keep fresh. Checked before anything spawns.
        if (!require('fs').existsSync(getGraphDbPath())) return;

        const head = getGitHead();
        if (!head) return; // not a git repo, or git unavailable

        // The gate: HEAD unchanged since the last evaluation -> nothing to do.
        // This is what makes a per-prompt hook affordable.
        if (readLastSeenHead() === head) {
            debug(TAG, 'HEAD unchanged, skipping');
            return;
        }

        const status = isGraphAvailable();
        if (!status.available) return; // never auto-install from a prompt hook

        // Serialize against graph-auto-update so two processes never write at once.
        if (!acquireUpdateLock()) {
            debug(TAG, 'Update lock held, deferring to next prompt');
            return; // marker deliberately NOT written — retry on the next prompt
        }

        try {
            const result = invokeGraph('sync', [], 15000);
            debug(TAG, `sync result: ${result ? result.reason : 'failed'}`);
            // Record the HEAD as evaluated for any decided outcome, including the
            // graph-ahead no-op. On failure (null) leave the marker alone so the
            // next prompt retries rather than silently accepting a stale graph.
            if (result) writeLastSeenHead(head);
        } finally {
            releaseUpdateLock();
        }
    },
    { outputResult: false, timeout: 30000 }
);
