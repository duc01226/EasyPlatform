#!/usr/bin/env node
'use strict';

/**
 * Skill Enforcement - PreToolUse Hook for Skill tool
 *
 * Enforces task tracking for skill invocations:
 *   - Meta skills (help, memory, etc.) always allowed
 *   - When workflow active + no tasks → block all non-meta skills
 *   - When no workflow + no tasks → block non-meta skills
 *   - Implementation skills (cook, code, fix, etc.) require tasks
 *   - Research/planning skills allowed without tasks
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
  'help', 'memory', 'checkpoint', 'recover', 'context', 'ck-help', 'watzup', 'compact'
]);

// Allowed without tasks (research/investigation phase) — includes META_SKILLS
const ALLOWED_SKILLS = new Set([
  ...META_SKILLS,
  'scout', 'investigate', 'explore',
  'plan', 'plan:hard', 'plan-validate', 'design',
  'analyze', 'review', 'code-review', 'review:codebase',
  'debug', 'docs', 'docs:update', 'test',
  'git:status', 'git:log', 'git:diff',
]);

// Implementation keywords — skills containing these require tasks
const IMPL_KEYWORDS = ['cook', 'code', 'fix', 'implement', 'refactor', 'build', 'create', 'develop', 'feature', 'migration'];

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function normalizeSkill(skill) {
  if (!skill) return '';
  return skill.replace(/^\/+/, '').toLowerCase().trim();
}

function isAllowedSkill(skill) {
  const norm = normalizeSkill(skill);
  if (ALLOWED_SKILLS.has(norm)) return true;
  return ALLOWED_SKILLS.has(norm.split(':')[0]);
}

function requiresTodos(skill) {
  const norm = normalizeSkill(skill);
  // Check base name and full name against implementation keywords
  const baseName = norm.split(':')[0];
  return IMPL_KEYWORDS.some(kw => baseName === kw || norm.includes(kw));
}

// ═══════════════════════════════════════════════════════════════════════════
// MESSAGES
// ═══════════════════════════════════════════════════════════════════════════

function blockMessage(skill) {
  return `## Todo Enforcement Block

**Skill blocked:** \`${skill}\`

Implementation skills require task tracking. Call \`TaskCreate\` for EACH workflow step BEFORE running implementation skills.

### Bypass
Prefix your message with \`quick:\` to bypass enforcement.`;
}

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
3. **Or ask user to skip workflow** if the task is simple/straightforward

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

    const sessionId = process.env.CLAUDE_SESSION_ID || process.env.CK_SESSION_ID || 'unknown';
    const skillName = payload.tool_input?.skill || '';
    if (!skillName) process.exit(0);

    // Quick mode bypass
    if (process.env.CK_QUICK_MODE === 'true') {
      recordBypass(sessionId, { skill: skillName, reason: 'quick_mode' });
      process.exit(0);
    }

    // Always allow workflow-start itself
    if (normalizeSkill(skillName) === 'workflow-start') process.exit(0);

    const workflowActive = hasActiveWorkflow(sessionId);
    const todosExist = hasTodos(sessionId);

    // Workflow active + no tasks → block all non-meta
    if (workflowActive && !todosExist) {
      if (META_SKILLS.has(normalizeSkill(skillName))) process.exit(0);
      console.log(workflowBlockMessage(skillName));
      process.exit(1);
    }

    // No workflow + no tasks → block non-meta skills
    if (!workflowActive && !todosExist) {
      const norm = normalizeSkill(skillName);
      if (!META_SKILLS.has(norm)) {
        console.log(noWorkflowBlockMessage(skillName));
        process.exit(1);
      }
    }

    // Research/planning skills → allow
    if (isAllowedSkill(skillName)) process.exit(0);

    // Non-implementation skill → allow
    if (!requiresTodos(skillName)) process.exit(0);

    // Implementation skill + tasks exist → allow
    if (todosExist) process.exit(0);

    // Implementation skill + no tasks → block
    console.log(blockMessage(skillName));
    process.exit(1);

  } catch (error) {
    console.error(`[skill-enforcement] Uncaught error — allowing operation: ${error.message}`);
    process.exit(0);
  }
}

main();
