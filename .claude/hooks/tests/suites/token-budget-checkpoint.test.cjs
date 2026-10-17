'use strict';

/**
 * Token checkpoint hook (hooks/token-budget-checkpoint.cjs) — guarded contracts:
 *   advisory   one note per crossed multiple of `hooks.tokenBudget.checkpointTokens`, each
 *              threshold once, exit 0 always, never a block decision;
 *   metric     non-cached tokens (input + cache writes + output) of main + sub-agent
 *              transcripts; cache reads alone never trigger a note (plan review R2-03);
 *   off        `enabled: false` (or a malformed section) reads nothing and prints nothing;
 *   SEC-09     the note's only variable values are the total, the threshold and the step count;
 *   cost       a task event with no transcript growth reads zero transcript bytes;
 *   wiring     its own PostToolUse group on the prompt-ledger matcher (framework repo only).
 * Each test name starts with its TC id where the phase file supplies one. Fixtures are
 * synthetic transcripts inside unique temp projects removed in `finally`; child processes get
 * HOME/USERPROFILE/TMPDIR/TEMP/TMP pointed at the fixture and every inherited CK_* switch and provider key blanked.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const HOOKS_DIR = path.resolve(__dirname, '../..');
const REPO_ROOT = path.resolve(HOOKS_DIR, '..', '..');
const HOOK = path.join(HOOKS_DIR, 'token-budget-checkpoint.cjs');
const hook = require(HOOK);
const usageLib = require(path.join(HOOKS_DIR, 'lib', 'session-usage.cjs'));
const ledger = require(path.join(HOOKS_DIR, 'lib', 'convention-ledger.cjs'));
const { runHook, runHooksParallel } = require(path.join(HOOKS_DIR, 'tests', 'lib', 'hook-runner.cjs'));
const { isFrameworkRepo } = require(path.join(HOOKS_DIR, 'tests', 'lib', 'framework-repo-guard.cjs'));

// Computed synchronously at load: the runner reads `skip` before it runs a test.
const IS_FRAMEWORK_REPO = isFrameworkRepo(REPO_ROOT);
const SESSION = 'session-1';
const MATCHER = 'TodoWrite|TaskCreate|TaskUpdate|update_plan';
const SECRET = 'sk-test-FAKE-0123456789abcdef';
const SUBJECT = 'Refactor billing';

async function withFixture(fn, config) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'token-budget-test-'));
    const project = path.join(root, 'project');
    const transcripts = path.join(root, 'transcripts');
    fs.mkdirSync(path.join(project, '.claude'), { recursive: true });
    fs.mkdirSync(transcripts, { recursive: true });
    if (config !== undefined) {
        fs.mkdirSync(path.join(project, 'docs'), { recursive: true });
        fs.writeFileSync(path.join(project, 'docs', 'project-config.json'), JSON.stringify(config));
    }
    const fx = {
        root,
        project,
        main: path.join(transcripts, `${SESSION}.jsonl`),
        sub(id) {
            const dir = path.join(transcripts, SESSION, 'subagents');
            fs.mkdirSync(dir, { recursive: true });
            return path.join(dir, `agent-${id}.jsonl`);
        },
        stateFile: path.join(ledger.sessionDir(path.join(project, 'tmp', 'token-budget'), SESSION), hook.STATE_FILE),
        storeRoot: path.join(project, 'tmp', 'token-budget'),
        seq: 0
    };
    fs.writeFileSync(fx.main, '');
    try {
        return await fn(fx);
    } finally {
        fs.rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    }
}

/** Append one model response (one usage line; unique message.id + requestId per call). */
function respond(fx, file, [input, cacheCreation, cacheRead, output], text = 'ok') {
    fx.seq += 1;
    fs.appendFileSync(file, JSON.stringify({
        type: 'assistant',
        requestId: `req_${fx.seq}`,
        message: {
            id: `msg_${fx.seq}`,
            role: 'assistant',
            content: [{ type: 'text', text }],
            usage: {
                input_tokens: input,
                cache_creation_input_tokens: cacheCreation,
                cache_read_input_tokens: cacheRead,
                output_tokens: output
            }
        }
    }) + '\n');
}

