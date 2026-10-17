'use strict';

// Protect discovery-before-change and bounded reminder noise through the real hook/ledger boundary.
// Each fixture owns its project, config and transcript. Both separators are accepted on every OS.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const hook = require('../../ui-reuse-remind.cjs');
const { BYTES_PER_TOKEN } = require('../../lib/file-conventions.cjs');
const { validateConfig } = require('../../lib/project-config-schema.cjs');
const { runHook } = require('../lib/hook-runner.cjs');
const { spawnSync } = require('node:child_process');
const { isFrameworkRepo } = require('../lib/framework-repo-guard.cjs');
const ROOT = path.resolve(__dirname, '../../../..');
const HOOK = path.join(ROOT, '.claude/hooks/ui-reuse-remind.cjs');
const BODY = '**IMPORTANT MUST ATTENTION** fixture: find design system and shared UI controls before changing UI.';
const tests = [];
function test(name, fn) { tests.push({ name, fn }); }
async function fixture(fn) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-reuse-'));
    const file = path.join(root, '.claude/skills/shared/sync-inline-versions.md');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, `## SYNC:ui-system-context:reminder\n\n${BODY}\n\n---\n`);
    const transcript = path.join(root, 'history.jsonl');
    fs.writeFileSync(transcript, '');
    const fx = {
        root, file, transcript,
        event: extra => ({ hook_event_name: 'UserPromptSubmit', session_id: 'main', cwd: root, transcript_path: transcript, prompt: 'continue', ...extra }),
        fire: (event, config = {}, extra = {}) => hook.run(event, { projectRoot: root, config, write: (_text, done) => done(true), ...extra }),
        grow: tokens => fs.appendFileSync(transcript, 'x'.repeat(tokens * BYTES_PER_TOKEN))
    };
    try { await fn(fx); } finally { fs.rmSync(root, { recursive: true, force: true }); }
}
const pre = (fx, file, tool = 'Read') => fx.event({ hook_event_name: 'PreToolUse', tool_name: tool, tool_input: { file_path: file } });
const configured = settings => ({ project: { name: 'fixture' }, hooks: { uiReuseReminder: settings } });

test('TC-PDL-115 every prompt reminds before UI work without assuming prompt intent', () => fixture(async fx => {
    const result = await fx.fire(fx.event());
    assert.ok(result.includes(BODY));
    assert.ok(result.startsWith('<!-- CK:UI-REUSE-REMINDER -->'));
}));

test('TC-PDL-116 common stack and native UI paths remind before a read or change, ordinary logic stays silent', () => fixture(async fx => {
    const included = ['index.html', 'Form.tsx', 'Form.jsx', 'App.vue', 'App.svelte', 'Page.astro', 'site.scss', 'Main.xaml', 'Main.storyboard', 'res/layout-land/main.xml', 'view.blade.php', 'form.erb', 'index.heex', 'Main.qml', 'Main.fxml', 'style.uss', 'app.wxml', 'src/components/Input.ts', 'lib/widgets/input.dart', 'app/screens/Home.swift', 'ui/Home.kt', 'src\\views\\Form.cs'];
    for (const file of included) {
        const input = pre(fx, file);
        input.session_id = file;
        const result = await fx.fire(input);
        assert.ok(result, file);
        const output = JSON.parse(result).hookSpecificOutput;
        assert.equal(output.hookEventName, 'PreToolUse');
        assert.ok(output.additionalContext.includes(BODY));
    }
    for (const file of ['src/service.ts', 'src/model.dart', 'README.md', 'node_modules/Input.tsx', 'dist/index.html', 'tmp/view.html', '.agents/mockup.html', '../outside.tsx', '..\\outside.tsx']) {
        assert.equal(await fx.fire(pre(fx, file)), '', file);
    }
    for (const tool of ['Edit', 'Write', 'MultiEdit']) assert.ok(await fx.fire({ ...pre(fx, 'Form.tsx', tool), session_id: tool }));
    assert.ok(await fx.fire(fx.event({ hook_event_name: 'PreToolUse', tool_name: 'apply_patch', tool_input: { patch: '*** Begin Patch\n*** Add File: Form.tsx\n+ui\n*** End Patch' }, session_id: 'patch' })));
}));

