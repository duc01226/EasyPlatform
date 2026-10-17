'use strict';

const { LIMITS, ITEM_ID, relativePath } = require('./task-tracking-config.cjs');
const { readProgress } = require('./task-progress-reader.cjs');
const { fail, readBytes } = require('./task-tracking-files.cjs');
const { object, LINK_ROLES } = require('./task-tracking-policy.cjs');
const { sanitized } = require('./task-tracking.cjs');
const { isPrivacySensitive } = require('./sensitive-path-policy.cjs');

const excludedPath = value => /^(?:tmp|temp|\.agents|\.codex|\.opencode)\//.test(value)
    || /(?:^|\/)(?:node_modules|dist|build|vendor)\//.test(value);
const publicPath = value => relativePath(value) && !isPrivacySensitive(value) && !excludedPath(value.replace(/\\/g, '/'));

function validateConcernQuery(query) {
    if (!object(query) || Object.keys(query).some(key => !['schemaVersion', 'itemIds', 'paths'].includes(key))) fail('INVALID_INPUT', 'Concerns accepts only schemaVersion, exact itemIds and public paths');
    if (query.schemaVersion !== 1) fail('UNSUPPORTED', 'Unsupported concern query version');
    let serialized;
    try { serialized = JSON.stringify(query); } catch { fail('INVALID_INPUT', 'Concern query must be serializable JSON'); }
    if (Buffer.byteLength(serialized) > LIMITS.recordBytes) fail('LIMIT_EXCEEDED', 'Concern query exceeds the byte budget');
    const itemIds = query.itemIds === undefined ? [] : query.itemIds;
    const paths = query.paths === undefined ? [] : query.paths;
    if (!Array.isArray(itemIds) || itemIds.some(id => typeof id !== 'string' || !ITEM_ID.test(id))) fail('INVALID_INPUT', 'Select exact item identities');
    if (!Array.isArray(paths)) fail('INVALID_INPUT', 'Select project-relative paths in an array');
    if (itemIds.length > 64 || paths.length > LIMITS.records) fail('LIMIT_EXCEEDED', 'Select at most 64 items and a bounded path scope');
    if (paths.some(value => !relativePath(value) || isPrivacySensitive(value))) fail('UNSAFE_PATH', 'Select only permitted public project-relative paths');
    const normalized = paths.map(value => value.replace(/\\/g, '/'));
    if (new Set(itemIds).size !== itemIds.length || new Set(normalized).size !== normalized.length) fail('INVALID_INPUT', 'Select each exact identity or normalized path once');
    if (!itemIds.length && !paths.length) fail('INVALID_INPUT', 'Select at least one exact item or path');
    return { schemaVersion: 1, itemIds: [...itemIds], paths: normalized };
}

function identity(item) { return { itemId: item.id, kind: item.kind, ownerPath: item.ownerPath }; }

/**
 * One walk over the snapshot serves every selection, and each selection is projected exactly as if it were the only one.
 * Findings that belong to a relationship rather than to a selection are recorded once and replayed in walk order.
 * The walk is bounded by the snapshot (records x links per record); only emitted relationships and diagnostics are capped.
 */
