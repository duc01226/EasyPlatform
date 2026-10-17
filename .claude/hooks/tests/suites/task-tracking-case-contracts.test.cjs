'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { trackingTest: test, refused, OBSERVED_AT, git } = require('../lib/task-tracking-fixture.cjs');
const { patchRecord } = require('../../lib/task-artifact-store.cjs');
const { hash } = require('../../lib/task-tracking-files.cjs');
const upkeep = require('../../lib/task-tracking-upkeep.cjs');

// These guards own portable outcomes and the real absent-native refusal boundary.
// Conditional adapter capabilities and visual/model journeys require their owners.
const owners = f => new Map(f.records().map(record => [record.ownerPath, record.bytes]));
function unchanged(f, before) {
    for (const [relative, bytes] of before) assert.deepEqual(fs.readFileSync(path.join(f.root, relative)), bytes, relative);
}
function stableMetrics(f) { return f.progress().metrics; }
function retained(f, id) {
    const record = f.record(id);
    return { record, bytes: record.bytes, metrics: stableMetrics(f), item: f.view(id) };
}
function refusalConserved(f, id, before) {
    const after = f.record(id);
    assert.deepEqual(f.bytes(id), before.bytes);
    assert.equal(after.revision, before.record.revision); assert.equal(after.contentHash, before.record.contentHash);
    assert.deepEqual(after.tracking, before.record.tracking); assert.deepEqual(after.data, before.record.data);
    assert.deepEqual(f.view(id), before.item); assert.deepEqual(stableMetrics(f), before.metrics);
}
function appendOnly(before, after, operation) {
    assert.equal(after.revision, before.revision + 1); assert.equal(after.ownerPath, before.ownerPath); assert.equal(after.body, before.body);
    assert.deepEqual(after.tracking.history.slice(0, -1), before.tracking.history);
    assert.deepEqual(after.tracking.receipts.slice(0, -1), before.tracking.receipts);
    assert.equal(after.tracking.history.at(-1).operation, operation);
    assert.equal(after.tracking.receipts.at(-1).afterRevision, after.revision);
}
function nativeSources(f, sources) {
    for (const [relative, bytes] of Object.entries(sources)) f.write(relative, bytes);
    f.config.taskTracking.profile = { kind: 'native', version: 1, registration: 'fixture-native', sources: Object.keys(sources) };
    f.saveConfig();
    return new Map(Object.keys(sources).map(relative => [relative, fs.readFileSync(path.join(f.root, relative))]));
}
function unavailableNative(snapshot, sources) {
    assert.equal(snapshot.coverage, 'unavailable'); assert.equal(snapshot.profile.available, false);
    assert.equal(snapshot.profile.code, 'UNPROVED_NATIVE_CAPABILITY'); assert.deepEqual(snapshot.profile.capabilities, []);
    assert.deepEqual(snapshot.items, []); assert.equal(snapshot.metrics, null);
    assert.equal(snapshot.native.verification, 'unknown'); assert.equal(snapshot.native.coverage, 'unavailable');
    assert.match(snapshot.native.reason, /not a validated native work projection/);
    assert.deepEqual(snapshot.native.inventory.map(row => [row.ownerPath, row.contentHash, row.bytes]).sort(),
        [...sources].map(([relative, bytes]) => [relative, hash(bytes), bytes.length]).sort());
}
function commitFixture(f) {
    git(f, ['init']); git(f, ['add', '--', 'docs', 'work', 'native', 'src']);
    git(f, ['commit', '-m', 'Owned work contract fixture']);
    return git(f, ['rev-parse', 'HEAD']);
}
function observed(summary = 'Observed the actual saved source') {
    return { kind: 'saved', observedAt: OBSERVED_AT, summary, paths: ['src/export.cjs'] };
}

