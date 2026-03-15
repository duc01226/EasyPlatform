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
 * Types: 'string', 'number', 'array', 'object', 'map', 'arrayOf'
 * 'map' = object with string keys and regex-string values (e.g., serviceMap)
 * 'arrayOf' = array of objects matching a sub-schema
 */
const SCHEMA = {
    _description: { type: 'string', required: false },
    schemaVersion: { type: 'number', required: false },
    project: {
        type: 'object',
        required: false,
        properties: {
            name: { type: 'string', required: true },
            description: { type: 'string', required: false },
            languages: { type: 'array', required: false },
            packageManagers: { type: 'array', required: false },
            monorepoTool: { type: 'string', required: false }
        }
    },
    backendServices: {
        type: 'object',
        required: false,
        deprecated: true,
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
        required: false,
        deprecated: true,
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
        required: false,
        deprecated: true,
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
        required: false,
        deprecated: true,
        properties: {
            selectorPrefixes: { type: 'array', required: true },
            layerClassification: { type: 'map', required: true }
        }
    },
    sharedNamespace: { type: 'string', required: false, deprecated: true },
    modules: {
        type: 'arrayOf',
        required: false,
        itemSchema: {
            name: { type: 'string', required: true },
            kind: { type: 'string', required: true },
            pathRegex: { type: 'string', required: true, isRegex: true },
            description: { type: 'string', required: false },
            tags: { type: 'array', required: false },
            meta: { type: 'object', required: false, freeform: true }
        }
    },
    contextGroups: {
        type: 'arrayOf',
        required: false,
        itemSchema: {
            name: { type: 'string', required: true },
            pathRegexes: { type: 'array', required: true, itemsAreRegex: true },
            fileExtensions: { type: 'array', required: false },
            guideDoc: { type: 'string', required: false },
            patternsDoc: { type: 'string', required: false },
            stylingDoc: { type: 'string', required: false },
            designSystemDoc: { type: 'string', required: false },
            rules: { type: 'array', required: false }
        }
    },
    styling: {
        type: 'object',
        required: false,
        properties: {
            technology: { type: 'string', required: false },
            fileExtensions: { type: 'array', required: false },
            guideDoc: { type: 'string', required: false },
            appMap: { type: 'map', required: false, valuesAreRegex: true },
            patterns: {
                type: 'arrayOf',
                required: false,
                itemSchema: {
                    name: { type: 'string', required: true },
                    pathRegexes: { type: 'array', required: true, itemsAreRegex: true },
                    description: { type: 'string', required: false },
                    scssExamples: { type: 'array', required: false }
                }
            }
        }
    },
    componentSystem: {
        type: 'object',
        required: false,
        properties: {
            type: { type: 'string', required: false },
            selectorPrefixes: { type: 'array', required: false },
            filePattern: { type: 'string', required: false },
            layerClassification: { type: 'map', required: false }
        }
    },
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
    },
    testing: {
        type: 'object',
        required: false,
        properties: {
            frameworks: { type: 'array', required: false },
            filePatterns: { type: 'map', required: false },
            commands: { type: 'map', required: false },
            coverageTool: { type: 'string', required: false },
            guideDoc: { type: 'string', required: false }
        }
    },
    e2eTesting: {
        type: 'object',
        required: false,
        properties: {
            framework: { type: 'string', required: false },
            language: { type: 'string', required: false },
            configFile: { type: 'string', required: false },
            platformProject: { type: 'string', required: false },
            sharedProject: { type: 'string', required: false },
            bddProject: { type: 'string', required: false },
            nonBddProject: { type: 'string', required: false },
            testsPath: { type: 'string', required: false },
            pageObjectsPath: { type: 'string', required: false },
            fixturesPath: { type: 'string', required: false },
            guideDoc: { type: 'string', required: false },
            configFiles: { type: 'array', required: false },
            testSpecsDocs: { type: 'array', required: false },
            searchPatterns: { type: 'array', required: false },
            runCommands: { type: 'map', required: false },
            tcCodeFormat: { type: 'string', required: false },
            featureAreas: { type: 'array', required: false },
            stats: { type: 'object', required: false, freeform: true },
            dependencies: { type: 'object', required: false, freeform: true },
            architecture: { type: 'object', required: false, freeform: true },
            bestPractices: { type: 'array', required: false },
            entryPoints: { type: 'array', required: false }
        }
    },
    databases: { type: 'object', required: false, freeform: true },
    messaging: {
        type: 'object',
        required: false,
        properties: {
            broker: { type: 'string', required: false },
            patterns: { type: 'array', required: false },
            consumerConvention: { type: 'string', required: false }
        }
    },
    api: {
        type: 'object',
        required: false,
        properties: {
            style: { type: 'string', required: false },
            docsFormat: { type: 'string', required: false },
            docsPath: { type: 'string', required: false },
            authPattern: { type: 'string', required: false }
        }
    },
    infrastructure: {
        type: 'object',
        required: false,
        properties: {
            containerization: { type: 'string', required: false },
            orchestration: { type: 'string', required: false },
            cicd: {
                type: 'object',
                required: false,
                properties: {
                    tool: { type: 'string', required: false },
                    configPath: { type: 'string', required: false }
                }
            }
        }
    },
    referenceDocs: {
        type: 'arrayOf',
        required: false,
        itemSchema: {
            filename: { type: 'string', required: true },
            purpose: { type: 'string', required: true },
            sections: { type: 'array', required: false }
        }
    },
    custom: { type: 'object', required: false, freeform: true }
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

    // Emit deprecation warning (field is present but deprecated)
    if (fieldSchema.deprecated) {
        warnings.push(`${path}: DEPRECATED — this field will be removed in a future version`);
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

        case 'number':
            if (typeof value !== 'number') {
                errors.push(`${path}: expected number, got ${typeof value}`);
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
            // Skip deep validation for freeform sections (e.g., custom, databases)
            if (fieldSchema.freeform) break;
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

// ═══════════════════════════════════════════════════════════════════════════
// SCHEMA DESCRIPTION (for AI consumption)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate an example item object from an arrayOf itemSchema.
 * Shows exact field names with type and required/optional markers.
 */
function generateExampleItem(itemSchema) {
    const obj = {};
    for (const [field, def] of Object.entries(itemSchema)) {
        const req = def.required ? 'required' : 'optional';
        if (def.type === 'string') {
            obj[field] = def.isRegex ? `<regex> (${req})` : `<string> (${req})`;
        } else if (def.type === 'number') {
            obj[field] = `<number> (${req})`;
        } else if (def.type === 'array') {
            obj[field] = def.itemsAreRegex ? [`<regex> (${req})`] : [`<string> (${req})`];
        } else if (def.type === 'object') {
            obj[field] = `<object> (${req})`;
        } else {
            obj[field] = `<${def.type}> (${req})`;
        }
    }
    return obj;
}

/**
 * Describe a single schema field, appending lines to the output array.
 * @param {string} name - Field name
 * @param {object} schema - Field schema definition
 * @param {number} depth - Indentation depth
 * @param {string[]} lines - Output lines array
 */
function describeField(name, schema, depth, lines) {
    const indent = '  '.repeat(depth);
    const depr = schema.deprecated ? ' [DEPRECATED]' : '';
    const req = schema.required ? 'required' : 'optional';

    if (schema.type === 'string' || schema.type === 'number') {
        const extra = schema.isRegex ? ', regex' : '';
        lines.push(`${indent}${name} (${schema.type}, ${req}${extra})${depr}`);
    } else if (schema.type === 'array') {
        const extra = schema.itemsAreRegex ? ' of regexes' : '';
        lines.push(`${indent}${name} (array${extra}, ${req})${depr}`);
    } else if (schema.type === 'map') {
        const extra = schema.valuesAreRegex ? ', values are regexes' : '';
        lines.push(`${indent}${name} (map${extra}, ${req})${depr}`);
    } else if (schema.type === 'object') {
        lines.push(`${indent}${name} (object, ${req})${depr}`);
        if (!schema.freeform && schema.properties) {
            for (const [prop, propSchema] of Object.entries(schema.properties)) {
                describeField(prop, propSchema, depth + 1, lines);
            }
        }
    } else if (schema.type === 'arrayOf') {
        lines.push(`${indent}${name} (array of objects, ${req})${depr} — each item:`);
        if (schema.itemSchema) {
            const example = generateExampleItem(schema.itemSchema);
            const json = JSON.stringify(example, null, 2);
            for (const line of json.split('\n')) {
                lines.push(`${indent}  ${line}`);
            }
        }
    }
}

/**
 * Generate human-readable schema description with example JSON shapes.
 * Use this output to ensure AI generates correct field names.
 * @returns {string} Schema documentation suitable for AI consumption
 */
function describeSchema() {
    const lines = ['# project-config.json Schema Reference', ''];
    for (const [key, fieldSchema] of Object.entries(SCHEMA)) {
        if (key === '_description') continue;
        describeField(key, fieldSchema, 0, lines);
        lines.push('');
    }
    return lines.join('\n');
}

module.exports = { SCHEMA, validateConfig, getRequiredSections, formatResult, validateRegex, describeSchema };

// ═══════════════════════════════════════════════════════════════════════════
// CLI ENTRY POINT
// ═══════════════════════════════════════════════════════════════════════════

if (require.main === module) {
    const args = process.argv.slice(2);
    if (args.includes('--describe')) {
        console.log(describeSchema());
    } else if (args.includes('--validate')) {
        const fs = require('fs');
        const idx = args.indexOf('--validate');
        const configPath = args[idx + 1] || 'docs/project-config.json';
        try {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
            const result = validateConfig(config);
            console.log(formatResult(result));
            process.exit(result.valid ? 0 : 1);
        } catch (e) {
            console.error('Failed: ' + e.message);
            process.exit(1);
        }
    } else {
        console.log('Usage: --describe | --validate [path]');
    }
}
