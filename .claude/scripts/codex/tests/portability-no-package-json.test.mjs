import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { builtinModules } from 'node:module';
import { fileURLToPath } from 'node:url';

// Portability contract: copying ONLY `.claude/` into a new project that has NO root package.json
// must still run the full sync+verify pipeline. The framework's script execution is self-contained in
// `.claude` (the standalone runner `run-codex-sync.mjs`); the npm scripts merely delegate to it. These
// tests are the regression matrix for "everything works from a bare `.claude` copy" — they fail loudly
// if a node_modules dependency creeps into the pipeline, if the npm entrypoints stop delegating, if the
// runner drifts behind the npm verify set, or if the export payload loses a pipeline script.
//
// This file holds TWO related portability-contract groups — the filename names the headline guarantee,
// not the only one, so do NOT split or rename it:
//   • No-package-json group (PORT-001/002/006/007/009): pure bare-`.claude` behavior — the pipeline
//     imports only `node:` built-ins, npm-auto-install no-ops, the runner self-locates + fails fast,
//     and the export payload ships NO root package.json. None of these read a package.json.
//   • npm-delegation group (PORT-003/004/005/008): the inverse guarantee — WHEN a root package.json
//     exists, its npm entrypoints (`sync:all`/`verify:all`) only delegate to the in-`.claude` runner
//     and never under-verify relative to it. These DO read package.json by design. They live here
//     because both groups defend one invariant: the `.claude` runner is the single source of truth,
//     with or without a package.json.

const thisDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(thisDir, '..', '..', '..', '..');
const runnerRel = '.claude/skills/sync-codex/scripts/run-codex-sync.mjs';
const runnerAbs = path.join(repoRoot, ...runnerRel.split('/'));

const readRel = async rel => fs.readFile(path.join(repoRoot, ...rel.split('/')), 'utf8');
const exists = async p => { try { await fs.access(p); return true; } catch { return false; } };

const createdDirs = [];
after(async () => {
    await Promise.all(createdDirs.map(d => fs.rm(d, { recursive: true, force: true }).catch(() => {})));
});

function run(cmd, args, opts = {}) {
    return new Promise(resolve => {
        const child = spawn(cmd, args, { ...opts });
        let stdout = '';
        let stderr = '';
        child.stdout?.on('data', d => { stdout += d; });
        child.stderr?.on('data', d => { stderr += d; });
        child.on('close', code => resolve({ code, stdout, stderr }));
        child.on('error', err => resolve({ code: -1, stdout, stderr: stderr + String(err) }));
    });
}

// The exact files the standalone runner spawns, plus the shared lib they require. This is the pipeline
// transitive closure that MUST run with zero npm-installed dependencies in a bare `.claude` copy.
const PIPELINE_FILES = [
    runnerRel,
    '.claude/scripts/codex/migrate-claude-to-codex.mjs',
    '.claude/scripts/codex/sync-hooks.mjs',
    '.claude/scripts/codex/sync-context-workflows.mjs',
    '.claude/scripts/codex/verify-workflow-cycle-compliance.mjs',
    '.claude/scripts/codex/verify-skill-protocol-compliance.mjs',
    '.claude/scripts/codex/verify-no-project-residue.mjs',
    '.claude/scripts/codex/verify-sdd-semantic-compliance.mjs',
    '.claude/scripts/codex/verify-sync-divergence.mjs',
];

// Core (built-in) module names, both `node:`-prefixed and the legacy unprefixed form. `.cjs` files use
// the unprefixed names (`require('fs')`, `require('path')`) which are still built-ins, NOT node_modules.
const BUILTINS = new Set(builtinModules);

