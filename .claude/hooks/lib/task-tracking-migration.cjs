'use strict';

/**
 * The one explicit action that moves a project from the earlier vocabulary to the current one. It never runs as a side
 * effect of a read, a save or upkeep, needs no actor, creates and deletes no record, and adds no history entry, revision
 * or receipt of its own.
 *
 * What it writes is the result of the one whole-project mapping that both readers of an earlier project already show
 * (task-tracking-earlier-project.cjs): each group becomes an area or an initiative, and every record a group listed
 * gains a link to it, because a record now names its own areas and initiatives.
 *
 * Order of work. A progress record is written to the record root first. It holds the member index (every group, its
 * kind, its purpose and the identities it lists) and the identities captured before the first change, because a group's
 * list is the only place membership was stored and is gone once that group is rewritten. Then every record that is not
 * a group is rewritten in place; then each group record is written at its new path and removed from its old one, one
 * file at a time; then the emptied earlier locations are removed; then the project declaration is changed; then the
 * result is compared with what was captured; and only then is the progress record removed. While that record exists
 * every read and save is refused, and running the migration again completes it from the recorded index, never from
 * records that were already rewritten.
 *
 * The comparison includes a recount that does not use the mapping: what each group held is counted from the stored
 * member lists by this module alone and compared with what the reader shows for the area or initiative it became. A
 * difference found before the first change refuses the migration; one found afterwards fails it and keeps the progress
 * record.
 *
 * The migration is one-way: returning to the earlier vocabulary means restoring the record root and the project
 * configuration from version control or a backup. So a run starts only where something can restore them: inside a Git
 * checkout that tracks them with nothing uncommitted, or on a person's word that a backup can (`backupConfirmed`), which
 * is recorded in the progress record so that a repeated run does not ask again. A preview never refuses for that cause;
 * it says so. An unfinished migration can be abandoned by such a restore too, and only on an
 * explicit abandon request: every interrupted or failed result states the steps, and the abandon request removes the
 * progress record once it finds the earlier project back whole. A plain repeated run only ever completes: what a person
 * wants cannot be read from the disk.
 *
 * What a migration cannot conserve is said, never repaired: a proof names the location and content of the record it
 * was checked against, so work linked to a moved or rewritten record stops being currently verified. The preview and
 * the result name that work. No proof is altered.
 *
 * Removing earlier-vocabulary support later removes this module, its command and its suite together.
 */

const fs = require('node:fs');
const path = require('node:path');
const childProcess = require('node:child_process');
const { TextDecoder } = require('node:util');
const { trackingContext, validateTaskTracking, relativePath, LIMITS, ITEM_ID } = require('./task-tracking-config.cjs');
const { fail, hash, scopedPath, readBytes, publishBytes, replaceRootFile, removeBytes } = require('./task-tracking-files.cjs');
const { withTrackingLock } = require('./task-tracking-lock.cjs');
const { resolveTrackingProfile } = require('./task-tracking-profile.cjs');
const store = require('./task-artifact-store.cjs');
const vocabulary = require('./task-tracking-vocabulary.cjs');
const earlierProject = require('./task-tracking-earlier-project.cjs');

const { CURRENT, EARLIER, BASE_VERSION, EARLIER_VERSION, EARLIER_MAPPING, AREA_KIND, INITIATIVE_KIND, TAG_ROLES } = vocabulary;
const JOURNAL_KIND = 'vocabulary-migration';
const STEP_STATES = Object.freeze(['pending', 'started', 'done', 'skipped']);
// The recorded steps, in the order they are carried out.
const STEPS = Object.freeze(['members', 'groups', 'locations', 'config', 'verify']);
// The values a migration must leave equal. Verification currency is reported beside them, never required.
const CONSERVED = Object.freeze(['total', 'accepted', 'remaining', 'eligibleIds', 'acceptedIds', 'records', 'recordIdentity']);
// The tracking values a rewrite may set, and the two the current vocabulary no longer stores.
const WRITTEN_VALUES = Object.freeze(['schemaVersion', 'kind', 'links', 'receipts', 'level', 'type']);
const REMOVED_VALUES = Object.freeze([EARLIER_MAPPING.memberField, EARLIER_MAPPING.purposeField]);
// How many paths or identities one statement names before it says there are more.
const NAMED = 10;

const topLevel = folder => folder.split('/')[0];
const slashed = value => value.replace(/\\/g, '/');
const byText = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const mapping = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const named = paths => `${paths.slice(0, NAMED).join(', ')}${paths.length > NAMED ? ` and ${paths.length - NAMED} more` : ''}`;
const journalOf = context => vocabulary.journalPath(context.artifactsRoot);
// Paths are held in forward-slash form, the form stored paths are compared in.
const rootOf = context => slashed(context.artifactsRoot);
const under = (context, name) => `${rootOf(context)}/${name}`;
// The locations only the earlier vocabulary reads, which a migration empties, and those only the current one reads, which it fills.
const emptiedLocations = context => vocabulary.EARLIER_ONLY_LOCATIONS.map(name => under(context, name));
const createdLocations = context => vocabulary.CURRENT_ONLY_LOCATIONS.map(name => under(context, name));
const recordLocations = context => [...new Set([...Object.values(EARLIER.folders), ...Object.values(CURRENT.folders)].map(folder => under(context, topLevel(folder))))];
const locationOf = (context, relative) => under(context, slashed(relative).slice(rootOf(context).length + 1).split('/')[0]);

/** What is at a project-relative path, or null. A linked path is refused by the scoped lookup, never followed. */
function entryAt(context, relative) {
    try { return fs.lstatSync(scopedPath(context.root, relative)); }
    catch (error) { if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return null; throw error; }
}

const sameEntry = (a, b) => a.dev === b.dev && a.ino === b.ino && a.ino !== 0n;
const otherCase = name => (name === name.toUpperCase() ? name.toLowerCase() : name.toUpperCase());
const diskRules = new WeakMap();
/**
 * Whether the disk that holds the record root ignores letter case, asked of the disk itself and never assumed from the
 * platform: a record location that exists is looked up under another spelling and must come back as the same folder.
 * No location to ask, or no usable answer, means letter case matters: the answer that changes no stored path.
 */
function ignoresCase(context) {
    if (diskRules.has(context)) return diskRules.get(context);
    let answer = false;
    for (const relative of recordLocations(context)) {
        const location = path.join(context.root, ...relative.split('/'));
        let found;
        try { found = fs.statSync(location, { bigint: true }); } catch { continue; }
        if (!found.isDirectory()) continue;
        try { answer = sameEntry(found, fs.statSync(path.join(path.dirname(location), otherCase(path.basename(location))), { bigint: true })); } catch { answer = false; }
        break;
    }
    diskRules.set(context, answer);
    return answer;
}

/**
 * Where a stored path points once the group records have moved, for the given moves. A path that names a moved record
 * is answered with that record's new path; any other path is answered as stored. A path that spells a moved record in
 * another letter case names the same file only on a disk that ignores case: there it follows the record, and on a disk
 * that tells the spellings apart it names another file and is left exactly as written.
 */
function relocation(context, moves) {
    const exact = new Map(moves.map(move => [move.from, move.to]));
    const folded = ignoresCase(context) ? new Map(moves.map(move => [move.from.toLowerCase(), move.to])) : null;
    return value => {
        if (typeof value !== 'string') return value;
        const original = slashed(value);
        return exact.get(original) ?? folded?.get(original.toLowerCase()) ?? value;
    };
}

const storedPaths = record => [...(Array.isArray(record.tracking?.links) ? record.tracking.links.map(link => link?.path) : []),
    ...(Array.isArray(record.tracking?.receipts) ? record.tracking.receipts.map(receipt => receipt?.result?.ownerPath) : [])].filter(entry => typeof entry === 'string');

/**
 * Stored link and receipt paths that name a moved record only when letter case is ignored. Where the disk ignores case
 * none remain after mapping; where it does not, they are named so a person can decide whether they were meant.
 */
function caseOnlyPaths(moves, records) {
    const exact = new Set(moves.map(move => move.from));
    const folded = new Set(moves.map(move => move.from.toLowerCase()));
    const found = [];
    for (const record of records) for (const value of new Set(storedPaths(record))) {
        const original = slashed(value);
        if (folded.has(original.toLowerCase()) && !exact.has(original)) found.push({ itemId: record.id, path: value });
    }
    return found.sort((a, b) => byText(a.itemId, b.itemId) || byText(a.path, b.path));
}
/** Those paths as the migration leaves them: none on a disk that ignores case, where each follows its record. */
const unmappedPaths = (context, moves, records) => (ignoresCase(context) ? [] : caseOnlyPaths(moves, records));
const linkPathsView = (context, paths) => ({ diskIgnoresCase: ignoresCase(context), leftAsWritten: paths.slice(0, NAMED), ...(paths.length ? { count: paths.length,
    note: 'These stored paths differ from a moved record only in letter case. This disk tells such spellings apart, so they name another file: they are left exactly as written and do not point at the moved record. Correct each by hand if it was meant to' } : {}) });

/**
 * One stored record as the migration writes it: the mapping's kind, state and tracking metadata, with every stored path
 * that names a moved record pointing at its new path, at `ownerPath`. The two values the current vocabulary no longer
 * stores leave; a record without tracking metadata gains none, and only its recorded state can change. Everything else
 * must come back equal, and what comes back must be exactly what the mapping states: both are checked here as well as
 * by the record writer, because a migration touches every record and so proves its own conservation.
 */
function currentCandidate(record, conversion, relocate, ownerPath = record.ownerPath) {
    const stored = record.tracking;
    const refuse = () => fail('UNSUPPORTED', 'Rewrite would change authored content, identity or revision; the record is left as stored');
    const fields = conversion.status === record.data.status ? {} : { status: conversion.status };
    let candidate;
    let target = null;
    if (!stored) candidate = store.patchRecord({ ...record, kind: conversion.kind, ownerPath }, fields, {});
    else {
        target = earlierProject.relocated(conversion.tracking, relocate);
        // A value the earlier vocabulary did not own may sit under a name the current one owns. It is neither overwritten nor taken over.
        for (const key of Object.keys(vocabulary.OWNED_VALUES)) if (Object.hasOwn(stored, key))
            fail('UNSUPPORTED', `Tracking metadata already holds ${key}, which the current vocabulary owns; the record is left as stored`);
        const stripped = store.withoutTrackingValues(record, REMOVED_VALUES, EARLIER_VERSION);
        candidate = store.patchRecord({ ...stripped, kind: conversion.kind, ownerPath }, fields,
            Object.fromEntries(WRITTEN_VALUES.filter(key => Object.hasOwn(target, key)).map(key => [key, target[key]])));
        if (store.stableValue(candidate.tracking) !== store.stableValue(target)) fail('UNSUPPORTED', 'Rewrite would not store exactly the mapped values; the record is left as stored');
    }
    if (candidate.kind !== conversion.kind || candidate.data.status !== conversion.status) fail('UNSUPPORTED', 'Rewrite would not store exactly the mapped values; the record is left as stored');
    const rest = (value, owned) => store.stableValue(Object.fromEntries(Object.entries(value || {}).filter(([key]) => !owned.includes(key))));
    if (candidate.id !== record.id || candidate.revision !== record.revision || candidate.body !== record.body
        || candidate.text.slice(0, candidate.start) !== record.text.slice(0, record.start) || candidate.text.slice(candidate.end) !== record.text.slice(record.end)
        || rest(candidate.data, ['status', 'tracking']) !== rest(record.data, ['status', 'tracking'])
        || rest(candidate.tracking, WRITTEN_VALUES) !== rest(stored, [...WRITTEN_VALUES, ...REMOVED_VALUES])) refuse();
    if (stored) {
        // Every stored link is still there, in its place, and what follows it is only a link to an area or an initiative.
        const before = Array.isArray(stored.links) ? stored.links : [];
        const after = Array.isArray(candidate.tracking.links) ? candidate.tracking.links : [];
        const path = link => (mapping(link) && typeof link.path === 'string' ? { ...link, path: relocate(link.path) } : link);
        if (after.length < before.length || before.some((link, index) => store.stableValue(path(link)) !== store.stableValue(after[index]))
            || after.slice(before.length).some(link => !mapping(link) || Object.keys(link).sort().join() !== 'itemId,relation' || !Object.hasOwn(TAG_ROLES, link.relation))) refuse();
        // Every receipt is still there with its identity; only the kind and the location it names may differ.
        const receipts = value => (Array.isArray(value) ? value.map(receipt => (mapping(receipt) && mapping(receipt.result) ? { ...receipt, result: rest(receipt.result, ['kind', 'ownerPath']) } : receipt)) : value);
        if (store.stableValue(receipts(stored.receipts)) !== store.stableValue(receipts(candidate.tracking.receipts))) refuse();
    }
    return candidate;
}

