'use strict';

const { LIMITS, ITEM_ID, KINDS } = require('./task-tracking-config.cjs');
const { readProgress } = require('./task-progress-reader.cjs');
const { fail } = require('./task-tracking-files.cjs');
const { object, tagProblem } = require('./task-tracking-policy.cjs');
const { sanitized } = require('./task-tracking.cjs');
const { AREA_KIND, INITIATIVE_KIND, LEVELS, TAG_ROLES, tagRole } = require('./task-tracking-vocabulary.cjs');

const AREA_TAG = tagRole(AREA_KIND);
const INITIATIVE_TAG = tagRole(INITIATIVE_KIND);
const QUERY_KEYS = Object.freeze(['schemaVersion', 'itemId', 'kind', 'title', 'intent', 'text', 'openAreaIds']);
// A placement read is small enough to read whole: every list is cut here, and what was cut is counted beside it.
const BOUNDS = Object.freeze({ queryChars: 20000, intentChars: 2000, titleChars: 160, terms: 64, evidence: 8, voters: 20, witnesses: 3,
    areas: 12, initiatives: 8, related: 12, specs: 6, roots: 50, openAreas: 16, children: 100, pathDepth: 8 });
// A word found only in a record's intent says less than one in its title; a word in the described title says more than one in its text.
const INTENT_SHARE = 0.4;
const TITLE_EMPHASIS = 2;
// A word that many records carry cannot tell them apart: it still counts a little, and it is never shown as the reason for a
// match. In a project of a few records a word is common only once more than COMMON_FLOOR of them carry it.
const COMMON_SHARE = 0.2;
const COMMON_FLOOR = 3;
// Similar work speaks for its tags only while it is at least this similar, relative to the most similar record.
const NEAREST_SHARE = 0.5;
// Two titles that share this much of their distinguishing words may be the same work.
const DUPLICATE_OVERLAP = 0.6;

function validatePlacementQuery(query) {
    if (!object(query) || Object.keys(query).some(key => !QUERY_KEYS.includes(key))) fail('INVALID_INPUT', `Placement accepts only ${QUERY_KEYS.join(', ')}`);
    if (query.schemaVersion !== 1) fail('UNSUPPORTED', 'Unsupported placement query version');
    for (const key of ['title', 'intent', 'text']) {
        if (query[key] !== undefined && (typeof query[key] !== 'string' || query[key].length > BOUNDS.queryChars)) fail('INVALID_INPUT', `Describe the record in bounded text: ${key} is at most ${BOUNDS.queryChars} characters`);
    }
    if (query.itemId !== undefined && (typeof query.itemId !== 'string' || !ITEM_ID.test(query.itemId))) fail('INVALID_INPUT', 'Select one exact item identity');
    if (query.kind !== undefined && !KINDS.includes(query.kind)) fail('INVALID_INPUT', `Kind invalid: use ${KINDS.join('|')}`);
    const openAreaIds = query.openAreaIds === undefined ? [] : query.openAreaIds;
    if (!Array.isArray(openAreaIds) || openAreaIds.some(id => typeof id !== 'string' || !ITEM_ID.test(id)) || new Set(openAreaIds).size !== openAreaIds.length) fail('INVALID_INPUT', 'Open exact area identities, each once');
    if (openAreaIds.length > BOUNDS.openAreas) fail('LIMIT_EXCEEDED', `Open at most ${BOUNDS.openAreas} areas in one read`);
    const described = ['title', 'intent', 'text'].some(key => typeof query[key] === 'string' && query[key].trim());
    if (query.itemId === undefined && !described && !openAreaIds.length) fail('INVALID_INPUT', 'Describe the record (title, intent or text), select one exact item, or open exact areas');
    return { schemaVersion: 1, itemId: query.itemId, kind: query.kind, title: query.title || '', intent: query.intent || '', text: query.text || '', openAreaIds: [...openAreaIds] };
}

/**
 * The words of a text that can tell one record from another: runs of letters and digits in any script, without case,
 * numbers alone left out, and a closing plural s dropped. The same folding is applied to both sides of every comparison,
 * so it never has to be right about a language, only consistent.
 */
function wordsOf(text) {
    const found = new Set();
    for (const word of String(text).normalize('NFKC').toLowerCase().match(/[\p{L}\p{N}]+/gu) || []) {
        if (word.length < 3 || /^\p{N}+$/u.test(word)) continue;
        found.add(word.length > 4 && word.endsWith('s') && !word.endsWith('ss') ? word.slice(0, -1) : word);
    }
    return found;
}

