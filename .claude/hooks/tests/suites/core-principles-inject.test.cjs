'use strict';

/**
 * Core engineering principles reminder (hooks/core-principles-inject.cjs) — guarded contracts:
 *   deliver    the first prompt or task-step event of a session scope delivers the canonical
 *              `SYNC:core-engineering-principles` body (Easy to change · scale · maintain);
 *   dedup      a repeat event stays silent until the transcript grows by `reinjectAfterTokens`
 *              × BYTES_PER_TOKEN, then delivers again (the "about every 150k tokens" promise);
 *   scope      each sub-agent scope gets its own delivery (a sub-agent starts without it);
 *   fallback   the built-in reminder equals the canonical `:reminder` body, and the config schema's
 *              interval range equals the hook's accepted range;
 *   content    a changed principle text re-delivers at once;
 *   format     prompt → plain text; task step → PostToolUse additionalContext, never a decision;
 *   off        `enabled: false` or CK_CORE_PRINCIPLES_INJECT=0 prints and records nothing;
 *   intent     the shipped canonical body and root carrier name all three pillars (framework repo only);
 *   wiring     registered on UserPromptSubmit and the task-step PostToolUse matcher (framework repo only).
 * Fixtures are temp projects removed in `finally`; the child process gets HOME/USERPROFILE/TMPDIR/
 * TEMP/TMP pointed at the fixture and every inherited CK_* key blanked.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const HOOKS_DIR = path.resolve(__dirname, '../..');
const REPO_ROOT = path.resolve(HOOKS_DIR, '..', '..');
const HOOK = path.join(HOOKS_DIR, 'core-principles-inject.cjs');
const hook = require(HOOK);
const { BYTES_PER_TOKEN } = require(path.join(HOOKS_DIR, 'lib', 'file-conventions.cjs'));
const { runHook } = require(path.join(HOOKS_DIR, 'tests', 'lib', 'hook-runner.cjs'));
const { isFrameworkRepo } = require(path.join(HOOKS_DIR, 'tests', 'lib', 'framework-repo-guard.cjs'));

const IS_FRAMEWORK_REPO = isFrameworkRepo(REPO_ROOT);
const SESSION = 'session-1';
const STEP_MATCHER = 'TodoWrite|TaskCreate|TaskUpdate|update_plan';
const CANONICAL_REL = ['.claude', 'skills', 'shared', 'sync-inline-versions.md'];
const PILLARS = [/Easy to change/i, /Easy to scale/i, /Easy to maintain/i];
// A small fixture canonical file: the hook must source its body from here, not from a built-in.
const FIXTURE_BODY = '> **Core Engineering Principles — fixture body** Easy to change · Easy to scale · Easy to maintain.';
const FIXTURE_CANONICAL = `# Shared\n\n## SYNC:core-engineering-principles\n\n${FIXTURE_BODY}\n\n---\n`;

async function withFixture(fn, { canonical = FIXTURE_CANONICAL } = {}) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'core-principles-test-'));
    const project = path.join(root, 'project');
    const transcripts = path.join(root, 'transcripts');
    fs.mkdirSync(path.join(project, ...CANONICAL_REL.slice(0, -1)), { recursive: true });
    fs.mkdirSync(transcripts, { recursive: true });
    if (canonical !== null) fs.writeFileSync(path.join(project, ...CANONICAL_REL), canonical);
    const fx = {
        root,
        project,
        main: path.join(transcripts, `${SESSION}.jsonl`),
        storeRoot: path.join(project, 'tmp', 'protocol-delivery'),
        sub(id) {
            const dir = path.join(transcripts, SESSION, 'subagents');
            fs.mkdirSync(dir, { recursive: true });
            const file = path.join(dir, `agent-${id}.jsonl`);
            fs.writeFileSync(file, '');
            return file;
        }
    };
    fs.writeFileSync(fx.main, '');
    try {
        return await fn(fx);
    } finally {
        fs.rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    }
}

function promptEvent(fx, extra = {}) {
    return { hook_event_name: 'UserPromptSubmit', session_id: SESSION, transcript_path: fx.main, cwd: fx.project, prompt: 'implement it', ...extra };
}

function stepEvent(fx, toolName = 'TaskUpdate', extra = {}) {
    return { hook_event_name: 'PostToolUse', session_id: SESSION, transcript_path: fx.main, cwd: fx.project, tool_name: toolName, tool_input: { taskId: '1', status: 'in_progress' }, ...extra };
}

/** In-process run: project fixed, settings injected, output captured. */
function fire(fx, event, extra = {}) {
    return hook.run(event, { env: {}, projectDir: fx.project, rawSettings: {}, write: (text, done) => done(true), ...extra });
}

