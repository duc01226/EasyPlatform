/**
 * Config Loading and Merging
 *
 * Loads and merges configuration from global and local sources.
 * Provides default configuration values.
 *
 * @module ck-config-loader
 */

"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");
const { sanitizePath } = require("./ck-path-utils.cjs");
const { validateCkConfig } = require("./ck-config-schema.cjs");
const { resolveProjectRoot } = require("./project-root.cjs");

const PROJECT_ROOT = resolveProjectRoot({ cwd: process.cwd(), scriptPath: __filename, env: process.env }).rootDir;
const LOCAL_CONFIG_PATH = path.join(PROJECT_ROOT, ".claude", ".ck.json");
const LOCAL_OVERRIDE_PATH = path.join(PROJECT_ROOT, ".claude", ".ck.local.json");
const GLOBAL_CONFIG_PATH = path.join(os.homedir(), ".claude", ".ck.json");

// Legacy export for backward compatibility
const CONFIG_PATH = LOCAL_CONFIG_PATH;

const DEFAULT_CONFIG = {
  // Candidate concise delivery is implemented; promotion awaits the release evidence gate.
  contextDelivery: { profile: "compatible" },
  plan: {
    namingFormat: "{date}-{issue}-{slug}",
    dateFormat: "YYMMDD-HHmm",
    issuePrefix: null,
    reportsDir: "reports",
    resolution: {
      order: ["session", "branch"],
      branchPattern: "(?:feat|fix|chore|refactor|docs)/(?:[^/]+/)?(.+)",
    },
    validation: {
      mode: "auto", // 'auto' | 'prompt' | 'off': whether a standalone plan creation starts the validation interview
      minQuestions: 3,
      maxQuestions: 8,
      focusAreas: ["assumptions", "risks", "tradeoffs", "architecture"],
    },
  },
  paths: {
    docs: "docs",
    plans: "plans",
  },
  locale: {
    thinkingLanguage: null,
    responseLanguage: null,
  },
  trust: {
    passphrase: null,
    enabled: false,
  },
  project: {
    type: "auto",
    packageManager: "auto",
    framework: "auto",
  },
  // Reference docs staleness enforcement (configurable threshold)
  referenceDocs: {
    staleDays: 60,
  },
  // Generic portability boundary: reusable skills stay generic, project rules
  // are discovered from these configured local docs.
  portability: {
    enabled: true,
    rule:
      "Reusable skills and protocol text stay project-neutral; project-specific conventions are discovered from project docs.",
    projectConfigPath: "docs/project-config.json",
    docsIndexPath: "docs/project-reference/docs-index-reference.md",
  },
  assertions: [],
};

// Canonical default portability paths — single source of truth.
// Consumers (project-config-loader) reference this instead of
// re-hardcoding the literals, so a default change is one edit.
// Safe to use in catch/fallback paths: it is a require-time constant, not a runtime call
// that can throw — referencing it never re-triggers the loadConfig() failure those paths guard.
const DEFAULT_PORTABILITY = DEFAULT_CONFIG.portability;

/**
 * Deep merge objects (source values override target, nested objects merged recursively)
 * Arrays are replaced entirely (not concatenated) to avoid duplicate entries
 * @param {Object} target - Base object
 * @param {Object} source - Object to merge (takes precedence)
 * @returns {Object} Merged object
 */
