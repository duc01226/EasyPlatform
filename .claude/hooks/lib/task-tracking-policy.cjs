'use strict';

const { MEMBER_ID, isEmailId, relativePath, calendarDate, LIMITS } = require('./task-tracking-config.cjs');
const { STATES, RECORDED_STATES, LINK_ROLES, TAG_ROLES, AREA_KIND, INITIATIVE_KIND, LEVELS, OWNED_VALUES, PLANNED_STATE, IMPLEMENTED_STATE, ACYCLIC_LINK_ROLES, EARLIER_MAPPING, lifecycleOf } = require('./task-tracking-vocabulary.cjs');
const { fail, hash, readBytes } = require('./task-tracking-files.cjs');
const { ITEM_ID, stableValue } = require('./task-artifact-store.cjs');
const { isPrivacySensitive } = require('./sensitive-path-policy.cjs');

const string = (value, maximum = 2000) => typeof value === 'string' && value.trim().length > 0 && value.length <= maximum;
const list = (value, check, maximum = LIMITS.records) => Array.isArray(value) && value.length <= maximum && value.every(check);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const HASH = /^[a-f0-9]{64}$/;
const instant = value => typeof value === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value)
    && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
/** Readiness, proof and acceptance belong to the delivery lifecycle alone. */
const inDelivery = record => lifecycleOf(record.kind)?.name === 'delivery';

/** What is wrong with a tracker-owned value for a record of the given kind, or null. Capture, refinement and the stored-record check all ask here. */
function ownedValueProblem(kind, field, value) {
    const owned = OWNED_VALUES[field];
    if (!owned.kinds.includes(kind)) return `${field} belongs to ${owned.kinds.join(', ')} only`;
    if (value === null) return owned.optional ? null : `${field} cannot be unset`;
    if (owned.values) return owned.values.includes(value) ? null : `${field} must be one of ${owned.values.join(', ')}`;
    return calendarDate(value) ? null : `${field} must be a calendar date, YYYY-MM-DD`;
}

/**
 * Past its due date while still open, as of the given UTC date. A record of any kind is open until it is done, canceled
 * or retired. A due date changes nothing else: not eligibility, credit, readiness or acceptance.
 */
function overdue(record, today = new Date().toISOString().slice(0, 10)) {
    const deadline = record.tracking?.deadline;
    if (!deadline || ownedValueProblem(record.kind, 'deadline', deadline) || deadline >= today) return false;
    return !['done', 'canceled'].includes(record.data.status) && !record.tracking.retired;
}

function validProof(proof) {
    return object(proof) && string(proof.id, 120) && ITEM_ID.test(proof.id)
        && ['manual', 'test', 'review'].includes(proof.kind) && ['passed', 'failed', 'skipped'].includes(proof.result)
        && instant(proof.observedAt) && string(proof.summary)
        && list(proof.criteriaIds, id => typeof id === 'string' && ITEM_ID.test(id)) && proof.criteriaIds.length > 0
        && new Set(proof.criteriaIds).size === proof.criteriaIds.length
        && HASH.test(proof.criteriaIdentity) && HASH.test(proof.sourceIdentity);
}

function validHealth(health) {
    return object(health) && Object.keys(health).every(key => ['assessment', 'ownerId', 'observedAt', 'reason'].includes(key))
        && string(health.assessment, 160) && typeof health.ownerId === 'string' && MEMBER_ID.test(health.ownerId)
        && instant(health.observedAt) && string(health.reason);
}

function validReadiness(readiness) {
    return object(readiness) && readiness.reviewed === true && readiness.decisionsResolved === true
        && typeof readiness.actor === 'string' && MEMBER_ID.test(readiness.actor)
        && instant(readiness.at) && HASH.test(readiness.criteriaIdentity);
}

