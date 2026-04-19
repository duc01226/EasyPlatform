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
const { loadState, markStepComplete, getCurrentStepInfo, initWorkflow, clearState, mapSkillToStepId } = require('./lib/workflow-state.cjs');
const { loadWorkflowConfig } = require('./lib/wr-config.cjs');
const { buildWorkflowInstructions } = require('./workflow-router.cjs');

// Steps that ARE full workflows — MUST run as sub-agent when invoked inside a parent workflow
// Only step IDs that appear in workflow sequences AND activate their own multi-step workflow
const WORKFLOW_IN_WORKFLOW_STEPS = new Set([
    'workflow-review-changes', // activates review-changes workflow (16 steps)
    'workflow-review',         // activates review workflow (14 steps)
]);

// Read skill front matter fields (context-budget, execution-mode) for advisory output
function getSkillMeta(skillName) {
    try {
        const skillPath = `.claude/skills/${skillName}/SKILL.md`;
        const content = fs.readFileSync(skillPath, 'utf-8');
        const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
        if (!match) return {};
        const fm = match[1];
        return {
            executionMode: (fm.match(/execution-mode:\s*(\S+)/) || [])[1],
            contextBudget: (fm.match(/context-budget:\s*(\S+)/) || [])[1],
        };
    } catch {
        return {};
    }
}

function getSessionId() {
    return process.env.CLAUDE_SESSION_ID || process.env.CK_SESSION_ID || 'default';
}

function resolveCmd(stepId, config) {
    return config.commandMapping?.[stepId]?.claude || `/${stepId}`;
}

async function main() {
    try {
        const stdin = fs.readFileSync(0, 'utf-8').trim();
        if (!stdin) process.exit(0);

        const payload = JSON.parse(stdin);

        // Extract skill name from tool input
        // PostToolUse payload structure: { tool_name, tool_input, tool_result }
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

        // Mark the step as complete
        const updated = markStepComplete(sessionId, stepId);

        if (updated && updated.currentStepIndex < updated.workflowSteps.length) {
            const nextInfo = getCurrentStepInfo(sessionId);
            const nextCmd = resolveCmd(nextInfo.currentStep, config);

            console.log(`\n## Workflow Step Completed\n`);
            console.log(`✓ Completed: \`${resolveCmd(stepId, config)}\``);
            console.log(`\n**Next step:** \`${nextCmd}\` (${nextInfo.currentStepIndex + 1}/${nextInfo.totalSteps})`);

            // Workflow-in-workflow hard gate
            if (WORKFLOW_IN_WORKFLOW_STEPS.has(nextInfo.currentStep)) {
                console.log(
                    `\n> ⚠️ **[WORKFLOW-IN-WORKFLOW GATE]** \`${nextCmd}\` is a full workflow (activates its own multi-step sequence).` +
                    ` MUST execute via \`Agent\` tool (\`subagent_type: "code-reviewer"\`) — NEVER as an inline \`Skill\` tool call.` +
                    ` Inline execution absorbs the entire nested workflow's context into this session.` +
                    `\n> Sub-agent prompt must include: current git diff context + task description.` +
                    ` Return only SYNC:subagent-return-contract summary; write full findings to \`plans/reports/\`.`
                );
            } else {
                // Context-budget advisory for heavy non-workflow steps
                // Merge SKILL.md front matter with workflow-level stepMeta (workflow overrides skill)
                const skillMeta = getSkillMeta(nextInfo.currentStep);
                const workflowStepMeta = config.workflows?.[state.workflowType]?.stepMeta?.[nextInfo.currentStep] || {};
                const effectiveMeta = { ...skillMeta, ...workflowStepMeta };
                if (effectiveMeta.executionMode === 'subagent' || ['critical', 'high'].includes(effectiveMeta.contextBudget)) {
                    const budgetLabel = effectiveMeta.contextBudget
                        ? `context-budget: ${effectiveMeta.contextBudget}`
                        : `execution-mode: subagent`;
                    console.log(
                        `\n> 💡 **[SUB-AGENT RECOMMENDED]** \`${nextCmd}\` is marked \`${budgetLabel}\`.` +
                        ` Strongly recommended: execute via \`Agent\` tool to preserve main session context.` +
                        ` Return only SYNC:subagent-return-contract summary.`
                    );
                }
            }

            if (nextInfo.remainingSteps.length > 0) {
                console.log(`\n**Remaining:** ${nextInfo.remainingSteps.map(s => resolveCmd(s, config)).join(' → ')}`);
            }
            console.log(`\n---\n**IMPORTANT:** Execute \`${nextCmd}\` to continue the workflow.\n`);
        } else if (updated) {
            // Workflow complete — clear state so next prompt gets fresh catalog
            console.log(`\n## Workflow Complete\n`);
            console.log(`All steps in **${state.workflowType}** workflow have been completed successfully!`);
            console.log(`\n✓ Completed steps: ${state.workflowSteps.map(s => resolveCmd(s, config)).join(', ')}`);
            clearState(sessionId);
        }

        process.exit(0);
    } catch (error) {
        // Non-blocking - just exit
        console.error(`<!-- Workflow step tracker error: ${error.message} -->`);
        process.exit(0);
    }
}

main();
