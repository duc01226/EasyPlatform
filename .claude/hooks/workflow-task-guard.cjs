#!/usr/bin/env node
'use strict';

/**
 * Workflow Task Guard - PreToolUse Hook for TaskUpdate
 *
 * Prevents marking workflow step tasks as "completed" without having
 * invoked the corresponding Skill tool first. Cross-references the
 * task's embedded skill name against workflow-state.completedSteps.
 *
 * Hard block — no bypass mechanism. The AI must invoke the Skill tool.
 *
 * Triggers on: PreToolUse → TaskUpdate
 *
 * Exit Codes:
 *   0 - Allow
 *   2 - Block (workflow step skill not invoked)
 *
 * @module workflow-task-guard
 */

const fs = require('fs');
const { getTaskSubject } = require('./lib/todo-state.cjs');
const { loadState, hasActiveWorkflow, mapSkillToStepId } = require('./lib/workflow-state.cjs');
const { loadWorkflowConfig } = require('./lib/wr-config.cjs');

/**
 * Extract skill name from a task subject containing a /slash-prefix pattern.
 * E.g., "11. /workflow-review-changes — Review all changes" → "workflow-review-changes"
 * @param {string} subject - Task subject string
 * @returns {string|null} Skill name or null
 */
function extractSkillName(subject) {
    if (!subject) return null;
    const match = subject.match(/\/([\w][\w-]*)/);
    return match ? match[1] : null;
}

function main() {
    try {
        const stdin = fs.readFileSync(0, 'utf-8').trim();
        if (!stdin) process.exit(0);

        const payload = JSON.parse(stdin);

        // Only intercept TaskUpdate
        if (payload.tool_name !== 'TaskUpdate') process.exit(0);

        const { taskId, status } = payload.tool_input || {};

        // Only guard completions
        if (status !== 'completed') process.exit(0);
        if (!taskId) process.exit(0);

        const sessionId = process.env.CLAUDE_SESSION_ID || process.env.CK_SESSION_ID || 'unknown';

        // No active workflow → allow all
        if (!hasActiveWorkflow(sessionId)) process.exit(0);

        // Get task subject from todo-state
        const subject = getTaskSubject(sessionId, taskId);
        if (!subject) process.exit(0); // unknown task, allow

        // Extract skill name from subject (must have /slash-prefix)
        const skillName = extractSkillName(subject);
        if (!skillName) process.exit(0); // not a workflow step task, allow

        // Load workflow config and map skill → step ID
        const config = loadWorkflowConfig();
        if (!config) process.exit(0);

        const stepId = mapSkillToStepId(skillName, config);
        if (!stepId) process.exit(0); // skill doesn't map to any workflow step, allow

        // Check if this step was completed (Skill tool was invoked)
        const workflowState = loadState(sessionId);
        if (workflowState.completedSteps.includes(stepId)) {
            process.exit(0); // skill was invoked, allow
        }

        // BLOCK: Skill not invoked
        process.stderr.write(
            `BLOCKED: Cannot complete task "${subject}"\n\n` +
                `The workflow step /${skillName} was NOT invoked via the Skill tool.\n` +
                `You MUST ATTENTION run the Skill tool with /${skillName} before marking this task as completed.\n\n` +
                `This is a hard block — no bypass available.\n`
        );
        process.exit(2);
    } catch (error) {
        // Non-blocking on error (fail-open to prevent breaking task management)
        if (process.env.CK_DEBUG) {
            console.error(`[workflow-task-guard] Error: ${error.message}`);
        }
        process.exit(0);
    }
}

main();