const short = value => { const text = String(value ?? ''); return text.length > BOUNDS.titleChars ? `${text.slice(0, BOUNDS.titleChars - 1)}…` : text; };
const rounded = value => Math.round(value * 1000) / 1000;
const byRank = (a, b) => b.rank - a.rank || (a.item.id < b.item.id ? -1 : a.item.id > b.item.id ? 1 : 0);
const levelDepth = item => (LEVELS.includes(item.level) ? LEVELS.indexOf(item.level) : LEVELS.length);

/** A cut list, with how many entries it held before the cut. */
function bounded(entries, limit) {
    return { candidates: entries.slice(0, limit), total: entries.length, omitted: Math.max(0, entries.length - limit) };
}

/**
 * Pure projection seam: production reads one consistent snapshot; a test can hand in any snapshot. The result ranks where
 * a described or an exact existing record may belong. Each candidate carries the words and the similar work that put it
 * there, so the reader can open it and judge. Nothing is selected, tagged or linked here.
 */
function projectPlacement(snapshot, query) {
    const selected = validatePlacementQuery(query);
    const owners = new Map();
    for (const item of snapshot.items || []) owners.set(item.id, owners.has(item.id) ? null : item);
    const admitted = [...owners.values()].filter(Boolean);
    const existing = selected.itemId === undefined ? undefined : owners.get(selected.itemId);
    if (selected.itemId !== undefined && !existing) fail(owners.has(selected.itemId) ? 'AMBIGUOUS_OWNER' : 'NOT_FOUND', 'Exact identity has no unique owner in the selected source; nothing was ranked for it');
    const kind = existing?.kind ?? selected.kind ?? null;

    const documents = admitted.map(item => ({ item, title: wordsOf(item.title), intent: wordsOf(String(item.intent || '').slice(0, BOUNDS.intentChars)) }));
    const frequency = new Map();
    for (const document of documents) for (const word of new Set([...document.title, ...document.intent])) frequency.set(word, (frequency.get(word) || 0) + 1);
    // A word no record carries is as rare as a word can be: it weighs on the total and can never be matched.
    const rarity = word => Math.log(1 + documents.length / (frequency.get(word) || 1));
    const distinguishing = word => frequency.has(word) && frequency.get(word) <= Math.max(COMMON_FLOOR, documents.length * COMMON_SHARE);

    const titleWords = new Set([...wordsOf(selected.title), ...(existing ? wordsOf(existing.title) : [])]);
    const otherWords = [...new Set([...wordsOf(selected.intent), ...wordsOf(selected.text), ...(existing ? wordsOf(String(existing.intent || '').slice(0, BOUNDS.intentChars)) : [])])]
        .filter(word => !titleWords.has(word) && frequency.has(word)).sort((a, b) => rarity(b) - rarity(a) || (a < b ? -1 : 1));
    const subjectWords = new Map([...[...titleWords].map(word => [word, rarity(word) * TITLE_EMPHASIS]), ...otherWords.map(word => [word, rarity(word)])].slice(0, BOUNDS.terms));
    const subjectWeight = [...subjectWords.values()].reduce((sum, weight) => sum + weight, 0);
    const titleWeight = [...titleWords].reduce((sum, word) => sum + rarity(word), 0);

    /** How much of the described record's weight a stored record carries, and the distinguishing words that say so. */
    const likeness = document => {
        let found = 0;
        const matched = [];
        for (const [word, weight] of subjectWords) {
            const share = document.title.has(word) ? 1 : document.intent.has(word) ? INTENT_SHARE : 0;
            if (!share) continue;
            found += weight * share;
            if (distinguishing(word)) matched.push(word);
        }
        matched.sort((a, b) => rarity(b) - rarity(a) || (a < b ? -1 : 1));
        return { text: subjectWeight ? found / subjectWeight : 0, matched: matched.slice(0, BOUNDS.evidence) };
    };
    /** The share of two titles' distinguishing weight that both carry. */
    const titleOverlap = document => {
        if (!titleWords.size || !document.title.size) return 0;
        let both = 0;
        let either = titleWeight;
        for (const word of document.title) { if (titleWords.has(word)) both += rarity(word); else either += rarity(word); }
        return either ? both / either : 0;
    };

    // A tag counts here exactly when the tracker's own tag rule accepts it, so a placement read and a scope read agree.
    const tagsOf = (item, relation) => [...new Set((Array.isArray(item.links) ? item.links : []).filter(link => link?.relation === relation && typeof link.itemId === 'string'
        && !tagProblem(item, relation, link.itemId, owners.get(link.itemId))).map(link => link.itemId))].sort();
    const usable = item => item !== existing && item.state !== 'canceled' && !item.retired;
    const scored = documents.filter(document => document.item !== existing).map(document => ({ ...document, ...likeness(document) }));

    // Similar work says where work of this meaning already sits: each of the most similar records speaks for its own tags and specs.
    const similar = scored.filter(entry => entry.item.kind !== AREA_KIND && entry.matched.length).map(entry => ({ ...entry, rank: entry.text })).sort(byRank);
    // Only the nearest work speaks: records at least half as similar as the most similar one, within the voter bound.
    const voters = similar.filter(entry => entry.text >= similar[0].text * NEAREST_SHARE).slice(0, BOUNDS.voters);
    const voted = voters.reduce((sum, voter) => sum + voter.text, 0);
    const votes = new Map();
    const vote = (key, voter) => { if (!votes.has(key)) votes.set(key, { weight: 0, witnesses: [] }); const held = votes.get(key); held.weight += voter.text; held.witnesses.push(voter.item.id); };
    for (const voter of voters) {
        for (const id of tagsOf(voter.item, AREA_TAG)) vote(`area:${id}`, voter);
        for (const id of tagsOf(voter.item, INITIATIVE_TAG)) vote(`initiative:${id}`, voter);
        const specs = new Set((Array.isArray(voter.item.links) ? voter.item.links : []).filter(link => link?.relation === 'spec')
            .map(link => (typeof link.path === 'string' ? `path:${link.path.replace(/\\/g, '/')}` : typeof link.itemId === 'string' ? `item:${link.itemId}` : null)).filter(Boolean));
        for (const spec of specs) vote(`spec:${spec}`, voter);
    }
    const support = key => { const held = votes.get(key); return { similarWork: held && voted ? rounded(held.weight / voted) : 0, similarWorkIds: held ? held.witnesses.slice(0, BOUNDS.witnesses) : [] }; };

    // The area tree comes from each area's own tags, turned round once. An ended area is nobody's child here: it takes no more work.
    const areaItems = admitted.filter(item => item.kind === AREA_KIND);
    const parents = new Map(areaItems.map(item => [item.id, tagsOf(item, AREA_TAG)]));
    const children = new Map(areaItems.map(item => [item.id, []]));
    for (const item of areaItems) if (usable(item)) for (const parent of parents.get(item.id)) children.get(parent).push(item.id);
    const areaRow = item => ({ itemId: item.id, level: item.level ?? null, title: short(item.title), childAreaCount: (children.get(item.id) || []).length });
    /** One chain of areas above this one, outermost first. An area under several parents also states them all in parentAreaIds. */
    const pathOf = id => {
        const chain = [];
        const seen = new Set([id]);
        for (let above = (parents.get(id) || [])[0]; above !== undefined && !seen.has(above) && chain.length < BOUNDS.pathDepth; above = (parents.get(above) || [])[0]) {
            seen.add(above);
            const area = owners.get(above);
            if (!area) break;
            chain.unshift({ itemId: area.id, level: area.level ?? null, title: short(area.title) });
        }
        return chain;
    };
    const held = existing ? { areaIds: tagsOf(existing, AREA_TAG), initiativeIds: tagsOf(existing, INITIATIVE_TAG) } : { areaIds: [], initiativeIds: [] };
    /** Ranked by its own words plus the share of the similar work that already carries it. */
    const tagCandidates = (targetKind, relation, alreadyHeld, extra) => scored.filter(entry => entry.item.kind === targetKind && usable(entry.item))
        .map(entry => ({ ...entry, ...support(`${relation}:${entry.item.id}`) })).filter(entry => entry.matched.length || entry.similarWork > 0)
        .map(entry => ({ ...entry, rank: entry.text + entry.similarWork })).sort(byRank)
        .map(entry => ({ itemId: entry.item.id, title: short(entry.item.title), state: entry.item.state, ...extra(entry.item), score: rounded(entry.rank), text: rounded(entry.text), matched: entry.matched,
            similarWork: entry.similarWork, similarWorkIds: entry.similarWorkIds, alreadyTagged: alreadyHeld.includes(entry.item.id) }));

    const areas = tagCandidates(AREA_KIND, AREA_TAG, held.areaIds, item => ({ level: item.level ?? null, parentAreaIds: [...(parents.get(item.id) || [])], path: pathOf(item.id) }));
    const initiatives = kind === AREA_KIND ? [] : tagCandidates(INITIATIVE_KIND, INITIATIVE_TAG, held.initiativeIds, item => ({ type: item.type ?? null, areaIds: tagsOf(item, AREA_TAG) }));
    const related = similar.map(entry => ({ itemId: entry.item.id, kind: entry.item.kind, title: short(entry.item.title), state: entry.item.state, retired: !!entry.item.retired,
        score: rounded(entry.text), matched: entry.matched, areaIds: tagsOf(entry.item, AREA_TAG), initiativeIds: tagsOf(entry.item, INITIATIVE_TAG),
        possibleDuplicate: (kind === null || entry.item.kind === kind) && titleOverlap(entry) >= DUPLICATE_OVERLAP }));
    const specs = [...votes].filter(([key]) => key.startsWith('spec:')).map(([key, value]) => ({ key: key.slice(5), ...support(key), weight: value.weight }))
        .sort((a, b) => b.weight - a.weight || (a.key < b.key ? -1 : 1))
        .map(entry => ({ ...(entry.key.startsWith('path:') ? { path: entry.key.slice(5) } : { itemId: entry.key.slice(5) }), similarWork: entry.similarWork, similarWorkIds: entry.similarWorkIds }));

    const roots = areaItems.filter(item => usable(item) && !(parents.get(item.id) || []).length)
        .sort((a, b) => levelDepth(a) - levelDepth(b) || (a.id < b.id ? -1 : 1)).map(areaRow);
    const opened = selected.openAreaIds.map(id => {
        const area = owners.get(id);
        if (area?.kind !== AREA_KIND) return { itemId: id, status: 'not-found', children: [], total: 0, omitted: 0 };
        const rows = (children.get(id) || []).map(child => owners.get(child)).filter(Boolean).sort((a, b) => levelDepth(a) - levelDepth(b) || (a.id < b.id ? -1 : 1)).map(areaRow);
        return { ...areaRow(area), status: 'found', path: pathOf(id), children: rows.slice(0, BOUNDS.children), total: rows.length, omitted: Math.max(0, rows.length - BOUNDS.children) };
    });

    const findings = {};
    for (const finding of snapshot.diagnostics || []) if (typeof finding?.code === 'string') findings[finding.code] = (findings[finding.code] || 0) + 1;
    const links = existing ? (Array.isArray(existing.links) ? existing.links : []).filter(link => object(link) && !Object.hasOwn(TAG_ROLES, link.relation))
        .map(link => ({ relation: link.relation, ...(typeof link.itemId === 'string' ? { itemId: link.itemId } : { path: String(link.path ?? '').replace(/\\/g, '/') }) })) : [];
    const subject = { ...(existing ? { itemId: existing.id, state: existing.state, revision: existing.revision, contentHash: existing.contentHash } : {}), kind,
        title: short(existing ? existing.title : selected.title),
        words: [...subjectWords].filter(([word]) => distinguishing(word)).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, BOUNDS.evidence * 2).map(([word]) => word),
        ...(existing ? { placed: { ...held, links }, untagged: [...(kind === AREA_KIND || held.areaIds.length ? [] : [AREA_TAG]), ...(kind === AREA_KIND || held.initiativeIds.length ? [] : [INITIATIVE_TAG])] } : {}) };
    const rootList = bounded(roots, BOUNDS.roots);
    const result = sanitized({ schemaVersion: 1, coverage: snapshot.coverage, source: snapshot.source, asOf: snapshot.asOf, snapshotFingerprint: snapshot.fingerprint, subject,
        areas: { ...bounded(areas, BOUNDS.areas), roots: rootList.candidates, omittedRoots: rootList.omitted, opened },
        initiatives: { ...bounded(initiatives, BOUNDS.initiatives), ...(kind === AREA_KIND ? { notApplicable: 'An area carries no initiative link' } : {}) },
        related: bounded(related, BOUNDS.related), specs: bounded(specs, BOUNDS.specs), findings,
        inspection: { records: admitted.length, areas: areaItems.length, similarWorkRead: voters.length, bounds: { ...BOUNDS } },
        authority: 'Read diagnostic only; a candidate is a lead to open and judge, never a selection, a tag or a link' });
    if (Buffer.byteLength(JSON.stringify(result)) > LIMITS.recordBytes) fail('LIMIT_EXCEEDED', 'Placement result exceeds the byte budget; describe the record in fewer words or open fewer areas');
    return result;
}

/** Ranks where a described or an exact existing record may belong, from one read of the selected source. A read only. */
function readPlacement(root, query, options = {}) {
    const selected = validatePlacementQuery(query);
    if (!object(options) || Object.keys(options).some(key => key !== 'ref')) fail('INVALID_INPUT', 'Placement supports only the selected local reference');
    const snapshot = readProgress(root, options);
    return snapshot.coverage === 'unavailable' ? snapshot : projectPlacement(snapshot, selected);
}

module.exports = { validatePlacementQuery, projectPlacement, readPlacement, wordsOf };
