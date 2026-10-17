#!/usr/bin/env node
'use strict';

if ((require.main === module || !require.main) && require('./lib/framework-runtime.cjs').skipHook(module)) return;

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
 * Unavailable-dependency case: when HEAD HAS moved but the graph toolchain is
 * not installed, the HEAD gate can never fire — the marker is only written on a
 * decided sync — so EVERY prompt paid two Python spawns to rediscover the same
 * missing package, and the state never self-healed. A bounded negative cache
 * records that verdict for `DEPS_UNAVAILABLE_TTL_MS`; `graph-session-init`
 * clears it the moment an install succeeds. The `.last-seen-head` marker is
 * still NOT written on this path — the graph genuinely is not synced, and
 * claiming otherwise would suppress the sync that follows the repair.
 *
 * Total budget: the component timeouts below sum past this hook's own declared
 * timeout, and `execFileSync` blocks the event loop so that declared timeout
 * cannot fire to stop them. HOOK_BUDGET_MS is therefore enforced HERE, by
 * handing `invokeGraph` only the wall time actually left.
 *
 * Older-checkout case: when HEAD is BEHIND the graph (an older branch or
 * commit the graph already covers), `sync` returns `graph_ahead_skipped` and
 * changes nothing — that rule lives in the Python sync, not here, so every
 * caller of `sync` gets it. This hook still records the HEAD as evaluated so
 * the no-op is not recomputed on every subsequent prompt.
 *
 * Graph mode 'off' (`hooks.codeGraph.enabled` in docs/project-config.json) keeps
 * this hook inert even when an old graph.db exists: no git, no Python.
 *
 * Exit: Always 0 (non-blocking). The prompt is never gated on graph freshness.
 */

const { runHook } = require('./lib/hook-runner.cjs');
const {
    codeGraphMode,
    isGraphAvailable,
    isDepsUnavailableCached,
    markDepsUnavailable,
    clearDepsUnavailable,
    invokeGraph,
    getGraphDbPath,
    getGitHead,
    readLastSeenHead,
    writeLastSeenHead,
    acquireUpdateLock,
    releaseUpdateLock
} = require('./lib/graph-utils.cjs');
const { isConfigPopulated, loadProjectConfig } = require('./lib/project-config-loader.cjs');
const { debug } = require('./lib/debug-log.cjs');

const TAG = 'graph-prompt-sync';

/**
 * Wall-clock ceiling for everything this hook does, in ms.
 *
 * Held below the declared `timeout: 30000` so the hook returns on its own
 * terms rather than being reported as timed out. The runner's timeout races a
 * promise against a handler that blocks the event loop in `execFileSync`, so
 * it can only ever report the overrun after the fact — it cannot prevent it.
 */
const HOOK_BUDGET_MS = 20000;

/** Below this much remaining budget, starting a sync is not worth the spawn. */
const MIN_SYNC_MS = 3000;

runHook(
    TAG,
    async () => {
        const startedAt = Date.now();

        // Config not initialized; project init/prompt gates own user-facing guidance.
        if (!isConfigPopulated()) return;

        // Fast-path: no graph to keep fresh. Checked before anything spawns.
        if (!require('fs').existsSync(getGraphDbPath())) return;

        // Graph switched off: an old graph.db must not keep sync work running.
        if (codeGraphMode({ config: loadProjectConfig() }) !== 'active') return;

        const head = getGitHead();
        if (!head) return; // not a git repo, or git unavailable

        // The gate: HEAD unchanged since the last evaluation -> nothing to do.
        // This is what makes a per-prompt hook affordable.
        if (readLastSeenHead() === head) {
            debug(TAG, 'HEAD unchanged, skipping');
            return;
        }

        // A recent check already found the toolchain missing. Skip the two
        // Python spawns isGraphAvailable() would cost to learn that again.
        if (isDepsUnavailableCached()) {
            debug(TAG, 'Dependencies recorded unavailable, skipping probe');
            return;
        }

        const status = isGraphAvailable();
        if (!status.available) {
            // Never auto-install from a prompt hook — graph-session-init owns
            // repair. Record the verdict so the next prompt is free.
            debug(TAG, 'Graph unavailable, recording verdict');
            markDepsUnavailable();
            return;
        }
        clearDepsUnavailable();

        // Serialize against graph-auto-update so two processes never write at once.
        if (!acquireUpdateLock()) {
            debug(TAG, 'Update lock held, deferring to next prompt');
            return; // marker deliberately NOT written — retry on the next prompt
        }

        try {
            const remainingMs = HOOK_BUDGET_MS - (Date.now() - startedAt);
            if (remainingMs < MIN_SYNC_MS) {
                debug(TAG, `Only ${remainingMs}ms of budget left, deferring sync`);
                return; // marker deliberately NOT written — retry on the next prompt
            }

            const result = invokeGraph('sync', [], Math.min(15000, remainingMs));
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
