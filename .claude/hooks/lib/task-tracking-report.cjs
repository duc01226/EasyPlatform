'use strict';

const fs = require('node:fs');
const { trackingContext, REPORT_DETAIL_FORMS, REPORT_DEFAULTS } = require('./task-tracking-config.cjs');
const { readProgress } = require('./task-progress-reader.cjs');
const { stableValue } = require('./task-artifact-store.cjs');
const { fail, hash, readBytes, scopedPath, publishBytes } = require('./task-tracking-files.cjs');
const { withTrackingLock } = require('./task-tracking-lock.cjs');
const { openReport } = require('../../scripts/open-report.cjs');

const REPORT_PATH = 'tmp/task-tracking/project-status.html';
const OWNER = '<!-- task-track-generated:v1 -->';
const EMPTY_HASH = '0'.repeat(64);
// A status report is as large as the selected project makes it: it is generated output, not a record, so the record byte
// budget does not apply to writing it, replacing it or reading it back. Its inputs stay bounded by the read budgets.
const REPORT_BYTES = Number.POSITIVE_INFINITY;
const MANIFEST = /<script id="task-track-manifest" type="application\/json">([^<]*)<\/script>/;
const json = value => JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
// The manifest is the first such element in a report; record content is escaped and cannot form one before it.
const withManifest = (html, manifest) => html.replace(MANIFEST, () => `<script id="task-track-manifest" type="application/json">${json(manifest)}</script>`);

/**
 * What this request asks the report to be: the caller's own choice first, then the project's, then the compact version.
 * The project's budget governs the snapshots the project configures; a form asked for by name is held only to a budget
 * asked for with it. With no budget stated, a compact version is held to the default one and the full version to none,
 * so the full version a compact copy points to can always be written.
 */
function requestedForm(policy, options) {
    const detail = options.detail ?? policy.detail ?? REPORT_DEFAULTS.detail;
    const maxBytes = options.maxBytes ?? (options.detail === undefined ? policy.maxBytes : undefined) ?? (detail === 'full' ? null : REPORT_DEFAULTS.compactBytes);
    if (!REPORT_DETAIL_FORMS.includes(detail)) fail('INVALID_INPUT', 'Detail form invalid: expected full, packed or none');
    if (maxBytes !== null && !(Number.isSafeInteger(maxBytes) && maxBytes > 0)) fail('INVALID_INPUT', 'Size budget invalid: expected a positive whole number of bytes');
    return { detail, maxBytes };
}

/**
 * Where a report is written. The report the project keeps current has the plain name; a pinned source or a selected
 * scope has its own. A form or budget asked for by itself gets its own place too, so it never replaces the project's own
 * report, unless it names exactly what that report already is: asking for the project's own form by name is asking for
 * that report.
 * `policy` is the project's report configuration; without it the tracker's own defaults stand in.
 */
function reportPath(options = {}, policy = {}) {
    const variant = { ref: options.ref || null, scopeId: options.scopeId || null };
    const asked = requestedForm(policy, options), own = requestedForm(policy, {});
    if ((options.detail !== undefined || options.maxBytes !== undefined) && (asked.detail !== own.detail || asked.maxBytes !== own.maxBytes))
        Object.assign(variant, { detail: options.detail || null, maxBytes: options.maxBytes || null });
    else if (options.ref === undefined && options.scopeId === undefined) return REPORT_PATH;
    return `tmp/task-tracking/project-status-${hash(stableValue(variant)).slice(0, 20)}.html`;
}

function inspectReport(root, relative = REPORT_PATH) {
    try {
        const bytes = readBytes(root, relative, REPORT_BYTES);
        const html = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
        const match = html.match(MANIFEST);
        if (!/^<!doctype html>/i.test(html) || !html.includes(OWNER) || !match) fail('HUMAN_COLLISION', 'Existing report has no verifiable generated owner; preserve it');
        const manifest = JSON.parse(match[1]);
        if (manifest.schemaVersion !== 1 || manifest.rootIdentity !== hash(fs.realpathSync(root)) || !/^[a-f0-9]{64}$/.test(manifest.outputHash)) fail('HUMAN_COLLISION', 'Report provenance is unsupported; preserve it');
        const normalized = withManifest(html, { ...manifest, outputHash: EMPTY_HASH });
        if (hash(normalized) !== manifest.outputHash) fail('HUMAN_COLLISION', 'Report was edited outside its renderer; preserve it');
        return { manifest, contentHash: hash(bytes), bytes: bytes.length };
    } catch (error) {
        if (error.code === 'ENOENT') return null;
        if (error.code) throw error;
        fail('HUMAN_COLLISION', 'Existing report is not a verifiable generated artifact; preserve it');
    }
}