/** What a preview states about one record: which owned values change, never their content. */
function recordChange(record, candidate, conversion, relocate) {
    const before = record.tracking;
    const after = candidate.tracking;
    const added = Object.fromEntries(Object.entries(conversion.added).filter(([, ids]) => ids.length));
    const paths = before ? storedPaths(record).filter(value => relocate(value) !== value).length : 0;
    return { itemId: record.id, path: record.ownerPath, ...(candidate.ownerPath !== record.ownerPath ? { movedTo: candidate.ownerPath } : {}), tracked: !!before, kind: [record.kind, candidate.kind],
        ...(candidate.data.status !== record.data.status ? { state: [record.data.status, candidate.data.status] } : {}),
        ...(before ? { stamp: [before.schemaVersion, after.schemaVersion],
            ...(conversion.group ? { purpose: conversion.group.purpose, members: conversion.group.members.length } : {}),
            ...(candidate.kind === AREA_KIND ? { level: after.level ?? null } : {}), ...(candidate.kind === INITIATIVE_KIND ? { type: after.type } : {}),
            ...(Object.keys(added).length ? { addedLinks: added } : {}), ...(paths ? { paths } : {}) } : {}) };
}

/**
 * Whether version control can restore what the migration is about to change: the record root, and the project
 * configuration when its declaration will be rewritten. Inside a Git checkout those paths must hold no uncommitted or
 * untracked file; `clean: null` means Git could not answer, with the cause. `restorable` is whether version control can
 * put all of it back: not outside any Git checkout, and not for a path Git ignores, which is no change to Git and is not
 * protected by it either. Where it cannot, the note says so and what a run will then need. Git ignores much that nobody
 * means to keep, such as a file manager's own file: only an ignored path the migration reads or rewrites counts, which
 * is a record file (`recordPaths`) or the declaration. An ignored folder stands for the records in it.
 */
function versionControl(context, configPath, recordPaths = []) {
    let inside = false;
    for (let directory = context.root; ; directory = path.dirname(directory)) {
        if (fs.existsSync(path.join(directory, '.git'))) { inside = true; break; }
        if (path.dirname(directory) === directory) break;
    }
    const confirmation = `A run will refuse (NO_RESTORE_POINT) until a backup is confirmed: make a backup you can restore, then run ${COMPLETE_COMMAND} ${BACKUP_FLAG}`;
    if (!inside) return { kind: 'none', restorable: false, note: `Not a Git checkout: nothing here can restore the earlier records or the project configuration. ${confirmation}` };
    const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^GIT_/i.test(key)));
    env.GIT_TERMINAL_PROMPT = '0';
    // Called through its owner so a slow, absent or overflowing Git can be stood in for where it is tested.
    const result = childProcess.spawnSync('git', ['--no-pager', '--no-optional-locks', '--literal-pathspecs', '-C', context.root, '-c', 'core.fsmonitor=false', '-c', 'core.quotePath=false',
        'status', '--porcelain=v1', '-z', '--untracked-files=all', '--ignored', '--', slashed(context.artifactsRoot), ...(configPath ? [configPath] : [])],
    { env, shell: false, windowsHide: true, timeout: LIMITS.processTimeoutMs, maxBuffer: LIMITS.recordBytes, stdio: ['ignore', 'pipe', 'ignore'] });
    const unanswered = answer => (answer.error || answer.status !== 0 ? { kind: 'git', clean: null,
        cause: { ETIMEDOUT: 'timeout', ENOBUFS: 'output-limit', ENOENT: 'git-missing' }[answer.error?.code] || 'git-failed' } : null);
    if (unanswered(result)) return unanswered(result);
    const tokens = result.stdout.toString('utf8').split('\0').filter(Boolean);
    // Git names paths from the top of its checkout. A project in a sub-folder of a larger checkout is asked where it
    // sits, so every path is classified and named as the project itself names it.
    let prefix = '';
    if (tokens.length) {
        const asked = childProcess.spawnSync('git', ['--no-pager', '--no-optional-locks', '-C', context.root, 'rev-parse', '--show-prefix'],
            { env, shell: false, windowsHide: true, timeout: LIMITS.processTimeoutMs, maxBuffer: LIMITS.recordBytes, stdio: ['ignore', 'pipe', 'ignore'] });
        if (unanswered(asked)) return unanswered(asked);
        prefix = asked.stdout.toString('utf8').replace(/\r?\n$/, '');
    }
    const inProject = changed => (prefix && changed.startsWith(prefix) ? changed.slice(prefix.length) : changed);
    const paths = [];
    const ignored = [];
    // Spelled without regard to letter case, as elsewhere: on many disks a differently spelled path is the same file.
    const touched = [...recordPaths, ...(configPath ? [configPath] : [])].map(relative => relative.toLowerCase());
    const files = new Set(touched);
    const needed = entry => (entry.endsWith('/') ? touched.some(relative => relative.startsWith(entry.toLowerCase())) : files.has(entry.toLowerCase()));
    // A rename or copy is followed by its earlier path as a token of its own.
    for (let index = 0; index < tokens.length; index++) {
        const entry = inProject(tokens[index].slice(3));
        if (!tokens[index].startsWith('!!')) paths.push(entry);
        else if (needed(entry)) ignored.push(entry);
        if (/[RC]/.test(tokens[index].slice(0, 2))) index++;
    }
    return { kind: 'git', clean: paths.length === 0, restorable: paths.length === 0 && ignored.length === 0, ...(paths.length ? { paths } : {}),
        ...(ignored.length ? { ignored, note: `Git ignores ${named(ignored)}: version control cannot restore what it does not track. ${confirmation}, or commit what Git ignores` } : {}) };
}
/** That answer as a preview states it: the paths Git ignores are named up to the usual number, with their count beyond it. */
const controlView = control => (control.ignored ? { ...control, ignored: control.ignored.slice(0, NAMED), ...(control.ignored.length > NAMED ? { ignoredCount: control.ignored.length } : {}) } : control);

/** Why Git could not say whether the paths are clean, worded by its cause, with what resolves it. */
const UNANSWERED = Object.freeze({
    timeout: `Git did not answer within ${LIMITS.processTimeoutMs / 1000} seconds whether the record root is clean; nothing is wrong with the records. Retry, and if it repeats, run git status in the checkout to see what is slow`,
    'output-limit': 'Git listed more changed, untracked or ignored paths under the record root than can be inspected, so it is not known to be clean; commit them or set them aside, then retry',
    'git-missing': 'This is a Git checkout but the git command could not be started, so it is not known whether the record root is clean; make git available on the PATH, then retry',
    'git-failed': 'Git could not report whether the record root is clean; run git status in the checkout, repair what it reports, then retry'
});

/** Where the named object members sit in JSON text that has already parsed: `[start, end)` of each key and value. */
function jsonMembers(text, wanted) {
    const found = new Map();
    let at = 0;
    const space = () => { while (at < text.length && ' \t\r\n'.includes(text[at])) at++; };
    const string = () => { const start = at++; while (text[at] !== '"') at += text[at] === '\\' ? 2 : 1; return [start, ++at]; };
    const value = trail => {
        space();
        const start = at;
        if (text[at] === '{') {
            at++; space();
            while (text[at] !== '}') {
                const key = string();
                const member = [...trail, JSON.parse(text.slice(key[0], key[1]))];
                space(); at++;
                const range = value(member);
                if (wanted.has(JSON.stringify(member))) found.set(JSON.stringify(member), { key, value: range });
                space(); if (text[at] === ',') at++;
                space();
            }
            at++;
        } else if (text[at] === '[') {
            at++; space();
            for (let index = 0; text[at] !== ']'; index++) { value([...trail, index]); space(); if (text[at] === ',') at++; space(); }
            at++;
        } else if (text[at] === '"') string();
        else while (at < text.length && !' \t\r\n,]}'.includes(text[at])) at++;
        return [start, at];
    };
    value([]);
    return found;
}

/**
 * The project configuration with its declaration moved to the current vocabulary: the marker, and each group-purpose
 * label restated as the level or type label that purpose became. Only those characters change; the rest of a
 * hand-formatted file stays byte for byte. A label the current vocabulary has no place for is refused by name, never
 * dropped. Returns null for a project with no tracker block: migration leaves it unconfigured, and its locations then
 * say current.
 */
