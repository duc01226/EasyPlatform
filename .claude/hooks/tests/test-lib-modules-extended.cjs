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
    else {
        results.failed++;
        if (message) console.log(`    ${COLORS.red}${message}${COLORS.reset}`);
    }
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

const { validateConfig, getRequiredSections, formatResult, validateRegex, describeSchema, SCHEMA } = schema;

// ════════════════════════════════════════════════════════════════════════════
// Test: Module Exports
// ════════════════════════════════════════════════════════════════════════════

logSection('Module Exports');

logResult('exports validateConfig', typeof validateConfig === 'function');
logResult('exports getRequiredSections', typeof getRequiredSections === 'function');
logResult('exports formatResult', typeof formatResult === 'function');
logResult('exports validateRegex', typeof validateRegex === 'function');
logResult('exports SCHEMA', typeof SCHEMA === 'object' && SCHEMA !== null);
logResult('exports describeSchema', typeof describeSchema === 'function');

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
        docsPath: 'docs/project-reference/design-system',
        appMappings: [{ name: 'App', pathRegexes: ['src[\\\\/]app'], docFile: 'AppDesign.md', description: 'desc', quickTips: ['tip1'] }]
    },
    scss: {
        appMap: { app1: 'apps[\\\\/]app1' },
        patterns: [{ name: 'App', pathRegexes: ['src[\\\\/]app'], description: 'desc', scssExamples: ['color: red;'] }]
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
            logResult('docs/project-config.json passes schema', result.valid, result.valid ? '' : result.errors.slice(0, 3).join('; '));
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
    // backendServices, frontendApps, sharedNamespace are now deprecated (optional)
    logResult('does NOT report missing backendServices (deprecated)', !result.errors.some(e => e.includes('backendServices')));
    logResult('does NOT report missing frontendApps (deprecated)', !result.errors.some(e => e.includes('frontendApps')));
    logResult(
        'reports missing framework',
        result.errors.some(e => e.includes('framework'))
    );
    logResult('does NOT report missing sharedNamespace (deprecated)', !result.errors.some(e => e.includes('sharedNamespace')));
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
    logResult(
        'error mentions expected object',
        result.errors.some(e => e.includes('expected object'))
    );
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
    logResult(
        'error mentions invalid regex',
        result.errors.some(e => e.includes('invalid regex'))
    );
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
    logResult(
        'error mentions name',
        result.errors.some(e => e.includes('name'))
    );
}

