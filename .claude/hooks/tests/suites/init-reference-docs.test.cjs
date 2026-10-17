/**
 * Init Reference Docs Hook Test Suite
 *
 * Tests for session-init-docs.cjs:
 * - Config-driven doc list from project-config.json
 * - Absent selections resolve only evidenced capability docs
 * - Placeholder content generation from sections
 * - Idempotent behavior (skip existing files)
 * - Reference docs created in docs/project-reference/ directory
 * - Integration: hook creates files via stdin/stdout
 */

const path = require('path');
const fs = require('fs');
const { runHook, getHookPath, createUserPromptInput } = require('../lib/hook-runner.cjs');
const { assertEqual, assertTrue, assertContains, assertAllowed } = require('../lib/assertions.cjs');
const { createTempDir, cleanupTempDir } = require('../lib/test-utils.cjs');

const HOOK_PATH = getHookPath('session-init-docs.cjs');

/**
 * Helper: create a marked project that passes root and hasProjectContent() guards.
 * Creates '.claude/' and a dummy 'src/' directory so the hook reaches doc initialization.
 */
function createTempProjectDir() {
    const tmpDir = createTempDir();
    fs.mkdirSync(path.join(tmpDir, '.claude'));
    fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
    return tmpDir;
}

// ============================================================================
// Unit Tests: getReferenceDocs()
// ============================================================================

