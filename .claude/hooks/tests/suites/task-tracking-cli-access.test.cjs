'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { spawn, spawnSync } = require('node:child_process');
const { trackingTest: test, earlierProject, git } = require('../lib/task-tracking-fixture.cjs');
const { migrate } = require('../../lib/task-tracking-migration.cjs');

const CLI_PATH = path.resolve(__dirname, '../../../skills/task-track/scripts/task-track.cjs');

// Use the shipped CLI against the fixture's selected adopter root. Automatic
// dependency installation is disabled by withFixture; a missing pinned parser
// is a real setup failure, never a skipped case or a fake successful response.
function invoke(f, command, options = [], expectedExit = 0) {
    const child = spawnSync(process.execPath, [CLI_PATH, command, '--root', f.root, ...options],
        { cwd: f.root, env: { ...process.env }, shell: false, encoding: 'utf8', timeout: 10000, maxBuffer: 2 * 1024 * 1024 });
    assert.equal(child.error, undefined, child.error?.message); assert.equal(child.status, expectedExit, child.stderr || child.stdout);
    assert.equal(child.stderr, '', 'A provisioned read command emits only its one stdout result');
    const lines = child.stdout.trim().split('\n'); assert.equal(lines.length, 1);
    return JSON.parse(lines[0]);
}

// One command exactly as typed, with the exit status it must end with. `invoke` adds the selected root.
function command(f, argv, expectedExit = 0) {
    const child = spawnSync(process.execPath, [CLI_PATH, ...argv],
        { cwd: f.root, env: { ...process.env }, shell: false, encoding: 'utf8', timeout: 20000, maxBuffer: 2 * 1024 * 1024 });
    assert.equal(child.error, undefined, child.error?.message); assert.equal(child.status, expectedExit, child.stderr || child.stdout);
    assert.equal(child.stderr, ''); const lines = child.stdout.trim().split('\n'); assert.equal(lines.length, 1);
    return JSON.parse(lines[0]);
}

