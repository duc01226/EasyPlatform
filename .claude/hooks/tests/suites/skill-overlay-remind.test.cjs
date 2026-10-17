'use strict';

/**
 * Skill overlay reminder — `.claude/hooks/skill-overlay-remind.cjs` (spec ContextDelivery/README.ProtocolDelivery.md,
 * BR-PDL-19, TC-PDL-100..109).
 *
 * When a skill activates (PostToolUse `Skill`, PostToolUse `Read` of a SKILL.md, a typed slash command, a
 * second-host `$skill` prompt) the hook names the project overlay files that apply to it, at most two
 * lines: the most specific tier of the registry's `Target` column wins outright (exact name, then glob,
 * then `*`); bodies are derived from a bare-slug Name, never from the row's Body link; a skill is
 * reminded again only after about 150,000 tokens of conversation growth or a compaction.
 *
 * Guards: silent (exit 0, no record) when the registry is absent, empty, sentinel-only or malformed, no row
 * matches, a body is missing, or the configuration is unusable; an exact, a glob and a `*` row each emit;
 * exact beats glob beats `*`; a traversal Name reads nothing; dedup is per skill; growth at the window
 * re-reminds and one byte less does not; the reminder is bounded.
 *
 * Portability: every case spawns the real entry file against its own temp fixture project (registry,
 * bodies, optional config, conversation record) with CLAUDE_PROJECT_DIR set to the fixture, HOME,
 * USERPROFILE, TMPDIR, TEMP and TMP pointed at the temp dir, and inherited framework switches (CK_*,
 * CLAUDE_*, CODEX_*, OPENCODE_*, NODE_OPTIONS) removed. Fixtures are removed in `finally`.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const { childEnv } = require('../lib/hook-runner.cjs');

const HOOKS_DIR = path.resolve(__dirname, '..', '..');
const HOOK = path.join(HOOKS_DIR, 'skill-overlay-remind.cjs');
const hook = require(HOOK);
const overlayLib = require(path.join(HOOKS_DIR, 'lib', 'skill-protocol-overlay.cjs'));
const { BYTES_PER_TOKEN } = require(path.join(HOOKS_DIR, 'lib', 'file-conventions.cjs'));

const SPAWN_TIMEOUT_MS = 20000;
const DISTANCE = hook.OVERLAY_REINJECT_TOKENS * BYTES_PER_TOKEN;
const ADDITIVE = 'Overlays are ADDITIVE ONLY: they never waive the workflow route rules, git discipline, a review gate or a user-confirmation gate.';

// ── fixture project ─────────────────────────────────────────────────────────

function scrubbedEnv(temp, extra = {}) {
    const overrides = { HOME: temp, USERPROFILE: temp, TMPDIR: temp, TEMP: temp, TMP: temp, NODE_OPTIONS: undefined };
    for (const key of Object.keys(process.env)) {
        if (/^(?:CK_|CLAUDE_|CODEX_|OPENCODE_)/i.test(key)) overrides[key] = undefined;
        if (/^(?:OPENAI_|ANTHROPIC_|GEMINI_|GOOGLE_|AZURE_|TELEGRAM_|DISCORD_|SLACK_)/i.test(key)) overrides[key] = '';
    }
    return childEnv({ ...overrides, ...extra });
}

const HEADER = '| Target | Scope | Name | Description | Added | Body |\n| --- | --- | --- | --- | --- | --- |';
const row = ({ target, scope, name }) => `| ${target} | ${scope} | ${name} | Fixture overlay. | 2026-01-01 | [${name}](../project-protocols/${name}.md) |`;

async function withFixture(fn) {
    const temp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'sor-')));
    const project = path.join(temp, 'project');
    fs.mkdirSync(path.join(project, '.claude'), { recursive: true });
    const fx = {
        temp,
        project,
        transcript: path.join(temp, 'transcript.jsonl'),
        store: path.join(project, 'tmp', 'protocol-delivery'),
        abs: rel => path.join(project, ...rel.split('/')),
        write(rel, content) {
            const file = fx.abs(rel);
            fs.mkdirSync(path.dirname(file), { recursive: true });
            fs.writeFileSync(file, content);
            return file;
        },
        /** The registry (default location) and the bodies of the named rows. */
        registry(rows, { header = '', bodies = rows.map(r => r.name), indexRel = 'docs/project-reference/skill-protocols-reference.md' } = {}) {
            fx.write(indexRel, `# Skill protocols\n\n${header}${rows.length ? `${HEADER}\n${rows.map(row).join('\n')}\n` : ''}`);
            for (const name of bodies) fx.write(`docs/project-protocols/${name}.md`, `# ${name}\n\nAn overlay rule.\n`);
        },
        env: extra => scrubbedEnv(temp, { CLAUDE_PROJECT_DIR: project, ...extra }),
        append(text) {
            fs.appendFileSync(fx.transcript, text);
        },
        records(session = 's1', scope = 'main') {
            const dir = path.join(fx.store, session, scope);
            return fs.existsSync(dir) ? fs.readdirSync(dir).filter(name => name.endsWith('.json') && !name.startsWith('_')).sort() : [];
        }
    };
    fx.append('{"type":"user","message":{"content":"start"}}\n');
    try {
        return await fn(fx);
    } finally {
        fs.rmSync(temp, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    }
}