test('TC-PDL-116 shell reads and plan activation receive the same pre-action reminder', () => fixture(async fx => {
    const operations = [
        ['Bash', { command: 'cat "src/components/a.ts"' }],
        ['exec_command', { cmd: 'cat src/views/a.dart' }],
        ['exec_command', { cmd: 'Get-Content src\\views\\Home.cs' }],
        ['Read', { file_path: '.agents\\skills\\plan\\SKILL.md' }],
        ['Read', { file_path: '.agents/skills/plan/SKILL.md' }],
        ['Skill', { skill: 'plan' }],
        ['Skill', { name: 'plan' }]
    ];
    for (const [index, [tool_name, tool_input]] of operations.entries()) {
        assert.ok(await fx.fire(fx.event({ hook_event_name: 'PreToolUse', tool_name, tool_input, session_id: `op-${index}` })));
    }
    assert.equal(await fx.fire(fx.event({ hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: 'cat src/service.ts' } })), '');
    assert.equal(await fx.fire(fx.event({ hook_event_name: 'PostToolUse', tool_name: 'Read', tool_input: { file_path: 'Form.tsx' } })), '');
}));

test('TC-PDL-117 all trigger paths share one record until exactly 100K tokens, then reset the window', () => fixture(async fx => {
    assert.ok(await fx.fire(fx.event()));
    fx.grow(99999);
    assert.equal(await fx.fire(pre(fx, 'Form.tsx')), '');
    assert.equal(await fx.fire(fx.event()), '');
    fx.grow(1);
    assert.ok(await fx.fire(pre(fx, 'Form.tsx')));
    assert.equal(await fx.fire(fx.event()), '');
    fx.grow(99999);
    assert.equal(await fx.fire(fx.event()), '');
}));

test('TC-PDL-117 compaction, changed rule and independent scope re-arm; elapsed time alone does not', () => fixture(async fx => {
    const now = Date.now();
    assert.ok(await fx.fire(fx.event(), {}, { now }));
    assert.equal(await fx.fire(fx.event(), {}, { now: now + 3600000 }), '');
    assert.ok(await fx.fire(fx.event({ agent_id: 'child' }), {}, { now: now + 1000 }));
    fs.appendFileSync(fx.transcript, `\n${JSON.stringify({ type: 'compacted', timestamp: new Date(now + 2000).toISOString() })}\n`);
    assert.ok(await fx.fire(fx.event(), {}, { now: now + 3000 }));
    fs.writeFileSync(fx.file, fs.readFileSync(fx.file, 'utf8').replace('fixture:', 'changed:'));
    assert.ok(await fx.fire(fx.event(), {}, { now: now + 4000 }));
    // Clock-only refresh is forbidden for hosts without transcripts, both before and after
    // a known condensation signal. Measurable transcripts bypass the ledger's age branch.
    const blind = fx.event({ session_id: 'blind-clock', transcript_path: undefined });
    assert.ok(await fx.fire(blind, {}, { now }));
    assert.equal(await fx.fire(blind, {}, { now: now + 3600000 }), '');
    const ledger = require('../../lib/convention-ledger.cjs');
    const store = path.join(fx.root, 'tmp/protocol-delivery');
    ledger.recordSessionCompaction(store, blind.session_id, now + 3601000);
    assert.ok(await fx.fire(blind, {}, { now: now + 3602000 }));
    assert.equal(await fx.fire(blind, {}, { now: now + 7202000 }), '');
}));

test('TC-PDL-116 project can extend, replace and exclude frontend matchers or disable all reminders', () => fixture(async fx => {
    const custom = configured({ useDefaultMatchers: false, pathGlobs: ['custom/**/*.view'], excludePathGlobs: ['custom/generated/**'] });
    assert.equal(await fx.fire(pre(fx, 'Form.tsx'), custom), '');
    assert.equal(await fx.fire(pre(fx, 'custom/generated/a.view'), custom), '');
    assert.ok(await fx.fire(pre(fx, 'custom/a.view'), custom));
    assert.ok(await fx.fire({ ...pre(fx, 'custom/a.view'), session_id: 'add' }, configured({ pathGlobs: ['custom/**/*.view'] })));
    assert.ok(await fx.fire({ ...pre(fx, 'Form.tsx'), session_id: 'default' }, configured({ pathGlobs: ['custom/**/*.view'] })));
    assert.equal(await fx.fire(fx.event({ session_id: 'off' }), configured({ enabled: false })), '');
}));

