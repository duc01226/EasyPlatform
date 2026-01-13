#!/usr/bin/env node
/**
 * Dev Rules Reminder - Context Building
 *
 * Plan context and workflow progress building.
 * Part of dev-rules-reminder.cjs modularization.
 *
 * @module dr-context
 */

'use strict';

const { execSafe } = require('./si-exec.cjs');
const {
  resolvePlanPath,
  getReportsPath,
  resolveNamingPattern
} = require('./ck-config-utils.cjs');
const {
  loadState: loadWorkflowState,
  getCurrentStepInfo
} = require('./workflow-state.cjs');

/**
 * Build plan context for session
 * @param {string|null} sessionId - Current session ID
 * @param {Object} config - Configuration object
 * @returns {Object} Plan context with paths and settings
 */
function buildPlanContext(sessionId, config) {
  const { plan, paths } = config;
  const gitBranch = execSafe('git branch --show-current');
  const resolved = resolvePlanPath(sessionId, config);
  const reportsPath = getReportsPath(resolved.path, resolved.resolvedBy, plan, paths);

  // Compute naming pattern directly for reliable injection
  const namePattern = resolveNamingPattern(plan, gitBranch);

  const planLine = resolved.resolvedBy === 'session'
    ? `- Plan: ${resolved.path}`
    : resolved.resolvedBy === 'branch'
      ? `- Plan: none | Suggested: ${resolved.path}`
      : `- Plan: none`;

  // Validation config (injected so LLM can reference it)
  const validation = plan.validation || {};
  const validationMode = validation.mode || 'prompt';
  const validationMin = validation.minQuestions || 3;
  const validationMax = validation.maxQuestions || 8;

  return {
    reportsPath,
    gitBranch,
    planLine,
    namePattern,
    validationMode,
    validationMin,
    validationMax
  };
}

/**
 * Build workflow progress reminder lines
 * @returns {string[]} Array of reminder lines, empty if no active workflow
 */
function buildWorkflowProgressLines() {
  try {
    const state = loadWorkflowState();
    if (!state) return [];

    const info = getCurrentStepInfo();
    if (!info) return [];

    const remainingDisplay = info.remainingSteps.map(step => {
      const cmd = state.commandMapping?.[step];
      return cmd?.claude || `/${step}`;
    }).join(' → ');

    const completedDisplay = info.completedSteps.length > 0
      ? info.completedSteps.map(step => {
          const cmd = state.commandMapping?.[step];
          return cmd?.claude || `/${step}`;
        }).join(', ')
      : 'None';

    return [
      ``,
      `## **[ACTIVE WORKFLOW]** ${info.workflowName}`,
      `- **Progress:** Step ${info.stepNumber}/${info.totalSteps}`,
      `- **Current:** Execute \`${info.claudeCommand}\``,
      `- **Remaining:** ${remainingDisplay}`,
      `- **Completed:** ${completedDisplay}`,
      `- **Control:** Say "skip" to skip current step, "abort" to cancel workflow`,
      ``
    ];
  } catch (e) {
    return [];
  }
}

module.exports = {
  buildPlanContext,
  buildWorkflowProgressLines
};
