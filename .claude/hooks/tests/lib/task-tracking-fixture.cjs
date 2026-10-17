'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { createTempDir, cleanupTempDir, createEnvSaver } = require('./test-utils.cjs');
const core = require('../../lib/task-tracking.cjs');
const { trackingContext } = require('../../lib/task-tracking-config.cjs');
const { inspectRecords, parseRecord } = require('../../lib/task-artifact-store.cjs');
const { identities, bindRecordContext } = require('../../lib/task-tracking-policy.cjs');
const { readProgress } = require('../../lib/task-progress-reader.cjs');

const CRITERIA = [{ id: 'selected-rows', text: 'Export contains exactly the selected rows' }];
const OBSERVED_AT = '2026-01-02T00:00:00.000Z';

// Each test owns its whole adopter checkout. No authoring-repository metadata is copied.
async function withFixture(callback) {
    const temporaryRoot = createTempDir('tracking-adopter-');
    const root = fs.realpathSync(temporaryRoot);
    const neutralKeys = new Set(['HOME', 'USERPROFILE', 'TMPDIR', 'TEMP', 'TMP', 'NODE_OPTIONS', 'CLAUDE_PROJECT_DIR', 'CK_NO_AUTO_OPEN', 'CK_AUTO_INSTALL_DEPENDENCIES',
        ...Object.keys(process.env).filter(key => /^(CK_|CLAUDE_|CODEX_|OPENCODE_)|TOKEN|SECRET|API_KEY/.test(key))]);
    const environment = createEnvSaver();
    environment.save([...neutralKeys]);
    for (const key of neutralKeys) delete process.env[key];
    for (const key of ['HOME', 'USERPROFILE', 'TMPDIR', 'TEMP', 'TMP']) process.env[key] = root;
    process.env.CLAUDE_PROJECT_DIR = root;
    // A tracker command installs its missing package by itself. No test, in this process or a child, may reach the
    // registry or write into the bundle: a copy without its package must refuse, not repair itself mid-suite.
    process.env.CK_AUTO_INSTALL_DEPENDENCIES = '0';
    let counter = 0;
    const fixture = {
        root, core,
        config: { project: { name: 'Fixture workspace' }, docsRoots: { teamArtifacts: { path: 'work' } },
            taskTracking: { schemaVersion: 3, mode: 'linked', members: [
                { id: 'owner', displayName: 'Owner', active: true, aliases: ['Previous owner'] },
                { id: 'peer', displayName: 'Peer', active: true },
                { id: 'inactive', displayName: 'Inactive', active: false }
            // The fixture project asks for the full version by name, so that cases about record detail read it as page
            // content. Cases about the default remove this key.
            ], report: { enabled: true, autoRefresh: false, detail: 'full' } } },
        write(relative, value) {
            const target = path.join(root, relative);
            fs.mkdirSync(path.dirname(target), { recursive: true });
            fs.writeFileSync(target, value);
            return target;
        },
        saveConfig() { this.write('docs/project-config.json', JSON.stringify(this.config)); },
        // The fixture project stores the base version of the current structure, as every project written before the
        // current version does. A case about what the current version added declares it first.
        declareVersion(version) { this.config.taskTracking.schemaVersion = version; this.saveConfig(); },
        context() { return trackingContext(root); },
        records() { return inspectRecords(this.context()).records; },
        record(id) {
            const matches = this.records().filter(record => record.id === id);
            assert.equal(matches.length, 1, `Expected one canonical owner for ${id}`);
            return matches[0];
        },
        bytes(id) { return fs.readFileSync(path.join(root, this.record(id).ownerPath)); },
        progress(options) { return readProgress(root, options); },
        // Every stored byte of the record root and the project configuration, for "nothing changed" assertions.
        storedState() {
            const found = [];
            const visit = relative => {
                for (const entry of fs.readdirSync(path.join(root, relative), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
                    const child = `${relative}/${entry.name}`;
                    if (entry.isDirectory()) { found.push([`${child}/`, 'directory']); visit(child); }
                    else found.push([child, crypto.createHash('sha256').update(fs.readFileSync(path.join(root, child))).digest('hex')]);
                }
            };
            for (const top of ['work', 'docs']) if (fs.existsSync(path.join(root, top))) visit(top);
            return found;
        },
        view(id) { return this.progress().items.find(item => item.id === id); },
        authority(overrides = {}) { return { root, actor: 'owner', canWrite: true, canReview: true, canAccept: true, canRecordManual: true, canDecide: true, ...overrides }; },
        request(operation, id, patch, overrides = {}) {
            const record = operation === 'create' ? null : this.record(id);
            return { schemaVersion: 3, operation, operationId: `operation-${++counter}`,
                target: { kind: record?.kind || 'task', ...(id ? { itemId: id } : {}) }, actor: { memberId: 'owner' }, patch,
                ...(record ? { expected: { revision: record.revision, contentHash: record.contentHash } } : {}), ...overrides };
        },
        async perform(operation, id, patch, requestOverrides = {}, authorityOverrides = {}) {
            return core.executeOperation(this.request(operation, id, patch, requestOverrides), this.authority(authorityOverrides));
        },
        async saved(operation, id, patch, requestOverrides = {}, authorityOverrides = {}) {
            const result = await this.perform(operation, id, patch, requestOverrides, authorityOverrides);
            assert.equal(result.primary.status, 'saved', JSON.stringify(result.primary));
            return result;
        },
        async create(id = 'TASK-101', kind = 'task', patch = {}) {
            return this.saved('create', id, { title: 'Export selected rows', intent: 'Let an operator export a selected subset', criteria: CRITERIA, ...patch }, { target: { kind, ...(id ? { itemId: id } : {}) } });
        },
        async ready(id = 'TASK-101') {
            await this.saved('transition', id, { state: 'planned' });
            await this.saved('transition', id, { state: 'ready', readiness: { reviewed: true, decisionsResolved: true } });
        },
        async active(id = 'TASK-101') {
            await this.saved('assign', id, { assigneeId: 'owner' });
            await this.ready(id);
            await this.saved('transition', id, { state: 'in_progress' });
        },
        async verifying(id = 'TASK-101') { await this.active(id); await this.saved('transition', id, { state: 'verifying' }); },
        proof(id = 'TASK-101', overrides = {}) {
            const context = this.context(); const { records } = inspectRecords(context);
            const matches = records.filter(record => record.id === id);
            assert.equal(matches.length, 1, `Expected one canonical owner for ${id}`);
            const { criteriaIds, criteriaIdentity, sourceIdentity } = identities(matches[0], bindRecordContext(context, records));
            return { id: `proof-${++counter}`, kind: 'manual', result: 'passed', observedAt: OBSERVED_AT,
                criteriaIds, criteriaIdentity, sourceIdentity, summary: 'Observed the selected rows outcome', ...overrides };
        },
        async accepted(id = 'TASK-101') {
            await this.verifying(id);
            const proof = this.proof(id);
            await this.saved('proof', id, { proof });
            await this.saved('accept', id, { reason: 'Observed criteria are accepted' });
        },
        // Runs the vocabulary migration on this project as a person who has a backup would: a fixture project sits outside
        // version control unless a case commits it, and there a run starts only on that confirmation. A case about the
        // confirmation itself passes `backupConfirmed: false`. Options are the migration's own: dryRun, abandon, checkpoint.
        async migrate(options = {}) { return require('../../lib/task-tracking-migration.cjs').migrate(root, { backupConfirmed: true, ...options }); },
        // Replaces only the area or initiative links the patch names: { areaIds, initiativeIds }.
        async tag(id, patch) { return this.saved('tag', id, patch); },
        // An initiative taken through its two decisions: approved, then committed.
        async committed(id) {
            await this.saved('transition', id, { state: 'approved' });
            await this.saved('transition', id, { state: 'committed' });
        }
    };
    try {
        // Config loaders may capture the personal home at module import. Pin the
        // fixture's owner explicitly instead of disabling personal precedence.
        fixture.write('.claude/.ck.local.json', JSON.stringify({ portability: { projectConfigPath: 'docs/project-config.json' } }));
        fixture.saveConfig();
        return await callback(fixture);
    }
    finally {
        environment.restore();
        cleanupTempDir(temporaryRoot);
    }
}

function trackingTest(caseId, intent, callback) {
    return { name: `${caseId}: ${intent}`, TestSpec: caseId, fn: () => withFixture(callback) };
}

function refused(result, code) {
    assert.equal(result.primary.status, 'refused', JSON.stringify(result.primary));
    if (code) assert.equal(result.primary.code, code);
}

// Literal Git commands operate only on the disposable adopter root supplied by a test.
function git(fixture, args) {
    const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^GIT_/i.test(key)));
    Object.assign(env, { GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: process.platform === 'win32' ? 'NUL' : '/dev/null', GIT_TERMINAL_PROMPT: '0' });
    const result = spawnSync('git', ['--no-pager', '-C', fixture.root, '-c', 'core.hooksPath=', '-c', 'core.fsmonitor=false',
        '-c', 'commit.gpgSign=false', '-c', 'user.name=Fixture author', '-c', 'user.email=fixture@example.invalid', ...args],
    { env, shell: false, encoding: 'utf8', timeout: 10000, maxBuffer: 2 * 1024 * 1024 });
    assert.equal(result.error, undefined, result.error?.message); assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
}

