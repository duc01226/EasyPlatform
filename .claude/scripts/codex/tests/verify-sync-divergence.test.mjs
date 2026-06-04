import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';

const execFileAsync = promisify(execFile);

// Importing the gate transitively imports migrate-claude-to-codex.mjs + sync-context-workflows.mjs.
// All three guard their main()/script-entry behind an invoked-as-script check, so this import must
// NOT trigger a real (destructive) sync. If that guard regresses, these tests would wipe
// .agents/skills — the assertions below stay purely on diffTrees/readTreeFiles over tmp dirs (the
// one live end-to-end case spawns the gate as a SUBPROCESS, which only writes to a tmp dir).
const thisDir = path.dirname(fileURLToPath(import.meta.url));
const gatePath = path.resolve(thisDir, '..', 'verify-sync-divergence.mjs');
const repoRoot = path.resolve(thisDir, '..', '..', '..', '..');
const { diffTrees, readTreeFiles } = await import(pathToFileURL(gatePath).href);

// TC-SKILLFIX-020 — identical trees → no divergence (the in-sync PASS case).
test('TC-SKILLFIX-020: identical maps produce no diffs', () => {
    const a = new Map([['skill/SKILL.md', 'x\n'], ['skill/extra.md', 'y\n']]);
    const b = new Map([['skill/SKILL.md', 'x\n'], ['skill/extra.md', 'y\n']]);
    assert.deepEqual(diffTrees(a, b), []);
});

// TC-SKILLFIX-021 — content drift (stale mirror body) is flagged as 'content'.
test('TC-SKILLFIX-021: differing content is flagged', () => {
    const expected = new Map([['a/SKILL.md', 'fresh\n']]);
    const actual = new Map([['a/SKILL.md', 'stale\n']]);
    assert.deepEqual(diffTrees(expected, actual), [{ relPath: 'a/SKILL.md', kind: 'content' }]);
});

// TC-SKILLFIX-022 — source produced a file the mirror lacks (new skill, forgot to sync).
test('TC-SKILLFIX-022: file missing from mirror is flagged', () => {
    const expected = new Map([['a/SKILL.md', 'x\n'], ['b/SKILL.md', 'y\n']]);
    const actual = new Map([['a/SKILL.md', 'x\n']]);
    assert.deepEqual(diffTrees(expected, actual), [{ relPath: 'b/SKILL.md', kind: 'missing-in-mirror' }]);
});

// TC-SKILLFIX-023 — mirror has an orphan/hand-added file with no source counterpart.
test('TC-SKILLFIX-023: extra mirror file is flagged', () => {
    const expected = new Map([['a/SKILL.md', 'x\n']]);
    const actual = new Map([['a/SKILL.md', 'x\n'], ['a/hand-edit.md', 'z\n']]);
    assert.deepEqual(diffTrees(expected, actual), [{ relPath: 'a/hand-edit.md', kind: 'extra-in-mirror' }]);
});

// TC-SKILLFIX-024 — readTreeFiles excludes the sentinel and CRLF-normalizes, so a
// line-ending-only or sentinel-only difference does NOT register as divergence.
test('TC-SKILLFIX-024: readTreeFiles excludes sentinel and normalizes CRLF', async () => {
    const expectedDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sync-div-exp-'));
    const actualDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sync-div-act-'));
    try {
        await fs.mkdir(path.join(expectedDir, 'a'), { recursive: true });
        await fs.mkdir(path.join(actualDir, 'a'), { recursive: true });
        await fs.writeFile(path.join(expectedDir, 'a', 'SKILL.md'), 'line1\nline2\n');
        await fs.writeFile(path.join(actualDir, 'a', 'SKILL.md'), 'line1\r\nline2\r\n');
        // Sentinel exists only in the committed mirror; it must be excluded from comparison.
        await fs.writeFile(path.join(actualDir, '.codex-mirror.json'), '{"managedBy":"codex-sync"}\n');

        const expected = await readTreeFiles(expectedDir);
        const actual = await readTreeFiles(actualDir);

        assert.ok(!actual.has('.codex-mirror.json'), 'sentinel must be excluded from the tree map');
        assert.deepEqual(diffTrees(expected, actual), [], 'CRLF-only difference must not be divergence');
    } finally {
        await fs.rm(expectedDir, { recursive: true, force: true });
        await fs.rm(actualDir, { recursive: true, force: true });
    }
});

// Determinism guard: diffTrees output ordering is stable (sorted by relPath then kind),
// so CI failure lists don't churn between runs.
test('TC-SKILLFIX-024b: diff ordering is stable and sorted', () => {
    const expected = new Map([['z/SKILL.md', '1\n'], ['a/SKILL.md', '1\n'], ['m/SKILL.md', 'fresh\n']]);
    const actual = new Map([['m/SKILL.md', 'stale\n'], ['a/SKILL.md', '1\n']]);
    const diffs = diffTrees(expected, actual);
    assert.deepEqual(diffs.map(d => d.relPath), ['m/SKILL.md', 'z/SKILL.md']);
    assert.deepEqual(diffs.map(d => d.kind), ['content', 'missing-in-mirror']);
});

// ── CONTEXT-mirror idempotency (folded into this gate) ─────────────────────────────────────────────
// checkContextMirror() compares a fresh render of AGENTS.md + .codex/CODEX_CONTEXT.md (keyed by
// repo-relative path) against the committed copies using the SAME diffTrees. These cases lock the
// two-file context surface; the diffTrees verdicts themselves are already covered above.

// TC-CTXMIRROR-001 — an in-sync context mirror (both files identical) yields no divergence.
test('TC-CTXMIRROR-001: identical context maps (AGENTS.md + CODEX_CONTEXT.md) → no diffs', () => {
    const fresh = new Map([['AGENTS.md', 'a\n'], ['.codex/CODEX_CONTEXT.md', 'c\n']]);
    const committed = new Map([['AGENTS.md', 'a\n'], ['.codex/CODEX_CONTEXT.md', 'c\n']]);
    assert.deepEqual(diffTrees(fresh, committed), []);
});

// TC-CTXMIRROR-002 — a stale committed AGENTS.md (the Finding-1 failure mode) is flagged 'content'.
test('TC-CTXMIRROR-002: a stale committed AGENTS.md is flagged as content drift', () => {
    const fresh = new Map([['AGENTS.md', 'fresh\n'], ['.codex/CODEX_CONTEXT.md', 'c\n']]);
    const committed = new Map([['AGENTS.md', 'stale\n'], ['.codex/CODEX_CONTEXT.md', 'c\n']]);
    assert.deepEqual(diffTrees(fresh, committed), [{ relPath: 'AGENTS.md', kind: 'content' }]);
});

// TC-CTXMIRROR-003 — committed == fresh, live against this repo. Spawns the gate as a SUBPROCESS
// (non-destructive: renders into a tmp dir) and asserts BOTH surfaces are in sync. This is the
// idempotency assertion — if a context generator's text was edited without a full re-sync, the
// committed AGENTS.md / CODEX_CONTEXT.md would diverge from a fresh render and this fails.
test('TC-CTXMIRROR-003: gate passes against the committed repo (skills + context both in sync)', async () => {
    const { stdout } = await execFileAsync(process.execPath, [gatePath], { cwd: repoRoot });
    assert.match(stdout, /skills: PASS/, 'committed .agents/skills mirror must equal a fresh render');
    assert.match(stdout, /context: PASS/, 'committed AGENTS.md + CODEX_CONTEXT.md must equal a fresh render');
});
