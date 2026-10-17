/**
 * Authored work-record contract.
 *
 * Other skills write initiative, task and story files into the folders the tracker reads. The tracker owns the record
 * shape (`task-track/references/integration-guide.md`, "Records another skill authors"), and that shape depends on the
 * kind: each kind has its own statuses and its own tracker-owned values. These cases prove that every template those
 * skills ship still fits it and that the owner states what the tracker does, so a competing status list, a status of
 * another kind, a label in `priority`, a hand-written assignee or a retired word cannot return unnoticed.
 *
 * The guides also state rules a reader acts on without seeing the code: which operation writes a tag, what a migration
 * needs before it starts and what it answers, what meets a prerequisite, what a correction requires, which date makes
 * work overdue. For each such rule a case takes the words from the sentence that states it (a code, a flag, a field, a
 * kind, a status), brings about the situation in a fixture project and compares the two. The case fails when the guide
 * and the tracker disagree, whichever of them changed.
 *
 * Portability: reads only files that ship inside the framework folder and writes only to the temp fixture. Version
 * control is the fixture's own disposable repository. A case about a date sets the clock and the time zone for one read
 * and puts both back.
 */

'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { isDeepStrictEqual } = require('node:util');
const { trackingTest: test, refused, earlierProject, git } = require('../lib/task-tracking-fixture.cjs');
const { inspectRecords } = require('../../lib/task-artifact-store.cjs');
const { operationCatalogue } = require('../../lib/task-tracking.cjs');
const reports = require('../../lib/task-tracking-report.cjs');
const { KINDS, FOLDERS, RECORDED_STATES, OWNED_VALUES, TAG_ROLES, LEVELS, LABELS, EARLIER, CURRENT_VERSION, EARLIER_VERSION, lifecycleOf, kindLabelFindings } = require('../../lib/task-tracking-vocabulary.cjs');
const cli = require('../../../skills/task-track/scripts/task-track.cjs');

const FRAMEWORK = path.resolve(__dirname, '../../..');
const read = relative => fs.readFileSync(path.join(FRAMEWORK, relative), 'utf8');
const GUIDE = 'skills/task-track/references/integration-guide.md';
const GUIDE_ANCHOR = 'task-track/references/integration-guide.md#records-another-skill-authors';
const MANUAL = 'skills/task-track/references/manual-operations.md';
const CONFIGURATION_GUIDE = 'docs/configuration/README.md';
const CLI_SCRIPT = path.join(FRAMEWORK, 'skills/task-track/scripts/task-track.cjs');
const MIGRATION = '## Migrate an earlier-vocabulary project';
const LIFECYCLE = '## Lifecycle, proof and acceptance';
// The fields `patchRecord` writes for the tracker; an authoring template may not give them another meaning.
const TRACKER_OWNED = ['title', 'intent', 'status', 'priority', 'assigned_to'];
// An initiative's approval is its tracker status and its priority is the tracker's priority level. A key of the
// authoring skill's own that states either would be a second answer to the same question.
const INITIATIVE_FACT_KEYS = ['review_outcome', 'priority_label'];

// Every artifact template a skill ships: its source, the heading that introduces a fenced template (none when
// the file is the template), the record kind and the file name the authoring skill uses.
const TEMPLATES = [
    { name: 'initiative template', source: 'docs/team-artifacts/templates/initiative-template.md', kind: 'initiative', file: 'initiatives/261007-po-initiative-sample.md' },
    { name: 'task template', source: 'docs/team-artifacts/templates/task-template.md', kind: 'task', file: 'tasks/261007-task-sample.md' },
    { name: 'user story template', source: 'docs/team-artifacts/templates/user-story-template.md', kind: 'story', file: 'tasks/stories/261007-us-sample.md' },
    { name: 'refine-mode task template', source: 'skills/work-item/references/mode-refine.md', heading: '### Task Template', kind: 'task', file: 'tasks/261007-task-refined-sample.md' },
    { name: 'story-mode template', source: 'skills/work-item/references/mode-story.md', heading: '## Story Artifact Template', kind: 'story', file: 'tasks/stories/261007-us-refined-sample.md' }
];

/** The frontmatter lines of a template: the first `---` pair after the heading, or at the top of the file. */
function frontmatterLines(text, heading) {
    const lines = text.split(/\r?\n/);
    const from = heading ? lines.indexOf(heading) : 0;
    assert.notEqual(from, -1, `Template heading is missing: ${heading}`);
    const open = lines.indexOf('---', from);
    const close = lines.indexOf('---', open + 1);
    assert.ok(open !== -1 && close > open, 'Template frontmatter is missing');
    return lines.slice(open + 1, close);
}