test('TC-PDL-117 configured interval is honored and changed settings re-arm an existing scope', () => fixture(async fx => {
    const config = configured({ reinjectAfterTokens: 20000 });
    assert.ok(await fx.fire(fx.event(), config));
    fx.grow(19999);
    assert.equal(await fx.fire(fx.event(), config), '');
    fx.grow(1);
    assert.ok(await fx.fire(fx.event(), config));
    assert.ok(await fx.fire(fx.event(), configured({ reinjectAfterTokens: 30000 })));
}));

test('[technical] failed or throwing output earns no credit; a digest never marks the full protocol delivered', () => fixture(async fx => {
    assert.equal(await fx.fire(fx.event(), {}, { write: (_text, done) => done(false) }), '');
    assert.equal(await fx.fire(fx.event(), {}, { write: () => { throw new Error('closed'); } }), '');
    assert.ok(await fx.fire(fx.event()));
    const ledger = require('../../lib/convention-ledger.cjs');
    assert.equal(ledger.readRecord(path.join(fx.root, 'tmp/protocol-delivery'), 'main', 'main', 'ui-system-context'), null);
}));

test('[technical] absent transcript or session stays useful; missing canonical source retries without credit', () => fixture(async fx => {
    const event = fx.event({ transcript_path: undefined });
    assert.ok(await fx.fire(event));
    assert.equal(await fx.fire(event), '');
    assert.ok(await fx.fire(fx.event({ session_id: undefined })));
    assert.ok(await fx.fire(fx.event({ session_id: undefined })));
    assert.ok(await fx.fire(fx.event({ session_id: '  ' })));
    assert.ok(await fx.fire(fx.event({ session_id: '  ' })));
    const ledger = require('../../lib/convention-ledger.cjs');
    assert.equal(ledger.readRecord(path.join(fx.root, 'tmp/protocol-delivery'), 'unknown-session', 'main', 'ui-reuse-remind'), null);
    fs.unlinkSync(fx.file);
    assert.match(await fx.fire(fx.event()), /source unavailable/);
    assert.match(await fx.fire(fx.event()), /source unavailable/);
}));

test('[technical] schema accepts optional defaults and valid bounds, rejects malformed declared settings', () => {
    for (const settings of [{}, { reinjectAfterTokens: 20000 }, { reinjectAfterTokens: 2000000 }, { useDefaultMatchers: false, pathGlobs: ['custom/**'] }]) assert.equal(validateConfig(configured(settings)).valid, true);
    for (const settings of [{ enabled: 'yes' }, { reinjectAfterTokens: 19999 }, { reinjectAfterTokens: 2000001 }, { reinjectAfterTokens: 20000.5 }, { pathGlobs: [2] }]) assert.equal(validateConfig(configured(settings)).valid, false, JSON.stringify(settings));
});

