'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { trackingTest: test, refused, OBSERVED_AT } = require('../lib/task-tracking-fixture.cjs');

// The four area levels, shallowest first, spelled out here: a level the owner gains, loses or reorders is noticed.
const LEVELS = ['application', 'product', 'module', 'feature'];

// Capture that may be refused: the fixture's own `create` asserts a save.
const capture = (f, id, kind, patch = {}) => f.perform('create', id, { title: 'Defined work', intent: 'A defined outcome', ...patch }, { target: { kind, itemId: id } });

// What the relationship check finds on one record as it would be stored with these links: each finding's code and reason.
// Nothing is saved. A refused save answers INVALID_RELATIONSHIP whatever was found; this names the finding behind it.
function relationshipFindings(f, id, links) {
    const { patchRecord } = require('../../lib/task-artifact-store.cjs'); const { graphFindings } = require('../../lib/task-tracking-policy.cjs');
    const records = f.records(); const record = records.find(value => value.id === id);
    const candidate = patchRecord(record, {}, { ...record.tracking, links });
    return graphFindings([...records.filter(value => value.id !== id), candidate]).filter(finding => finding.itemId === id).map(finding => [finding.code, finding.reason]);
}

const utcDate = () => new Date().toISOString().slice(0, 10);
const shiftDate = (date, days) => new Date(Date.parse(`${date}T00:00:00.000Z`) + days * 86400000).toISOString().slice(0, 10);

// A read marks overdue work against the UTC date it is taken on. `arrange(date)` places the due dates for that date; the
// whole step is repeated when the date changed before the read returned, so a case about the day itself never straddles midnight.
async function readWithinOneDate(f, arrange) {
    for (let attempt = 0; attempt < 3; attempt++) {
        const date = utcDate();
        await arrange(date);
        const read = f.progress();
        if (utcDate() === date) return { date, read };
    }
    return assert.fail('The UTC date changed during three consecutive reads');
}

async function assignmentScope(f) {
    f.config.taskTracking.members.push({ id: 'recipient', displayName: 'Recipient', active: true }, { id: 'coordinator', displayName: 'Coordinator', active: true });
    f.saveConfig();
    await f.create('AREA-101', 'area');
    for (const id of ['STORY-101', 'STORY-102', 'STORY-103']) await f.create(id, 'story', { areaIds: ['AREA-101'] });
    await f.accepted('STORY-101'); await f.verifying('STORY-102');
    await f.saved('proof', 'STORY-102', { proof: f.proof('STORY-102') });
    await f.saved('assign', 'STORY-102', { assigneeId: 'peer' }); await f.saved('assign', 'STORY-103', { assigneeId: 'peer' });
    await f.saved('assign', 'AREA-101', { assigneeId: 'coordinator' });
    return { selected: ['STORY-101', 'STORY-102'], controls: new Map(['STORY-103', 'AREA-101'].map(id => [id, f.bytes(id)])) };
}

function assignedWithoutPromotion(f, id, before) {
    const after = f.record(id);
    assert.equal(after.tracking.assigneeId, 'recipient'); assert.equal(after.data.assigned_to, 'recipient');
    assert.equal(after.revision, before.revision + 1);
    assert.deepEqual(after.data, { ...before.data, assigned_to: 'recipient', tracking: after.tracking });
    assert.equal(after.body, before.body); assert.equal(after.ownerPath, before.ownerPath);
    for (const field of Object.keys(before.tracking).filter(key => !['revision', 'assigneeId', 'history', 'receipts', 'context'].includes(key)))
        assert.deepEqual(after.tracking[field], before.tracking[field], `${id} retains ${field}`);
    assert.equal(after.tracking.history.length, before.tracking.history.length + 1);
    assert.equal(after.tracking.receipts.length, before.tracking.receipts.length + 1);
    assert.deepEqual(after.tracking.history.slice(0, -1), before.tracking.history);
    assert.deepEqual(after.tracking.receipts.slice(0, -1), before.tracking.receipts);
    assert.equal(after.tracking.history.at(-1).operation, 'assign');
    assert.equal(after.tracking.history.at(-1).afterAssigneeId, 'recipient');
    assert.deepEqual(after.tracking.context, { operationId: after.tracking.receipts.at(-1).operationId, kind: 'direct' });
    assert.deepEqual(after.tracking.history.at(-1).context, after.tracking.context);
}

// Participation names describe this fixture's actors; only the real caller's
// capabilities grant authority. Each native case gets its own disposable checkout.
async function permittedScopedEdit(f, actor, displayName, id) {
    f.config.taskTracking.members.push({ id: actor, displayName, active: true }); f.saveConfig();
    await f.create(id); await f.saved('assign', id, { assigneeId: 'owner' });
    await f.create('TASK-access-control'); await f.accepted('TASK-access-control');
    const before = f.record(id); const metrics = f.progress().metrics;
    const other = f.bytes('TASK-access-control');
    const config = new Map(['docs/project-config.json', '.claude/.ck.local.json']
        .map(relative => [relative, fs.readFileSync(path.join(f.root, relative))]));
    const patch = { title: 'Export filtered records', intent: 'People can export only records matching current filters.' };
    const request = f.request('update', id, patch, { actor: { memberId: actor } }); const draft = JSON.stringify(request);
    const authority = f.authority({ actor, canWrite: true, canReview: false, canAccept: false });
    const result = await f.core.executeOperation(request, authority);
    assert.equal(result.primary.status, 'saved'); assert.equal(result.primary.itemId, id);
    assert.equal(result.primary.operationId, request.operationId); assert.equal(result.primary.replayed, false);
    const after = f.record(id); const view = f.view(id);
    assert.equal(after.ownerPath, before.ownerPath); assert.equal(after.body, before.body);
    assert.deepEqual(after.data, { ...before.data, ...patch, tracking: after.tracking });
    assert.equal(after.revision, before.revision + 1); assert.equal(result.primary.contentHash, after.contentHash);
    for (const field of Object.keys(before.tracking).filter(key => !['revision', 'history', 'receipts', 'context'].includes(key)))
        assert.deepEqual(after.tracking[field], before.tracking[field], `${id}:${field}`);
    assert.deepEqual(after.tracking.history.slice(0, -1), before.tracking.history);
    assert.deepEqual(after.tracking.receipts.slice(0, -1), before.tracking.receipts);
    assert.equal(after.tracking.history.length, before.tracking.history.length + 1);
    assert.equal(after.tracking.receipts.length, before.tracking.receipts.length + 1);
    assert.deepEqual(after.tracking.context, { operationId: request.operationId, kind: 'direct' });
    assert.equal(after.tracking.history.at(-1).actor, actor); assert.equal(after.tracking.history.at(-1).operation, 'update');
    assert.equal(after.tracking.history.at(-1).operationId, request.operationId);
    assert.deepEqual(after.tracking.history.at(-1).context, after.tracking.context);
    assert.equal(after.tracking.receipts.at(-1).operationId, request.operationId);
    assert.equal(after.tracking.receipts.at(-1).result.itemId, id);
    assert.equal(view.title, patch.title); assert.equal(view.intent, patch.intent);
    assert.equal(view.state, 'draft'); assert.equal(view.assigneeId, 'owner'); assert.equal(view.acceptance.accepted, false);
    assert.deepEqual(view.history, after.tracking.history); assert.deepEqual(f.progress().metrics, metrics);
    assert.deepEqual(f.bytes('TASK-access-control'), other);
    for (const [relative, bytes] of config) assert.deepEqual(fs.readFileSync(path.join(f.root, relative)), bytes, relative);
    assert.equal(JSON.stringify(request), draft);
    // A participation label cannot rescue the same actor after write authority is absent.
    const denied = f.request('update', id, { title: 'Unpermitted broader edit' }, { actor: { memberId: actor } });
    const deniedDraft = JSON.stringify(denied); const savedBytes = f.bytes(id);
    const refusal = await f.core.executeOperation(denied, { ...authority, canWrite: false });
    refused(refusal, 'NOT_PERMITTED'); assert.deepEqual(refusal.secondary, []);
    assert.deepEqual(f.bytes(id), savedBytes); assert.deepEqual(f.view(id), view);
    assert.deepEqual(f.bytes('TASK-access-control'), other); assert.deepEqual(f.progress().metrics, metrics);
    for (const [relative, bytes] of config) assert.deepEqual(fs.readFileSync(path.join(f.root, relative)), bytes, relative);
    assert.equal(JSON.stringify(denied), deniedDraft);
}

