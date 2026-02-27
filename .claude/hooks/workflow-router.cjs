#!/usr/bin/env node
/**
 * Workflow Router - UserPromptSubmit Hook
 *
 * AI-native workflow detection via catalog injection.
 * Injects a workflow catalog for qualifying prompts; the AI decides which
 * workflow to follow and explicitly activates it via /workflow-start <id>.
 *
 * Features:
 * - AI-native intent detection (no regex)
 * - Catalog injection for qualifying prompts
 * - Active workflow context with conflict handling
 * - Override support (prefix with "quick:" to skip)
 *
 * Sub-modules:
 *   - wr-config.cjs  - Configuration loading
 *   - wr-detect.cjs  - Catalog building & injection heuristics
 *   - wr-output.cjs  - Output/instructions generation
 *   - wr-control.cjs - Workflow control commands
 *
 * Exit Codes:
 *   0 - Success (non-blocking)
 */

const fs = require('fs');
const { loadState } = require('./lib/workflow-state.cjs');

// Workflow router sub-modules
const { loadWorkflowConfig } = require('./lib/wr-config.cjs');
const { shouldInjectCatalog } = require('./lib/wr-detect.cjs');
const { buildCatalogInjection, buildActiveWorkflowContext } = require('./lib/wr-output.cjs');

/**
 * Main hook execution
 */
async function main() {
  try {
    const stdin = fs.readFileSync(0, 'utf-8').trim();
    if (!stdin) process.exit(0);

    const payload = JSON.parse(stdin);
    const userPrompt = payload.prompt || '';

    if (!userPrompt.trim()) process.exit(0);

    const config = loadWorkflowConfig();

    // Check if workflow detection is enabled
    if (!config.settings?.enabled) process.exit(0);

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 1: Skip for explicit slash commands and very short prompts
    // ─────────────────────────────────────────────────────────────────────────
    if (/^\/\w+/.test(userPrompt.trim())) process.exit(0);
    if (!shouldInjectCatalog(userPrompt, config)) process.exit(0);

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 2: Always inject catalog (with active workflow context if applicable)
    // ─────────────────────────────────────────────────────────────────────────
    const existingState = loadState();
    if (existingState) {
      const activeContext = buildActiveWorkflowContext(existingState, config);
      if (activeContext) console.log(activeContext);
    } else {
      const catalog = buildCatalogInjection(config);
      console.log(catalog);
    }

    process.exit(0);
  } catch (error) {
    // Non-blocking - just log and exit
    console.error(`<!-- Workflow router error: ${error.message} -->`);
    process.exit(0);
  }
}

main();
