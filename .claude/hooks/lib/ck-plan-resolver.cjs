/**
 * Plan Resolution
 *
 * Resolves active plan paths using session state and branch matching.
 * Handles plan naming patterns and date formatting.
 *
 * @module ck-plan-resolver
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { readSessionState } = require('./ck-session-state.cjs');
const { normalizePath } = require('./ck-path-utils.cjs');
const { execSafe, extractSlugFromBranch, extractIssueFromBranch } = require('./ck-git-utils.cjs');

/**
 * Find most recent plan folder by timestamp prefix
 * @param {string} plansDir - Plans directory path
 * @returns {string|null} Most recent plan path or null
 */
function findMostRecentPlan(plansDir) {
  try {
    if (!fs.existsSync(plansDir)) return null;
    const entries = fs.readdirSync(plansDir, { withFileTypes: true });
    const planDirs = entries
      .filter(e => e.isDirectory() && /^\d{6}/.test(e.name))
      .map(e => e.name)
      .sort()
      .reverse();
    return planDirs.length > 0 ? path.join(plansDir, planDirs[0]) : null;
  } catch (e) {
    return null;
  }
}

/**
 * Resolve active plan path using cascading resolution with tracking
 *
 * Resolution semantics:
 * - 'session': Explicitly set via set-active-plan.cjs → ACTIVE (directive)
 * - 'branch': Matched from git branch name → SUGGESTED (hint only)
 *
 * @param {string} sessionId - Session identifier (optional)
 * @param {Object} config - ClaudeKit config
 * @returns {{ path: string|null, resolvedBy: 'session'|'branch'|null }} Resolution result
 */
function resolvePlanPath(sessionId, config) {
  const plansDir = config?.paths?.plans || 'plans';
  const resolution = config?.plan?.resolution || {};
  const order = resolution.order || ['session', 'branch'];
  const branchPattern = resolution.branchPattern;

  for (const method of order) {
    switch (method) {
      case 'session': {
        const state = readSessionState(sessionId);
        if (state?.activePlan) {
          // Only use session state if CWD matches session origin (monorepo support)
          if (state.sessionOrigin && state.sessionOrigin !== process.cwd()) {
            break;  // Fall through to branch
          }
          return { path: state.activePlan, resolvedBy: 'session' };
        }
        break;
      }
      case 'branch': {
        try {
          const branch = execSafe('git branch --show-current');
          const slug = extractSlugFromBranch(branch, branchPattern);
          if (slug && fs.existsSync(plansDir)) {
            const entries = fs.readdirSync(plansDir, { withFileTypes: true })
              .filter(e => e.isDirectory() && e.name.includes(slug));
            if (entries.length > 0) {
              return {
                path: path.join(plansDir, entries[entries.length - 1].name),
                resolvedBy: 'branch'
              };
            }
          }
        } catch (e) {
          // Ignore errors reading plans dir
        }
        break;
      }
    }
  }
  return { path: null, resolvedBy: null };
}

/**
 * Get reports path based on plan resolution
 * Only uses plan-specific path for 'session' resolved plans (explicitly active)
 *
 * @param {string|null} planPath - The plan path
 * @param {string|null} resolvedBy - How plan was resolved ('session'|'branch'|null)
 * @param {Object} planConfig - Plan configuration
 * @param {Object} pathsConfig - Paths configuration
 * @returns {string} Reports path
 */
function getReportsPath(planPath, resolvedBy, planConfig, pathsConfig) {
  const reportsDir = normalizePath(planConfig?.reportsDir) || 'reports';
  const plansDir = normalizePath(pathsConfig?.plans) || 'plans';

  // Only use plan-specific reports path if explicitly active (session state)
  if (planPath && resolvedBy === 'session') {
    const normalizedPlanPath = normalizePath(planPath) || planPath;
    return `${normalizedPlanPath}/${reportsDir}/`;
  }
  // Default path for no plan or suggested (branch-matched) plans
  return `${plansDir}/${reportsDir}/`;
}