// Strict-default source carriers. These tests prove only the named boundary;
// browser, native, shared-baseline and workflow journeys have separate owners.
module.exports = { name: 'Task tracking core integration', tests: [
    test('TC-TPT-021', 'contributor saves only the permitted selected edit with actual attribution and no broader authority', async f => {
        await permittedScopedEdit(f, 'contributor', 'Contributor', 'TASK-021');
    }),
    test('TC-TPT-023', 'coordinator saves only the permitted selected edit with actual attribution and no broader authority', async f => {
        await permittedScopedEdit(f, 'coordinator', 'Coordinator', 'TASK-023');
    }),
    test('TC-TPT-024', 'coordinator without current write access receives no receipt and preserves the permitted scoped read', async f => {
        f.config.taskTracking.members.push({ id: 'coordinator', displayName: 'Coordinator', active: true }); f.saveConfig();
        await f.create('TASK-024'); await f.create('TASK-unrelated'); await f.accepted('TASK-unrelated');
        await f.create('AREA-024', 'area'); await f.tag('TASK-024', { areaIds: ['AREA-024'] });
        const before = f.record('TASK-024'); const view = f.view('TASK-024'); const metrics = f.progress().metrics;
        const owners = new Map(f.records().map(record => [record.id, f.bytes(record.id)]));
        const config = new Map(['docs/project-config.json', '.claude/.ck.local.json']
            .map(relative => [relative, fs.readFileSync(path.join(f.root, relative))]));
        const scope = f.progress({ scopeId: 'AREA-024' });
        assert.equal(scope.project.root, f.root); assert.equal(scope.source.kind, 'worktree');
        assert.equal(scope.coverage, 'complete'); assert.deepEqual(scope.scope.memberIds, ['TASK-024']);
        assert.deepEqual(scope.scope.eligibleTaskIds, ['TASK-024']); assert.equal(scope.metrics.total, 1);
        // A draft captured while work was readable is still refused by actual current authority.
        const request = f.request('update', 'TASK-024', { title: 'Forbidden coordinator edit' }, { actor: { memberId: 'coordinator' } });
        const draft = JSON.stringify(request);
        const result = await f.core.executeOperation(request, f.authority({ actor: 'coordinator', canWrite: false }));
        refused(result, 'NOT_PERMITTED'); assert.match(result.primary.reason, /not permitted.*workspace actor/);
        assert.deepEqual(result.secondary, []); assert.equal(result.current, undefined);
        const after = f.record('TASK-024');
        assert.equal(after.revision, before.revision); assert.equal(after.contentHash, before.contentHash);
        assert.deepEqual(after.data, before.data); assert.deepEqual(after.tracking, before.tracking);
        assert.deepEqual(after.tracking.history, before.tracking.history); assert.deepEqual(after.tracking.receipts, before.tracking.receipts);
        assert.ok(!after.tracking.history.some(entry => entry.operationId === request.operationId));
        assert.ok(!after.tracking.receipts.some(entry => entry.operationId === request.operationId));
        assert.deepEqual(f.view('TASK-024'), view); assert.deepEqual(f.progress().metrics, metrics);
        const reread = f.progress({ scopeId: 'AREA-024' });
        assert.equal(reread.project.root, f.root); assert.equal(reread.coverage, 'complete');
        assert.deepEqual(reread.scope, scope.scope); assert.deepEqual(reread.metrics, scope.metrics);
        assert.deepEqual(reread.items.find(item => item.id === 'TASK-024'), view);
        // This selector is a read scope, not an invented per-role confidentiality policy.
        // A changed unavailable selection must not reuse the previous selection's scope or totals.
        const missing = f.progress({ scopeId: 'AREA-no-access-scope' });
        assert.equal(missing.coverage, 'unavailable'); assert.equal(missing.scope.coverage, 'unavailable');
        assert.deepEqual(missing.scope.memberIds, []); assert.equal(missing.metrics, null);
        assert.ok(missing.diagnostics.some(item => item.code === 'UNAVAILABLE_SCOPE'));
        for (const [id, bytes] of owners) assert.deepEqual(f.bytes(id), bytes, id);
        for (const [relative, bytes] of config) assert.deepEqual(fs.readFileSync(path.join(f.root, relative)), bytes, relative);
        assert.equal(JSON.stringify(request), draft);
    }),
    test('TC-TPT-025', 'assistant saves only the permitted selected edit with actual attribution and no broader authority', async f => {
        await permittedScopedEdit(f, 'assistant', 'Assistant', 'TASK-025');
    }),
    test('TC-TPT-104', 'reasonless blocking immediately preserves active work, historical proof and delivery facts', async f => {
        // Given real accepted work explicitly reopened to In progress, with a
        // separate accepted owner making accidental delivery-credit changes visible.
        const id = 'TASK-104'; const controlId = 'TASK-104-control';
        await f.create(id); await f.accepted(id);
        await f.saved('transition', id, { state: 'in_progress', reason: 'Explicit follow-up work' });
        await f.create(controlId); await f.accepted(controlId);
        const before = f.record(id); const view = f.view(id); const metrics = f.progress().metrics;
        const owners = new Map(f.records().map(record => [record.id, f.bytes(record.id)]));
        const configBytes = new Map(['docs/project-config.json', '.claude/.ck.local.json']
            .map(relative => [relative, fs.readFileSync(path.join(f.root, relative))]));
        assert.equal(before.data.status, 'in_progress'); assert.equal(view.blocker, null);
        assert.equal(before.tracking.acceptanceHistory.length, 1); assert.equal(before.tracking.proofs.length, 1);
        assert.equal(view.acceptance.accepted, false); assert.equal(view.acceptance.historyCount, 1);
        assert.equal(metrics.coverage, 'complete'); assert.equal(metrics.accepted, 1); assert.equal(metrics.currentlyVerified, 1);
        assert.equal(metrics.total, 2);
        // When the real public core receives absent, empty or whitespace-only reasons.
        for (const patch of [{ state: 'blocked' }, { state: 'blocked', reason: '' }, { state: 'blocked', reason: '   ' }]) {
            const request = f.request('transition', id, patch); const draft = JSON.stringify(request);
            const result = await f.core.executeOperation(request, f.authority());
            refused(result, 'INVALID_INPUT'); assert.match(result.primary.reason, /observed reason/);
            assert.deepEqual(result.secondary, []);
            // Then inspect immediately: no later valid action can mask a refused write.
            const after = f.record(id);
            assert.equal(after.data.status, 'in_progress'); assert.equal(after.revision, before.revision);
            assert.equal(after.contentHash, before.contentHash); assert.equal(after.ownerPath, before.ownerPath);
            assert.deepEqual(after.data, before.data); assert.deepEqual(after.tracking, before.tracking);
            assert.deepEqual(after.tracking.history, before.tracking.history);
            assert.deepEqual(after.tracking.receipts, before.tracking.receipts);
            assert.deepEqual(after.tracking.proofs, before.tracking.proofs);
            assert.deepEqual(after.tracking.acceptanceHistory, before.tracking.acceptanceHistory);
            assert.ok(!after.tracking.history.some(entry => entry.operationId === request.operationId));
            assert.ok(!after.tracking.receipts.some(entry => entry.operationId === request.operationId));
            assert.deepEqual(f.view(id), view); assert.deepEqual(f.progress().metrics, metrics);
            assert.deepEqual(f.records().map(record => record.id).sort(), [...owners.keys()].sort());
            for (const [ownerId, bytes] of owners) assert.deepEqual(f.bytes(ownerId), bytes, ownerId);
            for (const [relative, bytes] of configBytes) assert.deepEqual(fs.readFileSync(path.join(f.root, relative)), bytes, relative);
            assert.equal(JSON.stringify(request), draft);
        }
    }),
    test('TC-TPT-134', 'accepted scope needs explicit reopening and copied outcomes cannot inherit another owner acceptance', async f => {
        // Given accepted work obtained through the public lifecycle/proof/accept path.
        // The bounded domain covers changed text, added criteria and replaced scope;
        // it does not claim exhaustive proof over every possible authored outcome.
        const partitions = [
            { name: 'changed-text', criteria: [{ id: 'selected-rows', text: 'Export only rows matching the new filter' }] },
            { name: 'added-criterion', criteria: [
                { id: 'selected-rows', text: 'Export contains exactly the selected rows' },
                { id: 'header', text: 'Export includes the requested header' }
            ] },
            { name: 'replaced-scope', criteria: [{ id: 'summary', text: 'Export an aggregate summary instead of selected rows' }] }
        ];
        const configBytes = new Map(['docs/project-config.json', '.claude/.ck.local.json']
            .map(relative => [relative, fs.readFileSync(path.join(f.root, relative))]));
        const ownerBytes = () => new Map(f.records().map(record => [record.id, f.bytes(record.id)]));
        const unchangedOwners = owners => {
            for (const [id, bytes] of owners) assert.deepEqual(f.bytes(id), bytes, id);
        };
        const unchangedConfig = () => {
            for (const [relative, bytes] of configBytes) assert.deepEqual(fs.readFileSync(path.join(f.root, relative)), bytes, relative);
        };
        const controlId = 'TASK-134-control'; await f.create(controlId); await f.accepted(controlId);
        const controlView = f.view(controlId); let importCandidate;
        for (const partition of partitions) {
            const id = `TASK-134-${partition.name}`;
            await f.create(id); await f.accepted(id);
            const done = f.record(id); const doneView = f.view(id); const doneMetrics = f.progress().metrics;
            const owners = ownerBytes();
            assert.equal(done.data.status, 'done'); assert.equal(doneView.acceptance.accepted, true);
            assert.equal(doneView.acceptance.historyCount, 1); assert.equal(doneView.verification.status, 'current');
            assert.equal(doneMetrics.coverage, 'complete'); assert.equal(doneMetrics.accepted, 2);
            assert.equal(doneMetrics.currentlyVerified, 2);
            // When a materially changed criterion is proposed while the scope is Done.
            const denied = f.request('update', id, { criteria: partition.criteria }); const deniedDraft = JSON.stringify(denied);
            const refusal = await f.core.executeOperation(denied, f.authority());
            refused(refusal, 'REOPEN_REQUIRED'); assert.deepEqual(refusal.secondary, []);
            // Then immediately conserve bytes, history, receipts and delivery facts.
            const retained = f.record(id);
            assert.equal(retained.revision, done.revision); assert.equal(retained.contentHash, done.contentHash);
            assert.deepEqual(retained.data, done.data); assert.deepEqual(retained.tracking, done.tracking);
            assert.ok(!retained.tracking.history.some(entry => entry.operationId === denied.operationId));
            assert.ok(!retained.tracking.receipts.some(entry => entry.operationId === denied.operationId));
            assert.deepEqual(f.view(id), doneView); assert.deepEqual(f.progress().metrics, doneMetrics);
            assert.deepEqual(f.records().map(record => record.id).sort(), [...owners.keys()].sort());
            unchangedOwners(owners); unchangedConfig(); assert.equal(JSON.stringify(denied), deniedDraft);
            // Explicit reopening withdraws current delivery credit but retains its history.
            const reopen = f.request('transition', id, { state: 'planned', reason: 'Explicit criteria amendment' });
            const reopenDraft = JSON.stringify(reopen); const reopenedResult = await f.core.executeOperation(reopen, f.authority());
            assert.equal(reopenedResult.primary.status, 'saved'); assert.equal(reopenedResult.primary.operationId, reopen.operationId);
            const reopened = f.record(id); const reopenedMetrics = f.progress().metrics;
            assert.equal(reopened.revision, done.revision + 1); assert.equal(reopened.ownerPath, done.ownerPath);
            assert.equal(reopened.body, done.body);
            assert.deepEqual(reopened.data, { ...done.data, status: 'planned', tracking: reopened.tracking });
            assert.deepEqual(reopened.tracking, { ...done.tracking, revision: done.revision + 1,
                context: reopened.tracking.context, history: reopened.tracking.history, receipts: reopened.tracking.receipts });
            assert.deepEqual(reopened.tracking.context, { operationId: reopen.operationId, kind: 'direct' });
            assert.deepEqual(reopened.tracking.history.slice(0, -1), done.tracking.history);
            assert.deepEqual(reopened.tracking.receipts.slice(0, -1), done.tracking.receipts);
            assert.equal(reopened.tracking.history.at(-1).operationId, reopen.operationId);
            assert.equal(reopened.tracking.history.at(-1).beforeState, 'done');
            assert.equal(reopened.tracking.history.at(-1).afterState, 'planned');
            assert.equal(reopened.tracking.history.at(-1).reason, reopen.patch.reason);
            assert.equal(reopened.tracking.receipts.at(-1).operationId, reopen.operationId);
            assert.equal(reopened.tracking.receipts.at(-1).afterRevision, reopened.revision);
            assert.equal(f.view(id).acceptance.accepted, false); assert.equal(f.view(id).acceptance.historyCount, 1);
            assert.equal(f.view(id).verification.status, 'current');
            assert.deepEqual(reopenedMetrics, { ...doneMetrics, accepted: doneMetrics.accepted - 1,
                currentlyVerified: doneMetrics.currentlyVerified - 1, remaining: doneMetrics.remaining + 1,
                percentage: (doneMetrics.accepted - 1) / doneMetrics.total * 100 });
            unchangedOwners(new Map([...owners].filter(([ownerId]) => ownerId !== id))); unchangedConfig();
            assert.equal(JSON.stringify(reopen), reopenDraft);
            // The permitted amendment retains historical certification of the old scope.
            const amendment = f.request('update', id, { criteria: partition.criteria }); const amendmentDraft = JSON.stringify(amendment);
            const amendedResult = await f.core.executeOperation(amendment, f.authority());
            assert.equal(amendedResult.primary.status, 'saved'); assert.equal(amendedResult.primary.operationId, amendment.operationId);
            const amended = f.record(id); const amendedView = f.view(id);
            assert.equal(amended.revision, done.revision + 2); assert.equal(amended.ownerPath, done.ownerPath); assert.equal(amended.body, done.body);
            assert.deepEqual(amended.data, { ...reopened.data, tracking: amended.tracking });
            assert.deepEqual(amended.tracking, { ...reopened.tracking, criteria: partition.criteria, revision: done.revision + 2,
                context: amended.tracking.context, history: amended.tracking.history, receipts: amended.tracking.receipts });
            assert.deepEqual(amended.tracking.context, { operationId: amendment.operationId, kind: 'direct' });
            assert.deepEqual(amended.tracking.history.slice(0, -1), reopened.tracking.history);
            assert.deepEqual(amended.tracking.receipts.slice(0, -1), reopened.tracking.receipts);
            assert.equal(amended.tracking.history.at(-1).operation, 'update');
            assert.equal(amended.tracking.history.at(-1).operationId, amendment.operationId);
            assert.equal(amended.tracking.receipts.at(-1).operationId, amendment.operationId);
            assert.equal(amended.tracking.receipts.at(-1).afterRevision, amended.revision);
            assert.deepEqual(amended.tracking.proofs, done.tracking.proofs);
            assert.deepEqual(amended.tracking.acceptanceHistory, done.tracking.acceptanceHistory);
            assert.equal(amendedView.acceptance.accepted, false); assert.equal(amendedView.acceptance.historyCount, 1);
            assert.equal(amendedView.verification.status, 'stale');
            assert.notEqual(amendedView.verification.criteriaIdentity, done.tracking.acceptanceHistory[0].criteriaIdentity);
            assert.deepEqual(f.progress().metrics, reopenedMetrics); assert.deepEqual(f.view(controlId), controlView);
            unchangedOwners(new Map([...owners].filter(([ownerId]) => ownerId !== id))); unchangedConfig();
            assert.equal(JSON.stringify(amendment), amendmentDraft);
            // Use actual CREATE, not an invented clone/split API. Identical visible
            // scope and a materially new copied outcome both start Draft/unaccepted.
            for (const copied of [
                { suffix: 'exact-copy', intent: done.data.intent, criteria: done.tracking.criteria },
                { suffix: 'new-outcome', intent: `${done.data.intent}; deliver the separately amended outcome`, criteria: partition.criteria }
            ]) {
                const beforeCreate = ownerBytes(); const metrics = f.progress().metrics; const copyId = `${id}-${copied.suffix}`;
                const createdResult = await f.create(copyId, 'task', { title: done.data.title, intent: copied.intent, criteria: copied.criteria });
                const created = f.record(copyId); const createdView = f.view(copyId); const afterCreate = f.progress().metrics;
                assert.equal(created.data.status, 'draft'); assert.equal(created.revision, 1);
                assert.equal(created.data.title, done.data.title); assert.equal(created.data.intent, copied.intent);
                assert.deepEqual(created.tracking.criteria, copied.criteria);
                assert.deepEqual(created.tracking.proofs, []); assert.deepEqual(created.tracking.acceptanceHistory, []);
                assert.equal(createdView.acceptance.accepted, false); assert.equal(createdView.acceptance.historyCount, 0);
                assert.equal(createdView.verification.status, 'missing');
                assert.equal(created.tracking.history.length, 1); assert.equal(created.tracking.history[0].operation, 'create');
                assert.equal(created.tracking.history[0].afterState, 'draft');
                assert.equal(created.tracking.history[0].operationId, createdResult.primary.operationId);
                assert.equal(created.tracking.receipts.length, 1); assert.equal(created.tracking.receipts[0].result.itemId, copyId);
                assert.equal(created.tracking.receipts[0].operationId, createdResult.primary.operationId);
                assert.equal(afterCreate.accepted, metrics.accepted); assert.equal(afterCreate.currentlyVerified, metrics.currentlyVerified);
                assert.equal(afterCreate.total, metrics.total + 1); assert.equal(afterCreate.remaining, metrics.remaining + 1);
                assert.equal(afterCreate.coverage, 'complete'); assert.equal(afterCreate.percentage, metrics.accepted / afterCreate.total * 100);
                assert.deepEqual(afterCreate.eligibleIds, [...metrics.eligibleIds, copyId].sort());
                unchangedOwners(beforeCreate); unchangedConfig();
                if (copied.suffix === 'exact-copy') {
                    assert.equal(createdView.verification.criteriaIdentity, done.tracking.acceptanceHistory[0].criteriaIdentity);
                    importCandidate = { created, original: done };
                } else assert.notEqual(createdView.verification.criteriaIdentity, done.tracking.acceptanceHistory[0].criteriaIdentity);
            }
        }
        // Deliberate corruption fixture: a hand-edited/imported file can copy another
        // owner's acceptance and proof. This is a fail-safe boundary, not a valid
        // capture sequence or an available clone API. Keep its original itemId so
        // even identical current criteria/proof cannot manufacture owner certification.
        const { patchRecord } = require('../../lib/task-artifact-store.cjs');
        const { created, original } = importCandidate; const otherOwners = ownerBytes(); otherOwners.delete(created.id);
        const beforeImportMetrics = f.progress().metrics;
        f.write(created.ownerPath, patchRecord(created, { status: 'done' }, { ...created.tracking,
            proofs: original.tracking.proofs, acceptanceHistory: original.tracking.acceptanceHistory }).bytes);
        const corrupted = f.record(created.id); const snapshot = f.progress(); const corruptedView = f.view(created.id);
        assert.equal(corrupted.tracking.acceptanceHistory[0].itemId, original.id);
        assert.notEqual(corrupted.id, original.id); assert.equal(corruptedView.verification.status, 'current');
        assert.equal(corruptedView.verification.criteriaIdentity, original.tracking.acceptanceHistory[0].criteriaIdentity);
        assert.equal(corruptedView.acceptance.accepted, false); assert.equal(corruptedView.acceptance.historyCount, 0);
        assert.equal(snapshot.coverage, 'partial'); assert.equal(snapshot.metrics.percentage, null);
        assert.ok(snapshot.diagnostics.some(diagnostic => diagnostic.code === 'INVALID_RECORD' && diagnostic.itemId === created.id));
        assert.equal(snapshot.metrics.accepted, beforeImportMetrics.accepted); assert.equal(snapshot.metrics.accepted, 1);
        assert.equal(snapshot.metrics.currentlyVerified, beforeImportMetrics.currentlyVerified);
        assert.equal(snapshot.metrics.total, beforeImportMetrics.total); assert.deepEqual(snapshot.metrics.eligibleIds, beforeImportMetrics.eligibleIds);
        unchangedOwners(otherOwners); unchangedConfig();
        const request = f.request('update', created.id, { priority: 1 }); const draft = JSON.stringify(request);
        const result = await f.core.executeOperation(request, f.authority());
        refused(result, 'INVALID_RECORD'); assert.match(result.primary.reason, /acceptance/i); assert.deepEqual(result.secondary, []);
        const after = f.record(created.id);
        assert.deepEqual(f.bytes(created.id), corrupted.bytes); assert.equal(after.revision, corrupted.revision);
        assert.equal(after.contentHash, corrupted.contentHash); assert.deepEqual(after.data, corrupted.data);
        assert.deepEqual(after.tracking, corrupted.tracking); assert.deepEqual(f.view(created.id), corruptedView);
        assert.deepEqual(f.progress().metrics, snapshot.metrics); assert.deepEqual(f.view(controlId), controlView);
        assert.ok(!after.tracking.history.some(entry => entry.operationId === request.operationId));
        assert.ok(!after.tracking.receipts.some(entry => entry.operationId === request.operationId));
        unchangedOwners(otherOwners); unchangedConfig(); assert.equal(JSON.stringify(request), draft);
    }),
    test('TC-TPT-161', 'catalogue describes all current operation fields without granting authority or changing its validator', async f => {
        await f.create(); const before = f.bytes('TASK-101');
        const expected = { create: ['title', 'intent', 'criteria', 'type', 'level', 'deadline', 'priorityLevel', 'areaIds', 'initiativeIds'],
            update: ['title', 'intent', 'priority', 'criteria', 'optOut', 'type', 'level', 'deadline', 'priorityLevel'],
            adopt: [], assign: ['assigneeId', 'collaboratorIds'], link: ['links'], tag: ['areaIds', 'initiativeIds'],
            transition: ['state', 'reason', 'resolution', 'readiness', 'correction'], proof: ['proof'], accept: ['reason'],
            retire: ['reason'], restore: ['reason'], activity: ['observation'], attest: ['health'], delete: ['reason'] };
        const catalogue = f.core.operationCatalogue();
        assert.equal(catalogue.defaultPurpose, 'inspect');
        assert.deepEqual(Object.fromEntries(catalogue.operations.map(value => [value.name, value.patchKeys])), expected);
        assert.equal(catalogue.operations.find(value => value.name === 'transition').cli.correctionFlag, '--change-state');
        assert.deepEqual(catalogue.request.fields, ['schemaVersion', 'operation', 'operationId', 'target', 'expected', 'actor', 'patch', 'context', 'preview', 'previewToken']);
        assert.deepEqual(catalogue.request.shapes.proof, ['id', 'kind', 'result', 'observedAt', 'criteriaIds', 'criteriaIdentity', 'sourceIdentity', 'summary']);
        assert.deepEqual(catalogue.operations.find(value => value.name === 'proof').cli,
            { available: true, kinds: ['manual'], flag: '--manual-proof', unavailableKinds: ['test', 'review'] });
        assert.equal(catalogue.operations.find(value => value.name === 'activity').cli.available, false);
        // Property over every advertised key: discovery is the validator's field surface,
        // not proof that arbitrary field values satisfy semantic/authority guards.
        for (const [operation, keys] of Object.entries(expected)) {
            for (const key of keys) assert.match(f.core.validateRequest(f.request(operation, 'TASK-101', { [key]: null })), /^[a-f0-9]{64}$/);
            const invalid = f.request(operation, 'TASK-101', { inventedPermission: true });
            assert.throws(() => f.core.validateRequest(invalid), error => error.code === 'INVALID_INPUT', operation);
        }
        for (const section of ['target', 'actor', 'expected', 'context']) {
            const request = f.request('update', 'TASK-101', {});
            request[section] = { ...(request[section] || { runId: 'actual-run', occurrenceId: 'actual-step' }), inventedPermission: true };
            assert.throws(() => f.core.validateRequest(request), error => error.code === 'INVALID_INPUT', section);
        }
        catalogue.operations[0].patchKeys.push('canAccept'); catalogue.request.shapes.actor.push('canWrite');
        assert.deepEqual(f.core.operationCatalogue().operations[0].patchKeys, expected.create);
        assert.deepEqual(f.core.operationCatalogue().request.shapes.actor, ['memberId']);
        assert.deepEqual(f.bytes('TASK-101'), before);
    }),
    test('TC-TPT-147', 'discovered proof and activity shapes cannot manufacture an actual verifier observation', async f => {
        await f.create(); await f.verifying(); const before = f.bytes('TASK-101');
        for (const kind of ['test', 'review']) {
            const proof = f.proof('TASK-101', { kind });
            refused(await f.perform('proof', 'TASK-101', { proof }), 'NOT_PERMITTED');
            refused(await f.perform('proof', 'TASK-101', { proof }, { observedProof: proof }), 'INVALID_INPUT');
        }
        const observation = { kind: 'saved', observedAt: OBSERVED_AT, summary: 'Authored statement is not an observation', paths: [] };
        refused(await f.perform('activity', 'TASK-101', { observation }), 'NOT_PERMITTED');
        refused(await f.perform('activity', 'TASK-101', { observation }, { observation }), 'INVALID_INPUT');
        refused(await f.perform('transition', 'TASK-101', { state: 'done' }), 'MISSING_PROOF');
        assert.deepEqual(f.bytes('TASK-101'), before); assert.equal(f.view('TASK-101').acceptance.accepted, false);
    }),
    test('TC-TPT-128', 'exact two-leaf assignment applies both stable owners and preserves unselected work, coordinator and proof', async f => {
        const { selected, controls } = await assignmentScope(f);
        const before = new Map(selected.map(id => [id, f.record(id)])); const metrics = f.progress().metrics;
        const requests = selected.map(id => f.request('assign', id, { assigneeId: 'recipient' }));
        const result = await f.core.executeBatch(requests, f.authority()); assert.equal(result.atomicity, 'per-record');
        assert.equal(result.results.length, selected.length);
        for (let n = 0; n < selected.length; n++) {
            assert.equal(result.results[n].primary.status, 'saved'); assert.equal(result.results[n].primary.itemId, selected[n]);
            assignedWithoutPromotion(f, selected[n], before.get(selected[n]));
        }
        for (const [id, bytes] of controls) assert.deepEqual(f.bytes(id), bytes);
        assert.deepEqual(f.progress().metrics, metrics);
        const savedBytes = new Map(selected.map(id => [id, f.bytes(id)]));
        const replay = await f.core.executeBatch(requests, f.authority());
        for (let n = 0; n < selected.length; n++) {
            assert.equal(replay.results[n].primary.replayed, true); assert.equal(replay.results[n].primary.itemId, selected[n]);
            assert.deepEqual(f.bytes(selected[n]), savedBytes.get(selected[n]));
        }
        for (const [id, bytes] of controls) assert.deepEqual(f.bytes(id), bytes);
    }),
    test('TC-TPT-128', 'stale second-leaf assignment reports its refusal and exact retries conserve the successful sibling', async f => {
        const { selected, controls } = await assignmentScope(f);
        const before = f.record(selected[0]); const requests = selected.map(id => f.request('assign', id, { assigneeId: 'recipient' }));
        await f.saved('update', selected[1], { priority: 2 }); const secondBytes = f.bytes(selected[1]);
        const result = await f.core.executeBatch(requests, f.authority()); assert.equal(result.results.length, 2);
        assert.equal(result.results[0].primary.itemId, selected[0]); assert.equal(result.results[0].primary.status, 'saved');
        assignedWithoutPromotion(f, selected[0], before); refused(result.results[1], 'CONFLICT');
        assert.equal(f.record(selected[1]).tracking.assigneeId, 'peer'); assert.deepEqual(f.bytes(selected[1]), secondBytes);
        const firstBytes = f.bytes(selected[0]); const replay = await f.core.executeBatch(requests, f.authority());
        assert.equal(replay.results.length, 2); assert.equal(replay.results[0].primary.replayed, true); refused(replay.results[1], 'CONFLICT');
        assert.deepEqual(f.bytes(selected[0]), firstBytes); assert.deepEqual(f.bytes(selected[1]), secondBytes);
        for (const [id, bytes] of controls) assert.deepEqual(f.bytes(id), bytes);
    }),
    test('TC-TPT-128', 'unproved whole native assignment footprint refuses both leaves and preserves every affected owner', async f => {
        const { selected } = await assignmentScope(f);
        const requests = selected.map(id => f.request('assign', id, { assigneeId: 'recipient' }));
        const paths = f.records().map(record => record.ownerPath);
        const sources = ['trackers/index.html', 'trackers/data.json', 'trackers/notes.md'];
        for (const source of sources) { f.write(source, `Synthetic inert native owner: ${source}`); paths.push(source); }
        const originals = new Map(paths.map(relative => [relative, fs.readFileSync(path.join(f.root, relative))]));
        f.config.taskTracking.profile = { kind: 'native', version: 1, registration: 'fixture-native', sources }; f.saveConfig();
        const result = await f.core.executeBatch(requests, f.authority()); assert.equal(result.results.length, 2);
        for (const outcome of result.results) refused(outcome, 'UNPROVED_NATIVE_CAPABILITY');
        for (const [relative, bytes] of originals) assert.deepEqual(fs.readFileSync(path.join(f.root, relative)), bytes);
        const snapshot = f.progress(); assert.equal(snapshot.coverage, 'unavailable'); assert.equal(snapshot.metrics, null);
        assert.deepEqual(snapshot.native.inventory.map(entry => entry.ownerPath).sort(), sources.slice().sort());
    }),
    test('TC-TPT-131', 'one native source larger than the per-file budget is named while the sources after it are still inventoried', async f => {
        const { LIMITS } = require('../../lib/task-tracking-config.cjs');
        const sources = ['trackers/a-index.html', 'trackers/b-oversize.json', 'trackers/c-notes.md'];
        f.write(sources[0], 'Synthetic inert native owner: first'); f.write(sources[1], Buffer.alloc(LIMITS.recordBytes + 1, 0x20)); f.write(sources[2], 'Synthetic inert native owner: third');
        f.config.taskTracking.profile = { kind: 'native', version: 1, registration: 'fixture-native', sources }; f.saveConfig();
        const snapshot = f.progress();
        assert.deepEqual(snapshot.native.inventory.map(entry => entry.ownerPath), [sources[0], sources[2]]);
        assert.deepEqual(snapshot.native.diagnostics.map(d => [d.path, d.code]), [[sources[1], 'LIMIT_EXCEEDED']]);
    }),
    test('TC-TPT-105', 'newer prerequisite failure withdraws start and resume eligibility while preserving accepted history', async f => {
        for (const result of ['failed', 'skipped']) {
            const dependency = `TASK-dependency-${result}`; const ready = `TASK-ready-${result}`; const blocked = `TASK-blocked-${result}`;
            await f.create(dependency); await f.accepted(dependency);
            await f.create(ready); await f.saved('assign', ready, { assigneeId: 'owner' });
            await f.saved('link', ready, { links: [{ relation: 'dependency', itemId: dependency }] }); await f.ready(ready);
            await f.create(blocked); await f.active(blocked);
            await f.saved('link', blocked, { links: [{ relation: 'dependency', itemId: dependency }] });
            await f.saved('transition', blocked, { state: 'blocked', reason: 'Dependency needs confirmation' });
            assert.ok(f.progress().ready.includes(ready));
            const acceptance = f.record(dependency).tracking.acceptanceHistory;
            await f.saved('proof', dependency, { proof: f.proof(dependency, { result, observedAt: '2026-01-03T00:00:00.000Z' }) });
            const readyBytes = f.bytes(ready); const blockedBytes = f.bytes(blocked);
            const snapshot = f.progress(); assert.equal(snapshot.ready.includes(ready), false);
            assert.match(snapshot.excluded.find(item => item.itemId === ready).reasons.join(' '), /prerequisite/i);
            refused(await f.perform('transition', ready, { state: 'in_progress' }), 'NOT_READY');
            refused(await f.perform('transition', blocked, { state: 'in_progress', resolution: 'Old passing evidence is insufficient' }), 'NOT_READY');
            assert.deepEqual(f.bytes(ready), readyBytes); assert.deepEqual(f.bytes(blocked), blockedBytes);
            assert.equal(f.record(dependency).data.status, 'done'); assert.deepEqual(f.record(dependency).tracking.acceptanceHistory, acceptance);
            assert.equal(f.view(dependency).acceptance.accepted, true); assert.equal(f.view(dependency).verification.status, 'stale');
            await f.saved('proof', dependency, { proof: f.proof(dependency, { observedAt: '2026-01-04T00:00:00.000Z' }) });
            assert.ok(f.progress().ready.includes(ready));
            await f.saved('transition', blocked, { state: 'in_progress', resolution: 'New passing evidence confirms prerequisite' });
            assert.equal(f.record(blocked).data.status, 'in_progress'); assert.equal(f.record(blocked).tracking.blocker, null);
        }
    }),
    test('TC-TPT-107', 'newer applicable failed or skipped proof withdraws current credit without erasing delivery', async f => {
        for (const result of ['failed', 'skipped']) {
            const id = `TASK-proof-${result}`; await f.create(id); await f.accepted(id);
            const acceptance = f.record(id).tracking.acceptanceHistory;
            await f.saved('proof', id, { proof: f.proof(id, { result, observedAt: '2026-01-03T00:00:00.000Z' }) });
            assert.equal(f.view(id).verification.status, 'stale');
            assert.equal(f.view(id).acceptance.accepted, true);
            assert.deepEqual(f.record(id).tracking.acceptanceHistory, acceptance);
            await f.saved('transition', id, { state: 'in_progress', reason: 'Reverify after a contradictory observation' });
            await f.saved('transition', id, { state: 'verifying' });
            const before = f.bytes(id);
            refused(await f.perform('accept', id, { reason: 'Old pass cannot certify current work' }), 'MISSING_PROOF');
            assert.deepEqual(f.bytes(id), before);
            await f.saved('proof', id, { proof: f.proof(id, { observedAt: '2026-01-04T00:00:00.000Z' }) });
            await f.saved('accept', id, { reason: 'New passing observation accepted' });
            assert.equal(f.view(id).verification.status, 'current');
            assert.equal(f.record(id).tracking.acceptanceHistory.length, 2);
            assert.equal(f.record(id).tracking.proofs.length, 3);
        }
        assert.equal(f.progress().metrics.accepted, 2); assert.equal(f.progress().metrics.currentlyVerified, 2);
    }),
    test('TC-TPT-107', 'latest observations are criterion scoped and tied contradictions cannot borrow a pass', async f => {
        await f.create('TASK-101', 'task', { criteria: [{ id: 'rows', text: 'Selected rows match' }, { id: 'header', text: 'Header included' }] });
        await f.verifying();
        const passing = f.proof('TASK-101'); await f.saved('proof', 'TASK-101', { proof: passing });
        for (const observedAt of [OBSERVED_AT, '2026-01-03T00:00:00.000Z']) {
            await f.saved('proof', 'TASK-101', { proof: f.proof('TASK-101', { result: 'failed', criteriaIds: ['rows'], observedAt }) });
            assert.equal(f.view('TASK-101').verification.status, 'stale');
        }
        const recovery = f.proof('TASK-101', { criteriaIds: ['rows'], observedAt: '2026-01-04T00:00:00.000Z' });
        await f.saved('proof', 'TASK-101', { proof: recovery });
        assert.equal(f.view('TASK-101').verification.status, 'current');
        assert.deepEqual(f.view('TASK-101').verification.proofIds.sort(), [passing.id, recovery.id].sort());
        // A later inserted but older observation cannot supersede actual latest proof.
        await f.saved('proof', 'TASK-101', { proof: f.proof('TASK-101', { result: 'skipped', criteriaIds: ['rows'] }) });
        assert.equal(f.view('TASK-101').verification.status, 'current');
        await f.saved('accept', 'TASK-101', { reason: 'Both latest criterion outcomes pass' });
        assert.equal(f.progress().metrics.currentlyVerified, 1);
    }),
    test('TC-TPT-001', 'capture creates one draft and no delivery credit', async f => {
        const result = await f.create('INITIATIVE-1', 'initiative');
        assert.equal(result.primary.revision, 1);
        assert.equal(f.record('INITIATIVE-1').data.status, 'draft');
        assert.equal(f.progress().metrics.accepted, 0);
        assert.equal(f.records().length, 1);
        assert.equal(f.record('INITIATIVE-1').tracking.receipts.length, 1);
    }),
    test('TC-TPT-001', 'capture needs actual actor write authority', async f => {
        refused(await f.perform('create', 'TASK-101', { title: 'Requested work', intent: 'A defined outcome' }, {}, { canWrite: false }), 'NOT_PERMITTED');
        assert.equal(f.records().length, 0);
    }),
    test('TC-TPT-002', 'refinement retains lineage and cannot approve incomplete scope', async f => {
        await f.create('INITIATIVE-1', 'initiative'); await f.create('TASK-101', 'task', { criteria: [] });
        await f.tag('TASK-101', { initiativeIds: ['INITIATIVE-1'] });
        await f.saved('transition', 'TASK-101', { state: 'planned' });
        const before = f.bytes('TASK-101');
        refused(await f.perform('transition', 'TASK-101', { state: 'ready', readiness: { reviewed: true, decisionsResolved: true } }), 'NOT_READY');
        assert.deepEqual(f.bytes('TASK-101'), before);
        assert.deepEqual(f.record('TASK-101').tracking.links, [{ relation: 'initiative', itemId: 'INITIATIVE-1' }]);
    }),
    test('TC-TPT-003', 'Ready ordering is priority then identity and stale readiness is excluded', async f => {
        for (const id of ['TASK-104', 'TASK-901', 'TASK-900']) {
            await f.create(id); await f.ready(id);
            await f.saved('update', id, { priority: id === 'TASK-104' ? 2 : 1 });
        }
        assert.deepEqual(f.progress().ready, ['TASK-900', 'TASK-901', 'TASK-104']);
        await f.saved('update', 'TASK-900', { intent: 'A changed delivery scope' });
        assert.deepEqual(f.progress().ready, ['TASK-901', 'TASK-104']);
        assert.match(f.progress().excluded.find(item => item.itemId === 'TASK-900').reasons.join(' '), /readiness|unresolved/i);
    }),
    test('TC-TPT-004', 'starting requires a responsible active member and reviewed Ready scope', async f => {
        await f.create(); await f.ready();
        const before = f.bytes('TASK-101');
        refused(await f.perform('transition', 'TASK-101', { state: 'in_progress' }), 'INVALID_MEMBER');
        assert.deepEqual(f.bytes('TASK-101'), before);
        await f.saved('assign', 'TASK-101', { assigneeId: 'owner' });
        await f.saved('transition', 'TASK-101', { state: 'in_progress' });
        assert.equal(f.view('TASK-101').state, 'in_progress');
        assert.equal(f.progress().metrics.accepted, 0);
    }),
    test('TC-TPT-005', 'blocking and resuming retain the prior active state and require resolution', async f => {
        await f.create(); await f.active();
        refused(await f.perform('transition', 'TASK-101', { state: 'blocked' }), 'INVALID_INPUT');
        await f.saved('transition', 'TASK-101', { state: 'blocked', reason: 'External prerequisite unavailable' });
        const blocked = f.bytes('TASK-101');
        refused(await f.perform('transition', 'TASK-101', { state: 'verifying', resolution: 'Available now' }), 'INVALID_TRANSITION');
        refused(await f.perform('transition', 'TASK-101', { state: 'in_progress' }), 'INVALID_TRANSITION');
        assert.deepEqual(f.bytes('TASK-101'), blocked);
        await f.saved('transition', 'TASK-101', { state: 'in_progress', resolution: 'Prerequisite restored' });
        assert.equal(f.record('TASK-101').data.status, 'in_progress');
        assert.equal(f.record('TASK-101').tracking.blocker, null);
    }),
    test('TC-TPT-006', 'acceptance requires applicable proof for every criterion and an actual decision', async f => {
        await f.create('TASK-101', 'task', { criteria: [
            { id: 'selected-rows', text: 'Selection matches export' }, { id: 'header', text: 'Header is included' }
        ] });
        await f.verifying(); const before = f.bytes('TASK-101');
        refused(await f.perform('transition', 'TASK-101', { state: 'done' }), 'MISSING_PROOF');
        refused(await f.perform('accept', 'TASK-101', { reason: 'Accept' }), 'MISSING_PROOF');
        assert.deepEqual(f.bytes('TASK-101'), before);
        await f.saved('proof', 'TASK-101', { proof: f.proof('TASK-101', { criteriaIds: ['selected-rows'] }) });
        refused(await f.perform('accept', 'TASK-101', { reason: 'Accept' }), 'MISSING_PROOF');
        await f.saved('proof', 'TASK-101', { proof: f.proof('TASK-101', { criteriaIds: ['header'] }) });
        refused(await f.perform('accept', 'TASK-101', { reason: 'Accept' }, {}, { canAccept: false }), 'NOT_PERMITTED');
        await f.saved('accept', 'TASK-101', { reason: 'Both outcomes observed' });
        assert.equal(f.view('TASK-101').state, 'done');
        assert.equal(f.view('TASK-101').acceptance.accepted, true);
        assert.equal(f.record('TASK-101').tracking.acceptanceHistory[0].proofIds.length, 2);
    }),
    test('TC-TPT-006', 'failed observations and forged runner proof cannot produce acceptance', async f => {
        await f.create(); await f.verifying();
        await f.saved('proof', 'TASK-101', { proof: f.proof('TASK-101', { result: 'failed' }) });
        refused(await f.perform('accept', 'TASK-101', { reason: 'Accept' }), 'MISSING_PROOF');
        refused(await f.perform('proof', 'TASK-101', { proof: f.proof('TASK-101', { kind: 'test' }) }), 'NOT_PERMITTED');
        assert.equal(f.progress().metrics.accepted, 0);
    }),
    test('TC-TPT-008', 'relevant code change makes proof stale while retaining accepted delivery history', async f => {
        f.write('src/export.js', 'exports.version = 1;\n'); await f.create();
        await f.saved('link', 'TASK-101', { links: [{ relation: 'source', path: 'src/export.js' }] });
        await f.accepted(); const accepted = f.bytes('TASK-101');
        assert.equal(f.progress().metrics.currentlyVerified, 1);
        f.write('src/export.js', 'exports.version = 2;\n');
        assert.equal(f.view('TASK-101').verification.status, 'stale');
        assert.equal(f.progress().metrics.accepted, 1);
        assert.equal(f.progress().metrics.currentlyVerified, 0);
        assert.deepEqual(f.bytes('TASK-101'), accepted);
        refused(await f.perform('update', 'TASK-101', { intent: 'New scope' }), 'REOPEN_REQUIRED');
        await f.saved('transition', 'TASK-101', { state: 'planned', reason: 'Explicit follow-up work' });
        assert.equal(f.progress().metrics.accepted, 0);
        assert.equal(f.record('TASK-101').tracking.acceptanceHistory.length, 1);
    }),
    test('TC-TPT-009', 'scope changes expose denominator and retain accepted count', async f => {
        for (const id of ['TASK-1', 'TASK-2', 'TASK-3']) await f.create(id);
        await f.accepted('TASK-1');
        const initial = f.progress().metrics;
        assert.equal(initial.total, 3); assert.equal(initial.accepted, 1);
        await f.create('TASK-4');
        const after = f.progress().metrics;
        assert.equal(after.total, 4); assert.equal(after.accepted, 1); assert.equal(after.remaining, 3); assert.equal(after.percentage, 25);
        assert.notEqual(after.scopeRevision, initial.scopeRevision);
    }),
    test('TC-TPT-049', 'overlapping areas count unique tasks and exclude support items', async f => {
        // Two areas hold the same task and its supporting work; the area above them also holds a second task of its own.
        await f.create('AREA-ALL', 'area');
        for (const id of ['AREA-1', 'AREA-2']) await f.create(id, 'area', { areaIds: ['AREA-ALL'] });
        await f.create('TASK-1', 'task', { areaIds: ['AREA-1', 'AREA-2'] }); await f.create('TASK-2', 'task', { areaIds: ['AREA-ALL'] });
        await f.create('SUBTASK-1', 'subtask', { areaIds: ['AREA-1', 'AREA-2'] }); await f.create('STORY-1', 'story', { areaIds: ['AREA-1', 'AREA-2'] });
        await f.accepted('TASK-1');
        await f.accepted('SUBTASK-1'); await f.accepted('STORY-1');
        const metrics = f.progress({ scopeId: 'AREA-ALL' }).metrics;
        assert.deepEqual(metrics.eligibleIds, ['TASK-1', 'TASK-2']); assert.equal(metrics.total, 2); assert.equal(metrics.accepted, 1);
        assert.equal(metrics.percentage, 50);
    }),
    test('TC-TPT-049', 'retirement and cancellation expose exclusions without deleting child work', async f => {
        await f.create('AREA-1', 'area');
        await f.create('TASK-1', 'task', { areaIds: ['AREA-1'] }); await f.create('TASK-2', 'task', { areaIds: ['AREA-1'] });
        const child = f.bytes('TASK-1');
        await f.saved('retire', 'AREA-1', { reason: 'Area retired' });
        assert.deepEqual(f.bytes('TASK-1'), child);
        await f.saved('retire', 'TASK-1', { reason: 'Scope removed' });
        await f.saved('transition', 'TASK-2', { state: 'canceled', reason: 'No longer requested' });
        const metrics = f.progress().metrics;
        assert.equal(metrics.total, 0); assert.equal(metrics.retired, 1); assert.equal(metrics.canceled, 1); assert.equal(metrics.percentage, null);
        refused(await f.perform('update', 'TASK-1', { title: 'Hidden change' }), 'RETIRED');
        await f.saved('restore', 'TASK-1', { reason: 'Scope restored' });
        assert.equal(f.progress().metrics.total, 1);
    }),
    test('TC-TPT-003', 'a dependency needs accepted current proof before Ready and start', async f => {
        f.write('src/dependency.js', 'version one\n');
        await f.create('TASK-DEP'); await f.saved('link', 'TASK-DEP', { links: [{ relation: 'source', path: 'src/dependency.js' }] });
        await f.create(); await f.saved('link', 'TASK-101', { links: [{ relation: 'dependency', itemId: 'TASK-DEP' }] });
        await f.saved('transition', 'TASK-101', { state: 'planned' });
        refused(await f.perform('transition', 'TASK-101', { state: 'ready', readiness: { reviewed: true, decisionsResolved: true } }), 'NOT_READY');
        await f.accepted('TASK-DEP');
        await f.saved('transition', 'TASK-101', { state: 'ready', readiness: { reviewed: true, decisionsResolved: true } });
        await f.saved('assign', 'TASK-101', { assigneeId: 'owner' });
        f.write('src/dependency.js', 'changed version\n');
        assert.deepEqual(f.progress().ready, []);
        refused(await f.perform('transition', 'TASK-101', { state: 'in_progress' }), 'NOT_READY');
        assert.equal(f.record('TASK-101').data.status, 'ready');
    }),
    test('TC-TPT-003', 'self, foreign and cyclic dependency links are refused without mutation', async f => {
        await f.create('TASK-1'); await f.create('TASK-2');
        for (const itemId of ['TASK-1', 'FOREIGN-1']) {
            const before = f.bytes('TASK-1');
            refused(await f.perform('link', 'TASK-1', { links: [{ relation: 'dependency', itemId }] }), 'INVALID_RELATIONSHIP');
            assert.deepEqual(f.bytes('TASK-1'), before);
        }
        await f.saved('link', 'TASK-1', { links: [{ relation: 'dependency', itemId: 'TASK-2' }] });
        const before = f.bytes('TASK-2');
        refused(await f.perform('link', 'TASK-2', { links: [{ relation: 'dependency', itemId: 'TASK-1' }] }), 'INVALID_RELATIONSHIP');
        assert.deepEqual(f.bytes('TASK-2'), before);
    }),
    test('TC-TPT-133', 'assignment aliases, renames and unassignment retain attribution without credit', async f => {
        await f.create();
        // Finite metamorphic domain: 4 equivalent identities, followed by rename,
        // deactivation and two invalid identities. This is not universal proof.
        for (const assigneeId of ['owner', 'OWNER', ' Previous owner ', 'Owner']) {
            await f.saved('assign', 'TASK-101', { assigneeId, collaboratorIds: ['peer', 'PEER'] });
            assert.equal(f.record('TASK-101').tracking.assigneeId, 'owner');
            assert.deepEqual(f.record('TASK-101').tracking.collaboratorIds, ['peer']);
            assert.equal(f.record('TASK-101').data.status, 'draft'); assert.equal(f.progress().metrics.accepted, 0);
        }
        f.config.taskTracking.members[0].displayName = 'Renamed owner'; f.config.taskTracking.members[0].active = false; f.saveConfig();
        assert.equal(f.view('TASK-101').assigneeId, 'owner');
        for (const assigneeId of ['owner', 'unknown']) {
            const before = f.bytes('TASK-101');
            refused(await f.perform('assign', 'TASK-101', { assigneeId }), 'INVALID_MEMBER'); assert.deepEqual(f.bytes('TASK-101'), before);
        }
        await f.saved('assign', 'TASK-101', { assigneeId: null });
        assert.equal(f.record('TASK-101').tracking.assigneeId, null);
        assert.ok(f.record('TASK-101').tracking.history.some(entry => entry.afterAssigneeId === 'owner'));
    }),
    test('TC-TPT-123', 'identical completed requests replay once across intervening edits', async f => {
        await f.create();
        // Finite domain: title, priority, assignment and opt-out, each with one
        // replay before and after a later edit, plus changed-payload counter-case.
        for (const [operation, patch] of [['update', { title: 'Revised export' }], ['update', { priority: 2 }],
            ['assign', { assigneeId: 'peer' }], ['update', { optOut: true }]]) {
            const request = f.request(operation, 'TASK-101', patch);
            const saved = await f.core.executeOperation(request, f.authority()); assert.equal(saved.primary.status, 'saved');
            let before = f.bytes('TASK-101');
            const replay = await f.core.executeOperation(request, f.authority());
            assert.equal(replay.primary.replayed, true); assert.equal(replay.primary.revision, saved.primary.revision); assert.deepEqual(f.bytes('TASK-101'), before);
            await f.saved('update', 'TASK-101', { priority: 3 }); before = f.bytes('TASK-101');
            assert.equal((await f.core.executeOperation(request, f.authority())).primary.replayed, true);
            assert.deepEqual(f.bytes('TASK-101'), before);
            refused(await f.core.executeOperation({ ...request, patch: operation === 'assign' ? { assigneeId: 'owner' } : { title: 'Other request' } }, f.authority()), 'REUSED_OPERATION');
            assert.deepEqual(f.bytes('TASK-101'), before);
        }
    }),
    test('TC-TPT-082', 'cooperating writers save one current revision and retain the losing draft', async f => {
        await f.create();
        const left = f.request('update', 'TASK-101', { title: 'Left draft' });
        const right = f.request('update', 'TASK-101', { title: 'Right draft' });
        const results = await Promise.all([f.core.executeOperation(left, f.authority()), f.core.executeOperation(right, f.authority())]);
        assert.equal(results.filter(result => result.primary.status === 'saved').length, 1);
        assert.equal(results.filter(result => result.primary.code === 'CONFLICT').length, 1);
        assert.equal(f.record('TASK-101').revision, 2);
        assert.ok(['Left draft', 'Right draft'].includes(f.record('TASK-101').data.title));
        assert.equal(f.record('TASK-101').tracking.history.length, 2);
        assert.deepEqual(left.patch, { title: 'Left draft' }); assert.deepEqual(right.patch, { title: 'Right draft' });
        assert.equal(fs.existsSync(path.join(f.root, 'tmp/task-tracking/writer.lock')), false);
    }),
    test('TC-TPT-082', 'batch results remain per record and retry does not repeat successful siblings', async f => {
        await f.create('TASK-1'); await f.create('TASK-2');
        const first = f.request('update', 'TASK-1', { title: 'First saved' });
        const second = f.request('update', 'TASK-2', { title: 'Second draft' });
        await f.saved('update', 'TASK-2', { priority: 2 });
        const batch = await f.core.executeBatch([first, second], f.authority());
        assert.equal(batch.atomicity, 'per-record'); assert.equal(batch.results[0].primary.status, 'saved'); refused(batch.results[1], 'CONFLICT');
        const before = f.bytes('TASK-1');
        const retry = await f.core.executeBatch([first, second], f.authority());
        assert.equal(retry.results[0].primary.replayed, true); refused(retry.results[1], 'CONFLICT'); assert.deepEqual(f.bytes('TASK-1'), before);
    }),
    test('TC-TPT-085', 'off and observe modes skip automatic changes while explicit edits remain available', async f => {
        await f.create();
        for (const mode of ['off', 'observe']) {
            f.config.taskTracking.mode = mode; f.saveConfig(); const before = f.bytes('TASK-101');
            const result = await f.perform('transition', 'TASK-101', { state: 'verifying' }, {}, { automatic: true, linkedItemIds: ['TASK-101'] });
            assert.equal(result.primary.status, 'skipped'); assert.deepEqual(f.bytes('TASK-101'), before);
            await f.saved('update', 'TASK-101', { title: `Explicit ${mode} edit` });
        }
    }),
    test('TC-TPT-085', 'unenrolled projects support explicit capture with automatic upkeep off', async f => {
        delete f.config.taskTracking; f.saveConfig(); await f.create();
        assert.equal(f.progress().enrolled, false); assert.equal(f.progress().mode, 'off');
        const before = f.bytes('TASK-101');
        assert.equal((await f.perform('transition', 'TASK-101', { state: 'verifying' }, {}, { automatic: true })).primary.status, 'skipped');
        assert.deepEqual(f.bytes('TASK-101'), before);
    }),
    test('TC-TPT-026', 'linked upkeep records only actual observations and never manufactures approval', async f => {
        await f.create(); await f.active(); const linked = { automatic: true, linkedItemIds: ['TASK-101'] };
        const before = f.bytes('TASK-101');
        refused(await f.perform('transition', 'TASK-101', { state: 'verifying' }, {}, { ...linked, canWrite: false, observedTransition: { state: 'verifying' } }), 'NOT_PERMITTED');
        assert.equal((await f.perform('transition', 'TASK-101', { state: 'verifying' }, {}, { automatic: true, linkedItemIds: [] })).primary.status, 'skipped');
        refused(await f.perform('transition', 'TASK-101', { state: 'verifying' }, {}, linked), 'NOT_PERMITTED');
        refused(await f.perform('accept', 'TASK-101', { reason: 'Automatic approval' }, {}, linked), 'NOT_PERMITTED');
        assert.deepEqual(f.bytes('TASK-101'), before);
        await f.saved('transition', 'TASK-101', { state: 'verifying' }, {}, { ...linked, observedTransition: { state: 'verifying' } });
        const observation = { kind: 'saved', observedAt: OBSERVED_AT, summary: 'Observed source save', paths: ['src/export.js'] };
        refused(await f.perform('activity', 'TASK-101', { observation }, {}, linked), 'NOT_PERMITTED');
        await f.saved('activity', 'TASK-101', { observation }, {}, { ...linked, observation });
        assert.deepEqual(f.record('TASK-101').tracking.activity, [observation]); assert.equal(f.progress().metrics.accepted, 0);
    }),
    test('TC-TPT-085', 'item opt-out skips exact linked upkeep without changing current facts', async f => {
        await f.create(); await f.saved('update', 'TASK-101', { optOut: true }); const before = f.bytes('TASK-101');
        const result = await f.perform('transition', 'TASK-101', { state: 'verifying' }, {}, { automatic: true, linkedItemIds: ['TASK-101'], observedTransition: { state: 'verifying' } });
        assert.equal(result.primary.status, 'skipped'); assert.deepEqual(f.bytes('TASK-101'), before);
    }),
    test('TC-TPT-045', 'request context cannot impersonate the actual workflow occurrence', async f => {
        await f.create(); const before = f.bytes('TASK-101');
        refused(await f.perform('update', 'TASK-101', { title: 'Forged context' }, { context: { runId: 'foreign', occurrenceId: 'foreign-step' } },
            { context: { runId: 'actual', occurrenceId: 'actual-step' } }), 'NOT_PERMITTED');
        assert.deepEqual(f.bytes('TASK-101'), before);
    }),
    test('TC-TPT-044', 'unproved native capability preserves the complete declared source inventory', async f => {
        const native = '<html><script>throw new Error("inert content")</script><body>Native tracker</body></html>';
        const source = f.write('trackers/index.html', native);
        f.config.taskTracking.profile = { kind: 'native', version: 1, registration: 'fixture-native', sources: ['trackers/index.html'] }; f.saveConfig();
        refused(await f.perform('create', 'TASK-101', { title: 'Work', intent: 'Defined outcome' }), 'UNPROVED_NATIVE_CAPABILITY');
        const progress = f.progress(); assert.equal(progress.coverage, 'unavailable'); assert.equal(progress.metrics, null);
        assert.equal(progress.native.inventory.length, 1); assert.deepEqual(progress.profile.capabilities, []);
        assert.equal(fs.readFileSync(source, 'utf8'), native); assert.equal(fs.existsSync(path.join(f.root, 'work')), false);
    }),
    test('TC-TPT-047', 'malformed and unknown policy fails closed rather than becoming an empty board', async f => {
        await f.create(); const before = f.bytes('TASK-101');
        f.config.taskTracking.unknownPermission = true; f.saveConfig();
        const progress = f.progress(); assert.equal(progress.coverage, 'unavailable'); assert.equal(progress.metrics, null);
        assert.ok(progress.diagnostics.some(diagnostic => diagnostic.code === 'INVALID_CONFIG'));
        // Request was captured before config changed, as a real actor draft can be.
        refused(await f.core.executeOperation({ schemaVersion: 3, operation: 'create', operationId: 'bad-policy', target: { kind: 'task', itemId: 'TASK-2' },
            actor: { memberId: 'owner' }, patch: { title: 'Work', intent: 'Outcome' } }, f.authority()), 'INVALID_CONFIG');
        assert.deepEqual(fs.readFileSync(path.join(f.root, 'work/tasks/TASK-101.md')), before);
    }),
    test('TC-TPT-086', 'partial or duplicate owners retain visible facts and suppress precise percentages and writes', async f => {
        await f.create(); const before = f.bytes('TASK-101');
        // External/manual corruption is reachable through ordinary Git/editor changes.
        f.write('work/tasks/broken.md', 'Unparseable external content');
        let progress = f.progress(); assert.equal(progress.coverage, 'partial'); assert.equal(progress.metrics.percentage, null);
        assert.ok(progress.items.some(item => item.id === 'TASK-101'));
        refused(await f.perform('update', 'TASK-101', { title: 'Hidden update' }), 'INCOMPLETE_SCOPE'); assert.deepEqual(f.bytes('TASK-101'), before);
        fs.unlinkSync(path.join(f.root, 'work/tasks/broken.md')); f.write('work/tasks/duplicate.md', before);
        progress = f.progress(); assert.equal(progress.coverage, 'partial'); assert.ok(progress.diagnostics.some(item => item.code === 'DUPLICATE_ID'));
        assert.equal(progress.metrics.percentage, null);
    }),
    test('TC-TPT-086', 'status reads preserve canonical bytes and distinguish local freshness and unknown health', async f => {
        await f.create(); const before = f.bytes('TASK-101');
        const first = f.progress(); const second = f.progress();
        assert.deepEqual(f.bytes('TASK-101'), before); assert.equal(first.fingerprint, second.fingerprint);
        assert.equal(first.source.kind, 'worktree'); assert.equal(first.source.remoteFreshness, 'unknown'); assert.equal(first.health.status, 'unknown');
    }),
    test('TC-TPT-039', 'cancellation preserves history for all seven eligible states and is replay safe', async f => {
        const states = ['draft', 'planned', 'ready', 'in_progress', 'blocked', 'verifying', 'done'];
        for (const [index, state] of states.entries()) {
            const id = `TASK-CANCEL-${index}`; await f.create(id);
            if (state === 'planned') await f.saved('transition', id, { state: 'planned' });
            if (state === 'ready') await f.ready(id);
            if (['in_progress', 'blocked'].includes(state)) await f.active(id);
            if (state === 'blocked') await f.saved('transition', id, { state: 'blocked', reason: 'Waiting on a prerequisite' });
            if (state === 'verifying') await f.verifying(id);
            if (state === 'done') await f.accepted(id);
            assert.equal(f.record(id).data.status, state);
            const history = f.record(id).tracking.history; const acceptance = f.record(id).tracking.acceptanceHistory;
            const request = f.request('transition', id, { state: 'canceled', reason: 'Requested scope removed' });
            assert.equal((await f.core.executeOperation(request, f.authority())).primary.status, 'saved');
            assert.equal(f.record(id).data.status, 'canceled');
            assert.deepEqual(f.record(id).tracking.history.slice(0, -1), history);
            assert.deepEqual(f.record(id).tracking.acceptanceHistory, acceptance);
            const canceled = f.bytes(id);
            assert.equal((await f.core.executeOperation(request, f.authority())).primary.replayed, true);
            refused(await f.perform('transition', id, { state: 'canceled', reason: 'Redundant request' }), 'INVALID_TRANSITION');
            assert.deepEqual(f.bytes(id), canceled);
        }
        assert.equal(f.progress().metrics.accepted, 0); assert.equal(f.progress().metrics.canceled, 7);
    }),
    test('TC-TPT-039', 'canceled work returns to draft only by an explicit reasoned correction made by a person', async f => {
        // Real scenario: work canceled by mistake. Cancellation ends the usual steps, so the way back is its own decision.
        await f.create(); await f.saved('transition', 'TASK-101', { state: 'canceled', reason: 'Requested scope removed' });
        const canceled = f.bytes('TASK-101'); const person = { canCorrectState: true };
        refused(await f.perform('transition', 'TASK-101', { state: 'draft' }), 'INVALID_TRANSITION');
        refused(await f.perform('transition', 'TASK-101', { state: 'draft', correction: true, reason: 'Canceled by mistake' }), 'NOT_PERMITTED');
        refused(await f.perform('transition', 'TASK-101', { state: 'draft', correction: true }, {}, person), 'INVALID_INPUT');
        refused(await f.perform('transition', 'TASK-101', { state: 'draft', correction: 'yes', reason: 'Canceled by mistake' }, {}, person), 'INVALID_INPUT');
        refused(await f.perform('transition', 'TASK-101', { state: 'canceled', correction: true, reason: 'Same state' }, {}, person), 'INVALID_TRANSITION');
        assert.deepEqual(f.bytes('TASK-101'), canceled);
        const history = f.record('TASK-101').tracking.history;
        await f.saved('transition', 'TASK-101', { state: 'draft', correction: true, reason: 'Canceled by mistake' }, {}, person);
        const restored = f.record('TASK-101');
        assert.equal(restored.data.status, 'draft'); assert.deepEqual(restored.tracking.history.slice(0, -1), history);
        const entry = restored.tracking.history.at(-1);
        assert.equal(entry.beforeState, 'canceled'); assert.equal(entry.afterState, 'draft'); assert.equal(entry.reason, 'Canceled by mistake');
        // The usual steps continue from the corrected state.
        await f.saved('transition', 'TASK-101', { state: 'planned' });
        assert.equal(f.progress().metrics.canceled, 0);
    }),
    test('TC-TPT-039', 'a correction reaches any recorded state except done and keeps the facts its target state requires', async f => {
        const person = { canCorrectState: true }; const move = (id, state, extra = {}) => f.perform('transition', id, { state, correction: true, reason: 'Recorded state was wrong', ...extra }, {}, person);
        await f.create(); const draft = f.bytes('TASK-101');
        // Done is reached only by acceptance; started work needs a responsible member and reviewed readiness.
        refused(await move('TASK-101', 'done'), 'MISSING_PROOF');
        for (const state of ['in_progress', 'blocked', 'verifying']) assert.equal((await move('TASK-101', state)).primary.status, 'refused', state);
        refused(await move('TASK-101', 'ready'), 'NOT_READY');
        assert.deepEqual(f.bytes('TASK-101'), draft);
        // Accepted work goes back to draft with its acceptance history kept; it no longer counts as accepted.
        await f.accepted('TASK-101'); const acceptance = f.record('TASK-101').tracking.acceptanceHistory;
        assert.equal((await move('TASK-101', 'draft')).primary.status, 'saved');
        assert.equal(f.record('TASK-101').data.status, 'draft'); assert.deepEqual(f.record('TASK-101').tracking.acceptanceHistory, acceptance);
        assert.equal(f.progress().metrics.accepted, 0);
        // With its member and readiness still recorded, the same work can be placed straight into verifying, or blocked with the reason.
        assert.equal((await move('TASK-101', 'verifying')).primary.status, 'saved');
        assert.equal((await move('TASK-101', 'blocked')).primary.status, 'saved');
        assert.equal(f.record('TASK-101').tracking.blocker.reason, 'Recorded state was wrong');
        // Leaving blocked by correction clears the blocker; the usual resume rule is untouched.
        assert.equal((await move('TASK-101', 'planned')).primary.status, 'saved');
        assert.equal(f.record('TASK-101').tracking.blocker, null);
        // Automatic upkeep can never make a correction, even for linked work and with the flag set.
        const patch = { state: 'in_progress', correction: true, reason: 'Recorded state was wrong' };
        refused(await f.perform('transition', 'TASK-101', patch, {}, { ...person, automatic: true, linkedItemIds: ['TASK-101'], observedTransition: patch }), 'NOT_PERMITTED');
        assert.equal(f.record('TASK-101').data.status, 'planned');
    }),
    test('TC-TPT-039', 'a correction out of canceled drops the blocker the cancellation kept, and a correction to blocked records a new one', async f => {
        // Real scenario: blocked work is canceled, then the cancellation turns out to be a mistake. The usual cancellation keeps the blocker as found.
        const person = { canCorrectState: true }; const move = (id, state, reason) => f.saved('transition', id, { state, correction: true, reason }, {}, person);
        for (const state of ['planned', 'draft', 'ready', 'in_progress', 'verifying']) {
            const id = `TASK-STALE-${state}`; await f.create(id); await f.active(id);
            await f.saved('transition', id, { state: 'blocked', reason: 'Waiting on a prerequisite' });
            await f.saved('transition', id, { state: 'canceled', reason: 'Requested scope removed' });
            assert.equal(f.record(id).tracking.blocker.reason, 'Waiting on a prerequisite');
            await move(id, state, 'Canceled by mistake');
            assert.equal(f.record(id).data.status, state); assert.equal(f.record(id).tracking.blocker, null, state);
        }
        await f.create(); await f.active(); await f.saved('transition', 'TASK-101', { state: 'blocked', reason: 'Waiting on a prerequisite' });
        await f.saved('transition', 'TASK-101', { state: 'canceled', reason: 'Requested scope removed' });
        await move('TASK-101', 'blocked', 'Still waiting on the supplier');
        const blocker = f.record('TASK-101').tracking.blocker;
        assert.equal(blocker.reason, 'Still waiting on the supplier'); assert.equal(blocker.resumeState, 'in_progress'); assert.equal(blocker.actor, 'owner');
        // The usual resume rule then clears it as before.
        await f.saved('transition', 'TASK-101', { state: 'in_progress', resolution: 'Supplier delivered' });
        assert.equal(f.record('TASK-101').tracking.blocker, null);
    }),
    test('TC-TPT-123', 'allocated creation identity is retained by retries and collision never overwrites', async f => {
        const request = f.request('create', null, { title: 'Captured work', intent: 'Defined delivery intent' });
        const created = await f.core.executeOperation(request, f.authority()); assert.equal(created.primary.status, 'saved');
        const id = created.primary.itemId; const before = f.bytes(id);
        const replay = await f.core.executeOperation(request, f.authority());
        assert.equal(replay.primary.itemId, id); assert.equal(replay.primary.replayed, true); assert.equal(f.records().length, 1);
        refused(await f.perform('create', id, { title: 'Duplicate capture', intent: 'Other intent' }), 'CONFLICT');
        assert.deepEqual(f.bytes(id), before);
    }),
    test('TC-TPT-123', 'receipt horizon requires fresh preview and retains bounded retry history', async f => {
        await f.create();
        for (let count = 1; count < 128; count++) await f.saved('update', 'TASK-101', { priority: count });
        assert.equal(f.record('TASK-101').tracking.receipts.length, 128);
        const before = f.bytes('TASK-101'); const request = f.request('update', 'TASK-101', { priority: 129 });
        refused(await f.core.executeOperation(request, f.authority()), 'REPLAY_HORIZON'); assert.deepEqual(f.bytes('TASK-101'), before);
        const preview = await f.core.executeOperation({ ...request, preview: true }, f.authority()); assert.equal(preview.primary.status, 'preview');
        const saved = await f.core.executeOperation({ ...request, previewToken: preview.previewToken }, f.authority());
        assert.equal(saved.primary.status, 'saved'); assert.equal(f.record('TASK-101').revision, 129);
        assert.equal(f.record('TASK-101').tracking.receipts.length, 128); assert.equal(f.record('TASK-101').tracking.history.length, 129);
        const current = f.bytes('TASK-101');
        assert.equal((await f.core.executeOperation(request, f.authority())).primary.replayed, true); assert.deepEqual(f.bytes('TASK-101'), current);
    }),
    test('TC-TPT-123', 'expired allocated creation cannot create duplicate work or authorize altered retries', async f => {
        const request = f.request('create', null, { title: 'Captured work', intent: 'Defined delivery intent' });
        const created = await f.core.executeOperation(request, f.authority()); assert.equal(created.primary.status, 'saved');
        const id = created.primary.itemId;
        let lastRequest;
        for (let count = 1; count <= 128; count++) {
            lastRequest = f.request('update', id, { priority: count });
            const preview = await f.core.executeOperation({ ...lastRequest, preview: true }, f.authority());
            assert.equal(preview.primary.status, 'preview');
            assert.equal((await f.core.executeOperation({ ...lastRequest, previewToken: preview.previewToken }, f.authority())).primary.status, 'saved');
        }
        assert.equal(f.record(id).tracking.receipts.some(receipt => receipt.operationId === request.operationId), false);
        assert.equal(f.record(id).tracking.history.some(entry => entry.operationId === request.operationId), true);
        const before = f.bytes(id); const progress = f.progress().metrics;
        for (const retry of [request, { ...request, preview: true }, { ...request, previewToken: 'f'.repeat(64) },
            { ...request, patch: { ...request.patch, title: 'Altered retry' } },
            { ...request, target: { kind: 'area' } },
            f.request('update', id, { priority: 999 }, { operationId: request.operationId })]) {
            refused(await f.core.executeOperation(retry, f.authority()), 'REPLAY_HORIZON');
            assert.deepEqual(f.bytes(id), before); assert.equal(f.records().length, 1);
            assert.deepEqual(f.progress().metrics, progress);
        }
        assert.equal((await f.core.executeOperation(lastRequest, f.authority())).primary.replayed, true);
        assert.deepEqual(f.bytes(id), before);
        const fresh = await f.perform('create', null, { title: 'New work', intent: 'A new explicit delivery intent' });
        assert.equal(fresh.primary.status, 'saved'); assert.notEqual(fresh.primary.itemId, id);
        assert.equal(f.records().length, 2); assert.deepEqual(f.bytes(id), before);
    }),
    test('TC-TPT-047', 'priority, criteria and batch bounds reject invalid changes with no partial save', async f => {
        await f.create();
        for (const priority of [0, -1, 1000, 1.5]) {
            const before = f.bytes('TASK-101'); refused(await f.perform('update', 'TASK-101', { priority }), 'INVALID_INPUT'); assert.deepEqual(f.bytes('TASK-101'), before);
        }
        for (const priority of [1, 999]) { await f.saved('update', 'TASK-101', { priority }); assert.equal(f.record('TASK-101').data.priority, priority); }
        const before = f.bytes('TASK-101');
        refused(await f.perform('update', 'TASK-101', { criteria: [{ id: 'same', text: 'First outcome' }, { id: 'same', text: 'Other outcome' }] }), 'INVALID_INPUT');
        refused(await f.perform('update', 'TASK-101', { unknownPermission: true }), 'INVALID_INPUT');
        const request = f.request('update', 'TASK-101', { title: 'Batch draft' });
        await assert.rejects(f.core.executeBatch(Array(65).fill(request), f.authority()), error => error.code === 'LIMIT_EXCEEDED');
        assert.deepEqual(f.bytes('TASK-101'), before);
    }),
    test('TC-TPT-107', 'future-dated and duplicated-criterion proof cannot grant current acceptance', async f => {
        await f.create(); await f.verifying(); const before = f.bytes('TASK-101');
        for (const proof of [f.proof('TASK-101', { observedAt: '9999-01-01T00:00:00.000Z' }), f.proof('TASK-101', { criteriaIds: ['selected-rows', 'selected-rows'] })]) {
            refused(await f.perform('proof', 'TASK-101', { proof }), 'INVALID_INPUT'); assert.deepEqual(f.bytes('TASK-101'), before);
        }
        await f.saved('proof', 'TASK-101', { proof: f.proof() }); assert.equal(f.view('TASK-101').verification.status, 'current');
        // A teammate/manual edit can introduce an invalid future observation;
        // inspection must not trust it merely because YAML parses successfully.
        const record = f.record('TASK-101'); f.write(record.ownerPath, record.text.replace(`"observedAt":"${OBSERVED_AT}"`, '"observedAt":"9999-01-01T00:00:00.000Z"'));
        assert.notEqual(f.view('TASK-101').verification.status, 'current');
        refused(await f.perform('accept', 'TASK-101', { reason: 'Requested acceptance' }), 'MISSING_PROOF'); assert.equal(f.progress().metrics.accepted, 0);
    }),
    test('TC-TPT-101', 'legacy draft without captured intent cannot become planned work', async f => {
        f.write('work/tasks/TASK-101.md', '---\nid: TASK-101\ntitle: Existing draft\nstatus: draft\n---\nAuthored body retained.\n');
        const request = f.request('adopt', 'TASK-101', {}); const preview = await f.core.executeOperation({ ...request, preview: true }, f.authority());
        assert.equal(preview.primary.status, 'preview'); assert.equal((await f.core.executeOperation({ ...request, previewToken: preview.previewToken }, f.authority())).primary.status, 'saved');
        const before = f.bytes('TASK-101'); refused(await f.perform('transition', 'TASK-101', { state: 'planned' }), 'NOT_READY');
        assert.deepEqual(f.bytes('TASK-101'), before); assert.equal(f.record('TASK-101').data.status, 'draft');
    }),
    test('TC-TPT-048', 'health needs an explicit scoped owner date and reason and never follows delivery percentages', async f => {
        await f.create('AREA-1', 'area'); await f.create('TASK-101', 'task', { areaIds: ['AREA-1'] });
        f.config.taskTracking.healthOwnerId = 'AREA-1'; f.saveConfig();
        assert.equal(f.progress().health.status, 'unknown'); await f.accepted(); assert.equal(f.progress().metrics.percentage, 100); assert.equal(f.progress().health.status, 'unknown');
        const health = { assessment: 'Watch dependency risk', ownerId: 'owner', observedAt: OBSERVED_AT, reason: 'External service decision is still pending' };
        const task = f.bytes('TASK-101'); const saved = await f.saved('attest', 'AREA-1', { health }, {}, { canAttest: true });
        assert.equal(saved.primary.status, 'saved'); assert.deepEqual(f.record('AREA-1').tracking.health, health);
        const project = f.progress().health; assert.equal(project.status, 'attested'); assert.equal(project.itemId, 'AREA-1'); assert.equal(project.ownerId, 'owner'); assert.equal(project.observedAt, OBSERVED_AT); assert.equal(project.reason, health.reason);
        assert.equal(f.progress({ scopeId: 'AREA-1' }).health.assessment, health.assessment); assert.equal(f.view('TASK-101').health.status, 'unknown'); assert.deepEqual(f.bytes('TASK-101'), task);
        await f.create('TASK-2'); assert.equal(f.progress().metrics.percentage, 50); assert.deepEqual(f.progress().health, project);
        assert.equal(f.record('AREA-1').tracking.history.at(-1).operation, 'attest'); assert.equal(f.record('AREA-1').tracking.receipts.at(-1).operationId, saved.primary.operationId);
    }),
    test('TC-TPT-048', 'health cannot borrow another owner or automatic authority and retains attribution through rename', async f => {
        await f.create(); f.config.taskTracking.healthOwnerId = 'TASK-101'; f.saveConfig();
        const health = { assessment: 'Needs attention', ownerId: 'owner', observedAt: OBSERVED_AT, reason: 'Actual owner assessment' }; const before = f.bytes('TASK-101');
        refused(await f.perform('attest', 'TASK-101', { health }), 'NOT_PERMITTED');
        for (const invalid of [{ ...health, ownerId: 'peer' }, { ...health, observedAt: '9999-01-01T00:00:00.000Z' }, { ...health, reason: '' }]) {
            refused(await f.perform('attest', 'TASK-101', { health: invalid }, {}, { canAttest: true }), 'NOT_PERMITTED'); assert.deepEqual(f.bytes('TASK-101'), before);
        }
        refused(await f.perform('attest', 'TASK-101', { health }, {}, { canAttest: true, automatic: true, linkedItemIds: ['TASK-101'] }), 'NOT_PERMITTED');
        await f.saved('attest', 'TASK-101', { health }, {}, { canAttest: true });
        f.config.taskTracking.members[0].displayName = 'Renamed owner'; f.config.taskTracking.members[0].active = false; f.saveConfig();
        const existing = f.bytes('TASK-101'); assert.equal(f.progress().health.ownerId, 'owner'); assert.equal(f.progress().health.displayName, 'Renamed owner'); assert.equal(f.progress().health.observedAt, OBSERVED_AT);
        refused(await f.perform('attest', 'TASK-101', { health }, {}, { canAttest: true }), 'INVALID_MEMBER'); assert.deepEqual(f.bytes('TASK-101'), existing);
    }),
    test('TC-TPT-048', 'foreign, future and malformed imported health stays unknown without guessed correction', async f => {
        await f.create(); f.config.taskTracking.healthOwnerId = 'TASK-101'; f.saveConfig();
        const health = { assessment: 'Reviewed', ownerId: 'owner', observedAt: OBSERVED_AT, reason: 'Actual observation' };
        await f.saved('attest', 'TASK-101', { health }, {}, { canAttest: true }); const valid = f.record('TASK-101');
        const serialized = JSON.stringify(health); const healthIndex = valid.text.lastIndexOf(serialized);
        assert.notEqual(healthIndex, -1);
        // Ordinary manual/Git changes may introduce unsupported attestation facts.
        for (const invalid of [{ ...health, ownerId: 'foreign-owner' }, { ...health, observedAt: '9999-01-01T00:00:00.000Z' }, { ...health, reason: '' }]) {
            f.write(valid.ownerPath, valid.text.slice(0, healthIndex) + JSON.stringify(invalid) + valid.text.slice(healthIndex + serialized.length));
            assert.deepEqual(f.record('TASK-101').tracking.health, invalid);
            assert.deepEqual(f.record('TASK-101').tracking.history, valid.tracking.history);
            const bytes = fs.readFileSync(path.join(f.root, valid.ownerPath));
            assert.equal(f.progress().health.status, 'unknown'); assert.deepEqual(fs.readFileSync(path.join(f.root, valid.ownerPath)), bytes);
        }
        f.write(valid.ownerPath, valid.bytes); f.config.taskTracking.healthOwnerId = 'missing-owner'; f.saveConfig(); assert.equal(f.progress().health.status, 'unknown');
    }),

    // P13 hierarchy source carriers: runtime/visible navigation remain separate owners.
    test('TC-TPT-201', 'absent minimal and relocated configuration need no member enrollment or hierarchy rewrite', async f => {
        fs.unlinkSync(path.join(f.root, 'docs/project-config.json'));
        const artifactRoot = f.context().artifactsRoot;
        await f.create('F', 'area'); await f.create('P', 'task', { areaIds: ['F'] });
        const child = f.bytes('P'); const missing = f.progress({ scopeId: 'F' });
        assert.equal(missing.enrolled, false); assert.equal(missing.mode, 'off'); assert.deepEqual(missing.scope.eligibleTaskIds, ['P']);
        assert.deepEqual(missing.hierarchy.labels, { levels: { application: 'Application', product: 'Product', module: 'Module', feature: 'Feature' },
            types: { feedback: 'Feedback', idea: 'Idea', initiative: 'Initiative' } });
        f.config = { project: { name: 'Independent fixture' }, docsRoots: { teamArtifacts: { path: artifactRoot } }, taskTracking: { schemaVersion: 3 } }; f.saveConfig();
        await f.saved('update', 'F', { level: 'feature' }); assert.equal(f.view('F').level, 'feature');
        f.write('metadata/project.json', JSON.stringify({ ...f.config, taskTracking: { schemaVersion: 3, levelLabels: { feature: 'Outcome' } } }));
        f.write('.claude/.ck.local.json', JSON.stringify({ portability: { projectConfigPath: 'metadata/project.json' } }));
        const configured = fs.readFileSync(path.join(f.root, 'metadata/project.json')); const relocated = f.progress({ scopeId: 'F' });
        assert.equal(relocated.hierarchy.labels.levels.feature, 'Outcome'); assert.deepEqual(relocated.scope.eligibleTaskIds, ['P']);
        assert.deepEqual(f.bytes('P'), child); assert.deepEqual(fs.readFileSync(path.join(f.root, 'metadata/project.json')), configured);
    }),
    test('TC-TPT-201', 'optional level retains generic nesting and all child owners without setup or conversion', async f => {
        await f.create('G', 'area'); await f.create('F', 'area', { areaIds: ['G'] });
        await f.create('P', 'task', { areaIds: ['G'] }); await f.create('Q', 'task', { areaIds: ['F'] }); await f.create('T', 'subtask', { areaIds: ['F'] });
        const children = new Map(['G', 'P', 'Q', 'T'].map(id => [id, f.bytes(id)]));
        const config = fs.readFileSync(path.join(f.root, 'docs/project-config.json'));
        assert.equal(f.view('G').level, null); assert.equal(f.view('F').level, null);
        await f.saved('update', 'F', { level: 'feature' });
        const result = f.progress({ scopeId: 'G' });
        assert.equal(result.hierarchy.labels.levels.feature, 'Feature'); assert.equal(f.view('G').level, null);
        assert.equal(f.view('F').level, 'feature'); assert.deepEqual(result.scope.eligibleTaskIds, ['P', 'Q']);
        assert.deepEqual(result.scope.memberIds, ['F', 'P', 'Q', 'T']); assert.deepEqual(result.scope.childAreaIds, ['F']);
        for (const [id, bytes] of children) assert.deepEqual(f.bytes(id), bytes);
        assert.deepEqual(fs.readFileSync(path.join(f.root, 'docs/project-config.json')), config);
    }),
    test('TC-TPT-203', 'selected delivery identities separate exclusions and support while proof and health keep their meanings', async f => {
        await f.create('A', 'area', { level: 'product' }); await f.create('F', 'area', { level: 'feature', areaIds: ['A'] });
        for (const [id, kind] of [['P', 'task'], ['Q', 'task'], ['R', 'task'], ['S', 'task'], ['ST', 'story'], ['T', 'subtask']]) await f.create(id, kind, { areaIds: ['F'] });
        await f.accepted('Q'); await f.saved('transition', 'R', { state: 'canceled', reason: 'Outside active delivery' });
        await f.saved('retire', 'S', { reason: 'Historical scope' });
        const q = f.record('Q'); f.write(q.ownerPath, q.text + '\nRelevant authored outcome changed after acceptance.\n');
        const bytes = new Map(f.records().map(item => [item.id, item.bytes])); const result = f.progress({ scopeId: 'F' });
        assert.deepEqual(result.scope.taskIds, ['P', 'Q', 'R', 'S']); assert.deepEqual(result.scope.eligibleTaskIds, ['P', 'Q']);
        assert.deepEqual(result.scope.excludedTaskIds, ['R', 'S']); assert.deepEqual(result.scope.memberIds, ['P', 'Q', 'R', 'S', 'ST', 'T']);
        assert.deepEqual(result.scope.eligibleTaskIds, result.metrics.eligibleIds); assert.equal(result.metrics.total, 2);
        assert.equal(result.metrics.accepted, 1); assert.equal(result.metrics.currentlyVerified, 0); assert.equal(result.health.status, 'unknown');
        const historical = result.items.find(item => item.id === 'Q'); assert.equal(historical.acceptance.accepted, true); assert.equal(historical.verification.status, 'stale');
        assert.deepEqual(result.scope.affiliations.find(item => item.itemId === 'F').areaIds, ['A']);
        for (const [id, original] of bytes) assert.deepEqual(f.bytes(id), original);
    }),
    test('TC-TPT-204', 'shared diamonds expose direct affiliations and exact unique scopes without a permanent parent', async f => {
        for (const id of ['A', 'B']) await f.create(id, 'area', { level: 'product' });
        await f.create('F', 'area', { level: 'feature', areaIds: ['A', 'B'] }); await f.create('G', 'area', { areaIds: ['A'] });
        await f.create('P', 'task', { areaIds: ['F'] }); await f.create('Q', 'task', { areaIds: ['F', 'G'] });
        for (const scopeId of ['A', 'B', 'F']) {
            const result = f.progress({ scopeId }); assert.equal(result.coverage, 'complete'); assert.equal(result.metrics.total, 2);
            assert.deepEqual(result.scope.eligibleTaskIds, ['P', 'Q']); assert.equal(result.scope.memberIds.includes(scopeId), false);
            assert.deepEqual(result.hierarchy.areas.find(item => item.id === 'F').parentAreaIds, ['A', 'B']);
        }
        const project = f.progress(); assert.deepEqual(project.scope.childAreaIds, ['A', 'B']);
        assert.deepEqual(project.hierarchy.areas.map(item => item.id).sort(), ['A', 'B', 'F', 'G']);
    }),
    test('TC-TPT-205', 'project retains unlevelled and untagged work while selected delivery remains independent of outside records', async f => {
        await f.create('A', 'area', { level: 'product' }); await f.create('G', 'area', { areaIds: ['A'] });
        await f.create('P', 'task', { areaIds: ['G'] }); await f.create('T', 'subtask', { areaIds: ['G'] }); await f.create('U');
        const project = f.progress(); assert.deepEqual(project.hierarchy.untaggedTaskIds, ['U']);
        assert.equal(project.hierarchy.areas.find(item => item.id === 'G').level, null);
        assert.deepEqual(project.scope.memberIds, ['A', 'G', 'P', 'T', 'U']); assert.deepEqual(project.scope.eligibleTaskIds, ['P', 'U']);
        const selected = f.progress({ scopeId: 'A' }); const revision = selected.metrics.scopeRevision;
        assert.deepEqual(selected.scope.eligibleTaskIds, ['P']); assert.ok(selected.items.some(item => item.id === 'U'));
        await f.create('OUTSIDE'); const reread = f.progress({ scopeId: 'A' });
        assert.equal(reread.metrics.scopeRevision, revision); assert.deepEqual(reread.scope.eligibleTaskIds, ['P']);
        assert.equal(reread.metrics.percentage, 0);
    }),
    test('TC-TPT-211', 'declared labels share project validation and fail closed at raw length control and shape boundaries', async f => {
        const { validateTaskTracking } = require('../../lib/task-tracking-config.cjs');
        const { validateConfig } = require('../../lib/project-config-schema.cjs');
        // The default display names, spelled out: a declared label replaces its own word's name and nothing else.
        const defaults = { levels: { application: 'Application', product: 'Product', module: 'Module', feature: 'Feature' },
            types: { feedback: 'Feedback', idea: 'Idea', initiative: 'Initiative' } };
        await f.create('F', 'area'); const before = f.bytes('F');
        for (const [key, table, word, other] of [['levelLabels', 'levels', 'product', 'feature'], ['typeLabels', 'types', 'idea', 'feedback']]) {
            for (const declared of [null, [], 'Feature', { other: 'Other' }, { [word]: '' }, { [word]: '   ' }, { [word]: 'x'.repeat(161) },
                { [word]: 'line\nfeed' }, { [word]: '\u0000' }, { [word]: '\u007f' }, { [word]: '\u0085' }, { [word]: 9 }, { [word]: false }]) {
                f.config.taskTracking[key] = declared;
                assert.ok(validateTaskTracking(f.config).length); assert.equal(validateConfig(f.config).valid, false);
                f.saveConfig(); const stored = fs.readFileSync(path.join(f.root, 'docs/project-config.json'));
                const result = f.progress(); assert.equal(result.coverage, 'unavailable'); assert.equal(result.metrics, null);
                assert.ok(result.diagnostics.some(item => item.code === 'INVALID_CONFIG'));
                assert.deepEqual(fs.readFileSync(path.join(f.root, 'docs/project-config.json')), stored);
                assert.deepEqual(fs.readFileSync(path.join(f.root, 'work/areas/F.md')), before);
            }
            for (const value of [{}, { [word]: 'x'.repeat(160) }, { [word]: ' Module ', [other]: '<script>inert()</script>' }, Object.fromEntries(Object.keys(defaults[table]).map(name => [name, 'Same']))]) {
                f.config.taskTracking[key] = value; assert.deepEqual(validateTaskTracking(f.config), []); assert.equal(validateConfig(f.config).valid, true); f.saveConfig();
                assert.deepEqual(f.progress().hierarchy.labels, { ...defaults, [table]: { ...defaults[table], ...Object.fromEntries(Object.entries(value).map(([name, label]) => [name, label.trim()])) } });
                assert.deepEqual(f.bytes('F'), before);
            }
            delete f.config.taskTracking[key];
        }
        f.saveConfig(); assert.deepEqual(f.progress().hierarchy.labels, defaults);
    }),
    test('TC-TPT-212', 'manual corrupt tag reads terminate honestly without selecting duplicated owners or repairing bytes', async f => {
        const { patchRecord } = require('../../lib/task-artifact-store.cjs');
        await f.create('F', 'area'); await f.create('G', 'area'); await f.create('P', 'task', { areaIds: ['F'] });
        await f.create('Q'); await f.create('I', 'initiative');
        const original = new Map(f.records().map(item => [item.id, item]));
        const linked = (id, links, owned = {}) => [original.get(id).ownerPath, patchRecord(original.get(id), {}, { ...original.get(id).tracking, ...owned, links }).bytes];
        const areaTag = itemId => ({ relation: 'area', itemId }); const initiativeTag = itemId => ({ relation: 'initiative', itemId });
        // Deliberate outside-host imports: core writes already refuse these graphs. Each fault is named by the code and
        // the reason of its own finding, on the record that carries it; a cycle is named on whichever record closes it.
        // `leftOut` names the record of each tag that places nothing: one that is no valid tag is left out of every scope.
        const imports = {
            self: { files: [linked('F', [areaTag('F')])], findings: [['UNRESOLVED_LINK', 'F', 'Self relationship is forbidden']], leftOut: ['F'] },
            cycle: { files: [linked('F', [areaTag('G')]), linked('G', [areaTag('F')])], findings: [['CYCLE', undefined, 'Relationships contain a cycle']], leftOut: [] },
            missing: { files: [linked('P', [areaTag('F'), areaTag('MISSING')])], findings: [['INVALID_LINK_TARGET', 'P', 'Tag target MISSING has no unique project owner']], leftOut: ['P'] },
            wrongKind: { files: [linked('P', [areaTag('F'), areaTag('Q'), initiativeTag('G')])],
                findings: [['INVALID_LINK_TARGET', 'P', 'Tag target Q is not of kind area'], ['INVALID_LINK_TARGET', 'P', 'Tag target G is not of kind initiative']], leftOut: ['P', 'P'] },
            repeated: { files: [linked('P', [areaTag('F'), areaTag('F')])], findings: [['INVALID_LINK_TARGET', 'P', 'Tag target F is repeated']], leftOut: [] },
            areaToInitiative: { files: [linked('G', [initiativeTag('I')])], findings: [['INVALID_LINK_TARGET', 'G', 'An area declares no initiative link: I']], leftOut: ['G'] },
            levelOrder: { files: [linked('F', [areaTag('G')], { level: 'product' }), linked('G', [], { level: 'feature' })], findings: [['INVALID_AREA_LEVEL', 'F', 'Area sits under a deeper-level area: G']], leftOut: [] },
            applicationParent: { files: [linked('F', [areaTag('G')], { level: 'application' })], findings: [['INVALID_AREA_LEVEL', 'F', 'An application-level area has no parent: G']], leftOut: [] },
            duplicate: { files: [['work/tasks/duplicate.md', original.get('P').bytes]], findings: [['DUPLICATE_ID', 'P', 'Identity has multiple homes']], leftOut: [] } };
        for (const [variant, { files, findings, leftOut }] of Object.entries(imports)) {
            for (const item of original.values()) f.write(item.ownerPath, item.bytes);
            for (const [ownerPath, bytes] of files) f.write(ownerPath, bytes);
            const imported = f.records().map(item => [item.ownerPath, item.bytes]); const result = f.progress({ scopeId: 'F' });
            assert.equal(result.coverage, 'partial', variant); assert.equal(result.metrics.percentage, null, variant);
            for (const [code, itemId, reason] of findings) assert.ok(result.diagnostics.some(item => item.code === code && item.reason === reason && (itemId === undefined || item.itemId === itemId)),
                `${variant}: ${code} on ${itemId || 'a record'}, among ${JSON.stringify(result.diagnostics)}`);
            // No fault of one kind is reported as the other.
            for (const code of ['INVALID_LINK_TARGET', 'INVALID_AREA_LEVEL', 'CYCLE']) assert.equal(result.diagnostics.some(item => item.code === code), findings.some(([expected]) => expected === code), `${variant}: ${code}`);
            assert.deepEqual(result.diagnostics.filter(item => item.code === 'UNRESOLVED_TAG').map(item => [item.itemId, item.reason]), leftOut.map(id => [id, 'Tag has no unique admitted target of its kind']), variant);
            if (variant === 'duplicate') { assert.deepEqual(result.scope.eligibleTaskIds, []); assert.equal(result.scope.memberIds.includes('P'), false); }
            else {
                assert.deepEqual(result.scope.eligibleTaskIds, ['P'], variant);
                // A tag that is not valid places nothing, and a repeated one places its record once.
                assert.deepEqual(result.scope.affiliations.find(item => item.itemId === 'P'), { itemId: 'P', areaIds: ['F'], initiativeIds: [] }, variant);
            }
            for (const [ownerPath, bytes] of imported) assert.deepEqual(fs.readFileSync(path.join(f.root, ownerPath)), bytes);
            if (variant === 'duplicate') fs.unlinkSync(path.join(f.root, 'work/tasks/duplicate.md'));
        }
        for (const item of original.values()) f.write(item.ownerPath, item.bytes);
        for (const scopeId of ['P', 'MISSING']) {
            const result = f.progress({ scopeId }); assert.equal(result.coverage, 'unavailable'); assert.equal(result.metrics, null);
            assert.equal(result.scope.coverage, 'unavailable'); assert.ok(result.items.some(item => item.id === 'P'));
            assert.ok(result.diagnostics.some(item => item.code === 'UNAVAILABLE_SCOPE'));
        }
        const area = original.get('F');
        f.write(area.ownerPath, patchRecord(area, {}, { ...area.tracking, level: 'unknown' }).bytes);
        const malformed = f.progress({ scopeId: 'F' }); assert.equal(malformed.coverage, 'partial'); assert.equal(malformed.metrics.percentage, null);
        assert.ok(malformed.diagnostics.some(item => item.code === 'INVALID_RECORD'));
        assert.equal(malformed.items.find(item => item.id === 'F').level, null);
        // A member list written by hand on an area places nothing: the record is named as invalid and its list is not read as tags.
        f.write(area.ownerPath, area.bytes); const listing = original.get('G'); assert.ok(listing.text.includes('tracking: {'));
        f.write(listing.ownerPath, listing.text.replace('tracking: {', 'tracking: {"memberItemIds":["P"],"groupRole":"capability",'));
        const listed = f.progress({ scopeId: 'G' }); assert.equal(listed.coverage, 'partial'); assert.equal(listed.metrics.percentage, null);
        assert.ok(listed.diagnostics.some(item => item.code === 'INVALID_RECORD' && item.itemId === 'G'));
        assert.deepEqual(listed.scope.memberIds, []); assert.deepEqual(f.progress({ scopeId: 'F' }).scope.eligibleTaskIds, ['P']);
    }),
    test('TC-TPT-213', 'narrow scope preserves global management and exact shared-spec concern selection without inferred members', async f => {
        const { readConcerns } = require('../../lib/task-tracking-concerns.cjs');
        for (const [id, kind] of [['F', 'area'], ['P', 'task'], ['Q', 'task'], ['T', 'subtask'], ['Z', 'subtask']]) await f.create(id, kind);
        f.write('intent/shared.md', '---\nid: SPEC-SHARED\n---\nShared governing intent.\n');
        for (const id of ['P', 'Q']) await f.saved('link', id, { links: [{ relation: 'spec', path: 'intent/shared.md' }] });
        await f.saved('link', 'Z', { links: [{ relation: 'parent', itemId: 'P' }] });
        for (const id of ['P', 'T']) await f.tag(id, { areaIds: ['F'] });
        const pending = f.request('update', 'Q', { title: 'Retained pending Q draft' }); const draft = JSON.stringify(pending); const q = f.bytes('Q');
        const scoped = f.progress({ scopeId: 'F' }); assert.deepEqual(scoped.scope.memberIds, ['P', 'T']); assert.deepEqual(scoped.scope.eligibleTaskIds, ['P']);
        assert.equal(scoped.metrics.total, 1); assert.ok(scoped.items.some(item => item.id === 'Q')); assert.ok(scoped.items.some(item => item.id === 'Z'));
        const onlyP = readConcerns(f.root, { schemaVersion: 1, itemIds: ['P'] });
        assert.equal(onlyP.items.some(item => item.itemId === 'Q'), false); assert.ok(onlyP.relationships.some(item => item.owner.itemId === 'P' && item.relation === 'spec'));
        const shared = readConcerns(f.root, { schemaVersion: 1, paths: ['intent/shared.md'] });
        assert.ok(shared.relationships.some(item => item.owner.itemId === 'Q' && item.owner.ownerPath === f.record('Q').ownerPath && item.relation === 'spec' && item.direction === 'incoming'));
        assert.equal(JSON.stringify(pending), draft); assert.deepEqual(f.bytes('Q'), q);
    }),
    test('TC-TPT-232', 'finite graph permutations and portable states conserve unique identities and exclude every link that is not a tag', async () => {
        const { scopeProjection, scopeMetrics } = require('../../lib/task-progress-reader.cjs');
        const under = (...ids) => ids.map(itemId => ({ relation: 'area', itemId }));
        const task = (id, state, retired, links) => ({ id, kind: 'task', state, retired, links, acceptance: { accepted: state === 'done' }, verification: { status: state === 'done' ? 'current' : 'missing' } });
        // P0 sits in G alone and names it twice, P6 sits in both G and F, the others in F: each is reached from F once.
        const outcomes = ['draft', 'planned', 'ready', 'in_progress', 'blocked', 'verifying', 'done', 'canceled']
            .map((state, n) => task(`P${n}`, state, null, n === 0 ? under('G', 'G') : n === 6 ? under('G', 'F') : under('F')));
        // OUTSIDE names F and a task in F by links that are no tag, and F names OUTSIDE the same way: none of them places it.
        outcomes.push(task('RETIRED', 'done', { reason: 'Retained exclusion' }, under('F')),
            task('OUTSIDE', 'draft', null, [{ relation: 'parent', itemId: 'F' }, { relation: 'dependency', itemId: 'P1' }]));
        const items = [...outcomes, { id: 'T', kind: 'subtask', links: under('G') }, { id: 'I', kind: 'initiative', links: under('F') },
            { id: 'G', kind: 'area', level: 'feature', links: under('F') },
            { id: 'F', kind: 'area', level: 'product', links: [{ relation: 'parent', itemId: 'OUTSIDE' }] }];
        for (const reverse of [false, true]) {
            const ordered = (reverse ? [...items].reverse() : items).map(item => ({ ...item, links: reverse ? [...item.links].reverse() : item.links }));
            const snapshot = { items: ordered, coverage: 'complete', context: { config: {} } }; const selected = scopeProjection(snapshot, 'F');
            assert.equal(selected.coverage, 'complete'); assert.deepEqual(selected.scope.eligibleTaskIds, ['P0', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6']);
            assert.deepEqual(selected.scope.excludedTaskIds, ['P7', 'RETIRED']); assert.equal(selected.metrics.total, 7); assert.equal(selected.metrics.accepted, 1);
            assert.equal(selected.metrics.currentlyVerified, 1); assert.equal(selected.scope.memberIds.includes('OUTSIDE'), false);
            assert.deepEqual(selected.scope.childAreaIds, ['G']); assert.deepEqual(scopeMetrics(snapshot, 'F'), selected.metrics);
            assert.deepEqual(scopeProjection(snapshot).hierarchy.untaggedTaskIds, ['OUTSIDE']);
        }
        const empty = scopeProjection({ items: [], coverage: 'complete', context: { config: {} } });
        assert.equal(empty.metrics.total, 0); assert.equal(empty.metrics.percentage, null);
        const unknown = scopeProjection({ items: [task('KNOWN', 'draft', null, [])], coverage: 'partial', context: { config: {} } });
        assert.equal(unknown.metrics.total, 1); assert.equal(unknown.metrics.percentage, null); assert.deepEqual(unknown.scope.eligibleTaskIds, ['KNOWN']);
    }),
    test('TC-TPT-212', 'edge and navigation byte bounds disclose omissions without complete percentages or invented untagged claims', async () => {
        const { scopeProjection } = require('../../lib/task-progress-reader.cjs'); const { LIMITS } = require('../../lib/task-tracking-config.cjs');
        const tagged = (id, areas) => ({ id, kind: 'task', state: 'draft', links: areas.map(area => ({ relation: 'area', itemId: area.id })), acceptance: { accepted: false }, verification: { status: 'missing' } });
        const areas = Array.from({ length: 100 }, (_, n) => ({ id: `G-${n}`, kind: 'area', level: 'product', links: [] }));
        const outcomes = Array.from({ length: 201 }, (_, n) => tagged(`P-${n}`, areas));
        assert.ok(areas.length * outcomes.length > LIMITS.membershipEdges);
        const bounded = scopeProjection({ items: [...outcomes, ...areas], coverage: 'complete', context: { config: {} } });
        assert.equal(bounded.coverage, 'partial'); assert.equal(bounded.metrics.percentage, null);
        assert.ok(bounded.diagnostics.some(item => item.code === 'LIMIT_EXCEEDED')); assert.deepEqual(bounded.hierarchy.untaggedTaskIds, []);
        assert.deepEqual(bounded.scope.childAreaIds, []); assert.deepEqual(bounded.scope.eligibleTaskIds, bounded.metrics.eligibleIds);
        const longAreas = areas.map((item, n) => ({ ...item, id: `G${n}-` + 'y'.repeat(110) }));
        const longOutcomes = outcomes.slice(0, 200).map((item, n) => tagged(`P${n}-` + 'x'.repeat(110), longAreas));
        const byteBound = scopeProjection({ items: [...longOutcomes, ...longAreas], coverage: 'complete', context: { config: {} } });
        assert.equal(byteBound.coverage, 'partial'); assert.ok(byteBound.diagnostics.some(item => /byte budget/.test(item.reason)));
        assert.equal(byteBound.metrics.percentage, null); assert.deepEqual(byteBound.scope.affiliations, []);
        assert.ok(Buffer.byteLength(JSON.stringify({ hierarchy: byteBound.hierarchy, scope: byteBound.scope })) <= LIMITS.recordBytes);
        assert.equal(byteBound.metrics.total, longOutcomes.length);
    }),
    test('TC-TPT-233', 'pinned labels levels and tags remain baseline-specific after local label and scope changes', async f => {
        const { git } = require('../lib/task-tracking-fixture.cjs');
        await f.create('F', 'area', { level: 'feature' }); await f.create('P', 'task', { areaIds: ['F'] }); await f.create('Q');
        f.config.taskTracking.levelLabels = { feature: 'Baseline outcome' }; f.saveConfig();
        git(f, ['init']); git(f, ['add', '--', 'docs', 'work']); git(f, ['commit', '-m', 'Isolated selected baseline']); const oid = git(f, ['rev-parse', 'HEAD']);
        await f.tag('P', { areaIds: [] }); await f.tag('Q', { areaIds: ['F'] }); await f.saved('update', 'F', { level: 'product' });
        f.config.taskTracking.levelLabels = { product: 'Personal scope', feature: 'Local outcome' }; f.saveConfig();
        const bytes = new Map(f.records().map(item => [item.id, item.bytes])); const config = fs.readFileSync(path.join(f.root, 'docs/project-config.json'));
        const shared = f.progress({ ref: oid, scopeId: 'F' }); const local = f.progress({ scopeId: 'F' });
        assert.equal(shared.source.oid, oid); assert.equal(shared.hierarchy.labels.levels.feature, 'Baseline outcome'); assert.equal(shared.hierarchy.labels.levels.product, 'Product');
        assert.equal(shared.hierarchy.areas.find(item => item.id === 'F').level, 'feature'); assert.deepEqual(shared.scope.eligibleTaskIds, ['P']);
        assert.equal(local.hierarchy.labels.levels.product, 'Personal scope'); assert.deepEqual(local.scope.eligibleTaskIds, ['Q']);
        assert.equal(local.hierarchy.areas.find(item => item.id === 'F').level, 'product');
        assert.notEqual(shared.fingerprint, local.fingerprint);
        for (const [id, before] of bytes) assert.deepEqual(f.bytes(id), before); assert.deepEqual(fs.readFileSync(path.join(f.root, 'docs/project-config.json')), config);
    }),

    // Areas, initiatives and tags: where work belongs (areas with levels), why it is done (initiatives), tags stored on the
    // tagged record, a lifecycle per kind, owned values and due dates. Each case names the one rule it protects.
    test('TC-TPT-263', 'an area sits beneath another only when the parent is not at a deeper level, so a level may be skipped', async f => {
        // Every ordered pair of levels, once at capture and once by placing an existing area. An application-level child
        // is left to its own rule in the next case.
        const accepted = []; let pair = 0;
        for (const parentLevel of LEVELS) for (const childLevel of LEVELS.slice(1)) {
            const parent = `PARENT-${pair}`; const child = `CHILD-${pair}`; const moved = `MOVED-${pair++}`;
            await f.create(parent, 'area', { level: parentLevel }); await f.create(moved, 'area', { level: childLevel });
            const before = f.storedState();
            const results = [await capture(f, child, 'area', { level: childLevel, areaIds: [parent] }), await f.perform('tag', moved, { areaIds: [parent] })];
            const statuses = results.map(result => result.primary.status);
            if (statuses.every(status => status === 'saved')) {
                accepted.push(`${parentLevel} > ${childLevel}`);
                assert.deepEqual(f.progress().hierarchy.areas.find(item => item.id === parent).childAreaIds, [child, moved]);
            } else {
                // Nothing of a refused placement is saved: no new area and no tag.
                for (const result of results) refused(result, 'INVALID_RELATIONSHIP');
                assert.deepEqual(f.storedState(), before, `${parentLevel} > ${childLevel}`);
            }
        }
        // The truth table, written out: same level and any deeper level are accepted, with or without the levels between.
        assert.deepEqual(accepted, ['application > product', 'application > module', 'application > feature',
            'product > product', 'product > module', 'product > feature', 'module > module', 'module > feature', 'feature > feature']);
        const read = f.progress(); assert.equal(read.coverage, 'complete'); assert.deepEqual(read.diagnostics, []);
    }),
    test('TC-TPT-263', 'an application-level area has no parent', async f => {
        await f.create('APP', 'area', { level: 'application' }); await f.create('OTHER-APP', 'area', { level: 'application' });
        const parents = ['APP'];
        for (const level of LEVELS.slice(1)) { await f.create(`AREA-${level}`, 'area', { level }); parents.push(`AREA-${level}`); }
        await f.create('AREA-unset', 'area'); parents.push('AREA-unset');
        await f.create('PLACED', 'area', { areaIds: ['AREA-product'] });
        const before = f.storedState();
        // Under no area of any level, its own included, and under none without a level: at capture and by placing it later.
        for (const parent of parents) {
            refused(await capture(f, 'NEW-APP', 'area', { level: 'application', areaIds: [parent] }), 'INVALID_RELATIONSHIP');
            refused(await f.perform('tag', 'OTHER-APP', { areaIds: [parent] }), 'INVALID_RELATIONSHIP');
        }
        // An area that already has a parent cannot become application-level either.
        refused(await f.perform('update', 'PLACED', { level: 'application' }), 'INVALID_RELATIONSHIP');
        assert.deepEqual(f.storedState(), before);
        // It is the top of the hierarchy: every other area may sit beneath it.
        for (const child of parents.slice(1)) await f.tag(child, { areaIds: ['APP'] });
        const read = f.progress(); assert.equal(read.coverage, 'complete');
        assert.deepEqual(read.scope.childAreaIds, ['APP', 'OTHER-APP']);
        assert.deepEqual(read.hierarchy.areas.find(item => item.id === 'APP'), { id: 'APP', level: 'application', parentAreaIds: [], childAreaIds: ['AREA-feature', 'AREA-module', 'AREA-product', 'AREA-unset'] });
    }),
    test('TC-TPT-263', 'an unset level constrains nothing', async f => {
        // Beneath an area of every level, the deepest included.
        for (const level of LEVELS) { await f.create(`OVER-${level}`, 'area', { level }); await f.create(`LOOSE-${level}`, 'area', { areaIds: [`OVER-${level}`] }); }
        // Above an area of every level that may have a parent at all, and above another area without a level.
        await f.create('LOOSE-PARENT', 'area');
        for (const level of LEVELS.slice(1)) await f.create(`UNDER-${level}`, 'area', { level, areaIds: ['LOOSE-PARENT'] });
        await f.create('LOOSE-CHILD', 'area', { areaIds: ['LOOSE-PARENT'] });
        // Clearing a level lifts the limit it set: a product is refused under a feature and accepted once that level is unset.
        await f.create('WAS-FEATURE', 'area', { level: 'feature' });
        refused(await capture(f, 'SHALLOWER', 'area', { level: 'product', areaIds: ['WAS-FEATURE'] }), 'INVALID_RELATIONSHIP');
        await f.saved('update', 'WAS-FEATURE', { level: null }); assert.equal(f.view('WAS-FEATURE').level, null);
        await f.create('SHALLOWER', 'area', { level: 'product', areaIds: ['WAS-FEATURE'] });
        const read = f.progress(); assert.equal(read.coverage, 'complete'); assert.deepEqual(read.diagnostics, []);
        // Areas are listed shallowest level first, and those without a level last.
        assert.deepEqual(read.hierarchy.areas.map(item => item.level), ['application', 'product', 'product', 'product', 'module', 'module', 'feature', 'feature', null, null, null, null, null, null, null]);
        assert.deepEqual(read.hierarchy.areas.find(item => item.id === 'LOOSE-PARENT').childAreaIds, ['LOOSE-CHILD', 'UNDER-feature', 'UNDER-module', 'UNDER-product']);
    }),
    test('TC-TPT-263', 'the level rule is judged against an area\'s direct parents only: with an area that has no level between them, a product sits beneath a feature', async f => {
        await f.create('FEATURE', 'area', { level: 'feature' });
        const alone = f.storedState();
        // Directly beneath the feature a product is refused: its parent would be deeper than it is.
        refused(await capture(f, 'DIRECT', 'area', { level: 'product', areaIds: ['FEATURE'] }), 'INVALID_RELATIONSHIP'); assert.deepEqual(f.storedState(), alone);
        // With an area that has no level between them, each placement is judged against its own parent and both are saved.
        await f.create('BETWEEN', 'area', { areaIds: ['FEATURE'] }); await f.create('PRODUCT', 'area', { level: 'product', areaIds: ['BETWEEN'] });
        await f.create('TASK-1', 'task', { areaIds: ['PRODUCT'] });
        const read = f.progress(); assert.equal(read.coverage, 'complete'); assert.deepEqual(read.diagnostics, []);
        assert.deepEqual(read.hierarchy.areas, [{ id: 'PRODUCT', level: 'product', parentAreaIds: ['BETWEEN'], childAreaIds: [] },
            { id: 'FEATURE', level: 'feature', parentAreaIds: [], childAreaIds: ['BETWEEN'] }, { id: 'BETWEEN', level: null, parentAreaIds: ['FEATURE'], childAreaIds: ['PRODUCT'] }]);
        // The chain is a hierarchy like any other: the feature's scope reaches the work placed in the product.
        assert.deepEqual(f.progress({ scopeId: 'FEATURE' }).scope.taskIds, ['TASK-1']);
        // Only its having no level lets the area stand between them: every level it could take breaks one of its two
        // direct placements, its own beneath the feature or the product's beneath it.
        const chained = f.storedState();
        for (const level of LEVELS) refused(await f.perform('update', 'BETWEEN', { level }), 'INVALID_RELATIONSHIP');
        assert.deepEqual(f.storedState(), chained);
    }),
    test('TC-TPT-263', 'a level change that breaks another record\'s placement is refused', async f => {
        await f.create('PARENT', 'area', { level: 'module' }); await f.create('CHILD', 'area', { level: 'module', areaIds: ['PARENT'] });
        await f.create('TASK-1', 'task', { areaIds: ['CHILD'] });
        const before = f.storedState();
        // The parent would become deeper than the area placed under it: the broken placement is the child's, the refused save the parent's.
        refused(await f.perform('update', 'PARENT', { level: 'feature' }), 'INVALID_RELATIONSHIP');
        refused(await f.core.executeOperation({ ...f.request('update', 'PARENT', { level: 'feature' }), preview: true }, f.authority()), 'INVALID_RELATIONSHIP');
        // The child would become shallower than its parent.
        refused(await f.perform('update', 'CHILD', { level: 'product' }), 'INVALID_RELATIONSHIP');
        assert.deepEqual(f.storedState(), before); assert.deepEqual([f.view('PARENT').level, f.view('CHILD').level], ['module', 'module']);
        // A change that keeps every placement is previewed without a save and then saved as previewed.
        const kept = f.request('update', 'PARENT', { level: 'product' }); const preview = await f.core.executeOperation({ ...kept, preview: true }, f.authority());
        assert.equal(preview.primary.status, 'preview'); assert.deepEqual([preview.current.level, preview.proposed.level], ['module', 'product']);
        assert.deepEqual(f.storedState(), before);
        assert.equal((await f.core.executeOperation({ ...kept, previewToken: preview.previewToken }, f.authority())).primary.status, 'saved');
        // So is the change refused above, once nothing stands under the area at a shallower level.
        await f.saved('update', 'CHILD', { level: 'feature' });
        await f.saved('update', 'PARENT', { level: 'feature' }); await f.saved('update', 'PARENT', { level: null }); await f.saved('update', 'CHILD', { level: 'product' });
        const read = f.progress(); assert.equal(read.coverage, 'complete'); assert.deepEqual(read.diagnostics, []);
        assert.deepEqual(read.scope.affiliations.find(item => item.itemId === 'TASK-1').areaIds, ['CHILD']);
    }),
    test('TC-TPT-263', 'no chain of areas returns to itself', async f => {
        for (const id of ['A', 'B', 'C']) await f.create(id, 'area');
        await f.tag('A', { areaIds: ['B'] }); await f.tag('B', { areaIds: ['C'] });
        const before = f.storedState();
        // A chain of three, of two and of one.
        refused(await f.perform('tag', 'C', { areaIds: ['A'] }), 'INVALID_RELATIONSHIP');
        refused(await f.perform('tag', 'B', { areaIds: ['C', 'A'] }), 'INVALID_RELATIONSHIP');
        refused(await f.perform('tag', 'A', { areaIds: ['A'] }), 'INVALID_RELATIONSHIP');
        assert.deepEqual(f.storedState(), before);
        // Two saves, each valid alone, that together close a loop: the one that lands second is refused against the project it reads.
        await f.create('X', 'area'); await f.create('Y', 'area');
        const requests = [f.request('tag', 'X', { areaIds: ['Y'] }), f.request('tag', 'Y', { areaIds: ['X'] })];
        const results = await Promise.all(requests.map(request => f.core.executeOperation(request, f.authority())));
        assert.equal(results.filter(result => result.primary.status === 'saved').length, 1);
        assert.equal(results.filter(result => result.primary.code === 'INVALID_RELATIONSHIP').length, 1);
        const read = f.progress(); assert.equal(read.coverage, 'complete'); assert.deepEqual(read.diagnostics, []);
    }),
    test('TC-TPT-268', 'a tag is stored on the tagged record and changes no area or initiative record', async f => {
        for (const id of ['FEATURE-1', 'FEATURE-2']) await f.create(id, 'area', { level: 'feature' });
        for (const id of ['INITIATIVE-1', 'INITIATIVE-2']) await f.create(id, 'initiative');
        for (const id of ['TASK-1', 'TASK-2', 'TASK-3', 'TASK-4']) await f.create(id);
        const targets = new Map(['FEATURE-1', 'FEATURE-2', 'INITIATIVE-1', 'INITIATIVE-2'].map(id => [id, f.bytes(id)]));
        const untagged = f.bytes('TASK-4'); const before = f.record('TASK-1');
        const saved = await f.tag('TASK-1', { areaIds: ['FEATURE-1', 'FEATURE-2'], initiativeIds: ['INITIATIVE-1', 'INITIATIVE-2'] });
        const after = f.record('TASK-1');
        assert.deepEqual(after.tracking.links, [{ relation: 'area', itemId: 'FEATURE-1' }, { relation: 'area', itemId: 'FEATURE-2' },
            { relation: 'initiative', itemId: 'INITIATIVE-1' }, { relation: 'initiative', itemId: 'INITIATIVE-2' }]);
        assert.deepEqual(f.view('TASK-1').links, after.tracking.links);
        // One save of the tagged record alone: one revision and one history entry, named for what it is.
        assert.equal(saved.primary.itemId, 'TASK-1'); assert.equal(after.revision, before.revision + 1);
        assert.deepEqual(after.tracking.history.slice(0, -1), before.tracking.history); assert.equal(after.tracking.history.at(-1).operation, 'tag');
        // No area or initiative changed, and none keeps a list of what is tagged to it.
        for (const [id, bytes] of targets) { assert.deepEqual(f.bytes(id), bytes, id); assert.equal(Object.hasOwn(f.record(id).tracking, 'memberItemIds'), false); }
        // So two people tagging different work to the same area never write the same record: both saves land.
        const requests = ['TASK-2', 'TASK-3'].map(id => f.request('tag', id, { areaIds: ['FEATURE-1'] }));
        const results = await Promise.all(requests.map(request => f.core.executeOperation(request, f.authority())));
        assert.deepEqual(results.map(result => result.primary.status), ['saved', 'saved']);
        for (const [id, bytes] of targets) assert.deepEqual(f.bytes(id), bytes, id);
        assert.deepEqual(f.bytes('TASK-4'), untagged);
        // Every scope is read back from those tags.
        const read = f.progress(); assert.equal(read.coverage, 'complete'); assert.deepEqual(read.hierarchy.untaggedTaskIds, ['TASK-4']);
        assert.deepEqual(read.scope.affiliations.find(item => item.itemId === 'TASK-1'), { itemId: 'TASK-1', areaIds: ['FEATURE-1', 'FEATURE-2'], initiativeIds: ['INITIATIVE-1', 'INITIATIVE-2'] });
        assert.deepEqual(f.progress({ scopeId: 'FEATURE-1' }).scope.memberIds, ['TASK-1', 'TASK-2', 'TASK-3']);
        assert.deepEqual(f.progress({ scopeId: 'INITIATIVE-2' }).scope.memberIds, ['TASK-1']);
    }),
    test('TC-TPT-268', 'tag replaces only the links of the relation it names and keeps every other link', async f => {
        f.write('intent/export.md', 'Governing intent.\n'); f.write('src/export.js', 'exports.version = 1;\n');
        for (const id of ['AREA-1', 'AREA-2', 'AREA-3']) await f.create(id, 'area');
        for (const id of ['INITIATIVE-1', 'INITIATIVE-2']) await f.create(id, 'initiative');
        await f.create('TASK-DEP'); await f.create('TASK-1');
        const kept = [{ relation: 'dependency', itemId: 'TASK-DEP' }, { relation: 'spec', path: 'intent/export.md' }, { relation: 'source', path: 'src/export.js' }];
        const area = itemId => ({ relation: 'area', itemId }); const initiative = itemId => ({ relation: 'initiative', itemId });
        const links = () => f.record('TASK-1').tracking.links;
        // Every link that is no tag is saved first; the tag operation then edits one relation at a time around them.
        await f.saved('link', 'TASK-1', { links: kept }); await f.tag('TASK-1', { areaIds: ['AREA-1'], initiativeIds: ['INITIATIVE-1'] });
        assert.deepEqual(links(), [...kept, area('AREA-1'), initiative('INITIATIVE-1')]);
        await f.tag('TASK-1', { areaIds: ['AREA-3', 'AREA-2'] });
        assert.deepEqual(links(), [...kept, initiative('INITIATIVE-1'), area('AREA-3'), area('AREA-2')]);
        await f.tag('TASK-1', { initiativeIds: ['INITIATIVE-2'] });
        assert.deepEqual(links(), [...kept, area('AREA-3'), area('AREA-2'), initiative('INITIATIVE-2')]);
        // Both relations in one save.
        await f.tag('TASK-1', { areaIds: ['AREA-1'], initiativeIds: ['INITIATIVE-1'] });
        assert.deepEqual(links(), [...kept, area('AREA-1'), initiative('INITIATIVE-1')]);
    }),
    test('TC-TPT-268', 'the link operation never writes a tag: it keeps every stored tag exactly, replaces every other link, and refuses a list that names an area or initiative link', async f => {
        f.write('intent/export.md', 'Governing intent.\n'); f.write('src/export.js', 'exports.version = 1;\n');
        for (const id of ['AREA-1', 'AREA-2']) await f.create(id, 'area');
        for (const id of ['INITIATIVE-1', 'INITIATIVE-2']) await f.create(id, 'initiative');
        await f.create('TASK-DEP'); await f.create('TASK-1', 'task', { areaIds: ['AREA-2', 'AREA-1'], initiativeIds: ['INITIATIVE-1'] });
        const area = itemId => ({ relation: 'area', itemId }); const initiative = itemId => ({ relation: 'initiative', itemId });
        const tags = [area('AREA-2'), area('AREA-1'), initiative('INITIATIVE-1')];
        const links = () => f.record('TASK-1').tracking.links;
        const scopes = () => ['AREA-1', 'AREA-2', 'INITIATIVE-1', 'INITIATIVE-2'].map(scopeId => f.progress({ scopeId }).scope.memberIds);
        const placed = scopes(); assert.deepEqual(placed, [['TASK-1'], ['TASK-1'], ['TASK-1'], []]);
        // A list of links that are no tags, from a caller that knows nothing of tags: every tag is still stored, as it was.
        const others = [{ relation: 'dependency', itemId: 'TASK-DEP' }, { relation: 'spec', path: 'intent/export.md' }];
        const saved = await f.saved('link', 'TASK-1', { links: others });
        assert.deepEqual(links(), [...tags, ...others]); assert.deepEqual(saved.current.links, [...tags, ...others]); assert.deepEqual(scopes(), placed);
        // The list is the whole of the other links: a later list replaces the earlier one, and an empty one clears them.
        await f.saved('link', 'TASK-1', { links: [{ relation: 'source', path: 'src/export.js' }] });
        assert.deepEqual(links(), [...tags, { relation: 'source', path: 'src/export.js' }]);
        const preview = await f.core.executeOperation({ ...f.request('link', 'TASK-1', { links: [] }), preview: true }, f.authority());
        assert.equal(preview.primary.status, 'preview'); assert.deepEqual(preview.proposed.links, tags);
        await f.saved('link', 'TASK-1', { links: [] });
        assert.deepEqual(links(), tags); assert.deepEqual(scopes(), placed);
        // A list that names a tag relation is refused whole and points to the operation that writes tags: a new tag, a
        // tag the record already holds, one among other links, and the same request as a preview.
        const before = f.storedState();
        const lists = [[area('AREA-1')], [initiative('INITIATIVE-2')], tags, [...others, area('AREA-2')], [initiative('INITIATIVE-1'), ...others], [area('MISSING')]];
        for (const list of lists) for (const preview of [false, true]) {
            const result = await f.core.executeOperation({ ...f.request('link', 'TASK-1', { links: list }), ...(preview ? { preview } : {}) }, f.authority());
            refused(result, 'INVALID_INPUT');
            assert.equal(result.primary.reason, 'A link list names no tag: area and initiative links stay as stored and are changed only by the tag operation (areaIds, initiativeIds)');
        }
        assert.deepEqual(f.storedState(), before);
        // An area and an initiative carry their own tags the same way.
        await f.tag('AREA-1', { areaIds: ['AREA-2'] }); await f.tag('INITIATIVE-2', { areaIds: ['AREA-1'], initiativeIds: ['INITIATIVE-1'] });
        for (const [id, held] of [['AREA-1', [area('AREA-2')]], ['INITIATIVE-2', [area('AREA-1'), initiative('INITIATIVE-1')]]]) {
            refused(await f.perform('link', id, { links: held }), 'INVALID_INPUT');
            await f.saved('link', id, { links: [{ relation: 'plan', path: 'intent/export.md' }] });
            assert.deepEqual(f.record(id).tracking.links, [...held, { relation: 'plan', path: 'intent/export.md' }], id);
        }
        // Capture and refinement take no list of links at all: a new record's tags arrive under their own keys.
        refused(await capture(f, 'NEW-1', 'task', { links: [area('AREA-1')] }), 'INVALID_INPUT'); refused(await f.perform('update', 'TASK-1', { links: [area('AREA-1')] }), 'INVALID_INPUT');
        // The tag operation remains the one writer: it changes the relation it names and nothing else.
        await f.saved('link', 'TASK-1', { links: others }); await f.tag('TASK-1', { areaIds: ['AREA-1'] });
        assert.deepEqual(links(), [initiative('INITIATIVE-1'), ...others, area('AREA-1')]);
        assert.deepEqual(f.progress().scope.affiliations.find(item => item.itemId === 'TASK-1'), { itemId: 'TASK-1', areaIds: ['AREA-1'], initiativeIds: ['INITIATIVE-1'] });
        // Discovery states the rule where a caller reads what the link operation does.
        const described = f.core.operationCatalogue(f.config).operations.find(value => value.name === 'link');
        assert.deepEqual(described.patchKeys, ['links']); assert.match(described.purpose, /every canonical relationship that is not a tag.*area and initiative links stay as stored and a list that names one is refused/);
    }),
    test('TC-TPT-268', 'an empty tag list clears its relation, an omitted key leaves it and an empty tag patch is refused', async f => {
        await f.create('AREA-1', 'area'); await f.create('INITIATIVE-1', 'initiative');
        await f.create('TASK-1', 'task', { areaIds: ['AREA-1'], initiativeIds: ['INITIATIVE-1'] });
        const tagged = f.bytes('TASK-1');
        const empty = await f.perform('tag', 'TASK-1', {});
        refused(empty, 'INVALID_INPUT'); assert.match(empty.primary.reason, /^No tag change requested$/); assert.deepEqual(f.bytes('TASK-1'), tagged);
        await f.tag('TASK-1', { areaIds: [] });
        assert.deepEqual(f.record('TASK-1').tracking.links, [{ relation: 'initiative', itemId: 'INITIATIVE-1' }]);
        await f.tag('TASK-1', { areaIds: ['AREA-1'] }); await f.tag('TASK-1', { initiativeIds: [] });
        assert.deepEqual(f.record('TASK-1').tracking.links, [{ relation: 'area', itemId: 'AREA-1' }]);
        await f.tag('TASK-1', { areaIds: [], initiativeIds: [] });
        assert.deepEqual(f.record('TASK-1').tracking.links, []); assert.deepEqual(f.progress().hierarchy.untaggedTaskIds, ['TASK-1']);
    }),
    test('TC-TPT-123', 'an exact tag retry replays its receipt and a tag that lost a race conflicts with its draft kept', async f => {
        for (const id of ['AREA-1', 'AREA-2']) await f.create(id, 'area');
        await f.create('TASK-DEP'); await f.create('TASK-1');
        const request = f.request('tag', 'TASK-1', { areaIds: ['AREA-1'] }); const draft = JSON.stringify(request);
        const saved = await f.core.executeOperation(request, f.authority()); assert.equal(saved.primary.status, 'saved');
        const once = f.bytes('TASK-1'); const replay = await f.core.executeOperation(request, f.authority());
        assert.equal(replay.primary.replayed, true); assert.equal(replay.primary.revision, saved.primary.revision); assert.deepEqual(f.bytes('TASK-1'), once);
        // A retry that arrives after a newer tag leaves the newer links alone, and its identity cannot carry another change.
        await f.tag('TASK-1', { areaIds: ['AREA-2'] }); const newer = f.bytes('TASK-1');
        assert.equal((await f.core.executeOperation(request, f.authority())).primary.replayed, true); assert.deepEqual(f.bytes('TASK-1'), newer);
        refused(await f.core.executeOperation({ ...request, patch: { areaIds: ['AREA-2'] } }, f.authority()), 'REUSED_OPERATION'); assert.deepEqual(f.bytes('TASK-1'), newer);
        // A tag save and a link edit that read the same revision: one lands, the other is told to reread and keeps its draft.
        const racing = [f.request('tag', 'TASK-1', { areaIds: ['AREA-1', 'AREA-2'] }), f.request('link', 'TASK-1', { links: [{ relation: 'dependency', itemId: 'TASK-DEP' }] })];
        const drafts = racing.map(value => JSON.stringify(value));
        const results = await Promise.all(racing.map(value => f.core.executeOperation(value, f.authority())));
        assert.equal(results.filter(result => result.primary.status === 'saved').length, 1);
        assert.equal(results.filter(result => result.primary.code === 'CONFLICT').length, 1);
        assert.equal(f.record('TASK-1').revision, 4); assert.deepEqual(racing.map(value => JSON.stringify(value)), drafts); assert.equal(JSON.stringify(request), draft);
    }),
    test('TC-TPT-022', 'a tag preview saves nothing and grants nothing: a stale preview, another actor, revoked write access and an unsupported profile are refused', async f => {
        for (const id of ['AREA-1', 'AREA-2']) await f.create(id, 'area');
        await f.create('TASK-1');
        const request = f.request('tag', 'TASK-1', { areaIds: ['AREA-1'] }); const draft = JSON.stringify(request);
        const untagged = f.bytes('TASK-1'); const stored = f.storedState();
        const preview = await f.core.executeOperation({ ...request, preview: true }, f.authority());
        assert.equal(preview.primary.status, 'preview'); assert.deepEqual(preview.current.links, []);
        assert.deepEqual(preview.proposed.links, [{ relation: 'area', itemId: 'AREA-1' }]); assert.deepEqual(f.storedState(), stored);
        const pending = { ...request, previewToken: preview.previewToken };
        // The save is judged by who asks now, whatever was previewed.
        refused(await f.core.executeOperation(pending, f.authority({ actor: 'peer' })), 'NOT_PERMITTED');
        refused(await f.core.executeOperation(pending, f.authority({ canWrite: false })), 'NOT_PERMITTED');
        f.config.taskTracking.profile = { kind: 'native', version: 1, registration: 'unproved', sources: [] }; f.saveConfig();
        refused(await f.core.executeOperation(pending, f.authority()), 'UNPROVED_NATIVE_CAPABILITY');
        assert.deepEqual(fs.readFileSync(path.join(f.root, 'work/tasks/TASK-1.md')), untagged);
        delete f.config.taskTracking.profile; f.saveConfig(); assert.deepEqual(f.storedState(), stored);
        // Another record changed after the preview: it no longer describes the project the save would land in.
        await f.saved('update', 'AREA-2', { title: 'Renamed after the preview' });
        refused(await f.core.executeOperation(pending, f.authority()), 'CONFLICT'); assert.deepEqual(f.bytes('TASK-1'), untagged);
        // The tagged record itself changed after a second preview.
        const second = f.request('tag', 'TASK-1', { areaIds: ['AREA-2'] }); const stale = await f.core.executeOperation({ ...second, preview: true }, f.authority());
        await f.saved('update', 'TASK-1', { priority: 2 }); const newer = f.bytes('TASK-1');
        refused(await f.core.executeOperation({ ...second, previewToken: stale.previewToken }, f.authority()), 'CONFLICT'); assert.deepEqual(f.bytes('TASK-1'), newer);
        // A current preview is saved as previewed.
        const current = f.request('tag', 'TASK-1', { areaIds: ['AREA-1'] }); const fresh = await f.core.executeOperation({ ...current, preview: true }, f.authority());
        assert.equal((await f.core.executeOperation({ ...current, previewToken: fresh.previewToken }, f.authority())).primary.status, 'saved');
        assert.deepEqual(f.record('TASK-1').tracking.links, fresh.proposed.links); assert.equal(JSON.stringify(request), draft);
    }),
    test('TC-TPT-268', 'a tag names one existing area or initiative once: unknown, repeated, wrongly typed and self targets are refused', async f => {
        for (const id of ['AREA-1', 'AREA-2']) await f.create(id, 'area');
        for (const id of ['INITIATIVE-1', 'INITIATIVE-2']) await f.create(id, 'initiative');
        await f.create('TASK-1'); await f.create('TASK-2'); await f.create('STORY-1', 'story');
        const before = f.storedState();
        // Each refused shape with the one finding behind its refusal: a tag fault is an invalid link target, and a record
        // that names itself is an unresolved link like any other self relationship.
        const target = reason => ['INVALID_LINK_TARGET', reason]; const self = ['UNRESOLVED_LINK', 'Self relationship is forbidden'];
        const invalid = [
            ['TASK-1', 'area', ['MISSING'], target('Tag target MISSING has no unique project owner')], ['TASK-1', 'initiative', ['MISSING'], target('Tag target MISSING has no unique project owner')],
            ['TASK-1', 'area', ['AREA-1', 'AREA-1'], target('Tag target AREA-1 is repeated')], ['TASK-1', 'initiative', ['INITIATIVE-1', 'INITIATIVE-1'], target('Tag target INITIATIVE-1 is repeated')],
            ['TASK-1', 'area', ['INITIATIVE-1'], target('Tag target INITIATIVE-1 is not of kind area')], ['TASK-1', 'initiative', ['AREA-1'], target('Tag target AREA-1 is not of kind initiative')],
            ['TASK-1', 'area', ['TASK-2'], target('Tag target TASK-2 is not of kind area')], ['TASK-1', 'initiative', ['STORY-1'], target('Tag target STORY-1 is not of kind initiative')],
            ['AREA-1', 'area', ['AREA-1'], self], ['INITIATIVE-1', 'initiative', ['INITIATIVE-1'], self], ['TASK-1', 'area', ['TASK-1'], self]];
        for (const [id, relation, ids, finding] of invalid) {
            refused(await f.perform('tag', id, { [`${relation}Ids`]: ids }), 'INVALID_RELATIONSHIP');
            assert.deepEqual(relationshipFindings(f, id, ids.map(itemId => ({ relation, itemId }))), [finding], `${id} ${relation} ${ids}`);
        }
        // So is capture, where the record that would tag itself does not exist yet.
        for (const patch of [{ areaIds: ['MISSING'] }, { areaIds: ['AREA-1', 'AREA-1'] }, { initiativeIds: ['AREA-1'] }]) refused(await capture(f, 'NEW-1', 'task', patch), 'INVALID_RELATIONSHIP');
        refused(await capture(f, 'NEW-2', 'area', { areaIds: ['NEW-2'] }), 'INVALID_RELATIONSHIP');
        // A target is named by its exact identity, in a list.
        for (const areaIds of [null, 'AREA-1', [7], ['not an identity'], [['AREA-1']]]) refused(await f.perform('tag', 'TASK-1', { areaIds }), 'INVALID_INPUT');
        assert.deepEqual(f.storedState(), before);
        // The valid counterpart of each refused shape is saved.
        await f.tag('TASK-1', { areaIds: ['AREA-1', 'AREA-2'], initiativeIds: ['INITIATIVE-1', 'INITIATIVE-2'] }); await f.tag('AREA-1', { areaIds: ['AREA-2'] });
        const read = f.progress(); assert.equal(read.coverage, 'complete'); assert.deepEqual(read.diagnostics, []);
    }),
    test('TC-TPT-268', 'an area is placed under areas only: an initiative link declared by an area is refused', async f => {
        await f.create('AREA-1', 'area'); await f.create('AREA-2', 'area'); await f.create('INITIATIVE-1', 'initiative');
        const before = f.storedState();
        refused(await f.perform('tag', 'AREA-1', { initiativeIds: ['INITIATIVE-1'] }), 'INVALID_RELATIONSHIP');
        assert.deepEqual(relationshipFindings(f, 'AREA-1', [{ relation: 'initiative', itemId: 'INITIATIVE-1' }]), [['INVALID_LINK_TARGET', 'An area declares no initiative link: INITIATIVE-1']]);
        refused(await capture(f, 'AREA-3', 'area', { initiativeIds: ['INITIATIVE-1'] }), 'INVALID_RELATIONSHIP');
        assert.deepEqual(f.storedState(), before);
        // The other direction is a placement like any other: an initiative may be placed in an area.
        await f.tag('INITIATIVE-1', { areaIds: ['AREA-1'] }); await f.tag('AREA-1', { areaIds: ['AREA-2'] });
        const read = f.progress({ scopeId: 'AREA-2' }); assert.equal(read.coverage, 'complete'); assert.deepEqual(read.scope.memberIds, ['AREA-1', 'INITIATIVE-1']);
    }),
    test('TC-TPT-268', 'capture tags a new record to its first areas and initiatives', async f => {
        await f.create('AREA-1', 'area', { level: 'product' }); await f.create('AREA-2', 'area', { level: 'feature', areaIds: ['AREA-1'] });
        await f.create('INITIATIVE-1', 'initiative', { areaIds: ['AREA-1'] });
        const targets = new Map(['AREA-1', 'AREA-2', 'INITIATIVE-1'].map(id => [id, f.bytes(id)]));
        for (const kind of ['task', 'story', 'subtask']) {
            const id = `NEW-${kind}`; const saved = await f.create(id, kind, { areaIds: ['AREA-2', 'AREA-1'], initiativeIds: ['INITIATIVE-1'] });
            const record = f.record(id);
            // The tags are part of the one capture save, in the order given.
            assert.deepEqual(record.tracking.links, [{ relation: 'area', itemId: 'AREA-2' }, { relation: 'area', itemId: 'AREA-1' }, { relation: 'initiative', itemId: 'INITIATIVE-1' }]);
            assert.equal(saved.primary.revision, 1); assert.equal(record.revision, 1); assert.deepEqual(record.tracking.history.map(entry => entry.operation), ['create']);
        }
        // An area is captured under its parent, and an initiative into its area, the same way.
        assert.deepEqual(f.record('AREA-2').tracking.links, [{ relation: 'area', itemId: 'AREA-1' }]);
        assert.deepEqual(f.record('INITIATIVE-1').tracking.links, [{ relation: 'area', itemId: 'AREA-1' }]);
        // Capture with no tag, or with empty lists, links nothing.
        await f.create('PLAIN'); await f.create('EMPTY', 'task', { areaIds: [], initiativeIds: [] });
        assert.deepEqual(f.record('PLAIN').tracking.links, []); assert.deepEqual(f.record('EMPTY').tracking.links, []);
        for (const [id, bytes] of targets) assert.deepEqual(f.bytes(id), bytes, id);
        const read = f.progress(); assert.equal(read.coverage, 'complete'); assert.deepEqual(read.hierarchy.untaggedTaskIds, ['EMPTY', 'PLAIN']);
        assert.deepEqual(read.scope.affiliations.find(item => item.itemId === 'NEW-task'), { itemId: 'NEW-task', areaIds: ['AREA-1', 'AREA-2'], initiativeIds: ['INITIATIVE-1'] });
    }),
    test('TC-TPT-272', 'each owned value is accepted only on the kinds that own it', async f => {
        // Who owns what, written out: a kind that gains or loses a value is noticed here.
        const owners = { level: ['area'], type: ['initiative'], priorityLevel: ['initiative'], deadline: ['initiative', 'task', 'story', 'subtask'] };
        const sample = { level: 'product', type: 'feedback', priorityLevel: 'high', deadline: '2030-01-31' };
        for (const kind of ['initiative', 'task', 'story', 'subtask', 'area']) {
            const refined = `REFINED-${kind}`; await f.create(refined, kind);
            for (const [field, value] of Object.entries(sample)) {
                const captured = `CAPTURED-${kind}-${field}`; const before = f.storedState();
                const results = [await capture(f, captured, kind, { [field]: value }), await f.perform('update', refined, { [field]: value })];
                if (owners[field].includes(kind)) {
                    for (const result of results) assert.equal(result.primary.status, 'saved', `${kind} ${field}`);
                    for (const id of [captured, refined]) { assert.equal(f.record(id).tracking[field], value); assert.equal(f.view(id)[field], value); }
                } else {
                    // Refused with the field named, at capture and at refinement, and nothing is saved.
                    for (const result of results) { refused(result, 'INVALID_INPUT'); assert.match(result.primary.reason, new RegExp(`^${field} belongs to `)); }
                    assert.deepEqual(f.storedState(), before, `${kind} ${field}`);
                    assert.equal(Object.hasOwn(f.record(refined).tracking, field), false); assert.equal(f.view(refined)[field], null);
                }
            }
        }
    }),
    test('TC-TPT-272', 'an owned value outside its list is refused and an optional one is cleared with null', async f => {
        f.write('intent/placement.md', 'Why this work is placed where it is.\n');
        await f.create('AREA-1', 'area'); await f.create('INITIATIVE-1', 'initiative', { areaIds: ['AREA-1'] }); await f.create('TASK-1', 'task', { deadline: '2030-01-31' });
        await f.saved('link', 'AREA-1', { links: [{ relation: 'plan', path: 'intent/placement.md' }] });
        // The three lists, written out.
        const lists = { level: ['application', 'product', 'module', 'feature'], type: ['feedback', 'idea', 'initiative'], priorityLevel: ['high', 'medium', 'low'] };
        const owner = { level: ['AREA-1', 'area'], type: ['INITIATIVE-1', 'initiative'], priorityLevel: ['INITIATIVE-1', 'initiative'] };
        for (const [field, values] of Object.entries(lists)) {
            const [id, kind] = owner[field];
            for (const value of values) {
                const was = f.record(id); await f.saved('update', id, { [field]: value }); const now = f.record(id);
                assert.equal(now.tracking[field], value); assert.equal(f.view(id)[field], value);
                // Only that value changes: the record keeps its identity, place, state, links and history, with the one entry added.
                assert.deepEqual([now.id, now.kind, now.ownerPath, now.body, now.data.status], [was.id, was.kind, was.ownerPath, was.body, was.data.status]);
                for (const key of Object.keys(was.tracking).filter(name => ![field, 'revision', 'history', 'receipts', 'context'].includes(name))) assert.deepEqual(now.tracking[key], was.tracking[key], `${field}: ${key}`);
                assert.deepEqual(now.tracking.history.slice(0, -1), was.tracking.history); assert.equal(now.tracking.history.at(-1).operation, 'update');
            }
            const before = f.storedState();
            for (const value of ['other', values[0].toUpperCase(), ` ${values[0]}`, '', 1, true, [values[0]], {}]) {
                const result = await f.perform('update', id, { [field]: value });
                refused(result, 'INVALID_INPUT'); assert.equal(result.primary.reason, `${field} must be one of ${values.join(', ')}`);
                refused(await capture(f, 'NEW-1', kind, { [field]: value }), 'INVALID_INPUT');
            }
            assert.deepEqual(f.storedState(), before, field);
        }
        // A level, a priority level and a due date may be unset again.
        for (const [id, field] of [['AREA-1', 'level'], ['INITIATIVE-1', 'priorityLevel'], ['TASK-1', 'deadline']]) {
            assert.notEqual(f.view(id)[field], null); await f.saved('update', id, { [field]: null });
            assert.equal(f.record(id).tracking[field], null); assert.equal(f.view(id)[field], null);
        }
    }),
    test('TC-TPT-272', 'a priority level is a value of its own: the ordering number and the order of ready work stay as they were', async f => {
        await f.create('INITIATIVE-1', 'initiative');
        for (const id of ['TASK-1', 'TASK-2']) { await f.create(id, 'task', { initiativeIds: ['INITIATIVE-1'] }); await f.ready(id); }
        await f.saved('update', 'TASK-2', { priority: 1 }); await f.saved('update', 'TASK-1', { priority: 2 }); await f.saved('update', 'INITIATIVE-1', { priority: 7 });
        const ready = f.progress().ready; assert.deepEqual(ready, ['TASK-2', 'TASK-1']);
        for (const priorityLevel of ['low', 'high', null]) {
            await f.saved('update', 'INITIATIVE-1', { priorityLevel });
            const view = f.view('INITIATIVE-1'); assert.equal(view.priorityLevel, priorityLevel); assert.equal(view.priority, 7);
            assert.equal(f.record('INITIATIVE-1').data.priority, 7); assert.deepEqual(f.progress().ready, ready);
        }
    }),
    test('TC-TPT-272', 'an initiative always has one type: idea when capture omits it, and never unset', async f => {
        await f.create('PROPOSAL', 'initiative'); await f.create('FEEDBACK', 'initiative', { type: 'feedback' }); await f.create('OUTCOME', 'initiative', { type: 'initiative' });
        // Whatever its type, a captured initiative starts as a draft.
        assert.deepEqual(['PROPOSAL', 'FEEDBACK', 'OUTCOME'].map(id => [f.record(id).tracking.type, f.view(id).type, f.view(id).state]),
            [['idea', 'idea', 'draft'], ['feedback', 'feedback', 'draft'], ['initiative', 'initiative', 'draft']]);
        const before = f.storedState();
        const unset = await f.perform('update', 'FEEDBACK', { type: null });
        refused(unset, 'INVALID_INPUT'); assert.equal(unset.primary.reason, 'type cannot be unset');
        refused(await capture(f, 'NEW-1', 'initiative', { type: null }), 'INVALID_INPUT');
        assert.deepEqual(f.storedState(), before);
        // It changes to another of the three, and nothing else of the record changes with it.
        const outcome = f.record('OUTCOME'); await f.saved('update', 'OUTCOME', { type: 'idea' }); const retyped = f.record('OUTCOME');
        assert.equal(retyped.tracking.type, 'idea'); assert.equal(retyped.data.status, 'draft');
        for (const key of ['priorityLevel', 'deadline', 'links', 'criteria', 'assigneeId']) assert.deepEqual(retyped.tracking[key], outcome.tracking[key], key);
        // A record written by hand without a type is named as invalid; it is not given one and cannot be saved over.
        const untyped = f.write('work/initiatives/UNTYPED.md', `---\nid: UNTYPED\ntitle: Written by hand\nintent: A proposal\nstatus: draft\ntracking: ${JSON.stringify({ schemaVersion: 3, revision: 1, kind: 'initiative' })}\n---\n`);
        const bytes = fs.readFileSync(untyped); const read = f.progress();
        assert.equal(read.coverage, 'partial'); assert.ok(read.diagnostics.some(item => item.itemId === 'UNTYPED' && item.code === 'INVALID_RECORD' && item.reason === 'type is missing'));
        assert.equal(read.items.find(item => item.id === 'UNTYPED').type, null);
        refused(await f.perform('update', 'UNTYPED', { title: 'Saved over' }), 'INVALID_RECORD'); assert.deepEqual(fs.readFileSync(untyped), bytes);
    }),
    test('TC-TPT-076', 'a record moves only within the lifecycle of its own kind', async f => {
        // The current version, whose delivery lifecycle holds every state.
        f.declareVersion(4);
        const { patchRecord } = require('../../lib/task-artifact-store.cjs');
        // The three lifecycles and the kinds that move through each, written out.
        const lifecycles = { delivery: ['draft', 'planned', 'ready', 'in_progress', 'blocked', 'implemented', 'verifying', 'done', 'canceled'],
            tracker: ['draft', 'approved', 'committed', 'done', 'canceled'], area: ['active', 'canceled'] };
        const kinds = { task: 'delivery', story: 'delivery', subtask: 'delivery', initiative: 'tracker', area: 'area' };
        const every = [...new Set(Object.values(lifecycles).flat())]; const person = { canCorrectState: true };
        for (const [kind, lifecycle] of Object.entries(kinds)) {
            const id = `RECORD-${kind}`; await f.create(id, kind);
            // A new record starts in the first state of its own lifecycle.
            const view = f.view(id); assert.equal(view.lifecycle, lifecycle); assert.equal(view.state, lifecycles[lifecycle][0]);
            const before = f.bytes(id);
            for (const state of every.filter(value => !lifecycles[lifecycle].includes(value))) {
                refused(await f.perform('transition', id, { state, reason: 'Stated reason' }), 'INVALID_TRANSITION');
                // Nor by a correction: it places a record in another state of its own lifecycle only.
                refused(await f.perform('transition', id, { state, correction: true, reason: 'Recorded state was wrong' }, {}, person), 'INVALID_TRANSITION');
            }
            assert.deepEqual(f.bytes(id), before, kind);
        }
        // A state of another lifecycle written by hand is named, shown as written and never moved from by a save.
        const task = f.record('RECORD-task'); f.write(task.ownerPath, patchRecord(task, { status: 'approved' }, task.tracking).bytes);
        const foreign = f.bytes('RECORD-task'); const read = f.progress();
        assert.equal(read.coverage, 'partial'); assert.ok(read.diagnostics.some(item => item.itemId === 'RECORD-task' && item.code === 'UNSUPPORTED' && /unsupported recorded state/.test(item.reason)));
        assert.equal(read.items.find(item => item.id === 'RECORD-task').state, 'approved');
        refused(await f.perform('transition', 'RECORD-task', { state: 'planned' }), 'UNSUPPORTED'); assert.deepEqual(f.bytes('RECORD-task'), foreign);
    }),
    test('TC-TPT-076', 'an area is active until a person cancels it with a reason', async f => {
        await f.create('PRODUCT', 'area', { level: 'product' }); await f.create('FEATURE', 'area', { level: 'feature', areaIds: ['PRODUCT'] });
        await f.create('TASK-1', 'task', { areaIds: ['FEATURE'] }); await f.create('TASK-2', 'task', { areaIds: ['FEATURE'] }); await f.accepted('TASK-1');
        assert.equal(f.view('FEATURE').state, 'active');
        const scopes = ['FEATURE', 'PRODUCT', undefined]; const figures = () => scopes.map(scopeId => f.progress({ scopeId }).metrics);
        const before = f.bytes('FEATURE'); const stated = figures(); const tasks = new Map(['TASK-1', 'TASK-2'].map(id => [id, f.bytes(id)]));
        assert.deepEqual(stated.map(metrics => [metrics.total, metrics.accepted]), [[2, 1], [2, 1], [2, 1]]);
        for (const patch of [{ state: 'canceled' }, { state: 'canceled', reason: '' }, { state: 'canceled', reason: '   ' }]) {
            const result = await f.perform('transition', 'FEATURE', patch); refused(result, 'INVALID_INPUT'); assert.match(result.primary.reason, /needs a reason/);
        }
        assert.deepEqual(f.bytes('FEATURE'), before);
        // The decision authority belongs to initiatives: an area needs the reason alone.
        await f.saved('transition', 'FEATURE', { state: 'canceled', reason: 'Merged into the product' }, {}, { canDecide: false });
        const entry = f.record('FEATURE').tracking.history.at(-1);
        assert.deepEqual([entry.operation, entry.beforeState, entry.afterState, entry.reason, entry.actor], ['transition', 'active', 'canceled', 'Merged into the product', 'owner']);
        assert.equal(f.view('FEATURE').state, 'canceled');
        // Canceled ends the usual steps.
        refused(await f.perform('transition', 'FEATURE', { state: 'active', reason: 'Wanted again' }), 'INVALID_TRANSITION');
        // The work keeps its tags, and every figure is what it was: for the area, the area above it and the project.
        for (const [id, bytes] of tasks) assert.deepEqual(f.bytes(id), bytes, id);
        assert.deepEqual(figures(), stated);
        // A cancellation made by mistake is undone by a correction, under its own authority.
        await f.saved('transition', 'FEATURE', { state: 'active', correction: true, reason: 'Canceled by mistake' }, {}, { canCorrectState: true });
        assert.equal(f.view('FEATURE').state, 'active'); assert.deepEqual(figures(), stated);
    }),
    test('TC-TPT-275', 'an initiative moves from draft to approved to committed to done, reopens to committed, and is canceled from any state but done', async f => {
        // The whole table, written out, and the steps that bring a new initiative to each state.
        const steps = { draft: ['approved', 'canceled'], approved: ['committed', 'canceled'], committed: ['done', 'canceled'], done: ['committed'], canceled: [] };
        const reach = { draft: [], approved: ['approved'], committed: ['approved', 'committed'], done: ['approved', 'committed', 'done'], canceled: ['canceled'] };
        for (const [from, allowed] of Object.entries(steps)) for (const to of Object.keys(steps)) {
            const id = `INITIATIVE-${from}-${to}`; await f.create(id, 'initiative');
            for (const state of reach[from]) await f.saved('transition', id, { state, reason: 'Decided' });
            const before = f.record(id); assert.equal(before.data.status, from);
            const result = await f.perform('transition', id, { state: to, reason: 'Decided at the review' });
            if (allowed.includes(to)) {
                assert.equal(result.primary.status, 'saved', `${from} to ${to}`);
                // Each step is recorded with who took it, when and why.
                const after = f.record(id); const entry = after.tracking.history.at(-1);
                assert.equal(after.data.status, to); assert.deepEqual(after.tracking.history.slice(0, -1), before.tracking.history);
                assert.deepEqual([entry.operation, entry.beforeState, entry.afterState, entry.actor, entry.reason], ['transition', from, to, 'owner', 'Decided at the review']);
                assert.match(entry.at, /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/);
            } else {
                refused(result, 'INVALID_TRANSITION'); assert.deepEqual(f.bytes(id), before.bytes, `${from} to ${to}`);
            }
        }
    }),
    test('TC-TPT-275', 'every usual step of an initiative is a person\'s decision; approval needs stated intent, and closing, canceling and reopening need a reason', async f => {
        const undecided = { canDecide: false };
        const denied = async (id, patch, authority, code, reason) => {
            const before = f.bytes(id); const result = await f.perform('transition', id, patch, {}, authority);
            refused(result, code); assert.match(result.primary.reason, reason); assert.deepEqual(f.bytes(id), before);
        };
        const decision = /explicit decision by a person/; const why = /needs a reason/;
        // No assignee, readiness, proof or acceptance is asked of an initiative: only the decision, and the reason where one is due.
        await f.create('INITIATIVE-1', 'initiative'); assert.equal(f.record('INITIATIVE-1').tracking.assigneeId, null);
        await denied('INITIATIVE-1', { state: 'approved' }, undecided, 'NOT_PERMITTED', decision);
        await denied('INITIATIVE-1', { state: 'canceled', reason: 'Dropped' }, undecided, 'NOT_PERMITTED', decision);
        // The authority is asked before the reason: with neither, the answer is the missing decision.
        await denied('INITIATIVE-1', { state: 'canceled' }, undecided, 'NOT_PERMITTED', decision);
        await denied('INITIATIVE-1', { state: 'approved', readiness: { reviewed: true, decisionsResolved: true } }, {}, 'INVALID_INPUT', /readiness applies to delivery work only/);
        await f.saved('transition', 'INITIATIVE-1', { state: 'approved' });
        await denied('INITIATIVE-1', { state: 'committed' }, undecided, 'NOT_PERMITTED', decision);
        await f.saved('transition', 'INITIATIVE-1', { state: 'committed' });
        for (const patch of [{ state: 'done' }, { state: 'done', reason: '' }, { state: 'done', reason: '   ' }]) await denied('INITIATIVE-1', patch, {}, 'INVALID_INPUT', why);
        await denied('INITIATIVE-1', { state: 'done', reason: 'Outcome reached' }, undecided, 'NOT_PERMITTED', decision);
        await f.saved('transition', 'INITIATIVE-1', { state: 'done', reason: 'Outcome reached' });
        await denied('INITIATIVE-1', { state: 'committed' }, {}, 'INVALID_INPUT', why);
        await denied('INITIATIVE-1', { state: 'committed', reason: 'More to do' }, undecided, 'NOT_PERMITTED', decision);
        await f.saved('transition', 'INITIATIVE-1', { state: 'committed', reason: 'More to do' });
        await denied('INITIATIVE-1', { state: 'canceled' }, {}, 'INVALID_INPUT', why);
        await f.saved('transition', 'INITIATIVE-1', { state: 'canceled', reason: 'Dropped' });
        // A correction is a decision already, under its own authority: it needs that authority and never the other.
        const correction = { state: 'draft', correction: true, reason: 'Canceled by mistake' };
        await denied('INITIATIVE-1', correction, { canDecide: true }, 'NOT_PERMITTED', /explicit action by a person/);
        await f.saved('transition', 'INITIATIVE-1', correction, {}, { canCorrectState: true, canDecide: false });
        assert.equal(f.record('INITIATIVE-1').data.status, 'draft');
        // Approval needs stated intent. Capture always states one, so the record without it is one adopted from existing content.
        f.write('work/initiatives/INITIATIVE-2.md', '---\nid: INITIATIVE-2\ntitle: Existing proposal\nstatus: draft\n---\nAuthored body retained.\n');
        const adoption = f.request('adopt', 'INITIATIVE-2', {}); const preview = await f.core.executeOperation({ ...adoption, preview: true }, f.authority());
        assert.equal((await f.core.executeOperation({ ...adoption, previewToken: preview.previewToken }, f.authority())).primary.status, 'saved');
        await denied('INITIATIVE-2', { state: 'approved' }, {}, 'NOT_READY', /intent/);
        await f.saved('update', 'INITIATIVE-2', { intent: 'Let an operator export a selected subset' }); await f.saved('transition', 'INITIATIVE-2', { state: 'approved' });
        assert.equal(f.view('INITIATIVE-2').state, 'approved');
    }),
    test('TC-TPT-076', 'a correction places an initiative at approved, committed or done only with the intent approval requires, and needs no decision authority beside its own', async f => {
        // Capture always states an intent, so a record without one is one adopted from existing content.
        const adopt = async (relative, id, status) => {
            f.write(relative, `---\nid: ${id}\ntitle: Existing content\nstatus: ${status}\n---\nAuthored body retained.\n`);
            const adoption = f.request('adopt', id, {}); const preview = await f.core.executeOperation({ ...adoption, preview: true }, f.authority());
            assert.equal((await f.core.executeOperation({ ...adoption, previewToken: preview.previewToken }, f.authority())).primary.status, 'saved');
        };
        // The correction authority alone: no decision authority is held anywhere in this case unless stated.
        const person = { canCorrectState: true, canDecide: false };
        const correct = (id, state, authority = person) => f.perform('transition', id, { state, correction: true, reason: 'Recorded state was wrong' }, {}, authority);
        await adopt('work/initiatives/UNSTATED.md', 'UNSTATED', 'draft'); assert.equal(f.view('UNSTATED').intent, '');
        const before = f.storedState();
        for (const state of ['approved', 'committed', 'done']) {
            const result = await correct('UNSTATED', state); refused(result, 'NOT_READY'); assert.match(result.primary.reason, /captured intent/, state);
            // Holding the decision authority as well changes nothing: what is missing is the intent.
            refused(await correct('UNSTATED', state, { canCorrectState: true, canDecide: true }), 'NOT_READY');
        }
        assert.deepEqual(f.storedState(), before);
        // The states that come before approval or end without it ask for no intent.
        for (const state of ['canceled', 'draft']) assert.equal((await correct('UNSTATED', state)).primary.status, 'saved', state);
        // With its intent stated, the same corrections are saved, each recorded with who placed it and why: draft straight
        // to committed, then done, then back to approved.
        await f.saved('update', 'UNSTATED', { intent: 'Let an operator export a selected subset' });
        for (const [from, state] of [['draft', 'committed'], ['committed', 'done'], ['done', 'approved']]) {
            assert.equal((await correct('UNSTATED', state)).primary.status, 'saved', state);
            const entry = f.record('UNSTATED').tracking.history.at(-1);
            assert.deepEqual([f.record('UNSTATED').data.status, entry.operation, entry.beforeState, entry.afterState, entry.actor, entry.reason], [state, 'transition', from, state, 'owner', 'Recorded state was wrong']);
        }
        // Its own authority is all a correction needs, and nothing else stands in for it.
        const placed = f.bytes('UNSTATED');
        refused(await correct('UNSTATED', 'draft', { canDecide: true }), 'NOT_PERMITTED'); assert.deepEqual(f.bytes('UNSTATED'), placed);
        // An area holds no such fact: canceled by mistake, it is active again with a reason alone, stated intent or not.
        await adopt('work/areas/PLACE.md', 'PLACE', 'active'); assert.equal(f.view('PLACE').intent, '');
        await f.saved('transition', 'PLACE', { state: 'canceled', reason: 'Merged elsewhere' }, {}, { canDecide: false });
        const canceled = f.bytes('PLACE');
        const unexplained = await f.perform('transition', 'PLACE', { state: 'active', correction: true }, {}, person);
        refused(unexplained, 'INVALID_INPUT'); assert.match(unexplained.primary.reason, /needs a reason/); assert.deepEqual(f.bytes('PLACE'), canceled);
        assert.equal((await correct('PLACE', 'active')).primary.status, 'saved'); assert.equal(f.view('PLACE').state, 'active');
    }),
    test('TC-TPT-275', 'a closed initiative is reopened before its intent or criteria change, in words about its closing, and accepted work keeps the words about its delivered scope', async f => {
        await f.create('INITIATIVE-1', 'initiative'); await f.committed('INITIATIVE-1'); await f.saved('transition', 'INITIATIVE-1', { state: 'done', reason: 'Outcome reached' });
        await f.create('TASK-1'); await f.accepted('TASK-1');
        const before = f.storedState();
        for (const patch of [{ intent: 'A changed outcome' }, { criteria: [{ id: 'changed', text: 'A changed criterion' }] }]) {
            // An initiative is closed by a decision: nothing of it was accepted, and it has no delivered scope.
            const closed = await f.perform('update', 'INITIATIVE-1', patch);
            refused(closed, 'REOPEN_REQUIRED'); assert.equal(closed.primary.reason, 'Reopen the closed initiative before changing its intent or criteria');
            const accepted = await f.perform('update', 'TASK-1', patch);
            refused(accepted, 'REOPEN_REQUIRED'); assert.equal(accepted.primary.reason, 'Reopen accepted work before changing its delivered scope');
        }
        assert.deepEqual(f.storedState(), before);
        // Once reopened, the initiative takes the change.
        await f.saved('transition', 'INITIATIVE-1', { state: 'committed', reason: 'More to do' });
        await f.saved('update', 'INITIATIVE-1', { intent: 'A changed outcome' }); assert.equal(f.view('INITIATIVE-1').intent, 'A changed outcome');
    }),
    test('TC-TPT-275', 'an initiative closes while linked tasks are open and never closes by itself', async f => {
        await f.create('CLOSED-EARLY', 'initiative'); await f.create('FULLY-DELIVERED', 'initiative');
        await f.create('TASK-open', 'task', { initiativeIds: ['CLOSED-EARLY'] }); await f.create('TASK-accepted', 'task', { initiativeIds: ['FULLY-DELIVERED'] });
        await f.committed('CLOSED-EARLY'); await f.committed('FULLY-DELIVERED');
        // Closing is a person's decision, not a derived state: the open task and the figure stay as they are, in plain view.
        const open = f.bytes('TASK-open');
        await f.saved('transition', 'CLOSED-EARLY', { state: 'done', reason: 'Outcome reached without the last task' });
        const closed = f.progress({ scopeId: 'CLOSED-EARLY' });
        assert.equal(closed.items.find(item => item.id === 'CLOSED-EARLY').state, 'done');
        assert.deepEqual([closed.metrics.total, closed.metrics.accepted, closed.metrics.remaining, closed.metrics.percentage], [1, 0, 1, 0]);
        assert.deepEqual(f.bytes('TASK-open'), open); assert.equal(f.view('TASK-open').state, 'draft');
        // Every linked task accepted: the initiative stays where a person left it, its record untouched.
        const committed = f.bytes('FULLY-DELIVERED'); await f.accepted('TASK-accepted');
        const delivered = f.progress({ scopeId: 'FULLY-DELIVERED' });
        assert.deepEqual([delivered.metrics.total, delivered.metrics.accepted, delivered.metrics.percentage], [1, 1, 100]);
        assert.equal(delivered.items.find(item => item.id === 'FULLY-DELIVERED').state, 'committed'); assert.deepEqual(f.bytes('FULLY-DELIVERED'), committed);
    }),
    test('TC-TPT-077', 'proof and acceptance apply to delivery work only: both are refused on an initiative and on an area', async f => {
        await f.create('INITIATIVE-1', 'initiative'); await f.create('AREA-1', 'area');
        await f.create('TASK-1', 'task', { areaIds: ['AREA-1'], initiativeIds: ['INITIATIVE-1'] });
        // In every open state of the initiative.
        for (const state of [null, 'approved', 'committed']) {
            if (state) await f.saved('transition', 'INITIATIVE-1', { state });
            for (const id of ['INITIATIVE-1', 'AREA-1']) {
                const before = f.bytes(id);
                // The proof is well formed and names this record's own criteria, so only the record's kind refuses it.
                const proof = await f.perform('proof', id, { proof: f.proof(id) }); refused(proof, 'NOT_APPLICABLE'); assert.match(proof.primary.reason, /delivery work only/);
                const accept = await f.perform('accept', id, { reason: 'Requested acceptance' }); refused(accept, 'NOT_APPLICABLE'); assert.match(accept.primary.reason, /delivery work only/);
                assert.deepEqual(f.bytes(id), before); assert.deepEqual(f.record(id).tracking.proofs, []); assert.equal(f.view(id).acceptance.accepted, false);
            }
        }
        // An initiative is closed by its own step, which is no acceptance and earns no delivery credit.
        await f.saved('transition', 'INITIATIVE-1', { state: 'done', reason: 'Outcome reached' });
        assert.equal(f.view('INITIATIVE-1').acceptance.accepted, false); assert.equal(f.progress().metrics.accepted, 0);
        // Delivery work is proved and accepted as before.
        await f.accepted('TASK-1'); assert.equal(f.progress().metrics.accepted, 1);
    }),
    test('TC-TPT-127', 'automatic upkeep never tags work and never changes the state of an initiative or an area', async f => {
        await f.create('INITIATIVE-1', 'initiative'); await f.create('AREA-1', 'area'); await f.create('TASK-1');
        const linked = { automatic: true, linkedItemIds: ['INITIATIVE-1', 'AREA-1', 'TASK-1'] };
        const before = f.storedState();
        // Every state upkeep may record for delivery work, and the next steps of the two lifecycles themselves.
        for (const id of ['INITIATIVE-1', 'AREA-1']) for (const state of ['in_progress', 'blocked', 'verifying', 'approved', 'canceled']) {
            const patch = { state, reason: 'Observed at a checkpoint' };
            refused(await f.perform('transition', id, patch, {}, { ...linked, observedTransition: patch }), 'NOT_PERMITTED');
        }
        const moved = await f.perform('transition', 'INITIATIVE-1', { state: 'verifying' }, {}, { ...linked, observedTransition: { state: 'verifying' } });
        refused(moved, 'NOT_PERMITTED'); assert.match(moved.primary.reason, /never changes the state of an initiative or an area/);
        for (const patch of [{ areaIds: ['AREA-1'] }, { initiativeIds: ['INITIATIVE-1'] }, { areaIds: [] }]) refused(await f.perform('tag', 'TASK-1', patch, {}, linked), 'NOT_PERMITTED');
        assert.deepEqual(f.storedState(), before);
        // With upkeep off or only observing, the same requests are skipped, not saved.
        for (const mode of ['off', 'observe']) {
            f.config.taskTracking.mode = mode; f.saveConfig(); const stored = f.storedState();
            assert.equal((await f.perform('transition', 'INITIATIVE-1', { state: 'approved' }, {}, { ...linked, observedTransition: { state: 'approved' } })).primary.status, 'skipped');
            assert.equal((await f.perform('tag', 'TASK-1', { areaIds: ['AREA-1'] }, {}, linked)).primary.status, 'skipped');
            // Reading a scope does not depend on the upkeep mode.
            assert.equal(f.progress({ scopeId: 'AREA-1' }).scope.kind, 'area');
            assert.deepEqual(f.storedState(), stored);
        }
        // A person does both.
        f.config.taskTracking.mode = 'linked'; f.saveConfig();
        await f.tag('TASK-1', { areaIds: ['AREA-1'] }); await f.saved('transition', 'INITIATIVE-1', { state: 'approved' });
        assert.equal(f.view('INITIATIVE-1').state, 'approved');
    }),
    test('TC-TPT-278', 'a record is overdue only while its due date is before the read date and it is still open', async f => {
        const { overdue } = require('../../lib/task-tracking-policy.cjs');
        // Tasks, supporting work and initiatives may carry a due date.
        const kinds = ['task', 'story', 'subtask', 'initiative']; const moments = [['past', -1], ['today', 0], ['future', 1]];
        for (const kind of kinds) for (const when of ['past', 'today', 'future', 'undated']) await f.create(`${kind}-${when}`, kind);
        const { date, read } = await readWithinOneDate(f, async today => {
            for (const kind of kinds) for (const [when, days] of moments) await f.saved('update', `${kind}-${when}`, { deadline: shiftDate(today, days) });
        });
        // Every read states the date, and marks the record only when the date has passed: not on the day itself.
        for (const kind of kinds) {
            const [past, today, future, undated] = ['past', 'today', 'future', 'undated'].map(when => read.items.find(item => item.id === `${kind}-${when}`));
            assert.deepEqual([past.deadline, today.deadline, future.deadline, undated.deadline], [shiftDate(date, -1), date, shiftDate(date, 1), null], kind);
            assert.deepEqual([past.overdue, today.overdue, future.overdue, undated.overdue], [true, false, false, false], kind);
        }
        // The same boundary with the read date stated: the day before and the day itself are not late, the day after is.
        const stored = f.record('task-past'); const deadline = stored.tracking.deadline;
        assert.deepEqual([shiftDate(deadline, -1), deadline, shiftDate(deadline, 1)].map(day => overdue(stored, day)), [false, false, true]);
        // Still open: done, canceled and retired work is not overdue; restored or reopened, it is again.
        const late = id => f.view(id).overdue;
        await f.accepted('task-past'); assert.equal(late('task-past'), false);
        await f.saved('transition', 'task-past', { state: 'in_progress', reason: 'Explicit follow-up work' }); assert.equal(late('task-past'), true);
        await f.saved('transition', 'story-past', { state: 'canceled', reason: 'No longer requested' }); assert.equal(late('story-past'), false);
        for (const id of ['subtask-past', 'initiative-past']) {
            await f.saved('retire', id, { reason: 'Set aside' }); assert.equal(late(id), false, id);
            await f.saved('restore', id, { reason: 'Taken up again' }); assert.equal(late(id), true, id);
        }
        await f.committed('initiative-past'); assert.equal(late('initiative-past'), true);
        await f.saved('transition', 'initiative-past', { state: 'done', reason: 'Outcome reached' }); assert.equal(late('initiative-past'), false);
        await f.saved('transition', 'initiative-past', { state: 'committed', reason: 'More to do' }); assert.equal(late('initiative-past'), true);
        await f.saved('transition', 'initiative-past', { state: 'canceled', reason: 'Dropped' }); assert.equal(late('initiative-past'), false);
    }),
    test('TC-TPT-278', 'one read judges every record against the same UTC day even when its clock crosses midnight between records', async f => {
        await f.create('DATED-A', 'task', { deadline: '2030-06-01' });
        await f.create('DATED-B', 'task', { deadline: '2030-06-01' });
        const policy = require('../../lib/task-tracking-policy.cjs');
        const RealDate = global.Date, realOverdue = policy.overdue;
        let now = RealDate.parse('2030-06-01T23:59:59.999Z'); const observed = [];
        // A real read can span midnight. Advance the clock at the record-view boundary,
        // retaining the production reader and overdue implementation rather than replacing their result.
        global.Date = class extends RealDate {
            constructor(...args) { super(...(args.length ? args : [now])); }
            static now() { return now; }
        };
        policy.overdue = (record, day) => {
            const result = realOverdue(record, day);
            observed.push({ id: record.id, day, overdue: result });
            if (observed.length === 1) now = RealDate.parse('2030-06-02T00:00:00.001Z');
            return result;
        };
        try {
            const read = f.progress();
            // The changed before/after pair must be followed by a settled retry pair: four two-record snapshots at minimum.
            assert.ok(observed.length >= 8, 'The read retries after midnight changes overdue applicability');
            assert.equal(observed.length % 2, 0, 'Every snapshot inspects both records');
            for (let offset = 0; offset < observed.length; offset += 2) {
                const snapshot = observed.slice(offset, offset + 2).sort((a, b) => a.id.localeCompare(b.id, 'en'));
                const day = offset === 0 ? '2030-06-01' : '2030-06-02';
                assert.deepEqual(snapshot, ['DATED-A', 'DATED-B'].map(id => ({ id, day, overdue: offset !== 0 })), 'One UTC day governs every record in each snapshot');
            }
            assert.deepEqual(read.items.filter(item => item.id.startsWith('DATED-')).map(item => [item.id, item.overdue]), [['DATED-A', true], ['DATED-B', true]]);
            assert.equal(new Date().toISOString().slice(0, 10), '2030-06-02', 'The clock really crossed into the next day');
        } finally { global.Date = RealDate; policy.overdue = realOverdue; }
    }),
    test('TC-TPT-278', 'a due date that is no calendar date is refused', async f => {
        const notDates = ['2027-02-29', '2026-02-30', '2026-04-31', '2026-13-01', '2026-00-10', '2026-1-1', '01/02/2026', '2026-01-01T00:00:00.000Z', ' 2026-01-01', 'tomorrow', '', 20260101, true, ['2026-01-01'], { date: '2026-01-01' }];
        for (const kind of ['task', 'story', 'subtask', 'initiative']) {
            // The last day of February in a leap year is a date; in any other year it is not.
            const id = `DATED-${kind}`; await f.create(id, kind, { deadline: '2028-02-29' }); assert.equal(f.view(id).deadline, '2028-02-29');
            const before = f.storedState();
            for (const deadline of notDates) {
                const result = await f.perform('update', id, { deadline });
                refused(result, 'INVALID_INPUT'); assert.equal(result.primary.reason, 'deadline must be a calendar date, YYYY-MM-DD');
                refused(await capture(f, `NEW-${kind}`, kind, { deadline }), 'INVALID_INPUT');
            }
            assert.deepEqual(f.storedState(), before, kind); assert.equal(f.view(id).deadline, '2028-02-29');
        }
    }),
    test('TC-TPT-278', 'a due date changes no count, readiness or acceptance', async f => {
        await f.create('INITIATIVE-1', 'initiative');
        for (const id of ['TASK-accepted', 'TASK-ready', 'TASK-draft', 'TASK-canceled']) await f.create(id, 'task', { initiativeIds: ['INITIATIVE-1'] });
        await f.accepted('TASK-accepted'); await f.ready('TASK-ready'); await f.saved('transition', 'TASK-canceled', { state: 'canceled', reason: 'No longer requested' });
        const facts = () => {
            const read = f.progress();
            return { project: read.metrics, initiative: f.progress({ scopeId: 'INITIATIVE-1' }).metrics, ready: read.ready,
                items: read.items.map(item => [item.id, item.state, item.acceptance, item.verification.status, item.prerequisiteReasons]) };
        };
        const before = facts(); assert.deepEqual([before.project.total, before.project.accepted, before.project.currentlyVerified, before.ready], [3, 1, 1, ['TASK-ready']]);
        const past = shiftDate(utcDate(), -30);
        // Long overdue, due later and due no more: the same facts each time. Accepted work takes a date without being reopened.
        for (const deadline of [past, shiftDate(utcDate(), 30), null]) {
            for (const id of ['INITIATIVE-1', 'TASK-accepted', 'TASK-ready', 'TASK-draft']) await f.saved('update', id, { deadline });
            assert.deepEqual(facts(), before, String(deadline));
            assert.deepEqual(['TASK-ready', 'TASK-draft', 'TASK-accepted'].map(id => f.view(id).overdue), [deadline === past, deadline === past, false]);
        }
    }),
    test('TC-TPT-245', 'a version 2 request is refused whole and never carried out in the current words', async f => {
        await f.create('TASK-1'); await f.create('AREA-1', 'area');
        const before = f.storedState();
        const update = f.request('update', 'TASK-1', { title: 'Sent by an older procedure' });
        // Valid in every other field, as a preview, as a capture, and naming what only the earlier vocabulary had.
        const requests = [{ ...update, schemaVersion: 2 }, { ...update, schemaVersion: 2, preview: true },
            { ...f.request('create', 'TASK-2', { title: 'Requested work', intent: 'A defined outcome' }), schemaVersion: 2 },
            { ...update, schemaVersion: 2, operation: 'group', target: { kind: 'project', itemId: 'AREA-1' }, patch: { memberItemIds: ['TASK-1'], groupRole: 'area' } }];
        for (const request of requests) {
            const draft = JSON.stringify(request); const result = await f.core.executeOperation(request, f.authority());
            refused(result, 'UNSUPPORTED'); assert.match(result.primary.reason, /earlier vocabulary \(version 2\).*version 3 request/); assert.deepEqual(result.secondary, []);
            assert.throws(() => f.core.validateRequest(request), error => error.code === 'UNSUPPORTED');
            assert.equal(JSON.stringify(request), draft);
        }
        // Any version that is not one of the current structure is unsupported as well.
        for (const schemaVersion of [1, 5, '3', '4', null]) refused(await f.core.executeOperation({ ...update, schemaVersion }, f.authority()), 'UNSUPPORTED');
        assert.deepEqual(f.storedState(), before); assert.equal(f.core.REQUEST_VERSION, 3);
        // The same change in the current words is saved.
        assert.equal((await f.core.executeOperation(update, f.authority())).primary.status, 'saved');
    }),
    test('TC-TPT-245', 'the group operation and the kinds of an earlier vocabulary are refused', async f => {
        await f.create('AREA-1', 'area'); await f.create('TASK-1');
        const before = f.storedState();
        assert.equal(Object.hasOwn(f.core.OPERATION_KEYS, 'group'), false);
        for (const patch of [{ memberItemIds: ['TASK-1'] }, { groupRole: 'area' }, {}]) {
            const request = { ...f.request('update', 'AREA-1', patch), operation: 'group' };
            refused(await f.core.executeOperation(request, f.authority()), 'UNSUPPORTED');
            assert.throws(() => f.core.validateRequest(request), error => error.code === 'UNSUPPORTED');
        }
        // A kind of an earlier vocabulary is no target, for capture or for any other operation.
        for (const kind of ['project', 'vision', 'pbi', 'epic', 'idea']) {
            refused(await capture(f, `NEW-${kind}`, kind), 'INVALID_INPUT');
            refused(await f.core.executeOperation({ ...f.request('update', 'AREA-1', { title: 'Renamed' }), target: { kind, itemId: 'AREA-1' } }, f.authority()), 'INVALID_INPUT');
        }
        // A member list and a group purpose are no field of any operation.
        for (const [operation, id] of [['update', 'AREA-1'], ['tag', 'TASK-1'], ['link', 'TASK-1']]) for (const patch of [{ memberItemIds: ['TASK-1'] }, { groupRole: 'area' }])
            refused(await f.perform(operation, id, patch), 'INVALID_INPUT');
        for (const patch of [{ memberItemIds: ['TASK-1'] }, { groupRole: 'area' }]) refused(await capture(f, 'NEW-area', 'area', patch), 'INVALID_INPUT');
        assert.deepEqual(f.storedState(), before); assert.deepEqual(f.records().map(record => record.id).sort(), ['AREA-1', 'TASK-1']);
    }),
    test('TC-TPT-245', 'the catalogue offers fourteen operations and its transition entry carries the decision flag', async f => {
        const operations = ['create', 'update', 'adopt', 'assign', 'link', 'tag', 'transition', 'proof', 'accept', 'retire', 'restore', 'activity', 'attest', 'delete'];
        const catalogue = f.core.operationCatalogue(f.config);
        assert.equal(catalogue.operations.length, 14); assert.deepEqual(catalogue.operations.map(value => value.name), operations);
        assert.deepEqual(Object.keys(f.core.OPERATION_KEYS), operations);
        assert.equal(catalogue.request.schemaVersion, 3); assert.deepEqual(catalogue.kinds, ['initiative', 'task', 'story', 'subtask', 'area']);
        // Approving, committing, closing, canceling or reopening an initiative is an explicit action, listed beside the correction flag.
        assert.deepEqual(catalogue.operations.find(value => value.name === 'transition').cli, { available: true, correctionFlag: '--change-state', decisionFlag: '--decide' });
        for (const value of catalogue.operations.filter(value => value.name !== 'transition')) assert.equal(Object.hasOwn(value.cli, 'decisionFlag'), false, value.name);
        // The portable profile offers each operation as a capability: tagging is among them and grouping is not.
        assert.deepEqual(f.progress().profile.capabilities, ['inspect', ...operations, 'report']);
    }),
    test('TC-TPT-232', 'one selector names an exact area or initiative and the read states that scope alone', async f => {
        await f.create('PRODUCT', 'area', { level: 'product' }); await f.create('FEATURE', 'area', { level: 'feature', areaIds: ['PRODUCT'] });
        await f.create('OUTCOME', 'initiative', { type: 'initiative' }); await f.create('FOLLOW-ON', 'initiative', { initiativeIds: ['OUTCOME'] });
        await f.create('TASK-1', 'task', { areaIds: ['FEATURE'], initiativeIds: ['OUTCOME'] }); await f.create('TASK-2', 'task', { areaIds: ['PRODUCT'] });
        await f.create('TASK-3', 'task', { initiativeIds: ['FOLLOW-ON'] }); await f.create('SUBTASK-1', 'subtask', { areaIds: ['FEATURE'] });
        const project = f.progress(); const area = f.progress({ scopeId: 'PRODUCT' }); const initiative = f.progress({ scopeId: 'OUTCOME' });
        // No selector: the whole project, which also holds the work that has no area.
        assert.equal(project.scope.kind, 'project'); assert.equal(Object.hasOwn(project.scope, 'itemId'), false); assert.deepEqual(project.metrics.scope, { kind: 'project' });
        assert.deepEqual(project.scope.taskIds, ['TASK-1', 'TASK-2', 'TASK-3']); assert.deepEqual(project.scope.childAreaIds, ['PRODUCT']);
        // An area: everything tagged to it or to an area beneath it, the area itself left out.
        assert.deepEqual([area.scope.kind, area.scope.itemId], ['area', 'PRODUCT']); assert.deepEqual(area.metrics.scope, { kind: 'area', itemId: 'PRODUCT' });
        assert.deepEqual(area.scope.memberIds, ['FEATURE', 'SUBTASK-1', 'TASK-1', 'TASK-2']); assert.deepEqual(area.scope.taskIds, ['TASK-1', 'TASK-2']);
        assert.deepEqual(area.scope.childAreaIds, ['FEATURE']); assert.equal(area.metrics.total, 2);
        // An initiative: what links to it directly and nothing beneath that.
        assert.deepEqual([initiative.scope.kind, initiative.scope.itemId], ['initiative', 'OUTCOME']); assert.deepEqual(initiative.metrics.scope, { kind: 'initiative', itemId: 'OUTCOME' });
        assert.deepEqual(initiative.scope.memberIds, ['FOLLOW-ON', 'TASK-1']); assert.deepEqual(initiative.scope.taskIds, ['TASK-1']);
        assert.deepEqual(initiative.scope.childAreaIds, []); assert.equal(initiative.metrics.total, 1);
        // Whatever the scope, the read is complete and still lists every record of the project.
        for (const read of [project, area, initiative]) { assert.equal(read.coverage, 'complete'); assert.equal(read.items.length, 8); }
        // The selector has one name: an option under any other word selects nothing and the read is the project's.
        assert.deepEqual(f.progress({ groupId: 'PRODUCT' }).scope, project.scope);
    }),
    test('TC-TPT-232', 'an unknown or wrong-kind selector gives an unavailable scope and no figure', async f => {
        await f.create('AREA-1', 'area'); await f.create('INITIATIVE-1', 'initiative');
        await f.create('TASK-1', 'task', { areaIds: ['AREA-1'], initiativeIds: ['INITIATIVE-1'] }); await f.create('STORY-1', 'story', { areaIds: ['AREA-1'] }); await f.create('SUBTASK-1', 'subtask');
        const before = f.storedState(); assert.equal(f.progress({ scopeId: 'AREA-1' }).metrics.total, 1);
        // A record that is neither an area nor an initiative, an identity no record has, and a known identity in other letter case.
        for (const scopeId of ['TASK-1', 'STORY-1', 'SUBTASK-1', 'MISSING', 'area-1']) {
            const read = f.progress({ scopeId });
            assert.equal(read.coverage, 'unavailable'); assert.equal(read.metrics, null);
            assert.deepEqual(read.scope, { kind: null, itemId: scopeId, memberIds: [], taskIds: [], eligibleTaskIds: [], excludedTaskIds: [], childAreaIds: [], affiliations: [], coverage: 'unavailable' });
            assert.deepEqual(read.diagnostics.filter(item => item.code === 'UNAVAILABLE_SCOPE').map(item => item.itemId), [scopeId]);
            // The records are still shown; only the scope, its figures and its health are withheld.
            assert.equal(read.items.length, 5); assert.equal(read.health.status, 'unknown');
        }
        // A selector that is no exact identity selects nothing either.
        for (const scopeId of ['', 'not an identity', 7, null, ['AREA-1']]) {
            const read = f.progress({ scopeId }); assert.equal(read.coverage, 'unavailable'); assert.equal(read.metrics, null);
            assert.deepEqual(read.items, []); assert.deepEqual(read.diagnostics.map(item => item.code), ['INVALID_INPUT']);
        }
        // Two records under one identity: the selector has no unique owner.
        f.write('work/areas/copy.md', f.bytes('AREA-1')); const ambiguous = f.progress({ scopeId: 'AREA-1' });
        assert.equal(ambiguous.coverage, 'unavailable'); assert.equal(ambiguous.metrics, null);
        assert.ok(ambiguous.diagnostics.some(item => item.code === 'UNAVAILABLE_SCOPE' && item.itemId === 'AREA-1'));
        fs.unlinkSync(path.join(f.root, 'work/areas/copy.md')); assert.deepEqual(f.storedState(), before);
    }),
    test('TC-TPT-073', 'a dependency on an initiative resolves when it is done, a dependency on an area never resolves, and each unmet prerequisite says why', async f => {
        // What an unmet prerequisite says, by what it is. Delivery work keeps the words it has always had; an open
        // initiative and an area each say what they are, and the area's reason names the way on.
        const unverified = id => `Prerequisite ${id} is unresolved or not currently verified`;
        const open = id => `Prerequisite ${id} is an initiative that is not closed as done`;
        const place = id => `Prerequisite ${id} is an area, and an area is never finished: depend on the work that is needed instead, or remove the link`;
        const readiness = { reviewed: true, decisionsResolved: true };
        await f.create('INITIATIVE-1', 'initiative'); await f.create('AREA-1', 'area'); await f.create('TASK-before');
        for (const [id, itemId] of [['TASK-after-initiative', 'INITIATIVE-1'], ['TASK-after-area', 'AREA-1'], ['TASK-after-task', 'TASK-before']]) {
            await f.create(id); await f.saved('link', id, { links: [{ relation: 'dependency', itemId }] }); await f.saved('transition', id, { state: 'planned' });
        }
        const reasons = id => f.view(id).prerequisiteReasons;
        assert.deepEqual(reasons('TASK-after-task'), [unverified('TASK-before')]);
        // Open in every state before done.
        for (const state of [null, 'approved', 'committed']) {
            if (state) await f.saved('transition', 'INITIATIVE-1', { state });
            assert.deepEqual(reasons('TASK-after-initiative'), [open('INITIATIVE-1')]);
            refused(await f.perform('transition', 'TASK-after-initiative', { state: 'ready', readiness }), 'NOT_READY');
        }
        await f.saved('transition', 'INITIATIVE-1', { state: 'done', reason: 'Outcome reached' });
        assert.deepEqual(reasons('TASK-after-initiative'), []);
        await f.saved('transition', 'TASK-after-initiative', { state: 'ready', readiness }); assert.deepEqual(f.progress().ready, ['TASK-after-initiative']);
        // Done and not retired is what resolves it. Set aside while closed, it is unresolved and no decision is awaited.
        await f.saved('retire', 'INITIATIVE-1', { reason: 'Set aside' });
        assert.ok(reasons('TASK-after-initiative').includes(unverified('INITIATIVE-1'))); assert.equal(reasons('TASK-after-initiative').includes(open('INITIATIVE-1')), false);
        assert.deepEqual(f.progress().ready, []);
        await f.saved('restore', 'INITIATIVE-1', { reason: 'Taken up again' }); assert.deepEqual(f.progress().ready, ['TASK-after-initiative']);
        // Reopened or canceled, it is an initiative that is not closed as done again.
        for (const patch of [{ state: 'committed', reason: 'More to do' }, { state: 'canceled', reason: 'Dropped' }]) {
            await f.saved('transition', 'INITIATIVE-1', patch);
            assert.ok(reasons('TASK-after-initiative').includes(open('INITIATIVE-1')), patch.state); assert.equal(reasons('TASK-after-initiative').includes(unverified('INITIATIVE-1')), false, patch.state);
            assert.deepEqual(f.progress().ready, []);
        }
        // An area is a place for work, not something that finishes: active or canceled, it never resolves.
        for (const canceled of [false, true]) {
            if (canceled) await f.saved('transition', 'AREA-1', { state: 'canceled', reason: 'Merged elsewhere' });
            assert.deepEqual(reasons('TASK-after-area'), [place('AREA-1')]);
            refused(await f.perform('transition', 'TASK-after-area', { state: 'ready', readiness }), 'NOT_READY');
        }
        // The way on that the reason names: with the link removed, nothing holds the task.
        await f.saved('link', 'TASK-after-area', { links: [] }); assert.deepEqual(reasons('TASK-after-area'), []);
        await f.saved('transition', 'TASK-after-area', { state: 'ready', readiness }); assert.ok(f.progress().ready.includes('TASK-after-area'));
    }),


    test('TC-TPT-337', 'implemented entry rejects adopted work without captured intent, preserves its record, and recovers after intent is captured', async f => {
        f.declareVersion(4);
        for (const correction of [false, true]) {
            const id = correction ? 'TASK-337-correction' : 'TASK-337-usual';
            f.write(`work/tasks/${id}.md`, `---\nid: ${id}\ntitle: Existing draft\nstatus: draft\n---\nAuthored body retained.\n`);
            const request = f.request('adopt', id, {});
            const preview = await f.core.executeOperation({ ...request, preview: true }, f.authority());
            assert.equal(preview.primary.status, 'preview');
            const adoption = await f.core.executeOperation({ ...request, previewToken: preview.previewToken }, f.authority());
            assert.equal(adoption.primary.status, 'saved');
            const before = f.storedState();
            const record = f.record(id);
            const patch = { state: 'implemented', ...(correction ? { correction: true, reason: 'Requested state correction' } : {}) };
            const authority = correction ? { canCorrectState: true } : {};
            refused(await f.perform('transition', id, patch, {}, authority), 'NOT_READY');
            assert.deepEqual(f.storedState(), before, 'refusal preserves every stored record and configuration byte');
            assert.equal(f.view(id).state, 'draft');
            assert.deepEqual(f.record(id).tracking.history, record.tracking.history);
            await f.saved('update', id, { intent: 'Export exactly the selected rows' });
            await f.saved('transition', id, patch, {}, authority);
            assert.deepEqual([f.view(id).state, f.view(id).acceptance.accepted], ['implemented', false]);
        }
    }),

    test('TC-TPT-334', 'implemented says only that the work is built and published for review: it is reached with captured intent alone, earns no acceptance, and automatic upkeep never records it', async f => {
        f.declareVersion(4);
        // No criteria, no readiness review and no responsible member: a pull request can always record what it built.
        await f.create('TASK-built', 'task', { criteria: [] });
        await f.saved('transition', 'TASK-built', { state: 'implemented' });
        const built = f.view('TASK-built');
        assert.deepEqual([built.state, built.assigneeId, built.acceptance.accepted], ['implemented', null, false]);
        assert.equal(f.progress().metrics.accepted, 0, 'implemented work counts as not accepted');
        // Reopening the persisted current-version record must allow ordinary upkeep and preserve its prior history.
        const beforeUpdate = f.record('TASK-built');
        assert.equal(f.progress().coverage, 'complete');
        await f.saved('update', 'TASK-built', { title: 'Published work remains editable' });
        const afterUpdate = f.record('TASK-built');
        assert.equal(afterUpdate.data.title, 'Published work remains editable');
        assert.equal(f.view('TASK-built').state, 'implemented');
        assert.deepEqual(afterUpdate.tracking.history.slice(0, beforeUpdate.tracking.history.length), beforeUpdate.tracking.history);
        assert.deepEqual(afterUpdate.tracking.acceptance, beforeUpdate.tracking.acceptance);
        // The same step is open from planned, ready and in progress.
        await f.create('TASK-planned'); await f.saved('transition', 'TASK-planned', { state: 'planned' });
        await f.saved('transition', 'TASK-planned', { state: 'implemented' });
        await f.create('TASK-ready'); await f.ready('TASK-ready'); await f.saved('transition', 'TASK-ready', { state: 'implemented' });
        await f.create('TASK-active'); await f.active('TASK-active'); await f.saved('transition', 'TASK-active', { state: 'implemented' });
        // Done is still reached only through acceptance, and acceptance still needs verifying work.
        refused(await f.perform('transition', 'TASK-built', { state: 'done' }), 'INVALID_TRANSITION');
        refused(await f.perform('accept', 'TASK-built', { reason: 'Looks finished' }), 'NOT_PERMITTED');
        // A person records it; linked upkeep does not.
        await f.create('TASK-auto'); await f.active('TASK-auto');
        const automatic = await f.perform('transition', 'TASK-auto', { state: 'implemented' }, {}, { automatic: true, linkedItemIds: ['TASK-auto'] });
        assert.notEqual(automatic.primary.status, 'saved'); assert.equal(f.view('TASK-auto').state, 'in_progress');
    }),
    test('TC-TPT-335', 'verification starts from implemented only with the facts verifying work always has: criteria, a reviewed readiness decision and a responsible member', async f => {
        f.declareVersion(4);
        const readiness = { reviewed: true, decisionsResolved: true };
        await f.create('TASK-built', 'task', { criteria: [] });
        await f.saved('transition', 'TASK-built', { state: 'implemented' });
        // Nothing verification needs is recorded yet, so the step out is refused and the record stays where it is.
        refused(await f.perform('transition', 'TASK-built', { state: 'verifying', readiness }), 'NOT_READY');
        await f.saved('update', 'TASK-built', { criteria: [{ id: 'AC-1', text: 'The selected rows are exported' }] });
        refused(await f.perform('transition', 'TASK-built', { state: 'verifying' }), 'NOT_READY');
        refused(await f.perform('transition', 'TASK-built', { state: 'verifying', readiness }), 'INVALID_MEMBER');
        assert.equal(f.view('TASK-built').state, 'implemented');
        await f.saved('assign', 'TASK-built', { assigneeId: 'owner' });
        await f.saved('transition', 'TASK-built', { state: 'verifying', readiness });
        // From there the usual close-out applies: current proof, then a person's acceptance.
        await f.saved('proof', 'TASK-built', { proof: f.proof('TASK-built') });
        await f.saved('accept', 'TASK-built', { reason: 'Observed criteria are accepted' });
        assert.deepEqual([f.view('TASK-built').state, f.view('TASK-built').acceptance.accepted], ['done', true]);
        // A completed record still carries implemented in its retained history: unrelated updates must not invalidate it.
        const accepted = f.record('TASK-built');
        assert.ok(accepted.tracking.history.some(entry => entry.afterState === 'implemented'));
        assert.equal(f.progress().coverage, 'complete');
        await f.saved('update', 'TASK-built', { title: 'Accepted work remains editable' });
        const updated = f.record('TASK-built');
        assert.equal(updated.data.title, 'Accepted work remains editable');
        assert.deepEqual(updated.tracking.history.slice(0, accepted.tracking.history.length), accepted.tracking.history);
        assert.deepEqual(updated.tracking.acceptance, accepted.tracking.acceptance);
        assert.deepEqual([f.view('TASK-built').state, f.progress().metrics.accepted], ['done', 1]);
    }),
    test('TC-TPT-336', 'implemented work returns to in progress under the rules for starting work and is canceled with a reason, and every read lists the state in the delivery lifecycle', async f => {
        f.declareVersion(4);
        await f.create('TASK-back', 'task', { criteria: [] });
        await f.saved('transition', 'TASK-back', { state: 'implemented' });
        refused(await f.perform('transition', 'TASK-back', { state: 'in_progress' }), 'NOT_READY');
        refused(await f.perform('transition', 'TASK-back', { state: 'canceled' }), 'INVALID_INPUT');
        await f.saved('transition', 'TASK-back', { state: 'canceled', reason: 'Superseded by other work' });
        const { vocabulary } = f.progress();
        const states = vocabulary.lifecycles.delivery.states;
        assert.ok(states.indexOf('in_progress') < states.indexOf('implemented') && states.indexOf('implemented') < states.indexOf('verifying'));
        assert.deepEqual(vocabulary.transitions.delivery.implemented, ['in_progress', 'verifying', 'canceled']);
        for (const from of ['draft', 'planned', 'ready', 'in_progress']) assert.ok(vocabulary.transitions.delivery[from].includes('implemented'), from);
        assert.ok(!vocabulary.transitions.delivery.blocked.includes('implemented'), 'blocked work resumes first');
    }),

] };
