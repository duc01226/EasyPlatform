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
    project: { name: 'TestProject' },
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
        appMappings: [
            {
                name: 'App',
                pathRegexes: ['src[\\\\/]app'],
                docFile: 'AppDesign.md',
                description: 'desc',
                quickTips: ['tip1']
            }
        ]
    },
    scss: {
        appMap: { app1: 'apps[\\\\/]app1' },
        patterns: [
            {
                name: 'App',
                pathRegexes: ['src[\\\\/]app'],
                description: 'desc',
                scssExamples: ['color: red;']
            }
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
    // backendServices, frontendApps, sharedNamespace are deprecated and framework is
    // now an optional capability section too: only the project identity is required.
    logResult('does NOT report missing backendServices (deprecated)', !result.errors.some(e => e.includes('backendServices')));
    logResult('does NOT report missing frontendApps (deprecated)', !result.errors.some(e => e.includes('frontendApps')));
    logResult(
        'reports missing project identity',
        result.errors.some(e => e.includes('project'))
    );
    logResult(
        'does NOT report missing framework (optional capability)',
        !result.errors.some(e => e.includes('framework'))
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
        backendServices: {
            ...VALID_CONFIG.backendServices,
            serviceMap: ['not', 'a', 'map']
        }
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
    const result = {
        valid: false,
        errors: ['test error'],
        warnings: ['test warning']
    };
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
    // backendServices, frontendApps, sharedNamespace are deprecated and framework is
    // optional now: only the project identity is a required section.
    logResult('excludes backendServices (deprecated)', !sections.includes('backendServices'));
    logResult('excludes frontendApps (deprecated)', !sections.includes('frontendApps'));
    logResult('includes project identity', sections.includes('project'));
    logResult('excludes framework (optional capability)', !sections.includes('framework'));
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
        designSystem: {
            docsPath: 'docs/project-reference/design-system',
            appMappings: [{ name: 'A', pathRegexes: ['src[\\\\/]'], docFile: 'A.md' }]
        }
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
    const withModules = {
        ...minV2,
        modules: [{ name: 'svc', kind: 'backend-service', pathRegex: 'Services[\\\\/]svc' }]
    };
    logResult('modules[] valid', validateConfig(withModules).valid);

    // modules[] missing required fields
    const badModules = { ...minV2, modules: [{ name: 'svc' }] };
    logResult('modules[] missing kind rejected', !validateConfig(badModules).valid);

    // contextGroups[] validation
    const withGroups = {
        ...minV2,
        contextGroups: [{ name: 'Backend', pathRegexes: ['src[\\\\/]'] }]
    };
    logResult('contextGroups[] valid', validateConfig(withGroups).valid);

    // testing section
    const withTesting = { ...minV2, testing: { frameworks: ['jest', 'xunit'] } };
    logResult('testing section valid', validateConfig(withTesting).valid);

    // localization section
    const withLocalization = {
        ...minV2,
        localization: {
            enabled: true,
            supportedLocales: ['en', 'vi'],
            defaultLocale: 'en',
            translationFilePatterns: ['src[\\\\/]i18n[\\\\/].*\\.json$'],
            uiPathPatterns: ['src[\\\\/].*\\.(ts|tsx|html)$']
        }
    };
    logResult('localization section valid', validateConfig(withLocalization).valid);

    // localization invalid types
    const badLocalization = {
        ...minV2,
        localization: {
            enabled: true,
            supportedLocales: 'en,vi'
        }
    };
    logResult('localization.supportedLocales wrong type rejected', !validateConfig(badLocalization).valid);

    // databases freeform
    const withDbs = {
        ...minV2,
        databases: {
            primary: { type: 'mongodb' },
            secondary: { type: 'sqlserver' }
        }
    };
    logResult('databases freeform accepted', validateConfig(withDbs).valid);

    // deprecated v1 sections emit warnings
    const withV1 = {
        ...minV2,
        backendServices: VALID_CONFIG.backendServices,
        sharedNamespace: 'Test'
    };
    const v1Result = validateConfig(withV1);
    logResult('v1 sections produce deprecation warnings', v1Result.warnings.filter(w => w.includes('DEPRECATED')).length >= 2);
    logResult('v1 sections still validate', v1Result.valid);
}

// ════════════════════════════════════════════════════════════════════════════
// Test: V2 Loader Helpers
// ════════════════════════════════════════════════════════════════════════════

logSection('V2 Loader Helpers');

{
    // Test V2 matching against a declared config, not fallback C#/TS paths
    // paired with an unrelated adopter's real context groups. Only config IO
    // is substituted; the actual loader/helper source runs in isolation.
    const helperConfig = {
        modules: [
            { name: 'fixture-service', kind: 'backend-service', pathRegex: '^fixture/backend/' },
            { name: 'fixture-ui', kind: 'frontend-app', pathRegex: '^fixture/frontend/' }
        ],
        contextGroups: [
            { name: 'Fixture Backend', pathRegexes: ['^fixture/backend/'], fileExtensions: ['.cs'] },
            { name: 'Fixture Frontend', pathRegexes: ['^fixture/frontend/'], fileExtensions: ['.ts'] }
        ],
        styling: {}
    };
    const loaderPath = path.resolve(__dirname, '../lib/project-config-loader.cjs');
    const loaderRequire = require('node:module').createRequire(loaderPath);
    const isolated = { exports: {} };
    require('node:vm').runInNewContext(fs.readFileSync(loaderPath, 'utf8'), {
        module: isolated, exports: isolated.exports, process, console,
        __dirname: path.dirname(loaderPath), __filename: loaderPath,
        require(id) {
            if (id === './ck-config-loader.cjs') return {
                loadConfig: () => ({ portability: { projectConfigPath: 'fixture-project-config.json' } }),
                DEFAULT_PORTABILITY: { projectConfigPath: 'fixture-project-config.json' }
            };
            if (id === 'fs') return { ...fs,
                existsSync(file, ...args) {
                    return path.basename(String(file)) === 'fixture-project-config.json'
                        ? true : fs.existsSync(file, ...args);
                },
                readFileSync(file, ...args) {
                return path.basename(String(file)) === 'fixture-project-config.json'
                    ? JSON.stringify(helperConfig) : fs.readFileSync(file, ...args);
            } };
            return loaderRequire(id);
        }
    }, { filename: loaderPath });
    const { getModules, getContextGroup, getModuleForPath, resolveSection, getLocalizationConfig, isMultilingualProject } = isolated.exports;
    const f = {
        backendServiceCs: 'fixture/backend/Application/SaveCommand.cs',
        backendEntityCs: 'fixture/backend/Domain/Entity.cs',
        modernAppTs: 'fixture/frontend/app.component.ts'
    };

    // Separate real-config validation remains above and below this unit seam.
    const allModules = getModules();
    logResult('getModules returns array', Array.isArray(allModules));
    logResult('getModules non-empty', allModules.length > 0);

    // getModules filtered by kind
    const backendModules = getModules('backend-service');
    logResult(
        'getModules backend filter works',
        backendModules.length === 1 && backendModules.every(m => m.kind === 'backend-service')
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
    logResult('getContextGroup no match for .md', mdGroup === null &&
        getContextGroup('fixture/backend/README.md') === null &&
        getContextGroup('outside/Entity.cs') === null);

    // getModuleForPath (config-driven path)
    const mod = getModuleForPath(f.backendEntityCs);
    logResult('getModuleForPath finds module', mod !== null && mod.name === 'fixture-service' &&
        getModuleForPath('outside/Entity.cs') === null);

    // resolveSection returns scss as fallback for styling
    const styling = resolveSection('styling', 'scss');
    logResult('resolveSection returns section', styling !== null);

    // localization helpers from real config
    const localization = getLocalizationConfig();
    logResult('getLocalizationConfig returns object', localization && typeof localization === 'object');
    logResult('getLocalizationConfig provides regex arrays', Array.isArray(localization.translationFilePatterns) && Array.isArray(localization.uiPathPatterns));
    logResult('isMultilingualProject returns boolean', typeof isMultilingualProject() === 'boolean');

    // localization helpers with inline config
    const localConfig = {
        localization: {
            enabled: true,
            supportedLocales: ['en', 'vi'],
            translationFilePatterns: ['src[\\\\/]i18n[\\\\/].*\\.json$'],
            uiPathPatterns: ['src[\\\\/].*\\.(ts|tsx|html)$']
        }
    };
    const localCfg = getLocalizationConfig(localConfig);
    logResult('getLocalizationConfig parses supported locales', localCfg.supportedLocales.length === 2);
    logResult('isMultilingualProject true when enabled + >1 locales', isMultilingualProject(localConfig) === true);

    const singleLocaleConfig = {
        localization: {
            enabled: true,
            supportedLocales: ['en']
        }
    };
    logResult('isMultilingualProject false for single locale', isMultilingualProject(singleLocaleConfig) === false);
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

    // Spec-system authoring guidance — the AI must learn how to populate these from
    // any project's source (derivation notes emitted as `#` comments per field).
    logResult('shows techSpecScan section', output.includes('techSpecScan'));
    logResult('shows techSpecScan.annotationPattern field', output.includes('annotationPattern'));
    logResult('shows annotationPattern 2-capture-group contract', output.includes('two capture'));
    logResult('shows specRoots section', output.includes('specRoots'));

    // TC-DOCROOT-010 — `--describe` is how the authoring AI learns a key EXISTS. A schema
    // block with no describe output is a key nobody will ever set.
    logResult('TC-DOCROOT-010: shows docsRoots section', output.includes('docsRoots'));
    for (const sub of ['projectReference', 'adr', 'templates', 'plans', 'teamArtifacts', 'productRoadmap']) {
        logResult(`TC-DOCROOT-010: shows docsRoots.${sub}`, output.includes(sub));
    }
    logResult('TC-DOCROOT-010: docsRoots describe states partial declaration is an error',
        output.includes('partially-declared docsRoots is a configuration'));

    logResult('shows _techSpecScanNote omission carrier', output.includes('_techSpecScanNote'));
    logResult('emits per-field derivation notes', output.includes('# '));

    // Conciseness check — soft bound so `--describe` stays manageable in AI context.
    // Raised from 300 → 400 for specRoots + techSpecScan and their per-field
    // derivation notes, then to 450 for the optional e2eTesting.execution profile
    // and its field-level derivation guidance, then to 475 for the per-file
    // convention-class fields on contextGroups items and the optional
    // conventionInjection section (+21 lines after trimming their notes to one line
    // each), then to 520 for the optional `docsRoots` block — 6 sub-objects x (name +
    // derivation note + required `path` + its note) plus the block's own 3-line header
    // = +29 lines, measured 462 -> 491, then to 530 for the optional
    // `portability.workflowRouteProtocol` union field (field line + its one-line note
    // + the two nested `text`/`path` shapes) — measured 518 -> 522, then to 560 for the
    // optional `uiReview` block (measured 528 -> 543) and the per-class delivery fields
    // on contextGroups items (`reinjectAfterTokens` + `evidenceDocs`/`evidenceSkills`
    // array shapes, measured 543 -> 550), then to 590 for the adoption keys
    // (`contextGroups[].on`, `portability.workflowActivation`, `hooks.codeGraph.enabled`,
    // `hooks.tokenBudget`, `commit.fixOriginTrailer`, measured 552 -> 575), then to 620
    // for the optional `pullRequest.targetBranch` section (section + field, each with its
    // one-line note, measured 589 -> 593), then to 650 for the tracker's level and type
    // label keys (eight keys replace two, measured 616 -> 622), then to 680 for the
    // optional `pullRequest.pushedBranchUpdate` field (field + its one-line note,
    // measured 647 -> 649). This remains a runaway-bloat guard, not a suppression of
    // schema output.
    const lineCount = output.split('\n').length;
    logResult('output under 680 lines', lineCount < 680, `${lineCount} lines`);
}

// ════════════════════════════════════════════════════════════════════════════
// Configurable docs/spec roots — normalizer (ck-path-utils) + docsRoots schema
// TC-DOCROOT-001..015
// ════════════════════════════════════════════════════════════════════════════

console.log(`\n${COLORS.blue}▸ Configurable docs/spec roots (TC-DOCROOT-*)${COLORS.reset}`);

{
    const os = require('os');
    const { spawnSync } = require('child_process');
    const repoRoot = path.resolve(__dirname, '..', '..', '..');
    const {
        normalizeRootPath,
        isPathWithinRoot,
        escapesRepoRoot,
        joinRoot
    } = require(path.join(__dirname, '..', 'lib', 'ck-path-utils.cjs'));

    // ── TC-DOCROOT-001 — one canonical form for every written variant ──
    logResult('TC-DOCROOT-001: backslash + trailing slash normalized',
        normalizeRootPath('Docs\\Specs\\') === 'Docs/Specs', normalizeRootPath('Docs\\Specs\\'));
    logResult('TC-DOCROOT-001: leading ./ and doubled / normalized',
        normalizeRootPath('./docs//specs/') === 'docs/specs', normalizeRootPath('./docs//specs/'));
    logResult('TC-DOCROOT-001: case is PRESERVED (folding belongs at the compare site)',
        normalizeRootPath('Docs/Specs') === 'Docs/Specs');
    for (const [label, input] of [['empty string', ''], ['null', null], ['number', 42], ['whitespace', '   ']]) {
        logResult(`TC-DOCROOT-001: ${label} -> ''`, normalizeRootPath(input) === '');
    }

    // ── TC-DOCROOT-002 — segment boundary, the defence against fail-open prefix matching ──
    logResult('TC-DOCROOT-002: file under the root matches',
        isPathWithinRoot('docs/specs/A/README.md', 'docs/specs') === true);
    logResult('TC-DOCROOT-002: sibling sharing the prefix does NOT match',
        isPathWithinRoot('docs/specifications/x.md', 'docs/specs') === false);
    logResult('TC-DOCROOT-002: the root itself matches',
        isPathWithinRoot('docs/specs', 'docs/specs') === true);

    // ── TC-DOCROOT-003 — comparison is case-insensitive on both sides ──
    logResult('TC-DOCROOT-003: uppercase candidate matches lowercase root',
        isPathWithinRoot('DOCS/SPECS/x.md', 'docs/specs') === true);
    logResult('TC-DOCROOT-003: backslash candidate matches slash root',
        isPathWithinRoot('docs\\specs\\x.md', 'docs/specs/') === true);

    // ── TC-DOCROOT-004 — repo-root escape detection ──
    for (const [label, input, expected] of [
        ['../outside', '../outside', true],
        ['docs/../specs', 'docs/../specs', true],
        ['/abs/path', '/abs/path', true],
        ['C:\\abs', 'C:\\abs', true],
        ['docs/specs', 'docs/specs', false],
        ['./docs/specs', './docs/specs', false]
    ]) {
        logResult(`TC-DOCROOT-004: escapesRepoRoot('${label}') === ${expected}`,
            escapesRepoRoot(input) === expected);
    }

    // ── TC-DOCROOT-013 — CONSTRUCTION: a slash-free and a trailing-slash root agree ──
    // This is what makes `doc-sync-classify.cjs:131`'s template safe to convert in Phase 08:
    // bare concatenation of a slash-free root yields `docs/specsAuth/`; joinRoot cannot.
    logResult("TC-DOCROOT-013: joinRoot('docs/specs','Auth','') -> 'docs/specs/Auth/'",
        joinRoot('docs/specs', 'Auth', '') === 'docs/specs/Auth/', joinRoot('docs/specs', 'Auth', ''));
    logResult("TC-DOCROOT-013: joinRoot('docs/specs/','Auth','') -> identical result",
        joinRoot('docs/specs/', 'Auth', '') === joinRoot('docs/specs', 'Auth', ''));
    logResult('TC-DOCROOT-013: no trailing slash without a final empty segment',
        joinRoot('docs/specs/', 'Auth') === 'docs/specs/Auth');
    logResult('TC-DOCROOT-013: blank interior segments are dropped',
        joinRoot('docs/specs', '', 'Auth') === 'docs/specs/Auth');

    // ── TC-DOCROOT-014 — documents a LIVE PRE-EXISTING over-match, not a new regression ──
    // `.claude/scripts/doc-impact-map.cjs:368` uses `startsWith`, so root `docs/specs` already
    // swallows `docs/specs-technical` today and silently excludes the technical tree. The
    // assertion below pins the CURRENT defective behaviour beside the correct one so Phase 08's
    // call-site fix has an oracle. Phase 08 — not this phase — applies that fix.
    const overMatchRel = 'docs/specs-technical/x.md';
    logResult('TC-DOCROOT-014: isPathWithinRoot rejects the sibling tree (correct)',
        isPathWithinRoot(overMatchRel, 'docs/specs') === false);
    logResult('TC-DOCROOT-014: legacy startsWith ACCEPTS it (the live pre-existing bug)',
        overMatchRel.toLowerCase().startsWith('docs/specs'.toLowerCase()) === true);

    // ── docsRoots schema ──
    const docsRootsAll = {
        projectReference: { path: 'docs/project-reference' },
        adr: { path: 'docs/adr' },
        templates: { path: 'docs/templates' },
        plans: { path: 'plans' },
        teamArtifacts: { path: 'team-artifacts' },
        productRoadmap: { path: 'docs/product-roadmap.md' }
    };
    const docsRootsIssues = list => list.filter(entry => entry.startsWith('docsRoots.'));

    // TC-DOCROOT-005
    {
        const r = validateConfig({ ...VALID_CONFIG, docsRoots: docsRootsAll });
        logResult('TC-DOCROOT-005: full 6-sub-object docsRoots is valid', r.valid, r.errors.join('; '));
        logResult('TC-DOCROOT-005: zero errors', r.errors.length === 0, r.errors.join('; '));
    }

    // TC-DOCROOT-006 — partial declaration is an ERROR, never a silent default.
    {
        const r = validateConfig({ ...VALID_CONFIG, docsRoots: { adr: {} } });
        logResult('TC-DOCROOT-006: declared sub-object without `path` is invalid', r.valid === false);
        logResult('TC-DOCROOT-006: error names docsRoots.adr.path',
            r.errors.some(e => e.includes('docsRoots.adr.path')), r.errors.join('; '));
    }

    // TC-DOCROOT-007 — traversal rejection (the validation plane of the two-plane contract).
    {
        const r = validateConfig({ ...VALID_CONFIG, docsRoots: { plans: { path: '../escape' } } });
        logResult('TC-DOCROOT-007: ../escape is invalid', r.valid === false);
        logResult('TC-DOCROOT-007: error is a traversal error on docsRoots.plans.path',
            r.errors.some(e => e.includes('docsRoots.plans.path') && e.includes('escapes the repository root')),
            r.errors.join('; '));
    }

    // TC-DOCROOT-008 — BACKWARD COMPATIBILITY: absent docsRoots changes nothing.
    {
        const r = validateConfig(VALID_CONFIG);
        logResult('TC-DOCROOT-008: config without docsRoots is valid', r.valid, r.errors.join('; '));
        logResult('TC-DOCROOT-008: zero errors', r.errors.length === 0);
        logResult('TC-DOCROOT-008: zero docsRoots warnings', docsRootsIssues(r.warnings).length === 0,
            docsRootsIssues(r.warnings).join('; '));
        logResult('TC-DOCROOT-008: docsRoots is not reported as an unknown key',
            !r.warnings.some(w => w.startsWith('docsRoots: unknown')));
    }

    // TC-DOCROOT-009 — a declared-but-missing directory WARNS; it does not error. A project
    // may declare a root before creating it, and erroring would break setup.
    {
        const r = validateConfig({
            ...VALID_CONFIG,
            docsRoots: { templates: { path: 'docs/no-such-templates-dir' } }
        });
        const warns = docsRootsIssues(r.warnings);
        logResult('TC-DOCROOT-009: non-existent declared path stays valid', r.valid, r.errors.join('; '));
        logResult('TC-DOCROOT-009: exactly one docsRoots warning', warns.length === 1, warns.join('; '));
        logResult('TC-DOCROOT-009: warning names the missing dir',
            warns[0] !== undefined && warns[0].includes('docs/no-such-templates-dir'), warns.join('; '));
    }

    // TC-DOCROOT-011 / TC-DOCROOT-012 — both real configs still validate with docsRoots ABSENT.
    // R14: the hooks fixture declares no specRoots either, so every new key must be OPTIONAL.
    for (const [tc, rel] of [
        ['TC-DOCROOT-011', 'docs/project-config.json'],
        ['TC-DOCROOT-012', '.claude/hooks/tests/docs/project-config.json']
    ]) {
        const abs = path.join(repoRoot, ...rel.split('/'));
        if (!fs.existsSync(abs)) {
            logResult(`${tc}: ${rel} exists`, false, 'file not found');
            continue;
        }
        const parsed = JSON.parse(fs.readFileSync(abs, 'utf-8'));
        const r = validateConfig(parsed);
        logResult(`${tc}: ${rel} still validates`, r.valid, r.errors.join('; '));
        if (parsed.docsRoots === undefined) {
            logResult(`${tc}: ${rel} declares no docsRoots (absence stays valid)`, true);
        } else {
            // This repo's own config now DECLARES docsRoots; the hooks fixture below is
            // the backward-compat control for absence. A declared block must be complete.
            logResult(`${tc}: ${rel} declares a complete docsRoots block`,
                Object.values(parsed.docsRoots).every(v => v && typeof v.path === 'string' && v.path.trim().length > 0));
        }
    }

    // TC-DOCROOT-015 — the two planes, side by side, on ONE escaping config.
    // Validation plane: `--validate` exits NON-ZERO on a declared-but-escaping root.
    // Runtime plane: `getDocsRoot('plans', config)` returns the documented default `plans`
    // rather than throwing. Phase 02 landed the accessor, so the runtime half now asserts the
    // real behaviour instead of the Phase 01 precondition.
    {
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ck-docroot-'));
        const badConfigPath = path.join(tmpDir, 'project-config.json');
        fs.writeFileSync(badConfigPath, JSON.stringify({ ...VALID_CONFIG, docsRoots: { plans: { path: '../escape' } } }), 'utf-8');
        const cli = spawnSync(process.execPath, [
            path.join(repoRoot, '.claude', 'hooks', 'lib', 'project-config-schema.cjs'),
            '--validate',
            badConfigPath
        ], { cwd: repoRoot, encoding: 'utf-8', windowsHide: true });
        logResult('TC-DOCROOT-015: --validate exits NON-ZERO on an escaping docsRoots path',
            cli.status !== 0, `exit ${cli.status}`);
        logResult('TC-DOCROOT-015: CLI output names the offending key',
            String(cli.stdout).includes('docsRoots.plans.path'), String(cli.stdout).trim().slice(0, 200));

        const loader = require(path.join(__dirname, '..', 'lib', 'project-config-loader.cjs'));
        const escapingConfig = { ...VALID_CONFIG, docsRoots: { plans: { path: '../escape' } } };
        let runtimeThrew = false;
        let runtimeValue;
        try {
            runtimeValue = loader.getDocsRoot('plans', escapingConfig);
        } catch {
            runtimeThrew = true;
        }
        logResult('TC-DOCROOT-015: getDocsRoot accessor exists (Phase 02 landed)',
            typeof loader.getDocsRoot === 'function');
        logResult('TC-DOCROOT-015: runtime plane does not throw on the same escaping config (fail-soft)',
            runtimeThrew === false);
        logResult('TC-DOCROOT-015: runtime plane returns the documented default for the escaping root',
            runtimeValue === 'plans', String(runtimeValue));

        fs.rmSync(tmpDir, { recursive: true, force: true });
    }

    // ── Phase 02 — loader resolution core (TC-DOCROOT-020..027) ──────────────
    {
        const loader = require(path.join(__dirname, '..', 'lib', 'project-config-loader.cjs'));
        const {
            PORTABILITY_TOKENS,
            getSpecDocsPath,
            getTechnicalSpecDocsPath,
            getDocsRoot,
            resolvePortabilityTokens
        } = loader;

        // TC-DOCROOT-020 — absent config is byte-identical to the retired constant.
        logResult("TC-DOCROOT-020: getSpecDocsPath({}) -> 'docs/specs/'",
            getSpecDocsPath({}) === 'docs/specs/', String(getSpecDocsPath({})));
        logResult("TC-DOCROOT-020: getTechnicalSpecDocsPath({}) -> 'docs/specs-technical/'",
            getTechnicalSpecDocsPath({}) === 'docs/specs-technical/', String(getTechnicalSpecDocsPath({})));

        // TC-DOCROOT-021 — configured business root wins, trailing slash added.
        logResult("TC-DOCROOT-021: configured business root resolves with a trailing slash",
            getSpecDocsPath({ specRoots: { business: { path: 'spec-library' } } }) === 'spec-library/',
            String(getSpecDocsPath({ specRoots: { business: { path: 'spec-library' } } })));

        // TC-DOCROOT-022 — backslashes normalized, exactly ONE trailing slash.
        logResult("TC-DOCROOT-022: 'Docs\\\\Specs\\\\' -> 'Docs/Specs/'",
            getSpecDocsPath({ specRoots: { business: { path: 'Docs\\Specs\\' } } }) === 'Docs/Specs/',
            String(getSpecDocsPath({ specRoots: { business: { path: 'Docs\\Specs\\' } } })));

        // TC-DOCROOT-023 — an escaping value is REJECTED at runtime and the default used.
        for (const bad of ['../escape', '/abs/specs', 'C:/elsewhere', '   ', 42]) {
            logResult(`TC-DOCROOT-023: escaping/invalid business root ${JSON.stringify(bad)} -> default`,
                getSpecDocsPath({ specRoots: { business: { path: bad } } }) === 'docs/specs/',
                String(getSpecDocsPath({ specRoots: { business: { path: bad } } })));
        }

        // TC-DOCROOT-024 — every docsRoots key defaults per the token table; roots are SLASH-FREE.
        const docsRootDefaults = {
            projectReference: 'docs/project-reference',
            adr: 'docs/adr',
            templates: 'docs/templates',
            plans: 'plans',
            teamArtifacts: 'team-artifacts',
            productRoadmap: 'docs/product-roadmap.md'
        };
        for (const [key, expected] of Object.entries(docsRootDefaults)) {
            logResult(`TC-DOCROOT-024: getDocsRoot('${key}', {}) -> '${expected}'`,
                getDocsRoot(key, {}) === expected, String(getDocsRoot(key, {})));
        }
        logResult('TC-DOCROOT-024: unknown docsRoots key returns empty string, never throws',
            getDocsRoot('nope', {}) === '');

        // TC-DOCROOT-025 — a configured root loses its trailing slash.
        logResult("TC-DOCROOT-025: teamArtifacts 'artifacts/' -> 'artifacts' (no trailing slash)",
            getDocsRoot('teamArtifacts', { docsRoots: { teamArtifacts: { path: 'artifacts/' } } }) === 'artifacts',
            String(getDocsRoot('teamArtifacts', { docsRoots: { teamArtifacts: { path: 'artifacts/' } } })));

        // TC-DOCROOT-026 — known token resolved, unknown braces SURVIVE verbatim.
        {
            const cfg = { specRoots: { business: { path: 'spec-library' } } };
            const out = resolvePortabilityTokens('read {SPEC_ROOT}/{Bucket}/README.md', cfg);
            logResult('TC-DOCROOT-026: {SPEC_ROOT} resolves and {Bucket} survives',
                out === 'read spec-library/{Bucket}/README.md', out);
            const mixed = resolvePortabilityTokens(
                'plan {PLANS_ROOT}/{plan-id}/phase-{n}.md for {FeatureName}', cfg);
            logResult('TC-DOCROOT-026: {plan-id}/{n}/{FeatureName} placeholders survive',
                mixed === 'plan plans/{plan-id}/phase-{n}.md for {FeatureName}', mixed);
            logResult('TC-DOCROOT-026: non-string input returned unchanged',
                resolvePortabilityTokens(null, cfg) === null &&
                resolvePortabilityTokens(undefined, cfg) === undefined);
        }

        // TC-DOCROOT-027 — empty config resolves ALL 8 tokens to their documented defaults.
        {
            const tokens = Object.keys(PORTABILITY_TOKENS);
            logResult('TC-DOCROOT-027: PORTABILITY_TOKENS defines exactly 8 tokens',
                tokens.length === 8, tokens.join(','));
            const input = tokens.map((t) => `{${t}}`).join(' ');
            const out = resolvePortabilityTokens(input, {});
            const expected = tokens.map((t) => PORTABILITY_TOKENS[t].default).join(' ');
            logResult('TC-DOCROOT-027: every token resolves to its documented default', out === expected, out);
            logResult('TC-DOCROOT-027: no token brace survives in the output', !out.includes('{'), out);
            logResult('TC-DOCROOT-027: every default is slash-free (prose supplies the separator)',
                tokens.every((t) => !PORTABILITY_TOKENS[t].default.endsWith('/')));
        }
    }
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
// CK Config Schema Validation Tests — ck-config-schema.cjs
// ════════════════════════════════════════════════════════════════════════════

logSection('CK Config Schema — ck-config-schema.cjs');

{
    const ckSchemaPath = path.join(__dirname, '..', 'lib', 'ck-config-schema.cjs');
    const { validateCkConfig, formatCkValidationResult, CK_SCHEMA } = require(ckSchemaPath);

    // Module exports
    logResult('ck: exports validateCkConfig', typeof validateCkConfig === 'function');
    logResult('ck: exports formatCkValidationResult', typeof formatCkValidationResult === 'function');
    logResult('ck: exports CK_SCHEMA', typeof CK_SCHEMA === 'object' && CK_SCHEMA !== null);

    // Empty config → valid
    {
        const r = validateCkConfig({});
        logResult('ck: empty config is valid', r.valid && r.errors.length === 0);
    }

    // Valid full config
    {
        const r = validateCkConfig({
            locale: { thinkingLanguage: 'en', responseLanguage: 'vi' },
            assertions: ['Use TypeScript strict mode'],
            plan: { namingFormat: '{date}-{slug}' },
            paths: { docs: 'docs', plans: 'plans' },
            referenceDocs: { staleDays: 60 },
            trust: { enabled: true },
            project: { type: 'monorepo' },
            codeReview: { maxFiles: 50 },
            subagent: { model: 'sonnet' }
    });
        logResult('ck: valid full config passes', r.valid && r.errors.length === 0);
    }

    // The retired universal-guides opt-out is no longer a declared key: it validates as unknown.
    {
        const r = validateCkConfig({ portability: { requireUniversalGuides: false } });
        logResult(
            'ck: portability.requireUniversalGuides is no longer a declared key',
            r.warnings.some(w => w.includes('portability.requireUniversalGuides') && w.includes('unknown'))
        );
    }

    // Removed workflow config → warning (not error)
    {
        const r = validateCkConfig({ workflow: { confirmationMode: 'yes' } });
        logResult('ck: removed workflow config produces warning', r.valid && r.warnings.some(w => w.includes('workflow') && w.includes('unknown')));
    }

    // Out-of-range number (too high)
    {
        const r = validateCkConfig({ referenceDocs: { staleDays: 366 } });
        logResult('ck: numeric field too high rejected', !r.valid && r.errors.some(e => e.includes('exceeds maximum')));
    }

    // Out-of-range number (too low)
    {
        const r = validateCkConfig({ referenceDocs: { staleDays: 0 } });
        logResult('ck: numeric field too low rejected', !r.valid && r.errors.some(e => e.includes('below minimum')));
    }

    // Wrong type for number field
    {
        const r = validateCkConfig({ referenceDocs: { staleDays: 'high' } });
        logResult('ck: wrong type for numeric field rejected', !r.valid && r.errors.some(e => e.includes('expected number')));
    }

    // Unknown top-level key → warning (not error)
    {
        const r = validateCkConfig({ typo: true });
        logResult('ck: unknown key produces warning', r.valid && r.warnings.some(w => w.includes('typo') && w.includes('unknown')));
    }

    // Removed workflow config with nested keys → top-level warning
    {
        const r = validateCkConfig({ workflow: { typo: true } });
        logResult('ck: removed workflow object produces warning', r.valid && r.warnings.some(w => w.includes('workflow') && w.includes('unknown')));
    }

    // Nullable fields accepted
    {
        const r = validateCkConfig({
            locale: { thinkingLanguage: null, responseLanguage: null }
        });
        logResult('ck: nullable fields accepted', r.valid && r.errors.length === 0);
    }

    // Boolean field wrong type
    {
        const r = validateCkConfig({ promptLedger: { enabled: 'yes' } });
        logResult('ck: wrong type for boolean rejected', !r.valid && r.errors.some(e => e.includes('expected boolean')));
    }

    // Array with wrong item type
    {
        const r = validateCkConfig({ assertions: [123, true] });
        logResult('ck: array wrong item type rejected', !r.valid && r.errors.some(e => e.includes('expected string')));
    }

    // Null config
    {
        const r = validateCkConfig(null);
        logResult('ck: null config rejected', !r.valid);
    }

    // Array instead of object
    {
        const r = validateCkConfig([]);
        logResult('ck: array config rejected', !r.valid);
    }

    // Freeform objects accept anything
    {
        const r = validateCkConfig({ plan: { nested: { deep: { value: 42 } } } });
        logResult('ck: freeform object accepts nested data', r.valid);
    }

    // Boundary values for referenceDocs.staleDays
    {
        const rMin = validateCkConfig({ referenceDocs: { staleDays: 1 } });
        const rMax = validateCkConfig({ referenceDocs: { staleDays: 365 } });
        logResult('ck: referenceDocs.staleDays minimum accepted', rMin.valid);
        logResult('ck: referenceDocs.staleDays maximum accepted', rMax.valid);
    }

    // formatCkValidationResult output
    {
        const passed = formatCkValidationResult({
            valid: true,
            errors: [],
            warnings: []
        });
        logResult('ck: format shows PASSED', passed.includes('PASSED'));

        const failed = formatCkValidationResult({
            valid: false,
            errors: ['referenceDocs.staleDays: expected number'],
            warnings: ['typo: unknown top-level key']
        });
        logResult('ck: format shows FAILED', failed.includes('FAILED'));
        logResult('ck: format includes errors', failed.includes('referenceDocs.staleDays'));
        logResult('ck: format includes warnings', failed.includes('typo'));
    }

    // Real .ck.json validation
    {
        const ckPath = path.resolve(__dirname, '../../../.claude/.ck.json');
        if (fs.existsSync(ckPath)) {
            const ckConfig = JSON.parse(fs.readFileSync(ckPath, 'utf-8'));
            const r = validateCkConfig(ckConfig);
            logResult('ck: real .ck.json passes schema', r.valid, r.errors.join('; '));
        } else {
            logResult('ck: real .ck.json exists', false, '.claude/.ck.json not found');
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
