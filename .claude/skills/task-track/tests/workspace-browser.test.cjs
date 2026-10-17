#!/usr/bin/env node
'use strict';

const path = require('node:path');
const crypto = require('node:crypto');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const { ensureReport, inspectReport, reportPath } = require('../../../hooks/lib/task-tracking-report.cjs');
const { git, earlierProject } = require('../../../hooks/tests/lib/task-tracking-fixture.cjs');
const { journalPath } = require('../../../hooks/lib/task-tracking-vocabulary.cjs');
const { VIEWPORTS, browserRuntime, createEvidence, withWorkspace, waitForSignal } = require('./browser-support.cjs');

const MAIN_OWNER = 'WorkTracking/README.TaskTracking.md';
const SECOND_OWNER = 'WorkTracking/README.TaskTracking-Part2.md';
const VOCABULARY_OWNER = 'WorkTracking/README.TaskTracking-Part7.md';
const FORMS_OWNER = 'WorkTracking/README.TaskTracking-Part8.md';
const selectedPane = page => page.getByRole('region', { name: 'Selected work', exact: true });
// Standing conditions of the selected source sit in their own region above every view.
const sourceConditions = page => page.getByRole('region', { name: 'Source conditions', exact: true });
// The chips a list shows for records of the earlier-vocabulary fixture once it is read in the current terms: the kind of
// delivery work, and the type of each initiative, under the name the project gave the former finite-outcome purpose.
const EARLIER_LIST_CHIPS = ['Bet', 'Idea', 'Story', 'Subtask', 'Task'];
const EARLIER_REPORT_KINDS = ['Initiative', 'Story', 'Subtask', 'Task'];
// Display words no view may use for a current concept: the first vocabulary's, and the group terms of the earlier one.
// Identities and locations may keep them.
const RETIRED_DISPLAY_WORDS = /\b(?:PBIs?|Backlog|Epics?|Project groups?|Visions?|Programs?|Generic group|Ungrouped|Group purpose|Manage group)\b/;
// A member whose identity is an address with no place to break: the one who holds far more work than anyone else in the
// project built for layout at volume, and the member that project's workspace is launched as.
const HOLDER = 'alexandria.montgomeryfeatherstonehaugh@regionaloperations.example';
// The area at the top of that project's tree: a long title beside an identity that cannot break.
const VOLUME_TOP = 'AREA_customer_onboarding_and_renewals_delivery_root';
// A record written by hand at a location only the current vocabulary uses; beside earlier-vocabulary work it makes the project hold both.
const HAND_WRITTEN_AREA = 'work/areas/G.md';
const HAND_WRITTEN_BYTES = '---\nid: G\ntitle: Hand-written area\nintent: Keep an authored outcome\nstatus: active\n---\nAuthored body stays as written.\n';
// Two vocabularies at once, or a migration that stopped part-way: every view states that nothing is shown, and shows nothing.
function unreadableProject(caseId, variant, name, arrange, reason) {
    return { caseId, owner: VOCABULARY_OWNER, variant, name,
        setup: async f => { await earlierProject(f); arrange(f); },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            const stored = f.storedState();
            await open();
            await page.getByRole('heading', { name: 'Project progress', exact: true }).waitFor();
            const notice = sourceConditions(page);
            await notice.getByText('No work can be read from this project', { exact: true }).waitFor();
            assert.match((await notice.locator('.banner-body').innerText()).trim(), reason);
            assert.match(await page.locator('#source-context').innerText(), /Coverage: unavailable/);
            assert.equal(await page.getByRole('button', { name: 'Capture work', exact: true }).isDisabled(), true);
            assert.equal(await page.locator('.tab-count').count(), 0, 'No tab carries a count');
            await capture(variant, 'The named reason stands above a view that shows no work, count, percentage or report');
            for (const [view, title] of [['Work', 'Work'], ['My work', 'My work'], ['People', 'People'], ['Changes', 'Changes and sharing'], ['Report', 'Status report'], ['Overview', 'Project progress']]) {
                await page.getByRole('navigation').getByRole('button', { name: view, exact: true }).click();
                await page.getByRole('heading', { name: title, exact: true }).waitFor();
                const shown = await page.getByRole('main').innerText();
                assert.match(shown, /No work, count or report is shown while this source cannot be read\./);
                assert.equal(/\d+ (?:eligible|matching|open|records?)|\d%|PBI-\d|Responsible for/.test(shown), false, `${view} shows no count, percentage or work`);
                assert.equal(await page.locator('iframe.report-frame').count(), 0, `${view} shows no report`);
                await notice.getByText('No work can be read from this project', { exact: true }).waitFor();
            }
            // The source can still be changed from any view: on Changes the selector opens the panel, as the page holds no form of its own.
            await page.getByRole('navigation').getByRole('button', { name: 'Changes', exact: true }).click();
            await page.getByRole('heading', { name: 'Changes and sharing', exact: true }).waitFor();
            await page.locator('[data-opens="scope-ref"]').click();
            await page.getByRole('heading', { name: 'Source and scope', exact: true }).waitFor();
            assert.equal(await isFocused(page.getByLabel('Shared local Git ref (optional)', { exact: true })), true);
            assert.deepEqual(f.storedState(), stored);
            transitions('Open the project; visit every view; open the source panel from Changes');
        } };
}
async function selectWork(page, id, transitions) {
    await page.getByRole('navigation').getByRole('button', { name: 'Work', exact: true }).click();
    await page.getByRole('heading', { name: 'Work', exact: true }).waitFor();
    await page.getByRole('region', { name: 'Work list', exact: true }).getByRole('button', { name: new RegExp(`^${id}:`) }).click();
    await selectedPane(page).getByRole('heading', { name: new RegExp(`^${id}:`) }).waitFor();
    transitions(`Inspect ${id}`);
}
const isFocused = locator => locator.evaluate(node => node === document.activeElement);
async function saveReviewed(page, transitions) {
    await page.getByRole('button', { name: 'Preview change', exact: true }).click();
    await page.getByRole('heading', { name: 'Review this exact change', exact: true }).waitFor();
    assert.equal(await isFocused(page.getByRole('heading', { name: 'Review this exact change', exact: true })), true, 'A preview puts the reader on what it produced');
    transitions('Preview exact change');
    await page.getByRole('button', { name: 'Save reviewed change', exact: true }).click();
    await page.getByRole('heading', { name: 'Work', exact: true }).waitFor();
    await page.getByRole('status').getByText(/Saved .* in the local checkout/).waitFor();
    transitions('Save reviewed change');
}

// Each declaration carries its actual canonical owner/case and a bounded partial-case variant.
// GIVEN valid public-core work; WHEN real browser actions; THEN final canonical and visible outcomes.
const tests = [
    { caseId: 'TC-TPT-065', owner: "WorkTracking/README.TaskTracking-Part2.md", variant: 'shared-owner-comparison', name: 'Shared comparison labels pinned and current owners without changing acceptance or publishing',
        setup: async f => {
            f.write('src/export.js', 'export const version = 1;\n');
            await f.create(); await f.saved('link', 'TASK-101', { links: [{ relation: 'source', path: 'src/export.js' }] }); await f.accepted();
            git(f, ['init']); git(f, ['add', 'docs', 'work', 'src']); git(f, ['commit', '-m', 'Synthetic shared baseline']);
            f.sharedComparison = { ref: git(f, ['rev-parse', 'HEAD']), ownerPath: f.record('TASK-101').ownerPath, bytes: f.bytes('TASK-101'), item: f.view('TASK-101') };
            await f.saved('assign', 'TASK-101', { assigneeId: 'peer' });
        },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            const baseline = f.sharedComparison; const local = f.view('TASK-101'); const before = f.bytes('TASK-101');
            const assertPinnedSource = async () => {
                await page.getByRole('navigation').getByRole('button', { name: 'Overview', exact: true }).click();
                await page.getByRole('heading', { name: 'Project progress', exact: true }).waitFor();
                const summary = page.getByText('Scope and source identities', { exact: true }); await summary.click();
                const identity = JSON.parse(await summary.locator('..').locator('pre').innerText());
                assert.equal(identity.source.kind, 'shared'); assert.equal(identity.source.ref, baseline.ref);
                assert.equal(identity.source.oid, baseline.ref); assert.equal(identity.source.remoteFreshness, 'unknown');
                await page.getByRole('navigation').getByRole('button', { name: 'Changes', exact: true }).click();
                await page.getByRole('heading', { name: 'Changes and sharing', exact: true }).waitFor();
                assert.match(await page.locator('#source-context').innerText(), /Pinned local Git baseline/);
                assert.equal(await page.getByLabel('Shared local Git ref (optional)', { exact: true }).inputValue(), baseline.ref);
            };
            assert.deepEqual(local.acceptanceHistory, baseline.item.acceptanceHistory);
            assert.deepEqual(local.proofs, baseline.item.proofs);
            await open();
            await page.getByRole('navigation').getByRole('button', { name: 'Changes', exact: true }).click();
            await page.getByRole('heading', { name: 'Changes and sharing', exact: true }).waitFor();
            await page.getByLabel('Shared local Git ref (optional)', { exact: true }).fill(baseline.ref);
            await page.getByRole('button', { name: 'Inspect selected scope', exact: true }).click();
            await page.getByRole('status').getByText(/Project reread/).waitFor();
            await assertPinnedSource();
            assert.match(await page.locator('#actor-context').innerText(), /Read-only for this scope.*Remote freshness: unknown/);
            await capture('shared-baseline', 'Pinned shared source and unknown remote freshness are labelled without changing local work');
            const compare = async () => {
                await page.getByRole('button', { name: 'Compare with current checkout', exact: true }).click();
                const summary = page.getByText('TASK-101: owner difference', { exact: true }); await summary.waitFor(); await summary.click();
                const difference = JSON.parse(await summary.locator('..').locator('pre').innerText());
                assert.equal(difference.selected.assigneeId, 'owner'); assert.equal(difference.current.assigneeId, 'peer');
                assert.deepEqual(difference.selected.acceptanceHistory, baseline.item.acceptanceHistory);
                assert.deepEqual(difference.current.acceptanceHistory, baseline.item.acceptanceHistory);
                assert.deepEqual(difference.selected.proofs, baseline.item.proofs); assert.deepEqual(difference.current.proofs, baseline.item.proofs);
                await assertPinnedSource();
                assert.deepEqual(f.bytes('TASK-101'), before);
                return difference;
            };
            await compare();
            await capture('shared-owner-difference', 'Pinned owner and current proposal differ while proof and acceptance remain separate conserved facts');
            f.write('src/export.js', 'export const version = 2;\n');
            await page.getByRole('banner').getByRole('button', { name: 'Reread project', exact: true }).click();
            await page.getByRole('status').getByText(/Project reread/).waitFor();
            const stale = await compare();
            assert.equal(stale.selected.verification.status, 'current'); assert.equal(stale.current.verification.status, 'stale');
            assert.deepEqual(stale.current.history, local.history);
            await capture('shared-stale-proof', 'Current source edit makes local proof stale while the pinned shared proof and history remain intact');
            await page.getByRole('button', { name: 'Refresh offline report', exact: true }).click();
            await page.getByRole('status').getByText(/Offline report: generated/).waitFor();
            const artifact = inspectReport(f.root, reportPath({ ref: baseline.ref }));
            assert.equal(artifact.manifest.scope, `shared:${baseline.ref}`);
            assert.equal(artifact.manifest.fingerprint, f.progress({ ref: baseline.ref }).fingerprint);
            await page.getByLabel('Shared local Git ref (optional)', { exact: true }).fill('missing-shared-baseline');
            // Enter in the ref field inspects the selected scope, as its button does.
            await page.getByLabel('Shared local Git ref (optional)', { exact: true }).press('Enter');
            await page.getByRole('status').getByText(/The selected source is unavailable/).waitFor();
            assert.match(await page.locator('#source-context').innerText(), /Coverage: unavailable/);
            assert.deepEqual(f.bytes('TASK-101'), before);
            await capture('shared-unavailable', 'An unavailable selected ref stays unavailable and does not silently substitute the current checkout');
            await page.getByRole('button', { name: 'Inspect current checkout', exact: true }).click();
            await page.getByRole('status').getByText(/Project reread/).waitFor();
            assert.match(await page.locator('#source-context').innerText(), /Local working copy; proposals may be unshared/);
            assert.equal(f.view('TASK-101').assigneeId, 'peer'); assert.deepEqual(f.bytes('TASK-101'), before);
            assert.equal(git(f, ['show', `${baseline.ref}:${baseline.ownerPath}`]), baseline.bytes.toString('utf8').trim());
            await capture('shared-current-recovery', 'Only an explicit current-checkout selection recovers local proposal inspection; all canonical bytes remain unchanged');
            transitions('Inspect pinned source; compare local owner; reread after real source edit; refresh selected report; refuse missing ref; explicitly recover current checkout');
        } },
    { caseId: 'TC-TPT-092', owner: "WorkTracking/README.TaskTracking-Part2.md", variant: 'initial-session-recovery', name: 'Unavailable and unsupported initial sessions retain a real recovery path without exposing incomplete identity',
        expectedConsole: [/Failed to load resource.*503/], setup: async f => { await f.create(); },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            const before = f.bytes('TASK-101'); let requests = 0;
            await page.route('**/api/session', async route => {
                requests++;
                if (requests === 1) return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ reason: 'Temporary session read failure' }) });
                if (requests === 2) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ schemaVersion: 2, snapshot: {} }) });
                return route.continue();
            });
            await open();
            for (const state of ['session-unavailable', 'session-unsupported']) {
                await page.getByRole('heading', { name: 'Project could not be opened', exact: true }).waitFor();
                assert.equal(await page.getByRole('banner').getByRole('button', { name: 'Reread project', exact: true }).count(), 0);
                assert.equal(await page.getByRole('button', { name: 'Retry opening project', exact: true }).isEnabled(), true);
                assert.equal(new URL(page.url()).hash, ''); assert.deepEqual(f.bytes('TASK-101'), before);
                await capture(state, 'Opening failure retains a useful launch Retry and exposes no partially hydrated navigation');
                await page.getByRole('button', { name: 'Retry opening project', exact: true }).click();
                await page.locator('main[aria-busy="false"]').waitFor();
            }
            await page.getByRole('heading', { name: 'Project progress', exact: true }).waitFor();
            assert.equal(requests, 3);
            assert.equal(await page.locator('#root-context').innerText(), `Checkout: ${f.root}`);
            assert.match(await page.locator('#actor-context').innerText(), /Owner \(owner\)/);
            await page.getByRole('banner').getByRole('button', { name: 'Reread project', exact: true }).click();
            await page.getByRole('status').getByText(/Project reread/).waitFor();
            assert.equal(await isFocused(page.getByRole('banner').getByRole('button', { name: 'Reread project', exact: true })), true, 'A reread leaves the reader on the control that asked for it');
            assert.deepEqual(f.bytes('TASK-101'), before);
            await capture('session-recovered', 'Real session Retry establishes checkout and actor; subsequent inspection preserves canonical work');
            transitions('Retry failed session; reject unsupported session; Retry real session; Reread established project');
        } },
    { caseId: 'TC-TPT-051', owner: "WorkTracking/README.TaskTracking.md", variant: 'pending-read', name: 'Loading is observable until the real session read settles without writing',
        setup: async f => { await f.create(); },
        fn: async ({ fixture: f, page, open, capture }) => {
            const before = f.bytes('TASK-101');
            let release;
            const admitted = new Promise(resolve => { release = resolve; });
            // Transport latency can occur after the real server completes a read; no fabricated response or sleep.
            await page.route('**/api/session', async route => { const response = await route.fetch(); await admitted; await route.fulfill({ response }); });
            const opening = open();
            try {
                await page.getByRole('heading', { name: 'Opening project', exact: true }).waitFor();
                await page.getByRole('status').getByText(/Reading or saving this request/).waitFor();
                assert.equal(await page.getByRole('main').getAttribute('aria-busy'), 'true');
                assert.deepEqual(f.bytes('TASK-101'), before);
                await capture('loading', 'Pending selected-project read is visible without a success claim');
            } finally { release(); await opening; }
            await page.getByRole('heading', { name: 'Project progress', exact: true }).waitFor();
            assert.deepEqual(f.bytes('TASK-101'), before);
        } },
    { caseId: 'TC-TPT-052', owner: "WorkTracking/README.TaskTracking.md", variant: 'complete-empty', name: 'A complete empty project invites capture without claiming full delivery',
        setup: async () => {},
        fn: async ({ fixture: f, page, open, capture }) => {
            await open();
            assert.match(await page.getByRole('main').innerText(), /Unknown; no complete nonempty denominator/);
            await page.getByRole('button', { name: 'Inspect all work', exact: true }).click();
            await page.getByText('No work records were found in this complete inspection. Capture an initiative or task to begin.', { exact: true }).waitFor();
            assert.equal(await page.getByRole('button', { name: 'Capture work', exact: true }).isEnabled(), true);
            assert.equal(f.records().length, 0);
            await capture('empty', 'Complete empty scope offers authorized capture with no delivery percentage');
        } },
    { caseId: 'TC-TPT-054', owner: "WorkTracking/README.TaskTracking.md", variant: 'required-outcome', name: 'Invalid capture retains entered work and identifies the missing outcome',
        setup: async () => {},
        fn: async ({ fixture: f, page, open, capture }) => {
            await open();
            await page.getByRole('button', { name: 'Inspect all work', exact: true }).click();
            await page.getByRole('button', { name: 'Capture work', exact: true }).click();
            await page.getByLabel('Title', { exact: true }).fill('Retained unfinished initiative');
            await page.getByRole('button', { name: 'Preview change', exact: true }).click();
            assert.equal(await page.getByLabel('Intended outcome', { exact: true }).evaluate(control => control.validity.valueMissing), true);
            assert.equal(await page.getByLabel('Title', { exact: true }).inputValue(), 'Retained unfinished initiative');
            assert.equal(await page.getByRole('button', { name: 'Save reviewed change', exact: true }).count(), 0);
            assert.equal(f.records().length, 0);
            await capture('invalid-input', 'Native required-field feedback keeps the entered title and does not save');
        } },
    { caseId: 'TC-TPT-055', owner: "WorkTracking/README.TaskTracking.md", variant: 'native-unproved', name: 'An unproved native profile remains unavailable and preserves its source',
        setup: async f => {
            f.write('trackers/index.html', '<html><body>Native project-owned status</body></html>');
            f.config.taskTracking.profile = { kind: 'native', version: 1, registration: 'fixture-native', sources: ['trackers/index.html'] }; f.saveConfig();
        },
        fn: async ({ fixture: f, page, open, capture }) => {
            const native = fs.readFileSync(path.join(f.root, 'trackers/index.html'));
            await open({ item: 'TASK-101' });
            await page.getByRole('status').getByText(/Linked work is missing, ambiguous or unavailable/).waitFor();
            await page.getByText(/native tracking capability is unavailable/).waitFor();
            assert.equal(await page.getByRole('button', { name: 'Capture work', exact: true }).isDisabled(), true);
            assert.deepEqual(fs.readFileSync(path.join(f.root, 'trackers/index.html')), native);
            assert.equal(fs.existsSync(path.join(f.root, 'work')), false);
            await capture('native-unavailable', 'Native authority is preserved with visible unavailable capability and safe linked-work recovery');
        } },
    { caseId: 'TC-TPT-056', owner: "WorkTracking/README.TaskTracking.md", variant: 'malformed-owner', name: 'Partial inspection withholds writable controls and preserves unreadable source',
        setup: async f => {
            await f.create();
            // Deliberate imported corruption: a legacy/partial record can exist before this app opens.
            f.badOwner = path.join(path.dirname(f.view('TASK-101').ownerPath), 'partial-import.md');
            f.write(f.badOwner, '---\nid: incomplete-import\n');
        },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            const good = f.bytes('TASK-101'), bad = fs.readFileSync(path.join(f.root, f.badOwner));
            await open();
            assert.match(await page.locator('#source-context').innerText(), /Coverage: partial/);
            assert.match(await page.getByRole('main').innerText(), /Unknown; no complete nonempty denominator/);
            await selectWork(page, 'TASK-101', transitions);
            assert.equal(await page.getByRole('button', { name: 'Capture work', exact: true }).isDisabled(), true);
            assert.equal(await selectedPane(page).getByRole('button', { name: 'Refine work', exact: true }).count(), 0);
            assert.deepEqual(f.bytes('TASK-101'), good);
            assert.deepEqual(fs.readFileSync(path.join(f.root, f.badOwner)), bad);
            await capture('partial', 'Inspected work and incomplete-coverage reason remain visible while writes are withheld');
        } },
    { caseId: 'TC-TPT-092', owner: "WorkTracking/README.TaskTracking-Part2.md", variant: 'scope-and-links', name: 'Opening and deep links keep the selected project and write nothing',
        setup: async f => { await f.create(); },
        fn: async ({ fixture: f, page, open, capture }) => {
            const before = f.bytes('TASK-101');
            await open();
            await page.getByRole('heading', { name: 'Project progress' }).waitFor();
            assert.equal(new URL(page.url()).hash, '');
            assert.match(await page.locator('#root-context').innerText(), /Checkout:/);
            assert.match(await page.locator('#actor-context').innerText(), /owner/);
            assert.deepEqual(f.bytes('TASK-101'), before);
            await capture('overview', 'Selected checkout, actor, scope and honest progress are visible');
            await open({ item: 'TASK-101', owner: f.view('TASK-101').ownerPath });
            await selectedPane(page).getByRole('heading', { name: /^TASK-101:/ }).waitFor();
            assert.deepEqual(f.bytes('TASK-101'), before);
            await capture('linked-record', 'One exact selected record is opened without a write');
            await open({ item: 'TASK-missing', owner: f.view('TASK-101').ownerPath });
            await page.getByRole('status').getByText(/Linked work is missing, ambiguous or unavailable/).waitFor();
            assert.equal(await selectedPane(page).getByRole('heading', { name: 'Choose work to inspect' }).count(), 1);
            assert.deepEqual(f.bytes('TASK-101'), before);
            await capture('missing-link', 'Missing linked work has an explicit recovery path and no guessed owner');
        } },
    { caseId: 'TC-TPT-092', owner: "WorkTracking/README.TaskTracking-Part2.md", variant: 'session-reattach', name: 'A reload stays attached, and a page without a session can only ask for the same selected workspace to be opened again',
        reopenable: true, setup: async f => { await f.create(); },
        fn: async ({ fixture: f, workspace, page, open, capture, transitions, reopened }) => {
            const before = f.bytes('TASK-101');
            await open();
            await page.getByRole('heading', { name: 'Project progress', exact: true }).waitFor();
            // WHEN the attached page is reloaded THEN it is still attached and its address carries no credential.
            await page.reload();
            await page.getByRole('heading', { name: 'Project progress', exact: true }).waitFor();
            assert.equal(new URL(page.url()).hash, '');
            assert.match(await page.locator('#root-context').innerText(), /Checkout:/);
            transitions('Reload the attached workspace');
            await capture('reloaded-attached', 'The reloaded page is still attached to the selected checkout and actor');
            // GIVEN the address opened where no session is kept, as in another tab; THEN nothing of the work is shown.
            await page.evaluate(() => sessionStorage.clear());
            await page.goto('about:blank');
            await page.goto(`${workspace.origin}/`);
            await page.getByRole('heading', { name: 'Workspace session required', exact: true }).waitFor();
            assert.equal(await page.locator('#root-context').innerText(), 'No checkout established');
            assert.equal(await page.locator('#actor-context').innerText(), 'No actor established');
            const shown = await page.locator('body').innerText();
            assert.equal(shown.includes('TASK-101'), false); assert.equal(shown.includes(f.root), false);
            assert.equal(await page.getByRole('navigation').isVisible(), false);
            transitions('Open the workspace address without a session');
            await capture('session-required', 'A page without a session shows no work, names no checkout or actor, and offers to open this workspace');
            // WHEN the person asks for this workspace to be opened; THEN the machine is asked and the page gains nothing.
            await page.getByRole('button', { name: 'Open this workspace', exact: true }).click();
            await page.getByRole('status').getByText(/Asked the default browser to open this workspace in a new, attached tab/).waitFor();
            assert.equal(reopened.length, 1); assert.match(reopened[0], /^http:\/\/127\.0\.0\.1:\d+\/#attach=[A-Za-z0-9_-]{43}$/);
            assert.equal(reopened[0].includes(new URLSearchParams(new URL(workspace.url).hash.slice(1)).get('session')), false);
            assert.equal(await page.getByRole('heading', { name: 'Workspace session required', exact: true }).count(), 1);
            assert.equal(await page.evaluate(() => sessionStorage.length), 0);
            transitions('Ask for this workspace to be opened');
            await capture('reopen-requested', 'The launch outcome is stated; this page is still not attached');
            // WHEN the browser opens the launch link THEN that page attaches, once, and the link leaves the address.
            await page.goto('about:blank');
            await page.goto(reopened[0]);
            await page.getByRole('heading', { name: 'Project progress', exact: true }).waitFor();
            assert.equal(new URL(page.url()).hash, '');
            assert.match(await page.locator('#actor-context').innerText(), /owner/);
            transitions('Open the single-use launch link');
            await capture('reattached', 'The launch link attached this page to the same selected checkout');
            // The same link opened again attaches nothing. Its refusal is read on a second page, apart from the monitored one.
            const again = await page.context().newPage();
            try { await again.goto(reopened[0]); await again.getByText(/already been used or has expired/).waitFor();
                assert.equal(await again.locator('#root-context').innerText(), 'No checkout established'); }
            finally { await again.close(); }
            assert.deepEqual(f.bytes('TASK-101'), before);
        } },
    { caseId: 'TC-TPT-092', owner: "WorkTracking/README.TaskTracking-Part2.md", variant: 'readonly-session', name: 'A read-only launch permits inspection without granting canonical write authority',
        writable: false, setup: async f => { await f.create(); await f.accepted(); },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            // GIVEN complete accepted work; WHEN launched read-only; THEN inspection conserves all history and receipts.
            const before = f.bytes('TASK-101');
            await open();
            await page.getByRole('heading', { name: 'Project progress', exact: true }).waitFor();
            assert.match(await page.locator('#source-context').innerText(), /Coverage: complete/);
            assert.match(await page.locator('#actor-context').innerText(), /Owner \(owner\).*Read-only for this scope/);
            await selectWork(page, 'TASK-101', transitions);
            await selectedPane(page).getByText(/This session is read-only/).waitFor();
            assert.equal(await page.getByRole('button', { name: 'Capture work', exact: true }).isDisabled(), true);
            // Reading the exact linked concerns is the one working control a read-only selection keeps. The tag action is shown
            // unavailable beside the note that points to this reason; nothing that changes work can be used.
            assert.deepEqual(await selectedPane(page).getByRole('button').evaluateAll(nodes => nodes.map(node => [node.innerText.trim(), node.disabled])), [['Edit tags', true], ['Inspect concerns for TASK-101', false]]);
            assert.equal(await selectedPane(page).getByText('Accepted at a recorded decision', { exact: true }).isVisible(), true);
            assert.deepEqual(f.bytes('TASK-101'), before);
            await capture('readonly-inspection', 'Complete accepted work is inspectable; read-only authority disables capture and withholds every selected-record mutation');
            await page.getByRole('navigation').getByRole('button', { name: 'People', exact: true }).click();
            await page.getByRole('heading', { name: 'People', exact: true }).waitFor();
            await page.getByRole('navigation').getByRole('button', { name: 'Overview', exact: true }).click();
            await page.getByRole('heading', { name: 'Project progress', exact: true }).waitFor();
            await page.getByRole('banner').getByRole('button', { name: 'Reread project', exact: true }).click();
            await page.getByRole('status').getByText(/Project reread/).waitFor();
            assert.match(await page.locator('#actor-context').innerText(), /Read-only for this scope/);
            assert.deepEqual(f.bytes('TASK-101'), before);
            transitions('Inspect People; return Overview; reread in the same read-only session');
        } },
    { caseId: 'TC-TPT-092', owner: "WorkTracking/README.TaskTracking-Part2.md", variant: 'duplicate-identity', name: 'Duplicate deep links refuse silent selection while exact owners remain safely inspectable',
        setup: async f => {
            await f.create();
            f.originalOwner = f.view('TASK-101').ownerPath;
            f.duplicateOwner = path.posix.join(path.posix.dirname(f.originalOwner), 'imported-duplicate.md');
            // A legacy import or teammate merge can leave a second valid canonical file with the same identity.
            f.write(f.duplicateOwner, f.bytes('TASK-101'));
        },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            // GIVEN duplicate owners; WHEN linked by ID or owner; THEN neither silently selects and both retain exact bytes.
            const owners = [f.originalOwner, f.duplicateOwner];
            const before = owners.map(owner => fs.readFileSync(path.join(f.root, owner)));
            for (const [index, fragment] of [{ item: 'TASK-101' }, { item: 'TASK-101', owner: f.originalOwner }].entries()) {
                await open(fragment);
                await page.getByRole('status').getByText(/Linked work is missing, ambiguous or unavailable/).waitFor();
                await selectedPane(page).getByRole('heading', { name: 'Choose work to inspect', exact: true }).waitFor();
                assert.equal(new URL(page.url()).hash, '');
                assert.equal(await selectedPane(page).getByRole('heading', { name: /^TASK-101:/ }).count(), 0);
                assert.equal(await page.getByRole('button', { name: 'Capture work', exact: true }).isDisabled(), true);
                for (const [ownerIndex, owner] of owners.entries()) assert.deepEqual(fs.readFileSync(path.join(f.root, owner)), before[ownerIndex]);
                await capture(index ? 'duplicate-owner-link' : 'duplicate-id-link', 'Ambiguous identity is refused even with an exact owner path; no record is silently selected');
            }
            for (const owner of owners) {
                await page.getByRole('region', { name: 'Work list', exact: true }).getByRole('button', { name: /^TASK-101:/ })
                    .filter({ hasText: `Ambiguous identity; owner: ${owner}` }).click();
                await selectedPane(page).getByRole('heading', { name: /^TASK-101:/ }).waitFor();
                await selectedPane(page).getByText(owner, { exact: true }).waitFor();
                await selectedPane(page).getByText(/Work cannot be changed while inspection is incomplete/).waitFor();
                // The tag action is shown unavailable; no other control is drawn, so nothing can change either owner.
                assert.deepEqual(await selectedPane(page).getByRole('button').evaluateAll(nodes => nodes.map(node => [node.innerText.trim(), node.disabled])), [['Edit tags', true]]);
                transitions(`Explicitly inspect duplicate owner ${owner}`);
            }
            await capture('duplicate-owner-inspection', 'Explicitly chosen owner is labelled and inspectable, with mutation controls withheld');
            await page.getByRole('navigation').getByRole('button', { name: 'Overview', exact: true }).click();
            await page.getByRole('heading', { name: 'Project progress', exact: true }).waitFor();
            assert.match(await page.locator('#source-context').innerText(), /Coverage: partial/);
            assert.match(await page.getByRole('main').innerText(), /Unknown; no complete nonempty denominator/);
            for (const [ownerIndex, owner] of owners.entries()) assert.deepEqual(fs.readFileSync(path.join(f.root, owner)), before[ownerIndex]);
            await capture('duplicate-overview-recovery', 'Overview recovery discloses partial coverage without granting delivery or altering either canonical owner');
            transitions('Return to Overview after explicit duplicate inspection');
        } },
    { caseId: 'TC-TPT-093', owner: "WorkTracking/README.TaskTracking-Part2.md", variant: 'capture-edit', name: 'UI capture and refinement save through the same canonical operations',
        setup: async () => {},
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            await open();
            await page.getByRole('button', { name: 'Inspect all work' }).click();
            await page.getByRole('button', { name: 'Capture work', exact: true }).click();
            await page.getByRole('main').getByRole('combobox', { name: 'Work kind', exact: true }).selectOption('task');
            await page.getByLabel('Title', { exact: true }).fill('Export filtered rows');
            await page.getByLabel('Intended outcome', { exact: true }).fill('People export only rows they select');
            await page.getByRole('button', { name: 'Add criterion', exact: true }).click();
            await page.getByLabel('Stable criterion ID', { exact: true }).fill('selected-rows');
            await page.getByLabel('Observable outcome', { exact: true }).fill('Export contains only selected rows');
            await saveReviewed(page, transitions);
            const created = f.records().map(record => f.view(record.id));
            assert.equal(created.length, 1);
            const id = created[0].id;
            assert.equal(created[0].title, 'Export filtered rows');
            assert.equal(created[0].state, 'draft');
            assert.equal(created[0].assigneeId, null);
            assert.equal(created[0].acceptanceHistory.length, 0);
            assert.deepEqual(created[0].criteria, [{ id: 'selected-rows', text: 'Export contains only selected rows' }]);
            await capture('created-draft', 'Saved draft is selected with no implied assignment or acceptance');
            await selectedPane(page).getByRole('button', { name: 'Refine work', exact: true }).click();
            await page.getByLabel('Title', { exact: true }).fill('Export selected filtered rows');
            await saveReviewed(page, transitions);
            assert.equal(f.view(id).title, 'Export selected filtered rows');
            assert.deepEqual(f.view(id).criteria, created[0].criteria);
            assert.equal(f.view(id).state, 'draft');
            assert.equal(f.view(id).revision, created[0].revision + 1);
            await capture('refined-draft', 'Exact title refinement preserves criteria and draft state');
        } },
    { caseId: 'TC-TPT-094', owner: "WorkTracking/README.TaskTracking-Part2.md", variant: 'people-and-start', name: 'Assignment to others and self preserves state until explicit Start',
        setup: async f => { await f.create(); await f.ready(); },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            await open(); await selectWork(page, 'TASK-101', transitions);
            for (const owner of ['peer', 'owner']) {
                await selectedPane(page).getByRole('button', { name: 'Assign', exact: true }).click();
                assert.deepEqual(await page.getByLabel('Responsible member').locator('option').evaluateAll(options => options.map(option => option.value)), ['', 'owner', 'peer']);
                await page.getByLabel('Responsible member').selectOption(owner);
                await saveReviewed(page, transitions);
                assert.equal(f.view('TASK-101').assigneeId, owner);
                assert.equal(f.view('TASK-101').state, 'ready');
                assert.equal(f.view('TASK-101').acceptanceHistory.length, 0);
            }
            await page.getByRole('navigation').getByRole('button', { name: 'People', exact: true }).click();
            await page.getByRole('button', { name: 'See this work: Owner (owner) — Active; 1 owned records', exact: true }).waitFor();
            await capture('people', 'Responsibility shows one owned record without a performance score');
            await page.getByRole('button', { name: 'See this work: Owner (owner) — Active; 1 owned records', exact: true }).click();
            await selectWork(page, 'TASK-101', transitions);
            await selectedPane(page).getByRole('button', { name: 'Start work', exact: true }).click();
            await saveReviewed(page, transitions);
            assert.equal(f.view('TASK-101').state, 'in_progress');
            assert.equal(f.view('TASK-101').assigneeId, 'owner');
            assert.equal(f.view('TASK-101').acceptanceHistory.length, 0);
            await capture('started', 'Only explicit reviewed Start moves Ready work to In progress');
        } },
    { caseId: 'TC-TPT-038', owner: "WorkTracking/README.TaskTracking.md", variant: 'reopen-in-progress', name: 'Reopen accepted work uses the portable active state and fresh readiness decisions',
        setup: async f => { await f.create(); await f.accepted(); },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            const history = structuredClone(f.view('TASK-101').acceptanceHistory);
            await open(); await selectWork(page, 'TASK-101', transitions);
            await selectedPane(page).getByRole('button', { name: 'Reopen in progress', exact: true }).click();
            await page.getByLabel('I reviewed the current scope and acceptance criteria', { exact: true }).check();
            await page.getByLabel('I confirmed required decisions are resolved', { exact: true }).check();
            await page.getByLabel('Reason for this change', { exact: true }).fill('Reopen for an explicit follow-up outcome');
            await saveReviewed(page, transitions);
            assert.equal(f.view('TASK-101').state, 'in_progress');
            assert.deepEqual(f.view('TASK-101').acceptanceHistory.slice(0, history.length), history);
            assert.equal(f.view('TASK-101').acceptance.accepted, false);
            await capture('reopened', 'In progress is visible; historical acceptance is retained and current credit withdrawn');
        } },
    { caseId: 'TECH-link-owner', owner: '.claude/skills/task-track/assets/app.js#linksEditor', variant: 'preserve-explicit-target', name: 'Every link role that is not a tag retains its exact identity and only explicit owner switching replaces fields',
        setup: async f => {
            await f.create('TASK-101'); await f.create('TASK-102');
            f.write('src/export.js', 'module.exports = "selected rows";\n');
            // Every link role may name any tracked work. A tag is not a link role: it is written by its own operation.
            await f.saved('link', 'TASK-101', { links: [['dependency', 'TASK-102'], ['parent', 'TASK-102'], ['spec', 'TASK-102'], ['plan', 'TASK-102'], ['source', 'TASK-102']]
                .map(([relation, itemId]) => ({ relation, itemId })) });
        },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            const original = structuredClone(f.view('TASK-101').links); const sourceAt = original.findIndex(link => link.relation === 'source');
            assert.deepEqual(original.map(link => link.relation).sort(), ['dependency', 'parent', 'plan', 'source', 'spec']);
            await open(); await selectWork(page, 'TASK-101', transitions);
            await selectedPane(page).getByRole('button', { name: 'Edit links', exact: true }).click();
            // Source-owned stable IDs disambiguate repeated relationship controls; no styling selectors.
            for (let index = 0; index < original.length; index++) {
                if (['spec', 'plan', 'source'].includes(original[index].relation)) assert.equal(await page.locator(`#link-owner-${index}`).inputValue(), 'itemId');
                assert.equal(await page.locator(`#link-${index}`).inputValue(), original[index].itemId);
            }
            await capture('exact-item-links', 'All five link roles retain their tracked item target');
            await saveReviewed(page, transitions);
            assert.deepEqual(f.view('TASK-101').links, original);
            await selectedPane(page).getByRole('button', { name: 'Edit links', exact: true }).click();
            await page.locator(`#link-owner-${sourceAt}`).selectOption('path');
            await page.getByLabel('Public project-relative path', { exact: true }).fill('src/export.js');
            await saveReviewed(page, transitions);
            const switched = f.view('TASK-101').links;
            assert.deepEqual(switched.filter((link, index) => index !== sourceAt), original.filter((link, index) => index !== sourceAt));
            assert.deepEqual(switched[sourceAt], { relation: 'source', path: 'src/export.js' });
            assert.equal(Object.hasOwn(switched[sourceAt], 'itemId'), false);
            await capture('explicit-path-switch', 'Only the explicitly selected source target is now a public file');
        } },
    { caseId: 'TC-TPT-057', owner: "WorkTracking/README.TaskTracking.md", variant: 'teammate-save', name: 'Conflicts retain the draft until the actor reviews the newer owner',
        expectedConsole: [/Failed to load resource: the server responded with a status of 409/],
        setup: async f => { await f.create(); },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            await open(); await selectWork(page, 'TASK-101', transitions);
            await selectedPane(page).getByRole('button', { name: 'Refine work', exact: true }).click();
            await page.getByLabel('Title', { exact: true }).fill('My retained draft');
            await page.getByRole('navigation').getByRole('button', { name: 'People', exact: true }).click();
            await page.getByRole('dialog', { name: 'Keep your draft?' }).waitFor();
            await capture('draft-checkpoint', 'Leaving an edited draft asks how to retain it');
            await page.getByRole('button', { name: 'Return to draft', exact: true }).click();
            assert.equal(await page.getByLabel('Title', { exact: true }).inputValue(), 'My retained draft');
            await f.saved('update', 'TASK-101', { title: 'Teammate saved title' });
            const current = f.bytes('TASK-101');
            await page.getByRole('button', { name: 'Preview change', exact: true }).click();
            await page.getByRole('region', { name: 'Conflict recovery' }).waitFor();
            assert.equal(await page.getByLabel('Title', { exact: true }).inputValue(), 'My retained draft');
            assert.deepEqual(f.bytes('TASK-101'), current);
            await capture('conflict', 'Stale preview preserves both the entered draft and teammate save');
            await page.getByRole('button', { name: 'Read current owner', exact: true }).click();
            await page.getByText('Current record read separately', { exact: true }).waitFor();
            assert.deepEqual(f.bytes('TASK-101'), current);
            await page.getByLabel('I reviewed the current record against my retained draft', { exact: true }).check();
            await page.getByRole('button', { name: 'Use reviewed current revision', exact: true }).click();
            await saveReviewed(page, transitions);
            assert.equal(f.view('TASK-101').title, 'My retained draft');
            assert.equal(f.view('TASK-101').state, 'draft');
            await capture('conflict-recovered', 'An explicitly reviewed fresh intent saves the retained draft');
        } },
    { caseId: 'TC-TPT-092', owner: "WorkTracking/README.TaskTracking-Part2.md", variant: 'lost-save-result', name: 'A lost successful response retries its exact operation without duplicate revision or history',
        expectedConsole: [/Failed to load resource: net::ERR_FAILED/],
        setup: async f => { await f.create(); },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            await open(); await selectWork(page, 'TASK-101', transitions);
            await selectedPane(page).getByRole('button', { name: 'Refine work', exact: true }).click();
            await page.getByLabel('Title', { exact: true }).fill('Saved despite lost response');
            await page.getByRole('button', { name: 'Preview change', exact: true }).click();
            await page.getByRole('button', { name: 'Save reviewed change', exact: true }).waitFor();
            const original = f.view('TASK-101');
            const saves = [];
            let releaseSave, observeSave;
            const saveGate = new Promise(resolve => { releaseSave = resolve; });
            const saveObserved = new Promise(resolve => { observeSave = resolve; });
            // Real response loss: let the real server/core save, then discard only its transport result.
            await page.route('**/api/operation', async route => {
                const request = route.request().postDataJSON();
                if (request.preview) return route.continue();
                saves.push(request);
                if (saves.length === 1) { const response = await route.fetch(); assert.equal(response.status(), 200); observeSave(); await saveGate; await route.abort('failed'); }
                else await route.continue();
            });
            await page.getByRole('button', { name: 'Save reviewed change', exact: true }).click();
            try {
                await waitForSignal(saveObserved, 'the real admitted save response');
                await page.getByRole('status').getByText(/Reading or saving this request/).waitFor();
                assert.equal(await page.getByRole('button', { name: 'Save reviewed change', exact: true }).isDisabled(), true);
                assert.equal(await page.getByRole('status').getByText(/Saved .* in the local checkout/).count(), 0);
                await capture('saving', 'Pending save response disables repeat submission and makes no confirmed success claim');
            } finally { releaseSave(); }
            await page.getByRole('button', { name: 'Retry original save', exact: true }).waitFor();
            const saved = f.bytes('TASK-101');
            assert.equal(f.view('TASK-101').title, 'Saved despite lost response');
            assert.equal(f.view('TASK-101').revision, original.revision + 1);
            await capture('unknown-save', 'Unconfirmed transport retains the original request and offers its exact retry');
            await page.getByRole('button', { name: 'Read current without resaving', exact: true }).click();
            await page.getByText('Current record read separately', { exact: true }).waitFor();
            assert.equal(saves.length, 1);
            assert.deepEqual(f.bytes('TASK-101'), saved);
            await page.getByRole('button', { name: 'Retry original save', exact: true }).click();
            await page.getByRole('status').getByText(/original receipt replayed/).waitFor();
            assert.equal(saves.length, 2);
            assert.deepEqual(saves[1], saves[0]);
            assert.deepEqual(f.bytes('TASK-101'), saved);
            await capture('receipt-replayed', 'Original receipt replay confirms one save without growing history or revision');
            transitions('Lose save result; read separately; retry original identity');
        } },
    { caseId: 'TC-TPT-049', owner: "WorkTracking/README.TaskTracking.md", variant: 'ten-outcomes-filter-print', name: 'Filters and print preserve four accepted out of ten with three currently verified',
        setup: async f => {
            for (let index = 101; index <= 110; index++) { await f.create(`TASK-${index}`, 'task', { title: `Export outcome ${index}` }); if (index <= 104) await f.accepted(`TASK-${index}`); }
            f.write('src/export.js', 'module.exports = "new scoped source";\n');
            await f.saved('link', 'TASK-101', { links: [{ relation: 'source', path: 'src/export.js' }] });
        },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            const before = f.records().map(record => [record.id, f.bytes(record.id)]);
            await open();
            assert.match(await page.getByRole('main').innerText(), /10 eligible unique tasks/);
            assert.match(await page.getByRole('main').innerText(), /4 historical scoped acceptance/);
            assert.match(await page.getByRole('main').innerText(), /3 accepted tasks with proof that still applies/);
            assert.match(await page.getByRole('main').innerText(), /40\.0%/);
            // The drawn summaries restate the same counted facts; none may add or drop a record.
            assert.equal(await page.getByRole('img', { name: '10 tasks, one block each: 3 accepted with current proof; 1 accepted, proof not current; 6 not accepted yet', exact: true }).count(), 1);
            assert.equal(await page.getByRole('button', { name: 'Draft: 6 records. Show them in Work.', exact: true }).count(), 1);
            assert.equal(await page.getByRole('button', { name: 'Done: 4 records. Show them in Work.', exact: true }).count(), 1);
            const waiting = page.getByRole('region', { name: 'Waiting on a person', exact: true });
            assert.equal(await waiting.getByText('Accepted, proof not current', { exact: true }).count(), 1);
            assert.equal(await waiting.getByRole('button', { name: /^Open TASK-/ }).count(), 1);
            assert.equal(await waiting.getByRole('button', { name: /^Open TASK-101:/ }).count(), 1);
            await capture('honest-progress', 'Four of ten accepted, three currently verified and six remaining are separate facts');
            await page.getByRole('button', { name: 'Inspect remaining work', exact: true }).click();
            await page.getByText('6 matching records; progress scope remains the project.', { exact: true }).waitFor();
            await page.getByLabel('Find work', { exact: true }).fill('No matching outcome');
            await page.getByText('No work matches these filters. Clear filters to return to the list.', { exact: true }).waitFor();
            // The count is a status of its own, and typing in a filter keeps the reader in that filter.
            assert.equal(await page.getByRole('status').getByText('0 matching records; progress scope remains the project.', { exact: true }).count(), 1);
            assert.equal(await isFocused(page.getByLabel('Find work', { exact: true })), true);
            await capture('filter-empty', 'No matching work has clear recovery and does not redefine project progress');
            await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
            await page.getByText('10 matching records; progress scope remains the project.', { exact: true }).waitFor();
            assert.equal(await isFocused(page.getByRole('button', { name: 'Clear filters', exact: true })), true, 'Clearing filters redraws the view and keeps the reader on the control');
            await page.getByRole('navigation').getByRole('button', { name: 'Overview', exact: true }).click();
            await page.emulateMedia({ media: 'print' });
            assert.match(await page.getByRole('main').innerText(), /40\.0%/);
            assert.match(await page.getByRole('main').innerText(), /3 accepted tasks with proof that still applies/);
            await capture('print-progress', 'Print preserves labelled source, denominator, acceptance and current proof');
            await page.emulateMedia({ media: 'screen' });
            for (const [id, bytes] of before) assert.deepEqual(f.bytes(id), bytes);
            transitions('Inspect remaining; search to empty; clear filters; return Overview; print');
        } },
    { caseId: 'TC-TPT-079', owner: "WorkTracking/README.TaskTracking-Part2.md", variant: 'board-grouping', name: 'Board grouping shows the same filtered records by recorded state and leaves work and the delivery scope unchanged',
        setup: async f => {
            await f.create();
            await f.create('TASK-102', 'task', { title: 'Blocked outcome' }); await f.active('TASK-102');
            await f.saved('transition', 'TASK-102', { state: 'blocked', reason: 'Awaiting a sample file' });
            await f.create('TASK-103', 'task', { title: 'Accepted outcome' }); await f.accepted('TASK-103');
            await f.create('TASK-104', 'task', { title: 'Canceled outcome' }); await f.saved('transition', 'TASK-104', { state: 'canceled', reason: 'Outside this release' });
        },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            // GIVEN draft, blocked, accepted and canceled work; WHEN the reader regroups, opens and filters it; THEN lanes follow recorded state and no canonical byte or scope count changes.
            const before = f.records().map(record => [record.id, f.bytes(record.id)]);
            const workList = page.getByRole('region', { name: 'Work list', exact: true });
            const lane = name => workList.getByRole('list', { name, exact: true });
            const layout = name => page.getByRole('group', { name: 'Work layout', exact: true }).getByRole('button', { name, exact: true });
            await open();
            const denominator = (await page.getByRole('main').innerText()).match(/\d+ eligible unique tasks; \d+ canceled and \d+ retired excluded/)[0];
            assert.equal(denominator, '3 eligible unique tasks; 1 canceled and 0 retired excluded');
            await page.getByRole('navigation').getByRole('button', { name: 'Work', exact: true }).click();
            await page.getByText('4 matching records; progress scope remains the project.', { exact: true }).waitFor();
            await layout('Board').click();
            await lane('Draft: 1 records').getByRole('button', { name: /^TASK-101:/ }).waitFor();
            assert.equal(await lane('In progress: 1 records').getByRole('button', { name: /^TASK-102:/ }).filter({ hasText: 'Blocked' }).count(), 1);
            assert.equal(await lane('Done: 1 records').getByRole('button', { name: /^TASK-103:/ }).count(), 1);
            assert.equal(await lane('Off the line: 1 records').getByRole('button', { name: /^TASK-104:/ }).count(), 1);
            for (const empty of ['Planned', 'Ready', 'Verifying']) assert.equal(await lane(`${empty}: 0 records`).getByRole('button').count(), 0);
            assert.equal(await workList.getByRole('button', { name: /^TASK-10[1-4]:/ }).count(), 4);
            assert.equal(await page.getByText('4 matching records; progress scope remains the project.', { exact: true }).count(), 1);
            assert.equal(await page.locator('[draggable="true"]').count(), 0);
            await capture('board-grouped', 'The same four records are grouped by recorded state; blocked work waits in In progress and canceled work is off the line');
            await lane('In progress: 1 records').getByRole('button', { name: /^TASK-102:/ }).click();
            await selectedPane(page).getByRole('heading', { name: /^TASK-102:/ }).waitFor();
            await selectedPane(page).getByText(/Blocked: Awaiting a sample file/).waitFor();
            await capture('board-record', 'A board card opens the same record sheet with its blocker and lifecycle actions');
            await page.getByLabel('Find work', { exact: true }).fill('Accepted outcome');
            await page.getByText('1 matching records; progress scope remains the project.', { exact: true }).waitFor();
            assert.equal(await lane('Done: 1 records').getByRole('button', { name: /^TASK-103:/ }).count(), 1);
            assert.equal(await lane('Draft: 0 records').getByRole('button').count(), 0);
            await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
            await layout('List').click();
            assert.equal(await workList.getByRole('button', { name: /^TASK-10[1-4]:/ }).count(), 4);
            assert.equal(await workList.getByRole('list', { name: /records$/ }).count(), 0);
            await page.getByRole('navigation').getByRole('button', { name: 'Overview', exact: true }).click();
            await page.getByRole('heading', { name: 'Project progress', exact: true }).waitFor();
            assert.ok((await page.getByRole('main').innerText()).includes(denominator));
            for (const [id, bytes] of before) assert.deepEqual(f.bytes(id), bytes);
            transitions('Switch to board; open a card; filter; clear; return to list and Overview');
        } },
    { caseId: 'TC-TPT-062', owner: "WorkTracking/README.TaskTracking-Part2.md", variant: 'offline-empty-and-limited', name: 'Offline empty scope offers capture recovery while partial and unavailable scopes retain truthful limits',
        setup: async () => {},
        fn: async ({ fixture: f, page, capture, transitions }) => {
            const report = await ensureReport(f.root);
            await page.goto(pathToFileURL(path.join(f.root, report.path)).href);
            await page.locator('html.enhanced').waitFor();
            await page.getByText('No tracked work yet', { exact: true }).waitFor();
            assert.equal(await page.locator('#detail-empty').isVisible(), false);
            assert.equal(await page.locator('.people').isVisible(), false);
            assert.equal(await page.getByRole('button', { name: 'Inspect remaining work', exact: true }).isVisible(), false);
            for (const selector of ['#work-search', '#work-owner', '#work-state', '#work-remaining']) {
                assert.equal(await page.locator(selector).count(), 1);
                assert.equal(await page.locator(selector).isVisible(), false);
            }
            // The source strip sets each label above its value, so the two facts are matched across the line break and whatever case the label is drawn in.
            assert.match(await page.getByRole('region', { name: 'Snapshot source', exact: true }).innerText(), /coverage\s+complete, 0 records inspected.*shared freshness\s+unknown/si);
            assert.match(await page.getByRole('region', { name: 'Delivery scope', exact: true }).innerText(), /no percentage applies/);
            assert.equal(f.records().length, 0);
            await capture('offline-empty', 'Complete-empty scope offers truthful capture/regenerate recovery without nonexistent item choices');
            f.write('work/tasks/broken.md', 'external malformed record');
            const partial = await ensureReport(f.root); assert.equal(partial.coverage, 'partial');
            await page.goto(pathToFileURL(path.join(f.root, partial.path)).href);
            await page.locator('html.enhanced').waitFor();
            await page.getByText('Work inspection is limited', { exact: true }).waitFor();
            assert.equal(await page.getByText('No tracked work yet', { exact: true }).count(), 0);
            assert.equal(await page.locator('#detail-empty').isVisible(), false);
            assert.match(await page.getByRole('status').and(page.locator('#work-count')).innerText(), /project total unknown/);
            assert.match(await page.getByRole('main').innerText(), /zero inspected records is not proof of an empty project/);
            await capture('offline-limited', 'Partial zero-inspected scope remains limited with unknown project total');
            const retained = fs.readFileSync(path.join(f.root, partial.path));
            f.config.taskTracking.profile = { kind: 'native', version: 1, registration: 'fixture-native', sources: ['trackers/unavailable.html'] };
            f.saveConfig();
            await assert.rejects(ensureReport(f.root), error => error.code === 'UNAVAILABLE_REPORT');
            assert.deepEqual(fs.readFileSync(path.join(f.root, partial.path)), retained);
            assert.equal(fs.readFileSync(path.join(f.root, 'work/tasks/broken.md'), 'utf8'), 'external malformed record');
            transitions('Open complete-empty report; inspect partial external-owner limits; unavailable native generation preserves prior snapshot');
        } },
    { caseId: 'TECH-report-controls', owner: '.claude/skills/task-track/lib/report-view.cjs#renderReport', variant: 'offline-people-and-checkbox', name: 'Offline People and native checkbox remain readable and operable with long labels and narrow reflow',
        setup: async f => {
            f.config.taskTracking.members.push({ id: 'long-member', displayName: 'A contributor with a long descriptive display name '.repeat(2).trim(), active: true });
            f.config.taskTracking.members.push({ id: 'long-word', displayName: 'Contributor'.repeat(12), active: true });
            f.saveConfig(); await f.create();
        },
        fn: async ({ fixture: f, page, capture, transitions }) => {
            const before = f.bytes('TASK-101');
            const report = await ensureReport(f.root);
            await page.goto(pathToFileURL(path.join(f.root, report.path)).href);
            await page.locator('html.enhanced').waitFor();
            // Responsibility is an open section of the report: nothing has to be expanded before its people can be read.
            assert.equal(await page.getByRole('heading', { name: 'Responsibility', exact: true }).isVisible(), true);
            assert.equal(await page.locator('.people').evaluate(node => getComputedStyle(node).display), 'block');
            assert.equal(await page.locator('.people-content').evaluate(node => getComputedStyle(node).display), 'grid');
            assert.equal(await page.locator('.people-list').evaluate(node => getComputedStyle(node).flexWrap), 'wrap');
            const checkbox = page.getByLabel('Remaining work', { exact: true });
            const checkboxBox = await checkbox.boundingBox();
            const labelBox = await checkbox.locator('..').boundingBox();
            assert.ok(checkboxBox && checkboxBox.width === 20 && checkboxBox.height === 20, 'Checkbox remains a compact native control');
            assert.ok(labelBox && labelBox.width >= 44 && labelBox.height >= 44, 'Its associated label supplies an accessible hit area');
            await checkbox.focus();
            await page.keyboard.press('Space'); assert.equal(await checkbox.isChecked(), true);
            assert.equal(await checkbox.evaluate(node => node.matches(':focus-visible')), true);
            assert.notEqual(await checkbox.evaluate(node => getComputedStyle(node).outlineStyle), 'none');
            await capture('offline-people', 'Expanded People keeps long member names readable and checkbox visibly keyboard-operable');
            const originalViewport = page.viewportSize();
            try {
                await page.setViewportSize({ width: 320, height: originalViewport.height });
                assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true, '320px report reflows without document overflow');
                assert.equal(await page.locator('.people').evaluate(node => node.scrollWidth <= node.clientWidth), true, 'Long People labels stay inside their disclosure');
                assert.equal(await page.locator('.people-list').evaluate(node => node.scrollWidth <= node.clientWidth), true, 'People list wraps within narrow layout');
            } finally { await page.setViewportSize(originalViewport); }
            await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
            await page.getByRole('link', { name: /^TASK-101:/ }).click();
            await page.getByRole('article', { name: 'Export selected rows', exact: true }).waitFor();
            assert.deepEqual(f.bytes('TASK-101'), before);
            transitions('Open People; keyboard-toggle Remaining; assert 320px reflow and restore declared viewport; clear and inspect unchanged work');
        } },
    { caseId: 'TECH-report-controls', owner: '.claude/skills/task-track/lib/report-view.cjs#renderReport', variant: 'offline-no-script', name: 'Without scripts the offline report keeps native content and links usable while hiding inactive controls', javaScriptEnabled: false,
        setup: async f => { await f.create(); await f.create('TASK-102', 'task', { title: 'Alternate outcome' }); await f.accepted(); },
        fn: async ({ fixture: f, page, capture, transitions }) => {
            const before = f.records().map(record => [record.id, f.bytes(record.id)]);
            const report = await ensureReport(f.root); assert.ok(['generated', 'current'].includes(report.status), JSON.stringify(report));
            await page.goto(pathToFileURL(path.join(f.root, report.path)).href);
            await page.getByText(/Scripts are disabled\. Every inspected record and its detail is listed above/).waitFor();
            for (const selector of ['#work-search', '#work-owner', '#work-state', '#work-remaining']) {
                const control = page.locator(selector);
                assert.equal(await control.count(), 1, `The offline report retains its ${selector} control`);
                assert.equal(await control.isVisible(), false);
            }
            assert.equal(await page.getByRole('button', { name: 'Clear filters', exact: true }).isVisible(), false);
            assert.equal(await page.getByRole('article', { name: 'Export selected rows', exact: true }).isVisible(), true);
            assert.equal(await page.getByRole('article', { name: 'Alternate outcome', exact: true }).isVisible(), true);
            const link = page.getByRole('link', { name: /^TASK-101:/ }); const anchor = await link.getAttribute('href'); await link.click();
            assert.equal(new URL(page.url()).hash, anchor);
            await page.getByRole('article', { name: 'Export selected rows', exact: true }).getByRole('link', { name: 'Back to Work', exact: true }).click();
            assert.equal(new URL(page.url()).hash, '#work');
            await capture('offline-no-script', 'Scripts-disabled snapshot exposes all native content and record navigation while hiding inactive filters');
            await page.emulateMedia({ media: 'print' });
            assert.equal(await page.getByRole('article', { name: 'Alternate outcome', exact: true }).isVisible(), true);
            assert.equal(await page.getByRole('button', { name: 'Clear filters', exact: true }).isVisible(), false);
            assert.equal(await page.locator('.source dt:has-text("Checkout") + dd').isVisible(), true);
            for (const [id, bytes] of before) assert.deepEqual(f.bytes(id), bytes);
            transitions('Open scripts-disabled report; inspect native record; return to Work; inspect print without changing canonical work');
        } },
    { caseId: 'TECH-report-controls', owner: '.claude/skills/task-track/lib/report-view.cjs#enhanceReport', variant: 'offline-filter-detail-print', name: 'The generated offline report keeps detail, return, filters and print usable without writes',
        setup: async f => { await f.create(); await f.create('TASK-102', 'task', { title: 'Alternate outcome' }); await f.accepted(); },
        fn: async ({ fixture: f, page, capture, transitions }) => {
            const before = f.records().map(record => [record.id, f.bytes(record.id)]);
            const report = await ensureReport(f.root);
            assert.ok(['generated', 'current'].includes(report.status), JSON.stringify(report));
            await page.goto(pathToFileURL(path.join(f.root, report.path)).href);
            await page.locator('html.enhanced').waitFor();
            await page.getByRole('heading', { name: 'Delivery scope', exact: true }).waitFor();
            // The drawn summaries restate the counted snapshot: one accepted and verified outcome, one draft outcome.
            assert.equal(await page.getByRole('img', { name: '2 tasks, one block each: 1 accepted with current proof; 1 not accepted yet', exact: true }).count(), 1);
            assert.match(await page.getByRole('region', { name: 'Where work stands', exact: true }).innerText(), /1\s+Draft[\s\S]*0\s+Verifying\s+1\s+Done/);
            assert.equal(await page.getByRole('region', { name: 'Waiting on a person', exact: true }).count(), 0);
            // The identity facts stand open in the limits panel; the checkout is read without opening anything.
            assert.equal(await page.locator('.source dt:has-text("Checkout") + dd').isVisible(), true);
            assert.equal(await page.locator('.source dt:has-text("Checkout") + dd').innerText(), f.root);
            const ownerControl = page.locator('#work-owner');
            const stateControl = page.locator('#work-state');
            assert.equal(await ownerControl.count(), 1);
            assert.equal(await stateControl.count(), 1);
            assert.equal(await ownerControl.isVisible(), true);
            assert.equal(await stateControl.isVisible(), true);
            if (page.viewportSize().width <= 480) {
                const search = await page.getByLabel('Search work', { exact: true }).boundingBox();
                const responsible = await ownerControl.boundingBox();
                assert.ok(search && responsible && responsible.y >= search.y + search.height, 'Mobile report controls stack without overlapping');
            }
            await page.getByRole('link', { name: /^TASK-101:/ }).click();
            await page.getByRole('article', { name: 'Export selected rows', exact: true }).waitFor();
            await capture('offline-detail', 'Selected record detail exposes outcome, responsibility and proof in the offline report');
            await page.getByRole('article', { name: 'Export selected rows', exact: true }).getByRole('link', { name: 'Back to Work', exact: true }).click();
            assert.equal(await page.getByRole('heading', { name: 'Work', exact: true }).evaluate(node => node === document.activeElement), true);
            await page.getByLabel('Search work', { exact: true }).fill('No matching report work');
            await page.getByText('No records match these filters. Clear filters to inspect all records in this snapshot.', { exact: true }).waitFor();
            assert.match(await page.getByRole('region', { name: 'Delivery scope', exact: true }).innerText(), /50\.0%/);
            await capture('offline-filter-empty', 'Filtered-empty report retains selected detail and its project denominator');
            await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
            await page.getByRole('status').getByText('2 of 2 inspected records shown', { exact: true }).waitFor();
            await page.emulateMedia({ media: 'print' });
            assert.equal(await page.getByRole('article', { name: 'Alternate outcome', exact: true }).isVisible(), true);
            await capture('offline-print', 'Print exposes every inspected record and labelled snapshot progress');
            for (const [id, bytes] of before) assert.deepEqual(f.bytes(id), bytes);
            transitions('Open generated offline report; select detail; return to Work; filter; clear; print');
        } },
    { caseId: 'TC-TPT-254', owner: "WorkTracking/README.TaskTracking-Part8.md", variant: 'packed-detail-opens-and-prints', name: 'The packed form opens every record with the same detail as the full form, keeps outcomes searchable and prints them all',
        setup: async f => { await f.create(); await f.create('TASK-102', 'task', { title: 'Alternate outcome', intent: 'Only this outcome mentions a lighthouse' }); await f.accepted(); },
        fn: async ({ fixture: f, page, capture, transitions }) => {
            const before = f.records().map(record => [record.id, f.bytes(record.id)]);
            const full = await ensureReport(f.root); const packed = await ensureReport(f.root, { detail: 'packed' });
            assert.equal(packed.detail, 'packed'); assert.notEqual(packed.path, full.path);
            await page.goto(pathToFileURL(path.join(f.root, packed.path)).href);
            await page.locator('html.enhanced').waitFor();
            assert.equal(await page.locator('#packed-unavailable').isVisible(), false);
            // The compact version says that it is one, at the top and beside the list.
            assert.equal(await page.getByText('Compact version.', { exact: true }).isVisible(), true);
            assert.equal(await page.getByText('Compact version of this list.', { exact: true }).isVisible(), true);
            assert.equal(await page.locator('.record-detail').count(), 2, 'Every record has its detail once the packed form has opened');
            const shownDetail = () => page.locator('.record-detail').evaluateAll(nodes => nodes.map(node => node.textContent).sort());
            const packedDetail = await shownDetail();
            await page.getByRole('link', { name: /^TASK-102:/ }).click();
            const card = page.getByRole('article', { name: 'Alternate outcome', exact: true }); await card.waitFor();
            assert.match(await card.innerText(), /Only this outcome mentions a lighthouse/);
            assert.equal(await card.getByRole('heading', { name: 'Alternate outcome', exact: true }).evaluate(node => node === document.activeElement), true);
            await capture('packed-detail', 'A record opened from the packed form shows its outcome, criteria and proof under its row');
            // An outcome is searched in the packed form as in the full one.
            await page.getByLabel('Search work', { exact: true }).fill('lighthouse');
            await page.getByRole('status').getByText('1 of 2 inspected records shown', { exact: true }).waitFor();
            await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
            await page.emulateMedia({ media: 'print' });
            assert.equal(await page.getByRole('article', { name: 'Export selected rows', exact: true }).isVisible(), true);
            assert.equal(await page.getByRole('article', { name: 'Alternate outcome', exact: true }).isVisible(), true);
            await capture('packed-print', 'Print of the packed form shows every record with its detail');
            await page.emulateMedia({ media: 'screen' });
            // The full form shows the same text for the same records.
            await page.goto(pathToFileURL(path.join(f.root, full.path)).href); await page.locator('html.enhanced').waitFor();
            assert.deepEqual(await shownDetail(), packedDetail);
            assert.equal(await page.getByText('Compact version.', { exact: true }).count(), 0, 'the full version carries no such warning');
            // A reader whose browser cannot open packed detail still gets the counts, the list and working filters, and is told at the top.
            await page.addInitScript(() => { window.DecompressionStream = undefined; });
            await page.goto(pathToFileURL(path.join(f.root, packed.path)).href); await page.locator('html.enhanced').waitFor();
            assert.equal(await page.getByText('Record detail could not be opened in this browser.', { exact: true }).isVisible(), true);
            assert.equal(await page.locator('.record-detail').count(), 0); assert.equal(await page.locator('#interaction-error').isVisible(), false);
            assert.equal(await page.locator('.work-row').count(), 2); assert.match(await page.getByRole('region', { name: 'Delivery scope', exact: true }).innerText(), /50\.0%/);
            await page.getByRole('link', { name: /^TASK-102:/ }).click();
            await page.locator('.work-row.is-open').getByText(/^Detail for TASK-102 could not be opened here\./).waitFor();
            await page.getByLabel('Search work', { exact: true }).fill('Alternate');
            await page.getByRole('status').getByText('1 of 2 inspected records shown', { exact: true }).waitFor();
            await capture('packed-unavailable', 'A browser that cannot open packed detail still shows the counts and the list, and says so at the top and under the chosen row');
            for (const [id, bytes] of before) assert.deepEqual(f.bytes(id), bytes);
            transitions('Open packed report; open a record; search an outcome; clear; print; compare with the full report; reopen where packed detail cannot be opened');
        } },
    { caseId: 'TC-TPT-254', owner: "WorkTracking/README.TaskTracking-Part8.md", variant: 'packed-without-scripts', name: 'Without scripts the packed form still lists every record and says that its detail needs scripts or the full form', javaScriptEnabled: false,
        setup: async f => { await f.create(); await f.create('TASK-102', 'task', { title: 'Alternate outcome' }); await f.accepted(); },
        fn: async ({ fixture: f, page, capture, transitions }) => {
            const packed = await ensureReport(f.root, { detail: 'packed' });
            await page.goto(pathToFileURL(path.join(f.root, packed.path)).href);
            await page.getByText(/Scripts are disabled\. Every inspected record is listed above\. Record detail in this copy is packed and needs scripts/).waitFor();
            assert.equal(await page.locator('.work-row').count(), 2); assert.equal(await page.locator('.record-detail').count(), 0);
            assert.equal(await page.getByText('Compact version.', { exact: true }).isVisible(), true);
            assert.match(await page.getByRole('region', { name: 'Delivery scope', exact: true }).innerText(), /50\.0%/);
            assert.equal(await page.getByRole('link', { name: /^TASK-101:/ }).isVisible(), true);
            await capture('packed-no-script', 'Scripts-disabled packed snapshot keeps its counts and its list and states what needs scripts');
            transitions('Open scripts-disabled packed report; read counts, list and the stated limit');
        } },
    { caseId: 'TC-TPT-253', owner: "WorkTracking/README.TaskTracking-Part8.md", variant: 'detail-free-says-where-to-read', name: 'The detail-free form lists every record, keeps its filters and says where a record can be read',
        setup: async f => { await f.create(); await f.create('TASK-102', 'task', { title: 'Alternate outcome' }); await f.accepted(); },
        fn: async ({ fixture: f, page, capture, transitions }) => {
            const before = f.records().map(record => [record.id, f.bytes(record.id)]);
            const none = await ensureReport(f.root, { detail: 'none' }); assert.equal(none.detail, 'none');
            await page.goto(pathToFileURL(path.join(f.root, none.path)).href);
            await page.locator('html.enhanced').waitFor();
            assert.equal(await page.locator('.work-row').count(), 2); assert.equal(await page.locator('.record-detail').count(), 0);
            assert.equal(await page.getByText('Compact version without record detail.', { exact: true }).isVisible(), true);
            assert.equal(await page.getByText(/Detail not in this copy\. Every inspected record is still listed/).isVisible(), true);
            assert.match(await page.getByRole('region', { name: 'Delivery scope', exact: true }).innerText(), /50\.0%/);
            // Choosing a record does not fail: the page says its detail is elsewhere, and the filters keep working.
            await page.getByRole('link', { name: /^TASK-101:/ }).click();
            // The page says so under the chosen row itself, with the command that reads this record, and the row stays in view.
            const note = page.locator('.work-row.is-open').getByText(/^Detail for TASK-101 is not in this copy\./); await note.waitFor();
            assert.match(await note.innerText(), /inspect --root <checkout> --item TASK-101$/);
            assert.equal(await page.getByRole('link', { name: /^TASK-101:/ }).evaluate(node => { const box = node.getBoundingClientRect(); return box.bottom > 0 && box.top < innerHeight; }), true);
            assert.equal(await page.locator('#interaction-error').isVisible(), false);
            await page.getByLabel('Search work', { exact: true }).fill('Alternate');
            await page.getByRole('status').getByText('1 of 2 inspected records shown', { exact: true }).waitFor();
            await capture('detail-free', 'The detail-free form lists both records and names where a chosen record can be read');
            for (const [id, bytes] of before) assert.deepEqual(f.bytes(id), bytes);
            transitions('Open detail-free report; choose a record; read where its detail is; filter the list');
        } },
    { caseId: 'TC-TPT-260', owner: "WorkTracking/README.TaskTracking-Part8.md", variant: 'full-report-in-app', name: 'The workspace reads the full version while the project\'s own report file is the compact version',
        // No form is named by this project, so its own report file is the compact version.
        setup: async f => {
            await f.create('FEATURE-F', 'area', { title: 'Selective export', level: 'feature' });
            await f.create('TASK-101', 'task', { areaIds: ['FEATURE-F'] }); await f.create('TASK-102', 'task', { title: 'Alternate outcome' });
            delete f.config.taskTracking.report.detail; f.saveConfig();
        },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            const own = await ensureReport(f.root); assert.deepEqual([own.path, own.detail], [reportPath(), 'packed']);
            await open();
            await shownReport(page, () => page.getByRole('navigation').getByRole('button', { name: 'Report', exact: true }).click());
            await page.getByRole('heading', { name: 'Status report', exact: true }).waitFor();
            const shown = await frameManifest(page); assert.deepEqual([shown.form, shown.detail, shown.maxBytes], ['full', 'full', null]);
            const frame = page.frameLocator('iframe.report-frame');
            await frame.locator('html.enhanced').waitFor();
            assert.equal(await frame.getByText('Compact version.', { exact: true }).count(), 0);
            assert.equal(await frame.locator('.record-detail').count(), 3, 'Every record\'s detail is page content in the workspace');
            // An area opened from its figures line is left by Back on that same line, not somewhere else on the page.
            const figure = frame.getByRole('region', { name: 'How each area stands', exact: true }).getByRole('link', { name: 'Selective export', exact: true });
            await figure.click();
            const opened = frame.getByRole('article', { name: 'Selective export', exact: true }); await opened.waitFor();
            await opened.getByRole('link', { name: 'Back to Work', exact: true }).click();
            assert.equal(await figure.evaluate(node => node === document.activeElement), true, 'Back returns to the area line it was opened from');
            await frame.getByRole('link', { name: /^TASK-102:/ }).click();
            await frame.getByRole('article', { name: 'Alternate outcome', exact: true }).waitFor();
            // The full version was written beside the project's own file, which is still the compact version with its warning.
            assert.equal(inspectReport(f.root, reportPath({ detail: 'full' })).manifest.form, 'full');
            assert.equal(inspectReport(f.root).manifest.form, 'packed'); assert.ok(fs.readFileSync(path.join(f.root, own.path), 'utf8').includes('<strong>Compact version.</strong>'));
            await capture('full-in-app', 'The workspace shows the full version, a record opened with its detail, while the project file stays compact', { frame: 'iframe.report-frame' });
            transitions('Generate the default compact file; open workspace; open Report; the frame holds the full version; open a record');
        } },
    { caseId: 'TC-TPT-261', owner: "WorkTracking/README.TaskTracking-Part8.md", variant: 'kind-label-in-both-views', name: 'A kind display label is the word both the workspace and the status report show, and new work is still stored under the tracker\'s word',
        // The identity carries no word of the kind, so that every match below is a word a view chose.
        setup: async f => { await f.create('OUTCOME-1', 'initiative', { title: 'Faster exports' }); await f.create(); f.config.taskTracking.kindLabels = { initiative: 'Proposal' }; f.saveConfig(); },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            await open();
            await page.getByRole('button', { name: 'Inspect all work', exact: true }).click();
            await page.getByRole('button', { name: 'Capture work', exact: true }).click();
            const kind = page.getByRole('main').getByRole('combobox', { name: 'Work kind', exact: true });
            assert.deepEqual(await kind.locator('option').evaluateAll(options => options.map(option => [option.value, option.textContent])),
                [['initiative', 'Proposal'], ['task', 'Task'], ['story', 'Story'], ['subtask', 'Subtask'], ['area', 'Area']]);
            await kind.selectOption('initiative');
            await page.getByRole('radio', { name: 'Idea', exact: true }).check();
            await page.getByLabel('Title', { exact: true }).fill('Export by schedule');
            await page.getByLabel('Intended outcome', { exact: true }).fill('People receive an export every morning');
            await saveReviewed(page, transitions);
            // Requested, answered and stored under the tracker's own word; only the displayed word is the project's.
            const stored = f.records().map(record => f.view(record.id)).filter(view => view.kind === 'initiative');
            assert.equal(stored.length, 2); assert.ok(stored.every(view => /^work\/initiatives\//.test(view.ownerPath)));
            // A location and a generated identity keep the tracker's own word, as the stored path above does; every other word
            // shown for the kind, in any letter case, is the project's.
            const trackerWords = shown => shown.getByText(/\binitiatives?\b/i).evaluateAll(nodes => nodes.map(node => node.textContent.replace(/work\/initiatives\/\S+|\binitiative-\d{8}-\d+\b/g, '').trim()).filter(text => /\binitiatives?\b/i.test(text)));
            assert.deepEqual(await trackerWords(page.getByRole('main')), [], 'the workspace names the kind by its label only');
            assert.ok(await page.getByRole('main').getByText(/\bProposal\b/).count() > 0);
            await capture('kind-label', 'Work captured as an initiative is shown under the project\'s word for that kind');
            // Every sentence of the Overview that names the kind follows the label too.
            await page.getByRole('navigation').getByRole('button', { name: 'Overview', exact: true }).click();
            await page.getByRole('region', { name: 'How each proposal stands', exact: true }).waitFor();
            assert.deepEqual(await trackerWords(page.getByRole('main')), [], 'the Overview names the kind by its label only');
            await shownReport(page, () => page.getByRole('navigation').getByRole('button', { name: 'Report', exact: true }).click());
            const frame = page.frameLocator('iframe.report-frame'); await frame.locator('html.enhanced').waitFor();
            assert.match(await frame.getByRole('region', { name: 'Status by kind', exact: true }).innerText(), /Proposal\s*2/);
            assert.deepEqual(await trackerWords(frame), [], 'the report names the kind by its label only');
            transitions('Open workspace; capture an initiative under its label; read the label in the list, the Overview and the status report');
        } },
    { caseId: 'TC-TPT-262', owner: "WorkTracking/README.TaskTracking-Part8.md", variant: 'work-list-pages', name: 'The list of records shows twenty at a time, reaches every record page by page and follows a chosen record to its page',
        setup: async f => {
            for (let n = 101; n <= 145; n++) await f.create(`TASK-${n}`, 'task', { title: `Outcome ${n}`, intent: n === 130 ? 'Only this outcome mentions a lighthouse' : `People can rely on outcome ${n}` });
        },
        fn: async ({ fixture: f, page, capture, transitions }) => {
            const before = f.records().map(record => [record.id, f.bytes(record.id)]);
            const report = await ensureReport(f.root);
            await page.goto(pathToFileURL(path.join(f.root, report.path)).href); await page.locator('html.enhanced').waitFor();
            const ids = Array.from({ length: 45 }, (_, n) => `TASK-${101 + n}`);
            const shownIds = () => page.locator('.work-row').evaluateAll(nodes => nodes.filter(node => !node.hidden).map(node => node.dataset.itemId));
            const counted = text => page.getByRole('status').getByText(text, { exact: true }).waitFor();
            const above = page.getByRole('navigation', { name: 'Work list pages', exact: true }), below = page.getByRole('navigation', { name: 'Work list pages, below the list', exact: true });
            const step = (pager, name) => pager.getByRole('button', { name, exact: true });
            // Every record is in the page; twenty are shown, and the list says which.
            assert.equal(await page.locator('.work-row').count(), 45);
            assert.deepEqual(await shownIds(), ids.slice(0, 20)); await counted('1–20 of 45 inspected records shown');
            assert.equal(await above.getByText('Page 1 of 3', { exact: true }).isVisible(), true); assert.equal(await below.getByText('Page 1 of 3', { exact: true }).isVisible(), true);
            // There is no page before the first: Previous says so, and pressing it anyway changes nothing.
            assert.equal(await step(above, 'Previous').getAttribute('aria-disabled'), 'true'); await step(above, 'Previous').click({ force: true }); assert.deepEqual(await shownIds(), ids.slice(0, 20));
            await step(above, 'Next').click();
            assert.deepEqual(await shownIds(), ids.slice(20, 40)); await counted('21–40 of 45 inspected records shown');
            // From under the list, the next page begins at the top of the list.
            await step(below, 'Next').click();
            assert.deepEqual(await shownIds(), ids.slice(40)); await counted('41–45 of 45 inspected records shown');
            assert.equal(await page.getByRole('heading', { name: 'Work', exact: true }).evaluate(node => node === document.activeElement), true);
            assert.equal(await step(below, 'Next').getAttribute('aria-disabled'), 'true'); assert.equal(await above.getByText('Page 3 of 3', { exact: true }).isVisible(), true);
            await capture('work-list-page', 'The last page of the list names its range and its page, with the way back to the others');
            // A changed filter starts again at the first page of what matches, here every record.
            await page.locator('#work-state').selectOption('draft');
            await counted('1–20 of 45 inspected records shown'); assert.deepEqual(await shownIds(), ids.slice(0, 20)); assert.equal(await above.getByText('Page 1 of 3', { exact: true }).isVisible(), true);
            await step(above, 'Next').click(); await counted('21–40 of 45 inspected records shown');
            await page.locator('#work-state').selectOption(''); await counted('1–20 of 45 inspected records shown');
            // A record on another page, reached by its link, brings its page with it and opens there.
            await page.evaluate(() => { location.hash = '#record-TASK-125'; });
            await page.getByRole('article', { name: 'Outcome 125', exact: true }).waitFor();
            assert.deepEqual(await shownIds(), ids.slice(20, 40)); assert.equal(await above.getByText('Page 2 of 3', { exact: true }).isVisible(), true);
            // Leaving the record returns to the page that was shown.
            await page.getByRole('link', { name: /^TASK-131:/ }).click(); await page.getByRole('article', { name: 'Outcome 131', exact: true }).waitFor();
            await page.getByRole('article', { name: 'Outcome 131', exact: true }).getByRole('link', { name: 'Back to Work', exact: true }).click();
            assert.deepEqual(await shownIds(), ids.slice(20, 40));
            // Search runs over every record, starts again at the first page, and needs no paging for one match.
            await page.getByLabel('Search work', { exact: true }).fill('lighthouse');
            await counted('1 of 45 inspected records shown'); assert.deepEqual(await shownIds(), ['TASK-130']);
            assert.equal(await above.isVisible(), false); assert.equal(await below.isVisible(), false);
            await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
            await counted('1–20 of 45 inspected records shown'); assert.deepEqual(await shownIds(), ids.slice(0, 20));
            // A longer page holds them all; every record on one page needs no steps.
            await above.getByRole('combobox', { name: 'Rows per page', exact: true }).selectOption('50');
            await counted('45 of 45 inspected records shown'); assert.deepEqual(await shownIds(), ids);
            assert.equal(await above.getByText('Page 1 of 1', { exact: true }).isVisible(), true); assert.equal(await step(above, 'Next').getAttribute('aria-disabled'), 'true');
            await above.getByRole('combobox', { name: 'Rows per page', exact: true }).selectOption('20'); await counted('1–20 of 45 inspected records shown');
            // Paper gets every record whatever page is shown, and no paging controls.
            await page.emulateMedia({ media: 'print' });
            assert.equal(await page.locator('.work-row').evaluateAll(nodes => nodes.filter(node => getComputedStyle(node).display !== 'none').length), 45);
            assert.equal(await above.isVisible(), false);
            await page.emulateMedia({ media: 'screen' });
            for (const [id, bytes] of before) assert.deepEqual(f.bytes(id), bytes);
            transitions('Open a report with forty-five records; step through its three pages; follow a record link to its page; open and leave a record; search one outcome; clear; lengthen the page; print');
        } },
    { caseId: 'TC-TPT-095', owner: "WorkTracking/README.TaskTracking-Part2.md", variant: 'safe-draft-delete', name: 'Draft deletion requires exact preview and confirmation while established work retains identity',
        setup: async f => { await f.create(); await f.create('TASK-102'); await f.ready('TASK-102'); },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            const established = f.bytes('TASK-102');
            await open(); await selectWork(page, 'TASK-102', transitions);
            assert.equal(await selectedPane(page).getByRole('button', { name: 'Review draft deletion', exact: true }).count(), 0);
            await selectWork(page, 'TASK-101', transitions);
            const owner = f.view('TASK-101').ownerPath;
            await selectedPane(page).getByRole('button', { name: 'Review draft deletion', exact: true }).click();
            await page.getByLabel('Reason for deleting this draft', { exact: true }).fill('Duplicate untouched capture');
            await page.getByRole('button', { name: 'Preview change', exact: true }).click();
            await page.getByRole('button', { name: 'Delete reviewed draft', exact: true }).waitFor();
            assert.equal(await page.getByRole('button', { name: 'Delete reviewed draft', exact: true }).isDisabled(), true);
            assert.equal(fs.existsSync(path.join(f.root, owner)), true);
            await capture('delete-preview', 'Exact untouched draft is named and deletion waits for explicit confirmation');
            await page.getByLabel('I reviewed the exact draft TASK-101 and explicitly confirm removing its canonical file', { exact: true }).check();
            await page.getByRole('button', { name: 'Delete reviewed draft', exact: true }).click();
            await page.getByRole('status').getByText(/Deleted draft TASK-101 in the local checkout/).waitFor();
            assert.equal(fs.existsSync(path.join(f.root, owner)), false);
            assert.deepEqual(f.bytes('TASK-102'), established);
            await capture('draft-deleted', 'Only the explicitly confirmed draft is removed; established work remains');
        } },
    { caseId: 'TC-TPT-095', owner: "WorkTracking/README.TaskTracking-Part2.md", variant: 'ended-work-delete', name: 'Canceled or retired work is deleted entirely after exact preview and confirmation, open work is not offered it, and referenced work is refused',
        expectedConsole: [/Failed to load resource.*422/],
        setup: async f => {
            await f.create(); await f.saved('retire', 'TASK-101', { reason: 'Superseded outcome' });
            await f.create('TASK-102'); await f.create('TASK-103'); await f.saved('link', 'TASK-103', { links: [{ relation: 'dependency', itemId: 'TASK-102' }] });
            await f.saved('transition', 'TASK-102', { state: 'canceled', reason: 'No longer needed' });
            await f.saved('transition', 'TASK-103', { state: 'planned' });
        },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            const open103 = f.bytes('TASK-103'); const canceled = f.bytes('TASK-102'); const owner = f.view('TASK-101').ownerPath;
            // GIVEN open work THEN entire deletion is not offered for it.
            await open(); await selectWork(page, 'TASK-103', transitions);
            assert.equal(await selectedPane(page).getByRole('button', { name: 'Delete entirely', exact: true }).count(), 0);
            // GIVEN retired work WHEN its deletion is previewed THEN what leaves with it is stated and nothing is removed yet.
            await selectWork(page, 'TASK-101', transitions);
            await selectedPane(page).getByRole('button', { name: 'Delete entirely', exact: true }).click();
            await page.getByRole('heading', { name: 'Delete work entirely', exact: true }).waitFor();
            await page.getByLabel('Reason for deleting this work', { exact: true }).fill('Retired outcome no longer needs a record');
            await page.getByRole('button', { name: 'Preview change', exact: true }).click();
            await page.getByRole('button', { name: 'Delete work entirely', exact: true }).waitFor();
            assert.equal(await page.getByRole('button', { name: 'Delete work entirely', exact: true }).isDisabled(), true);
            await page.getByText(/This record will be removed entirely: .*With it go 2 history entries, 0 proofs, 0 acceptance decisions/).waitFor();
            assert.equal(fs.existsSync(path.join(f.root, owner)), true);
            await capture('delete-entirely-preview', 'Retired work is named, what leaves with it is stated, and deletion waits for explicit confirmation');
            await page.getByLabel('I reviewed TASK-101 and explicitly confirm deleting it entirely, together with its history', { exact: true }).check();
            await page.getByRole('button', { name: 'Delete work entirely', exact: true }).click();
            await page.getByRole('status').getByText(/Deleted ended work TASK-101 in the local checkout/).waitFor();
            assert.equal(fs.existsSync(path.join(f.root, owner)), false);
            assert.deepEqual(f.bytes('TASK-103'), open103); assert.deepEqual(f.bytes('TASK-102'), canceled);
            transitions('Preview, confirm and delete retired work entirely');
            await capture('ended-work-deleted', 'Only the confirmed retired record is removed; open and canceled work remain');
            // GIVEN canceled work another record still depends on WHEN previewed THEN it is refused and nothing cascades.
            await selectWork(page, 'TASK-102', transitions);
            await selectedPane(page).getByRole('button', { name: 'Delete entirely', exact: true }).click();
            await page.getByLabel('Reason for deleting this work', { exact: true }).fill('Canceled outcome no longer needs a record');
            await page.getByRole('button', { name: 'Preview change', exact: true }).click();
            await page.getByText(/Remove the links that still point to this work first; no cascade\. Referenced by TASK-103/).waitFor();
            assert.equal(await page.getByRole('button', { name: 'Delete work entirely', exact: true }).count(), 0);
            assert.deepEqual(f.bytes('TASK-102'), canceled); assert.deepEqual(f.bytes('TASK-103'), open103);
            transitions('Preview deletion of referenced canceled work');
            await capture('referenced-ended-work-refused', 'Canceled work that another record depends on is refused with the referencing record named; both records are unchanged');
        } },
    { caseId: 'TC-TPT-039', owner: "WorkTracking/README.TaskTracking.md", variant: 'state-correction', name: 'Canceled work is taken back to draft through an explicit reasoned state change, and done is never offered there',
        setup: async f => { await f.create(); await f.saved('transition', 'TASK-101', { state: 'canceled', reason: 'Requested scope removed' }); },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            assert.equal(f.config.taskTracking.schemaVersion, 3, 'This base vocabulary excludes the version 4 implemented state');
            const canceled = f.bytes('TASK-101'); const history = f.record('TASK-101').tracking.history;
            // GIVEN canceled work THEN the usual steps offer no way forward, and Change state is offered.
            await open(); await selectWork(page, 'TASK-101', transitions);
            assert.equal(await selectedPane(page).getByRole('button', { name: 'Move to planned', exact: true }).count(), 0);
            await selectedPane(page).getByRole('button', { name: 'Change state', exact: true }).click();
            await page.getByRole('heading', { name: 'Change state', exact: true }).waitFor();
            const choices = await page.getByLabel('New state', { exact: true }).getByRole('option').allInnerTexts();
            // Nobody is responsible for this record, so the states that started work needs are shown and cannot be chosen.
            assert.deepEqual(choices, ['Choose a state', 'Draft', 'Planned', 'Ready', 'In progress (needs a responsible member)', 'Blocked (needs a responsible member)', 'Verifying (needs a responsible member)']);
            assert.deepEqual(await page.getByLabel('New state', { exact: true }).getByRole('option').evaluateAll(options => options.filter(option => option.disabled).map(option => option.value)),
                ['in_progress', 'blocked', 'verifying']);
            // WHEN draft and a reason are chosen THEN the preview states exactly that change and nothing is saved yet.
            await page.getByLabel('New state', { exact: true }).selectOption('draft');
            await page.getByLabel('Reason for this change', { exact: true }).fill('Canceled by mistake');
            const preview = await exactPreview(page);
            assert.deepEqual(preview.change, { state: 'draft', correction: true, reason: 'Canceled by mistake' });
            assert.equal(await page.getByRole('status').getByText('Preview ready. Review the exact change; nothing is saved yet.', { exact: true }).count(), 1);
            assert.deepEqual(f.bytes('TASK-101'), canceled);
            await saveExactPreview(page, transitions);
            // What an action said belongs to that action: the saved card does not follow the reader to another view.
            await page.getByRole('navigation').getByRole('button', { name: 'Overview', exact: true }).click();
            await page.getByRole('heading', { name: 'Project progress', exact: true }).waitFor();
            assert.equal(await page.getByRole('status').getByText(/Saved .* in the local checkout/).count(), 0);
            const restored = f.record('TASK-101');
            assert.equal(restored.data.status, 'draft'); assert.deepEqual(restored.tracking.history.slice(0, -1), history);
            assert.equal(restored.tracking.history.at(-1).reason, 'Canceled by mistake');
            // THEN the usual next step is offered again from the corrected state.
            await selectWork(page, 'TASK-101', transitions);
            await selectedPane(page).getByRole('button', { name: 'Move to planned', exact: true }).waitFor();
            transitions('Change canceled work back to draft with a reason');
            await capture('state-corrected', 'Canceled work is a draft again, with its history kept and its usual next step offered');
        } },
    { caseId: 'TC-TPT-053', owner: "WorkTracking/README.TaskTracking.md", variant: 'scoped-filter-draft-recovery', name: 'Filter-empty recovery retains the selected delivery denominator and the unsaved record draft',
        setup: async f => { await hierarchyFixture(f); },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            const before = canonicalFacts(f); const metrics = f.progress({ scopeId: 'FEATURE-F' }).metrics;
            await open(); await chooseDeliveryScope(page, 'FEATURE-F', transitions);
            await openEligible(page, 'TASK-P', transitions);
            await selectedPane(page).getByRole('button', { name: 'Refine work', exact: true }).click();
            await page.getByLabel('Title', { exact: true }).fill('Retained scope draft');
            await keepDraftAndNavigate(page, 'Work');
            await page.getByLabel('Find work', { exact: true }).fill('does-not-match-any-outcome');
            await page.getByText('No work matches these filters. Clear filters to return to the list.', { exact: true }).waitFor();
            assert.equal(await page.getByRole('status').getByText(/Saved .* in the local checkout/).count(), 0);
            assert.match(await page.getByRole('navigation', { name: 'Chosen scope path', exact: true }).innerText(), /FEATURE-F/);
            await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
            assert.equal(await page.getByLabel('Find work', { exact: true }).inputValue(), '');
            assert.deepEqual(await eligibleIds(page), ['TASK-P', 'TASK-Q']);
            await keepDraftAndNavigate(page, 'Overview', 'Area progress');
            assert.match(await page.getByRole('main').innerText(), /2 eligible unique tasks/);
            assert.match(await page.getByRole('main').innerText(), /50\.0%/);
            // Returning to the draft from the remaining-work shortcut changes nothing, the Work filter included.
            await page.getByRole('button', { name: 'Inspect remaining work', exact: true }).click();
            await page.getByRole('dialog', { name: 'Keep your draft?', exact: true }).waitFor();
            await page.getByRole('button', { name: 'Return to draft', exact: true }).click();
            await page.getByRole('heading', { name: 'Area progress', exact: true }).waitFor();
            await keepDraftAndNavigate(page, 'Work');
            assert.equal(await page.getByLabel('Remaining eligible tasks only', { exact: true }).isChecked(), false);
            await page.getByRole('navigation').getByRole('button', { name: 'Unsaved draft', exact: true }).click();
            assert.equal(await page.getByLabel('Title', { exact: true }).inputValue(), 'Retained scope draft');
            assert.deepEqual(f.progress({ scopeId: 'FEATURE-F' }).metrics, metrics);
            assertCanonicalFacts(f, before);
            await capture('scoped-filter-draft-retained', 'Clear filters preserves FEATURE-F, its two-outcome denominator and the entered unsaved draft');
            transitions('Choose F; retain edited P; observe empty filter; clear; read unchanged progress; return to retained draft');
        } },
    { caseId: 'TC-TPT-058', owner: "WorkTracking/README.TaskTracking-Part2.md", variant: 'actual-pending-save', name: 'A pending real save prevents duplicate submission and any premature saved or accepted claim',
        setup: async f => { await f.create('TASK-104'); },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            await open(); await selectWork(page, 'TASK-104', transitions);
            await selectedPane(page).getByRole('button', { name: 'Refine work', exact: true }).click();
            await page.getByLabel('Title', { exact: true }).fill('Pending actual save');
            await page.getByRole('button', { name: 'Preview change', exact: true }).click();
            await page.getByRole('heading', { name: 'Review this exact change', exact: true }).waitFor();
            const original = f.record('TASK-104'); const requests = [];
            let release, observed;
            const gate = new Promise(resolve => { release = resolve; });
            const admitted = new Promise(resolve => { observed = resolve; });
            await page.route('**/api/operation', async route => {
                const request = route.request().postDataJSON();
                if (request.preview) return route.continue();
                requests.push(request); const response = await route.fetch();
                assert.equal(response.status(), 200); observed(); await gate; await route.fulfill({ response });
            });
            await page.getByRole('button', { name: 'Save reviewed change', exact: true }).click();
            try {
                await waitForSignal(admitted, 'the admitted real pending save');
                await page.getByRole('status').getByText(/Reading or saving this request/).waitFor();
                const save = page.getByRole('button', { name: 'Save reviewed change', exact: true });
                assert.equal(await save.isDisabled(), true);
                await save.evaluate(control => control.click());
                assert.equal(requests.length, 1);
                assert.equal(await page.getByRole('status').getByText(/Saved .* in the local checkout/).count(), 0);
                assert.equal(await page.getByLabel('Title', { exact: true }).inputValue(), 'Pending actual save');
                assert.deepEqual(f.view('TASK-104').acceptanceHistory, []);
                await capture('actual-save-pending', 'The real save response is pending; duplicate submission is disabled and no confirmed success is shown');
            } finally { release(); }
            await page.getByRole('status').getByText(/Saved TASK-104 in the local checkout/).waitFor();
            const after = f.record('TASK-104');
            assert.equal(after.data.title, 'Pending actual save'); assert.equal(after.revision, original.revision + 1);
            assert.deepEqual(after.tracking.history.slice(0, -1), original.tracking.history);
            assert.equal(after.tracking.history.at(-1).operationId, requests[0].operationId);
            assert.equal(after.tracking.receipts.filter(row => row.operationId === requests[0].operationId).length, 1);
            assert.deepEqual(after.tracking.acceptanceHistory, original.tracking.acceptanceHistory);
            assert.equal(after.data.status, original.data.status);
            transitions('Wait for actual save response; refuse repeat submit; observe one persisted result');
        } },
    { caseId: 'TC-TPT-059', owner: "WorkTracking/README.TaskTracking-Part2.md", variant: 'saved-receipt-context', name: 'Only the actual saved receipt restores the selected scope and next-action context without a duplicate change',
        expectedConsole: [/Failed to load resource: net::ERR_FAILED/],
        setup: async f => { await hierarchyFixture(f); },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            await open(); await chooseDeliveryScope(page, 'FEATURE-F', transitions);
            await page.getByLabel('Find work', { exact: true }).fill('Integration outcome');
            await openEligible(page, 'TASK-P', transitions);
            await selectedPane(page).getByRole('button', { name: 'Refine work', exact: true }).click();
            await page.getByLabel('Title', { exact: true }).fill('Integration outcome saved once');
            await page.getByRole('button', { name: 'Preview change', exact: true }).click();
            await page.getByRole('heading', { name: 'Review this exact change', exact: true }).waitFor();
            const before = f.record('TASK-P'); const controls = canonicalFacts(f, ['TASK-P']); const requests = [];
            await page.route('**/api/operation', async route => {
                const request = route.request().postDataJSON();
                if (request.preview) return route.continue();
                requests.push(request);
                if (requests.length === 1) { const response = await route.fetch(); assert.equal(response.status(), 200); return route.abort('failed'); }
                return route.continue();
            });
            await page.getByRole('button', { name: 'Save reviewed change', exact: true }).click();
            await page.getByRole('button', { name: 'Retry original save', exact: true }).waitFor();
            const saved = f.record('TASK-P'); const savedBytes = f.bytes('TASK-P');
            assert.equal(saved.data.title, 'Integration outcome saved once'); assert.equal(saved.revision, before.revision + 1);
            assert.equal(await page.getByRole('status').getByText(/Saved .* in the local checkout/).count(), 0);
            await page.getByRole('button', { name: 'Read current without resaving', exact: true }).click();
            await page.getByText('Current record read separately', { exact: true }).waitFor();
            assert.equal(requests.length, 1); assert.deepEqual(f.bytes('TASK-P'), savedBytes);
            await page.getByRole('button', { name: 'Retry original save', exact: true }).click();
            await page.getByRole('status').getByText(/Saved TASK-P in the local checkout.*original receipt replayed/).waitFor();
            assert.deepEqual(requests[1], requests[0]); assert.equal(requests.length, 2);
            assert.deepEqual(f.bytes('TASK-P'), savedBytes);
            await selectedPane(page).getByRole('heading', { name: /^TASK-P:/ }).waitFor();
            assert.equal(await page.getByLabel('Find work', { exact: true }).inputValue(), 'Integration outcome');
            assert.match(await page.getByRole('navigation', { name: 'Chosen scope path', exact: true }).innerText(), /FEATURE-F/);
            assert.deepEqual(f.view('TASK-P').acceptanceHistory, before.tracking.acceptanceHistory);
            assertCanonicalFacts(f, controls);
            await capture('actual-saved-context', 'One actual saved receipt restores the selected outcome, F scope and retained filter without a second write');
            transitions('Lose actual response; read without saving; retry exact receipt; return to retained scope/filter and selected record');
        } },
    { caseId: 'TC-TPT-203', owner: "WorkTracking/README.TaskTracking-Part6.md", variant: 'scope-outcome-intent-proof', name: 'A through F explains exactly two outcomes and their actual intent proof exclusions and support',
        setup: async f => { await hierarchyFixture(f); },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            const before = canonicalFacts(f); const q = f.view('TASK-Q'); const p = f.view('TASK-P');
            await open(); await chooseDeliveryScope(page, 'AREA-A', transitions); await enterAreaInside(page, 'FEATURE-F', 'Shared integration capability', transitions);
            assert.deepEqual(await eligibleIds(page), ['TASK-P', 'TASK-Q']);
            const excluded = await disclosedList(page, 'Excluded tasks');
            assert.deepEqual((await excluded.getByRole('button').allTextContents()).map(text => text.match(/TASK-[A-Z]+/)[0]).sort(), ['TASK-R', 'TASK-S']);
            const support = await disclosedList(page, 'Supporting work');
            assert.deepEqual((await support.getByRole('button').allTextContents()).map(text => text.split(':')[0]).sort(), ['STORY-SUPPORT', 'SUBTASK-SUPPORT']);
            assert.match(await page.getByRole('navigation', { name: 'Chosen scope path', exact: true }).innerText(), /AREA-A.*FEATURE-F/s);
            await openEligible(page, 'TASK-Q', transitions);
            const proof = await detailJson(page, 'Proof and acceptance history');
            assert.deepEqual(proof.acceptance, q.acceptanceHistory); assert.equal(proof.applicability.status, 'stale');
            const health = await detailJson(page, 'This record’s dated owner health'); assert.equal(health.status, 'unknown');
            await page.getByRole('button', { name: 'Back to previous context', exact: true }).click();
            await selectedPane(page).getByRole('heading', { name: 'Choose work to inspect', exact: true }).waitFor();
            await openEligible(page, 'TASK-P', transitions);
            const pProof = await detailJson(page, 'Proof and acceptance history');
            assert.deepEqual(pProof.proof, p.proofs); assert.equal(pProof.proof[0].summary, 'Observed the declared integration outcome in its exact owner');
            assert.ok((await selectedPane(page).innerText()).includes(p.ownerPath));
            const concerns = await observeConcernRequests(page);
            await selectedPane(page).getByRole('button', { name: 'Inspect path intent/shared.md', exact: true }).click();
            await page.getByRole('region', { name: 'Exact linked concerns', exact: true }).waitFor();
            assert.deepEqual(concerns.at(-1).request.query.paths, ['intent/shared.md']);
            assert.ok(concerns.at(-1).value.relationships.some(link => link.owner.itemId === 'TASK-P' && link.owner.ownerPath === p.ownerPath && link.relation === 'spec' && link.target.path === 'intent/shared.md'));
            await page.getByRole('button', { name: 'Back to previous context', exact: true }).click();
            await page.getByRole('region', { name: 'Exact linked concerns', exact: true }).waitFor({ state: 'detached' });
            await selectedPane(page).getByRole('heading', { name: /^TASK-P:/ }).waitFor();
            assert.match(await page.getByRole('navigation', { name: 'Chosen scope path', exact: true }).innerText(), /AREA-A.*FEATURE-F/s);
            assert.deepEqual(await eligibleIds(page), ['TASK-P', 'TASK-Q']);
            assert.equal(f.progress({ scopeId: 'FEATURE-F' }).metrics.total, 2); assert.equal(f.progress({ scopeId: 'FEATURE-F' }).metrics.currentlyVerified, 0);
            assertCanonicalFacts(f, before);
            await capture('exact-scope-intent-proof', 'A through F exposes only P/Q as delivery; exact intent and proof owners, stale accepted Q, excluded and supporting work retain their meanings');
            transitions('Enter A/F; inspect exclusions and support; read Q history/current gap; inspect P proof and exact intent path; return under A');
        } },
    { caseId: 'TC-TPT-204', owner: "WorkTracking/README.TaskTracking-Part6.md", variant: 'chosen-shared-path-and-removed-edge', name: 'Shared F retains the deliberately chosen A or B path and safely rejects a later removed tag to the area above',
        setup: async f => { await hierarchyFixture(f); },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            const before = canonicalFacts(f); const owner = f.view('FEATURE-F').ownerPath;
            const path = page.getByRole('navigation', { name: 'Chosen scope path', exact: true });
            await open(); await chooseDeliveryScope(page, 'AREA-A', transitions);
            await page.getByLabel('Find work', { exact: true }).fill('Integration outcome');
            await enterAreaInside(page, 'FEATURE-F', 'Shared integration capability', transitions); assert.deepEqual(await eligibleIds(page), ['TASK-P', 'TASK-Q']);
            await openEligible(page, 'TASK-P', transitions);
            await page.getByRole('button', { name: 'Back to previous context', exact: true }).click();
            await selectedPane(page).getByRole('heading', { name: 'Choose work to inspect', exact: true }).waitFor();
            assert.match(await path.innerText(), /AREA-A.*FEATURE-F/s);
            // Going back again leaves F for the area it was entered from, with the filter the reader had set there.
            await page.getByRole('button', { name: 'Back to previous context', exact: true }).click();
            await page.getByRole('heading', { name: 'Area progress', exact: true }).waitFor();
            assert.deepEqual(await scopeSteps(page), ['Whole project', 'Customer area A']);
            await page.getByRole('navigation').getByRole('button', { name: 'Work', exact: true }).click(); await scopeLine(page, 'AREA-A').waitFor();
            assert.equal(await page.getByLabel('Find work', { exact: true }).inputValue(), 'Integration outcome');
            assert.equal(f.progress({ scopeId: 'AREA-A' }).metrics.total, 2);
            // The same feature entered through its other product keeps that way in, and is the same one record.
            await chooseDeliveryScope(page, 'AREA-B', transitions); await enterAreaInside(page, 'FEATURE-F', 'Shared integration capability', transitions);
            assert.match(await path.innerText(), /Scope path:.*AREA-B.*FEATURE-F/s); assert.equal((await path.innerText()).includes('AREA-A'), false);
            assert.deepEqual(await eligibleIds(page), ['TASK-P', 'TASK-Q']); assert.equal(f.view('FEATURE-F').ownerPath, owner);
            await openEligible(page, 'TASK-P', transitions);
            await page.getByRole('button', { name: 'Back to previous context', exact: true }).click();
            await selectedPane(page).getByRole('heading', { name: 'Choose work to inspect', exact: true }).waitFor();
            assert.match(await path.innerText(), /Scope path:.*AREA-B.*FEATURE-F/s);
            assertCanonicalFacts(f, before);
            // Chosen by itself, an area that sits inside two areas is given neither as the way in.
            await chooseDeliveryScope(page, 'FEATURE-F', transitions);
            const direct = await path.innerText();
            assert.ok(direct.includes('FEATURE-F')); assert.equal(/AREA-A|AREA-B|Scope path:/.test(direct), false);
            await chooseDeliveryScope(page, 'AREA-A', transitions); await enterAreaInside(page, 'FEATURE-F', 'Shared integration capability', transitions);
            // A teammate removes the feature from A: the tag is on the feature's own record.
            await f.tag('FEATURE-F', { areaIds: ['AREA-B'] }); const changed = canonicalFacts(f);
            await page.getByRole('banner').getByRole('button', { name: 'Reread project', exact: true }).click();
            await page.getByRole('status').getByText(/Path unavailable/).waitFor();
            const safe = await path.innerText();
            assert.ok(safe.includes('FEATURE-F')); assert.equal(safe.includes('AREA-A'), false);
            assert.deepEqual(await eligibleIds(page), ['TASK-P', 'TASK-Q']); assertCanonicalFacts(f, changed);
            await capture('shared-path-safe-recovery', 'A/B entry preserves one F identity; direct entry invents no parent and a real removed tag yields a safe current F scope');
            transitions('A filtered return; enter through B; direct F; remove F from A through a real tag save; reread unavailable path');
        } },
    { caseId: 'TC-TPT-205', owner: "WorkTracking/README.TaskTracking-Part6.md", variant: 'generic-ungrouped-filter-choices', name: 'An area without a level and work in no area remain reachable while zero search results cannot redefine area progress',
        setup: async f => { await hierarchyFixture(f); },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            const before = canonicalFacts(f); const metrics = f.progress({ scopeId: 'AREA-A' }).metrics;
            await open();
            // Work in no area is counted for the whole project and reached from where the Overview says so.
            const outside = page.getByRole('region', { name: 'How each area stands', exact: true });
            assert.match(await outside.innerText(), /Not in any area: 1 task\. It counts for the whole project only\./);
            await outside.getByRole('button', { name: 'Inspect this task', exact: true }).click();
            await page.getByRole('heading', { name: 'Work', exact: true }).waitFor();
            assert.equal(await page.getByLabel('Not in any area', { exact: true }).isChecked(), true);
            const listed = page.getByRole('region', { name: 'Work list', exact: true }).getByRole('button', { name: /^[A-Z]+-[A-Z]+:/ });
            assert.deepEqual(await listed.evaluateAll(rows => rows.map(row => row.getAttribute('aria-label').split(':')[0])), ['TASK-U']);
            await listed.click();
            await selectedPane(page).getByRole('heading', { name: /^TASK-U:/ }).waitFor();
            await selectedPane(page).getByText('Not in any area', { exact: true }).waitFor();
            await chooseDeliveryScope(page, 'GENERIC-G', transitions);
            assert.deepEqual(await eligibleIds(page), ['TASK-Q']);
            assert.match(await page.getByRole('navigation', { name: 'Chosen scope path', exact: true }).innerText(), /Area GENERIC-G/);
            await chooseDeliveryScope(page, 'AREA-A', transitions);
            assert.deepEqual(await eligibleIds(page), ['TASK-P', 'TASK-Q']);
            await page.getByLabel('Find work', { exact: true }).fill('does-not-match');
            await page.getByText('No work matches these filters. Clear filters to return to the list.', { exact: true }).waitFor();
            assert.deepEqual(f.progress({ scopeId: 'AREA-A' }).metrics, metrics);
            await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
            assert.deepEqual(await eligibleIds(page), ['TASK-P', 'TASK-Q']);
            await page.getByRole('navigation').getByRole('button', { name: 'Overview', exact: true }).click();
            assert.match(await page.getByRole('main').innerText(), /2 eligible unique tasks/); assert.match(await page.getByRole('main').innerText(), /50\.0%/);
            assert.match(await page.getByRole('main').innerText(), /0 accepted tasks with proof that still applies/);
            assert.deepEqual(f.progress().hierarchy.untaggedTaskIds, ['TASK-U']); assertCanonicalFacts(f, before);
            await capture('generic-ungrouped-filter-scope', 'The area without a level and the task in no area remain usable; zero search matches and Clear filters retain A’s exact two-outcome denominator');
            transitions('Inspect the task in no area; the area without a level; select A; filter to zero; clear and reread unchanged scope');
        } },
    { caseId: 'TC-TPT-092', owner: "WorkTracking/README.TaskTracking-Part2.md", variant: 'attached-draft-reload', name: 'Reload retains the attached checkout and actor while discarding only the unsaved page draft',
        setup: async f => { await f.create('TASK-104', 'task', { title: 'Persisted export title', intent: 'Persisted selected export outcome' }); },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            const before = canonicalFacts(f); const original = f.view('TASK-104');
            await open(); await selectWork(page, 'TASK-104', transitions);
            await selectedPane(page).getByRole('button', { name: 'Refine work', exact: true }).click();
            await page.getByLabel('Title', { exact: true }).fill('Unsaved title lost on reload');
            await page.getByLabel('Intended outcome', { exact: true }).fill('Unsaved intent lost on reload');
            assert.equal(await page.getByLabel('Title', { exact: true }).inputValue(), 'Unsaved title lost on reload');
            assert.equal(await page.getByLabel('Intended outcome', { exact: true }).inputValue(), 'Unsaved intent lost on reload');
            assertCanonicalFacts(f, before);
            await page.reload(); await page.locator('main[aria-busy="false"]').waitFor();
            await page.getByRole('heading', { name: 'Project progress', exact: true }).waitFor();
            assert.equal(new URL(page.url()).hash, '');
            assert.equal(await page.locator('#root-context').innerText(), `Checkout: ${f.root}`);
            assert.match(await page.locator('#actor-context').innerText(), /Owner \(owner\)/);
            assert.equal(await page.getByRole('navigation').getByRole('button', { name: 'Unsaved draft', exact: true }).count(), 0);
            assert.equal(await page.getByText('Unsaved title lost on reload', { exact: true }).count(), 0);
            assert.equal(await page.getByText('Unsaved intent lost on reload', { exact: true }).count(), 0);
            await selectWork(page, 'TASK-104', transitions);
            assert.match(await selectedPane(page).innerText(), /Persisted export title/);
            assert.match(await selectedPane(page).innerText(), /Persisted selected export outcome/);
            await selectedPane(page).getByRole('button', { name: 'Refine work', exact: true }).click();
            assert.equal(await page.getByLabel('Title', { exact: true }).inputValue(), original.title);
            assert.equal(await page.getByLabel('Intended outcome', { exact: true }).inputValue(), original.intent);
            assert.deepEqual(f.view('TASK-104'), original); assertCanonicalFacts(f, before);
            await capture('attached-draft-reload', 'Actual reload retains the attached checkout and actor, discards unsaved page fields and rereads the unchanged persisted owner');
            transitions('Enter two unsaved fields; reload attached page; reread unchanged canonical work');
        } },
    { caseId: 'TC-TPT-213', owner: "WorkTracking/README.TaskTracking-Part6.md", variant: 'exact-concern-owner-and-retained-outside-draft', name: 'P-only concerns exclude Q until the exact shared specification is selected, without changing what is tagged to F',
        setup: async f => { await hierarchyFixture(f, { concerns: true }); },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            const before = canonicalFacts(f); const observations = await observeConcernRequests(page);
            await open(); await chooseDeliveryScope(page, 'FEATURE-F', transitions);
            assert.deepEqual(await eligibleIds(page), ['TASK-P']);
            assert.match(await (await disclosedList(page, 'Supporting work')).innerText(), /SUBTASK-SUPPORT/);
            const outside = await disclosedList(page, 'Outside delivery scope');
            assert.match(await outside.innerText(), /TASK-Q/); assert.match(await outside.innerText(), /SUBTASK-Z/);
            await outside.getByRole('button', { name: /^TASK-Q:/ }).click();
            await selectedPane(page).getByRole('heading', { name: /^TASK-Q:/ }).waitFor();
            await selectedPane(page).getByRole('button', { name: 'Refine work', exact: true }).click();
            await page.getByLabel('Title', { exact: true }).fill('Pending outside Q management edit');
            await keepDraftAndNavigate(page, 'Work');
            await retainDraftDuring(page, () => page.getByRole('region', { name: 'Eligible delivery tasks', exact: true }).getByRole('button', { name: /^TASK-P:/ }).click());
            await selectedPane(page).getByRole('heading', { name: /^TASK-P:/ }).waitFor();
            await retainDraftDuring(page, () => selectedPane(page).getByRole('button', { name: 'Inspect concerns for TASK-P', exact: true }).click());
            const concerns = page.getByRole('region', { name: 'Exact linked concerns', exact: true }); await concerns.waitFor();
            await concerns.getByText(/^Exact selection: TASK-P\./).waitFor();
            const pOnly = observations.at(-1); assert.equal(pOnly.status, 200);
            assert.deepEqual(pOnly.request, { query: { schemaVersion: 1, itemIds: ['TASK-P'] } });
            assert.deepEqual(pOnly.value.scope.itemIds, ['TASK-P']); assert.deepEqual(pOnly.value.scope.paths, []);
            assert.equal(pOnly.value.items.some(item => item.itemId === 'TASK-Q'), false);
            assert.equal(pOnly.value.relationships.some(link => link.owner.itemId === 'TASK-Q'), false);
            const declared = pOnly.value.relationships.find(link => link.owner.itemId === 'TASK-P' && link.relation === 'spec');
            assert.equal(declared.owner.ownerPath, f.record('TASK-P').ownerPath); assert.equal(declared.direction, 'outgoing');
            assert.deepEqual(declared.target, { path: 'intent/shared.md' });
            assert.match(fs.readFileSync(path.join(f.root, declared.target.path), 'utf8'), /^---\nid: SPEC-SHARED\n---\nOnly the declared integration outcome/m);
            assert.equal(await concerns.getByText(/TASK-Q.*declares spec/).count(), 0);
            const pSpecification = concerns.getByRole('listitem').filter({ hasText: `outgoing: TASK-P (${f.record('TASK-P').ownerPath}) declares spec;` });
            await retainDraftDuring(page, () => pSpecification.getByRole('button', { name: 'Inspect path intent/shared.md', exact: true }).click());
            await concerns.getByText(/^Exact selection: intent\/shared\.md\./).waitFor();
            const shared = observations.at(-1); assert.equal(shared.status, 200);
            assert.deepEqual(shared.request, { query: { schemaVersion: 1, paths: ['intent/shared.md'] } });
            assert.deepEqual(shared.value.scope.paths, ['intent/shared.md']); assert.deepEqual(shared.value.scope.itemIds, []);
            const incoming = shared.value.relationships.find(link => link.owner.itemId === 'TASK-Q' && link.relation === 'spec');
            assert.equal(incoming.direction, 'incoming'); assert.equal(incoming.owner.ownerPath, f.record('TASK-Q').ownerPath);
            assert.deepEqual(incoming.target, { path: 'intent/shared.md' });
            const qDeclaration = concerns.getByRole('listitem').filter({ hasText: `incoming: TASK-Q (${f.record('TASK-Q').ownerPath}) declares spec;` });
            assert.match(await qDeclaration.innerText(), /Original owner declares this exact selected target/);
            await retainDraftDuring(page, () => qDeclaration.getByRole('button', { name: 'Inspect item TASK-Q', exact: true }).click());
            await selectedPane(page).getByRole('heading', { name: /^TASK-Q:/ }).waitFor();
            assert.match(await selectedPane(page).innerText(), new RegExp(f.record('TASK-Q').ownerPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
            await retainDraftDuring(page, () => page.getByRole('button', { name: 'Back to previous context', exact: true }).click());
            await page.locator('main[aria-busy="false"]').waitFor();
            assert.deepEqual(await eligibleIds(page), ['TASK-P']);
            assert.match(await page.getByRole('navigation', { name: 'Chosen scope path', exact: true }).innerText(), /Delivery scope:.*FEATURE-F/);
            await page.getByRole('navigation').getByRole('button', { name: 'Unsaved draft', exact: true }).click();
            assert.equal(await page.getByLabel('Title', { exact: true }).inputValue(), 'Pending outside Q management edit');
            assert.deepEqual([...f.progress({ scopeId: 'FEATURE-F' }).scope.memberIds].sort(), ['SUBTASK-SUPPORT', 'TASK-P']);
            assert.equal(f.progress({ scopeId: 'FEATURE-F' }).metrics.total, 1); assertCanonicalFacts(f, before);
            await capture('exact-concerns-outside-draft', 'Actual P-only and exact SPEC-SHARED path concern results retain original Q ownership and its draft without adding Q or parent-linked Z to F');
            transitions('Read P-only concerns; deliberately select exact declared specification path; inspect Q owner; return to fixed F and retained Q draft');
        } },
    { caseId: 'TC-TPT-233', owner: "WorkTracking/README.TaskTracking-Part6.md", variant: 'pinned-path-and-forged-snapshot-entry', name: 'Pinned scoped reading and finite snapshot entries preserve their admitted source and refuse a forged entry',
        setup: async f => {
            await hierarchyFixture(f); f.config.taskTracking.levelLabels = { feature: 'Baseline feature' }; f.saveConfig();
            git(f, ['init']); git(f, ['add', 'docs', 'work', 'intent', 'src']); git(f, ['commit', '-m', 'Synthetic pinned hierarchy baseline']);
            f.hierarchyBaseline = git(f, ['rev-parse', 'HEAD']);
            // After the baseline, Q leaves the feature in the working copy and the project renames its levels.
            await f.tag('TASK-Q', { areaIds: ['GENERIC-G'] });
            f.config.taskTracking.levelLabels = { product: 'Personal area', feature: 'Local capability' }; f.saveConfig();
        },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            const before = canonicalFacts(f); const ref = f.hierarchyBaseline;
            assert.deepEqual(f.progress({ scopeId: 'FEATURE-F' }).scope.eligibleTaskIds, ['TASK-P']);
            const pinned = f.progress({ ref, scopeId: 'FEATURE-F' }); assert.deepEqual(pinned.scope.eligibleTaskIds, ['TASK-P', 'TASK-Q']);
            await open(); await chooseDeliveryScope(page, 'AREA-A', transitions, { ref }); await enterAreaInside(page, 'FEATURE-F', 'Shared integration capability', transitions);
            assert.deepEqual(await eligibleIds(page), ['TASK-P', 'TASK-Q']);
            assert.match(await page.locator('#source-context').innerText(), /Pinned local Git baseline/);
            assert.match(await page.locator('#actor-context').innerText(), /Read-only for this scope.*Remote freshness: unknown/);
            assert.match(await page.getByRole('navigation', { name: 'Chosen scope path', exact: true }).innerText(), /AREA-A.*Baseline feature FEATURE-F/);
            const report = await ensureReport(f.root, { ref, scopeId: 'FEATURE-F' }); assert.ok(['generated', 'current'].includes(report.status), JSON.stringify(report));
            const artifact = inspectReport(f.root, report.path);
            assert.equal(artifact.manifest.scope, `shared:${ref}`); assert.equal(artifact.manifest.scopeId, 'FEATURE-F');
            assert.equal(artifact.manifest.fingerprint, pinned.fingerprint);
            const reportUrl = pathToFileURL(path.join(f.root, report.path)); await page.goto(reportUrl.href);
            await page.locator('html.enhanced').waitFor(); assert.deepEqual(await reportEligibleIds(page), ['TASK-P', 'TASK-Q']);
            const delivery = page.getByRole('region', { name: 'Delivery scope', exact: true });
            assert.match(await delivery.innerText(), /Area FEATURE-F/); assert.match(await delivery.innerText(), /50\.0%/);
            // The pinned report names the level as its own commit configured it, never as the working copy does now.
            const areas = page.getByRole('region', { name: 'How each area stands', exact: true });
            assert.match(await areas.innerText(), /BASELINE FEATURE|Baseline feature/); assert.equal(/Local capability/i.test(await page.locator('body').innerText()), false);
            const inspected = page.locator('#inspected-context');
            assert.match(await inspected.innerText(), /^Inspected: Area FEATURE-F: Shared integration capability$/);
            // A forged entry names work this snapshot does not hold and a way in it never offered: neither is opened, and nothing is guessed in its place.
            const forged = new URL(reportUrl); forged.hash = new URLSearchParams({ item: 'record-TASK-U', path: JSON.stringify(['AREA-A', 'AREA-B', 'FEATURE-F']), inspection: 'inspect-path-not-declared' }).toString();
            await page.goto(forged.href); await page.locator('html.enhanced').waitFor();
            assert.match(await inspected.innerText(), /^Inspected: Area FEATURE-F: Shared integration capability$/);
            assert.equal(await page.locator('.work-row.is-open').count(), 0); assert.equal(await page.locator('.record-detail:visible').count(), 0);
            assert.equal(/TASK-U/.test(await page.locator('body').innerText()), false, 'Work outside the pinned scope is not shown');
            await page.getByLabel('Search work', { exact: true }).fill('does-not-match');
            assert.match(await inspected.innerText(), /^Inspected: Area FEATURE-F:/);
            await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
            // A record this snapshot does hold still opens, and is said to be what is inspected.
            await page.getByRole('list', { name: 'Eligible delivery tasks', exact: true }).getByRole('link', { name: /^TASK-Q:/ }).click();
            assert.match(await inspected.innerText(), /^Inspected: Area FEATURE-F: Shared integration capability \/ TASK-Q$/);
            assert.match(await delivery.innerText(), /Area FEATURE-F/); assert.deepEqual(await reportEligibleIds(page), ['TASK-P', 'TASK-Q']);
            assertCanonicalFacts(f, before);
            await capture('pinned-forged-path-recovery', 'Pinned F retains baseline vocabulary and P/Q while a forged entry opens nothing and a real record still opens');
            transitions('Read pinned A/F; inspect fixed baseline report; refuse a forged URL entry; filter and open a held record without worktree leakage');
        } },
    { caseId: 'TC-TPT-241', owner: "WorkTracking/README.TaskTracking-Part6.md", variant: 'workspace-keyboard-return-and-live-draft', name: 'Keyboard and narrow workspace reading preserve A/F return filters and the open area draft through report refresh',
        setup: async f => {
            await hierarchyFixture(f);
            await f.saved('update', 'FEATURE-F', { title: 'Shared integration capability with a deliberately long stakeholder outcome and return context' });
        },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            const title = 'Shared integration capability with a deliberately long stakeholder outcome and return context';
            const before = canonicalFacts(f); await open(); await chooseDeliveryScope(page, 'AREA-A', transitions); await enterAreaInside(page, 'FEATURE-F', title, transitions);
            await page.getByRole('navigation', { name: 'Chosen scope path', exact: true }).getByRole('button', { name: /^Open Feature FEATURE-F:/ }).click();
            await selectedPane(page).getByRole('button', { name: 'Refine work', exact: true }).click();
            await page.getByLabel('Level (optional)', { exact: true }).selectOption('module');
            await keepDraftAndNavigate(page, 'Work'); await page.getByLabel('Find work', { exact: true }).fill('Integration outcome');
            const p = page.getByRole('region', { name: 'Eligible delivery tasks', exact: true }).getByRole('button', { name: /^TASK-P:/ });
            await p.focus(); assert.equal(await p.evaluate(node => document.activeElement === node), true);
            await retainDraftDuring(page, () => p.press('Enter'));
            const pHeading = selectedPane(page).getByRole('heading', { name: /^TASK-P:/ }); await pHeading.waitFor();
            assert.equal(await pHeading.evaluate(node => document.activeElement === node), true);
            assert.deepEqual((await detailJson(page, 'Proof and acceptance history')).proof, f.view('TASK-P').proofs);
            await retainDraftDuring(page, () => page.getByRole('button', { name: 'Back to previous context', exact: true }).click());
            await page.locator('main[aria-busy="false"]').waitFor();
            assert.equal(await page.getByLabel('Find work', { exact: true }).inputValue(), 'Integration outcome');
            assert.match(await page.getByRole('navigation', { name: 'Chosen scope path', exact: true }).innerText(), /AREA-A.*FEATURE-F/);
            await page.getByRole('navigation').getByRole('button', { name: 'Unsaved draft', exact: true }).click();
            assert.equal(await page.getByLabel('Level (optional)', { exact: true }).inputValue(), 'module');
            await keepDraftAndNavigate(page, 'Changes');
            await page.getByRole('button', { name: 'Refresh offline report', exact: true }).click();
            await page.getByRole('status').getByText(/Offline report: (generated|current)/).waitFor();
            const artifact = inspectReport(f.root, reportPath({ scopeId: 'FEATURE-F' }));
            assert.equal(artifact.manifest.scopeId, 'FEATURE-F'); assert.equal(artifact.manifest.fingerprint, f.progress({ scopeId: 'FEATURE-F' }).fingerprint);
            await page.getByRole('navigation').getByRole('button', { name: 'Unsaved draft', exact: true }).click();
            assert.equal(await page.getByLabel('Level (optional)', { exact: true }).inputValue(), 'module');
            assertCanonicalFacts(f, before);
            if (page.viewportSize().width <= 480) assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
            await capture('keyboard-fixed-scope-live-draft', 'Keyboard return and actual fixed-F report refresh preserve selected path/filter and the still-open level draft at desktop or narrow width');
            transitions('Keyboard inspect P and return A/F; refresh real fixed-F report; return to live unsaved workspace draft');
        } },
    { caseId: 'TC-TPT-241', owner: "WorkTracking/README.TaskTracking-Part6.md", variant: 'enhanced-fixed-report-keyboard-and-print', name: 'Enhanced fixed-F report keyboard inspection and print retain P/Q while the opened area line and filters return safely',
        setup: async f => {
            await hierarchyFixture(f);
            await f.saved('update', 'FEATURE-F', { title: 'Shared integration capability with a deliberately long stakeholder outcome and return context' });
        },
        fn: async ({ fixture: f, page, capture, transitions }) => {
            const before = canonicalFacts(f); const report = await ensureReport(f.root, { scopeId: 'FEATURE-F' });
            assert.ok(['generated', 'current'].includes(report.status), JSON.stringify(report));
            await page.goto(pathToFileURL(path.join(f.root, report.path)).href); await page.locator('html.enhanced').waitFor();
            assert.deepEqual(await reportEligibleIds(page), ['TASK-P', 'TASK-Q']);
            const delivery = page.getByRole('region', { name: 'Delivery scope', exact: true });
            assert.match(await delivery.innerText(), /FEATURE-F/); assert.match(await delivery.innerText(), /50\.0%/);
            const fixedSummary = await delivery.innerText();
            assert.match(await (await disclosedList(page, 'Excluded tasks')).innerText(), /TASK-R[\s\S]*TASK-S/);
            assert.match(await (await disclosedList(page, 'Supporting work')).innerText(), /STORY-SUPPORT[\s\S]*SUBTASK-SUPPORT/);
            // The area's own line opens its record; leaving the record lands on that line again, and the fixed summary never moved.
            const line = page.getByRole('region', { name: 'How each area stands', exact: true }).getByRole('link', { name: /^Shared integration capability/ });
            await line.focus(); await line.press('Enter');
            const area = page.getByRole('article', { name: /^Shared integration capability/ }); await area.waitFor();
            assert.match(await page.locator('#inspected-context').innerText(), /FEATURE-F.*\/ FEATURE-F$/);
            assert.match(await area.innerText(), /Sits inside[\s\S]*AREA-A[\s\S]*Outside this snapshot[\s\S]*AREA-B/);
            assert.equal(await delivery.innerText(), fixedSummary); assert.deepEqual(await reportEligibleIds(page), ['TASK-P', 'TASK-Q']);
            await area.getByRole('link', { name: 'Back to Work', exact: true }).click();
            assert.equal(await line.evaluate(node => node === document.activeElement), true, 'Back returns to the area line the record was opened from');
            await page.getByLabel('Search work', { exact: true }).fill('Integration outcome');
            const p = page.getByRole('list', { name: 'Eligible delivery tasks', exact: true }).getByRole('link', { name: /^TASK-P:/ });
            await p.focus(); await p.press('Enter');
            const record = page.getByRole('article', { name: 'Integration outcome', exact: true }); await record.waitFor();
            assert.equal(await record.getByRole('heading', { name: 'Integration outcome', exact: true }).evaluate(node => document.activeElement === node), true);
            assert.match(await record.innerText(), /intent\/shared\.md/); assert.match(await record.innerText(), /src\/integration\.js/);
            await record.getByRole('link', { name: 'Back to Work', exact: true }).click();
            assert.equal(await page.getByLabel('Search work', { exact: true }).inputValue(), 'Integration outcome');
            assert.match(await page.locator('#inspected-context').innerText(), /^Inspected: Area FEATURE-F: [^/]*$/);
            await page.emulateMedia({ media: 'print' });
            assert.deepEqual(await reportEligibleIds(page), ['TASK-P', 'TASK-Q']);
            assert.equal(await page.getByRole('list', { name: 'Eligible delivery tasks', exact: true }).getByRole('link', { name: /^TASK-U:/ }).count(), 0);
            // Paper keeps every fact of the summary and drops only its one control, which nothing on paper can press.
            assert.equal(`${await delivery.innerText()}\n\nInspect remaining work`, fixedSummary);
            await page.emulateMedia({ media: 'screen' });
            if (page.viewportSize().width <= 480) assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
            assertCanonicalFacts(f, before);
            await capture('enhanced-fixed-scope-print-return', 'Fixed F P/Q list, unchanged summary, the opened area line and filter survive enhanced keyboard detail/return and print at the configured widths');
            transitions('Generate fixed F; open the area from its line and return to it; keyboard P detail; return exact filter; print P/Q without U');
        } },
    { caseId: 'TC-TPT-241', owner: "WorkTracking/README.TaskTracking-Part6.md", variant: 'native-fixed-scope-print-and-direct-edge', name: 'Without scripts native area, record and intent/proof anchors keep the exported F list exact in print', javaScriptEnabled: false,
        setup: async f => { await hierarchyFixture(f); },
        fn: async ({ fixture: f, page, capture, transitions }) => {
            const before = canonicalFacts(f); const report = await ensureReport(f.root, { scopeId: 'FEATURE-F' });
            assert.ok(['generated', 'current'].includes(report.status), JSON.stringify(report));
            await page.goto(pathToFileURL(path.join(f.root, report.path)).href);
            await page.getByText(/Scripts are disabled\. Every inspected record and its detail is listed above/).waitFor();
            assert.deepEqual(await reportEligibleIds(page), ['TASK-P', 'TASK-Q']);
            const delivery = page.getByRole('region', { name: 'Delivery scope', exact: true }); const fixedSummary = await delivery.innerText();
            assert.match(fixedSummary, /FEATURE-F/); assert.match(fixedSummary, /50\.0%/);
            assert.match(await (await disclosedList(page, 'Excluded tasks')).innerText(), /TASK-R[\s\S]*TASK-S/);
            assert.match(await (await disclosedList(page, 'Supporting work')).innerText(), /STORY-SUPPORT[\s\S]*SUBTASK-SUPPORT/);
            // The area's line is a native link to its record, which names the areas it sits inside as outside this snapshot.
            const areaLink = page.getByRole('region', { name: 'How each area stands', exact: true }).getByRole('link', { name: 'Shared integration capability', exact: true });
            const areaTarget = await areaLink.getAttribute('href'); await areaLink.focus(); await areaLink.press('Enter'); assert.equal(new URL(page.url()).hash, areaTarget);
            const area = page.getByRole('article', { name: 'Shared integration capability', exact: true }); assert.equal(await area.isVisible(), true);
            assert.match(await area.innerText(), /Sits inside[\s\S]*AREA-A[\s\S]*Outside this snapshot[\s\S]*AREA-B[\s\S]*Outside this snapshot/);
            assert.equal(await area.getByRole('link', { name: 'Back to Work', exact: true }).getAttribute('href'), '#work');
            // A row is a native link to its record, and the record's declared path to the exact concern for it.
            const p = page.getByRole('list', { name: 'Eligible delivery tasks', exact: true }).getByRole('link', { name: /^TASK-P:/ });
            const pTarget = await p.getAttribute('href'); await p.focus(); await p.press('Enter'); assert.equal(new URL(page.url()).hash, pTarget);
            const owner = page.getByRole('article', { name: 'Integration outcome', exact: true }); assert.equal(await owner.isVisible(), true);
            assert.match(await owner.innerText(), /intent\/shared\.md/); assert.match(await owner.innerText(), /src\/integration\.js/);
            assert.match(await owner.innerText(), /Areas[\s\S]*Shared integration capability[\s\S]*FEATURE-F/);
            await owner.getByRole('link', { name: 'Inspect path intent/shared.md', exact: true }).click();
            const intent = page.getByRole('region', { name: 'Exact linked concerns for intent/shared.md', exact: true });
            assert.match(await intent.innerText(), new RegExp(`TASK-P[\\s\\S]*${f.record('TASK-P').ownerPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*spec`));
            assert.match(await intent.innerText(), /Path availability is unverified/);
            await intent.getByRole('link', { name: 'Back to Work', exact: true }).click();
            assert.equal(new URL(page.url()).hash, '#work');
            await page.emulateMedia({ media: 'print' });
            assert.deepEqual(await reportEligibleIds(page), ['TASK-P', 'TASK-Q']);
            assert.equal(await page.getByRole('list', { name: 'Eligible delivery tasks', exact: true }).getByRole('link', { name: /^TASK-U:/ }).count(), 0);
            assert.equal(await delivery.innerText(), fixedSummary); assertCanonicalFacts(f, before);
            await capture('native-fixed-scope-print', 'Scripts-disabled native area, exact declared path and record links stay usable; fixed F print list is P/Q while U remains separate global inspection');
            transitions('Generate F; use native keyboard area and P anchors; inspect exact intent declaration; return to Work; print fixed P/Q without U');
        } },
    { caseId: 'TC-TPT-241', owner: "WorkTracking/README.TaskTracking-Part6.md", variant: 'fresh-source-and-generation-refusal', name: 'A real owned output obstruction preserves prior report and draft, then explicit refresh publishes the actual changed-source result',
        expectedConsole: [/Failed to load resource.*(?:422|500)/], setup: async f => { await hierarchyFixture(f); },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            const initial = await ensureReport(f.root, { scopeId: 'FEATURE-F' }); assert.ok(['generated', 'current'].includes(initial.status), JSON.stringify(initial));
            const target = path.join(f.root, initial.path); const prior = fs.readFileSync(target); const priorManifest = inspectReport(f.root, initial.path).manifest;
            await open(); await chooseDeliveryScope(page, 'FEATURE-F', transitions);
            await page.getByRole('navigation', { name: 'Chosen scope path', exact: true }).getByRole('button', { name: /^Open Feature FEATURE-F:/ }).click();
            await selectedPane(page).getByRole('button', { name: 'Refine work', exact: true }).click();
            await page.getByLabel('Level (optional)', { exact: true }).selectOption('module'); await keepDraftAndNavigate(page, 'Changes');
            // Isolated fail-safe variant: another process can replace an output path with a directory.
            // Preserve the actual previously generated artifact under an owned sibling path, then restore it in finally.
            f.write('src/integration.js', 'module.exports = "a teammate changed the governed source before report reopen";\n');
            const before = canonicalFacts(f); const current = f.progress({ scopeId: 'FEATURE-F' });
            assert.notEqual(current.fingerprint, priorManifest.fingerprint);
            const held = `${target}.owned-before-refusal`; fs.renameSync(target, held);
            try {
                fs.mkdirSync(target);
                const refused = page.waitForResponse(response => new URL(response.url()).pathname === '/api/report');
                await page.getByRole('button', { name: 'Refresh offline report', exact: true }).click(); const response = await refused;
                assert.equal(response.ok(), false);
                await page.getByRole('status').getByText(/^Report refresh remains pending:/).waitFor();
                assert.equal(await page.getByRole('status').getByText(/Offline report: current|Saved .* in the local checkout/).count(), 0);
                assert.deepEqual(fs.readFileSync(held), prior); assertCanonicalFacts(f, before);
                await page.getByRole('navigation').getByRole('button', { name: 'Unsaved draft', exact: true }).click();
                assert.equal(await page.getByLabel('Level (optional)', { exact: true }).inputValue(), 'module');
                await keepDraftAndNavigate(page, 'Changes');
            } finally {
                if (fs.existsSync(target) && fs.statSync(target).isDirectory()) fs.rmdirSync(target);
                fs.renameSync(held, target);
            }
            assert.deepEqual(fs.readFileSync(target), prior);
            await page.getByRole('button', { name: 'Refresh offline report', exact: true }).click();
            await page.getByRole('status').getByText(/Offline report: generated/).waitFor();
            const fresh = inspectReport(f.root, initial.path); assert.equal(fresh.manifest.fingerprint, current.fingerprint);
            assert.notEqual(fresh.manifest.fingerprint, priorManifest.fingerprint); assert.equal(fresh.manifest.scopeId, 'FEATURE-F');
            assert.notDeepEqual(fs.readFileSync(target), prior);
            assert.equal(f.view('TASK-P').verification.status, 'stale'); assert.equal(f.view('TASK-Q').verification.status, 'stale');
            await page.getByRole('navigation').getByRole('button', { name: 'Unsaved draft', exact: true }).click();
            assert.equal(await page.getByLabel('Level (optional)', { exact: true }).inputValue(), 'module'); assertCanonicalFacts(f, before);
            await capture('fresh-report-refusal-draft-retained', 'Actual output obstruction refuses refresh without a success claim; prior bytes and draft survive, then explicit retry renders the changed source fingerprint with stale proof');
            transitions('Change actual governed source; obstruct owned output; observe real refusal; restore only owned artifact; explicitly refresh fresh source while retaining draft');
        } },
    { caseId: 'TC-TPT-007', owner: "WorkTracking/README.TaskTracking.md", variant: 'live-report-in-app', name: 'The status report opens inside the workspace for the selected scope, follows saved and outside changes, and a refusal keeps the last report readable',
        expectedConsole: [/Failed to load resource.*422/], setup: async f => { await hierarchyFixture(f); },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            const control = f.bytes('TASK-Q');
            await open();
            // Whole project: opening the view generates the report through the one owner and shows that exact artifact.
            await shownReport(page, () => page.getByRole('navigation').getByRole('button', { name: 'Report', exact: true }).click());
            await page.getByRole('heading', { name: 'Status report', exact: true }).waitFor();
            const project = await frameManifest(page); const projectArtifact = inspectReport(f.root, reportPath());
            assert.equal(project.outputHash, projectArtifact.manifest.outputHash, 'The frame holds the generated project report, not a second rendering');
            assert.equal(project.scopeId, null); assert.equal(project.fingerprint, f.progress().fingerprint);
            assert.equal(await page.locator('iframe.report-frame').getAttribute('title'), 'Status report: Whole project, your working copy');
            assert.equal(await page.locator('iframe.report-frame').getAttribute('sandbox'), 'allow-scripts allow-modals');
            // While another report is on its way the frame still holds the last one read; the strip must say so, never "Up to date".
            {
                let release; const held = new Promise(resolve => { release = resolve; });
                await page.route('**/api/report-view', async route => { await held; await route.continue(); });
                await page.getByRole('button', { name: 'Refresh report', exact: true }).click();
                await page.locator('.report-state').getByText('Updating…', { exact: true }).waitFor();
                assert.equal(await page.locator('.report-state').getByText('Up to date', { exact: true }).count(), 0);
                await page.getByText('Showing the last report read: Whole project, your working copy', { exact: true }).waitFor();
                release();
                await page.locator('.report-state').getByText('Up to date', { exact: true }).waitFor();
                await page.unroute('**/api/report-view');
                assert.equal(await page.getByText(/^Showing the last report read:/).count(), 0);
            }
            // The report runs apart from the workspace page: it cannot reach the page or the session kept for it.
            assert.deepEqual(await reportFrame(page).locator('html').evaluate(() => {
                const denied = read => { try { read(); return 'reached'; } catch (error) { return error.name; } };
                return [denied(() => window.parent.document.title), denied(() => window.sessionStorage.length)];
            }), ['SecurityError', 'SecurityError']);
            // A chosen area: the report shows exactly the eligible work the workspace counts for that scope.
            await chooseDeliveryScope(page, 'FEATURE-F', transitions); const counted = await eligibleIds(page);
            assert.deepEqual(counted, ['TASK-P', 'TASK-Q']);
            await shownReport(page, () => page.getByRole('navigation').getByRole('button', { name: 'Report', exact: true }).click());
            const scoped = await frameManifest(page); const scopedPath = reportPath({ scopeId: 'FEATURE-F' });
            assert.equal(scoped.scopeId, 'FEATURE-F'); assert.equal(scoped.outputHash, inspectReport(f.root, scopedPath).manifest.outputHash);
            assert.deepEqual(await reportEligibleIds(reportFrame(page)), counted);
            assert.match(await page.locator('iframe.report-frame').getAttribute('title'), /^Status report: .*FEATURE-F.*, your working copy$/);
            assert.equal(await reportFrame(page).locator('.work-row[data-item-id="TASK-P"]').getAttribute('data-owner'), 'owner');
            // A long scope name is shortened, not laid over its neighbours: coverage and Reread stay apart and the source stays readable.
            const bar = await page.evaluate(() => {
                const box = node => { const { left, right, top, bottom, width } = node.getBoundingClientRect(); return { left, right, top, bottom, width }; };
                return { coverage: box(document.querySelector('#source-context .pill')), reread: box(document.querySelector('#session-tools .reread')),
                    scope: box(document.querySelector('[data-opens="scope-select"]')), source: box(document.querySelector('[data-opens="scope-ref"]')), page: document.documentElement.clientWidth };
            });
            const apart = (a, b) => a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top;
            assert.equal(apart(bar.coverage, bar.reread), true, 'Coverage and Reread do not overlap');
            assert.equal(apart(bar.scope, bar.source) && apart(bar.source, bar.coverage) && apart(bar.scope, bar.coverage), true, 'Scope, source and coverage do not overlap');
            assert.ok(bar.source.width >= 160 && bar.scope.width >= 160, 'Scope and source selectors keep a readable width');
            assert.ok(Math.max(bar.coverage.right, bar.reread.right, bar.source.right, bar.scope.right) <= bar.page, 'The bar stays inside the page');
            await capture('report-in-app', 'The selected area status report is readable inside the workspace with the same eligible tasks as the scope');
            // The frame and the document loaded in it survive a redraw that leaves the report as it was.
            const frameMarks = async () => [await page.locator('iframe.report-frame').evaluate(node => node.keptAcrossRedraws === true),
                await reportFrame(page).locator('html').evaluate(() => window.loadedOnce === true)];
            const markFrame = async () => { await page.locator('iframe.report-frame').evaluate(node => { node.keptAcrossRedraws = true; }); await reportFrame(page).locator('html').evaluate(() => { window.loadedOnce = true; }); };
            await markFrame();
            await shownReport(page, () => page.getByRole('button', { name: 'Refresh report', exact: true }).click());
            await page.getByRole('status').getByText(/Project reread/).waitFor();
            assert.equal((await frameManifest(page)).outputHash, scoped.outputHash, 'Nothing changed, so the same report is shown');
            assert.deepEqual(await frameMarks(), [true, true], 'An unchanged report is neither replaced nor loaded again');
            assert.equal(await isFocused(page.getByRole('button', { name: 'Refresh report', exact: true })), true);
            // A change saved in the workspace is in the report the next time it is opened; no separate refresh is asked for.
            await page.getByRole('navigation').getByRole('button', { name: 'Work', exact: true }).click();
            await openEligible(page, 'TASK-P', transitions);
            await selectedPane(page).getByRole('button', { name: 'Assign', exact: true }).click();
            await page.getByLabel('Responsible member').selectOption('peer'); await saveReviewed(page, transitions);
            assert.equal(f.view('TASK-P').assigneeId, 'peer');
            await shownReport(page, () => page.getByRole('navigation').getByRole('button', { name: 'Report', exact: true }).click());
            const saved = await frameManifest(page);
            assert.notEqual(saved.fingerprint, scoped.fingerprint); assert.equal(saved.fingerprint, f.progress({ scopeId: 'FEATURE-F' }).fingerprint);
            assert.equal(await reportFrame(page).locator('.work-row[data-item-id="TASK-P"]').getAttribute('data-owner'), 'peer');
            // A change made outside the workspace arrives with one refresh: the same frame, holding the new report.
            await markFrame();
            f.write('src/integration.js', 'module.exports = "a teammate changed the governed source while the report was open";\n');
            await shownReport(page, () => page.getByRole('button', { name: 'Refresh report', exact: true }).click());
            const outside = await frameManifest(page);
            assert.deepEqual(await frameMarks(), [true, false], 'A changed report is loaded into the frame that was already there');
            assert.notEqual(outside.fingerprint, saved.fingerprint); assert.equal(outside.fingerprint, f.progress({ scopeId: 'FEATURE-F' }).fingerprint);
            assert.equal(await page.getByRole('alert').count(), 0);
            // A person's own file in the report's place is never replaced: the refusal is stated and the last report stays readable.
            const target = path.join(f.root, scopedPath); const held = `${target}.owned-before-refusal`; const notes = 'A person kept their own notes here.\n';
            f.write('src/integration.js', 'module.exports = "changed again before the refused refresh";\n');
            fs.renameSync(target, held);
            try {
                fs.writeFileSync(target, notes);
                const refusal = await shownReport(page, () => page.getByRole('button', { name: 'Refresh report', exact: true }).click());
                assert.equal(refusal.status(), 422); assert.equal((await refusal.json()).code, 'HUMAN_COLLISION');
                const alert = page.getByRole('alert'); await alert.getByText('The report could not be brought up to date', { exact: true }).waitFor();
                assert.match(await alert.innerText(), /left as it is\. Move it away, then refresh the report\. The report below is the last one read: .*FEATURE-F/);
                assert.equal((await frameManifest(page)).fingerprint, outside.fingerprint, 'The last report read stays in the frame');
                assert.deepEqual(await reportEligibleIds(reportFrame(page)), counted);
                await page.getByText('Not updated', { exact: true }).waitFor();
                assert.equal(fs.readFileSync(target, 'utf8'), notes, 'The file a person put there is untouched');
                await capture('report-refusal-kept', 'A refused report refresh states the reason and what to do while the last report read stays in the frame');
            } finally {
                fs.rmSync(target, { force: true }); fs.renameSync(held, target);
            }
            await shownReport(page, () => page.getByRole('alert').getByRole('button', { name: 'Try again', exact: true }).click());
            const recovered = await frameManifest(page);
            assert.equal(recovered.fingerprint, f.progress({ scopeId: 'FEATURE-F' }).fingerprint); assert.notEqual(recovered.fingerprint, outside.fingerprint);
            assert.equal(await page.getByRole('alert').count(), 0); await page.getByText('Up to date', { exact: true }).waitFor();
            assert.deepEqual(f.bytes('TASK-Q'), control);
            transitions('Open project report in the workspace; choose an area and reopen; save an assignment and reopen; change source outside and refresh; obstruct with a personal file; restore and try again');
        } },
    { caseId: 'TC-TPT-242', owner: "WorkTracking/README.TaskTracking-Part7.md", variant: 'earlier-project-current-words', name: 'An earlier-vocabulary project is shown in the current words with its recorded numbers and a read-only notice, in the workspace and in its report',
        setup: async f => { f.earlier = await earlierProject(f); },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            // GIVEN work stored in the earlier words; WHEN it is read; THEN every word shown is current, every number is the recorded one and nothing is saved.
            const { ids, expected } = f.earlier; const stored = f.storedState();
            await open();
            await page.getByRole('heading', { name: 'Project progress', exact: true }).waitFor();
            const notice = sourceConditions(page);
            await notice.getByText('Migration required: this project is read-only', { exact: true }).waitFor();
            assert.match(await notice.innerText(), /It stores the earlier vocabulary\. Work is shown in the current words and every count is unchanged\. Preview the migration with the task tool: migrate --root <checkout> --dry-run\. Then run it without --dry-run\./);
            const overview = await page.getByRole('main').innerText();
            assert.match(overview, new RegExp(`${expected.total} eligible unique tasks`)); assert.equal(expected.remaining, 1);
            // One of a thing is named in the singular.
            assert.match(overview, /; 1 accepted task with proof that still applies; 1 eligible task not accepted\./);
            assert.match(await page.locator('.hero-count').innerText(), new RegExp(`^${expected.accepted}\\s+of ${expected.total} tasks accepted$`)); assert.match(overview, /50\.0%/);
            // The former finite-outcome group reads as an initiative with the figure of the tasks it listed, and no save is offered for it.
            const initiatives = page.getByRole('region', { name: 'How each initiative stands', exact: true });
            assert.equal(await initiatives.getByRole('img', { name: new RegExp(`^${expected.accepted} of ${expected.total} tasks accepted:`) }).count(), 1);
            assert.equal(await page.getByRole('main').getByRole('button', { name: /^Add an? /, exact: false }).count(), 0, 'No capture is offered from an empty list');
            assert.equal(await page.getByRole('button', { name: 'Capture work', exact: true }).isDisabled(), true);
            assert.match(await page.locator('#actor-context').innerText(), /Read-only for this scope/);
            await capture('earlier-vocabulary-read-only', 'Progress of an earlier-vocabulary project is shown in the current words under a persistent notice that names its migration; capture is unavailable');
            await page.getByRole('navigation').getByRole('button', { name: 'Work', exact: true }).click();
            await page.getByRole('heading', { name: 'Work', exact: true }).waitFor();
            const list = page.getByRole('region', { name: 'Work list', exact: true });
            assert.deepEqual([...new Set(await list.locator('.kind').allTextContents())].sort(), EARLIER_LIST_CHIPS);
            assert.equal(await list.getByRole('button', { name: new RegExp(`^${ids.remaining}: .*\\. Planned;`) }).count(), 1);
            await list.getByRole('button', { name: new RegExp(`^${ids.accepted}:`) }).click();
            await selectedPane(page).getByRole('heading', { name: new RegExp(`^${ids.accepted}:`) }).waitFor();
            await selectedPane(page).getByText(/^Migration required: this project stores the earlier vocabulary and is read-only/).waitFor();
            for (const action of ['Assign', 'Refine work', 'Edit links', 'Change state', 'Retire work', 'Attest record health']) assert.equal(await selectedPane(page).getByRole('button', { name: action, exact: true }).count(), 0, `${action} is not offered`);
            // The task names its two initiatives on its own record: the proposal it was linked to, and the former group that listed it.
            assert.equal(await selectedPane(page).getByRole('button', { name: /^Idea .*: show its progress$/ }).count(), 1);
            assert.equal(await selectedPane(page).getByRole('button', { name: /^Bet .*: show its progress$/ }).count(), 1);
            assert.equal(await selectedPane(page).getByRole('button', { name: 'Edit tags', exact: true }).isDisabled(), true, 'Tags cannot be changed in a read-only project');
            await list.getByRole('button', { name: new RegExp(`^${ids.group}:`) }).click();
            assert.equal(await selectedPane(page).locator('.record-head .kind').innerText(), 'BET');
            for (const action of ['Approve', 'Commit', 'Close as done', 'Cancel initiative']) assert.equal(await selectedPane(page).getByRole('button', { name: action, exact: true }).count(), 0, `${action} is not offered`);
            await shownReport(page, () => page.getByRole('navigation').getByRole('button', { name: 'Report', exact: true }).click());
            const frame = reportFrame(page); await frame.locator('html.enhanced').waitFor();
            await frame.getByText('Migration required: this project is read-only.', { exact: true }).waitFor();
            assert.match(await frame.locator('.source-strip').innerText(), /migrate --root <checkout> --dry-run/);
            assert.match(await frame.locator('.hero-count').innerText(), new RegExp(`^${expected.accepted}\\s+of ${expected.total} tasks accepted$`));
            assert.deepEqual([...new Set(await frame.locator('.work-row .kind').allTextContents())].sort(), EARLIER_REPORT_KINDS);
            assert.equal(await frame.locator(`.work-row[data-item-id="${ids.remaining}"]`).getAttribute('data-state'), 'planned');
            assert.deepEqual(f.storedState(), stored);
            await capture('earlier-vocabulary-report', 'The status report of the same project carries the same notice, words and numbers');
            await capture('earlier-vocabulary-report-frame', 'The report frame by itself shows the notice, the recorded numbers and the current words at this width', { frame: 'iframe.report-frame' });
            transitions('Read Overview; inspect a task and the former group in Work; open the status report');
        } },
    { caseId: 'TC-TPT-243', owner: "WorkTracking/README.TaskTracking-Part7.md", variant: 'save-refused-until-migration', name: 'A save sent to a project that stores the earlier vocabulary is refused as migration required, keeps the draft and changes nothing',
        expectedConsole: [/Failed to load resource.*422/], setup: async f => { await f.create(); },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            // GIVEN a change previewed in this page while the checkout stored the current vocabulary.
            await open();
            await selectWork(page, 'TASK-101', transitions);
            await selectedPane(page).getByRole('button', { name: 'Refine work', exact: true }).click();
            await page.getByLabel('Title', { exact: true }).fill('Export the selected rows only');
            await page.getByRole('button', { name: 'Preview change', exact: true }).click();
            await page.getByRole('heading', { name: 'Review this exact change', exact: true }).waitFor();
            // WHEN the checkout is switched to work that still stores the earlier vocabulary and the reviewed change is saved.
            await earlierProject(f); const stored = f.storedState();
            await page.getByRole('button', { name: 'Save reviewed change', exact: true }).click();
            // THEN the refusal names migration, the draft stays and no stored byte changes.
            await page.getByRole('alert').getByText(/^Migration required: this project stores the earlier vocabulary and is read-only; preview and run the tracker migration, then retry/).waitFor();
            assert.equal(await page.getByLabel('Title', { exact: true }).inputValue(), 'Export the selected rows only');
            assert.equal(await page.getByRole('status').getByText(/Saved .* in the local checkout/).count(), 0);
            assert.deepEqual(f.storedState(), stored);
            // AND the page has read the project again by itself: it is marked read-only at once, beside the refusal and the kept draft.
            await sourceConditions(page).getByText('Migration required: this project is read-only', { exact: true }).waitFor();
            assert.match(await page.locator('#actor-context').innerText(), /Read-only for this scope/);
            assert.equal(/Can save locally/.test(await page.locator('#actor-context').innerText()), false);
            assert.equal(await page.getByRole('button', { name: 'Capture work', exact: true }).isDisabled(), true);
            assert.equal(await page.getByRole('button', { name: 'Save reviewed change', exact: true }).isDisabled(), true);
            assert.equal(await page.getByRole('alert').getByText(/^Migration required: this project stores the earlier vocabulary and is read-only/).count(), 1);
            assert.equal(await page.getByLabel('Title', { exact: true }).inputValue(), 'Export the selected rows only');
            assert.deepEqual(f.storedState(), stored);
            await capture('migration-required-refusal', 'The refused save states migration required beside the retained draft, the project is marked read-only and nothing is reported as saved');
            // AND an explicit reread keeps that: the draft is kept, and neither a preview nor a save is offered for it.
            await page.getByRole('banner').getByRole('button', { name: 'Reread project', exact: true }).click();
            await page.getByRole('dialog', { name: 'Keep your draft?', exact: true }).waitFor();
            await page.getByRole('button', { name: 'Keep draft and continue', exact: true }).click();
            await sourceConditions(page).getByText('Migration required: this project is read-only', { exact: true }).waitFor();
            assert.equal(await page.getByLabel('Title', { exact: true }).inputValue(), 'Export the selected rows only');
            assert.equal(await page.getByRole('button', { name: 'Preview change', exact: true }).isDisabled(), true);
            assert.equal(await page.getByRole('button', { name: 'Save reviewed change', exact: true }).isDisabled(), true);
            assert.equal(await page.getByRole('button', { name: 'Capture work', exact: true }).isDisabled(), true);
            assert.deepEqual(f.storedState(), stored);
            transitions('Preview a refinement; switch the checkout to earlier-vocabulary work; save; reread and keep the draft');
        } },
    unreadableProject('TC-TPT-244', 'mixed-vocabularies', 'A project holding record locations of both vocabularies shows the named reason and no work, count, percentage or report',
        f => { f.write(HAND_WRITTEN_AREA, HAND_WRITTEN_BYTES); },
        /Mixed vocabularies: record locations from both vocabularies are present; nothing is counted or saved until one vocabulary remains \(earlier: [a-z, ]+; current: areas\)\.$/),
    unreadableProject('TC-TPT-249', 'migration-in-progress', 'A project whose migration is unfinished shows the named reason and its command, and no work, count, percentage or report',
        f => { f.write(journalPath('work'), JSON.stringify({ steps: [] })); },
        /Migration in progress: a vocabulary migration is unfinished; run the tracker migration again to complete it before reading or saving\. The task tool command is migrate --root <checkout>\.$/),
    { caseId: 'TC-TPT-244', owner: "WorkTracking/README.TaskTracking-Part7.md", variant: 'comparison-unreadable-checkout', name: 'Comparing a readable pinned ref with a checkout that holds both vocabularies names that reason and shows no difference, count or sharing hint',
        setup: async f => {
            // Two shared commits: the earlier-vocabulary project, readable, and the same project with a location of the current vocabulary added.
            f.readable = (await earlierProject(f, { commit: true })).oid;
            f.write(HAND_WRITTEN_AREA, HAND_WRITTEN_BYTES);
            git(f, ['add', '--', 'work']); git(f, ['commit', '-m', 'Both vocabularies']); f.unreadable = git(f, ['rev-parse', 'HEAD']);
            fs.rmSync(path.join(f.root, 'work/areas'), { recursive: true });
        },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            const mixed = /Mixed vocabularies: record locations from both vocabularies are present; nothing is counted or saved until one vocabulary remains \(earlier: [a-z, ]+; current: areas\)\./;
            const inspectRef = async ref => {
                await page.getByLabel('Shared local Git ref (optional)', { exact: true }).fill(ref);
                await page.getByRole('button', { name: 'Inspect selected scope', exact: true }).click();
            };
            // GIVEN a reader on a pinned ref that reads completely.
            await open();
            await page.getByRole('navigation').getByRole('button', { name: 'Changes', exact: true }).click();
            await page.getByRole('heading', { name: 'Changes and sharing', exact: true }).waitFor();
            await inspectRef(f.readable);
            await page.getByRole('status').getByText(/Project reread/).waitFor();
            const pinnedRecords = await page.getByRole('navigation').getByRole('button', { name: 'Work', exact: true }).locator('.tab-count').innerText();
            // WHEN the checkout comes to hold both vocabularies and is compared.
            f.write(HAND_WRITTEN_AREA, HAND_WRITTEN_BYTES); const stored = f.storedState();
            await page.getByRole('button', { name: 'Compare with current checkout', exact: true }).click();
            // THEN the comparison gives its own reason and claims no difference.
            const differs = page.getByRole('region', { name: 'What differs', exact: true });
            await differs.getByText(/^Nothing is compared: the current checkout could not be read\./).waitFor();
            assert.match(await differs.locator('.notice').innerText(), new RegExp(`^Nothing is compared: the current checkout could not be read\\. ${mixed.source} Resolve it, then compare again\\.$`));
            const changesTab = page.getByRole('navigation').getByRole('button', { name: 'Changes', exact: true });
            assert.equal(await changesTab.locator('.tab-count').count(), 0, 'The Changes tab carries no count');
            assert.equal(await changesTab.getAttribute('title'), null);
            assert.equal(await page.locator('.compare-link .pill').innerText(), 'Not compared');
            assert.equal(await page.locator('.diff-list, .diff-row, .file-list, .file-mark').count(), 0, 'No difference or file is listed');
            const shown = await page.getByRole('main').innerText();
            assert.equal(/\d+ (?:changed|only in|identical)|records? differs?|Record files that differ|Share them with your usual Git flow|No (?:inspected )?owner (?:content )?differences/.test(shown), false, 'No count, list or sharing hint is shown');
            assert.match(shown, /coverage unavailable/);
            // The pinned ref itself is still read as before.
            assert.equal(await page.getByRole('navigation').getByRole('button', { name: 'Work', exact: true }).locator('.tab-count').innerText(), pinnedRecords);
            assert.deepEqual(f.storedState(), stored);
            await capture('comparison-unreadable-checkout', 'The comparison names the mixed-vocabulary reason and shows no badge, count, difference list or sharing hint; the pinned ref is still read');
            // AND a pinned ref that itself holds both vocabularies says so where it says it could not be read.
            await inspectRef(f.unreadable);
            const notice = sourceConditions(page);
            await notice.getByText(`${f.unreadable} could not be read`, { exact: true }).waitFor();
            assert.match((await notice.locator('.banner-body').innerText()).trim(), new RegExp(`^Nothing from the current checkout is shown in its place\\. 1 reason is reported\\. ${mixed.source}$`));
            assert.equal(await page.locator('.tab-count').count(), 0, 'No tab carries a count');
            assert.deepEqual(f.storedState(), stored);
            await capture('pinned-ref-unreadable-reason', 'The banner of a pinned ref that could not be read names the mixed-vocabulary reason');
            // AND a comparison that cannot be made for another reason gives that reason: the checkout no longer holds the selected
            // scope. A finding about one unreadable record is listed before it and is not what the comparison says.
            fs.rmSync(path.join(f.root, 'work/areas'), { recursive: true });
            await open();
            await chooseDeliveryScope(page, 'EPIC-E', transitions, { ref: f.readable });
            fs.rmSync(path.join(f.root, 'work/projects/EPIC-E.md')); f.write('work/tasks/BROKEN.md', 'No frontmatter here.\n');
            await page.getByRole('navigation').getByRole('button', { name: 'Changes', exact: true }).click();
            await page.getByRole('button', { name: 'Compare with current checkout', exact: true }).click();
            await differs.getByText(/^Nothing is compared: the current checkout could not be read\./).waitFor();
            assert.equal(await differs.locator('.notice').innerText(), 'Nothing is compared: the current checkout could not be read. Selected scope has no unique area or initiative owner. Resolve it, then compare again.');
            assert.match(await differs.textContent(), /BROKEN\.md/, 'The record finding is still listed with the inspection limitations');
            transitions('Inspect a readable pinned ref; make the checkout hold both vocabularies; compare; inspect a pinned ref that holds both; compare a pinned scope the checkout no longer holds');
        } },
    { caseId: 'TC-TPT-249', owner: "WorkTracking/README.TaskTracking-Part7.md", variant: 'readable-then-migrating', name: 'A page that showed a report and a comparison keeps no number, badge or report once its checkout has an unfinished migration',
        setup: async f => {
            await f.create(); await f.accepted();
            git(f, ['init']); git(f, ['add', '--', 'docs', 'work']); git(f, ['commit', '-m', 'Synthetic shared baseline']); f.baseline = git(f, ['rev-parse', 'HEAD']);
            await f.saved('assign', 'TASK-101', { assigneeId: 'peer' });
        },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            const tab = name => page.getByRole('navigation').getByRole('button', { name, exact: true });
            // GIVEN a readable project whose report was shown and whose pinned baseline was compared with the checkout.
            await open();
            await shownReport(page, () => tab('Report').click());
            assert.match(await reportFrame(page).locator('.hero-count').innerText(), /^1\s+of 1 task accepted$/);
            await tab('Changes').click();
            await page.getByRole('heading', { name: 'Changes and sharing', exact: true }).waitFor();
            await page.getByLabel('Shared local Git ref (optional)', { exact: true }).fill(f.baseline);
            await page.getByRole('button', { name: 'Inspect selected scope', exact: true }).click();
            await page.getByRole('status').getByText(/Project reread/).waitFor();
            await page.getByRole('button', { name: 'Compare with current checkout', exact: true }).click();
            await page.getByText('TASK-101: owner difference', { exact: true }).waitFor();
            assert.equal(await tab('Changes').locator('.tab-count--warn').innerText(), '1');
            assert.equal(await page.locator('.compare-link .pill').innerText(), '1 record differs');
            await shownReport(page, () => tab('Report').click());
            assert.equal(await page.locator('iframe.report-frame').count(), 1);
            assert.equal(await tab('Changes').locator('.tab-count--warn').innerText(), '1', 'The comparison is still loaded while the report is shown');
            // WHEN a migration of the checkout stops part-way and the reader returns to the checkout.
            f.write(journalPath('work'), JSON.stringify({ steps: [] })); const stored = f.storedState();
            await sourceConditions(page).getByRole('button', { name: 'Inspect current checkout', exact: true }).click();
            // THEN the reason stands alone: no earlier number, badge or report is left in any view.
            const notice = sourceConditions(page);
            await notice.getByText('No work can be read from this project', { exact: true }).waitFor();
            assert.match((await notice.locator('.banner-body').innerText()).trim(), /^Migration in progress: a vocabulary migration is unfinished; run the tracker migration again to complete it before reading or saving\. The task tool command is migrate --root <checkout>\.$/);
            assert.match(await page.locator('#source-context').innerText(), /Coverage: unavailable/);
            for (const [view, title] of [['Report', 'Status report'], ['Changes', 'Changes and sharing'], ['Work', 'Work'], ['My work', 'My work'], ['People', 'People'], ['Overview', 'Project progress']]) {
                await tab(view).click();
                await page.getByRole('heading', { name: title, exact: true }).waitFor();
                const shown = await page.getByRole('main').innerText();
                assert.match(shown, /No work, count or report is shown while this source cannot be read\./);
                assert.equal(/\d+ (?:eligible|matching|open|records?|of \d)|\d%|TASK-101|Responsible for|differs?|Up to date|Written \d/.test(shown), false, `${view} keeps no number, work or report line`);
                assert.equal(await page.locator('.tab-count').count(), 0, `${view}: no tab carries a count`);
                assert.equal(await page.locator('iframe.report-frame').count(), 0, `${view} shows no report`);
                assert.equal(await page.locator('.diff-list, .file-list, .compare-link').count(), 0, `${view} shows no comparison`);
                if (view === 'Changes') await capture('readable-then-migrating', 'After a report and a comparison were shown, the unfinished-migration reason stands alone: no badge, count, difference or report frame remains');
            }
            assert.equal(await page.getByRole('button', { name: 'Capture work', exact: true }).isDisabled(), true);
            assert.deepEqual(f.storedState(), stored);
            transitions('Show the report; inspect and compare a pinned baseline; show its report; leave a migration unfinished; inspect the current checkout; visit every view');
        } },
    { caseId: 'TC-TPT-242', owner: "WorkTracking/README.TaskTracking-Part7.md", variant: 'read-without-vocabulary', name: 'A read that carries no vocabulary is refused whole, when the page opens and after a later read, and the draft returns once the workspace answers in full',
        setup: async f => { await f.create(); },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            // A workspace started before the tracker was updated answers without the vocabulary; a page loaded after the update asks it.
            const withoutWords = pick => async route => {
                const value = await (await route.fetch()).json();
                delete pick(value).vocabulary;
                await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(value) });
            };
            const refused = async () => {
                await page.getByRole('heading', { name: 'Project could not be opened', exact: true }).waitFor();
                assert.equal((await page.getByRole('main').innerText()).replace(/\s+/g, ' ').trim(),
                    'Project could not be opened This workspace response is unsupported. Relaunch the project tool with the matching framework version. Retry opening project');
                assert.equal(await page.getByRole('navigation').getByRole('button').count(), 0, 'No view is offered');
                assert.equal(await page.locator('#filter-status, #filter-kind, .tab-count, .station-name, .banner').count(), 0, 'No filter, count, station or source condition is drawn');
                assert.equal(/Unknown|TASK-101|Can save locally|Coverage:/.test(await page.locator('body').innerText()), false, 'Nothing read is shown');
                assert.equal(await page.getByRole('status').innerText(), '');
            };
            const before = f.storedState();
            // WHEN the page opens THEN it refuses the read and shows nothing from it.
            await page.route('**/api/session', withoutWords(value => value.snapshot));
            await open();
            await refused();
            await capture('read-without-vocabulary', 'A first read without the vocabulary is refused with the relaunch message; no station, filter, count or work is drawn');
            await page.unroute('**/api/session');
            await page.getByRole('button', { name: 'Retry opening project', exact: true }).click();
            await page.getByRole('heading', { name: 'Project progress', exact: true }).waitFor();
            // WHEN a later read answers without it, with a draft open, THEN the page stops the same way.
            await selectWork(page, 'TASK-101', transitions);
            await selectedPane(page).getByRole('button', { name: 'Refine work', exact: true }).click();
            await page.getByLabel('Title', { exact: true }).fill('Export the selected rows only');
            await page.route('**/api/inspect', withoutWords(value => value));
            await retainDraftDuring(page, () => page.getByRole('banner').getByRole('button', { name: 'Reread project', exact: true }).click());
            await refused();
            await capture('reread-without-vocabulary', 'A later read without the vocabulary replaces the whole workspace with the same relaunch message');
            // AND once the workspace answers in full, the page opens again with the draft it kept.
            await page.unroute('**/api/inspect');
            await page.getByRole('button', { name: 'Retry opening project', exact: true }).click();
            await page.getByRole('heading', { name: 'Refine work', exact: true }).waitFor();
            assert.equal(await page.getByLabel('Title', { exact: true }).inputValue(), 'Export the selected rows only');
            assert.equal(await page.getByRole('navigation').getByRole('button', { name: 'Unsaved draft', exact: true }).count(), 1);
            assert.deepEqual(f.storedState(), before);
            transitions('Open against a read without the vocabulary; retry; draft a refinement; reread against a read without the vocabulary; retry');
        } },
    { caseId: 'TC-TPT-250', owner: "WorkTracking/README.TaskTracking-Part7.md", variant: 'earlier-record-flagged', name: 'A record still stored in the earlier vocabulary is named with where it was found, earns no count and leaves coverage incomplete',
        setup: async f => {
            await f.create('TASK-1'); await f.accepted('TASK-1'); await f.create('TASK-2');
            // An older branch, combined outside the tracker, brings a record written in the earlier words to a location only that vocabulary used.
            f.strayBytes = '---\nid: P3\ntitle: Work written before the vocabulary change\nintent: Keep an earlier outcome readable\nstatus: draft\ntracking: {schemaVersion: 2, revision: 1, kind: project}\n---\nAuthored body stays as written.\n';
            f.write('work/projects/P3.md', f.strayBytes);
        },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            await open();
            await page.getByRole('heading', { name: 'Project progress', exact: true }).waitFor();
            const notice = sourceConditions(page);
            await notice.getByText('Inspection is incomplete', { exact: true }).waitFor();
            assert.match(await notice.innerText(), /no percentage is shown, and nothing can be changed until this is resolved\. 1 reason is reported\. Earlier-vocabulary record: not counted: P3 at work\/projects\/P3\.md\./);
            assert.match(await page.locator('#source-context').innerText(), /Coverage: partial/);
            const overview = await page.getByRole('main').innerText();
            assert.match(overview, /2 eligible unique tasks/); assert.match(overview, /Unknown; no complete nonempty denominator/);
            await page.getByRole('navigation').getByRole('button', { name: 'Work', exact: true }).click();
            await page.getByRole('heading', { name: 'Work', exact: true }).waitFor();
            const list = page.getByRole('region', { name: 'Work list', exact: true });
            assert.equal(await list.getByRole('button', { name: /^TASK-[12]:/ }).count(), 2); assert.equal(await list.getByRole('button', { name: /^P3:/ }).count(), 0);
            await capture('earlier-record-flagged', 'The flagged record is named with its location in the incomplete-coverage notice; only current-vocabulary work is listed and no percentage is shown');
            await shownReport(page, () => page.getByRole('navigation').getByRole('button', { name: 'Report', exact: true }).click());
            const frame = reportFrame(page); await frame.locator('html.enhanced').waitFor();
            assert.match(await frame.locator('.limits').innerText(), /P3: work\/projects\/P3\.md: EARLIER_VOCABULARY_RECORD: Earlier-vocabulary record: not counted/);
            assert.equal(await frame.locator('.hero-rate').count(), 0); assert.equal(await frame.locator('.work-row').count(), 2);
            assert.equal(fs.readFileSync(path.join(f.root, 'work/projects/P3.md'), 'utf8'), f.strayBytes);
            transitions('Read Overview; list Work; open the status report');
        } },
    { caseId: 'TC-TPT-261', owner: "WorkTracking/README.TaskTracking-Part8.md", variant: 'labels-inert-in-workspace', name: 'Level and type labels from configuration are shown by the workspace as text, never as markup, wherever a level or a type is named',
        setup: async f => {
            await treeProject(f);
            // Labels a project could declare: one would load and run if it were ever read as markup, one would become an element.
            f.labels = { level: '<img src=x onerror="window.trackerLabelExecuted=true">', type: '<b data-x=1>loud</b> & "quoted"' };
            f.longLabels = { level: 'L'.repeat(160), type: 'T'.repeat(160) };
            f.config.taskTracking.levelLabels = { feature: f.labels.level, product: f.longLabels.level };
            f.config.taskTracking.typeLabels = { feedback: f.labels.type, idea: f.longLabels.type }; f.saveConfig();
            // The accepted raw-label boundary is exercised through real records, without replacing the inspect response.
            await f.create('AREA-LABEL', 'area', { title: 'Accounts', intent: 'Organize accounting work', level: 'product', criteria: [] });
            await f.create('INIT-LABEL', 'initiative', { title: 'Review workflow', intent: 'Follow stakeholder decision', type: 'idea', criteria: [] });
            await f.create('TASK-LABEL', 'task', { title: 'Prepare monthly export', intent: 'Allow reviewer to read exactly selected accounts', areaIds: ['AREA-LABEL'], initiativeIds: ['INIT-LABEL'] });
        },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            const before = f.storedState();
            assert.equal(f.progress().coverage, 'complete', JSON.stringify(f.progress().diagnostics));
            await open();
            // The chip beside an area and beside an initiative is the label, character for character.
            const areas = page.getByRole('region', { name: 'How each area stands', exact: true });
            await areas.getByRole('button', { name: 'Open all areas', exact: true }).click();
            const feature = areas.locator('.area-line').filter({ hasText: 'Exports' });
            assert.equal(await feature.locator('.kind').textContent(), f.labels.level);
            const initiative = page.getByRole('region', { name: 'How each initiative stands', exact: true }).locator('.init-row').filter({ hasText: 'Late review' });
            assert.equal(await initiative.locator('.kind').textContent(), f.labels.type);
            await capture('labels-as-text-overview', 'A level label and a type label that look like markup are shown as their own characters');
            // Complete accepted labels and destination titles must stay readable inside narrow record tags.
            const originalViewport = page.viewportSize();
            await page.getByRole('navigation').getByRole('button', { name: 'Work', exact: true }).click();
            await page.getByRole('heading', { name: 'Work', exact: true }).waitFor();
            await page.getByRole('region', { name: 'Work list', exact: true }).getByRole('button', { name: /^TASK-LABEL:/ }).click();
            const selected = page.getByRole('region', { name: 'Selected work', exact: true });
            await selected.getByRole('heading', { name: /^TASK-LABEL:/ }).waitFor();
            assert.deepEqual(await selected.locator('.tag-word').allTextContents(), [f.longLabels.level, f.longLabels.type]);
            assert.deepEqual(await selected.locator('.tag-pick .tag').allTextContents(), [f.longLabels.level + 'Accounts', f.longLabels.type + 'Review workflow']);
            for (const width of [320, 390]) {
                await page.setViewportSize({ width, height: 844 });
                const layout = await selected.evaluate(card => {
                    const bounds = node => { const box = node.getBoundingClientRect(); return { left: box.left, right: box.right, width: box.width, height: box.height }; };
                    return { pageWidth: document.documentElement.clientWidth, pageScroll: document.documentElement.scrollWidth, card: bounds(card),
                        tags: [...card.querySelectorAll('.tag-pick')].map(control => {
                            const tag = control.querySelector('.tag'), word = tag.querySelector('.tag-word');
                            const range = document.createRange(); range.selectNodeContents(tag);
                            return { control: bounds(control), tag: bounds(tag), word: bounds(word), label: word.textContent,
                                textRects: [...range.getClientRects()].filter(box => box.width && box.height).map(box => ({ left: box.left, right: box.right })),
                                clipped: [control, tag, word].some(node => ['hidden', 'clip'].includes(getComputedStyle(node).overflowX)) };
                        }) };
                });
                assert.equal(layout.pageWidth, width);
                assert.ok(layout.pageScroll <= width + 1, `${width}px: accepted display labels must not make the page scroll sideways (${layout.pageScroll}px)`);
                assert.deepEqual(layout.tags.map(tag => tag.label), [f.longLabels.level, f.longLabels.type]);
                for (const tag of layout.tags) {
                    assert.ok(tag.control.width >= 44 && tag.control.height >= 44, `${width}px: a long-label tag keeps its full input target`);
                    assert.ok(tag.control.left >= layout.card.left - 1 && tag.control.right <= layout.card.right + 1, `${width}px: a long-label tag stays within the selected record`);
                    assert.ok(tag.tag.left >= tag.control.left - 1 && tag.tag.right <= tag.control.right + 1, `${width}px: the chip stays within its control`);
                    assert.ok(tag.word.left >= tag.tag.left - 1 && tag.word.right <= tag.tag.right + 1, `${width}px: the complete configured word stays within its chip`);
                    assert.ok(tag.textRects.length && tag.textRects.every(box => box.left >= tag.tag.left - 1 && box.right <= tag.tag.right + 1), `${width}px: every label/title text line stays within its chip`);
                    assert.equal(tag.clipped, false, `${width}px: containment must wrap text rather than hide it`);
                }
            }
            await page.setViewportSize(originalViewport);
            await page.getByRole('navigation').getByRole('button', { name: 'Overview', exact: true }).click();
            await page.getByRole('heading', { name: 'Project progress', exact: true }).waitFor();
            await page.locator('main[aria-busy="false"]').waitFor();
            // The same holds on the scope path, in the heading of the areas inside, and on the tags of a counted task.
            await feature.getByRole('button', { name: /^Exports: show this area/ }).click();
            await page.getByRole('heading', { name: 'Area progress', exact: true }).waitFor(); await page.locator('main[aria-busy="false"]').waitFor();
            assert.equal(await page.getByRole('navigation', { name: 'Scope path', exact: true }).locator('[aria-current="page"] .kind').textContent(), f.labels.level);
            const counted = page.getByRole('region', { name: 'Tasks counted here', exact: true });
            assert.deepEqual(await counted.getByRole('listitem').filter({ hasText: 'Second export' }).locator('.tag-word').allTextContents(), [f.labels.level, f.labels.type]);
            // A record states its level and its type in the same characters.
            await counted.getByRole('listitem').filter({ hasText: 'Second export' }).getByRole('button', { name: new RegExp(`^${f.labels.type.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} Late review: show its progress$`) }).click();
            await page.getByRole('heading', { name: 'Initiative progress', exact: true }).waitFor(); await page.locator('main[aria-busy="false"]').waitFor();
            assert.equal(await page.getByRole('navigation', { name: 'Scope path', exact: true }).locator('[aria-current="page"] .kind').textContent(), f.labels.type);
            // Capture offers them as the words of a choice.
            await page.getByRole('button', { name: 'Capture work', exact: true }).click();
            await page.getByRole('heading', { name: 'Capture work', exact: true }).waitFor();
            await page.getByLabel('Work kind', { exact: true }).selectOption('area');
            assert.ok((await page.locator('#edit-level option').allTextContents()).includes(f.labels.level));
            await page.getByLabel('Work kind', { exact: true }).selectOption('initiative');
            assert.equal(await page.getByRole('radio', { name: f.labels.type, exact: true }).count(), 1);
            // Nothing a label carried became an element, was fetched or ran.
            assert.equal(await page.locator('main img, [data-x]').count(), 0);
            assert.equal(await page.evaluate(() => window.trackerLabelExecuted), undefined);
            assert.deepEqual(f.storedState(), before);
            transitions('Read the area and initiative lists; read complete 160-character labels in record tags at 320px and 390px; return to Overview; scope into the labelled feature; scope into the labelled initiative; open capture for an area and an initiative');
        } },
    { caseId: 'TC-TPT-241', owner: "WorkTracking/README.TaskTracking-Part6.md", variant: 'overview-areas-and-initiatives', name: 'Overview states every area in a tree whose levels all start closed and open one by one, and every initiative against its due date, each with the figure the read supplies',
        setup: async f => { await treeProject(f); },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            const read = f.progress({ figures: true }); const before = f.storedState();
            assert.equal(read.figures.status, 'complete');
            const figure = id => [...read.figures.areas, ...read.figures.initiatives].find(entry => entry.id === id);
            // What a line states beside its name: the count, the rate and the name of its meter, as the page shows them.
            const stated = async line => [(await line.locator('.fig-count').textContent()).trim(), await line.locator('.fig-rate').innerText(), await line.getByRole('img').getAttribute('aria-label')];
            const expected = entry => [`${entry.accepted} of ${entry.total} ${entry.total === 1 ? 'task' : 'tasks'} accepted`, `${entry.percentage.toFixed(1)}%`,
                `${entry.accepted} of ${entry.total} ${entry.total === 1 ? 'task' : 'tasks'} accepted: ${[[entry.currentlyVerified, 'with current proof'], [entry.accepted - entry.currentlyVerified, 'with proof not current'], [entry.remaining, 'not accepted yet']].filter(([total]) => total).map(([total, words]) => `${total} ${words}`).join(', ')}`];
            await open();
            const areas = page.getByRole('region', { name: 'How each area stands', exact: true });
            const areaLine = title => areas.locator('.area-line').filter({ has: page.getByRole('button', { name: new RegExp(`^${title}: show this area`) }) });
            // Every level starts closed: the areas at the top of the project are shown, and none of the areas inside them.
            const shownAreas = () => areas.locator('.area-line .name-link').evaluateAll(nodes => nodes.filter(node => node.getClientRects().length).map(node => node.textContent));
            assert.deepEqual(await shownAreas(), ['Back office', 'Unsorted']);
            const top = areas.getByRole('button', { name: /the areas inside Back office$/ });
            assert.deepEqual([await top.getAttribute('aria-expanded'), await top.getAttribute('aria-label')], ['false', 'Show the areas inside Back office']);
            await top.click();
            assert.deepEqual(await shownAreas(), ['Back office', 'Accounts', 'Billing', 'Unsorted']);
            // Each area's line states exactly what the read supplies for that area: the page works no figure out.
            for (const [id, title] of [['APP', 'Back office'], ['PRODUCT-A', 'Accounts'], ['PRODUCT-B', 'Billing'], ['LOOSE', 'Unsorted']]) assert.deepEqual(await stated(areaLine(title)), expected(figure(id)), id);
            // A level opens no further than it was asked: the level under it opens on request, by a real button that says what it will do.
            assert.equal(await areas.getByRole('button', { name: /^Exports: show this area/ }).count(), 0, 'A deeper level is closed until it is opened');
            const toggle = areas.getByRole('button', { name: /the areas inside Accounts$/ });
            assert.deepEqual([await toggle.getAttribute('aria-expanded'), await toggle.getAttribute('aria-label')], ['false', 'Show the areas inside Accounts']);
            await toggle.focus(); await toggle.press('Enter');
            assert.deepEqual([await toggle.getAttribute('aria-expanded'), await toggle.getAttribute('aria-label'), await isFocused(toggle)], ['true', 'Hide the areas inside Accounts', true]);
            assert.deepEqual(await stated(areaLine('Exports')), expected(figure('FEATURE-X')));
            // An area inside two areas is listed once, under the first; the other has nothing to open.
            assert.equal(await areas.getByRole('button', { name: /^Exports: show this area/ }).count(), 1);
            assert.equal(await areas.getByRole('button', { name: /the areas inside Billing$/ }).count(), 0);
            // Level then title, and the area without a level last.
            assert.deepEqual(await areas.locator('.area-line .name-link').allTextContents(), ['Back office', 'Accounts', 'Exports', 'Billing', 'Unsorted']);
            // A parent's line is its own count, and the page says lines are never added together.
            assert.ok(figure('APP').total < figure('PRODUCT-A').total + figure('PRODUCT-B').total);
            await areas.getByText('A task in several areas counts in each of them, so lines are never added together.', { exact: true }).waitFor();
            assert.match(await areas.locator('.strip').innerText(), /^Not in any area: 1 task\. It counts for the whole project only\./);
            // Initiatives: overdue first, then by due date, then undated, and the closed one under its own head.
            const initiatives = page.getByRole('region', { name: 'How each initiative stands', exact: true });
            assert.deepEqual(await initiatives.locator('.init-row .name-link').allTextContents(), ['Late review', 'Next release', 'An idea to weigh', 'Finished outcome']);
            const row = title => initiatives.locator('.init-row').filter({ has: page.getByRole('button', { name: new RegExp(`^${title}: open this initiative`) }) });
            const facts = async title => (await row(title).locator('.init-facts').innerText()).replace(/\s*\n\s*/g, ' | ');
            assert.deepEqual([await row('Late review').locator('.kind').textContent(), await facts('Late review')], ['Feedback', 'Committed | High priority | Overdue: was due 15 Jan 2026']);
            assert.deepEqual([await row('Next release').locator('.kind').textContent(), await facts('Next release')], ['Initiative', 'Draft | Low priority | Due 1 Jan 2999']);
            assert.deepEqual([await row('An idea to weigh').locator('.kind').textContent(), await facts('An idea to weigh')], ['Idea', 'Draft | No priority level | No due date']);
            for (const [id, title] of [['INIT-LATE', 'Late review'], ['INIT-SOON', 'Next release'], ['INIT-DONE', 'Finished outcome']]) assert.deepEqual(await stated(row(title)), expected(figure(id)), id);
            // An initiative with no linked task states that no percentage applies, and draws no meter and no number.
            assert.equal(await row('An idea to weigh').getByText('No linked tasks yet, so no percentage applies. That is not the same as zero percent.', { exact: true }).count(), 1);
            assert.equal(await row('An idea to weigh').locator('.meter, .fig-count, .fig-rate').count(), 0);
            assert.equal(await initiatives.locator('.sub-head').innerText(), 'Closed');
            assert.deepEqual(await initiatives.locator('.sub-head + .init-list .name-link').allTextContents(), ['Finished outcome'], 'The closed initiative stands under the Closed head');
            assert.match(await facts('Finished outcome'), /^Done \| Closed \d{1,2} [A-Z][a-z]{2} \d{4}$/);
            // The lifecycle line counts delivery work only, and says so.
            const standing = page.getByRole('region', { name: 'Where work stands', exact: true });
            const delivery = read.items.filter(item => item.lifecycle === 'delivery');
            assert.match(await standing.innerText(), new RegExp(`${delivery.length} open records by recorded state, counting tasks, stories and subtasks only\\. Initiatives and areas are not counted here\\.`));
            assert.equal((await standing.locator('.station .count').allTextContents()).reduce((sum, total) => sum + Number(total), 0), delivery.length);
            await capture('overview-areas-initiatives', 'Areas stand in a tree with the level under Accounts opened, initiatives in due order with the closed one last, each with its meter, count and rate');
            // An initiative's title opens its record.
            await row('Late review').getByRole('button', { name: /^Late review: open this initiative/ }).click();
            await selectedPane(page).getByRole('heading', { name: /^INIT-LATE:/ }).waitFor();
            assert.deepEqual(f.storedState(), before);
            transitions('Open the level under Back office; read each area line; open the level under Accounts by keyboard; read the initiative list; open an initiative');
        } },
    { caseId: 'TC-TPT-233', owner: "WorkTracking/README.TaskTracking-Part6.md", variant: 'scope-in-and-back-out', name: 'Scoping into an area or an initiative restates the Overview for that scope under a path of the way in, and each step of the path widens the scope again',
        setup: async f => { await treeProject(f); },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            const read = f.progress({ figures: true }); const before = f.storedState();
            const rateOf = id => `${read.figures.areas.find(entry => entry.id === id).percentage.toFixed(1)}%`;
            const areas = () => page.getByRole('region', { name: 'How each area stands', exact: true });
            const path = page.getByRole('navigation', { name: 'Scope path', exact: true });
            // A scoped read is asked for by the exact identity of the area or initiative, and the page waits for it.
            const scopedTo = id => page.waitForResponse(response => new URL(response.url()).pathname === '/api/inspect' && (response.request().postDataJSON()?.scopeId || '') === id);
            const settle = async reading => { await reading; await page.locator('main[aria-busy="false"]').waitFor(); };
            await open();
            assert.equal(await path.count(), 0, 'The whole project has no scope path');
            await areas().getByRole('button', { name: 'Open all areas', exact: true }).click();
            await settle((async () => { const reading = scopedTo('FEATURE-X'); await areas().getByRole('button', { name: /^Exports: show this area/ }).click(); await reading; })());
            await page.getByRole('heading', { name: 'Area progress', exact: true }).waitFor();
            // The path is the way the reader came in, each step with the rate the read states for it, the last one being the scope.
            assert.deepEqual(await scopeSteps(page), ['Whole project', 'Back office', 'Accounts', 'Exports']);
            assert.deepEqual(await path.locator('.path-step .fig-rate').allTextContents(), [`${read.metrics.percentage.toFixed(1)}%`, rateOf('APP'), rateOf('PRODUCT-A'), rateOf('FEATURE-X')]);
            assert.equal(await path.locator('[aria-current="page"]').locator('strong').innerText(), 'Exports'); assert.equal(await path.locator('[aria-current="page"]').count(), 1);
            const scoped = f.progress({ scopeId: 'FEATURE-X' }).metrics;
            assert.match(await page.locator('.hero-count').innerText(), new RegExp(`^${scoped.accepted}\\s+of ${scoped.total} tasks accepted$`));
            await page.getByRole('region', { name: 'Area health', exact: true }).waitFor();
            const counted = page.getByRole('region', { name: 'Tasks counted here', exact: true });
            assert.deepEqual(await counted.locator('.queue .id').allTextContents(), f.progress({ scopeId: 'FEATURE-X' }).scope.eligibleTaskIds);
            assert.match(await page.locator('#source-context').innerText(), /Scope\s+Feature FEATURE-X: Exports/);
            await capture('scoped-to-area', 'The Overview is restated for the feature, under a path from the whole project through the areas the reader came through');
            // A step of the path widens the scope to that area, which then shows the areas inside it with what is still open in each.
            await settle((async () => { const reading = scopedTo('PRODUCT-A'); await path.getByRole('button', { name: /^Accounts: widen the scope to here/ }).click(); await reading; })());
            assert.deepEqual(await scopeSteps(page), ['Whole project', 'Back office', 'Accounts']);
            const inside = page.getByRole('region', { name: 'Areas inside this product', exact: true });
            assert.match(await inside.locator('.area-line').filter({ hasText: 'Exports' }).locator('.fig-rest').innerText(), /^1 remaining, 1 with current proof$/);
            // The same feature entered through the other product keeps that way in: the path is the one taken, never another.
            await settle((async () => { const reading = scopedTo(''); await path.getByRole('button', { name: /^Whole project: widen the scope to here/ }).click(); await reading; })());
            await page.getByRole('heading', { name: 'Project progress', exact: true }).waitFor();
            assert.equal(await path.count(), 0); assert.match(await page.locator('#source-context').innerText(), /Scope\s+Whole project/);
            await settle((async () => { const reading = scopedTo('PRODUCT-B'); await areas().getByRole('button', { name: /^Billing: show this area/ }).click(); await reading; })());
            await settle((async () => { const reading = scopedTo('FEATURE-X'); await page.getByRole('region', { name: 'Areas inside this product', exact: true }).getByRole('button', { name: /^Exports: show this area/ }).click(); await reading; })());
            assert.deepEqual(await scopeSteps(page), ['Whole project', 'Back office', 'Billing', 'Exports']);
            // A tag on a counted task scopes to the initiative it names: one step from the whole project, with its own health and its linked tasks.
            await settle((async () => { const reading = scopedTo('INIT-LATE'); await page.getByRole('region', { name: 'Tasks counted here', exact: true }).getByRole('button', { name: /^Feedback Late review: show its progress/ }).first().click(); await reading; })());
            await page.getByRole('heading', { name: 'Initiative progress', exact: true }).waitFor();
            assert.deepEqual(await scopeSteps(page), ['Whole project', 'Late review']);
            await page.getByRole('region', { name: 'Initiative health', exact: true }).waitFor();
            assert.deepEqual(await page.getByRole('region', { name: 'Tasks counted here', exact: true }).locator('.queue .id').allTextContents(), f.progress({ scopeId: 'INIT-LATE' }).scope.eligibleTaskIds);
            assert.equal(await page.getByRole('region', { name: /^Areas inside this / }).count(), 0, 'An initiative holds no area');
            await capture('scoped-to-initiative', 'The Overview is restated for the initiative, one step from the whole project');
            await settle((async () => { const reading = scopedTo(''); await path.getByRole('button', { name: /^Whole project: widen the scope to here/ }).click(); await reading; })());
            await page.getByRole('heading', { name: 'Project progress', exact: true }).waitFor();
            assert.deepEqual(f.storedState(), before);
            transitions('Scope into a feature through its product; widen to the product; back out; enter the same feature through its other product; scope to an initiative from a tag; back out');
        } },
    { caseId: 'TC-TPT-268', owner: "WorkTracking/README.TaskTracking-Part9.md", variant: 'edit-tags-end-to-end', name: 'A task is tagged to areas and initiatives from its own record through a search that never lists one control per record, only that task changes, and a change to one relation names that relation alone',
        setup: async f => {
            await treeProject(f);
            // Enough areas that a list of every one of them would be a wall of controls.
            for (let n = 1; n <= 12; n++) await f.create(`LEDGER-${n}`, 'area', { title: `Ledger part ${n}`, level: 'feature', areaIds: ['PRODUCT-B'] });
        },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            const others = canonicalFacts(f, ['TASK-3']); const before = f.record('TASK-3');
            await open(); await selectWork(page, 'TASK-3', transitions);
            // The record shows where it belongs, each tag being a control.
            assert.deepEqual(await selectedPane(page).locator('.tag-pick').evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-label'))),
                ['Product Billing: show its progress', 'Initiative Next release: show its progress']);
            await selectedPane(page).getByRole('button', { name: 'Edit tags', exact: true }).click();
            await page.getByRole('heading', { name: 'Edit tags', exact: true }).waitFor();
            // Until the reader types, the picker lists what is chosen and nothing to choose from: no control per record.
            const main = page.getByRole('main');
            assert.equal(await main.getByRole('checkbox').count(), 0);
            assert.deepEqual(await page.getByRole('list', { name: 'Areas on this task', exact: true }).locator('strong').allTextContents(), ['Billing']);
            const areaSearch = page.getByLabel('Find an area', { exact: true }); const matches = page.getByRole('group', { name: 'Matching areas', exact: true });
            const status = page.locator('fieldset.picker').first().getByRole('status');
            assert.equal(await status.innerText(), 'Type a name. 17 areas can be chosen here.');
            // A broad search shows only the first few matches and says how many there are.
            await areaSearch.fill('ledger');
            assert.equal(await matches.getByRole('checkbox').count(), 8);
            assert.equal(await status.innerText(), '12 of 17 areas match. Type more to narrow the list.');
            await areaSearch.fill('zzz'); assert.equal(await status.innerText(), 'No area matches “zzz”.'); assert.equal(await main.getByRole('checkbox').count(), 0);
            await areaSearch.fill('exp');
            assert.equal(await status.innerText(), '1 of 17 areas matches.');
            // A match carries a stable identity of its own, so it is found again after the form redraws around the choice.
            assert.equal(await matches.getByRole('checkbox').count(), 1);
            await page.locator('#pick-areaIds-FEATURE-X').check();
            assert.equal(await isFocused(page.locator('#pick-areaIds-FEATURE-X')), true, 'Ticking a match leaves the reader on it');
            assert.deepEqual(await page.getByRole('list', { name: 'Areas on this task', exact: true }).locator('strong').allTextContents(), ['Billing', 'Exports']);
            assert.equal(await page.getByRole('list', { name: 'Areas on this task', exact: true }).getByText('Added', { exact: true }).count(), 1);
            // An entry is removed by its own button, and the reader is handed to the search field.
            await page.getByRole('button', { name: 'Remove the area Billing', exact: true }).click();
            assert.deepEqual(await page.getByRole('list', { name: 'Areas on this task', exact: true }).locator('strong').allTextContents(), ['Exports']);
            assert.equal(await isFocused(areaSearch), true);
            await page.getByLabel('Find an initiative', { exact: true }).fill('late');
            assert.equal(await page.getByRole('group', { name: 'Matching initiatives', exact: true }).getByRole('checkbox').count(), 1);
            await page.locator('#pick-initiativeIds-INIT-LATE').check();
            assert.deepEqual(await page.getByRole('list', { name: 'Initiatives on this task', exact: true }).locator('strong').allTextContents(), ['Next release', 'Late review']);
            // The exact change names only the two tag lists, and the review says where the task will count.
            const preview = await exactPreview(page, 'Review the exact change');
            assert.deepEqual(preview.change, { areaIds: ['FEATURE-X'], initiativeIds: ['INIT-SOON', 'INIT-LATE'] });
            assert.deepEqual(await page.locator('.diff thead th').allTextContents(), ['Field', 'Now', 'After saving'], 'A change of tags is reviewed as now against after saving');
            assert.equal(await page.getByRole('heading', { name: 'Review this exact change', exact: true }).count(), 0);
            const counting = page.locator('.proof-panel').filter({ hasText: 'Where this task will count' });
            assert.match(await counting.innerText(), /Newly counted: Exports and Accounts\./);
            assert.match(await counting.innerText(), /Still counted: Billing and Back office; the initiatives Next release and Late review\. The whole project still counts this task once\./);
            assert.deepEqual(f.bytes('TASK-3'), before.bytes, 'A preview saves nothing');
            await capture('edit-tags-review', 'The chosen areas and initiatives, the exact change and where the task will count, before anything is saved');
            await page.getByRole('button', { name: 'Save tags to your checkout', exact: true }).click();
            await page.getByRole('status').getByText(/Saved TASK-3 in the local checkout/).waitFor();
            // The tag is stored on the task itself: its other links, state and criteria stand, and no area or initiative record changed.
            const after = f.record('TASK-3');
            assert.deepEqual(after.tracking.links, [{ relation: 'area', itemId: 'FEATURE-X' }, { relation: 'initiative', itemId: 'INIT-SOON' }, { relation: 'initiative', itemId: 'INIT-LATE' }]);
            assert.equal(after.revision, before.revision + 1); assert.equal(after.tracking.history.at(-1).operation, 'tag');
            assert.equal(after.data.status, before.data.status); assert.deepEqual(after.tracking.criteria, before.tracking.criteria); assert.equal(after.body, before.body);
            assertCanonicalFacts(f, others);
            // The record shows the new tags at once, and the feature now counts the task.
            await selectedPane(page).getByRole('heading', { name: /^TASK-3:/ }).waitFor();
            assert.deepEqual(await selectedPane(page).locator('.tag-pick').evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-label'))),
                ['Feature Exports: show its progress', 'Initiative Next release: show its progress', 'Feedback Late review: show its progress']);
            assert.equal(f.progress({ figures: true }).figures.areas.find(entry => entry.id === 'FEATURE-X').total, 3);
            await capture('edit-tags-saved', 'The task shows its new area and initiatives on its own record');
            // A change to one relation names that relation alone: the links of the other one are not sent, and stand as stored.
            await selectedPane(page).getByRole('button', { name: 'Edit tags', exact: true }).click();
            await page.getByRole('heading', { name: 'Edit tags', exact: true }).waitFor();
            await page.getByRole('button', { name: 'Remove the initiative Late review', exact: true }).click();
            const single = await exactPreview(page, 'Review the exact change');
            assert.deepEqual(single.change, { initiativeIds: ['INIT-SOON'] });
            await page.getByRole('button', { name: 'Save tags to your checkout', exact: true }).click();
            await page.getByRole('heading', { name: 'Work', exact: true }).waitFor();
            await page.getByRole('status').getByText(/Saved TASK-3 in the local checkout/).waitFor();
            const narrowed = f.record('TASK-3');
            assert.deepEqual(narrowed.tracking.links, [{ relation: 'area', itemId: 'FEATURE-X' }, { relation: 'initiative', itemId: 'INIT-SOON' }]);
            assert.equal(narrowed.revision, after.revision + 1); assertCanonicalFacts(f, others);
            transitions('Open a task; edit tags; search, pick and remove; preview the exact change; save; read the tags on the record; remove one initiative alone and save');
        } },
    { caseId: 'TC-TPT-268', owner: "WorkTracking/README.TaskTracking-Part9.md", variant: 'area-placement-counting-preview', name: 'Moving an area previews its parent-scope effect and saves only that area while descendant delivery moves between parent counts',
        setup: async f => {
            await f.create('NORTH', 'area', { title: 'North', level: 'product' });
            await f.create('SOUTH', 'area', { title: 'South', level: 'product' });
            await f.create('CHILD', 'area', { title: 'Shared module', level: 'module', areaIds: ['NORTH'] });
            await f.create('TASK-A', 'task', { areaIds: ['CHILD'] }); await f.accepted('TASK-A');
            await f.create('TASK-B', 'task', { areaIds: ['CHILD'] });
        },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            const others = canonicalFacts(f, ['CHILD']); const child = f.bytes('CHILD'); const project = f.progress().metrics;
            const figure = id => { const metrics = f.progress({ scopeId: id }).metrics; return [metrics.total, metrics.accepted, metrics.remaining]; };
            assert.deepEqual([figure('NORTH'), figure('SOUTH')], [[2, 1, 1], [0, 0, 0]]);
            await open(); await selectWork(page, 'CHILD', transitions);
            await selectedPane(page).getByRole('button', { name: 'Edit tags', exact: true }).click();
            await page.getByRole('heading', { name: 'Edit tags', exact: true }).waitFor();
            await page.getByRole('button', { name: /Remove.*North/ }).click();
            await page.getByLabel('Find an area', { exact: true }).fill('South');
            await page.locator('#pick-areaIds-SOUTH').check();
            const preview = await exactPreview(page, 'Review the exact change');
            assert.deepEqual(preview.change, { areaIds: ['SOUTH'] });
            const note = page.locator('.proof-panel').filter({ hasText: 'Where this area will count' });
            assert.match(await note.innerText(), /Changing where it sits can change which of its tagged work counts in its parent areas/);
            assert.doesNotMatch(await note.innerText(), /these tags change no figure/);
            assert.deepEqual(f.bytes('CHILD'), child); assertCanonicalFacts(f, others);
            assert.deepEqual([figure('NORTH'), figure('SOUTH')], [[2, 1, 1], [0, 0, 0]], 'Preview changes no counts');
            await capture('area-placement-preview', 'An area earns no credit itself but moving it can change its parent areas’ delivery scope; no record has changed');
            await page.getByRole('button', { name: 'Save tags to your checkout', exact: true }).click();
            await page.getByRole('status').getByText(/Saved CHILD in the local checkout/).waitFor();
            assert.deepEqual(f.view('CHILD').links, [{ relation: 'area', itemId: 'SOUTH' }]);
            assert.deepEqual([figure('NORTH'), figure('SOUTH')], [[0, 0, 0], [2, 1, 1]]);
            assert.deepEqual(f.progress().metrics, project); assertCanonicalFacts(f, others);
            await capture('area-placement-saved', 'The saved parent affiliation moves descendant delivery between parent counts without rewriting tagged tasks or changing project credit');
            transitions('Move an area with descendant tasks; inspect truthful preview and unchanged source; save and inspect exact parent counts and conserved task records');
        } },
    { caseId: 'TC-TPT-268', owner: "WorkTracking/README.TaskTracking-Part9.md", variant: 'canceled-tag-counting-preview', name: 'A canceled task’s tag preview preserves its exclusion and the saved affiliation leaves eligible and accepted totals unchanged',
        setup: async f => {
            await f.create('AREA-A', 'area', { title: 'First area' }); await f.create('AREA-B', 'area', { title: 'Second area' });
            await f.create('TASK-101', 'task', { areaIds: ['AREA-A'] });
            await f.saved('transition', 'TASK-101', { state: 'canceled', reason: 'Scope removed' });
            await f.create('TASK-GOOD', 'task', { areaIds: ['AREA-A'] }); await f.accepted('TASK-GOOD');
        },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            const others = canonicalFacts(f, ['TASK-101']); const canceled = f.bytes('TASK-101');
            const credit = id => { const m = f.progress(id ? { scopeId: id } : {}).metrics; return [m.eligibleIds, m.total, m.accepted, m.remaining]; };
            const before = [credit(), credit('AREA-A'), credit('AREA-B')];
            assert.deepEqual(before, [[['TASK-GOOD'], 1, 1, 0], [['TASK-GOOD'], 1, 1, 0], [[], 0, 0, 0]]);
            await open(); await selectWork(page, 'TASK-101', transitions);
            await selectedPane(page).getByRole('button', { name: 'Edit tags', exact: true }).click();
            await page.getByRole('heading', { name: 'Edit tags', exact: true }).waitFor();
            await page.getByRole('button', { name: /Remove.*First area/ }).click();
            await page.getByLabel('Find an area', { exact: true }).fill('Second');
            await page.locator('#pick-areaIds-AREA-B').check();
            const preview = await exactPreview(page, 'Review the exact change');
            assert.deepEqual(preview.change, { areaIds: ['AREA-B'] });
            const note = page.locator('.proof-panel').filter({ hasText: 'Where this task will count' });
            assert.match(await note.innerText(), /canceled task stays excluded from delivery counts in every area, initiative and the whole project/);
            assert.doesNotMatch(await note.innerText(), /Newly counted:|whole project still counts this task once/);
            assert.deepEqual(f.bytes('TASK-101'), canceled); assertCanonicalFacts(f, others);
            await capture('canceled-tag-preview', 'The tag preview says canceled work remains excluded instead of promising new delivery credit');
            await page.getByRole('button', { name: 'Save tags to your checkout', exact: true }).click();
            await page.getByRole('status').getByText(/Saved TASK-101 in the local checkout/).waitFor();
            assert.deepEqual([f.view('TASK-101').state, f.view('TASK-101').links], ['canceled', [{ relation: 'area', itemId: 'AREA-B' }]]);
            assert.deepEqual([credit(), credit('AREA-A'), credit('AREA-B')], before); assertCanonicalFacts(f, others);
            await capture('canceled-tag-saved', 'The saved affiliation changes only the canceled owner; exact eligible and accepted scope totals remain unchanged');
            transitions('Edit canceled task tags; inspect truthful exclusion and nonmutating preview; save and reread unchanged delivery credit');
        } },
    { caseId: 'TC-TPT-275', owner: "WorkTracking/README.TaskTracking-Part9.md", variant: 'initiative-decisions', name: 'An initiative is approved, committed, closed and reopened as recorded decisions, with a reason where one is required, while its linked work stays open',
        setup: async f => { await treeProject(f); },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            const open2 = f.bytes('TASK-2');
            await open(); await selectWork(page, 'INIT-OPEN', transitions);
            // Approving and committing are decisions of their own; neither asks for a reason, and each is one recorded step.
            for (const [action, title, state] of [['Approve', 'Change work to Approved', 'approved'], ['Commit', 'Change work to Committed', 'committed']]) {
                await selectedPane(page).getByRole('button', { name: action, exact: true }).click();
                await page.getByRole('heading', { name: title, exact: true }).waitFor();
                assert.equal(await page.getByRole('main').locator('textarea').count(), 0, `${action} asks for no reason`);
                const preview = await exactPreview(page); assert.deepEqual(preview.change, { state });
                await saveExactPreview(page, transitions);
                const entry = f.view('INIT-OPEN').history.at(-1);
                assert.deepEqual([f.view('INIT-OPEN').state, entry.operation, entry.afterState, entry.actor], [state, 'transition', state, 'owner']);
            }
            // Proof and acceptance are never offered on an initiative.
            for (const action of ['Record observed proof', 'Accept work']) assert.equal(await selectedPane(page).getByRole('button', { name: action, exact: true }).count(), 0, action);
            await selectWork(page, 'INIT-LATE', transitions);
            // A committed initiative's next stop is a closing decision, said with what stays open under it.
            const stop = selectedPane(page).locator('.next-stop');
            assert.equal(await stop.getByRole('heading').innerText(), 'Next stop: a closing decision');
            assert.equal(await stop.locator('.next-stop-text p').innerText(), 'Closing is your own decision and needs your reason. The 1 task that is not accepted stays open and stays linked. An initiative never closes by itself, even at 100%.');
            await selectedPane(page).getByText(/^Overdue\. It was due on 15 Jan 2026, \d+ days ago, and 1 linked task is not accepted yet\.$/).waitFor();
            await stop.getByRole('button', { name: 'Close as done', exact: true }).click();
            await page.getByRole('heading', { name: 'Change work to Done', exact: true }).waitFor();
            await page.getByText('1 of 2 linked tasks is not accepted yet.', { exact: true }).waitFor();
            // Closing needs a reason: without one nothing is previewed and nothing is saved.
            const reason = page.getByLabel('Reason for closing now', { exact: true });
            await page.getByRole('button', { name: 'Preview change', exact: true }).click();
            assert.equal(await reason.evaluate(control => control.validity.valueMissing), true);
            assert.equal(await page.getByRole('button', { name: 'Save reviewed change', exact: true }).count(), 0); assert.equal(f.view('INIT-LATE').state, 'committed');
            await capture('closing-needs-reason', 'Closing an initiative with an open task says what stays open and asks for the reason');
            await reason.fill('Every point of the review has an answer');
            const closing = await exactPreview(page); assert.deepEqual(closing.change, { state: 'done', reason: 'Every point of the review has an answer' });
            await saveExactPreview(page, transitions);
            const closed = f.view('INIT-LATE');
            assert.deepEqual([closed.state, closed.history.at(-1).reason, closed.overdue], ['done', 'Every point of the review has an answer', false]);
            // The linked task is untouched and still linked, and the initiative's figure is what it was.
            assert.deepEqual(f.bytes('TASK-2'), open2);
            assert.deepEqual(f.progress({ scopeId: 'INIT-LATE' }).metrics.eligibleIds, ['TASK-1', 'TASK-2']); assert.equal(f.progress({ scopeId: 'INIT-LATE' }).metrics.accepted, 1);
            // Reopening is a decision too, and needs its reason.
            await selectedPane(page).getByRole('button', { name: 'Reopen', exact: true }).click();
            await page.getByRole('heading', { name: 'Change work to Committed', exact: true }).waitFor();
            await page.getByLabel('Reason for reopening', { exact: true }).fill('One answer was withdrawn');
            await saveReviewed(page, transitions);
            assert.deepEqual([f.view('INIT-LATE').state, f.view('INIT-LATE').history.at(-1).reason], ['committed', 'One answer was withdrawn']);
            transitions('Approve and commit one initiative; close another with a reason while a task is open; reopen it with a reason');
        } },
    { caseId: 'TC-TPT-272', owner: "WorkTracking/README.TaskTracking-Part9.md", variant: 'capture-fields-by-kind', name: 'Capture asks only for what the chosen kind uses, and an area is offered every area that is not deeper than its own level to sit inside, one of its own level and one with no level included',
        setup: async f => { await treeProject(f); },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            await open();
            await page.getByRole('button', { name: 'Capture work', exact: true }).click();
            const kind = page.getByRole('main').getByRole('combobox', { name: 'Work kind', exact: true });
            const form = page.locator('form.editor');
            // What the form asks for, by the names of its fields and field sets.
            const asked = async () => [...await form.locator('label[for], legend').evaluateAll(nodes => nodes.filter(node => node.offsetParent !== null).map(node => node.textContent.trim()))];
            await kind.selectOption('task');
            assert.deepEqual(await asked(), ['Proposed local change', 'Work kind', 'Title', 'Intended outcome', 'Due date (optional)', 'Acceptance criteria (optional for capture)', 'Areas (optional)', 'Find an area', 'Initiatives (optional)', 'Find an initiative']);
            await form.getByText('Leave both empty and the task counts for the whole project only. You can tag it later.', { exact: true }).waitFor();
            await kind.selectOption('initiative');
            assert.deepEqual(await asked(), ['Proposed local change', 'Work kind', 'Type', 'Title', 'Intended outcome', 'Priority level (optional)', 'Due date (optional)']);
            assert.deepEqual(await form.getByRole('radio').evaluateAll(nodes => nodes.map(node => [node.value, node.closest('label').textContent, node.checked])), [['feedback', 'Feedback', false], ['idea', 'Idea', false], ['initiative', 'Initiative', false]]);
            assert.deepEqual(await page.getByLabel('Priority level (optional)', { exact: true }).locator('option').allTextContents(), ['Not set', 'High', 'Medium', 'Low']);
            await form.getByText('It starts as a draft. Approving it and committing to it are separate decisions, made on its record.', { exact: true }).waitFor();
            // The type is the reader's own choice: without one nothing is previewed.
            await page.getByLabel('Title', { exact: true }).fill('Second feedback round');
            await page.getByLabel('Intended outcome', { exact: true }).fill('Each note in the round gets a reply');
            await page.getByRole('button', { name: 'Preview change', exact: true }).click();
            assert.equal(await form.getByRole('radio').first().evaluate(control => control.validity.valueMissing), true);
            assert.equal(await page.getByRole('button', { name: 'Save reviewed change', exact: true }).count(), 0);
            await form.getByRole('radio', { name: 'Feedback', exact: true }).check();
            await page.getByLabel('Priority level (optional)', { exact: true }).selectOption('high');
            await page.getByLabel('Due date (optional)', { exact: true }).fill('2999-02-01');
            const proposal = await exactPreview(page);
            assert.deepEqual(proposal.change, { title: 'Second feedback round', intent: 'Each note in the round gets a reply', type: 'feedback', priorityLevel: 'high', deadline: '2999-02-01' });
            await saveExactPreview(page, transitions);
            const initiative = f.progress().items.find(item => item.title === 'Second feedback round');
            assert.deepEqual([initiative.kind, initiative.state, initiative.type, initiative.priorityLevel, initiative.deadline], ['initiative', 'draft', 'feedback', 'high', '2999-02-01']);
            await page.getByRole('button', { name: 'Capture work', exact: true }).click();
            await kind.selectOption('area');
            assert.deepEqual(await asked(), ['Proposed local change', 'Work kind', 'Level (optional)', 'Title', 'What this area covers', 'Sits inside (optional)', 'Find an area']);
            assert.deepEqual(await page.getByLabel('Level (optional)', { exact: true }).locator('option').allTextContents(), ['Not set', 'Application', 'Product', 'Module', 'Feature']);
            // The level decides which areas are offered to sit inside: every area that is not deeper than it. The project
            // holds an application, two products, a feature and an area with no level.
            const level = page.getByLabel('Level (optional)', { exact: true }); const find = page.getByLabel('Find an area', { exact: true });
            const status = form.locator('fieldset.picker').getByRole('status');
            const matching = page.getByRole('group', { name: 'Matching areas', exact: true }).getByRole('checkbox');
            const top = ' Leave it empty and the area sits at the top of the project.';
            // With no level of its own an area is offered every other one.
            await form.getByText(`This area has no level, so any other area is offered.${top}`, { exact: true }).waitFor();
            assert.equal(await status.innerText(), 'Type a name. 5 areas can be chosen here.');
            // The shallowest level sits inside nothing.
            await level.selectOption('application');
            await form.getByText(`An application sits at the top of the project, so there is nothing for it to sit inside.${top}`, { exact: true }).waitFor();
            assert.equal(await status.innerText(), 'Type a name. 0 areas can be chosen here.');
            // A module is offered the application, both products and the area with no level, and not the feature, which is deeper.
            await level.selectOption('module');
            await form.getByText(`Applications, products and other modules are offered, and areas with no level. Features are not, because an area cannot sit inside a deeper one.${top}`, { exact: true }).waitFor();
            assert.equal(await status.innerText(), 'Type a name. 4 areas can be chosen here.');
            await find.fill('exports'); assert.equal(await status.innerText(), 'No area matches “exports”.');
            await find.fill('unsorted'); assert.equal(await matching.count(), 1, 'An area with no level is offered');
            // A product is offered the other products: an area of its own level is not deeper than it.
            await level.selectOption('product');
            await form.getByText(`Applications and other products are offered, and areas with no level. Modules and features are not, because an area cannot sit inside a deeper one.${top}`, { exact: true }).waitFor();
            assert.equal(await status.innerText(), '1 of 4 areas matches.');
            await find.fill('acc'); assert.equal(await matching.count(), 1, 'An area of the same level is offered');
            await page.locator('#pick-areaIds-PRODUCT-A').check();
            await page.getByLabel('Title', { exact: true }).fill('Statements');
            await page.getByLabel('What this area covers', { exact: true }).fill('Statements sent to account holders');
            await capture('capture-area', 'Capturing a product offers the application, the other products and the area with no level to sit inside, and says which levels are not offered and why');
            const area = await exactPreview(page);
            assert.deepEqual(area.change, { title: 'Statements', intent: 'Statements sent to account holders', level: 'product', areaIds: ['PRODUCT-A'] });
            // The tracker accepts what the form offered: a product inside a product.
            await saveExactPreview(page, transitions);
            const saved = f.progress().items.find(item => item.title === 'Statements');
            assert.deepEqual([saved.kind, saved.state, saved.level, saved.links], ['area', 'active', 'product', [{ relation: 'area', itemId: 'PRODUCT-A' }]]);
            assert.equal(f.progress().coverage, 'complete', 'The saved arrangement leaves the project fully readable');
            transitions('Read the fields each kind asks for; capture an initiative with its type, priority level and due date; read what each level is offered to sit inside; capture a product inside a product');
        } },
    { caseId: 'TC-TPT-076', owner: "WorkTracking/README.TaskTracking-Part2.md", variant: 'lifecycle-from-vocabulary', name: 'The stops of a record\'s position line and the steps it is offered are the ones the read lists for its kind\'s lifecycle',
        setup: async f => { await f.create('INIT-1', 'initiative', { title: 'Followed outcome' }); await f.create('AREA-1', 'area', { title: 'A part of the product' }); await f.create('TASK-1', 'task', { title: 'A delivery task' }); },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            const before = f.storedState();
            // The words arrive with the read. Here the read lists a lifecycle the page has never seen: one more stop for an
            // initiative, reached from draft, and a delivery draft that goes straight to a readiness review.
            await page.route('**/api/session', async route => {
                const value = await (await route.fetch()).json(); const words = value.snapshot.vocabulary;
                words.lifecycles.tracker.states = ['draft', 'trial', 'approved', 'committed', 'done', 'canceled']; words.labels.states.trial = 'On trial';
                words.transitions.tracker.draft = ['trial', 'canceled']; words.transitions.tracker.trial = ['approved', 'canceled'];
                words.transitions.delivery.draft = ['ready', 'canceled'];
                await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(value) });
            });
            await open();
            const stops = () => selectedPane(page).locator('ol.position li').allInnerTexts();
            const offered = async () => (await selectedPane(page).getByRole('button').allInnerTexts()).map(name => name.trim());
            await selectWork(page, 'INIT-1', transitions);
            // An initiative stands on its own line: the stops the read lists for it, in that order, and the current one marked.
            assert.deepEqual(await stops(), ['Draft', 'On trial', 'Approved', 'Committed', 'Done']);
            assert.equal(await selectedPane(page).locator('ol.position [aria-current="step"]').innerText(), 'Draft');
            // The step the read lists is offered, under a plain name where the page has none for it; the step it no longer lists is not.
            const initiative = await offered();
            assert.ok(initiative.includes('Change to on trial')); assert.ok(initiative.includes('Cancel initiative'));
            assert.equal(initiative.includes('Approve'), false, 'A step the read does not list from this state is not offered');
            assert.equal(await selectedPane(page).locator('.next-stop h4').innerText(), 'Next stop: change to on trial');
            // A correction offers the other states of that same lifecycle, and no state of another one.
            await selectedPane(page).getByRole('button', { name: 'Change state', exact: true }).click();
            assert.deepEqual((await page.getByLabel('New state', { exact: true }).locator('option').allTextContents()).slice(1), ['On trial', 'Approved', 'Committed', 'Done', 'Canceled']);
            await page.getByRole('button', { name: 'Back to work', exact: true }).click();
            await capture('lifecycle-from-read', 'The initiative\'s line and steps follow the lifecycle the read listed, an unfamiliar stop included');
            await selectWork(page, 'TASK-1', transitions);
            assert.deepEqual(await stops(), ['Draft', 'Planned', 'Ready', 'In progress', 'Verifying', 'Done']);
            const task = await offered();
            assert.ok(task.includes('Review readiness')); assert.equal(task.includes('Move to planned'), false);
            // An area has one state to stand in: it is said in words, with no line, and it can only be canceled.
            await selectWork(page, 'AREA-1', transitions);
            assert.equal(await selectedPane(page).locator('ol.position').count(), 0);
            await selectedPane(page).getByText('Active. An area has no steps to move through, and its state changes no figure.', { exact: true }).waitFor();
            const area = await offered();
            assert.ok(area.includes('Cancel area')); assert.equal(area.some(name => /^(?:Approve|Commit|Move to planned|Accept work|Record observed proof)$/.test(name)), false);
            assert.deepEqual(f.storedState(), before);
            transitions('Open against a read that lists another lifecycle; read an initiative, a task and an area');
        } },
    { caseId: 'TC-TPT-221', owner: "WorkTracking/README.TaskTracking-Part6.md", variant: 'read-only-offers-no-change', name: 'A session that may not save shows a record\'s areas and initiatives, says why they cannot be changed, and offers no tag, decision or capture', writable: false,
        expectedConsole: [/Failed to load resource.*403/], setup: async f => { await treeProject(f); },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            const before = f.storedState();
            await open();
            assert.equal(await page.getByRole('button', { name: 'Capture work', exact: true }).isDisabled(), true);
            await selectWork(page, 'TASK-3', transitions);
            // The tags are shown and still lead to the progress they name.
            assert.deepEqual(await selectedPane(page).locator('.tag-pick').evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-label'))),
                ['Product Billing: show its progress', 'Initiative Next release: show its progress']);
            // The one action that would change them cannot be used, and the sheet says why once.
            assert.equal(await selectedPane(page).getByRole('button', { name: 'Edit tags', exact: true }).isDisabled(), true);
            await selectedPane(page).getByText('Tags cannot be changed here. The reason is stated with this record’s actions below.', { exact: true }).waitFor();
            assert.equal(await selectedPane(page).getByText(/This session is read-only/).count(), 1);
            await selectWork(page, 'INIT-LATE', transitions);
            for (const action of ['Close as done', 'Change the due date', 'Cancel initiative', 'Refine work', 'Edit links']) assert.equal(await selectedPane(page).getByRole('button', { name: action, exact: true }).count(), 0, `${action} is not offered`);
            assert.equal(await selectedPane(page).getByRole('button', { name: 'Edit tags', exact: true }).isDisabled(), true);
            // The workspace refuses the change itself, whatever a page sends.
            const record = f.record('TASK-3');
            const refused = await browserPost(page, '/api/operation', { schemaVersion: 3, operation: 'tag', operationId: 'forged-tag', target: { kind: 'task', itemId: 'TASK-3' }, actor: { memberId: 'owner' },
                patch: { areaIds: ['FEATURE-X'] }, expected: { revision: record.revision, contentHash: record.contentHash } });
            assert.deepEqual([refused.status, refused.value.code], [403, 'READ_ONLY']);
            assert.deepEqual(f.storedState(), before);
            await capture('read-only-tags', 'A read-only session shows the tags and the reason, with Edit tags unavailable and no decision offered');
            transitions('Open read-only; read a task\'s tags; read an initiative; send a tag change directly');
        } },
    { caseId: 'TC-TPT-241', owner: "WorkTracking/README.TaskTracking-Part6.md", variant: 'areas-and-initiatives-without-scripts', name: 'Without scripts the full report, written with every level of its area tree closed, opens the tree level by level, states every initiative in a table, and walks from a record to its areas and initiatives by native links', javaScriptEnabled: false,
        setup: async f => { await treeProject(f); },
        fn: async ({ fixture: f, page, capture, transitions }) => {
            const before = f.storedState(); const read = f.progress({ figures: true });
            const report = await ensureReport(f.root); assert.equal(report.detail, 'full');
            await page.goto(pathToFileURL(path.join(f.root, report.path)).href);
            await page.getByText(/Scripts are disabled\. Every inspected record and its detail is listed above/).waitFor();
            assert.equal(await page.locator('html.enhanced').count(), 0);
            const areas = page.getByRole('region', { name: 'How each area stands', exact: true });
            const rowOf = id => areas.locator('.fig-row').filter({ has: page.locator('.id', { hasText: new RegExp(`^${id}$`) }) });
            // Every level is closed as written: the areas at the top are shown and none of the areas inside them. Paper opens them all.
            assert.equal(await areas.locator('.fig-list details[open]').count(), 0, 'No level of the tree is written open');
            assert.deepEqual(await Promise.all(['APP', 'LOOSE', 'PRODUCT-A', 'PRODUCT-B', 'FEATURE-X'].map(id => rowOf(id).isVisible())), [true, true, false, false, false]);
            await page.emulateMedia({ media: 'print' });
            for (const id of ['PRODUCT-A', 'PRODUCT-B', 'FEATURE-X']) assert.equal(await rowOf(id).isVisible(), true, `Print carries every level: ${id}`);
            await page.emulateMedia({ media: 'screen' });
            // A native disclosure opens one level and no further, named for the area it belongs to; the next opens the level under it.
            const first = areas.locator('summary').filter({ hasText: '2 areas inside Back office' });
            await first.focus(); await first.press('Enter');
            assert.deepEqual(await Promise.all(['PRODUCT-A', 'PRODUCT-B', 'FEATURE-X'].map(id => rowOf(id).isVisible())), [true, true, false]);
            const more = areas.locator('summary').filter({ hasText: '1 area inside Accounts' });
            await more.focus(); await more.press('Enter');
            assert.equal(await rowOf('FEATURE-X').isVisible(), true);
            // Each line states its level and the figures the read supplies, in words, with its meter named by the same counts.
            for (const entry of read.figures.areas) {
                const text = (await rowOf(entry.id).innerText()).replace(/\s+/g, ' ');
                assert.ok(text.includes(`${entry.accepted} of ${entry.total} ${entry.total === 1 ? 'task' : 'tasks'} accepted ${entry.percentage.toFixed(1)}% ${entry.remaining} remaining, ${entry.currentlyVerified} with current proof`), `${entry.id}: ${text}`);
                assert.equal(await rowOf(entry.id).getByRole('img').count(), 1, entry.id);
            }
            assert.match((await rowOf('FEATURE-X').innerText()).replace(/\s+/g, ' '), /^FEATURE Exports FEATURE-X/);
            // The one task in no area is said in the singular.
            assert.equal((await areas.locator('.hint > p').innerText()).replace(/\s+/g, ' '), 'Not in any area: 1 task. It counts for the whole project only.');
            // Every initiative is a row of a table whose columns are named.
            const table = page.getByRole('region', { name: 'How each initiative stands', exact: true }).getByRole('table');
            assert.deepEqual(await table.getByRole('columnheader').allInnerTexts().then(names => names.map(name => name.toLowerCase())), ['initiative', 'status', 'priority level', 'due date', 'delivery', 'rate']);
            const late = table.getByRole('row').filter({ hasText: 'INIT-LATE' });
            assert.match((await late.innerText()).replace(/\s+/g, ' '), /^FEEDBACK Late review INIT-LATE Committed High Overdue: was due 15 Jan 2026 1 of 2 tasks accepted 1 remaining, 1 with current proof 50\.0%$/);
            assert.equal(await table.getByRole('row').filter({ hasText: 'INIT-OPEN' }).getByText('No linked tasks yet, so no percentage applies. That is not the same as zero percent.', { exact: true }).count(), 1);
            // No line of either list waits for a script. The only parts that do are the links that open or close every
            // level and the pagers of the two lists, and without scripts none of them is shown.
            assert.equal(await page.locator('#areas .fig-list .enhancement-only, .initiatives table .enhancement-only').count(), 0);
            assert.deepEqual(await page.locator('#areas .enhancement-only, .initiatives .enhancement-only').evaluateAll(nodes => nodes.map(node => [node.className.split(' ')[0], getComputedStyle(node).display])), [['level-links', 'none'], ['pager', 'none'], ['pager', 'none'], ['pager', 'none'], ['pager', 'none']]);
            // A record lists its areas and initiatives, each a native link to that record.
            const task = page.getByRole('article', { name: 'Second export', exact: true });
            const exports = task.getByRole('link', { name: 'Exports', exact: true }); const target = await exports.getAttribute('href');
            await exports.focus(); await exports.press('Enter'); assert.equal(new URL(page.url()).hash, target);
            const area = page.getByRole('article', { name: 'Exports', exact: true });
            assert.match((await area.innerText()).replace(/\s+/g, ' '), /Level Feature Sits inside Accounts PRODUCT-A Product in Back office Billing PRODUCT-B Product in Back office Delivery 1 of 2 tasks accepted, 50\.0% 1 remaining, 1 with current proof/);
            const linked = task.getByRole('link', { name: 'Late review', exact: true });
            await linked.focus(); await linked.press('Enter'); assert.equal(new URL(page.url()).hash, '#record-INIT-LATE');
            assert.match((await page.getByRole('article', { name: 'Late review', exact: true }).innerText()).replace(/\s+/g, ' '), /Type Feedback Priority level High Due date Overdue: was due 15 Jan 2026/);
            assert.deepEqual(f.storedState(), before);
            await capture('report-areas-initiatives-no-script', 'With scripts off the area tree is opened by a native disclosure and the initiative table and record facts read in full');
            transitions('Open the full report with scripts off; open a level of the area tree; read the initiative table; follow a record to its area and its initiative');
        } },
    { caseId: 'TC-TPT-241', owner: "WorkTracking/README.TaskTracking-Part6.md", variant: 'narrow-reflow-both-views', name: 'At 320 pixels wide neither view scrolls the page sideways: a list wider than the page scrolls inside its own named box, which a keyboard can reach and where its last column can still be reached',
        setup: async f => { await treeProject(f); },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            const before = f.storedState(); const original = page.viewportSize();
            const pageFits = () => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
            // A box that holds what is wider than the page: it scrolls sideways itself, and scrolled to its end shows its last column inside the page.
            const scrollsInside = (box, last) => box.evaluate((node, selector) => {
                const wide = node.scrollWidth > node.clientWidth; node.scrollLeft = node.scrollWidth;
                const frame = node.getBoundingClientRect(), cell = [...node.querySelectorAll(selector)].at(-1).getBoundingClientRect();
                return { wide, scrolls: /^(?:auto|scroll)$/.test(getComputedStyle(node).overflowX),
                    reached: cell.width > 0 && cell.left >= frame.left - 1 && cell.right <= frame.right + 1 && frame.right <= document.documentElement.clientWidth + 1 };
            }, last);
            const allInsidePage = locator => locator.evaluateAll(nodes => nodes.filter(node => node.getClientRects().length).every(node => {
                const box = node.getBoundingClientRect(); return box.left >= -1 && box.right <= document.documentElement.clientWidth + 1; }));
            const held = { wide: true, scrolls: true, reached: true };
            try {
                await page.setViewportSize({ width: 320, height: original.height });
                await open();
                await page.getByRole('heading', { name: 'Project progress', exact: true }).waitFor();
                assert.equal(await pageFits(), true, 'The Overview of the whole project does not scroll sideways');
                const areas = page.getByRole('region', { name: 'How each area stands', exact: true });
                assert.deepEqual(await scrollsInside(areas.locator('.area-scroll'), '.fig-rate'), held, 'The area list keeps its columns and scrolls inside its own box');
                // The box says what it is and is a stop of its own for the keyboard, one step before the first control inside
                // it, so a keyboard reaches it and scrolls it, as the report's table box is reached.
                const areaBox = page.getByRole('group', { name: 'Areas: a list that scrolls sideways when it is wider than the page', exact: true });
                await areaBox.evaluate(node => { node.scrollLeft = 0; });
                assert.equal(await steppedBackTo(page, areaBox, 'button'), true, 'The box that scrolls is reached by keyboard');
                await page.keyboard.press('ArrowRight');
                await page.waitForFunction(node => node.scrollLeft > 0, await areaBox.elementHandle());
                // An initiative is a block of lines, so it reflows instead.
                const initiatives = page.getByRole('region', { name: 'How each initiative stands', exact: true });
                assert.equal(await allInsidePage(initiatives.locator('.init-row, .init-row .fig-rate, .init-row .name-link')), true, 'Each initiative reflows inside the page');
                await capture('narrow-overview', 'At 320 pixels the Overview fits the page; the area list scrolls inside its own box');
                await areas.locator('.area-scroll').evaluate(node => { node.scrollLeft = 0; });
                await areas.getByRole('button', { name: 'Open all areas', exact: true }).click();
                await areas.getByRole('button', { name: /^Billing: show this area/ }).click();
                await page.getByRole('heading', { name: 'Area progress', exact: true }).waitFor(); await page.locator('main[aria-busy="false"]').waitFor();
                assert.equal(await pageFits(), true, 'The scoped Overview does not scroll sideways');
                // The steps of the scope path stack, each inside the page.
                assert.deepEqual(await scopeSteps(page), ['Whole project', 'Back office', 'Billing']);
                assert.equal(await allInsidePage(page.getByRole('navigation', { name: 'Scope path', exact: true }).locator('.path-step')), true, 'Every step of the scope path is inside the page');
                assert.deepEqual(await scrollsInside(page.getByRole('region', { name: 'Areas inside this product', exact: true }).locator('.area-scroll'), '.fig-rest'), held, 'The areas inside keep their columns and scroll inside their own box');
                const insideBox = page.getByRole('group', { name: 'Areas inside: a list that scrolls sideways when it is wider than the page', exact: true });
                assert.equal(await steppedBackTo(page, insideBox, 'button'), true, 'The box of the areas inside is reached by keyboard');
                // The scope is kept, so the task is found among the work that scope counts.
                await page.getByRole('navigation').getByRole('button', { name: 'Work', exact: true }).click(); await page.getByRole('heading', { name: 'Work', exact: true }).waitFor();
                await openEligible(page, 'TASK-3', transitions);
                await selectedPane(page).getByRole('button', { name: 'Edit tags', exact: true }).click();
                await page.getByRole('heading', { name: 'Edit tags', exact: true }).waitFor();
                await page.getByLabel('Find an area', { exact: true }).fill('e');
                await page.getByRole('group', { name: 'Matching areas', exact: true }).getByRole('checkbox').first().waitFor();
                assert.equal(await pageFits(), true, 'The tag editor does not scroll sideways');
                assert.equal(await allInsidePage(page.locator('.picked > li, .picked-remove, .pick-results .check, #find-areaIds, #find-initiativeIds')), true, 'Every chosen tag, match and search field is inside the page');
                const report = await ensureReport(f.root); assert.ok(['generated', 'current'].includes(report.status), JSON.stringify(report));
                await page.goto(pathToFileURL(path.join(f.root, report.path)).href); await page.locator('html.enhanced').waitFor();
                assert.equal(await pageFits(), true, 'The report does not scroll sideways');
                // The area lines reflow; the initiative table keeps its columns in a box of its own that a keyboard can reach and scroll.
                assert.equal(await allInsidePage(page.locator('#areas .fig-row, #areas .fig-row > *')), true, 'Every part of an area line is inside the page');
                const table = page.getByRole('group', { name: 'Initiatives: a table that scrolls sideways when it is wider than the page', exact: true });
                assert.deepEqual(await scrollsInside(table, 'td.num'), held, 'The initiative table scrolls inside its own box');
                assert.equal(await steppedBackTo(page, table, 'link'), true, 'The box that scrolls can be reached without a pointer');
                await capture('narrow-report', 'At 320 pixels the report fits the page; area lines reflow and the initiative table scrolls inside its own box');
            } finally { await page.setViewportSize(original); }
            assert.deepEqual(f.storedState(), before);
            transitions('Narrow to 320 pixels; read the Overview; scope into an area; open the tag editor; open the report');
        } },
    { caseId: 'TC-TPT-241', owner: "WorkTracking/README.TaskTracking-Part6.md", variant: 'new-controls-meet-target-size', name: 'Every control the workspace adds for areas, initiatives, scope and tags is at least 44 pixels wide and high, however short the name it carries',
        // The shortest names a project could give: a target sized by its text alone would fall under the floor.
        setup: async f => {
            await f.create('P', 'area', { title: 'Up', level: 'product' }); await f.create('F', 'area', { title: 'In', level: 'feature', areaIds: ['P'] });
            await f.create('I', 'initiative', { title: 'Go', type: 'idea' });
            await f.create('T', 'task', { title: 'Do', areaIds: ['F'], initiativeIds: ['I'] }); await f.create('U', 'task', { title: 'Or' });
        },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            const before = f.storedState();
            // Each shown control of a kind, by the name it carries, with its size. A choice is sized by the label that holds it.
            const sized = async (locator, what) => {
                const boxes = await locator.evaluateAll(nodes => nodes.filter(node => node.getClientRects().length).map(node => {
                    const box = (node.matches('input[type="checkbox"], input[type="radio"]') ? node.closest('label') : node).getBoundingClientRect();
                    return { name: (node.getAttribute('aria-label') || node.textContent || node.id).trim().slice(0, 60), width: Math.round(box.width * 100) / 100, height: Math.round(box.height * 100) / 100 }; }));
                assert.ok(boxes.length > 0, `${what}: none is shown`);
                assert.deepEqual(boxes.filter(box => box.width < 44 || box.height < 44), [], `${what} under the 44 pixel floor`);
            };
            await open();
            const areas = page.getByRole('region', { name: 'How each area stands', exact: true });
            await sized(areas.locator('.area-toggle'), 'The disclosure of the areas inside an area');
            await sized(areas.locator('.name-link'), 'An area title that scopes into it');
            await sized(areas.locator('.strip button'), 'The way to the tasks in no area');
            await sized(page.getByRole('region', { name: 'How each initiative stands', exact: true }).locator('.name-link'), 'An initiative title that opens it');
            await areas.getByRole('button', { name: /^Up: show this area/ }).click();
            await page.getByRole('heading', { name: 'Area progress', exact: true }).waitFor(); await page.locator('main[aria-busy="false"]').waitFor();
            await sized(page.getByRole('navigation', { name: 'Scope path', exact: true }).locator('button.path-step'), 'A step that widens the scope');
            await sized(page.getByRole('region', { name: 'Areas inside this product', exact: true }).locator('.name-link'), 'An area inside the scope');
            const counted = page.getByRole('region', { name: 'Tasks counted here', exact: true });
            await sized(counted.locator('.name-link'), 'A counted task'); await sized(counted.locator('.tag-pick'), 'A tag of a counted task');
            await capture('targets-scoped-overview', 'Scope path steps, area lines and tags carry short names on full-size targets');
            await page.getByRole('navigation').getByRole('button', { name: 'Work', exact: true }).click(); await page.getByRole('heading', { name: 'Work', exact: true }).waitFor();
            await openEligible(page, 'T', transitions);
            await sized(selectedPane(page).locator('.tag-pick'), 'A tag on the record');
            await sized(selectedPane(page).getByRole('button', { name: 'Edit tags', exact: true }), 'The way to edit tags');
            await selectedPane(page).getByRole('button', { name: 'Edit tags', exact: true }).click();
            await page.getByRole('heading', { name: 'Edit tags', exact: true }).waitFor();
            await sized(page.locator('.picked-remove'), 'Removing a chosen tag');
            await sized(page.locator('#find-areaIds, #find-initiativeIds'), 'A tag search field');
            await page.getByLabel('Find an area', { exact: true }).fill('u');
            await sized(page.getByRole('group', { name: 'Matching areas', exact: true }).getByRole('checkbox'), 'A matching area');
            await page.getByRole('button', { name: 'Back to work', exact: true }).click();
            await page.getByRole('button', { name: 'Capture work', exact: true }).click();
            await page.getByRole('heading', { name: 'Capture work', exact: true }).waitFor();
            await page.getByLabel('Work kind', { exact: true }).selectOption('initiative');
            await sized(page.getByRole('radio'), 'A type of initiative');
            await sized(page.locator('#edit-priorityLevel, #edit-deadline'), 'Priority level and due date');
            await page.getByLabel('Work kind', { exact: true }).selectOption('area');
            await sized(page.locator('#edit-level'), 'The level of an area');
            // The kind was chosen, so the capture is a draft: it is kept while the scope selector is read.
            await keepDraftAndNavigate(page, 'Changes');
            await sized(page.locator('#scope-select'), 'The scope selector');
            assert.deepEqual(f.storedState(), before);
            transitions('Read the Overview; scope into an area; open a record and its tag editor; open capture for each kind; open the scope selector');
        } },
    { caseId: 'TC-TPT-241', owner: "WorkTracking/README.TaskTracking-Part6.md", variant: 'meaning-not-by-colour-alone', name: 'A delivery meter tells its three parts apart by shape and by name, and an overdue date says so in words beside a mark, in both views',
        setup: async f => {
            await f.create('AREA-1', 'area', { title: 'Counted part', level: 'product' });
            await f.create('INIT-1', 'initiative', { title: 'Promised outcome', type: 'initiative', deadline: '2026-01-15' });
            for (const [id, title] of [['TASK-A', 'Proved outcome'], ['TASK-B', 'Outcome changed after acceptance'], ['TASK-C', 'Outcome still open']]) await f.create(id, 'task', { title, areaIds: ['AREA-1'], initiativeIds: ['INIT-1'] });
            await f.accepted('TASK-A'); await f.accepted('TASK-B');
            // A later authored change leaves the acceptance in place and its proof no longer current.
            const changed = f.record('TASK-B'); f.write(changed.ownerPath, changed.text + '\nA teammate changed the outcome after acceptance.\n');
            await f.committed('INIT-1');
        },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            const before = f.storedState();
            const entry = f.progress({ figures: true }).figures.areas.find(area => area.id === 'AREA-1');
            assert.deepEqual([entry.total, entry.accepted, entry.currentlyVerified, entry.remaining], [3, 2, 1, 1], 'The read states one task for each part of the meter');
            await open();
            const line = page.getByRole('region', { name: 'How each area stands', exact: true }).locator('.area-line').filter({ hasText: 'Counted part' });
            // The meter is one image named by its counts, in the words of the legend under it.
            assert.equal(await line.getByRole('img').getAttribute('aria-label'), '2 of 3 tasks accepted: 1 with current proof, 1 with proof not current, 1 not accepted yet');
            // Its parts differ in outline and in mark, whatever colour each is drawn in.
            const shape = part => part.evaluate(node => { const style = getComputedStyle(node); return { dashedOutline: style.borderTopStyle === 'dashed', foot: /inset/.test(style.boxShadow), filled: style.backgroundColor !== 'rgba(0, 0, 0, 0)' }; });
            assert.deepEqual(await Promise.all(['verified', 'stale', 'open'].map(name => shape(line.locator(`.meter-part--${name}`)))),
                [{ dashedOutline: false, foot: false, filled: true }, { dashedOutline: false, foot: true, filled: true }, { dashedOutline: true, foot: false, filled: false }]);
            const legend = page.getByRole('region', { name: 'How each area stands', exact: true }).locator('.legend li');
            assert.deepEqual(await legend.allInnerTexts(), ['accepted with current proof', 'accepted, proof not current', 'not accepted yet']);
            assert.deepEqual(await Promise.all(['verified', 'accepted', 'open'].map(name => shape(legend.locator(`.block--${name}`)))),
                [{ dashedOutline: false, foot: false, filled: true }, { dashedOutline: false, foot: true, filled: true }, { dashedOutline: true, foot: false, filled: false }], 'Each legend mark has the shape of the part it names');
            // An overdue date is said in words, with a mark that is not the only sign.
            const initiative = page.getByRole('region', { name: 'How each initiative stands', exact: true }).locator('.init-row').filter({ hasText: 'Promised outcome' });
            const due = initiative.locator('.tag--blocked');
            assert.equal((await due.innerText()).trim(), 'Overdue: was due 15 Jan 2026'); assert.equal(await due.locator('svg.icon[aria-hidden="true"]').count(), 1);
            // A state is a word beside its dot.
            assert.equal((await initiative.locator('.state-word').innerText()).trim(), 'Committed'); assert.equal(await initiative.locator('.state-word .dot').count(), 1);
            await capture('meter-and-overdue-workspace', 'Meter parts differ in shape and are named; the overdue date is words beside a mark');
            await initiative.getByRole('button', { name: 'Promised outcome: open this initiative', exact: true }).click();
            const notice = selectedPane(page).locator('.notice--mark');
            assert.match((await notice.innerText()).replace(/\s+/g, ' ').trim(), /^Overdue\. It was due on 15 Jan 2026, \d+ days ago, and 1 linked task is not accepted yet\.$/);
            assert.equal(await notice.locator('svg.icon[aria-hidden="true"]').count(), 1);
            const report = await ensureReport(f.root); assert.equal(report.detail, 'full');
            await page.goto(pathToFileURL(path.join(f.root, report.path)).href); await page.locator('html.enhanced').waitFor();
            const row = page.getByRole('region', { name: 'How each area stands', exact: true }).locator('.fig-row').filter({ hasText: 'Counted part' });
            const drawn = row.getByRole('img');
            assert.equal(await drawn.getAttribute('aria-label'), '1 with current proof, 1 with proof not current, 1 not accepted yet');
            assert.equal((await row.innerText()).replace(/\s+/g, ' ').includes('2 of 3 tasks accepted 66.7% 1 remaining, 1 with current proof'), true, 'The counts stand in words beside the meter');
            // The same three shapes: a solid part, a solid part with a foot, and a dashed outline with nothing inside it.
            assert.deepEqual(await drawn.evaluate(node => [...node.children].map(part => { const style = getComputedStyle(part); return `${part.getAttribute('class')}:${style.fill === 'none' ? 'empty' : 'solid'}:${style.strokeDasharray === 'none' ? 'plain' : 'dashed'}`; })),
                ['meter-verified:solid:plain', 'meter-stale:solid:plain', 'meter-foot:solid:plain', 'meter-open:empty:dashed']);
            const late = page.getByRole('region', { name: 'How each initiative stands', exact: true }).getByRole('row').filter({ hasText: 'INIT-1' }).locator('.tag--blocked');
            assert.equal((await late.innerText()).trim(), 'Overdue: was due 15 Jan 2026'); assert.equal(await late.locator('svg.icon[aria-hidden="true"]').count(), 1);
            assert.deepEqual(f.storedState(), before);
            await capture('meter-and-overdue-report', 'The report draws the same three shapes, names the counts and says the overdue date in words');
            transitions('Read the area meter and the initiative due date in the workspace; open the overdue initiative; read the same in the report');
        } },
    { caseId: 'TC-TPT-203', owner: "WorkTracking/README.TaskTracking-Part6.md", variant: 'linked-work-and-counted-tasks', name: 'An initiative\'s record lists its linked work with the kind and state of each record, the number of tasks that count is the read\'s own figure, said beside the list and left unsaid when figures are withheld, and showing the rest of the list puts the reader on the first record added',
        setup: async f => {
            await f.create('INIT-1', 'initiative', { title: 'Followed outcome', type: 'initiative' }); await f.create('INIT-2', 'initiative', { title: 'Outcome with a story only', type: 'idea' });
            await f.create('TASK-A', 'task', { title: 'Counted task', initiativeIds: ['INIT-1'] });
            await f.create('TASK-B', 'task', { title: 'Canceled task', initiativeIds: ['INIT-1'] }); await f.create('TASK-C', 'task', { title: 'Retired task', initiativeIds: ['INIT-1'] });
            await f.create('STORY-A', 'story', { title: 'Supporting story', initiativeIds: ['INIT-1', 'INIT-2'] });
            // Enough linked records that the list is cut short and offers the rest.
            for (const n of [1, 2, 3]) await f.create(`SUBTASK-${n}`, 'subtask', { title: `Supporting subtask ${n}`, initiativeIds: ['INIT-1'] });
            await f.saved('transition', 'TASK-B', { state: 'canceled', reason: 'No longer wanted' }); await f.saved('retire', 'TASK-C', { reason: 'Kept for its history' });
        },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            const before = f.storedState(); const read = f.progress({ figures: true });
            const figure = id => read.figures.initiatives.find(entry => entry.id === id);
            // Seven records link to the first initiative and the read counts one of them: the length of the list is not the figure.
            assert.deepEqual([figure('INIT-1').total, figure('INIT-2').total], [1, 0]);
            const block = selectedPane(page).locator('.block-list').filter({ has: page.getByRole('heading', { name: 'Linked work', exact: true }) });
            // What each row says of its record: kind, state, whether it is retired, and its title.
            const rows = async () => (await block.locator('.linked-list > li').evaluateAll(nodes => nodes.map(node => [node.querySelector('.kind').textContent, node.querySelector('.state-word').textContent.trim(), node.querySelector('.flag')?.textContent || '', node.querySelector('.name-link').textContent])))
                .sort((a, b) => a[3].localeCompare(b[3], 'en'));
            const delivery = () => selectedPane(page).locator('.fact-list > div').filter({ has: page.locator('dt', { hasText: /^Delivery$/ }) }).locator('.fact-value').innerText();
            const apart = 'Canceled or retired tasks, and stories and subtasks, are listed without being counted.';
            await open(); await selectWork(page, 'INIT-1', transitions);
            await block.waitFor();
            assert.equal(await selectedPane(page).getByRole('heading', { name: /^Linked tasks/i }).count(), 0, 'The list is not headed as a list of tasks');
            // The number of tasks that count is the read's, and the fact beside the list states the same figure.
            assert.equal(await block.locator('p.note').first().textContent(), `${figure('INIT-1').total} task counts toward this initiative’s delivery. ${apart}`);
            assert.match(await delivery(), /^0 of 1 task accepted$/);
            // The list is cut short, and the way to the rest counts linked records, never tasks.
            assert.equal((await rows()).length, 6);
            const firstSix = await block.locator('.linked-list .name-link').allTextContents();
            const more = block.getByRole('button', { name: 'Show all 7 linked records', exact: true });
            await more.scrollIntoViewIfNeeded(); const scrolled = await page.evaluate(() => scrollY);
            await more.click();
            // The rest is added where the list stands: the reader is on the first record that was not shown, and the page has not jumped to its top.
            const focused = await page.evaluate(() => { const at = document.activeElement; const row = at.closest('.linked-list > li'); const box = at.getBoundingClientRect();
                return { row: row ? [...row.parentNode.children].indexOf(row) : -1, name: at.textContent, tag: at.tagName, scrollY, inView: box.top >= 0 && box.bottom <= innerHeight }; });
            assert.deepEqual([focused.row, firstSix.includes(focused.name), focused.inView], [6, false, true], JSON.stringify(focused));
            assert.ok(focused.scrollY >= scrolled - 1, `The page stayed where the list is (${scrolled} before, ${focused.scrollY} after)`);
            assert.deepEqual(await rows(), [['Task', 'Canceled', '', 'Canceled task'], ['Task', 'Draft', '', 'Counted task'], ['Task', 'Draft', 'Retired', 'Retired task'], ['Story', 'Draft', '', 'Supporting story'],
                ['Subtask', 'Draft', '', 'Supporting subtask 1'], ['Subtask', 'Draft', '', 'Supporting subtask 2'], ['Subtask', 'Draft', '', 'Supporting subtask 3']]);
            assert.equal(await block.locator('p.note').first().textContent(), `1 task counts toward this initiative’s delivery. ${apart}`, 'Listing every linked record leaves the count of tasks as the read states it');
            await capture('linked-work-with-kinds', 'Linked work is listed with each record\'s kind and state under the number of tasks the read counts');
            // Only a story is linked: it is listed as a story, and the sheet says once that no task counts.
            await selectWork(page, 'INIT-2', transitions);
            assert.deepEqual(await rows(), [['Story', 'Draft', '', 'Supporting story']]);
            assert.equal(await block.locator('p.note').first().textContent(), `No task counts toward this initiative’s delivery yet, so no percentage applies. ${apart}`);
            assert.match(await delivery(), /^No percentage applies$/);
            assert.deepEqual(f.storedState(), before);
            // A record that cannot be read leaves the inspection incomplete: the read then states no figure, and the sheet says no number of its own.
            f.write('work/tasks/broken.md', 'external malformed record');
            assert.equal(f.progress({ figures: true }).figures.status, 'withheld');
            await page.getByRole('banner').getByRole('button', { name: 'Reread project', exact: true }).click();
            await page.getByRole('status').getByText(/Project reread/).waitFor();
            await selectWork(page, 'INIT-1', transitions);
            assert.equal((await rows()).length, 7, 'The linked work is still listed, in full as the reader left it');
            assert.equal(await block.locator('p.note').count(), 0, 'No count of tasks is said when the read withholds its figures');
            assert.match(await delivery(), /^Figures withheld$/);
            assert.equal(/\d+ tasks? counts?/.test(await block.innerText()), false);
            transitions('Open an initiative with seven linked records; list them all; open one that only a story links to; reread with a record that cannot be read');
        } },
    { caseId: 'TC-TPT-263', owner: "WorkTracking/README.TaskTracking-Part9.md", variant: 'picker-says-where-an-area-sits', name: 'The tag picker says where an area sits from the areas it is tagged to: the way down to it for one, each of them by name for several, and the top of the project for none',
        setup: async f => { await treeProject(f); await f.create('MODULE-M', 'area', { title: 'Statements', level: 'module', areaIds: ['PRODUCT-A'] }); },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            const before = f.storedState(); const read = f.progress();
            const title = id => read.items.find(item => item.id === id).title;
            const parents = id => read.hierarchy.areas.find(area => area.id === id).parentAreaIds;
            assert.deepEqual([...parents('FEATURE-X')].sort(), ['PRODUCT-A', 'PRODUCT-B'], 'The feature sits inside two products');
            const several = `In ${parents('FEATURE-X').map(title).join(' and ')}`;
            await open(); await selectWork(page, 'TASK-4', transitions);
            await selectedPane(page).getByRole('button', { name: 'Edit tags', exact: true }).click();
            await page.getByRole('heading', { name: 'Edit tags', exact: true }).waitFor();
            const search = page.getByLabel('Find an area', { exact: true }); const matches = page.getByRole('group', { name: 'Matching areas', exact: true });
            // What a match says under its name.
            const said = async (query, id) => { await search.fill(query); return matches.locator('label').filter({ has: page.locator(`#pick-areaIds-${id}`) }).locator('.note').textContent(); };
            // Inside several areas: each is named, and none is passed over for a guessed one or for the top of the project.
            assert.equal(await said('exp', 'FEATURE-X'), several); assert.equal(several, 'In Accounts and Billing');
            // Inside one area: the way down to it, through each area above.
            assert.equal(await said('state', 'MODULE-M'), 'Back office › Accounts'); assert.equal(await said('acc', 'PRODUCT-A'), 'Back office');
            // Inside none: the top of the project, with or without a level.
            assert.equal(await said('back', 'APP'), 'Top of the project'); assert.equal(await said('unsorted', 'LOOSE'), 'Top of the project');
            // A chosen area says the same in the list of what is chosen, and the review counts it for both areas it sits inside.
            await search.fill('exp'); await page.locator('#pick-areaIds-FEATURE-X').check();
            assert.equal(await page.getByRole('list', { name: 'Areas on this task', exact: true }).locator('.note').textContent(), several);
            await capture('picker-area-inside-several', 'An area inside two areas names both under its title, in the match and in the chosen list');
            await exactPreview(page, 'Review the exact change');
            const counting = await page.locator('.proof-panel').filter({ hasText: 'Where this task will count' }).innerText();
            assert.deepEqual(/Newly counted: (.*?)\./.exec(counting)[1].split(/, | and /).sort(), ['Accounts', 'Back office', 'Billing', 'Exports']);
            assert.deepEqual(f.storedState(), before);
            transitions('Open the tag editor of a task in no area; search for an area inside two areas, inside one, and inside none; pick the first and preview');
        } },
    { caseId: 'TC-TPT-268', owner: "WorkTracking/README.TaskTracking-Part9.md", variant: 'same-tags-another-order', name: 'A tag list changed and changed back in another order is no change: nothing is previewed or sent for it, and a real change beside it names only its own relation',
        setup: async f => { await treeProject(f); },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            const before = f.storedState();
            assert.deepEqual(f.record('TASK-2').tracking.links.filter(link => link.relation === 'area').map(link => link.itemId), ['FEATURE-X', 'LOOSE']);
            const sent = []; page.on('request', request => { if (new URL(request.url()).pathname === '/api/operation') sent.push(request.postDataJSON()); });
            await open(); await selectWork(page, 'TASK-2', transitions);
            await selectedPane(page).getByRole('button', { name: 'Edit tags', exact: true }).click();
            await page.getByRole('heading', { name: 'Edit tags', exact: true }).waitFor();
            const chosen = page.getByRole('list', { name: 'Areas on this task', exact: true }).locator('strong');
            assert.deepEqual(await chosen.allTextContents(), ['Exports', 'Unsorted']);
            // Remove the first area and pick it again: the same two areas, now in the other order.
            await page.getByRole('button', { name: 'Remove the area Exports', exact: true }).click();
            await page.getByLabel('Find an area', { exact: true }).fill('exp'); await page.locator('#pick-areaIds-FEATURE-X').check();
            assert.deepEqual(await chosen.allTextContents(), ['Unsorted', 'Exports']);
            await page.getByRole('button', { name: 'Preview change', exact: true }).click();
            // The page answers at once, with or without a preview: the refusal is read from what it then shows.
            await page.locator('.editor-error, #preview-heading').first().waitFor();
            assert.equal(await page.getByRole('heading', { name: /^Review (this|the) exact change$/ }).count(), 0, 'The same tags in another order are not previewed');
            assert.deepEqual(sent, [], 'Nothing was sent to the workspace for the same tags');
            assert.equal(await page.locator('.editor-error').innerText(), 'Add or remove a tag before previewing.');
            await capture('same-tags-no-change', 'The same areas in another order are refused as no change, and no review is shown');
            // A real change beside the reordered list names only the relation that changed.
            await page.getByLabel('Find an initiative', { exact: true }).fill('next'); await page.locator('#pick-initiativeIds-INIT-SOON').check();
            const preview = await exactPreview(page, 'Review the exact change');
            assert.deepEqual(preview.change, { initiativeIds: ['INIT-LATE', 'INIT-SOON'] });
            assert.deepEqual(sent.map(request => [request.preview, Object.keys(request.patch)]), [[true, ['initiativeIds']]]);
            assert.deepEqual(f.storedState(), before);
            transitions('Open the tag editor; remove an area and pick it again; preview; add an initiative; preview');
        } },
    { caseId: 'TC-TPT-258', owner: "WorkTracking/README.TaskTracking-Part8.md", variant: 'retired-initiative-not-open', name: 'A retired initiative that was never finished is not open: the workspace and the report both list it with the closed ones, and it says it was retired, not closed',
        setup: async f => {
            for (const [id, title, type] of [['INIT-KEPT', 'Still followed', 'initiative'], ['INIT-GONE', 'Given up', 'idea'], ['INIT-DONE', 'Reached', 'initiative']]) { await f.create(id, 'initiative', { title, type }); await f.committed(id); }
            await f.saved('transition', 'INIT-DONE', { state: 'done', reason: 'The outcome was reached' });
            await f.create('TASK-1', 'task', { title: 'Task left open', initiativeIds: ['INIT-GONE'] });
            await f.saved('retire', 'INIT-GONE', { reason: 'No longer pursued' });
        },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            const before = f.storedState(); const gone = f.view('INIT-GONE');
            // Retired while still committed: its state was never changed, and the read does not call it overdue or open.
            assert.deepEqual([gone.state, !!gone.retired, gone.overdue], ['committed', true, false]);
            await open();
            const initiatives = page.getByRole('region', { name: 'How each initiative stands', exact: true });
            const ended = await initiatives.locator('.sub-head + .init-list .name-link').allTextContents();
            const all = await initiatives.locator('.init-row .name-link').allTextContents();
            assert.equal(await initiatives.locator('.sub-head').innerText(), 'Closed');
            assert.deepEqual([all.filter(name => !ended.includes(name)), ended], [['Still followed'], ['Given up', 'Reached']]);
            // It says what ended it and when: its retirement, with what was left open under it.
            const facts = (await initiatives.locator('.init-row').filter({ hasText: 'Given up' }).locator('.init-facts').innerText()).replace(/\s*\n\s*/g, ' | ');
            assert.match(facts, /^Committed \| Retired \d{1,2} [A-Z][a-z]{2} \d{4} with 1 task still open$/);
            await capture('retired-initiative-closed-workspace', 'The retired initiative stands under Closed with the finished one, and says it was retired');
            // The report places the same initiatives the same way.
            const report = await ensureReport(f.root); assert.ok(['generated', 'current'].includes(report.status), JSON.stringify(report));
            await page.goto(pathToFileURL(path.join(f.root, report.path)).href); await page.locator('html.enhanced').waitFor();
            const table = page.getByRole('region', { name: 'How each initiative stands', exact: true }).getByRole('table');
            const groups = await table.locator('tbody').evaluateAll(bodies => bodies.map(body => [body.querySelector('.fig-sub')?.textContent || 'open', [...body.querySelectorAll('.fig-name .id')].map(node => node.textContent)]));
            assert.deepEqual(groups, [['open', ['INIT-KEPT']], ['Closed', ['INIT-GONE', 'INIT-DONE']]]);
            assert.equal(await table.getByRole('row').filter({ hasText: 'INIT-GONE' }).locator('.flag').textContent(), 'Retired');
            assert.deepEqual(f.storedState(), before);
            transitions('Read the initiative list of the Overview; open the report and read its initiative table');
        } },
    { caseId: 'TC-TPT-241', owner: "WorkTracking/README.TaskTracking-Part6.md", variant: 'meter-part-least-width', name: 'Every part a delivery meter draws keeps a least width, so one task among several hundred can be seen beside the rest',
        setup: async f => { await f.create('AREA-1', 'area', { title: 'Large part', level: 'product' }); await f.create('TASK-1', 'task', { title: 'One of many', areaIds: ['AREA-1'] }); },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            const before = f.storedState();
            // The page draws the figure the read states. Here the read states one task accepted with current proof, one
            // accepted with proof not current, and several hundred not accepted.
            const stated = { total: 400, accepted: 2, currentlyVerified: 1, remaining: 398, percentage: 0.5 };
            await page.route('**/api/session', async route => {
                const value = await (await route.fetch()).json();
                Object.assign(value.snapshot.figures.areas.find(entry => entry.id === 'AREA-1'), stated);
                await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(value) });
            });
            await open();
            const line = page.getByRole('region', { name: 'How each area stands', exact: true }).locator('.area-line').filter({ hasText: 'Large part' });
            assert.equal((await line.locator('.fig-count').textContent()).trim(), '2 of 400 tasks accepted');
            assert.equal(await line.getByRole('img').getAttribute('aria-label'), '2 of 400 tasks accepted: 1 with current proof, 1 with proof not current, 398 not accepted yet');
            const parts = await line.getByRole('img').evaluate(node => { const box = node.getBoundingClientRect(); return [...node.children].map(part => { const own = part.getBoundingClientRect();
                return { name: part.className.replace(/^meter-part meter-part--/, ''), width: Math.round(own.width * 100) / 100, inside: own.left >= box.left - 0.5 && own.right <= box.right + 0.5 }; }); });
            assert.deepEqual(parts.map(part => part.name), ['verified', 'stale', 'open']);
            assert.deepEqual(parts.filter(part => part.width < 4 || !part.inside), [], 'Each drawn part is at least four pixels wide and inside the meter');
            assert.ok(parts[2].width > parts[0].width * 10, 'The part for the work not accepted still takes nearly all of the meter');
            await capture('meter-one-among-hundreds', 'One accepted task and one with stale proof among four hundred are each drawn wide enough to see');
            assert.deepEqual(f.storedState(), before);
            transitions('Open against a read that states one accepted task among four hundred; read the area meter');
        } },
    { caseId: 'TC-TPT-241', owner: "WorkTracking/README.TaskTracking-Part6.md", variant: 'area-lines-align-on-paper', name: 'On paper an area line with areas inside it and one without start at the same place, as they do on screen',
        setup: async f => { await treeProject(f); },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            const before = f.storedState(); const screen = page.viewportSize();
            await open();
            const areas = page.getByRole('region', { name: 'How each area stands', exact: true });
            const lineOf = title => areas.locator('.area-line').filter({ has: page.getByRole('button', { name: new RegExp(`^${title}: show this area`) }) });
            // Where a line's level chip starts. Accounts has an area inside it and Billing has none; both are products inside Back office.
            const chipLeft = title => lineOf(title).locator('.kind').evaluate(node => Math.round(node.getBoundingClientRect().left * 10) / 10);
            await areas.getByRole('button', { name: 'Open all areas', exact: true }).click();
            assert.equal(await lineOf('Accounts').locator('.area-toggle').count(), 1); assert.equal(await lineOf('Billing').locator('.area-toggle').count(), 0);
            assert.equal(await chipLeft('Accounts'), await chipLeft('Billing'), 'On screen both lines start at the same place');
            // Paper has its own width, whatever screen the page was read on: an upright sheet at 96 pixels to the inch.
            await page.setViewportSize({ width: 794, height: 1123 }); await page.emulateMedia({ media: 'print' });
            try {
                // The button that opens a level is left off paper, and so is the space a line without one keeps for it.
                assert.equal(await lineOf('Accounts').locator('.area-toggle').isVisible(), false);
                assert.equal(await chipLeft('Accounts'), await chipLeft('Billing'), 'On paper both lines start at the same place');
                await capture('area-lines-on-paper', 'On paper, lines with and without areas inside them start at the same place');
            } finally { await page.emulateMedia({ media: 'screen' }); await page.setViewportSize(screen); }
            assert.deepEqual(f.storedState(), before);
            transitions('Read where two area lines start on screen; read the same on paper');
        } },
    { caseId: 'TC-TPT-241', owner: "WorkTracking/README.TaskTracking-Part6.md", variant: 'report-names-meet-target-size', name: 'In the report an area or initiative name that leads to its record is a target at least 44 pixels wide and high, however short the name, with no style attribute anywhere on the page',
        // The shortest names a project could give: a target sized by its text alone would fall under the floor.
        setup: async f => {
            await f.create('P', 'area', { title: 'Up', level: 'product' }); await f.create('F', 'area', { title: 'In', level: 'feature', areaIds: ['P'] });
            await f.create('I', 'initiative', { title: 'Go', type: 'idea' }); await f.create('T', 'task', { title: 'Do', areaIds: ['F'], initiativeIds: ['I'] });
        },
        fn: async ({ fixture: f, page, capture, transitions }) => {
            const before = f.storedState();
            const report = await ensureReport(f.root); assert.equal(report.detail, 'full');
            await page.goto(pathToFileURL(path.join(f.root, report.path)).href); await page.locator('html.enhanced').waitFor();
            const sized = locator => locator.evaluateAll(nodes => nodes.filter(node => node.getClientRects().length).map(node => { const box = node.getBoundingClientRect();
                return { name: node.textContent, href: node.getAttribute('href'), width: Math.round(box.width * 100) / 100, height: Math.round(box.height * 100) / 100 }; }));
            // The tree is written closed; every level is opened so that each name is on the page.
            await page.getByRole('button', { name: 'Open all areas', exact: true }).click();
            const names = [...await sized(page.locator('#areas .fig-name > a')), ...await sized(page.getByRole('region', { name: 'How each initiative stands', exact: true }).locator('.fig-name > a'))];
            // Each name is a native link to its record, and a full-size target.
            assert.deepEqual(names.map(link => [link.name, link.href]), [['Up', '#record-P'], ['In', '#record-F'], ['Go', '#record-I']]);
            assert.deepEqual(names.filter(link => link.width < 44 || link.height < 44), [], 'A name under the 44 pixel floor');
            // The size comes from the page's one stylesheet: nothing on the page carries a style of its own.
            assert.deepEqual(await page.locator('[style]').evaluateAll(nodes => nodes.map(node => `${node.tagName.toLowerCase()}.${node.className}: ${node.getAttribute('style')}`)), []);
            await capture('report-name-targets', 'Short area and initiative names stand on full-size targets in the report');
            // On paper a name is text, not a target, and takes only the height of its line.
            await page.emulateMedia({ media: 'print' });
            try { assert.deepEqual((await sized(page.locator('#areas .fig-name > a'))).filter(link => link.height >= 44), []); }
            finally { await page.emulateMedia({ media: 'screen' }); }
            assert.deepEqual(f.storedState(), before);
            transitions('Open the full report of a project with the shortest names; measure each area and initiative name; read the same on paper');
        } },
    { caseId: 'TC-TPT-241', owner: "WorkTracking/README.TaskTracking-Part6.md", variant: 'no-area-line-agrees-in-number', name: 'The line for the tasks in no area agrees in number with its count in both views: several tasks count, one task counts',
        setup: async f => {
            await f.create('AREA-1', 'area', { title: 'A part', level: 'product' }); await f.create('TASK-1', 'task', { title: 'Placed task', areaIds: ['AREA-1'] });
            await f.create('TASK-2', 'task', { title: 'First loose end' }); await f.create('TASK-3', 'task', { title: 'Second loose end' });
        },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            const several = 'Not in any area: 2 tasks. They count for the whole project only.', one = 'Not in any area: 1 task. It counts for the whole project only.';
            const reportLine = async () => {
                const report = await ensureReport(f.root); assert.ok(['generated', 'current'].includes(report.status), JSON.stringify(report));
                await page.goto(pathToFileURL(path.join(f.root, report.path)).href); await page.locator('html.enhanced').waitFor();
                return [(await page.locator('#areas .hint > p').innerText()).replace(/\s+/g, ' '), await page.locator('#areas .hint summary').innerText()];
            };
            assert.deepEqual(f.progress().hierarchy.untaggedTaskIds, ['TASK-2', 'TASK-3']);
            await open();
            const strip = page.getByRole('region', { name: 'How each area stands', exact: true }).locator('.strip');
            assert.equal(await strip.locator('.strip-text').textContent(), several);
            assert.equal(await strip.getByRole('button', { name: 'Inspect these tasks', exact: true }).count(), 1);
            // One of the two is placed in an area: one task is left, and it is said in the singular.
            await f.tag('TASK-3', { areaIds: ['AREA-1'] });
            await page.getByRole('banner').getByRole('button', { name: 'Reread project', exact: true }).click();
            await page.getByRole('status').getByText(/Project reread/).waitFor();
            assert.equal(await strip.locator('.strip-text').textContent(), one);
            assert.equal(await strip.getByRole('button', { name: 'Inspect this task', exact: true }).count(), 1);
            await capture('no-area-one-task', 'One task in no area is said in the singular, with the way to inspect it');
            // The report says the same of the same project, for one and for several.
            assert.deepEqual(await reportLine(), [one, 'List it']);
            await f.tag('TASK-3', { areaIds: [] });
            assert.deepEqual(await reportLine(), [several, 'List them']);
            transitions('Read the line for two tasks in no area; place one of them and reread; read the report for one and for two');
        } },
    { caseId: 'TC-TPT-241', owner: "WorkTracking/README.TaskTracking-Part6.md", variant: 'no-areas-sentence-agrees-in-number', name: 'A project with no areas says that its one task counts, or that all of its tasks count, for the whole project',
        setup: async f => { await f.create('TASK-1', 'task', { title: 'The only task' }); },
        fn: async ({ fixture: f, page, open, transitions }) => {
            await open();
            const areas = page.getByRole('region', { name: 'How each area stands', exact: true });
            const said = async () => (await areas.locator('.empty-list p').textContent()).replace(/\s+/g, ' ');
            assert.equal(await said(), 'This project has no areas. The 1 task counts for the whole project. Add an area when you want to follow one part on its own.');
            await f.create('TASK-2', 'task', { title: 'A second task' });
            await page.getByRole('banner').getByRole('button', { name: 'Reread project', exact: true }).click();
            await page.getByRole('status').getByText(/Project reread/).waitFor();
            assert.equal(await said(), 'This project has no areas. All 2 tasks count for the whole project. Add an area when you want to follow one part on its own.');
            transitions('Open a project with one task and no area; add a second task and reread');
        } },
    { caseId: 'TC-TPT-268', owner: "WorkTracking/README.TaskTracking-Part9.md", variant: 'initiative-names-initiatives-only-when-linked', name: 'An initiative\'s own record names other initiatives only when it is linked to one, in the workspace as in the report, while any other record says when it has none',
        setup: async f => {
            await f.create('INIT-A', 'initiative', { title: 'Standing alone', type: 'initiative' });
            await f.create('INIT-B', 'initiative', { title: 'Part of another', type: 'idea', initiativeIds: ['INIT-A'] });
            await f.create('TASK-1', 'task', { title: 'Untagged task' });
        },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            const before = f.storedState();
            await open();
            // The headings of what a record's sheet says it is tagged to.
            const groups = () => selectedPane(page).locator('.tag-group h4').allTextContents();
            await selectWork(page, 'INIT-A', transitions);
            assert.deepEqual(await groups(), ['Areas']);
            assert.equal(await selectedPane(page).getByText('Not linked to an initiative', { exact: true }).count(), 0, 'An initiative linked to none does not say so of itself');
            await selectedPane(page).getByText('Not in any area', { exact: true }).waitFor();
            await capture('initiative-without-initiative-line', 'An initiative linked to no other initiative lists its areas and no line about initiatives');
            await selectWork(page, 'INIT-B', transitions);
            assert.deepEqual(await groups(), ['Areas', 'Initiatives']);
            assert.deepEqual(await selectedPane(page).locator('.tag-pick').evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-label'))), ['Initiative Standing alone: show its progress']);
            await selectWork(page, 'TASK-1', transitions);
            assert.deepEqual(await groups(), ['Areas', 'Initiatives']);
            await selectedPane(page).getByText('Not linked to an initiative', { exact: true }).waitFor();
            // The report states the same facts for the same three records.
            const report = await ensureReport(f.root); assert.equal(report.detail, 'full');
            await page.goto(pathToFileURL(path.join(f.root, report.path)).href); await page.locator('html.enhanced').waitFor();
            // A record's card is in the page whether or not its row is open, so its facts are read from the card itself.
            const named = async id => (await page.locator(`article.record-detail[data-item-id="${id}"] dl.facts > dt`).allTextContents()).filter(name => ['Areas', 'Initiatives'].includes(name));
            assert.deepEqual([await named('INIT-A'), await named('INIT-B'), await named('TASK-1')], [['Areas'], ['Areas', 'Initiatives'], ['Areas', 'Initiatives']]);
            assert.match(await page.locator('article.record-detail[data-item-id="TASK-1"] dl.facts').textContent(), /Not linked to an initiative/);
            assert.deepEqual(f.storedState(), before);
            transitions('Open an initiative linked to no other, one linked to another, and a task; read the same three records in the report');
        } },
    { caseId: 'TC-TPT-268', owner: "WorkTracking/README.TaskTracking-Part9.md", variant: 'edit-links-leaves-tags', name: 'Edit links neither offers, lists nor sends a tag relation and says tags are changed with Edit tags, and a saved link change leaves the record\'s tags as stored',
        setup: async f => {
            for (const id of ['TASK-101', 'TASK-102', 'TASK-103']) await f.create(id);
            await f.create('AREA-1', 'area', { title: 'Tagged area' }); await f.create('INIT-1', 'initiative', { title: 'Linked initiative', type: 'initiative' });
            // Each concern has its own writer: the link first, then the tags.
            await f.saved('link', 'TASK-101', { links: [{ relation: 'dependency', itemId: 'TASK-102' }] });
            await f.tag('TASK-101', { areaIds: ['AREA-1'], initiativeIds: ['INIT-1'] });
        },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            const words = f.progress().vocabulary; const isTag = link => Object.hasOwn(words.tagRoles, link.relation);
            const others = canonicalFacts(f, ['TASK-101']);
            const tags = f.view('TASK-101').links.filter(isTag);
            assert.deepEqual(tags, [{ relation: 'area', itemId: 'AREA-1' }, { relation: 'initiative', itemId: 'INIT-1' }]);
            // The relations a link may have are the tracker's link relations that tag nothing.
            const allowed = words.linkRoles.filter(role => !Object.hasOwn(words.tagRoles, role));
            assert.deepEqual([allowed.includes('area'), allowed.includes('initiative'), allowed.includes('dependency')], [false, false, true]);
            const offered = id => page.locator(`#${id} option`).evaluateAll(options => options.map(option => option.value));
            await open(); await selectWork(page, 'TASK-101', transitions);
            await selectedPane(page).getByRole('button', { name: 'Edit links', exact: true }).click();
            await page.getByRole('heading', { name: 'Edit exact links', exact: true }).waitFor();
            // The form lists the one link that is not a tag, and says where tags are changed.
            assert.equal(await page.locator('[id^="relation-"]').count(), 1);
            assert.deepEqual([await page.locator('#relation-0').inputValue(), await page.locator('#link-0').inputValue()], ['dependency', 'TASK-102']);
            await page.locator('form.editor').getByText('Areas and initiatives are tags. They are not listed or changed here: change them with Edit tags.', { exact: true }).waitFor();
            // No relation that tags a record is a choice, on a listed link or on a new one.
            assert.deepEqual(await offered('relation-0'), allowed);
            await page.getByRole('button', { name: 'Add link', exact: true }).click();
            assert.deepEqual(await offered('relation-1'), allowed);
            await page.locator('#relation-1').selectOption('parent'); await page.locator('#link-1').selectOption('TASK-103');
            // The exact change names the links that are not tags, and no tag.
            const reviewed = [{ relation: 'dependency', itemId: 'TASK-102' }, { relation: 'parent', itemId: 'TASK-103' }];
            const preview = await exactPreview(page);
            assert.deepEqual(preview.change, { links: reviewed });
            await capture('edit-links-without-tags', 'Edit links lists and offers link relations only, and says tags are changed with Edit tags');
            await saveExactPreview(page, transitions);
            // The record's tags stand as they were stored, beside the links that were reviewed, and nothing else changed.
            const stored = f.view('TASK-101').links;
            assert.deepEqual(stored.filter(isTag), tags, 'A saved link change leaves the tags as stored');
            assert.deepEqual(stored.filter(link => !isTag(link)), reviewed);
            assertCanonicalFacts(f, others);
            assert.deepEqual(await selectedPane(page).locator('.tag-pick').evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-label'))), ['Tagged area: show its progress', 'Initiative Linked initiative: show its progress']);
            transitions('Open a tagged task; edit links; add a link; preview the exact change; save; read the tags on the record');
        } },
    { caseId: 'TC-TPT-241', owner: "WorkTracking/README.TaskTracking-Part6.md", variant: 'area-levels-open-and-close-all', name: 'Every level of the area list is closed when the workspace opens; Open all and Close all act on every level in place, the one that would change nothing is unavailable, and a line\'s own toggle keeps working after each',
        setup: async f => { await treeProject(f); },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            const before = f.storedState();
            await open();
            const areas = page.getByRole('region', { name: 'How each area stands', exact: true });
            const shown = () => areas.locator('.area-line .name-link').evaluateAll(nodes => nodes.filter(node => node.getClientRects().length).map(node => node.textContent));
            const levels = areas.getByRole('group', { name: 'Area list levels', exact: true });
            const openAll = levels.getByRole('button', { name: 'Open all areas', exact: true }), closeAll = levels.getByRole('button', { name: 'Close all areas', exact: true });
            const toggles = () => areas.locator('.area-toggle').evaluateAll(nodes => nodes.map(node => [node.getAttribute('aria-label'), node.getAttribute('aria-expanded')]));
            // Which of the two has something to do: Open all, then Close all.
            const available = async () => [await openAll.getAttribute('aria-disabled'), await closeAll.getAttribute('aria-disabled')].map(value => value !== 'true');
            // The card as it stands in the page: a redraw of the view would put another in its place.
            const card = await areas.elementHandle();
            // On opening, every level is closed: only the areas at the top are shown, and there is nothing to close.
            assert.deepEqual(await shown(), ['Back office', 'Unsorted']);
            assert.deepEqual(await toggles(), [['Show the areas inside Back office', 'false'], ['Show the areas inside Accounts', 'false']]);
            assert.deepEqual(await available(), [true, false]);
            assert.deepEqual([(await openAll.innerText()).trim(), (await closeAll.innerText()).trim()], ['Open all', 'Close all']);
            // Close all changes nothing while it has nothing to do, and stays in its place.
            await closeAll.click({ force: true }); assert.deepEqual(await shown(), ['Back office', 'Unsorted']);
            // Open all shows every level of every area, by keyboard as well, keeps focus, and then has nothing left to open.
            await openAll.focus(); await page.keyboard.press('Enter');
            assert.deepEqual(await shown(), ['Back office', 'Accounts', 'Exports', 'Billing', 'Unsorted']);
            assert.deepEqual(await toggles(), [['Hide the areas inside Back office', 'true'], ['Hide the areas inside Accounts', 'true']]);
            assert.deepEqual([await available(), await isFocused(openAll)], [[false, true], true]);
            await capture('area-levels-all-open', 'Every level of the area list is open; Open all has nothing left to do and Close all can be used');
            // A line's own toggle still works, and leaves both links something to do.
            await areas.getByRole('button', { name: 'Hide the areas inside Accounts', exact: true }).click();
            assert.deepEqual([await shown(), await available()], [['Back office', 'Accounts', 'Billing', 'Unsorted'], [true, true]]);
            // Close all closes every level, keeps focus, and then has nothing left to close.
            await closeAll.click();
            assert.deepEqual(await shown(), ['Back office', 'Unsorted']);
            assert.deepEqual(await toggles(), [['Show the areas inside Back office', 'false'], ['Show the areas inside Accounts', 'false']]);
            assert.deepEqual([await available(), await isFocused(closeAll)], [[true, false], true]);
            await areas.getByRole('button', { name: 'Show the areas inside Back office', exact: true }).click();
            assert.deepEqual([await shown(), await available()], [['Back office', 'Accounts', 'Billing', 'Unsorted'], [true, true]]);
            // None of this redrew the view: the card that was in the page is still the one in it.
            assert.equal(await card.evaluate(node => node.isConnected), true);
            // What the reader left open stays so when the view is drawn again.
            await page.getByRole('navigation').getByRole('button', { name: 'Work', exact: true }).click(); await page.getByRole('heading', { name: 'Work', exact: true }).waitFor();
            await page.getByRole('navigation').getByRole('button', { name: 'Overview', exact: true }).click(); await page.getByRole('heading', { name: 'Project progress', exact: true }).waitFor();
            assert.deepEqual([await shown(), await available()], [['Back office', 'Accounts', 'Billing', 'Unsorted'], [true, true]]);
            assert.deepEqual(f.storedState(), before);
            transitions('Open the workspace; open all levels by keyboard; close one level by its own toggle; close all; open one level; leave the Overview and return');
        } },
    { caseId: 'TC-TPT-241', owner: "WorkTracking/README.TaskTracking-Part6.md", variant: 'no-level-links-without-levels', name: 'An area list in which no area holds another has no level to open, and offers neither Open all nor Close all',
        setup: async f => { await f.create('AREA-1', 'area', { title: 'First part', level: 'product' }); await f.create('AREA-2', 'area', { title: 'Second part', level: 'product' }); },
        fn: async ({ fixture: f, page, open, transitions }) => {
            const before = f.storedState();
            await open();
            const areas = page.getByRole('region', { name: 'How each area stands', exact: true });
            assert.deepEqual(await areas.locator('.area-line .name-link').allTextContents(), ['First part', 'Second part']);
            assert.equal(await areas.locator('.area-toggle').count(), 0);
            assert.equal(await areas.getByRole('button', { name: /^(?:Open|Close) all / }).count(), 0);
            assert.deepEqual(f.storedState(), before);
            transitions('Open a project whose areas hold no other area');
        } },
    { caseId: 'TC-TPT-262', owner: "WorkTracking/README.TaskTracking-Part8.md", variant: 'initiative-list-in-pages', name: 'The initiative list is read ten at a time in its own order with its total always stated; steps and the rows choice repaint the list alone; the Closed head stands on every page that holds a closed one; the page is kept across a redraw and a reread, pulled back when the list shrinks and started again when the scope changes',
        setup: async f => { await manyInitiatives(f); },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            const two = n => String(n).padStart(2, '0');
            // Eighteen open and seven closed, none with a due date: they read by title, the open ones first.
            const sequence = [...Array.from({ length: 18 }, (_, n) => `Open outcome ${two(n + 1)}`), ...Array.from({ length: 7 }, (_, n) => `Closed outcome ${n + 1}`)];
            await open();
            const card = page.getByRole('region', { name: 'How each initiative stands', exact: true });
            const above = card.getByRole('navigation', { name: 'Initiative list pages', exact: true }), below = card.getByRole('navigation', { name: 'Initiative list pages, below the list', exact: true });
            const names = () => card.locator('.init-row .name-link').allTextContents();
            const underClosed = () => card.locator('.sub-head + .init-list .name-link').allTextContents();
            const counted = () => above.getByRole('status').textContent(), pageSaid = () => below.locator('.pager-status').textContent();
            const step = (nav, name) => nav.getByRole('button', { name, exact: true });
            const unavailable = async (nav, name) => await step(nav, name).getAttribute('aria-disabled') === 'true';
            const rows = above.getByRole('combobox', { name: 'Rows per page', exact: true });
            const reread = async () => { await page.getByRole('banner').getByRole('button', { name: 'Reread project', exact: true }).click(); await page.getByRole('status').getByText(/Project reread/).waitFor(); };
            const remove = ids => { for (const id of ids) fs.rmSync(path.join(f.root, f.record(id).ownerPath)); };
            const drawn = await card.elementHandle();
            // The list opens on its first ten, says how many there are in all, and has no page before the first.
            assert.deepEqual([await names(), await counted(), await pageSaid()], [sequence.slice(0, 10), '1–10 of 25', 'Page 1 of 3']);
            assert.equal(await card.locator('.sub-head').count(), 0, 'A page with no closed initiative has no Closed head');
            assert.deepEqual([await rows.locator('option').allTextContents(), await rows.inputValue()], [['10 per page', '20 per page', '50 per page', 'All'], '10']);
            assert.deepEqual([await unavailable(above, 'Previous page'), await unavailable(below, 'Previous page'), await unavailable(above, 'Next page')], [true, true, false]);
            await step(above, 'Previous page').click({ force: true }); assert.deepEqual(await names(), sequence.slice(0, 10));
            // A step from above the list repaints the rows alone and leaves the reader on the step: the open ones go on, and
            // the closed ones begin under their head.
            await step(above, 'Next page').click();
            assert.deepEqual([await names(), await counted(), await pageSaid(), await underClosed()], [sequence.slice(10, 20), '11–20 of 25', 'Page 2 of 3', ['Closed outcome 1', 'Closed outcome 2']]);
            assert.deepEqual([await isFocused(step(above, 'Next page')), await drawn.evaluate(node => node.isConnected)], [true, true], 'The step keeps focus and the card is not redrawn');
            // A step from under the list hands the reader to the heading, where the new page begins. The last page holds
            // closed initiatives only, still under their head, and has no page after it.
            await step(below, 'Next page').click();
            assert.deepEqual([await names(), await counted(), await pageSaid(), await underClosed()], [sequence.slice(20), '21–25 of 25', 'Page 3 of 3', sequence.slice(20)]);
            assert.equal(await isFocused(card.getByRole('heading', { name: 'How each initiative stands', exact: true })), true);
            assert.deepEqual([await unavailable(above, 'Next page'), await unavailable(below, 'Next page'), await unavailable(below, 'Previous page')], [true, true, false]);
            await capture('initiative-list-last-page', 'The last page of the initiative list: its count of the total, the closed initiatives under their head, and the steps');
            await step(below, 'Previous page').click(); assert.equal(await counted(), '11–20 of 25');
            // On paper the list is whole and says its total; the steps and the rows choice are left off. The screen then
            // returns to the page it showed.
            await page.emulateMedia({ media: 'print' }); await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
            try { assert.deepEqual([await names(), await counted(), await above.getByRole('status').isVisible(), await above.locator('.pager-controls').isVisible(), await below.isVisible()], [sequence, 'All 25', true, false, false]); }
            finally { await page.evaluate(() => window.dispatchEvent(new Event('afterprint'))); await page.emulateMedia({ media: 'screen' }); }
            assert.deepEqual([await counted(), await names(), await below.isVisible()], ['11–20 of 25', sequence.slice(10, 20), true]);
            // The page is kept when the project is read again and when the view is drawn again.
            await reread(); assert.deepEqual([await counted(), await names()], ['11–20 of 25', sequence.slice(10, 20)]);
            await page.getByRole('navigation').getByRole('button', { name: 'Work', exact: true }).click(); await page.getByRole('heading', { name: 'Work', exact: true }).waitFor();
            await page.getByRole('navigation').getByRole('button', { name: 'Overview', exact: true }).click(); await page.getByRole('heading', { name: 'Project progress', exact: true }).waitFor();
            assert.equal(await counted(), '11–20 of 25');
            // Six initiatives leave the project while the reader is on the last page: the page that no longer exists gives way to the last one that does.
            await step(above, 'Next page').click(); assert.equal(await pageSaid(), 'Page 3 of 3');
            remove([13, 14, 15, 16, 17, 18].map(n => `INIT-OPEN-${two(n)}`)); await reread();
            assert.deepEqual([await counted(), await pageSaid(), await names()], ['11–19 of 19', 'Page 2 of 2', [...sequence.slice(10, 12), ...sequence.slice(18)]]);
            // Another scope is another list: back in the whole project the list starts at its first page.
            await page.getByRole('region', { name: 'How each area stands', exact: true }).getByRole('button', { name: /^One part: show this area/ }).click();
            await page.getByRole('heading', { name: 'Area progress', exact: true }).waitFor(); await page.locator('main[aria-busy="false"]').waitFor();
            await page.getByRole('navigation', { name: 'Scope path', exact: true }).getByRole('button', { name: /^Whole project: widen the scope to here/ }).click();
            await page.getByRole('heading', { name: 'Project progress', exact: true }).waitFor(); await page.locator('main[aria-busy="false"]').waitFor();
            assert.deepEqual([await counted(), await pageSaid()], ['1–10 of 19', 'Page 1 of 2']);
            // A longer page holds them all and leaves nowhere to step to; All says so and drops the steps and the lower pager.
            await rows.selectOption('20');
            assert.deepEqual([await counted(), await pageSaid(), (await names()).length, await unavailable(above, 'Previous page'), await unavailable(above, 'Next page')], ['1–19 of 19', 'Page 1 of 1', 19, true, true]);
            await rows.selectOption('0');
            assert.deepEqual([await counted(), (await names()).length, await below.isVisible(), await step(above, 'Next page').isVisible(), await step(above, 'Previous page').isVisible(), await rows.isVisible()], ['All 19', 19, false, false, false, true]);
            await capture('initiative-list-all-rows', 'All rows chosen: the count reads All, the rows choice stays, the steps and the lower pager are gone');
            // The rows choice is kept when the view is drawn again.
            await page.getByRole('navigation').getByRole('button', { name: 'Work', exact: true }).click(); await page.getByRole('heading', { name: 'Work', exact: true }).waitFor();
            await page.getByRole('navigation').getByRole('button', { name: 'Overview', exact: true }).click(); await page.getByRole('heading', { name: 'Project progress', exact: true }).waitFor();
            assert.deepEqual([await rows.inputValue(), await counted()], ['0', 'All 19']);
            await rows.selectOption('10'); assert.deepEqual([await counted(), await names()], ['1–10 of 19', [...sequence.slice(0, 10)]]);
            // Ten initiatives or fewer are one page: there is no pager, and nothing stands in its place.
            remove([4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => `INIT-OPEN-${two(n)}`)); await reread();
            assert.deepEqual([await names(), await card.getByRole('navigation').count(), await card.locator('.sub-head').count()], [[...sequence.slice(0, 3), ...sequence.slice(18)], 0, 1]);
            transitions('Step through three pages of twenty-five initiatives from above and below the list; reread; leave and return; remove six and reread; scope in and out; choose twenty rows, all rows and ten; remove nine and reread');
        } },
    { caseId: 'TC-TPT-262', owner: "WorkTracking/README.TaskTracking-Part8.md", variant: 'report-level-links-and-initiative-pages', name: 'With scripts the report opens and closes every level of the area tree at once and reads its initiative table twenty at a time, with a page state apart from the list of records, while every row stays in the page and on paper',
        setup: async f => { await treeProject(f); for (let n = 1; n <= 23; n++) await f.create(`INIT-MORE-${String(n).padStart(2, '0')}`, 'initiative', { title: `Further outcome ${String(n).padStart(2, '0')}`, type: 'idea' }); },
        fn: async ({ fixture: f, page, capture, transitions }) => {
            const before = f.storedState();
            const report = await ensureReport(f.root); assert.equal(report.detail, 'full');
            await page.goto(pathToFileURL(path.join(f.root, report.path)).href); await page.locator('html.enhanced').waitFor();
            const areas = page.getByRole('region', { name: 'How each area stands', exact: true });
            const links = areas.getByRole('group', { name: 'Area list levels', exact: true });
            const openAll = links.getByRole('button', { name: 'Open all areas', exact: true }), closeAll = links.getByRole('button', { name: 'Close all areas', exact: true });
            const levels = () => areas.locator('.fig-list details').evaluateAll(nodes => nodes.map(node => node.open));
            const available = async () => [await openAll.getAttribute('aria-disabled'), await closeAll.getAttribute('aria-disabled')].map(value => value !== 'true');
            const inStep = state => page.waitForFunction(wanted => JSON.stringify([...document.querySelectorAll('[data-tree-open]')].map(node => node.getAttribute('aria-disabled') !== 'true')) === wanted, JSON.stringify(state));
            // As written every level is closed: there is everything to open and nothing to close.
            assert.deepEqual([await levels(), await available()], [[false, false], [true, false]]);
            assert.equal(await areas.locator('.fig-row').filter({ hasText: 'PRODUCT-A' }).isVisible(), false);
            await openAll.focus(); await page.keyboard.press('Enter'); await inStep([false, true]);
            assert.deepEqual([await levels(), await isFocused(openAll)], [[true, true], true]);
            assert.equal(await areas.locator('.fig-row').filter({ hasText: 'FEATURE-X' }).isVisible(), true);
            await closeAll.click(); await inStep([true, false]);
            assert.deepEqual([await levels(), await isFocused(closeAll)], [[false, false], true]);
            // A level opened by its own native disclosure keeps both links in step.
            await areas.locator('summary').filter({ hasText: '2 areas inside Back office' }).click(); await inStep([true, true]);
            assert.deepEqual(await levels(), [true, false]);
            // The initiative table: every row is in the page, twenty are shown, and the count says of how many.
            const card = page.getByRole('region', { name: 'How each initiative stands', exact: true });
            const above = card.getByRole('navigation', { name: 'Initiative list pages', exact: true }), below = card.getByRole('navigation', { name: 'Initiative list pages, below the list', exact: true });
            const step = (nav, name) => nav.getByRole('button', { name, exact: true });
            const rows = above.getByRole('combobox', { name: 'Rows per page', exact: true });
            const shownIds = () => card.locator('tbody tr').evaluateAll(lines => lines.filter(line => !line.hidden && line.querySelector('.fig-name')).map(line => line.querySelector('.fig-name .id').textContent));
            const closedHead = () => card.locator('.fig-sub').evaluate(node => !node.closest('tr').hidden);
            const counted = () => above.getByRole('status').textContent(), pageSaid = () => below.locator('.pager-status').textContent();
            const all = await card.locator('tbody tr .fig-name .id').allTextContents();
            assert.equal(all.length, 27); assert.equal(all.at(-1), 'INIT-DONE', 'The closed initiative is the last of the sequence');
            assert.deepEqual([await shownIds(), await counted(), await pageSaid(), await closedHead()], [all.slice(0, 20), '1–20 of 27', 'Page 1 of 2', false]);
            assert.deepEqual([await rows.locator('option').allTextContents(), await rows.inputValue()], [['20 per page', '50 per page', '100 per page', 'All'], '20']);
            assert.equal(await step(above, 'Previous page').getAttribute('aria-disabled'), 'true');
            await step(above, 'Next page').click();
            assert.deepEqual([await shownIds(), await counted(), await pageSaid(), await closedHead()], [all.slice(20), '21–27 of 27', 'Page 2 of 2', true]);
            assert.equal(await step(above, 'Next page').getAttribute('aria-disabled'), 'true');
            // The list of records has pages of its own: neither pager moves the other.
            const work = page.getByRole('navigation', { name: 'Work list pages', exact: true });
            assert.equal(await work.getByText('Page 1 of 2', { exact: true }).isVisible(), true);
            await work.getByRole('button', { name: 'Next', exact: true }).click();
            assert.equal(await work.getByText('Page 2 of 2', { exact: true }).isVisible(), true); assert.equal(await counted(), '21–27 of 27');
            // A step from under the table hands the reader to its heading.
            await step(below, 'Previous page').click();
            assert.deepEqual([await counted(), await work.getByText('Page 2 of 2', { exact: true }).isVisible()], ['1–20 of 27', true]);
            assert.equal(await isFocused(page.getByRole('heading', { name: 'How each initiative stands', exact: true })), true);
            await capture('report-initiative-pages', 'The report\'s initiative table on its first page of two, with the count, the rows choice and the steps');
            // All rows: the count says so, the rows choice stays, and the steps and the lower pager are gone.
            await rows.selectOption('0');
            assert.deepEqual([await counted(), await shownIds(), await below.isVisible(), await step(above, 'Next page').isVisible(), await rows.isVisible()], ['All 27', all, false, false, true]);
            await rows.selectOption('20'); await step(above, 'Next page').click(); assert.equal(await counted(), '21–27 of 27');
            // Paging and the level links set attributes and nothing else: no element of the report was given a style of its
            // own. (Taking a picture leaves an empty attribute on the page's two inputs; an empty one styles nothing.)
            assert.deepEqual(await page.locator('[style]').evaluateAll(nodes => nodes.filter(node => node.getAttribute('style').trim()).map(node => `${node.tagName.toLowerCase()}.${node.className}: ${node.getAttribute('style')}`)), [], 'No element of the report carries a style of its own');
            // Paper gets every row whatever page is shown, the Closed head with them, and no pager or level link.
            await page.emulateMedia({ media: 'print' });
            try {
                assert.equal(await card.locator('tbody tr').evaluateAll(lines => lines.filter(line => getComputedStyle(line).display !== 'none').length), 28);
                assert.deepEqual([await above.isVisible(), await below.isVisible(), await links.isVisible()], [false, false, false]);
            } finally { await page.emulateMedia({ media: 'screen' }); }
            assert.deepEqual(f.storedState(), before);
            transitions('Open the report; open all levels, close all, open one by its disclosure; step through the initiative table and the list of records; choose all rows; read the table on paper');
        } },
    { caseId: 'TC-TPT-262', owner: "WorkTracking/README.TaskTracking-Part8.md", variant: 'report-lists-whole-without-scripts', name: 'Without scripts the report shows every initiative row and no pager or level link, and every level of the area tree is reached through its native disclosure', javaScriptEnabled: false,
        setup: async f => { await treeProject(f); for (let n = 1; n <= 23; n++) await f.create(`INIT-MORE-${String(n).padStart(2, '0')}`, 'initiative', { title: `Further outcome ${String(n).padStart(2, '0')}`, type: 'idea' }); },
        fn: async ({ fixture: f, page, capture, transitions }) => {
            const before = f.storedState(); const read = f.progress();
            const report = await ensureReport(f.root); assert.equal(report.detail, 'full');
            await page.goto(pathToFileURL(path.join(f.root, report.path)).href);
            await page.getByText(/Scripts are disabled\. Every inspected record and its detail is listed above/).waitFor();
            // The links and the pagers are in the file and are not shown: nothing on the page waits for them.
            assert.deepEqual(await page.locator('.level-links, .pager').evaluateAll(nodes => nodes.map(node => getComputedStyle(node).display)), ['none', 'none', 'none', 'none', 'none', 'none', 'none']);
            // Every initiative is a row that is shown, the closed one under its head.
            const card = page.getByRole('region', { name: 'How each initiative stands', exact: true });
            assert.equal(await card.locator('tbody tr').evaluateAll(lines => lines.filter(line => line.querySelector('.fig-name') && line.getClientRects().length).length), 27);
            assert.equal(await card.locator('.fig-sub').isVisible(), true);
            // Every level of the area tree is reached by opening its native disclosure with the keyboard.
            const areas = page.getByRole('region', { name: 'How each area stands', exact: true });
            const rowOf = id => areas.locator('.fig-row').filter({ has: page.locator('.id', { hasText: new RegExp(`^${id}$`) }) });
            const closed = areas.locator('.fig-list details:not([open]) > summary');
            assert.equal(await rowOf('FEATURE-X').isVisible(), false);
            for (let left = await closed.count(); left > 0; left = await closed.count()) { await closed.first().focus(); await page.keyboard.press('Enter'); }
            for (const area of read.hierarchy.areas) assert.equal(await rowOf(area.id).isVisible(), true, area.id);
            await capture('report-lists-without-scripts', 'Without scripts every initiative row is shown and the area tree is opened by its own disclosures; no pager or level link is drawn');
            assert.deepEqual(f.storedState(), before);
            transitions('Open the report with scripts off; read the initiative table; open every level of the area tree by keyboard');
        } },
    { caseId: 'TC-TPT-263', owner: "WorkTracking/README.TaskTracking-Part9.md", variant: 'area-parents-exclude-itself-and-inside', name: 'Editing the areas an existing area sits inside offers neither that area nor any area inside it, however deep and whatever its level, while the other areas its level allows stay on offer',
        // Two areas with no level inside the product: only being inside it keeps them off the list, since no level rule does.
        setup: async f => { await treeProject(f); await f.create('INNER', 'area', { title: 'Inner part', areaIds: ['PRODUCT-A'] }); await f.create('INNERMOST', 'area', { title: 'Innermost part', areaIds: ['INNER'] }); },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            const before = f.storedState();
            await open(); await selectWork(page, 'PRODUCT-A', transitions);
            await selectedPane(page).getByRole('button', { name: 'Edit tags', exact: true }).click();
            await page.getByRole('heading', { name: 'Edit tags', exact: true }).waitFor();
            assert.deepEqual(await page.getByRole('list', { name: 'Areas this area sits inside', exact: true }).locator('strong').allTextContents(), ['Back office']);
            const search = page.getByLabel('Find an area', { exact: true }); const status = page.locator('fieldset.picker').getByRole('status');
            const matches = page.getByRole('group', { name: 'Matching areas', exact: true }).getByRole('checkbox');
            // Seven areas in the project: the product itself, three inside it, and the three it may sit inside.
            assert.equal(await status.innerText(), 'Type a name. 3 areas can be chosen here.');
            // Itself, the areas directly inside it and the one inside those are not offered.
            for (const typed of ['accounts', 'exports', 'inner']) { await search.fill(typed); assert.equal(await status.innerText(), `No area matches “${typed}”.`); assert.equal(await matches.count(), 0, typed); }
            // The application above it, the other product and the area with no level are.
            for (const [typed, id] of [['back', 'APP'], ['billing', 'PRODUCT-B'], ['unsorted', 'LOOSE']]) { await search.fill(typed); assert.equal(await matches.count(), 1, typed); assert.equal(await page.locator(`#pick-areaIds-${id}`).count(), 1, id); }
            await search.fill('part'); assert.equal(await status.innerText(), 'No area matches “part”.');
            await capture('area-parents-offered', 'Editing where a product sits offers the areas above and beside it, never itself or an area inside it');
            assert.deepEqual(f.storedState(), before);
            transitions('Open the tag editor of an area that holds other areas; search for itself, for the areas inside it and for the others');
        } },
    { caseId: 'TC-TPT-241', owner: "WorkTracking/README.TaskTracking-Part6.md", variant: 'nothing-leaves-its-card-at-any-width', name: 'At 320, 768, 1000, 1280 and 1440 pixels, with hundreds of records, long titles and identities that cannot break, no view scrolls the page sideways, nothing is painted outside the card that holds it, a pager keeps to two lines and every small control keeps a full-size target',
        actor: HOLDER, setup: async f => { await volumeProject(f); },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            const before = f.storedState(); const original = page.viewportSize();
            // The five widths are walked once between the two runs of this case: the wide ones on the wide screen.
            const widths = original.width >= 1000 ? [1000, 1280, 1440] : [320, 768];
            const read = f.progress(); const heldBy = id => read.items.filter(item => item.assigneeId === id).length;
            assert.deepEqual([heldBy(HOLDER), heldBy('peer'), read.items.filter(item => !item.assigneeId).length > 200], [45, 38, true], 'One member holds more than a card draws as blocks, another just under that, and most records nobody');
            const faults = []; const wrapped = [];
            const check = async (view, width, scope = page.locator('body'), boxes = WORKSPACE_BOXES) => { for (const fault of await layoutFaults(scope, boxes)) faults.push(`${width}px, ${view}: ${fault}`); };
            const go = async (view, title) => { await page.getByRole('navigation').getByRole('button', { name: view, exact: true }).click(); await page.getByRole('heading', { name: title, exact: true }).waitFor(); };
            const settled = () => page.locator('main[aria-busy="false"]').waitFor();
            // What the Overview's two lists must hold to besides staying in their cards.
            const overviewRules = (width, every) => page.evaluate(top => {
                const found = []; let wraps = false;
                // The area list is squeezed only when the page itself is narrower than its columns: beside another card it stacks first.
                const card = document.getElementById('areas'), box = card.querySelector('.area-scroll');
                if (box.scrollWidth > box.clientWidth + 1 && card.getBoundingClientRect().width < card.parentElement.getBoundingClientRect().width - 1) found.push('the area list scrolls sideways inside a card that shares its row');
                // A title too long for its line, and an identity that wraps, stay beside the toggle and under the title, never back under the toggle.
                // It is measured wherever that area is on the page shown; with every area shown it is always there.
                const line = [...card.querySelectorAll('.area-line')].find(node => node.querySelector('.id')?.textContent === top);
                if (line) { const name = line.querySelector('.name-link').getBoundingClientRect(), id = line.querySelector('.id').getBoundingClientRect();
                    const lead = line.querySelector('.area-toggle, .area-indent').getBoundingClientRect();
                    if (name.left < lead.right - 1 || id.left < lead.right - 1) found.push('a title or its identity wraps back under the toggle');
                    if (id.top >= name.bottom - 1) { wraps = true; if (Math.abs(id.left - name.left) > 1) found.push(`a wrapped identity starts ${Math.round(name.left - id.left)}px before its title`); } }
                // A pager keeps to two lines above its list and one under it, however narrow its card.
                const lines = nodes => { let total = 0, floor = -Infinity; for (const box of [...nodes].filter(node => node.getClientRects().length).map(node => node.getBoundingClientRect()).sort((a, b) => a.top - b.top)) { if (box.top >= floor - 1) total++; floor = Math.max(floor, box.bottom); } return total; };
                for (const pager of document.querySelectorAll('.pager')) { const under = pager.classList.contains('pager--below');
                    const taken = lines(under ? pager.children : pager.querySelectorAll('.pager-count, .pager-length, .pager-steps'));
                    if (taken > (under ? 1 : 2)) found.push(`${pager.getAttribute('aria-label')} takes ${taken} lines`); }
                // Each of these small controls is a target of full size.
                for (const control of document.querySelectorAll('.level-link, .pager-step, .pager-length select')) { const size = control.getBoundingClientRect();
                    if (size.width && (size.width < 44 || size.height < 44)) found.push(`${control.getAttribute('aria-label') || control.id} is a target of ${Math.round(size.width)} by ${Math.round(size.height)}`); }
                return { found: [...new Set(found)], wraps, top: !!line, tops: card.querySelectorAll('.area-list > li').length, controls: document.querySelectorAll('.level-link, .pager-step, .pager-length select').length, pagers: [...document.querySelectorAll('.pager')].map(node => node.getAttribute('aria-label')) };
            }, VOLUME_TOP).then(result => { for (const fault of result.found) faults.push(`${width}px, Overview: ${fault}`); if (result.wraps) wrapped.push(width);
                if (every) assert.deepEqual([result.top, result.tops], [true, 12], 'With every area shown, the long-titled area and each of the twelve areas at the top are laid out and measured');
                assert.equal(result.controls, 12, 'Two level links, and the rows choice and four steps of each of the two lists, are measured');
                assert.deepEqual(result.pagers, ['Area list pages', 'Area list pages, below the list', 'Initiative list pages', 'Initiative list pages, below the list']); });
            // The scoped Overview: a tag keeps its own width with its level or type word whole, and no name in the list
            // of areas inside the scope is broken inside a word.
            const scopedRules = width => page.evaluate(() => {
                const found = [];
                const pieces = node => { const range = document.createRange(); range.selectNodeContents(node); return range.getClientRects().length; };
                const tags = [...document.querySelectorAll('.queue .tag-pick .tag')];
                for (const tag of tags) { const word = tag.querySelector('.tag-word');
                    if (word && pieces(word) !== 1) found.push(`the word "${word.textContent}" of a tag is broken over ${pieces(word)} lines`);
                    const range = document.createRange(); range.selectNodeContents(tag); const text = range.getBoundingClientRect(), box = tag.getBoundingClientRect();
                    // A tag whose title wraps ends its lines where the words allow; one on a single line ends where its words end.
                    if (getComputedStyle(tag).flexBasis !== 'auto') found.push(`a tag is held at a width of ${getComputedStyle(tag).flexBasis}`);
                    if (box.height < 36 && box.right - text.right > 12) found.push(`a tag is ${Math.round(box.right - text.right)}px wider than its words`); }
                const names = [...document.querySelectorAll('#inside-heading')].flatMap(heading => [...heading.closest('section').querySelectorAll('.area-line--wide .name-link')]);
                for (const name of names) { const node = name.firstChild; let at = 0;
                    for (const word of name.textContent.split(' ')) { const range = document.createRange(); range.setStart(node, at); range.setEnd(node, at + word.length); at += word.length + 1;
                        if (range.getClientRects().length > 1) found.push(`the word "${word}" of an area name is broken`); } }
                if (document.querySelector('.area-line--wide .area-indent')) found.push('a line of the areas inside starts after an empty toggle slot');
                return { found: [...new Set(found)], tags: tags.length, words: tags.filter(tag => tag.querySelector('.tag-word')).length, names: names.length };
            }).then(result => { for (const fault of result.found) faults.push(`${width}px, Overview scoped to an area: ${fault}`);
                assert.ok(result.tags >= 2 && result.words >= 2 && result.names >= 3, 'Area and initiative tags with their words, and the names of the areas inside, are measured'); });
            // The report's initiative table: the status dot and its word stand on one line in a column with the room for
            // it, and "No due date" is one line.
            const reportRules = width => reportFrame(page).locator('body').evaluate(() => {
                const found = [];
                const marks = [...document.querySelectorAll('.initiatives .fig-table tbody td:nth-child(2) .mark')];
                for (const mark of marks) { const parts = [...mark.children].map(node => node.getBoundingClientRect()).filter(box => box.width);
                    if (parts.some(box => box.top >= parts[0].bottom - 1)) found.push(`the status "${mark.textContent.trim()}" stands under its dot`);
                    if (getComputedStyle(mark).flexWrap !== 'nowrap') found.push('a status mark may wrap'); }
                const column = document.querySelector('.initiatives .fig-table thead th:nth-child(2)').getBoundingClientRect().width;
                if (column < 124) found.push(`the Status column is ${Math.round(column)}px wide`);
                const undated = [...document.querySelectorAll('.initiatives .fig-table td > span.is-none')].filter(node => node.textContent === 'No due date');
                for (const node of undated) { const range = document.createRange(); range.selectNodeContents(node); if (range.getClientRects().length > 1) found.push('"No due date" is broken over lines'); }
                const printed = document.querySelectorAll('.initiatives .fig-table .id:not(.sr-only)').length;
                if (printed) found.push(`${printed} identities are printed in the initiative table`);
                return { found: [...new Set(found)], marks: marks.length, undated: undated.length };
            }).then(result => { for (const fault of result.found) faults.push(`${width}px, Report: ${fault}`);
                assert.ok(result.marks >= 20 && result.undated >= 1, 'Status marks and an undated initiative are measured'); });
            try {
                await open();
                for (const width of widths) {
                    await page.setViewportSize({ width, height: 900 });
                    await go('Overview', 'Project progress');
                    // Every level of the area tree is opened, so every line is laid out.
                    const openAll = page.getByRole('button', { name: 'Open all areas', exact: true });
                    if (await openAll.getAttribute('aria-disabled') !== 'true') await openAll.click();
                    await check('Overview', width); await overviewRules(width, false);
                    // Then every area at the top is shown at once, so the lines of every page are laid out and measured.
                    const areaRows = page.getByRole('navigation', { name: 'Area list pages', exact: true }).getByRole('combobox', { name: 'Rows per page', exact: true });
                    await areaRows.selectOption('0'); await check('Overview, every area', width); await overviewRules(width, true); await areaRows.selectOption('10');
                    if (width === widths[0]) await capture('volume-overview', 'The Overview of a project with hundreds of records, every level of the area tree open');
                    await page.getByRole('region', { name: 'How each area stands', exact: true }).getByRole('button', { name: /^Customer onboarding and renewals delivery.*: show this area/ }).click();
                    await page.getByRole('heading', { name: 'Area progress', exact: true }).waitFor(); await settled();
                    await check('Overview scoped to an area', width); await scopedRules(width);
                    if (width === widths[0]) await capture('volume-scoped', 'The Overview scoped to an area: the areas inside it and the tasks counted there, each with its tags');
                    await page.getByRole('navigation', { name: 'Scope path', exact: true }).getByRole('button', { name: /^Whole project: widen the scope to here/ }).click();
                    await page.getByRole('heading', { name: 'Project progress', exact: true }).waitFor(); await settled();
                    await go('Work', 'Work');
                    await page.getByRole('region', { name: 'Work list', exact: true }).getByRole('button', { name: /^TASK_held_1_/ }).click();
                    await selectedPane(page).getByRole('heading', { name: /^TASK_held_1_/ }).waitFor();
                    await check('Work with a record open', width);
                    await page.getByRole('group', { name: 'Work layout', exact: true }).getByRole('button', { name: 'Board', exact: true }).click();
                    await check('Work as a board', width);
                    await page.getByRole('group', { name: 'Work layout', exact: true }).getByRole('button', { name: 'List', exact: true }).click();
                    await go('My work', 'My work'); await check('My work', width);
                    await go('People', 'People'); await check('People', width);
                    if (width === widths[0]) await capture('volume-people', 'People with one member holding more records than are drawn as blocks, another just under that, and hundreds held by nobody');
                    await go('Changes', 'Changes and sharing'); await check('Changes', width);
                    await shownReport(page, () => page.getByRole('navigation').getByRole('button', { name: 'Report', exact: true }).click());
                    await reportFrame(page).locator('html.enhanced').waitFor();
                    await check('Report tab', width); await check('Report tab, the report itself', width, reportFrame(page).locator('body'), REPORT_BOXES); await reportRules(width);
                    await go('Work', 'Work');
                    await selectedPane(page).getByRole('button', { name: 'Refine work', exact: true }).click();
                    await page.getByRole('heading', { name: 'Refine work', exact: true }).waitFor();
                    await check('Editor', width);
                    await page.getByLabel('Intended outcome', { exact: true }).fill(`Reviewed at ${width} pixels: every office sends the notice on the same day`);
                    await exactPreview(page);
                    await check('Editor, review step', width);
                    await page.getByRole('button', { name: 'Back to work', exact: true }).click();
                    await page.getByRole('dialog', { name: 'Keep your draft?', exact: true }).waitFor();
                    await page.getByRole('button', { name: 'Discard draft and continue', exact: true }).click();
                    await page.getByRole('heading', { name: 'Work', exact: true }).waitFor();
                }
                // How a person's records are drawn follows their number: one block each while they fit a few lines of the
                // card, and beyond that one bar of shares with the number in each state said in words.
                await go('People', 'People');
                const person = name => page.locator('.person').filter({ has: page.getByRole('heading', { name, exact: false }) });
                const drawnFor = async name => ({ blocks: await person(name).locator('.person-bar:not(.person-bar--shares) > span').count(), shares: await person(name).locator('.person-bar--shares > span').count(),
                    said: await person(name).locator('.person-load .note').allTextContents(), stated: Number(/(\d+) records?/.exec(await person(name).locator('.person-load > p').first().textContent())[1]) });
                const peer = await drawnFor('Peer'), holder = await drawnFor('Alexandria'), nobody = await drawnFor('Unassigned');
                assert.deepEqual([peer.blocks, peer.shares, peer.said], [38, 0, []], 'Thirty-eight records are one block each');
                assert.deepEqual([holder.blocks, holder.said], [0, ['Shown as shares by state, not one block each: 45 draft.']], 'Forty-five records are one bar, with the count in words');
                assert.equal(nobody.blocks, 0); assert.match(nobody.said[0], /^Shown as shares by state, not one block each: \d+ [a-z ]+(?:, \d+ [a-z ]+)*\.$/);
                assert.equal(nobody.said[0].match(/\d+/g).map(Number).reduce((sum, total) => sum + total, 0), nobody.stated, 'The shares said in words add up to the count the card states');
                assert.equal(nobody.shares, nobody.said[0].match(/\d+/g).length, 'One part of the bar for each state that is named');
            } finally { await page.setViewportSize(original); }
            assert.deepEqual(faults, [], 'Something scrolls the page sideways, is painted outside its card, or breaks a rule of the two lists');
            assert.ok(wrapped.length > 0, 'The long identity wrapped under its title at one width at least, so its alignment was measured');
            assert.deepEqual(f.storedState(), before);
            transitions(`At ${widths.join(', ')} pixels: Overview, scoped Overview, Work with a record open, the board, My work, People, Changes, Report, the editor and its review step`);
        } },
    { caseId: 'TC-TPT-262', owner: "WorkTracking/README.TaskTracking-Part8.md", variant: 'area-list-in-pages', name: 'The area list is read ten top-level areas at a time with its total stated; a level opened on one page is as the reader left it on coming back; Open all and Close all reach the levels of every page and are judged over all of them; the page starts again when the scope changes',
        setup: async f => { await manyAreas(f); },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            const before = f.storedState();
            const parts = Array.from({ length: 23 }, (_, n) => `Part ${String(n + 1).padStart(2, '0')}`);
            await open();
            const areas = page.getByRole('region', { name: 'How each area stands', exact: true });
            const above = areas.getByRole('navigation', { name: 'Area list pages', exact: true }), below = areas.getByRole('navigation', { name: 'Area list pages, below the list', exact: true });
            const tops = () => areas.locator('.area-list > li > .area-line .name-link').allTextContents();
            const shown = () => areas.locator('.area-line .name-link').evaluateAll(nodes => nodes.filter(node => node.getClientRects().length).map(node => node.textContent));
            const counted = () => above.getByRole('status').textContent(), pageSaid = () => below.locator('.pager-status').textContent();
            const step = (nav, name) => nav.getByRole('button', { name, exact: true });
            const rows = above.getByRole('combobox', { name: 'Rows per page', exact: true });
            const openAll = areas.getByRole('button', { name: 'Open all areas', exact: true }), closeAll = areas.getByRole('button', { name: 'Close all areas', exact: true });
            const available = async () => [await openAll.getAttribute('aria-disabled'), await closeAll.getAttribute('aria-disabled')].map(value => value !== 'true');
            const card = await areas.elementHandle();
            // Twenty-three areas stand at the top of the project: ten are shown, and the count says of how many.
            assert.deepEqual([await tops(), await counted(), await pageSaid(), await available()], [parts.slice(0, 10), '1–10 of 23', 'Page 1 of 3', [true, false]]);
            assert.deepEqual([await rows.locator('option').allTextContents(), await rows.inputValue(), await step(above, 'Previous page').getAttribute('aria-disabled')], [['10 per page', '20 per page', '50 per page', 'All'], '10', 'true']);
            // A level opened on this page is the reader's own: it is still open on coming back to the page.
            await areas.getByRole('button', { name: 'Show the areas inside Part 01', exact: true }).click();
            assert.deepEqual(await shown(), ['Part 01', 'Inner of 01', ...parts.slice(1, 10)]);
            await step(above, 'Next page').click();
            assert.deepEqual([await tops(), await counted(), await isFocused(step(above, 'Next page'))], [parts.slice(10, 20), '11–20 of 23', true]);
            // The two links are judged over every page: nothing is open on this page, yet there is a level to close.
            assert.deepEqual([await shown(), await available()], [parts.slice(10, 20), [true, true]]);
            await step(above, 'Previous page').click();
            assert.deepEqual(await shown(), ['Part 01', 'Inner of 01', ...parts.slice(1, 10)]);
            // Open all opens the levels of every page, not only of the page shown.
            await openAll.click(); assert.deepEqual(await available(), [false, true]);
            await step(above, 'Next page').click();
            assert.deepEqual(await shown(), [...parts.slice(10, 15), 'Inner of 15', ...parts.slice(15, 20)]);
            // A step from under the list hands the reader to the card's heading.
            await step(below, 'Next page').click();
            assert.deepEqual([await tops(), await counted(), await pageSaid()], [parts.slice(20), '21–23 of 23', 'Page 3 of 3']);
            assert.equal((await shown()).length, 3 + 12, 'The twelve areas inside the last one were opened with the rest');
            assert.equal(await isFocused(areas.getByRole('heading', { name: 'How each area stands', exact: true })), true);
            await capture('area-list-last-page', 'The last page of the area list, every level open, with its count of the total and the steps');
            // Close all closes the levels of every page.
            await closeAll.click(); assert.deepEqual([await shown(), await available()], [parts.slice(20), [true, false]]);
            await step(below, 'Previous page').click(); await step(below, 'Previous page').click();
            assert.deepEqual(await shown(), parts.slice(0, 10));
            assert.equal(await card.evaluate(node => node.isConnected), true, 'No step or link redrew the view');
            // A longer page, and all of them on one.
            await rows.selectOption('20'); assert.deepEqual([await counted(), (await tops()).length], ['1–20 of 23', 20]);
            await rows.selectOption('0');
            assert.deepEqual([await counted(), await tops(), await below.isVisible(), await step(above, 'Next page').isVisible(), await rows.isVisible()], ['All 23', parts, false, false, true]);
            await rows.selectOption('10'); await step(above, 'Next page').click(); assert.equal(await counted(), '11–20 of 23');
            // On paper the list is whole and says its total; the steps and the rows choice are left off. The screen then
            // returns to the page it showed.
            await page.emulateMedia({ media: 'print' }); await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
            try { assert.deepEqual([await tops(), await counted(), await above.getByRole('status').isVisible(), await above.locator('.pager-controls').isVisible(), await below.isVisible()], [parts, 'All 23', true, false, false]); }
            finally { await page.evaluate(() => window.dispatchEvent(new Event('afterprint'))); await page.emulateMedia({ media: 'screen' }); }
            assert.deepEqual([await counted(), await tops(), await below.isVisible()], ['11–20 of 23', parts.slice(10, 20), true]);
            // Another scope is another list: back in the whole project the areas start at their first page.
            await areas.getByRole('button', { name: /^Part 11: show this area/ }).click();
            await page.getByRole('heading', { name: 'Area progress', exact: true }).waitFor(); await page.locator('main[aria-busy="false"]').waitFor();
            await page.getByRole('navigation', { name: 'Scope path', exact: true }).getByRole('button', { name: /^Whole project: widen the scope to here/ }).click();
            await page.getByRole('heading', { name: 'Project progress', exact: true }).waitFor(); await page.locator('main[aria-busy="false"]').waitFor();
            assert.deepEqual([await counted(), await tops()], ['1–10 of 23', parts.slice(0, 10)]);
            assert.deepEqual(f.storedState(), before);
            transitions('Open a level; step to the next page and back; open all; step to the last page from under the list; close all; choose twenty rows, all rows and ten; scope into an area and back out');
        } },
    { caseId: 'TC-TPT-262', owner: "WorkTracking/README.TaskTracking-Part8.md", variant: 'areas-inside-a-scope-in-pages', name: 'The areas directly inside a scope are read ten at a time with the same pager once there are more than a page of them',
        setup: async f => { await manyAreas(f); },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            const before = f.storedState();
            const pieces = Array.from({ length: 12 }, (_, n) => `Piece ${String(n + 1).padStart(2, '0')}`);
            await open();
            const areas = page.getByRole('region', { name: 'How each area stands', exact: true });
            await areas.getByRole('combobox', { name: 'Rows per page', exact: true }).selectOption('0');
            await areas.getByRole('button', { name: /^Part 23: show this area/ }).click();
            await page.getByRole('heading', { name: 'Area progress', exact: true }).waitFor(); await page.locator('main[aria-busy="false"]').waitFor();
            const inside = page.getByRole('region', { name: 'Areas inside this product', exact: true });
            const above = inside.getByRole('navigation', { name: 'Areas inside list pages', exact: true }), below = inside.getByRole('navigation', { name: 'Areas inside list pages, below the list', exact: true });
            const names = () => inside.locator('.area-line .name-link').allTextContents();
            assert.deepEqual([await names(), await above.getByRole('status').textContent(), await below.locator('.pager-status').textContent()], [pieces.slice(0, 10), '1–10 of 12', 'Page 1 of 2']);
            await below.getByRole('button', { name: 'Next page', exact: true }).click();
            assert.deepEqual([await names(), await above.getByRole('status').textContent()], [pieces.slice(10), '11–12 of 12']);
            assert.equal(await isFocused(inside.getByRole('heading', { name: 'Areas inside this product', exact: true })), true);
            await capture('areas-inside-last-page', 'The last page of the areas inside a scope, with the count and the steps');
            // A scope with a page of areas or fewer has no pager.
            await page.getByRole('navigation', { name: 'Scope path', exact: true }).getByRole('button', { name: /^Whole project: widen the scope to here/ }).click();
            await page.getByRole('heading', { name: 'Project progress', exact: true }).waitFor(); await page.locator('main[aria-busy="false"]').waitFor();
            await areas.getByRole('button', { name: /^Part 01: show this area/ }).click();
            await page.getByRole('heading', { name: 'Area progress', exact: true }).waitFor(); await page.locator('main[aria-busy="false"]').waitFor();
            assert.deepEqual([await names(), await inside.getByRole('navigation').count()], [['Inner of 01'], 0]);
            assert.deepEqual(f.storedState(), before);
            transitions('Scope into an area that holds twelve areas; step to their second page; scope into an area that holds one');
        } },
    { caseId: 'TC-TPT-262', owner: "WorkTracking/README.TaskTracking-Part8.md", variant: 'report-area-tree-in-pages', name: 'With scripts the report reads the top of its area tree twenty areas at a time, each with the levels inside it; Open all and Close all reach every page; every area stays in the page and on paper',
        setup: async f => { await manyAreas(f); },
        fn: async ({ fixture: f, page, capture, transitions }) => {
            const before = f.storedState();
            const parts = Array.from({ length: 23 }, (_, n) => `Part ${String(n + 1).padStart(2, '0')}`);
            const report = await ensureReport(f.root); assert.equal(report.detail, 'full');
            await page.goto(pathToFileURL(path.join(f.root, report.path)).href); await page.locator('html.enhanced').waitFor();
            const areas = page.getByRole('region', { name: 'How each area stands', exact: true });
            const above = areas.getByRole('navigation', { name: 'Area list pages', exact: true }), below = areas.getByRole('navigation', { name: 'Area list pages, below the list', exact: true });
            const tops = () => areas.locator(':scope > .fig-list > li').evaluateAll(items => items.filter(item => !item.hidden).map(item => item.querySelector('.fig-name a').textContent));
            const levels = () => areas.locator('.fig-list details').evaluateAll(nodes => nodes.map(node => node.open));
            const counted = () => above.getByRole('status').textContent();
            const openAll = areas.getByRole('button', { name: 'Open all areas', exact: true }), closeAll = areas.getByRole('button', { name: 'Close all areas', exact: true });
            const inStep = state => page.waitForFunction(wanted => JSON.stringify([...document.querySelectorAll('[data-tree-open]')].map(node => node.getAttribute('aria-disabled') !== 'true')) === wanted, JSON.stringify(state));
            // Every area at the top is in the page; twenty are shown, with every level closed.
            assert.equal(await areas.locator(':scope > .fig-list > li').count(), 23);
            assert.deepEqual([await tops(), await counted(), await below.locator('.pager-status').textContent(), await levels()], [parts.slice(0, 20), '1–20 of 23', 'Page 1 of 2', [false, false, false]]);
            assert.deepEqual(await above.getByRole('combobox', { name: 'Rows per page', exact: true }).locator('option').allTextContents(), ['20 per page', '50 per page', '100 per page', 'All']);
            // Open all reaches the levels of the page that is not shown, and the levels stay with their area.
            await openAll.click(); await inStep([false, true]);
            assert.deepEqual(await levels(), [true, true, true]);
            await below.getByRole('button', { name: 'Next page', exact: true }).click();
            assert.deepEqual([await tops(), await counted()], [parts.slice(20), '21–23 of 23']);
            assert.equal(await isFocused(page.getByRole('heading', { name: 'How each area stands', exact: true })), true);
            assert.equal(await areas.locator('.fig-row').filter({ hasText: 'Piece 12' }).isVisible(), true, 'The areas inside the last one are open on its page');
            await capture('report-area-tree-last-page', 'The last page of the report\'s area tree, opened by Open all from the first page');
            // Close all, judged over every page, then the first page again.
            await closeAll.click(); await inStep([true, false]);
            await above.getByRole('button', { name: 'Previous page', exact: true }).click();
            assert.deepEqual([await tops(), await levels()], [parts.slice(0, 20), [false, false, false]]);
            await above.getByRole('combobox', { name: 'Rows per page', exact: true }).selectOption('0');
            assert.deepEqual([await counted(), await tops(), await below.isVisible()], ['All 23', parts, false]);
            await above.getByRole('combobox', { name: 'Rows per page', exact: true }).selectOption('20');
            // Paper gets every area at the top whatever page is shown, and no pager.
            await page.emulateMedia({ media: 'print' });
            try {
                assert.equal(await areas.locator(':scope > .fig-list > li').evaluateAll(items => items.filter(item => getComputedStyle(item).display !== 'none').length), 23);
                assert.deepEqual([await above.isVisible(), await below.isVisible()], [false, false]);
            } finally { await page.emulateMedia({ media: 'screen' }); }
            assert.deepEqual(f.storedState(), before);
            transitions('Open the report; open all levels; step to the second page of the area tree from under it; close all; step back; choose all rows; read the tree on paper');
        } },
    { caseId: 'TC-TPT-262', owner: "WorkTracking/README.TaskTracking-Part8.md", variant: 'report-area-tree-whole-without-scripts', name: 'Without scripts the report shows every area at the top of its tree, however many there are, and no pager', javaScriptEnabled: false,
        setup: async f => { await manyAreas(f); },
        fn: async ({ fixture: f, page, transitions }) => {
            const before = f.storedState();
            const report = await ensureReport(f.root); assert.equal(report.detail, 'full');
            await page.goto(pathToFileURL(path.join(f.root, report.path)).href);
            await page.getByText(/Scripts are disabled\. Every inspected record and its detail is listed above/).waitFor();
            const areas = page.getByRole('region', { name: 'How each area stands', exact: true });
            assert.deepEqual(await areas.locator(':scope > .fig-list > li').evaluateAll(items => items.filter(item => item.getClientRects().length).map(item => item.querySelector('.fig-name a').textContent)),
                Array.from({ length: 23 }, (_, n) => `Part ${String(n + 1).padStart(2, '0')}`));
            assert.deepEqual(await areas.locator('.pager').evaluateAll(nodes => nodes.map(node => getComputedStyle(node).display)), ['none', 'none']);
            assert.deepEqual(f.storedState(), before);
            transitions('Open the report of a project with twenty-three top-level areas, scripts off');
        } },
    { caseId: 'TC-TPT-262', owner: "WorkTracking/README.TaskTracking-Part8.md", variant: 'paged-lists-whole-on-paper', name: 'On paper the workspace shows every row of each list read in pages, the area list and the initiative list together and the areas inside a scope, each with its total; afterwards the screen is back on its page and the reader on the row, or the list, they stood on',
        setup: async f => { await manyAreas(f); for (let n = 1; n <= 12; n++) await f.create(`INIT-${String(n).padStart(2, '0')}`, 'initiative', { title: `Outcome ${String(n).padStart(2, '0')}`, type: 'initiative' }); },
        fn: async ({ fixture: f, page, open, transitions }) => {
            const before = f.storedState();
            const two = n => String(n).padStart(2, '0');
            const parts = Array.from({ length: 23 }, (_, n) => `Part ${two(n + 1)}`), outcomes = Array.from({ length: 12 }, (_, n) => `Outcome ${two(n + 1)}`), pieces = Array.from({ length: 12 }, (_, n) => `Piece ${two(n + 1)}`);
            await open();
            const areas = page.getByRole('region', { name: 'How each area stands', exact: true }), initiatives = page.getByRole('region', { name: 'How each initiative stands', exact: true });
            const count = (card, name) => card.getByRole('navigation', { name: `${name} pages`, exact: true }).getByRole('status').textContent();
            const tops = () => areas.locator('.area-list > li > .area-line .name-link').allTextContents(), named = () => initiatives.locator('.init-row .name-link').allTextContents();
            const both = async () => [await tops(), await count(areas, 'Area list'), await named(), await count(initiatives, 'Initiative list')];
            const onPaper = async read => { await page.emulateMedia({ media: 'print' }); await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
                try { return await read(); } finally { await page.evaluate(() => window.dispatchEvent(new Event('afterprint'))); await page.emulateMedia({ media: 'screen' }); } };
            const paged = [parts.slice(0, 10), '1–10 of 23', outcomes.slice(0, 10), '1–10 of 12'];
            // Both lists of the Overview are read in pages, side by side.
            assert.deepEqual(await both(), paged);
            // The reader stands on a row of the area list. Paper holds every area and every initiative with the totals;
            // afterwards both lists are back on their page and the reader on the same row.
            const row = areas.getByRole('button', { name: /^Part 03: show this area/ });
            await row.focus();
            assert.deepEqual(await onPaper(both), [parts, 'All 23', outcomes, 'All 12']);
            assert.deepEqual([await both(), await isFocused(row)], [paged, true]);
            // A row of the initiative list is drawn again for the screen, so the reader is put on that list's heading.
            await initiatives.getByRole('button', { name: /^Outcome 04/ }).first().focus();
            assert.deepEqual(await onPaper(both), [parts, 'All 23', outcomes, 'All 12']);
            assert.deepEqual([await both(), await isFocused(initiatives.getByRole('heading', { name: 'How each initiative stands', exact: true }))], [paged, true]);
            // The areas inside a scope are whole on paper too.
            await areas.getByRole('combobox', { name: 'Rows per page', exact: true }).selectOption('0');
            await areas.getByRole('button', { name: /^Part 23: show this area/ }).click();
            await page.getByRole('heading', { name: 'Area progress', exact: true }).waitFor(); await page.locator('main[aria-busy="false"]').waitFor();
            const inside = page.getByRole('region', { name: 'Areas inside this product', exact: true });
            const within = async () => [await inside.locator('.area-line .name-link').allTextContents(), await count(inside, 'Areas inside list')];
            assert.deepEqual(await within(), [pieces.slice(0, 10), '1–10 of 12']);
            assert.deepEqual(await onPaper(within), [pieces, 'All 12']);
            assert.deepEqual(await within(), [pieces.slice(0, 10), '1–10 of 12']);
            assert.deepEqual(f.storedState(), before);
            transitions('Stand on an area row and make paper; stand on an initiative row and make paper; scope into an area that holds twelve areas and make paper');
        } },
    { caseId: 'TC-TPT-252', owner: "WorkTracking/README.TaskTracking-Part7.md", variant: 'new-work-current-words', name: 'New work is named in the current words in capture choices, lists, detail, the board and the status report',
        setup: async f => {
            for (const [id, kind, title] of [['INITIATIVE-1', 'initiative', 'Faster exports'], ['SUBTASK-1', 'subtask', 'Index the export table'],
                ['STORY-1', 'story', 'Export from the list'], ['AREA-1', 'area', 'Export release']]) await f.create(id, kind, { title });
        },
        fn: async ({ fixture: f, page, open, capture, transitions }) => {
            await open();
            await page.getByRole('button', { name: 'Inspect all work', exact: true }).click();
            await page.getByRole('button', { name: 'Capture work', exact: true }).click();
            const kind = page.getByRole('main').getByRole('combobox', { name: 'Work kind', exact: true });
            assert.deepEqual(await kind.locator('option').evaluateAll(options => options.map(option => [option.value, option.textContent])),
                [['initiative', 'Initiative'], ['task', 'Task'], ['story', 'Story'], ['subtask', 'Subtask'], ['area', 'Area']]);
            await kind.selectOption('area'); assert.equal(await page.locator('#kind-help').innerText(), 'An area is a part of what you build. Tasks tagged to it, or to any area inside it, count for it.');
            await kind.selectOption('initiative'); assert.equal(await page.locator('#kind-help').innerText(), 'An initiative is something to follow as a whole. Its progress counts the tasks linked to it.');
            await kind.selectOption('subtask'); assert.equal(await page.locator('#kind-help').innerText(), 'A subtask is tracked outside the delivery count.');
            await kind.selectOption('task'); assert.equal(await page.locator('#kind-help').innerText(), 'A task counts toward delivery, one block each.');
            await page.getByLabel('Title', { exact: true }).fill('Export selected rows');
            await page.getByLabel('Intended outcome', { exact: true }).fill('People export only the rows they select');
            await saveReviewed(page, transitions);
            const task = f.records().map(record => f.view(record.id)).find(view => view.kind === 'task');
            assert.match(task.id, /^task-/i); assert.match(task.ownerPath, /^work\/tasks\//);
            // Planning the task is the step named for the Planned state.
            await selectedPane(page).getByRole('button', { name: 'Move to planned', exact: true }).click();
            await page.getByRole('heading', { name: 'Change work to Planned', exact: true }).waitFor();
            await saveReviewed(page, transitions);
            assert.equal(f.view(task.id).state, 'planned');
            const workList = page.getByRole('region', { name: 'Work list', exact: true });
            // A chip names the kind of delivery work, the type of an initiative and, where it has one, the level of an area.
            assert.deepEqual([...new Set(await workList.locator('.kind').allTextContents())].sort(), ['Area', 'Idea', 'Story', 'Subtask', 'Task']);
            // Every state of every lifecycle can be filtered by, each under the tracker's own name.
            assert.deepEqual(await page.locator('#filter-status option').allTextContents(), ['Any state', 'Draft', 'Planned', 'Ready', 'In progress', 'Blocked', 'Implemented', 'Verifying', 'Done', 'Canceled', 'Approved', 'Committed', 'Active']);
            assert.deepEqual(await page.locator('#filter-kind option').allTextContents(), ['Any kind', 'Tasks, stories and subtasks', 'Initiative', 'Task', 'Story', 'Subtask', 'Area']);
            await page.getByRole('group', { name: 'Work layout', exact: true }).getByRole('button', { name: 'Board', exact: true }).click();
            await workList.getByRole('list', { name: 'Planned: 1 records', exact: true }).getByRole('button', { name: new RegExp(`^${task.id}:`) }).waitFor();
            // The board is the delivery line; the initiative and the area are said to be read in the list.
            await workList.getByText('2 records are not on this board: initiatives and areas have lines of their own. Use the list to see them.', { exact: true }).waitFor();
            assert.equal(RETIRED_DISPLAY_WORDS.test(await page.locator('body').innerText()), false, 'Work shows no retired word');
            await capture('current-words-work', 'Kinds, types and the Planned lane are named in the current words after capturing and planning a task');
            await page.getByRole('navigation').getByRole('button', { name: 'Overview', exact: true }).click();
            await page.getByRole('heading', { name: 'Project progress', exact: true }).waitFor();
            assert.match(await page.getByRole('main').innerText(), /1 eligible unique tasks/);
            assert.equal(await page.getByRole('button', { name: 'Planned: 1 records. Show them in Work.', exact: true }).count(), 1);
            assert.equal(RETIRED_DISPLAY_WORDS.test(await page.locator('body').innerText()), false, 'Overview shows no retired word');
            await shownReport(page, () => page.getByRole('navigation').getByRole('button', { name: 'Report', exact: true }).click());
            const frame = reportFrame(page); await frame.locator('html.enhanced').waitFor();
            assert.match(await frame.locator('.hero-count').innerText(), /^0\s+of 1 task accepted$/);
            assert.deepEqual([...new Set(await frame.locator('.work-row .kind').allTextContents())].sort(), ['Area', 'Initiative', 'Story', 'Subtask', 'Task']);
            assert.equal(await frame.locator(`.work-row[data-item-id="${task.id}"]`).locator('.state').innerText(), 'Planned');
            assert.equal(RETIRED_DISPLAY_WORDS.test(await frame.locator('body').innerText()), false, 'The status report shows no retired word');
            assert.match(await frame.locator('body').innerText(), /Initiatives, stories, subtasks and areas sit outside this count\./);
            await capture('current-words-report', 'The status report counts the one task as delivery and names every kind and state in the same current words');
            transitions('Capture a task; plan it; read the list, the board, Overview and the status report');
        } }
];

function parseArguments(args) {
    const options = { headed: false, filter: '', evidenceRoot: path.resolve('tmp/task-track-browser'), list: false };
    const seen = new Set();
    for (const argument of args) {
        const key = argument.split('=')[0];
        if (seen.has(key)) throw new Error(`Repeated argument: ${key}`);
        seen.add(key);
        if (argument === '--headed') options.headed = true;
        else if (argument === '--list') options.list = true;
        else if (argument.startsWith('--filter=') && argument.length > '--filter='.length) options.filter = argument.slice('--filter='.length);
        else if (argument.startsWith('--evidence-root=') && argument.length > '--evidence-root='.length) {
            const relative = argument.slice('--evidence-root='.length);
            if (path.isAbsolute(relative) || !/^(tmp|temp)[\\/]/.test(relative) || relative.split(/[\\/]/).some(part => part === '..')) throw new Error('Evidence root must be a project-relative path beneath tmp/ or temp/');
            options.evidenceRoot = path.resolve(relative);
        } else throw new Error(`Invalid argument: ${key}`);
    }
    return options;
}

async function main(args = process.argv.slice(2)) {
    const options = parseArguments(args);
    const selected = tests.filter(test => !options.filter || `${test.caseId} ${test.variant} ${test.name}`.includes(options.filter));
    if (!selected.length) { console.error('No matching browser cases. Passed0 Failed0 Skipped0; exit1'); return 1; }
    if (options.list) { for (const test of selected) console.log(`${test.caseId}: ${test.name}`); return 0; }
    const runtime = browserRuntime();
    const runId = `${Date.now()}-${crypto.randomUUID()}`;
    const evidence = createEvidence(options.evidenceRoot, runId);
    let passed = 0, failed = 0;
    for (const test of selected) for (const viewport of Object.keys(VIEWPORTS)) {
        try {
            await withWorkspace(test, viewport, { ...options, runtime, evidence }, test.fn);
            passed++;
            evidence.manifest.results.push({ case_id: test.caseId, owner_path: test.owner, variant: test.variant, viewport, status: 'passed' });
            console.log(`PASS ${test.caseId} ${test.variant} ${viewport}`);
        } catch (error) {
            failed++;
            evidence.manifest.results.push({ case_id: test.caseId, owner_path: test.owner, variant: test.variant, viewport, status: 'failed', reason: error.message });
            console.error(`FAIL ${test.caseId} ${test.variant} ${viewport}: ${error.message}`);
        } finally { evidence.persist(); }
    }
    console.log(`Passed${passed} Failed${failed} Skipped0; exit${failed ? 1 : 0}; evidence ${evidence.directory}`);
    return failed ? 1 : 0;
}

if (require.main === module) main().then(code => { process.exitCode = code; }).catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { tests, main, parseArguments };

// These helpers own repeated fixture/interaction mechanics. Each registered case keeps its final business assertions.
function canonicalFacts(f, except = []) {
    return { records: new Map(f.records().filter(record => !except.includes(record.id)).map(record => [record.id, f.bytes(record.id)])),
        files: new Map(['docs/project-config.json', '.claude/.ck.local.json', 'intent/shared.md', 'src/integration.js']
            .filter(relative => fs.existsSync(path.join(f.root, relative))).map(relative => [relative, fs.readFileSync(path.join(f.root, relative))])) };
}
function assertCanonicalFacts(f, before) {
    for (const [id, bytes] of before.records) assert.deepEqual(f.bytes(id), bytes, `Canonical owner ${id} is conserved`);
    for (const [relative, bytes] of before.files) assert.deepEqual(fs.readFileSync(path.join(f.root, relative)), bytes, `Owned fixture source ${relative} is conserved`);
}
// Two products that share one feature, an area without a level, and work tagged to them: P and Q count for the feature,
// R is canceled, S retired, a story and a subtask support it, Q also sits in the area without a level, and U is in no area.
// `concerns` leaves only P and the supporting subtask in the feature.
async function hierarchyFixture(f, { concerns = false } = {}) {
    f.write('intent/shared.md', '---\nid: SPEC-SHARED\n---\nOnly the declared integration outcome governs the selected export.\n');
    f.write('src/integration.js', 'module.exports = "reviewed integration outcome";\n');
    for (const [id, title, patch] of [['AREA-A', 'Customer area A', { level: 'product' }], ['AREA-B', 'Customer area B', { level: 'product' }],
        ['FEATURE-F', 'Shared integration capability', { level: 'feature', areaIds: ['AREA-A', 'AREA-B'] }], ['GENERIC-G', 'Outcome area without a level', { areaIds: ['AREA-A'] }]]) await f.create(id, 'area', { title, ...patch });
    for (const [id, kind, title] of [
        ['TASK-P', 'task', 'Integration outcome'], ['TASK-Q', 'task', 'Historically accepted outcome'],
        ['TASK-R', 'task', 'Canceled outcome'], ['TASK-S', 'task', 'Retired outcome'],
        ['STORY-SUPPORT', 'story', 'Supporting story'], ['SUBTASK-SUPPORT', 'subtask', 'Supporting subtask'],
        ['TASK-U', 'task', 'Outside outcome in no area'], ['SUBTASK-Z', 'subtask', 'Outside parent-linked subtask']]) {
        await f.create(id, kind, { title });
    }
    for (const id of ['TASK-P', 'TASK-Q']) await f.saved('link', id, { links: [
        { relation: 'spec', path: 'intent/shared.md' }, { relation: 'source', path: 'src/integration.js' }] });
    // A tag is saved on the tagged record, beside the links it already holds, before any proof is recorded against it.
    for (const id of concerns ? ['TASK-P', 'SUBTASK-SUPPORT'] : ['TASK-P', 'TASK-Q', 'TASK-R', 'TASK-S', 'STORY-SUPPORT', 'SUBTASK-SUPPORT'])
        await f.tag(id, { areaIds: id === 'TASK-Q' ? ['FEATURE-F', 'GENERIC-G'] : ['FEATURE-F'] });
    await f.verifying('TASK-P'); await f.saved('proof', 'TASK-P', { proof: f.proof('TASK-P', { summary: 'Observed the declared integration outcome in its exact owner' }) });
    await f.accepted('TASK-Q');
    // A real later authored outcome edit invalidates current proof, while acceptance history remains owned.
    const q = f.record('TASK-Q'); f.write(q.ownerPath, q.text + '\nA teammate changed the governed outcome after acceptance.\n');
    await f.saved('transition', 'TASK-R', { state: 'canceled', reason: 'Outside active delivery' });
    await f.saved('retire', 'TASK-S', { reason: 'Historical delivery scope' });
    await f.saved('link', 'SUBTASK-Z', { links: [{ relation: 'parent', itemId: 'TASK-P' }] });
}
// Areas at three levels, one of them inside two products; initiatives that are overdue, due far ahead, undated with no
// task, and closed; tasks tagged across them and one in no area. Every date is far from the day of any run.
async function treeProject(f) {
    for (const [id, title, patch] of [['APP', 'Back office', { level: 'application' }], ['PRODUCT-B', 'Billing', { level: 'product', areaIds: ['APP'] }], ['PRODUCT-A', 'Accounts', { level: 'product', areaIds: ['APP'] }],
        ['FEATURE-X', 'Exports', { level: 'feature', areaIds: ['PRODUCT-A', 'PRODUCT-B'] }], ['LOOSE', 'Unsorted', {}]]) await f.create(id, 'area', { title, ...patch });
    for (const [id, title, patch] of [['INIT-LATE', 'Late review', { type: 'feedback', priorityLevel: 'high', deadline: '2026-01-15' }], ['INIT-SOON', 'Next release', { type: 'initiative', priorityLevel: 'low', deadline: '2999-01-01' }],
        ['INIT-OPEN', 'An idea to weigh', {}], ['INIT-DONE', 'Finished outcome', { type: 'initiative', deadline: '2026-01-10' }]]) await f.create(id, 'initiative', { title, ...patch });
    await f.create('TASK-1', 'task', { title: 'First export', areaIds: ['FEATURE-X'], initiativeIds: ['INIT-LATE', 'INIT-DONE'], deadline: '2026-01-20' }); await f.accepted('TASK-1');
    await f.create('TASK-2', 'task', { title: 'Second export', areaIds: ['FEATURE-X', 'LOOSE'], initiativeIds: ['INIT-LATE'], deadline: '2026-01-20' });
    await f.create('TASK-3', 'task', { title: 'Invoice run', areaIds: ['PRODUCT-B'], initiativeIds: ['INIT-SOON'] });
    await f.create('TASK-4', 'task', { title: 'Loose end' });
    await f.create('STORY-1', 'story', { title: 'A story', areaIds: ['FEATURE-X'] });
    await f.committed('INIT-LATE'); await f.committed('INIT-DONE'); await f.saved('transition', 'INIT-DONE', { state: 'done', reason: 'The outcome was reached' });
}
async function chooseDeliveryScope(page, id, transitions, { ref } = {}) {
    await page.getByRole('navigation').getByRole('button', { name: 'Changes', exact: true }).click();
    await page.getByRole('heading', { name: 'Changes and sharing', exact: true }).waitFor();
    await page.getByLabel('Delivery scope', { exact: true }).selectOption(id);
    if (ref !== undefined) await page.getByLabel('Shared local Git ref (optional)', { exact: true }).fill(ref);
    const inspected = page.waitForResponse(response => new URL(response.url()).pathname === '/api/inspect'
        && (response.request().postDataJSON()?.scopeId || '') === id);
    await page.getByRole('button', { name: 'Inspect selected scope', exact: true }).click(); await inspected;
    await page.getByRole('status').getByText(/Project reread/).waitFor();
    await page.getByRole('navigation').getByRole('button', { name: 'Work', exact: true }).click();
    await page.getByRole('heading', { name: 'Work', exact: true }).waitFor();
    transitions(`Choose actual delivery scope ${id || 'project'}`);
}
async function eligibleIds(page) {
    // Read the identity from the accessible name these rows are found by; their visible text runs the ID into the marks beside it.
    const names = await page.getByRole('region', { name: 'Eligible delivery tasks', exact: true })
        .getByRole('button', { name: /^TASK-/ }).evaluateAll(rows => rows.map(row => row.getAttribute('aria-label')));
    return names.map(name => name.match(/^(TASK-[A-Z]+): /)[1]).sort();
}
async function openEligible(page, id, transitions) {
    await page.getByRole('region', { name: 'Eligible delivery tasks', exact: true }).getByRole('button', { name: new RegExp(`^${id}:`) }).click();
    await selectedPane(page).getByRole('heading', { name: new RegExp(`^${id}:`) }).waitFor();
    transitions(`Open exact eligible owner ${id}`);
}
async function keepDraftAndNavigate(page, view, title = ({ Changes: 'Changes and sharing', Overview: 'Project progress' })[view] || view) {
    await page.getByRole('navigation').getByRole('button', { name: view, exact: true }).click();
    await page.getByRole('dialog', { name: 'Keep your draft?', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Keep draft and continue', exact: true }).click();
    await page.getByRole('heading', { name: title, exact: true }).waitFor();
}
// The review of a change of tags has its own heading and columns; every other form keeps the general ones.
async function exactPreview(page, heading = 'Review this exact change') {
    await page.getByRole('button', { name: 'Preview change', exact: true }).click();
    await page.getByRole('heading', { name: heading, exact: true }).waitFor();
    assert.equal(await isFocused(page.getByRole('heading', { name: heading, exact: true })), true, 'A preview puts the reader on what it produced');
    const summary = page.getByText('Exact proposed fields and source identity', { exact: true });
    await summary.click(); return JSON.parse(await summary.locator('..').locator('pre').innerText());
}
async function saveExactPreview(page, transitions) {
    await page.getByRole('button', { name: 'Save reviewed change', exact: true }).click();
    await page.getByRole('heading', { name: 'Work', exact: true }).waitFor();
    await page.getByRole('status').getByText(/Saved .* in the local checkout/).waitFor();
    transitions('Save the exact inspected preview');
}
async function disclosedList(page, name) {
    const summary = page.getByText(new RegExp(`^${name} \\(\\d+\\)$`));
    if (await summary.locator('..').getAttribute('open') === null) await summary.click();
    return page.getByRole('list', { name, exact: true });
}
// The scope line alone: the path line beside it can name the same area while another scope is still shown.
const scopeLine = (page, id) => page.getByRole('navigation', { name: 'Chosen scope path', exact: true }).locator('p').filter({ hasText: new RegExp(`^Delivery scope:.*${id}`) });
// Twenty-three areas at the top of a project, read by title. The first and the fifteenth each hold one area, and the last
// holds twelve, so there are levels to open on every page of ten and a scope with more than a page of areas inside it.
async function manyAreas(f) {
    const two = n => String(n).padStart(2, '0');
    for (let n = 1; n <= 23; n++) await f.create(`PART-${two(n)}`, 'area', { title: `Part ${two(n)}`, level: 'product' });
    for (const n of [1, 15]) await f.create(`INNER-${two(n)}`, 'area', { title: `Inner of ${two(n)}`, level: 'feature', areaIds: [`PART-${two(n)}`] });
    for (let n = 1; n <= 12; n++) await f.create(`PIECE-${two(n)}`, 'area', { title: `Piece ${two(n)}`, level: 'feature', areaIds: ['PART-23'] });
    await f.create('TASK-1', 'task', { title: 'One task', areaIds: ['PIECE-01'] });
}
// Twenty-five initiatives with no due date, so that they read by title: eighteen open and seven closed. One area and
// one task give the page a scope to enter.
async function manyInitiatives(f) {
    for (let n = 1; n <= 18; n++) await f.create(`INIT-OPEN-${String(n).padStart(2, '0')}`, 'initiative', { title: `Open outcome ${String(n).padStart(2, '0')}`, type: 'initiative' });
    for (let n = 1; n <= 7; n++) { await f.create(`INIT-DONE-${n}`, 'initiative', { title: `Closed outcome ${n}`, type: 'idea' }); await f.committed(`INIT-DONE-${n}`); await f.saved('transition', `INIT-DONE-${n}`, { state: 'done', reason: 'The outcome was reached' }); }
    await f.create('AREA-1', 'area', { title: 'One part', level: 'product' }); await f.create('TASK-1', 'task', { title: 'One task', areaIds: ['AREA-1'] });
}
// A project at a realistic size for layout: an area tree three levels deep beside eleven more areas at the top, two dozen initiatives, ninety tasks captured
// through the tracker, tagged and assigned (forty-five to one member, thirty-eight to another), and two hundred more
// records that nobody holds, as a project carries them before tracking is adopted for them. Titles run long, and
// identities, one title in seven and one member's address have no place at which a line can break.
async function volumeProject(f) {
    f.config.project.name = 'Regional operations and customer delivery programme';
    f.config.taskTracking.members = [{ id: 'owner', displayName: 'Owner', active: true },
        { id: HOLDER, displayName: 'Alexandria Montgomery Featherstonehaugh', active: true }, { id: 'peer', displayName: 'Peer', active: true }];
    f.saveConfig();
    await f.create(VOLUME_TOP, 'area', { title: 'Customer onboarding and renewals delivery across every regional office', level: 'application' });
    const features = [];
    for (const n of [1, 2, 3]) {
        await f.create(`PRODUCT_${n}`, 'area', { title: `Regional office ${n} onboarding and renewals`, level: 'product', areaIds: [VOLUME_TOP] });
        for (const m of [1, 2]) { features.push(`FEATURE_${n}_${m}_with_a_long_unbroken_identity_for_layout`); await f.create(features.at(-1), 'area', { title: `Renewal reminders and follow-up letters, part ${m}`, level: 'feature', areaIds: [`PRODUCT_${n}`] }); }
    }
    for (let n = 1; n <= 11; n++) await f.create(`SIDE_${n}`, 'area', { title: `Shared service number ${n} used by every office`, level: 'product' });
    for (let n = 1; n <= 24; n++) await f.create(`INIT_${n}`, 'initiative', { title: `Bring the renewal notices of region ${n} onto one schedule that every office follows`,
        type: ['feedback', 'idea', 'initiative'][n % 3], ...(n % 4 ? { deadline: n % 3 ? '2999-01-01' : '2026-01-15' } : {}), ...(n % 2 ? { priorityLevel: 'high' } : {}) });
    for (let n = 1; n <= 90; n++) {
        const id = `TASK_held_${n}_with_a_long_unbroken_identity`;
        await f.create(id, 'task', { title: `Reconcile the renewal letters sent in week ${n} with the list of accounts that were due`, areaIds: [features[n % features.length]], initiativeIds: [`INIT_${n % 24 + 1}`] });
        await f.saved('assign', id, { assigneeId: n <= 45 ? HOLDER : n <= 83 ? 'peer' : 'owner' });
    }
    for (let n = 1; n <= 200; n++) f.write(`work/tasks/TASK_open_${n}.md`, `---\nid: TASK_open_${n}\ntitle: ${n % 7 ? `Follow up the accounts of batch ${n} that did not answer the first renewal letter` : `Batch${n}${'unbrokenreference'.repeat(6)}end`}\nintent: Every account in the batch has an answer on record\nstatus: draft\n---\n`);
}
// The cards and panes of the workspace and of the status report: what each holds must stay inside it.
const WORKSPACE_BOXES = '.app-bar-row, .tabs, .banner, .status, .page-head, .filters, .scope-path, .sheet, .record-sheet, .review, .health, .person, .editor, .strip, .rows, .workbench';
const REPORT_BOXES = '.masthead, .card, .limits, .record-detail, .people, .work-region, .table, .notice, .hint';
// What a page paints where it does not belong: whether the document scrolls sideways, and every element that reaches past
// the card or pane that holds it. A box that scrolls sideways holds its own content, and must then say what it is and be
// reachable by keyboard; text shortened with an ellipsis is held by its own box; a box that clips is the limit for what
// is inside it, so content cut by it is found as well.
const layoutFaults = (scope, boxes) => scope.evaluate((body, selector) => {
    const page = body.ownerDocument.documentElement; const faults = [];
    const named = node => `${node.tagName.toLowerCase()}${node.id ? `#${node.id}` : ''}${typeof node.className === 'string' && node.className.trim() ? `.${node.className.trim().split(/\s+/).join('.')}` : ''}`;
    if (page.scrollWidth > page.clientWidth + 1) faults.push(`the page scrolls sideways (${page.scrollWidth} wide in ${page.clientWidth})`);
    const walk = (node, limit, holder) => {
        for (const child of node.children) {
            if (child.matches('.visually-hidden, dialog, script, style') || !child.getClientRects().length) continue;
            const box = child.getBoundingClientRect(); const style = getComputedStyle(child);
            if (box.width > 0 && (box.left < limit.left - 1 || box.right > limit.right + 1)) { faults.push(`${named(child)} reaches ${Math.round(Math.max(limit.left - box.left, box.right - limit.right))}px outside ${holder}`); continue; }
            if (/^(?:auto|scroll)$/.test(style.overflowX) && !child.matches('textarea, input, select')) {
                if (child.scrollWidth > child.clientWidth + 1 && !(child.getAttribute('aria-label') && child.tabIndex === 0)) faults.push(`${named(child)} scrolls sideways without a name or a keyboard stop`);
                continue;
            }
            if (style.textOverflow === 'ellipsis' || child.namespaceURI !== 'http://www.w3.org/1999/xhtml') continue;
            walk(child, style.overflowX === 'visible' ? limit : box, style.overflowX === 'visible' ? holder : named(child));
        }
    };
    for (const card of body.querySelectorAll(selector)) {
        if (!card.getClientRects().length) continue;
        const box = card.getBoundingClientRect();
        if (box.left < -1 || box.right > page.clientWidth + 1) faults.push(`${named(card)} reaches outside the page`);
        walk(card, box, named(card));
    }
    return [...new Set(faults)].slice(0, 20);
}, boxes);
// Whether a box is a keyboard stop of its own: from the first control inside it, one step back lands on the box. Putting
// focus on the box by script would not show this, since a browser lets a script focus a box no key can reach.
async function steppedBackTo(page, box, role) {
    await box.getByRole(role).first().focus(); await page.keyboard.press('Shift+Tab');
    return isFocused(box);
}
// The steps of the scope path above a scoped Overview, in order, and the step that is the scope itself.
const scopeSteps = page => page.getByRole('navigation', { name: 'Scope path', exact: true }).locator('.path-name strong').allTextContents();
// Scopes into an area from the Overview of the area it sits inside, so that the way in is the one the reader took, then
// returns to Work on that scope.
async function enterAreaInside(page, id, title, transitions) {
    await page.getByRole('navigation').getByRole('button', { name: 'Overview', exact: true }).click();
    await page.getByRole('heading', { name: 'Area progress', exact: true }).waitFor();
    await page.getByRole('region', { name: /^Areas inside this / }).getByRole('button', { name: new RegExp(`^${title}: show this area`) }).click();
    await page.getByRole('navigation', { name: 'Scope path', exact: true }).locator('[aria-current="page"]').getByText(title, { exact: true }).waitFor();
    await page.locator('main[aria-busy="false"]').waitFor();
    await page.getByRole('navigation').getByRole('button', { name: 'Work', exact: true }).click();
    await scopeLine(page, id).waitFor();
    transitions(`Scope into ${id} from the area it sits inside`);
}
async function detailJson(page, name) {
    const summary = selectedPane(page).getByText(name, { exact: true });
    if (await summary.locator('..').getAttribute('open') === null) await summary.click();
    return JSON.parse(await summary.locator('..').locator('pre').innerText());
}
async function browserPost(page, endpoint, value, authenticated = true) {
    return page.evaluate(async ({ endpoint, value, authenticated }) => {
        const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json',
            ...(authenticated ? { 'X-Workspace-Session': sessionStorage.getItem('workspace-session') } : {}) }, body: JSON.stringify(value) });
        return { status: response.status, value: await response.json() };
    }, { endpoint, value, authenticated });
}
async function observeConcernRequests(page) {
    const observations = [];
    await page.route('**/api/concerns', async route => {
        const request = route.request().postDataJSON(); const response = await route.fetch();
        observations.push({ request, status: response.status(), value: await response.json() });
        await route.fulfill({ response });
    });
    return observations;
}
async function retainDraftDuring(page, action) {
    await action(); await page.getByRole('dialog', { name: 'Keep your draft?', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Keep draft and continue', exact: true }).click();
}
// The status report shown inside the workspace: a frame of its own, read only after the workspace has answered and settled.
const reportFrame = page => page.frameLocator('iframe.report-frame');
async function shownReport(page, act) {
    const answered = page.waitForResponse(response => new URL(response.url()).pathname === '/api/report-view');
    await act(); const response = await answered;
    await page.locator('main[aria-busy="false"]').waitFor();
    return response;
}
async function frameManifest(page) {
    const frame = reportFrame(page); await frame.locator('html.enhanced').waitFor();
    return JSON.parse(await frame.locator('#task-track-manifest').textContent());
}
async function reportEligibleIds(page) {
    const names = await page.getByRole('list', { name: 'Eligible delivery tasks', exact: true }).getByRole('link', { name: /^TASK-/ }).allTextContents();
    return names.map(name => name.match(/TASK-[A-Z]+/)[0]).sort();
}
