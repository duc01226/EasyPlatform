#!/usr/bin/env node
/**
 * Post-Task Review Hook
 *
 * Enforces mandatory two-pass code review after any code changes.
 * Triggered after Edit/Write operations to remind the agent about review protocol.
 *
 * Two-Pass Review Protocol:
 * 1. First Pass: Review unstaged changes for correctness and convention compliance
 * 2. Second Pass: If first pass made corrections, re-review all changes
 *
 * Exit Codes:
 *   0 - Success (non-blocking, outputs reminder)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Track review state per session
const STATE_FILE = path.join(process.cwd(), '.claude', '.review-state.json');

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
    }
  } catch (e) {
    // Ignore errors, return fresh state
  }
  return { editCount: 0, lastReviewAt: 0, reviewPassNumber: 0 };
}

function saveState(state) {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (e) {
    // Ignore write errors
  }
}

function getUnstagedChanges() {
  try {
    const diff = execSync('git diff --stat 2>/dev/null || echo ""', {
      encoding: 'utf-8',
      timeout: 5000
    }).trim();
    return diff;
  } catch (e) {
    return '';
  }
}

function hasUnstagedChanges() {
  try {
    const status = execSync('git status --porcelain 2>/dev/null || echo ""', {
      encoding: 'utf-8',
      timeout: 5000
    }).trim();
    // Check for modified files (not just untracked)
    return status.split('\n').some(line =>
      line.startsWith(' M') || line.startsWith('M ') || line.startsWith('MM') ||
      line.startsWith(' A') || line.startsWith('A ') || line.startsWith('AM')
    );
  } catch (e) {
    return false;
  }
}

function buildReviewReminder(state, hasChanges) {
  if (!hasChanges) {
    return ''; // No changes to review
  }

  const lines = [];

  // Only remind every N edits to avoid spam
  const EDIT_THRESHOLD = 3;

  if (state.editCount >= EDIT_THRESHOLD) {
    lines.push('');
    lines.push('## Post-Task Review Protocol Reminder');
    lines.push('');
    lines.push('**MANDATORY:** Before completing this task, execute the two-pass review:');
    lines.push('');
    lines.push('### Pass 1: Initial Review');
    lines.push('1. Run `git diff` to check unstaged changes');
    lines.push('2. Verify changes are valid and correct for the task');
    lines.push('3. Ensure code follows project conventions and best practices');
    lines.push('4. Check for security vulnerabilities and edge cases');
    lines.push('');
    lines.push('### Pass 2: Re-Review (Conditional)');
    lines.push('IF Pass 1 resulted in any corrections or changes:');
    lines.push('1. Run `git diff` again to verify all changes');
    lines.push('2. Perform full code review on updated code');
    lines.push('3. Ensure corrections didn\'t introduce new issues');
    lines.push('');
    lines.push('**Execute:** `/review:post-task` or use `code-reviewer` subagent');
    lines.push('');
  }

  return lines.join('\n');
}

async function main() {
  try {
    const stdin = fs.readFileSync(0, 'utf-8').trim();
    if (!stdin) process.exit(0);

    const payload = JSON.parse(stdin);
    const toolName = payload.tool_name || '';

    // Only trigger for code modification tools
    if (!['Edit', 'Write', 'MultiEdit'].includes(toolName)) {
      process.exit(0);
    }

    // Check if tool was successful
    if (payload.tool_result?.error) {
      process.exit(0); // Don't remind on failed edits
    }

    const state = loadState();
    state.editCount++;

    const hasChanges = hasUnstagedChanges();
    const reminder = buildReviewReminder(state, hasChanges);

    if (reminder) {
      console.log(reminder);
      state.lastReviewAt = Date.now();
    }

    saveState(state);
    process.exit(0);
  } catch (error) {
    // Non-blocking - always exit 0
    process.exit(0);
  }
}

main();
