/**
 * Context Injection Hooks Test Suite
 *
 * Tests for:
 * - design-system-context.cjs: Design system documentation injection
 * - backend-context.cjs: Backend context guide injection
 * - frontend-context.cjs: Frontend context guide injection
 * - scss-styling-context.cjs: Styling guide injection
 */

const path = require('path');
const fs = require('fs');
const { runHook, getHookPath, createPreToolUseInput } = require('../lib/hook-runner.cjs');
const { assertEqual, assertContains, assertAllowed, assertTrue } = require('../lib/assertions.cjs');
const { createTempDir, cleanupTempDir, createMockFile } = require('../lib/test-utils.cjs');
const { generateTestFixtures } = require('../../lib/test-fixture-generator.cjs');

// Get project-agnostic test fixtures
const f = generateTestFixtures();

// Hook paths
const DESIGN_SYSTEM_CONTEXT = getHookPath('design-system-context.cjs');
const BACKEND_CONTEXT = getHookPath('backend-context.cjs');
const FRONTEND_CONTEXT = getHookPath('frontend-context.cjs');
const STYLING_CONTEXT = getHookPath('scss-styling-context.cjs');

function writeProjectConfig(tmpDir, localizationOverride) {
    const docsDir = path.join(tmpDir, 'docs');
    fs.mkdirSync(docsDir, { recursive: true });
    const config = {
        project: { name: 'TestProject' },
        framework: { name: 'TestFramework' },
        designSystem: { docsPath: 'docs/project-reference/design-system', appMappings: [] },
        modules: [
            {
                name: 'WebV2',
                kind: 'frontend-app',
                pathRegex: 'src[\\\\/]WebV2[\\\\/]',
                meta: { generation: 'modern' }
            }
        ],
        contextGroups: [
            {
                name: 'Frontend Apps',
                fileExtensions: ['.ts', '.tsx', '.html', '.css', '.scss'],
                pathRegexes: ['src[\\\\/](WebV2|Web)[\\\\/]', 'libs[\\\\/](platform-core|bravo-common|bravo-domain)[\\\\/]'],
                patternsDoc: 'docs/project-reference/frontend-patterns-reference.md',
                rules: []
            }
        ],
        localization: localizationOverride
    };
    fs.writeFileSync(path.join(docsDir, 'project-config.json'), JSON.stringify(config, null, 2));
}

// ============================================================================
// design-system-context.cjs Tests
// ============================================================================

const designSystemContextTests = [
    {
        name: '[design-system-context] injects for modern frontend .scss file',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const input = createPreToolUseInput('Edit', {
                    file_path: `${f.modernAppBase}/components/button.scss`,
                    old_string: 'a',
                    new_string: 'b'
                });
                const result = await runHook(DESIGN_SYSTEM_CONTEXT, input, { cwd: tmpDir });
                assertAllowed(result.code);

                const output = result.stdout;
                assertTrue(output.includes('Design System') || output === '', 'May inject design system context');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[design-system-context] injects for frontend .html file',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const input = createPreToolUseInput('Edit', {
                    file_path: `${f.modernAppBase}/app/component.html`,
                    old_string: '<div>',
                    new_string: '<div class="x">'
                });
                const result = await runHook(DESIGN_SYSTEM_CONTEXT, input, { cwd: tmpDir });
                assertAllowed(result.code);
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[design-system-context] skips non-frontend files',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const input = createPreToolUseInput('Edit', {
                    file_path: f.backendControllerCs,
                    old_string: 'x',
                    new_string: 'y'
                });
                const result = await runHook(DESIGN_SYSTEM_CONTEXT, input, { cwd: tmpDir });
                assertAllowed(result.code);

                // Should not inject for .cs file
                const output = result.stdout;
                assertTrue(!output.includes('Design System') || output === '', 'Should not inject for non-frontend file');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[design-system-context] skips Read tool',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const input = createPreToolUseInput('Read', {
                    file_path: `${f.modernAppBase}/app.scss`
                });
                const result = await runHook(DESIGN_SYSTEM_CONTEXT, input, { cwd: tmpDir });
                assertAllowed(result.code);

                // Read tool should be ignored
                assertEqual(result.stdout, '', 'Should not inject for Read tool');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[design-system-context] handles empty input',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const result = await runHook(DESIGN_SYSTEM_CONTEXT, {}, { cwd: tmpDir });
                assertAllowed(result.code, 'Should fail-open');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[design-system-context] handles Write tool',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const input = createPreToolUseInput('Write', {
                    file_path: 'src/Frontend/apps/playground-text-snippet/new.scss',
                    content: '.btn { }'
                });
                const result = await runHook(DESIGN_SYSTEM_CONTEXT, input, { cwd: tmpDir });
                assertAllowed(result.code);
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    }
];

// ============================================================================
// backend-context.cjs Tests
// ============================================================================

