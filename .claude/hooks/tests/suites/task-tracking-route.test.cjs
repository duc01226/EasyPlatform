'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync, spawn } = require('node:child_process');
const { makeHookTreeProject, removeTempDir, childEnv } = require('../lib/hook-runner.cjs');
const advisory = require('../../lib/task-tracking-advisory.cjs');
const { trackingContext } = require('../../lib/task-tracking-config.cjs');
const ledger = require('../../lib/convention-ledger.cjs');

const FRAMEWORK_DIR = path.resolve(__dirname, '../../..');
const REQUEST = 'Help inspect linked work before publication';
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const event = (root, prompt = REQUEST, extra = {}) => ({ hook_event_name: 'UserPromptSubmit',
    session_id: 'fixture-session', cwd: root, prompt, ...extra });

function write(root, relative, bytes) {
    const file = path.join(root, relative);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, bytes);
    return file;
}

function cleanEnv(root, extra = {}) {
    const overrides = { HOME: root, USERPROFILE: root, TMPDIR: root, TEMP: root, TMP: root, NODE_OPTIONS: undefined };
    for (const key of Object.keys(process.env)) {
        if (/^(CK_|CLAUDE_|CODEX_|OPENCODE_)|TOKEN|SECRET|API_KEY/i.test(key)) overrides[key] = undefined;
    }
    return childEnv({ ...overrides, CLAUDE_PROJECT_DIR: root, ...extra });
}

async function fixture(callback) {
    const root = makeHookTreeProject('task-tracking-advisory');
    const config = { project: { name: 'Guidance fixture' }, docsRoots: { teamArtifacts: { path: 'work' } },
        taskTracking: { schemaVersion: 3, mode: 'observe' } };
    const skill = fs.readFileSync(path.join(FRAMEWORK_DIR, 'skills/task-track/SKILL.md'));
    write(root, '.claude/skills/task-track/SKILL.md', skill);
    write(root, '.claude/.ck.local.json', JSON.stringify({ portability: { projectConfigPath: 'docs/project-config.json' } }));
    const configPath = write(root, 'docs/project-config.json', JSON.stringify(config));
    // Adopter-owned bytes are unrelated preconditions, never fabricated tracking proof.
    const workPath = write(root, 'work/subtasks/owner.md', '# Contributor-owned work\nKeep this unchanged.\n');
    const workBefore = fs.readFileSync(workPath);
    try {
        return await callback({ root, config, configPath, workPath,
            saveConfig: () => fs.writeFileSync(configPath, JSON.stringify(config)) });
    } finally {
        try { assert.deepEqual(fs.readFileSync(workPath), workBefore, 'Guidance must preserve canonical work bytes'); }
        finally { removeTempDir(root); }
    }
}

function launch(root, payload, { env = {}, requireLauncher = false, cwd = root } = {}) {
    const hook = path.join(root, '.claude/hooks/task-tracking-route.cjs');
    // Same supported Node entry shape as the generated Codex launcher: require.main is undefined.
    const args = requireLauncher ? ['-e', 'require(process.argv[1])', hook] : [hook];
    const result = spawnSync(process.execPath, args, { cwd, env: cleanEnv(root, env), shell: false,
        windowsHide: true, encoding: 'utf8', timeout: 10000, maxBuffer: 1024 * 1024,
        input: typeof payload === 'string' ? payload : JSON.stringify(payload) });
    assert.equal(result.error, undefined, result.error?.message);
    assert.equal(result.status, 0, result.stderr);
    return result;
}

