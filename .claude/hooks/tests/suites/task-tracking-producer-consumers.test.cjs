'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { trackingTest: test, git, refused } = require('../lib/task-tracking-fixture.cjs');

const CLI_PATH = path.resolve(__dirname, '../../../skills/task-track/scripts/task-track.cjs');

function cli(f, command, value, options = []) {
    const child = spawnSync(process.execPath, [CLI_PATH, command, '--root', f.root, ...options],
        { cwd: f.root, env: { ...process.env }, shell: false, input: JSON.stringify(value), encoding: 'utf8', timeout: 10000, maxBuffer: 2 * 1024 * 1024 });
    assert.equal(child.error, undefined, child.error?.message);
    assert.equal(child.status, 0, child.stderr || child.stdout);
    return JSON.parse(child.stdout);
}
const concerns = (f, paths, itemIds = []) => cli(f, 'concerns', { schemaVersion: 1, itemIds, paths });
const nulPaths = value => value.split('\0').filter(Boolean);

// These are the skill's existing literal Git recipes applied to a disposable
// repository. This test-local composition is not a production candidate API,
// nor evidence that a model performed its final self-check or published a PR.
function normalCandidate(f, base) {
    return [...new Set([
        ...nulPaths(git(f, ['diff', '--name-only', '--no-renames', '-z', `${base}...HEAD`])),
        ...nulPaths(git(f, ['diff', '--name-only', '--no-renames', '-z', 'HEAD'])),
        ...nulPaths(git(f, ['ls-files', '--others', '--exclude-standard', '-z']))
    ])].sort();
}
function baseline(f) {
    f.write('.gitignore', 'tmp/\n');
    f.write('src/existing.js', 'Initial authored source\n');
    git(f, ['init']); git(f, ['add', '--', '.']); git(f, ['commit', '-m', 'Fixture receiving baseline']);
    return git(f, ['rev-parse', 'HEAD']);
}