/** Grow a transcript by `tokens` worth of bytes. */
function grow(file, tokens) {
    fs.appendFileSync(file, 'x'.repeat(tokens * BYTES_PER_TOKEN));
}

function isolatedEnv(fx) {
    const env = { HOME: fx.root, USERPROFILE: fx.root, TMPDIR: fx.root, TEMP: fx.root, TMP: fx.root };
    for (const key of Object.keys(process.env)) {
        if (/^CK_/i.test(key) || /(?:API_KEY|TOKEN|SECRET|PASSWORD)/i.test(key)) env[key] = '';
    }
    return env;
}

/** Close the host's read side before releasing input, so the hook's real stdout write fails. */
function closedOutput(fx, input) {
    return new Promise((resolve, reject) => {
        const child = spawn(process.execPath, [HOOK], {
            cwd: fx.project,
            env: { ...process.env, ...isolatedEnv(fx), CLAUDE_PROJECT_DIR: fx.project },
            stdio: ['pipe', 'pipe', 'pipe']
        });
        let stderr = '';
        const timer = setTimeout(() => child.kill('SIGKILL'), 20000);
        child.stderr.on('data', data => { stderr += data.toString(); });
        child.stdin.on('error', () => {});
        child.on('error', error => { clearTimeout(timer); reject(error); });
        child.on('close', code => { clearTimeout(timer); resolve({ code, stderr }); });
        child.stdout.destroy();
        child.stdin.end(JSON.stringify(input));
    });
}

const delivery = require(path.join(HOOKS_DIR, 'lib', 'protocol-delivery.cjs'));
const PROJECTION_MARK = '[[PROJECTED:core-engineering-principles]]';
const PROTOCOLS_REL = '.claude/skills/shared/protocols';

/** Publish the principles as a design-group protocol and a converted skill that declares them. */
function installProjection(fx) {
    const write = (rel, text) => {
        const file = path.join(fx.project, ...rel.split('/'));
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, text);
    };
    const file = `${PROTOCOLS_REL}/core-engineering-principles.md`;
    write(file, `> **core principles** fixture ${PROJECTION_MARK}\n`);
    write(`${PROTOCOLS_REL}/index.json`, JSON.stringify({
        binChars: 9500,
        groups: ['design'],
        tags: [{ tag: 'core-engineering-principles', group: 'design', summary: 'Fixture summary', when: 'when it applies', file, parts: [{ file }] }]
    }));
    write('.claude/skills/shared/protocol-groups.json', JSON.stringify({ version: 1, groups: { design: { tags: {} } }, inlineSkills: [] }));
    write('.claude/skills/conv/SKILL.md', [
        '---', 'name: conv', 'description: fixture', '---', '',
        '<!-- PROTOCOL-GUIDES:START -->',
        `- \`core-engineering-principles\` — Fixture summary; when it applies → ${file}`,
        '<!-- PROTOCOL-GUIDES:END -->', ''
    ].join('\n'));
}

const skillLoadEvent = fx => ({ hook_event_name: 'PostToolUse', tool_name: 'Skill', tool_input: { skill: 'conv' }, session_id: SESSION, transcript_path: fx.main, cwd: fx.project });

function extractSection(text, heading) {
    const start = text.indexOf(`## SYNC:${heading}\n`);
    if (start < 0) return null;
    const end = text.indexOf('\n---', start);
    return text.slice(start, end < 0 ? undefined : end);
}

