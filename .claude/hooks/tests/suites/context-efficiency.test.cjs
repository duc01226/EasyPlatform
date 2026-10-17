'use strict';
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const conventions = require('../../lib/file-conventions.cjs');
const builders = require('../../../skills/ai-context-refresh/scripts/section-builders.cjs');
const { projectContext } = require('../../../scripts/project-context.cjs');
const { validateConfig } = require('../../lib/project-config-schema.cjs');
const root = path.resolve(__dirname, '../../../..');
const config = {
    project: { name: 'Fixture' }, portability: { inlinePathRules: false },
    conventionInjection: { enabled: true, completeLookup: true, maxClassesPerEdit: 1, maxChars: 1000 },
    contextGroups: Array.from({ length: 14 }, (_, i) => ({ name: `group-${i}`, pathRegexes: [], pathGlobs: ['src/**'],
        priority: i, on: i === 0 ? 'read' : 'both',
        rules: [`rule-${i}:` + 'a'.repeat(1100) + '\ud83d\ude80'], referenceDocs: [`docs/guide-${i}.md`] }))
};

module.exports = { name: 'context-efficiency', tests: [
    { name: 'TC-PFCI-083 complete pre-action lookup retains all rules and references beyond automatic hook caps', fn() {
        assert.equal(validateConfig(config).valid, true);
        const result = conventions.lookup(config, 'src/example.js', { projectDir: root });
        assert.equal(result.entries.length, 14);
        assert.ok(result.pages.length > 1);
        for (const page of result.pages) assert.ok(page.length <= conventions.LOOKUP_PAGE_CHARS);
        const all = result.pages.join('\n');
        for (const group of config.contextGroups) {
            assert.ok(all.includes(group.rules[0]), `missing rule ${group.name}`);
            assert.ok(all.includes(group.referenceDocs[0]), `missing reference ${group.name}`);
            assert.equal(result.forms[group.name], 'full');
        }
        assert.match(result.pages[0], /REQUIRED.*--page 2/);
        assert.match(result.pages.at(-1), /Complete lookup finished/);
        assert.equal(conventions.lookup(config, 'src/example.js', { projectDir: root }).text, result.text, 'fresh/shell contexts need no ledger');
    } },
    { name: 'TC-PFCI-083 long rules page without truncation or broken Unicode', fn() {
        // An odd prefix forces a page boundary inside a surrogate pair; even prefixes can hide a broken guard.
        const long = { ...config, contextGroups: [{ name: 'long', pathGlobs: ['src/**'], rules: ['x' + '\ud83d\ude80'.repeat(12000)] }] };
        const pages = conventions.lookup(long, 'src/a.js', { projectDir: root }).pages;
        assert.ok(pages.length >= 3);
        assert.equal((pages.join('').match(/\ud83d\ude80/g) || []).length, 12000);
        for (const page of pages) {
            assert.ok(page.length <= conventions.LOOKUP_PAGE_CHARS);
            assert.doesNotMatch(page, /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/);
        }
    } },
    { name: 'TC-PFCI-083 root compaction requires a complete lookup or retains legacy fail-safe bodies', fn() {
        const compact = builders.buildGoldenRules(config, root);
        assert.match(compact, /Read ALL.*pages/i);
        assert.ok(!compact.includes(config.contextGroups[0].rules[0]));
        const fallback = builders.buildGoldenRules({ ...config, conventionInjection: { ...config.conventionInjection, completeLookup: false } }, root);
        for (const group of config.contextGroups) assert.ok(fallback.includes(group.rules[0]));
        const version = conventions.COMPLETE_LOOKUP_VERSION;
        try {
            conventions.COMPLETE_LOOKUP_VERSION = undefined;
            const olderRuntime = builders.buildGoldenRules(config, root);
            for (const group of config.contextGroups) assert.ok(olderRuntime.includes(group.rules[0]));
        } finally { conventions.COMPLETE_LOOKUP_VERSION = version; }
        assert.ok(!builders.buildSkillActivation(config, root).includes('guide-13.md'));
    } },
    { name: 'TC-PCI-001 scoped config validates unselected declarations and preserves exact reference selection', fn() {
        const valid = { state: 'valid', filePath: 'docs/project-config.json', config: { project: { name: 'Example' }, referenceDocs: [], testing: { commands: { check: 'node check.cjs' } } } };
        const base = projectContext(valid);
        assert.deepEqual(base.referenceDocs, []);
        assert.ok(!Object.hasOwn(base, 'testing'));
        assert.deepEqual(projectContext(valid, ['testing']).testing, valid.config.testing);
        assert.throws(() => projectContext(valid, ['absent']), /Undeclared/);
        assert.ok(!Object.hasOwn(projectContext({ state: 'missing', config: {} }), 'referenceDocs'));
        const malformed = { project: { name: 'Example' }, conventionInjection: { completeLookup: 'true' } };
        const validation = validateConfig(malformed);
        assert.equal(validation.valid, false);
        assert.throws(() => projectContext({ state: 'invalid', config: malformed, ...validation }), /Invalid project config/);
    } },
    { name: 'TC-PCI-001 literal-argv CLI resolves relocated config and rejects malformed unselected fields', fn() {
        const fixture = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'context-projection-')));
        try {
            fs.mkdirSync(path.join(fixture, '.claude'), { recursive: true });
            fs.mkdirSync(path.join(fixture, 'configuration'));
            fs.writeFileSync(path.join(fixture, '.claude/.ck.json'), JSON.stringify({ portability: { projectConfigPath: 'configuration/team.json' } }));
            const target = path.join(fixture, 'configuration/team.json');
            fs.writeFileSync(target, JSON.stringify({ project: { name: 'Relocated' }, referenceDocs: [], testing: { commands: {} } }));
            const run = () => spawnSync(process.execPath, [path.join(root, '.claude/scripts/project-context.cjs'), '--context'], { cwd: fixture, env: { ...process.env, CLAUDE_PROJECT_DIR: fixture, HOME: fixture, USERPROFILE: fixture }, encoding: 'utf8' });
            const valid = run();
            assert.equal(valid.status, 0, valid.stderr);
            assert.equal(JSON.parse(valid.stdout).project.name, 'Relocated');
            fs.writeFileSync(target, JSON.stringify({ project: { name: 'Relocated' }, conventionInjection: { completeLookup: 'true' } }));
            const invalid = run();
            assert.equal(invalid.status, 1);
            assert.equal(invalid.stdout, '');
            assert.match(invalid.stderr, /Invalid project config/);
        } finally { fs.rmSync(fixture, { recursive: true, force: true }); }
    } },
    { name: 'TC-PFCI-083 complete CLI retrieves later pages and refuses invalid paths or config instead of claiming no matches', fn() {
        const fixture = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'complete-lookup-')));
        try {
            fs.mkdirSync(path.join(fixture, '.claude'), { recursive: true });
            fs.mkdirSync(path.join(fixture, 'docs'));
            const target = path.join(fixture, 'docs/project-config.json');
            fs.writeFileSync(target, JSON.stringify(config));
            const run = args => spawnSync(process.execPath, [path.join(root, '.claude/hooks/lib/file-conventions.cjs'), '--lookup', ...args, '--complete', '--json'], { cwd: fixture, env: { ...process.env, CLAUDE_PROJECT_DIR: fixture, HOME: fixture, USERPROFILE: fixture }, encoding: 'utf8' });
            const first = run(['src/a.js']);
            assert.equal(first.status, 0, first.stderr);
            const parsed = JSON.parse(first.stdout);
            assert.equal(parsed.classes.length, config.contextGroups.length);
            let text = parsed.text;
            for (let page = 2; page <= parsed.totalPages; page++) {
                const next = run(['src/a.js', '--page', String(page)]);
                assert.equal(next.status, 0, next.stderr);
                text += JSON.parse(next.stdout).text;
            }
            for (const group of config.contextGroups) assert.ok(text.includes(group.rules[0]));
            assert.equal(run(['src/a.js', '--page', '999']).status, 2);
            assert.equal(run(['../outside.js']).status, 1);
            fs.writeFileSync(target, '{broken');
            const invalid = run(['src/a.js']);
            assert.equal(invalid.status, 1);
            assert.equal(invalid.stdout, '');
            assert.match(invalid.stderr, /requires valid config/);
        } finally { fs.rmSync(fixture, { recursive: true, force: true }); }
    } }
] };
