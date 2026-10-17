/**
 * Vocabulary migration contract (BR-TPT-30, BR-TPT-02, INV-TPT-08).
 *
 * Migration is one explicit action. It starts only on a project it can migrate completely, previews without changing
 * anything, writes exactly what an earlier project already reads as in the current terms, moves a relationship from the
 * group that listed a record to the record itself, conserves every authored byte, identity and progress value and what
 * every group held, never shows or accepts work from a half-migrated project, completes on a repeated run from wherever
 * it stopped, and changes nothing once it has finished.
 *
 * Expected kinds, levels, types, states, links and locations are spelled out here as test data, independently of the
 * vocabulary owner, of the mapping and of the migration: these cases fail when any of them states a record differently.
 *
 * Portability: every case builds its own temp project. Interruptions are injected at the migration's own checkpoints
 * and a failing file operation by replacing the call, never by stopping a process. A location is linked with a
 * junction on Windows and a symbolic link elsewhere. Names are compared the way each disk compares them: a case that
 * depends on whether the disk ignores letter case asks the disk, asserts what holds there, and stands in the other kind
 * of disk by answering the migration's own question the other way. Git not answering is stood in for at the call that
 * starts it. Version control is the fixture's own disposable repository, never this one.
 *
 * A fixture project sits outside version control unless a case commits it. There a run starts only once a person has
 * confirmed a backup, so every case runs the migration through the fixture, which confirms one; the cases about that
 * confirmation say so and pass none.
 */

'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const childProcess = require('node:child_process');
const { trackingTest: test, withFixture, refused, earlierProject, git } = require('../lib/task-tracking-fixture.cjs');
const technical = (id, intent, fn) => ({ name: `TECH-${id}: ${intent}`, TechnicalSpec: id, fn: () => withFixture(fn) });
const { migrate, STEPS } = require('../../lib/task-tracking-migration.cjs');
const store = require('../../lib/task-artifact-store.cjs');
const { hash, publishBytes, replaceRootFile } = require('../../lib/task-tracking-files.cjs');
const { withTrackingLock, LOCK_PATH } = require('../../lib/task-tracking-lock.cjs');

const JOURNAL = 'work/.vocabulary-migration.json';
const numbers = snapshot => ({ total: snapshot.metrics.total, accepted: snapshot.metrics.accepted, remaining: snapshot.metrics.remaining, eligibleIds: snapshot.metrics.eligibleIds });
const recorded = project => ({ total: project.expected.total, accepted: project.expected.accepted, remaining: project.expected.remaining, eligibleIds: project.expected.eligibleIds });
const codes = snapshot => snapshot.diagnostics.map(finding => finding.code);
const exists = (f, relative) => fs.existsSync(path.join(f.root, relative));
const text = (f, relative) => fs.readFileSync(path.join(f.root, relative), 'utf8');
const journal = f => JSON.parse(text(f, JOURNAL));
const shown = (snapshot, id) => snapshot.items.find(item => item.id === id);
/** The links a record names by identity, as `relation:identity`, in stored order. */
const linked = (snapshot, id) => shown(snapshot, id).links.filter(link => link.itemId).map(link => `${link.relation}:${link.itemId}`);
const figure = (snapshot, id) => [...snapshot.figures.areas, ...snapshot.figures.initiatives].find(row => row.id === id);
const scopeOf = (f, id) => f.progress({ scopeId: id }).metrics.eligibleIds;

// Groups beside the fixture's own finite-outcome group EPIC-E, which lists both tasks. Together they hold every kind of
// listing: a top-level area group, an area group nested in it, a capability group nested in another and listed by two
// groups, a planned finite outcome that lists a capability group and a task, a started finite outcome, and a proposal
// placed in a capability group.
const STRUCTURE = [
    { id: 'PRODUCT', kind: 'vision', purpose: 'area', members: ['MODULE', 'FEATURE'] },
    { id: 'MODULE', kind: 'vision', purpose: 'area', members: ['FEATURE-NESTED'] },
    { id: 'FEATURE', purpose: 'capability', members: ['PBI-1', 'TASK-K', 'FEATURE-NESTED', 'IDEA-D'] },
    { id: 'FEATURE-NESTED', purpose: 'capability', members: ['PBI-2'] },
    { id: 'PLANNED', purpose: 'program', status: 'planned', members: ['FEATURE-NESTED', 'PBI-1'] },
    { id: 'STARTED', purpose: 'program', status: 'in_progress', members: ['STORY-S'] }
];
// The same project in the current terms, as independent test data: what each record is, and the eligible tasks each former group held.
const STRUCTURE_SHOWN = {
    'PRODUCT': ['area', 'active', 'product', null, []], 'MODULE': ['area', 'active', 'module', null, ['area:PRODUCT']],
    'FEATURE': ['area', 'active', 'feature', null, ['area:PRODUCT']], 'FEATURE-NESTED': ['area', 'active', 'feature', null, ['area:FEATURE', 'area:MODULE']],
    'PLANNED': ['initiative', 'approved', null, 'initiative', []], 'STARTED': ['initiative', 'committed', null, 'initiative', []], 'EPIC-E': ['initiative', 'draft', null, 'initiative', []],
    'IDEA-D': ['initiative', 'draft', null, 'idea', ['area:FEATURE']],
    'PBI-1': ['task', 'done', null, null, ['initiative:IDEA-D', 'area:FEATURE', 'initiative:EPIC-E', 'initiative:PLANNED']],
    'PBI-2': ['task', 'planned', null, null, ['area:FEATURE-NESTED', 'initiative:EPIC-E', 'initiative:PLANNED']],
    'TASK-K': ['subtask', 'draft', null, null, ['parent:PBI-2', 'area:FEATURE']], 'STORY-S': ['story', 'draft', null, null, ['parent:PBI-1', 'initiative:STARTED']]
};
const STRUCTURE_HELD = { 'PRODUCT': ['PBI-1', 'PBI-2'], 'MODULE': ['PBI-2'], 'FEATURE': ['PBI-1', 'PBI-2'], 'FEATURE-NESTED': ['PBI-2'], 'PLANNED': ['PBI-1', 'PBI-2'], 'STARTED': [], 'EPIC-E': ['PBI-1', 'PBI-2'] };
const GROUP_PATHS = { 'EPIC-E': ['work/projects/EPIC-E.md', 'work/initiatives/EPIC-E.md'], 'FEATURE': ['work/projects/FEATURE.md', 'work/areas/FEATURE.md'],
    'FEATURE-NESTED': ['work/projects/FEATURE-NESTED.md', 'work/areas/FEATURE-NESTED.md'], 'MODULE': ['work/visions/MODULE.md', 'work/areas/MODULE.md'],
    'PLANNED': ['work/projects/PLANNED.md', 'work/initiatives/PLANNED.md'], 'PRODUCT': ['work/visions/PRODUCT.md', 'work/areas/PRODUCT.md'], 'STARTED': ['work/projects/STARTED.md', 'work/initiatives/STARTED.md'] };
const stated = snapshot => Object.fromEntries(snapshot.items.map(item => [item.id, [item.kind, item.state, item.level, item.type, linked(snapshot, item.id)]]));

/** Keeps the record root and the configuration as they are now; the returned function puts them back. */
function keep(f) {
    const kept = path.join(f.root, 'kept');
    for (const top of ['work', 'docs']) fs.cpSync(path.join(f.root, top), path.join(kept, top), { recursive: true });
    return () => {
        for (const top of ['work', 'docs']) { fs.rmSync(path.join(f.root, top), { recursive: true, force: true }); fs.cpSync(path.join(kept, top), path.join(f.root, top), { recursive: true }); }
        fs.rmSync(path.join(f.root, 'tmp/task-tracking/deletions'), { recursive: true, force: true });
    };
}

/** An earlier project, the state an uninterrupted migration leaves it in, and a way back to the start. `arrange` adds to the project first. */
async function migratable(f, options, arrange = () => {}) {
    const project = await earlierProject(f, options);
    arrange();
    const restore = keep(f);
    const earlier = f.storedState();
    const checkpoints = [];
    const result = await f.migrate({ checkpoint: name => checkpoints.push(name) });
    assert.equal(result.status, 'migrated', JSON.stringify(result));
    const migrated = f.storedState();
    restore();
    assert.deepEqual(f.storedState(), earlier);
    return { project, restore, earlier, migrated, checkpoints };
}

/**
 * Reads an earlier project in the current terms, migrates it and reads it again. Both reads must state the same thing of
 * every record and the same figures: what is read before a migration is what is stored after it.
 */
async function bothWays(f) {
    const before = f.progress({ figures: true });
    assert.equal(before.coverage, 'complete', JSON.stringify(before.diagnostics)); assert.equal(before.vocabulary.project.code, 'MIGRATION_REQUIRED');
    const result = await f.migrate();
    assert.equal(result.status, 'migrated', JSON.stringify(result));
    const after = f.progress({ figures: true });
    assert.equal(after.coverage, 'complete', JSON.stringify(after.diagnostics)); assert.equal(after.vocabulary.project.state, 'current');
    assert.deepEqual(stated(after), stated(before)); assert.deepEqual(after.figures, before.figures); assert.deepEqual(after.metrics, before.metrics);
    return { before, after, result };
}

const stopAt = index => { let reached = 0; return () => { if (reached++ === index) throw new Error('simulated interruption'); }; };
/** Stops the migration the given time it reaches a point. */
const stopAfter = (f, point, time = 1) => { let reached = 0; return f.migrate({ checkpoint: name => { if (name === point && ++reached === time) throw new Error('simulated interruption'); } }); };

/** Nothing is read or saved from a project whose migration is unfinished, and a preview does not describe a second one. */
async function assertUnavailable(f) {
    const stored = f.storedState();
    const snapshot = f.progress();
    assert.equal(snapshot.coverage, 'unavailable'); assert.equal(snapshot.metrics, null); assert.deepEqual(snapshot.items, []);
    assert.deepEqual(codes(snapshot), ['MIGRATION_IN_PROGRESS']);
    for (const preview of [false, true]) refused(await f.perform('create', 'TASK-during', { title: 'Work during migration', intent: 'Must not be saved' }, preview ? { preview: true } : {}), 'MIGRATION_IN_PROGRESS');
    const dry = await f.migrate({ dryRun: true });
    assert.deepEqual([dry.status, dry.code], ['refused', 'MIGRATION_IN_PROGRESS']);
    assert.deepEqual(f.storedState(), stored);
}

/** The progress record never claims more or less than the disk shows, and never settles a step before an earlier one. */
function assertJournalTruth(f) {
    const value = journal(f);
    assert.deepEqual(value.steps.map(step => step.id), STEPS);
    const settled = value.steps.map(step => ['done', 'skipped'].includes(step.status));
    assert.ok(settled.every((done, index) => !done || settled.slice(0, index).every(Boolean)), JSON.stringify(value.steps));
    const status = id => value.steps.find(step => step.id === id).status;
    for (const group of value.index.groups) {
        const [source, written] = [exists(f, group.from), exists(f, group.to)];
        assert.ok(source || written, `${group.id} is kept in neither place`);
        if (status('groups') === 'pending') assert.ok(source && !written, `${group.id} moved before its step began`);
        if (status('groups') === 'done') assert.ok(!source && written, `${group.id} is recorded as moved`);
    }
    if (status('groups') === 'pending') assert.ok(!exists(f, 'work/areas'), 'No group record is written before every other record is rewritten');
    if (status('locations') === 'done') assert.deepEqual(['work/projects', 'work/visions'].map(location => exists(f, location)), [false, false]);
    if (status('config') === 'done') assert.equal(JSON.parse(text(f, 'docs/project-config.json')).taskTracking.schemaVersion, 3);
}

function link(target, location, kind) {
    // Windows junctions need no privilege; a host that still denies them leaves this evidence unavailable there.
    try { fs.symlinkSync(target, location, process.platform === 'win32' ? 'junction' : kind); }
    catch (error) {
        if (process.platform === 'win32' && ['EPERM', 'EACCES'].includes(error.code)) throw new Error(`ENVIRONMENT-BLOCKED: Windows junction fixture unavailable (${error.code})`);
        throw error;
    }
}

// A group as a person or another tool left it: block-style tracking metadata, an authored comment and note, a tracking
// value the tracker does not own, a link path written with backslashes, and authored text that spells the earlier words.
const HAND_GROUP = ['---', 'id: HAND-G', 'title: "Billing memberItemIds notes" # authored comment stays', 'intent: Keep the groupRole of a project visible',
    'status: in_progress', 'owner_note: a vision of the program', 'tracking:', '  schemaVersion: 2', '  revision: 3', '  kind: project', '  custom_extension: { keep: "project vision" }',
    '  memberItemIds:', '    - PBI-2', '  groupRole: capability',
    '  history:', '    - { operationId: hand-1, operation: create, actor: owner, at: "2026-01-01T00:00:00.000Z", beforeState: draft, afterState: planned, reason: "planned by hand" }',
    '  links:', "    - { relation: plan, path: 'work\\projects\\EPIC-E.md' }", "    - { relation: plan, path: 'notes\\projects\\plan.md' }",
    '---', '# Body about a project', 'memberItemIds and groupRole are mentioned here and stay exactly as written.', ''].join('\n');
const HAND_GROUP_AFTER = ['---', 'id: HAND-G', 'title: "Billing memberItemIds notes" # authored comment stays', 'intent: Keep the groupRole of a project visible',
    'status: "active"', 'owner_note: a vision of the program', 'tracking:', '  schemaVersion: 3', '  revision: 3', '  kind: "area"', '  custom_extension: { keep: "project vision" }',
    '  history:', '    - { operationId: hand-1, operation: create, actor: owner, at: "2026-01-01T00:00:00.000Z", beforeState: draft, afterState: planned, reason: "planned by hand" }',
    '  links:', '    [{"relation":"plan","path":"work/initiatives/EPIC-E.md"},{"relation":"plan","path":"notes\\\\projects\\\\plan.md"}]', '  level: "feature"',
    '---', '# Body about a project', 'memberItemIds and groupRole are mentioned here and stay exactly as written.', ''].join('\n');
const HAND_UNTRACKED = '---\nid: LEGACY\ntitle: "Hand-written proposal" # authored comment\nintent: Keep an authored outcome\nstatus: planned\nowner_note: keep\n---\n# Authored body\nThe proposal is kept exactly.\n';
// As an editor on Windows leaves a record: a byte-order mark, CRLF line endings and block-style tracking metadata.
const HAND_CRLF = ['﻿---', 'id: CR-1', 'title: Windows authored   # keep', 'intent: "Keep CRLF"', 'status: planned', 'tracking:', '  schemaVersion: 2', '  revision: 2', '  kind: vision',
    '  groupRole: area', '  memberItemIds:', '    - PBI-1',
    '  history:', '    - operationId: op-a', '      operation: create', '      actor: owner', '      at: "2026-01-01T00:00:00.000Z"', '      beforeState: draft', '      afterState: planned',
    '  links:', '    - relation: dependency', '      itemId: PBI-2', '  receipts: []', '---', 'Body line 1', 'Body line 2', ''].join('\r\n');
const HAND_CRLF_AFTER = ['﻿---', 'id: CR-1', 'title: Windows authored   # keep', 'intent: "Keep CRLF"', 'status: "active"', 'tracking:', '  schemaVersion: 3', '  revision: 2', '  kind: "area"',
    '  history:', '    - operationId: op-a', '      operation: create', '      actor: owner', '      at: "2026-01-01T00:00:00.000Z"', '      beforeState: draft', '      afterState: planned',
    '  links:', '    - relation: dependency', '      itemId: PBI-2', '  receipts: []', '  level: "product"', '---', 'Body line 1', 'Body line 2', ''].join('\r\n');
const HAND_UNCHANGED = '﻿---\r\nid: NOTE\r\ntitle: A note about a project\r\nintent: Keep line endings and the mark\r\nstatus: draft\r\n---\r\nBody with its own line endings.\r\n';
// Hand-formatted on purpose: only the declared values may change, not the layout around them.
const handConfig = config => `{\n\t"project" : ${JSON.stringify(config.project)},\n  "docsRoots":   ${JSON.stringify(config.docsRoots)},\n\n    "taskTracking": {\n`
    + `      "mode": "linked", "schemaVersion" :  2 ,\n      "groupLabels": { "area": "Area \\"A\\"" ,\n         "program":"Bet" },\n`
    + `      "members": ${JSON.stringify(config.taskTracking.members)},\n      "report": ${JSON.stringify(config.taskTracking.report)}\n    }\n}\n\n`;
const handConfigAfter = formatted => formatted.replace('"schemaVersion" :  2 ,', '"schemaVersion" :  3 ,')
    .replace('"groupLabels": { "area": "Area \\"A\\"" ,\n         "program":"Bet" }', '"levelLabels": {"product": "Area \\"A\\""}, "typeLabels": {"initiative": "Bet"}');
const CONFIG_CHANGES = [{ field: 'taskTracking.schemaVersion', from: 2, to: 3 }, { field: 'taskTracking.groupLabels.program', movedTo: 'taskTracking.typeLabels.initiative' }];

const STANDING_UNCHANGED = { verificationStale: [], leavingReady: [], newlyBlocked: [] };
const ABANDON = {
    restore: 'restore work and docs/project-config.json from version control or your backup',
    created: 'remove the folder this migration created: work/areas',
    request: 'run migrate --root <checkout> --abandon: it checks that the project is back whole and removes the progress record work/.vocabulary-migration.json itself, and it never removes or moves a record or a folder. Do not remove that file by hand'
};
const wrote = (...paths) => `remove the ${paths.length === 1 ? 'record' : 'records'} this migration wrote into a location the earlier vocabulary also uses: ${paths.join(', ')}`;
const STILL_PRESENT = location => `${location} is still present (remove it if this migration created it, or move it out of work if it is yours)`;

/** What a file held open on Windows, or one a person may not remove, does to the first group record that is moved. */
async function firstRemovalFails(f) {
    const unlinkSync = fs.unlinkSync;
    fs.unlinkSync = target => {
        if (String(target).endsWith(path.join('work', 'projects', 'EPIC-E.md'))) throw Object.assign(new Error(`EPERM: operation not permitted, unlink '${target}'`), { code: 'EPERM', syscall: 'unlink' });
        return unlinkSync(target);
    };
    try { return await f.migrate(); } finally { fs.unlinkSync = unlinkSync; }
}
// Every kind of place a migration can stop in, by what the progress record and the disk then say.
const STOPPED = [['before any record changed', f => stopAfter(f, 'journal-written')],
    ['part-way through rewriting the records that are not groups', f => stopAfter(f, 'member-rewritten')],
    ['after a group record was written and before its earlier record was removed', f => stopAfter(f, 'group-written')],
    ['when a group record could not be removed from its earlier location', firstRemovalFails],
    ['part-way through moving the group records', f => stopAfter(f, 'group-moved', 2)],
    ['after the declaration was rewritten', f => stopAfter(f, 'config-written')]];
/**
 * What a person does with version control to put the earlier project back. In part: the checkout alone, which leaves
 * what the migration wrote. Whole: also the folder the migration created and the records it wrote beside earlier ones.
 */
function restoreFromGit(f, whole) {
    git(f, ['checkout', '--', 'work', 'docs']);
    if (!whole) return;
    fs.rmSync(path.join(f.root, 'work/areas'), { recursive: true, force: true });
    git(f, ['clean', '-f', '-d', '--quiet', '--', 'work/initiatives']);
}

/**
 * Proofs and readiness as an earlier release would have recorded them for the earlier project: each names the linked
 * record as it then was stored. The builder wrote them while the project stored the current vocabulary.
 */
function recordedInEarlierProject(f, ids) {
    for (const id of ids) {
        const record = f.record(id); const now = f.proof(id);
        const pairs = [...(record.tracking.proofs || []).flatMap(proof => [[proof.criteriaIdentity, now.criteriaIdentity], [proof.sourceIdentity, now.sourceIdentity]]),
            ...(record.tracking.readiness ? [[record.tracking.readiness.criteriaIdentity, now.criteriaIdentity]] : [])];
        let stored = text(f, record.ownerPath);
        for (const [written, current] of pairs) stored = stored.split(written).join(current);
        f.write(record.ownerPath, stored);
    }
}

/** Git answers the migration's question as given here; every other process starts as usual. */
async function withGitAnswer(answer, run) {
    const spawnSync = childProcess.spawnSync;
    childProcess.spawnSync = (command, args, options) => (command === 'git' && args.includes('status') ? answer : spawnSync(command, args, options));
    try { return await run(); } finally { childProcess.spawnSync = spawnSync; }
}

/** The disk answers "is this the same folder under another spelling?" as given, for the migration's own question only. */
async function withDiskIgnoringCase(ignores, run) {
    const statSync = fs.statSync;
    fs.statSync = (target, options) => {
        const name = path.basename(String(target));
        if (!options?.bigint || name !== name.toUpperCase() || name === name.toLowerCase()) return statSync(target, options);
        if (!ignores) throw Object.assign(new Error(`ENOENT: no such file or directory, stat '${target}'`), { code: 'ENOENT', syscall: 'stat' });
        return statSync(path.join(path.dirname(String(target)), name.toLowerCase()), options);
    };
    try { return await run(); } finally { fs.statSync = statSync; }
}

/** A refusal before any change: the same answer from the preview and from the run, nothing changed, no progress record. */
async function refusedBeforeChange(f, code, reason) {
    const before = f.storedState();
    for (const dryRun of [true, false]) {
        const result = await f.migrate({ dryRun });
        // The answer of a large project is shown only as far as it tells what it is.
        assert.equal(result.status, 'refused', JSON.stringify(result).slice(0, 2000));
        assert.ok(result.refusals.some(refusal => refusal.code === code), JSON.stringify(result.refusals.map(refusal => refusal.code)));
        assert.match(result.refusals.find(refusal => refusal.code === code).reason, reason);
        assert.ok(!JSON.stringify(result).includes(f.root), 'A refusal names project-relative paths only');
        assert.deepEqual(f.storedState(), before); assert.ok(!exists(f, JOURNAL));
    }
}

