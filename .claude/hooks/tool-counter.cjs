#!/usr/bin/env node
'use strict';

/**
 * Tool Counter Hook (PostToolUse)
 *
 * Tracks tool call count per session and suggests /compact at logical breakpoints.
 * - First suggestion at 50 tool calls
 * - Reminder every 20 calls thereafter (70, 90, 110...)
 * - Resets on /compact or session clear
 *
 * Integrates with context-tracker.cjs for session-specific state.
 *
 * @module tool-counter
 */

const fs = require('fs');
const { incrementToolCount, shouldSuggestCompact } = require('./lib/context-tracker.cjs');

// Read hook input from stdin
let input;
try {
  input = JSON.parse(fs.readFileSync(0, 'utf8'));
} catch (err) {
  // Invalid input - exit silently
  console.log(JSON.stringify({ result: 'continue' }));
  process.exit(0);
}

const sessionId = input.session_id || process.env.CLAUDE_SESSION_ID || 'unknown';

// Increment tool count
incrementToolCount(sessionId);

// Check if we should suggest /compact
const { shouldSuggest, count } = shouldSuggestCompact(sessionId);

// Build response
const response = { result: 'continue' };

if (shouldSuggest) {
  response.message = `## Context Checkpoint

${count}+ tool calls in this session. Consider \`/compact\` if you're at a logical breakpoint.

This helps maintain context quality for complex tasks.`;
}

console.log(JSON.stringify(response));
