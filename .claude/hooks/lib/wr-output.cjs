#!/usr/bin/env node
/**
 * Workflow Router - Output Generation
 *
 * Workflow instructions, catalog injection, and active workflow context generation.
 * Part of workflow-router.cjs modularization.
 *
 * @module wr-output
 */

'use strict';

const { getCurrentStepInfo } = require('./workflow-state.cjs');
const { buildWorkflowCatalog } = require('./wr-detect.cjs');

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
    'team-design-spec': 'Create design specification',
    'team-idea': 'Capture product idea',
    'team-refine': 'Refine into product backlog item',
    'team-story': 'Break into user stories',
    'team-prioritize': 'Prioritize backlog items',
    'team-test-spec': 'Generate test specification',
    'team-test-cases': 'Create detailed test cases',
    'team-quality-gate': 'Run quality gate checks',
    'team-status': 'Generate status report',
    'team-dependency': 'Analyze dependencies',
    'review-changes': 'Review uncommitted changes',
    'team-team-sync': 'Prepare team sync agenda'
  };
  return descriptions[step] || `Execute ${step}`;
}

/**
 * Build catalog injection output for AI prompt.
 * Contains workflow catalog + instructions for AI to select and activate.
 *
 * @param {Object} config - Workflow configuration
 * @returns {string} Formatted catalog injection
 */
