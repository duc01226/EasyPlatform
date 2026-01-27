#!/usr/bin/env node
/**
 * Workflow Router - Intent Detection
 *
 * Pattern-based intent detection for workflow matching.
 * Part of workflow-router.cjs modularization.
 *
 * @module wr-detect
 */

'use strict';

/**
 * Detect workflow intent from user prompt
 * @param {string} userPrompt - User's input prompt
 * @param {Object} config - Workflow configuration
 * @returns {Object} Detection result with workflow info or skipped/detected flags
 */
function detectIntent(userPrompt, config) {
  const { workflows, settings } = config;

  // Check for override prefix
  if (settings.allowOverride && settings.overridePrefix) {
    const lowerPrompt = userPrompt.toLowerCase().trim();
    if (lowerPrompt.startsWith(settings.overridePrefix.toLowerCase())) {
      return { skipped: true, reason: 'override_prefix' };
    }
  }

  // Check for explicit command invocation (skip detection)
  if (/^\/\w+/.test(userPrompt.trim())) {
    return { skipped: true, reason: 'explicit_command' };
  }

  // Score each workflow
  const scores = [];

  for (const [workflowId, workflow] of Object.entries(workflows)) {
    let score = 0;
    let matchedPatterns = [];
    let excludeMatched = false;

    // Check exclude patterns first
    if (workflow.excludePatterns && workflow.excludePatterns.length > 0) {
      for (const pattern of workflow.excludePatterns) {
        try {
          if (new RegExp(pattern, 'i').test(userPrompt)) {
            excludeMatched = true;
            break;
          }
        } catch (e) {
          // Invalid regex, skip
        }
      }
    }

    if (excludeMatched) continue;

    // Check trigger patterns
    if (workflow.triggerPatterns && workflow.triggerPatterns.length > 0) {
      for (const pattern of workflow.triggerPatterns) {
        try {
          const regex = new RegExp(pattern, 'i');
          if (regex.test(userPrompt)) {
            score += 10;
            matchedPatterns.push(pattern);
          }
        } catch (e) {
          // Invalid regex, skip
        }
      }
    }

    if (score > 0) {
      scores.push({
        workflowId,
        workflow,
        score,
        matchedPatterns,
        adjustedScore: score - (workflow.priority || 50) // Lower priority number = higher preference
      });
    }
  }

  if (scores.length === 0) {
    return { detected: false };
  }

  // Sort by adjusted score (highest first)
  scores.sort((a, b) => b.adjustedScore - a.adjustedScore);

  const best = scores[0];
  const totalPatterns = (best.workflow.triggerPatterns || []).length;
  const confidence = Math.min(100, Math.round((best.matchedPatterns.length / Math.max(totalPatterns, 1)) * 100));

  return {
    detected: true,
    workflowId: best.workflowId,
    workflow: best.workflow,
    confidence,
    matchedPatterns: best.matchedPatterns,
    alternatives: scores.slice(1, 3).map(s => s.workflowId)
  };
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
  detectIntent,
  detectSkillInvocation
};
