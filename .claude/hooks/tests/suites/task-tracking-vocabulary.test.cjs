/**
 * Vocabulary contract (BR-TPT-30, INV-TPT-08).
 *
 * A project stores its records in exactly one vocabulary. One written before the current vocabulary is read in the
 * current terms with the progress it had, from the working copy and from a pinned commit alike, and is read-only until
 * its explicit migration; a project whose vocabulary cannot be settled is refused, never counted; a project still in the
 * first vocabulary is refused by name; a save request written for the earlier vocabulary is refused, never
 * reinterpreted; and a record that arrives in the earlier vocabulary inside a current project earns no count.
 *
 * Expected kinds, states and links of the earlier project are spelled out here and in the fixture as test data, on
 * purpose: they are the independent record of what an earlier project means, so these cases fail when the owner's
 * mapping between the vocabularies is broken.
 *
 * Portability: every case builds its own temp project; location spelling is asserted against what the disk itself does.
 */

'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { trackingTest: test, refused, earlierProject, git, OBSERVED_AT } = require('../lib/task-tracking-fixture.cjs');
const vocabulary = require('../../lib/task-tracking-vocabulary.cjs');
const { validateTaskTracking } = require('../../lib/task-tracking-config.cjs');
const { inspectRecords, inspectStoredRecords, patchRecord, parseRecord } = require('../../lib/task-artifact-store.cjs');
const { OPERATION_KEYS, operationCatalogue } = require('../../lib/task-tracking.cjs');
const upkeep = require('../../lib/task-tracking-upkeep.cjs');
const { hash } = require('../../lib/task-tracking-files.cjs');
const { stableValue } = require('../../lib/task-artifact-store.cjs');

// Words only an earlier vocabulary used for a kind, a location or a tracking value: nothing written or reported now holds one.
// The word project is not among them: the whole project is still a scope every read names.
const EARLIER_WORD = /\b(?:pbis?|epics?|backlog|visions?|memberItemIds|groupRole)\b/i;
const numbers = snapshot => ({ total: snapshot.metrics.total, accepted: snapshot.metrics.accepted, remaining: snapshot.metrics.remaining, eligibleIds: snapshot.metrics.eligibleIds });
const recorded = project => ({ total: project.expected.total, accepted: project.expected.accepted, remaining: project.expected.remaining, eligibleIds: project.expected.eligibleIds });
const codes = snapshot => snapshot.diagnostics.map(finding => finding.code);
// The delivery states of the two versions of the current structure, written out: version 4 added one state to version 3.
const BASE_STATES = ['draft', 'planned', 'ready', 'in_progress', 'blocked', 'verifying', 'done', 'canceled'];
const CURRENT_STATES = ['draft', 'planned', 'ready', 'in_progress', 'blocked', 'implemented', 'verifying', 'done', 'canceled'];
const LATER_STATE = 'The implemented state belongs to vocabulary version 4 and this project stores version 3; declare taskTracking.schemaVersion 4 in the project configuration to record it';
const LATER_STAMP = 'Record is stamped for vocabulary version 4 and this project stores version 3; declare taskTracking.schemaVersion 4 in the project configuration to read it';
const recordBytes = snapshotState => snapshotState.filter(([name]) => name.startsWith('work/'));
// The stops the status report draws for delivery work, in order: every delivery state but blocked and canceled.
const reportStops = snapshot => {
    const { renderReport } = require('../../../skills/task-track/lib/report-view.cjs');
    const html = renderReport(snapshot, { schemaVersion: 1 });
    const standing = html.slice(html.indexOf('id="standing-heading"'));
    return [...standing.slice(0, standing.indexOf('</section>')).matchAll(/<span class="station-name">([^<]*)<\/span>/g)].map(match => match[1]);
};
// A record as an earlier release stored it, written by hand: the tracker never writes this stamp itself.
const earlierRecord = (id, kind, extra = '') => `---\nid: ${id}\ntitle: Work written before the vocabulary change\nintent: Keep an earlier outcome readable\nstatus: draft\n`
    + `tracking: {schemaVersion: 2, revision: 1, kind: ${kind}${extra}}\n---\nAuthored body stays as written.\n`;
// A record as the first vocabulary stored it.
const firstRecord = id => `---\nid: ${id}\ntitle: Work written in the first vocabulary\nintent: Keep it as written\nstatus: backlog\ntracking: {schemaVersion: 1, revision: 1, kind: pbi}\n---\nAuthored body stays as written.\n`;
const untracked = id => `---\nid: ${id}\ntitle: Hand-written work\nintent: Keep an authored outcome\nstatus: draft\n---\nAuthored body stays as written.\n`;
const DEFAULT_LEVELS = { application: 'Application', product: 'Product', module: 'Module', feature: 'Feature' };
/** What a read states of every record: its kind, state, level, type and the records it names, and every figure. */
const stated = snapshot => ({ items: Object.fromEntries(snapshot.items.map(item => [item.id, [item.kind, item.state, item.level, item.type, item.links.filter(link => link.itemId).map(link => `${link.relation}:${link.itemId}`)]])),
    metrics: snapshot.metrics, hierarchy: snapshot.hierarchy, figures: snapshot.figures });

/** The project as TC-TPT-242 describes it, shown in the current terms. */
function assertCurrentTerms(snapshot, project) {
    const { ids } = project;
    const item = id => snapshot.items.find(value => value.id === id);
    assert.deepEqual(Object.fromEntries(snapshot.items.map(value => [value.id, value.kind])), { [ids.accepted]: 'task', [ids.remaining]: 'task',
        [ids.supporting]: 'subtask', [ids.intent]: 'initiative', [ids.story]: 'story', [ids.group]: 'initiative' });
    assert.deepEqual(Object.fromEntries(snapshot.items.map(value => [value.id, value.state])), project.expected.states);
    assert.equal(item(ids.remaining).state, 'planned'); assert.equal(item(ids.accepted).state, 'done');
    // The group was a finite outcome: an initiative of type initiative, which the two tasks it listed now name themselves.
    assert.deepEqual([item(ids.group).type, item(ids.group).lifecycle, item(ids.intent).type], ['initiative', 'tracker', 'idea']);
    assert.deepEqual(item(ids.accepted).links, [{ relation: 'initiative', itemId: ids.intent }, { relation: 'initiative', itemId: ids.group }]);
    assert.deepEqual(item(ids.remaining).links, [{ relation: 'initiative', itemId: ids.group }]);
    assert.ok(item(ids.accepted).history.some(entry => entry.afterState === 'planned') && item(ids.accepted).history.some(entry => entry.beforeState === 'planned'), 'history passed through the planned state');
    assert.equal(item(ids.accepted).acceptance.accepted, true); assert.equal(item(ids.accepted).verification.status, 'current');
    // Every kind and relation shown is a current word, and no record is shown with a member list or a group purpose.
    for (const value of snapshot.items) {
        assert.ok(snapshot.vocabulary.kinds.includes(value.kind) && value.links.every(link => snapshot.vocabulary.linkRoles.includes(link.relation)), value.id);
        assert.deepEqual([value.memberItemIds, value.groupRole], [undefined, undefined], value.id);
    }
    // Each record is shown where it is stored: identities and locations keep their stored names.
    assert.deepEqual(snapshot.items.map(value => value.ownerPath).sort(), ['work/initiatives/IDEA-D.md', 'work/projects/EPIC-E.md', 'work/subtasks/TASK-K.md', 'work/tasks/PBI-1.md', 'work/tasks/PBI-2.md', 'work/tasks/stories/STORY-S.md']);
    assert.equal(snapshot.metrics.unit, 'unique-task');
    assert.deepEqual(numbers(snapshot), recorded(project));
    assert.deepEqual(numbers(snapshot), { total: 2, accepted: 1, remaining: 1, eligibleIds: [ids.accepted, ids.remaining] });
}

