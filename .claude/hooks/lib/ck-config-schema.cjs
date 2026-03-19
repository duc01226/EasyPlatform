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

const CK_SCHEMA = {
  workflow: {
    type: "object",
    required: false,
    properties: {
      confirmationMode: {
        type: "string",
        required: false,
        enum: ["always", "never", "off"],
      },
    },
  },
  codingLevel: { type: "number", required: false, min: -1, max: 5 },
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
  privacyBlock: { type: "boolean", required: false },
  referenceDocs: {
    type: "object",
    required: false,
    properties: {
      staleDays: { type: "number", required: false, min: 1, max: 365 },
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

  switch (fieldSchema.type) {
    case "string":
      if (typeof value !== "string") {
        errors.push(`${path}: expected string, got ${typeof value}`);
        return;
      }
      if (fieldSchema.enum && !fieldSchema.enum.includes(value)) {
        errors.push(
          `${path}: invalid value "${value}" — expected one of: ${fieldSchema.enum.join(", ")}`,
        );
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
          if (!fieldSchema.properties[key]) {
            warnings.push(`${path}.${key}: unknown property (not in schema)`);
          }
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

module.exports = { CK_SCHEMA, validateCkConfig, formatCkValidationResult };

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
