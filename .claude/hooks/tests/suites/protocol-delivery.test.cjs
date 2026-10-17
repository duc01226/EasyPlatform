'use strict';

/**
 * Protocol delivery planning — spec ContextDelivery/README.ProtocolDelivery.md §8 "Delivery Planning
 * Tests" under the business spec root (default `docs/specs`; `specRoots.business.path` in
 * `docs/project-config.json` overrides it).
 *
 * Guards: every load path resolves its skill (BR-PDL-15, BR-PDL-06, BR-PDL-08), untrusted names and
 * paths open nothing (BR-PDL-10), the universal bundle and inline rules are never delivered by a skill
 * load (BR-PDL-04, BR-PDL-11), undeclared skills stay inert (BR-PDL-01), and every message fits the bin
 * while losing no protocol (BR-PDL-03, BR-PDL-05). Each test name starts with its TC id (spec join key).
 *
 * Portability: every case plans against its own temp fixture project (projection, group data,
 * skills, agents) with an empty ledger view; the lib is pure, so no environment key is read — the
 * project root and the file reader are injected. Fixtures are removed in `finally`.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const LIB = path.resolve(__dirname, '..', '..', 'lib', 'protocol-delivery.cjs');
const delivery = require(LIB);
// The shared guide recognizer the conversion tooling and verifiers use; delivery must read guide blocks exactly as it does.
const CARRIER = path.resolve(__dirname, '..', '..', '..', 'scripts', 'lib', 'protocol-guide-carrier.cjs');
const carrier = require(CARRIER);

const GROUPS = ['review', 'evidence-trace', 'workflow-task', 'spec-test', 'design', 'universal'];
// Fixture stand-ins for the hook-delivered universal bundle: published in the index, never delivered by a skill load.
const UNIVERSAL = ['ai-mistake-prevention', 'critical-thinking-mindset', 'project-protocol-overlay', 'project-reference-docs-guide'];
const PROTOCOLS_DIR = '.claude/skills/shared/protocols';
const BIN = 9500;

// ── fixture project ─────────────────────────────────────────────────────────

function marker(tag) {
    return `[[FULL:${tag}]]`;
}

function protocolText(tag, size = 300) {
    const head = `> **${tag}** — fixture protocol ${marker(tag)}\n> `;
    return head + 'x'.repeat(Math.max(0, size - head.length));
}

/** `customPath`: a path string, or a function of the tag; default the tag's published file. */
function guideBlock(tags, customPath) {
    const pathFor = tag => (typeof customPath === 'function' ? customPath(tag) : customPath) || `${PROTOCOLS_DIR}/${tag}.md`;
    const lines = tags.map(tag => `- \`${tag}\` — Fixture summary for ${tag}; when it applies → ${pathFor(tag)}`);
    return ['<!-- PROTOCOL-GUIDES:START -->', ...lines, '<!-- PROTOCOL-GUIDES:END -->'].join('\n');
}

function skillFile(name, block) {
    return `---\nname: ${name}\ndescription: fixture skill\n---\n\n# ${name}\n\n${block || 'Full protocol bodies stay inline here.'}\n`;
}

function withFixture(fn) {
    const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'pdl-test-')));
    const project = path.join(root, 'project');
    const fx = {
        root,
        project,
        abs: rel => path.join(project, ...rel.split('/')),
        write(rel, content) {
            const file = fx.abs(rel);
            fs.mkdirSync(path.dirname(file), { recursive: true });
            fs.writeFileSync(file, content);
            return file;
        },
        /** Projection in the index shape the generator writes: rows wrapped in `tags`, parts listed per row. */
        projection(specs, inlineSkills = ['inline-review']) {
            const rows = specs.map(spec => {
                const texts = spec.parts || [spec.text || protocolText(spec.tag, spec.size)];
                const files = texts.length === 1
                    ? [`${PROTOCOLS_DIR}/${spec.tag}.md`]
                    : texts.map((_, i) => `${PROTOCOLS_DIR}/${spec.tag}.part-${i + 1}.md`);
                texts.forEach((text, i) => fx.write(files[i], `${text}\n`));
                return {
                    tag: spec.tag,
                    group: spec.group,
                    summary: `Fixture summary for ${spec.tag}`,
                    when: 'when it applies',
                    chars: texts.join('').length,
                    file: `${PROTOCOLS_DIR}/${spec.tag}.md`,
                    parts: files.map((file, i) => ({ file, chars: texts[i].length }))
                };
            });
            fx.write(`${PROTOCOLS_DIR}/index.json`, JSON.stringify({ binChars: BIN, groups: GROUPS, tags: rows }, null, 2));
            fx.write('.claude/skills/shared/protocol-groups.json', JSON.stringify({ version: 1, binChars: BIN, groups: {}, inlineSkills }, null, 2));
        },
        skill(name, block, { mirror = true } = {}) {
            fx.write(`.claude/skills/${name}/SKILL.md`, skillFile(name, block));
            if (mirror) fx.write(`.agents/skills/${name}/SKILL.md`, skillFile(name, block));
        },
        agent(file, frontmatter) {
            fx.write(`.claude/agents/${file}.md`, `---\n${frontmatter}\n---\n\n# Agent\n`);
        }
    };
    try {
        return fn(fx);
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
}

/** The standard fixture: three review tags, one evidence tag, four universal tags, six skills, four agents. */
function standard(fx, { inlineSkills } = {}) {
    fx.projection([
        { tag: 'review-alpha', group: 'review' },
        { tag: 'review-beta', group: 'review' },
        { tag: 'review-gamma', group: 'review' },
        { tag: 'evidence-alpha', group: 'evidence-trace' },
        ...UNIVERSAL.map(tag => ({ tag, group: 'universal' }))
    ], inlineSkills);
    // Declares a duplicate, a universal tag by mistake and an unknown tag.
    fx.skill('conv-a', guideBlock(['review-alpha', 'review-beta', 'evidence-alpha', 'review-alpha', 'critical-thinking-mindset', 'not-in-index']));
    fx.skill('conv-b', guideBlock(['review-gamma']));
    fx.skill('review-free', guideBlock(['evidence-alpha']));
    fx.skill('plain');
    fx.skill('empty-block', '<!-- PROTOCOL-GUIDES:START -->\n<!-- PROTOCOL-GUIDES:END -->');
    fx.skill('unclosed', '<!-- PROTOCOL-GUIDES:START -->\n- `review-alpha` — summary; when → path');
    // An inline review-family skill that carries a guide entry by mistake: still nothing.
    fx.skill('inline-review', guideBlock(['review-gamma']));
    fx.agent('fx-agent', 'name: fx-agent\ndescription: preloads a converted and an inline skill\nskills: conv-a, inline-review');
    fx.agent('fx-block', 'name: fx-block\nskills:\n  - conv-b');
    fx.agent('fx-mismatch', 'name: other-name\nskills: conv-a');
    fx.agent('fx-noskills', 'name: fx-noskills\ndescription: no preloaded skills');
}

function spyReader() {
    const opened = [];
    const readFile = file => {
        opened.push(file);
        try {
            return fs.readFileSync(file, 'utf8');
        } catch {
            return null;
        }
    };
    return { opened, readFile };
}

function plan(fx, input, group, extra = {}) {
    return delivery.planDelivery(input, group, {
        projectRoot: fx.project,
        isDelivered: () => false,
        ...extra
    });
}

