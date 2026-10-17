'use strict';

const fs = require('node:fs');
const { TextDecoder } = require('node:util');
const { LIMITS } = require('./task-tracking-config.cjs');
const { fail, hash, scopedPath, readBytes, publishBytes, removeBytes } = require('./task-tracking-files.cjs');
const { inspectRecords, stableValue, parseRecord } = require('./task-artifact-store.cjs');
const { bindRecordContext, string } = require('./task-tracking-policy.cjs');
const { lifecycleOf } = require('./task-tracking-vocabulary.cjs');

const RECOVERY_DIRECTORY = 'tmp/task-tracking/deletions';
const recoveryPath = operationId => `${RECOVERY_DIRECTORY}/${hash(operationId)}.json`;
// The journal embeds the whole record text as a JSON string, so the record budget cannot bound it: a control character
// is one byte in the record and six once escaped. The constant covers the envelope (paths, identities, hashes, result).
const JOURNAL_BYTES = LIMITS.recordBytes * 6 + 64 * 1024;
// Links and owner paths are compared with the separator rule the path readers use, so either spelling names one file.
const slashed = value => value.replace(/\\/g, '/');

function recovery(context, request, digest) {
    let bytes;
    try { bytes = readBytes(context.root, recoveryPath(request.operationId), JOURNAL_BYTES); }
    catch (error) { if (error.code === 'ENOENT') return null; throw error; }
    let value;
    try { value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
    catch { fail('INVALID_RECOVERY', 'Deletion recovery is unreadable; preserve it for inspection'); }
    if (value.schemaVersion !== 1 || value.rootIdentity !== hash(context.root) || value.operationId !== request.operationId
        || !['prepared', 'complete'].includes(value.phase) || typeof value.original !== 'string'
        || typeof value.sourcePath !== 'string' || typeof value.expectedHash !== 'string') fail('INVALID_RECOVERY', 'Deletion recovery has no valid owner');
    if (value.digest !== digest || value.itemId !== request.target.itemId || value.kind !== request.target.kind) fail('REUSED_OPERATION', 'Operation identity was reused for a changed deletion request');
    const original = parseRecord(Buffer.from(value.original), value.sourcePath, value.kind);
    if (original.id !== value.itemId || original.contentHash !== value.expectedHash || original.revision !== request.expected.revision) fail('INVALID_RECOVERY', 'Deletion recovery does not preserve its original exact record');
    return { value, bytes };
}

function completedRecovery(context, request, digest) {
    const retained = recovery(context, request, digest);
    return retained?.value.phase === 'complete' ? { schemaVersion: 1,
        primary: { ...retained.value.primary, replayed: true }, current: null, secondary: [] } : null;
}

function finish(context, request, retained, replayed, durability) {
    const primary = { ...retained.value.primary, status: 'saved', deleted: true, replayed };
    const secondary = [];
    try {
        const complete = { ...retained.value, phase: 'complete', primary };
        publishBytes(context.root, recoveryPath(request.operationId), Buffer.from(JSON.stringify(complete)), hash(retained.bytes), JOURNAL_BYTES);
    } catch (error) { secondary.push({ kind: 'deletion-recovery', status: 'pending', code: error.code || 'IO_FAILURE', reason: 'Draft removed; completion recovery pending. Retain and retry the same request.' }); }
    return { schemaVersion: 1, primary, current: null, secondary, durability: {
        atomicUnit: 'draft-path-removal-with-prepared-recovery', cooperatingWriters: true,
        arbitraryEditorCAS: false, powerLoss: 'unproved', ...durability } };
}

// How many referencing records a refusal names before it says there are more.
const REFERENCE_NAMES = 5;

/**
 * Two explicit actions reach this owner. `canDelete` removes only an untouched record: one still in the first state of
 * its kind's lifecycle, with no assignment, links, proof, acceptance or other history. `canDeleteEnded` also removes
 * work that has already ended: canceled or retired, whatever its history. Ended work is outside every active scope,
 * so removing it changes no delivery count; open, started or accepted work must be canceled or retired first.
 * Neither action cascades: work another record still points to is refused until those links are removed.
 */
function deleteDraft(context, request, digest, authority, recordView) {
    if (authority.automatic || (authority.canDelete !== true && authority.canDeleteEnded !== true) || !string(request.patch.reason)) fail('NOT_PERMITTED', 'Draft deletion requires an explicit exact action and reason');
    const retained = recovery(context, request, digest);
    if (retained?.value.phase === 'complete') return completedRecovery(context, request, digest);
    if (retained) {
        try { readBytes(context.root, retained.value.sourcePath); }
        catch (error) { if (error.code === 'ENOENT') return finish(context, request, retained, true); throw error; }
    }
    const scan = inspectRecords(context);
    context = bindRecordContext(context, scan.records);
    if (scan.coverage !== 'complete' || context.recordAnalysis.findings.length) fail('INCOMPLETE_SCOPE', 'Deletion needs a complete unambiguous declared relationship scope');
    const matches = scan.records.filter(record => record.id === request.target.itemId && record.kind === request.target.kind);
    if (matches.length !== 1) fail('REPLAY_UNKNOWN', 'Exact draft or retained deletion receipt is unavailable; inspect current sources before recovery');
    const record = matches[0];
    if (record.revision !== request.expected.revision || record.contentHash !== request.expected.contentHash) fail('CONFLICT', 'Draft changed; preserve it and review current facts');
    const t = record.tracking;
    const ownerPath = slashed(record.ownerPath);
    // Referenced means that a link of any relation, a tag included, names this record by identity or by path.
    const referencing = scan.records.filter(other => other.id !== record.id && (other.tracking?.links || []).some(link => link.itemId === record.id
        || (typeof link.path === 'string' && slashed(link.path) === ownerPath))).map(other => other.id);
    const incoming = referencing.length > 0;
    const untouched = !(record.data.status !== lifecycleOf(record.kind).initial || !t || t.assigneeId || record.data.assigned_to || t.collaboratorIds?.length || t.retired || t.health || t.blocker
        || t.acceptanceHistory?.length || t.proofs?.length || t.activity?.length || t.links?.length
        || (t.history || []).some(entry => !['create', 'adopt', 'update'].includes(entry.operation)) || incoming);
    if (!untouched) {
        const ended = !!t && (record.data.status === 'canceled' || !!t.retired);
        if (authority.canDeleteEnded !== true || !ended) fail('USE_RETIREMENT', 'Referenced, assigned, started or historical work must be canceled or retired; no cascade');
        if (incoming) fail('REFERENCED_WORK', `Remove the links that still point to this work first; no cascade. Referenced by ${referencing.slice(0, REFERENCE_NAMES).join(', ')}${referencing.length > REFERENCE_NAMES ? ` and ${referencing.length - REFERENCE_NAMES} more` : ''}`);
    }
    // The project health owner is named by configuration, not by a record, so no record scan can see that reference.
    // It protects an untouched draft as much as ended work.
    if (context.config?.taskTracking?.healthOwnerId === record.id) fail('REFERENCED_WORK', 'This work is the configured project health owner; choose another owner first');
    const previewToken = hash(stableValue({ digest, config: context.config, owners: scan.records.map(r => [r.ownerPath, r.contentHash]).sort() }));
    // A preview of ended work states what leaves the checkout with it. An untouched record has none of these.
    const removes = untouched ? null : { state: record.data.status, retired: !!t.retired, historyEntries: (t.history || []).length, proofs: (t.proofs || []).length,
        acceptanceDecisions: (t.acceptanceHistory || []).length, links: (t.links || []).length };
    if (request.preview) return { schemaVersion: 1, primary: { status: 'preview', itemId: record.id, kind: record.kind, ...(removes ? { removes } : {}) },
        current: recordView(record, context), proposed: { ...recordView(record, context), deleted: true }, previewToken, secondary: [] };
    if (request.previewToken !== previewToken) fail('PREVIEW_REQUIRED', 'Draft deletion needs a current explicit preview');
    let prepared = retained;
    if (!prepared) {
        const value = { schemaVersion: 1, rootIdentity: hash(context.root), operationId: request.operationId, digest,
            phase: 'prepared', itemId: record.id, kind: record.kind, sourcePath: record.ownerPath,
            expectedHash: record.contentHash, original: record.text,
            primary: { status: 'pending', operationId: request.operationId, itemId: record.id, kind: record.kind, ownerPath: record.ownerPath, revision: record.revision,
                ...(removes ? { ended: true } : {}) } };
        const bytes = Buffer.from(JSON.stringify(value));
        publishBytes(context.root, recoveryPath(request.operationId), bytes, null, JOURNAL_BYTES);
        prepared = { value, bytes };
    }
    return finish(context, request, prepared, false, removeBytes(context.root, record.ownerPath, record.contentHash));
}

/**
 * Deletion recoveries that have not reached completion, by project-relative path. Read-only: nothing is repaired here.
 * A recovery that cannot be read is listed too, because it is not known to be complete.
 */
function unfinishedRecoveries(context) {
    let names;
    try { names = fs.readdirSync(scopedPath(context.root, RECOVERY_DIRECTORY)); }
    catch (error) { if (error.code === 'ENOENT') return []; throw error; }
    const unfinished = [];
    for (const name of names.filter(entry => entry.endsWith('.json')).sort()) {
        const relative = `${RECOVERY_DIRECTORY}/${name}`;
        let value = null;
        try { value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(readBytes(context.root, relative, JOURNAL_BYTES))); }
        catch { /* Listed below: unreadable is not complete. */ }
        if (value?.phase !== 'complete') unfinished.push({ path: relative, ...(typeof value?.itemId === 'string' ? { itemId: value.itemId } : {}) });
    }
    return unfinished;
}

module.exports = { recoveryPath, completedRecovery, deleteDraft, unfinishedRecoveries };
