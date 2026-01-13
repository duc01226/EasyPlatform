/**
 * ClaudeKit Config Utils - Facade
 *
 * This file re-exports all utilities from modularized ck-* modules
 * for backward compatibility. New code should import from specific modules:
 *
 * - ck-config.cjs  - Config loading, paths, plan resolution
 * - ck-git.cjs     - Git operations
 * - ck-naming.cjs  - Naming patterns, slug sanitization
 * - ck-session.cjs - Session state management
 * - ck-paths.cjs   - Temp file paths
 *
 * @module ck-config-utils
 */

'use strict';

// Re-export all from modularized modules
const ckConfig = require('./ck-config.cjs');
const ckGit = require('./ck-git.cjs');
const ckNaming = require('./ck-naming.cjs');
const ckSession = require('./ck-session.cjs');

module.exports = {
  // From ck-config
  CONFIG_PATH: ckConfig.CONFIG_PATH,
  LOCAL_CONFIG_PATH: ckConfig.LOCAL_CONFIG_PATH,
  GLOBAL_CONFIG_PATH: ckConfig.GLOBAL_CONFIG_PATH,
  DEFAULT_CONFIG: ckConfig.DEFAULT_CONFIG,
  deepMerge: ckConfig.deepMerge,
  loadConfigFromPath: ckConfig.loadConfigFromPath,
  loadConfig: ckConfig.loadConfig,
  normalizePath: ckConfig.normalizePath,
  isAbsolutePath: ckConfig.isAbsolutePath,
  sanitizePath: ckConfig.sanitizePath,
  sanitizeConfig: ckConfig.sanitizeConfig,
  escapeShellValue: ckConfig.escapeShellValue,
  writeEnv: ckConfig.writeEnv,
  resolvePlanPath: ckConfig.resolvePlanPath,
  findMostRecentPlan: ckConfig.findMostRecentPlan,
  getReportsPath: ckConfig.getReportsPath,

  // From ck-git
  getGitBranch: ckGit.getGitBranch,
  getGitRemoteUrl: ckGit.getGitRemoteUrl,
  extractSlugFromBranch: ckGit.extractSlugFromBranch,
  extractIssueFromBranch: ckGit.extractIssueFromBranch,

  // From ck-naming
  INVALID_FILENAME_CHARS: ckNaming.INVALID_FILENAME_CHARS,
  sanitizeSlug: ckNaming.sanitizeSlug,
  formatDate: ckNaming.formatDate,
  formatIssueId: ckNaming.formatIssueId,
  validateNamingPattern: ckNaming.validateNamingPattern,
  resolveNamingPattern: ckNaming.resolveNamingPattern,

  // From ck-session
  getSessionTempPath: ckSession.getSessionTempPath,
  readSessionState: ckSession.readSessionState,
  writeSessionState: ckSession.writeSessionState
};
