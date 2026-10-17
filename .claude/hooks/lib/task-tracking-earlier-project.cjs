'use strict';

/**
 * The one mapping of a project stored in the earlier vocabulary to the current terms.
 *
 * The two vocabularies differ in structure: a group kept the list of its members, where each record now names its own
 * areas and initiatives. No record can therefore be put into current terms by itself, and the whole project is mapped at
 * once. Both readers of an earlier project (the working copy and a pinned commit) show this mapping's result, and the
 * migration writes exactly that result, so what is read before a migration is what is stored after it.
 *
 * Pure: it reads the records it is given and nothing else, and changes none of them. The single-word facts it applies
 * (which kinds were groups, what each purpose and state becomes) belong to the vocabulary owner.
 */

const vocabulary = require('./task-tracking-vocabulary.cjs');
const { BASE_VERSION, EARLIER_VERSION, EARLIER, EARLIER_MAPPING: MAPPING, FOLDERS, LEVELS, AREA_KIND, INITIATIVE_KIND, tagRole } = vocabulary;

const AREA_TAG = tagRole(AREA_KIND);
const INITIATIVE_TAG = tagRole(INITIATIVE_KIND);
const TAGS = Object.freeze([AREA_TAG, INITIATIVE_TAG]);
const slashed = value => value.replace(/\\/g, '/');
const byText = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const mapping = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const isGroupKind = kind => MAPPING.groupKinds.includes(kind);

/** The kind a group becomes: a finite outcome is an initiative, every other group an area. */
const groupKind = purpose => (purpose === MAPPING.initiativePurpose ? INITIATIVE_KIND : AREA_KIND);

/** Where a group's record is kept once converted: the same path below the location of the kind it becomes. Null for a record outside its own kind's location. */
function destination(artifactsRoot, group) {
    if (!Object.hasOwn(EARLIER.folders, group.kind)) return null;
    const root = slashed(artifactsRoot);
    const location = `${root}/${EARLIER.folders[group.kind]}/`;
    const stored = slashed(group.from);
    return stored.startsWith(location) ? `${root}/${FOLDERS[groupKind(group.purpose)]}/${stored.slice(location.length)}` : null;
}

/**
 * The member index of a stored earlier project: every group with its kind, its purpose, where it is kept, where it will
 * be kept and the identities it lists, in identity order. It holds identities and paths only. A group's own list is the
 * one place membership was stored, so the index is taken before any record changes and cannot be taken again afterwards.
 */
function memberIndex(records, artifactsRoot) {
    const groups = [];
    for (const record of records) {
        if (!isGroupKind(record.kind)) continue;
        const listed = record.tracking?.[MAPPING.memberField];
        const purpose = record.tracking?.[MAPPING.purposeField];
        const group = { id: record.id, kind: record.kind, purpose: typeof purpose === 'string' ? purpose : null, from: slashed(record.ownerPath) };
        groups.push({ ...group, to: destination(artifactsRoot, group), members: [...new Set((Array.isArray(listed) ? listed : []).filter(id => typeof id === 'string'))] });
    }
    return { groups: groups.sort((a, b) => byText(a.id, b.id) || byText(a.from, b.from)) };
}

/** The state a record of the given current kind holds for the state it stored. Delivery work keeps its state. */
function currentState(kind, state) {
    if (kind === AREA_KIND) return Object.hasOwn(MAPPING.areaStates, state) ? MAPPING.areaStates[state] : MAPPING.areaState;
    if (kind === INITIATIVE_KIND) return Object.hasOwn(MAPPING.initiativeStates, state) ? MAPPING.initiativeStates[state] : state;
    return state;
}

/**
 * Maps a whole earlier project. `records` are its records as stored; `index` is the member index, taken from those
 * records unless one recorded earlier is given, as a migration that was interrupted gives the one it recorded before its
 * first change. A record already stamped current was written by that migration and is left as it is.
 *
 * Returns the index, one conversion per stored record that is not yet current (its kind, its state and its tracking
 * metadata in the current terms, with every stored path as stored), and what a person is told about the mapping:
 * `moves` (each group record's present and future path), `crossings` (a group of one kind listing a group of the other:
 * the listing is not kept and the work beneath the listed group is linked itself), `nested` (an initiative listing an
 * initiative: the listing is kept, and the work beneath is linked itself because an initiative holds only what links to
 * it directly), `levelsUnset` (a level left unset because it would put an area under a deeper one) and `problems`
 * (what keeps the stored project from being stated in the current terms without loss).
 */