module.exports = { name: 'Task tracking vocabulary integration', tests: [
    test('TC-TPT-242', 'an earlier-vocabulary project reads in the current terms with the progress it had and nothing is written', async f => {
        const project = await earlierProject(f); const stored = f.storedState();
        const snapshot = f.progress();
        assert.equal(snapshot.coverage, 'complete'); assert.deepEqual(snapshot.diagnostics, []);
        assertCurrentTerms(snapshot, project);
        assert.equal(snapshot.metrics.percentage, 50);
        assert.deepEqual(snapshot.scope.eligibleTaskIds, [project.ids.accepted, project.ids.remaining]);
        // The label the project wrote for the group purpose is shown for the type that purpose became.
        assert.deepEqual(snapshot.hierarchy.labels, { levels: DEFAULT_LEVELS, types: { feedback: 'Feedback', idea: 'Idea', initiative: 'Bet' } });
        const scoped = f.progress({ scopeId: project.ids.group });
        assert.deepEqual(numbers(scoped), recorded(project)); assert.deepEqual([scoped.scope.kind, scoped.scope.taskIds], ['initiative', [project.ids.accepted, project.ids.remaining]]);
        // The read says the project is read-only and why; the project itself still stores the earlier vocabulary.
        assert.deepEqual(snapshot.vocabulary.project, { state: 'earlier', storedVersion: 2, declared: true, readOnly: true, code: 'MIGRATION_REQUIRED',
            reason: vocabulary.REFUSALS.MIGRATION_REQUIRED, earlierLocations: ['projects'], currentLocations: [], retiredLocations: [] });
        assert.deepEqual(f.storedState(), stored);
        // Boundary: an earlier project with no record at all reads as empty and read-only, with no percentage.
        fs.rmSync(path.join(f.root, 'work'), { recursive: true });
        const empty = f.progress();
        assert.deepEqual([empty.vocabulary.project.state, empty.coverage, empty.metrics.total, empty.metrics.percentage, empty.items], ['earlier', 'complete', 0, null, []]);
    }),
    test('TC-TPT-242', 'a pinned read uses the pinned commit\'s own vocabulary and reports the numbers that commit had', async f => {
        const project = await earlierProject(f, { commit: true });
        const pinned = f.progress({ ref: project.oid });
        assert.equal(pinned.coverage, 'complete'); assertCurrentTerms(pinned, project);
        assert.equal(pinned.vocabulary.project.state, 'earlier'); assert.equal(pinned.source.kind, 'shared');
        // The working copy later holds the current vocabulary; the commit made before that is still read by its own marker.
        fs.rmSync(path.join(f.root, 'work'), { recursive: true });
        const { groupLabels, ...declared } = f.config.taskTracking;
        f.config.taskTracking = { ...declared, schemaVersion: 3 }; f.saveConfig();
        await f.create('TASK-new');
        assert.equal(f.progress().vocabulary.project.state, 'current'); assert.equal(f.progress().metrics.total, 1);
        const afterwards = f.progress({ ref: project.oid });
        assertCurrentTerms(afterwards, project); assert.equal(afterwards.vocabulary.project.state, 'earlier');
        assert.deepEqual(afterwards.hierarchy.labels.types, { feedback: 'Feedback', idea: 'Idea', initiative: 'Bet' });
    }),
    test('TC-TPT-242', 'an undeclared project is recognised by an earlier-only location and reads the same numbers locally and pinned', async f => {
        const project = await earlierProject(f, { declared: false, commit: true }); const stored = f.storedState();
        assert.equal(f.context().enrolled, false);
        for (const snapshot of [f.progress(), f.progress({ ref: project.oid })]) {
            assertCurrentTerms(snapshot, project);
            assert.equal(snapshot.vocabulary.project.state, 'earlier'); assert.equal(snapshot.vocabulary.project.declared, false);
        }
        assert.deepEqual(f.storedState(), stored);
    }),
    test('TC-TPT-242', 'a location spelled in another letter case is recognised exactly when the disk reads it as the same location', async f => {
        delete f.config.taskTracking; f.saveConfig();
        f.write('work/Projects/P.md', earlierRecord('P', 'project'));
        // Windows and macOS disks usually ignore letter case; Linux disks usually do not. Recognition follows the disk.
        const sameLocation = fs.existsSync(path.join(f.root, 'work', 'projects'));
        const snapshot = f.progress();
        assert.equal(snapshot.vocabulary.project.state, sameLocation ? 'earlier' : 'current');
        assert.deepEqual(snapshot.items.map(item => [item.id, item.kind]), sameLocation ? [['P', 'area']] : []);
        assert.equal(snapshot.metrics.total, 0); assert.deepEqual(codes(snapshot), []);
    }),
    test('TC-TPT-243', 'every save operation and its preview on an earlier-vocabulary project is refused as migration required and changes nothing', async f => {
        const project = await earlierProject(f); const stored = f.storedState(); const before = numbers(f.progress());
        const authority = { canAttest: true, canDelete: true, canDeleteEnded: true, canCorrectState: true };
        assert.deepEqual(Object.keys(OPERATION_KEYS).sort(), ['accept', 'activity', 'adopt', 'assign', 'attest', 'create', 'delete', 'link', 'proof', 'restore', 'retire', 'tag', 'transition', 'update']);
        for (const operation of Object.keys(OPERATION_KEYS)) for (const preview of [false, true]) {
            const target = operation === 'create' ? undefined : project.ids.remaining;
            const patch = operation === 'create' ? { title: 'New work', intent: 'Capture a new outcome' } : operation === 'update' ? { title: 'Changed title' }
                : operation === 'transition' ? { state: 'ready', readiness: { reviewed: true, decisionsResolved: true } } : operation === 'assign' ? { assigneeId: 'peer' }
                    : operation === 'tag' ? { initiativeIds: [project.ids.intent] } : {};
            const result = await f.perform(operation, target, patch, preview ? { preview: true } : {}, authority);
            refused(result, 'MIGRATION_REQUIRED');
            assert.equal(result.primary.reason, vocabulary.REFUSALS.MIGRATION_REQUIRED); assert.match(result.primary.reason, /migration/i, `${operation} names the next step`);
        }
        // The former group is an initiative in every read, and a decision on it is refused like any other save.
        refused(await f.perform('transition', project.ids.group, { state: 'approved' }), 'MIGRATION_REQUIRED');
        // A retry of a save that completed before the upgrade is refused too; no second change.
        const replay = f.record(project.ids.remaining).tracking.receipts.at(-1).operationId;
        refused(await f.perform('transition', project.ids.remaining, { state: 'planned' }, { operationId: replay }), 'MIGRATION_REQUIRED');
        assert.deepEqual(f.storedState(), stored); assert.deepEqual(numbers(f.progress()), before);
    }),
    test('TC-TPT-243', 'an automatic checkpoint on an earlier-vocabulary project is skipped with the same reason and the primary result is kept', async f => {
        const project = await earlierProject(f); f.write('src/export.js', 'export const saved = true;\n');
        const session = { root: f.root, sessionId: 'actual-session', actor: 'owner', producer: 'feature' };
        assert.equal((await upkeep.linkSession({ ...session, itemIds: [project.ids.remaining] })).status, 'linked');
        const stored = f.storedState(); const primary = { status: 'saved', artifact: 'src/export.js', outcome: 'The source save succeeded' };
        const result = await upkeep.checkpoint({ ...session, checkpointId: 'actual-checkpoint', primary,
            observation: { kind: 'saved', observedAt: OBSERVED_AT, summary: 'Observed source save', paths: ['src/export.js'] } });
        assert.deepEqual(result.primary, primary);
        assert.deepEqual(result.secondary, [{ kind: 'tracking', status: 'skipped', code: 'MIGRATION_REQUIRED', reason: vocabulary.REFUSALS.MIGRATION_REQUIRED }]);
        assert.deepEqual(f.record(project.ids.remaining).tracking.activity, undefined); assert.deepEqual(f.storedState(), stored);
        // Upkeep that is switched off stays silent as before: no migration prompt is forced.
        f.config.taskTracking.mode = 'off'; f.saveConfig();
        const off = await upkeep.checkpoint({ ...session, checkpointId: 'second-checkpoint', primary, observation: { kind: 'saved', observedAt: OBSERVED_AT, summary: 'Observed source save', paths: ['src/export.js'] } });
        assert.deepEqual(off.secondary, [{ kind: 'tracking', status: 'skipped', reason: 'Automatic tracking is off' }]);
    }),
    test('TC-TPT-243', 'the save an earlier-vocabulary project refuses succeeds on a project stored in the current vocabulary', async f => {
        await f.create('TASK-current'); const saved = await f.saved('update', 'TASK-current', { title: 'Changed title' });
        assert.equal(saved.primary.kind, 'task'); assert.equal(f.record('TASK-current').data.title, 'Changed title');
        const session = { root: f.root, sessionId: 'actual-session', actor: 'owner', producer: 'feature' };
        f.write('src/export.js', 'export const saved = true;\n'); await upkeep.linkSession({ ...session, itemIds: ['TASK-current'] });
        const result = await upkeep.checkpoint({ ...session, checkpointId: 'actual-checkpoint', primary: { status: 'saved', artifact: 'src/export.js', outcome: 'The source save succeeded' },
            observation: { kind: 'saved', observedAt: OBSERVED_AT, summary: 'Observed source save', paths: ['src/export.js'] } });
        assert.equal(result.secondary[0].status, 'saved'); assert.equal(f.record('TASK-current').tracking.activity.length, 1);
    }),
    test('TC-TPT-244', 'an undeclared project holding locations of both vocabularies is refused as mixed and nothing is counted', async f => {
        delete f.config.taskTracking; f.saveConfig();
        f.write('work/projects/P.md', earlierRecord('P', 'project')); f.write('work/areas/S.md', untracked('S'));
        const stored = f.storedState();
        const snapshot = f.progress();
        assert.equal(snapshot.coverage, 'unavailable'); assert.equal(snapshot.metrics, null); assert.equal(snapshot.hierarchy, null); assert.equal(snapshot.scope, null);
        assert.deepEqual(snapshot.items, []); assert.deepEqual(snapshot.ready, []);
        assert.deepEqual(snapshot.vocabulary.project, { state: 'mixed', storedVersion: null, declared: false, readOnly: true, code: 'MIXED_VOCABULARY',
            reason: snapshot.diagnostics[0].reason, earlierLocations: ['projects'], currentLocations: ['areas'], retiredLocations: [] });
        assert.deepEqual(codes(snapshot), ['MIXED_VOCABULARY']);
        // The refusal names the locations found from each vocabulary.
        assert.match(snapshot.diagnostics[0].reason, /^Mixed vocabularies: .*\(earlier: projects; current: areas\)$/);
        assert.equal(f.progress({ scopeId: 'P' }).metrics, null);
        for (const preview of [false, true]) refused(await f.perform('create', 'TASK-new', { title: 'New work', intent: 'Capture a new outcome' }, preview ? { preview: true } : {}), 'MIXED_VOCABULARY');
        assert.throws(() => inspectRecords(f.context()), error => error.code === 'MIXED_VOCABULARY');
        assert.deepEqual(f.storedState(), stored);
        // Either family's location present but empty is still mixed.
        fs.rmSync(path.join(f.root, 'work/projects/P.md')); fs.rmSync(path.join(f.root, 'work/areas/S.md'));
        assert.equal(f.progress().vocabulary.project.state, 'mixed'); assert.equal(f.progress().metrics, null);
        // A location both vocabularies use, beside an earlier-only one, is the earlier vocabulary, not a mix.
        fs.rmSync(path.join(f.root, 'work/areas'), { recursive: true }); f.write('work/tasks/K.md', earlierRecord('K', 'task')); f.write('work/projects/P.md', earlierRecord('P', 'project'));
        const earlier = f.progress();
        assert.equal(earlier.vocabulary.project.state, 'earlier'); assert.equal(earlier.metrics.total, 1); assert.deepEqual(earlier.metrics.eligibleIds, ['K']);
    }),
    test('TC-TPT-244', 'a project declared as earlier that holds a current-only location is refused as mixed, locally and pinned', async f => {
        const project = await earlierProject(f); f.write('work/areas/G.md', untracked('G'));
        const stored = f.storedState();
        git(f, ['init']); git(f, ['add', '--', 'docs', 'work']); git(f, ['commit', '-m', 'Combined copies']);
        for (const snapshot of [f.progress(), f.progress({ ref: 'HEAD' })]) {
            assert.equal(snapshot.coverage, 'unavailable'); assert.equal(snapshot.metrics, null); assert.deepEqual(snapshot.items, []);
            assert.deepEqual(codes(snapshot), ['MIXED_VOCABULARY']);
            assert.deepEqual([snapshot.vocabulary.project.state, snapshot.vocabulary.project.declared, snapshot.vocabulary.project.currentLocations], ['mixed', true, ['areas']]);
        }
        refused(await f.core.executeOperation({ schemaVersion: 3, operation: 'update', operationId: 'edit-in-mixed-project', target: { kind: 'task', itemId: project.ids.remaining },
            actor: { memberId: 'owner' }, patch: { title: 'Changed title' }, expected: { revision: 3, contentHash: 'a'.repeat(64) } }, f.authority()), 'MIXED_VOCABULARY');
        assert.deepEqual(f.storedState(), stored);
    }),
    test('TC-TPT-244', 'one rule settles a project\'s vocabulary from its declaration, its locations and a migration progress record', async () => {
        const settle = (declaredVersion, folderNames, journalPresent = false) => vocabulary.resolveVocabulary({ declaredVersion, folderNames, journalPresent }).state;
        const shared = ['tasks', 'initiatives', 'subtasks'];
        assert.deepEqual([settle(undefined, []), settle(undefined, shared), settle(undefined, ['areas']), settle(3, []), settle(3, ['areas', 'initiatives'])], ['current', 'current', 'current', 'current', 'current']);
        assert.deepEqual([settle(undefined, ['projects']), settle(undefined, ['visions', ...shared]), settle(2, []), settle(2, shared), settle(2, ['projects'])],
            ['earlier', 'earlier', 'earlier', 'earlier', 'earlier']);
        assert.deepEqual([settle(undefined, ['projects', 'areas']), settle(undefined, ['visions', 'areas']), settle(2, ['areas']), settle(2, ['projects', 'areas'])], ['mixed', 'mixed', 'mixed', 'mixed']);
        // Declared current, an earlier-only location is a place for flagged records (TC-TPT-250), not a mixed project.
        assert.equal(settle(3, ['projects', 'areas']), 'current');
        for (const [declared, folders] of [[undefined, []], [2, ['projects']], [3, ['tasks']], [undefined, ['projects', 'areas']]]) assert.equal(settle(declared, folders, true), 'migrating');
        // The first vocabulary is settled before anything else, by its declaration or, undeclared, by one of its locations.
        assert.deepEqual([settle(1, []), settle(1, ['projects']), settle(undefined, ['pbis']), settle(undefined, ['epics', 'projects', 'areas']), settle(1, [], true), settle(undefined, ['ideas'], true)], Array(6).fill('unsupported'));
        // Declared otherwise, such a location is again only a place for flagged files.
        assert.deepEqual([settle(3, ['pbis']), settle(2, ['pbis'])], ['current', 'earlier']);
        // Names are taken as given: a differently spelled name is a location only where the disk says so (asserted against the disk above).
        assert.equal(settle(undefined, ['Projects']), 'current');
        // The current structure has two versions, and only a declaration makes a project store the current one.
        const storedAs = (declaredVersion, folderNames = []) => vocabulary.resolveVocabulary({ declaredVersion, folderNames }).storedVersion;
        assert.deepEqual([storedAs(4), storedAs(4, ['areas']), storedAs(3), storedAs(undefined), storedAs(undefined, ['areas', 'tasks']), storedAs(2)], [4, 4, 3, 3, 3, 2]);
        assert.deepEqual([vocabulary.CURRENT_VERSION, vocabulary.BASE_VERSION, vocabulary.resolveVocabulary({ declaredVersion: 4 }).state, vocabulary.resolveVocabulary({ declaredVersion: 4 }).readOnly], [4, 3, 'current', false]);
        assert.deepEqual([vocabulary.readableStamps(4), vocabulary.readableStamps(3), vocabulary.readableStamps(2)], [[3, 4], [3], [2]]);
        // The project marker accepts the two vocabularies that are read and the first, which is then refused by name; labels for
        // group purposes belong to the earlier one alone.
        assert.deepEqual(validateTaskTracking({ taskTracking: { schemaVersion: 2, groupLabels: { program: 'Bet', domain: 'Field' } } }), []);
        assert.deepEqual(validateTaskTracking({ taskTracking: { schemaVersion: 3, groupLabels: { program: 'Bet' } } }), ['taskTracking.groupLabels: unknown field']);
        assert.deepEqual(validateTaskTracking({ taskTracking: { schemaVersion: 2, groupLabels: { initiative: 'Bet' } } }), ['taskTracking.groupLabels.initiative: unknown field']);
        for (const declared of [2, 3, 4]) assert.deepEqual(validateTaskTracking({ taskTracking: { schemaVersion: declared, levelLabels: { product: 'Suite' }, typeLabels: { idea: 'Proposal' } } }), [], `marker ${declared}`);
        assert.deepEqual(validateTaskTracking({ taskTracking: { schemaVersion: 4, groupLabels: { program: 'Bet' } } }), ['taskTracking.groupLabels: unknown field']);
        assert.deepEqual(validateTaskTracking({ taskTracking: { schemaVersion: 1 } }), []);
        for (const version of [0, 5, '3', '4', null]) assert.equal(validateTaskTracking({ taskTracking: { schemaVersion: version } }).length, 1, `marker ${version}`);
        assert.deepEqual(validateTaskTracking({ taskTracking: { schemaVersion: 5 } }), ['taskTracking.schemaVersion: supported versions are 2 (earlier vocabulary, read-only until migrated), 3 and 4']);
    }),
    test('TC-PCI-073', 'a task-tracking vocabulary newer than the framework is deferred to warnings so the rest of the configuration still loads', async f => {
        const { deferNewerTracking } = require('../../lib/task-tracking-config.cjs');
        const newer = vocabulary.CURRENT_VERSION + 1;
        const config = { taskTracking: { schemaVersion: newer, groupLabels: { x: 'y' } } };
        const deferred = deferNewerTracking(config, { valid: false, errors: validateTaskTracking(config), warnings: [] });
        assert.equal(deferred.valid, true);
        assert.deepEqual(deferred.errors, []);
        assert.ok(deferred.warnings.length > 0 && deferred.warnings.every(w => w.startsWith('taskTracking.')));
        // Exercise the same file admission the public tracker consumes: unrelated facts load, while tracking refuses.
        f.config.taskTracking.schemaVersion = newer; f.saveConfig();
        const { readProjectConfigAt } = require('../../lib/project-config-loader.cjs');
        const loaded = readProjectConfigAt(f.root);
        assert.equal(loaded.state, 'valid');
        assert.equal(loaded.config.project.name, f.config.project.name);
        const { trackingContext } = require('../../lib/task-tracking-config.cjs');
        assert.throws(() => trackingContext(f.root), error => error.code === 'INVALID_CONFIG');
        f.config.project.name = ''; f.saveConfig();
        assert.equal(readProjectConfigAt(f.root).state, 'invalid', 'unrelated invalid facts still reject the config');
        // Findings outside the section, and findings of a version this framework can judge, are never deferred.
        const mixed = deferNewerTracking(config, { valid: false, errors: ['project.name: required'], warnings: [] });
        assert.equal(mixed.valid, false);
        const known = { taskTracking: { schemaVersion: vocabulary.CURRENT_VERSION, bogus: 1 } };
        assert.equal(deferNewerTracking(known, { valid: false, errors: validateTaskTracking(known), warnings: [] }).valid, false);
        // Garbage markers are corruption, not a newer vocabulary.
        for (const version of ['9', null, 1.5]) assert.equal(deferNewerTracking({ taskTracking: { schemaVersion: version } }, { valid: false, errors: ['taskTracking.schemaVersion: x'], warnings: [] }).valid, false);
    }),
    test('TC-TPT-249', 'while a migration progress record exists every read, save and preview answers migration in progress', async f => {
        const project = await earlierProject(f, { commit: true });
        f.write(vocabulary.journalPath('work'), JSON.stringify({ steps: [] }));
        const stored = f.storedState();
        const snapshot = f.progress();
        assert.equal(snapshot.coverage, 'unavailable'); assert.equal(snapshot.metrics, null); assert.deepEqual(snapshot.items, []);
        assert.deepEqual(codes(snapshot), ['MIGRATION_IN_PROGRESS']);
        assert.deepEqual([snapshot.vocabulary.project.state, snapshot.vocabulary.project.code, snapshot.vocabulary.project.reason], ['migrating', 'MIGRATION_IN_PROGRESS', vocabulary.REFUSALS.MIGRATION_IN_PROGRESS]);
        for (const preview of [false, true]) refused(await f.perform('create', 'TASK-new', { title: 'New work', intent: 'Capture a new outcome' }, preview ? { preview: true } : {}), 'MIGRATION_IN_PROGRESS');
        assert.throws(() => inspectRecords(f.context()), error => error.code === 'MIGRATION_IN_PROGRESS');
        // A commit holding the progress record answers the same; the commit made before it still reads.
        git(f, ['add', '--', 'work']); git(f, ['commit', '-m', 'Interrupted migration']);
        assert.deepEqual(codes(f.progress({ ref: 'HEAD' })), ['MIGRATION_IN_PROGRESS']);
        assert.deepEqual(numbers(f.progress({ ref: project.oid })), recorded(project));
        assert.deepEqual(f.storedState(), stored);
        // The stored read stays available to the migration that owns the progress record.
        assert.equal(inspectStoredRecords(f.context(), { version: 2 }).records.length, 6);
    }),
    test('TC-TPT-245', 'a save request written for the earlier vocabulary is refused whole and never carried out under the current meaning', async f => {
        await f.create('T'); assert.equal(f.progress().metrics.total, 1);
        const stored = f.storedState();
        const earlier = (operation, target, patch, extra = {}) => ({ schemaVersion: 2, operation, operationId: `earlier-${operation}-${target.itemId}`, target, actor: { memberId: 'owner' }, patch, ...extra });
        const current = f.record('T'); const expected = { expected: { revision: current.revision, contentHash: current.contentHash } };
        const requests = [
            // A group kind and the operation that gave a group its members: neither exists now.
            earlier('create', { kind: 'project', itemId: 'G' }, { title: 'A group of work', intent: 'Hold the work of one outcome' }),
            earlier('group', { kind: 'task', itemId: 'T' }, { memberItemIds: ['T'], groupRole: 'program' }, expected),
            // A request naming only unchanged words is still out of date as a whole.
            earlier('transition', { kind: 'task', itemId: 'T' }, { state: 'planned' }, expected),
            earlier('create', { kind: 'story', itemId: 'S' }, { title: 'A story', intent: 'Describe one slice' })];
        for (const request of [...requests, requests[0]]) {
            const result = await f.core.executeOperation(request, f.authority());
            refused(result, 'UNSUPPORTED'); assert.equal(result.primary.reason, vocabulary.REFUSALS.EARLIER_VOCABULARY_REQUEST);
            assert.match(result.primary.reason, /^Request uses the earlier vocabulary \(version 2\)/);
            refused(await f.core.executeOperation({ ...request, preview: true }, f.authority()), 'UNSUPPORTED');
        }
        assert.deepEqual(f.storedState(), stored); assert.equal(f.progress().metrics.total, 1); assert.deepEqual(f.progress().items.map(item => item.id), ['T']);
        // The same intent written for the current vocabulary creates one area, which the task then names itself.
        const saved = await f.saved('create', 'G', { title: 'A group of work', intent: 'Hold the work of one outcome' }, { target: { kind: 'area', itemId: 'G' } });
        assert.equal(saved.primary.ownerPath, 'work/areas/G.md'); await f.tag('T', { areaIds: ['G'] }); assert.equal(f.progress().metrics.total, 1);
        // A current request naming an earlier word is refused by the ordinary checks, with the prior state unchanged.
        refused(await f.perform('create', 'P', { title: 'A group', intent: 'Hold work' }, { target: { kind: 'project', itemId: 'P' } }), 'INVALID_INPUT');
        refused(await f.core.executeOperation({ ...f.request('update', 'T', {}), operation: 'group', patch: { memberItemIds: ['T'] } }, f.authority()), 'UNSUPPORTED');
        refused(await f.core.executeOperation({ ...f.request('update', 'T', { title: 'Later' }), schemaVersion: 5 }, f.authority()), 'UNSUPPORTED');
        assert.equal(f.view('T').title, 'Export selected rows');
    }),
    test('TC-TPT-245', 'a checkpoint request retained from before the vocabulary change is never replayed', async f => {
        await f.create('T'); f.write('src/export.js', 'export const saved = true;\n');
        const session = { root: f.root, sessionId: 'actual-session', actor: 'owner', producer: 'feature' };
        await upkeep.linkSession({ ...session, itemIds: ['T'] });
        const observation = { kind: 'saved', observedAt: OBSERVED_AT, summary: 'Observed source save', paths: ['src/export.js'] };
        // The retry state an earlier release left behind for this same checkpoint: a version-2 request.
        const operationId = `checkpoint-${hash(stableValue({ sessionId: session.sessionId, producer: session.producer, checkpointId: 'actual-checkpoint', itemId: 'T' })).slice(0, 48)}`;
        const record = f.record('T'); const bytes = f.bytes('T');
        f.write(`tmp/task-tracking/checkpoints/${operationId}.json`, JSON.stringify({ schemaVersion: 2, operation: 'activity', operationId, target: { kind: 'task', itemId: 'T' },
            expected: { revision: record.revision, contentHash: record.contentHash }, actor: { memberId: 'owner' }, patch: { observation } }));
        const primary = { status: 'saved', artifact: 'src/export.js', outcome: 'The source save succeeded' };
        const result = await upkeep.checkpoint({ ...session, checkpointId: 'actual-checkpoint', primary, observation });
        assert.deepEqual(result.primary, primary);
        assert.deepEqual(result.secondary.map(entry => [entry.status, entry.code]), [['pending', 'STALE_LINK']]);
        assert.deepEqual(f.bytes('T'), bytes);
        // A new checkpoint for the same work is recorded normally.
        const next = await upkeep.checkpoint({ ...session, checkpointId: 'next-checkpoint', primary, observation });
        assert.equal(next.secondary[0].status, 'saved'); assert.equal(f.record('T').tracking.activity.length, 1);
    }),
    test('TC-TPT-250', 'a record is flagged as earlier exactly when it carries the earlier mark or sits in an earlier-only location, so an unmarked record arriving in a location both vocabularies use is counted as what that location holds', async f => {
        // The fixture project declares the current vocabulary.
        assert.equal(f.context().config.taskTracking.schemaVersion, 3);
        await f.create('P1');
        assert.deepEqual(numbers(f.progress()), { total: 1, accepted: 0, remaining: 1, eligibleIds: ['P1'] });
        // An older branch brings three hand-written files.
        f.write('work/tasks/K-marked.md', earlierRecord('K-marked', 'task'));    // the earlier mark, in a location both vocabularies use
        f.write('work/projects/G-unmarked.md', untracked('G-unmarked'));        // no mark, in a location only the earlier vocabulary used
        f.write('work/tasks/K-unmarked.md', untracked('K-unmarked'));           // no mark, in a location both vocabularies use
        const snapshot = f.progress();
        assert.deepEqual([snapshot.vocabulary.project.state, snapshot.vocabulary.project.declared], ['current', true]);
        // The mark or the location is what shows a record to be earlier: those two are flagged and never counted.
        assert.deepEqual(snapshot.diagnostics.filter(finding => finding.code === 'EARLIER_VOCABULARY_RECORD').map(finding => [finding.itemId, finding.path]).sort(),
            [['G-unmarked', 'work/projects/G-unmarked.md'], ['K-marked', 'work/tasks/K-marked.md']]);
        // Nothing shows the third to be earlier. It is read as what its location holds, a task, and counted: the rule
        // flags by evidence, and an unmarked file among the tasks carries none. This is the stated limit of the rule.
        assert.deepEqual(snapshot.items.map(item => [item.id, item.kind]).sort(), [['K-unmarked', 'task'], ['P1', 'task']]);
        assert.deepEqual(numbers(snapshot), { total: 2, accepted: 0, remaining: 2, eligibleIds: ['K-unmarked', 'P1'] });
        assert.equal(snapshot.diagnostics.some(finding => finding.itemId === 'K-unmarked'), false);
    }),
    test('TC-TPT-250', 'an earlier-vocabulary record arriving in a current project is flagged, left out of every count and makes coverage incomplete', async f => {
        await f.create('P1'); await f.accepted('P1'); await f.create('P2');
        const before = f.progress(); assert.equal(before.coverage, 'complete'); assert.equal(before.metrics.percentage, 50);
        const views = JSON.stringify(before.items);
        // An older branch brings a task stamped for the earlier vocabulary, a group, and a file in a location of the first vocabulary.
        f.write('work/tasks/K2.md', earlierRecord('K2', 'task')); f.write('work/projects/G3.md', earlierRecord('G3', 'project', ', memberItemIds: [P1, P2], groupRole: program')); f.write('work/pbis/S3.md', untracked('S3'));
        const stored = f.storedState();
        git(f, ['init']); git(f, ['add', '--', 'docs', 'work']); git(f, ['commit', '-m', 'Combined with an older branch']);
        for (const snapshot of [f.progress(), f.progress({ ref: 'HEAD' })]) {
            assert.equal(snapshot.vocabulary.project.state, 'current');
            const flagged = snapshot.diagnostics.filter(finding => finding.code === 'EARLIER_VOCABULARY_RECORD');
            assert.deepEqual(flagged.map(finding => [finding.itemId, finding.path, finding.reason]).sort(), [['G3', 'work/projects/G3.md', 'Earlier-vocabulary record: not counted'],
                ['K2', 'work/tasks/K2.md', 'Earlier-vocabulary record: not counted'], ['S3', 'work/pbis/S3.md', 'Earlier-vocabulary record: not counted']]);
            assert.deepEqual(numbers(snapshot), { total: 2, accepted: 1, remaining: 1, eligibleIds: ['P1', 'P2'] });
            // The stray group is no initiative here and gives no task a link: only the project's own records are shown.
            assert.deepEqual(snapshot.items.map(item => item.id).sort(), ['P1', 'P2']); assert.deepEqual(snapshot.items.flatMap(item => item.links), []);
            // Incomplete coverage is stated; no complete percentage is presented.
            assert.equal(snapshot.coverage, 'partial'); assert.equal(snapshot.metrics.percentage, null);
        }
        assert.equal(JSON.stringify(f.progress().items), views);
        // A flagged record cannot be changed through the tracker, and nothing else is saved while coverage is incomplete.
        refused(await f.core.executeOperation({ schemaVersion: 3, operation: 'update', operationId: 'edit-flagged', target: { kind: 'task', itemId: 'K2' }, actor: { memberId: 'owner' },
            patch: { title: 'Changed title' }, expected: { revision: 1, contentHash: 'a'.repeat(64) } }, f.authority()), 'EARLIER_VOCABULARY_RECORD');
        refused(await f.perform('update', 'P2', { title: 'Changed title' }), 'INCOMPLETE_SCOPE');
        assert.deepEqual(f.storedState(), stored);
        // Once the team removes the stray records the next read counts normally again.
        fs.rmSync(path.join(f.root, 'work/tasks/K2.md')); fs.rmSync(path.join(f.root, 'work/projects'), { recursive: true }); fs.rmSync(path.join(f.root, 'work/pbis'), { recursive: true });
        const repaired = f.progress(); assert.equal(repaired.coverage, 'complete'); assert.equal(repaired.metrics.percentage, 50);
    }),
    test('TC-TPT-252', 'new work is stored, located, identified and reported in the current vocabulary', async f => {
        const created = {};
        for (const kind of ['initiative', 'task', 'subtask', 'story', 'area']) {
            created[kind] = (await f.saved('create', undefined, { title: `New ${kind}`, intent: 'Capture a new outcome' }, { target: { kind } })).primary;
        }
        const day = created.task.itemId.slice(5, 13);
        // Each new identity follows the current naming for its kind, in the current location for that kind.
        assert.deepEqual(Object.fromEntries(Object.entries(created).map(([kind, saved]) => [kind, [saved.itemId, saved.kind, saved.ownerPath]])), {
            initiative: [`initiative-${day}-0001`, 'initiative', `work/initiatives/initiative-${day}-0001.md`], task: [`task-${day}-0001`, 'task', `work/tasks/task-${day}-0001.md`],
            subtask: [`subtask-${day}-0001`, 'subtask', `work/subtasks/subtask-${day}-0001.md`], story: [`story-${day}-0001`, 'story', `work/tasks/stories/story-${day}-0001.md`],
            area: [`area-${day}-0001`, 'area', `work/areas/area-${day}-0001.md`] });
        const task = created.task.itemId;
        await f.tag(task, { areaIds: [created.area.itemId], initiativeIds: [created.initiative.itemId] });
        await f.saved('transition', task, { state: 'planned' });
        // Stored: the current words and the mark that says so; where work belongs is stored on the work, never as a list on the area.
        for (const saved of Object.values(created)) {
            const record = parseRecord(fs.readFileSync(path.join(f.root, saved.ownerPath)), saved.ownerPath, saved.kind);
            assert.equal(record.tracking.schemaVersion, 3); assert.equal(record.tracking.kind, saved.kind);
            assert.equal(EARLIER_WORD.test(record.text), false, saved.ownerPath);
        }
        assert.equal(f.record(task).data.status, 'planned');
        assert.deepEqual(f.record(task).tracking.links, [{ relation: 'area', itemId: created.area.itemId }, { relation: 'initiative', itemId: created.initiative.itemId }]);
        assert.deepEqual([f.record(created.area.itemId).tracking.links, f.record(created.area.itemId).data.status, f.record(created.initiative.itemId).tracking.type], [[], 'active', 'idea']);
        // Reported: only the task is delivery; the read states its own version.
        const snapshot = f.progress();
        assert.equal(snapshot.schemaVersion, 3); assert.equal(snapshot.coverage, 'complete');
        assert.deepEqual([snapshot.metrics.unit, snapshot.metrics.total, snapshot.metrics.eligibleIds], ['unique-task', 1, [task]]);
        assert.deepEqual([snapshot.scope.taskIds, snapshot.scope.eligibleTaskIds, snapshot.scope.excludedTaskIds, snapshot.hierarchy.untaggedTaskIds], [[task], [task], [], []]);
        assert.equal(snapshot.items.find(item => item.id === task).state, 'planned');
        assert.deepEqual(snapshot.hierarchy.labels, { levels: DEFAULT_LEVELS, types: { feedback: 'Feedback', idea: 'Idea', initiative: 'Initiative' } });
        assert.equal(snapshot.vocabulary.project.state, 'current'); assert.equal(snapshot.vocabulary.project.readOnly, false);
        assert.equal(EARLIER_WORD.test(JSON.stringify(snapshot)), false);
        // The words and labels every view uses come with the read and with discovery, and they agree.
        const catalogue = operationCatalogue(f.config); const { project, ...block } = snapshot.vocabulary;
        assert.deepEqual(block, catalogue.vocabulary);
        assert.deepEqual([block.version, block.kinds, block.states, block.levels, block.initiativeTypes, block.linkRoles, block.tagRoles, block.deliveryKind, block.areaKind, block.initiativeKind], [3,
            ['initiative', 'task', 'story', 'subtask', 'area'], ['draft', 'planned', 'ready', 'in_progress', 'blocked', 'verifying', 'done', 'canceled'], ['application', 'product', 'module', 'feature'],
            ['feedback', 'idea', 'initiative'], ['dependency', 'parent', 'area', 'initiative', 'spec', 'plan', 'source'], { area: 'area', initiative: 'initiative' }, 'task', 'area', 'initiative']);
        assert.deepEqual([block.groupRoles, block.groupKinds, block.labels.groupRoles], [undefined, undefined, undefined]);
        for (const [words, labels] of [[block.kinds, block.labels.kinds], [block.kinds, block.labels.kindsPlural], [block.levels, block.labels.levels], [block.initiativeTypes, block.labels.initiativeTypes], [block.linkRoles, block.labels.linkRoles]]) {
            assert.deepEqual(Object.keys(labels).sort(), [...words].sort());
        }
        assert.deepEqual([catalogue.kinds, catalogue.states, catalogue.linkRoles, catalogue.request.schemaVersion], [block.kinds, block.states, block.linkRoles, 3]);
        assert.equal(EARLIER_WORD.test(JSON.stringify(catalogue)), false);
    }),
    test('TC-TPT-338', 'a project that stores version 3 is never offered or given the state version 4 added, and each refusal names the declaration that allows it', async f => {
        // Given the fixture project, which declares version 3 as every project written before version 4 does
        await f.create('TASK-base');
        const stored = f.storedState();
        // Then discovery and every read name version 3 and list its eight delivery states, with no step into the added one
        const catalogue = operationCatalogue(f.config);
        for (const block of [catalogue.vocabulary, f.progress().vocabulary]) {
            assert.deepEqual([block.version, block.states, block.lifecycles.delivery.states, Object.keys(block.transitions.delivery)], [3, BASE_STATES, BASE_STATES, BASE_STATES]);
            assert.deepEqual(block.transitions.delivery, { draft: ['planned', 'canceled'], planned: ['ready', 'canceled'], ready: ['in_progress', 'canceled'],
                in_progress: ['blocked', 'verifying', 'canceled'], blocked: ['in_progress', 'verifying', 'canceled'], verifying: ['done', 'canceled'],
                done: ['planned', 'ready', 'in_progress', 'canceled'], canceled: [] });
        }
        assert.deepEqual([catalogue.states, catalogue.request.schemaVersion, f.progress().vocabulary.project.storedVersion], [BASE_STATES, 3, 3]);
        // And the status report draws no stop for the added state
        assert.deepEqual(reportStops(f.progress()), ['Draft', 'Planned', 'Ready', 'In progress', 'Verifying', 'Done']);
        // When the state is asked for as a usual step, as a state correction and in a request written at version 4, saved or previewed
        const asks = [[{ state: 'implemented' }, {}, {}], [{ state: 'implemented', correction: true, reason: 'Requested state correction' }, {}, { canCorrectState: true }],
            [{ state: 'implemented' }, { schemaVersion: 4 }, {}]];
        for (const [patch, request, authority] of asks) for (const preview of [false, true]) {
            const result = await f.perform('transition', 'TASK-base', patch, { ...request, ...(preview ? { preview: true } : {}) }, authority);
            // Then it is refused by name, with the declaration that allows it
            refused(result, 'UNSUPPORTED'); assert.equal(result.primary.reason, LATER_STATE);
        }
        // And a state of another kind's lifecycle keeps its ordinary refusal
        refused(await f.perform('transition', 'TASK-base', { state: 'approved' }), 'INVALID_TRANSITION');
        // A file that states it without tracking metadata is authored content: it raises no finding, and adopting it is refused the same way
        const authored = f.write('work/tasks/TASK-authored.md', '---\nid: TASK-authored\ntitle: Built elsewhere\nintent: Record what was built\nstatus: implemented\n---\nAuthored body retained.\n');
        assert.deepEqual([f.progress().coverage, codes(f.progress())], ['complete', []]);
        const adoption = await f.core.executeOperation({ ...f.request('adopt', 'TASK-authored', {}), preview: true }, f.authority());
        refused(adoption, 'UNSUPPORTED'); assert.equal(adoption.primary.reason, LATER_STATE);
        fs.rmSync(authored);
        assert.deepEqual(f.storedState(), stored, 'no refusal wrote a byte');
        // A version 4 request that names only version 3 words is carried out: the two versions share every request field
        await f.saved('update', 'TASK-base', { title: 'Renamed in a version 4 request' }, { schemaVersion: 4 });
        assert.deepEqual([f.view('TASK-base').title, f.record('TASK-base').tracking.schemaVersion], ['Renamed in a version 4 request', 3]);
    }),
    test('TC-TPT-339', 'declaring version 4 gives a project the added state without converting a record: version 3 records are read as stored and each is stamped 4 by its next save', async f => {
        // Given two records a version 3 project saved
        await f.create('TASK-kept'); await f.create('TASK-built', 'task', { criteria: [] });
        const before = f.storedState();
        assert.deepEqual([f.record('TASK-kept').tracking.schemaVersion, f.record('TASK-built').tracking.schemaVersion], [3, 3]);
        // When the project declares version 4
        f.declareVersion(4);
        // Then no record changed, every record is read and counted, and the state is offered
        assert.deepEqual(recordBytes(f.storedState()), recordBytes(before));
        const snapshot = f.progress();
        assert.deepEqual([snapshot.coverage, codes(snapshot), snapshot.metrics.total, snapshot.vocabulary.version, snapshot.vocabulary.project.state, snapshot.vocabulary.project.storedVersion],
            ['complete', [], 2, 4, 'current', 4]);
        const catalogue = operationCatalogue(f.config);
        assert.deepEqual([catalogue.states, catalogue.vocabulary.states, catalogue.vocabulary.transitions.delivery.implemented, catalogue.request.schemaVersion],
            [CURRENT_STATES, CURRENT_STATES, ['in_progress', 'verifying', 'canceled'], 4]);
        assert.deepEqual(reportStops(snapshot), ['Draft', 'Planned', 'Ready', 'In progress', 'Implemented', 'Verifying', 'Done']);
        // When one record takes the state, in a request written at version 3
        await f.saved('transition', 'TASK-built', { state: 'implemented' });
        // Then it holds the state and the version 4 stamp, and the untouched record keeps its stamp and its count
        assert.deepEqual([f.record('TASK-built').data.status, f.record('TASK-built').tracking.schemaVersion, f.record('TASK-kept').tracking.schemaVersion], ['implemented', 4, 3]);
        assert.deepEqual([f.progress().coverage, f.progress().metrics.total], ['complete', 2]);
        // And any later save stamps a record, and a record captured now starts with the stamp
        await f.saved('update', 'TASK-kept', { title: 'Renamed' }, { schemaVersion: 4 });
        await f.create('TASK-new');
        assert.deepEqual(['TASK-kept', 'TASK-new'].map(id => f.record(id).tracking.schemaVersion), [4, 4]);
        // The conversion from the earlier vocabulary has nothing to do here, whatever stamps the records carry
        assert.deepEqual([(await f.migrate({ dryRun: true })).code, f.storedState().length > 0], ['NOTHING_TO_MIGRATE', true]);
        // The pinned read of a commit follows the commit's own declaration
        git(f, ['init']); git(f, ['add', '--', 'docs', 'work']); git(f, ['commit', '-m', 'A version 4 project']);
        const pinned = f.progress({ ref: 'HEAD' });
        assert.deepEqual([pinned.coverage, pinned.metrics.total, pinned.vocabulary.project.storedVersion, pinned.items.find(item => item.id === 'TASK-built').state], ['complete', 3, 4, 'implemented']);
    }),
    test('TC-TPT-340', 'a version 3 project names every record it cannot hold, never counts it, and saves nothing until the project declares version 4 again', async f => {
        // Given a version 3 record, and three records a version 4 project then wrote
        await f.create('TASK-base');
        f.declareVersion(4);
        await f.create('TASK-stamped');
        for (const id of ['TASK-held', 'TASK-passed']) { await f.create(id, 'task', { criteria: [] }); await f.saved('transition', id, { state: 'implemented' }); }
        await f.saved('transition', 'TASK-passed', { state: 'canceled', reason: 'No longer needed' });
        // Two of them carry the version 3 stamp, as a record does that another copy wrote or a hand edited
        for (const id of ['TASK-held', 'TASK-passed']) {
            const record = f.record(id);
            f.write(record.ownerPath, patchRecord(record, {}, { ...record.tracking, schemaVersion: 3 }).bytes);
        }
        // Four records are read; the canceled one is not eligible work, so three are counted.
        assert.deepEqual([f.progress().coverage, f.progress().items.length, f.progress().metrics.total], ['complete', 4, 3]);
        // When the project declares version 3 again while they remain
        f.declareVersion(3);
        const stored = f.storedState();
        git(f, ['init']); git(f, ['add', '--', 'docs', 'work']); git(f, ['commit', '-m', 'A version 3 project holding version 4 records']);
        for (const snapshot of [f.progress(), f.progress({ ref: 'HEAD' })]) {
            // Then each is named with what makes it readable: the state it holds or held, or its stamp
            assert.equal(snapshot.coverage, 'partial');
            assert.deepEqual(snapshot.diagnostics.map(finding => [finding.path, finding.code, finding.reason]).sort(), [
                ['work/tasks/TASK-held.md', 'LATER_VOCABULARY_RECORD', LATER_STATE], ['work/tasks/TASK-passed.md', 'LATER_VOCABULARY_RECORD', LATER_STATE],
                ['work/tasks/TASK-stamped.md', 'LATER_VOCABULARY_RECORD', LATER_STAMP]]);
            assert.deepEqual(snapshot.diagnostics.map(finding => finding.itemId).sort(), ['TASK-held', 'TASK-passed', 'TASK-stamped']);
            // And only the record the version holds is counted
            assert.deepEqual([snapshot.items.map(item => item.id), snapshot.vocabulary.project.storedVersion, snapshot.vocabulary.states], [['TASK-base'], 3, BASE_STATES]);
        }
        // And nothing is saved while they remain
        refused(await f.perform('update', 'TASK-base', { title: 'Renamed' }), 'INCOMPLETE_SCOPE');
        refused(await f.perform('create', 'TASK-more', { title: 'More work', intent: 'Capture another outcome' }), 'INCOMPLETE_SCOPE');
        assert.deepEqual(f.storedState(), stored);
        // When the project declares version 4 again, Then every record is read and counted as it was
        f.declareVersion(4);
        assert.deepEqual([f.progress().coverage, codes(f.progress()), f.progress().items.length, f.progress().metrics.total], ['complete', [], 4, 3]);
    }),
    test('TC-TPT-248', 'the stored read hands migration every record in the words it stores, whatever state the project is in', async f => {
        const project = await earlierProject(f);
        const raw = inspectStoredRecords(f.context());
        assert.equal(raw.coverage, 'complete'); assert.deepEqual(raw.diagnostics, []);
        assert.deepEqual(Object.fromEntries(raw.records.map(record => [record.id, [record.kind, record.storedVersion, record.data.status]])), { [project.ids.accepted]: ['task', 2, 'done'],
            [project.ids.remaining]: ['task', 2, 'planned'], [project.ids.supporting]: ['subtask', 2, 'draft'], [project.ids.intent]: ['initiative', 2, 'draft'], [project.ids.story]: ['story', 2, 'draft'], [project.ids.group]: ['project', 2, 'draft'] });
        const byId = id => raw.records.find(record => record.id === id);
        // As stored: the group holds its list and its purpose, and the records it lists hold no link to it.
        assert.deepEqual([byId(project.ids.group).tracking.memberItemIds, byId(project.ids.group).tracking.groupRole], [[project.ids.accepted, project.ids.remaining], 'program']);
        assert.deepEqual([byId(project.ids.accepted).tracking.links, byId(project.ids.remaining).tracking.links, byId(project.ids.intent).tracking.type], [[{ relation: 'initiative', itemId: project.ids.intent }], [], undefined]);
        assert.deepEqual(byId(project.ids.supporting).tracking.links.filter(link => link.path).map(link => link.path),
            ['work/tasks/PBI-1.md', 'work/subtasks/TASK-K.md', 'work/initiatives/IDEA-D.md', 'work/projects/EPIC-E.md', 'work/tasks/stories/STORY-S.md']);
        assert.ok(byId(project.ids.group).tracking.receipts.every(receipt => receipt.result.kind === 'project' && receipt.result.ownerPath === 'work/projects/EPIC-E.md'));
        // A record read in the current terms is never a base for writing; the stored one is.
        assert.throws(() => patchRecord(f.record(project.ids.remaining), { status: 'ready' }, {}), error => error.code === 'MIGRATION_REQUIRED');
        // A record already rewritten in the current terms is handed over as stored too, and is told apart by its stamp.
        const source = byId(project.ids.remaining);
        const rewritten = patchRecord(source, {}, { schemaVersion: 3, links: [{ relation: 'initiative', itemId: project.ids.group }] });
        assert.equal(rewritten.body, source.body); assert.equal(rewritten.id, source.id); assert.equal(rewritten.revision, source.revision);
        fs.writeFileSync(path.join(f.root, source.ownerPath), rewritten.bytes);
        const partly = inspectStoredRecords(f.context(), { version: 2 });
        assert.deepEqual(partly.diagnostics, []);
        assert.deepEqual(partly.records.filter(record => record.storedVersion === 3).map(record => [record.id, record.kind, record.data.status]), [[project.ids.remaining, 'task', 'planned']]);
        assert.equal(partly.records.filter(record => record.storedVersion === 2).length, 5);
        // To every reader such a half-written project is not whole: the record stamped current is named, never mapped twice.
        assert.deepEqual(f.progress().diagnostics.filter(finding => finding.path === source.ownerPath).map(finding => finding.code), ['UNSUPPORTED']);
    }),
    test('TC-TPT-248', 'a record without tracking metadata can have its recorded state rewritten without gaining tracking metadata', async f => {
        f.config.taskTracking.schemaVersion = 2; f.saveConfig();
        const original = '---\nid: LEGACY\ntitle: "Hand-written work" # authored comment\nintent: Keep an authored outcome\nstatus: planned\nowner_note: keep\n---\n# Authored body\nKept exactly.\n';
        f.write('work/projects/LEGACY.md', original);
        // Read in the current terms while the project stores the earlier vocabulary: a group with no purpose is an active area.
        assert.deepEqual([f.view('LEGACY').state, f.view('LEGACY').kind, f.view('LEGACY').legacy, f.view('LEGACY').level], ['active', 'area', true, null]);
        const [source] = inspectStoredRecords(f.context()).records;
        assert.deepEqual([source.storedVersion, source.kind, source.data.status], [null, 'project', 'planned']);
        const rewritten = patchRecord({ ...source, kind: 'area' }, { status: 'active' }, {});
        assert.equal(rewritten.bytes.toString(), original.replace('status: planned', 'status: "active"'));
        assert.equal(rewritten.tracking, null); assert.equal(rewritten.body, source.body);
    }),
    test('TC-TPT-261', 'a kind label is display text only and may never be another word of either vocabulary', async f => {
        await f.create('INITIATIVE-1', 'initiative'); await f.create(); const before = f.progress();
        // Every label inside the rule is accepted and shown for that kind alone; the words stored and requested stay the tracker's.
        for (const label of ['Proposal', 'x'.repeat(160), '<b>Proposal</b>', 'Initiative', ' Proposal ']) {
            f.config.taskTracking.kindLabels = { initiative: label }; f.saveConfig();
            const read = f.progress(); assert.equal(read.coverage, 'complete', label);
            assert.equal(read.vocabulary.labels.kinds.initiative, label.trim()); assert.equal(read.vocabulary.labels.kinds.task, 'Task');
            // The link relation that carries the kind's word is shown under the same label; the relation word itself stays.
            assert.equal(read.vocabulary.labels.linkRoles.initiative, label.trim()); assert.deepEqual(read.vocabulary.linkRoles, before.vocabulary.linkRoles);
            assert.deepEqual(read.vocabulary.kinds, before.vocabulary.kinds); assert.deepEqual(read.metrics, before.metrics);
            assert.equal(f.view('INITIATIVE-1').kind, 'initiative');
        }
        for (const label of ['Task', 'Tasks', ' task ', 'TASKS', 'Delivery outcome']) {
            f.config.taskTracking.kindLabels = { task: label }; f.saveConfig();
            const read = f.progress();
            assert.equal(read.coverage, 'complete', label);
            assert.equal(read.vocabulary.labels.kinds.task, label.trim());
            assert.deepEqual(read.metrics, before.metrics);
            assert.deepEqual(read.vocabulary.kinds, before.vocabulary.kinds);
        }
        // Earlier defaults remain reserved in current projects, including spelling variants that are not raw kind words.
        for (const label of ['Project group', 'Project groups', 'Visions']) for (const spelling of [label, label.toUpperCase(), ` ${label.toLowerCase()} `]) {
            const labels = { task: spelling };
            assert.ok(vocabulary.kindLabelErrors(labels, 3).length > 0, spelling);
            f.config.taskTracking.kindLabels = labels; f.saveConfig();
            const read = f.progress();
            assert.equal(read.coverage, 'unavailable', spelling);
            assert.deepEqual(read.items, []);
            assert.equal(read.diagnostics[0].code, 'INVALID_CONFIG');
        }
        // Any other word or default label of either vocabulary, whatever its letter case, would make two things answer to one
        // name: another kind, a group kind or purpose of the earlier vocabulary, a level, a type, a state or a link relation.
        for (const labels of [{ subtask: 'Task' }, { subtask: ' task ' }, { subtask: 'TASKS' }, { task: 'Project' }, { task: 'vision' }, { initiative: 'Idea' }, { story: 'Area' },
            { initiative: 'Program' }, { task: 'Feature' }, { task: 'capability' }, { story: 'Domain' }, { task: 'Planned' }, { task: 'Approved' }, { subtask: 'In progress' }, { subtask: 'Parent' }, { story: 'Depends on' }, { task: 'Initiative' }, { task: 'High' },
            { initiative: 'Proposal', story: 'proposal' }, { initiative: '' }, { initiative: '   ' }, { initiative: 'x'.repeat(161) }, { initiative: 'Line\nbreak' }, { initiative: 7 }, { proposal: 'Proposal' }, { project: 'Workstream' }]) {
            assert.ok(vocabulary.kindLabelErrors(labels).length > 0, JSON.stringify(labels));
            f.config.taskTracking.kindLabels = labels; f.saveConfig();
            const refused = f.progress(); assert.equal(refused.coverage, 'unavailable', JSON.stringify(labels)); assert.deepEqual(refused.items, []);
            assert.equal(refused.diagnostics[0].code, 'INVALID_CONFIG');
        }
        // Removing the labels shows the current words again, with the same work as before.
        delete f.config.taskTracking.kindLabels; f.saveConfig();
        assert.equal(f.progress().vocabulary.labels.kinds.initiative, 'Initiative'); assert.equal(f.progress().vocabulary.labels.linkRoles.initiative, 'Initiative'); assert.deepEqual(f.progress().metrics, before.metrics);
    }),
    test('TC-TPT-242', 'the working copy and a pinned commit of an earlier project state the same thing: every former group as the area or initiative it becomes, holding the tasks its list held, and nothing is written', async f => {
        const project = await earlierProject(f, { commit: true, groups: [
            { id: 'PRODUCT', kind: 'vision', purpose: 'area', members: ['MODULE', 'FEATURE'] }, { id: 'MODULE', kind: 'vision', purpose: 'area', members: ['FEATURE-NESTED'] },
            { id: 'FEATURE', purpose: 'capability', members: ['PBI-1', 'TASK-K', 'FEATURE-NESTED', 'IDEA-D'] }, { id: 'FEATURE-NESTED', purpose: 'capability', members: ['PBI-2'] },
            { id: 'PLANNED', purpose: 'program', status: 'planned', members: ['FEATURE-NESTED', 'PBI-1'] }] });
        const stored = f.storedState();
        const local = f.progress({ figures: true }); const pinned = f.progress({ ref: project.oid, figures: true });
        for (const snapshot of [local, pinned]) {
            assert.equal(snapshot.coverage, 'complete', JSON.stringify(snapshot.diagnostics)); assert.deepEqual(snapshot.diagnostics, []);
            assert.deepEqual([snapshot.vocabulary.project.state, snapshot.vocabulary.project.code], ['earlier', 'MIGRATION_REQUIRED']);
            // Stated in the current terms: levels from the purposes, the planned finite outcome approved, the proposal placed in its feature.
            assert.deepEqual(snapshot.hierarchy.areas.map(area => [area.id, area.level, area.parentAreaIds]), [['PRODUCT', 'product', []], ['MODULE', 'module', ['PRODUCT']], ['FEATURE', 'feature', ['PRODUCT']], ['FEATURE-NESTED', 'feature', ['FEATURE', 'MODULE']]]);
            assert.deepEqual(['PLANNED', 'EPIC-E', 'IDEA-D'].map(id => { const item = snapshot.items.find(value => value.id === id); return [item.kind, item.type, item.state]; }), [['initiative', 'initiative', 'approved'], ['initiative', 'initiative', 'draft'], ['initiative', 'idea', 'draft']]);
            // Each former group holds the tasks its list held, each task once.
            assert.deepEqual(Object.fromEntries([...snapshot.figures.areas, ...snapshot.figures.initiatives].map(row => [row.id, [row.total, row.accepted]])),
                { 'PRODUCT': [2, 1], 'MODULE': [1, 0], 'FEATURE': [2, 1], 'FEATURE-NESTED': [1, 0], 'EPIC-E': [2, 1], 'IDEA-D': [1, 1], 'PLANNED': [2, 1] });
            assert.deepEqual(numbers(snapshot), recorded(project)); assert.deepEqual(snapshot.hierarchy.untaggedTaskIds, []);
        }
        assert.deepEqual(stated(pinned), stated(local));
        // One area or initiative read by itself, from either source, is the same scope.
        for (const [id, held] of [['PRODUCT', ['PBI-1', 'PBI-2']], ['MODULE', ['PBI-2']], ['PLANNED', ['PBI-1', 'PBI-2']]]) for (const ref of [undefined, project.oid]) assert.deepEqual(f.progress({ scopeId: id, ref }).metrics.eligibleIds, held, `${id} ${ref ? 'pinned' : 'local'}`);
        assert.deepEqual(f.storedState(), stored); assert.equal(git(f, ['status', '--porcelain', '--', 'work', 'docs']), '');
    }),
    test('TC-TPT-326', 'a project in the first vocabulary is refused by name on every read and save, declared or recognised by its locations, from the working copy and from a pinned commit', async f => {
        const arrangements = [['declared', () => { f.config.taskTracking.schemaVersion = 1; f.saveConfig(); f.write('work/tasks/OLD-1.md', firstRecord('OLD-1')); }, true, [], /\(declared version 1\)$/],
            ['recognised by its locations', () => { delete f.config.taskTracking; f.saveConfig(); f.write('work/pbis/OLD-2.md', firstRecord('OLD-2')); }, false, ['pbis'], /\(locations: pbis\)$/]];
        git(f, ['init']);
        for (const [name, arrange, declared, locations, detail] of arrangements) {
            arrange();
            const stored = f.storedState();
            git(f, ['add', '--', 'docs', 'work']); git(f, ['commit', '-m', `First vocabulary, ${name}`]);
            for (const snapshot of [f.progress(), f.progress({ ref: 'HEAD' }), f.progress({ scopeId: 'OLD-1' })]) {
                assert.deepEqual([snapshot.coverage, snapshot.metrics, snapshot.items, codes(snapshot)], ['unavailable', null, [], ['UNSUPPORTED_VOCABULARY']], name);
                // Named with what to do next: this copy neither reads nor migrates it.
                assert.match(snapshot.diagnostics[0].reason, /^Unsupported vocabulary: this project stores the first vocabulary, which this copy of the tracker neither reads nor migrates; upgrade it with a framework copy that supports the first vocabulary, then run the tracker migration /);
                assert.match(snapshot.diagnostics[0].reason, detail, name);
                assert.deepEqual(snapshot.vocabulary.project, { state: 'unsupported', storedVersion: null, declared, readOnly: true, code: 'UNSUPPORTED_VOCABULARY', reason: snapshot.diagnostics[0].reason,
                    earlierLocations: [], currentLocations: [], retiredLocations: locations }, name);
            }
            for (const preview of [false, true]) refused(await f.perform('create', 'TASK-new', { title: 'New work', intent: 'Capture a new outcome' }, preview ? { preview: true } : {}), 'UNSUPPORTED_VOCABULARY');
            assert.throws(() => inspectRecords(f.context()), error => error.code === 'UNSUPPORTED_VOCABULARY');
            assert.deepEqual(f.storedState(), stored, name);
        }
        // Boundary: a project that declares the current vocabulary only has such a file flagged; it is read as usual.
        f.config.taskTracking = { schemaVersion: 3 }; f.saveConfig();
        const current = f.progress();
        assert.deepEqual([current.vocabulary.project.state, current.vocabulary.project.retiredLocations], ['current', ['pbis']]);
        assert.deepEqual(current.diagnostics.filter(finding => finding.code === 'EARLIER_VOCABULARY_RECORD').map(finding => finding.path).sort(), ['work/pbis/OLD-2.md', 'work/tasks/OLD-1.md']);
    }),
    test('TC-TPT-250', 'a file of the first vocabulary inside an earlier project is named and never counted, and the project\'s own records are still read in the current terms, locally and pinned', async f => {
        const project = await earlierProject(f);
        f.write('work/pbis/OLD.md', firstRecord('OLD')); f.write('work/epics/E.md', untracked('E'));
        const stored = f.storedState();
        git(f, ['init']); git(f, ['add', '--', 'docs', 'work']); git(f, ['commit', '-m', 'Earlier project holding older files']);
        for (const snapshot of [f.progress(), f.progress({ ref: 'HEAD' })]) {
            // Declared as the earlier vocabulary, so those locations do not decide what the project stores.
            assert.deepEqual([snapshot.vocabulary.project.state, snapshot.vocabulary.project.retiredLocations], ['earlier', ['pbis', 'epics']]);
            assert.deepEqual(snapshot.diagnostics.map(finding => [finding.code, finding.path, finding.itemId]).sort(), [['EARLIER_VOCABULARY_RECORD', 'work/epics/E.md', 'E'], ['EARLIER_VOCABULARY_RECORD', 'work/pbis/OLD.md', undefined]]);
            assert.deepEqual(snapshot.items.map(item => item.id).sort(), Object.values(project.ids).sort());
            assert.deepEqual(numbers(snapshot), recorded(project));
            assert.deepEqual([snapshot.coverage, snapshot.metrics.percentage], ['partial', null]);
        }
        assert.deepEqual(f.storedState(), stored);
    }),
    test('TC-TPT-261', 'a kind label of a project that declares the earlier vocabulary is judged by the words that vocabulary had: the project stays readable, a label the current vocabulary uses for something else is not shown, and a word of the earlier vocabulary stays refused by field', async f => {
        const project = await earlierProject(f);
        const borrowed = (kind, label, of) => `taskTracking.kindLabels.${kind}: kind label invalid (${JSON.stringify(label)} is a word or a default label of the ${of} vocabulary)`;
        // A level, a type, a state and a priority are words only the current vocabulary has: each was free when the label was declared.
        for (const [kind, label] of [['task', 'Module'], ['task', 'product'], ['task', 'Application'], ['story', 'Approved'], ['story', 'Committed'], ['subtask', 'ACTIVE'], ['subtask', 'High'], ['initiative', 'Feedback'], ['task', 'Idea']]) {
            assert.deepEqual([vocabulary.kindLabelErrors({ [kind]: label }, 2), vocabulary.kindLabelErrors({ [kind]: label }, 3)], [[], [borrowed(kind, label, 'current')]], label);
            const other = kind === 'story' ? 'subtask' : 'story';
            f.config.taskTracking.kindLabels = { [kind]: label, [other]: 'Narrative' }; f.saveConfig();
            const read = f.progress();
            assert.deepEqual([read.coverage, read.diagnostics, read.vocabulary.project.code, numbers(read)], ['complete', [], 'MIGRATION_REQUIRED', recorded(project)], label);
            // In the current terms that label would name two things, so the kind keeps its current word; a label that collides with nothing is shown.
            assert.deepEqual([read.vocabulary.labels.kinds[kind], read.vocabulary.labels.kindsPlural[kind], read.vocabulary.labels.kinds[other]], [vocabulary.LABELS.kinds[kind], vocabulary.LABELS.kindsPlural[kind], 'Narrative'], label);
            assert.equal(read.vocabulary.labels.linkRoles.initiative, 'Initiative');
        }
        // A label on a kind only the earlier vocabulary has is a valid declaration of such a project, and nothing shows it.
        f.config.taskTracking.kindLabels = { project: 'Workstream', vision: 'Product' }; f.saveConfig();
        assert.deepEqual([vocabulary.kindLabelErrors(f.config.taskTracking.kindLabels, 2), f.progress().coverage, f.progress().vocabulary.labels.kinds], [[], 'complete', { ...vocabulary.LABELS.kinds }]);
        // What the earlier vocabulary itself used stays refused: a kind, a group purpose, a state, a relation or a default label of its own, a repeated label and a kind it never had.
        for (const [labels, errors] of [[{ task: 'Vision' }, [borrowed('task', 'Vision', 'earlier')]], [{ story: 'Feature' }, [borrowed('story', 'Feature', 'earlier')]], [{ subtask: 'capability' }, [borrowed('subtask', 'capability', 'earlier')]],
            [{ task: 'Project groups' }, [borrowed('task', 'Project groups', 'earlier')]], [{ initiative: 'Planned' }, [borrowed('initiative', 'Planned', 'earlier')]], [{ task: 'Depends on' }, [borrowed('task', 'Depends on', 'earlier')]],
            [{ task: 'Proposal', story: 'proposal' }, ['taskTracking.kindLabels.story: kind label invalid ("proposal" repeats the label of another kind)']], [{ area: 'Zone' }, ['taskTracking.kindLabels.area: unknown field']],
            [{ task: '  ' }, ['taskTracking.kindLabels.task: kind label invalid (a label is nonblank text of at most 160 characters without control characters)']]]) {
            assert.deepEqual(vocabulary.kindLabelErrors(labels, 2), errors, JSON.stringify(labels));
            f.config.taskTracking.kindLabels = labels; f.saveConfig();
            const unread = f.progress();
            // The reason names the field, the label and what the label collides with, on every surface that shows a reason.
            assert.deepEqual([unread.coverage, unread.items, unread.diagnostics.map(finding => [finding.code, finding.reason])], ['unavailable', [], [['INVALID_CONFIG', `Project configuration is invalid: ${errors.join('; ')}`]]], JSON.stringify(labels));
        }
        delete f.config.taskTracking.kindLabels; f.saveConfig();
        assert.deepEqual([f.progress().coverage, numbers(f.progress())], ['complete', recorded(project)]);
    })
] };
