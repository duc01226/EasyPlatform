'use strict';

/**
 * UI/UX gate injection — the `ui-ux-gate` convention class delivered by file-convention-inject.cjs.
 *
 * Business intent: before the assistant edits a front-end file it must have the three binding UI rule
 * sets in context — UI-1.1..UI-9.4 (usability/a11y floor), DD-1..DD-8 (design identity) and CL-1..CL-6
 * (review checklist) — without re-sending them while they are still in the last ~150K tokens.
 * Invariants guarded here:
 *   - first front-end read/edit delivers the gate; a non-front-end file never does;
 *   - a read delivers it in the conditional wording, so the first change after it re-delivers once, mandatory;
 *   - no re-delivery inside the class window (150K tokens x 22 bytes); re-delivery at the window edge;
 *   - condensation (transcript mark or host report) voids the earlier delivery;
 *   - the protocol already loaded by a tool Read of the docs or by a UI skill counts as delivered,
 *     but only while it is inside the window and after the last condensation;
 *   - a project without front-end evidence is never proposed the class (N/A never pays).
 * Fixtures live in unique temp dirs removed in `finally`; the delivery store is always a fixture dir.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const HOOKS_DIR = path.resolve(__dirname, '../..');
const hook = require(path.join(HOOKS_DIR, 'file-convention-inject.cjs'));
const conventions = require(path.join(HOOKS_DIR, 'lib', 'file-conventions.cjs'));
const ledger = require(path.join(HOOKS_DIR, 'lib', 'convention-ledger.cjs'));
const merge = require(path.join(HOOKS_DIR, 'lib', 'convention-merge.cjs'));
const schema = require(path.join(HOOKS_DIR, 'lib', 'project-config-schema.cjs'));
const { childEnv } = require('../lib/hook-runner.cjs');
const { isFrameworkRepo } = require('../lib/framework-repo-guard.cjs');

const NOW = Math.floor(Date.now() / 1000) * 1000;
const MINUTE = 60 * 1000;
const GATE = merge.UI_UX_GATE;
const WINDOW_BYTES = GATE.reinjectAfterTokens * conventions.BYTES_PER_TOKEN;
const TAG = 'ui-ux-gate@';
const CHECKLIST = '.claude/docs/design-review-checklist.md';
const KNOWLEDGE = '.claude/docs/design-knowledge.md';
const JOURNEY = '.claude/docs/ux-journey-process.md';

// ── fixtures ────────────────────────────────────────────────────────────────

async function withFixture(fn) {
    const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'uig-test-')));
    const previousEnv = { ...process.env };
    const fx = {
        root,
        project: path.join(root, 'project'),
        store: path.join(root, 'store'),
        transcript: path.join(root, 'transcript.jsonl'),
        abs: rel => path.join(fx.project, ...rel.split('/')),
        /** A completed raw-body load using documented tool_use/tool_result pairing, not a launch acknowledgment. */
        completed(name, input, at = NOW - MINUTE) {
            const rel = name === 'Skill' ? `.claude/skills/${input.skill}/SKILL.md` : input.file_path.replace(/\\/g, '/');
            const file = path.isAbsolute(rel) ? rel : fx.abs(rel);
            fs.mkdirSync(path.dirname(file), { recursive: true });
            if (!fs.existsSync(file)) fs.writeFileSync(file, `Fixture complete protocol for ${name}.\nRequired second rule.\n`);
            const request = toolUse(name, input, at);
            const id = JSON.parse(request).message.content[0].id;
            const result = JSON.stringify({ type: 'user', timestamp: new Date(at).toISOString(), message: { content: [
                { type: 'tool_result', tool_use_id: id, content: fs.readFileSync(file, 'utf8') }
            ] } });
            return `${request}\n${result}`;
        },
        append(line) {
            fs.appendFileSync(fx.transcript, line.endsWith('\n') ? line : `${line}\n`);
        },
        /** Append one filler line of exactly `bytes` bytes (newline included). */
        grow(bytes) {
            const shell = '{"type":"user","message":{"content":""}}\n';
            assert.ok(bytes >= shell.length, 'filler too small');
            fx.append(shell.replace('""', `"${'x'.repeat(bytes - shell.length)}"`));
        },
        size: () => fs.statSync(fx.transcript).size
    };
    fs.mkdirSync(fx.project, { recursive: true });
    fs.mkdirSync(fx.store, { recursive: true });
    fs.writeFileSync(fx.transcript, '{"type":"user","message":{"content":"start"}}\n');
    try {
        for (const key of Object.keys(process.env)) {
            if (/^(CK_|CLAUDE_|CODEX_|OPENCODE_|NODE_OPTIONS$)/i.test(key) || /(?:API_KEY|TOKEN|SECRET|PASSWORD)/i.test(key)) delete process.env[key];
        }
        Object.assign(process.env, { HOME: root, USERPROFILE: root, TMPDIR: root, TEMP: root, TMP: root, CLAUDE_PROJECT_DIR: fx.project });
        await fn(fx);
    } finally {
        ledger._resetCarrierCache();
        fs.rmSync(root, { recursive: true, force: true });
        for (const key of Object.keys(process.env)) delete process.env[key];
        Object.assign(process.env, previousEnv);
    }
}

