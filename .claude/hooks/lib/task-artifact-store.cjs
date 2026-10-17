'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { TextDecoder } = require('node:util');
const { LIMITS, KINDS, FOLDERS, ITEM_ID, relativePath } = require('./task-tracking-config.cjs');
const { fail, hash, scopedPath, readBytes, publishBytes } = require('./task-tracking-files.cjs');
const vocabulary = require('./task-tracking-vocabulary.cjs');
const { CURRENT_VERSION, BASE_VERSION, EARLIER_VERSION, RETIRED_VERSION } = vocabulary;

const TRACKING_FIELDS = ['schemaVersion', 'revision', 'kind', 'assigneeId', 'collaboratorIds', 'criteria', 'readiness',
    'links', 'level', 'type', 'priorityLevel', 'deadline', 'blocker', 'proofs', 'acceptanceHistory', 'history', 'receipts', 'context', 'activity', 'optOut', 'retired', 'health', 'memberProfiles'];
let yaml;
function parser() {
    if (yaml) return yaml;
    try {
        const base = path.resolve(__dirname, '../../skills/task-track/node_modules/yaml');
        if (require(path.join(base, 'package.json')).version !== '2.9.1') fail('MISSING_PARSER', 'Install the pinned task-track dependency');
        yaml = require(base);
        return yaml;
    } catch (error) { fail('MISSING_PARSER', 'Run npm ci --ignore-scripts in the task-track package before tracking operations'); }
}

function mappingField(map, name) {
    return parser().isMap(map) ? map.items.find(pair => parser().isScalar(pair.key) && pair.key.value === name) : undefined;
}

/**
 * `version` names the vocabulary the record is expected to store; its stamp (`tracking.schemaVersion`) must be one
 * that version reads: its own, or an earlier version of the same structure. A record stamped for an earlier vocabulary
 * where the current structure is expected is named as such, never reinterpreted, and so is one stamped for a later
 * version than the expected one.
 */
function parseRecord(bytes, ownerPath, kind, version = CURRENT_VERSION) {
    if (!Buffer.isBuffer(bytes) || bytes.length > LIMITS.recordBytes) fail('LIMIT_EXCEEDED', 'Record exceeds the byte budget');
    let text;
    try { text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes); }
    catch { fail('UNSUPPORTED', 'Record is not valid UTF-8; original bytes preserved'); }
    const opening = /^(?:\uFEFF)?---\r?\n/.exec(text);
    if (!opening) fail('UNSUPPORTED', 'Record has no supported Markdown frontmatter');
    const closing = /^---(?:\r?\n|$)/m.exec(text.slice(opening[0].length));
    if (!closing) fail('UNSUPPORTED', 'Record frontmatter is incomplete');
    const start = opening[0].length;
    const end = start + closing.index;
    const header = text.slice(start, end);
    const y = parser();
    const document = y.parseDocument(header, { uniqueKeys: true, prettyErrors: false });
    if (document.errors.length || document.warnings.length || !y.isMap(document.contents)) fail('UNSUPPORTED', 'Ambiguous or malformed YAML; original bytes preserved');
    let unsupported = false;
    y.visit(document, {
        Node(_key, node) { if (y.isAlias(node) || node.anchor || node.tag) { unsupported = true; return y.visit.BREAK; } },
        Pair(_key, pair) {
            if (!y.isScalar(pair.key) || typeof pair.key.value !== 'string' || pair.key.value === '<<') { unsupported = true; return y.visit.BREAK; }
        }
    });
    if (unsupported) fail('UNSUPPORTED', 'YAML tags, anchors, aliases, merge keys, or complex keys are unsupported');
    const data = document.toJS({ maxAliasCount: 0 });
    if (typeof data.id !== 'string' || !ITEM_ID.test(data.id) || typeof data.title !== 'string' || !data.title.trim()
        || typeof data.status !== 'string') fail('UNSUPPORTED', 'Record identity, title, or recorded status is missing');
    const tracking = data.tracking;
    const mapping = tracking !== null && typeof tracking === 'object' && !Array.isArray(tracking);
    if (mapping && vocabulary.inCurrentStructure(version) && [EARLIER_VERSION, RETIRED_VERSION].includes(tracking.schemaVersion))
        throw Object.assign(new Error(vocabulary.REFUSALS.EARLIER_VOCABULARY_RECORD), { code: 'EARLIER_VOCABULARY_RECORD', itemId: data.id, storedVersion: tracking.schemaVersion });
    if (mapping && vocabulary.inCurrentStructure(version) && vocabulary.inCurrentStructure(tracking.schemaVersion) && tracking.schemaVersion > version)
        throw Object.assign(new Error(`Record is stamped for vocabulary version ${tracking.schemaVersion} and this project stores version ${version}; declare taskTracking.schemaVersion ${tracking.schemaVersion} in the project configuration to read it`),
            { code: 'LATER_VOCABULARY_RECORD', itemId: data.id, storedVersion: tracking.schemaVersion });
    if (tracking !== undefined && (!mapping
        || !vocabulary.readableStamps(version).includes(tracking.schemaVersion) || !Number.isSafeInteger(tracking.revision) || tracking.revision < 1
        || !vocabulary.wordsFor(version).kinds.includes(tracking.kind) || (kind && tracking.kind !== kind))) fail('UNSUPPORTED', 'Custom or unsupported tracking metadata is preserved without adoption');
    const newline = header.includes('\r\n') ? '\r\n' : '\n';
    return { id: data.id, kind: tracking?.kind || kind, ownerPath, data, tracking: tracking || null,
        revision: tracking?.revision || 0, contentHash: hash(bytes), bytes, text, header, start, end,
        body: text.slice(end + closing[0].length), document, newline };
}

