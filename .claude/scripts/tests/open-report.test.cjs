'use strict';

/**
 * open-report — opens a generated report for the user, safely, on every OS.
 *
 * Business intent: a wrap-up skill may auto-open its git-ignored report, but only a real file in the
 * project's tmp/ or temp/ directory, only through a literal argv vector (no shell string), and never
 * on a headless or CI machine or when the user opted out. It must never throw or fail the caller.
 *
 * Portability: every case builds its own temp project and injects platform, env and spawn, so no
 * viewer is launched and the host OS, env switches and home directory are never read. The CLI case
 * runs the real script with HOME/USERPROFILE/TMPDIR/TEMP/TMP pointed at the fixture and the open
 * switches forced off.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { openReport } = require('../open-report.cjs');

const SCRIPT = path.resolve(__dirname, '..', 'open-report.cjs');

function makeProject(t) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'open-report-'));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    for (const dir of ['.claude', 'tmp/reports', 'temp', 'docs']) fs.mkdirSync(path.join(root, dir), { recursive: true });
    const write = rel => {
        const file = path.join(root, ...rel.split('/'));
        fs.writeFileSync(file, '<!doctype html><title>r</title>');
        return fs.realpathSync.native(file);
    };
    return {
        root,
        report: write('tmp/reports/watzup-260925-1200-demo.html'),
        tempReport: write('temp/understand-demo.html'),
        docFile: write('docs/readme.html')
    };
}

/** Injected effects: records spawns and log lines; never launches anything. */
function harness(root, { platform = 'darwin', env = {}, spawnImpl } = {}) {
    const spawns = [];
    const lines = [];
    const child = { unrefCalled: false, on() { return this; }, unref() { this.unrefCalled = true; } };
    const spawn = spawnImpl || ((command, args, options) => { spawns.push({ command, args, options }); return child; });
    return {
        spawns,
        lines,
        child,
        opts: { platform, env: { CLAUDE_PROJECT_DIR: root, ...env }, cwd: root, spawn, log: line => lines.push(line) }
    };
}

test('TC-OR-001 per-platform argv: the system cmd.exe /c start "" on win32, open on darwin, xdg-open on linux', t => {
    // Given a report inside the project's tmp/ directory
    const p = makeProject(t);
    const cases = [
        // The interpreter is named by absolute path: a bare `cmd` would be found in the working directory first.
        ['win32', {}, 'C:\\Windows\\System32\\cmd.exe', ['/c', 'start', '', p.report]],
        ['win32', { systemroot: 'D:\\WinNT' }, 'D:\\WinNT\\System32\\cmd.exe', ['/c', 'start', '', p.report]],
        ['darwin', {}, 'open', [p.report]],
        ['linux', { DISPLAY: ':0' }, 'xdg-open', [p.report]],
        ['linux', { WAYLAND_DISPLAY: 'wayland-0' }, 'xdg-open', [p.report]]
    ];
    for (const [platform, env, command, args] of cases) {
        // When it is opened on each platform
        const h = harness(p.root, { platform, env });
        const result = openReport('tmp/reports/watzup-260925-1200-demo.html', h.opts);
        // Then exactly one detached argv-vector spawn runs the platform opener, with no shell
        assert.equal(result.opened, true, `${platform} opens`);
        assert.equal(h.spawns.length, 1);
        assert.equal(h.spawns[0].command, command);
        assert.deepEqual(h.spawns[0].args, args);
        assert.equal(h.spawns[0].options.shell, undefined, 'never a shell string');
        assert.equal(h.spawns[0].options.detached, true);
        assert.equal(h.child.unrefCalled, true, 'the caller does not wait for the viewer');
        // And the path is printed
        assert.match(h.lines.join('\n'), /Report: .*watzup-260925-1200-demo\.html \(opened\)/);
    }
});

test('TC-OR-002 skip conditions: CI, CK_NO_AUTO_OPEN=1 and headless Linux open nothing but print the path', t => {
    // Given a valid report
    const p = makeProject(t);
    const cases = [
        ['darwin', { CI: 'true' }, /CI is set/],
        ['win32', { CI: '1' }, /CI is set/],
        ['darwin', { CK_NO_AUTO_OPEN: '1' }, /CK_NO_AUTO_OPEN=1/],
        ['linux', {}, /no DISPLAY or WAYLAND_DISPLAY/]
    ];
    for (const [platform, env, reason] of cases) {
        // When a skip condition holds
        const h = harness(p.root, { platform, env });
        const result = openReport(p.report, h.opts);
        // Then nothing is spawned, the reason is given, and the path is still printed
        assert.equal(result.opened, false);
        assert.equal(h.spawns.length, 0, `${platform} ${JSON.stringify(env)} must not spawn`);
        assert.match(result.reason, reason);
        assert.ok(h.lines.some(line => line.includes(p.report)), 'path printed for the user');
    }
    // And the display rule is Linux-only: macOS opens without DISPLAY
    const mac = harness(p.root, { platform: 'darwin' });
    assert.equal(openReport(p.report, mac.opts).opened, true);
});

test('TC-OR-003 containment: only an existing file inside tmp/ or temp/ is opened', t => {
    // Given files inside and outside the report directories
    const p = makeProject(t);
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'open-report-outside-'));
    t.after(() => fs.rmSync(outside, { recursive: true, force: true }));
    const outsideFile = path.join(outside, 'x.html');
    fs.writeFileSync(outsideFile, 'x');
    // Then temp/ is accepted like tmp/
    assert.equal(openReport(p.tempReport, harness(p.root).opts).opened, true);
    // And every other target is refused without a spawn
    const refused = [
        ['docs/readme.html', /outside the project's tmp\/ or temp\/ directory/],
        ['tmp/reports/../../docs/readme.html', /outside/],
        [outsideFile, /outside/],
        ['tmp/reports/missing.html', /does not exist/],
        ['tmp/reports', /not a file/],
        ['', /no path given/],
        [undefined, /no path given/]
    ];
    for (const [target, reason] of refused) {
        const h = harness(p.root);
        const result = openReport(target, h.opts);
        assert.equal(result.opened, false, `${target} must be refused`);
        assert.match(result.reason, reason);
        assert.equal(h.spawns.length, 0);
    }
});