function configEdit(context) {
    if (!context.enrolled || vocabulary.inCurrentStructure(context.config.taskTracking.schemaVersion)) return null;
    const relative = slashed(path.relative(context.root, context.configPath));
    const refuse = reason => fail('CONFIG_NOT_REWRITABLE', `${reason} (${relative})`);
    const declared = context.config.taskTracking;
    const kindLabels = mapping(declared.kindLabels) ? declared.kindLabels : {};
    const labels = vocabulary.currentLabels(declared);
    const kept = Object.fromEntries(Object.entries(kindLabels).filter(([kind]) => CURRENT.kinds.includes(kind)));
    // Every label the current vocabulary cannot keep is named in one answer, each with what resolves it: a label on a
    // kind it does not have, a label that was free in the earlier vocabulary and is a word the current one uses for
    // something else, and two labels for what becomes one level or type.
    const unkept = [
        ...Object.keys(kindLabels).filter(kind => !CURRENT.kinds.includes(kind)).map(kind => `taskTracking.kindLabels.${kind} labels a kind the current vocabulary does not have; remove that label, then retry`),
        ...vocabulary.kindLabelFindings(kept, BASE_VERSION).map(finding => `taskTracking.kindLabels.${finding.kind}: ${finding.problem}; rename that label in the configuration, then retry`),
        ...labels.conflicts.map(([purpose, key, word]) => `taskTracking.groupLabels.${purpose} and taskTracking.${key}.${word} both label what becomes one ${key === 'levelLabels' ? 'level' : 'type'}; keep one of them, then retry`)];
    if (unkept.length) refuse(unkept.length === 1 ? unkept[0] : numbered(unkept));
    const before = readBytes(context.root, relative);
    const trail = (...keys) => JSON.stringify(['taskTracking', ...keys]);
    let text;
    let members;
    let expected;
    try {
        text = new TextDecoder('utf-8', { fatal: true }).decode(before);
        expected = JSON.parse(text);
        members = jsonMembers(text, new Set([trail('schemaVersion'), trail('groupLabels'), trail('levelLabels'), trail('typeLabels')]));
    } catch { refuse('The project configuration cannot be located value by value'); }
    if (!members.has(trail('schemaVersion'))) refuse('The vocabulary declaration cannot be located');
    expected.taskTracking.schemaVersion = BASE_VERSION;
    const changes = [{ field: 'taskTracking.schemaVersion', from: EARLIER_VERSION, to: BASE_VERSION }];
    const edits = [{ range: members.get(trail('schemaVersion')).value, text: String(BASE_VERSION) }];
    if (members.has(trail('groupLabels'))) {
        const purposes = expected.taskTracking.groupLabels;
        delete expected.taskTracking.groupLabels;
        // Each label joins the object its level or type key already has, or a new object written where the purpose labels stood.
        const created = [];
        for (const key of ['levelLabels', 'typeLabels']) {
            // A label already declared with the same text for that level or type is not written a second time.
            const moved = labels.moved.filter(([, to, word]) => to === key && !(mapping(declared[key]) && Object.hasOwn(declared[key], word)));
            if (!moved.length) continue;
            const entries = moved.map(([purpose, , word]) => `${JSON.stringify(word)}: ${JSON.stringify(purposes[purpose])}`).join(', ');
            expected.taskTracking[key] = { ...(expected.taskTracking[key] || {}), ...Object.fromEntries(moved.map(([purpose, , word]) => [word, purposes[purpose]])) };
            const present = members.get(trail(key));
            if (!present) created.push(`${JSON.stringify(key)}: {${entries}}`);
            else {
                if (text[present.value[0]] !== '{') refuse(`taskTracking.${key} cannot be extended`);
                const empty = !Object.keys(declared[key]).length;
                edits.push({ range: [present.value[0] + 1, present.value[0] + 1], text: `${entries}${empty ? '' : ', '}` });
            }
            for (const [purpose, , word] of moved) changes.push({ field: `taskTracking.groupLabels.${purpose}`, movedTo: `taskTracking.${key}.${word}` });
        }
        for (const [purpose, key, word] of labels.moved) if (!changes.some(change => change.field === `taskTracking.groupLabels.${purpose}`))
            changes.push({ field: `taskTracking.groupLabels.${purpose}`, movedTo: `taskTracking.${key}.${word}`, alreadyDeclared: true });
        const member = members.get(trail('groupLabels'));
        if (created.length) edits.push({ range: [member.key[0], member.value[1]], text: created.join(', ') });
        else {
            // The member leaves with one separator: the comma after it, or else the comma before it.
            const after = /^\s*,\s*/.exec(text.slice(member.value[1]));
            const beforeIt = /,\s*$/.exec(text.slice(0, member.key[0]));
            edits.push({ range: after ? [member.key[0], member.value[1] + after[0].length] : beforeIt ? [beforeIt.index, member.value[1]] : [member.key[0], member.value[1]], text: '' });
        }
    }
    let after = text;
    for (const edit of edits.sort((a, b) => b.range[0] - a.range[0])) after = after.slice(0, edit.range[0]) + edit.text + after.slice(edit.range[1]);
    let reread;
    try { reread = JSON.parse(after); } catch { refuse('The changed project configuration would not parse'); }
    if (store.stableValue(reread) !== store.stableValue(expected) || validateTaskTracking(reread).length) refuse('The changed project configuration would not declare exactly the current vocabulary');
    return { relative, before, after: Buffer.from(after, 'utf8'), changes };
}

/** Replaces the declaration atomically against the bytes it was computed from, wherever in the project the file sits. */
function writeConfig(context, edit) {
    const write = edit.relative.includes('/') ? publishBytes : replaceRootFile;
    write(context.root, edit.relative, edit.after, hash(edit.before));
}

/** The project's vocabulary as its locations and declaration state it, leaving the migration's own progress record aside. */
function settledVocabulary(context) {
    const found = context.vocabulary;
    return vocabulary.resolveVocabulary({ declaredVersion: context.config.taskTracking?.schemaVersion,
        folderNames: [...found.earlierLocations, ...found.currentLocations, ...found.retiredLocations], journalPresent: false });
}

/** What identifies a set of identities, whatever order it was gathered in. */
const identityOf = ids => hash(JSON.stringify([...ids].sort()));

/**
 * What each group held, counted from the records as the earlier vocabulary stored them: every task a group lists,
 * followed through every group it lists, each task once, where a task counts unless it is canceled or retired. This is
 * the migration's independent recount. It is deliberately not derived from the mapping and it spells the stored member
 * list, the group kinds and the delivery kind by itself: a defect in the mapping, or in the words the mapping is given,
 * must show here as a difference and never as agreement. One entry stands for the project as a whole.
 */
function storedScopes(records) {
    const listOf = record => (Array.isArray(record.tracking?.memberItemIds) ? record.tracking.memberItemIds.filter(id => typeof id === 'string') : null);
    const byId = new Map();
    for (const record of records) if (!byId.has(record.id)) byId.set(record.id, record);
    const counts = record => record.kind === 'task' && record.data.status !== 'canceled' && !record.tracking?.retired;
    // A record that is no group and holds an empty list holds nothing and becomes no scope; one that lists anything is counted like a group.
    const holders = records.filter(record => ['project', 'vision'].includes(record.kind) || listOf(record)?.length);
    const scopes = holders.map(holder => {
        const eligible = new Set();
        const entered = new Set();
        const pending = [holder.id];
        while (pending.length) {
            const id = pending.pop();
            if (entered.has(id)) continue;
            entered.add(id);
            for (const member of listOf(byId.get(id)) || []) {
                const listed = byId.get(member);
                if (!listed) continue;
                if (['project', 'vision'].includes(listed.kind) || listOf(listed)?.length) pending.push(member);
                else if (counts(listed)) eligible.add(member);
            }
        }
        return { id: holder.id, eligibleIds: [...eligible].sort() };
    });
    return { project: records.filter(counts).map(record => record.id).sort(), groups: scopes.sort((a, b) => byText(a.id, b.id)) };
}
const scopeMark = scope => ({ id: scope.id, eligible: scope.eligibleIds.length, identity: identityOf(scope.eligibleIds) });

const reasonMark = reason => hash(reason).slice(0, 16);
/**
 * Progress through the ordinary reader, so the comparison uses the same arithmetic every view uses. `scan` stands in
 * for the stored records when a result is rehearsed. `standing` is who is currently verified, who is ready to start and
 * a mark per unresolved-prerequisite reason, as identities only; `reasons` are those reasons as read, never kept.
 * `reads` is how completely the project reads and what the reader finds wrong, so a person sees it before migrating.
 * `scopes` answers, for the identities given, the eligible tasks the reader shows for each as an area or an initiative.
 */
function progressOf(context, scan) {
    const { inspectSnapshot, scopeProjection, readyIds } = require('./task-progress-reader.cjs');
    const snapshot = inspectSnapshot(context.root, { context, ...(scan ? { scan } : {}) });
    if (!snapshot.profile.available || snapshot.unreadable) fail('INCOMPLETE_SCOPE', 'Progress cannot be read from this project');
    const { metrics, coverage, diagnostics } = scopeProjection(snapshot);
    const eligible = new Set(metrics.eligibleIds);
    // What the reader finds wrong, by identity and code alone: never a reason, which may quote what a person wrote.
    const findings = [...snapshot.diagnostics, ...diagnostics].map(finding => ({ ...(finding.itemId ? { itemId: finding.itemId } : {}), ...(finding.path ? { path: finding.path } : {}), code: finding.code }));
    return { reads: { coverage, findings: findings.slice(0, NAMED), ...(findings.length > NAMED ? { count: findings.length } : {}) }, total: metrics.total, accepted: metrics.accepted, remaining: metrics.remaining, eligibleIds: [...metrics.eligibleIds],
        acceptedIds: [...new Set(snapshot.items.filter(item => eligible.has(item.id) && item.acceptance.accepted).map(item => item.id))].sort(),
        records: snapshot.records.length, recordIdentity: hash(JSON.stringify(snapshot.records.map(record => record.id).sort())),
        currentlyVerified: metrics.currentlyVerified,
        standing: { verified: snapshot.items.filter(item => item.verification.status === 'current').map(item => item.id).sort(), ready: readyIds(snapshot.items).sort(),
            unresolved: Object.fromEntries(snapshot.items.filter(item => item.prerequisiteReasons.length).map(item => [item.id, item.prerequisiteReasons.map(reasonMark)])) },
        reasons: Object.fromEntries(snapshot.items.map(item => [item.id, item.prerequisiteReasons])),
        scopes: ids => ids.map(id => ({ id, eligibleIds: scopeProjection(snapshot, id).metrics?.eligibleIds ?? null })) };
}
/** The part of a progress reading that is kept in the progress record. */
const captured = ({ reasons, scopes, reads, ...kept }) => kept;

/**
 * The former groups whose eligible tasks, as the reader shows them for the area or initiative each became, differ from
 * the recount: by identity where the recount still holds its lists, by count and mark where only those were kept.
 */
function scopeDifferences(expected, shown) {
    const byId = new Map(shown.map(scope => [scope.id, scope]));
    const differing = [];
    for (const scope of expected) {
        const actual = byId.get(scope.id)?.eligibleIds ?? null;
        const wanted = scope.eligibleIds ? scopeMark(scope) : scope;
        if (actual && actual.length === wanted.eligible && identityOf(actual) === wanted.identity) continue;
        differing.push({ groupId: scope.id, expected: wanted.eligible, actual: actual ? actual.length : null,
            ...(scope.eligibleIds && actual ? { missing: scope.eligibleIds.filter(id => !actual.includes(id)).slice(0, NAMED), extra: actual.filter(id => !scope.eligibleIds.includes(id)).slice(0, NAMED) } : {}) });
    }
    return differing;
}

const STANDING_NOTE = Object.freeze({
    preview: 'These items need verifying again after migration: a proof names the location and content of the record it was checked against, and that record moves or is rewritten. Migration alters no proof; record a new observation for each named item afterwards',
    result: 'These items need verifying again: a proof names the location and content of the record it was checked against, and that record moved or was rewritten. No proof was altered; record a new observation for each named item'
});
/**
 * The work whose standing differs between two readings: no longer currently verified, no longer ready to start, and
 * newly held by a prerequisite that is no longer currently verified. Null when the earlier reading kept no standing.
 */
function standingChange(before, after, tense) {
    if (!before || !Array.isArray(before.verified) || !Array.isArray(before.ready)) return null;
    const lost = (earlier, current) => earlier.filter(id => !current.includes(id));
    const verificationStale = lost(before.verified, after.standing.verified);
    const newlyBlocked = [];
    for (const [itemId, reasons] of Object.entries(after.reasons)) {
        // A valid ID such as constructor is data, never an inherited Object property.
        const known = Object.hasOwn(before.unresolved || {}, itemId) ? before.unresolved[itemId] : [];
        const gained = reasons.filter(reason => !known.includes(reasonMark(reason)));
        const prerequisiteIds = verificationStale.filter(id => gained.some(reason => reason.split(/\s+/).includes(id)));
        if (prerequisiteIds.length) newlyBlocked.push({ itemId, prerequisiteIds });
    }
    newlyBlocked.sort((a, b) => a.itemId.localeCompare(b.itemId, 'en'));
    const leavingReady = lost(before.ready, after.standing.ready);
    return { verificationStale, leavingReady, newlyBlocked, ...(verificationStale.length || leavingReady.length || newlyBlocked.length ? { note: STANDING_NOTE[tense] } : {}) };
}

