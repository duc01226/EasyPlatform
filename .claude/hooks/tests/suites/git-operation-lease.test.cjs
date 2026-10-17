'use strict';

// TC-HARNESS-013: bookkeeping must never leak across scope, time or operations.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const vm = require('node:vm');
const { osEssentialsEnv } = require('../lib/os-essentials-env.cjs');
const LIB = path.resolve(__dirname, '../../lib/git-operation-lease.cjs');
const SESSION_END = path.resolve(__dirname, '../../session-end.cjs');
const api = () => require(LIB);
const NOW = 1800000000000;

async function fixture(fn) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'git-lease-test-'));
    try {
        for (const dir of ['project', 'repo-a', 'repo-b', 'store']) fs.mkdirSync(path.join(root, dir));
        const options = { projectDir: path.join(root, 'project'), repository: path.join(root, 'repo-a'),
            sessionId: 'session-a', sourceRequest: 'synthetic-request-13', operations: ['commit'],
            now: NOW, storeDir: path.join(root, 'store') };
        await fn(options, root);
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
}

function recordPath(options, record) {
    return path.join(options.storeDir, record.projectHash, record.sessionHash, `${record.leaseId}.json`);
}

function authorityDomain(leaseApi, o) {
    for (const sessionId of ['session-a', 'session-b', '', ' ', 'default', undefined, '../session-a'])
        for (const operation of ['add', 'commit', 'push', '--amend', undefined])
            for (const delta of [-1, 0, 1, 899999, 900000, 900001]) {
                assert.equal(leaseApi.checkLease({ ...o, sessionId, operation, now: NOW + delta }),
                    sessionId === 'session-a' && operation === 'commit' && delta >= 0 && delta < 900000,
                    JSON.stringify({ sessionId, operation, delta }));
            }
}

function childCall(command, input) {
    return new Promise((resolve, reject) => {
        const child = spawn(process.execPath, [LIB, command], { shell: false, windowsHide: true,
            env: osEssentialsEnv(), stdio: ['pipe', 'pipe', 'pipe'] });
        let out = ''; let err = '';
        child.stdout.on('data', chunk => { out += chunk; }); child.stderr.on('data', chunk => { err += chunk; });
        child.on('error', reject); child.on('close', code => resolve({ code, out, err }));
        child.stdin.on('error', () => {}); // Exit errors are collected after every child returns.
        child.stdin.end(JSON.stringify(input));
    });
}

function sessionEndCall(input, env) {
    return spawnSync(process.execPath, [SESSION_END], {
        input: JSON.stringify(input), encoding: 'utf8', cwd: input.cwd,
        windowsHide: true, env: osEssentialsEnv(env)
    });
}

