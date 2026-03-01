#!/usr/bin/env node
/**
 * Test Fixture Generator
 *
 * Generates sample file paths and module names from project-config.json
 * so test files remain project-agnostic. When .claude/ is copied to
 * another project, tests auto-adapt to that project's modules.
 *
 * Usage:
 *   const { generateTestFixtures } = require('./lib/test-fixture-generator.cjs');
 *   const f = generateTestFixtures();
 *   // f.backendServiceCs → "src/Services/{BackendService}/Application/SaveCommand.cs"
 */
'use strict';

const { loadProjectConfig } = require('./project-config-loader.cjs');

let _cache = null;

/**
 * Convert a pathRegex string to a concrete sample path segment.
 * E.g., "Services[\\/]MyService" → "Services/MyService"
 * @param {string} pathRegex
 * @returns {string}
 */
function regexToSamplePath(pathRegex) {
    if (!pathRegex) return '';
    // After JSON parse, pathRegex contains [\\/] (5 chars: [ \ \ / ]) and \. (2 chars: \ .)
    // Build separator from char codes to avoid JS string-literal escaping issues.
    const BS = String.fromCharCode(92); // backslash
    const SEP = '[' + BS + BS + '/]'; // [\\/] — regex char class matching \ or /
    const DOT = BS + '.'; // \.   — escaped literal dot
    return pathRegex.split(SEP).join('/').split(DOT).join('.').replace(/\/+/g, '/'); // collapse double slashes from trailing separators
}

/**
 * Find first module of a given kind, optionally filtered by meta.generation.
 */
function findModule(modules, kind, generation) {
    return modules.find(m => m.kind === kind && (!generation || m.meta?.generation === generation));
}

/**
 * Ensure a path starts with 'src/' if the segment implies it's under src/.
 */
function ensureSrcPrefix(segment) {
    if (!segment) return segment;
    if (segment.startsWith('src/') || segment.startsWith('src\\')) return segment;
    // Segments starting with Services, Platform, PlatformExampleApp, Web, WebV2 are under src/
    if (/^(Services|Platform|PlatformExampleApp|Web|WebV2)[/\\]/.test(segment)) {
        return 'src/' + segment;
    }
    return segment;
}

/**
 * Generate test fixtures derived from project-config.json.
 * Falls back to generic paths when config is missing or incomplete.
 * Result is cached for the process lifetime.
 *
 * @returns {object} Categorized paths and names for tests
 */
