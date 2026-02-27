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
    // Core workflow steps
    plan: 'Create implementation plan',
    'plan-review': 'Review implementation plan',
    'plan-validate': 'Validate plan with critical questions',
    cook: 'Implement the feature',
    code: 'Implement from existing plan',
    test: 'Run tests and verify',
    'test-initial': 'Run initial test verification',
    fix: 'Apply fixes',
    debug: 'Investigate and diagnose',
    'code-review': 'Review code quality',
    'code-simplifier': 'Simplify and refine code',
    'sre-review': 'SRE production readiness review',
    'docs-update': 'Update documentation (general + feature docs)',
    watzup: 'Summarize changes',
    scout: 'Explore codebase',
    investigate: 'Deep dive analysis',
    changelog: 'Update changelog',
    'why-review': 'Audit reasoning quality',
    'review-changes': 'Review uncommitted changes',
    'review-post-task': 'Post-task review of completed work',
    // Short step IDs (mapped to team-* skills via commandMapping)
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
    'team-sync': 'Prepare team sync agenda',
    acceptance: 'PO acceptance sign-off',
    retro: 'Sprint retrospective',
    // Legacy step IDs (backward compat)
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
  lines.push('## Workflow Catalog');
  lines.push('');
  lines.push('> **MANDATORY:** You MUST check every prompt against this catalog before responding.');
  lines.push('> If a workflow matches, you MUST activate it. NEVER skip a matching workflow.');
  lines.push('> Only proceed without a workflow if NO catalog entry matches the user\'s intent.');
  lines.push('');
  lines.push(catalog);
  lines.push('');

  lines.push('## Workflow Detection Instructions');
  lines.push('');
  lines.push('1. **MATCH (MANDATORY):** Compare the user\'s prompt against EVERY "Use" field. If the prompt mentions fixing, debugging, errors, bugs → **bugfix**. If it mentions implementing, adding, creating → **feature**. Match semantics, not exact keywords.');
  lines.push('2. **SELECT:** Pick the single best-matching workflow, or NONE only if genuinely no entry matches');
  lines.push('3. **ACTIVATE:** Call `/workflow-start <workflowId>` — do NOT skip this step, do NOT read files first');
  lines.push('4. **ANNOUNCE:** Tell user: "Detected: **[Workflow Name]**. Following: [sequence]"');
  lines.push('5. **CONFIRM** (if marked with confirmFirst): Ask "Proceed? (yes/no/quick)". If NOT marked, execute immediately without asking.');
  lines.push('6. **TASKCREATE (MANDATORY):** Create `[Workflow]` items for each step BEFORE any other action');
  lines.push('');
  lines.push('### Simple Task Exception (NARROW)');
  lines.push('');
  lines.push('Skip workflows ONLY for: single-line typo fixes, user says "just do it" or "no workflow", pure questions with no code changes.');
  lines.push('If the prompt mentions "fix", "error", "bug", "implement", "add feature", "refactor", or "review" → a workflow ALWAYS applies, even if the fix seems small.');
  lines.push('');

  lines.push('### Task Creation Enforcement (HARD BLOCKING)');
  lines.push('');
  lines.push('**YOU ARE BLOCKED FROM PROCEEDING until you create tasks for EVERY workflow step.**');
  lines.push('');
  lines.push('After selecting a workflow, your FIRST action MUST be calling `TaskCreate` once per workflow step:');
  lines.push('```');
  lines.push('TaskCreate: subject="[Workflow] /command - Step description", description="...", activeForm="Step description"');
  lines.push('```');
  lines.push('');
  lines.push('**Rules:**');
  lines.push('1. Create ONE `TaskCreate` per workflow step — do NOT combine steps');
  lines.push('2. Mark each task `in_progress` (via `TaskUpdate`) before starting, `completed` after finishing');
  lines.push('3. After EVERY step, check `TaskList` for next `pending` task');
  lines.push('4. Continue until ALL `[Workflow]` tasks are `completed`');
  lines.push('5. On context loss, check `TaskList` for `[Workflow]` items to recover');
  lines.push('');

  if (settings?.allowOverride && settings?.overridePrefix) {
    lines.push(`*To skip confirmation, prefix your message with "${settings.overridePrefix}"*`);
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

  const lines = [];

  // Active workflow summary
  lines.push(`> **Active workflow:** ${existingState.workflowName} (step: ${currentInfo.claudeCommand})`);
  lines.push('> To switch workflows, call `/workflow-start <newId>` (auto-switches).');
  lines.push('');

  // Full catalog injection (same as no-workflow path — ensures AI always sees catalog)
  lines.push(buildCatalogInjection(config));

  return lines.join('\n');
}

/**
 * Build workflow instructions for Claude to follow after /workflow-start activation.
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

  // Instructions — todo creation is step 2 (or 3 for confirmFirst), always before execution
  if (workflow.confirmFirst && settings?.confirmHighImpact) {
    lines.push('### Instructions (MUST FOLLOW IN ORDER)');
    lines.push('');
    lines.push('1. **ANNOUNCE:** Tell the user:');
    lines.push(`   > "Detected: **${workflow.name}**. Following: ${sequenceDisplay}"`);
    lines.push('');
    lines.push('2. **⛔ CONFIRM GATE:** Ask "Proceed with this workflow? (yes/no/quick)" — STOP and WAIT for response.');
    lines.push('   - "yes" → Continue to step 3');
    lines.push('   - "no" → Ask what they want instead');
    lines.push('   - "quick" → Skip workflow, handle directly');
    lines.push('');
    lines.push('3. **⛔ CREATE TODOS:** Use `TaskCreate` to create ONE todo per workflow step (see list below). Do NOT proceed to step 4 until ALL todos exist.');
    lines.push('');
    lines.push('4. **EXECUTE:** Follow the workflow sequence, invoking each slash command in order.');
    lines.push('');
  } else {
    lines.push('### Instructions (MUST FOLLOW IN ORDER)');
    lines.push('');
    lines.push('> **No confirmation needed** — proceed directly without asking the user.');
    lines.push('');
    lines.push('1. **ANNOUNCE:** Tell the user:');
    lines.push(`   > "Detected: **${workflow.name}**. Following: ${sequenceDisplay}"`);
    lines.push('');
    lines.push('2. **⛔ CREATE TODOS:** Use `TaskCreate` to create ONE todo per workflow step (see list below). Do NOT proceed to step 3 until ALL todos exist.');
    lines.push('');
    lines.push('3. **EXECUTE:** Follow the workflow sequence, invoking each slash command in order.');
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

  // Todo list reference — the blocking instruction is in the Instructions section above
  lines.push('### Todo Items to Create');
  lines.push('');
  lines.push('Create one `TaskCreate` call per line:');
  workflow.sequence.forEach((step) => {
    const cmd = (commandMapping || {})[step];
    const claudeCmd = cmd?.claude || `/${step}`;
    const desc = getStepDescription(step);
    lines.push(`- **${claudeCmd}** — ${desc}`);
  });
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
