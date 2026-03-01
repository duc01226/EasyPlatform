#!/usr/bin/env node
/**
 * Workflow Router - UserPromptSubmit Hook
 *
 * Injects a compact workflow catalog on each non-command prompt.
 * The AI reads the catalog and decides which workflow (if any) to follow.
 *
 * Exit Codes:
 *   0 - Success (non-blocking)
 */

const fs = require('fs');
const { loadWorkflowConfig } = require('./lib/wr-config.cjs');

// ═══════════════════════════════════════════════════════════════════════════
// CATALOG GENERATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Build a compact workflow catalog string (~2 lines per workflow).
 * Entries are sorted alphabetically by workflow ID.
 * @param {Object} config - Workflow configuration
 * @returns {string} Formatted catalog text
 */
function buildWorkflowCatalog(config) {
    const { workflows, commandMapping } = config;
    const lines = [];

    const entries = Object.entries(workflows)
        .filter(([, wf]) => wf.whenToUse)
        .sort(([a], [b]) => a.localeCompare(b));

    for (const [id, wf] of entries) {
        const sequence = wf.sequence
            .map(step => commandMapping[step]?.claude || `/${step}`)
            .join(' \u2192 ');

        const confirm = wf.confirmFirst ? ' | \u26a0\ufe0f Confirm' : '';
        lines.push(`**${id}** \u2014 ${wf.name}${confirm}`);
        lines.push(`  Use: ${wf.whenToUse} | Not for: ${wf.whenNotToUse || 'N/A'} | Steps: ${sequence}`);
    }

    return lines.join('\n');
}

/**
 * Build the full catalog injection output with AI detection instructions.
 * @param {Object} config - Workflow configuration
 * @param {boolean} quickMode - Whether quick mode is active
 * @returns {string} Full injection text
 */
function buildCatalogInjection(config, quickMode) {
    const lines = [];

    lines.push('');
    lines.push('## Workflow Catalog');
    lines.push('');
    lines.push('> **MANDATORY:** You MUST check every prompt against this catalog before responding.');
    lines.push('> If a workflow matches and the task is non-trivial, auto-activate it immediately.');
    lines.push('> If AI judges the task is simple, AI MUST ask the user whether to skip workflow.');
    lines.push('');

    lines.push(buildWorkflowCatalog(config));
    lines.push('');

    lines.push('## Workflow Detection Instructions');
    lines.push('');
    if (quickMode) {
        lines.push('> **Quick mode active** - Skip confirmation, execute workflow directly.');
        lines.push('');
    }
    lines.push('1. **MATCH (MANDATORY):** Compare the user\'s prompt against EVERY "Use" field. Match semantics, not exact keywords.');
    lines.push('2. **SELECT:** Pick the single best-matching workflow, or NONE only if genuinely no entry matches');
    lines.push('3. **JUDGE:** Is the task simple? If yes → AI MUST ask user whether to skip workflow');
    lines.push('4. **ACTIVATE (non-trivial):** Auto-activate via `/workflow-start <workflowId>` — no confirmation needed');
    lines.push('5. **ANNOUNCE:** Tell user: "Detected: **[Workflow Name]**. Following: [sequence]"');
    lines.push('6. **TASKCREATE (MANDATORY):** Create `[Workflow]` items for each step BEFORE any other action');
    lines.push('');
    lines.push('### Simple Task Exception');
    lines.push('');
    lines.push('If AI judges the task is simple/straightforward (single-file changes, clear small fixes, user says "just do it"),');
    lines.push('AI MUST ask the user: "This seems simple. Skip workflow? (yes/no)". If user says no, activate workflow as normal.');
    lines.push('');

    lines.push('### Task Creation Enforcement (HARD BLOCKING)');
    lines.push('');
    lines.push('**YOU ARE BLOCKED FROM PROCEEDING until you create tasks for EVERY workflow step.**');
    lines.push('');
    lines.push('After activating a workflow, your FIRST action MUST be calling `TaskCreate` once per workflow step:');
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

    if (config.settings.allowOverride && config.settings.overridePrefix) {
        lines.push(`*To skip confirmation, prefix your message with "${config.settings.overridePrefix}"*`);
        lines.push('');
    }

    return lines.join('\n');
}