function validAcceptance(acceptance, itemId) {
    return object(acceptance) && acceptance.itemId === itemId && typeof acceptance.id === 'string' && ITEM_ID.test(acceptance.id)
        && typeof acceptance.actor === 'string' && MEMBER_ID.test(acceptance.actor) && instant(acceptance.acceptedAt)
        && string(acceptance.reason) && HASH.test(acceptance.criteriaIdentity) && HASH.test(acceptance.sourceIdentity)
        && list(acceptance.criteriaIds, id => typeof id === 'string' && ITEM_ID.test(id)) && acceptance.criteriaIds.length > 0
        && new Set(acceptance.criteriaIds).size === acceptance.criteriaIds.length
        && list(acceptance.proofIds, id => typeof id === 'string' && ITEM_ID.test(id)) && acceptance.proofIds.length > 0
        && new Set(acceptance.proofIds).size === acceptance.proofIds.length;
}

function healthStatus(record, context) {
    const health = record?.tracking?.health;
    if (!health) return { status: 'unknown', reason: 'No dated owner attestation supplied', itemId: record?.id || null };
    const owner = context.members.find(person => person.id === health.ownerId);
    if (!validHealth(health) || !owner || health.observedAt > new Date().toISOString()) return { status: 'unknown',
        reason: 'Health owner, date or reason cannot be established', itemId: record.id };
    return { status: 'attested', ...health, displayName: owner.displayName, itemId: record.id };
}

function member(context, identity, active = true) {
    if (identity === null) return null;
    const matches = context.members.filter(m => [m.id, m.displayName, ...(m.aliases || [])].some(v => v.trim().toLocaleLowerCase('en-US') === String(identity).trim().toLocaleLowerCase('en-US')));
    if (matches.length !== 1 || (active && !matches[0].active)) fail('INVALID_MEMBER', 'Member is unknown, ambiguous, or inactive');
    return matches[0];
}

function validMemberProfile(person) {
    const { validName } = require('./task-tracking-identity.cjs');
    return object(person) && Object.keys(person).length === 2 && Object.keys(person).every(key => ['id', 'displayName'].includes(key))
        && isEmailId(person.id) && person.id === person.id.toLowerCase() && validName(person.displayName);
}

