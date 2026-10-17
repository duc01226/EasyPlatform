'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { trackingContext, LIMITS, relativePath, validateTaskTracking } = require('../../../hooks/lib/task-tracking-config.cjs');
const vocabulary = require('../../../hooks/lib/task-tracking-vocabulary.cjs');
const { parseRecord, projectRecord, earlierVocabularyRecord } = require('../../../hooks/lib/task-artifact-store.cjs');
const { currentProject } = require('../../../hooks/lib/task-tracking-earlier-project.cjs');
const { fail } = require('../../../hooks/lib/task-tracking-files.cjs');
const { isPrivacySensitive } = require('../../../hooks/lib/sensitive-path-policy.cjs');
const { validateConfig } = require('../../../hooks/lib/project-config-schema.cjs');
const { getDocsRoot } = require('../../../hooks/lib/project-config-loader.cjs');

// One object-read process carries several whole files; a single file still never exceeds LIMITS.recordBytes.
const BATCH_BYTES = 8 * LIMITS.recordBytes;
// Paths named in one listing stay far below the shortest platform command line (Windows: 32,767 characters).
const LOOKUP_CHARACTERS = 16000;
// Link roles whose file bytes take part in proof identity. Only a read-ahead hint: any other path is still read alone on demand.
const EVIDENCE_RELATIONS = ['spec', 'source'];
const refusal = (code, message) => ({ error: Object.assign(new Error(message), { code }) });