function generateTestFixtures() {
    if (_cache) return _cache;

    const config = loadProjectConfig();
    const modules = config.modules || [];

    // Find representative modules
    const backend = findModule(modules, 'backend-service');
    const frontendModern = findModule(modules, 'frontend-app', 'modern');
    const frontendLegacy = findModule(modules, 'frontend-app', 'legacy');
    const library = modules.find(m => m.kind === 'library' && m.name !== 'platform-core');
    const platformCoreLib = modules.find(m => m.kind === 'library' && m.name === 'platform-core') || modules.find(m => m.kind === 'library');
    const framework = findModule(modules, 'framework');
    const example = findModule(modules, 'example');

    // Domain library (second library if available)
    const domainLib = modules.find(m => m.kind === 'library' && m !== library && m !== platformCoreLib) || library;

    // Convert pathRegex → concrete base paths
    const backendBase = backend ? ensureSrcPrefix(regexToSamplePath(backend.pathRegex)) : 'src/Services/ExampleService';
    const modernAppBase = frontendModern ? ensureSrcPrefix(regexToSamplePath(frontendModern.pathRegex)) : 'src/Frontend/apps/example-app';
    const legacyAppBase = frontendLegacy ? ensureSrcPrefix(regexToSamplePath(frontendLegacy.pathRegex)) : 'src/Web/ExampleClient';
    const libraryBase = library ? regexToSamplePath(library.pathRegex) : 'libs/shared-ui';
    const domainLibBase = domainLib ? regexToSamplePath(domainLib.pathRegex) : 'libs/domain';
    const platformCoreBase = platformCoreLib ? regexToSamplePath(platformCoreLib.pathRegex) : 'libs/platform-core';
    const frameworkBase = framework ? ensureSrcPrefix(regexToSamplePath(framework.pathRegex)) : 'src/Platform/Framework';
    const exampleBase = example ? ensureSrcPrefix(regexToSamplePath(example.pathRegex)) : 'src/ExampleApp';

    _cache = {
        // Project identity
        projectName: config.project?.name || 'MyProject',
        projectDescription: config.project?.description || 'Project',

        // Module names
        backendServiceName: backend?.name || 'ExampleService',
        modernAppName: frontendModern?.name || 'example-app',
        legacyAppName: frontendLegacy?.name || 'ExampleClient',
        libraryName: library?.name || 'shared-ui',
        domainLibName: domainLib?.name || 'domain',
        frameworkName: config.framework?.name || 'Framework',

        // Base path segments (no file suffix)
        backendBase,
        modernAppBase,
        legacyAppBase,
        libraryBase,
        platformCoreBase,
        frameworkBase,

        // Single sample paths per category
        backendServiceCs: `${backendBase}/Application/SaveCommand.cs`,
        backendEntityCs: `${backendBase}/Domain/Entity.cs`,
        platformCs: `${frameworkBase}/Domain/Entity.cs`,
        exampleCs: `${exampleBase}/TextSnippet/SaveCommand.cs`,
        modernAppTs: `${modernAppBase}/src/app.component.ts`,
        modernAppHtml: `${modernAppBase}/src/user-list.component.html`,
        modernAppScss: `${modernAppBase}/styles/main.scss`,
        legacyAppTs: `${legacyAppBase}/user-list.component.ts`,
        libraryTs: `${libraryBase}/src/button.component.ts`,
        libraryScss: `${libraryBase}/src/button.component.scss`,
        domainLibTs: `${domainLibBase}/employee.service.ts`,
        platformCoreTs: `${platformCoreBase}/src/store.ts`,

        // Categorized path arrays (for batch testing)
        frontendPaths: [`${modernAppBase}/src/app.component.ts`, `${libraryBase}/src/button.component.ts`, `${modernAppBase}/src/pages/profile.component.ts`],
        backendPaths: [`${backendBase}/Commands/SaveCommand.cs`, `${frameworkBase}/Application/Handler.cs`],
        tsPaths: [`${libraryBase}/src/component.ts`, `${modernAppBase}/src/app.module.ts`, `${platformCoreBase}/src/store.ts`],
        scssPaths: [`${modernAppBase}/styles/main.scss`, `${libraryBase}/src/button.component.scss`, `${modernAppBase}/styles/_variables.scss`],

        // Path regex from config (for test-init-reference-docs)
        backendPathRegex: backend?.pathRegex || 'Services[\\\\/]ExampleService',

        // Integration test doc path (for .ck.json)
        integrationTestDoc: config.framework?.integrationTestDoc || config.testing?.guideDoc || null,

        // E2E test paths (from e2eTesting config or fallbacks)
        e2eBddCs: (config.e2eTesting?.bddProject || 'src/AutomationTest/BDD/').replace(/\\/g, '/') + 'StepDefinitions/LoginSteps.cs',
        e2eSharedCs: (config.e2eTesting?.sharedProject || 'src/AutomationTest/Shared/').replace(/\\/g, '/') + 'Pages/LoginPage.cs',
        e2ePlatformCs: (config.e2eTesting?.platformProject || 'src/Platform/AutomationTest/').replace(/\\/g, '/') + 'Pages/Page.cs',
        e2eFeature: (config.e2eTesting?.bddProject || 'src/AutomationTest/BDD/').replace(/\\/g, '/') + 'Features/Login.feature',
        e2eFallbackSpec: 'src/tests/e2e/login.spec.ts',
        e2eFallbackAutomation: 'src/automation/tests/smoke.cs',
        e2eGuideDoc: config.e2eTesting?.guideDoc || 'docs/project-reference/e2e-test-reference.md',

        // Sample build/grep output for swap-engine tests
        sampleServiceDll: `${backend?.name || 'Example'}.Service`,
        sampleSecondDll: framework?.name ? `${framework.name}.dll` : 'Framework.dll',

        // Additional sample paths (Phase 1 - generic fixtures)
        backendControllerCs: `${backendBase}/Api/Controller.cs`,
        frameworkRepositoryCs: `${frameworkBase}/Repository.cs`,
        backendConfigJson: `${backendBase}/appsettings.json`,
        exampleBase,

        // Config values (useful for tests verifying config-driven behavior)
        primaryDbType: config.databases?.primary?.type || 'mongodb',
        messageBroker: config.messaging?.broker || 'rabbitmq',
        selectorPrefixes: config.componentSystem?.selectorPrefixes || ['app-'],

        // Module collections
        allServiceNames: modules.filter(m => m.kind === 'backend-service').map(m => m.name)
    };

    return _cache;
}

/** Clear cache (useful in test isolation). */
function clearFixtureCache() {
    _cache = null;
}

module.exports = { generateTestFixtures, regexToSamplePath, clearFixtureCache };
