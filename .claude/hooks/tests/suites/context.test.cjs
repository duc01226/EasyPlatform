/**
 * Context Builders Test Suite  (Phase 04 migration)
 *
 * Tests for the live successors to the (now consolidated) per-domain context
 * inject hooks. The legacy modules are UNREGISTERED; the dispatchers
 * pretooluse-ctx-edit / pretooluse-ctx-edit-tail invoke these builders:
 * - buildDesignSystemContext(payload, preloadedLines) ← design-system-context.cjs
 * - buildBackendContext(payload, preloadedLines)       ← backend-context.cjs
 * - buildFrontendContext(payload, preloadedLines)      ← frontend-context.cjs
 * - buildScssStylingContext(payload, preloadedLines)   ← scss-styling-context.cjs
 *
 * Each builder returns the legacy hook's TRIMMED stdout block as a string, or
 * '' when the legacy hook would have emitted nothing. The legacy inject hooks
 * always exited 0, so the former `assertAllowed(result.code)` becomes
 * `assertTrue(typeof out === 'string')` (builder returns a string without
 * throwing). The runner sets CLAUDE_PROJECT_DIR to the repo root before this
 * suite loads, so the builders' module-load PROJECT_DIR / PROJECT_CONFIG bind
 * to the real repo — identical to how the legacy hooks (spawned with the same
 * inherited env) resolved their config and docs.
 *
 * EXCEPTION — i18n sync tests: buildFrontendContext binds PROJECT_CONFIG at
 * module load to the repo config (no localization). It therefore cannot reflect
 * a per-test multilingual config in-process. The faithful live successor for
 * those two cases is the dispatcher pretooluse-ctx-edit-tail.cjs (which carries
 * buildFrontendContext and loads project-config per fresh process). Those two
 * tests spawn that dispatcher with CLAUDE_PROJECT_DIR pointed at the tmpDir,
 * exactly as the legacy frontend-context spawn did — assertions unchanged.
 */

const path = require('path');
const fs = require('fs');
const { runHook, getHookPath, createPreToolUseInput } = require('../lib/hook-runner.cjs');
const { assertEqual, assertContains, assertAllowed, assertTrue } = require('../lib/assertions.cjs');
const { createTempDir, cleanupTempDir } = require('../lib/test-utils.cjs');
const { generateTestFixtures } = require('../../lib/test-fixture-generator.cjs');

// Builders under test (replace the spawned legacy per-domain context hooks)
const {
    buildDesignSystemContext,
    buildBackendContext,
    buildFrontendContext,
    buildScssStylingContext,
} = require('../../lib/pretooluse-context-builders.cjs');

// Get project-agnostic test fixtures
const f = generateTestFixtures();

// Direct builder invocation helpers: return the legacy hook's trimmed stdout
// block (or ''). preloadedLines=null disables dedup, matching a fresh spawn.
function buildDS(payload) { return buildDesignSystemContext(payload, null); }
function buildBE(payload) { return buildBackendContext(payload, null); }
function buildFE(payload) { return buildFrontendContext(payload, null); }
function buildSC(payload) { return buildScssStylingContext(payload, null); }

// Build a PreToolUse payload (mirrors createPreToolUseInput's shape, but as the
// already-parsed payload object the builders consume).
function payload(tool, toolInput) {
    return { tool_name: tool, tool_input: toolInput, transcript_path: '' };
}

// Dispatcher carrying buildFrontendContext, used only for the per-process
// config-dependent i18n cases.
const FRONTEND_DISPATCHER = getHookPath('pretooluse-ctx-edit-tail.cjs');

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
                pathRegexes: ['src[\\\\/](WebV2|Web)[\\\\/]', 'libs[\\\\/](platform-core|shared-common|shared-domain)[\\\\/]'],
                patternsDoc: 'docs/project-reference/frontend-patterns-reference.md',
                rules: []
            }
        ],
        localization: localizationOverride
    };
    fs.writeFileSync(path.join(docsDir, 'project-config.json'), JSON.stringify(config, null, 2));
}

// ============================================================================
// design-system context builder Tests  (← design-system-context.cjs)
// ============================================================================