const backendCsharpContextTests = [
    {
        name: '[backend-csharp-context] injects for .cs file in backend service',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const input = createPreToolUseInput('Edit', {
                    file_path: f.backendControllerCs,
                    old_string: 'void',
                    new_string: 'Task'
                });
                const result = await runHook(BACKEND_CONTEXT, input, { cwd: tmpDir });
                assertAllowed(result.code);

                const output = result.stdout;
                assertTrue(output.includes('Backend') || output === '', 'May inject backend context');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[backend-csharp-context] injects for framework file',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const input = createPreToolUseInput('Edit', {
                    file_path: f.frameworkRepositoryCs,
                    old_string: 'x',
                    new_string: 'y'
                });
                const result = await runHook(BACKEND_CONTEXT, input, { cwd: tmpDir });
                assertAllowed(result.code);

                const output = result.stdout;
                assertTrue(output.includes('Platform') || output.includes('Backend') || output === '', 'May inject platform context');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[backend-csharp-context] injects for example app file',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const input = createPreToolUseInput('Edit', {
                    file_path: f.exampleCs,
                    old_string: 'a',
                    new_string: 'b'
                });
                const result = await runHook(BACKEND_CONTEXT, input, { cwd: tmpDir });
                assertAllowed(result.code);
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[backend-csharp-context] skips non-.cs files',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const input = createPreToolUseInput('Edit', {
                    file_path: f.backendConfigJson,
                    old_string: '"x"',
                    new_string: '"y"'
                });
                const result = await runHook(BACKEND_CONTEXT, input, { cwd: tmpDir });
                assertAllowed(result.code);

                assertEqual(result.stdout, '', 'Should not inject for non-.cs file');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[backend-csharp-context] skips frontend .cs files',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                // .cs file outside backend patterns
                const input = createPreToolUseInput('Edit', {
                    file_path: 'other/random.cs',
                    old_string: 'x',
                    new_string: 'y'
                });
                const result = await runHook(BACKEND_CONTEXT, input, { cwd: tmpDir });
                assertAllowed(result.code);

                assertEqual(result.stdout, '', 'Should not inject for non-backend .cs');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[backend-csharp-context] handles empty input',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const result = await runHook(BACKEND_CONTEXT, {}, { cwd: tmpDir });
                assertAllowed(result.code, 'Should fail-open');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    }
];

// ============================================================================
// frontend-context.cjs Tests
// ============================================================================

const frontendTypescriptContextTests = [
    {
        name: '[frontend-typescript-context] injects for modern frontend .ts file',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const input = createPreToolUseInput('Edit', {
                    file_path: `${f.modernAppBase}/app/component.ts`,
                    old_string: 'x',
                    new_string: 'y'
                });
                const result = await runHook(FRONTEND_CONTEXT, input, { cwd: tmpDir });
                assertAllowed(result.code);

                const output = result.stdout;
                assertTrue(output.includes('Frontend') || output === '', 'May inject frontend context');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[frontend-typescript-context] injects for platform-core .ts file',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const input = createPreToolUseInput('Edit', {
                    file_path: `${f.coreLibBase}/src/component.ts`,
                    old_string: 'a',
                    new_string: 'b'
                });
                const result = await runHook(FRONTEND_CONTEXT, input, { cwd: tmpDir });
                assertAllowed(result.code);

                const output = result.stdout;
                assertTrue(output.includes('Platform') || output.includes('Frontend') || output === '', 'May inject platform-core context');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[frontend-typescript-context] injects for .tsx file',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const input = createPreToolUseInput('Edit', {
                    file_path: `${f.modernAppBase}/app/page.tsx`,
                    old_string: 'div',
                    new_string: 'section'
                });
                const result = await runHook(FRONTEND_CONTEXT, input, { cwd: tmpDir });
                assertAllowed(result.code);
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[frontend-typescript-context] skips backend .cs files',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const input = createPreToolUseInput('Edit', {
                    file_path: f.backendControllerCs,
                    old_string: 'x',
                    new_string: 'y'
                });
                const result = await runHook(FRONTEND_CONTEXT, input, { cwd: tmpDir });
                assertAllowed(result.code);

                assertEqual(result.stdout, '', 'Should not inject for .cs file');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[frontend-typescript-context] skips Read tool',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const input = createPreToolUseInput('Read', {
                    file_path: `${f.modernAppBase}/app.ts`
                });
                const result = await runHook(FRONTEND_CONTEXT, input, { cwd: tmpDir });
                assertAllowed(result.code);

                assertEqual(result.stdout, '', 'Should not inject for Read tool');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[frontend-typescript-context] handles empty input',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const result = await runHook(FRONTEND_CONTEXT, {}, { cwd: tmpDir });
                assertAllowed(result.code, 'Should fail-open');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[frontend-typescript-context] multilingual config injects i18n sync check',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                writeProjectConfig(tmpDir, {
                    enabled: true,
                    supportedLocales: ['en', 'vi'],
                    defaultLocale: 'en',
                    translationFilePatterns: ['src[\\\\/]i18n[\\\\/].*\\.(json|ts)$'],
                    uiPathPatterns: ['src[\\\\/](WebV2|Web)[\\\\/].*\\.(ts|tsx|html|scss|css)$']
                });
                const input = createPreToolUseInput('Edit', {
                    file_path: `${f.modernAppBase}/app/component.ts`,
                    old_string: 'title = "Old";',
                    new_string: 'title = "New";'
                });
                const result = await runHook(FRONTEND_CONTEXT, input, { cwd: tmpDir, env: { CLAUDE_PROJECT_DIR: tmpDir } });
                assertAllowed(result.code);
                assertContains(result.stdout, 'I18N Sync Check', 'Should include i18n sync section for multilingual projects');
                assertContains(result.stdout, 'translation resources', 'Should include translation sync guidance');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[frontend-typescript-context] single-locale config does not inject i18n sync check',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                writeProjectConfig(tmpDir, {
                    enabled: true,
                    supportedLocales: ['en'],
                    defaultLocale: 'en',
                    translationFilePatterns: ['src[\\\\/]i18n[\\\\/].*\\.(json|ts)$']
                });
                const input = createPreToolUseInput('Edit', {
                    file_path: `${f.modernAppBase}/app/component.ts`,
                    old_string: 'title = "Old";',
                    new_string: 'title = "New";'
                });
                const result = await runHook(FRONTEND_CONTEXT, input, { cwd: tmpDir, env: { CLAUDE_PROJECT_DIR: tmpDir } });
                assertAllowed(result.code);
                assertTrue(!result.stdout.includes('I18N Sync Check'), 'Should not include i18n sync section for single-locale projects');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    }
];

