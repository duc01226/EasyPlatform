'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { fileURLToPath } = require('node:url');
const { withFixture } = require('../../../hooks/tests/lib/task-tracking-fixture.cjs');
const { startWorkspace } = require('../lib/workspace-server.cjs');

const VIEWPORTS = Object.freeze({ desktop: { width: 1280, height: 800 }, mobile: { width: 390, height: 844 } });
const SETTLE_MS = 20000;
const MAX_CAPTURES_PER_TEST = 20;
// Full declared matrix: 135 states x 2 viewports x at most 2 images (viewport and full-page).
// Reconcile the bound when states/viewports change; failure captures remain exempt.
const MAX_CAPTURES_PER_RUN = 540;
const MAX_LOGS_PER_TEST = 1000;
const MASK_SELECTORS = Object.freeze(['#root-context', '.source dt:has-text("Checkout") + dd']);

async function waitForSignal(signal, label) {
    let timer;
    try {
        await Promise.race([signal, new Promise((resolve, reject) => {
            timer = setTimeout(() => reject(new Error(`Timed out observing ${label}`)), SETTLE_MS);
        })]);
    } finally { clearTimeout(timer); }
}

// The same explicit executable works after HOME/TMP isolation on Windows, macOS and Linux.
// Browser tooling is optional; requiring this helper never launches or installs it.
function browserRuntime() {
    if (Number(process.versions.node.split('.')[0]) < 20) throw new Error('ENVIRONMENT-BLOCKED: workspace browser tests require Node20+');
    let playwright;
    try { playwright = require('../node_modules/playwright'); }
    catch { throw new Error('ENVIRONMENT-BLOCKED: install the pinned task-track dev dependencies with npm ci --include=dev in the skill directory'); }
    const executablePath = playwright.chromium.executablePath();
    if (!fs.existsSync(executablePath)) throw new Error('ENVIRONMENT-BLOCKED: provision Chromium using the installed task-track Playwright CLI');
    return { playwright, executablePath };
}