// Returns bare (node_modules) module specifiers imported/required at the top level of `source`.
// Ignores Node built-ins (prefixed or not), relative (`.`/`..`) and absolute specifiers. Line comments
// are stripped so a specifier named inside a `//` comment (e.g. remediation prose) is never flagged.
function bareSpecifiers(source) {
    const found = new Set();
    for (const raw of source.split(/\r?\n/)) {
        const line = raw.replace(/\/\/.*$/, '');
        const specs = [];
        const staticImport = line.match(/^\s*import\b[^'"]*['"]([^'"]+)['"]/);
        if (staticImport) specs.push(staticImport[1]);
        for (const m of line.matchAll(/\brequire\(\s*['"]([^'"]+)['"]\s*\)/g)) specs.push(m[1]);
        for (const m of line.matchAll(/\bimport\(\s*['"]([^'"]+)['"]\s*\)/g)) specs.push(m[1]);
        for (const s of specs) {
            if (s.startsWith('node:') || s.startsWith('.') || s.startsWith('/') || /^[a-zA-Z]:[\\/]/.test(s)) continue;
            if (BUILTINS.has(s) || BUILTINS.has(s.split('/')[0])) continue; // legacy unprefixed built-in
            found.add(s);
        }
    }
    return [...found];
}

// ── PORT-001 — zero node_modules dependency in the pipeline ──────────────────────────────────────
// The whole portability story rests on this: a bare `.claude` copy has no node_modules, so every
// script the runner spawns must import only `node:` built-ins + relative files.
test('PORT-001 sync/verify pipeline scripts import only node: built-ins and relative files', async () => {
    const offenders = [];
    const scanList = [...PIPELINE_FILES];
    // Include the shared lib closure (the workflow-skills catalog builder the generators require).
    const libDir = path.join(repoRoot, '.claude', 'scripts', 'lib');
    if (await exists(libDir)) {
        for (const e of await fs.readdir(libDir)) {
            if (e.endsWith('.cjs') || e.endsWith('.mjs')) scanList.push(`.claude/scripts/lib/${e}`);
        }
    }
    for (const rel of scanList) {
        const bare = bareSpecifiers(await readRel(rel));
        if (bare.length) offenders.push(`${rel}: ${bare.join(', ')}`);
    }
    assert.deepEqual(offenders, [], `pipeline scripts must not depend on node_modules:\n${offenders.join('\n')}`);
});

// ── PORT-002 — npm-auto-install is a safe no-op without package.json ─────────────────────────────
test('PORT-002 npm-auto-install hook no-ops cleanly when no package.json is present', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'port-noinstall-'));
    createdDirs.push(dir);
    const hook = path.join(repoRoot, '.claude', 'hooks', 'npm-auto-install.cjs');
    const { code, stderr } = await run(process.execPath, [hook], {
        cwd: dir,
        env: { ...process.env, CLAUDE_PROJECT_DIR: dir },
    });
    assert.equal(code, 0, 'hook must exit 0 with no package.json');
    assert.doesNotMatch(stderr, /Running npm (ci|install)/, 'hook must NOT attempt an install when package.json is absent');
});

// ── PORT-003/004 — npm entrypoints delegate to the in-`.claude` runner, no embedded chain ────────
test('PORT-003 sync:all/verify:all reference the standalone runner, which exists on disk', async () => {
    const pkg = JSON.parse(await readRel('package.json'));
    for (const name of ['sync:all', 'verify:all']) {
        assert.match(pkg.scripts[name], /run-codex-sync\.mjs/, `${name} must invoke the standalone runner`);
    }
    assert.ok(await exists(runnerAbs), 'the delegated runner script must exist at the documented path');
});

test('PORT-004 sync:all/verify:all contain no && chain (orchestration lives in .claude, not package.json)', async () => {
    const pkg = JSON.parse(await readRel('package.json'));
    for (const name of ['sync:all', 'verify:all']) {
        assert.ok(!pkg.scripts[name].includes('&&'), `${name} must delegate, not encode a chain in package.json`);
    }
});

// ── PORT-005 — the standalone runner is a SUPERSET of the npm verify set (no silent under-verify) ──
// Locks: every verifier the npm scripts run is also a runner stage, so a bare `.claude` copy can never
// pass the runner yet ship a drifted mirror.
test('PORT-005 runner stages cover the full npm verify set (completeness + parity)', async () => {
    const runnerSrc = await readRel(runnerRel);
    const stageIds = [...runnerSrc.matchAll(/\bid:\s*"([\w-]+)"/g)].map(m => m[1]);
    const required = ['migrate', 'hooks', 'context', 'tests', 'scripts-tests',
        'wf-cycle', 'sk-proto', 'residue', 'sdd', 'sync-divergence'];
    const missingStages = required.filter(id => !stageIds.includes(id));
    assert.deepEqual(missingStages, [], `runner is missing canonical stage id(s): ${missingStages.join(', ')}`);

    // Parity: every verifier script file referenced by a granular npm verify/test script must also be a
    // stage in the runner. Guards against a future npm-only verifier bypassing the standalone path.
    const pkg = JSON.parse(await readRel('package.json'));
    const verifierBasenames = new Set();
    for (const [key, val] of Object.entries(pkg.scripts)) {
        if (!/(verify|test:tooling)/.test(key)) continue;
        if (/^(sync:all|verify:all)$/.test(key)) continue; // these delegate to the runner itself
        for (const m of String(val).matchAll(/([\w-]+\.(?:mjs|cjs))/g)) {
            if (/^verify-/.test(m[1])) verifierBasenames.add(m[1]);
        }
    }
    const missingFromRunner = [...verifierBasenames].filter(b => !runnerSrc.includes(b));
    assert.deepEqual(missingFromRunner, [], `npm verifier(s) not covered by the standalone runner: ${missingFromRunner.join(', ')}`);
});

