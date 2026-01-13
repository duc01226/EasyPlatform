#!/usr/bin/env node
/**
 * Session Init - Output Formatting
 *
 * Context output formatting and coding level guidelines.
 * Part of session-init.cjs modularization.
 *
 * @module si-output
 */

'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Get coding level style name mapping
 * @param {number} level - Coding level (0-5)
 * @returns {string} Style name for /output-style command
 */
function getCodingLevelStyleName(level) {
  const styleMap = {
    0: 'coding-level-0-eli5',
    1: 'coding-level-1-junior',
    2: 'coding-level-2-mid',
    3: 'coding-level-3-senior',
    4: 'coding-level-4-lead',
    5: 'coding-level-5-god'
  };
  return styleMap[level] || 'coding-level-5-god';
}

/**
 * Get coding level guidelines by reading from output-styles .md files
 * This ensures single source of truth - users can customize the .md files directly
 * @param {number} level - Coding level (-1 to 5)
 * @returns {string|null} Guidelines text (frontmatter stripped) or null if disabled
 */
function getCodingLevelGuidelines(level) {
  // -1 = disabled (no injection, saves tokens)
  // 5 = god mode (still injects minimal guidelines)
  if (level === -1 || level === null || level === undefined) return null;

  const styleName = getCodingLevelStyleName(level);
  const stylePath = path.join(__dirname, '..', '..', 'output-styles', `${styleName}.md`);

  try {
    if (!fs.existsSync(stylePath)) return null;

    const content = fs.readFileSync(stylePath, 'utf8');
    // Strip YAML frontmatter (between --- markers at start of file)
    const withoutFrontmatter = content.replace(/^---[\s\S]*?---\n*/, '').trim();
    return withoutFrontmatter;
  } catch (e) {
    return null;
  }
}

/**
 * Build context summary for output (compact, single line)
 * @param {Object} config - Loaded config
 * @param {Object} detections - Project detections
 * @param {{ path: string|null, resolvedBy: string|null }} resolved - Plan resolution result
 * @returns {string} Formatted context summary
 */
function buildContextOutput(config, detections, resolved) {
  const lines = [`Project: ${detections.type || 'unknown'}`];
  if (detections.pm) lines.push(`PM: ${detections.pm}`);
  lines.push(`Plan naming: ${config.plan.namingFormat}`);

  // Show plan status with resolution context
  if (resolved.path) {
    if (resolved.resolvedBy === 'session') {
      lines.push(`Plan: ${resolved.path}`);
    } else {
      lines.push(`Suggested: ${resolved.path}`);
    }
  }

  return lines.join(' | ');
}

module.exports = {
  getCodingLevelStyleName,
  getCodingLevelGuidelines,
  buildContextOutput
};