function gateConfig(settings = {}, group = {}) {
    return { conventionInjection: { enabled: true, ...settings }, contextGroups: [{ ...JSON.parse(JSON.stringify(GATE)), ...group }] };
}

function post(fx, tool, rel, extra = {}) {
    return {
        hook_event_name: 'PostToolUse', tool_name: tool, session_id: 'session-1', cwd: fx.project,
        transcript_path: fx.transcript, tool_input: { file_path: fx.abs(rel) }, ...extra
    };
}

let toolId = 0;
function toolUse(name, input, at = NOW - MINUTE) {
    return JSON.stringify({ type: 'assistant', timestamp: new Date(at).toISOString(), message: { content: [{ type: 'tool_use', id: `t${++toolId}`, name, input }] } });
}

function boundary(at = NOW - 30 * 1000) {
    return JSON.stringify({ type: 'system', subtype: 'compact_boundary', timestamp: new Date(at).toISOString() });
}

async function deliver(fx, config, input, now = NOW) {
    const payload = await hook.run(input, {
        env: { CK_CONVENTIONS_DIR: fx.store },
        projectDir: fx.project,
        config,
        now,
        write: (text, done) => done(true),
        isDirectory: () => false,
        fileExists: () => true
    });
    return payload ? JSON.parse(payload).hookSpecificOutput.additionalContext : '';
}

const gateDelivered = text => text.includes(TAG);

/** Spawned hook in a project with NO config: the real defaultConfig → built-in fallback path. */
function spawnNoConfig(fx, input) {
    const { spawnSync } = require('node:child_process');
    // Clean machine (Portable Test Contract): no inherited CK_* switch, home and temp inside the fixture
    const overrides = { HOME: fx.root, USERPROFILE: fx.root, TMPDIR: fx.root, TEMP: fx.root, TMP: fx.root, CLAUDE_HOOK_DEBUG: undefined };
    for (const key of Object.keys(process.env)) {
        if (/^CK_/i.test(key)) overrides[key] = undefined;
    }
    Object.assign(overrides, { CLAUDE_PROJECT_DIR: fx.project, CK_CONVENTIONS_DIR: fx.store });
    const result = spawnSync(process.execPath, [path.join(HOOKS_DIR, 'file-convention-inject.cjs')], {
        cwd: fx.project, input: JSON.stringify(input), encoding: 'utf8', windowsHide: true, env: childEnv(overrides)
    });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout ? JSON.parse(result.stdout).hookSpecificOutput.additionalContext : '';
}

// ── tests ───────────────────────────────────────────────────────────────────