// The earlier vocabulary, spelled out as test data. It is deliberately independent of the vocabulary owner and of the
// mapping to the current terms: a project built from the owner's own words would still read correctly after they broke.
const EARLIER_WORDS = Object.freeze({
    version: 2,
    // Where each kind was kept. Groups had their own two locations; every other kind is kept where it still is.
    folders: { task: 'tasks', subtask: 'subtasks', initiative: 'initiatives', story: 'tasks/stories', project: 'projects', vision: 'visions' },
    groupKinds: ['project', 'vision'],
    groupRoles: ['area', 'domain', 'capability', 'program'],
    // The two tracking values a group held, and the values a record of the earlier vocabulary never held.
    memberField: 'memberItemIds', purposeField: 'groupRole',
    absent: ['level', 'type', 'priorityLevel', 'deadline']
});
const EARLIER_IDS = Object.freeze({ accepted: 'PBI-1', remaining: 'PBI-2', supporting: 'TASK-K', intent: 'IDEA-D', story: 'STORY-S', group: 'EPIC-E' });

const earlierHeader = (header, body) => `---\n${Object.entries(header).map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join('\n')}\n---\n${body}`;
/**
 * A group record as an earlier release saved it: captured, then given its members and purpose, then taken to its state
 * when that is not draft, with one history entry and one receipt per save.
 */
