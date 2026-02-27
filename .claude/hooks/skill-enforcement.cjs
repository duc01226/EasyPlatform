#!/usr/bin/env node
'use strict';

/**
 * Skill Enforcement - PreToolUse Hook for Skill tool
 *
 * Enforces task tracking for skill invocations:
 *   - Meta skills (help, memory, etc.) always allowed
 *   - workflow-start always allowed
 *   - When workflow active + no tasks → block all non-meta skills
 *   - When no workflow + no tasks → block all non-meta skills
 *   - When tasks exist → allow all skills
 *
 * Bypass: CK_QUICK_MODE=true or prefix message with "quick:"
 *
 * Exit Codes:
 *   0 - Allow
 *   1 - Block with message
 *
 * @module skill-enforcement
 */

const fs = require('fs');
const { hasTodos, recordBypass } = require('./lib/todo-state.cjs');
const { hasActiveWorkflow } = require('./lib/workflow-state.cjs');

// ═══════════════════════════════════════════════════════════════════════════
// SKILL CLASSIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════

// Always allowed without workflow or tasks
const META_SKILLS = new Set([
  'help', 'memory', 'memory-management', 'checkpoint', 'recover', 'context',
  'ck-help', 'watzup', 'compact', 'kanban', 'coding-level'
]);

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function normalizeSkill(skill) {
  if (!skill) return '';
  return skill.replace(/^\/+/, '').toLowerCase().trim();
}

function isMetaSkill(skill) {
  return META_SKILLS.has(normalizeSkill(skill));
}

// ═══════════════════════════════════════════════════════════════════════════
// MESSAGES
// ═══════════════════════════════════════════════════════════════════════════

function workflowBlockMessage(skill) {
  return `## Workflow Task Enforcement Block

**Skill blocked:** \`${skill}\`

An active workflow was detected but NO tasks have been created yet.
Call \`TaskCreate\` for EACH workflow step BEFORE executing any skill.`;
}

function noWorkflowBlockMessage(skill) {
  return `## Workflow Detection Required

**Skill blocked:** \`${skill}\`

No workflow has been activated and no tasks exist. You MUST either:
1. **Detect and activate a workflow first:** \`/workflow-start <workflowId>\`
2. **Or create tasks:** Call \`TaskCreate\` to track your work

### Bypass
Prefix your message with \`quick:\` to bypass enforcement.`;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

function main() {
  try {
    const stdin = fs.readFileSync(0, 'utf-8').trim();
    if (!stdin) process.exit(0);

    const payload = JSON.parse(stdin);
    if (payload.tool_name !== 'Skill') process.exit(0);

    const skillName = payload.tool_input?.skill || '';
    if (!skillName) process.exit(0);

    // Quick mode bypass
    if (process.env.CK_QUICK_MODE === 'true') {
      recordBypass();
      process.exit(0);
    }

    // Always allow workflow-start itself
    if (normalizeSkill(skillName) === 'workflow-start') process.exit(0);

    const workflowActive = hasActiveWorkflow();
    const todosExist = hasTodos();

    // Workflow active + no tasks → block all non-meta
    if (workflowActive && !todosExist) {
      if (isMetaSkill(skillName)) process.exit(0);
      console.log(workflowBlockMessage(skillName));
      process.exit(1);
    }

    // No workflow + no tasks → block non-meta skills
    if (!workflowActive && !todosExist) {
      if (!isMetaSkill(skillName)) {
        console.log(noWorkflowBlockMessage(skillName));
        process.exit(1);
      }
    }

    // Tasks exist → allow all remaining skills (user is tracking)
    process.exit(0);

  } catch (error) {
    console.error(`[skill-enforcement] Uncaught error — allowing operation: ${error.message}`);
    process.exit(0);
  }
}

main();
