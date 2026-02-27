#!/usr/bin/env node
/**
 * Workflow Router - Catalog & Detection
 *
 * AI-native workflow catalog generation and injection heuristics.
 * Part of workflow-router.cjs modularization.
 *
 * @module wr-detect
 */

'use strict';

/**
 * Build compact workflow catalog for AI prompt injection.
 * Sorted alphabetically by workflow ID.
 * Medium detail: 2 lines per workflow (name+whenToUse, whenNotToUse+full sequence).
 * Includes confirmFirst flag.
 *
 * @param {Object} config - Workflow config
 * @returns {string} Markdown catalog
 */
function buildWorkflowCatalog(config) {
  const { workflows, commandMapping } = config;
  const sorted = Object.entries(workflows || {}).sort(([a], [b]) => a.localeCompare(b));

  const lines = [];
  for (const [id, wf] of sorted) {
    const seq = wf.sequence || [];
    const seqPreview = seq.map(step => {
      const cmd = (commandMapping || {})[step];
      return cmd?.claude || `/${step}`;
    }).join(' → ');
    const confirm = wf.confirmFirst ? ' | confirmFirst' : '';

    lines.push(`**${id}** — ${wf.name} | ${wf.whenToUse}${confirm} | ${seqPreview}`);
    if (wf.whenNotToUse) {
      lines.push(`  ↳ NOT: ${wf.whenNotToUse}`);
    }
  }

  return lines.join('\n');
}

/**
 * Heuristic: should we inject the workflow catalog for a new prompt?
 * Skip for: explicit slash commands, override prefix, very short prompts (<15 chars)
 *
 * @param {string} userPrompt
 * @param {Object} config
 * @returns {boolean}
 */
function shouldInjectCatalog(userPrompt, _config) {
  return userPrompt.trim().length >= 15;
}

/**
 * Detect if a skill command was invoked (e.g., "/plan", "/cook")
 * @param {string} prompt - User prompt
 * @param {Object} config - Workflow config
 * @returns {string|null} Step ID if skill invoked, null otherwise
 */
function detectSkillInvocation(prompt, config) {
  const trimmed = prompt.trim();

  // Check if prompt starts with a slash command (supports colons and slashes in names)
  const match = trimmed.match(/^\/([\w][\w:/-]*)/);
  if (!match) return null;

  const command = match[1].toLowerCase();
  // Normalize colon-separated format (e.g., "review:codebase" → "review-codebase")
  const normalized = command.replace(/:/g, '-');

  // Map command to step ID
  for (const [stepId, mapping] of Object.entries(config.commandMapping || {})) {
    const claudeCmd = mapping.claude || `/${stepId}`;
    const cmdLower = claudeCmd.toLowerCase();
    if (cmdLower === `/${command}` || cmdLower === `/${normalized}` ||
        cmdLower.endsWith(`/${command}`) || cmdLower.endsWith(`/${normalized}`)) {
      return stepId;
    }
  }

  return command; // Return raw command as fallback
}

module.exports = {
  buildWorkflowCatalog,
  shouldInjectCatalog,
  detectSkillInvocation
};