const tests = [
    {
        name: '[core-principles] TC-CEP-020 a closed host output pipe never blocks and leaves delivery retryable for both envelopes',
        fn: () => withFixture(async fx => {
            for (const event of [promptEvent(fx), ...['TodoWrite', 'TaskCreate', 'TaskUpdate', 'update_plan'].map(tool => stepEvent(fx, tool))]) {
                // Given a fresh scope and a host that closes its output reader before this delivery
                event.session_id = `closed-${event.tool_name || event.hook_event_name}`;
                // When the real hook process tries to write the prompt or task-step envelope
                const failed = await closedOutput(fx, event);
                // Then an advisory output failure stays silent and exits successfully
                assert.equal(failed.code, 0, failed.stderr);
                assert.equal(failed.stderr, '', 'no unhandled stream error');
                // And the next healthy event still delivers: the failed write earned no credit
                const options = { cwd: fx.project, env: isolatedEnv(fx), timeout: 20000 };
                const retry = await runHook(HOOK, event, options);
                assert.equal(retry.code, 0, retry.stderr);
                assert.ok(retry.stdout.includes(hook.MARKER_START), 'retry delivers');
                assert.equal((await runHook(HOOK, event, options)).stdout, '', 'successful retry then deduplicates');
            }
        })
    },
    {
        name: '[core-principles] TC-CEP-021 writer success and synchronous failure release their temporary stream listener',
        fn: () => withFixture(async fx => {
            // Given an imported hook and the real stdout stream with an isolated write seam
            const originalWrite = process.stdout.write;
            const listeners = process.stdout.listenerCount('error');
            try {
                // When stdout acknowledges success synchronously
                process.stdout.write = (_text, done) => { done(null); return true; };
                const written = await hook.run(promptEvent(fx), { env: {}, projectDir: fx.project, rawSettings: {} });
                // Then the delivery succeeds and its temporary error listener is released
                assert.ok(written.includes(hook.MARKER_START));
                assert.equal(process.stdout.listenerCount('error'), listeners);
                // When a distinct scope throws synchronously while writing
                process.stdout.write = () => { throw new Error('fixture write failed'); };
                assert.equal(await hook.run(promptEvent(fx, { session_id: 'throw-output' }), { env: {}, projectDir: fx.project, rawSettings: {} }), '');
                // Then it remains retryable and releases the listener as well
                assert.equal(process.stdout.listenerCount('error'), listeners);
                process.stdout.write = (_text, done) => { done(null); return true; };
                assert.ok(await hook.run(promptEvent(fx, { session_id: 'throw-output' }), { env: {}, projectDir: fx.project, rawSettings: {} }));
            } finally {
                process.stdout.write = originalWrite;
            }
        })
    },
    {
        name: '[core-principles] TC-CEP-001 first prompt of a session delivers the canonical body, via the real process',
        fn: () => withFixture(async fx => {
            // Given a fresh session and a project whose canonical file holds the principle
            // When a prompt is submitted through the real hook process
            const result = await runHook(HOOK, promptEvent(fx), { cwd: fx.project, env: isolatedEnv(fx), timeout: 20000 });
            // Then exit 0 with the marker-wrapped body sourced from the canonical file
            assert.equal(result.code, 0, result.stderr);
            assert.ok(result.stdout.includes(hook.MARKER_START) && result.stdout.includes(hook.MARKER_END), 'marker-wrapped');
            assert.ok(result.stdout.includes('fixture body'), 'body comes from the project canonical file, not a built-in copy');
            for (const pillar of PILLARS) assert.match(result.stdout, pillar);
        })
    },
    {
        name: '[core-principles] TC-CEP-002 a repeat stays silent until the transcript grows by the token window, then delivers again',
        fn: () => withFixture(async fx => {
            const settings = { reinjectAfterTokens: 20000 };
            // Given a delivered session
            assert.ok(await fire(fx, promptEvent(fx), { rawSettings: settings }), 'first delivery');
            // When the transcript grows by less than the window
            grow(fx.main, 19000);
            // Then the next prompt and task step stay silent
            assert.equal(await fire(fx, promptEvent(fx), { rawSettings: settings }), '', 'under the window: silent');
            assert.equal(await fire(fx, stepEvent(fx), { rawSettings: settings }), '', 'a step event shares the same ledger record');
            // When it grows past the window since the last delivery
            grow(fx.main, 2000);
            // Then it delivers again, and once only
            assert.ok(await fire(fx, promptEvent(fx), { rawSettings: settings }), 'past the window: re-delivered');
            assert.equal(await fire(fx, promptEvent(fx), { rawSettings: settings }), '', 'then silent again');
        })
    },
    {
        name: '[core-principles] TC-CEP-003 the default window is 150k tokens',
        fn: () => withFixture(async fx => {
            // Given no interval configured and a delivered session
            assert.equal(hook.DEFAULT_REINJECT_TOKENS, 150000);
            assert.ok(await fire(fx, promptEvent(fx)));
            // When the transcript grows by just under 150k tokens / Then silent
            grow(fx.main, 149999);
            assert.equal(await fire(fx, promptEvent(fx)), '');
            // When it reaches 150k / Then delivered
            grow(fx.main, 1);
            assert.ok(await fire(fx, promptEvent(fx)));
        })
    },
    {
        name: '[core-principles] TC-CEP-004 a task step delivers PostToolUse additionalContext; other tools stay silent',
        fn: () => withFixture(async fx => {
            // When an unrelated tool fires / Then silent and nothing is recorded
            assert.equal(await fire(fx, stepEvent(fx, 'Read')), '');
            // When a task step fires first in the session
            const payload = await fire(fx, stepEvent(fx, 'TaskCreate'));
            // Then the output is advisory context only, carrying the body
            const parsed = JSON.parse(payload);
            assert.deepEqual(Object.keys(parsed), ['hookSpecificOutput'], 'no decision field');
            assert.equal(parsed.hookSpecificOutput.hookEventName, 'PostToolUse');
            assert.ok(parsed.hookSpecificOutput.additionalContext.includes('fixture body'));
        })
    },
    {
        name: '[core-principles] TC-CEP-005 each sub-agent scope gets its own delivery',
        fn: () => withFixture(async fx => {
            // Given the main conversation already received it
            assert.ok(await fire(fx, promptEvent(fx)));
            fx.sub('a1');
            // When a sub-agent reaches a task step / Then it is delivered in that scope, once
            assert.ok(await fire(fx, stepEvent(fx, 'TaskUpdate', { agent_id: 'a1' })), 'sub-agent scope delivered');
            assert.equal(await fire(fx, stepEvent(fx, 'TaskUpdate', { agent_id: 'a1' })), '', 'then deduplicated in that scope');
            assert.equal(await fire(fx, promptEvent(fx)), '', 'the main scope is unaffected');
        })
    },
    {
        name: '[core-principles] TC-CEP-006 a changed principle text re-delivers at once',
        fn: () => withFixture(async fx => {
            assert.ok(await fire(fx, promptEvent(fx), { content: 'v1' }));
            assert.equal(await fire(fx, promptEvent(fx), { content: 'v1' }), '');
            assert.ok(await fire(fx, promptEvent(fx), { content: 'v2' }), 'new content bypasses the dedup window');
        })
    },
    {
        name: '[core-principles] TC-CEP-007 switched off by settings or env: prints and records nothing',
        fn: () => withFixture(async fx => {
            assert.equal(await fire(fx, promptEvent(fx), { rawSettings: { enabled: false } }), '');
            assert.equal(await fire(fx, promptEvent(fx), { env: { CK_CORE_PRINCIPLES_INJECT: '0' } }), '');
            assert.equal(fs.existsSync(fx.storeRoot), false, 'no ledger store written while off');
            // And turning it back on delivers (the off runs did not consume the first delivery)
            assert.ok(await fire(fx, promptEvent(fx)));
        })
    },
    {
        name: '[core-principles] TC-CEP-012 the .ck.json switch and the .ck.local.json interval are read from disk, via the real process',
        fn: () => withFixture(async fx => {
            const claudeDir = path.join(fx.project, '.claude');
            const spawn = () => runHook(HOOK, promptEvent(fx), { cwd: fx.project, env: isolatedEnv(fx), timeout: 20000 });
            // Given the team config turns the reminder off
            fs.writeFileSync(path.join(claudeDir, '.ck.json'), JSON.stringify({ corePrinciplesInject: { enabled: false } }));
            // When a prompt is submitted / Then nothing is printed or recorded
            const off = await spawn();
            assert.equal(off.code, 0, off.stderr);
            assert.equal(off.stdout, '', 'team opt-out honored');
            assert.equal(fs.existsSync(fx.storeRoot), false, 'no ledger store while off');
            // Given a developer override turns it back on with a 20k-token window
            fs.writeFileSync(path.join(claudeDir, '.ck.local.json'), JSON.stringify({ corePrinciplesInject: { enabled: true, reinjectAfterTokens: 20000 } }));
            // Then it delivers, stays silent under the configured window and re-delivers past it
            assert.ok((await spawn()).stdout.includes(hook.MARKER_START), 'local override wins');
            grow(fx.main, 19000);
            assert.equal((await spawn()).stdout, '', 'under the configured 20k window: silent');
            grow(fx.main, 2000);
            assert.ok((await spawn()).stdout.includes(hook.MARKER_START), 'past the configured window: re-delivered (not the 150k default)');
        })
    },
    {
        name: '[core-principles] TC-CEP-022 every sub-agent start receives the body as start context, once per spawn',
        fn: () => withFixture(async fx => {
            // Given the main conversation already received it
            assert.ok(await fire(fx, promptEvent(fx)));
            fx.sub('a1');
            const start = id => promptEvent(fx, { hook_event_name: 'SubagentStart', agent_id: id, agent_type: 'Explore', prompt: undefined });
            // When a sub-agent starts / Then the body arrives as SubagentStart context in its own scope
            const parsed = JSON.parse(await fire(fx, start('a1')));
            assert.equal(parsed.hookSpecificOutput.hookEventName, 'SubagentStart');
            assert.ok(parsed.hookSpecificOutput.additionalContext.includes('fixture body'));
            // And a resumed start of the same agent stays silent until that agent's own compaction
            assert.equal(await fire(fx, start('a1')), '', 'same spawn deduplicated');
            fs.appendFileSync(fx.sub('a1'), `${JSON.stringify({ type: 'system', subtype: 'compact_boundary', timestamp: new Date(Date.now() + 1000).toISOString() })}\n`);
            assert.ok(await fire(fx, start('a1'), { now: Date.now() + 2000 }), 'the agent\'s compaction re-arms its next start');
            // And a start that reports no agent id is still its own spawn, never the main scope
            assert.ok(await fire(fx, start(undefined)), 'anonymous spawn delivered');
            assert.equal(await fire(fx, promptEvent(fx)), '', 'the main scope is unaffected');
        })
    },
    {
        name: '[core-principles] TC-CEP-023 a compaction report delivers at once and the prompt after the host boundary stays silent',
        fn: () => withFixture(async fx => {
            const t1 = Date.parse('2026-01-01T00:00:00Z');
            assert.ok(await fire(fx, promptEvent(fx), { now: t1 }));
            // When the host reports a compaction (its boundary line is written after the session-start hooks)
            const compact = promptEvent(fx, { hook_event_name: 'SessionStart', source: 'compact', prompt: undefined });
            const parsed = JSON.parse(await fire(fx, compact, { now: t1 + 1000 }));
            // Then the body arrives at once as SessionStart context, with no prompt needed
            assert.equal(parsed.hookSpecificOutput.hookEventName, 'SessionStart');
            assert.ok(parsed.hookSpecificOutput.additionalContext.includes('fixture body'));
            fs.appendFileSync(fx.main, `${JSON.stringify({ type: 'system', subtype: 'compact_boundary', timestamp: new Date(t1 + 2000).toISOString() })}\n`);
            // And that same compaction's boundary is absorbed: the next prompt stays silent
            assert.equal(await fire(fx, promptEvent(fx), { now: t1 + 3000 }), '', 'one delivery per compaction');
            // And a clear, startup or resume report delivers nothing (the next prompt carries it)
            for (const source of ['clear', 'startup', 'resume']) {
                assert.equal(await fire(fx, promptEvent(fx, { hook_event_name: 'SessionStart', source }), { now: t1 + 4000 }), '', source);
            }
        })
    },
    {
        name: '[core-principles] TC-CEP-013 a compaction re-delivers at once, without transcript growth past the window',
        fn: () => withFixture(async fx => {
            const t1 = Date.parse('2026-01-01T00:00:00Z');
            // Given a delivered session
            assert.ok(await fire(fx, promptEvent(fx), { now: t1 }));
            assert.equal(await fire(fx, promptEvent(fx), { now: t1 + 1000 }), '', 'deduplicated before compaction');
            // When the host records a compaction boundary after the delivery
            fs.appendFileSync(fx.main, `${JSON.stringify({ type: 'system', subtype: 'compact_boundary', timestamp: new Date(t1 + 30000).toISOString() })}\n`);
            // Then the next prompt delivers again even though growth is far below the window
            assert.ok(await fire(fx, promptEvent(fx), { now: t1 + 60000 }), 'compaction re-arms delivery');
            assert.equal(await fire(fx, promptEvent(fx), { now: t1 + 61000 }), '', 'then deduplicated again');
        })
    },
    {
        name: '[core-principles] TC-CEP-014 a host with no transcript gets one delivery: elapsed time alone never re-delivers, a content change does',
        fn: () => withFixture(async fx => {
            // Anchored to real time and kept under the ledger's 7-day retention age, so pruning cannot explain the outcome
            const t0 = Math.floor(Date.now() / 1000) * 1000;
            const blind = extra => promptEvent(fx, { transcript_path: undefined, ...extra });
            // Given a host that exposes no transcript received the reminder
            assert.ok(await fire(fx, blind(), { now: t0 }), 'first delivery');
            // When hours and days pass with no compaction and no content change / Then it stays silent
            for (const later of [60 * 60 * 1000, 3 * 24 * 60 * 60 * 1000]) {
                assert.equal(await fire(fx, blind(), { now: t0 + later }), '', `silent ${later / 60000} min later`);
            }
            assert.equal(await fire(fx, stepEvent(fx, 'TaskUpdate', { transcript_path: undefined }), { now: t0 + 3 * 24 * 60 * 60 * 1000 }), '', 'a step event is silent too');
            // When the principle text changes / Then it delivers again at once
            assert.ok(await fire(fx, blind(), { now: t0 + 3 * 24 * 60 * 60 * 1000, content: 'changed principles' }), 'content change re-delivers');
        })
    },
    {
        name: '[core-principles] TC-CEP-015 a Codex compaction record in the transcript re-delivers without growth past the window',
        fn: () => withFixture(async fx => {
            const t1 = Date.parse('2026-01-01T00:00:00Z');
            // Given a delivered session
            assert.ok(await fire(fx, promptEvent(fx), { now: t1 }));
            // When a nested "compacted" type inside a payload is appended / Then it is not a compaction
            fs.appendFileSync(fx.main, `${JSON.stringify({ timestamp: new Date(t1 + 10000).toISOString(), type: 'event_msg', payload: { type: 'compacted' } })}\n`);
            assert.equal(await fire(fx, promptEvent(fx), { now: t1 + 20000 }), '', 'a nested type is not a compaction');
            // When the second host writes its top-level compaction record after the delivery
            fs.appendFileSync(fx.main, `${JSON.stringify({ timestamp: new Date(t1 + 30000).toISOString(), ordinal: 7, type: 'compacted', payload: { message: '' } })}\n`);
            // Then the next prompt delivers again although growth is far below the window, then deduplicates
            assert.ok(await fire(fx, promptEvent(fx), { now: t1 + 60000 }), 'Codex compaction re-arms delivery');
            assert.equal(await fire(fx, promptEvent(fx), { now: t1 + 61000 }), '', 'then deduplicated again');
        })
    },
    {
        name: '[core-principles] TC-CEP-016 other hook events, non-step tools and a missing or blank session id stay silent and record nothing',
        fn: () => withFixture(async fx => {
            // When the hook sees events it does not serve
            const silent = [
                ['PreToolUse on a step tool', stepEvent(fx, 'TaskUpdate', { hook_event_name: 'PreToolUse' })],
                ['Stop', promptEvent(fx, { hook_event_name: 'Stop' })],
                ['SessionStart', promptEvent(fx, { hook_event_name: 'SessionStart', source: 'startup' })],
                ['PostToolUse on a non-step tool', stepEvent(fx, 'Bash')],
                ['missing session id', promptEvent(fx, { session_id: undefined })],
                ['blank session id', promptEvent(fx, { session_id: '   ' })]
            ];
            // Then each prints nothing and touches no ledger store
            for (const [label, event] of silent) assert.equal(await fire(fx, event), '', label);
            assert.equal(fs.existsSync(fx.storeRoot), false, 'no ledger store written');
            // And the first served event still delivers (the silent ones consumed nothing)
            assert.ok(await fire(fx, promptEvent(fx)), 'first prompt delivers');
        })
    },
    {
        name: '[core-principles] TC-CEP-017 the token window accepts its inclusive bounds 20000 and 2000000; one past either bound falls back',
        fn: () => {
            // Given the framework token-window range / Then each bound is honored as configured
            assert.equal(hook.resolveReinjectTokens({ reinjectAfterTokens: 20000 }), 20000, 'lower bound inclusive');
            assert.equal(hook.resolveReinjectTokens({ reinjectAfterTokens: 2000000 }), 2000000, 'upper bound inclusive');
            // And one token outside either bound falls back to the default
            assert.equal(hook.resolveReinjectTokens({ reinjectAfterTokens: 19999 }), hook.DEFAULT_REINJECT_TOKENS, 'below the range');
            assert.equal(hook.resolveReinjectTokens({ reinjectAfterTokens: 2000001 }), hook.DEFAULT_REINJECT_TOKENS, 'above the range');
        }
    },
    {
        name: '[core-principles] TC-CEP-018 the built-in fallback equals the canonical reminder, and the schema range equals the hook range',
        fn: () => {
            // Given the shipped canonical reminder body
            const canonical = fs.readFileSync(path.join(REPO_ROOT, ...CANONICAL_REL), 'utf8').replace(/\r\n/g, '\n');
            const section = extractSection(canonical, 'core-engineering-principles:reminder');
            assert.ok(section, 'canonical reminder present');
            const reminder = section.slice(section.indexOf('\n')).trim();
            // Then the text used when that file is unreadable is the same rule, word for word
            assert.equal(hook.FALLBACK_BODY, reminder, 'fallback drifted from the canonical reminder');
            // And the .ck.json schema accepts exactly the interval range the hook accepts
            const { CK_SCHEMA } = require(path.join(HOOKS_DIR, 'lib', 'ck-config-schema.cjs'));
            const { CLASS_REINJECT_TOKENS_RANGE } = require(path.join(HOOKS_DIR, 'lib', 'file-conventions.cjs'));
            const field = CK_SCHEMA.corePrinciplesInject.properties.reinjectAfterTokens;
            assert.deepEqual([field.min, field.max], [...CLASS_REINJECT_TOKENS_RANGE], 'schema range drifted from the hook range');
        }
    },
    {
        name: '[core-principles] TC-CEP-008 out-of-range or malformed intervals fall back to the default',
        fn: () => {
            for (const value of [undefined, 0, 19999, 2000001, 1.5, '150000', null]) {
                assert.equal(hook.resolveReinjectTokens({ reinjectAfterTokens: value }), hook.DEFAULT_REINJECT_TOKENS, String(value));
            }
            assert.equal(hook.resolveReinjectTokens({ reinjectAfterTokens: 50000 }), 50000);
        }
    },
    {
        name: '[core-principles] TC-CEP-009 a missing canonical file still delivers the built-in reminder',
        fn: () => withFixture(async fx => {
            const payload = await fire(fx, promptEvent(fx));
            for (const pillar of PILLARS) assert.match(payload, pillar);
        }, { canonical: null })
    },
    {
        name: '[core-principles] TC-CEP-019 a skill load served by the design-group protocol hook and this hook share one delivery record',
        fn: () => withFixture(async fx => {
            // Given a project whose projection publishes the principles and a converted skill that declares them
            installProjection(fx);
            const deliverDesign = () => delivery.runHook('design', { input: skillLoadEvent(fx), projectRoot: fx.project, write: (text, done) => done(true) });
            // When the design-group hook serves the skill load first
            const viaSkill = await deliverDesign();
            assert.ok(viaSkill.includes(PROJECTION_MARK), 'the design-group hook delivers the principles on the skill load');
            // Then the next prompt of the same scope stays silent here (one delivery, not two)
            assert.equal(await fire(fx, promptEvent(fx)), '', 'already delivered by the protocol hook: silent');
            assert.equal(await fire(fx, stepEvent(fx)), '', 'a step event shares the record');
            // And the reverse: a session whose first delivery came from this hook is not served again by the protocol hook
            fs.rmSync(fx.storeRoot, { recursive: true, force: true });
            assert.ok(await fire(fx, promptEvent(fx)), 'first prompt delivers when nothing was delivered');
            assert.equal(await deliverDesign(), '', 'the principles were delivered by this hook: the protocol hook stays silent');
        })
    },
    {
        name: '[core-principles] TC-CEP-010 shipped canonical body and universal carrier name all three pillars (framework repo only)',
        skip: IS_FRAMEWORK_REPO ? false : 'asserts the framework repo\'s own canonical file (framework-repo signal)',
        fn: () => {
            const canonical = fs.readFileSync(path.join(REPO_ROOT, ...CANONICAL_REL), 'utf8').replace(/\r\n/g, '\n');
            const body = extractSection(canonical, 'core-engineering-principles');
            const reminder = extractSection(canonical, 'core-engineering-principles:reminder');
            const universal = extractSection(canonical, 'critical-thinking-mindset');
            for (const [name, text] of [['body', body], ['reminder', reminder], ['universal carrier', universal]]) {
                assert.ok(text, `${name} present`);
                for (const pillar of PILLARS) assert.match(text, pillar, `${name} names ${pillar}`);
            }
            // The body must drive plan, implement and review, not only state the ideal
            for (const phase of [/\*\*Plan\*\*/, /\*\*Implement\*\*/, /\*\*Review\*\*/]) assert.match(body, phase);
        }
    },
    {
        name: '[core-principles] TC-CEP-011 registered on UserPromptSubmit, the task-step PostToolUse matcher, every SubagentStart and SessionStart compact (framework repo only)',
        skip: IS_FRAMEWORK_REPO ? false : 'asserts the framework repo\'s own settings (framework-repo signal)',
        fn: () => {
            const settings = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, '.claude', 'settings.json'), 'utf8'));
            const owns = group => group.hooks.some(h => h.command.includes('core-principles-inject.cjs'));
            const prompt = settings.hooks.UserPromptSubmit.filter(owns);
            const post = settings.hooks.PostToolUse.filter(owns);
            const agent = settings.hooks.SubagentStart.filter(owns);
            const compaction = settings.hooks.SessionStart.filter(owns);
            assert.equal(prompt.length, 1, 'one UserPromptSubmit registration');
            assert.equal(post.length, 1, 'one PostToolUse registration');
            assert.equal(post[0].matcher, STEP_MATCHER);
            assert.equal(agent.length, 1, 'one SubagentStart registration');
            assert.equal(agent[0].matcher, undefined, 'every agent type');
            assert.deepEqual(compaction.map(group => group.matcher), ['compact'], 'one SessionStart registration, compaction only');
        }
    }
];

module.exports = { name: 'core-principles-inject', tests };