function mapEarlierProject({ records, artifactsRoot, index = memberIndex(records, artifactsRoot) }) {
    const groups = new Map();
    for (const group of index.groups) if (!groups.has(group.id)) groups.set(group.id, group);
    const stored = new Map();
    for (const record of records) if (!stored.has(record.id)) stored.set(record.id, record);
    const known = id => groups.has(id) || stored.has(id);
    const becomes = id => groupKind(groups.get(id).purpose);
    const problems = [];

    // Which groups list each group, itself aside.
    const listedBy = new Map([...groups.keys()].map(id => [id, []]));
    for (const group of groups.values()) for (const member of group.members) if (member !== group.id && groups.has(member)) listedBy.get(member).push(group.id);

    // An area's level comes from its purpose. One that would sit under a deeper area is left unset: an unset level constrains nothing.
    const rank = level => LEVELS.indexOf(level);
    const proposed = new Map();
    for (const group of groups.values()) if (becomes(group.id) === AREA_KIND) {
        const nested = group.purpose === MAPPING.nesting.purpose && listedBy.get(group.id).some(parent => groups.get(parent).purpose === MAPPING.nesting.purpose);
        proposed.set(group.id, nested ? MAPPING.nesting.level : Object.hasOwn(MAPPING.purposeLevels, group.purpose) ? MAPPING.purposeLevels[group.purpose] : null);
    }
    const levels = new Map();
    const levelsUnset = [];
    for (const [id, level] of proposed) {
        const deeper = level === null ? [] : listedBy.get(id).filter(parent => proposed.get(parent) && rank(proposed.get(parent)) > rank(level)).sort(byText);
        levels.set(id, deeper.length ? null : level);
        if (deeper.length) levelsUnset.push({ itemId: id, level, parentId: deeper[0], parentLevel: proposed.get(deeper[0]) });
    }

    // The links each record gains, by relation, as sets of the groups that held it.
    const gained = new Map();
    const gain = (id, relation, groupId) => {
        if (!gained.has(id)) gained.set(id, Object.fromEntries(TAGS.map(tag => [tag, new Set()])));
        gained.get(id)[relation].add(groupId);
    };
    // Everything beneath a group that is not itself a group, followed through every group it lists, each record once.
    const beneath = id => {
        const found = new Set();
        const entered = new Set();
        const pending = [id];
        while (pending.length) {
            const current = pending.pop();
            if (entered.has(current)) continue;
            entered.add(current);
            for (const member of groups.get(current).members) {
                if (groups.has(member)) pending.push(member);
                else if (stored.has(member)) found.add(member);
            }
        }
        return [...found].sort(byText);
    };
    const crossings = [];
    const nested = [];
    for (const group of groups.values()) {
        const relation = becomes(group.id) === AREA_KIND ? AREA_TAG : INITIATIVE_TAG;
        for (const member of group.members) {
            if (!known(member)) { problems.push({ code: 'MEMBER_NOT_FOUND', groupId: group.id, memberId: member }); continue; }
            if (!groups.has(member)) { gain(member, relation, group.id); continue; }
            const alike = becomes(member) === becomes(group.id);
            if (alike) gain(member, relation, group.id);
            // An area already holds what is beneath the areas under it. An initiative holds only what links to it
            // directly, and a listing between the two kinds is not kept: in both cases the work beneath is linked itself.
            if (alike && relation === AREA_TAG) continue;
            const taggedIds = beneath(member);
            for (const id of taggedIds) gain(id, relation, group.id);
            (alike ? nested : crossings).push({ groupId: group.id, listedId: member, relation, taggedIds });
        }
    }

    const conversions = new Map();
    for (const record of records) {
        // Already written in the current terms by the migration this mapping serves.
        if (record.storedVersion === BASE_VERSION) continue;
        const group = isGroupKind(record.kind) ? groups.get(record.id) : null;
        if (isGroupKind(record.kind) && !group) { problems.push({ code: 'UNINDEXED_GROUP', itemId: record.id, path: record.ownerPath }); continue; }
        if (group && group.purpose !== null && !EARLIER.groupRoles.includes(group.purpose)) problems.push({ code: 'INVALID_RECORD', itemId: record.id, reason: 'Group purpose is not one the earlier vocabulary has' });
        const t = record.tracking;
        if (!group && Array.isArray(t?.[MAPPING.memberField]) && t[MAPPING.memberField].length) problems.push({ code: 'INVALID_RECORD', itemId: record.id, reason: 'A record that is not a group holds a member list' });
        if (group && t && t[MAPPING.memberField] !== undefined && (!Array.isArray(t[MAPPING.memberField]) || t[MAPPING.memberField].some(id => typeof id !== 'string'))) problems.push({ code: 'INVALID_RECORD', itemId: record.id, reason: 'Member list is malformed' });
        const kind = group ? groupKind(group.purpose) : record.kind;
        const status = currentState(kind, record.data.status);
        const tags = gained.get(record.id);
        const added = Object.fromEntries(TAGS.map(relation => [relation, [...(tags?.[relation] || [])].sort(byText)]));
        // What the current vocabulary adds for the kind: an area's level, an initiative's type.
        const owned = { ...(kind === AREA_KIND && group ? { level: levels.get(record.id) ?? null } : {}),
            ...(kind === INITIATIVE_KIND ? { type: group ? MAPPING.types.group : MAPPING.types.proposal } : {}) };
        if (!t) {
            // A record without tracking metadata gains none. One that would gain a link cannot carry it, which is named.
            const links = TAGS.flatMap(relation => added[relation].map(itemId => ({ relation, itemId })));
            if (links.length) problems.push({ code: 'MEMBER_WITHOUT_TRACKING', itemId: record.id, path: record.ownerPath, groupIds: [...new Set(links.map(link => link.itemId))].sort(byText) });
            conversions.set(record, { kind, status, tracking: null, added, uncarried: links.length ? { links, ...(kind === INITIATIVE_KIND ? owned : {}) } : null, group });
            continue;
        }
        const links = Array.isArray(t.links) ? t.links : [];
        const has = (relation, itemId) => links.some(link => link?.relation === relation && link.itemId === itemId);
        const more = TAGS.flatMap(relation => added[relation].filter(id => !has(relation, id)).map(itemId => ({ relation, itemId })));
        if (more.length && t.links !== undefined && !Array.isArray(t.links)) problems.push({ code: 'INVALID_RECORD', itemId: record.id, reason: 'Links are malformed' });
        const { [MAPPING.memberField]: listed, [MAPPING.purposeField]: purpose, ...kept } = t;
        const tracking = { ...kept, schemaVersion: BASE_VERSION, kind,
            ...(more.length && (t.links === undefined || Array.isArray(t.links)) ? { links: [...links, ...more] } : {}),
            // A receipt names the kind its record had when it was saved; it follows the record's kind.
            ...(kind !== record.kind && Array.isArray(t.receipts) ? { receipts: t.receipts.map(receipt => (mapping(receipt) && mapping(receipt.result) && receipt.result.kind === record.kind
                ? { ...receipt, result: { ...receipt.result, kind } } : receipt)) } : {}),
            ...owned };
        conversions.set(record, { kind, status, tracking, added: Object.fromEntries(TAGS.map(relation => [relation, more.filter(link => link.relation === relation).map(link => link.itemId)])), uncarried: null, group });
    }
    return { index, conversions, moves: index.groups.map(group => ({ itemId: group.id, from: group.from, to: group.to })), crossings, nested, levelsUnset, problems };
}

