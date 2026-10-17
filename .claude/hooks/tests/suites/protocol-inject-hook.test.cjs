'use strict';

/**
 * Protocol delivery hook entries — spec ContextDelivery/README.ProtocolDelivery.md §8 "Delivery Step
 * Tests" under the business spec root (default `docs/specs`; `specRoots.business.path` in
 * `docs/project-config.json` overrides it).
 *
 * Guards: a protocol is delivered once per session per scope and re-armed by compaction and by
 * 4,500,000 bytes of transcript growth (BR-PDL-02); parallel group entries deliver each protocol once
 * (BR-PDL-02); a broken record store still delivers and only a live peer claim skips (BR-PDL-05);
 * an event that cannot load a skill ends before any project module loads, spawned directly and
 * through the second host's generated start command (BR-PDL-09); every entry is a bare three-line
 * file whose group is a literal, never an argument (BR-PDL-15). Each test name starts with its TC id
 * (spec join key) where the spec supplies one.
 *
 * Portability: every case spawns the real entry files against its own temp fixture project
 * (projection, group data, skills, transcript) with CLAUDE_PROJECT_DIR set to the fixture, HOME,
 * USERPROFILE, TMPDIR, TEMP and TMP pointed at the temp dir, and inherited framework switches
 * (CK_*, CLAUDE_*, CODEX_*, OPENCODE_*, NODE_OPTIONS) removed. Separators: fixture paths are built
 * with node:path, so each OS uses its own; the relevance check accepts either separator on every OS.
 * Fixtures are removed in `finally`.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { spawn, spawnSync } = require('node:child_process');

const { childEnv, makeHookTreeProject, removeTempDir } = require('../lib/hook-runner.cjs');

const HOOKS_DIR = path.resolve(__dirname, '..', '..');
const LIB = path.join(HOOKS_DIR, 'lib', 'protocol-delivery.cjs');
const CODEX_SYNC = path.resolve(HOOKS_DIR, '..', 'scripts', 'codex', 'sync-hooks.mjs');
// The index lists six groups; the five skill-load groups have an entry file (the universal bundle has its own: universal-hook-delivery.test.cjs).
const INDEX_GROUPS = ['review', 'evidence-trace', 'workflow-task', 'spec-test', 'design', 'universal'];
const ENTRY_GROUPS = INDEX_GROUPS.filter(group => group !== 'universal');
const UNIVERSAL = ['ai-mistake-prevention', 'critical-thinking-mindset', 'project-protocol-overlay', 'project-reference-docs-guide'];
const PROTOCOLS_DIR = '.claude/skills/shared/protocols';
const BIN = 9500;
const DISTANCE = 4500000;
const SPAWN_TIMEOUT_MS = 20000;
// Reference medians from the confirmation run (ADR-0004), printed next to the through-launcher figure.
const BASELINE_BARE_SPAWN_MS = 56.8;
const BASELINE_LEAN_LAUNCHER_UPS_MS = 437.5;

const entryFile = group => path.join(HOOKS_DIR, `protocol-inject-${group}.cjs`);

// ── fixture project ─────────────────────────────────────────────────────────

const marker = tag => `[[FULL:${tag}]]`;

function protocolText(tag, extra = '') {
    return `> **${tag}** — fixture protocol ${marker(tag)}${extra}\n> ${'x'.repeat(200)}`;
}

function guideBlock(tags) {
    const lines = tags.map(tag => `- \`${tag}\` — Fixture summary for ${tag}; when it applies → ${PROTOCOLS_DIR}/${tag}.md`);
    return ['<!-- PROTOCOL-GUIDES:START -->', ...lines, '<!-- PROTOCOL-GUIDES:END -->'].join('\n');
}

const SPECS = [
    { tag: 'review-alpha', group: 'review' },
    { tag: 'review-beta', group: 'review' },
    { tag: 'evidence-alpha', group: 'evidence-trace' },
    { tag: 'spec-alpha', group: 'spec-test' },
    ...UNIVERSAL.map(tag => ({ tag, group: 'universal' }))
];

function scrubbedEnv(temp, extra = {}) {
    const overrides = { HOME: temp, USERPROFILE: temp, TMPDIR: temp, TEMP: temp, TMP: temp, NODE_OPTIONS: undefined };
    for (const key of Object.keys(process.env)) {
        if (/^(?:CK_|CLAUDE_|CODEX_|OPENCODE_|ANTHROPIC_|OPENAI_|AZURE_|GEMINI_|GOOGLE_|AWS_|MISTRAL_|COHERE_|GROQ_|DEEPSEEK_|TOGETHER_|PERPLEXITY_|XAI_|HF_|HUGGINGFACE_|LANGCHAIN_|LANGSMITH_|OLLAMA_|BEDROCK_)/i.test(key)) overrides[key] = undefined;
    }
    return childEnv({ ...overrides, ...extra });
}

async function withFixture(fn) {
    const temp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'pdl-hook-')));
    const project = path.join(temp, 'project');
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
        setText(tag, extra) {
            fx.write(`${PROTOCOLS_DIR}/${tag}.md`, `${protocolText(tag, extra)}\n`);
        },
        skill(name, tags) {
            fx.write(`.claude/skills/${name}/SKILL.md`, `---\nname: ${name}\ndescription: fixture skill\n---\n\n# ${name}\n\n${guideBlock(tags)}\n`);
        },
        append(text) {
            fs.appendFileSync(fx.transcript, text);
        },
        env: extra => scrubbedEnv(temp, { CLAUDE_PROJECT_DIR: project, ...extra }),
        /** Delivery records of one scope: { tag: parsed record } (a torn record fails the parse). */
        records(session = 's1', scope = 'main') {
            const dir = path.join(fx.store, session, scope);
            if (!fs.existsSync(dir)) return {};
            return Object.fromEntries(fs.readdirSync(dir)
                .filter(name => name.endsWith('.json') && !name.startsWith('_'))
                .map(name => [name.replace(/\.json$/, ''), JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'))]));
        }
    };
    const rows = SPECS.map(spec => {
        fx.setText(spec.tag);
        return {
            tag: spec.tag,
            group: spec.group,
            summary: `Fixture summary for ${spec.tag}`,
            when: 'when it applies',
            file: `${PROTOCOLS_DIR}/${spec.tag}.md`,
            parts: [{ file: `${PROTOCOLS_DIR}/${spec.tag}.md` }]
        };
    });
    fx.write(`${PROTOCOLS_DIR}/index.json`, JSON.stringify({ binChars: BIN, groups: INDEX_GROUPS, tags: rows }, null, 2));
    fx.write('.claude/skills/shared/protocol-groups.json', JSON.stringify({
        version: 1,
        binChars: BIN,
        groups: Object.fromEntries(INDEX_GROUPS.map(group => [group, { description: `${group} fixture`, tags: {} }])),
        inlineSkills: []
    }, null, 2));
    fx.skill('conv-a', ['review-alpha', 'review-beta', 'evidence-alpha', 'spec-alpha']);
    fx.skill('conv-b', ['review-alpha']);
    fx.append('{"type":"user","message":{"content":"start"}}\n');
    try {
        return await fn(fx);
    } finally {
        fs.rmSync(temp, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    }
}

const skillLoad = (fx, name = 'conv-a', extra = {}) => ({
    hook_event_name: 'PostToolUse',
    tool_name: 'Skill',
    tool_input: { skill: name },
    session_id: 's1',
    transcript_path: fx.transcript,
    cwd: fx.project,
    ...extra
});

// ── process runners ─────────────────────────────────────────────────────────

/** Spawn one entry file (optionally under a --require preload) and parse its stdout. */
function runEntry(fx, group, input, { preload, env, closeStdout = false, closeStderr = false } = {}) {
    return new Promise(resolve => {
        const args = preload ? ['--require', preload, entryFile(group)] : [entryFile(group)];
        const child = spawn(process.execPath, args, { cwd: fx.project, env: fx.env(env), stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
        let stdout = '';
        let stderr = '';
        const timer = setTimeout(() => child.kill('SIGKILL'), SPAWN_TIMEOUT_MS);
        child.stdout.on('data', chunk => { stdout += chunk; });
        child.stderr.on('data', chunk => { stderr += chunk; });
        child.on('close', code => {
            clearTimeout(timer);
            resolve({ code, stdout, stderr, context: contextOf(stdout) });
        });
        if (closeStdout) child.stdout.destroy();
        if (closeStderr) child.stderr.destroy();
        child.stdin.end(JSON.stringify(input));
    });
}

function contextOf(stdout) {
    if (!stdout) return '';
    const parsed = JSON.parse(stdout);
    return parsed.hookSpecificOutput.additionalContext;
}

function count(text, needle) {
    return text.split(needle).length - 1;
}

function assertDelivers(result, tags, label) {
    assert.equal(result.code, 0, `${label}: exit code (stderr: ${result.stderr})`);
    for (const tag of tags) assert.equal(count(result.context, marker(tag)), 1, `${label}: ${tag} delivered once`);
}

function assertSilent(result, label) {
    assert.equal(result.code, 0, `${label}: exit code (stderr: ${result.stderr})`);
    assert.equal(result.stdout, '', `${label}: expected no output`);
}

// ── module-load logger (TC-PDL-057, TC-PDL-067) ─────────────────────────────

const PRELOAD_SOURCE = `'use strict';
const Module = require('module');
const fs = require('fs');
const log = process.env.PDL_LOAD_LOG;
const record = entry => { try { fs.appendFileSync(log, JSON.stringify(entry) + '\\n'); } catch {} };
const load = Module._load;
Module._load = function (request, parent, isMain) {
    let file = request;
    try { file = Module._resolveFilename(request, parent, isMain); } catch {}
    record({ type: 'load', file, parent: (parent && parent.filename) || null });
    return load.apply(this, arguments);
};
const cp = require('child_process');
for (const name of ['spawn', 'spawnSync', 'exec', 'execSync', 'execFile', 'execFileSync', 'fork']) {
    const original = cp[name];
    cp[name] = function (...args) {
        record({ type: 'spawn', fn: name, command: String(args[0]), args: Array.isArray(args[1]) ? args[1].map(String) : [] });
        return original.apply(this, args);
    };
}
`;

function makePreload(temp) {
    const preload = path.join(temp, 'load-logger.cjs');
    fs.writeFileSync(preload, PRELOAD_SOURCE);
    return preload;
}

function readLog(file) {
    if (!fs.existsSync(file)) return [];
    return fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map(line => JSON.parse(line));
}

/** Absolute (non-built-in) module files loaded, in load order, with their parent. */
function loadedFiles(entries) {
    return entries.filter(entry => entry.type === 'load' && path.isAbsolute(entry.file));
}

const samePath = (a, b) => (process.platform === 'win32' ? path.resolve(a).toLowerCase() === path.resolve(b).toLowerCase() : path.resolve(a) === path.resolve(b));

// ── tests ───────────────────────────────────────────────────────────────────

const tests = [
    {
        name: 'TC-PDL-054 a closed output pipe never blocks any group, records a failed delivery or suppresses its healthy retry',
        fn: () => withFixture(async fx => {
            // Given every group has an indexed protocol declared by a fixture skill.
            const tags = ENTRY_GROUPS.map(group => ({ tag: `${group}-output`, group }));
            const index = JSON.parse(fs.readFileSync(fx.abs(`${PROTOCOLS_DIR}/index.json`), 'utf8'));
            for (const { tag, group } of tags) {
                fx.setText(tag);
                index.tags.push({ tag, group, parts: [{ file: `${PROTOCOLS_DIR}/${tag}.md` }] });
                fx.skill(`output-${group}`, [tag]);
            }
            fx.write(`${PROTOCOLS_DIR}/index.json`, JSON.stringify(index));
            for (const { tag, group } of tags) {
                const event = skillLoad(fx, `output-${group}`, { session_id: group });
                // When the host closes stdout before the group attempts delivery.
                const failed = await runEntry(fx, group, event, { closeStdout: true });
                // Then the advisory hook allows the event without false delivery credit or a held claim.
                assertSilent(failed, `${group}: closed output`);
                assert.equal(failed.stderr, '', `${group}: no unhandled error`);
                assert.deepEqual(fx.records(group), {}, `${group}: failed write is not delivery evidence`);
                const scope = path.join(fx.store, group, 'main');
                assert.equal(fs.readdirSync(scope).filter(name => name.endsWith('.lock')).length, 0, `${group}: claim released`);
                // When the same event retries with a healthy output pipe.
                const retry = await runEntry(fx, group, event);
                // Then the protocol arrives once and only that acknowledgment starts suppression.
                assertDelivers(retry, [tag], `${group}: healthy retry`);
                assert.deepEqual(Object.keys(fx.records(group)), [tag], `${group}: retry acknowledged`);
                assertSilent(await runEntry(fx, group, event), `${group}: acknowledged retry deduplicates`);
            }
        })
    },
    {
        name: 'TC-PDL-054 output acknowledgment settles once and removes transient error listeners',
        fn: () => withFixture(async fx => {
            // Native pipe coverage above owns actual EPIPE; this seam proves both
            // callback/event orders and listener lifetime without process-global leakage.
            for (const mode of ['success', 'callback-error', 'event-error', 'throw']) {
                // Given an isolated native child and one of the supported output completion orders.
                const input = skillLoad(fx, 'conv-b', { session_id: mode });
                const source = `
                    const fs = require('node:fs');
                    const delivery = require(${JSON.stringify(LIB)});
                    const ledger = require(${JSON.stringify(path.join(HOOKS_DIR, 'lib', 'convention-ledger.cjs'))});
                    const output = process.stdout;
                    const original = output.write;
                    const baseline = output.listenerCount('error');
                    let releases = 0;
                    const release = ledger.releaseLock;
                    ledger.releaseLock = (...args) => { releases++; return release(...args); };
                    const mode = ${JSON.stringify(mode)};
                    output.write = (text, done) => {
                        const error = new Error('synthetic output failure');
                        if (mode === 'throw') throw error;
                        if (mode === 'success') { done(); return true; }
                        if (mode === 'callback-error') { done(error); output.emit('error', error); }
                        else { output.emit('error', error); done(error); }
                        return false;
                    };
                    delivery.runHook('review', { input: ${JSON.stringify(input)}, projectRoot: ${JSON.stringify(fx.project)} })
                    .then(payload => {
                        const listeners = output.listenerCount('error') - baseline;
                        output.write = original;
                        original.call(output, JSON.stringify({ delivered: Boolean(payload), releases, listeners }));
                    });
                `;
                // When its real delivery writer succeeds, fails by callback/event, or throws.
                const result = spawnSync(process.execPath, ['-e', source], {
                    cwd: fx.project, env: fx.env(), encoding: 'utf8', timeout: SPAWN_TIMEOUT_MS, windowsHide: true
                });
                // Then it acknowledges once, releases its claim, and leaves no transient listener.
                assert.equal(result.error, undefined, `${mode}: process available`);
                assert.equal(result.status, 0, result.stderr);
                assert.equal(result.stderr, '', `${mode}: contained error`);
                assert.deepEqual(JSON.parse(result.stdout), {
                    delivered: mode === 'success', releases: 1, listeners: 0
                }, `${mode}: one acknowledgment, no listener leak`);
                assert.deepEqual(Object.keys(fx.records(mode)), mode === 'success' ? ['review-alpha'] : [], `${mode}: acknowledgment owns record`);
            }
        })
    },
    {
        name: '[entry] malformed group diagnostics contain closed pipes and allow recovery for every group',
        fn: () => withFixture(async fx => {
            // Given every real group entry has a declared indexed protocol, but its registry is malformed.
            const groupsFile = '.claude/skills/shared/protocol-groups.json';
            const validGroups = fs.readFileSync(fx.abs(groupsFile), 'utf8');
            const index = JSON.parse(fs.readFileSync(fx.abs(`${PROTOCOLS_DIR}/index.json`), 'utf8'));
            for (const group of ENTRY_GROUPS) {
                const tag = `${group}-diagnostic`;
                fx.setText(tag);
                index.tags.push({ tag, group, parts: [{ file: `${PROTOCOLS_DIR}/${tag}.md` }] });
                fx.skill(`diagnostic-${group}`, [tag]);
            }
            fx.write(`${PROTOCOLS_DIR}/index.json`, JSON.stringify(index));
            for (const group of ENTRY_GROUPS) {
                fx.write(groupsFile, '{malformed');
                const event = skillLoad(fx, `diagnostic-${group}`, { session_id: group });
                // When a healthy stderr pipe receives the malformed-registry diagnostic.
                const diagnostic = await runEntry(fx, group, event);
                // Then the existing notice stays visible without creating a delivery record.
                assertSilent(diagnostic, `${group}: healthy diagnostic`);
                assert.equal(diagnostic.stderr, `[protocol-delivery] unknown protocol group "${group}": nothing delivered\n`);
                // When the host closes stderr before the same real entry receives the event.
                const failed = await runEntry(fx, group, event, { closeStderr: true });
                // Then the diagnostic is best-effort, and neither records nor claims suppress recovery.
                assertSilent(failed, `${group}: closed diagnostic pipe`);
                assert.deepEqual(fx.records(group), {}, `${group}: diagnostic is not delivery evidence`);
                assert.equal(fs.existsSync(path.join(fx.store, group)), false, `${group}: no diagnostic ledger or claim`);
                // When valid registry data is restored and the same event retries on open pipes.
                fx.write(groupsFile, validGroups);
                const retry = await runEntry(fx, group, event);
                // Then full context arrives once, earns a record, and its next repeat stays silent.
                assertDelivers(retry, [`${group}-diagnostic`], `${group}: recovered registry`);
                assert.deepEqual(Object.keys(fx.records(group)), [`${group}-diagnostic`]);
                assertSilent(await runEntry(fx, group, event), `${group}: acknowledged recovery deduplicates`);
            }
        })
    },
    {
        name: '[entry] diagnostic completion removes transient listeners across callback, event and throw orders',
        fn: () => withFixture(async fx => {
            // Given malformed group data and an isolated diagnostic stream for each completion order.
            fx.write('.claude/skills/shared/protocol-groups.json', '{malformed');
            for (const mode of ['success', 'callback-error', 'event-error', 'throw']) {
                const source = `
                    const delivery = require(${JSON.stringify(LIB)});
                    const output = process.stderr;
                    const original = output.write;
                    const baseline = output.listenerCount('error');
                    let writes = 0;
                    let guardedAtFailure = false;
                    const mode = ${JSON.stringify(mode)};
                    output.write = (text, done) => {
                        writes++;
                        const error = new Error('synthetic diagnostic failure');
                        if (mode === 'throw') throw error;
                        if (mode === 'success') { if (done) done(); return true; }
                        if (mode === 'callback-error') {
                            if (done) done(error);
                            guardedAtFailure = output.listenerCount('error') === baseline + 1;
                            output.emit('error', error);
                        } else {
                            guardedAtFailure = output.listenerCount('error') === baseline + 1;
                            output.emit('error', error);
                            if (done) done(error);
                        }
                        return false;
                    };
                    delivery.runHook('review', { input: ${JSON.stringify(skillLoad(fx))}, projectRoot: ${JSON.stringify(fx.project)} })
                    .then(payload => {
                        const listeners = output.listenerCount('error') - baseline;
                        output.write = original;
                        process.stdout.write(JSON.stringify({ delivered: Boolean(payload), writes, listeners, guardedAtFailure }));
                    });
                `;
                // When the real diagnostic writer receives success, either failure order, or a synchronous throw.
                const result = spawnSync(process.execPath, ['-e', source], {
                    cwd: fx.project, env: fx.env(), encoding: 'utf8', timeout: SPAWN_TIMEOUT_MS, windowsHide: true
                });
                // Then no error escapes, failed callbacks keep the native-event guard, and completion leaves none.
                assert.equal(result.error, undefined, `${mode}: process available`);
                assert.equal(result.status, 0, result.stderr);
                assert.equal(result.stderr, '', `${mode}: contained diagnostic error`);
                assert.deepEqual(JSON.parse(result.stdout), {
                    delivered: false, writes: 1, listeners: 0,
                    guardedAtFailure: mode === 'callback-error' || mode === 'event-error'
                }, `${mode}: diagnostic lifecycle`);
                assert.equal(fs.existsSync(fx.store), false, `${mode}: diagnostic never opens the ledger`);
            }
        })
    },

    {
        name: '[entry] each of the five skill-load groups has a bare three-line entry file whose group is a literal (BR-PDL-15)',
        fn: () => {
            // Given the five skill-load delivery groups (BR-PDL-03)
            for (const group of ENTRY_GROUPS) {
                // When the entry file for the group is read
                const lines = fs.readFileSync(entryFile(group), 'utf8').replace(/\r\n/g, '\n').replace(/\n$/, '').split('\n');
                // Then it is exactly the shebang, strict mode and one runHook call naming the group (no argv)
                assert.deepEqual(lines, [
                    '#!/usr/bin/env node',
                    "'use strict';",
                    `require('./lib/protocol-delivery.cjs').runHook('${group}');`
                ], `protocol-inject-${group}.cjs`);
            }
        }
    },
    {
        name: 'TC-PDL-014 a protocol already delivered in the session is not repeated',
        fn: () => withFixture(async fx => {
            // Given a converted skill whose review protocols were delivered once in the session
            const first = await runEntry(fx, 'review', skillLoad(fx));
            assertDelivers(first, ['review-alpha', 'review-beta'], 'first load');
            const records = fx.records();
            assert.deepEqual(Object.keys(records).sort(), ['review-alpha', 'review-beta']);
            for (const record of Object.values(records)) assert.equal(record.form, 'full');
            // When the same skill loads again, and another skill declaring the same protocol loads
            const again = await runEntry(fx, 'review', skillLoad(fx));
            const other = await runEntry(fx, 'review', skillLoad(fx, 'conv-b'));
            // Then nothing is printed and the records are unchanged
            assertSilent(again, 'second load');
            assertSilent(other, 'another skill declaring the same protocol');
            assert.deepEqual(fx.records(), records, 'records unchanged');
            // And a separate scope (a sub-agent) still receives it once (per session per scope)
            const agent = await runEntry(fx, 'review', skillLoad(fx, 'conv-a', { agent_id: 'helper-1' }));
            assertDelivers(agent, ['review-alpha', 'review-beta'], 'sub-agent scope');
            // Boundary counter-case: a changed published text is delivered again, the unchanged one is not
            fx.setText('review-alpha', ' (revised)');
            const changed = await runEntry(fx, 'review', skillLoad(fx));
            assertDelivers(changed, ['review-alpha'], 'changed text');
            assert.equal(count(changed.context, marker('review-beta')), 0, 'unchanged protocol not repeated');
        })
    },
    {
        name: 'TC-PDL-015 after a compaction the protocol is delivered again',
        fn: () => withFixture(async fx => {
            // Boundary counter-case: a compaction before the first delivery → one delivery only
            fx.append(`${JSON.stringify({ type: 'system', subtype: 'compact_boundary', timestamp: new Date(Date.now() - 60000).toISOString() })}\n`);
            assertDelivers(await runEntry(fx, 'review', skillLoad(fx)), ['review-alpha', 'review-beta'], 'first delivery');
            assertSilent(await runEntry(fx, 'review', skillLoad(fx)), 'no compaction since delivery');
            // Given two compactions recorded after the delivery
            // (dated after the first delivery returned, so strictly after its record)
            const later = Date.now();
            for (const offset of [0, 1]) {
                fx.append(`${JSON.stringify({ type: 'system', subtype: 'compact_boundary', timestamp: new Date(later + offset).toISOString() })}\n`);
            }
            // When the skill loads again
            const redelivered = await runEntry(fx, 'review', skillLoad(fx));
            // Then the protocols are delivered again, once, and the record is refreshed
            assertDelivers(redelivered, ['review-alpha', 'review-beta'], 'after compaction');
            assert.ok(fx.records()['review-alpha'].deliveredAt > later + 1, 'record refreshed after the compaction');
            assertSilent(await runEntry(fx, 'review', skillLoad(fx)), 'two compactions → one re-delivery');
        })
    },
    {
        name: 'TC-PDL-015 on the second host a compaction record in the conversation rollout re-arms delivery',
        fn: () => withFixture(async fx => {
            // Given a Codex session whose rollout (the conversation record) starts with its session line,
            // and a converted skill whose second-host copy a shell command reads
            const rollout = path.join(fx.temp, 'rollout.jsonl');
            const line = (type, payload, at = Date.now()) => `${JSON.stringify({ timestamp: new Date(at).toISOString(), ordinal: 1, type, payload })}\n`;
            fs.writeFileSync(rollout, line('session_meta', { session_id: 's1' }));
            fx.write('.agents/skills/conv-a/SKILL.md', fs.readFileSync(fx.abs('.claude/skills/conv-a/SKILL.md')));
            const shellLoad = () => ({
                hook_event_name: 'PostToolUse',
                tool_name: 'Bash',
                tool_input: { command: 'cat .agents/skills/conv-a/SKILL.md' },
                turn_id: 't1',
                session_id: 's1',
                transcript_path: rollout,
                cwd: fx.project
            });
            assertDelivers(await runEntry(fx, 'review', shellLoad()), ['review-alpha', 'review-beta'], 'first delivery');
            // Boundary counter-case: the same words nested in a payload, or quoted in a message, are not a compaction
            const later = Date.now() + 1;
            fs.appendFileSync(rollout, line('response_item', { type: 'compacted', note: 'nested, not a record type' }, later));
            fs.appendFileSync(rollout, line('response_item', { type: 'message', content: 'the log says {"type":"compacted"} here' }, later));
            assertSilent(await runEntry(fx, 'review', shellLoad()), 'nested or quoted "compacted" is not a compaction');
            // When the rollout records a compaction as its own top-level record, and the skill is read again
            fs.appendFileSync(rollout, line('compacted', { message: '', replacement_history: [] }, later));
            const redelivered = await runEntry(fx, 'review', shellLoad());
            // Then the protocols are delivered again, once
            assertDelivers(redelivered, ['review-alpha', 'review-beta'], 'after the rollout compaction');
            assertSilent(await runEntry(fx, 'review', shellLoad()), 'one compaction → one re-delivery');
        })
    },
    {
        name: 'TC-PDL-015 on the third host a compaction the bridge reports re-arms delivery, although its events carry no conversation record',
        fn: () => withFixture(async fx => {
            // Given an OpenCode-shaped skill load: the skill named in `name`, no conversation record path
            const bridgeLoad = session => ({
                hook_event_name: 'PostToolUse',
                tool_name: 'Skill',
                tool_input: { name: 'conv-a' },
                session_id: session,
                cwd: fx.project
            });
            const delivery = require(LIB);
            // Boundary counter-case: a session that never received a delivery has nothing to re-arm; nothing is written
            assert.equal(delivery.recordCompaction({ session_id: 's-none', cwd: fx.project }, { projectRoot: fx.project }), false);
            assert.ok(!fs.existsSync(path.join(fx.store, 's-none')), 'no store entry for a session without deliveries');
            assertDelivers(await runEntry(fx, 'review', bridgeLoad('s1')), ['review-alpha', 'review-beta'], 'first delivery');
            assertSilent(await runEntry(fx, 'review', bridgeLoad('s1')), 'no compaction since delivery');
            // When the bridge reports the session's compaction (what it does on session.compacted), and the skill loads again
            assert.equal(delivery.recordCompaction({ session_id: 's1', cwd: fx.project }, { projectRoot: fx.project, now: Date.now() + 1 }), true);
            const redelivered = await runEntry(fx, 'review', bridgeLoad('s1'));
            // Then the protocols are delivered again, once
            assertDelivers(redelivered, ['review-alpha', 'review-beta'], 'after the reported compaction');
            assertSilent(await runEntry(fx, 'review', bridgeLoad('s1')), 'one report → one re-delivery');
            // Edge: an input without a session id records nothing and does not throw
            assert.equal(delivery.recordCompaction({ cwd: fx.project }, { projectRoot: fx.project }), false);
            assert.equal(delivery.recordCompaction(null), false);
        })
    },
    {
        name: 'TC-PDL-020 parallel group entries for one load deliver each protocol once',
        fn: () => withFixture(async fx => {
            // Given three group entries started together for one load, plus a second review entry
            const groups = ['review', 'evidence-trace', 'spec-test', 'review'];
            // When they finish
            const results = await Promise.all(groups.map(group => runEntry(fx, group, skillLoad(fx))));
            // Then each protocol is delivered exactly once across all outputs
            const all = results.map(result => {
                assert.equal(result.code, 0, result.stderr);
                return result.context;
            }).join('\n');
            for (const tag of ['review-alpha', 'review-beta', 'evidence-alpha', 'spec-alpha']) {
                assert.equal(count(all, marker(tag)), 1, `${tag} delivered exactly once`);
            }
            // And every delivery record reads back whole (records() parses each one)
            assert.deepEqual(Object.keys(fx.records()).sort(), ['evidence-alpha', 'review-alpha', 'review-beta', 'spec-alpha']);
            assert.equal(fs.readdirSync(path.join(fx.store, 's1', 'main')).filter(name => name.endsWith('.lock')).length, 0, 'no lock left behind');
        })
    },
    {
        name: 'TC-PDL-020 a live peer claim skips only its protocol; a stale claim does not (BR-PDL-05)',
        fn: () => withFixture(async fx => {
            // Given a fresh peer lock on review-alpha and a stale one (older than the stale limit) on review-beta
            const scopeDir = path.join(fx.store, 's1', 'main');
            fs.mkdirSync(scopeDir, { recursive: true });
            fs.writeFileSync(path.join(scopeDir, 'review-alpha.lock'), JSON.stringify({ pid: 1, at: Date.now(), token: 'peer' }));
            const stale = path.join(scopeDir, 'review-beta.lock');
            fs.writeFileSync(stale, JSON.stringify({ pid: 1, at: 0, token: 'stale' }));
            const old = new Date(Date.now() - 60000);
            fs.utimesSync(stale, old, old);
            // When the review entry runs
            const result = await runEntry(fx, 'review', skillLoad(fx));
            // Then the live claim's protocol is skipped and the stale claim's protocol is delivered and recorded
            assertDelivers(result, ['review-beta'], 'stale claim taken over');
            assert.equal(count(result.context, marker('review-alpha')), 0, 'live peer claim skips its protocol');
            assert.deepEqual(Object.keys(fx.records()), ['review-beta']);
        })
    },
    {
        name: 'TC-PDL-053 delivery re-arms at 4,500,000 bytes of transcript growth, not before',
        fn: () => withFixture(async fx => {
            // Given a delivered protocol
            assertDelivers(await runEntry(fx, 'review', skillLoad(fx)), ['review-alpha'], 'first delivery');
            const growBy = bytes => fx.append(`${'a'.repeat(bytes - 1)}\n`);
            // When the transcript has grown by 4,400,000 bytes, then by 4,499,999 bytes
            growBy(4400000);
            assertSilent(await runEntry(fx, 'review', skillLoad(fx)), 'growth 4,400,000');
            growBy(99999);
            assertSilent(await runEntry(fx, 'review', skillLoad(fx)), 'growth 4,499,999');
            // When it has grown by 4,500,000 bytes
            growBy(1);
            const rearmed = await runEntry(fx, 'review', skillLoad(fx));
            // Then the protocol is delivered again and the record is refreshed at the new size
            assertDelivers(rearmed, ['review-alpha', 'review-beta'], 'growth 4,500,000');
            assert.equal(fx.records()['review-alpha'].transcriptBytes, fs.statSync(fx.transcript).size);
            assert.ok(fs.statSync(fx.transcript).size - fx.records()['review-alpha'].transcriptBytes < DISTANCE);
            assertSilent(await runEntry(fx, 'review', skillLoad(fx)), 'no growth after re-delivery');
        })
    },
    {
        name: 'TC-PDL-054 an unusable record store still delivers',
        fn: () => withFixture(async fx => {
            // Given a regular file where the record store folder should be (portable on every OS)
            fs.mkdirSync(path.dirname(fx.store), { recursive: true });
            fs.writeFileSync(fx.store, 'not a folder');
            // When a converted skill loads, twice
            const first = await runEntry(fx, 'review', skillLoad(fx));
            const second = await runEntry(fx, 'review', skillLoad(fx));
            // Then both loads deliver the pack and end successfully; a duplicate is accepted
            assertDelivers(first, ['review-alpha', 'review-beta'], 'broken store, first load');
            assertDelivers(second, ['review-alpha', 'review-beta'], 'broken store, second load');
            // And nothing was written: the store is still the regular file
            assert.ok(fs.statSync(fx.store).isFile(), 'store path unchanged');
        })
    },
    {
        name: 'TC-PDL-057 a non-matching event ends before any project module loads',
        fn: () => withFixture(async fx => {
            const preload = makePreload(fx.temp);
            const nonMatching = [
                ['Read of an ordinary file', { hook_event_name: 'PostToolUse', tool_name: 'Read', tool_input: { file_path: path.join(fx.project, 'README.md') }, session_id: 's1', cwd: fx.project }],
                ['second-host prompt without $', { hook_event_name: 'UserPromptSubmit', prompt: 'explain the build', turn_id: 't1', session_id: 's1', cwd: fx.project }]
            ];
            for (const group of ENTRY_GROUPS) {
                for (const [label, input] of nonMatching) {
                    // Given a non-matching event and a module-load logger
                    const log = path.join(fx.temp, `load-${group}-${label.length}.jsonl`);
                    // When the group's entry file runs
                    const result = await runEntry(fx, group, input, { preload, env: { PDL_LOAD_LOG: log } });
                    // Then it prints nothing, ends successfully, and loads only the entry file and the lib
                    assertSilent(result, `${group}: ${label}`);
                    const files = loadedFiles(readLog(log)).map(entry => entry.file);
                    assert.equal(files.length, 2, `${group}: ${label}: loaded ${JSON.stringify(files)}`);
                    assert.ok(samePath(files[0], entryFile(group)) && samePath(files[1], LIB), `${group}: ${label}: loaded ${JSON.stringify(files)}`);
                    assert.ok(!fs.existsSync(fx.store), `${group}: ${label}: nothing written`);
                }
            }
            // Boundary counter-cases: a read of a skill file, and a shell command naming the skill file anywhere, run the full path
            const skillRead = { hook_event_name: 'PostToolUse', tool_name: 'Read', tool_input: { file_path: fx.abs('.claude/skills/conv-a/SKILL.md') }, session_id: 's1', cwd: fx.project };
            const readLog1 = path.join(fx.temp, 'load-skill-read.jsonl');
            assertDelivers(await runEntry(fx, 'review', skillRead, { preload, env: { PDL_LOAD_LOG: readLog1 } }), ['review-alpha'], 'skill file read');
            assert.ok(loadedFiles(readLog(readLog1)).some(entry => path.basename(entry.file) === 'convention-ledger.cjs'), 'full path loads the ledger');
            const shell = { hook_event_name: 'PostToolUse', tool_name: 'Bash', tool_input: { command: 'Get-Content -Raw .agents/skills/conv-a/SKILL.md | Out-Null' }, session_id: 's2', turn_id: 't1', cwd: fx.project };
            const shellLog = path.join(fx.temp, 'load-shell.jsonl');
            const shellRun = await runEntry(fx, 'review', shell, { preload, env: { PDL_LOAD_LOG: shellLog } });
            assert.equal(shellRun.code, 0, shellRun.stderr);
            assert.ok(loadedFiles(readLog(shellLog)).length > 2, 'a shell command naming the skill file is not an early exit');
        })
    },
    {
        name: 'runtime modes suppress relevant skill delivery before ledger writes and reenable it',
        fn: () => withFixture(async fx => {
            for (const mode of ['off', 'quiet']) {
                const result = await runEntry(fx, 'review', skillLoad(fx), { env: { CK_FRAMEWORK_MODE: mode } });
                assertSilent(result, mode);
                assert.equal(fs.existsSync(fx.store), false, `${mode}: no delivery ledger`);
            }
            assertDelivers(await runEntry(fx, 'review', skillLoad(fx), { env: { CK_FRAMEWORK_MODE: 'on' } }),
                ['review-alpha', 'review-beta'], 'reenabled');
        })
    },
    {
        name: '[entry] an unknown group is rejected after the early exit, never before it',
        fn: () => withFixture(async fx => {
            const probe = (group, input = skillLoad(fx)) => spawnSync(process.execPath, ['-e', `require(${JSON.stringify(LIB)}).runHook(${JSON.stringify(group)})`], {
                cwd: fx.project,
                env: fx.env(),
                input: JSON.stringify(input),
                encoding: 'utf8',
                windowsHide: true,
                timeout: SPAWN_TIMEOUT_MS
            });
            // Given a skill load and a group name the group data does not define
            // When runHook runs for it
            const unknown = probe('not-a-group');
            // Then nothing is delivered, the exit code is 0 and stderr names the group
            assert.equal(unknown.status, 0, unknown.stderr);
            assert.equal(unknown.stdout, '');
            assert.match(unknown.stderr, /unknown protocol group "not-a-group"/);
            assert.ok(!fs.existsSync(fx.store), 'nothing recorded for an unknown group');
            // And on a non-matching event the early exit comes first: no group check, no diagnostic
            const early = probe('not-a-group', { hook_event_name: 'PostToolUse', tool_name: 'Read', tool_input: { file_path: 'README.md' }, session_id: 's1' });
            assert.equal(early.status, 0, early.stderr);
            assert.equal(early.stdout + early.stderr, '', 'the early exit precedes the group check');
            // And a known group delivers through the same call
            assert.match(probe('review').stdout, /\[\[FULL:review-alpha\]\]/);
        })
    },
    {
        name: 'TC-PDL-067 through the generated second-host launcher, a non-matching event loads only the expected modules',
        fn: async () => {
            // Use the shipped renderer, independent of an adopter's generated mirror or shell quoting.
            const { normalizeCommand } = await import(pathToFileURL(CODEX_SYNC).href);
            const command = normalizeCommand('node "$CLAUDE_PROJECT_DIR"/.claude/hooks/protocol-inject-review.cjs', { windows: process.platform === 'win32' });
            assert.ok(typeof command === 'string' && command.length > 0, 'the current native launcher is generated');
            const fixture = makeHookTreeProject('pdl067');
            try {
                // Given the generated launcher pointed at the review entry file, run from a project subfolder
                const sub = path.join(fixture, 'packages', 'app');
                fs.mkdirSync(sub, { recursive: true });
                const temp = fs.mkdtempSync(path.join(fixture, 'tmp-'));
                const preload = makePreload(temp).replace(/\\/g, '/');
                const input = JSON.stringify({ hook_event_name: 'UserPromptSubmit', prompt: 'explain the build', turn_id: 't1', session_id: 's1', cwd: sub });
                const hooksRoot = path.join(fixture, '.claude', 'hooks');
                const entry = path.join(hooksRoot, 'protocol-inject-review.cjs');
                const lib = path.join(hooksRoot, 'lib', 'protocol-delivery.cjs');
                const gitHelper = path.join(hooksRoot, 'lib', 'windows-git.cjs');
                const times = [];
                let spawns = [];
                for (let run = 1; run <= 6; run++) {
                    const log = path.join(temp, `load-${run}.jsonl`);
                    // When it runs for a second-host prompt that names no skill
                    const started = process.hrtime.bigint();
                    const result = spawnSync(command, {
                        cwd: sub,
                        env: scrubbedEnv(temp, { CK_NODE_PATH: process.execPath, NODE_OPTIONS: `--require "${preload}"`, PDL_LOAD_LOG: log }),
                        input,
                        encoding: 'utf8',
                        shell: true,
                        windowsHide: true,
                        timeout: 60000
                    });
                    times.push(Number(process.hrtime.bigint() - started) / 1e6);
                    // Then it prints nothing and ends successfully
                    assert.equal(result.status, 0, result.stderr);
                    assert.equal(result.stdout, '');
                    // And the project modules loaded are only the launcher's git helper (with its own
                    // requires), the entry file and the lib — nothing is required from the lib itself
                    const entries = readLog(log);
                    const files = loadedFiles(entries);
                    const launcherOwned = new Set([path.resolve(gitHelper).toLowerCase()]);
                    for (const item of files) {
                        if (item.parent && launcherOwned.has(path.resolve(item.parent).toLowerCase())) launcherOwned.add(path.resolve(item.file).toLowerCase());
                    }
                    const unexpected = files.filter(item => !launcherOwned.has(path.resolve(item.file).toLowerCase())
                        && !samePath(item.file, entry) && !samePath(item.file, lib));
                    assert.deepEqual(unexpected.map(item => item.file), [], `run ${run}: unexpected project modules`);
                    assert.ok(files.some(item => samePath(item.file, entry)) && files.some(item => samePath(item.file, lib)), `run ${run}: entry and lib loaded`);
                    assert.ok(!files.some(item => item.parent && samePath(item.parent, lib)), `run ${run}: the lib required nothing`);
                    assert.ok(!fs.existsSync(path.join(fixture, 'tmp', 'protocol-delivery')), `run ${run}: nothing written`);
                    if (run === 1) spawns = entries.filter(item => item.type === 'spawn');
                }
                // Recorded, not asserted: spawn counts and timing differ by OS and machine load (BR-PDL-09)
                const total = times.reduce((a, b) => a + b, 0);
                console.log(`      [TC-PDL-067] through-launcher, 6 sequential runs: ${total.toFixed(0)} ms total, ${(total / 6).toFixed(0)} ms per run `
                    + `(ADR-0004 reference medians: bare spawn ${BASELINE_BARE_SPAWN_MS} ms, lean launcher no-op UserPromptSubmit ${BASELINE_LEAN_LAUNCHER_UPS_MS} ms)`);
                console.log(`      [TC-PDL-067] launcher spawns per run (${process.platform}): ${spawns.length}${spawns.length ? ` — ${spawns.map(item => `${item.fn} ${path.basename(item.command)} ${item.args.join(' ')}`.trim()).join('; ')}` : ''}`);
            } finally {
                removeTempDir(fixture);
            }
        }
    }
];

module.exports = { name: 'protocol-inject-hook', tests };