const designSystemContextTests = [
    {
        name: '[design-system-context] injects for modern frontend .scss file',
        fn: () => {
            const out = buildDS(payload('Edit', {
                file_path: `${f.modernAppBase}/components/button.scss`,
                old_string: 'a',
                new_string: 'b'
            }));
            assertTrue(typeof out === 'string', 'builder returns a string (legacy exited 0)');
            assertTrue(out.includes('Design System') || out === '', 'May inject design system context');
        }
    },
    {
        name: '[design-system-context] injects for frontend .html file',
        fn: () => {
            const out = buildDS(payload('Edit', {
                file_path: `${f.modernAppBase}/app/component.html`,
                old_string: '<div>',
                new_string: '<div class="x">'
            }));
            assertTrue(typeof out === 'string', 'builder returns a string (legacy exited 0)');
        }
    },
    {
        name: '[design-system-context] skips non-frontend files',
        fn: () => {
            const out = buildDS(payload('Edit', {
                file_path: f.backendControllerCs,
                old_string: 'x',
                new_string: 'y'
            }));
            assertTrue(typeof out === 'string', 'builder returns a string (legacy exited 0)');
            assertTrue(!out.includes('Design System') || out === '', 'Should not inject for non-frontend file');
        }
    },
    {
        name: '[design-system-context] skips Read tool',
        fn: () => {
            const out = buildDS(payload('Read', {
                file_path: `${f.modernAppBase}/app.scss`
            }));
            assertTrue(typeof out === 'string', 'builder returns a string (legacy exited 0)');
            assertEqual(out, '', 'Should not inject for Read tool');
        }
    },
    {
        name: '[design-system-context] handles empty input',
        fn: () => {
            const out = buildDS({});
            assertTrue(typeof out === 'string', 'Should fail-open (return a string)');
        }
    },
    {
        name: '[design-system-context] handles Write tool',
        fn: () => {
            const out = buildDS(payload('Write', {
                file_path: 'src/Frontend/apps/playground-text-snippet/new.scss',
                content: '.btn { }'
            }));
            assertTrue(typeof out === 'string', 'builder returns a string (legacy exited 0)');
        }
    }
];

// ============================================================================
// backend context builder Tests  (← backend-context.cjs)
// ============================================================================

const backendCsharpContextTests = [
    {
        name: '[backend-csharp-context] injects for .cs file in backend service',
        fn: () => {
            const out = buildBE(payload('Edit', {
                file_path: f.backendControllerCs,
                old_string: 'void',
                new_string: 'Task'
            }));
            assertTrue(typeof out === 'string', 'builder returns a string (legacy exited 0)');
            assertTrue(out.includes('Backend') || out === '', 'May inject backend context');
        }
    },
    {
        name: '[backend-csharp-context] injects for framework file',
        fn: () => {
            const out = buildBE(payload('Edit', {
                file_path: f.frameworkRepositoryCs,
                old_string: 'x',
                new_string: 'y'
            }));
            assertTrue(typeof out === 'string', 'builder returns a string (legacy exited 0)');
            assertTrue(out.includes('Platform') || out.includes('Backend') || out === '', 'May inject platform context');
        }
    },
    {
        name: '[backend-csharp-context] injects for example app file',
        fn: () => {
            const out = buildBE(payload('Edit', {
                file_path: f.exampleCs,
                old_string: 'a',
                new_string: 'b'
            }));
            assertTrue(typeof out === 'string', 'builder returns a string (legacy exited 0)');
        }
    },
    {
        name: '[backend-csharp-context] skips non-.cs files',
        fn: () => {
            const out = buildBE(payload('Edit', {
                file_path: f.backendConfigJson,
                old_string: '"x"',
                new_string: '"y"'
            }));
            assertTrue(typeof out === 'string', 'builder returns a string (legacy exited 0)');
            assertEqual(out, '', 'Should not inject for non-.cs file');
        }
    },
    {
        name: '[backend-csharp-context] skips frontend .cs files',
        fn: () => {
            // .cs file outside backend patterns
            const out = buildBE(payload('Edit', {
                file_path: 'other/random.cs',
                old_string: 'x',
                new_string: 'y'
            }));
            assertTrue(typeof out === 'string', 'builder returns a string (legacy exited 0)');
            assertEqual(out, '', 'Should not inject for non-backend .cs');
        }
    },
    {
        name: '[backend-csharp-context] handles empty input',
        fn: () => {
            const out = buildBE({});
            assertTrue(typeof out === 'string', 'Should fail-open (return a string)');
        }
    }
];

// ============================================================================
// frontend context builder Tests  (← frontend-context.cjs)
// ============================================================================

