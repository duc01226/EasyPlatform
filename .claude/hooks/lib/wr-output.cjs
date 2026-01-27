#!/usr/bin/env node
/**
 * Workflow Router - Output Generation
 *
 * Workflow instructions and conflict reminder generation.
 * Part of workflow-router.cjs modularization.
 *
 * @module wr-output
 */

'use strict';

const { getCurrentStepInfo } = require('./workflow-state.cjs');

/**
 * Get human-readable description for a workflow step
 * @param {string} step - Step ID
 * @returns {string} Step description
 */
function getStepDescription(step) {
  const descriptions = {
    plan: 'Create implementation plan',
    'plan-review': 'Review implementation plan',
    cook: 'Implement the feature',
    code: 'Implement from existing plan',
    test: 'Run tests and verify',
    fix: 'Apply fixes',
    debug: 'Investigate and diagnose',
    'code-review': 'Review code quality',
    'code-simplifier': 'Simplify and refine code',
    'docs-update': 'Update documentation',
    watzup: 'Summarize changes',
    scout: 'Explore codebase',
    investigate: 'Deep dive analysis',
    changelog: 'Update changelog',
    'design-spec': 'Create design specification',
    idea: 'Capture product idea',
    refine: 'Refine into product backlog item',
    story: 'Break into user stories',
    prioritize: 'Prioritize backlog items',
    'test-spec': 'Generate test specification',
    'test-cases': 'Create detailed test cases',
    'quality-gate': 'Run quality gate checks',
    status: 'Generate status report',
    dependency: 'Analyze dependencies',
    'review-changes': 'Review uncommitted changes',
    'team-sync': 'Prepare team sync agenda'
  };
  return descriptions[step] || `Execute ${step}`;
}

/**
 * Build workflow instructions for Claude to follow
 * @param {Object} detection - Detection result with workflow info
 * @param {Object} config - Workflow configuration
 * @returns {string} Formatted instructions
 */
function buildWorkflowInstructions(detection, config) {
  const { workflow, workflowId, confidence, alternatives } = detection;
  const { settings, commandMapping } = config;

  const lines = [];

  // Header
  lines.push('');
  lines.push('## Workflow Detected');
  lines.push('');

  // Detection info
  lines.push(`**Intent:** ${workflow.name} (${confidence}% confidence)`);
  if (workflow.description) {
    lines.push(`**Description:** ${workflow.description}`);
  }

  // Workflow sequence
  const sequenceDisplay = workflow.sequence.map(step => {
    const cmd = commandMapping[step];
    return cmd?.claude || `/${step}`;
  }).join(' → ');

  lines.push(`**Workflow:** ${sequenceDisplay}`);
  lines.push('');

  // Instructions
  if (workflow.confirmFirst && settings.confirmHighImpact) {
    lines.push('### Instructions (MUST FOLLOW)');
    lines.push('');
    lines.push('1. **FIRST:** Announce the detected workflow to the user:');
    lines.push(`   > "Detected: **${workflow.name}** workflow. I will follow: ${sequenceDisplay}"`);
    lines.push('');
    lines.push('2. **ASK:** "Proceed with this workflow? (yes/no/quick)"');
    lines.push('   - "yes" → Execute full workflow');
    lines.push('   - "no" → Ask what they want instead');
    lines.push('   - "quick" → Skip workflow, handle directly');
    lines.push('');
    lines.push('3. **THEN:** Execute each step in sequence, using the appropriate slash command');
    lines.push('');
  } else {
    lines.push('### Instructions (MUST FOLLOW)');
    lines.push('');
    lines.push('1. **ANNOUNCE:** Tell the user:');
    lines.push(`   > "Detected: **${workflow.name}** workflow. Following: ${sequenceDisplay}"`);
    lines.push('');
    lines.push('2. **EXECUTE:** Follow the workflow sequence, using each slash command in order');
    lines.push('');
  }

  // Step details
  lines.push('### Workflow Steps');
  lines.push('');
  workflow.sequence.forEach((step, index) => {
    const cmd = commandMapping[step];
    const claudeCmd = cmd?.claude || `/${step}`;
    lines.push(`${index + 1}. \`${claudeCmd}\` - ${getStepDescription(step)}`);
  });
  lines.push('');

  // Todo prefix instruction
  lines.push('### Todo Tracking (REQUIRED)');
  lines.push('');
  lines.push('**MUST prefix workflow todos with `[Workflow]`:**');
  lines.push('```');
  lines.push('Example todos:');
  workflow.sequence.slice(0, 3).forEach((step, index) => {
    const cmd = commandMapping[step];
    const claudeCmd = cmd?.claude || `/${step}`;
    const desc = getStepDescription(step);
    lines.push(`- [Workflow] ${claudeCmd} - ${desc}`);
  });
  lines.push('```');
  lines.push('');

  // Alternatives
  if (alternatives && alternatives.length > 0) {
    lines.push(`*Alternative workflows detected: ${alternatives.join(', ')}*`);
    lines.push('');
  }

  // Override hint
  if (settings.allowOverride && settings.overridePrefix) {
    lines.push(`*To skip workflow detection, prefix your message with "${settings.overridePrefix}"*`);
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Build reminder for workflow intent conflict
 * When user's prompt suggests a different workflow than the active one
 * @param {Object} existingState - Current workflow state
 * @param {Object} newDetection - New workflow detection result
 * @param {Object} config - Workflow config
 * @returns {string} Conflict reminder message
 */
function buildConflictReminder(existingState, newDetection, config) {
  const { commandMapping } = config;
  const currentInfo = getCurrentStepInfo();

  const existingSequence = existingState.sequence.map(step => {
    const cmd = commandMapping[step];
    return cmd?.claude || `/${step}`;
  }).join(' → ');

  const newSequence = newDetection.workflow.sequence.map(step => {
    const cmd = commandMapping[step];
    return cmd?.claude || `/${step}`;
  }).join(' → ');

  const lines = [];
  lines.push('');
  lines.push('## Workflow Intent Change Detected');
  lines.push('');
  lines.push('Your new message suggests a **different workflow** than the one currently active.');
  lines.push('');
  lines.push('| | Active Workflow | New Intent |');
  lines.push('|---|---|---|');
  lines.push(`| **Name** | ${existingState.workflowName} | ${newDetection.workflow.name} |`);
  lines.push(`| **Progress** | Step ${currentInfo.stepNumber}/${currentInfo.totalSteps} | Not started |`);
  lines.push(`| **Sequence** | ${existingSequence} | ${newSequence} |`);
  lines.push('');
  lines.push('### Options');
  lines.push('');
  lines.push('1. **Switch to new workflow:** Say "switch" or "abort" to cancel the active workflow and start the new one');
  lines.push('2. **Continue current workflow:** Say "continue" to keep the active workflow');
  lines.push('3. **Quick action:** Prefix with "quick:" to skip workflows entirely');
  lines.push('');
  lines.push(`*Current step pending: \`${currentInfo.claudeCommand}\`*`);
  lines.push('');

  return lines.join('\n');
}

module.exports = {
  getStepDescription,
  buildWorkflowInstructions,
  buildConflictReminder
};