function validateMetadata(record) {
    const t = record.tracking;
    if (!t) return;
    // A record's state belongs to the lifecycle of its own kind.
    if (!lifecycleOf(record.kind)?.states.includes(record.data.status)) fail('UNSUPPORTED', 'Tracking lifecycle has an unsupported recorded state');
    if (t.memberProfiles !== undefined && (!list(t.memberProfiles, validMemberProfile)
        || new Set(t.memberProfiles.map(person => person.id)).size !== t.memberProfiles.length)) fail('INVALID_RECORD', 'Historical contributor attribution is malformed or duplicated');
    if (t.assigneeId !== undefined && t.assigneeId !== null && (typeof t.assigneeId !== 'string' || !MEMBER_ID.test(t.assigneeId))) fail('INVALID_RECORD', 'Assignment has no stable member identity');
    if (t.collaboratorIds !== undefined && !list(t.collaboratorIds, v => typeof v === 'string' && MEMBER_ID.test(v))) fail('INVALID_RECORD', 'Collaborators are malformed');
    if (t.criteria !== undefined && (!list(t.criteria, c => object(c) && typeof c.id === 'string' && ITEM_ID.test(c.id) && string(c.text, 8000))
        || new Set(t.criteria.map(c => c.id)).size !== t.criteria.length)) fail('INVALID_RECORD', 'Acceptance criteria are malformed or duplicated');
    if (t.links !== undefined && !list(t.links, link => object(link) && LINK_ROLES.includes(link.relation)
        && ((typeof link.itemId === 'string' && ITEM_ID.test(link.itemId) && link.path === undefined)
            || (relativePath(link.path) && link.itemId === undefined && ['spec', 'plan', 'source'].includes(link.relation))))) fail('INVALID_RECORD', 'Links have an unsupported owner or identity');
    // Where work belongs is a tag on the work itself: no record lists its members or holds a group purpose.
    if (t[EARLIER_MAPPING.memberField] !== undefined || t[EARLIER_MAPPING.purposeField] !== undefined) fail('INVALID_RECORD', 'A member list or a group purpose is not stored; a tag is a link on the tagged record');
    for (const [field, owned] of Object.entries(OWNED_VALUES)) {
        const problem = t[field] !== undefined ? ownedValueProblem(record.kind, field, t[field])
            : owned.optional || !owned.kinds.includes(record.kind) ? null : `${field} is missing`;
        if (problem) fail('INVALID_RECORD', problem);
    }
    for (const key of ['receipts', 'proofs', 'acceptanceHistory', 'history']) if (t[key] !== undefined && !Array.isArray(t[key])) fail('INVALID_RECORD', `${key} must be a retained list`);
    if ((t.proofs || []).some(proof => !validProof(proof))
        || new Set((t.proofs || []).map(proof => proof.id)).size !== (t.proofs || []).length) fail('INVALID_RECORD', 'Proof observations are malformed or duplicated');
    if (t.receipts?.length > LIMITS.receipts) fail('INVALID_RECORD', 'Operation receipts exceed the retained retry budget');
    for (const receipt of t.receipts || []) {
        if (!object(receipt) || typeof receipt.operationId !== 'string' || !ITEM_ID.test(receipt.operationId)
            || !HASH.test(receipt.digest) || !Number.isSafeInteger(receipt.afterRevision)
            || receipt.afterRevision < 1 || receipt.afterRevision > t.revision || !object(receipt.result)
            || receipt.result.status !== 'saved' || receipt.result.operationId !== receipt.operationId
            || receipt.result.itemId !== record.id || receipt.result.kind !== record.kind
            || !relativePath(receipt.result.ownerPath) || receipt.result.revision !== receipt.afterRevision) fail('INVALID_RECORD', 'Operation receipt is malformed');
    }
    if (new Set((t.receipts || []).map(r => r.operationId)).size !== (t.receipts || []).length) fail('INVALID_RECORD', 'Operation receipt identity is duplicated');
    if (t.optOut !== undefined && typeof t.optOut !== 'boolean') fail('INVALID_RECORD', 'Item opt-out is malformed');
    if (t.health !== undefined && !validHealth(t.health)) fail('INVALID_RECORD', 'Health requires explicit owner, date, assessment and reason');
    if (t.readiness !== undefined && !validReadiness(t.readiness)) fail('INVALID_RECORD', 'Readiness requires actual reviewed decisions, actor, date and scope');
    if (t.blocker !== undefined && t.blocker !== null && (!object(t.blocker) || !string(t.blocker.reason)
        || t.blocker.resumeState !== 'in_progress' || typeof t.blocker.actor !== 'string'
        || !MEMBER_ID.test(t.blocker.actor) || !instant(t.blocker.at))) fail('INVALID_RECORD', 'Blocker requires its actual reason and prior active state');
    if ((t.acceptanceHistory || []).some(acceptance => !validAcceptance(acceptance, record.id))) fail('INVALID_RECORD', 'Acceptance history is malformed');
    // History keeps the state each entry was written with, so it may name a state of any lifecycle.
    if ((t.history || []).some(entry => !object(entry) || typeof entry.operationId !== 'string' || !ITEM_ID.test(entry.operationId)
        || !string(entry.operation, 80) || typeof entry.actor !== 'string' || !MEMBER_ID.test(entry.actor)
        || !instant(entry.at) || !RECORDED_STATES.includes(entry.beforeState) || !RECORDED_STATES.includes(entry.afterState))) fail('INVALID_RECORD', 'Activity history is malformed');
    if (t.retired !== undefined && t.retired !== null && (!object(t.retired) || !string(t.retired.reason)
        || (!string(t.retired.actor, 120) && !isEmailId(t.retired.actor)) || !instant(t.retired.at))) fail('INVALID_RECORD', 'Retirement history is malformed');
}

function recordIndex(records) {
    const index = new Map();
    for (const record of records) index.set(record.id, index.has(record.id) ? null : record);
    return index;
}

