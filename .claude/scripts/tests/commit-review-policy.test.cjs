'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const policy = require('../lib/commit-review-policy.cjs');
const { validateConfig } = require('../../hooks/lib/project-config-schema.cjs');
const { validateCkConfig } = require('../../hooks/lib/ck-config-schema.cjs');

const REPO = path.resolve(__dirname, '../../..');
const SCRIPT = path.resolve(__dirname, '../lib/commit-review-policy.cjs');

function fixture(t) {
    const parent = path.join(REPO, 'tmp', 'commit-review-tests');
    fs.mkdirSync(parent, { recursive: true });
    const rootDir = fs.mkdtempSync(path.join(parent, 'run-'));
    const homeDir = path.join(rootDir, 'home');
    fs.mkdirSync(homeDir);
    t.after(() => fs.rmSync(rootDir, { recursive: true, force: true }));
    const write = (file, value) => {
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, Buffer.isBuffer(value) || typeof value === 'string' ? value : JSON.stringify(value));
    };
    return {
        rootDir, homeDir, env: {}, write,
        team: path.join(rootDir, 'docs/project-config.json'),
        user: path.join(homeDir, '.claude/.ck.json'),
        local: path.join(rootDir, '.claude/.ck.local.json')
    };
}

test('requested commits select a real lightweight review at every risk tier by default', t => {
    const f = fixture(t);
    for (const risk of ['low', 'medium', 'high']) {
        const result = policy.decideReview({ ...f, risk });
        assert.equal(result.skill, 'commit-review');
        assert.equal(result.action, 'review');
        assert.equal(result.maxRounds, 2);
        assert.equal(result.source, 'default');
    }
});

test('risk-based opt-in restores the tier policy while PR scope ignores the commit preference', t => {
    const f = fixture(t);
    f.write(f.team, { commit: { reviewMode: 'risk-based' } });
    for (const [risk, skill] of [['low', null], ['medium', 'why-review'], ['high', 'changes-review']]) {
        assert.equal(policy.decideReview({ ...f, risk }).skill, skill);
        f.write(f.local, { commit: { reviewMode: 'lightweight' } });
        const pr = policy.decideReview({ ...f, risk, operation: 'pull-request' });
        assert.equal(pr.skill, skill);
        assert.equal(pr.source, 'pull-request');
        fs.unlinkSync(f.local);
    }
});

test('personal and checkout settings override team defaults; reset exposes the preceding layer', t => {
    const f = fixture(t);
    f.write(f.team, { commit: { reviewMode: 'risk-based' } });
    assert.equal(policy.resolveCommitReviewMode(f).source, 'project-config');
    f.write(f.user, { commit: { reviewMode: 'lightweight' } });
    assert.equal(policy.resolveCommitReviewMode(f).mode, 'lightweight');
    assert.equal(policy.resolveCommitReviewMode(f).source, 'user-config');
    f.write(f.local, { commit: { reviewMode: 'risk-based' } });
    assert.equal(policy.resolveCommitReviewMode(f).mode, 'risk-based');
    assert.equal(policy.resolveCommitReviewMode(f).source, 'local-override');
    const override = policy.resolveCommitReviewMode({ ...f, env: { CK_COMMIT_REVIEW_MODE: '"lightweight"' } });
    assert.equal(override.mode, 'lightweight');
    assert.equal(override.source, 'environment');
    f.write(f.local, { commit: {} });
    assert.equal(policy.resolveCommitReviewMode(f).source, 'user-config');
});

test('relocated project config and Windows Unicode config encoding keep the same preference', t => {
    const f = fixture(t);
    f.write(path.join(f.rootDir, '.claude/.ck.json'), { portability: { projectConfigPath: 'config/team.json' } });
    f.write(path.join(f.rootDir, 'config/team.json'), { commit: { reviewMode: 'risk-based' } });
    assert.equal(policy.resolveCommitReviewMode(f).mode, 'risk-based');
    f.write(f.user, Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from('{"commit":{"reviewMode":"lightweight"}}', 'utf16le')]));
    assert.equal(policy.resolveCommitReviewMode(f).source, 'user-config');
});

test('malformed declared preferences and unknown decisions cannot silently weaken a review', t => {
    const f = fixture(t);
    for (const value of ['{broken', [], { commit: null }, { commit: { reviewMode: 'skip' } }, { commit: { reviewMode: false } }]) {
        f.write(f.local, value);
        assert.throws(() => policy.resolveCommitReviewMode(f));
    }
    fs.unlinkSync(f.local);
    assert.throws(() => policy.resolveCommitReviewMode({ ...f, env: { CK_COMMIT_REVIEW_MODE: 'off' } }));
    assert.throws(() => policy.decideReview({ ...f, risk: 'unknown' }));
    assert.throws(() => policy.decideReview({ ...f, risk: 'high', operation: 'push' }));
    assert.throws(() => policy.selectReview('high', 'skip'));
});

test('team and personal schema/help expose the same supported review choices', () => {
    for (const mode of ['lightweight', 'risk-based']) {
        assert.equal(validateConfig({ project: { name: 'Fixture' }, commit: { reviewMode: mode } }).valid, true);
        assert.equal(validateCkConfig({ commit: { reviewMode: mode } }).valid, true);
    }
    assert.equal(validateConfig({ project: { name: 'Fixture' }, commit: { reviewMode: 'skip' } }).valid, false);
    assert.equal(validateCkConfig({ commit: { reviewMode: 'skip' } }).valid, false);
});

test('the read-only CLI reports its selected review and refuses unknown arguments', t => {
    const f = fixture(t);
    f.write(f.team, { project: { name: 'Fixture' }, commit: { reviewMode: 'risk-based' } });
    const before = fs.readFileSync(f.team);
    const run = args => spawnSync(process.execPath, [SCRIPT, ...args], {
        cwd: f.rootDir, encoding: 'utf8',
        env: { ...process.env, HOME: f.homeDir, USERPROFILE: f.homeDir, CK_COMMIT_REVIEW_MODE: '' }
    });
    const result = run(['--risk=high']);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).skill, 'changes-review');
    assert.deepEqual(fs.readFileSync(f.team), before);
    assert.equal(run(['--risk=high', '--risk=low']).status, 1);
    assert.equal(run(['--skip']).status, 1);
});

test('shipped Git permissions do not ask again and still register commit review enforcement', () => {
    const settings = JSON.parse(fs.readFileSync(path.join(REPO, '.claude/settings.json'), 'utf8'));
    assert.equal(settings.permissions.ask.some(rule => /git (?:commit|push)\b/.test(rule)), false);
    for (const rule of ['Bash(git commit:*)', 'Bash(git push:*)']) assert.ok(settings.permissions.allow.includes(rule));
    assert.ok(settings.permissions.ask.includes('Bash(npm publish:*)'), 'unrelated publication prompts remain');
    assert.match(JSON.stringify(settings.hooks.PreToolUse), /review-commit-gate\.cjs/);
});
