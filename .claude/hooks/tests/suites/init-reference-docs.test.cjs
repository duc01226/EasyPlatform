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
        // Canonical-floor merge (root-cause fix): config extras are APPENDED to the
        // canonical set, never used to REPLACE it. Previously a non-empty config
        // fully overrode DEFAULT_REFERENCE_DOCS — that silent suppression was the bug.
        name: '[init-reference-docs] getReferenceDocs merges project-config extras onto canonical floor',
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
                    const { getReferenceDocs, DEFAULT_REFERENCE_DOCS } = require(modulePath);
                    const docs = getReferenceDocs();
                    const names = docs.map(d => d.filename);
                    assertEqual(docs.length, DEFAULT_REFERENCE_DOCS.length + 2, 'Canonical floor + 2 extras');
                    assertEqual(docs[0].filename, 'project-structure-reference.md', 'Canonical docs come first, in canonical order');
                    // Every canonical doc is still present — config can never suppress the floor.
                    for (const canon of DEFAULT_REFERENCE_DOCS) {
                        assertTrue(names.includes(canon.filename), `Canonical doc preserved: ${canon.filename}`);
                    }
                    // Project-specific extras are appended after the canonical block.
                    assertEqual(names[names.length - 2], 'custom-guide.md', 'First extra appended after canonical block');
                    assertEqual(names[names.length - 1], 'api-docs.md', 'Second extra appended after canonical block');
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
        // Defense-in-depth: a partial/legacy config (the exact drift shape) must NOT
        // suppress canonical docs, and a legacy filename must collapse onto its
        // canonical target without producing a duplicate.
        name: '[init-reference-docs] mergeReferenceDocs enforces canonical floor and absorbs legacy aliases',
        fn: async () => {
            const helpersPath = path.resolve(__dirname, '../../lib/session-init-helpers.cjs');
            delete require.cache[helpersPath];
            const { mergeReferenceDocs, DEFAULT_REFERENCE_DOCS } = require(helpersPath);

            // Drifted config: only 2 canonical entries, one of them the LEGACY name.
            const merged = mergeReferenceDocs([
                { filename: 'feature-docs-reference.md', purpose: 'Legacy feature docs', sections: [] },
                { filename: 'backend-patterns-reference.md', purpose: 'Project backend', sections: ['X'] }
            ]);
            const names = merged.map(d => d.filename);

            assertEqual(merged.length, DEFAULT_REFERENCE_DOCS.length, 'No suppression and no duplicate — exactly the canonical floor');
            assertTrue(!names.includes('feature-docs-reference.md'), 'Legacy filename absorbed, not emitted');
            assertTrue(names.includes('feature-spec-reference.md'), 'Legacy resolved to canonical target');
            assertEqual(names.filter(n => n === 'feature-spec-reference.md').length, 1, 'Canonical target appears exactly once');

            // Config override applies to purpose/sections of the matched canonical doc...
            const backend = merged.find(d => d.filename === 'backend-patterns-reference.md');
            assertEqual(backend.purpose, 'Project backend', 'Config purpose override honored');
            assertEqual(JSON.stringify(backend.sections), JSON.stringify(['X']), 'Config sections override honored');

            // ...but the canonical templatePath stays authoritative (config cannot repoint it).
            const featureSpec = merged.find(d => d.filename === 'feature-spec-reference.md');
            assertEqual(featureSpec.templatePath, '.claude/templates/reference-docs/feature-spec-reference.md', 'Canonical templatePath preserved');

            delete require.cache[helpersPath];
        }
    },
    {
        name: '[init-reference-docs] normalizeReferenceDocs reports renames, additions, and removed legacy entries',
        fn: async () => {
            const helpersPath = path.resolve(__dirname, '../../lib/session-init-helpers.cjs');
            delete require.cache[helpersPath];
            const { normalizeReferenceDocs, DEFAULT_REFERENCE_DOCS } = require(helpersPath);

            const result = normalizeReferenceDocs([
                { filename: 'feature-docs-reference.md', purpose: 'Legacy', sections: [] },
                { filename: 'project-structure-reference.md', purpose: 'Struct', sections: [] }
            ]);

            assertEqual(result.changed, true, 'Drifted config flagged as changed');
            assertEqual(JSON.stringify(result.renames), JSON.stringify([{ from: 'feature-docs-reference.md', to: 'feature-spec-reference.md' }]), 'Legacy rename reported');
            assertEqual(JSON.stringify(result.removedLegacy), JSON.stringify(['feature-docs-reference.md']), 'Legacy entry flagged for removal');
            assertEqual(result.normalized.length, DEFAULT_REFERENCE_DOCS.length, 'Normalized to canonical floor');
            assertTrue(result.added.includes('seed-test-data-reference.md'), 'Missing canonical doc reported as added');
            assertTrue(!result.added.includes('feature-spec-reference.md'), 'Alias target already satisfied — not double-counted as added');

            // Idempotency: normalizing the canonical set reports no change.
            const stable = normalizeReferenceDocs(DEFAULT_REFERENCE_DOCS);
            assertEqual(stable.changed, false, 'Canonical config is stable (idempotent)');
            assertEqual(stable.renames.length, 0, 'No renames on canonical config');
            assertEqual(stable.added.length, 0, 'No additions on canonical config');

            delete require.cache[helpersPath];
        }
    },
    {
        // Alias-collision: a config carrying BOTH the legacy name AND its canonical target must
        // collapse to exactly one canonical doc regardless of entry order, and the canonical-named
        // entry's overrides must win over the legacy alias (the legacy entry never wins or duplicates).
        name: '[init-reference-docs] mergeReferenceDocs collapses legacy+canonical collision to one canonical doc (both orderings)',
        fn: async () => {
            const helpersPath = path.resolve(__dirname, '../../lib/session-init-helpers.cjs');
            delete require.cache[helpersPath];
            const { mergeReferenceDocs, DEFAULT_REFERENCE_DOCS } = require(helpersPath);

            const legacy = { filename: 'feature-docs-reference.md', purpose: 'LEGACY purpose', sections: ['legacy'] };
            const canonical = { filename: 'feature-spec-reference.md', purpose: 'CANONICAL purpose', sections: ['canonical'] };

            for (const [order, docs] of [['legacy-first', [legacy, canonical]], ['canonical-first', [canonical, legacy]]]) {
                const merged = mergeReferenceDocs(docs);
                const names = merged.map(d => d.filename);
                assertEqual(merged.length, DEFAULT_REFERENCE_DOCS.length, `${order}: no duplicate — exactly the canonical floor`);
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
        // Whitespace defense (MED-1/LOW-1 regression): a human-edited legacy entry with trailing
        // whitespace must still resolve to its canonical target — never leak to `extras` as a bogus
        // project doc — and normalizeReferenceDocs must report it as a rename for config repair.
        name: '[init-reference-docs] trailing-whitespace legacy filename resolves to canonical (no bogus extra)',
        fn: async () => {
            const helpersPath = path.resolve(__dirname, '../../lib/session-init-helpers.cjs');
            delete require.cache[helpersPath];
            const { mergeReferenceDocs, normalizeReferenceDocs, DEFAULT_REFERENCE_DOCS } = require(helpersPath);

            const merged = mergeReferenceDocs([{ filename: 'feature-docs-reference.md ', purpose: 'Legacy', sections: [] }]);
            const names = merged.map(d => d.filename);
            assertEqual(merged.length, DEFAULT_REFERENCE_DOCS.length, 'No bogus extra — exactly the canonical floor');
            assertTrue(names.includes('feature-spec-reference.md'), 'Whitespace legacy resolved to canonical target');
            assertTrue(!names.some(n => n.trim() === 'feature-docs-reference.md'), 'Legacy name (spaced or not) never emitted');

            const result = normalizeReferenceDocs([{ filename: 'feature-docs-reference.md ', purpose: 'Legacy', sections: [] }]);
            assertEqual(JSON.stringify(result.renames), JSON.stringify([{ from: 'feature-docs-reference.md', to: 'feature-spec-reference.md' }]), 'Whitespace legacy reported as rename (trimmed)');
            assertEqual(JSON.stringify(result.removedLegacy), JSON.stringify(['feature-docs-reference.md']), 'Whitespace legacy flagged for removal (trimmed)');

            delete require.cache[helpersPath];
        }
    },
    {
        // LOW-1 dedup: a duplicate legacy entry must NOT produce duplicate rename/removal
        // instructions to the repair skill (parity with mergeReferenceDocs' seenExtra dedup).
        name: '[init-reference-docs] normalizeReferenceDocs dedups duplicate legacy entries',
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

            delete require.cache[helpersPath];
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
                            docsIndexPath: 'knowledge/reference/docs-index-reference.md'
                        }
                    })
                );

                const input = createUserPromptInput('hello');
                const result = await runHook(HOOK_PATH, input, {
                    cwd: tmpDir,
                    env: { CLAUDE_PROJECT_DIR: tmpDir }
                });

                assertAllowed(result.code);

                assertTrue(fs.existsSync(path.join(tmpDir, 'config', 'project-config.json')), 'Configured project config created');
                assertTrue(!fs.existsSync(path.join(tmpDir, 'docs', 'project-config.json')), 'Default project config path not created');
                assertTrue(
                    fs.existsSync(path.join(tmpDir, 'knowledge', 'reference', 'project-structure-reference.md')),
                    'Default reference docs created under configured docs index directory'
                );
                assertTrue(!fs.existsSync(path.join(tmpDir, 'docs', 'project-reference')), 'Default reference docs directory not created');
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
        name: '[init-reference-docs] copies spec-principles from template when defaults are used',
        fn: async () => {
            const tmpDir = createTempProjectDir();
            try {
                const docsDir = path.join(tmpDir, 'docs');
                fs.mkdirSync(docsDir, { recursive: true });
                fs.writeFileSync(
                    path.join(docsDir, 'project-config.json'),
                    JSON.stringify({
                        project: { name: 'TemplateTestProject' }
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
                assertTrue(fs.existsSync(refFile), 'spec-principles.md created from defaults');
                const content = fs.readFileSync(refFile, 'utf-8');
                assertContains(content, '# Spec Principles Template', 'Template title copied');
                assertContains(content, 'Custom template content.', 'Template content copied');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[init-reference-docs] copies seed-test-data-reference from template when defaults are used',
        fn: async () => {
            const tmpDir = createTempProjectDir();
            try {
                const docsDir = path.join(tmpDir, 'docs');
                fs.mkdirSync(docsDir, { recursive: true });
                fs.writeFileSync(
                    path.join(docsDir, 'project-config.json'),
                    JSON.stringify({
                        project: { name: 'SeedTemplateTestProject' }
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
                assertTrue(fs.existsSync(refFile), 'seed-test-data-reference.md created from defaults');
                const content = fs.readFileSync(refFile, 'utf-8');
                assertContains(content, '# Seed Template', 'Template title copied');
                assertContains(content, 'Seed template content.', 'Template content copied');
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
