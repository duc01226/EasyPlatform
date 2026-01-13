#!/usr/bin/env node
/**
 * ClaudeKit Git Operations
 *
 * Git-related utilities for branch parsing and safe command execution.
 * Part of the ck-config-utils modularization.
 *
 * Uses si-exec.cjs for actual command execution (DRY consolidation).
 *
 * @module ck-git
 */

'use strict';

const { execSafe: execSafeBase } = require('./si-exec.cjs');

// Whitelist of safe read-only git commands
const ALLOWED_GIT_COMMANDS = [
  'git branch --show-current',
  'git rev-parse --abbrev-ref HEAD',
  'git config --get remote.origin.url'
];

/**
 * Safely execute git command (security wrapper)
 * SECURITY: Only accepts whitelisted git read commands
 * @param {string} cmd - Command to execute
 * @returns {string|null} Command output or null
 */
function execSafe(cmd) {
  if (!ALLOWED_GIT_COMMANDS.includes(cmd)) {
    return null;
  }
  return execSafeBase(cmd, 5000);
}

/**
 * Get git remote URL (safe execution)
 * @returns {string|null} Remote origin URL or null
 */
function getGitRemoteUrl() {
  return execSafe('git config --get remote.origin.url');
}

/**
 * Get current git branch (safe execution)
 * @returns {string|null} Current branch name or null
 */
function getGitBranch() {
  return execSafe('git branch --show-current');
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

  // Import sanitizeSlug from ck-naming to avoid circular dependency
  // We defer the require to avoid loading order issues
  const { sanitizeSlug } = require('./ck-naming.cjs');

  const defaultPattern = /(?:feat|fix|chore|refactor|docs)\/(?:[^\/]+\/)?(.+)/;
  const regex = pattern ? new RegExp(pattern) : defaultPattern;
  const match = branch.match(regex);
  return match ? sanitizeSlug(match[1]) : null;
}

/**
 * Extract issue ID from branch name
 * @param {string} branch - Git branch name
 * @returns {string|null} Extracted issue ID or null
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

module.exports = {
  execSafe,
  getGitBranch,
  getGitRemoteUrl,
  extractSlugFromBranch,
  extractIssueFromBranch
};
