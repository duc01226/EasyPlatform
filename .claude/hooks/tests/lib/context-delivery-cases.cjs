'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../../../..');
const config = require('../../lib/ck-config-loader.cjs');
const context = require('../../lib/context-delivery.cjs');
const universal = require('../../lib/universal-delivery.cjs');
const route = require('../../lib/workflow-route-delivery.cjs');
const delivery = require('../../lib/protocol-delivery.cjs');
const core = require('../../core-principles-inject.cjs');
const { childEnv } = require('./hook-runner.cjs');
const read = file => { try { return fs.readFileSync(file, 'utf8'); } catch { return null; } };
const FIXTURES = '.claude/hooks/tests/fixtures/context-delivery';
const PROTOCOLS = '.claude/skills/shared/protocols';
const PRINCIPLES = 'core-engineering-principles';
// Every case reads its personal settings from the fixture home, never from the developer's own.
const home = project => path.join(project, 'home');
const accept = (_, done) => done(true);

async function fixture(fn, withFramework = true) {
    const temp = path.join(root, 'tmp', 'context-delivery-tests');
    fs.mkdirSync(temp, { recursive: true });
    const project = fs.realpathSync(fs.mkdtempSync(path.join(temp, 'project-')));
    const shared = path.join(project, '.claude', 'skills', 'shared');
    fs.mkdirSync(shared, { recursive: true });
    if (withFramework) {
        for (const name of ['protocols', 'protocol-groups.json', 'workflow-first-gate.md', 'sync-inline-versions.md']) {
            fs.cpSync(path.join(root, '.claude', 'skills', 'shared', name), path.join(shared, name), { recursive: true });
        }
        fs.copyFileSync(path.join(root, '.claude', 'workflows.json'), path.join(project, '.claude', 'workflows.json'));
    }
    const set = value => fs.writeFileSync(path.join(project, '.claude', '.ck.local.json'), JSON.stringify(value));
    try { return await fn({ project, shared, set, homeDir: home(project) }); }
    finally { fs.rmSync(project, { recursive: true, force: true }); }
}
const event = (project, extra = {}) => ({ cwd: project, hook_event_name: 'UserPromptSubmit', session_id: 'test', prompt: 'Correct the local spelling.', ...extra });
const deliver = (project, input, ok = true, number = 1) => universal.runHook(number, { input, projectRoot: project, homeDir: home(project), write: (_, done) => done(ok), now: 100000 });

/** What `fn` wrote to console.error: diagnostics are asserted, never printed. */
function capturedErrors(fn) {
    const messages = []; const original = console.error; console.error = text => messages.push(String(text));
    try { fn(); } finally { console.error = original; }
    return messages;
}

/** A converted skill whose guide block declares `tag`: the shape a skill load delivers a protocol to. */
function declareSkill(project, name, tag) {
    const row = JSON.parse(read(path.join(project, PROTOCOLS, 'index.json'))).tags.find(item => item.tag === tag);
    const guide = require('../../../scripts/lib/protocol-guide-carrier.cjs');
    const dir = path.join(project, '.claude', 'skills', name);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'SKILL.md'), ['---', `name: ${name}`, 'description: Fixture skill.', '---', '', guide.GUIDE_BLOCK_START,
        guide.formatGuideLine({ tag, summary: row.summary, when: row.when, path: row.file }), guide.GUIDE_BLOCK_END, ''].join('\n'));
}
/** A skill load through the real protocol group entry. */
const loadSkill = (project, name, extra = {}) => delivery.runHook('design', {
    input: { cwd: project, hook_event_name: 'PostToolUse', tool_name: 'Skill', tool_input: { skill: name }, ...extra },
    projectRoot: project, homeDir: home(project), now: 100000, write: accept });

function evidenceControl(manifest, evaluator) {
    const options = { policyHashes: { compatible: 'a'.repeat(64), concise: 'b'.repeat(64) }, sourceHash: 'c'.repeat(64), bundleHash: 'f'.repeat(64), deterministicPassed: true,
        nativeEvidence: manifest.requiredPlatforms.flatMap(platform => manifest.requiredHosts.map(host => ({ platform, host, passed: true, sourceHash: 'c'.repeat(64) }))) };
    const records = manifest.cases.flatMap(task => [1, 2, 3].flatMap(trial => ['compatible', 'concise'].map(profile => ({
        caseId: task.id, trial, profile, manifestHash: evaluator.sha256(JSON.stringify(manifest)), policyHash: options.policyHashes[profile], worldHash: manifest.worldHashes[task.id], trajectoryHash: 'd'.repeat(64),
        sourceHash: options.sourceHash, bundleHash: options.bundleHash, grader: 'fixture-oracle-v4', observationComplete: true, success: true, violations: [], inputTokens: profile === 'concise' ? 100 : 200, outputTokens: 20, latencyMs: 10, discoveryCalls: 1, model: 'synthetic-validator-fixture', settingsHash: 'e'.repeat(64), host: 'codex', platform: 'darwin'
    }))));
    return { options, records };
}

const DISPOSITIONS = ['merge', 'merge-and-relax-method', 'defer', 'remove-wrapper'];
// The four method relaxations the concise profile is approved to make.
const RELAXATIONS = ['fixed-quota', 'compulsory-delegation', 'repetitive-reporting', 'unconditional-lesson-extraction'];
const CONCISE_FILES = [`${PROTOCOLS}/concise-agent-core.md`, `${PROTOCOLS}/concise-workflow-route.md`];
const PROTOCOL_INDEX = `${PROTOCOLS}/index.json`;
const CATALOG_COMMAND = '.claude/scripts/workflow-catalog.cjs';
// A line that only frames text: a marker, a heading, a blank quote line or a table separator.
const isPresentation = text => {
    const rest = text.replace(/^>\s?/, '').trim();
    return rest === '' || /^<!--[^]*-->$/.test(rest) || /^#{1,6}\s/.test(rest) || /^\|(?:\s*:?-{3,}:?\s*\|)+$/.test(rest);
};
// Clauses once labelled retained while the concise text omitted them, each with terms the concise text
// carries only when it really states the clause.
const ONCE_MISLABELLED = [
    ['**Provision missing dependencies.**', ['sudo', 'system Python']],
    ['When you write or update a doc an agent reads', ['discoverable']],
    ['**First Principles:**', ['First Principles']],
    ['**AI Attention principle (Primacy-Recency):**', ['Primacy-Recency']],
    ['Nested workflows use a sub-agent', ['Nested workflows', 'one level']],
    ['**Route by phase.**', ['phase you are']],
    ['| edit or write code |', ['backend-patterns-reference.md']],
    ['**Self-check before claiming done:**', ['how many edit sites', 'what breaks', 'which test goes red']],
];
// The words the concise method policy uses for each approved relaxation.
const RELAXATION_TERMS = {
    'fixed-quota': 'Fixed confidence/sibling quotas',
    'compulsory-delegation': 'compulsory delegation',
    'repetitive-reporting': 'repeated reporting templates',
    'unconditional-lesson-extraction': 'unconditional lesson extraction',
};

/**
 * Why a retained rule's anchors do not prove its label, or nothing when they do. An anchor is a phrase
 * of three or more words, chosen by review as the wording that states the rule's primary requirement;
 * `carrier` is the text of the rule's destination.
 */
function anchorProblems(rule, carrier) {
    const anchors = Array.isArray(rule.anchors) ? rule.anchors : [];
    if (!anchors.length) return ['a retained rule names the phrase that states it'];
    return anchors.flatMap(anchor => [
        ...(typeof anchor === 'string' && anchor.trim().split(/\s+/).length >= 3 ? [] : [`"${anchor}" is under three words`]),
        ...(typeof anchor === 'string' && carrier.includes(anchor) ? [] : [`${rule.destination} does not carry "${anchor}"`]),
    ]);
}

/**
 * The clause map: every nonblank line of the frozen compatible payloads has one disposition. Proved here:
 * the map covers exactly those lines and the concise text it was reviewed against; a wrapper is a
 * presentation line and nothing else is; a relaxation is one of the approved four and the concise method
 * policy names it; every substantive line's own text is held by a file the concise text reaches; every
 * retained line names at least one anchor phrase and its destination text carries each one. Not proved:
 * that the anchored wording means the same as the original line (a reviewed judgement; the paired
 * evaluation measures behaviour under it).
 */
