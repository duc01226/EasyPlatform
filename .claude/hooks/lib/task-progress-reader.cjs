'use strict';

const { trackingContext, LIMITS, ITEM_ID } = require('./task-tracking-config.cjs');
const { inspectRecords, stableValue } = require('./task-artifact-store.cjs');
const { readBytes, hash, fail } = require('./task-tracking-files.cjs');
const { resolveTrackingProfile, nativeInventory } = require('./task-tracking-profile.cjs');
const { bindRecordContext, prerequisiteReasons, requireReady, healthStatus, tagProblem } = require('./task-tracking-policy.cjs');
const { recordView, sanitized } = require('./task-tracking.cjs');
const { DELIVERY_KIND, AREA_KIND, INITIATIVE_KIND, LEVELS, TAG_ROLES, LABELS, tagRole, vocabularyBlock, projectVocabularyView } = require('./task-tracking-vocabulary.cjs');

// The version of the read output itself: 3 states areas with their levels, the selected area or initiative scope, and each record's lifecycle and owned values.
const READ_VERSION = 3;
const AREA_TAG = tagRole(AREA_KIND);
const INITIATIVE_TAG = tagRole(INITIATIVE_KIND);
const vocabularyView = context => ({ ...vocabularyBlock(context?.config), project: projectVocabularyView(context?.vocabulary) });

function evidenceReader(context) {
    const observed = new Map();
    return { observed, read(relative) {
        if (observed.has(relative)) return observed.get(relative).bytes;
        const bytes = context.readSource ? context.readSource(relative) : readBytes(context.root, relative);
        observed.set(relative, { bytes, contentHash: hash(bytes) });
        return bytes;
    } };
}

function inspectSnapshot(root, pinned) {
    let context = { ...(pinned?.context || trackingContext(root)) };
    const profile = resolveTrackingProfile(context);
    if (!profile.available) {
        const native = nativeInventory(context);
        return { context, profile, records: [], items: [], diagnostics: native.diagnostics, coverage: 'unavailable', native,
            fingerprint: hash(stableValue({ config: context.config, inventory: native.inventory })) };
    }
    // Mixed vocabularies, an unfinished migration or the first vocabulary: nothing is read as work, so nothing can be counted.
    const stored = context.vocabulary;
    if (stored && stored.storedVersion === null) return { context, profile, records: [], items: [], coverage: 'unavailable', unreadable: true,
        diagnostics: [{ code: stored.code, reason: stored.reason }], fingerprint: hash(stableValue({ config: context.config, vocabulary: projectVocabularyView(stored) })) };
    const scan = pinned?.scan || inspectRecords(context);
    const evidence = evidenceReader(context);
    context.readEvidence = relative => evidence.read(relative);
    context = bindRecordContext(context, scan.records, { memoizeProof: true });
    // One UTC date for the whole read: every record is judged overdue against the same day.
    context.readDate = new Date().toISOString().slice(0, 10);
    const findings = context.recordAnalysis.findings;
    const items = [];
    const diagnostics = [...scan.diagnostics, ...findings];
    for (const record of scan.records) {
        try {
            const item = recordView(record, context);
            item.prerequisiteReasons = prerequisiteReasons(record, scan.records, context, findings);
            if (item.state === 'ready') {
                try { requireReady(record, scan.records, context, !!record.tracking?.readiness?.reviewed); }
                catch (error) { item.prerequisiteReasons.push(error.code ? error.message : 'Current readiness cannot be established'); }
            }
            if (item.verification.status === 'unknown') diagnostics.push({ itemId: item.id, code: item.verification.code, reason: item.verification.reason });
            if (item.assigneeId && !context.attributionMembers.some(m => m.id === item.assigneeId)) diagnostics.push({ itemId: item.id, code: 'UNKNOWN_MEMBER', reason: 'Recorded responsibility has no configured member or historical contributor label' });
            items.push(item);
        } catch (error) { diagnostics.push({ itemId: record.id, code: error.code || 'UNSUPPORTED', reason: 'Work metadata cannot be safely projected' }); }
    }
    // Everything a read states that can change while no record, configuration or evidence does: proof and health age, and a
    // due date passes. Each is part of the fingerprint, so whatever is kept by fingerprint is renewed when one of them moves.
    const input = { config: context.config, source: context.source || 'worktree', owners: scan.records.map(r => [r.ownerPath, r.contentHash]).sort(),
        sources: [...evidence.observed].map(([relative, v]) => [relative, v.contentHash]).sort(), diagnostics,
        applicability: items.map(item => [item.id, item.verification.status, item.verification.proofIds, item.health.status, item.overdue]) };
    return { context, profile, records: scan.records, items, diagnostics, coverage: diagnostics.length ? 'partial' : scan.coverage,
        fingerprint: hash(stableValue(input)) };
}