const skillUse = (fx, name, extra = {}) => ({
    hook_event_name: 'PostToolUse',
    tool_name: 'Skill',
    tool_input: { skill: name },
    session_id: 's1',
    transcript_path: fx.transcript,
    cwd: fx.project,
    ...extra
});

function run(fx, input, { closeStdout = false } = {}) {
    return new Promise(resolve => {
        const child = spawn(process.execPath, [HOOK], { cwd: fx.project, env: fx.env(), stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
        let stdout = '';
        let stderr = '';
        const timer = setTimeout(() => child.kill('SIGKILL'), SPAWN_TIMEOUT_MS);
        if (closeStdout) child.stdout.destroy();
        else child.stdout.on('data', chunk => { stdout += chunk; });
        child.stderr.on('data', chunk => { stderr += chunk; });
        child.on('close', code => {
            clearTimeout(timer);
            const parsed = stdout ? JSON.parse(stdout).hookSpecificOutput : null;
            resolve({ code, stdout, stderr, event: parsed && parsed.hookEventName, text: parsed ? parsed.additionalContext : '' });
        });
        child.stdin.on('error', () => {});
        child.stdin.end(JSON.stringify(input));
    });
}

const reminderFor = (skill, paths) => `Before executing skill ${skill}: read these project overlay files: ${paths.join(', ')}.\n${ADDITIVE}`;

function assertSilent(result, label) {
    assert.equal(result.code, 0, `${label}: exit code (stderr: ${result.stderr})`);
    assert.equal(result.stdout, '', `${label}: expected no output`);
}

// ── tests ───────────────────────────────────────────────────────────────────

const tests = [
    {
        name: 'TC-PDL-100 a project with no registry, an empty one or no matching row gets no output and no record',
        fn: () => withFixture(async fx => {
            // Given no registry at all
            assertSilent(await run(fx, skillUse(fx, 'plan')), 'no registry');
            // And a registry holding only the sentinel row
            fx.write('docs/project-reference/skill-protocols-reference.md', `# Skill protocols\n\n${HEADER}\n| _(none yet)_ | _(none yet)_ | _(none yet)_ | | | |\n`);
            assertSilent(await run(fx, skillUse(fx, 'plan')), 'sentinel-only registry');
            // And a registry whose rows match another skill
            fx.registry([{ target: 'commit', scope: 'exact', name: 'commit-rules' }]);
            assertSilent(await run(fx, skillUse(fx, 'plan')), 'no matching row');
            // Then nothing was recorded
            assert.equal(fs.existsSync(fx.store), false, 'nothing written');
        })
    },
    {
        name: 'TC-PDL-101 an exact, a glob and a * row each emit the reminder naming the overlay file',
        fn: () => withFixture(async fx => {
            // Given one registry per tier
            const cases = [
                ['exact', [{ target: 'plan', scope: 'exact', name: 'plan-rules' }], 'plan', ['docs/project-protocols/plan-rules.md']],
                ['glob', [{ target: '*-review', scope: 'glob', name: 'review-rules' }], 'code-review', ['docs/project-protocols/review-rules.md']],
                ['all', [{ target: '*', scope: 'all', name: 'house-style' }], 'anything', ['docs/project-protocols/house-style.md']]
            ];
            for (const [label, rows, skill, paths] of cases) {
                fx.registry(rows);
                // When the skill activates
                const result = await run(fx, skillUse(fx, skill, { session_id: `s-${label}` }));
                // Then the reminder names the file and restates the additive-only carve-out
                assert.equal(result.code, 0, `${label}: ${result.stderr}`);
                assert.equal(result.text, reminderFor(skill, paths), `${label}: reminder text`);
                assert.equal(result.text.split('\n').length <= 3, true, `${label}: at most three lines`);
                assert.equal(result.event, 'PostToolUse');
            }
        })
    },
    {
        name: 'TC-PDL-102 the most specific tier wins outright: exact over glob over *',
        fn: () => withFixture(async fx => {
            // Given rows in all three tiers that match one skill
            fx.registry([
                { target: '*', scope: 'all', name: 'house-style' },
                { target: 'plan-*', scope: 'glob', name: 'plan-family' },
                { target: 'plan-design', scope: 'exact', name: 'design-rules' },
                { target: 'plan-design', scope: 'exact', name: 'design-extra' }
            ]);
            // When the exact-matching skill activates, then only its exact rows are named, in registry order
            assert.equal((await run(fx, skillUse(fx, 'plan-design', { session_id: 'a' }))).text,
                reminderFor('plan-design', ['docs/project-protocols/design-rules.md', 'docs/project-protocols/design-extra.md']));
            // When only the glob matches, the glob row alone; when neither, the * row alone
            assert.equal((await run(fx, skillUse(fx, 'plan-other', { session_id: 'b' }))).text, reminderFor('plan-other', ['docs/project-protocols/plan-family.md']));
            assert.equal((await run(fx, skillUse(fx, 'commit', { session_id: 'c' }))).text, reminderFor('commit', ['docs/project-protocols/house-style.md']));
        })
    },
    {
        name: 'TC-PDL-103 every skill-activation event path emits: skill tool, SKILL.md read, typed command, second-host prompt',
        fn: () => withFixture(async fx => {
            fx.registry([{ target: 'plan', scope: 'exact', name: 'plan-rules' }]);
            const expected = reminderFor('plan', ['docs/project-protocols/plan-rules.md']);
            const events = [
                ['skill tool (name field of the third host)', { hook_event_name: 'PostToolUse', tool_name: 'Skill', tool_input: { name: 'plan' }, cwd: fx.project }, 'PostToolUse'],
                ['SKILL.md read', { hook_event_name: 'PostToolUse', tool_name: 'Read', tool_input: { file_path: fx.abs('.claude/skills/plan/SKILL.md') }, cwd: fx.project }, 'PostToolUse'],
                ['Windows separators in a second-host relative read', { hook_event_name: 'PostToolUse', tool_name: 'Read', tool_input: { file_path: '.agents\\skills\\plan\\SKILL.md' }, turn_id: 't1', cwd: fx.project }, 'PostToolUse'],
                ['typed command', { hook_event_name: 'UserPromptExpansion', command_name: '/plan', cwd: fx.project }, 'UserPromptExpansion'],
                ['second-host shell read', { hook_event_name: 'PostToolUse', tool_name: 'Bash', tool_input: { command: 'Get-Content -Raw .agents/skills/plan/SKILL.md' }, turn_id: 't1', cwd: fx.project }, 'PostToolUse'],
                ['second-host prompt', { hook_event_name: 'UserPromptSubmit', prompt: 'please run $plan now', turn_id: 't1', cwd: fx.project }, 'UserPromptSubmit']
            ];
            for (const [label, input, event] of events) {
                // When each event arrives (no session id: delivered and never recorded)
                const result = await run(fx, input);
                // Then the reminder arrives, answering the event it came on
                assert.equal(result.code, 0, `${label}: ${result.stderr}`);
                assert.equal(result.text, expected, `${label}: text`);
                assert.equal(result.event, event, `${label}: event name`);
            }
            // And a read of an ordinary file, and a prompt with no skill, end quietly
            assertSilent(await run(fx, { hook_event_name: 'PostToolUse', tool_name: 'Read', tool_input: { file_path: fx.abs('README.md') }, cwd: fx.project }), 'ordinary read');
            assertSilent(await run(fx, { hook_event_name: 'UserPromptSubmit', prompt: 'explain the build', cwd: fx.project }), 'prompt with no skill');
            assertSilent(await run(fx, { hook_event_name: 'SessionStart', source: 'startup', cwd: fx.project }), 'other event');
        })
    },
    {
        name: 'TC-PDL-104 the reminder is deduplicated per skill and repeats only after 150,000 tokens of growth',
        fn: () => withFixture(async fx => {
            fx.registry([{ target: '*', scope: 'all', name: 'house-style' }]);
            // Given a reminder delivered for one skill
            assert.ok((await run(fx, skillUse(fx, 'plan'))).text.startsWith('Before executing skill plan'));
            const start = fs.statSync(fx.transcript).size;
            // When the same skill activates again, or via another path
            assertSilent(await run(fx, skillUse(fx, 'plan')), 'same skill again');
            assertSilent(await run(fx, { hook_event_name: 'UserPromptExpansion', command_name: 'plan', session_id: 's1', transcript_path: fx.transcript, cwd: fx.project }), 'same skill typed');
            // Then nothing is printed, while another skill is still reminded (one record per skill)
            assert.ok((await run(fx, skillUse(fx, 'commit'))).text.startsWith('Before executing skill commit'));
            assert.deepEqual(fx.records(), ['skill-overlay-commit.json', 'skill-overlay-plan.json']);
            // And the distance is one byte under 150,000 tokens x the measured bytes per token: still silent; at it: reminded again
            assert.equal(hook.OVERLAY_REINJECT_TOKENS, 150000);
            fx.append(`${'y'.repeat(DISTANCE - (fs.statSync(fx.transcript).size - start) - 2)}\n`);
            assert.equal(fs.statSync(fx.transcript).size - start, DISTANCE - 1);
            assertSilent(await run(fx, skillUse(fx, 'plan')), 'one byte under the window');
            fx.append('z');
            assert.ok((await run(fx, skillUse(fx, 'plan'))).text.startsWith('Before executing skill plan'), 'reminded at the window');
            // And a compaction re-arms the skill too
            assertSilent(await run(fx, skillUse(fx, 'plan')), 'right after');
            fx.append(`${JSON.stringify({ type: 'system', subtype: 'compact_boundary', timestamp: new Date(Date.now() + 5).toISOString() })}\n`);
            assert.ok((await run(fx, skillUse(fx, 'plan'))).text.startsWith('Before executing skill plan'), 'reminded after a compaction');
            // And a changed overlay set is a new reminder
            fx.registry([{ target: '*', scope: 'all', name: 'house-style' }, { target: '*', scope: 'all', name: 'second-rule' }]);
            assert.ok((await run(fx, skillUse(fx, 'plan'))).text.includes('second-rule.md'), 'a changed overlay set is reminded at once');

            // Given a fresh scope and either kind of real output failure, no conversation growth
            // occurs before retry. The hook owns the reminder output, not the writer's success.
            const deps = { projectRoot: fx.project, config: {}, now: 1000 };
            for (const fault of ['callback', 'throw']) {
                const input = skillUse(fx, 'plan', { session_id: `failed-${fault}` });
                const failed = await hook.run(input, {
                    ...deps,
                    write: (_text, done) => {
                        if (fault === 'throw') throw new Error('fixture output failure');
                        done(false);
                    }
                });
                assert.equal(failed, '', `${fault}: failed output`);
                // When the next activation can write, then the missing reminder arrives;
                // only that successful output makes a further activation silent.
                const retried = await hook.run(input, { ...deps, now: 1001, write: (_text, done) => done(true) });
                assert.ok(retried, `${fault}: failed delivery must not suppress immediate retry`);
                assert.ok(JSON.parse(retried).hookSpecificOutput.additionalContext.startsWith('Before executing skill plan'), `${fault}: immediate retry`);
                let repeatedWrites = 0;
                const repeated = await hook.run(input, { ...deps, now: 1002, write: (_text, done) => { repeatedWrites++; done(true); } });
                assert.equal(repeated, '', 'successful reminder stays silent');
                assert.equal(repeatedWrites, 0, 'successful reminder does not write again');
            }

            // The default transport releases its listener after success, throw, or emitted failure.
            // Fault injection controls the transport only; resolution and ledger acknowledgment stay real.
            const originalWrite = process.stdout.write;
            const errorListeners = process.stdout.listenerCount('error');
            try {
                for (const fault of ['success', 'throw', 'callback']) {
                    const input = skillUse(fx, 'plan', { session_id: `default-${fault}` });
                    process.stdout.write = (_text, callback) => {
                        if (fault === 'throw') throw new Error('fixture synchronous stdout failure');
                        const error = fault === 'callback' ? new Error('fixture asynchronous stdout failure') : null;
                        callback(error);
                        if (error) process.stdout.emit('error', error);
                        return true;
                    };
                    const output = await hook.run(input, deps);
                    assert.equal(process.stdout.listenerCount('error'), errorListeners, `${fault}: listener released`);
                    assert.equal(Boolean(output), fault === 'success', `${fault}: output acknowledgment`);
                    assert.deepEqual(fx.records(`default-${fault}`), fault === 'success' ? ['skill-overlay-plan.json'] : [], `${fault}: only success recorded`);
                    if (fault !== 'success') {
                        assert.ok(await hook.run(input, { ...deps, write: (_text, done) => done(true) }), `${fault}: retry eligible`);
                    }
                }
            } finally {
                process.stdout.write = originalWrite;
            }

            // Given: a real host pipe closes before a batch can deliver (BR-PDL-19 failure retry).
            const closedBatch = { hook_event_name: 'UserPromptSubmit', prompt: '$plan $commit', session_id: 'closed-pipe', transcript_path: fx.transcript, cwd: fx.project };
            // When: the native entrypoint writes into the closed reader.
            const closed = await run(fx, closedBatch, { closeStdout: true });
            // Then: silent successful exit, no false delivery records, and both skills retry immediately.
            assertSilent(closed, 'closed output reader');
            assert.equal(closed.stderr, '', 'closed output reader never emits an error stack');
            assert.deepEqual(fx.records('closed-pipe'), [], 'failed batch records neither skill');
            const healthy = await run(fx, closedBatch);
            assert.equal(healthy.code, 0);
            assert.equal(healthy.stderr, '');
            assert.ok(healthy.text.includes('Before executing skill plan'));
            assert.ok(healthy.text.includes('Before executing skill commit'));
            assert.deepEqual(fx.records('closed-pipe'), ['skill-overlay-commit.json', 'skill-overlay-plan.json']);
            assertSilent(await run(fx, closedBatch), 'healthy delivery starts suppression');

            // Given: ten overlays, of which only the first eight fit in the displayed path list.
            const overflowRows = Array.from({ length: 10 }, (_, i) => ({ target: 'plan', scope: 'exact', name: `overflow-${i}` }));
            fx.registry(overflowRows);
            const overflowInput = skillUse(fx, 'plan', { session_id: 'overflow-change' });
            const before = await run(fx, overflowInput);
            assert.ok(before.text.includes('(+2 more in the overlay registry)'));
            assertSilent(await run(fx, overflowInput), 'unchanged complete set stays suppressed');
            // When: a file outside the displayed eight is replaced without changing the overflow count.
            overflowRows[9] = { ...overflowRows[9], name: 'overflow-replaced' };
            fx.registry(overflowRows);
            // Then: the changed full set re-arms once even though the short reminder text is identical.
            const changed = await run(fx, overflowInput);
            assert.equal(changed.text, before.text, 'the displayed eight paths and overflow count are unchanged');
            assert.ok(changed.text, 'a change to any matched overlay re-arms BR-PDL-19');
            assertSilent(await run(fx, overflowInput), 'the newly delivered complete set is suppressed');
            fx.registry([{ target: '*', scope: 'all', name: 'house-style' }, { target: '*', scope: 'all', name: 'second-rule' }]);

            // Given a prompt naming several skills, the first successful batch is one JSON message.
            const batch = { hook_event_name: 'UserPromptSubmit', prompt: '$plan $commit', session_id: 'batch', transcript_path: fx.transcript, cwd: fx.project };
            let writes = 0;
            const firstBatch = await hook.run(batch, { ...deps, write: (_text, done) => { writes++; done(true); } });
            const firstText = JSON.parse(firstBatch).hookSpecificOutput.additionalContext;
            assert.equal(writes, 1, 'one output for both skills');
            assert.ok(firstText.includes('Before executing skill plan'));
            assert.ok(firstText.includes('Before executing skill commit'));
            // When an already-delivered skill and a new skill share a failed batch, then
            // retry delivers only the new skill, preserving independent suppression.
            const mixed = { ...batch, prompt: '$plan $test' };
            assert.equal(await hook.run(mixed, { ...deps, now: 1001, write: (_text, done) => done(false) }), '');
            writes = 0;
            const retriedBatch = await hook.run(mixed, { ...deps, now: 1002, write: (_text, done) => { writes++; done(true); } });
            assert.equal(writes, 1);
            assert.equal(JSON.parse(retriedBatch).hookSpecificOutput.additionalContext, reminderFor('test', ['docs/project-protocols/house-style.md', 'docs/project-protocols/second-rule.md']));
        })
    },
    {
        name: 'TC-PDL-105 a malformed registry, an unsafe name or header, a missing body and an unusable configuration emit nothing and never fail',
        fn: () => withFixture(async fx => {
            // Given a malformed table, a traversal Name, a scope that contradicts its target, and a missing body
            fx.write('docs/project-reference/skill-protocols-reference.md', [
                '# Skill protocols', '', HEADER,
                '| plan | exact | ../../canary/stolen | bad | 2026-01-01 | [x](../../canary/stolen.md) |',
                '| plan | glob | sneaky | wrong scope for the target | 2026-01-01 | [x](x.md) |',
                '| plan | exact | ghost | body is missing | 2026-01-01 | [x](x.md) |',
                '| plan | exact | too | few | cells |',
                ''
            ].join('\n'));
            fx.write('canary/stolen.md', 'must never be named');
            assertSilent(await run(fx, skillUse(fx, 'plan')), 'malformed rows');
            // And an unsafe protocols directory header refuses every body
            fx.registry([{ target: 'plan', scope: 'exact', name: 'plan-rules' }], { header: '**Protocols directory:** `../outside`\n\n' });
            assertSilent(await run(fx, skillUse(fx, 'plan')), 'unsafe protocols directory');
            // And an unsafe configured registry filename is rejected unread
            fx.registry([{ target: 'plan', scope: 'exact', name: 'plan-rules' }]);
            fx.write('docs/project-config.json', JSON.stringify({ project: { name: 'fixture' }, referenceDocs: [{ filename: '../outside/skill-protocols-reference.md', purpose: 'unsafe' }] }));
            assertSilent(await run(fx, skillUse(fx, 'plan')), 'unsafe registry filename');
            // And an unparseable configuration reads no overlay at all
            fx.write('docs/project-config.json', '{ not json');
            assertSilent(await run(fx, skillUse(fx, 'plan')), 'unparseable configuration');
            assert.equal(fs.existsSync(fx.store), false, 'nothing written');
            // Boundary: with valid configuration the same registry and body emit (the silence above was not vacuous)
            fs.rmSync(fx.abs('docs/project-config.json'));
            assert.equal((await run(fx, skillUse(fx, 'plan'))).text, reminderFor('plan', ['docs/project-protocols/plan-rules.md']));
        })
    },
    {
        name: 'TC-PDL-106 a relocated registry and a header-selected body directory are honored, and the Body link is never a read path',
        fn: () => withFixture(async fx => {
            // Given docsRoots relocating the reference root, a configured registry filename and a header naming the body directory
            fx.write('docs/project-config.json', JSON.stringify({
                project: { name: 'fixture' },
                docsRoots: { projectReference: { path: 'ref-docs' } },
                referenceDocs: [{ filename: 'registries/skill-protocols-reference.md', purpose: 'Skill protocol registry.' }]
            }));
            fx.write('ref-docs/registries/skill-protocols-reference.md', `# Skill protocols\n\n**Protocols directory:** \`rules/overlays\`\n\n${HEADER}\n${row({ target: 'plan', scope: 'exact', name: 'plan-rules' })}\n`);
            fx.write('rules/overlays/plan-rules.md', '# plan rules\n');
            // When the skill activates
            const result = await run(fx, skillUse(fx, 'plan'));
            // Then the derived path under the header directory is named, not the Body link's target
            assert.equal(result.text, reminderFor('plan', ['rules/overlays/plan-rules.md']));
        })
    },
    {
        name: 'TC-PDL-107 the reminder names at most eight files and counts the rest',
        fn: () => withFixture(async fx => {
            // Given ten exact rows for one skill
            const rows = Array.from({ length: 10 }, (_, i) => ({ target: 'plan', scope: 'exact', name: `rule-${i}` }));
            fx.registry(rows);
            // When the skill activates
            const result = await run(fx, skillUse(fx, 'plan'));
            // Then eight paths are named and the other two are counted
            const named = result.text.match(/docs\/project-protocols\/rule-\d\.md/g) || [];
            assert.equal(named.length, overlayLib.MAX_REMINDER_PATHS);
            assert.equal(overlayLib.MAX_REMINDER_PATHS, 8);
            assert.ok(result.text.includes('(+2 more in the overlay registry)'), result.text);
            assert.ok(result.text.endsWith(ADDITIVE));
            const resolved = overlayLib.resolveOverlayReminder('plan', fx.project, {});
            assert.deepEqual(resolved.files, rows.map(item => `docs/project-protocols/${item.name}.md`));
            assert.equal(resolved.text, result.text, 'metadata and text describe the same matched set');
            assert.equal(overlayLib.buildOverlayReminder('plan', fx.project, {}), result.text, 'the string API is preserved');
        })
    },
    {
        name: 'TC-PDL-108 an unusable record store still reminds and a session with no id reminds every time',
        fn: () => withFixture(async fx => {
            fx.registry([{ target: '*', scope: 'all', name: 'house-style' }]);
            // Given a regular file where the record store folder should be
            fs.mkdirSync(path.dirname(fx.store), { recursive: true });
            fs.writeFileSync(fx.store, 'not a folder');
            // When the skill activates twice
            // Then both deliver (a duplicate is accepted over silence) and the store is untouched
            assert.ok((await run(fx, skillUse(fx, 'plan'))).text.startsWith('Before executing skill plan'), 'broken store, first');
            assert.ok((await run(fx, skillUse(fx, 'plan'))).text.startsWith('Before executing skill plan'), 'broken store, second');
            assert.ok(fs.statSync(fx.store).isFile());
            fs.rmSync(fx.store);
            // And with no session id nothing is recorded
            assert.ok((await run(fx, skillUse(fx, 'plan', { session_id: undefined }))).text.startsWith('Before executing skill plan'));
            assert.equal(fs.existsSync(fx.store), false);
        })
    },
    {
        name: 'TC-PDL-109 the lib resolves overlay files without reading a body and stays silent on hostile input',
        fn: () => withFixture(async fx => {
            const lib = require(path.join(HOOKS_DIR, 'lib', 'skill-protocol-overlay.cjs'));
            fx.registry([{ target: 'plan', scope: 'exact', name: 'plan-rules' }]);
            // Given a registry row and an existing body
            assert.deepEqual(lib.resolveOverlayFiles('plan', fx.project, {}), ['docs/project-protocols/plan-rules.md']);
            const originalRead = fs.readFileSync;
            const registry = fx.abs('docs/project-reference/skill-protocols-reference.md');
            const body = fx.abs('docs/project-protocols/plan-rules.md');
            let registryReads = 0;
            let bodyReads = 0;
            try {
                fs.readFileSync = (file, ...args) => {
                    if (file === registry) registryReads++;
                    if (file === body) {
                        bodyReads++;
                        throw new Error('overlay bodies belong to the assistant, never the reminder');
                    }
                    return originalRead(file, ...args);
                };
                assert.deepEqual(lib.resolveOverlayReminder('plan', fx.project, {}), {
                    files: ['docs/project-protocols/plan-rules.md'],
                    text: reminderFor('plan', ['docs/project-protocols/plan-rules.md'])
                });
                assert.equal(registryReads, 1, 'text and identity use one registry snapshot');
                assert.equal(bodyReads, 0, 'the metadata resolver never reads overlay bodies');
            } finally {
                fs.readFileSync = originalRead;
            }
            // Then a skill name that is not a bare slug resolves nothing, without reading
            for (const name of ['../plan', 'Plan', 'a b', '', null, undefined, 42]) assert.deepEqual(lib.resolveOverlayFiles(name, fx.project, {}), [], String(name));
            // And a null configuration (declared but unusable) and a missing project read nothing
            assert.deepEqual(lib.resolveOverlayFiles('plan', fx.project, null), []);
            assert.deepEqual(lib.resolveOverlayFiles('plan', path.join(fx.temp, 'no-such-project'), {}), []);
            assert.equal(lib.buildOverlayReminder('plan', fx.project, null), '');
            assert.deepEqual(lib.resolveOverlayReminder('plan', fx.project, null), { files: [], text: '' });
            // And a pathological glob cannot wedge the resolver (a linear matcher)
            const pattern = `${'a*'.repeat(40)}b`;
            fx.write('docs/project-reference/skill-protocols-reference.md', `# Skill protocols\n\n${HEADER}\n${row({ target: pattern, scope: 'glob', name: 'evil' })}\n`);
            fx.write('docs/project-protocols/evil.md', 'x');
            const started = Date.now();
            assert.deepEqual(lib.resolveOverlayFiles('a'.repeat(60), fx.project, {}), []);
            assert.ok(Date.now() - started < 2000, 'a pathological glob took too long');
        })
    }
];

module.exports = { name: 'skill-overlay-remind', tests };
