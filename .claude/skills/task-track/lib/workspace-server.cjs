'use strict';

const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const { TextDecoder } = require('node:util');
const { trackingContext, LIMITS } = require('../../../hooks/lib/task-tracking-config.cjs');
const { fail, hash } = require('../../../hooks/lib/task-tracking-files.cjs');
const { stableValue } = require('../../../hooks/lib/task-artifact-store.cjs');
const { resolveActor, revalidateActor } = require('../../../hooks/lib/task-tracking-identity.cjs');
const { executeOperation } = require('../../../hooks/lib/task-tracking.cjs');
const { readProgress } = require('../../../hooks/lib/task-progress-reader.cjs');
const { readConcerns } = require('../../../hooks/lib/task-tracking-concerns.cjs');
const { resolveTrackingProfile } = require('../../../hooks/lib/task-tracking-profile.cjs');
const { ensureReport, ensureReportDocument } = require('../../../hooks/lib/task-tracking-report.cjs');
const { REPORT_INLINE_SOURCES } = require('./report-view.cjs');

// Typefaces ship with the app so it never loads anything from the network; assets/fonts/SOURCE.txt records their origin.
const FONT_FILES = Object.freeze(['display', 'text', 'mono'].flatMap(family => ['latin', 'latin-ext'].map(subset => `red-hat-${family}-${subset}-wght-normal.woff2`)));
const ASSETS = Object.freeze({ '/': ['index.html', 'text/html; charset=utf-8'],
    '/app.js': ['app.js', 'text/javascript; charset=utf-8'], '/style.css': ['style.css', 'text/css; charset=utf-8'],
    '/favicon.svg': ['favicon.svg', 'image/svg+xml'],
    ...Object.fromEntries(FONT_FILES.map(name => [`/fonts/${name}`, [`fonts/${name}`, 'font/woff2']])) });
// The app shows a status report in a frame that inherits this policy, so the report's one script and one stylesheet are
// named here by content hash. Nothing else inline may run or style, in the app or in the frame.
const CSP = `default-src 'none'; script-src 'self' ${REPORT_INLINE_SOURCES.script}; style-src 'self' ${REPORT_INLINE_SOURCES.style}; font-src 'self'; connect-src 'self'; img-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`;
// Both ensure the one generated report for a scope; the second also returns its text so the app can show it in place.
// The app always reads the full version, whatever form the project's own report file takes: asked for by name, it is
// written beside that file by the same writer.
const WORKSPACE_REPORT = Object.freeze({ detail: 'full' });
const REPORT_ROUTES = Object.freeze({ '/api/report': ensureReport, '/api/report-view': ensureReportDocument });
// Request intake is 15 s; cooperating writer waits are bounded separately.
const SHUTDOWN_TIMEOUT_MS = 20000;
// A launch link is what a browser launcher receives instead of the session address: one page, once, for a minute.
const LAUNCH_LINK_TTL_MS = 60000;
const LAUNCH_LINK_LIMIT = 8;
// A page without a session may ask for the workspace to be opened again; one request at a time, spaced out.
const REOPEN_INTERVAL_MS = 5000;

function secureHeaders(res) {
    res.setHeader('Content-Security-Policy', CSP);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
}

// A failure raised by the operating system (a missing, locked or mistyped path), as opposed to a refusal the tracker states itself.
const systemFailure = error => typeof error.errno === 'number' || typeof error.syscall === 'string';

function respond(res, status, value) {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(value));
}

async function body(req) {
    if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(req.headers['content-type'] || '')) fail('INVALID_INPUT', 'Use application/json for workspace actions');
    const declared = req.headers['content-length'];
    if (declared !== undefined && (!/^\d+$/.test(declared) || Number(declared) > LIMITS.recordBytes)) fail('LIMIT_EXCEEDED', 'Request exceeds selected byte budget');
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
        size += chunk.length;
        if (size > LIMITS.recordBytes) fail('LIMIT_EXCEEDED', 'Request exceeds selected byte budget');
        chunks.push(chunk);
    }
    try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks))); }
    catch { fail('INVALID_INPUT', 'Workspace action needs one JSON object'); }
}

