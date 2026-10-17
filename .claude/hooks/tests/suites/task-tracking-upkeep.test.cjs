'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const { trackingTest: test, refused, OBSERVED_AT } = require('../lib/task-tracking-fixture.cjs');
const upkeep = require('../../lib/task-tracking-upkeep.cjs');
const { hash } = require('../../lib/task-tracking-files.cjs');

const OBSERVER_PATH = path.resolve(__dirname, '../../task-tracking-observer.cjs');
const CLI_PATH = path.resolve(__dirname, '../../../skills/task-track/scripts/task-track.cjs');
const PRIMARY = { status: 'saved', artifact: 'src/export.js', outcome: 'The source save succeeded' };

function observation(overrides = {}) { return { kind: 'saved', observedAt: OBSERVED_AT, summary: 'Observed source save', paths: ['src/export.js'], ...overrides }; }
function linked(f, options = {}) {
    return upkeep.linkSession({ root: f.root, sessionId: 'actual-session', actor: 'owner', producer: 'feature', itemIds: ['TASK-101'], ...options });
}
function checkpoint(f, options = {}) {
    return upkeep.checkpoint({ root: f.root, sessionId: 'actual-session', actor: 'owner', producer: 'feature', checkpointId: 'actual-checkpoint',
        primary: PRIMARY, observation: observation(), ...options });
}
function event(f, overrides = {}) {
    return { hook_event_name: 'PostToolUse', session_id: 'actual-session', cwd: f.root, tool_name: 'Write',
        tool_input: { file_path: path.join(f.root, 'src/export.js') }, tool_response: { success: true }, ...overrides };
}
function observe(f, value) {
    f.write('.claude/fixture.marker', 'test-owned project marker');
    const child = spawnSync(process.execPath, [OBSERVER_PATH], { cwd: f.root, env: { ...process.env }, shell: false,
        input: JSON.stringify(value), encoding: 'utf8', timeout: 5000, maxBuffer: 65536 });
    assert.equal(child.error, undefined, child.error?.message); assert.equal(child.status, 0, child.stderr);
    return { text: child.stdout, value: child.stdout.trim() ? JSON.parse(child.stdout) : null };
}

// Load unchanged upkeep; schedule a real cooperating save at its released-lock
// boundary, after the original request is durable and before core applies it.
// Only scheduling is intercepted: policy, journal, lock, CAS and writes are real.
function upkeepBeforeApply(beforeApply) {
    const modulePath = require.resolve('../../lib/task-tracking-upkeep.cjs');
    const localRequire = createRequire(modulePath);
    const core = localRequire('./task-tracking.cjs');
    const loaded = { exports: {} };
    vm.runInNewContext(fs.readFileSync(modulePath, 'utf8'), {
        module: loaded, process, Buffer,
        require(name) {
            return name === './task-tracking.cjs' ? { ...core, async executeOperation(request, authority) {
                await beforeApply(request, authority);
                return core.executeOperation(request, authority);
            } } : localRequire(name);
        }
    }, { filename: modulePath });
    return loaded.exports;
}