async function ensureReport(root, options = {}) {
    const context = trackingContext(root);
    if (!context.report.enabled) return { kind: 'report', status: 'skipped', reason: 'Project report generation is disabled' };
    return withTrackingLock(context.root, () => {
        const currentContext = trackingContext(context.root);
        if (!currentContext.report.enabled) return { kind: 'report', status: 'skipped', reason: 'Project report generation is disabled' };
        const asked = requestedForm(currentContext.report, options);
        const relative = reportPath(options, currentContext.report);
        const existing = inspectReport(context.root, relative);
        if (options.initializedOnly && !existing) return { kind: 'report', status: 'skipped', reason: 'No report initialized; open project status to create it' };
        const snapshot = readProgress(context.root, { ...options, figures: true });
        // Mixed vocabularies or an unfinished migration: the refusal is the selected source's own, so the cause can be acted on.
        const stored = snapshot.vocabulary?.project;
        if (stored?.code && stored.storedVersion === null) fail(stored.code, `${stored.reason}; prior output preserved`);
        if (!snapshot.profile.available || snapshot.coverage === 'unavailable') fail('UNAVAILABLE_REPORT', 'Selected profile has no proved read-only report capability; prior output preserved');
        const identity = { schemaVersion: 1, rootIdentity: hash(context.root), scope: options.ref === undefined ? 'worktree' : `shared:${options.ref}`,
            scopeId: options.scopeId || null, fingerprint: snapshot.fingerprint,
            rendererVersion: 12, policyIdentity: hash(stableValue(currentContext.report)), detail: asked.detail, maxBytes: asked.maxBytes };
        // The result always names the form written and its size, and what a budget did, so an omission is never silent.
        const described = (status, form, bytes) => ({ kind: 'report', status, path: relative, fingerprint: snapshot.fingerprint, coverage: snapshot.coverage, detail: form, bytes,
            ...(form !== asked.detail ? { requestedDetail: asked.detail } : {}), ...(asked.maxBytes ? { maxBytes: asked.maxBytes, budgetMet: bytes <= asked.maxBytes } : {}) });
        if (existing && Object.entries(identity).every(([key, value]) => existing.manifest[key] === value)) return described('current', existing.manifest.form, existing.bytes);
        const { renderReport } = require('../../skills/task-track/lib/report-view.cjs');
        // The output hash covers the report with an empty hash in its manifest, which is then filled in; the hash keeps the same length.
        const render = (form, met) => {
            const manifest = { ...identity, form, generatedAt: snapshot.asOf, outputHash: EMPTY_HASH };
            return { manifest, unsigned: renderReport(snapshot, manifest, { detail: form, budget: { maxBytes: asked.maxBytes, requested: asked.detail, met } }) };
        };
        const fits = text => !asked.maxBytes || Buffer.byteLength(text) <= asked.maxBytes;
        // The richest form that fits is written: the form asked for, then each smaller one.
        let written;
        for (const form of REPORT_DETAIL_FORMS.slice(REPORT_DETAIL_FORMS.indexOf(asked.detail))) { written = render(form, true); if (fits(written.unsigned)) break; }
        // Nothing fits: the smallest form is still written, and says the budget was not met.
        if (!fits(written.unsigned)) written = render(written.manifest.form, false);
        const { manifest, unsigned } = written;
        manifest.outputHash = hash(unsigned);
        const html = Buffer.from(withManifest(unsigned, manifest));
        const reread = readProgress(context.root, options);
        if (reread.fingerprint !== snapshot.fingerprint || reread.coverage === 'unavailable') fail('CONFLICT', 'Selected sources changed before report publication; retry explicitly');
        publishBytes(context.root, relative, html, existing?.contentHash || null, REPORT_BYTES);
        return described('generated', manifest.form, html.length);
    });
}

/**
 * The current report for a scope together with its text, for a viewer that shows it in place instead of opening the file.
 * It is the same generated artifact: ensured first, then read back and checked against the result just returned.
 */
async function ensureReportDocument(root, options = {}) {
    const report = await ensureReport(root, options);
    if (!['current', 'generated'].includes(report.status)) return { report };
    const context = trackingContext(root);
    const bytes = readBytes(context.root, report.path, REPORT_BYTES);
    const artifact = inspectReport(context.root, report.path);
    if (!artifact || artifact.contentHash !== hash(bytes) || artifact.manifest.fingerprint !== report.fingerprint) fail('CONFLICT', 'Report changed before it could be shown; reread');
    return { report: { ...report, generatedAt: artifact.manifest.generatedAt }, html: new TextDecoder('utf-8', { fatal: true }).decode(bytes) };
}

async function refreshInitializedReport(root) {
    try {
        const context = trackingContext(root);
        if (!context.report.enabled || !context.report.autoRefresh) return { kind: 'report', status: 'skipped', reason: 'Automatic report refresh is disabled' };
        return await ensureReport(root, { initializedOnly: true });
    } catch (error) {
        return { kind: 'report', status: 'pending', code: error.code || 'IO_FAILURE', reason: 'Primary item save retained; report refresh needs explicit recovery' };
    }
}

async function ensureAndOpenReport(root, options = {}) {
    const report = await ensureReport(root, options);
    if (!['current', 'generated'].includes(report.status)) return { report, launch: { status: 'skipped', reason: report.reason } };
    const context = trackingContext(root);
    const current = readProgress(root, options);
    const artifact = inspectReport(context.root, report.path);
    if (artifact?.manifest.fingerprint !== current.fingerprint) fail('CONFLICT', 'Report changed or became stale before launch; reread');
    const launched = openReport(scopedPath(context.root, report.path), { cwd: context.root,
        env: { ...process.env, CLAUDE_PROJECT_DIR: context.root }, log: () => {} });
    return { report, launch: { status: launched.opened ? 'requested' : 'not-opened', reason: launched.reason,
        path: launched.file || report.path, observedViewer: 'unverified' } };
}

module.exports = { REPORT_PATH, reportPath, inspectReport, ensureReport, ensureReportDocument, refreshInitializedReport, ensureAndOpenReport };