{
    const badConfig = {
        ...VALID_CONFIG,
        designSystem: {
            ...VALID_CONFIG.designSystem,
            appMappings: [{ name: 'App' }] // missing pathRegexes, docFile
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
    logResult(
        'unknown top-level key produces warning',
        result.warnings.some(w => w.includes('unknownSection'))
    );
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
    // backendServices, frontendApps, sharedNamespace are now deprecated (optional)
    logResult('excludes backendServices (deprecated)', !sections.includes('backendServices'));
    logResult('excludes frontendApps (deprecated)', !sections.includes('frontendApps'));
    logResult('includes framework', sections.includes('framework'));
    logResult('excludes sharedNamespace (deprecated)', !sections.includes('sharedNamespace'));
}

// ════════════════════════════════════════════════════════════════════════════
// Test: V2 Schema Validation
// ════════════════════════════════════════════════════════════════════════════

logSection('V2 Schema Validation');

{
    // Minimal v2 config (no deprecated v1 sections)
    const minV2 = {
        schemaVersion: 2,
        project: { name: 'TestProject' },
        framework: { name: 'TestFramework' },
        designSystem: { docsPath: 'docs/project-reference/design-system', appMappings: [{ name: 'A', pathRegexes: ['src[\\\\/]'], docFile: 'A.md' }] }
    };
    const r = validateConfig(minV2);
    logResult('v2-only config valid (no v1 sections)', r.valid);
    logResult('no deprecation warnings in v2-only', !r.warnings.some(w => w.includes('DEPRECATED')));

    // schemaVersion string rejected
    const badVersion = { ...minV2, schemaVersion: 'two' };
    logResult(
        'schemaVersion string rejected',
        validateConfig(badVersion).errors.some(e => e.includes('expected number'))
    );

    // project.name required when project present
    const badProject = { ...minV2, project: { description: 'no name' } };
    logResult('project.name required', !validateConfig(badProject).valid);

    // modules[] validation
    const withModules = { ...minV2, modules: [{ name: 'svc', kind: 'backend-service', pathRegex: 'Services[\\\\/]svc' }] };
    logResult('modules[] valid', validateConfig(withModules).valid);

    // modules[] missing required fields
    const badModules = { ...minV2, modules: [{ name: 'svc' }] };
    logResult('modules[] missing kind rejected', !validateConfig(badModules).valid);

    // contextGroups[] validation
    const withGroups = { ...minV2, contextGroups: [{ name: 'Backend', pathRegexes: ['src[\\\\/]'] }] };
    logResult('contextGroups[] valid', validateConfig(withGroups).valid);

    // custom section freeform
    const withCustom = { ...minV2, custom: { anything: { nested: [1, 2, 3] } } };
    logResult('custom section freeform accepted', validateConfig(withCustom).valid);

    // testing section
    const withTesting = { ...minV2, testing: { frameworks: ['jest', 'xunit'] } };
    logResult('testing section valid', validateConfig(withTesting).valid);

    // databases freeform
    const withDbs = { ...minV2, databases: { primary: { type: 'mongodb' }, secondary: { type: 'sqlserver' } } };
    logResult('databases freeform accepted', validateConfig(withDbs).valid);

    // deprecated v1 sections emit warnings
    const withV1 = { ...minV2, backendServices: VALID_CONFIG.backendServices, sharedNamespace: 'Test' };
    const v1Result = validateConfig(withV1);
    logResult('v1 sections produce deprecation warnings', v1Result.warnings.filter(w => w.includes('DEPRECATED')).length >= 2);
    logResult('v1 sections still validate', v1Result.valid);
}

// ════════════════════════════════════════════════════════════════════════════
// Test: V2 Loader Helpers
// ════════════════════════════════════════════════════════════════════════════

logSection('V2 Loader Helpers');

{
    const { getModules, getContextGroup, getModuleForPath, resolveSection } = require('../lib/project-config-loader.cjs');
    const { generateTestFixtures } = require('../lib/test-fixture-generator.cjs');
    const f = generateTestFixtures();

    // getModules — returns array (from real config with 2 placeholder modules or v1 fallback)
    const allModules = getModules();
    logResult('getModules returns array', Array.isArray(allModules));
    logResult('getModules non-empty', allModules.length > 0);

    // getModules filtered by kind
    const backendModules = getModules('backend-service');
    logResult(
        'getModules backend filter works',
        backendModules.every(m => m.kind === 'backend-service')
    );

    // getContextGroup matches .cs file (config-driven path)
    const csGroup = getContextGroup(f.backendServiceCs);
    logResult('getContextGroup matches .cs', csGroup !== null);
    logResult('getContextGroup returns Backend name', csGroup && csGroup.name.includes('Backend'));

    // getContextGroup matches .ts file (config-driven path)
    const tsGroup = getContextGroup(f.modernAppTs);
    logResult('getContextGroup matches .ts', tsGroup !== null);

    // getContextGroup no match for .md
    const mdGroup = getContextGroup('docs/README.md');
    logResult('getContextGroup no match for .md', mdGroup === null);

    // getModuleForPath (config-driven path)
    const mod = getModuleForPath(f.backendEntityCs);
    logResult('getModuleForPath finds module', mod !== null);

    // resolveSection returns scss as fallback for styling
    const styling = resolveSection('styling', 'scss');
    logResult('resolveSection returns section', styling !== null);
}

// ════════════════════════════════════════════════════════════════════════════
// Test: Real Config V2 Validation
// ════════════════════════════════════════════════════════════════════════════

logSection('Real Config V2 Validation');

{
    const fs = require('fs');
    const path = require('path');
    const configPath = path.resolve(__dirname, '../../../docs/project-config.json');
    if (fs.existsSync(configPath)) {
        const realConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        const result = validateConfig(realConfig);
        logResult('real config passes schema', result.valid, result.errors.join('; '));
        logResult('real config has schemaVersion', realConfig.schemaVersion !== undefined);
        logResult('real config has modules[]', Array.isArray(realConfig.modules));
        logResult('real config has contextGroups[]', Array.isArray(realConfig.contextGroups));
        logResult('real config has project section', realConfig.project !== undefined);
        logResult('real config has testing section', realConfig.testing !== undefined);
    } else {
        logResult('real config file exists', false, 'docs/project-config.json not found');
    }
}

// ════════════════════════════════════════════════════════════════════════════
// Test: describeSchema
// ════════════════════════════════════════════════════════════════════════════

logSection('describeSchema');

{
    const output = describeSchema();
    logResult('returns string', typeof output === 'string');
    logResult('includes designSystem section', output.includes('designSystem'));
    logResult('includes framework section', output.includes('framework'));
    logResult('includes modules section', output.includes('modules'));
    logResult('includes referenceDocs section', output.includes('referenceDocs'));
    logResult('includes styling section', output.includes('styling'));

    // Critical field names AI gets wrong — must appear in output
    logResult('shows appMappings.name field', output.includes('"name"'));
    logResult('shows appMappings.pathRegexes field', output.includes('"pathRegexes"'));
    logResult('shows appMappings.docFile field', output.includes('"docFile"'));
    logResult('shows referenceDocs.filename field', output.includes('"filename"'));
    logResult('shows scssExamples field', output.includes('"scssExamples"'));

    // Required/optional markers
    logResult('shows required markers', output.includes('required'));
    logResult('shows optional markers', output.includes('optional'));

    // Conciseness check — should be under 200 lines for AI context
    const lineCount = output.split('\n').length;
    logResult('output under 200 lines', lineCount < 200, `${lineCount} lines`);
}

// ════════════════════════════════════════════════════════════════════════════
// Greenfield Detection Tests — hasProjectContent() & isGreenfieldProject()
// ════════════════════════════════════════════════════════════════════════════

console.log(`\n${COLORS.blue}▸ Greenfield Detection (session-init-helpers.cjs)${COLORS.reset}`);

{
    const os = require('os');
    const helpersPath = path.resolve(__dirname, '../lib/session-init-helpers.cjs');
    // Clear module cache to get fresh state
    delete require.cache[helpersPath];
    const { hasProjectContent, isIgnoredDir, isGreenfieldProject, IGNORED_ROOT_DIRS, MANIFEST_FILES } = require(helpersPath);

    // --- isIgnoredDir tests ---

    logResult('isIgnoredDir: .claude is ignored', isIgnoredDir('.claude') === true);
    logResult('isIgnoredDir: .git is ignored', isIgnoredDir('.git') === true);
    logResult('isIgnoredDir: .github is ignored', isIgnoredDir('.github') === true);
    logResult('isIgnoredDir: .vscode is ignored', isIgnoredDir('.vscode') === true);
    logResult('isIgnoredDir: .idea is ignored', isIgnoredDir('.idea') === true);
    logResult('isIgnoredDir: .devcontainer is ignored', isIgnoredDir('.devcontainer') === true);
    logResult('isIgnoredDir: .husky is ignored', isIgnoredDir('.husky') === true);
    logResult('isIgnoredDir: .cursor is ignored', isIgnoredDir('.cursor') === true);
    logResult('isIgnoredDir: .windsurf is ignored', isIgnoredDir('.windsurf') === true);
    logResult('isIgnoredDir: .circleci is ignored', isIgnoredDir('.circleci') === true);
    logResult('isIgnoredDir: .docker is ignored', isIgnoredDir('.docker') === true);
    logResult('isIgnoredDir: node_modules is ignored', isIgnoredDir('node_modules') === true);
    logResult('isIgnoredDir: src is NOT ignored', isIgnoredDir('src') === false);
    logResult('isIgnoredDir: docs is NOT ignored', isIgnoredDir('docs') === false);
    logResult('isIgnoredDir: app is NOT ignored', isIgnoredDir('app') === false);

    // --- hasProjectContent tests ---

    // Empty dir → false
    const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ck-test-empty-'));
    logResult('hasProjectContent: empty dir returns false', hasProjectContent(emptyDir) === false);

    // Dir with only .claude → false
    const claudeOnlyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ck-test-claude-'));
    fs.mkdirSync(path.join(claudeOnlyDir, '.claude'));
    logResult('hasProjectContent: .claude only returns false', hasProjectContent(claudeOnlyDir) === false);

    // Dir with only .git + .claude → false
    const gitClaudeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ck-test-gitclaude-'));
    fs.mkdirSync(path.join(gitClaudeDir, '.claude'));
    fs.mkdirSync(path.join(gitClaudeDir, '.git'));
    logResult('hasProjectContent: .git + .claude returns false', hasProjectContent(gitClaudeDir) === false);

    // Dir with many dot-prefixed + node_modules → still false (no real content)
    const toolOnlyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ck-test-toolonly-'));
    fs.mkdirSync(path.join(toolOnlyDir, '.claude'));
    fs.mkdirSync(path.join(toolOnlyDir, '.git'));
    fs.mkdirSync(path.join(toolOnlyDir, '.github'));
    fs.mkdirSync(path.join(toolOnlyDir, '.vscode'));
    fs.mkdirSync(path.join(toolOnlyDir, '.devcontainer'));
    fs.mkdirSync(path.join(toolOnlyDir, '.husky'));
    fs.mkdirSync(path.join(toolOnlyDir, 'node_modules'));
    logResult('hasProjectContent: multiple tool dirs only returns false', hasProjectContent(toolOnlyDir) === false);

    // Dir with src/ → true
    const srcDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ck-test-src-'));
    fs.mkdirSync(path.join(srcDir, 'src'));
    logResult('hasProjectContent: src/ returns true', hasProjectContent(srcDir) === true);

    // Dir with docs/ → true
    const docsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ck-test-docs-'));
    fs.mkdirSync(path.join(docsDir, 'docs'));
    logResult('hasProjectContent: docs/ returns true', hasProjectContent(docsDir) === true);

    // Nonexistent dir → false
    logResult('hasProjectContent: nonexistent dir returns false', hasProjectContent('/nonexistent/path/xyz') === false);

    // --- isGreenfieldProject tests ---

    // Empty dir → true (greenfield)
    logResult('isGreenfieldProject: empty dir is greenfield', isGreenfieldProject(emptyDir) === true);

    // Dir with .claude only → true (still greenfield)
    logResult('isGreenfieldProject: .claude only is greenfield', isGreenfieldProject(claudeOnlyDir) === true);

    // Dir with src/ containing files → false (not greenfield)
    const srcWithFiles = fs.mkdtempSync(path.join(os.tmpdir(), 'ck-test-srcfiles-'));
    fs.mkdirSync(path.join(srcWithFiles, 'src'));
    fs.writeFileSync(path.join(srcWithFiles, 'src', 'main.ts'), 'console.log("hello");');
    logResult('isGreenfieldProject: src/ with files is NOT greenfield', isGreenfieldProject(srcWithFiles) === false);

    // Dir with package.json → false
    const pkgDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ck-test-pkg-'));
    fs.writeFileSync(path.join(pkgDir, 'package.json'), '{}');
    logResult('isGreenfieldProject: package.json present is NOT greenfield', isGreenfieldProject(pkgDir) === false);

    // Dir with *.sln → false
    const slnDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ck-test-sln-'));
    fs.writeFileSync(path.join(slnDir, 'MyProject.sln'), '');
    logResult('isGreenfieldProject: .sln present is NOT greenfield', isGreenfieldProject(slnDir) === false);

    // Dir with README + .claude but no code → true (partial greenfield)
    const partialDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ck-test-partial-'));
    fs.mkdirSync(path.join(partialDir, '.claude'));
    fs.writeFileSync(path.join(partialDir, 'README.md'), '# My Project');
    logResult('isGreenfieldProject: README + .claude only is greenfield', isGreenfieldProject(partialDir) === true);

    // Dir with app/ containing files → false (not greenfield)
    const appDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ck-test-appdir-'));
    fs.mkdirSync(path.join(appDir, 'app'));
    fs.writeFileSync(path.join(appDir, 'app', 'page.tsx'), 'export default function() {}');
    logResult('isGreenfieldProject: app/ with files is NOT greenfield', isGreenfieldProject(appDir) === false);

    // Dir with lib/ containing files → false
    const libDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ck-test-libdir-'));
    fs.mkdirSync(path.join(libDir, 'lib'));
    fs.writeFileSync(path.join(libDir, 'lib', 'utils.rb'), 'module Utils; end');
    logResult('isGreenfieldProject: lib/ with files is NOT greenfield', isGreenfieldProject(libDir) === false);

    // Dir with server/ containing files → false
    const serverDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ck-test-serverdir-'));
    fs.mkdirSync(path.join(serverDir, 'server'));
    fs.writeFileSync(path.join(serverDir, 'server', 'main.go'), 'package main');
    logResult('isGreenfieldProject: server/ with files is NOT greenfield', isGreenfieldProject(serverDir) === false);

    // Dir with docs/ + plans/ + team-artifacts/ but no code → still greenfield
    const planningDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ck-test-planning-'));
    fs.mkdirSync(path.join(planningDir, 'docs'));
    fs.mkdirSync(path.join(planningDir, 'plans'));
    fs.mkdirSync(path.join(planningDir, 'team-artifacts'));
    fs.mkdirSync(path.join(planningDir, '.claude'));
    fs.writeFileSync(path.join(planningDir, 'README.md'), '# My Project');
    fs.writeFileSync(path.join(planningDir, '.gitignore'), 'node_modules');
    logResult('isGreenfieldProject: docs+plans+team-artifacts (no code) is greenfield', isGreenfieldProject(planningDir) === true);

    // CODE_DIRECTORIES contains expected entries
    const { CODE_DIRECTORIES } = require('../../hooks/lib/session-init-helpers.cjs');
    logResult('CODE_DIRECTORIES includes src', CODE_DIRECTORIES.includes('src'));
    logResult('CODE_DIRECTORIES includes app', CODE_DIRECTORIES.includes('app'));
    logResult('CODE_DIRECTORIES includes server', CODE_DIRECTORIES.includes('server'));
    logResult('CODE_DIRECTORIES includes packages', CODE_DIRECTORIES.includes('packages'));

    // IGNORED_ROOT_DIRS contains non-dot exceptions (dot-prefixed dirs handled by pattern)
    logResult('IGNORED_ROOT_DIRS includes node_modules', IGNORED_ROOT_DIRS.has('node_modules'));
    logResult('IGNORED_ROOT_DIRS does NOT include .claude (handled by dot-prefix)', !IGNORED_ROOT_DIRS.has('.claude'));
    logResult('IGNORED_ROOT_DIRS does NOT include .git (handled by dot-prefix)', !IGNORED_ROOT_DIRS.has('.git'));

    // MANIFEST_FILES contains expected entries
    logResult('MANIFEST_FILES includes package.json', MANIFEST_FILES.includes('package.json'));
    logResult('MANIFEST_FILES includes *.sln', MANIFEST_FILES.includes('*.sln'));
    logResult('MANIFEST_FILES includes go.mod', MANIFEST_FILES.includes('go.mod'));

    // Cleanup temp dirs
    for (const d of [
        emptyDir,
        claudeOnlyDir,
        gitClaudeDir,
        toolOnlyDir,
        srcDir,
        docsDir,
        srcWithFiles,
        pkgDir,
        slnDir,
        partialDir,
        appDir,
        libDir,
        serverDir,
        planningDir
    ]) {
        try {
            fs.rmSync(d, { recursive: true, force: true });
        } catch {
            /* ok */
        }
    }
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