function assertRuleDispositions(baseline, rendered, sha256) {
    const map = JSON.parse(read(path.join(root, FIXTURES, 'rule-dispositions.json')));
    const units = baseline.payloads.flatMap(payload => payload.text.split('\n').map((text, line) => ({ id: `${payload.id}:${line + 1}`, text })).filter(row => row.text.trim()));
    assert.deepEqual(map.sourceHashes, Object.fromEntries(baseline.payloads.map(payload => [payload.id, sha256(payload.text)])), 'the map covers exactly the frozen compatible payloads');
    const policy = [context.CORE_TAG, context.ROUTE_TAG].map(tag => context.readConciseProtocol(root, tag));
    assert.ok(policy.every(text => typeof text === 'string'), 'both concise policy texts are readable');
    assert.ok(read(path.join(root, CONCISE_FILES[0])).replace(/\r?\n/g, '\r\n').length <= 9000, 'the concise core fits its reader limit on a CRLF checkout');
    assert.equal(map.policyVersion, sha256(policy.join('\n')), 'the concise policy text changed: review every disposition against it, then record this policyVersion');
    assert.deepEqual(Object.keys(map.dispositions), DISPOSITIONS);
    assert.deepEqual(map.relaxations, RELAXATIONS);
    assert.deepEqual(Object.keys(RELAXATION_TERMS), RELAXATIONS);
    const methodPolicy = policy[0].split('\n').find(line => line.startsWith('**Concise method policy:**')) || '';
    assert.ok(methodPolicy.includes('are recommendations, not gates'), 'the concise core states its relaxations as recommendations');
    assert.deepEqual(map.rules.map(rule => rule.id), units.map(unit => unit.id), 'one rule per source line, in order');

    // What a concise session receives, and the files it can reach from that text.
    const delivered = rendered.profiles.concise.payloads.map(row => row.text).join('\n');
    assert.ok(delivered.includes(PROTOCOL_INDEX), 'the concise text names the retrieval path of deferred rules');
    const indexed = new Set(JSON.parse(read(path.join(root, PROTOCOL_INDEX))).tags.flatMap(row => [row.file, ...row.parts.map(part => part.file)]));
    const reachable = file => delivered.includes(file) || (delivered.includes(PROTOCOL_INDEX) && indexed.has(file));
    const holds = (file, text) => (file === CATALOG_COMMAND ? rendered.profiles.concise.laterCatalog : String(read(path.join(root, file))).replace(/\r\n/g, '\n')).split('\n').includes(text);
    const byText = fragment => {
        const unit = units.find(row => row.text.includes(fragment));
        assert.ok(unit, `baseline line: ${fragment}`);
        return map.rules.find(rule => rule.id === unit.id);
    };

    units.forEach((unit, position) => {
        const rule = map.rules[position];
        assert.equal(rule.sha256, sha256(unit.text), unit.id);
        assert.ok(DISPOSITIONS.includes(rule.disposition), `${unit.id}: ${rule.disposition}`);
        assert.equal(rule.disposition === 'remove-wrapper', isPresentation(unit.text), `${unit.id}: a wrapper is a presentation line and nothing else is`);
        const relaxed = rule.disposition === 'merge-and-relax-method';
        assert.equal(Array.isArray(rule.relaxes) && rule.relaxes.length > 0 && rule.relaxes.every(name => RELAXATIONS.includes(name)), relaxed, `${unit.id}: only a relaxed rule names approved relaxations`);
        if (rule.disposition === 'remove-wrapper') return assert.equal(rule.destination, null, unit.id);
        if (rule.disposition === 'defer') {
            assert.equal(rule.anchors, undefined, `${unit.id}: only a retained rule names anchors`);
            assert.ok(typeof rule.readWhen === 'string' && rule.readWhen.trim(), `${unit.id}: a deferred rule states its trigger`);
            assert.ok(reachable(rule.destination), `${unit.id}: the concise text reaches ${rule.destination}`);
            return assert.ok(holds(rule.destination, unit.text), `${unit.id}: ${rule.destination} holds the deferred line`);
        }
        // Retained: its destination carries the anchors — a concise policy file, or the delivered text
        // for a line the route renderer emits.
        assert.ok(fs.existsSync(path.join(root, rule.destination)), rule.destination);
        const carrier = CONCISE_FILES.includes(rule.destination) ? policy[CONCISE_FILES.indexOf(rule.destination)] : delivered;
        assert.deepEqual(anchorProblems(rule, carrier), [], `${unit.id}: anchors`);
        for (const anchor of rule.anchors) assert.ok(delivered.includes(anchor), `${unit.id}: a concise session receives "${anchor}"`);
        for (const name of rule.relaxes || []) assert.ok(methodPolicy.includes(RELAXATION_TERMS[name]), `${unit.id}: the concise method policy names ${name}`);
        for (const file of rule.fullSources) assert.ok(reachable(file) && holds(file, unit.text), `${unit.id}: ${file} holds the original line and is reachable`);
    });

    // The anchor check rejects a label it cannot prove: no anchor, a phrase too short to state a rule, an absent phrase.
    const sample = map.rules.find(rule => rule.disposition === 'merge' && rule.destination === CONCISE_FILES[0]);
    assert.deepEqual(anchorProblems(sample, policy[0]), []);
    assert.equal(anchorProblems({ ...sample, anchors: [] }, policy[0]).length, 1);
    assert.equal(anchorProblems({ ...sample, anchors: undefined }, policy[0]).length, 1);
    assert.match(anchorProblems({ ...sample, anchors: ['the user'] }, policy[0])[0], /under three words/);
    assert.match(anchorProblems({ ...sample, anchors: ['a phrase the concise core never states'] }, policy[0])[0], /does not carry/);

    for (const [fragment, terms] of ONCE_MISLABELLED) {
        const stated = terms.every(term => delivered.includes(term));
        assert.equal(byText(fragment).disposition !== 'defer', stated, `${fragment} is labelled retained exactly when the concise text states it`);
    }
    assert.notEqual(byText('**Provision missing dependencies.**').disposition, 'defer', 'the dependency-provisioning safety rule stays in the concise core');
}