/**
 * Skip catalog injection for very short prompts (confirmations, acknowledgments).
 * Prompts under 15 chars are typically "yes", "ok", "continue", "go ahead" etc.
 * @param {string} prompt - User prompt
 * @returns {boolean} Whether to inject catalog
 */
function shouldInjectCatalog(prompt) {
    return prompt.trim().length >= 15;
}

/**
 * Build context-aware injection for active workflows.
 * Injects full catalog + active workflow summary (allows auto-switch).
 * @param {Object} state - Current workflow state (uses workflowSteps, currentStepIndex)
 * @param {Object} config - Workflow configuration
 * @param {boolean} quickMode - Whether quick mode is active
 * @returns {string} Injection text with active workflow context
 */
function buildActiveWorkflowContext(state, config, quickMode) {
    const currentStep = state.workflowSteps?.[state.currentStepIndex] || null;

    const lines = [];
    lines.push(`> **Active workflow:** ${state.workflowType} (step: ${currentStep || 'unknown'})`);
    lines.push('> To switch workflows, call `/workflow-start <newId>` (auto-switches).');
    lines.push('');
    lines.push(buildCatalogInjection(config, quickMode));
    return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════
// POST-ACTIVATION OUTPUT (used by step-tracker after /workflow-start)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Map step ID to a human-readable description.
 * @param {string} step - Step identifier
 * @returns {string} Description
 */
function getStepDescription(step) {
    const descriptions = {
        plan: 'Create implementation plan',
        'plan-review': 'Review and validate plan',
        cook: 'Implement the feature',
        code: 'Execute existing plan',
        'code-simplifier': 'Simplify and clean up code',
        'code-review': 'Review code quality',
        changelog: 'Update changelog entries',
        test: 'Run tests and verify',
        'test-initial': 'Run initial tests before fix',
        fix: 'Apply fixes',
        debug: 'Investigate and diagnose',
        'review-changes': 'Review uncommitted changes',
        'docs-update': 'Update documentation',
        watzup: 'Summarize changes',
        scout: 'Explore codebase',
        investigate: 'Deep dive analysis',
        idea: 'Capture and structure idea',
        refine: 'Refine into product backlog item',
        story: 'Break into user stories',
        prioritize: 'Prioritize backlog items',
        dependency: 'Analyze dependencies',
        'team-sync': 'Generate team sync agenda',
        'quality-gate': 'Run quality gate checklist',
        'test-spec': 'Generate test specification and test cases',
        'design-spec': 'Create design specification',
        status: 'Generate status report',
        handoff: 'Create role-to-role handoff record',
        acceptance: 'PO acceptance decision and sign-off',
        retro: 'Sprint retrospective with action items',
        'review-artifact': 'Review artifact quality before handoff'
    };
    return descriptions[step] || `Execute ${step}`;
}

/**
 * Build post-activation workflow instructions (preActions + sequence + TaskCreate template).
 * Used by step-tracker after /workflow-start creates state.
 * @param {string} workflowId - Workflow identifier
 * @param {Object} workflow - Workflow definition
 * @param {Object} config - Full workflow configuration
 * @returns {string} Formatted instructions
 */
function buildWorkflowInstructions(workflowId, workflow, config) {
    const { commandMapping } = config;
    const lines = [];

    lines.push(`## Workflow Activated: ${workflow.name} [${workflowId}]`);
    lines.push('');

    // Pre-Actions section
    const preActions = workflow.preActions;
    if (preActions) {
        const hasPreActions = preActions.activateSkill ||
                              (preActions.readFiles && preActions.readFiles.length > 0);

        if (hasPreActions) {
            lines.push('### Pre-Actions (execute before starting sequence)');
            lines.push('');
            if (preActions.activateSkill) {
                lines.push(`- **Activate skill:** \`/${preActions.activateSkill}\``);
            }
            if (preActions.readFiles && preActions.readFiles.length > 0) {
                lines.push(`- **Pre-read files:** ${preActions.readFiles.join(', ')}`);
            }
            lines.push('');
        }

        if (preActions.injectContext) {
            lines.push('### Workflow Context');
            lines.push('');
            lines.push(preActions.injectContext);
            lines.push('');
        }
    }

    // Sequence
    lines.push('### Sequence');
    lines.push('');
    workflow.sequence.forEach((step, i) => {
        const cmd = commandMapping[step]?.claude || `/${step}`;
        lines.push(`${i + 1}. \`${cmd}\` - ${getStepDescription(step)}`);
    });
    lines.push('');

    // Task creation template - one TaskCreate per workflow step
    lines.push('### Task Creation (MANDATORY — create ALL tasks BEFORE any other action)');
    lines.push('');
    lines.push('You MUST call `TaskCreate` once for EACH workflow step below. Do NOT skip any step.');
    lines.push('');
    workflow.sequence.forEach((step, i) => {
        const cmd = commandMapping[step]?.claude || `/${step}`;
        const desc = getStepDescription(step);
        lines.push(`${i + 1}. TaskCreate: subject="[Workflow] ${cmd} - ${desc}", description="${workflow.name} workflow step: ${cmd}", activeForm="${desc}"`);
    });
    lines.push('');
    lines.push('After creating ALL tasks, mark the first task as `in_progress` and begin execution.');
    lines.push('');

    return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN EXECUTION
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
    try {
        const stdin = fs.readFileSync(0, 'utf-8').trim();
        if (!stdin) process.exit(0);

        const payload = JSON.parse(stdin);
        const userPrompt = payload.prompt || '';

        if (!userPrompt.trim()) process.exit(0);

        const config = loadWorkflowConfig();

        if (!config.settings?.enabled) process.exit(0);

        // Parse quick mode prefix
        let quickMode = false;
        let effectivePrompt = userPrompt;

        if (config.settings.allowOverride && config.settings.overridePrefix) {
            const lowerPrompt = userPrompt.toLowerCase().trim();
            if (lowerPrompt.startsWith(config.settings.overridePrefix.toLowerCase())) {
                quickMode = true;
                effectivePrompt = userPrompt.trim().substring(config.settings.overridePrefix.length).trim();
            }
        }

        // Skip catalog injection for explicit commands
        if (/^\/\w+/.test(effectivePrompt.trim())) {
            process.exit(0);
        }

        // Skip catalog for very short prompts (confirmations like "yes", "ok")
        if (!shouldInjectCatalog(effectivePrompt)) {
            process.exit(0);
        }

        // Check for active workflow state
        const { loadState } = require('./lib/workflow-state.cjs');
        const sessionId = process.env.CLAUDE_SESSION_ID || 'unknown';
        const state = loadState(sessionId);

        if (state?.workflowType) {
            // Active workflow: differentiated injection
            const output = buildActiveWorkflowContext(state, config, quickMode);
            if (output) console.log(output);
        } else {
            // No active workflow: inject full catalog
            const output = buildCatalogInjection(config, quickMode);
            console.log(output);
        }

        process.exit(0);
    } catch (error) {
        console.error(`<!-- Workflow router error: ${error.message} -->`);
        process.exit(0);
    }
}

// Export functions for use by step-tracker and tests
module.exports = {
    buildWorkflowCatalog,
    buildCatalogInjection,
    buildActiveWorkflowContext,
    buildWorkflowInstructions,
    getStepDescription,
    shouldInjectCatalog
};

// Only run main() when executed directly, not when required by other modules
if (require.main === module) {
    main();
}
