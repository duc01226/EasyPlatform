'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const childProcess = require('node:child_process');
const { Readable } = require('node:stream');
const { trackingTest: test, withFixture, refused, git, OBSERVED_AT } = require('../lib/task-tracking-fixture.cjs');
const { trackingContext, validateTaskTracking, LIMITS, ITEM_ID, CUSTOM_MEMBER_ID } = require('../../lib/task-tracking-config.cjs');
const identity = require('../../lib/task-tracking-identity.cjs');
const policy = require('../../lib/task-tracking-policy.cjs');
const upkeep = require('../../lib/task-tracking-upkeep.cjs');
const { stableValue, patchRecord } = require('../../lib/task-artifact-store.cjs');
const { hash } = require('../../lib/task-tracking-files.cjs');
const cli = require('../../../skills/task-track/scripts/task-track.cjs');
const { startWorkspace } = require('../../../skills/task-track/lib/workspace-server.cjs');

const CLI = path.resolve(__dirname, '../../../skills/task-track/scripts/task-track.cjs');
const ADDRESS = 'rowan@example.test';

function author(f, address = 'Rowan@Example.Test', name = 'Rowan Example') {
    if (!fs.existsSync(path.join(f.root, '.git'))) git(f, ['init']);
    git(f, ['config', 'user.email', address]);
    git(f, ['config', 'user.name', name]);
}
function local(f, overrides = {}) {
    const selected = identity.resolveActor(f.context());
    return f.authority({ actor: selected.member.id, identity: selected.selection, ...overrides });
}
function proposal(f, operation, id, patch, actor = ADDRESS, overrides = {}) {
    return f.request(operation, id, patch, { actor: { memberId: actor }, ...overrides });
}
async function save(f, operation, id, patch, authority = local(f), overrides = {}) {
    const result = await f.core.executeOperation(proposal(f, operation, id, patch, authority.actor, overrides), authority);
    assert.equal(result.primary.status, 'saved', JSON.stringify(result.primary));
    return result;
}
function tree(root) {
    const result = {};
    const visit = (directory, prefix = '') => {
        for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
            const relative = `${prefix}${entry.name}`;
            if (entry.isDirectory()) visit(path.join(directory, entry.name), `${relative}/`);
            else if (entry.isFile()) result[relative] = hash(fs.readFileSync(path.join(directory, entry.name)));
        }
    };
    visit(root); return result;
}
function runCLI(f, command, request, args = []) {
    const result = childProcess.spawnSync(process.execPath, [CLI, command, '--root', f.root, ...args],
        { input: request === undefined ? undefined : JSON.stringify(request), encoding: 'utf8', env: process.env,
            shell: false, windowsHide: true, timeout: 20000, maxBuffer: 2 * LIMITS.recordBytes });
    assert.equal(result.error, undefined, result.error?.message);
    assert.equal(result.stderr, '');
    return { status: result.status, value: JSON.parse(result.stdout) };
}
function api(workspace, route, value) {
    return new Promise((resolve, reject) => {
        const bytes = value === undefined ? undefined : Buffer.from(JSON.stringify(value));
        const req = http.request(`${workspace.origin}${route}`, { method: bytes ? 'POST' : 'GET', headers: {
            'x-workspace-session': new URL(workspace.url).hash.slice('#session='.length),
            origin: workspace.origin, ...(bytes ? { 'content-type': 'application/json', 'content-length': bytes.length } : {}) } }, res => {
            const chunks = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => {
                try { resolve({ status: res.statusCode, value: JSON.parse(Buffer.concat(chunks).toString('utf8')) }); }
                catch (error) { reject(error); }
            });
            res.on('error', reject);
        });
        req.setTimeout(15000, () => req.destroy(new Error('Fixture API timed out')));
        req.on('error', reject); req.end(bytes);
    });
}
async function workspace(f, options, callback) {
    if (Number(process.versions.node.split('.')[0]) < 20) {
        await assert.rejects(startWorkspace({ root: f.root, ...options }), error => error.code === 'UNSUPPORTED_RUNTIME');
        return;
    }
    const current = await startWorkspace({ root: f.root, ...options });
    try { await callback(current); } finally { await current.close(); }
}
function fakeGit(f, email = ADDRESS, name = 'Rowan Example', mutate = () => {}) {
    const calls = [];
    return { calls, spawnSync(executable, argv, options) {
        calls.push({ executable, argv, options });
        const stdout = argv.includes('--show-toplevel') ? `${f.root}\n` : argv.at(-1) === 'user.email' ? `${email}\n` : `${name}\n`;
        return mutate(calls.length, argv, options) || { status: 0, stdout, stderr: '' };
    } };
}

