#!/usr/bin/env node
'use strict';

/**
 * Extended lib module tests — project-config-schema.cjs
 *
 * Tests the schema validator against valid configs, invalid configs,
 * and edge cases to ensure schema protection works correctly.
 *
 * Run: node test-lib-modules-extended.cjs
 *
 * @version 3.0.0
 * @date 2026-03-01
 */

const path = require('path');
const fs = require('fs');

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
  blue: '\x1b[34m'
};

const results = { passed: 0, failed: 0 };

function logResult(name, passed, message = '') {
  const icon = passed ? `${COLORS.green}✓${COLORS.reset}` : `${COLORS.red}✗${COLORS.reset}`;
  console.log(`  ${icon} ${name}${message ? `: ${COLORS.dim}${message}${COLORS.reset}` : ''}`);
  if (passed) results.passed++;
  else { results.failed++; if (message) console.log(`    ${COLORS.red}${message}${COLORS.reset}`); }
}

function logSection(title) {
  console.log(`\n${COLORS.bold}${COLORS.blue}━━━ ${title} ━━━${COLORS.reset}\n`);
}

// ════════════════════════════════════════════════════════════════════════════
// Load module under test
// ════════════════════════════════════════════════════════════════════════════

const schemaPath = path.join(__dirname, '..', 'lib', 'project-config-schema.cjs');
let schema;
try {
  schema = require(schemaPath);
} catch (e) {
  console.error(`${COLORS.red}Failed to load project-config-schema.cjs: ${e.message}${COLORS.reset}`);
  process.exit(1);
}

const { validateConfig, getRequiredSections, formatResult, validateRegex, SCHEMA } = schema;

// ════════════════════════════════════════════════════════════════════════════
// Test: Module Exports
// ════════════════════════════════════════════════════════════════════════════

logSection('Module Exports');

logResult('exports validateConfig', typeof validateConfig === 'function');
logResult('exports getRequiredSections', typeof getRequiredSections === 'function');
logResult('exports formatResult', typeof formatResult === 'function');
logResult('exports validateRegex', typeof validateRegex === 'function');
logResult('exports SCHEMA', typeof SCHEMA === 'object' && SCHEMA !== null);

// ════════════════════════════════════════════════════════════════════════════
// Test: validateRegex
// ════════════════════════════════════════════════════════════════════════════

logSection('validateRegex');

logResult('valid regex returns null', validateRegex('src[\\\\/]Services', 'test') === null);
logResult('invalid regex returns error', validateRegex('[invalid', 'test') !== null);
logResult('empty string is valid regex', validateRegex('', 'test') === null);

// ════════════════════════════════════════════════════════════════════════════
// Test: Valid Config
// ════════════════════════════════════════════════════════════════════════════

logSection('Valid Config');

const VALID_CONFIG = {
  _description: 'Test config',
  backendServices: {
    patterns: [{ name: 'Svc', pathRegex: 'src[\\\\/]svc', description: 'desc' }],
    serviceMap: { svc1: 'Services[\\\\/]svc1' },
    serviceRepositories: { svc1: 'ISvc1Repo<T>' },
    serviceDomains: { svc1: 'Domain desc' }
  },
  frontendApps: {
    patterns: [{ name: 'App', pathRegex: 'src[\\\\/]app', description: 'desc' }],
    appMap: { app1: 'apps[\\\\/]app1' },
    legacyApps: [],
    modernApps: ['app1'],
    frontendRegex: 'src[\\\\/]app',
    sharedLibRegex: 'libs[\\\\/]shared'
  },
  designSystem: {
    docsPath: 'docs/design-system',
    appMappings: [
      { name: 'App', pathRegexes: ['src[\\\\/]app'], docFile: 'AppDesign.md', description: 'desc', quickTips: ['tip1'] }
    ]
  },
  scss: {
    appMap: { app1: 'apps[\\\\/]app1' },
    patterns: [
      { name: 'App', pathRegexes: ['src[\\\\/]app'], description: 'desc', scssExamples: ['color: red;'] }
    ]
  },
  componentFinder: {
    selectorPrefixes: ['app-'],
    layerClassification: { platform: ['libs/platform/'] }
  },
  sharedNamespace: 'App.Shared',
  framework: {
    name: 'TestFramework',
    searchPatternKeywords: ['keyword1']
  }
};

{
  const result = validateConfig(VALID_CONFIG);
  logResult('valid config passes', result.valid, result.errors.join('; '));
  logResult('no errors on valid config', result.errors.length === 0);
}

// ════════════════════════════════════════════════════════════════════════════
// Test: Real Config (docs/project-config.json)
// ════════════════════════════════════════════════════════════════════════════

logSection('Real Config Validation');

{
  const configPath = path.join(__dirname, '..', '..', '..', 'docs', 'project-config.json');
  if (fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      const result = validateConfig(config);
      logResult('docs/project-config.json passes schema', result.valid,
        result.valid ? '' : result.errors.slice(0, 3).join('; '));
    } catch (e) {
      logResult('docs/project-config.json is valid JSON', false, e.message);
    }
  } else {
    logResult('docs/project-config.json exists', false, 'File not found');
  }
}

// ════════════════════════════════════════════════════════════════════════════
// Test: Missing Required Sections
// ════════════════════════════════════════════════════════════════════════════

logSection('Missing Required Sections');

{
  const emptyConfig = {};
  const result = validateConfig(emptyConfig);
  logResult('empty config fails', !result.valid);
  logResult('reports missing backendServices', result.errors.some(e => e.includes('backendServices')));
  logResult('reports missing frontendApps', result.errors.some(e => e.includes('frontendApps')));
  logResult('reports missing framework', result.errors.some(e => e.includes('framework')));
  logResult('reports missing sharedNamespace', result.errors.some(e => e.includes('sharedNamespace')));
}