/**
 * Format issue ID with prefix
 * @param {string} issueId - Issue ID
 * @param {Object} planConfig - Plan configuration
 * @returns {string|null} Formatted issue ID
 */
function formatIssueId(issueId, planConfig) {
  if (!issueId) return null;
  return planConfig.issuePrefix ? `${planConfig.issuePrefix}${issueId}` : `#${issueId}`;
}

/**
 * Format date according to dateFormat config
 * Supports: YYMMDD, YYMMDD-HHmm, YYYYMMDD, etc.
 * @param {string} format - Date format string
 * @returns {string} Formatted date
 */
function formatDate(format) {
  const now = new Date();
  const pad = (n, len = 2) => String(n).padStart(len, '0');

  const tokens = {
    'YYYY': now.getFullYear(),
    'YY': String(now.getFullYear()).slice(-2),
    'MM': pad(now.getMonth() + 1),
    'DD': pad(now.getDate()),
    'HH': pad(now.getHours()),
    'mm': pad(now.getMinutes()),
    'ss': pad(now.getSeconds())
  };

  let result = format;
  for (const [token, value] of Object.entries(tokens)) {
    result = result.replace(token, value);
  }
  return result;
}

/**
 * Validate naming pattern result
 * @param {string} pattern - Resolved naming pattern
 * @returns {{ valid: boolean, error?: string }} Validation result
 */
function validateNamingPattern(pattern) {
  if (!pattern || typeof pattern !== 'string') {
    return { valid: false, error: 'Pattern is empty or not a string' };
  }

  // After removing {slug} placeholder, should still have content
  const withoutSlug = pattern.replace(/\{slug\}/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
  if (!withoutSlug) {
    return { valid: false, error: 'Pattern resolves to empty after removing {slug}' };
  }

  // Check for remaining unresolved placeholders (besides {slug})
  const unresolvedMatch = withoutSlug.match(/\{[^}]+\}/);
  if (unresolvedMatch) {
    return { valid: false, error: `Unresolved placeholder: ${unresolvedMatch[0]}` };
  }

  // Pattern must contain {slug} for agents to substitute
  if (!pattern.includes('{slug}')) {
    return { valid: false, error: 'Pattern must contain {slug} placeholder' };
  }

  return { valid: true };
}

/**
 * Resolve naming pattern with date and optional issue prefix
 * Keeps {slug} as placeholder for agents to substitute
 *
 * @param {Object} planConfig - Plan configuration
 * @param {string|null} gitBranch - Current git branch (for issue extraction)
 * @returns {string} Resolved naming pattern with {slug} placeholder
 */
function resolveNamingPattern(planConfig, gitBranch) {
  const { namingFormat, dateFormat, issuePrefix } = planConfig;
  const formattedDate = formatDate(dateFormat);

  // Try to extract issue ID from branch name
  const issueId = extractIssueFromBranch(gitBranch);
  const fullIssue = issueId && issuePrefix ? `${issuePrefix}${issueId}` : null;

  // Build pattern by substituting {date} and {issue}, keep {slug}
  let pattern = namingFormat;
  pattern = pattern.replace('{date}', formattedDate);

  if (fullIssue) {
    pattern = pattern.replace('{issue}', fullIssue);
  } else {
    // Remove {issue} and any trailing/leading dash
    pattern = pattern.replace(/-?\{issue\}-?/, '-').replace(/--+/g, '-');
  }

  // Clean up the result
  pattern = pattern
    .replace(/^-+/, '')
    .replace(/-+$/, '')
    .replace(/-+(\{slug\})/g, '-$1')
    .replace(/(\{slug\})-+/g, '$1-')
    .replace(/--+/g, '-');

  // Validate the resulting pattern
  const validation = validateNamingPattern(pattern);
  if (!validation.valid) {
    if (process.env.CK_DEBUG) {
      console.error(`[ck-plan-resolver] Warning: ${validation.error}`);
    }
  }

  return pattern;
}

module.exports = {
  findMostRecentPlan,
  resolvePlanPath,
  getReportsPath,
  formatIssueId,
  formatDate,
  validateNamingPattern,
  resolveNamingPattern
};
