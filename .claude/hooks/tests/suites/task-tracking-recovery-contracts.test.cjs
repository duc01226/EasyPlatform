'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { trackingTest: test, OBSERVED_AT } = require('../lib/task-tracking-fixture.cjs');
const upkeep = require('../../lib/task-tracking-upkeep.cjs');
const { startWorkspace } = require('../../../skills/task-track/lib/workspace-server.cjs');

function preserve(f, relatives = []) {
    const records = f.records();
    const files = new Map([...records.map(record => record.ownerPath), 'docs/project-config.json', '.claude/.ck.local.json', ...relatives]
        .map(relative => [relative, fs.readFileSync(path.join(f.root, relative))]));
    const ids = records.map(record => record.id).sort();
    return () => {
        assert.deepEqual(f.records().map(record => record.id).sort(), ids);
        for (const [relative, bytes] of files) assert.deepEqual(fs.readFileSync(path.join(f.root, relative)), bytes, relative);
    };
}

async function api(workspace, route, value, token = new URL(workspace.url).hash.slice('#session='.length)) {
    const response = await fetch(new URL(route, workspace.origin), {
        method: value === undefined ? 'GET' : 'POST',
        headers: { 'x-workspace-session': token, ...(value === undefined ? {} : { origin: workspace.origin, 'content-type': 'application/json' }) },
        ...(value === undefined ? {} : { body: JSON.stringify(value) }), signal: AbortSignal.timeout(5000)
    });
    return { status: response.status, body: await response.json() };
}

