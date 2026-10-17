#!/usr/bin/env node
'use strict';

/**
 * open-report — open a generated report in the user's default viewer.
 *
 * Usage: node .claude/scripts/open-report.cjs <path>
 *
 * Contract:
 * - Opens only an existing regular file inside the project's `tmp/` or `temp/` directory. A relative
 *   path resolves against the project root; symlinks and junctions are resolved before the check.
 * - Opens only a report type (`REPORT_EXTENSIONS`, case-insensitive, checked on the resolved file).
 *   The OS default handler runs scripts and launchers (`.cmd`, `.bat`, `.exe`, `.js`, `.lnk`,
 *   `.command`, `.desktop`, …), so any other type is refused, never handed to it.
 * - Launches with a literal argv vector, never a shell string:
 *   win32 `<SystemRoot>\System32\cmd.exe /c start "" <path>` · darwin `open <path>` · linux `xdg-open <path>`.
 * - Opens nothing when `CI` is set, when `CK_NO_AUTO_OPEN=1`, or on Linux when neither `DISPLAY`
 *   nor `WAYLAND_DISPLAY` is set. The path is printed in every case so the user can open it.
 * - Never throws and always exits 0: a failed open is reported, never fatal.
 */

const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const { resolveProjectRoot } = require('./lib/project-root.cjs');

const REPORT_DIRS = ['tmp', 'temp'];

// Types a viewer displays rather than executes. Everything else is refused.
const REPORT_EXTENSIONS = new Set(['.html', '.htm', '.md', '.txt', '.pdf', '.png', '.jpg', '.jpeg', '.svg', '.json']);

// cmd.exe expands or splits on these even inside quotes, so such a path is never handed to it.
const CMD_UNSAFE = /["%!&|<>^\r\n]/;

function isSet(value) {
    return typeof value === 'string' && value.trim() !== '' && !/^(0|false)$/i.test(value.trim());
}

/** Reason to open nothing on this machine, or null when a viewer may be launched. */
function skipReason(platform, env) {
    if (isSet(env.CI)) return 'CI is set';
    if (env.CK_NO_AUTO_OPEN === '1') return 'CK_NO_AUTO_OPEN=1';
    if (platform === 'linux' && !env.DISPLAY && !env.WAYLAND_DISPLAY) return 'no DISPLAY or WAYLAND_DISPLAY';
    return null;
}

/** The Windows command interpreter by absolute path: a bare `cmd` is looked up in the working directory before PATH. */
function windowsCommandInterpreter(env) {
    const key = Object.keys(env).find(name => name.toLowerCase() === 'systemroot');
    return path.win32.join((key && env[key]) || 'C:\\Windows', 'System32', 'cmd.exe');
}

/** The argv vector that opens `file` on `platform`, or null when the platform has no known opener. */
function openCommand(platform, file, env = process.env) {
    // An empty argument is quoted as "" on the Windows command line: the window title `start` expects.
    if (platform === 'win32') return { command: windowsCommandInterpreter(env), args: ['/c', 'start', '', file] };
    if (platform === 'darwin') return { command: 'open', args: [file] };
    if (platform === 'linux') return { command: 'xdg-open', args: [file] };
    return null;
}

function realpath(target) {
    return (fs.realpathSync.native || fs.realpathSync)(target);
}

function isInside(dir, file, platform) {
    const norm = p => (platform === 'win32' ? p.toLowerCase() : p);
    const rel = path.relative(norm(dir), norm(file));
    return rel !== '' && rel !== '..' && !rel.startsWith(`..${path.sep}`) && !path.isAbsolute(rel);
}

/**
 * Resolve `target` to a canonical report file inside the project's tmp/ or temp/ directory.
 * @returns {{file?: string, reason?: string}}
 */
function resolveReport(target, rootDir, platform) {
    if (typeof target !== 'string' || target.trim() === '') return { reason: 'no path given' };
    const candidate = path.resolve(rootDir, target);
    let file;
    try {
        file = realpath(candidate);
        if (!fs.statSync(file).isFile()) return { reason: 'not a file' };
    } catch {
        return { reason: 'file does not exist' };
    }
    const allowed = REPORT_DIRS.some(name => {
        try {
            return isInside(realpath(path.join(rootDir, name)), file, platform);
        } catch {
            return false;
        }
    });
    if (!allowed) return { reason: `outside the project's ${REPORT_DIRS.join('/ or ')}/ directory` };
    // Checked on the resolved file, so a link named `.html` that points at a script is still refused.
    if (!REPORT_EXTENSIONS.has(path.extname(file).toLowerCase())) return { reason: 'unsupported report type' };
    return { file };
}

/**
 * Open a report. All effects are injectable so tests never launch a viewer.
 * @returns {{opened: boolean, file?: string, reason?: string, command?: string, args?: string[]}}
 */
function openReport(target, {
    platform = process.platform,
    env = process.env,
    cwd = process.cwd(),
    spawn = childProcess.spawn,
    log = line => process.stdout.write(`${line}\n`)
} = {}) {
    try {
        const { rootDir } = resolveProjectRoot({ cwd, env, scriptPath: __filename });
        const { file, reason: invalid } = resolveReport(target, rootDir, platform);
        if (!file) {
            log(`open-report: not opened (${invalid}): ${target || ''}`);
            return { opened: false, reason: invalid };
        }
        const skip = skipReason(platform, env);
        const cmd = openCommand(platform, file, env);
        const reason = skip
            || (!cmd && `no opener for platform ${platform}`)
            || (platform === 'win32' && CMD_UNSAFE.test(file) && 'path has characters cmd cannot pass safely')
            || null;
        if (reason) {
            log(`Report: ${file} (not opened: ${reason})`);
            return { opened: false, file, reason };
        }
        const child = spawn(cmd.command, cmd.args, { detached: true, stdio: 'ignore', windowsHide: true });
        if (child && typeof child.on === 'function') child.on('error', () => {});
        if (child && typeof child.unref === 'function') child.unref();
        log(`Report: ${file} (opened)`);
        return { opened: true, file, command: cmd.command, args: cmd.args };
    } catch (error) {
        const reason = `open failed: ${error && error.message ? error.message : String(error)}`;
        try { log(`open-report: not opened (${reason}): ${target || ''}`); } catch { /* never throw */ }
        return { opened: false, reason };
    }
}

if (require.main === module) {
    openReport(process.argv[2]);
    process.exitCode = 0;
}

module.exports = { openReport, openCommand, skipReason, resolveReport };