const SELF_RELATIONSHIP = 'Self relationship is forbidden';

/**
 * What is wrong with a tag, or null: the one statement of what makes a tag valid. A tag names one existing record other
 * than the record that carries it, of the kind its relation is for, and an area is placed under areas only. `owner` is
 * the record that carries the tag and `target` the one unique owner of `id`, if there is one; each needs only its
 * identity and kind, so a stored record and a read's view of it are judged alike. The relationship check reports the
 * answer as a finding, and the scope projection leaves such a tag out of every scope.
 */
function tagProblem(owner, relation, id, target) {
    const kind = TAG_ROLES[relation];
    if (id === owner.id) return SELF_RELATIONSHIP;
    if (!target) return `Tag target ${id} has no unique project owner`;
    if (target.kind !== kind) return `Tag target ${id} is not of kind ${kind}`;
    if (owner.kind === AREA_KIND && kind !== AREA_KIND) return `An area declares no ${relation} link: ${id}`;
    return null;
}

/**
 * An optional `visit(record, wellFormed)` rides the relationship walk, after every record has been validated,
 * so a caller needing one more per-record step adds no further full pass over the selected records.
 */
function graphFindings(records, index = recordIndex(records), visit) {
    const findings = [];
    const malformed = new Set();
    for (const record of records) {
        if (!index.get(record.id)) findings.push({ itemId: record.id, code: 'DUPLICATE_ID', reason: 'Identity has multiple homes' });
        try { validateMetadata(record); } catch (error) {
            findings.push({ itemId: record.id, code: error.code, reason: error.message });
            // Validation stops at its first failure, whatever its code, so every later field of this record is unchecked.
            malformed.add(record.id);
        }
    }
    const graphs = Object.fromEntries(ACYCLIC_LINK_ROLES.map(role => [role, new Map(records.map(r => [r.id, []]))]));
    // An unset level, or one that is no level, constrains nothing.
    const depth = record => LEVELS.indexOf(record.tracking?.level);
    for (const record of records) {
        if (visit) visit(record, !malformed.has(record.id));
        const links = Array.isArray(record.tracking?.links) ? record.tracking.links : [];
        const tags = new Set();
        const finding = (code, reason) => findings.push({ itemId: record.id, code, reason });
        for (const link of links.filter(l => typeof l?.itemId === 'string')) {
            const id = link.itemId;
            const target = index.get(id);
            if (id === record.id) finding('UNRESOLVED_LINK', SELF_RELATIONSHIP);
            else if (Object.hasOwn(TAG_ROLES, link.relation)) {
                // A valid tag is named once.
                const tag = `${link.relation}:${id}`;
                const problem = tagProblem(record, link.relation, id, target);
                if (problem) finding('INVALID_LINK_TARGET', problem);
                else if (tags.has(tag)) finding('INVALID_LINK_TARGET', `Tag target ${id} is repeated`);
                else if (record.kind === AREA_KIND) {
                    // The shallowest level is the top of the hierarchy, and a parent is never deeper than its child.
                    const own = depth(record);
                    if (own === 0) finding('INVALID_AREA_LEVEL', `An ${LEVELS[0]}-level area has no parent: ${id}`);
                    else if (own > 0 && depth(target) > own) finding('INVALID_AREA_LEVEL', `Area sits under a deeper-level area: ${id}`);
                }
                tags.add(tag);
            } else if (!target) finding('UNRESOLVED_LINK', 'Relationship has no unique project owner');
            if (target && id !== record.id && Object.hasOwn(graphs, link.relation)) graphs[link.relation].get(record.id).push(id);
        }
    }
    // Iterative traversal avoids stack growth with the size of an adopting project's planned work.
    for (const adjacency of Object.values(graphs)) {
    const colors = new Map();
    for (const record of records) {
        if (colors.has(record.id)) continue;
        const stack = [{ id: record.id, position: 0 }];
        colors.set(record.id, 1);
        while (stack.length) {
            const current = stack[stack.length - 1];
            const next = adjacency.get(current.id) || [];
            if (current.position >= next.length) { colors.set(current.id, 2); stack.pop(); continue; }
            const id = next[current.position++];
            if (colors.get(id) === 1) findings.push({ itemId: current.id, code: 'CYCLE', reason: 'Relationships contain a cycle' });
            else if (!colors.has(id)) { colors.set(id, 1); stack.push({ id, position: 0 }); }
        }
    }
    }
    return findings;
}