/** Reads one existing local commit. Never fetches, runs a renderer, or substitutes a worktree. */
function loadSharedSnapshot(root, ref) {
    if (typeof ref !== 'string' || !ref.length || ref.length > 240 || ref.startsWith('-') || /[\s\x00-\x1f]/.test(ref)) fail('INVALID_INPUT', 'Select an exact local Git ref');
    const selected = trackingContext(root);
    const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^GIT_/i.test(key)));
    env.GIT_CONFIG_NOSYSTEM = '1'; env.GIT_CONFIG_GLOBAL = process.platform === 'win32' ? 'NUL' : '/dev/null';
    env.GIT_TERMINAL_PROMPT = '0'; env.GIT_NO_REPLACE_OBJECTS = '1'; env.GIT_NO_LAZY_FETCH = '1';
    const deadline = Date.now() + LIMITS.processTimeoutMs;
    let expired = false;
    const overrun = () => { expired = true; fail('UNAVAILABLE_BASELINE', 'Local snapshot exceeded the selected process budget'); };
    const git = (args, maximum = LIMITS.recordBytes, input) => {
        const remaining = deadline - Date.now();
        if (remaining <= 0) overrun();
        const result = spawnSync('git', ['--no-pager', '--no-optional-locks', '--literal-pathspecs', '-C', selected.root,
            '-c', 'core.fsmonitor=false', ...args], // Only the objects on stdout are read, and the byte budget is theirs: a warning Git prints beside them must not use it up.
            { env, shell: false, windowsHide: true, timeout: remaining, maxBuffer: maximum, stdio: ['pipe', 'pipe', 'ignore'], ...(input === undefined ? {} : { input }) });
        if (result.error?.code === 'ENOBUFS') fail('LIMIT_EXCEEDED', 'Local snapshot output exceeds the selected byte budget');
        if (result.error?.code === 'ETIMEDOUT') overrun();
        if (result.error || result.status !== 0) fail('UNAVAILABLE_BASELINE', 'Requested local Git objects are unavailable; no fetch or worktree fallback');
        return result.stdout;
    };
    const top = fs.realpathSync(git(['rev-parse', '--show-toplevel']).toString('utf8').trim());
    if (top !== selected.root) fail('UNAVAILABLE_BASELINE', 'Selected checkout is not the exact repository root');
    const oid = git(['rev-parse', '--verify', '--end-of-options', `${ref}^{commit}`]).toString('ascii').trim();
    if (!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(oid)) fail('UNAVAILABLE_BASELINE', 'Local ref has no verifiable commit identity');
    const listed = buffer => buffer.toString('utf8').split('\0').filter(Boolean).map(line => /^(\d+) (\w+) ([a-f0-9]+)\t(.+)$/.exec(line));
    const entry = match => ({ mode: match[1], type: match[2], oid: match[3], path: match[4] });
    const entries = buffer => listed(buffer).map(match => {
        if (!match || !relativePath(match[4])) fail('UNAVAILABLE_BASELINE', 'Tree contains an unsupported path');
        return entry(match);
    });
    // Exact entries for many paths in few processes. Git may also list the children of a named directory; only exact names are kept.
    const lookup = paths => {
        const found = new Map();
        const ask = chunk => {
            try {
                const wanted = new Set(chunk);
                for (const match of listed(git(['ls-tree', '-z', oid, '--', ...chunk]))) if (match && wanted.has(match[4])) found.set(match[4], entry(match));
            } catch (error) {
                // A shared listing can fail for one crowded directory; each path then gets its own exact answer.
                if (expired) throw error;
                if (chunk.length === 1) found.set(chunk[0], { error });
                else for (const single of chunk) ask([single]);
            }
        };
        let chunk = [];
        let characters = 0;
        for (const relative of paths) {
            if (chunk.length && characters + relative.length > LOOKUP_CHARACTERS) { ask(chunk); chunk = []; characters = 0; }
            chunk.push(relative); characters += relative.length + 3;
        }
        if (chunk.length) ask(chunk);
        return found;
    };
    // Reads listed blobs in as few processes as the byte budget allows: one asks the object store for every size, then
    // whole files travel in bounded batches. Each object keeps its own outcome, so one refused, oversize or missing file
    // never hides the others. A key without an outcome was not reached before the time budget ended.
    const fetch = wanted => {
        const loaded = new Map();
        const unavailable = () => refusal('UNAVAILABLE_BASELINE', 'Requested local Git objects are unavailable; no fetch or worktree fallback');
        const objects = (operation, group, maximum) => {
            try { return git(['cat-file', operation], maximum, group.map(([, item]) => `${item.oid}\n`).join('')); }
            catch (error) {
                if (!expired) for (const [key] of group) loaded.set(key, { error });
                return null;
            }
        };
        const regular = [];
        for (const [key, item] of wanted) {
            if (item?.error) loaded.set(key, item);
            else if (!item || item.type !== 'blob' || !['100644', '100755'].includes(item.mode)) loaded.set(key, refusal('UNAVAILABLE_BASELINE', 'Selected snapshot path is missing, linked, or not a regular blob'));
            else regular.push([key, item]);
        }
        let chunk = [];
        let bytes = 0;
        const flush = () => {
            const current = chunk; const maximum = bytes; chunk = []; bytes = 0;
            const output = current.length ? objects('--batch', current, maximum) : null;
            let offset = 0;
            for (const [key, item, size] of output ? current : []) {
                const end = output.indexOf(10, offset);
                const header = end < 0 ? '' : output.toString('latin1', offset, end);
                const stop = end + 1 + size;
                if (header === `${item.oid} blob ${size}` && output[stop] === 10) {
                    // A copy keeps one retained file from holding the whole batch in memory.
                    loaded.set(key, { bytes: Buffer.from(output.subarray(end + 1, stop)) }); offset = stop + 1; continue;
                }
                // A missing object costs one line. Any other answer leaves the position unknown, so nothing after it is trusted.
                offset = header === `${item.oid} missing` ? end + 1 : output.length;
                loaded.set(key, unavailable());
            }
        };
        for (let first = 0; first < regular.length && !expired; first += LIMITS.records) {
            const group = regular.slice(first, first + LIMITS.records);
            const sizes = objects('--batch-check', group, group.length * (group[0][1].oid.length + 32));
            const lines = sizes ? sizes.toString('latin1').split('\n') : [];
            for (const [position, [key, item]] of (sizes ? group : []).entries()) {
                // The store itself states type and size; anything but a blob of a plain decimal size is unavailable.
                const answer = new RegExp(`^${item.oid} blob (\\d+)$`).exec(lines[position] || '');
                const size = answer ? Number(answer[1]) : NaN;
                if (!Number.isSafeInteger(size)) { loaded.set(key, unavailable()); continue; }
                if (size > LIMITS.recordBytes) { loaded.set(key, refusal('LIMIT_EXCEEDED', 'Local snapshot output exceeds the selected byte budget')); continue; }
                const cost = size + item.oid.length + 32;
                if (chunk.length && bytes + cost > BATCH_BYTES) flush();
                if (expired) return loaded;
                chunk.push([key, item, size]); bytes += cost;
            }
        }
        if (!expired) flush();
        return loaded;
    };
    const blobs = new Map();
    const load = (paths, known) => {
        const listing = known || lookup(paths);
        for (const [key, outcome] of fetch(paths.map(relative => [relative, listing.get(relative)]))) blobs.set(key, outcome);
    };
    // Sets of paths the pinned config or records declare. The first request for one member loads its whole set.
    const declared = [];
    const read = relative => {
        if (!relativePath(relative) || isPrivacySensitive(relative)) fail('UNSAFE_PATH', 'Snapshot evidence needs a permitted project path');
        if (!blobs.has(relative)) {
            const group = declared.find(paths => paths.has(relative));
            const pending = group ? [...group].filter(candidate => !blobs.has(candidate)) : [relative];
            if (group) group.clear();
            load(pending);
        }
        const outcome = blobs.get(relative);
        if (!outcome) overrun();
        if (outcome.error) throw outcome.error;
        return outcome.bytes;
    };
    const configOwner = path.relative(selected.root, selected.configPath).replace(/\\/g, '/');
    if (!relativePath(configOwner)) fail('UNSAFE_PATH', 'Project config owner escapes selected checkout');
    const configEntries = lookup([configOwner]);
    let config = {};
    if (configEntries.size) {
        load([configOwner], configEntries);
        try { config = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(read(configOwner))); }
        catch (error) { if (error.code) throw error; fail('INVALID_CONFIG', 'Pinned project config is malformed'); }
        const validated = validateConfig(config);
        if (!validated.valid || validateTaskTracking(config).length) fail('INVALID_CONFIG', 'Pinned project config is invalid');
    }
    const declaredTracking = config.taskTracking || {};
    const context = { ...selected, config, enrolled: config.taskTracking !== undefined, mode: declaredTracking.mode || 'off',
        profile: declaredTracking.profile || { kind: 'portable-markdown', version: 1 }, members: declaredTracking.members || [],
        report: { enabled: true, autoRefresh: true, ...declaredTracking.report }, artifactsRoot: getDocsRoot('teamArtifacts', config),
        readSource: read, source: { kind: 'shared', label: 'Pinned local Git baseline', ref, oid, remoteFreshness: 'unknown', configOwner } };
    const diagnostics = [];
    const records = [];
    const tree = entries(git(['ls-tree', '-r', '-z', oid, '--', context.artifactsRoot]));
    if (tree.length > LIMITS.records * 4) fail('LIMIT_EXCEEDED', 'Shared owner inventory exceeds selected entry budget');
    // The pinned commit's own declaration and record locations decide its vocabulary; the working copy's never does.
    const below = listing => listing.path.slice(context.artifactsRoot.length + 1).split('/');
    context.vocabulary = vocabulary.resolveVocabulary({ declaredVersion: config.taskTracking?.schemaVersion,
        folderNames: [...new Set(tree.map(below).filter(parts => parts.length > 1).map(parts => parts[0]))],
        journalPresent: tree.some(listing => listing.path === vocabulary.journalPath(context.artifactsRoot)) });
    // Mixed vocabularies or an unfinished migration: no record is read; the reader reports the named outcome.
    if (context.vocabulary.storedVersion === null) return { context, scan: { records: [], diagnostics: [{ code: context.vocabulary.code, reason: context.vocabulary.reason }], coverage: 'unavailable' } };
    const stored = vocabulary.wordsFor(context.vocabulary.storedVersion);
    // A commit in the current structure is read as its working copy would be: a state its version does not have is refused.
    const readRecord = vocabulary.inCurrentStructure(stored.version) ? projectRecord : parseRecord;
    // A commit may hold files written in a vocabulary it does not store; they are named and never counted.
    const strays = vocabulary.strayLocations(stored.version).map(name => [null, `${context.artifactsRoot}/${name}/`]);
    const folders = [...Object.entries(stored.folders).map(([kind, folder]) => [kind, `${context.artifactsRoot}/${folder}/`]), ...strays].sort((a, b) => b[1].length - a[1].length);
    const owners = [];
    let overflow = false;
    for (const listing of tree) {
        const match = folders.find(([, folder]) => listing.path.startsWith(folder));
        if (!match || !listing.path.endsWith('.md')) continue;
        if (owners.length >= LIMITS.records) { overflow = true; break; }
        owners.push({ path: listing.path, kind: match[0], listing: isPrivacySensitive(listing.path) ? refusal('UNSAFE_PATH', 'Snapshot evidence needs a permitted project path') : listing });
    }
    const loaded = fetch(owners.map(owner => [owner.path, owner.listing]));
    for (const [position, owner] of owners.entries()) {
        const outcome = loaded.get(owner.path);
        if (!outcome) {
            // One finding names the real cause; the unread remainder is not reported as unsafe records.
            diagnostics.push({ code: 'TIME_BUDGET_EXCEEDED', reason: `Pinned read stopped at the selected time budget; ${owners.length - position} of ${owners.length} records were not read` });
            break;
        }
        try {
            if (outcome.error) throw outcome.error;
            if (owner.kind === null) earlierVocabularyRecord(outcome.bytes, owner.path);
            records.push(readRecord(outcome.bytes, owner.path, owner.kind, stored.version));
        } catch (error) {
            // Each record is bounded on its own, so an oversize or unsafe one is named and the rest are still read.
            diagnostics.push({ path: owner.path, ...(error.itemId ? { itemId: error.itemId } : {}), code: error.code || 'UNSUPPORTED', reason: error.code === 'LIMIT_EXCEEDED' ? 'Pinned record exceeds the selected per-record budget'
                : ['EARLIER_VOCABULARY_RECORD', 'LATER_VOCABULARY_RECORD'].includes(error.code) ? error.message : 'Pinned record cannot be safely projected' });
        }
    }
    if (overflow) diagnostics.push({ code: 'LIMIT_EXCEEDED', reason: 'Record count exceeds selected budget' });
    // A commit in the earlier vocabulary is shown in the current terms by the one whole-project mapping its migration
    // writes, applied to the commit's own records: the same mapping the working-copy reader applies.
    const shown = vocabulary.inCurrentStructure(stored.version) ? { records, diagnostics: [] } : currentProject(records, context.artifactsRoot);
    diagnostics.push(...shown.diagnostics);
    const permitted = value => relativePath(value) && !isPrivacySensitive(value);
    declared.push(new Set(shown.records.flatMap(record => (Array.isArray(record.tracking?.links) ? record.tracking.links : [])
        .filter(link => link && EVIDENCE_RELATIONS.includes(link.relation) && permitted(link.path)).map(link => link.path))));
    declared.push(new Set((Array.isArray(context.profile.sources) ? context.profile.sources : []).filter(permitted)));
    return { context, scan: { records: shown.records, diagnostics, coverage: diagnostics.length ? 'partial' : 'complete' } };
}

module.exports = { loadSharedSnapshot };