function valueEdit(header, map, name, value, newline) {
    const pair = mappingField(map, name);
    const encoded = JSON.stringify(value);
    if (encoded === undefined) fail('INVALID_INPUT', 'Undefined metadata values are unsupported');
    if (pair) {
        const range = pair.value?.range;
        if (!range || !Number.isInteger(range[0]) || !Number.isInteger(range[1])) fail('UNSUPPORTED', 'Owned YAML value has no safe replacement range');
        return { start: range[0], end: range[1], value: encoded + (header[range[1] - 1] === '\n' ? newline : '') };
    }
    if (map.flow) {
        const end = map.range[1] - 1;
        if (header[end] !== '}') fail('UNSUPPORTED', 'Flow mapping cannot be safely extended');
        return { start: end, end, value: `${map.items.length ? ', ' : ''}${JSON.stringify(name)}: ${encoded}` };
    }
    const firstKey = map.items[0]?.key?.range?.[0];
    const indent = firstKey === undefined ? '' : header.slice(header.lastIndexOf('\n', firstKey - 1) + 1, firstKey);
    if (!/^ *$/.test(indent)) fail('UNSUPPORTED', 'Mapping indentation cannot be safely extended');
    let end = map.range[1];
    if (end > 0 && header[end - 1] !== '\n') {
        const lineEnd = header.indexOf('\n', end);
        if (lineEnd < 0) return { start: end, end, value: `${newline}${indent}${name}: ${encoded}${newline}` };
        end = lineEnd + 1;
    }
    return { start: end, end, value: `${indent}${name}: ${encoded}${newline}` };
}