const unitTests = [
    {
        // Technical contract: performance guidance is capability-selected, never a hidden doc floor.
        name: '[init-reference-docs] performance reference has a scan owner and preserves exact selection',
        fn: () => {
            const { resolveDefaultReferenceDocs, normalizeReferenceDocs, mergeReferenceDocs } = require('../../lib/session-init-helpers.cjs');
            const { resolveReferenceDocTarget } = require('../../lib/project-reference-registry.cjs');
            const { validateConfig } = require('../../lib/project-config-schema.cjs');
            const filename = 'performance-test-reference.md';
            const config = { project: { name: 'Performance fixture' }, framework: { name: 'native', performanceTestDoc: 'handbook/performance.md' } };
            assertEqual(validateConfig(config).valid, true);
            assertTrue(resolveDefaultReferenceDocs(config).some(doc => doc.filename === filename));
            assertTrue(resolveDefaultReferenceDocs({ testing: { filePatterns: { performance: '*.load.py' } } }).some(doc => doc.filename === filename));
            assertTrue(!resolveDefaultReferenceDocs({ project: { name: 'Minimal' } }).some(doc => doc.filename === filename));
            assertEqual(JSON.stringify(normalizeReferenceDocs([], config).normalized), '[]');
            assertEqual(JSON.stringify(normalizeReferenceDocs([{ filename: 'code-review-rules.md', purpose: 'Review' }], config).normalized.map(doc => doc.filename)), '["code-review-rules.md"]');
            assertEqual(resolveReferenceDocTarget(filename).command, 'scan --target=performance-tests');
            assertEqual(mergeReferenceDocs([{ filename }])[0].templatePath, '.claude/templates/reference-docs/performance-test-reference.md');
            assertEqual(validateConfig({ ...config, framework: { ...config.framework, performanceTestDoc: 42 } }).valid, false);
        }
    },
    {
        // Invariant: new guide scaffolds enable discovery without prescribing an unevidenced architecture.
        name: '[init-reference-docs] guide scaffolds preserve local sections without imposing architecture',
        fn: () => {
            // Given portable built-in definitions and an explicitly selected local section contract.
            const { mergeReferenceDocs, generatePlaceholderContent } = require('../../lib/session-init-helpers.cjs');
            const filenames = ['project-structure-reference.md', 'backend-patterns-reference.md',
                'frontend-patterns-reference.md', 'integration-test-reference.md', 'domain-entities-reference.md'];
            // When default guides are scaffolded, they route discovery instead of requiring inventories/classes.
            for (const filename of filenames) {
                const [definition] = mergeReferenceDocs([{ filename }]);
                const content = generatePlaceholderContent(definition);
                // Then the discovery route exists and no prescribed pattern section sneaks into the scaffold.
                assertContains(content, '## Discovery');
                for (const legacySection of ['Project Directory Tree', 'Repository Pattern', 'CQRS Patterns',
                    'Component Base Classes', 'Test Base Classes', 'Entity Catalog', 'Aggregate Boundaries']) {
                    assertTrue(!definition.sections.includes(legacySection), `${filename} prescribes ${legacySection}`);
                }
                const [local] = mergeReferenceDocs([{ filename, sections: ['Local owner contract'] }]);
                assertEqual(JSON.stringify(local.sections), JSON.stringify(['Local owner contract']));
                assertContains(generatePlaceholderContent(local), '## Local owner contract');
            }
        }
    },
    {
        name: '[init-reference-docs] absent selection is empty for a minimal project and does not use a hidden reference floor',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const docsDir = path.join(tmpDir, 'docs');
                fs.mkdirSync(docsDir, { recursive: true });
                fs.writeFileSync(path.join(docsDir, 'project-config.json'), JSON.stringify({
                    schemaVersion: 2,
                    project: { name: 'NoReferenceDocsProject' }
                }));

                const modulePath = path.resolve(__dirname, '../../session-init-docs.cjs');
                const loaderPath = path.resolve(__dirname, '../../lib/project-config-loader.cjs');
                const helpersPath = path.resolve(__dirname, '../../lib/session-init-helpers.cjs');
                delete require.cache[modulePath];
                delete require.cache[loaderPath];
                delete require.cache[helpersPath];

                const origDir = process.env.CLAUDE_PROJECT_DIR;
                process.env.CLAUDE_PROJECT_DIR = tmpDir;
                try {
                    const { getReferenceDocs, DEFAULT_REFERENCE_DOCS } = require(modulePath);
                    const docs = getReferenceDocs();
                    assertEqual(JSON.stringify(DEFAULT_REFERENCE_DOCS), '[]', 'The portable task-specific baseline is empty');
                    assertEqual(JSON.stringify(docs), '[]', 'A minimal project has no task-specific reference docs');

                    const { normalizeReferenceDocs } = require(helpersPath);
                    const repair = normalizeReferenceDocs(undefined);
                    assertEqual(JSON.stringify(repair.normalized), '[]', 'Absent selection resolves to no unsupported capabilities');
                    assertEqual(JSON.stringify(repair.added), '[]', 'An empty capability result requires no selected-doc additions');
                    assertEqual(repair.changed, false, 'Absent selection with no capabilities is stable');
                } finally {
                    if (origDir === undefined) { delete process.env.CLAUDE_PROJECT_DIR; } else { process.env.CLAUDE_PROJECT_DIR = origDir; }
                    delete require.cache[modulePath];
                    delete require.cache[loaderPath];
                    delete require.cache[helpersPath];
                }
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        // Business Intent / Invariant Guarded: a project can select only the reference docs it owns.
        name: '[init-reference-docs] getReferenceDocs respects an explicit selected subset in config order',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const docsDir = path.join(tmpDir, 'docs');
                fs.mkdirSync(docsDir, { recursive: true });
                const config = {
                    project: { name: 'SelectedDocsProject' },
                    framework: {
                        name: 'Express',
                        backendPatternsDoc: 'docs/project-reference/backend-patterns-reference.md',
                        e2eTestDoc: 'docs/project-reference/e2e-test-reference.md'
                    },
                    e2eTesting: { framework: 'Playwright' },
                    referenceDocs: [
                        { filename: 'custom-guide.md', purpose: 'Custom guide', sections: ['Setup', 'Usage'], templatePath: 'templates/custom-guide.md' },
                        { filename: 'feature-docs-reference.md', purpose: 'Local feature docs', sections: ['Native contract'], templatePath: 'wrong-template.md' }
                    ]
                };
                fs.writeFileSync(path.join(docsDir, 'project-config.json'), JSON.stringify(config));

                const modulePath = path.resolve(__dirname, '../../session-init-docs.cjs');
                const loaderPath = path.resolve(__dirname, '../../lib/project-config-loader.cjs');
                const helpersPath = path.resolve(__dirname, '../../lib/session-init-helpers.cjs');
                delete require.cache[modulePath];
                delete require.cache[loaderPath];
                delete require.cache[helpersPath];

                const origDir = process.env.CLAUDE_PROJECT_DIR;
                process.env.CLAUDE_PROJECT_DIR = tmpDir;
                try {
                    const { getReferenceDocs } = require(modulePath);
                    const docs = getReferenceDocs();
                    const names = docs.map(d => d.filename);
                    assertEqual(JSON.stringify(names), JSON.stringify(['custom-guide.md', 'feature-spec-reference.md']), 'Explicit selection remains exact despite other declared capability evidence');
                    assertEqual(docs[0].templatePath, 'templates/custom-guide.md', 'Selected project template path is preserved');
                    assertEqual(docs[1].purpose, 'Local feature docs', 'Selected canonical metadata override is preserved');
                    assertEqual(JSON.stringify(docs[1].sections), JSON.stringify(['Native contract']), 'Selected canonical sections are preserved');
                    assertEqual(docs[1].templatePath, '.claude/templates/reference-docs/feature-spec-reference.md', 'Canonical template path remains authoritative');
                } finally {
                    if (origDir === undefined) { delete process.env.CLAUDE_PROJECT_DIR; } else { process.env.CLAUDE_PROJECT_DIR = origDir; }
                    delete require.cache[modulePath];
                    delete require.cache[loaderPath];
                    delete require.cache[helpersPath];
                }
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        // Business Intent / Invariant Guarded: an explicit empty selection disables default reference-doc scaffolding.
        name: '[init-reference-docs] getReferenceDocs preserves an explicit empty selection',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const docsDir = path.join(tmpDir, 'docs');
                fs.mkdirSync(docsDir, { recursive: true });
                fs.writeFileSync(path.join(docsDir, 'project-config.json'), JSON.stringify({
                    project: { name: 'EmptySelectionProject' },
                    framework: { name: 'Express', backendPatternsDoc: 'docs/project-reference/backend-patterns-reference.md' },
                    referenceDocs: []
                }));

                const modulePath = path.resolve(__dirname, '../../session-init-docs.cjs');
                const loaderPath = path.resolve(__dirname, '../../lib/project-config-loader.cjs');
                const helpersPath = path.resolve(__dirname, '../../lib/session-init-helpers.cjs');
                delete require.cache[modulePath];
                delete require.cache[loaderPath];
                delete require.cache[helpersPath];

                const origDir = process.env.CLAUDE_PROJECT_DIR;
                process.env.CLAUDE_PROJECT_DIR = tmpDir;
                try {
                    const { getReferenceDocs } = require(modulePath);
                    assertEqual(JSON.stringify(getReferenceDocs()), '[]', 'An explicit empty array remains empty');

                    const { normalizeReferenceDocs } = require(helpersPath);
                    const result = normalizeReferenceDocs([]);
                    assertEqual(result.normalized.length, 0, 'Repair output keeps the explicit empty selection');
                    assertEqual(result.added.length, 0, 'Repair does not propose portable defaults for an explicit empty selection');
                    assertEqual(result.changed, false, 'An explicit empty selection is already normalized');
                } finally {
                    if (origDir === undefined) { delete process.env.CLAUDE_PROJECT_DIR; } else { process.env.CLAUDE_PROJECT_DIR = origDir; }
                    delete require.cache[modulePath];
                    delete require.cache[loaderPath];
                    delete require.cache[helpersPath];
                }
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[init-reference-docs] absent selection adds only config-evidenced capability docs',
        fn: async () => {
            const helpersPath = path.resolve(__dirname, '../../lib/session-init-helpers.cjs');
            delete require.cache[helpersPath];
            const { resolveDefaultReferenceDocs, normalizeReferenceDocs } = require(helpersPath);

            const minimal = resolveDefaultReferenceDocs({ project: { name: 'CLI Library' } });
            assertEqual(JSON.stringify(minimal), '[]', 'Name-only CLI/library config opts into no capability docs');

            const backendConfig = {
                project: { name: 'Backend App' },
                framework: {
                    name: 'Express',
                    backendPatternsDoc: 'docs/project-reference/backend-patterns-reference.md'
                }
            };
            const backend = resolveDefaultReferenceDocs(backendConfig).map(doc => doc.filename);
            assertEqual(JSON.stringify(backend), JSON.stringify(['backend-patterns-reference.md']), 'A declared backend reference enables only its matching capability doc');

            const styledConfig = {
                project: { name: 'Styled App' },
                styling: { technology: 'SCSS', fileExtensions: ['.scss'] }
            };
            const styled = resolveDefaultReferenceDocs(styledConfig).map(doc => doc.filename);
            assertEqual(JSON.stringify(styled), JSON.stringify(['scss-styling-guide.md']), 'Declared SCSS evidence selects its guide without adding browser/UI/backend docs');

            const repair = normalizeReferenceDocs(undefined, backendConfig);
            assertEqual(JSON.stringify(repair.added), JSON.stringify(['backend-patterns-reference.md']), 'Absent-selection normalization reports only evidenced docs');
            delete require.cache[helpersPath];
        }
    },
    {
        // Business Intent / Invariant Guarded: alias repair may normalize selected docs but must not add unselected defaults.
        name: '[init-reference-docs] mergeReferenceDocs preserves an explicit selection while resolving legacy aliases',
        fn: async () => {
            const helpersPath = path.resolve(__dirname, '../../lib/session-init-helpers.cjs');
            delete require.cache[helpersPath];
            const { mergeReferenceDocs } = require(helpersPath);

            const merged = mergeReferenceDocs([
                { filename: 'feature-docs-reference.md', purpose: 'Legacy feature docs', sections: [] },
                { filename: 'custom-guide.md', purpose: 'Custom guide', sections: ['Usage'] }
            ]);
            const names = merged.map(d => d.filename);

            assertEqual(JSON.stringify(names), JSON.stringify(['feature-spec-reference.md', 'custom-guide.md']), 'Only selected entries remain in input order after alias normalization');
            assertEqual(merged[0].purpose, 'Legacy feature docs', 'Selected canonical purpose override is honored');
            assertEqual(merged[0].templatePath, '.claude/templates/reference-docs/feature-spec-reference.md', 'Selected canonical templatePath remains authoritative');
            assertEqual(JSON.stringify(merged[1].sections), JSON.stringify(['Usage']), 'Custom selected metadata is preserved');

            delete require.cache[helpersPath];
        }
    },
    {
        // Business Intent / Invariant Guarded: repair reporting preserves the project's selected set.
        name: '[init-reference-docs] normalizeReferenceDocs reports alias repair without adding unselected defaults',
        fn: async () => {
            const helpersPath = path.resolve(__dirname, '../../lib/session-init-helpers.cjs');
            delete require.cache[helpersPath];
            const { normalizeReferenceDocs } = require(helpersPath);

            const result = normalizeReferenceDocs([
                { filename: 'feature-docs-reference.md', purpose: 'Legacy', sections: [] },
                { filename: 'custom-guide.md', purpose: 'Custom', sections: ['Setup'] }
            ]);

            assertEqual(result.changed, true, 'Drifted config flagged as changed');
            assertEqual(JSON.stringify(result.renames), JSON.stringify([{ from: 'feature-docs-reference.md', to: 'feature-spec-reference.md' }]), 'Legacy rename reported');
            assertEqual(JSON.stringify(result.removedLegacy), JSON.stringify(['feature-docs-reference.md']), 'Legacy entry flagged for removal');
            assertEqual(JSON.stringify(result.normalized.map(d => d.filename)), JSON.stringify(['feature-spec-reference.md', 'custom-guide.md']), 'Normalized selection contains only the configured docs');
            assertEqual(result.added.length, 0, 'Unselected portable defaults are not reported for addition');
            assertEqual(result.normalized[0].templatePath, '.claude/templates/reference-docs/feature-spec-reference.md', 'Alias receives its canonical templatePath');

            const stable = normalizeReferenceDocs(result.normalized);
            assertEqual(stable.changed, false, 'Normalized explicit selection is stable (idempotent)');
            assertEqual(stable.renames.length, 0, 'No renames on canonical config');
            assertEqual(stable.added.length, 0, 'No additions on canonical config');

            delete require.cache[helpersPath];
        }
    },
    {
        // Business Intent / Invariant Guarded: alias/canonical duplicates normalize to one selected doc.
        name: '[init-reference-docs] mergeReferenceDocs resolves legacy and canonical collisions in either order',
        fn: async () => {
            const helpersPath = path.resolve(__dirname, '../../lib/session-init-helpers.cjs');
            delete require.cache[helpersPath];
            const { mergeReferenceDocs } = require(helpersPath);

            const legacy = { filename: 'feature-docs-reference.md', purpose: 'LEGACY purpose', sections: ['legacy'] };
            const canonical = { filename: 'feature-spec-reference.md', purpose: 'CANONICAL purpose', sections: ['canonical'] };

            for (const [order, docs] of [['legacy-first', [legacy, canonical]], ['canonical-first', [canonical, legacy]]]) {
                const merged = mergeReferenceDocs(docs);
                const names = merged.map(d => d.filename);
                assertEqual(merged.length, 1, `${order}: only the selected canonical doc remains`);
                assertEqual(names.filter(n => n === 'feature-spec-reference.md').length, 1, `${order}: canonical target appears exactly once`);
                assertTrue(!names.includes('feature-docs-reference.md'), `${order}: legacy filename never emitted`);
                const doc = merged.find(d => d.filename === 'feature-spec-reference.md');
                assertEqual(doc.purpose, 'CANONICAL purpose', `${order}: canonical-named entry wins over legacy alias`);
                assertEqual(JSON.stringify(doc.sections), JSON.stringify(['canonical']), `${order}: canonical sections win`);
            }

            delete require.cache[helpersPath];
        }
    },
    {
        // Business Intent / Invariant Guarded: benign filename cleanup must not broaden an explicit selection.
        name: '[init-reference-docs] trailing-whitespace legacy filename resolves without adding defaults',
        fn: async () => {
            const helpersPath = path.resolve(__dirname, '../../lib/session-init-helpers.cjs');
            delete require.cache[helpersPath];
            const { mergeReferenceDocs, normalizeReferenceDocs } = require(helpersPath);

            const merged = mergeReferenceDocs([{ filename: 'feature-docs-reference.md ', purpose: 'Legacy', sections: [] }]);
            const names = merged.map(d => d.filename);
            assertEqual(JSON.stringify(names), JSON.stringify(['feature-spec-reference.md']), 'Whitespace legacy resolves to exactly one selected canonical target');
            assertEqual(merged[0].templatePath, '.claude/templates/reference-docs/feature-spec-reference.md', 'Canonical templatePath is retained');

            const result = normalizeReferenceDocs([{ filename: 'feature-docs-reference.md ', purpose: 'Legacy', sections: [] }]);
            assertEqual(JSON.stringify(result.renames), JSON.stringify([{ from: 'feature-docs-reference.md', to: 'feature-spec-reference.md' }]), 'Whitespace legacy reported as rename (trimmed)');
            assertEqual(JSON.stringify(result.removedLegacy), JSON.stringify(['feature-docs-reference.md']), 'Whitespace legacy flagged for removal (trimmed)');
            assertEqual(result.normalized.length, 1, 'No unselected portable defaults are added during repair');
            assertEqual(result.added.length, 0, 'Unselected defaults are not reported as additions');

            delete require.cache[helpersPath];
        }
    },
    {
        // Business Intent / Invariant Guarded: duplicate aliases do not duplicate selection or repair instructions.
        name: '[init-reference-docs] normalizeReferenceDocs deduplicates repeated legacy selections',
        fn: async () => {
            const helpersPath = path.resolve(__dirname, '../../lib/session-init-helpers.cjs');
            delete require.cache[helpersPath];
            const { normalizeReferenceDocs } = require(helpersPath);

            const result = normalizeReferenceDocs([
                { filename: 'feature-docs-reference.md', purpose: 'Legacy A', sections: [] },
                { filename: 'feature-docs-reference.md', purpose: 'Legacy B', sections: [] }
            ]);
            assertEqual(result.renames.length, 1, 'Duplicate legacy entry yields a single rename');
            assertEqual(result.removedLegacy.length, 1, 'Duplicate legacy entry yields a single removal');
            assertEqual(JSON.stringify(result.renames[0]), JSON.stringify({ from: 'feature-docs-reference.md', to: 'feature-spec-reference.md' }), 'Single rename is the canonical mapping');
            assertEqual(JSON.stringify(result.normalized.map(d => d.filename)), JSON.stringify(['feature-spec-reference.md']), 'Duplicate alias produces one selected canonical doc');
            assertEqual(result.added.length, 0, 'Duplicate selected alias does not add unselected defaults');

            delete require.cache[helpersPath];
        }
    },
    {
        name: '[init-reference-docs] deriveProjectName prefers package metadata, then Git origin, then the root folder',
        fn: async () => {
            const tmpDir = createTempDir();
            const helpersPath = path.resolve(__dirname, '../../lib/session-init-helpers.cjs');
            delete require.cache[helpersPath];
            try {
                const { deriveProjectName } = require(helpersPath);
                fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({ name: '@example/cli-app' }));
                fs.mkdirSync(path.join(tmpDir, '.git'), { recursive: true });
                fs.writeFileSync(path.join(tmpDir, '.git', 'config'), '[remote "origin"]\n\turl = git@github.com:example/repository-name.git\n');
                assertEqual(deriveProjectName(tmpDir), '@example/cli-app', 'Non-empty package metadata has highest priority');

                fs.unlinkSync(path.join(tmpDir, 'package.json'));
                assertEqual(deriveProjectName(tmpDir), 'repository-name', 'Git origin provides an evidence-backed name when package metadata is absent');

                fs.unlinkSync(path.join(tmpDir, '.git', 'config'));
                assertEqual(deriveProjectName(tmpDir), path.basename(tmpDir), 'The project-root folder is the final fallback');
            } finally {
                delete require.cache[helpersPath];
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        // Business Intent / Invariant Guarded: a rejected reference-root override never points generated config outside the project.
        name: '[init-reference-docs] buildSkeleton is schema-valid and omits unknown optional capability declarations',
        fn: async () => {
            const tmpDir = createTempDir();
            const ckDir = path.join(tmpDir, '.claude');
            const docsDir = path.join(tmpDir, 'docs');
            fs.mkdirSync(ckDir, { recursive: true });
            fs.mkdirSync(docsDir, { recursive: true });
            fs.writeFileSync(path.join(ckDir, '.ck.json'), JSON.stringify({
                portability: { docsIndexPath: '../outside/docs-index-reference.md' }
            }));
            fs.writeFileSync(path.join(docsDir, 'project-config.json'), JSON.stringify({
                schemaVersion: 2,
                project: { name: 'SafeReferenceRoot' },
                docsRoots: { projectReference: { path: 'handbook/reference' } }
            }));

            const helpersPath = path.resolve(__dirname, '../../lib/session-init-helpers.cjs');
            const loaderPath = path.resolve(__dirname, '../../lib/project-config-loader.cjs');
            const ckLoaderPath = path.resolve(__dirname, '../../lib/ck-config-loader.cjs');
            delete require.cache[helpersPath];
            delete require.cache[loaderPath];
            delete require.cache[ckLoaderPath];

            const origDir = process.env.CLAUDE_PROJECT_DIR;
            process.env.CLAUDE_PROJECT_DIR = tmpDir;
            try {
                const { buildSkeleton } = require(helpersPath);
                const { validateConfig } = require(path.resolve(__dirname, '../../lib/project-config-schema.cjs'));
                const skeleton = buildSkeleton();
                assertTrue(validateConfig(skeleton).valid, 'Generated skeleton satisfies the required project-config schema');
                assertEqual(skeleton.project.name, path.basename(tmpDir), 'Folder metadata supplies a non-empty project identity when no package or Git metadata exists');
                assertEqual(skeleton.framework, undefined, 'Unknown framework capability is omitted');
                assertEqual(skeleton.designSystem, undefined, 'Unknown design-system capability is omitted');
                assertEqual(skeleton.docsRoots, undefined, 'Unneeded relocatable roots are omitted until configured');
                assertEqual(skeleton.referenceDocs, undefined, 'Absent selection remains absent instead of becoming an explicit empty array');
            } finally {
                if (origDir === undefined) { delete process.env.CLAUDE_PROJECT_DIR; } else { process.env.CLAUDE_PROJECT_DIR = origDir; }
                delete require.cache[helpersPath];
                delete require.cache[loaderPath];
                delete require.cache[ckLoaderPath];
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[init-reference-docs] generatePlaceholderContent creates correct markdown',
        fn: async () => {
            const modulePath = path.resolve(__dirname, '../../session-init-docs.cjs');
            delete require.cache[modulePath];

            const { generatePlaceholderContent } = require(modulePath);
            const content = generatePlaceholderContent({
                filename: 'test-patterns-reference.md',
                purpose: 'Test patterns',
                sections: ['Unit Tests', 'Integration Tests']
            });

            assertContains(content, '# Test Patterns Reference', 'Has title');
            assertContains(content, '## Unit Tests', 'Has first section');
            assertContains(content, '## Integration Tests', 'Has second section');
            assertContains(content, '<!-- ', 'Has placeholder comments');

            delete require.cache[modulePath];
        }
    },
    {
        name: '[init-reference-docs] generatePlaceholderContent handles empty sections',
        fn: async () => {
            const modulePath = path.resolve(__dirname, '../../session-init-docs.cjs');
            delete require.cache[modulePath];

            const { generatePlaceholderContent } = require(modulePath);
            const content = generatePlaceholderContent({
                filename: 'lessons.md',
                purpose: 'Lessons',
                sections: []
            });

            assertContains(content, '# Lessons', 'Has title');
            assertTrue(!content.includes('## '), 'No sections generated for empty array');

            delete require.cache[modulePath];
        }
    },
    // ============================================================================
    // Design System init gaps regression suite (Phase 5: tests a-g)
    // ============================================================================
    {
        // Test (a) — Phase 1: .scss placeholder uses /* */ comments, not <!-- -->
        name: '[init-reference-docs] generatePlaceholderContent emits SCSS-style comments for .scss',
        fn: async () => {
            const modulePath = path.resolve(__dirname, '../../session-init-docs.cjs');
            const helpersPath = path.resolve(__dirname, '../../lib/session-init-helpers.cjs');
            delete require.cache[modulePath];
            delete require.cache[helpersPath];

            const { generatePlaceholderContent } = require(modulePath);
            const content = generatePlaceholderContent({
                filename: 'design-system/design-tokens.scss',
                purpose: 'Design tokens',
                sections: ['Colors', 'Spacing']
            });

            assertContains(content, '/* Design Tokens */', 'Has SCSS-style title comment');
            assertContains(content, '/* @claude:placeholder', 'Has Claude sentinel');
            assertContains(content, '/* Colors */', 'First section as block comment (valid in both SCSS and CSS)');
            assertContains(content, '/* Spacing */', 'Second section as block comment');
            assertTrue(!content.includes('<!--'), 'Must NOT contain HTML comments');
            assertTrue(!content.includes('# '), 'Must NOT contain Markdown heading');

            delete require.cache[modulePath];
            delete require.cache[helpersPath];
        }
    },
    {
        // Test (b) — Phase 1: .css placeholder uses /* */ comments, not <!-- -->
        name: '[init-reference-docs] generatePlaceholderContent emits SCSS-style comments for .css',
        fn: async () => {
            const modulePath = path.resolve(__dirname, '../../session-init-docs.cjs');
            const helpersPath = path.resolve(__dirname, '../../lib/session-init-helpers.cjs');
            delete require.cache[modulePath];
            delete require.cache[helpersPath];

            const { generatePlaceholderContent } = require(modulePath);
            const content = generatePlaceholderContent({
                filename: 'design-system/design-tokens.css',
                purpose: 'Design tokens',
                sections: ['Colors']
            });

            assertContains(content, '/* Design Tokens */', 'Has CSS-style title comment');
            assertContains(content, '/* @claude:placeholder', 'Has Claude sentinel');
            assertContains(content, '/* Colors */', 'Section as block comment (// is invalid in CSS spec)');
            assertTrue(!content.includes('// '), 'Must NOT use line comments — invalid in CSS spec');
            assertTrue(!content.includes('<!--'), 'Must NOT contain HTML comments');

            delete require.cache[modulePath];
            delete require.cache[helpersPath];
        }
    },
    {
        // Test (c) — Phase 1: .md regression — Markdown branch unchanged
        name: '[init-reference-docs] generatePlaceholderContent preserves Markdown branch for .md',
        fn: async () => {
            const modulePath = path.resolve(__dirname, '../../session-init-docs.cjs');
            const helpersPath = path.resolve(__dirname, '../../lib/session-init-helpers.cjs');
            delete require.cache[modulePath];
            delete require.cache[helpersPath];

            const { generatePlaceholderContent } = require(modulePath);
            const content = generatePlaceholderContent({
                filename: 'example.md',
                purpose: 'Example',
                sections: ['Overview']
            });

            assertContains(content, '# Example', 'Has Markdown title');
            assertContains(content, "<!-- Fill in your project's details below. -->", 'Has Markdown placeholder marker');
            assertContains(content, '## Overview', 'Has Markdown section heading');
            assertTrue(!content.includes('/* '), 'Must NOT contain SCSS comments');
            assertTrue(!content.includes('@claude:placeholder'), 'Must NOT contain SCSS sentinel');

            delete require.cache[modulePath];
            delete require.cache[helpersPath];
        }
    },
    {
        name: '[init-reference-docs] generatePlaceholderContent copies templatePath when available',
        fn: async () => {
            const tmpDir = createTempDir();
            const modulePath = path.resolve(__dirname, '../../session-init-docs.cjs');
            const loaderPath = path.resolve(__dirname, '../../lib/project-config-loader.cjs');
            const helpersPath = path.resolve(__dirname, '../../lib/session-init-helpers.cjs');
            const origDir = process.env.CLAUDE_PROJECT_DIR;

            try {
                const templatePath = path.join(tmpDir, '.claude', 'templates', 'reference-docs', 'spec-principles.md');
                fs.mkdirSync(path.dirname(templatePath), { recursive: true });
                fs.writeFileSync(templatePath, '# Template Spec Principles\n\nTemplate content.\n', 'utf-8');

                process.env.CLAUDE_PROJECT_DIR = tmpDir;
                delete require.cache[modulePath];
                delete require.cache[loaderPath];
                delete require.cache[helpersPath];

                const { generatePlaceholderContent } = require(modulePath);
                const content = generatePlaceholderContent({
                    filename: 'spec-principles.md',
                    purpose: 'Spec principles',
                    sections: ['Unused section'],
                    templatePath: '.claude/templates/reference-docs/spec-principles.md'
                });

                assertContains(content, '# Template Spec Principles', 'Uses template title');
                assertContains(content, 'Template content.', 'Uses template body');
                assertTrue(!content.includes("Fill in your project's details below"), 'Does not fall back to generic placeholder');
            } finally {
                if (origDir === undefined) { delete process.env.CLAUDE_PROJECT_DIR; } else { process.env.CLAUDE_PROJECT_DIR = origDir; }
                delete require.cache[modulePath];
                delete require.cache[loaderPath];
                delete require.cache[helpersPath];
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        // Test (d) — Phase 1: isPlaceholderFile recognises SCSS sentinel
        name: '[init-reference-docs] isPlaceholderFile detects SCSS sentinel and returns false for real tokens',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const modulePath = path.resolve(__dirname, '../../session-init-docs.cjs');
                const helpersPath = path.resolve(__dirname, '../../lib/session-init-helpers.cjs');
                delete require.cache[modulePath];
                delete require.cache[helpersPath];

                const { generatePlaceholderContent, isPlaceholderFile } = require(modulePath);
                const filePath = path.join(tmpDir, 'design-tokens.scss');

                fs.writeFileSync(filePath, generatePlaceholderContent({
                    filename: 'design-tokens.scss',
                    purpose: 'tokens',
                    sections: ['Colors']
                }));
                assertEqual(isPlaceholderFile(filePath), true, 'SCSS placeholder file detected');

                fs.writeFileSync(filePath, '$primary: #fff;\n$secondary: #000;\n');
                assertEqual(isPlaceholderFile(filePath), false, 'Real SCSS file not flagged as placeholder');

                delete require.cache[modulePath];
                delete require.cache[helpersPath];
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        // Test (e) — Phase 2: SCAN_SKILL_MAP routes canonical + token filenames
        name: '[init-reference-docs] SCAN_SKILL_MAP routes design-system canonical and token files',
        fn: async () => {
            const modulePath = path.resolve(__dirname, '../../session-init-docs.cjs');
            const helpersPath = path.resolve(__dirname, '../../lib/session-init-helpers.cjs');
            delete require.cache[modulePath];
            delete require.cache[helpersPath];

            const { SCAN_SKILL_MAP } = require(modulePath);

            assertEqual(SCAN_SKILL_MAP['design-system/README.md'], 'scan --target=design-system', 'README still routes (no regression)');
            assertEqual(SCAN_SKILL_MAP['design-system/design-system-canonical.md'], 'scan --target=design-system', 'Canonical doc routes');
            assertEqual(SCAN_SKILL_MAP['design-system/design-tokens.scss'], 'scan --target=design-system', 'SCSS tokens route');
            assertEqual(SCAN_SKILL_MAP['design-system/design-tokens.css'], 'scan --target=design-system', 'CSS tokens route');
            assertEqual(SCAN_SKILL_MAP['seed-test-data-reference.md'], 'scan --target=seed-test-data', 'Seed test data reference routes');

            delete require.cache[modulePath];
            delete require.cache[helpersPath];
        }
    },
    {
        // Test (f) — Phase 3: schema declares canonicalDoc + tokenFiles, validator clean on real config
        name: '[init-reference-docs] schema declares designSystem.canonicalDoc + tokenFiles, validator clean',
        fn: async () => {
            const schemaPath = path.resolve(__dirname, '../../lib/project-config-schema.cjs');
            delete require.cache[schemaPath];

            const { SCHEMA, validateConfig } = require(schemaPath);

            const props = SCHEMA.designSystem && SCHEMA.designSystem.properties;
            assertTrue(!!props, 'designSystem.properties exists');
            assertEqual(props.canonicalDoc.type, 'string', 'canonicalDoc declared as string');
            assertEqual(props.canonicalDoc.required, false, 'canonicalDoc not required');
            assertEqual(props.tokenFiles.type, 'array', 'tokenFiles declared as array');
            assertEqual(props.tokenFiles.required, false, 'tokenFiles not required');

            // Validate the live repo config — schema must accept it cleanly
            const repoConfigPath = path.resolve(__dirname, '../../../../docs/project-config.json');
            if (fs.existsSync(repoConfigPath)) {
                const config = JSON.parse(fs.readFileSync(repoConfigPath, 'utf-8'));
                const result = validateConfig(config);
                const dsWarnings = (result.warnings || []).filter(w => /designSystem/.test(w));
                assertEqual(dsWarnings.length, 0, `No designSystem warnings (got: ${JSON.stringify(dsWarnings)})`);
            }

            delete require.cache[schemaPath];
        }
    },
    {
        // Test (g) — Phase 1: sentinel false-positive defense (line-anchored detection)
        name: '[init-reference-docs] isPlaceholderFile sentinel must not match real prose containing similar text',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const modulePath = path.resolve(__dirname, '../../session-init-docs.cjs');
                const helpersPath = path.resolve(__dirname, '../../lib/session-init-helpers.cjs');
                delete require.cache[modulePath];
                delete require.cache[helpersPath];

                const { isPlaceholderFile } = require(modulePath);
                const filePath = path.join(tmpDir, 'tokens.scss');

                // Real authored file with prose comment that LOOKS like a placeholder marker
                fs.writeFileSync(filePath, "/* Fill in your project's design tokens below. */\n$primary: #fff;\n");
                assertEqual(isPlaceholderFile(filePath), false, 'Real prose must NOT be flagged as placeholder');

                // Actual Claude sentinel — must match
                fs.writeFileSync(filePath, '/* @claude:placeholder — do not commit */\n$primary: #fff;\n');
                assertEqual(isPlaceholderFile(filePath), true, 'Actual sentinel detected');

                // Sentinel as substring inside another line must NOT match (line-anchored)
                fs.writeFileSync(filePath, '// docs say: /* @claude:placeholder — do not commit */ for new files\n$primary: #fff;\n');
                assertEqual(isPlaceholderFile(filePath), false, 'Substring occurrence must NOT match (line-anchored)');

                delete require.cache[modulePath];
                delete require.cache[helpersPath];
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        // A templatePath that points at a missing file degrades SILENTLY and unrecoverably:
        // generatePlaceholderContent falls through to a contentless section stub, and a
        // scan-excluded doc (lessons.md, custom-prompts-reference.md, skill-protocols-reference.md)
        // has no /scan target to regenerate it from. Assert every declared template really ships.
        name: '[init-reference-docs] every canonical catalog templatePath resolves to an existing file',
        fn: async () => {
            const helpersPath = path.resolve(__dirname, '../../lib/session-init-helpers.cjs');
            delete require.cache[helpersPath];
            const { REFERENCE_DOC_CATALOG } = require(helpersPath);
            const repoRoot = path.resolve(__dirname, '../../../..');

            const templated = REFERENCE_DOC_CATALOG.filter(d => typeof d.templatePath === 'string' && d.templatePath.trim() !== '');
            assertTrue(templated.length > 0, 'At least one canonical doc declares a templatePath (non-vacuous)');

            for (const doc of templated) {
                const abs = path.isAbsolute(doc.templatePath) ? doc.templatePath : path.join(repoRoot, doc.templatePath);
                assertTrue(fs.existsSync(abs), `templatePath exists for ${doc.filename}: ${doc.templatePath}`);
                assertTrue(fs.statSync(abs).isFile(), `templatePath is a file for ${doc.filename}: ${doc.templatePath}`);
            }

            delete require.cache[helpersPath];
        }
    },
    {
        name: '[init-reference-docs] custom generic and manual scan ownership is preserved by the shared resolver',
        fn: async () => {
            const helpersPath = path.resolve(__dirname, '../../lib/session-init-helpers.cjs');
            delete require.cache[helpersPath];
            const {
                mergeReferenceDocs,
                getReferenceDocScanTarget,
                getReferenceDocScanSkill
            } = require(helpersPath);

            const [generic, manual] = mergeReferenceDocs([
                { filename: 'guides/architecture.md', purpose: 'Architecture evidence', scanTarget: 'generic' },
                { filename: 'guides/operations.md', purpose: 'Curated operations guide' }
            ]);
            assertEqual(generic.scanTarget, 'generic', 'The custom generic target survives normalization');
            assertEqual(getReferenceDocScanTarget(generic).kind, 'generic', 'Generic docs have a generic scan owner');
            assertEqual(
                getReferenceDocScanSkill(generic),
                'scan --target=generic-reference-doc --filename="guides/architecture.md"',
                'The generated scan command selects the exact custom filename'
            );
            assertEqual(getReferenceDocScanTarget(manual).kind, 'manual', 'Custom docs without a target stay manually owned');
            assertEqual(getReferenceDocScanSkill(manual), null, 'Manual docs do not claim an automated scan');
            assertEqual(
                getReferenceDocScanTarget('e2e-test-reference.md').kind,
                'built-in',
                'Built-in target inference remains exact-filename based'
            );
            assertEqual(
                getReferenceDocScanTarget('custom/e2e-test-reference.md').kind,
                'manual',
                'A custom path ending in a built-in basename is not misclassified'
            );
            delete require.cache[helpersPath];
        }
    },
    {
        name: '[init-reference-docs] freshness tracks selected generic docs and excludes manual docs',
        fn: async () => {
            const tmpDir = createTempProjectDir();
            const docsDir = path.join(tmpDir, 'docs');
            const referenceDir = path.join(docsDir, 'project-reference');
            fs.mkdirSync(referenceDir, { recursive: true });
            fs.writeFileSync(path.join(docsDir, 'project-config.json'), JSON.stringify({
                project: { name: 'Freshness Fixture' },
                referenceDocs: [
                    { filename: 'guides/architecture.md', purpose: 'Repository architecture', scanTarget: 'generic' },
                    { filename: 'guides/operations.md', purpose: 'Curated operator notes' }
                ]
            }));
            fs.mkdirSync(path.join(referenceDir, 'guides'), { recursive: true });
            fs.writeFileSync(path.join(referenceDir, 'guides', 'architecture.md'), '# Architecture\n\n<!-- Last scanned: 2000-01-01 -->\n', 'utf8');
            fs.writeFileSync(path.join(referenceDir, 'guides', 'operations.md'), '# Operations\n\n<!-- Last scanned: 2000-01-01 -->\n', 'utf8');

            const helperPath = path.resolve(__dirname, '../../lib/session-init-helpers.cjs');
            const loaderPath = path.resolve(__dirname, '../../lib/project-config-loader.cjs');
            const configLoaderPath = path.resolve(__dirname, '../../lib/ck-config-loader.cjs');
            const pathHelpersPath = path.resolve(__dirname, '../../lib/ck-paths.cjs');
            const projectRootPath = path.resolve(__dirname, '../../lib/project-root.cjs');
            const previousRoot = process.env.CLAUDE_PROJECT_DIR;
            process.env.CLAUDE_PROJECT_DIR = tmpDir;
            for (const modulePath of [helperPath, loaderPath, configLoaderPath, pathHelpersPath, projectRootPath]) {
                delete require.cache[modulePath];
            }
            try {
                const { getStaleReferenceDocs } = require(helperPath);
                const stale = getStaleReferenceDocs(60);
                assertEqual(stale.length, 1, 'Only the selected, automatically scannable reference is freshness-tracked');
                assertEqual(stale[0].filename, 'guides/architecture.md', 'The nested generic filename remains exact');
                assertEqual(
                    stale[0].scanSkill,
                    'scan --target=generic-reference-doc --filename="guides/architecture.md"',
                    'The stale notice points to the exact generic scan command'
                );
            } finally {
                if (previousRoot === undefined) delete process.env.CLAUDE_PROJECT_DIR;
                else process.env.CLAUDE_PROJECT_DIR = previousRoot;
                for (const modulePath of [helperPath, loaderPath, configLoaderPath, pathHelpersPath, projectRootPath]) {
                    delete require.cache[modulePath];
                }
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        // TestSpec: TC-PCI-032
        name: '[init-reference-docs] TC-PCI-032 freshness never reports a reference the project declares not applicable',
        fn: async () => {
            const tmpDir = createTempProjectDir();
            const docsDir = path.join(tmpDir, 'docs');
            const referenceDir = path.join(docsDir, 'project-reference');
            fs.mkdirSync(path.join(referenceDir, 'guides'), { recursive: true });
            // Given five old references: three declared not applicable, one per supported form, and two that apply
            const referenceDocs = [
                { filename: 'backend-patterns-reference.md', purpose: 'Backend coding patterns (N/A for this project)' },
                { filename: 'frontend-patterns-reference.md', purpose: 'Frontend coding patterns', notApplicable: true },
                { filename: 'guides/retired.md', purpose: 'Not applicable: retired stack', scanTarget: 'generic' },
                { filename: 'project-structure-reference.md', purpose: 'Structure; mocks are not applicable here' },
                { filename: 'guides/architecture.md', purpose: 'Repository architecture', scanTarget: 'generic' }
            ];
            fs.writeFileSync(path.join(docsDir, 'project-config.json'), JSON.stringify({
                project: { name: 'Applicability Fixture' },
                referenceDocs
            }));
            for (const doc of referenceDocs) {
                fs.writeFileSync(path.join(referenceDir, ...doc.filename.split('/')), '# Reference\n\n<!-- Last scanned: 2000-01-01 -->\n', 'utf8');
            }

            const helperPath = path.resolve(__dirname, '../../lib/session-init-helpers.cjs');
            const loaderPath = path.resolve(__dirname, '../../lib/project-config-loader.cjs');
            const configLoaderPath = path.resolve(__dirname, '../../lib/ck-config-loader.cjs');
            const pathHelpersPath = path.resolve(__dirname, '../../lib/ck-paths.cjs');
            const projectRootPath = path.resolve(__dirname, '../../lib/project-root.cjs');
            const buildersPath = path.resolve(__dirname, '../../../skills/ai-context-refresh/scripts/section-builders.cjs');
            const previousRoot = process.env.CLAUDE_PROJECT_DIR;
            process.env.CLAUDE_PROJECT_DIR = tmpDir;
            for (const modulePath of [helperPath, loaderPath, configLoaderPath, pathHelpersPath, projectRootPath]) {
                delete require.cache[modulePath];
            }
            try {
                const helpers = require(helperPath);
                // When freshness is assessed
                const stale = helpers.getStaleReferenceDocs(60).map(doc => doc.filename);
                // Then only the references that apply are reported; a passing mention is not a declaration
                assertEqual(
                    stale.join(', '),
                    'project-structure-reference.md, guides/architecture.md',
                    'A declared not-applicable reference is never reported as old'
                );
                // And the root-context builder reads the declaration the same way: two readers, one rule
                const { declaresNotApplicable } = require(buildersPath);
                for (const doc of referenceDocs) {
                    assertEqual(
                        helpers.isReferenceDocNotApplicable(doc),
                        declaresNotApplicable(doc),
                        `${doc.filename}: the freshness check and the root-context builder agree`
                    );
                }
                // And each supported way to write the declaration reads the same in both, with its boundaries:
                // leading or inner spaces still declare, a longer word that merely starts the same does not
                const forms = [
                    ['N/A — stack not used', true],
                    ['  N/A for this project', true],
                    ['Patterns (not applicable to this project)', true],
                    ['Patterns ( N/A here)', true],
                    ['N/Along the way', false],
                    ['Patterns (not applicableness)', false]
                ];
                for (const [purpose, expected] of forms) {
                    assertEqual(helpers.isReferenceDocNotApplicable({ purpose }), expected, `freshness check reads "${purpose}"`);
                    assertEqual(declaresNotApplicable({ purpose }), expected, `root-context builder reads "${purpose}"`);
                }
            } finally {
                if (previousRoot === undefined) delete process.env.CLAUDE_PROJECT_DIR;
                else process.env.CLAUDE_PROJECT_DIR = previousRoot;
                for (const modulePath of [helperPath, loaderPath, configLoaderPath, pathHelpersPath, projectRootPath]) {
                    delete require.cache[modulePath];
                }
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[init-reference-docs] reference paths reject traversal and symlink escapes',
        fn: async () => {
            const assert = require('node:assert/strict');
            const registry = require('../../lib/project-reference-registry.cjs');
            const projectRoot = createTempDir();
            const outsideRoot = createTempDir();
            const referenceRoot = path.join(projectRoot, 'docs', 'project-reference');
            fs.mkdirSync(referenceRoot, { recursive: true });
            try {
                const safe = registry.resolveContainedPath(referenceRoot, 'nested/guide.md', { projectRoot });
                assertEqual(safe, path.join(referenceRoot, 'nested', 'guide.md'), 'A safe nested output stays below the configured root');
                assert.throws(
                    () => registry.resolveContainedPath(referenceRoot, '../outside.md', { projectRoot }),
                    /empty, dot, and traversal|escapes/i,
                    'Lexical traversal is rejected'
                );

                const outsideFile = path.join(outsideRoot, 'secret.md');
                fs.writeFileSync(outsideFile, 'outside', 'utf8');
                const link = path.join(referenceRoot, 'escape');
                const directoryLinkType = process.platform === 'win32' ? 'junction' : 'dir';
                fs.symlinkSync(outsideRoot, link, directoryLinkType);
                assert.throws(
                    () => registry.resolveContainedPath(referenceRoot, 'escape/secret.md', { projectRoot }),
                    /outside its configured root|outside the adopting project/i,
                    'A symlink to an external directory is rejected before a read or write'
                );

                const templateLink = path.join(projectRoot, 'external-template');
                fs.symlinkSync(outsideRoot, templateLink, directoryLinkType);
                assert.throws(
                    () => registry.resolveContainedPath(projectRoot, 'external-template/secret.md', { projectRoot }),
                    /outside its configured root|outside the adopting project/i,
                    'A project-relative template symlink cannot escape the project root'
                );

                const referenceRootLink = path.join(projectRoot, 'external-reference-root');
                fs.symlinkSync(outsideRoot, referenceRootLink, directoryLinkType);
                assert.throws(
                    () => registry.resolveContainedPath(referenceRootLink, 'secret.md', { projectRoot }),
                    /outside its configured root|outside the adopting project/i,
                    'A configured reference-root symlink cannot redirect writes outside the project'
                );
            } finally {
                cleanupTempDir(projectRoot);
                cleanupTempDir(outsideRoot);
            }
        }
    }
];

// ============================================================================
// Integration Tests: hook execution via stdin
// ============================================================================

const integrationTests = [
    {
        name: '[init-reference-docs] creates missing docs in docs/project-reference/',
        fn: async () => {
            const tmpDir = createTempProjectDir();
            try {
                // Create project-config.json with two manual docs and one generic nested doc
                const docsDir = path.join(tmpDir, 'docs');
                fs.mkdirSync(docsDir, { recursive: true });
                fs.writeFileSync(
                    path.join(docsDir, 'project-config.json'),
                    JSON.stringify({
                        project: { name: 'Fixture' },
                        referenceDocs: [
                            { filename: 'my-guide.md', purpose: 'My guide', sections: ['Intro'] },
                            { filename: 'my-rules.md', purpose: 'My rules', sections: ['Rule 1', 'Rule 2'] },
                            { filename: 'guides/architecture.md', purpose: 'Architecture evidence', sections: ['Boundaries'], scanTarget: 'generic' }
                        ]
                    })
                );

                const input = createUserPromptInput('hello');
                const result = await runHook(HOOK_PATH, input, {
                    cwd: tmpDir,
                    env: { CLAUDE_PROJECT_DIR: tmpDir }
                });

                assertAllowed(result.code);

                // Verify files created in docs/project-reference/ (not docs/)
                const refDir = path.join(docsDir, 'project-reference');
                assertTrue(fs.existsSync(path.join(refDir, 'my-guide.md')), 'my-guide.md created in project-reference/');
                assertTrue(fs.existsSync(path.join(refDir, 'my-rules.md')), 'my-rules.md created in project-reference/');
                assertTrue(fs.existsSync(path.join(refDir, 'guides', 'architecture.md')), 'nested generic doc created beneath the configured project-reference root');
                assertTrue(!fs.existsSync(path.join(refDir, 'project-structure-reference.md')), 'Unselected portable defaults are not scaffolded');
                // Verify NOT in docs/ root
                assertTrue(!fs.existsSync(path.join(docsDir, 'my-guide.md')), 'my-guide.md NOT in docs/ root');

                // Verify content
                const content = fs.readFileSync(path.join(refDir, 'my-rules.md'), 'utf-8');
                assertContains(content, '## Rule 1', 'Has first section');
                assertContains(content, '## Rule 2', 'Has second section');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[init-reference-docs] honors configured project config and docs index paths',
        fn: async () => {
            const tmpDir = createTempProjectDir();
            try {
                const ckConfigPath = path.join(tmpDir, '.claude', '.ck.json');
                fs.mkdirSync(path.dirname(ckConfigPath), { recursive: true });
                fs.writeFileSync(
                    ckConfigPath,
                    JSON.stringify({
                        portability: {
                            projectConfigPath: 'config/project-config.json',
                            docsIndexPath: 'knowledge/reference/project-context-index.md'
                        }
                    })
                );
                const configuredConfigPath = path.join(tmpDir, 'config', 'project-config.json');
                fs.mkdirSync(path.dirname(configuredConfigPath), { recursive: true });
                fs.writeFileSync(configuredConfigPath, JSON.stringify({ project: { name: 'Fixture' } }));

                const input = createUserPromptInput('hello');
                const result = await runHook(HOOK_PATH, input, {
                    cwd: tmpDir,
                    env: { CLAUDE_PROJECT_DIR: tmpDir }
                });

                assertAllowed(result.code);

                assertTrue(fs.existsSync(configuredConfigPath), 'Configured project config is present and consumed');
                assertTrue(!fs.existsSync(path.join(tmpDir, 'docs', 'project-config.json')), 'Default project config path not created');
                assertTrue(
                    fs.existsSync(path.join(tmpDir, 'knowledge', 'reference', 'project-context-index.md')),
                    'Always-on docs index is created at the exact configured owner path'
                );
                assertTrue(fs.existsSync(path.join(tmpDir, 'knowledge', 'reference', 'lessons.md')), 'Always-on lessons are created beside the configured docs index');
                assertTrue(!fs.existsSync(path.join(tmpDir, 'knowledge', 'reference', 'docs-index-reference.md')), 'No default index filename is created beside a configured custom index');
                assertTrue(!fs.existsSync(path.join(tmpDir, 'knowledge', 'reference', 'project-structure-reference.md')), 'No task-specific docs are inferred from project identity alone');
                assertTrue(!fs.existsSync(path.join(tmpDir, 'docs', 'project-reference')), 'Default reference docs directory not created');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[init-reference-docs] honors explicit empty selection with optional designSystem omitted',
        fn: async () => {
            const tmpDir = createTempProjectDir();
            try {
                const docsDir = path.join(tmpDir, 'docs');
                fs.mkdirSync(docsDir, { recursive: true });
                fs.writeFileSync(path.join(docsDir, 'project-config.json'), JSON.stringify({
                    project: { name: 'Fixture' },
                    referenceDocs: []
                }));

                const input = createUserPromptInput('hello');
                const result = await runHook(HOOK_PATH, input, {
                    cwd: tmpDir,
                    env: { CLAUDE_PROJECT_DIR: tmpDir }
                });

                assertAllowed(result.code);
                const refDir = path.join(docsDir, 'project-reference');
                assertTrue(fs.existsSync(refDir), 'Always-on project-context docs directory is initialized');
                assertEqual(
                    JSON.stringify(fs.readdirSync(refDir).sort()),
                    JSON.stringify(['docs-index-reference.md', 'lessons.md']),
                    'Explicit empty selection creates only the independently-owned always-on docs'
                );
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[init-reference-docs] skips existing files (idempotent)',
        fn: async () => {
            const tmpDir = createTempProjectDir();
            try {
                const docsDir = path.join(tmpDir, 'docs');
                const refDir = path.join(docsDir, 'project-reference');
                fs.mkdirSync(refDir, { recursive: true });
                fs.writeFileSync(
                    path.join(docsDir, 'project-config.json'),
                    JSON.stringify({
                        project: { name: 'Fixture' },
                        referenceDocs: [{ filename: 'existing.md', purpose: 'Already exists', sections: ['A'] }]
                    })
                );

                // Pre-create the file in project-reference/ with custom content
                const existingContent = '# My Custom Content\nDo not overwrite!\n';
                fs.writeFileSync(path.join(refDir, 'existing.md'), existingContent);

                const input = createUserPromptInput('hello');
                const result = await runHook(HOOK_PATH, input, {
                    cwd: tmpDir,
                    env: { CLAUDE_PROJECT_DIR: tmpDir }
                });

                assertAllowed(result.code);

                // Verify content unchanged
                const content = fs.readFileSync(path.join(refDir, 'existing.md'), 'utf-8');
                assertEqual(content, existingContent, 'File content unchanged');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[init-reference-docs] absent selection creates always-on inputs and no unsupported capability docs',
        fn: async () => {
            const tmpDir = createTempProjectDir();
            try {
                const docsDir = path.join(tmpDir, 'docs');
                fs.mkdirSync(docsDir, { recursive: true });
                // Config exists but has no referenceDocs section
                fs.writeFileSync(
                    path.join(docsDir, 'project-config.json'),
                    JSON.stringify({
                        project: { name: 'TestProject' }
                    })
                );

                const input = createUserPromptInput('hello');
                const result = await runHook(HOOK_PATH, input, {
                    cwd: tmpDir,
                    env: { CLAUDE_PROJECT_DIR: tmpDir }
                });

                assertAllowed(result.code);

                // A name-only config has no stack/capability evidence. The project-context
                // owners are still materialized independently of that empty selection.
                const refDir = path.join(docsDir, 'project-reference');
                assertTrue(fs.existsSync(path.join(refDir, 'docs-index-reference.md')), 'docs-index-reference.md is always materialized');
                assertTrue(fs.existsSync(path.join(refDir, 'lessons.md')), 'lessons.md is always materialized');
                for (const filename of [
                    'backend-patterns-reference.md',
                    'frontend-patterns-reference.md',
                    'integration-test-reference.md',
                    'performance-test-reference.md',
                    'e2e-test-reference.md',
                    'scss-styling-guide.md',
                    'feature-spec-reference.md'
                ]) {
                    assertTrue(!fs.existsSync(path.join(refDir, filename)), `${filename} is not inferred from a name-only config`);
                }
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[init-reference-docs] copies spec-principles from template when explicitly selected',
        fn: async () => {
            const tmpDir = createTempProjectDir();
            try {
                const docsDir = path.join(tmpDir, 'docs');
                fs.mkdirSync(docsDir, { recursive: true });
                fs.writeFileSync(
                    path.join(docsDir, 'project-config.json'),
                    JSON.stringify({
                        project: { name: 'TemplateTestProject' },
                        referenceDocs: [{ filename: 'spec-principles.md', purpose: 'Spec quality guidance' }]
                    })
                );

                const templatePath = path.join(tmpDir, '.claude', 'templates', 'reference-docs', 'spec-principles.md');
                fs.mkdirSync(path.dirname(templatePath), { recursive: true });
                fs.writeFileSync(templatePath, '# Spec Principles Template\n\nCustom template content.\n', 'utf-8');

                const input = createUserPromptInput('hello');
                const result = await runHook(HOOK_PATH, input, {
                    cwd: tmpDir,
                    env: { CLAUDE_PROJECT_DIR: tmpDir }
                });

                assertAllowed(result.code);

                const refFile = path.join(docsDir, 'project-reference', 'spec-principles.md');
                assertTrue(fs.existsSync(refFile), 'Selected spec-principles.md is materialized');
                const content = fs.readFileSync(refFile, 'utf-8');
                assertContains(content, '# Spec Principles Template', 'Template title copied');
                assertContains(content, 'Custom template content.', 'Template content copied');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[init-reference-docs] copies seed-test-data-reference from template when explicitly selected',
        fn: async () => {
            const tmpDir = createTempProjectDir();
            try {
                const docsDir = path.join(tmpDir, 'docs');
                fs.mkdirSync(docsDir, { recursive: true });
                fs.writeFileSync(
                    path.join(docsDir, 'project-config.json'),
                    JSON.stringify({
                        project: { name: 'SeedTemplateTestProject' },
                        referenceDocs: [{ filename: 'seed-test-data-reference.md', purpose: 'Seed data patterns' }]
                    })
                );

                const templatePath = path.join(tmpDir, '.claude', 'templates', 'reference-docs', 'seed-test-data-reference.md');
                fs.mkdirSync(path.dirname(templatePath), { recursive: true });
                fs.writeFileSync(templatePath, '# Seed Template\n\nSeed template content.\n', 'utf-8');

                const input = createUserPromptInput('hello');
                const result = await runHook(HOOK_PATH, input, {
                    cwd: tmpDir,
                    env: { CLAUDE_PROJECT_DIR: tmpDir }
                });

                assertAllowed(result.code);

                const refFile = path.join(docsDir, 'project-reference', 'seed-test-data-reference.md');
                assertTrue(fs.existsSync(refFile), 'Selected seed-test-data-reference.md is materialized');
                const content = fs.readFileSync(refFile, 'utf-8');
                assertContains(content, '# Seed Template', 'Template title copied');
                assertContains(content, 'Seed template content.', 'Template content copied');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        // Technical contract: relocated project preferences materialize once and user edits survive reinitialization.
        name: '[init-reference-docs] performance template respects relocated roots and preserves local preferences',
        fn: async () => {
            const tmpDir = createTempProjectDir();
            try {
                const docsDir = path.join(tmpDir, 'docs');
                fs.mkdirSync(docsDir, { recursive: true });
                fs.writeFileSync(path.join(docsDir, 'project-config.json'), JSON.stringify({
                    project: { name: 'Performance template fixture' },
                    docsRoots: { projectReference: { path: 'handbook/reference' } },
                    referenceDocs: [{ filename: 'performance-test-reference.md', purpose: 'Performance preferences' }]
                }));
                const template = path.join(tmpDir, '.claude', 'templates', 'reference-docs', 'performance-test-reference.md');
                fs.mkdirSync(path.dirname(template), { recursive: true });
                // Use the shipped scaffold, so its sentinel cannot drift behind a synthetic fixture.
                fs.copyFileSync(path.resolve(__dirname, '../../../templates/reference-docs/performance-test-reference.md'), template);
                const options = { cwd: tmpDir, env: {
                    CLAUDE_PROJECT_DIR: tmpDir, CK_FRAMEWORK_MODE: 'on', HOME: tmpDir, USERPROFILE: tmpDir,
                    TMPDIR: tmpDir, TEMP: tmpDir, TMP: tmpDir
                } };
                const input = createUserPromptInput('initialize selected references');
                assertAllowed((await runHook(HOOK_PATH, input, options)).code);
                const output = path.join(tmpDir, 'handbook', 'reference', 'performance-test-reference.md');
                const { isPlaceholderFile } = require('../../lib/session-init-helpers.cjs');
                assertEqual(fs.readFileSync(output, 'utf8'), fs.readFileSync(template, 'utf8'));
                assertEqual(isPlaceholderFile(output), true, 'Copied performance scaffold remains recognizable for project authoring');
                assertTrue(!fs.existsSync(path.join(docsDir, 'project-reference', 'performance-test-reference.md')));
                fs.writeFileSync(output, '# Project preferences\n\nKeep the accepted latency budget.\n');
                assertEqual(isPlaceholderFile(output), false, 'Authored preferences are not a scaffold');
                assertAllowed((await runHook(HOOK_PATH, input, options)).code);
                assertEqual(fs.readFileSync(output, 'utf8'), '# Project preferences\n\nKeep the accepted latency budget.\n');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[init-reference-docs] creates docs/project-reference/ directory if missing',
        fn: async () => {
            const tmpDir = createTempProjectDir();
            try {
                // No docs/ dir; the required config lives at a separately configured path.
                const ckConfigPath = path.join(tmpDir, '.claude', '.ck.json');
                fs.writeFileSync(ckConfigPath, JSON.stringify({
                    portability: { projectConfigPath: 'config/project-config.json' }
                }));
                const configPath = path.join(tmpDir, 'config', 'project-config.json');
                fs.mkdirSync(path.dirname(configPath), { recursive: true });
                fs.writeFileSync(configPath, JSON.stringify({ project: { name: 'Fixture' } }));

                const input = createUserPromptInput('hello');
                const result = await runHook(HOOK_PATH, input, {
                    cwd: tmpDir,
                    env: { CLAUDE_PROJECT_DIR: tmpDir }
                });

                assertAllowed(result.code);
                assertTrue(fs.existsSync(path.join(tmpDir, 'docs')), 'docs/ directory created');
                assertTrue(fs.existsSync(path.join(tmpDir, 'docs', 'project-reference')), 'docs/project-reference/ directory created');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[init-reference-docs] handles empty stdin gracefully',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                fs.mkdirSync(path.join(tmpDir, '.claude'));
                const result = await runHook(HOOK_PATH, '', {
                    cwd: tmpDir,
                    env: { CLAUDE_PROJECT_DIR: tmpDir }
                });
                assertAllowed(result.code, 'Should exit 0 on empty stdin');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[init-reference-docs] skips file creation in empty projects (no content dirs)',
        fn: async () => {
            const tmpDir = createTempDir(); // No src/ — empty project
            try {
                fs.mkdirSync(path.join(tmpDir, '.claude'));
                const input = createUserPromptInput('hello');
                const result = await runHook(HOOK_PATH, input, {
                    cwd: tmpDir,
                    env: { CLAUDE_PROJECT_DIR: tmpDir }
                });

                assertAllowed(result.code);
                // No docs should be created in empty project
                assertTrue(!fs.existsSync(path.join(tmpDir, 'docs', 'project-reference')), 'No project-reference/ in empty project');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    }
];

// Export test suite
module.exports = {
    name: 'Init Reference Docs Hook',
    tests: [...unitTests, ...integrationTests]
};
