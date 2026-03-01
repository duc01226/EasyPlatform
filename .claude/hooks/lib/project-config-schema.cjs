#!/usr/bin/env node
/**
 * Project Config Schema Validator
 *
 * Validates docs/project-config.json against the expected schema structure.
 * Prevents AI from accidentally changing the schema (adding/removing/renaming sections).
 *
 * Usage:
 *   const { validateConfig, SCHEMA } = require('./lib/project-config-schema.cjs');
 *   const result = validateConfig(config);
 *   // result = { valid: true, errors: [], warnings: [] }
 */
'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// SCHEMA DEFINITION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Schema definition using a simple type system.
 * Types: 'string', 'array', 'object', 'map', 'arrayOf'
 * 'map' = object with string keys and regex-string values (e.g., serviceMap)
 * 'arrayOf' = array of objects matching a sub-schema
 */
const SCHEMA = {
  _description: { type: 'string', required: false },
  backendServices: {
    type: 'object',
    required: true,
    properties: {
      patterns: {
        type: 'arrayOf',
        required: true,
        itemSchema: {
          name: { type: 'string', required: true },
          pathRegex: { type: 'string', required: true, isRegex: true },
          description: { type: 'string', required: false }
        }
      },
      serviceMap: { type: 'map', required: true, valuesAreRegex: true },
      serviceRepositories: { type: 'map', required: true },
      serviceDomains: { type: 'map', required: true }
    }
  },
  frontendApps: {
    type: 'object',
    required: true,
    properties: {
      patterns: {
        type: 'arrayOf',
        required: true,
        itemSchema: {
          name: { type: 'string', required: true },
          pathRegex: { type: 'string', required: true, isRegex: true },
          description: { type: 'string', required: false }
        }
      },
      appMap: { type: 'map', required: true, valuesAreRegex: true },
      legacyApps: { type: 'array', required: true },
      modernApps: { type: 'array', required: true },
      frontendRegex: { type: 'string', required: true, isRegex: true },
      sharedLibRegex: { type: 'string', required: true, isRegex: true }
    }
  },
  designSystem: {
    type: 'object',
    required: true,
    properties: {
      docsPath: { type: 'string', required: true },
      modernUiNote: { type: 'string', required: false },
      appMappings: {
        type: 'arrayOf',
        required: true,
        itemSchema: {
          name: { type: 'string', required: true },
          pathRegexes: { type: 'array', required: true, itemsAreRegex: true },
          docFile: { type: 'string', required: true },
          description: { type: 'string', required: false },
          quickTips: { type: 'array', required: false }
        }
      }
    }
  },
  scss: {
    type: 'object',
    required: true,
    properties: {
      appMap: { type: 'map', required: true, valuesAreRegex: true },
      patterns: {
        type: 'arrayOf',
        required: true,
        itemSchema: {
          name: { type: 'string', required: true },
          pathRegexes: { type: 'array', required: true, itemsAreRegex: true },
          description: { type: 'string', required: false },
          scssExamples: { type: 'array', required: false }
        }
      }
    }
  },
  componentFinder: {
    type: 'object',
    required: true,
    properties: {
      selectorPrefixes: { type: 'array', required: true },
      layerClassification: { type: 'map', required: true }
    }
  },
  sharedNamespace: { type: 'string', required: true },
  framework: {
    type: 'object',
    required: true,
    properties: {
      name: { type: 'string', required: true },
      backendPatternsDoc: { type: 'string', required: false },
      frontendPatternsDoc: { type: 'string', required: false },
      codeReviewDoc: { type: 'string', required: false },
      integrationTestDoc: { type: 'string', required: false },
      searchPatternKeywords: { type: 'array', required: false }
    }
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// VALIDATION ENGINE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Validate a regex string. Returns null if valid, error string if invalid.
 */
function validateRegex(value, path) {
  try {
    new RegExp(value, 'i');
    return null;
  } catch (e) {
    return `${path}: invalid regex "${value}" — ${e.message}`;
  }
}

/**
 * Validate a value against a field schema.
 * @param {any} value - The value to validate
 * @param {object} fieldSchema - Schema definition for this field
 * @param {string} path - Dot-notation path for error messages
 * @param {string[]} errors - Accumulated errors
 * @param {string[]} warnings - Accumulated warnings
 */
function validateField(value, fieldSchema, path, errors, warnings) {
  // Check required
  if (value === undefined || value === null) {
    if (fieldSchema.required) {
      errors.push(`${path}: required field is missing`);
    }
    return;
  }

  switch (fieldSchema.type) {
    case 'string':
      if (typeof value !== 'string') {
        errors.push(`${path}: expected string, got ${typeof value}`);
        return;
      }
      if (fieldSchema.isRegex) {
        const regexErr = validateRegex(value, path);
        if (regexErr) errors.push(regexErr);
      }
      break;

    case 'array':
      if (!Array.isArray(value)) {
        errors.push(`${path}: expected array, got ${typeof value}`);
        return;
      }
      if (fieldSchema.itemsAreRegex) {
        value.forEach((item, i) => {
          if (typeof item === 'string') {
            const regexErr = validateRegex(item, `${path}[${i}]`);
            if (regexErr) errors.push(regexErr);
          }
        });
      }
      break;

    case 'object':
      if (typeof value !== 'object' || Array.isArray(value)) {
        errors.push(`${path}: expected object, got ${Array.isArray(value) ? 'array' : typeof value}`);
        return;
      }
      // Validate properties
      if (fieldSchema.properties) {
        // Check for required properties
        for (const [propName, propSchema] of Object.entries(fieldSchema.properties)) {
          validateField(value[propName], propSchema, `${path}.${propName}`, errors, warnings);
        }
        // Warn about unknown top-level properties (but don't error — extensible)
        for (const key of Object.keys(value)) {
          if (!fieldSchema.properties[key]) {
            warnings.push(`${path}.${key}: unknown property (not in schema)`);
          }
        }
      }
      break;

    case 'map':
      if (typeof value !== 'object' || Array.isArray(value)) {
        errors.push(`${path}: expected map (object), got ${Array.isArray(value) ? 'array' : typeof value}`);
        return;
      }
      if (fieldSchema.valuesAreRegex) {
        for (const [key, val] of Object.entries(value)) {
          if (typeof val === 'string') {
            const regexErr = validateRegex(val, `${path}.${key}`);
            if (regexErr) errors.push(regexErr);
          }
        }
      }
      break;

    case 'arrayOf':
      if (!Array.isArray(value)) {
        errors.push(`${path}: expected array, got ${typeof value}`);
        return;
      }
      if (fieldSchema.itemSchema) {
        value.forEach((item, i) => {
          if (typeof item !== 'object' || Array.isArray(item)) {
            errors.push(`${path}[${i}]: expected object item`);
            return;
          }
          for (const [propName, propSchema] of Object.entries(fieldSchema.itemSchema)) {
            validateField(item[propName], propSchema, `${path}[${i}].${propName}`, errors, warnings);
          }
        });
      }
      break;

    default:
      warnings.push(`${path}: unknown schema type "${fieldSchema.type}"`);
  }
}

/**
 * Validate a config object against the schema.
 * @param {object} config - The parsed project-config.json
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
function validateConfig(config) {
  const errors = [];
  const warnings = [];

  if (!config || typeof config !== 'object') {
    return { valid: false, errors: ['Config must be a non-null object'], warnings: [] };
  }

  // Validate each top-level section
  for (const [key, fieldSchema] of Object.entries(SCHEMA)) {
    validateField(config[key], fieldSchema, key, errors, warnings);
  }

  // Check for unknown top-level keys
  const knownKeys = new Set(Object.keys(SCHEMA));
  for (const key of Object.keys(config)) {
    if (!knownKeys.has(key)) {
      warnings.push(`${key}: unknown top-level key (not in schema)`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Get list of required top-level sections.
 * @returns {string[]}
 */
function getRequiredSections() {
  return Object.entries(SCHEMA)
    .filter(([_, schema]) => schema.required || (schema.type === 'object' && schema.required !== false))
    .map(([key]) => key);
}

/**
 * Format validation result as a readable string.
 * @param {{ valid: boolean, errors: string[], warnings: string[] }} result
 * @returns {string}
 */
function formatResult(result) {
  const lines = [];
  if (result.valid) {
    lines.push('Schema validation: PASSED');
  } else {
    lines.push('Schema validation: FAILED');
    lines.push('');
    lines.push('Errors:');
    for (const err of result.errors) {
      lines.push(`  - ${err}`);
    }
  }
  if (result.warnings.length > 0) {
    lines.push('');
    lines.push('Warnings:');
    for (const warn of result.warnings) {
      lines.push(`  - ${warn}`);
    }
  }
  return lines.join('\n');
}

module.exports = { SCHEMA, validateConfig, getRequiredSections, formatResult, validateRegex };
