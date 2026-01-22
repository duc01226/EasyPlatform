#!/usr/bin/env node
/**
 * ClaudeKit Config Loading
 *
 * Configuration loading, merging, path sanitization, and plan resolution.
 * Part of the ck-config-utils modularization.
 *
 * @module ck-config
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

const { readSessionState } = require('./ck-session.cjs');
const { getGitBranch, extractSlugFromBranch } = require('./ck-git.cjs');

// Config file paths
const LOCAL_CONFIG_PATH = '.claude/.ck.json';
const GLOBAL_CONFIG_PATH = path.join(os.homedir(), '.claude', '.ck.json');
const CONFIG_PATH = LOCAL_CONFIG_PATH; // Legacy export

// Default configuration
const DEFAULT_CONFIG = {
  plan: {
    namingFormat: '{date}-{issue}-{slug}',
    dateFormat: 'YYMMDD-HHmm',
    issuePrefix: null,
    reportsDir: 'reports',
    resolution: {
      order: ['session', 'branch'],
      branchPattern: '(?:feat|fix|chore|refactor|docs)/(?:[^/]+/)?(.+)'
    },
    validation: {
      mode: 'prompt',
      minQuestions: 3,
      maxQuestions: 8,
      focusAreas: ['assumptions', 'risks', 'tradeoffs', 'architecture']
    }
  },
  paths: {
    docs: 'docs',
    plans: 'plans'
  },
  locale: {
    thinkingLanguage: null,
    responseLanguage: null
  },
  trust: {
    passphrase: null,
    enabled: false
  },
  project: {
    type: 'auto',
    packageManager: 'auto',
    framework: 'auto'
  },
  assertions: []
};

/**
 * Deep merge objects (source values override target, nested objects merged recursively)
 * Arrays are replaced entirely (not concatenated) to avoid duplicate entries
 * @param {Object} target - Base object
 * @param {Object} source - Object to merge (takes precedence)
 * @returns {Object} Merged object
 */
function deepMerge(target, source) {
  if (!source || typeof source !== 'object') return target;
  if (!target || typeof target !== 'object') return source;

  const result = { ...target };
  for (const key of Object.keys(source)) {
    const sourceVal = source[key];
    const targetVal = target[key];

    if (Array.isArray(sourceVal)) {
      result[key] = [...sourceVal];
    } else if (sourceVal !== null && typeof sourceVal === 'object' && !Array.isArray(sourceVal)) {
      result[key] = deepMerge(targetVal || {}, sourceVal);
    } else {
      result[key] = sourceVal;
    }
  }
  return result;
}

/**
 * Load config from a specific file path
 * @param {string} configPath - Path to config file
 * @returns {Object|null} Parsed config or null if not found/invalid
 */
