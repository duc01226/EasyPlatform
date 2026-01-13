#!/usr/bin/env node
/**
 * Workflow Router - Control Commands
 *
 * Workflow control command handling (abort, skip, complete).
 * Part of workflow-router.cjs modularization.
 *
 * @module wr-control
 */

'use strict';

const {
  loadState,
  clearState,
  markStepComplete,
  getCurrentStepInfo
} = require('./workflow-state.cjs');

/**
 * Handle workflow control commands (abort, skip, complete)
 * @param {string} action - Control action
 * @param {Object} config - Workflow config
 * @returns {string|null} Response message or null
 */
function handleWorkflowControl(action, config) {
  const state = loadState();
  if (!state) return null;

  const info = getCurrentStepInfo();

  switch (action) {
    case 'abort':
      clearState();
      return `\n## Workflow Aborted\n\nThe **${state.workflowName}** workflow has been cancelled.\n`;

    case 'skip':
      const skipped = markStepComplete(state.sequence[state.currentStep]);
      if (!skipped) {
        return `\n## Workflow Complete\n\nAll steps in **${state.workflowName}** have been completed.\n`;
      }
      const nextInfo = getCurrentStepInfo();
      return `\n## Step Skipped\n\nSkipped step: \`${info.claudeCommand}\`\n\n**Next step:** \`${nextInfo.claudeCommand}\` (${nextInfo.stepNumber}/${nextInfo.totalSteps})\n\nPlease execute the next step to continue the workflow.\n`;

    case 'complete':
      const updated = markStepComplete(state.sequence[state.currentStep]);
      if (!updated) {
        return `\n## Workflow Complete\n\nAll steps in **${state.workflowName}** have been completed successfully!\n`;
      }
      const next = getCurrentStepInfo();
      return `\n## Step Completed\n\nCompleted step: \`${info.claudeCommand}\`\n\n**Next step:** \`${next.claudeCommand}\` (${next.stepNumber}/${next.totalSteps})\n\nPlease execute the next step to continue the workflow.\n`;

    default:
      return null;
  }
}

module.exports = {
  handleWorkflowControl
};
