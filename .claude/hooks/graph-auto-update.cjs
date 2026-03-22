#!/usr/bin/env node
"use strict";
/**
 * PostToolUse hook — incremental graph update after file edits.
 *
 * Trigger: PostToolUse → Edit|Write|MultiEdit
 * Behavior: If graph available and not recently updated (3s debounce),
 *           run incremental graph update. Fails silently.
 *
 * Exit: Always 0 (non-blocking).
 */

const { runHook } = require("./lib/hook-runner.cjs");
const {
  isGraphAvailable,
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

    const status = isGraphAvailable();
    if (!status.available) return;

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