/** One selected inspection owns these indexes; candidate writes always bind a new array. */
function bindRecordContext(context, records, { memoizeProof = false } = {}) {
    const index = recordIndex(records);
    // Display-only labels. Never substitute this collection for operational members.
    const attribution = new Map(context.members.map(person => [person.id, person]));
    // Labels are collected during the relationship walk; an identity with a malformed record contributes none.
    const findings = graphFindings(records, index, (record, wellFormed) => {
        if (!wellFormed || !Array.isArray(record.tracking?.memberProfiles)) return;
        for (const person of record.tracking.memberProfiles) {
            if (attribution.has(person.id)) continue;
            if (attribution.size >= LIMITS.records) fail('LIMIT_EXCEEDED', 'Contributor display projection exceeds the member budget');
            attribution.set(person.id, { ...person, active: false });
        }
    });
    const findingsByItem = new Map();
    for (const finding of findings) {
        if (!findingsByItem.has(finding.itemId)) findingsByItem.set(finding.itemId, []);
        findingsByItem.get(finding.itemId).push(finding);
    }
    return { ...context, attributionMembers: [...attribution.values()], recordAnalysis: { records, index, findings, findingsByItem },
        proofCache: memoizeProof ? new Map() : undefined };
}

function analysisFor(records, context) {
    return context.recordAnalysis?.records === records ? context.recordAnalysis
        : bindRecordContext(context, records).recordAnalysis;
}

function identities(record, context) {
    const criteria = record.tracking?.criteria || [];
    const references = (record.tracking?.links || []).filter(link => ['spec', 'source'].includes(link.relation));
    const source = [];
    const governing = [];
    for (const reference of references) {
        let bytes;
        let value;
        if (reference.itemId) {
            const owner = context.recordAnalysis?.index.get(reference.itemId);
            if (!owner || owner.id === record.id) fail('UNRESOLVED_LINK', 'Applicable item has no unique selected project owner');
            validateMetadata(owner);
            bytes = owner.bytes;
            value = { itemId: owner.id, ownerPath: owner.ownerPath, contentHash: owner.contentHash };
        } else {
            if (isPrivacySensitive(reference.path)) fail('SENSITIVE_PATH', 'Sensitive files are not tracking evidence');
            bytes = context.readEvidence ? context.readEvidence(reference.path) : readBytes(context.root, reference.path);
            value = { path: reference.path, contentHash: hash(bytes) };
        }
        (reference.relation === 'spec' ? governing : source).push(value);
    }
    const referenceKey = value => value.path || `${value.itemId}:${value.ownerPath}`;
    source.sort((a, b) => referenceKey(a).localeCompare(referenceKey(b), 'en'));
    governing.sort((a, b) => referenceKey(a).localeCompare(referenceKey(b), 'en'));
    return { criteriaIdentity: hash(stableValue({ title: record.data.title, intent: record.data.intent || '', body: record.body, criteria, governing })),
        sourceIdentity: hash(stableValue(source)), sourceCoverage: source.length ? 'declared' : 'manual', criteriaIds: criteria.map(c => c.id) };
}

function proofStatus(record, context) {
    if (!context.proofCache) return computeProofStatus(record, context);
    if (!context.proofCache.has(record)) context.proofCache.set(record, computeProofStatus(record, context));
    return context.proofCache.get(record);
}

