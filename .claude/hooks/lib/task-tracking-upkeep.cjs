'use strict';

const path = require('node:path');
const { trackingContext, relativePath, MEMBER_ID } = require('./task-tracking-config.cjs');
const { fail, hash, readBytes, publishBytes } = require('./task-tracking-files.cjs');
const { inspectRecords, ITEM_ID, stableValue } = require('./task-artifact-store.cjs');
const { withTrackingLock } = require('./task-tracking-lock.cjs');
const { executeOperation, REQUEST_VERSION } = require('./task-tracking.cjs');
const { instant, string, list } = require('./task-tracking-policy.cjs');
const { resolveActor, revalidateActor, validateSelection } = require('./task-tracking-identity.cjs');
const { isPrivacySensitive } = require('./sensitive-path-policy.cjs');
const { resolveTrackingProfile } = require('./task-tracking-profile.cjs');

const PRODUCERS = Object.freeze(['feature', 'implement-spec', 'bugfix', 'fix', 'spec', 'work-item', 'initiative', 'plan', 'direct-code', 'review', 'pull-request']);
const linkPath = sessionId => {
    if (!string(sessionId, 200)) fail('INVALID_INPUT', 'Select the actual host session identity');
    return `tmp/task-tracking/links/${hash(sessionId)}.json`;
};
const policyIdentity = context => hash(stableValue({ taskTracking: context.config.taskTracking || null, artifactsRoot: context.artifactsRoot }));

function readLink(root, sessionId) {
    const context = trackingContext(root);
    try {
        const value = JSON.parse(readBytes(context.root, linkPath(sessionId), 65536).toString('utf8'));
        if (value.schemaVersion !== 1 || value.rootIdentity !== hash(context.root) || value.sessionIdentity !== hash(sessionId)
            || !PRODUCERS.includes(value.producer) || !list(value.itemIds, id => typeof id === 'string' && ITEM_ID.test(id), 64)
            || !instant(value.linkedAt) || !MEMBER_ID.test(value.actor)
            || (value.identity !== undefined && (!validateSelection(value.identity) || value.identity.actor !== value.actor))) fail('INVALID_LINK', 'Session link is malformed; relink explicitly');
        if (!value.active) return null;
        if (value.policyIdentity !== policyIdentity(context)) fail('STALE_LINK', 'Tracking configuration changed; relink explicitly');
        return value;
    } catch (error) { if (error.code === 'ENOENT') return null; if (error.code) throw error; fail('INVALID_LINK', 'Session link is unreadable; relink explicitly'); }
}

async function linkSession({ root, sessionId, actor, producer, itemIds, runId, occurrenceId, unlink = false }) {
    const context = trackingContext(root);
    if (!PRODUCERS.includes(producer) || !list(itemIds, id => typeof id === 'string' && ITEM_ID.test(id), 64)
        || new Set(itemIds).size !== itemIds.length || (!unlink && !itemIds.length)) fail('INVALID_INPUT', 'Link exact unique item identities and a declared producer');
    const selected = resolveActor(context, actor);
    actor = selected.member.id;
    if ((runId !== undefined || occurrenceId !== undefined) && (!string(runId, 120) || !string(occurrenceId, 120))) fail('INVALID_INPUT', 'Workflow linkage needs actual run and occurrence identities');
    return withTrackingLock(context.root, () => {
        const current = trackingContext(context.root);
        const currentActor = revalidateActor(current, selected.selection);
        if (!unlink) {
            const profile = resolveTrackingProfile(current);
            if (!profile.available) fail(profile.code, profile.reason);
            const scan = inspectRecords(current);
            if (scan.coverage !== 'complete' || itemIds.some(id => scan.records.filter(r => r.id === id).length !== 1)) fail('INCOMPLETE_SCOPE', 'Exact linked work is missing or ambiguous');
        }
        const relative = linkPath(sessionId);
        let expected = null;
        try { expected = hash(readBytes(context.root, relative, 65536)); } catch (error) { if (error.code !== 'ENOENT') throw error; }
        const value = { schemaVersion: 1, rootIdentity: hash(context.root), sessionIdentity: hash(sessionId), actor, producer,
            identity: currentActor.selection,
            itemIds, active: !unlink, linkedAt: new Date().toISOString(), policyIdentity: policyIdentity(current),
            ...(runId ? { context: { runId, occurrenceId } } : {}) };
        publishBytes(context.root, relative, Buffer.from(JSON.stringify(value)), expected);
        return { status: unlink ? 'unlinked' : 'linked', itemIds, mode: current.mode };
    });
}