/** BR-PDL-16: an unreadable trigger context delivers the gated protocol; a readable one with no match withholds it. */
function unreadableTriggerContextDelivers() {
    withFixture(fx => {
        // Given a gated design tag beside an ungated one
        fx.projection([
            { tag: 'design-gated', group: 'design' },
            { tag: 'design-plain', group: 'design' }
        ]);
        fx.write('.claude/skills/shared/protocol-groups.json', JSON.stringify({
            version: 1,
            deliveryTriggers: { ui: { pattern: '\\b(?:screen|mockup)\\b', pathPattern: '\\.(?:tsx|vue)\\b', skills: [] } },
            groups: { design: { tags: { 'design-gated': { summary: 's', when: 'w', trigger: 'ui' }, 'design-plain': { summary: 's', when: 'w' } } } },
            inlineSkills: []
        }));
        fx.skill('mixed', guideBlock(['design-gated', 'design-plain']));
        const both = ['design-gated', 'design-plain'];
        const load = skillLoad('mixed');
        // When the context provider throws, returns a non-object, or reports itself unreadable
        // Then the gated protocol is delivered in full: a failing rule never withholds a protocol
        assertTags(plan(fx, load, 'design', { triggerContext: () => { throw new Error('unreadable'); } }), both, 'provider throws');
        assertTags(plan(fx, load, 'design', { triggerContext: () => null }), both, 'provider returns a non-object');
        assertTags(plan(fx, load, 'design', { triggerContext: () => ({ prompts: '', transcript: '', unreadable: true }) }), both, 'provider reports unreadable');
        // And a readable context with no UI signal still withholds it (the gate is not a no-op)
        const readable = plan(fx, load, 'design', { triggerContext: () => ({ prompts: 'optimize the batch import query', transcript: '', unreadable: false }) });
        assertTags(readable, ['design-plain'], 'readable, no match');
        assert.ok(!readable.text.includes('design-gated'), 'a withheld protocol leaked');

        // Given the real context builder: a session with no record file at all
        const input = { hook_event_name: 'PostToolUse', session_id: 's1', transcript_path: path.join(fx.root, 'missing.jsonl') };
        const env = { HOME: fx.root, USERPROFILE: fx.root, TMPDIR: fx.root, TEMP: fx.root, TMP: fx.root };
        // When the record is absent (ENOENT), the context is readable and empty
        assert.equal(delivery.buildTriggerContext(fx.project, input, env).unreadable, false, 'an absent record is not an unreadable one');
        // Given an existing prompt record corrupted by an interrupted or external write
        const promptFile = fx.abs('tmp/prompt-ledger/s1/ledger.json');
        fs.mkdirSync(path.dirname(promptFile), { recursive: true });
        for (const malformed of ['{bad json', JSON.stringify({ version: 1, entries: null })]) {
            fs.writeFileSync(promptFile, malformed);
            // When the real builder reads it, Then full gated guidance must still arrive
            const context = delivery.buildTriggerContext(fx.project, input, env);
            assert.equal(context.unreadable, true, 'an existing malformed prompt record is unreadable');
            assertTags(plan(fx, load, 'design', { triggerContext: () => context }), both, 'corrupt prompt record opens the gate');
        }
        // Given a non-file source, representing a failed/invalid replacement at the storage boundary
        fs.unlinkSync(promptFile);
        fs.mkdirSync(promptFile);
        // When reading fails, Then it is not mistaken for a legitimately absent record
        assert.equal(delivery.buildTriggerContext(fx.project, input, env).unreadable, true, 'prompt read failure opens the gate');
        fs.rmdirSync(promptFile);
        // And healthy prompt records keep the subject gate meaningful in either direction
        for (const prefix of ['', '\uFEFF']) {
            for (const [text, expected] of [['optimize the batch query', ['design-plain']], ['build a screen', both]]) {
                // Given a healthy UTF-8 record, with or without its optional byte-order mark
                const record = { version: 1, entries: [{ text }] };
                fs.writeFileSync(promptFile, prefix + JSON.stringify(record));
                // When either reader loads it, Then the ledger and subject gate retain their meaning
                const context = delivery.buildTriggerContext(fx.project, input, env);
                assert.equal(context.unreadable, false, 'healthy prompt record remains readable');
                assertTags(plan(fx, load, 'design', { triggerContext: () => context }), expected, 'healthy prompt subject gate');
                assert.deepEqual(require('../../lib/prompt-ledger-store.cjs').readLedger(path.dirname(promptFile)), record, 'nullable reader preserves healthy records');
            }
        }
        // When the record cannot be opened for a reason other than absence (a path with a NUL byte is refused on every OS, standing in for a locked or corrupt record)
        const broken = delivery.buildTriggerContext(fx.project, { ...input, transcript_path: path.join(fx.root, 'bad\0.jsonl') }, env);
        // Then the context is unreadable, so the gate opens
        assert.equal(broken.unreadable, true, 'an unreadable record marks the context unreadable');
        // And a readable record with text is kept as the transcript
        fs.writeFileSync(path.join(fx.root, 'ok.jsonl'), '{"file_path":"a.tsx"}');
        const ok = delivery.buildTriggerContext(fx.project, { ...input, transcript_path: path.join(fx.root, 'ok.jsonl') }, env);
        assert.deepEqual([ok.unreadable, ok.transcript], [false, '{"file_path":"a.tsx"}'], 'a readable record');
    });
}

function planAll(fx, input, extra = {}) {
    return Object.fromEntries(GROUPS.map(group => [group, plan(fx, input, group, extra)]));
}

function count(text, needle) {
    return text.split(needle).length - 1;
}

const skillLoad = (name, key = 'skill') => ({ hook_event_name: 'PostToolUse', tool_name: 'Skill', tool_input: { [key]: name }, session_id: 's1' });
const typed = name => ({ hook_event_name: 'UserPromptExpansion', command_name: name, session_id: 's1' });
const codexPrompt = prompt => ({ hook_event_name: 'UserPromptSubmit', prompt, turn_id: 't1', session_id: 's1' });
const codexShell = (command, cwd) => ({ hook_event_name: 'PostToolUse', tool_name: 'Bash', tool_input: { command }, turn_id: 't1', cwd });
const read = (filePath, cwd) => ({ hook_event_name: 'PostToolUse', tool_name: 'Read', tool_input: { file_path: filePath }, cwd });
const agentStart = type => ({ hook_event_name: 'SubagentStart', agent_type: type, agent_id: 'a1', session_id: 's1' });

function assertTags(result, expected, label) {
    assert.deepEqual(result.tags, expected, `${label}: tags`);
    for (const tag of expected) assert.equal(count(result.text, marker(tag)), 1, `${label}: ${tag} full text exactly once`);
    assert.ok(result.text.length <= BIN, `${label}: ${result.text.length} chars exceeds the bin`);
}

function assertEmpty(result, label) {
    assert.deepEqual(result, { text: '', tags: [], full: [], named: [], summarized: [] }, `${label}: expected nothing`);
}

// ── property generator (TC-PDL-016) ─────────────────────────────────────────

