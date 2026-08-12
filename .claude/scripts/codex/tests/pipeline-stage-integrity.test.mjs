import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Pipeline stage integrity: a runner stage must never report PASS having executed nothing.
//
// `run-codex-sync.mjs` delegates three stages to the hooks suite runner via a SUBSTRING selector
// (`--filter=count-drift`, `--filter=parity`, `--filter=doc-sync-gate`). Suite names derive from
// filenames, so renaming a suite silently empties whichever selector named it. Before this guard the
// runner exited 0 on a zero-match filter, which meant those stages would print `✓ pass` after running
// zero assertions — a catalog/mirror/protocol regression could then ship with the whole pipeline green.
// "The stage exists" is not "the stage executed"; these tests are what make the difference observable.
//
// STAGE-001 locks the exit contract at the OWNING layer (the runner), because the three call sites
// cannot detect their own vacuity — only the runner knows how many suites it discovered vs selected.
// STAGE-002 locks the one selector whose correctness depends on matching MORE than one suite, so a
// partial-match regression (e.g. a rename to `*-parity-checks`) cannot silently halve its coverage.

const thisDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(thisDir, '..', '..', '..', '..');
const hooksRunnerRel = '.claude/hooks/tests/run-all-tests.cjs';
const hooksRunnerAbs = path.join(repoRoot, ...hooksRunnerRel.split('/'));

const createdDirs = [];
after(async () => {
    await Promise.all(createdDirs.map(d => fs.rm(d, { recursive: true, force: true }).catch(() => {})));
});

function run(cmd, args, opts = {}) {
    return new Promise((resolve, reject) => {
        const child = spawn(cmd, args, { cwd: repoRoot, stdio: ['ignore', 'pipe', 'pipe'], ...opts });
        let stdout = '';
        let stderr = '';
        child.stdout.on('data', d => { stdout += d.toString(); });
        child.stderr.on('data', d => { stderr += d.toString(); });
        child.on('error', reject);
        child.on('close', code => resolve({ code, stdout, stderr }));
    });
}

// ── STAGE-001 — a zero-match explicit --filter must FAIL; a genuinely empty suites dir must PASS ──
// Two halves of one contract. Conflating them would either let the vacuous case through (the bug) or
// break the fresh-scaffold case (a project that copied `.claude` before authoring any suite).
test('STAGE-001 hooks runner exits 1 on a zero-match --filter, and 0 on an empty suites dir', async () => {
    const zeroMatch = await run(process.execPath, [hooksRunnerAbs, '--filter=zzz-no-such-suite-xyz']);
    assert.equal(zeroMatch.code, 1,
        'a --filter matching no suite must exit 1 — a stage that ran zero tests is not a pass');
    assert.match(`${zeroMatch.stdout}${zeroMatch.stderr}`, /No test suite name matched/i,
        'output must say the selector matched nothing, not "No test suites found"');

    // The runner requires only `fs`/`path`, so an isolated copy beside an EMPTY suites/ dir faithfully
    // reproduces the fresh-scaffold state without touching the real suites directory.
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'stage-integrity-'));
    createdDirs.push(tmp);
    await fs.mkdir(path.join(tmp, 'suites'));
    await fs.copyFile(hooksRunnerAbs, path.join(tmp, 'run-all-tests.cjs'));
    const isolated = path.join(tmp, 'run-all-tests.cjs');

    const emptyNoFilter = await run(process.execPath, [isolated], { cwd: tmp });
    assert.equal(emptyNoFilter.code, 0, 'an empty suites dir with no filter is the scaffold state — exit 0');

    const emptyWithFilter = await run(process.execPath, [isolated, '--filter=anything'], { cwd: tmp });
    assert.equal(emptyWithFilter.code, 0,
        'an empty suites dir must stay exit 0 even with a filter — nothing was requested AND nothing exists');
});

// ── STAGE-002 — `--filter=parity` must select BOTH parity suites, by name, explicitly ─────────────
// The `hooks-parity` stage is the only selector whose value matches more than one suite, so it is the
// only one where a partial regression is invisible: dropping one suite still leaves the stage green.
// Asserting the exact selection (not just "> 0 suites") is what makes that halving detectable.
test('STAGE-002 --filter=parity selects exactly protocol-text-parity and sync-carrier-parity', async () => {
    const { code, stdout } = await run(process.execPath, [hooksRunnerAbs, '--list', '--filter=parity']);
    assert.equal(code, 0, '--list must exit 0');

    // Strip ANSI SGR sequences. The escape is written textually as an escape sequence, NOT as a
    // raw ESC byte: a literal control character here renders this line in editors, diffs and file
    // readers as a pattern WITHOUT the escape - a DIFFERENT regex than the one that executes - so
    // a maintainer would "correct" a line that was already right, or retype it and silently
    // disarm the guard. Keep the escape textual so the source reads exactly as it runs.
    // eslint-disable-next-line no-control-regex -- intentional: --list output is colourised
    const plain = stdout.replace(/\x1b\[[0-9;]*m/g, '');
    const selected = plain
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.startsWith('*'))
        .map(l => l.replace(/^\*\s*/, ''))
        .sort();

    assert.deepEqual(selected, ['protocol-text-parity', 'sync-carrier-parity'],
        `the hooks-parity stage must cover BOTH parity suites.\n  selected: ${selected.join(', ') || '(none)'}`);
});
