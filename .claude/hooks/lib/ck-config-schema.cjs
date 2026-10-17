#!/usr/bin/env node
/**
 * CK Config Schema Validator
 *
 * Validates .claude/.ck.json against the expected schema structure.
 * Catches typos, invalid values, and unknown keys with warnings (never blocks).
 *
 * Usage:
 *   const { validateCkConfig, CK_SCHEMA } = require('./lib/ck-config-schema.cjs');
 *   const result = validateCkConfig(config);
 *   // result = { valid: true, errors: [], warnings: [] }
 */
"use strict";

// ═══════════════════════════════════════════════════════════════════════════
// SCHEMA DEFINITION
// ═══════════════════════════════════════════════════════════════════════════

// Workflow activation tiers. Lockstep with WORKFLOW_ACTIVATION_TIERS in project-config-schema.cjs
// and ACTIVATION_TIERS in .claude/scripts/lib/workflow-routing-config.cjs (asserted by the
// workflow-skills-catalog suite); kept local so this validator loads without the larger schema.
const WORKFLOW_ACTIVATION_TIERS = ["auto", "confirm", "manual"];

// Workflow route modes. Lockstep with WORKFLOW_ROUTE_MODES in project-config-schema.cjs and ROUTE_MODES
// in .claude/scripts/lib/workflow-routing-config.cjs (asserted by the workflow-routing-switch suite).
const WORKFLOW_ROUTE_MODES = ["ask", "auto", "off"];

