#!/usr/bin/env node
'use strict';

/**
 * PostToolUse Hook: Externalizes large tool outputs to swap files with semantic summaries.
 * Injects markdown pointers into context for post-compaction recovery.
 */

const fs = require('fs');

const SUPPORTED_TOOLS = ['Read', 'Grep', 'Glob', 'Bash'];

/**
 * Read JSON from stdin with timeout (non-blocking)
 * @returns {Promise<Object>} Parsed JSON input
 */
async function readStdin() {
  return new Promise((resolve) => {
    let data = '';

    // Handle no stdin (TTY mode)
    if (process.stdin.isTTY) {
      resolve({});
      return;
    }

    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => { data += chunk; });
    process.stdin.on('end', () => {
      if (!data.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(data));
      } catch {
        resolve({});
      }
    });
    process.stdin.on('error', () => resolve({}));

    // Timeout after 500ms - hooks should receive input immediately
    setTimeout(() => resolve({}), 500);
  });
}

async function main() {
  const payload = await readStdin();
  if (!payload || Object.keys(payload).length === 0) {
    process.exit(0);
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

main().then(() => process.exit(0)).catch(() => process.exit(0));