module.exports = { name: 'Task tracking specification and recovery boundaries', tests: [
    test('TC-TPT-083', 'specification-only producer saves preserve delivery owners and infer no partner, readiness or acceptance', async f => {
        // Given an accepted delivery owner governed by a separately authored specification.
        const spec = 'docs/contracts/083-export.md'; const controlSpec = 'docs/contracts/083-unrelated.md';
        f.write(spec, 'People export the selected rows.\n'); f.write(controlSpec, 'Unrelated governing intent stays owned here.\n');
        await f.create('TASK-083-spec');
        await f.saved('link', 'TASK-083-spec', { links: [{ relation: 'spec', path: spec }] });
        await f.accepted('TASK-083-spec'); await f.create('TASK-083-spec-control');
        const before = f.record('TASK-083-spec'); const ids = f.records().map(record => record.id).sort();
        const initial = preserve(f, [controlSpec]);
        const config = fs.readFileSync(path.join(f.root, 'docs/project-config.json'));
        const localConfig = fs.readFileSync(path.join(f.root, '.claude/.ck.local.json'));
        // When a real editor saves only the specification, its declared producer has no delivery link.
        const requested = 'People export only the newly reviewed filtered rows.\n';
        f.write(spec, requested);
        const primary = { status: 'saved', artifact: spec, outcome: 'Requested specification intent saved' };
        const observation = { kind: 'saved', observedAt: OBSERVED_AT, summary: 'Saved the reviewed governing specification only', paths: [spec] };
        const unlinked = await upkeep.checkpoint({ root: f.root, sessionId: 'session-083-spec-unlinked', actor: 'owner', producer: 'spec',
            checkpointId: 'specification-only-083', primary, observation });
        // Then the actual saved specification is retained, without an automatically created or amended delivery owner.
        assert.equal(unlinked.primary, primary); assert.equal(unlinked.secondary[0].status, 'untracked');
        assert.equal(fs.readFileSync(path.join(f.root, spec), 'utf8'), requested); initial();
        assert.equal(f.view('TASK-083-spec').state, 'done'); assert.equal(f.view('TASK-083-spec').verification.status, 'stale');
        assert.deepEqual(f.view('TASK-083-spec').acceptanceHistory, before.tracking.acceptanceHistory);
        assert.equal(f.progress().metrics.accepted, 1); assert.equal(f.progress().metrics.currentlyVerified, 0);
        // An explicit exact link permits activity for that already selected owner, never a delivery decision.
        await upkeep.linkSession({ root: f.root, sessionId: 'session-083-spec-linked', actor: 'owner', producer: 'spec', itemIds: ['TASK-083-spec'] });
        const control = f.bytes('TASK-083-spec-control');
        const linked = { root: f.root, sessionId: 'session-083-spec-linked', actor: 'owner', producer: 'spec', checkpointId: 'linked-specification-083', primary, observation };
        const saved = await upkeep.checkpoint(linked); const after = f.record('TASK-083-spec');
        assert.equal(saved.primary, primary); assert.equal(saved.secondary[0].status, 'saved');
        assert.deepEqual(after.tracking.activity, [...(before.tracking.activity || []), observation]);
        assert.equal(after.revision, before.revision + 1); assert.equal(after.data.status, before.data.status);
        assert.equal(after.data.title, before.data.title); assert.equal(after.data.intent, before.data.intent);
        assert.deepEqual(after.tracking.receipts.slice(0, -1), before.tracking.receipts);
        assert.equal(after.tracking.receipts.at(-1).operationId, after.tracking.history.at(-1).operationId);
        assert.deepEqual(fs.readFileSync(path.join(f.root, 'docs/project-config.json')), config);
        assert.deepEqual(fs.readFileSync(path.join(f.root, '.claude/.ck.local.json')), localConfig);
        for (const field of ['assigneeId', 'links', 'criteria', 'readiness', 'proofs', 'acceptanceHistory']) assert.deepEqual(after.tracking[field], before.tracking[field], field);
        assert.deepEqual(after.tracking.history.slice(0, -1), before.tracking.history);
        assert.equal(after.tracking.history.at(-1).operation, 'activity'); assert.equal(after.tracking.history.at(-1).actor, 'owner');
        assert.equal(after.tracking.history.at(-1).beforeState, 'done'); assert.equal(after.tracking.history.at(-1).afterState, 'done');
        assert.deepEqual(f.records().map(record => record.id).sort(), ids); assert.deepEqual(f.bytes('TASK-083-spec-control'), control);
        assert.equal(fs.readFileSync(path.join(f.root, spec), 'utf8'), requested);
        assert.equal(fs.readFileSync(path.join(f.root, controlSpec), 'utf8'), 'Unrelated governing intent stays owned here.\n');
        const conserved = preserve(f, [spec, controlSpec]);
        const repeated = await upkeep.checkpoint(linked);
        assert.equal(repeated.primary, primary); assert.equal(repeated.secondary[0].result.replayed, true); conserved();
        const wrongProducer = await upkeep.checkpoint({ ...linked, producer: 'feature', checkpointId: 'wrong-producer-083' });
        assert.equal(wrongProducer.primary, primary); assert.equal(wrongProducer.secondary[0].status, 'pending');
        assert.equal(wrongProducer.secondary[0].code, 'NOT_PERMITTED'); conserved();
        assert.equal(f.progress().metrics.accepted, 1); assert.equal(f.progress().metrics.currentlyVerified, 0);
    }),
    test('TC-TPT-087', 'an initialized optional refresh failure preserves its successful core save and public retry refreshes only derived metadata', async f => {
        assert.ok(Number(process.versions.node.split('.')[0]) >= 20, 'The optional public workspace boundary requires Node 20+');
        f.config.taskTracking.report.autoRefresh = true; f.saveConfig();
        await f.create('TASK-087-report'); await f.create('TASK-087-report-control');
        const before = f.record('TASK-087-report'); const control = f.bytes('TASK-087-report-control');
        const config = fs.readFileSync(path.join(f.root, 'docs/project-config.json'));
        const workspace = await startWorkspace({ root: f.root });
        try {
            // Given a real initialized report, inspect only its public nonvisual result.
            const initialized = await api(workspace, '/api/report', {});
            assert.equal(initialized.status, 200); assert.equal(initialized.body.status, 'generated');
            assert.equal(initialized.body.coverage, 'complete'); assert.equal(initialized.body.fingerprint, f.progress().fingerprint);
            const output = path.join(f.root, initialized.body.path); const backup = `${output}.recovery-backup`;
            const request = f.request('update', 'TASK-087-report', { title: 'The requested primary title is durably saved' });
            const draft = JSON.stringify(request);
            // Reachable filesystem fault: an external cache operation replaces an output with a directory.
            // Move the opaque generated file aside; never inspect or alter generated markup. The shared writer-lock parent stays usable.
            fs.renameSync(output, backup);
            let blocked = false;
            try {
                fs.mkdirSync(output); blocked = true;
                // When the actual primary core save succeeds but its real initialized refresh cannot read a regular output.
                const saved = await f.core.executeOperation(request, f.authority());
                assert.equal(saved.primary.status, 'saved'); assert.equal(saved.primary.itemId, 'TASK-087-report');
                assert.equal(saved.current.title, 'The requested primary title is durably saved');
                const refresh = saved.secondary.filter(row => row.kind === 'report');
                assert.equal(refresh.length, 1); assert.equal(refresh[0].status, 'pending'); assert.equal(refresh[0].code, 'UNSAFE_PATH');
                // Then the final business outcome is the exact saved title, independent of optional cache recovery.
                const after = f.record('TASK-087-report');
                assert.equal(after.data.title, request.patch.title); assert.equal(after.revision, before.revision + 1);
                assert.equal(after.data.intent, before.data.intent); assert.equal(after.data.status, before.data.status);
                for (const field of ['assigneeId', 'links', 'criteria', 'readiness', 'proofs', 'acceptanceHistory']) assert.deepEqual(after.tracking[field], before.tracking[field], field);
                assert.deepEqual(after.tracking.history.slice(0, -1), before.tracking.history);
                assert.equal(after.tracking.history.at(-1).operationId, request.operationId); assert.equal(after.tracking.history.at(-1).actor, 'owner');
                assert.deepEqual(after.tracking.receipts.slice(0, -1), before.tracking.receipts);
                assert.equal(after.tracking.receipts.at(-1).operationId, request.operationId);
                assert.equal(f.view('TASK-087-report').acceptance.accepted, false); assert.equal(f.progress().metrics.accepted, 0);
                assert.deepEqual(f.bytes('TASK-087-report-control'), control); assert.equal(JSON.stringify(request), draft);
                assert.deepEqual(fs.readFileSync(path.join(f.root, 'docs/project-config.json')), config);
            } finally {
                if (blocked) fs.rmdirSync(output);
                fs.renameSync(backup, output);
            }
            // After actual storage repair, only the unresolved derived view is retried through the public API.
            const conserved = preserve(f); const savedView = f.view('TASK-087-report'); const metrics = f.progress().metrics;
            const recovered = await api(workspace, '/api/report', {});
            assert.equal(recovered.status, 200); assert.equal(recovered.body.status, 'generated');
            assert.equal(recovered.body.path, initialized.body.path); assert.equal(recovered.body.coverage, 'complete');
            assert.equal(recovered.body.fingerprint, f.progress().fingerprint); assert.notEqual(recovered.body.fingerprint, initialized.body.fingerprint);
            conserved(); assert.deepEqual(f.view('TASK-087-report'), savedView); assert.deepEqual(f.progress().metrics, metrics);
            const repeated = await api(workspace, '/api/report', {});
            assert.equal(repeated.status, 200); assert.equal(repeated.body.status, 'current');
            assert.equal(repeated.body.fingerprint, recovered.body.fingerprint); assert.equal(repeated.body.path, recovered.body.path);
            assert.equal(JSON.stringify(request), draft); conserved();
        } finally { await workspace.close(); }
    }),
    test('TC-TPT-121', 'a retired workspace session cannot disclose or re-export work through a replacement session, whose live reads disclose unavailable evidence', async f => {
        assert.ok(Number(process.versions.node.split('.')[0]) >= 20, 'The optional public workspace boundary requires Node 20+');
        const source = 'src/121-export.cjs'; const sourceText = 'The permitted current export implementation.\n';
        f.write(source, sourceText); await f.create('TASK-121-session', 'task', { title: 'Selected work visible only through its current permitted session' });
        await f.saved('link', 'TASK-121-session', { links: [{ relation: 'source', path: source }] });
        await f.accepted('TASK-121-session'); await f.create('TASK-121-session-control');
        const conserved = preserve(f); const original = f.view('TASK-121-session');
        let workspace = await startWorkspace({ root: f.root });
        try {
            // Given a real permitted read and previously generated view in the original session.
            const permitted = await api(workspace, '/api/session');
            assert.equal(permitted.status, 200); assert.equal(permitted.body.snapshot.coverage, 'complete');
            assert.deepEqual(permitted.body.snapshot.items.find(item => item.id === 'TASK-121-session'), original);
            const previousReport = await api(workspace, '/api/report', {});
            assert.equal(previousReport.status, 200); assert.equal(previousReport.body.status, 'generated');
            assert.equal(previousReport.body.fingerprint, permitted.body.snapshot.fingerprint); conserved();
            const retiredToken = new URL(workspace.url).hash.slice('#session='.length);
            // When the owner retires that public workspace and starts a new independently authorized session.
            // This is real bearer-session revocation; it does not pretend to change OS ACLs.
            await workspace.close(); workspace = await startWorkspace({ root: f.root });
            assert.notEqual(new URL(workspace.url).hash.slice('#session='.length), retiredToken);
            const deniedReads = async () => {
                for (const [route, value] of [['/api/session', undefined], ['/api/inspect', {}], ['/api/report', {}]]) {
                    const denied = await api(workspace, route, value, retiredToken);
                    // Then the old view/token supplies no authority, source details or re-export metadata.
                    assert.equal(denied.status, 403, route);
                    assert.deepEqual(denied.body, { status: 'refused', code: 'SESSION_REQUIRED' }, route);
                    assert.equal(JSON.stringify(denied.body).includes(original.title), false);
                    assert.equal(JSON.stringify(denied.body).includes(previousReport.body.fingerprint), false);
                    assert.equal(denied.body.path, undefined); assert.equal(denied.body.items, undefined); conserved();
                }
            };
            await deniedReads();
            const authorized = await api(workspace, '/api/inspect', {});
            assert.equal(authorized.status, 200); assert.equal(authorized.body.coverage, 'complete');
            assert.deepEqual(authorized.body.items.find(item => item.id === 'TASK-121-session'), original);
            // Meaningful current-source partitions supplement session denial: a teammate removes or replaces live evidence.
            // No chmod, privileged-account assumption, symlink privilege, fake reader or authorization mock is used.
            for (const partition of ['missing', 'nonregular']) {
                const target = path.join(f.root, source); fs.unlinkSync(target);
                let directory = false;
                try {
                    if (partition === 'nonregular') { fs.mkdirSync(target); directory = true; }
                    const live = await api(workspace, '/api/inspect', {});
                    assert.equal(live.status, 200); assert.equal(live.body.coverage, 'partial', partition);
                    const item = live.body.items.find(row => row.id === 'TASK-121-session');
                    assert.equal(item.verification.status, 'unknown'); assert.equal(item.verification.code, partition === 'missing' ? 'ENOENT' : 'UNSAFE_PATH');
                    assert.equal(item.acceptance.accepted, true); assert.deepEqual(item.acceptanceHistory, original.acceptanceHistory);
                    assert.equal(live.body.metrics.accepted, 1); assert.equal(live.body.metrics.currentlyVerified, 0); assert.equal(live.body.metrics.percentage, null);
                    assert.ok(live.body.diagnostics.some(row => row.itemId === item.id && row.code === item.verification.code));
                    assert.notEqual(live.body.fingerprint, previousReport.body.fingerprint);
                    const report = await api(workspace, '/api/report', {});
                    assert.equal(report.status, 200); assert.equal(report.body.status, 'generated');
                    assert.equal(report.body.coverage, 'partial'); assert.equal(report.body.fingerprint, live.body.fingerprint);
                    await deniedReads(); conserved();
                } finally {
                    if (directory) fs.rmdirSync(target);
                    f.write(source, sourceText);
                }
            }
            // A restored permitted source recovers current confidence; it never revives the old session's authority.
            const restored = await api(workspace, '/api/inspect', {});
            assert.equal(restored.status, 200); assert.equal(restored.body.coverage, 'complete');
            assert.deepEqual(restored.body.items.find(item => item.id === 'TASK-121-session'), original);
            assert.equal(restored.body.fingerprint, previousReport.body.fingerprint);
            assert.equal(restored.body.metrics.currentlyVerified, 1); await deniedReads(); conserved();
            assert.equal(fs.readFileSync(path.join(f.root, source), 'utf8'), sourceText);
        } finally { await workspace.close(); }
    })
] };
