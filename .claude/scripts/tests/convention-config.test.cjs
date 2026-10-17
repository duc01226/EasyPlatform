'use strict';

/**
 * Real-configuration contract for the context-injection hooks.
 * Guards that the project's own settings actually work with the hooks that read them:
 * file-convention-inject (docs/project-config.json contextGroups + conventionInjection) and
 * prompt-ledger (.claude/.ck.json promptLedger). Fixture-driven behaviour is covered by the hook
 * suites; this file only proves the REAL settings validate, resolve, match and never re-deliver.
 * Optional project examples: docs/project-reference/convention-expectations.json.
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');

const HOOKS_DIR = path.resolve(__dirname, '..', '..', 'hooks');
const repoRoot = path.resolve(HOOKS_DIR, '..', '..');
const { validateConfig } = require(path.join(HOOKS_DIR, 'lib', 'project-config-schema.cjs'));
const { getConfiguredProjectConfigPath } = require(path.join(HOOKS_DIR, 'lib', 'project-config-loader.cjs'));
const conventions = require(path.join(HOOKS_DIR, 'lib', 'file-conventions.cjs'));
const merge = require(path.join(HOOKS_DIR, 'lib', 'convention-merge.cjs'));
const conventionHook = require(path.join(HOOKS_DIR, 'file-convention-inject.cjs'));
const promptHook = require(path.join(HOOKS_DIR, 'prompt-ledger.cjs'));
const promptStore = require(path.join(HOOKS_DIR, 'lib', 'prompt-ledger-store.cjs'));

function readJsonIfPresent(file) {
    try {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (error) {
        if (error?.code === 'ENOENT') return null;
        throw error;
    }
}

const realConfig = readJsonIfPresent(getConfiguredProjectConfigPath());
const expectations = readJsonIfPresent(path.join(repoRoot, 'docs', 'project-reference', 'convention-expectations.json'));
const conventionsOn = Boolean(realConfig) && conventions.isEnabled(realConfig);
const skipConventions = conventionsOn ? false : 'conventionInjection is not enabled in the project config';

const TAG_RE = /\[\[convention:([^@\]]+)@[0-9a-f]{8}\]\]/g;
const tagsOf = text => Array.from(String(text).matchAll(TAG_RE), m => m[1]);

function trackedFiles() {
    try {
        return execFileSync('git', ['ls-files'], { cwd: repoRoot, encoding: 'utf8', maxBuffer: 1 << 28 })
            .split('\n').filter(Boolean);
    } catch {
        return null;
    }
}

function withStore(fn) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'conv-config-test-'));
    return Promise.resolve()
        .then(() => fn(dir))
        .finally(() => fs.rmSync(dir, { recursive: true, force: true }));
}

test('TC-CONV-CONFIG-001: the real project config validates against the hook schema', { skip: realConfig ? false : 'no project config' }, () => {
    const result = validateConfig(realConfig);
    assert.deepEqual(result.errors, [], 'schema errors disable or corrupt hook behaviour');
    assert.equal(result.valid, true);
});

test('TC-CONV-CONFIG-002: enabled convention settings resolve as written and every class is well-formed', { skip: skipConventions }, () => {
    const raw = realConfig.conventionInjection;
    const settings = conventions.resolveSettings(realConfig);
    // An out-of-range value silently falls back to the default; a written value must survive resolution.
    for (const field of Object.keys(conventions.RANGES)) {
        if (raw[field] !== undefined) assert.equal(settings[field], raw[field], `conventionInjection.${field} is out of range and ignored`);
    }
    if (raw.onRead !== undefined) assert.equal(settings.onRead, raw.onRead);

    const entries = conventions.injectableEntries(realConfig);
    assert.ok(entries.length > 0, 'enabled injection with no deliverable class delivers nothing');

    const names = realConfig.contextGroups.filter(g => g && typeof g.name === 'string').map(g => g.name.trim().toLowerCase());
    assert.equal(new Set(names).size, names.length, 'duplicate class names: only the first is delivered');

    for (const { name, group, docs, skills } of entries) {
        for (const field of ['pathRegexes', 'fileNameRegexes', 'excludePathRegexes']) {
            for (const source of group[field] || []) {
                assert.doesNotThrow(() => new RegExp(source, 'i'), `${name}.${field} does not compile: ${source}`);
            }
        }
        for (const field of ['pathGlobs', 'excludePathGlobs']) {
            for (const glob of group[field] || []) assert.ok(conventions.globToRegExp(glob), `${name}.${field} invalid: ${glob}`);
        }
        // A content signal (regexes AND the extensions to scan) is an include matcher too, exactly as the runtime and the validator define it.
        const hasContentInclude = (group.contentRegexes || []).length > 0 && (group.contentExtensions || []).length > 0;
        const includes = ['pathRegexes', 'pathGlobs', 'fileNameRegexes'].some(f => (group[f] || []).length > 0) || hasContentInclude;
        assert.ok(includes, `${name} has no include matcher and can never match`);
        // Content regexes run over file text on every read of a matching file: each must compile and pass the shared safety lint.
        for (const source of group.contentRegexes || []) {
            assert.doesNotThrow(() => new RegExp(source, 'i'), `${name}.contentRegexes does not compile: ${source}`);
            assert.ok(conventions.isSafeContentRegex(source), `${name}.contentRegexes is unsafe (${conventions.contentRegexLintReason(source)}): ${source.slice(0, 60)}`);
        }
        for (const doc of docs) assert.ok(fs.existsSync(path.join(repoRoot, doc)), `${name} references a missing doc: ${doc}`);
        for (const skill of skills) {
            assert.ok(fs.existsSync(path.join(repoRoot, conventions.skillPath(skill))), `${name} references a missing skill: ${skill}`);
        }
    }
});

test('TC-CONV-CONFIG-003: every class matches at least one tracked file and renders without omission', { skip: skipConventions }, t => {
    const files = trackedFiles();
    if (!files) return t.skip('git unavailable');
    const settings = conventions.resolveSettings(realConfig);
    for (const entry of conventions.injectableEntries(realConfig)) {
        // The framework's AI-feature gate guards CONSUMER AI code; this repository tracks none (its own agent folders are
        // excluded by design), so that one class is proven on a representative AI-surface path instead of a tracked file.
        const representative = entry.name === conventions.AI_FEATURE_GATE.name ? 'src/prompts/sample.txt' : null;
        const sample = files.find(rel => conventions.groupMatches(entry.group, rel)) || representative;
        assert.ok(sample, `${entry.name} matches no tracked file (dead class)`);
        assert.ok(conventions.groupMatches(entry.group, sample), `${entry.name} does not match its sample ${sample}`);
        const matched = conventions.matchGroups(realConfig, [sample], settings);
        assert.ok(matched.length <= settings.maxClassesPerEdit);
        const { text, forms } = conventions.buildDigest(matched, [sample], settings, { projectDir: repoRoot });
        assert.ok(text.length <= settings.maxChars, `${sample}: digest exceeds maxChars`);
        assert.notEqual(forms[entry.name], 'omitted', `${entry.name} is squeezed out of the budget for ${sample}`);
    }
});

test('TC-CONV-CONFIG-004: project example paths receive exactly the expected classes', { skip: conventionsOn && expectations ? false : 'no enabled config or no convention-expectations.json' }, () => {
    for (const { path: rel, classes } of expectations.cases) {
        const result = conventions.lookup(realConfig, rel, { projectDir: repoRoot, cwd: repoRoot });
        assert.deepEqual(result.entries.map(e => e.name), classes, rel);
        // The digest names each class once — no repeated class section inside one reminder.
        assert.deepEqual(tagsOf(result.text), classes, `${rel}: class sections repeated or missing`);
    }
});

test('TC-CONV-CONFIG-005: auto-detection merge leaves the maintained classes untouched', { skip: skipConventions }, () => {
    const detected = merge.detectGroups(realConfig, { projectDir: repoRoot });
    const { groups, refreshed } = merge.mergeDetected(realConfig.contextGroups, detected);
    assert.deepEqual(refreshed, [], 'a merge would overwrite classes');
    assert.deepEqual(groups.slice(0, realConfig.contextGroups.length), realConfig.contextGroups);
});

test('TC-CONV-CONFIG-006: the hook never re-delivers a class still present; it re-arms only on compaction or distance', { skip: skipConventions }, async () => {
    const settings = conventions.resolveSettings(realConfig);
    const rel = (expectations?.cases || []).find(c => c.classes.length > 1)?.path;
    if (!rel) return;
    await withStore(async store => {
        const transcript = path.join(store, 'transcript.jsonl');
        fs.writeFileSync(transcript, '{"type":"user"}\n');
        let now = Date.now();
        const deps = () => ({ env: { CK_CONVENTIONS_DIR: path.join(store, 'ledger') }, config: realConfig, projectDir: repoRoot, now: (now += 1000), write: (text, done) => done(true), isDirectory: () => false });
        const edit = (file, extra = {}) => conventionHook.run({ hook_event_name: 'PostToolUse', tool_name: 'Edit', session_id: 's-1', transcript_path: transcript, cwd: repoRoot, tool_input: { file_path: path.join(repoRoot, file) }, tool_response: {}, ...extra }, deps());
        const delivered = async (file, extra) => {
            const out = await edit(file, extra);
            return out ? tagsOf(JSON.parse(out).hookSpecificOutput.additionalContext) : [];
        };
        const expected = conventions.lookup(realConfig, rel, { projectDir: repoRoot, cwd: repoRoot }).entries.map(e => e.name);

        assert.deepEqual(await delivered(rel), expected, 'first edit delivers every matching class once');
        assert.deepEqual(await delivered(rel), [], 'second edit in the same context is silent');
        const sibling = expectations.cases.find(c => c.path !== rel && c.classes.length && c.classes.every(n => expected.includes(n)));
        if (sibling) assert.deepEqual(await delivered(sibling.path), [], 'another file of the same classes is silent');
        assert.deepEqual(await delivered(rel, { agent_id: 'helper1' }), expected, 'a helper context has its own ledger');

        await conventionHook.run({ hook_event_name: 'SessionStart', source: 'compact', session_id: 's-1' }, deps());
        assert.deepEqual(await delivered(rel), expected, 'compaction re-arms delivery');
        assert.deepEqual(await delivered(rel), [], 'silent again after re-delivery');

        fs.truncateSync(transcript, fs.statSync(transcript).size + settings.reinjectAfterBytes);
        assert.deepEqual(await delivered(rel), expected, 'transcript distance re-arms delivery');
    });
});

test('TC-CONV-CONFIG-007: real prompt-ledger settings record every prompt but re-anchor only when absent', async () => {
    const settings = promptStore.resolveSettings(promptStore.loadRawSettings(repoRoot), {});
    if (!settings.enabled) return;
    await withStore(async store => {
        const transcript = path.join(store, 'transcript.jsonl');
        fs.writeFileSync(transcript, '{"type":"user"}\n');
        let now = Date.now();
        const submit = text => promptHook.run(
            { hook_event_name: 'UserPromptSubmit', session_id: 's-1', transcript_path: transcript, cwd: repoRoot, prompt: text },
            { env: { CK_PROMPT_LEDGER_DIR: store }, projectDir: repoRoot, now: (now += 1000), write: (t, done) => done(true) }
        );
        assert.notEqual(await submit('first goal'), '', 'original goal is pinned');
        assert.equal(await submit('second prompt'), '', 'reminder still present: no duplicate');
        fs.truncateSync(transcript, fs.statSync(transcript).size + settings.reinjectAfterBytes);
        assert.notEqual(await submit('third prompt'), '', 'distance re-arms the reminder');
        assert.equal(promptStore.readLedger(promptStore.sessionDir(store, 's-1')).entries.length, 3);
    });
});