function computeProofStatus(record, context) {
    let current;
    try { current = identities(record, context); }
    catch (error) { return { status: 'unknown', reason: 'Applicable intent or source is unavailable', code: error.code, proofIds: [] }; }
    if (!current.criteriaIds.length) return { status: 'missing', reason: 'Required acceptance criteria are missing', proofIds: [], ...current };
    const now = new Date().toISOString();
    const proofs = (record.tracking?.proofs || []).filter(p => validProof(p)
        && p.observedAt <= now && p.sourceIdentity === current.sourceIdentity && p.criteriaIdentity === current.criteriaIdentity
        && list(p.criteriaIds, id => current.criteriaIds.includes(id)) && p.criteriaIds.length > 0
        && (current.sourceCoverage !== 'manual' || p.kind === 'manual'));
    const latest = new Map();
    for (const proof of proofs) for (const id of proof.criteriaIds) {
        const previous = latest.get(id);
        if (!previous || proof.observedAt > previous.at) latest.set(id, { at: proof.observedAt, result: proof.result, proofIds: [proof.id] });
        else if (proof.observedAt === previous.at) {
            // Equal-time contradictions are unresolved; insertion order cannot grant confidence.
            if (proof.result !== 'passed') previous.result = proof.result;
            previous.proofIds.push(proof.id);
        }
    }
    const complete = current.criteriaIds.every(id => latest.get(id)?.result === 'passed');
    const proofIds = [...new Set([...latest.values()].filter(value => value.result === 'passed').flatMap(value => value.proofIds))];
    return { status: complete ? 'current' : (record.tracking?.proofs?.length ? 'stale' : 'missing'),
        reason: complete ? 'All required criteria have applicable passing proof' : 'Current applicable passing proof does not cover every criterion',
        proofIds, ...current };
}

function acceptanceStatus(record) {
    const history = record.tracking?.acceptanceHistory || [];
    const proofs = record.tracking?.proofs || [];
    const now = new Date().toISOString();
    const accepted = history.filter(a => validAcceptance(a, record.id) && a.acceptedAt <= now
        && a.criteriaIds.every(id => proofs.some(p => validProof(p) && a.proofIds.includes(p.id) && p.result === 'passed'
            && instant(p.observedAt) && p.observedAt <= a.acceptedAt && p.criteriaIdentity === a.criteriaIdentity
            && p.sourceIdentity === a.sourceIdentity && Array.isArray(p.criteriaIds) && p.criteriaIds.includes(id))));
    return { accepted: record.data.status === 'done' && accepted.length > 0, historyCount: accepted.length };
}

/**
 * Whether a prerequisite is met. Delivery work is met once it is accepted with proof that is still current, and an
 * initiative once it is closed as done. An area is never met: it is a place for work, not something that finishes.
 * Retired work meets nothing.
 */
function prerequisiteMet(dependency, context) {
    if (!dependency || dependency.data.status !== 'done' || dependency.tracking?.retired) return false;
    if (!inDelivery(dependency)) return lifecycleOf(dependency.kind)?.name === 'tracker';
    return proofStatus(dependency, context).status === 'current' && acceptanceStatus(dependency).accepted;
}

/**
 * Why an unmet prerequisite is unmet, in words that show the way on. An area never becomes met, so waiting for it helps
 * nobody: the link is the thing to change. An open initiative becomes met by the decision that closes it. Everything
 * else is unresolved or not currently verified. In every reason the identity is a word of its own, which is how a
 * reader of the reasons finds the prerequisite it names.
 */
function unmetPrerequisite(id, dependency) {
    if (dependency?.kind === AREA_KIND) return `Prerequisite ${id} is an area, and an area is never finished: depend on the work that is needed instead, or remove the link`;
    if (dependency?.kind === INITIATIVE_KIND && dependency.data.status !== 'done') return `Prerequisite ${id} is an initiative that is not closed as done`;
    return `Prerequisite ${id} is unresolved or not currently verified`;
}

