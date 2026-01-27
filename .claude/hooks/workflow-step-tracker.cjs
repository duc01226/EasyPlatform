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

const { loadState, markStepComplete, getCurrentStepInfo } = require('./lib/workflow-state.cjs');
const { loadWorkflowConfig } = require('./lib/wr-config.cjs');

/**
 * Read stdin asynchronously with timeout to prevent hanging
 * @returns {Promise<Object|null>} Parsed JSON payload or null
 */
async function readStdin() {
    return new Promise(resolve => {
        let data = '';

        // Handle no stdin (TTY mode)
        if (process.stdin.isTTY) {
            resolve(null);
            return;
        }

        process.stdin.setEncoding('utf8');
        process.stdin.on('data', chunk => {
            data += chunk;
        });
        process.stdin.on('end', () => {
            if (!data.trim()) {
                resolve(null);
                return;
            }
            try {
                resolve(JSON.parse(data));
            } catch {
                resolve(null);
            }
        });
        process.stdin.on('error', () => resolve(null));

        // Timeout after 500ms to prevent hanging
        setTimeout(() => resolve(null), 500);
    });
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
        // Extract skill name from command (e.g., "/plan" -> "plan", "/review:codebase" -> "review:codebase")
        const cmdParts = claudeCmd.replace(/^\//, '').split('/');
        const cmdSkill = cmdParts[0].toLowerCase();

        if (normalizedSkill === cmdSkill || normalizedSkill === stepId.toLowerCase()) {
            return stepId;
        }
    }

    return null;
}

async function main() {
    try {
        const payload = await readStdin();
        if (!payload) process.exit(0);

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

        // Check for active workflow
        const state = loadState();
        if (!state) process.exit(0);

        const config = loadWorkflowConfig();
        if (!config) process.exit(0);

        // Map executed skill to step ID
        const stepId = mapSkillToStepId(skillName, config);
        if (!stepId) process.exit(0);

        // Check if this skill matches current or any pending step
        const currentStepIdx = state.currentStep;
        const stepIdx = state.sequence.indexOf(stepId);

        if (stepIdx === -1 || stepIdx < currentStepIdx) {
            // Skill not in workflow or already completed
            process.exit(0);
        }

        // Mark the step as complete
        const info = getCurrentStepInfo();
        const updated = markStepComplete(stepId);

        if (updated) {
            const nextInfo = getCurrentStepInfo();
            console.log(`\n## Workflow Step Completed\n`);
            console.log(`✓ Completed: \`${info.claudeCommand}\``);
            console.log(`\n**Next step:** \`${nextInfo.claudeCommand}\` (${nextInfo.stepNumber}/${nextInfo.totalSteps})`);
            console.log(
                `\n**Remaining:** ${nextInfo.remainingSteps
                    .map(s => {
                        const cmd = state.commandMapping?.[s];
                        return cmd?.claude || `/${s}`;
                    })
                    .join(' → ')}`
            );
            console.log(`\n---\n**IMPORTANT:** Execute \`${nextInfo.claudeCommand}\` to continue the workflow.\n`);
        } else {
            // Workflow complete
            console.log(`\n## Workflow Complete\n`);
            console.log(`All steps in **${state.workflowName}** have been completed successfully!`);
            console.log(
                `\n✓ Completed steps: ${state.sequence
                    .map(s => {
                        const cmd = state.commandMapping?.[s];
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

main()
    .then(() => process.exit(0))
    .catch(() => process.exit(0));
