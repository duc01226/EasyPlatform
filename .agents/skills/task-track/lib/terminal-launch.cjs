'use strict';

// Starts the local workspace in a terminal window of its own on the machine that serves it, so the person
// can see where it runs and stop it by closing that window. The command is written to a small launcher
// script, and the platform is asked to open that script in a terminal: no command text travels through
// another program's argument parsing. The report opener owns when nothing may be opened.
const fs = require('node:fs');
const path = require('node:path');
const childProcess = require('node:child_process');
const crypto = require('node:crypto');
const { scopedPath, ensureDirectory } = require('../../../hooks/lib/task-tracking-files.cjs');
const { skipReason, openCommand } = require('../../../scripts/open-report.cjs');
const { startLauncher, START_GRACE_MS } = require('./browser-launch.cjs');

const SCRIPT_DIR = 'tmp/task-tracking/launch';
const SCRIPT_NAME = 'task-track-workspace';
const WINDOW_TITLE = 'Task tracker workspace';
// Terminal programs tried in order on Linux, each with the arguments that precede the command to run.
const LINUX_TERMINALS = Object.freeze([['x-terminal-emulator', '-e'], ['gnome-terminal', '--'], ['konsole', '-e'], ['xfce4-terminal', '-x'], ['xterm', '-e']]);
// A batch file expands or splits on these inside a quoted value; a value that has one is not written.
const WINDOWS_UNSAFE = /["%!^&|<>\r\n]/;
const POSIX_UNSAFE = /[\r\n\0]/;

const posixQuote = value => `'${String(value).replace(/'/g, `'\\''`)}'`;

/**
 * The launcher script for `platform` and the commands that open it in a terminal window, in order.
 * `command` is the literal argv of the workspace server. Returns `{ refusal }` when a value cannot be written safely.
 */
function terminalPlan(command, root, { platform = process.platform, env = process.env } = {}) {
    const values = [root, ...command];
    if (platform === 'win32') {
        if (values.some(value => WINDOWS_UNSAFE.test(value))) return { refusal: 'a path or option holds a character a Windows launcher script cannot carry' };
        const file = path.win32.join(root, ...SCRIPT_DIR.split('/'), `${SCRIPT_NAME}.cmd`);
        const text = ['@echo off', `title ${WINDOW_TITLE}`, `cd /d "${root}"`, 'echo Close this window or press Ctrl+C to stop the workspace.',
            command.map(value => `"${value}"`).join(' '), 'pause', ''].join('\r\n');
        // `start` gives a batch file a console window of its own.
        return { file, name: `${SCRIPT_NAME}.cmd`, text, terminal: 'cmd', attempts: [{ ...openCommand(platform, file, env), window: true }] };
    }
    if (values.some(value => POSIX_UNSAFE.test(value))) return { refusal: 'a path or option holds a line break' };
    const body = [`cd ${posixQuote(root)} || exit 1`, `printf '%s\\n' 'Close this window or press Ctrl+C to stop the workspace.'`,
        `exec ${command.map(posixQuote).join(' ')}`, ''];
    if (platform === 'darwin') {
        // Terminal opens a `.command` file in a new window and runs it; no automation permission is involved.
        const file = path.posix.join(root, SCRIPT_DIR, `${SCRIPT_NAME}.command`);
        return { file, name: `${SCRIPT_NAME}.command`, text: ['#!/bin/sh', ...body].join('\n'), terminal: 'Terminal', attempts: [{ command: 'open', args: [file] }] };
    }
    if (platform === 'linux') {
        const file = path.posix.join(root, SCRIPT_DIR, `${SCRIPT_NAME}.sh`);
        return { file, name: `${SCRIPT_NAME}.sh`, text: ['#!/bin/sh', ...body].join('\n'), terminal: 'terminal',
            attempts: LINUX_TERMINALS.map(([program, ...before]) => ({ command: program, args: [...before, 'sh', file], terminal: program })) };
    }
    return { refusal: 'no terminal launcher is known for this platform' };
}

/**
 * Put the launcher script under the project tmp folder without following a link. A checkout can carry a link at the
 * script's name or at a folder above it, and a write through one would replace a file outside the project. The folder
 * is refused when it or a folder above it is a link or leaves the project; the script is written to a new, exclusively
 * created file beside its name and renamed over whatever is there, which replaces a link instead of following it.
 */
function writeLauncher(_file, text, { root, name }) {
    const directory = ensureDirectory(root, SCRIPT_DIR);
    const temporary = path.join(directory, `.${name}.${crypto.randomUUID()}.tmp`);
    let fd;
    try {
        fd = fs.openSync(temporary, 'wx', 0o700);
        // The mode is set on the open file, never by name; Windows has no owner-execute bit to set.
        if (process.platform !== 'win32') fs.fchmodSync(fd, 0o700);
        fs.writeFileSync(fd, text);
        fs.closeSync(fd); fd = undefined;
        scopedPath(root, SCRIPT_DIR);
        fs.renameSync(temporary, path.join(directory, name));
    } finally {
        if (fd !== undefined) fs.closeSync(fd);
        fs.rmSync(temporary, { force: true });
    }
}

/**
 * Ask the machine to run `command` in a new terminal window. A started launcher is a request, not proof that a
 * window appeared or that the workspace is serving.
 * @returns {Promise<{status: 'requested' | 'not-opened', terminal?: string, script?: string, reason?: string, observedWindow: 'unverified'}>}
 */
async function launchTerminal(command, root, { platform = process.platform, env = process.env, spawn = childProcess.spawn,
    write = writeLauncher, graceMs = START_GRACE_MS } = {}) {
    const outcome = (status, detail) => ({ status, ...detail, observedWindow: 'unverified' });
    const skip = skipReason(platform, env);
    if (skip) return outcome('not-opened', { reason: skip });
    const plan = terminalPlan(command, root, { platform, env });
    if (plan.refusal) return outcome('not-opened', { reason: plan.refusal });
    try { write(plan.file, plan.text, { root, name: plan.name }); }
    catch (error) {
        return outcome('not-opened', { reason: error.code === 'UNSAFE_PATH' ? `${SCRIPT_DIR} or a folder above it is a link or leaves the project, so no launcher script was written`
            : 'the launcher script could not be written under the project tmp folder' });
    }
    for (const attempt of plan.attempts) {
        if (await startLauncher(attempt, spawn, graceMs)) return outcome('requested', { terminal: attempt.terminal || plan.terminal, script: `${SCRIPT_DIR}/${plan.name}` });
    }
    return outcome('not-opened', { reason: 'no terminal window could be started on this machine' });
}

module.exports = { SCRIPT_DIR, terminalPlan, launchTerminal };