const tests = [
    { name: 'TC-HARNESS-013 schema rejects malformed and legacy records without inferring consent',
        fn: async () => fixture(o => {
            const record = api().issueLease(o);
            for (const patch of [{ schemaVersion: 0 }, { sourceRequest: '' }, { operations: [] }, { issuedAt: 'today' },
                { projectHash: 'foreign' }, { sessionHash: 'foreign' }, { repositoryHash: 'foreign' }, { leaseId: '../escape' }]) {
                fs.writeFileSync(recordPath(o, record), JSON.stringify({ ...record, ...patch }));
                assert.equal(api().checkLease({ ...o, operation: 'commit' }), false, JSON.stringify(patch));
            }
            fs.writeFileSync(recordPath(o, record), '{');
            assert.equal(api().checkLease({ ...o, operation: 'commit' }), false);
        }) },
    { name: 'TC-HARNESS-013 invalid issue metadata cannot create authority', fn: async () => fixture(o => {
        const leaseApi = api(); // Missing module is a failure, not an accepted invalid-input throw.
        for (const patch of [{ sessionId: undefined }, { sessionId: '' }, { sessionId: ' ' }, { sessionId: 'default' },
            { sourceRequest: '' }, { sourceRequest: 'x'.repeat(513) }, { operations: ['amend'] }, { operations: ['commit', 'commit'] },
            { repository: undefined }, { repository: '$TARGET' }, { repository: '.' }, { now: NaN }]) {
            assert.throws(() => leaseApi.issueLease({ ...o, ...patch }), JSON.stringify(patch));
        }
        assert.deepEqual(fs.readdirSync(o.storeDir), []);
    }) },
    { name: 'TC-HARNESS-013 canonical paths retain same-directory identity', fn: async () => fixture((o, root) => {
        api().issueLease(o);
        assert.equal(api().checkLease({ ...o, projectDir: path.join(o.projectDir, '.'), repository: o.repository + path.sep,
            operation: 'commit' }), true);
        assert.equal(api().checkLease({ ...o, repository: path.join(o.repository, 'absent'), operation: 'commit' }), false);
        const alias = path.join(root, 'repository-alias');
        fs.symlinkSync(o.repository, alias, process.platform === 'win32' ? 'junction' : 'dir');
        assert.equal(api().checkLease({ ...o, repository: alias, operation: 'commit' }), true);
        if (process.platform === 'win32') assert.equal(api().checkLease({ ...o, repository: o.repository.toUpperCase(), operation: 'commit' }), true);
    }) },
    { name: 'TC-HARNESS-013 exact effective repository and project binding', fn: async () => fixture((o, root) => {
        api().issueLease(o);
        for (const patch of [{ repository: path.join(root, 'repo-b') }, { projectDir: path.join(root, 'repo-b') },
            { repository: undefined }, { repository: '$GIT_WORK_TREE' }, { repository: '' }]) {
            assert.equal(api().checkLease({ ...o, ...patch, operation: 'commit' }), false);
        }
    }) },
    { name: 'TC-HARNESS-013 property domain sessions x operations x clock offsets preserves exact authority', fn: async () => fixture(o => {
        api().issueLease(o);
        // Finite domain: 7 sessions x 5 operations x 6 offsets = 210 combinations.
        authorityDomain(api(), o);
    }) },
    { name: 'TC-HARNESS-013 explicit operations stay separate and checks never refresh', fn: async () => fixture(o => {
        const record = api().issueLease({ ...o, operations: ['add', 'commit'] });
        const before = fs.readFileSync(recordPath(o, record), 'utf8');
        assert.equal(api().checkLease({ ...o, operation: 'add' }), true);
        assert.equal(api().checkLease({ ...o, operation: 'push' }), false);
        assert.equal(fs.readFileSync(recordPath(o, record), 'utf8'), before);
    }) },
    { name: 'TC-HARNESS-013 max lifetime, future, empty and exact expiry boundary countercases', fn: async () => fixture(o => {
        for (const ttlMs of [0, -1, 900001, Infinity, 1.5]) assert.throws(() => api().issueLease({ ...o, ttlMs }));
        const record = api().issueLease({ ...o, ttlMs: 1 });
        assert.equal(api().checkLease({ ...o, operation: 'commit' }), true);
        assert.equal(api().checkLease({ ...o, operation: 'commit', now: NOW + 1 }), false);
        for (const patch of [{ issuedAt: NOW + 1 }, { expiresAt: NOW }, { expiresAt: NOW + 900001 }, { issuedAt: 0 }]) {
            fs.writeFileSync(recordPath(o, record), JSON.stringify({ ...record, ...patch }));
            assert.equal(api().checkLease({ ...o, operation: 'commit' }), false);
        }
    }) },
    { name: 'TC-HARNESS-013 exact revoke and session cleanup preserve other records and reject replay', fn: async () => fixture(o => {
        const first = api().issueLease(o);
        const second = api().issueLease({ ...o, operations: ['push'] });
        api().issueLease({ ...o, sessionId: 'session-b' });
        const unrelated = path.join(path.dirname(recordPath(o, first)), 'user-file.json');
        fs.writeFileSync(unrelated, 'synthetic unrelated data');
        assert.equal(api().revokeLease({ ...o, leaseId: first.leaseId }), true);
        assert.equal(api().checkLease({ ...o, operation: 'commit' }), false);
        assert.equal(api().checkLease({ ...o, operation: 'push' }), true);
        assert.throws(() => api().importLease({ ...o, record: first }));
        assert.equal(api().revokeLease({ ...o, sessionId: 'session-b', leaseId: second.leaseId }), false);
        assert.equal(api().revokeSessionLeases(o), 1);
        assert.equal(fs.readFileSync(unrelated, 'utf8'), 'synthetic unrelated data');
        assert.equal(api().checkLease({ ...o, sessionId: 'session-b', operation: 'commit' }), true);
    }) },
    { name: 'TC-HARNESS-013 import validates original lifetime and target without renewal', fn: async () => fixture((o, root) => {
        const record = api().issueLease(o);
        const destination = { ...o, storeDir: path.join(root, 'import-store'), now: NOW + 100 };
        const imported = api().importLease({ ...destination, record });
        assert.equal(imported.expiresAt, record.expiresAt);
        assert.equal(api().checkLease({ ...destination, operation: 'commit' }), true);
        assert.throws(() => api().importLease({ ...destination, record }));
        assert.throws(() => api().importLease({ ...destination, record: { ...record, issuedAt: NOW + 200 } }));
        assert.throws(() => api().importLease({ ...destination, repository: path.join(root, 'repo-b'), record }));
        assert.throws(() => api().importLease({ ...destination, storeDir: path.join(root, 'oversized-store'),
            record: { ...record, padding: 'x'.repeat(8192) } }), 'Import must not publish a record the reader rejects by size');
    }) },
    { name: 'TC-HARNESS-013 concurrent issuers publish whole isolated records', fn: async () => fixture(async o => {
        const { now, ...input } = o;
        const jobs = Array.from({ length: 8 }, (_, i) => childCall('issue', { ...input, operations: [i % 2 ? 'commit' : 'push'] }));
        const outcomes = await Promise.allSettled(jobs);
        const records = outcomes.map(result => {
            assert.equal(result.status, 'fulfilled');
            assert.equal(result.value.code, 0, result.value.err);
            return JSON.parse(result.value.out);
        });
        assert.equal(new Set(records.map(r => r.leaseId)).size, 8);
        for (const record of records) assert.deepEqual(JSON.parse(fs.readFileSync(recordPath(o, record), 'utf8')), record);
        assert.equal(api().checkLease({ ...o, now: Date.now(), operation: 'push' }), true);

        const importing = { ...input, record: records[0], storeDir: path.join(o.storeDir, 'import-race') };
        const imports = await Promise.allSettled(Array.from({ length: 8 }, () => childCall('import', importing)));
        assert.ok(imports.every(result => result.status === 'fulfilled'));
        assert.equal(imports.filter(result => result.value.code === 0).length, 1, 'Exactly one concurrent import may publish');
        assert.deepEqual(JSON.parse(fs.readFileSync(recordPath(importing, records[0]), 'utf8')), records[0]);
    }) },
    { name: 'TC-HARNESS-013 atomic publication failure leaves no partial lease', fn: async () => fixture(o => {
        const original = fs.renameSync;
        try {
            fs.renameSync = () => { throw Object.assign(new Error('synthetic locked destination'), { code: 'EPERM' }); };
            assert.throws(() => api().issueLease(o));
        } finally { fs.renameSync = original; }
        assert.equal(api().checkLease({ ...o, operation: 'commit' }), false);
        const record = api().issueLease(o);
        const file = recordPath(o, record);
        assert.deepEqual(fs.readdirSync(path.dirname(file)), [`${record.leaseId}.json`], 'No failed-write temp or lock residue');
        fs.writeFileSync(`${file}.lock`, 'synthetic crashed writer');
        assert.throws(() => api().revokeLease({ ...o, leaseId: record.leaseId }));
        assert.equal(api().checkLease({ ...o, operation: 'commit', now: NOW + 900000 }), false, 'Crashed lock cannot extend expiry');
    }) },
    { name: 'TC-HARNESS-013 CLI requires explicit metadata and returns exact lifecycle outcomes', fn: async () => fixture(o => {
        const call = (command, input) => spawnSync(process.execPath, [LIB, command], { input: JSON.stringify(input), encoding: 'utf8',
            shell: false, windowsHide: true, env: osEssentialsEnv() });
        const { now, ...input } = o;
        assert.notEqual(call('issue', { ...input, sessionId: undefined }).status, 0);
        assert.notEqual(call('issue', { ...input, now }).status, 0);
        const issued = call('issue', input);
        assert.equal(issued.status, 0, issued.stderr);
        const record = JSON.parse(issued.stdout);
        assert.equal(call('check', { ...input, operation: 'commit' }).status, 0);
        assert.equal(call('check', { ...input, operation: 'push' }).status, 1);
        assert.equal(call('revoke', { ...input, leaseId: record.leaseId }).status, 0);
        assert.equal(call('check', { ...input, operation: 'commit' }).status, 1);
    }) },
    { name: 'TC-HARNESS-013 CLI revoke-session clears only the requested session', fn: async () => fixture(o => {
        const { now, ...input } = o;
        const ownCommit = api().issueLease({ ...input, operations: ['commit'], now });
        const ownPush = api().issueLease({ ...input, operations: ['push'], now });
        const foreign = api().issueLease({ ...input, sessionId: 'session-b', operations: ['commit'], now });
        const call = spawnSync(process.execPath, [LIB, 'revoke-session'], {
            input: JSON.stringify({ projectDir: input.projectDir, sessionId: input.sessionId, storeDir: input.storeDir }),
            encoding: 'utf8', shell: false, windowsHide: true,
            env: osEssentialsEnv()
        });
        assert.equal(call.status, 0, call.stderr);
        assert.equal(JSON.parse(call.stdout), 2);
        assert.equal(api().checkLease({ ...o, operation: 'commit' }), false);
        assert.equal(api().checkLease({ ...o, operation: 'push' }), false);
        assert.equal(api().checkLease({ ...o, sessionId: 'session-b', operation: 'commit' }), true);
        assert.ok(ownCommit.leaseId && ownPush.leaseId && foreign.leaseId);
    }) },
    { name: 'TC-HARNESS-013 registered host endings revoke own leases and preserve recovery on resume/other/compact', fn: async () => fixture((o, root) => {
        // Lifecycle cleanup requires an accepted explicit project root.
        fs.mkdirSync(path.join(o.projectDir, '.claude'));
        const runtime = { ...o, now: Date.now() };
        const env = { CLAUDE_PROJECT_DIR: runtime.projectDir, CK_GIT_LEASE_STORE: runtime.storeDir,
            HOME: root, USERPROFILE: root, TMPDIR: root, TEMP: root, TMP: root };
        const settings = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../../settings.json'), 'utf8'));
        const registration = settings.hooks.SessionEnd.find(group => group.hooks.some(hook => hook.command.includes('/session-end.cjs')));
        assert.ok(registration, 'SessionEnd cleanup must be registered');
        const swap = path.join(root, 'ck', 'swap', runtime.sessionId);
        const snapshot = path.join(root, 'ck', 'snapshots', `${runtime.sessionId}.json`);
        for (const reason of ['clear', 'resume', 'logout', 'prompt_input_exit', 'other', 'exit']) {
            assert.ok(!registration.matcher || new RegExp(registration.matcher).test(reason), `host reason must reach cleanup: ${reason}`);
            fs.mkdirSync(swap, { recursive: true });
            fs.writeFileSync(path.join(swap, 'recent.txt'), 'recovery');
            fs.mkdirSync(path.dirname(snapshot), { recursive: true });
            fs.writeFileSync(snapshot, 'recovery');
            api().issueLease({ ...runtime, operations: ['commit'] });
            const result = sessionEndCall({ hook_event_name: 'SessionEnd', reason, session_id: runtime.sessionId, cwd: runtime.projectDir }, env);
            assert.equal(result.status, 0, result.stderr);
            assert.equal(api().checkLease({ ...runtime, operation: 'commit' }), false, reason);
            const preserve = reason === 'resume' || reason === 'other';
            assert.equal(fs.existsSync(swap), preserve, `swap recovery: ${reason}`);
            assert.equal(fs.existsSync(snapshot), preserve, `snapshot recovery: ${reason}`);
        }
        api().issueLease({ ...runtime, operations: ['commit'] });
        api().issueLease({ ...runtime, sessionId: 'session-b', operations: ['commit'] });
        const clear = sessionEndCall({ reason: 'clear', session_id: runtime.sessionId, cwd: runtime.projectDir }, env);
        assert.equal(clear.status, 0, clear.stderr);
        assert.equal(api().checkLease({ ...runtime, operation: 'commit' }), false);
        assert.equal(api().checkLease({ ...runtime, sessionId: 'session-b', operation: 'commit' }), true);

        const exitLease = api().issueLease({ ...runtime, operations: ['push'] });
        const exit = sessionEndCall({ reason: 'exit', session_id: runtime.sessionId, cwd: runtime.projectDir }, env);
        assert.equal(exit.status, 0, exit.stderr);
        assert.equal(api().checkLease({ ...runtime, operation: 'push' }), false);

        const compactLease = api().issueLease({ ...runtime, operations: ['commit'] });
        const before = fs.readFileSync(recordPath(runtime, compactLease), 'utf8');
        const compact = sessionEndCall({ reason: 'compact', session_id: runtime.sessionId, cwd: runtime.projectDir }, env);
        assert.equal(compact.status, 0, compact.stderr);
        assert.equal(api().checkLease({ ...runtime, operation: 'commit' }), true);
        assert.equal(fs.readFileSync(recordPath(runtime, compactLease), 'utf8'), before);
        api().revokeLease({ ...runtime, leaseId: compactLease.leaseId });
        assert.ok(exitLease.leaseId);
    }) },
    { name: 'TC-HARNESS-013 semantic mutants expiry, operation, repository and fallback-session are killed', fn: async () => fixture((o, root) => {
        const source = fs.readFileSync(LIB, 'utf8');
        const mutations = [
            ['expiry', 'context.now < record.expiresAt', 'true'],
            ['operation', 'record.operations.includes(options.operation)', 'true'],
            ['repository', 'record.repository === context.repository && record.repositoryHash === context.repositoryHash', 'true'],
            ['default-session', " || options.sessionId.toLowerCase() === 'default'", '']
        ];
        for (const [name, original, replacement] of mutations) {
            assert.equal(source.split(original).length - 1, 1, `Unique mutation anchor: ${name}`);
            const sandbox = { require, module: { exports: {} }, process, Buffer, __filename: LIB, __dirname: path.dirname(LIB) };
            vm.runInNewContext(source.replace(original, replacement), sandbox, { filename: `synthetic-${name}.cjs` });
            const mutated = sandbox.module.exports;
            const scoped = { ...o, storeDir: path.join(root, `mutant-${name}`) };
            mutated.issueLease(scoped);
            let killed = false;
            try {
                authorityDomain(mutated, scoped);
                assert.equal(mutated.checkLease({ ...scoped, repository: path.join(root, 'repo-b'), operation: 'commit' }), false);
                assert.throws(() => mutated.issueLease({ ...scoped, sessionId: 'default' }));
            } catch (error) {
                if (error.code !== 'ERR_ASSERTION') throw error;
                killed = true;
            }
            assert.equal(killed, true, `Surviving semantic mutant: ${name}`);
        }
    }) }
];

module.exports = { name: 'git-operation-lease', tests };
