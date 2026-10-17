#!/usr/bin/env node
"use strict";

if ((require.main === module || !require.main) && require('./lib/framework-runtime.cjs').skipHook(module)) return;

/**
 * PostToolUse hook — incremental graph update after file edits.
 *
 * Trigger: PostToolUse → Edit|Write|MultiEdit
 * Behavior: If graph available and not recently updated (3s debounce),
 *           run incremental graph update. Fails silently.
 *           Graph mode 'off' (`hooks.codeGraph.enabled` in docs/project-config.json)
 *           keeps it inert even when an old graph.db exists.
 *
 * Exit: Always 0 (non-blocking).
 */

const { runHook } = require("./lib/hook-runner.cjs");
const {
  codeGraphMode,
  isGraphAvailable,
  isDepsUnavailableCached,
  markDepsUnavailable,
  clearDepsUnavailable,
  wasRecentlyUpdated,
  acquireUpdateLock,
  releaseUpdateLock,
  invokeGraph,
  getGraphDbPath,
} = require("./lib/graph-utils.cjs");

runHook(
  "graph-auto-update",
  async () => {
    // Debounce first — avoids Python subprocess spawn on rapid edits
    // Also checks if another update process is currently running (lock dir)
    if (wasRecentlyUpdated()) return;

    // Fast-path: skip expensive Python checks if no graph.db exists
    if (!require("fs").existsSync(getGraphDbPath())) return;

    // Mode check only past the stat, so a project without a graph never reads config.
    const { loadProjectConfig } = require("./lib/project-config-loader.cjs");
    if (codeGraphMode({ config: loadProjectConfig() }) !== "active") return;

    // A recent check already found the toolchain missing — skip the two
    // Python spawns isGraphAvailable() would cost to learn that again.
    if (isDepsUnavailableCached()) return;

    const status = isGraphAvailable();
    if (!status.available) {
      markDepsUnavailable();
      return;
    }
    clearDepsUnavailable();

    // Acquire exclusive lock to prevent concurrent update processes
    if (!acquireUpdateLock()) return;
    try {
      invokeGraph("update", [], 5000);
    } finally {
      releaseUpdateLock();
    }
  },
  { timeout: 10000 },
);
