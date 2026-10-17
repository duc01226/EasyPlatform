'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const { spawnSync } = require('node:child_process');
const { trackingTest: test, withFixture, refused, git } = require('../lib/task-tracking-fixture.cjs');
const { inspectRecords, patchRecord } = require('../../lib/task-artifact-store.cjs');
const { readBytes, hash } = require('../../lib/task-tracking-files.cjs');
const { inspectSnapshot } = require('../../lib/task-progress-reader.cjs');
const { loadSharedSnapshot } = require('../../../skills/task-track/lib/shared-snapshot.cjs');
const { recoveryPath } = require('../../lib/task-tracking-deletion.cjs');
const { readConcerns, projectConcerns, projectPathConcerns, validateConcernQuery } = require('../../lib/task-tracking-concerns.cjs');
const { renderReport } = require('../../../skills/task-track/lib/report-view.cjs');
const { LIMITS } = require('../../lib/task-tracking-config.cjs');

const technical = (intent, fn) => ({ name: `Technical tracking boundary: ${intent}`, fn: () => withFixture(fn) });
const exactOwners = f => new Map(f.records().map(record => [record.ownerPath, record.bytes]));
function conserved(f, owners) {
    for (const [owner, bytes] of owners) assert.deepEqual(fs.readFileSync(path.join(f.root, owner)), bytes, owner);
}
function privateContentAbsent(value, markers) {
    const publicJson = JSON.stringify(value);
    for (const marker of markers) assert.equal(publicJson.includes(marker), false, `Public result disclosed ${marker}`);
}
// A tracked record written straight to its owner file: a board of several hundred owners without several hundred saves.
function authored(f, id, links = [], bodyBytes = 0) {
    const tracking = { schemaVersion: 3, revision: 1, kind: 'task', criteria: [{ id: 'selected-rows', text: 'Export contains exactly the selected rows' }], links };
    const head = { id, title: `Planned work ${id}`, intent: 'Preserve a defined outcome', status: 'draft', tracking };
    const bytes = Buffer.from(`---\n${Object.entries(head).map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join('\n')}\n---\n\n${'x'.repeat(bodyBytes)}\n`);
    f.write(`work/tasks/${id}.md`, bytes);
    return bytes;
}
function commitPaths(f, paths, message) {
    git(f, ['init']); git(f, ['add', '--', ...paths]); git(f, ['commit', '-m', message]);
    return git(f, ['rev-parse', 'HEAD']);
}
// The unchanged production loader over real Git. Only the process launcher is observed; a case that studies the time
// budget also fixes the clock, so machine speed never decides the outcome.
function observedSharedReader(f, { expireAfter } = {}) {
    const modulePath = require.resolve('../../../skills/task-track/lib/shared-snapshot.cjs');
    const localRequire = createRequire(modulePath);
    const commands = [];
    let now = 0;
    const launch = (command, args, options) => {
        const operation = [...args.slice(args.indexOf('core.fsmonitor=false') + 1)];
        commands.push(operation);
        assert.equal(command, 'git'); assert.equal(options.shell, false);
        assert.ok(options.maxBuffer > 0 && options.maxBuffer <= 16 * LIMITS.recordBytes, `Git output is bounded: ${options.maxBuffer}`);
        const result = spawnSync(command, args, options);
        if (expireAfter?.(operation)) now = LIMITS.processTimeoutMs;
        return result;
    };
    const loaded = { exports: {} };
    vm.runInNewContext(fs.readFileSync(modulePath, 'utf8'), {
        require: name => name === 'node:child_process' ? { spawnSync: launch } : localRequire(name),
        module: loaded, process, Buffer, TextDecoder,
        Date: expireAfter ? class extends Date { static now() { return now; } } : Date
    }, { filename: modulePath });
    return { commands, load: ref => loaded.exports.loadSharedSnapshot(f.root, ref) };
}

