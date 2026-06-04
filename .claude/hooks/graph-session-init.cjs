#!/usr/bin/env node
'use strict';
/**
 * SessionStart hook — check graph availability and keep graph state fresh.
 *
 * Trigger: SessionStart → startup
 * Behavior: Check Python + tree-sitter + graph.db status silently.
 *
 * Exit: Always 0 (non-blocking).
 */

const { runHook } = require('./lib/hook-runner.cjs');
const { isGraphAvailable, invokeGraph, ensurePythonDeps } = require('./lib/graph-utils.cjs');
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

        invokeGraph('sync', [], 15000);
    },
    { outputResult: false, timeout: 180000 }
);