// Finite native property partitions, not a claim to every OS/model/browser execution.
module.exports = { name: 'Task tracking local identity integration', tests: [
    test('TC-TPT-171', 'actual CLI discovers a local actor and captures without shared member enrollment', async f => {
        f.config.taskTracking.members = []; f.saveConfig(); author(f);
        const before = tree(f.root);
        const selected = runCLI(f, 'identity');
        assert.equal(selected.status, 0); assert.equal(selected.value.actor, ADDRESS);
        assert.equal(selected.value.member.displayName, 'Rowan Example'); assert.equal(selected.value.grantsAuthority, false);
        assert.deepEqual(tree(f.root), before);
        const request = proposal(f, 'create', 'INITIATIVE-LOCAL', { title: 'Improve onboarding', intent: 'Capture a useful idea' }, ADDRESS,
            { target: { kind: 'initiative', itemId: 'INITIATIVE-LOCAL' } });
        const created = runCLI(f, 'apply', request);
        assert.equal(created.status, 0); assert.equal(created.value.primary.status, 'saved');
        await save(f, 'assign', 'INITIATIVE-LOCAL', { assigneeId: ADDRESS });
        assert.equal(f.record('INITIATIVE-LOCAL').tracking.assigneeId, ADDRESS);
        assert.equal(f.view('INITIATIVE-LOCAL').state, 'draft'); assert.equal(f.view('INITIATIVE-LOCAL').acceptance.accepted, false);
        assert.deepEqual(f.record('INITIATIVE-LOCAL').tracking.memberProfiles, [{ id: ADDRESS, displayName: 'Rowan Example' }]);
        assert.equal(fs.readFileSync(path.join(f.root, 'docs/project-config.json'), 'utf8'), JSON.stringify(f.config));
    }),
    test('TC-TPT-171', 'writable HTTP offers only its validated local worktree actor for capture and self-assignment', async f => {
        f.config.taskTracking.members = []; f.saveConfig(); author(f);
        await workspace(f, { writable: true }, async current => {
            const session = await api(current, '/api/session');
            assert.equal(session.value.actor, ADDRESS);
            assert.deepEqual(session.value.snapshot.members, [{ id: ADDRESS, displayName: 'Rowan Example', active: true }]);
            assert.notEqual(session.value.snapshot.fingerprint, f.progress().fingerprint);
            const created = await api(current, '/api/operation', proposal(f, 'create', 'INITIATIVE-APP', { title: 'Onboarding', intent: 'Capture from workspace' }, ADDRESS,
                { target: { kind: 'initiative', itemId: 'INITIATIVE-APP' } }));
            assert.equal(created.status, 200); assert.equal(created.value.primary.status, 'saved');
            const assigned = await api(current, '/api/operation', proposal(f, 'assign', 'INITIATIVE-APP', { assigneeId: ADDRESS }));
            assert.equal(assigned.value.primary.status, 'saved');
            const reread = await api(current, '/api/inspect', {});
            assert.equal(reread.value.items[0].assigneeId, ADDRESS); assert.equal(reread.value.items[0].state, 'draft');
        });
        await workspace(f, {}, async current => {
            const session = await api(current, '/api/session');
            assert.equal(session.value.writable, false);
            assert.ok(session.value.snapshot.members.every(member => !member.active));
            const before = tree(f.root);
            const denied = await api(current, '/api/operation', proposal(f, 'update', 'INITIATIVE-APP', { title: 'Denied' }));
            assert.equal(denied.status, 403); assert.equal(denied.value.code, 'READ_ONLY'); assert.deepEqual(tree(f.root), before);
        });
    }),
    test('TC-TPT-172', 'explicit custom selection and unique email matching keep custom spelling without profile churn', async f => {
        f.config.taskTracking.members[0] = { id: 'Rowan-Team', displayName: 'Rowan', active: true, aliases: ['Rowan@Example.Test'] }; f.saveConfig();
        const before = tree(f.root);
        assert.equal(identity.resolveActor(f.context(), 'Rowan-Team').member.id, 'Rowan-Team');
        assert.deepEqual(tree(f.root), before); // No Git setup or probe needed for custom selection.
        const explicit = runCLI(f, 'apply', proposal(f, 'create', 'CUSTOM-1', { title: 'Custom', intent: 'Keep established identity' }, 'Rowan-Team'), ['--actor', 'Rowan-Team']);
        assert.equal(explicit.value.primary.status, 'saved'); assert.equal(f.record('CUSTOM-1').tracking.memberProfiles, undefined);
        author(f);
        const matched = identity.resolveActor(f.context());
        assert.equal(matched.member.id, 'Rowan-Team'); assert.equal(matched.member.displayName, 'Rowan'); assert.equal(matched.unregistered, false);
        await save(f, 'update', 'CUSTOM-1', { title: 'Alias matched' }, local(f));
        assert.equal(f.record('CUSTOM-1').tracking.history.at(-1).actor, 'Rowan-Team');
        assert.equal(f.record('CUSTOM-1').tracking.memberProfiles, undefined);
        const customOwner = f.record('CUSTOM-1').ownerPath; const conserved = f.bytes('CUSTOM-1');
        assert.throws(() => identity.resolveActor(f.context(), 'not-declared'), error => error.code === 'INVALID_MEMBER');
        f.config.taskTracking.members[1].aliases = ['rowan@example.test']; f.saveConfig();
        assert.throws(() => f.context(), error => error.code === 'INVALID_CONFIG');
        assert.deepEqual(fs.readFileSync(path.join(f.root, customOwner)), conserved);
    }),
    test('TC-TPT-173', 'shared and pinned attribution remains inactive and local-only health stays Unknown with configured positive control', async f => {
        f.config.taskTracking.healthOwnerId = 'TASK-LOCAL'; f.saveConfig(); author(f);
        await save(f, 'create', 'TASK-LOCAL', { title: 'Local work', intent: 'Recognize contributor' });
        await save(f, 'assign', 'TASK-LOCAL', { assigneeId: ADDRESS });
        await save(f, 'attest', 'TASK-LOCAL', { health: { assessment: 'On track', ownerId: ADDRESS, observedAt: OBSERVED_AT, reason: 'Personally checked current work' } }, local(f, { canAttest: true }));
        const recorded = f.bytes('TASK-LOCAL');
        author(f, 'casey@example.test', 'Casey Example');
        assert.equal(f.progress().health.status, 'unknown');
        assert.deepEqual(f.progress().members.find(member => member.id === ADDRESS), { id: ADDRESS, displayName: 'Rowan Example', active: false });
        assert.equal(f.record('TASK-LOCAL').tracking.health.reason, 'Personally checked current work');
        assert.equal(f.progress().diagnostics.some(value => value.code === 'UNKNOWN_MEMBER'), false);
        git(f, ['add', '.']); git(f, ['commit', '-m', 'Fixture shared work']);
        const pinned = f.progress({ ref: 'HEAD' });
        assert.equal(pinned.source.kind, 'shared');
        assert.deepEqual(pinned.members.find(member => member.id === ADDRESS), { id: ADDRESS, displayName: 'Rowan Example', active: false });
        assert.equal(pinned.health.status, 'unknown'); assert.deepEqual(f.bytes('TASK-LOCAL'), recorded);
        const denied = await f.core.executeOperation(proposal(f, 'assign', 'TASK-LOCAL', { assigneeId: ADDRESS }, 'casey@example.test'), local(f));
        refused(denied, 'INVALID_MEMBER'); assert.deepEqual(f.bytes('TASK-LOCAL'), recorded);
        await f.create('TASK-CONTROL'); f.config.taskTracking.healthOwnerId = 'TASK-CONTROL'; f.saveConfig();
        await f.saved('attest', 'TASK-CONTROL', { health: { assessment: 'Checked', ownerId: 'owner', observedAt: OBSERVED_AT, reason: 'Declared owner checked' } }, {}, { canAttest: true });
        assert.equal(f.progress().health.status, 'attested'); assert.equal(f.progress().health.displayName, 'Owner');
    }),
    test('TC-TPT-181', 'exact address and name limits preserve full fallback while malformed identity refuses', async f => {
        const address254 = `${'x'.repeat(241)}@example.test`;
        assert.equal(address254.length, 254);
        await f.create('PRESERVED-181');
        const unrelated = f.bytes('PRESERVED-181'); const operations = new Set();
        f.write('primary-untracked.txt', 'Independent primary work');
        for (const address of [ADDRESS, address254]) {
            author(f, address, '');
            const person = identity.resolveActor(f.context()).member;
            assert.equal(person.id, address); assert.equal(person.displayName, address);
            // The fallback owns a real permitted save, not only resolver output.
            const id = address === ADDRESS ? 'ADDRESS-ONLY' : 'LONG-ADDRESS-ONLY';
            const request = proposal(f, 'create', id, { title: `Work by ${id}`, intent: 'Keep the complete address-only contributor' }, address);
            assert.equal(operations.has(request.operationId), false); operations.add(request.operationId);
            const requestBytes = stableValue(request); const before = tree(f.root);
            const result = runCLI(f, 'apply', request);
            assert.equal(result.status, 0); assert.equal(result.value.primary.status, 'saved');
            assert.equal(result.value.primary.itemId, id); assert.equal(result.value.primary.operationId, request.operationId);
            const record = f.record(id);
            assert.equal(record.data.title, request.patch.title); assert.equal(record.data.intent, request.patch.intent);
            assert.equal(record.data.status, 'draft'); assert.equal(record.revision, 1);
            assert.deepEqual(record.tracking.memberProfiles, [{ id: address, displayName: address }]);
            assert.equal(record.tracking.history.length, 1);
            assert.equal(record.tracking.history[0].actor, address); assert.equal(record.tracking.history[0].operationId, request.operationId);
            assert.equal(record.tracking.history[0].operation, 'create');
            assert.equal(record.tracking.history[0].beforeState, 'draft'); assert.equal(record.tracking.history[0].afterState, 'draft');
            assert.equal(record.tracking.assigneeId, null); assert.deepEqual(record.tracking.collaboratorIds, []);
            assert.deepEqual(record.tracking.proofs, []); assert.deepEqual(record.tracking.acceptanceHistory, []);
            assert.equal(record.tracking.readiness, undefined); assert.equal(f.view(id).acceptance.accepted, false);
            const inspect = runCLI(f, 'inspect'); assert.equal(inspect.status, 0);
            assert.deepEqual(inspect.value.members.find(member => member.id === address), { id: address, displayName: address, active: false });
            assert.equal(inspect.value.items.find(item => item.id === id).title, request.patch.title);
            assert.equal(inspect.value.items.find(item => item.id === id).state, 'draft');
            assert.equal(inspect.value.items.find(item => item.id === id).acceptance.accepted, false);
            assert.equal(stableValue(request), requestBytes); assert.deepEqual(f.bytes('PRESERVED-181'), unrelated);
            const after = tree(f.root);
            assert.deepEqual(after, { ...before, [record.ownerPath]: hash(f.bytes(id)) });
        }
        for (const address of ['', '@example.test', 'rowan@', 'rowan@@example.test', 'rowan @example.test', ' rowan@example.test',
            'rowan@example.test ', 'rowan\n@example.test', 'rówan@example.test', `x${address254}`]) {
            author(f, address, 'Rowan'); const before = tree(f.root);
            assert.throws(() => identity.resolveActor(f.context()), error => error.code === 'INVALID_MEMBER');
            assert.deepEqual(tree(f.root), before);
            const request = proposal(f, 'create', `INVALID-${operations.size}`, { title: 'Must remain a draft request', intent: 'Never save a substitute actor' });
            assert.equal(operations.has(request.operationId), false); operations.add(request.operationId);
            const requestBytes = stableValue(request);
            const result = runCLI(f, 'apply', request);
            assert.equal(result.status, 1); assert.equal(result.value.status, 'refused');
            assert.equal(result.value.code, 'INVALID_MEMBER'); assert.equal(result.value.primary, undefined);
            assert.match(result.value.reason, /Local author email.*(missing|invalid)/);
            assert.equal(stableValue(request), requestBytes); assert.deepEqual(tree(f.root), before);
            const inspection = runCLI(f, 'inspect'); assert.equal(inspection.status, 0);
            assert.ok(inspection.value.items.some(item => item.id === 'ADDRESS-ONLY'));
            assert.ok(inspection.value.items.some(item => item.id === 'LONG-ADDRESS-ONLY'));
            assert.equal(inspection.value.items.some(item => item.id === request.target.itemId), false);
            assert.deepEqual(tree(f.root), before); assert.deepEqual(f.bytes('PRESERVED-181'), unrelated);
            // Refused tracker work does not disable independent primary work.
            const primary = `Independent primary work after ${request.operationId}`;
            f.write('primary-untracked.txt', primary);
            assert.equal(fs.readFileSync(path.join(f.root, 'primary-untracked.txt'), 'utf8'), primary);
            assert.deepEqual(tree(f.root), { ...before, 'primary-untracked.txt': hash(Buffer.from(primary)) });
        }
        author(f, ADDRESS, 'N'.repeat(254)); assert.equal(identity.resolveActor(f.context()).member.displayName.length, 254);
        author(f, ADDRESS, 'N'.repeat(255)); assert.throws(() => identity.resolveActor(f.context()), error => error.code === 'INVALID_MEMBER');
        f.config.taskTracking.members[0].displayName = 'C'.repeat(160);
        f.config.taskTracking.members[0].aliases = [address254]; assert.deepEqual(validateTaskTracking(f.config), []);
        f.config.taskTracking.members[0].displayName += 'C'; assert.ok(validateTaskTracking(f.config).length);
        f.config.taskTracking.members[0].displayName = 'C'.repeat(160);
        f.config.taskTracking.members[0].aliases = ['Former contributor @ office']; assert.deepEqual(validateTaskTracking(f.config), []);
        f.config.taskTracking.members[0].aliases = ['A'.repeat(161)]; assert.ok(validateTaskTracking(f.config).length);
        f.config.taskTracking.members[0].aliases = [`x${address254}`]; assert.ok(validateTaskTracking(f.config).length);
        assert.equal(ITEM_ID.test(ADDRESS), false); assert.equal(CUSTOM_MEMBER_ID.test(ADDRESS), false);
        f.config.taskTracking.profile = { kind: 'native', version: 1, registration: ADDRESS };
        assert.ok(validateTaskTracking(f.config).some(message => message.includes('registration')));
    }),
    test('TC-TPT-181', 'author lookup uses literal argv exact root bounded process options and scrubbed injected context', async f => {
        const keys = ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_CONFIG_COUNT', 'GIT_AUTHOR_EMAIL', 'GIT_COMMITTER_NAME', 'GIT_CONFIG_GLOBAL'];
        const previous = keys.map(key => [key, process.env[key]]);
        try {
            for (const key of keys) process.env[key] = 'injected';
            const adapter = fakeGit(f);
            const result = identity.readGitAuthor(f.context(), { spawnSync: adapter.spawnSync });
            assert.equal(result.id, ADDRESS); assert.equal(adapter.calls.length, 3);
            for (const call of adapter.calls) {
                assert.equal(call.executable, 'git'); assert.equal(call.options.cwd, f.root);
                assert.equal(call.options.shell, false); assert.equal(call.options.windowsHide, true);
                assert.equal(call.options.maxBuffer, 65536); assert.ok(call.options.timeout > 0 && call.options.timeout <= 10000);
                assert.deepEqual(call.argv.slice(0, 5), ['--no-pager', '-C', f.root, '-c', 'core.fsmonitor=false']);
                for (const key of keys) assert.equal(call.options.env[key], undefined);
                assert.equal(call.options.env.HOME, f.root); assert.equal(call.options.env.USERPROFILE, f.root);
            }
            assert.deepEqual(adapter.calls.map(call => call.argv.slice(5)), [['rev-parse', '--show-toplevel'], ['config', '--get', 'user.email'], ['config', '--get', 'user.name']]);
        } finally { for (const [key, value] of previous) value === undefined ? delete process.env[key] : process.env[key] = value; }
        for (const fault of [{ error: Object.assign(new Error('Unavailable'), { code: 'ENOENT' }), status: null },
            { error: Object.assign(new Error('Timeout'), { code: 'ETIMEDOUT' }), status: null }, { status: 0, stdout: 'x'.repeat(65537) }, { status: 128, stdout: '' }]) {
            assert.throws(() => identity.readGitAuthor(f.context(), { spawnSync: () => fault }), error => error.code === 'IDENTITY_UNAVAILABLE');
        }
        let clock = 0;
        assert.throws(() => identity.readGitAuthor(f.context(), { now: () => clock, spawnSync: () => { clock = 10001; return { status: 0, stdout: `${f.root}\n` }; } }), error => error.code === 'IDENTITY_UNAVAILABLE');
        const nested = f.write('nested/file.txt', 'fixture');
        assert.throws(() => identity.readGitAuthor({ ...f.context(), root: path.dirname(nested) }, { spawnSync: fakeGit(f).spawnSync }), error => error.code === 'WRONG_ROOT');
    }),
    test('TC-TPT-181', 'normal global local includeIf and worktree author configuration stays usable', async f => {
        author(f); git(f, ['config', '--unset', 'user.email']); git(f, ['config', '--unset', 'user.name']);
        f.write('.gitconfig', '[user]\n email = global@example.test\n name = Global Example\n');
        assert.equal(identity.resolveActor(f.context()).member.id, 'global@example.test');
        git(f, ['config', 'user.email', 'local@example.test']); git(f, ['config', 'user.name', 'Local Example']);
        assert.equal(identity.resolveActor(f.context()).member.id, 'local@example.test');
        git(f, ['config', '--unset', 'user.email']); git(f, ['config', '--unset', 'user.name']);
        f.write('author-config', '[user]\n email = included@example.test\n name = Included Example\n');
        // No trailing slash: Git expands "x/" to "x/**", which matches inside the Git directory but not the directory itself.
        f.write('.gitconfig', `[includeIf "gitdir:${f.root.replace(/\\/g, '/')}/.git"]\n path ="${path.join(f.root, 'author-config').replace(/\\/g, '/')}"\n`);
        assert.equal(identity.resolveActor(f.context()).member.id, 'included@example.test');
        author(f); git(f, ['add', 'docs/project-config.json', '.claude/.ck.local.json']); git(f, ['commit', '-m', 'Fixture base']);
        git(f, ['config', 'extensions.worktreeConfig', 'true']);
        const copy = path.join(f.root, 'linked-copy'); git(f, ['worktree', 'add', '-b', 'fixture-copy', copy]);
        const peer = { ...f, root: fs.realpathSync(copy) };
        git(peer, ['config', '--worktree', 'user.email', 'worktree@example.test']); git(peer, ['config', '--worktree', 'user.name', 'Worktree Example']);
        assert.equal(identity.resolveActor(trackingContext(peer.root)).member.id, 'worktree@example.test');
        assert.equal(identity.resolveActor(f.context()).member.id, ADDRESS);
    }),
    test('TC-TPT-182', 'inactive owner unassignment remains permitted while unknown actor and inactive recipient refuse', async f => {
        author(f); await f.create(); await f.saved('assign', 'TASK-101', { assigneeId: 'owner' });
        f.config.taskTracking.members[0].active = false; f.saveConfig();
        const inactive = identity.resolveActor(f.context(), 'owner'); assert.equal(inactive.member.active, false);
        await f.saved('assign', 'TASK-101', { assigneeId: null });
        assert.equal(f.record('TASK-101').tracking.assigneeId, null); assert.equal(f.record('TASK-101').tracking.history.at(-1).actor, 'owner');
        const before = f.bytes('TASK-101');
        refused(await f.perform('assign', 'TASK-101', { assigneeId: 'owner' }), 'INVALID_MEMBER');
        refused(await f.perform('update', 'TASK-101', { title: 'Unknown' }, { actor: { memberId: 'unknown' } }, { actor: 'unknown' }), 'INVALID_MEMBER');
        assert.deepEqual(f.bytes('TASK-101'), before);
        delete f.config.taskTracking; f.saveConfig();
        await f.create('UNENROLLED'); assert.equal(f.view('UNENROLLED').state, 'draft'); // Preserved TC085.
    }),
    test('TC-TPT-182', 'pending workspace actor cannot be rebound after Git email changes', async f => {
        author(f); await save(f, 'create', 'PENDING-1', { title: 'Keep draft', intent: 'Preserve selected actor' });
        await workspace(f, { writable: true }, async current => {
            const draft = proposal(f, 'update', 'PENDING-1', { title: 'Pending local change' });
            const retained = stableValue(draft); const before = f.bytes('PENDING-1');
            const wrong = await api(current, '/api/operation', { ...draft, actor: { memberId: 'peer' } });
            assert.equal(wrong.value.code, 'WRONG_ACTOR');
            author(f, 'casey@example.test', 'Casey');
            const changed = await api(current, '/api/operation', draft);
            refused(changed.value, 'STALE_ACTOR'); assert.deepEqual(f.bytes('PENDING-1'), before); assert.equal(stableValue(draft), retained);
        });
        await workspace(f, { actor: 'owner', writable: true }, async current => {
            author(f, 'another@example.test', 'Another');
            const saved = await api(current, '/api/operation', proposal(f, 'update', 'PENDING-1', { title: 'Explicit actor kept' }, 'owner'));
            assert.equal(saved.value.primary.status, 'saved'); assert.equal(f.record('PENDING-1').tracking.history.at(-1).actor, 'owner');
        });
    }),
    test('TC-TPT-182', 'linked retries retain original actor revision and request while changed identity preserves primary success', async f => {
        author(f); await save(f, 'create', 'LINK-1', { title: 'Linked work', intent: 'Retain caller' });
        await upkeep.linkSession({ root: f.root, sessionId: 'identity-session', producer: 'feature', itemIds: ['LINK-1'] });
        const link = upkeep.readLink(f.root, 'identity-session'); assert.equal(link.actor, ADDRESS); assert.equal(link.identity.source, 'git');
        f.write('source.txt', 'observed save');
        const checkpoint = { root: f.root, sessionId: 'identity-session', producer: 'feature', checkpointId: 'checkpoint-1',
            primary: { status: 'saved', marker: 'primary-conserved' }, observation: { kind: 'saved', observedAt: OBSERVED_AT, summary: 'Saved exact source', paths: ['source.txt'] } };
        const saved = await upkeep.checkpoint(checkpoint); assert.equal(saved.secondary[0].status, 'saved');
        const bytes = f.bytes('LINK-1'); const journalDir = path.join(f.root, 'tmp/task-tracking/checkpoints'); const journals = tree(journalDir);
        author(f, ADDRESS, 'New display name');
        const retry = await upkeep.checkpoint(checkpoint); assert.equal(retry.secondary[0].result.replayed, true);
        assert.deepEqual(f.bytes('LINK-1'), bytes); assert.deepEqual(tree(journalDir), journals);
        author(f, 'casey@example.test', 'Casey');
        const stale = await upkeep.checkpoint(checkpoint); assert.deepEqual(stale.primary, checkpoint.primary);
        assert.equal(stale.secondary[0].status, 'pending'); assert.equal(stale.secondary[0].code, 'STALE_ACTOR');
        assert.deepEqual(f.bytes('LINK-1'), bytes); assert.deepEqual(tree(journalDir), journals);
    }),
    test('TC-TPT-183', 'ordinary readers and off observe advisory paths never resolve a local author', async f => {
        await f.create(); await upkeep.linkSession({ root: f.root, sessionId: 'reader-session', actor: 'owner', producer: 'feature', itemIds: ['TASK-101'] });
        // Explicit work remains permitted without enabling optional upkeep.
        author(f); await f.create('PRESERVED-183');
        const unrelated = f.bytes('PRESERVED-183'); const operations = new Set();
        const businessTracking = tracking => Object.fromEntries(Object.entries(tracking)
            .filter(([key]) => !['revision', 'context', 'history', 'receipts', 'memberProfiles'].includes(key)));
        for (const mode of ['off', 'observe']) {
            f.config.taskTracking.mode = mode; f.saveConfig();
            const prior = f.record('TASK-101');
            const request = proposal(f, 'update', 'TASK-101', { title: `Explicit ${mode} work` });
            assert.equal(operations.has(request.operationId), false); operations.add(request.operationId);
            const requestBytes = stableValue(request); const before = tree(f.root);
            const result = runCLI(f, 'apply', request);
            assert.equal(result.status, 0); assert.equal(result.value.primary.status, 'saved');
            assert.equal(result.value.primary.itemId, 'TASK-101'); assert.equal(result.value.primary.operationId, request.operationId);
            const record = f.record('TASK-101');
            assert.equal(record.data.title, request.patch.title);
            assert.deepEqual({ ...record.data, title: prior.data.title, tracking: prior.data.tracking }, prior.data);
            assert.equal(record.revision, prior.revision + 1); assert.equal(record.ownerPath, prior.ownerPath);
            assert.equal(record.body, prior.body);
            assert.deepEqual(record.tracking.context, { operationId: request.operationId, kind: 'direct' });
            assert.deepEqual(businessTracking(record.tracking), businessTracking(prior.tracking));
            assert.deepEqual(record.tracking.memberProfiles, [{ id: ADDRESS, displayName: 'Rowan Example' }]);
            assert.deepEqual(record.tracking.history.slice(0, -1), prior.tracking.history);
            assert.equal(record.tracking.history.length, prior.tracking.history.length + 1);
            const history = record.tracking.history.at(-1);
            assert.equal(history.operationId, request.operationId); assert.equal(history.operation, 'update'); assert.equal(history.actor, ADDRESS);
            assert.equal(history.beforeState, 'draft'); assert.equal(history.afterState, 'draft');
            assert.deepEqual(history.context, record.tracking.context);
            assert.deepEqual(record.tracking.receipts.slice(0, -1), prior.tracking.receipts);
            assert.equal(record.tracking.receipts.length, prior.tracking.receipts.length + 1);
            assert.equal(record.tracking.receipts.at(-1).operationId, request.operationId);
            assert.equal(record.data.status, 'draft'); assert.equal(record.tracking.assigneeId, null);
            assert.deepEqual(record.tracking.proofs, []); assert.deepEqual(record.tracking.acceptanceHistory, []);
            assert.equal(record.tracking.readiness, undefined);
            const progress = f.progress(); assert.equal(progress.mode, mode);
            const item = progress.items.find(value => value.id === 'TASK-101');
            assert.equal(item.title, request.patch.title); assert.equal(item.state, 'draft'); assert.equal(item.acceptance.accepted, false);
            assert.equal(stableValue(request), requestBytes); assert.deepEqual(f.bytes('PRESERVED-183'), unrelated);
            assert.deepEqual(tree(f.root), { ...before, [record.ownerPath]: hash(f.bytes('TASK-101')) });
            // Valid identity still grants no write authority; keep the denied draft intact.
            const deniedRequest = proposal(f, 'update', 'TASK-101', { title: `Denied ${mode} work` });
            assert.equal(operations.has(deniedRequest.operationId), false); operations.add(deniedRequest.operationId);
            const deniedRequestBytes = stableValue(deniedRequest); const deniedAuthority = local(f, { canWrite: false });
            const deniedBefore = tree(f.root);
            refused(await f.core.executeOperation(deniedRequest, deniedAuthority), 'NOT_PERMITTED');
            assert.equal(stableValue(deniedRequest), deniedRequestBytes); assert.deepEqual(tree(f.root), deniedBefore);
            assert.equal(f.progress().mode, mode); assert.equal(f.view('TASK-101').title, request.patch.title);
            assert.deepEqual(f.bytes('PRESERVED-183'), unrelated);
        }
        const spawn = childProcess.spawnSync;
        childProcess.spawnSync = () => { throw new Error('Unexpected identity subprocess'); };
        try {
            for (const mode of ['off', 'observe']) {
                f.config.taskTracking.mode = mode; f.saveConfig();
                const before = f.bytes('TASK-101');
                const value = await upkeep.checkpoint({ root: f.root, sessionId: 'reader-session', producer: 'feature', checkpointId: 'off-check', primary: { status: 'saved' } });
                assert.equal(value.secondary[0].status, 'skipped'); assert.deepEqual(f.bytes('TASK-101'), before);
                const inspect = await cli.run(['inspect', '--root', f.root]); assert.ok(inspect.items.length);
                const report = await cli.run(['report', '--root', f.root]); assert.ok(report);
            }
            f.config.taskTracking.mode = 'linked'; f.saveConfig();
            assert.equal(upkeep.readLink(f.root, 'reader-session').actor, 'owner');
            assert.ok(upkeep.observerHint({ hook_event_name: 'PostToolUse', session_id: 'reader-session', tool_name: 'Write', tool_input: { file_path: 'source.txt' } }, f.root));
        } finally { childProcess.spawnSync = spawn; }
    }),
    test('TC-TPT-191', 'finite identity partitions preserve custom local alias and refusal actor meanings', async f => {
        const context = f.context();
        for (const person of context.members) assert.equal(identity.resolveActor(context, person.id).member.id, person.id);
        for (const email of ['Rowan@Example.Test', `${'x'.repeat(240)}@example.test`, `${'x'.repeat(241)}@example.test`]) {
            const adapter = fakeGit(f, email, '');
            const result = identity.resolveActor(context, undefined, { spawnSync: adapter.spawnSync });
            assert.equal(result.member.id, email.toLowerCase()); assert.equal(result.member.displayName, email.toLowerCase());
        }
        const aliasContext = { ...context, members: [{ id: 'Custom-Spelling', displayName: 'Custom', active: false, aliases: ['ROWAN@EXAMPLE.TEST'] }] };
        const alias = identity.resolveActor(aliasContext, undefined, { spawnSync: fakeGit(f).spawnSync });
        assert.equal(alias.member.id, 'Custom-Spelling'); assert.equal(alias.member.active, false);
        for (const members of [[{ id: 'custom', displayName: ADDRESS, active: true }],
            [{ id: 'one', displayName: 'One', active: true, aliases: [ADDRESS] }, { id: 'two', displayName: 'Two', active: true, aliases: [ADDRESS] }]]) {
            assert.throws(() => identity.resolveActor({ ...context, members }, undefined, { spawnSync: fakeGit(f).spawnSync }), error => error.code === 'INVALID_MEMBER');
        }
        const noConfig = { ...context, members: [] };
        assert.equal(identity.resolveActor(noConfig, 'legacy', { allowUnregisteredCustom: true }).member.id, 'legacy');
        assert.throws(() => identity.resolveActor(context, 'missing', { spawnSync: () => { throw new Error('Must not fall back'); } }), error => error.code === 'INVALID_MEMBER');
    }),
    test('TC-TPT-191', 'every supported printable author character remains data across resolver and record roundtrip', async f => {
        for (let code = 0x21; code <= 0x7e; code++) {
            if (code === 0x40) continue;
            const email = `r${String.fromCharCode(code)}@example.test`;
            const selected = identity.resolveActor(f.context(), undefined, { spawnSync: fakeGit(f, email).spawnSync });
            assert.equal(selected.member.id, email.toLowerCase());
        }
        author(f, 'r"<\\>@example.test', 'Quoted Example');
        const authority = local(f);
        await save(f, 'create', 'QUOTED-ID', { title: 'Escaped identity', intent: 'Preserve actor as data' }, authority);
        await save(f, 'assign', 'QUOTED-ID', { assigneeId: authority.actor }, authority);
        assert.equal(f.record('QUOTED-ID').tracking.assigneeId, authority.actor);
        assert.equal(f.progress().members.find(member => member.id === authority.actor).displayName, 'Quoted Example');
        assert.equal(f.record('QUOTED-ID').tracking.history.at(-1).actor, authority.actor);
    }),
    test('TC-TPT-191', 'a 254-character actor survives every lifecycle history and linked identity carrier', async f => {
        const address = `${'x'.repeat(241)}@example.test`; author(f, address, '');
        const authority = local(f, { canAttest: true });
        await save(f, 'create', 'LONG-1', { title: 'Long identity', intent: 'Preserve full actor', criteria: [{ id: 'outcome', text: 'Observed result' }] }, authority);
        await save(f, 'assign', 'LONG-1', { assigneeId: address, collaboratorIds: [address] }, authority);
        await save(f, 'transition', 'LONG-1', { state: 'planned' }, authority);
        await save(f, 'transition', 'LONG-1', { state: 'ready', readiness: { reviewed: true, decisionsResolved: true } }, authority);
        await save(f, 'transition', 'LONG-1', { state: 'in_progress' }, authority);
        await save(f, 'transition', 'LONG-1', { state: 'blocked', reason: 'Dependency unavailable' }, authority);
        await save(f, 'transition', 'LONG-1', { state: 'in_progress', resolution: 'Dependency restored' }, authority);
        await save(f, 'transition', 'LONG-1', { state: 'verifying' }, authority);
        await save(f, 'proof', 'LONG-1', { proof: f.proof('LONG-1') }, authority);
        await save(f, 'accept', 'LONG-1', { reason: 'Current exact proof accepted' }, authority);
        await save(f, 'attest', 'LONG-1', { health: { assessment: 'Checked', ownerId: address, observedAt: OBSERVED_AT, reason: 'Dated explicit check' } }, authority);
        await save(f, 'retire', 'LONG-1', { reason: 'Keep full history' }, authority);
        const record = f.record('LONG-1'); policy.validateMetadata(record);
        assert.equal(record.tracking.readiness.actor, address); assert.equal(record.tracking.acceptanceHistory[0].actor, address);
        assert.equal(record.tracking.retired.actor, address); assert.ok(record.tracking.history.every(entry => entry.actor === address));
        assert.equal(record.tracking.memberProfiles[0].displayName, address);
        await upkeep.linkSession({ root: f.root, sessionId: 'long-session', producer: 'feature', itemIds: ['LONG-1'] });
        assert.equal(upkeep.readLink(f.root, 'long-session').actor, address);
        await save(f, 'restore', 'LONG-1', { reason: 'Observe retained long actor' }, authority);
        const outcome = await upkeep.checkpoint({ root: f.root, sessionId: 'long-session', producer: 'feature', checkpointId: 'long-checkpoint',
            primary: { status: 'saved' }, observation: { kind: 'saved', observedAt: OBSERVED_AT, summary: 'Actual bounded observation', paths: [] } });
        assert.equal(outcome.secondary[0].status, 'saved');
        const journal = JSON.parse(fs.readFileSync(path.join(f.root, 'tmp/task-tracking/checkpoints', `${outcome.secondary[0].result.operationId}.json`), 'utf8'));
        assert.equal(journal.actor.memberId, address);
    }),
    test('TC-TPT-191', 'exact request retries do not append profiles history or revision after name-only changes', async f => {
        author(f);
        const authority = local(f); const request = proposal(f, 'create', 'RETRY-1', { title: 'Retry once', intent: 'Keep request identity' });
        const result = await f.core.executeOperation(request, authority); assert.equal(result.primary.status, 'saved');
        await save(f, 'update', 'RETRY-1', { title: 'Intervening edit' }, authority);
        const before = f.bytes('RETRY-1'); author(f, ADDRESS, 'Changed name');
        const replay = await f.core.executeOperation(request, authority); assert.equal(replay.primary.replayed, true);
        assert.deepEqual(f.bytes('RETRY-1'), before);
        refused(await f.core.executeOperation({ ...request, patch: { ...request.patch, title: 'Different' } }, authority), 'REUSED_OPERATION');
        refused(await f.core.executeOperation({ ...request, actor: { memberId: 'peer' } }, authority), 'NOT_PERMITTED');
        const stale = proposal(f, 'update', 'RETRY-1', { title: 'Stale draft' });
        await save(f, 'update', 'RETRY-1', { title: 'Another edit' }, authority);
        const conserved = f.bytes('RETRY-1'); refused(await f.core.executeOperation(stale, authority), 'CONFLICT');
        assert.deepEqual(f.bytes('RETRY-1'), conserved);
    }),
    test('TC-TPT-192', 'explicit off observe saves succeed while independent permissions and scope controls refuse', async f => {
        author(f);
        for (const mode of ['off', 'observe', 'linked']) {
            f.config.taskTracking.mode = mode; f.saveConfig();
            await save(f, 'create', `CONTROL-${mode}`, { title: 'Explicit permitted', intent: 'Keep independent mode' });
            assert.equal(f.progress().mode, mode); const before = f.bytes(`CONTROL-${mode}`);
            refused(await f.core.executeOperation(proposal(f, 'update', `CONTROL-${mode}`, { title: 'Denied' }), local(f, { canWrite: false })), 'NOT_PERMITTED');
            refused(await f.core.executeOperation(proposal(f, 'update', `CONTROL-${mode}`, { title: 'Forged authority' }, ADDRESS, { canAccept: true }), local(f)), 'INVALID_INPUT');
            refused(await f.core.executeOperation(proposal(f, 'accept', `CONTROL-${mode}`, { reason: 'Not authorized' }), local(f, { canAccept: false })), 'NOT_PERMITTED');
            refused(await f.core.executeOperation(proposal(f, 'attest', `CONTROL-${mode}`, { health: { assessment: 'Invented', ownerId: ADDRESS, observedAt: OBSERVED_AT, reason: 'No permission' } }), local(f, { canAttest: false })), 'NOT_PERMITTED');
            refused(await f.core.executeOperation(proposal(f, 'delete', `CONTROL-${mode}`, { reason: 'No permission' }), local(f, { canDelete: false })), 'NOT_PERMITTED');
            const contextRequest = proposal(f, 'update', `CONTROL-${mode}`, { title: 'Foreign context' }, ADDRESS, { context: { runId: 'run-one', occurrenceId: 'occ-one' } });
            refused(await f.core.executeOperation(contextRequest, local(f, { context: { runId: 'run-other', occurrenceId: 'occ-one' } })), 'NOT_PERMITTED');
            assert.deepEqual(f.bytes(`CONTROL-${mode}`), before);
        }
        const opted = await save(f, 'update', 'CONTROL-linked', { optOut: true }); assert.equal(opted.primary.status, 'saved');
        await upkeep.linkSession({ root: f.root, sessionId: 'opted-session', producer: 'feature', itemIds: ['CONTROL-linked'] });
        const before = tree(f.root);
        const primary = { status: 'saved' }; const outcome = await upkeep.checkpoint({ root: f.root, sessionId: 'opted-session', producer: 'feature', checkpointId: 'opted', primary,
            observation: { kind: 'saved', observedAt: OBSERVED_AT, summary: 'Observed', paths: [] } });
        assert.deepEqual(outcome.primary, primary); assert.equal(outcome.secondary[0].status, 'skipped'); assert.deepEqual(tree(f.root), before);
    }),
    test('TC-TPT-192', 'absent minimal relocated and malformed configuration preserve explicit setup boundaries', async f => {
        author(f);
        for (const kind of ['absent', 'minimal', 'relocated']) {
            const selectedPath = kind === 'relocated' ? 'custom/project.json' : 'docs/project-config.json';
            f.write('.claude/.ck.local.json', JSON.stringify({ portability: { projectConfigPath: selectedPath } }));
            if (kind === 'absent') fs.rmSync(path.join(f.root, selectedPath), { force: true });
            // The minimum valid project config is a non-empty project name; anything less is a declared-invalid config.
            else f.write(selectedPath, JSON.stringify({ project: { name: 'Portable adopter' },
                ...(kind === 'relocated' ? { docsRoots: { teamArtifacts: { path: 'custom/work' } } } : {}) }));
            const selected = identity.resolveActor(f.context()); assert.equal(selected.member.id, ADDRESS);
            const configBytes = fs.existsSync(path.join(f.root, selectedPath)) ? fs.readFileSync(path.join(f.root, selectedPath)) : null;
            await save(f, 'create', `LAYOUT-${kind}`, { title: 'Portable', intent: 'No shared setup' }, local(f));
            assert.equal(f.context().mode, 'off');
            assert.deepEqual(fs.existsSync(path.join(f.root, selectedPath)) ? fs.readFileSync(path.join(f.root, selectedPath)) : null, configBytes);
        }
        for (const invalid of ['{}', '{malformed']) {
            f.write('custom/project.json', invalid);
            assert.throws(() => f.context(), error => error.code === 'INVALID_CONFIG');
        }
    }),
    test('TC-TPT-192', 'foreign checkout and unlinked checkpoint cannot claim work from the selected copy', async f => {
        author(f); await save(f, 'create', 'EXACT-ONLY', { title: 'Selected copy', intent: 'Keep root authority' });
        const request = proposal(f, 'update', 'EXACT-ONLY', { title: 'Foreign proposal' }); const before = f.bytes('EXACT-ONLY');
        await withFixture(async peer => {
            author(peer); const peerBefore = tree(peer.root);
            refused(await peer.core.executeOperation(request, local(peer)), 'NOT_FOUND');
            assert.deepEqual(tree(peer.root), peerBefore); assert.deepEqual(f.bytes('EXACT-ONLY'), before);
        });
        const unchanged = tree(f.root); const primary = { status: 'saved', reason: 'Primary work retained' };
        const result = await upkeep.checkpoint({ root: f.root, sessionId: 'not-linked', producer: 'feature', checkpointId: 'unlinked', primary });
        assert.deepEqual(result.primary, primary); assert.equal(result.secondary[0].status, 'untracked'); assert.deepEqual(tree(f.root), unchanged);
    }),
    test('TC-TPT-193', 'minimal attribution deduplicates authorized participants and preserves earlier names and configured precedence', async f => {
        author(f); await save(f, 'create', 'PROFILE-1', { title: 'Shared names', intent: 'Keep who acted' });
        const first = f.record('PROFILE-1').tracking.memberProfiles;
        author(f, ADDRESS, 'Renamed Rowan'); await save(f, 'update', 'PROFILE-1', { title: 'Rename does not erase history' });
        assert.deepEqual(f.record('PROFILE-1').tracking.memberProfiles, first);
        author(f, 'casey@example.test', 'Casey Example'); await save(f, 'update', 'PROFILE-1', { title: 'Second participant' });
        assert.deepEqual(f.record('PROFILE-1').tracking.memberProfiles, [...first, { id: 'casey@example.test', displayName: 'Casey Example' }]);
        const before = f.bytes('PROFILE-1');
        await f.saved('assign', 'PROFILE-1', { assigneeId: 'peer' });
        assert.deepEqual(f.record('PROFILE-1').tracking.memberProfiles, [...first, { id: 'casey@example.test', displayName: 'Casey Example' }]);
        f.config.taskTracking.members.push({ id: ADDRESS, displayName: 'Declared current name', active: false }); f.saveConfig();
        assert.equal(f.progress().members.find(member => member.id === ADDRESS).displayName, 'Declared current name');
        assert.equal(f.record('PROFILE-1').tracking.memberProfiles[0].displayName, 'Rowan Example'); assert.notDeepEqual(f.bytes('PROFILE-1'), before);
        const context = policy.bindRecordContext(f.context(), f.records());
        assert.equal(context.members.some(member => member.id === 'casey@example.test'), false);
        assert.equal(context.attributionMembers.find(member => member.id === 'casey@example.test').active, false);
        assert.throws(() => policy.member(context, 'casey@example.test', false), error => error.code === 'INVALID_MEMBER');
    }),
    test('TC-TPT-193', 'profile schema and authorized patching preserve custom bytes and refuse malformed or overbound metadata', async f => {
        await f.create('PRESERVE-1');
        const original = f.record('PRESERVE-1');
        f.write(original.ownerPath, original.bytes.toString('utf8').replace('status:', 'custom_note: "Keep exactly" # author comment\nstatus:') + 'Authored **body** stays.\n');
        author(f); const body = f.record('PRESERVE-1').body;
        const before = f.bytes('PRESERVE-1');
        const previewRequest = proposal(f, 'update', 'PRESERVE-1', { title: 'Preview' }, ADDRESS, { preview: true });
        assert.equal((await f.core.executeOperation(previewRequest, local(f))).primary.status, 'preview');
        assert.deepEqual(f.bytes('PRESERVE-1'), before);
        await save(f, 'update', 'PRESERVE-1', { title: 'Saved' });
        assert.equal(f.record('PRESERVE-1').body, body);
        assert.ok(f.bytes('PRESERVE-1').toString('utf8').includes('custom_note: "Keep exactly" # author comment'));
        const record = f.record('PRESERVE-1'); const profile = { id: ADDRESS, displayName: 'Rowan' };
        for (const profiles of [[{ ...profile, active: true }], [{ ...profile, aliases: [] }], [profile, profile],
            [{ ...profile, id: 'not-email' }], [{ ...profile, displayName: 'N'.repeat(255) }], Array.from({ length: LIMITS.records + 1 }, (_, n) => ({ id: `${n}@example.test`, displayName: 'Bounded' }))]) {
            const candidate = patchRecord(record, {}, { ...record.tracking, memberProfiles: profiles });
            assert.throws(() => policy.validateMetadata(candidate), error => error.code === 'INVALID_RECORD');
        }
        const forged = patchRecord(record, {}, { ...record.tracking, memberProfiles: [{ ...profile, active: true }] });
        f.write(record.ownerPath, forged.bytes);
        const invalid = f.bytes('PRESERVE-1');
        refused(await f.core.executeOperation(proposal(f, 'update', 'PRESERVE-1', { title: 'Do not fix silently' }), local(f)), 'INVALID_RECORD');
        assert.deepEqual(f.bytes('PRESERVE-1'), invalid);
    })
] };