/** What a reader is told about a mapped project beyond its records: each listing that names no record. */
function findings(mapped) {
    return mapped.problems.filter(problem => ['MEMBER_NOT_FOUND', 'INVALID_RECORD'].includes(problem.code)).map(problem => (problem.code === 'MEMBER_NOT_FOUND'
        ? { itemId: problem.groupId, code: problem.code, reason: `Listed identity ${problem.memberId} has no record` }
        : { itemId: problem.itemId, code: problem.code, reason: problem.reason }));
}

/**
 * An earlier project as both readers show it: every stored record with the mapping's kind, state and tracking metadata
 * over its stored bytes, location and revision. Each is marked as read from the earlier vocabulary, so it is never a
 * base for writing. A listed record without tracking metadata is shown with the links it would carry, held in memory
 * only, so that every area and initiative shows the work it held.
 */
function currentProject(records, artifactsRoot) {
    const mapped = mapEarlierProject({ records, artifactsRoot });
    return { diagnostics: findings(mapped), records: records.map(record => {
        const conversion = mapped.conversions.get(record);
        if (!conversion) return { ...record, storedVocabulary: EARLIER_VERSION };
        return { ...record, kind: conversion.kind, data: conversion.status === record.data.status ? record.data : { ...record.data, status: conversion.status },
            tracking: conversion.tracking || conversion.uncarried, storedVocabulary: EARLIER_VERSION };
    }) };
}

/** Tracking metadata with every stored link path and receipt location passed through `movedPath`, which answers where a moved record now is. */
function relocated(tracking, movedPath) {
    const moved = (value, key) => (mapping(value) && typeof value[key] === 'string' && movedPath(value[key]) !== value[key] ? { ...value, [key]: movedPath(value[key]) } : value);
    return { ...tracking,
        ...(Array.isArray(tracking.links) ? { links: tracking.links.map(link => moved(link, 'path')) } : {}),
        ...(Array.isArray(tracking.receipts) ? { receipts: tracking.receipts.map(receipt => (mapping(receipt) && moved(receipt.result, 'ownerPath') !== receipt.result
            ? { ...receipt, result: moved(receipt.result, 'ownerPath') } : receipt)) } : {}) };
}

module.exports = { TAGS, groupKind, destination, memberIndex, mapEarlierProject, currentProject, relocated };