const isDelivery = item => item.kind === DELIVERY_KIND;
const isArea = item => item?.kind === AREA_KIND;
const countsTowardDelivery = item => item.state !== 'canceled' && !item.retired;

/**
 * The one owner of the delivery rules, for the project, a selected area or initiative and every figure alike. A task
 * counts unless it is canceled or retired, earns credit only once accepted, and is currently verified only while that
 * proof is current. A percentage is stated only for a complete, non-empty scope. Only tasks are given here: an area or an
 * initiative earns no credit, and its own state changes no figure.
 */
function deliveryFigures(tasks, coverage) {
    const eligible = tasks.filter(countsTowardDelivery);
    const accepted = eligible.filter(item => item.acceptance.accepted);
    return { eligible, figures: { total: eligible.length, accepted: accepted.length, remaining: eligible.length - accepted.length,
        currentlyVerified: accepted.filter(item => item.verification.status === 'current').length,
        canceled: tasks.filter(item => item.state === 'canceled').length, retired: tasks.filter(item => item.retired && item.state !== 'canceled').length,
        percentage: coverage === 'complete' && eligible.length ? accepted.length / eligible.length * 100 : null } };
}

/**
 * One projection of the project's tags. Every record names its own areas and initiatives; the projection turns those
 * tags round once, so a scope is walked from its area or initiative. An area's scope is everything tagged to it or to an
 * area beneath it, each record once, so a parent's figure is not the sum of its children. An initiative's scope is
 * everything linked directly to it. With no selector the scope is the whole project, which also holds the work that has
 * no area.
 */
