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
const {
  loadState,
  clearState,
  detectWorkflowControl
} = require('./lib/workflow-state.cjs');

// Workflow router sub-modules
const { loadWorkflowConfig } = require('./lib/wr-config.cjs');
const { detectSkillInvocation, shouldInjectCatalog } = require('./lib/wr-detect.cjs');
const { buildCatalogInjection, buildActiveWorkflowContext } = require('./lib/wr-output.cjs');
const { handleWorkflowControl } = require('./lib/wr-control.cjs');

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
    // STEP 1: Check for workflow control commands
    // ─────────────────────────────────────────────────────────────────────────
    const controlAction = detectWorkflowControl(userPrompt);
    if (controlAction) {
      const response = handleWorkflowControl(controlAction, config);
      if (response) {
        console.log(response);
        process.exit(0);
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 2: Check for active workflow
    // ─────────────────────────────────────────────────────────────────────────
    const existingState = loadState();
    if (existingState) {
      // 2a. User is executing current step → exit silently (Decision 8)
      const invokedSkill = detectSkillInvocation(userPrompt, config);
      const currentStep = existingState.sequence[existingState.currentStep];

      if (invokedSkill && invokedSkill === currentStep) {
        process.exit(0);
      }

      // 2b. Override prefix → clear state, exit
      if (config.settings?.allowOverride && config.settings?.overridePrefix) {
        const lowerPrompt = userPrompt.toLowerCase().trim();
        if (lowerPrompt.startsWith(config.settings.overridePrefix.toLowerCase())) {
          clearState();
          process.exit(0);
        }
      }

      // 2c. All other prompts → inject full active workflow context (Decision 9)
      const activeContext = buildActiveWorkflowContext(existingState, config);
      console.log(activeContext);
      process.exit(0);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 3: No active workflow — inject catalog for qualifying prompts
    // ─────────────────────────────────────────────────────────────────────────
    if (shouldInjectCatalog(userPrompt, config)) {
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
