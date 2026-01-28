#!/usr/bin/env node
/**
 * Bash Cleanup Hook - Cleans up tmpclaude temp files after Bash commands
 *
 * Fires: PostToolUse for Bash
 * Purpose: Clean up tmpclaude-xxxx-cwd files created by Task tool during Bash execution
 *
 * These files contain the CWD path and are created when Claude Code runs Bash
 * commands in subagents. They should be cleaned up but sometimes aren't.
 *
 * Design: Ultra-lightweight, non-blocking, fast (<10ms target)
 */

'use strict';

const { runHookSync } = require('./lib/hook-runner.cjs');
const { debug } = require('./lib/debug-log.cjs');
const { cleanupTempFiles } = require('./lib/temp-cleanup.cjs');

runHookSync('bash-cleanup', () => {
  const cleaned = cleanupTempFiles();

  if (cleaned > 0) {
    debug('bash-cleanup', `Removed ${cleaned} tmpclaude temp file(s)`);
  }
});