function loadConfigFromPath(configPath) {
  try {
    if (!fs.existsSync(configPath)) return null;
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (e) {
    return null;
  }
}

/**
 * Normalize path value (trim, remove trailing slashes, handle empty)
 * @param {string} pathValue - Path to normalize
 * @returns {string|null} Normalized path or null if invalid
 */
function normalizePath(pathValue) {
  if (!pathValue || typeof pathValue !== 'string') return null;

  let normalized = pathValue.trim();
  if (!normalized) return null;

  normalized = normalized.replace(/[/\\]+$/, '');
  if (!normalized) return null;

  return normalized;
}

/**
 * Check if path is absolute
 * @param {string} pathValue - Path to check
 * @returns {boolean} True if absolute path
 */
function isAbsolutePath(pathValue) {
  if (!pathValue) return false;
  return path.isAbsolute(pathValue);
}

/**
 * Sanitize path values
 * - Normalizes path (trim, remove trailing slashes)
 * - Allows absolute paths (for consolidated plans use case)
 * - Prevents obvious security issues (null bytes, etc.)
 *
 * @param {string} pathValue - Path to sanitize
 * @param {string} projectRoot - Project root for relative path resolution
 * @returns {string|null} Sanitized path or null if invalid
 */
function sanitizePath(pathValue, projectRoot) {
  const normalized = normalizePath(pathValue);
  if (!normalized) return null;

  if (/[\x00]/.test(normalized)) return null;

  if (isAbsolutePath(normalized)) {
    return normalized;
  }

  const resolved = path.resolve(projectRoot, normalized);

  if (!resolved.startsWith(projectRoot + path.sep) && resolved !== projectRoot) {
    return null;
  }

  return normalized;
}

/**
 * Validate and sanitize config paths
 * @param {Object} config - Config object
 * @param {string} projectRoot - Project root path
 * @returns {Object} Sanitized config
 */
function sanitizeConfig(config, projectRoot) {
  const result = { ...config };

  if (result.plan) {
    result.plan = { ...result.plan };
    if (!sanitizePath(result.plan.reportsDir, projectRoot)) {
      result.plan.reportsDir = DEFAULT_CONFIG.plan.reportsDir;
    }
    result.plan.resolution = {
      ...DEFAULT_CONFIG.plan.resolution,
      ...result.plan.resolution
    };
    result.plan.validation = {
      ...DEFAULT_CONFIG.plan.validation,
      ...result.plan.validation
    };
  }

  if (result.paths) {
    result.paths = { ...result.paths };
    if (!sanitizePath(result.paths.docs, projectRoot)) {
      result.paths.docs = DEFAULT_CONFIG.paths.docs;
    }
    if (!sanitizePath(result.paths.plans, projectRoot)) {
      result.paths.plans = DEFAULT_CONFIG.paths.plans;
    }
  }

  if (result.locale) {
    result.locale = { ...result.locale };
  }

  return result;
}

/**
 * Get default config with optional sections
 * @param {boolean} includeProject - Include project section
 * @param {boolean} includeAssertions - Include assertions
 * @param {boolean} includeLocale - Include locale section
 * @returns {Object} Default config
 */
function getDefaultConfig(includeProject = true, includeAssertions = true, includeLocale = true) {
  const result = {
    plan: { ...DEFAULT_CONFIG.plan },
    paths: { ...DEFAULT_CONFIG.paths },
    codingLevel: -1
  };
  if (includeLocale) {
    result.locale = { ...DEFAULT_CONFIG.locale };
  }
  if (includeProject) {
    result.project = { ...DEFAULT_CONFIG.project };
  }
  if (includeAssertions) {
    result.assertions = [];
  }
  return result;
}

/**
 * Load config with cascading resolution: DEFAULT → global → local
 * @param {Object} options - Options for config loading
 * @returns {Object} Merged config
 */
function loadConfig(options = {}) {
  const { includeProject = true, includeAssertions = true, includeLocale = true } = options;
  const projectRoot = process.cwd();

  const globalConfig = loadConfigFromPath(GLOBAL_CONFIG_PATH);
  const localConfig = loadConfigFromPath(LOCAL_CONFIG_PATH);

  if (!globalConfig && !localConfig) {
    return getDefaultConfig(includeProject, includeAssertions, includeLocale);
  }

  try {
    let merged = deepMerge({}, DEFAULT_CONFIG);
    if (globalConfig) merged = deepMerge(merged, globalConfig);
    if (localConfig) merged = deepMerge(merged, localConfig);

    // Start with full merged config to preserve custom sections (e.g., codeReview)
    const result = { ...merged };

    // Ensure required sections have defaults
    result.plan = merged.plan || DEFAULT_CONFIG.plan;
    result.paths = merged.paths || DEFAULT_CONFIG.paths;

    if (includeLocale) {
      result.locale = merged.locale || DEFAULT_CONFIG.locale;
    } else {
      delete result.locale;
    }
    result.trust = merged.trust || DEFAULT_CONFIG.trust;
    if (includeProject) {
      result.project = merged.project || DEFAULT_CONFIG.project;
    } else {
      delete result.project;
    }
    if (includeAssertions) {
      result.assertions = merged.assertions || [];
    } else {
      delete result.assertions;
    }
    result.codingLevel = merged.codingLevel ?? -1;

    return sanitizeConfig(result, projectRoot);
  } catch (e) {
    return getDefaultConfig(includeProject, includeAssertions, includeLocale);
  }
}

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
 * @param {string} sessionId - Session identifier (optional)
 * @param {Object} config - ClaudeKit config
 * @returns {{ path: string|null, resolvedBy: 'session'|'branch'|null }}
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
          if (state.sessionOrigin && state.sessionOrigin !== process.cwd()) {
            break;
          }
          return { path: state.activePlan, resolvedBy: 'session' };
        }
        break;
      }
      case 'branch': {
        try {
          const branch = getGitBranch();
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
          // Ignore errors
        }
        break;
      }
    }
  }
  return { path: null, resolvedBy: null };
}

/**
 * Get reports path based on plan resolution
 * @param {string|null} planPath - The plan path
 * @param {string|null} resolvedBy - How plan was resolved
 * @param {Object} planConfig - Plan configuration
 * @param {Object} pathsConfig - Paths configuration
 * @returns {string} Reports path
 */
function getReportsPath(planPath, resolvedBy, planConfig, pathsConfig) {
  const reportsDir = normalizePath(planConfig?.reportsDir) || 'reports';
  const plansDir = normalizePath(pathsConfig?.plans) || 'plans';

  if (planPath && resolvedBy === 'session') {
    const normalizedPlanPath = normalizePath(planPath) || planPath;
    return `${normalizedPlanPath}/${reportsDir}/`;
  }
  return `${plansDir}/${reportsDir}/`;
}

/**
 * Escape shell special characters for env file values
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeShellValue(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\$/g, '\\$');
}

/**
 * Write environment variable to CLAUDE_ENV_FILE (with escaping)
 * @param {string} envFile - Env file path
 * @param {string} key - Variable name
 * @param {*} value - Variable value
 */
function writeEnv(envFile, key, value) {
  if (envFile && value !== null && value !== undefined) {
    const escaped = escapeShellValue(String(value));
    fs.appendFileSync(envFile, `export ${key}="${escaped}"\n`);
  }
}

module.exports = {
  // Constants
  CONFIG_PATH,
  LOCAL_CONFIG_PATH,
  GLOBAL_CONFIG_PATH,
  DEFAULT_CONFIG,

  // Config functions
  deepMerge,
  loadConfigFromPath,
  loadConfig,
  getDefaultConfig,
  sanitizeConfig,

  // Path functions
  normalizePath,
  isAbsolutePath,
  sanitizePath,

  // Plan functions
  resolvePlanPath,
  findMostRecentPlan,
  getReportsPath,

  // Env functions
  escapeShellValue,
  writeEnv
};