function deepMerge(target, source) {
  if (!source || typeof source !== "object") return target;
  if (!target || typeof target !== "object") return source;

  const result = { ...target };
  for (const key of Object.keys(source)) {
    const sourceVal = source[key];
    const targetVal = target[key];

    // Arrays: replace entirely (don't concatenate)
    if (Array.isArray(sourceVal)) {
      result[key] = [...sourceVal];
    }
    // Objects: recurse (but not null)
    else if (
      sourceVal !== null &&
      typeof sourceVal === "object" &&
      !Array.isArray(sourceVal)
    ) {
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
 * Read one settings layer.
 * @param {string} configPath - Path to config file
 * @returns {{config: Object|null, unreadable: boolean}} `config` is the parsed file, or null when it
 *   is absent or cannot be read as JSON. `unreadable` is true when the file exists yet does not hold a
 *   JSON object (a byte-order mark, a comment, a trailing comma, another encoding, a non-object root).
 */
function readLayer(configPath) {
  try {
    if (!fs.existsSync(configPath)) return { config: null, unreadable: false };
    const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    const isObject = config !== null && typeof config === "object" && !Array.isArray(config);
    return { config, unreadable: !isObject };
  } catch (e) {
    return { config: null, unreadable: true };
  }
}

/**
 * Load config from a specific file path
 * @param {string} configPath - Path to config file
 * @returns {Object|null} Parsed config or null if not found/invalid
 */
function loadConfigFromPath(configPath) {
  return readLayer(configPath).config;
}

// The file each settings layer is read from, as the diagnostic names it (never a full path).
const LAYER_FILES = {
  personal: "~/.claude/.ck.json",
  project: ".claude/.ck.json",
  checkout: ".claude/.ck.local.json",
};

/**
 * The delivery profile from the settings layers, lowest precedence first.
 *
 * A malformed higher-precedence declaration must never opt into reduced guidance: a layer whose
 * `contextDelivery` is invalid, or whose file exists but is unreadable (it may hold a rollback this
 * loader cannot see), resolves `compatible` unless a later layer declares a valid profile. The
 * diagnostic names the layer and its file, never their content. This decision alone treats an
 * unreadable file as a declaration; every other setting keeps ignoring it.
 *
 * @param {Array<{source: string, config: Object|null, unreadable: boolean}>} layers
 * @returns {{profile: string, source: string}}
 */
function resolveContextDelivery(layers) {
  let resolved = { ...DEFAULT_CONFIG.contextDelivery, source: "default" };
  let fault = null;
  for (const { source, config, unreadable } of layers) {
    const declares = !unreadable && config && Object.prototype.hasOwnProperty.call(config, "contextDelivery");
    if (!unreadable && !declares) continue;
    const declared = declares ? config.contextDelivery : null;
    const valid = declares && declared && typeof declared === "object" && !Array.isArray(declared)
      && Object.keys(declared).every(key => key === "profile")
      && (declared.profile === undefined || ["compatible", "concise"].includes(declared.profile));
    if (!valid) {
      resolved = { profile: "compatible", source: "invalid" };
      fault = `${source} layer (${LAYER_FILES[source]}) ${unreadable ? "holds no readable JSON object" : "declares an unsupported contextDelivery"}`;
    } else if (declared.profile !== undefined) {
      resolved = { profile: declared.profile, source };
    }
  }
  if (resolved.source === "invalid") console.error(`[ck-config] CONTEXT_PROFILE_INVALID: ${fault}; using compatible guidance`);
  return resolved;
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
      ...result.plan.resolution,
    };
    // Merge validation defaults
    result.plan.validation = {
      ...DEFAULT_CONFIG.plan.validation,
      ...result.plan.validation,
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

  if (result.portability) {
    result.portability = { ...result.portability };
    const defaults = DEFAULT_CONFIG.portability;
    if (typeof result.portability.enabled !== "boolean") {
      result.portability.enabled = defaults.enabled;
    }
    if (
      typeof result.portability.rule !== "string" ||
      !result.portability.rule.trim()
    ) {
      result.portability.rule = defaults.rule;
    }
    if (!sanitizePath(result.portability.projectConfigPath, projectRoot)) {
      result.portability.projectConfigPath = defaults.projectConfigPath;
    }
    if (!sanitizePath(result.portability.docsIndexPath, projectRoot)) {
      result.portability.docsIndexPath = defaults.docsIndexPath;
    }
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
function getDefaultConfig(
  includeProject = true,
  includeAssertions = true,
  includeLocale = true,
) {
  const result = {
    plan: { ...DEFAULT_CONFIG.plan },
    paths: { ...DEFAULT_CONFIG.paths },
    workflow: { ...DEFAULT_CONFIG.workflow },
    referenceDocs: { ...DEFAULT_CONFIG.referenceDocs },
    portability: { ...DEFAULT_CONFIG.portability },
    contextDelivery: { ...DEFAULT_CONFIG.contextDelivery, source: "default" },
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
  const {
    includeProject = true,
    includeAssertions = true,
    includeLocale = true,
  } = options;
  const projectRoot = options.projectRoot ? fs.realpathSync(options.projectRoot) : PROJECT_ROOT;

  // Load configs from all locations
  const layers = [
    { source: "personal", ...readLayer(options.homeDir ? path.join(options.homeDir, ".claude", ".ck.json") : GLOBAL_CONFIG_PATH) },
    { source: "project", ...readLayer(path.join(projectRoot, ".claude", ".ck.json")) },
    { source: "checkout", ...readLayer(path.join(projectRoot, ".claude", ".ck.local.json")) },
  ];
  const [globalConfig, localConfig, localOverrideConfig] = layers.map(layer => layer.config);

  // No config files found - use defaults. An unreadable file still decides the delivery profile.
  if (!globalConfig && !localConfig && !localOverrideConfig) {
    const defaults = getDefaultConfig(includeProject, includeAssertions, includeLocale);
    if (layers.some(layer => layer.unreadable)) defaults.contextDelivery = resolveContextDelivery(layers);
    return defaults;
  }

  try {
    // Deep merge: DEFAULT → global → local → local override (override wins)
    let merged = deepMerge({}, DEFAULT_CONFIG);
    if (globalConfig) merged = deepMerge(merged, globalConfig);
    if (localConfig) merged = deepMerge(merged, localConfig);
    if (localOverrideConfig) merged = deepMerge(merged, localOverrideConfig);

    // Build result with optional sections
    const result = {
      plan: merged.plan || DEFAULT_CONFIG.plan,
      paths: merged.paths || DEFAULT_CONFIG.paths,
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
    // Workflow behavior (user-configurable, always included)
    result.workflow = merged.workflow || DEFAULT_CONFIG.workflow;

    // Reference docs staleness config (always included)
    result.referenceDocs = merged.referenceDocs || DEFAULT_CONFIG.referenceDocs;

    // Generic portability config (always included)
    result.portability = merged.portability || DEFAULT_CONFIG.portability;

    result.contextDelivery = resolveContextDelivery(layers);

    // Validate merged config — emit warnings to stderr, never block
    const validation = validateCkConfig(merged);
    if (validation.errors.length > 0 || validation.warnings.length > 0) {
      for (const err of validation.errors) {
        console.error(`[ck-config] ERROR: ${err}`);
      }
      for (const warn of validation.warnings) {
        console.error(`[ck-config] WARN: ${warn}`);
      }
    }

    return sanitizeConfig(result, projectRoot);
  } catch (e) {
    return getDefaultConfig(includeProject, includeAssertions, includeLocale);
  }
}

module.exports = {
  CONFIG_PATH,
  LOCAL_CONFIG_PATH,
  LOCAL_OVERRIDE_PATH,
  GLOBAL_CONFIG_PATH,
  DEFAULT_CONFIG,
  DEFAULT_PORTABILITY,
  deepMerge,
  loadConfigFromPath,
  loadConfig,
  getDefaultConfig,
  sanitizeConfig,
};
