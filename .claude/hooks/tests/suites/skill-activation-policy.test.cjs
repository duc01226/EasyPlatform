'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const { childEnv } = require('../lib/hook-runner.cjs');
const hook = require('../../skill-activation-inject.cjs');
const routing = require('../../../scripts/lib/workflow-routing-config.cjs');
const { validateConfig } = require('../../lib/project-config-schema.cjs');
const { validateCkConfig } = require('../../lib/ck-config-schema.cjs');
const routeHook = require('../../lib/workflow-route-delivery.cjs');
const HOOKS_DIR = path.resolve(__dirname, '..', '..');

function withFixture(fn) {
    const temp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'skill-policy-')));
    const root = path.join(temp, 'project');
    fs.mkdirSync(root);
    const targetHooks = path.join(root, '.claude', 'hooks');
    fs.mkdirSync(targetHooks, { recursive: true });
    fs.cpSync(path.join(HOOKS_DIR, 'lib'), path.join(targetHooks, 'lib'), { recursive: true });
    for (const name of ['skill-activation-inject.cjs', 'commit-skill-route.cjs']) fs.copyFileSync(path.join(HOOKS_DIR, name), path.join(targetHooks, name));
    fs.cpSync(path.resolve(HOOKS_DIR, '..', 'scripts', 'lib'), path.join(root, '.claude', 'scripts', 'lib'), { recursive: true });
    const write = (rel, value) => {
        const file = path.join(root, ...rel.split('/'));
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, JSON.stringify(value));
    };
    const env = childEnv({ HOME: temp, USERPROFILE: temp, TMPDIR: temp, TEMP: temp, TMP: temp });
    for (const key of Object.keys(env)) if (/^(CK_|CLAUDE_|CODEX_|OPENCODE_|NODE_OPTIONS$)/i.test(key)) delete env[key];
    env.CLAUDE_PROJECT_DIR = root;
    const fx = { temp, root, write, env, options: { rootDir: root, env: {}, homeDir: temp } };
    return import(pathToFileURL(path.resolve(HOOKS_DIR, '..', 'scripts', 'codex', 'sync-hooks.mjs')).href)
        .then(({ normalizeCommand }) => {
            fx.codexCommand = file => normalizeCommand(`node "$CLAUDE_PROJECT_DIR"/.claude/hooks/${file}`);
            return fn(fx);
        }).finally(() => fs.rmSync(temp, { recursive: true, force: true }));
}

const settings = enabled => ({ portability: { skillAutoTrigger: enabled } });
const prompt = { hook_event_name: 'UserPromptSubmit', session_id: 'policy-session', prompt: 'fix this bug' };
function runProcess(fx, input, host = 'claude', file = 'skill-activation-inject.cjs') {
    const options = { cwd: fx.root, env: fx.env, encoding: 'utf8', timeout: 10000 };
    const entry = path.join(HOOKS_DIR, file);
    const result = host === 'codex'
        ? spawnSync(fx.codexCommand(file), { ...options, shell: true, input: JSON.stringify(input) })
        : spawnSync(process.execPath, [entry], { ...options, input: JSON.stringify(input) });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout;
}

