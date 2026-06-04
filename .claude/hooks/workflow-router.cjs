#!/usr/bin/env node
/**
 * Workflow Router - UserPromptSubmit + SessionStart Hook
 *
 * Injects a compact workflow catalog on each non-command prompt and after
 * session events (startup, resume, clear, compact) for context recovery.
 *
 * Exit Codes:
 *   0 - Success (non-blocking)
 */

const fs = require('fs');
const path = require('path');
const { loadWorkflowConfig } = require('./lib/wr-config.cjs');
const { WORKFLOW_CATALOG: WORKFLOW_CATALOG_MARKER, WORKFLOW_CATALOG_P2, WORKFLOW_CATALOG_P3, DEDUP_LINES, TOP_DEDUP_LINES } = require('./lib/dedup-constants.cjs');

// ═══════════════════════════════════════════════════════════════════════════
// CATALOG GENERATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Build the workflow catalog string for a given slice of entries.
 * Full format: 2 lines per workflow (name line + Use/Not for/Steps line).
 * Entries are sorted alphabetically by workflow ID.
 * @param {Object} config - Workflow configuration
 * @param {number} [sliceStart=0] - Start index (inclusive) for this catalog part
 * @param {number} [sliceEnd] - End index (exclusive); omit for all remaining
 * @returns {string} Formatted catalog text
 */
function buildWorkflowCatalog(config, sliceStart = 0, sliceEnd) {
    const { workflows, commandMapping } = config;

    let entries = Object.entries(workflows)
        .filter(([, wf]) => wf.whenToUse)
        .sort(([a], [b]) => a.localeCompare(b));

    entries = entries.slice(sliceStart, sliceEnd);

    const lines = [];
    for (const [id, wf] of entries) {
        const sequence = wf.sequence.map(step => commandMapping[step]?.claude || `/${step}`).join(' \u2192 ');
        lines.push(`**${id}** \u2014 ${wf.name}`);
        lines.push(`  Use: ${wf.whenToUse} | Not for: ${wf.whenNotToUse || 'N/A'} | Steps: ${sequence}`);
    }

    return lines.join('\n');
}

/**
 * Build the catalog injection output for the FIRST THIRD of workflows.
 * The remaining workflows are injected by workflow-router-p2.cjs and workflow-router-p3.cjs
 * as separate hooks, keeping each hook's output under the harness per-hook size limit.
 * Detection instructions are included here (primacy position) and reference parts 2 and 3.
 * @param {Object} config - Workflow configuration
 * @returns {string} Full injection text (part 1)
 */
function buildCatalogInjection(config) {
    const allEntries = Object.entries(config.workflows)
        .filter(([, wf]) => wf.whenToUse)
        .sort(([a], [b]) => a.localeCompare(b));
    const thirdCount = Math.ceil(allEntries.length / 3);

    const lines = [];

    lines.push('');
    lines.push(WORKFLOW_CATALOG_MARKER);
    lines.push('');
    lines.push('> **MANDATORY:** You MUST ATTENTION check every prompt against this catalog before responding.');
    lines.push('> Detect the best-match workflow AND evaluate if direct execution, a skill, a standard workflow, or a custom step combination fits better.');
    lines.push('> Auto-select the best option yourself; do not ask the user to choose between workflow/direct/skill/custom paths.');
    lines.push('');
    lines.push('> **IMPORTANT:** MUST ATTENTION create todo tasks for ALL steps. Do NOT skip any steps in the selected workflow.');
    lines.push(`> **NOTE:** This is part 1 of 3. See "${WORKFLOW_CATALOG_P2}" and "${WORKFLOW_CATALOG_P3}" below for the remaining ${allEntries.length - thirdCount} workflows.`);
    lines.push('');

    lines.push(buildWorkflowCatalog(config, 0, thirdCount));
    lines.push('');

    lines.push('## Workflow Detection Instructions');
    lines.push('');
    lines.push('1. **MATCH:** Compare the user\'s prompt against EVERY "Use" field across ALL THREE catalog parts. Match semantics, not exact keywords.');
    lines.push('2. **ANALYZE:** Identify the best path: execute directly, invoke a skill, activate a standard workflow, or compose a custom workflow. A custom workflow is appropriate when no single workflow fits cleanly, the task spans multiple workflow boundaries, or trimming/reordering standard steps improves fit.');
    lines.push('3. **AUTO-SELECT:** Choose the best path yourself. Explicit `/skill`, `/workflow-*`, or `/start-workflow <id>` prompts count as the user choosing that path and should execute directly.');
    lines.push('4. **COMPOSE (if custom):** Select steps from existing workflow step libraries. Use a 1-line rationale internally (e.g. `scout → plan → fix → test → docs-update — skipping cook since plan is already defined`).');
    lines.push('5. **ACTIVATE:** Call `/start-workflow <workflowId>` for a selected standard workflow; invoke the selected skill; sequence custom steps manually; or execute directly when that is the best fit.');
    lines.push('6. **TaskCreate:** Create `[Workflow]` tasks for each workflow/custom step BEFORE any other action');
    lines.push('');

    return lines.join('\n');
}

/**
 * Build context-aware injection for active workflows.
 * Injects full catalog + active workflow summary (allows auto-switch).
 * @param {Object} state - Current workflow state (uses workflowSteps, currentStepIndex)
 * @param {Object} config - Workflow configuration
 * @returns {string} Injection text with active workflow context
 */