// Everything under the tracker's disposable output root, by content: a read or a refused request leaves it exactly as it was.
function generatedOutput(f) {
    const found = [];
    const visit = relative => {
        if (!fs.existsSync(path.join(f.root, relative))) return;
        for (const entry of fs.readdirSync(path.join(f.root, relative), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
            const child = `${relative}/${entry.name}`;
            if (entry.isDirectory()) { found.push([`${child}/`, 'directory']); visit(child); }
            else found.push([child, createHash('sha256').update(fs.readFileSync(path.join(f.root, child))).digest('hex')]);
        }
    };
    visit('tmp');
    return found;
}

// A malformed report request is refused while its options are read: no snapshot is written, and one made earlier is kept as it was.
function refusedBeforeWriting(f, requests) {
    const stored = f.storedState(); const generated = generatedOutput(f);
    const refusals = requests.map(options => {
        const refusal = invoke(f, 'report', options, 1);
        assert.deepEqual([refusal.status, refusal.code], ['refused', 'INVALID_INPUT'], options.join(' '));
        return refusal;
    });
    assert.deepEqual(generatedOutput(f), generated); assert.deepEqual(f.storedState(), stored);
    return refusals;
}

async function withBareServe(f, callback) {
    const child = spawn(process.execPath, [CLI_PATH, 'serve', '--root', f.root],
        { cwd: f.root, env: { ...process.env }, shell: false, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = ''; let stderr = ''; let settled = false; let timer;
    const closed = new Promise(resolve => child.once('close', (code, signal) => resolve({ code, signal })));
    const listening = new Promise((resolve, reject) => {
        const finish = (error, value) => {
            if (settled) return; settled = true; clearTimeout(timer);
            if (error) reject(error); else resolve(value);
        };
        timer = setTimeout(() => finish(new Error(`CLI serve did not publish readiness: ${stdout} ${stderr}`)), 10000);
        child.once('error', error => finish(error));
        child.stderr.on('data', chunk => { stderr += chunk.toString(); });
        child.stdout.on('data', chunk => {
            stdout += chunk.toString();
            if (Buffer.byteLength(stdout) > 65536) return finish(new Error('CLI serve readiness output exceeded its budget'));
            const end = stdout.indexOf('\n'); if (end < 0) return;
            try {
                const result = JSON.parse(stdout.slice(0, end));
                if (result.status !== 'listening') return finish(new Error(`CLI serve refused before readiness: ${stdout} ${stderr}`));
                finish(null, result);
            } catch (error) { finish(error); }
        });
        closed.then(result => finish(new Error(`CLI serve stopped before readiness: ${JSON.stringify(result)} ${stdout} ${stderr}`)));
    });
    try { return await callback(await listening); }
    finally {
        clearTimeout(timer);
        if (child.exitCode === null && child.signalCode === null) child.kill('SIGTERM');
        let stopTimer;
        try {
            const result = await Promise.race([closed, new Promise((_, reject) => {
                stopTimer = setTimeout(() => { child.kill('SIGKILL'); reject(new Error('Owned CLI serve child did not stop')); }, 10000);
            })]);
            // POSIX runs the CLI's shutdown handler; Windows may terminate this
            // owned process directly for SIGTERM. Neither outcome claims browser observation.
            assert.ok(result.code === 0 || result.signal === 'SIGTERM', `Unexpected CLI stop: ${JSON.stringify(result)} ${stderr}`);
            assert.equal(stderr, '', 'Bare read-only serve must not install, launch or emit an error');
            assert.equal(stdout.trim().split('\n').length, 1);
        } finally { clearTimeout(stopTimer); }
    }
}

async function request(listening, route, value, authenticated = true) {
    const selected = new URL(listening.url); const token = selected.hash.slice('#session='.length);
    const headers = { ...(authenticated ? { 'x-workspace-session': token } : {}) };
    if (value !== undefined) Object.assign(headers, { origin: selected.origin, 'content-type': 'application/json' });
    const response = await fetch(new URL(route, selected.origin), { method: value === undefined ? 'GET' : 'POST', headers,
        ...(value === undefined ? {} : { body: JSON.stringify(value) }), signal: AbortSignal.timeout(5000) });
    return { status: response.status, body: await response.json() };
}

module.exports = { name: 'Task tracking CLI read-only access integration', tests: [
    test('TC-TPT-145', 'report and bare serve disclose actual local read capabilities and confidence without changing canonical work or claiming an opening', async f => {
        assert.ok(Number(process.versions.node.split('.')[0]) >= 20, 'The declared optional workspace requires Node 20+');
        f.write('src/145-export.js', 'The selected source has the currently observed outcome.\n');
        await f.create('TASK-145'); await f.saved('link', 'TASK-145', { links: [{ relation: 'source', path: 'src/145-export.js' }] });
        await f.accepted('TASK-145'); await f.create('TASK-145-unrelated');
        const owners = new Map(f.records().map(record => [record.id, f.bytes(record.id)]));
        const controls = new Map(['docs/project-config.json', '.claude/.ck.local.json', 'src/145-export.js']
            .map(relative => [relative, fs.readFileSync(path.join(f.root, relative))]));
        const work = f.record('TASK-145'); const view = f.view('TASK-145'); const metrics = f.progress().metrics;
        const conserved = () => {
            for (const [id, bytes] of owners) assert.deepEqual(f.bytes(id), bytes, id);
            for (const [relative, bytes] of controls) assert.deepEqual(fs.readFileSync(path.join(f.root, relative)), bytes, relative);
            assert.deepEqual(f.record('TASK-145').tracking, work.tracking);
            assert.deepEqual(f.view('TASK-145'), view); assert.deepEqual(f.progress().metrics, metrics);
        };
        const inspected = invoke(f, 'inspect');
        assert.equal(inspected.project.root, f.root); assert.equal(inspected.source.kind, 'worktree');
        assert.equal(inspected.source.remoteFreshness, 'unknown'); assert.equal(inspected.coverage, 'complete');
        assert.equal(inspected.profile.available, true); assert.deepEqual(inspected.metrics, metrics);
        assert.equal(inspected.items.find(item => item.id === 'TASK-145').verification.status, 'current');
        assert.equal(inspected.items.find(item => item.id === 'TASK-145').acceptance.accepted, true);
        assert.equal(inspected.health.status, 'unknown'); conserved();
        // Inspect only the public nonvisual report result, never its generated markup.
        const generated = invoke(f, 'report');
        assert.equal(generated.kind, 'report'); assert.equal(generated.status, 'generated');
        assert.equal(generated.coverage, 'complete'); assert.equal(generated.fingerprint, inspected.fingerprint);
        assert.equal(typeof generated.path, 'string'); assert.ok(generated.path.length > 0);
        assert.equal(generated.viewer, undefined); assert.equal(generated.launch, undefined); conserved();
        const current = invoke(f, 'report'); assert.equal(current.status, 'current');
        assert.equal(current.path, generated.path); assert.equal(current.fingerprint, generated.fingerprint); conserved();
        const pendingDraft = f.request('update', 'TASK-145', { title: 'Read-only session cannot save this draft' });
        const draft = JSON.stringify(pendingDraft);
        await withBareServe(f, async listening => {
            assert.equal(listening.status, 'listening'); assert.equal(listening.root, f.root); assert.equal(listening.writable, false);
            assert.equal(listening.launch, undefined);
            const url = new URL(listening.url);
            assert.equal(url.protocol, 'http:'); assert.equal(url.hostname, '127.0.0.1'); assert.ok(url.hash.startsWith('#session='));
            // Before a session is supplied, no selected work is returned or cached.
            const deniedRead = await request(listening, '/api/session', undefined, false);
            assert.equal(deniedRead.status, 403); assert.deepEqual(deniedRead.body, { status: 'refused', code: 'SESSION_REQUIRED' });
            const launcher = await request(listening, '/api/launcher');
            assert.equal(launcher.status, 200); assert.deepEqual(launcher.body, { reopen: false });
            const session = await request(listening, '/api/session');
            assert.equal(session.status, 200); assert.equal(session.body.root, f.root); assert.equal(session.body.actor, null);
            assert.equal(session.body.writable, false); assert.equal(session.body.profile.available, true);
            assert.equal(session.body.snapshot.source.kind, 'worktree'); assert.equal(session.body.snapshot.coverage, 'complete');
            assert.deepEqual(session.body.snapshot.metrics, metrics);
            assert.deepEqual(session.body.snapshot.items.find(item => item.id === 'TASK-145'), view); conserved();
            const scoped = await request(listening, '/api/inspect', {});
            assert.equal(scoped.status, 200); assert.equal(scoped.body.project.root, f.root);
            assert.equal(scoped.body.source.kind, 'worktree'); assert.equal(scoped.body.source.remoteFreshness, 'unknown');
            assert.equal(scoped.body.coverage, 'complete'); assert.deepEqual(scoped.body.metrics, metrics);
            const readReport = await request(listening, '/api/report', {});
            assert.equal(readReport.status, 200); assert.equal(readReport.body.status, 'current');
            assert.equal(readReport.body.path, generated.path); assert.equal(readReport.body.fingerprint, generated.fingerprint); conserved();
            const deniedSave = await request(listening, '/api/operation', pendingDraft);
            assert.equal(deniedSave.status, 403); assert.deepEqual(deniedSave.body, { status: 'refused', code: 'READ_ONLY' });
            assert.ok(!f.record('TASK-145').tracking.receipts.some(receipt => receipt.operationId === pendingDraft.operationId));
            assert.ok(!f.record('TASK-145').tracking.history.some(entry => entry.operationId === pendingDraft.operationId));
            assert.equal(JSON.stringify(pendingDraft), draft); conserved();
            const unavailable = await request(listening, '/api/inspect', { scopeId: 'AREA-145-missing' });
            assert.equal(unavailable.status, 200); assert.equal(unavailable.body.coverage, 'unavailable');
            assert.equal(unavailable.body.scope.coverage, 'unavailable'); assert.deepEqual(unavailable.body.scope.memberIds, []);
            assert.equal(unavailable.body.metrics, null); assert.ok(unavailable.body.diagnostics.some(item => item.code === 'UNAVAILABLE_SCOPE'));
            assert.equal(unavailable.body.primary, undefined); conserved();
        });
        conserved(); assert.equal(JSON.stringify(pendingDraft), draft);
    }),
    test('TC-TPT-247', 'the shipped command lists migrate, previews it without changing anything and accepts the preview and abandon flags for migrate alone, never both', async f => {
        const help = command(f, ['help']);
        assert.ok(help.commands.includes('migrate')); assert.match(help.usage.migrate, /^migrate --root CHECKOUT \[--dry-run \| --abandon\] \[--backup-confirmed\]; .*never abandons one; .*--abandon is the only way to abandon an unfinished migration/);
        // The help says where a run starts, what it needs where version control cannot restore the project, and that the preview and a repeated run do not need it.
        assert.match(help.usage.migrate, /; a run starts only where the record root and the project configuration can be restored: in a Git checkout that tracks them with nothing uncommitted, or, where version control cannot restore them \(no Git checkout, or record files or the configuration that Git ignores\), with --backup-confirmed, which states that a backup you can restore exists; without it such a run is refused \(NO_RESTORE_POINT\), the preview says so beforehand, and a repeated run of an unfinished migration does not ask again; /);
        assert.ok(help.boundaries.some(line => /MIGRATION_REQUIRED/.test(line) && /migrate is run explicitly/.test(line) && /one-way/.test(line) && /refused \(NO_RESTORE_POINT\) where version control cannot restore them until a backup is confirmed with --backup-confirmed$/.test(line)));
        // A scope narrows what inspect and check state, never the ready list.
        assert.match(help.usage.inspect, /^inspect\|check\|ready --root CHECKOUT \[--scope EXACT_ID\] \[--ref LOCAL_REF\]; --scope names one exact area or initiative, and inspect and check then state that scope's members, delivery figures and health; the ready and excluded lists always cover the whole project, so --scope does not narrow ready; inspect alone also accepts --figures, /);
        const project = await earlierProject(f);
        const stored = f.storedState();
        const preview = invoke(f, 'migrate', ['--dry-run']);
        assert.deepEqual([preview.kind, preview.status, preview.dryRun, preview.from, preview.to], ['migration', 'preview', true, 2, 3]);
        assert.deepEqual(preview.moves, [{ itemId: 'EPIC-E', from: 'work/projects/EPIC-E.md', to: 'work/initiatives/EPIC-E.md' }]);
        assert.deepEqual(preview.progress, { total: project.expected.total, accepted: project.expected.accepted, remaining: project.expected.remaining, eligibleIds: project.expected.eligibleIds });
        assert.deepEqual([preview.recount.conserved, preview.recount.groups.map(group => [group.id, group.becomes, group.eligible])], [true, [['EPIC-E', 'initiative', 2]]]);
        // Asked twice of an unchanged project, the shipped command answers alike.
        assert.deepEqual(invoke(f, 'migrate', ['--dry-run']), preview);
        // Migration is never a side effect: a read, a status request and a preview leave an earlier project as it was.
        assert.equal(invoke(f, 'inspect').vocabulary.project.code, 'MIGRATION_REQUIRED');
        // An actor or another command's option on migrate, the preview or abandon flag on any other command, and both flags at once are refused as typed.
        for (const argv of [['migrate', '--root', f.root, '--dry-run', '--actor', 'owner'], ['migrate', '--root', f.root, '--write'], ['inspect', '--root', f.root, '--dry-run'], ['migrate', '--dry-run'],
            ['inspect', '--root', f.root, '--abandon'], ['migrate', '--root', f.root, '--abandon', '--actor', 'owner'], ['migrate', '--root', f.root, '--abandon', '--dry-run'], ['migrate', '--abandon']]) {
            const refusal = command(f, argv, 1);
            assert.deepEqual([refusal.status, refusal.code], ['refused', 'INVALID_INPUT'], argv.join(' '));
        }
        assert.deepEqual(f.storedState(), stored); assert.ok(!fs.existsSync(path.join(f.root, 'work/.vocabulary-migration.json')));
    }),
    test('TC-TPT-248', 'the shipped command migrates only when asked without the preview flag and ends with a failing status whenever the migration did not finish', async f => {
        const project = await earlierProject(f);
        const expected = { total: project.expected.total, accepted: project.expected.accepted, remaining: project.expected.remaining, eligibleIds: project.expected.eligibleIds };
        const stored = f.storedState();
        // Refused: nothing changed, failing status.
        f.write('work/tasks/BROKEN.md', 'No frontmatter here.\n');
        const refusal = invoke(f, 'migrate', [], 1);
        assert.deepEqual([refusal.kind, refusal.status, refusal.code], ['migration', 'refused', 'INCOMPLETE_SCOPE']); assert.ok(!JSON.stringify(refusal).includes(f.root));
        fs.rmSync(path.join(f.root, 'work/tasks/BROKEN.md')); assert.deepEqual(f.storedState(), stored);
        // Unfinished: a progress record this migration did not write stops the command with a failing status.
        f.write('work/.vocabulary-migration.json', '{}');
        assert.deepEqual([invoke(f, 'migrate', [], 1).status, invoke(f, 'migrate', ['--dry-run'], 1).code], ['interrupted', 'MIGRATION_IN_PROGRESS']);
        assert.equal(invoke(f, 'inspect', [], 1).diagnostics[0].code, 'MIGRATION_IN_PROGRESS');
        fs.rmSync(path.join(f.root, 'work/.vocabulary-migration.json')); assert.deepEqual(f.storedState(), stored);
        // This project sits outside version control, so the run is asked with the confirmation that a backup exists.
        const migrated = invoke(f, 'migrate', ['--backup-confirmed']);
        assert.deepEqual([migrated.status, migrated.verified], ['migrated', true]); assert.deepEqual(migrated.progress, expected);
        const inspected = invoke(f, 'inspect');
        assert.deepEqual([inspected.vocabulary.project.state, inspected.metrics.total, inspected.metrics.accepted, inspected.metrics.eligibleIds], ['current', expected.total, expected.accepted, expected.eligibleIds]);
        assert.ok(fs.existsSync(path.join(f.root, 'work/initiatives/EPIC-E.md')) && !fs.existsSync(path.join(f.root, 'work/projects')));
        // The former group is read through the same command as the initiative it became, holding the tasks it listed.
        const scoped = invoke(f, 'inspect', ['--scope', 'EPIC-E']);
        assert.deepEqual([scoped.scope.kind, scoped.metrics.eligibleIds], ['initiative', expected.eligibleIds]);
        // Repeated: nothing to migrate is a successful answer, for the run and for its preview.
        const after = f.storedState();
        for (const options of [[], ['--dry-run']]) assert.deepEqual([invoke(f, 'migrate', options).status, invoke(f, 'migrate', options).code], ['current', 'NOTHING_TO_MIGRATE']);
        assert.deepEqual(f.storedState(), after);
    }),
    test('TC-TPT-249', 'the shipped command abandons an unfinished migration only when asked to: asked, it ends with success once the earlier project is back whole and with a failing status before that, and unasked it never abandons', async f => {
        const project = await earlierProject(f, { commit: true });
        const expected = { total: project.expected.total, accepted: project.expected.accepted, remaining: project.expected.remaining, eligibleIds: project.expected.eligibleIds };
        const earlier = f.storedState();
        const journal = path.join(f.root, 'work/.vocabulary-migration.json');
        // No migration is unfinished: there is nothing to abandon, which is a successful answer that changes nothing.
        assert.deepEqual([invoke(f, 'migrate', ['--abandon']).status, invoke(f, 'migrate', ['--abandon']).code], ['current', 'NOTHING_TO_ABANDON']); assert.deepEqual(f.storedState(), earlier);
        // A migration stopped just before verification, as a closed terminal would leave it.
        assert.equal((await migrate(f.root, { checkpoint: name => { if (name === 'before-verify') throw new Error('simulated interruption'); } })).status, 'interrupted');
        // Asked to abandon before anything is back: refused with a failing status, nothing changed.
        const stopped = f.storedState();
        const tooEarly = invoke(f, 'migrate', ['--abandon'], 1);
        assert.deepEqual([tooEarly.kind, tooEarly.status, tooEarly.code], ['migration', 'interrupted', 'RESTORE_INCOMPLETE']); assert.ok(tooEarly.notRestored.includes('work/projects is not back'));
        assert.deepEqual(f.storedState(), stopped);
        git(f, ['checkout', '--', 'work', 'docs']);
        // Unasked, the command neither carries the restored project further nor abandons it, and states both ways on.
        const restored = f.storedState();
        const undecided = invoke(f, 'migrate', [], 1);
        assert.deepEqual([undecided.status, undecided.code], ['interrupted', 'RESTORED_FROM_OUTSIDE']); assert.ok(!JSON.stringify(undecided).includes(f.root));
        assert.match(undecided.abandon[1], /^remove the record this migration wrote into a location the earlier vocabulary also uses: work\/initiatives\/EPIC-E\.md$/);
        assert.match(undecided.abandon.at(-1), /^run migrate --root <checkout> --abandon: it checks that the project is back whole and removes the progress record/);
        assert.match(undecided.reason, /To complete the migration instead, undo that restore: /);
        assert.equal(invoke(f, 'migrate', ['--abandon'], 1).code, 'RESTORE_INCOMPLETE'); assert.deepEqual(f.storedState(), restored);
        // The stated steps, then the request itself as the last one.
        git(f, ['clean', '-f', '-d', '--quiet', '--', 'work/initiatives']);
        assert.match(invoke(f, 'migrate', ['--dry-run'], 1).reason, /earlier project is back as it was before the migration began\. To end the migration run migrate --root <checkout> --abandon/);
        // Whole, and still not abandoned by the command without the flag.
        assert.equal(invoke(f, 'migrate', [], 1).code, 'RESTORED_FROM_OUTSIDE'); assert.ok(fs.existsSync(journal));
        const ended = invoke(f, 'migrate', ['--abandon']);
        assert.deepEqual([ended.kind, ended.status, ended.code, ended.progress], ['migration', 'abandoned', 'MIGRATION_ABANDONED', expected]);
        assert.deepEqual(f.storedState(), earlier); assert.ok(!fs.existsSync(journal));
        const inspected = invoke(f, 'inspect');
        assert.deepEqual([inspected.vocabulary.project.code, inspected.metrics.total, inspected.metrics.accepted, inspected.metrics.eligibleIds], ['MIGRATION_REQUIRED', expected.total, expected.accepted, expected.eligibleIds]);
        // A progress record the migration did not write is acted on by neither form of the command.
        f.write('work/.vocabulary-migration.json', '{}');
        for (const options of [[], ['--abandon']]) assert.deepEqual([invoke(f, 'migrate', options, 1).status, invoke(f, 'migrate', options, 1).code], ['interrupted', 'INVALID_MIGRATION_RECORD']);
        assert.equal(fs.readFileSync(journal, 'utf8'), '{}');
    }),
    test('TC-TPT-244', 'the shipped report command refuses a project that holds both vocabularies or an unfinished migration with that project\'s own reason', async f => {
        await earlierProject(f);
        const made = invoke(f, 'report'); const kept = fs.readFileSync(path.join(f.root, made.path));
        const stored = f.storedState();
        fs.mkdirSync(path.join(f.root, 'work/areas'));
        const mixed = invoke(f, 'report', [], 1);
        assert.deepEqual([mixed.status, mixed.code], ['refused', 'MIXED_VOCABULARY']); assert.match(mixed.reason, /^Mixed vocabularies: .*current: areas\); prior output preserved$/);
        fs.rmdirSync(path.join(f.root, 'work/areas')); f.write('work/.vocabulary-migration.json', '{}');
        const migrating = invoke(f, 'report', [], 1);
        assert.deepEqual([migrating.status, migrating.code], ['refused', 'MIGRATION_IN_PROGRESS']); assert.match(migrating.reason, /^Migration in progress: .*; prior output preserved$/);
        fs.rmSync(path.join(f.root, 'work/.vocabulary-migration.json'));
        assert.deepEqual(fs.readFileSync(path.join(f.root, made.path)), kept); assert.deepEqual(f.storedState(), stored);
    }),
    test('TC-TPT-259', 'inspect --item returns every record with that identity and never picks between duplicates', async f => {
        assert.match(command(f, ['help']).usage.inspect, /inspect --root CHECKOUT --item EXACT_ID \[--ref LOCAL_REF\]/);
        f.write('src/259-outcome.js', 'exports.outcome = 1;\n');
        await f.create('P2'); await f.saved('link', 'P2', { links: [{ relation: 'source', path: 'src/259-outcome.js' }] }); await f.accepted('P2');
        await f.create('D', 'initiative'); await f.create('TASK-259-shared');
        git(f, ['init']); git(f, ['add', '--', 'docs', 'work', 'src']); git(f, ['commit', '-m', 'Shared copy of the work']); const oid = git(f, ['rev-parse', 'HEAD']);
        // A snapshot exists before any record is requested, so a refresh caused by a read would show as changed output.
        assert.equal(invoke(f, 'report').status, 'generated');
        let stored = f.storedState(); let generated = generatedOutput(f);
        const unchanged = () => { assert.deepEqual(f.storedState(), stored); assert.deepEqual(generatedOutput(f), generated); };
        // Each record exactly as a whole read shows it, after the same transport.
        const shown = id => JSON.parse(JSON.stringify(f.progress().items.filter(item => item.id === id)));
        const whole = invoke(f, 'inspect'); assert.equal(whole.coverage, 'complete');
        const found = invoke(f, 'inspect', ['--item', 'P2']);
        assert.deepEqual(found, { status: 'found', itemId: 'P2', records: shown('P2'), coverage: 'complete', fingerprint: whole.fingerprint, diagnostics: [] });
        // In full: outcome, criteria, links, responsibility, proof, acceptance and history, with where the record is kept.
        assert.equal(found.records.length, 1); const [record] = found.records;
        assert.equal(record.ownerPath, f.record('P2').ownerPath); assert.equal(record.intent, 'Let an operator export a selected subset');
        assert.deepEqual(record.criteria.map(criterion => criterion.id), ['selected-rows']); assert.deepEqual(record.links.map(link => [link.relation, link.path]), [['source', 'src/259-outcome.js']]);
        assert.equal(record.assigneeId, 'owner'); assert.equal(record.proofs.length, 1); assert.equal(record.acceptanceHistory.length, 1);
        assert.equal(record.acceptance.accepted, true); assert.equal(record.verification.status, 'current'); assert.equal(record.history.length, f.record('P2').tracking.history.length);
        // An identity nobody carries is named as not found; a shorter, longer or differently cased one never stands in for it.
        for (const absent of ['Z', 'P', 'p2', 'P2-', 'P22']) assert.deepEqual(invoke(f, 'inspect', ['--item', absent]),
            { status: 'not-found', itemId: absent, records: [], coverage: 'complete', fingerprint: whole.fingerprint, diagnostics: [] }, absent);
        // Text that is no item identity is refused as typed, and so is the option on another command or beside a scope.
        for (const invalid of ['../P2', 'P 2', '-P2', 'P2.md', 'x'.repeat(121)]) {
            const refusal = invoke(f, 'inspect', ['--item', invalid], 1);
            assert.deepEqual([refusal.status, refusal.code, refusal.records], ['refused', 'INVALID_INPUT', undefined], invalid);
        }
        for (const argv of [['check', '--root', f.root, '--item', 'P2'], ['ready', '--root', f.root, '--item', 'P2'], ['report', '--root', f.root, '--item', 'P2'],
            ['inspect', '--root', f.root, '--item', 'P2', '--scope', 'D'], ['inspect', '--root', f.root, '--item'], ['inspect', '--root', f.root, '--item', 'P2', '--item', 'D']]) {
            const refusal = command(f, argv, 1); assert.deepEqual([refusal.status, refusal.code], ['refused', 'INVALID_INPUT'], argv.join(' '));
        }
        unchanged();
        // A pinned shared source answers with the record as that source holds it; the working copy answers with its own.
        await f.saved('update', 'TASK-259-shared', { title: 'Changed after the shared copy' }); stored = f.storedState(); generated = generatedOutput(f);
        const pinned = invoke(f, 'inspect', ['--item', 'TASK-259-shared', '--ref', oid]); const local = invoke(f, 'inspect', ['--item', 'TASK-259-shared']);
        assert.deepEqual([pinned.status, pinned.records.length, pinned.records[0].title, pinned.records[0].revision], ['found', 1, 'Export selected rows', 1]);
        assert.deepEqual([local.status, local.records.length, local.records[0].title, local.records[0].revision], ['found', 1, 'Changed after the shared copy', 2]);
        unchanged();
        // The same identity captured twice: both records come back with their own locations and the answer selects neither.
        const first = f.record('D').ownerPath; const second = `${path.posix.dirname(first)}/D-second-capture.md`;
        f.write(second, f.bytes('D')); stored = f.storedState();
        const ambiguous = invoke(f, 'inspect', ['--item', 'D']);
        assert.deepEqual(Object.keys(ambiguous).sort(), ['coverage', 'diagnostics', 'fingerprint', 'itemId', 'records', 'status']);
        assert.deepEqual([ambiguous.status, ambiguous.itemId, ambiguous.coverage], ['ambiguous', 'D', 'partial']);
        assert.deepEqual(ambiguous.records.map(item => item.ownerPath).sort(), [first, second].sort()); assert.deepEqual(ambiguous.records, shown('D'));
        assert.ok(ambiguous.diagnostics.some(item => item.itemId === 'D' && item.code === 'DUPLICATE_ID'));
        assert.ok(ambiguous.diagnostics.every(item => item.itemId === undefined || item.itemId === 'D'));
        // Another identity is still found beside it, and the repeated identity's findings are not reported against it.
        const beside = invoke(f, 'inspect', ['--item', 'P2']);
        assert.deepEqual([beside.status, beside.records.length, beside.coverage], ['found', 1, 'partial']); assert.equal(beside.diagnostics.some(item => item.itemId === 'D'), false);
        unchanged();
        // A project that cannot be read answers a single-record request exactly as it answers any other read.
        f.config.taskTracking.profile = { kind: 'native', version: 1, registration: 'unavailable', sources: [] }; f.saveConfig(); stored = f.storedState();
        const undated = ({ asOf, ...read }) => read;
        const unreadable = undated(invoke(f, 'inspect', [], 1)); assert.equal(unreadable.coverage, 'unavailable');
        assert.deepEqual(undated(invoke(f, 'inspect', ['--item', 'P2'], 1)), unreadable); assert.equal(unreadable.records, undefined);
        unchanged();
    }),
    test('TC-TPT-260', 'a form or a budget given to the shipped report command is the one written, apart from the default snapshot', async f => {
        await f.create('TASK-260');
        const kept = invoke(f, 'report'); assert.deepEqual([kept.status, kept.detail], ['generated', 'full']);
        const bytes = fs.readFileSync(path.join(f.root, kept.path));
        const packed = invoke(f, 'report', ['--detail', 'packed']), none = invoke(f, 'report', ['--detail', 'none']);
        assert.deepEqual([packed.status, packed.detail, none.status, none.detail], ['generated', 'packed', 'generated', 'none']);
        assert.equal(new Set([kept.path, packed.path, none.path]).size, 3);
        assert.ok(none.bytes < kept.bytes && fs.statSync(path.join(f.root, none.path)).size === none.bytes);
        // A budget nothing fits still writes the smallest form, and the result says the budget was not met.
        const tight = invoke(f, 'report', ['--max-bytes', '1']);
        assert.deepEqual([tight.status, tight.detail, tight.requestedDetail, tight.maxBytes, tight.budgetMet], ['generated', 'none', 'full', 1, false]);
        // A budget the asked form fits keeps that form.
        const roomy = invoke(f, 'report', ['--detail', 'packed', '--max-bytes', String(kept.bytes * 4)]);
        assert.deepEqual([roomy.detail, roomy.requestedDetail, roomy.budgetMet], ['packed', undefined, true]);
        assert.deepEqual(fs.readFileSync(path.join(f.root, kept.path)), bytes);
        // With no form named by the project or the request, the command writes the compact version within the default budget;
        // the full version is still there for the asking.
        delete f.config.taskTracking.report.detail; f.saveConfig();
        const byDefault = invoke(f, 'report');
        assert.deepEqual([byDefault.path, byDefault.detail, byDefault.maxBytes, byDefault.budgetMet], [kept.path, 'packed', 15 * 1024 * 1024, true]);
        const asked = invoke(f, 'report', ['--detail', 'full']); assert.deepEqual([asked.detail, asked.maxBytes], ['full', undefined]); assert.notEqual(asked.path, kept.path);
    }),
    test('TC-TPT-253', 'report refuses an unknown detail form before writing anything and keeps the previous snapshot', async f => {
        const { argumentsFor, reportOptions } = require(CLI_PATH);
        assert.match(command(f, ['help']).usage.report, /\[--detail full\|packed\|none\] \[--max-bytes BYTES\]/);
        await f.create('TASK-253');
        // Only the three exact words name a form; anything else is refused while the request is read.
        for (const word of ['complete', 'FULL', 'Packed', 'compact', 'full,packed', ' none', 'none ', '0'])
            assert.throws(() => argumentsFor(['report', '--root', f.root, '--detail', word]), { code: 'INVALID_INPUT', message: 'Detail form invalid: use full|packed|none' }, word);
        // The form belongs to report alone.
        for (const other of ['inspect', 'check', 'ready', 'serve', 'apply']) assert.throws(() => argumentsFor([other, '--root', f.root, '--detail', 'full']), { code: 'INVALID_INPUT' }, other);
        // Through the shipped command: no snapshot exists yet and the refusals create none.
        const malformed = [['--detail', 'complete'], ['--detail', 'full,packed'], ['--detail'], ['--detail', 'packed', '--detail', 'none'], ['--scope', 'F', '--detail', 'compact', '--open']];
        for (const refusal of refusedBeforeWriting(f, malformed.slice(0, 2))) assert.equal(refusal.reason, 'Detail form invalid: use full|packed|none');
        refusedBeforeWriting(f, malformed.slice(2)); assert.equal(generatedOutput(f).some(([name]) => name.endsWith('.html')), false);
        // A snapshot made earlier is kept byte for byte, and no second file appears beside it.
        const made = invoke(f, 'report'); assert.equal(made.status, 'generated'); const kept = fs.readFileSync(path.join(f.root, made.path));
        refusedBeforeWriting(f, malformed); assert.deepEqual(fs.readFileSync(path.join(f.root, made.path)), kept);
        assert.deepEqual([invoke(f, 'inspect', ['--detail', 'full'], 1).code, invoke(f, 'migrate', ['--detail', 'full'], 1).code], ['INVALID_INPUT', 'INVALID_INPUT']);
        // Each known form reaches the writer under its own word, beside the source and scope selected as before; unstated, none is passed.
        for (const form of ['full', 'packed', 'none']) assert.deepEqual(reportOptions(argumentsFor(['report', '--root', f.root, '--scope', 'F', '--ref', 'main', '--detail', form]).values),
            { ref: 'main', scopeId: 'F', detail: form, maxBytes: undefined });
        assert.deepEqual(reportOptions(argumentsFor(['report', '--root', f.root]).values), { ref: undefined, scopeId: undefined, detail: undefined, maxBytes: undefined });
    }),
    test('TC-TPT-255', 'report refuses a size budget that is not a positive whole number before writing anything and keeps the previous snapshot', async f => {
        const { argumentsFor, reportOptions } = require(CLI_PATH);
        await f.create('TASK-255');
        // Zero, a sign, a fraction, another notation, padding, or a size past the largest exact integer is no budget.
        for (const text of ['0', '-1', '+5', '1.5', '1e3', '0x10', '012', ' 12', '12 ', '1_000', 'ten', '9007199254740992', '99999999999999999999'])
            assert.throws(() => argumentsFor(['report', '--root', f.root, '--max-bytes', text]), { code: 'INVALID_INPUT', message: /^Size budget invalid: / }, text);
        // The budget belongs to report alone.
        for (const other of ['inspect', 'check', 'ready', 'serve', 'apply']) assert.throws(() => argumentsFor([other, '--root', f.root, '--max-bytes', '4096']), { code: 'INVALID_INPUT' }, other);
        // Through the shipped command: no snapshot exists yet and the refusals create none.
        const malformed = [['--max-bytes', '0'], ['--max-bytes', '1.5'], ['--max-bytes', '9007199254740992'], ['--max-bytes'], ['--max-bytes', '4096', '--max-bytes', '8192'], ['--detail', 'packed', '--max-bytes', '-1']];
        for (const refusal of refusedBeforeWriting(f, malformed.slice(0, 3))) assert.match(refusal.reason, /^Size budget invalid: /);
        refusedBeforeWriting(f, malformed.slice(3)); assert.equal(generatedOutput(f).some(([name]) => name.endsWith('.html')), false);
        // A snapshot made earlier is kept byte for byte, and no second file appears beside it.
        const made = invoke(f, 'report'); assert.equal(made.status, 'generated'); const kept = fs.readFileSync(path.join(f.root, made.path));
        refusedBeforeWriting(f, malformed); assert.deepEqual(fs.readFileSync(path.join(f.root, made.path)), kept);
        assert.deepEqual([invoke(f, 'inspect', ['--max-bytes', '4096'], 1).code, invoke(f, 'migrate', ['--max-bytes', '4096'], 1).code], ['INVALID_INPUT', 'INVALID_INPUT']);
        // A whole positive budget reaches the writer as a number, up to the largest exact integer, beside a form when both are given.
        for (const [text, bytes] of [['1', 1], ['4096', 4096], ['9007199254740991', Number.MAX_SAFE_INTEGER]]) {
            const options = reportOptions(argumentsFor(['report', '--root', f.root, '--max-bytes', text]).values);
            assert.deepEqual(options, { ref: undefined, scopeId: undefined, detail: undefined, maxBytes: bytes }); assert.equal(typeof options.maxBytes, 'number');
        }
        assert.deepEqual(reportOptions(argumentsFor(['report', '--root', f.root, '--detail', 'none', '--max-bytes', '2048']).values), { ref: undefined, scopeId: undefined, detail: 'none', maxBytes: 2048 });
    }),
    test('TC-TPT-247', 'the shipped migrate command takes its own flags and nothing else: a scope, a decision, a request for figures or the retired group selector is refused as typed and changes nothing', async f => {
        await earlierProject(f);
        const stored = f.storedState();
        const own = 'Only migrate accepts --dry-run, --abandon and --backup-confirmed, and migrate accepts no actor, permission, scope or session options';
        for (const options of [['--scope', 'EPIC-E'], ['--dry-run', '--scope', 'EPIC-E'], ['--decide'], ['--dry-run', '--decide'], ['--abandon', '--decide'], ['--figures'], ['--dry-run', '--figures'], ['--change-state'], ['--item', 'EPIC-E'],
            ['--backup-confirmed', '--scope', 'EPIC-E'], ['--backup-confirmed', '--actor', 'owner'], ['--backup-confirmed', '--decide']]) {
            const refusal = invoke(f, 'migrate', options, 1);
            assert.deepEqual([refusal.status, refusal.code, refusal.reason], ['refused', 'INVALID_INPUT', own], options.join(' '));
        }
        // The group selector is no option of any command any more: refused as an unknown option, on migrate and on the reads that had it.
        for (const command of ['migrate', 'inspect', 'check', 'ready', 'report']) {
            const refusal = invoke(f, command, ['--group', 'EPIC-E'], 1);
            assert.deepEqual([refusal.status, refusal.code, refusal.reason], ['refused', 'INVALID_INPUT', 'Unknown, repeated, or positional option'], command);
        }
        assert.deepEqual(f.storedState(), stored); assert.ok(!fs.existsSync(path.join(f.root, 'work/.vocabulary-migration.json')));
        assert.equal(invoke(f, 'inspect').vocabulary.project.code, 'MIGRATION_REQUIRED');
    }),
    test('TC-TPT-242', 'inspect --figures states the figures of every area and every initiative of an earlier project, from the working copy and from a pinned commit, and the same figures once it is migrated', async f => {
        const project = await earlierProject(f, { commit: true, groups: [{ id: 'PRODUCT', kind: 'vision', purpose: 'area', members: ['FEATURE'] }, { id: 'FEATURE', purpose: 'capability', members: ['PBI-1', 'PBI-2'] },
            { id: 'OUTCOME', purpose: 'program', status: 'planned', members: ['FEATURE'] }] });
        const stored = f.storedState();
        const row = (id, total, accepted) => ({ id, total, accepted, remaining: total - accepted, currentlyVerified: accepted, canceled: 0, retired: 0, percentage: total ? accepted / total * 100 : null });
        const expected = { status: 'complete', areas: [row('PRODUCT', 2, 1), row('FEATURE', 2, 1)], initiatives: [row('EPIC-E', 2, 1), row('IDEA-D', 1, 1), row('OUTCOME', 2, 1)] };
        const local = invoke(f, 'inspect', ['--figures']); const pinned = invoke(f, 'inspect', ['--figures', '--ref', project.oid]);
        for (const read of [local, pinned]) {
            assert.deepEqual([read.coverage, read.vocabulary.project.code, read.figures], ['complete', 'MIGRATION_REQUIRED', expected]);
            // Each row is the read of that scope alone.
            assert.deepEqual(read.metrics.eligibleIds, project.expected.eligibleIds);
        }
        const scoped = invoke(f, 'inspect', ['--figures', '--scope', 'OUTCOME']);
        assert.deepEqual([scoped.scope.kind, scoped.metrics.total, scoped.metrics.accepted, scoped.figures], ['initiative', 2, 1, expected]);
        // Without the flag no figures are stated, and the flag belongs to inspect alone and does not combine with one exact record.
        assert.equal(invoke(f, 'inspect').figures, undefined);
        const only = 'Only inspect accepts --figures; it adds the figures of every area and every initiative to a project or scope read and does not combine with --item';
        for (const argv of [['check', '--figures'], ['ready', '--figures'], ['report', '--figures'], ['inspect', '--item', 'PBI-1', '--figures']]) assert.deepEqual([invoke(f, argv[0], argv.slice(1), 1).code, invoke(f, argv[0], argv.slice(1), 1).reason], ['INVALID_INPUT', only], argv.join(' '));
        assert.deepEqual(f.storedState(), stored);
        // Migrated through the same command, every area and initiative states the figures it stated before.
        assert.equal(invoke(f, 'migrate').status, 'migrated');
        const after = invoke(f, 'inspect', ['--figures']);
        assert.deepEqual([after.coverage, after.vocabulary.project.state, after.figures], ['complete', 'current', expected]);
        // The commit made before the migration still reads by its own records.
        assert.deepEqual(invoke(f, 'inspect', ['--figures', '--ref', project.oid]).figures, expected);
    }),
    test('TC-TPT-246', 'outside version control the shipped migrate command ends with a failing status and changes nothing until --backup-confirmed is given, previews either way, and no other command takes that flag', async f => {
        const project = await earlierProject(f);
        const expected = { total: project.expected.total, accepted: project.expected.accepted, remaining: project.expected.remaining, eligibleIds: project.expected.eligibleIds };
        const stored = f.storedState();
        const unstarted = () => { assert.deepEqual(f.storedState(), stored); assert.ok(!fs.existsSync(path.join(f.root, 'work/.vocabulary-migration.json'))); };
        // The preview is given with or without the flag, and says what a run will need.
        const preview = invoke(f, 'migrate', ['--dry-run']);
        assert.deepEqual([preview.status, preview.versionControl.kind, preview.versionControl.restorable], ['preview', 'none', false]);
        assert.match(preview.versionControl.note, /^Not a Git checkout: nothing here can restore .*A run will refuse \(NO_RESTORE_POINT\) until a backup is confirmed: make a backup you can restore, then run migrate --root <checkout> --backup-confirmed$/);
        assert.deepEqual(invoke(f, 'migrate', ['--dry-run', '--backup-confirmed']), preview);
        // The run without it: refused by name with what cannot be restored and what to do, a failing status, nothing changed.
        const refusal = invoke(f, 'migrate', [], 1);
        assert.deepEqual([refusal.kind, refusal.status, refusal.code, refusal.refusals.map(entry => entry.code), refusal.refusals[0].paths], ['migration', 'refused', 'NO_RESTORE_POINT', ['NO_RESTORE_POINT'], ['work', 'docs/project-config.json']]);
        assert.equal(refusal.reason, 'No restore point: this project is not in a Git checkout, so nothing here can restore work and docs/project-config.json once migrated, and a migration cannot be undone. Make a backup you can restore and run again with --backup-confirmed, or commit the records and the configuration so that version control can restore them, then retry; nothing was changed');
        assert.ok(!JSON.stringify(refusal).includes(f.root)); unstarted();
        // The flag is migrate's alone: every other command refuses it as typed.
        const own = 'Only migrate accepts --dry-run, --abandon and --backup-confirmed, and migrate accepts no actor, permission, scope or session options';
        const read = 'This read command does not accept actor, permission, scope or session options';
        const commands = command(f, ['help']).commands.filter(name => name !== 'migrate');
        assert.equal(commands.length, 14);
        for (const name of commands) {
            const typed = command(f, [name, ...(name === 'help' ? [] : ['--root', f.root]), '--backup-confirmed'], 1);
            assert.deepEqual([typed.status, typed.code, typed.reason], ['refused', 'INVALID_INPUT', ['help', 'identity', 'catalogue', 'concerns', 'placement'].includes(name) ? read : own], name);
        }
        // It confirms nothing by itself beside an abandon request, which needs none; twice, or with a value, it is refused.
        assert.deepEqual([invoke(f, 'migrate', ['--abandon', '--backup-confirmed']).status, invoke(f, 'migrate', ['--abandon', '--backup-confirmed']).code], ['current', 'NOTHING_TO_ABANDON']);
        for (const options of [['--backup-confirmed', '--backup-confirmed'], ['--backup-confirmed', 'yes']]) assert.deepEqual([invoke(f, 'migrate', options, 1).code, invoke(f, 'migrate', options, 1).reason], ['INVALID_INPUT', 'Unknown, repeated, or positional option'], options.join(' '));
        unstarted();
        // Given, the same command migrates.
        const migrated = invoke(f, 'migrate', ['--backup-confirmed']);
        assert.deepEqual([migrated.status, migrated.verified, migrated.progress], ['migrated', true, expected]);
        assert.deepEqual([invoke(f, 'inspect').vocabulary.project.state, invoke(f, 'migrate').code], ['current', 'NOTHING_TO_MIGRATE']);
    }),
    test('TC-TPT-054', 'the shipped command names the fields of an invalid configuration: the reason states the first three and how many more there are, and details lists every one', async f => {
        await f.create();
        const field = (kind, label) => `taskTracking.kindLabels.${kind}: kind label invalid ("${label}" is a word or a default label of the current vocabulary)`;
        const details = [field('task', 'Initiative'), field('story', 'Area'), field('subtask', 'Task'), field('initiative', 'Story')];
        f.config.taskTracking.kindLabels = { task: 'Initiative', story: 'Area', subtask: 'Task', initiative: 'Story' }; f.saveConfig();
        // Every command that needs the project answers alike: a read, a status request, a report and a migration or its preview.
        for (const [name, options] of [['inspect', []], ['check', []], ['ready', []], ['catalogue', []], ['report', []], ['migrate', ['--dry-run']], ['migrate', ['--backup-confirmed']]]) {
            assert.deepEqual(invoke(f, name, options, 1), { status: 'refused', code: 'INVALID_CONFIG', reason: `Project configuration is invalid: ${details.slice(0, 3).join('; ')}; and 1 more`, details }, name);
        }
        // Up to three fields at fault are all in the reason, with no count of more.
        f.config.taskTracking.kindLabels = { task: 'Initiative' }; f.saveConfig();
        assert.deepEqual(invoke(f, 'inspect', [], 1), { status: 'refused', code: 'INVALID_CONFIG', reason: `Project configuration is invalid: ${details[0]}`, details: [details[0]] });
        // A refusal that has no fields to name states none.
        assert.deepEqual(Object.keys(invoke(f, 'inspect', ['--dry-run'], 1)).sort(), ['code', 'reason', 'status']);
        // Corrected as named, the project reads again.
        delete f.config.taskTracking.kindLabels; f.saveConfig();
        assert.equal(invoke(f, 'inspect').coverage, 'complete');
    })
] };