/**
 * What the reader would report once the planned rewrite was stored, without storing anything: every record as it would
 * be written, at the path it would have, with the declaration as it would be changed. A linked file that is not a
 * record is read from where it is now.
 */
function rehearse(context, planned) {
    const rewritten = new Map(planned.candidates.map(candidate => [slashed(candidate.ownerPath), candidate.bytes]));
    const readSource = relative => (rewritten.has(slashed(relative)) ? rewritten.get(slashed(relative)) : readBytes(context.root, relative));
    const config = planned.config ? JSON.parse(planned.config.after.toString('utf8')) : context.config;
    return progressOf({ ...context, config, readSource, vocabulary: vocabulary.resolveVocabulary({ declaredVersion: config.taskTracking?.schemaVersion }) },
        { records: planned.candidates, diagnostics: [], coverage: 'complete' });
}

/**
 * Why a rehearsed migration would not keep what a former group held, as far as the stored records and the rehearsed read
 * show it, with what resolves it. A record that names a group by its own link without being listed by it joins what that
 * group counts once a link is what counts; a read cut short at its link budget shows no scope whole; a former group the
 * read shows as no area or initiative has no scope to compare.
 */
function notConservedCause(records, scopes, reads) {
    const byId = new Map(records.map(record => [record.id, record]));
    const own = scopes.flatMap(scope => (scope.extra || []).filter(id => (byId.get(id)?.tracking?.links || []).some(link => mapping(link) && Object.hasOwn(TAG_ROLES, link.relation) && link.itemId === scope.groupId))
        .map(id => `${id} links to ${scope.groupId} by itself without being listed by it`));
    if (own.length) return `${named(own)}: list it in that group or remove the link in the earlier records`;
    if (reads.findings.some(finding => finding.code === 'LIMIT_EXCEEDED')) return 'The migrated project would hold more links to areas and initiatives than one read follows, so no scope can be confirmed: reduce what the groups list';
    const unread = scopes.filter(scope => scope.actual === null).map(scope => scope.groupId);
    if (unread.length) return `${named(unread)} would not read as an area or an initiative with a scope of its own: see what the preview of the earlier project reports for it and correct that record`;
    return 'The stored records do not say why: compare what each named group lists with the links its records already hold, and correct the earlier records';
}

/** Every file under an earlier-only location that is not a record: the migration moves records only, so such a file would keep the location from being emptied. */
function strandedEntries(context) {
    const found = [];
    const visit = relative => {
        let children;
        try { children = fs.readdirSync(scopedPath(context.root, relative), { withFileTypes: true }); }
        catch (error) { if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return; throw error; }
        for (const child of children.sort((a, b) => byText(a.name, b.name))) {
            if (child.isDirectory()) visit(`${relative}/${child.name}`);
            else if (!child.name.endsWith('.md')) found.push(`${relative}/${child.name}`);
        }
    };
    for (const location of emptiedLocations(context)) visit(location);
    return found;
}

/** The names directly inside a project-relative folder, or none when it does not exist. */
function namesIn(context, relative) {
    try { return fs.readdirSync(scopedPath(context.root, relative)); }
    catch (error) { if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return []; throw error; }
}

/** The progress record as it is first written: the member index, the captured identities and every step still to do. */
function firstJournal(planned) {
    return { schemaVersion: 1, kind: JOURNAL_KIND, from: EARLIER_VERSION, to: BASE_VERSION, startedAt: new Date().toISOString(),
        // Whether this migration began on a person's confirmation of a backup, because version control could not restore the project.
        backupConfirmed: planned.backupConfirmed,
        capture: { ...captured(planned.reading), groups: planned.recount.groups.map(scopeMark) },
        index: planned.mapped.index, steps: STEPS.map(id => ({ id, status: 'pending' })) };
}
const journalBytes = value => Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');

/**
 * Everything a migration needs to know before it may start, gathered without changing anything. Every unmet
 * precondition is named, not only the first. The rewrite of every record and of the declaration is computed here and
 * the result is rehearsed, so a record or configuration that cannot be rewritten, or a result that would not conserve
 * what each group held, refuses the migration before anything changes.
 */
function plan(context, { run = false, backupConfirmed = false } = {}) {
    const refusals = [];
    const refuse = (code, reason, extra = {}) => refusals.push({ code, reason, ...extra });
    const profile = resolveTrackingProfile(context);
    if (!profile.available) return { refusals: [{ code: profile.code, reason: `Migration supports the portable record profile only: ${profile.reason}` }] };
    const linked = [...new Set([context.artifactsRoot, journalOf(context), ...recordLocations(context)].filter(relative => {
        try { scopedPath(context.root, relative); return false; } catch (error) { if (error.code !== 'UNSAFE_PATH') throw error; return true; }
    }))];
    if (linked.length) return { refusals: [{ code: 'UNSAFE_PATH', reason: `Linked or escaping record locations are unsupported: ${named(linked)}`, paths: linked }] };

    const scan = store.inspectStoredRecords(context, { version: EARLIER_VERSION });
    if (scan.coverage !== 'complete') refuse('INCOMPLETE_SCOPE', `Inspection incomplete: ${named(scan.diagnostics.map(finding => finding.path || finding.reason))} cannot be read as a record; repair or remove it, then retry`,
        { diagnostics: scan.diagnostics.slice(0, NAMED).map(finding => ({ ...(finding.path ? { path: finding.path } : {}), ...(finding.itemId ? { itemId: finding.itemId } : {}), code: finding.code })) });
    const stamped = scan.records.filter(record => record.storedVersion === BASE_VERSION).map(record => record.ownerPath);
    if (stamped.length) refuse('INCOMPLETE_SCOPE', `Inspection incomplete: ${named(stamped)} is already stamped current inside an earlier-vocabulary project; settle it by hand, then retry`, { paths: stamped });
    const homes = new Map();
    for (const record of scan.records) homes.set(record.id, [...(homes.get(record.id) || []), record.ownerPath]);
    const repeated = [...homes].filter(([, paths]) => paths.length > 1);
    if (repeated.length) refuse('INCOMPLETE_SCOPE', `Inspection incomplete: ${named(repeated.map(([id, paths]) => `${id} is stored at ${paths.join(' and ')}`))}; keep one record per identity, then retry`,
        { paths: repeated.flatMap(([, paths]) => paths).slice(0, NAMED) });
    const stranded = strandedEntries(context);
    if (stranded.length) refuse('INCOMPLETE_SCOPE', `Inspection incomplete: ${named(stranded)} is not a record, and a migration moves only records out of a location it then removes; move or remove it, then retry`, { paths: stranded.slice(0, NAMED) });

    const recoveries = require('./task-tracking-deletion.cjs').unfinishedRecoveries(context).map(recovery => recovery.path);
    if (recoveries.length) refuse('DELETION_RECOVERY_UNFINISHED', `Deletion recovery unfinished: ${named(recoveries)}; finish that deletion with the tracker version that started it, or remove the recovery file once the record's fate is confirmed, then retry`, { paths: recoveries });

    // Names are compared without regard to letter case: a differently spelled entry is the same entry on many disks.
    const same = (name, wanted) => name.toLowerCase() === wanted.toLowerCase();
    const taken = namesIn(context, context.artifactsRoot).filter(name => vocabulary.CURRENT_ONLY_LOCATIONS.some(wanted => same(name, wanted))).map(name => under(context, name));
    if (taken.length) refuse('DESTINATION_PRESENT', `Destination already present: ${named(taken)}; move or remove it, then retry`, { paths: taken });

    const records = [...scan.records].sort((a, b) => byText(a.ownerPath, b.ownerPath));
    const mapped = earlierProject.mapEarlierProject({ records, artifactsRoot: context.artifactsRoot });
    const of = code => mapped.problems.filter(problem => problem.code === code);
    if (of('MEMBER_NOT_FOUND').length) refuse('MEMBER_NOT_FOUND', `Listed identity has no record: ${named(of('MEMBER_NOT_FOUND').map(problem => `${problem.memberId} (listed by ${problem.groupId})`))}; restore the record or take the identity out of that list, then retry`,
        { members: of('MEMBER_NOT_FOUND').slice(0, NAMED).map(problem => ({ groupId: problem.groupId, memberId: problem.memberId })) });
    if (of('MEMBER_WITHOUT_TRACKING').length) refuse('MEMBER_WITHOUT_TRACKING', `Listed record cannot carry a link: ${named(of('MEMBER_WITHOUT_TRACKING').map(problem => `${problem.path} (listed under ${problem.groupIds.join(', ')})`))} has no tracking metadata, and a migration invents none; adopt the record with the tracker version that wrote this project or take it out of that list, then retry`,
        { records: of('MEMBER_WITHOUT_TRACKING').slice(0, NAMED).map(problem => ({ path: problem.path, itemId: problem.itemId, groupIds: problem.groupIds })) });

    // Two records that would be kept at one path, or a record that would land on a file already there. Compared without
    // regard to letter case, on every disk: the project may be checked out on one that ignores it.
    const landing = new Map();
    for (const move of mapped.moves) if (move.to) landing.set(move.to.toLowerCase(), [...(landing.get(move.to.toLowerCase()) || []), move]);
    const collisions = [...landing.values()].filter(moves => moves.length > 1).map(moves => `${moves.map(move => move.from).sort().join(' and ')} would both be kept at ${moves[0].to}`);
    const listed = new Map();
    for (const move of mapped.moves.filter(candidate => candidate.to)) {
        const folder = path.posix.dirname(move.to);
        if (!listed.has(folder)) listed.set(folder, namesIn(context, folder));
        for (const name of listed.get(folder).filter(entry => same(entry, path.posix.basename(move.to)))) collisions.push(`${move.from} would be kept at ${move.to}, where ${folder}/${name} already is`);
    }
    if (collisions.length) refuse('PATH_COLLISION', `Two records would be kept at one path: ${named(collisions)}; rename one of them, then retry`, { collisions: collisions.slice(0, NAMED) });

    let config = null;
    let unwritable = null;
    try { config = configEdit(context); }
    catch (error) { if (error.code !== 'CONFIG_NOT_REWRITABLE') throw error; unwritable = error; }

    // The declaration is restored from version control too, so an uncommitted edit to it would be lost with the records.
    const control = versionControl(context, config?.relative, records.map(record => slashed(record.ownerPath)));
    if (control.kind === 'git' && control.clean === null) refuse('VERSION_CONTROL_UNAVAILABLE', UNANSWERED[control.cause], { cause: control.cause });
    if (control.kind === 'git' && control.clean === false) {
        const declaration = control.paths.filter(changed => changed === config?.relative);
        const inRoot = control.paths.filter(changed => changed !== config?.relative);
        refuse('RECORD_ROOT_NOT_CLEAN', `${[...(inRoot.length ? [`Record root has uncommitted changes: ${named(inRoot)}`] : []),
            ...(declaration.length ? [`Project configuration has uncommitted changes: ${named(declaration)}`] : [])].join('; ')}; commit or set them aside so version control can restore the earlier records${declaration.length ? ' and configuration' : ''}, then retry`,
        { paths: control.paths.slice(0, NAMED) });
    }
    // One-way: where version control cannot put the earlier project back, a run needs a person's word that a backup can.
    // A preview is not refused for this; it states it. The declaration is named whether or not it can be rewritten yet.
    const declaration = context.enrolled && !vocabulary.inCurrentStructure(context.config.taskTracking.schemaVersion) ? slashed(path.relative(context.root, context.configPath)) : null;
    const unrestorable = control.kind === 'none' ? [...(scan.records.length ? [rootOf(context)] : []), ...(declaration ? [declaration] : [])] : control.clean === null ? [] : control.ignored || [];
    // Every other obstacle is work on the project and this one is a person's word, so it is named last: alone, it is all that is left.
    const unconfirmed = run && unrestorable.length && !backupConfirmed ? { code: 'NO_RESTORE_POINT', reason: `No restore point: ${control.kind === 'none'
        ? `this project is not in a Git checkout, so nothing here can restore ${unrestorable.join(' and ')}` : `Git ignores ${named(unrestorable)}, so version control cannot restore ${unrestorable.length === 1 ? 'it' : 'them'}`} once migrated, and a migration cannot be undone. Make a backup you can restore and run again with ${BACKUP_FLAG}, or commit the records and the configuration so that version control can restore them, then retry; nothing was changed`,
    paths: unrestorable.slice(0, NAMED) } : null;
    const closed = planned => { if (unconfirmed) refusals.push(unconfirmed); return planned; };

    const relocate = relocation(context, mapped.moves.filter(move => move.to));
    const destinations = new Map(mapped.moves.map(move => [move.from, move.to]));
    const changes = [];
    const candidates = [];
    const blocked = [];
    for (const problem of [...of('INVALID_RECORD'), ...of('UNINDEXED_GROUP')]) blocked.push({ path: homes.get(problem.itemId)?.[0] ?? null, itemId: problem.itemId, code: problem.code, reason: problem.reason || 'Group record is not in the member index' });
    for (const record of records) {
        const conversion = mapped.conversions.get(record);
        if (!conversion) continue;
        try {
            if (conversion.group && !conversion.group.to) fail('UNSUPPORTED', 'Group record is kept outside the location of its kind');
            // A record without tracking metadata that would gain a link is named above; here it is written as it can be.
            const candidate = currentCandidate(record, conversion, relocate, destinations.get(slashed(record.ownerPath)) ?? record.ownerPath);
            candidates.push(candidate); changes.push(recordChange(record, candidate, conversion, relocate));
        } catch (error) { if (!error.code || error.syscall) throw error; blocked.push({ path: record.ownerPath, itemId: record.id, code: error.code, reason: error.message }); }
    }
    if (blocked.length) refuse('RECORD_NOT_REWRITABLE', `Record cannot be rewritten safely: ${named(blocked.map(finding => finding.path || finding.itemId))}; nothing was changed`, { records: blocked.slice(0, NAMED) });
    if (unwritable) refuse(unwritable.code, unwritable.message);

    const planned = { refusals, mapped, changes, candidates, config, control, backupConfirmed: unrestorable.length > 0 && backupConfirmed === true, records: records.length, linkPaths: unmappedPaths(context, mapped.moves, records),
        locations: emptiedLocations(context).filter(location => !!entryAt(context, location)?.isDirectory()), reading: null, after: null, recount: null };
    if (refusals.length) return closed(planned);

    // Nothing is in the way. The result is now rehearsed against the recount, so that a migration which would not keep
    // what the project and each group held is refused here and not found out after every record has changed.
    planned.reading = progressOf(context);
    planned.after = rehearse(context, planned);
    planned.recount = storedScopes(records);
    const differing = CONSERVED.filter(key => store.stableValue(planned.after[key]) !== store.stableValue(planned.reading[key]));
    if (store.stableValue(planned.recount.project) !== store.stableValue(planned.reading.eligibleIds)) differing.unshift('the eligible tasks the stored records hold');
    const scopes = scopeDifferences(planned.recount.groups, planned.after.scopes(planned.recount.groups.map(scope => scope.id)));
    if (differing.length || scopes.length) refuse('SCOPE_NOT_CONSERVED', `Migration would not keep what the project holds: ${[...(differing.length ? [`${differing.join(', ')} would differ`] : []),
        ...(scopes.length ? [`the eligible tasks of ${named(scopes.map(scope => `${scope.groupId}${scope.extra?.length ? ` (would gain ${scope.extra.join(', ')})` : ''}${scope.missing?.length ? ` (would lose ${scope.missing.join(', ')})` : ''}`))} would differ from what its member list holds`] : [])].join('; ')}. ${notConservedCause(records, scopes, planned.after.reads)}, then retry; nothing was changed`,
    { differing, groups: scopes.slice(0, NAMED) });
    if (!refusals.length && journalBytes(firstJournal(planned)).length > LIMITS.recordBytes) refuse('LIMIT_EXCEEDED', 'The member index of this project is larger than a progress record may be, so the migration cannot record what it must before its first change; nothing was changed');
    return closed(planned);
}