/** Patch owned values only. Authored body and every untouched interval remain exact bytes. */
function patchRecord(record, fields, tracking) {
    // A record read from an earlier-vocabulary project holds current words beside its stored bytes; it is never a write base.
    if (record.storedVocabulary !== undefined) fail('MIGRATION_REQUIRED', vocabulary.REFUSALS.MIGRATION_REQUIRED);
    const edits = [];
    const root = record.document.contents;
    for (const [key, value] of Object.entries(fields)) {
        if (!['title', 'intent', 'status', 'priority', 'assigned_to'].includes(key)) fail('INVALID_INPUT', 'Field is not owned by the tracking writer');
        if (JSON.stringify(record.data[key]) !== JSON.stringify(value)) edits.push(valueEdit(record.header, root, key, value, record.newline));
    }
    const node = mappingField(root, 'tracking')?.value;
    // Retained extensions carry no write authority; only existing equal values pass.
    for (const [key, value] of Object.entries(tracking)) {
        if (!TRACKING_FIELDS.includes(key) && (!record.tracking || !Object.hasOwn(record.tracking, key)
            || stableValue(record.tracking[key]) !== stableValue(value))) fail('INVALID_INPUT', 'Tracking field is not owned');
    }
    if (record.tracking) {
        if (!parser().isMap(node)) fail('UNSUPPORTED', 'Tracking metadata is not a writable mapping');
        for (const [key, value] of Object.entries(tracking)) {
            if (stableValue(record.tracking[key]) !== stableValue(value)) edits.push(valueEdit(record.header, node, key, value, record.newline));
        }
    } else if (Object.keys(tracking).length) edits.push(valueEdit(record.header, root, 'tracking', tracking, record.newline));
    const combined = [];
    for (const edit of edits.sort((a, b) => a.start - b.start || a.end - b.end)) {
        const previous = combined[combined.length - 1];
        if (previous && previous.start === edit.start && previous.end === edit.end && edit.start === edit.end) previous.value += edit.value;
        else { if (previous && previous.end > edit.start) fail('UNSUPPORTED', 'Overlapping owned fields cannot be safely patched'); combined.push({ ...edit }); }
    }
    let header = record.header;
    for (const edit of combined.reverse()) header = header.slice(0, edit.start) + edit.value + header.slice(edit.end);
    const bytes = Buffer.from(record.text.slice(0, record.start) + header + record.text.slice(record.end), 'utf8');
    const candidate = parseRecord(bytes, record.ownerPath, record.kind);
    if (candidate.body !== record.body) fail('UNSUPPORTED', 'Candidate changed authored body');
    // A record without tracking metadata keeps none when no tracking value is written.
    const expected = { ...record.data, ...fields, ...(record.tracking || Object.keys(tracking).length ? { tracking: { ...(record.tracking || {}), ...tracking } } : {}) };
    if (JSON.stringify(candidate.data) !== JSON.stringify(expected)) {
        // YAML key order is not authority; compare sorted semantic values.
        if (stableValue(candidate.data) !== stableValue(expected)) fail('UNSUPPORTED', 'Candidate does not preserve the expected record semantics');
    }
    return candidate;
}

function stableValue(value, depth = 0) {
    if (depth > 32) fail('LIMIT_EXCEEDED', 'Metadata nesting exceeds the supported budget');
    if (Array.isArray(value)) return `[${value.map(v => stableValue(v, depth + 1)).join(',')}]`;
    if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableValue(value[key], depth + 1)}`).join(',')}}`;
    return JSON.stringify(value);
}

function newRecord({ id, kind, title, intent, tracking }, context) {
    if (!ITEM_ID.test(id) || !KINDS.includes(kind)) fail('INVALID_INPUT', 'Invalid item identity or kind');
    const ownerPath = `${context.artifactsRoot}/${FOLDERS[kind]}/${id}.md`;
    // A new record starts in the first state of its kind's lifecycle.
    const header = { id, title, intent, status: vocabulary.lifecycleOf(kind).initial, tracking };
    const bytes = Buffer.from(`---\n${Object.entries(header).map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join('\n')}\n---\n\n`, 'utf8');
    return parseRecord(bytes, ownerPath, kind);
}

/**
 * Walks record locations once. `folders` maps a kind to its location; `read(bytes, ownerPath, kind)` returns a record
 * or throws the finding for that file. One unreadable or oversize file is disclosed by its path and the rest of the
 * project is still read; only the two enumeration budgets end the walk, which is then reported as stopped.
 */