module.exports = { name: 'Task tracking selected-owner and resource boundaries', tests: [
    test('TC-TPT-146', 'shared intent navigation retains two delivery declarers then their exact enabling subtask without backlink or delivery credit', async f => {
        const spec = 'docs/contracts/export.md'; f.write(spec, 'The operator exports the selected rows.'); f.write('src/export.cjs', 'module.exports = "selected";');
        for (const id of ['TASK-104', 'TASK-105', 'TASK-106']) await f.create(id);
        await f.create('SUBTASK-104', 'subtask');
        for (const id of ['TASK-104', 'TASK-105']) await f.saved('link', id, { links: [{ relation: 'spec', path: spec }, { relation: 'source', path: 'src/export.cjs' }] });
        await f.saved('link', 'SUBTASK-104', { links: [{ relation: 'parent', itemId: 'TASK-104' }] });
        const owners = exactOwners(f); const metrics = f.progress().metrics;
        const intent = readConcerns(f.root, { schemaVersion: 1, paths: [spec] });
        assert.equal(intent.coverage, 'complete'); assert.deepEqual(intent.items.map(item => item.itemId).sort(), ['TASK-104', 'TASK-105']);
        assert.match(intent.inspection.pathAvailability, /unverified against snapshotFingerprint/);
        assert.match(intent.inspection.fingerprintScope, /Tracker snapshot only/); assert.ok(intent.asOf);
        assert.deepEqual(intent.relationships.map(link => [link.owner.itemId, link.relation, link.direction, link.target.path, link.resolution]),
            [['TASK-104', 'spec', 'incoming', spec, 'resolved'], ['TASK-105', 'spec', 'incoming', spec, 'resolved']]);
        for (const link of intent.relationships) assert.equal(link.owner.ownerPath, f.record(link.owner.itemId).ownerPath);
        const work = readConcerns(f.root, { schemaVersion: 1, itemIds: ['TASK-104'] });
        assert.equal(work.coverage, 'complete');
        assert.ok(work.relationships.some(link => link.owner.itemId === 'SUBTASK-104' && link.direction === 'incoming' && link.target.itemId === 'TASK-104'));
        assert.ok(work.relationships.some(link => link.owner.itemId === 'TASK-104' && link.direction === 'outgoing' && link.target.path === spec));
        assert.deepEqual(work.items.map(item => item.itemId).sort(), ['SUBTASK-104', 'TASK-104']);
        assert.equal(work.items.every(item => item.verification.status === 'missing' && item.acceptance.accepted === false), true);
        assert.equal(work.items.some(item => item.itemId === 'TASK-106'), false); // Equal titles never select unrelated work.
        for (const item of work.items) for (const field of ['title', 'intent', 'criteria', 'history', 'receipts', 'proofs']) assert.equal(Object.hasOwn(item, field), false);
        conserved(f, owners); assert.deepEqual(f.progress().metrics, metrics); assert.equal(metrics.total, 3);
    }),
    test('TC-TPT-162', 'incoming and outgoing views keep original declaring ownership and show a tag as the link its tagged record declares', async f => {
        for (const id of ['TASK-104', 'TASK-105']) await f.create(id);
        await f.saved('link', 'TASK-105', { links: [{ relation: 'dependency', itemId: 'TASK-104' }] });
        await f.create('AREA-104', 'area'); for (const id of ['TASK-104', 'TASK-105']) await f.tag(id, { areaIds: ['AREA-104'] });
        const owners = exactOwners(f);
        for (const itemIds of [['TASK-104'], ['TASK-105'], ['TASK-104', 'TASK-105'], ['AREA-104']]) {
            const result = readConcerns(f.root, { schemaVersion: 1, itemIds });
            for (const link of result.relationships) {
                assert.equal(link.resolution, 'resolved'); assert.equal(link.owner.ownerPath, f.record(link.owner.itemId).ownerPath);
                assert.ok(['incoming', 'outgoing'].includes(link.direction));
                if (link.relation === 'dependency') { assert.equal(link.owner.itemId, 'TASK-105'); assert.equal(link.target.itemId, 'TASK-104'); }
                // The tagged record owns its tag: the area is only ever the target, never a declarer of members.
                else { assert.equal(link.relation, 'area'); assert.ok(['TASK-104', 'TASK-105'].includes(link.owner.itemId)); assert.equal(link.target.itemId, 'AREA-104'); }
            }
            assert.equal(result.items.length, new Set(result.items.map(item => item.ownerPath)).size);
            conserved(f, owners); assert.equal(f.progress().metrics.total, 2);
        }
        const both = readConcerns(f.root, { schemaVersion: 1, itemIds: ['TASK-104', 'TASK-105'] });
        assert.deepEqual(both.relationships.filter(link => link.relation === 'dependency').map(link => link.direction), ['outgoing', 'incoming']);
        // Seen from the area, both tags arrive; seen from a tagged record, its one tag leaves.
        const tags = itemIds => readConcerns(f.root, { schemaVersion: 1, itemIds }).relationships.filter(link => link.relation === 'area').map(link => [link.owner.itemId, link.direction]);
        assert.deepEqual(tags(['AREA-104']), [['TASK-104', 'incoming'], ['TASK-105', 'incoming']]);
        assert.deepEqual(tags(['TASK-104']), [['TASK-104', 'outgoing']]);
    }),
    test('TC-TPT-155', 'teammate deletion and duplicate imports remain unresolved without selecting a guessed owner or rewriting incoming history', async f => {
        await f.create('TASK-target'); await f.create('SUBTASK-owner', 'subtask');
        await f.saved('link', 'SUBTASK-owner', { links: [{ relation: 'parent', itemId: 'TASK-target' }] });
        const target = f.record('TASK-target'); const incoming = f.bytes('SUBTASK-owner');
        // Real manual/merge discrepancy after a permitted relationship save.
        const duplicate = 'work/tasks/teammate-copy.md'; f.write(duplicate, target.bytes);
        let result = readConcerns(f.root, { schemaVersion: 1, itemIds: ['TASK-target'] });
        assert.equal(result.coverage, 'partial'); assert.ok(result.diagnostics.some(value => value.code === 'DUPLICATE_ID'));
        assert.ok(result.diagnostics.some(value => value.code === 'AMBIGUOUS_OWNER'));
        assert.equal(result.relationships.find(value => value.owner.itemId === 'SUBTASK-owner').resolution, 'ambiguous');
        assert.equal(result.relationships.some(value => value.owner.itemId === 'TASK-target' && value.direction === 'outgoing'), false);
        assert.deepEqual(f.bytes('SUBTASK-owner'), incoming); assert.deepEqual(fs.readFileSync(path.join(f.root, target.ownerPath)), target.bytes);
        fs.unlinkSync(path.join(f.root, target.ownerPath)); fs.unlinkSync(path.join(f.root, duplicate));
        result = readConcerns(f.root, { schemaVersion: 1, itemIds: ['TASK-target'] });
        assert.equal(result.coverage, 'partial'); assert.ok(result.diagnostics.some(value => value.code === 'UNRESOLVED_OWNER'));
        assert.equal(result.relationships.find(value => value.owner.itemId === 'SUBTASK-owner').resolution, 'missing');
        assert.deepEqual(f.bytes('SUBTASK-owner'), incoming); assert.equal(fs.existsSync(path.join(f.root, target.ownerPath)), false);
    }),
    test('TC-TPT-162', 'current confidence can turn stale while concern reads retain separate acceptance and all canonical bytes', async f => {
        f.write('src/export.cjs', 'module.exports = "first";'); await f.create();
        await f.saved('link', 'TASK-101', { links: [{ relation: 'source', path: 'src/export.cjs' }] }); await f.accepted();
        const owners = exactOwners(f); const history = f.record('TASK-101').tracking.acceptanceHistory;
        let result = readConcerns(f.root, { schemaVersion: 1, itemIds: ['TASK-101'] });
        assert.equal(result.items[0].verification.status, 'current'); assert.equal(result.items[0].acceptance.accepted, true);
        f.write('src/export.cjs', 'module.exports = "changed";');
        result = readConcerns(f.root, { schemaVersion: 1, itemIds: ['TASK-101'] });
        assert.equal(result.items[0].verification.status, 'stale'); assert.equal(result.items[0].acceptance.accepted, true);
        assert.equal(result.items[0].state, 'done'); assert.equal(result.items[0].acceptance.historyCount, history.length);
        conserved(f, owners); assert.deepEqual(f.record('TASK-101').tracking.acceptanceHistory, history);
    }),
    test('TC-TPT-155', 'exact path normalization and exclusion preserve safe diagnostics without exposing private or generated scope', async f => {
        f.write('docs/contracts/export.md', 'Owned public intent.');
        await f.create('TASK-101', 'task', { title: 'password=synthetic-title-marker', intent: 'token=synthetic-intent-marker' });
        await f.saved('link', 'TASK-101', { links: [{ relation: 'spec', path: 'docs/contracts/export.md' }] });
        const owners = exactOwners(f);
        const result = readConcerns(f.root, { schemaVersion: 1, paths: ['docs\\contracts\\export.md', 'tmp/report.html'] });
        assert.deepEqual(result.scope.paths, ['docs/contracts/export.md']); assert.equal(result.scope.excludedPathCount, 1);
        assert.equal(result.coverage, 'partial'); assert.ok(result.diagnostics.some(value => value.code === 'EXCLUDED_PATH'));
        assert.equal(result.relationships[0].target.path, 'docs/contracts/export.md');
        privateContentAbsent(result, ['synthetic-title-marker', 'synthetic-intent-marker', 'tmp/report.html']);
        for (const value of ['.env', 'keys/private.pem', '../foreign.md', '/absolute.md', 'C:\\outside.md', 'src/../foreign.md']) {
            assert.throws(() => readConcerns(f.root, { schemaVersion: 1, paths: [value] }), error => error.code === 'UNSAFE_PATH');
        }
        assert.throws(() => readConcerns(f.root, { schemaVersion: 1, paths: ['docs/contracts/export.md', 'docs\\contracts\\export.md'] }), error => error.code === 'INVALID_INPUT');
        const missing = readConcerns(f.root, { schemaVersion: 1, paths: ['docs/contracts/missing.md'] });
        assert.equal(missing.coverage, 'partial'); assert.equal(missing.diagnostics.find(value => value.code === 'UNRESOLVED_PATH').resolution, 'missing');
        conserved(f, owners);
    }),
    test('TC-TPT-162', 'strict concern selector property refuses malformed, ambiguous, oversized and unsupported identities without changing owners', async f => {
        await f.create(); const owners = exactOwners(f);
        for (const query of [null, [], {}, { schemaVersion: 2, itemIds: ['TASK-101'] }, { schemaVersion: 1 },
            { schemaVersion: 1, itemIds: null }, { schemaVersion: 1, itemIds: ['TASK-101', 'TASK-101'] },
            { schemaVersion: 1, itemIds: [0] }, { schemaVersion: 1, itemIds: ['not an identity'] },
            { schemaVersion: 1, paths: 'docs/owner.md' }, { schemaVersion: 1, itemIds: ['TASK-101'], logicalCaseId: 'TC-TPT-162' }]) {
            assert.throws(() => readConcerns(f.root, query)); conserved(f, owners);
        }
        const ids = Array.from({ length: 64 }, (_, n) => `TASK-${n}`);
        assert.equal(validateConcernQuery({ schemaVersion: 1, itemIds: ids }).itemIds.length, 64);
        assert.throws(() => validateConcernQuery({ schemaVersion: 1, itemIds: [...ids, 'TASK-extra'] }), error => error.code === 'LIMIT_EXCEEDED');
        const paths = Array.from({ length: LIMITS.records }, (_, n) => `docs/file-${n}.md`);
        assert.equal(validateConcernQuery({ schemaVersion: 1, paths }).paths.length, LIMITS.records);
        assert.throws(() => validateConcernQuery({ schemaVersion: 1, paths: [...paths, 'docs/extra.md'] }), error => error.code === 'LIMIT_EXCEEDED');
        assert.throws(() => validateConcernQuery({ schemaVersion: 1, itemIds: ['TASK-101'], paths: ['x'.repeat(LIMITS.recordBytes)] }), error => error.code === 'LIMIT_EXCEEDED');
        const empty = readConcerns(f.root, { schemaVersion: 1, itemIds: ['TASK-101'] });
        assert.equal(empty.coverage, 'complete'); assert.deepEqual(empty.relationships, []); conserved(f, owners);
    }),
    test('TC-TPT-155', 'projection counts boundary and tenfold relationships and retains reader source-change findings alongside omitted scope', async f => {
        // Pure projection models a valid reader result: <=2000 owners and <=2000
        // links per owner. No fabricated persisted records or source bypass.
        const target = { id: 'TASK-target', kind: 'task', ownerPath: 'work/tasks/target.md', state: 'draft', links: [],
            verification: { status: 'missing' }, acceptance: { accepted: false }, prerequisiteReasons: [] };
        const snapshot = total => ({ schemaVersion: 3, coverage: 'complete', fingerprint: 'f'.repeat(64),
            profile: { available: true }, items: [target, ...Array.from({ length: Math.ceil(total / 1000) }, (_, n) => ({ ...target,
                id: `TASK-owner-${n}`, ownerPath: `work/tasks/owner-${n}.md`, links: Array.from({ length: Math.min(1000, total - n * 1000) }, () => ({ relation: 'parent', itemId: target.id })) }))], diagnostics: [] });
        for (const total of [0, LIMITS.records, LIMITS.records + 1, LIMITS.records * 10]) {
            const input = snapshot(total); const result = projectConcerns(input, { schemaVersion: 1, itemIds: [target.id] });
            assert.equal(result.inspection.visitedRelationships, Math.min(total, LIMITS.records));
            assert.equal(result.relationships.length, Math.min(total, LIMITS.records));
            assert.equal(result.inspection.omittedRelationships, Math.max(0, total - LIMITS.records));
            assert.equal(result.coverage, total > LIMITS.records ? 'partial' : 'complete');
            assert.equal(result.diagnostics.some(value => value.code === 'CONCERN_LIMIT'), total > LIMITS.records);
            assert.equal(JSON.stringify(result).includes('criteria'), false);
        }
        const changed = snapshot(LIMITS.records + 1); changed.coverage = 'partial'; changed.diagnostics = [{ code: 'SOURCE_CHANGED', reason: 'Reread source' }];
        const result = projectConcerns(changed, { schemaVersion: 1, itemIds: [target.id] });
        assert.ok(result.diagnostics.some(value => value.code === 'SOURCE_CHANGED')); assert.ok(result.diagnostics.some(value => value.code === 'CONCERN_LIMIT'));
        assert.equal(f.records().length, 0);
    }),
    test('TC-TPT-155', 'pinned concern reads retain the local object identity and never borrow changed worktree path existence', async f => {
        f.write('docs/contracts/export.md', 'Pinned intent.'); await f.create();
        await f.saved('link', 'TASK-101', { links: [{ relation: 'spec', path: 'docs/contracts/export.md' }] });
        git(f, ['init']); git(f, ['add', '--', 'docs', 'work']); git(f, ['commit', '-m', 'Synthetic pinned concerns']);
        const oid = git(f, ['rev-parse', 'HEAD']); const owners = exactOwners(f);
        fs.unlinkSync(path.join(f.root, 'docs/contracts/export.md'));
        const pinned = readConcerns(f.root, { schemaVersion: 1, paths: ['docs/contracts/export.md'] }, { ref: oid });
        assert.equal(pinned.source.kind, 'shared'); assert.equal(pinned.source.oid, oid); assert.equal(pinned.source.remoteFreshness, 'unknown');
        assert.match(pinned.inspection.pathAvailability, /unverified against snapshotFingerprint/);
        assert.equal(pinned.coverage, 'partial'); assert.equal(pinned.relationships[0].resolution, 'unverified');
        assert.equal(pinned.relationships[0].owner.itemId, 'TASK-101');
        const local = readConcerns(f.root, { schemaVersion: 1, paths: ['docs/contracts/export.md'] });
        assert.equal(local.relationships[0].resolution, 'missing'); assert.equal(local.coverage, 'partial');
        conserved(f, owners); assert.equal(fs.existsSync(path.join(f.root, 'docs/contracts/export.md')), false);
    }),
    test('TC-TPT-075', 'Ready selection orders priority before exact identities and explains each state, retired, approval and unresolved relationship exclusion', async f => {
        for (const [id, priority, title] of [['TASK-104', 5, 'First alphabetically'], ['TASK-901', 1, 'A title'], ['TASK-900', 1, 'Z title']]) {
            await f.create(id, 'task', { title }); await f.saved('update', id, { priority }); await f.ready(id);
        }
        const stateIds = new Map();
        for (const state of ['draft', 'planned', 'in_progress', 'verifying', 'done', 'canceled']) {
            const id = `TASK-state-${state}`; stateIds.set(id, state); await f.create(id);
            if (state === 'planned') await f.saved('transition', id, { state });
            if (state === 'in_progress') await f.active(id);
            if (state === 'verifying') await f.verifying(id);
            if (state === 'done') await f.accepted(id);
            if (state === 'canceled') await f.saved('transition', id, { state, reason: 'Observed scope removed' });
        }
        await f.create('TASK-201'); await f.active('TASK-201');
        await f.saved('transition', 'TASK-201', { state: 'blocked', reason: 'Observed dependency wait' });
        for (const [id, suffix] of [['TASK-202', 'blocked'], ['TASK-203', 'canceled'], ['TASK-204', 'unknown'], ['TASK-208', 'partial']]) {
            const dependency = `TASK-prerequisite-${suffix}`; await f.create(dependency); await f.accepted(dependency);
            await f.create(id); await f.saved('link', id, { links: [{ relation: 'dependency', itemId: dependency }] }); await f.ready(id);
        }
        for (const id of ['TASK-205', 'TASK-206', 'TASK-207', 'TASK-retired', 'TASK-approval']) { await f.create(id); await f.ready(id); }
        await f.saved('retire', 'TASK-retired', { reason: 'Retained history outside active work' });
        await f.saved('update', 'TASK-approval', { intent: 'A changed intended outcome needs actual renewed review' });
        await f.create('TASK-cycle-helper'); await f.saved('link', 'TASK-cycle-helper', { links: [{ relation: 'dependency', itemId: 'TASK-206' }] });
        f.config.docsRoots.teamArtifacts.path = 'outside-work'; f.saveConfig(); await f.create('TASK-foreign');
        const foreign = f.record('TASK-foreign'); const foreignBytes = foreign.bytes;
        f.config.docsRoots.teamArtifacts.path = 'work'; f.saveConfig();
        // Actual permitted entry points must refuse each invalid attempt before
        // any deliberate manual-import witness makes the selected scope partial.
        for (const [id, target] of [['TASK-205', 'TASK-205'], ['TASK-206', 'TASK-cycle-helper'], ['TASK-204', 'TASK-missing'], ['TASK-207', 'TASK-foreign']]) {
            const before = exactOwners(f);
            refused(await f.perform('link', id, { links: [{ relation: 'dependency', itemId: target }] }), 'INVALID_RELATIONSHIP');
            conserved(f, before); assert.deepEqual(fs.readFileSync(path.join(f.root, foreign.ownerPath)), foreignBytes);
        }
        await f.saved('transition', 'TASK-prerequisite-blocked', { state: 'in_progress', reason: 'Actual prerequisite work reopened' });
        await f.saved('transition', 'TASK-prerequisite-blocked', { state: 'blocked', reason: 'Current prerequisite outcome unresolved' });
        await f.saved('transition', 'TASK-prerequisite-canceled', { state: 'canceled', reason: 'Prerequisite scope removed' });
        const unknown = f.record('TASK-prerequisite-unknown'); const moved = 'outside-work/tasks/TASK-prerequisite-unknown.md';
        f.write(moved, unknown.bytes); fs.unlinkSync(path.join(f.root, unknown.ownerPath));
        // These corrupt relationships can arrive through manual edits or merges;
        // they are inspection fail-safe inputs, never permitted setup shortcuts.
        for (const [id, target] of [['TASK-205', 'TASK-205'], ['TASK-206', 'TASK-cycle-helper'], ['TASK-207', 'TASK-foreign']]) {
            const record = f.record(id);
            f.write(record.ownerPath, patchRecord(record, {}, { ...record.tracking, links: [{ relation: 'dependency', itemId: target }] }).bytes);
        }
        const partial = f.record('TASK-prerequisite-partial'); const duplicate = 'work/tasks/duplicate-prerequisite.md'; f.write(duplicate, partial.bytes);
        const originals = exactOwners(f); const snapshot = f.progress();
        assert.equal(snapshot.coverage, 'partial'); assert.deepEqual(snapshot.ready, ['TASK-900', 'TASK-901', 'TASK-104']);
        assert.equal(snapshot.ready[0], 'TASK-900'); assert.equal(snapshot.metrics.percentage, null);
        const excluded = new Map(snapshot.excluded.map(item => [item.itemId, item.reasons]));
        // A reason is read by a person: it names the state by its display label, never by the stored word.
        const shownState = { draft: 'Draft', planned: 'Planned', in_progress: 'In progress', verifying: 'Verifying', done: 'Done', canceled: 'Canceled' };
        for (const [id, state] of stateIds) assert.deepEqual(excluded.get(id).filter(reason => reason.startsWith('Recorded state is ')), [`Recorded state is ${shownState[state]}`], id);
        for (const [id, reason] of [['TASK-201', /Recorded state is Blocked$/], ['TASK-202', /Prerequisite.*unresolved/],
            ['TASK-203', /Prerequisite.*unresolved/], ['TASK-204', /unique project owner/], ['TASK-205', /Self relationship/],
            ['TASK-206', /Prerequisite.*unresolved/], ['TASK-207', /unique project owner/], ['TASK-208', /unique project owner/],
            ['TASK-retired', /Retired/], ['TASK-approval', /readiness approval.*unresolved/]]) {
            assert.equal(snapshot.ready.includes(id), false, id); assert.ok(excluded.get(id)?.some(value => reason.test(value)), id);
        }
        assert.ok(snapshot.diagnostics.some(value => value.code === 'CYCLE'));
        assert.ok(snapshot.diagnostics.some(value => value.code === 'DUPLICATE_ID' && value.itemId === partial.id));
        for (const id of snapshot.ready) { assert.equal(snapshot.items.find(item => item.id === id).acceptance.accepted, false); assert.equal(f.record(id).tracking.proofs.length, 0); }
        conserved(f, originals); assert.deepEqual(fs.readFileSync(path.join(f.root, moved)), unknown.bytes);
        assert.deepEqual(fs.readFileSync(path.join(f.root, foreign.ownerPath)), foreignBytes);
        assert.deepEqual(f.progress().ready, snapshot.ready); conserved(f, originals);
    }),
    test('TC-TPT-072', 'all seven item-link roles require one selected owner and refuse missing, self and ambiguous targets without edits', async f => {
        await f.create('TASK-owner'); await f.create('INITIATIVE-owner', 'initiative'); await f.create('AREA-owner', 'area');
        // This real record belongs to a different configured artifact scope.
        f.config.docsRoots.teamArtifacts.path = 'outside-work'; f.saveConfig(); await f.create('TASK-outside');
        const outsidePath = f.record('TASK-outside').ownerPath; const outside = f.bytes('TASK-outside');
        f.config.docsRoots.teamArtifacts.path = 'work'; f.saveConfig();
        // A tag relation names a record of its own kind and is written by the tag operation; every other relation names
        // the task and is written by the link operation.
        const owned = { initiative: 'INITIATIVE-owner', area: 'AREA-owner' };
        const relate = (id, relation, itemId) => owned[relation] ? f.perform('tag', id, { [`${relation}Ids`]: [itemId] }) : f.perform('link', id, { links: [{ relation, itemId }] });
        for (const relation of ['dependency', 'parent', 'area', 'initiative', 'spec', 'source', 'plan']) {
            const id = `TASK-link-${relation}`; const ownerId = owned[relation] || 'TASK-owner';
            await f.create(id); assert.equal((await relate(id, relation, ownerId)).primary.status, 'saved', relation);
            const owners = exactOwners(f);
            for (const target of ['TASK-missing', 'TASK-outside', id]) {
                refused(await relate(id, relation, target), 'INVALID_RELATIONSHIP');
                conserved(f, owners); assert.deepEqual(fs.readFileSync(path.join(f.root, outsidePath)), outside);
                assert.deepEqual(f.record(id).tracking.links, [{ relation, itemId: ownerId }]);
            }
            const owner = f.record(ownerId); const duplicate = `${path.posix.dirname(owner.ownerPath)}/duplicate-${relation}.md`;
            f.write(duplicate, owner.bytes);
            try {
                refused(await relate(id, relation, ownerId), 'INCOMPLETE_SCOPE');
                const snapshot = f.progress(); assert.equal(snapshot.coverage, 'partial');
                assert.ok(snapshot.diagnostics.some(diagnostic => diagnostic.code === 'DUPLICATE_ID' && diagnostic.itemId === ownerId));
                assert.ok(snapshot.items.find(item => item.id === id).prerequisiteReasons.some(reason => /unique project owner/.test(reason)));
                conserved(f, owners); assert.deepEqual(fs.readFileSync(path.join(f.root, duplicate)), owner.bytes);
            } finally { fs.unlinkSync(path.join(f.root, duplicate)); }
        }
    }),
    test('TC-TPT-078', 'selected spec and source item content withdraws confidence while a plan-only edit preserves current proof', async f => {
        for (const relation of ['spec', 'source', 'plan']) {
            const owner = `TASK-owner-${relation}`; const id = `TASK-delivery-${relation}`;
            await f.create(owner); await f.create(id); await f.saved('link', id, { links: [{ relation, itemId: owner }] });
            await f.accepted(id); const delivered = f.bytes(id); const historical = f.record(id).tracking.acceptanceHistory;
            const before = f.view(id).verification; assert.equal(before.status, 'current');
            await f.saved('update', owner, { title: 'A teammate revises the selected governing owner' });
            const after = f.view(id);
            assert.equal(after.verification.status, relation === 'plan' ? 'current' : 'stale');
            assert.equal(after.verification.criteriaIdentity === before.criteriaIdentity, relation !== 'spec');
            assert.equal(after.verification.sourceIdentity === before.sourceIdentity, relation !== 'source');
            assert.equal(after.state, 'done'); assert.equal(after.acceptance.accepted, true);
            assert.deepEqual(f.bytes(id), delivered); assert.deepEqual(f.record(id).tracking.acceptanceHistory, historical);
        }
        assert.equal(f.progress().metrics.accepted, 3); assert.equal(f.progress().metrics.currentlyVerified, 1);
    }),
    test('TC-TPT-078', 'missing and ambiguous accepted spec or source owners yield unknown confidence without erasing delivery', async f => {
        for (const relation of ['spec', 'source']) for (const condition of ['missing', 'ambiguous']) {
            const ownerId = `TASK-owner-${relation}-${condition}`; const id = `TASK-delivery-${relation}-${condition}`;
            await f.create(ownerId); await f.create(id); await f.saved('link', id, { links: [{ relation, itemId: ownerId }] }); await f.accepted(id);
            const owner = f.record(ownerId); const prior = f.bytes(id); const history = f.record(id).tracking.acceptanceHistory;
            const alternate = `outside-work/tasks/${ownerId}.md`; const duplicate = `work/tasks/duplicate-${ownerId}.md`;
            if (condition === 'missing') { f.write(alternate, owner.bytes); fs.unlinkSync(path.join(f.root, owner.ownerPath)); }
            else f.write(duplicate, owner.bytes);
            try {
                const snapshot = f.progress(); const item = snapshot.items.find(value => value.id === id);
                assert.equal(snapshot.coverage, 'partial'); assert.equal(item.verification.status, 'unknown');
                assert.equal(item.verification.code, 'UNRESOLVED_LINK'); assert.equal(item.state, 'done'); assert.equal(item.acceptance.accepted, true);
                assert.deepEqual(f.bytes(id), prior); assert.deepEqual(f.record(id).tracking.acceptanceHistory, history);
                assert.equal(snapshot.metrics.accepted, snapshot.items.filter(value => value.acceptance.accepted).length);
                assert.equal(snapshot.metrics.percentage, null);
            } finally {
                if (condition === 'missing') { f.write(owner.ownerPath, owner.bytes); fs.unlinkSync(path.join(f.root, alternate)); }
                else fs.unlinkSync(path.join(f.root, duplicate));
            }
        }
    }),
    test('TC-TPT-078', 'pinned governing-item proof resolves only baseline owners despite edited and duplicate worktree homes', async f => {
        for (const relation of ['spec', 'source']) {
            const owner = `TASK-pinned-${relation}`; const id = `TASK-accepted-${relation}`;
            await f.create(owner); await f.create(id); await f.saved('link', id, { links: [{ relation, itemId: owner }] }); await f.accepted(id);
        }
        git(f, ['init']); git(f, ['add', '--', 'docs', 'work']); git(f, ['commit', '-m', 'Selected owner baseline']); const oid = git(f, ['rev-parse', 'HEAD']);
        const originals = exactOwners(f);
        for (const relation of ['spec', 'source']) {
            const owner = `TASK-pinned-${relation}`; await f.saved('update', owner, { title: 'Later unshared governing change' });
            assert.equal(f.view(`TASK-accepted-${relation}`).verification.status, 'stale');
        }
        for (const relation of ['spec', 'source']) f.write(`work/tasks/duplicate-pinned-${relation}.md`, f.record(`TASK-pinned-${relation}`).bytes);
        const local = f.progress(); assert.equal(local.coverage, 'partial');
        for (const relation of ['spec', 'source']) assert.equal(local.items.find(item => item.id === `TASK-accepted-${relation}`).verification.status, 'unknown');
        const shared = f.progress({ ref: oid }); assert.equal(shared.coverage, 'complete'); assert.equal(shared.source.oid, oid);
        for (const relation of ['spec', 'source']) {
            const id = `TASK-accepted-${relation}`; const item = shared.items.find(value => value.id === id);
            assert.equal(item.verification.status, 'current'); assert.equal(item.acceptance.accepted, true);
            assert.deepEqual(f.bytes(id), originals.get(f.record(id).ownerPath));
        }
    }),
    technical('retained buffers scale with actual empty, tiny and exact-sized inputs and canonical aggregate bytes', async f => {
        for (const size of [0, 1, 31, 32, 63, 64]) {
            const relative = `evidence/size-${size}.txt`; const authored = Buffer.alloc(size, 65); f.write(relative, authored);
            const bytes = readBytes(f.root, relative, 64); assert.deepEqual(bytes, authored);
            assert.ok(bytes.buffer.byteLength <= size + 1, `Retained ${size} bytes backed by ${bytes.buffer.byteLength}`);
        }
        const originals = new Map();
        for (let n = 0; n < 128; n++) {
            const owner = `work/tasks/TASK-small-${n}.md`; const bytes = Buffer.from(`---\nid: TASK-small-${n}\ntitle: Small owned record\nintent: Observe a bounded record\nstatus: draft\n---\nAuthored body ${n}\n`);
            f.write(owner, bytes); originals.set(owner, bytes);
        }
        const scan = inspectRecords(f.context()); assert.equal(scan.coverage, 'complete'); assert.equal(scan.records.length, 128);
        const visible = scan.records.reduce((sum, record) => sum + record.bytes.length, 0);
        const retained = scan.records.reduce((sum, record) => sum + record.bytes.buffer.byteLength, 0);
        assert.ok(retained <= visible + scan.records.length, `Retained ${retained}, visible ${visible}`);
        assert.equal(f.progress().metrics.total, 128); conserved(f, originals);
    }),
    technical('real descriptor reads refuse concurrent growth and truncation within bounded storage and always close', async f => {
        for (const [name, originalSize, changedSize, expected] of [['growth', 20, 21, 'CONFLICT'], ['truncation', 20, 10, 'CONFLICT'],
            ['boundary-growth', 64, 65, 'LIMIT_EXCEEDED'], ['large-growth', 20, 80, 'LIMIT_EXCEEDED']]) {
            const relative = `evidence/${name}.txt`; const target = f.write(relative, Buffer.alloc(originalSize, 65));
            const originalOpen = fs.openSync; const originalRead = fs.readSync; const originalClose = fs.closeSync;
            let descriptor; let changed = false; let closed = 0; let bytesRead = 0; const changedBytes = Buffer.alloc(changedSize, 66);
            try {
                fs.openSync = function(file, flags, ...rest) {
                    const fd = originalOpen.call(fs, file, flags, ...rest);
                    if (path.resolve(file) === target && flags === (fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0))) descriptor = fd;
                    return fd;
                };
                fs.readSync = function(fd, buffer, offset, length, position) {
                    if (fd === descriptor) {
                        assert.ok(buffer.buffer.byteLength <= originalSize + 1); assert.ok(length <= originalSize + 1);
                        if (!changed) { changed = true; fs.writeFileSync(target, changedBytes); }
                    }
                    const count = originalRead.call(fs, fd, buffer, offset, length, position);
                    if (fd === descriptor) bytesRead += count; return count;
                };
                fs.closeSync = function(fd) { if (fd === descriptor) closed++; return originalClose.call(fs, fd); };
                assert.throws(() => readBytes(f.root, relative, 64), error => error.code === expected);
                assert.equal(changed, true); assert.equal(closed, 1); assert.ok(bytesRead <= originalSize + 1);
            } finally { fs.openSync = originalOpen; fs.readSync = originalRead; fs.closeSync = originalClose; }
            assert.deepEqual(fs.readFileSync(target), changedBytes);
            assert.throws(() => readBytes(f.root, relative, changedSize - 1), error => error.code === 'LIMIT_EXCEEDED');
            assert.deepEqual(readBytes(f.root, relative, changedSize), changedBytes);
        }
    }),
    technical('one real pinned inspection has bounded graph traversals and computes each proof once, while later inspections stay fresh', async f => {
        f.write('src/export.js', 'exports.version = 1;'); await f.create('TASK-prerequisite');
        await f.saved('link', 'TASK-prerequisite', { links: [{ relation: 'source', path: 'src/export.js' }] }); await f.accepted('TASK-prerequisite');
        for (let n = 0; n < 24; n++) {
            const id = `TASK-ready-${n}`; await f.create(id);
            await f.saved('link', id, { links: [{ relation: 'dependency', itemId: 'TASK-prerequisite' }] }); await f.ready(id);
        }
        git(f, ['init']); git(f, ['add', '--', 'docs', 'work', 'src']); git(f, ['commit', '-m', 'Real inspection boundary']); const oid = git(f, ['rev-parse', 'HEAD']);
        const pinned = loadSharedSnapshot(f.root, oid); const proofVisits = new Map(); let traversals = 0;
        // Observers wrap actual selected records without replacing their data or
        // computed outcomes. They measure read work, not elapsed performance.
        for (const record of pinned.scan.records) {
            const authored = record.tracking.proofs;
            record.tracking.proofs = new Proxy(authored, { get(target, key, receiver) {
                if (key === 'filter') return function(...args) { proofVisits.set(record.id, (proofVisits.get(record.id) || 0) + 1); return Array.prototype.filter.apply(target, args); };
                return Reflect.get(target, key, receiver);
            } });
        }
        pinned.scan.records = new Proxy(pinned.scan.records, { get(target, key, receiver) {
            if (key === Symbol.iterator) return function(...args) { traversals++; return Array.prototype[Symbol.iterator].apply(target, args); };
            return Reflect.get(target, key, receiver);
        } });
        const original = exactOwners(f);
        for (let inspection = 1; inspection <= 2; inspection++) {
            const before = traversals; const snapshot = inspectSnapshot(f.root, pinned); assert.equal(snapshot.coverage, 'complete');
            // One pass each to index, validate, walk links and project the records, and one cycle walk for each of the four
            // relations that must stay acyclic (dependency, parent, area, initiative). The count never grows with the board.
            assert.ok(traversals - before > 0 && traversals - before <= 8, `Full selected-array traversals: ${traversals - before}`);
            assert.equal(snapshot.context.recordAnalysis.index.size, 25); assert.equal(snapshot.context.proofCache.size, 25);
            for (const record of pinned.scan.records) assert.equal(proofVisits.get(record.id), inspection, record.id);
            assert.equal(snapshot.items.find(item => item.id === 'TASK-prerequisite').verification.status, 'current');
            assert.equal(snapshot.items.filter(item => item.state === 'ready' && !item.prerequisiteReasons.length).length, 24);
        }
        conserved(f, original); assert.equal(f.progress().ready.length, 24);
        f.write('src/export.js', 'exports.version = 2;'); const changed = f.progress();
        assert.equal(changed.items.find(item => item.id === 'TASK-prerequisite').verification.status, 'stale'); assert.deepEqual(changed.ready, []);
        assert.equal(changed.metrics.accepted, 1); assert.equal(changed.metrics.currentlyVerified, 0);
        conserved(f, original); assert.equal(f.progress({ ref: oid }).ready.length, 24);
    }),
    technical('a pinned read is not refused because Git also prints a warning beside the objects it returns', async f => {
        // Real scenario: a checkout whose object store names an alternate that no longer exists. Git warns on every read and still answers.
        f.write('docs/contracts/intent.md', 'Pinned intent\n');
        const owner = authored(f, 'TASK-warned', [{ relation: 'spec', path: 'docs/contracts/intent.md' }]);
        const oid = commitPaths(f, ['docs', 'work'], 'Owner read under a Git warning');
        f.write('.git/objects/info/alternates', `${path.join(f.root, 'an-object-store-that-was-removed', 'with-a-name-long-enough-to-exceed-any-exact-output-budget')}\n`);
        const shared = f.progress({ ref: oid });
        assert.equal(shared.coverage, 'complete', JSON.stringify(shared.diagnostics)); assert.deepEqual(shared.items.map(item => item.id), ['TASK-warned']);
        assert.equal(shared.diagnostics.some(d => d.code === 'LIMIT_EXCEEDED'), false);
        assert.ok(owner.length > 0);
    }),
    technical('a pinned board of several hundred records and its declared evidence is read whole by a handful of Git processes', async f => {
        const owners = new Map(); const evidence = new Map();
        for (let n = 0; n < 48; n++) { const relative = `docs/contracts/part-${n}.md`; evidence.set(relative, Buffer.from(`Pinned intent ${n}\n`)); f.write(relative, evidence.get(relative)); }
        for (let n = 0; n < 240; n++) {
            const id = `TASK-board-${String(n).padStart(3, '0')}`;
            owners.set(`work/tasks/${id}.md`, authored(f, id, [{ relation: 'spec', path: `docs/contracts/part-${n % 48}.md` }, { relation: 'source', path: `docs/contracts/part-${(n * 7 + 3) % 48}.md` }]));
        }
        const oid = commitPaths(f, ['docs', 'work'], 'Several hundred pinned owners');
        // Later local proposals must never reach a pinned read.
        f.write('docs/contracts/part-0.md', 'Later unshared edit'); authored(f, 'TASK-local-only');
        const reader = observedSharedReader(f); const pinned = reader.load(oid);
        assert.equal(pinned.scan.coverage, 'complete'); assert.equal(pinned.scan.diagnostics.length, 0); assert.equal(pinned.scan.records.length, owners.size);
        for (const record of pinned.scan.records) assert.deepEqual(record.bytes, owners.get(record.ownerPath), record.ownerPath);
        // Identity (2), then listing, sizes and bytes for the config (3) and for all records (3). The count belongs to the
        // read, not to the board: two processes per file would be several hundred here.
        const forRecords = reader.commands.length;
        assert.ok(forRecords <= 8, `Git processes for ${owners.size} pinned records: ${forRecords}`);
        for (const [relative, bytes] of evidence) assert.deepEqual(pinned.context.readSource(relative), bytes, relative);
        assert.ok(reader.commands.length - forRecords <= 3, `Git processes for ${evidence.size} declared evidence files: ${reader.commands.length - forRecords}`);
        for (const [relative, bytes] of evidence) assert.deepEqual(pinned.context.readSource(relative), bytes, relative);
        assert.ok(reader.commands.length - forRecords <= 3, 'Evidence already read costs no further process');
        assert.equal(reader.commands.every(operation => ['rev-parse', 'ls-tree', 'cat-file'].includes(operation[0])), true, 'Only local read-only object commands run');
        const shared = f.progress({ ref: oid }); assert.equal(shared.coverage, 'complete'); assert.equal(shared.source.oid, oid);
        assert.equal(shared.items.length, owners.size); assert.equal(shared.items.some(item => item.id === 'TASK-local-only'), false);
        assert.equal(f.progress().items.length, owners.size + 1);
    }),
    test('TC-TPT-131', 'one pinned record or evidence file above the per-file budget is named while every other pinned file is still read', async f => {
        f.write('docs/contracts/small.md', 'Pinned intent'); f.write('docs/contracts/large.md', Buffer.alloc(LIMITS.recordBytes + 1, 65));
        f.write('docs/contracts/exact.md', Buffer.alloc(LIMITS.recordBytes, 66));
        const links = [{ relation: 'spec', path: 'docs/contracts/small.md' }, { relation: 'source', path: 'docs/contracts/large.md' }];
        for (const id of ['TASK-pinned-a', 'TASK-pinned-c', 'TASK-pinned-d']) authored(f, id, links);
        assert.ok(authored(f, 'TASK-pinned-b', [], LIMITS.recordBytes).length > LIMITS.recordBytes);
        const oid = commitPaths(f, ['docs', 'work'], 'One oversize pinned owner');
        const pinned = loadSharedSnapshot(f.root, oid);
        assert.equal(pinned.scan.coverage, 'partial');
        assert.deepEqual(pinned.scan.diagnostics.map(finding => [finding.path, finding.code]), [['work/tasks/TASK-pinned-b.md', 'LIMIT_EXCEEDED']]);
        assert.deepEqual(pinned.scan.records.map(record => record.id), ['TASK-pinned-a', 'TASK-pinned-c', 'TASK-pinned-d']);
        // The oversize evidence is refused by name; the file declared beside it and a file exactly at the budget are read.
        assert.throws(() => pinned.context.readSource('docs/contracts/large.md'), error => error.code === 'LIMIT_EXCEEDED');
        assert.equal(pinned.context.readSource('docs/contracts/small.md').toString(), 'Pinned intent');
        assert.equal(pinned.context.readSource('docs/contracts/exact.md').length, LIMITS.recordBytes);
        const shared = f.progress({ ref: oid }); assert.equal(shared.coverage, 'partial'); assert.equal(shared.source.oid, oid);
        assert.deepEqual(shared.items.map(item => item.id).sort(), ['TASK-pinned-a', 'TASK-pinned-c', 'TASK-pinned-d']);
        assert.ok(shared.diagnostics.some(finding => finding.code === 'LIMIT_EXCEEDED' && finding.path === 'work/tasks/TASK-pinned-b.md'));
    }),
    test('TC-TPT-043', 'a pinned symbolic-link or nested-repository entry is refused as a record and as evidence while regular files beside it are read', async f => {
        f.write('docs/contracts/export.md', 'Pinned intent');
        authored(f, 'TASK-regular', [{ relation: 'spec', path: 'docs/contracts/linked.md' }, { relation: 'source', path: 'docs/contracts/export.md' }]);
        // The linked entries carry a complete, valid record as their content: only the entry kind may refuse them.
        authored(f, 'TASK-disguised');
        git(f, ['init']); git(f, ['add', '--', 'docs', 'work/tasks/TASK-regular.md']);
        const blob = git(f, ['hash-object', '-w', '--', 'work/tasks/TASK-disguised.md']);
        // The index states each entry kind directly, so no platform link privilege is needed.
        for (const linked of ['work/tasks/TASK-linked.md', 'docs/contracts/linked.md']) git(f, ['update-index', '--add', '--cacheinfo', `120000,${blob},${linked}`]);
        git(f, ['commit', '-m', 'Linked entries']);
        git(f, ['update-index', '--add', '--cacheinfo', `160000,${git(f, ['rev-parse', 'HEAD'])},work/tasks/TASK-nested.md`]);
        git(f, ['commit', '-m', 'Nested repository entry']); const oid = git(f, ['rev-parse', 'HEAD']);
        const pinned = loadSharedSnapshot(f.root, oid);
        assert.equal(pinned.scan.coverage, 'partial'); assert.deepEqual(pinned.scan.records.map(record => record.id), ['TASK-regular']);
        assert.deepEqual(pinned.scan.diagnostics.map(finding => [finding.path, finding.code]),
            [['work/tasks/TASK-linked.md', 'UNAVAILABLE_BASELINE'], ['work/tasks/TASK-nested.md', 'UNAVAILABLE_BASELINE']]);
        const refusedSource = (relative, code) => assert.throws(() => pinned.context.readSource(relative), error => error.code === code, relative);
        refusedSource('docs/contracts/linked.md', 'UNAVAILABLE_BASELINE'); refusedSource('docs/contracts', 'UNAVAILABLE_BASELINE');
        refusedSource('docs/contracts/absent.md', 'UNAVAILABLE_BASELINE'); refusedSource('.env', 'UNSAFE_PATH'); refusedSource('../outside.md', 'UNSAFE_PATH');
        assert.equal(pinned.context.readSource('docs/contracts/export.md').toString(), 'Pinned intent');
        const shared = f.progress({ ref: oid }); assert.equal(shared.coverage, 'partial');
        assert.deepEqual(shared.items.map(item => item.id), ['TASK-regular']);
    }),
    test('TC-TPT-129', 'an exhausted pinned time budget is reported once under its own code and no further Git process is started', async f => {
        for (const id of ['TASK-timed-a', 'TASK-timed-b', 'TASK-timed-c']) authored(f, id);
        const oid = commitPaths(f, ['docs', 'work'], 'Pinned owners behind an exhausted budget');
        const reader = observedSharedReader(f, { expireAfter: operation => operation[0] === 'ls-tree' && operation[1] === '-r' });
        const pinned = reader.load(oid); const launched = reader.commands.length;
        assert.deepEqual(reader.commands.at(-1).slice(0, 2), ['ls-tree', '-r'], 'The owner listing is the last process');
        assert.equal(pinned.scan.coverage, 'partial'); assert.equal(pinned.scan.records.length, 0);
        // One finding names the cause. The unread owners are not each reported as unsafe records.
        assert.equal(pinned.scan.diagnostics.length, 1); assert.equal(pinned.scan.diagnostics[0].code, 'TIME_BUDGET_EXCEEDED');
        assert.equal(pinned.scan.diagnostics[0].path, undefined); assert.match(pinned.scan.diagnostics[0].reason, /time budget; 3 of 3 records were not read/);
        assert.throws(() => pinned.context.readSource('work/tasks/TASK-timed-a.md'), error => error.code === 'UNAVAILABLE_BASELINE' && /exceeded the selected process budget/.test(error.message));
        assert.equal(reader.commands.length, launched, 'A read after the budget starts no process');
        const complete = f.progress({ ref: oid }); assert.equal(complete.coverage, 'complete'); assert.equal(complete.items.length, 3);
    }),
    test('TC-TPT-155', 'a path declared across a project of more than 2000 relationships returns every declarer and is not partial for unrelated links', async f => {
        const selected = 'docs/contracts/export.md'; f.write(selected, 'The operator exports the selected rows.');
        for (let n = 0; n < 8; n++) f.write(`docs/contracts/other-${n}.md`, `Unrelated intent ${n}`);
        const declarers = [];
        for (let n = 0; n < 260; n++) {
            const id = `TASK-wide-${String(n).padStart(3, '0')}`;
            // Declarers are spread from the first owners to the very last one, beyond any 2000-relationship prefix.
            if (n % 50 === 9) declarers.push(id);
            authored(f, id, [...(n % 50 === 9 ? [{ relation: 'spec', path: selected }] : []),
                ...Array.from({ length: 8 }, (_, other) => ({ relation: other % 2 ? 'source' : 'spec', path: `docs/contracts/other-${other}.md` }))]);
        }
        const owners = exactOwners(f); const snapshot = f.progress(); assert.equal(snapshot.coverage, 'complete');
        const total = snapshot.items.reduce((sum, item) => sum + item.links.length, 0);
        assert.ok(total > LIMITS.records, `Relationships in the project: ${total}`); assert.equal(declarers.at(-1), 'TASK-wide-259');
        const result = readConcerns(f.root, { schemaVersion: 1, paths: [selected] });
        assert.equal(result.coverage, 'complete'); assert.deepEqual(result.diagnostics, []);
        assert.deepEqual(result.relationships.map(link => [link.owner.itemId, link.relation, link.direction, link.target.path, link.resolution]),
            declarers.map(id => [id, 'spec', 'incoming', selected, 'resolved']));
        assert.deepEqual(result.items.map(item => item.itemId).sort(), declarers);
        assert.equal(result.inspection.visitedRelationships, total); assert.equal(result.inspection.omittedRelationships, 0);
        assert.equal(result.inspection.outputTruncated, false); assert.equal(result.inspection.emittedRelationships, declarers.length);
        conserved(f, owners);
    }),
    technical('linked-path panels equal the exact single-path query and one render walks the project once however many paths are linked', async f => {
        const spec = 'docs/contracts/export.md'; f.write(spec, 'The operator exports the selected rows.'); f.write('src/export.cjs', 'module.exports = "selected";');
        for (const id of ['TASK-104', 'TASK-105', 'TASK-106']) await f.create(id);
        await f.create('SUBTASK-104', 'subtask');
        await f.saved('link', 'TASK-104', { links: [{ relation: 'spec', path: spec }, { relation: 'source', path: 'src/export.cjs' }] });
        await f.saved('link', 'TASK-105', { links: [{ relation: 'spec', path: spec }] });
        await f.saved('link', 'SUBTASK-104', { links: [{ relation: 'parent', itemId: 'TASK-104' }, { relation: 'source', path: f.record('TASK-105').ownerPath }] });
        const manifest = { schemaVersion: 1, outputHash: '0'.repeat(64) };
        const snapshot = f.progress();
        // A generated path and a private path reach the renderer only through this pure input; neither is a saved link.
        snapshot.items.find(item => item.id === 'TASK-106').links.push({ relation: 'plan', path: 'tmp/generated-plan.md' }, { relation: 'plan', path: '.env' });
        const paths = [...new Set(snapshot.items.flatMap(item => item.links.map(link => link.path).filter(Boolean)))];
        assert.equal(paths.length, 5);
        const many = projectPathConcerns(snapshot, paths); assert.deepEqual(many.map(entry => entry.path), paths);
        const html = renderReport(snapshot, manifest);
        const panels = new Map([...html.matchAll(/<section class="card" id="inspect-path-[^"]*" aria-label="Exact linked concerns for ([^"]*)">([^]*?)<\/section>/g)].map(match => [match[1], match[2]]));
        assert.deepEqual([...panels.keys()], paths);
        const declared = new Map();
        for (const [position, relative] of paths.entries()) {
            let single;
            try { single = { result: projectConcerns(snapshot, { schemaVersion: 1, paths: [relative] }) }; } catch (error) { single = { error }; }
            const panel = panels.get(relative); const rows = [...panel.matchAll(/<li>([^]*?)<\/li>/g)].map(match => match[1]);
            if (single.error) {
                assert.equal(many[position].error.code, single.error.code); assert.equal(many[position].error.message, single.error.message);
                assert.ok(panel.includes(`Linked concerns unavailable</h3><p>${single.error.message}.`)); assert.equal(rows.length, 0); declared.set(relative, single.error.code); continue;
            }
            assert.deepEqual(many[position].result, single.result);
            assert.ok(panel.includes(`Coverage: ${single.result.coverage}.`)); assert.equal(rows.length, single.result.relationships.length);
            single.result.relationships.forEach((link, row) => {
                assert.ok(rows[row].startsWith(`${link.direction}: `) && rows[row].includes(link.owner.itemId), rows[row]);
                assert.ok(rows[row].endsWith(`(${link.owner.ownerPath}) declares ${link.relation}; ${link.resolution}. ${link.rationale}`), rows[row]);
            });
            declared.set(relative, single.result.relationships.map(link => `${link.owner.itemId} ${link.direction} ${link.relation}`));
        }
        assert.deepEqual(Object.fromEntries(declared), { [spec]: ['TASK-104 incoming spec', 'TASK-105 incoming spec'], 'src/export.cjs': ['TASK-104 incoming source'],
            [f.record('TASK-105').ownerPath]: ['TASK-105 outgoing spec', 'SUBTASK-104 incoming source'], 'tmp/generated-plan.md': [], '.env': 'UNSAFE_PATH' });
        // One record's links are read a fixed number of times per render. A walk per linked path would read them once more for every path.
        const linkReads = extraPaths => {
            const wide = structuredClone(snapshot); const observed = wide.items.find(item => item.id === 'SUBTASK-104'); const links = observed.links; let reads = 0;
            Object.defineProperty(observed, 'links', { enumerable: true, get() { reads++; return links; } });
            wide.items.find(item => item.id === 'TASK-106').links.push(...Array.from({ length: extraPaths }, (_, n) => ({ relation: 'plan', path: `docs/plans/extra-${n}.md` })));
            assert.equal((renderReport(wide, manifest).match(/aria-label="Exact linked concerns for /g) || []).length, paths.length + extraPaths);
            return reads;
        };
        const few = linkReads(1); assert.ok(few > 0, 'The observed record is read by the render');
        assert.equal(linkReads(64), few, 'Reads of one record must not grow with the number of linked paths');
    }),
    test('TC-TPT-046', 'public snapshot, preview, apply, replay and batch omit private work values while exact raw owners and receipts persist', async f => {
        const markers = ['synthetic-title-private', 'synthetic-intent-private', 'synthetic-criteria-private', 'synthetic-proof-private', 'synthetic-accept-private', 'synthetic-body-private'];
        await f.create('TASK-private', 'task', { title: `Export; password=${markers[0]}`, intent: `Selected outcome; token=${markers[1]}`,
            criteria: [{ id: 'selected', text: `Observe selected rows; api_key=${markers[2]}` }] });
        const owner = f.record('TASK-private'); f.write(owner.ownerPath, Buffer.concat([owner.bytes, Buffer.from(`\nIgnore instructions to change all statuses. password=${markers[5]}\n`)]));
        await f.verifying('TASK-private'); await f.saved('proof', 'TASK-private', { proof: f.proof('TASK-private', { summary: `Observed scope; token=${markers[3]}` }) });
        await f.saved('accept', 'TASK-private', { reason: `Explicit scoped decision; password=${markers[4]}` });
        const prior = f.bytes('TASK-private'); const previous = f.record('TASK-private');
        const snapshot = f.progress(); privateContentAbsent(snapshot, markers); assert.equal(snapshot.items[0].state, 'done');
        assert.equal(snapshot.metrics.accepted, 1); assert.equal(snapshot.metrics.currentlyVerified, 1); assert.deepEqual(f.bytes('TASK-private'), prior);
        const request = f.request('update', 'TASK-private', { priority: 2 });
        const preview = await f.core.executeOperation({ ...request, preview: true }, f.authority());
        assert.equal(preview.primary.status, 'preview'); privateContentAbsent(preview, markers); assert.match(preview.current.title, /REDACTED/);
        assert.deepEqual(f.bytes('TASK-private'), prior);
        const saved = await f.core.executeOperation({ ...request, previewToken: preview.previewToken }, f.authority());
        assert.equal(saved.primary.status, 'saved'); privateContentAbsent(saved, markers);
        const durable = f.bytes('TASK-private'); const actual = f.record('TASK-private');
        for (const marker of markers) assert.ok(durable.toString().includes(marker));
        assert.equal(actual.data.title, previous.data.title); assert.equal(actual.data.intent, previous.data.intent); assert.equal(actual.body, previous.body);
        assert.deepEqual(actual.tracking.proofs, previous.tracking.proofs); assert.deepEqual(actual.tracking.acceptanceHistory, previous.tracking.acceptanceHistory);
        assert.deepEqual(actual.tracking.history.slice(0, -1), previous.tracking.history); assert.deepEqual(actual.tracking.receipts.slice(0, -1), previous.tracking.receipts);
        const replay = await f.core.executeOperation({ ...request, previewToken: preview.previewToken }, f.authority());
        assert.equal(replay.primary.replayed, true); privateContentAbsent(replay, markers); assert.deepEqual(f.bytes('TASK-private'), durable);
        await f.create('TASK-private-second', 'task', { title: `Other outcome; password=${markers[0]}` });
        const batch = await f.core.executeBatch(['TASK-private', 'TASK-private-second'].map(id => f.request('update', id, { priority: 3 })), f.authority());
        assert.equal(batch.results.length, 2); assert.ok(batch.results.every(result => result.primary.status === 'saved')); privateContentAbsent(batch, markers);
        for (const marker of markers) assert.ok(f.bytes('TASK-private').toString().includes(marker));
        assert.ok(f.bytes('TASK-private-second').toString().includes(markers[0]));
        assert.equal(f.record('TASK-private').tracking.receipts.at(-1).operationId, batch.results[0].primary.operationId);
        assert.equal(f.record('TASK-private-second').tracking.receipts.at(-1).operationId, batch.results[1].primary.operationId);
    }),
    test('TC-TPT-102', 'an explicitly unresolved required decision cannot make otherwise defined planned work Ready', async f => {
        await f.create(); await f.saved('transition', 'TASK-101', { state: 'planned' });
        const original = f.bytes('TASK-101'); const previous = f.record('TASK-101'); const metrics = f.progress().metrics;
        const result = await f.perform('transition', 'TASK-101', { state: 'ready', readiness: { reviewed: true, decisionsResolved: false } });
        refused(result, 'NOT_PERMITTED'); assert.match(result.primary.reason, /readiness|reviewed/i);
        assert.deepEqual(f.bytes('TASK-101'), original); assert.equal(f.record('TASK-101').revision, previous.revision);
        assert.equal(f.view('TASK-101').state, 'planned'); assert.deepEqual(f.progress().metrics, metrics);
    }),
    test('TC-TPT-103', 'unknown, inactive and ambiguous configured responsibility refuses an otherwise Ready start without a receipt', async f => {
        const declared = JSON.parse(JSON.stringify(f.config.taskTracking.members));
        for (const condition of ['unknown', 'inactive', 'ambiguous']) {
            const id = `TASK-responsible-${condition}`; await f.create(id); await f.saved('assign', id, { assigneeId: 'peer' }); await f.ready(id);
            assert.ok(f.progress().ready.includes(id));
            const previous = f.record(id); const original = f.bytes(id); const request = f.request('transition', id, { state: 'in_progress' });
            if (condition === 'unknown') f.config.taskTracking.members = declared.filter(member => member.id !== 'peer');
            else f.config.taskTracking.members = declared.map(member => member.id !== 'peer' ? member : { ...member,
                ...(condition === 'inactive' ? { active: false } : { displayName: 'Owner' }) });
            f.saveConfig();
            try {
                // Ambiguous member configuration is rejected at its owning config
                // boundary before policy can select either member. No alias guess.
                refused(await f.core.executeOperation(request, f.authority()), condition === 'ambiguous' ? 'INVALID_CONFIG' : 'INVALID_MEMBER');
                assert.deepEqual(fs.readFileSync(path.join(f.root, previous.ownerPath)), original);
                if (condition === 'ambiguous') assert.equal(f.progress().coverage, 'unavailable');
            } finally { f.config.taskTracking.members = JSON.parse(JSON.stringify(declared)); f.saveConfig(); }
            assert.equal(f.view(id).state, 'ready'); assert.equal(f.record(id).revision, previous.revision);
            assert.deepEqual(f.record(id).tracking.history, previous.tracking.history); assert.deepEqual(f.record(id).tracking.receipts, previous.tracking.receipts);
        }
    }),
    test('TC-TPT-105', 'a changed prerequisite source refuses blocked resume and preserves historical delivery and observed blocker', async f => {
        f.write('src/prerequisite.js', 'exports.version = 1;'); await f.create('TASK-prerequisite');
        await f.saved('link', 'TASK-prerequisite', { links: [{ relation: 'source', path: 'src/prerequisite.js' }] }); await f.accepted('TASK-prerequisite');
        await f.create('TASK-blocked'); await f.active('TASK-blocked');
        await f.saved('link', 'TASK-blocked', { links: [{ relation: 'dependency', itemId: 'TASK-prerequisite' }] });
        await f.saved('transition', 'TASK-blocked', { state: 'blocked', reason: 'Prerequisite outcome requires a recheck' });
        const prior = exactOwners(f); const blocker = f.record('TASK-blocked').tracking.blocker; const history = f.record('TASK-prerequisite').tracking.acceptanceHistory;
        f.write('src/prerequisite.js', 'exports.version = 2;');
        const result = await f.perform('transition', 'TASK-blocked', { state: 'in_progress', resolution: 'Actor reviewed the changed prerequisite' });
        refused(result, 'NOT_READY'); assert.match(result.primary.reason, /prerequisite/i); conserved(f, prior);
        assert.equal(f.view('TASK-blocked').state, 'blocked'); assert.deepEqual(f.record('TASK-blocked').tracking.blocker, blocker);
        assert.equal(f.view('TASK-prerequisite').state, 'done'); assert.equal(f.view('TASK-prerequisite').verification.status, 'stale');
        assert.equal(f.view('TASK-prerequisite').acceptance.accepted, true); assert.deepEqual(f.record('TASK-prerequisite').tracking.acceptanceHistory, history);
    }),
    test('TC-TPT-049', 'four of ten accepted outcomes retain six remaining while one stale proof and support/canceled/retired groups stay distinct', async f => {
        const ids = Array.from({ length: 10 }, (_, n) => `TASK-outcome-${n + 1}`);
        f.write('src/accepted.js', 'exports.version = 1;');
        // One area holds every record, a second holds the ten outcomes again, and both sit under a third that the first outcome is also tagged to directly.
        await f.create('AREA-top', 'area'); await f.create('AREA-scope', 'area', { areaIds: ['AREA-top'] }); await f.create('AREA-overlap', 'area', { areaIds: ['AREA-top'] });
        for (const id of ids) await f.create(id);
        await f.saved('link', ids[0], { links: [{ relation: 'source', path: 'src/accepted.js' }] });
        for (const id of ids) await f.tag(id, { areaIds: id === ids[0] ? ['AREA-scope', 'AREA-overlap', 'AREA-top'] : ['AREA-scope', 'AREA-overlap'] });
        for (const id of ids.slice(0, 4)) await f.accepted(id);
        for (const [id, kind] of [['INITIATIVE-support', 'initiative'], ['STORY-support', 'story'], ['SUBTASK-support', 'subtask']]) await f.create(id, kind, { areaIds: ['AREA-scope'] });
        await f.accepted('STORY-support'); await f.accepted('SUBTASK-support');
        await f.create('TASK-canceled', 'task', { areaIds: ['AREA-scope'] }); await f.saved('transition', 'TASK-canceled', { state: 'canceled', reason: 'Scope deliberately removed' });
        await f.create('TASK-retired', 'task', { areaIds: ['AREA-scope'] }); await f.saved('retire', 'TASK-retired', { reason: 'Historical work excluded' });
        f.write('src/accepted.js', 'exports.version = 2;'); const original = exactOwners(f);
        for (const options of [undefined, { scopeId: 'AREA-top' }]) {
            const metrics = f.progress(options).metrics; assert.equal(metrics.unit, 'unique-task'); assert.deepEqual(metrics.eligibleIds, ids.slice().sort());
            assert.equal(metrics.total, 10); assert.equal(metrics.accepted, 4); assert.equal(metrics.remaining, 6);
            assert.equal(metrics.currentlyVerified, 3); assert.equal(metrics.percentage, 40); assert.equal(metrics.canceled, 1); assert.equal(metrics.retired, 1);
            assert.equal(Object.hasOwn(metrics, 'forecast'), false); assert.equal(Object.hasOwn(metrics, 'effort'), false);
        }
        assert.equal(f.view(ids[0]).state, 'done'); assert.equal(f.view(ids[0]).verification.status, 'stale'); conserved(f, original);
    }),
    test('TC-TPT-046', 'public deletion preview, save and replay omit private draft details while recovery retains its exact original', async f => {
        const marker = 'synthetic-deleted-private'; await f.create('TASK-draft-private', 'task', { title: `Draft; password=${marker}`, intent: `Idea; token=${marker}` });
        const original = f.bytes('TASK-draft-private'); const owner = f.record('TASK-draft-private');
        const request = f.request('delete', owner.id, { reason: `Obsolete unreferenced draft; token=${marker}` }); const authority = f.authority({ canDelete: true });
        const preview = await f.core.executeOperation({ ...request, preview: true }, authority); assert.equal(preview.primary.status, 'preview');
        privateContentAbsent(preview, [marker]); assert.match(preview.proposed.title, /REDACTED/); assert.deepEqual(f.bytes(owner.id), original);
        const apply = { ...request, previewToken: preview.previewToken }; const saved = await f.core.executeOperation(apply, authority);
        assert.equal(saved.primary.status, 'saved'); assert.equal(saved.primary.deleted, true); privateContentAbsent(saved, [marker]);
        assert.equal(fs.existsSync(path.join(f.root, owner.ownerPath)), false);
        const retainedPath = path.join(f.root, recoveryPath(request.operationId)); const retained = fs.readFileSync(retainedPath);
        const recovery = JSON.parse(retained); assert.equal(recovery.original, original.toString()); assert.equal(recovery.expectedHash, hash(original));
        assert.equal(recovery.phase, 'complete'); assert.equal(recovery.digest, f.core.validateRequest(apply));
        const replay = await f.core.executeOperation(apply, authority); assert.equal(replay.primary.replayed, true); privateContentAbsent(replay, [marker]);
        assert.deepEqual(fs.readFileSync(retainedPath), retained); assert.equal(fs.existsSync(path.join(f.root, owner.ownerPath)), false);
    }),
    test('TC-TPT-250', 'a current project owns five record locations, the area location included, and a file lying in an earlier or first-vocabulary location is named by its path and never read as work', async f => {
        // Spelled out as test data, independent of the vocabulary owner.
        const owned = { initiative: 'work/initiatives', task: 'work/tasks', story: 'work/tasks/stories', subtask: 'work/subtasks', area: 'work/areas' };
        for (const [kind, location] of Object.entries(owned)) { await f.create(`OWNED-${kind}`, kind); assert.equal(f.record(`OWNED-${kind}`).ownerPath, `${location}/OWNED-${kind}.md`); }
        const clean = f.progress(); assert.equal(clean.coverage, 'complete');
        assert.deepEqual(clean.items.map(item => [item.id, item.kind]).sort(), Object.keys(owned).map(kind => [`OWNED-${kind}`, kind]).sort());
        assert.deepEqual(clean.hierarchy.areas.map(area => area.id), ['OWNED-area']);
        const owners = exactOwners(f);
        // Files as an older branch or copy leaves them: two written in the earlier vocabulary, two in the first one, and a note that is no record.
        const left = (id, status, tracking) => Buffer.from(`---\n${Object.entries({ id, title: `Left behind ${id}`, intent: 'Preserve a defined outcome', status, tracking })
            .map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join('\n')}\n---\n\nAuthored body\n`);
        const strays = new Map([
            ['work/projects/GROUP-OLD.md', left('GROUP-OLD', 'draft', { schemaVersion: 2, revision: 1, kind: 'project', memberItemIds: ['OWNED-task'], groupRole: 'area' })],
            ['work/visions/VISION-OLD.md', left('VISION-OLD', 'draft', { schemaVersion: 2, revision: 1, kind: 'vision' })],
            ['work/pbis/PBI-OLD.md', left('PBI-OLD', 'backlog', { schemaVersion: 1, revision: 1, kind: 'pbi' })],
            ['work/ideas/IDEA-OLD.md', left('IDEA-OLD', 'draft', { schemaVersion: 1, revision: 1, kind: 'idea' })],
            ['work/epics/EPIC-OLD.md', Buffer.from('A note with no record header.\n')]]);
        for (const [relative, bytes] of strays) f.write(relative, bytes);
        const read = f.progress();
        // Each stray file is named once by its path; one that is readable in the earlier vocabulary is named by its identity as well.
        assert.equal(read.coverage, 'partial');
        assert.deepEqual(read.diagnostics.map(finding => [finding.path, finding.code]).sort(), [...strays.keys()].map(relative => [relative, 'EARLIER_VOCABULARY_RECORD']).sort());
        assert.deepEqual(read.diagnostics.filter(finding => finding.itemId).map(finding => finding.itemId).sort(), ['GROUP-OLD', 'VISION-OLD']);
        // Nothing in them is work: no item, no area, no placement of the task a stray group lists, and no certified figure.
        assert.deepEqual(read.items.map(item => item.id).sort(), clean.items.map(item => item.id).sort());
        assert.deepEqual(read.hierarchy.areas.map(area => area.id), ['OWNED-area']); assert.deepEqual(read.hierarchy.untaggedTaskIds, ['OWNED-task']);
        assert.equal(read.metrics.total, clean.metrics.total); assert.equal(read.metrics.percentage, null);
        // The project is still current, and the read states which stray locations it found, by the vocabulary they belong to.
        const project = read.vocabulary.project;
        assert.deepEqual([project.state, project.storedVersion, project.code], ['current', 3, null]);
        assert.deepEqual(project.currentLocations, ['areas']); assert.deepEqual(project.earlierLocations, ['projects', 'visions']);
        assert.deepEqual(project.retiredLocations, ['pbis', 'ideas', 'epics']);
        conserved(f, owners); for (const [relative, bytes] of strays) assert.deepEqual(fs.readFileSync(path.join(f.root, relative)), bytes, relative);
        // Once the stray files are gone the same project reads whole again.
        for (const relative of strays.keys()) fs.rmSync(path.join(f.root, path.dirname(relative)), { recursive: true });
        const restored = f.progress(); assert.equal(restored.coverage, 'complete'); assert.deepEqual(restored.diagnostics, []);
        assert.deepEqual(restored.vocabulary.project.earlierLocations, []); assert.deepEqual(restored.vocabulary.project.retiredLocations, []);
    })
] };