test('[technical] direct and imported entrypoints load project settings and emit pre-action context with optional config', () => fixture(async fx => {
    const debugLog = path.join(fx.root, 'hook-decisions.jsonl');
    const env = { HOME: fx.root, USERPROFILE: fx.root, TMPDIR: fx.root, TEMP: fx.root, TMP: fx.root, CLAUDE_HOOK_DEBUG: '1', CLAUDE_HOOK_DEBUG_LOG: debugLog };
    for (const key of Object.keys(process.env)) if (/^CK_|TOKEN|SECRET|PASSWORD|API_KEY/i.test(key)) env[key] = '';
    const configPath = path.join(fx.root, 'docs/project-config.json');
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    const options = { cwd: fx.root, env, timeout: 20000 };
    const first = await runHook(HOOK, fx.event(), options);
    assert.equal(first.code, 0, first.stderr);
    assert.ok(first.stdout.includes(BODY));
    // Codex's node -e require has no require.main. Literal argv keeps this portable without
    // requiring an adopter to have a generated .codex folder; mirror parity is a separate gate.
    for (const eventKey of ['hook_event_name', 'event']) {
        const input = { ...pre(fx, 'Form.tsx'), session_id: `codex-${eventKey}` };
        if (eventKey === 'event') { input.event = input.hook_event_name; delete input.hook_event_name; }
        const codex = spawnSync(process.execPath, ['-e', 'require(process.argv[1])', HOOK], {
            ...options, env: { ...process.env, ...env, CLAUDE_PROJECT_DIR: fx.root }, encoding: 'utf8',
            input: JSON.stringify(input)
        });
        assert.equal(codex.status, 0, codex.stderr);
        assert.equal(JSON.parse(codex.stdout).hookSpecificOutput.hookEventName, 'PreToolUse');
    }
    fs.writeFileSync(configPath, JSON.stringify(configured({ enabled: false })));
    assert.equal((await runHook(HOOK, fx.event({ session_id: 'disabled' }), options)).stdout, '');
    fs.writeFileSync(configPath, '{broken');
    assert.equal((await runHook(HOOK, fx.event({ session_id: 'invalid' }), options)).stdout, '');
    // Every pre-tool invocation remains observable, including non-UI and disabled paths.
    for (const settings of [{}, { enabled: false }]) {
        fs.writeFileSync(configPath, JSON.stringify(configured(settings)));
        const result = await runHook(HOOK, fx.event({ hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: 'git status' } }), options);
        assert.equal(result.code, 0, result.stderr);
        assert.equal(result.stdout, '');
        assert.equal(result.stderr, '');
    }
    const records = fs.readFileSync(debugLog, 'utf8').trim().split('\n').map(line => JSON.parse(line));
    assert.equal(records.length, 4, 'exactly one record for each pre-tool entrypoint invocation');
    assert.deepEqual(records.map(record => record.tool), ['Read', 'Read', 'Bash', 'Bash']);
    for (const record of records) {
        assert.equal(record.hook, 'ui-reuse-remind');
        assert.equal(record.event, 'PreToolUse');
        assert.equal(record.code, 0);
        assert.equal(record.decision, 'allow');
        assert.ok(record.durationMs >= 0);
        assert.equal(Object.hasOwn(record, 'command'), false);
        assert.equal(Object.hasOwn(record, 'path'), false);
    }
}));

tests.push({ name: '[authoring] registrations, canonical reminder and plan guide preserve discovery obligations', skip: isFrameworkRepo(ROOT) ? false : 'authoring-repository only', fn: () => {
    const settings = JSON.parse(fs.readFileSync(path.join(ROOT, '.claude/settings.json'), 'utf8'));
    const owns = entry => entry.hooks.some(h => h.command.includes('ui-reuse-remind.cjs'));
    assert.equal(settings.hooks.UserPromptSubmit.filter(owns).length, 1);
    const pre = settings.hooks.PreToolUse.filter(owns);
    assert.equal(pre.length, 1);
    for (const tool of ['Read', 'Bash', 'exec_command', 'Skill', 'apply_patch']) assert.ok(pre[0].matcher.split('|').includes(tool));
    const reminder = require('../../../scripts/lib/canonical-protocol.cjs').readCanonicalProtocol(ROOT, 'ui-system-context:reminder');
    for (const term of ['design system', 'tokens', 'shared components/UI controls', 'usage examples', 'reuse', 'searched paths']) assert.ok(reminder.includes(term), term);
    assert.ok(reminder.length < 1000);
    const plan = fs.readFileSync(path.join(ROOT, '.claude/skills/plan/SKILL.md'), 'utf8');
    assert.ok(plan.includes('- `ui-system-context`'));
    assert.ok(plan.includes(reminder));
    const full = require('../../../scripts/lib/canonical-protocol.cjs').readCanonicalProtocol(ROOT, 'ui-system-context');
    assert.ok(full.includes("find and read the current project's design system"));
    const start = settings.hooks.SessionStart.filter(owns);
    assert.equal(start.length, 1);
    assert.equal(start[0].matcher, 'compact|clear');
    const agent = settings.hooks.SubagentStart.filter(owns);
    assert.equal(agent.length, 1);
    assert.equal(agent[0].matcher, undefined, 'every agent type');
} });

