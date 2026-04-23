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
 * NOTE: Only cleans .claude/ — NOT the project root. CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR=1
 * stores tmpclaude-xxx-cwd state files in the project root between bash calls; deleting them
 * here corrupts the next command's CWD wrapper (exit code 126). session-end.cjs handles
 * full project-root cleanup at session end.
 *
 * Design: Ultra-lightweight, non-blocking, fast (<10ms target)
 */

'use strict';

const path = require('path');
const { runHookSync } = require('./lib/hook-runner.cjs');
const { debug } = require('./lib/debug-log.cjs');
const { cleanupDirRecursive } = require('./lib/temp-file-cleanup.cjs');

runHookSync('bash-cleanup', () => {
  const claudeDir = path.join(process.env.CLAUDE_PROJECT_DIR || process.cwd(), '.claude');
  const cleaned = cleanupDirRecursive(claudeDir, 5);

  if (cleaned > 0) {
    debug('bash-cleanup', `Removed ${cleaned} tmpclaude temp file(s)`);
  }
});
