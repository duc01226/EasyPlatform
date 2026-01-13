#!/usr/bin/env node
/**
 * Workflow Router - UserPromptSubmit Hook
 *
 * Automatically detects user intent from prompts and injects workflow instructions.
 * Works with workflows.json configuration for customizable workflow definitions.
 *
 * Features:
 * - Pattern-based intent detection
 * - Configurable workflow sequences
 * - Override support (prefix with "quick:" to skip)
 * - Confidence-based confirmation for high-impact workflows
 * - Persistent workflow state tracking for long-running tasks
 *
 * Sub-modules:
 *   - wr-config.cjs  - Configuration loading
 *   - wr-detect.cjs  - Intent detection
 *   - wr-output.cjs  - Output/instructions generation
 *   - wr-control.cjs - Workflow control commands
 *
 * Exit Codes:
 *   0 - Success (non-blocking)
 */

const fs = require('fs');
const {
  loadState,
  createState,
  clearState,
  buildContinuationReminder,
  detectWorkflowControl
} = require('./lib/workflow-state.cjs');

// Workflow router sub-modules
const { loadWorkflowConfig } = require('./lib/wr-config.cjs');
const { detectIntent, detectSkillInvocation } = require('./lib/wr-detect.cjs');
const { buildWorkflowInstructions, buildConflictReminder } = require('./lib/wr-output.cjs');
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
    // STEP 2: Check for active workflow and handle intent changes
    // ─────────────────────────────────────────────────────────────────────────
    const existingState = loadState();
    if (existingState) {
      // Check if user is invoking a skill command that matches current step
      const invokedSkill = detectSkillInvocation(userPrompt, config);
      const currentStep = existingState.sequence[existingState.currentStep];

      if (invokedSkill && invokedSkill === currentStep) {
        // User is executing expected step - don't interrupt, just track
        // The step completion will be handled when skill finishes
        process.exit(0);
      }

      // Check for override prefix to abort active workflow
      if (config.settings.allowOverride && config.settings.overridePrefix) {
        const lowerPrompt = userPrompt.toLowerCase().trim();
        if (lowerPrompt.startsWith(config.settings.overridePrefix.toLowerCase())) {
          clearState();
          process.exit(0);
        }
      }

      // NEW: Check if user's prompt suggests a different workflow
      const newDetection = detectIntent(userPrompt, config);
      if (newDetection.detected && newDetection.workflowId !== existingState.workflowId) {
        // User's intent has changed - show conflict reminder
        const conflictReminder = buildConflictReminder(existingState, newDetection, config);
        console.log(conflictReminder);
        process.exit(0);
      }

      // Inject continuation reminder for active workflow
      const reminder = buildContinuationReminder();
      if (reminder) {
        console.log(reminder);
        process.exit(0);
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 3: Detect new workflow from prompt
    // ─────────────────────────────────────────────────────────────────────────
    const detection = detectIntent(userPrompt, config);

    // Skip if no workflow detected or explicitly skipped
    if (detection.skipped) {
      if (config.settings.showDetection) {
        console.log(`<!-- Workflow detection skipped: ${detection.reason} -->`);
      }
      process.exit(0);
    }

    if (!detection.detected) {
      process.exit(0);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 4: Create workflow state and generate instructions
    // ─────────────────────────────────────────────────────────────────────────
    createState({
      workflowId: detection.workflowId,
      workflowName: detection.workflow.name,
      sequence: detection.workflow.sequence,
      originalPrompt: userPrompt,
      commandMapping: config.commandMapping
    });

    // Generate and output instructions
    const instructions = buildWorkflowInstructions(detection, config);
    console.log(instructions);

    process.exit(0);
  } catch (error) {
    // Non-blocking - just log and exit
    console.error(`<!-- Workflow router error: ${error.message} -->`);
    process.exit(0);
  }
}

main();
