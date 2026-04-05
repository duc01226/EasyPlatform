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
const os = require('os');
const { loadWorkflowConfig } = require('./lib/wr-config.cjs');
const { loadConfig } = require('./lib/ck-config-loader.cjs');
const { WORKFLOW_CATALOG: WORKFLOW_CATALOG_MARKER, DEDUP_LINES, TOP_DEDUP_LINES } = require('./lib/dedup-constants.cjs');

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
        const sequence = wf.sequence.map(step => commandMapping[step]?.claude || `/${step}`).join(' \u2192 ');

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
    lines.push('> **MANDATORY:** You MUST ATTENTION check every prompt against this catalog before responding.');
    lines.push('> Always detect the nearest matching workflow, then use `AskUserQuestion` to ask the user');
    lines.push('> whether to activate the detected workflow (Recommended) or execute directly without workflow.');
    lines.push('');
    lines.push('> **IMPORTANT:** MUST ATTENTION create todo tasks for ALL steps. Do NOT skip any steps in the selected workflow.');
    lines.push('');

    lines.push(buildWorkflowCatalog(config));
    lines.push('');

    lines.push('## Workflow Detection Instructions');
    lines.push('');
    if (quickMode) {
        lines.push('> **Quick mode active** - Skip confirmation, execute workflow directly.');
        lines.push('');
    }
    lines.push('1. **MATCH:** Compare the user\'s prompt against EVERY "Use" field. Match semantics, not exact keywords.');
    lines.push('2. **SELECT:** Pick the single best-matching workflow, or NONE only if genuinely no entry matches');
    lines.push('3. **ASK:** Use `AskUserQuestion` to present: "Activate [Workflow] (Recommended)" vs "Execute directly"');
    lines.push('4. **ACTIVATE (if confirmed):** Call `/workflow-start <workflowId>`');
    lines.push('5. **TaskCreate:** Create `[Workflow]` tasks for each step BEFORE any other action');
    lines.push('');

    if (config.settings.allowOverride && config.settings.overridePrefix) {
        lines.push(`*To skip confirmation, prefix your message with "${config.settings.overridePrefix}"*`);
        lines.push('');
    }

    return lines.join('\n');
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
        'plan-validate': 'Validate plan with critical questions',
        'why-review': 'Validate design rationale completeness',
        cook: 'Implement the feature',
        'cook-fast': 'Fast implementation with minimal planning',
        'cook-hard': 'Thorough implementation with maximum verification',
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
        'team-sync': 'Generate team sync agenda',
        'quality-gate': 'Run quality gate checklist',
        'test-spec': 'Generate test specification and test cases',
        'design-spec': 'Create design specification',
        status: 'Generate status report',
        handoff: 'Create role-to-role handoff record',
        acceptance: 'PO acceptance decision and sign-off',
        retro: 'Sprint retrospective with action items',
        'review-artifact': 'Review artifact quality before handoff',
        'workflow-end': 'End workflow and clear state'
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

/**
 * Get path for the session startup catalog flag file.
 * Prevents double-injection: SessionStart writes it, first UserPromptSubmit consumes it.
 * Root cause: SessionStart output goes into system-reminder context, not the transcript
 * that wasCatalogRecentlyInjected() reads — so transcript dedup fails on the first prompt.
 */
function getStartupFlagPath(sessionId) {
    const tmpDir = path.join(os.tmpdir(), 'ck', 'markers');
    try {
        fs.mkdirSync(tmpDir, { recursive: true });
    } catch {}
    return path.join(tmpDir, `${sessionId}-startup-catalog`);
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

        // Read user config (.ck.json) for workflow.confirmationMode
        const ckConfig = loadConfig({
            includeProject: false,
            includeAssertions: false
        });
        const confirmationMode = ckConfig.workflow?.confirmationMode || 'always';

        // "off" mode: disable workflow catalog injection entirely (plain Claude, no overhead)
        if (confirmationMode === 'off') process.exit(0);

        const config = loadWorkflowConfig();
        if (!config.settings?.enabled) process.exit(0);

        if (!isSessionStart) {
            // UserPromptSubmit: consume startup flag to prevent SessionStart double-injection.
            // On fresh sessions the transcript is empty so transcript-based dedup misses the
            // SessionStart injection — this flag file bridges that gap.
            const flagPath = getStartupFlagPath(sessionId);
            if (fs.existsSync(flagPath)) {
                try {
                    fs.unlinkSync(flagPath);
                } catch {}
                process.exit(0);
            }

            // Subsequent prompts: use transcript dedup
            if (wasCatalogRecentlyInjected(payload.transcript_path)) process.exit(0);
        }

        // Parse quick mode:
        // - "never" confirmationMode forces quickMode globally (auto-execute without asking)
        // - per-prompt override via prefix (e.g. "quick:")
        let quickMode = confirmationMode === 'never';

        if (!quickMode && config.settings.allowOverride && config.settings.overridePrefix) {
            const lowerPrompt = userPrompt.toLowerCase().trim();
            if (lowerPrompt.startsWith(config.settings.overridePrefix.toLowerCase())) {
                quickMode = true;
            }
        }

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
            const output = buildActiveWorkflowContext(state, config, quickMode);
            if (output) console.log(output);
        } else {
            // No active workflow: inject full catalog
            const output = buildCatalogInjection(config, quickMode);
            console.log(output);
        }

        // Write startup flag so first UserPromptSubmit knows to skip catalog injection
        if (isSessionStart) {
            const flagPath = getStartupFlagPath(sessionId);
            try {
                fs.writeFileSync(flagPath, '1');
            } catch {}
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
