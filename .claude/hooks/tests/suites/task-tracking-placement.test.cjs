'use strict';

/**
 * Placement: where a record belongs among the records a project already holds. The read ranks candidates for a record
 * that is described but not saved, or for one exact existing record, and it selects, tags and links nothing. These cases
 * protect what a reader relies on when they judge a candidate: why it is offered, what it already carries, and that the
 * read changed nothing.
 */

const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { trackingTest: test, withFixture } = require('../lib/task-tracking-fixture.cjs');
const technical = (id, intent, fn) => ({ name: `TECH-${id}: ${intent}`, TechnicalSpec: id, fn: () => withFixture(fn) });
const { readPlacement, wordsOf } = require('../../lib/task-tracking-placement.cjs');

const CLI_PATH = path.resolve(__dirname, '../../../skills/task-track/scripts/task-track.cjs');

const place = (f, query) => readPlacement(f.root, { schemaVersion: 1, ...query });
const ids = entries => entries.map(entry => entry.itemId);
const named = (id, title, intent, more = {}) => [id, { title, intent, ...more }];
async function capture(f, kind, records) { for (const [id, patch] of records) await f.create(id, kind, patch); }
function refusedWith(run, code) { assert.throws(run, error => error.code === code, code); }

// The shipped command exactly as typed, with one JSON query on stdin and the exit status it must end with.
function command(f, value, options = [], expectedExit = 0) {
    const child = spawnSync(process.execPath, [CLI_PATH, 'placement', '--root', f.root, ...options],
        { cwd: f.root, env: { ...process.env }, shell: false, input: JSON.stringify(value), encoding: 'utf8', timeout: 10000, maxBuffer: 2 * 1024 * 1024 });
    assert.equal(child.error, undefined, child.error?.message); assert.equal(child.status, expectedExit, child.stderr || child.stdout);
    assert.equal(child.stderr, ''); const lines = child.stdout.trim().split('\n'); assert.equal(lines.length, 1);
    return JSON.parse(lines[0]);
}

