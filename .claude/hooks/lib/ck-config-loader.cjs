/**
 * Config Loading and Merging
 *
 * Loads and merges configuration from global and local sources.
 * Provides default configuration values.
 *
 * @module ck-config-loader
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { sanitizePath } = require('./ck-path-utils.cjs');

const LOCAL_CONFIG_PATH = '.claude/.ck.json';
const GLOBAL_CONFIG_PATH = path.join(os.homedir(), '.claude', '.ck.json');

// Legacy export for backward compatibility
const CONFIG_PATH = LOCAL_CONFIG_PATH;

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
      mode: 'prompt',  // 'auto' | 'prompt' | 'off'
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

    // Arrays: replace entirely (don't concatenate)
    if (Array.isArray(sourceVal)) {
      result[key] = [...sourceVal];
    }
    // Objects: recurse (but not null)
    else if (sourceVal !== null && typeof sourceVal === 'object' && !Array.isArray(sourceVal)) {
      result[key] = deepMerge(targetVal || {}, sourceVal);
    }
    // Primitives: source wins
    else {
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
 * Validate and sanitize config paths
 * @param {Object} config - Config object to sanitize
 * @param {string} projectRoot - Project root directory
 * @returns {Object} Sanitized config
 */
function sanitizeConfig(config, projectRoot) {
  const result = { ...config };

  if (result.plan) {
    result.plan = { ...result.plan };
    if (!sanitizePath(result.plan.reportsDir, projectRoot)) {
      result.plan.reportsDir = DEFAULT_CONFIG.plan.reportsDir;
    }
    // Merge resolution defaults
    result.plan.resolution = {
      ...DEFAULT_CONFIG.plan.resolution,
      ...result.plan.resolution
    };
    // Merge validation defaults
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
    codingLevel: -1  // Default: disabled (no injection, saves tokens)
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
 *
 * Resolution order (each layer overrides the previous):
 *   1. DEFAULT_CONFIG (hardcoded defaults)
 *   2. Global config (~/.claude/.ck.json) - user preferences
 *   3. Local config (./.claude/.ck.json) - project-specific overrides
 *
 * @param {Object} options - Options for config loading
 * @param {boolean} options.includeProject - Include project section (default: true)
 * @param {boolean} options.includeAssertions - Include assertions (default: true)
 * @param {boolean} options.includeLocale - Include locale section (default: true)
 * @returns {Object} Merged config
 */
function loadConfig(options = {}) {
  const { includeProject = true, includeAssertions = true, includeLocale = true } = options;
  const projectRoot = process.cwd();

  // Load configs from both locations
  const globalConfig = loadConfigFromPath(GLOBAL_CONFIG_PATH);
  const localConfig = loadConfigFromPath(LOCAL_CONFIG_PATH);

  // No config files found - use defaults
  if (!globalConfig && !localConfig) {
    return getDefaultConfig(includeProject, includeAssertions, includeLocale);
  }

  try {
    // Deep merge: DEFAULT → global → local (local wins)
    let merged = deepMerge({}, DEFAULT_CONFIG);
    if (globalConfig) merged = deepMerge(merged, globalConfig);
    if (localConfig) merged = deepMerge(merged, localConfig);

    // Build result with optional sections
    const result = {
      plan: merged.plan || DEFAULT_CONFIG.plan,
      paths: merged.paths || DEFAULT_CONFIG.paths
    };

    if (includeLocale) {
      result.locale = merged.locale || DEFAULT_CONFIG.locale;
    }
    // Always include trust config for verification
    result.trust = merged.trust || DEFAULT_CONFIG.trust;
    if (includeProject) {
      result.project = merged.project || DEFAULT_CONFIG.project;
    }
    if (includeAssertions) {
      result.assertions = merged.assertions || [];
    }
    // Coding level for output style selection (-1 to 5, default: -1 = disabled)
    result.codingLevel = merged.codingLevel ?? -1;

    return sanitizeConfig(result, projectRoot);
  } catch (e) {
    return getDefaultConfig(includeProject, includeAssertions, includeLocale);
  }
}

module.exports = {
  CONFIG_PATH,
  LOCAL_CONFIG_PATH,
  GLOBAL_CONFIG_PATH,
  DEFAULT_CONFIG,
  deepMerge,
  loadConfigFromPath,
  loadConfig,
  getDefaultConfig,
  sanitizeConfig
};