const envelope = context => ({ schemaVersion: 1, kind: 'migration', from: EARLIER_VERSION, to: BASE_VERSION, recordRoot: context?.artifactsRoot ?? null });
const refused = (context, refusals) => ({ ...envelope(context), status: 'refused', code: refusals[0].code, reason: refusals[0].reason, refusals });
const progressView = capture => ({ total: capture.total, accepted: capture.accepted, remaining: capture.remaining, eligibleIds: [...capture.eligibleIds] });
const configView = (context, config) => (config ? { path: config.relative, changes: config.changes }
    : { path: slashed(path.relative(context.root, context.configPath)), changes: [], note: 'No tracker block is declared: the project stays unconfigured and is recognised as current by its record locations' });
/** What the recount held for each former group, as counts and marks: never the identities, which the progress view states once for the project. */
const recountView = (mapped, groups) => groups.map(scope => ({ ...scopeMark(scope), becomes: earlierProject.groupKind(mapped.index.groups.find(group => group.id === scope.id)?.purpose ?? null) }));

function preview(context, planned) {
    const byKind = {};
    for (const change of planned.changes) byKind[change.kind[1]] = (byKind[change.kind[1]] || 0) + 1;
    const { mapped } = planned;
    return { ...envelope(context), status: 'preview', dryRun: true, versionControl: controlView(planned.control),
        moves: mapped.moves, locations: { removed: planned.locations, created: [...new Set(mapped.moves.map(move => locationOf(context, move.to)))].filter(location => !entryAt(context, location)).sort() },
        records: { total: planned.records, byKind, changes: planned.changes }, config: configView(context, planned.config),
        progress: progressView(planned.reading), currentlyVerified: { before: planned.reading.currentlyVerified, after: planned.after.currentlyVerified },
        standing: standingChange(planned.reading.standing, planned.after, 'preview'), linkPaths: linkPathsView(context, planned.linkPaths),
        reads: { before: planned.reading.reads, after: planned.after.reads },
        crossings: mapped.crossings, nested: mapped.nested, levelsUnset: mapped.levelsUnset,
        recount: { conserved: true, groups: recountView(mapped, planned.recount.groups) },
        preserved: 'Authored bodies, titles, intents, reasons, identities, file names, criteria, proofs, acceptance, actors, times and revisions stay exactly as stored; no record is created or deleted and no history entry, revision or receipt is added',
        oneWay: 'There is no reverse action: returning to the earlier vocabulary means restoring the record root and the project configuration from version control or your backup',
        next: 'Run the same command without --dry-run to migrate' };
}

function loadJournal(context) {
    const invalid = () => fail('INVALID_MIGRATION_RECORD', `Migration progress record ${journalOf(context)} is unreadable or was not written by this migration, so the tracker will not act on it: it neither completes nor abandons a migration from that file, and asking again gives this same answer`);
    const bytes = readBytes(context.root, journalOf(context));
    let value;
    try { value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); } catch { invalid(); }
    const capture = value?.capture;
    const validIds = ids => Array.isArray(ids) && ids.every((id, index) => typeof id === 'string' && ITEM_ID.test(id)
        && (index === 0 || ids[index - 1] < id));
    const standing = capture?.standing;
    const groups = value?.index?.groups;
    // The steps and the index are this migration's own: every group is named with the path it had and the path this
    // migration gives it, so a record naming other paths is never acted on.
    // Captured IDs must match the writer's valid, sorted form: conservation compares their order,
    // so accepting an impossible capture could change files before resume or abandon can reject it.
    if (value?.schemaVersion !== 1 || value.kind !== JOURNAL_KIND || value.from !== EARLIER_VERSION || value.to !== BASE_VERSION
        || (value.backupConfirmed !== undefined && typeof value.backupConfirmed !== 'boolean')
        || !Array.isArray(value.steps) || value.steps.length !== STEPS.length
        || value.steps.some((step, index) => !mapping(step) || step.id !== STEPS[index] || !STEP_STATES.includes(step.status))
        || !Array.isArray(groups) || !validIds(groups.map(group => group?.id))
        || groups.some(group => !EARLIER_MAPPING.groupKinds.includes(group.kind) || (group.purpose !== null && typeof group.purpose !== 'string')
            || !relativePath(group.from) || !group.from.startsWith(`${under(context, EARLIER.folders[group.kind])}/`) || group.to !== earlierProject.destination(context.artifactsRoot, group)
            || !Array.isArray(group.members) || group.members.some(id => typeof id !== 'string' || !ITEM_ID.test(id)) || new Set(group.members).size !== group.members.length)
        || !capture || !['total', 'accepted', 'remaining', 'records'].every(key => Number.isSafeInteger(capture[key]) && capture[key] >= 0)
        || capture.accepted > capture.total || capture.remaining !== capture.total - capture.accepted || capture.records < capture.total
        || ![capture.eligibleIds, capture.acceptedIds].every(validIds)
        || capture.eligibleIds.length !== capture.total || capture.acceptedIds.length !== capture.accepted
        || capture.acceptedIds.some(id => !capture.eligibleIds.includes(id))
        || typeof capture.recordIdentity !== 'string' || !/^[a-f0-9]{64}$/.test(capture.recordIdentity)
        || !Array.isArray(capture.groups) || !validIds(capture.groups.map(scope => scope?.id))
        || capture.groups.some(scope => !Number.isSafeInteger(scope.eligible) || scope.eligible < 0 || scope.eligible > capture.total || typeof scope.identity !== 'string' || !/^[a-f0-9]{64}$/.test(scope.identity))
        || groups.some(group => !capture.groups.some(scope => scope.id === group.id))
        || (capture.currentlyVerified !== undefined && (!Number.isSafeInteger(capture.currentlyVerified)
            || capture.currentlyVerified < 0 || capture.currentlyVerified > capture.accepted))
        || (standing !== undefined && (!mapping(standing) || ![standing.verified, standing.ready].every(validIds)
            || (standing.unresolved !== undefined && (!mapping(standing.unresolved)
                || Object.entries(standing.unresolved).some(([id, reasons]) => !ITEM_ID.test(id) || !Array.isArray(reasons)
                    || reasons.some(reason => typeof reason !== 'string' || !/^[a-f0-9]{16}$/.test(reason)))))))) invalid();
    // Validate the captured baseline and the index before resume OR abandon can write: rebuilding either from
    // today's files would bless corrupt recovery state and destroy the conservation check.
    return { value, bytes };
}