function earlierGroup({ id, kind = 'project', purpose = null, members = [], status = 'draft' }) {
    const ownerPath = `work/${EARLIER_WORDS.folders[kind]}/${id}.md`;
    const saves = [['create', 'draft', 'draft'], ['group', 'draft', 'draft'], ...(status === 'draft' ? [] : [['transition', 'draft', status]])];
    const operationId = operation => `earlier-${operation}-${id}`;
    const tracking = { schemaVersion: EARLIER_WORDS.version, revision: saves.length, kind, assigneeId: null, collaboratorIds: [], criteria: CRITERIA, links: [], proofs: [], acceptanceHistory: [],
        history: saves.map(([operation, beforeState, afterState]) => ({ operationId: operationId(operation), operation, actor: 'owner', at: OBSERVED_AT, beforeState, afterState,
            beforeAssigneeId: null, afterAssigneeId: null, reason: null, context: { operationId: operationId(operation), kind: 'direct' } })),
        receipts: saves.map(([operation], index) => ({ operationId: operationId(operation), digest: crypto.createHash('sha256').update(operationId(operation)).digest('hex'), afterRevision: index + 1,
            result: { status: 'saved', operationId: operationId(operation), itemId: id, kind, ownerPath, revision: index + 1 } })),
        optOut: false, retired: null, context: { operationId: operationId(saves.at(-1)[0]), kind: 'direct' },
        [EARLIER_WORDS.memberField]: members, ...(purpose === null ? {} : { [EARLIER_WORDS.purposeField]: purpose }) };
    return [ownerPath, earlierHeader({ id, title: 'Export selected rows', intent: 'Let an operator export a selected subset', status, tracking }, '\n')];
}

