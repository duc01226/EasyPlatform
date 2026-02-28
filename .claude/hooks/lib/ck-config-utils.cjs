/**
 * ClaudeKit Config Utilities - Facade Module
 *
 * This module provides backward compatibility by re-exporting from specialized modules.
 * For new code, prefer importing directly from the specific modules:
 *
 * - ck-session-state.cjs  - Session state management
 * - ck-config-loader.cjs  - Config loading and merging
 * - ck-path-utils.cjs     - Path sanitization and validation
 * - ck-plan-resolver.cjs  - Plan path resolution
 * - ck-git-utils.cjs      - Git operations
 * - ck-env-utils.cjs      - Environment utilities
 *
 * @module ck-config-utils
 */

'use strict';

// Re-export from specialized modules for backward compatibility
const {
  getSessionTempPath,
  readSessionState,
  writeSessionState,
  deleteSessionState
} = require('./ck-session-state.cjs');

const {
  CONFIG_PATH,
  LOCAL_CONFIG_PATH,
  GLOBAL_CONFIG_PATH,
  DEFAULT_CONFIG,
  deepMerge,
  loadConfigFromPath,
  loadConfig,
  getDefaultConfig,
  sanitizeConfig
} = require('./ck-config-loader.cjs');

const {
  INVALID_FILENAME_CHARS,
  sanitizeSlug,
  normalizePath,
  normalizePathForComparison,
  isAbsolutePath,
  sanitizePath
} = require('./ck-path-utils.cjs');

const {
  findMostRecentPlan,
  resolvePlanPath,
  getReportsPath,
  formatIssueId,
  formatDate,
  validateNamingPattern,
  resolveNamingPattern
} = require('./ck-plan-resolver.cjs');

const {
  execSafe,
  getGitBranch,
  extractIssueFromBranch,
  extractSlugFromBranch
} = require('./ck-git-utils.cjs');

const {
  escapeShellValue,
  writeEnv
} = require('./ck-env-utils.cjs');

module.exports = {
  // Session state
  getSessionTempPath,
  readSessionState,
  writeSessionState,
  deleteSessionState,

  // Config loading
  CONFIG_PATH,
  LOCAL_CONFIG_PATH,
  GLOBAL_CONFIG_PATH,
  DEFAULT_CONFIG,
  deepMerge,
  loadConfigFromPath,
  loadConfig,
  getDefaultConfig,
  sanitizeConfig,

  // Path utilities
  INVALID_FILENAME_CHARS,
  sanitizeSlug,
  normalizePath,
  normalizePathForComparison,
  isAbsolutePath,
  sanitizePath,

  // Plan resolution
  findMostRecentPlan,
  resolvePlanPath,
  getReportsPath,
  formatIssueId,
  formatDate,
  validateNamingPattern,
  resolveNamingPattern,

  // Git utilities
  execSafe,
  getGitBranch,
  extractIssueFromBranch,
  extractSlugFromBranch,

  // Environment utilities
  escapeShellValue,
  writeEnv
};