function scopeProjection(snapshot, scopeId) {
    const diagnostics = [];
    let coverage = snapshot.coverage;
    const diagnose = (code, reason, itemId) => {
        if (diagnostics.length < LIMITS.records) diagnostics.push({ code, reason, ...(itemId ? { itemId } : {}) });
        else if (['LIMIT_EXCEEDED', 'UNAVAILABLE_SCOPE'].includes(code)) diagnostics[diagnostics.length - 1] = {
            code, reason: `${reason}; additional scope findings were omitted`, ...(itemId ? { itemId } : {}) };
        if (coverage !== 'unavailable') coverage = 'partial';
    };
    const items = new Map();
    // A duplicate remains ambiguous even if a later owner cannot be projected.
    const owners = snapshot.context?.recordAnalysis?.index;
    for (const item of snapshot.items) {
        if (items.has(item.id) || (owners?.has(item.id) && !owners.get(item.id))) {
            items.set(item.id, null); diagnose('DUPLICATE_ID', 'Scope identity has no unique owner', item.id);
        } else items.set(item.id, item);
    }
    const admitted = [...items.values()].filter(Boolean);
    const areas = admitted.filter(isArea);
    // What each record is tagged to, by relation, and the records tagged to each area and initiative.
    const tags = new Map(admitted.map(item => [item.id, Object.fromEntries(Object.keys(TAG_ROLES).map(relation => [relation, []]))]));
    const tagged = new Map(admitted.filter(item => Object.values(TAG_ROLES).includes(item.kind)).map(item => [item.id, []]));
    let edges = 0;
    let omitted = false;
    for (const item of admitted) {
        const seen = new Set();
        if (!Array.isArray(item.links)) { diagnose('INVALID_RECORD', 'Links cannot be safely inspected', item.id); continue; }
        for (const link of item.links) {
            if (!link || typeof link !== 'object' || !Object.hasOwn(TAG_ROLES, link.relation)) continue;
            const tag = `${link.relation}:${link.itemId}`;
            if (seen.has(tag)) continue;
            seen.add(tag);
            if (edges >= LIMITS.membershipEdges) { omitted = true; break; }
            edges++;
            const target = typeof link.itemId === 'string' ? items.get(link.itemId) : null;
            // The relationship check says what is wrong with a tag. Here such a tag is only left out of every scope.
            if (tagProblem(item, link.relation, link.itemId, target)) { diagnose('UNRESOLVED_TAG', 'Tag has no unique admitted target of its kind', item.id); continue; }
            tags.get(item.id)[link.relation].push(target.id);
            tagged.get(target.id).push(item.id);
        }
        if (omitted) break;
    }
    if (omitted) diagnose('LIMIT_EXCEEDED', 'Tags were omitted at the projection budget');
    const childAreas = new Map(areas.map(item => [item.id, tagged.get(item.id).filter(id => isArea(items.get(id)))]));
    // Linear topological check: an area under several areas is valid, a remaining cycle is not.
    const indegree = new Map(areas.map(item => [item.id, 0]));
    for (const children of childAreas.values()) for (const id of children) indegree.set(id, indegree.get(id) + 1);
    const roots = areas.filter(item => indegree.get(item.id) === 0).map(item => item.id);
    const settled = [...roots];
    for (let position = 0; position < settled.length; position++) {
        for (const id of childAreas.get(settled[position])) {
            indegree.set(id, indegree.get(id) - 1);
            if (indegree.get(id) === 0) settled.push(id);
        }
    }
    if (settled.length !== areas.length) diagnose('CYCLE', 'Area hierarchy contains a cycle');
    const sort = values => [...values].sort();
    // Shallowest level first, areas without a level last, then by identity.
    const depth = item => (LEVELS.includes(item.level) ? LEVELS.indexOf(item.level) : LEVELS.length);
    const { labels } = vocabularyBlock(snapshot.context?.config);
    const hierarchy = { labels: { levels: labels.levels, types: labels.initiativeTypes },
        areas: [...areas].sort((a, b) => depth(a) - depth(b) || (a.id < b.id ? -1 : 1)).map(item => ({ id: item.id, level: item.level ?? null,
            parentAreaIds: sort(tags.get(item.id)[AREA_TAG]), childAreaIds: sort(childAreas.get(item.id)) })),
        untaggedTaskIds: omitted ? [] : sort(admitted.filter(item => isDelivery(item) && !tags.get(item.id)[AREA_TAG].length).map(item => item.id)), coverage };
    // Only an area or an initiative is a scope; `tagged` holds exactly those that have one unique admitted owner.
    if (scopeId && !tagged.has(scopeId)) {
        diagnose('UNAVAILABLE_SCOPE', 'Selected scope has no unique area or initiative owner', scopeId);
        return { hierarchy: { ...hierarchy, coverage }, scope: { kind: null, itemId: scopeId, memberIds: [], taskIds: [], eligibleTaskIds: [],
            excludedTaskIds: [], childAreaIds: [], affiliations: [], coverage: 'unavailable' }, metrics: null, diagnostics, coverage: 'unavailable' };
    }
    const selected = new Set();
    if (!scopeId) for (const item of admitted) selected.add(item.id);
    else {
        // Only an area is entered further: an initiative holds what links to it directly and nothing beneath that.
        const visited = new Set();
        const pending = [scopeId];
        while (pending.length) {
            const id = pending.pop();
            if (visited.has(id)) continue;
            visited.add(id);
            for (const member of tagged.get(id)) {
                if (member !== scopeId) selected.add(member);
                if (isArea(items.get(member))) pending.push(member);
            }
        }
    }
    const all = [...selected].map(id => items.get(id)).filter(isDelivery);
    const { eligible, figures } = deliveryFigures(all, coverage);
    const metrics = { unit: 'unique-task', scope: scopeId ? { kind: items.get(scopeId).kind, itemId: scopeId } : { kind: 'project' }, coverage,
        scopeRevision: hash(stableValue(eligible.map(i => i.id).sort())), eligibleIds: eligible.map(i => i.id).sort(), ...figures };
    const affiliations = sort(scopeId ? new Set([...selected, scopeId]) : selected)
        .map(itemId => ({ itemId, areaIds: sort(tags.get(itemId)[AREA_TAG]), initiativeIds: sort(tags.get(itemId)[INITIATIVE_TAG]) }));
    const scope = { ...metrics.scope, memberIds: sort(selected), taskIds: sort(all.map(item => item.id)), eligibleTaskIds: [...metrics.eligibleIds],
        excludedTaskIds: sort(all.filter(item => !countsTowardDelivery(item)).map(item => item.id)),
        childAreaIds: scopeId ? sort(childAreas.get(scopeId) || []) : omitted ? [] : sort(roots), affiliations, coverage };
    // The additive navigation payload has its own existing record-byte ceiling.
    // Conserve known identities/counts, omit navigation explicitly, never label it complete.
    if (Buffer.byteLength(JSON.stringify({ hierarchy, scope })) > LIMITS.recordBytes) {
        diagnose('LIMIT_EXCEEDED', 'Navigation affiliations were omitted at the projection byte budget');
        hierarchy.areas = hierarchy.areas.map(item => ({ ...item, parentAreaIds: [], childAreaIds: [] }));
        hierarchy.untaggedTaskIds = []; scope.childAreaIds = []; scope.affiliations = [];
        hierarchy.coverage = scope.coverage = metrics.coverage = coverage;
        metrics.percentage = null;
    }
    return { hierarchy, scope, metrics, diagnostics, coverage };
}