function walkRecords(context, folders, read, state) {
    const locations = new Set(Object.values(folders).map(folder => `${context.artifactsRoot}/${folder}`));
    for (const [kind, folder] of Object.entries(folders)) {
        const pending = [`${context.artifactsRoot}/${folder}`];
        while (pending.length) {
            const directory = pending.pop();
            let children;
            try { children = fs.readdirSync(scopedPath(context.root, directory), { withFileTypes: true }); }
            catch (error) { if (error.code !== 'ENOENT') state.diagnostics.push({ path: directory, code: error.code, reason: 'Owner directory cannot be inspected' }); continue; }
            for (const child of children.sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
                if (++state.entries > LIMITS.records * 4) { state.diagnostics.push({ code: 'LIMIT_EXCEEDED', reason: 'Owner enumeration budget exceeded' }); return false; }
                const ownerPath = `${directory}/${child.name}`;
                if (child.isDirectory()) {
                    // A location nested in another kind's location belongs to its own kind and is walked once, as that kind.
                    if (!locations.has(ownerPath)) pending.push(ownerPath);
                    continue;
                }
                if (!child.name.endsWith('.md')) continue;
                if (state.records.length >= LIMITS.records) { state.diagnostics.push({ code: 'LIMIT_EXCEEDED', reason: 'Record count exceeds selected budget' }); return false; }
                try {
                    const record = read(readBytes(context.root, ownerPath), ownerPath, kind);
                    if (record) state.records.push(record);
                } catch (error) {
                    state.diagnostics.push({ path: ownerPath, ...(error.itemId ? { itemId: error.itemId } : {}), code: error.code || 'IO_FAILURE', reason: error.message });
                }
            }
        }
    }
    return true;
}

/** A file in a location no current project reads is named and never counted; its identity is given when readable. Always throws that finding. */
function earlierVocabularyRecord(bytes, ownerPath) {
    let itemId;
    try { itemId = parseRecord(bytes, ownerPath, undefined, EARLIER_VERSION).id; } catch { /* named by its path alone */ }
    throw Object.assign(new Error(vocabulary.REFUSALS.EARLIER_VOCABULARY_RECORD), { code: 'EARLIER_VOCABULARY_RECORD', itemId });
}

/**
 * A record of a project that stores `version`: one that version reads, holding no state a later version added. Such a
 * record is named here, where every read of a project passes, so that no view counts a record another copy cannot read.
 * Like a record of an earlier vocabulary it has its own outcome, whose reason says what makes the record readable.
 */
function projectRecord(bytes, ownerPath, kind, version) {
    const record = parseRecord(bytes, ownerPath, kind, version);
    const [later] = vocabulary.laterStates(record, version);
    if (later) throw Object.assign(new Error(vocabulary.laterStateRefusal(later, version)), { code: 'LATER_VOCABULARY_RECORD', itemId: record.id });
    return record;
}

const contextVocabulary = context => context.vocabulary
    || vocabulary.projectVocabulary(context.root, context.artifactsRoot, context.config?.taskTracking?.schemaVersion);

/** An identity stored in more than one record is ambiguous: it is named once, and the read is not whole. */
function duplicateFindings(records) {
    const counts = new Map();
    for (const record of records) counts.set(record.id, (counts.get(record.id) || 0) + 1);
    return [...counts].filter(([, count]) => count > 1).map(([id]) => ({ itemId: id, code: 'DUPLICATE_ID', reason: 'Identity has multiple authoritative homes' }));
}

/**
 * The one place a working copy that stores the earlier vocabulary is read in the current words. The two vocabularies
 * differ in structure, so no record can be put into current terms by itself: every record is read as stored, and the
 * whole project is then mapped at once by the mapping its migration writes. Nothing is written, and each record is
 * marked as read from the earlier vocabulary, so a save still refuses it.
 */