module.exports = { name: 'Task tracking native case contracts', tests: [
    test('TC-TPT-033', 'starting exact Ready work requires current responsibility and cannot promote a sibling', async f => {
        // Given separately reviewed Ready work; only one has an active responsible member.
        await f.create('TASK-033'); await f.ready('TASK-033'); await f.saved('assign', 'TASK-033', { assigneeId: 'owner' });
        await f.create('TASK-033-other'); await f.ready('TASK-033-other');
        const control = f.bytes('TASK-033-other'); const before = f.record('TASK-033');
        // When the selected actor starts exactly that item through the public core.
        const result = await f.saved('transition', 'TASK-033', { state: 'in_progress' }); const after = f.record('TASK-033');
        // Then only the selected item's attributable lifecycle history advances.
        assert.equal(result.current.state, 'in_progress'); assert.equal(after.data.status, 'in_progress');
        appendOnly(before, after, 'transition'); assert.equal(after.tracking.history.at(-1).beforeState, 'ready');
        assert.equal(after.tracking.history.at(-1).afterState, 'in_progress'); assert.equal(after.tracking.history.at(-1).actor, 'owner');
        assert.deepEqual(after.tracking.proofs, before.tracking.proofs); assert.deepEqual(after.tracking.acceptanceHistory, []);
        assert.equal(f.view('TASK-033').acceptance.accepted, false); assert.equal(stableMetrics(f).accepted, 0);
        assert.deepEqual(f.bytes('TASK-033-other'), control);
        // The unassigned sibling cannot start; refusal preserves it immediately.
        const missing = retained(f, 'TASK-033-other'); refused(await f.perform('transition', 'TASK-033-other', { state: 'in_progress' }), 'INVALID_MEMBER');
        refusalConserved(f, 'TASK-033-other', missing);
        const repeated = retained(f, 'TASK-033'); refused(await f.perform('transition', 'TASK-033', { state: 'in_progress' }), 'INVALID_TRANSITION');
        refusalConserved(f, 'TASK-033', repeated);
    }),
    test('TC-TPT-034', 'blocking retains the observed obstacle, recoverable prior state and unrelated work', async f => {
        // Given actual active work and a separate active item with no obstacle.
        await f.create('TASK-034'); await f.active('TASK-034'); await f.create('TASK-034-other'); await f.active('TASK-034-other');
        const control = f.bytes('TASK-034-other'); const before = f.record('TASK-034');
        // When the actor records the observed obstacle on exactly one item.
        const reason = 'The selected export dependency is unavailable';
        const result = await f.saved('transition', 'TASK-034', { state: 'blocked', reason }); const after = f.record('TASK-034');
        // Then the persisted blocker retains the reason and actual resume state.
        assert.equal(result.current.state, 'blocked'); assert.equal(after.data.status, 'blocked');
        assert.equal(after.tracking.blocker.reason, reason); assert.equal(after.tracking.blocker.resumeState, 'in_progress');
        assert.equal(after.tracking.blocker.actor, 'owner'); assert.match(after.tracking.blocker.at, /^\d{4}-\d\d-\d\dT/);
        appendOnly(before, after, 'transition'); assert.equal(after.tracking.history.at(-1).reason, reason);
        assert.equal(after.tracking.assigneeId, before.tracking.assigneeId); assert.deepEqual(after.tracking.proofs, before.tracking.proofs);
        assert.deepEqual(after.tracking.acceptanceHistory, []); assert.equal(stableMetrics(f).accepted, 0); assert.deepEqual(f.bytes('TASK-034-other'), control);
        const noReason = retained(f, 'TASK-034-other'); refused(await f.perform('transition', 'TASK-034-other', { state: 'blocked', reason: '   ' }), 'INVALID_INPUT');
        refusalConserved(f, 'TASK-034-other', noReason);
        const alreadyBlocked = retained(f, 'TASK-034'); refused(await f.perform('transition', 'TASK-034', { state: 'blocked', reason }), 'INVALID_TRANSITION');
        refusalConserved(f, 'TASK-034', alreadyBlocked);
    }),
    test('TC-TPT-035', 'resume retains distinct actual resolution, reason and obstacle without duplicating attributable history', async f => {
        // Given a recorded real blocker reached from public In progress work.
        await f.create('TASK-035'); await f.active('TASK-035'); await f.create('TASK-035-other');
        await f.create('TASK-035-cancel'); await f.active('TASK-035-cancel');
        const obstacle = 'The source system is unavailable'; await f.saved('transition', 'TASK-035', { state: 'blocked', reason: obstacle });
        await f.saved('transition', 'TASK-035-cancel', { state: 'blocked', reason: 'An independent dependency is unavailable' });
        const controls = new Map(f.records().filter(record => record.id !== 'TASK-035').map(record => [record.ownerPath, record.bytes]));
        const config = new Map(['docs/project-config.json', '.claude/.ck.local.json'].map(relative => [relative, fs.readFileSync(path.join(f.root, relative))]));
        const blocked = retained(f, 'TASK-035');
        // Missing, invalid or wrong-target resolution cannot discard the blocker or other facts.
        refused(await f.perform('transition', 'TASK-035', { state: 'in_progress' }), 'INVALID_TRANSITION'); refusalConserved(f, 'TASK-035', blocked);
        refused(await f.perform('transition', 'TASK-035', { state: 'verifying', resolution: 'Source system restored' }), 'INVALID_TRANSITION');
        refusalConserved(f, 'TASK-035', blocked);
        for (const resolution of ['   ', { explanation: 'Not validated text' }, 'r'.repeat(2001)]) {
            refused(await f.perform('transition', 'TASK-035', { state: 'in_progress', resolution }), 'INVALID_TRANSITION');
            refusalConserved(f, 'TASK-035', blocked);
        }
        // When the actual obstacle is resolved, resume the recorded prior state only.
        const reason = 'Resume the reviewed export work'; const resolution = 'Source system restored and reviewed';
        const context = { runId: 'resume-035-run', occurrenceId: 'resume-035-occurrence' };
        const request = f.request('transition', 'TASK-035', { state: 'in_progress', reason, resolution }, { context });
        const requestBefore = JSON.parse(JSON.stringify(request)); const authority = f.authority({ context });
        const result = await f.core.executeOperation(request, authority);
        assert.equal(result.primary.status, 'saved', JSON.stringify(result.primary)); assert.equal(result.primary.replayed, false);
        const after = f.record('TASK-035'); assert.equal(result.current.state, 'in_progress'); assert.equal(after.tracking.blocker, null);
        appendOnly(blocked.record, after, 'transition'); assert.equal(after.tracking.history.at(-1).beforeState, 'blocked');
        assert.equal(after.tracking.history.at(-1).afterState, 'in_progress');
        assert.ok(after.tracking.history.some(row => row.afterState === 'blocked' && row.reason === obstacle));
        assert.equal(after.tracking.assigneeId, blocked.record.tracking.assigneeId);
        assert.deepEqual(after.tracking.proofs, blocked.record.tracking.proofs); assert.deepEqual(after.tracking.acceptanceHistory, []);
        assert.deepEqual(stableMetrics(f), blocked.metrics);
        // Then immediate, persisted and public reread history retain all three distinct facts.
        const entry = after.tracking.history.at(-1);
        assert.equal(entry.resolution, resolution); assert.equal(entry.reason, reason); assert.notEqual(entry.resolution, obstacle);
        assert.equal(entry.operationId, request.operationId); assert.equal(entry.actor, 'owner'); assert.deepEqual(entry.context, context);
        assert.match(entry.at, /^\d{4}-\d\d-\d\dT/); assert.deepEqual(after.tracking.context, context);
        assert.deepEqual(result.current.history, after.tracking.history);
        assert.deepEqual(f.record('TASK-035').tracking.history, after.tracking.history);
        assert.deepEqual(f.view('TASK-035').history, after.tracking.history);
        assert.deepEqual(f.view('TASK-035').verification, blocked.item.verification);
        assert.deepEqual(f.view('TASK-035').acceptance, blocked.item.acceptance);
        unchanged(f, controls); unchanged(f, config); assert.deepEqual(request, requestBefore);
        // Exact replay reads the same resolution and adds no revision, receipt, history or credit.
        const saved = retained(f, 'TASK-035'); const replay = await f.core.executeOperation(request, authority);
        assert.equal(replay.primary.status, 'saved'); assert.equal(replay.primary.replayed, true);
        assert.equal(replay.primary.receiptRevision, after.revision); assert.deepEqual(replay.current.history, after.tracking.history);
        assert.equal(replay.current.history.filter(row => row.operationId === request.operationId).length, 1);
        refusalConserved(f, 'TASK-035', saved); unchanged(f, controls); unchanged(f, config); assert.deepEqual(request, requestBefore);
        // A resolution-only request remains supported; no caller must copy it into reason.
        const otherBlocked = f.record('TASK-035-cancel'); const onlyResolution = 'Independent dependency restored and checked';
        const resolved = await f.saved('transition', 'TASK-035-cancel', { state: 'in_progress', resolution: onlyResolution });
        const otherResumed = f.record('TASK-035-cancel'); appendOnly(otherBlocked, otherResumed, 'transition');
        assert.equal(resolved.current.history.at(-1).resolution, onlyResolution);
        assert.equal(otherResumed.tracking.history.at(-1).resolution, onlyResolution); assert.equal(otherResumed.tracking.history.at(-1).reason, null);
        assert.equal(otherResumed.tracking.blocker, null); assert.equal(otherResumed.data.status, 'in_progress');
        // Ordinary transitions and canceled blockers do not persist arbitrary unvalidated resolution.
        const ordinary = f.record('TASK-035-other'); const arbitrary = { explanation: 'This is not a validated resume' };
        const planned = await f.saved('transition', 'TASK-035-other', { state: 'planned', resolution: arbitrary });
        const plannedRecord = f.record('TASK-035-other'); appendOnly(ordinary, plannedRecord, 'transition');
        assert.equal(planned.current.state, 'planned'); assert.equal(Object.hasOwn(planned.current.history.at(-1), 'resolution'), false);
        assert.equal(Object.hasOwn(plannedRecord.tracking.history.at(-1), 'resolution'), false);
        await f.saved('transition', 'TASK-035-cancel', { state: 'blocked', reason: 'A separate obstacle remains unresolved' });
        const cancelBefore = f.record('TASK-035-cancel'); const cancelReason = 'Withdraw this work while the obstacle remains';
        const canceled = await f.saved('transition', 'TASK-035-cancel', { state: 'canceled', reason: cancelReason, resolution: arbitrary });
        const cancelAfter = f.record('TASK-035-cancel'); appendOnly(cancelBefore, cancelAfter, 'transition');
        assert.equal(canceled.current.state, 'canceled'); assert.equal(cancelAfter.data.status, 'canceled');
        assert.equal(cancelAfter.tracking.history.at(-1).reason, cancelReason);
        assert.equal(Object.hasOwn(canceled.current.history.at(-1), 'resolution'), false);
        assert.equal(Object.hasOwn(cancelAfter.tracking.history.at(-1), 'resolution'), false);
        assert.deepEqual(cancelAfter.tracking.blocker, cancelBefore.tracking.blocker);
        assert.equal(cancelAfter.tracking.assigneeId, cancelBefore.tracking.assigneeId);
        assert.deepEqual(cancelAfter.tracking.proofs, cancelBefore.tracking.proofs);
        assert.deepEqual(cancelAfter.tracking.acceptanceHistory, cancelBefore.tracking.acceptanceHistory);
        assert.deepEqual(f.bytes('TASK-035'), saved.bytes); unchanged(f, config);
    }),
    test('TC-TPT-036', 'real handoff reaches Verifying without inventing proof or acceptance', async f => {
        // Given actual active work and an unselected draft that must stay untouched.
        await f.create('TASK-036'); await f.active('TASK-036'); await f.create('TASK-036-other');
        const before = f.record('TASK-036'); const control = f.bytes('TASK-036-other'); const metrics = stableMetrics(f);
        // When the selected implementation is handed off through its public transition.
        const result = await f.saved('transition', 'TASK-036', { state: 'verifying' }); const after = f.record('TASK-036');
        // Then verification is pending and all delivery evidence remains separate.
        assert.equal(result.current.state, 'verifying'); appendOnly(before, after, 'transition');
        assert.equal(after.tracking.history.at(-1).beforeState, 'in_progress'); assert.equal(after.tracking.history.at(-1).afterState, 'verifying');
        assert.deepEqual(after.tracking.proofs, []); assert.deepEqual(after.tracking.acceptanceHistory, []);
        assert.equal(f.view('TASK-036').verification.status, 'missing'); assert.equal(f.view('TASK-036').acceptance.accepted, false);
        assert.equal(after.tracking.assigneeId, before.tracking.assigneeId); assert.deepEqual(stableMetrics(f), metrics); assert.deepEqual(f.bytes('TASK-036-other'), control);
        const wrong = retained(f, 'TASK-036-other'); refused(await f.perform('transition', 'TASK-036-other', { state: 'verifying' }), 'INVALID_TRANSITION');
        refusalConserved(f, 'TASK-036-other', wrong);
        const repeated = retained(f, 'TASK-036'); refused(await f.perform('transition', 'TASK-036', { state: 'verifying' }), 'INVALID_TRANSITION');
        refusalConserved(f, 'TASK-036', repeated);
    }),
    test('TC-TPT-037', 'Done requires current full proof and actual acceptance authority while preserving historical decisions', async f => {
        // Given Verifying work with two required outcomes and a separate unaccepted item.
        const id = 'TASK-037'; const criteria = [{ id: 'rows', text: 'Only selected rows are exported' }, { id: 'columns', text: 'Agreed columns are exported' }];
        await f.create(id, 'task', { criteria }); await f.verifying(id); await f.create('TASK-037-other');
        const control = f.bytes('TASK-037-other'); const noProof = retained(f, id);
        refused(await f.perform('accept', id, { reason: 'Accept the selected delivery' }), 'MISSING_PROOF'); refusalConserved(f, id, noProof);
        await f.saved('proof', id, { proof: f.proof(id, { criteriaIds: ['rows'] }) }); const partial = retained(f, id);
        refused(await f.perform('accept', id, { reason: 'Accept partial proof' }), 'MISSING_PROOF'); refusalConserved(f, id, partial);
        await f.saved('proof', id, { proof: f.proof(id, { criteriaIds: ['columns'] }) }); const current = retained(f, id);
        assert.equal(current.item.verification.status, 'current');
        refused(await f.perform('accept', id, { reason: 'A role label is not acceptance authority' }, {}, { canAccept: false }), 'NOT_PERMITTED');
        refusalConserved(f, id, current);
        refused(await f.perform('transition', id, { state: 'done' }), 'MISSING_PROOF'); refusalConserved(f, id, current);
        // When an authorized accepting actor explicitly accepts this exact scope.
        const reason = 'Observed selected rows and agreed columns are accepted';
        const result = await f.saved('accept', id, { reason }); const after = f.record(id); const acceptance = after.tracking.acceptanceHistory[0];
        // Then historical acceptance names its actual item/actor/proof, separately from current confidence.
        assert.equal(result.current.state, 'done'); appendOnly(current.record, after, 'accept');
        assert.equal(acceptance.itemId, id); assert.equal(acceptance.actor, 'owner'); assert.equal(acceptance.reason, reason);
        assert.deepEqual(acceptance.criteriaIds, ['rows', 'columns']); assert.deepEqual(acceptance.proofIds.slice().sort(), current.record.tracking.proofs.map(p => p.id).sort());
        assert.equal(acceptance.criteriaIdentity, current.item.verification.criteriaIdentity); assert.equal(acceptance.sourceIdentity, current.item.verification.sourceIdentity);
        assert.deepEqual(after.tracking.proofs, current.record.tracking.proofs); assert.equal(f.view(id).verification.status, 'current');
        assert.equal(f.view(id).acceptance.accepted, true); assert.equal(f.view(id).acceptance.historyCount, 1);
        assert.equal(stableMetrics(f).accepted, 1); assert.equal(stableMetrics(f).currentlyVerified, 1); assert.deepEqual(f.bytes('TASK-037-other'), control);
        const done = retained(f, id); refused(await f.perform('accept', id, { reason }), 'NOT_PERMITTED'); refusalConserved(f, id, done);
    }),
    test('TC-TPT-042', 'unproved native history remains with original owners and receives no portable metric or certification', async f => {
        // Given project-native archive/alias/feedback owners with unknown dates and native units.
        await f.create('TASK-042-portable-control'); const portable = owners(f);
        const sources = nativeSources(f, {
            'native/delivery.json': JSON.stringify({ id: 'STORY-042', units: 'story-points', size: 8, acceptedAt: null, owner: 'member-maya' }),
            'native/archive.json': JSON.stringify({ originalId: 'STORY-042', alias: 'ARCHIVE-042', completedAt: null, excluded: true }),
            'native/feedback.md': 'Source customer feedback for STORY-042; observed date unknown.\n'
        });
        // When the public reader inspects the actual selected native profile.
        const snapshot = f.progress();
        // Then only opaque original source identities are disclosed: unknown is never unique-task delivery credit.
        unavailableNative(snapshot, sources); assert.equal(snapshot.profile.kind, 'native');
        assert.equal(snapshot.source.kind, 'worktree'); assert.equal(snapshot.health.status, 'unknown');
        assert.equal(snapshot.items.some(item => item.id === 'STORY-042' || item.acceptance.accepted), false);
        unchanged(f, sources); unchanged(f, portable);
    }),
    test('TC-TPT-096', 'a pinned shared reread surfaces merged identity, member, link and stale-proof conflicts without certifying text', async f => {
        // Given valid separately owned work before competing teammate/manual merge changes.
        f.write('src/export.cjs', 'Reviewed export source.\n'); f.write('native/README.md', 'Owned inert fixture directory.\n');
        for (const id of ['TASK-096-identity', 'TASK-096-member', 'TASK-096-link', 'TASK-096-proof']) await f.create(id);
        await f.saved('link', 'TASK-096-proof', { links: [{ relation: 'source', path: 'src/export.cjs' }] }); await f.accepted('TASK-096-proof');
        const history = f.record('TASK-096-proof').tracking.acceptanceHistory;
        // Deliberate fail-safe inputs: a real text merge/manual edit can duplicate an ID,
        // retain a departed member/link, or change source without re-verifying its old proof.
        const duplicate = f.record('TASK-096-identity'); f.write('work/tasks/merged-duplicate.md', duplicate.bytes);
        const member = f.record('TASK-096-member');
        f.write(member.ownerPath, patchRecord(member, { assigned_to: 'departed-member' }, { ...member.tracking, assigneeId: 'departed-member' }).bytes);
        const linked = f.record('TASK-096-link');
        f.write(linked.ownerPath, patchRecord(linked, {}, { ...linked.tracking, links: [{ relation: 'dependency', itemId: 'TASK-missing-after-merge' }] }).bytes);
        f.write('src/export.cjs', 'The shared export implementation changed after its old proof.\n');
        const mergedOwners = owners(f); const oid = commitFixture(f);
        f.write('src/export.cjs', 'A still later personal source proposal is not the selected shared baseline.\n');
        // When the caller rereads the exact locally available shared revision.
        const snapshot = f.progress({ ref: oid });
        // Then each conflict is explicit and syntactic merge success grants no current certification.
        assert.equal(snapshot.source.kind, 'shared'); assert.equal(snapshot.source.oid, oid); assert.equal(snapshot.coverage, 'partial');
        for (const code of ['DUPLICATE_ID', 'UNKNOWN_MEMBER', 'UNRESOLVED_LINK']) assert.ok(snapshot.diagnostics.some(row => row.code === code), code);
        assert.equal(snapshot.items.find(item => item.id === 'TASK-096-member').assigneeId, 'departed-member');
        assert.equal(snapshot.items.find(item => item.id === 'TASK-096-link').links[0].itemId, 'TASK-missing-after-merge');
        const proofItem = snapshot.items.find(item => item.id === 'TASK-096-proof');
        assert.equal(proofItem.verification.status, 'stale'); assert.equal(proofItem.acceptance.accepted, true);
        assert.deepEqual(proofItem.acceptanceHistory, history); assert.equal(snapshot.metrics.percentage, null); assert.equal(snapshot.metrics.currentlyVerified, 0);
        unchanged(f, mergedOwners); assert.equal(fs.readFileSync(path.join(f.root, 'src/export.cjs'), 'utf8'), 'A still later personal source proposal is not the selected shared baseline.\n');
    }),
    test('TC-TPT-097', 'exact trusted checkpoints record activity, blocker and proof without accepting linked or unrelated work', async f => {
        // Given real active work, an exact producer/session link and an unlinked control.
        f.write('src/export.cjs', 'The producer saved the export implementation.\n');
        await f.create('TASK-097'); await f.saved('link', 'TASK-097', { links: [{ relation: 'source', path: 'src/export.cjs' }] }); await f.active('TASK-097');
        await f.create('TASK-097-other'); const control = f.bytes('TASK-097-other'); const before = f.record('TASK-097');
        const context = { runId: 'actual-run-097', occurrenceId: 'actual-delivery-checkpoint' };
        await upkeep.linkSession({ root: f.root, sessionId: 'session-097', actor: 'owner', producer: 'feature', itemIds: ['TASK-097'], ...context });
        const primary = { status: 'saved', artifact: 'src/export.cjs', outcome: 'Actual saved source checkpoint' };
        // When the saving producer submits its actual observation, optional upkeep records activity only.
        const saved = await upkeep.checkpoint({ root: f.root, sessionId: 'session-097', actor: 'owner', producer: 'feature', checkpointId: 'source-097', primary, observation: observed(), context });
        assert.equal(saved.primary, primary); assert.equal(saved.secondary[0].status, 'saved');
        assert.deepEqual(f.record('TASK-097').tracking.activity, [observed()]); assert.equal(f.record('TASK-097').data.status, 'in_progress');
        const automatic = { automatic: true, linkedItemIds: ['TASK-097'], context };
        const block = { state: 'blocked', reason: 'The saving producer observed an unavailable dependency' };
        await f.saved('transition', 'TASK-097', block, { context }, { ...automatic, observedTransition: block });
        assert.equal(f.view('TASK-097').blocker.reason, block.reason); assert.equal(f.view('TASK-097').blocker.resumeState, 'in_progress');
        const resume = { state: 'in_progress', resolution: 'The producer observed the dependency restored' };
        await f.saved('transition', 'TASK-097', resume, { context }, { ...automatic, observedTransition: resume });
        const handoff = { state: 'verifying' };
        await f.saved('transition', 'TASK-097', handoff, { context }, { ...automatic, observedTransition: handoff });
        // A fixture of a trusted verifier's actual result protects the authority seam;
        // authoring this test does not claim that this verifier has run here.
        const proof = f.proof('TASK-097', { kind: 'test', summary: 'Trusted verifier observed the exact selected export outcome' });
        await f.saved('proof', 'TASK-097', { proof }, { context }, { ...automatic, observedProof: proof });
        assert.equal(f.view('TASK-097').verification.status, 'current'); assert.equal(f.view('TASK-097').state, 'verifying');
        const verified = retained(f, 'TASK-097');
        refused(await f.perform('accept', 'TASK-097', { reason: 'A green verifier does not supply human acceptance' }, { context }, automatic), 'NOT_PERMITTED');
        refusalConserved(f, 'TASK-097', verified);
        const stopped = await upkeep.checkpoint({ root: f.root, sessionId: 'session-097', actor: 'owner', producer: 'feature', checkpointId: 'stopped-097',
            primary: { status: 'interrupted', outcome: 'Work stopped before a source save' }, observation: observed(), context });
        assert.equal(stopped.primary.status, 'interrupted'); assert.equal(stopped.secondary[0].status, 'skipped'); refusalConserved(f, 'TASK-097', verified);
        assert.deepEqual(f.record('TASK-097').tracking.acceptanceHistory, before.tracking.acceptanceHistory);
        assert.equal(f.view('TASK-097').acceptance.accepted, false); assert.equal(stableMetrics(f).accepted, 0); assert.deepEqual(f.bytes('TASK-097-other'), control);
    }),
    test('TC-TPT-112', 'a later governing change turns current proof stale while keeping accepted history and a real re-verification path', async f => {
        // Given accepted work linked to its actual governing specification.
        const spec = 'docs/contracts/export.md'; f.write(spec, 'Export exactly the selected rows.\n');
        await f.create('TASK-112'); await f.saved('link', 'TASK-112', { links: [{ relation: 'spec', path: spec }] }); await f.accepted('TASK-112');
        const before = f.record('TASK-112'); const acceptedBytes = f.bytes('TASK-112'); const acceptance = before.tracking.acceptanceHistory;
        const old = f.view('TASK-112'); assert.equal(old.verification.status, 'current');
        // When the governing owner saves a materially revised acceptance expectation.
        f.write(spec, 'Export selected rows with the newly reviewed governing filter.\n');
        const stale = f.view('TASK-112');
        // Then source readback is stale, historical acceptance survives, and read-only inspection cannot repair it.
        assert.equal(stale.state, 'done'); assert.equal(stale.acceptance.accepted, true); assert.equal(stale.acceptance.historyCount, 1);
        assert.equal(stale.verification.status, 'stale'); assert.match(stale.verification.reason, /Current applicable passing proof/);
        assert.notEqual(stale.verification.criteriaIdentity, old.verification.criteriaIdentity); assert.deepEqual(stale.acceptanceHistory, acceptance);
        assert.deepEqual(f.bytes('TASK-112'), acceptedBytes); assert.equal(stableMetrics(f).accepted, 1); assert.equal(stableMetrics(f).currentlyVerified, 0);
        // A separately observed current proof can recover confidence without forging another accepting decision.
        const proof = f.proof('TASK-112', { observedAt: '2026-01-03T00:00:00.000Z', summary: 'Observed the newly governed selected export outcome' });
        const result = await f.saved('proof', 'TASK-112', { proof }); const after = f.record('TASK-112');
        appendOnly(before, after, 'proof'); assert.equal(result.current.verification.status, 'current');
        assert.deepEqual(after.tracking.acceptanceHistory, acceptance); assert.equal(after.data.status, 'done'); assert.equal(after.tracking.proofs.length, before.tracking.proofs.length + 1);
        assert.equal(stableMetrics(f).accepted, 1); assert.equal(stableMetrics(f).currentlyVerified, 1);
    }),
    test('TC-TPT-083', 'direct refinement saves only the selected delivery owner and never creates a partner or readiness', async f => {
        // Given exact requested intent with separately authored governing specification and sibling work.
        const spec = 'docs/contracts/export.md'; const governing = 'People export only currently filtered rows.\n'; f.write(spec, governing);
        await f.create('TASK-083'); await f.create('TASK-083-other');
        await f.saved('link', 'TASK-083', { links: [{ relation: 'spec', path: spec }] });
        const before = f.record('TASK-083'); const control = f.bytes('TASK-083-other'); const ids = f.records().map(r => r.id).sort();
        const intent = 'People can export only rows matching the reviewed filter';
        // When only this delivery item's intent/title are explicitly saved.
        const result = await f.saved('update', 'TASK-083', { title: 'Export filtered rows', intent }); const after = f.record('TASK-083');
        // Then the governing owner, relationships and unrelated records are preserved.
        assert.equal(result.primary.itemId, 'TASK-083'); assert.equal(after.data.title, 'Export filtered rows'); assert.equal(after.data.intent, intent);
        appendOnly(before, after, 'update'); assert.equal(after.data.status, 'draft'); assert.equal(after.tracking.readiness, undefined);
        assert.deepEqual(after.tracking.links, before.tracking.links); assert.deepEqual(after.tracking.criteria, before.tracking.criteria);
        assert.deepEqual(after.tracking.proofs, []); assert.deepEqual(after.tracking.acceptanceHistory, []);
        assert.deepEqual(f.records().map(r => r.id).sort(), ids); assert.deepEqual(f.bytes('TASK-083-other'), control);
        assert.equal(fs.readFileSync(path.join(f.root, spec), 'utf8'), governing); assert.equal(stableMetrics(f).accepted, 0);
        const denied = retained(f, 'TASK-083'); refused(await f.perform('update', 'TASK-083', { intent: 'Unpermitted replacement' }, {}, { canWrite: false }), 'NOT_PERMITTED');
        refusalConserved(f, 'TASK-083', denied);
    }),
    test('TC-TPT-087', 'a successful primary save survives missing linked work and retry applies only its unresolved checkpoint', async f => {
        // Given a real source save and exact allowed session link, followed by a teammate's removal of the linked owner.
        const primaryBytes = 'The primary export source has already been saved.\n'; f.write('src/export.cjs', primaryBytes);
        await f.create('TASK-087'); await f.create('TASK-087-other'); const original = f.record('TASK-087'); const control = f.bytes('TASK-087-other');
        await upkeep.linkSession({ root: f.root, sessionId: 'session-087', actor: 'owner', producer: 'feature', itemIds: ['TASK-087'] });
        fs.unlinkSync(path.join(f.root, original.ownerPath));
        const primary = { status: 'saved', artifact: 'src/export.cjs', outcome: 'The primary source is saved' };
        const checkpoint = { root: f.root, sessionId: 'session-087', actor: 'owner', producer: 'feature', checkpointId: 'saved-source-087', primary, observation: observed() };
        // When optional upkeep cannot find its exact linked owner, primary and pending remain separate.
        const missing = await upkeep.checkpoint(checkpoint);
        assert.equal(missing.primary, primary); assert.deepEqual(missing.secondary.map(row => [row.itemId, row.status]), [['TASK-087', 'pending']]);
        assert.match(missing.secondary[0].reason, /missing or ambiguous/); assert.equal(fs.existsSync(path.join(f.root, original.ownerPath)), false);
        assert.equal(fs.readFileSync(path.join(f.root, 'src/export.cjs'), 'utf8'), primaryBytes); assert.deepEqual(f.bytes('TASK-087-other'), control);
        // Real permitted recovery restores the original owner; retry the retained checkpoint, not the primary source save.
        f.write(original.ownerPath, original.bytes); const recovered = await upkeep.checkpoint(checkpoint);
        assert.equal(recovered.primary, primary); assert.deepEqual(recovered.secondary.map(row => [row.itemId, row.status]), [['TASK-087', 'saved']]);
        const after = f.record('TASK-087'); appendOnly(original, after, 'activity'); assert.deepEqual(after.tracking.activity, [observed()]);
        assert.equal(after.data.status, 'draft'); assert.deepEqual(after.tracking.proofs, []); assert.deepEqual(after.tracking.acceptanceHistory, []);
        const saved = f.bytes('TASK-087'); const repeated = await upkeep.checkpoint(checkpoint);
        assert.equal(repeated.primary, primary); assert.equal(repeated.secondary[0].result.replayed, true); assert.deepEqual(f.bytes('TASK-087'), saved);
        assert.deepEqual(f.bytes('TASK-087-other'), control); assert.equal(fs.readFileSync(path.join(f.root, 'src/export.cjs'), 'utf8'), primaryBytes);
        assert.equal(stableMetrics(f).accepted, 0);
    }),
    test('TC-TPT-088', 'unproved native intent and extra coverage writes refuse without changing identity, coverage or portable controls', async f => {
        // Given an existing project-native identity/coverage owner and a former portable control.
        await f.create('TASK-088'); const portable = owners(f);
        const update = f.request('update', 'TASK-088', { intent: 'The newly requested native outcome' });
        const extra = f.request('create', 'TASK-088-extra', { title: 'Additional coverage', intent: 'Requested extra outcome' });
        const sources = nativeSources(f, { 'native/intent.json': JSON.stringify({ id: 'TASK-088', intent: 'Original native intent', coverage: ['STORY-088'], observedAt: null }) });
        // When current public operations encounter a native profile whose complete footprint is unproved.
        for (const request of [update, extra]) {
            const draft = JSON.stringify(request); const result = await f.core.executeOperation(request, f.authority());
            // Then unavailable work is explicit and neither save nor extra coverage is fabricated.
            refused(result, 'UNPROVED_NATIVE_CAPABILITY'); assert.match(result.primary.reason, /original records preserved/);
            assert.deepEqual(result.secondary, []); assert.equal(JSON.stringify(request), draft); unchanged(f, sources); unchanged(f, portable);
            assert.equal(fs.existsSync(path.join(f.root, 'work/tasks/TASK-088-extra.md')), false);
        }
        unavailableNative(f.progress(), sources);
    }),
    test('TC-TPT-089', 'unproved whole native assignment refuses both exact leaves before any responsibility or secondary owner write', async f => {
        // Given exact selected native leaves, an active requested member, unselected work and a separate coordinator.
        f.config.taskTracking.members.push({ id: 'member-leo', displayName: 'Leo', active: true }); f.saveConfig();
        for (const id of ['STORY-101', 'STORY-102', 'STORY-103']) await f.create(id, 'story'); await f.create('AREA-10', 'area');
        const requests = ['STORY-101', 'STORY-102'].map(id => f.request('assign', id, { assigneeId: 'member-leo' })); const portable = owners(f);
        const sources = nativeSources(f, {
            'native/delivery.json': JSON.stringify({ leaves: [
                { id: 'STORY-101', owner: 'member-duc', state: 'Ready', proof: [], acceptance: null },
                { id: 'STORY-102', owner: 'member-maya', state: 'In progress', proof: [], acceptance: null },
                { id: 'STORY-103', owner: 'member-maya', state: 'Ready', proof: [], acceptance: null }], history: ['Original authored history'] }),
            'native/group.json': JSON.stringify({ id: 'AREA-10', coordinator: 'member-sam', members: ['STORY-101', 'STORY-102', 'STORY-103'] }),
            'native/refresh.json': JSON.stringify({ authority: 'project-owned secondary owner', revisedAt: null })
        });
        const drafts = requests.map(request => JSON.stringify(request));
        // When the public batch owner receives the two exact requests, the same whole-footprint gate protects each.
        const result = await f.core.executeBatch(requests, f.authority()); assert.equal(result.atomicity, 'per-record'); assert.equal(result.results.length, 2);
        for (const row of result.results) { refused(row, 'UNPROVED_NATIVE_CAPABILITY'); assert.deepEqual(row.secondary, []); }
        // Then both selected native owners, unselected/coordinator/secondary owners and former portable files remain exact.
        assert.deepEqual(requests.map(request => JSON.stringify(request)), drafts); unchanged(f, sources); unchanged(f, portable);
        unavailableNative(f.progress(), sources);
        // Repeating an unproved request remains refused and cannot manufacture a saved receipt.
        const repeated = await f.core.executeBatch(requests, f.authority());
        for (const row of repeated.results) refused(row, 'UNPROVED_NATIVE_CAPABILITY'); unchanged(f, sources); unchanged(f, portable);
    }),
    test('TC-TPT-090', 'native current and pinned shared inspection keep distinct source identities and unavailable shared scope cannot fall back', async f => {
        // Given a local native baseline followed by a real unshared change to its selected owner.
        await f.create('TASK-090-control'); f.write('src/export.cjs', 'Owned baseline source.\n');
        const original = nativeSources(f, { 'native/status.json': JSON.stringify({ id: 'STORY-090', owner: 'member-maya', units: 'story-points', size: 5, acceptedAt: null }) });
        const oid = commitFixture(f); const changed = Buffer.from(JSON.stringify({ id: 'STORY-090', owner: 'member-leo', units: 'story-points', size: 5, acceptedAt: null }));
        f.write('native/status.json', changed); const currentSources = new Map([['native/status.json', changed]]); const portable = owners(f);
        // When the caller explicitly selects current versus one existing local shared commit.
        const current = f.progress(); const shared = f.progress({ ref: oid });
        unavailableNative(current, currentSources); unavailableNative(shared, original);
        assert.equal(current.source.kind, 'worktree'); assert.equal(shared.source.kind, 'shared'); assert.equal(shared.source.oid, oid);
        assert.equal(shared.source.ref, oid); assert.equal(shared.source.remoteFreshness, 'unknown'); assert.notEqual(current.fingerprint, shared.fingerprint);
        // Then a missing shared ref is unavailable, never the changed current owner or an invented green result.
        const missing = f.progress({ ref: 'refs/heads/missing-native-baseline' });
        assert.equal(missing.coverage, 'unavailable'); assert.equal(missing.metrics, null); assert.deepEqual(missing.items, []);
        assert.ok(missing.diagnostics.some(row => row.code === 'UNAVAILABLE_BASELINE')); assert.equal(missing.source, undefined);
        unchanged(f, currentSources); unchanged(f, portable); assert.equal(fs.existsSync(path.join(f.root, '.git/FETCH_HEAD')), false);
    }),
    test('TC-TPT-091', 'native archive review preserves unknown dates and feedback without importing portable acceptance', async f => {
        // Given real portable accepted history elsewhere and selected opaque native history with aliases/unknown dates.
        await f.create('TASK-091-control'); await f.accepted('TASK-091-control'); const portable = owners(f);
        const sources = nativeSources(f, {
            'native/archive.json': JSON.stringify({ id: 'STORY-091', aliases: ['OLD-091'], units: 'delivered-story', state: 'Archived', acceptedAt: null, history: [{ action: 'legacy delivery', at: null }] }),
            'native/feedback.md': 'Retained project feedback; date unknown; related original identity STORY-091.\n'
        });
        // When the public reader inspects native freshness/history repeatedly.
        const first = f.progress(); const second = f.progress();
        // Then opaque inventory remains stable and prior portable acceptance cannot certify native work.
        unavailableNative(first, sources); unavailableNative(second, sources); assert.equal(first.fingerprint, second.fingerprint);
        assert.equal(first.items.some(item => item.acceptance?.accepted), false); assert.equal(first.metrics, null);
        unchanged(f, sources); unchanged(f, portable);
    }),
    test('TC-TPT-121', 'bounded live-input partitions disclose lost source and missing scope while an old view grants no write authority', async f => {
        // Given a complete permitted read and a previously captured disposable JSON view.
        const source = 'src/export.cjs'; const originalSource = 'Reviewed selected export source.\n'; f.write(source, originalSource);
        await f.create('TASK-121'); await f.saved('link', 'TASK-121', { links: [{ relation: 'source', path: source }] }); await f.accepted('TASK-121');
        const original = owners(f); const complete = f.progress(); assert.equal(complete.coverage, 'complete'); assert.equal(complete.items[0].verification.status, 'current');
        const previousView = JSON.stringify(complete); f.write('tmp/previous-view.json', previousView);
        // When a real source owner disappears or becomes non-readable as a regular source file.
        // A directory is the portable unsafe-input witness; this does not pretend to test OS ACL denial.
        for (const partition of ['missing', 'nonregular']) {
            fs.unlinkSync(path.join(f.root, source));
            if (partition === 'nonregular') fs.mkdirSync(path.join(f.root, source));
            const current = f.progress(); const item = current.items.find(row => row.id === 'TASK-121');
            // Then old output cannot fill missing live evidence or create precise green coverage.
            assert.equal(current.coverage, 'partial', partition); assert.equal(item.verification.status, 'unknown');
            assert.equal(item.verification.code, partition === 'missing' ? 'ENOENT' : 'UNSAFE_PATH');
            assert.equal(item.acceptance.accepted, true); assert.equal(current.metrics.currentlyVerified, 0); assert.equal(current.metrics.percentage, null);
            assert.ok(current.diagnostics.some(row => row.itemId === 'TASK-121' && row.code === item.verification.code));
            const denied = await f.perform('update', 'TASK-121', { title: 'Old view cannot authorize this write' }, {}, { canWrite: false });
            refused(denied, 'NOT_PERMITTED'); unchanged(f, original);
            assert.equal(fs.readFileSync(path.join(f.root, 'tmp/previous-view.json'), 'utf8'), previousView);
            if (partition === 'nonregular') fs.rmdirSync(path.join(f.root, source));
            f.write(source, originalSource);
        }
        // Malformed selected owners disclose omitted scope, even when the surviving proof is current.
        f.write('work/tasks/unknown-input.md', '---\nid: TASK-unknown\ntitle: Unknown imported input\nstatus: [\n---\n');
        const partial = f.progress(); assert.equal(partial.coverage, 'partial'); assert.equal(partial.metrics.percentage, null);
        assert.ok(partial.diagnostics.some(row => row.path === 'work/tasks/unknown-input.md')); unchanged(f, original);
        fs.unlinkSync(path.join(f.root, 'work/tasks/unknown-input.md'));
        await f.create('AREA-121', 'area'); const area = f.record('AREA-121'); fs.unlinkSync(path.join(f.root, area.ownerPath));
        const missingScope = f.progress({ scopeId: 'AREA-121' });
        assert.equal(missingScope.coverage, 'unavailable'); assert.equal(missingScope.scope.coverage, 'unavailable'); assert.equal(missingScope.metrics, null);
        assert.ok(missingScope.diagnostics.some(row => row.code === 'UNAVAILABLE_SCOPE')); unchanged(f, original);
    }),
    test('TC-TPT-122', 'native operation partitions preserve every original owner before any create, update or secondary footprint can run', async f => {
        // Given trusted source bytes with native identity, history, unknown dates and metric units.
        await f.create('TASK-122'); await f.create('AREA-122', 'area'); const portable = owners(f);
        const proof = f.proof('TASK-122');
        const requests = [
            f.request('create', 'TASK-122-extra', { title: 'Requested additional outcome', intent: 'Preserve native authority' }),
            f.request('update', 'TASK-122', { title: 'Requested native title' }),
            f.request('assign', 'TASK-122', { assigneeId: 'peer' }),
            f.request('link', 'TASK-122', { links: [] }),
            f.request('tag', 'TASK-122', { areaIds: ['AREA-122'] }),
            f.request('transition', 'TASK-122', { state: 'planned' }),
            f.request('proof', 'TASK-122', { proof }), f.request('accept', 'TASK-122', { reason: 'Explicit scoped decision' }),
            f.request('retire', 'TASK-122', { reason: 'Explicit retirement request' }), f.request('restore', 'TASK-122', { reason: 'Explicit restore request' }),
            f.request('adopt', 'TASK-122', {}), f.request('delete', 'TASK-122', { reason: 'Explicit selected draft request' })
        ];
        const sources = nativeSources(f, {
            'native/delivery.json': JSON.stringify({ id: 'TASK-122', owner: 'native-original', units: 'weighted-outcome', size: 13, acceptedAt: null, history: [{ at: null, action: 'Legacy native action' }] }),
            'native/coverage.json': JSON.stringify({ spec: 'SPEC-122', outcomes: ['TASK-122'], coverage: 'project-defined' }),
            'native/secondary-refresh.json': JSON.stringify({ owner: 'native-refresh-owner', revisedAt: null })
        });
        // Property over the explicit operation/version partitions; no fabricated adapter or refresh API.
        for (const version of [1, 2]) {
            f.config.taskTracking.profile.version = version; f.saveConfig();
            const configBytes = fs.readFileSync(path.join(f.root, 'docs/project-config.json'));
            for (const request of requests) {
                const draft = JSON.stringify(request); const result = await f.core.executeOperation(request, f.authority());
                refused(result, 'UNPROVED_NATIVE_CAPABILITY'); assert.deepEqual(result.secondary, []);
                assert.match(result.primary.reason, /whole-footprint preservation/); assert.equal(JSON.stringify(request), draft);
                unchanged(f, sources); unchanged(f, portable); assert.deepEqual(fs.readFileSync(path.join(f.root, 'docs/project-config.json')), configBytes);
                assert.equal(fs.existsSync(path.join(f.root, 'work/tasks/TASK-122-extra.md')), false);
            }
            unavailableNative(f.progress(), sources);
        }
    }),
    test('TC-TPT-125', 'finite policy controls act independently and disabling tracking retains earlier saves while stopping the next optional write', async f => {
        // The deterministic domain is mode x task opt-out x report preference x actual write authority.
        // Named/guided model selection is outside this core seam and has a separate owner.
        f.write('src/export.cjs', 'Actual saved source for optional upkeep.\n'); let n = 0;
        for (const mode of ['off', 'observe', 'linked']) for (const optOut of [false, true]) for (const enabled of [false, true]) for (const canWrite of [false, true]) {
            f.config.taskTracking.mode = mode; f.config.taskTracking.report.enabled = enabled; f.saveConfig();
            const id = `TASK-125-${++n}`; await f.create(id); await f.saved('update', id, { optOut });
            const before = f.record(id); const title = `Explicit ${mode} ${optOut} ${enabled} ${canWrite}`;
            // Direct intent remains independent of optional tracking/report switches, inside actual authority.
            const direct = await f.perform('update', id, { title }, {}, { canWrite });
            if (canWrite) { assert.equal(direct.primary.status, 'saved'); assert.equal(f.record(id).data.title, title); }
            else { refused(direct, 'NOT_PERMITTED'); assert.deepEqual(f.bytes(id), before.bytes); }
            const prior = f.record(id); const observation = observed(`Actual saved source for partition ${n}`);
            const optional = await f.perform('activity', id, { observation }, {}, { automatic: true, canWrite, linkedItemIds: [id], observation });
            if (!canWrite) refused(optional, 'NOT_PERMITTED');
            else if (mode !== 'linked' || optOut) assert.equal(optional.primary.status, 'skipped');
            else {
                assert.equal(optional.primary.status, 'saved'); assert.deepEqual(f.record(id).tracking.activity, [observation]);
                appendOnly(prior, f.record(id), 'activity');
            }
            if (optional.primary.status !== 'saved') assert.deepEqual(f.bytes(id), prior.bytes);
            const current = f.record(id); assert.equal(current.data.status, 'draft'); assert.equal(current.tracking.optOut, optOut);
            assert.deepEqual(current.tracking.proofs, []); assert.deepEqual(current.tracking.acceptanceHistory, []);
        }
        assert.equal(n, 24); assert.equal(stableMetrics(f).accepted, 0);
        // An actual successful primary refinement precedes a real policy change before its next optional checkpoint.
        f.config.taskTracking.mode = 'linked'; f.saveConfig(); await f.create('TASK-125-primary');
        await upkeep.linkSession({ root: f.root, sessionId: 'session-125', actor: 'owner', producer: 'feature', itemIds: ['TASK-125-primary'] });
        const primary = await f.saved('update', 'TASK-125-primary', { intent: 'The earlier primary intent save must remain' }); const saved = f.bytes('TASK-125-primary');
        f.config.taskTracking.mode = 'off'; f.saveConfig();
        const stopped = await upkeep.checkpoint({ root: f.root, sessionId: 'session-125', actor: 'owner', producer: 'feature', checkpointId: 'after-disable-125', primary: primary.primary, observation: observed() });
        assert.equal(stopped.primary, primary.primary); assert.equal(stopped.secondary[0].status, 'skipped'); assert.match(stopped.secondary[0].reason, /off/);
        assert.deepEqual(f.bytes('TASK-125-primary'), saved); assert.equal(f.record('TASK-125-primary').data.intent, 'The earlier primary intent save must remain');
        assert.equal(f.view('TASK-125-primary').acceptance.accepted, false);
    }),
    test('TC-TPT-135', 'overlap and tag-order permutations conserve unique delivery while completed enabling work adds no credit', async f => {
        // Given accepted/unaccepted/canceled tasks tagged to two areas under one area, through public operations.
        for (const id of ['TASK-135-a', 'TASK-135-b', 'TASK-135-c']) await f.create(id);
        await f.accepted('TASK-135-a'); await f.saved('transition', 'TASK-135-c', { state: 'canceled', reason: 'The outcome was removed from active delivery' });
        await f.create('AREA-135', 'area'); for (const id of ['AREA-135-a', 'AREA-135-b']) await f.create(id, 'area', { areaIds: ['AREA-135'] });
        await f.tag('TASK-135-a', { areaIds: ['AREA-135-a', 'AREA-135-b'] }); await f.tag('TASK-135-b', { areaIds: ['AREA-135-a'] }); await f.tag('TASK-135-c', { areaIds: ['AREA-135-b'] });
        const delivery = owners(f); const base = f.progress({ scopeId: 'AREA-135' }).metrics;
        assert.deepEqual(base.eligibleIds, ['TASK-135-a', 'TASK-135-b']); assert.equal(base.total, 2); assert.equal(base.accepted, 1); assert.equal(base.canceled, 1); assert.equal(base.percentage, 50);
        // When enabling work itself completes, neither project nor selected delivery gets a task credit.
        const project = stableMetrics(f); await f.create('SUBTASK-135', 'subtask'); await f.accepted('SUBTASK-135');
        assert.equal(f.view('SUBTASK-135').acceptance.accepted, true); assert.deepEqual(stableMetrics(f), project); unchanged(f, delivery);
        await f.tag('SUBTASK-135', { areaIds: ['AREA-135-a'] });
        // Metamorphic property: the task is tagged to both areas and directly to the area above them, and every order of
        // its three tags is the same overlapping direct/transitive union.
        const permutations = [
            ['AREA-135-a', 'AREA-135-b', 'AREA-135'], ['AREA-135-a', 'AREA-135', 'AREA-135-b'],
            ['AREA-135-b', 'AREA-135-a', 'AREA-135'], ['AREA-135-b', 'AREA-135', 'AREA-135-a'],
            ['AREA-135', 'AREA-135-a', 'AREA-135-b'], ['AREA-135', 'AREA-135-b', 'AREA-135-a']
        ];
        for (const areaIds of permutations) {
            await f.tag('TASK-135-a', { areaIds }); const view = f.progress({ scopeId: 'AREA-135' });
            assert.equal(view.coverage, 'complete'); assert.deepEqual(view.scope.taskIds, ['TASK-135-a', 'TASK-135-b', 'TASK-135-c']);
            assert.deepEqual(view.scope.excludedTaskIds, ['TASK-135-c']); assert.deepEqual(view.metrics, base);
            assert.equal(view.scope.memberIds.filter(id => id === 'TASK-135-a').length, 1); assert.ok(view.scope.memberIds.includes('SUBTASK-135'));
        }
        // An invalid duplicate within one declared list is refused before owner/history/credit changes.
        const before = retained(f, 'TASK-135-a'); const scoped = f.progress({ scopeId: 'AREA-135' }).metrics;
        refused(await f.perform('tag', 'TASK-135-a', { areaIds: ['AREA-135-a', 'AREA-135-a'] }), 'INVALID_RELATIONSHIP');
        refusalConserved(f, 'TASK-135-a', before); assert.deepEqual(f.progress({ scopeId: 'AREA-135' }).metrics, scoped);
    }),
    test('TC-TPT-137', 'portable current, historical shared and native views retain selected authority without substituting missing confidence', async f => {
        // Given one accepted portable baseline with declared source, then later unverified personal scope.
        f.write('src/export.cjs', 'The historically verified export source.\n'); f.write('native/owner.json', '{"id":"NATIVE-137","acceptedAt":null}\n');
        await f.create('TASK-137'); await f.saved('link', 'TASK-137', { links: [{ relation: 'source', path: 'src/export.cjs' }] }); await f.accepted('TASK-137');
        const oid = commitFixture(f); const acceptedHistory = f.record('TASK-137').tracking.acceptanceHistory;
        await f.create('TASK-137-unverified'); f.write('src/export.cjs', 'A later personal implementation has not been verified.\n');
        const originals = owners(f);
        const historical = f.progress({ ref: oid }); const current = f.progress();
        assert.equal(historical.source.kind, 'shared'); assert.equal(historical.source.oid, oid); assert.equal(historical.profile.kind, 'portable-markdown');
        assert.deepEqual(historical.metrics.eligibleIds, ['TASK-137']); assert.equal(historical.items[0].verification.status, 'current');
        assert.equal(current.source.kind, 'worktree'); assert.deepEqual(current.metrics.eligibleIds, ['TASK-137', 'TASK-137-unverified']);
        assert.equal(current.items.find(item => item.id === 'TASK-137').verification.status, 'stale');
        assert.equal(current.items.find(item => item.id === 'TASK-137-unverified').verification.status, 'missing'); assert.equal(current.metrics.currentlyVerified, 0);
        assert.deepEqual(current.items.find(item => item.id === 'TASK-137').acceptanceHistory, acceptedHistory); assert.notEqual(current.fingerprint, historical.fingerprint);
        // Missing live input and missing baseline each disclose their actual unavailable/unknown face.
        fs.unlinkSync(path.join(f.root, 'src/export.cjs')); const lost = f.progress();
        assert.equal(lost.coverage, 'partial'); assert.equal(lost.items.find(item => item.id === 'TASK-137').verification.status, 'unknown');
        assert.equal(lost.metrics.percentage, null); assert.equal(lost.metrics.currentlyVerified, 0);
        const missing = f.progress({ ref: 'refs/heads/missing-137' }); assert.equal(missing.coverage, 'unavailable'); assert.equal(missing.metrics, null);
        assert.deepEqual(missing.items, []); assert.ok(missing.diagnostics.some(row => row.code === 'UNAVAILABLE_BASELINE'));
        // Selecting a native current authority must not make a prior portable acceptance its native projection.
        const sources = nativeSources(f, { 'native/owner.json': '{"id":"NATIVE-137","acceptedAt":null}\n' });
        unavailableNative(f.progress(), sources);
        const stillHistorical = f.progress({ ref: oid }); assert.equal(stillHistorical.profile.kind, 'portable-markdown');
        assert.equal(stillHistorical.source.oid, oid); assert.deepEqual(stillHistorical.metrics.eligibleIds, ['TASK-137']);
        assert.equal(stillHistorical.items[0].verification.status, 'current'); unchanged(f, originals); unchanged(f, sources);
    }),
    test('TC-TPT-142', 'exact Maya assignment retains Ready intent and unaccepted delivery while stale or unavailable maintenance cannot claim saved', async f => {
        // Given actual reviewed Ready work, active Maya, an independent control and governing intent.
        f.config.taskTracking.members.push({ id: 'member-maya', displayName: 'Maya', active: true }); f.saveConfig();
        f.write('docs/contracts/export.md', 'People can export only filtered records.\n');
        await f.create('TASK-104'); await f.saved('link', 'TASK-104', { links: [{ relation: 'spec', path: 'docs/contracts/export.md' }] });
        await f.ready('TASK-104'); await f.saved('assign', 'TASK-104', { assigneeId: 'peer' }); await f.create('TASK-142-other');
        const before = f.record('TASK-104'); const control = f.bytes('TASK-142-other'); const metrics = stableMetrics(f);
        // When the coordinator's actual permitted action selects Maya by her unambiguous name.
        const result = await f.saved('assign', 'TASK-104', { assigneeId: 'Maya' }); const after = f.record('TASK-104');
        // Then the direct result/readback shows stable responsibility and only requested maintenance facts.
        assert.equal(result.current.assigneeId, 'member-maya'); assert.equal(after.data.assigned_to, 'member-maya'); assert.equal(after.tracking.assigneeId, 'member-maya');
        assert.equal(after.data.status, 'ready'); assert.equal(after.data.intent, before.data.intent); assert.equal(after.data.title, before.data.title);
        appendOnly(before, after, 'assign');
        for (const key of ['criteria', 'links', 'readiness', 'proofs', 'acceptanceHistory', 'collaboratorIds']) assert.deepEqual(after.tracking[key], before.tracking[key]);
        assert.equal(result.current.acceptance.accepted, false); assert.equal(result.current.verification.status, 'missing');
        assert.deepEqual(stableMetrics(f), metrics); assert.deepEqual(f.bytes('TASK-142-other'), control);
        // A real intervening teammate save refuses the retained stale draft without reporting saved.
        const stale = f.request('assign', 'TASK-104', { assigneeId: 'peer' }); const draft = JSON.stringify(stale);
        await f.saved('update', 'TASK-104', { priority: 2 }, { actor: { memberId: 'peer' } }, { actor: 'peer' }); const newer = retained(f, 'TASK-104');
        refused(await f.core.executeOperation(stale, f.authority()), 'CONFLICT'); refusalConserved(f, 'TASK-104', newer); assert.equal(JSON.stringify(stale), draft);
        refused(await f.perform('assign', 'TASK-104', { assigneeId: 'peer' }, {}, { canWrite: false }), 'NOT_PERMITTED'); refusalConserved(f, 'TASK-104', newer);
        f.config.taskTracking.members.find(member => member.id === 'member-maya').active = false; f.saveConfig(); const inactive = retained(f, 'TASK-104');
        refused(await f.perform('assign', 'TASK-104', { assigneeId: 'Maya' }), 'INVALID_MEMBER'); refusalConserved(f, 'TASK-104', inactive);
        assert.equal(f.view('TASK-104').assigneeId, 'member-maya'); assert.equal(f.view('TASK-104').state, 'ready'); assert.equal(f.view('TASK-104').acceptance.accepted, false);
        assert.deepEqual(f.bytes('TASK-142-other'), control);
    }),
    test('TC-TPT-076', 'canceling an area that holds tasks changes no figure and removes no tag, and an area never earns credit', async f => {
        // Given a feature area under a product area, holding one accepted task that is also linked to an initiative and one open task.
        await f.create('AREA-287-parent', 'area', { level: 'product' }); await f.create('AREA-287', 'area', { level: 'feature', areaIds: ['AREA-287-parent'] });
        await f.create('INIT-287', 'initiative');
        await f.create('TASK-287-accepted', 'task', { areaIds: ['AREA-287'], initiativeIds: ['INIT-287'] }); await f.accepted('TASK-287-accepted');
        await f.create('TASK-287-open', 'task', { areaIds: ['AREA-287'] });
        const stated = () => { const read = f.progress({ figures: true }); return { coverage: read.coverage, metrics: read.metrics, figures: read.figures, hierarchy: read.hierarchy, scope: read.scope }; };
        const scoped = () => Object.fromEntries(['AREA-287', 'AREA-287-parent', 'INIT-287'].map(scopeId => [scopeId, f.progress({ scopeId }).metrics]));
        const before = stated(); const beforeScoped = scoped(); assert.equal(before.coverage, 'complete'); assert.equal(before.figures.status, 'complete');
        assert.equal(beforeScoped['AREA-287'].total, 2); assert.equal(beforeScoped['AREA-287'].accepted, 1); assert.equal(beforeScoped['AREA-287-parent'].percentage, 50);
        assert.equal(beforeScoped['INIT-287'].percentage, 100);
        // The area is a place for work, not work: three records that are no task add nothing to the project's two.
        assert.deepEqual(before.metrics.eligibleIds, ['TASK-287-accepted', 'TASK-287-open']); assert.equal(before.metrics.total, 2); assert.equal(f.view('AREA-287').acceptance.accepted, false);
        const others = new Map(f.records().filter(record => record.id !== 'AREA-287').map(record => [record.ownerPath, record.bytes])); const active = f.record('AREA-287');
        // When a person cancels the area, giving the reason.
        const reason = 'The feature is no longer offered';
        const result = await f.saved('transition', 'AREA-287', { state: 'canceled', reason }); const canceled = f.record('AREA-287');
        assert.equal(result.current.state, 'canceled'); appendOnly(active, canceled, 'transition');
        assert.equal(canceled.tracking.history.at(-1).beforeState, 'active'); assert.equal(canceled.tracking.history.at(-1).reason, reason);
        // Then the project, the area itself, its parent and the linked initiative state exactly what they stated, row for row.
        assert.deepEqual(stated(), before); assert.deepEqual(scoped(), beforeScoped);
        // And the tasks keep their tags: only the area's own record was saved.
        unchanged(f, others); assert.deepEqual(f.view('TASK-287-open').links, [{ relation: 'area', itemId: 'AREA-287' }]);
        assert.deepEqual(f.view('TASK-287-accepted').links, [{ relation: 'area', itemId: 'AREA-287' }, { relation: 'initiative', itemId: 'INIT-287' }]);
        assert.equal(f.view('AREA-287').acceptance.accepted, false);
        // Retiring the canceled area keeps its history out of active view and still moves no figure.
        await f.saved('retire', 'AREA-287', { reason: 'Kept as history only' });
        assert.deepEqual(stated(), before); assert.deepEqual(scoped(), beforeScoped); unchanged(f, others);
    }),
    test('TC-TPT-275', 'an initiative whose linked tasks are all accepted stays committed at 100 percent', async f => {
        // Given a committed initiative with two linked tasks, one already accepted.
        await f.create('INIT-291', 'initiative'); await f.committed('INIT-291');
        for (const id of ['TASK-291-a', 'TASK-291-b']) await f.create(id, 'task', { initiativeIds: ['INIT-291'] });
        const committed = f.record('INIT-291'); assert.equal(committed.data.status, 'committed');
        await f.accepted('TASK-291-a');
        const half = f.progress({ scopeId: 'INIT-291' }); assert.equal(half.metrics.percentage, 50); assert.equal(f.view('INIT-291').state, 'committed');
        // When the last linked task is accepted.
        await f.accepted('TASK-291-b'); const read = f.progress({ scopeId: 'INIT-291', figures: true });
        // Then every linked task is credited and the figure is complete.
        assert.equal(read.coverage, 'complete'); assert.deepEqual(read.scope.eligibleTaskIds, ['TASK-291-a', 'TASK-291-b']);
        assert.deepEqual(read.figures.initiatives, [{ id: 'INIT-291', total: 2, accepted: 2, remaining: 0, currentlyVerified: 2, canceled: 0, retired: 0, percentage: 100 }]);
        assert.equal(read.metrics.total, 2); assert.equal(read.metrics.accepted, 2); assert.equal(read.metrics.remaining, 0); assert.equal(read.metrics.percentage, 100);
        // And the initiative is exactly the record it was: it is read as committed, nothing closed it, and closing stays a person's decision.
        const item = read.items.find(row => row.id === 'INIT-291');
        assert.equal(item.state, 'committed'); assert.equal(item.lifecycle, 'tracker'); assert.equal(item.acceptance.accepted, false);
        assert.deepEqual(f.bytes('INIT-291'), committed.bytes); assert.equal(f.record('INIT-291').data.status, 'committed');
        assert.deepEqual(f.record('INIT-291').tracking.history.map(entry => entry.afterState), ['draft', 'approved', 'committed']);
    })
] };