function taskEvent(fx, toolName = 'TaskUpdate', toolInput = { taskId: '1', status: 'in_progress' }, extra = {}) {
    return {
        hook_event_name: 'PostToolUse',
        session_id: SESSION,
        transcript_path: fx.main,
        cwd: fx.project,
        tool_name: toolName,
        tool_input: toolInput,
        ...extra
    };
}

/** In-process run: config injected, project fixed, stdout captured. */
function fire(fx, event, extra = {}) {
    return hook.run(event, {
        config: {},
        projectDir: fx.project,
        write: (text, done) => done(true),
        ...extra
    });
}

function noteOf(payload) {
    const parsed = JSON.parse(payload);
    assert.deepEqual(Object.keys(parsed), ['hookSpecificOutput'], 'advisory output carries no decision field');
    assert.equal(parsed.hookSpecificOutput.hookEventName, 'PostToolUse');
    return parsed.hookSpecificOutput.additionalContext;
}

function readMarker(fx) {
    return JSON.parse(fs.readFileSync(fx.stateFile, 'utf8'));
}

function storedTotal(marker) {
    return Object.values(marker.usage.files).reduce((sum, file) => sum + usageLib.nonCachedTotal(file.totals), 0);
}

/** Child env: fixture HOME/temp dirs, inherited switches and provider keys blanked. */
function isolatedEnv(fx) {
    const env = { HOME: fx.root, USERPROFILE: fx.root, TMPDIR: fx.root, TEMP: fx.root, TMP: fx.root };
    for (const key of Object.keys(process.env)) {
        if (/^CK_/i.test(key) || /(?:API_KEY|TOKEN|SECRET|PASSWORD)/i.test(key)) env[key] = '';
    }
    return env;
}

function spawnHook(fx, event) {
    return runHook(HOOK, event, { cwd: fx.project, env: isolatedEnv(fx), timeout: 20000 });
}

/** Real host cancellation: close its stdout reader before releasing the hook's stdin. */
function spawnWithClosedOutput(fx, event) {
    return new Promise((resolve, reject) => {
        const child = spawn(process.execPath, [HOOK], {
            cwd: fx.project,
            env: { ...process.env, ...isolatedEnv(fx), CLAUDE_PROJECT_DIR: fx.project },
            stdio: ['pipe', 'pipe', 'pipe']
        });
        let stderr = '';
        const timer = setTimeout(() => child.kill(), 20000);
        child.stderr.on('data', chunk => { stderr += chunk; });
        child.stdin.on('error', () => { /* a closed host can also close stdin */ });
        child.once('error', error => { clearTimeout(timer); reject(error); });
        child.once('close', code => { clearTimeout(timer); resolve({ code, stderr }); });
        child.stdout.destroy();
        child.stdin.end(JSON.stringify(event));
    });
}

/** Fixed text of a note: every number replaced, so only the template remains. */
function template(note) {
    return note.replace(/\d[\d,]*/g, '#');
}

