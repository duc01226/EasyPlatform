#!/usr/bin/env node
'use strict';

/**
 * Edit Enforcement - Unified PreToolUse Hook for Edit|Write|MultiEdit|NotebookEdit
 *
 * Replaces todo-enforcement (Edit branch) + edit-complexity-tracker with a single
 * process per edit operation.
 *
 * Logic flow:
 *   1. Quick mode bypass (CK_QUICK_MODE or quick: prefix)
 *   2. hasTodos? → allow (user is tracking)
 *   3. isExemptFile? → check plan warnings → allow
 *   4. Non-exempt, no tasks → BLOCK (exit 1)
 *
 * Exit Codes:
 *   0 - Allow (non-blocking)
 *   1 - Block with message (no tasks + non-exempt file)
 *
 * @module edit-enforcement
 */

const fs = require('fs');
const path = require('path');
const { hasTodos, recordBypass } = require('./lib/todo-state.cjs');

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const FILE_MOD_TOOLS = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit']);

// Files exempt from task-tracking enforcement
const EXEMPT_PATTERNS = [
  /\.claude[/\\]hooks[/\\]/,
  /\.claude[/\\]skills[/\\]/,
  /plans[/\\]/,
  /\.json$/,
  /\.md$/,
];

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function isExemptFile(filePath) {
  if (!filePath) return true;
  return EXEMPT_PATTERNS.some(p => p.test(filePath));
}

// ═══════════════════════════════════════════════════════════════════════════
// MESSAGES
// ═══════════════════════════════════════════════════════════════════════════

function editBlockMessage(toolName, filePath) {
  return `## Task Tracking Enforcement

**Blocked:** \`${toolName}\` on \`${filePath}\`

File modifications require task tracking. Call \`TaskCreate\` to break your work into tasks BEFORE making file changes.

### Bypass

Prefix your message with \`quick:\` to bypass enforcement.`;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

function main() {
  try {
    const stdin = fs.readFileSync(0, 'utf-8').trim();
    if (!stdin) process.exit(0);

    const payload = JSON.parse(stdin);
    const toolName = payload.tool_name || '';

    if (!FILE_MOD_TOOLS.has(toolName)) process.exit(0);

    // Quick mode bypass
    if (process.env.CK_QUICK_MODE === 'true') {
      recordBypass();
      process.exit(0);
    }

    // If tasks exist, user is tracking → allow
    if (hasTodos()) {
      process.exit(0);
    }

    // Get the primary file path for exempt check
    const primaryPath = payload.tool_input?.file_path
      || payload.tool_input?.notebook_path
      || payload.tool_input?.edits?.[0]?.file_path
      || '';

    // Exempt files are allowed without tasks
    if (isExemptFile(primaryPath)) {
      process.exit(0);
    }

    // Non-exempt file + no tasks → BLOCK
    console.log(editBlockMessage(toolName, primaryPath));
    process.exit(1);

  } catch (error) {
    // Fail-open: log to stderr so failures are detectable, but don't block
    console.error(`[edit-enforcement] Uncaught error — allowing operation: ${error.message}`);
    process.exit(0);
  }
}

main();
