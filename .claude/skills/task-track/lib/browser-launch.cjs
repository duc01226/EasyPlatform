'use strict';

// Opens the local workspace in a browser on the machine that serves it: Google Chrome when it is
// installed, otherwise the default browser. The report opener owns when nothing may be opened and how
// each platform's default handler is started; both are reused here.
const fs = require('node:fs');
const path = require('node:path');
const childProcess = require('node:child_process');
const { skipReason, openCommand } = require('../../../scripts/open-report.cjs');

// Only this workspace's own single-use launch link is ever handed to a launcher, never its session address:
// a launcher's arguments can be read by other processes. The shape also excludes every character cmd.exe
// expands or splits on, which the Windows default-handler command depends on.
const LAUNCH_LINK = /^http:\/\/127\.0\.0\.1:\d{1,5}\/#attach=[A-Za-z0-9_-]{20,}$/;
// A launcher still running after this long counts as started: a browser's first process stays up.
const START_GRACE_MS = 1500;
const CHROME_BUNDLE_ID = 'com.google.Chrome';
const CHROME_WINDOWS_ROOTS = Object.freeze(['ProgramFiles', 'ProgramFiles(x86)', 'LOCALAPPDATA']);
const CHROME_WINDOWS_PATH = Object.freeze(['Google', 'Chrome', 'Application', 'chrome.exe']);
const CHROME_LINUX_COMMANDS = Object.freeze(['google-chrome', 'google-chrome-stable']);

function regularFile(file) {
    try { return fs.statSync(file).isFile(); }
    catch { return false; }
}

// A copied environment object is case-sensitive even where the operating system's own is not.
function envValue(env, name) {
    const key = Object.keys(env).find(candidate => candidate.toLowerCase() === name.toLowerCase());
    return key === undefined ? undefined : env[key];
}

/** Ways to start Google Chrome on `platform`, each still missing the address argument. */
function chromeCommands(platform, env, isFile) {
    // Launch Services finds the application wherever it is installed and exits non-zero when it is not.
    if (platform === 'darwin') return [{ command: 'open', args: ['-b', CHROME_BUNDLE_ID] }];
    // Chrome is not on PATH on Windows, and asking `start` for a missing program shows an error dialog,
    // so only an existing executable is started, and directly. It is a window application: the hidden
    // start that suits a console launcher would ask it to start without showing its window.
    if (platform === 'win32') return CHROME_WINDOWS_ROOTS.map(name => envValue(env, name)).filter(Boolean)
        .map(base => path.win32.join(base, ...CHROME_WINDOWS_PATH)).filter(isFile).map(command => ({ command, args: [], window: true }));
    if (platform === 'linux') return CHROME_LINUX_COMMANDS.map(command => ({ command, args: [] }));
    return [];
}

/** Launch attempts in order: Chrome first, then the platform's default browser. */
function launchPlan(url, { platform = process.platform, env = process.env, isFile = regularFile } = {}) {
    const fallback = openCommand(platform, url);
    return [...chromeCommands(platform, env, isFile).map(({ command, args, window = false }) => ({ browser: 'chrome', command, args: [...args, url], window })),
        ...(fallback ? [{ browser: 'default', command: fallback.command, args: fallback.args, window: false }] : [])];
}

/** Resolves true when the launcher exited cleanly or is still running after the grace period. */
function start(attempt, spawn, graceMs) {
    return new Promise(resolve => {
        let child;
        // The address is a literal argument, never part of a shell string.
        try { child = spawn(attempt.command, attempt.args, { detached: true, stdio: 'ignore', windowsHide: !attempt.window }); }
        catch { resolve(false); return; }
        const timer = setTimeout(() => settle(true), graceMs);
        function settle(started) { clearTimeout(timer); resolve(started); }
        child.once('error', () => settle(false));
        child.once('exit', code => settle(code === 0));
        if (typeof child.unref === 'function') child.unref();
    });
}

/**
 * Ask the machine to open a workspace launch link. A started launcher is a request, not proof that a
 * page rendered, so the outcome never claims an observed viewer.
 * @returns {Promise<{status: 'requested' | 'not-opened', browser?: 'chrome' | 'default', reason?: string, observedViewer: 'unverified'}>}
 */
async function launchBrowser(url, { platform = process.platform, env = process.env, spawn = childProcess.spawn,
    isFile = regularFile, graceMs = START_GRACE_MS } = {}) {
    const outcome = (status, detail) => ({ status, ...detail, observedViewer: 'unverified' });
    if (typeof url !== 'string' || !LAUNCH_LINK.test(url)) return outcome('not-opened', { reason: 'address is not a launch link of this local workspace' });
    const skip = skipReason(platform, env);
    if (skip) return outcome('not-opened', { reason: skip });
    for (const attempt of launchPlan(url, { platform, env, isFile })) {
        if (await start(attempt, spawn, graceMs)) return outcome('requested', { browser: attempt.browser });
    }
    return outcome('not-opened', { reason: 'no browser could be started on this machine' });
}

module.exports = { LAUNCH_LINK, START_GRACE_MS, launchPlan, launchBrowser, startLauncher: start };