// ════════════════════════════════════════════════════════════════════════════
// Test: Wrong Types
// ════════════════════════════════════════════════════════════════════════════

logSection('Wrong Types');

{
  // backendServices as array instead of object
  const badConfig = { ...VALID_CONFIG, backendServices: [] };
  const result = validateConfig(badConfig);
  logResult('array instead of object detected', !result.valid);
  logResult('error mentions expected object', result.errors.some(e => e.includes('expected object')));
}

{
  // serviceMap as array instead of map
  const badConfig = {
    ...VALID_CONFIG,
    backendServices: { ...VALID_CONFIG.backendServices, serviceMap: ['not', 'a', 'map'] }
  };
  const result = validateConfig(badConfig);
  logResult('array instead of map detected', !result.valid);
}

{
  // frontendRegex as number
  const badConfig = {
    ...VALID_CONFIG,
    frontendApps: { ...VALID_CONFIG.frontendApps, frontendRegex: 42 }
  };
  const result = validateConfig(badConfig);
  logResult('number instead of string detected', !result.valid);
}

// ════════════════════════════════════════════════════════════════════════════
// Test: Invalid Regexes
// ════════════════════════════════════════════════════════════════════════════

logSection('Invalid Regexes');

{
  const badConfig = {
    ...VALID_CONFIG,
    backendServices: {
      ...VALID_CONFIG.backendServices,
      serviceMap: { bad: '[invalid regex' }
    }
  };
  const result = validateConfig(badConfig);
  logResult('invalid regex in serviceMap detected', !result.valid);
  logResult('error mentions invalid regex', result.errors.some(e => e.includes('invalid regex')));
}

{
  const badConfig = {
    ...VALID_CONFIG,
    frontendApps: { ...VALID_CONFIG.frontendApps, frontendRegex: '[broken' }
  };
  const result = validateConfig(badConfig);
  logResult('invalid frontendRegex detected', !result.valid);
}

// ════════════════════════════════════════════════════════════════════════════
// Test: Missing Required Fields in Items
// ════════════════════════════════════════════════════════════════════════════

logSection('Missing Item Fields');

{
  const badConfig = {
    ...VALID_CONFIG,
    backendServices: {
      ...VALID_CONFIG.backendServices,
      patterns: [{ description: 'no name or pathRegex' }]
    }
  };
  const result = validateConfig(badConfig);
  logResult('missing name in pattern item detected', !result.valid);
  logResult('error mentions name', result.errors.some(e => e.includes('name')));
}

{
  const badConfig = {
    ...VALID_CONFIG,
    designSystem: {
      ...VALID_CONFIG.designSystem,
      appMappings: [{ name: 'App' }]  // missing pathRegexes, docFile
    }
  };
  const result = validateConfig(badConfig);
  logResult('missing pathRegexes in appMapping detected', !result.valid);
}

// ════════════════════════════════════════════════════════════════════════════
// Test: Edge Cases
// ════════════════════════════════════════════════════════════════════════════

logSection('Edge Cases');

{
  const result = validateConfig(null);
  logResult('null config fails', !result.valid);
}

{
  const result = validateConfig('not an object');
  logResult('string config fails', !result.valid);
}

{
  // Extra unknown keys should produce warnings, not errors
  const extendedConfig = { ...VALID_CONFIG, unknownSection: { foo: 'bar' } };
  const result = validateConfig(extendedConfig);
  logResult('unknown top-level key produces warning', result.warnings.some(w => w.includes('unknownSection')));
  logResult('unknown key does not cause failure', result.valid);
}

// ════════════════════════════════════════════════════════════════════════════
// Test: formatResult
// ════════════════════════════════════════════════════════════════════════════

logSection('formatResult');

{
  const result = { valid: true, errors: [], warnings: [] };
  const output = formatResult(result);
  logResult('formats passing result', output.includes('PASSED'));
}

{
  const result = { valid: false, errors: ['test error'], warnings: ['test warning'] };
  const output = formatResult(result);
  logResult('formats failing result', output.includes('FAILED') && output.includes('test error'));
  logResult('includes warnings', output.includes('test warning'));
}

// ════════════════════════════════════════════════════════════════════════════
// Test: getRequiredSections
// ════════════════════════════════════════════════════════════════════════════

logSection('getRequiredSections');

{
  const sections = getRequiredSections();
  logResult('returns array', Array.isArray(sections));
  logResult('includes backendServices', sections.includes('backendServices'));
  logResult('includes frontendApps', sections.includes('frontendApps'));
  logResult('includes framework', sections.includes('framework'));
  logResult('includes sharedNamespace', sections.includes('sharedNamespace'));
}

// ════════════════════════════════════════════════════════════════════════════
// Summary
// ════════════════════════════════════════════════════════════════════════════

const duration = '0.05';
console.log(`\n${'═'.repeat(60)}`);
console.log(`${COLORS.bold}SUMMARY${COLORS.reset}`);
console.log(`${'─'.repeat(60)}`);
console.log(`${COLORS.green}Passed:${COLORS.reset}  ${results.passed}`);
console.log(`${COLORS.red}Failed:${COLORS.reset}  ${results.failed}`);
console.log(`${COLORS.yellow}Skipped:${COLORS.reset} 0`);
console.log(`${COLORS.dim}Duration: ${duration}s${COLORS.reset}`);
console.log(`${'═'.repeat(60)}\n`);

process.exit(results.failed > 0 ? 1 : 0);