function projectSelections(snapshot, selections, pathStatus) {
    const owners = (snapshot.items || []).filter(item => publicPath(item.ownerPath));
    const byId = new Map();
    const byPath = new Map();
    for (const item of owners) {
        byId.set(item.id, byId.has(item.id) ? null : item);
        byPath.set(item.ownerPath.replace(/\\/g, '/'), item);
    }
    const totalRelationships = owners.reduce((sum, item) => sum + (item.links || []).length, 0);
    const diagnose = (state, value) => {
        if (state.diagnostics.length < LIMITS.records) state.diagnostics.push(value);
        else state.omittedDiagnostics++;
        if (state.coverage !== 'unavailable') state.coverage = 'partial';
    };
    // Retain reader findings, but do not expose arbitrary extra fields or raw source content.
    const inherited = (snapshot.diagnostics || []).map(finding => ({ code: finding.code,
        ...(typeof finding.itemId === 'string' && ITEM_ID.test(finding.itemId) ? { itemId: finding.itemId } : {}),
        ...(publicPath(finding.ownerPath || finding.path) ? { ownerPath: (finding.ownerPath || finding.path).replace(/\\/g, '/') } : {}),
        reason: 'Selected reader reported this diagnostic; original source coverage is retained' }));
    const selectingId = new Map();
    const selectingPath = new Map();
    const select = (index, key, state) => { if (index.has(key)) index.get(key).push(state); else index.set(key, [state]); };
    const states = selections.map(selected => {
        const state = { selected, ids: new Set(selected.itemIds), paths: new Set(selected.paths.filter(publicPath)), coverage: snapshot.coverage,
            diagnostics: [], omittedDiagnostics: 0, included: new Map(), relationships: [], pending: [], stop: null };
        for (const finding of inherited) diagnose(state, finding);
        if (snapshot.profile?.available === false && snapshot.profile.code) diagnose(state, { code: snapshot.profile.code, reason: snapshot.profile.reason });
        state.excludedPaths = selected.paths.length - state.paths.size;
        if (state.excludedPaths) diagnose(state, { code: 'EXCLUDED_PATH', reason: 'Generated or private runtime scope was excluded; it was not checked as canonical work', count: state.excludedPaths });
        for (const id of state.ids) {
            select(selectingId, id, state);
            const item = byId.get(id);
            if (item) state.included.set(item.ownerPath, item);
            else diagnose(state, { code: byId.has(id) ? 'AMBIGUOUS_OWNER' : 'UNRESOLVED_OWNER', itemId: id, reason: 'Exact identity has no unique owner in the selected snapshot' });
        }
        for (const relative of state.paths) {
            select(selectingPath, relative, state);
            if (byPath.has(relative)) state.included.set(byPath.get(relative).ownerPath, byPath.get(relative));
            const resolution = pathStatus(relative);
            if (resolution !== 'resolved') diagnose(state, { code: 'UNRESOLVED_PATH', ownerPath: relative, resolution,
                reason: 'Selected path ownership cannot be established in this source; no replacement was inferred' });
        }
        return state;
    });
    // Many records name the same few files; the path policy is asked once per distinct target, within a fixed memory bound.
    const judged = new Map();
    const publicTarget = value => {
        if (judged.has(value)) return judged.get(value);
        const verdict = publicPath(value);
        if (judged.size < LIMITS.records * 4) judged.set(value, verdict);
        return verdict;
    };
    const union = (first, second) => !first ? second : !second ? first : [...new Set([...first, ...second])];
    const shared = [];
    let active = states.length;
    let visitedRelationships = 0;
    let visitedOwners = 0;
    outer: for (const item of owners) {
        if (!active) break;
        visitedOwners++;
        const ownerPath = item.ownerPath.replace(/\\/g, '/');
        const selectingOwner = union(selectingId.get(item.id), selectingPath.get(ownerPath));
        // Every relationship is a link its own record declares, a tag included; nothing is projected as a stored backlink.
        for (const link of item.links || []) {
            visitedRelationships++;
            if (!object(link) || !LINK_ROLES.includes(link.relation)) {
                shared.push({ code: 'UNSUPPORTED_RELATIONSHIP', itemId: item.id, reason: 'Relationship cannot be safely projected' }); continue;
            }
            if (link.path !== undefined && !publicTarget(link.path)) {
                shared.push({ code: 'EXCLUDED_PATH', itemId: item.id, reason: 'Nonpublic relationship target was excluded' }); continue;
            }
            const targetPath = link.path?.replace(/\\/g, '/');
            const candidates = union(selectingOwner, union(selectingId.get(link.itemId), selectingPath.get(targetPath)));
            if (!candidates) continue;
            let target;
            for (const state of candidates) {
                if (state.stop) continue;
                const directions = [];
                if ((state.ids.has(item.id) && byId.get(item.id) === item) || state.paths.has(ownerPath)) directions.push('outgoing');
                if (state.ids.has(link.itemId) || state.paths.has(targetPath)) directions.push('incoming');
                if (!directions.length) continue;
                if (!target) {
                    const owner = link.itemId !== undefined ? byId.get(link.itemId) : byPath.get(targetPath);
                    target = { owner, resolution: link.itemId !== undefined ? (owner ? 'resolved' : byId.has(link.itemId) ? 'ambiguous' : 'missing') : pathStatus(targetPath) };
                }
                const { owner: targetOwner, resolution } = target;
                if (resolution !== 'resolved') state.pending.push({ after: shared.length, value: { code: 'UNRESOLVED_RELATIONSHIP', itemId: item.id, resolution,
                    reason: 'Declared target has no proved unique owner in the selected source' } });
                state.included.set(item.ownerPath, item);
                if (targetOwner) state.included.set(targetOwner.ownerPath, targetOwner);
                for (const direction of directions) {
                    if (state.relationships.length >= LIMITS.records) {
                        // The relationship that did not fit is omitted scope, not inspected scope.
                        state.stop = { visitedOwners, visitedRelationships: visitedRelationships - 1, shared: shared.length };
                        if (!--active) break outer;
                        break;
                    }
                    state.relationships.push({ owner: identity(item), relation: link.relation, direction,
                        target: link.itemId !== undefined ? { itemId: link.itemId, ...(targetOwner ? { ownerPath: targetOwner.ownerPath } : {}) } : { path: targetPath },
                        resolution, rationale: direction === 'incoming' ? 'Original owner declares this exact selected target' : 'Selected owner declares this exact target' });
                }
            }
        }
    }
    return states.map(state => {
        const { selected, paths, included, relationships, diagnostics } = state;
        const visible = state.stop ? state.stop.shared : shared.length;
        let replayed = 0;
        for (const own of state.pending) {
            while (replayed < own.after) diagnose(state, shared[replayed++]);
            diagnose(state, own.value);
        }
        while (replayed < visible) diagnose(state, shared[replayed++]);
        const outputTruncated = !!state.stop;
        const inspected = state.stop || { visitedOwners, visitedRelationships };
        const omittedRelationships = totalRelationships - inspected.visitedRelationships;
        if (omittedRelationships || outputTruncated) diagnose(state, { code: 'CONCERN_LIMIT',
            reason: 'Relationship inspection or output reached its protective bound; remaining scope is not certified', omittedRelationships });
        try {
            const items = [...included.values()].map(item => ({ ...identity(item), identityStatus: byId.get(item.id) === item ? 'unique' : 'ambiguous', state: item.state, revision: item.revision, contentHash: item.contentHash,
                assigneeId: item.assigneeId, optOut: item.optOut, retired: !!item.retired,
                verification: { status: item.verification?.status || 'unknown', reason: item.verification?.reason },
                acceptance: { accepted: item.acceptance?.accepted === true, historyCount: item.acceptance?.historyCount || 0 },
                prerequisiteReasons: item.prerequisiteReasons || [] }));
            const result = sanitized({ schemaVersion: 1, coverage: state.coverage, source: snapshot.source, asOf: snapshot.asOf, snapshotFingerprint: snapshot.fingerprint,
                profile: snapshot.profile, scope: { itemIds: selected.itemIds, paths: [...paths], excludedPathCount: state.excludedPaths },
                items, relationships, diagnostics, inspection: { visitedOwners: inspected.visitedOwners, visitedRelationships: inspected.visitedRelationships, emittedRelationships: relationships.length,
                    omittedRelationships, outputTruncated, omittedDiagnostics: state.omittedDiagnostics,
                    pathAvailability: 'Separate per-file observation; unverified against snapshotFingerprint',
                    fingerprintScope: 'Tracker snapshot only; confidence is as-of that snapshot, not an atomic path or publication check',
                    bounds: { selectedItems: 64, selectedPaths: LIMITS.records, relationships: LIMITS.records, bytes: LIMITS.recordBytes } },
                authority: 'Read diagnostic only; supplied paths do not certify a complete PR candidate or authorize mutation' });
            if (Buffer.byteLength(JSON.stringify(result)) > LIMITS.recordBytes) fail('LIMIT_EXCEEDED', 'Concern result exceeds the byte budget; narrow the exact scope');
            return { result };
        } catch (error) { return { error }; }
    });
}