function prerequisiteReasons(record, records, context, findings) {
    const analysis = analysisFor(records, context);
    if (analysis !== context.recordAnalysis) context = { ...context, recordAnalysis: analysis, proofCache: undefined };
    const related = !findings || findings === analysis.findings ? analysis.findingsByItem.get(record.id) || []
        : findings.filter(f => f.itemId === record.id);
    const reasons = related.map(f => f.reason);
    const index = analysis.index;
    for (const link of record.tracking?.links || []) if (link.relation === 'dependency') {
        const dependency = index.get(link.itemId);
        if (!prerequisiteMet(dependency, context)) reasons.push(unmetPrerequisite(link.itemId, dependency));
    }
    return reasons;
}

function requireReady(record, records, context, authorization = false) {
    if (context.recordAnalysis?.records !== records) context = bindRecordContext(context, records);
    const t = record.tracking;
    const current = identities(record, context);
    if (!string(record.data.intent || '') || !current.criteriaIds.length || !authorization
        || !validReadiness(t?.readiness) || t.readiness.at > new Date().toISOString()
        || t.readiness.criteriaIdentity !== current.criteriaIdentity) fail('NOT_READY', 'Required scope, reviewed decisions, or readiness approval is unresolved');
    if (prerequisiteReasons(record, records, context).length) fail('NOT_READY', 'Current prerequisites are unresolved');
}

/**
 * Whether a state change is a correction, after checking what either form needs. A usual step follows the table of the
 * record's lifecycle. A correction is a person's explicit decision to place a record in another state of its own
 * lifecycle, whatever state it is in: reopening canceled work, or undoing a step taken by mistake. It needs its own
 * authority and a reason.
 */
function stateCorrection(lifecycle, before, patch, authority) {
    const after = patch.state;
    const correction = patch.correction === true;
    if (patch.correction !== undefined && !correction) fail('INVALID_INPUT', 'A state correction is declared as true or left out');
    if (correction) {
        if (authority.automatic || authority.canCorrectState !== true) fail('NOT_PERMITTED', 'Changing state outside the usual steps needs an explicit action by a person');
        if (!lifecycle.states.includes(before) || !lifecycle.states.includes(after) || after === before) fail('INVALID_TRANSITION', 'Choose a recorded state other than the current one');
        if (!string(patch.reason)) fail('INVALID_INPUT', 'Changing state outside the usual steps needs a reason');
    } else if (!lifecycle.states.includes(before) || !lifecycle.transitions[before].includes(after)) fail('INVALID_TRANSITION', 'Transition is unavailable in the current state');
    return correction;
}

/**
 * A state change outside the delivery lifecycle. An initiative or an area moves by a person's recorded decision alone:
 * no readiness, assignee, proof or acceptance applies, and automatic upkeep never moves either. An initiative may be
 * closed while work linked to it is still open.
 */
function decidedTransition(record, patch, lifecycle, authority) {
    if (authority.automatic) fail('NOT_PERMITTED', 'Automatic upkeep never changes the state of an initiative or an area');
    for (const key of ['readiness', 'resolution']) if (patch[key] !== undefined) fail('INVALID_INPUT', `${key} applies to delivery work only`);
    const before = record.data.status;
    const after = patch.state;
    const correction = stateCorrection(lifecycle, before, patch, authority);
    // Every usual step of an initiative is a decision: approving, committing, closing, canceling and reopening. A
    // correction is one already, under its own authority. An area is canceled with a reason alone.
    if (lifecycle.name === 'tracker' && !correction && authority.canDecide !== true) fail('NOT_PERMITTED', 'Approving, committing, closing, canceling or reopening an initiative needs an explicit decision by a person');
    if (after === 'canceled' && !string(patch.reason)) fail('INVALID_INPUT', 'Cancellation needs a reason');
    if (lifecycle.name === 'tracker') {
        // Approval is where an initiative's intent is settled. A correction skips the usual steps, never that fact: it
        // places an initiative at approved or past it only with the intent approval requires.
        if (!string(record.data.intent)) {
            if (after === 'approved') fail('NOT_READY', 'Approval needs captured intent');
            if (correction && ['committed', 'done'].includes(after)) fail('NOT_READY', 'A correction to committed or done needs the captured intent that approval requires');
        }
        if ((after === 'done' || before === 'done') && !string(patch.reason)) fail('INVALID_INPUT', 'Closing or reopening an initiative needs a reason');
    }
    return { fields: { status: after }, tracking: {} };
}

