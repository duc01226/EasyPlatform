/**
 * Init Reference Docs Hook Test Suite
 *
 * Tests for session-init-docs.cjs:
 * - Config-driven doc list from project-config.json
 * - Fallback to defaults when config missing
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
 * Helper: create a temp dir that passes hasProjectContent() guard.
 * Creates a dummy 'src/' directory so the hook doesn't exit early.
 */
function createTempProjectDir() {
    const tmpDir = createTempDir();
    fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
    return tmpDir;
}

// ============================================================================
// Unit Tests: getReferenceDocs()
// ============================================================================

const unitTests = [
    {
        name: '[init-reference-docs] getReferenceDocs returns defaults when no config',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
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
                    assertEqual(docs.length, DEFAULT_REFERENCE_DOCS.length, 'Should return default docs count');
                    // Filenames no longer have project-reference/ prefix — base dir handles it
                    assertEqual(docs[0].filename, 'project-structure-reference.md', 'First doc is project-structure');
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
        name: '[init-reference-docs] getReferenceDocs reads from project-config.json',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const docsDir = path.join(tmpDir, 'docs');
                fs.mkdirSync(docsDir, { recursive: true });
                const config = {
                    referenceDocs: [
                        { filename: 'custom-guide.md', purpose: 'Custom guide', sections: ['Setup', 'Usage'] },
                        { filename: 'api-docs.md', purpose: 'API documentation', sections: ['Endpoints'] }
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
                    assertEqual(docs.length, 2, 'Should return 2 custom docs');
                    assertEqual(docs[0].filename, 'custom-guide.md', 'First custom doc');
                    assertEqual(docs[1].filename, 'api-docs.md', 'Second custom doc');
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
                // Create project-config.json with 2 custom docs
                const docsDir = path.join(tmpDir, 'docs');
                fs.mkdirSync(docsDir, { recursive: true });
                fs.writeFileSync(
                    path.join(docsDir, 'project-config.json'),
                    JSON.stringify({
                        referenceDocs: [
                            { filename: 'my-guide.md', purpose: 'My guide', sections: ['Intro'] },
                            { filename: 'my-rules.md', purpose: 'My rules', sections: ['Rule 1', 'Rule 2'] }
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
        name: '[init-reference-docs] falls back to defaults when no referenceDocs in config',
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

                // Verify default files created in docs/project-reference/
                const refDir = path.join(docsDir, 'project-reference');
                assertTrue(fs.existsSync(path.join(refDir, 'project-structure-reference.md')), 'Default doc created in project-reference/');
                assertTrue(fs.existsSync(path.join(refDir, 'lessons.md')), 'lessons.md created in project-reference/');
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
                // No docs/ dir, no config → defaults
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