function mulberry32(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** Pack items for `n` generated tags (200..9,500 chars; every fifth tag split in two parts). */
function generatedItems(random, n) {
    const items = [];
    for (let t = 1; t <= n; t++) {
        const tag = `gen-${String(t).padStart(2, '0')}`;
        const parts = t % 5 === 0 ? 2 : 1;
        for (let p = 1; p <= parts; p++) {
            const size = 200 + Math.floor(random() * (9500 - 200 + 1));
            const head = `<<${tag}:p${p}>>`;
            items.push({ tag, part: p, parts, file: `${PROTOCOLS_DIR}/${tag}${parts > 1 ? `.part-${p}` : ''}.md`, text: head + 'y'.repeat(size - head.length) });
        }
    }
    return items;
}

/** The line that names one part by its own published path. */
function nameLineOf(item) {
    const partLabel = item.parts > 1 ? ` part ${item.part} of ${item.parts}` : '';
    return `- \`${item.tag}\`${partLabel} → ${item.file}`;
}

/**
 * Each item appears exactly once: full text, a named line, or counted in the summary line. The
 * result's `named` / `summarized` lists match the text, and the anonymous summary line is used only
 * when naming every part — with nothing in full — would already exceed the bin (BR-PDL-03).
 */
function assertEachOnce(items, result, label) {
    const text = result.text;
    assert.ok(text.length <= BIN, `${label}: ${text.length} chars exceeds the bin`);
    const summary = /^- (\d+) more `[^`]+` protocol entries → (.+)$/m.exec(text);
    let missing = 0;
    const namedTags = new Set();
    const missingTags = new Set();
    for (const item of items) {
        const full = count(text, `<<${item.tag}:p${item.part}>>`);
        const named = count(text, nameLineOf(item));
        assert.ok(full + named <= 1, `${label}: ${item.tag} p${item.part} appears ${full + named} times`);
        if (named) namedTags.add(item.tag);
        if (full + named === 0) {
            missing += 1;
            missingTags.add(item.tag);
        }
    }
    assert.deepEqual([...result.named].sort(), [...namedTags].sort(), `${label}: plan.named lists exactly the tags named by path`);
    assert.deepEqual([...result.summarized].sort(), [...missingTags].sort(), `${label}: plan.summarized lists exactly the tags only the summary counts`);
    if (summary) {
        assert.equal(Number(summary[1]), missing, `${label}: the summary line counts every unlisted entry`);
        assert.equal(summary[2], delivery.INDEX_REL, `${label}: the summary names the index path`);
        // Property: summary line present ⇒ the all-named render (nothing in full) exceeds the bin.
        const head = /^Not included above.*$/m.exec(text);
        assert.ok(head, `${label}: the summary line comes without the "read these" head`);
        const allNamed = items.reduce((total, item) => total + 1 + nameLineOf(item).length, head[0].length);
        assert.ok(allNamed > BIN, `${label}: a summary line was used although all ${items.length} parts could be named in ${allNamed} chars`);
    } else {
        assert.equal(missing, 0, `${label}: an entry is lost`);
    }
}

// ── tests ───────────────────────────────────────────────────────────────────

const tests = [
    {
        name: '[protocol-delivery] conditional subjects keep unrelated operations lean without losing applicable guidance',
        fn: () => withFixture(fx => {
            // TechnicalSpec=protocol-delivery-conditional-subjects: relevance changes the payload,
            // never the applicable BR-PDL-16 rule or its full-source fallback.
            // Use shipped metadata with an isolated fixture projection, skills and empty ledger.
            const shipped = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../../skills/shared/protocol-groups.json'), 'utf8'));
            const cases = [
                ['output-quality-principles', 'workflow-task', 'e2e-test', 'run the API checks', 'update the reference document'],
                ['review-policy', 'review', 'architecture', 'describe the existing architecture', 'audit architecture'],
                ['review-decision-autonomy', 'review', 'work-item', 'refine an idea', '--mode=review'],
                ['behavioral-delta-matrix', 'review', 'why-review', 'evaluate this decision', 'review a regression fix'],
                ['end-to-start-debugger-trace', 'evidence-trace', 'graph-code', 'export graph JSON', 'trace an unclear code flow'],
                ['root-cause-debugging', 'evidence-trace', 'pull-request', 'open the pull request', 'diagnose CI failures'],
                ['fix-layer-accountability', 'evidence-trace', 'plan', 'plan a new feature', 'plan a bug fix'],
                ['preservation-inventory', 'workflow-task', 'plan', 'plan a new feature', 'plan a regression fix'],
                ['test-failure-fault-adjudication', 'spec-test', 'e2e-test', 'run the checks', 'the tests are failing'],
                ['cross-service-check', 'evidence-trace', 'spec', 'describe local validation', 'describe cross-service events'],
                ['cross-stack-impact-trace', 'review', 'why-review', 'evaluate a decision', 'review the API response'],
                ['graph-assisted-investigation', 'evidence-trace', 'understand', 'explain this decision', 'explain the blast-radius'],
                ['graph-impact-analysis', 'evidence-trace', 'integration-test', 'verify isolated math', 'verify a cross-module change'],
                ['translation-sync-check', 'review', 'changes-review', 'review retry logic', 'review i18n strings'],
                ['shared-protocol-duplication-policy', 'workflow-task', 'prompt-enhance', 'rewrite this message', 'update a shared protocol'],
                ['e2e-visual-design-contract', 'spec-test', 'e2e-test', 'verify the CLI', 'review the UI states'],
                ['ui-system-context', 'design', 'plan', 'plan worker retries', 'plan the form layout'],
                ['ui-intent-layer', 'design', 'spec', 'describe worker retries', 'describe the checkout screen'],
                ['ui-wireframe', 'design', 'initiative', 'capture a worker improvement', 'capture the checkout screen']
            ];
            for (const [tag, group, skill, unrelated, relevant] of cases) {
                fx.projection([{ tag, group }], []);
                fx.write('.claude/skills/shared/protocol-groups.json', JSON.stringify(shipped));
                fx.skill(skill, guideBlock([tag]));
                for (const host of ['claude', 'codex', 'opencode']) {
                    const event = host === 'codex' ? codexPrompt(`$${skill}`) : skillLoad(skill, host === 'opencode' ? 'name' : 'skill');
                    const run = context => plan(fx, event, group, { host, triggerContext: () => context });
                    const context = prompts => ({ prompts, transcript: '', unreadable: false });
                    assertTags(run(context(unrelated)), [], `${host}/${tag}: unrelated operation`);
                    assertTags(run(context(relevant)), [tag], `${host}/${tag}: applicable operation`);
                    assertTags(run({ unreadable: true }), [tag], `${host}/${tag}: unreadable context`);
                    const guidePath = host === 'codex' ? '.agents' : '.claude';
                    assert.ok(carrier.guideTags(fs.readFileSync(fx.abs(`${guidePath}/skills/${skill}/SKILL.md`), 'utf8')).includes(tag), 'deferral keeps the full-source fallback');
                }
            }
            // Dedicated authors still receive navigation even when the prompt has no keywords.
            const tag = 'output-quality-principles';
            fx.projection([{ tag, group: 'workflow-task' }], []);
            fx.write('.claude/skills/shared/protocol-groups.json', JSON.stringify(shipped));
            for (const skill of ['docs-manager', 'scan', 'scan-all', 'prompt-enhance', 'skill-creator']) {
                fx.skill(skill, guideBlock([tag]));
                assertTags(plan(fx, skillLoad(skill), 'workflow-task'), [tag], `${skill}: author owner`);
            }
        })
    },
    {
        name: 'TC-PDL-064 fresh-reviewer template stays deferred for inline work and loads for dispatch or unreadable context',
        fn: () => withFixture(fx => {
            const shipped = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../../skills/shared/protocol-groups.json'), 'utf8'));
            const tag = 'review-protocol-injection';
            assert.equal(shipped.groups.review.tags[tag].trigger, 'review-dispatch');
            fx.projection([{ tag, group: 'review' }]);
            fx.write('.claude/skills/shared/protocol-groups.json', JSON.stringify({ version: 1, inlineSkills: [], deliveryTriggers: { 'review-dispatch': shipped.deliveryTriggers['review-dispatch'] }, groups: { review: { tags: { [tag]: shipped.groups.review.tags[tag] } } } }));
            fx.skill('why-review', guideBlock([tag]));
            fx.skill('changes-review', guideBlock([tag]));
            const context = prompts => ({ prompts, transcript: '', unreadable: false });
            assertTags(plan(fx, skillLoad('why-review'), 'review', { triggerContext: () => context('evaluate this analysis inline') }), [], 'inline work');
            for (const prompt of ['spawn a reviewer', 'delegate review', 'use sub-agents', 'parallel reviewers']) {
                assertTags(plan(fx, skillLoad('why-review'), 'review', { triggerContext: () => context(prompt) }), [tag], prompt);
            }
            assertTags(plan(fx, skillLoad('changes-review'), 'review', { triggerContext: () => context('review this diff') }), [tag], 'dispatch-owning skill');
            assertTags(plan(fx, skillLoad('why-review'), 'review', { triggerContext: () => ({ unreadable: true }) }), [tag], 'unreadable context');
        })
    },
    {
        name: 'TC-PDL-009 a converted skill loaded through the skill tool receives its review protocols in full',
        fn: () => withFixture(fx => {
            // Given a converted skill that declares two review protocols (one listed twice) and no delivery recorded
            standard(fx);
            // When the assistant loads it by its own choice
            const review = plan(fx, skillLoad('conv-a'), 'review');
            // Then the review message holds both full texts once each, within the bin, and nothing of another group
            assertTags(review, ['review-alpha', 'review-beta'], 'review group');
            assert.deepEqual(review.full, ['review-alpha', 'review-beta']);
            assert.ok(!review.text.includes(marker('evidence-alpha')), 'a protocol from another group leaked in');
            assert.ok(!review.text.includes('Fixture summary for'), 'a guide line was delivered instead of text');
            // And the ledger view contract: a tag reported as delivered is not packed again
            assertTags(plan(fx, skillLoad('conv-a'), 'review', { isDelivered: tag => tag === 'review-alpha' }), ['review-beta'], 'ledger view');
            // Boundary: a skill that declares no protocol of this group → empty message
            assertEmpty(plan(fx, skillLoad('review-free'), 'review'), 'no review protocols declared');
            assertTags(plan(fx, skillLoad('review-free'), 'evidence-trace'), ['evidence-alpha'], 'its own group');
        })
    },
    {
        name: 'TC-PDL-010 a typed command, a Codex prompt naming the skill and the OpenCode skill field deliver the same protocols',
        fn: () => withFixture(fx => {
            // Given a converted skill with its second-host copy
            standard(fx);
            const claudeSpy = spyReader();
            const codexSpy = spyReader();
            // When the user types its command on the primary host, or names it in a second-host prompt
            const viaTyped = planAll(fx, typed('conv-a'), { readFile: claudeSpy.readFile });
            const viaPrompt = planAll(fx, codexPrompt('Please run $conv-a now.'), { readFile: codexSpy.readFile });
            const viaBridge = planAll(fx, skillLoad('conv-a', 'name'));
            // Then every group returns the same protocols on each path
            for (const group of GROUPS) {
                assert.deepEqual(viaPrompt[group], viaTyped[group], `${group}: prompt path differs from typed command`);
                assert.deepEqual(viaBridge[group], viaTyped[group], `${group}: OpenCode skill field differs`);
            }
            assertTags(viaTyped.review, ['review-alpha', 'review-beta'], 'typed');
            // And the second host reads its own skill copy, the primary host the source skill
            assert.ok(codexSpy.opened.includes(fx.abs('.agents/skills/conv-a/SKILL.md')), 'Codex did not read the mirror copy');
            assert.ok(claudeSpy.opened.includes(fx.abs('.claude/skills/conv-a/SKILL.md')), 'Claude did not read the source skill');
            // Edge: a prompt naming two skills → the union, each protocol once
            assertTags(plan(fx, codexPrompt('Use $conv-a and then $conv-b: review it.'), 'review'), ['review-alpha', 'review-beta', 'review-gamma'], 'two skills');
            // Boundary: a prompt with no skill named → nothing
            assertEmpty(plan(fx, codexPrompt('Show me $HOME and $PATH please'), 'review'), 'no skill named');
            assertEmpty(plan(fx, codexPrompt('No dollar sign here'), 'review'), 'no token');
        })
    },
    {
        name: 'TC-PDL-011 an agent that preloads skills receives the protocols of its converted skills at start',
        fn: () => withFixture(fx => {
            // Given agent definitions whose names match their types and that preload skills
            standard(fx);
            // When each agent starts
            const withInline = plan(fx, agentStart('fx-agent'), 'review');
            const blockList = plan(fx, agentStart('fx-block'), 'review');
            // Then the converted skills' protocols are returned; the inline skill contributes nothing
            assertTags(withInline, ['review-alpha', 'review-beta'], 'fx-agent');
            assert.ok(!withInline.text.includes(marker('review-gamma')), 'the inline skill contributed a protocol');
            assertTags(blockList, ['review-gamma'], 'block-list skills');
            // Boundary: an agent file whose declared name differs from the agent type is not trusted
            const spy = spyReader();
            assertEmpty(plan(fx, agentStart('fx-mismatch'), 'review', { readFile: spy.readFile }), 'name mismatch');
            assert.deepEqual(spy.opened, [fx.abs('.claude/agents/fx-mismatch.md')], 'a skill file was opened for an untrusted agent file');
            assertEmpty(plan(fx, agentStart('fx-noskills'), 'review'), 'no preloaded skills');
            assertEmpty(plan(fx, agentStart('no-such-agent'), 'review'), 'no agent file');
        })
    },
    {
        name: 'TC-PDL-012 no skill-load group delivers anything to an Explore or Plan agent, or to an agent that preloads no skill',
        fn: () => withFixture(fx => {
            // Given the universal tags published and agents that preload nothing (the universal bundle reaches them through the universal hook)
            standard(fx);
            for (const type of ['Explore', 'Plan', 'fx-noskills', 'general-purpose']) {
                const spy = spyReader();
                // When the agent starts
                const all = planAll(fx, agentStart(type), { readFile: spy.readFile });
                // Then no group returns anything, the universal group included
                for (const group of GROUPS) assertEmpty(all[group], `${type} ${group}`);
                assert.ok(spy.opened.every(file => !file.endsWith('SKILL.md')), `${type}: a skill file was opened`);
            }
            // And the second host behaves the same
            assertEmpty(plan(fx, { ...agentStart('Explore'), turn_id: 't1' }, 'universal'), 'Codex Explore');
        })
    },
    {
        name: 'TC-PDL-013 reading a skill file, or a Codex shell command reading its copy, delivers its protocols',
        fn: () => withFixture(fx => {
            // Given a converted skill and its second-host copy
            standard(fx);
            const expected = ['review-alpha', 'review-beta'];
            // When its skill file is read (absolute path, and relative to a subfolder cwd)
            assertTags(plan(fx, read(fx.abs('.claude/skills/conv-a/SKILL.md')), 'review'), expected, 'absolute Read');
            fs.mkdirSync(fx.abs('src/deep'), { recursive: true });
            assertTags(plan(fx, read('../../.claude/skills/conv-a/SKILL.md', fx.abs('src/deep')), 'review'), expected, 'relative Read');
            // Or a second-host shell command reads the copy, in any shell and with either path separator
            const commands = [
                'Get-Content -Raw .agents/skills/conv-a/SKILL.md',
                'cat .agents\\skills\\conv-a\\SKILL.md',
                `type "${fx.abs('.agents/skills/conv-a/SKILL.md')}"`,
                "sed -n '1,120p' ./.agents/skills/conv-a/SKILL.md | head -50",
                'Get-Content -Path .claude/skills/conv-a/SKILL.md -TotalCount 40'
            ];
            for (const command of commands) {
                // Then its protocols are returned
                assertTags(plan(fx, codexShell(command, fx.project), 'review'), expected, command);
            }
            // Edge: a command that lists a skill folder without reading its file → nothing
            assertEmpty(plan(fx, codexShell('ls .agents/skills/conv-a', fx.project), 'review'), 'folder listing');
            // Boundary: a command that mentions no skill file → nothing
            assertEmpty(plan(fx, codexShell('echo hello', fx.project), 'review'), 'no skill file');
            assertEmpty(plan(fx, read(fx.abs('src/index.js')), 'review'), 'ordinary file read');
        })
    },
    {
        name: 'TC-PDL-016 every packed message fits the bin and names every protocol that does not fit',
        fn: () => {
            // Given generated sets of 1 to 40 protocols of 200 to 9,500 characters (fixed seed)
            const random = mulberry32(20260925);
            let overflowSeen = 0;
            for (let n = 1; n <= 40; n++) {
                const items = generatedItems(random, n);
                // When each set is packed
                const result = delivery.pack(items, { bin: BIN, group: 'review' });
                // Then every message is at most 9,500 chars and each protocol appears exactly once
                assertEachOnce(items, result, `n=${n}`);
                assert.deepEqual(result.tags, [...new Set(items.map(item => item.tag))], `n=${n}: tags`);
                if (result.named.length) overflowSeen += 1;
            }
            assert.ok(overflowSeen > 30, `the generator should overflow most sets (saw ${overflowSeen})`);
            // Edge: one protocol of exactly 9,500 characters → one full message
            const exact = [{ tag: 'exact', part: 1, parts: 1, file: `${PROTOCOLS_DIR}/exact.md`, text: 'z'.repeat(BIN) }];
            const exactResult = delivery.pack(exact, { bin: BIN, group: 'review' });
            assert.equal(exactResult.text.length, BIN);
            assert.deepEqual(exactResult.full, ['exact']);
            // Boundary: a set whose named paths alone exceed the bin → still within it, the rest named by the index path
            const many = Array.from({ length: 400 }, (_, i) => ({ tag: `long-tag-name-${i}`, part: 1, parts: 1, file: `${PROTOCOLS_DIR}/long-tag-name-${i}.md`, text: `<<long-tag-name-${i}:p1>>${'w'.repeat(3000)}` }));
            const manyResult = delivery.pack(many, { bin: BIN, group: 'review' });
            assertEachOnce(many, manyResult, '400 tags');
            assert.ok(/^- \d+ more `review` protocol entries → /m.test(manyResult.text), 'no index-path summary line');
            assert.equal(manyResult.tags.length, 400, 'every tag is reported as covered');
            // Counter-case: a big full text never buys its place by turning nameable protocols into an anonymous count
            const small = Array.from({ length: 10 }, (_, i) => ({ tag: `small-${i}`, part: 1, parts: 1, file: `${PROTOCOLS_DIR}/small-${i}.md`, text: `<<small-${i}:p1>>${'s'.repeat(290)}` }));
            const crowded = [{ tag: 'big', part: 1, parts: 1, file: `${PROTOCOLS_DIR}/big.md`, text: `<<big:p1>>${'b'.repeat(9000)}` }, ...small];
            const crowdedResult = delivery.pack(crowded, { bin: BIN, group: 'review' });
            assertEachOnce(crowded, crowdedResult, 'one 9,000 + ten 300');
            assert.ok(!/^- \d+ more `review` protocol entries/m.test(crowdedResult.text), 'every overflow protocol must be named by its path');
            assert.deepEqual(crowdedResult.summarized, [], 'nothing is left to the anonymous summary');
        }
    },
    {
        name: 'TC-PDL-016 planned delivery overflows by index path, keeps split parts in order, and names an unreadable part',
        fn: () => withFixture(fx => {
            // Given a skill declaring six 3,000-char review protocols and a two-part protocol
            fx.projection([
                ...Array.from({ length: 6 }, (_, i) => ({ tag: `big-${i}`, group: 'review', size: 3000 })),
                { tag: 'split-small', group: 'review', parts: [protocolText('split-small', 1500), '(tail) small second part'] }
            ]);
            fx.skill('heavy', guideBlock(['split-small', ...Array.from({ length: 6 }, (_, i) => `big-${i}`)]));
            // When the review group is planned
            const result = plan(fx, skillLoad('heavy'), 'review');
            // Then it fits, the split protocol arrives whole with its continuation labelled, and the overflow names index paths
            assert.ok(result.text.length <= BIN, `${result.text.length} chars`);
            assert.ok(result.text.includes('(`split-small` continued, part 2 of 2)\n(tail) small second part'), 'part 2 missing or unlabelled');
            assert.ok(result.named.length >= 2, `expected overflow, got ${JSON.stringify(result.named)}`);
            for (const tag of result.named) assert.equal(count(result.text, `- \`${tag}\` → ${PROTOCOLS_DIR}/${tag}.md`), 1, `${tag} not named by its index path`);
            for (const tag of result.full) assert.equal(count(result.text, marker(tag)), 1, `${tag} not delivered once`);
            assert.equal(result.full.length + result.named.length, 7, 'a protocol was lost');
            // Edge: a projection file that cannot be read degrades to its path, never to silence
            fs.rmSync(fx.abs(`${PROTOCOLS_DIR}/big-0.md`));
            const degraded = plan(fx, skillLoad('heavy'), 'review');
            assert.equal(count(degraded.text, `- \`big-0\` → ${PROTOCOLS_DIR}/big-0.md`), 1, 'unreadable protocol not named');
        })
    },
    {
        name: 'TC-PDL-017 a universal protocol is never delivered by a skill load, whatever a skill declares',
        fn: () => withFixture(fx => {
            // Given a converted skill that lists a universal protocol by mistake
            standard(fx);
            // When the converted skill loads
            const all = planAll(fx, skillLoad('conv-a'));
            // Then no universal protocol is returned by any group
            assertEmpty(all.universal, 'universal group');
            for (const group of GROUPS) {
                for (const tag of UNIVERSAL) assert.ok(!all[group].tags.includes(tag), `${group} delivered ${tag}`);
            }
        })
    },
    {
        name: 'TC-PDL-018 an inline skill receives nothing from any group, by any load path',
        fn: () => withFixture(fx => {
            // Given an inline skill (which declares a guide entry by mistake) beside a converted skill
            standard(fx);
            // When the inline skill loads, by any load path
            for (const input of [skillLoad('inline-review'), typed('inline-review'), read(fx.abs('.claude/skills/inline-review/SKILL.md'))]) {
                // Then no group returns anything: its role protocols are full bodies
                const all = planAll(fx, input);
                for (const group of GROUPS) assertEmpty(all[group], `inline ${input.hook_event_name} ${group}`);
            }
            // Boundary: the same name removed from the inline list (read from the group data) → treated by its guide block
            standard(fx, { inlineSkills: [] });
            assertTags(plan(fx, skillLoad('inline-review'), 'review'), ['review-gamma'], 'removed from inline list');
        })
    },
    {
        name: 'TC-PDL-018b a retired root-carried pointer line declares nothing: a skill holding only it is undeclared and inert',
        fn: () => withFixture(fx => {
            // Given skills that hold only the retired pointer line
            standard(fx, { inlineSkills: ['inline-review', 'inline-ptr'] });
            const pointer = '> **Root-carried protocols** — `critical-thinking-mindset` is carried once by the root instruction file; read its file if that is absent.';
            fx.skill('ptr-only', pointer);
            fx.skill('inline-ptr', pointer);
            for (const name of ['ptr-only', 'inline-ptr']) {
                // When it loads
                const all = planAll(fx, skillLoad(name));
                // Then no group returns anything (the line is no guide entry)
                for (const group of GROUPS) assertEmpty(all[group], `${name} ${group}`);
            }
            assert.equal(delivery.declaredTags(pointer), null, 'the pointer line declares no tag');
        })
    },
    {
        name: 'TC-PDL-019 a skill that declares no guide block receives nothing',
        fn: () => withFixture(fx => {
            // Given a skill with full bodies and no guide block, one with an empty block and one with an unclosed block
            standard(fx);
            for (const name of ['plain', 'empty-block', 'unclosed']) {
                // When it loads
                const all = planAll(fx, skillLoad(name));
                // Then no group returns anything
                for (const group of GROUPS) assertEmpty(all[group], `${name} ${group}`);
            }
            // Boundary: the same skill with a guide block → its protocols are returned
            fx.skill('plain', guideBlock(['review-beta']));
            assertTags(plan(fx, skillLoad('plain'), 'review'), ['review-beta'], 'after conversion');
        })
    },
    {
        name: 'TC-PDL-056 unsafe names, outside paths and unknown protocols open nothing and echo nothing',
        fn: () => withFixture(fx => {
            // Given a fixture with a file reader that records every open
            standard(fx);
            fx.write('node_modules/x/skills/y/SKILL.md', skillFile('y', guideBlock(['review-alpha'])));
            fx.write('tmp/clone/.claude/skills/conv-a/SKILL.md', skillFile('conv-a', guideBlock(['review-alpha'])));
            const hostile = [
                agentStart('../../docs/x'),
                agentStart('..\\..\\docs\\x'),
                skillLoad('C:x'),
                skillLoad('a:b'),
                skillLoad('-lead'),
                skillLoad('Conv-A'),
                typed('../conv-a'),
                codexPrompt('run $../conv-a and $C:x and $a:b'),
                read('node_modules/x/skills/y/SKILL.md', fx.project),
                read(fx.abs('tmp/clone/.claude/skills/conv-a/SKILL.md')),
                read(path.join(fx.root, 'outside', '.claude', 'skills', 'conv-a', 'SKILL.md')),
                codexShell('cat node_modules/x/skills/y/SKILL.md ../.agents/skills/conv-a/SKILL.md', fx.project)
            ];
            for (const input of hostile) {
                const spy = spyReader();
                // When delivery is planned for each hostile input
                const all = planAll(fx, input, { readFile: spy.readFile });
                // Then nothing is returned and no file at all is opened
                for (const group of GROUPS) assertEmpty(all[group], `${JSON.stringify(input)} ${group}`);
                assert.deepEqual(spy.opened, [], `${JSON.stringify(input)} opened ${spy.opened.join(', ')}`);
            }
            // Given guide lines naming an unknown protocol and a known one, both with paths into a hostile folder
            fx.write('secret/review-alpha.md', 'SECRET-FILE-CONTENT');
            fx.skill('hostile', guideBlock(['not-in-index', 'review-alpha'], tag => `../../secret/${tag}.md`));
            const spy = spyReader();
            // When planned
            const result = plan(fx, skillLoad('hostile'), 'review', { readFile: spy.readFile });
            // Then the unknown protocol is dropped, the known one comes from the projection, and no guide-line path appears
            assertTags(result, ['review-alpha'], 'hostile guide lines');
            assert.ok(!result.text.includes('secret') && !result.text.includes('SECRET-FILE-CONTENT'), 'guide-line path or its file echoed');
            const allowed = ['.claude/skills', '.claude/agents', '.agents/skills'].map(rel => fx.abs(rel) + path.sep);
            for (const file of spy.opened) assert.ok(allowed.some(prefix => file.startsWith(prefix)), `opened outside the framework folders: ${file}`);
            // And a line whose path names another protocol's file is no guide entry (the recognizer's tag/path binding): nothing delivered
            fx.skill('hostile-swap', guideBlock(['review-alpha'], '../../secret/review-beta.md'));
            const swapped = planAll(fx, skillLoad('hostile-swap'));
            for (const group of GROUPS) assertEmpty(swapped[group], `swapped path ${group}`);
            // And an index row pointing outside the projection folder is dropped, never read
            const indexFile = fx.abs(`${PROTOCOLS_DIR}/index.json`);
            const index = JSON.parse(fs.readFileSync(indexFile, 'utf8'));
            index.tags.find(row => row.tag === 'review-alpha').parts = [{ file: '.claude/agents/fx-agent.md', chars: 10 }];
            fs.writeFileSync(indexFile, JSON.stringify(index));
            const tampered = spyReader();
            assertEmpty(plan(fx, skillLoad('hostile'), 'review', { readFile: tampered.readFile }), 'tampered index row');
            assert.ok(!tampered.opened.includes(fx.abs('.claude/agents/fx-agent.md')), 'tampered index path was read');
            // Boundary: a well-formed name inside the skill folder resolves normally
            assertTags(plan(fx, skillLoad('conv-b'), 'review'), ['review-gamma'], 'well-formed');
        })
    },
    {
        name: '[protocol-delivery] guide parser parity: delivery reads every guide-block shape exactly as the conversion recognizer does (BR-PDL-01)',
        fn: () => withFixture(fx => {
            // Given the guide-block edge shapes that once split delivery from the recognizer (one owner of the format)
            const S = '<!-- PROTOCOL-GUIDES:START -->';
            const E = '<!-- PROTOCOL-GUIDES:END -->';
            const line = (tag, file = tag) => `- \`${tag}\` — Summary text; when it applies → ${PROTOCOLS_DIR}/${file}.md`;
            const shapes = {
                'well-formed': [S, line('alpha'), line('beta'), E].join('\n'),
                'CRLF': [S, line('alpha'), E].join('\r\n'),
                'no block': line('alpha'),
                'empty block': [S, E].join('\n'),
                'unclosed block': [S, line('alpha')].join('\n'),
                'closed then unclosed': [S, line('alpha'), E, S, line('beta')].join('\n'),
                'compact markers': ['<!--PROTOCOL-GUIDES:START-->', line('alpha'), '<!--PROTOCOL-GUIDES:END-->'].join('\n'),
                'indented line': [S, `  ${line('alpha')}`, E].join('\n'),
                'star bullet': [S, line('alpha').replace(/^- /, '* '), E].join('\n'),
                'tag only': [S, '- `alpha`', E].join('\n'),
                'path names another tag': [S, line('alpha', 'beta'), E].join('\n'),
                'hyphen instead of em dash': [S, line('alpha').replace(' — ', ' - '), E].join('\n'),
                'tag longer than 64 chars': [S, line('a'.repeat(70)), E].join('\n'),
                'uppercase tag': [S, line('Alpha'), E].join('\n'),
                'duplicate tag': [S, line('alpha'), line('alpha'), E].join('\n'),
                'lone CR line endings': [S, line('alpha'), E].join('\r')
            };
            for (const [label, text] of Object.entries(shapes)) {
                // When delivery's declared-tags path and the recognizer read the same text
                const declared = delivery.declaredTags(text);
                const recognized = carrier.guideTags(text);
                // Then they name the same tags in the same order, and "no guide entry" means undeclared (null) on both sides
                assert.deepEqual(declared ?? [], recognized, `${label}: delivery ${JSON.stringify(declared)} vs recognizer ${JSON.stringify(recognized)}`);
                assert.equal(declared === null, recognized.length === 0, `${label}: converted-ness differs`);
            }

            // Given the two shapes where delivery used to deliver nothing while the tooling counted the skill converted
            standard(fx);
            fx.skill('closed-then-open', `${guideBlock(['review-alpha'])}\n\n${S}\n- \`review-beta\` — Fixture summary for review-beta; when it applies → ${PROTOCOLS_DIR}/review-beta.md`);
            fx.write('.claude/skills/lone-cr/SKILL.md', skillFile('lone-cr', guideBlock(['review-alpha', 'review-beta'])).replace(/\n/g, '\r'));
            // When each skill loads
            const closedThenOpen = plan(fx, skillLoad('closed-then-open'), 'review');
            const loneCr = plan(fx, skillLoad('lone-cr'), 'review');
            // Then the closed block's protocols arrive (the unclosed block declares nothing), and lone-CR endings read like LF
            assertTags(closedThenOpen, ['review-alpha'], 'closed block then unclosed block');
            assertTags(loneCr, ['review-alpha', 'review-beta'], 'lone-CR line endings');
            // And each equals what the recognizer counts as converted in the same file
            for (const name of ['closed-then-open', 'lone-cr']) {
                const text = fs.readFileSync(fx.abs(`.claude/skills/${name}/SKILL.md`), 'utf8');
                assert.deepEqual(delivery.declaredTags(text), carrier.guideTags(text), `${name}: delivery and recognizer differ`);
            }
        })
    },
    {
        name: '[protocol-delivery] a trigger-gated protocol is delivered in full only when its trigger applies; otherwise the guide line is the only path',
        fn: () => withFixture(fx => {
            // Given a gated design tag (UI trigger) beside an ungated one, a skill declaring both, and a skill whose scope is the domain
            fx.projection([
                { tag: 'design-gated', group: 'design' },
                { tag: 'design-plain', group: 'design' },
                { tag: 'domain-gated', group: 'design' }
            ]);
            fx.write('.claude/skills/shared/protocol-groups.json', JSON.stringify({
                version: 1,
                deliveryTriggers: {
                    ui: { pattern: '\\b(?:screen|mockup)\\b|\\.(?:tsx|css)\\b', pathPattern: '\\.(?:tsx|vue)\\b', skills: ['ui-owner'] },
                    broken: { pattern: '(' }
                },
                groups: {
                    design: {
                        tags: {
                            'design-gated': { summary: 's', when: 'w', trigger: 'ui' },
                            'design-plain': { summary: 's', when: 'w' },
                            'domain-gated': { summary: 's', when: 'w', trigger: 'broken' }
                        }
                    }
                },
                inlineSkills: []
            }));
            fx.skill('mixed', guideBlock(['design-gated', 'design-plain', 'domain-gated']));
            fx.skill('ui-owner', guideBlock(['design-gated', 'design-plain']));
            const load = (name, extra = {}) => ({ ...skillLoad(name), ...extra });
            const empty = { prompts: '', transcript: '' };

            // When a mixed skill loads with no UI in the event, the prompts or the transcript
            const none = plan(fx, load('mixed'), 'design', { triggerContext: () => empty });
            // Then only the ungated protocols arrive (a trigger with no usable pattern never withholds), the gated one is neither delivered nor named
            assertTags(none, ['design-plain', 'domain-gated'], 'no UI in context');
            assert.ok(!none.text.includes('design-gated') && !none.text.includes('Read each file now'), 'a withheld protocol was named or its path forced');

            // When the event text, the recorded prompts, or the touched files carry a UI signal, or the loaded skill owns the domain
            const viaArgs = plan(fx, { ...load('mixed'), tool_input: { skill: 'mixed', args: 'fix the settings screen' } }, 'design', { triggerContext: () => empty });
            const viaPrompt = plan(fx, load('mixed'), 'design', { triggerContext: () => ({ prompts: 'add a MOCKUP for it', transcript: '' }) });
            const viaFile = plan(fx, load('mixed'), 'design', { triggerContext: () => ({ prompts: '', transcript: '{"file_path":"src/app/list.vue"}' }) });
            const viaOwner = plan(fx, load('ui-owner'), 'design', { triggerContext: () => empty });
            // Then the gated protocol is delivered in full with the rest, once
            for (const [label, result] of [['args', viaArgs], ['prompt', viaPrompt], ['file', viaFile]]) {
                assertTags(result, ['design-gated', 'design-plain', 'domain-gated'], label);
            }
            assertTags(viaOwner, ['design-gated', 'design-plain'], 'owner skill');

            // And the path pattern also reads the recorded prompts
            assertTags(plan(fx, load('mixed'), 'design', { triggerContext: () => ({ prompts: 'edit list.vue', transcript: '' }) }), ['design-gated', 'design-plain', 'domain-gated'], 'path pattern on prompts');
            // And no provider at all is a readable empty context: the gated protocol stays withheld
            assertTags(plan(fx, load('mixed'), 'design'), ['design-plain', 'domain-gated'], 'no provider');

            // And an unreadable context delivers while a readable one with no match withholds (BR-PDL-16)
            unreadableTriggerContextDelivers();
        })
    },
    {
        name: '[protocol-delivery] the shipped ui and ai-feature triggers recognize plain task wording and stay closed for unrelated work (BR-PDL-16)',
        fn: () => withFixture(fx => {
            // Given the shipped ui and ai-feature triggers (the framework's own published data) gating two fixture protocols
            const shipped = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', '..', '..', 'skills', 'shared', 'protocol-groups.json'), 'utf8'));
            assert.ok(shipped.deliveryTriggers && shipped.deliveryTriggers.ui && shipped.deliveryTriggers['ai-feature'], 'the shipped data defines the ui and ai-feature triggers');
            fx.projection([
                { tag: 'design-gated', group: 'design' },
                { tag: 'ai-gated', group: 'design' },
                { tag: 'design-plain', group: 'design' }
            ]);
            fx.write('.claude/skills/shared/protocol-groups.json', JSON.stringify({
                version: 1,
                deliveryTriggers: { ui: { ...shipped.deliveryTriggers.ui, skills: [] }, 'ai-feature': { ...shipped.deliveryTriggers['ai-feature'], skills: [] } },
                groups: { design: { tags: {
                    'design-gated': { summary: 's', when: 'w', trigger: 'ui' },
                    'ai-gated': { summary: 's', when: 'w', trigger: 'ai-feature' },
                    'design-plain': { summary: 's', when: 'w' }
                } } },
                inlineSkills: []
            }));
            fx.skill('mixed', guideBlock(['design-gated', 'ai-gated', 'design-plain']));
            const withPrompt = prompts => plan(fx, skillLoad('mixed'), 'design', { triggerContext: () => ({ prompts, transcript: '' }) });
            // When the user's prompt uses plain UI wording (the original list, then the common component and layout nouns)
            // Then the gated design protocol is delivered in full with the ungated one, and the AI protocol stays withheld
            const uiPrompts = ['build a signup form', 'settings page with dark theme', 'navigation menu and sidebar',
                'profile card component', 'change the navbar color to blue', 'add a dropdown to select the country', 'add a toast notification when save succeeds',
                'create a data table with sortable columns', 'render the chart', 'make the app work on mobile', 'add a hero section', 'show a spinner while loading',
                'add avatars to the list', 'add a status badge'];
            for (const prompt of uiPrompts) assertTags(withPrompt(prompt), ['design-gated', 'design-plain'], prompt);
            // When it uses plain AI wording (vendor and model names, agents built on a model, model calls)
            // Then the gated AI protocol is delivered in full with the ungated one, and the design protocol stays withheld
            const aiPrompts = ['Add an agent that triages tickets using Claude', 'call the GPT-4 API', 'ask ChatGPT to summarize it', 'wire up Copilot',
                'use the chat completions endpoint', 'cap the token budget', 'add a model provider fallback'];
            for (const prompt of aiPrompts) assertTags(withPrompt(prompt), ['ai-gated', 'design-plain'], prompt);
            // And both gated protocols arrive when a prompt carries both kinds of wording
            assertTags(withPrompt('add a chart of the ChatGPT answers'), ['design-gated', 'ai-gated', 'design-plain'], 'both domains');
            // And clearly unrelated prompts still withhold both: only the ungated protocol arrives and neither gated one is named (readable context, no fail-open)
            const unrelated = ['optimize the batch import query', 'rename the variable in the parser', 'fix the flaky retry logic', 'add pagination to the REST endpoint',
                'update the sub-agent with a new tool', 'edit CLAUDE.md and run the tests with claude code', 'task completion criteria'];
            for (const prompt of unrelated) {
                const result = withPrompt(prompt);
                assertTags(result, ['design-plain'], prompt);
                assert.ok(!result.text.includes('design-gated') && !result.text.includes('ai-gated'), 'the withheld protocol leaked for: ' + prompt);
            }
        })
    },
    {
        name: '[protocol-delivery] the shipped plan, feature-implement and scaffold skills declare the journey-first UX gate and receive it only for UI work (BR-PDL-16)',
        fn: () => withFixture(fx => {
            // Given the shipped trigger data and the shipped SKILL.md of the three planning and implementation skills
            const frameworkRoot = path.resolve(__dirname, '..', '..', '..');
            const shipped = JSON.parse(fs.readFileSync(path.join(frameworkRoot, 'skills', 'shared', 'protocol-groups.json'), 'utf8'));
            const entry = shipped.groups.design.tags['ux-journey-gate'];
            assert.ok(entry && entry.trigger === 'ui', 'the shipped data gates ux-journey-gate on the ui trigger');
            const owners = ['plan', 'feature-implement', 'scaffold'];
            // The skills reach the gate through the UI wording of the task, never through the trigger's owner-skill list (that list would make it unconditional)
            for (const name of owners) assert.ok(!shipped.deliveryTriggers.ui.skills.includes(name), `${name} must not be a ui-trigger owner skill`);
            // One ungated design protocol each skill carries, so a non-UI load still has something to deliver
            const ungated = { plan: 'core-engineering-principles', 'feature-implement': 'design-distinctiveness-gate', scaffold: 'understand-code-first' };
            fx.projection([
                { tag: 'ux-journey-gate', group: 'design' },
                ...Object.values(ungated).map(tag => ({ tag, group: 'design' }))
            ], []);
            fx.write('.claude/skills/shared/protocol-groups.json', JSON.stringify({
                version: 1,
                deliveryTriggers: { ui: shipped.deliveryTriggers.ui },
                groups: { design: { tags: {
                    'ux-journey-gate': { summary: 's', when: 'w', trigger: 'ui' },
                    ...Object.fromEntries(Object.values(ungated).map(tag => [tag, { summary: 's', when: 'w' }]))
                } } },
                inlineSkills: []
            }));
            for (const name of owners) {
                const text = fs.readFileSync(path.join(frameworkRoot, 'skills', name, 'SKILL.md'), 'utf8');
                fx.write(`.claude/skills/${name}/SKILL.md`, text);
                fx.write(`.agents/skills/${name}/SKILL.md`, text);
                // Then each skill declares the gate and its ungated companion in its guide block
                const declared = delivery.declaredTags(text) || [];
                assert.ok(declared.includes('ux-journey-gate'), `${name} must declare the ux-journey-gate guide line`);
                assert.ok(declared.includes(ungated[name]), `${name} must declare ${ungated[name]}`);
            }
            const withPrompt = (name, prompts) => plan(fx, skillLoad(name), 'design', { triggerContext: () => ({ prompts, transcript: '' }) });
            const published = new Set(['ux-journey-gate', ...Object.values(ungated)]);
            for (const name of owners) {
                // The ungated protocols this skill declares among the published fixture tags
                const companions = (delivery.declaredTags(fs.readFileSync(fx.abs(`.claude/skills/${name}/SKILL.md`), 'utf8')) || []).filter(tag => published.has(tag) && tag !== 'ux-journey-gate');
                // When the task is about a user-facing surface, the full text arrives with the ungated protocols
                const ui = withPrompt(name, 'plan the settings screen and its form layout');
                assert.deepEqual([...ui.tags].sort(), [...companions, 'ux-journey-gate'].sort(), `${name} with UI wording: tags`);
                assert.equal(count(ui.text, marker('ux-journey-gate')), 1, `${name}: the gate's full text exactly once`);
                // When the task has no UI wording, the gate is neither delivered nor named
                const none = withPrompt(name, 'optimize the batch import query');
                assertTags(none, companions, `${name} without UI wording`);
                assert.ok(!none.text.includes('ux-journey-gate'), `${name}: the withheld gate was named for a non-UI task`);
            }
        })
    },
    {
        name: '[protocol-delivery] entity quality reaches planning, implementation, fixes and review only for relevant domain work (BR-PDL-16)',
        fn: () => withFixture(fx => {
            // Given the shipped conditional gate and real entrypoint declarations in isolated host trees.
            const frameworkRoot = path.resolve(__dirname, '..', '..', '..');
            const shipped = JSON.parse(fs.readFileSync(path.join(frameworkRoot, 'skills', 'shared', 'protocol-groups.json'), 'utf8'));
            const tag = 'domain-entity-change-gate';
            const entry = shipped.groups.design.tags[tag];
            const owners = ['plan', 'feature-implement', 'fix', 'changes-review', 'code-quality-review'];
            assert.equal(entry.trigger, 'domain-model');
            fx.projection([{ tag, group: 'design' }], []);
            fx.write('.claude/skills/shared/protocol-groups.json', JSON.stringify({
                version: 1, deliveryTriggers: { 'domain-model': shipped.deliveryTriggers['domain-model'] },
                groups: { design: { tags: { [tag]: entry } } }, inlineSkills: []
            }));
            for (const name of owners) {
                const source = fs.readFileSync(path.join(frameworkRoot, 'skills', name, 'SKILL.md'), 'utf8');
                assert.ok((delivery.declaredTags(source) || []).includes(tag), `${name}: reachable gate`);
                assert.ok(!shipped.deliveryTriggers['domain-model'].skills.includes(name), `${name}: stays conditional`);
                fx.write(`.claude/skills/${name}/SKILL.md`, source);
                fx.write(`.agents/skills/${name}/SKILL.md`, source);
            }
            // When intent or a touched domain path establishes relevance, both host read paths deliver once.
            const contexts = [
                { prompts: 'plan a new order entity and its transitions', transcript: '' },
                { prompts: 'fix value-object equality', transcript: '' },
                { prompts: 'update domain-events and replay handling', transcript: '' },
                ...['src/domain/Order.ts', 'src/ValueObjects/Money.cs', 'src/value_objects/amount.py',
                    'src/value-objects/money.js', 'src\\ValueObjects\\Money.cs'].map(file => ({ prompts: '', transcript: JSON.stringify({ file_path: file }) }))
            ];
            for (const host of ['claude', 'codex']) for (const name of owners) {
                const relative = `${host === 'codex' ? '.agents' : '.claude'}/skills/${name}/SKILL.md`;
                const event = read(fx.abs(relative), fx.project);
                for (const context of contexts) {
                    const spy = spyReader();
                    const result = plan(fx, event, 'design', { host, readFile: spy.readFile, triggerContext: () => context });
                    assertTags(result, [tag], `${host}/${name}: ${context.prompts || context.transcript}`);
                    assert.ok(!spy.opened.some(file => file.endsWith('entity-quality.md')), 'delivery never eagerly loads detailed criteria');
                }
                // Then unrelated work with readable context loads neither the gate nor its detailed source.
                const spy = spyReader();
                const none = plan(fx, event, 'design', { host, readFile: spy.readFile,
                    triggerContext: () => ({ prompts: 'rename a CLI option', transcript: '', unreadable: false }) });
                assertTags(none, [], `${host}/${name}: unrelated work`);
                assert.ok(!spy.opened.some(file => file.endsWith(`${tag}.md`) || file.endsWith('entity-quality.md')), 'unrelated work reads no domain protocol');
                // Unavailable context retains the existing conservative fallback to the compact gate.
                assertTags(plan(fx, event, 'design', { host, triggerContext: () => ({ unreadable: true }) }), [tag], `${host}/${name}: unreadable context`);
            }
        })
    },
    {
        name: '[protocol-delivery] a sub-agent start does not receive a protocol its agent definition already carries as a full body',
        fn: () => withFixture(fx => {
            // Given an agent that preloads a converted skill and carries the full body of one of its tags (and only the reminder of another)
            standard(fx);
            fx.write('.claude/agents/fx-inline.md', [
                '---', 'name: fx-inline', 'description: carries a body', 'skills: conv-a', '---', '',
                '<!-- SYNC:review-alpha -->', 'body of alpha', '<!-- /SYNC:review-alpha -->', '',
                '<!-- SYNC:review-beta:reminder -->', 'reminder of beta', '<!-- /SYNC:review-beta:reminder -->', ''
            ].join('\n'));
            // When it starts
            const result = plan(fx, agentStart('fx-inline'), 'review');
            // Then the inlined tag is not delivered again; the tag with only a reminder still is
            assertTags(result, ['review-beta'], 'fx-inline');
            assert.equal(delivery.agentInlines('<!-- SYNC:a -->\nx\n<!-- /SYNC:a -->', 'a'), true);
            assert.equal(delivery.agentInlines('<!-- SYNC:a:reminder -->\nx\n<!-- /SYNC:a:reminder -->', 'a'), false, 'a reminder is not the body');
            assert.equal(delivery.agentInlines('<!-- SYNC:a -->\nunclosed', 'a'), false, 'an unclosed fence is not a body');
            // And a skill load in the main session is not filtered by any agent file
            assertTags(plan(fx, skillLoad('conv-a'), 'review'), ['review-alpha', 'review-beta'], 'skill load');
        })
    },
    {
        name: '[protocol-delivery] load cost: requiring the lib loads no project module (BR-PDL-09)',
        fn: () => {
            // Given a fresh module registry
            const { spawnSync } = require('node:child_process');
            const probe = `require(${JSON.stringify(LIB)}); const loaded = Object.keys(require.cache); process.stdout.write(JSON.stringify(loaded));`;
            // When the lib alone is required in a clean process (scrubbed env: only what Node needs to start)
            const env = require('../lib/os-essentials-env.cjs').osEssentialsEnv();
            const run = spawnSync(process.execPath, ['-e', probe], { encoding: 'utf8', env, cwd: os.tmpdir() });
            assert.equal(run.status, 0, run.stderr);
            // Then the only project module in the registry is the lib itself
            assert.deepEqual(JSON.parse(run.stdout).map(file => path.basename(file)), ['protocol-delivery.cjs']);
            // And the shared guide recognizer loads only when a guide block is first parsed — delivery reuses it, it keeps no copy
            const lazy = spawnSync(process.execPath, ['-e', [
                `const d = require(${JSON.stringify(LIB)});`,
                'const before = Object.keys(require.cache);',
                "d.declaredTags('no block here');",
                'process.stdout.write(JSON.stringify({ before, after: Object.keys(require.cache) }));'
            ].join('\n')], { encoding: 'utf8', env, cwd: os.tmpdir() });
            assert.equal(lazy.status, 0, lazy.stderr);
            const { before, after } = JSON.parse(lazy.stdout);
            assert.deepEqual(before.map(file => path.basename(file)), ['protocol-delivery.cjs']);
            // (require.cache keys are real paths; Windows paths compare case-insensitively)
            const key = file => (process.platform === 'win32' ? fs.realpathSync(file).toLowerCase() : fs.realpathSync(file));
            assert.deepEqual(after.map(key), [LIB, CARRIER].map(key));
        }
    }
];

module.exports = { name: 'protocol-delivery', tests };