function transition(record, patch, records, context, authority, at) {
    const lifecycle = lifecycleOf(record.kind);
    if (!inDelivery(record)) return decidedTransition(record, patch, lifecycle, authority);
    if (context.recordAnalysis?.records !== records) context = bindRecordContext(context, records);
    const before = record.data.status;
    const after = patch.state;
    // The state a correction lands in keeps every fact that state requires. Done is reached only through acceptance.
    const correction = stateCorrection(lifecycle, before, patch, authority);
    if (after === 'done') fail('MISSING_PROOF', 'Use an actual scoped acceptance action with current proof');
    if (after === PLANNED_STATE && !string(record.data.intent)) fail('NOT_READY', 'Planning needs captured intent');
    // Implemented states only that the work is built and published for review, so it asks for nothing but the intent
    // that says what was built. The facts verification needs are asked for on the step out of it.
    if (after === IMPLEMENTED_STATE && !string(record.data.intent)) fail('NOT_READY', 'Implemented work needs captured intent');
    const fromImplemented = before === IMPLEMENTED_STATE && !correction && ['in_progress', 'verifying'].includes(after);
    const changes = {};
    if (after === 'canceled') {
        if (!string(patch.reason)) fail('INVALID_INPUT', 'Cancellation needs a reason');
    }
    const active = ['in_progress', 'blocked', 'verifying'].includes(after);
    if (after === 'ready' || ((before === 'done' || before === 'ready') && after === 'in_progress') || fromImplemented || (correction && active)) {
        if (patch.readiness) {
            if (!authority.canReview || patch.readiness.reviewed !== true || patch.readiness.decisionsResolved !== true) fail('NOT_PERMITTED', 'Actual reviewed readiness approval is required');
            changes.readiness = { reviewed: true, decisionsResolved: true, actor: authority.actor, at, criteriaIdentity: identities(record, context).criteriaIdentity };
        }
        const ready = { ...record, tracking: { ...record.tracking, ...changes } };
        requireReady(ready, records, context, !!ready.tracking.readiness?.reviewed);
    }
    if (after === 'in_progress' || fromImplemented || (correction && active)) {
        if (!record.tracking?.assigneeId) fail('INVALID_MEMBER', 'Select a responsible member before starting');
        member(context, record.tracking.assigneeId);
        if (prerequisiteReasons(record, records, context).length) fail('NOT_READY', 'Current prerequisites are unresolved');
    }
    if (after === 'blocked') {
        if (!string(patch.reason)) fail('INVALID_INPUT', 'Blocker needs an observed reason');
        changes.blocker = { reason: patch.reason, resumeState: correction ? 'in_progress' : before, at, actor: authority.actor };
    }
    // A correction that lands outside blocked leaves no blocker behind: a cancellation keeps the one it found, and
    // carrying it into the corrected state would show work that is not blocked as blocked.
    if (correction) { if (after !== 'blocked' && (before === 'blocked' || record.tracking?.blocker)) changes.blocker = null; }
    else if (before === 'blocked' && after !== 'canceled') {
        if (record.tracking?.blocker?.resumeState !== after || !string(patch.resolution)) fail('INVALID_TRANSITION', 'Resume requires actual resolution and the prior active state');
        changes.blocker = null;
    }
    if (before === 'done' && after !== 'canceled' && !string(patch.reason)) fail('INVALID_INPUT', 'Reopening accepted work needs an explicit reason');
    return { fields: { status: after }, tracking: changes };
}

module.exports = { STATES, LINK_ROLES, string, list, object, HASH, instant, inDelivery, ownedValueProblem, overdue, member, validateMetadata, tagProblem, graphFindings, bindRecordContext,
    validProof, validHealth, healthStatus, identities, proofStatus, acceptanceStatus, prerequisiteReasons, requireReady, transition };