/**
 * `reopen`, when given, is how this workspace asks the machine to show it: it receives a single-use launch link and
 * resolves with the launch outcome. Without it a page that has no session cannot have the workspace opened again.
 */
async function startWorkspace({ root, actor, writable = false, reopen } = {}) {
    if (Number(process.versions.node.split('.')[0]) < 20) fail('UNSUPPORTED_RUNTIME', 'Optional workspace requires Node 20 or newer');
    if (typeof writable !== 'boolean') fail('INVALID_INPUT', 'Writable launch selection must be explicit');
    const context = trackingContext(root);
    let selected;
    if (writable) {
        selected = resolveActor(context, actor);
        actor = selected.member.id;
    }
    const snapshotFor = (options = {}) => {
        // The app shows every area's and every initiative's own figures, so each of its reads asks for them.
        const snapshot = readProgress(context.root, { ...options, figures: true });
        if (!writable || options.ref !== undefined || selected.selection.source !== 'git') return snapshot;
        const current = revalidateActor(trackingContext(context.root), selected.selection);
        if (!current.unregistered || snapshot.coverage === 'unavailable') return snapshot;
        const members = [...snapshot.members.filter(person => person.id !== current.member.id), current.member];
        return { ...snapshot, members, fingerprint: hash(stableValue({ snapshot: snapshot.fingerprint, actor: actor, members })) };
    };
    const token = crypto.randomBytes(32).toString('base64url');
    const sessionId = crypto.randomUUID();
    let origin;
    let active = true;
    let pending = 0;
    const admitted = new Set();
    const authorized = req => {
        const received = req.headers['x-workspace-session'];
        if (typeof received !== 'string' || Buffer.byteLength(received) !== Buffer.byteLength(token)) return false;
        return crypto.timingSafeEqual(Buffer.from(received), Buffer.from(token));
    };
    const launchLinks = new Map();
    const launchLink = () => {
        const now = Date.now();
        for (const [code, expires] of launchLinks) if (expires <= now) launchLinks.delete(code);
        while (launchLinks.size >= LAUNCH_LINK_LIMIT) launchLinks.delete(launchLinks.keys().next().value);
        const code = crypto.randomBytes(32).toString('base64url');
        launchLinks.set(code, now + LAUNCH_LINK_TTL_MS);
        return `${origin}/#attach=${code}`;
    };
    // Redeeming removes the link whether or not it was still valid, so a link attaches at most one page.
    const redeem = code => {
        if (typeof code !== 'string') return false;
        const expires = launchLinks.get(code);
        launchLinks.delete(code);
        return expires !== undefined && expires > Date.now();
    };
    let reopening = false;
    let reopenedAt = 0;
    // What a page may do before it has a session. Nothing here reads work, and nothing returns the session unless a
    // launch link is redeemed; a reopen sends its link to the machine's own browser, never back to the caller.
    const beforeSession = async (req, res, target) => {
        if (req.method === 'GET' && target.pathname === '/api/launcher') return respond(res, 200, { reopen: typeof reopen === 'function' });
        if (req.method !== 'POST') return respond(res, 405, { status: 'refused', code: 'METHOD_NOT_ALLOWED' });
        if (req.headers.origin !== origin) return respond(res, 403, { status: 'refused', code: 'ORIGIN_REQUIRED' });
        const value = await body(req);
        const only = keys => value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).every(key => keys.includes(key));
        if (target.pathname === '/api/attach') {
            if (!only(['code'])) fail('INVALID_INPUT', 'Attach accepts only a launch code');
            return redeem(value.code) ? respond(res, 200, { token }) : respond(res, 403, { status: 'refused', code: 'LAUNCH_LINK_REFUSED' });
        }
        if (!only([])) fail('INVALID_INPUT', 'Reopen accepts no input');
        if (typeof reopen !== 'function') return respond(res, 403, { status: 'refused', code: 'REOPEN_UNAVAILABLE' });
        if (reopening || Date.now() - reopenedAt < REOPEN_INTERVAL_MS) return respond(res, 429, { status: 'refused', code: 'REOPEN_BUSY' });
        reopening = true; reopenedAt = Date.now();
        try {
            const launch = await reopen(launchLink());
            return respond(res, 200, { launch: { status: launch?.status === 'requested' ? 'requested' : 'not-opened',
                ...(launch?.browser ? { browser: String(launch.browser) } : {}), ...(launch?.reason ? { reason: String(launch.reason) } : {}) } });
        } finally { reopening = false; }
    };
    const handle = async (req, res) => {
        secureHeaders(res);
        try {
            if (!active || req.headers.host !== new URL(origin).host) return respond(res, 421, { status: 'refused', code: 'WRONG_HOST' });
            if (req.headers.origin !== undefined && req.headers.origin !== origin) return respond(res, 403, { status: 'refused', code: 'FOREIGN_ORIGIN' });
            if (req.headers['sec-fetch-site'] === 'cross-site') return respond(res, 403, { status: 'refused', code: 'FOREIGN_ORIGIN' });
            const target = new URL(req.url, origin);
            if (target.origin !== origin || target.search) return respond(res, 400, { status: 'refused', code: 'INVALID_ROUTE' });
            if (req.method === 'GET' && Object.hasOwn(ASSETS, target.pathname)) {
                const [name, type] = ASSETS[target.pathname];
                const bytes = fs.readFileSync(path.join(__dirname, '../assets', name));
                if (bytes.length > LIMITS.recordBytes) fail('LIMIT_EXCEEDED', 'Workspace asset exceeds the byte budget');
                res.setHeader('Content-Type', type); return res.end(bytes);
            }
            if (!target.pathname.startsWith('/api/')) return respond(res, 404, { status: 'refused', code: 'NOT_FOUND' });
            if (['/api/launcher', '/api/attach', '/api/reopen'].includes(target.pathname)) return await beforeSession(req, res, target);
            if (!authorized(req)) return respond(res, 403, { status: 'refused', code: 'SESSION_REQUIRED' });
            if (pending >= LIMITS.queue) return respond(res, 429, { status: 'refused', code: 'QUEUE_FULL' });
            pending++;
            try {
                if (req.method === 'GET' && target.pathname === '/api/session') {
                    const current = trackingContext(context.root);
                    return respond(res, 200, { schemaVersion: 1, sessionId, root: current.root, actor: actor || null,
                        writable, profile: resolveTrackingProfile(current), snapshot: snapshotFor() });
                }
                if (req.method !== 'POST') return respond(res, 405, { status: 'refused', code: 'METHOD_NOT_ALLOWED' });
                if (req.headers.origin !== origin) return respond(res, 403, { status: 'refused', code: 'ORIGIN_REQUIRED' });
                const value = await body(req);
                if (target.pathname === '/api/inspect') {
                    if (!value || typeof value !== 'object' || Array.isArray(value)
                        || Object.keys(value).some(key => !['ref', 'scopeId'].includes(key))) fail('INVALID_INPUT', 'Inspect accepts only a scope selector');
                    return respond(res, 200, snapshotFor(value));
                }
                if (target.pathname === '/api/concerns') {
                    if (!value || typeof value !== 'object' || Array.isArray(value)
                        || Object.keys(value).some(key => !['query', 'ref'].includes(key))) fail('INVALID_INPUT', 'Concerns accepts an exact query and optional selected local reference');
                    return respond(res, 200, readConcerns(context.root, value.query, value.ref === undefined ? {} : { ref: value.ref }));
                }
                if (Object.hasOwn(REPORT_ROUTES, target.pathname)) {
                    if (!value || typeof value !== 'object' || Array.isArray(value)
                        || Object.keys(value).some(key => !['ref', 'scopeId'].includes(key))) fail('INVALID_INPUT', 'Report accepts only a scope selector');
                    // The selector is valid from here on, so a refusal by the report owner is a refused action (422), as for a saved operation.
                    let report;
                    try { report = await REPORT_ROUTES[target.pathname](context.root, { ...value, ...WORKSPACE_REPORT }); }
                    catch (error) {
                        if (!error.code || systemFailure(error)) throw error;
                        return respond(res, 422, { status: 'refused', code: error.code, reason: error.message });
                    }
                    return respond(res, 200, report);
                }
                if (target.pathname === '/api/operation') {
                    if (!writable) return respond(res, 403, { status: 'refused', code: 'READ_ONLY' });
                    if (value?.actor?.memberId !== actor) return respond(res, 403, { status: 'refused', code: 'WRONG_ACTOR' });
                    const result = await executeOperation(value, { root: context.root, actor, identity: selected.selection, canWrite: true,
                        canReview: true, canRecordManual: true, canAccept: true, canAttest: true, canDelete: true, canDeleteEnded: true, canCorrectState: true, canDecide: true });
                    return respond(res, result.primary.status === 'refused' ? (result.primary.code === 'CONFLICT' ? 409 : 422) : 200, result);
                }
                return respond(res, 404, { status: 'refused', code: 'NOT_FOUND' });
            } finally { pending--; }
        } catch (error) {
            // An operating-system failure is the workspace's fault, not the request's: it answers 500, and its message,
            // which names absolute paths, stays on this side.
            const system = systemFailure(error);
            if (!res.headersSent) respond(res, system ? 500 : error.code === 'LIMIT_EXCEEDED' ? 413 : 400,
                { status: 'refused', code: system || !error.code ? 'IO_FAILURE' : error.code,
                    reason: system || !error.code ? 'Workspace action unavailable; reread before retrying' : error.message });
            else res.end();
        }
    };
    const server = http.createServer((req, res) => {
        if (!active) { secureHeaders(res); respond(res, 503, { status: 'refused', code: 'WORKSPACE_CLOSING' }); return; }
        const responseFinished = new Promise(resolve => {
            const finished = () => { res.removeListener('finish', finished); res.removeListener('close', finished); resolve(); };
            res.once('finish', finished); res.once('close', finished);
        });
        // A disconnected response does not prove its admitted filesystem operation stopped.
        const completion = handle(req, res).then(() => responseFinished, () => responseFinished).finally(() => admitted.delete(completion));
        admitted.add(completion);
    });
    server.headersTimeout = 10000;
    server.requestTimeout = 15000;
    server.keepAliveTimeout = 1000;
    server.maxHeadersCount = 32;
    server.maxRequestsPerSocket = 128;
    await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(0, '127.0.0.1', () => { server.removeListener('error', reject); resolve(); });
    });
    origin = `http://127.0.0.1:${server.address().port}`;
    let closing;
    const close = () => {
        if (closing) return closing;
        active = false;
        const stopped = new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
        server.closeIdleConnections();
        let timer;
        const deadline = new Promise((resolve, reject) => {
            timer = setTimeout(() => {
                server.closeAllConnections();
                reject(Object.assign(new Error(admitted.size ? 'Shutdown deadline reached; admitted operation outcome is indeterminate. Reread and retry its original identity.'
                    : 'Shutdown deadline reached; transport closure is unconfirmed.'),
                { code: admitted.size ? 'SHUTDOWN_INDETERMINATE' : 'SHUTDOWN_TIMEOUT' }));
            }, SHUTDOWN_TIMEOUT_MS);
        });
        closing = Promise.race([Promise.all([stopped, ...admitted]), deadline]).finally(() => clearTimeout(timer));
        return closing;
    };
    return { server, root: context.root, writable, url: `${origin}/#session=${token}`, origin, launchLink, close };
}

module.exports = { ASSETS, CSP, SHUTDOWN_TIMEOUT_MS, LAUNCH_LINK_TTL_MS, REOPEN_INTERVAL_MS, body, startWorkspace };