test('TC-PDL-118 every sub-agent start receives the reminder as start context, once per spawn', () => fixture(async fx => {
    assert.ok(await fx.fire(fx.event()));
    const start = id => fx.event({ hook_event_name: 'SubagentStart', agent_id: id, agent_type: 'Explore', prompt: undefined });
    const context = JSON.parse(await fx.fire(start('a1'))).hookSpecificOutput;
    assert.equal(context.hookEventName, 'SubagentStart');
    assert.ok(context.additionalContext.includes(BODY));
    assert.equal(await fx.fire(start('a1')), '', 'the same spawn is deduplicated');
    assert.ok(await fx.fire(start('a2')), 'another spawn is its own scope');
    assert.ok(await fx.fire(start(undefined)), 'a start without an agent id is still its own spawn');
    assert.equal(await fx.fire(fx.event()), '', 'the main scope is unaffected');
    assert.equal(await fx.fire(start('a3'), configured({ enabled: false })), '', 'the project switch silences agent starts too');
}));

test('TC-PDL-117 host compact delivers at once and compact/clear re-arm even without a transcript; startup/resume never re-arm', () => fixture(async fx => {
    const now = Date.now();
    const event = fx.event({ transcript_path: undefined });
    const ledger = require('../../lib/convention-ledger.cjs');
    const store = path.join(fx.root, 'tmp/protocol-delivery');
    // A compaction report is the only signal a promptless run gets: it delivers, and the next prompt stays silent.
    const compacted = { ...event, session_id: 'compacted' };
    const delivered = await fx.fire({ ...compacted, hook_event_name: 'SessionStart', source: 'compact' }, {}, { now });
    assert.equal(JSON.parse(delivered).hookSpecificOutput.hookEventName, 'SessionStart');
    assert.equal(await fx.fire(compacted, {}, { now: now + 500 }), '');
    assert.ok(await fx.fire(event, {}, { now }));
    const child = { ...event, agent_id: 'child' };
    assert.ok(await fx.fire(child, {}, { now }));
    for (const source of ['startup', 'resume']) {
        assert.equal(await fx.fire({ ...event, hook_event_name: 'SessionStart', source }, {}, { now: now + 1000 }), '');
        assert.equal(await fx.fire(event, {}, { now: now + 2000 }), '');
    }
    for (const [index, source] of ['compact', 'clear'].entries()) {
        const at = now + 3000 + index * 3000;
        const siblings = ['universal-bin-1', 'ui-system-context'];
        const before = new Map();
        for (const group of siblings) {
            ledger.writeRecordAtomic(store, 'main', 'main', group, { hash: group, deliveredAt: at - 1, transcriptBytes: null, form: 'full' });
            before.set(group, fs.readFileSync(ledger.recordFile(store, 'main', 'main', group), 'utf8'));
        }
        // Deterministically model UI reset finishing AFTER same-event sibling deliveries.
        const reset = await fx.fire({ ...event, hook_event_name: 'SessionStart', source }, {}, { now: at });
        assert.equal(Boolean(reset), source === 'compact', `${source} delivers only on a compaction`);
        for (const group of siblings) {
            assert.equal(fs.readFileSync(ledger.recordFile(store, 'main', 'main', group), 'utf8'), before.get(group));
            let siblingWrites = 0;
            const repeat = await ledger.deliverOnce({ root: store, input: event, group, hash: group, payload: 'duplicate sibling',
                settings: { reinjectAfterBytes: 100000 * BYTES_PER_TOKEN, reinjectAfterMinutes: null, blindReinjectAfterMinutes: null },
                now: at + 500, write: (_text, done) => { siblingWrites++; done(true); } });
            assert.equal(siblingWrites, 0, 'UI reset invalidated a fresh sibling delivery');
            assert.equal(repeat, '');
        }
        // After a compaction the main scope already holds the reminder; after a clear its next prompt delivers.
        assert.equal(Boolean(await fx.fire(event, {}, { now: at + 1000 })), source === 'clear');
        assert.ok(await fx.fire(child, {}, { now: at + 1000 }));
        assert.equal(await fx.fire(child, {}, { now: at + 2000 }), '');
        assert.equal(await fx.fire(event, {}, { now: at + 2000 }), '');
    }
}));

module.exports = { name: 'ui-reuse-remind', tests };