module.exports = { name: 'Task tracking producer consumers integration', tests: [
    test('TC-TPT-124', 'public specification refinement and plan saving checkpoints preserve original declared concerns and historical acceptance', async f => {
        const artifacts = { spec: 'contracts/export.md', 'work-item': 'planned-work/refinement.md', plan: 'delivery/implementation.md' };
        for (const file of Object.values(artifacts)) f.write(file, 'Original governing source\n');
        await f.create(); await f.create('TASK-unrelated');
        await f.saved('link', 'TASK-101', { links: [{ relation: 'spec', path: artifacts.spec }, { relation: 'plan', path: artifacts.plan }, { relation: 'source', path: artifacts['work-item'] }] });
        await f.accepted(); const acceptance = f.record('TASK-101').tracking.acceptanceHistory;
        const unrelated = f.bytes('TASK-unrelated');
        assert.equal(f.view('TASK-101').verification.status, 'current');
        for (const [producer, artifact] of Object.entries(artifacts)) {
            const before = concerns(f, [artifact]); assert.equal(before.coverage, 'complete');
            assert.deepEqual(before.items.map(item => item.itemId), ['TASK-101']);
            assert.equal(before.relationships.length, 1); assert.equal(before.relationships[0].owner.ownerPath, f.record('TASK-101').ownerPath);
            assert.equal(before.relationships[0].direction, 'incoming'); assert.equal(before.relationships[0].resolution, 'resolved');
            const options = ['--session', `actual-${producer}-session`, '--actor', 'owner', '--producer', producer];
            const context = { runId: `actual-${producer}-run`, occurrenceId: 'actual-artifact-save' };
            assert.equal(cli(f, 'link', { itemIds: ['TASK-101'], ...context }, options).status, 'linked');
            const savedSource = `Actual ${producer} saving owner revised its artifact\n`; f.write(artifact, savedSource);
            const primary = { status: 'saved', artifact, outcome: 'The saving owner completed its authorized artifact save' };
            const value = { checkpointId: 'actual-artifact-save', primary, context,
                observation: { kind: 'saved', observedAt: new Date().toISOString(), summary: `Observed the actual ${producer} artifact save`, paths: [artifact] } };
            const saved = cli(f, 'checkpoint', value, options); assert.deepEqual(saved.primary, primary);
            assert.equal(saved.secondary[0].status, 'saved');
            const durable = f.bytes('TASK-101'); const after = concerns(f, [artifact]);
            assert.equal(after.coverage, 'complete'); assert.equal(after.items[0].verification.status, 'stale');
            assert.equal(after.items[0].acceptance.accepted, true); assert.equal(after.items[0].state, 'done');
            assert.equal(after.items[0].acceptance.historyCount, acceptance.length);
            assert.deepEqual(f.record('TASK-101').tracking.acceptanceHistory, acceptance);
            assert.deepEqual(f.bytes('TASK-101'), durable); assert.deepEqual(f.bytes('TASK-unrelated'), unrelated);
            assert.equal(cli(f, 'checkpoint', value, options).secondary[0].result.replayed, true);
            assert.deepEqual(f.bytes('TASK-101'), durable); assert.equal(fs.readFileSync(path.join(f.root, artifact), 'utf8'), savedSource);
        }
        assert.equal(f.record('TASK-101').tracking.activity.length, 3); assert.equal(f.progress().metrics.accepted, 1);
        assert.equal(f.progress().metrics.currentlyVerified, 0);
    }),
    test('TC-TPT-151', 'literal publication recipes include earlier latest staged unstaged deleted and untracked proposal paths', async f => {
        f.write('src/to-delete.js', 'Existing source\n'); await f.create();
        const base = baseline(f); git(f, ['checkout', '-b', 'proposal']);
        f.write('src/earlier.js', 'Earlier proposal\n'); git(f, ['add', '--', 'src/earlier.js']); git(f, ['commit', '-m', 'Earlier fixture proposal']);
        f.write('src/latest.js', 'Latest proposal\n'); git(f, ['add', '--', 'src/latest.js']); git(f, ['commit', '-m', 'Latest fixture proposal']);
        f.write('src/staged.js', 'Pending staged proposal\n'); git(f, ['add', '--', 'src/staged.js']);
        // A relationship is declared while its source is still readable; the proposal removes that source afterwards.
        // Saving it leaves the linked owner as pending unstaged work, so the owner is part of the actual candidate.
        await f.saved('link', 'TASK-101', { links: [{ relation: 'source', path: 'src/earlier.js' }, { relation: 'source', path: 'src/to-delete.js' }] });
        f.write('src/existing.js', 'Pending unstaged proposal\n'); fs.unlinkSync(path.join(f.root, 'src/to-delete.js'));
        f.write('src/untracked name.js', 'Pending untracked proposal\n');
        const expected = ['src/earlier.js', 'src/existing.js', 'src/latest.js', 'src/staged.js', 'src/to-delete.js', 'src/untracked name.js', f.record('TASK-101').ownerPath].sort();
        assert.deepEqual(normalCandidate(f, base), expected);
        // The owner refuses a relationship whose source cannot be read, and the earlier declaration stays as saved.
        const owners = f.bytes('TASK-101');
        refused(await f.perform('link', 'TASK-101', { links: [{ relation: 'source', path: 'src/to-delete.js' }] }));
        assert.deepEqual(f.bytes('TASK-101'), owners);
        const result = concerns(f, normalCandidate(f, base), ['TASK-101']);
        assert.equal(result.coverage, 'partial'); assert.ok(result.diagnostics.some(value => value.code === 'UNRESOLVED_PATH' && value.ownerPath === 'src/to-delete.js'));
        assert.ok(result.relationships.some(value => value.target.path === 'src/earlier.js' && value.direction === 'incoming'));
        assert.equal(result.relationships.find(value => value.target.path === 'src/to-delete.js').resolution, 'missing');
        assert.deepEqual(f.bytes('TASK-101'), owners); assert.equal(result.items[0].acceptance.accepted, false);
        // Unavailable base is an error, never an empty checked candidate.
        assert.throws(() => normalCandidate(f, 'missing-receiving-base'));
        assert.deepEqual(f.bytes('TASK-101'), owners);
    }),
    test('TC-TPT-151', 'an actual pending integration net proposal excludes unrelated receiving-side commits', async f => {
        const base = baseline(f); git(f, ['checkout', '-b', 'receiving']);
        f.write('src/receiving-only.js', 'Receiving-side work\n'); git(f, ['add', '--', 'src/receiving-only.js']); git(f, ['commit', '-m', 'Receiving fixture change']);
        const receiving = git(f, ['rev-parse', 'HEAD']); git(f, ['checkout', '-b', 'proposal', base]);
        f.write('src/earlier.js', 'Earlier proposal\n'); git(f, ['add', '--', 'src/earlier.js']); git(f, ['commit', '-m', 'Earlier proposal']);
        f.write('src/latest.js', 'Latest proposal\n'); git(f, ['add', '--', 'src/latest.js']); git(f, ['commit', '-m', 'Latest proposal']);
        git(f, ['merge', '--no-ff', '--no-commit', 'receiving']); f.write('src/untracked.js', 'Pending proposal\n');
        const net = [...new Set([...nulPaths(git(f, ['diff', '--name-only', '--no-renames', '-z', receiving])),
            ...nulPaths(git(f, ['ls-files', '--others', '--exclude-standard', '-z']))])].sort();
        assert.deepEqual(net, ['src/earlier.js', 'src/latest.js', 'src/untracked.js']);
        assert.equal(fs.existsSync(path.join(f.root, 'src/receiving-only.js')), true);
        const result = concerns(f, net); assert.equal(result.coverage, 'complete');
        assert.deepEqual(result.scope.paths, net); assert.deepEqual(result.items, []); assert.deepEqual(result.relationships, []);
        assert.match(result.authority, /do not certify a complete PR candidate or authorize mutation/);
    }),
    test('TC-TPT-152', 'fresh candidate and owner rereads reveal authorized repairs while retaining historical acceptance and unrelated work', async f => {
        f.write('src/export.js', 'Initial source\n'); await f.create(); await f.create('TASK-unrelated');
        await f.saved('link', 'TASK-101', { links: [{ relation: 'source', path: 'src/export.js' }] }); await f.accepted();
        const accepted = f.record('TASK-101'); const unrelated = f.bytes('TASK-unrelated');
        const base = baseline(f); git(f, ['checkout', '-b', 'proposal']);
        f.write('src/earlier.js', 'Earlier proposed change\n'); git(f, ['add', '--', 'src/earlier.js']); git(f, ['commit', '-m', 'Earlier proposed change']);
        const firstPaths = normalCandidate(f, base); const first = concerns(f, firstPaths, ['TASK-101']);
        assert.equal(first.items.find(item => item.itemId === 'TASK-101').verification.status, 'current');
        // Real supported save between inspections; no synthetic publication or
        // model decision is used to award proof/acceptance.
        f.write('src/export.js', 'Authorized repair of governing source\n'); f.write('src/repair.js', 'Additional repaired proposal\n');
        const request = f.request('update', 'TASK-101', { title: 'Saved authorized linked clarification' });
        const saved = cli(f, 'apply', request, ['--actor', 'owner']); assert.equal(saved.primary.status, 'saved');
        const owner = f.record('TASK-101'); const durable = f.bytes('TASK-101'); const finalPaths = normalCandidate(f, base);
        assert.deepEqual(finalPaths, ['src/earlier.js', 'src/export.js', 'src/repair.js', owner.ownerPath].sort());
        assert.notDeepEqual(finalPaths, firstPaths); assert.equal(owner.revision, accepted.revision + 1);
        const final = concerns(f, finalPaths, ['TASK-101']); const item = final.items.find(value => value.itemId === 'TASK-101');
        assert.notEqual(final.snapshotFingerprint, first.snapshotFingerprint); assert.equal(item.verification.status, 'stale');
        assert.equal(item.acceptance.accepted, true); assert.equal(item.acceptance.historyCount, accepted.tracking.acceptanceHistory.length);
        assert.equal(item.revision, owner.revision); assert.equal(item.contentHash, owner.contentHash);
        assert.deepEqual(f.record('TASK-101').tracking.acceptanceHistory, accepted.tracking.acceptanceHistory);
        assert.deepEqual(f.bytes('TASK-101'), durable); assert.deepEqual(f.bytes('TASK-unrelated'), unrelated);
        assert.match(final.inspection.fingerprintScope, /not an atomic path or publication check/);
    }),
    test('TC-TPT-164', 'public candidate repair and checkpoint composition rereads saved skipped pending and untracked outcomes without new acceptance', async f => {
        f.write('src/export.js', 'Initial governing source\n');
        await f.create(); await f.create('TASK-opted-out'); await f.create('TASK-unrelated');
        await f.saved('link', 'TASK-101', { links: [{ relation: 'source', path: 'src/export.js' }] });
        await f.accepted(); await f.saved('update', 'TASK-opted-out', { optOut: true });
        const accepted = f.record('TASK-101'); const optedOut = f.bytes('TASK-opted-out'); const unrelated = f.bytes('TASK-unrelated');
        const base = baseline(f); git(f, ['checkout', '-b', 'proposal']);
        f.write('src/earlier.js', 'Earlier proposed change\n'); git(f, ['add', '--', 'src/earlier.js']); git(f, ['commit', '-m', 'Earlier proposed change']);
        const firstPaths = normalCandidate(f, base); const first = concerns(f, firstPaths, ['TASK-101']);
        assert.deepEqual(firstPaths, ['src/earlier.js']); assert.equal(first.items[0].verification.status, 'current');
        f.write('src/export.js', 'Actual authorized source repair\n'); f.write('src/pending.js', 'Pending untracked proposal\n');
        const update = cli(f, 'apply', f.request('update', 'TASK-101', { title: 'Repaired selected export outcome' }), ['--actor', 'owner']);
        assert.equal(update.primary.status, 'saved');
        const repaired = f.record('TASK-101'); const finalPaths = normalCandidate(f, base);
        assert.deepEqual(finalPaths, ['src/earlier.js', 'src/export.js', 'src/pending.js', repaired.ownerPath].sort());
        const checked = concerns(f, finalPaths, ['TASK-101']); assert.equal(checked.coverage, 'complete');
        assert.deepEqual(checked.scope.paths, finalPaths); assert.notEqual(checked.snapshotFingerprint, first.snapshotFingerprint);
        assert.equal(checked.items[0].revision, repaired.revision); assert.equal(checked.items[0].contentHash, repaired.contentHash);
        assert.equal(checked.items[0].verification.status, 'stale'); assert.equal(checked.items[0].acceptance.accepted, true);
        const options = ['--session', 'actual-publication-session', '--actor', 'owner', '--producer', 'pull-request'];
        assert.equal(cli(f, 'link', { itemIds: ['TASK-101', 'TASK-opted-out'] }, options).status, 'linked');
        // Primary is explicitly supplied by its owner; this composition neither
        // observes remote publication nor proves an agent performed a self-check.
        const primary = { status: 'saved', artifact: 'src/export.js', outcome: 'The saving owner retained its successful primary result' };
        const value = { checkpointId: 'actual-repaired-save', primary,
            observation: { kind: 'saved', observedAt: new Date().toISOString(), summary: 'Observed the actual source repair', paths: ['src/export.js'] } };
        const saved = cli(f, 'checkpoint', value, options); assert.deepEqual(saved.primary, primary);
        assert.deepEqual(saved.secondary.map(item => [item.itemId, item.status]), [['TASK-101', 'saved'], ['TASK-opted-out', 'skipped']]);
        // The checkpoint owner stops an opted-out item before any retained request or item save, so it states the
        // reason itself and there is no item operation result to report.
        assert.match(saved.secondary[1].reason, /opted out/i); assert.equal(saved.secondary[1].result, undefined);
        assert.deepEqual(f.bytes('TASK-opted-out'), optedOut);
        const current = f.record('TASK-101'); const durable = f.bytes('TASK-101');
        assert.equal(current.revision, repaired.revision + 1); assert.equal(current.tracking.activity.length, 1);
        assert.deepEqual(current.tracking.activity[0], value.observation);
        assert.deepEqual(current.tracking.acceptanceHistory, accepted.tracking.acceptanceHistory);
        assert.deepEqual(current.tracking.proofs, accepted.tracking.proofs); assert.deepEqual(current.tracking.criteria, accepted.tracking.criteria);
        assert.equal(current.data.status, 'done'); assert.equal(f.progress().metrics.accepted, 1); assert.equal(f.progress().metrics.currentlyVerified, 0);
        const rereadPaths = normalCandidate(f, base); assert.deepEqual(rereadPaths, finalPaths);
        const reread = concerns(f, rereadPaths, ['TASK-101']); assert.equal(reread.coverage, 'complete');
        assert.notEqual(reread.snapshotFingerprint, checked.snapshotFingerprint);
        assert.equal(reread.items[0].revision, current.revision); assert.equal(reread.items[0].contentHash, current.contentHash);
        const replay = cli(f, 'checkpoint', value, options); assert.equal(replay.secondary[0].result.replayed, true);
        assert.equal(replay.secondary[1].status, 'skipped'); assert.deepEqual(f.bytes('TASK-101'), durable);
        const pending = cli(f, 'checkpoint', { ...value, observation: { ...value.observation, summary: 'Changed reused observation' } }, options);
        assert.deepEqual(pending.primary, primary); assert.equal(pending.secondary[0].status, 'pending');
        assert.equal(pending.secondary[0].code, 'REUSED_OPERATION'); assert.ok(pending.secondary[0].reason);
        const untracked = cli(f, 'checkpoint', value, ['--session', 'actual-unlinked-session', '--actor', 'owner', '--producer', 'pull-request']);
        assert.deepEqual(untracked.primary, primary); assert.equal(untracked.secondary[0].status, 'untracked'); assert.ok(untracked.secondary[0].reason);
        assert.deepEqual(f.bytes('TASK-101'), durable); assert.deepEqual(f.bytes('TASK-opted-out'), optedOut); assert.deepEqual(f.bytes('TASK-unrelated'), unrelated);
        assert.equal(fs.readFileSync(path.join(f.root, 'src/export.js'), 'utf8'), 'Actual authorized source repair\n');
    })
] };
