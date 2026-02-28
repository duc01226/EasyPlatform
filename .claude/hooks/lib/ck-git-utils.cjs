/**
 * Git Utilities
 *
 * Safe git operations for hooks.
 * Only executes whitelisted read-only git commands.
 *
 * @module ck-git-utils
 */

'use strict';

const { sanitizeSlug } = require('./ck-path-utils.cjs');

/**
 * Safely execute shell command (internal helper)
 * SECURITY: Only accepts whitelisted git read commands
 * @param {string} cmd - Command to execute
 * @returns {string|null} Command output or null
 */
function execSafe(cmd) {
  // Whitelist of safe read-only commands
  const allowedCommands = ['git branch --show-current', 'git rev-parse --abbrev-ref HEAD'];
  if (!allowedCommands.includes(cmd)) {
    return null;
  }

  try {
    return require('child_process')
      .execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] })
      .trim();
  } catch (e) {
    return null;
  }
}

/**
 * Get current git branch (safe execution)
 * @returns {string|null} Current branch name or null
 */
function getGitBranch() {
  return execSafe('git branch --show-current');
}

/**
 * Extract issue ID from branch name
 * @param {string} branch - Git branch name
 * @returns {string|null} Issue ID or null
 */
function extractIssueFromBranch(branch) {
  if (!branch) return null;
  const patterns = [
    /(?:issue|gh|fix|feat|bug)[/-]?(\d+)/i,
    /[/-](\d+)[/-]/,
    /#(\d+)/
  ];
  for (const pattern of patterns) {
    const match = branch.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * Extract feature slug from git branch name
 * Pattern: (?:feat|fix|chore|refactor|docs)/(?:[^/]+/)?(.+)
 * @param {string} branch - Git branch name
 * @param {string} pattern - Regex pattern (optional)
 * @returns {string|null} Extracted slug or null
 */
function extractSlugFromBranch(branch, pattern) {
  if (!branch) return null;
  const defaultPattern = /(?:feat|fix|chore|refactor|docs)\/(?:[^\/]+\/)?(.+)/;
  const regex = pattern ? new RegExp(pattern) : defaultPattern;
  const match = branch.match(regex);
  return match ? sanitizeSlug(match[1]) : null;
}

module.exports = {
  execSafe,
  getGitBranch,
  extractIssueFromBranch,
  extractSlugFromBranch
};