function scopeMetrics(snapshot, scopeId) { return scopeProjection(snapshot, scopeId).metrics; }

/** Why no figure is stated: the most specific finding of the read, or that the project itself was not read whole. */
function withheldFigures(snapshot, projection) {
    const found = code => projection?.diagnostics.find(item => item.code === code);
    const finding = snapshot.coverage === 'complete' ? found('UNAVAILABLE_SCOPE') || found('LIMIT_EXCEEDED') || found('CYCLE') || projection?.diagnostics[0] : undefined;
    return { status: 'withheld', reason: finding?.reason || 'The project was not inspected completely' };
}

/**
 * Every area's and every initiative's own delivery figures, settled together from one project projection. Each entry
 * states exactly what that scope's own read states: work in several areas or initiatives counts in each of them, and
 * nothing is added across entries. Figures are stated for every area and initiative or for none: incomplete, cut,
 * ambiguous or cyclic tags withhold them with the reason. `project` is the project-scope projection of the same
 * snapshot, when the caller already holds it.
 */
function scopeFigures(snapshot, project = scopeProjection(snapshot)) {
    if (project.coverage !== 'complete') return withheldFigures(snapshot, project);
    const { areas } = project.hierarchy;
    const initiativeIds = snapshot.items.filter(item => item.kind === INITIATIVE_KIND).map(item => item.id).sort();
    // A scope's own read repeats the project's navigation without the work outside it and adds only its own kind and
    // identity and, for an area, its child areas. While the largest such addition still fits, no scope's own read passes
    // the navigation byte budget that would withhold its percentage.
    const addition = value => Buffer.byteLength(JSON.stringify(value));
    const added = Math.max(areas.reduce((most, area) => Math.max(most, addition({ kind: AREA_KIND, itemId: area.id, childAreaIds: area.childAreaIds })), 0),
        initiativeIds.reduce((most, id) => Math.max(most, addition({ kind: INITIATIVE_KIND, itemId: id })), 0));
    if (Buffer.byteLength(JSON.stringify({ hierarchy: project.hierarchy, scope: project.scope })) + added > LIMITS.recordBytes)
        return { status: 'withheld', reason: 'Area and initiative figures cannot be confirmed within the projection byte budget' };
    const tasks = new Map(snapshot.items.filter(isDelivery).map(item => [item.id, item]));
    const direct = new Map(areas.map(area => [area.id, []]));
    const linked = new Map(initiativeIds.map(id => [id, []]));
    for (const { itemId, areaIds, initiativeIds: own } of project.scope.affiliations) if (tasks.has(itemId)) {
        for (const id of areaIds) direct.get(id).push(tasks.get(itemId));
        for (const id of own) linked.get(id).push(tasks.get(itemId));
    }
    const children = new Map(areas.map(area => [area.id, area.childAreaIds]));
    // Child areas settle before the areas above them, so each area's reachable tasks are assembled once. Complete
    // coverage has already ruled out a cycle, and the work stays within the tag edge budget times the task count.
    const reach = new Map();
    for (const area of areas) {
        const pending = [area.id];
        while (pending.length) {
            const id = pending[pending.length - 1];
            const unsettled = reach.has(id) ? [] : children.get(id).filter(child => !reach.has(child));
            if (unsettled.length) { pending.push(...unsettled); continue; }
            if (!reach.has(id)) {
                const reachable = new Set(direct.get(id));
                for (const child of children.get(id)) for (const task of reach.get(child)) reachable.add(task);
                reach.set(id, reachable);
            }
            pending.pop();
        }
    }
    return { status: 'complete', areas: areas.map(area => ({ id: area.id, ...deliveryFigures([...reach.get(area.id)], 'complete').figures })),
        initiatives: initiativeIds.map(id => ({ id, ...deliveryFigures(linked.get(id), 'complete').figures })) };
}