// ── PORT-008 — npm `verify:all --only` equals the runner's non-mutate (verify) stage set ──
// `verify:all` is an ALLOWLIST (`--only=<ids>`), the inverse risk of PORT-005: a verify stage
// added to the runner but NOT to that list is silently excluded from `npm run verify:all`,
// so the npm path under-verifies while the standalone runner does not. This locks the npm
// verify allowlist to the runner's read-only stage set in BOTH directions. The runner marks
// its mutating (sync) stages `mutate: true`; the verify set is everything else.
test('PORT-008 verify:all --only equals the runner non-mutate stage set (no silent npm under-verify)', async () => {
    const runnerSrc = await readRel(runnerRel);
    // Per-stage parse: stage objects contain no nested braces, so a brace-delimited slice is a
    // safe source-only parse for id + the presence of a `mutate: true` marker on that stage.
    const allIds = [];
    const mutateIds = new Set();
    for (const m of runnerSrc.matchAll(/\{[^{}]*\bid:\s*"([\w-]+)"[^{}]*\}/g)) {
        allIds.push(m[1]);
        if (/\bmutate:\s*true\b/.test(m[0])) mutateIds.add(m[1]);
    }
    assert.ok(mutateIds.size >= 1, 'runner must mark its mutating (sync) stages with mutate: true');
    const verifyIds = allIds.filter(id => !mutateIds.has(id)).sort();

    const pkg = JSON.parse(await readRel('package.json'));
    const onlyMatch = String(pkg.scripts['verify:all']).match(/--only=([\w,-]+)/);
    assert.ok(onlyMatch, 'verify:all must pass an --only allowlist to the runner');
    const onlyIds = onlyMatch[1].split(',').map(s => s.trim()).filter(Boolean).sort();

    assert.deepEqual(onlyIds, verifyIds,
        `verify:all --only must equal the runner's non-mutate (verify) stage set.\n` +
        `  --only:               ${onlyIds.join(', ')}\n` +
        `  runner verify stages: ${verifyIds.join(', ')}`);
});

// ── PORT-006 — the runner self-locates the repo root and runs standalone from any cwd ────────────
// Proves cwd-independence (resolves repoRoot from import.meta.url, not process.cwd) by running a real
// read-only verifier from a temp cwd. --only=residue keeps it fast and avoids re-entering the test stage.
test('PORT-006 runner executes a read-only verifier standalone from a non-repo cwd', async () => {
    const elsewhere = await fs.mkdtemp(path.join(os.tmpdir(), 'port-cwd-'));
    createdDirs.push(elsewhere);
    const { code, stdout } = await run(process.execPath, [runnerAbs, '--only=residue'], { cwd: elsewhere });
    assert.equal(code, 0, 'runner must exit 0 running a verifier from an unrelated cwd');
    assert.match(stdout, /all 1 stage\(s\) passed/, 'runner must report the verifier stage passed');
});

// ── PORT-007 — export-claude ships a self-contained pipeline payload, no package.json ─────────────
// The canonical "copy .claude into a new project" tool. A bare export must contain the runner AND every
// script it spawns — and crucially NOT a package.json (the new project supplies its own, or none).
test('PORT-007 export-claude payload contains the full pipeline and no package.json', async () => {
    const target = await fs.mkdtemp(path.join(os.tmpdir(), 'port-export-'));
    createdDirs.push(target);
    const exporter = path.join(repoRoot, '.claude', 'scripts', 'export-claude.mjs');
    const { code, stdout, stderr } = await run(process.execPath, [exporter, target], { cwd: repoRoot });
    assert.equal(code, 0, `export-claude must succeed: ${stderr || stdout}`);

    assert.ok(await exists(path.join(target, ...runnerRel.split('/'))), 'exported payload must include the standalone runner');
    for (const rel of PIPELINE_FILES) {
        assert.ok(await exists(path.join(target, ...rel.split('/'))), `exported payload missing pipeline script: ${rel}`);
    }
    assert.ok(!(await exists(path.join(target, 'package.json'))), 'export must copy only .claude — no root package.json');
});

// ── PORT-009 — runner fails fast (exit 1) on an unknown --only/--skip stage id ────────────────────
// validateStageSelectors() (run-codex-sync.mjs) must reject a mistyped selector id rather than
// silently dropping it: shouldRun() treats an unknown id as "not a member", so `verify:all
// --only=<ids>` with ONE fat-fingered id would skip a verifier and still exit green — defeating the
// "runner never verifies LESS than npm" guarantee PORT-005/008 lock. This is the regression test for
// that fail-fast (the guard had none; manually verified only).
test('PORT-009 runner exits 1 and names the bad id on an unknown --only stage id', async () => {
    const { code, stderr } = await run(process.execPath, [runnerAbs, '--only=residue,bogusXYZ'], { cwd: repoRoot });
    assert.equal(code, 1, 'runner must exit 1 when an --only id is not a known stage');
    assert.match(stderr, /unknown stage id/i, 'stderr must name the unknown stage id, not silently drop it');
});