/** One atomic replacement per recorded fact; the previous bytes are the expected content, so a foreign change is a conflict. */
function writeJournal(context, value, previous) {
    const bytes = journalBytes(value);
    publishBytes(context.root, journalOf(context), bytes, previous ? hash(previous.bytes) : null);
    return { value, bytes };
}

const stepOf = (journal, id) => journal.value.steps.find(step => step.id === id);
const settled = step => step.status === 'done' || step.status === 'skipped';
const mark = (context, journal, id, status) => (stepOf(journal, id).status === status ? journal : writeJournal(context,
    { ...journal.value, steps: journal.value.steps.map(step => (step.id === id ? { ...step, status } : step)) }, journal));

// The two requests a person can make of an unfinished migration, as they are typed. The checkout is theirs to name.
const COMPLETE_COMMAND = 'migrate --root <checkout>';
const ABANDON_COMMAND = `${COMPLETE_COMMAND} --abandon`;
// How a person confirms on the command line that a backup can restore what version control cannot.
const BACKUP_FLAG = '--backup-confirmed';
const numbered = steps => steps.map((step, index) => `(${index + 1}) ${step}`).join('; ');
const configOf = context => slashed(path.relative(context.root, context.configPath));
const present = (context, relative) => { try { return !!entryAt(context, relative); } catch { return true; } };

/**
 * The way out of a migration that will not be completed, in the order it must be done. It names only what this
 * migration made, read from the progress record and still on disk: the location it created, and each record it wrote
 * into a location the earlier vocabulary also uses, which a restore puts nothing back over. The last step is the
 * explicit abandon request; a plain repeated run is never offered as a way to abandon.
 */
function abandonment(context, journal) {
    const written = journal.value.index.groups.filter(group => present(context, group.to));
    const created = createdLocations(context).filter(location => written.some(group => locationOf(context, group.to) === location) && present(context, location));
    const shared = written.filter(group => !created.includes(locationOf(context, group.to))).map(group => group.to);
    const steps = [`restore ${rootOf(context)} and ${configOf(context)} from version control or your backup`,
        ...(created.length ? [`remove the ${created.length === 1 ? 'folder' : 'folders'} this migration created: ${created.join(', ')}`] : []),
        ...(shared.length ? [`remove the ${shared.length === 1 ? 'record' : 'records'} this migration wrote into a location the earlier vocabulary also uses: ${named(shared)}`] : []),
        `run ${ABANDON_COMMAND}: it checks that the project is back whole and removes the progress record ${journalOf(context)} itself, and it never removes or moves a record or a folder. Do not remove that file by hand`];
    return { steps, text: `To abandon this migration instead of completing it: ${numbered(steps)}` };
}

/**
 * The way out when the progress record cannot be read or was not written by this migration. Its contents are never
 * trusted, so nothing is named from it and no request is promised to work: the person restores the project and sets
 * the file aside themselves.
 */
function byHand(context) {
    const steps = [`if a migration was under way here, restore ${rootOf(context)} and ${configOf(context)} from version control or your backup, so that the project is whole in one vocabulary`,
        `then set ${journalOf(context)} aside by hand: move it out of ${rootOf(context)} and keep it for inspection. The tracker does not check that restore and does not remove that file`];
    return { steps, text: `The project stays unavailable while that file is in ${rootOf(context)}. The way out is by hand: ${numbered(steps)}` };
}

/**
 * Whether the disk contradicts the progress record: a group record the migration removed from its earlier path that is
 * there again, or a declaration that reads earlier again. Group records move one at a time in identity order, so an
 * interruption leaves the moved ones first, at most one written and not yet removed, and the rest untouched; an earlier
 * record back among the moved ones is a restore from outside. An interruption alone never looks like this, because the
 * migration puts nothing back. A record that is not a group and reads earlier again contradicts nothing: it is simply
 * rewritten again. Null when nothing contradicts, and the migration resumes.
 */
function restoredOutside(context, journal) {
    const groups = journal.value.index.groups.map(group => ({ ...group, source: present(context, group.from), written: present(context, group.to) }));
    let returned = groups.filter(group => group.source);
    if (!settled(stepOf(journal, 'groups'))) {
        const last = groups.map(group => group.written).lastIndexOf(true);
        returned = groups.slice(0, last + 1).filter(group => group.source);
        // The one record written and not yet removed when the migration stopped.
        if (returned.length === 1 && returned[0].id === groups[last].id) returned = [];
    }
    const redeclared = stepOf(journal, 'config').status === 'done' && context.enrolled && context.config.taskTracking.schemaVersion === EARLIER_VERSION;
    if (!returned.length && !redeclared) return null;
    return { returned, redeclared, back: [...returned.map(group => group.from), ...(redeclared ? [`the earlier declaration in ${configOf(context)}`] : [])] };
}

/**
 * Whether the earlier project is back whole, asked in every state a migration can stop in, also before its first
 * change. `restored` is the progress it reads, equal to the values captured before the first change; otherwise
 * `pending` names each thing that is not back or still remains. Whole means every condition holds: each earlier
 * location that held a group record is present, nothing remains under a name only the current vocabulary uses, the
 * declaration does not say current, the project reads as the earlier vocabulary, every record reads as the earlier
 * vocabulary stored it, progress equals the capture, and every group holds, by its stored list, what it held then. A
 * record the migration wrote that is left beside the restored ones fails one of the last four: it is stamped current,
 * or it is a second home of an identity.
 */
function wholeRestore(context, journal) {
    const groups = journal.value.index.groups;
    const held = [...new Set(groups.map(group => locationOf(context, group.from)))].sort();
    const pending = [...held.filter(location => !entryAt(context, location)?.isDirectory()).map(location => `${location} is not back`),
        ...createdLocations(context).filter(location => entryAt(context, location)).map(location => `${location} is still present (remove it if this migration created it, or move it out of ${rootOf(context)} if it is yours)`),
        ...(context.enrolled && vocabulary.inCurrentStructure(context.config.taskTracking.schemaVersion) ? [`${configOf(context)} still declares the current vocabulary`] : [])];
    if (pending.length) return { pending };
    const view = settledVocabulary(context);
    // A project with no group record and no declaration cannot be seen to be earlier by its locations; its records say so below.
    if (view.state !== 'earlier' && !(view.state === 'current' && !view.declared && !groups.length)) return { pending: [`the project does not read as the earlier vocabulary (${view.reason || 'it reads as the current one'})`] };
    const scan = store.inspectStoredRecords(context, { version: EARLIER_VERSION });
    if (scan.coverage !== 'complete') return { pending: [`${named(scan.diagnostics.map(finding => finding.path || finding.reason))} cannot be read as a record of the earlier vocabulary`] };
    const stamped = scan.records.filter(record => record.storedVersion === BASE_VERSION).map(record => record.ownerPath);
    if (stamped.length) return { pending: [`${named(stamped)} is still stored in the current vocabulary`] };
    let actual;
    try { actual = progressOf({ ...context, vocabulary: vocabulary.resolveVocabulary({ declaredVersion: EARLIER_VERSION }) }); }
    catch (error) { if (!error.code || error.syscall) throw error; return { pending: ['progress cannot be read from the project'] }; }
    const capture = journal.value.capture;
    const differing = CONSERVED.filter(key => store.stableValue(actual[key]) !== store.stableValue(capture[key]));
    if (differing.length) return { pending: [`${differing.join(', ')} differ from the values captured before the migration began, as they do while a record this migration wrote is still left beside a restored one or a record is missing`] };
    const lists = scopeDifferences(capture.groups, storedScopes(scan.records).groups);
    return lists.length ? { pending: [`the member lists of ${named(lists.map(scope => scope.groupId))} do not hold what they held before the migration began`] } : { restored: actual };
}

// What a preview says of an unfinished migration whose earlier project is whole: put back after the migration changed it, or not changed yet.
const RESTORED_PREVIEW = `Migration in progress: its progress record remains, but the earlier project is back as it was before the migration began. To end the migration run ${ABANDON_COMMAND}: it removes only the progress record, and the project then reads as the earlier vocabulary again. A preview changes nothing`;
const UNCHANGED_PREVIEW = `Migration in progress: its progress record remains and the earlier project is as it was before the migration began. To complete the migration run ${COMPLETE_COMMAND}; to end it run ${ABANDON_COMMAND}, which removes only the progress record, and the project then reads as the earlier vocabulary again. A preview changes nothing`;

/** Ends a migration on request once the earlier project is back whole. Only the progress record is removed; no record or folder is touched. */
function abandoned(context, journal, actual) {
    removeBytes(context.root, journalOf(context), hash(journal.bytes));
    return { ...envelope(context), status: 'abandoned', code: 'MIGRATION_ABANDONED',
        reason: `Migration abandoned: the earlier records and the project configuration are back as they were before the migration began and nothing the migration created remains, so the progress record ${journalOf(context)} was removed. The project stores the earlier vocabulary again and is read-only; preview and run the migration to start over`,
        progress: progressView(actual) };
}

const nothingToAbandon = context => ({ ...envelope(context), status: 'current', code: 'NOTHING_TO_ABANDON',
    reason: `Nothing to abandon: no migration is unfinished in this project (it holds no progress record ${journalOf(context)}). Nothing was changed` });

/** Refuses an abandon request for a project that is not back whole. Nothing is moved, rewritten or removed. */
function notAbandoned(context, journal, pending) {
    const exit = abandonment(context, journal);
    return { ...envelope(context), status: 'interrupted', code: 'RESTORE_INCOMPLETE',
        reason: `Not abandoned: the project is not back as it was before the migration began: ${pending.join('; ')}. Nothing was changed: the progress record ${journalOf(context)} is kept and no record or folder was removed or moved. ${exit.text}. To complete the migration instead, run ${COMPLETE_COMMAND} without --abandon`,
        journal: journalOf(context), notRestored: pending, abandon: exit.steps };
}

/**
 * How a migration whose disk was restored from outside is completed after all: by undoing that restore. Nothing is
 * named for removal that the progress record does not account for, and a person is asked to check before removing.
 */
function completion(context, journal, outside) {
    const gone = outside.returned.filter(group => !present(context, group.to)).map(group => group.to);
    if (gone.length) return { steps: [], text: `This migration can no longer be completed from here: ${named(gone)}, which it wrote, is gone. Abandon it, then preview and run the migration afresh` };
    const steps = outside.returned.length ? [`remove ${named(outside.returned.map(group => group.from))}, which the restore put back, after checking that each of those records is also kept, as migrated, at ${named(outside.returned.map(group => group.to))}`] : [];
    if (outside.redeclared) {
        let changes = 'so that it declares the current vocabulary again';
        try {
            const edit = configEdit(context);
            if (edit) changes = edit.changes.map(change => (change.movedTo ? `restate ${change.field} as ${change.movedTo}` : `set ${change.field} to ${change.to}`)).join(', ');
        } catch (error) { if (error.code !== 'CONFIG_NOT_REWRITABLE') throw error; }
        steps.push(`put the declaration this migration wrote back in ${configOf(context)}: ${changes}`);
    }
    steps.push(`run ${COMPLETE_COMMAND} again`);
    return { steps, text: `To complete the migration instead, undo that restore: ${numbered(steps)}` };
}

/**
 * Stops a plain run whose disk contradicts the progress record. Nothing is moved, rewritten or removed, and the
 * migration is neither carried further nor abandoned: which of the two a person wants cannot be read from the disk,
 * so both ways on are named.
 */
