#!/usr/bin/env node
'use strict';

if ((require.main === module || !require.main) && require('./lib/framework-runtime.cjs').skipHook(module)) return;

/**
 * SessionStart hook — check graph availability and keep graph state fresh.
 *
 * Trigger: SessionStart → startup|resume
 * Behavior: Check Python + tree-sitter + graph.db, then reconcile the graph
 *           with git HEAD via `sync` — so commits that landed from someone
 *           else (pull/merge/checkout) while this session was away get
 *           re-parsed before any query reads the graph.
 *
 *           `resume` is included because a resumed session is exactly the
 *           case where the working tree moved without this session seeing it.
 *           Mid-session HEAD changes are covered by `graph-prompt-sync`.
 *
 * Opt-in: acts only while the code graph is active (`codeGraphMode`, set by
 *         `hooks.codeGraph.enabled` in docs/project-config.json). Mode 'auto'
 *         without a built graph, and mode 'off', install nothing and start no
 *         process — a project that never chose the graph gets no surprise venv.
 *
 * Exit: Always 0 (non-blocking).
 */

const { runHook } = require('./lib/hook-runner.cjs');
const {
    codeGraphMode,
    isGraphAvailable,
    invokeGraph,
    ensurePythonDeps,
    getGitHead,
    writeLastSeenHead,
    markDepsUnavailable,
    clearDepsUnavailable
} = require('./lib/graph-utils.cjs');
const { isConfigPopulated, loadProjectConfig } = require('./lib/project-config-loader.cjs');

runHook(
    'graph-session-init',
    async () => {
        // Config not initialized; project init/prompt gates own user-facing guidance.
        if (!isConfigPopulated()) return;

        // Install and sync only for a graph the project uses (BR-ADS-02).
        if (codeGraphMode({ config: loadProjectConfig() }) !== 'active') return;

        let status = isGraphAvailable();

        // Auto-install: if Python exists but deps missing, create venv and install.
        if (status.python && !status.deps) {
            const result = ensurePythonDeps();
            if (result.ok) {
                status = isGraphAvailable();
            } else {
                return;
            }
        }

        // Publish the verdict for the per-prompt hook, which cannot afford to
        // probe it itself. Clearing it here is what makes a repair take effect
        // IMMEDIATELY: this is the only hook that installs, so without this the
        // freshly-fixed toolchain would stay suppressed until the TTL expired.
        if (!status.python || !status.deps) {
            markDepsUnavailable();
            return;
        }
        clearDepsUnavailable();

        if (!status.graph) return;

        const result = invokeGraph('sync', [], 15000);

        // Record the HEAD this sync settled, so the first `graph-prompt-sync`
        // of the session sees an up-to-date marker instead of spawning Python
        // again only to be told `up_to_date`. Skipped when the sync failed, so
        // the prompt hook still retries.
        if (result) {
            const head = getGitHead();
            if (head) writeLastSeenHead(head);
        }
    },
    { outputResult: false, timeout: 180000 }
);