function createEvidence(root, runId) {
    const directory = path.join(root, runId);
    fs.mkdirSync(directory, { recursive: true });
    const manifest = { schemaVersion: 1, runId, mode: 'declared-only', captures: [], uncapturedTransitions: [], results: [] };
    const persist = () => fs.writeFileSync(path.join(directory, 'capture-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
    persist();
    return { directory, manifest, persist };
}

async function withWorkspace(test, viewportName, options, run) {
    const { runtime, evidence, headed } = options;
    const cleanup = { case_id: test.caseId, variant: test.variant, viewport: viewportName,
        browser: 'not-started', workspace: 'not-started', fixture: 'pending' };
    let ownedRoot;
    try { return await withFixture(async fixture => {
        ownedRoot = fixture.root;
        let workspace, browser, page;
        const logs = [];
        const caseKey = `${test.caseId}-${test.variant}-${viewportName}`;
        const directory = path.join(evidence.directory, caseKey);
        fs.mkdirSync(directory, { recursive: true });
        let token = '';
        let logOverflow = false;
        const redact = value => String(value)
            .split(fixture.root).join('[OWNED-FIXTURE]')
            .split(token || '\u0000').join('[SESSION]')
            .replace(/https?:\/\/[^\s"']+/g, '[URL]')
            .replace(/(?:bearer\s+|(?:token|secret|api[_-]?key)\s*[=:]\s*)[^\s,;]+/gi, '[REDACTED]')
            .slice(0, 2000);
        const appendLog = entry => {
            if (logs.length >= MAX_LOGS_PER_TEST) { logOverflow = true; return; }
            logs.push(entry);
        };
        let consoleCursor = 0;
        let captures = 0;
        // `frame` names a frame element to picture by itself, brought into view, as one image: the narrow full-page image
        // of the workspace came out with an unpainted report frame, so it is no evidence of what the frame shows.
        const capture = async (state, expected, { failure = false, frame } = {}) => {
            const variants = [false];
            const scrollable = !frame && await page.evaluate(() => document.documentElement.scrollHeight > innerHeight || document.documentElement.scrollWidth > innerWidth);
            if (scrollable) variants.push(true);
            const target = frame ? 'status report frame' : 'visible workspace';
            // A mask is placed where the selector is found: in the page and, for a frame, in the document it shows.
            const masks = [...MASK_SELECTORS.map(selector => page.locator(selector)), ...(frame ? MASK_SELECTORS.map(selector => page.frameLocator(frame).locator(selector)) : [])];
            for (const fullPage of variants) {
                if (!failure && (captures >= MAX_CAPTURES_PER_TEST || evidence.manifest.captures.length >= MAX_CAPTURES_PER_RUN)) {
                    evidence.manifest.captures.push({ seq: evidence.manifest.captures.length + 1,
                        owner_path: test.owner, case_id: test.caseId, variant: test.variant,
                        test: { path: path.relative(process.cwd(), path.join(__dirname, 'workspace-browser.test.cjs')).split(path.sep).join('/'), name: test.name },
                        case_step: state, source: 'matrix', phase: 'post', action_type: 'declared-state', action_label: state,
                        target, route: '/', surface: 'task-track-workspace',
                        viewport: { name: viewportName, ...VIEWPORTS[viewportName], full_page: fullPage },
                        expected_delta: expected, capped: true, masked: [...MASK_SELECTORS], console_since_last: [], read: false });
                    evidence.persist();
                    throw new Error('Capture budget exhausted; required state remains unverified');
                }
                captures++;
                const filename = `${String(captures).padStart(3, '0')}-${state}${fullPage ? '-full' : ''}.png`;
                const file = path.join(directory, filename);
                if (frame) { await page.locator(frame).scrollIntoViewIfNeeded(); await page.locator(frame).screenshot({ path: file, animations: 'disabled', timeout: SETTLE_MS, mask: masks }); }
                else await page.screenshot({ path: file, fullPage, animations: 'disabled', timeout: SETTLE_MS, mask: masks });
                const consoleSinceLast = logs.slice(consoleCursor).filter(entry => ['console', 'pageerror'].includes(entry.kind));
                evidence.manifest.captures.push({ seq: evidence.manifest.captures.length + 1,
                    owner_path: test.owner, case_id: test.caseId, variant: test.variant,
                    test: { path: path.relative(process.cwd(), path.join(__dirname, 'workspace-browser.test.cjs')).split(path.sep).join('/'), name: test.name }, case_step: state,
                    source: 'matrix', phase: failure ? 'failure' : 'post', action_type: 'declared-state', action_label: state,
                    target, route: '/', surface: 'task-track-workspace',
                    viewport: { name: viewportName, ...VIEWPORTS[viewportName], full_page: fullPage },
                    expected_delta: expected, path: path.relative(process.cwd(), file).split(path.sep).join('/'), masked: [...MASK_SELECTORS], console_since_last: consoleSinceLast, read: false });
                consoleCursor = logs.length;
                evidence.persist();
            }
        };
        const transitions = label => {
            evidence.manifest.uncapturedTransitions.push({ case_id: test.caseId, variant: test.variant, viewport: viewportName, action: label });
        };
        try {
            await test.setup(fixture);
            // A case that declares `reopenable` gets the launch-side hook a real `--open` launch supplies; it records the
            // launch links the workspace would hand to a browser instead of starting one.
            const reopened = [];
            // A case may name the member the workspace is launched as; every other case is launched as the fixture's owner.
            workspace = await startWorkspace({ root: fixture.root, actor: test.actor || 'owner', writable: test.writable !== false,
                ...(test.reopenable ? { reopen: async link => { reopened.push(link); return { status: 'requested', browser: 'default', observedViewer: 'unverified' }; } } : {}) });
            cleanup.workspace = 'pending';
            token = new URLSearchParams(new URL(workspace.url).hash.slice(1)).get('session');
            browser = await runtime.playwright.chromium.launch({ executablePath: runtime.executablePath, headless: !headed, timeout: SETTLE_MS });
            cleanup.browser = 'pending';
            const context = await browser.newContext({ viewport: VIEWPORTS[viewportName], locale: 'en-US', javaScriptEnabled: test.javaScriptEnabled !== false });
            page = await context.newPage();
            page.setDefaultTimeout(SETTLE_MS);
            page.setDefaultNavigationTimeout(SETTLE_MS);
            page.on('console', message => appendLog({ kind: 'console', type: message.type(), message: redact(message.text()) }));
            page.on('pageerror', error => appendLog({ kind: 'pageerror', message: redact(error.message) }));
            page.on('response', response => {
                const url = new URL(response.url());
                appendLog({ kind: 'response', route: url.origin === workspace.origin ? url.pathname : '[EXTERNAL]', status: response.status() });
            });
            page.on('requestfailed', request => appendLog({ kind: 'requestfailed', route: new URL(request.url()).origin === workspace.origin ? new URL(request.url()).pathname : '[EXTERNAL]',
                message: redact(request.failure()?.errorText || 'Unknown transport failure') }));
            // Deny external network for the offline contract; the server/session path is real.
            await context.route('**/*', route => {
                const url = new URL(route.request().url());
                if (url.origin === workspace.origin) return route.continue();
                if (url.protocol === 'file:') {
                    const relative = path.relative(fixture.root, fileURLToPath(url));
                    if (relative && !relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative)) return route.continue();
                }
                return route.abort();
            });
            const open = async fragment => {
                const url = new URL(workspace.url);
                if (fragment) for (const [key, value] of Object.entries(fragment)) url.hash += `&${key}=${encodeURIComponent(value)}`;
                await page.goto('about:blank');
                await page.goto(url.href);
                await page.locator('main[aria-busy="false"]').waitFor();
                transitions(fragment ? 'Open selected item link' : 'Open selected workspace');
            };
            await run({ fixture, workspace, page, capture, transitions, open, logs, reopened });
            if (logOverflow) throw new Error('Runtime evidence budget exhausted; untaken events are not clean evidence');
            if (logs.some(entry => entry.kind === 'pageerror' || entry.kind === 'console' && entry.type === 'error'
                && !(test.expectedConsole || []).some(pattern => pattern.test(entry.message)))) {
                throw new Error('Workspace emitted runtime errors; inspect redacted runtime evidence');
            }
        } catch (error) {
            if (page) {
                try { await capture('failure', 'Inspect the failed observable assertion', { failure: true }); }
                catch (captureError) { appendLog({ kind: 'capturefailure', message: redact(captureError.message) }); }
            }
            throw new Error(redact(error.message));
        } finally {
            fs.writeFileSync(path.join(directory, 'runtime.json'), `${JSON.stringify(logs, null, 2)}\n`);
            // Finally also runs on assertion failure; closure does not imply unsettled saves canceled.
            try { if (browser) { await browser.close(); cleanup.browser = 'closed'; } }
            finally { if (workspace) { await workspace.close(); cleanup.workspace = 'closed'; } evidence.persist(); }
        }
    }); } finally {
        cleanup.fixture = ownedRoot && !fs.existsSync(ownedRoot) ? 'removed-owned-fixture' : 'unconfirmed';
        if (!evidence.manifest.cleanup) evidence.manifest.cleanup = [];
        evidence.manifest.cleanup.push(cleanup); evidence.persist();
    }
}

module.exports = { VIEWPORTS, SETTLE_MS, browserRuntime, createEvidence, withWorkspace, waitForSignal };