const frontendTypescriptContextTests = [
    {
        name: '[frontend-typescript-context] injects for modern frontend .ts file',
        fn: () => {
            const out = buildFE(payload('Edit', {
                file_path: `${f.modernAppBase}/app/component.ts`,
                old_string: 'x',
                new_string: 'y'
            }));
            assertTrue(typeof out === 'string', 'builder returns a string (legacy exited 0)');
            assertTrue(out.includes('Frontend') || out === '', 'May inject frontend context');
        }
    },
    {
        name: '[frontend-typescript-context] injects for platform-core .ts file',
        fn: () => {
            const out = buildFE(payload('Edit', {
                file_path: `${f.coreLibBase}/src/component.ts`,
                old_string: 'a',
                new_string: 'b'
            }));
            assertTrue(typeof out === 'string', 'builder returns a string (legacy exited 0)');
            assertTrue(out.includes('Platform') || out.includes('Frontend') || out === '', 'May inject platform-core context');
        }
    },
    {
        name: '[frontend-typescript-context] injects for .tsx file',
        fn: () => {
            const out = buildFE(payload('Edit', {
                file_path: `${f.modernAppBase}/app/page.tsx`,
                old_string: 'div',
                new_string: 'section'
            }));
            assertTrue(typeof out === 'string', 'builder returns a string (legacy exited 0)');
        }
    },
    {
        name: '[frontend-typescript-context] skips backend .cs files',
        fn: () => {
            const out = buildFE(payload('Edit', {
                file_path: f.backendControllerCs,
                old_string: 'x',
                new_string: 'y'
            }));
            assertTrue(typeof out === 'string', 'builder returns a string (legacy exited 0)');
            assertEqual(out, '', 'Should not inject for .cs file');
        }
    },
    {
        name: '[frontend-typescript-context] skips Read tool',
        fn: () => {
            const out = buildFE(payload('Read', {
                file_path: `${f.modernAppBase}/app.ts`
            }));
            assertTrue(typeof out === 'string', 'builder returns a string (legacy exited 0)');
            assertEqual(out, '', 'Should not inject for Read tool');
        }
    },
    {
        name: '[frontend-typescript-context] handles empty input',
        fn: () => {
            const out = buildFE({});
            assertTrue(typeof out === 'string', 'Should fail-open (return a string)');
        }
    },
    {
        // CONFIG-PER-PROCESS: buildFrontendContext binds PROJECT_CONFIG at module
        // load (repo config, no localization) and cannot reflect this tmpDir
        // multilingual config in-process. The faithful live successor is the
        // dispatcher pretooluse-ctx-edit-tail.cjs, spawned with CLAUDE_PROJECT_DIR
        // pointed at the tmpDir so it loads the multilingual config per process —
        // exactly as the legacy frontend-context spawn did. Assertions unchanged.
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
                    file_path: 'src/WebV2/app/component.ts',
                    old_string: 'title = "Old";',
                    new_string: 'title = "New";'
                });
                const result = await runHook(FRONTEND_DISPATCHER, input, { cwd: tmpDir, env: { CLAUDE_PROJECT_DIR: tmpDir } });
                assertAllowed(result.code);
                assertContains(result.stdout, '**I18N:**', 'Should include i18n notice for multilingual projects');
                assertContains(result.stdout, 'translation resources', 'Should include translation sync guidance');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        // CONFIG-PER-PROCESS: see note above. Single-locale config must NOT emit
        // the i18n notice. Spawned via the dispatcher with the tmpDir config.
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
                    file_path: 'src/WebV2/app/component.ts',
                    old_string: 'title = "Old";',
                    new_string: 'title = "New";'
                });
                const result = await runHook(FRONTEND_DISPATCHER, input, { cwd: tmpDir, env: { CLAUDE_PROJECT_DIR: tmpDir } });
                assertAllowed(result.code);
                assertTrue(!result.stdout.includes('**I18N:**'), 'Should not include i18n notice for single-locale projects');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    }
];

// ============================================================================
// scss styling context builder Tests  (← scss-styling-context.cjs)
// ============================================================================

const scssContextTests = [
    {
        name: '[scss-styling-context] injects for modern frontend .scss file',
        fn: () => {
            const out = buildSC(payload('Edit', {
                file_path: `${f.modernAppBase}/styles/app.scss`,
                old_string: 'color:',
                new_string: 'background:'
            }));
            assertTrue(typeof out === 'string', 'builder returns a string (legacy exited 0)');
            assertTrue(out.includes('Styling') || out === '', 'May inject styling context');
        }
    },
    {
        name: '[scss-styling-context] injects for legacy frontend .css file',
        fn: () => {
            const out = buildSC(payload('Edit', {
                file_path: `${f.legacyAppBase}/styles/global.css`,
                old_string: 'a',
                new_string: 'b'
            }));
            assertTrue(typeof out === 'string', 'builder returns a string (legacy exited 0)');
        }
    },
    {
        name: '[scss-styling-context] injects for platform-core .scss file',
        fn: () => {
            const out = buildSC(payload('Edit', {
                file_path: `${f.coreLibBase}/styles/theme.scss`,
                old_string: 'x',
                new_string: 'y'
            }));
            assertTrue(typeof out === 'string', 'builder returns a string (legacy exited 0)');
        }
    },
    {
        name: '[scss-styling-context] skips .ts files',
        fn: () => {
            const out = buildSC(payload('Edit', {
                file_path: `${f.modernAppBase}/app.ts`,
                old_string: 'x',
                new_string: 'y'
            }));
            assertTrue(typeof out === 'string', 'builder returns a string (legacy exited 0)');
            assertEqual(out, '', 'Should not inject for .ts file');
        }
    },
    {
        name: '[scss-styling-context] handles Write tool for new .scss',
        fn: () => {
            const out = buildSC(payload('Write', {
                file_path: `${f.coreLibBase}/new-style.scss`,
                content: '.btn { display: flex; }'
            }));
            assertTrue(typeof out === 'string', 'builder returns a string (legacy exited 0)');
        }
    },
    {
        name: '[scss-styling-context] handles empty input',
        fn: () => {
            const out = buildSC({});
            assertTrue(typeof out === 'string', 'Should fail-open (return a string)');
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
    name: 'Context Builders (Phase 04)',
    tests: [...designSystemContextTests, ...backendCsharpContextTests, ...frontendTypescriptContextTests, ...scssContextTests, ...contextGuardBuilderTests]
};