function buildCatalogInjection(config) {
  const { settings } = config;
  const catalog = buildWorkflowCatalog(config);

  const lines = [];
  lines.push('');
  lines.push('## Available Workflows');
  lines.push('');
  lines.push('**MANDATORY:** Analyze this prompt against the workflows below. If ANY workflow matches, you MUST invoke `/workflow:start <id>` BEFORE doing anything else — do NOT skip this step, do NOT read files first, do NOT jump to implementation. If `confirmFirst` is true, ask the user before activating. Only handle directly if NO workflow matches.');
  lines.push('');
  lines.push('**"Simple task" exception is NARROW:** Only skip workflows for single-line typo fixes or when the user says "just do it" / prefixes with `quick:`. A prompt containing error details, stack traces, or multi-line context is NEVER simple — always activate the matching workflow.');
  lines.push('');
  lines.push(catalog);
  lines.push('');

  if (settings?.allowOverride && settings?.overridePrefix) {
    lines.push(`*To skip workflow detection, prefix your message with "${settings.overridePrefix}"*`);
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Build active workflow context for AI when an active workflow exists
 * and a new (non-step) prompt arrives.
 * Includes: active workflow status, conflict instructions, full catalog for comparison.
 *
 * @param {Object} existingState - Current workflow state from loadState()
 * @param {Object} config - Workflow configuration
 * @returns {string} Formatted active workflow context
 */
function buildActiveWorkflowContext(existingState, config) {
  const { commandMapping } = config;
  const currentInfo = getCurrentStepInfo();

  // Guard: state may have been cleared between loadState() and getCurrentStepInfo()
  if (!currentInfo) return '';

  const existingSequence = (existingState.sequence || []).map(step => {
    const cmd = (commandMapping || {})[step];
    return cmd?.claude || `/${step}`;
  }).join(' → ');

  const lines = [];

  // Section 1: Active workflow status
  lines.push('');
  lines.push('## Active Workflow');
  lines.push('');
  lines.push(`**Workflow:** ${existingState.workflowName} (${existingState.workflowId || 'unknown'})`);
  lines.push(`**Progress:** Step ${currentInfo.stepNumber}/${currentInfo.totalSteps} — current: \`${currentInfo.claudeCommand}\``);
  lines.push(`**Sequence:** ${existingSequence}`);
  lines.push('');

  // Section 2: Conflict instructions
  lines.push('### New Prompt Handling');
  lines.push('');
  lines.push('If this new prompt matches the **SAME** workflow, continue with the current step.');
  lines.push('If it suggests a **DIFFERENT** intent, announce the conflict and ask the user:');
  lines.push('- **Switch** — invoke `/workflow:start <newId>` (auto-switches, clears current)');
  lines.push('- **Continue** — keep executing the current workflow');
  lines.push('- **Quick** — skip workflows entirely, handle directly');
  lines.push('');

  // Section 3: Full catalog for AI comparison
  const catalog = buildWorkflowCatalog(config);
  lines.push('### Available Workflows');
  lines.push('');
  lines.push(catalog);
  lines.push('');

  return lines.join('\n');
}

/**
 * Build workflow instructions for Claude to follow after /workflow:start activation.
 * @param {Object} activation - Activation info with workflow and workflowId
 * @param {Object} config - Workflow configuration
 * @returns {string} Formatted instructions
 */
function buildWorkflowInstructions(activation, config) {
  const { workflow, workflowId } = activation;
  const { settings, commandMapping } = config;

  const lines = [];

  // Header
  lines.push('');
  lines.push('## Workflow Activated');
  lines.push('');

  // Workflow info
  lines.push(`**Workflow:** ${workflow.name} (\`${workflowId}\`)`);
  if (workflow.description) {
    lines.push(`**Description:** ${workflow.description}`);
  }

  // Workflow sequence
  const sequenceDisplay = workflow.sequence.map(step => {
    const cmd = (commandMapping || {})[step];
    return cmd?.claude || `/${step}`;
  }).join(' → ');

  lines.push(`**Sequence:** ${sequenceDisplay}`);
  lines.push('');

  // Pre-Actions (protocol context, skill activation, file reads)
  const pa = workflow.preActions;
  if (pa && (pa.injectContext || pa.activateSkill || pa.readFiles?.length)) {
    lines.push('### Pre-Actions (EXECUTE FIRST)');
    lines.push('');

    if (pa.activateSkill) {
      lines.push(`**Activate skill:** \`${pa.activateSkill}\` (invoke before any workflow step)`);
    }

    if (pa.readFiles?.length) {
      lines.push('**MUST READ these files before starting:**');
      pa.readFiles.forEach(f => lines.push(`- \`${f}\``));
    }

    if (pa.injectContext) {
      lines.push('');
      lines.push(pa.injectContext);
    }

    lines.push('');
  }

  // Instructions
  if (workflow.confirmFirst && settings?.confirmHighImpact) {
    lines.push('### Instructions (MUST FOLLOW)');
    lines.push('');
    lines.push('1. **FIRST:** Announce the activated workflow to the user:');
    lines.push(`   > "Activated: **${workflow.name}** workflow. I will follow: ${sequenceDisplay}"`);
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
    lines.push(`   > "Activated: **${workflow.name}** workflow. Following: ${sequenceDisplay}"`);
    lines.push('');
    lines.push('2. **EXECUTE:** Follow the workflow sequence, using each slash command in order');
    lines.push('');
  }

  // Step details
  lines.push('### Workflow Steps');
  lines.push('');
  workflow.sequence.forEach((step, index) => {
    const cmd = (commandMapping || {})[step];
    const claudeCmd = cmd?.claude || `/${step}`;
    lines.push(`${index + 1}. \`${claudeCmd}\` - ${getStepDescription(step)}`);
  });
  lines.push('');

  // Todo tracking instruction - show ALL steps
  lines.push('### Todo Tracking (REQUIRED)');
  lines.push('');
  lines.push('**MUST create todos for ALL workflow steps below (one todo per step):**');
  lines.push('```');
  workflow.sequence.forEach((step) => {
    const cmd = (commandMapping || {})[step];
    const claudeCmd = cmd?.claude || `/${step}`;
    const desc = getStepDescription(step);
    lines.push(`- [Workflow] ${claudeCmd} - ${desc}`);
  });
  lines.push('```');
  lines.push('');

  // Override hint
  if (settings?.allowOverride && settings?.overridePrefix) {
    lines.push(`*To skip workflow detection, prefix your message with "${settings.overridePrefix}"*`);
    lines.push('');
  }

  return lines.join('\n');
}

module.exports = {
  getStepDescription,
  buildCatalogInjection,
  buildActiveWorkflowContext,
  buildWorkflowInstructions
};
