#!/usr/bin/env node
'use strict';

/**
 * PostToolUse Hook: Externalizes large tool outputs to swap files with semantic summaries.
 * Injects markdown pointers into context for post-compaction recovery.
 */

const fs = require('fs');

const SUPPORTED_TOOLS = ['Read', 'Grep', 'Glob', 'Bash'];

function main() {
  let payload;
  try {
    const stdin = fs.readFileSync(0, 'utf-8').trim();
    if (!stdin) return;
    payload = JSON.parse(stdin);
  } catch {
    return;
  }

  const { tool_name, tool_input, tool_result, session_id } = payload;
  if (!SUPPORTED_TOOLS.includes(tool_name) || !tool_result) return;

  let swapEngine;
  try {
    swapEngine = require('./lib/swap-engine.cjs');
  } catch (e) {
    if (process.env.CK_DEBUG) console.error(`[tool-output-swap] Failed to load swap-engine: ${e.message}`);
    return;
  }

  if (!swapEngine.shouldExternalize(tool_name, tool_result, tool_input)) return;

  try {
    const sessionId = session_id || process.env.CK_SESSION_ID || 'default';
    const entry = swapEngine.externalize(sessionId, tool_name, tool_input, tool_result);
    if (entry) console.log(swapEngine.buildPointer(entry));
  } catch (e) {
    if (process.env.CK_DEBUG) console.error(`[tool-output-swap] Error: ${e.message}`);
  }
}

main();
process.exit(0);