module.exports = {
    name: 'skill-activation-policy',
    tests: [
        { name: 'TC-SAP-001 default, invalid and absent policy preserve automatic behavior', fn: () => withFixture(fx => {
            assert.equal(routing.resolveSkillAutoTrigger(fx.options).enabled, true);
            for (const value of ['false', null, 0, {}, []]) {
                fx.write('docs/project-config.json', settings(value));
                assert.equal(routing.resolveSkillAutoTrigger(fx.options).enabled, true);
            }
            assert.equal(runProcess(fx, prompt), '');
            fs.writeFileSync(path.join(fx.root, 'docs', 'project-config.json'), '{broken');
            assert.equal(routing.resolveSkillAutoTrigger(fx.options).enabled, true);
        }) },
        { name: 'TC-SAP-002 team, user, checkout and environment precedence support both booleans', fn: () => withFixture(fx => {
            fx.write('docs/project-config.json', settings(false));
            assert.equal(routing.resolveSkillAutoTrigger(fx.options).source, 'project-config');
            fs.mkdirSync(path.join(fx.temp, '.claude'));
            fs.writeFileSync(path.join(fx.temp, '.claude', '.ck.json'), JSON.stringify(settings(true)));
            assert.equal(routing.resolveSkillAutoTrigger(fx.options).enabled, true);
            fx.write('.claude/.ck.local.json', settings(false));
            assert.equal(routing.resolveSkillAutoTrigger(fx.options).source, 'local-override');
            for (const value of ['1', 'true', 'on', 'yes', 'enabled', '"true"']) {
                assert.equal(routing.resolveSkillAutoTrigger({ ...fx.options, env: { CK_SKILL_AUTO_TRIGGER: value } }).enabled, true);
            }
            for (const value of ['0', 'false', 'off', 'no', 'disabled']) {
                assert.equal(routing.resolveSkillAutoTrigger({ ...fx.options, env: { CK_SKILL_AUTO_TRIGGER: value } }).source, 'environment');
            }
            assert.equal(routing.resolveSkillAutoTrigger({ ...fx.options, env: { CK_SKILL_AUTO_TRIGGER: 'unknown' } }).source, 'local-override');
            assert.equal(routing.resolveSkillAutoTrigger({ ...fx.options, scope: 'team' }).source, 'project-config');
            fx.write('.claude/.ck.local.json', settings('false'));
            assert.equal(routing.resolveSkillAutoTrigger(fx.options).source, 'user-config');
        }) },
        { name: 'TC-SAP-002 relocated configuration and editor encodings preserve the team decision', fn: () => withFixture(fx => {
            fx.write('.claude/.ck.json', { portability: { projectConfigPath: 'configuration/team.json' } });
            fx.write('configuration/team.json', settings(false));
            const file = path.join(fx.root, 'configuration', 'team.json');
            for (const bytes of [Buffer.from('\ufeff' + JSON.stringify(settings(false))), Buffer.concat([Buffer.from([255, 254]), Buffer.from(JSON.stringify(settings(false)), 'utf16le')])]) {
                fs.writeFileSync(file, bytes);
                assert.equal(routing.resolveSkillAutoTrigger(fx.options).enabled, false);
            }
        }) },
        { name: 'TC-SAP-003 ordinary prompts receive skill choice and scoped restriction through Claude and Codex launchers', fn: () => withFixture(fx => {
            // Given a restricted preference and ordinary requests with potentially suitable skills.
            fx.write('docs/project-config.json', settings(false));
            for (const host of ['claude', 'codex']) {
                for (const [i, text] of ['fix this bug', 'review these changes', 'implement this feature', 'explain this function'].entries()) {
                    // When the real host launcher delivers prompt context.
                    const context = JSON.parse(runProcess(fx, { ...prompt, session_id: `${host}-ordinary-${i}`, prompt: text }, host)).hookSpecificOutput.additionalContext;
                    // Then the human chooses skill execution or direct work before any activation.
                    assert.match(context, /ask ONE skill-choice question before loading or executing it/);
                    assert.match(context, /Use ask user tool to ask user when available, otherwise ask in plain text/);
                    assert.match(context, /name the best-fit skill and briefly explain why it fits/);
                    assert.match(context, /Run the matched skill.*Skip the skill and execute directly/);
                    assert.match(context, /Stop and wait for the human answer; never infer confirmation from silence/);
                    assert.match(context, /If no suitable restricted skill matches, execute directly without a skill-choice question/);
                    assert.match(context, /human confirms the matched candidate/);
                    assert.match(context, /already authorized by \(1\), \(2\) or \(4\)/);
                    assert.match(context, /Confirmation authorizes only the selected skill and its required dependencies/);
                    assert.match(context, /If the human chooses Skip, execute the task directly without that skill or an unrelated replacement/);
                    assert.match(context, /keep required quality and safety checks/);
                    assert.match(context, /Do not re-ask the skill-choice question for the same task on follow-up, delegation or resume/);
                    assert.match(context, /preserve the answer and authorized scope in task state and delegated briefs/);
                    assert.match(context, /Explicit named requests, already authorized required calls\/steps and the exempt entry skills above need no skill-choice question/);
                    assert.ok(context.length < 9500, 'policy must fit one host context message');
                    assert.match(context, /auto-trigger is DISABLED/);
                    assert.match(context, /generic request to fix, implement, explain or review is NOT permission/);
                    assert.match(context, /Exceptions: commit and pull-request/);
                    assert.match(context, /prompt classifiers and automatic activation\/matching reminders do not create an operation-specific call/);
                }
            }
        }) },
        { name: 'TC-SAP-004 commit route and configured review chain remain eligible without a test/review question', fn: () => withFixture(fx => {
            fx.write('docs/project-config.json', settings(false));
            for (const host of ['claude', 'codex']) {
                const context = JSON.parse(runProcess(fx, { ...prompt, session_id: `${host}-commit`, prompt: 'commit this' }, host)).hookSpecificOutput.additionalContext;
                assert.match(context, /required dependency\/step of a skill or workflow already authorized/);
                assert.match(context, /review selected by the user or the commit decision policy authorizes its workflow and required nested reviewers/);
                assert.match(context, /Selection eligibility is not a skip approval or Git authority/);
                assert.match(context, /never ask the human whether to run tests or review; classify the candidate, decide, act and record/);
                assert.match(context, /resolve commit.reviewMode through .claude\/scripts\/lib\/commit-review-policy.cjs/);
                assert.match(context, /default lightweight selects commit-review at every commit risk tier/);
                assert.match(context, /Configured risk-based mode and PR whole-branch scope use Low skip \/ Medium why-review \/ High changes-review/);
                assert.match(context, /Each review has at most two rounds/);
                assert.match(context, /Selected test\/review skills and their required nested calls remain eligible/);
                assert.match(context, /explicitly requested workflow authorizes its required skill steps/);
                assert.match(context, /todo\/task plan and executed later or after resume/);
                assert.match(context, /Each authorized step may call its required nested skills without a new request/);
                assert.match(context, /Workflow-declared optional steps scheduled by the authorized workflow are eligible/);
                assert.match(runProcess(fx, { ...prompt, prompt: 'commit this' }, host, 'commit-skill-route.cjs'), /MUST run[\s\S]*commit/);
            }
            assert.match(hook.buildPolicy({ enabled: false, source: 'test' }), /human explicitly asks.*by name or command/);
        }) },
        { name: 'TC-SAP-011 repeated commit and PR prompts retain the automatic decision and fresh-evidence rules on recovery', fn: () => withFixture(fx => {
            fx.write('docs/project-config.json', settings(false));
            for (const host of ['claude', 'codex']) {
                const events = [
                    ...Array.from({ length: 12 }, (_, i) => ({ ...prompt, prompt: i % 2 ? 'create a pull request' : 'commit this' })),
                    ...['resume', 'compact'].map(source => ({ ...prompt, hook_event_name: 'SessionStart', source })),
                    { ...prompt, hook_event_name: 'SubagentStart', agent_id: 'pr-reviewer' }
                ];
                for (const event of events) {
                    const context = JSON.parse(runProcess(fx, { ...event, session_id: `${host}-continuity` }, host)).hookSpecificOutput.additionalContext;
                    assert.equal(context, hook.buildPolicy({ enabled: false, source: 'project-config' }),
                        'every ordinary and recovery event must carry the complete current policy');
                    assert.match(context, /Commit follows its concise skill; pull-request follows \.claude\/skills\/pull-request\/references\/check-policy\.md/);
                    assert.match(context, /never ask the human whether to run tests or review/);
                    assert.match(context, /skip only when the affected tests already passed this session for unchanged content or the change is really small/);
                    assert.match(context, /otherwise run scoped tests and fix failures until all pass/);
                    assert.match(context, /Findings still open at that cap, a check that cannot go green or ambiguous intent stop the operation before the commit with a report/);
                    assert.match(context, /An explicit human instruction about tests or review overrides the automatic choice/);
                    assert.match(context, /Never describe skipped work as passed/);
                    assert.doesNotMatch(context, /ask initially|human-answer baseline|recorded preferences/,
                        'the retired question-frequency policy must not return');
                    assert.match(context, /changed content needs current evidence\/receipts, not a transferred Skip/);
                    assert.match(context, /Explicit user constraints, pending questions and existing host permissions still apply/);
                    assert.doesNotMatch(context, /MUST ask the human about tests and review/);
                }
            }
        }) },
        { name: 'TC-SAP-012 full policy retries failed writes and replays after mode, source and context changes', fn: () => withFixture(async fx => {
            fx.write('docs/project-config.json', settings(false));
            const deps = { projectDir: fx.root, env: {}, homeDir: fx.temp, write: (text, done) => done(true) };
            const read = output => JSON.parse(output).hookSpecificOutput.additionalContext;
            const full = output => assert.equal(read(output), hook.buildPolicy({ enabled: false, source: 'project-config' }));
            // A live or interrupted peer claim is not proof that full guidance reached this context.
            const ledger = require('../../lib/convention-ledger.cjs');
            const store = routing.resolveSessionStoreRoot(fx.root);
            const peer = { ...prompt, session_id: 'peer-delivery' };
            const lock = ledger.lockFile(store, peer.session_id, ledger.scopeFor(peer), hook.HOOK_NAME);
            const token = ledger.acquireLock(lock, Date.now());
            assert.ok(token, 'fixture must hold a live delivery claim');
            try {
                assert.equal(await hook.run(peer, { ...deps, write: (text, done) => done(false) }), '');
                full(await hook.run(peer, deps));
                assert.equal(ledger.readRecord(store, peer.session_id, ledger.scopeFor(peer), hook.HOOK_NAME), null,
                    'fallback delivery must not claim or replace a peer-owned record');
            } finally {
                ledger.releaseLock(lock, token);
            }
            full(await hook.run(peer, deps));
            full(await hook.run(peer, deps));
            // Recovery cannot depend on deleting a readable old record (ACL/read-only directory).
            const recovery = { ...prompt, session_id: 'undeletable-recovery' };
            full(await hook.run(recovery, deps));
            const oldRecord = ledger.recordFile(store, recovery.session_id, ledger.scopeFor(recovery), hook.HOOK_NAME);
            // Seed obsolete presence credit independently: policy delivery no longer creates it.
            ledger.writeRecordAtomic(store, recovery.session_id, ledger.scopeFor(recovery), hook.HOOK_NAME, {
                hash: require('node:crypto').createHash('sha256').update(hook.buildPolicy({ enabled: false, source: 'project-config' })).digest('hex'),
                deliveredAt: Date.now(), transcriptBytes: 0, form: 'full'
            });
            assert.ok(fs.existsSync(oldRecord), 'old presence credit must actually exist');
            const remove = fs.rmSync;
            try {
                fs.rmSync = (target, ...args) => {
                    if (String(target) === oldRecord) throw Object.assign(new Error('record deletion denied'), { code: 'EACCES' });
                    return remove(target, ...args);
                };
                for (const source of ['resume', 'startup', 'clear', 'compact']) {
                    const event = { ...recovery, hook_event_name: 'SessionStart', source };
                    assert.equal(await hook.run(event, { ...deps, write: (text, done) => done(false) }), '');
                    assert.equal(read(await hook.run(recovery, deps)), hook.buildPolicy({ enabled: false, source: 'project-config' }),
                        `${source}: ordinary prompt after failed recovery must replay the full policy`);
                    assert.equal(read(await hook.run(event, deps)), hook.buildPolicy({ enabled: false, source: 'project-config' }), source);
                }
            } finally { fs.rmSync = remove; }
            assert.equal(await hook.run(prompt, { ...deps, write: (text, done) => done(false) }), '');
            full(await hook.run(prompt, deps));
            full(await hook.run(prompt, deps));
            assert.match(read(await hook.run(prompt, { ...deps, env: { CK_SKILL_AUTO_TRIGGER: 'false' } })), /ask ONE skill-choice question/);
            assert.match(read(await hook.run(prompt, { ...deps, env: { CK_SKILL_AUTO_TRIGGER: 'true' } })), /replaces the earlier restricted/);
            full(await hook.run(prompt, deps));
            // A failed automatic reset cannot consume this context's pending restriction.
            const failedReset = { ...prompt, session_id: 'failed-reset-proof' };
            full(await hook.run(failedReset, deps));
            const automatic = { ...deps, env: { CK_SKILL_AUTO_TRIGGER: 'true' } };
            assert.equal(await hook.run(failedReset, { ...automatic, write: (text, done) => done(false) }), '');
            assert.equal(ledger.readSessionState(store, failedReset.session_id,
                `${hook.HOOK_NAME}-${ledger.scopeFor(failedReset)}`).enabled, false);
            assert.match(read(await hook.run(failedReset, automatic)), /replaces the earlier restricted/);
            assert.equal(await hook.run(failedReset, automatic), '');
            // Hosts without agent IDs still start child contexts; their reset cannot mark main present.
            const anonymousScope = { ...prompt, session_id: 'anonymous-scope-proof' };
            full(await hook.run(anonymousScope, deps));
            await hook.run({ ...anonymousScope, hook_event_name: 'SubagentStart', agent_id: undefined }, automatic);
            assert.match(read(await hook.run(anonymousScope, automatic)), /replaces the earlier restricted/);
            assert.equal(await hook.run(anonymousScope, automatic), '');
            const transcript = path.join(fx.temp, 'transcript.jsonl');
            fs.writeFileSync(transcript, '');
            const growing = { ...prompt, session_id: 'growth', transcript_path: transcript };
            full(await hook.run(growing, deps));
            fs.appendFileSync(transcript, 'x'.repeat(2300000));
            full(await hook.run(growing, deps));
            full(await hook.run(growing, deps));
            const compact = { ...growing, hook_event_name: 'SessionStart', source: 'compact' };
            full(await hook.run(compact, deps));
            fs.appendFileSync(transcript, '\n' + JSON.stringify({ type: 'system', subtype: 'compact_boundary', timestamp: new Date().toISOString() }) + '\n');
            full(await hook.run(growing, deps));
            for (const agent_id of ['agent-a', 'agent-b', undefined]) {
                full(await hook.run({ ...prompt, hook_event_name: 'SubagentStart', agent_id }, deps));
            }
            full(await hook.run(prompt, deps));
        }) },
        { name: 'TC-SAP-005 prompts, subagents and recovery refresh restrictions; config removal restores auto', fn: () => withFixture(fx => {
            fx.write('docs/project-config.json', settings(false));
            for (const event of [prompt, { ...prompt, hook_event_name: 'SubagentStart', agent_id: 'reviewer' }, ...['startup', 'resume', 'compact', 'clear'].map(source => ({ ...prompt, hook_event_name: 'SessionStart', source }))]) {
                const output = runProcess(fx, event);
                assert.match(output, /auto-trigger is DISABLED/);
                assert.match(output, /ask ONE skill-choice question/);
                assert.match(output, /Do not re-ask the skill-choice question for the same task/);
            }
            fs.unlinkSync(path.join(fx.root, 'docs', 'project-config.json'));
            assert.match(runProcess(fx, prompt), /replaces the earlier restricted selection policy/);
            assert.equal(runProcess(fx, prompt), '');
            assert.match(runProcess(fx, { ...prompt, hook_event_name: 'SubagentStart', agent_id: 'reviewer' }), /auto-trigger is enabled/);
        }) },
        { name: 'TC-SAP-005 unrelated events stay silent; missing session or ledger never loses restriction', fn: () => withFixture(fx => {
            fx.write('docs/project-config.json', settings(false));
            assert.equal(runProcess(fx, { ...prompt, hook_event_name: 'PreToolUse' }), '');
            assert.match(runProcess(fx, { ...prompt, session_id: undefined }), /auto-trigger is DISABLED/);
            fs.rmSync(path.join(fx.root, 'tmp'), { recursive: true, force: true });
            fs.writeFileSync(path.join(fx.root, 'tmp'), 'not a directory');
            assert.match(runProcess(fx, prompt), /auto-trigger is DISABLED/);
            assert.equal(runProcess(fx, null), '');
        }) },
        { name: 'TC-SAP-006 restricted skill mode suppresses competing workflow catalogs and selection questions', fn: () => withFixture(async fx => {
            fx.write('docs/project-config.json', { portability: { skillAutoTrigger: false, workflowRouteMode: 'auto' } });
            let output = '';
            const context = await routeHook.run(prompt, { projectDir: fx.root, env: {}, homeDir: fx.temp, write: (text, done) => { output += text; done(true); } });
            assert.match(context, /Do not self-route/);
            assert.match(output, /Named user requests and required hook\/protocol calls remain eligible/);
            assert.match(context, /follow the single skill-choice question in the skill activation policy/);
            assert.match(context, /user confirmation authorizes that candidate/);
            assert.doesNotMatch(output, /Workflow Catalog|full workflow.*custom route/);
            // The catalog is the route's second output: in restricted mode its hook writes nothing at all.
            let catalogOutput = '';
            const catalog = await routeHook.run(prompt, { part: 'catalog', projectDir: fx.root, env: {}, homeDir: fx.temp, write: (text, done) => { catalogOutput += text; done(true); } });
            assert.equal(catalog, '');
            assert.equal(catalogOutput, '', 'restricted skill mode must suppress the workflow catalog output');
        }) },
        { name: 'TC-SAP-002 project and personal schemas reject string booleans', fn: () => {
            for (const value of [false, true]) {
                assert.ok(!validateConfig(settings(value)).errors.some(error => /skillAutoTrigger/.test(error)));
                assert.equal(validateCkConfig(settings(value)).errors.length, 0);
            }
            assert.ok(validateConfig(settings('false')).errors.some(error => /skillAutoTrigger/.test(error)));
            assert.ok(validateCkConfig(settings('false')).errors.some(error => /skillAutoTrigger/.test(error)));
        } },
        { name: 'TC-SAP-008 prompt classifiers keep inline safety checks but cannot start heavy reviewers', fn: () => withFixture(fx => {
            fx.write('docs/project-config.json', settings(false));
            const deps = { projectDir: fx.root, env: {}, homeDir: fx.temp };
            const judgement = require('../../judgement-integrity-route.cjs').evaluate({ ...prompt, prompt: 'is this a good idea?' }, deps);
            assert.match(judgement, /keep this verdict self-check INLINE/);
            assert.doesNotMatch(judgement, /Escalate to `why-review/);
            const ai = require('../../ai-feature-route.cjs').evaluate({ ...prompt, prompt: 'review this RAG implementation' }, deps);
            assert.match(ai, /apply the gate inline; this prompt does not authorize a review skill\/agent/);
            assert.doesNotMatch(ai, /Review: `ai-engineering-review`/);
            assert.ok(ai.length <= require('../../ai-feature-route.cjs').MAX_DIRECTIVE_CHARS + 1);
        }) },
        { name: 'TC-SAP-009 framework configuration stays discoverable in restricted mode and minimal profiles', fn: () => {
            const skill = fs.readFileSync(path.resolve(HOOKS_DIR, '../skills/framework-config/SKILL.md'), 'utf8');
            assert.doesNotMatch(skill, /disable-model-invocation:\s*true|user-invocable:\s*false/);
            assert.match(skill, /description: .*asking about or configuring the .*skills framework/);
            assert.match(skill, /A question.*is read-only/);
            assert.match(skill, /Default write scope is \*\*checkout\*\*/);
            assert.match(skill, /Reset removes that key from the chosen layer/);
            assert.match(skill, /validateConfig\(candidate\)/);
            assert.match(skill, /validateCkConfig\(candidate\)/);
            assert.ok(JSON.parse(fs.readFileSync(path.resolve(HOOKS_DIR, '../config/skill-profiles.json'), 'utf8')).entrySkills.skills.includes('framework-config'));
            assert.match(hook.buildPolicy({ enabled: false, source: 'test' }), /framework-config entry is also eligible for automatic selection/);
            for (const old of ['ck-help', 'workflow-mode']) assert.equal(fs.existsSync(path.resolve(HOOKS_DIR, `../skills/${old}/SKILL.md`)), false);
            for (const mode of ['help', 'settings', 'workflow']) assert.match(skill, new RegExp(`## ${mode[0].toUpperCase() + mode.slice(1)} mode`));
        } },
        { name: 'TC-SAP-010 consolidated workflow mode preserves directives, session writes, resets and scope isolation', fn: () => withFixture(async fx => {
            for (const prefix of ['/', '$']) {
                const text = `${prefix}framework-config --mode=workflow off --scope=session`;
                assert.deepEqual(routing.parseRouteModeDirective(text), { mode: 'off', save: false });
                const context = await routeHook.run({ ...prompt, prompt: text }, { projectDir: fx.root, env: {}, homeDir: fx.temp, write: (text, done) => done(true) });
                assert.match(context, /Route mode directive applied: off for this session/);
                assert.equal(routing.readSessionRouteMode({ rootDir: fx.root, sessionId: prompt.session_id }), 'off');
            }
            assert.equal(routing.parseRouteModeDirective('/framework-config --mode=workflow off --scope=team'), null);
            assert.equal(routing.parseRouteModeDirective('explain /framework-config --mode=workflow off'), null);
            assert.deepEqual(routing.parseRouteModeDirective('/framework-config --mode=workflow auto --save'), { mode: 'auto', save: true });
            const script = path.join(fx.root, '.claude/scripts/workflow-mode.cjs');
            fs.copyFileSync(path.resolve(HOOKS_DIR, '../scripts/workflow-mode.cjs'), script);
            const run = args => spawnSync(process.execPath, [script, ...args, '--json'], { cwd: fx.root, env: fx.env, encoding: 'utf8' });
            const set = run(['ask', '--set-session', `--session=${prompt.session_id}`]);
            assert.equal(set.status, 0, set.stderr);
            assert.equal(JSON.parse(set.stdout).mode, 'ask');
            const reset = run(['--reset-session', `--session=${prompt.session_id}`]);
            assert.equal(reset.status, 0, reset.stderr);
            assert.equal(routing.readSessionRouteMode({ rootDir: fx.root, sessionId: prompt.session_id }), undefined);
            assert.equal(fs.existsSync(path.join(fx.temp, '.claude/.ck.json')), false);
            assert.equal(fs.existsSync(path.join(fx.root, '.claude/.ck.local.json')), false);
            assert.equal(run(['off', '--set-session']).status, 1);
        }) },
    ]
};