/** Top-level `key: value` pairs as the template states them, comment removed. */
function templateFields(lines) {
    const fields = new Map();
    for (const line of lines) {
        const match = /^([A-Za-z_][A-Za-z0-9_]*):\s*(.*?)(?:\s+#.*)?$/.exec(line);
        if (match) fields.set(match[1], match[2]);
    }
    return fields;
}

const options = raw => (/^['"]/.test(raw) ? [raw] : raw.split(/\s+\|\s+/));
const fieldsOf = template => templateFields(frontmatterLines(read(template.source), template.heading));

/** What in a template of the given kind would make the tracker and the authoring skill disagree about the same field. */
function shapeViolations(lines, kind) {
    const fields = templateFields(lines);
    const lifecycle = lifecycleOf(kind);
    const found = [];
    for (const key of ['id', 'title', 'intent', 'status']) if (!fields.has(key)) found.push(`${key} is missing`);
    if (fields.has('status')) {
        const states = options(fields.get('status'));
        if (states[0] !== lifecycle.initial) found.push(`a generated record starts as ${lifecycle.initial}, not ${states[0]}`);
        for (const state of states) {
            if (!RECORDED_STATES.includes(state)) found.push(`status ${state} is not a tracker state`);
            else if (!lifecycle.states.includes(state)) found.push(`status ${state} is not a status of ${kind}`);
        }
    }
    if (fields.has('priority') && !/^(?:1-999|\{[^}]*\b1-999\b[^}]*\})$/.test(fields.get('priority'))) found.push('priority is not the integer 1-999 the tracker writes');
    for (const key of ['assigned_to', 'tracking']) if (fields.has(key)) found.push(`${key} is written only by the tracker`);
    for (const key of Object.keys(OWNED_VALUES)) if (fields.has(key)) found.push(`${key} is recorded only through the tracker`);
    if (kind === 'initiative') for (const key of INITIATIVE_FACT_KEYS) if (fields.has(key)) found.push(`${key} repeats a tracker-owned initiative fact`);
    for (const key of ['sprint', 'story_points']) if (fields.has(key)) found.push(`${key} is not used in new work records`);
    return found;
}

/** The findings for a template of the given kind that holds the identity fields and the given further lines. */
const shaped = (kind, lines) => shapeViolations(['id: SAMPLE-{YYMMDD}-{NNN}', "title: '{Title}'", "intent: '{Outcome}'", ...lines], kind);

/** A file as the authoring skill would save it: the template's own keys with each placeholder filled. */
function sample(lines, sequence, status) {
    const filled = lines.map(line => {
        const match = /^([A-Za-z_][A-Za-z0-9_]*):\s*(.*?)(\s+#.*)?$/.exec(line);
        if (!match) return line;
        const key = match[1];
        let value = options(match[2])[0]
            .replace(/\{\s*YYYY-MM-DD\s*\}/g, '2026-10-07').replace(/\{YYMMDD\}/g, '261007').replace(/\{NNN\}/g, String(sequence).padStart(3, '0'));
        if (key === 'status' && status) value = status;
        else if (key === 'priority' && /^(?:1-999|\{[^}]*\b1-999\b[^}]*\})$/.test(value)) value = '3';
        else if (/^\{/.test(value)) value = "'sample'";
        return `${key}: ${value}`;
    });
    return `---\n${filled.join('\n')}\n---\n\n# Sample\n\n## Acceptance Criteria\n\n#### AC-01: First outcome\n\nAuthored body stays as written.\n`;
}

const idOf = text => /^id: (.+)$/m.exec(text)[1];

async function adopt(f, kind, id) {
    const request = f.request('adopt', id, {}, { target: { kind, itemId: id } });
    const preview = await f.core.executeOperation({ ...request, preview: true }, f.authority());
    assert.equal(preview.primary.status, 'preview', `${id}: ${JSON.stringify(preview.primary)}`);
    const result = await f.core.executeOperation({ ...request, previewToken: preview.previewToken }, f.authority());
    assert.equal(result.primary.status, 'saved', `${id}: ${JSON.stringify(result.primary)}`);
}

/** Writes one record per shipped template and returns each template with its saved text and id. */
function writeAll(f) {
    return TEMPLATES.map((template, index) => {
        const text = sample(frontmatterLines(read(template.source), template.heading), index + 1);
        f.write(`work/${template.file}`, text);
        return { ...template, text, id: idOf(text) };
    });
}

/** The owner section of the guide: from its heading to the next heading of the same depth. Line endings follow the checkout. */
function ownerSection() {
    const guide = read(GUIDE);
    const heading = /\r?\n## Records another skill authors\r?\n/.exec(guide);
    assert.ok(heading, 'the owner section exists');
    const rest = guide.slice(heading.index + heading[0].length);
    const next = /\r?\n## /.exec(rest);
    return next ? rest.slice(0, next.index) : rest;
}

const cells = line => (line.startsWith('|') ? line.split('|').slice(1, -1).map(cell => cell.trim()) : []);
/** The words a cell or a sentence states in code form. */
const words = text => (text.match(/`[^`]+`/g) || []).map(word => word.slice(1, -1));

/** Body rows of the table whose first header cell is the given one, each as its trimmed cells. */
function tableRows(section, firstHeader) {
    const lines = section.split(/\r?\n/);
    const header = lines.findIndex(line => cells(line)[0] === firstHeader);
    assert.notEqual(header, -1, `the owner section has a table that starts with "${firstHeader}"`);
    const rows = [];
    for (let index = header + 2; index < lines.length && lines[index].startsWith('|'); index++) rows.push(cells(lines[index]));
    return rows;
}

/** The part of the manual under one heading: from that heading to the next heading of its own depth or a shallower one. */
function manualSection(heading) {
    const manual = read(MANUAL);
    const depth = /^#+/.exec(heading)[0].length;
    const lines = manual.split(/\r?\n/);
    const from = lines.indexOf(heading);
    assert.notEqual(from, -1, `the manual has the section "${heading}"`);
    const length = lines.slice(from + 1).findIndex(line => new RegExp(`^#{1,${depth}} `).test(line));
    return lines.slice(from + 1, length === -1 ? undefined : from + 1 + length).join('\n');
}

/** What a guide states at the place a rule is stated: the captured words of the sentence the pattern describes. */
function stated(text, pattern, what) {
    const found = pattern.exec(text);
    assert.ok(found, `the guide states ${what}`);
    return found.slice(1);
}

/** Runs `run` with the clock held at one instant and puts the real clock back whatever happens. Nothing in the tracker is told the date. */
async function at(instant, run) {
    const Actual = Date; const held = Actual.parse(instant);
    globalThis.Date = class extends Actual {
        constructor(...values) { if (values.length) super(...values); else super(held); }
        static now() { return held; }
    };
    try { return await run(); }
    finally { globalThis.Date = Actual; }
}

/** Runs `run` in each named time zone in turn and puts the host's own back. A host that cannot change its zone runs in its own each time. */
async function inZones(zones, run) {
    const own = process.env.TZ;
    try { for (const zone of zones) { process.env.TZ = zone; await run(zone); } }
    finally { if (own === undefined) delete process.env.TZ; else process.env.TZ = own; }
}

/** One command line as a person runs it: its one line of output, parsed, and its exit status. */
function typed(f, args) {
    const result = spawnSync(process.execPath, [CLI_SCRIPT, ...args], { cwd: f.root, encoding: 'utf8', shell: false, windowsHide: true, timeout: 60000 });
    assert.equal(result.error, undefined, result.error?.message);
    return { exit: result.status, output: JSON.parse(result.stdout) };
}

/** Keeps the record root and the configuration as they are now; the returned function puts them back. */
function keep(f) {
    const kept = path.join(f.root, 'kept');
    for (const top of ['work', 'docs']) fs.cpSync(path.join(f.root, top), path.join(kept, top), { recursive: true });
    return () => { for (const top of ['work', 'docs']) { fs.rmSync(path.join(f.root, top), { recursive: true, force: true }); fs.cpSync(path.join(kept, top), path.join(f.root, top), { recursive: true }); } };
}

/** Stops a migration the first time it reaches a point, as an interruption would. */
const stopAt = (f, point) => f.migrate({ checkpoint: name => { if (name === point) throw new Error('simulated interruption'); } });

// Words of the earlier vocabulary that name something the current one calls differently or no longer has.
const RETIRED_TERMS = [
    ['memberItemIds', /memberItemIds/], ['groupRole', /groupRole/], ['groupLabels', /groupLabels/], ['groupFigures', /groupFigures/],
    ['ungroupedTaskIds', /ungroupedTaskIds/], ['--group', /--group\b/], ['EXACT_GROUP_ID', /EXACT_GROUP_ID/],
    ['the group operation', /operation"?: "group"|`group` operation|operation `group`/], ['project group', /project groups?/i],
    ['review_outcome', /review_outcome/], ['project_reference', /project_reference/]
];
// The only places that name one on purpose: each describes the earlier version, and says why the word belongs there.
const EARLIER_DESCRIPTIONS = {
    'config/README.md': { terms: ['groupLabels', '--group', 'EXACT_GROUP_ID', 'the group operation', 'review_outcome', 'project_reference'],
        why: 'the upgrade table an adopting project follows maps each earlier name to its current one' },
    'skills/task-track/references/manual-operations.md': { terms: ['groupLabels'], why: 'the conversion mapping names the earlier label key it converts' },
    'docs/configuration/README.md': { terms: ['groupLabels'], why: 'the key is stated as belonging to the earlier vocabulary only' }
};
const GUIDANCE_ROOTS = ['skills', 'docs', 'agents'];
const GUIDANCE_FILES = ['config/README.md'];

/** Every Markdown file of the framework guidance, as forward-slash paths relative to the framework folder. */
function guidanceFiles() {
    const found = [...GUIDANCE_FILES];
    const visit = relative => {
        for (const entry of fs.readdirSync(path.join(FRAMEWORK, relative), { withFileTypes: true })) {
            if (entry.name === 'node_modules') continue;
            const child = `${relative}/${entry.name}`;
            if (entry.isDirectory()) visit(child);
            else if (entry.isFile() && entry.name.endsWith('.md')) found.push(child);
        }
    };
    for (const root of GUIDANCE_ROOTS) visit(root);
    return found.sort();
}

module.exports = { name: 'Task tracking authored records integration', tests: [
    { name: 'TC-ARS-001: every shipped initiative, task and story template keeps the tracker-owned fields in the tracker vocabulary',
        fn: () => {
            for (const template of TEMPLATES) {
                assert.deepEqual(shapeViolations(frontmatterLines(read(template.source), template.heading), template.kind), [], `${template.name} (${template.source})`);
            }
        } },
    { name: 'TC-ARS-002: a competing status list, a priority label or a hand-written assignee is reported as drift',
        fn: () => {
            const drifted = lines => shapeViolations(['id: TASK-{YYMMDD}-{NNN}', "title: '{Title}'", "intent: '{Outcome}'", ...lines], 'task');
            assert.deepEqual(drifted(['status: draft']), []);
            for (const key of ['sprint', 'story_points']) assert.deepEqual(drifted(['status: draft', `${key}: 1`]), [`${key} is not used in new work records`]);
            assert.deepEqual(drifted(['status: draft', 'delivery_wave: foundation', 'effort_points: 3']), []);
            assert.deepEqual(drifted(['status: draft | refined | ready']), ['status refined is not a tracker state']);
            assert.deepEqual(drifted(['status: planned | ready']), ['a generated record starts as draft, not planned']);
            assert.deepEqual(drifted(['status: draft', "priority: Must Have | Should Have"]), ['priority is not the integer 1-999 the tracker writes']);
            assert.deepEqual(drifted(['status: draft', "assigned_to: '{Name or Unassigned}'"]), ['assigned_to is written only by the tracker']);
            assert.deepEqual(shapeViolations(['id: TASK-1', "title: 'T'", 'status: draft'], 'task'), ['intent is missing']);
        } },
    test('TC-ARS-003', 'a record written from each shipped template is read without a diagnostic and adopted without loss', async f => {
        const written = writeAll(f);
        const scan = inspectRecords(f.context());
        assert.deepEqual(scan.diagnostics, []); assert.equal(scan.coverage, 'complete');
        assert.deepEqual(scan.records.map(record => record.id).sort(), written.map(item => item.id).sort());
        for (const item of written) {
            const before = f.view(item.id);
            assert.equal(before.kind, item.kind, item.name); assert.equal(before.legacy, true, item.name);
            assert.equal(before.state, 'draft', item.name); assert.equal(before.assigneeId, null, item.name);
            assert.ok(Number.isSafeInteger(before.priority) && before.priority >= 1 && before.priority <= 999, `${item.name}: priority ${before.priority}`);
            assert.ok(before.intent.trim(), `${item.name}: intent`);
            await adopt(f, item.kind, item.id);
            const saved = f.bytes(item.id).toString();
            const header = text => text.slice(0, text.indexOf('\n---\n', 4));
            assert.equal(saved.slice(header(saved).length), item.text.slice(header(item.text).length), `${item.name}: authored body kept`);
            for (const line of header(item.text).split('\n')) assert.ok(header(saved).includes(line), `${item.name}: authored key kept: ${line}`);
            const after = f.view(item.id);
            assert.equal(after.legacy, false, item.name); assert.equal(after.state, 'draft', item.name); assert.equal(after.assigneeId, null, item.name);
            assert.equal(f.record(item.id).tracking.readiness, undefined, `${item.name}: adoption records no readiness`);
        }
        assert.deepEqual(f.progress().diagnostics.filter(entry => entry.path), []);
    }),
    test('TC-ARS-004', 'every state a template offers is one an adopted record may hold', async f => {
        let sequence = 0;
        for (const template of TEMPLATES) {
            const lines = frontmatterLines(read(template.source), template.heading);
            for (const state of options(templateFields(lines).get('status'))) {
                const text = sample(lines, ++sequence, state); const id = idOf(text);
                f.write(`work/${template.file.replace('.md', `-${sequence}.md`)}`, text);
                await adopt(f, template.kind, id);
                assert.equal(f.view(id).state, state, template.name);
            }
        }
    }),
    test('TC-ARS-005', 'the documented hand-off records intent, criteria, priority and links on template-written records without readiness or assignment', async f => {
        const written = writeAll(f);
        const first = kind => written.find(item => item.kind === kind);
        for (const item of written) await adopt(f, item.kind, item.id);
        const task = first('task'); const initiative = first('initiative'); const story = first('story');
        const target = item => ({ target: { kind: item.kind, itemId: item.id } });
        await f.saved('update', task.id, { intent: 'Let an operator export a selected subset', priority: 2,
            criteria: [{ id: 'AC-01', text: 'Export contains exactly the selected rows' }] }, target(task));
        // The documented hand-off: the links, and the tag for the source initiative.
        await f.saved('link', story.id, { links: [{ relation: 'parent', itemId: task.id }] }, target(story));
        await f.saved('tag', task.id, { initiativeIds: [initiative.id] }, target(task));
        await f.saved('transition', task.id, { state: 'planned' }, target(task));
        const view = f.view(task.id);
        assert.equal(view.state, 'planned'); assert.equal(view.priority, 2); assert.deepEqual(view.criteria.map(entry => entry.id), ['AC-01']);
        assert.deepEqual(view.links, [{ relation: 'initiative', itemId: initiative.id }]);
        assert.deepEqual(f.view(story.id).links, [{ relation: 'parent', itemId: task.id }]);
        assert.equal(view.assigneeId, null); assert.equal(f.record(task.id).tracking.readiness, undefined);
        assert.ok(f.bytes(task.id).toString().includes('Authored body stays as written.'));
        assert.equal(inspectRecords(f.context()).coverage, 'complete');
    }),
    { name: 'TC-ARS-006: every skill that writes or orders these records names the tracker reference as the shape owner',
        fn: () => {
            const guide = read(GUIDE);
            // Line endings follow the checkout, so the heading is matched on either form.
            const heading = /\r?\n## Records another skill authors\r?\n/.exec(guide);
            assert.ok(heading, 'the owner section exists');
            const section = guide.slice(heading.index);
            for (const field of [...TRACKER_OWNED, 'tracking']) assert.ok(section.includes(`\`${field}\``), `owner section names ${field}`);
            for (const surface of ['skills/initiative/SKILL.md', 'skills/work-item/SKILL.md', 'skills/work-item/references/mode-refine.md', 'skills/work-item/references/mode-story.md',
                'skills/work-item/references/mode-dor.md', 'skills/prioritize/SKILL.md', 'skills/workflow-planned-work/references/mode-idea-to-tasks.md', 'skills/workflow-planned-work/references/mode-spec-to-tasks.md',
                'skills/workflow-planned-work/references/mode-idea-to-spec.md']) {
                assert.ok(read(surface).includes(GUIDE_ANCHOR), `${surface} points to the record shape owner`);
            }
            for (const template of TEMPLATES.filter(item => !item.heading)) assert.ok(read(template.source).includes('task-track/references/integration-guide.md'), `${template.source} points to the owner`);
        } },
    test('TC-ARS-007', 'an older record holding a label where the ordering number belongs is ordered last and keeps its authored value', async f => {
        // Real scenario: planned work written before the label moved to its own key. It must still read, and must not sort as a number.
        f.write('work/tasks/older-planned-item.md', '---\nid: TASK-OLDER\ntitle: Older planned item\nintent: Keep older planned work readable\nstatus: draft\npriority: Must Have\nrank: 3\n---\nAuthored body.\n');
        await f.create('TASK-RANKED'); await f.saved('update', 'TASK-RANKED', { priority: 5 });
        const snapshot = f.progress(); assert.equal(snapshot.coverage, 'complete');
        assert.equal(f.view('TASK-OLDER').priority, 999); assert.equal(f.view('TASK-RANKED').priority, 5);
        // The ready list is the tracker's own priority order. By identity alone the older record would come first, so
        // this order holds only when its label reads as the last place and never as a number.
        await adopt(f, 'task', 'TASK-OLDER'); await f.saved('update', 'TASK-OLDER', { criteria: [{ id: 'AC-1', text: 'Older planned work stays readable' }] });
        await f.ready('TASK-OLDER'); await f.ready('TASK-RANKED');
        assert.deepEqual(f.progress().ready, ['TASK-RANKED', 'TASK-OLDER']);
        assert.ok(fs.readFileSync(path.join(f.root, 'work/tasks/older-planned-item.md'), 'utf8').includes('priority: Must Have'));
    }),
    { name: 'TC-ARS-008: skills that read these records find one whatever its file is named, including a record the tracker created',
        fn: () => {
            // A tracker-created record is saved under its identity, without the date prefix the generating skills use.
            const mockup = read('skills/work-item/references/mode-mockup.md');
            assert.ok(mockup.includes('glob `tasks/*.md`'), 'mock-up auto-detect reads every task file in the folder');
            assert.equal(/auto-detect the most recent task: glob `tasks\/\*-task-\*\.md`/.test(mockup), false, 'mock-up auto-detect is not limited to the date-named pattern');
            const accumulation = read('skills/feature-presentation/references/artifact-accumulation.md');
            assert.match(accumulation, /Never skip a record only because its file name lacks the date prefix/);
        } },
    { name: 'TC-ARS-009: a template offers only the statuses of its own kind, so a status of another kind is reported as drift',
        fn: () => {
            for (const kind of KINDS) assert.deepEqual(shaped(kind, [`status: ${lifecycleOf(kind).states.join(' | ')}`]), [], `${kind} may offer every status of its own lifecycle`);
            assert.deepEqual(shaped('task', ['status: draft | approved']), ['status approved is not a status of task']);
            assert.deepEqual(shaped('story', ['status: draft | committed']), ['status committed is not a status of story']);
            assert.deepEqual(shaped('initiative', ['status: draft | planned | ready']), ['status planned is not a status of initiative', 'status ready is not a status of initiative']);
            assert.deepEqual(shaped('area', ['status: active | done']), ['status done is not a status of area']);
            for (const template of TEMPLATES) {
                for (const state of options(fieldsOf(template).get('status'))) assert.ok(lifecycleOf(template.kind).states.includes(state), `${template.name} offers ${state}`);
            }
        } },
    { name: 'TC-ARS-010: a generated record starts in the first status of its own kind',
        fn: () => {
            for (const kind of KINDS) assert.deepEqual(shaped(kind, [`status: ${lifecycleOf(kind).initial}`]), [], `${kind} starts as ${lifecycleOf(kind).initial}`);
            assert.deepEqual(shaped('initiative', ['status: approved | draft']), ['a generated record starts as draft, not approved']);
            assert.deepEqual(shaped('subtask', ['status: ready | draft']), ['a generated record starts as draft, not ready']);
            assert.deepEqual(shaped('area', ['status: canceled | active']), ['a generated record starts as active, not canceled']);
            for (const template of TEMPLATES) assert.equal(options(fieldsOf(template).get('status'))[0], lifecycleOf(template.kind).initial, template.name);
        } },
    test('TC-ARS-011', 'a tracker-owned value written as a frontmatter key is reported as drift, because the tracker never reads it there', async f => {
        for (const key of Object.keys(OWNED_VALUES)) assert.deepEqual(shaped('task', ['status: draft', `${key}: sample`]), [`${key} is recorded only through the tracker`]);
        // Why the rule exists: a due date written by hand is not the record's due date.
        f.write('work/tasks/hand-dated.md', '---\nid: TASK-DATED\ntitle: Hand dated\nintent: Show where a due date is read from\nstatus: draft\ndeadline: 2020-01-01\n---\nAuthored body.\n');
        assert.equal(f.progress().coverage, 'complete');
        assert.equal(f.view('TASK-DATED').deadline, null); assert.equal(f.view('TASK-DATED').overdue, false);
        await adopt(f, 'task', 'TASK-DATED');
        assert.equal(f.view('TASK-DATED').deadline, null);
        await f.saved('update', 'TASK-DATED', { deadline: '2020-01-02' });
        const view = f.view('TASK-DATED');
        assert.equal(view.deadline, '2020-01-02'); assert.equal(view.overdue, true);
        assert.ok(f.bytes('TASK-DATED').toString().includes('\ndeadline: 2020-01-01\n'), 'the authored key stays as written');
    }),
    { name: 'TC-ARS-012: an initiative template carries no decision or priority key of its own, because approval and priority level are tracker facts',
        fn: () => {
            assert.deepEqual(shaped('initiative', ['status: draft', 'review_outcome: unset | approved | rejected']), ['review_outcome repeats a tracker-owned initiative fact']);
            assert.deepEqual(shaped('initiative', ['status: draft', 'priority_label: P1 | P2 | P3']), ['priority_label repeats a tracker-owned initiative fact']);
            // Delivery work has no tracker priority level, so its label stays beside the ordering number.
            assert.deepEqual(shaped('task', ['status: draft', 'priority_label: Must Have | Should Have']), []);
            const initiative = TEMPLATES.find(template => template.kind === 'initiative');
            const fields = fieldsOf(initiative);
            for (const key of INITIATIVE_FACT_KEYS) assert.equal(fields.has(key), false, `${initiative.source} states no ${key}`);
            assert.deepEqual(options(fields.get('status')), ['draft'], 'a new initiative is a draft; each later status is a recorded decision');
        } },
    test('TC-ARS-013', 'a hand-written area is adopted in its own first status, and one written with a status of another kind is not', async f => {
        const area = (id, status) => `---\nid: ${id}\ntitle: Checkout\nintent: Where checkout work belongs\nstatus: ${status}\n---\nAuthored body.\n`;
        f.write(`work/${FOLDERS.area}/checkout.md`, area('AREA-CHECKOUT', 'active'));
        assert.equal(f.progress().coverage, 'complete');
        const before = f.view('AREA-CHECKOUT');
        assert.equal(before.kind, 'area'); assert.equal(before.legacy, true); assert.equal(before.state, 'active'); assert.equal(before.level, null);
        await adopt(f, 'area', 'AREA-CHECKOUT');
        const after = f.view('AREA-CHECKOUT');
        assert.equal(after.legacy, false); assert.equal(after.state, 'active'); assert.equal(after.lifecycle, 'area');
        assert.ok(f.bytes('AREA-CHECKOUT').toString().endsWith('Authored body.\n'), 'authored body kept');
        f.write(`work/${FOLDERS.area}/drafted.md`, area('AREA-DRAFTED', 'draft'));
        refused(await f.perform('adopt', 'AREA-DRAFTED', {}, { preview: true }), 'UNSUPPORTED');
        assert.equal(f.view('AREA-DRAFTED').legacy, true);
    }),
    test('TC-ARS-014', 'the documented initiative hand-off records type, priority level and due date, and approval is a person\'s recorded decision', async f => {
        const initiative = writeAll(f).find(item => item.kind === 'initiative');
        await adopt(f, 'initiative', initiative.id);
        const adopted = f.view(initiative.id);
        assert.equal(adopted.state, 'draft'); assert.equal(adopted.type, 'idea'); assert.equal(adopted.priorityLevel, null); assert.equal(adopted.deadline, null);
        await f.saved('update', initiative.id, { type: 'feedback', priorityLevel: 'high', deadline: '2999-12-31' });
        refused(await f.perform('transition', initiative.id, { state: 'approved' }, {}, { canDecide: false }), 'NOT_PERMITTED');
        assert.equal(f.view(initiative.id).state, 'draft');
        await f.saved('transition', initiative.id, { state: 'approved' });
        const view = f.view(initiative.id);
        assert.equal(view.state, 'approved'); assert.equal(view.type, 'feedback'); assert.equal(view.priorityLevel, 'high');
        assert.equal(view.deadline, '2999-12-31'); assert.equal(view.overdue, false);
        assert.equal(view.assigneeId, null); assert.equal(f.record(initiative.id).tracking.readiness, undefined);
        assert.ok(f.bytes(initiative.id).toString().includes('Authored body stays as written.'));
        assert.equal(inspectRecords(f.context()).coverage, 'complete');
    }),
    test('TC-ARS-015', 'the documented tag hand-off stores area and initiative links on the tagged record alone, and that alone places it in their scopes', async f => {
        const written = writeAll(f);
        const task = written.find(item => item.kind === 'task'); const initiative = written.find(item => item.kind === 'initiative');
        for (const item of [task, initiative]) await adopt(f, item.kind, item.id);
        await f.create('AREA-FEATURE', 'area', { level: 'feature' });
        const targets = () => [initiative.id, 'AREA-FEATURE'].map(id => f.bytes(id).toString());
        const before = targets();
        await f.tag(task.id, { areaIds: ['AREA-FEATURE'], initiativeIds: [initiative.id] });
        assert.deepEqual(f.view(task.id).links, [{ relation: 'area', itemId: 'AREA-FEATURE' }, { relation: 'initiative', itemId: initiative.id }]);
        assert.deepEqual(targets(), before, 'no area or initiative record changes when a record is tagged to it');
        for (const [scopeId, kind] of [['AREA-FEATURE', 'area'], [initiative.id, 'initiative']]) {
            const scoped = f.progress({ scopeId });
            assert.equal(scoped.scope.kind, kind); assert.deepEqual(scoped.scope.taskIds, [task.id], `${kind} scope`);
        }
        assert.ok(f.bytes(task.id).toString().includes('Authored body stays as written.'));
    }),
    test('TC-ARS-016', 'a link list of other relations keeps a record\'s tags and a list that names a tag relation is refused, so the documented hand-off tags and links in either order, and the manual and the command help name exactly those relations', async f => {
        const written = writeAll(f);
        const first = kind => written.find(item => item.kind === kind);
        const task = first('task'); const story = first('story'); const initiative = first('initiative');
        for (const item of [task, story, initiative]) await adopt(f, item.kind, item.id);
        await f.create('AREA-FEATURE', 'area');
        const targets = { area: 'AREA-FEATURE', initiative: initiative.id };
        const tags = Object.entries(targets).map(([relation, itemId]) => ({ relation, itemId }));
        const parent = { relation: 'parent', itemId: task.id };
        // The hand-off with the tags first: the link list that follows names none of them and they stay.
        await f.tag(story.id, { areaIds: [targets.area], initiativeIds: [targets.initiative] });
        await f.saved('link', story.id, { links: [parent] });
        assert.deepEqual(f.view(story.id).links, [...tags, parent]);
        assert.match(ownerSection(), /Each of the two leaves what the other wrote as stored, so their order does not matter/);
        // What the tracker does with a list that names each relation it has, one at a time, on that tagged record.
        const refusedRelations = []; const refusals = new Set();
        for (const relation of operationCatalogue({}).linkRoles) {
            const stored = f.bytes(story.id);
            const result = await f.perform('link', story.id, { links: [{ relation, itemId: targets[relation] || task.id }] });
            if (result.primary.status === 'saved') { assert.deepEqual(f.view(story.id).links, [...tags, { relation, itemId: task.id }], `${relation}: the list replaces the other links and the tags stay`); continue; }
            refused(result); refusedRelations.push(relation); refusals.add(`${result.primary.code}: ${result.primary.reason}`);
            assert.deepEqual(f.bytes(story.id), stored, `${relation}: a refused list changes nothing`);
        }
        assert.deepEqual(refusedRelations, Object.keys(TAG_ROLES), 'a link list is refused exactly when it names a tag relation');
        // An empty list clears every other link and still keeps the tags.
        await f.saved('link', story.id, { links: [] });
        assert.deepEqual(f.view(story.id).links, tags);
        // The manual states the rule where it describes the operation: the same relations, the same refusal.
        const [kept, code] = stated(manualSection('## Links and saved checkpoints'), /It keeps the record's stored (.*?) links exactly as they are, and a list that names either is refused with `([A-Z_]+)`/, 'which links a link list keeps and how a list that names one is refused');
        assert.deepEqual(words(kept), refusedRelations);
        assert.equal(refusals.size, 1, 'one refusal, whichever tag relation the list names');
        const [refusal] = refusals;
        assert.ok(refusal.startsWith(`${code}: `), refusal); assert.match(refusal, /changed only by the tag operation/);
        // So does the command's own help, for both operations.
        const { boundaries } = await cli.run(['help']);
        const named = refusedRelations.join(' and ');
        assert.ok(boundaries.some(line => line.startsWith('Canonical apply.operation=link') && line.includes(`keeps the stored ${named} links and refuses a list that names either`)), 'help states what a link list keeps and refuses');
        assert.ok(boundaries.some(line => line.startsWith('Canonical apply.operation=tag') && line.includes(`the only operation that changes ${named} links`)), 'help names the one operation that changes a tag');
        // The rule this one replaced is stated nowhere any more.
        for (const guide of [GUIDE, MANUAL]) assert.doesNotMatch(read(guide), /whole list of links, tags included/, guide);
    }),
    { name: 'TC-ARS-017: the owner section states every kind with the home and the statuses the tracker gives it',
        fn: () => {
            const rows = tableRows(ownerSection(), 'Kind');
            assert.deepEqual(rows.map(row => words(row[0])), KINDS.map(kind => [kind]), 'one row per current kind, in the tracker\'s order');
            for (const row of rows) {
                const kind = words(row[0])[0];
                assert.deepEqual(words(row[1]), [`${FOLDERS[kind]}/`], `${kind}: home`);
                assert.deepEqual(words(row[2]), [...lifecycleOf(kind).states], `${kind}: statuses in order`);
                // The table promises that a new record starts in the first status listed.
                assert.equal(words(row[2])[0], lifecycleOf(kind).initial, `${kind}: first status`);
            }
        } },
    { name: 'TC-ARS-018: the owner section states every tracker-owned value with the kinds that own it and the choices the tracker accepts',
        fn: () => {
            const rows = tableRows(ownerSection(), 'Value');
            assert.deepEqual(rows.map(row => words(row[0])), Object.keys(OWNED_VALUES).map(field => [field]));
            for (const row of rows) {
                const field = words(row[0])[0]; const owned = OWNED_VALUES[field];
                assert.deepEqual(words(row[1]), [...owned.kinds], `${field}: kinds`);
                const [choices, rest = ''] = row[2].split(';');
                // A due date is a calendar date, so it has a form instead of a list.
                assert.deepEqual(words(choices), owned.values ? [...owned.values] : ['YYYY-MM-DD'], `${field}: choices`);
                assert.equal(/\bor unset\b/.test(row[2]), owned.optional, `${field}: may be unset exactly when the tracker allows it`);
                if (!owned.optional) { assert.match(rest, /never unset/, field); assert.deepEqual(words(rest), [owned.initial], `${field}: what a record starts with`); }
            }
        } },
    { name: 'TC-ARS-019: the owner section names each tag relation, the kind it points to and the key that records it',
        fn: () => {
            const section = ownerSection();
            for (const [relation, kind] of Object.entries(TAG_ROLES)) assert.match(section, new RegExp(`an? \`${relation}\` link names one ${kind}\\b`), `${relation} points to one ${kind}`);
            // The keys the owner gives for the tag operation are the ones the tracker's own catalogue lists for it.
            const stated = /the `tag` operation \(([^)]*)\)/.exec(section);
            assert.ok(stated, 'tags are recorded through the tag operation, with its keys');
            const tag = operationCatalogue({}).operations.find(operation => operation.name === 'tag');
            assert.deepEqual(words(stated[1]), tag.patchKeys);
            assert.deepEqual(tag.patchKeys, Object.keys(TAG_ROLES).map(relation => `${relation}Ids`), 'one key per tag relation');
            assert.match(section, /No record lists its members/);
        } },
    { name: 'TC-ARS-020: the documented save request is one the tracker accepts: its version, operation, kind and patch keys',
        fn: () => {
            const manual = read(MANUAL);
            const fence = /```json\r?\n([\s\S]*?)\r?\n```/.exec(manual.slice(manual.indexOf('## Prepare and retain a request')));
            assert.ok(fence, 'the manual shows a request');
            const request = JSON.parse(fence[1]);
            const catalogue = operationCatalogue({});
            assert.equal(request.schemaVersion, catalogue.request.schemaVersion);
            assert.ok(manual.includes(`A save request states \`schemaVersion: ${catalogue.request.schemaVersion}\``), 'the prose states the same version');
            const operation = catalogue.operations.find(entry => entry.name === request.operation);
            assert.ok(operation, `${request.operation} is a current operation`);
            for (const key of Object.keys(request.patch)) assert.ok(operation.patchKeys.includes(key), `${request.operation} accepts ${key}`);
            assert.ok(KINDS.includes(request.target.kind));
            for (const field of Object.keys(request)) assert.ok(catalogue.request.fields.includes(field), `${field} is a request field`);
        } },
    { name: 'TC-ARS-021: no framework guidance presents a retired tracker word outside the places that describe the earlier version',
        fn: () => {
            const unexpected = []; const seen = new Set();
            const files = guidanceFiles();
            for (const file of files) {
                const allowed = EARLIER_DESCRIPTIONS[file]?.terms || [];
                read(file).split(/\r?\n/).forEach((line, index) => {
                    for (const [term, pattern] of RETIRED_TERMS) if (pattern.test(line)) {
                        if (allowed.includes(term)) seen.add(`${file}: ${term}`);
                        else unexpected.push(`${file}:${index + 1}: ${term}`);
                    }
                });
            }
            assert.deepEqual(unexpected, [], 'a retired word names a current concept; state the current word, or list the file with its reason when it describes the earlier version');
            // The scan is trusted only because it finds what is known to be there, and an allowance that matches nothing is removed.
            for (const [file, { terms }] of Object.entries(EARLIER_DESCRIPTIONS)) {
                assert.ok(files.includes(file), `${file} is scanned`);
                for (const term of terms) assert.ok(seen.has(`${file}: ${term}`), `${file} still names ${term}`);
            }
        } },
    test('TC-ARS-022', 'where nothing can restore a project a migration run waits for a confirmed backup while its preview is given and says so, a repeated run and an abandon request do not ask again, and the manual names the tracker\'s own code, flag and fields for it', async f => {
        const section = manualSection(MIGRATION);
        const [code, flag] = stated(section, /a run is refused with `([A-Z_]+)`, exit status 1 and nothing changed, until a backup is confirmed with `(--[a-z-]+)`/, 'the refusal of a run that has no restore point and the flag that confirms a backup');
        const [said, pathsKey, listKey] = stated(section, /it says beforehand what a run will meet: (.*?)\. In the refusal of a run, `(\w+)` names what nothing can restore, and the entry is the last of `(\w+)`/, 'what the preview says and what the refusal names');
        const [confirmedKey] = stated(section, /the progress record states in `(\w+)` whether the run began on a confirmation/, 'where a confirmation is recorded');
        const fields = words(said).filter(word => word.includes('.'));
        const [shown] = stated(said, /the first (\d+), with/, 'how many ignored paths a preview names');
        const valueAt = (result, field) => field.split('.').reduce((value, key) => value?.[key], result);
        // More supporting records than a preview names, kept in one location that the checkout below leaves out of version control.
        for (let index = 0; index <= Number(shown); index++) await f.create(`NOTE-${String(index).padStart(2, '0')}`, 'subtask');
        await earlierProject(f);
        const restore = keep(f);
        const earlier = f.storedState();
        // Outside version control: the preview is given and states it; the run is refused, last among its refusals, and changes nothing.
        const preview = await f.migrate({ dryRun: true, backupConfirmed: false });
        assert.equal(preview.status, 'preview', JSON.stringify(preview));
        assert.equal(valueAt(preview, fields[0]), false, `${fields[0]} is false where nothing can restore the project`);
        assert.ok(valueAt(preview, fields[1]).includes(code) && valueAt(preview, fields[1]).includes(flag), 'the note names the refusal a run will meet and the flag');
        const refusal = await f.migrate({ backupConfirmed: false });
        assert.deepEqual([refusal.status, refusal.code], ['refused', code], `a run with no restore point and no confirmed backup: ${JSON.stringify(refusal).slice(0, 400)}`);
        assert.equal(refusal[listKey].at(-1).code, code, 'named last among the refusals');
        assert.ok(refusal[listKey].at(-1)[pathsKey].length > 0 && refusal.reason.includes(flag), refusal.reason);
        assert.deepEqual(f.storedState(), earlier);
        // Confirmed, the run starts and the progress record says so. Neither an abandon request nor the run that completes it asks again.
        assert.equal((await stopAt(f, 'journal-written')).status, 'interrupted');
        assert.equal(JSON.parse(fs.readFileSync(path.join(f.root, 'work/.vocabulary-migration.json'), 'utf8'))[confirmedKey], true);
        assert.deepEqual([(await f.migrate({ abandon: true, backupConfirmed: false })).status, f.storedState()], ['abandoned', earlier]);
        assert.equal((await stopAt(f, 'member-rewritten')).status, 'interrupted');
        const completed = await f.migrate({ backupConfirmed: false });
        assert.deepEqual([completed.status, completed.resumed], ['migrated', true], JSON.stringify(completed));
        // In a checkout where Git ignores only a file that is no record, version control can restore the project and nothing is asked.
        restore();
        stated(section, /An ignored file under the record root that is no record, such as a file manager's own file, needs no restore point/, 'that a stray ignored file is no obstacle');
        f.write('.gitignore', '*.log\n'); f.write('work/tasks/stray.log', 'kept out of version control\n');
        git(f, ['init']); git(f, ['add', '--', '.gitignore', 'docs', 'work']); git(f, ['commit', '-m', 'Earlier project with a stray ignored file']);
        assert.deepEqual((await cli.run(['migrate', '--root', f.root, '--dry-run'])).versionControl, { kind: 'git', clean: true, restorable: true });
        // Where Git ignores record files the preview names them, and the documented flag is the one the command line takes.
        const ignored = fs.readdirSync(path.join(f.root, 'work/subtasks')).sort().map(name => `work/subtasks/${name}`);
        assert.ok(ignored.length > Number(shown));
        git(f, ['rm', '-r', '--cached', '--quiet', '--', 'work/subtasks']); f.write('.gitignore', '*.log\nwork/subtasks/\n');
        git(f, ['add', '--', '.gitignore']); git(f, ['commit', '-m', 'Supporting records are kept out of version control']);
        const previewed = await cli.run(['migrate', '--root', f.root, '--dry-run']);
        assert.equal(previewed.status, 'preview', JSON.stringify(previewed));
        for (const field of fields) assert.notEqual(valueAt(previewed, field), undefined, `the preview carries ${field}`);
        assert.deepEqual([valueAt(previewed, fields[0]), valueAt(previewed, fields[2]), valueAt(previewed, fields[3])], [false, ignored.slice(0, Number(shown)), ignored.length]);
        const before = f.storedState();
        const unconfirmed = await cli.run(['migrate', '--root', f.root]);
        assert.deepEqual([unconfirmed.status, unconfirmed.code], ['refused', code], JSON.stringify(unconfirmed).slice(0, 400));
        assert.deepEqual(unconfirmed[listKey].at(-1)[pathsKey], ignored.slice(0, Number(shown)));
        assert.deepEqual(f.storedState(), before);
        assert.ok((await cli.run(['help'])).usage.migrate.includes(flag), 'help names the flag');
        assert.equal((await cli.run(['migrate', '--root', f.root, flag])).status, 'migrated');
    }),
    test('TC-ARS-023', 'a repeated migration run that finds a group changed since the migration began stops, changes nothing and names both ways on, under the code and the fields the manual gives', async f => {
        const [status, code, groupsKey, completeKey, abandonKey] = stated(manualSection(MIGRATION), /no longer holds the members or the purpose recorded before the first change: the rerun answers `status: "(\w+)"`, code `([A-Z_]+)`, exit status 1, and changes nothing, the progress record included\. `(\w+)` names each such group .*?the result gives both ways on: `(\w+)` \(.*?\) and `(\w+)` \(/, 'the answer of a repeated run that finds a changed group');
        const [indexKey] = stated(manualSection(MIGRATION), /the member list and purpose the progress record holds for it under `([\w.]+)`/, 'where the progress record holds a group\'s list');
        await earlierProject(f, { groups: [{ id: 'FEATURE', purpose: 'capability', members: ['PBI-1', 'PBI-2'] }] });
        assert.equal((await stopAt(f, 'member-rewritten')).status, 'interrupted');
        const relative = 'work/projects/FEATURE.md';
        const recorded = fs.readFileSync(path.join(f.root, relative), 'utf8');
        const listed = members => recorded.replace('"memberItemIds":["PBI-1","PBI-2"]', `"memberItemIds":${JSON.stringify(members)}`);
        f.write(relative, listed(['PBI-1'])); assert.notEqual(listed(['PBI-1']), recorded);
        const changed = f.storedState();
        const stopped = await f.migrate();
        assert.deepEqual([stopped.status, stopped.code], [status, code], JSON.stringify(stopped));
        // Nothing changed: not a record, not the declaration, not the progress record, which is kept in the record root.
        assert.deepEqual(f.storedState(), changed);
        assert.deepEqual(stopped[groupsKey], [{ groupId: 'FEATURE', path: relative, members: { added: [], removed: ['PBI-2'] } }]);
        // The ways on are the lists of steps the answer carries, in the order the manual gives them.
        assert.deepEqual(Object.keys(stopped).filter(key => Array.isArray(stopped[key]) && stopped[key].length > 0 && stopped[key].every(step => typeof step === 'string')), [completeKey, abandonKey]);
        // The first way, as the manual words it: the progress record holds the list to put back.
        const progress = JSON.parse(fs.readFileSync(path.join(f.root, stopped.journal), 'utf8'));
        assert.deepEqual(indexKey.split('.').reduce((value, key) => value[key], progress).find(group => group.id === 'FEATURE').members, ['PBI-1', 'PBI-2']);
        // Put back in another order it is the same list, and the same command completes the migration.
        f.write(relative, listed(['PBI-2', 'PBI-1']));
        const finished = await f.migrate();
        assert.deepEqual([finished.status, finished.resumed], ['migrated', true], JSON.stringify(finished));
    }),
    test('TC-ARS-024', 'the result of a migration run carries the fields the manual names for it and repeats what its preview stated about listings and levels, exactly those the manual says it repeats', async f => {
        const section = manualSection(MIGRATION);
        const [named, repeatedSaid] = stated(section, /The result states (.*?)\. It also repeats (.*?) exactly as the preview stated them/, 'what the result of a run states');
        // A project with one listing of each kind the preview reports: across an initiative and an area, between two initiatives, and a level left unset.
        await earlierProject(f, { groups: [{ id: 'OUTCOME', purpose: 'program', members: ['FEATURE'] }, { id: 'FEATURE', purpose: 'capability', members: ['PBI-1', 'INNER-AREA'] },
            { id: 'INNER-AREA', kind: 'vision', purpose: 'area', members: [] }, { id: 'LARGER', purpose: 'program', members: ['SMALLER'] }, { id: 'SMALLER', purpose: 'program', members: ['PBI-2'] }] });
        const preview = await f.migrate({ dryRun: true });
        assert.equal(preview.status, 'preview', JSON.stringify(preview));
        const result = await f.migrate();
        assert.equal(result.status, 'migrated', JSON.stringify(result));
        for (const field of words(named.replace(/\([^)]*\)/g, ''))) assert.ok(Object.hasOwn(result, field), `the result carries ${field}`);
        assert.deepEqual(words(stated(named, /`records` \(([^)]*)\)/, 'what the result counts of the records')[0]), Object.keys(result.records));
        // Of the fields the preview table states, the ones a run repeats are those it carries with the value its preview gave.
        const previewed = tableRows(section, 'Field').map(row => words(row[0])[0]).filter(field => !field.includes('.'));
        const repeated = previewed.filter(field => Object.hasOwn(result, field) && isDeepStrictEqual(result[field], preview[field]));
        assert.deepEqual(words(repeatedSaid), repeated);
        for (const field of repeated) assert.ok(preview[field].length > 0, `${field} states something in this project`);
    }),
    test('TC-ARS-025', 'a named scope narrows the reads the manual says it narrows and leaves the ready and excluded lists covering the whole project', async f => {
        const [narrowedSaid, wholeCommand, listsSaid] = stated(manualSection('## Status and local workspace'), /`--scope` names one exact area or initiative: (.*?) then state that scope's members, delivery figures and health .*?The command `(\w+)` accepts the option, but its (.*?) lists always cover the whole project, so `--scope` does not narrow `\2`/, 'which reads a scope narrows');
        await f.create('AREA-ONE', 'area'); await f.create('TASK-INSIDE'); await f.create('TASK-OUTSIDE');
        await f.tag('TASK-INSIDE', { areaIds: ['AREA-ONE'] });
        for (const id of ['TASK-INSIDE', 'TASK-OUTSIDE']) await f.ready(id);
        // The commands that take the option, from the command's own help.
        const commands = /^([a-z|]+) --root CHECKOUT \[--scope EXACT_ID\]/.exec((await cli.run(['help'])).usage.inspect)[1].split('|');
        const answer = async (command, scoped) => { const { ready, excluded, scope, metrics } = await cli.run([command, '--root', f.root, ...(scoped ? ['--scope', 'AREA-ONE'] : [])]); return { ready, excluded, scope, metrics }; };
        const narrowed = []; const whole = [];
        for (const command of commands) (isDeepStrictEqual(await answer(command, true), await answer(command, false)) ? whole : narrowed).push(command);
        assert.deepEqual(narrowed, words(narrowedSaid)); assert.deepEqual(whole, [wholeCommand]);
        for (const command of narrowed) { const scoped = await answer(command, true); assert.deepEqual([scoped.scope.kind, scoped.scope.taskIds, scoped.metrics.total], ['area', ['TASK-INSIDE'], 1], command); }
        // The lists the manual names are the ones that command answers with, and they still hold the work outside the scope.
        const scoped = await cli.run([wholeCommand, '--root', f.root, '--scope', 'AREA-ONE']);
        assert.deepEqual(Object.keys(scoped).filter(key => Array.isArray(scoped[key])), words(listsSaid));
        assert.deepEqual(scoped.ready, ['TASK-INSIDE', 'TASK-OUTSIDE']);
    }),
    test('TC-ARS-026', 'an invalid configuration is refused with its fields named, a kind label is judged by the words of the vocabulary the project declares, and a migration names a label the current vocabulary uses for something else, as the guides state', async f => {
        const [code, inReason, printedMost, key] = stated(manualSection('## Refusal and recovery'), /`([A-Z_]+)` means the declared project configuration is invalid, and every command but `help` then refuses: the reason names up to (\d+) of the fields at fault and how many more there are, and the command line prints each of them, at most (\d+), in `(\w+)`/, 'how an invalid configuration is refused');
        // A word only the current vocabulary has and one only the earlier vocabulary has, from the two vocabularies' own lists.
        const earlierWords = [...EARLIER.kinds, ...EARLIER.states, ...EARLIER.groupRoles, ...EARLIER.linkRoles];
        const currentOnly = LEVELS.find(word => !earlierWords.includes(word));
        const earlierOnly = EARLIER.groupRoles.find(word => !LEVELS.includes(word) && !KINDS.includes(word));
        assert.ok(currentOnly && earlierOnly, 'each vocabulary has a word the other lacks');
        const taken = (word, version) => kindLabelFindings({ task: word }, version).length > 0;
        // The configuration guide says which words each declared version holds a label to.
        const guide = read(CONFIGURATION_GUIDE);
        const [both] = stated(guide, /At `schemaVersion: (\d+)` it is every other word of either vocabulary/, 'the version held to the words of both vocabularies');
        const [alone, earlierUnknown] = stated(guide, /At `schemaVersion: (\d+)` the keys are the earlier kinds \(so `(\w+)` is an unknown field there\) and the taken text is the words and default labels of the earlier vocabulary alone/, 'the version held to the earlier kinds and words alone');
        assert.deepEqual([Number(both), Number(alone)].map(version => [taken(currentOnly, version), taken(earlierOnly, version)]), [[true, true], [false, true]],
            `a label "${currentOnly}" (current only) and a label "${earlierOnly}" (earlier only), as taken at versions ${both} and ${alone}`);
        const unknownKey = version => kindLabelFindings({ [earlierUnknown]: 'Some label' }, version).some(finding => finding.problem === 'unknown field');
        assert.deepEqual([unknownKey(Number(both)), unknownKey(Number(alone))], [false, true], `${earlierUnknown} as a key of the kind labels`);
        assert.ok(guide.includes(`refused as invalid configuration (\`${code}\`)`), 'the configuration guide names the same refusal');
        // A current project that declares such a label, among more faults than a refusal lists: every command but help refuses and the command line prints the fields.
        const faults = Number(printedMost) + 5;
        f.config.taskTracking.kindLabels = { task: currentOnly, ...Object.fromEntries(Array.from({ length: faults - 1 }, (_, index) => [`unknown${index}`, 'Label'])) }; f.saveConfig();
        const { commands } = await cli.run(['help']);
        for (const command of commands.filter(name => name !== 'help')) await assert.rejects(cli.run([command, '--root', f.root]), error => error.code === code, command);
        const { exit, output } = typed(f, ['inspect', '--root', f.root]);
        assert.ok(Array.isArray(output[key]), `the command line prints the fields at fault in ${key}: ${JSON.stringify(output).slice(0, 300)}`);
        assert.deepEqual([exit, output.status, output.code, output[key].length], [1, 'refused', code, Number(printedMost)], JSON.stringify(output));
        assert.ok(output[key].some(field => field.startsWith('taskTracking.kindLabels.task: ') && field.includes(JSON.stringify(currentOnly))), 'the field and the label are named');
        const parts = output.reason.slice(output.reason.indexOf(': ') + 2).split('; ');
        assert.equal(parts.length - 1, Number(inReason)); assert.equal(parts.at(-1), `and ${faults - Number(inReason)} more`);
        // The same label in a project that declares the earlier vocabulary: read whole, not shown, and named by the migration with the rename.
        delete f.config.taskTracking.kindLabels; f.saveConfig();
        await earlierProject(f);
        assert.equal(f.config.taskTracking.schemaVersion, Number(alone));
        f.config.taskTracking.kindLabels = { task: currentOnly }; f.saveConfig();
        const reading = f.progress();
        assert.deepEqual([reading.coverage, reading.vocabulary.project.state, reading.vocabulary.labels.kinds.task], ['complete', 'earlier', LABELS.kinds.task]);
        const answer = await f.migrate({ dryRun: true });
        assert.equal(answer.status, 'refused', JSON.stringify(answer));
        const row = tableRows(manualSection(MIGRATION), 'Code').find(cellsOfRow => words(cellsOfRow[0]).includes(answer.code));
        assert.ok(row, `the manual has a precondition row for ${answer.code}`);
        const [collision] = stated(row[1], /a kind label that is (a word or a default label of the \w+ vocabulary)/, 'the kind label a migration refuses');
        assert.ok(answer.reason.includes('taskTracking.kindLabels.task') && answer.reason.includes(collision), answer.reason);
        assert.match(row[2], /rename a kind label/); assert.match(answer.reason, /rename that label in the configuration, then retry/);
        // Renamed as the reason says, the project can be migrated.
        f.config.taskTracking.kindLabels = { task: 'Work item' }; f.saveConfig();
        assert.equal((await f.migrate({ dryRun: true })).status, 'preview');
    }),
    test('TC-ARS-027', 'a migration refuses by name an undeclared project that only its records show to be in the first vocabulary, while a read still calls that project current or earlier, as the manual states', async f => {
        const [code, key, statesSaid, findingsKey] = stated(manualSection(MIGRATION), /make `migrate` and its preview refuse with `([A-Z_]+)` and name those records in `(\w+)`\. A read does not make that judgement: such a project still reads as (.*?), with each of those files named in `(\w+)` and none of them counted/, 'how a first-vocabulary project is recognised by its records');
        const first = (id, kind) => `---\nid: ${id}\ntitle: Work written in the first vocabulary\nintent: Keep it as written\nstatus: backlog\ntracking: {schemaVersion: 1, revision: 1, kind: ${kind}}\n---\nBody.\n`;
        delete f.config.taskTracking; f.saveConfig();
        const read = [];
        const judged = async paths => {
            const reading = f.progress();
            read.push(reading.vocabulary.project.state);
            assert.deepEqual([reading[findingsKey].map(finding => finding.path).sort(), reading.items], [paths, []]);
            const stored = f.storedState();
            for (const dryRun of [true, false]) {
                const answer = await f.migrate({ dryRun });
                assert.deepEqual([answer.status, answer.code], ['refused', code], `${dryRun ? 'preview' : 'run'}: ${JSON.stringify(answer).slice(0, 400)}`);
                assert.deepEqual(answer.refusals[0][key], paths);
            }
            assert.deepEqual(f.storedState(), stored);
        };
        // In locations both readable vocabularies share, and then beside one only the earlier vocabulary read.
        f.write('work/tasks/OLD-1.md', first('OLD-1', 'task'));
        await judged(['work/tasks/OLD-1.md']);
        f.write('work/visions/OLD-2.md', first('OLD-2', 'vision'));
        await judged(['work/tasks/OLD-1.md', 'work/visions/OLD-2.md']);
        assert.deepEqual(read, words(statesSaid));
        // Boundary: a project that declares what it stores is never judged by a record.
        fs.rmSync(path.join(f.root, 'work/visions'), { recursive: true });
        f.config.taskTracking = { schemaVersion: CURRENT_VERSION }; f.saveConfig();
        assert.notEqual((await f.migrate({ dryRun: true })).code, code);
    }),
    test('TC-ARS-028', 'a prerequisite that names an area is never met and one that names an initiative is met once it is closed as done, and the way on the manual gives for an area works', async f => {
        const section = manualSection(LIFECYCLE);
        const [relation] = stated(section, /A prerequisite is a `(\w+)` link/, 'the relation that makes a prerequisite');
        const [metKind, metState] = stated(section, /An `(\w+)` meets it once it is closed as `(\w+)`/, 'the kind that meets a prerequisite by being closed');
        const [neverKind, wayOn] = stated(section, /An `(\w+)` never meets it, because an area is a place for work and does not finish: (.*?)\./, 'the kind that never meets a prerequisite and the way on');
        const [reasonsKey] = stated(section, /Every read states the cause for each record in its `(\w+)`/, 'where a read states why a prerequisite is unmet');
        await f.create('TASK-WAITS');
        // Each kind that is not delivery work, placed in every status of its own lifecycle: the statuses in which it meets a prerequisite.
        const person = { canCorrectState: true, canDecide: true };
        const met = {};
        for (const kind of KINDS.filter(candidate => lifecycleOf(candidate).name !== 'delivery')) {
            const id = `PREREQUISITE-${kind}`;
            await f.create(id, kind);
            await f.saved('link', 'TASK-WAITS', { links: [{ relation, itemId: id }] });
            met[kind] = [];
            for (const state of lifecycleOf(kind).states) {
                if (f.view(id).state !== state) await f.saved('transition', id, { state, correction: true, reason: 'Placed for this reading' }, {}, person);
                const reasons = f.view('TASK-WAITS')[reasonsKey];
                if (!reasons.length) met[kind].push(state);
                else assert.ok(reasons.every(reason => reason.includes(id) && (kind !== neverKind || reason.includes(wayOn))), `${kind} ${state}: ${reasons.join(' | ')}`);
            }
        }
        assert.deepEqual(met, { [metKind]: [metState], [neverKind]: [] });
        // The task still names the area: it cannot be made ready, and removing the link is the way on.
        await f.saved('transition', 'TASK-WAITS', { state: 'planned' });
        const ready = { state: 'ready', readiness: { reviewed: true, decisionsResolved: true } };
        refused(await f.perform('transition', 'TASK-WAITS', ready), 'NOT_READY');
        await f.saved('link', 'TASK-WAITS', { links: [] });
        await f.saved('transition', 'TASK-WAITS', ready);
        assert.deepEqual(f.progress().ready, ['TASK-WAITS']);
    }),
    test('TC-ARS-029', 'a correction of an initiative or an area needs its own flag and a reason and no decision, and places an initiative in exactly the statuses the manual lists only once its intent is captured', async f => {
        const [flag, decision, statusesSaid, code] = stated(manualSection(LIFECYCLE), /A correction of an initiative or an area needs `(--[a-z-]+)` and a `reason` and no `(--[a-z-]+)`; it places an initiative in (.*?) only when its intent is captured, as approval requires, and answers `([A-Z_]+)` otherwise/, 'what a correction of an initiative or an area needs');
        const transition = operationCatalogue({}).operations.find(operation => operation.name === 'transition');
        assert.deepEqual([flag, decision], [transition.cli.correctionFlag, transition.cli.decisionFlag]);
        // The correction authority alone, with no decision authority; capture always states an intent, so a record without one is adopted.
        const person = { canCorrectState: true, canDecide: false };
        const correct = (id, state, authority = person, reason = 'Recorded state was wrong') => f.perform('transition', id, { state, correction: true, ...(reason ? { reason } : {}) }, {}, authority);
        f.write('work/initiatives/unstated.md', '---\nid: INITIATIVE-UNSTATED\ntitle: Existing content\nstatus: draft\n---\nAuthored body.\n');
        await adopt(f, 'initiative', 'INITIATIVE-UNSTATED');
        const { states, initial } = lifecycleOf('initiative');
        const withheld = [];
        for (const state of states.filter(candidate => candidate !== initial)) {
            const stored = f.bytes('INITIATIVE-UNSTATED');
            const result = await correct('INITIATIVE-UNSTATED', state);
            if (result.primary.status === 'saved') { assert.equal((await correct('INITIATIVE-UNSTATED', initial)).primary.status, 'saved'); continue; }
            refused(result, code); withheld.push(state);
            assert.deepEqual(f.bytes('INITIATIVE-UNSTATED'), stored);
        }
        assert.deepEqual(withheld, words(statusesSaid));
        // With its intent captured the same corrections save, still with no decision authority.
        await f.saved('update', 'INITIATIVE-UNSTATED', { intent: 'Let an operator export a selected subset' });
        for (const state of withheld) assert.equal((await correct('INITIATIVE-UNSTATED', state)).primary.status, 'saved', state);
        // The decision authority does not stand in for the correction authority, and a correction with no reason is refused.
        refused(await correct('INITIATIVE-UNSTATED', initial, { canDecide: true }), 'NOT_PERMITTED');
        refused(await correct('INITIATIVE-UNSTATED', initial, person, null), 'INVALID_INPUT');
        // An area canceled by mistake is active again by a correction with a reason alone.
        await f.create('AREA-PLACE', 'area');
        await f.saved('transition', 'AREA-PLACE', { state: 'canceled', reason: 'Merged elsewhere' }, {}, { canDecide: false });
        refused(await correct('AREA-PLACE', 'active', person, null), 'INVALID_INPUT');
        assert.equal((await correct('AREA-PLACE', 'active')).primary.status, 'saved'); assert.equal(f.view('AREA-PLACE').state, 'active');
    }),
    test('TC-ARS-030', 'work is overdue once the date of the read, in the calendar the manual names, is later than its due date, in whatever time zone it is read, and a written report is written again when that mark changes', async f => {
        const section = manualSection('## Status and local workspace');
        const [calendar] = stated(section, /The due date has passed once the (\w+) date of the read is later than it/, 'which calendar decides that a due date has passed');
        stated(section, /a report written before a due date passed is written again at the next request after it, even when no record changed/, 'that an overdue mark renews a written report');
        const deadline = '2031-03-10';
        await f.create('TASK-DUE', 'task', { deadline });
        // The last moment of the due date and the first of the next day, in UTC. In a zone ahead of UTC the local date has
        // already moved on at the first moment; in a zone behind it has not moved yet at the second.
        const moments = [`${deadline}T23:59:59.999Z`, '2031-03-11T00:00:00.000Z'];
        const later = { UTC: moments.map(moment => moment.slice(0, 10) > deadline) }[calendar];
        assert.ok(later, `this case judges the calendar the manual names: ${calendar}`);
        assert.deepEqual(later, [false, true], 'not overdue on the due date itself');
        await inZones(['Pacific/Kiritimati', 'Pacific/Pago_Pago'], async zone => {
            const marks = [];
            for (const moment of moments) marks.push(await at(moment, () => f.view('TASK-DUE').overdue));
            assert.deepEqual(marks, later, zone);
        });
        // Nothing but the date changes between these requests: the report is kept while the mark stands and written again when it moves.
        const stored = f.storedState();
        const written = [];
        for (const moment of [moments[0], moments[0], moments[1], moments[1]]) written.push((await at(moment, () => reports.ensureReport(f.root))).status);
        assert.deepEqual(written, ['generated', 'current', 'generated', 'current']);
        assert.deepEqual(f.storedState(), stored);
    }),
    test('TC-ARS-031', 'a record in the earlier form that reaches a migrated project is flagged and never counted, leaves the read partial and every save refused until it is removed, and is then captured again, under the codes the manual gives', async f => {
        const section = manualSection('### Branches cut before the migration');
        const [flagged, coverage, refusal] = stated(section, /It is flagged `([A-Z_]+)` and never counted, the read is `(\w+)` with no percentage, and every save and preview refuses with `([A-Z_]+)` until the file is removed/, 'what an earlier-form record does to a migrated project');
        const [status, unadoptable] = stated(section, /such as an initiative at `(\w+)`, cannot be adopted \(`([A-Z_]+)`\) until that status is corrected in the file/, 'the untracked record no read flags');
        await f.create('TASK-HERE'); await f.accepted('TASK-HERE');
        const whole = () => { const reading = f.progress(); return [reading.coverage, reading.diagnostics, reading.metrics.total, reading.metrics.percentage]; };
        // A migrated project that reads whole and states a percentage.
        assert.deepEqual(whole(), ['complete', [], 1, 100]);
        // Two ways such a record arrives: a tracked record that still carries the earlier stamp, and a group in a location only the earlier vocabulary read.
        const stamped = f.bytes('TASK-HERE').toString().replace('id: "TASK-HERE"', 'id: "TASK-BRANCH"').replace(`"schemaVersion":${f.config.taskTracking.schemaVersion}`, `"schemaVersion":${EARLIER_VERSION}`);
        assert.ok(stamped.includes('id: "TASK-BRANCH"') && stamped.includes(`"schemaVersion":${EARLIER_VERSION}`));
        const arrivals = [['work/tasks/task-branch.md', stamped, 'TASK-BRANCH', 'task'],
            [`work/${EARLIER.folders.project}/group-branch.md`, `---\nid: GROUP-BRANCH\ntitle: A group from the branch\nintent: Where that work belonged\nstatus: draft\ntracking: {schemaVersion: ${EARLIER_VERSION}, revision: 1, kind: project, memberItemIds: [TASK-HERE]}\n---\n`, 'GROUP-BRANCH', 'area']];
        for (const [relative, text, id, kind] of arrivals) {
            const before = whole();
            assert.ok(before[0] === 'complete' && before[3] !== null, 'whole, with a percentage, before the record arrives');
            f.write(relative, text);
            const reading = f.progress();
            assert.deepEqual([reading.coverage, reading.diagnostics.map(finding => [finding.code, finding.path]), reading.metrics.total, reading.metrics.percentage], [coverage, [[flagged, relative]], before[2], null], relative);
            assert.equal(reading.items.some(item => item.id === id), false, 'never counted, never shown as work');
            const stored = f.storedState();
            for (const preview of [false, true]) {
                refused(await f.perform('update', 'TASK-HERE', { priority: 2 }, preview ? { preview: true } : {}), refusal);
                refused(await f.perform('create', 'TASK-NEW', { title: 'New work', intent: 'Captured meanwhile' }, { target: { kind: 'task', itemId: 'TASK-NEW' }, ...(preview ? { preview: true } : {}) }), refusal);
            }
            // It is not converted here either: the migration refuses and leaves it as it is.
            assert.equal((await f.migrate({ dryRun: true })).status, 'refused');
            assert.deepEqual(f.storedState(), stored);
            // Removed, the project reads whole again, and the work is captured again through the tracker in the current words.
            fs.rmSync(path.join(f.root, path.dirname(relative) === 'work/tasks' ? relative : path.dirname(relative)), { recursive: true });
            assert.deepEqual(whole(), before);
            await f.create(id, kind);
            assert.deepEqual([f.record(id).tracking.schemaVersion, f.view(id).state], [f.config.taskTracking.schemaVersion, lifecycleOf(kind).initial]);
        }
        // A record with no tracking block carries no mark: it raises no finding, and cannot be adopted while it holds a status its kind no longer has.
        const untracked = state => `---\nid: INITIATIVE-BRANCH\ntitle: A proposal from the branch\nintent: Why that work was proposed\nstatus: ${state}\n---\nAuthored body.\n`;
        assert.equal(lifecycleOf('initiative').states.includes(status), false, `${status} is a status an initiative no longer has`);
        f.write('work/initiatives/initiative-branch.md', untracked(status));
        const reading = f.progress();
        assert.deepEqual([reading.coverage, reading.diagnostics, f.view('INITIATIVE-BRANCH').state, f.view('INITIATIVE-BRANCH').legacy], ['complete', [], status, true]);
        refused(await f.perform('adopt', 'INITIATIVE-BRANCH', {}, { preview: true }), unadoptable);
        f.write('work/initiatives/initiative-branch.md', untracked(lifecycleOf('initiative').initial));
        await adopt(f, 'initiative', 'INITIATIVE-BRANCH');
        assert.equal(f.view('INITIATIVE-BRANCH').legacy, false);
    }),
    test('TC-ARS-032', 'every kind takes an area tag and every kind but the one the manual names takes an initiative tag', async f => {
        const [exception] = stated(manualSection('### Areas and tags'), /Any record may carry any number of areas, and any record but an (\w+) any number of initiatives/, 'which kind carries no initiative tag');
        await f.create('AREA-HOME', 'area'); await f.create('INITIATIVE-WHY', 'initiative');
        const withoutInitiative = [];
        for (const kind of KINDS) {
            const id = `TAGGED-${kind}`;
            await f.create(id, kind);
            await f.tag(id, { areaIds: ['AREA-HOME'] });
            const stored = f.bytes(id);
            const result = await f.perform('tag', id, { initiativeIds: ['INITIATIVE-WHY'] });
            if (result.primary.status === 'saved') { assert.deepEqual(f.view(id).links, [{ relation: 'area', itemId: 'AREA-HOME' }, { relation: 'initiative', itemId: 'INITIATIVE-WHY' }], kind); continue; }
            refused(result, 'INVALID_RELATIONSHIP'); withoutInitiative.push(kind);
            assert.deepEqual(f.bytes(id), stored, `${kind}: a refused tag changes nothing`);
        }
        assert.deepEqual(withoutInitiative, [exception]);
        // The other guides that say who may be tagged state the same exception.
        for (const guide of ['skills/task-track/references/engine-protocol.md', CONFIGURATION_GUIDE]) assert.match(read(guide), new RegExp(`any record but an ${exception} to (?:any number of )?initiatives`), guide);
    }),
    test('TC-ARS-033', 'the intent and the criteria of a record change in every status but the one the manual names, where the change is refused until the record is reopened', async f => {
        const [closed, code] = stated(manualSection(LIFECYCLE), /Changing the `intent` or the criteria of a record in `(\w+)` is refused with `([A-Z_]+)`/, 'when a change of intent or criteria is refused');
        await f.create('TASK-DELIVERED'); await f.accepted('TASK-DELIVERED');
        await f.create('INITIATIVE-CLOSED', 'initiative'); await f.committed('INITIATIVE-CLOSED');
        const changes = [{ intent: 'A changed outcome' }, { criteria: [{ id: 'changed', text: 'A changed criterion' }] }];
        // Still open, an initiative takes both changes.
        for (const patch of changes) await f.saved('update', 'INITIATIVE-CLOSED', patch);
        await f.saved('transition', 'INITIATIVE-CLOSED', { state: 'done', reason: 'Outcome reached' });
        const reopen = { 'TASK-DELIVERED': 'planned', 'INITIATIVE-CLOSED': 'committed' };
        for (const [id, state] of Object.entries(reopen)) {
            assert.equal(f.view(id).state, closed, id);
            const stored = f.bytes(id);
            for (const patch of changes) refused(await f.perform('update', id, patch), code);
            assert.deepEqual(f.bytes(id), stored);
            // Reopened as its own step, with a reason, the record takes the change.
            await f.saved('transition', id, { state, reason: 'The outcome is to change' });
            for (const patch of changes) await f.saved('update', id, patch);
        }
    })
] };