/** Pure projection seam: production reads one consistent snapshot; tests can model reader limits without inventing canonical state. */
function projectConcerns(snapshot, query, pathStatus = () => 'unverified') {
    const [outcome] = projectSelections(snapshot, [validateConcernQuery(query)], pathStatus);
    if (outcome.error) throw outcome.error;
    return outcome.result;
}

/** Answers many exact single-path queries from one walk. Every entry holds what projectConcerns returns or throws for that path alone. */
function projectPathConcerns(snapshot, paths, pathStatus = () => 'unverified') {
    const queries = paths.map(path => { try { return { selected: validateConcernQuery({ schemaVersion: 1, paths: [path] }) }; } catch (error) { return { error }; } });
    const projected = projectSelections(snapshot, queries.filter(query => query.selected).map(query => query.selected), pathStatus);
    let next = 0;
    return queries.map((query, position) => ({ path: paths[position], ...(query.error ? { error: query.error } : projected[next++]) }));
}

function readConcerns(root, query, options = {}) {
    const selected = validateConcernQuery(query);
    if (!object(options) || Object.keys(options).some(key => key !== 'ref')) fail('INVALID_INPUT', 'Concerns supports only the selected local reference');
    const snapshot = readProgress(root, options);
    const checked = new Map();
    const startedAt = Date.now();
    const pathStatus = relative => {
        if (checked.has(relative)) return checked.get(relative);
        let status = 'unverified';
        // Never mix a pinned Git snapshot with current worktree path availability.
        if (options.ref === undefined && snapshot.coverage !== 'unavailable') {
            try {
                if (Date.now() - startedAt > LIMITS.processTimeoutMs) fail('LIMIT_EXCEEDED', 'Path inspection bound reached');
                readBytes(root, relative);
                status = 'resolved';
            } catch (error) { status = error.code === 'NOT_FOUND' || error.code === 'ENOENT' ? 'missing' : 'unverified'; }
        }
        checked.set(relative, status);
        return status;
    };
    return projectConcerns(snapshot, selected, pathStatus);
}

module.exports = { validateConcernQuery, projectConcerns, projectPathConcerns, readConcerns };