function earlierProjectRecords(context) {
    const state = { records: [], diagnostics: [], entries: 0 };
    let whole = walkRecords(context, vocabulary.EARLIER.folders, (bytes, ownerPath, kind) => parseRecord(bytes, ownerPath, kind, EARLIER_VERSION), state);
    // An earlier project may still hold files of the first vocabulary; they are named and never counted.
    if (whole) whole = walkRecords(context, Object.fromEntries(vocabulary.strayLocations(EARLIER_VERSION).map(name => [name, name])), earlierVocabularyRecord, state);
    // Required here, not at load: a project in the current vocabulary never needs the mapping.
    const shown = require('./task-tracking-earlier-project.cjs').currentProject(state.records, context.artifactsRoot);
    const diagnostics = [...state.diagnostics, ...(whole ? duplicateFindings(state.records) : []), ...shown.diagnostics];
    return { records: shown.records, diagnostics, coverage: !whole || diagnostics.length ? 'partial' : 'complete' };
}

/**
 * Every record of the selected project, in the current words whatever vocabulary the project stores.
 * A project with mixed vocabularies, an unfinished migration or the first vocabulary is refused with its named outcome, never read.
 */
function inspectRecords(context) {
    const project = contextVocabulary(context);
    if (project.storedVersion === null) vocabulary.requireCurrentVocabulary(project);
    if (!vocabulary.inCurrentStructure(project.storedVersion)) return earlierProjectRecords(context);
    const state = { records: [], diagnostics: [], entries: 0 };
    let whole = walkRecords(context, FOLDERS, (bytes, ownerPath, kind) => projectRecord(bytes, ownerPath, kind, project.storedVersion), state);
    // A current project may have received files written in an earlier vocabulary, for example from an older branch.
    if (whole) whole = walkRecords(context, Object.fromEntries(vocabulary.STRAY_LOCATIONS.map(name => [name, name])), earlierVocabularyRecord, state);
    const { records, diagnostics } = state;
    if (!whole) return { records, diagnostics, coverage: 'partial' };
    diagnostics.push(...duplicateFindings(records));
    return { records, diagnostics, coverage: diagnostics.length ? 'partial' : 'complete' };
}

/**
 * The records stamped for the first vocabulary, as `{ itemId, path }`, wherever a project of either vocabulary this
 * tracker reads keeps records. For migration only: such a project is recognised by its declaration or by a location of
 * its own, and one that has neither still has to be told by name what it stores.
 */
function firstVocabularyRecords(context) {
    const state = { records: [], diagnostics: [], entries: 0 };
    walkRecords(context, { ...vocabulary.EARLIER.folders, ...FOLDERS }, (bytes, ownerPath) => {
        try { parseRecord(bytes, ownerPath); } catch (error) { if (error.storedVersion === RETIRED_VERSION) return { itemId: error.itemId, path: ownerPath }; }
        return null;
    }, state);
    return state.records;
}

/**
 * Records exactly as stored, for migration only: no mapping to the current words and no vocabulary refusal.
 * `version` is the vocabulary the records are expected to store and `folders` maps each of its kinds to the location
 * to walk (by default that version's own locations). A record already stamped with the other version is returned as
 * that version stores it; a kind both vocabularies have keeps its word, and any other kind exists under one stamp only.
 * Every record carries `storedVersion`: its stamp, or null when it has no tracking metadata.
 */
function inspectStoredRecords(context, { version, folders } = {}) {
    const expected = vocabulary.wordsFor(version ?? contextVocabulary(context).storedVersion);
    if (!expected) fail('INVALID_INPUT', 'Select the vocabulary version the stored records are expected to use');
    // The migration moves records between the earlier vocabulary and the base version of the current structure.
    const other = expected.version === EARLIER_VERSION ? BASE_VERSION : EARLIER_VERSION;
    const state = { records: [], diagnostics: [], entries: 0 };
    const whole = walkRecords(context, folders || expected.folders, (bytes, ownerPath, kind) => {
        let record;
        try { record = parseRecord(bytes, ownerPath, kind, expected.version); }
        catch (error) {
            try { record = parseRecord(bytes, ownerPath, kind, other); } catch { throw error; }
            if (record.tracking?.schemaVersion !== other) throw error;
        }
        return { ...record, storedVersion: record.tracking?.schemaVersion ?? null };
    }, state);
    return { records: state.records, diagnostics: state.diagnostics, coverage: whole && !state.diagnostics.length ? 'complete' : 'partial' };
}

