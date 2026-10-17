'use strict';

// Shared with the native SCN wrapper: assertions exercise delivery, not a second
// implementation of the classifier, ledger or hook serializer.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const hook = require('../../failure-investigation-remind.cjs');
const ledger = require('../../lib/convention-ledger.cjs');
const { BYTES_PER_TOKEN } = require('../../lib/file-conventions.cjs');
const { validateConfig } = require('../../lib/project-config-schema.cjs');
const ROOT = path.resolve(__dirname, '../../../..');
const HOOK = path.join(ROOT, '.claude/hooks/failure-investigation-remind.cjs');
const GROUP = 'failure-investigation-remind';
const configured = settings => ({ project: { name: 'fixture' }, hooks: { failureInvestigationReminder: settings } });

async function fixture(fn) {
    const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'failure reminder-')));
    fs.mkdirSync(path.join(root, '.claude'));
    const transcript = path.join(root, 'history.jsonl');
    fs.writeFileSync(transcript, '');
    const fx = {
        root, transcript, store: path.join(root, 'tmp/protocol-delivery'),
        event: extra => ({ hook_event_name: 'PreToolUse', session_id: 'main', cwd: root, transcript_path: transcript, tool_name: 'Bash', tool_input: { command: 'fixture-test' }, ...extra }),
        fire: (input, config = {}, deps = {}) => hook.run(input, { projectRoot: root, config, write: (_text, done) => done(true), ...deps }),
        grow: tokens => fs.appendFileSync(transcript, 'x'.repeat(tokens * BYTES_PER_TOKEN))
    };
    try { await fn(fx); } finally { fs.rmSync(root, { recursive: true, force: true }); }
}

