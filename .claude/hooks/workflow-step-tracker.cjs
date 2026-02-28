#!/usr/bin/env node
/**
 * Workflow Step Tracker - PostToolUse Hook for Skill Tool
 *
 * Automatically tracks skill execution and advances workflow state when
 * a workflow step skill completes execution.
 *
 * Triggers on: Skill tool completion
 *
 * Exit Codes:
 *   0 - Success (non-blocking)
 */

const fs = require('fs');
const { loadState, markStepComplete, getCurrentStepInfo, initWorkflow, clearState } = require('./lib/workflow-state.cjs');
const { loadWorkflowConfig } = require('./lib/wr-config.cjs');
const { buildWorkflowInstructions } = require('./workflow-router.cjs');

// Get session ID from environment
function getSessionId() {
    return process.env.CLAUDE_SESSION_ID || process.env.CK_SESSION_ID || 'default';
}

/**
 * Map skill name to workflow step ID
 * @param {string} skillName - Name of the executed skill
 * @param {Object} config - Workflow config
 * @returns {string|null} Step ID or null
 */
function mapSkillToStepId(skillName, config) {
    if (!config?.commandMapping) return null;

    const normalizedSkill = skillName.toLowerCase().trim();

    for (const [stepId, mapping] of Object.entries(config.commandMapping)) {
        const claudeCmd = mapping.claude || `/${stepId}`;
        // Extract skill name from command (e.g., "/plan" -> "plan", "/code-review" -> "code-review")
        const cmdParts = claudeCmd.replace(/^\//, '').split(/[/:]/);

        const cmdSkill = cmdParts[0].toLowerCase();

        if (normalizedSkill === cmdSkill || normalizedSkill === stepId.toLowerCase()) {
            return stepId;
        }
    }

    return null;
}

async function main() {
    try {
        const stdin = fs.readFileSync(0, 'utf-8').trim();
        if (!stdin) process.exit(0);

        const payload = JSON.parse(stdin);

        // Extract skill name from tool input
        // PostToolUse payload structure: { tool_name, tool_input, tool_response }
        const toolName = payload.tool_name || '';
        const toolInput = payload.tool_input || {};

        // Only process Skill tool completions
        if (toolName !== 'Skill') {
            process.exit(0);
        }

        const skillName = toolInput.skill || '';
        if (!skillName) process.exit(0);

        // Get session ID
        const sessionId = getSessionId();

        // Handle /workflow-start <id> invocations
        if (skillName === 'workflow-start') {
            const workflowId = (toolInput.args || '').trim();
            const config = loadWorkflowConfig();

            if (!config || !config.workflows) process.exit(0);

            const workflow = config.workflows[workflowId];

            if (!workflow) {
                // Invalid workflow ID - output error with valid IDs
                const validIds = Object.keys(config.workflows).sort().join(', ');
                console.log(`<!-- Error: Unknown workflow "${workflowId}". Valid IDs: ${validIds} -->`);
                process.exit(0);
            }

            // Check for active workflow (auto-switch)
            const currentState = loadState(sessionId);
            if (currentState?.workflowType) {
                clearState(sessionId);
            }

            // Initialize new workflow
            initWorkflow(sessionId, {
                workflowType: workflowId,
                workflowSteps: workflow.sequence
            });

            // Output post-activation instructions
            const output = buildWorkflowInstructions(workflowId, workflow, config);
            console.log(output);

            process.exit(0);
        }

        // Check for active workflow
        const state = loadState(sessionId);
        if (!state || !state.workflowType) process.exit(0);

        const config = loadWorkflowConfig();
        if (!config) process.exit(0);

        // Map executed skill to step ID
        const stepId = mapSkillToStepId(skillName, config);
        if (!stepId) process.exit(0);

        // Check if this skill matches current or any pending step
        const stepIdx = state.workflowSteps.indexOf(stepId);

        if (stepIdx === -1 || stepIdx < state.currentStepIndex) {
            // Skill not in workflow or already completed
            process.exit(0);
        }

        // Get current step info before marking complete
        const info = getCurrentStepInfo(sessionId);

        // Mark the step as complete
        const updated = markStepComplete(sessionId, stepId);

        if (updated && updated.currentStepIndex < updated.workflowSteps.length) {
            const nextInfo = getCurrentStepInfo(sessionId);
            const nextCmd = config.commandMapping?.[nextInfo.currentStep]?.claude || `/${nextInfo.currentStep}`;

            console.log(`\n## Workflow Step Completed\n`);
            console.log(`✓ Completed: \`${config.commandMapping?.[stepId]?.claude || `/${stepId}`}\``);
            console.log(`\n**Next step:** \`${nextCmd}\` (${nextInfo.currentStepIndex + 1}/${nextInfo.totalSteps})`);

            if (nextInfo.remainingSteps.length > 0) {
                console.log(
                    `\n**Remaining:** ${nextInfo.remainingSteps
                        .map(s => {
                            const cmd = config.commandMapping?.[s];
                            return cmd?.claude || `/${s}`;
                        })
                        .join(' → ')}`
                );
            }
            console.log(`\n---\n**IMPORTANT:** Execute \`${nextCmd}\` to continue the workflow.\n`);
        } else if (updated) {
            // Workflow complete
            console.log(`\n## Workflow Complete\n`);
            console.log(`All steps in **${state.workflowType}** workflow have been completed successfully!`);
            console.log(
                `\n✓ Completed steps: ${state.workflowSteps
                    .map(s => {
                        const cmd = config.commandMapping?.[s];
                        return cmd?.claude || `/${s}`;
                    })
                    .join(', ')}`
            );
        }

        process.exit(0);
    } catch (error) {
        // Non-blocking - just exit
        console.error(`<!-- Workflow step tracker error: ${error.message} -->`);
        process.exit(0);
    }
}

main();