function buildActiveWorkflowContext(state, config) {
    const currentStep = state.workflowSteps?.[state.currentStepIndex] || null;

    const lines = [];
    lines.push(`> **Active workflow:** ${state.workflowType} (step: ${currentStep || 'unknown'})`);
    lines.push('> To switch workflows, call `/start-workflow <newId>` (auto-switches).');
    lines.push('');
    lines.push(buildCatalogInjection(config));
    return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════
// POST-ACTIVATION OUTPUT (used by step-tracker after /start-workflow)
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
        'plan-validate': 'Validate plan with critical questions',
        'why-review': 'Validate design rationale completeness',
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
        'review-post-task': 'Post-task code review',
        'sre-review': 'Production readiness review',
        'docs-update': 'Update documentation',
        watzup: 'Summarize changes',
        scout: 'Explore codebase',
        investigate: 'Deep dive analysis',
        idea: 'Capture and structure idea',
        refine: 'Refine into product backlog item',
        story: 'Break into user stories',
        prioritize: 'Prioritize backlog items',
        dependency: 'Analyze dependencies',
        'quality-gate': 'Run quality gate checklist',
        'design-spec': 'Create design specification',
        'review-artifact': 'Review artifact quality before handoff',
        'workflow-end': 'End workflow and clear state'
    };
    return descriptions[step] || `Execute ${step}`;
}

/**
 * Build post-activation workflow instructions (preActions + sequence + TaskCreate template).
 * Used by step-tracker after /start-workflow creates state.
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
        if (preActions.readFiles && preActions.readFiles.length > 0) {
            lines.push('### Pre-Actions (execute before starting sequence)');
            lines.push('');
            lines.push(`- **Pre-read files:** ${preActions.readFiles.join(', ')}`);
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
    const stepCount = workflow.sequence.length;
    lines.push(`### Task Creation (MANDATORY — create EXACTLY ${stepCount} tasks BEFORE any other action)`);
    lines.push('');
    lines.push(
        `**⚠️ HARD REQUIREMENT: You MUST ATTENTION create EXACTLY ${stepCount} TaskCreate calls — one per step. Count: ${stepCount}. Do NOT skip, combine, or summarize steps.**`
    );
    lines.push('');
    workflow.sequence.forEach((step, i) => {
        const cmd = commandMapping[step]?.claude || `/${step}`;
        const desc = getStepDescription(step);
        lines.push(`${i + 1}. TaskCreate: subject="[Workflow] ${cmd} - ${desc}", description="${workflow.name} workflow step: ${cmd}", activeForm="${desc}"`);
    });
    lines.push('');
    lines.push(
        `**Verification: After creating tasks, call TaskList and confirm you see EXACTLY ${stepCount} [Workflow] tasks. If fewer, create the missing ones.**`
    );
    lines.push('');
    lines.push('After creating ALL tasks, mark the first task as `in_progress` and begin execution.');
    lines.push('');

    return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN EXECUTION
// ═══════════════════════════════════════════════════════════════════════════

function wasCatalogRecentlyInjected(transcriptPath) {
    try {
        if (!transcriptPath || !fs.existsSync(transcriptPath)) return false;
        const lines = fs.readFileSync(transcriptPath, 'utf-8').split('\n');
        // Bottom check (recency)
        if (lines.slice(-DEDUP_LINES.WORKFLOW_CATALOG).some(l => l.includes(WORKFLOW_CATALOG_MARKER))) return true;
        // Top check (primacy — still at top of context from earlier injection)
        if (lines.slice(0, TOP_DEDUP_LINES).some(l => l.includes(WORKFLOW_CATALOG_MARKER))) return true;
        return false;
    } catch (e) {
        return false;
    }
}

async function main() {
    try {
        const stdin = fs.readFileSync(0, 'utf-8').trim();
        if (!stdin) process.exit(0);

        const payload = JSON.parse(stdin);
        const isSessionStart = payload.hook_event_name === 'SessionStart';
        const userPrompt = payload.prompt || '';
        const sessionId = process.env.CLAUDE_SESSION_ID || 'unknown';

        // Skip prompt check for SessionStart (no prompt field — inject catalog for context recovery)
        if (!isSessionStart && !userPrompt.trim()) process.exit(0);

        const config = loadWorkflowConfig();
        if (!config.settings?.enabled) process.exit(0);

        // SessionStart output is truncated at ~2KB by the harness — skip injection entirely.
        // Full catalog is injected on first UserPromptSubmit where there is no size limit.
        if (isSessionStart) process.exit(0);

        if (wasCatalogRecentlyInjected(payload.transcript_path)) process.exit(0);

        // Check for active workflow state
        const { loadState, getCurrentStepInfo, isWorkflowStale, clearState } = require('./lib/workflow-state.cjs');
        const state = loadState(sessionId);

        // Auto-clear stale workflows (abandoned >30 min without update)
        if (state?.workflowType && isWorkflowStale(sessionId)) {
            clearState(sessionId);
        }

        // Active = has workflowType + not complete + not stale
        const isActive = state?.workflowType && !getCurrentStepInfo(sessionId).isComplete && !isWorkflowStale(sessionId);

        if (isActive) {
            // Active workflow: differentiated injection
            const output = buildActiveWorkflowContext(state, config);
            if (output) console.log(output);
        } else {
            // No active workflow: inject full catalog
            const output = buildCatalogInjection(config);
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
    getStepDescription
};

// Only run main() when executed directly, not when required by other modules
if (require.main === module) {
    main();
}