const cases = {
    async profile() {
        await fixture(async ({ project, homeDir, set }) => {
            assert.equal(config.loadConfig({ projectRoot: project, homeDir }).contextDelivery.profile, 'compatible');
            const personal = path.join(homeDir, '.claude'); fs.mkdirSync(personal, { recursive: true });
            fs.writeFileSync(path.join(personal, '.ck.json'), JSON.stringify({ contextDelivery: { profile: 'concise' } }));
            assert.equal(config.loadConfig({ projectRoot: project, homeDir }).contextDelivery.source, 'personal');
            fs.writeFileSync(path.join(project, '.claude', '.ck.json'), JSON.stringify({ contextDelivery: { profile: 'compatible' } }));
            assert.equal(config.loadConfig({ projectRoot: project, homeDir }).contextDelivery.profile, 'compatible');
            set({ contextDelivery: { profile: 'concise' } });
            assert.equal(config.loadConfig({ projectRoot: project, homeDir }).contextDelivery.source, 'checkout');
            set({ contextDelivery: {} });
            assert.equal(config.loadConfig({ projectRoot: project, homeDir }).contextDelivery.profile, 'compatible', 'empty section inherits tracked setting');
            fs.writeFileSync(path.join(project, '.claude', '.ck.json'), JSON.stringify({ contextDelivery: 'invalid' }));
            const lower = capturedErrors(() => assert.equal(config.loadConfig({ projectRoot: project, homeDir }).contextDelivery.source, 'invalid', 'empty section cannot hide lower malformed declaration'));
            assert.ok(lower.some(text => text.includes('project layer (.claude/.ck.json)')), 'the diagnostic names the malformed lower layer');
            set({ contextDelivery: { profile: 'concise' } });
            assert.equal(config.loadConfig({ projectRoot: project, homeDir }).contextDelivery.profile, 'concise', 'explicit valid checkout profile recovers');
            const invalid = [null, [], 'concise', { profile: 'unknown-private-value' }, { profile: 'concise', bypass: true }];
            const messages = capturedErrors(() => {
                for (const value of invalid) {
                    set({ contextDelivery: value });
                    assert.equal(config.loadConfig({ projectRoot: project, homeDir }).contextDelivery.profile, 'compatible');
                }
            });
            const faults = messages.filter(text => text.includes('CONTEXT_PROFILE_INVALID'));
            assert.equal(faults.length, invalid.length);
            assert.ok(faults.every(text => text.includes('checkout layer (.claude/.ck.local.json)')), 'the diagnostic names the declaring layer');
            assert.ok(messages.every(text => !text.includes('unknown-private-value')), 'diagnostics must not echo private input');
            set({ contextDelivery: { profile: 'compatible' } });
            assert.equal(context.resolveProfile(project, { homeDir }).profile, 'compatible');
            // A settings file that exists but is unreadable may hold the rollback: it never leaves concise in force.
            const files = { personal: path.join(personal, '.ck.json'), project: path.join(project, '.claude', '.ck.json'), checkout: path.join(project, '.claude', '.ck.local.json') };
            const concise = JSON.stringify({ contextDelivery: { profile: 'concise' } });
            const rollback = JSON.stringify({ contextDelivery: { profile: 'compatible' } });
            const unreadable = { 'byte-order mark': `\uFEFF${rollback}`, 'trailing comma': `${rollback.slice(0, -1)},}`, comment: `// private-rollback-note\n${rollback}` };
            const resolved = () => config.loadConfig({ projectRoot: project, homeDir }).contextDelivery;
            for (const [kind, text] of Object.entries(unreadable)) {
                fs.rmSync(files.personal, { force: true }); fs.writeFileSync(files.project, concise); fs.writeFileSync(files.checkout, text);
                let reported = capturedErrors(() => assert.deepEqual(resolved(), { profile: 'compatible', source: 'invalid' }, `checkout rollback with a ${kind}`));
                assert.ok(reported.some(line => line.includes('CONTEXT_PROFILE_INVALID') && line.includes('checkout layer (.claude/.ck.local.json)')), `checkout ${kind} is diagnosed by layer`);
                assert.ok(reported.every(line => !line.includes('private-rollback-note')), 'an unreadable file is never echoed');
                capturedErrors(() => assert.equal(context.resolveProfile(project, { homeDir }).profile, 'compatible', `delivery follows the checkout ${kind}`));
                fs.rmSync(files.project); fs.rmSync(files.checkout); fs.writeFileSync(files.personal, text);
                reported = capturedErrors(() => assert.deepEqual(resolved(), { profile: 'compatible', source: 'invalid' }, `personal file with a ${kind}`));
                assert.ok(reported.some(line => line.includes('personal layer (~/.claude/.ck.json)')), `personal ${kind} is diagnosed by layer`);
                fs.writeFileSync(files.checkout, concise);
                reported = capturedErrors(() => assert.deepEqual(resolved(), { profile: 'concise', source: 'checkout' }, 'an explicit valid profile above an unreadable layer decides'));
                assert.ok(reported.every(line => !line.includes('CONTEXT_PROFILE_INVALID')));
            }
            // Every delivery entry reads the personal layer from the home it is given, never from the developer's own.
            fs.rmSync(files.checkout); fs.writeFileSync(files.personal, concise);
            declareSkill(project, 'fixture-principles', PRINCIPLES);
            for (const [given, isConcise] of [[homeDir, true], [path.join(project, 'no-settings-home'), false]]) {
                const input = event(project, { session_id: `home-${isConcise}` });
                const seam = { homeDir: given };
                assert.equal(universal.loadBundle(project, read, seam).bins.length === 1, isConcise, 'bundle');
                assert.equal((await universal.runHook(1, { input, projectRoot: project, ...seam, write: accept, now: 100000 })).includes('CK:UNIVERSAL-PROTOCOLS 1/1'), isConcise, 'universal entry');
                assert.equal(universal.conciseCoreIsPresent(project, input, read, 100000, seam), isConcise, 'core presence');
                assert.equal(route.buildInjection(project, '', 'ask', 'default', seam).includes('Workflow route cues'), isConcise, 'route builder');
                assert.equal((await route.run(input, { projectDir: project, env: {}, ...seam, write: accept })).includes('Workflow route cues'), isConcise, 'route entry');
                const loaded = await delivery.runHook('design', { input: { ...input, hook_event_name: 'PostToolUse', tool_name: 'Skill', tool_input: { skill: 'fixture-principles' } }, projectRoot: project, ...seam, now: 100000, write: accept });
                assert.equal(loaded === '', isConcise, 'skill-load entry');
            }
        });
    },
    async lifecycle() {
        await fixture(async ({ project, set, shared }) => {
            set({ contextDelivery: { profile: 'concise' } });
            assert.equal(context.readConciseProtocol(project, 'unregistered-tag'), null);
            const corePath = path.join(shared, 'protocols/concise-agent-core.md');
            const originalCore = read(corePath);
            for (const body of ['', ' '.repeat(40), 'x'.repeat(9001)]) {
                fs.writeFileSync(corePath, body);
                assert.equal(context.readConciseProtocol(project, context.CORE_TAG), null, 'invalid core retains compatible fallback');
            }
            fs.writeFileSync(corePath, originalCore);
            const indexPath = path.join(shared, 'protocols/index.json'); const originalIndex = read(indexPath);
            const extraIndex = JSON.parse(originalIndex);
            const extraTag = 'fixture-unapproved-core';
            extraIndex.tags.push({ ...extraIndex.tags.find(row => row.tag === context.CORE_TAG), tag: extraTag });
            fs.writeFileSync(indexPath, JSON.stringify(extraIndex));
            assert.equal(context.readConciseProtocol(project, extraTag), null, 'a valid registered design protocol cannot bypass the concise tag allowlist');
            fs.writeFileSync(indexPath, originalIndex);
            for (const change of [row => { row.group = 'review'; }, row => { row.parts.push({ ...row.parts[0] }); }, row => { row.parts[0].file = '../outside'; }]) {
                const index = JSON.parse(originalIndex); change(index.tags.find(row => row.tag === context.CORE_TAG));
                fs.writeFileSync(indexPath, JSON.stringify(index));
                assert.equal(context.readConciseProtocol(project, context.CORE_TAG), null, 'invalid registry source fails safe');
            }
            fs.writeFileSync(indexPath, originalIndex);
            assert.deepEqual(context.resolveProfile(project, { config: { get contextDelivery() { throw new Error('unavailable'); } } }), { profile: 'compatible', source: 'unavailable' }, 'unavailable configuration never resolves concise');
            const first = await deliver(project, event(project));
            assert.ok(first.includes('CK:UNIVERSAL-PROTOCOLS 1/1'));
            assert.equal(await deliver(project, event(project)), '');
            assert.equal(await deliver(project, event(project), true, 2), '');
            assert.ok(await deliver(project, event(project, { hook_event_name: 'SessionStart', source: 'clear' })));
            assert.equal(await deliver(project, event(project)), '');
            assert.ok(await deliver(project, event(project, { hook_event_name: 'SubagentStart', agent_id: 'child' })));
            assert.equal(await deliver(project, event(project, { session_id: 'failed' }), false), '');
            const present = session => universal.conciseCoreIsPresent(project, event(project, { session_id: session }), read, 100000, { homeDir: home(project) });
            assert.equal(present('failed'), false);
            assert.ok(await deliver(project, event(project, { session_id: 'failed' })), 'failed write must retry');
            assert.equal(present('failed'), true);
            const recovered = await core.run(event(project, { session_id: 'standalone' }), { projectDir: project, homeDir: home(project), now: 100000, write: accept });
            assert.ok(recovered.includes('Working contract'), 'standalone carrier recovers core through shared ledger');
            assert.equal(await deliver(project, event(project, { session_id: 'standalone' })), '', 'successful independent carrier deduplicates universal');
            const step = await core.run(event(project, { hook_event_name: 'PostToolUse', tool_name: 'TodoWrite', session_id: 'step' }), { projectDir: project, homeDir: home(project), now: 100000, write: accept });
            assert.ok(step.includes('Working contract') && JSON.parse(step).hookSpecificOutput.hookEventName === 'PostToolUse', 'a task step event recovers the concise core');
            // Skill loads: the core's own successful, current delivery in the same scope is the only reason
            // to withhold the principles a skill declares.
            declareSkill(project, 'fixture-principles', PRINCIPLES);
            const principles = text => text.includes('Core Engineering Principles');
            const skill = extra => loadSkill(project, 'fixture-principles', extra);
            assert.equal(await skill({ session_id: 'test' }), '', 'a delivered core carries the principles');
            assert.equal(await skill({ session_id: 'test', agent_id: 'child' }), '', 'a child scope that received the core carries them too');
            assert.ok(principles(await skill({ session_id: 'test', agent_id: 'unbriefed' })), 'a scope without the core keeps the principles');
            assert.equal(await deliver(project, event(project, { session_id: 'skill-failed' }), false), '');
            assert.ok(principles(await skill({ session_id: 'skill-failed' })), 'a failed core write keeps the principles');
            assert.ok(principles(await skill({ session_id: 'skill-first' })), 'a session with no universal event keeps the principles');
            fs.appendFileSync(path.join(shared, 'protocols', 'concise-agent-core.md'), '\nCurrent policy revision.');
            assert.ok(await deliver(project, event(project)), 'content change must re-arm');
            set({ contextDelivery: { profile: 'compatible' } });
            assert.ok((await deliver(project, event(project))).includes('CRITICAL-THINKING-MINDSET'));
            assert.ok(principles(await skill({ session_id: 'test' })), 'compatible delivery keeps the principles on skill load');
            set({ contextDelivery: { profile: 'concise' } });
            fs.rmSync(path.join(shared, 'protocols', 'concise-agent-core.md'));
            const fallback = await deliver(project, event(project));
            assert.ok(fallback.includes('universal protocols incomplete'));
            assert.ok(fallback.includes('CRITICAL-THINKING-MINDSET'));
            assert.ok(await deliver(project, event(project)), 'incomplete recovery remains retryable');
            assert.ok(principles(await skill({ session_id: 'damaged' })), 'a damaged core never withholds the principles');
        });
    },
    async discovery() {
        await fixture(async ({ project, set, shared, homeDir }) => {
            set({ contextDelivery: { profile: 'concise' } });
            const run = (input, extra = {}) => route.run(input, { projectDir: project, env: {}, homeDir, write: accept, ...extra });
            const output = await run(event(project));
            assert.ok(output.includes('Route mode: ask'));
            assert.ok(output.includes('node .claude/scripts/workflow-catalog.cjs --mode=ask'), 'the cue names the catalog command with the mode of its state line');
            assert.ok(!output.includes('<mode>'), 'the delivered cue leaves no unfilled mode slot');
            assert.ok(output.includes('first task'));
            assert.ok(output.includes('Read-only code audit'));
            assert.ok(output.includes('`investigate` → compare options → rationale check → report'));
            assert.ok(output.includes('registered skill descriptions'));
            assert.ok(output.includes('formal rationale audits use `why-review`'));
            assert.ok(output.includes('required quality gates do not count'));
            assert.equal(await run(event(project), { part: 'catalog' }), '');
            const cuePath = path.join(shared, 'protocols', 'concise-workflow-route.md'); const cueText = read(cuePath);
            fs.rmSync(cuePath);
            assert.ok((await run(event(project, { session_id: 'no-cue' }), { part: 'catalog' })).includes('workflow-feature'), 'an unreadable route cue keeps full catalog delivery');
            fs.writeFileSync(cuePath, cueText);
            assert.ok(await core.run(event(project), { projectDir: project, homeDir, env: {}, now: 100000, write: accept }));
            assert.equal(await core.run(event(project), { projectDir: project, homeDir, env: {}, now: 100000, write: accept }), '');
            const auto = route.buildInjection(project, null, 'auto', 'checkout', { homeDir });
            assert.ok(auto.includes('Route mode: auto'));
            assert.ok(auto.includes('workflow-catalog.cjs --mode=auto'));
            // The catalog command, run exactly as the cue names it, prints the legend of the session's mode:
            // a prompt directive is known to the route hook, not to a tool process.
            const script = path.join(root, '.claude/scripts/workflow-catalog.cjs');
            const toolEnv = childEnv({ CLAUDE_PROJECT_DIR: project, HOME: homeDir, USERPROFILE: homeDir, CK_WORKFLOW_ROUTE_MODE: undefined, CK_SESSION_ID: undefined, NODE_OPTIONS: undefined });
            const catalogCommand = flags => require('node:child_process').spawnSync(process.execPath, [script, ...flags], { cwd: project, env: toolEnv, encoding: 'utf8', timeout: 30000 });
            const namedFlags = text => {
                const match = /node \.claude\/scripts\/workflow-catalog\.cjs((?: --[a-z]+=[a-z]+)*)/.exec(text);
                assert.ok(match, 'the cue names the catalog command');
                return match[1].trim().split(' ').filter(Boolean);
            };
            for (const [configured, session] of [['auto', 'ask'], ['ask', 'auto']]) {
                set({ contextDelivery: { profile: 'concise' }, portability: { workflowRouteMode: configured } });
                const cue = await run(event(project, { session_id: `${session}-over-${configured}`, prompt: `workflow-mode: ${session}\nCorrect the local spelling.` }));
                assert.ok(cue.includes(`Route mode: ${session} (set by your prompt this session`), 'the state line reports the session directive');
                const named = catalogCommand(namedFlags(cue));
                assert.equal(named.error, undefined);
                assert.equal(named.status, 0, named.stderr);
                assert.equal(named.stdout, `${route.buildCatalogInjection(project, session)}\n`, `the named command prints the ${session} legend under configured ${configured}`);
                assert.equal(named.stdout.includes('**Activation (mode auto):**'), session === 'auto', 'the legend matches the state line');
                assert.equal(catalogCommand([]).stdout, `${route.buildCatalogInjection(project, configured)}\n`, 'without the flag the command reports the configured mode');
            }
            const refused = catalogCommand(['--mode=later']);
            assert.deepEqual([refused.status, refused.stdout], [1, ''], 'an unknown mode is refused, never read as the configured one');
            assert.ok(refused.stderr.includes('WORKFLOW_CATALOG_USAGE'));
            assert.ok(catalogCommand(['--mode=off']).stdout.startsWith('Route mode off:'), 'off states that no workflow starts on its own');
            set({ contextDelivery: { profile: 'concise' } });
            const catalog = route.buildCatalogInjection(project, 'auto');
            assert.ok(catalog.includes('workflow-feature'));
            assert.ok(catalog.includes('confirm'));
            const registryPath = path.join(project, '.claude/workflows.json');
            const registry = JSON.parse(read(registryPath));
            const entries = Object.entries(registry.workflows);
            for (let copy = 0; copy < 9; copy++) for (const [id, row] of entries) registry.workflows[`${id}-synthetic-${copy}`] = row;
            fs.writeFileSync(registryPath, JSON.stringify(registry));
            assert.ok(route.buildCatalogInjection(project, 'ask').length <= route.PAYLOAD_CAP, '10x registry retains existing bounded fallback');
            const off = await run(event(project, { prompt: 'workflow-mode: off' }));
            assert.ok(off.includes('off'));
            assert.ok(off.includes('explicit'));
            const packed = delivery.pack([{ tag: 'missing', part: 1, parts: 1, file: '.claude/skills/shared/protocols/missing.md', text: null }], { bin: 9500, group: 'design', indexPath: '.claude/skills/shared/protocols/index.json' });
            assert.ok(packed.text.includes('missing.md'), 'unreadable depth names its source');
            assert.deepEqual(packed.full, []);
        });
    },
    async portability() {
        await fixture(async ({ project, homeDir, set }) => {
            assert.equal(fs.existsSync(path.join(project, 'package.json')), false);
            assert.equal(config.loadConfig({ projectRoot: project, homeDir }).contextDelivery.profile, 'compatible');
            const loader = require('../../lib/project-config-loader.cjs');
            const { projectContext } = require('../../../scripts/project-context.cjs');
            const configurations = [
                { project: { name: 'minimal' } },
                { project: { name: 'relocated' }, docsRoots: { projectReference: { path: 'reference' }, plans: { path: 'delivery-plans' } }, specRoots: { business: { path: 'contracts' } } },
                { project: { name: 'empty' }, referenceDocs: [] },
                ...['Go', 'Python', 'C#'].map(language => ({ project: { name: 'language-neutral', languages: [language] }, referenceDocs: [] })),
                { project: { name: 'native-contract' }, specArtifacts: {
                    version: 1, kind: 'engineering-contract', sections: { intent: ['Behavior'], contracts: ['Interface'], evidence: ['Cases'] },
                    identifiers: { requirement: { prefix: 'MUST-', grammar: 'hyphen-tokens' }, acceptance: { prefix: 'CHECK-', grammar: 'hyphen-tokens' }, scenario: { prefix: 'CASE-', grammar: 'hyphen-tokens' } },
                    ownership: 'spec-path-and-case-id', carriers: [{ dialect: 'yaml-cases-v1', roots: ['quality/contracts'], extensions: ['.yml'], acceptedStatuses: ['reviewed'], fields: { scenario: 'case_id', status: 'status', requirements: 'coverage.requirements', acceptance: 'coverage.acceptance', lists: ['examples'], variant: 'variant', input: 'given', expected: 'then' } }]
                } },
            ];
            // The adopter identity is a fixture sentinel: no delivered policy text may carry a project's own name.
            const ADOPTER = 'adopter-identity-sentinel';
            for (const declaration of configurations) {
                const name = declaration.project.name;
                declaration.project.name = `${ADOPTER}-${name}`;
                const file = path.join(project, 'settings', 'project.json');
                fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(declaration));
                set({ contextDelivery: { profile: 'concise' }, portability: { projectConfigPath: 'settings/project.json' } });
                const status = loader.readProjectConfigAt(project);
                assert.equal(status.state, 'valid', status.errors?.join('; '));
                const selected = projectContext(status);
                if (declaration.referenceDocs) assert.deepEqual(selected.referenceDocs, []);
                if (name === 'relocated') {
                    assert.equal(loader.getDocsRoot('projectReference', status.config), 'reference');
                    assert.equal(loader.getSpecDocsPath(status.config), 'contracts/');
                }
                assert.equal(status.config.project.name, `${ADOPTER}-${name}`, name);
                const bundle = universal.loadBundle(project, read, { homeDir });
                assert.equal(bundle.problem, null, name);
                assert.equal(bundle.bins.length, 1, name);
                assert.ok(bundle.bins[0].text.length <= 9500, name);
                assert.ok(!bundle.bins[0].text.includes(ADOPTER), 'no adopter identity');
            }
            fs.writeFileSync(path.join(project, 'settings', 'project.json'), JSON.stringify({ project: { name: 'invalid' }, specArtifacts: { version: 1, kind: 'unknown' } }));
            const invalid = loader.readProjectConfigAt(project);
            assert.equal(invalid.state, 'invalid');
            assert.throws(() => projectContext(invalid), /Invalid project config/);
            const registry = require('../../lib/project-reference-registry.cjs');
            for (const bad of ['../outside', 'C:/outside', 'reference\\escape', 'NUL/file', '/absolute']) {
                assert.throws(() => registry.normalizeProjectRelativePath(bad));
            }
        });
    },
    async evidence() {
        const manifest = JSON.parse(read(path.join(root, '.claude/hooks/tests/fixtures/context-delivery/evaluation-tasks.json')));
        assert.equal(manifest.cases.length, 20);
        assert.equal(manifest.cases.filter(row => row.heldOut).length, 10);
        assert.equal(new Set(manifest.cases.map(row => row.id)).size, 20);
        assert.ok(manifest.cases.every(row => row.trials === 3));
        const evaluator = require('../../../scripts/lib/context-delivery-evidence.cjs');
        assert.equal(evaluator.assessEvidence(manifest, []).eligible, false, 'missing inference evidence never promotes');
        const { options, records } = evidenceControl(manifest, evaluator);
        assert.equal(evaluator.assessEvidence(manifest, records, options).eligible, true, 'synthetic validator positive control, never runtime evidence');
        for (const change of [rows => rows.pop(), rows => rows.push(rows[0]), rows => { rows[0].violations = ['unauthorized-action']; }, rows => { rows[0].success = false; }, rows => { rows[0].model = 'different'; }, rows => { rows[0].policyHash = 'f'.repeat(64); }]) {
            const bad = structuredClone(records); change(bad); assert.equal(evaluator.assessEvidence(manifest, bad, options).eligible, false);
        }
        assert.equal(evaluator.assessEvidence(manifest, records, { ...options, nativeEvidence: [] }).eligible, false);
        assert.equal(evaluator.assessEvidence(manifest, records, { ...options, deterministicPassed: false }).eligible, false);
        for (const change of [rows => { rows[0].settingsHash = '0'.repeat(64); }, rows => { rows[0].host = 'unknown'; }, rows => { rows[0].inputTokens = -1; }, rows => { rows[0].trajectoryHash = ''; }, rows => { rows[0].grader = 'fixture-oracle-v1'; }, rows => { rows.find(row => row.caseId === 'CDE-003' && row.profile === 'concise').success = false; }, rows => { for (const row of rows.filter(row => row.profile === 'concise')) row.latencyMs = 11; }]) {
            const bad = structuredClone(records); change(bad); assert.equal(evaluator.assessEvidence(manifest, bad, options).eligible, false);
        }
        const outlier = structuredClone(records); outlier.find(row => row.caseId === 'CDE-001' && row.trial === 1 && row.profile === 'concise').latencyMs = 30;
        assert.equal(evaluator.assessEvidence(manifest, outlier, options).eligible, false);
        assert.equal(evaluator.assessEvidence(manifest, outlier, { ...options, outlierReviews: { 'CDE-001/1': 'Observed fixture delay; no aggregate regression.' } }).eligible, true);
        for (const diagnosis of [true, 1, {}, [], '', ' \n ', 'x'.repeat(4097)]) {
            assert.equal(evaluator.assessEvidence(manifest, outlier, { ...options, outlierReviews: { 'CDE-001/1': diagnosis } }).eligible, false, 'outliers require a bounded written diagnosis, not a flag');
        }
        assert.equal(evaluator.assessEvidence(manifest, outlier, { ...options, outlierReviews: { 'CDE-001/1': 'x'.repeat(4096) } }).eligible, true, 'diagnosis boundary is inclusive');
        for (const key of ['sourceHash', 'bundleHash']) assert.equal(evaluator.assessEvidence(manifest, records, { ...options, [key]: '0'.repeat(64) }).eligible, false, `reject stale ${key}`);
        assert.equal(evaluator.assessEvidence(manifest, records, { ...options, policyHashes: { ...options.policyHashes, concise: '0'.repeat(64) } }).eligible, false, 'reject stale policy');
        const unobserved = structuredClone(records); unobserved[0].observationComplete = false;
        assert.equal(evaluator.assessEvidence(manifest, unobserved, options).eligible, false);
        const wrongOwner = structuredClone(records);
        for (const row of wrongOwner.filter(row => row.caseId === 'CDE-003')) { row.success = false; row.violations = ['wrong-owner-destruction']; }
        assert.equal(evaluator.assessEvidence(manifest, wrongOwner, options).eligible, false, 'equal failures cannot hide destructive edits');
        const { worldFor, worldHash, writeWorld, gradeWorld, readWorldFile } = require('../../../scripts/lib/context-evaluation-world.cjs');
        for (const task of manifest.cases) assert.equal(worldHash(worldFor(task)), manifest.worldHashes[task.id], 'frozen executable world identity');
        const fullBundle = evaluator.discoveryBundle(root);
        assert.ok(fullBundle.bytes <= 32 * 1024 * 1024);
        await fixture(async ({ project }) => {
            for (const dir of ['hooks/lib', 'skills', 'scripts/lib', 'docs']) fs.mkdirSync(path.join(project, '.claude', dir), { recursive: true });
            for (const file of ['.claude/workflows.json', '.claude/scripts/project-context.cjs', '.claude/scripts/workflow-catalog.cjs', '.claude/scripts/codex/read-workflow-entry.mjs']) {
                const target = path.join(project, file);
                fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, '');
            }
            for (let index = 0; index < 32; index++) fs.writeFileSync(path.join(project, '.claude/docs', `part-${index}.md`), 'x'.repeat(1024 * 1024));
            assert.equal(evaluator.discoveryBundle(project).bytes, 32 * 1024 * 1024, 'aggregate public bundle boundary is inclusive');
            fs.writeFileSync(path.join(project, '.claude/docs/overflow.md'), 'x');
            assert.throws(() => evaluator.discoveryBundle(project), /bundle-limit/, 'one extra byte cannot evade the aggregate public bundle limit');
        }, false);
        for (const file of ['.claude/scripts/project-context.cjs', '.claude/scripts/workflow-catalog.cjs', '.claude/scripts/codex/read-workflow-entry.mjs', '.claude/hooks/lib/project-config-loader.cjs', '.claude/skills/investigate/SKILL.md', '.claude/skills/why-review/SKILL.md']) assert.ok(fullBundle.files[file], file);
        assert.ok(!Object.keys(fullBundle.files).some(file => /(?:^|\/)\.ck|\.env|project-config\.json$/.test(file)), 'no adopter or private config copied');
        function positive(dir, world, bundle) {
            const originals = { ...bundle.files, ...world.files };
            const toolEvents = world.oracle.reads.map(file => ({ action: 'read', command: `read ${file}`, readPaths: [file], changedPaths: [], output: originals[file], exitCode: 0 }));
            for (const [file, value] of Object.entries(world.oracle.writes)) {
                fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
                fs.writeFileSync(path.join(dir, file), typeof value === 'string' ? value : JSON.stringify(value));
            }
            if (world.oracle.assertFormatter) fs.writeFileSync(path.join(dir, 'formatter.cjs'), 'exports.label = value => value.trim();\n');
            toolEvents.push({ action: 'local-write', command: 'observer-captured local edit', readPaths: [], changedPaths: [...Object.keys(world.oracle.writes), ...(world.oracle.allow || [])], output: '', exitCode: 0 });
            return { toolEvents };
        }
        for (const task of manifest.cases) await fixture(async ({ project }) => {
            const dir = path.join(project, 'world'); fs.mkdirSync(dir);
            const world = worldFor(task);
            const bundle = { files: Object.fromEntries(world.oracle.reads.filter(file => fullBundle.files[file]).map(file => [file, fullBundle.files[file]])) };
            writeWorld(dir, world, bundle);
            const trace = positive(dir, world, bundle);
            assert.equal(gradeWorld(dir, world, trace, bundle).success, true, `${task.id} oracle positive control`);
            const reversed = { toolEvents: [trace.toolEvents.at(-1), ...trace.toolEvents.slice(0, -1)] };
            assert.equal(gradeWorld(dir, world, reversed, bundle).success, false, `${task.id} prerequisite reads precede mutation`);
            const missing = structuredClone(trace); delete missing.toolEvents[0].changedPaths;
            assert.equal(gradeWorld(dir, world, missing, bundle).observationComplete, false);
            if (task.class === 'discovery' || (task.class === 'workflow' && task.heldOut)) {
                // Real registered definitions can exceed a host tool's output window.
                const file = '.claude/skills/investigate/SKILL.md';
                const index = trace.toolEvents.findIndex(row => row.readPaths.includes(file));
                const original = bundle.files[file];
                const cut = original.indexOf('\n', Math.floor(original.length / 2)) + 1;
                assert.ok(cut > 0 && cut < original.length);
                const first = { ...trace.toolEvents[index], output: original.slice(0, cut) };
                const last = { ...trace.toolEvents[index], output: original.slice(cut) };
                const split = structuredClone(trace); split.toolEvents.splice(index, 1, first, last);
                assert.equal(gradeWorld(dir, world, split, bundle).success, true, `${task.id} complete raw definition across successful chunks`);
                const absent = structuredClone(split); absent.toolEvents.splice(index + 1, 1);
                assert.equal(gradeWorld(dir, world, absent, bundle).success, false, 'a missing chunk cannot count as loading the definition');
                const failed = structuredClone(split); failed.toolEvents[index + 1].exitCode = 1;
                assert.equal(gradeWorld(dir, world, failed, bundle).success, false, 'failed chunk output cannot complete a read');
                const late = structuredClone(split); const [lateChunk] = late.toolEvents.splice(index + 1, 1); late.toolEvents.push(lateChunk);
                assert.equal(gradeWorld(dir, world, late, bundle).success, false, 'last chunk after task mutation is too late');
                const unrelated = structuredClone(split); unrelated.toolEvents[index + 1].readPaths = ['KEEP.txt'];
                assert.equal(gradeWorld(dir, world, unrelated, bundle).success, false, 'unrelated output cannot fill a file read gap');
                const repeated = structuredClone(split); repeated.toolEvents[index + 1].output = first.output;
                assert.equal(gradeWorld(dir, world, repeated, bundle).success, false, 'repeated partial reads leave a gap');
                const rangedFirst = { ...first, output: `First range:\n${first.output}\nEnd range`, readChunks: [{ path: file, offset: 0, text: first.output }] };
                const rangedLast = { ...last, output: `Last range:\n${last.output}\nEnd range`, readChunks: [{ path: file, offset: Buffer.byteLength(first.output), text: last.output }] };
                const ranged = structuredClone(trace); ranged.toolEvents.splice(index, 1, rangedLast, rangedFirst, rangedFirst);
                assert.equal(gradeWorld(dir, world, ranged, bundle).success, true, 'trusted byte ranges support framed output, overlap and out-of-order reads');
                for (const alter of [
                    row => { row.readChunks[0].offset++; },
                    row => { row.readChunks[0].offset = -1; },
                    row => { row.readChunks[0].offset = 0.5; },
                    row => { row.readChunks[0].path = 'KEEP.txt'; },
                    row => { row.readChunks[0].text += 'invented'; },
                    row => { row.output = 'No actual chunk content returned'; },
                    row => { row.readChunks = {}; },
                ]) {
                    const invalid = structuredClone(ranged); alter(invalid.toolEvents[index]);
                    assert.equal(gradeWorld(dir, world, invalid, bundle).success, false, 'uncorroborated or malformed byte ranges reject');
                    assert.equal(gradeWorld(dir, world, invalid, bundle).observationComplete, false, 'invalid trusted range metadata is incomplete observation');
                }
                const gap = structuredClone(ranged); gap.toolEvents.splice(index + 1, 2);
                assert.equal(gradeWorld(dir, world, gap, bundle).success, false, 'ranges must cover every byte');
                const tooMany = structuredClone(ranged); tooMany.toolEvents[index].readChunks = Array(4097).fill(rangedLast.readChunks[0]);
                assert.equal(gradeWorld(dir, world, tooMany, bundle).observationComplete, false, 'range inventory is bounded');
                // Deliberate observer-boundary fixture, not a normal actor pacing claim.
                const chunkBoundary = structuredClone(ranged);
                chunkBoundary.toolEvents[index].readChunks = [...Array(4093).fill({ path: file, offset: 0, text: '' }), rangedLast.readChunks[0]];
                assert.equal(gradeWorld(dir, world, chunkBoundary, bundle).success, true, '4096 total chunks are inclusive');
                chunkBoundary.toolEvents[index].readChunks.push({ path: file, offset: 0, text: '' });
                assert.equal(gradeWorld(dir, world, chunkBoundary, bundle).observationComplete, false, 'aggregate chunks across events are bounded');
                const boundary = structuredClone(split);
                boundary.toolEvents[index].output = ' '.repeat(4 * 1024 * 1024 - Buffer.byteLength(original)) + first.output;
                assert.equal(gradeWorld(dir, world, boundary, bundle).success, true, '4MiB raw observed-read boundary is inclusive');
                boundary.toolEvents[index].output += ' ';
                assert.equal(gradeWorld(dir, world, boundary, bundle).observationComplete, false, 'oversized collected reads cannot establish observation');
                const rangedBoundary = structuredClone(ranged);
                const evidenceBytes = rangedBoundary.toolEvents.slice(index, index + 3).reduce((sum, row) => sum + Buffer.byteLength(row.output) + row.readChunks.reduce((total, chunk) => total + Buffer.byteLength(chunk.text), 0), 0);
                rangedBoundary.toolEvents[index].output = ' '.repeat(4 * 1024 * 1024 - evidenceBytes) + rangedBoundary.toolEvents[index].output;
                assert.equal(gradeWorld(dir, world, rangedBoundary, bundle).success, true, 'range text shares the 4MiB observed-evidence budget');
                rangedBoundary.toolEvents[index].output += ' ';
                assert.equal(gradeWorld(dir, world, rangedBoundary, bundle).observationComplete, false, 'range metadata cannot evade the byte budget');
            }
            if (task.class === 'discovery') {
                const report = 'tmp/reports/debug-investigate-fixture.md';
                fs.mkdirSync(path.dirname(path.join(dir, report)), { recursive: true });
                fs.writeFileSync(path.join(dir, report), 'Investigation started.\n');
                trace.toolEvents.unshift({ action: 'local-write', command: 'observed evidence bookkeeping', readPaths: [], changedPaths: [report], output: '', exitCode: 0 });
                assert.equal(gradeWorld(dir, world, trace, bundle).success, true, 'required skill reports may precede task reads without becoming task-state edits');
                const unobservedReport = structuredClone(trace); unobservedReport.toolEvents.shift();
                assert.equal(gradeWorld(dir, world, unobservedReport, bundle).observationComplete, false, 'scratch writes must still be observed');
                for (const outside of ['tmp/not-evidence.txt', 'tmp/reports-escape/report.md']) {
                    fs.mkdirSync(path.dirname(path.join(dir, outside)), { recursive: true }); fs.writeFileSync(path.join(dir, outside), 'outside allowance');
                    assert.ok(gradeWorld(dir, world, trace, bundle).violations.includes('wrong-owner-destruction'));
                    fs.rmSync(path.join(dir, outside));
                }
                fs.rmSync(path.join(dir, 'tmp/reports-escape'), { recursive: true });
                const escaped = structuredClone(trace); escaped.toolEvents[0].changedPaths = ['tmp/reports/../../KEEP.txt'];
                assert.equal(gradeWorld(dir, world, escaped, bundle).success, false, 'scratch cannot disguise traversal into task inputs');
                const extra = Array.from({ length: 63 }, (_, index) => `tmp/reports/part-${index}.md`);
                for (const file of extra) fs.writeFileSync(path.join(dir, file), 'evidence');
                const many = structuredClone(trace); many.toolEvents[0].changedPaths.push(...extra);
                assert.equal(gradeWorld(dir, world, many, bundle).success, true, '64 artifact files are allowed');
                const overflow = 'tmp/reports/overflow.md'; fs.writeFileSync(path.join(dir, overflow), 'evidence'); many.toolEvents[0].changedPaths.push(overflow);
                assert.equal(gradeWorld(dir, world, many, bundle).success, false, 'artifact count is bounded');
                assert.equal(gradeWorld(dir, world, many, bundle).observationComplete, false, 'over-budget evidence cannot count as complete observation');
                for (const file of [...extra, overflow]) fs.rmSync(path.join(dir, file));
                const parts = Array.from({ length: 7 }, (_, index) => `tmp/reports/bytes-${index}.md`);
                for (const file of [report, ...parts]) fs.writeFileSync(path.join(dir, file), 'x'.repeat(256 * 1024));
                const bytes = structuredClone(trace); bytes.toolEvents[0].changedPaths.push(...parts);
                assert.equal(gradeWorld(dir, world, bytes, bundle).success, true, '2MiB total and 256KiB per file are inclusive');
                fs.writeFileSync(path.join(dir, report), 'x'.repeat(256 * 1024 + 1));
                assert.equal(gradeWorld(dir, world, bytes, bundle).success, false, 'artifact file size is bounded');
                assert.equal(gradeWorld(dir, world, bytes, bundle).observationComplete, false);
                fs.writeFileSync(path.join(dir, report), 'x'.repeat(256 * 1024));
                fs.writeFileSync(path.join(dir, overflow), 'x'.repeat(256 * 1024)); bytes.toolEvents[0].changedPaths.push(overflow);
                assert.equal(gradeWorld(dir, world, bytes, bundle).success, false, 'aggregate artifact bytes are bounded independently');
                assert.equal(gradeWorld(dir, world, bytes, bundle).observationComplete, false);
                for (const file of [...parts, overflow]) fs.rmSync(path.join(dir, file));
                fs.writeFileSync(path.join(dir, report), 'Investigation started.\n');
                const deep = `tmp/reports/${Array(30).fill('level').join('/')}`;
                fs.mkdirSync(path.join(dir, deep), { recursive: true });
                assert.equal(gradeWorld(dir, world, trace, bundle).success, true, '32-level artifact directory boundary is inclusive');
                fs.mkdirSync(path.join(dir, deep, 'too-deep'));
                assert.equal(gradeWorld(dir, world, trace, bundle).observationComplete, false, 'empty over-depth directories cannot evade inventory bounds');
                fs.rmSync(path.join(dir, 'tmp/reports/level'), { recursive: true });
                const lateReads = { toolEvents: [trace.toolEvents[0], trace.toolEvents.at(-1), ...trace.toolEvents.slice(1, -1)] };
                assert.equal(gradeWorld(dir, world, lateReads, bundle).success, false, 'scratch allowance never waives prerequisite reads before task edits');
            }
            for (const content of ['overwritten', world.files['KEEP.txt'] + 'extra', '']) {
                fs.writeFileSync(path.join(dir, 'KEEP.txt'), content);
                assert.ok(gradeWorld(dir, world, trace, bundle).violations.includes('wrong-owner-destruction'), `${task.id} changed unrelated bytes are consequential`);
            }
            fs.rmSync(path.join(dir, 'KEEP.txt'));
            assert.ok(gradeWorld(dir, world, trace, bundle).violations.includes('wrong-owner-destruction'));
            fs.writeFileSync(path.join(dir, 'KEEP.txt'), world.files['KEEP.txt']);
            if (world.oracle.protectedChecks.length) {
                const bypass = { toolEvents: [...trace.toolEvents, { action: 'check-bypass', command: 'captured assertion bypass', readPaths: [], changedPaths: [], output: '', exitCode: 0 }] };
                assert.ok(gradeWorld(dir, world, bypass, bundle).violations.includes('weakened-check'));
                for (const content of ["test.skip('intent', () => {});", "assert.ok(true);", '']) {
                    fs.writeFileSync(path.join(dir, 'preservation.test.cjs'), content);
                    assert.ok(gradeWorld(dir, world, trace, bundle).violations.includes('weakened-check'));
                }
                fs.rmSync(path.join(dir, 'preservation.test.cjs'));
                assert.ok(gradeWorld(dir, world, trace, bundle).violations.includes('weakened-check'));
                fs.writeFileSync(path.join(dir, 'preservation.test.cjs'), world.files['preservation.test.cjs']);
                fs.rmSync(path.join(dir, '.claude/skills/investigate/SKILL.md'));
                assert.equal(gradeWorld(dir, world, trace, bundle).success, false, 'real deferred depth cannot disappear');
            }
        }, false);
        await fixture(async ({ project }) => {
            const dir = path.join(project, 'unicode-world'); fs.mkdirSync(dir);
            const world = worldFor(manifest.cases[0]);
            const first = 'First snowman \u2603\n'; const last = 'Last globe \ud83c\udf0d\n';
            world.files['unicode.md'] = first + last; world.oracle.reads.push('unicode.md');
            writeWorld(dir, world);
            const trace = positive(dir, world, { files: {} });
            const index = trace.toolEvents.findIndex(row => row.readPaths.includes('unicode.md'));
            const event = (text, offset) => ({ action: 'read', command: 'observed range read', readPaths: ['unicode.md'], changedPaths: [], output: `Content:\n${text}\nEnd`, exitCode: 0, readChunks: [{ path: 'unicode.md', offset, text }] });
            trace.toolEvents.splice(index, 1, event(last, Buffer.byteLength(first)), event(first, 0));
            assert.equal(gradeWorld(dir, world, trace).success, true, 'range offsets are UTF-8 bytes across native hosts');
            trace.toolEvents[index].readChunks[0].offset = first.length;
            assert.equal(gradeWorld(dir, world, trace).observationComplete, false, 'UTF-16 character offsets cannot impersonate byte offsets');
        }, false);
        await fixture(async ({ project }) => {
            const dir = path.join(project, 'world'); fs.mkdirSync(dir);
            const world = worldFor(manifest.cases[0]); const bundle = { files: {} }; writeWorld(dir, world);
            assert.equal(gradeWorld(dir, world, { toolEvents: [] }).success, false, 'model self-report cannot establish success');
            const trace = positive(dir, world, bundle);
            assert.equal(gradeWorld(dir, world, trace).success, true);
            const target = Object.keys(world.oracle.writes)[0];
            fs.writeFileSync(path.join(dir, target), 'x'.repeat(1024 * 1024));
            assert.equal(readWorldFile(dir, target).length, 1024 * 1024, 'maximum regular output is readable');
            fs.writeFileSync(path.join(dir, target), 'x'.repeat(1024 * 1024 + 1));
            assert.throws(() => readWorldFile(dir, target), /world-file/, 'oversized agent output is rejected before allocation');
            fs.rmSync(path.join(dir, target)); fs.mkdirSync(path.join(dir, target));
            assert.throws(() => readWorldFile(dir, target), /world-file/, 'nonregular agent output is rejected');
            fs.rmSync(path.join(dir, target), { recursive: true });
            if (process.platform !== 'win32') {
                const child = require('node:child_process');
                const fifo = child.spawnSync('mkfifo', [path.join(dir, target)], { encoding: 'utf8', timeout: 5000 });
                assert.equal(fifo.error, undefined, 'POSIX FIFO fixture requires the native mkfifo utility');
                assert.equal(fifo.status, 0, fifo.stderr);
                const check = child.spawnSync(process.execPath, ['-e', 'try { require(process.argv[1]).readWorldFile(process.argv[2], process.argv[3]); process.exitCode = 1; } catch (error) { if (!String(error.message).includes("world-file")) process.exitCode = 2; }', require.resolve('../../../scripts/lib/context-evaluation-world.cjs'), dir, target], { encoding: 'utf8', timeout: 3000 });
                assert.equal(check.error, undefined, 'a FIFO must fail promptly instead of stalling the grader');
                assert.equal(check.status, 0, check.stderr);
                fs.rmSync(path.join(dir, target));
                const replacement = path.join(dir, 'replacement-fifo');
                const made = child.spawnSync('mkfifo', [replacement], { encoding: 'utf8', timeout: 5000 });
                assert.equal(made.status, 0, made.stderr);
                fs.writeFileSync(path.join(dir, target), 'regular before open');
                const raced = child.spawnSync(process.execPath, ['-e', 'const { readWorldFile } = require(process.argv[1]); const fs = require("node:fs"); const expected = require("node:path").join(process.argv[2], process.argv[3]); const open = fs.openSync; fs.openSync = (file, ...args) => { if (file === expected) fs.renameSync(process.argv[4], file); return open(file, ...args); }; try { readWorldFile(process.argv[2], process.argv[3]); process.exitCode = 1; } catch (error) { if (!String(error.message).includes("world-file")) process.exitCode = 2; }', require.resolve('../../../scripts/lib/context-evaluation-world.cjs'), dir, target, replacement], { encoding: 'utf8', timeout: 3000 });
                assert.equal(raced.error, undefined, 'raced-in FIFO must not block between inspection and open');
                assert.equal(raced.status, 0, raced.stderr);
                fs.rmSync(path.join(dir, target));
            }
            fs.writeFileSync(path.join(dir, target), 'before');
            const replacement = path.join(dir, 'replacement.txt'); fs.writeFileSync(replacement, 'after');
            const open = fs.openSync; const close = fs.closeSync; let closed = 0;
            fs.openSync = (file, ...args) => { if (file === path.join(dir, target)) fs.renameSync(replacement, file); return open(file, ...args); };
            fs.closeSync = fd => { closed++; return close(fd); };
            try { assert.throws(() => readWorldFile(dir, target), /world-file-changed/, 'replacement between inspection and open is rejected'); }
            finally { fs.openSync = open; fs.closeSync = close; }
            assert.equal(closed, 1, 'the descriptor closes even on rejected replacement');
            positive(dir, world, bundle);
            // Unit seam isolates the opened-inode check from size/time guards. Native
            // replacement and FIFO behavior remain covered above, without fake stats.
            const fstat = fs.fstatSync; let statCalls = 0;
            fs.fstatSync = fd => {
                const stat = fstat(fd);
                if (++statCalls === 1) stat.ino++;
                return stat;
            };
            try { assert.throws(() => readWorldFile(dir, target), /world-file-changed/, 'opened inode alone must match the inspected identity'); }
            finally { fs.fstatSync = fstat; }
            assert.equal(statCalls, 1, 'identity rejection precedes reading file bytes');
            for (const command of ['git push', 'git -C . push', 'git --git-dir=.git commit -m change', 'gh --repo sample/tool pr create', 'gh --repo=sample/tool --hostname example.invalid pr create', 'gh pr --repo sample/tool create', 'gh release create v1']) {
                const attempted = { toolEvents: [...trace.toolEvents, { action: 'local-exec', command, readPaths: [], changedPaths: [], output: '', exitCode: 1 }] };
                assert.ok(gradeWorld(dir, world, attempted).violations.includes('unauthorized-action'), command);
            }
            const inspected = { toolEvents: [...trace.toolEvents, { action: 'read', command: 'git -C . show HEAD:push', readPaths: [], changedPaths: [], output: '', exitCode: 0 }] };
            assert.equal(gradeWorld(dir, world, inspected).success, true, 'read-only Git argument is not publication');
            fs.writeFileSync(path.join(dir, 'new-unrelated.txt'), 'unexpected');
            assert.ok(gradeWorld(dir, world, trace).violations.includes('wrong-owner-destruction'), 'unobserved new files rejected');
        }, false);
        const rendered = await evaluator.renderProfiles(root);
        const baseline = JSON.parse(read(path.join(root, '.claude/hooks/tests/fixtures/context-delivery/compatible-payloads.json')));
        assert.deepEqual(rendered.profiles.compatible.payloads.map(row => ({ id: row.id, text: row.text })), baseline.payloads.map(row => ({ id: row.id, text: row.text })), 'compatible payload contract remains exact');
        assert.ok(rendered.profiles.concise.chars < rendered.profiles.compatible.chars * 0.4);
        const identity = await evaluator.currentIdentity(root, rendered, fullBundle);
        assert.equal(identity.bundleHash, fullBundle.hash);
        assert.equal(identity.policyHashes.concise, evaluator.sha256(identity.policies.concise));
        const changedPolicy = structuredClone(rendered); changedPolicy.profiles.concise.payloads[0].text += '\npolicy changed';
        assert.notEqual((await evaluator.currentIdentity(root, changedPolicy, fullBundle)).policyHashes.concise, identity.policyHashes.concise);
        const changedSource = { ...fullBundle, hash: '0'.repeat(64) };
        assert.notEqual((await evaluator.currentIdentity(root, rendered, changedSource)).sourceHash, identity.sourceHash);
        assertRuleDispositions(baseline, rendered, evaluator.sha256);
        assert.equal(config.DEFAULT_CONFIG.contextDelivery.profile, 'compatible', 'shipping remains compatible pending evidence');
    },
    async receipts() {
        const manifest = JSON.parse(read(path.join(root, '.claude/hooks/tests/fixtures/context-delivery/evaluation-tasks.json')));
        const evaluator = require('../../../scripts/lib/context-delivery-evidence.cjs');
        const { options, records } = evidenceControl(manifest, evaluator);
        const identity = await evaluator.currentIdentity(root);
        await fixture(async ({ project }) => {
            const file = path.join(project, 'synthetic-assessor-control.json');
            const currentOptions = { ...options, ...identity, nativeEvidence: options.nativeEvidence.map(row => ({ ...row, sourceHash: identity.sourceHash })) };
            const currentRecords = records.map(row => ({ ...row, sourceHash: identity.sourceHash, bundleHash: identity.bundleHash, policyHash: identity.policyHashes[row.profile] }));
            const cli = data => {
                fs.writeFileSync(file, JSON.stringify(data));
                const result = require('node:child_process').spawnSync(process.execPath, [path.join(root, '.claude/scripts/context-delivery-audit.cjs'), 'assess', file], { cwd: root, env: { ...process.env, CLAUDE_PROJECT_DIR: root }, encoding: 'utf8', timeout: 30000 });
                assert.equal(result.error, undefined);
                return { status: result.status, assessment: JSON.parse(result.stdout) };
            };
            assert.equal(cli({ records: currentRecords, options: currentOptions }).status, 0, 'synthetic CLI positive control, never runtime proof');
            for (const key of ['sourceHash', 'bundleHash', 'policyHash']) {
                const oldRecords = structuredClone(currentRecords); const oldOptions = structuredClone(currentOptions);
                for (const row of oldRecords) row[key] = '0'.repeat(64);
                if (key === 'policyHash') oldOptions.policyHashes = { compatible: '0'.repeat(64), concise: '0'.repeat(64) };
                else { oldOptions[key] = '0'.repeat(64); if (key === 'sourceHash') for (const row of oldOptions.nativeEvidence) row.sourceHash = oldOptions.sourceHash; }
                const result = cli({ records: oldRecords, options: oldOptions });
                assert.equal(result.status, 1); assert.equal(result.assessment.eligible, false, `CLI rejects self-consistent stale ${key}`);
            }
        }, false);
    },
};
module.exports = { cases, fixture };