module.exports = { name: 'Task tracking vocabulary migration integration', tests: [
    test('TC-TPT-246', 'migration and its preview refuse each unmet precondition by name, change nothing and leave no progress record', async f => {
        const project = await earlierProject(f);
        const restore = keep(f);
        const stored = f.storedState();
        const recovery = phase => f.write(`tmp/task-tracking/deletions/${hash(`deletion-${phase}`)}.json`, JSON.stringify({ schemaVersion: 1, phase, itemId: project.ids.remaining }));
        const variants = [
            ['an unreadable record', () => f.write('work/tasks/BROKEN.md', 'No frontmatter here.\n'), ['INCOMPLETE_SCOPE'], /Inspection incomplete: work\/tasks\/BROKEN\.md/],
            ['a record already stamped current', () => f.write('work/initiatives/STAMPED.md', '---\nid: STAMPED\ntitle: Stamped\nintent: Already current\nstatus: draft\ntracking: {schemaVersion: 3, revision: 1, kind: initiative, type: idea}\n---\n'), ['INCOMPLETE_SCOPE'], /work\/initiatives\/STAMPED\.md is already stamped current/],
            ['an unfinished deletion recovery', () => recovery('prepared'), ['DELETION_RECOVERY_UNFINISHED'], /Deletion recovery unfinished: tmp\/task-tracking\/deletions\//],
            ['an unreadable deletion recovery', () => f.write('tmp/task-tracking/deletions/unreadable.json', '{'), ['DELETION_RECOVERY_UNFINISHED'], /deletions\/unreadable\.json/],
            ['a destination location that holds a record', () => f.write('work/areas/STRAY.md', 'stray'), ['DESTINATION_PRESENT', 'MIXED_VOCABULARY'], /Destination already present: work\/areas/],
            ['an empty destination location', () => fs.mkdirSync(path.join(f.root, 'work/areas')), ['DESTINATION_PRESENT', 'MIXED_VOCABULARY'], /Destination already present: work\/areas/],
            // Not a record location to any reader, yet the name is taken on every disk.
            ['a file under the destination name', () => f.write('work/areas', 'not a folder'), ['DESTINATION_PRESENT'], /Destination already present: work\/areas/],
            // The same folder on a disk that ignores letter case, another folder on one that does not: refused on both.
            ['a destination name in another letter case', () => fs.mkdirSync(path.join(f.root, 'work/Areas')), null, /Destination already present: work\/areas/i],
            ['a native record profile', () => { f.config.taskTracking.profile = { kind: 'native', version: 1, registration: 'native-tracker' }; f.saveConfig(); }, ['UNPROVED_NATIVE_CAPABILITY'], /portable record profile only/],
            ['two unmet preconditions at once', () => { f.write('work/tasks/BROKEN.md', 'No frontmatter here.\n'); recovery('prepared'); }, ['INCOMPLETE_SCOPE', 'DELETION_RECOVERY_UNFINISHED'], /Inspection incomplete/]
        ];
        for (const [name, arrange, expected, reason] of variants) {
            arrange();
            const before = f.storedState();
            for (const dryRun of [true, false]) {
                const result = await f.migrate({ dryRun });
                assert.equal(result.status, 'refused', `${name}: ${JSON.stringify(result)}`);
                if (expected) assert.deepEqual(result.refusals.map(refusal => refusal.code), expected, name);
                else assert.ok(result.refusals.some(refusal => refusal.code === 'DESTINATION_PRESENT'), name);
                assert.equal(result.code, result.refusals[0].code); assert.match(result.refusals.map(refusal => refusal.reason).join('\n'), reason, name);
                assert.ok(!JSON.stringify(result).includes(f.root), `${name}: a refusal names project-relative paths only`);
                assert.deepEqual(f.storedState(), before, `${name}: nothing changed`); assert.ok(!exists(f, JOURNAL), name);
            }
            restore(); f.config.taskTracking = JSON.parse(text(f, 'docs/project-config.json')).taskTracking;
            assert.deepEqual(f.storedState(), stored);
        }
        // Boundary: a deletion whose recovery completed is no obstacle, and the project still reads as it did.
        recovery('complete');
        assert.equal((await f.migrate({ dryRun: true })).status, 'preview');
        assert.deepEqual(numbers(f.progress()), recorded(project)); assert.equal(f.progress().vocabulary.project.code, 'MIGRATION_REQUIRED');
        // Once the unmet precondition is resolved the same request proceeds.
        f.write('work/tasks/BROKEN.md', 'No frontmatter here.\n'); assert.equal((await f.migrate()).status, 'refused');
        fs.rmSync(path.join(f.root, 'work/tasks/BROKEN.md')); assert.equal((await f.migrate()).status, 'migrated');
    }),
    test('TC-TPT-246', 'a record root with uncommitted or untracked files is refused in a Git checkout, and a project outside version control is told it has no restore point', async f => {
        const project = await earlierProject(f, { commit: true });
        const clean = await f.migrate({ dryRun: true });
        assert.deepEqual([clean.status, clean.versionControl], ['preview', { kind: 'git', clean: true, restorable: true }]);
        const original = text(f, 'work/tasks/PBI-2.md');
        const dirty = [['work/tasks/PBI-2.md', () => fs.appendFileSync(path.join(f.root, 'work/tasks/PBI-2.md'), 'An uncommitted note.\n'), () => f.write('work/tasks/PBI-2.md', original)],
            ['work/unsaved notes.md', () => f.write('work/unsaved notes.md', 'never committed'), () => fs.rmSync(path.join(f.root, 'work/unsaved notes.md'))]];
        for (const [relative, arrange, undo] of dirty) {
            arrange();
            const before = f.storedState();
            for (const dryRun of [true, false]) {
                const result = await f.migrate({ dryRun });
                assert.deepEqual([result.status, result.code], ['refused', 'RECORD_ROOT_NOT_CLEAN'], JSON.stringify(result));
                assert.deepEqual(result.refusals[0].paths, [relative]); assert.ok(result.reason.includes(relative));
                assert.deepEqual(f.storedState(), before); assert.ok(!exists(f, JOURNAL));
            }
            undo();
        }
        // Boundary: an uncommitted file outside the record root is not the migration's concern.
        f.write('docs/unrelated.md', 'uncommitted, elsewhere');
        const result = await f.migrate();
        assert.equal(result.status, 'migrated', JSON.stringify(result)); assert.deepEqual(result.progress, recorded(project));
        assert.equal(git(f, ['status', '--porcelain', '--', 'work']).length > 0, true, 'The migration itself is the only change in the record root');
    }),
    test('TC-TPT-247', 'a preview lists each record that would move, the owned values that would change and the progress to conserve, twice alike, and changes nothing', async f => {
        const project = await earlierProject(f, { groups: STRUCTURE });
        const stored = f.storedState();
        const first = await f.migrate({ dryRun: true });
        const second = await f.migrate({ dryRun: true });
        assert.deepEqual(second, first);
        assert.deepEqual([first.status, first.dryRun, first.recordRoot, first.from, first.to], ['preview', true, 'work', 2, 3]);
        // File moves: every group record, one by one, and nothing else.
        assert.deepEqual(first.moves, Object.entries(GROUP_PATHS).map(([itemId, [from, to]]) => ({ itemId, from, to })));
        assert.deepEqual(first.locations, { removed: ['work/projects', 'work/visions'], created: ['work/areas'] });
        assert.equal(first.records.total, 12); assert.deepEqual(first.records.byKind, { area: 4, initiative: 4, task: 2, subtask: 1, story: 1 });
        // Per record: kind, level, type and state changes and the links it gains, by relation.
        const change = id => first.records.changes.find(entry => entry.itemId === id);
        assert.deepEqual(change('PLANNED'), { itemId: 'PLANNED', path: 'work/projects/PLANNED.md', movedTo: 'work/initiatives/PLANNED.md', tracked: true, kind: ['project', 'initiative'],
            state: ['planned', 'approved'], stamp: [2, 3], purpose: 'program', members: 2, type: 'initiative', paths: 3 });
        assert.deepEqual(change('FEATURE-NESTED'), { itemId: 'FEATURE-NESTED', path: 'work/projects/FEATURE-NESTED.md', movedTo: 'work/areas/FEATURE-NESTED.md', tracked: true, kind: ['project', 'area'],
            state: ['draft', 'active'], stamp: [2, 3], purpose: 'capability', members: 1, level: 'feature', addedLinks: { area: ['FEATURE', 'MODULE'] }, paths: 2 });
        assert.deepEqual(change('PBI-2'), { itemId: 'PBI-2', path: 'work/tasks/PBI-2.md', tracked: true, kind: ['task', 'task'], stamp: [2, 3], addedLinks: { area: ['FEATURE-NESTED'], initiative: ['EPIC-E', 'PLANNED'] } });
        assert.deepEqual(change('IDEA-D'), { itemId: 'IDEA-D', path: 'work/initiatives/IDEA-D.md', tracked: true, kind: ['initiative', 'initiative'], stamp: [2, 3], type: 'idea', addedLinks: { area: ['FEATURE'] } });
        // The subtask holds a link path to the group record that moves; that path is counted, never quoted.
        assert.equal(change('TASK-K').paths, 1);
        // Crossings and levels left unset, and the recount of what every former group held.
        assert.deepEqual(first.crossings, [{ groupId: 'PLANNED', listedId: 'FEATURE-NESTED', relation: 'initiative', taggedIds: ['PBI-2'] }]);
        assert.deepEqual([first.nested, first.levelsUnset], [[], []]);
        assert.equal(first.recount.conserved, true);
        assert.deepEqual(first.recount.groups.map(group => [group.id, group.becomes, group.eligible]), Object.entries(STRUCTURE_HELD).map(([id, held]) => [id, STRUCTURE_SHOWN[id][0], held.length]).sort((a, b) => (a[0] < b[0] ? -1 : 1)));
        assert.ok(first.recount.groups.every(group => /^[a-f0-9]{64}$/.test(group.identity)));
        assert.deepEqual(first.config, { path: 'docs/project-config.json', changes: CONFIG_CHANGES });
        assert.deepEqual(first.progress, recorded(project));
        // What the reader will state once migrated is said beforehand: here the whole project, with nothing found wrong.
        assert.deepEqual(first.reads, { before: { coverage: 'complete', findings: [] }, after: { coverage: 'complete', findings: [] } });
        // No work here is linked to a record by a spec or source link: nothing loses its verification, and nothing is said to.
        assert.deepEqual(first.currentlyVerified, { before: 1, after: 1 }); assert.deepEqual(first.standing, STANDING_UNCHANGED);
        assert.deepEqual(first.linkPaths.leftAsWritten, []);
        // Outside version control the preview is still given; it says that nothing here can restore the project and what a run will need.
        assert.deepEqual([first.versionControl.kind, first.versionControl.restorable], ['none', false]); assert.match(first.versionControl.note, /^Not a Git checkout: nothing here can restore.*A run will refuse \(NO_RESTORE_POINT\) until a backup is confirmed/);
        assert.match(first.preserved, /Authored bodies.*no record is created or deleted/); assert.match(first.oneWay, /no reverse action/);
        // A preview states which values change, never what a person wrote.
        assert.ok(!JSON.stringify(first).includes('Export selected rows')); assert.ok(!JSON.stringify(first).includes(f.root));
        assert.deepEqual(f.storedState(), stored); assert.ok(!exists(f, JOURNAL)); assert.ok(!exists(f, LOCK_PATH));
        assert.deepEqual(numbers(f.progress()), recorded(project)); assert.equal(f.progress().vocabulary.project.state, 'earlier');
        refused(await f.perform('create', 'TASK-new', { title: 'New work', intent: 'Capture a new outcome' }), 'MIGRATION_REQUIRED');
        // A record changed after the preview: the run works from what is stored then, not from the preview.
        fs.appendFileSync(path.join(f.root, 'work/tasks/PBI-2.md'), 'Written after the preview.\n');
        assert.equal((await f.migrate()).status, 'migrated'); assert.ok(text(f, 'work/tasks/PBI-2.md').endsWith('Written after the preview.\n'));
    }),
    test('TC-TPT-247', 'the preview of an earlier project with no records lists only the declaration change, and of an unconfigured project no declaration change', async f => {
        f.config.taskTracking.schemaVersion = 2; f.saveConfig();
        const empty = await f.migrate({ dryRun: true });
        assert.equal(empty.status, 'preview'); assert.deepEqual(empty.records, { total: 0, byKind: {}, changes: [] });
        assert.deepEqual([empty.moves, empty.locations], [[], { removed: [], created: [] }]);
        assert.deepEqual(empty.config.changes, [{ field: 'taskTracking.schemaVersion', from: 2, to: 3 }]);
        assert.deepEqual(empty.progress, { total: 0, accepted: 0, remaining: 0, eligibleIds: [] });
        assert.ok(!exists(f, 'work'), 'A preview creates no record root');
        const ran = await f.migrate();
        assert.deepEqual([ran.status, ran.steps.map(step => step.status), ran.config.status], ['migrated', ['done', 'done', 'skipped', 'done', 'done'], 'done']);
        assert.equal(f.context().config.taskTracking.schemaVersion, 3); assert.ok(!exists(f, JOURNAL));
        // Unconfigured: recognised as earlier by a location alone.
        delete f.config.taskTracking; f.saveConfig();
        f.write('work/projects/NOTE.md', '---\nid: NOTE\ntitle: A captured group\nintent: Keep it\nstatus: planned\n---\nBody.\n');
        const configured = text(f, 'docs/project-config.json');
        const unconfigured = await f.migrate({ dryRun: true });
        assert.deepEqual(unconfigured.config.changes, []); assert.match(unconfigured.config.note, /stays unconfigured/);
        assert.deepEqual(unconfigured.records.changes, [{ itemId: 'NOTE', path: 'work/projects/NOTE.md', movedTo: 'work/areas/NOTE.md', tracked: false, kind: ['project', 'area'], state: ['planned', 'active'] }]);
        assert.equal(text(f, 'docs/project-config.json'), configured);
    }),
    test('TC-TPT-248', 'migration rewrites only tracker-owned values, writes each group record at its new path and conserves every authored byte, identity, name and progress value', async f => {
        const project = await earlierProject(f);
        const { ids } = project;
        // Written as an earlier release and a person would have left them: authored text that itself uses earlier words.
        fs.appendFileSync(path.join(f.root, 'work/tasks/PBI-1.md'), '# Notes\nThis task sits in a project of the vision; the memberItemIds wording stays.\n');
        f.write('work/projects/HAND-G.md', HAND_GROUP); f.write('work/initiatives/LEGACY.md', HAND_UNTRACKED); f.write('work/tasks/NOTE.md', HAND_UNCHANGED);
        f.write('docs/project-config.json', handConfig(f.config));
        const before = f.progress();
        assert.deepEqual(before.metrics.eligibleIds, ['NOTE', ids.accepted, ids.remaining]); assert.equal(before.metrics.accepted, 1);
        const earlierFiles = new Map(f.storedState().filter(([relative, value]) => relative.startsWith('work/') && value !== 'directory').map(([relative]) => [relative, text(f, relative)]));
        const configBefore = text(f, 'docs/project-config.json');
        const reached = [];
        const result = await f.migrate({ checkpoint: (name, detail) => {
            reached.push(name);
            if (['member-rewritten', 'group-written', 'group-moved'].includes(name)) assert.ok(detail.count >= 1 && detail.count <= detail.of);
        } });
        assert.equal(result.status, 'migrated', JSON.stringify(result)); assert.equal(result.resumed, false); assert.equal(result.verified, true);
        // No record here is linked by a spec or source link, so the result reports the verification count the reader showed
        // before and shows after, and names no work whose standing changed.
        assert.deepEqual(result.currentlyVerified, { before: before.metrics.currentlyVerified, after: f.progress().metrics.currentlyVerified });
        assert.equal(result.currentlyVerified.after, result.currentlyVerified.before); assert.deepEqual(result.standing, STANDING_UNCHANGED); assert.deepEqual(result.linkPaths.leftAsWritten, []);
        assert.deepEqual(result.progress, numbers(before)); assert.deepEqual(result.config, { path: 'docs/project-config.json', status: 'done' });
        assert.deepEqual(result.records, { total: 9, rewritten: 6, moved: 2 }); assert.deepEqual(result.recount, { conserved: true, groups: 2 });
        // Same records under the same names; a group record under the location of the kind it became, every other where it was.
        const moved = relative => ({ 'work/projects/EPIC-E.md': 'work/initiatives/EPIC-E.md', 'work/projects/HAND-G.md': 'work/areas/HAND-G.md' })[relative] ?? relative;
        const after = f.storedState().filter(([relative, value]) => relative.startsWith('work/') && value !== 'directory').map(([relative]) => relative);
        assert.deepEqual(after.sort(), [...earlierFiles.keys()].map(moved).sort());
        assert.ok(!exists(f, JOURNAL)); for (const name of ['projects', 'visions']) assert.ok(!exists(f, `work/${name}`));
        // Whole-file expectation for the hand-written records: every byte outside a tracker-owned value is the byte that was stored.
        assert.equal(text(f, 'work/areas/HAND-G.md'), HAND_GROUP_AFTER);
        assert.equal(text(f, 'work/initiatives/LEGACY.md'), HAND_UNTRACKED.replace('status: planned', 'status: "approved"'), 'A record without tracking metadata gains none; only its recorded state changes');
        assert.equal(text(f, 'work/tasks/NOTE.md'), HAND_UNCHANGED);
        // For every record: the authored header lines and the body are the bytes that were stored.
        for (const [relative, stored] of earlierFiles) {
            const authored = value => value.split('\n').filter(line => !/^(status|tracking):/.test(line) && !/^ {2,}/.test(line)).join('\n');
            assert.equal(authored(text(f, moved(relative))), authored(stored), relative);
        }
        // Spot checks of what the comparison proves, in the words of the case.
        const stored = id => f.record(id);
        assert.deepEqual(Object.fromEntries(f.records().map(record => [record.id, record.kind])), { ...project.expected.kinds, 'HAND-G': 'area', LEGACY: 'initiative', NOTE: 'task' });
        assert.deepEqual(f.records().filter(record => record.tracking).map(record => record.tracking.schemaVersion), Array(7).fill(3));
        assert.equal(stored('LEGACY').tracking, null);
        assert.deepEqual([stored(ids.group).tracking.memberItemIds, stored(ids.group).tracking.groupRole, stored(ids.group).tracking.type], [undefined, undefined, 'initiative']);
        assert.deepEqual(stored(ids.accepted).tracking.links, [{ relation: 'initiative', itemId: ids.intent }, { relation: 'initiative', itemId: ids.group }]);
        assert.deepEqual(stored(ids.remaining).tracking.links, [{ relation: 'area', itemId: 'HAND-G' }, { relation: 'initiative', itemId: ids.group }]);
        // A path to the record that moved follows it; every other path stays as written. Each still resolves.
        assert.deepEqual(stored(ids.supporting).tracking.links.filter(entry => entry.path).map(entry => entry.path),
            ['work/tasks/PBI-1.md', 'work/subtasks/TASK-K.md', 'work/initiatives/IDEA-D.md', 'work/initiatives/EPIC-E.md', 'work/tasks/stories/STORY-S.md']);
        for (const entry of stored(ids.supporting).tracking.links.filter(candidate => candidate.path)) assert.ok(exists(f, entry.path), `${entry.path} still resolves`);
        assert.ok(stored(ids.group).tracking.receipts.every(receipt => receipt.result.kind === 'initiative' && receipt.result.ownerPath === 'work/initiatives/EPIC-E.md'));
        // The declaration: the marker and the restated labels, and not one other character of a hand-formatted file.
        assert.equal(text(f, 'docs/project-config.json'), handConfigAfter(configBefore));
        // Read back: the same progress in the current terms, and the project accepts ordinary saves again.
        const snapshot = f.progress();
        assert.deepEqual(numbers(snapshot), numbers(before)); assert.deepEqual([snapshot.vocabulary.project.state, snapshot.vocabulary.project.code], ['current', null]);
        assert.deepEqual(codes(snapshot), codes(before)); assert.deepEqual([snapshot.hierarchy.labels.levels.product, snapshot.hierarchy.labels.types.initiative], ['Area "A"', 'Bet']);
        assert.deepEqual(Object.fromEntries(snapshot.items.filter(item => project.expected.states[item.id]).map(item => [item.id, item.state])), project.expected.states);
        const revision = stored(ids.remaining).revision;
        await f.saved('update', ids.remaining, { title: 'Saved after migration' }); assert.equal(stored(ids.remaining).revision, revision + 1);
        await f.saved('update', ids.supporting, { title: 'Its moved links are still inspectable' });
        await f.create('TASK-after'); assert.ok(exists(f, 'work/tasks/TASK-after.md'));
    }),
    test('TC-TPT-248', 'an unconfigured earlier project is migrated without being enrolled and then reads as current by its locations', async f => {
        const project = await earlierProject(f, { declared: false, groups: [{ id: 'PRODUCT', kind: 'vision', purpose: 'area', members: ['PBI-1'] }] });
        const config = text(f, 'docs/project-config.json');
        const result = await f.migrate();
        assert.deepEqual([result.status, result.config.status], ['migrated', 'skipped'], JSON.stringify(result));
        assert.equal(text(f, 'docs/project-config.json'), config, 'No tracker block is written');
        const snapshot = f.progress();
        assert.deepEqual(numbers(snapshot), recorded(project)); assert.equal(snapshot.enrolled, false);
        assert.deepEqual([snapshot.vocabulary.project.state, snapshot.vocabulary.project.declared, snapshot.vocabulary.project.currentLocations], ['current', false, ['areas']]);
        assert.deepEqual(Object.fromEntries(snapshot.items.map(item => [item.id, item.kind])), { ...project.expected.kinds, PRODUCT: 'area' });
    }),
    test('TC-TPT-248', 'a rewrite that would alter authored content is refused before any record changes', async f => {
        const project = await earlierProject(f);
        const stored = f.storedState();
        const patchRecord = store.patchRecord;
        // The record writer is made to return a candidate whose authored body differs, as a defect in it would.
        store.patchRecord = (record, fields, tracking) => {
            const candidate = patchRecord(record, fields, tracking);
            return record.id === project.ids.remaining ? store.parseRecord(Buffer.concat([candidate.bytes, Buffer.from('altered\n')]), candidate.ownerPath, candidate.kind) : candidate;
        };
        try {
            for (const dryRun of [true, false]) {
                const result = await f.migrate({ dryRun });
                assert.deepEqual([result.status, result.code], ['refused', 'RECORD_NOT_REWRITABLE'], JSON.stringify(result));
                assert.deepEqual(result.refusals[0].records.map(record => [record.path, record.itemId]), [['work/tasks/PBI-2.md', project.ids.remaining]]);
                assert.deepEqual(f.storedState(), stored); assert.ok(!exists(f, JOURNAL));
            }
        } finally { store.patchRecord = patchRecord; }
        // A group whose list or purpose carries an authored comment cannot lose that value without losing the comment: refused by name too.
        const group = text(f, 'work/projects/EPIC-E.md');
        f.write('work/projects/COMMENTED.md', ['---', 'id: COMMENTED', 'title: Commented group', 'intent: Keep the comment', 'status: draft', 'tracking:', '  schemaVersion: 2', '  revision: 1', '  kind: project',
            '  groupRole: capability # chosen by the team', '---', ''].join('\n'));
        await refusedBeforeChange(f, 'RECORD_NOT_REWRITABLE', /Record cannot be rewritten safely: work\/projects\/COMMENTED\.md; nothing was changed/);
        fs.rmSync(path.join(f.root, 'work/projects/COMMENTED.md')); assert.equal(text(f, 'work/projects/EPIC-E.md'), group);
        assert.equal((await f.migrate()).status, 'migrated');
    }),
    test('TC-TPT-248', 'a result whose progress differs from the values captured before the first change is reported as failed and its progress record is kept', async f => {
        const project = await earlierProject(f);
        let lost;
        const result = await f.migrate({ checkpoint: name => {
            if (name !== 'before-verify') return;
            lost = text(f, 'work/tasks/PBI-2.md'); fs.rmSync(path.join(f.root, 'work/tasks/PBI-2.md'));
        } });
        assert.deepEqual([result.status, result.code], ['failed', 'MIGRATION_VERIFICATION_FAILED'], JSON.stringify(result));
        assert.deepEqual(result.differing, ['total', 'remaining', 'eligibleIds', 'records', 'recordIdentity']);
        assert.deepEqual(result.expected, recorded(project)); assert.deepEqual(result.actual, { total: 1, accepted: 1, remaining: 0, eligibleIds: [project.ids.accepted] });
        assert.match(result.reason, /Migration verification failed.*work\/\.vocabulary-migration\.json is kept/); assert.ok(!result.reason.includes(f.root));
        assert.ok(exists(f, JOURNAL), 'The progress record stays for inspection'); await assertUnavailable(f);
        // Running again does not talk itself into success: the record its index lists is named as missing. Putting it back does.
        const again = await f.migrate();
        assert.deepEqual([again.status, again.code, again.step], ['interrupted', 'INCOMPLETE_SCOPE', 'members'], JSON.stringify(again));
        assert.match(again.reason, /^The project changed after the migration began: PBI-2 is no longer stored; put the records back as they were\. Migration in progress/); assert.ok(exists(f, JOURNAL));
        f.write('work/tasks/PBI-2.md', lost);
        const repeated = await f.migrate();
        assert.deepEqual([repeated.status, repeated.resumed], ['migrated', true]); assert.deepEqual(repeated.progress, recorded(project)); assert.ok(!exists(f, JOURNAL));
    }),
    test('TC-TPT-249', 'a migration interrupted at any point blocks every read, save and preview, and one repeated run finishes with the uninterrupted result', async f => {
        // One record among the others needs no rewrite: no tracking metadata and a state both vocabularies share.
        const { restore, earlier, migrated, checkpoints } = await migratable(f, { groups: STRUCTURE }, () => f.write('work/tasks/NOTE.md', HAND_UNCHANGED));
        const progress = numbers(f.progress());
        assert.deepEqual(progress.eligibleIds, ['NOTE', 'PBI-1', 'PBI-2']);
        // Every point the migration reports: after the progress record is written, after each record that is not a group is
        // rewritten, after each group record is written at its new path and again after its earlier record is removed,
        // after the earlier locations are removed, after the declaration change and just before the progress record is removed.
        const fileHashes = state => new Map(state.filter(([relative, value]) => relative.startsWith('work/') && value !== 'directory'));
        const rewritten = [...fileHashes(earlier)].filter(([relative, stored]) => fileHashes(migrated).has(relative) && fileHashes(migrated).get(relative) !== stored).map(([relative]) => relative);
        assert.deepEqual(rewritten, ['work/initiatives/IDEA-D.md', 'work/subtasks/TASK-K.md', 'work/tasks/PBI-1.md', 'work/tasks/PBI-2.md', 'work/tasks/stories/STORY-S.md']);
        assert.equal(checkpoints.filter(name => name === 'member-rewritten').length, rewritten.length);
        assert.deepEqual(['group-written', 'group-moved'].map(point => checkpoints.filter(name => name === point).length), [7, 7]);
        assert.deepEqual([...new Set(checkpoints)], ['journal-written', 'member-rewritten', 'members-rewritten', 'group-written', 'group-moved', 'groups-moved', 'locations-removed', 'config-written', 'before-verify', 'verified']);
        for (let index = 0; index < checkpoints.length; index++) {
            const stopped = await f.migrate({ checkpoint: stopAt(index) });
            assert.equal(stopped.status, 'interrupted', `${checkpoints[index]}: ${JSON.stringify(stopped)}`);
            assert.equal(stopped.journal, JOURNAL); assert.match(stopped.reason, /run the tracker migration again/);
            assert.ok(exists(f, JOURNAL), checkpoints[index]); assertJournalTruth(f); await assertUnavailable(f);
            const repeated = await f.migrate();
            assert.deepEqual([repeated.status, repeated.resumed], ['migrated', true], `${checkpoints[index]}: ${JSON.stringify(repeated)}`);
            assert.deepEqual(repeated.progress, progress);
            // Byte for byte the uninterrupted result: no change repeated, none skipped, no record rewritten twice.
            assert.deepEqual(f.storedState(), migrated, `${index} ${checkpoints[index]}`);
            assert.deepEqual(numbers(f.progress()), progress);
            restore();
        }
        // Interrupted again during each repeated run, at every later point in turn, until one run is left alone.
        let runs = 0;
        for (let result = await f.migrate({ checkpoint: stopAt(1) }); result.status !== 'migrated'; result = await f.migrate(runs < 30 ? { checkpoint: stopAt(1) } : {})) {
            assert.equal(result.status, 'interrupted'); assertJournalTruth(f); await assertUnavailable(f);
            assert.ok(++runs < 40, 'A repeated run makes progress');
        }
        assert.ok(runs >= 5); assert.deepEqual(f.storedState(), migrated);
    }),
    test('TC-TPT-249', 'a group record that cannot be removed from its earlier location leaves its step unfinished with the cause named, and the repeated run resumes from it', async f => {
        const { project, migrated } = await migratable(f, { groups: STRUCTURE });
        const stopped = await firstRemovalFails(f);
        assert.deepEqual([stopped.status, stopped.code], ['interrupted', 'EPERM'], JSON.stringify(stopped));
        assert.match(stopped.reason, /^Migration could not continue \(EPERM\)\. Migration in progress/); assert.ok(!JSON.stringify(stopped).includes(f.root));
        assert.deepEqual(journal(f).steps.map(step => step.status), ['done', 'started', 'pending', 'pending', 'pending']);
        // The record is written at its new path and still at its earlier one; no other group has moved.
        assert.deepEqual(['work/initiatives/EPIC-E.md', 'work/projects/EPIC-E.md', 'work/projects/FEATURE.md', 'work/areas'].map(relative => exists(f, relative)), [true, true, true, false]);
        assertJournalTruth(f); await assertUnavailable(f);
        const repeated = await f.migrate();
        assert.deepEqual([repeated.status, repeated.resumed], ['migrated', true]); assert.deepEqual(repeated.progress, recorded(project));
        assert.deepEqual(f.storedState(), migrated);
    }),
    test('TC-TPT-249', 'a file that appears at a group record\'s new path after the check stops the move without replacing it, and the run finishes once it is gone', async f => {
        const { migrated } = await migratable(f);
        // A second record of the same identity, put under the file name the group record is about to take.
        const foreign = HAND_UNTRACKED.replace('id: LEGACY', 'id: EPIC-E').replace('status: planned', 'status: draft');
        const stopped = await f.migrate({ checkpoint: name => { if (name === 'journal-written') f.write('work/initiatives/EPIC-E.md', foreign); } });
        assert.deepEqual([stopped.status, stopped.code, stopped.step], ['interrupted', 'DESTINATION_PRESENT', 'groups'], JSON.stringify(stopped));
        assert.match(stopped.reason, /^Destination already present: work\/initiatives\/EPIC-E\.md exists while work\/projects\/EPIC-E\.md still waits to move/);
        assert.equal(text(f, 'work/initiatives/EPIC-E.md'), foreign, 'The foreign record is neither replaced nor merged into');
        assert.ok(exists(f, 'work/projects/EPIC-E.md'));
        assert.deepEqual(journal(f).steps.map(step => step.status), ['done', 'started', 'pending', 'pending', 'pending']); await assertUnavailable(f);
        assert.equal((await f.migrate()).status, 'interrupted', 'Still refused while the foreign file is there');
        fs.rmSync(path.join(f.root, 'work/initiatives/EPIC-E.md'));
        // A record that was not there when the migration began is not rewritten with the others: the run stops and says so.
        const added = HAND_UNTRACKED.replace('id: LEGACY', 'id: ADDED-LATE');
        f.write('work/initiatives/ADDED-LATE.md', added);
        const changed = await f.migrate();
        assert.deepEqual([changed.status, changed.code], ['interrupted', 'INCOMPLETE_SCOPE'], JSON.stringify(changed));
        assert.match(changed.reason, /^The project changed after the migration began: a record was added or removed; put the records back as they were/);
        assert.equal(text(f, 'work/initiatives/ADDED-LATE.md'), added);
        fs.rmSync(path.join(f.root, 'work/initiatives/ADDED-LATE.md'));
        assert.equal((await f.migrate()).status, 'migrated'); assert.deepEqual(f.storedState(), migrated);
    }),
    test('TC-TPT-249', 'a migration waits for the writer lock, so it never changes a record under another tracker writer', async f => {
        const { project, earlier, migrated } = await migratable(f);
        let release;
        const writer = withTrackingLock(f.root, () => new Promise(resolve => { release = resolve; }));
        while (!exists(f, LOCK_PATH)) await new Promise(resolve => setImmediate(resolve));
        let settled = false;
        const pending = f.migrate().then(result => { settled = true; return result; });
        // Long enough for an unlocked migration to have finished several times over.
        await new Promise(resolve => setTimeout(resolve, 150));
        assert.equal(settled, false); assert.deepEqual(f.storedState(), earlier); assert.ok(!exists(f, JOURNAL));
        release({}); await writer;
        const result = await pending;
        assert.equal(result.status, 'migrated', JSON.stringify(result)); assert.deepEqual(result.progress, recorded(project));
        assert.deepEqual(f.storedState(), migrated); assert.ok(!exists(f, LOCK_PATH));
        // A second run that was waiting behind the first finds nothing left to do.
        const both = await Promise.all([f.migrate(), f.migrate()]);
        assert.deepEqual(both.map(entry => entry.status), ['current', 'current']); assert.deepEqual(f.storedState(), migrated);
    }),
    test('TC-TPT-249', 'a progress record that names other paths, groups or steps than this migration\'s own is never acted on', async f => {
        const { restore, earlier, migrated } = await migratable(f, { groups: STRUCTURE });
        let written;
        await f.migrate({ checkpoint: name => { if (name === 'journal-written') { written = text(f, JOURNAL); throw new Error('simulated interruption'); } } });
        const value = JSON.parse(written);
        assert.ok(!exists(f, 'tmp/task-tracking/.vocabulary-migration.json'));
        const before = f.storedState();
        const group = change => ({ ...value, index: { groups: value.index.groups.map((entry, index) => (index ? entry : { ...entry, ...change })) } });
        for (const tampered of [group({ from: 'docs/project-config.json' }), group({ to: 'work/tasks/PBI-1.md' }), group({ to: 'work/areas/EPIC-E.md' }), group({ kind: 'task' }), group({ members: ['../outside'] }),
            { ...value, steps: value.steps.slice(1) }, { ...value, steps: value.steps.map((step, index) => (index ? step : { ...step, id: 'moves' })) }, { ...value, from: 1, to: 2 },
            { ...value, capture: { ...value.capture, groups: value.capture.groups.slice(1) } }, 'not json']) {
            f.write(JOURNAL, typeof tampered === 'string' ? tampered : JSON.stringify(tampered));
            const state = f.storedState();
            for (const options of [{}, { abandon: true }]) {
                const result = await f.migrate(options);
                assert.deepEqual([result.status, result.code], ['interrupted', 'INVALID_MIGRATION_RECORD'], JSON.stringify(result));
                assert.deepEqual(f.storedState(), state);
            }
        }
        f.write(JOURNAL, written); assert.deepEqual(f.storedState(), before);
        assert.equal((await f.migrate()).status, 'migrated');
        restore(); assert.deepEqual(f.storedState(), earlier); assert.equal((await f.migrate()).status, 'migrated'); assert.deepEqual(f.storedState(), migrated);
    }),
    test('TC-TPT-249', 'a linked record location or a linked progress record is refused and never followed', async f => {
        await earlierProject(f);
        const restore = keep(f);
        // A record location that is a link to a folder outside the record root.
        fs.mkdirSync(path.join(f.root, 'elsewhere')); fs.renameSync(path.join(f.root, 'work/projects'), path.join(f.root, 'elsewhere/projects'));
        link(path.join(f.root, 'elsewhere/projects'), path.join(f.root, 'work/projects'), 'dir');
        const outside = text(f, 'elsewhere/projects/EPIC-E.md');
        for (const dryRun of [true, false]) {
            const result = await f.migrate({ dryRun });
            assert.deepEqual([result.status, result.code], ['refused', 'UNSAFE_PATH'], JSON.stringify(result));
            assert.deepEqual(result.refusals[0].paths, ['work/projects']); assert.ok(!exists(f, JOURNAL));
            assert.ok(fs.lstatSync(path.join(f.root, 'work/projects')).isSymbolicLink() && exists(f, 'work/tasks/PBI-1.md') && !exists(f, 'work/areas'));
            assert.equal(text(f, 'elsewhere/projects/EPIC-E.md'), outside);
        }
        fs.rmSync(path.join(f.root, 'work/projects'), { recursive: true, force: true }); restore();
        // A link where the progress record belongs: nothing is read through it, written through it or moved.
        const stored = f.storedState();
        fs.mkdirSync(path.join(f.root, 'elsewhere/journal'), { recursive: true });
        link(path.join(f.root, 'elsewhere/journal'), path.join(f.root, JOURNAL), 'dir');
        for (const dryRun of [true, false]) {
            const result = await f.migrate({ dryRun });
            assert.notEqual(result.status, 'migrated'); assert.notEqual(result.status, 'preview');
            assert.equal(result.code, dryRun ? 'MIGRATION_IN_PROGRESS' : 'UNSAFE_PATH', JSON.stringify(result));
            assert.deepEqual(fs.readdirSync(path.join(f.root, 'elsewhere/journal')), []);
            assert.ok(fs.lstatSync(path.join(f.root, JOURNAL)).isSymbolicLink() && exists(f, 'work/projects/EPIC-E.md') && exists(f, 'work/tasks/PBI-1.md'));
        }
        fs.rmSync(path.join(f.root, JOURNAL), { recursive: true, force: true });
        assert.deepEqual(f.storedState(), stored);
    }),
    test('TC-TPT-248', 'the preview and the result name the work that stops being currently verified, leaves the ready list or is newly held by an unverified prerequisite, and no proof is altered', async f => {
        // Work linked to another record: by a spec link to its identity, and by a source link to its path.
        await f.create('SPEC-X', 'initiative');
        const spec = [{ relation: 'spec', itemId: 'SPEC-X' }];
        await f.create('T2'); await f.saved('link', 'T2', { links: spec }); await f.accepted('T2');
        await f.create('T3'); await f.saved('link', 'T3', { links: spec }); await f.saved('assign', 'T3', { assigneeId: 'owner' }); await f.ready('T3');
        await f.create('T4'); await f.saved('link', 'T4', { links: [{ relation: 'dependency', itemId: 'T2' }] });
        await f.create('T5'); await f.saved('link', 'T5', { links: spec }); await f.verifying('T5'); await f.saved('proof', 'T5', { proof: f.proof('T5') });
        await f.create('T6'); await f.saved('link', 'T6', { links: [{ relation: 'source', path: f.record('SPEC-X').ownerPath }] }); await f.verifying('T6'); await f.saved('proof', 'T6', { proof: f.proof('T6') });
        // Boundary: evidence that neither moves nor is rewritten.
        f.write('docs/requirements.md', 'The export holds exactly the selected rows.\n');
        await f.create('T7'); await f.saved('link', 'T7', { links: [{ relation: 'source', path: 'docs/requirements.md' }] }); await f.verifying('T7'); await f.saved('proof', 'T7', { proof: f.proof('T7') });
        const project = await earlierProject(f);
        recordedInEarlierProject(f, ['T2', 'T3', 'T5', 'T6', 'T7']);
        const verified = snapshot => snapshot.items.filter(item => item.verification.status === 'current').map(item => item.id).sort();
        const before = f.progress();
        assert.deepEqual(verified(before), [project.ids.accepted, 'T2', 'T5', 'T6', 'T7']); assert.deepEqual(before.ready, ['T3']);
        assert.deepEqual(before.items.find(item => item.id === 'T4').prerequisiteReasons, []); assert.equal(before.metrics.currentlyVerified, 2);
        const proofs = Object.fromEntries(['T2', 'T5', 'T6', 'T7'].map(id => [id, JSON.stringify(f.record(id).tracking.proofs)]));
        const stored = f.storedState();
        const expected = { verificationStale: ['T2', 'T5', 'T6'], leavingReady: ['T3'], newlyBlocked: [{ itemId: 'T4', prerequisiteIds: ['T2'] }] };

        const preview = await f.migrate({ dryRun: true });
        assert.equal(preview.status, 'preview', JSON.stringify(preview));
        assert.deepEqual(preview.currentlyVerified, { before: 2, after: 1 });
        assert.deepEqual({ ...preview.standing, note: undefined }, { ...expected, note: undefined });
        assert.equal(preview.standing.note, 'These items need verifying again after migration: a proof names the location and content of the record it was checked against, and that record moves or is rewritten. Migration alters no proof; record a new observation for each named item afterwards');
        // The preview rehearsed the result; it stored nothing, and the delivery numbers it promises to conserve are unaffected.
        assert.deepEqual(f.storedState(), stored); assert.deepEqual(preview.progress, numbers(before));

        const result = await f.migrate();
        assert.equal(result.status, 'migrated', JSON.stringify(result));
        assert.deepEqual(result.currentlyVerified, { before: 2, after: 1 });
        assert.deepEqual({ ...result.standing, note: undefined }, { ...expected, note: undefined });
        assert.equal(result.standing.note, 'These items need verifying again: a proof names the location and content of the record it was checked against, and that record moved or was rewritten. No proof was altered; record a new observation for each named item');
        // What was named is what every later read shows.
        const after = f.progress();
        assert.deepEqual(verified(after), [project.ids.accepted, 'T7']); assert.deepEqual(after.ready, []); assert.equal(after.metrics.currentlyVerified, 1);
        assert.deepEqual(after.items.find(item => item.id === 'T4').prerequisiteReasons, ['Prerequisite T2 is unresolved or not currently verified']);
        assert.deepEqual(numbers(after), numbers(before)); assert.equal(after.items.find(item => item.id === 'T2').acceptance.accepted, true);
        // Disclosed, never repaired: every proof is the proof that was recorded.
        for (const [id, recorded] of Object.entries(proofs)) assert.equal(JSON.stringify(f.record(id).tracking.proofs), recorded, id);
        refused(await f.perform('accept', 'T5', { reason: 'Accepted on the earlier observation' }), 'MISSING_PROOF');
        // Verifying again is an ordinary save, and it restores the standing the result named.
        await f.saved('proof', 'T5', { proof: f.proof('T5') }); assert.equal(f.view('T5').verification.status, 'current');
    }),
    test('TC-TPT-248', 'a record with Windows line endings and a byte-order mark is rewritten with both kept and no other byte changed', async f => {
        await earlierProject(f);
        f.write('work/visions/CR-1.md', HAND_CRLF);
        assert.equal((await f.migrate()).status, 'migrated');
        const bytes = fs.readFileSync(path.join(f.root, 'work/areas/CR-1.md'));
        assert.deepEqual([...bytes.subarray(0, 3)], [0xEF, 0xBB, 0xBF], 'The byte-order mark is still the first three bytes');
        assert.equal(bytes.toString('utf8'), HAND_CRLF_AFTER);
        assert.equal(/(^|[^\r])\n/.test(bytes.toString('utf8')), false, 'Every line still ends as the record was written');
        assert.deepEqual([f.record('CR-1').kind, f.record('CR-1').data.status, f.record('CR-1').body], ['area', 'active', 'Body line 1\r\nBody line 2\r\n']);
        assert.deepEqual(f.record('PBI-1').tracking.links.filter(entry => entry.relation === 'area'), [{ relation: 'area', itemId: 'CR-1' }]);
    }),
    test('TC-TPT-248', 'a project whose configuration sits in the checkout root is migrated, with its declaration replaced whole and nothing else written there', async f => {
        const project = await earlierProject(f);
        const formatted = handConfig(f.config);
        fs.rmSync(path.join(f.root, 'docs/project-config.json')); f.write('project-config.json', formatted);
        f.write('.claude/.ck.local.json', JSON.stringify({ portability: { projectConfigPath: 'project-config.json' } }));
        assert.equal(f.progress().vocabulary.project.state, 'earlier'); assert.deepEqual(numbers(f.progress()), recorded(project));
        const inRoot = () => fs.readdirSync(f.root).filter(name => name !== 'tmp').sort();
        const names = inRoot();
        const preview = await f.migrate({ dryRun: true });
        assert.equal(preview.status, 'preview', JSON.stringify(preview));
        assert.deepEqual(preview.config, { path: 'project-config.json', changes: [CONFIG_CHANGES[0], { field: 'taskTracking.groupLabels.area', movedTo: 'taskTracking.levelLabels.product' }, CONFIG_CHANGES[1]] });
        assert.equal(text(f, 'project-config.json'), formatted);
        // Stopped as soon as the declaration is replaced: the file is whole and current, and the repeated run finishes.
        const stopped = await stopAfter(f, 'config-written');
        assert.equal(stopped.status, 'interrupted', JSON.stringify(stopped));
        const current = handConfigAfter(formatted);
        assert.equal(text(f, 'project-config.json'), current); assert.deepEqual(inRoot(), names, 'No temporary file is left beside the configuration');
        const result = await f.migrate();
        assert.deepEqual([result.status, result.resumed, result.config], ['migrated', true, { path: 'project-config.json', status: 'done' }], JSON.stringify(result));
        assert.equal(text(f, 'project-config.json'), current); assert.deepEqual(inRoot(), names);
        const snapshot = f.progress();
        assert.deepEqual(numbers(snapshot), recorded(project)); assert.equal(snapshot.vocabulary.project.state, 'current'); assert.equal(snapshot.hierarchy.labels.types.initiative, 'Bet');
        // Replacing a root-level file is its own narrow door: one existing file, against the content that was inspected.
        const held = fs.readFileSync(path.join(f.root, 'project-config.json'));
        const unsafe = error => error.code === 'UNSAFE_PATH';
        assert.throws(() => replaceRootFile(f.root, 'docs/unrelated.json', Buffer.from('{}'), hash(held)), unsafe);
        assert.throws(() => replaceRootFile(f.root, 'created.json', Buffer.from('{}'), null), unsafe);
        assert.throws(() => replaceRootFile(f.root, 'project-config.json', Buffer.from('{}'), hash('not what is stored')), error => error.code === 'CONFLICT');
        // The record writer still refuses the checkout root, for a new file and for an existing one.
        assert.throws(() => publishBytes(f.root, 'stray.md', Buffer.from('stray'), null), unsafe);
        assert.throws(() => publishBytes(f.root, 'project-config.json', Buffer.from('{}'), hash(held)), unsafe);
        assert.deepEqual(fs.readFileSync(path.join(f.root, 'project-config.json')), held); assert.deepEqual(inRoot(), names);
    }),
    test('TC-TPT-248', 'a stored link path that spells a moved record in another letter case follows the record where the disk ignores case, and is left as written and named where it does not', async f => {
        const project = await earlierProject(f);
        const record = 'work/subtasks/TASK-K.md';
        f.write(record, text(f, record).replace('"path":"work/projects/EPIC-E.md"', '"path":"work/Projects/EPIC-E.md"'));
        assert.ok(text(f, record).includes('"path":"work/Projects/EPIC-E.md"'));
        const restore = keep(f);
        const elsewhere = ['work/tasks/PBI-1.md', 'work/subtasks/TASK-K.md', 'work/initiatives/IDEA-D.md'];
        const migrateOn = async ignoresCase => {
            const preview = await f.migrate({ dryRun: true });
            const result = await f.migrate();
            assert.equal(result.status, 'migrated', JSON.stringify(result));
            const paths = f.record(project.ids.supporting).tracking.links.filter(entry => entry.path).map(entry => entry.path);
            assert.deepEqual([paths.slice(0, 3), paths[4]], [elsewhere, 'work/tasks/stories/STORY-S.md'], 'A path to a record that does not move stays as written on any disk');
            for (const view of [preview.linkPaths, result.linkPaths]) {
                assert.equal(view.diskIgnoresCase, ignoresCase);
                if (ignoresCase) assert.deepEqual(view, { diskIgnoresCase: true, leftAsWritten: [] });
                else {
                    assert.deepEqual([view.leftAsWritten, view.count], [[{ itemId: project.ids.supporting, path: 'work/Projects/EPIC-E.md' }], 1]);
                    assert.match(view.note, /differ from a moved record only in letter case.*left exactly as written.*Correct each by hand/);
                }
            }
            // Where the two spellings are one file the link follows it and still resolves; where they are not, not a character changes.
            assert.equal(paths[3], ignoresCase ? 'work/initiatives/EPIC-E.md' : 'work/Projects/EPIC-E.md');
            if (ignoresCase) assert.ok(exists(f, paths[3]));
        };
        // What this disk does, asked of the disk and not of the platform name.
        const here = fs.existsSync(path.join(f.root, 'work', 'TASKS'));
        await migrateOn(here);
        restore();
        // The other kind of disk.
        await withDiskIgnoringCase(!here, () => migrateOn(!here));
    }),
    test('TC-TPT-246', 'an uncommitted change to the project configuration that will be rewritten is refused by name', async f => {
        const project = await earlierProject(f, { commit: true });
        const committed = text(f, 'docs/project-config.json');
        f.write('docs/project-config.json', `${committed}\n`);
        const dirty = f.storedState();
        for (const dryRun of [true, false]) {
            const result = await f.migrate({ dryRun });
            assert.deepEqual([result.status, result.code, result.refusals[0].paths], ['refused', 'RECORD_ROOT_NOT_CLEAN', ['docs/project-config.json']], JSON.stringify(result));
            assert.match(result.reason, /^Project configuration has uncommitted changes: docs\/project-config\.json; commit or set them aside so version control can restore the earlier records and configuration, then retry$/);
            assert.deepEqual(f.storedState(), dirty); assert.ok(!exists(f, JOURNAL));
        }
        // Both at once: each is named for what it is.
        f.write('work/unsaved.md', 'never committed');
        const both = await f.migrate({ dryRun: true });
        assert.deepEqual(both.refusals[0].paths.sort(), ['docs/project-config.json', 'work/unsaved.md']);
        assert.match(both.reason, /^Record root has uncommitted changes: work\/unsaved\.md; Project configuration has uncommitted changes: docs\/project-config\.json; /);
        fs.rmSync(path.join(f.root, 'work/unsaved.md')); f.write('docs/project-config.json', committed);
        const result = await f.migrate();
        assert.equal(result.status, 'migrated', JSON.stringify(result)); assert.deepEqual(result.progress, recorded(project));
    }),
    test('TC-TPT-246', 'an uncommitted change to a project configuration the migration will not rewrite is not its concern', async f => {
        await earlierProject(f, { declared: false, commit: true });
        f.write('docs/project-config.json', `${text(f, 'docs/project-config.json')}\n`);
        const preview = await f.migrate({ dryRun: true });
        assert.deepEqual([preview.status, preview.config.changes, preview.versionControl], ['preview', [], { kind: 'git', clean: true, restorable: true }], JSON.stringify(preview));
    }),
    test('TC-TPT-246', 'when Git cannot say whether the record root is clean the migration is refused with the cause and what resolves it', async f => {
        const project = await earlierProject(f, { commit: true });
        const stored = f.storedState();
        const failure = code => ({ error: Object.assign(new Error(`spawnSync git ${code}`), { code }), status: null, stdout: Buffer.alloc(0) });
        const causes = [['timeout', failure('ETIMEDOUT'), /^Git did not answer within 10 seconds whether the record root is clean; nothing is wrong with the records\. Retry/],
            ['output-limit', failure('ENOBUFS'), /^Git listed more changed, untracked or ignored paths under the record root than can be inspected.*commit them or set them aside/],
            ['git-missing', failure('ENOENT'), /^This is a Git checkout but the git command could not be started.*make git available on the PATH/],
            ['git-failed', { status: 128, stdout: Buffer.alloc(0) }, /^Git could not report whether the record root is clean; run git status in the checkout, repair what it reports/]];
        for (const [cause, answer, reason] of causes) for (const dryRun of [true, false]) {
            const result = await withGitAnswer(answer, () => f.migrate({ dryRun }));
            assert.deepEqual([result.status, result.code, result.refusals[0].cause], ['refused', 'VERSION_CONTROL_UNAVAILABLE', cause], JSON.stringify(result));
            assert.match(result.reason, reason, cause); assert.ok(!JSON.stringify(result).includes(f.root));
            assert.deepEqual(f.storedState(), stored); assert.ok(!exists(f, JOURNAL));
        }
        // Not stood in for: a checkout whose Git data cannot be found makes the real command fail.
        fs.renameSync(path.join(f.root, '.git'), path.join(f.root, 'git-data-set-aside')); f.write('.git', 'gitdir: ./no-such-git-data\n');
        const unreadable = await f.migrate();
        assert.deepEqual([unreadable.status, unreadable.code, unreadable.refusals[0].cause], ['refused', 'VERSION_CONTROL_UNAVAILABLE', 'git-failed'], JSON.stringify(unreadable));
        assert.deepEqual(f.storedState(), stored);
        // Once Git answers, the same request proceeds.
        fs.rmSync(path.join(f.root, '.git')); fs.renameSync(path.join(f.root, 'git-data-set-aside'), path.join(f.root, '.git'));
        const result = await f.migrate();
        assert.equal(result.status, 'migrated', JSON.stringify(result)); assert.deepEqual(result.progress, recorded(project));
    }),
    test('TC-TPT-246', 'a record root that Git ignores is previewed with the statement that version control cannot restore it, and a run there is refused until a backup is confirmed', async f => {
        const project = await earlierProject(f);
        f.write('.gitignore', 'work/initiatives/\n');
        git(f, ['init']); git(f, ['add', '--', '.gitignore', 'docs', 'work']); git(f, ['commit', '-m', 'Earlier project with one ignored location']);
        // One location is ignored: Git reports no change there, and holds nothing to put back. The preview is given and says so.
        const partly = await f.migrate({ dryRun: true, backupConfirmed: false });
        assert.equal(partly.status, 'preview', JSON.stringify(partly));
        assert.deepEqual([partly.versionControl.kind, partly.versionControl.clean, partly.versionControl.restorable, partly.versionControl.ignored], ['git', true, false, ['work/initiatives/IDEA-D.md']]);
        assert.equal(partly.versionControl.note, 'Git ignores work/initiatives/IDEA-D.md: version control cannot restore what it does not track. A run will refuse (NO_RESTORE_POINT) until a backup is confirmed: make a backup you can restore, then run migrate --root <checkout> --backup-confirmed, or commit what Git ignores');
        // The run is refused before any change: it names what cannot be restored and both ways on.
        const stored = f.storedState();
        const refusal = await f.migrate({ backupConfirmed: false });
        assert.deepEqual([refusal.status, refusal.code, refusal.refusals[0].paths], ['refused', 'NO_RESTORE_POINT', ['work/initiatives/IDEA-D.md']], JSON.stringify(refusal));
        assert.equal(refusal.reason, 'No restore point: Git ignores work/initiatives/IDEA-D.md, so version control cannot restore it once migrated, and a migration cannot be undone. Make a backup you can restore and run again with --backup-confirmed, or commit the records and the configuration so that version control can restore them, then retry; nothing was changed');
        assert.deepEqual(f.storedState(), stored); assert.ok(!exists(f, JOURNAL));
        // The whole record root is ignored and nothing in it is tracked.
        git(f, ['rm', '-r', '--cached', '--quiet', '--', 'work']); f.write('.gitignore', 'work/\n');
        git(f, ['add', '--', '.gitignore']); git(f, ['commit', '-m', 'Records are kept out of version control']);
        const whole = await f.migrate({ dryRun: true, backupConfirmed: false });
        assert.deepEqual([whole.status, whole.versionControl.kind, whole.versionControl.clean, whole.versionControl.restorable], ['preview', 'git', true, false], JSON.stringify(whole));
        assert.ok(whole.versionControl.ignored.length >= 6 && whole.versionControl.ignored.every(relative => relative.startsWith('work/')), JSON.stringify(whole.versionControl));
        assert.match(whole.versionControl.note, /^Git ignores work\/.*version control cannot restore what it does not track\. A run will refuse \(NO_RESTORE_POINT\) until a backup is confirmed: .* --backup-confirmed, or commit what Git ignores$/);
        assert.ok(!JSON.stringify(whole).includes(f.root));
        const again = await f.migrate({ backupConfirmed: false });
        assert.deepEqual([again.status, again.code], ['refused', 'NO_RESTORE_POINT'], JSON.stringify(again));
        assert.match(again.reason, /^No restore point: Git ignores work\/.*, so version control cannot restore them once migrated/);
        assert.deepEqual(f.storedState(), stored); assert.ok(!exists(f, JOURNAL));
        // The person has a backup of their own and says so: the same run then proceeds.
        const result = await f.migrate({ backupConfirmed: true });
        assert.equal(result.status, 'migrated', JSON.stringify(result)); assert.deepEqual(result.progress, recorded(project));
    }),
    test('TC-TPT-249', 'an unfinished migration is abandoned by an explicit request alone: after a restore from version control and the stated steps that request removes only the progress record, and the project reads as the earlier vocabulary again with its original numbers', async f => {
        const project = await earlierProject(f, { commit: true, groups: STRUCTURE });
        const earlier = f.storedState();
        const figures = f.progress({ figures: true }).figures;
        const readsAsEarlierAgain = () => {
            assert.ok(!exists(f, JOURNAL)); assert.deepEqual(f.storedState(), earlier);
            const snapshot = f.progress({ figures: true });
            assert.deepEqual(numbers(snapshot), recorded(project)); assert.deepEqual([snapshot.vocabulary.project.state, snapshot.vocabulary.project.code], ['earlier', 'MIGRATION_REQUIRED']);
            assert.deepEqual(snapshot.figures, figures); assert.equal(git(f, ['status', '--porcelain', '--', 'work', 'docs']), '');
        };
        // The abandon request for a project that is not back whole: refused, with exactly what is not back or still remains.
        const notYet = async pending => {
            const state = f.storedState();
            const result = await f.migrate({ abandon: true });
            assert.deepEqual([result.status, result.code, result.journal], ['interrupted', 'RESTORE_INCOMPLETE', JOURNAL], JSON.stringify(result));
            if (Array.isArray(pending)) assert.deepEqual(result.notRestored, pending); else assert.match(result.notRestored.join('; '), pending);
            assert.ok(result.reason.startsWith(`Not abandoned: the project is not back as it was before the migration began: ${result.notRestored.join('; ')}. Nothing was changed: the progress record work/.vocabulary-migration.json is kept and no record or folder was removed or moved. To abandon this migration instead of completing it: (1) restore work`), result.reason);
            assert.ok(result.reason.endsWith('To complete the migration instead, run migrate --root <checkout> without --abandon'));
            assert.deepEqual(f.storedState(), state, 'A refused abandon request leaves the project exactly as it is'); assert.ok(!JSON.stringify(result).includes(f.root));
            return result;
        };
        // A run without the request on a project restored from outside: neither carried further nor abandoned.
        const neither = async back => {
            const state = f.storedState();
            const result = await f.migrate();
            assert.deepEqual([result.status, result.code, result.back], ['interrupted', 'RESTORED_FROM_OUTSIDE', back], JSON.stringify(result));
            assert.ok(result.reason.startsWith(`Restored from outside: back again after this migration changed them: ${back.join(', ')}. Nothing was changed: a run without an abandon request completes a migration and never abandons one, and it does not carry a restored project further. `), result.reason);
            assert.equal(result.abandon.at(-1), ABANDON.request); assert.ok(result.reason.includes(`To abandon this migration instead of completing it: ${result.abandon.map((step, index) => `(${index + 1}) ${step}`).join('; ')}`));
            assert.deepEqual(f.storedState(), state, 'A restored project is left exactly as it is'); assert.ok(exists(f, JOURNAL)); assert.ok(!JSON.stringify(result).includes(f.root));
            return result;
        };

        // Stopped after two group records moved. The result states the way out, naming only what this migration made.
        const early = await stopAfter(f, 'group-moved', 2);
        assert.equal(early.status, 'interrupted', JSON.stringify(early));
        assert.deepEqual(early.abandon, [ABANDON.restore, ABANDON.created, wrote('work/initiatives/EPIC-E.md'), ABANDON.request]);
        assert.ok(early.reason.endsWith(`To abandon this migration instead of completing it: ${early.abandon.map((step, index) => `(${index + 1}) ${step}`).join('; ')}`));
        assert.ok(!/run the migration again: it recognises/.test(early.reason), 'A repeated run is never offered as the way to abandon');
        // Asked for before anything was put back.
        await notYet([STILL_PRESENT('work/areas')]);
        // Step 1 alone ends nothing: the progress record and what the migration wrote are not under version control.
        restoreFromGit(f, false);
        await assertUnavailable(f);
        const afterRestore = await notYet([STILL_PRESENT('work/areas')]);
        assert.deepEqual(afterRestore.abandon, early.abandon);
        // Without the request the same project is not abandoned and not migrated further, and is told both ways on.
        const undecided = await neither(['work/projects/EPIC-E.md', 'work/projects/FEATURE.md']);
        assert.match(undecided.reason, /The earlier project is not back whole: work\/areas is still present/);
        assert.deepEqual(undecided.complete, ['remove work/projects/EPIC-E.md, work/projects/FEATURE.md, which the restore put back, after checking that each of those records is also kept, as migrated, at work/initiatives/EPIC-E.md, work/areas/FEATURE.md',
            'run migrate --root <checkout> again']);
        assert.ok(undecided.reason.endsWith(`To complete the migration instead, undo that restore: ${undecided.complete.map((step, index) => `(${index + 1}) ${step}`).join('; ')}`));
        // Step 2.
        fs.rmSync(path.join(f.root, 'work/areas'), { recursive: true });
        // A record the migration wrote, left beside the restored ones, still keeps the project from being taken as restored.
        const leftover = await notYet(/work\/initiatives\/EPIC-E\.md is still stored in the current vocabulary/);
        assert.deepEqual(leftover.abandon, [ABANDON.restore, wrote('work/initiatives/EPIC-E.md'), ABANDON.request]); assert.ok(exists(f, JOURNAL));
        // Step 3.
        git(f, ['clean', '-f', '-d', '--quiet', '--', 'work/initiatives']);
        // The project is whole again; a preview says so, names both requests and still changes nothing.
        const whole = f.storedState();
        const preview = await f.migrate({ dryRun: true });
        assert.deepEqual([preview.status, preview.code], ['refused', 'MIGRATION_IN_PROGRESS']);
        assert.match(preview.reason, /the earlier project is as it was before the migration began\. To complete the migration run migrate --root <checkout>; to end it run migrate --root <checkout> --abandon, which removes only the progress record/);
        assert.deepEqual(f.storedState(), whole); assert.equal(f.progress().coverage, 'unavailable');
        // Last step: the request checks the restore, removes only the progress record and says what it did.
        const first = await f.migrate({ abandon: true });
        assert.deepEqual([first.status, first.code, first.progress], ['abandoned', 'MIGRATION_ABANDONED', recorded(project)], JSON.stringify(first));
        readsAsEarlierAgain();

        // Stopped just before verification, with every record rewritten, every group record moved and the declaration changed.
        const late = await stopAfter(f, 'before-verify');
        assert.equal(late.status, 'interrupted', JSON.stringify(late));
        assert.deepEqual(late.abandon, [ABANDON.restore, ABANDON.created, wrote('work/initiatives/EPIC-E.md', 'work/initiatives/PLANNED.md', 'work/initiatives/STARTED.md'), ABANDON.request]);
        await notYet(['work/projects is not back', 'work/visions is not back', STILL_PRESENT('work/areas'), 'docs/project-config.json still declares the current vocabulary']);
        restoreFromGit(f, false);
        await notYet([STILL_PRESENT('work/areas')]);
        const everyGroup = [...Object.values(GROUP_PATHS).map(([from]) => from), 'the earlier declaration in docs/project-config.json'];
        await neither(everyGroup);
        fs.rmSync(path.join(f.root, 'work/areas'), { recursive: true });
        await notYet(/work\/initiatives\/EPIC-E\.md, work\/initiatives\/PLANNED\.md, work\/initiatives\/STARTED\.md is still stored in the current vocabulary/);
        // What the migration wrote is gone, so completing is no longer offered as removing what came back.
        const pastCompleting = await neither(everyGroup);
        assert.deepEqual(pastCompleting.complete, []);
        assert.match(pastCompleting.reason, /This migration can no longer be completed from here: work\/areas\/FEATURE\.md, work\/areas\/FEATURE-NESTED\.md, work\/areas\/MODULE\.md, work\/areas\/PRODUCT\.md, which it wrote, is gone\. Abandon it, then preview and run the migration afresh$/);
        git(f, ['clean', '-f', '-d', '--quiet', '--', 'work/initiatives']);
        // Every record is back and nothing is left over, yet the project is not the one the migration started from.
        const held = text(f, 'work/tasks/PBI-2.md'); fs.rmSync(path.join(f.root, 'work/tasks/PBI-2.md'));
        await notYet(/^total, remaining, eligibleIds, records, recordIdentity differ from the values captured before the migration began/);
        f.write('work/tasks/PBI-2.md', held);
        // The same records and the same progress, but a group no longer lists what it listed: still not the project it was.
        const listing = text(f, 'work/projects/FEATURE-NESTED.md');
        f.write('work/projects/FEATURE-NESTED.md', listing.replace('"memberItemIds":["PBI-2"]', '"memberItemIds":[]'));
        await notYet(['the member lists of FEATURE, FEATURE-NESTED, MODULE, PLANNED, PRODUCT do not hold what they held before the migration began']);
        f.write('work/projects/FEATURE-NESTED.md', listing);
        const ended = await f.migrate({ abandon: true });
        assert.deepEqual([ended.status, ended.code, ended.progress], ['abandoned', 'MIGRATION_ABANDONED', recorded(project)], JSON.stringify(ended));
        assert.equal(ended.reason, 'Migration abandoned: the earlier records and the project configuration are back as they were before the migration began and nothing the migration created remains, so the progress record work/.vocabulary-migration.json was removed. The project stores the earlier vocabulary again and is read-only; preview and run the migration to start over');
        readsAsEarlierAgain();
        // An abandoned migration leaves an ordinary earlier project: it can be previewed and migrated afresh.
        assert.equal((await f.migrate({ dryRun: true })).status, 'preview');
        const again = await f.migrate();
        assert.deepEqual([again.status, again.resumed, again.progress], ['migrated', false, recorded(project)], JSON.stringify(again));
    }),
    test('TC-TPT-249', 'in every state a migration can stop in, an abandon request ends it exactly when the earlier project is back whole, and a run without that request completes it or stops and never abandons it', async f => {
        const project = await earlierProject(f, { commit: true, groups: STRUCTURE });
        const reset = keep(f);
        const earlier = f.storedState();
        // What each request answers per state and per how far the project was put back: [without the request, with it].
        const untouched = { 'not restored': ['migrated', 'abandoned'], 'restored in part': ['migrated', 'abandoned'], 'restored whole': ['migrated', 'abandoned'] };
        // Nothing the migration wrote remains once its rewritten records are put back, so the checkout alone makes the project whole.
        const rewritten = { 'not restored': ['migrated', 'RESTORE_INCOMPLETE'], 'restored in part': ['migrated', 'abandoned'], 'restored whole': ['migrated', 'abandoned'] };
        // One group record is written and still at its earlier path: that is what an interruption leaves, so the run completes it.
        const inFlight = { 'not restored': ['migrated', 'RESTORE_INCOMPLETE'], 'restored in part': ['migrated', 'RESTORE_INCOMPLETE'], 'restored whole': ['migrated', 'abandoned'] };
        // Earlier group records are back among those the migration moved: put back from outside. Once nothing it wrote remains, the project is simply an earlier one again.
        const moved = { 'not restored': ['migrated', 'RESTORE_INCOMPLETE'], 'restored in part': ['RESTORED_FROM_OUTSIDE', 'RESTORE_INCOMPLETE'], 'restored whole': ['migrated', 'abandoned'] };
        // Every group record is recorded as moved and the declaration as changed: back again, both contradict the progress record.
        const finished = { 'not restored': ['migrated', 'RESTORE_INCOMPLETE'], 'restored in part': ['RESTORED_FROM_OUTSIDE', 'RESTORE_INCOMPLETE'], 'restored whole': ['RESTORED_FROM_OUTSIDE', 'abandoned'] };
        const expected = { 'before any record changed': untouched, 'part-way through rewriting the records that are not groups': rewritten,
            'after a group record was written and before its earlier record was removed': inFlight, 'when a group record could not be removed from its earlier location': inFlight,
            'part-way through moving the group records': moved, 'after the declaration was rewritten': finished };
        assert.deepEqual(Object.keys(expected), STOPPED.map(([name]) => name));
        for (const [state, stop] of STOPPED) for (const [level, outcomes] of Object.entries(expected[state])) for (const [index, options] of [{}, { abandon: true }].entries()) {
            const cell = `${state}, ${level}, ${index ? 'abandon request' : 'no abandon request'}`;
            reset(); assert.deepEqual(f.storedState(), earlier, cell);
            const stopped = await stop(f);
            assert.equal(stopped.status, 'interrupted', `${cell}: ${JSON.stringify(stopped)}`); assert.ok(exists(f, JOURNAL), cell);
            assert.equal(stopped.abandon.at(-1), ABANDON.request, cell); assert.ok(!/run the migration again: it/.test(stopped.reason), cell);
            if (level !== 'not restored') restoreFromGit(f, level === 'restored whole');
            const before = f.storedState();
            const result = await f.migrate(options);
            assert.equal(result.status === 'interrupted' ? result.code : result.status, outcomes[index], `${cell}: ${JSON.stringify(result)}`);
            if (result.status === 'abandoned') {
                // Only the progress record went: the project is the earlier one, byte for byte, with its original numbers.
                assert.deepEqual(f.storedState(), earlier, cell); assert.ok(!exists(f, JOURNAL), cell);
                assert.deepEqual(result.progress, recorded(project)); assert.deepEqual(numbers(f.progress()), recorded(project)); assert.equal(f.progress().vocabulary.project.code, 'MIGRATION_REQUIRED');
            } else if (result.status === 'migrated') {
                assert.equal(index, 0, 'An abandon request never migrates'); assert.ok(!exists(f, JOURNAL), cell);
                assert.deepEqual(result.progress, recorded(project)); assert.equal(f.progress().vocabulary.project.state, 'current');
                for (const [id, held] of Object.entries(STRUCTURE_HELD)) assert.deepEqual(scopeOf(f, id), held, `${cell}: ${id}`);
            } else {
                assert.deepEqual(f.storedState(), before, `${cell}: nothing changed`); assert.ok(exists(f, JOURNAL), cell);
                assert.equal(result.abandon.at(-1), ABANDON.request, cell); assert.ok(!JSON.stringify(result).includes(f.root), cell);
                assert.equal(f.progress().coverage, 'unavailable', cell);
            }
        }
    }),
    test('TC-TPT-249', 'an abandon request for a project whose records are back but whose declaration is not, or the reverse, is refused, names exactly what is not back and changes nothing', async f => {
        const project = await earlierProject(f, { commit: true });
        const refusedWith = async pending => {
            const state = f.storedState();
            const result = await f.migrate({ abandon: true });
            assert.deepEqual([result.status, result.code, result.notRestored], ['interrupted', 'RESTORE_INCOMPLETE', pending], JSON.stringify(result));
            assert.deepEqual(f.storedState(), state); assert.ok(exists(f, JOURNAL));
        };
        // The records are back and nothing the migration wrote remains, but the declaration still says current.
        assert.equal((await stopAfter(f, 'before-verify')).status, 'interrupted');
        const declaredCurrent = text(f, 'docs/project-config.json');
        git(f, ['checkout', '--', 'work']); git(f, ['clean', '-f', '-d', '--quiet', '--', 'work/initiatives']);
        await refusedWith(['docs/project-config.json still declares the current vocabulary']);
        git(f, ['checkout', '--', 'docs']);
        assert.equal((await f.migrate({ abandon: true })).status, 'abandoned');
        // The reverse: the declaration is back, the records are where the migration put them.
        assert.equal((await stopAfter(f, 'before-verify')).status, 'interrupted');
        git(f, ['checkout', '--', 'docs']);
        await refusedWith(['work/projects is not back']);
        // Without the request this project is not migrated further either, and is told how to complete after all.
        const state = f.storedState();
        const undecided = await f.migrate();
        assert.deepEqual([undecided.status, undecided.code, undecided.back], ['interrupted', 'RESTORED_FROM_OUTSIDE', ['the earlier declaration in docs/project-config.json']], JSON.stringify(undecided));
        assert.deepEqual(undecided.complete, ['put the declaration this migration wrote back in docs/project-config.json: set taskTracking.schemaVersion to 3, restate taskTracking.groupLabels.program as taskTracking.typeLabels.initiative', 'run migrate --root <checkout> again']);
        assert.deepEqual(f.storedState(), state);
        // Doing so completes the migration.
        f.write('docs/project-config.json', declaredCurrent);
        const completed = await f.migrate();
        assert.deepEqual([completed.status, completed.resumed, completed.progress], ['migrated', true, recorded(project)], JSON.stringify(completed));
    }),
    test('TC-TPT-249', 'a run without an abandon request that finds an earlier group record back names how to complete the migration after all, and completes it once that is undone', async f => {
        const { project, migrated } = await migratable(f);
        const earlierRecord = text(f, 'work/projects/EPIC-E.md');
        assert.equal((await stopAfter(f, 'before-verify')).status, 'interrupted');
        // Someone, or a tool working from an older branch, writes the earlier record again while the migration is unfinished.
        f.write('work/projects/EPIC-E.md', earlierRecord);
        const state = f.storedState();
        const stopped = await f.migrate();
        assert.deepEqual([stopped.status, stopped.code, stopped.back], ['interrupted', 'RESTORED_FROM_OUTSIDE', ['work/projects/EPIC-E.md']], JSON.stringify(stopped));
        assert.deepEqual(stopped.complete, ['remove work/projects/EPIC-E.md, which the restore put back, after checking that each of those records is also kept, as migrated, at work/initiatives/EPIC-E.md', 'run migrate --root <checkout> again']);
        assert.match(stopped.reason, /To abandon this migration instead of completing it: \(1\) restore work and docs\/project-config\.json.*To complete the migration instead, undo that restore: \(1\) remove work\/projects\/EPIC-E\.md/);
        assert.deepEqual(f.storedState(), state); assert.equal(text(f, 'work/projects/EPIC-E.md'), earlierRecord, 'Nothing is removed for the person');
        fs.rmSync(path.join(f.root, 'work/projects'), { recursive: true });
        const completed = await f.migrate();
        assert.deepEqual([completed.status, completed.resumed, completed.progress], ['migrated', true, recorded(project)], JSON.stringify(completed));
        assert.deepEqual(f.storedState(), migrated);
    }),
    test('TC-TPT-249', 'an earlier location that held no record, which version control cannot bring back, does not keep a restored project from being abandoned', async f => {
        await earlierProject(f);
        // An earlier location that exists and holds nothing: Git tracks no empty folder.
        fs.mkdirSync(path.join(f.root, 'work/visions'));
        git(f, ['init']); git(f, ['add', '--', 'docs', 'work']); git(f, ['commit', '-m', 'Earlier project with an empty location']);
        const before = numbers(f.progress());
        const preview = await f.migrate({ dryRun: true });
        assert.deepEqual(preview.locations.removed, ['work/projects', 'work/visions'], JSON.stringify(preview));
        assert.equal((await stopAfter(f, 'before-verify')).status, 'interrupted');
        assert.ok(!exists(f, 'work/visions') && !exists(f, 'work/projects'));
        restoreFromGit(f, true);
        assert.ok(!exists(f, 'work/visions'), 'Version control did not bring the empty location back');
        const ended = await f.migrate({ abandon: true });
        assert.deepEqual([ended.status, ended.code, ended.progress], ['abandoned', 'MIGRATION_ABANDONED', before], JSON.stringify(ended));
        assert.ok(!exists(f, JOURNAL)); assert.deepEqual(numbers(f.progress()), before); assert.equal(f.progress().vocabulary.project.code, 'MIGRATION_REQUIRED');
        // Boundary: a location that held a group record is still waited for.
        assert.equal((await stopAfter(f, 'before-verify')).status, 'interrupted');
        restoreFromGit(f, true); fs.rmSync(path.join(f.root, 'work/projects'), { recursive: true });
        const waiting = await f.migrate({ abandon: true });
        assert.deepEqual([waiting.code, waiting.notRestored], ['RESTORE_INCOMPLETE', ['work/projects is not back']], JSON.stringify(waiting));
    }),
    test('TC-TPT-249', 'a progress record that cannot be read or was not written by this migration is never acted on: no repeated run and no abandon request is promised, and the way out is stated as done by hand', async f => {
        const project = await earlierProject(f, { commit: true });
        assert.equal((await stopAfter(f, 'before-verify')).status, 'interrupted');
        const written = text(f, JOURNAL);
        const byHand = ['if a migration was under way here, restore work and docs/project-config.json from version control or your backup, so that the project is whole in one vocabulary',
            'then set work/.vocabulary-migration.json aside by hand: move it out of work and keep it for inspection. The tracker does not check that restore and does not remove that file'];
        const reason = 'Migration progress record work/.vocabulary-migration.json is unreadable or was not written by this migration, so the tracker will not act on it: it neither completes nor abandons a migration from that file, and asking again gives this same answer. '
            + `The project stays unavailable while that file is in work. The way out is by hand: (1) ${byHand[0]}; (2) ${byHand[1]}`;
        const neverActedOn = async () => {
            const state = f.storedState();
            for (const options of [{}, { abandon: true }]) {
                const result = await f.migrate(options);
                assert.deepEqual([result.status, result.code, result.abandon], ['interrupted', 'INVALID_MIGRATION_RECORD', byHand], JSON.stringify(result));
                assert.equal(result.reason, reason);
                assert.deepEqual(f.storedState(), state, 'Neither request changes anything');
            }
        };
        // Cut short, empty, and written by something else.
        for (const foreign of [written.slice(0, 200), '{}', JSON.stringify({ ...JSON.parse(written), kind: 'another-tool' })]) { f.write(JOURNAL, foreign); await neverActedOn(); }
        // The same answer once the project is back whole: the file's contents are never trusted, not even to end the migration.
        restoreFromGit(f, true);
        await neverActedOn();
        // Set aside by hand, as stated: the project is an ordinary earlier project again.
        fs.renameSync(path.join(f.root, JOURNAL), path.join(f.root, 'set-aside-progress-record.json'));
        assert.deepEqual(numbers(f.progress()), recorded(project)); assert.equal(f.progress().vocabulary.project.code, 'MIGRATION_REQUIRED');
    }),
    test('TC-TPT-249', 'an abandon request cannot be previewed, and where no migration is unfinished it reports nothing to abandon and changes nothing', async f => {
        const project = await earlierProject(f);
        const nothing = async () => {
            const state = f.storedState();
            const result = await f.migrate({ abandon: true });
            assert.deepEqual([result.status, result.code], ['current', 'NOTHING_TO_ABANDON'], JSON.stringify(result));
            assert.equal(result.reason, 'Nothing to abandon: no migration is unfinished in this project (it holds no progress record work/.vocabulary-migration.json). Nothing was changed');
            assert.deepEqual(f.storedState(), state); assert.ok(!exists(f, JOURNAL));
        };
        const both = async () => {
            const state = f.storedState();
            const result = await f.migrate({ dryRun: true, abandon: true });
            assert.deepEqual([result.status, result.code], ['refused', 'INVALID_INPUT'], JSON.stringify(result));
            assert.match(result.reason, /^Choose one of a preview and an abandon request/); assert.deepEqual(f.storedState(), state);
        };
        // An earlier project that no migration has touched: the request neither migrates it nor reports it migrated.
        await nothing(); await both();
        assert.equal(f.progress().vocabulary.project.code, 'MIGRATION_REQUIRED'); assert.deepEqual(numbers(f.progress()), recorded(project));
        // An unfinished migration: asking for both at once is still refused and ends nothing.
        assert.equal((await stopAfter(f, 'journal-written')).status, 'interrupted');
        await both(); assert.ok(exists(f, JOURNAL));
        // A finished migration.
        assert.equal((await f.migrate()).status, 'migrated');
        await nothing(); await both(); assert.equal(f.progress().vocabulary.project.state, 'current');
    }),
    test('TC-TPT-246', 'a project in a sub-folder of a larger Git checkout has its uncommitted configuration and records named as the project itself names them', async f => {
        await earlierProject(f);
        // The project is the folder `nested` of the checkout; the checkout's own top holds nothing of the tracker.
        const nested = path.join(f.root, 'nested');
        fs.mkdirSync(nested);
        for (const top of ['work', 'docs']) fs.renameSync(path.join(f.root, top), path.join(nested, top));
        f.write('.gitignore', 'nested/work/initiatives/\n');
        git(f, ['init']); git(f, ['add', '--', '.gitignore', 'nested']); git(f, ['commit', '-m', 'Earlier project below the top of the checkout']);
        const clean = await migrate(nested, { dryRun: true });
        assert.equal(clean.status, 'preview', JSON.stringify(clean));
        assert.deepEqual([clean.versionControl.kind, clean.versionControl.clean, clean.versionControl.restorable, clean.versionControl.ignored], ['git', true, false, ['work/initiatives/IDEA-D.md']]);
        assert.match(clean.versionControl.note, /^Git ignores work\/initiatives\/IDEA-D\.md: /);
        const config = path.join(nested, 'docs/project-config.json');
        const committed = fs.readFileSync(config, 'utf8');
        fs.writeFileSync(config, `${committed}\n`);
        fs.writeFileSync(path.join(nested, 'work/unsaved.md'), 'never committed');
        for (const dryRun of [true, false]) {
            const result = await migrate(nested, { dryRun });
            assert.deepEqual([result.status, result.code], ['refused', 'RECORD_ROOT_NOT_CLEAN'], JSON.stringify(result));
            // Each is named for what it is, by its path in the project, not by its path from the top of the checkout.
            assert.equal(result.reason, 'Record root has uncommitted changes: work/unsaved.md; Project configuration has uncommitted changes: docs/project-config.json; commit or set them aside so version control can restore the earlier records and configuration, then retry');
            assert.deepEqual([...result.refusals[0].paths].sort(), ['docs/project-config.json', 'work/unsaved.md']);
            assert.ok(!JSON.stringify(result).includes('nested/'));
        }
        fs.writeFileSync(config, committed); fs.rmSync(path.join(nested, 'work/unsaved.md'));
        // What Git ignores there is named the same way when the run asks for a confirmed backup.
        const unconfirmed = await migrate(nested);
        assert.deepEqual([unconfirmed.status, unconfirmed.code, unconfirmed.refusals[0].paths], ['refused', 'NO_RESTORE_POINT', ['work/initiatives/IDEA-D.md']], JSON.stringify(unconfirmed));
        assert.ok(!JSON.stringify(unconfirmed).includes('nested/'));
        assert.equal((await migrate(nested, { backupConfirmed: true })).status, 'migrated');
    }),
    test('TC-TPT-249', 'a failed verification states the same way out as an interruption', async f => {
        const project = await earlierProject(f);
        const failed = await f.migrate({ checkpoint: name => { if (name === 'before-verify') fs.rmSync(path.join(f.root, 'work/tasks/PBI-2.md')); } });
        assert.deepEqual([failed.status, failed.code], ['failed', 'MIGRATION_VERIFICATION_FAILED'], JSON.stringify(failed));
        assert.deepEqual(failed.abandon, [ABANDON.restore, wrote('work/initiatives/EPIC-E.md'), ABANDON.request]);
        assert.match(failed.reason, /is kept and the project stays unavailable; correct the difference and run the migration again\. To abandon this migration instead of completing it: \(1\) restore work and docs\/project-config\.json/);
        assert.deepEqual(project.expected.total, failed.expected.total);
    }),
    test('TC-TPT-249', 'a file someone else put in the way is not named for removal by the way out of the migration', async f => {
        await earlierProject(f, { groups: [{ id: 'PRODUCT', kind: 'vision', purpose: 'area', members: [] }] });
        const stopped = await f.migrate({ checkpoint: name => { if (name === 'journal-written') f.write('work/unrelated/STRAY.md', 'made by someone else, just now'); if (name === 'members-rewritten') throw new Error('simulated interruption'); } });
        assert.equal(stopped.status, 'interrupted', JSON.stringify(stopped));
        // No group record has been written yet, so the migration made nothing: the way out is the restore and the progress record.
        assert.deepEqual(stopped.abandon, [ABANDON.restore, ABANDON.request]);
        assert.equal(text(f, 'work/unrelated/STRAY.md'), 'made by someone else, just now');
    }),
    test('TC-TPT-251', 'repeating or previewing a finished migration reports nothing to migrate and changes nothing, however it finished and whatever was saved since', async f => {
        const { project, restore, migrated } = await migratable(f, { groups: STRUCTURE });
        const repeat = async () => {
            const state = f.storedState();
            for (const dryRun of [true, false, false]) {
                const result = await f.migrate({ dryRun });
                assert.deepEqual([result.status, result.code], ['current', 'NOTHING_TO_MIGRATE'], JSON.stringify(result)); assert.match(result.reason, /^Nothing to migrate/);
                assert.deepEqual(f.storedState(), state); assert.ok(!exists(f, JOURNAL));
            }
            assert.equal(f.progress().vocabulary.project.state, 'current');
        };
        // Finished in one run.
        assert.equal((await f.migrate()).status, 'migrated'); assert.deepEqual(f.storedState(), migrated);
        await repeat(); assert.deepEqual(numbers(f.progress()), recorded(project));
        // Work saved since then is not touched by a repeat either.
        await f.create('TASK-since'); await f.saved('transition', 'TASK-since', { state: 'planned' });
        const since = text(f, 'work/tasks/TASK-since.md');
        await repeat(); assert.equal(text(f, 'work/tasks/TASK-since.md'), since); assert.equal(f.progress().metrics.total, project.expected.total + 1);
        // Finished by a repeated run after an interruption in the middle of the group records.
        restore();
        assert.equal((await stopAfter(f, 'group-written', 3)).status, 'interrupted');
        // Boundary: unfinished is not "already migrated" — the repeated run completes it.
        assert.equal((await f.migrate()).status, 'migrated'); assert.deepEqual(f.storedState(), migrated);
        await repeat(); assert.deepEqual(numbers(f.progress()), recorded(project));
    }),
    test('TC-TPT-251', 'a project created in the current vocabulary has nothing to migrate', async f => {
        await f.create('TASK-new'); await f.create('INITIATIVE-new', 'initiative'); await f.create('AREA-new', 'area');
        const stored = f.storedState();
        for (const options of [{ dryRun: true }, {}, { abandon: true }]) {
            const result = await f.migrate(options);
            assert.deepEqual([result.status, result.code], ['current', options.abandon ? 'NOTHING_TO_ABANDON' : 'NOTHING_TO_MIGRATE']); assert.deepEqual(f.storedState(), stored);
        }
        // A current project that received a file with no stamp in a location it does not read is told the file is flagged, not migrated.
        f.write('work/projects/OLD.md', '---\nid: OLD\ntitle: From an older branch\nintent: Flagged\nstatus: draft\n---\n');
        const flagged = await f.migrate();
        assert.equal(flagged.status, 'current'); assert.match(flagged.reason, /work\/projects are flagged and are not migrated/); assert.ok(exists(f, 'work/projects/OLD.md'));
    }),

    // The mapping, row by row. Each case reads the earlier project in the current terms, migrates it and reads it again.
    test('TC-TPT-248', 'a group becomes an area unless its purpose is a finite outcome, which becomes an initiative of type initiative kept in the initiatives location', async f => {
        await earlierProject(f, { groups: [...STRUCTURE, { id: 'LOOSE', members: [] }, { id: 'VISION-PROGRAM', kind: 'vision', purpose: 'program', members: [] }] });
        const { before, after } = await bothWays(f);
        const became = snapshot => Object.fromEntries(['PRODUCT', 'MODULE', 'FEATURE', 'FEATURE-NESTED', 'LOOSE', 'PLANNED', 'STARTED', 'EPIC-E', 'VISION-PROGRAM'].map(id => [id, [shown(snapshot, id).kind, shown(snapshot, id).type]]));
        // Either group kind with the finite-outcome purpose is an initiative; every other group, whatever its kind or purpose, an area.
        assert.deepEqual(became(before), { 'PRODUCT': ['area', null], 'MODULE': ['area', null], 'FEATURE': ['area', null], 'FEATURE-NESTED': ['area', null], 'LOOSE': ['area', null],
            'PLANNED': ['initiative', 'initiative'], 'STARTED': ['initiative', 'initiative'], 'EPIC-E': ['initiative', 'initiative'], 'VISION-PROGRAM': ['initiative', 'initiative'] });
        // Before, each record is shown where it is stored; afterwards a group record is kept under the location of its kind, with its file name.
        assert.deepEqual(['PRODUCT', 'FEATURE', 'PLANNED', 'VISION-PROGRAM'].map(id => shown(before, id).ownerPath), ['work/visions/PRODUCT.md', 'work/projects/FEATURE.md', 'work/projects/PLANNED.md', 'work/visions/VISION-PROGRAM.md']);
        assert.deepEqual(['PRODUCT', 'FEATURE', 'PLANNED', 'VISION-PROGRAM'].map(id => shown(after, id).ownerPath), ['work/areas/PRODUCT.md', 'work/areas/FEATURE.md', 'work/initiatives/PLANNED.md', 'work/initiatives/VISION-PROGRAM.md']);
        assert.deepEqual([exists(f, 'work/projects'), exists(f, 'work/visions')], [false, false]);
        // No word of the earlier vocabulary is stored once migrated.
        for (const record of f.records()) assert.equal(/"(memberItemIds|groupRole)"|"kind":"(project|vision)"/.test(record.text.slice(record.text.indexOf('tracking:'))), false, record.ownerPath);
    }),
    test('TC-TPT-248', 'a proposal becomes an initiative of type idea and stays where it is kept', async f => {
        const project = await earlierProject(f);
        // A proposal an earlier release had taken through its delivery states, and one with no tracking metadata.
        f.write('work/initiatives/IDEA-P.md', text(f, 'work/initiatives/IDEA-D.md').split('IDEA-D').join('IDEA-P').replace('status: "draft"', 'status: "planned"'));
        f.write('work/initiatives/LEGACY.md', HAND_UNTRACKED);
        const { before, after } = await bothWays(f);
        for (const snapshot of [before, after]) {
            assert.deepEqual(['IDEA-D', 'IDEA-P'].map(id => [shown(snapshot, id).kind, shown(snapshot, id).type, shown(snapshot, id).state, shown(snapshot, id).ownerPath]),
                [['initiative', 'idea', 'draft', 'work/initiatives/IDEA-D.md'], ['initiative', 'idea', 'approved', 'work/initiatives/IDEA-P.md']]);
            // Without tracking metadata it gains none, so no type; its state is still restated.
            assert.deepEqual([shown(snapshot, 'LEGACY').legacy, shown(snapshot, 'LEGACY').type, shown(snapshot, 'LEGACY').state], [true, null, 'approved']);
            // The link a task already had to its proposal is the link an initiative counts: one eligible task, accepted.
            assert.deepEqual([figure(snapshot, project.ids.intent).total, figure(snapshot, project.ids.intent).accepted], [1, 1]);
        }
        assert.equal(f.record('IDEA-D').tracking.type, 'idea'); assert.equal(f.record('LEGACY').tracking, null);
    }),
    test('TC-TPT-248', 'an area takes its level from its purpose: product for a top-level area group, module for one nested in another or for a domain, feature for a capability, none without a purpose', async f => {
        await earlierProject(f, { groups: [...STRUCTURE, { id: 'DOMAIN', purpose: 'domain', members: [] }, { id: 'LOOSE', members: [] },
            // Listed by a capability alone: no area group holds it, so it is a top-level area group and would be a product.
            { id: 'SECOND-PRODUCT', kind: 'vision', purpose: 'area', members: ['DOMAIN'] }] });
        const { before } = await bothWays(f);
        assert.deepEqual(Object.fromEntries(before.hierarchy.areas.map(area => [area.id, area.level])),
            { 'PRODUCT': 'product', 'SECOND-PRODUCT': 'product', 'MODULE': 'module', 'DOMAIN': 'module', 'FEATURE': 'feature', 'FEATURE-NESTED': 'feature', 'LOOSE': null });
        // A capability nested in a capability is a feature under a feature, and the hierarchy is the one the lists stated.
        assert.deepEqual(before.hierarchy.areas.find(area => area.id === 'FEATURE-NESTED').parentAreaIds, ['FEATURE', 'MODULE']);
        assert.deepEqual(before.hierarchy.areas.find(area => area.id === 'PRODUCT').childAreaIds, ['FEATURE', 'MODULE']);
        assert.deepEqual(f.record('LOOSE').tracking.level, null); assert.equal(f.record('MODULE').tracking.level, 'module');
    }),
    test('TC-TPT-248', 'a level that would put an area under a deeper one is left unset and reported, so no area breaks the ordering', async f => {
        // A capability lists an area group and a domain: each would be shallower than the feature that holds it.
        await earlierProject(f, { groups: [{ id: 'FEATURE', purpose: 'capability', members: ['INNER-AREA', 'INNER-DOMAIN', 'INNER-FEATURE'] },
            { id: 'INNER-AREA', kind: 'vision', purpose: 'area', members: [] }, { id: 'INNER-DOMAIN', purpose: 'domain', members: [] }, { id: 'INNER-FEATURE', purpose: 'capability', members: [] }] });
        const preview = await f.migrate({ dryRun: true });
        assert.deepEqual(preview.levelsUnset, [{ itemId: 'INNER-AREA', level: 'product', parentId: 'FEATURE', parentLevel: 'feature' }, { itemId: 'INNER-DOMAIN', level: 'module', parentId: 'FEATURE', parentLevel: 'feature' }]);
        const { before } = await bothWays(f);
        assert.deepEqual(Object.fromEntries(before.hierarchy.areas.map(area => [area.id, area.level])), { 'FEATURE': 'feature', 'INNER-FEATURE': 'feature', 'INNER-AREA': null, 'INNER-DOMAIN': null });
        // The areas still sit where they were listed; only the level is withheld, and the reader finds nothing wrong.
        assert.deepEqual(before.hierarchy.areas.find(area => area.id === 'FEATURE').childAreaIds, ['INNER-AREA', 'INNER-DOMAIN', 'INNER-FEATURE']);
        assert.equal(codes(f.progress()).includes('INVALID_AREA_LEVEL'), false);
    }),
    test('TC-TPT-248', 'a group listed by two groups sits under both, and its tasks count once in each and once in what holds both', async f => {
        await earlierProject(f, { groups: STRUCTURE });
        const { before, after } = await bothWays(f);
        for (const snapshot of [before, after]) {
            assert.deepEqual(linked(snapshot, 'FEATURE-NESTED'), ['area:FEATURE', 'area:MODULE']);
            // PBI-2 is held by the nested feature alone and reaches the product by two paths: counted once there.
            assert.deepEqual(['FEATURE-NESTED', 'FEATURE', 'MODULE', 'PRODUCT'].map(id => figure(snapshot, id).total), [1, 2, 1, 2]);
        }
    }),
    test('TC-TPT-248', 'an area is active unless it was canceled, an initiative takes the state its delivery state stood for, delivery work keeps its state, and history keeps the states it recorded', async f => {
        const states = ['draft', 'planned', 'ready', 'in_progress', 'blocked', 'verifying', 'done', 'canceled'];
        await earlierProject(f, { groups: states.flatMap(status => [{ id: `AREA-${status}`, purpose: 'capability', status, members: [] }, { id: `OUTCOME-${status}`, purpose: 'program', status, members: [] }]) });
        const { before, after } = await bothWays(f);
        for (const snapshot of [before, after]) {
            assert.deepEqual(Object.fromEntries(states.map(status => [status, shown(snapshot, `AREA-${status}`).state])),
                { draft: 'active', planned: 'active', ready: 'active', in_progress: 'active', blocked: 'active', verifying: 'active', done: 'active', canceled: 'canceled' });
            assert.deepEqual(Object.fromEntries(states.map(status => [status, shown(snapshot, `OUTCOME-${status}`).state])),
                { draft: 'draft', planned: 'approved', ready: 'committed', in_progress: 'committed', blocked: 'committed', verifying: 'committed', done: 'done', canceled: 'canceled' });
            assert.deepEqual(['PBI-1', 'PBI-2', 'TASK-K', 'STORY-S'].map(id => shown(snapshot, id).state), ['done', 'planned', 'draft', 'draft']);
            // What was recorded stays as recorded: the entry that took a group to its state still names that delivery state.
            assert.deepEqual(shown(snapshot, 'OUTCOME-verifying').history.map(entry => [entry.operation, entry.afterState]), [['create', 'draft'], ['group', 'draft'], ['transition', 'verifying']]);
            assert.deepEqual(shown(snapshot, 'AREA-blocked').history.at(-1).afterState, 'blocked');
        }
    }),
    test('TC-TPT-248', 'every record a group listed names that group itself afterwards, and no record keeps a list of members or a purpose', async f => {
        await earlierProject(f, { groups: STRUCTURE });
        const { before, after } = await bothWays(f);
        assert.deepEqual(stated(before), STRUCTURE_SHOWN);
        // Stored on the listed record, after the links it already had and in a fixed order; nothing is stored on the group.
        assert.deepEqual(f.record('PBI-1').tracking.links, [{ relation: 'initiative', itemId: 'IDEA-D' }, { relation: 'area', itemId: 'FEATURE' }, { relation: 'initiative', itemId: 'EPIC-E' }, { relation: 'initiative', itemId: 'PLANNED' }]);
        for (const record of f.records()) assert.deepEqual([record.tracking.memberItemIds, record.tracking.groupRole], [undefined, undefined], record.id);
        assert.deepEqual(after.hierarchy.untaggedTaskIds, []);
    }),
    test('TC-TPT-248', 'a listing between a group that becomes an area and one that becomes an initiative is not kept: everything beneath the listed group gains the direct link, and the listing is reported', async f => {
        await earlierProject(f, { groups: [
            // A finite outcome lists a capability that holds a task, a subtask and a nested capability with another task.
            { id: 'OUTCOME', purpose: 'program', members: ['FEATURE'] }, { id: 'FEATURE', purpose: 'capability', members: ['PBI-1', 'TASK-K', 'DEEPER'] }, { id: 'DEEPER', purpose: 'capability', members: ['PBI-2'] },
            // The reverse: a capability lists a finite outcome that holds a story and a proposal.
            { id: 'HOLDER', purpose: 'capability', members: ['INNER-OUTCOME'] }, { id: 'INNER-OUTCOME', purpose: 'program', members: ['STORY-S', 'IDEA-D'] }] });
        const preview = await f.migrate({ dryRun: true });
        assert.deepEqual(preview.crossings, [{ groupId: 'HOLDER', listedId: 'INNER-OUTCOME', relation: 'area', taggedIds: ['IDEA-D', 'STORY-S'] },
            { groupId: 'OUTCOME', listedId: 'FEATURE', relation: 'initiative', taggedIds: ['PBI-1', 'PBI-2', 'TASK-K'] }]);
        const { before, after } = await bothWays(f);
        for (const snapshot of [before, after]) {
            // Neither group names the other: an area is never linked to an initiative, nor the initiative placed by that listing.
            assert.deepEqual([linked(snapshot, 'FEATURE'), linked(snapshot, 'OUTCOME'), linked(snapshot, 'INNER-OUTCOME'), linked(snapshot, 'HOLDER')], [[], [], [], []]);
            assert.deepEqual(['PBI-1', 'PBI-2', 'TASK-K'].map(id => linked(snapshot, id).includes('initiative:OUTCOME')), [true, true, true]);
            assert.deepEqual(['STORY-S', 'IDEA-D'].map(id => linked(snapshot, id).filter(tag => tag.endsWith('HOLDER') || tag.endsWith('INNER-OUTCOME'))), [['area:HOLDER', 'initiative:INNER-OUTCOME'], ['area:HOLDER', 'initiative:INNER-OUTCOME']]);
            // The finite outcome counts both tasks beneath the capability it listed, as it did while it listed it.
            assert.deepEqual([figure(snapshot, 'OUTCOME').total, figure(snapshot, 'FEATURE').total, figure(snapshot, 'HOLDER').total], [2, 2, 0]);
        }
        assert.deepEqual(scopeOf(f, 'OUTCOME'), ['PBI-1', 'PBI-2']);
    }),
    test('TC-TPT-248', 'a finite outcome that listed another keeps that link, and the work beneath the listed one is linked to it directly so it still counts what it counted', async f => {
        await earlierProject(f, { groups: [{ id: 'LARGER', purpose: 'program', members: ['SMALLER'] }, { id: 'SMALLER', purpose: 'program', members: ['PBI-2'] }] });
        const preview = await f.migrate({ dryRun: true });
        assert.deepEqual([preview.crossings, preview.nested], [[], [{ groupId: 'LARGER', listedId: 'SMALLER', relation: 'initiative', taggedIds: ['PBI-2'] }]]);
        const { before, after } = await bothWays(f);
        for (const snapshot of [before, after]) {
            assert.deepEqual(linked(snapshot, 'SMALLER'), ['initiative:LARGER']);
            assert.deepEqual(linked(snapshot, 'PBI-2'), ['initiative:EPIC-E', 'initiative:LARGER', 'initiative:SMALLER']);
            // An initiative counts only what links to it directly: without the direct link the larger one would count nothing.
            assert.deepEqual([figure(snapshot, 'LARGER').total, figure(snapshot, 'SMALLER').total], [1, 1]);
        }
    }),
    test('TC-TPT-248', 'the project and every former group show the same figures before and after migration, each the tasks its list held', async f => {
        const project = await earlierProject(f, { groups: STRUCTURE });
        // A canceled task and a retired one, listed like the others: held by the group, counted nowhere.
        f.write('work/tasks/CANCELED.md', text(f, 'work/tasks/PBI-2.md').split('PBI-2').join('CANCELED').replace('status: "planned"', 'status: "canceled"'));
        f.write('work/projects/FEATURE.md', text(f, 'work/projects/FEATURE.md').replace('"memberItemIds":["PBI-1"', '"memberItemIds":["CANCELED","PBI-1"'));
        const { before, after, result } = await bothWays(f);
        for (const snapshot of [before, after]) {
            assert.deepEqual(numbers(snapshot), recorded(project)); assert.equal(snapshot.metrics.canceled, 1);
            assert.deepEqual(Object.fromEntries(Object.keys(STRUCTURE_HELD).map(id => [id, figure(snapshot, id).total])), Object.fromEntries(Object.entries(STRUCTURE_HELD).map(([id, held]) => [id, held.length])));
            assert.deepEqual([figure(snapshot, 'FEATURE').canceled, figure(snapshot, 'PRODUCT').accepted, figure(snapshot, 'STARTED').percentage], [1, 1, null]);
        }
        // The identities, not only the counts: each former group read by itself holds exactly the tasks its list held.
        for (const [id, held] of Object.entries(STRUCTURE_HELD)) assert.deepEqual(scopeOf(f, id), held, id);
        assert.deepEqual(result.recount, { conserved: true, groups: 7 });
    }),
    test('TC-TPT-248', 'what the migration stores is exactly what the earlier project read as: kind, state and every tracker-owned value of every record, with only the paths of moved records differing', async f => {
        await earlierProject(f, { groups: STRUCTURE });
        f.write('work/projects/HAND-G.md', HAND_GROUP);
        const read = Object.fromEntries(f.records().map(record => [record.id, { kind: record.kind, status: record.data.status, tracking: record.tracking, bytes: record.contentHash }]));
        const stored = f.storedState();
        // The read is of the stored bytes and writes nothing; a record read this way is never a base for a save.
        assert.deepEqual(f.storedState(), stored);
        assert.throws(() => store.patchRecord(f.record('PBI-2'), { status: 'ready' }, {}), error => error.code === 'MIGRATION_REQUIRED');
        assert.equal((await f.migrate()).status, 'migrated');
        const movedTo = Object.fromEntries([...Object.values(GROUP_PATHS), ['work/projects/HAND-G.md', 'work/areas/HAND-G.md']]);
        const relocate = value => JSON.parse(JSON.stringify(value), (key, entry) => (['path', 'ownerPath'].includes(key) && typeof entry === 'string' ? movedTo[entry.replace(/\\/g, '/')] ?? entry : entry));
        for (const record of f.records()) {
            assert.deepEqual([record.kind, record.data.status], [read[record.id].kind, read[record.id].status], record.id);
            assert.deepEqual(record.tracking, relocate(read[record.id].tracking), record.id);
        }
    }),
    test('TC-TPT-248', 'migration creates and deletes no record and adds no history entry, revision or receipt: the same identities, each with the history it had', async f => {
        await earlierProject(f, { groups: STRUCTURE });
        f.write('work/tasks/NOTE.md', HAND_UNCHANGED);
        const kept = () => Object.fromEntries(f.records().map(record => [record.id, [record.revision, JSON.stringify(record.tracking?.history ?? null), (record.tracking?.receipts || []).map(receipt => [receipt.operationId, receipt.digest, receipt.afterRevision]),
            JSON.stringify([record.tracking?.criteria, record.tracking?.proofs, record.tracking?.acceptanceHistory, record.tracking?.assigneeId, record.tracking?.context] ?? null), record.data.title, record.data.intent, record.body]]));
        const before = kept();
        const files = () => f.storedState().filter(([relative, value]) => relative.startsWith('work/') && value !== 'directory').length;
        const count = files();
        const result = await f.migrate();
        assert.equal(result.status, 'migrated', JSON.stringify(result));
        assert.deepEqual(kept(), before);
        assert.deepEqual([files(), result.records.total, f.records().length], [count, 13, 13]);
        // The project itself stands for the default application: no record is made for it, and work without an area belongs to it.
        assert.deepEqual(f.progress().hierarchy.areas.map(area => area.level).includes('application'), false);
        assert.deepEqual(f.progress().hierarchy.untaggedTaskIds, ['NOTE']); assert.deepEqual(f.progress().scope.childAreaIds, ['PRODUCT']);
    }),
    technical("work-tracking/migration-member-index", 'the progress record holds the member index and the captured identities before the first change, and identities, paths, counts and hashes only', async f => {
        const project = await earlierProject(f, { groups: STRUCTURE });
        fs.appendFileSync(path.join(f.root, 'work/tasks/PBI-1.md'), 'A private remark in an authored body.\n');
        const earlier = f.storedState();
        let written;
        await f.migrate({ checkpoint: name => {
            if (name !== 'journal-written') return;
            // Written before anything else: every record and the declaration are still exactly as they were.
            assert.deepEqual(f.storedState().filter(([relative]) => relative !== JOURNAL), earlier);
            written = text(f, JOURNAL); throw new Error('simulated interruption');
        } });
        const value = JSON.parse(written);
        assert.deepEqual(Object.keys(value).sort(), ['backupConfirmed', 'capture', 'from', 'index', 'kind', 'schemaVersion', 'startedAt', 'steps', 'to']);
        // This project sits outside version control: the migration began on a confirmed backup, and says so in one word.
        assert.equal(value.backupConfirmed, true);
        assert.deepEqual([value.schemaVersion, value.kind, value.from, value.to], [1, 'vocabulary-migration', 2, 3]);
        assert.deepEqual(value.steps, STEPS.map(id => ({ id, status: 'pending' }))); assert.deepEqual(STEPS, ['members', 'groups', 'locations', 'config', 'verify']);
        // The member index: every group with its kind, its purpose, its present and future path and the identities it lists.
        assert.deepEqual(value.index.groups.map(group => Object.keys(group)), Array(7).fill(['id', 'kind', 'purpose', 'from', 'to', 'members']));
        assert.deepEqual(value.index.groups.map(group => [group.id, group.kind, group.purpose, group.from, group.to, group.members]),
            [['EPIC-E', 'project', 'program', ...GROUP_PATHS['EPIC-E'], ['PBI-1', 'PBI-2']], ...STRUCTURE.map(group => [group.id, group.kind || 'project', group.purpose, ...GROUP_PATHS[group.id], group.members])].sort((a, b) => (a[0] < b[0] ? -1 : 1)));
        // The capture: the project's progress as identities and counts, and a count and a mark per former group.
        assert.deepEqual({ total: value.capture.total, accepted: value.capture.accepted, remaining: value.capture.remaining, eligibleIds: value.capture.eligibleIds }, recorded(project));
        assert.deepEqual(value.capture.acceptedIds, [project.ids.accepted]); assert.equal(value.capture.records, 12);
        assert.deepEqual(Object.keys(value.capture).sort(), ['accepted', 'acceptedIds', 'currentlyVerified', 'eligibleIds', 'groups', 'recordIdentity', 'records', 'remaining', 'standing', 'total']);
        assert.deepEqual(value.capture.groups.map(group => [group.id, group.eligible]), Object.entries(STRUCTURE_HELD).map(([id, held]) => [id, held.length]).sort((a, b) => (a[0] < b[0] ? -1 : 1)));
        assert.ok(value.capture.groups.every(group => /^[a-f0-9]{64}$/.test(group.identity) && Object.keys(group).join() === 'id,eligible,identity'));
        assert.deepEqual(Object.keys(value.capture.standing).sort(), ['ready', 'unresolved', 'verified']);
        // Never what a person wrote: no title, intent, body, reason, acceptance text or absolute path.
        assert.ok(!written.includes('Prerequisite') && !written.includes('unresolved or not'), 'No reason text is kept');
        for (const content of ['Export selected rows', 'Let an operator export', 'private remark', 'Observed criteria are accepted', 'Export contains exactly', f.root]) assert.ok(!written.includes(content), content);
    }),
    technical("work-tracking/migration-order", 'records that are not groups are rewritten in place first, group records are written and moved one file at a time afterwards, then the emptied locations go, then the declaration, then verification, and the progress record last', async f => {
        await earlierProject(f, { groups: STRUCTURE });
        const stamps = () => Object.fromEntries(store.inspectStoredRecords(f.context(), { version: 2 }).records.map(record => [record.id, record.storedVersion]));
        const members = ['IDEA-D', 'PBI-1', 'PBI-2', 'STORY-S', 'TASK-K'];
        const reached = [];
        const result = await f.migrate({ checkpoint: (name, detail) => {
            reached.push(name);
            const declared = JSON.parse(text(f, 'docs/project-config.json')).taskTracking.schemaVersion;
            if (name === 'members-rewritten') {
                // Every record that is not a group is stamped current while every group record is still whole where it was.
                assert.deepEqual(members.map(id => stamps()[id]), Array(5).fill(3));
                assert.deepEqual(Object.values(GROUP_PATHS).map(([from, to]) => [exists(f, from), exists(f, to)]), Array(7).fill([true, false]));
                assert.ok(text(f, 'work/projects/EPIC-E.md').includes('"memberItemIds":["PBI-1","PBI-2"]')); assert.equal(declared, 2);
            }
            if (name === 'group-written' || name === 'group-moved') {
                // One file at a time, in identity order: those before are moved, this one is written and then removed, those after untouched.
                const order = Object.keys(GROUP_PATHS);
                const state = order.map(id => `${exists(f, GROUP_PATHS[id][0]) ? 'earlier' : ''}${exists(f, GROUP_PATHS[id][1]) ? 'current' : ''}`);
                assert.deepEqual(state, order.map((id, index) => (index < detail.count - 1 ? 'current' : index === detail.count - 1 ? (name === 'group-written' ? 'earliercurrent' : 'current') : 'earlier')), `${name} ${detail.count}`);
                assert.equal(declared, 2);
            }
            if (name === 'groups-moved') assert.deepEqual([exists(f, 'work/projects'), exists(f, 'work/visions')], [true, true], 'The emptied locations are removed in their own step');
            if (name === 'locations-removed') assert.deepEqual([exists(f, 'work/projects'), exists(f, 'work/visions'), declared], [false, false, 2]);
            if (name === 'config-written') assert.equal(declared, 3);
            if (name === 'verified') assert.ok(exists(f, JOURNAL), 'The progress record is removed only after verification');
        } });
        assert.equal(result.status, 'migrated', JSON.stringify(result)); assert.ok(!exists(f, JOURNAL));
        const first = name => reached.indexOf(name); const last = name => reached.lastIndexOf(name);
        assert.ok(first('journal-written') === 0 && last('member-rewritten') < first('members-rewritten') && first('members-rewritten') < first('group-written')
            && last('group-moved') < first('groups-moved') && first('groups-moved') < first('locations-removed') && first('locations-removed') < first('config-written')
            && first('config-written') < first('before-verify') && first('before-verify') < first('verified'), reached.join(' '));
        assert.deepEqual(result.steps, STEPS.map(id => ({ id, status: 'done' })));
    }),
    test('TC-TPT-249', 'a repeated run completes from the recorded member index: a group whose listing group was already rewritten still gains its link', async f => {
        const { restore, migrated } = await migratable(f, { groups: STRUCTURE });
        // FEATURE lists FEATURE-NESTED and is moved before it. Stopped in between, FEATURE holds no list any more.
        assert.equal((await stopAfter(f, 'group-moved', 2)).status, 'interrupted');
        assert.deepEqual([exists(f, 'work/areas/FEATURE.md'), exists(f, 'work/projects/FEATURE.md'), exists(f, 'work/projects/FEATURE-NESTED.md')], [true, false, true]);
        assert.equal(text(f, 'work/areas/FEATURE.md').includes('memberItemIds'), false);
        const index = journal(f).index;
        assert.deepEqual(index.groups.find(group => group.id === 'FEATURE').members, ['PBI-1', 'TASK-K', 'FEATURE-NESTED', 'IDEA-D']);
        const resumed = await f.migrate();
        assert.deepEqual([resumed.status, resumed.resumed], ['migrated', true], JSON.stringify(resumed));
        assert.deepEqual(f.record('FEATURE-NESTED').tracking.links.filter(entry => entry.relation === 'area'), [{ relation: 'area', itemId: 'FEATURE' }, { relation: 'area', itemId: 'MODULE' }]);
        assert.deepEqual(f.storedState(), migrated);
        // The same holds for a record that is not a group and was put back from outside after its group had moved: it is rewritten again from the index.
        restore();
        assert.equal((await stopAfter(f, 'group-moved', 2)).status, 'interrupted');
        const earlierTask = fs.readFileSync(path.join(f.root, 'kept/work/tasks/PBI-1.md'));
        fs.writeFileSync(path.join(f.root, 'work/tasks/PBI-1.md'), earlierTask);
        assert.equal((await f.migrate()).status, 'migrated'); assert.deepEqual(f.storedState(), migrated);
    }),
    test('TC-TPT-249', 'a recount that finds a former group holding other tasks than its list held fails the migration, keeps the progress record and leaves the project unavailable', async f => {
        const project = await earlierProject(f, { groups: STRUCTURE });
        let rewritten;
        const result = await f.migrate({ checkpoint: name => {
            if (name !== 'before-verify') return;
            // A wrong transfer the project totals cannot see: one task loses the link to its nested feature. Every task is still there.
            rewritten = text(f, 'work/tasks/PBI-2.md');
            f.write('work/tasks/PBI-2.md', rewritten.replace('{"relation":"area","itemId":"FEATURE-NESTED"},', ''));
        } });
        assert.deepEqual([result.status, result.code, result.differing], ['failed', 'MIGRATION_VERIFICATION_FAILED', ['groups']], JSON.stringify(result));
        // Everything that held the task through that feature differs; the finite outcomes, which name it directly, do not.
        assert.deepEqual(result.groups.map(group => [group.groupId, group.expected, group.actual]), [['FEATURE', 2, 1], ['FEATURE-NESTED', 1, 0], ['MODULE', 1, 0], ['PRODUCT', 2, 1]]);
        assert.match(result.reason, /^Migration verification failed: the eligible tasks of FEATURE, FEATURE-NESTED, MODULE, PRODUCT differ from what each group's member list held before the first change\. The progress record work\/\.vocabulary-migration\.json is kept and the project stays unavailable/);
        assert.ok(exists(f, JOURNAL)); await assertUnavailable(f);
        // Asking again gives the same answer; putting the link back lets the same migration finish.
        assert.equal((await f.migrate()).status, 'failed'); assert.ok(exists(f, JOURNAL));
        f.write('work/tasks/PBI-2.md', rewritten);
        const repeated = await f.migrate();
        assert.deepEqual([repeated.status, repeated.resumed, repeated.progress], ['migrated', true, recorded(project)], JSON.stringify(repeated));
        for (const [id, held] of Object.entries(STRUCTURE_HELD)) assert.deepEqual(scopeOf(f, id), held, id);
    }),
    test('TC-TPT-246', 'a record that already links to a finite-outcome group without being listed by it would join what that group counts: refused before any change, naming the group and the task', async f => {
        await earlierProject(f, { groups: [{ id: 'OUTCOME', purpose: 'program', members: ['PBI-1'] }] });
        const task = text(f, 'work/tasks/PBI-2.md');
        f.write('work/tasks/PBI-2.md', task.replace('"links":[]', '"links":[{"relation":"initiative","itemId":"OUTCOME"}]'));
        assert.notEqual(text(f, 'work/tasks/PBI-2.md'), task);
        await refusedBeforeChange(f, 'SCOPE_NOT_CONSERVED', /^Migration would not keep what the project holds: the eligible tasks of OUTCOME \(would gain PBI-2\) would differ from what its member list holds\. .*list it in that group or remove the link in the earlier records, then retry; nothing was changed$/);
        const refusal = (await f.migrate()).refusals[0];
        assert.deepEqual(refusal.groups, [{ groupId: 'OUTCOME', expected: 1, actual: 2, missing: [], extra: ['PBI-2'] }]);
        // Listed as well, the link is simply the one the mapping would add: nothing differs and the migration runs.
        f.write('work/projects/OUTCOME.md', text(f, 'work/projects/OUTCOME.md').replace('"memberItemIds":["PBI-1"]', '"memberItemIds":["PBI-1","PBI-2"]'));
        assert.equal((await f.migrate()).status, 'migrated');
        assert.deepEqual(f.record('PBI-2').tracking.links.filter(entry => entry.itemId === 'OUTCOME'), [{ relation: 'initiative', itemId: 'OUTCOME' }]);
    }),
    test('TC-TPT-246', 'a group that lists an identity no record has is refused before any change, naming the group and the identity', async f => {
        await earlierProject(f, { groups: [{ id: 'FEATURE', purpose: 'capability', members: ['PBI-1', 'GONE-1'] }] });
        await refusedBeforeChange(f, 'MEMBER_NOT_FOUND', /^Listed identity has no record: GONE-1 \(listed by FEATURE\); restore the record or take the identity out of that list, then retry$/);
        assert.deepEqual((await f.migrate()).refusals[0].members, [{ groupId: 'FEATURE', memberId: 'GONE-1' }]);
        // The read says the same of the earlier project, so its figures are not presented as complete.
        const snapshot = f.progress();
        assert.equal(snapshot.coverage, 'partial'); assert.deepEqual(snapshot.diagnostics.filter(finding => finding.code === 'MEMBER_NOT_FOUND'), [{ itemId: 'FEATURE', code: 'MEMBER_NOT_FOUND', reason: 'Listed identity GONE-1 has no record' }]);
        f.write('work/tasks/GONE-1.md', text(f, 'work/tasks/PBI-2.md').split('PBI-2').join('GONE-1'));
        assert.equal((await f.migrate()).status, 'migrated');
    }),
    test('TC-TPT-246', 'a listed record without tracking metadata cannot carry a link and migration invents none: refused before any change, naming the record', async f => {
        await earlierProject(f, { groups: [{ id: 'FEATURE', purpose: 'capability', members: ['PBI-1', 'NOTE'] }] });
        f.write('work/tasks/NOTE.md', HAND_UNCHANGED);
        await refusedBeforeChange(f, 'MEMBER_WITHOUT_TRACKING', /^Listed record cannot carry a link: work\/tasks\/NOTE\.md \(listed under FEATURE\) has no tracking metadata, and a migration invents none; adopt the record with the tracker version that wrote this project or take it out of that list, then retry$/);
        // Read in the current terms the record is still shown under the group that listed it, held in memory only.
        const snapshot = f.progress({ figures: true });
        assert.equal(snapshot.coverage, 'complete'); assert.deepEqual(linked(snapshot, 'NOTE'), ['area:FEATURE']); assert.equal(figure(snapshot, 'FEATURE').total, 2);
        assert.equal(text(f, 'work/tasks/NOTE.md'), HAND_UNCHANGED);
        // Taken out of the list, the same project migrates and the record is left exactly as written.
        f.write('work/projects/FEATURE.md', text(f, 'work/projects/FEATURE.md').replace('"memberItemIds":["PBI-1","NOTE"]', '"memberItemIds":["PBI-1"]'));
        assert.equal((await f.migrate()).status, 'migrated'); assert.equal(text(f, 'work/tasks/NOTE.md'), HAND_UNCHANGED);
    }),
    test('TC-TPT-246', 'two records that would be kept at one path, or one that would land on a file already there, are refused before any change with both named, also when the names differ only in letter case', async f => {
        await earlierProject(f, { groups: [{ id: 'SHARED', kind: 'vision', purpose: 'area', members: [] }] });
        const restore = keep(f);
        // A project group and a vision group under one file name both become areas.
        f.write('work/projects/SHARED.md', text(f, 'work/visions/SHARED.md').split('SHARED').join('SHARED-2').replace('"kind":"vision"', '"kind":"project"').split('work/visions/SHARED-2.md').join('work/projects/SHARED.md').replace(/"kind":"vision"/g, '"kind":"project"'));
        await refusedBeforeChange(f, 'PATH_COLLISION', /^Two records would be kept at one path: work\/projects\/SHARED\.md and work\/visions\/SHARED\.md would both be kept at work\/areas\/SHARED\.md; rename one of them, then retry$/);
        restore();
        // The same two under names that differ only in letter case: one file on many disks, so refused on every disk.
        f.write('work/projects/shared.md', text(f, 'work/visions/SHARED.md').split('SHARED').join('SHARED-2').replace(/"kind":"vision"/g, '"kind":"project"').split('work/visions/SHARED-2.md').join('work/projects/shared.md'));
        await refusedBeforeChange(f, 'PATH_COLLISION', /would both be kept at work\/areas\/(shared|SHARED)\.md/);
        restore();
        // A finite-outcome group whose file name a proposal already has in the location it moves to, in another letter case.
        f.write('work/initiatives/epic-e.md', text(f, 'work/initiatives/IDEA-D.md').split('IDEA-D').join('OTHER-E'));
        await refusedBeforeChange(f, 'PATH_COLLISION', /^Two records would be kept at one path: work\/projects\/EPIC-E\.md would be kept at work\/initiatives\/EPIC-E\.md, where work\/initiatives\/epic-e\.md already is; rename one of them, then retry$/);
        restore();
        assert.equal((await f.migrate()).status, 'migrated');
    }),
    test('TC-TPT-246', 'a project that reads as current but holds records stamped for the earlier vocabulary is refused and told how to say what it stores', async f => {
        // An earlier project with no group record and no declaration: nothing but the stamps shows what it stores.
        const declaration = { ...f.config.taskTracking, schemaVersion: 2 };
        await earlierProject(f, { declared: false });
        fs.rmSync(path.join(f.root, 'work/projects'), { recursive: true });
        assert.equal(f.progress().vocabulary.project.state, 'current');
        const stored = f.storedState();
        for (const dryRun of [true, false]) {
            const result = await f.migrate({ dryRun });
            assert.deepEqual([result.status, result.code], ['refused', 'EARLIER_VOCABULARY_RECORD'], JSON.stringify(result));
            assert.match(result.reason, /^This project reads as the current vocabulary but holds records stamped for the earlier one: work\/initiatives\/IDEA-D\.md, .*If the project still stores the earlier vocabulary, declare taskTracking\.schemaVersion 2 in docs\/project-config\.json, then preview and run the migration; .*Nothing was changed$/);
            assert.deepEqual(f.storedState(), stored); assert.ok(!exists(f, JOURNAL));
        }
        // Declared as it says, the same project migrates.
        f.config.taskTracking = declaration; f.saveConfig();
        assert.equal((await f.migrate()).status, 'migrated'); assert.equal(f.progress().coverage, 'complete');
    }),
    test('TC-TPT-246', 'an identity stored twice, or a file that is not a record in a location the migration removes, is refused before any change by name', async f => {
        await earlierProject(f);
        const restore = keep(f);
        f.write('work/tasks/PBI-2-copy.md', text(f, 'work/tasks/PBI-2.md'));
        await refusedBeforeChange(f, 'INCOMPLETE_SCOPE', /^Inspection incomplete: PBI-2 is stored at work\/tasks\/PBI-2-copy\.md and work\/tasks\/PBI-2\.md; keep one record per identity, then retry$/);
        restore();
        f.write('work/projects/notes.txt', 'kept beside the group records');
        await refusedBeforeChange(f, 'INCOMPLETE_SCOPE', /^Inspection incomplete: work\/projects\/notes\.txt is not a record, and a migration moves only records out of a location it then removes; move or remove it, then retry$/);
        restore();
        // The same file appearing after the check stops the migration at that location and is never removed with it.
        const stopped = await f.migrate({ checkpoint: name => { if (name === 'groups-moved') f.write('work/projects/notes.txt', 'written during the migration'); } });
        assert.deepEqual([stopped.status, stopped.code, stopped.step], ['interrupted', 'LOCATION_NOT_EMPTY', 'locations'], JSON.stringify(stopped));
        assert.equal(text(f, 'work/projects/notes.txt'), 'written during the migration');
        fs.rmSync(path.join(f.root, 'work/projects/notes.txt'));
        assert.equal((await f.migrate()).status, 'migrated');
    }),
    test('TC-TPT-248', 'a label declared for a group purpose becomes the label of the level or type that purpose became, and a label the current vocabulary has no place for is refused by name', async f => {
        await earlierProject(f, { groups: STRUCTURE });
        const restore = keep(f);
        const declare = labels => { f.config.taskTracking = { ...JSON.parse(text(f, 'docs/project-config.json')).taskTracking, ...labels }; f.saveConfig(); };
        declare({ groupLabels: { area: 'Suite', domain: 'Division', capability: 'Ability', program: 'Bet' }, typeLabels: { idea: 'Proposal' } });
        // Shown already while the project stores the earlier vocabulary.
        assert.deepEqual(f.progress().hierarchy.labels, { levels: { application: 'Application', product: 'Suite', module: 'Division', feature: 'Ability' }, types: { feedback: 'Feedback', idea: 'Proposal', initiative: 'Bet' } });
        const preview = await f.migrate({ dryRun: true });
        assert.deepEqual(preview.config.changes, [{ field: 'taskTracking.schemaVersion', from: 2, to: 3 }, { field: 'taskTracking.groupLabels.area', movedTo: 'taskTracking.levelLabels.product' },
            { field: 'taskTracking.groupLabels.domain', movedTo: 'taskTracking.levelLabels.module' }, { field: 'taskTracking.groupLabels.capability', movedTo: 'taskTracking.levelLabels.feature' },
            { field: 'taskTracking.groupLabels.program', movedTo: 'taskTracking.typeLabels.initiative' }]);
        assert.equal((await f.migrate()).status, 'migrated');
        const declared = JSON.parse(text(f, 'docs/project-config.json')).taskTracking;
        assert.deepEqual([declared.schemaVersion, declared.groupLabels, declared.levelLabels, declared.typeLabels], [3, undefined, { product: 'Suite', module: 'Division', feature: 'Ability' }, { initiative: 'Bet', idea: 'Proposal' }]);
        assert.deepEqual(f.progress().hierarchy.labels, { levels: { application: 'Application', product: 'Suite', module: 'Division', feature: 'Ability' }, types: { feedback: 'Feedback', idea: 'Proposal', initiative: 'Bet' } });
        // A label for a group kind names a kind that no longer exists; two labels for what becomes one level cannot both be meant.
        restore(); declare({ kindLabels: { project: 'Workstream' } });
        await refusedBeforeChange(f, 'CONFIG_NOT_REWRITABLE', /^taskTracking\.kindLabels\.project labels a kind the current vocabulary does not have; remove that label, then retry \(docs\/project-config\.json\)$/);
        restore(); declare({ groupLabels: { capability: 'Ability' }, levelLabels: { feature: 'Function' } });
        await refusedBeforeChange(f, 'CONFIG_NOT_REWRITABLE', /^taskTracking\.groupLabels\.capability and taskTracking\.levelLabels\.feature both label what becomes one level; keep one of them, then retry \(docs\/project-config\.json\)$/);
        // The same text declared both ways is one label: the purpose label simply leaves, and nothing is written twice.
        restore(); declare({ groupLabels: { capability: 'Ability' }, levelLabels: { feature: 'Ability' } });
        assert.deepEqual((await f.migrate({ dryRun: true })).config.changes, [{ field: 'taskTracking.schemaVersion', from: 2, to: 3 }, { field: 'taskTracking.groupLabels.capability', movedTo: 'taskTracking.levelLabels.feature', alreadyDeclared: true }]);
        assert.equal((await f.migrate()).status, 'migrated');
        const one = JSON.parse(text(f, 'docs/project-config.json')).taskTracking;
        assert.deepEqual([one.schemaVersion, one.groupLabels, one.levelLabels], [3, undefined, { feature: 'Ability' }]);
    }),
    test('TC-TPT-249', 'one group record written and still at its earlier path is what an interruption leaves and is completed; an earlier record back among those already moved is a restore from outside and is not', async f => {
        const { restore, migrated } = await migratable(f, { groups: STRUCTURE });
        const kept = relative => fs.readFileSync(path.join(f.root, 'kept', relative));
        // Interrupted between writing the third group record and removing its earlier one.
        assert.equal((await stopAfter(f, 'group-written', 3)).status, 'interrupted');
        assert.deepEqual([exists(f, 'work/projects/FEATURE-NESTED.md'), exists(f, 'work/areas/FEATURE-NESTED.md')], [true, true]);
        assert.equal((await f.migrate()).status, 'migrated'); assert.deepEqual(f.storedState(), migrated);
        // The same stop, and then an earlier record that the migration had removed is there again.
        restore();
        assert.equal((await stopAfter(f, 'group-written', 3)).status, 'interrupted');
        fs.writeFileSync(path.join(f.root, 'work/projects/EPIC-E.md'), kept('work/projects/EPIC-E.md'));
        const state = f.storedState();
        const stopped = await f.migrate();
        assert.deepEqual([stopped.status, stopped.code, stopped.back], ['interrupted', 'RESTORED_FROM_OUTSIDE', ['work/projects/EPIC-E.md', 'work/projects/FEATURE-NESTED.md']], JSON.stringify(stopped));
        assert.deepEqual(f.storedState(), state, 'Neither carried further nor undone');
        assert.equal(stopped.complete.at(-1), 'run migrate --root <checkout> again'); assert.equal(stopped.abandon.at(-1), ABANDON.request);
    }),
    test('TC-TPT-326', 'a project in the first vocabulary is refused by name by a preview, a run and an abandon request, declared or recognised by its locations, and nothing is changed', async f => {
        const firstRecord = '---\nid: OLD-1\ntitle: Work written in the first vocabulary\nintent: Keep it as written\nstatus: backlog\ntracking: {schemaVersion: 1, revision: 1, kind: pbi}\n---\nBody.\n';
        const arrangements = [['declared', () => { f.config.taskTracking.schemaVersion = 1; f.saveConfig(); f.write('work/tasks/OLD-1.md', firstRecord); }, /\(declared version 1\)$/],
            ['recognised by its locations', () => { delete f.config.taskTracking; f.saveConfig(); f.write('work/pbis/OLD-1.md', firstRecord); f.write('work/epics/OLD-2.md', firstRecord.replace('OLD-1', 'OLD-2')); }, /\(locations: pbis, epics\)$/],
            // An unfinished migration of such a project belongs to the copy that started it.
            ['holding a progress record', () => { f.write(JOURNAL, '{"kind":"vocabulary-migration","from":1,"to":2}'); }, /\(locations: pbis, epics\)$/],
            // Whatever else the record root holds, the answer is the first vocabulary by name and nothing beside it.
            ['beside a location of the current vocabulary', () => { fs.mkdirSync(path.join(f.root, 'work/areas')); }, /\(locations: pbis, epics\)$/]];
        for (const [name, arrange, detail] of arrangements) {
            arrange();
            const stored = f.storedState();
            for (const options of [{ dryRun: true }, {}, { abandon: true }]) {
                const result = await f.migrate(options);
                assert.deepEqual([result.status, result.code, result.refusals.map(refusal => refusal.code)], ['refused', 'UNSUPPORTED_VOCABULARY', ['UNSUPPORTED_VOCABULARY']], `${name}: ${JSON.stringify(result)}`);
                assert.match(result.reason, /^Unsupported vocabulary: this project stores the first vocabulary, which this copy of the tracker neither reads nor migrates; upgrade it with a framework copy that supports the first vocabulary, then run the tracker migration /);
                assert.match(result.reason, detail, name);
                assert.deepEqual(f.storedState(), stored, name);
            }
        }
    }),
    test('TC-TPT-249', 'a repeated run stops and changes nothing when a group that has not moved yet no longer holds the members or the purpose recorded before the first change, names both ways on, and finishes once they are put back', async f => {
        const { restore, migrated } = await migratable(f, { groups: STRUCTURE });
        const changedMeanwhile = async (stop, relative, edit, groups, changed) => {
            assert.equal((await stop()).status, 'interrupted');
            const recorded = text(f, relative);
            f.write(relative, edit(recorded)); assert.notEqual(text(f, relative), recorded);
            const state = f.storedState();
            for (const attempt of [1, 2]) {
                const stopped = await f.migrate();
                assert.deepEqual([stopped.status, stopped.code, stopped.groups], ['interrupted', 'MEMBER_INDEX_STALE', groups], `${attempt}: ${JSON.stringify(stopped)}`);
                // Nothing is rewritten, moved or recorded: not a record, not the declaration, not the progress record.
                assert.deepEqual(f.storedState(), state);
                const way = `put back, in ${relative}, the member list and purpose recorded for it under index.groups in work/.vocabulary-migration.json`;
                // The second way says what it takes: the project as it was when the migration began, the abandon request, and the change made again.
                assert.ok(stopped.reason.startsWith(`The project changed after the migration began: ${changed} no longer holds the members and purpose recorded before the first change, and a repeated run migrates from that record. Nothing was changed. To complete this migration as it was recorded: (1) ${way}; (2) run migrate --root <checkout> again. To migrate the project with the change instead, put it back first as it was when the migration began, from the commit or backup of that time and with the changed member list or purpose as recorded, because an abandon request is granted only then: (1) restore work and docs/project-config.json from version control or your backup`), stopped.reason);
                assert.ok(stopped.reason.endsWith('; then make the change again, and preview and run the migration afresh'), stopped.reason);
                assert.equal(stopped.step, 'members');
                assert.deepEqual(stopped.complete, [way, 'run migrate --root <checkout> again']);
                assert.equal(stopped.abandon.at(-1), ABANDON.request); assert.ok(!JSON.stringify(stopped).includes(f.root));
            }
            await assertUnavailable(f);
            // Put back as recorded, the same run finishes with the result of an uninterrupted one.
            f.write(relative, recorded);
            const finished = await f.migrate();
            assert.deepEqual([finished.status, finished.resumed], ['migrated', true], JSON.stringify(finished));
            assert.deepEqual(f.storedState(), migrated);
            restore();
        };
        // A group's list changes while the records that are not groups are being rewritten: one task leaves it, two records join it.
        await changedMeanwhile(() => stopAfter(f, 'member-rewritten', 2), 'work/projects/FEATURE-NESTED.md', stored => stored.replace('"memberItemIds":["PBI-2"]', '"memberItemIds":["PBI-1","TASK-K"]'),
            [{ groupId: 'FEATURE-NESTED', path: 'work/projects/FEATURE-NESTED.md', members: { added: ['PBI-1', 'TASK-K'], removed: ['PBI-2'] } }], 'FEATURE-NESTED (members changed, gained PBI-1, TASK-K, lost PBI-2)');
        // A purpose changes after two group records have moved; this group has not moved yet.
        await changedMeanwhile(() => stopAfter(f, 'group-moved', 2), 'work/visions/MODULE.md', stored => stored.replace('"groupRole":"area"', '"groupRole":"capability"'),
            [{ groupId: 'MODULE', path: 'work/visions/MODULE.md', purpose: true }], 'MODULE (purpose changed)');
        // Boundary: the same members in another order are the same list, and the run goes on.
        assert.equal((await stopAfter(f, 'member-rewritten', 2)).status, 'interrupted');
        const reordered = text(f, 'work/projects/FEATURE.md').replace('"memberItemIds":["PBI-1","TASK-K","FEATURE-NESTED","IDEA-D"]', '"memberItemIds":["IDEA-D","FEATURE-NESTED","TASK-K","PBI-1"]');
        assert.notEqual(reordered, text(f, 'work/projects/FEATURE.md')); f.write('work/projects/FEATURE.md', reordered);
        assert.equal((await f.migrate()).status, 'migrated'); assert.deepEqual(f.storedState(), migrated);
        // A list that changes between the two passes of one run is caught before the second: no group record moves, and the progress record still says that pass has not begun.
        restore();
        const held = text(f, 'work/visions/MODULE.md');
        const between = await f.migrate({ checkpoint: name => { if (name === 'members-rewritten') f.write('work/visions/MODULE.md', held.replace('"memberItemIds":["FEATURE-NESTED"]', '"memberItemIds":[]')); } });
        assert.notEqual(text(f, 'work/visions/MODULE.md'), held);
        assert.deepEqual([between.status, between.code, between.step, between.groups], ['interrupted', 'MEMBER_INDEX_STALE', 'groups', [{ groupId: 'MODULE', path: 'work/visions/MODULE.md', members: { added: [], removed: ['FEATURE-NESTED'] } }]], JSON.stringify(between));
        assert.deepEqual(journal(f).steps.map(step => [step.id, step.status]), [['members', 'done'], ['groups', 'pending'], ['locations', 'pending'], ['config', 'pending'], ['verify', 'pending']]);
        for (const [from, to] of Object.values(GROUP_PATHS)) assert.ok(exists(f, from) && !exists(f, to), from);
        // That run rewrote the other records before it found the change, so it says what it did not do and never that nothing was changed.
        assert.ok(between.reason.includes(' and a repeated run migrates from that record. No group record was moved by this run. To complete this migration as it was recorded: (1) '), between.reason);
        assert.ok(!between.reason.includes('Nothing was changed'), between.reason);
        f.write('work/visions/MODULE.md', held);
        assert.equal((await f.migrate()).status, 'migrated'); assert.deepEqual(f.storedState(), migrated);
        // The second way, followed as it is worded. A restore that brings the change back with it is not the project as it was when
        // the migration began: the abandon request is refused and names the group. Back as recorded it is granted, and the change
        // made again afterwards is migrated.
        restore();
        const original = text(f, 'work/projects/FEATURE-NESTED.md');
        const changed = original.replace('"memberItemIds":["PBI-2"]', '"memberItemIds":["PBI-1","TASK-K"]');
        assert.notEqual(changed, original);
        assert.equal((await stopAfter(f, 'member-rewritten', 2)).status, 'interrupted');
        const progressRecord = text(f, JOURNAL);
        restore(); f.write(JOURNAL, progressRecord); f.write('work/projects/FEATURE-NESTED.md', changed);
        const early = await f.migrate({ abandon: true });
        assert.deepEqual([early.status, early.code, early.notRestored.length], ['interrupted', 'RESTORE_INCOMPLETE', 1], JSON.stringify(early));
        assert.match(early.notRestored[0], /^the member lists of .*\bFEATURE-NESTED\b.* do not hold what they held before the migration began$/);
        assert.equal(text(f, JOURNAL), progressRecord);
        f.write('work/projects/FEATURE-NESTED.md', original);
        assert.equal((await f.migrate({ abandon: true })).status, 'abandoned'); assert.ok(!exists(f, JOURNAL));
        f.write('work/projects/FEATURE-NESTED.md', changed);
        const afresh = await f.migrate();
        assert.deepEqual([afresh.status, afresh.resumed], ['migrated', false], JSON.stringify(afresh).slice(0, 1500));
        assert.deepEqual([scopeOf(f, 'FEATURE-NESTED'), scopeOf(f, 'MODULE')], [['PBI-1'], ['PBI-1']]);
    }),
    test('TC-TPT-246', 'where version control cannot restore the project a run is refused before any change until a backup is confirmed, while the preview is given and says so, a repeated run and an abandon request do not ask, and a clean checkout needs no confirmation', async f => {
        const project = await earlierProject(f);
        const restore = keep(f);
        const stored = f.storedState();
        // Outside any Git checkout the preview is given whatever is confirmed: it states that nothing here can restore the project and what a run needs.
        for (const backupConfirmed of [false, true]) {
            const preview = await f.migrate({ dryRun: true, backupConfirmed });
            assert.deepEqual([preview.status, preview.versionControl], ['preview', { kind: 'none', restorable: false,
                note: 'Not a Git checkout: nothing here can restore the earlier records or the project configuration. A run will refuse (NO_RESTORE_POINT) until a backup is confirmed: make a backup you can restore, then run migrate --root <checkout> --backup-confirmed' }], JSON.stringify(preview.versionControl));
        }
        // The run is refused: it names what cannot be restored and both ways on. Only a plain yes confirms.
        for (const backupConfirmed of [false, undefined, 'yes', 1]) {
            const refusal = await f.migrate({ backupConfirmed });
            assert.deepEqual([refusal.status, refusal.code, refusal.refusals.map(entry => entry.code), refusal.refusals[0].paths], ['refused', 'NO_RESTORE_POINT', ['NO_RESTORE_POINT'], ['work', 'docs/project-config.json']], JSON.stringify(refusal));
            assert.equal(refusal.reason, 'No restore point: this project is not in a Git checkout, so nothing here can restore work and docs/project-config.json once migrated, and a migration cannot be undone. Make a backup you can restore and run again with --backup-confirmed, or commit the records and the configuration so that version control can restore them, then retry; nothing was changed');
            assert.deepEqual(f.storedState(), stored); assert.ok(!exists(f, JOURNAL));
        }
        // It is named beside every other unmet precondition of a run, and is no obstacle to a preview.
        f.write('work/tasks/BROKEN.md', 'No frontmatter here.\n');
        assert.deepEqual((await f.migrate({ backupConfirmed: false })).refusals.map(entry => entry.code), ['INCOMPLETE_SCOPE', 'NO_RESTORE_POINT']);
        assert.deepEqual((await f.migrate({ dryRun: true, backupConfirmed: false })).refusals.map(entry => entry.code), ['INCOMPLETE_SCOPE']);
        fs.rmSync(path.join(f.root, 'work/tasks/BROKEN.md'));
        // Confirmed, the run starts and records that it did, so the run that completes it after an interruption does not ask again.
        const stopped = await f.migrate({ backupConfirmed: true, checkpoint: name => { if (name === 'member-rewritten') throw new Error('simulated interruption'); } });
        assert.equal(stopped.status, 'interrupted', JSON.stringify(stopped)); assert.equal(journal(f).backupConfirmed, true);
        const resumed = await f.migrate({ backupConfirmed: false });
        assert.deepEqual([resumed.status, resumed.resumed, resumed.progress], ['migrated', true, recorded(project)], JSON.stringify(resumed));
        // Nor does an abandon request: with the earlier project put back whole it ends the migration without a confirmation.
        restore();
        assert.equal((await stopAfter(f, 'member-rewritten')).status, 'interrupted');
        const record = text(f, JOURNAL); restore(); f.write(JOURNAL, record);
        assert.deepEqual([(await f.migrate({ abandon: true, backupConfirmed: false })).status, f.storedState()], ['abandoned', stored]);
        // Inside a clean checkout that tracks the records and the configuration no confirmation is needed, and one that is given changes nothing.
        git(f, ['init']); git(f, ['add', '--', 'docs', 'work']); git(f, ['commit', '-m', 'Earlier project under version control']);
        assert.deepEqual((await f.migrate({ dryRun: true, backupConfirmed: false })).versionControl, { kind: 'git', clean: true, restorable: true });
        const results = [];
        for (const backupConfirmed of [false, true]) {
            let noted;
            const result = await f.migrate({ backupConfirmed, checkpoint: name => { if (name === 'journal-written') noted = journal(f).backupConfirmed; } });
            assert.deepEqual([result.status, noted], ['migrated', false], JSON.stringify(result));
            results.push(f.storedState());
            restoreFromGit(f, true); assert.deepEqual(f.storedState(), stored);
        }
        assert.deepEqual(results[1], results[0]);
    }),
    test('TC-TPT-246', 'a kind label that the current vocabulary uses for something else is named by the migration before any change, with the rename that resolves it', async f => {
        const project = await earlierProject(f);
        // Free while the project was written, a level now: the earlier project still reads whole.
        f.config.taskTracking.kindLabels = { task: 'Module' }; f.saveConfig();
        assert.deepEqual([f.progress().coverage, numbers(f.progress())], ['complete', recorded(project)]);
        await refusedBeforeChange(f, 'CONFIG_NOT_REWRITABLE', /^taskTracking\.kindLabels\.task: kind label invalid \("Module" is a word or a default label of the current vocabulary\); rename that label in the configuration, then retry \(docs\/project-config\.json\)$/);
        // Asked without a confirmed backup outside version control, the label is still named first; the declaration is among what cannot be restored whether or not it can be rewritten yet.
        const both = await f.migrate({ backupConfirmed: false });
        assert.deepEqual([both.code, both.refusals.map(entry => entry.code), both.refusals[1].paths], ['CONFIG_NOT_REWRITABLE', ['CONFIG_NOT_REWRITABLE', 'NO_RESTORE_POINT'], ['work', 'docs/project-config.json']], JSON.stringify(both));
        // Renamed, the same project migrates and keeps its label.
        f.config.taskTracking.kindLabels = { task: 'Work item' }; f.saveConfig();
        assert.equal((await f.migrate()).status, 'migrated');
        assert.deepEqual([f.progress().vocabulary.labels.kinds.task, JSON.parse(text(f, 'docs/project-config.json')).taskTracking.kindLabels], ['Work item', { task: 'Work item' }]);
    }),
    test('TC-TPT-248', 'the result of a run states the listings that were not kept, the nested listings and the levels left unset, as its preview did, also when the run was completed after an interruption', async f => {
        await earlierProject(f, { groups: [{ id: 'OUTCOME', purpose: 'program', members: ['FEATURE'] }, { id: 'FEATURE', purpose: 'capability', members: ['PBI-1', 'INNER-AREA'] },
            { id: 'INNER-AREA', kind: 'vision', purpose: 'area', members: [] }, { id: 'LARGER', purpose: 'program', members: ['SMALLER'] }, { id: 'SMALLER', purpose: 'program', members: ['PBI-2'] }] });
        const restore = keep(f);
        const told = result => ({ crossings: result.crossings, nested: result.nested, levelsUnset: result.levelsUnset });
        const expected = { crossings: [{ groupId: 'OUTCOME', listedId: 'FEATURE', relation: 'initiative', taggedIds: ['PBI-1'] }],
            nested: [{ groupId: 'LARGER', listedId: 'SMALLER', relation: 'initiative', taggedIds: ['PBI-2'] }],
            levelsUnset: [{ itemId: 'INNER-AREA', level: 'product', parentId: 'FEATURE', parentLevel: 'feature' }] };
        assert.deepEqual(told(await f.migrate({ dryRun: true })), expected);
        // Once migrated no record holds a list any more, so the run itself says what it did not keep.
        const result = await f.migrate();
        assert.equal(result.status, 'migrated', JSON.stringify(result)); assert.deepEqual(told(result), expected);
        restore();
        assert.equal((await stopAfter(f, 'group-moved', 3)).status, 'interrupted');
        const resumed = await f.migrate();
        assert.deepEqual([resumed.status, resumed.resumed, told(resumed)], ['migrated', true, expected], JSON.stringify(resumed));
    }),
    test('TC-TPT-326', 'an undeclared project whose records are stamped for the first vocabulary is refused by name with what to do, although it holds none of that vocabulary\'s own locations', async f => {
        const first = (id, kind) => `---\nid: ${id}\ntitle: Work written in the first vocabulary\nintent: Keep it as written\nstatus: backlog\ntracking: {schemaVersion: 1, revision: 1, kind: ${kind}}\n---\nBody.\n`;
        const refusedByName = async (state, paths) => {
            assert.equal(f.progress().vocabulary.project.state, state);
            const stored = f.storedState();
            for (const dryRun of [true, false]) {
                const result = await f.migrate({ dryRun });
                assert.deepEqual([result.status, result.code, result.refusals.map(entry => entry.code), result.refusals[0].paths], ['refused', 'UNSUPPORTED_VOCABULARY', ['UNSUPPORTED_VOCABULARY'], paths], JSON.stringify(result));
                assert.equal(result.reason, `Unsupported vocabulary: this project stores the first vocabulary, which this copy of the tracker neither reads nor migrates; upgrade it with a framework copy that supports the first vocabulary, then run the tracker migration (records stamped for it: ${paths.join(', ')})`);
                assert.deepEqual(f.storedState(), stored); assert.ok(!exists(f, JOURNAL));
            }
        };
        delete f.config.taskTracking; f.saveConfig();
        // Supporting work and a story only: each sits in a location the current vocabulary reads too, so the project reads as current.
        f.write('work/tasks/OLD-1.md', first('OLD-1', 'task')); f.write('work/tasks/stories/OLD-2.md', first('OLD-2', 'story'));
        await refusedByName('current', ['work/tasks/OLD-1.md', 'work/tasks/stories/OLD-2.md']);
        // With a vision, whose location the earlier vocabulary read, it reads as an earlier project: named the same way, not as records that cannot be read.
        f.write('work/visions/OLD-3.md', first('OLD-3', 'vision'));
        await refusedByName('earlier', ['work/tasks/OLD-1.md', 'work/tasks/stories/OLD-2.md', 'work/visions/OLD-3.md']);
        // Boundary: beside one record stamped for a vocabulary this copy reads, those files are strays in a project that is not a first-vocabulary one.
        f.write('work/tasks/NEWER.md', first('NEWER', 'task').replace('schemaVersion: 1', 'schemaVersion: 2').replace('status: backlog', 'status: draft'));
        const mixed = await f.migrate({ dryRun: true });
        assert.deepEqual([mixed.status, mixed.code], ['refused', 'INCOMPLETE_SCOPE'], JSON.stringify(mixed));
        // Boundary: a project that declares what it stores is never judged by a stray record.
        fs.rmSync(path.join(f.root, 'work/visions'), { recursive: true }); fs.rmSync(path.join(f.root, 'work/tasks/NEWER.md'));
        f.config.taskTracking = { schemaVersion: 3 }; f.saveConfig();
        assert.deepEqual([(await f.migrate()).status, (await f.migrate()).code], ['current', 'NOTHING_TO_MIGRATE']);
    }),
    test('TC-TPT-246', 'a project whose member index would not fit a progress record is refused before any change: the migration could not record what it must before its first change', async f => {
        f.config.taskTracking.schemaVersion = 2; f.saveConfig();
        // Finite outcomes that each list every capability, under identities of the greatest length: the listings alone fill the index, and none of them gives a record a link.
        const id = (word, n) => `${word}${String(n).padStart(3, '0')}-${'x'.repeat(120 - word.length - 4)}`;
        const group = (name, purpose, members) => `---\nid: ${name}\ntitle: A group\nintent: Hold what it lists\nstatus: draft\ntracking: {schemaVersion: 2, revision: 1, kind: project, groupRole: ${purpose}, memberItemIds: [${members.join(', ')}]}\n---\n`;
        const build = capabilities => {
            const listed = Array.from({ length: capabilities }, (_, n) => id('CAP', n));
            for (const name of listed) f.write(`work/projects/${name}.md`, group(name, 'capability', []));
            for (let n = 0; n < 130; n++) f.write(`work/projects/${id('OUT', n)}.md`, group(id('OUT', n), 'program', listed));
        };
        // Within the budget the same project previews: 130 lists of 100.
        build(100);
        const fits = await f.migrate({ dryRun: true });
        assert.deepEqual([fits.status, fits.moves.length, fits.crossings.length], ['preview', 230, 13000], JSON.stringify(fits).slice(0, 400));
        // 130 lists of 130 pass it.
        build(130);
        await refusedBeforeChange(f, 'LIMIT_EXCEEDED', /^The member index of this project is larger than a progress record may be, so the migration cannot record what it must before its first change; nothing was changed$/);
    }),
    test('TC-TPT-246', 'a migration that would not keep what a group held names each record that causes it, and a record that is no group and holds an empty member list is no obstacle', async f => {
        const project = await earlierProject(f, { groups: [{ id: 'OUTCOME', purpose: 'program', members: [] }, { id: 'FEATURE', purpose: 'capability', members: ['PBI-1'] }] });
        const restore = keep(f);
        const link = (id, relation, target) => f.write(`work/tasks/${id}.md`, text(f, `work/tasks/${id}.md`).replace(/"links":\[(.*?)\],"proofs"/, (whole, held) => `"links":[${held}${held ? ',' : ''}{"relation":"${relation}","itemId":"${target}"}],"proofs"`));
        // Two records each name a group by a link of their own; neither is listed by it.
        link('PBI-2', 'initiative', 'OUTCOME'); link('PBI-1', 'initiative', 'OUTCOME');
        assert.ok(text(f, 'work/tasks/PBI-2.md').includes('"links":[{"relation":"initiative","itemId":"OUTCOME"}],"proofs"'));
        await refusedBeforeChange(f, 'SCOPE_NOT_CONSERVED', /^Migration would not keep what the project holds: the eligible tasks of OUTCOME \(would gain PBI-1, PBI-2\) would differ from what its member list holds\. PBI-1 links to OUTCOME by itself without being listed by it, PBI-2 links to OUTCOME by itself without being listed by it: list it in that group or remove the link in the earlier records, then retry; nothing was changed$/);
        // The result is rehearsed whether or not a backup is confirmed, so one run names every obstacle: this one first, the missing confirmation last.
        assert.deepEqual((await f.migrate({ backupConfirmed: false })).refusals.map(entry => entry.code), ['SCOPE_NOT_CONSERVED', 'NO_RESTORE_POINT']);
        restore();
        // A task that holds an empty list lists nothing: it is no group, becomes no scope, and the project migrates with the list gone.
        f.write('work/tasks/PBI-2.md', text(f, 'work/tasks/PBI-2.md').replace('"links":[],"proofs"', '"links":[],"memberItemIds":[],"proofs"'));
        assert.deepEqual(store.inspectStoredRecords(f.context(), { version: 2 }).records.find(record => record.id === 'PBI-2').tracking.memberItemIds, []);
        const result = await f.migrate();
        assert.deepEqual([result.status, result.progress], ['migrated', recorded(project)], JSON.stringify(result));
        assert.equal(f.record('PBI-2').tracking.memberItemIds, undefined); assert.deepEqual(scopeOf(f, 'FEATURE'), ['PBI-1']);
    }),
    test('TC-TPT-246', 'a file Git ignores that is no record does not make a clean checkout unrestorable: only an ignored record file or an ignored declaration needs a confirmed backup, and each is named', async f => {
        const project = await earlierProject(f);
        const ignore = (...lines) => { f.write('.gitignore', `${['.DS_Store', '*.log', ...lines].join('\n')}\n`); git(f, ['add', '--', '.gitignore']); };
        git(f, ['init']); ignore(); git(f, ['add', '--', 'docs', 'work']); git(f, ['commit', '-m', 'Earlier project under version control']);
        // What a file manager or a tool leaves behind: under the record root itself and inside a location both vocabularies use.
        const strays = ['work/.DS_Store', 'work/tasks/.DS_Store', 'work/tasks/import.log'];
        for (const stray of strays) f.write(stray, 'no record\n');
        assert.equal(git(f, ['status', '--porcelain', '--', 'work', 'docs']), '');
        // The migration neither reads nor rewrites them: the checkout previews as restorable and migrates without a confirmed backup.
        const preview = await f.migrate({ dryRun: true, backupConfirmed: false });
        assert.deepEqual([preview.status, preview.versionControl], ['preview', { kind: 'git', clean: true, restorable: true }], JSON.stringify(preview.versionControl));
        let noted;
        const result = await f.migrate({ backupConfirmed: false, checkpoint: name => { if (name === 'journal-written') noted = journal(f).backupConfirmed; } });
        assert.deepEqual([result.status, noted, result.progress], ['migrated', false, recorded(project)], JSON.stringify(result).slice(0, 1500));
        for (const stray of strays) assert.equal(text(f, stray), 'no record\n');
        restoreFromGit(f, true);
        // A record file Git ignores is another matter: version control holds nothing to put back, so the run asks, and names that file alone.
        git(f, ['rm', '--cached', '--quiet', '--', 'work/tasks/PBI-2.md']); ignore('work/tasks/PBI-2.md'); git(f, ['commit', '-m', 'One record is kept out of version control']);
        const stored = f.storedState();
        const partly = await f.migrate({ dryRun: true, backupConfirmed: false });
        assert.deepEqual([partly.status, partly.versionControl], ['preview', { kind: 'git', clean: true, restorable: false, ignored: ['work/tasks/PBI-2.md'],
            note: 'Git ignores work/tasks/PBI-2.md: version control cannot restore what it does not track. A run will refuse (NO_RESTORE_POINT) until a backup is confirmed: make a backup you can restore, then run migrate --root <checkout> --backup-confirmed, or commit what Git ignores' }], JSON.stringify(partly.versionControl));
        const refusal = await f.migrate({ backupConfirmed: false });
        assert.deepEqual([refusal.status, refusal.code, refusal.refusals.map(entry => entry.code), refusal.refusals[0].paths], ['refused', 'NO_RESTORE_POINT', ['NO_RESTORE_POINT'], ['work/tasks/PBI-2.md']], JSON.stringify(refusal));
        assert.equal(refusal.reason, 'No restore point: Git ignores work/tasks/PBI-2.md, so version control cannot restore it once migrated, and a migration cannot be undone. Make a backup you can restore and run again with --backup-confirmed, or commit the records and the configuration so that version control can restore them, then retry; nothing was changed');
        assert.deepEqual(f.storedState(), stored); assert.ok(!exists(f, JOURNAL));
        // So is the declaration the migration rewrites, when Git ignores it.
        git(f, ['rm', '--cached', '--quiet', '--', 'docs/project-config.json']); ignore('work/tasks/PBI-2.md', 'docs/project-config.json'); git(f, ['commit', '-m', 'The declaration is kept out of version control too']);
        const both = await f.migrate({ backupConfirmed: false });
        assert.deepEqual([both.code, [...both.refusals[0].paths].sort()], ['NO_RESTORE_POINT', ['docs/project-config.json', 'work/tasks/PBI-2.md']], JSON.stringify(both));
        assert.deepEqual(f.storedState(), stored);
        // The person confirms a backup of those two files, and the run proceeds.
        const confirmed = await f.migrate({ backupConfirmed: true, checkpoint: name => { if (name === 'journal-written') noted = journal(f).backupConfirmed; } });
        assert.deepEqual([confirmed.status, noted, confirmed.progress], ['migrated', true, recorded(project)], JSON.stringify(confirmed).slice(0, 1500));
    }),
    test('TC-TPT-246', 'every label the current vocabulary cannot keep is named in one answer before any change, each with what resolves it', async f => {
        const project = await earlierProject(f);
        const borrowed = (kind, label) => `taskTracking.kindLabels.${kind}: kind label invalid ("${label}" is a word or a default label of the current vocabulary); rename that label in the configuration, then retry`;
        const groupKind = kind => `taskTracking.kindLabels.${kind} labels a kind the current vocabulary does not have; remove that label, then retry`;
        const declared = { ...f.config.taskTracking };
        const named = async (labels, reasons) => {
            f.config.taskTracking = { ...declared, ...labels }; f.saveConfig();
            assert.deepEqual([f.progress().coverage, numbers(f.progress())], ['complete', recorded(project)]);
            const stored = f.storedState();
            for (const dryRun of [true, false]) {
                const result = await f.migrate({ dryRun });
                assert.deepEqual([result.status, result.refusals.map(entry => [entry.code, entry.reason])],
                    ['refused', [['CONFIG_NOT_REWRITABLE', `${reasons.length === 1 ? reasons[0] : reasons.map((reason, index) => `(${index + 1}) ${reason}`).join('; ')} (docs/project-config.json)`]]], JSON.stringify(result).slice(0, 1500));
                assert.deepEqual(f.storedState(), stored); assert.ok(!exists(f, JOURNAL));
            }
        };
        // Two labels that are words of the current vocabulary.
        await named({ kindLabels: { task: 'Module', story: 'Approved' } }, [borrowed('task', 'Module'), borrowed('story', 'Approved')]);
        // A label on a kind only the earlier vocabulary has, beside one that collides: named once each, the kind that is gone first.
        await named({ kindLabels: { task: 'Module', project: 'Workstream' } }, [groupKind('project'), borrowed('task', 'Module')]);
        // Three obstacles of three sorts: with them, two labels for what becomes one level.
        await named({ kindLabels: { vision: 'Horizon', subtask: 'High' }, groupLabels: { capability: 'Ability' }, levelLabels: { feature: 'Function' } },
            [groupKind('vision'), borrowed('subtask', 'High'), 'taskTracking.groupLabels.capability and taskTracking.levelLabels.feature both label what becomes one level; keep one of them, then retry']);
        // Boundary: one obstacle is stated plainly, without a number.
        await named({ kindLabels: { subtask: 'High' } }, [borrowed('subtask', 'High')]);
        // Resolved as named in that one answer, the project migrates and keeps the labels it may.
        f.config.taskTracking = { ...declared, kindLabels: { subtask: 'Step' }, groupLabels: { capability: 'Ability' } }; f.saveConfig();
        assert.equal((await f.migrate()).status, 'migrated');
        const after = JSON.parse(text(f, 'docs/project-config.json')).taskTracking;
        assert.deepEqual([after.schemaVersion, after.kindLabels, after.levelLabels, after.groupLabels], [3, { subtask: 'Step' }, { feature: 'Ability' }, undefined]);
    })
] };
