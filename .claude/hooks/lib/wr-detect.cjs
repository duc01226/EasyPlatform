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
 * Medium detail: 2 lines per workflow (name+whenToUse, whenNotToUse+sequence).
 * Includes confirmFirst flag.
 *
 * @param {Object} config - Workflow config
 * @returns {string} Markdown catalog (~45 lines for 20 workflows)
 */
function buildWorkflowCatalog(config) {
  const { workflows, commandMapping } = config;
  const sorted = Object.entries(workflows || {}).sort(([a], [b]) => a.localeCompare(b));

  const lines = [];
  for (const [id, wf] of sorted) {
    const seq = wf.sequence || [];
    const seqPreview = seq.slice(0, 3).map(step => {
      const cmd = (commandMapping || {})[step];
      return cmd?.claude || `/${step}`;
    }).join(' → ');
    const seqSuffix = seq.length > 3 ? ` → ... (${seq.length} steps)` : '';
    const confirm = wf.confirmFirst ? ' | confirmFirst' : '';

    lines.push(`**${id}** — ${wf.name} | ${wf.whenToUse}${confirm} | ${seqPreview}${seqSuffix}`);
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
function shouldInjectCatalog(userPrompt, config) {
  const trimmed = userPrompt.trim();
  if (/^\/\w+/.test(trimmed)) return false;
  if (config.settings?.overridePrefix &&
      trimmed.toLowerCase().startsWith(config.settings.overridePrefix.toLowerCase()))
    return false;
  if (trimmed.length < 15) return false;
  return true;
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

  // Map command to step ID
  for (const [stepId, mapping] of Object.entries(config.commandMapping || {})) {
    const claudeCmd = mapping.claude || `/${stepId}`;
    if (claudeCmd.toLowerCase() === `/${command}` || claudeCmd.toLowerCase().endsWith(`/${command}`)) {
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