/** Every comment a record's frontmatter holds, wherever it is attached. */
function frontmatterComments(document) {
    const found = [document.comment, document.commentBefore];
    parser().visit(document, { Node(_key, node) { found.push(node.comment, node.commentBefore); } });
    return found.filter(comment => typeof comment === 'string').sort();
}

/** The characters of a frontmatter that hold one member of a mapping and nothing else: in a flow mapping the member with one separator, otherwise its whole lines. */
function memberSpan(header, map, index) {
    const pair = map.items[index];
    const last = pair.value?.range || pair.key.range;
    if (map.flow) {
        if (index + 1 < map.items.length) return [pair.key.range[0], map.items[index + 1].key.range[0]];
        if (index > 0) { const previous = map.items[index - 1]; return [(previous.value?.range || previous.key.range)[1], last[1]]; }
        return [pair.key.range[0], last[1]];
    }
    const start = header.lastIndexOf('\n', pair.key.range[0] - 1) + 1;
    let end = last[2];
    if (header.slice(start, pair.key.range[0]).trim()) fail('UNSUPPORTED', 'Mapping member does not start its own line');
    if (end < header.length && header[end - 1] !== '\n') {
        const lineEnd = header.indexOf('\n', end);
        if (header.slice(end, lineEnd < 0 ? header.length : lineEnd).trim()) fail('UNSUPPORTED', 'Mapping member does not end its own line');
        end = lineEnd < 0 ? header.length : lineEnd + 1;
    }
    return [start, end];
}

/**
 * A stored record without the named values of its tracking metadata, for migration only: the current vocabulary no
 * longer stores them, and the record writer replaces or adds a value but never takes one away. `version` is the
 * vocabulary the record stores. Each value leaves with its key and one separator; every other byte stays as stored. A
 * record whose remaining values, authored body or comments would not come back exactly is refused and left as stored.
 */
function withoutTrackingValues(record, names, version) {
    let current = record;
    for (const name of names) {
        if (!current.tracking || !Object.hasOwn(current.tracking, name)) continue;
        const map = mappingField(current.document.contents, 'tracking')?.value;
        if (!parser().isMap(map)) fail('UNSUPPORTED', 'Tracking metadata is not a writable mapping');
        const index = map.items.findIndex(pair => parser().isScalar(pair.key) && pair.key.value === name);
        if (index < 0 || !map.items[index].key.range) fail('UNSUPPORTED', 'Tracking value has no safe removal range');
        const [start, end] = memberSpan(current.header, map, index);
        const header = current.header.slice(0, start) + current.header.slice(end);
        const candidate = parseRecord(Buffer.from(current.text.slice(0, current.start) + header + current.text.slice(current.end), 'utf8'), current.ownerPath, current.kind, version);
        const { [name]: removed, ...kept } = current.tracking;
        if (candidate.body !== current.body || stableValue(candidate.data) !== stableValue({ ...current.data, tracking: kept })
            || stableValue(frontmatterComments(candidate.document)) !== stableValue(frontmatterComments(current.document))) fail('UNSUPPORTED', 'A stored value cannot be removed without changing other content');
        current = candidate;
    }
    return current;
}

function saveRecord(context, candidate, expectedHash) {
    if (!relativePath(candidate.ownerPath)) fail('UNSAFE_PATH', 'Invalid owner path');
    return publishBytes(context.root, candidate.ownerPath, candidate.bytes, expectedHash);
}

module.exports = { ITEM_ID, TRACKING_FIELDS, parser, parseRecord, projectRecord, patchRecord, newRecord, earlierVocabularyRecord, inspectRecords, inspectStoredRecords, firstVocabularyRecords, withoutTrackingValues, saveRecord, stableValue };