module.exports = { name: 'Task tracking placement integration', tests: [
    test('TC-TPT-327', 'a described record is offered the area whose own words match it, with the areas above it and the words that matched, and the read changes nothing', async f => {
        await capture(f, 'area', [
            named('AREA-PEOPLE', 'People', 'Everything about staff', { level: 'product' }),
            named('AREA-TIMEOFF', 'Time off', 'Absence and holidays', { level: 'module', areaIds: ['AREA-PEOPLE'] }),
            named('AREA-BALANCE', 'Leave balances and carry-over', 'Entitlement that expires or moves into next year', { level: 'feature', areaIds: ['AREA-TIMEOFF'] }),
            named('AREA-BILLING', 'Billing', 'Charging customers', { level: 'product' }),
            named('AREA-INVOICE', 'Invoices and credit notes', 'Documents sent to customers', { level: 'feature', areaIds: ['AREA-BILLING'] })]);
        const stored = f.storedState();
        const query = { kind: 'task', title: 'Leave balance is wrong after carry-over', intent: 'Correct the rounding of carried leave' };
        const read = place(f, query);
        assert.equal(read.coverage, 'complete');
        // The most specific area that shares the record's words leads, and it states the chain of areas above it.
        const [first] = read.areas.candidates;
        assert.deepEqual([first.itemId, first.level, ids(first.path), first.parentAreaIds, first.alreadyTagged], ['AREA-BALANCE', 'feature', ['AREA-PEOPLE', 'AREA-TIMEOFF'], ['AREA-TIMEOFF'], false]);
        for (const word of ['leave', 'balance', 'carry']) assert.ok(first.matched.includes(word), word);
        assert.ok(first.text > 0 && first.score === first.text && first.similarWork === 0, 'offered for its own words alone');
        // An area that shares none of the words is not offered, and the areas without a parent are listed for a reader who must choose by meaning.
        assert.ok(!ids(read.areas.candidates).includes('AREA-INVOICE'));
        assert.deepEqual(read.areas.roots.map(area => [area.itemId, area.level, area.childAreaCount]), [['AREA-BILLING', 'product', 1], ['AREA-PEOPLE', 'product', 1]]);
        // A record that is not saved has nothing placed yet; the same question gets the same answer.
        assert.deepEqual([read.subject.kind, read.subject.itemId, read.subject.placed], ['task', undefined, undefined]);
        const again = place(f, query);
        assert.deepEqual({ ...again, asOf: null }, { ...read, asOf: null });
        assert.match(read.authority, /never a selection, a tag or a link$/);
        assert.deepEqual(f.storedState(), stored);
    }),
    test('TC-TPT-328', 'similar work speaks for where it sits: an area and an initiative whose own words do not match are offered when the nearest record carries them, and so is its governing spec', async f => {
        await capture(f, 'area', [named('AREA-LEDGER', 'General ledger', 'Books of account', { level: 'module' }), named('AREA-ACCESS', 'Sign-in', 'Who may enter', { level: 'module' })]);
        await capture(f, 'initiative', [named('INIT-CLOSE', 'Faster month-end', 'Shorten the closing cycle')]);
        f.write('docs/contracts/ledger.md', '# Ledger contract\n');
        await capture(f, 'task', [
            named('TASK-FX', 'Currency conversion rounding on invoices', 'Converted totals must agree', { areaIds: ['AREA-LEDGER'], initiativeIds: ['INIT-CLOSE'] }),
            named('TASK-MAIL', 'Password reset email wording', 'Plain words for a reset', { areaIds: ['AREA-ACCESS'] })]);
        await f.saved('link', 'TASK-FX', { links: [{ relation: 'spec', path: 'docs/contracts/ledger.md' }] });
        const read = place(f, { kind: 'task', title: 'Currency conversion rounding differs on credit notes' });
        assert.deepEqual(ids(read.related.candidates), ['TASK-FX']);
        assert.deepEqual([read.related.candidates[0].areaIds, read.related.candidates[0].initiativeIds], [['AREA-LEDGER'], ['INIT-CLOSE']]);
        // Offered for the similar work alone: no word of its own matched, and the witness is named.
        const [area] = read.areas.candidates;
        assert.deepEqual([ids(read.areas.candidates), area.text, area.matched, area.similarWork, area.similarWorkIds], [['AREA-LEDGER'], 0, [], 1, ['TASK-FX']]);
        const [initiative] = read.initiatives.candidates;
        assert.deepEqual([ids(read.initiatives.candidates), initiative.similarWork, initiative.similarWorkIds, initiative.type], [['INIT-CLOSE'], 1, ['TASK-FX'], 'idea']);
        assert.deepEqual(read.specs.candidates, [{ path: 'docs/contracts/ledger.md', similarWork: 1, similarWorkIds: ['TASK-FX'] }]);
        // Work that shares no word says nothing: its area is not offered.
        assert.ok(!ids(read.areas.candidates).includes('AREA-ACCESS'));
    }),
    test('TC-TPT-329', 'an exact existing record is read with what it already carries: held tags are marked, a tag relation it lacks is named, it is never offered to itself, and the same title on the same kind is a possible duplicate', async f => {
        await capture(f, 'area', [named('AREA-STOCK', 'Warehouse', 'Goods on hand', { level: 'module' })]);
        await capture(f, 'task', [
            named('TASK-HELD', 'Cycle count variance report', 'Show differences found while counting', { areaIds: ['AREA-STOCK'] }),
            named('TASK-TWIN', 'Cycle count variance report', 'List the gaps per shelf', { areaIds: ['AREA-STOCK'] })]);
        await capture(f, 'initiative', [named('INIT-SAME', 'Cycle count variance report', 'Decide whether to build it')]);
        f.write('docs/contracts/stock.md', '# Stock contract\n');
        await f.saved('link', 'TASK-HELD', { links: [{ relation: 'spec', path: 'docs/contracts/stock.md' }] });
        const record = f.record('TASK-HELD');
        const read = place(f, { itemId: 'TASK-HELD' });
        assert.deepEqual([read.subject.itemId, read.subject.kind, read.subject.revision, read.subject.contentHash], ['TASK-HELD', 'task', record.revision, record.contentHash]);
        assert.deepEqual(read.subject.placed, { areaIds: ['AREA-STOCK'], initiativeIds: [], links: [{ relation: 'spec', path: 'docs/contracts/stock.md' }] });
        assert.deepEqual(read.subject.untagged, ['initiative']);
        assert.deepEqual(read.areas.candidates.map(area => [area.itemId, area.alreadyTagged]), [['AREA-STOCK', true]]);
        assert.ok(!ids(read.related.candidates).includes('TASK-HELD'), 'a record is not similar work to itself');
        const duplicates = Object.fromEntries(read.related.candidates.map(entry => [entry.itemId, entry.possibleDuplicate]));
        assert.deepEqual(duplicates, { 'TASK-TWIN': true, 'INIT-SAME': false });
        // Described without a kind, every record that carries the title may be the same work.
        const described = place(f, { title: 'Cycle count variance report' });
        assert.deepEqual(Object.fromEntries(described.related.candidates.map(entry => [entry.itemId, entry.possibleDuplicate])), { 'INIT-SAME': true, 'TASK-HELD': true, 'TASK-TWIN': true });
        // An identity no record carries is named, and nothing stands in for it.
        refusedWith(() => place(f, { itemId: 'TASK-UNKNOWN' }), 'NOT_FOUND');
    }),
    test('TC-TPT-330', 'work is never sent to a place that has ended: a canceled area and a retired initiative are not offered, and an area is offered no initiative', async f => {
        await capture(f, 'area', [named('AREA-LIVE', 'Supplier portal', 'Where vendors sign in', { level: 'module' }), named('AREA-GONE', 'Supplier legacy intake', 'The earlier form', { level: 'module' })]);
        await capture(f, 'initiative', [named('INIT-LIVE', 'Onboarding within one day', 'A vendor is ready fast'), named('INIT-GONE', 'Onboarding rework', 'An earlier attempt')]);
        await f.saved('transition', 'AREA-GONE', { state: 'canceled', reason: 'Merged into the portal' });
        await f.saved('retire', 'INIT-GONE', { reason: 'Superseded' });
        const read = place(f, { kind: 'task', title: 'Supplier onboarding checklist' });
        assert.deepEqual([ids(read.areas.candidates), ids(read.initiatives.candidates), ids(read.areas.roots)], [['AREA-LIVE'], ['INIT-LIVE'], ['AREA-LIVE']]);
        // An area sits under areas only.
        const area = place(f, { kind: 'area', title: 'Supplier onboarding' });
        assert.deepEqual([ids(area.areas.candidates), area.initiatives.candidates, area.initiatives.notApplicable], [['AREA-LIVE'], [], 'An area carries no initiative link']);
    }),
    test('TC-TPT-331', 'opening an area lists the areas directly under it, an identity that is not an area is named as not found, and a query is bounded and exact', async f => {
        await capture(f, 'area', [named('AREA-TOP', 'Operations', 'Running the business', { level: 'product' }),
            named('AREA-SECOND', 'Dispatch', 'Sending goods', { level: 'module', areaIds: ['AREA-TOP'] }), named('AREA-FIRST', 'Receiving', 'Taking goods in', { level: 'module', areaIds: ['AREA-TOP'] }),
            named('AREA-DEEP', 'Dock scheduling', 'Booking a bay', { level: 'feature', areaIds: ['AREA-FIRST'] }),
            named('AREA-CLOSED', 'Old yard', 'Closed last year', { level: 'module', areaIds: ['AREA-TOP'] })]);
        await capture(f, 'task', [named('TASK-ONE', 'Print a pallet label', 'A label per pallet')]);
        // An area that has ended is not listed under its parent: it takes no more work.
        await f.saved('transition', 'AREA-CLOSED', { state: 'canceled', reason: 'The yard was closed' });
        const read = place(f, { openAreaIds: ['AREA-TOP', 'TASK-ONE', 'AREA-MISSING'] });
        const [top, task, missing] = read.areas.opened;
        assert.deepEqual([top.status, top.total, top.omitted, top.children.map(child => [child.itemId, child.level, child.childAreaCount])], ['found', 2, 0, [['AREA-FIRST', 'module', 1], ['AREA-SECOND', 'module', 0]]]);
        assert.deepEqual([[task.itemId, task.status, task.children], [missing.itemId, missing.status, missing.children]], [['TASK-ONE', 'not-found', []], ['AREA-MISSING', 'not-found', []]]);
        // Nothing was described, so nothing is ranked.
        assert.deepEqual([read.areas.candidates, read.initiatives.candidates, read.related.candidates, read.specs.candidates], [[], [], [], []]);
        const many = Array.from({ length: 17 }, (_, position) => `AREA-${position}`);
        refusedWith(() => place(f, { openAreaIds: many }), 'LIMIT_EXCEEDED');
        for (const query of [{}, { title: '   ' }, { openAreaIds: ['AREA-TOP', 'AREA-TOP'] }, { openAreaIds: 'AREA-TOP' }, { itemId: 'not an identity' }, { title: 'Dock', kind: 'bug' },
            { title: 'Dock', scope: 'AREA-TOP' }, { title: 'x'.repeat(20001) }, { title: 7 }]) refusedWith(() => place(f, query), 'INVALID_INPUT');
        refusedWith(() => readPlacement(f.root, { schemaVersion: 2, title: 'Dock' }), 'UNSUPPORTED');
        refusedWith(() => readPlacement(f.root, { schemaVersion: 1, title: 'Dock' }, { scopeId: 'AREA-TOP' }), 'INVALID_INPUT');
    }),
    technical('tracking-placement/word-normalization', 'words are compared alike on both sides: case, a closing plural s and accents by form are folded, and numbers and very short words tell nothing apart', async () => {
        assert.deepEqual([...wordsOf('Balances, BALANCE and 2026 v2 of a Größe; ﬁnance class')].sort(), ['and', 'balance', 'class', 'finance', 'größe']);
        assert.deepEqual([...wordsOf('')], []);
    }),
    test('TC-TPT-333', 'the shipped command is a read: it answers one JSON query, refuses what it cannot read exactly with a failing status, takes no actor or permission option, and leaves every stored byte as it was', async f => {
        await capture(f, 'area', [named('AREA-FLEET', 'Fleet maintenance', 'Keeping vehicles on the road', { level: 'module' })]);
        const stored = f.storedState();
        const read = command(f, { schemaVersion: 1, kind: 'task', title: 'Fleet maintenance reminder' });
        assert.deepEqual([read.schemaVersion, read.coverage, ids(read.areas.candidates)], [1, 'complete', ['AREA-FLEET']]);
        assert.ok(!JSON.stringify(read).includes(f.root), 'a read names no machine path');
        for (const [value, code] of [[{ schemaVersion: 1 }, 'INVALID_INPUT'], [{ schemaVersion: 3, title: 'Fleet' }, 'UNSUPPORTED'], [{ schemaVersion: 1, itemId: 'TASK-UNKNOWN' }, 'NOT_FOUND'],
            [{ schemaVersion: 1, title: 'Fleet', areaIds: ['AREA-FLEET'] }, 'INVALID_INPUT']]) {
            assert.deepEqual([command(f, value, [], 1).status, command(f, value, [], 1).code], ['refused', code], JSON.stringify(value));
        }
        for (const option of [['--actor', 'owner'], ['--scope', 'AREA-FLEET'], ['--write'], ['--item', 'AREA-FLEET']]) {
            assert.deepEqual([command(f, { schemaVersion: 1, title: 'Fleet' }, option, 1).status, command(f, { schemaVersion: 1, title: 'Fleet' }, option, 1).code], ['refused', 'INVALID_INPUT'], option.join(' '));
        }
        assert.deepEqual(f.storedState(), stored);
    })
] };