const tests = [
    {
        // INTENT: the assistant learns the three UI rule sets and where they live BEFORE editing a UI file.
        name: 'TC-UIG-001 first front-end touch delivers the compact gate naming UI-*, DD-*, CL-* and their docs',
        fn: async () => withFixture(async fx => {
            for (const rel of ['src/app/home.component.html', 'src/styles/site.scss', 'web/App.tsx', 'web/Card.vue', 'ui/Main.xaml', 'app/src/main/res/layout/main.xml']) {
                // Given a fresh session per file (a separate session id isolates the delivery memory)
                const input = post(fx, 'Read', rel, { session_id: `s-${rel.replace(/[^a-z]/gi, '')}` });
                // When the file is read (Claude requires a Read before any Edit of an existing file)
                const text = await deliver(fx, gateConfig(), input);
                // Then the gate is delivered, compact, and names the rule sets and the docs to read
                assert.ok(gateDelivered(text), `${rel}: gate delivered`);
                for (const needle of ['UX-1', 'UX-11', 'SYNC:ux-journey-gate', JOURNEY, 'UI-1.1', 'UI-9.4', 'SYNC:ui-ux-design-principles', 'DD-1', 'DD-8', 'CL-1', 'CL-6', '§0.5', 'B12', 'E9', '§R', 'I15', 'K10',
                    CHECKLIST, KNOWLEDGE, '.claude/docs/design-review-calibration.md', 'sync-inline-versions.md']) {
                    assert.ok(text.includes(needle), `${rel}: digest names ${needle}`);
                }
                // A read only looks: the opening is conditional and never mandatory (BR-PFCI-20)
                assert.ok(/^\[conventions\] .*If you will edit this file, read first: .*design-review-checklist\.md/.test(text), 'first line tells the model which docs to read before an edit');
                assert.equal(text.includes('MUST read first'), false, 'a read digest carries no mandatory instruction');
                assert.ok(text.length <= 2000, `digest stays compact (${text.length} chars)`);
            }
            // And an Edit/Write trigger delivers too (new file created without a prior Read), in the mandatory wording
            const written = await deliver(fx, gateConfig(), post(fx, 'Write', 'web/New.jsx', { session_id: 'write-session' }));
            assert.ok(gateDelivered(written));
            assert.ok(/^\[conventions\] .*MUST read first: .*design-review-checklist\.md/.test(written), 'a change is told to read the docs first');
        })
    },
    {
        // INTENT: files that are not user-facing UI never pay the gate.
        name: 'TC-UIG-002 non-front-end files never receive the gate',
        fn: async () => withFixture(async fx => {
            for (const rel of ['src/service.ts', 'src/index.js', 'docs/guide.md', 'docs/page.mdx', 'ios/Model.swift', 'android/Repo.kt',
                'app/res/values/strings.xml', 'pom.xml', 'node_modules/lib/theme.css', 'dist/app.css', 'tmp/report.html']) {
                const text = await deliver(fx, gateConfig(), post(fx, 'Edit', rel, { session_id: `n-${rel.replace(/[^a-z]/gi, '')}` }));
                assert.equal(gateDelivered(text), false, `${rel} must not receive the UI gate`);
            }
        })
    },
    {
        // INTENT: dedup — no duplicate gate while the earlier one is inside the last ~150K tokens.
        name: 'TC-UIG-003 no re-delivery inside the 150K-token window; re-delivery exactly at the window edge',
        fn: async () => withFixture(async fx => {
            assert.equal(WINDOW_BYTES, 3300000, '150000 tokens x 22 bytes');
            const config = gateConfig();
            // First delivery on a change: a read-form delivery would not cover the change below (BR-PFCI-05)
            assert.ok(gateDelivered(await deliver(fx, config, post(fx, 'Edit', 'web/a.css'))), 'first delivery');
            // Same file and another front-end file inside the window: nothing
            assert.equal(await deliver(fx, config, post(fx, 'Edit', 'web/a.css'), NOW + MINUTE), '');
            fx.grow(WINDOW_BYTES - 1);
            assert.equal(await deliver(fx, config, post(fx, 'Edit', 'web/b.scss'), NOW + 2 * MINUTE), '', 'growth just below the window: still present');
            // One more byte (an empty history line) reaches the window: the gate re-arms
            fs.appendFileSync(fx.transcript, '\n');
            assert.ok(gateDelivered(await deliver(fx, config, post(fx, 'Edit', 'web/b.scss'), NOW + 3 * MINUTE)), 'window reached: re-delivered');
        })
    },
    {
        // INTENT: the class window is its own; the global (200K-token) distance does not apply to it.
        name: 'TC-UIG-004 the class window overrides the global distance; an out-of-range class value falls back to it',
        fn: async () => withFixture(async fx => {
            const entry = conventions.injectableEntries(gateConfig()).find(e => e.name === 'ui-ux-gate');
            const settings = conventions.resolveSettings(gateConfig());
            assert.equal(conventions.classSettings(entry, settings).reinjectAfterBytes, WINDOW_BYTES);
            assert.ok(WINDOW_BYTES < settings.reinjectAfterBytes, 'gate re-arms sooner than the global floor');
            const [min, max] = conventions.CLASS_REINJECT_TOKENS_RANGE;
            for (const bad of [min - 1, max + 1, 150000.5, '150000']) {
                const e = conventions.injectableEntries(gateConfig({}, { reinjectAfterTokens: bad }))[0];
                assert.equal(conventions.classSettings(e, settings).reinjectAfterBytes, settings.reinjectAfterBytes, `${bad} ignored at runtime`);
            }
            // The validator accepts exactly the range the runtime uses (a validated value is never silently replaced)
            const errorsFor = tokens => schema.validateConfig({ project: { name: 'p' }, ...gateConfig({}, { reinjectAfterTokens: tokens }) }).errors
                .filter(err => err.includes('reinjectAfterTokens'));
            assert.deepEqual(errorsFor(min), []);
            assert.deepEqual(errorsFor(max), []);
            assert.equal(errorsFor(min - 1).length, 1);
            assert.equal(errorsFor(max + 1).length, 1);
            assert.equal(errorsFor(min + 0.5).length, 1);
        })
    },
    {
        // INTENT: after condensation the gate text is gone from context, so the next UI edit re-delivers it.
        name: 'TC-UIG-005 condensation — transcript mark or host SessionStart report — re-arms the gate',
        fn: async () => withFixture(async fx => {
            const config = gateConfig();
            // First delivery on a change: a read-form delivery would not cover the change below (BR-PFCI-05)
            assert.ok(gateDelivered(await deliver(fx, config, post(fx, 'Edit', 'web/a.html'))));
            assert.equal(await deliver(fx, config, post(fx, 'Edit', 'web/a.html'), NOW + 1000), '');
            // Transcript condensation mark after the delivery
            fx.append(boundary(NOW + 2000));
            assert.ok(gateDelivered(await deliver(fx, config, post(fx, 'Edit', 'web/a.html'), NOW + 3000)), 'transcript mark re-arms');
            assert.equal(await deliver(fx, config, post(fx, 'Edit', 'web/a.html'), NOW + 4000), '', 'present again after re-delivery');
            // Host-reported condensation (SessionStart compact)
            await hook.run({ hook_event_name: 'SessionStart', source: 'compact', session_id: 'session-1' },
                { env: { CK_CONVENTIONS_DIR: fx.store }, config, now: NOW + 5000 });
            assert.ok(gateDelivered(await deliver(fx, config, post(fx, 'Edit', 'web/a.html'), NOW + 6000)), 'host report re-arms');
        })
    },
    {
        // INTENT: "if the protocol is in context via a tool read it is ok" — reading BOTH rule docs suffices.
        name: 'TC-UIG-006 the rule docs already read in the window count as delivered; one doc alone does not',
        fn: async () => withFixture(async fx => {
            const config = gateConfig();
            // Only the checklist read: DD-* is still missing -> deliver
            fx.append(fx.completed('Read', { file_path: fx.abs(CHECKLIST) }));
            assert.ok(gateDelivered(await deliver(fx, config, post(fx, 'Edit', 'web/a.scss', { session_id: 'one-doc' }))), 'one doc is not the whole gate');
            // Checklist + knowledge read (Windows-style path for the second): the UX journey doc is still missing -> deliver
            fx.append(fx.completed('Read', { file_path: fx.abs(KNOWLEDGE).replace(/\//g, '\\') }));
            assert.ok(gateDelivered(await deliver(fx, config, post(fx, 'Edit', 'web/a.scss', { session_id: 'no-journey-doc' }))), 'UI/DD/CL docs alone do not cover the UX journey-first gate');
            // All three evidence docs read -> no delivery, recorded as evidence
            fx.append(fx.completed('Read', { file_path: fx.abs(JOURNEY) }));
            assert.equal(await deliver(fx, config, post(fx, 'Edit', 'web/a.scss', { session_id: 'both-docs' })), '');
            const record = ledger.readRecord(fx.store, 'both-docs', 'main', 'ui-ux-gate');
            assert.equal(record && record.form, 'evidence', 'evidence recorded so later triggers skip on the record');
            assert.equal(await deliver(fx, config, post(fx, 'Edit', 'web/b.scss', { session_id: 'both-docs' }), NOW + MINUTE), '');
        })
    },
    {
        // INTENT: "if the protocol is included via a skill it is ok" — a UI skill carries the rules inline.
        name: 'TC-UIG-007 a UI skill fully loaded in the window (completed Skill result) counts as delivered; an unrelated skill does not',
        fn: async () => withFixture(async fx => {
            const config = gateConfig();
            fx.append(fx.completed('Skill', { skill: 'commit' }));
            assert.ok(gateDelivered(await deliver(fx, config, post(fx, 'Edit', 'web/a.vue', { session_id: 'other-skill' }))));
            fx.append(fx.completed('Skill', { skill: 'design-spec' }));
            assert.equal(await deliver(fx, config, post(fx, 'Edit', 'web/a.vue', { session_id: 'skill-tool' })), '');
            fs.writeFileSync(fx.transcript, `${JSON.stringify({ type: 'user', timestamp: new Date(NOW - MINUTE).toISOString(), message: { content: '<command-name>/ui-design</command-name>' } })}\n`);
            assert.ok(gateDelivered(await deliver(fx, config, post(fx, 'Edit', 'web/a.vue', { session_id: 'slash' }))), 'a raw slash command does not prove a completed body load');
        })
    },
    {
        // INTENT: evidence that was condensed away or scrolled out of the window no longer protects the edit.
        name: 'TC-UIG-008 evidence before a condensation, before a host report, or outside the window does not count',
        fn: async () => withFixture(async fx => {
            const config = gateConfig();
            // Before an in-transcript condensation mark
            fx.append(fx.completed('Skill', { skill: 'ui-design' }, NOW - 2 * MINUTE));
            fx.append(boundary(NOW - MINUTE));
            assert.ok(gateDelivered(await deliver(fx, config, post(fx, 'Edit', 'web/a.less', { session_id: 'before-mark' }))));

            // Positioned before a condensation mark, even when its clock reads later: position in the history wins
            fs.writeFileSync(fx.transcript, `${fx.completed('Skill', { skill: 'ui-design' }, NOW - MINUTE)}\n${boundary(NOW - 2 * MINUTE)}\n`);
            assert.ok(gateDelivered(await deliver(fx, config, post(fx, 'Edit', 'web/a.less', { session_id: 'skewed-mark' }))));

            // Before a host-reported condensation (no mark in the transcript)
            fs.writeFileSync(fx.transcript, `${fx.completed('Skill', { skill: 'ui-design' }, NOW - 2 * MINUTE)}\n`);
            await hook.run({ hook_event_name: 'SessionStart', source: 'compact', session_id: 'host-report' },
                { env: { CK_CONVENTIONS_DIR: fx.store }, config, now: NOW - MINUTE });
            assert.ok(gateDelivered(await deliver(fx, config, post(fx, 'Edit', 'web/a.less', { session_id: 'host-report' }))));

            // Scrolled out of the class window
            fs.writeFileSync(fx.transcript, `${fx.completed('Skill', { skill: 'ui-design' })}\n`);
            fx.grow(WINDOW_BYTES + 100);
            assert.ok(gateDelivered(await deliver(fx, config, post(fx, 'Edit', 'web/a.less', { session_id: 'out-of-window' }))));
        })
    },
    {
        // INTENT: a project with no front-end never pays; one that records front-end evidence gets the class.
        name: 'TC-UIG-009 detection proposes the gate only with recorded front-end evidence; delivery stays opt-in',
        fn: async () => withFixture(async fx => {
            const exists = () => true;
            const names = cfg => merge.detectGroups(cfg, { projectDir: fx.project, fileExists: exists }).map(g => g.name);
            assert.equal(names({ project: { languages: ['typescript'] }, modules: [{ name: 'api', kind: 'backend', pathRegex: 'api/' }] }).includes('ui-ux-gate'), false);
            assert.ok(names({ modules: [{ name: 'web', kind: 'frontend-app', pathRegex: 'web/' }] }).includes('ui-ux-gate'));
            assert.ok(names({ styling: { fileExtensions: ['.scss'] } }).includes('ui-ux-gate'));
            const detected = merge.detectGroups({ styling: { fileExtensions: ['.scss'] } }, { projectDir: fx.project, fileExists: exists }).find(g => g.name === 'ui-ux-gate');
            assert.equal(detected.reinjectAfterTokens, 150000);
            assert.deepEqual(detected.evidenceSkills, GATE.evidenceSkills);
            // A project that never switched delivery on receives nothing (BR-PFCI-01)
            const off = { contextGroups: gateConfig().contextGroups };
            assert.equal(await deliver(fx, off, post(fx, 'Edit', 'web/a.css')), '');
        })
    },
    {
        // INTENT: hosts without a Read tool (Codex apply_patch) get the same gate.
        name: 'TC-UIG-010 Codex apply_patch on a front-end file delivers the gate',
        fn: async () => withFixture(async fx => {
            const input = {
                hook_event_name: 'PostToolUse', tool_name: 'apply_patch', session_id: 'codex', cwd: fx.project,
                tool_input: { command: ['*** Begin Patch', '*** Update File: web/a.svelte', '*** End Patch'].join('\n') }
            };
            assert.ok(gateDelivered(await deliver(fx, gateConfig(), input)));
        })
    },
    {
        // INTENT: the maintained project class stays a working copy of the framework gate.
        name: 'TC-UIG-011 (framework repo) the project config gate keeps the framework rules, docs, trigger, priority, window and evidence',
        fn: () => {
            // Authoring-repo self-check only: an adopting project may customise or lag its own copy.
            const repoRoot = path.resolve(HOOKS_DIR, '..', '..');
            if (!isFrameworkRepo(repoRoot)) return;
            const configFile = path.join(repoRoot, 'docs', 'project-config.json');
            if (!fs.existsSync(configFile)) return;
            const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
            const group = (config.contextGroups || []).find(g => g && g.name === 'ui-ux-gate');
            assert.ok(group, 'tripwire: the framework repo declares the ui-ux-gate group');
            for (const field of ['on', 'priority', 'rules', 'referenceDocs', 'reinjectAfterTokens', 'evidenceDocs', 'evidenceSkills', 'fileNameRegexes', 'pathRegexes']) {
                assert.deepEqual(group[field], GATE[field], `ui-ux-gate.${field} drifted from the framework definition`);
            }
        }
    },
    {
        // INTENT: the no-config fallback (BR-PFCI-01) goes through the SAME dedup as a configured gate —
        // never a reminder per file, yet never a lost one after a window, condensation or helper hop.
        name: 'TC-UIG-012 no-config fallback dedups: same context skips, helper/window/condensation re-arm, evidence counts',
        fn: async () => withFixture(async fx => {
            assert.equal(fs.existsSync(path.join(fx.project, 'docs', 'project-config.json')), false, 'no project config');
            const edit = (rel, extra) => post(fx, 'Edit', rel, extra);

            // First front-end touch in the main conversation delivers; a read gets the conditional form, so the
            // first change re-delivers once in the mandatory form (BR-PFCI-05 read-form presence); then no file does
            const firstRead = spawnNoConfig(fx, post(fx, 'Read', 'web/a.tsx'));
            assert.ok(gateDelivered(firstRead) && firstRead.includes('If you will edit this file, read first:'), 'first touch delivers, conditional on a read');
            const firstChange = spawnNoConfig(fx, edit('web/a.tsx'));
            assert.ok(gateDelivered(firstChange) && firstChange.includes('MUST read first:'), 'first change after the read re-delivers, mandatory');
            for (const rel of ['web/a.tsx', 'web/b.vue', 'web/site.scss']) {
                assert.equal(spawnNoConfig(fx, edit(rel)), '', `${rel}: already present, not repeated`);
            }

            // A helper agent keeps its own memory: it gets the gate once, then dedups in its own context
            assert.ok(gateDelivered(spawnNoConfig(fx, edit('web/b.vue', { agent_id: 'helper-1' }))), 'helper receives its own copy');
            assert.equal(spawnNoConfig(fx, edit('web/c.svelte', { agent_id: 'helper-1' })), '', 'helper dedups');
            assert.equal(spawnNoConfig(fx, edit('web/c.svelte')), '', 'the helper delivery does not re-arm the main context');

            // The gate scrolled out of its ~150K-token window → delivered again, once
            fx.grow(WINDOW_BYTES + 100);
            assert.ok(gateDelivered(spawnNoConfig(fx, edit('web/a.tsx'))), 'window edge re-arms');
            assert.equal(spawnNoConfig(fx, edit('web/b.vue')), '', 'and dedups again right after');

            // A host-reported condensation (SessionStart compact) is recorded without a config and re-arms
            const condensed = spawnNoConfig(fx, { hook_event_name: 'SessionStart', source: 'compact', session_id: 'session-1', cwd: fx.project });
            assert.equal(condensed, '', 'the condensation report shows nothing');
            assert.equal(typeof ledger.readSessionCompaction(fx.store, 'session-1'), 'number', 'condensation recorded');
            assert.ok(gateDelivered(spawnNoConfig(fx, edit('web/a.tsx', { session_id: 'session-1' }))), 'condensation re-arms');
            assert.equal(spawnNoConfig(fx, edit('web/b.vue')), '', 'and dedups again right after');

            // The protocol already loaded by a UI skill counts as delivered (evidence), and is remembered
            const evidence = { session_id: 'evidence-session' };
            fx.append(fx.completed('Skill', { skill: 'ui-design' }, Date.now() - MINUTE));
            assert.equal(spawnNoConfig(fx, edit('web/a.tsx', evidence)), '', 'skill evidence counts as present');
            const record = ledger.readRecord(fx.store, 'evidence-session', 'main', 'ui-ux-gate');
            assert.equal(record && record.form, 'evidence', 'evidence skip recorded so later triggers skip on the record');

            // Switching from the fallback to a config carrying the same detected gate keeps the content
            // version, so an adopter who later runs setup is not re-sent the gate for the same content.
            const fallbackEntry = conventions.injectableEntries(conventions.builtinFallbackConfig())[0];
            const detected = merge.detectGroups({ styling: { fileExtensions: ['.scss'] } }, { projectDir: fx.project, fileExists: () => true })
                .find(g => g.name === 'ui-ux-gate');
            const detectedEntry = conventions.injectableEntries({ contextGroups: [detected] })[0];
            assert.equal(conventions.groupHash(fallbackEntry), conventions.groupHash(detectedEntry), 'fallback and detected gate share one content version');
        })
    },
    {
        // INTENT: the journey-first rule (UX-1..UX-11) binds every UI-file edit, not only the design skills —
        // a real hook process on a plain .tsx edit must put the UX line and its doc in context.
        name: 'TC-UIG-013 a real hook process on a .tsx edit delivers the UX journey-first gate and its doc',
        fn: async () => withFixture(async fx => {
            assert.equal(fs.existsSync(path.join(fx.project, 'docs', 'project-config.json')), false, 'no project config');
            const text = spawnNoConfig(fx, post(fx, 'Edit', 'web/Settings.tsx', { session_id: 'ux-journey' }));
            assert.ok(gateDelivered(text), 'gate delivered');
            assert.ok(/UX-1\S*UX-11 journey-first/.test(text), 'the journey-first rule line is delivered');
            assert.ok(text.includes('SYNC:ux-journey-gate'), 'names the protocol');
            assert.ok(/MUST read first: [^\n]*ux-journey-process\.md/.test(text), 'the journey doc is a mandatory pre-edit read');
            assert.ok(conventions.UI_UX_GATE.referenceDocs.includes(JOURNEY) && conventions.UI_UX_GATE.evidenceDocs.includes(JOURNEY), 'doc is both read list and evidence');
            assert.ok(fs.existsSync(path.resolve(HOOKS_DIR, '..', '..', JOURNEY)), 'the named doc ships with the framework');
        })
    },
    {
        // INTENT: a skill counts as "gate already delivered" ONLY if it carries every rule set the digest
        // names — otherwise loading it silences the digest and a rule set (UX journey-first) never arrives.
        name: 'TC-UIG-014 every evidence skill of the gate carries the journey-first protocol it stands in for',
        fn: () => {
            const skillsDir = path.resolve(HOOKS_DIR, '..', 'skills');
            for (const skill of conventions.UI_UX_GATE.evidenceSkills) {
                const body = fs.readFileSync(path.join(skillsDir, skill, 'SKILL.md'), 'utf8');
                assert.ok(body.includes('SYNC:ux-journey-gate'), `evidence skill ${skill} must carry SYNC:ux-journey-gate`);
            }
        }
    }
];

module.exports = { name: 'ui-ux-gate-inject', tests };