const tests = [
    {
        name: '[token-budget] TechnicalSpec closed stdout stays advisory and preserves a due checkpoint for retry',
        fn: () => withFixture(async fx => {
            // Given usage past a due threshold and a host closing the pipe before output.
            respond(fx, fx.main, [0, 0, 0, 600000]);
            for (const toolName of hook.CHECKPOINT_TOOLS) {
                const sessionId = 'closed-' + toolName;
                const event = taskEvent(fx, toolName, {}, { session_id: sessionId });
                // When the real hook writes to the closed reader (no timing sleep).
                const failed = await spawnWithClosedOutput(fx, event);
                // Then transport failure never blocks, credits a threshold, or leaves its claim.
                assert.equal(failed.code, 0, failed.stderr);
                assert.equal(failed.stderr, '', 'advisory stdout failure is handled');
                const dir = ledger.sessionDir(fx.storeRoot, sessionId);
                const stateFile = path.join(dir, hook.STATE_FILE);
                assert.equal(JSON.parse(fs.readFileSync(stateFile, 'utf8')).lastThreshold, 0);
                assert.equal(fs.existsSync(path.join(dir, 'usage-state.lock')), false);
                // When the host next accepts output, Then the due note delivers exactly once.
                const retry = await spawnHook(fx, event);
                assert.equal(retry.code, 0, retry.stderr);
                assert.match(noteOf(retry.stdout), /600,000 non-cached tokens.*500,000 checkpoint/);
                assert.equal(JSON.parse(fs.readFileSync(stateFile, 'utf8')).lastThreshold, 500000);
                const repeat = await spawnHook(fx, event);
                assert.equal(repeat.code, 0, repeat.stderr);
                assert.equal(repeat.stdout, '');
            }
        }, { project: { name: 'fixture' } })
    },
    {
        name: '[token-budget] TechnicalSpec default writer releases its temporary listener on success and synchronous throw',
        fn: () => withFixture(async fx => {
            // Given a due note and a unit seam at the volatile stdout transport only.
            respond(fx, fx.main, [0, 0, 0, 600000]);
            const originalWrite = process.stdout.write;
            const baseline = process.stdout.listenerCount('error');
            try {
                for (const shouldThrow of [false, true]) {
                    let captured = '';
                    process.stdout.write = (text, done) => {
                        captured = text;
                        if (shouldThrow) throw new Error('synthetic stdout failure');
                        done();
                        return true;
                    };
                    // When defaultWrite succeeds or throws, Then it settles and releases ownership.
                    const event = taskEvent(fx, 'TaskCreate', {}, { session_id: 'writer-' + shouldThrow });
                    const payload = await fire(fx, event, { write: undefined });
                    assert.match(noteOf(captured), /500,000 checkpoint/);
                    assert.equal(payload, shouldThrow ? '' : captured);
                    assert.equal(process.stdout.listenerCount('error'), baseline, 'temporary listener released');
                    const stateFile = path.join(ledger.sessionDir(fx.storeRoot, event.session_id), hook.STATE_FILE);
                    if (fs.existsSync(stateFile)) assert.equal(JSON.parse(fs.readFileSync(stateFile, 'utf8')).lastThreshold, shouldThrow ? 0 : 500000);
                }
            } finally {
                process.stdout.write = originalWrite;
            }
        })
    },
    {
        name: '[token-budget] TechnicalSpec a late stream error cannot overwrite a peer accepted checkpoint',
        fn: () => withFixture(async fx => {
            // Given a due note and a failed transport reporting callback before its error event.
            // Parallel hook processes may deliver successfully after that callback released the claim.
            respond(fx, fx.main, [0, 0, 0, 600000]);
            const originalWrite = process.stdout.write;
            const existingListeners = new Set(process.stdout.listeners('error'));
            const failure = new Error('synthetic pipe failure');
            try {
                process.stdout.write = (text, done) => { done(failure); return false; };
                // When the failure callback runs, followed by a peer accepting the due note.
                assert.equal(await fire(fx, taskEvent(fx), { write: undefined }), '');
                const accepted = await fire(fx, taskEvent(fx));
                assert.match(noteOf(accepted), /500,000 checkpoint/);
                // Then the late error event only consumes the listener, never rolls back the peer.
                process.stdout.emit('error', failure);
                assert.equal(readMarker(fx).lastThreshold, 500000);
                assert.equal(await fire(fx, taskEvent(fx)), '', 'accepted checkpoint remains deduplicated');
            } finally {
                process.stdout.write = originalWrite;
                for (const listener of process.stdout.listeners('error')) {
                    if (!existingListeners.has(listener)) process.stdout.removeListener('error', listener);
                }
            }
        })
    },
    {
        name: '[token-budget] TC-GWF-034 non-cached 520k past a 500k threshold: one note with the total, via the real process',
        fn: () => withFixture(async fx => {
            // Given one response of input 100k + cache writes 20k + output 400k (cache reads 9M)
            respond(fx, fx.main, [100000, 20000, 9000000, 400000]);
            // When TaskUpdate fires through the real hook process (default config: on, 500k)
            const result = await spawnHook(fx, taskEvent(fx));
            // Then exit 0 with one advisory note naming the total and the threshold
            assert.equal(result.code, 0, result.stderr);
            const note = noteOf(result.stdout);
            assert.match(note, /520,000 non-cached tokens/);
            assert.match(note, /500,000 checkpoint/);
            assert.doesNotMatch(note, /9,000,000|9,520,000/, 'cache reads never enter the total');
            // And the threshold is recorded so it fires once
            assert.equal(readMarker(fx).lastThreshold, 500000);
        }, { project: { name: 'fixture' } })
    },
    {
        name: '[token-budget] TC-GWF-035 a threshold already noted stays silent, with or without growth below the next one',
        fn: () => withFixture(async fx => {
            // Given a 520k session whose 500k note was delivered
            respond(fx, fx.main, [100000, 20000, 0, 400000]);
            assert.ok(await fire(fx, taskEvent(fx)));
            // When TaskUpdate fires again, with no growth and then with growth to 900k
            const again = await fire(fx, taskEvent(fx));
            respond(fx, fx.main, [0, 0, 0, 380000]);
            const grown = await fire(fx, taskEvent(fx));
            // Then no note either time
            assert.equal(again, '');
            assert.equal(grown, '');
        })
    },
    {
        name: '[token-budget] TC-GWF-036 crossing 1,000k after the 500k note: a second note',
        fn: () => withFixture(async fx => {
            // Given the 500k note delivered at 520k
            respond(fx, fx.main, [100000, 20000, 0, 400000]);
            assert.ok(await fire(fx, taskEvent(fx)));
            // When usage grows to 1,010k and TaskUpdate fires
            respond(fx, fx.main, [200000, 90000, 0, 200000]);
            const payload = await fire(fx, taskEvent(fx));
            // Then a second note names the 1,000,000 threshold
            const note = noteOf(payload);
            assert.match(note, /1,010,000 non-cached tokens/);
            assert.match(note, /1,000,000 checkpoint/);
            assert.equal(readMarker(fx).lastThreshold, 1000000);
        })
    },
    {
        name: '[token-budget] TC-GWF-037 enabled:false reads no transcript, prints nothing and writes no marker',
        fn: () => withFixture(async fx => {
            // Given usage far past the threshold and a reader that records any call
            respond(fx, fx.main, [0, 0, 0, 2000000]);
            let reads = 0;
            const spy = { readUsageIncremental: (...args) => { reads += 1; return usageLib.readUsageIncremental(...args); } };
            // When TaskUpdate fires in-process with the checkpoint disabled
            const inProcess = await fire(fx, taskEvent(fx), { config: { hooks: { tokenBudget: { enabled: false } } }, usage: spy });
            // Then nothing is read, printed or stored
            assert.equal(inProcess, '');
            assert.equal(reads, 0, 'no transcript read when disabled');
            assert.equal(fs.existsSync(fx.storeRoot), false);
            // And the real process with the project config file set to enabled:false agrees
            const result = await spawnHook(fx, taskEvent(fx));
            assert.equal(result.code, 0, result.stderr);
            assert.equal(result.stdout, '');
            assert.equal(fs.existsSync(fx.storeRoot), false);
        }, { project: { name: 'fixture' }, hooks: { tokenBudget: { enabled: false } } })
    },
    {
        name: '[token-budget] TC-GWF-038 an unreadable transcript fails open: exit 0, no output',
        fn: () => withFixture(async fx => {
            // Given a missing transcript, a directory in its place, and a transcript of foreign lines
            const missing = taskEvent(fx, 'TaskUpdate', { status: 'completed' }, { transcript_path: path.join(fx.root, 'absent.jsonl') });
            const dirPath = path.join(fx.root, 'is-a-dir.jsonl');
            fs.mkdirSync(dirPath);
            const directory = taskEvent(fx, 'TaskUpdate', { status: 'completed' }, { transcript_path: dirPath });
            fs.writeFileSync(fx.main, '{"type":"event_msg","payload":{"type":"token_count","info":{"total":9999999}}}\nnot json\n');
            // When each fires through the real process
            const results = [await spawnHook(fx, missing), await spawnHook(fx, directory), await spawnHook(fx, taskEvent(fx))];
            // Then every run exits 0 and prints nothing
            for (const result of results) {
                assert.equal(result.code, 0, result.stderr);
                assert.equal(result.stdout, '');
            }
        }, { project: { name: 'fixture' } })
    },
    {
        name: '[token-budget] TC-GWF-039 any output stays within 600 chars, even at the largest counts',
        fn: () => withFixture(async fx => {
            // Given a session near a trillion non-cached tokens, a 20M checkpoint and a million completed steps
            respond(fx, fx.main, [999999999999, 0, 0, 0]);
            const todos = Array.from({ length: 1000000 }, () => ({ status: 'completed' }));
            // When TodoWrite fires
            const payload = await fire(fx, taskEvent(fx, 'TodoWrite', { todos }), { config: { hooks: { tokenBudget: { checkpointTokens: 20000000 } } } });
            // Then the whole stdout payload is at most 600 chars and still carries the note
            assert.ok(payload.length > 0);
            assert.ok(payload.length <= hook.MAX_OUTPUT_CHARS, `payload ${payload.length} chars`);
            assert.match(noteOf(payload), /999,999,999,999 non-cached tokens.*999,980,000,000 checkpoint.*Completed steps so far: 1,000,000/);
        })
    },
    {
        name: '[token-budget] TC-GWF-040 sub-agent usage counts toward the threshold',
        fn: () => withFixture(async fx => {
            // Given main 300k and one sub-agent 250k non-cached
            respond(fx, fx.main, [100000, 0, 0, 200000]);
            respond(fx, fx.sub('a1'), [50000, 0, 500000, 200000]);
            // When the main conversation's TaskUpdate fires
            const payload = await fire(fx, taskEvent(fx));
            // Then the note counts both transcripts (550k past 500k)
            assert.match(noteOf(payload), /550,000 non-cached tokens/);
        })
    },
    {
        name: '[token-budget] TC-GWF-050 the note carries only the three numbers: no secret, no task subject',
        fn: () => withFixture(async fx => {
            // Given a transcript whose messages and tool inputs hold a fake secret, and a task subject
            respond(fx, fx.main, [300000, 0, 0, 260000], `token ${SECRET} in text`);
            fs.appendFileSync(fx.main, JSON.stringify({
                type: 'assistant',
                message: { id: 'msg_tool', role: 'assistant', content: [{ type: 'tool_use', id: 'toolu_1', name: 'Bash', input: { command: `echo ${SECRET}` } }] }
            }) + '\n');
            const event = taskEvent(fx, 'TaskUpdate', { taskId: '7', status: 'completed', subject: SUBJECT, description: SECRET });
            // When the threshold note fires
            const note = noteOf(await fire(fx, event));
            // Then its text is the fixed template around total, threshold and step count only
            assert.equal(template(note), template(hook.buildNote(1, 2, 3)));
            assert.deepEqual(note.match(/\d[\d,]*/g), ['560,000', '500,000', '1']);
            for (const leak of [SECRET, 'sk-test-FAKE', SUBJECT, 'billing', fx.main]) {
                assert.equal(note.includes(leak), false, `note leaks ${leak}`);
            }
            // And the marker stores counts only
            const stored = fs.readFileSync(fx.stateFile, 'utf8');
            assert.equal(stored.includes('sk-test-FAKE') || stored.includes(SUBJECT), false);
        })
    },
    {
        name: '[token-budget] TC-GWF-053 registered as its own PostToolUse group on the prompt-ledger matcher (framework repo only)',
        skip: IS_FRAMEWORK_REPO ? false : 'asserts the framework repo\'s own settings (framework-repo signal)',
        fn: () => {
            // Given the shipped settings.json
            const settings = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, '.claude', 'settings.json'), 'utf8'));
            const groups = settings.hooks.PostToolUse;
            const commands = group => group.hooks.map(h => h.command);
            // When the checkpoint and prompt-ledger registrations are located
            const own = groups.filter(group => commands(group).some(c => c.includes('token-budget-checkpoint.cjs')));
            const ledgerGroup = groups.find(group => commands(group).some(c => c.includes('prompt-ledger.cjs')));
            // Then the checkpoint is alone in exactly one group whose matcher equals the ledger's
            assert.equal(own.length, 1, 'one checkpoint registration');
            assert.equal(own[0].hooks.length, 1, 'the checkpoint group holds only the checkpoint hook');
            assert.ok(ledgerGroup, 'prompt-ledger PostToolUse group present');
            assert.notEqual(own[0], ledgerGroup, 'not inside the prompt-ledger group');
            assert.equal(own[0].matcher, MATCHER);
            assert.equal(ledgerGroup.matcher, MATCHER);
        }
    },
    {
        name: '[token-budget] TC-GWF-055 cache reads alone never trigger a note; the stored total is non-cached only',
        fn: () => withFixture(async fx => {
            // Given 40 responses of cache_read 150k and non-cached 5k (6M cache reads, 200k non-cached)
            const outputs = [];
            for (let i = 0; i < 40; i += 1) {
                respond(fx, fx.main, [1000, 1000, 150000, 3000]);
                // When TaskUpdate fires after each response
                outputs.push(await fire(fx, taskEvent(fx)));
            }
            // Then no note, and the stored total is 200,000
            assert.deepEqual(outputs.filter(Boolean), []);
            assert.equal(storedTotal(readMarker(fx)), 200000);
            // And after 61 more such responses (505k non-cached), exactly one note in total
            for (let i = 0; i < 61; i += 1) {
                respond(fx, fx.main, [1000, 1000, 150000, 3000]);
                outputs.push(await fire(fx, taskEvent(fx)));
            }
            const notes = outputs.filter(Boolean);
            assert.equal(notes.length, 1);
            assert.match(noteOf(notes[0]), /500,000 non-cached tokens.*500,000 checkpoint/);
            assert.equal(storedTotal(readMarker(fx)), 505000);
        })
    },
    {
        name: '[token-budget] TC-GWF-048 via the reader state: an event with no transcript growth reads 0 bytes',
        fn: () => withFixture(async fx => {
            // Given a first event that stored the reader state
            respond(fx, fx.main, [1000, 0, 0, 1000]);
            respond(fx, fx.sub('a1'), [1000, 0, 0, 1000]);
            await fire(fx, taskEvent(fx));
            let bytes = 0;
            const io = { ...fs, readSync: (...args) => { const n = fs.readSync(...args); bytes += n; return n; } };
            // When a second event fires with no transcript growth
            await fire(fx, taskEvent(fx), { fs: io });
            // Then no transcript byte is read; after growth only the appended bytes are
            assert.equal(bytes, 0);
            const before = fs.statSync(fx.main).size;
            respond(fx, fx.main, [1000, 0, 0, 1000]);
            await fire(fx, taskEvent(fx), { fs: io });
            assert.equal(bytes, fs.statSync(fx.main).size - before);
        })
    },
    {
        name: '[token-budget] completed-step count: TaskUpdate completed adds one; TodoWrite and update_plan set the completed items',
        fn: () => withFixture(async fx => {
            // Given a session below the threshold
            respond(fx, fx.main, [1000, 0, 0, 1000]);
            const steps = () => readMarker(fx).completedSteps;
            // When task events fire, Then the stored count follows only `status: completed`
            await fire(fx, taskEvent(fx, 'TaskUpdate', { status: 'completed' }));
            await fire(fx, taskEvent(fx, 'TaskUpdate', { status: 'completed' }));
            await fire(fx, taskEvent(fx, 'TaskUpdate', { status: 'in_progress' }));
            await fire(fx, taskEvent(fx, 'TaskCreate', { subject: SUBJECT }));
            assert.equal(steps(), 2);
            await fire(fx, taskEvent(fx, 'TodoWrite', { todos: [{ status: 'completed' }, { status: 'pending' }, { status: 'completed' }, { status: 'completed' }] }));
            assert.equal(steps(), 3);
            await fire(fx, taskEvent(fx, 'update_plan', { plan: [{ step: 'a', status: 'completed' }, { step: 'b', status: 'in_progress' }] }));
            assert.equal(steps(), 1);
            // And the note reports the count at the crossing
            respond(fx, fx.main, [0, 0, 0, 600000]);
            const note = noteOf(await fire(fx, taskEvent(fx, 'TaskUpdate', { status: 'completed' })));
            assert.match(note, /Completed steps so far: 2\./);
        })
    },
    {
        name: '[token-budget] helper-agent events, other tools and other events stay silent and store nothing',
        fn: () => withFixture(async fx => {
            // Given usage past the threshold
            respond(fx, fx.main, [0, 0, 0, 700000]);
            // When a helper agent's TaskUpdate, a Bash PostToolUse and a PreToolUse TaskUpdate fire
            const outputs = [
                await fire(fx, taskEvent(fx, 'TaskUpdate', { status: 'completed' }, { agent_id: 'a1' })),
                await fire(fx, taskEvent(fx, 'Bash', { command: 'ls' })),
                await fire(fx, taskEvent(fx, 'TaskUpdate', { status: 'completed' }, { hook_event_name: 'PreToolUse' })),
                await fire(fx, taskEvent(fx, 'TaskUpdate', { status: 'completed' }, { session_id: '' }))
            ];
            // Then nothing is printed or stored
            assert.deepEqual(outputs, ['', '', '', '']);
            assert.equal(fs.existsSync(fx.storeRoot), false);
            // And the main conversation's next task event still delivers the note
            assert.match(noteOf(await fire(fx, taskEvent(fx))), /700,000 non-cached tokens/);
        })
    },
    {
        name: '[token-budget] a note the host did not take is not recorded, so the next task event delivers it',
        fn: () => withFixture(async fx => {
            // Given usage past the threshold and a stdout write that fails
            respond(fx, fx.main, [0, 0, 0, 600000]);
            const failed = await fire(fx, taskEvent(fx), { write: (text, done) => done(false) });
            // When the next task event fires with a working stdout
            const next = await fire(fx, taskEvent(fx));
            // Then the failed write printed nothing and recorded no threshold, and the retry delivers
            assert.equal(failed, '');
            assert.match(noteOf(next), /600,000 non-cached tokens/);
            assert.equal(readMarker(fx).lastThreshold, 500000);
        })
    },
    {
        name: '[token-budget] a peer holding the marker lock keeps this event silent; a stale lock is taken over',
        fn: () => withFixture(async fx => {
            // Given usage past the threshold and a live lock held by a peer event
            respond(fx, fx.main, [0, 0, 0, 600000]);
            const lock = path.join(path.dirname(fx.stateFile), 'usage-state.lock');
            fs.mkdirSync(path.dirname(lock), { recursive: true });
            fs.writeFileSync(lock, JSON.stringify({ pid: 1, at: Date.now(), token: 'peer' }));
            // When a task event fires while the peer holds it
            const blocked = await fire(fx, taskEvent(fx));
            // Then it prints nothing, leaves the marker alone and never deletes the peer's lock
            assert.equal(blocked, '');
            assert.equal(fs.existsSync(fx.stateFile), false);
            assert.equal(JSON.parse(fs.readFileSync(lock, 'utf8')).token, 'peer');
            // And once the peer's lock is stale, the next event takes it over and delivers the note
            const past = new Date(Date.now() - 60000);
            fs.utimesSync(lock, past, past);
            assert.match(noteOf(await fire(fx, taskEvent(fx))), /600,000 non-cached tokens/);
            assert.equal(fs.existsSync(lock), false, 'lock released after the event');
        })
    },
    {
        name: '[token-budget] parallel task events crossing one threshold deliver exactly one note',
        fn: () => withFixture(async fx => {
            // Given usage past the threshold and four task tools completing at once
            respond(fx, fx.main, [0, 0, 0, 600000]);
            const hooks = Array.from({ length: 4 }, (_, i) => ({ hookPath: HOOK, input: taskEvent(fx, 'TaskUpdate', { taskId: String(i), status: 'completed' }) }));
            // When their hook processes run in parallel
            const results = await runHooksParallel(hooks, { cwd: fx.project, env: isolatedEnv(fx), timeout: 20000 });
            // Then every process exits 0, exactly one prints the note, and all four steps count
            for (const { result } of results) assert.equal(result.code, 0, result.stderr);
            assert.equal(results.filter(({ result }) => result.stdout).length, 1);
            assert.equal(readMarker(fx).completedSteps, 4);
            assert.equal(fs.readdirSync(path.dirname(fx.stateFile)).filter(n => n.endsWith('.lock') || n.endsWith('.tmp')).length, 0, 'no lock or temp file left');
        }, { project: { name: 'fixture' } })
    },
    {
        name: '[token-budget] config: defaults on at 500k; a malformed section or out-of-range value keeps it off',
        fn: () => {
            // Given the schema range / When each config shape resolves / Then the documented outcome
            const range = [50000, 20000000];
            assert.deepEqual(hook.resolveBudget({}, range), { enabled: true, checkpointTokens: 500000 });
            assert.deepEqual(hook.resolveBudget({ hooks: { tokenBudget: {} } }, range), { enabled: true, checkpointTokens: 500000 });
            assert.deepEqual(hook.resolveBudget({ hooks: { tokenBudget: { checkpointTokens: 50000 } } }, range), { enabled: true, checkpointTokens: 50000 });
            assert.equal(hook.resolveBudget({ hooks: { tokenBudget: { enabled: false } } }, range).enabled, false);
            for (const bad of [
                { hooks: { tokenBudget: 'on' } },
                { hooks: { tokenBudget: [] } },
                { hooks: 'x' },
                { hooks: { tokenBudget: { enabled: 'yes' } } },
                { hooks: { tokenBudget: { checkpointTokens: 49999 } } },
                { hooks: { tokenBudget: { checkpointTokens: 20000001 } } },
                { hooks: { tokenBudget: { checkpointTokens: 500000.5 } } },
                { hooks: { tokenBudget: { checkpointTokens: '500000' } } }
            ]) {
                assert.equal(hook.resolveBudget(bad, range).enabled, false, JSON.stringify(bad));
            }
        }
    },
    {
        name: '[token-budget] retention: idle session markers older than 7 days are pruned once a day; the current, recent and foreign dirs stay',
        fn: () => withFixture(async fx => {
            // Given an idle 8-day-old session marker dir, a recent one, a foreign dir and the current session's old marker
            const DAY = 24 * 60 * 60 * 1000;
            const now = Date.now();
            const makeDir = (name, files, ageMs) => {
                const dir = path.join(fx.storeRoot, name);
                fs.mkdirSync(dir, { recursive: true });
                for (const [file, text] of Object.entries(files)) {
                    fs.writeFileSync(path.join(dir, file), text);
                    const when = new Date(now - ageMs);
                    fs.utimesSync(path.join(dir, file), when, when);
                }
                const when = new Date(now - ageMs);
                fs.utimesSync(dir, when, when);
                return dir;
            };
            const idle = makeDir('idle-session', { 'usage-state.json': '{"version":1}', 'usage-state.lock': '{}' }, 8 * DAY);
            const recent = makeDir('recent-session', { 'usage-state.json': '{"version":1}' }, 2 * DAY);
            const foreign = makeDir('foreign-dir', { 'usage-state.json': '{}', 'notes.txt': 'not ours' }, 30 * DAY);
            const current = makeDir(SESSION, { 'usage-state.json': '{"version":1}' }, 30 * DAY);
            respond(fx, fx.main, [10, 0, 0, 10]);
            // When a task event fires
            assert.equal(await fire(fx, taskEvent(fx), { now: () => now }), '');
            // Then only the idle marker dir is removed and the sweep is stamped
            assert.equal(fs.existsSync(idle), false, 'an idle marker dir older than 7 days is removed');
            assert.equal(fs.existsSync(recent), true, 'a recent marker dir stays');
            assert.equal(fs.existsSync(path.join(foreign, 'notes.txt')), true, 'a dir holding anything but this hook\'s files is never removed');
            assert.equal(fs.existsSync(current), true, 'the current session dir is never removed');
            assert.equal(JSON.parse(fs.readFileSync(path.join(fx.storeRoot, '_prune.json'), 'utf8')).at, now);

            // Given another idle dir within the same day / When an event fires / Then the sweep does not run again
            const later = makeDir('idle-later', { 'usage-state.json': '{"version":1}' }, 9 * DAY);
            await fire(fx, taskEvent(fx), { now: () => now + 60 * 60 * 1000 });
            assert.equal(fs.existsSync(later), true, 'at most one sweep per day');
            // And a day later it does
            await fire(fx, taskEvent(fx), { now: () => now + DAY + 1 });
            assert.equal(fs.existsSync(later), false, 'the next day\'s sweep removes it');
        }, { project: { name: 'fixture' } })
    }
];

module.exports = { name: 'token-budget-checkpoint', tests };