/** Producer supplies actual primary outcome. Upkeep never changes that outcome or accepts work. */
async function checkpoint({ root, sessionId, actor, producer, checkpointId, primary, observation, context: actualContext }) {
    const secondary = [];
    try {
        if (!PRODUCERS.includes(producer) || !string(checkpointId, 120) || !primary || typeof primary !== 'object') fail('INVALID_INPUT', 'Checkpoint needs actual producer, identity and primary result');
        if (primary.status !== 'saved') return { primary, secondary: [{ kind: 'tracking', status: 'skipped', reason: 'Primary work was not saved; no optional item advancement' }] };
        const context = trackingContext(root);
        if (context.mode !== 'linked') return { primary, secondary: [{ kind: 'tracking', status: 'skipped', reason: context.mode === 'observe' ? 'Observe mode; no canonical upkeep' : 'Automatic tracking is off' }] };
        // Nothing is written to a project that is not in the current vocabulary; the primary work continues.
        if (context.vocabulary.code) return { primary, secondary: [{ kind: 'tracking', status: 'skipped', code: context.vocabulary.code, reason: context.vocabulary.reason }] };
        const link = readLink(context.root, sessionId);
        if (!link) return { primary, secondary: [{ kind: 'tracking', status: 'untracked', reason: 'Continue untracked; offer exact linking at a useful checkpoint' }] };
        actor = actor === undefined ? link.actor : actor;
        if (link.actor !== actor || link.producer !== producer) fail('NOT_PERMITTED', 'Checkpoint does not match the linked actor and producer');
        if (stableValue(link.context) !== stableValue(actualContext)) fail('NOT_PERMITTED', 'Checkpoint needs the current actual workflow context');
        if (!observation || observation.kind !== 'saved' || !instant(observation.observedAt) || !string(observation.summary)
            || !list(observation.paths, p => relativePath(p) && !isPrivacySensitive(p), 64)) fail('INVALID_INPUT', 'Checkpoint needs actual bounded saved-file observations');
        for (const relative of observation.paths) readBytes(context.root, relative);
        const scan = inspectRecords(context);
        if (scan.coverage !== 'complete') fail('INCOMPLETE_SCOPE', 'Linked scope cannot be reconciled safely');
        const hintPath = `tmp/task-tracking/hints/${hash(sessionId)}.json`;
        let hintBytes;
        try { hintBytes = readBytes(context.root, hintPath, 65536); } catch (error) { if (error.code !== 'ENOENT') throw error; }
        for (const itemId of link.itemIds) {
            const records = scan.records.filter(r => r.id === itemId);
            if (records.length !== 1) { secondary.push({ kind: 'tracking', itemId, status: 'pending', reason: 'Exact linked owner is missing or ambiguous' }); continue; }
            const record = records[0];
            if (record.tracking?.optOut) { secondary.push({ kind: 'tracking', itemId, status: 'skipped', reason: 'Item opted out of automatic upkeep' }); continue; }
            if (link.identity) revalidateActor(context, link.identity);
            let request = { schemaVersion: REQUEST_VERSION, operation: 'activity', operationId: `checkpoint-${hash(stableValue({ sessionId, producer, checkpointId, itemId })).slice(0, 48)}`,
                target: { kind: record.kind, itemId }, expected: { revision: record.revision, contentHash: record.contentHash }, actor: { memberId: actor },
                patch: { observation }, ...(link.context ? { context: link.context } : {}) };
            // Retain the original expected revision with the retry request. Rereading a
            // newer revision must not change the digest of an already applied operation.
            request = await withTrackingLock(context.root, () => {
                const current = trackingContext(context.root);
                const currentLink = readLink(current.root, sessionId);
                if (current.mode !== 'linked' || stableValue(currentLink) !== stableValue(link)) fail('STALE_LINK', 'Session linkage changed; keep the original checkpoint and relink explicitly');
                if (link.identity) revalidateActor(current, link.identity);
                const relative = `tmp/task-tracking/checkpoints/${request.operationId}.json`;
                try {
                    const retained = JSON.parse(readBytes(context.root, relative).toString('utf8'));
                    // Retained checkpoint state is disposable: one written for another request version is never replayed.
                    if (retained.schemaVersion !== request.schemaVersion) fail('STALE_LINK', 'Checkpoint state was written for the earlier vocabulary; it is disposable, relink explicitly and use a new checkpoint');
                    if (retained.operationId !== request.operationId || retained.actor?.memberId !== actor
                        || retained.target?.itemId !== itemId || stableValue(retained.patch) !== stableValue(request.patch)
                        || stableValue(retained.context) !== stableValue(request.context)) fail('REUSED_OPERATION', 'Checkpoint identity was reused for changed observations');
                    return retained;
                } catch (error) {
                    if (error.code !== 'ENOENT') throw error;
                    publishBytes(context.root, relative, Buffer.from(JSON.stringify(request)), null);
                    return request;
                }
            });
            const result = await executeOperation(request, { root: context.root, actor, identity: link.identity, canWrite: true, automatic: true,
                linkedItemIds: link.itemIds, context: link.context, observation });
            secondary.push({ kind: 'tracking', itemId, status: result.primary.status === 'refused' ? 'pending' : result.primary.status,
                result: result.primary, followups: result.secondary });
        }
        if (hintBytes && secondary.every(result => ['saved', 'skipped'].includes(result.status))) {
            await withTrackingLock(context.root, () => {
                const currentHint = readBytes(context.root, hintPath, 65536);
                if (hash(currentHint) !== hash(hintBytes)) return; // Preserve a later edit's pending reminder.
                const hint = JSON.parse(currentHint.toString('utf8'));
                publishBytes(context.root, hintPath, Buffer.from(JSON.stringify({ ...hint, pending: false })), hash(currentHint));
            });
        }
    } catch (error) { secondary.push({ kind: 'tracking', status: 'pending', code: error.code || 'IO_FAILURE', reason: 'Primary result retained; inspect linkage and retry the same checkpoint' }); }
    return { primary, secondary };
}