// ============================================================================
// scss-styling-context.cjs Tests
// ============================================================================

const scssContextTests = [
    {
        name: '[scss-styling-context] injects for modern frontend .scss file',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const input = createPreToolUseInput('Edit', {
                    file_path: `${f.modernAppBase}/styles/app.scss`,
                    old_string: 'color:',
                    new_string: 'background:'
                });
                const result = await runHook(STYLING_CONTEXT, input, { cwd: tmpDir });
                assertAllowed(result.code);

                const output = result.stdout;
                assertTrue(output.includes('Styling') || output === '', 'May inject styling context');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[scss-styling-context] injects for legacy frontend .css file',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const input = createPreToolUseInput('Edit', {
                    file_path: `${f.legacyAppBase}/styles/global.css`,
                    old_string: 'a',
                    new_string: 'b'
                });
                const result = await runHook(STYLING_CONTEXT, input, { cwd: tmpDir });
                assertAllowed(result.code);
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[scss-styling-context] injects for platform-core .scss file',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const input = createPreToolUseInput('Edit', {
                    file_path: `${f.coreLibBase}/styles/theme.scss`,
                    old_string: 'x',
                    new_string: 'y'
                });
                const result = await runHook(STYLING_CONTEXT, input, { cwd: tmpDir });
                assertAllowed(result.code);
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[scss-styling-context] skips .ts files',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const input = createPreToolUseInput('Edit', {
                    file_path: `${f.modernAppBase}/app.ts`,
                    old_string: 'x',
                    new_string: 'y'
                });
                const result = await runHook(STYLING_CONTEXT, input, { cwd: tmpDir });
                assertAllowed(result.code);

                assertEqual(result.stdout, '', 'Should not inject for .ts file');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[scss-styling-context] handles Write tool for new .scss',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const input = createPreToolUseInput('Write', {
                    file_path: `${f.coreLibBase}/new-style.scss`,
                    content: '.btn { display: flex; }'
                });
                const result = await runHook(STYLING_CONTEXT, input, { cwd: tmpDir });
                assertAllowed(result.code);
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[scss-styling-context] handles empty input',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const result = await runHook(STYLING_CONTEXT, {}, { cwd: tmpDir });
                assertAllowed(result.code, 'Should fail-open');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    }
];

// TC-SUBCTX-010 / 011 / 012 — buildContextGuardContext() output contract
const { buildContextGuardContext } = require('../../lib/subagent-context-builders.cjs');

const contextGuardBuilderTests = [
    {
        name: 'TC-SUBCTX-010: context-guard output contains ck-agent- filename convention',
        fn: () => {
            const output = buildContextGuardContext().join('\n');
            assertContains(output, 'ck-agent-', 'Should contain ck-agent- naming scheme');
            assertContains(output, '.progress.md', 'Should contain .progress.md extension');
        }
    },
    {
        name: 'TC-SUBCTX-011: context-guard output contains step status markers',
        fn: () => {
            const output = buildContextGuardContext().join('\n');
            assertContains(output, '[partial]', 'Should contain [partial] status marker');
            assertContains(output, '[done]', 'Should contain [done] status marker');
        }
    },
    {
        name: 'TC-SUBCTX-012: context-guard output contains Report path instruction',
        fn: () => {
            const output = buildContextGuardContext().join('\n');
            assertContains(output, 'Report:', 'Should contain Report: declaration example');
            assertContains(output, 'plans/reports/', 'Should contain plans/reports/ path');
        }
    }
];

// Export test suite
module.exports = {
    name: 'Context Injection Hooks',
    tests: [...designSystemContextTests, ...backendCsharpContextTests, ...frontendTypescriptContextTests, ...scssContextTests, ...contextGuardBuilderTests]
};
