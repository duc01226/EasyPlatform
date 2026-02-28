#!/usr/bin/env node
'use strict';

/**
 * PostToolUse Hook: External Memory Swap
 *
 * Externalizes large tool outputs to swap files and injects lightweight
 * pointers into conversation context for post-compaction recovery.
 */

const { runHook } = require('./lib/hook-runner.cjs');
const { shouldExternalize, externalize, buildPointer } = require('./lib/swap-engine.cjs');
const { debug } = require('./lib/debug-log.cjs');

runHook('tool-output-swap', async (event) => {
  const { toolName, toolInput, toolResult, sessionId } = event;

  try {
    if (!toolResult || !shouldExternalize(toolName, toolResult, toolInput)) {
      debug('tool-output-swap', toolResult ? `${toolName} below threshold` : 'No result');
      return;
    }

    const entry = await externalize(sessionId || process.env.CK_SESSION_ID || 'default', toolName, toolInput, toolResult);
    if (!entry) {
      debug('tool-output-swap', `${toolName} externalization skipped (limits reached)`);
      return;
    }
    debug('tool-output-swap', `Externalized ${toolName} to ${entry.swapId} (${entry.metadata.metrics.charCount} chars)`);
    console.log(buildPointer(entry));
  } catch (err) {
    // Graceful degradation - original content remains in context
    debug('tool-output-swap', `Error: ${err.message}`);
  }

}, { outputResult: false });