function observedPaths(event, root) {
    if (!event || event.hook_event_name !== 'PostToolUse' || event.tool_response?.success === false || event.tool_response?.isError === true) return [];
    const input = event.tool_input || {};
    let paths = [];
    if (['Edit', 'Write', 'MultiEdit', 'NotebookEdit'].includes(event.tool_name)) paths = [input.file_path || input.notebook_path || input.path];
    else if (event.tool_name === 'apply_patch') {
        const patch = typeof input.command === 'string' ? input.command : typeof input.patch === 'string' ? input.patch : '';
        if (Buffer.byteLength(patch) > 2 * 1024 * 1024) return [];
        paths = patch.split(/\r?\n/).flatMap(line => /^\*\*\* (?:Add File|Update File|Delete File|Move to): (.+)$/.exec(line)?.slice(1) || []);
    }
    const found = new Set();
    for (const value of paths) {
        if (typeof value !== 'string' || found.size >= 64) continue;
        const relative = path.isAbsolute(value) ? path.relative(root, value).replace(/\\/g, '/') : value.replace(/\\/g, '/');
        if (relativePath(relative) && !isPrivacySensitive(relative) && !/^(?:tmp|temp|\.agents|\.codex|\.opencode)\//.test(relative)
            && !/(?:^|\/)(?:node_modules|dist|build|vendor)\//.test(relative)) found.add(relative);
    }
    return [...found];
}

function observerHint(event, root) {
    const paths = observedPaths(event, root);
    if (!paths.length || !event.session_id) return null;
    const context = trackingContext(root);
    if (context.mode === 'off') return null;
    const link = readLink(context.root, event.session_id);
    const identity = hash(stableValue({ paths, tool: event.tool_name, link: link?.itemIds || [], mode: context.mode }));
    const relative = `tmp/task-tracking/hints/${hash(event.session_id)}.json`;
    let previous;
    try { previous = JSON.parse(readBytes(context.root, relative, 65536).toString('utf8')); } catch (error) { if (error.code !== 'ENOENT') return null; }
    if (previous?.identity === identity && previous.pending !== false) return null;
    const bytes = Buffer.from(JSON.stringify({ schemaVersion: 1, identity, pending: true, paths, observedAt: new Date().toISOString() }));
    publishBytes(context.root, relative, bytes, previous ? hash(readBytes(context.root, relative, 65536)) : null);
    return link && context.mode === 'linked'
        ? `Tracking checkpoint pending for exact linked work (${link.itemIds.length} items). Read .claude/skills/task-track/references/integration-guide.md before reconciling the actual primary result. An edit is activity, never acceptance.`
        : 'Continue untracked. At a useful checkpoint, offer exact work-item linking; no ticket is required. Read .claude/skills/task-track/references/integration-guide.md when tracking is requested.';
}

module.exports = { PRODUCERS, linkPath, readLink, linkSession, checkpoint, observedPaths, observerHint };