module.exports = { name: 'Task tracking upkeep integration', tests: [
    test('TC-TPT-127', 'real linked producer facts add only activity and outside-host edits stale proof without guessed repair or acceptance', async f => {
        await f.create('TASK-127-control'); await f.accepted('TASK-127-control');
        const controlBytes = f.bytes('TASK-127-control'); const controlView = f.view('TASK-127-control');
        const config = new Map(['docs/project-config.json', '.claude/.ck.local.json']
            .map(relative => [relative, fs.readFileSync(path.join(f.root, relative))]));
        // Finite, explicit producer partition; this is authored coverage, not an
        // executed universal proof over all possible edits, dates or external tools.
        for (const producer of upkeep.PRODUCERS) {
            const id = `TASK-127-${producer}`; const sessionId = `127-${producer}`;
            const source = `src/127-${producer}.js`; const initial = `Actual ${producer} primary source save\n`;
            f.write(source, initial); await f.create(id);
            await f.saved('link', id, { links: [{ relation: 'source', path: source }] });
            await f.verifying(id); await f.saved('proof', id, { proof: f.proof(id) });
            const before = f.record(id); const beforeView = f.view(id);
            const otherOwners = new Map(f.records().filter(record => record.id !== id).map(record => [record.id, f.bytes(record.id)]));
            assert.equal(beforeView.verification.status, 'current'); assert.equal(beforeView.acceptance.accepted, false);
            assert.equal(beforeView.acceptance.historyCount, 0); assert.equal(beforeView.state, 'verifying');
            assert.equal((await linked(f, { producer, sessionId, itemIds: [id] })).status, 'linked');
            const linkBytes = fs.readFileSync(path.join(f.root, upkeep.linkPath(sessionId)));
            // No instrumented edit reminder is required to make a real producer's
            // explicit saved-file checkpoint meaningful; the primary file is already durable.
            const hintPath = path.join(f.root, `tmp/task-tracking/hints/${hash(sessionId)}.json`);
            assert.equal(fs.existsSync(hintPath), false);
            const primary = { status: 'saved', artifact: source, outcome: `Actual ${producer} source save retained` };
            const observed = observation({ paths: [source], summary: `Observed ${producer} saved source` });
            const result = await checkpoint(f, { producer, sessionId, checkpointId: `127-saved-${producer}`, primary, observation: observed });
            assert.equal(result.primary, primary); assert.equal(result.secondary.length, 1);
            assert.equal(result.secondary[0].itemId, id); assert.equal(result.secondary[0].status, 'saved');
            const after = f.record(id); const afterView = f.view(id);
            assert.equal(after.revision, before.revision + 1); assert.equal(after.ownerPath, before.ownerPath); assert.equal(after.body, before.body);
            assert.deepEqual(after.data, { ...before.data, tracking: after.tracking });
            assert.deepEqual(after.tracking.activity, [...(before.tracking.activity || []), observed]);
            for (const field of Object.keys(before.tracking).filter(key => !['revision', 'history', 'receipts', 'context', 'activity'].includes(key)))
                assert.deepEqual(after.tracking[field], before.tracking[field], `${producer}:${field}`);
            assert.deepEqual(after.tracking.history.slice(0, -1), before.tracking.history);
            assert.deepEqual(after.tracking.receipts.slice(0, -1), before.tracking.receipts);
            assert.equal(after.tracking.history.length, before.tracking.history.length + 1);
            assert.equal(after.tracking.receipts.length, before.tracking.receipts.length + 1);
            assert.equal(after.tracking.history.at(-1).operation, 'activity'); assert.equal(after.tracking.history.at(-1).actor, 'owner');
            assert.equal(after.tracking.history.at(-1).operationId, result.secondary[0].result.operationId);
            assert.equal(after.tracking.receipts.at(-1).operationId, result.secondary[0].result.operationId);
            assert.equal(afterView.state, 'verifying'); assert.equal(afterView.verification.status, 'current');
            assert.equal(afterView.acceptance.accepted, false); assert.equal(afterView.acceptance.historyCount, 0);
            assert.equal(f.progress().metrics.accepted, 1); assert.deepEqual(f.view('TASK-127-control'), controlView);
            assert.equal(fs.readFileSync(path.join(f.root, source), 'utf8'), initial); assert.equal(fs.existsSync(hintPath), false);
            for (const [ownerId, bytes] of otherOwners) assert.deepEqual(f.bytes(ownerId), bytes, ownerId);
            // Boundary: missing work cannot be mapped by guessing or replacing the valid link.
            await assert.rejects(linked(f, { producer, sessionId, itemIds: ['TASK-127-missing'] }), error => error.code === 'INCOMPLETE_SCOPE');
            assert.deepEqual(fs.readFileSync(path.join(f.root, upkeep.linkPath(sessionId))), linkBytes);
            const durable = f.bytes(id); const owners = new Map(f.records().map(record => [record.id, f.bytes(record.id)]));
            const missing = await checkpoint(f, { producer, sessionId, checkpointId: `127-missing-${producer}`, primary,
                observation: observation({ paths: [`src/127-missing-${producer}.js`] }) });
            assert.equal(missing.primary, primary); assert.equal(missing.secondary[0].status, 'pending');
            assert.equal(missing.secondary[0].code, 'ENOENT'); assert.match(missing.secondary[0].reason, /Primary result retained/);
            const untracked = await checkpoint(f, { producer, sessionId: `127-unmapped-${producer}`, checkpointId: '127-unmapped', primary, observation: observed });
            assert.equal(untracked.primary, primary); assert.equal(untracked.secondary[0].status, 'untracked');
            assert.match(untracked.secondary[0].reason, /Continue untracked.*exact linking/);
            for (const [ownerId, bytes] of owners) assert.deepEqual(f.bytes(ownerId), bytes, ownerId);
            // Reachable outside-host edit: an external editor changes the linked source
            // without firing an observer/checkpoint. The next permitted read owns freshness.
            const manual = `Later manual outside-host ${producer} source edit\n`; f.write(source, manual);
            const reread = f.view(id);
            assert.equal(reread.verification.status, 'stale'); assert.notEqual(reread.verification.sourceIdentity, afterView.verification.sourceIdentity);
            assert.equal(reread.verification.criteriaIdentity, afterView.verification.criteriaIdentity);
            assert.equal(reread.state, 'verifying'); assert.equal(reread.acceptance.accepted, false); assert.equal(reread.acceptance.historyCount, 0);
            assert.deepEqual(reread.proofs, afterView.proofs); assert.deepEqual(reread.history, afterView.history);
            assert.deepEqual(f.bytes(id), durable); assert.equal(fs.readFileSync(path.join(f.root, source), 'utf8'), manual);
            assert.equal(fs.existsSync(hintPath), false); assert.equal(f.progress().metrics.accepted, 1);
            for (const [ownerId, bytes] of owners) assert.deepEqual(f.bytes(ownerId), bytes, ownerId);
            for (const [relative, bytes] of config) assert.deepEqual(fs.readFileSync(path.join(f.root, relative)), bytes, relative);
            assert.deepEqual(f.bytes('TASK-127-control'), controlBytes); assert.deepEqual(f.view('TASK-127-control'), controlView);
        }
    }),
    test('TC-TPT-143', 'public canonical relationship and disposable session selection stay distinct through explicit unlink', async f => {
        const governing = 'contracts/export.md'; const intent = 'The operator exports only selected rows.\n';
        f.write(governing, intent); await f.create('TASK-104'); await f.create('TASK-unrelated');
        const original = f.record('TASK-104'); const unrelated = f.bytes('TASK-unrelated');
        const invoke = (command, value, options = []) => {
            const child = spawnSync(process.execPath, [CLI_PATH, command, '--root', f.root, ...options],
                { cwd: f.root, env: { ...process.env }, shell: false, input: JSON.stringify(value), encoding: 'utf8', timeout: 10000, maxBuffer: 65536 });
            assert.equal(child.error, undefined, child.error?.message); assert.equal(child.status, 0, child.stderr || child.stdout);
            return JSON.parse(child.stdout);
        };
        const relationship = [{ relation: 'spec', path: governing }];
        const saved = invoke('apply', f.request('link', 'TASK-104', { links: relationship }), ['--actor', 'owner']);
        assert.equal(saved.primary.status, 'saved');
        const canonical = f.record('TASK-104'); const durable = f.bytes('TASK-104');
        assert.deepEqual(canonical.tracking.links, relationship); assert.equal(canonical.revision, original.revision + 1);
        const options = ['--session', 'actual-contributor-session', '--actor', 'owner', '--producer', 'feature'];
        assert.equal(invoke('link', { itemIds: ['TASK-104'] }, options).status, 'linked');
        const session = upkeep.readLink(f.root, 'actual-contributor-session');
        assert.deepEqual(session.itemIds, ['TASK-104']); assert.equal(session.actor, 'owner');
        assert.deepEqual(f.bytes('TASK-104'), durable);
        assert.equal(invoke('unlink', { itemIds: [] }, options).status, 'unlinked');
        assert.equal(upkeep.readLink(f.root, 'actual-contributor-session'), null);
        const concerns = invoke('concerns', { schemaVersion: 1, paths: [governing] });
        assert.equal(concerns.coverage, 'complete'); assert.deepEqual(concerns.items.map(item => item.itemId), ['TASK-104']);
        assert.deepEqual(concerns.relationships.map(link => [link.owner.itemId, link.relation, link.direction, link.target.path, link.resolution]),
            [['TASK-104', 'spec', 'incoming', governing, 'resolved']]);
        const primary = { status: 'saved', artifact: governing, outcome: 'The contributor saved the governing intent' }; const untracked = invoke('checkpoint', { checkpointId: 'unlinked-primary', primary,
            observation: observation({ paths: [governing] }) }, options);
        assert.deepEqual(untracked.primary, primary); assert.equal(untracked.secondary[0].status, 'untracked');
        assert.deepEqual(f.bytes('TASK-104'), durable); assert.deepEqual(f.bytes('TASK-unrelated'), unrelated);
        assert.equal(fs.readFileSync(path.join(f.root, governing), 'utf8'), intent);
        for (const key of ['criteria', 'proofs', 'acceptanceHistory', 'activity']) assert.deepEqual(f.record('TASK-104').tracking[key], original.tracking[key]);
        assert.equal(f.record('TASK-104').data.status, original.data.status); assert.equal(f.progress().metrics.accepted, 0);
    }),
    test('TC-TPT-153', 'a teammate save after original journal capture makes first optional apply pending and exact retries conserve primary and newer intent', async f => {
        f.write('src/export.js', 'Already saved primary source');
        for (const producer of ['spec', 'work-item', 'plan', 'pull-request']) {
            const id = `TASK-race-${producer}`; await f.create(id);
            const sessionId = `first-conflict-${producer}`;
            const context = producer === 'pull-request' ? undefined : { runId: `actual-${producer}-run`, occurrenceId: 'actual-primary-save' };
            await linked(f, { sessionId, producer, itemIds: [id], ...context });
            const original = f.record(id);
            let calls = 0; let journal; let retained; let newer;
            const scheduled = upkeepBeforeApply(async (request, authority) => {
                calls += 1;
                journal = path.join(f.root, `tmp/task-tracking/checkpoints/${request.operationId}.json`);
                const captured = fs.readFileSync(journal);
                const pending = JSON.parse(captured);
                assert.equal(pending.expected.revision, original.revision);
                assert.equal(pending.expected.contentHash, original.contentHash);
                assert.equal(pending.operation, 'activity'); assert.equal(pending.target.itemId, id);
                assert.deepEqual(pending.patch.observation, observation());
                assert.equal(JSON.stringify(pending), JSON.stringify(request));
                assert.equal(authority.automatic, true); assert.equal(authority.actor, 'owner');
                if (calls === 1) {
                    retained = captured; assert.deepEqual(f.bytes(id), original.bytes);
                    // A separate active teammate uses the public save boundary.
                    await f.saved('update', id, { title: `Newer ${producer} teammate intent` }, { actor: { memberId: 'peer' } }, { actor: 'peer' });
                    newer = f.bytes(id);
                } else assert.deepEqual(captured, retained);
            });
            const value = { root: f.root, sessionId, actor: 'owner', producer, checkpointId: 'saved-primary', primary: PRIMARY, observation: observation(), context };
            const assertPending = result => {
                assert.equal(result.primary, PRIMARY); assert.equal(result.secondary.length, 1);
                assert.equal(result.secondary[0].itemId, id); assert.equal(result.secondary[0].status, 'pending');
                assert.equal(result.secondary[0].result.status, 'refused'); assert.equal(result.secondary[0].result.code, 'CONFLICT');
                assert.deepEqual(f.bytes(id), newer); assert.deepEqual(fs.readFileSync(journal), retained);
                const current = f.record(id);
                assert.equal(current.revision, original.revision + 1); assert.equal(current.data.title, `Newer ${producer} teammate intent`); assert.equal(current.data.intent, original.data.intent); assert.equal(current.body, original.body);
                for (const key of ['criteria', 'links', 'proofs', 'acceptanceHistory', 'activity']) assert.deepEqual(current.tracking[key], original.tracking[key]);
                assert.deepEqual(current.tracking.history.slice(0, -1), original.tracking.history);
                assert.equal(current.tracking.history.at(-1).operation, 'update'); assert.equal(current.tracking.history.at(-1).actor, 'peer');
                assert.equal(fs.readFileSync(path.join(f.root, 'src/export.js'), 'utf8'), 'Already saved primary source');
            };
            assertPending(await scheduled.checkpoint(value));
            assertPending(await scheduled.checkpoint(value)); assert.equal(calls, 2);
            const changed = await scheduled.checkpoint({ ...value, observation: observation({ summary: 'Changed reused observation' }) });
            assert.equal(changed.primary, PRIMARY); assert.equal(changed.secondary[0].status, 'pending');
            assert.equal(changed.secondary[0].code, 'REUSED_OPERATION'); assert.equal(calls, 2);
            for (const mode of ['off', 'observe']) {
                f.config.taskTracking.mode = mode; f.saveConfig();
                const stopped = await scheduled.checkpoint(value); assert.equal(stopped.primary, PRIMARY);
                assert.equal(stopped.secondary[0].status, 'skipped'); assert.equal(calls, 2);
                assert.deepEqual(f.bytes(id), newer); assert.deepEqual(fs.readFileSync(journal), retained);
            }
            f.config.taskTracking.mode = 'linked'; f.saveConfig();
            await f.saved('update', id, { optOut: true }); const optedOut = f.bytes(id);
            const skipped = await scheduled.checkpoint(value); assert.equal(skipped.primary, PRIMARY);
            assert.equal(skipped.secondary[0].status, 'skipped'); assert.deepEqual(f.bytes(id), optedOut);
            // Opt-out stops this item where off and observe stop: before the retained request is applied again.
            assert.equal(skipped.secondary[0].itemId, id); assert.match(skipped.secondary[0].reason, /opted out/i);
            assert.deepEqual(fs.readFileSync(journal), retained); assert.equal(calls, 2);
        }
        assert.equal(f.progress().metrics.accepted, 0);
    }),
    test('TC-TPT-154', 'public standalone publication and inherited workflow checkpoints keep one actual producer observation without acceptance', async f => {
        f.write('src/export.js', 'The saving owner saved this source before publication.');
        await f.create(); await f.create('TASK-unlinked'); await f.create('TASK-opted-out');
        await f.saved('update', 'TASK-opted-out', { optOut: true });
        const unlinked = f.bytes('TASK-unlinked'); const optedOut = f.bytes('TASK-opted-out');
        for (const producer of ['pull-request', 'feature']) {
            const session = `saving-owner-${producer}`;
            const context = producer === 'feature' ? { runId: 'actual-parent-run', occurrenceId: 'actual-parent-save' } : undefined;
            const invoke = (command, value, actualProducer = producer) => {
                const child = spawnSync(process.execPath, [CLI_PATH, command, '--root', f.root, '--session', session, '--actor', 'owner', '--producer', actualProducer],
                    { cwd: f.root, env: { ...process.env }, shell: false, input: JSON.stringify(value), encoding: 'utf8', timeout: 10000, maxBuffer: 65536 });
                assert.equal(child.error, undefined, child.error?.message); assert.equal(child.status, 0, child.stderr || child.stdout);
                return JSON.parse(child.stdout);
            };
            assert.equal(invoke('link', { itemIds: ['TASK-101', 'TASK-opted-out'], ...context }).status, 'linked');
            const original = f.record('TASK-101');
            // Publication success is a caller-supplied primary outcome, not
            // filesystem-derived proof that a remote publication happened.
            const primary = { status: 'saved', outcome: 'Actual saving owner retained its successful primary result' };
            const value = { checkpointId: 'one-actual-save', primary, observation: observation(), ...(context ? { context } : {}) };
            const saved = invoke('checkpoint', value); assert.deepEqual(saved.primary, primary);
            assert.deepEqual(saved.secondary.map(item => [item.itemId, item.status]), [['TASK-101', 'saved'], ['TASK-opted-out', 'skipped']]);
            const current = f.record('TASK-101'); assert.equal(current.revision, original.revision + 1);
            assert.equal(current.tracking.activity.length, (original.tracking.activity || []).length + 1);
            for (const field of ['criteria', 'links', 'proofs', 'acceptanceHistory', 'readiness', 'assigneeId']) assert.deepEqual(current.tracking[field], original.tracking[field]);
            assert.equal(current.data.status, original.data.status); assert.equal(current.tracking.history.at(-1).operation, 'activity');
            if (context) assert.deepEqual(current.tracking.context, context);
            const durable = f.bytes('TASK-101'); const replay = invoke('checkpoint', value);
            assert.equal(replay.secondary[0].result.replayed, true); assert.deepEqual(f.bytes('TASK-101'), durable);
            // Nested procedures inherit the linked producer; a child identity
            // cannot borrow the parent's authority or add a second observation.
            const foreign = invoke('checkpoint', value, producer === 'feature' ? 'pull-request' : 'review');
            assert.deepEqual(foreign.primary, primary); assert.equal(foreign.secondary[0].status, 'pending');
            assert.equal(foreign.secondary[0].code, 'NOT_PERMITTED'); assert.deepEqual(f.bytes('TASK-101'), durable);
            assert.deepEqual(f.bytes('TASK-unlinked'), unlinked); assert.deepEqual(f.bytes('TASK-opted-out'), optedOut);
        }
        assert.equal(f.record('TASK-101').tracking.activity.length, 2); assert.equal(f.progress().metrics.accepted, 0);
    }),
    test('TC-TPT-153', 'standalone publication retry retains its primary outcome and original journal when optional observations or policy change', async f => {
        f.write('src/export.js', 'Already saved primary source'); await f.create(); await linked(f, { producer: 'pull-request' });
        const first = await checkpoint(f, { producer: 'pull-request' }); assert.equal(first.secondary[0].status, 'saved');
        const journal = path.join(f.root, `tmp/task-tracking/checkpoints/${first.secondary[0].result.operationId}.json`);
        const retained = fs.readFileSync(journal);
        await f.saved('update', 'TASK-101', { title: 'Newer teammate responsibility description' });
        const newer = f.bytes('TASK-101');
        const changed = await checkpoint(f, { producer: 'pull-request', observation: observation({ summary: 'Different observation under the same identity' }) });
        assert.equal(changed.primary, PRIMARY); assert.equal(changed.secondary[0].status, 'pending'); assert.equal(changed.secondary[0].code, 'REUSED_OPERATION');
        assert.deepEqual(f.bytes('TASK-101'), newer); assert.deepEqual(fs.readFileSync(journal), retained);
        const retry = await checkpoint(f, { producer: 'pull-request' }); assert.equal(retry.primary, PRIMARY);
        assert.equal(retry.secondary[0].result.replayed, true); assert.deepEqual(f.bytes('TASK-101'), newer);
        f.config.taskTracking.mode = 'off'; f.saveConfig();
        const stopped = await checkpoint(f, { producer: 'pull-request' }); assert.equal(stopped.primary, PRIMARY); assert.equal(stopped.secondary[0].status, 'skipped');
        assert.deepEqual(f.bytes('TASK-101'), newer); assert.deepEqual(fs.readFileSync(journal), retained);
        assert.equal(f.record('TASK-101').tracking.activity.length, 1); assert.equal(f.progress().metrics.accepted, 0);
        assert.equal(fs.readFileSync(path.join(f.root, 'src/export.js'), 'utf8'), 'Already saved primary source');
    }),
    test('TC-TPT-124', 'a real governing spec save through the public linked workflow checkpoint preserves owners and provisional decisions without invented proof', async f => {
        const governing = 'specs/export.md'; const initial = '# Export outcome\n\nIntent and selected-row acceptance cases owned here.\n'; f.write(governing, initial);
        const ids = ['TASK-provisional', 'TASK-delivered', 'TASK-opted-out', 'TASK-unlinked', 'TASK-undecided'];
        for (const id of ids) {
            await f.create(id, 'task', id === 'TASK-undecided' ? { criteria: [] } : {});
            await f.saved('link', id, { links: [{ relation: 'spec', path: governing }] });
            if (id === 'TASK-delivered') await f.accepted(id);
            else if (id === 'TASK-undecided') await f.saved('transition', id, { state: 'planned' });
            else await f.ready(id);
        }
        await f.saved('update', 'TASK-opted-out', { optOut: true });
        const context = { runId: 'fixture-spec-run', occurrenceId: 'fixture-governing-save' };
        // This is the supported saving-owner CLI boundary. The host/agent's
        // prompt-guided skill execution is not simulated by this fixture.
        const invoke = (command, value, session = 'fixture-spec-session') => {
            const child = spawnSync(process.execPath, [CLI_PATH, command, '--root', f.root, '--session', session, '--actor', 'owner', '--producer', 'spec'],
                { cwd: f.root, env: { ...process.env }, shell: false, input: JSON.stringify(value), encoding: 'utf8', timeout: 10000, maxBuffer: 65536 });
            assert.equal(child.error, undefined, child.error?.message); assert.equal(child.status, 0, child.stderr || child.stdout);
            return JSON.parse(child.stdout);
        };
        const linkedIds = ids.filter(id => id !== 'TASK-unlinked');
        assert.equal(invoke('link', { itemIds: linkedIds, ...context }).status, 'linked');
        assert.equal(f.view('TASK-delivered').verification.status, 'current');
        assert.deepEqual(f.progress().ready, ['TASK-opted-out', 'TASK-provisional', 'TASK-unlinked']);
        const before = new Map(ids.map(id => [id, f.record(id)]));
        const savedSpec = '# Export outcome\n\nThe saving owner revised the governing acceptance cases.\n'; f.write(governing, savedSpec);
        const primary = { status: 'saved', artifact: governing, outcome: 'The governing specification save succeeded' };
        const observed = observation({ observedAt: new Date().toISOString(), summary: 'Observed the actual governing specification save', paths: [governing] });
        const value = { checkpointId: 'fixture-governing-save', primary, observation: observed, context };
        const result = invoke('checkpoint', value); assert.deepEqual(result.primary, primary);
        assert.deepEqual(result.secondary.map(item => [item.itemId, item.status]), linkedIds.map(id => [id, id === 'TASK-opted-out' ? 'skipped' : 'saved']));
        assert.equal(fs.readFileSync(path.join(f.root, governing), 'utf8'), savedSpec);
        assert.deepEqual(f.records().map(record => record.id).sort(), ids.slice().sort());
        for (const id of ids) {
            const original = before.get(id); const actual = f.record(id); const changed = linkedIds.includes(id) && id !== 'TASK-opted-out';
            assert.equal(actual.ownerPath, original.ownerPath); assert.equal(actual.id, original.id); assert.equal(actual.body, original.body);
            assert.deepEqual({ ...actual.data, tracking: original.data.tracking }, original.data);
            for (const key of ['links', 'criteria', 'readiness', 'proofs', 'acceptanceHistory', 'assigneeId', 'collaboratorIds', 'optOut', 'retired']) assert.deepEqual(actual.tracking[key], original.tracking[key], `${id}:${key}`);
            if (changed) {
                assert.equal(actual.revision, original.revision + 1); assert.deepEqual(actual.tracking.activity, [observed]); assert.deepEqual(actual.tracking.context, context);
                assert.deepEqual(actual.tracking.history.slice(0, -1), original.tracking.history);
                assert.equal(actual.tracking.history.at(-1).operation, 'activity');
                assert.deepEqual(actual.tracking.receipts.slice(0, -1), original.tracking.receipts);
                assert.equal(actual.tracking.receipts.at(-1).operationId, result.secondary.find(item => item.itemId === id).result.operationId);
            } else assert.deepEqual(f.bytes(id), original.bytes);
        }
        assert.equal(f.view('TASK-provisional').state, 'ready'); assert.equal(f.view('TASK-provisional').verification.status, 'missing');
        assert.equal(f.view('TASK-provisional').acceptance.accepted, false); assert.deepEqual(f.progress().ready, []);
        assert.equal(f.view('TASK-undecided').state, 'planned'); assert.deepEqual(f.record('TASK-undecided').tracking.criteria, []);
        assert.equal(f.view('TASK-delivered').state, 'done'); assert.equal(f.view('TASK-delivered').verification.status, 'stale');
        assert.equal(f.view('TASK-delivered').acceptance.accepted, true); assert.equal(f.progress().metrics.accepted, 1); assert.equal(f.progress().metrics.currentlyVerified, 0);
        const durable = new Map(ids.map(id => [id, f.bytes(id)])); const repeated = invoke('checkpoint', value);
        assert.deepEqual(repeated.secondary.map(item => [item.itemId, item.status]), result.secondary.map(item => [item.itemId, item.status]));
        assert.ok(repeated.secondary.filter(item => item.status === 'saved').every(item => item.result.replayed === true));
        for (const id of ids) assert.deepEqual(f.bytes(id), durable.get(id));
        const untrackedSpec = '# Export outcome\n\nA later unlinked save keeps its actual governing owner.\n'; f.write(governing, untrackedSpec);
        const untracked = invoke('checkpoint', { checkpointId: 'fixture-unlinked-save', primary,
            observation: observation({ observedAt: new Date().toISOString(), summary: 'Observed later unlinked governing save', paths: [governing] }), context }, 'fixture-unlinked-session');
        assert.deepEqual(untracked.primary, primary); assert.equal(untracked.secondary[0].status, 'untracked');
        for (const id of ids) assert.deepEqual(f.bytes(id), durable.get(id));
        assert.equal(fs.readFileSync(path.join(f.root, governing), 'utf8'), untrackedSpec);
        assert.deepEqual(f.records().map(record => record.id).sort(), ids.slice().sort());
    }),
    test('TC-TPT-063', 'exact linked checkpoint records activity only on the selected item and retains the primary outcome', async f => {
        f.write('src/export.js', 'actual saved source'); await f.create(); await f.create('TASK-OTHER');
        await linked(f, { runId: 'actual-run', occurrenceId: 'actual-step' }); const other = f.bytes('TASK-OTHER');
        const result = await checkpoint(f, { context: { runId: 'actual-run', occurrenceId: 'actual-step' } }); assert.equal(result.primary, PRIMARY); assert.equal(result.secondary[0].status, 'saved');
        const record = f.record('TASK-101'); assert.equal(record.data.status, 'draft'); assert.deepEqual(record.tracking.activity, [observation()]);
        assert.deepEqual(record.tracking.context, { runId: 'actual-run', occurrenceId: 'actual-step' });
        assert.equal(f.progress().metrics.accepted, 0); assert.deepEqual(f.bytes('TASK-OTHER'), other);
        const hint = observe(f, event(f)); assert.match(hint.value.hookSpecificOutput.additionalContext, /exact linked work/);
        assert.match(hint.value.hookSpecificOutput.additionalContext, /never acceptance/);
    }),
    test('TC-TPT-063', 'untracked work continues without a mandatory ticket or invented state', async f => {
        f.write('src/export.js', 'actual saved source'); await f.create(); const before = f.bytes('TASK-101');
        const result = await checkpoint(f); assert.equal(result.primary, PRIMARY); assert.equal(result.secondary[0].status, 'untracked');
        assert.match(result.secondary[0].reason, /Continue untracked/); assert.deepEqual(f.bytes('TASK-101'), before);
        const hint = observe(f, event(f)); assert.match(hint.value.hookSpecificOutput.additionalContext, /Continue untracked/);
        assert.match(hint.value.hookSpecificOutput.additionalContext, /no ticket is required/); assert.deepEqual(f.bytes('TASK-101'), before);
    }),
    test('TC-TPT-085', 'off and observe checkpoints save no optional item facts', async f => {
        f.write('src/export.js', 'actual source'); await f.create(); await linked(f);
        for (const mode of ['off', 'observe']) {
            f.config.taskTracking.mode = mode; f.saveConfig(); const before = f.bytes('TASK-101');
            const result = await checkpoint(f); assert.equal(result.primary, PRIMARY); assert.equal(result.secondary[0].status, 'skipped');
            assert.deepEqual(f.bytes('TASK-101'), before);
        }
    }),
    test('TC-TPT-063', 'failed or interrupted primary results never advance linked items', async f => {
        f.write('src/export.js', 'existing source'); await f.create(); await linked(f);
        for (const status of ['failed', 'interrupted', 'pending']) {
            const primary = { status, outcome: 'Actual primary outcome' }; const before = f.bytes('TASK-101');
            const result = await checkpoint(f, { primary }); assert.equal(result.primary, primary); assert.equal(result.secondary[0].status, 'skipped');
            assert.deepEqual(f.bytes('TASK-101'), before);
        }
        assert.equal(fs.existsSync(path.join(f.root, 'tmp/task-tracking/checkpoints')), false);
    }),
    test('TC-TPT-085', 'opted-out items retain primary saves while optional activity is skipped', async f => {
        f.write('src/export.js', 'actual source'); await f.create(); await f.saved('update', 'TASK-101', { optOut: true }); await linked(f);
        const before = f.bytes('TASK-101'); const result = await checkpoint(f);
        assert.equal(result.primary, PRIMARY); assert.equal(result.secondary[0].status, 'skipped'); assert.deepEqual(f.bytes('TASK-101'), before);
    }),
    test('TC-TPT-123', 'checkpoint retry retains the original request after a later item revision', async f => {
        f.write('src/export.js', 'actual source'); await f.create(); await linked(f);
        const first = await checkpoint(f); assert.equal(first.secondary[0].status, 'saved');
        const operationId = first.secondary[0].result.operationId; const retainedPath = path.join(f.root, `tmp/task-tracking/checkpoints/${operationId}.json`);
        const retained = fs.readFileSync(retainedPath); const request = JSON.parse(retained);
        assert.equal(request.expected.revision, 1); assert.equal(request.target.itemId, 'TASK-101');
        await f.saved('update', 'TASK-101', { title: 'Later teammate save' }); const before = f.bytes('TASK-101');
        const retry = await checkpoint(f); assert.equal(retry.primary, PRIMARY); assert.equal(retry.secondary[0].result.replayed, true);
        assert.equal(retry.secondary[0].result.revision, first.secondary[0].result.revision);
        assert.deepEqual(fs.readFileSync(retainedPath), retained); assert.deepEqual(f.bytes('TASK-101'), before);
        assert.equal(f.record('TASK-101').tracking.activity.length, 1);
    }),
    test('TC-TPT-123', 'changed observations under a reused checkpoint identity refuse optional saves', async f => {
        f.write('src/export.js', 'actual source'); await f.create(); await linked(f); await checkpoint(f); const before = f.bytes('TASK-101');
        const result = await checkpoint(f, { observation: observation({ summary: 'Different observation' }) });
        assert.equal(result.primary, PRIMARY); assert.equal(result.secondary[0].status, 'pending'); assert.equal(result.secondary[0].code, 'REUSED_OPERATION');
        assert.deepEqual(f.bytes('TASK-101'), before); assert.equal(f.record('TASK-101').tracking.activity.length, 1);
    }),
    test('TC-TPT-045', 'linked actor, producer and config identities govern optional checkpoint authority', async f => {
        f.write('src/export.js', 'actual source'); await f.create(); await linked(f); const before = f.bytes('TASK-101');
        for (const options of [{ actor: 'peer' }, { producer: 'bugfix' }]) {
            const result = await checkpoint(f, options); assert.equal(result.primary, PRIMARY); assert.equal(result.secondary[0].code, 'NOT_PERMITTED'); assert.deepEqual(f.bytes('TASK-101'), before);
        }
        f.config.taskTracking.members[0].displayName = 'Renamed owner'; f.saveConfig();
        const stale = await checkpoint(f); assert.equal(stale.primary, PRIMARY); assert.equal(stale.secondary[0].code, 'STALE_LINK'); assert.deepEqual(f.bytes('TASK-101'), before);
        await linked(f); const relinked = await checkpoint(f); assert.equal(relinked.secondary[0].status, 'saved');
    }),
    test('TC-TPT-045', 'foreign session context cannot become current linked authority', async f => {
        f.write('src/export.js', 'actual source'); await f.create(); await linked(f); const before = f.bytes('TASK-101');
        const source = path.join(f.root, upkeep.linkPath('actual-session')); const value = JSON.parse(fs.readFileSync(source, 'utf8'));
        // Reachable manual/Git alteration of disposable context: mismatched root is untrusted.
        value.rootIdentity = hash('foreign-project'); fs.writeFileSync(source, JSON.stringify(value));
        const result = await checkpoint(f); assert.equal(result.primary, PRIMARY); assert.equal(result.secondary[0].code, 'INVALID_LINK'); assert.deepEqual(f.bytes('TASK-101'), before);
    }),
    test('TC-TPT-063', 'missing and sensitive observations leave primary results saved and optional work pending', async f => {
        f.write('src/export.js', 'actual source'); await f.create(); await linked(f); const before = f.bytes('TASK-101');
        for (const paths of [['src/missing.js'], ['.env'], ['../foreign.js']]) {
            const result = await checkpoint(f, { checkpointId: `invalid-path-${paths[0].length}`, observation: observation({ paths }) });
            assert.equal(result.primary, PRIMARY); assert.equal(result.secondary[0].status, 'pending'); assert.deepEqual(f.bytes('TASK-101'), before);
        }
    }),
    test('TC-TPT-063', 'unlinking is explicit and session context is not canonical progress', async f => {
        f.write('src/export.js', 'actual source'); await f.create(); const before = f.bytes('TASK-101');
        await linked(f); assert.deepEqual(f.bytes('TASK-101'), before); assert.deepEqual(upkeep.readLink(f.root, 'actual-session').itemIds, ['TASK-101']);
        const unlinked = await linked(f, { itemIds: [], unlink: true }); assert.equal(unlinked.status, 'unlinked'); assert.equal(upkeep.readLink(f.root, 'actual-session'), null);
        assert.equal((await checkpoint(f)).secondary[0].status, 'untracked'); assert.deepEqual(f.bytes('TASK-101'), before);
    }),
    test('TC-TPT-063', 'every declared producer uses exact observed activity rather than delivery approval', async f => {
        f.write('src/export.js', 'actual source'); await f.create();
        // Finite domain: every registered producer identity; unknown producer is a counter-case.
        for (const producer of upkeep.PRODUCERS) {
            await linked(f, { producer }); const result = await checkpoint(f, { producer, checkpointId: `checkpoint-${producer}` });
            assert.equal(result.primary, PRIMARY); assert.equal(result.secondary[0].status, 'saved'); assert.equal(f.record('TASK-101').data.status, 'draft');
        }
        assert.equal(f.record('TASK-101').tracking.activity.length, upkeep.PRODUCERS.length); assert.equal(f.progress().metrics.accepted, 0);
        const before = f.bytes('TASK-101'); const unknown = await checkpoint(f, { producer: 'unknown-producer' });
        assert.equal(unknown.primary, PRIMARY); assert.equal(unknown.secondary[0].code, 'INVALID_INPUT'); assert.deepEqual(f.bytes('TASK-101'), before);
    }),
    test('TC-TPT-047', 'linkage accepts unique exact identities and declared workflow context only', async f => {
        await f.create(); const before = f.bytes('TASK-101');
        for (const options of [{ itemIds: [] }, { itemIds: ['TASK-101', 'TASK-101'] }, { itemIds: ['unknown-item'] },
            { actor: 'Owner' }, { runId: 'actual-run' }, { itemIds: Array.from({ length: 65 }, (_, index) => `TASK-${index}`) }]) {
            await assert.rejects(linked(f, options), error => ['INVALID_INPUT', 'INVALID_MEMBER', 'INCOMPLETE_SCOPE'].includes(error.code));
        }
        assert.deepEqual(f.bytes('TASK-101'), before); assert.equal(upkeep.readLink(f.root, 'actual-session'), null);
    }),
    test('TC-TPT-063', 'successful write observer emits a bounded reminder and never mutates work', async f => {
        f.write('src/export.js', 'actual saved source'); await f.create(); const before = f.bytes('TASK-101');
        const first = observe(f, event(f)); assert.equal(first.value.hookSpecificOutput.hookEventName, 'PostToolUse');
        const hint = first.value.hookSpecificOutput.additionalContext; assert.ok(hint.length < 1000); assert.match(hint, /Continue untracked/);
        const again = observe(f, event(f)); assert.equal(again.text, ''); assert.deepEqual(f.bytes('TASK-101'), before);
        assert.equal(f.progress().metrics.accepted, 0);
    }),
    test('TC-TPT-085', 'failed tools, reads, absent sessions and off policy emit no optional reminder', async f => {
        f.write('src/export.js', 'actual source'); await f.create(); const before = f.bytes('TASK-101');
        for (const overrides of [{ tool_response: { success: false } }, { tool_response: { isError: true } }, { tool_name: 'Read' }, { session_id: undefined }, { hook_event_name: 'PreToolUse' }]) {
            assert.equal(observe(f, event(f, overrides)).text, '');
        }
        f.config.taskTracking.mode = 'off'; f.saveConfig(); assert.equal(observe(f, event(f)).text, '');
        assert.deepEqual(f.bytes('TASK-101'), before); assert.equal(fs.existsSync(path.join(f.root, 'tmp/task-tracking/hints')), false);
    }),
    test('TC-TPT-085', 'observe mode emits a useful untracked hint without adding canonical activity', async f => {
        f.write('src/export.js', 'actual source'); await f.create(); f.config.taskTracking.mode = 'observe'; f.saveConfig();
        const before = f.bytes('TASK-101'); const result = observe(f, event(f)); assert.match(result.value.hookSpecificOutput.additionalContext, /Continue untracked/);
        assert.deepEqual(f.bytes('TASK-101'), before); assert.equal(f.record('TASK-101').tracking.activity, undefined);
    }),
    test('TC-TPT-063', 'patch delete and move targets form bounded hints without fictitious save evidence', async f => {
        f.write('src/new.js', 'moved actual source'); await f.create(); const before = f.bytes('TASK-101');
        const patch = '*** Begin Patch\n*** Delete File: src/deleted.js\n*** Update File: src/old.js\n*** Move to: src/new.js\n*** End Patch';
        const input = event(f, { tool_name: 'apply_patch', tool_input: { patch } });
        assert.deepEqual(upkeep.observedPaths(input, f.root), ['src/deleted.js', 'src/old.js', 'src/new.js']);
        const result = observe(f, input); assert.match(result.value.hookSpecificOutput.additionalContext, /Continue untracked/);
        assert.deepEqual(f.bytes('TASK-101'), before);
        await linked(f); const missingSavedPath = await checkpoint(f, { observation: observation({ paths: ['src/deleted.js'] }) });
        assert.equal(missingSavedPath.primary, PRIMARY); assert.equal(missingSavedPath.secondary[0].status, 'pending'); assert.deepEqual(f.bytes('TASK-101'), before);
    }),
    test('TC-TPT-045', 'generated, private and foreign targets never become tracking reminders', async f => {
        const paths = ['tmp/report.html', 'temp/cache.md', '.agents/project.md', '.codex/config.toml', '.opencode/skill.md',
            'node_modules/library.js', 'src/dist/output.js', 'build/output.js', 'vendor/code.js', '.env', '../outside.js'];
        for (const file_path of paths) assert.deepEqual(upkeep.observedPaths(event(f, { tool_input: { file_path } }), f.root), []);
        assert.equal(observe(f, event(f, { tool_input: { file_path: '.env' } })).text, '');
    }),
    test('TC-TPT-047', 'patch observer retains at most 64 unique targets and refuses oversize input', async f => {
        const lines = Array.from({ length: 70 }, (_, index) => `*** Update File: src/item-${index}.js`);
        const input = event(f, { tool_name: 'apply_patch', tool_input: { command: lines.join('\n') } });
        const selected = upkeep.observedPaths(input, f.root); assert.equal(selected.length, 64); assert.equal(new Set(selected).size, 64);
        assert.equal(selected[63], 'src/item-63.js');
        assert.deepEqual(upkeep.observedPaths(event(f, { tool_name: 'apply_patch', tool_input: { patch: 'x'.repeat(2 * 1024 * 1024 + 1) } }), f.root), []);
    }),
    test('TC-TPT-047', 'activity retention is bounded while retry receipts and history remain attributable', async f => {
        f.write('src/export.js', 'actual source'); await f.create(); await linked(f);
        for (let index = 0; index < 65; index++) {
            const result = await checkpoint(f, { checkpointId: `retained-${index}`, observation: observation({ summary: `Actual save ${index}` }) });
            assert.equal(result.secondary[0].status, 'saved');
        }
        const record = f.record('TASK-101'); assert.equal(record.tracking.activity.length, 64); assert.equal(record.tracking.activity[0].summary, 'Actual save 1');
        assert.equal(record.tracking.activity[63].summary, 'Actual save 64'); assert.equal(record.tracking.history.length, 66); assert.equal(f.progress().metrics.accepted, 0);
    }),
    test('TC-TPT-045', 'a workflow checkpoint requires the actual current occurrence and never borrows link context', async f => {
        f.write('src/export.js', 'actual source'); await f.create(); await linked(f, { runId: 'actual-run', occurrenceId: 'actual-step' });
        const before = f.bytes('TASK-101');
        for (const context of [undefined, { runId: 'actual-run', occurrenceId: 'old-step' }, { runId: 'foreign-run', occurrenceId: 'actual-step' }]) {
            const result = await checkpoint(f, { context }); assert.equal(result.primary, PRIMARY); assert.equal(result.secondary[0].code, 'NOT_PERMITTED'); assert.deepEqual(f.bytes('TASK-101'), before);
        }
        const saved = await checkpoint(f, { context: { runId: 'actual-run', occurrenceId: 'actual-step' } }); assert.equal(saved.secondary[0].status, 'saved');
        assert.deepEqual(f.record('TASK-101').tracking.context, { runId: 'actual-run', occurrenceId: 'actual-step' });
    }),
    test('TC-TPT-063', 'successful checkpoint acknowledges its hint and a later same-file save prompts again', async f => {
        f.write('src/export.js', 'first actual save'); await f.create(); await linked(f);
        assert.ok(observe(f, event(f)).value); assert.equal(observe(f, event(f)).text, '');
        const hintPath = path.join(f.root, `tmp/task-tracking/hints/${hash('actual-session')}.json`);
        assert.equal(JSON.parse(fs.readFileSync(hintPath, 'utf8')).pending, true);
        const saved = await checkpoint(f); assert.equal(saved.secondary[0].status, 'saved'); assert.equal(JSON.parse(fs.readFileSync(hintPath, 'utf8')).pending, false);
        f.write('src/export.js', 'later actual save'); const repeated = observe(f, event(f)); assert.ok(repeated.value);
        assert.equal(JSON.parse(fs.readFileSync(hintPath, 'utf8')).pending, true); assert.equal(f.record('TASK-101').tracking.activity.length, 1);
    }),
    test('TC-TPT-044', 'unsupported native linkage never substitutes a portable owner and unlink remains available', async f => {
        await f.create(); await linked(f); const before = f.bytes('TASK-101');
        f.config.taskTracking.profile = { kind: 'native', version: 1, registration: 'fixture-native', sources: [] }; f.saveConfig();
        await assert.rejects(linked(f), error => error.code === 'UNPROVED_NATIVE_CAPABILITY');
        const unlinked = await linked(f, { itemIds: [], unlink: true }); assert.equal(unlinked.status, 'unlinked'); assert.equal(upkeep.readLink(f.root, 'actual-session'), null);
        assert.deepEqual(fs.readFileSync(path.join(f.root, 'work/tasks/TASK-101.md')), before);
    }),
    test('TC-TPT-063', 'a later reminder remains pending while the prior checkpoint is still saving', async f => {
        f.write('src/export.js', 'first save'); await f.create(); await linked(f);
        assert.ok(upkeep.observerHint(event(f), f.root));
        // The real checkpoint yields at durable request admission after observing
        // its hint. A subsequent tool save can occur while that request is pending.
        const saving = checkpoint(f);
        f.write('src/next.js', 'later actual save');
        const later = event(f, { tool_input: { file_path: path.join(f.root, 'src/next.js') } });
        assert.ok(upkeep.observerHint(later, f.root));
        const hintPath = path.join(f.root, `tmp/task-tracking/hints/${hash('actual-session')}.json`); const latest = fs.readFileSync(hintPath);
        const saved = await saving; assert.equal(saved.secondary[0].status, 'saved');
        assert.deepEqual(fs.readFileSync(hintPath), latest); assert.equal(JSON.parse(latest).pending, true);
        assert.deepEqual(JSON.parse(latest).paths, ['src/next.js']); assert.equal(f.record('TASK-101').tracking.activity.length, 1);
    }),
    test('TC-TPT-127', 'automatic upkeep never tags work and never changes the state of an initiative or an area; activity and the three observed delivery steps are all it saves', async f => {
        f.write('src/export.js', 'actual saved source');
        await f.create('AREA-1', 'area'); await f.create('INITIATIVE-1', 'initiative'); await f.create(); await f.active();
        const automatic = (id, observed = {}) => ({ automatic: true, linkedItemIds: [id], ...observed });
        const stored = () => new Map(f.records().map(record => [record.id, f.bytes(record.id)]));
        const unchanged = before => { const after = stored(); assert.deepEqual([...after.keys()], [...before.keys()]); for (const [id, bytes] of after) assert.deepEqual(bytes, before.get(id), id); };
        let before = stored();
        // A tag is a person's act in every form a request can ask for one: the tag operation, a capture with tags, and a
        // link list that names a tag relation, which is no way to tag for anyone and is still answered as upkeep's own limit.
        for (const [operation, id, patch] of [['tag', 'TASK-101', { areaIds: ['AREA-1'] }], ['tag', 'TASK-101', { initiativeIds: ['INITIATIVE-1'] }], ['tag', 'TASK-101', { areaIds: [], initiativeIds: [] }],
            ['tag', 'INITIATIVE-1', { areaIds: ['AREA-1'] }], ['link', 'TASK-101', { links: [{ relation: 'area', itemId: 'AREA-1' }] }],
            ['create', 'TASK-NEW', { title: 'Captured at a checkpoint', intent: 'Never captured automatically', areaIds: ['AREA-1'] }]]) {
            refused(await f.perform(operation, id, patch, {}, automatic(id)), 'NOT_PERMITTED'); unchanged(before);
        }
        // No step of an initiative or an area is taken: neither its own next step nor a state word the delivery allow-list holds.
        for (const [id, patch] of [['INITIATIVE-1', { state: 'approved' }], ['INITIATIVE-1', { state: 'canceled', reason: 'Observed' }], ['INITIATIVE-1', { state: 'in_progress' }],
            ['INITIATIVE-1', { state: 'verifying' }], ['AREA-1', { state: 'canceled', reason: 'Observed' }], ['AREA-1', { state: 'blocked', reason: 'Observed' }]]) {
            refused(await f.perform('transition', id, patch, {}, automatic(id, { observedTransition: patch })), 'NOT_PERMITTED'); unchanged(before);
        }
        // The same requests from a person are saved, so the refusals above are about automation and not about the requests.
        await f.tag('TASK-101', { areaIds: ['AREA-1'], initiativeIds: ['INITIATIVE-1'] }); await f.saved('transition', 'INITIATIVE-1', { state: 'approved' });
        // What automatic upkeep saved before, it still saves: the three observed delivery steps, and no other step.
        for (const patch of [{ state: 'blocked', reason: 'Observed dependency wait' }, { state: 'in_progress', resolution: 'Observed dependency restored' }, { state: 'verifying' }])
            await f.saved('transition', 'TASK-101', patch, {}, automatic('TASK-101', { observedTransition: patch }));
        for (const state of ['planned', 'ready', 'done', 'canceled']) {
            const patch = { state, reason: 'Observed' };
            refused(await f.perform('transition', 'TASK-101', patch, {}, automatic('TASK-101', { observedTransition: patch })), 'NOT_PERMITTED');
        }
        assert.equal(f.record('TASK-101').data.status, 'verifying');
        // A linked checkpoint over all three kinds records activity on each and nothing else.
        const tags = f.record('TASK-101').tracking.links;
        await linked(f, { itemIds: ['TASK-101', 'INITIATIVE-1', 'AREA-1'] });
        const result = await checkpoint(f); assert.equal(result.primary, PRIMARY);
        assert.deepEqual(result.secondary.map(item => [item.itemId, item.status]).sort(), [['AREA-1', 'saved'], ['INITIATIVE-1', 'saved'], ['TASK-101', 'saved']]);
        for (const [id, state] of [['TASK-101', 'verifying'], ['INITIATIVE-1', 'approved'], ['AREA-1', 'active']]) {
            const record = f.record(id); const last = record.tracking.history.at(-1);
            assert.equal(record.data.status, state, id); assert.deepEqual(record.tracking.activity, [observation()], id);
            assert.deepEqual([last.operation, last.beforeState, last.afterState], ['activity', state, state], id);
            assert.deepEqual(record.tracking.links, id === 'TASK-101' ? tags : [], id);
        }
    })
] };
