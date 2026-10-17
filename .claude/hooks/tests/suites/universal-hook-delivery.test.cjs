'use strict';

/**
 * Universal bundle delivery — spec ContextDelivery/README.ProtocolDelivery.md (BR-PDL-17, TC-PDL-085..097).
 *
 * The `universal` group of `.claude/skills/shared/protocol-groups.json` is the framework rules every
 * task follows. No file carries it: `protocol-inject-universal-<n>.cjs` (one hook process per bin)
 * delivers it on the session's first prompt, again after about 150,000 tokens of conversation growth
 * or a compaction, and at every sub-agent start.
 *
 * Guards: each bin is one message of at most 9,500 characters that covers the bundle exactly once
 * across bins; a second prompt inside the window delivers nothing; growth at the window re-delivers and
 * one byte short of it does not; a compaction re-delivers once; bins dedup independently; every agent
 * type gets the bundle once per spawn; other events end before any project module loads; a session
 * with no id, a broken record store or a missing protocol file still delivers (a duplicate is accepted
 * over silence); no skill or agent carries any part of the bundle.
 *
 * Portability: every case spawns the real entry files against its own temp fixture project (a copy of
 * the published projection and group data, plus a conversation record) with CLAUDE_PROJECT_DIR set to
 * the fixture, HOME, USERPROFILE, TMPDIR, TEMP and TMP pointed at the temp dir, and inherited framework
 * switches (CK_*, CLAUDE_*, CODEX_*, OPENCODE_*, NODE_OPTIONS) removed. Paths are built with node:path.
 * Fixtures are removed in `finally`.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const { childEnv } = require('../lib/hook-runner.cjs');

const HOOKS_DIR = path.resolve(__dirname, '..', '..');
const CLAUDE_DIR = path.resolve(HOOKS_DIR, '..');
const SHARED = path.join(CLAUDE_DIR, 'skills', 'shared');
const UNIVERSAL_LIB = path.join(HOOKS_DIR, 'lib', 'universal-delivery.cjs');
const universalLib = require(UNIVERSAL_LIB);
const { BYTES_PER_TOKEN } = require(path.join(HOOKS_DIR, 'lib', 'file-conventions.cjs'));
const ledgerLib = require(path.join(HOOKS_DIR, 'lib', 'convention-ledger.cjs'));
const { extractSyncBody } = require(path.join(CLAUDE_DIR, 'scripts', 'lib', 'extract-sync-block.cjs'));
const frameworkRepoGuard = require('../lib/framework-repo-guard.cjs');

const SPAWN_TIMEOUT_MS = 20000;
const BIN = 9500;
const DISTANCE = universalLib.UNIVERSAL_REINJECT_TOKENS * BYTES_PER_TOKEN;
const STORE_REL = ['tmp', 'protocol-delivery'];

const groups = JSON.parse(fs.readFileSync(path.join(SHARED, 'protocol-groups.json'), 'utf8')).groups.universal;
const LAYOUT = groups.bins;
const BIN_NUMBERS = LAYOUT.map((_, i) => i + 1);
const UNIVERSAL_TAGS = Object.keys(groups.tags);

const entryFile = n => path.join(HOOKS_DIR, `protocol-inject-universal-${n}.cjs`);

// ── fixture project ─────────────────────────────────────────────────────────

function scrubbedEnv(temp, extra = {}) {
    const overrides = { HOME: temp, USERPROFILE: temp, TMPDIR: temp, TEMP: temp, TMP: temp, NODE_OPTIONS: undefined };
    for (const key of Object.keys(process.env)) {
        if (/^(?:CK_|CLAUDE_|CODEX_|OPENCODE_)/i.test(key)) overrides[key] = undefined;
    }
    return childEnv({ ...overrides, ...extra });
}

async function withFixture(fn) {
    const temp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'uhd-')));
    const project = path.join(temp, 'project');
    const sharedTarget = path.join(project, '.claude', 'skills', 'shared');
    fs.mkdirSync(sharedTarget, { recursive: true });
    fs.cpSync(path.join(SHARED, 'protocols'), path.join(sharedTarget, 'protocols'), { recursive: true });
    fs.copyFileSync(path.join(SHARED, 'protocol-groups.json'), path.join(sharedTarget, 'protocol-groups.json'));
    const fx = {
        temp,
        project,
        transcript: path.join(temp, 'transcript.jsonl'),
        store: path.join(project, ...STORE_REL),
        protocol: tag => path.join(sharedTarget, 'protocols', `${tag}.md`),
        env: extra => scrubbedEnv(temp, { CLAUDE_PROJECT_DIR: project, ...extra }),
        append(text) {
            fs.appendFileSync(fx.transcript, text);
        },
        /** Delivery records of one scope: { group: parsed record }. */
        records(session = 's1', scope = 'main') {
            const dir = path.join(fx.store, session, scope);
            if (!fs.existsSync(dir)) return {};
            return Object.fromEntries(fs.readdirSync(dir)
                .filter(name => name.endsWith('.json') && !name.startsWith('_'))
                .map(name => [name.replace(/\.json$/, ''), JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'))]));
        }
    };
    fx.append('{"type":"user","message":{"content":"start"}}\n');
    try {
        return await fn(fx);
    } finally {
        fs.rmSync(temp, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    }
}

const prompt = (fx, extra = {}) => ({
    hook_event_name: 'UserPromptSubmit',
    prompt: 'do the task',
    session_id: 's1',
    transcript_path: fx.transcript,
    cwd: fx.project,
    ...extra
});

/** A host's session-start event; `source` is startup, resume, clear or compact (only clear and compact carry a bin). */
const sessionStart = (fx, source, extra = {}) => ({
    hook_event_name: 'SessionStart',
    source,
    session_id: 's1',
    transcript_path: fx.transcript,
    cwd: fx.project,
    ...extra
});

const agentStart = (fx, type, extra = {}) => ({
    hook_event_name: 'SubagentStart',
    agent_type: type,
    agent_id: 'a1',
    session_id: 's1',
    transcript_path: fx.transcript,
    cwd: fx.project,
    ...extra
});

// ── process runner ──────────────────────────────────────────────────────────

/** Spawn bin `n`'s entry file (optionally under a --require preload) and parse its stdout. */
function runBin(fx, n, input, { preload, env, closeOutput = false } = {}) {
    return new Promise(resolve => {
        const args = preload ? ['--require', preload, entryFile(n)] : [entryFile(n)];
        const child = spawn(process.execPath, args, { cwd: fx.project, env: fx.env(env), stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
        let stdout = '';
        let stderr = '';
        const timer = setTimeout(() => child.kill('SIGKILL'), SPAWN_TIMEOUT_MS);
        if (closeOutput) child.stdout.destroy();
        else child.stdout.on('data', chunk => { stdout += chunk; });
        child.stderr.on('data', chunk => { stderr += chunk; });
        child.on('close', code => {
            clearTimeout(timer);
            const parsed = stdout ? JSON.parse(stdout).hookSpecificOutput : null;
            resolve({ code, stdout, stderr, event: parsed && parsed.hookEventName, context: parsed ? parsed.additionalContext : '' });
        });
        child.stdin.on('error', () => {});
        child.stdin.end(JSON.stringify(input));
    });
}

/** Run every bin entry for one input, like the host does, and return the results in bin order. */
function runAllBins(fx, input, options) {
    return Promise.all(BIN_NUMBERS.map(n => runBin(fx, n, input, options)));
}

function assertAllDelivered(results, label) {
    results.forEach((result, i) => {
        assert.equal(result.code, 0, `${label}: bin ${i + 1} exit code (stderr: ${result.stderr})`);
        assert.ok(result.context.startsWith(universalLib.binHeader(i + 1, BIN_NUMBERS.length)), `${label}: bin ${i + 1} opens with its marker line`);
    });
}

function assertAllSilent(results, label) {
    results.forEach((result, i) => {
        assert.equal(result.code, 0, `${label}: bin ${i + 1} exit code (stderr: ${result.stderr})`);
        assert.equal(result.stdout, '', `${label}: bin ${i + 1} expected no output`);
    });
}

// ── module-load logger (BR-PDL-09 technique) ────────────────────────────────

const PRELOAD_SOURCE = `'use strict';
const Module = require('module');
const fs = require('fs');
const log = process.env.UHD_LOAD_LOG;
const record = entry => { try { fs.appendFileSync(log, JSON.stringify(entry) + '\\n'); } catch {} };
const load = Module._load;
Module._load = function (request, parent, isMain) {
    let file = request;
    try { file = Module._resolveFilename(request, parent, isMain); } catch {}
    record({ file });
    return load.apply(this, arguments);
};
`;

const samePath = (a, b) => (process.platform === 'win32' ? path.resolve(a).toLowerCase() === path.resolve(b).toLowerCase() : path.resolve(a) === path.resolve(b));

// ── tests ───────────────────────────────────────────────────────────────────

const tests = [
    {
        name: 'runtime modes suppress relevant universal delivery before ledger writes and reenable it',
        fn: () => withFixture(async fx => {
            for (const mode of ['off', 'quiet']) {
                assertAllSilent(await runAllBins(fx, prompt(fx), { env: { CK_FRAMEWORK_MODE: mode } }), mode);
                assert.equal(fs.existsSync(fx.store), false, `${mode}: no delivery ledger`);
            }
            assertAllDelivered(await runAllBins(fx, prompt(fx), { env: { CK_FRAMEWORK_MODE: 'on' } }), 'reenabled');
        })
    },
    {
        name: 'TC-PDL-085 each bin has a bare three-line entry file whose number is a literal, and no other bin entry exists',
        fn: () => {
            // Given the authored layout of the universal group
            assert.ok(LAYOUT.length >= 1, 'the universal group has at least one bin');
            for (const n of BIN_NUMBERS) {
                // When the entry file of the bin is read
                const lines = fs.readFileSync(entryFile(n), 'utf8').replace(/\r\n/g, '\n').replace(/\n$/, '').split('\n');
                // Then it is exactly the shebang, strict mode and one runHook call naming the bin (no argv)
                assert.deepEqual(lines, ['#!/usr/bin/env node', "'use strict';", `require('./lib/universal-delivery.cjs').runHook(${n});`], `protocol-inject-universal-${n}.cjs`);
            }
            // And a bin beyond the layout has no entry file, and the single-entry form is gone
            assert.equal(fs.existsSync(entryFile(BIN_NUMBERS.length + 1)), false, 'an entry file beyond the layout');
            assert.equal(fs.existsSync(path.join(HOOKS_DIR, 'protocol-inject-universal.cjs')), false, 'the retired single universal entry');
        }
    },
    {
        name: 'TC-PDL-086 the first prompt delivers every bin within 9,500 characters and the bundle exactly once across bins',
        fn: () => withFixture(async fx => {
            // Given a session that has not received the bundle
            // When its first prompt arrives and every bin entry runs
            const results = await runAllBins(fx, prompt(fx));
            // Then each bin is one message of at most 9,500 characters that opens with its marker line
            assertAllDelivered(results, 'first prompt');
            for (const result of results) {
                assert.ok(result.context.length <= BIN, `a bin is ${result.context.length} chars, over ${BIN}`);
                assert.equal(result.event, 'UserPromptSubmit', 'the output names the event it answers');
            }
            // And the tags of the layout arrive in order, each body exactly once in the bin that lists it
            LAYOUT.forEach((tags, i) => {
                let cursor = 0;
                for (const tag of tags) {
                    const body = extractSyncBody(fs.readFileSync(path.join(SHARED, 'sync-inline-versions.md'), 'utf8'), tag);
                    const at = results[i].context.indexOf(body, cursor);
                    assert.ok(at >= 0, `bin ${i + 1}: ${tag} missing or out of order`);
                    cursor = at + body.length;
                    const elsewhere = results.filter((_, j) => j !== i).some(other => other.context.includes(body));
                    assert.equal(elsewhere, false, `${tag} is delivered by another bin too`);
                }
            });
            // And every bin left its own record
            assert.deepEqual(Object.keys(fx.records()).sort(), BIN_NUMBERS.map(n => `universal-bin-${n}`).sort());
            // Recorded, not asserted: the size of the bundle
            const total = results.reduce((sum, result) => sum + result.context.length, 0);
            console.log(`      [TC-PDL-086] universal bundle: ${total} chars in ${results.length} bin(s): ${results.map(result => result.context.length).join(' / ')}`);
        })
    },
    {
        name: 'TC-PDL-087 a second prompt inside the window delivers nothing',
        fn: () => withFixture(async fx => {
            // Given the bundle delivered on the first prompt
            assertAllDelivered(await runAllBins(fx, prompt(fx)), 'first prompt');
            const records = fx.records();
            // When the next prompts arrive with some transcript growth under the window
            fx.append(`${'x'.repeat(200000)}\n`);
            const second = await runAllBins(fx, prompt(fx));
            const third = await runAllBins(fx, prompt(fx, { prompt: 'and another' }));
            // Then nothing is printed and the records are unchanged
            assertAllSilent(second, 'second prompt');
            assertAllSilent(third, 'third prompt');
            assert.deepEqual(fx.records(), records, 'records unchanged');
            // And a different session is a different conversation: it receives the bundle
            assertAllDelivered(await runAllBins(fx, prompt(fx, { session_id: 's2' })), 'other session');
        })
    },
    {
        name: 'TC-PDL-088 growth of 150,000 tokens re-delivers the bundle and one byte less does not',
        fn: () => withFixture(async fx => {
            // Given the bundle delivered with the conversation record at its starting size
            assertAllDelivered(await runAllBins(fx, prompt(fx)), 'first prompt');
            const start = fs.statSync(fx.transcript).size;
            // When the record grows to one byte under the window (150,000 tokens x the measured bytes per token)
            fx.append(`${'y'.repeat(DISTANCE - 2)}\n`);
            assert.equal(fs.statSync(fx.transcript).size - start, DISTANCE - 1);
            // Then the next prompt delivers nothing
            assertAllSilent(await runAllBins(fx, prompt(fx)), 'one byte under the window');
            // And one more byte reaches the window: every bin is delivered again, once
            fx.append('z');
            assertAllDelivered(await runAllBins(fx, prompt(fx)), 'at the window');
            assertAllSilent(await runAllBins(fx, prompt(fx)), 'right after the re-delivery');
            // And the window is the named 150,000-token constant
            assert.equal(universalLib.UNIVERSAL_REINJECT_TOKENS, 150000);
        })
    },
    {
        name: 'TC-PDL-089 after a compaction the bundle is delivered again, once',
        fn: () => withFixture(async fx => {
            // Given the bundle delivered, and a compaction recorded in the conversation afterwards
            assertAllDelivered(await runAllBins(fx, prompt(fx)), 'first prompt');
            fx.append(`${JSON.stringify({ type: 'system', subtype: 'compact_boundary', timestamp: new Date(Date.now() + 5).toISOString() })}\n`);
            // When the next prompt arrives
            const again = await runAllBins(fx, prompt(fx));
            // Then every bin is delivered again and the records are refreshed
            assertAllDelivered(again, 'after compaction');
            assertAllSilent(await runAllBins(fx, prompt(fx)), 'one compaction, one re-delivery');
            // And a Codex compaction record re-arms it too
            fx.append(`${JSON.stringify({ timestamp: new Date(Date.now() + 10000).toISOString(), ordinal: 9, type: 'compacted', payload: {} })}\n`);
            assertAllDelivered(await runAllBins(fx, prompt(fx)), 'after a Codex compaction record');
        })
    },
    {
        name: 'TC-PDL-090 bins dedup independently: a bin whose record is gone is delivered again alone',
        fn: () => withFixture(async fx => {
            // Given the bundle delivered
            assertAllDelivered(await runAllBins(fx, prompt(fx)), 'first prompt');
            // When the record of one bin is lost
            const lost = BIN_NUMBERS.length;
            fs.rmSync(path.join(fx.store, 's1', 'main', `universal-bin-${lost}.json`));
            // Then only that bin is delivered on the next prompt
            const results = await runAllBins(fx, prompt(fx));
            results.forEach((result, i) => {
                if (i + 1 === lost) assert.ok(result.context.startsWith(universalLib.binHeader(lost, BIN_NUMBERS.length)), 'the lost bin is delivered');
                else assert.equal(result.stdout, '', `bin ${i + 1} was delivered again`);
            });
            // And a changed published text re-delivers the bin that holds it
            const changedTag = LAYOUT[0][0];
            fs.appendFileSync(fx.protocol(changedTag), '\n(revised)\n');
            const revised = await runAllBins(fx, prompt(fx));
            assert.ok(revised[0].context.includes('(revised)'), 'the changed bin is delivered');
            revised.slice(1).forEach((result, i) => assert.equal(result.stdout, '', `unchanged bin ${i + 2} was delivered again`));
        })
    },
    {
        name: 'TC-PDL-091 every agent type receives the bundle once per spawn',
        fn: () => withFixture(async fx => {
            // Given the main conversation has already received the bundle
            assertAllDelivered(await runAllBins(fx, prompt(fx)), 'main prompt');
            // When agents of any type start (built-in, custom and general-purpose), each a spawn with its own id
            const types = ['Explore', 'Plan', 'general-purpose', 'fx-custom-agent'];
            for (const [i, type] of types.entries()) {
                const agentId = `agent-${i}`;
                const results = await runAllBins(fx, agentStart(fx, type, { agent_id: agentId }));
                // Then every bin reaches it, named for the event
                assertAllDelivered(results, type);
                for (const result of results) assert.equal(result.event, 'SubagentStart', `${type}: event name`);
                assert.deepEqual(Object.keys(fx.records('s1', `agent-${agentId}`)).sort(), BIN_NUMBERS.map(n => `universal-bin-${n}`).sort(), `${type}: its own records`);
            }
            // And the same spawn never receives it twice
            assertAllSilent(await runAllBins(fx, agentStart(fx, 'Explore', { agent_id: 'agent-0' })), 'the same spawn again');
            // And a host that reports no agent id still delivers: the start is its own scope, not the main conversation's
            assertAllDelivered(await runAllBins(fx, agentStart(fx, 'fx-custom-agent', { agent_id: undefined })), 'no agent id');
        })
    },
    {
        name: 'TC-PDL-092 an event that cannot carry a bin ends before any project module loads and writes nothing',
        fn: () => withFixture(async fx => {
            const preload = path.join(fx.temp, 'load-logger.cjs');
            fs.writeFileSync(preload, PRELOAD_SOURCE);
            const events = [
                ['PostToolUse', { hook_event_name: 'PostToolUse', tool_name: 'Skill', tool_input: { skill: 'plan' }, session_id: 's1', cwd: fx.project }],
                ['SessionStart', { hook_event_name: 'SessionStart', source: 'startup', session_id: 's1', cwd: fx.project }],
                ['UserPromptExpansion', { hook_event_name: 'UserPromptExpansion', command_name: '/plan', session_id: 's1', cwd: fx.project }]
            ];
            for (const [label, input] of events) {
                // Given a non-deliverable event and a module-load logger
                const log = path.join(fx.temp, `load-${label}.jsonl`);
                // When the bin entry runs
                const result = await runBin(fx, 1, input, { preload, env: { UHD_LOAD_LOG: log } });
                // Then it prints nothing, exits 0, loads only the entry file and the lib, and writes no record
                assert.equal(result.code, 0, `${label}: ${result.stderr}`);
                assert.equal(result.stdout, '', `${label}: expected no output`);
                const files = fs.readFileSync(log, 'utf8').split('\n').filter(Boolean).map(line => JSON.parse(line).file).filter(file => path.isAbsolute(file));
                assert.equal(files.length, 2, `${label}: loaded ${JSON.stringify(files)}`);
                assert.ok(samePath(files[0], entryFile(1)) && samePath(files[1], UNIVERSAL_LIB), `${label}: loaded ${JSON.stringify(files)}`);
                assert.equal(fs.existsSync(fx.store), false, `${label}: nothing written`);
            }
            // And garbage on stdin ends quietly
            const garbage = await new Promise(resolve => {
                const child = spawn(process.execPath, [entryFile(1)], { cwd: fx.project, env: fx.env(), stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
                let out = '';
                child.stdout.on('data', chunk => { out += chunk; });
                child.on('close', code => resolve({ code, out }));
                child.stdin.end('not json');
            });
            assert.deepEqual(garbage, { code: 0, out: '' });
        })
    },
    {
        name: 'TC-PDL-093 a prompt with no session id still delivers every time and records nothing',
        fn: () => withFixture(async fx => {
            // Given a host event that carries no session id
            const input = prompt(fx, { session_id: undefined });
            // Given a host that closes its output reader before a no-identity delivery
            // When the native entries write, then transport failure stays silent and nonblocking.
            const closed = await runAllBins(fx, input, { closeOutput: true });
            assertAllSilent(closed, 'closed output without session');
            closed.forEach(result => assert.equal(result.stderr, '', 'no unhandled pipe error'));
            // When two prompts arrive
            const first = await runAllBins(fx, input);
            const second = await runAllBins(fx, input);
            // Then both deliver (a duplicate is accepted over a miss) and no record store exists
            assertAllDelivered(first, 'first');
            assertAllDelivered(second, 'second');
            assert.equal(fs.existsSync(fx.store), false, 'nothing recorded without a session');
        })
    },
    {
        name: 'TC-PDL-094 an unusable record store still delivers, and a missing protocol file drops only that protocol',
        fn: () => withFixture(async fx => {
            // Given complete bins and a host that closes its output reader before input is released
            // When every native bin attempts its first delivery, then failures never earn credit.
            const closed = await runAllBins(fx, prompt(fx), { closeOutput: true });
            assertAllSilent(closed, 'closed complete output');
            closed.forEach(result => assert.equal(result.stderr, '', 'no unhandled pipe error'));
            assert.deepEqual(fx.records(), {}, 'failed writes record no completed delivery');
            // And a healthy retry delivers all rules exactly once before ordinary dedup resumes.
            assertAllDelivered(await runAllBins(fx, prompt(fx)), 'healthy retry');
            assertAllSilent(await runAllBins(fx, prompt(fx)), 'after healthy retry');
            fs.rmSync(fx.store, { recursive: true, force: true });
            // Given a regular file where the record store folder should be (portable on every OS)
            fs.mkdirSync(path.dirname(fx.store), { recursive: true });
            fs.writeFileSync(fx.store, 'not a folder');
            // When two prompts arrive
            const first = await runAllBins(fx, prompt(fx));
            const second = await runAllBins(fx, prompt(fx));
            // Then both deliver and the store is still the regular file
            assertAllDelivered(first, 'broken store, first');
            assertAllDelivered(second, 'broken store, second');
            assert.ok(fs.statSync(fx.store).isFile(), 'store path unchanged');
            fs.rmSync(fx.store);
            // Given one protocol file of a multi-protocol bin is gone
            const multi = LAYOUT.findIndex(tags => tags.length > 1);
            assert.ok(multi >= 0, 'the shipped layout has a bin with several protocols');
            const missing = LAYOUT[multi][LAYOUT[multi].length - 1];
            const body = fs.readFileSync(fx.protocol(missing), 'utf8').trim();
            fs.rmSync(fx.protocol(missing));
            // When the bin is delivered
            const result = await runBin(fx, multi + 1, prompt(fx, { session_id: 's9' }));
            // Then the rest of the bin arrives and the missing protocol does not
            assert.ok(result.context.startsWith(universalLib.binHeader(multi + 1, BIN_NUMBERS.length)));
            assert.equal(result.context.includes(body), false, 'the missing protocol appeared');
            assert.ok(result.context.includes(fs.readFileSync(fx.protocol(LAYOUT[multi][0]), 'utf8').trim()), 'the other protocols still arrive');
            // And a bin whose protocols are all gone names the loss rather than going silent
            for (const tag of LAYOUT[multi]) fs.rmSync(fx.protocol(tag), { force: true });
            assert.ok((await runBin(fx, multi + 1, prompt(fx, { session_id: 's10' }))).context.includes('universal protocols incomplete'));
            // Given incomplete/unavailable bundles, their warning paths use the same fail-open sink.
            // When the host refuses output, then neither branch leaks a process error.
            const partialClosed = await runBin(fx, multi + 1, prompt(fx, { session_id: 'partial-closed' }), { closeOutput: true });
            assertAllSilent([partialClosed], 'closed incomplete output');
            assert.equal(partialClosed.stderr, '');
            fs.writeFileSync(path.join(fx.project, '.claude', 'skills', 'shared', 'protocols', 'index.json'), '{broken');
            const unavailableClosed = await runBin(fx, 1, prompt(fx, { session_id: 'unavailable-closed' }), { closeOutput: true });
            assertAllSilent([unavailableClosed], 'closed unavailable output');
            assert.equal(unavailableClosed.stderr, '');
            assert.ok((await runBin(fx, 1, prompt(fx))).context.startsWith('universal protocols unavailable ('), 'warning remains retryable');
        })
    },
    {
        name: 'TC-PDL-095 the re-delivery distance is the named token constant converted by the measured bytes per token, with no age re-arm',
        fn: () => {
            // Given the lib constants
            assert.equal(universalLib.UNIVERSAL_REINJECT_TOKENS, 150000);
            // When the ledger settings are built
            const settings = universalLib.getLedgerSettings();
            // Then the byte window is tokens x bytes-per-token, time alone never re-arms, and both hosts' compaction marks count
            assert.equal(settings.reinjectAfterBytes, 150000 * BYTES_PER_TOKEN);
            assert.equal(settings.reinjectAfterMinutes, null);
            assert.equal(settings.blindReinjectAfterMinutes, null);
            assert.ok(settings.compactionMarkers.length >= 1);
        }
    },
    {
        name: 'TC-PDL-096 the universal layout covers the group exactly and each bin renders within the bin size',
        fn: () => {
            // Given the authored bins and the published projection
            const index = JSON.parse(fs.readFileSync(path.join(SHARED, 'protocols', 'index.json'), 'utf8'));
            const canonical = fs.readFileSync(path.join(SHARED, 'sync-inline-versions.md'), 'utf8');
            // Then every universal tag is in exactly one bin and no bin names a foreign tag
            assert.deepEqual([...LAYOUT.flat()].sort(), [...UNIVERSAL_TAGS].sort(), 'the bins cover the universal group once');
            for (const tag of LAYOUT.flat()) assert.equal(index.tags.find(row => row.tag === tag)?.group, 'universal', `${tag} is published in the universal group`);
            // And each bin renders within the bin size from the canonical bodies
            LAYOUT.forEach((tags, i) => {
                const rendered = universalLib.renderBin(i + 1, LAYOUT.length, tags.map(tag => extractSyncBody(canonical, tag)));
                assert.ok(rendered.length <= index.binChars && rendered.length <= BIN, `bin ${i + 1} renders ${rendered.length} chars`);
            });
        }
    },
    {
        name: 'TC-PDL-097 no skill or agent carries any part of the universal bundle: no body, reminder, guide line or pointer line',
        fn: () => {
            // Given every skill entry file and every agent definition of the framework
            const carriers = [];
            for (const name of fs.readdirSync(path.join(CLAUDE_DIR, 'skills'))) {
                const file = path.join(CLAUDE_DIR, 'skills', name, 'SKILL.md');
                if (fs.existsSync(file)) carriers.push(file);
            }
            for (const name of fs.readdirSync(path.join(CLAUDE_DIR, 'agents'))) {
                if (name.endsWith('.md')) carriers.push(path.join(CLAUDE_DIR, 'agents', name));
            }
            assert.ok(carriers.length > 20, 'the framework ships skills and agents to check');
            const problems = [];
            for (const file of carriers) {
                const text = fs.readFileSync(file, 'utf8').replace(/\r\n?/g, '\n');
                const label = path.relative(CLAUDE_DIR, file).replace(/\\/g, '/');
                if (/^> \*\*Root-carried protocols\*\* — /m.test(text)) problems.push(`${label}: retired pointer line`);
                for (const tag of UNIVERSAL_TAGS) {
                    if (new RegExp(`^<!-- /?SYNC:${tag}(?::reminder)? -->$`, 'm').test(text)) problems.push(`${label}: SYNC fence of ${tag}`);
                    if (new RegExp(`^- \`${tag}\` — `, 'm').test(text)) problems.push(`${label}: guide line of ${tag}`);
                }
            }
            // Then none does
            assert.deepEqual(problems, [], problems.join('\n'));
        }
    },
    {
        name: 'TC-PDL-098 a compaction reported at session start delivers the bundle once; the next prompt stays silent; startup and resume deliver nothing',
        fn: () => withFixture(async fx => {
            // Given a long autonomous run: the bundle was delivered on the first prompt, then the host compacted the
            // conversation and reports it at session start with no user prompt after it
            assertAllDelivered(await runAllBins(fx, prompt(fx)), 'first prompt');
            const boundary = () => fx.append(`${JSON.stringify({ type: 'system', subtype: 'compact_boundary', timestamp: new Date().toISOString() })}\n`);
            boundary();
            // When the session start of source compact reaches every bin
            const compacted = await runAllBins(fx, sessionStart(fx, 'compact'));
            // Then every bin is delivered again, named for the SessionStart event
            assertAllDelivered(compacted, 'session start after a compaction');
            for (const result of compacted) assert.equal(result.event, 'SessionStart', 'the output names the event it answers');
            // And the prompt that follows finds the bundle present: one delivery per compaction, not two
            assertAllSilent(await runAllBins(fx, prompt(fx)), 'the prompt after a session-start delivery');
            // And a boundary line that carries no time of its own (placed just before the scan) behaves the same
            fx.append(`${JSON.stringify({ type: 'system', subtype: 'compact_boundary' })}\n`);
            assertAllDelivered(await runAllBins(fx, sessionStart(fx, 'compact')), 'second compaction, untimed boundary');
            assertAllSilent(await runAllBins(fx, prompt(fx)), 'the prompt after the second session-start delivery');
            // And bins that read different clocks still deliver once: concurrent hook processes start at different
            // moments, so the bin that scans the undated boundary first may hold a later clock than a peer that delivers
            // after it (in-process, with the clocks fixed, so the order is the same on every machine)
            const skewTranscript = path.join(fx.temp, 'skew.jsonl');
            fs.writeFileSync(skewTranscript, '{"type":"user","message":{"content":"start"}}\n');
            const skew = { session_id: 's-skew', transcript_path: skewTranscript };
            const runWithClock = (number, input, now) => universalLib.runHook(number, { input, projectRoot: fx.project, homeDir: fx.temp, now, write: (text, done) => done(true) });
            const t0 = Date.now();
            for (const number of BIN_NUMBERS) assert.ok(await runWithClock(number, prompt(fx, skew), t0 + number), `skewed clocks: bin ${number} first prompt`);
            fs.appendFileSync(skewTranscript, `${JSON.stringify({ type: 'system', subtype: 'compact_boundary' })}\n`);
            const clocks = [t0 + 1000, t0 + 900, t0 + 1001, t0 + 1002];
            for (const number of BIN_NUMBERS) assert.ok(await runWithClock(number, sessionStart(fx, 'compact', skew), clocks[number - 1]), `skewed clocks: bin ${number} compaction delivery`);
            for (const number of BIN_NUMBERS) assert.equal(await runWithClock(number, prompt(fx, skew), t0 + 2000 + number), '', `skewed clocks: bin ${number} must stay silent on the next prompt`);
            // And a host with no readable conversation record re-delivers on the report alone, once
            const bare = { transcript_path: undefined, session_id: 's-bare' };
            assertAllDelivered(await runAllBins(fx, prompt(fx, bare)), 'bare session, first prompt');
            assertAllSilent(await runAllBins(fx, prompt(fx, bare)), 'bare session, second prompt');
            assertAllDelivered(await runAllBins(fx, sessionStart(fx, 'compact', bare)), 'bare session, compaction report');
            assertAllSilent(await runAllBins(fx, prompt(fx, bare)), 'bare session, prompt after the report');

            // Given a session that never received the bundle
            for (const source of ['startup', 'resume']) {
                // When its session start is not a compaction, Then nothing is delivered and nothing is recorded
                assertAllSilent(await runAllBins(fx, sessionStart(fx, source, { session_id: `s-${source}` })), `session start ${source}`);
                assert.deepEqual(fx.records(`s-${source}`), {}, `session start ${source}: no record`);
            }
            // And a compaction report for a session with no id still delivers and records nothing (a duplicate over a miss)
            assertAllDelivered(await runAllBins(fx, sessionStart(fx, 'compact', { session_id: undefined })), 'compaction report with no session id');
        })
    },
    {
        name: 'TC-PDL-113 the host writes its compaction boundary AFTER the session-start hooks: that one boundary belongs to the delivery already made; a boundary beyond the window or a second boundary re-delivers',
        fn: () => withFixture(async fx => {
            // Each scenario owns its session and conversation record: scan state and boundary times never cross.
            const scenario = name => {
                const transcript = path.join(fx.temp, `${name}.jsonl`);
                fs.writeFileSync(transcript, '{"type":"user","message":{"content":"start"}}\n');
                return {
                    transcript,
                    extra: { session_id: `s-${name}`, transcript_path: transcript },
                    boundaryAt: ms => fs.appendFileSync(transcript, `${JSON.stringify({ type: 'system', subtype: 'compact_boundary', timestamp: new Date(ms).toISOString() })}\n`)
                };
            };
            assert.ok(Number.isInteger(ledgerLib.BOUNDARY_ATTRIBUTION_MS) && ledgerLib.BOUNDARY_ATTRIBUTION_MS >= 60000, 'the attribution window is a named constant of at least a minute');
            const SKEW = 1000;

            // Millisecond clocks can stamp the host boundary and hook delivery equally.
            // Exercise the real delivery entry with a fixed clock so this race is deterministic.
            const equal = scenario('equal-clock');
            const sameTime = Date.now();
            const runAt = (input, now) => universalLib.runHook(1, {
                input, projectRoot: fx.project, homeDir: fx.temp, now, write: (text, done) => done(true)
            });
            assert.ok(await runAt(sessionStart(fx, 'compact', equal.extra), sameTime), 'equal clock: compaction delivered');
            equal.boundaryAt(sameTime);
            assert.equal(await runAt(prompt(fx, equal.extra), sameTime + SKEW), '', 'equal clock: the same compaction must not deliver twice');

            // Given the bundle delivered on the first prompt, then a compaction reported at session start
            // while the host has not written its boundary line yet (the observed host order)
            const a = scenario('after-hook');
            assertAllDelivered(await runAllBins(fx, prompt(fx, a.extra)), 'first prompt');
            assertAllDelivered(await runAllBins(fx, sessionStart(fx, 'compact', a.extra)), 'session start, no boundary yet');
            // When the host then appends the boundary, stamped a little after the hook ran
            a.boundaryAt(Date.now() + SKEW);
            // Then the prompt that follows stays silent: one delivery per compaction, not two
            assertAllSilent(await runAllBins(fx, prompt(fx, a.extra)), 'the prompt after the late boundary');
            assertAllSilent(await runAllBins(fx, prompt(fx, a.extra)), 'and the one after that');
            // And a SECOND boundary (a real compaction, after the first was attributed) re-delivers once, even
            // though it still lies inside the window of the original hook
            a.boundaryAt(Date.now() + 3 * SKEW);
            assertAllDelivered(await runAllBins(fx, prompt(fx, a.extra)), 'second boundary');
            assertAllSilent(await runAllBins(fx, prompt(fx, a.extra)), 'one delivery for the second boundary');

            // Given the same hook-first order, a boundary stamped beyond the attribution window is another compaction
            const late = scenario('beyond-window');
            assertAllDelivered(await runAllBins(fx, prompt(fx, late.extra)), 'first prompt');
            assertAllDelivered(await runAllBins(fx, sessionStart(fx, 'compact', late.extra)), 'session start');
            late.boundaryAt(Date.now() + ledgerLib.BOUNDARY_ATTRIBUTION_MS + 30000);
            // Then it re-delivers: the expectation expires with the window and never suppresses a later compaction
            assertAllDelivered(await runAllBins(fx, prompt(fx, late.extra)), 'boundary beyond the window');

            // Given a compaction report and no boundary line at all, nothing changes: silent, and the byte re-arm still works
            const none = scenario('no-boundary');
            assertAllDelivered(await runAllBins(fx, prompt(fx, none.extra)), 'first prompt');
            assertAllDelivered(await runAllBins(fx, sessionStart(fx, 'compact', none.extra)), 'session start');
            assertAllSilent(await runAllBins(fx, prompt(fx, none.extra)), 'no boundary, next prompt');
            fs.appendFileSync(none.transcript, `${'y'.repeat(DISTANCE)}\n`);
            assertAllDelivered(await runAllBins(fx, prompt(fx, none.extra)), 'growth past the window after a boundary-less report');

            // Given a clear (which writes no boundary line and expects none), a boundary stamped right after is a real compaction
            const cleared = scenario('clear-then-boundary');
            assertAllDelivered(await runAllBins(fx, prompt(fx, cleared.extra)), 'first prompt');
            assertAllDelivered(await runAllBins(fx, sessionStart(fx, 'clear', cleared.extra)), 'clear report');
            cleared.boundaryAt(Date.now() + SKEW);
            assertAllDelivered(await runAllBins(fx, prompt(fx, cleared.extra)), 'a boundary after a clear is not attributed to it');

            // And the order the existing case pins (boundary written BEFORE the hook) still stays silent: see TC-PDL-098
        })
    },
    {
        name: 'TC-PDL-114 a delivery recorded while the conversation record did not exist yet still re-delivers after 150,000 tokens of growth',
        fn: () => withFixture(async fx => {
            // Given the bundle delivered for a conversation whose record file is not on disk yet
            const later = path.join(fx.temp, 'later.jsonl');
            const extra = { session_id: 's-blind', transcript_path: later };
            assertAllDelivered(await runAllBins(fx, prompt(fx, extra)), 'first prompt, no record file');
            const recorded = fx.records('s-blind');
            assert.deepEqual(Object.keys(recorded).sort(), BIN_NUMBERS.map(n => `universal-bin-${n}`).sort(), 'every bin was recorded');
            for (const entry of Object.values(recorded)) assert.equal(entry.transcriptBytes, null, 'the record carries no size');
            // When the record file appears and grows to one byte under the window
            fs.writeFileSync(later, `${'y'.repeat(DISTANCE - 2)}\n`);
            assert.equal(fs.statSync(later).size, DISTANCE - 1);
            // Then nothing is delivered
            assertAllSilent(await runAllBins(fx, prompt(fx, extra)), 'one byte under the window');
            // And one more byte reaches the window: the bundle is delivered again (growth counts from an empty record)
            fs.appendFileSync(later, 'z');
            assertAllDelivered(await runAllBins(fx, prompt(fx, extra)), 'at the window');
            assertAllSilent(await runAllBins(fx, prompt(fx, extra)), 'right after the re-delivery');
            // And the decision itself: an unknown baseline counts as 0, a known size below the window stays present
            const settings = universalLib.getLedgerSettings();
            const blind = { hash: 'h', deliveredAt: 10, transcriptBytes: null, form: 'full' };
            const ctx = size => ({ lastCompactionAt: -Infinity, transcriptSize: size, now: 20 });
            assert.equal(ledgerLib.isPresent(blind, 'h', ctx(settings.reinjectAfterBytes - 1), settings), true);
            assert.equal(ledgerLib.isPresent(blind, 'h', ctx(settings.reinjectAfterBytes), settings), false);
            // And a size that is also unknown keeps the delivery present (no age re-arm)
            assert.equal(ledgerLib.isPresent(blind, 'h', ctx(null), settings), true);
        })
    },
    {
        name: 'TC-PDL-110 a clear reported at session start delivers the bundle once even when the session record says delivered; the next prompt stays silent',
        fn: () => withFixture(async fx => {
            // Given a session that received the bundle, and a host that keeps the session id across /clear while the
            // conversation record shrinks (the delivery record still says "delivered")
            assertAllDelivered(await runAllBins(fx, prompt(fx)), 'first prompt');
            fs.writeFileSync(fx.transcript, '{"type":"user","message":{"content":"after clear"}}\n');
            const before = fx.records();
            assert.deepEqual(Object.keys(before).sort(), BIN_NUMBERS.map(n => `universal-bin-${n}`).sort(), 'the bundle was recorded');
            // When the session start of source clear reaches every bin
            const cleared = await runAllBins(fx, sessionStart(fx, 'clear'));
            // Then every bin is delivered again, named for the SessionStart event, and re-recorded
            assertAllDelivered(cleared, 'session start after a clear');
            for (const result of cleared) assert.equal(result.event, 'SessionStart', 'the output names the event it answers');
            assert.deepEqual(Object.keys(fx.records()).sort(), Object.keys(before).sort(), 'one record per bin again');
            // And the prompt that follows finds the bundle present: one delivery per clear, not two
            assertAllSilent(await runAllBins(fx, prompt(fx)), 'the prompt after a clear delivery');
            // And a second clear delivers again, once
            assertAllDelivered(await runAllBins(fx, sessionStart(fx, 'clear')), 'second clear');
            assertAllSilent(await runAllBins(fx, prompt(fx)), 'the prompt after the second clear delivery');
            // And a clear reported for a session that has no record yet (a new session id) delivers once and the prompt is silent
            const fresh = { session_id: 's-cleared-new' };
            assertAllDelivered(await runAllBins(fx, sessionStart(fx, 'clear', fresh)), 'clear with a new session id');
            assertAllSilent(await runAllBins(fx, prompt(fx, fresh)), 'the first prompt of the cleared session');
            // And the other sources stay silent: a startup or resume never delivers by itself
            for (const source of ['startup', 'resume']) {
                assertAllSilent(await runAllBins(fx, sessionStart(fx, source, { session_id: `s-only-${source}` })), `session start ${source}`);
            }
        })
    },
    {
        name: 'TC-PDL-111 a bundle that cannot be rendered is reported by bin 1 alone in one line, never throws, records nothing and retries on the next event',
        fn: () => withFixture(async fx => {
            const sharedDir = path.join(fx.project, '.claude', 'skills', 'shared');
            const indexFile = path.join(sharedDir, 'protocols', 'index.json');
            const groupsFile = path.join(sharedDir, 'protocol-groups.json');
            const breakers = [
                ['corrupt index.json (merge-conflict markers)', () => fs.writeFileSync(indexFile, '<<<<<<< HEAD\n{"tags":[]}\n=======\n>>>>>>> branch\n'), 'protocols/index.json'],
                ['protocols folder missing', () => fs.rmSync(path.join(sharedDir, 'protocols'), { recursive: true, force: true }), 'protocols/index.json'],
                ['renamed bins key in protocol-groups.json', () => {
                    const data = JSON.parse(fs.readFileSync(groupsFile, 'utf8'));
                    data.groups.universal.binz = data.groups.universal.bins;
                    delete data.groups.universal.bins;
                    fs.writeFileSync(groupsFile, JSON.stringify(data));
                }, 'no universal bins layout'],
                ['corrupt protocol-groups.json', () => fs.writeFileSync(groupsFile, '{ not json'), 'no universal bins layout'],
                ['protocol-groups.json missing', () => fs.rmSync(groupsFile), 'protocol-groups.json is unreadable']
            ];
            const originals = new Map([[indexFile, fs.readFileSync(indexFile)], [groupsFile, fs.readFileSync(groupsFile)]]);
            const protocolsBackup = path.join(fx.temp, 'protocols-backup');
            fs.cpSync(path.join(sharedDir, 'protocols'), protocolsBackup, { recursive: true });
            for (const [label, breakIt, reason] of breakers) {
                // Given the shipped files, then one source file of the bundle broken in a way a team can really reach
                fs.rmSync(path.join(sharedDir, 'protocols'), { recursive: true, force: true });
                fs.cpSync(protocolsBackup, path.join(sharedDir, 'protocols'), { recursive: true });
                for (const [file, bytes] of originals) fs.writeFileSync(file, bytes);
                fs.rmSync(fx.store, { recursive: true, force: true });
                breakIt();
                for (const input of [prompt(fx), sessionStart(fx, 'compact'), sessionStart(fx, 'clear'), agentStart(fx, 'Explore')]) {
                    // When every bin runs for the event
                    const results = await runAllBins(fx, input);
                    // Then bin 1 prints one short line naming the reason and the folder, and the other bins print nothing
                    const line = results[0].context;
                    const where = `${label} / ${input.hook_event_name}`;
                    assert.equal(results[0].code, 0, `${where}: exit code (stderr: ${results[0].stderr})`);
                    assert.equal(results[0].event, input.hook_event_name, `${where}: named for the event it answers`);
                    assert.ok(line.startsWith('universal protocols unavailable ('), `${where}: ${JSON.stringify(line)}`);
                    assert.ok(line.includes(reason), `${where}: names the reason ${reason}: ${JSON.stringify(line)}`);
                    assert.ok(line.endsWith('read the files under .claude/skills/shared/protocols/'), `${where}: ${JSON.stringify(line)}`);
                    assert.ok(line.length < 300 && !line.includes('\n'), `${where}: one short line, got ${line.length} chars`);
                    results.slice(1).forEach((result, i) => {
                        assert.equal(result.code, 0, `${where}: bin ${i + 2} exit code`);
                        assert.equal(result.stdout, '', `${where}: bin ${i + 2} must stay silent`);
                    });
                    // And nothing was recorded, so the next event retries
                    assert.equal(fs.existsSync(fx.store), false, `${where}: no delivery record for a failed render`);
                }
            }
            // And once the files are repaired the very next prompt delivers the real bundle (the failed render recorded nothing)
            fs.rmSync(path.join(sharedDir, 'protocols'), { recursive: true, force: true });
            fs.cpSync(protocolsBackup, path.join(sharedDir, 'protocols'), { recursive: true });
            for (const [file, bytes] of originals) fs.writeFileSync(file, bytes);
            assertAllDelivered(await runAllBins(fx, prompt(fx)), 'after repair');
            assertAllSilent(await runAllBins(fx, prompt(fx)), 'the prompt after the repaired delivery');
        })
    },
    {
        name: 'TC-PDL-112 incomplete bins warn and retry without suppressing readable rules or repair',
        fn: () => withFixture(async fx => {
            for (const missing of [['project-reference-docs-guide'], LAYOUT[0], LAYOUT.at(-1)]) {
                const number = LAYOUT.findIndex(tags => tags.includes(missing[0])) + 1;
                const originals = missing.map(tag => [fx.protocol(tag), fs.readFileSync(fx.protocol(tag))]);
                // Given a previously healthy record and then a damaged bin (including a whole bin).
                fs.rmSync(fx.store, { recursive: true, force: true });
                assertAllDelivered(await runAllBins(fx, prompt(fx)), 'healthy before damage');
                for (const [file] of originals) fs.rmSync(file);
                // When each supported delivery event sees the damage.
                for (const input of [prompt(fx), sessionStart(fx, 'compact'), sessionStart(fx, 'clear'), agentStart(fx, 'custom')]) {
                    const results = await runAllBins(fx, input);
                    const result = results[number - 1];
                    // Then that bin warns, names missing files and stays inside the host limit.
                    assert.equal(result.code, 0);
                    assert.ok(result.context.includes('universal protocols incomplete'));
                    for (const tag of missing) assert.ok(result.context.includes(`${tag}.md`), `${tag} is named`);
                    assert.ok(result.context.length <= BIN, 'diagnostic remains visible in full');
                    const readable = LAYOUT[number - 1].filter(tag => !missing.includes(tag));
                    for (const tag of readable) assert.ok(result.context.includes(fs.readFileSync(fx.protocol(tag), 'utf8').trim()), `${tag} still arrives`);
                    const scope = input.agent_id ? `agent-${input.agent_id}` : 'main';
                    assert.equal(fx.records(input.session_id, scope)[`universal-bin-${number}`], undefined, 'incomplete delivery has no record');
                    // And the next prompt retries only the incomplete main bin; healthy bins dedup.
                    const repeated = await runAllBins(fx, prompt(fx));
                    assert.ok(repeated[number - 1].context.includes('universal protocols incomplete'));
                    repeated.forEach((r, i) => { if (i !== number - 1) assert.equal(r.stdout, '', `healthy bin ${i + 1} stays quiet`); });
                }
                // When the original bytes return, Then the old healthy hash cannot suppress repair.
                for (const [file, bytes] of originals) fs.writeFileSync(file, bytes);
                const repaired = await runAllBins(fx, prompt(fx));
                assert.ok(repaired[number - 1].context.startsWith(universalLib.binHeader(number, BIN_NUMBERS.length)));
                assert.ok(!repaired[number - 1].context.includes('universal protocols incomplete'));
                assertAllSilent(await runAllBins(fx, prompt(fx)), 'after repaired delivery');
            }
            // Given an empty gate file and an oversized remaining file caused by a bad merge.
            const gate = fx.protocol('project-reference-docs-guide');
            fs.writeFileSync(gate, ' \n ');
            fs.writeFileSync(fx.protocol(LAYOUT[0][0]), 'oversized readable rule '.repeat(BIN));
            // When bin 1 delivers, Then the loss stays visible and readable files have explicit paths.
            const bounded = await runBin(fx, 1, prompt(fx));
            assert.ok(bounded.context.includes('project-reference-docs-guide.md'));
            assert.ok(bounded.context.includes('universal protocols incomplete'));
            assert.ok(bounded.context.includes(`.claude/skills/shared/protocols/${LAYOUT[0][0]}.md`));
            assert.ok(bounded.context.length <= BIN);
        })
    },
    {
        name: 'TC-PDL-099 the four universal bins are registered on the compact and clear session start only, besides the prompt and the agent start',
        skip: frameworkRepoGuard.isFrameworkRepo(path.resolve(CLAUDE_DIR, '..')) ? false : 'asserts the framework repo settings only',
        fn: () => {
            // Given the framework's own hook registration
            const settings = JSON.parse(fs.readFileSync(path.join(CLAUDE_DIR, 'settings.json'), 'utf8'));
            const wanted = BIN_NUMBERS.map(n => `.claude/hooks/protocol-inject-universal-${n}.cjs`);
            const groupsOf = event => (settings.hooks[event] || []).filter(group => (group.hooks || [])
                .some(hook => wanted.some(file => String(hook.command || '').includes(file))));
            // Then every event that carries a bin registers all four, in bin order
            for (const event of ['UserPromptSubmit', 'SubagentStart', 'SessionStart']) {
                const commands = groupsOf(event)
                    .flatMap(group => group.hooks.map(hook => String(hook.command)))
                    .filter(command => wanted.some(file => command.includes(file)));
                assert.equal(commands.length, wanted.length, `${event}: registers each bin once`);
                wanted.forEach((file, i) => assert.ok(commands[i].includes(file), `${event}: bin ${i + 1} in order`));
            }
            // And on SessionStart the group's matcher is exactly `compact|clear`, never startup or resume
            const sessionStartGroups = groupsOf('SessionStart');
            assert.equal(sessionStartGroups.length, 1, 'one SessionStart group carries the bins');
            assert.equal(sessionStartGroups[0].matcher, 'compact|clear');
        }
    }
];

module.exports = { name: 'universal-hook-delivery', tests };
