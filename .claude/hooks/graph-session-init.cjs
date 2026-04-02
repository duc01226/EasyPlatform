#!/usr/bin/env node
'use strict';
/**
 * SessionStart hook — check graph availability and inject guidance.
 *
 * Trigger: SessionStart → startup
 * Behavior: Check Python + tree-sitter + graph.db status.
 *           Output appropriate guidance message via stdout.
 *
 * Exit: Always 0 (non-blocking).
 */

const { runHook } = require('./lib/hook-runner.cjs');
const { isGraphAvailable, invokeGraph, ensurePythonDeps } = require('./lib/graph-utils.cjs');

runHook(
    'graph-session-init',
    async () => {
        let status = isGraphAvailable();

        // Auto-install: if Python exists but deps missing, create venv and install
        if (status.python && !status.deps) {
            console.log('[code-graph] Dependencies missing — auto-installing into project venv...');
            const result = ensurePythonDeps();
            if (result.ok) {
                console.log(result.message);
                // Re-check availability after install
                status = isGraphAvailable();
            } else {
                console.log(result.message);
                return;
            }
        }

        if (!status.python) {
            console.log(
                '[code-graph] Python 3.10+ not detected.\n' +
                    'Graph-powered code review is disabled. To enable:\n' +
                    '1. Install Python 3.10+: https://www.python.org/downloads/\n' +
                    '2. Restart this session (deps will auto-install).'
            );
            return;
        }

        if (!status.deps) {
            // ensurePythonDeps was attempted above but failed — show fallback
            console.log(
                '[code-graph] Auto-install failed. Manual fallback:\n' +
                    'Run: pip install tree-sitter tree-sitter-language-pack networkx\n' +
                    'Then: /graph-build'
            );
            return;
        }

        if (!status.graph) {
            console.log('[code-graph] Dependencies installed but no graph built yet.\n' + 'Run /graph-build to enable graph-powered code review.');
            return;
        }

        // Fully available — auto-sync with git then show stats
        const syncResult = invokeGraph('sync', [], 15000);
        if (syncResult && syncResult.status === 'ok' && syncResult.files_synced > 0) {
            console.log(
                `[code-graph] Auto-synced graph with git: ${syncResult.summary}\n` +
                    'Use /graph-blast-radius, /graph-build, /graph-query for structural code intelligence.'
            );
            return;
        }

        // Sync complete (or up-to-date) — show normal stats
        const stats = invokeGraph('status', [], 10000);
        if (stats && stats.status === 'ok') {
            console.log(
                `[code-graph] Knowledge graph active. ` +
                    `${stats.files_count} files, ${stats.total_nodes} nodes, ${stats.total_edges} edges.\n` +
                    'Use /graph-blast-radius, /graph-build, /graph-query for structural code intelligence.'
            );
        } else {
            console.log('[code-graph] Graph available but status check failed.\n' + 'Run /graph-build to rebuild.');
        }
    },
    { outputResult: false, timeout: 180000 }
);