const CK_SCHEMA = {
  contextDelivery: {
    type: "object", required: false, closed: true,
    describe: "Instruction delivery preferences; only profile is accepted. Preferences never grant authority or waive required gates.",
    properties: { profile: { type: "string", required: false, redactValue: true, enum: ["compatible", "concise"], describe: "Select compatible or concise guidance. Shipping default is compatible pending adoption proof. Personal, tracked project, then checkout settings override earlier values; invalid declarations recover compatible with a redacted diagnostic." } },
  },
  commit: {
    type: "object",
    required: false,
    describe: "Personal commit-skill review preference; preserves tests, receipts and requested Git authority.",
    properties: {
      reviewMode: { type: "string", required: false, enum: ["lightweight", "risk-based"], describe: "Default lightweight runs commit-review --fix-loop at every commit risk tier; risk-based restores Low skip / Medium why-review / High changes-review. PR whole-branch review remains risk-based. Later wins: project config, ~/.claude/.ck.json, .claude/.ck.local.json, CK_COMMIT_REVIEW_MODE." }
    }
  },
  frameworkRuntime: {
    type: "object",
    required: false,
    describe: "Framework on, quiet (no context injection; review checks remain), or off. Use framework-mode.cjs to reconcile Claude/Codex native skills too; personal settings never change tracked projections.",
    properties: {
      mode: { type: "string", required: false, enum: ["on", "quiet", "off"], describe: "Modes on, quiet, off (default on); later wins: project config, ~/.claude/.ck.json, checkout .claude/.ck.local.json, CK_FRAMEWORK_MODE. Hooks see changes immediately; run framework-mode.cjs apply for native skill changes, then start fresh sessions." },
    },
  },
  locale: {
    type: "object",
    required: false,
    properties: {
      thinkingLanguage: { type: "string", required: false, nullable: true },
      responseLanguage: { type: "string", required: false, nullable: true },
    },
  },
  assertions: { type: "array", required: false, itemType: "string" },
  plan: { type: "object", required: false, freeform: true },
  paths: {
    type: "object",
    required: false,
    properties: {
      docs: { type: "string", required: false },
      plans: { type: "string", required: false },
    },
  },
  trust: { type: "object", required: false, freeform: true },
  project: { type: "object", required: false, freeform: true },
  codeReview: { type: "object", required: false, freeform: true },
  subagent: { type: "object", required: false, freeform: true },
  referenceDocs: {
    type: "object",
    required: false,
    properties: {
      staleDays: { type: "number", required: false, min: 1, max: 365 },
    },
  },
  // Session prompt ledger (docs/specs/ContextDelivery/README.SessionPromptLedger.md).
  // Recording is on by default; `enabled: false` (or CK_PROMPT_LEDGER=0) switches it off.
  promptLedger: {
    type: "object",
    required: false,
    properties: {
      enabled: { type: "boolean", required: false },
      maxPromptChars: { type: "number", required: false, min: 200, max: 20000 },
      maxEntries: { type: "number", required: false, min: 2, max: 1000 },
      reinjectAfterBytes: { type: "number", required: false, min: 50000, max: 1000000000 },
      reinjectAfterMinutes: { type: "number", required: false, min: 1, max: 1440 },
    },
  },
  // Advisory UserPromptSubmit routers. On by default; `enabled: false` (or the env switch
  // CK_COMMIT_SKILL_ROUTE=0 / CK_JUDGEMENT_INTEGRITY_ROUTE=0) switches one off.
  commitSkillRoute: {
    type: "object",
    required: false,
    properties: {
      enabled: { type: "boolean", required: false },
    },
  },
  judgementIntegrityRoute: {
    type: "object",
    required: false,
    properties: {
      enabled: { type: "boolean", required: false },
    },
  },
  // AI-feature router (ai-feature-route.cjs). On by default; `enabled: false` or CK_AI_FEATURE_ROUTE=0 switches it off.
  aiFeatureRoute: {
    type: "object",
    required: false,
    properties: {
      enabled: { type: "boolean", required: false },
    },
  },
  // Quality-skill reminder after tool results (quality-skill-remind.cjs). On by default;
  // `enabled: false` or CK_QUALITY_SKILL_REMINDER=0 switches it off.
  qualitySkillReminder: {
    type: "object",
    required: false,
    properties: {
      enabled: { type: "boolean", required: false },
    },
  },
  // Core engineering principles reminder (core-principles-inject.cjs). On by default;
  // `enabled: false` or CK_CORE_PRINCIPLES_INJECT=0 switches it off.
  corePrinciplesInject: {
    type: "object",
    required: false,
    properties: {
      enabled: { type: "boolean", required: false },
      // Mirrors file-conventions.cjs CLASS_REINJECT_TOKENS_RANGE (parity asserted by the core-principles-inject suite).
      // The hook accepts only integers in range; any other value falls back to its default.
      reinjectAfterTokens: { type: "number", required: false, min: 20000, max: 2000000 },
    },
  },
  portability: {
    type: "object",
    required: false,
    properties: {
      enabled: { type: "boolean", required: false },
      rule: { type: "string", required: false },
      projectConfigPath: { type: "string", required: false },
      docsIndexPath: { type: "string", required: false },
      workflowAutoDetect: { type: "boolean", required: false },
      // Per-person workflow route mode (ask | auto | off). Read from the project config (team default),
      // the personal ~/.claude/.ck.json, git-ignored .claude/.ck.local.json and env CK_WORKFLOW_ROUTE_MODE;
      // the later layer wins (owner: .claude/scripts/lib/workflow-routing-config.cjs).
      workflowRouteMode: { type: "string", required: false, enum: WORKFLOW_ROUTE_MODES },
      skillAutoTrigger: { type: "boolean", required: false, describe: "Personal framework skill auto-trigger preference (default true). False asks whether to run a suitable matched skill or skip it and execute directly; no match proceeds directly. Named requests and required calls/steps of authorized operations remain allowed, except commit, pull-request and lightweight framework-config help which keep normal triggers. User, checkout-local and CK_SKILL_AUTO_TRIGGER overrides apply at runtime; native skill permissions remain unchanged." },
      // Optional custom protocol appended to the runtime workflow-route reminder. A string is
      // inline markdown; an object carries inline `text` and/or a repo-relative `path`. The
      // tracked team value lives in the project-config file; a developer overrides it in
      // git-ignored `.claude/.ck.local.json` (local replaces team).
      workflowRouteProtocol: {
        type: "union",
        required: false,
        oneOf: [
          { type: "string" },
          {
            type: "object",
            properties: {
              text: { type: "string", required: false },
              path: { type: "string", required: false },
            },
          },
        ],
      },
      // Per-project workflow activation tiers (auto < confirm < manual). The tracked team value
      // lives in the project-config file; a developer overrides it in git-ignored
      // `.claude/.ck.local.json` (a later valid `default` / per-workflow override wins).
      workflowActivation: {
        type: "object",
        required: false,
        properties: {
          default: { type: "string", required: false, enum: WORKFLOW_ACTIVATION_TIERS },
          overrides: { type: "map", required: false, valuesEnum: WORKFLOW_ACTIVATION_TIERS },
        },
      },
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// VALIDATION ENGINE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Validate a value against a field schema.
 * @param {any} value - The value to validate
 * @param {object} fieldSchema - Schema definition for this field
 * @param {string} path - Dot-notation path for error messages
 * @param {string[]} errors - Accumulated errors
 * @param {string[]} warnings - Accumulated warnings
 */
function validateField(value, fieldSchema, path, errors, warnings) {
  // Handle null for nullable fields
  if (value === null) {
    if (fieldSchema.nullable) return;
    if (fieldSchema.required) {
      errors.push(`${path}: required field is missing`);
    } else if (fieldSchema.rejectNull) {
      errors.push(`${path}: declared value must not be null; omit the field to use its default`);
    }
    return;
  }

  // Handle undefined
  if (value === undefined) {
    if (fieldSchema.required) {
      errors.push(`${path}: required field is missing`);
    }
    return;
  }

  // Union field: valid when it satisfies ANY alternative. Used by
  // `portability.workflowRouteProtocol` (inline string | { text?, path? }).
  if (Array.isArray(fieldSchema.oneOf)) {
    const failedTypes = [];
    for (const alternative of fieldSchema.oneOf) {
      const altErrors = [];
      const altWarnings = [];
      validateField(value, alternative, path, altErrors, altWarnings);
      if (altErrors.length === 0) {
        warnings.push(...altWarnings);
        return;
      }
      failedTypes.push(alternative.type || "value");
    }
    errors.push(`${path}: expected one of ${failedTypes.join(" | ")}`);
    return;
  }

  switch (fieldSchema.type) {
    case "string":
      if (typeof value !== "string") {
        errors.push(`${path}: expected string, got ${typeof value}`);
        return;
      }
      if (fieldSchema.enum && !fieldSchema.enum.includes(value)) {
        errors.push(
          `${path}: invalid value${fieldSchema.redactValue ? "" : ` "${value}"`} — expected one of: ${fieldSchema.enum.join(", ")}`,
        );
      }
      if (fieldSchema.nonBlank && (!value.trim() || value.includes('\0'))) {
        errors.push(`${path}: expected a nonblank path without NUL characters`);
      }
      break;

    case "number":
      if (typeof value !== "number") {
        errors.push(`${path}: expected number, got ${typeof value}`);
        return;
      }
      if (fieldSchema.min !== undefined && value < fieldSchema.min) {
        errors.push(
          `${path}: value ${value} is below minimum ${fieldSchema.min}`,
        );
      }
      if (fieldSchema.max !== undefined && value > fieldSchema.max) {
        errors.push(
          `${path}: value ${value} exceeds maximum ${fieldSchema.max}`,
        );
      }
      break;

    case "boolean":
      if (typeof value !== "boolean") {
        errors.push(`${path}: expected boolean, got ${typeof value}`);
      }
      break;

    case "array":
      if (!Array.isArray(value)) {
        errors.push(`${path}: expected array, got ${typeof value}`);
        return;
      }
      if (fieldSchema.itemType) {
        value.forEach((item, i) => {
          if (typeof item !== fieldSchema.itemType) {
            errors.push(
              `${path}[${i}]: expected ${fieldSchema.itemType}, got ${typeof item}`,
            );
          }
        });
      }
      break;

    case "object":
      if (typeof value !== "object" || Array.isArray(value)) {
        errors.push(
          `${path}: expected object, got ${Array.isArray(value) ? "array" : typeof value}`,
        );
        return;
      }
      if (fieldSchema.freeform) break;
      if (fieldSchema.properties) {
        for (const [propName, propSchema] of Object.entries(
          fieldSchema.properties,
        )) {
          validateField(
            value[propName],
            propSchema,
            `${path}.${propName}`,
            errors,
            warnings,
          );
        }
        for (const key of Object.keys(value)) {
          if (!Object.prototype.hasOwnProperty.call(fieldSchema.properties, key)) {
            (fieldSchema.closed ? errors : warnings).push(`${path}.${key}: unknown property (not in schema)`);
          }
        }
      }
      break;

    // Map: an object with arbitrary keys whose every value is one of `valuesEnum`
    // (e.g. `portability.workflowActivation.overrides`: { <workflowId>: tier }).
    case "map":
      if (typeof value !== "object" || Array.isArray(value)) {
        errors.push(
          `${path}: expected object, got ${Array.isArray(value) ? "array" : typeof value}`,
        );
        return;
      }
      for (const [key, entry] of Object.entries(value)) {
        if (Array.isArray(fieldSchema.valuesEnum) && !fieldSchema.valuesEnum.includes(entry)) {
          errors.push(
            `${path}.${key}: invalid value ${JSON.stringify(entry)} — expected one of: ${fieldSchema.valuesEnum.join(", ")}`,
          );
        }
      }
      break;

    default:
      warnings.push(`${path}: unknown schema type "${fieldSchema.type}"`);
  }
}

/**
 * Validate a .ck.json config object against the schema.
 * @param {object} config - The parsed .ck.json content
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
function validateCkConfig(config) {
  const errors = [];
  const warnings = [];

  if (!config || typeof config !== "object" || Array.isArray(config)) {
    return {
      valid: false,
      errors: ["Config must be a non-null object"],
      warnings: [],
    };
  }

  // Validate each top-level section
  for (const [key, fieldSchema] of Object.entries(CK_SCHEMA)) {
    validateField(config[key], fieldSchema, key, errors, warnings);
  }

  // Check for unknown top-level keys
  const knownKeys = new Set(Object.keys(CK_SCHEMA));
  for (const key of Object.keys(config)) {
    if (!knownKeys.has(key)) {
      warnings.push(`${key}: unknown top-level key (not in schema)`);
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Format validation result as a readable string.
 * @param {{ valid: boolean, errors: string[], warnings: string[] }} result
 * @returns {string}
 */
function formatCkValidationResult(result) {
  const lines = [];
  if (result.valid) {
    lines.push(".ck.json validation: PASSED");
  } else {
    lines.push(".ck.json validation: FAILED");
    lines.push("");
    lines.push("Errors:");
    for (const err of result.errors) {
      lines.push(`  - ${err}`);
    }
  }
  if (result.warnings.length > 0) {
    lines.push("");
    lines.push("Warnings:");
    for (const warn of result.warnings) {
      lines.push(`  - ${warn}`);
    }
  }
  return lines.join("\n");
}

module.exports = { CK_SCHEMA, WORKFLOW_ACTIVATION_TIERS, WORKFLOW_ROUTE_MODES, validateCkConfig, formatCkValidationResult };

// ═══════════════════════════════════════════════════════════════════════════
// CLI ENTRY POINT
// ═══════════════════════════════════════════════════════════════════════════

if (require.main === module) {
  const fs = require("fs");
  const configPath = process.argv[2] || ".claude/.ck.json";
  try {
    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    const result = validateCkConfig(config);
    console.log(formatCkValidationResult(result));
    process.exit(result.valid ? 0 : 1);
  } catch (e) {
    console.error("Failed: " + e.message);
    process.exit(1);
  }
}