function contradicted(context, journal, outside) {
    const exit = abandonment(context, journal);
    const whole = wholeRestore(context, journal);
    const forward = whole.restored ? { steps: [], text: 'There is nothing left to complete: to migrate after all, abandon first, then preview and run the migration afresh' }
        : completion(context, journal, outside);
    return { ...envelope(context), status: 'interrupted', code: 'RESTORED_FROM_OUTSIDE',
        reason: `Restored from outside: back again after this migration changed them: ${named(outside.back)}. Nothing was changed: a run without an abandon request completes a migration and never abandons one, and it does not carry a restored project further. ${whole.restored ? 'The earlier project is back whole' : `The earlier project is not back whole: ${whole.pending.join('; ')}`}. ${exit.text}. ${forward.text}`,
        journal: journalOf(context), back: outside.back.slice(0, NAMED), notRestored: whole.pending || [], abandon: exit.steps, complete: forward.steps };
}

/**
 * The group records still stored in the earlier form that no longer hold what the progress record holds for them: other
 * members, or another purpose. A repeated run migrates from the recorded index and the result is verified against it,
 * so a list changed from outside after the migration began would be dropped and still be reported as conserved. Each is
 * named with the identities that came and went; a purpose only as changed.
 */
function staleGroups(context, journal, records) {
    const recorded = new Map(journal.value.index.groups.map(group => [group.id, group]));
    const stale = [];
    for (const stored of earlierProject.memberIndex(records.filter(record => record.storedVersion !== BASE_VERSION), context.artifactsRoot).groups) {
        const group = recorded.get(stored.id);
        // A group record the index does not hold appeared after the migration began; the mapping names it.
        if (!group) continue;
        const [added, removed] = [stored.members.filter(id => !group.members.includes(id)), group.members.filter(id => !stored.members.includes(id))].map(ids => ids.filter(id => ITEM_ID.test(id)).sort());
        const members = stored.members.length !== group.members.length || added.length > 0 || removed.length > 0;
        if (members || stored.purpose !== group.purpose) stale.push({ groupId: stored.id, path: stored.from,
            ...(members ? { members: { added: added.slice(0, NAMED), removed: removed.slice(0, NAMED) } } : {}), ...(stored.purpose !== group.purpose ? { purpose: true } : {}) });
    }
    return stale;
}

/**
 * Every record of a project whose migration has begun, as stored: those not yet rewritten, in the earlier words, and
 * those already rewritten, in the current ones, wherever a moved one is now kept.
 */
function storedProject(context) {
    const earlier = store.inspectStoredRecords(context, { version: EARLIER_VERSION });
    const moved = store.inspectStoredRecords(context, { version: BASE_VERSION,
        folders: Object.fromEntries(Object.entries(CURRENT.folders).filter(([, folder]) => vocabulary.CURRENT_ONLY_LOCATIONS.includes(topLevel(folder)))) });
    return { records: [...earlier.records, ...moved.records], diagnostics: [...earlier.diagnostics, ...moved.diagnostics],
        coverage: earlier.coverage === 'complete' && moved.coverage === 'complete' ? 'complete' : 'partial' };
}

/** Removes an earlier location the migration emptied, folder by folder from the deepest; anything left in it is named and nothing is removed around it. */
function removeEmptied(context, relative) {
    const folder = scopedPath(context.root, relative);
    let children;
    try { children = fs.readdirSync(folder, { withFileTypes: true }); }
    catch (error) { if (error.code === 'ENOENT') return null; throw error; }
    for (const child of children.sort((a, b) => byText(a.name, b.name))) {
        if (!child.isDirectory()) return `${relative}/${child.name}`;
        const left = removeEmptied(context, `${relative}/${child.name}`);
        if (left) return left;
    }
    fs.rmdirSync(folder);
    return null;
}

/**
 * Carries a recorded migration forward from its first unsettled step. Each step is decided from what is on disk and
 * from the recorded index, so a change that was made just before an interruption is never made twice. `checkpoint` is
 * told each point reached; whatever it throws stops the run there with the progress record exactly as that point left it.
 */
function advance(context, journal, checkpoint, resumed) {
    const stopped = (code, reason, step) => {
        const exit = abandonment(context, journal);
        return { ...envelope(context), status: 'interrupted', code, reason: `${reason}. ${vocabulary.REFUSALS.MIGRATION_IN_PROGRESS}. ${exit.text}`, step, journal: journalOf(context), abandon: exit.steps };
    };
    const index = journal.value.index;
    const relocate = relocation(context, index.groups);
    // A group that has not moved yet and no longer holds what was recorded for it: stopped with both ways on, nothing changed.
    const staleIndex = (stale, step) => {
        const exit = abandonment(context, journal);
        const complete = [`put back, in ${named(stale.map(group => group.path))}, the member list and purpose recorded for it under index.groups in ${journalOf(context)}`, `run ${COMPLETE_COMMAND} again`];
        const changed = group => [...(group.members ? [`members changed${group.members.added.length ? `, gained ${group.members.added.join(', ')}` : ''}${group.members.removed.length ? `, lost ${group.members.removed.join(', ')}` : ''}`] : []), ...(group.purpose ? ['purpose changed'] : [])].join('; ');
        return { ...envelope(context), status: 'interrupted', code: 'MEMBER_INDEX_STALE',
            // Found before the group pass of a run whose first pass may have rewritten records: said as exactly as that.
            reason: `The project changed after the migration began: ${named(stale.map(group => `${group.groupId} (${changed(group)})`))} no longer ${stale.length === 1 ? 'holds' : 'hold'} the members and purpose recorded before the first change, and a repeated run migrates from that record. ${step === 'groups' ? 'No group record was moved by this run' : 'Nothing was changed'}. To complete this migration as it was recorded: ${numbered(complete)}. To migrate the project with the change instead, put it back first as it was when the migration began, from the commit or backup of that time and with the changed member list or purpose as recorded, because an abandon request is granted only then: ${numbered(exit.steps)}; then make the change again, and preview and run the migration afresh`,
            step, journal: journalOf(context), groups: stale.slice(0, NAMED), complete, abandon: exit.steps };
    };
    // The mapping is always worked out from the recorded index: a group that was already rewritten no longer holds its list.
    const mappedNow = step => {
        const stored = storedProject(context);
        if (stored.coverage !== 'complete') return { stop: stopped('INCOMPLETE_SCOPE', `Inspection incomplete: ${named(stored.diagnostics.map(finding => finding.path || finding.reason))} cannot be read as a record; repair it`, step) };
        // The records are the ones the migration began with, by identity: none is rewritten that was not captured, and none is missed.
        const identities = new Set(stored.records.map(record => record.id));
        if (identityOf(identities) !== journal.value.capture.recordIdentity) {
            const missing = [...new Set([...index.groups.flatMap(group => [group.id, ...group.members]), ...journal.value.capture.eligibleIds])].filter(id => !identities.has(id)).sort();
            return { stop: stopped('INCOMPLETE_SCOPE', `The project changed after the migration began: ${missing.length ? `${named(missing)} is no longer stored` : 'a record was added or removed'}; put the records back as they were`, step) };
        }
        // Every group still stored in the earlier form holds exactly what was recorded for it, or nothing of this pass is done.
        const stale = staleGroups(context, journal, stored.records);
        if (stale.length) return { stop: staleIndex(stale, step) };
        const mapped = earlierProject.mapEarlierProject({ records: stored.records, artifactsRoot: context.artifactsRoot, index });
        if (mapped.problems.length) return { stop: stopped('INCOMPLETE_SCOPE', `The project changed after the migration began: ${named(mapped.problems.map(problem => problem.path || problem.itemId || problem.memberId))} can no longer be migrated as recorded; put it back as it was`, step) };
        return { stored, mapped };
    };

    // Every record that is not a group, rewritten where it is. One that reads earlier is rewritten whatever the step
    // says, so a record put back from outside is simply rewritten again.
    let rewritten = 0;
    let noted;
    {
        const now = mappedNow('members');
        if (now.stop) return now.stop;
        // What a person is told about the mapping follows from the recorded index alone, so a repeated run states it too.
        noted = { crossings: now.mapped.crossings, nested: now.mapped.nested, levelsUnset: now.mapped.levelsUnset };
        const pending = [...now.mapped.conversions].filter(([, conversion]) => !conversion.group).sort(([a], [b]) => byText(a.ownerPath, b.ownerPath));
        const changes = [];
        for (const [record, conversion] of pending) {
            const candidate = currentCandidate(record, conversion, relocate);
            if (candidate.contentHash !== record.contentHash) changes.push([record, candidate]);
        }
        if (changes.length) journal = mark(context, journal, 'members', 'started');
        for (const [record, candidate] of changes) {
            store.saveRecord(context, candidate, record.contentHash);
            checkpoint('member-rewritten', { count: ++rewritten, of: changes.length });
        }
        if (!settled(stepOf(journal, 'members'))) { journal = mark(context, journal, 'members', 'done'); checkpoint('members-rewritten'); }
    }

    // Each group record, written at its new path and then removed from its old one, one file at a time.
    let moved = 0;
    if (!settled(stepOf(journal, 'groups'))) {
        const now = mappedNow('groups');
        if (now.stop) return now.stop;
        journal = mark(context, journal, 'groups', 'started');
        const sources = new Map([...now.mapped.conversions].filter(([, conversion]) => conversion.group).map(([record, conversion]) => [slashed(record.ownerPath), [record, conversion]]));
        for (const group of index.groups) {
            const source = sources.get(group.from);
            const destination = entryAt(context, group.to);
            if (!source && destination) continue;
            if (!source) return stopped('SOURCE_MISSING', `Neither ${group.from} nor ${group.to} exists; restore the record before continuing`, 'groups');
            const candidate = currentCandidate(source[0], source[1], relocate, group.to);
            if (destination) {
                // Written by an earlier run exactly when it holds what this run would write. Anything else is someone else's and is never replaced.
                let same = false;
                try { same = hash(readBytes(context.root, group.to)) === candidate.contentHash; } catch (error) { if (!error.code || error.syscall) throw error; }
                if (!same) return stopped('DESTINATION_PRESENT', `Destination already present: ${group.to} exists while ${group.from} still waits to move; move or remove ${group.to}`, 'groups');
            } else {
                publishBytes(context.root, group.to, candidate.bytes, null);
                checkpoint('group-written', { count: moved + 1, of: index.groups.length });
            }
            removeBytes(context.root, group.from, source[0].contentHash);
            checkpoint('group-moved', { count: ++moved, of: index.groups.length });
        }
        journal = mark(context, journal, 'groups', 'done');
        checkpoint('groups-moved');
    }

    // The locations only the earlier vocabulary reads, now empty.
    if (!settled(stepOf(journal, 'locations'))) {
        const held = emptiedLocations(context).filter(location => entryAt(context, location));
        if (held.length) journal = mark(context, journal, 'locations', 'started');
        for (const location of held) {
            const left = removeEmptied(context, location);
            if (left) return stopped('LOCATION_NOT_EMPTY', `${location} cannot be removed: ${left} is in it and is not a record this migration moved; move or remove it`, 'locations');
        }
        journal = mark(context, journal, 'locations', held.length ? 'done' : 'skipped');
        checkpoint('locations-removed');
    }

    let declared = trackingContext(context.root);
    if (!settled(stepOf(journal, 'config'))) {
        const edit = configEdit(declared);
        if (edit) {
            journal = mark(context, journal, 'config', 'started');
            writeConfig(context, edit);
            checkpoint('config-written');
            declared = trackingContext(context.root);
        }
        journal = mark(context, journal, 'config', edit || declared.enrolled ? 'done' : 'skipped');
    }

    checkpoint('before-verify');
    const failed = (reason, extra = {}) => {
        const exit = abandonment(context, journal);
        return { ...envelope(context), status: 'failed', code: 'MIGRATION_VERIFICATION_FAILED',
            reason: `Migration verification failed: ${reason}. The progress record ${journalOf(context)} is kept and the project stays unavailable; correct the difference and run the migration again. ${exit.text}`,
            journal: journalOf(context), abandon: exit.steps, ...extra };
    };
    const view = settledVocabulary(declared);
    if (view.state !== 'current') return failed(`the project does not read as the current vocabulary (${view.reason})`);
    const actual = progressOf({ ...declared, vocabulary: view });
    const expected = journal.value.capture;
    const differing = CONSERVED.filter(key => store.stableValue(actual[key]) !== store.stableValue(expected[key]));
    if (differing.length) return failed(`${differing.join(', ')} differ from the values captured before the first change`,
        { differing, expected: progressView(expected), actual: progressView(actual), records: { expected: expected.records, actual: actual.records } });
    // The recount: what each group held by its stored list, against what the reader shows for the area or initiative it became.
    const scopes = scopeDifferences(expected.groups, actual.scopes(expected.groups.map(scope => scope.id)));
    if (scopes.length) return failed(`the eligible tasks of ${named(scopes.map(scope => scope.groupId))} differ from what each group's member list held before the first change`,
        { differing: ['groups'], groups: scopes.slice(0, NAMED) });
    journal = mark(context, journal, 'verify', 'done');
    checkpoint('verified');
    removeBytes(context.root, journalOf(context), hash(journal.bytes));
    const current = store.inspectStoredRecords({ ...declared, vocabulary: view }, { version: BASE_VERSION }).records;
    return { ...envelope(context), status: 'migrated', resumed,
        records: { total: actual.records, rewritten, moved }, steps: journal.value.steps.map(step => ({ id: step.id, status: step.status })),
        config: { path: slashed(path.relative(declared.root, declared.configPath)), status: stepOf(journal, 'config').status },
        progress: progressView(actual), verified: true, recount: { conserved: true, groups: expected.groups.length }, reads: actual.reads,
        // Said at the moment it happens: the listings that were not kept, the nested ones and the levels left unset are in no record afterwards.
        ...noted,
        currentlyVerified: { before: expected.currentlyVerified ?? null, after: actual.currentlyVerified },
        standing: standingChange(expected.standing, actual, 'result'),
        linkPaths: linkPathsView(context, unmappedPaths(context, index.groups, current)) };
}