const cases = {
    async signals() {
        await fixture(async fx => {
            const input = fx.event();
            Object.defineProperty(input, 'tool_input', { get() { throw new Error('command must not be inspected'); } });
            const first = JSON.parse(await fx.fire(input)).hookSpecificOutput;
            assert.equal(first.hookEventName, 'PreToolUse');
            assert.match(first.additionalContext, /Before fixing an unexpected error or failed test/);
            assert.match(first.additionalContext, /investigate --mode=debug/);
            assert.match(first.additionalContext, /source, test and environment/);
            assert.match(first.additionalContext, /read-only roles read-only/);
            assert.match(first.additionalContext, /action authority/);
            assert.ok(first.additionalContext.length < 500, 'a reminder must stay small, not load full debug instructions');
            assert.ok(await fx.fire(fx.event({ tool_name: 'exec_command', session_id: 'codex' })));
            const failure = fx.event({ hook_event_name: 'PostToolUseFailure', tool_name: 'mcp__fixture__query', session_id: 'failure', is_interrupt: false });
            for (const field of ['error', 'tool_response', 'tool_result']) {
                Object.defineProperty(failure, field, { get() { throw new Error('tool output must not be inspected'); } });
            }
            assert.equal(JSON.parse(await fx.fire(failure)).hookSpecificOutput.hookEventName, 'PostToolUseFailure');
            const silent = [
                fx.event({ hook_event_name: 'PostToolUse', tool_response: { exit_code: 1, isError: true }, tool_result: 'Process exited with code 1\nOutput:\nERROR' }),
                fx.event({ hook_event_name: 'UserPromptSubmit', prompt: 'error: failed test' }),
                fx.event({ tool_name: 'Edit' }),
                fx.event({ hook_event_name: 'PostToolUseFailure', is_interrupt: true }),
                fx.event({ hook_event_name: 'PostToolUseFailure', tool_name: '' }),
                fx.event({ session_id: undefined }), fx.event({ session_id: '  ' }), null, {}
            ];
            for (const [index, value] of silent.entries()) {
                // Independent rejection must not pass because an earlier delivery
                // already credited this session. Preserve absent/blank identities.
                const input = value && typeof value.session_id === 'string' && value.session_id.trim()
                    ? { ...value, session_id: `rejected-${index}` } : value;
                assert.equal(await fx.fire(input), '');
            }
        });
    },
    async distanceAndScope() {
        await fixture(async fx => {
            const now = Date.now();
            const event = fx.event();
            assert.ok(await fx.fire(event, {}, { now }));
            fx.grow(149999);
            assert.equal(await fx.fire({ ...event, hook_event_name: 'PostToolUseFailure' }, {}, { now: now + 3600000 }), '');
            fx.grow(1);
            assert.ok(await fx.fire({ ...event, hook_event_name: 'PostToolUseFailure' }, {}, { now: now + 3600001 }));
            assert.equal(await fx.fire(event, {}, { now: now + 3600002 }), '');
            assert.ok(await fx.fire(fx.event({ session_id: 'other' })));
            const child = fx.event({ agent_id: 'child' });
            const childTranscript = ledger.transcriptPathFor(child);
            fs.mkdirSync(path.dirname(childTranscript), { recursive: true });
            fs.writeFileSync(childTranscript, '');
            assert.ok(await fx.fire(child));
            assert.equal(await fx.fire(child), '');
            assert.equal(ledger.readRecord(fx.store, 'main', ledger.scopeFor(child), GROUP).transcriptBytes, 0);
            fs.writeFileSync(fx.transcript, 'replaced');
            assert.ok(await fx.fire(event), 'a shorter replacement transcript re-arms');
            const record = ledger.readRecord(fx.store, 'main', 'main', GROUP);
            assert.equal(record.transcriptBytes, Buffer.byteLength('replaced'));
        });
    },
    async resetAndBlindHost() {
        await fixture(async fx => {
            const now = Date.now();
            const event = fx.event({ transcript_path: undefined });
            assert.equal(await fx.fire({ ...event, hook_event_name: 'SessionStart', source: 'compact' }), '');
            assert.equal(fs.existsSync(fx.store), false, 'reset before any delivery creates no store');
            assert.ok(await fx.fire(event, {}, { now }));
            assert.equal(await fx.fire(event, {}, { now: now + 86400000 }), '', 'time alone never represents token growth');
            for (const source of ['startup', 'resume']) {
                assert.equal(await fx.fire({ ...event, hook_event_name: 'SessionStart', source }), '');
                assert.equal(await fx.fire(event), '');
            }
            const fullProtocol = { hash: 'full', form: 'full', deliveredAt: now, transcriptBytes: null };
            ledger.writeRecordAtomic(fx.store, 'main', 'main', 'root-cause-debugging', fullProtocol);
            for (const source of ['compact', 'clear']) {
                assert.equal(await fx.fire({ ...event, hook_event_name: 'SessionStart', source }), '');
                assert.deepEqual(ledger.readRecord(fx.store, 'main', 'main', 'root-cause-debugging'), fullProtocol);
                assert.ok(await fx.fire(event));
                assert.equal(await fx.fire(event), '');
            }
            assert.equal(ledger.readRecord(fx.store, 'main', 'main', 'fix-layer-accountability'), null, 'the hint never earns full protocol credit');
            // A host report recorded by a sibling delivery moves a transcriptless session off the
            // blind path: its compactions are then observed, and elapsed time is still not token growth.
            const observed = fx.event({ transcript_path: undefined, session_id: 'observed-compaction' });
            assert.ok(await fx.fire(observed, {}, { now }));
            ledger.recordSessionCompaction(fx.store, 'observed-compaction', now + 1000);
            assert.equal(await fx.fire({ ...observed, hook_event_name: 'SessionStart', source: 'compact' }), '');
            assert.ok(await fx.fire(observed, {}, { now: now + 2000 }), 'an observed compaction re-arms a transcriptless host');
            assert.equal(await fx.fire(observed, {}, { now: now + 2000 + 86400000 }), '', 'age never re-arms after an observed compaction either');
            const measurable = fx.event({ session_id: 'transcript-compaction' });
            assert.ok(await fx.fire(measurable, {}, { now }));
            fs.appendFileSync(fx.transcript, `\n${JSON.stringify({ type: 'compacted', timestamp: new Date(now + 1000).toISOString() })}\n`);
            assert.ok(await fx.fire(measurable, {}, { now: now + 2000 }), 'incremental transcript compaction also re-arms');
        });
    },
    async configurationAndDelivery() {
        await fixture(async fx => {
            for (const settings of [{}, { enabled: false }, { reinjectAfterTokens: 20000 }, { reinjectAfterTokens: 2000000 }]) {
                assert.equal(validateConfig(configured(settings)).valid, true);
            }
            for (const settings of [{ enabled: 'yes' }, { reinjectAfterTokens: 19999 }, { reinjectAfterTokens: 2000001 }, { reinjectAfterTokens: 20000.5 }]) {
                assert.equal(validateConfig(configured(settings)).valid, false, JSON.stringify(settings));
            }
            const event = fx.event();
            assert.equal(await fx.fire(event, null), '');
            assert.equal(await fx.fire(event, configured({ enabled: false })), '');
            assert.equal(await fx.fire({ ...event, hook_event_name: 'PostToolUseFailure' }, configured({ enabled: false })), '');
            assert.equal(await fx.fire(event, {}, { write: (_text, done) => done(false) }), '');
            assert.equal(await fx.fire(event, {}, { write: () => { throw new Error('closed'); } }), '');
            assert.equal(ledger.readRecord(fx.store, 'main', 'main', GROUP), null, 'failed writes earn no credit');
            const config = configured({ reinjectAfterTokens: 20000 });
            assert.ok(await fx.fire(event, config));
            fx.grow(19999);
            assert.equal(await fx.fire(event, config), '');
            fx.grow(1);
            assert.ok(await fx.fire(event, config));
            assert.ok(await fx.fire(event, configured({ reinjectAfterTokens: 30000 })), 'a changed policy re-arms');
            let writes = 0;
            const parallel = fx.event({ session_id: 'parallel' });
            const write = (_text, done) => { writes++; setTimeout(() => done(true), 5); };
            const results = await Promise.all([fx.fire(parallel, {}, { write }), fx.fire(parallel, {}, { write })]);
            assert.equal(writes, 1, 'same-scope competing events share the delivery claim');
            assert.equal(results.filter(Boolean).length, 1);
        });
    },
    async unusableStore() {
        await fixture(async fx => {
            // A regular file where the store's parent directory belongs fails every record and claim
            // write on Windows, macOS and Linux alike, for a privileged user too; a read-only
            // directory mode binds neither Windows nor root.
            fs.writeFileSync(path.join(fx.root, 'tmp'), 'not a directory');
            const event = fx.event();
            for (let attempt = 1; attempt <= 3; attempt++) {
                const output = await fx.fire(event);
                assert.ok(output, `attempt ${attempt}: a reminder that cannot be recorded repeats instead of going silent`);
                assert.match(JSON.parse(output).hookSpecificOutput.additionalContext, /investigate --mode=debug/);
            }
            assert.equal(ledger.readRecord(fx.store, 'main', 'main', GROUP), null, 'no delivery credit exists without a written record');
            assert.equal(await fx.fire({ ...event, hook_event_name: 'SessionStart', source: 'compact' }), '', 'a reset stays silent on an unusable store');
            assert.equal(fs.readFileSync(path.join(fx.root, 'tmp'), 'utf8'), 'not a directory', 'the hook repairs nothing it does not own');
        });
    },
    async entrypointsAndRegistration() {
        await fixture(async fx => {
            const env = { ...process.env, HOME: fx.root, USERPROFILE: fx.root, CLAUDE_PROJECT_DIR: fx.root, TMPDIR: fx.root, TMP: fx.root, TEMP: fx.root, CLAUDE_HOOK_DEBUG: '0' };
            delete env.CLAUDE_HOOK_DEBUG_LOG;
            for (const key of Object.keys(env)) if (/^CK_|TOKEN|SECRET|PASSWORD|API_KEY/i.test(key)) delete env[key];
            const invoke = (args, input) => spawnSync(process.execPath, args, { cwd: fx.root, env, encoding: 'utf8', input: JSON.stringify(input), timeout: 10000 });
            for (const [name, args] of [['direct', [HOOK]], ['imported', ['-e', 'require(process.argv[1])', HOOK]]]) {
                const event = fx.event({ session_id: name });
                if (name === 'imported') { event.event = event.hook_event_name; delete event.hook_event_name; }
                const result = invoke(args, event);
                assert.equal(result.status, 0, result.stderr);
                assert.match(JSON.parse(result.stdout).hookSpecificOutput.additionalContext, /investigate --mode=debug/);
                assert.equal(invoke(args, event).stdout, '', 'real entrypoints persist dedup with absent project config');
            }
            const configFile = path.join(fx.root, 'docs/project-config.json');
            fs.mkdirSync(path.dirname(configFile), { recursive: true });
            for (const text of [JSON.stringify(configured({ enabled: false })), '{broken']) {
                fs.writeFileSync(configFile, text);
                const result = invoke([HOOK], fx.event({ session_id: text.length.toString() }));
                assert.equal(result.status, 0, result.stderr);
                assert.equal(result.stdout, '');
            }
        });
        const settings = JSON.parse(fs.readFileSync(path.join(ROOT, '.claude/settings.json'), 'utf8'));
        const owns = group => group.hooks?.some(entry => entry.command?.endsWith(`/.claude/hooks/${GROUP}.cjs`));
        assert.deepEqual(settings.hooks.PreToolUse.filter(owns).map(group => group.matcher), ['Bash|exec_command']);
        assert.deepEqual(settings.hooks.PostToolUseFailure.filter(owns).map(group => group.matcher), ['*']);
        assert.deepEqual(settings.hooks.SessionStart.filter(owns).map(group => group.matcher), ['compact|clear']);
        assert.equal(settings.hooks.PostToolUse.filter(owns).length, 0, 'no broad tool-result callback');
    },
    async hostMapping() {
        const { buildHooksConfig, materializeOpencodeHooks } = await import('../../../scripts/opencode/sync-hooks.mjs');
        const source = JSON.parse(fs.readFileSync(path.join(ROOT, '.claude/settings.json'), 'utf8'));
        const { hooks, report } = buildHooksConfig(source);
        const owns = group => group.hooks?.some(entry => entry.command === `.claude/hooks/${GROUP}.cjs`);
        assert.deepEqual(hooks.PreToolUse.filter(owns).map(group => group.matcher), ['Bash|exec_command']);
        assert.deepEqual(hooks.SessionStart.filter(owns).map(group => group.matcher), ['compact|clear']);
        assert.equal(hooks.PostToolUseFailure, undefined);
        assert.ok(report.skipped_events.some(row => row.event === 'PostToolUseFailure' && row.reason === 'unsupported-by-opencode'));
        await fixture(async fx => {
            // Exercise the generated consumer and actual hook, not just its table.
            const hookRoot = path.join(fx.root, '.claude/hooks');
            fs.mkdirSync(hookRoot, { recursive: true });
            fs.copyFileSync(HOOK, path.join(hookRoot, `${GROUP}.cjs`));
            fs.cpSync(path.join(ROOT, '.claude/hooks/lib'), path.join(hookRoot, 'lib'), { recursive: true });
            // The real runtime guard resolves routing from this canonical sibling.
            const scriptsLib = path.join(fx.root, '.claude/scripts/lib');
            fs.mkdirSync(scriptsLib, { recursive: true });
            fs.copyFileSync(path.join(ROOT, '.claude/scripts/lib/workflow-routing-config.cjs'), path.join(scriptsLib, 'workflow-routing-config.cjs'));
            const reminderOnly = Object.fromEntries(['PreToolUse', 'SessionStart'].map(event => [event,
                source.hooks[event].filter(group => group.hooks?.some(entry => entry.command?.endsWith(`/.claude/hooks/${GROUP}.cjs`)))]));
            fs.writeFileSync(path.join(fx.root, '.claude/settings.json'), JSON.stringify({ hooks: reminderOnly }));
            const { pluginPath } = await materializeOpencodeHooks({ rootDir: fx.root });
            const { EasyClaudeHooks } = await import(pathToFileURL(pluginPath).href);
            const bridge = await EasyClaudeHooks({ directory: fx.root });
            const before = sessionID => bridge['tool.execute.before']({ tool: 'bash', sessionID, callID: 'fixture' }, { args: { command: 'fixture-test' } });
            const model = async sessionID => {
                const output = { system: [] };
                await bridge['experimental.chat.system.transform']({ sessionID }, output);
                return output.system.filter(text => text.includes('CK:FAILURE-INVESTIGATION-REMINDER'));
            };
            const after = async sessionID => {
                const output = { output: 'fixture-output' };
                await bridge['tool.execute.after']({ tool: 'bash', sessionID, callID: 'fixture', args: { command: 'fixture-test' } }, output);
                return output.output;
            };
            await before('completed');
            assert.match(await after('completed'), /^fixture-output\n\n[^]*CK:FAILURE-INVESTIGATION-REMINDER/, 'a completed tool carries the reminder in its output, where it stays in the conversation');
            assert.deepEqual(await model('completed'), [], 'a reminder delivered with tool output is not repeated in the system prompt');
            await before('completed');
            assert.equal(await after('completed'), 'fixture-output', 'actual hook credit keeps later tool output free of the reminder');
            await before('bridge');
            assert.deepEqual(await model('other'), [], 'queued context cannot leak across sessions');
            await bridge['experimental.chat.system.transform']({ sessionID: 'bridge' }, {});
            assert.equal((await model('bridge')).length, 1, 'retain until a model sink exists, even without a successful after callback');
            assert.deepEqual(await model('bridge'), [], 'consume pending context once');
            await before('bridge');
            assert.deepEqual(await model('bridge'), [], 'actual hook credit suppresses repeated shell events');
            await bridge.event({ event: { type: 'session.compacted', properties: { sessionID: 'bridge' } } });
            await before('bridge');
            assert.equal((await model('bridge')).length, 1, 'compaction re-arms and reaches the model');
            await bridge.event({ event: { type: 'session.compacted', properties: { sessionID: 'bridge' } } });
            await before('bridge');
            await bridge.event({ event: { type: 'session.compacted', properties: { sessionID: 'bridge' } } });
            assert.deepEqual(await model('bridge'), [], 'compaction discards a reminder still waiting for a model request');
            await before('bridge');
            assert.equal((await model('bridge')).length, 1, 'the discarded reminder is re-armed, not lost');
            await before('deleted');
            await bridge.event({ event: { type: 'session.deleted', properties: { info: { id: 'deleted' } } } });
            assert.deepEqual(await model('deleted'), [], 'deleted sessions discard pending context');
        });
    }
};

async function assertFailureReminderContract() {
    for (const run of Object.values(cases)) await run();
}

module.exports = { cases, assertFailureReminderContract };