function oneNotice(output) {
    assert.equal(output.split(advisory.MARKER).length - 1, 1, 'Fresh eligible guidance must deliver exactly one notice');
    assert.ok(output.includes('inspect selected work and exact related concerns before publication'), 'Notice must name a useful available purpose');
    assert.ok(output.includes('This notice saves no work, starts no procedure and supplies no verification proof or acceptance'));
    assert.ok(output.length <= advisory.MAX_NOTICE_CHARS);
    assert.ok(!/^[\[{]/.test(output.trim()), 'Codex prompt guidance must remain plaintext');
}

const business = (id, intent, fn) => ({ name: `${id}: ${intent}`, TestSpec: id, fn: () => fixture(fn) });
const technical = (intent, fn) => ({ name: `TECH-tracking-advisory: ${intent}`, TechnicalSpec: `tracking-advisory/${intent}`, fn: () => fixture(fn) });

module.exports = {
    name: 'Task Tracking Advisory',
    tests: [
        // P13-HIERARCHY-ROUTE:START
        business('TC-TPT-221', 'trusted hierarchy read verbs and delivery intents receive non-authorizing guidance', f => {
            const before = fs.readFileSync(f.configPath);
            const verbs = ['show', 'inspect', 'check', 'open', 'list', 'report'];
            const kinds = ['module', 'area', 'domain', 'capability', 'feature', 'initiative'];
            const intents = ['status', 'progress', 'report', 'delivery'];
            for (const [v, verb] of verbs.entries()) {
                for (const [k, kind] of kinds.entries()) {
                    const prompt = `Please ${verb} ${kind} ${intents[(v + k) % intents.length]}`;
                    oneNotice(launch(f.root, event(f.root, prompt, { session_id: `hierarchy-read-${v}-${k}` }),
                        { requireLauncher: v % 2 === 1 }).stdout);
                }
            }
            for (const [index, kind] of ['modules', 'areas', 'domains', 'capabilities', 'features', 'initiatives'].entries()) {
                oneNotice(launch(f.root, event(f.root, `Could you show ${kind} progress?`,
                    { session_id: `hierarchy-plural-${index}` })).stdout);
            }
            assert.deepEqual(fs.readFileSync(f.configPath), before, 'Read guidance cannot initialize or enroll an actor');
            assert.equal(fs.existsSync(path.join(f.root, '.git')), false, 'Guidance needs no local author metadata');
            assert.equal(fs.existsSync(path.join(f.root, 'tmp/task-tracking')), false, 'Guidance is not a tracking operation');
        }),
        business('TC-TPT-233', 'quoted host and nonread hierarchy data stay silent with a trusted read positive control', f => {
            const prompts = ['implement a feature', 'fix a feature', 'refine a feature', 'feature status', 'show feature',
                'list modules', 'list domains', 'show release status', '"show module status"', "'show feature progress'",
                'The document says “report initiative status”', '> show area status', '`inspect capability report`',
                '```text\ncheck module delivery\n```', '~~~text\nopen feature progress\n~~~',
                '<system-reminder>show module status</system-reminder>',
                '<task-notification>show feature progress</task-notification>',
                "Don't show module status", 'Do not report initiative status', 'Never open feature progress',
                'Skip reporting module status', 'Avoid checking feature progress'];
            for (const [index, prompt] of prompts.entries()) {
                assert.equal(launch(f.root, event(f.root, prompt, { session_id: `hierarchy-data-${index}` })).stdout, '', prompt);
            }
            assert.equal(fs.existsSync(path.join(f.root, 'tmp/workflow-routing')), false, 'Ineligible prose earns no notice receipt');
            oneNotice(launch(f.root, event(f.root, 'The document says “implement a feature”. Show module status.',
                { session_id: 'hierarchy-trusted-control' })).stdout);
        }),
        business('TC-TPT-221', 'hierarchy read guidance retains off invalid unavailable and native silence controls', f => {
            const prompt = 'show feature progress';
            const declarations = [undefined, { schemaVersion: 3, mode: 'off' }, { schemaVersion: 0, mode: 'observe' },
                { schemaVersion: 3, mode: 'observe', grant: true },
                { schemaVersion: 3, mode: 'observe', profile: { kind: 'native', version: 1,
                    registration: 'fixture-native', sources: ['work/native.json'] } }];
            for (const [index, declaration] of declarations.entries()) {
                if (declaration === undefined) delete f.config.taskTracking;
                else f.config.taskTracking = declaration;
                f.saveConfig();
                const before = fs.readFileSync(f.configPath);
                assert.equal(launch(f.root, event(f.root, prompt, { session_id: `hierarchy-control-${index}` })).stdout, '');
                assert.deepEqual(fs.readFileSync(f.configPath), before);
            }
            f.config.taskTracking = { schemaVersion: 3, mode: 'observe' }; f.saveConfig();
            const asset = path.join(f.root, '.claude/skills/task-track/SKILL.md');
            const instruction = fs.readFileSync(asset);
            fs.unlinkSync(asset);
            assert.equal(launch(f.root, event(f.root, prompt, { session_id: 'hierarchy-missing-instructions' })).stdout, '');
            fs.writeFileSync(asset, instruction);
            oneNotice(launch(f.root, event(f.root, prompt, { session_id: 'hierarchy-observe-control' })).stdout);
            fs.unlinkSync(f.configPath);
            assert.equal(launch(f.root, event(f.root, prompt, { session_id: 'hierarchy-absent-config' })).stdout, '');
            assert.equal(fs.existsSync(f.configPath), false);
            assert.equal(fs.existsSync(path.join(f.root, 'tmp/task-tracking')), false);
        }),
        business('TC-TPT-221', 'hierarchy notices preserve restricted pending Skip permissions and linked opt-out authority', f => {
            f.config.portability = { skillAutoTrigger: false };
            f.config.taskTracking.mode = 'linked'; f.saveConfig();
            const before = fs.readFileSync(f.configPath);
            for (const [index, choice] of ['Run', 'Skip', 'pending'].entries()) {
                const output = launch(f.root, event(f.root, 'report program status', {
                    session_id: `hierarchy-authority-${index}`, choice, confirmed: true, canWrite: true,
                    canAccept: true, guidanceAllowed: true })).stdout;
                oneNotice(output);
                assert.ok(output.includes('single actual Run/Skip choice and wait for its answer'));
                assert.ok(output.includes('Pending choices and same-task Skip remain authoritative through follow-up and recovery'));
                assert.ok(output.includes('native permissions still apply'));
                assert.ok(output.includes('exact separately authorized checkpoints; item opt-out still applies'));
                assert.deepEqual(fs.readFileSync(f.configPath), before);
                assert.equal(fs.existsSync(path.join(f.root, 'tmp/task-tracking')), false);
            }
        }),
        business('TC-TPT-233', 'hierarchy normalized contexts retain delivery credit and bounded hash-only receipts', f => {
            const a = event(f.root, 'SHOW module\r\nstatus');
            oneNotice(launch(f.root, a).stdout);
            assert.equal(launch(f.root, event(f.root, ' show  module status ')).stdout, '');
            oneNotice(launch(f.root, event(f.root, 'inspect capability delivery')).stdout);
            assert.equal(launch(f.root, { ...a, source: 'resume', transcript_path: 'unavailable' }).stdout, '');
            const prompt = 'show area progress; private-fixture-marker';
            const input = event(f.root, prompt, { session_id: 'hierarchy-private' });
            oneNotice(launch(f.root, input).stdout);
            const paths = advisory.deliveryPaths(trackingContext(f.root), input);
            const receipt = fs.readFileSync(paths.file, 'utf8');
            assert.ok(!receipt.includes(prompt) && !receipt.includes('private-fixture-marker'));
            const state = JSON.parse(receipt);
            assert.equal(state.contexts.length, 1);
            assert.equal(state.contexts[0].status, 'delivered');
            assert.match(state.contexts[0].hash, /^[a-f0-9]{64}$/);
            const prefix = 'show feature progress ';
            const exact = prefix + 'x'.repeat(advisory.MAX_PROMPT_CHARS - prefix.length);
            oneNotice(launch(f.root, event(f.root, exact, { session_id: 'hierarchy-exact-bound' })).stdout);
            assert.equal(launch(f.root, event(f.root, exact + 'x', { session_id: 'hierarchy-over-bound' })).stdout, '');
            assert.equal(fs.existsSync(path.join(f.root, 'tmp/task-tracking')), false);
        }),
        // P13-HIERARCHY-ROUTE:END
        business('TC-TPT-149', 'guidance follows the current words: the area levels place work, a first-vocabulary word no longer names work, and an area by itself is a place and not work', f => {
            const notified = [
                // The level words the hierarchy gained, one and many, each with a read verb and a delivery intent.
                'show application status', 'report product progress', 'list applications delivery', 'check products report',
                // An area is still found as a place whose progress is read, and the current kinds are still work words.
                'inspect area progress', 'create a task', 'update the initiative', 'list subtasks'];
            const silent = [
                // A first-vocabulary word names nothing this tracker reads.
                'review the backlog', 'show idea status', 'update the pbi', 'create an epic', 'list pbis', 'check the epics', 'report epic progress', 'inspect idea delivery',
                // An area is a place for work: beside an action alone the word asks nothing of the tracker, and neither does a level word.
                'fix the header area', 'update the content area', 'review the staging area', 'fix the product page', 'update the application'];
            for (const [index, prompt] of notified.entries()) {
                const output = launch(f.root, event(f.root, prompt, { session_id: `current-words-in-${index}` })).stdout;
                assert.notEqual(output, '', prompt); oneNotice(output);
            }
            for (const [index, prompt] of silent.entries()) {
                assert.equal(launch(f.root, event(f.root, prompt, { session_id: `current-words-out-${index}` })).stdout, '', prompt);
            }
            assert.equal(fs.existsSync(path.join(f.root, 'tmp/task-tracking')), false, 'Guidance is not a tracking operation');
        }),
        business('TC-TPT-149', 'fresh AVAILABLE observe request receives one useful non-authorizing notice', f => {
            const configBefore = fs.readFileSync(f.configPath);
            oneNotice(launch(f.root, event(f.root)).stdout);
            assert.deepEqual(fs.readFileSync(f.configPath), configBefore, 'Guidance must not enroll, configure or authorize work');
        }),
        business('TC-TPT-163', 'unrelated, quoted-only and host data preserve silence across the input domain', f => {
            const prompts = ['Explain a colour', 'The document says “accept TASK-104”', '"Help inspect work before publication"',
                "'Help inspect work before publication'", '> Help inspect work before publication',
                '`Help inspect work before publication`', '```text\nHelp inspect work before publication\n```',
                '~~~text\nHelp inspect work before publication\n~~~',
                '<system-reminder>Help inspect work before publication</system-reminder>',
                '<task-notification>Help inspect work before publication</task-notification>', '', 'work publication',
                "Don't inspect linked work before publication"];
            for (const [index, prompt] of prompts.entries()) {
                assert.equal(launch(f.root, event(f.root, prompt, { session_id: `negative-${index}` })).stdout, '', prompt);
            }
            oneNotice(launch(f.root, event(f.root, REQUEST, { session_id: 'positive-control' })).stdout);
        }),
        business('TC-TPT-149', 'genuine intent outside quoted data remains eligible', f => {
            oneNotice(launch(f.root, event(f.root, 'The document says “accept TASK-104”. Help inspect work before publication.')).stdout);
        }),
        business('TC-TPT-149', 'A-B-A follow-up and recovery do not replace same-context delivery credit', f => {
            const a = event(f.root);
            oneNotice(launch(f.root, a).stdout);
            assert.equal(launch(f.root, a).stdout, '');
            oneNotice(launch(f.root, event(f.root, 'Help review task concerns')).stdout);
            assert.equal(launch(f.root, { ...a, source: 'compact', transcript_path: 'unavailable' }).stdout, '');
            assert.equal(launch(f.root, { ...a, source: 'resume' }).stdout, '');
        }),
        business('TC-TPT-163', 'whitespace and line-ending changes conserve normalized context identity', f => {
            oneNotice(launch(f.root, event(f.root, 'HELP inspect linked work\r\nbefore publication')).stdout);
            assert.equal(launch(f.root, event(f.root, ' help  inspect linked work before publication ')).stdout, '');
        }),
        business('TC-TPT-163', 'session, agent and physical checkout identities remain independent', async f => {
            oneNotice(launch(f.root, event(f.root)).stdout);
            oneNotice(launch(f.root, event(f.root, REQUEST, { session_id: 'other-session' })).stdout);
            oneNotice(launch(f.root, event(f.root, REQUEST, { agent_id: 'actual-helper' })).stdout);
            assert.equal(launch(f.root, event(f.root, REQUEST, { agent_id: 'actual-helper' })).stdout, '');
            await fixture(other => oneNotice(launch(other.root, event(other.root)).stdout));
        }),
        business('TC-TPT-163', 'absent config, absent enrollment and off preserve portable defaults', f => {
            for (const config of [{}, { taskTracking: { schemaVersion: 3 } }, { taskTracking: { schemaVersion: 3, mode: 'off' } }]) {
                fs.writeFileSync(f.configPath, JSON.stringify(config));
                assert.equal(launch(f.root, event(f.root)).stdout, '');
            }
            fs.unlinkSync(f.configPath);
            assert.equal(launch(f.root, event(f.root)).stdout, '');
            assert.equal(fs.existsSync(f.configPath), false, 'Hook must not silently initialize adopter config');
            assert.equal(fs.existsSync(path.join(f.root, '.git')), false);
            assert.equal(fs.existsSync(path.join(f.root, 'package.json')), false);
            assert.equal(fs.existsSync(path.join(f.root, '.gitignore')), false);
        }),
        business('TC-TPT-163', 'malformed declarations fail closed without rewriting selected config', f => {
            for (const text of ['{', JSON.stringify({ taskTracking: { schemaVersion: 4, mode: 'observe' } }),
                JSON.stringify({ taskTracking: { schemaVersion: 3, mode: 'unknown' } }),
                JSON.stringify({ taskTracking: { schemaVersion: 3, mode: 'observe', grant: true } })]) {
                fs.writeFileSync(f.configPath, text);
                assert.equal(launch(f.root, event(f.root)).stdout, '');
                assert.equal(fs.readFileSync(f.configPath, 'utf8'), text);
            }
        }),
        business('TC-TPT-163', 'native declaration cannot claim unsupported ordinary guidance capability', f => {
            f.config.taskTracking.profile = { kind: 'native', version: 1, registration: 'fixture-native', sources: ['work/native.json'] };
            f.saveConfig();
            assert.equal(launch(f.root, event(f.root)).stdout, '');
            assert.equal(fs.existsSync(path.join(f.root, 'tmp/workflow-routing')), false);
        }),
        business('TC-TPT-163', 'missing, nonregular and oversized instruction assets are unavailable', f => {
            const asset = path.join(f.root, '.claude/skills/task-track/SKILL.md');
            fs.unlinkSync(asset);
            assert.equal(launch(f.root, event(f.root)).stdout, '');
            fs.mkdirSync(asset);
            assert.equal(launch(f.root, event(f.root)).stdout, '');
            fs.rmdirSync(asset);
            fs.writeFileSync(asset, 'name: task-track\n' + 'x'.repeat(65536));
            assert.equal(launch(f.root, event(f.root)).stdout, '');
        }),
        business('TC-TPT-148', 'restricted selection keeps actual pending and Skip authority in notice copy', f => {
            f.config.portability = { skillAutoTrigger: false };
            f.saveConfig();
            const result = launch(f.root, event(f.root));
            oneNotice(result.stdout);
            assert.ok(result.stdout.includes('single actual Run/Skip choice and wait for its answer'));
            assert.ok(result.stdout.includes('Skip keeps direct work'));
            assert.ok(result.stdout.includes('Pending choices and same-task Skip remain authoritative through follow-up and recovery'));
            assert.ok(!result.stdout.includes('must run'), 'Optional guidance cannot become a required operation-specific call');
        }),
        business('TC-TPT-163', 'selected custom config and personal/local/env precedence use the existing control owner', f => {
            const selected = 'custom/context.json';
            f.config.portability = { skillAutoTrigger: false };
            write(f.root, selected, JSON.stringify(f.config));
            write(f.root, '.claude/.ck.local.json', JSON.stringify({ portability: { projectConfigPath: selected } }));
            oneNotice(launch(f.root, event(f.root)).stdout);
            assert.ok(launch(f.root, event(f.root, REQUEST, { session_id: 'custom-restricted' })).stdout.includes('Automatic skill selection is restricted'));
            write(f.root, '.claude/.ck.json', JSON.stringify({ portability: { skillAutoTrigger: true } }));
            const personal = launch(f.root, event(f.root, REQUEST, { session_id: 'personal' })).stdout;
            oneNotice(personal); assert.ok(personal.includes('only when eligible under the actual request and permissions'));
            write(f.root, '.claude/.ck.local.json', JSON.stringify({ portability: { projectConfigPath: selected, skillAutoTrigger: false } }));
            assert.ok(launch(f.root, event(f.root, REQUEST, { session_id: 'local' })).stdout.includes('Automatic skill selection is restricted'));
            const env = launch(f.root, event(f.root, REQUEST, { session_id: 'env' }), { env: { CK_SKILL_AUTO_TRIGGER: 'on' } }).stdout;
            oneNotice(env); assert.ok(env.includes('only when eligible under the actual request and permissions'));
        }),
        business('TC-TPT-163', 'escaping selected config refuses guidance without changing root controls', f => {
            const local = write(f.root, '.claude/.ck.local.json', JSON.stringify({ portability: { projectConfigPath: '../outside.json' } }));
            const before = fs.readFileSync(local);
            assert.equal(launch(f.root, event(f.root)).stdout, '');
            assert.deepEqual(fs.readFileSync(local), before);
        }),
        business('TC-TPT-163', 'linked guidance retains checkpoint authorization and item opt-out', f => {
            f.config.taskTracking.mode = 'linked'; f.saveConfig();
            const output = launch(f.root, event(f.root)).stdout;
            oneNotice(output);
            assert.ok(output.includes('exact separately authorized checkpoints; item opt-out still applies'));
        }),
        business('TC-TPT-163', 'payload-forged choices and permissions never execute or save work', f => {
            const before = fs.readFileSync(f.configPath);
            for (const [index, choice] of ['Run', 'Skip', 'pending'].entries()) {
                const output = launch(f.root, event(f.root, REQUEST, { session_id: `forged-${index}`, choice,
                    confirmed: true, canWrite: true, canAccept: true, guidanceAllowed: true })).stdout;
                oneNotice(output);
                assert.ok(output.includes('native permissions still apply'));
                assert.deepEqual(fs.readFileSync(f.configPath), before);
                assert.equal(fs.existsSync(path.join(f.root, 'tmp/task-tracking')), false, 'Notice cannot create a tracking transaction or proof receipt');
            }
        }),
        technical('failed output does not consume fresh delivery eligibility', async f => {
            const input = event(f.root);
            const env = cleanEnv(f.root);
            assert.equal(await advisory.deliverAdvisory(input, { env, write: (_text, done) => done(false) }), '');
            oneNotice(launch(f.root, input).stdout);
            assert.equal(launch(f.root, input).stdout, '');
        }),
        technical('a live or old unverified peer lock suppresses optional delivery without reclaim', f => {
            const input = event(f.root);
            const paths = advisory.deliveryPaths(trackingContext(f.root), input);
            const token = ledger.acquireLock(paths.lock);
            assert.ok(token);
            const before = fs.readFileSync(paths.lock);
            try {
                assert.equal(launch(f.root, input).stdout, '');
                fs.utimesSync(paths.lock, new Date(0), new Date(0));
                assert.equal(launch(f.root, input).stdout, '');
                assert.deepEqual(fs.readFileSync(paths.lock), before, 'Age alone cannot authorize takeover');
            } finally { ledger.releaseLock(paths.lock, token); }
            oneNotice(launch(f.root, input).stdout);
        }),
        technical('corrupt or oversize delivery state is preserved rather than reset', f => {
            const input = event(f.root);
            const paths = advisory.deliveryPaths(trackingContext(f.root), input);
            for (const bytes of [Buffer.from('{'), Buffer.from(JSON.stringify({ version: 99, contexts: [] })), Buffer.alloc(advisory.MAX_STATE_BYTES + 1)]) {
                fs.writeFileSync(paths.file, bytes);
                assert.equal(launch(f.root, input).stdout, '');
                assert.deepEqual(fs.readFileSync(paths.file), bytes);
            }
        }),
        technical('full hash receipt bound discloses unavailable guidance through silence without eviction', f => {
            const input = event(f.root);
            const paths = advisory.deliveryPaths(trackingContext(f.root), input);
            const state = JSON.stringify({ version: 1, contexts: Array.from({ length: advisory.MAX_CONTEXTS }, (_, index) => ({
                hash: digest(Buffer.from(`previous-context-${index}`)), status: 'delivered' })) });
            fs.writeFileSync(paths.file, state);
            assert.equal(launch(f.root, input).stdout, '');
            assert.equal(fs.readFileSync(paths.file, 'utf8'), state, 'Bounded receipt state cannot evict delivery credit and cause duplicates');
        }),
        technical('an interrupted pending output reservation is not fabricated as fresh or delivered proof', f => {
            // Deliberate fail-safe state: a crash after reservation and before callback leaves pending.
            const input = event(f.root);
            const selected = advisory.eligibleNotice(input, { env: cleanEnv(f.root) });
            assert.ok(selected);
            const paths = advisory.deliveryPaths(selected.context, input);
            const state = JSON.stringify({ version: 1, contexts: [{ hash: selected.contextHash, status: 'pending' }] });
            fs.writeFileSync(paths.file, state);
            assert.equal(launch(f.root, input).stdout, '');
            assert.equal(fs.readFileSync(paths.file, 'utf8'), state);
        }),
        technical('delivery receipts retain hashes without raw prompts or secrets', f => {
            const prompt = `${REQUEST}; private fixture note secret-sentinel-never-store`;
            const input = event(f.root, prompt);
            oneNotice(launch(f.root, input).stdout);
            const paths = advisory.deliveryPaths(trackingContext(f.root), input);
            const text = fs.readFileSync(paths.file, 'utf8');
            assert.ok(!text.includes(prompt) && !text.includes('secret-sentinel-never-store'));
            const state = JSON.parse(text);
            assert.equal(state.contexts.length, 1);
            assert.equal(state.contexts[0].status, 'delivered');
            assert.match(state.contexts[0].hash, /^[a-f0-9]{64}$/);
        }),
        technical('invalid input and boundary overrun remain nonblocking and silent', f => {
            for (const input of [null, [], {}, { ...event(f.root), session_id: '' }, { ...event(f.root), agent_id: {} },
                { ...event(f.root), hook_event_name: 'PostToolUse' }, event(f.root, REQUEST + 'x'.repeat(advisory.MAX_PROMPT_CHARS)),
                { ...event(f.root), session_id: 'x'.repeat(513) }]) assert.equal(launch(f.root, input).stdout, '');
            const malformed = launch(f.root, '{"prompt":"secret-fixture-value"');
            assert.equal(malformed.stdout, '');
            assert.ok(!malformed.stderr.includes('secret-fixture-value'));
            assert.equal(launch(f.root, ' '.repeat(131073)).stdout, '', 'Entry input budget must reject oversized host payloads');
            assert.equal(fs.existsSync(path.join(f.root, 'tmp/workflow-routing')), false);
        }),
        technical('canonical registration installs one bounded prompt notice without tool permission mutation', f => {
            const settings = JSON.parse(fs.readFileSync(path.join(FRAMEWORK_DIR, 'settings.json'), 'utf8'));
            const name = '/.claude/hooks/task-tracking-route.cjs';
            const registrations = settings.hooks.UserPromptSubmit.flatMap(group => group.hooks).filter(hook => hook.command.includes(name));
            assert.equal(registrations.length, 1);
            assert.equal(registrations[0].type, 'command');
            assert.equal(registrations[0].timeout, 3);
            assert.ok(registrations[0].command.includes('$CLAUDE_PROJECT_DIR'));
            for (const [eventName, groups] of Object.entries(settings.hooks)) {
                if (eventName !== 'UserPromptSubmit') assert.equal(groups.flatMap(group => group.hooks).filter(hook => hook.command.includes(name)).length, 0);
            }
            const adopter = write(f.root, '.claude/settings.json', JSON.stringify({ permissions: { deny: ['Skill(task-track)'] }, hooks: {}, unmanaged: 'preserve' }));
            const before = fs.readFileSync(adopter);
            // Direct launch does not simulate native permission enforcement; the denial remains owner controlled.
            oneNotice(launch(f.root, event(f.root)).stdout);
            assert.deepEqual(fs.readFileSync(adopter), before);
        }),
        technical('direct and require-main-undefined launchers share the genuine eligible entry boundary', f => {
            oneNotice(launch(f.root, event(f.root)).stdout);
            oneNotice(launch(f.root, event(f.root, REQUEST, { session_id: 'require-entry' }), { requireLauncher: true }).stdout);
            assert.equal(launch(f.root, event(f.root, REQUEST, { session_id: 'require-entry' }), { requireLauncher: true }).stdout, '');
        }),
        technical('nested cwd resolves the selected copied project rather than an authoring root', f => {
            const nested = path.join(f.root, 'src/nested'); fs.mkdirSync(nested, { recursive: true });
            const input = event(nested);
            oneNotice(launch(f.root, input, { cwd: nested, env: { CLAUDE_PROJECT_DIR: undefined } }).stdout);
            assert.equal(launch(f.root, event(f.root)).stdout, '', 'Normalized root keeps the same delivered context');
            assert.equal(launch(f.root, event(f.root), { env: { CLAUDE_PROJECT_DIR: 'relative-root' } }).stdout, '', 'Invalid explicit root cannot fall back into another project');
        }),
        technical('unavailable receipt directory remains untouched and preserves primary work', f => {
            const blocked = write(f.root, 'tmp/workflow-routing', 'Adopter-owned regular file');
            const before = fs.readFileSync(blocked);
            assert.equal(launch(f.root, event(f.root)).stdout, '');
            assert.deepEqual(fs.readFileSync(blocked), before, 'Optional receipt storage cannot overwrite foreign content');
        }),
        technical('path alias preserves checkout identity without link-based receipt write authority', f => {
            const alias = path.join(f.root, 'checkout-alias');
            // Windows junctions use the same identity check; creation denied by host is an explicit evidence gap.
            try { fs.symlinkSync(f.root, alias, process.platform === 'win32' ? 'junction' : 'dir'); }
            catch (error) {
                if (process.platform === 'win32' && ['EPERM', 'EACCES'].includes(error.code)) {
                    throw new Error(`ENVIRONMENT-BLOCKED: Windows junction fixture unavailable (${error.code})`);
                }
                throw error;
            }
            oneNotice(launch(f.root, event(alias), { env: { CLAUDE_PROJECT_DIR: alias } }).stdout);
            assert.equal(launch(f.root, event(f.root)).stdout, '');
            const foreign = write(f.root, 'foreign-receipt.json', 'Do not overwrite');
            const input = event(f.root, 'Help inspect task concerns', { session_id: 'linked-receipt' });
            const paths = advisory.deliveryPaths(trackingContext(f.root), input);
            fs.symlinkSync(foreign, paths.file, 'file');
            assert.equal(launch(f.root, input).stdout, '');
            assert.equal(fs.readFileSync(foreign, 'utf8'), 'Do not overwrite');
            assert.equal(fs.lstatSync(paths.file).isSymbolicLink(), true);
        }),
        technical('simultaneous genuine deliveries produce exactly one useful notice for one context', async f => {
            const input = JSON.stringify(event(f.root));
            const hook = path.join(f.root, '.claude/hooks/task-tracking-route.cjs');
            const run = () => new Promise((resolve, reject) => {
                const child = spawn(process.execPath, [hook], { cwd: f.root, env: cleanEnv(f.root), shell: false, windowsHide: true });
                let stdout = ''; let stderr = ''; let timedOut = false;
                const timer = setTimeout(() => { timedOut = true; child.kill(); }, 10000);
                child.stdout.on('data', bytes => { stdout += bytes; });
                child.stderr.on('data', bytes => { stderr += bytes; });
                child.once('error', error => { clearTimeout(timer); reject(error); });
                child.once('close', code => { clearTimeout(timer);
                    code === 0 && !timedOut ? resolve(stdout) : reject(new Error(timedOut ? 'Advisory child exceeded configured fixture budget' : stderr || `Exit ${code}`)); });
                child.stdin.end(input);
            });
            const results = await Promise.allSettled([run(), run()]);
            for (const result of results) assert.equal(result.status, 'fulfilled', result.reason?.message);
            const outputs = results.map(result => result.value);
            assert.equal(outputs.filter(Boolean).length, 1);
            oneNotice(outputs.join(''));
            assert.equal(launch(f.root, event(f.root)).stdout, '');
        })
    ]
};