/** The work that can be started now, most urgent first: recorded ready, not retired, and nothing unresolved before it. */
function readyIds(items) {
    return items.filter(i => i.state === 'ready' && !i.retired && !i.prerequisiteReasons.length)
        .sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id, 'en')).map(i => i.id);
}

function readProgress(root, options = {}) {
    try {
        if (options.scopeId !== undefined && (typeof options.scopeId !== 'string' || !ITEM_ID.test(options.scopeId))) fail('INVALID_INPUT', 'Select one exact area or initiative identity');
        const pinned = options.ref !== undefined ? require('../../skills/task-track/lib/shared-snapshot.cjs').loadSharedSnapshot(root, options.ref) : undefined;
        let snapshot;
        let consistent = false;
        for (let attempt = 0; attempt <= LIMITS.readRetries; attempt++) {
            const before = inspectSnapshot(root, pinned);
            const after = inspectSnapshot(root, pinned);
            snapshot = after;
            if (before.fingerprint === after.fingerprint) { consistent = true; break; }
        }
        if (!consistent) { snapshot.coverage = 'partial'; snapshot.diagnostics.push({ code: 'SOURCE_CHANGED', reason: 'Selected sources changed during inspection; reread before relying on this snapshot' }); }
        const projection = snapshot.profile.available && !snapshot.unreadable ? scopeProjection(snapshot, options.scopeId) : null;
        const metrics = projection?.metrics || null;
        // Health is attested on the selected area or initiative itself, else on the project's configured owner.
        const healthOwnerId = options.scopeId || snapshot.context.config.taskTracking?.healthOwnerId;
        const healthOwners = snapshot.records.filter(record => record.id === healthOwnerId);
        const health = snapshot.profile.available && projection?.scope.coverage !== 'unavailable' && healthOwners.length === 1 ? healthStatus(healthOwners[0], snapshot.context)
            : { status: 'unknown', reason: healthOwnerId ? 'Exact health owner is unavailable or ambiguous' : 'No explicit project health owner selected' };
        const ready = readyIds(snapshot.items);
        const excluded = snapshot.items.filter(i => !ready.includes(i.id)).map(i => ({ itemId: i.id, reasons:
            [...(i.state !== 'ready' ? [`Recorded state is ${LABELS.states[i.state] ?? i.state}`] : []), ...(i.retired ? ['Retired'] : []), ...i.prerequisiteReasons] }));
        // Settled only for a reader that shows them; every other read, automatic upkeep included, skips the work.
        const figures = options.figures !== true ? {} : { figures: projection?.coverage === 'complete'
            ? scopeFigures(snapshot, options.scopeId === undefined ? projection : undefined) : withheldFigures(snapshot, projection) };
        return sanitized({ schemaVersion: READ_VERSION, vocabulary: vocabularyView(snapshot.context), project: { name: snapshot.context.config.project?.name || 'Selected project', root: snapshot.context.root },
            source: snapshot.context.source || { kind: 'worktree', label: 'Local working copy; proposals may be unshared', remoteFreshness: 'unknown' },
            asOf: new Date().toISOString(), coverage: projection?.coverage || snapshot.coverage, fingerprint: snapshot.fingerprint,
            profile: snapshot.profile, mode: snapshot.context.mode, enrolled: snapshot.context.enrolled,
            members: snapshot.context.attributionMembers || snapshot.context.members, reportPolicy: snapshot.context.report, metrics,
            health, ready, excluded, hierarchy: projection?.hierarchy || null, scope: projection?.scope || null, ...figures,
            items: snapshot.items, diagnostics: [...snapshot.diagnostics, ...(projection?.diagnostics || [])], native: snapshot.native || null });
    } catch (error) {
        return { schemaVersion: READ_VERSION, vocabulary: vocabularyView(null), coverage: 'unavailable', profile: { available: false, capabilities: [] }, metrics: null,
            ...(options?.figures === true ? { figures: withheldFigures({ coverage: 'unavailable' }) } : {}),
            items: [], members: [], ready: [], excluded: [], diagnostics: [{ code: error.code || 'IO_FAILURE',
                reason: error.code ? error.message : 'Selected project cannot be inspected' }] };
    }
}

