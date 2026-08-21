#!/usr/bin/env node
'use strict';
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
 * Exit: Always 0 (non-blocking).
 */

const { runHook } = require('./lib/hook-runner.cjs');
const { isGraphAvailable, invokeGraph, ensurePythonDeps, getGitHead, writeLastSeenHead } = require('./lib/graph-utils.cjs');
const { isConfigPopulated } = require('./lib/project-config-loader.cjs');

runHook(
    'graph-session-init',
    async () => {
        // Config not initialized; project init/prompt gates own user-facing guidance.
        if (!isConfigPopulated()) return;

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

        if (!status.python || !status.deps || !status.graph) return;

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