function start(context, planned, checkpoint) {
    const journal = writeJournal(context, firstJournal(planned), null);
    checkpoint('journal-written');
    return advance(context, journal, checkpoint, false);
}

/** Records stamped for the earlier vocabulary in a project that reads as current, in its own locations or left in an earlier one. */
function earlierStamped(context) {
    const stamped = scan => scan.records.filter(record => record.storedVersion === EARLIER_VERSION).map(record => record.ownerPath);
    // A project that reads as current may store either version of the current structure, so its records are read as the current one reads them.
    return [...stamped(store.inspectStoredRecords(context, { version: vocabulary.CURRENT_VERSION })),
        ...stamped(store.inspectStoredRecords(context, { version: EARLIER_VERSION,
            folders: Object.fromEntries(Object.entries(EARLIER.folders).filter(([, folder]) => vocabulary.EARLIER_ONLY_LOCATIONS.includes(topLevel(folder)))) }))].sort();
}

/**
 * The records that show an undeclared project to store the first vocabulary although it holds none of that vocabulary's
 * own locations: records stamped for it, in a project where no record is stamped for a vocabulary this copy reads.
 */
function firstVocabularyOnly(context) {
    if (context.vocabulary.declared || !resolveTrackingProfile(context).available) return [];
    const first = store.firstVocabularyRecords(context);
    if (!first.length) return [];
    const read = [vocabulary.CURRENT_VERSION, EARLIER_VERSION].flatMap(version => store.inspectStoredRecords(context, { version }).records).some(record => record.storedVersion !== null);
    return read ? [] : first.map(record => record.path).sort();
}

/** Decides what a request may do from the project's present state. `options` say whether it is a run and whether a backup is confirmed. Changes nothing. */
function prepare(rootDir, options) {
    const context = trackingContext(rootDir);
    const stored = context.vocabulary;
    // The first vocabulary is neither read nor migrated by this copy: refused by name, with what to do.
    if (stored.state === 'unsupported') return { context, result: refused(context, [{ code: stored.code, reason: stored.reason }]) };
    // Recognised by its records where neither a declaration nor a location of its own says so.
    const first = ['current', 'earlier'].includes(stored.state) ? firstVocabularyOnly(context) : [];
    if (first.length) return { context, result: refused(context, [{ code: 'UNSUPPORTED_VOCABULARY', paths: first.slice(0, NAMED),
        reason: `${vocabulary.REFUSALS.UNSUPPORTED_VOCABULARY} (records stamped for it: ${named(first)})` }]) };
    if (stored.state === 'current') {
        // A project that reads as current while its records are stamped earlier is not migrated by guessing: it is told how to say what it stores.
        const stamped = resolveTrackingProfile(context).available ? earlierStamped(context) : [];
        if (stamped.length) return { context, result: refused(context, [{ code: 'EARLIER_VOCABULARY_RECORD', paths: stamped.slice(0, NAMED),
            reason: `This project reads as the current vocabulary but holds records stamped for the earlier one: ${named(stamped)}. If the project still stores the earlier vocabulary, declare taskTracking.schemaVersion ${EARLIER_VERSION} in ${configOf(context)}, then preview and run the migration; if those records arrived from an older copy, migrate them there or remove them here. Nothing was changed` }]) };
        const flagged = [...stored.earlierLocations, ...stored.retiredLocations];
        return { context, result: { ...envelope(context), status: 'current', code: 'NOTHING_TO_MIGRATE',
            reason: `Nothing to migrate: this project already stores the current vocabulary${flagged.length
                ? `; files under ${flagged.map(name => `${context.artifactsRoot}/${name}`).join(', ')} are flagged and are not migrated, because the project reads as the current vocabulary` : ''}` } };
    }
    if (stored.state === 'migrating') return { context, migrating: true };
    if (stored.state !== 'earlier') {
        // Both vocabularies' locations are present. For a migration the obstacle is the location already standing where its records must go.
        const taken = stored.currentLocations.map(name => `${context.artifactsRoot}/${name}`);
        return { context, result: refused(context, [...(taken.length ? [{ code: 'DESTINATION_PRESENT', reason: `Destination already present: ${named(taken)}; move or remove it, then retry`, paths: taken }] : []),
            { code: stored.code, reason: stored.reason }]) };
    }
    const planned = plan(context, options);
    return planned.refusals.length ? { context, result: refused(context, planned.refusals) } : { context, planned };
}

/**
 * `migrate(root)` migrates or completes an unfinished migration and never abandons one; `{ dryRun: true }` previews and
 * changes nothing; `{ abandon: true }` is the only way to abandon: it removes the progress record, and nothing else,
 * once the earlier project is back whole. `{ backupConfirmed: true }` is a person's word that a backup can restore the
 * project: a run needs it exactly where version control cannot, and nowhere else does it change anything. The result
 * always has `status`: preview, migrated, current (nothing to migrate, or nothing to abandon), refused (nothing changed),
 * interrupted (progress record kept), failed (verification differed; progress record kept) or abandoned (asked for, and
 * the earlier project was back whole).
 */
async function migrate(rootDir, { dryRun = false, abandon = false, backupConfirmed = false, checkpoint = () => {} } = {}) {
    let context = null;
    try {
        if (dryRun && abandon) return refused(null, [{ code: 'INVALID_INPUT', reason: 'Choose one of a preview and an abandon request: a preview describes a migration that has not started, and abandoning cannot be previewed. An abandon request changes nothing unless the earlier project is back whole' }]);
        if (abandon) {
            context = trackingContext(rootDir);
            if (context.vocabulary.state === 'unsupported') return refused(context, [{ code: context.vocabulary.code, reason: context.vocabulary.reason }]);
            if (context.vocabulary.state !== 'migrating') return nothingToAbandon(context);
            // Decided under the writer lock, from the disk as it is then.
            return await withTrackingLock(context.root, () => {
                context = trackingContext(rootDir);
                if (context.vocabulary.state !== 'migrating') return nothingToAbandon(context);
                const journal = loadJournal(context);
                const whole = wholeRestore(context, journal);
                return whole.restored ? abandoned(context, journal, whole.restored) : notAbandoned(context, journal, whole.pending);
            });
        }
        const asked = { run: !dryRun, backupConfirmed: backupConfirmed === true };
        const first = prepare(rootDir, asked);
        context = first.context;
        if (first.result) return first.result;
        if (dryRun && first.migrating) {
            // Read without the lock and changed by nothing: a preview only says which of the two unfinished states this is.
            let reason = vocabulary.REFUSALS.MIGRATION_IN_PROGRESS;
            try {
                const journal = loadJournal(context);
                if (wholeRestore(context, journal).restored) reason = restoredOutside(context, journal) ? RESTORED_PREVIEW : UNCHANGED_PREVIEW;
            } catch { /* An unreadable progress record is still an unfinished migration. */ }
            return refused(context, [{ code: 'MIGRATION_IN_PROGRESS', reason }]);
        }
        if (dryRun) return preview(context, first.planned);
        // Decided again under the writer lock: another run may have finished, started or stopped since the first look.
        return await withTrackingLock(context.root, () => {
            const held = prepare(rootDir, asked);
            context = held.context;
            if (held.result) return held.result;
            if (!held.migrating) return start(context, held.planned, checkpoint);
            const journal = loadJournal(context);
            // A project put back from outside is never carried forward, and never abandoned here: both ways on are named.
            const outside = restoredOutside(context, journal);
            return outside ? contradicted(context, journal, outside) : advance(context, journal, checkpoint, true);
        });
    } catch (error) {
        // A failure raised by the tracker carries its own project-relative reason; a system failure is named by its code alone.
        const reason = error.code && !error.syscall ? error.message : `Migration could not continue (${error.code || 'unexpected failure'})`;
        let unfinished = false;
        try { unfinished = !!context && fs.lstatSync(path.join(context.root, ...journalOf(context).split('/'))) !== null; } catch { /* No progress record: nothing was started. */ }
        if (!unfinished) return refused(context, [{ code: error.code || 'IO_FAILURE', reason }]);
        // The steps are named from the progress record when it can be read. One that cannot be read is never acted on,
        // by a repeated run or by an abandon request, so neither is promised: the way out is by hand.
        let journal = null;
        try { journal = loadJournal(context); } catch { /* Unreadable, foreign or linked. */ }
        const exit = journal ? abandonment(context, journal) : byHand(context);
        return { ...envelope(context), status: 'interrupted', code: error.code || 'IO_FAILURE',
            reason: journal ? `${reason}. ${vocabulary.REFUSALS.MIGRATION_IN_PROGRESS}. ${exit.text}` : `${reason}. ${exit.text}`, journal: journalOf(context), abandon: exit.steps };
    }
}

module.exports = { migrate, STEPS };