/**
 * Every record of a read that carries one exact identity, each in full and with its own location. A repeated identity is
 * ambiguous and none is chosen; an unknown one is named and nothing stands in for it. Findings that name other work are
 * left out; those that name this identity or no identity stay, because they qualify the answer.
 */
function exactRecords(snapshot, itemId) {
    const records = snapshot.items.filter(item => item.id === itemId);
    // A repeated identity stays ambiguous even when only one of its records can be shown.
    const repeated = records.length > 1 || snapshot.diagnostics.some(finding => finding.itemId === itemId && finding.code === 'DUPLICATE_ID');
    return { status: repeated ? 'ambiguous' : records.length ? 'found' : 'not-found', itemId, records, coverage: snapshot.coverage, fingerprint: snapshot.fingerprint,
        diagnostics: snapshot.diagnostics.filter(finding => finding.itemId === undefined || finding.itemId === itemId) };
}

/** One exact record as the selected source holds it now. A read only; a project that cannot be read answers as any other read of it does. */
function readItem(root, itemId, options = {}) {
    if (typeof itemId !== 'string' || !ITEM_ID.test(itemId)) fail('INVALID_INPUT', 'Select one exact item identity');
    const snapshot = readProgress(root, { ref: options.ref });
    return snapshot.coverage === 'unavailable' ? snapshot : exactRecords(snapshot, itemId);
}

module.exports = { READ_VERSION, inspectSnapshot, readProgress, readItem, exactRecords, readyIds, scopeMetrics, scopeProjection, scopeFigures, sanitized };