test('TC-OR-004 containment follows links: a tmp/ link to a directory outside tmp/ is refused', t => {
    // Given a directory link inside tmp/ pointing at the project's docs/ directory
    // ('junction' needs no privilege on Windows; POSIX ignores the type and makes a symlink)
    const p = makeProject(t);
    const link = path.join(p.root, 'tmp', 'reports', 'linked-docs');
    try {
        fs.symlinkSync(path.join(p.root, 'docs'), link, 'junction');
    } catch (error) {
        if (error.code === 'EPERM' || error.code === 'EACCES') {
            t.skip(`link creation not permitted on this OS account (${error.code})`);
            return;
        }
        throw error;
    }
    // When a file reached through the link is opened
    const h = harness(p.root);
    const result = openReport('tmp/reports/linked-docs/readme.html', h.opts);
    // Then the resolved target is outside tmp/, so nothing opens
    assert.equal(result.opened, false);
    assert.match(result.reason, /outside/);
    assert.equal(h.spawns.length, 0);
});

test('TC-OR-005 never throws: spawn failure and cmd-unsafe paths degrade to "not opened"', t => {
    // Given a spawn that throws
    const p = makeProject(t);
    const h = harness(p.root, { spawnImpl: () => { throw new Error('ENOENT xdg-open'); } });
    // Then openReport returns instead of throwing
    const result = openReport(p.report, h.opts);
    assert.equal(result.opened, false);
    assert.match(result.reason, /open failed: ENOENT/);
    // And a win32 path carrying cmd metacharacters is never handed to cmd
    const unsafe = path.join(p.root, 'tmp', 'reports', 'a&b.html');
    fs.writeFileSync(unsafe, 'x');
    const w = harness(p.root, { platform: 'win32' });
    const r = openReport(unsafe, w.opts);
    assert.equal(r.opened, false);
    assert.match(r.reason, /characters cmd cannot pass safely/);
    assert.equal(w.spawns.length, 0);
});

test('TC-OR-007 report types only: scripts and launchers in tmp/ spawn nothing; the check ignores case', t => {
    // Given files in tmp/ that the OS default handler would execute, plus an upper-case report
    // (distinct base names: Windows and default macOS filesystems are case-insensitive)
    const p = makeProject(t);
    const put = rel => fs.writeFileSync(path.join(p.root, ...rel.split('/')), '@echo ran\n');
    const executable = ['tmp/x.cmd', 'tmp/x.bat', 'tmp/x.lnk', 'tmp/x.command', 'tmp/upper.CMD', 'tmp/noext'];
    executable.forEach(put);
    put('tmp/upper.HTML');
    for (const [platform, env] of [['win32', {}], ['darwin', {}], ['linux', { DISPLAY: ':0' }]]) {
        for (const target of executable) {
            // When each is opened on each platform
            const h = harness(p.root, { platform, env });
            const result = openReport(target, h.opts);
            // Then nothing is spawned, the refusal names the reason, and it never throws
            assert.equal(result.opened, false, `${platform} must refuse ${target}`);
            assert.equal(result.reason, 'unsupported report type');
            assert.equal(h.spawns.length, 0, `${platform} must not spawn for ${target}`);
            assert.match(h.lines.join('\n'), /open-report: not opened \(unsupported report type\)/);
        }
        // And a report type is matched case-insensitively
        const h = harness(p.root, { platform, env });
        assert.equal(openReport('tmp/upper.HTML', h.opts).opened, true, `${platform} opens .HTML`);
        assert.equal(h.spawns.length, 1);
    }
});

test('TC-OR-006 CLI exits 0 for a valid, a refused and a missing argument', t => {
    // Given the real script, a fixture project and a machine scrubbed of open switches and home dirs
    const p = makeProject(t);
    const env = { ...process.env };
    const drop = ['CI', 'CK_NO_AUTO_OPEN', 'DISPLAY', 'WAYLAND_DISPLAY', 'CLAUDE_PROJECT_DIR', 'HOME', 'USERPROFILE', 'TMPDIR', 'TEMP', 'TMP'];
    for (const key of Object.keys(env)) {
        if (drop.some(name => name.toUpperCase() === key.toUpperCase())) delete env[key];
    }
    Object.assign(env, {
        CI: '1', CK_NO_AUTO_OPEN: '1', CLAUDE_PROJECT_DIR: p.root,
        HOME: p.root, USERPROFILE: p.root, TMPDIR: p.root, TEMP: p.root, TMP: p.root
    });
    for (const args of [[p.report], ['docs/readme.html'], []]) {
        // When the CLI runs
        const run = spawnSync(process.execPath, [SCRIPT, ...args], { cwd: p.root, env, encoding: 'utf8', timeout: 15000 });
        // Then it exits 0 and prints a line, whatever the argument
        assert.equal(run.status, 0, `exit 0 for ${JSON.stringify(args)}: ${run.stderr}`);
        assert.equal(run.stderr, '');
        assert.match(run.stdout, args.length && args[0] === p.report ? /Report: .*\(not opened: CI is set\)/ : /not opened/);
    }
});