/**
 * Turns the fixture into a project that stores the earlier vocabulary, as a release before the vocabulary change wrote
 * it. This tracker neither saves into such a project nor writes its records, so every record file is written here
 * directly. Work of the kinds both vocabularies have is first saved in the current words, its progress is captured, and
 * each of those files is then rewritten as the earlier vocabulary stored it: record stamp 2 and none of the values only
 * the current vocabulary holds. Group records, which only the earlier vocabulary has, are written whole: their kind,
 * their location, the members each lists and its purpose. Authored bodies and identities are kept.
 *
 * Work written (identities in `ids`): an accepted task whose history passed through the planned state and which holds
 * receipts and a link to the proposal; a remaining task in the planned state; a subtask under it, holding one link path
 * into each location; a proposal; a story under the accepted task; and a group with the finite-outcome purpose that
 * lists both tasks. Work saved through the fixture before this call is rewritten with it and becomes part of the project.
 *
 * Options: `declared` (default true) keeps the tracker block with marker 2 and a custom label under a group purpose;
 * false removes the tracker block, leaving an unconfigured project recognised by its locations. `commit` (default
 * false) initialises a Git repository and commits the result, for pinned reads. `groups` adds group records, each
 * `{ id, kind = 'project', purpose = null, members = [], status = 'draft' }`, written and committed with the rest.
 * Returns { ids, expected: { total, accepted, remaining, eligibleIds, states, kinds }, folders, oid }, where `expected`
 * is what the project reads in the current terms: the delivery numbers are those the same tasks reported while stored
 * in the current words under the same configuration, and the group named in `ids` is stated here as test data. Groups
 * added through `groups` are left to the case that adds them.
 */
async function earlierProject(fixture, { declared = true, commit = false, groups = [] } = {}) {
    const ids = EARLIER_IDS;
    await fixture.create(ids.intent, 'initiative');
    await fixture.create(ids.accepted);
    await fixture.tag(ids.accepted, { initiativeIds: [ids.intent] });
    await fixture.accepted(ids.accepted);
    await fixture.create(ids.remaining);
    await fixture.saved('transition', ids.remaining, { state: 'planned' });
    await fixture.create(ids.story, 'story');
    await fixture.saved('link', ids.story, { links: [{ relation: 'parent', itemId: ids.accepted }] });
    await fixture.create(ids.supporting, 'subtask');
    const current = id => fixture.record(id).ownerPath;
    const [groupPath, groupText] = earlierGroup({ id: ids.group, purpose: 'program', members: [ids.accepted, ids.remaining] });
    await fixture.saved('link', ids.supporting, { links: [{ relation: 'parent', itemId: ids.remaining },
        ...[ids.accepted, ids.supporting, ids.intent, ids.story].map(id => ({ relation: 'plan', path: current(id) }))] });
    if (!declared) { delete fixture.config.taskTracking; fixture.saveConfig(); }
    const before = fixture.progress();
    // The finite-outcome group is the one record whose kind and state differ between the vocabularies: it reads as a draft initiative.
    const expected = { total: before.metrics.total, accepted: before.metrics.accepted, remaining: before.metrics.remaining,
        eligibleIds: [...before.metrics.eligibleIds], states: { ...Object.fromEntries(before.items.map(item => [item.id, item.state])), [ids.group]: 'draft' },
        kinds: { ...Object.fromEntries(before.items.map(item => [item.id, item.kind])), [ids.group]: 'initiative' } };
    const files = fixture.records().map(record => {
        const stored = parseRecord(fs.readFileSync(path.join(fixture.root, record.ownerPath)), record.ownerPath, record.kind);
        const tracking = { ...Object.fromEntries(Object.entries(stored.tracking).filter(([key]) => !EARLIER_WORDS.absent.includes(key))), schemaVersion: EARLIER_WORDS.version };
        // The subtask's link into the group location is written here: no save could inspect a group record.
        if (record.id === ids.supporting) tracking.links = [...tracking.links.slice(0, -1), { relation: 'plan', path: groupPath }, ...tracking.links.slice(-1)];
        return [record.ownerPath, earlierHeader({ ...stored.data, tracking }, stored.body)];
    });
    for (const [relative, text] of [...files, [groupPath, groupText], ...groups.map(earlierGroup)]) fixture.write(relative, text);
    if (declared) {
        fixture.config.taskTracking = { ...fixture.config.taskTracking, schemaVersion: EARLIER_WORDS.version, groupLabels: { program: 'Bet' } };
        fixture.saveConfig();
    }
    let oid;
    if (commit) { git(fixture, ['init']); git(fixture, ['add', '--', 'docs', 'work']); git(fixture, ['commit', '-m', 'Earlier vocabulary project']); oid = git(fixture, ['rev-parse', 'HEAD']); }
    return { ids, expected, folders: { ...EARLIER_WORDS.folders }, oid };
}

module.exports = { withFixture, trackingTest, refused, CRITERIA, OBSERVED_AT, git, earlierProject, EARLIER_WORDS, EARLIER_IDS };
